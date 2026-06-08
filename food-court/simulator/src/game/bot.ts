import type { CuisineId } from '../data/decks.ts';
import {
  addIngredient,
  canPlayDrink,
  currentHandLimit,
  discardFromHand,
  discardHandForRefresh,
  playDrink,
  refreshHand,
  resolveRound,
  serveRecipe,
  valueBreakdown,
  type CardInstance,
  type Dish,
  type GameState,
  type PlayerState,
} from './engine.ts';

export type BotPolicy = 'greedy';

export interface BotTurnSummary {
  playerId: string;
  deckId: CuisineId;
  servedRecipes: number;
  addedIngredients: number;
  playedDrink: boolean;
  serveValue: number;
}

const cloneGameState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const playerNumber = (playerId: string) => Number(playerId.replace(/\D/g, '')) || 0;

const handRank = (card: CardInstance) => {
  if (card.kind === 'recipe') return 5;
  if (card.kind === 'ingredient' && card.ingredientType === 'flavor') return 4;
  if (card.kind === 'ingredient') return 3;
  if (card.kind === 'drink') return 2;
  return 1;
};

const candidateRecipes = (player: PlayerState, order: number) => {
  const recipes = player.hand.filter((card) => card.kind === 'recipe');
  const limit = Math.min(order, recipes.length);
  const result: CardInstance[][] = [];

  const visit = (start: number, chosen: CardInstance[]) => {
    if (chosen.length > 0) result.push([...chosen]);
    if (chosen.length === limit) return;

    for (let index = start; index < recipes.length; index += 1) {
      chosen.push(recipes[index]);
      visit(index + 1, chosen);
      chosen.pop();
    }
  };

  visit(0, []);
  return result;
};

const findPlayer = (state: GameState, playerId: string) => state.players.find((player) => player.id === playerId);

const candidateIngredientAdds = (state: GameState, player: PlayerState) => {
  const ingredients = player.hand.filter((card) => card.kind === 'ingredient');
  const candidates: Array<{ state: GameState; value: number; ingredients: number }> = [];

  for (const dish of player.meal) {
    for (const ingredient of ingredients) {
      const trial = cloneGameState(state);
      addIngredient(trial, player.id, dish.id, ingredient.id);
      const trialPlayer = findPlayer(trial, player.id);
      if (!trialPlayer) continue;

      const wasAdded = trialPlayer.meal.some((trialDish) =>
        trialDish.id === dish.id && trialDish.ingredients.some((card) => card.id === ingredient.id),
      );
      if (!wasAdded) continue;

      candidates.push({
        state: trial,
        value: valueBreakdown(trial, trialPlayer).total,
        ingredients: trialPlayer.meal.reduce((sum, item) => sum + item.ingredients.length, 0),
      });
    }
  }

  return candidates;
};

const addBestIngredients = (state: GameState, playerId: string) => {
  let current = state;

  while (true) {
    const player = findPlayer(current, playerId);
    if (!player) return current;

    const currentValue = valueBreakdown(current, player).total;
    const currentIngredients = player.meal.reduce((sum, dish) => sum + dish.ingredients.length, 0);
    const best = candidateIngredientAdds(current, player)
      .filter((candidate) => candidate.value > currentValue || candidate.ingredients > currentIngredients)
      .sort((a, b) => b.value - a.value || b.ingredients - a.ingredients)[0];

    if (!best) return current;
    current = best.state;
  }
};

const playBestDrink = (state: GameState, playerId: string) => {
  const player = findPlayer(state, playerId);
  if (!player || !canPlayDrink(state, playerId)) return state;

  const currentValue = valueBreakdown(state, player).total;
  const candidates = player.hand
    .filter((card) => card.kind === 'drink')
    .map((drink) => {
      const trial = cloneGameState(state);
      playDrink(trial, playerId, drink.id);
      const trialPlayer = findPlayer(trial, playerId);
      return trialPlayer
        ? { state: trial, value: valueBreakdown(trial, trialPlayer).total }
        : { state: trial, value: currentValue };
    })
    .filter((candidate) => candidate.value > currentValue)
    .sort((a, b) => b.value - a.value);

  return candidates[0]?.state ?? state;
};

const buildMealCandidate = (state: GameState, playerId: string, recipes: CardInstance[]) => {
  let trial = cloneGameState(state);
  for (const recipe of recipes) serveRecipe(trial, playerId, recipe.id);
  trial = addBestIngredients(trial, playerId);
  trial = playBestDrink(trial, playerId);
  return trial;
};

const chooseMeal = (state: GameState, playerId: string) => {
  const player = findPlayer(state, playerId);
  const order = state.activeCustomer?.order ?? 0;
  if (!player || order <= 0) return state;

  const candidates = candidateRecipes(player, order);
  if (candidates.length === 0) return state;

  const ranked = candidates
    .map((recipes) => {
      const trial = buildMealCandidate(state, playerId, recipes);
      const trialPlayer = findPlayer(trial, playerId);
      const value = trialPlayer ? valueBreakdown(trial, trialPlayer).total : 0;
      const ingredients = trialPlayer?.meal.reduce((sum, dish) => sum + dish.ingredients.length, 0) ?? 0;
      const drink = trialPlayer?.drinkPlayed ? 1 : 0;
      return { state: trial, value, recipeCount: recipes.length, ingredients, drink };
    })
    .sort(
      (a, b) =>
        b.value - a.value ||
        b.drink - a.drink ||
        b.ingredients - a.ingredients ||
        b.recipeCount - a.recipeCount,
    );

  return ranked[0]?.state ?? state;
};

const shouldRedrawFrenchHand = (state: GameState, player: PlayerState) =>
  state.activeCustomer?.deckId === 'france' &&
  player.hand.filter((card) => card.kind === 'recipe').length === 0 &&
  player.hand.length > 0;

const chooseRefreshDiscard = (state: GameState, player: PlayerState) => {
  if (player.refreshDiscards > 0 || player.refreshDraws > 0) return null;
  if (player.hand.length < currentHandLimit(state)) return null;

  const recipes = player.hand.filter((card) => card.kind === 'recipe').length;
  const drinks = player.hand.filter((card) => card.kind === 'drink').length;
  const ingredients = player.hand.filter((card) => card.kind === 'ingredient').length;
  if (recipes === 0 || (drinks <= 1 && ingredients <= 1)) return null;

  return [...player.hand].sort((a, b) => handRank(a) - handRank(b) || a.name.localeCompare(b.name))[0] ?? null;
};

export const refreshForBot = (state: GameState, playerId: string, policy: BotPolicy = 'greedy') => {
  if (policy !== 'greedy') return;
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;

  if (shouldRedrawFrenchHand(state, player)) {
    discardHandForRefresh(state, playerId);
    return;
  }

  const discard = chooseRefreshDiscard(state, player);
  if (discard) discardFromHand(state, playerId, discard.id);
  refreshHand(state, playerId);
};

export const playBotRound = (state: GameState, policy: BotPolicy = 'greedy'): BotTurnSummary[] => {
  if (state.phase !== 'serve') return [];

  for (const player of [...state.players].sort((a, b) => playerNumber(a.id) - playerNumber(b.id))) {
    refreshForBot(state, player.id, policy);
  }

  let current = state;
  for (const player of [...state.players].sort((a, b) => playerNumber(a.id) - playerNumber(b.id))) {
    current = chooseMeal(current, player.id);
  }

  Object.assign(state, current);

  const summaries = state.players.map((player) => ({
    playerId: player.id,
    deckId: player.deckId,
    servedRecipes: player.meal.length,
    addedIngredients: player.meal.reduce((sum: number, dish: Dish) => sum + dish.ingredients.length, 0),
    playedDrink: Boolean(player.drinkPlayed),
    serveValue: valueBreakdown(state, player).total,
  }));

  resolveRound(state);
  return summaries;
};
