# Hostel Food Compatibility Board

## Overview / Problem

Given a fixed group of hostel residents (each with a diet type and allergens)
and a small set of dishes from nearby campus cafes, this tool determines which
dishes the **entire group** can safely and affordably eat, and explains
exactly why the rest are excluded.

It is a local, in-memory compatibility calculator, not a persistent or live
service — it evaluates the current on-screen records only when the user
explicitly triggers the compatibility action.

## Features

- **Resident/group editing** — an editable table of residents (name, diet,
  allergens), with the ability to add or remove residents.
- **Dish editing** — an editable table of dishes (ID, cafe, dish name, diet
  class, ingredient tags, price), with the ability to add or remove dishes.
- **Compatibility evaluation** — a single "Evaluate compatibility" action
  computes which dishes work for the whole group, on demand.
- **Diet/allergen/budget rules** — a dish must pass diet compatibility and
  allergen safety for every resident, and must be within the group's
  per-person budget, to be considered compatible.
- **Compatibility reasons** — every excluded dish is shown with the exact,
  ordered reasons it failed (diet, allergen, or budget).
- **Focused search** — a search box narrows the *displayed* compatible dishes
  by cafe name, dish name, or ingredient tag; it never affects the underlying
  compatible count and never searches excluded dishes.
- **Validation and error handling** — invalid or duplicate input is reported
  with the specific table, row, and field affected, and clears any stale
  results.
- **Reset/sample data** — restores the built-in group, dishes, and budget,
  and clears search and results, without automatically re-evaluating.

## Tech Stack

- Plain **HTML**, **CSS**, and **JavaScript** — no frameworks, build tools, or
  package manager dependencies.
- The application is **static and in-memory**: all data lives in a JavaScript
  object for the lifetime of the browser tab. There is no backend, database,
  authentication, or network requests.

## How to Run

No build step or server is required. Open `index.html` directly in a web
browser (double-click the file, or use your browser's "Open File" option).

## How to Use

1. Review or edit the residents and dishes in their respective tables (or use
   the built-in sample data as-is).
2. Set the per-person budget if you want to change it from the default.
3. Click **Evaluate compatibility** to compute which dishes work for the
   whole group.
4. Inspect the **Result** area: compatible dishes are listed with a total
   count, and excluded dishes are listed with their exact exclusion reasons.
5. Use the **search box** to narrow the displayed compatible dishes by cafe,
   dish name, or ingredient tag. Clearing the search box restores the full
   compatible list; the compatible count never changes because of search.
6. Click **Reset to sample** at any point to restore the built-in group,
   dishes, and budget, and clear the search box and any results. Reset does
   not automatically re-evaluate — click Evaluate again to see results.

## Built-in Sample Data

**Group** (per-person budget: ₹150):

| Resident | Diet | Allergens |
|---|---|---|
| Asha | VEGAN | none |
| Dev | VEGETARIAN | PEANUT |
| Mira | NO_RESTRICTION | MILK |

**Dishes** (source order):

| ID | Cafe | Dish | Diet class | Tags | Price |
|---|---|---|---|---|---|
| D01 | Hostel Cafe | Lentil Rice Bowl | VEGAN | LENTIL, RICE, SPINACH | ₹110 |
| D02 | Library Cafe | Tomato Pasta | VEGAN | WHEAT, TOMATO | ₹150 |
| D03 | Hostel Cafe | Paneer Wrap | VEGETARIAN | MILK, WHEAT | ₹140 |
| D04 | East Cafe | Peanut Noodles | VEGAN | PEANUT, WHEAT | ₹130 |
| D05 | Library Cafe | Egg Sandwich | NON_VEGETARIAN | EGG, WHEAT | ₹100 |

**Expected result on evaluation:** D01 and D02 are compatible (count 2). D03
fails for Asha's diet and Mira's milk allergen; D04 fails for Dev's peanut
allergen; D05 fails for both Asha's and Dev's diets.

## Compatibility Rules

- **Diet:** a `VEGAN` resident accepts only `VEGAN` dishes; a `VEGETARIAN`
  resident accepts `VEGAN` or `VEGETARIAN` dishes; a `NO_RESTRICTION`
  resident accepts any dish class. (`NO_RESTRICTION` is a valid resident diet
  only — never a valid dish diet class.)
- **Allergen:** a dish fails for a resident when any of its normalized
  ingredient tags exactly matches one of that resident's allergen tags.
  Ingredient tags are authoritative — nothing is inferred beyond what is
  listed (no aliases, no cross-contamination assumptions).
- **Budget:** the budget is a single per-person, per-serving limit (never
  multiplied by group size). A dish passes when its price is a positive
  whole rupee value that is less than or equal to the budget — the boundary
  is inclusive, so a dish priced exactly at the budget still passes.
- **Overall:** a dish is compatible only if it passes diet and allergen
  checks for every resident, and passes the budget check. Compatible and
  excluded dishes are always presented in their original source order.
  Exclusion reasons for a dish are ordered by resident-table order, with each
  resident's `DIET:` reason before their `ALLERGEN:` reason(s), followed by
  `OVER_BUDGET` last if applicable.

## Validation

Before evaluation, all resident and dish data is validated:

- Resident names, dish IDs, cafe names, dish names, and ingredient tags must
  be non-empty after trimming.
- Dish IDs must be unique.
- The budget and every dish price must be positive whole rupee values.

Two error codes are used:

- **`INVALID_INPUT`** — a required field is missing, malformed, or an
  invalid diet value; reported with the specific table, row, and field.
- **`DUPLICATE_DISH_ID`** — two dishes share the same ID.

Either error clears any previously computed compatible/excluded results and
the compatible count — invalid data is never evaluated as if it were valid.

## Testing

Testing combined logic-level checks (run directly against the business rules
in Node) and browser-level acceptance checks (run against the live page).

- **Logic regression: 34/34 passed** (validation, diet/allergen/budget rules,
  reason ordering, source ordering, and search behavior, re-verified after
  the bug fix below).
- **Browser acceptance: 44/44 passed** — covering the built-in result and
  exact exclusion reasons, search behavior (including case-insensitivity,
  whitespace handling, and excluded-dish protection), the budget boundary,
  validation for invalid price, non-integer price, duplicate IDs, and empty
  fields, editable-state correctness, reset behavior, exclusion-reason
  recalculation, source/reason ordering, and search/count independence.
- **Console errors: 0** observed during browser testing.
- **Responsive/mobile verification: passed** at a 375px viewport — no
  page-level horizontal overflow, and all controls and table columns remain
  reachable and usable (tables scroll horizontally as needed).

A genuine bug was found during final testing: clearing a resident's allergen
field or a dish's tag field entirely produced an internal empty entry that
incorrectly failed validation, because `''.split(',')` returns `['']` rather
than `[]`. This was fixed in the UI's input-parsing code (not in the
compatibility/validation rules) and was confirmed via regression testing
afterward. See `TEST_EVIDENCE.md` for full details.

**Not verified** in this round of testing: keyboard-only navigation,
screen-reader labeling, behavior with very large datasets, and browsers other
than the one used for automated testing. These are stated as untested scope,
not known defects.

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | Page structure: editable tables, budget/search inputs, Evaluate/Reset controls, and the result area. |
| `styles.css` | Visual presentation only (layout, spacing, colors); contains no logic. |
| `logic.js` | Business rules: default data, normalization, validation, the compatibility engine, and search — no DOM dependency, testable independently. |
| `ui.js` | DOM/state layer: wires inputs and buttons to the in-memory state and renders whatever `logic.js` returns; contains no compatibility, validation, or search rules of its own. |
| `P02_SPEC.md` | The source specification this project was built against. |
| `IMPLEMENTATION_PLAN.md` | The checkpoint-based implementation plan. |
| `DESIGN_SUMMARY.md` | Explanation of the final architecture and engineering decisions. |
| `TEST_EVIDENCE.md` | Detailed test results and evidence. |
| `AI_INTERACTION_LOG.md` | Log of AI-assisted development iterations and human review decisions. |

## Scope and Limitations

This project intentionally does **not** include:

- Persistence — nothing is saved between page loads.
- Accounts, authentication, or user sessions.
- A backend, database, or any network/external API calls (no external menu
  source, no file upload).
- Ordering, payment, or checkout functionality.
- A generic menu catalog or standalone browsing feature — search only
  narrows an already-computed compatible result.
- Meal-planning, scheduling, or queue-management functionality.

## AI-Assisted Development

AI assistance (Claude) was used throughout planning, implementation,
testing/debugging, and documentation for this project, following an
incremental, checkpoint-based process. Each checkpoint's implementation and
test results were reviewed against `P02_SPEC.md`, with final design
decisions, verification, testing outcomes, and code acceptance remaining
human-reviewed at every stage — including the identification and evaluation
of a genuine bug during final testing and the decision on where to fix it.
See `AI_INTERACTION_LOG.md` for the detailed, iteration-by-iteration record.

## Future Improvements

- The optional "evidence chips" enhancement named in `P02_SPEC.md` §6
  (compact visual pass/fail indicators for diet/allergen/budget checks per
  dish) was scoped as optional and was not implemented.
- Accessibility improvements (keyboard navigation, screen-reader labeling)
  were identified in `TEST_EVIDENCE.md` as untested and could be addressed if
  the tool's scope were extended beyond the current specification.
