# 🗺️ Roadmap: AppScreen MCP

## 💡 Idea Incubator
- Project-as-JSON MCP tools: import/export project templates via MCP for agent-driven brand styling
- Screenshot spec validation MCP tool: check exports against current App Store size requirements before upload
- Upstream issue #28: cross-screen screenshot overflow (one design spanning multiple store slots) — big visual differentiator
- Upstream PR #26: IndexedDB DataCloneError guard — take only if bug reproduces in our fork
- Upstream PR #32: numeric input fields for range sliders (big diff, conflict-prone)
- Port upstream PRs #40/#41 (panorama background spanning + iPad device) — diff-check against our #37-based fork first
<!-- Free-form; sync never rewrites this region. ONE bullet per idea (`roadmap.py idea`).
     Long write-ups (brainstorms, review findings) go to .roadmap/notes/ files and get linked. -->
<!-- roadmap:auto:start -->
**Current version: v1.0.0**

## 📊 Versions

### [x] v1.0.1 — 100%
- [x] **#1 Fix severe slowdown with 5+ screenshots (upstream PR #39)** `bug` — 100% ([plan](.roadmap/plans/001-fix-severe-slowdown-with-5-screenshots-upstream-pr-39.md))
- [x] **#2 Fix image background not persisting across multiple screenshots (upstream PR #33)** `bug` — 100% ([plan](.roadmap/plans/002-fix-image-background-not-persisting-across-multiple-screenshots-upstream-pr-33.md))
- [x] **#3 Fix per-language text layout state (upstream PR #11)** `bug` — 100% ([plan](.roadmap/plans/003-fix-per-language-text-layout-state-upstream-pr-11.md))
- [x] **#4 Flatten alpha channel on PNG export (upstream issue #24)** `bug` — 100% ([plan](.roadmap/plans/004-flatten-alpha-channel-on-png-export-upstream-issue-24.md))

### [x] v1.1.0 — 100%
- [x] **#5 Hex input for color controls (upstream PR #43)** `feature` — 100% ([plan](.roadmap/plans/005-hex-input-for-color-controls-upstream-pr-43.md))
- [x] **#6 JPG export with format switching (upstream PR #34)** `feature` — 100% ([plan](.roadmap/plans/006-jpg-export-with-format-switching-upstream-pr-34.md))
- [x] **#7 Text alignment options (upstream issue #29)** `feature` — 100% ([plan](.roadmap/plans/007-text-alignment-options-upstream-issue-29.md))

### [ ] v1.2.0 — 0%
- [ ] **#8 App Store Connect direct upload MCP tool (upstream issue #25)** `feature` — 0% ([plan](.roadmap/plans/008-app-store-connect-direct-upload-mcp-tool-upstream-issue-25.md))
- [ ] **#9 HTTP transport and self-hosted MCP stack** `feature` — 0% ([plan](.roadmap/plans/009-http-transport-and-self-hosted-mcp-stack.md))
- [ ] **#10 Ollama local model support for AI translations (upstream PR #7)** `feature` — 0% ([plan](.roadmap/plans/010-ollama-local-model-support-for-ai-translations-upstream-pr-7.md))
<!-- roadmap:auto:end -->
