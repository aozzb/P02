# Implementation Plan — Hostel Food Compatibility Board (P02)

## Context

P02_SPEC.md is the source of truth for a small, in-memory, browser-based tool that
tells a fixed group of hostel residents which dishes (from a small built-in menu)
everyone can eat, within budget, with an exact and ordered explanation for every
excluded dish. The repo is currently greenfield: only the spec and empty deliverable
stub files exist (`IMPLEMENTATION_PLAN.md`, `AI_INTERACTION_LOG.md`,
`DESIGN_SUMMARY.md`, `TEST_EVIDENCE.md`), no app code yet.

The spec is unusually precise about contract details that are easy to get subtly
wrong: diet hierarchy (`VEGAN` ⊂ `VEGETARIAN` ⊂ accepts-anything for
`NO_RESTRICTION`), exact-string allergen matching (no aliasing/inference),
per-person (not per-group) budget with an inclusive ₹150 boundary, a fixed
exclusion-reason ordering (resident-table order → diet before allergen →
`OVER_BUDGET` last), dish source-order preservation, search that only ever narrows
an already-computed compatible set without changing the compatible count, and a
validation/reset flow that must clear stale results rather than silently keep them.
The goal of this plan is to build the general rule engine so the oracle case in
§3.3 falls out of correct logic, not from hard-coded outputs, and to keep that
engine testable independently of the DOM per §2.3.

Tech choice (confirmed with user): plain JS, no framework, no build step —
`logic.js` (pure functions, in-memory data + rules, no DOM) + `ui.js` (rendering
and event wiring) + `index.html` (structure, loads both scripts) + a light
`styles.css`. This satisfies "separate business logic from UI rendering ... so the
compatibility rules can be tested independently" (§2.3) with the simplest possible
structure.

## Checkpoints

### Checkpoint 1 — Data Model, Normalization & Validation

**Build:**
- Default data/state: `{ residents: [{name, diet, allergens: []}], dishes: [{id, cafe, name, dietClass, tags: [], price}], budget, searchQuery }`, seeded from the built-in defaults in §3.1/§3.2.
- Normalization: trim + uppercase for diet classes, ingredient tags, allergen tags (§4.1).
- Resident/dish validation: non-empty-after-trim for resident names, dish IDs, cafe names, dish names, ingredient tags (§4.8).
- Diet-class validation: reject `NO_RESTRICTION` as a dish diet class — valid only for residents (§4.1).
- Unique IDs: dish IDs must be unique (trimmed, exact — not uppercased, since §4.1 only normalizes diet/tags/allergens, not IDs).
- Budget/price validation: budget and every dish price must be positive whole rupee values — reject 0, negative, and non-integer values (§4.4, §4.8).
- Specific validation errors: return `{ok: false, code: 'INVALID_INPUT'|'DUPLICATE_DISH_ID', table, row, field}` identifying exactly where the problem is, not just that one exists.

**Files/functions:** `logic.js` — `createDefaultState()`, `normalize(str)`, `validateState(state)`.

**Verify before continuing:** Run `validateState` against: the untouched built-in state (passes); a duplicate dish ID (caught with correct code/row/field); a zero/negative/non-integer price or budget (caught); a `NO_RESTRICTION` dish diet class (rejected); whitespace-padded/lowercase inputs (normalize correctly, still pass).

---

### Checkpoint 2 — Core Compatibility Engine

**Build:**
- `checkDiet(resident, dish)` — VEGAN resident ⇒ dish must be VEGAN; VEGETARIAN resident ⇒ dish must be VEGAN or VEGETARIAN; NO_RESTRICTION ⇒ always passes (§4.2).
- `checkAllergens(resident, dish)` — iterate the dish's ingredient tags **in dish order**, return every tag that exactly equals one of the resident's allergens (§4.3, §4.6 step 2).
- `checkBudget(dish, budget)` — price is a positive whole rupee value and `price <= budget`, inclusive (§4.4).
- `evaluateDish(dish, residents, budget)` — for each resident **in resident-table order**, run both `checkDiet` and `checkAllergens` independently (diet failing does not skip that resident's allergen check): push `DIET:<resident>` if diet fails, then push `ALLERGEN:<resident>:<tag>` for each matched tag in dish-tag order. After all residents, if budget fails, push `OVER_BUDGET` last (§4.6). Dish is compatible iff the reasons list is empty.
- `evaluateAll(state)` — maps over dishes **in source order** (never re-sorted), returns `{compatible: [dish...], exclusions: [{dish, reasons}...], compatibleCount}`.

**Files/functions:** `logic.js` — the four functions above, called only after `validateState` passes.

**Verify before continuing:**
- Built-in oracle: compatible = [D01, D02] in that order, count 2; D03 → `["DIET:Asha", "ALLERGEN:Mira:MILK"]`; D04 → `["ALLERGEN:Dev:PEANUT"]`; D05 → `["DIET:Asha", "DIET:Dev"]`.
- ₹150 boundary: D02 at exactly ₹150 passes a ₹150 budget.
- ₹130 case: budget set to 130 → D02 becomes `["OVER_BUDGET"]`, D01 still compatible.
- Multiple allergen matches: a resident with 2+ allergens matching 2+ tags on one dish → all listed, in dish-tag order.
- Reason ordering: resident-table order, DIET before ALLERGEN per resident, `OVER_BUDGET` always last and appears exactly once.
- Source ordering: compatible list and exclusion list both follow dish table order, never sorted by price/name.
- No hard-coded outputs: confirm nothing in `logic.js` references D01–D05, Asha/Dev/Mira, or literal oracle strings by name — the oracle must fall out of the general rules.

---

### Checkpoint 3 — Search & Result State

**Build:**
- `searchCompatible(compatibleDishes, query)` — trim query; empty query returns the list unchanged; otherwise case-insensitive substring match against cafe name, dish name, or any ingredient tag. Operates **only** on the already-computed compatible list, never on excluded dishes.
- Establish and keep separate two pieces of result state:
  - **all compatible results** — the full output of `evaluateAll` (source of the compatible count, immutable by search).
  - **currently displayed results** — `searchCompatible(allCompatible, searchQuery)`, what actually renders in the result area.

**Files/functions:** `logic.js` — `searchCompatible(list, query)`. State/render split lives at the boundary between `logic.js` (produces `allCompatible` + count) and `ui.js` (derives `displayedResults` for rendering; the stored count is never recomputed from the displayed list).

**Verify before continuing:**
- Query `wheat` on the oracle result → displayed narrows to `[D02]`.
- Compatible count stays `2` throughout (read from `allCompatible`, not from the filtered list's length).
- Clearing the query → both D01 and D02 reappear.
- Whitespace-only query behaves like empty query.
- A query matching only a cafe name, and one matching only an ingredient tag with different case, both narrow correctly.

---

### Checkpoint 4 — UI, Editing, Evaluate & Reset

**Build:**
- `index.html` — resident table (editable inline or via one focused row-edit form), dish table (same), budget input, Evaluate button, search box, Reset/Sample control, result area (compatible list + exclusion list), compatible-count summary, validation-error banner.
- `styles.css` — light layout/styling for the above.
- `ui.js` wiring the data flow:

  ```
  UI input
     ↓
  state
     ↓
  validation
     ↓
  evaluation
     ↓
  render
  ```

  - Editing a table field updates in-memory state only — it must not silently re-run compatibility (only the explicit Evaluate action computes/refreshes results, per §4.9 and §5).
  - `onEvaluateClick()` → `validateState(state)`; on failure, render the validation error (table/row/field) via `renderValidationError` and clear any prior compatible/exclusion rows and count (`clearResults()`) — no stale results next to a fresh error (§4.8). On success, run `evaluateAll(state)`, store `allCompatible`/`exclusions`/`compatibleCount`, and render via `renderResult` (applying the current search query to derive `displayedResults`, per Checkpoint 3).
  - `onSearchInput()` → recompute `displayedResults` from the stored `allCompatible` + new query and re-render only the displayed list; count and exclusions untouched.
  - `onResetClick()` → restore `createDefaultState()`, clear search query, clear validation banner, clear any stored result — but do **not** call `evaluateAll` (§4.9); result area stays empty until Evaluate is clicked again, and the screen must show no leftover error/disabled state.

**Files/functions:** `ui.js` — `onEvaluateClick()`, `onSearchInput()`, `onResetClick()`, `renderResult(allCompatible, exclusions, count, query)`, `renderValidationError(error)`, `clearResults()`.

**Verify the acceptance criteria (§6) before continuing:**
1. Load app → Evaluate → D01, D02, count 2.
2. Exclusion reason text for D03/D04/D05 matches §3.3 verbatim; ₹150 boundary confirmed (D02 passes ₹150 budget).
3. Search `wheat` → narrows to D02, count stays 2; clearing restores both.
4. Budget → 130, re-Evaluate → only D01 compatible, D02 shows `OVER_BUDGET`.
5. D01 price → 0, re-Evaluate → `INVALID_INPUT` naming D01/price row/field; all result rows and count cleared.
6. Reset after the invalid-price case → built-in rows/₹150/empty search restored, no stale error, result area stays empty (no auto-evaluate) until Evaluate is clicked again; screen stays in sync.

---

### Checkpoint 5 — Full Test Pass & Final Polish

**Run the complete mandatory checklist (§6):**
1. Built-in result (oracle match: D01, D02, count 2).
2. Search (`wheat` → D02 only, count unchanged; clear restores both).
3. Budget boundary (₹150 passes; ₹130 excludes D02).
4. Invalid price (0/negative/non-integer → `INVALID_INPUT`, full clear).
5. Reset (clean built-in state, no auto-evaluate).

**Then regression-test additional edge cases:** multiple simultaneous allergen matches on one dish; a resident with multiple allergens; an empty dish list; an all-residents-incompatible dish; a dish tag/allergen differing only in case/whitespace (normalization); `DUPLICATE_DISH_ID` case distinct from generic `INVALID_INPUT`.

**Only after all required functionality passes — optional (§6 row 7):**
- Add compact "evidence chips" per dish (diet/allergen/budget pass-fail), purely rendering `evaluateDish`'s existing output — must not alter the contracted reasons/count or introduce new logic paths in `logic.js`.

**Final review against P02_SPEC.md:** re-read §4 and §6 line by line against the running app; confirm no `logic.js` function references specific dish IDs, resident names, or literal oracle strings (rules remain general); confirm §2.2 out-of-scope items were not accidentally added (no catalog browsing, no persistence, no network calls).
