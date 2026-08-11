---
id: 7
title: Text alignment options (upstream issue #29)
type: feature
version: 1.1.0
status: done
created: 2026-08-11
---

# Plan 7: Text alignment options (upstream issue #29)
> Type: feature · Target: v1.1.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Left/center/right alignment for headline and subheadline, per screenshot (most-requested upstream feature, issue #29).
- **Out of scope:** Justify, vertical alignment changes, RTL auto-detection.

## 🏗️ Architectural Blueprint
- **Files to create:** none
- **Files to modify:** index.html (alignment toggle in Text tab), app.js (`drawText` uses `ctx.textAlign` + x anchor per alignment; state field), styles.css
- **Schema/interface changes:** text settings gain `align: 'left'|'center'|'right'` (default center — backward compatible)
- **Downstream impact:** multi-language text and per-screenshot text settings must both carry the field; MCP set-text tool gains optional align param

## 🚶 Step-by-Step Checklist
- [x] Step 1: Add align state + UI toggle -> target: app.js, index.html
- [x] Step 2: Apply alignment in drawText (anchor x: padding / center / width-padding) -> target: app.js
- [x] Step 3: Expose align via MCP text tool; verify old projects load with default center -> target: mcp-bridge.js, mcp-server/src/index.ts
