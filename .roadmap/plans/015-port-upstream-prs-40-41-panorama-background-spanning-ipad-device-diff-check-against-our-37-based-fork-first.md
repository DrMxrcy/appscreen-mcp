---
id: 15
title: Port upstream PRs #40/#41 (panorama background spanning + iPad device) — diff-check against our #37-based fork first
type: feature
version: 1.3.0
status: done
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
- [x] Step 1: Fetch PR #40/#41 diffs, map overlap vs our fork (we already have iPad output sizes; check what's actually missing) -> target: analysis
- [x] Step 2: Port PR #40 span toggle, adapted -> target: app.js, index.html
- [x] Step 3: Port PR #41 iPad device + bg toggle, adapted; verify browser + MCP smoke -> target: app.js, index.html

## 📝 Verification notes
- PR41 proved a strict superset of PR40 (identical app.js hunks) — single port covered both.
- iPad is a procedural Three.js model (no binary assets needed); mesh/material names match frameColorPresets traversal.
- Adversarial review fixes: MCP bridge writes bypassed span propagation + side-preview cache invalidation (bridge refresh now clears cache; propagateSpannedBackground re-syncs group after direct mutations); screenshot-add invalidates cache when ANY screen spans, not just the selected one.
- Accepted behavior change: image background with fit=cover + blur>0 no longer fades at the overflow edges (blur now clips instead of vignetting) — pixel-identical in all other fit/blur combos; documented rather than reverted.
- Known ceiling: 3D iPad at default 70% scale clips on phone-portrait canvases; fits at ≤50%. Follow-up idea if it annoys: auto-scale by device aspect.
