# AppScreen MCP Server

> Forked from [AppSolves/appscreen-mcp](https://github.com/AppSolves/appscreen-mcp).

This package exposes the AppScreen App Store Screenshot Generator as a Model Context Protocol server.

It uses a clean in-app automation bridge (`../mcp-bridge.js`) and Playwright. The MCP server does not scrape random UI selectors. It loads the app, calls `window.AppScreenMCP`, and saves exported PNG/ZIP artifacts to disk when requested.

## npm package

The MCP server is published on npm as:

```bash
@drmxrcy/appscreen-mcp
```

For most users, no repository clone is required. MCP clients can run the server directly with `npx`:

```bash
npx -y @drmxrcy/appscreen-mcp@latest
```

The package controls the hosted AppScreen frontend by default:

```txt
https://drmxrcy.github.io/appscreen-mcp/
```

You only need to clone this repository if you want to develop the MCP server or run a local copy of the frontend.

## Local development install

```bash
cd mcp-server
npm install
npx playwright install chromium
npm run build
```

## Run locally

For local development, start the AppScreen frontend from the repository root first:

```bash
python3 -m http.server 8000
```

Then run the MCP server:

```bash
cd mcp-server
APPSCREEN_URL=http://localhost:8000 APPSCREEN_OUTPUT_DIR=./outputs npm start
```

For the hosted fork:

```bash
cd mcp-server
APPSCREEN_URL=https://drmxrcy.github.io/appscreen-mcp/ npm start
```

## Environment variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `APPSCREEN_URL` | No | `https://drmxrcy.github.io/appscreen-mcp/` | URL of the AppScreen frontend that the MCP server should control. Use `http://localhost:8000` for local development or your hosted GitHub Pages URL for the public app. |
| `APPSCREEN_OUTPUT_DIR` | No | `~/AppScreenMCP/outputs` | Directory where exported PNG/ZIP artifacts are saved when `saveToFile` is enabled. Relative paths are resolved from the MCP server process working directory, so absolute paths are recommended for predictable behavior. |
| `APPSCREEN_HEADLESS` | No | `true` | Controls whether Playwright runs Chromium hidden or visible. Set to `false` to see the browser while debugging or watching an agent control the app. |
| `APPSCREEN_BROWSER_TIMEOUT_MS` | No | `60000` | Timeout in milliseconds for browser navigation, bridge initialization, and Playwright operations. Increase this if the hosted app or large screenshot sets load slowly. |
| `APPSCREEN_BROWSER_PROFILE_DIR` | No | `~/AppScreenMCP/browser-profile` | Persistent Chromium profile directory used by Playwright. This preserves browser storage such as IndexedDB between MCP runs. Use a stable absolute path if you want AppScreen projects to persist after closing the browser. |

### Transport variables

Only relevant when running the server over HTTP instead of stdio. See [Self-hosting](#self-hosting).

| Variable | Required | Default | Description |
|---|---:|---|---|
| `MCP_TRANSPORT` | No | `stdio` | Set to `http` to serve the Streamable HTTP transport instead of stdio. The `--http` CLI flag does the same thing. |
| `PORT` | No | `3000` | Port for the HTTP transport. |
| `MCP_AUTH_TOKEN` | **Yes for HTTP** | _unset_ | Bearer token required on every `/mcp` request. If unset, the server prints a warning and binds to `127.0.0.1` only, so it is unreachable from other machines. |
| `MCP_BIND` | No | `0.0.0.0` with a token, `127.0.0.1` without | Interface to bind. Only set this to override the safe default, and only behind a trusted network or reverse proxy. |
| `MCP_ALLOWED_ORIGINS` | No | _empty_ | Comma-separated list of browser origins allowed to call `/mcp`. Empty means any request carrying an `Origin` header is rejected, which blocks DNS-rebinding attacks. Normal MCP clients do not send `Origin`, so you almost never need this. |
| `MCP_MAX_BODY_BYTES` | No | `67108864` (64 MB) | Maximum request body on an established session. Tool calls carry base64 screenshots and a set can hold ten in one request, so raise this if you upload unusually large images. Oversize requests get a `413`. |
| `MCP_SESSION_IDLE_MS` | No | `1800000` (30 min) | How long an idle session is kept before its slot is reclaimed. Clients that disconnect without sending `DELETE /mcp` would otherwise hold a slot until restart. |

### Recommended defaults

For most users, only `APPSCREEN_URL` and optionally `APPSCREEN_HEADLESS` are needed:

```toml
[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://drmxrcy.github.io/appscreen-mcp/"
APPSCREEN_HEADLESS = "true"
```

If you want predictable export and browser persistence paths, set absolute directories:

```toml
[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://drmxrcy.github.io/appscreen-mcp/"
APPSCREEN_OUTPUT_DIR = "C:/Users/YourName/AppScreenMCP/outputs"
APPSCREEN_BROWSER_PROFILE_DIR = "C:/Users/YourName/AppScreenMCP/browser-profile"
APPSCREEN_HEADLESS = "false"
```

### Notes

- `APPSCREEN_OUTPUT_DIR` controls exported files only. It does not control browser storage.
- `APPSCREEN_BROWSER_PROFILE_DIR` controls Chromium's persistent profile, including IndexedDB.
- `APPSCREEN_HEADLESS = "false"` is useful during development because you can watch the agent control the app in real time.
- Avoid using `./outputs` in shared documentation unless you intentionally want outputs relative to the MCP server process working directory.

## Codex example

Add this to your Codex MCP config:

```toml
[mcp_servers.appscreen]
command = "npx"
args = ["-y", "@drmxrcy/appscreen-mcp@latest"]

[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://drmxrcy.github.io/appscreen-mcp/"
APPSCREEN_HEADLESS = "true"
```

For visible browser debugging and explicit output paths:

```toml
[mcp_servers.appscreen]
command = "npx"
args = ["-y", "@drmxrcy/appscreen-mcp@latest"]

[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://drmxrcy.github.io/appscreen-mcp/"
APPSCREEN_OUTPUT_DIR = "C:/Users/YourName/AppScreenMCP/outputs"
APPSCREEN_BROWSER_PROFILE_DIR = "C:/Users/YourName/AppScreenMCP/browser-profile"
APPSCREEN_HEADLESS = "false"
```

## Claude Desktop example

To use the published npm package:

```json
{
  "mcpServers": {
    "appscreen": {
      "command": "npx",
      "args": ["-y", "@drmxrcy/appscreen-mcp@latest"],
      "env": {
        "APPSCREEN_URL": "https://drmxrcy.github.io/appscreen-mcp/",
        "APPSCREEN_HEADLESS": "true"
      }
    }
  }
}
```

For local development from a cloned repository:

```json
{
  "mcpServers": {
    "appscreen": {
      "command": "node",
      "args": ["/absolute/path/to/appscreen-mcp/mcp-server/dist/index.js"],
      "env": {
        "APPSCREEN_URL": "http://localhost:8000",
        "APPSCREEN_OUTPUT_DIR": "/absolute/path/to/appscreen-mcp/mcp-server/outputs",
        "APPSCREEN_HEADLESS": "false"
      }
    }
  }
}
```

## Main tools

- `appscreen_initialize`
- `appscreen_get_usage_guide`
- `appscreen_get_capabilities`
- `appscreen_get_state`
- `appscreen_create_project`
- `appscreen_switch_project`
- `appscreen_rename_project`
- `appscreen_duplicate_project`
- `appscreen_delete_current_project`
- `appscreen_set_output_size`
- `appscreen_set_languages`
- `appscreen_select_screenshot`
- `appscreen_add_blank_screenshot`
- `appscreen_add_screenshot`
- `appscreen_set_localized_screenshot_image`
- `appscreen_remove_screenshot`
- `appscreen_duplicate_screenshot`
- `appscreen_set_background`
- `appscreen_set_background_image`
- `appscreen_set_device_settings`
- `appscreen_apply_position_preset`
- `appscreen_set_text`
- `appscreen_add_text_element`
- `appscreen_add_emoji_element`
- `appscreen_add_icon_element`
- `appscreen_add_graphic_element`
- `appscreen_update_element`
- `appscreen_delete_element`
- `appscreen_add_popout`
- `appscreen_update_popout`
- `appscreen_delete_popout`
- `appscreen_apply_style_to_all`
- `appscreen_export_project_template`
- `appscreen_apply_project_template`
- `appscreen_create_screenshot_set`
- `appscreen_patch_state`
- `appscreen_capture_editor_preview`
- `appscreen_export_current_png`
- `appscreen_export_all_zip`
- `appscreen_demo_run_cable_launch_recipe`
- `appscreen_upload_to_app_store`
- `appscreen_raw_bridge_call`

## Project style templates

`appscreen_export_project_template` serializes a project's look as JSON, and
`appscreen_apply_project_template` stamps that look onto the current project. Use it to
keep one brand style across projects without re-issuing every styling call.

```jsonc
{
  "formatVersion": 1,
  "defaults":   { "background": {}, "screenshot": {}, "text": {} },
  "screenshots": [{ "background": {}, "screenshot": {}, "text": {}, "elements": [], "popouts": [] }]
}
```

Templates are style, not content:

- **No images.** Screenshot images, background images (`imageSrc`), and element/popout
  image sources are stripped, so a template stays small and portable instead of carrying
  embedded base64. Applying a template never touches the target's images. Image-backed
  overlay elements therefore come back inert — re-add their artwork with
  `appscreen_add_graphic_element` after applying.
- **No copy.** `headlines`/`subheadlines` are excluded; existing captions survive an
  apply. Text layout and styling — including per-language layout in `languageSettings` —
  is part of the template.
- **Overlays are replaced.** `elements` and `popouts` from the template overwrite the
  target screenshot's own.

`mode` (default `all`) selects the scope: `defaults-only` styles just the project
defaults used by new screenshots; `all` additionally styles every existing screenshot by
index, cycling the template's screenshot entries when the counts differ.

## Uploading to App Store Connect

`appscreen_upload_to_app_store` uploads finished screenshots to Apple using the official
App Store Connect API. It appends to the screenshot set for one app, one locale and one
device display type — it never deletes or replaces existing screenshots.

### 1. Create an API key

In [App Store Connect](https://appstoreconnect.apple.com) go to **Users and Access →
Integrations → App Store Connect API**, create a key with the **App Manager** role, then note:

- the **Key ID** (e.g. `2X9R4HXF34`),
- the **Issuer ID** shown above the key list (a UUID),
- and download the `.p8` private key file. Apple lets you download it **once** — store it
  somewhere private (e.g. `~/.appstoreconnect/private_keys/AuthKey_2X9R4HXF34.p8`, mode `600`).

### 2. Environment variables

| Variable | Required | Description |
|---|---:|---|
| `ASC_KEY_ID` | Yes | App Store Connect API Key ID. Overridden by the tool's `keyId` argument. |
| `ASC_ISSUER_ID` | Yes | Issuer ID (UUID). Overridden by the tool's `issuerId` argument. |
| `ASC_PRIVATE_KEY_PATH` | Yes\* | Path to the downloaded `.p8` file. Overridden by the tool's `privateKeyPath` argument. |
| `ASC_PRIVATE_KEY` | Yes\* | Alternative to the path: the `.p8` PEM contents inline. |

\* Provide either `ASC_PRIVATE_KEY_PATH` or `ASC_PRIVATE_KEY`.

**Your private key stays on your machine.** It is read locally, used only to sign a
short-lived (10 minute) ES256 JWT, and is never logged, never returned in a tool result, and
never transmitted — only the resulting signed JWT is sent to Apple, exactly as the API requires.
Don't commit the `.p8` file, and don't paste the key into a chat.

### 3. Dry run first

`dryRun` defaults to `true`. A dry run authenticates, resolves the editable App Store version,
the locale's localization and the screenshot set, and validates every file locally — format
(PNG/JPEG), no alpha channel, and exact pixel dimensions for the display type — then reports what
*would* be uploaded without reserving or transferring anything. Read that report, then re-run with
`dryRun: false` to commit.

```jsonc
// 1. dry run (default)
{
  "name": "appscreen_upload_to_app_store",
  "arguments": {
    "appId": "1234567890",
    "locale": "en-US",
    "displayType": "APP_IPHONE_67",
    "files": [
      "/Users/me/AppScreenMCP/outputs/en-US/01.png",
      "/Users/me/AppScreenMCP/outputs/en-US/02.png"
    ]
  }
}

// 2. same call plus "dryRun": false to actually upload
```

Notes:

- `displayType` names lag Apple's marketing names: `APP_IPHONE_67` is today's **6.9"** iPhone
  slot (1320×2868), `APP_IPHONE_61` is the **6.3"** slot, `APP_IPAD_PRO_3GEN_129` is the **13"**
  iPad slot (2064×2752).
- The app needs a version in an editable state (e.g. *Prepare for Submission*) before uploading.
- Apple allows at most 10 screenshots per set; the tool reports the existing count and refuses to
  exceed the limit rather than deleting anything.

### Validating screenshots without uploading

`appscreen_validate_screenshots` runs the same local checks (format, alpha channel, exact pixel
dimensions) for a `files` list and `displayType`, with no credentials required. Use it as a
pre-flight check before `appscreen_upload_to_app_store`; each result is `{ file, ok, issues[] }`.

## Recommended workflow for agents

For production App Store or Google Play screenshot sets with different captions per screenshot, use:

1. `appscreen_initialize`
2. `appscreen_get_usage_guide`
3. `appscreen_get_capabilities`
4. `appscreen_create_screenshot_set`
5. `appscreen_capture_editor_preview` if visual editor inspection is needed
6. `appscreen_export_all_zip` if the ZIP was not already exported by `appscreen_create_screenshot_set`

Do not use `appscreen_demo_run_cable_launch_recipe` for production multi-screen sets. It is a legacy/demo shortcut that applies one shared headline/subheadline map across all screenshots.

## File inputs

Tools that accept images can receive either:

- `filePath`: a local path readable by the MCP server process
- `dataUrl`: a `data:image/*;base64,...` string
- `base64` plus `mimeType`

Exports return base64 data and, when `saveToFile` is true, write files into `APPSCREEN_OUTPUT_DIR`.

## Typical agent prompt

```txt
Use AppScreen MCP.

First call appscreen_get_usage_guide.

Then create a production screenshot set:
- projectName: "My App Launch"
- outputDevice: "iphone-6.9"
- languages: ["en", "de"]
- use a polished blue-purple gradient background
- use centered phone mockups with a slight rotation
- upload these local screenshot paths
- give every screenshot different English and German headline/subheadline text
- export all languages as ZIP
- capture an editor preview
- return the output file paths
```

## Self-hosting

By default the MCP server talks **stdio** and is launched by your MCP client as a child process. For a self-hosted deployment you can instead run it as a long-lived HTTP service that any MCP client can connect to over the network, with the AppScreen frontend running next to it in the same stack. Nothing then depends on the hosted GitHub Pages site.

### One command with docker compose

The compose stack runs two containers: `appscreen-mcp` (the nginx frontend, port 8080) and `appscreen-mcp-server` (this MCP server on the Streamable HTTP transport, port 3000). The MCP server drives the frontend container over the internal compose network, so no traffic leaves your host.

From the repository root:

```bash
# 1. Generate an auth token. Treat it like a password.
echo "MCP_AUTH_TOKEN=$(openssl rand -hex 32)" >> .env

# 2. Start the stack (builds both images on first run).
docker compose up -d

# 3. Check it is alive.
curl http://localhost:3000/health
# {"ok":true,"version":"1.0.2","browserReady":false}
```

`docker compose config` fails fast if `MCP_AUTH_TOKEN` is missing. This is deliberate: an unauthenticated MCP endpoint lets anyone who can reach it drive a browser, read local files through the `filePath` tool arguments, and use your App Store Connect credentials.

`docker-compose.build.yml` is the same stack with the frontend built from source rather than pulled from ghcr.

### Connecting an MCP client over HTTP

The endpoint is `POST/GET/DELETE http://<host>:3000/mcp` and every request must carry the bearer token:

```
Authorization: Bearer <MCP_AUTH_TOKEN>
```

Claude Code:

```bash
claude mcp add --transport http appscreen https://appscreen.example.com/mcp \
  --header "Authorization: Bearer $MCP_AUTH_TOKEN"
```

Clients using a JSON config file:

```json
{
  "mcpServers": {
    "appscreen": {
      "type": "http",
      "url": "https://appscreen.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Raw check with curl:

```bash
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}' -D -
```

The response carries an `mcp-session-id` header; send it back on every subsequent request alongside the `Authorization` header.

### Running the HTTP transport without Docker

```bash
cd mcp-server
npm run build
MCP_TRANSPORT=http PORT=3000 MCP_AUTH_TOKEN=$(openssl rand -hex 32) npm start
```

### Health endpoint

`GET /health` is intentionally unauthenticated so load balancers and orchestrators can probe it. It returns no secrets:

```json
{ "ok": true, "version": "1.0.2", "browserReady": true }
```

`browserReady` is `false` until the first tool call launches Chromium.

### Security notes

- **Always set `MCP_AUTH_TOKEN`.** Generate one with `openssl rand -hex 32`. Without it the server refuses to listen on anything except loopback, which means the published container port simply will not answer.
- **TLS is the reverse proxy's job.** This server speaks plain HTTP. Put nginx, Caddy, Traefik, or your platform's ingress (Dokploy, for example) in front of it and terminate HTTPS there. A bearer token sent over plain HTTP across an untrusted network is a token you have given away.
- **Rotate the token** by changing `.env` and running `docker compose up -d`; existing sessions die with the container.
- **The stack is single-tenant.** All MCP sessions drive the one shared browser page, so two clients working at the same time will interfere with each other's project state. Run one stack per user.
- **Concurrent sessions are capped at 32**, and idle ones are reclaimed after `MCP_SESSION_IDLE_MS`. Request bodies over `MCP_MAX_BODY_BYTES` are rejected with `413`. Both limits exist so a client that disappears or floods the endpoint cannot exhaust memory or wedge the server.
- Requests carrying a browser `Origin` header are rejected unless listed in `MCP_ALLOWED_ORIGINS`, which blocks DNS-rebinding attacks against a loopback-bound server.

## How it works

The MCP server starts a Playwright-controlled Chromium instance and opens the AppScreen frontend. The frontend exposes a stable automation bridge at:

```js
window.AppScreenMCP
```

The MCP server calls that bridge directly from the browser context. This keeps automation reliable because the server does not depend on fragile button labels, CSS selectors, or UI layout details.

The browser profile is persistent by default, so AppScreen's IndexedDB data can survive MCP restarts. Exported PNG/ZIP files are saved separately to `APPSCREEN_OUTPUT_DIR`.

## License

MIT License.