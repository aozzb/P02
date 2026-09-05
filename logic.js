// Hostel Food Compatibility Board — business logic (no DOM).
// Checkpoint 1: data model, normalization, and validation.

const VALID_RESIDENT_DIETS = ['VEGAN', 'VEGETARIAN', 'NON_VEGETARIAN', 'NO_RESTRICTION'];
const VALID_DISH_DIETS = ['VEGAN', 'VEGETARIAN', 'NON_VEGETARIAN'];

function normalize(str) {
  return String(str).trim().toUpperCase();
}

function createDefaultState() {
  return {
    residents: [
      { name: 'Asha', diet: 'VEGAN', allergens: [] },
      { name: 'Dev', diet: 'VEGETARIAN', allergens: ['PEANUT'] },
      { name: 'Mira', diet: 'NO_RESTRICTION', allergens: ['MILK'] },
    ],
    dishes: [
      { id: 'D01', cafe: 'Hostel Cafe', name: 'Lentil Rice Bowl', dietClass: 'VEGAN', tags: ['LENTIL', 'RICE', 'SPINACH'], price: 110 },
      { id: 'D02', cafe: 'Library Cafe', name: 'Tomato Pasta', dietClass: 'VEGAN', tags: ['WHEAT', 'TOMATO'], price: 150 },
      { id: 'D03', cafe: 'Hostel Cafe', name: 'Paneer Wrap', dietClass: 'VEGETARIAN', tags: ['MILK', 'WHEAT'], price: 140 },
      { id: 'D04', cafe: 'East Cafe', name: 'Peanut Noodles', dietClass: 'VEGAN', tags: ['PEANUT', 'WHEAT'], price: 130 },
      { id: 'D05', cafe: 'Library Cafe', name: 'Egg Sandwich', dietClass: 'NON_VEGETARIAN', tags: ['EGG', 'WHEAT'], price: 100 },
    ],
    budget: 150,
    searchQuery: '',
  };
}

function isNonEmptyAfterTrim(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveWholeRupee(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// Returns { ok: true } or { ok: false, code, table, row, field }.
function validateState(state) {
  const residents = state.residents || [];
  const dishes = state.dishes || [];

  for (let i = 0; i < residents.length; i++) {
    const resident = residents[i];

    if (!isNonEmptyAfterTrim(resident.name)) {
      return { ok: false, code: 'INVALID_INPUT', table: 'residents', row: i, field: 'name' };
    }
    if (!VALID_RESIDENT_DIETS.includes(normalize(resident.diet))) {
      return { ok: false, code: 'INVALID_INPUT', table: 'residents', row: i, field: 'diet' };
    }
    const allergens = resident.allergens || [];
    for (let a = 0; a < allergens.length; a++) {
      if (!isNonEmptyAfterTrim(allergens[a])) {
        return { ok: false, code: 'INVALID_INPUT', table: 'residents', row: i, field: 'allergens' };
      }
    }
  }

  const seenIds = new Set();
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];

    if (!isNonEmptyAfterTrim(dish.id)) {
      return { ok: false, code: 'INVALID_INPUT', table: 'dishes', row: i, field: 'id' };
    }
    const trimmedId = dish.id.trim();
    if (seenIds.has(trimmedId)) {
      return { ok: false, code: 'DUPLICATE_DISH_ID', table: 'dishes', row: i, field: 'id' };
    }
    seenIds.add(trimmedId);

    if (!isNonEmptyAfterTrim(dish.cafe)) {
      return { ok: false, code: 'INVALID_INPUT', table: 'dishes', row: i, field: 'cafe' };
    }
    if (!isNonEmptyAfterTrim(dish.name)) {
      return { ok: false, code: 'INVALID_INPUT', table: 'dishes', row: i, field: 'name' };
    }
    if (!VALID_DISH_DIETS.includes(normalize(dish.dietClass))) {
      return { ok: false, code: 'INVALID_INPUT', table: 'dishes', row: i, field: 'dietClass' };
    }
    const tags = dish.tags || [];
    for (let t = 0; t < tags.length; t++) {
      if (!isNonEmptyAfterTrim(tags[t])) {
        return { ok: false, code: 'INVALID_INPUT', table: 'dishes', row: i, field: 'tags' };
      }
    }
    if (!isPositiveWholeRupee(dish.price)) {
      return { ok: false, code: 'INVALID_INPUT', table: 'dishes', row: i, field: 'price' };
    }
  }

  if (!isPositiveWholeRupee(state.budget)) {
    return { ok: false, code: 'INVALID_INPUT', table: 'budget', row: null, field: 'budget' };
  }

  return { ok: true };
}

// Checkpoint 2: core compatibility engine.

function checkDiet(resident, dish) {
  const residentDiet = normalize(resident.diet);
  const dishDiet = normalize(dish.dietClass);

  if (residentDiet === 'NO_RESTRICTION') return true;
  if (residentDiet === 'VEGAN') return dishDiet === 'VEGAN';
  if (residentDiet === 'VEGETARIAN') return dishDiet === 'VEGAN' || dishDiet === 'VEGETARIAN';
  return false;
}

// Returns the matching ingredient tags, in dish ingredient-tag order.
function checkAllergens(resident, dish) {
  const allergens = (resident.allergens || []).map(normalize);
  const tags = (dish.tags || []).map(normalize);
  return tags.filter((tag) => allergens.includes(tag));
}

function checkBudget(dish, budget) {
  return isPositiveWholeRupee(dish.price) && isPositiveWholeRupee(budget) && dish.price <= budget;
}

// Returns the ordered list of exclusion reasons for one dish; empty means compatible.
function evaluateDish(dish, residents, budget) {
  const reasons = [];

  for (let i = 0; i < residents.length; i++) {
    const resident = residents[i];

    if (!checkDiet(resident, dish)) {
      reasons.push(`DIET:${resident.name}`);
    }

    const matchedAllergens = checkAllergens(resident, dish);
    for (let a = 0; a < matchedAllergens.length; a++) {
      reasons.push(`ALLERGEN:${resident.name}:${matchedAllergens[a]}`);
    }
  }

  if (!checkBudget(dish, budget)) {
    reasons.push('OVER_BUDGET');
  }

  return reasons;
}

// Returns { compatible, exclusions, compatibleCount }, preserving dish source order.
function evaluateAll(state) {
  const compatible = [];
  const exclusions = [];

  for (let i = 0; i < state.dishes.length; i++) {
    const dish = state.dishes[i];
    const reasons = evaluateDish(dish, state.residents, state.budget);

    if (reasons.length === 0) {
      compatible.push(dish);
    } else {
      exclusions.push({ dish, reasons });
    }
  }

  return { compatible, exclusions, compatibleCount: compatible.length };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDefaultState,
    normalize,
    validateState,
    checkDiet,
    checkAllergens,
    checkBudget,
    evaluateDish,
    evaluateAll,
  };
}
