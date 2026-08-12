---
id: 13
title: Project-as-JSON MCP tools: import/export project templates via MCP for agent-driven brand styling
type: feature
version: 1.3.0
status: done
created: 2026-08-11
---

# Plan 13: Project-as-JSON MCP tools: import/export project templates via MCP for agent-driven brand styling
> Type: feature · Target: v1.3.0

## 🎯 Target Scope & Boundaries
- **Core objective:** MCP tools `appscreen_export_project_template` / `appscreen_apply_project_template`: serialize a project's style (backgrounds, text settings, device settings — no images) as JSON; apply onto another/new project so agents can brand-style programmatically.
- **Out of scope:** Full project backup incl. images (UI export/import already does that), template marketplace.

## 🏗️ Architectural Blueprint
- **Files to modify:** mcp-bridge.js (template extract/apply on state), mcp-server/src/index.ts (two tools), mcp-server/README.md
- **Schema/interface changes:** template JSON { version, defaults, perScreenshotStyles[] } — images and localizedImages excluded
- **Downstream impact:** apply must respect _normalized text guards and side-preview cache invalidation

## 🚶 Step-by-Step Checklist
- [x] Step 1: Bridge: exportProjectTemplate / applyProjectTemplate with image-free serialization -> target: mcp-bridge.js
- [x] Step 2: Server tools + zod schemas -> target: mcp-server/src/index.ts
- [x] Step 3: Verify round-trip in browser (style applied, images untouched); README -> target: smoke + docs
