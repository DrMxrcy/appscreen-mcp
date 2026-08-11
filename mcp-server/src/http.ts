/**
 * Streamable HTTP transport for the AppScreen MCP server.
 *
 * stdio remains the default; this is only used when MCP_TRANSPORT=http or --http is passed.
 * Node's built-in http server is used directly (no express dependency).
 */
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'node:crypto';
import http from 'node:http';

const MCP_PATH = '/mcp';
/** An `initialize` request is tiny; anything larger on a session-less POST is not one. */
const MAX_INIT_BODY_BYTES = 256 * 1024;
/**
 * Cap on an established session's request body. Generous because tool calls carry
 * base64 screenshots, and a set can hold ten of them in one request. Tune with
 * MCP_MAX_BODY_BYTES if your screenshots are larger.
 */
const MAX_BODY_BYTES = Number(process.env.MCP_MAX_BODY_BYTES ?? 64 * 1024 * 1024);
/** Bounds memory from a client that opens sessions without ever closing them. */
const MAX_SESSIONS = 32;

export type HttpServerOptions = {
  /** Builds a fresh McpServer with all tools registered (one per MCP session). */
  createServer: () => McpServer;
  version: string;
  browserReady: () => boolean;
};

type Session = {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  /** Epoch ms of the last request, used by the idle sweep to reclaim the slot. */
  lastActivity: number;
};

/** Distinguishes "client sent too much" from "client sent garbage" at the catch site. */
class BodyTooLargeError extends Error {}

function sendJson(res: http.ServerResponse, status: number, body: unknown, headers: http.OutgoingHttpHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function sendRpcError(res: http.ServerResponse, status: number, code: number, message: string, headers?: http.OutgoingHttpHeaders) {
  sendJson(res, status, { jsonrpc: '2.0', error: { code, message }, id: null }, headers);
}

function bearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const separator = header.indexOf(' ');
  if (separator < 0) return null;
  if (header.slice(0, separator).toLowerCase() !== 'bearer') return null;
  return header.slice(separator + 1).trim() || null;
}

/**
 * Constant-time token check. Both sides are hashed first so timingSafeEqual always gets
 * equal-length buffers and the comparison cannot leak the expected token's length.
 */
function tokenMatches(expected: string, provided: string | null): boolean {
  if (provided === null) return false;
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(provided).digest();
  return crypto.timingSafeEqual(a, b);
}

function readBody(req: http.IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let overflowed = false;
    req.on('data', (chunk: Buffer) => {
      if (overflowed) return;
      size += chunk.length;
      if (size > limit) {
        // Reject but leave the socket alone: the caller still needs to write a 413,
        // and destroying here would surface to the client as a connection reset.
        overflowed = true;
        chunks.length = 0;
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!overflowed) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

/**
 * Reads and JSON-parses a POST body under `limit`. On failure it has already written
 * the response, so the caller just returns.
 */
async function readJsonBody(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  limit: number,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: JSON.parse(await readBody(req, limit)) };
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      // Hang up only if the client is still pushing bytes after we answered.
      res.on('finish', () => {
        if (!req.readableEnded) req.destroy();
      });
      sendRpcError(res, 413, -32600, `Request body exceeds the ${limit} byte limit`);
    } else {
      sendRpcError(res, 400, -32700, 'Parse error: invalid JSON body');
    }
    return { ok: false };
  }
}

export async function startHttpServer(options: HttpServerOptions) {
  const port = Number(process.env.PORT ?? 3000);
  const token = process.env.MCP_AUTH_TOKEN?.trim() || undefined;
  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  // Without a token the server is unauthenticated, so it must not be reachable off-host.
  const host = process.env.MCP_BIND?.trim() || (token ? '0.0.0.0' : '127.0.0.1');

  if (!token) {
    console.error(
      [
        '',
        '  ****************************************************************',
        '  *  WARNING: MCP_AUTH_TOKEN is not set.                         *',
        '  *  The MCP server is UNAUTHENTICATED and anyone who can reach  *',
        `  *  it can drive your browser. Binding to ${host.padEnd(22)}*`,
        '  *  Set MCP_AUTH_TOKEN (openssl rand -hex 32) before exposing   *',
        '  *  this server to a network.                                   *',
        '  ****************************************************************',
        '',
      ].join('\n'),
    );
  }

  const sessions = new Map<string, Session>();

  // Clients that vanish without a DELETE would otherwise hold their slot forever and
  // wedge the endpoint at MAX_SESSIONS.
  const idleMs = Number(process.env.MCP_SESSION_IDLE_MS ?? 30 * 60_000);
  const sweepMs = Math.max(1_000, Math.min(60_000, Math.floor(idleMs / 2)));
  const sweep = setInterval(() => {
    const cutoff = Date.now() - idleMs;
    for (const [id, session] of sessions) {
      if (session.lastActivity > cutoff) continue;
      sessions.delete(id);
      console.error(`[appscreen-mcp] reclaiming idle session ${id}`);
      void session.transport.close().catch(() => undefined);
    }
  }, sweepMs);
  sweep.unref(); // never hold the process open on this alone

  const httpServer = http.createServer((req, res) => {
    void handle(req, res).catch((error) => {
      console.error('[appscreen-mcp] request failed:', error instanceof Error ? error.message : error);
      if (!res.headersSent) sendRpcError(res, 500, -32603, 'Internal server error');
      else res.end();
    });
  });

  async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

    // Unauthenticated on purpose: no secrets, no state, so orchestrators can probe it.
    if (pathname === '/health') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'Method not allowed' }, { Allow: 'GET, HEAD' });
        return;
      }
      sendJson(res, 200, { ok: true, version: options.version, browserReady: options.browserReady() });
      return;
    }

    if (pathname !== MCP_PATH) {
      sendRpcError(res, 404, -32601, 'Not found');
      return;
    }

    // Browsers always send Origin on cross-origin requests; MCP clients do not send it at all.
    // Default-denying any Origin blocks DNS-rebinding attacks against a loopback-bound server.
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      sendRpcError(res, 403, -32000, 'Forbidden: origin not allowed');
      return;
    }

    if (token && !tokenMatches(token, bearerToken(req))) {
      sendRpcError(res, 401, -32001, 'Unauthorized', { 'WWW-Authenticate': 'Bearer' });
      return;
    }

    const header = req.headers['mcp-session-id'];
    const sessionId = typeof header === 'string' ? header : undefined;

    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        sendRpcError(res, 404, -32001, 'Session not found');
        return;
      }
      session.lastActivity = Date.now();
      // GET (SSE) and DELETE carry no body; only POST needs the size cap, which means
      // parsing here and handing the SDK a pre-parsed body.
      if (req.method === 'POST') {
        const parsed = await readJsonBody(req, res, MAX_BODY_BYTES);
        if (!parsed.ok) return;
        await session.transport.handleRequest(req, res, parsed.body);
      } else {
        await session.transport.handleRequest(req, res);
      }
      return;
    }

    // No session yet: the only thing we accept is an `initialize` POST.
    if (req.method !== 'POST') {
      sendRpcError(res, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
      return;
    }

    const parsed = await readJsonBody(req, res, MAX_INIT_BODY_BYTES);
    if (!parsed.ok) return;
    const body = parsed.body;

    if (!isInitializeRequest(body)) {
      sendRpcError(res, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
      return;
    }

    if (sessions.size >= MAX_SESSIONS) {
      sendRpcError(res, 503, -32000, 'Too many active sessions');
      return;
    }

    const server = options.createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server, lastActivity: Date.now() });
      },
    });

    // server.connect() chains onto this handler, and McpServer.close() closes the
    // transport, which fires onclose again. Without the latch that is infinite
    // recursion: one DELETE /mcp blew the stack.
    let closing = false;
    transport.onclose = () => {
      if (closing) return;
      closing = true;
      if (transport.sessionId) sessions.delete(transport.sessionId);
      void server.close().catch(() => undefined);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  console.error(
    `[appscreen-mcp] Streamable HTTP transport listening on http://${host}:${port}${MCP_PATH} ` +
      `(auth: ${token ? 'bearer token' : 'DISABLED'})`,
  );

  return httpServer;
}
