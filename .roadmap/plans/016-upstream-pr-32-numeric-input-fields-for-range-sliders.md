---
id: 16
title: Upstream PR #32: numeric input fields for range sliders
type: feature
version: 1.3.0
status: done
created: 2026-08-11
---

# Plan 16: Upstream PR #32: numeric input fields for range sliders
> Type: feature · Target: v1.3.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Port upstream PR #32 — numeric text inputs replacing static value spans next to range sliders, two-way synced.
- **Out of scope:** Redesigning slider rows.

## 🏗️ Architectural Blueprint
- **Files to modify:** index.html, app.js, styles.css
- **Schema/interface changes:** none
- **Downstream impact:** big diff (+472/-133 upstream), conflict-prone against our fork; port hunk-wise like PR #33

## 🚶 Step-by-Step Checklist
- [x] Step 1: Fetch diff, port value-input mechanism generically (helper like hex enhancer if patch structure allows) -> target: app.js, index.html
- [x] Step 2: Verify: type value updates canvas + slider; slider updates input; bounds clamped; no double-fire -> target: browser smoke
