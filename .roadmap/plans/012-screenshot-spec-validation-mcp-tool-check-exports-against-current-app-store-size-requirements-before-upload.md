---
id: 12
title: Screenshot spec validation MCP tool: check exports against current App Store size requirements before upload
type: feature
version: 1.3.0
status: done
created: 2026-08-11
---

# Plan 12: Screenshot spec validation MCP tool: check exports against current App Store size requirements before upload
> Type: feature · Target: v1.3.0

## 🎯 Target Scope & Boundaries
- **Core objective:** MCP tool `appscreen_validate_screenshots` that checks image files (or current project exports) against the App Store dimension/format/alpha rules before upload; reuses the validation core from asc-upload.ts.
- **Out of scope:** Play Store rules, auto-fixing images.

## 🏗️ Architectural Blueprint
- **Files to modify:** mcp-server/src/asc-upload.ts (export validateScreenshot + table), mcp-server/src/index.ts (new tool), mcp-server/README.md
- **Schema/interface changes:** tool input { files: string[], displayType }; per-file result { ok, issues[] }
- **Downstream impact:** shares resolution table with upload tool — single source of truth

## 🚶 Step-by-Step Checklist
- [x] Step 1: Export validation core; register validate tool with per-file structured results -> target: mcp-server/src
- [x] Step 2: Verify: valid/invalid fixtures, alpha PNG, wrong dims; README section -> target: offline checks + docs
