---
id: 3
title: Fix per-language text layout state (upstream PR #11)
type: bug
version: 1.0.1
status: planned
created: 2026-08-11
---

# 🐛 Plan 3: Fix per-language text layout state (upstream PR #11)
> Type: bug · Target: v1.0.1

## 🔍 Symptom & Reproduction
- **Observed:** Per-language text settings bleed across languages / layout state wrong when switching languages (upstream issue #36).
- **Expected:** Each language keeps its own text content and layout state cleanly.
- **Repro steps:** Enable per-screenshot text, add translations, switch languages — settings mix up.

## 🩺 Root Cause
- **Culprit:** Text layout state keyed globally instead of per-language in parts of the pipeline; upstream PR #11 (+218/-82) fixes state keying.
- **Why:** `headlines`/`subheadlines` are per-language but layout settings shared incorrectly.

## 🛠️ Checklist
- [ ] Step 1: Fetch upstream PR #11 diff; map against our fork's language-utils.js/app.js (our fork extended localization heavily — expect conflicts) -> target: analysis note
- [ ] Step 2: Port the state-keying fix, adapted to our localization workflow -> target: app.js, language-utils.js
- [ ] Step 3: Verify: multi-language project, per-screenshot text on, switch languages repeatedly — no bleed; export per language correct -> target: manual test
