---
id: 9
title: HTTP transport and self-hosted MCP stack
type: feature
version: 1.2.0
status: planned
created: 2026-08-11
---

# Plan 9: HTTP transport and self-hosted MCP stack
> Type: feature · Target: v1.2.0

## 🎯 Target Scope & Boundaries
- **Core objective:** MCP server supports Streamable HTTP transport with bearer-token auth alongside stdio, and docker-compose runs frontend + MCP server as one self-hosted stack (no dependence on the hosted GitHub Pages frontend). Deployable on own infra (e.g. Dokploy).
- **Out of scope:** Multi-tenant auth/user accounts, TLS termination (reverse proxy's job), horizontal scaling.

## 🏗️ Architectural Blueprint
- **Files to create:** none expected (transport lives in mcp-server/src/index.ts or small http.ts)
- **Files to modify:** mcp-server/src/index.ts (StreamableHTTPServerTransport from @modelcontextprotocol/sdk, `--http`/PORT flag, MCP_AUTH_TOKEN check), docker-compose.yml + Dockerfile (service for MCP server pointing APP_URL at bundled nginx frontend), mcp-server/README.md
- **Schema/interface changes:** env: MCP_TRANSPORT=stdio|http, PORT, MCP_AUTH_TOKEN, APP_URL default → local frontend container
- **Downstream impact:** Playwright inside container needs chromium deps in image; health check endpoint

## 🚶 Step-by-Step Checklist
- [ ] Step 1: Add Streamable HTTP transport + bearer auth behind flag/env (stdio remains default) -> target: mcp-server/src/index.ts
- [ ] Step 2: Containerize MCP server with Playwright deps; compose service wired to frontend container via APP_URL -> target: Dockerfile / docker-compose.yml
- [ ] Step 3: Verify: `docker compose up`, connect MCP client over HTTP with token, run full generate+export flow -> target: end-to-end smoke
