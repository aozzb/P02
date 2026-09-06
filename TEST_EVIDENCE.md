# Test Evidence — P02: Hostel Food Compatibility Board

## 1. Test Strategy

Testing followed the specification directly: each rule in `P02_SPEC.md` was
turned into one or more checks, rather than testing being designed around the
implementation after the fact.

Two levels of testing were used, for different reasons:

- **Logic-level (unit) testing**, run against `logic.js` directly in Node,
  during Checkpoints 1–3. Because `logic.js` has no DOM dependency, its
  functions (`validateState`, `evaluateDish`, `evaluateAll`,
  `searchCompatible`, etc.) could be called directly with hand-built inputs
  and their return values checked against the exact rules and reason strings
  in the specification. This is the fastest and most precise way to verify
  business rules such as reason ordering or the budget boundary.
- **Browser-level (integration/acceptance) testing**, run against the actual
  `index.html` page in a real browser (headless Chromium, driven with
  Playwright) during Checkpoint 4 and again during Checkpoint 5. This is
  necessary because correct logic in `logic.js` does not guarantee correct
  wiring in `ui.js` — validation, evaluation, rendering, search, and reset all
  have to be triggered by the right events, on the right state, at the right
  time, and only a real page load and real clicks/typing can confirm that.

After the Checkpoint 5 bug fix in `ui.js` (Section 4), the Checkpoint 1–3
logic tests were re-run to confirm `logic.js` was unaffected, and the full
browser acceptance suite was re-run to confirm the fix resolved the defect
without breaking any previously passing behavior. Edge-case and validation
testing (whitespace, case sensitivity, malformed lists, boundary prices,
duplicate IDs) was included throughout rather than only testing the built-in
"happy path".

## 2. Logic-Level Test Evidence

### Original per-checkpoint results

| Checkpoint | Scope | Result |
|---|---|---|
| Checkpoint 1 | `createDefaultState`, `normalize`, `validateState` | **14/14 passed** |
| Checkpoint 2 | `checkDiet`, `checkAllergens`, `checkBudget`, `evaluateDish`, `evaluateAll` | **14/14 passed** |
| Checkpoint 3 | `searchCompatible` | **19/19 passed** |

Behaviors covered by these 47 original checks included:

- The built-in default state passing validation as-is (no false positives).
- Duplicate dish IDs correctly caught and reported with the offending
  table/row/field.
- Zero, negative, and non-integer prices and budgets all correctly rejected.
- `NO_RESTRICTION` correctly rejected as a dish diet class.
- Whitespace-padded and lowercase input correctly normalized rather than
  rejected.
- The built-in oracle result reproduced exactly: `D01`, `D02` compatible, in
  that order, count `2`; `D03` → `["DIET:Asha", "ALLERGEN:Mira:MILK"]`; `D04`
  → `["ALLERGEN:Dev:PEANUT"]`; `D05` → `["DIET:Asha", "DIET:Dev"]`.
- The ₹150 boundary (a dish priced exactly at the budget still passes) and
  the ₹130 case (D02 becomes `OVER_BUDGET`, D01 stays compatible).
- Multiple allergen matches on one dish all reported, in ingredient-tag order
  (not allergen-list order).
- Exclusion-reason ordering: resident-table order, `DIET:` before
  `ALLERGEN:` for the same resident, `OVER_BUDGET` always last.
- A failed diet check not skipping that same resident's allergen check.
- Compatible and excluded dish lists both preserving dish source order.
- Search narrowing to the correct dish by cafe name, dish name, or ingredient
  tag, case-insensitively.
- Search never being able to return an excluded dish (verified structurally,
  since `searchCompatible` only ever receives the compatible list).
- The compatible count remaining unchanged by search, read from the
  unfiltered result rather than the filtered/displayed list.

### Final regression result (post Checkpoint 5 bug fix)

After the `ui.js` fix described in Section 4, the logic layer was re-run to
confirm it was untouched and unaffected:

- Checkpoint 1 validation tests re-run: **14/14 passed**
- Checkpoint 2 compatibility tests re-run: **14/14 passed**
- Checkpoint 3 search behavior re-run (built-in oracle, case/whitespace
  search, count independence, clearing search, excluded-dish protection): 6
  checks, all passed

**Total: 34/34 logic regression tests passed.** This confirms `logic.js`
required no changes for the Checkpoint 5 bug fix and that its behavior is
unchanged from Checkpoints 1–3.

## 3. Browser-Level Acceptance Tests

The final Checkpoint 5 acceptance run drove the real `index.html` in headless
Chromium end-to-end. **44/44 checks passed.**

### A — Built-in compatibility and exclusion reasons

| Test | Expected | Actual | Status |
|---|---|---|---|
| Compatible dishes | D01, D02, in order | D01, D02, in order | PASS |
| Compatible count | 2 | 2 | PASS |
| Excluded dishes, in order | D03, D04, D05 | D03, D04, D05 | PASS |
| D03 reasons | `["DIET:Asha","ALLERGEN:Mira:MILK"]` | matched exactly | PASS |
| D04 reasons | `["ALLERGEN:Dev:PEANUT"]` | matched exactly | PASS |
| D05 reasons | `["DIET:Asha","DIET:Dev"]` | matched exactly | PASS |

### B — Search behavior

| Test | Expected | Actual | Status |
|---|---|---|---|
| Search `wheat` | Displayed narrows to D02 | D02 only | PASS |
| Count during search | Stays 2 | 2 | PASS |
| Clear search | D01 and D02 both return | D01, D02 | PASS |
| Case-insensitive + whitespace (`  WhEaT  `) | Still narrows to D02 | D02 only | PASS |
| Term unique to an excluded dish (`egg`) | No compatible matches | 0 matches | PASS |

### C — Budget behavior

| Test | Expected | Actual | Status |
|---|---|---|---|
| Budget set to ₹130 | Only D01 compatible | D01 only | PASS |
| D02 at ₹130 budget | `OVER_BUDGET` | `["OVER_BUDGET"]` | PASS |
| Compatible count | Updates to 1 | 1 | PASS |

### D — Validation behavior

| Test | Expected | Actual | Status |
|---|---|---|---|
| Price `0` | `INVALID_INPUT`, row/field named | shown, correct row/field | PASS |
| Price `0` | Prior results cleared | results and count cleared | PASS |
| Price `130.5` (non-integer) | `INVALID_INPUT` | shown | PASS |
| Price `130.5` | Prior results cleared | cleared | PASS |
| Duplicate dish ID | `DUPLICATE_DISH_ID` | shown | PASS |
| Duplicate dish ID | Prior results cleared | cleared | PASS |
| Empty required field (dish cafe) | `INVALID_INPUT`, field named | shown, field named | PASS |
| Empty required field | Prior results cleared | cleared | PASS |

### Bug-fix regression

| Test | Expected | Actual | Status |
|---|---|---|---|
| Clear a resident's allergen field entirely | Treated as "no allergens", not an error | no validation error shown | PASS |
| Dish previously blocked only by that allergen (D04) | Becomes compatible | D04 compatible | PASS |

### E — Editable state

| Test | Expected | Actual | Status |
|---|---|---|---|
| Edit D01's price, evaluate | Edited value used, not stale state | new price used | PASS |
| Tighten budget below new edited price | D01 becomes `OVER_BUDGET` | `["OVER_BUDGET"]` | PASS |

### F — Reset behavior

| Test | Expected | Actual | Status |
|---|---|---|---|
| Pre-reset (after invalid edit) | Validation banner visible | visible | PASS |
| Budget after Reset | Restored to 150 | 150 | PASS |
| Search after Reset | Cleared | empty | PASS |
| D01 price after Reset | Restored to 110 | 110 | PASS |
| Validation banner after Reset | Cleared | cleared | PASS |
| Result area after Reset | Empty placeholder shown | shown | PASS |
| Reset behavior | Does not auto-evaluate | still empty after a delay | PASS |

### G — Reason recalculation

| Test | Expected | Actual | Status |
|---|---|---|---|
| Baseline D05 reasons | `["DIET:Asha","DIET:Dev"]` | matched | PASS |
| Relax Asha's diet to `NO_RESTRICTION`, re-evaluate | D05 reasons recalculate to `["DIET:Dev"]` only | matched | PASS |

### H — Ordering

| Test | Expected | Actual | Status |
|---|---|---|---|
| Compatible dish order | Source order (D01 before D02) | preserved | PASS |
| Excluded dish order | Source order (D03, D04, D05) | preserved | PASS |
| D03 reason order | `DIET:` before `ALLERGEN:` | `["DIET:Asha","ALLERGEN:Mira:MILK"]` | PASS |

### I — Search/count interaction

| Test | Expected | Actual | Status |
|---|---|---|---|
| Search `library` | Narrows to D02 only | D02 only | PASS |
| Compatible count during search | Unaffected, stays 2 | 2 | PASS |

### Responsive/mobile verification

| Test | Expected | Actual | Status |
|---|---|---|---|
| 375px viewport, page-level overflow | None | body scroll width within viewport | PASS |
| Evaluate button at 375px | Visible, usable | visible, non-zero size | PASS |
| Search input at 375px | Visible, usable | visible, non-zero size | PASS |
| Browser console errors (full flow) | 0 | 0 | PASS |

## 4. Checkpoint 5 Bug Verification

**Bug:** `ui.js`'s `parseCsvField(value)` originally read:

```js
function parseCsvField(value) {
  return value.split(',');
}
```

`''.split(',')` returns `['']` in JavaScript — a one-element array containing
an empty string — rather than `[]`. As a result, completely clearing a
resident's allergen field, or a dish's ingredient-tag field, in the UI did not
produce an empty list; it produced a list containing one empty string.
`validateState()` in `logic.js` correctly rejects any tag/allergen entry that
is empty after trimming, so it reported this as `INVALID_INPUT` — even though
the user's intent (no allergens / no tags) was a perfectly valid state.

**Why this was a UI-layer issue:** `validateState()` behaved correctly given
the array it was handed; the defect was in how `ui.js` converted the text
box's raw string into that array before it ever reached `logic.js`. No change
to any validation, diet, allergen, or budget rule in `logic.js` was needed or
made.

**Fix applied (`ui.js`):**

```js
function parseCsvField(value) {
  if (value.trim() === '') return [];
  return value.split(',');
}
```

**Regression testing performed after the fix:**

- Browser check confirmed that clearing a resident's allergen field no longer
  shows a validation error, and that a dish previously excluded only by that
  allergen (D04, blocked by `ALLERGEN:Dev:PEANUT`) becomes compatible once
  Dev's allergen field is cleared — see the "Bug-fix regression" table in
  Section 3.
- Malformed input was explicitly re-checked to make sure the fix did not
  weaken validation: a value such as `PEANUT,,MILK` still splits into an
  array containing an interior empty string, which `validateState()` still
  correctly rejects as `INVALID_INPUT`, since the fix only special-cases a
  fully blank field, not a field with empty entries between commas.
- The full Checkpoint 1–3 logic regression (34/34) and the full browser
  acceptance suite (44/44) were both re-run after the fix, with all checks
  passing.

## 5. Mandatory Specification Test Checklist

This mirrors the "mandatory focused test checklist" named in `P02_SPEC.md`
§6.

| Scenario | Expected | Actual Result | Status |
|---|---|---|---|
| Built-in default compatibility result | D01, D02 compatible in order, count 2 | D01, D02, count 2 | PASS |
| Search `wheat` | Narrows displayed result to D02, count stays 2 | D02 only, count 2 | PASS |
| Budget ₹130 | Only D01 compatible, D02 → `OVER_BUDGET` | D01 only, D02 `OVER_BUDGET` | PASS |
| Invalid price `0` | `INVALID_INPUT`, all results/counts cleared | shown, cleared | PASS |
| Reset | Built-in state restored, no stale error/result, no auto-evaluate | restored, empty result area | PASS |

## 6. Edge Cases Covered

The following edge cases were exercised in the logic-level and/or
browser-level tests documented above:

- Whitespace-only and whitespace-padded search queries (treated as empty /
  still matching correctly).
- Case-insensitive search matching (`WhEaT`).
- A completely empty allergen/tag field being treated as "no allergens" /
  "no tags" rather than an error (post bug fix).
- A malformed comma-separated list (`PEANUT,,MILK`-style empty interior
  entry) still being rejected by validation.
- Duplicate dish IDs.
- Empty required fields (dish cafe name tested directly in the browser suite;
  empty resident name and empty ingredient tag tested at the logic level).
- Invalid diet values (`NO_RESTRICTION` rejected as a dish diet class, at the
  logic level).
- Non-integer prices (`130.5`).
- The ₹150 inclusive budget boundary and the ₹130 exclusion case.
- Excluded dishes never appearing through search, including when the search
  term matches only an excluded dish (`egg`).
- Stale results being cleared after an invalid-input error, rather than
  remaining visible alongside the error.
- Edited data (price, budget) being used on the next Evaluate rather than
  stale prior values.
- Reset correctly restoring defaults after both field mutations and a
  validation error, without automatically re-evaluating.
- Exclusion-reason ordering (resident-table order, diet before allergen,
  `OVER_BUDGET` last) under both the built-in data and a forced multi-resident
  scenario at the logic level.

## 7. Responsive / UI Verification

A 375px-wide mobile viewport was tested against the live page:

- No page-level horizontal overflow was observed (the page body's scroll
  width stayed within the viewport width).
- The resident and dish tables scroll horizontally within their own
  containers when their columns do not fit the narrow viewport, rather than
  breaking the page layout.
- Key controls (the Evaluate button, the search input) remained visible and
  usable at this width, and the data-table columns (including the price
  input and remove button, reached by scrolling the table) remained
  reachable.
- Zero browser console errors were observed during this pass.

The following were **not verified** during this checkpoint, because the
specification does not require them — this is a statement of untested scope,
not a known defect:

- Keyboard-only navigation.
- Screen-reader labeling/accessibility semantics.
- Behavior with very large resident or dish datasets.
- Browsers other than the Chromium engine used for automated testing.

## 8. Test Summary

- Logic regression: **34/34 passed**
- Browser acceptance: **44/44 passed**
- Console errors: **0**
- Responsive/mobile verification: **passed**
- Genuine bug found: **1** (`parseCsvField` empty-string handling in `ui.js`)
- Bug fixed and regression-tested: **yes**

The tested implementation satisfied the mandatory acceptance scenarios and
core contract rules in `P02_SPEC.md`, including the built-in oracle result,
search narrowing without affecting the compatible count, the budget boundary,
invalid-input handling, and reset behavior. This does not constitute a claim
that the application is exhaustively tested or free of all possible defects —
Section 7 lists specific areas that remain outside the scope of what was
verified.
