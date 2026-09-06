// Hostel Food Compatibility Board — UI/DOM layer.
// Wires the DOM to the business logic in logic.js. Contains no compatibility,
// validation, budget, allergen, diet, or search rules of its own.

let state = createDefaultState();
let lastResult = null; // { compatible, exclusions, compatibleCount } from evaluateAll(), or null

const residentsTbody = document.getElementById('residents-tbody');
const dishesTbody = document.getElementById('dishes-tbody');
const budgetInput = document.getElementById('budget-input');
const searchInput = document.getElementById('search-input');
const evaluateBtn = document.getElementById('evaluate-btn');
const resetBtn = document.getElementById('reset-btn');
const addResidentBtn = document.getElementById('add-resident-btn');
const addDishBtn = document.getElementById('add-dish-btn');
const validationBanner = document.getElementById('validation-banner');
const compatibleCountEl = document.getElementById('compatible-count');
const resultsEmptyEl = document.getElementById('results-empty');
const resultsContentEl = document.getElementById('results-content');
const compatibleListEl = document.getElementById('compatible-list');
const excludedListEl = document.getElementById('excluded-list');

function parseCsvField(value) {
  return value.split(',');
}

function joinCsvField(list) {
  return (list || []).join(', ');
}

// ---- Rendering: residents table ----

function renderResidentsTable() {
  residentsTbody.innerHTML = '';

  state.residents.forEach((resident, index) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = resident.name;
    nameInput.addEventListener('input', () => {
      state.residents[index].name = nameInput.value;
    });
    nameCell.appendChild(nameInput);

    const dietCell = document.createElement('td');
    const dietInput = document.createElement('input');
    dietInput.type = 'text';
    dietInput.placeholder = 'VEGAN / VEGETARIAN / NON_VEGETARIAN / NO_RESTRICTION';
    dietInput.value = resident.diet;
    dietInput.addEventListener('input', () => {
      state.residents[index].diet = dietInput.value;
    });
    dietCell.appendChild(dietInput);

    const allergensCell = document.createElement('td');
    const allergensInput = document.createElement('input');
    allergensInput.type = 'text';
    allergensInput.value = joinCsvField(resident.allergens);
    allergensInput.addEventListener('input', () => {
      state.residents[index].allergens = parseCsvField(allergensInput.value);
    });
    allergensCell.appendChild(allergensInput);

    const removeCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      state.residents.splice(index, 1);
      renderResidentsTable();
    });
    removeCell.appendChild(removeBtn);

    row.append(nameCell, dietCell, allergensCell, removeCell);
    residentsTbody.appendChild(row);
  });
}

// ---- Rendering: dishes table ----

function renderDishesTable() {
  dishesTbody.innerHTML = '';

  state.dishes.forEach((dish, index) => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.value = dish.id;
    idInput.addEventListener('input', () => {
      state.dishes[index].id = idInput.value;
    });
    idCell.appendChild(idInput);

    const cafeCell = document.createElement('td');
    const cafeInput = document.createElement('input');
    cafeInput.type = 'text';
    cafeInput.value = dish.cafe;
    cafeInput.addEventListener('input', () => {
      state.dishes[index].cafe = cafeInput.value;
    });
    cafeCell.appendChild(cafeInput);

    const nameCell = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = dish.name;
    nameInput.addEventListener('input', () => {
      state.dishes[index].name = nameInput.value;
    });
    nameCell.appendChild(nameInput);

    const dietCell = document.createElement('td');
    const dietInput = document.createElement('input');
    dietInput.type = 'text';
    dietInput.placeholder = 'VEGAN / VEGETARIAN / NON_VEGETARIAN';
    dietInput.value = dish.dietClass;
    dietInput.addEventListener('input', () => {
      state.dishes[index].dietClass = dietInput.value;
    });
    dietCell.appendChild(dietInput);

    const tagsCell = document.createElement('td');
    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.value = joinCsvField(dish.tags);
    tagsInput.addEventListener('input', () => {
      state.dishes[index].tags = parseCsvField(tagsInput.value);
    });
    tagsCell.appendChild(tagsInput);

    const priceCell = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.value = dish.price;
    priceInput.addEventListener('input', () => {
      state.dishes[index].price = priceInput.value === '' ? NaN : Number(priceInput.value);
    });
    priceCell.appendChild(priceInput);

    const removeCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      state.dishes.splice(index, 1);
      renderDishesTable();
    });
    removeCell.appendChild(removeBtn);

    row.append(idCell, cafeCell, nameCell, dietCell, tagsCell, priceCell, removeCell);
    dishesTbody.appendChild(row);
  });
}

// ---- Rendering: budget / search ----

function renderBudgetInput() {
  budgetInput.value = state.budget;
}

function renderSearchInput() {
  searchInput.value = state.searchQuery;
}

// ---- Rendering: validation banner ----

function describeValidationError(error) {
  const parts = [`${error.code}`];
  if (error.table) parts.push(`table: ${error.table}`);
  if (error.row !== null && error.row !== undefined) parts.push(`row: ${error.row + 1}`);
  if (error.field) parts.push(`field: ${error.field}`);
  return parts.join(' — ');
}

function showValidationError(error) {
  validationBanner.textContent = describeValidationError(error);
  validationBanner.hidden = false;
}

function clearValidationError() {
  validationBanner.textContent = '';
  validationBanner.hidden = true;
}

// ---- Rendering: results ----

function clearResultsDisplay() {
  lastResult = null;
  compatibleCountEl.textContent = '';
  compatibleListEl.innerHTML = '';
  excludedListEl.innerHTML = '';
  resultsContentEl.hidden = true;
  resultsEmptyEl.hidden = false;
}

function buildDishItem(dish, reasons) {
  const li = document.createElement('li');
  li.className = 'dish-item' + (reasons ? ' excluded' : '');

  const title = document.createElement('div');
  title.className = 'dish-title';
  title.textContent = `${dish.name} — ${dish.cafe}`;
  li.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'dish-meta';
  meta.textContent = `${dish.id} · ${dish.dietClass} · ₹${dish.price} · ${(dish.tags || []).join(', ')}`;
  li.appendChild(meta);

  if (reasons && reasons.length > 0) {
    const chips = document.createElement('div');
    chips.className = 'reason-chips';
    reasons.forEach((reason) => {
      const chip = document.createElement('span');
      chip.className = 'reason-chip';
      chip.textContent = reason;
      chips.appendChild(chip);
    });
    li.appendChild(chips);
  }

  return li;
}

function renderResults() {
  if (!lastResult) {
    clearResultsDisplay();
    return;
  }

  resultsEmptyEl.hidden = true;
  resultsContentEl.hidden = false;
  compatibleCountEl.textContent = `Compatible: ${lastResult.compatibleCount}`;

  const displayed = searchCompatible(lastResult.compatible, state.searchQuery);

  compatibleListEl.innerHTML = '';
  if (displayed.length === 0) {
    const note = document.createElement('li');
    note.className = 'no-items-note';
    note.textContent = 'No compatible dishes match the current search.';
    compatibleListEl.appendChild(note);
  } else {
    displayed.forEach((dish) => {
      compatibleListEl.appendChild(buildDishItem(dish, null));
    });
  }

  excludedListEl.innerHTML = '';
  if (lastResult.exclusions.length === 0) {
    const note = document.createElement('li');
    note.className = 'no-items-note';
    note.textContent = 'No dishes were excluded.';
    excludedListEl.appendChild(note);
  } else {
    lastResult.exclusions.forEach(({ dish, reasons }) => {
      excludedListEl.appendChild(buildDishItem(dish, reasons));
    });
  }
}

// ---- Event handlers ----

function onEvaluateClick() {
  const validation = validateState(state);

  if (!validation.ok) {
    showValidationError(validation);
    clearResultsDisplay();
    return;
  }

  clearValidationError();
  lastResult = evaluateAll(state);
  renderResults();
}

function onSearchInput() {
  state.searchQuery = searchInput.value;
  if (lastResult) {
    renderResults();
  }
}

function onResetClick() {
  state = createDefaultState();
  clearValidationError();
  clearResultsDisplay();
  renderResidentsTable();
  renderDishesTable();
  renderBudgetInput();
  renderSearchInput();
}

function onBudgetInput() {
  state.budget = budgetInput.value === '' ? NaN : Number(budgetInput.value);
}

function onAddResident() {
  state.residents.push({ name: '', diet: 'NO_RESTRICTION', allergens: [] });
  renderResidentsTable();
}

function onAddDish() {
  state.dishes.push({ id: '', cafe: '', name: '', dietClass: 'VEGAN', tags: [], price: 0 });
  renderDishesTable();
}

// ---- Init ----

function init() {
  renderResidentsTable();
  renderDishesTable();
  renderBudgetInput();
  renderSearchInput();
  clearResultsDisplay();

  evaluateBtn.addEventListener('click', onEvaluateClick);
  resetBtn.addEventListener('click', onResetClick);
  searchInput.addEventListener('input', onSearchInput);
  budgetInput.addEventListener('input', onBudgetInput);
  addResidentBtn.addEventListener('click', onAddResident);
  addDishBtn.addEventListener('click', onAddDish);
}

document.addEventListener('DOMContentLoaded', init);
