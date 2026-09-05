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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createDefaultState, normalize, validateState };
}
