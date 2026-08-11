/**
 * App Store Connect API v1 — screenshot upload client (self-contained).
 *
 * ─── Research notes (endpoints verified against Apple docs + fastlane, Aug 2026) ───
 *
 * AUTH — JWT, ES256 (ECDSA P-256 + SHA-256)
 *   Header : { "alg": "ES256", "kid": <Key ID>, "typ": "JWT" }
 *   Payload: { "iss": <Issuer ID>, "iat": now, "exp": now + <=20min, "aud": "appstoreconnect-v1" }
 *   Signature must be JOSE-flavoured raw r||s (64 bytes), NOT the DER encoding node emits by
 *   default — hence `dsaEncoding: 'ieee-p1363'` below. That is the whole reason we don't need
 *   the `jose` package: node:crypto can produce a compliant ES256 JWS on its own.
 *   Sent as `Authorization: Bearer <jwt>` on every api.appstoreconnect.apple.com request.
 *   https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
 *
 * LOOKUP CHAIN (standard appStoreVersionLocalizations flow; the appCustomProductPage flow is a
 * separate resource tree and is deliberately out of scope here)
 *   1. GET  /v1/apps/{appId}/appStoreVersions
 *          → pick the one whose attributes.appVersionState is editable
 *            (PREPARE_FOR_SUBMISSION, DEVELOPER_REJECTED, REJECTED, METADATA_REJECTED,
 *             INVALID_BINARY, WAITING_FOR_REVIEW, WAITING_FOR_EXPORT_COMPLIANCE)
 *            https://developer.apple.com/documentation/appstoreconnectapi/appversionstate
 *   2. GET  /v1/appStoreVersions/{versionId}/appStoreVersionLocalizations
 *          → match attributes.locale (e.g. "en-US", "de-DE")
 *   3. GET  /v1/appStoreVersionLocalizations/{locId}/appScreenshotSets
 *          → match attributes.screenshotDisplayType; if absent:
 *      POST /v1/appScreenshotSets
 *          { data: { type: "appScreenshotSets",
 *                    attributes: { screenshotDisplayType },
 *                    relationships: { appStoreVersionLocalization: { data: { type, id } } } } }
 *   4. GET  /v1/appScreenshotSets/{setId}/appScreenshots   (existing count; we never delete)
 *
 * UPLOAD (three-phase reserve → chunk → commit, same shape for every ASC asset type)
 *   5. POST  /v1/appScreenshots
 *          { data: { type: "appScreenshots",
 *                    attributes: { fileSize, fileName },
 *                    relationships: { appScreenshotSet: { data: { type, id } } } } }
 *      → response data.attributes.uploadOperations: Array<{
 *            method: "PUT", url: string, offset: number, length: number,
 *            requestHeaders: Array<{ name: string, value: string }> }>
 *      The urls are pre-signed and short-lived. They are credentials — never log them.
 *   6. <method> <url> with those requestHeaders and body = file bytes [offset, offset+length)
 *   7. PATCH /v1/appScreenshots/{screenshotId}
 *          { data: { type: "appScreenshots", id,
 *                    attributes: { uploaded: true, sourceFileChecksum: <MD5 hex of whole file> } } }
 *      MD5 (lowercase hex) is what App Store Connect specifies for sourceFileChecksum.
 *      https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect
 *
 * ASSET RULES enforced locally before we reserve anything (Apple rejects these server-side, but
 * late — a failed commit leaves a dangling reservation):
 *   - PNG or JPEG only, no alpha channel / transparency
 *   - exact pixel dimensions per screenshotDisplayType, no tolerance
 *   - max 10 screenshots per set
 *   https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/
 *
 * SECRET HANDLING: the .p8 private key is read from disk (or env) into memory, used only to sign
 * the JWT, and is never logged, never returned, and never included in an error message. See
 * `redact()` — every outbound URL and every API error body goes through it.
 */

import { createHash, createPrivateKey, createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1';
const TOKEN_TTL_SECONDS = 600; // Apple caps at 20 min; short-lived on purpose.
const API_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_SCREENSHOTS_PER_SET = 10;

/** App Store Connect ScreenshotDisplayType values (App Store, non-iMessage). */
export const SCREENSHOT_DISPLAY_TYPES = [
  'APP_IPHONE_67',
  'APP_IPHONE_65',
  'APP_IPHONE_61',
  'APP_IPHONE_58',
  'APP_IPHONE_55',
  'APP_IPHONE_47',
  'APP_IPHONE_40',
  'APP_IPHONE_35',
  'APP_IPAD_PRO_3GEN_129',
  'APP_IPAD_PRO_3GEN_11',
  'APP_IPAD_PRO_129',
  'APP_IPAD_105',
  'APP_IPAD_97',
  'APP_DESKTOP',
  'APP_APPLE_TV',
  'APP_APPLE_VISION_PRO',
  'APP_WATCH_ULTRA',
  'APP_WATCH_SERIES_10',
  'APP_WATCH_SERIES_7',
  'APP_WATCH_SERIES_4',
  'APP_WATCH_SERIES_3',
] as const;

export type ScreenshotDisplayType = (typeof SCREENSHOT_DISPLAY_TYPES)[number];

/**
 * Accepted pixel sizes per display type, portrait and landscape.
 * Note the enum names lag the marketing names: APP_IPHONE_67 is today's 6.9" slot,
 * APP_IPHONE_61 is the 6.3" slot, APP_IPAD_PRO_3GEN_129 is the 13" iPad slot.
 */
const DEVICE_RESOLUTIONS: Record<ScreenshotDisplayType, ReadonlyArray<readonly [number, number]>> = {
  APP_IPHONE_67: [[1260, 2736], [2736, 1260], [1290, 2796], [2796, 1290], [1320, 2868], [2868, 1320]],
  APP_IPHONE_65: [[1242, 2688], [2688, 1242], [1284, 2778], [2778, 1284]],
  APP_IPHONE_61: [[1179, 2556], [2556, 1179], [1206, 2622], [2622, 1206]],
  APP_IPHONE_58: [[1170, 2532], [2532, 1170], [1125, 2436], [2436, 1125], [1080, 2340], [2340, 1080]],
  APP_IPHONE_55: [[1242, 2208], [2208, 1242]],
  APP_IPHONE_47: [[750, 1334], [1334, 750]],
  APP_IPHONE_40: [[640, 1096], [640, 1136], [1136, 600], [1136, 640]],
  APP_IPHONE_35: [[640, 920], [640, 960], [960, 600], [960, 640]],
  APP_IPAD_PRO_3GEN_129: [[2048, 2732], [2732, 2048], [2064, 2752], [2752, 2064]],
  APP_IPAD_PRO_3GEN_11: [[1488, 2266], [2266, 1488], [1668, 2420], [2420, 1668], [1668, 2388], [2388, 1668], [1640, 2360], [2360, 1640]],
  APP_IPAD_PRO_129: [[2048, 2732], [2732, 2048]],
  APP_IPAD_105: [[1668, 2224], [2224, 1668]],
  APP_IPAD_97: [[1024, 748], [1024, 768], [2048, 1496], [2048, 1536], [768, 1004], [768, 1024], [1536, 2008], [1536, 2048]],
  APP_DESKTOP: [[1280, 800], [1440, 900], [2560, 1600], [2880, 1800]],
  APP_APPLE_TV: [[1920, 1080], [3840, 2160]],
  APP_APPLE_VISION_PRO: [[3840, 2160]],
  APP_WATCH_ULTRA: [[410, 502], [422, 514]],
  APP_WATCH_SERIES_10: [[416, 496]],
  APP_WATCH_SERIES_7: [[396, 484]],
  APP_WATCH_SERIES_4: [[368, 448]],
  APP_WATCH_SERIES_3: [[312, 390]],
};

/** appVersionState values where metadata (screenshots included) can still be edited. */
const EDITABLE_VERSION_STATES = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
  'WAITING_FOR_REVIEW',
  'WAITING_FOR_EXPORT_COMPLIANCE',
]);

// ─────────────────────────────── secret hygiene ───────────────────────────────

/**
 * Strip anything that could carry credentials out of a string before it reaches a log,
 * an error message, or a tool result: pre-signed upload query strings and bearer tokens.
 */
function redact(value: string): string {
  return value
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/g, '$1?<redacted>')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1<redacted>')
    .replace(/\beyJ[A-Za-z0-9._-]{20,}/g, '<redacted-jwt>');
}

// ─────────────────────────────────── JWT ──────────────────────────────────────

function b64url(input: Buffer | string): string {
  return (typeof input === 'string' ? Buffer.from(input, 'utf8') : input).toString('base64url');
}

/**
 * Build a short-lived ES256 JWT for the App Store Connect API.
 * `privateKeyP8` is the PEM text of the .p8 file — it is used here and nowhere else.
 */
export function makeAscToken({
  keyId,
  issuerId,
  privateKeyP8,
}: {
  keyId: string;
  issuerId: string;
  privateKeyP8: string;
}): string {
  let key;
  try {
    key = createPrivateKey({ key: privateKeyP8, format: 'pem' });
  } catch {
    // Deliberately swallow the original error: OpenSSL messages can echo input material.
    throw new Error('Could not parse the App Store Connect private key. Expected the PEM contents of a .p8 key.');
  }
  if (key.asymmetricKeyType !== 'ec') {
    throw new Error(`Expected an EC (P-256) private key for ES256, got "${key.asymmetricKeyType ?? 'unknown'}".`);
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + TOKEN_TTL_SECONDS, aud: 'appstoreconnect-v1' }),
  );
  const signingInput = `${header}.${payload}`;

  // ieee-p1363 => raw r||s, which is what JWS ES256 requires (node defaults to DER).
  const signature = createSign('SHA256').update(signingInput).end().sign({ key, dsaEncoding: 'ieee-p1363' });

  return `${signingInput}.${b64url(signature)}`;
}

// ───────────────────────────── image validation ───────────────────────────────

export type ImageInfo = { format: 'png' | 'jpeg'; width: number; height: number; hasAlpha: boolean };

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Read format/dimensions/alpha straight out of the file header — no image library needed. */
export function readImageInfo(buffer: Buffer): ImageInfo {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) return readPngInfo(buffer);
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) return readJpegInfo(buffer);
  throw new Error('Not a PNG or JPEG file. App Store Connect accepts .png, .jpg and .jpeg only.');
}

function readPngInfo(buffer: Buffer): ImageInfo {
  // IHDR always comes first: [8..12) length, [12..16) "IHDR", then width, height, bitDepth, colorType.
  if (buffer.length < 26 || buffer.toString('latin1', 12, 16) !== 'IHDR') {
    throw new Error('Malformed PNG: missing IHDR chunk.');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25]!;
  // 4 = grayscale+alpha, 6 = RGBA. A tRNS chunk makes palette/greyscale PNGs transparent too.
  const hasAlpha = colorType === 4 || colorType === 6 || hasTrnsChunk(buffer);
  return { format: 'png', width, height, hasAlpha };
}

function hasTrnsChunk(buffer: Buffer): boolean {
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (type === 'tRNS') return true;
    if (type === 'IDAT' || type === 'IEND') return false; // transparency chunks precede IDAT
    offset += 12 + length; // length + type + data + crc
  }
  return false;
}

function readJpegInfo(buffer: Buffer): ImageInfo {
  let offset = 2;
  // A frame header needs bytes [offset .. offset+8] inclusive, i.e. offset + 9 bytes available.
  while (offset + 9 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    // SOF0..SOF15 carry the frame dimensions; C4/C8/CC are DHT/JPG/DAC, not frames.
    const isFrameMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameMarker) {
      return {
        format: 'jpeg',
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
        hasAlpha: false, // JPEG has no alpha channel
      };
    }
    offset += 2 + segmentLength;
  }
  throw new Error('Malformed JPEG: no start-of-frame marker found.');
}

function formatSizes(displayType: ScreenshotDisplayType): string {
  return DEVICE_RESOLUTIONS[displayType].map(([w, h]) => `${w}x${h}`).join(', ');
}

/** Throws with an actionable message if the file is not a valid asset for `displayType`. */
export function validateScreenshot(fileName: string, buffer: Buffer, displayType: ScreenshotDisplayType): ImageInfo {
  const info = readImageInfo(buffer);
  if (info.hasAlpha) {
    throw new Error(
      `${fileName}: PNG has an alpha channel / transparency. App Store Connect rejects transparency — re-export flattened onto an opaque background (RGB, color type 2).`,
    );
  }
  const allowed = DEVICE_RESOLUTIONS[displayType];
  if (!allowed.some(([w, h]) => w === info.width && h === info.height)) {
    throw new Error(
      `${fileName}: ${info.width}x${info.height} is not a valid size for ${displayType}. Valid sizes: ${formatSizes(displayType)}.`,
    );
  }
  return info;
}

// ──────────────────────────────── HTTP layer ──────────────────────────────────

type JsonApiResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};

async function ascRequest<T = { data: JsonApiResource | JsonApiResource[] }>(
  token: string,
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${ASC_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as { errors?: Array<{ title?: string; detail?: string }> };
      if (parsed.errors?.length) {
        detail = parsed.errors.map((e) => [e.title, e.detail].filter(Boolean).join(': ')).join(' | ');
      }
    } catch {
      /* keep raw text */
    }
    throw new Error(
      `App Store Connect ${method} ${endpoint} failed (${response.status}): ${redact(detail).slice(0, 800)}`,
    );
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

async function ascList(token: string, endpoint: string): Promise<JsonApiResource[]> {
  const { data } = await ascRequest<{ data: JsonApiResource[] }>(token, 'GET', endpoint);
  return data ?? [];
}

// ──────────────────────────── credential resolution ───────────────────────────

type Credentials = { keyId: string; issuerId: string; privateKeyP8: string };

async function resolveCredentials(opts: {
  keyId?: string;
  issuerId?: string;
  privateKeyPath?: string;
  privateKeyP8?: string;
}): Promise<Credentials> {
  const keyId = opts.keyId ?? process.env.ASC_KEY_ID;
  const issuerId = opts.issuerId ?? process.env.ASC_ISSUER_ID;
  const keyPath = opts.privateKeyPath ?? process.env.ASC_PRIVATE_KEY_PATH;
  const inlineKey = opts.privateKeyP8 ?? process.env.ASC_PRIVATE_KEY;

  const missing: string[] = [];
  if (!keyId) missing.push('keyId (or ASC_KEY_ID)');
  if (!issuerId) missing.push('issuerId (or ASC_ISSUER_ID)');
  if (!keyPath && !inlineKey) missing.push('privateKeyPath (or ASC_PRIVATE_KEY_PATH / ASC_PRIVATE_KEY)');
  if (missing.length) {
    throw new Error(`Missing App Store Connect credentials: ${missing.join(', ')}.`);
  }

  let privateKeyP8 = inlineKey!;
  if (keyPath) {
    const absolute = path.resolve(keyPath);
    try {
      privateKeyP8 = await readFile(absolute, 'utf8');
    } catch {
      // Report the path but never the contents.
      throw new Error(`Could not read the App Store Connect private key file at ${absolute}.`);
    }
  }

  return { keyId: keyId!, issuerId: issuerId!, privateKeyP8 };
}

// ───────────────────────────────── upload ─────────────────────────────────────

type UploadOperation = {
  method?: string;
  url?: string;
  offset?: number;
  length?: number;
  requestHeaders?: Array<{ name?: string; value?: string }>;
};

export type FileResult = {
  file: string;
  status: 'uploaded' | 'skipped' | 'error';
  detail: string;
};

export type UploadScreenshotsResult = {
  ok: boolean;
  dryRun: boolean;
  appId: string;
  locale: string;
  displayType: ScreenshotDisplayType;
  versionId?: string;
  versionString?: string;
  versionState?: string;
  localizationId?: string;
  screenshotSetId?: string;
  screenshotSetCreated?: boolean;
  existingScreenshotCount?: number;
  results: FileResult[];
};

export type UploadScreenshotsOptions = {
  keyId?: string;
  issuerId?: string;
  privateKeyPath?: string;
  privateKeyP8?: string;
  appId: string;
  locale: string;
  displayType: ScreenshotDisplayType;
  files: string[];
  dryRun?: boolean;
};

/**
 * Append screenshots to an app's editable App Store version, for one locale and one display type.
 * Never deletes or replaces existing screenshots. Defaults to a dry run.
 */
export async function uploadScreenshots(options: UploadScreenshotsOptions): Promise<UploadScreenshotsResult> {
  const { appId, locale, displayType, files } = options;
  const dryRun = options.dryRun !== false;

  if (!files.length) throw new Error('No files given.');
  if (!(displayType in DEVICE_RESOLUTIONS)) {
    throw new Error(`Unknown screenshotDisplayType "${displayType}".`);
  }

  const credentials = await resolveCredentials(options);
  const token = makeAscToken(credentials);

  // ── 1. editable App Store version ──────────────────────────────────────────
  // filter[platform]=IOS — without it, versions for every platform under the app
  // (IOS / MAC_OS / TV_OS) come back in unspecified order and screenshots could
  // target the wrong platform's localization
  const versions = await ascList(token, `/apps/${encodeURIComponent(appId)}/appStoreVersions?filter[platform]=IOS&limit=50`);
  const version = versions.find((v) => {
    const state = (v.attributes?.appVersionState ?? v.attributes?.appStoreState) as string | undefined;
    return state != null && EDITABLE_VERSION_STATES.has(state);
  });
  if (!version) {
    const seen = versions
      .map((v) => `${v.attributes?.versionString ?? '?'}=${v.attributes?.appVersionState ?? v.attributes?.appStoreState ?? '?'}`)
      .join(', ');
    throw new Error(
      `No editable App Store version found for app ${appId}. Create a new version in App Store Connect first. Versions seen: ${seen || 'none'}.`,
    );
  }

  // ── 2. localization for the requested locale ───────────────────────────────
  const localizations = await ascList(token, `/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=200`);
  const localization = localizations.find((l) => l.attributes?.locale === locale);
  if (!localization) {
    const available = localizations.map((l) => String(l.attributes?.locale)).join(', ');
    throw new Error(`Locale "${locale}" is not set up on this version. Available locales: ${available || 'none'}.`);
  }

  // ── 3. find-or-create the screenshot set (append-only; we never delete) ────
  const sets = await ascList(token, `/appStoreVersionLocalizations/${localization.id}/appScreenshotSets?limit=200`);
  let screenshotSet = sets.find((s) => s.attributes?.screenshotDisplayType === displayType);
  let screenshotSetCreated = false;

  // ── 4. validate every file before touching anything remote ────────────────
  const prepared: Array<{ file: string; fileName: string; buffer: Buffer; info: ImageInfo }> = [];
  const failures: FileResult[] = [];
  for (const file of files) {
    const absolute = path.resolve(file);
    try {
      const buffer = await readFile(absolute);
      const info = validateScreenshot(path.basename(absolute), buffer, displayType);
      prepared.push({ file: absolute, fileName: path.basename(absolute), buffer, info });
    } catch (error) {
      failures.push({
        file: absolute,
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const base = {
    dryRun,
    appId,
    locale,
    displayType,
    versionId: version.id,
    versionString: version.attributes?.versionString as string | undefined,
    versionState: (version.attributes?.appVersionState ?? version.attributes?.appStoreState) as string | undefined,
    localizationId: localization.id,
  };

  if (failures.length) {
    // All-or-nothing: a half-uploaded set is worse than no upload.
    return {
      ...base,
      ok: false,
      screenshotSetId: screenshotSet?.id,
      screenshotSetCreated: false,
      results: [
        ...failures,
        ...prepared.map((p) => ({
          file: p.file,
          status: 'skipped' as const,
          detail: 'Not uploaded: another file failed validation.',
        })),
      ],
    };
  }

  const existing = screenshotSet
    ? await ascList(token, `/appScreenshotSets/${screenshotSet.id}/appScreenshots?limit=200`)
    : [];
  if (existing.length + prepared.length > MAX_SCREENSHOTS_PER_SET) {
    throw new Error(
      `${displayType}/${locale} already has ${existing.length} screenshot(s); adding ${prepared.length} would exceed the App Store limit of ${MAX_SCREENSHOTS_PER_SET}. This tool only appends — remove screenshots in App Store Connect first.`,
    );
  }

  if (dryRun) {
    return {
      ...base,
      ok: true,
      screenshotSetId: screenshotSet?.id,
      screenshotSetCreated: false,
      existingScreenshotCount: existing.length,
      results: prepared.map((p) => ({
        file: p.file,
        status: 'skipped' as const,
        detail: `Dry run: would append ${p.fileName} (${p.info.format}, ${p.info.width}x${p.info.height}, ${p.buffer.length} bytes) to ${
          screenshotSet ? `existing set ${screenshotSet.id}` : `a new ${displayType} set`
        }.`,
      })),
    };
  }

  // ── 5. real upload ─────────────────────────────────────────────────────────
  if (!screenshotSet) {
    const created = await ascRequest<{ data: JsonApiResource }>(token, 'POST', '/appScreenshotSets', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: displayType },
        relationships: {
          appStoreVersionLocalization: {
            data: { type: 'appStoreVersionLocalizations', id: localization.id },
          },
        },
      },
    });
    screenshotSet = created.data;
    screenshotSetCreated = true;
  }

  const results: FileResult[] = [];
  for (const item of prepared) {
    try {
      const reserved = await ascRequest<{ data: JsonApiResource }>(token, 'POST', '/appScreenshots', {
        data: {
          type: 'appScreenshots',
          attributes: { fileSize: item.buffer.length, fileName: item.fileName },
          relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: screenshotSet.id } } },
        },
      });

      const screenshotId = reserved.data.id;
      const operations = (reserved.data.attributes?.uploadOperations ?? []) as UploadOperation[];
      if (!operations.length) {
        throw new Error('App Store Connect returned no uploadOperations for this reservation.');
      }

      for (const operation of operations) {
        await uploadChunk(operation, item.buffer);
      }

      await ascRequest(token, 'PATCH', `/appScreenshots/${screenshotId}`, {
        data: {
          type: 'appScreenshots',
          id: screenshotId,
          attributes: {
            uploaded: true,
            sourceFileChecksum: createHash('md5').update(item.buffer).digest('hex'),
          },
        },
      });

      results.push({
        file: item.file,
        status: 'uploaded',
        detail: `Uploaded as appScreenshot ${screenshotId} (${item.info.width}x${item.info.height}, ${item.buffer.length} bytes).`,
      });
    } catch (error) {
      results.push({
        file: item.file,
        status: 'error',
        detail: redact(error instanceof Error ? error.message : String(error)),
      });
    }
  }

  return {
    ...base,
    ok: results.every((r) => r.status === 'uploaded'),
    screenshotSetId: screenshotSet.id,
    screenshotSetCreated,
    existingScreenshotCount: existing.length,
    results,
  };
}

async function uploadChunk(operation: UploadOperation, buffer: Buffer): Promise<void> {
  const { url, method = 'PUT', offset = 0, length = buffer.length } = operation;
  if (!url) throw new Error('Upload operation is missing a url.');

  const headers: Record<string, string> = {};
  for (const header of operation.requestHeaders ?? []) {
    if (header?.name) headers[header.name] = header.value ?? '';
  }

  // `fetch` wants a plain ArrayBuffer-backed view, not a Buffer slice.
  const chunk = new Uint8Array(buffer.subarray(offset, offset + length));
  const response = await fetch(url, {
    method,
    headers,
    body: chunk,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    // `url` is pre-signed and therefore a credential — redact it out of the message.
    throw new Error(
      `Chunk upload failed (${response.status}) at offset ${offset}, length ${length}: ${redact(body).slice(0, 400)}`,
    );
  }
}
