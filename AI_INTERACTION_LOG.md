# AI Interaction Log — P02

## Iteration 1 — Implementation Planning

### Goal

Create a practical implementation plan for the Hostel Food Compatibility Board based on `P02_SPEC.md`.

### AI Contribution

Claude proposed a checkpoint-based implementation plan using a plain JavaScript browser architecture:

* `logic.js` for data, validation, and compatibility logic
* `ui.js` for rendering and event handling
* `index.html` for structure
* `styles.css` for presentation

The plan divided implementation into five checkpoints:

1. Data model, normalization, and validation
2. Core compatibility engine
3. Search and result state
4. UI, editing, evaluation, and reset
5. Full testing and final polish

### Human Evaluation

I reviewed the proposed architecture and implementation sequence against the project requirements. I accepted the simple JavaScript architecture and the separation of business logic from UI.

I specifically changed/refined the plan to:

* Prioritize mandatory testing over optional evidence chips
* Clarify validation requirements
* Keep the complete compatible result set separate from filtered search results so the count cannot change with search
* Require verification after each checkpoint before proceeding
* Keep the implementation incremental and avoid unnecessary features or dependencies

### Decision

Accepted the revised five-checkpoint implementation plan. The plan became the working implementation roadmap for the project.

---

## Iteration 2 — Checkpoint 1 Implementation

### Goal

Implement the data model, normalization, and validation layer defined in Checkpoint 1.

### AI Contribution

Claude implemented `logic.js` according to the approved implementation plan.

The implementation included:

* `createDefaultState()`
* `normalize()`
* `validateState()`
* Built-in resident and dish data
* Validation for required fields
* Duplicate dish ID detection
* Diet-class validation
* Positive whole-rupee validation for prices and budget
* Structured validation errors containing the relevant table, row, and field

Claude also created and ran 14 validation tests.

### Verification

All 14 tests passed.

The tests covered:

* Built-in state validity
* Duplicate dish IDs
* Zero, negative, and non-integer prices
* Zero, negative, and non-integer budgets
* Invalid `NO_RESTRICTION` dish diet
* Whitespace/lowercase normalization
* Empty resident names
* Empty ingredient tags

I reviewed the implementation and test coverage against `P02_SPEC.md`, including the validation rules, normalization behavior, error structure, and separation of business logic from the UI.

### AI Assumptions Identified

Claude identified several implementation assumptions:

* Dish IDs are trimmed but not uppercased because the specification only explicitly normalizes diet classes, ingredient tags, and allergen tags.
* Validation stops at the first error rather than collecting all errors.
* Allergen tags are validated as non-empty strings but are not restricted to a fixed vocabulary.
* Budget validation errors use `row: null` because the budget is not part of a table row.

These assumptions were reviewed and considered acceptable for the current checkpoint.

### Decision

Accepted Checkpoint 1 with no code changes required.

Additional robustness cases, such as empty resident/dish collections and unexpected non-string values, were identified but deferred to the final regression-testing stage because they were not required by the current checkpoint.

## Iteration 3 — Checkpoint 2 Implementation

### Goal

Implement the core compatibility engine according to the rules and ordering requirements in `P02_SPEC.md`.

### AI Contribution

Claude implemented five functions in `logic.js`:

* `checkDiet()`
* `checkAllergens()`
* `checkBudget()`
* `evaluateDish()`
* `evaluateAll()`

The implementation preserves resident-table order, evaluates diet and allergen checks independently, preserves ingredient-tag order for allergen reasons, places `OVER_BUDGET` last, and preserves dish source order.

### Verification

Claude ran 14 focused tests covering:

* Built-in oracle results
* ₹150 inclusive budget boundary
* ₹130 budget behavior
* Multiple allergen matches and ingredient-tag ordering
* Resident/reason ordering
* Diet-failure and allergen-check independence
* `OVER_BUDGET` ordering
* Source-order preservation

All 14 tests passed.

I reviewed the implementation summary and confirmed that the compatibility engine remains general rather than hard-coded to the built-in oracle.

### Assumptions

Claude added defensive validation inside `checkBudget()` and normalization inside the compatibility functions so they can be tested independently. These do not change the specified behavior for valid state.

### Decision

Accepted Checkpoint 2 with no code changes required.

Additional edge cases and integration with `validateState()` remain deferred to the later regression/integration stages specified in the implementation plan.

## Iteration 4 — Checkpoint 3 Implementation

### Goal

Implement the search functionality while ensuring that search only filters the already-computed compatible dishes and does not alter the true compatible count.

### AI Contribution

Claude implemented `searchCompatible()` in `logic.js`.

The function:

* Trims the search query
* Treats empty and whitespace-only queries as showing all compatible dishes
* Performs case-insensitive substring matching
* Searches cafe names, dish names, and ingredient tags
* Preserves source order
* Operates only on the compatible-dish list

No changes to `evaluateAll()` were required because the existing result structure already separates the compatible list from the compatible count.

### Verification

Claude ran 19 tests covering:

* Built-in oracle behavior
* Search narrowing
* Count remaining unchanged after filtering
* Clearing the search
* Whitespace-only queries
* Case-insensitive matching
* Cafe-name matching
* Ingredient-tag matching
* Excluded-dish protection
* Result-order preservation
* Generality using a synthetic dataset

All 19 tests passed.

### Human Evaluation

I reviewed the implementation and confirmed that `searchCompatible()` receives only the compatible-dish list, making excluded dishes unavailable to the search function. I also confirmed that the compatible count remains derived from the complete compatible result rather than the filtered display list.

### Decision

Accepted Checkpoint 3 with no code changes required.

UI integration and additional zero-result regression cases remain deferred to the later checkpoints as planned.

## Iteration 5 — Checkpoint 4: UI Integration

### Goal:  
Connect the tested compatibility engine to a browser UI while preserving the separation between business logic and presentation.

### AI contribution:
Claude was asked to implement only Checkpoint 4 from `IMPLEMENTATION_PLAN.md`, using the existing `logic.js` implementation without changing the previously tested business logic.

Claude created:
- `index.html`
- `styles.css`
- `ui.js`

The UI supports editable resident/dish tables, budget input, search, Evaluate, Reset, validation feedback, compatible results, exclusion reasons, and compatible count.

### Key design decision:  
The UI maintains a clear distinction between the complete compatibility result and the searched/displayed results:

- `lastResult.compatible` represents the complete compatible set and is the source of the compatible count.
- `searchCompatible()` is applied only when determining which compatible dishes are displayed.

Therefore, searching can narrow the displayed results without changing the compatibility count.

### My evaluation:
I reviewed the implementation against the specification and checked that:

- validation is performed before compatibility evaluation;
- failed validation clears previous results and counts;
- business rules are not duplicated inside `ui.js`;
- diet, allergen, budget, and search decisions remain in `logic.js`;
- exclusion reasons are rendered from the logic layer rather than reconstructed by the UI;
- search operates only on compatible dishes;
- search does not modify the underlying compatible count;
- Reset restores the built-in state and clears previous results without automatically evaluating;
- edited UI values are used when Evaluate is clicked;
- no hard-coded built-in compatibility results were introduced.

### Verification:
Claude re-ran the Checkpoint 1–3 logic checks and confirmed that the existing behavior remained unchanged.

It also performed browser-level verification using Playwright with 26 automated checks. These covered:

- initial empty state;
- built-in evaluation producing D01/D02 with count 2;
- exact exclusion reasons;
- `wheat` search narrowing the display while keeping count at 2;
- clearing search;
- preventing excluded dishes from appearing in search results;
- adding/editing data and recalculating results;
- invalid price validation and clearing stale results;
- Reset behavior;
- edited budget values being used during evaluation;
- absence of browser console errors.

### Result: 
All 26/26 browser checks passed, and the existing logic tests continued to pass.

### Assumptions / decisions:
- Diet fields remain free-text inputs rather than UI dropdowns so that the valid-diet enum does not have to be duplicated in the UI.
- Comma-separated allergen/tag fields are passed through to the existing validation logic rather than being silently sanitized by the UI.
- Optional Add Resident/Add Dish and Remove controls were included because the tables are required to be editable and these controls do not introduce additional business rules.
- The validation error display format is a UI presentation choice; the required table, row, field, and error code information is preserved.

### Unverified:
- Mobile/small-viewport layout has not yet been visually tested.
- Duplicate dish IDs and non-integer prices have been tested in the logic layer but not through the browser UI end-to-end.

### Decision:
Accepted Checkpoint 4 without code changes. The implementation remained within scope, preserved the existing architecture, and passed the browser verification suite. The remaining unverified cases are low-risk because the underlying validation logic is already covered by the earlier checkpoint tests.

## Iteration 6 — Checkpoint 5: Final Testing, Verification & Bug Fix

### Goal

Perform a final acceptance-focused verification of the whole application against `P02_SPEC.md` and fix only genuine issues discovered during testing, without adding features or unnecessary polish.

### AI Contribution

Claude reviewed `logic.js`, `ui.js`, `index.html`, and `styles.css` against every rule in `P02_SPEC.md`, then ran a full acceptance test pass through the actual browser UI, plus a regression re-run of the Checkpoints 1–3 logic tests.

### Specification Review

I asked Claude to check the implementation against the specification's rules for data/model behavior, validation, diet compatibility, allergen compatibility, budget handling, exclusion-reason ordering, source ordering, search behavior, compatible-count behavior, reset behavior, editable state, stale-result clearing, and UI scope. Claude reported that all specification rules matched, with one exception, and I reviewed that finding rather than accepting it at face value.

### Bug Discovered

Claude identified a defect in `ui.js`'s `parseCsvField(value)` function, which was originally implemented as `value.split(',')`. For an empty string, JavaScript's `split` returns `['']` rather than `[]`. As a result, completely clearing a resident's allergen field or a dish's ingredient-tag field in the UI produced an array containing one empty string, which `validateState()` in `logic.js` correctly rejected as `INVALID_INPUT` — even though clearing the field was meant to represent "no allergens" or "no tags," a valid state.

### My Evaluation

I reviewed this finding and determined it was a genuine UI integration defect rather than a preference-based change: it caused valid input to be misreported as invalid, and it was located specifically in `ui.js`'s field-parsing logic rather than in any compatibility or validation rule. I decided the fix belonged in the UI parsing layer only, since `validateState()` in `logic.js` was already behaving correctly given the malformed array it was handed — `logic.js` did not need to change.

### Fix Made

Claude applied the fix directly in `ui.js`:

```js
function parseCsvField(value) {
  if (value.trim() === '') return [];
  return value.split(',');
}
```

I agreed this was the correct minimal fix: an entirely blank field now maps to an empty list (no allergens/tags), while a genuinely malformed list such as `PEANUT,,MILK` still splits with an empty interior entry and is still correctly rejected by the existing validation logic in `logic.js`. No validation rule was weakened or duplicated to fix this.

### Verification

Claude re-ran the full test suite after the fix:

* Browser verification: 44/44 checks passed, covering built-in results, exact exclusion reasons and their required ordering, search behavior (including case-insensitivity, whitespace handling, and protection of excluded dishes from search), budget changes, invalid price, non-integer price, duplicate dish ID, empty required fields, stale-result clearing, editable state, reset behavior, reason recalculation, result ordering, and UI/state synchronization.
* Logic regression for Checkpoints 1–3: 34/34 passed, confirming `logic.js` itself was unaffected.
* Zero browser console errors were observed.
* Both desktop and 375px mobile viewport verification passed.

I reviewed these results and confirmed the fix resolved the defect without breaking any previously passing behavior.

### UI/Polish Decision

Claude reported that mobile-viewport tables scroll horizontally, but that all columns and controls remained reachable and usable at that width. I agreed this did not constitute a defect and decided against adding any CSS or layout changes purely for cosmetic polish, consistent with the instruction to change only what a genuine issue required.

### Remaining Unverified

The following were identified as not covered by this checkpoint's testing, and I agreed they were acceptable to leave unverified because the specification does not require them:

* keyboard-only navigation and screen-reader labeling;
* behavior under very large datasets;
* browsers other than Chromium.

### Decision

I accepted Checkpoint 5 after the bug fix and full regression testing. This checkpoint demonstrated that the AI-generated implementation was tested rather than blindly accepted: a real defect was identified, I evaluated it as genuine, the fix was made at the correct layer (`ui.js`, not `logic.js`) with a minimal change, and the fix was regression-tested before being accepted.