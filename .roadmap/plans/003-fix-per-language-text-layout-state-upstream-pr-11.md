---
id: 3
title: Fix per-language text layout state (upstream PR #11)
type: bug
version: 1.0.1
status: done
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
- [x] Step 1: Fetch upstream PR #11 diff; map against our fork's language-utils.js/app.js (our fork extended localization heavily — expect conflicts) -> target: analysis note
- [x] Step 2: Port the state-keying fix, adapted to our localization workflow -> target: app.js, language-utils.js
- [x] Step 3: Verify: multi-language project, per-screenshot text on, switch languages repeatedly — no bleed; export per language correct -> target: manual test

## ✅ Resolution: already present in fork
Upstream PR #11's entire mechanism exists in our tree in evolved form (inherited via our
fork lineage): `languageSettings` per-language layout maps, `currentLayoutLang`,
`getTextLanguageSettings`/`getEffectiveLayout`, `setTextLanguageValue`, newline-aware
`wrapText`, and the Gemini model list update in llm.js. Verified functionally in browser:
per-language headlineSize/position isolated between en/de; wrapText splits on \n.
No code change required.
