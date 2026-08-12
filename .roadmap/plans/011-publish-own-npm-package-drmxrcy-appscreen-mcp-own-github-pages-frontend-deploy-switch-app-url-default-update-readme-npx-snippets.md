---
id: 11
title: Publish own npm package (@drmxrcy/appscreen-mcp) + own GitHub Pages frontend deploy; switch APP_URL default; update README npx snippets
type: chore
version: 1.2.0
status: done
created: 2026-08-11
---

# Plan 11: Publish own npm package (@drmxrcy/appscreen-mcp) + own GitHub Pages frontend deploy; switch APP_URL default; update README npx snippets
> Type: chore · Target: v1.2.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Ship our fork under our own identity: npm package `@drmxrcy/appscreen-mcp`, GitHub Pages deploy of our frontend from this repo, `APP_URL` default switched to it, README/install snippets updated.
- **Out of scope:** Renaming the repo, custom domain, npm CI automation.

## 🏗️ Architectural Blueprint
- **Files to modify:** mcp-server/package.json (name, version, repository, bin), mcp-server/src/index.ts (APP_URL default), mcp-server/README.md + root README.md (npx snippets), .github/workflows/pages.yml (create — deploy static frontend to Pages)
- **Schema/interface changes:** none
- **Downstream impact:** Claude MCP configs use new package name; old @appsolves references remain in upstream docs only

## 🚶 Step-by-Step Checklist
- [x] Step 1: Rename package + repo metadata, bump version, switch APP_URL default to our Pages URL -> target: mcp-server/package.json, src/index.ts
- [x] Step 2: GitHub Pages workflow deploying the frontend from main -> target: .github/workflows/pages.yml
- [x] Step 3: Update all install/config snippets; npm publish (needs user's npm login) -> target: READMEs
