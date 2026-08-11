---
id: 1
title: Fix severe slowdown with 5+ screenshots (upstream PR #39)
type: bug
version: 1.0.1
status: planned
created: 2026-08-11
---

# 🐛 Plan 1: Fix severe slowdown with 5+ screenshots (upstream PR #39)
> Type: bug · Target: v1.0.1

## 🔍 Symptom & Reproduction
- **Observed:** Editing becomes severely slow / near-hangs with more than ~2–5 screenshots in a project (upstream issue #38).
- **Expected:** Editing stays responsive regardless of screenshot count.
- **Repro steps:** Load 5+ screenshots, drag sliders / type text — UI lags for seconds per change.

## 🩺 Root Cause
- **Culprit:** Every `updateCanvas()` re-renders all side previews and re-runs full pipeline for every screenshot; no caching/debouncing (upstream PR #39 fixes this with ~+145/-45 in app.js).
- **Why:** Render cost scales linearly with screenshot count on every keystroke/slider tick.

## 🛠️ Checklist
- [ ] Step 1: Fetch upstream PR #39 diff (`gh pr diff 39 --repo YUZU-Hub/appscreen`) and identify the caching/debounce strategy -> target: analysis note in this plan
- [ ] Step 2: Adapt and apply the fix to our diverged app.js (do not blind-apply the patch; our fork has MCP bridge + extra features) -> target: app.js
- [ ] Step 3: Verify: load 6+ screenshots locally, confirm smooth editing; run MCP smoke (export still correct) -> target: manual + mcp-server test
