import type {
  CuisineId,
  CustomerSymbol,
  DeckDefinition,
  IngredientDefinition,
  IngredientType,
  RecipeDefinition,
  RecipeDifficulty,
} from '../data/decks';

export type CardKind = 'ingredient' | 'recipe' | 'drink' | 'customer';

export interface CardInstance {
  id: string;
  deckId: CuisineId;
  deckName: string;
  deckColor: string;
  kind: CardKind;
  name: string;
  emoji: string;
  tags: string[];
  ingredientType?: IngredientType;
  difficulty?: RecipeDifficulty;
  exactIngredient?: string;
  requirement?: string;
  base?: number;
  tips?: number;
  symbol?: CustomerSymbol;
}

export interface Dish {
  id: string;
  recipe: CardInstance;
  ingredients: CardInstance[];
  baseValue: number;
}

export interface Competitor {
  playerId: string;
  side: 'left' | 'right';
  dishes: Dish[];
}

export interface QueueCustomer {
  id: string;
  card: CardInstance;
  competitors: Competitor[];
}

export interface PlayerState {
  id: string;
  name: string;
  deckId: CuisineId;
  deckName: string;
  flag: string;
  color: string;
  ability: string;
  endCondition: string;
  tracking: string;
  drawPile: CardInstance[];
  discard: CardInstance[];
  hand: CardInstance[];
  prepared: CardInstance[];
  cooked: Dish[];
  scoring: CardInstance[];
  tips: CardInstance[];
}

export interface GameState {
  seed: number;
  round: number;
  activePlayerIndex: number;
  players: PlayerState[];
  customerDeck: CardInstance[];
  queue: QueueCustomer[];
  customerDiscard: CardInstance[];
  finalRound: number | null;
  isGameOver: boolean;
  log: string[];
}

const RECIPE_REQUIREMENTS: Record<RecipeDifficulty, { primary: number; secondary: number; value: number }> = {
  easy: { primary: 1, secondary: 0, value: 1 },
  normal: { primary: 1, secondary: 1, value: 2 },
  hard: { primary: 1, secondary: 2, value: 3 },
};

export const RULE_NOTES = [
  'Easy recipes require 1 primary ingredient.',
  'Normal recipes use 1 primary and 1 secondary; hard recipes use 1 primary and 2 secondary.',
  'Optional ingredients add +1 serve value each.',
  'Drink requirements are shown for testing, but drink play is intentionally manual.',
];

const SYMBOL_EMOJI: Record<CustomerSymbol, string> = {
  'cutting board': '',
  'cooking pot': '',
  swap: '',
  'playing cards': '',
};

export const symbolEmoji = (symbol?: CustomerSymbol) => (symbol ? SYMBOL_EMOJI[symbol] : '');

const makeRng = (seed: number) => {
  let t = seed || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], seed: number): T[] => {
  const rng = makeRng(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

let nextRuntimeId = 1;

const cardId = (deckId: CuisineId, slug: string) => `${deckId}-${slug}-${nextRuntimeId++}`;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const expandIngredients = (deck: DeckDefinition, definition: IngredientDefinition): CardInstance[] =>
  Array.from({ length: definition.count }, (_, index) => ({
    id: cardId(deck.id, `${slugify(definition.name)}-${index + 1}`),
    deckId: deck.id,
    deckName: deck.shortName,
    deckColor: deck.color,
    kind: 'ingredient',
    name: definition.name,
    emoji: definition.emoji,
    tags: definition.tags ?? [],
    ingredientType: definition.type,
  }));

const expandRecipe = (deck: DeckDefinition, definition: RecipeDefinition): CardInstance => ({
  id: cardId(deck.id, slugify(definition.name)),
  deckId: deck.id,
  deckName: deck.shortName,
  deckColor: deck.color,
  kind: 'recipe',
  name: definition.name,
  emoji: definition.emoji,
  tags: definition.tags ?? [],
  difficulty: definition.difficulty,
  exactIngredient: definition.exactIngredient,
});

const buildPlayerDeck = (deck: DeckDefinition) => [
  ...deck.ingredients.flatMap((ingredient) => expandIngredients(deck, ingredient)),
  ...deck.recipes.map((recipe) => expandRecipe(deck, recipe)),
  ...deck.drinks.map((drink) => ({
    id: cardId(deck.id, slugify(drink.name)),
    deckId: deck.id,
    deckName: deck.shortName,
    deckColor: deck.color,
    kind: 'drink' as const,
    name: drink.name,
    emoji: drink.emoji,
    tags: [],
    requirement: drink.requirement,
  })),
];

const buildCustomers = (deck: DeckDefinition) =>
  deck.customers.map((customer, index) => ({
    id: cardId(deck.id, `customer-${index + 1}`),
    deckId: deck.id,
    deckName: deck.shortName,
    deckColor: deck.color,
    kind: 'customer' as const,
    name: `${deck.shortName} Customer ${index + 1}`,
    emoji: deck.flag,
    tags: [],
    base: customer.base,
    tips: customer.tips,
    symbol: customer.symbol,
  }));

const draw = (player: PlayerState, count: number, log: string[]) => {
  for (let i = 0; i < count; i += 1) {
    if (player.drawPile.length === 0 && player.discard.length > 0) {
      player.drawPile = shuffle(player.discard, player.hand.length + player.prepared.length + player.cooked.length + Date.now());
      player.discard = [];
      log.unshift(`${player.name} reshuffled discard into draw pile.`);
    }
    const card = player.drawPile.shift();
    if (!card) return;
    player.hand.push(card);
  }
};

export const createGame = (decks: DeckDefinition[], selectedDeckIds: CuisineId[], seed = Date.now()): GameState => {
  nextRuntimeId = 1;
  const selectedDecks = selectedDeckIds
    .map((id) => decks.find((deck) => deck.id === id))
    .filter((deck): deck is DeckDefinition => Boolean(deck));

  const log: string[] = [];
  const players = selectedDecks.map((deck, index) => {
    const player: PlayerState = {
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      deckId: deck.id,
      deckName: deck.name,
      flag: deck.flag,
      color: deck.color,
      ability: deck.ability,
      endCondition: deck.endCondition,
      tracking: deck.tracking,
      drawPile: shuffle(buildPlayerDeck(deck), seed + index + 11),
      discard: [],
      hand: [],
      prepared: [],
      cooked: [],
      scoring: [],
      tips: [],
    };
    draw(player, 6, log);
    return player;
  });

  const customerDeck = shuffle(selectedDecks.flatMap(buildCustomers), seed + 101);
  const queue = customerDeck.splice(0, players.length).map((card) => ({
    id: `queue-${card.id}`,
    card,
    competitors: [],
  }));

  log.unshift(`Started ${players.length}-player test game with seed ${seed}.`);

  return {
    seed,
    round: 1,
    activePlayerIndex: 0,
    players,
    customerDeck,
    queue,
    customerDiscard: [],
    finalRound: null,
    isGameOver: false,
    log,
  };
};

export const activePlayer = (state: GameState) => state.players[state.activePlayerIndex];

export const limitsFor = (state: GameState, playerId: string) => {
  const symbols = state.queue
    .flatMap((customer) => customer.competitors.filter((competitor) => competitor.playerId === playerId).map(() => customer.card.symbol))
    .filter(Boolean);

  return {
    customers: 2,
    ingredients: 4 + symbols.filter((symbol) => symbol === 'cutting board').length * 2,
    swaps: symbols.filter((symbol) => symbol === 'swap').length,
    cooking: 2 + symbols.filter((symbol) => symbol === 'cooking pot').length,
    hand: 6 + symbols.filter((symbol) => symbol === 'playing cards').length,
  };
};

export const scoreFor = (player: PlayerState) =>
  player.scoring.reduce((total, customer) => {
    const base = customer.base ?? 0;
    const tips = customer.tips ?? 0;
    return total + base + (player.tips.length >= tips ? tips : 0);
  }, 0);

export const cardSummary = (card: CardInstance) => {
  if (card.kind === 'ingredient') return `${card.emoji} ${card.name} (${card.ingredientType})`;
  if (card.kind === 'recipe') return `${card.emoji} ${card.name} (${card.difficulty})`;
  if (card.kind === 'drink') return `${card.emoji} ${card.name}`;
  return `${card.emoji} ${card.base}/${card.tips} ${symbolEmoji(card.symbol)} ${card.deckName}`;
};

const findPlayer = (state: GameState, playerId: string) => state.players.find((player) => player.id === playerId);

const moveCard = (from: CardInstance[], cardIdToMove: string) => {
  const index = from.findIndex((card) => card.id === cardIdToMove);
  if (index === -1) return null;
  return from.splice(index, 1)[0];
};

export const fillHand = (state: GameState, playerId: string) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const limit = limitsFor(state, playerId).hand;
  const count = Math.max(0, limit - player.hand.length);
  draw(player, count, state.log);
  state.log.unshift(`${player.name} drew ${count} card${count === 1 ? '' : 's'} up to hand limit ${limit}.`);
};

export const discardFromHand = (state: GameState, playerId: string, cardIdToDiscard: string) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const card = moveCard(player.hand, cardIdToDiscard);
  if (!card) return;
  player.discard.push(card);
  state.log.unshift(`${player.name} discarded ${cardSummary(card)}.`);
};

export const prepareIngredient = (state: GameState, playerId: string, cardIdToPrepare: string) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const card = player.hand.find((item) => item.id === cardIdToPrepare);
  if (!card || card.kind !== 'ingredient') return;
  const limit = limitsFor(state, playerId).ingredients;
  if (player.prepared.length >= limit) {
    state.log.unshift(`${player.name} cannot prepare more ingredients. Limit is ${limit}.`);
    return;
  }
  moveCard(player.hand, cardIdToPrepare);
  player.prepared.push(card);
  state.log.unshift(`${player.name} prepared ${cardSummary(card)}.`);
};

const takeIngredient = (pool: CardInstance[], type: IngredientType, predicate: (card: CardInstance) => boolean = () => true) => {
  const index = pool.findIndex((card) => card.ingredientType === type && predicate(card));
  if (index === -1) return null;
  return pool.splice(index, 1)[0];
};

export const canCookRecipe = (player: PlayerState, recipeCardId: string) => {
  const recipe = player.hand.find((card) => card.id === recipeCardId && card.kind === 'recipe');
  if (!recipe?.difficulty) return false;
  const requirements = RECIPE_REQUIREMENTS[recipe.difficulty];
  const primaryCount = player.prepared.filter((card) => card.ingredientType === 'primary').length;
  const secondaryCount = player.prepared.filter((card) => card.ingredientType === 'secondary').length;
  return primaryCount >= requirements.primary && secondaryCount >= requirements.secondary;
};

export const cookRecipe = (state: GameState, playerId: string, recipeCardId: string, useBonusIngredients = false) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const recipe = player.hand.find((card) => card.id === recipeCardId);
  if (!recipe?.difficulty) return;
  const cookingLimit = limitsFor(state, playerId).cooking;
  if (player.cooked.length >= cookingLimit) {
    state.log.unshift(`${player.name} cannot cook more dishes. Cooking Limit is ${cookingLimit}.`);
    return;
  }

  const requirements = RECIPE_REQUIREMENTS[recipe.difficulty];
  const pool = [...player.prepared];
  const ingredients: CardInstance[] = [];

  for (let i = 0; i < requirements.primary; i += 1) {
    const exact = recipe.exactIngredient ? takeIngredient(pool, 'primary', (card) => card.name === recipe.exactIngredient) : null;
    const primary = exact ?? takeIngredient(pool, 'primary');
    if (!primary) {
      state.log.unshift(`${player.name} lacks primary ingredients for ${recipe.name}.`);
      return;
    }
    ingredients.push(primary);
  }

  for (let i = 0; i < requirements.secondary; i += 1) {
    const secondary = takeIngredient(pool, 'secondary');
    if (!secondary) {
      state.log.unshift(`${player.name} lacks secondary ingredients for ${recipe.name}.`);
      return;
    }
    ingredients.push(secondary);
  }

  if (useBonusIngredients) {
    const optional = takeIngredient(pool, 'optional');
    if (optional) ingredients.push(optional);

    if (player.deckId === 'usa') {
      const extra = takeIngredient(pool, 'primary') ?? takeIngredient(pool, 'secondary');
      if (extra) ingredients.push(extra);
    }

    if (player.deckId === 'mexico') {
      const hotIngredients = ingredients.filter((card) => card.tags.includes('hot')).length;
      for (let i = hotIngredients; i < 2; i += 1) {
        const hot = takeIngredient(pool, 'secondary', (card) => card.tags.includes('hot'));
        if (hot) ingredients.push(hot);
      }
    }
  }

  moveCard(player.hand, recipeCardId);
  for (const ingredient of ingredients) {
    moveCard(player.prepared, ingredient.id);
  }

  const optionalValue = ingredients.filter((card) => card.ingredientType === 'optional').length;
  const dish: Dish = {
    id: `dish-${recipe.id}`,
    recipe,
    ingredients,
    baseValue: requirements.value + optionalValue,
  };
  player.cooked.push(dish);
  state.log.unshift(`${player.name} cooked ${recipe.emoji} ${recipe.name} for base serve value ${dish.baseValue}.`);
};

const eligibleTipCard = (player: PlayerState, dishes: Dish[]) => {
  if (player.deckId === 'italy') {
    return dishes.flatMap((dish) => dish.ingredients).find((card) => card.tags.includes('exact'));
  }
  if (player.deckId === 'india') {
    return dishes.flatMap((dish) => dish.ingredients).find((card) => card.ingredientType === 'secondary');
  }
  if (player.deckId === 'japan') {
    return dishes.flatMap((dish) => dish.ingredients).find((card) => card.tags.includes('wasabi') || card.tags.includes('ginger'));
  }
  if (player.deckId === 'mexico') {
    return dishes.flatMap((dish) => dish.ingredients).find((card) => card.tags.includes('hot'));
  }
  if (player.deckId === 'china') {
    return dishes.map((dish) => dish.recipe).find((card) => card.difficulty === 'normal' || card.difficulty === 'hard');
  }
  if (player.deckId === 'turkiye') {
    return dishes.map((dish) => dish.recipe).find((card) => card.tags.includes('kebab'));
  }
  return dishes.map((dish) => dish.recipe)[0];
};

const removeCardFromDish = (dish: Dish, cardIdToRemove: string) => {
  if (dish.recipe.id === cardIdToRemove) return true;
  const index = dish.ingredients.findIndex((card) => card.id === cardIdToRemove);
  if (index >= 0) {
    dish.ingredients.splice(index, 1);
    return true;
  }
  return false;
};

const abilityBonus = (player: PlayerState, customer: CardInstance, dishes: Dish[]) => {
  if (player.deckId === 'italy') {
    return dishes.filter((dish) => {
      const exact = dish.recipe.exactIngredient;
      return exact && dish.ingredients.some((ingredient) => ingredient.name === exact);
    }).length;
  }

  if (player.deckId === 'france') {
    const courses = new Set(dishes.flatMap((dish) => dish.recipe.tags));
    let bonus = 0;
    if (courses.has('entree') && courses.has('appetizer')) bonus += 1;
    if (courses.has('appetizer') && courses.has('main')) bonus += 1;
    if (courses.has('main') && courses.has('dessert')) bonus += 1;
    return bonus;
  }

  if (player.deckId === 'china') {
    const groups = dishes.reduce<Record<string, number>>((acc, dish) => {
      for (const tag of dish.recipe.tags) acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {});
    return Object.values(groups).reduce((sum, count) => sum + Math.floor(count / 2), 0);
  }

  if (player.deckId === 'india') {
    const secondaryNames = new Set(
      dishes.flatMap((dish) => dish.ingredients).filter((card) => card.ingredientType === 'secondary').map((card) => card.name),
    );
    return Math.floor(secondaryNames.size / 2);
  }

  if (player.deckId === 'usa') {
    return dishes.filter((dish) => {
      const requirements = RECIPE_REQUIREMENTS[dish.recipe.difficulty ?? 'easy'];
      const primaries = dish.ingredients.filter((card) => card.ingredientType === 'primary').length;
      const secondaries = dish.ingredients.filter((card) => card.ingredientType === 'secondary').length;
      return primaries > requirements.primary || secondaries > requirements.secondary;
    }).length;
  }

  if (player.deckId === 'turkiye') {
    return customer.deckId === 'turkiye' ? dishes.filter((dish) => dish.recipe.tags.includes('kebab')).length : 0;
  }

  if (player.deckId === 'japan') {
    return dishes.reduce((sum, dish) => {
      const wasabi = dish.ingredients.filter((card) => card.tags.includes('wasabi')).length;
      const ginger = dish.ingredients.filter((card) => card.tags.includes('ginger')).length;
      return sum + wasabi * 2 - ginger;
    }, 0);
  }

  if (player.deckId === 'mexico') {
    return dishes.reduce((sum, dish) => sum + Math.floor(dish.ingredients.filter((card) => card.tags.includes('hot')).length / 2), 0);
  }

  return 0;
};

export const serveValue = (player: PlayerState, customer: CardInstance, dishes: Dish[]) => {
  const dishValue = dishes.reduce((sum, dish) => sum + dish.baseValue, 0);
  const nationalityBonus = customer.deckId === player.deckId ? 1 : 0;
  return dishValue + nationalityBonus + abilityBonus(player, customer, dishes);
};

const playerOpenCompetitions = (state: GameState, playerId: string) =>
  state.queue.filter((customer) => customer.competitors.some((competitor) => competitor.playerId === playerId));

export const canServeDishTo = (state: GameState, playerId: string, queueId: string) => {
  const customer = state.queue.find((item) => item.id === queueId);
  if (!customer) return false;
  const existing = customer.competitors.find((competitor) => competitor.playerId === playerId);
  if (existing) return existing.dishes.length < (customer.card.base ?? 0);
  return customer.competitors.length < 2 && playerOpenCompetitions(state, playerId).length < 2;
};

const refillQueue = (state: GameState, index: number) => {
  const card = state.customerDeck.shift();
  if (!card) {
    state.queue.splice(index, 1);
    triggerFinalRound(state, 'customer deck is empty');
    return;
  }
  state.queue[index] = { id: `queue-${card.id}`, card, competitors: [] };
};

const triggerFinalRound = (state: GameState, reason: string) => {
  if (state.finalRound !== null) return;
  state.finalRound = state.round;
  state.log.unshift(`End condition triggered: ${reason}. Finish round ${state.round}.`);
};

const resolveCustomerIfReady = (state: GameState, queueId: string) => {
  const queueIndex = state.queue.findIndex((customer) => customer.id === queueId);
  const customer = state.queue[queueIndex];
  if (!customer || customer.competitors.length < 2) return;
  const base = customer.card.base ?? 0;
  if (!customer.competitors.every((competitor) => competitor.dishes.length === base)) return;

  const ranked = customer.competitors.map((competitor) => {
    const player = findPlayer(state, competitor.playerId);
    if (!player) throw new Error(`Missing player ${competitor.playerId}`);
    return {
      competitor,
      player,
      value: serveValue(player, customer.card, competitor.dishes),
    };
  });

  ranked.sort((a, b) => b.value - a.value);
  const tied = ranked[0].value === ranked[1].value;

  if (tied) {
    state.customerDiscard.push(customer.card);
    state.log.unshift(`${customer.card.deckName} customer tied at ${ranked[0].value}; customer discarded.`);
  } else {
    const winner = ranked[0];
    winner.player.scoring.push(customer.card);
    const tip = eligibleTipCard(winner.player, winner.competitor.dishes);
    if (tip && winner.player.tips.length < 4) {
      winner.player.tips.push(tip);
      for (const dish of winner.competitor.dishes) removeCardFromDish(dish, tip.id);
      state.log.unshift(`${winner.player.name} tracked ${cardSummary(tip)} as a Tips Card.`);
      if (winner.player.tips.length >= 4) triggerFinalRound(state, `${winner.player.name} has 4 Tips Cards`);
    }
    state.log.unshift(`${winner.player.name} attracted ${cardSummary(customer.card)} with serve value ${winner.value}.`);
  }

  for (const { competitor, player } of ranked) {
    for (const dish of competitor.dishes) {
      const trackedIds = new Set(player.tips.map((card) => card.id));
      player.discard.push(...[dish.recipe, ...dish.ingredients].filter((card) => !trackedIds.has(card.id)));
    }
  }

  refillQueue(state, queueIndex);
};

export const serveDish = (state: GameState, playerId: string, dishId: string, queueId: string) => {
  const player = findPlayer(state, playerId);
  const customer = state.queue.find((item) => item.id === queueId);
  if (!player || !customer) return;
  if (!canServeDishTo(state, playerId, queueId)) {
    state.log.unshift(`${player.name} cannot serve to that customer right now.`);
    return;
  }

  const dishIndex = player.cooked.findIndex((dish) => dish.id === dishId);
  if (dishIndex === -1) return;
  const [dish] = player.cooked.splice(dishIndex, 1);
  let competitor = customer.competitors.find((item) => item.playerId === playerId);
  if (!competitor) {
    competitor = {
      playerId,
      side: customer.competitors.some((item) => item.side === 'left') ? 'right' : 'left',
      dishes: [],
    };
    customer.competitors.push(competitor);
  }
  competitor.dishes.push(dish);
  state.log.unshift(`${player.name} served ${dish.recipe.name} to ${cardSummary(customer.card)}.`);
  resolveCustomerIfReady(state, queueId);
};

export const playDrink = (state: GameState, playerId: string, cardIdToPlay: string) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const drink = player.hand.find((card) => card.id === cardIdToPlay && card.kind === 'drink');
  if (!drink) return;
  const customer = state.customerDeck.shift();
  if (!customer) {
    state.log.unshift(`${player.name} cannot play ${drink.name}; customer deck is empty.`);
    triggerFinalRound(state, 'customer deck is empty');
    return;
  }
  moveCard(player.hand, cardIdToPlay);
  player.discard.push(drink);
  player.scoring.push(customer);
  state.log.unshift(`${player.name} played ${drink.name} and attracted ${cardSummary(customer)} from the deck.`);
  if (state.customerDeck.length === 0) triggerFinalRound(state, 'customer deck is empty');
};

export const endTurn = (state: GameState) => {
  if (state.isGameOver) return;
  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  if (state.activePlayerIndex === 0) state.round += 1;
  if (state.finalRound !== null && state.round > state.finalRound) {
    state.isGameOver = true;
    state.log.unshift('Game over. Final scoring is ready.');
    return;
  }
  state.log.unshift(`Round ${state.round}: ${activePlayer(state).name}'s serve turn.`);
};

export const resetPreparedOverflow = (state: GameState, playerId: string) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const limit = limitsFor(state, playerId).ingredients;
  while (player.prepared.length > limit) {
    const card = player.prepared.pop();
    if (card) player.discard.push(card);
  }
};

export const resetCookedOverflow = (state: GameState, playerId: string) => {
  const player = findPlayer(state, playerId);
  if (!player) return;
  const limit = limitsFor(state, playerId).cooking;
  while (player.cooked.length > limit) {
    const dish = player.cooked.pop();
    if (dish) player.discard.push(dish.recipe, ...dish.ingredients);
  }
};
