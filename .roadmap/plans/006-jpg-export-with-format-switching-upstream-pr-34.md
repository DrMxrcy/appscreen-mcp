---
id: 6
title: JPG export with format switching (upstream PR #34)
type: feature
version: 1.1.0
status: planned
created: 2026-08-11
---

# Plan 6: JPG export with format switching (upstream PR #34)
> Type: feature · Target: v1.1.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Export format selector (PNG/JPG, JPG quality fixed at high) for single and batch export (upstream PR #34, +52/-9).
- **Out of scope:** WebP/AVIF, per-screenshot format, quality slider.

## 🏗️ Architectural Blueprint
- **Files to create:** none
- **Files to modify:** index.html (format select in export UI), app.js (`exportCurrent`/`exportAll` mime + extension), mcp-server/src/index.ts + mcp-bridge.js (expose format param on export tool)
- **Schema/interface changes:** export settings gain `format: 'png'|'jpg'`; persisted in state
- **Downstream impact:** JPG has no alpha — pairs with plan 4 flatten; ZIP naming uses correct extension

## 🚶 Step-by-Step Checklist
- [ ] Step 1: Port upstream PR #34 into export pipeline + UI -> target: app.js, index.html
- [ ] Step 2: Expose format option through MCP export tool -> target: mcp-bridge.js, mcp-server/src/index.ts
- [ ] Step 3: Verify: PNG and JPG single + ZIP exports open correctly, right extensions -> target: manual + MCP smoke
