---
id: 10
title: Ollama local model support for AI translations (upstream PR #7)
type: feature
version: 1.2.0
status: planned
created: 2026-08-11
---

# Plan 10: Ollama local model support for AI translations (upstream PR #7)
> Type: feature · Target: v1.2.0

## 🎯 Target Scope & Boundaries
- **Core objective:** Ollama as a translation provider next to Claude/OpenAI/Google: configurable base URL, auto-detect installed models, no API key needed (upstream PR #7, adapted). Completes the fully-offline self-host story with plan 9.
- **Out of scope:** Bundling Ollama in docker-compose (document it instead), non-translation LLM features.

## 🏗️ Architectural Blueprint
- **Files to create:** none
- **Files to modify:** llm.js (Ollama provider: /api/tags for model list, /api/chat for translation), index.html + app.js (provider select + base URL + model dropdown in settings), mcp-server/README.md
- **Schema/interface changes:** settings gain `{ provider: 'ollama', ollamaUrl, ollamaModel }`
- **Downstream impact:** CORS — Ollama needs OLLAMA_ORIGINS set for browser calls; document clearly

## 🚶 Step-by-Step Checklist
- [ ] Step 1: Fetch upstream PR #7 diff, adapt provider code to our llm.js structure -> target: llm.js
- [ ] Step 2: Settings UI: provider option, URL field, model auto-detect dropdown -> target: index.html, app.js
- [ ] Step 3: Verify against local Ollama: model list loads, translation round-trip works; document OLLAMA_ORIGINS -> target: manual test + README
