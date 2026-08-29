import { CUISINES, CUISINE_LIST, CUSTOMER_VALUES } from "./data.js";

let nextId = 1;

export const MAX_PROMOTIONS = 3;
export const GAME_ROUND_LIMIT = 10;

const id = (prefix) => `${prefix}-${nextId++}`;

export function gameRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] / 0x100000000;
  }
  return Math.random();
}

export const shuffle = (items, random = gameRandom) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }

  // Finish with an independent cut, as players normally would with a physical
  // deck. Card types are deliberately never inspected: streaks and uneven
  // hands remain possible outcomes of an honest shuffle.
  if (copy.length < 2) return copy;
  const cutIndex = Math.floor(random() * copy.length);
  return [...copy.slice(cutIndex), ...copy.slice(0, cutIndex)];
};

export const emptyMeal = () => ({ dishes: [], drink: null });

export const flattenMeal = (meal) => [
  ...meal.dishes.flatMap((dish) => [
    dish.recipe,
    ...dish.ingredients,
    ...(dish.flavor ? [dish.flavor] : []),
  ]),
  ...(meal.drink ? [meal.drink] : []),
];

export function cardParticipatesInAbility(card, cuisineId = card?.cuisineId) {
  if (!card || !cuisineId) return false;

  switch (cuisineId) {
    case "italy": {
      if (card.type === "recipe") return Boolean(card.match);
      if (card.type !== "ingredient" || !card.subtype) return false;
      const exactPastaTypes = new Set(
        CUISINES.italy.recipes.map((recipeCard) => recipeCard.match).filter(Boolean),
      );
      return exactPastaTypes.has(card.subtype);
    }
    case "france":
      return card.type === "recipe" && Boolean(card.tag);
    case "china":
      return card.type === "recipe";
    case "india":
      return card.type === "ingredient" && card.tag === "spice";
    case "usa":
      return card.type === "recipe" || card.type === "ingredient";
    case "turkey":
      return card.type === "recipe";
    case "japan":
      return card.type === "ingredient" && card.tag === "seasoning";
    case "mexico":
      return (card.type === "ingredient" && card.tag === "hot")
        || (card.type === "recipe" && card.slots === 0);
    default:
      return false;
  }
}

export function buildRestaurantDeck(cuisineId, random = gameRandom) {
  const cuisine = CUISINES[cuisineId];
  const cards = [];

  cuisine.recipes.forEach((item) => {
    cards.push({
      ...item,
      id: id("recipe"),
      type: "recipe",
      cuisineId,
      description: `${item.slots} ingredient slot${item.slots === 1 ? "" : "s"}`,
    });
  });

  cuisine.ingredients.forEach((item) => {
    for (let count = 0; count < item.count; count += 1) {
      cards.push({
        ...item,
        id: id("ingredient"),
        type: "ingredient",
        cuisineId,
        description: item.tag ? `${item.tag} ingredient` : "Extra ingredient",
      });
    }
  });

  cuisine.flavors.forEach((name) => {
    cards.push({
      id: id("flavor"),
      type: "flavor",
      name,
      cuisineId,
      description: "Adds aroma and +2 serve value",
    });
  });

  cuisine.drinks.forEach((item) => {
    cards.push({
      ...item,
      id: id("drink"),
      type: "drink",
      cuisineId,
      description: item.condition,
    });
  });

  return shuffle(cards, random);
}

export function buildCustomerDeck(cuisineIds = CUISINE_LIST.map((cuisine) => cuisine.id), random = gameRandom) {
  // Preserve the original buildCustomerDeck(random) convenience for callers that need every cuisine.
  if (typeof cuisineIds === "function") {
    random = cuisineIds;
    cuisineIds = CUISINE_LIST.map((cuisine) => cuisine.id);
  }
  const includedCuisines = new Set(cuisineIds);
  const customers = CUISINE_LIST.filter((cuisine) => includedCuisines.has(cuisine.id)).flatMap((cuisine) =>
    CUSTOMER_VALUES.map((order) => ({
      id: id("customer"),
      type: "customer",
      cuisineId: cuisine.id,
      nationality: cuisine.id,
      flag: cuisine.flag,
      name: `${cuisine.region.replace(" restaurant", "")} customer`,
      order,
      effect: cuisine.customerEffect,
      accent: cuisine.accent,
    })),
  );
  return shuffle(customers, random);
}

export function drawCards(player, amount, random = gameRandom) {
  let drawn = 0;
  while (drawn < amount) {
    if (player.deck.length === 0 && player.discard.length > 0) {
      player.deck = shuffle(player.discard, random);
      player.discard = [];
    }
    const card = player.deck.pop();
    if (!card) break;
    player.hand.push(card);
    drawn += 1;
  }
  return drawn;
}

export function makePlayer(cuisineId, name, random = gameRandom) {
  const player = {
    id: id("player"),
    name,
    cuisineId,
    deck: buildRestaurantDeck(cuisineId, random),
    hand: [],
    discard: [],
    meal: emptyMeal(),
    customers: [],
    promotions: [],
    refreshDrawn: 0,
  };
  drawCards(player, 6, random);
  return player;
}

export function createGame(cuisineId, opponentCuisineIds, random = gameRandom) {
  const rivalIds = Array.isArray(opponentCuisineIds) ? opponentCuisineIds : [opponentCuisineIds];
  const cuisineIdsInPlay = [...new Set([cuisineId, ...rivalIds])];
  const customerDeck = buildCustomerDeck(cuisineIdsInPlay, random);
  return {
    round: 1,
    phase: "refresh",
    player: makePlayer(cuisineId, "You", random),
    opponents: rivalIds.map((opponentCuisineId, index) =>
      makePlayer(opponentCuisineId, `Rival ${index + 1}`, random)),
    customerDeck,
    activeCustomer: customerDeck.pop(),
    history: [],
  };
}

export function handLimit(customer) {
  return customer?.nationality === "italy" ? 8 : 6;
}

export function drawForRefresh(player, customer, random = gameRandom) {
  const limit = handLimit(customer);
  const drawn = drawCards(player, Math.min(3, Math.max(0, limit - player.hand.length)), random);
  player.refreshDrawn = drawn;
  return drawn;
}

export function replaceForRefresh(
  player,
  customer,
  discardIds = [],
  mulligan = false,
  random = gameRandom,
) {
  const limit = handLimit(customer);
  if (mulligan && customer?.nationality === "france") {
    player.discard.push(...player.hand);
    player.hand = [];
    return drawCards(player, limit, random);
  }

  const allowed = new Set(discardIds.slice(0, 2));
  let discarded = 0;
  player.hand = player.hand.filter((card) => {
    if (allowed.has(card.id)) {
      player.discard.push(card);
      discarded += 1;
      return false;
    }
    return true;
  });
  return drawCards(player, discarded, random);
}

function totalIngredients(meal) {
  return meal.dishes.reduce((sum, dish) => sum + dish.ingredients.length, 0);
}

function ingredientsOverLimit(meal) {
  return meal.dishes.reduce(
    (sum, dish) => sum + Math.max(0, dish.ingredients.length - dish.recipe.slots),
    0,
  );
}

export function canAttachIngredient(meal, dishIndex, card, cuisineId) {
  if (!meal.dishes[dishIndex] || card.type !== "ingredient") return false;
  const dish = meal.dishes[dishIndex];
  if (dish.ingredients.length < dish.recipe.slots) return true;

  if (cuisineId === "usa" && ingredientsOverLimit(meal) < 2) return true;
  if (
    cuisineId === "mexico" &&
    dish.recipe.slots === 0 &&
    dish.ingredients.length === 0 &&
    card.tag === "hot" &&
    flattenMeal(meal).filter((item) => item.type === "ingredient" && item.tag === "hot").length < 2
  ) {
    return true;
  }
  return false;
}

export function cardPlayability(card, meal, cuisineId, orderValue, selectedDishIndex = 0) {
  if (card.type === "recipe") {
    return meal.dishes.length < orderValue
      ? { playable: true, reason: "Starts a new dish" }
      : { playable: false, reason: `This customer orders at most ${orderValue} dish${orderValue === 1 ? "" : "es"}.` };
  }
  if (card.type === "ingredient") {
    if (!meal.dishes.length) return { playable: false, reason: "Serve a recipe before adding ingredients." };
    const targetIndex = canAttachIngredient(meal, selectedDishIndex, card, cuisineId)
      ? selectedDishIndex
      : meal.dishes.findIndex((_, index) => canAttachIngredient(meal, index, card, cuisineId));
    return targetIndex >= 0
      ? { playable: true, reason: `Adds to dish ${targetIndex + 1}`, targetIndex }
      : { playable: false, reason: "No served recipe has an open slot for this ingredient." };
  }
  if (card.type === "flavor") {
    if (!meal.dishes.length) return { playable: false, reason: "Serve a recipe before adding flavor." };
    const targetIndex = meal.dishes[selectedDishIndex] && !meal.dishes[selectedDishIndex].flavor
      ? selectedDishIndex
      : meal.dishes.findIndex((dish) => !dish.flavor);
    return targetIndex >= 0
      ? { playable: true, reason: `Adds to dish ${targetIndex + 1}`, targetIndex }
      : { playable: false, reason: "Every served recipe already has a Flavor Card." };
  }
  if (card.type === "drink") {
    if (!meal.dishes.length) return { playable: false, reason: "Serve a recipe before adding a drink." };
    return meal.drink
      ? { playable: false, reason: "This meal already includes a Drink Card." }
      : { playable: true, reason: "Adds the meal's optional drink" };
  }
  return { playable: false, reason: "This card cannot be played now." };
}

function countTags(meal, tag) {
  return meal.dishes.filter((dish) => dish.recipe.tag === tag).length;
}

function allIngredients(meal) {
  return meal.dishes.flatMap((dish) => dish.ingredients);
}

function hasAdjacentCourse(meal) {
  const courseOrder = ["entree", "appetizer", "main", "dessert"];
  const courses = new Set(meal.dishes.map((dish) => dish.recipe.tag));
  return courseOrder.some((course, index) => courses.has(course) && courses.has(courseOrder[index + 1]));
}

export function isDrinkValid(drinkCard, meal) {
  if (!drinkCard) return false;
  const ingredients = allIngredients(meal);
  const types = meal.dishes.map((dish) => dish.recipe.tag).filter(Boolean);
  const uniqueTypes = new Set(types);
  const hot = ingredients.filter((card) => card.tag === "hot").length;
  const spices = new Set(ingredients.filter((card) => card.tag === "spice").map((card) => card.subtype));
  const exact = meal.dishes.some((dish) =>
    dish.ingredients.some((card) => card.subtype && card.subtype === dish.recipe.match),
  );

  switch (drinkCard.rule) {
    case "italyExact": return exact;
    case "twoNormal": return meal.dishes.filter((dish) => dish.ingredients.length === 1).length >= 2;
    case "twoPasta": return new Set(ingredients.filter((card) => card.tag === "pasta").map((card) => card.subtype)).size >= 2;
    case "adjacentCourse": return hasAdjacentCourse(meal);
    case "hardDish": return meal.dishes.some((dish) => dish.ingredients.length >= 2);
    case "differentCourses": return meal.dishes.length > 0 && uniqueTypes.size === meal.dishes.length;
    case "riceAndNoodles": return uniqueTypes.has("rice") && uniqueTypes.has("noodles");
    case "sameType": return ["rice", "noodles"].some((tag) => countTags(meal, tag) >= 2);
    case "easyDish": return meal.dishes.some((dish) => dish.ingredients.length === 0);
    case "twoIngredients": return ingredients.length >= 2;
    case "flavoredDish": return meal.dishes.some((dish) => dish.flavor);
    case "twoSpices": return spices.size >= 2;
    case "twoBurgers": return countTags(meal, "burger") >= 2;
    case "twoSteaks": return countTags(meal, "steak") >= 2;
    case "overstuffed": return ingredientsOverLimit(meal) > 0;
    case "mixedKebab": return countTags(meal, "kebab") > 0 && countTags(meal, "kebab") < meal.dishes.length;
    case "allKebab": return meal.dishes.length > 0 && countTags(meal, "kebab") === meal.dishes.length;
    case "twoNonKebab": return meal.dishes.length - countTags(meal, "kebab") >= 2;
    case "wasabi": return ingredients.some((card) => card.subtype === "wasabi");
    case "twoDifferentIngredients": return new Set(ingredients.map((card) => card.name)).size >= 2;
    case "oneHot": return hot >= 1;
    case "twoHot": return hot >= 2;
    case "normalFlavor": return meal.dishes.some((dish) => dish.ingredients.length === 1 && dish.flavor);
    default: return false;
  }
}

function abilityValue(meal, cuisineId) {
  const ingredients = allIngredients(meal);
  switch (cuisineId) {
    case "italy":
      return meal.dishes.filter((dish) =>
        dish.ingredients.some((card) => card.subtype && card.subtype === dish.recipe.match),
      ).length;
    case "france": {
      const order = ["entree", "appetizer", "main", "dessert"];
      const courses = new Set(meal.dishes.map((dish) => dish.recipe.tag));
      return Math.min(2, order.slice(0, -1).filter((course, index) =>
        courses.has(course) && courses.has(order[index + 1])).length);
    }
    case "china": return Math.floor(meal.dishes.length / 2);
    case "india": {
      const uniqueSpices = new Set(
        ingredients.filter((card) => card.tag === "spice").map((card) => card.subtype),
      ).size;
      return (uniqueSpices * (uniqueSpices - 1)) / 2;
    }
    case "turkey": {
      const kebabs = countTags(meal, "kebab");
      return kebabs * (meal.dishes.length - kebabs);
    }
    case "japan": return ingredients.filter((card) => card.tag === "seasoning").length === 1 ? 1 : 0;
    default: return 0;
  }
}

function customerValue(meal, customer, player, opponents, handCount) {
  const rivals = Array.isArray(opponents) ? opponents : [opponents].filter(Boolean);
  const easy = meal.dishes.filter((dish) => dish.ingredients.length === 0).length;
  const normal = meal.dishes.filter((dish) => dish.ingredients.length === 1).length;
  const hard = meal.dishes.filter((dish) => dish.ingredients.length >= 2).length;
  const ingredients = totalIngredients(meal);

  switch (customer.nationality) {
    case "china": return easy;
    case "india": return Math.floor(ingredients / 2);
    case "usa": return Math.floor(handCount / 2);
    case "turkey": return rivals.some((opponent) =>
      player.promotions.length < opponent.promotions.length) ? 1 : 0;
    case "japan": return hard;
    case "mexico": return normal;
    default: return 0;
  }
}

export function calculateMeal(meal, cuisineId, customer, player, opponents, handCount = player.hand.length) {
  const recipes = meal.dishes.length;
  const ingredients = totalIngredients(meal);
  const flavors = meal.dishes.filter((dish) => dish.flavor).length;
  const validDrink = isDrinkValid(meal.drink, meal);
  const customerBonus = customerValue(meal, customer, player, opponents, handCount);
  const abilityBonus = abilityValue(meal, cuisineId);
  const breakdown = {
    Recipes: recipes,
    Ingredients: ingredients,
    Flavors: flavors * 2,
    Drink: validDrink ? 3 : 0,
    Customer: customerBonus,
    Ability: abilityBonus,
  };
  return {
    total: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    breakdown,
    validDrink,
  };
}

export function determineUniqueWinner(entries) {
  const competitors = entries.filter((entry) => entry.competing);
  const totals = new Map();
  competitors.forEach((entry) => totals.set(entry.value, (totals.get(entry.value) || 0) + 1));
  const uniqueValues = [...totals.entries()]
    .filter(([, count]) => count === 1)
    .map(([value]) => value)
    .sort((a, b) => b - a);
  if (!uniqueValues.length) return null;
  return competitors.find((entry) => entry.value === uniqueValues[0])?.id ?? null;
}

export function classifyContest(entries, contest = null) {
  if (contest) {
    const canceledValues = new Set(contest.canceledValues || []);
    return entries.map((entry) => ({
      ...entry,
      status: !entry.competing
        ? "passed"
        : entry.id === contest.winnerId
          ? "winner"
          : canceledValues.has(entry.value)
            ? "cancelled"
            : !contest.resolved && contest.activeIds?.includes(entry.id)
              ? "bidding"
              : !contest.resolved && contest.participantIds?.includes(entry.id)
                ? "outbid"
                : contest.resolved && contest.participantIds?.includes(entry.id)
                  ? "outbid"
                  : "outscored",
    }));
  }
  const winnerId = determineUniqueWinner(entries);
  const counts = new Map();
  entries.filter((entry) => entry.competing).forEach((entry) =>
    counts.set(entry.value, (counts.get(entry.value) || 0) + 1));
  return entries.map((entry) => ({
    ...entry,
    status: !entry.competing
      ? "passed"
      : (counts.get(entry.value) || 0) > 1
        ? "cancelled"
        : entry.id === winnerId
          ? "winner"
          : "outscored",
  }));
}

function nextContestGroup(entries, canceledValues) {
  const canceled = new Set(canceledValues);
  const grouped = new Map();
  entries.filter((entry) => entry.competing && !canceled.has(entry.value)).forEach((entry) => {
    grouped.set(entry.value, [...(grouped.get(entry.value) || []), entry]);
  });
  const value = [...grouped.keys()].sort((a, b) => b - a)[0];
  return value === undefined ? null : { value, entries: grouped.get(value) };
}

export function createPromotionContest(
  entries,
  players,
  canceledValues = [],
  spent = {},
  revision = 0,
) {
  const group = nextContestGroup(entries, canceledValues);
  if (!group) {
    return { resolved: true, winnerId: null, canceledValues, spent, revision };
  }
  if (group.entries.length === 1) {
    return {
      resolved: true,
      winnerId: group.entries[0].id,
      canceledValues,
      spent,
      revision,
    };
  }

  const participantIds = group.entries.map((entry) => entry.id);
  const canRaise = players.some((player) =>
    participantIds.includes(player.id) && player.promotions.length > 0);
  if (!canRaise) {
    return createPromotionContest(
      entries,
      players,
      [...canceledValues, group.value],
      spent,
      revision + 1,
    );
  }

  return {
    resolved: false,
    winnerId: null,
    canceledValues,
    spent,
    revision,
    baseValue: group.value,
    participantIds,
    activeIds: [...participantIds],
    stage: "raise",
    passedIds: [],
    waitingIds: [],
    raiserId: null,
  };
}

function spendPromotion(players, playerId) {
  const player = players.find((candidate) => candidate.id === playerId);
  const card = player?.promotions.pop();
  if (!player || !card) throw new Error("No Promotion Card is available to spend.");
  player.discard.push(card);
  return card;
}

export function applyPromotionBid(contest, action, players, entries) {
  if (!contest || contest.resolved) throw new Error("Promotion bidding is already complete.");
  const { playerId, type } = action;
  if (!contest.activeIds.includes(playerId)) throw new Error("This restaurant is no longer in the tie.");

  const finishMatchStep = () => {
    if (contest.activeIds.length === 1) {
      contest.resolved = true;
      contest.winnerId = contest.activeIds[0];
      contest.stage = "resolved";
      contest.waitingIds = [];
      return;
    }
    if (contest.waitingIds.length === 0) {
      contest.stage = "raise";
      contest.raiserId = null;
      contest.passedIds = [];
    }
  };

  if (type === "raise") {
    if (contest.stage !== "raise" || contest.passedIds.includes(playerId)) {
      throw new Error("This restaurant cannot raise now.");
    }
    spendPromotion(players, playerId);
    contest.spent[playerId] = (contest.spent[playerId] || 0) + 1;
    contest.raiserId = playerId;
    contest.stage = "match";
    contest.passedIds = [];
    contest.waitingIds = contest.activeIds.filter((id) => id !== playerId);
  } else if (type === "pass") {
    if (contest.stage !== "raise" || contest.passedIds.includes(playerId)) {
      throw new Error("This restaurant cannot pass now.");
    }
    contest.passedIds.push(playerId);
    if (contest.passedIds.length === contest.activeIds.length) {
      return createPromotionContest(
        entries,
        players,
        [...contest.canceledValues, contest.baseValue],
        contest.spent,
        contest.revision + 1,
      );
    }
  } else if (type === "match") {
    if (contest.stage !== "match" || !contest.waitingIds.includes(playerId)) {
      throw new Error("This restaurant does not need to match now.");
    }
    spendPromotion(players, playerId);
    contest.spent[playerId] = (contest.spent[playerId] || 0) + 1;
    contest.waitingIds = contest.waitingIds.filter((id) => id !== playerId);
    finishMatchStep();
  } else if (type === "withdraw") {
    if (contest.stage !== "match" || !contest.waitingIds.includes(playerId)) {
      throw new Error("This restaurant cannot withdraw now.");
    }
    contest.waitingIds = contest.waitingIds.filter((id) => id !== playerId);
    contest.activeIds = contest.activeIds.filter((id) => id !== playerId);
    finishMatchStep();
  } else {
    throw new Error("Choose a valid Promotion bid action.");
  }

  contest.revision += 1;
  return contest;
}

export function promotionCandidates(meal, cuisineId, existingPromotions = []) {
  if (existingPromotions.length >= MAX_PROMOTIONS) return [];
  const ingredients = allIngredients(meal);
  const existingKeys = new Set(existingPromotions.map((promotion) => promotion.promotionKey));
  let candidates = [];

  switch (cuisineId) {
    case "italy":
      candidates = meal.dishes.flatMap((dish) =>
        dish.ingredients.filter((card) => card.subtype === dish.recipe.match));
      break;
    case "france": {
      candidates = meal.dishes
        .map((dish) => dish.recipe)
        .filter((card) => card.tag && !existingKeys.has(card.tag));
      break;
    }
    case "china": {
      const eligibleTypes = ["rice", "noodles"].filter((tag) => countTags(meal, tag) >= 2);
      candidates = meal.dishes.map((dish) => dish.recipe).filter((card) => eligibleTypes.includes(card.tag));
      break;
    }
    case "india":
      candidates = ingredients.filter((card) => card.tag === "spice" && !existingKeys.has(card.subtype));
      break;
    case "usa":
      candidates = meal.dishes.map((dish) => dish.recipe).filter((card) => ["burger", "steak"].includes(card.tag));
      break;
    case "turkey":
      candidates = meal.dishes.map((dish) => dish.recipe).filter((card) => card.tag === "kebab");
      break;
    case "japan":
      candidates = ingredients.filter((card) => card.tag === "seasoning" && !existingKeys.has(card.subtype));
      break;
    case "mexico":
      candidates = ingredients.filter((card) => card.tag === "hot");
      break;
    default:
      candidates = [];
  }

  return candidates.map((card) => ({
    ...card,
    promotionKey: card.subtype || card.tag || card.name,
  }));
}

function combinations(items, maxSize) {
  const result = [[]];
  items.forEach((item) => {
    [...result].forEach((combo) => {
      if (combo.length < maxSize) result.push([...combo, item]);
    });
  });
  return result;
}

function mealFromRecipes(recipes) {
  return {
    dishes: recipes.map((card) => ({ recipe: card, ingredients: [], flavor: null })),
    drink: null,
  };
}

function greedyMeal(recipes, hand, cuisineId) {
  const meal = mealFromRecipes(recipes);
  const used = new Set(recipes.map((card) => card.id));
  const ingredients = hand.filter((card) => card.type === "ingredient" && !used.has(card.id));

  ingredients.forEach((card) => {
    const eligible = meal.dishes
      .map((dish, index) => ({ dish, index }))
      .filter(({ index }) => canAttachIngredient(meal, index, card, cuisineId))
      .sort((a, b) => {
        const aExact = a.dish.recipe.match && a.dish.recipe.match === card.subtype ? 1 : 0;
        const bExact = b.dish.recipe.match && b.dish.recipe.match === card.subtype ? 1 : 0;
        return bExact - aExact || a.dish.ingredients.length - b.dish.ingredients.length;
      });
    if (eligible[0]) {
      eligible[0].dish.ingredients.push(card);
      used.add(card.id);
    }
  });

  hand.filter((card) => card.type === "flavor" && !used.has(card.id)).forEach((card) => {
    const dish = meal.dishes.find((item) => !item.flavor);
    if (dish) {
      dish.flavor = card;
      used.add(card.id);
    }
  });
  return meal;
}

export function chooseAiMeal(player, opponents, customer) {
  const recipes = player.hand.filter((card) => card.type === "recipe");
  const recipeSets = combinations(recipes, customer.order).filter((set) => set.length > 0);
  let best = { meal: emptyMeal(), value: -1 };

  recipeSets.forEach((set) => {
    const baseMeal = greedyMeal(set, player.hand, player.cuisineId);
    const options = [null, ...player.hand.filter((card) => card.type === "drink")];
    options.forEach((drinkCard) => {
      const meal = { ...baseMeal, drink: drinkCard };
      const usedCount = flattenMeal(meal).length;
      const result = calculateMeal(
        meal,
        player.cuisineId,
        customer,
        player,
        opponents,
        player.hand.length - usedCount,
      );
      if (drinkCard && !result.validDrink) return;
      if (result.total > best.value || (result.total === best.value && usedCount < flattenMeal(best.meal).length)) {
        best = { meal, value: result.total };
      }
    });
  });
  return best.meal;
}

export function moveMealFromHand(player, meal) {
  const ids = new Set(flattenMeal(meal).map((card) => card.id));
  player.hand = player.hand.filter((card) => !ids.has(card.id));
}

export function cleanupMeal(player, meal, promotionCard = null) {
  const promotionId = promotionCard?.id;
  flattenMeal(meal).forEach((card) => {
    if (card.id !== promotionId) player.discard.push(card);
  });
  if (promotionCard) player.promotions.push(promotionCard);
  player.meal = emptyMeal();
}

export function scoreCustomer(customer, trackedPromotions) {
  const orderVp = customer.order;
  const promotionUnlocked = trackedPromotions >= customer.order;
  const promotionVp = promotionUnlocked ? 1 : 0;
  return {
    orderVp,
    promotionVp,
    promotionUnlocked,
    total: orderVp + promotionVp,
  };
}

export function scorePlayer(player) {
  return player.customers.reduce(
    (score, customer) => score + scoreCustomer(customer, player.promotions.length).total,
    0,
  );
}

export function shouldAiSpendPromotion(player, customer, nextBidLevel = 1) {
  if (!player.promotions.length) return false;
  const currentScore = scorePlayer(player);
  const remaining = player.promotions.length - 1;
  const scoreAfterSpend = player.customers.reduce(
    (score, attracted) => score + scoreCustomer(attracted, remaining).total,
    0,
  );
  const opportunityCost = currentScore - scoreAfterSpend;
  const customerValue = customer.order + Number(remaining >= customer.order);
  return customerValue > opportunityCost + Math.max(0, nextBidLevel - 1);
}
