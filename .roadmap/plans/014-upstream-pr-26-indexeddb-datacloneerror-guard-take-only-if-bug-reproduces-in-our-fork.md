---
id: 14
title: Upstream PR #26: IndexedDB DataCloneError guard — take only if bug reproduces in our fork
type: bug
version: 1.2.0
status: done
created: 2026-08-11
---

# 🐛 Plan 14: Upstream PR #26: IndexedDB DataCloneError guard — take only if bug reproduces in our fork
> Type: bug · Target: v1.2.0

## 🔍 Symptom & Reproduction
- **Observed:** Upstream issue: IndexedDB save throws DataCloneError when non-cloneable objects (live Image, functions) reach store.put; save silently dies (catch swallows).
- **Expected:** Saves never abort on runtime objects.
- **Repro steps:** May already be fixed in our fork (v1.0.1 stripped Image from screenshots AND defaults). Verify first.

## 🩺 Root Cause
- **Culprit:** Runtime objects leaking into serialized state. Upstream PR #26 adds a guard; our fork may already cover all paths.
- **Why:** saveState serializes live state object.

## 🛠️ Checklist
- [x] Step 1: Attempt repro in our fork (inject Image into element/popout state, save); diff PR #26 for paths we missed -> target: analysis
- [x] Step 2: If reproducible, add a structured-clone-safe serializer pass (or targeted strips); else close as already-fixed with evidence -> target: app.js
