---
id: 1
title: Fix severe slowdown with 5+ screenshots (upstream PR #39)
type: bug
version: 1.0.1
status: done
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

## 📝 Integration notes (fork adaptations beyond upstream patch)
- mcp-bridge.js `settleRender` prefers `updateCanvasNow()` (rAF-batched updateCanvas defers a frame).
- Fixed 6 defects found in adversarial review of the raw patch: `_normalized` leaked into persisted `defaults.text` (skip-normalization forever bug); `exportAllForLanguage`/`exportAllLanguages` used async updateCanvas (stale ZIP frames in background tabs); 3D side previews early-returned before text/elements/popouts; missing explicit canvas clear when dims unchanged (trails with image-type background and no image); debounced save lost on tab close (added pagehide/beforeunload flush + timer cancel in switchProject); index-keyed side-preview cache never invalidated on reorder/delete/duplicate or localized image add/remove.
- Known accepted tradeoffs (upstream design): side previews render at display resolution (slightly blurrier on retina); noise is now overlay-composited (visual output differs from pre-patch at same slider value); caches unbounded (small in practice).

## 🛠️ Checklist
- [x] Step 1: Fetch upstream PR #39 diff (`gh pr diff 39 --repo YUZU-Hub/appscreen`) and identify the caching/debounce strategy -> target: analysis note in this plan
- [x] Step 2: Adapt and apply the fix to our diverged app.js (do not blind-apply the patch; our fork has MCP bridge + extra features) -> target: app.js
- [x] Step 3: Verify: load 6+ screenshots locally, confirm smooth editing; run MCP smoke (export still correct) -> target: manual + mcp-server test
