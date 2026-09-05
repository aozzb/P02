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
