---
id: 2
title: Fix image background not persisting across multiple screenshots (upstream PR #33)
type: bug
version: 1.0.1
status: planned
created: 2026-08-11
---

# 🐛 Plan 2: Fix image background not persisting across multiple screenshots (upstream PR #33)
> Type: bug · Target: v1.0.1

## 🔍 Symptom & Reproduction
- **Observed:** Background image set on a screenshot is lost after switching screenshots / reload (upstream issue #27).
- **Expected:** Per-screenshot background image persists like every other setting.
- **Repro steps:** Set image background on screenshot A, switch to B and back (or reload) — background gone.

## 🩺 Root Cause
- **Culprit:** Per-screenshot background image not serialized into IndexedDB state (image data/reference dropped in saveState/restore path). Upstream PR #33 fixes persistence and also adds text shadow.
- **Why:** Image backgrounds stored as runtime Image objects, not persisted per-screenshot.

## 🛠️ Checklist
- [ ] Step 1: Fetch upstream PR #33 diff, split persistence fix from text-shadow feature; check whether our fork already reworked this path -> target: analysis note
- [ ] Step 2: Apply persistence fix (and text shadow if it applies cleanly) to our state save/restore -> target: app.js
- [ ] Step 3: Verify: set image background, switch screenshots + reload, background survives; export renders it -> target: manual test
