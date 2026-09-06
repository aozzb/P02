# Design Summary — P02: Hostel Food Compatibility Board

## 1. Overview

The Hostel Food Compatibility Board is a small browser-based tool that answers one
question: given a fixed group of hostel residents (each with a diet type and
allergens) and a short list of dishes from nearby cafes, which dishes can the
*entire* group safely and affordably eat, and exactly why are the rest excluded?

The solution is a static, in-memory HTML/CSS/JavaScript application with no
build step, no framework, and no server. Business rules (diet, allergen, budget,
search) live in a small set of pure functions, completely separate from the code
that renders the page and reacts to clicks and keystrokes. This split let the
compatibility rules be written and tested checkpoint-by-checkpoint before any UI
existed, and let the UI be verified afterward without re-testing the rules
themselves.

## 2. Architecture

The application is four plain files, each with one responsibility:

- **`index.html`** — the page structure: the editable resident table, the
  editable dish table, the budget input, the search box, the Evaluate and Reset
  buttons, the validation banner, and the result area (compatible list +
  excluded list + compatible-count badge). It loads `logic.js` before `ui.js` as
  plain `<script>` tags, so `logic.js`'s functions are available as globals to
  `ui.js`.
- **`styles.css`** — visual presentation only: layout, spacing, colors for
  compatible vs. excluded dishes, and a small responsive rule so the two data
  tables scroll horizontally on narrow screens instead of breaking the page
  layout. It contains no logic.
- **`ui.js`** — the DOM/state layer. It holds the current in-memory `state`
  object, wires table inputs to that state, wires the Evaluate/Reset/Search
  controls, and renders whatever `logic.js` returns. It does not decide whether
  a dish is compatible, does not compute exclusion reasons, and does not decide
  what matches a search query — it only calls into `logic.js` and displays the
  result.
- **`logic.js`** — the business-rule layer. It has no reference to the DOM
  (`document`, `window`, etc.) at all, so it can be loaded and exercised directly
  in a plain Node.js process. It owns the default data, normalization, input
  validation, the compatibility engine, and search filtering.

This separation is what let each rule (diet, allergen, budget, search,
validation) be written and verified against `P02_SPEC.md` in isolation, in
Checkpoints 1–3, before any HTML existed — and it is also what §2.3 of the
specification explicitly asks for ("separate business logic from UI rendering
so the compatibility rules can be tested independently").

## 3. Data Model

The entire application operates on one in-memory `state` object:

```js
{
  residents: [ { name, diet, allergens: [...] }, ... ],
  dishes:    [ { id, cafe, name, dietClass, tags: [...], price }, ... ],
  budget,
  searchQuery,
}
```

- A **resident** has a `name`, a `diet` (one of `VEGAN`, `VEGETARIAN`,
  `NON_VEGETARIAN`, `NO_RESTRICTION`), and a list of `allergens` (ingredient
  tags they cannot have).
- A **dish** has an `id`, `cafe`, `name`, a `dietClass` (the same four values
  except `NO_RESTRICTION`, which is only valid for a resident, never a dish),
  a list of ingredient `tags`, and a `price`.
- **`budget`** is a single number shared by the whole group — the maximum
  price for one serving for one resident (not multiplied by group size).
- **`searchQuery`** is the current text in the search box.

`createDefaultState()` in `logic.js` seeds this object with the built-in group
(Asha, Dev, Mira) and the five built-in dishes (D01–D05) described in the
specification.

There is no persistent storage, database, or server: the state lives only in a
JavaScript variable for the lifetime of the browser tab. This matches the
specification's own framing of the tool as "a local, in-memory compatibility
calculator rather than a persistent/live service" — the whole point is to
evaluate the current on-screen records when the user asks for it, not to
remember anything between sessions.

## 4. Compatibility Logic

A dish is compatible only if it passes diet **and** allergen checks for every
resident, **and** passes the budget check. All of this is decided by
`logic.js`'s `evaluateDish()`/`evaluateAll()`, never by `ui.js`.

- **Diet compatibility** (`checkDiet`): a `VEGAN` resident only accepts a
  `VEGAN` dish; a `VEGETARIAN` resident accepts `VEGAN` or `VEGETARIAN` dishes;
  a `NO_RESTRICTION` resident accepts any dish class.
- **Allergen compatibility** (`checkAllergens`): a dish fails for a resident
  when any of the dish's normalized ingredient tags exactly equals one of that
  resident's normalized allergen tags. Matching is exact-string only — the
  ingredient tags are treated as authoritative, and nothing is inferred about
  hidden ingredients, aliases, or cross-contamination.
- **Budget compatibility** (`checkBudget`): a dish passes when its price is a
  positive whole rupee value that is less than or equal to the budget. The
  boundary is inclusive, so a dish priced exactly at the budget still passes.

For each dish, `evaluateDish()` walks the residents **in resident-table
order**. For each resident it checks diet and allergens independently (a
failed diet check does not skip that resident's allergen check), producing a
`DIET:<resident>` reason before any `ALLERGEN:<resident>:<tag>` reasons for
that same resident — and allergen reasons are emitted in the dish's own
ingredient-tag order, not the resident's allergen-list order. Once every
resident has been processed, `OVER_BUDGET` is appended last if the budget
check failed. A dish with no reasons is compatible.

`evaluateAll()` walks the dish list once, in the array's original order, and
never re-sorts it — compatible dishes and excluded dishes both come back in
the same order they appear in the dish table, matching the specification's
"preserve dish source order" requirement.

## 5. Validation and Error Handling

Before any compatibility evaluation runs, `validateState()` in `logic.js`
checks the whole state and returns either `{ ok: true }` or a structured
failure describing exactly what is wrong: `{ ok: false, code, table, row,
field }`.

Two error codes are used, matching the specification:

- **`INVALID_INPUT`** — a required field is missing or malformed: an empty
  (after trimming) resident name, dish id, cafe, dish name, or ingredient tag;
  an invalid diet class (including a dish incorrectly set to
  `NO_RESTRICTION`); or a price/budget that is not a positive whole number.
- **`DUPLICATE_DISH_ID`** — two dishes share the same id after trimming.

Both codes carry the same shape (`table`, `row`, `field`) so the UI can show
the user exactly where the problem is, and both trigger the same clearing
behavior in `ui.js`: any previously computed compatible list, excluded list,
and compatible count are wiped, and no evaluation is attempted on the invalid
data. Compatibility is only ever computed once `validateState()` reports
`{ ok: true }`.

## 6. Search and Result Handling

Search is implemented by `searchCompatible(compatibleDishes, query)` in
`logic.js`, and it is deliberately narrow in scope, per §2.2/§4.7 of the
specification:

- It is only ever called with the **already-computed compatible dish list** —
  it has no access to the excluded dishes, so an excluded dish can never
  appear in a search result no matter what is typed.
- Matching is case-insensitive substring matching against a dish's cafe name,
  dish name, or any of its ingredient tags.
- An empty (or whitespace-only, after trimming) query returns the compatible
  list unchanged, so clearing the search box restores every compatible dish.
- Searching never re-runs `evaluateAll()` — `ui.js` only re-filters the
  already-stored compatible list when the search box changes.
- The compatible count shown to the user always comes from the stored
  `evaluateAll()` result (`compatibleCount`), never from the length of the
  filtered/displayed list — so narrowing the display with a search term never
  changes the count.

## 7. UI and State Management

`ui.js` keeps two pieces of state: the editable `state` object described in
Section 3, and `lastResult` (the most recent successful `evaluateAll()`
output, or `null` if nothing has been evaluated yet).

- **Editing** a resident/dish/budget field updates `state` directly through an
  `input` event handler. This does not trigger any evaluation — it only
  changes what will be evaluated the next time Evaluate is clicked.
- **Evaluate** runs `validateState(state)` first.
  - If validation fails, the UI shows the error (table/row/field) and clears
    `lastResult`, hiding the result area and the compatible-count badge — no
    stale results are left on screen next to a fresh error.
  - If validation succeeds, `lastResult = evaluateAll(state)` is stored, and
    the result area is rendered from it: the compatible list (filtered through
    `searchCompatible` using the current search box value), the excluded list
    with each dish's reasons rendered verbatim from `logic.js`, and the
    compatible count.
- **Search** only re-renders the compatible list from the existing
  `lastResult`; it does not touch `lastResult` itself or re-evaluate anything.
- **Reset** replaces `state` with a fresh `createDefaultState()`, clears the
  search box and validation banner, and clears `lastResult` — but it does
  **not** call `evaluateAll()`. The result area stays on its empty placeholder
  until Evaluate is explicitly clicked again, matching the specification's
  requirement that Reset must not auto-evaluate.

## 8. AI Influence and Human Engineering Decisions

The project followed the checkpoint-based plan recorded in
`IMPLEMENTATION_PLAN.md` and `AI_INTERACTION_LOG.md`, and the log documents a
consistent pattern across all six iterations: Claude proposed and implemented
each checkpoint, and I reviewed, tested, and decided whether to accept it
before moving on.

- **Planning before implementation.** Before any code was written, Claude
  proposed a five-checkpoint plan. I reviewed it and made specific changes —
  prioritizing the mandatory test checklist over the optional evidence-chip
  feature, clarifying validation requirements, and requiring the complete
  compatible result to stay separate from the searched/displayed result so the
  count could never be affected by search — before accepting it as the working
  plan.
- **Incremental checkpoints.** Each checkpoint (data model and validation;
  compatibility engine; search; UI integration; final testing) was implemented
  by Claude and reviewed by me separately, rather than the whole application
  being built at once. This kept each review focused on one layer of behavior
  at a time.
- **Testing and verification at every stage.** Claude wrote and ran the tests
  for each checkpoint (14 validation tests, 14 compatibility-engine tests, 19
  search tests, 26 then 44 browser-level checks), and I reviewed the actual
  results and the implementation itself rather than accepting a summary at
  face value — for example, confirming that `searchCompatible()` structurally
  cannot see excluded dishes, and that the compatible count is read from the
  unfiltered result rather than the filtered display list.
- **The Checkpoint 5 `parseCsvField` bug.** During final testing, Claude
  identified that `ui.js`'s `parseCsvField(value)` used `value.split(',')`,
  which returns `['']` (a one-element array holding an empty string) rather
  than `[]` for a fully empty input. This meant clearing a resident's allergen
  field or a dish's tag field to represent "none" incorrectly produced a
  phantom empty entry, which `validateState()` correctly rejected — reporting
  a valid "no allergens" state as `INVALID_INPUT`. I evaluated this finding
  myself and confirmed it was a genuine defect rather than a stylistic
  preference, since it caused valid input to be misreported as invalid.
- **Why the fix belonged in `ui.js`, not `logic.js`.** I determined that
  `validateState()` in `logic.js` was behaving correctly given the malformed
  array it was handed — the defect was in how `ui.js` converted the text box's
  content into that array, not in the validation rule itself. I therefore
  decided the fix should be a small change to `parseCsvField()` (treating a
  fully blank field as an empty list, while still splitting a genuinely
  malformed value like `PEANUT,,MILK` so it is still caught by validation),
  and left `logic.js` untouched.
- **Declining unnecessary UI polish.** When Claude reported that the data
  tables scroll horizontally on a 375px mobile viewport, I reviewed whether
  this was an actual usability problem and decided it was not — all columns
  and controls remained reachable and functional by scrolling — so no CSS or
  layout changes were made purely for cosmetic reasons, consistent with the
  instruction to change only what a genuine issue required.

Throughout, the code itself was written by Claude; my role was to set the
constraints and plan up front, review each checkpoint's implementation and
test results against the specification, decide what (if anything) needed to
change, and accept or send back each checkpoint accordingly.

## 9. Design Trade-offs

- **Plain browser HTML/CSS/JS, no framework.** The problem is small and
  well-bounded (a fixed group, a handful of dishes, one evaluation action), so
  a framework would add build tooling and abstraction without solving a
  problem this project actually has. Plain functions and DOM calls are easier
  to read end-to-end and easier to test directly in Node.
- **In-memory state only.** The specification frames this as a local
  calculator, not a persistent service, so there is nothing to gain from a
  database or file storage — and adding one would introduce state-management
  complexity (loading, saving, migration) that the problem doesn't call for.
- **No backend, authentication, or network calls.** Every rule can be
  evaluated with the data already on the page; introducing a server would add
  an entire second system (API, auth, deployment) purely to do arithmetic and
  string comparisons that JavaScript in the browser already does correctly.
- **Business logic and UI kept in separate files.** This cost a small amount
  of indirection (the UI calls into `logic.js` rather than inlining the
  checks), but it is what allowed the compatibility rules to be written and
  tested against the specification (Checkpoints 1–3) before any HTML existed,
  and it is what made the Checkpoint 5 bug easy to localize to the UI layer
  rather than the rules themselves.
- **Free-text diet fields in the UI, rather than dropdowns.** A `<select>`
  would need to hard-code the list of valid diet values inside `ui.js`,
  duplicating a rule that already lives in `logic.js`'s `validateState()`. A
  plain text input with a placeholder hint keeps that enumeration in one
  place; invalid values are simply caught by validation when Evaluate is
  clicked.
- **Ingredient tags treated as authoritative rather than inferring
  allergens.** The specification is explicit that ingredient tags are
  authoritative and that hidden ingredients, aliases, or cross-contamination
  should never be inferred. This keeps the allergen check a simple, exact,
  predictable string comparison rather than a fuzzy or rule-based inference
  system, which would be both out of scope and harder to verify correctness
  for.

## 10. Scope and Limitations

Per §2.2 of the specification, the application intentionally does not
provide:

- Persistent storage — nothing is saved between page loads; refreshing the
  browser returns to the built-in defaults.
- Accounts, authentication, or any concept of a logged-in user.
- A backend, database, or any network/external API calls — no external menu
  source and no file upload.
- Ordering, payment, or checkout functionality.
- A generic menu catalog or browsing feature — search is intentionally
  incidental and only narrows an already-computed compatible result; it is not
  a standalone way to explore all dishes.
- Meal-planning, scheduling, or queue-management functionality.

Some areas were reviewed but intentionally left unverified during final
testing because the specification does not require them, not because they are
known defects: keyboard-only navigation and screen-reader labeling, behavior
under very large resident/dish datasets, and browsers other than the one used
for automated verification.

## 11. Final Design Decision

The final architecture — a small `logic.js` rule engine with no DOM
dependency, a thin `ui.js` layer that only renders what `logic.js` returns,
and plain static `index.html`/`styles.css` — is appropriate for this problem
because the problem itself is small and precisely specified: a fixed set of
rules applied to a short, editable list of residents and dishes, triggered by
one explicit action. Keeping business rules and presentation in separate files
let every rule in the specification be implemented and tested in isolation
before the UI existed, made the one real defect found during final testing
easy to trace to the correct layer and fix with a one-line change, and avoided
introducing any tooling, storage, or network complexity that the specification
never asked for. The result is a solution that is simple to read end-to-end,
straightforward to verify against the specification, and easy to extend later
without disturbing the parts that are already proven correct.
