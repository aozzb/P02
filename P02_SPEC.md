# P02: Hostel Food Compatibility Board — Full Specification

**Source:** SI26_P02 — AI-Assisted Coding Interview Problem

---

## 1. Aim

Build a compact **Hostel Food Compatibility Board**: given a fixed group of hostel
residents (each with a diet type and allergens) and a small set of dishes from nearby
campus cafes, determine which dishes the *entire group* can safely and affordably eat,
and explain exactly why the rest are excluded.

This is a local, in-memory compatibility calculator rather than a
persistent/live service. It evaluates the current local records when
the user triggers the compatibility action.

---

## 2. Scope

### 2.1 In scope
- Diet compatibility check per resident
- Allergen exclusion check per resident
- Per-person budget check
- Ordered compatible-dish result + ordered exclusion reasons
- Incidental search over the compatible result only
- Input validation with specific error codes
- Reset to built-in defaults

### 2.2 Explicitly out of scope
- No backend, database, accounts, or network service
- No external menu source or file upload
- Not a generic menu catalog, ordering system, queue, or meal-planning app
- Search must stay **incidental** to the compatibility result — it is not a
  standalone browsing feature

### 2.3 Implementation Constraints

- Use a simple browser-based implementation with HTML, CSS, and JavaScript.
- Keep all data in memory.
- No backend, database, authentication, network requests, or external APIs.
- Separate business logic from UI rendering so the compatibility rules can be tested independently.
- Prefer simple functions and data structures over unnecessary abstractions.
- Do not add features outside the stated scope.
- Do not hard-code outputs for the built-in test cases; implement the general compatibility rules.

---

## 3. Built-In Data

### 3.1 Group (per-person budget: **₹150**)

| Resident | Diet | Allergens |
|---|---|---|
| Asha | VEGAN | none |
| Dev | VEGETARIAN | PEANUT |
| Mira | NO_RESTRICTION | MILK |

### 3.2 Dishes (source order — must be preserved throughout)

| Dish ID | Cafe | Dish | Diet class | Ingredient tags | Price/serving |
|---|---|---|---|---|---|
| D01 | Hostel Cafe | Lentil Rice Bowl | VEGAN | LENTIL, RICE, SPINACH | ₹110 |
| D02 | Library Cafe | Tomato Pasta | VEGAN | WHEAT, TOMATO | ₹150 |
| D03 | Hostel Cafe | Paneer Wrap | VEGETARIAN | MILK, WHEAT | ₹140 |
| D04 | East Cafe | Peanut Noodles | VEGAN | PEANUT, WHEAT | ₹130 |
| D05 | Library Cafe | Egg Sandwich | NON_VEGETARIAN | EGG, WHEAT | ₹100 |

### 3.3 Built-in ground truth (the "oracle")

- **Compatible dishes:** D01, D02 — in that order. Compatible count = **2**.
- **Exclusion reasons:**
  - D03 → `DIET:Asha, ALLERGEN:Mira:MILK`
  - D04 → `ALLERGEN:Dev:PEANUT`
  - D05 → `DIET:Asha, DIET:Dev`
- Search query `wheat` (after compatibility is calculated) narrows the *displayed*
  result to **D02 only** (via its ingredient tags), while the compatible count
  stays at **2**.

---

## 4. Core Rules (Contracts)

### 4.1 Normalization
- Trim surrounding spaces and convert to **uppercase** for: diet classes,
  ingredient tags, and allergen tags.
- Valid diet classes: `VEGAN`, `VEGETARIAN`, `NON_VEGETARIAN`, `NO_RESTRICTION`.
  - `NO_RESTRICTION` is valid **only** for residents, never for a dish's diet class.

### 4.2 Diet compatibility
- A **VEGAN** resident accepts only a **VEGAN** dish.
- A **VEGETARIAN** resident accepts **VEGAN or VEGETARIAN** dishes.
- A **NO_RESTRICTION** resident accepts **any** dish class.

### 4.3 Allergen rule
- A dish fails for a resident when **any** normalized ingredient tag **exactly
  equals** any of that resident's allergen tags.
- Ingredient tags are **authoritative** — never infer hidden ingredients, aliases,
  or cross-contamination risk.

### 4.4 Budget rule
- The single group budget is the **max price for one serving for one resident**
  — do **not** multiply by group size.
- A dish passes when its price is a **positive whole rupee value** and
  **≤ budget** (inclusive boundary — ₹150 dish passes a ₹150 budget).

### 4.5 Overall compatibility
- A dish is compatible only if it passes the diet **and** allergen rules for
  **every** resident, **and** passes the budget rule.
- Preserve dish **source order** in the compatible result (never re-sort by
  price, name, etc.).

### 4.6 Exclusion reason format (exact strings)
- `DIET:<resident>`
- `ALLERGEN:<resident>:<tag>`
- `OVER_BUDGET`

**Ordering rule for reasons on one dish:**
1. Iterate residents **in resident-table order**.
2. For each resident: emit its `DIET:` reason first (if it fails diet), then its
   `ALLERGEN:` reason(s) (if any — matched in the **dish's ingredient-tag order**).
3. After all residents are processed, append `OVER_BUDGET` **last**, if applicable.

### 4.7 Search
- Trim the query and compare **case-insensitively** as a substring against the
  compatible dish's **cafe name, dish name, or any ingredient tag**.
- Applies **only** to already-compatible dishes — never to excluded dishes.
- An **empty query** displays all compatible dishes.
- The overall **compatible count is unaffected by search** — it always reflects
  the unfiltered result.

### 4.8 Validation & error codes
- Resident names, dish IDs, cafe names, dish names, and ingredient tags must be
  **non-empty after trimming**.
- Dish IDs must be **unique**.
- The budget and **every** dish price must be **positive whole rupee values**.
- **`INVALID_INPUT`** — report with the affected table, row, and field. Show no
  compatibility/exclusion rows and clear any earlier counts.
- **`DUPLICATE_DISH_ID`** — same clearing behavior as `INVALID_INPUT`.

### 4.9 Reset
- Restores the valid built-in group, dishes, **₹150** budget, and an empty search.
- Clears validation state and calculated output.
- Does **not** auto-run compatibility — results stay empty until the
  compatibility action is triggered again.

---

## 5. Required UI Elements

- One attractive primary screen or report
- A small **group table** (editable directly or via one focused row form)
- A **dish table** (editable directly or via one focused row form)
- A **compatibility action** (e.g. an "Evaluate"/"Check" button)
- A **result area** showing compatible dishes and exclusion reasons
- A **compatible-count summary**
- A **focused search box** (search is incidental — narrows display only, per §4.7)
- **Sample / reset** controls

Acceptable tech: in-memory data structures, a spreadsheet/notebook, a browser,
desktop or mobile tool, or a CLI producing a clear visual/tabular report.

---

## 6. Acceptance Criteria

| # | Requirement | Priority |
|---|---|---|
| 1 | Load built-in group + dishes in one action → exactly D01, D02 compatible (in order), compatible count = 2 | Required |
| 2 | Show exact exclusion reasons for D03, D04, D05 (§3.3); confirm D02 passes the ₹150 boundary | Required |
| 3 | Query `wheat` → display narrows to D02 only, count stays 2; clearing the query restores both dishes | Required |
| 4 | Change budget to ₹130 → only D01 compatible; D02 shown as `OVER_BUDGET` | Required |
| 5 | Change D01's price to 0 → `INVALID_INPUT` naming the D01 row and price field; all result rows/counts cleared | Required |
| 6 | After the invalid-price case, Reset → valid built-in rows, ₹150 budget, empty search return with no stale error/result; screen stays synchronized | Required |
| 7 | Add compact visual "evidence chips" for diet/allergen/budget checks, without changing the contracted result | Optional |

**Mandatory focused test checklist** (explicitly named in the spec):
1. Built-in result (oracle match: D01, D02, count 2)
2. Deterministic search narrowing (`wheat` → D02 only, count unchanged)
3. Budget boundary (₹150 dish vs ₹150 budget passes; ₹130 budget excludes it)
4. Invalid price (0 or non-positive price → `INVALID_INPUT`, full clear)
5. Reset (returns to clean built-in state, no auto-evaluate)

---

## 7. Interview Deliverables

Per the problem statement, before implementation you must produce a **3–5 step
implementation plan** with checkpoints. Be ready to:

1. Present that plan and explain any changes made to it during the build
2. Share the actual prompts used to translate this spec into technical instructions
3. Summarize your design (architecture decisions, AI influence, trade-offs)
4. Show test evidence (tests, screenshots, or output samples)
5. Perform a **live modification** (possibly a second, if time permits)

## 8. Evaluation Dimensions

| Dimension | What's assessed |
|---|---|
| Planning & Solution Presentation | The plan itself, adherence/deviation, clarity of walkthrough |
| AI Prompting Strategy | Quality/specificity of prompts translating spec → implementation |
| Design Constraints & Tech Choices | Constraints given to AI on patterns, stack, architecture |
| AI-Influenced Decision Making | Trade-offs, assumptions, how AI recommendations shaped choices |
| Testing & Validation | Coverage of typical + edge cases (see §6 checklist) |
| Live Modification Capability | Speed and confidence implementing a change live, with AI assistance |

---

## 9. Key Pitfalls to Avoid

- Multiplying budget by group size (it's per-person, per-serving — §4.4)
- Letting search change the compatible **count**, not just the displayed list (§4.7)
- Searching excluded dishes, or turning search into a general catalog browser
- Getting the exclusion-reason **ordering** wrong (resident-table order, diet
  before allergen, `OVER_BUDGET` always last — §4.6)
- Treating a NON_VEGETARIAN dish as acceptable to a VEGAN/VEGETARIAN resident
- Failing to clear stale results/counts on `INVALID_INPUT` or `DUPLICATE_DISH_ID`
- Auto-running compatibility on Reset (it must wait for the action again)
- Case-sensitive or unnormalized string comparisons anywhere in diet/allergen/search logic