// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { DECKS } from '../data/decks.ts';
import { assignBotPolicies, BOT_POLICIES, playBotPlayers, refreshForBot } from './bot.ts';
import {
  addIngredient,
  createGame,
  discardFromHand,
  drinkRequirementMet,
  eligiblePromotionCard,
  GAME_ROUND_LIMIT,
  refreshHand,
  resolveRound,
  scoreFor,
  serveRecipe,
  valueBreakdown,
  type CardInstance,
  type PlayerState,
} from './engine.ts';
import { runGame } from './simulation.ts';

const allPlayerCards = (player: PlayerState) => [
  ...player.hand,
  ...player.drawPile,
  ...player.discard,
];

const cardNamed = (player: PlayerState, name: string, occurrence = 0) => {
  const card = allPlayerCards(player).filter((item) => item.name === name)[occurrence];
  assert.ok(card, `Expected ${name} card ${occurrence + 1}.`);
  return card;
};

const setHand = (player: PlayerState, cards: CardInstance[]) => {
  const ids = new Set(cards.map((card) => card.id));
  const allCards = allPlayerCards(player);
  player.hand = [...cards];
  player.drawPile = allCards.filter((card) => !ids.has(card.id));
  player.discard = [];
};

test('deck data matches the revised card distributions', () => {
  const italy = DECKS.find((deck) => deck.id === 'italy')!;
  const italyPasta = italy.ingredients.filter((card) => card.tags?.includes('pasta'));
  assert.equal(italyPasta.reduce((sum, card) => sum + card.count, 0), 13);
  for (const name of ['Spaghetti', 'Fettuccine', 'Tagliatelle', 'Lasagna Sheets', 'Penne']) {
    assert.equal(italyPasta.find((card) => card.name === name)?.count, 2);
  }

  const china = DECKS.find((deck) => deck.id === 'china')!;
  assert.equal(china.ingredients.reduce((sum, card) => sum + card.count, 0), 15);
  assert.equal(china.recipes.filter((card) => card.tags?.includes('rice')).length, 6);
  assert.equal(china.recipes.filter((card) => card.tags?.includes('noodles')).length, 6);
  assert.deepEqual(china.recipes.find((card) => card.name === 'Lo Mein')?.tags, ['noodles']);

  const india = DECKS.find((deck) => deck.id === 'india')!;
  assert.equal(india.ingredients.filter((card) => card.tags?.includes('spice')).length, 6);
  assert.equal(
    india.ingredients
      .filter((card) => card.tags?.includes('spice'))
      .reduce((sum, card) => sum + card.count, 0),
    12,
  );
  assert.ok(india.recipes.some((card) => card.name === 'Chicken Curry'));

  const japan = DECKS.find((deck) => deck.id === 'japan')!;
  assert.equal(japan.ingredients.find((card) => card.name === 'Ingredient Card')?.count, 5);
  assert.equal(japan.ingredients.find((card) => card.name === 'Wasabi')?.count, 2);
  assert.equal(japan.ingredients.find((card) => card.name === 'Garlic')?.count, 2);
  assert.equal(
    japan.ingredients
      .filter((card) => card.tags?.includes('seasoning'))
      .reduce((sum, card) => sum + card.count, 0),
    8,
  );

  const mexico = DECKS.find((deck) => deck.id === 'mexico')!;
  const hot = mexico.ingredients.filter((card) => card.tags?.includes('hot'));
  assert.equal(hot.length, 6);
  assert.ok(hot.every((card) => card.count === 1));
  assert.equal(mexico.ingredients.find((card) => card.name === 'Avocado')?.count, 4);
  assert.equal(mexico.ingredients.find((card) => card.name === 'Corn')?.count, 3);
});

test('customers use one Order Value for dish count, base VP, and the +1 Promotion threshold', () => {
  for (const deck of DECKS) {
    assert.deepEqual(deck.customers.map((customer) => customer.order), [1, 1, 2, 2, 3, 3]);
    assert.equal(deck.customers.some((customer) => 'promotions' in customer), false);
  }

  const state = createGame(DECKS, ['italy'], 99);
  const player = state.players[0];
  player.scoring = [
    { kind: 'customer', order: 2 },
    { kind: 'customer', order: 3 },
  ] as CardInstance[];
  assert.equal(scoreFor(player), 5);
  player.promotions = [{ id: 'p1' }, { id: 'p2' }] as CardInstance[];
  assert.equal(scoreFor(player), 6);
  player.promotions.push({ id: 'p3' } as CardInstance);
  assert.equal(scoreFor(player), 7);
});

test('the full shared customer deck is shuffled but only 10 customers are resolved', () => {
  const state = createGame(DECKS, ['italy', 'france'], 98);
  assert.equal(state.customerDeck.length + Number(Boolean(state.activeCustomer)), 12);

  const unrestrictedShuffleObserved = Array.from({ length: 32 }, (_, seed) =>
    createGame(DECKS, ['italy', 'france'], seed + 1))
    .some((game) => {
      const customers = [game.activeCustomer, ...game.customerDeck].filter(Boolean);
      return customers.some((customer, index) =>
        index > 0 && customer.deckId === customers[index - 1].deckId);
    });
  assert.equal(unrestrictedShuffleObserved, true);

  for (let round = 0; round < GAME_ROUND_LIMIT; round += 1) {
    assert.notEqual(state.phase, 'game-over');
    resolveRound(state, () => false);
  }

  assert.equal(state.phase, 'game-over');
  assert.equal(state.round, GAME_ROUND_LIMIT);
  assert.equal(state.customerDeck.length, 2);
  assert.equal(state.customerDiscard.length, GAME_ROUND_LIMIT);
});

test('open bids spend the selected promotion and only chosen non-winners track', () => {
  const state = createGame(DECKS, ['italy', 'france', 'china'], 100);
  const [italy, france, china] = state.players;
  state.activeCustomer!.deckId = 'italy';
  state.activeCustomer!.order = 1;
  italy.meal = [{ id: 'i', recipe: cardNamed(italy, 'Farfalle al Salmone'), ingredients: [] }];
  france.meal = [{ id: 'f', recipe: cardNamed(france, 'Ratatouille'), ingredients: [] }];
  china.meal = [{ id: 'c', recipe: cardNamed(china, 'Mapo Tofu'), ingredients: [] }];
  const keptPromotion = { id: 'italy-keep', name: 'Kept promotion' } as CardInstance;
  const spentPromotion = { id: 'italy-spend', name: 'Spent promotion' } as CardInstance;
  italy.promotions = [keptPromotion, spentPromotion];
  france.promotions = [{ id: 'france-promo', name: 'Old promotion', tags: ['entree'] } as CardInstance];

  const resolution = resolveRound(state, ({ player, role }) =>
    player.id === italy.id && role === 'raise' ? spentPromotion : null,
  ({ player, eligibleCards }) => player.id === france.id ? eligibleCards[0] : null);

  assert.equal(resolution?.winnerId, italy.id);
  assert.deepEqual(resolution?.promotionBids, { [italy.id]: 1 });
  assert.equal(italy.scoring.length, 1);
  assert.deepEqual(italy.promotions.map((card) => card.id), ['italy-keep']);
  assert.equal(italy.discard.some((card) => card.id === 'italy-spend'), true);
  assert.equal(france.promotions.length, 2);
  assert.equal(france.promotions.some((card) => card.name === 'Ratatouille'), true);
  assert.equal(china.promotions.length, 0);
});

test('Promotion tracking may be declined', () => {
  const state = createGame(DECKS, ['italy', 'france'], 1010);
  const [italy, france] = state.players;
  state.activeCustomer!.deckId = 'italy';
  state.activeCustomer!.order = 1;
  italy.meal = [{
    id: 'winner',
    recipe: cardNamed(italy, 'Spaghetti Carbonara'),
    ingredients: [cardNamed(italy, 'Spaghetti')],
  }];
  france.meal = [{ id: 'loser', recipe: cardNamed(france, 'Ratatouille'), ingredients: [] }];

  const resolution = resolveRound(state, () => null, () => null);

  assert.equal(resolution?.winnerId, italy.id);
  assert.equal(france.promotions.length, 0);
  assert.equal(france.discard.some((card) => card.name === 'Ratatouille'), true);
});

test('seeded bid initiative rotates between seats', () => {
  const winners = new Set<string>();
  for (let seed = 1; seed <= 32; seed += 1) {
    const state = createGame(DECKS, ['italy', 'france'], seed);
    const [italy, france] = state.players;
    state.activeCustomer!.deckId = 'italy';
    state.activeCustomer!.order = 1;
    italy.meal = [{ id: 'i', recipe: cardNamed(italy, 'Farfalle al Salmone'), ingredients: [] }];
    france.meal = [{ id: 'f', recipe: cardNamed(france, 'Tourin'), ingredients: [] }];
    italy.promotions = [{ id: `i-${seed}`, name: 'Italy promotion' } as CardInstance];
    france.promotions = [{ id: `f-${seed}`, name: 'France promotion' } as CardInstance];

    const resolution = resolveRound(state, ({ player, role }) =>
      role === 'raise' ? player.promotions[0] : null);
    if (resolution?.winnerId) winners.add(resolution.winnerId);
  }

  assert.deepEqual(winners, new Set(['p1', 'p2']));
});

test('Drink Card requirements use explicit card types and quantities', () => {
  const vagueTerms = /overstuffed|exact pasta pairing|same type|hard dish|normal dish|with flavor/i;
  const drinks = DECKS.flatMap((deck) => deck.drinks);
  const rootBeer = DECKS
    .find((deck) => deck.id === 'usa')!
    .drinks.find((card) => card.name === 'Root Beer')!;

  assert.equal(
    rootBeer.requirement,
    "At least 1 dish has more Ingredient Cards than its Recipe Card's printed slots.",
  );
  for (const drinkCard of drinks) {
    assert.equal(
      vagueTerms.test(drinkCard.requirement),
      false,
      `${drinkCard.name}: ${drinkCard.requirement}`,
    );
  }
});

test('Limoncello checks pasta Ingredient Cards actually added to the meal', () => {
  const state = createGame(DECKS, ['italy'], 1001);
  const italy = state.players[0];
  const limoncello = cardNamed(italy, 'Limoncello');
  const carbonara = cardNamed(italy, 'Spaghetti Carbonara');
  const alfredo = cardNamed(italy, 'Fettuccine Alfredo');
  const spaghetti = cardNamed(italy, 'Spaghetti');
  const fettuccine = cardNamed(italy, 'Fettuccine');
  italy.meal = [
    { id: 'i1', recipe: carbonara, ingredients: [] },
    { id: 'i2', recipe: alfredo, ingredients: [] },
  ];
  assert.equal(drinkRequirementMet(italy, limoncello), false);
  italy.meal[0].ingredients.push(spaghetti);
  italy.meal[1].ingredients.push(fettuccine);
  assert.equal(drinkRequirementMet(italy, limoncello), true);
});

test('Italy, China, India, and Japan abilities use the latest scoring rules', () => {
  const italyState = createGame(DECKS, ['italy'], 101);
  const italy = italyState.players[0];
  const carbonara = cardNamed(italy, 'Spaghetti Carbonara');
  const spaghetti = cardNamed(italy, 'Spaghetti');
  italy.meal = [{ id: 'italy-dish', recipe: carbonara, ingredients: [spaghetti] }];
  italyState.activeCustomer!.deckId = 'italy';
  const italyBreakdown = valueBreakdown(italyState, italy);
  assert.equal(italyBreakdown.ability, 1);
  assert.equal(italyBreakdown.total, 3);

  const chinaState = createGame(DECKS, ['china'], 102);
  const china = chinaState.players[0];
  china.meal = [
    { id: 'c1', recipe: cardNamed(china, 'Congee'), ingredients: [] },
    { id: 'c2', recipe: cardNamed(china, 'Sticky Rice with Mango'), ingredients: [] },
    { id: 'c3', recipe: cardNamed(china, 'Zha Jiang Mian'), ingredients: [] },
  ];
  chinaState.activeCustomer!.deckId = 'italy';
  assert.equal(valueBreakdown(chinaState, china).ability, 3);
  china.meal = [
    { id: 'c1', recipe: cardNamed(china, 'Congee'), ingredients: [] },
    { id: 'c2', recipe: cardNamed(china, 'Sticky Rice with Mango'), ingredients: [] },
    { id: 'c3', recipe: cardNamed(china, 'Hainanese Chicken Rice'), ingredients: [] },
  ];
  chinaState.activeCustomer!.deckId = 'italy';
  assert.equal(valueBreakdown(chinaState, china).ability, 3);

  const indiaState = createGame(DECKS, ['india'], 103);
  const india = indiaState.players[0];
  india.meal = [
    {
      id: 'i1',
      recipe: cardNamed(india, 'Biryani'),
      ingredients: [cardNamed(india, 'Cumin')],
    },
    {
      id: 'i2',
      recipe: cardNamed(india, 'Dal Tadka'),
      ingredients: [cardNamed(india, 'Saffron')],
    },
    {
      id: 'i3',
      recipe: cardNamed(india, 'Masoor Dal'),
      ingredients: [cardNamed(india, 'Coriander')],
    },
  ];
  indiaState.activeCustomer!.deckId = 'italy';
  assert.equal(valueBreakdown(indiaState, india).ability, 3);

  const japanState = createGame(DECKS, ['japan'], 104);
  const japan = japanState.players[0];
  const recipes = [
    cardNamed(japan, 'Miso Ramen'),
    cardNamed(japan, 'Tonkotsu Ramen'),
    cardNamed(japan, 'California Roll'),
  ];
  const umami = cardNamed(japan, 'Umami');
  const ginger = cardNamed(japan, 'Ginger');
  const wasabi1 = cardNamed(japan, 'Wasabi', 0);
  const wasabi2 = cardNamed(japan, 'Wasabi', 1);
  japan.meal = [
    { id: 'j1', recipe: recipes[0], ingredients: [umami] },
    { id: 'j2', recipe: recipes[1], ingredients: [ginger] },
    { id: 'j3', recipe: recipes[2], ingredients: [wasabi2] },
  ];
  japan.meal[2].ingredients.push(wasabi1);
  japanState.activeCustomer!.deckId = 'italy';
  assert.equal(valueBreakdown(japanState, japan).ability, 0);
  japan.meal = [{ id: 'j1', recipe: recipes[0], ingredients: [umami] }];
  assert.equal(valueBreakdown(japanState, japan).ability, 1);
});

test('USA can use two extra Ingredients and Mexico caps hot Ingredients at two per meal', () => {
  const usaState = createGame(DECKS, ['usa'], 105);
  const usa = usaState.players[0];
  const usaCards = [
    cardNamed(usa, 'Lobster Roll'),
    cardNamed(usa, 'Cornbread'),
    cardNamed(usa, 'Ingredient Card', 0),
    cardNamed(usa, 'Ingredient Card', 1),
    cardNamed(usa, 'Ingredient Card', 2),
  ];
  setHand(usa, usaCards);
  usaState.activeCustomer!.order = 2;
  serveRecipe(usaState, usa.id, usaCards[0].id);
  serveRecipe(usaState, usa.id, usaCards[1].id);
  addIngredient(usaState, usa.id, usa.meal[0].id, usaCards[2].id);
  addIngredient(usaState, usa.id, usa.meal[1].id, usaCards[3].id);
  addIngredient(usaState, usa.id, usa.meal[0].id, usaCards[4].id);
  assert.equal(usa.meal[0].ingredients.length, 1);
  assert.equal(usa.meal[1].ingredients.length, 1);

  const mexicoState = createGame(DECKS, ['mexico'], 106);
  const mexico = mexicoState.players[0];
  const quesadilla = cardNamed(mexico, 'Quesadilla');
  const taco = cardNamed(mexico, 'Taco de Frijoles');
  const mole = cardNamed(mexico, 'Mole Poblano with Rice');
  const cayenne = cardNamed(mexico, 'Cayenne Pepper');
  const chipotle = cardNamed(mexico, 'Chipotle');
  const habanero = cardNamed(mexico, 'Habanero');
  const corn = cardNamed(mexico, 'Corn');
  setHand(mexico, [quesadilla, taco, mole, cayenne, chipotle, habanero, corn]);
  mexicoState.activeCustomer!.order = 3;
  serveRecipe(mexicoState, mexico.id, quesadilla.id);
  serveRecipe(mexicoState, mexico.id, taco.id);
  serveRecipe(mexicoState, mexico.id, mole.id);
  addIngredient(mexicoState, mexico.id, mexico.meal[0].id, cayenne.id);
  addIngredient(mexicoState, mexico.id, mexico.meal[1].id, chipotle.id);
  addIngredient(mexicoState, mexico.id, mexico.meal[2].id, habanero.id);
  assert.equal(mexico.meal[0].ingredients[0]?.name, 'Cayenne Pepper');
  assert.equal(mexico.meal[1].ingredients[0]?.name, 'Chipotle');
  assert.equal(mexico.meal[2].ingredients.length, 0);
  mexicoState.activeCustomer!.deckId = 'italy';
  const mexicoBreakdown = valueBreakdown(mexicoState, mexico);
  assert.equal(mexicoBreakdown.ability, 2);
  assert.equal(mexicoBreakdown.total, 7);
  addIngredient(mexicoState, mexico.id, mexico.meal[0].id, corn.id);
  assert.equal(mexico.meal[0].ingredients.length, 1);
});

test('China, USA, Japan, and Mexico Promotions eligibility follows the revised requirements', () => {
  const chinaState = createGame(DECKS, ['china'], 107);
  const china = chinaState.players[0];
  const rice1 = cardNamed(china, 'Sticky Rice with Mango');
  const rice2 = cardNamed(china, 'Congee');
  const noodles = cardNamed(china, 'Zha Jiang Mian');
  const untyped = cardNamed(china, 'Mapo Tofu');
  china.meal = [
    { id: 'c1', recipe: rice1, ingredients: [] },
    { id: 'c2', recipe: noodles, ingredients: [] },
  ];
  assert.equal(eligiblePromotionCard(china), null);
  china.meal[1] = { id: 'c2', recipe: rice2, ingredients: [] };
  assert.equal(eligiblePromotionCard(china)?.name, 'Sticky Rice with Mango');
  china.meal[1] = { id: 'c2', recipe: untyped, ingredients: [] };
  assert.equal(eligiblePromotionCard(china), null);

  const usaState = createGame(DECKS, ['usa'], 108);
  const usa = usaState.players[0];
  const burger = cardNamed(usa, 'Juicy Lucy');
  const steak = cardNamed(usa, 'T-bone Steak');
  usa.promotions = [burger];
  usa.meal = [{ id: 'u1', recipe: steak, ingredients: [] }];
  assert.equal(eligiblePromotionCard(usa)?.name, 'T-bone Steak');

  const japanState = createGame(DECKS, ['japan'], 109);
  const japan = japanState.players[0];
  const japanRecipe = cardNamed(japan, 'Miso Ramen');
  const wasabi1 = cardNamed(japan, 'Wasabi', 0);
  const wasabi2 = cardNamed(japan, 'Wasabi', 1);
  const ginger = cardNamed(japan, 'Ginger');
  japan.promotions = [wasabi1];
  japan.meal = [{ id: 'j1', recipe: japanRecipe, ingredients: [wasabi2] }];
  assert.equal(eligiblePromotionCard(japan), null);
  japan.meal = [{ id: 'j1', recipe: japanRecipe, ingredients: [ginger] }];
  assert.equal(eligiblePromotionCard(japan)?.name, 'Ginger');

  const mexicoState = createGame(DECKS, ['mexico'], 109);
  const mexico = mexicoState.players[0];
  const recipe = cardNamed(mexico, 'Mole Poblano with Rice');
  const corn = cardNamed(mexico, 'Corn');
  const hot = cardNamed(mexico, 'Poblano');
  mexico.meal = [{ id: 'm1', recipe, ingredients: [corn] }];
  assert.equal(eligiblePromotionCard(mexico), null);
  mexico.meal = [{ id: 'm1', recipe, ingredients: [hot] }];
  assert.equal(eligiblePromotionCard(mexico)?.name, 'Poblano');
  mexico.promotions = [hot, corn, recipe];
  assert.equal(eligiblePromotionCard(mexico), null);
});

test('Italy Promotion eligibility requires the exact Ingredient on its matching dish', () => {
  const state = createGame(DECKS, ['italy'], 1002);
  const italy = state.players[0];
  const carbonara = cardNamed(italy, 'Spaghetti Carbonara');
  const alfredo = cardNamed(italy, 'Fettuccine Alfredo');
  const spaghetti = cardNamed(italy, 'Spaghetti');
  const fettuccine = cardNamed(italy, 'Fettuccine');
  italy.meal = [
    { id: 'i1', recipe: carbonara, ingredients: [fettuccine] },
    { id: 'i2', recipe: alfredo, ingredients: [spaghetti] },
  ];
  assert.equal(eligiblePromotionCard(italy), null);
  italy.meal[0].ingredients = [spaghetti];
  assert.equal(eligiblePromotionCard(italy)?.id, spaghetti.id);
});

test('mixed policy assignment rotates every strategy across four seats', () => {
  const ids = ['p1', 'p2', 'p3', 'p4'];
  const first = assignBotPolicies('mixed', ids, 200);
  const second = assignBotPolicies('mixed', ids, 201);
  assert.deepEqual(new Set(first.values()), new Set(BOT_POLICIES));
  assert.notEqual(first.get('p1'), second.get('p1'));
});

test('Promotions policy selects a hot Mexican Ingredient when serve values are equal', () => {
  const state = createGame(DECKS, ['mexico'], 107);
  const player = state.players[0];
  const recipe = cardNamed(player, 'Mole Poblano with Rice');
  const hot = cardNamed(player, 'Cayenne Pepper');
  const corn = cardNamed(player, 'Corn');
  setHand(player, [recipe, hot, corn]);
  player.drawPile = [];
  state.activeCustomer!.order = 1;
  playBotPlayers(state, [player.id], 'promotions');
  assert.equal(state.players[0].meal[0]?.ingredients[0]?.name, 'Cayenne Pepper');
});

test('cautious policy can decline a historically common serve value', () => {
  const state = createGame(DECKS, ['usa'], 108);
  const player = state.players[0];
  const recipe = cardNamed(player, 'Lobster Roll');
  const ingredient = cardNamed(player, 'Ingredient Card');
  setHand(player, [recipe, ingredient]);
  player.drawPile = [];
  state.activeCustomer!.order = 1;
  state.serveHistory = Array.from({ length: 10 }, (_, index) => ({
    round: index + 1,
    playerId: 'opponent',
    deckId: 'france' as const,
    customerDeckId: state.activeCustomer!.deckId,
    order: 1,
    serveValue: 2,
  }));
  state.round = 11;
  playBotPlayers(state, [player.id], 'cautious');
  assert.equal(state.players[0].meal[0]?.ingredients.length, 0);
});

test('bots exploit customer effects and conserve cards when serve value is equal', () => {
  const chinaState = createGame(DECKS, ['france'], 120);
  const chinaPlayer = chinaState.players[0];
  const chinaCards = [
    cardNamed(chinaPlayer, 'Quiche Lorraine'),
    cardNamed(chinaPlayer, 'Ingredient Card'),
  ];
  setHand(chinaPlayer, chinaCards);
  chinaPlayer.drawPile = [];
  chinaState.activeCustomer!.deckId = 'china';
  chinaState.activeCustomer!.order = 1;
  const [chinaSummary] = playBotPlayers(chinaState, [chinaPlayer.id], 'greedy');
  assert.equal(chinaState.players[0].meal[0]?.ingredients.length, 0);
  assert.equal(chinaSummary.customerEffectValue, 1);

  const usaState = createGame(DECKS, ['france'], 121);
  const usaPlayer = usaState.players[0];
  const usaCards = [
    cardNamed(usaPlayer, 'Quiche Lorraine'),
    cardNamed(usaPlayer, 'Ingredient Card'),
    cardNamed(usaPlayer, 'Champagne'),
  ];
  setHand(usaPlayer, usaCards);
  usaPlayer.drawPile = [];
  usaState.activeCustomer!.deckId = 'usa';
  usaState.activeCustomer!.order = 1;
  const [usaSummary] = playBotPlayers(usaState, [usaPlayer.id], 'greedy');
  assert.equal(usaState.players[0].meal[0]?.ingredients.length, 0);
  assert.equal(usaSummary.customerEffectValue, 1);
});

test('Promotions policy uses the French full-hand redraw when the hand has no Promotions path', () => {
  const state = createGame(DECKS, ['china'], 109);
  const player = state.players[0];
  state.activeCustomer!.deckId = 'france';
  state.activeCustomer!.order = 2;
  const hand = [
    cardNamed(player, 'Mapo Tofu'),
    cardNamed(player, 'Ingredient Card', 0),
    cardNamed(player, 'Ingredient Card', 1),
    cardNamed(player, 'Shiitake Mushrooms'),
    cardNamed(player, 'Soy Sauce'),
    cardNamed(player, 'Green Tea'),
  ];
  setHand(player, hand);
  const originalIds = new Set(hand.map((card) => card.id));
  refreshForBot(state, player.id, 'promotions');
  assert.equal(player.hand.length, 6);
  assert.ok(player.discard.some((card) => originalIds.has(card.id)));
});

test('refresh draws first and then replaces up to two cards', () => {
  const state = createGame(DECKS, ['china'], 111);
  const player = state.players[0];
  state.activeCustomer!.deckId = 'china';
  const initialHand = allPlayerCards(player).slice(0, 4);
  setHand(player, initialHand);
  player.refreshDiscards = 0;
  player.refreshDraws = 0;

  refreshHand(state, player.id);
  assert.equal(player.hand.length, 6);
  const newlyDrawn = player.hand.find((card) =>
    !initialHand.some((initial) => initial.id === card.id));
  assert.ok(newlyDrawn);

  discardFromHand(state, player.id, newlyDrawn.id);
  discardFromHand(state, player.id, initialHand[0].id);
  assert.equal(player.hand.length, 6);
  assert.equal(player.refreshDiscards, 2);
  assert.ok(player.discard.some((card) => card.id === newlyDrawn.id));
  assert.ok(player.discard.some((card) => card.id === initialHand[0].id));

  const handAfterTwoReplacements = player.hand.map((card) => card.id);
  discardFromHand(state, player.id, player.hand[0].id);
  assert.deepEqual(player.hand.map((card) => card.id), handAfterTwoReplacements);
});

test('mixed games rotate all policies and never play unsuccessful Drinks', () => {
  const game = runGame({
    games: 1,
    players: 4,
    decks: ['italy', 'france', 'china', 'india'],
    seed: 110,
    policy: 'mixed',
  }, 110);
  assert.deepEqual(new Set(game.players.map((player) => player.policy)), new Set(BOT_POLICIES));
  assert.equal(game.drinkAttempts, game.drinkSuccesses);
  assert.equal(game.rounds, GAME_ROUND_LIMIT);
  assert.equal(game.roundResults.length, game.contestedRounds);
  assert.ok(game.roundResults.every((round) => round.players.length === 4));
  assert.ok(game.roundResults.every((round) =>
    round.players.every((player) => Number.isFinite(player.serveValue)),
  ));
});
