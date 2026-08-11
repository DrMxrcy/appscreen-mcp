---
id: 5
title: Hex input for color controls (upstream PR #43)
type: feature
version: 1.1.0
status: planned
created: 2026-08-11
---

# Plan 5: Hex input for color controls (upstream PR #43)
> Type: feature · Target: v1.1.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Every color picker (background, gradient stops, text, shadow, border) gets a paired hex text input, two-way synced (upstream PR #43, fixes issue #42).
- **Out of scope:** RGBA/HSL inputs, eyedropper, palette management.

## 🏗️ Architectural Blueprint
- **Files to create:** none
- **Files to modify:** index.html (inputs next to each `<input type="color">`), app.js (sync handlers), styles.css
- **Schema/interface changes:** none — hex is already the stored format
- **Downstream impact:** gradient editor stops need same treatment

## 🚶 Step-by-Step Checklist
- [ ] Step 1: Fetch upstream PR #43 diff, adapt to our fork's controls (incl. any we added) -> target: index.html, app.js, styles.css
- [ ] Step 2: Verify: type hex updates swatch + canvas; pick color updates hex; invalid input rejected gracefully -> target: manual test
