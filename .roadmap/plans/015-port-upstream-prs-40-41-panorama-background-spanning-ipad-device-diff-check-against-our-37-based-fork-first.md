---
id: 15
title: Port upstream PRs #40/#41 (panorama background spanning + iPad device) — diff-check against our #37-based fork first
type: feature
version: 1.3.0
status: planned
created: 2026-08-11
---

# Plan 15: Port upstream PRs #40/#41 (panorama background spanning + iPad device) — diff-check against our #37-based fork first
> Type: feature · Target: v1.3.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Port upstream PR #41 (iPad device model support + background image toggle) and PR #40 (background image spanning across screenshots) — conservative cherry-picks, adapt to our fork.
- **Out of scope:** New device models beyond the PRs, redesigns.

## 🏗️ Architectural Blueprint
- **Files to modify:** app.js, index.html, three-renderer.js (if iPad 3D), styles.css
- **Schema/interface changes:** background gains span toggle field; device list gains iPad entries
- **Downstream impact:** side-preview cache keys include dims (safe); MCP set_device_settings/set_background pass-through may need new fields

## 🚶 Step-by-Step Checklist
- [ ] Step 1: Fetch PR #40/#41 diffs, map overlap vs our fork (we already have iPad output sizes; check what's actually missing) -> target: analysis
- [ ] Step 2: Port PR #40 span toggle, adapted -> target: app.js, index.html
- [ ] Step 3: Port PR #41 iPad device + bg toggle, adapted; verify browser + MCP smoke -> target: app.js, index.html
