import test from "node:test";
import assert from "node:assert/strict";

import { CUISINES, CUISINE_LIST } from "../src/data.js";
import {
  buildCustomerDeck,
  buildRestaurantDeck,
  cardPlayability,
  calculateMeal,
  chooseAiMeal,
  classifyContest,
  cleanupMeal,
  createGame,
  determineUniqueWinner,
  drawCards,
  makePlayer,
  scoreCustomer,
  scorePlayer,
  shuffle,
  tipCandidates,
} from "../src/game.js";

const stableRandom = () => 0.42;
const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

test("every documented cuisine builds a complete deck", () => {
  for (const cuisine of CUISINE_LIST) {
    const deck = buildRestaurantDeck(cuisine.id, stableRandom);
    const expected = cuisine.recipes.length
      + cuisine.ingredients.reduce((sum, item) => sum + item.count, 0)
      + cuisine.flavors.length
      + cuisine.drinks.length;
    assert.equal(deck.length, expected, cuisine.name);
    assert.equal(deck.filter((card) => card.type === "drink").length, 3);
  }
});

test("generic Ingredient Cards use cuisine-specific names without overlapping Flavor Cards", () => {
  const placeholderNames = new Set([
    "Market Ingredient",
    "Kitchen Ingredient",
    "Grill Ingredient",
    "Saray Ingredient",
    "House Ingredient",
  ]);

  for (const cuisine of CUISINE_LIST) {
    const flavorNames = new Set(cuisine.flavors.map((name) => name.toLocaleLowerCase()));
    for (const item of cuisine.ingredients) {
      assert.equal(placeholderNames.has(item.name), false, `${cuisine.name}: ${item.name}`);
      assert.equal(
        flavorNames.has(item.name.toLocaleLowerCase()),
        false,
        `${cuisine.name}: ${item.name} is both an Ingredient Card and a Flavor Card`,
      );
    }
  }
});

test("Fisher-Yates shuffling preserves every card and changes game-start order", () => {
  const ordered = ["recipe-a", "recipe-b", "ingredient-a", "flavor-a", "drink-a"];
  const shuffled = shuffle(ordered, () => 0);
  assert.deepEqual(ordered, ["recipe-a", "recipe-b", "ingredient-a", "flavor-a", "drink-a"]);
  assert.notDeepEqual(shuffled, ordered);
  assert.deepEqual([...shuffled].sort(), [...ordered].sort());

  const firstGame = createGame("italy", ["france"], () => 0.01);
  const secondGame = createGame("italy", ["france"], () => 0.99);
  assert.notDeepEqual(
    firstGame.player.hand.map((card) => card.name),
    secondGame.player.hand.map((card) => card.name),
  );
  assert.notDeepEqual(
    firstGame.opponents[0].hand.map((card) => card.name),
    secondGame.opponents[0].hand.map((card) => card.name),
  );
});

test("restaurant shuffling never uses card types to manufacture balanced hands", () => {
  const grouped = [
    { id: "a", type: "recipe" },
    { id: "b", type: "recipe" },
    { id: "c", type: "ingredient" },
    { id: "d", type: "ingredient" },
    { id: "e", type: "drink" },
    { id: "f", type: "flavor" },
  ];
  const relabeled = grouped.map((card, index) => ({
    ...card,
    type: index % 2 === 0 ? "ingredient" : "recipe",
  }));

  assert.deepEqual(
    shuffle(grouped, seededRandom(17)).map((card) => card.id),
    shuffle(relabeled, seededRandom(17)).map((card) => card.id),
  );
});

test("opening draws are statistically faithful for every restaurant deck", () => {
  const samples = 1000;

  CUISINE_LIST.forEach((cuisine, cuisineIndex) => {
    const deckSize = cuisine.recipes.length
      + cuisine.ingredients.reduce((sum, item) => sum + item.count, 0)
      + cuisine.flavors.length
      + cuisine.drinks.length;
    const typeTotals = {
      recipe: cuisine.recipes.length,
      ingredient: cuisine.ingredients.reduce((sum, item) => sum + item.count, 0),
      flavor: cuisine.flavors.length,
      drink: cuisine.drinks.length,
    };
    const observed = { recipe: 0, ingredient: 0, flavor: 0, drink: 0 };

    for (let sample = 0; sample < samples; sample += 1) {
      const random = seededRandom(10000 + (cuisineIndex * samples) + sample);
      buildRestaurantDeck(cuisine.id, random).slice(-6).forEach((card) => {
        observed[card.type] += 1;
      });
    }

    Object.entries(typeTotals).forEach(([type, total]) => {
      const expectedPerHand = (6 * total) / deckSize;
      const observedPerHand = observed[type] / samples;
      assert.ok(
        Math.abs(observedPerHand - expectedPerHand) < 0.15,
        `${cuisine.name} ${type} draws drifted from the deck's real proportion`,
      );
    });
  });
});

test("recycled discard piles receive the same fresh shuffle and cut", () => {
  for (const cuisine of CUISINE_LIST) {
    const discard = buildRestaurantDeck(cuisine.id, stableRandom)
      .sort((left, right) => left.id.localeCompare(right.id));
    const expectedDeck = shuffle(discard, seededRandom(404));
    const player = { deck: [], discard: [...discard], hand: [] };

    drawCards(player, discard.length, seededRandom(404));

    assert.deepEqual(
      player.hand.map((card) => card.id),
      [...expectedDeck].reverse().map((card) => card.id),
      cuisine.name,
    );
    assert.equal(player.discard.length, 0);
  }
});

test("the customer deck contains only cuisines selected for the match", () => {
  const cuisineIds = ["italy", "china", "mexico"];
  const customers = buildCustomerDeck(cuisineIds, stableRandom);
  assert.equal(customers.length, cuisineIds.length * 6);
  assert.deepEqual([...new Set(customers.map((customer) => customer.cuisineId))].sort(), cuisineIds.sort());
  cuisineIds.forEach((cuisineId) => {
    assert.equal(customers.filter((customer) => customer.cuisineId === cuisineId).length, 6);
  });

  const game = createGame("italy", ["china", "mexico"], stableRandom);
  const gameCustomers = [game.activeCustomer, ...game.customerDeck];
  assert.deepEqual(
    [...new Set(gameCustomers.map((customer) => customer.cuisineId))].sort(),
    cuisineIds.sort(),
  );
});

test("Italian exact pasta pairing applies ability and validates Cappuccino", () => {
  const player = makePlayer("italy", "Player", stableRandom);
  const opponent = makePlayer("france", "Rival", stableRandom);
  const recipe = { id: "r", type: "recipe", name: "Carbonara", slots: 1, match: "spaghetti" };
  const pasta = { id: "i", type: "ingredient", name: "Spaghetti", tag: "pasta", subtype: "spaghetti" };
  const drink = { id: "d", type: "drink", name: "Cappuccino", rule: "italyExact" };
  const meal = { dishes: [{ recipe, ingredients: [pasta], flavor: null }], drink };
  const customer = { nationality: "italy" };
  const result = calculateMeal(meal, "italy", customer, player, opponent, 3);

  assert.equal(result.total, 6);
  assert.equal(result.breakdown.Ability, 1);
  assert.equal(result.breakdown.Drink, 3);
  assert.equal(result.validDrink, true);
  assert.deepEqual(tipCandidates(meal, "italy", []).map((card) => card.name), ["Spaghetti"]);
});

test("customer difficulty bonuses use ingredients actually added", () => {
  const player = makePlayer("china", "Player", stableRandom);
  const opponent = makePlayer("france", "Rival", stableRandom);
  const easy = { recipe: { id: "r1", type: "recipe", name: "Easy", slots: 2 }, ingredients: [], flavor: null };
  const hard = {
    recipe: { id: "r2", type: "recipe", name: "Hard", slots: 2 },
    ingredients: [
      { id: "i1", type: "ingredient", name: "One" },
      { id: "i2", type: "ingredient", name: "Two" },
    ],
    flavor: null,
  };
  const meal = { dishes: [easy, hard], drink: null };
  const chineseGuest = { nationality: "china" };
  const japaneseGuest = { nationality: "japan" };

  assert.equal(calculateMeal(meal, "france", chineseGuest, player, opponent).breakdown.Customer, 1);
  assert.equal(calculateMeal(meal, "france", japaneseGuest, player, opponent).breakdown.Customer, 1);
});

test("highest unique value cancels tied leaders", () => {
  const winner = determineUniqueWinner([
    { id: "italy", value: 7, competing: true },
    { id: "france", value: 7, competing: true },
    { id: "china", value: 5, competing: true },
    { id: "mexico", value: 4, competing: true },
  ]);
  assert.equal(winner, "china");
  assert.equal(determineUniqueWinner([
    { id: "one", value: 4, competing: true },
    { id: "two", value: 4, competing: true },
  ]), null);
});

test("contest classification exposes tie cancellation and the next unique winner", () => {
  const result = classifyContest([
    { id: "italy", value: 7, competing: true },
    { id: "france", value: 7, competing: true },
    { id: "china", value: 5, competing: true },
    { id: "mexico", value: 4, competing: true },
    { id: "passed", value: 0, competing: false },
  ]);
  assert.deepEqual(result.map(({ id, status }) => [id, status]), [
    ["italy", "cancelled"],
    ["france", "cancelled"],
    ["china", "winner"],
    ["mexico", "outscored"],
    ["passed", "passed"],
  ]);
});

test("card playability explains invalid sequencing and capacity", () => {
  const ingredient = { id: "i", type: "ingredient", name: "Spice" };
  const recipe = { id: "r", type: "recipe", name: "Soup", slots: 0 };
  const empty = { dishes: [], drink: null };
  assert.deepEqual(cardPlayability(ingredient, empty, "france", 1), {
    playable: false,
    reason: "Serve a recipe before adding ingredients.",
  });

  const fullMeal = { dishes: [{ recipe, ingredients: [], flavor: null }], drink: null };
  assert.match(cardPlayability(recipe, fullMeal, "france", 1).reason, /at most 1 dish/);
  assert.equal(cardPlayability(ingredient, fullMeal, "france", 1).playable, false);
  assert.equal(cardPlayability({ id: "f", type: "flavor", name: "Herbs" }, fullMeal, "france", 1).playable, true);
});

test("a multiplayer table falls through tied leaders to the next unique meal", () => {
  assert.equal(determineUniqueWinner([
    { id: "one", value: 9, competing: true },
    { id: "two", value: 9, competing: true },
    { id: "three", value: 7, competing: true },
    { id: "four", value: 6, competing: true },
  ]), "three");
});

test("customer score adds Tips Value only after its threshold", () => {
  const customer = { order: 2, tips: 2 };
  assert.deepEqual(scoreCustomer(customer, 1), {
    orderVp: 2,
    tipsVp: 0,
    tipsUnlocked: false,
    total: 2,
  });
  assert.deepEqual(scoreCustomer(customer, 2), {
    orderVp: 2,
    tipsVp: 2,
    tipsUnlocked: true,
    total: 4,
  });

  const player = { customers: [{ order: 2, tips: 2 }, { order: 3, tips: 1 }], tips: [] };
  assert.equal(scorePlayer(player), 5);
  player.tips.push({ id: "t1" });
  assert.equal(scorePlayer(player), 6);
  player.tips.push({ id: "t2" });
  assert.equal(scorePlayer(player), 8);
});

test("tracked Tips Cards remain set aside from the discard and draw cycle", () => {
  const trackedCard = { id: "tracked", type: "ingredient", name: "Spaghetti" };
  const recipe = { id: "recipe", type: "recipe", name: "Carbonara", slots: 1 };
  const player = { tips: [], discard: [], meal: null };
  const meal = {
    dishes: [{ recipe, ingredients: [trackedCard], flavor: null }],
    drink: null,
  };
  cleanupMeal(player, meal, trackedCard);
  assert.deepEqual(player.tips, [trackedCard]);
  assert.deepEqual(player.discard, [recipe]);
  assert.equal(player.discard.includes(trackedCard), false);
});

test("AI builds a legal meal within the customer order", () => {
  const player = makePlayer("usa", "Rival", stableRandom);
  const opponent = makePlayer("mexico", "Player", stableRandom);
  player.hand = buildRestaurantDeck("usa", stableRandom)
    .sort((a, b) => (a.type === "recipe" ? -1 : 1) - (b.type === "recipe" ? -1 : 1))
    .slice(0, 8);
  const customer = { nationality: "mexico", order: 2 };
  const meal = chooseAiMeal(player, opponent, customer);
  assert.ok(meal.dishes.length > 0);
  assert.ok(meal.dishes.length <= 2);
});

test("a game can create three independently selected AI restaurants", () => {
  const game = createGame("italy", ["france", "china", "mexico"], stableRandom);
  assert.equal(game.opponents.length, 3);
  assert.deepEqual(game.opponents.map((player) => player.cuisineId), ["france", "china", "mexico"]);
  assert.deepEqual(game.opponents.map((player) => player.name), ["Rival 1", "Rival 2", "Rival 3"]);
});

test("Turkish customer catch-up checks every rival at the table", () => {
  const player = makePlayer("italy", "Player", stableRandom);
  const levelRival = makePlayer("france", "Rival 1", stableRandom);
  const leadingRival = makePlayer("china", "Rival 2", stableRandom);
  leadingRival.tips.push({ id: "tip" });
  const meal = {
    dishes: [{ recipe: { id: "r", type: "recipe", name: "Dish", slots: 0 }, ingredients: [], flavor: null }],
    drink: null,
  };
  const result = calculateMeal(meal, "italy", { nationality: "turkey" }, player, [levelRival, leadingRival]);
  assert.equal(result.breakdown.Customer, 1);
});

test("all cuisine ids remain stable for saved game compatibility", () => {
  assert.deepEqual(Object.keys(CUISINES), [
    "italy", "france", "china", "india", "usa", "turkey", "japan", "mexico",
  ]);
});
