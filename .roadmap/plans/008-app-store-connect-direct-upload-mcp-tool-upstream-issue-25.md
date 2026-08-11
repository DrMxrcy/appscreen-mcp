---
id: 8
title: App Store Connect direct upload MCP tool (upstream issue #25)
type: feature
version: 1.2.0
status: done
created: 2026-08-11
---

# Plan 8: App Store Connect direct upload MCP tool (upstream issue #25)
> Type: feature · Target: v1.2.0

## 🎯 Target Scope & Boundaries
- **Core objective:** New MCP tool `upload_screenshots` that pushes exported screenshots to App Store Connect via its official API (JWT auth with key ID / issuer ID / .p8), per app + locale + display type. Closes the generate → localize → upload loop (upstream issue #25 — our MCP fork can do this, browser-only upstream can't).
- **Out of scope:** Browser-UI upload button, metadata/description upload, TestFlight, review submission.

## 🏗️ Architectural Blueprint
- **Files to create:** mcp-server/src/asc-upload.ts (ASC API client: JWT sign, create screenshot set, reserve/upload/commit asset chunks)
- **Files to modify:** mcp-server/src/index.ts (register tool), mcp-server/package.json (jose or jsonwebtoken dep), mcp-server/README.md
- **Schema/interface changes:** tool input { keyId, issuerId, privateKeyPath (or env ASC_KEY_*), appId, locale, displayType, files[] }; secrets via env preferred, never logged
- **Downstream impact:** pairs with plan 4 (no alpha) — validate dimensions/alpha before upload and fail with clear message

## 🚶 Step-by-Step Checklist
- [x] Step 1: Research ASC API screenshot upload flow (screenshot sets, asset reservation, chunked upload, commit + checksum) and pick JWT lib -> target: analysis note
- [x] Step 2: Implement asc-upload.ts client with dimension/alpha pre-validation -> target: mcp-server/src/asc-upload.ts
- [x] Step 3: Register `upload_screenshots` tool with env-based credential resolution -> target: mcp-server/src/index.ts
- [x] Step 4: Verify against a real/test ASC app (dry-run mode that stops before commit); document setup -> target: mcp-server/README.md

## 📝 Verification & residual risks (adversarial review CONFIRMED all claims)
- dryRun defaults true at schema AND function level; only literal `false` uploads. Stubbed-fetch tests prove zero non-GET calls in dry-run and no DELETE anywhere.
- Key material never in errors/logs/wire (asserted `Bearer eyJ` only); pre-signed URLs redacted.
- Residual: resolution table will drift with new devices (fails closed); JPEG walker rejects legal FF-fill sequences (fails closed); mid-batch network failure leaves earlier files uploaded (per-file status reports it, append-only by design — no delete path); JWT/upload-operation shapes verified against documented API, not live Apple (no credentials in dev env).
