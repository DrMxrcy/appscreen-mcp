---
id: 4
title: Flatten alpha channel on PNG export (upstream issue #24)
type: bug
version: 1.0.1
status: planned
created: 2026-08-11
---

# 🐛 Plan 4: Flatten alpha channel on PNG export (upstream issue #24)
> Type: bug · Target: v1.0.1

## 🔍 Symptom & Reproduction
- **Observed:** Exported PNGs can contain an alpha channel; App Store Connect rejects screenshots with transparency (upstream issue #24).
- **Expected:** Exports are fully opaque and always accepted.
- **Repro steps:** Export with any transparent region/background, upload to App Store Connect — rejected.

## 🩺 Root Cause
- **Culprit:** Export canvas uses default RGBA context and `toDataURL('image/png')` preserves alpha; no opaque flatten step.
- **Why:** Canvas pipeline never guarantees a filled background before export.

## 🛠️ Checklist
- [ ] Step 1: In export path, composite onto an opaque canvas (fill #000/#fff or background color first) before toDataURL/toBlob -> target: app.js exportCurrent/exportAll
- [ ] Step 2: Verify: export image with transparent background, inspect pixels (no alpha < 255); batch/ZIP export too -> target: manual + script check
