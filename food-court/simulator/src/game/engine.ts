import type {
  CuisineId,
  DeckDefinition,
  IngredientDefinition,
  IngredientType,
  RecipeDefinition,
  RecipeDifficulty,
} from '../data/decks';

export type CardKind = 'ingredient' | 'recipe' | 'drink' | 'customer';
export type Phase = 'serve' | 'drink' | 'game-over';

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
  order?: number;
  tips?: number;
}

export interface Dish {
  id: string;
  recipe: CardInstance;
  ingredients: CardInstance[];
}

export interface PlayerState {
  id: string;
  name: string;
  deckId: CuisineId;
  deckName: string;
  flag: string;
  color: string;
  ability: string;
  tracking: string;
  drawPile: CardInstance[];
  discard: CardInstance[];
  hand: CardInstance[];
  meal: Dish[];
  drinkPlayed: CardInstance | null;
  scoring: CardInstance[];
  tips: CardInstance[];
  refreshDiscards: number;
}

export interface PlayerBreakdown {
  playerId: string;
  recipe: number;
  easyCombo: number;
  ingredients: number;
  customer: number;
  ability: number;
  drink: number;
  total: number;
  notes: string[];
  tied: boolean;
  competing: boolean;
}

export interface GameState {
  seed: number;
  round: number;
  phase: Phase;
  players: PlayerState[];
  activeCustomer: CardInstance | null;
  customerDeck: CardInstance[];
  customerDiscard: CardInstance[];
  log: string[];
}

const HAND_LIMIT = 6;
const MAX_TIPS = 4;

const RECIPE_VALUES: Record<RecipeDifficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

const NORMAL_SLOTS: Record<RecipeDifficulty, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
};

export const RULE_NOTES = [
  'One active customer is contested by all players each round.',
  'Recipes are served from hand up to the active customer Order Value.',
  'Primary and Secondary Ingredients fill normal slots for +1 each.',
  'Optional Ingredients use the optional slot for +2.',
  'After reveal, tied players may play 1 Drink Card for +1 before highest-unique resolution.',
];

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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

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
    order: customer.order,
    tips: customer.tips,
  }));

const draw = (player: PlayerState, count: number, log: string[]) => {
  for (let i = 0; i < count; i += 1) {
    if (player.drawPile.length === 0 && player.discard.length > 0) {
      player.drawPile = shuffle(player.discard, player.hand.length + player.meal.length + Date.now());
      player.discard = [];
      log.unshift(`${player.name} reshuffled discard into draw pile.`);
    }
    const card = player.drawPile.shift();
    if (!card) return;
    player.hand.push(card);
  }
};

const revealNextCustomer = (state: GameState) => {
  state.activeCustomer = state.customerDeck.shift() ?? null;
  if (!state.activeCustomer) state.phase = 'game-over';
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
      tracking: deck.tracking,
      drawPile: shuffle(buildPlayerDeck(deck), seed + index + 11),
      discard: [],
      hand: [],
      meal: [],
      drinkPlayed: null,
      scoring: [],
      tips: [],
      refreshDiscards: 0,
    };
    draw(player, HAND_LIMIT, log);
    return player;
  });

  const state: GameState = {
    seed,
    round: 1,
    phase: 'serve',
    players,
    activeCustomer: null,
    customerDeck: shuffle(selectedDecks.flatMap(buildCustomers), seed + 101),
    customerDiscard: [],
    log,
  };

  revealNextCustomer(state);
  log.unshift(`Started ${players.length}-player simultaneous test game with seed ${seed}.`);
  return state;
};

export const cardSummary = (card: CardInstance) => {
  if (card.kind === 'ingredient') return `${card.emoji} ${card.name} (${card.ingredientType})`;
  if (card.kind === 'recipe') return `${card.emoji} ${card.name} (${card.difficulty})`;
  if (card.kind === 'drink') return `${card.emoji} ${card.name}`;
  return `${card.emoji} ${card.order}/${card.tips} ${card.deckName}`;
};

const findPlayer = (state: GameState, playerId: string) => state.players.find((player) => player.id === playerId);

const moveCard = (from: CardInstance[], cardIdToMove: string) => {
  const index = from.findIndex((card) => card.id === cardIdToMove);
  if (index === -1) return null;
  return from.splice(index, 1)[0];
};

export const scoreFor = (player: PlayerState) =>
  player.scoring.reduce((total, customer) => {
    const order = customer.order ?? 0;
    const tips = customer.tips ?? 0;
    return total + order + (player.tips.length >= tips ? tips : 0);
  }, 0);

export const refreshHand = (state: GameState, playerId: string) => {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;
  const count = Math.max(0, HAND_LIMIT - player.hand.length);
  draw(player, count, state.log);
  state.log.unshift(`${player.name} drew ${count} card${count === 1 ? '' : 's'} up to ${HAND_LIMIT}.`);
};

export const discardFromHand = (state: GameState, playerId: string, cardIdToDiscard: string) => {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;
  if (player.refreshDiscards >= 3) {
    state.log.unshift(`${player.name} has already discarded 3 cards this round.`);
    return;
  }
  const card = moveCard(player.hand, cardIdToDiscard);
  if (!card) return;
  player.discard.push(card);
  player.refreshDiscards += 1;
  state.log.unshift(`${player.name} discarded ${cardSummary(card)} during refresh.`);
};

export const serveRecipe = (state: GameState, playerId: string, cardIdToServe: string) => {
  const player = findPlayer(state, playerId);
  const order = state.activeCustomer?.order ?? 0;
  if (!player || state.phase !== 'serve') return;
  if (player.meal.length >= order) {
    state.log.unshift(`${player.name} cannot serve more than ${order} recipe${order === 1 ? '' : 's'}.`);
    return;
  }
  const recipe = player.hand.find((card) => card.id === cardIdToServe && card.kind === 'recipe');
  if (!recipe) return;
  moveCard(player.hand, cardIdToServe);
  player.meal.push({ id: `dish-${recipe.id}`, recipe, ingredients: [] });
  state.log.unshift(`${player.name} staged ${recipe.name}.`);
};

const regularIngredientCount = (dish: Dish) =>
  dish.ingredients.filter((card) => card.ingredientType === 'primary' || card.ingredientType === 'secondary').length;

const optionalIngredientCount = (dish: Dish) => dish.ingredients.filter((card) => card.ingredientType === 'optional').length;

const mexicanExtraHotCount = (player: PlayerState) =>
  player.meal
    .flatMap((dish) => dish.ingredients)
    .filter((card) => card.ingredientType === 'secondary' && card.tags.includes('hot')).length;

const canAddIngredientToDish = (player: PlayerState, dish: Dish, ingredient: CardInstance) => {
  if (!dish.recipe.difficulty || ingredient.kind !== 'ingredient') return false;
  if (ingredient.ingredientType === 'optional') return optionalIngredientCount(dish) < 1;

  const normalCapacity = NORMAL_SLOTS[dish.recipe.difficulty] + (player.deckId === 'usa' ? 1 : 0);
  if (regularIngredientCount(dish) < normalCapacity) return true;

  return player.deckId === 'mexico' && ingredient.tags.includes('hot') && mexicanExtraHotCount(player) < 2;
};

export const addIngredient = (state: GameState, playerId: string, dishId: string, cardIdToAdd: string) => {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;
  const dish = player.meal.find((item) => item.id === dishId);
  const ingredient = player.hand.find((card) => card.id === cardIdToAdd && card.kind === 'ingredient');
  if (!dish || !ingredient) return;
  if (!canAddIngredientToDish(player, dish, ingredient)) {
    state.log.unshift(`${player.name} cannot add ${ingredient.name} to ${dish.recipe.name}; no matching slot is open.`);
    return;
  }
  moveCard(player.hand, cardIdToAdd);
  dish.ingredients.push(ingredient);
  state.log.unshift(`${player.name} added ${ingredient.name} to ${dish.recipe.name}.`);
};

export const returnDish = (state: GameState, playerId: string, dishId: string) => {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;
  const index = player.meal.findIndex((dish) => dish.id === dishId);
  if (index === -1) return;
  const [dish] = player.meal.splice(index, 1);
  player.hand.push(dish.recipe, ...dish.ingredients);
  state.log.unshift(`${player.name} returned ${dish.recipe.name} to hand.`);
};

export const returnIngredient = (state: GameState, playerId: string, dishId: string, cardIdToReturn: string) => {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;
  const dish = player.meal.find((item) => item.id === dishId);
  if (!dish) return;
  const ingredient = moveCard(dish.ingredients, cardIdToReturn);
  if (!ingredient) return;
  player.hand.push(ingredient);
  state.log.unshift(`${player.name} returned ${ingredient.name} to hand.`);
};

const pairDifferentNames = (cards: CardInstance[]) => {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  const total = cards.length;
  const maxSame = Math.max(0, ...counts.values());
  return Math.min(Math.floor(total / 2), total - maxSame);
};

const recipeBaseBreakdown = (players: PlayerState[], player: PlayerState, customer: CardInstance) => {
  const nonEasyCount = player.meal.filter((dish) => dish.recipe.difficulty !== 'easy').length;
  let recipe = 0;
  let easyCombo = 0;
  let ingredients = 0;
  let customerBonus = 0;
  const notes: string[] = [];

  for (const dish of player.meal) {
    const difficulty = dish.recipe.difficulty ?? 'easy';
    recipe += RECIPE_VALUES[difficulty];

    if (difficulty === 'easy') {
      const combo = customer.deckId === 'usa' ? nonEasyCount : Math.min(nonEasyCount, 1);
      easyCombo += combo;
    }

    if (customer.deckId === 'china' && difficulty === 'easy') customerBonus += 1;
    if (customer.deckId === 'japan' && difficulty === 'hard') customerBonus += 1;
    if (customer.deckId === 'mexico' && difficulty === 'normal') customerBonus += 1;

    for (const ingredient of dish.ingredients) {
      if (ingredient.ingredientType === 'optional') {
        ingredients += 2;
      } else {
        ingredients += 1;
        if (customer.deckId === 'india' && ingredient.ingredientType === 'secondary') customerBonus += 1;
      }
    }
  }

  if (customer.deckId === 'italy' && player.meal.some((dish) => dish.ingredients.length > 0)) {
    customerBonus += 1;
    notes.push('Italian customer +1');
  }

  if (customer.deckId === 'france') {
    const fullDish = player.meal.some((dish) => {
      const difficulty = dish.recipe.difficulty ?? 'easy';
      return regularIngredientCount(dish) >= NORMAL_SLOTS[difficulty] && optionalIngredientCount(dish) >= 1;
    });
    if (fullDish) {
      customerBonus += 1;
      notes.push('French customer +1');
    }
  }

  if (customer.deckId === 'turkiye' && hasFewerTips(players, player)) {
    customerBonus += 1;
    notes.push('Turkish customer +1');
  }

  return { recipe, easyCombo, ingredients, customer: customerBonus, notes };
};

const hasFewerTips = (players: PlayerState[], player: PlayerState) =>
  players.some((opponent) => opponent.id !== player.id && player.tips.length < opponent.tips.length);

const abilityBonus = (player: PlayerState) => {
  if (player.deckId === 'italy') {
    return player.meal.filter((dish) => {
      const exact = dish.recipe.exactIngredient;
      return exact && dish.ingredients.some((ingredient) => ingredient.name === exact);
    }).length;
  }

  if (player.deckId === 'france') {
    const courses = new Set(player.meal.flatMap((dish) => dish.recipe.tags));
    return Number(courses.has('entree') && courses.has('appetizer')) +
      Number(courses.has('appetizer') && courses.has('main')) +
      Number(courses.has('main') && courses.has('dessert'));
  }

  if (player.deckId === 'china') {
    const groups = player.meal.reduce<Record<string, number>>((acc, dish) => {
      for (const tag of dish.recipe.tags) acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {});
    return Object.values(groups).reduce((sum, count) => sum + Math.floor(count / 2), 0);
  }

  if (player.deckId === 'india') {
    const secondaryCount = player.meal
      .flatMap((dish) => dish.ingredients)
      .filter((card) => card.ingredientType === 'secondary').length;
    return Math.floor(secondaryCount / 2);
  }

  if (player.deckId === 'turkiye') {
    const kebabs = player.meal.filter((dish) => dish.recipe.tags.includes('kebab')).length;
    const nonKebabs = player.meal.length - kebabs;
    return kebabs * nonKebabs;
  }

  if (player.deckId === 'japan') {
    const secondaries = player.meal
      .flatMap((dish) => dish.ingredients)
      .filter((card) => card.ingredientType === 'secondary');
    return pairDifferentNames(secondaries);
  }

  if (player.deckId === 'mexico') {
    return player.meal
      .flatMap((dish) => dish.ingredients)
      .filter((card) => card.tags.includes('hot')).length;
  }

  return 0;
};

export const valueBreakdown = (state: GameState, player: PlayerState): PlayerBreakdown => {
  if (!state.activeCustomer || player.meal.length === 0) {
    return {
      playerId: player.id,
      recipe: 0,
      easyCombo: 0,
      ingredients: 0,
      customer: 0,
      ability: 0,
      drink: player.drinkPlayed ? 1 : 0,
      total: player.drinkPlayed ? 1 : 0,
      notes: [],
      tied: false,
      competing: false,
    };
  }

  const base = recipeBaseBreakdown(state.players, player, state.activeCustomer);
  const ability = abilityBonus(player);
  const drink = player.drinkPlayed ? 1 : 0;
  const total = base.recipe + base.easyCombo + base.ingredients + base.customer + ability + drink;

  return {
    playerId: player.id,
    recipe: base.recipe,
    easyCombo: base.easyCombo,
    ingredients: base.ingredients,
    customer: base.customer,
    ability,
    drink,
    total,
    notes: base.notes,
    tied: false,
    competing: true,
  };
};

export const roundBreakdowns = (state: GameState) => {
  const breakdowns = state.players.map((player) => valueBreakdown(state, player));
  const counts = breakdowns
    .filter((breakdown) => breakdown.competing)
    .reduce<Record<number, number>>((acc, breakdown) => {
      acc[breakdown.total] = (acc[breakdown.total] ?? 0) + 1;
      return acc;
    }, {});
  return breakdowns.map((breakdown) => ({
    ...breakdown,
    tied: breakdown.competing && counts[breakdown.total] > 1,
  }));
};

export const revealMeals = (state: GameState) => {
  if (state.phase !== 'serve') return;
  state.phase = 'drink';
  state.log.unshift('Meals revealed. Tied players may play 1 Drink Card.');
};

export const canPlayDrink = (state: GameState, playerId: string) => {
  if (state.phase !== 'drink') return false;
  const player = findPlayer(state, playerId);
  const breakdown = roundBreakdowns(state).find((item) => item.playerId === playerId);
  return Boolean(player && !player.drinkPlayed && breakdown?.tied && player.hand.some((card) => card.kind === 'drink'));
};

export const playDrink = (state: GameState, playerId: string, cardIdToPlay: string) => {
  const player = findPlayer(state, playerId);
  if (!player || !canPlayDrink(state, playerId)) return;
  const drink = player.hand.find((card) => card.id === cardIdToPlay && card.kind === 'drink');
  if (!drink) return;
  moveCard(player.hand, cardIdToPlay);
  player.drinkPlayed = drink;
  state.log.unshift(`${player.name} played ${drink.name} for +1 serve value.`);
};

const winningBreakdown = (state: GameState) => {
  const breakdowns = roundBreakdowns(state)
    .filter((breakdown) => breakdown.competing)
    .sort((a, b) => b.total - a.total);
  for (const breakdown of breakdowns) {
    if (breakdowns.filter((item) => item.total === breakdown.total).length === 1) return breakdown;
  }
  return null;
};

const courseOrder = ['entree', 'appetizer', 'main', 'dessert'];

const eligibleTipCard = (player: PlayerState) => {
  if (player.tips.length >= MAX_TIPS) return null;

  if (player.deckId === 'italy') {
    return player.meal
      .flatMap((dish) => dish.ingredients)
      .find((card) => player.meal.some((dish) => dish.recipe.exactIngredient === card.name));
  }

  if (player.deckId === 'france') {
    const nextCourse = courseOrder[player.tips.length];
    return player.meal.map((dish) => dish.recipe).find((card) => card.tags.includes(nextCourse));
  }

  if (player.deckId === 'china') {
    const recipes = player.meal.map((dish) => dish.recipe);
    const hasRice = recipes.some((card) => card.tags.includes('rice'));
    const hasNoodles = recipes.some((card) => card.tags.includes('noodles'));
    return hasRice && hasNoodles ? recipes.find((card) => card.tags.includes('rice') || card.tags.includes('noodles')) ?? null : null;
  }

  if (player.deckId === 'india') {
    const tracked = new Set(player.tips.map((card) => card.name));
    return player.meal
      .flatMap((dish) => dish.ingredients)
      .find((card) => card.ingredientType === 'secondary' && !tracked.has(card.name));
  }

  if (player.deckId === 'usa') {
    const existingType = player.tips[0]?.tags.find((tag) => tag === 'burger' || tag === 'steak');
    return player.meal
      .map((dish) => dish.recipe)
      .find((card) => {
        const type = card.tags.find((tag) => tag === 'burger' || tag === 'steak');
        return type && (!existingType || type === existingType);
      });
  }

  if (player.deckId === 'turkiye') {
    return player.meal.map((dish) => dish.recipe).find((card) => card.tags.includes('kebab'));
  }

  if (player.deckId === 'japan') {
    const counts = player.tips.reduce<Record<string, number>>((acc, card) => {
      acc[card.name] = (acc[card.name] ?? 0) + 1;
      return acc;
    }, {});
    return player.meal
      .flatMap((dish) => dish.ingredients)
      .find((card) => card.ingredientType === 'secondary' && (counts[card.name] ?? 0) < 2);
  }

  if (player.deckId === 'mexico') {
    return player.meal.flatMap((dish) => dish.ingredients).find((card) => card.tags.includes('hot'));
  }

  return null;
};

const removeTrackedTipFromMeal = (player: PlayerState, tip: CardInstance) => {
  for (const dish of player.meal) {
    const index = dish.ingredients.findIndex((card) => card.id === tip.id);
    if (index >= 0) {
      dish.ingredients.splice(index, 1);
      return;
    }
  }
};

const cleanupRound = (state: GameState) => {
  for (const player of state.players) {
    const trackedIds = new Set(player.tips.map((card) => card.id));
    for (const dish of player.meal) {
      player.discard.push(...[dish.recipe, ...dish.ingredients].filter((card) => !trackedIds.has(card.id)));
    }
    if (player.drinkPlayed) player.discard.push(player.drinkPlayed);
    player.meal = [];
    player.drinkPlayed = null;
    player.refreshDiscards = 0;
  }
};

export const resolveRound = (state: GameState) => {
  if (state.phase === 'serve') revealMeals(state);
  if (state.phase !== 'drink' || !state.activeCustomer) return;

  const customer = state.activeCustomer;
  const winnerBreakdown = winningBreakdown(state);
  if (!winnerBreakdown) {
    state.customerDiscard.push(customer);
    state.log.unshift(`${cardSummary(customer)} was discarded; no unique serve value won.`);
  } else {
    const winner = findPlayer(state, winnerBreakdown.playerId);
    if (winner) {
      winner.scoring.push(customer);
      const tip = eligibleTipCard(winner);
      if (tip) {
        winner.tips.push(tip);
        removeTrackedTipFromMeal(winner, tip);
        state.log.unshift(`${winner.name} tracked ${cardSummary(tip)} as a Tips Card.`);
      }
      state.log.unshift(`${winner.name} attracted ${cardSummary(customer)} with ${winnerBreakdown.total}.`);
    }
  }

  cleanupRound(state);
  const triggeredByTips = state.players.some((player) => player.tips.length >= MAX_TIPS);
  const noMoreCustomers = state.customerDeck.length === 0;
  if (triggeredByTips || noMoreCustomers) {
    state.activeCustomer = null;
    state.phase = 'game-over';
    state.log.unshift(`Game ended after round ${state.round}.`);
    return;
  }

  state.round += 1;
  state.phase = 'serve';
  revealNextCustomer(state);
};
