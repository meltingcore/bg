import type { CuisineId } from '../data/decks.ts';
import {
  addIngredient,
  canPlayDrink,
  currentHandLimit,
  discardFromHand,
  discardHandForRefresh,
  drinkRequirementMet,
  eligibleTipCard,
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

export const BOT_POLICIES = ['greedy', 'tips', 'cautious', 'adaptive'] as const;
export type BotPolicy = (typeof BOT_POLICIES)[number];
export type SimulationPolicy = BotPolicy | 'mixed';
export const SIMULATION_POLICIES: readonly SimulationPolicy[] = [...BOT_POLICIES, 'mixed'];
export type BotPolicyAssignment = SimulationPolicy | ReadonlyMap<string, BotPolicy>;

export interface BotTurnSummary {
  playerId: string;
  deckId: CuisineId;
  deckName: string;
  seat: number;
  policy: BotPolicy;
  activeCustomerDeckId: CuisineId | null;
  activeCustomerDeckName: string | null;
  servedRecipes: number;
  addedIngredients: number;
  playedDrink: boolean;
  drinkSuccessful: boolean;
  tipEligible: boolean;
  estimatedTieRisk: number;
  serveValue: number;
  wonCustomer: boolean;
  customerDiscarded: boolean;
}

interface CandidateMetrics {
  state: GameState;
  value: number;
  utility: number;
  recipes: number;
  ingredients: number;
  cardsSpent: number;
  handSize: number;
  playedDrink: boolean;
  tipEligible: boolean;
  tipScoreSwing: number;
  completesTips: boolean;
  tieRisk: number;
}

interface BotDecision {
  state: GameState;
  metrics: CandidateMetrics;
}

const cloneGameState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const playerNumber = (playerId: string) => Number(playerId.replace(/\D/g, '')) || 0;

const findPlayer = (state: GameState, playerId: string) =>
  state.players.find((player) => player.id === playerId);

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

const scoreAtTips = (player: PlayerState, tipCount: number) =>
  player.scoring.reduce((total, customer) => {
    const order = customer.order ?? 0;
    const tips = customer.tips ?? 0;
    return total + order + (tipCount >= tips ? tips : 0);
  }, 0);

const tipScoreSwing = (player: PlayerState) =>
  scoreAtTips(player, player.tips.length + 1) - scoreAtTips(player, player.tips.length);

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const candidateKey = (state: GameState, player: PlayerState) => [
  state.seed,
  state.round,
  player.id,
  ...player.meal.flatMap((dish) => [
    dish.recipe.id,
    ...dish.ingredients.map((card) => card.id).sort(),
  ]),
  player.drinkPlayed?.id ?? '',
].join(':');

const tieRiskFor = (state: GameState, player: PlayerState, serveValue: number) => {
  const customer = state.activeCustomer;
  if (!customer) return 0;

  let matchingWeight = 0;
  let totalWeight = 0;
  for (const record of state.serveHistory) {
    if (record.playerId === player.id || record.order !== customer.order) continue;
    const age = Math.max(0, state.round - record.round);
    const recencyWeight = 1 / (1 + age * 0.12);
    const customerWeight = record.customerDeckId === customer.deckId ? 2 : 1;
    const weight = recencyWeight * customerWeight;
    totalWeight += weight;
    if (record.serveValue === serveValue) matchingWeight += weight;
  }

  return totalWeight === 0 ? 0 : matchingWeight / totalWeight;
};

const candidateUtility = (
  policy: BotPolicy,
  state: GameState,
  player: PlayerState,
  metrics: Omit<CandidateMetrics, 'state' | 'utility'>,
) => {
  const tipBonus = metrics.tipEligible
    ? 7 + metrics.tipScoreSwing * 2 + (metrics.completesTips ? 16 : 0)
    : 0;
  const jitter = policy === 'greedy'
    ? 0
    : (hashText(candidateKey(state, player)) % 1000) / 10_000;

  if (policy === 'greedy') {
    return metrics.value * 100 +
      Number(metrics.playedDrink) * 0.3 +
      metrics.ingredients * 0.02 +
      metrics.recipes * 0.001;
  }

  if (policy === 'tips') {
    return metrics.value * 10 +
      tipBonus * 1.5 -
      metrics.tieRisk * 4 -
      metrics.cardsSpent * 0.08 +
      jitter;
  }

  if (policy === 'cautious') {
    return metrics.value * 10 +
      tipBonus * 0.35 -
      metrics.tieRisk * 18 -
      metrics.cardsSpent * 0.2 +
      metrics.handSize * 0.05 +
      jitter;
  }

  return metrics.value * 10 +
    tipBonus -
    metrics.tieRisk * 10 -
    metrics.cardsSpent * 0.12 +
    metrics.handSize * 0.08 +
    jitter;
};

const metricsFor = (
  state: GameState,
  playerId: string,
  policy: BotPolicy,
): CandidateMetrics | null => {
  const player = findPlayer(state, playerId);
  if (!player) return null;

  const value = valueBreakdown(state, player).total;
  const tipEligible = Boolean(eligibleTipCard(player));
  const recipes = player.meal.length;
  const ingredients = player.meal.reduce((sum, dish) => sum + dish.ingredients.length, 0);
  const playedDrink = Boolean(player.drinkPlayed);
  const cardsSpent = recipes + ingredients + Number(playedDrink);
  const baseMetrics = {
    value,
    recipes,
    ingredients,
    cardsSpent,
    handSize: player.hand.length,
    playedDrink,
    tipEligible,
    tipScoreSwing: tipEligible ? tipScoreSwing(player) : 0,
    completesTips: tipEligible && player.tips.length === 3,
    tieRisk: tieRiskFor(state, player, value),
  };

  return {
    state,
    ...baseMetrics,
    utility: candidateUtility(policy, state, player, baseMetrics),
  };
};

const candidateIngredientAdds = (
  state: GameState,
  player: PlayerState,
  policy: BotPolicy,
) => {
  const ingredients = player.hand.filter((card) => card.kind === 'ingredient');
  const candidates: CandidateMetrics[] = [];

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

      const metrics = metricsFor(trial, player.id, policy);
      if (metrics) candidates.push(metrics);
    }
  }

  return candidates;
};

const rankCandidates = (candidates: CandidateMetrics[]) =>
  [...candidates].sort(
    (a, b) =>
      b.utility - a.utility ||
      b.value - a.value ||
      Number(b.tipEligible) - Number(a.tipEligible) ||
      a.tieRisk - b.tieRisk ||
      a.cardsSpent - b.cardsSpent,
  );

const addBestIngredients = (
  state: GameState,
  playerId: string,
  policy: BotPolicy,
) => {
  let current = state;

  while (true) {
    const player = findPlayer(current, playerId);
    if (!player) return current;
    const currentMetrics = metricsFor(current, playerId, policy);
    if (!currentMetrics) return current;

    const best = rankCandidates(candidateIngredientAdds(current, player, policy))[0];
    if (!best || best.utility <= currentMetrics.utility + 0.0001) return current;
    current = best.state;
  }
};

const playBestDrink = (
  state: GameState,
  playerId: string,
  policy: BotPolicy,
) => {
  const player = findPlayer(state, playerId);
  if (!player || !canPlayDrink(state, playerId)) return state;

  const currentMetrics = metricsFor(state, playerId, policy);
  if (!currentMetrics) return state;

  const candidates = player.hand
    .filter((card) => card.kind === 'drink')
    .map((drink) => {
      const trial = cloneGameState(state);
      playDrink(trial, playerId, drink.id);
      return metricsFor(trial, playerId, policy);
    })
    .filter(
      (candidate): candidate is CandidateMetrics =>
        Boolean(candidate && candidate.value > currentMetrics.value),
    );

  const best = rankCandidates(candidates)[0];
  return best && best.utility > currentMetrics.utility + 0.0001 ? best.state : state;
};

const buildMealCandidate = (
  state: GameState,
  playerId: string,
  recipes: CardInstance[],
  policy: BotPolicy,
) => {
  let trial = cloneGameState(state);
  for (const recipe of recipes) serveRecipe(trial, playerId, recipe.id);
  trial = addBestIngredients(trial, playerId, policy);
  trial = playBestDrink(trial, playerId, policy);
  return metricsFor(trial, playerId, policy);
};

const chooseMeal = (
  state: GameState,
  playerId: string,
  policy: BotPolicy,
): BotDecision => {
  const player = findPlayer(state, playerId);
  const order = state.activeCustomer?.order ?? 0;
  const fallback = metricsFor(state, playerId, policy);
  if (!player || order <= 0 || !fallback) {
    throw new Error(`Cannot evaluate bot meal for ${playerId}.`);
  }

  const candidates = candidateRecipes(player, order)
    .map((recipes) => buildMealCandidate(state, playerId, recipes, policy))
    .filter((candidate): candidate is CandidateMetrics => Boolean(candidate));
  let competitiveCandidates = candidates;
  if (policy === 'tips' && candidates.length > 0) {
    const bestValue = Math.max(...candidates.map((candidate) => candidate.value));
    const tipCandidates = candidates.filter(
      (candidate) => candidate.tipEligible && candidate.value >= bestValue - 1,
    );
    if (tipCandidates.length > 0) competitiveCandidates = tipCandidates;
  }

  const best = rankCandidates(competitiveCandidates)[0] ?? fallback;
  return { state: best.state, metrics: best };
};

const nextFrenchCourse = (player: PlayerState) =>
  ['entree', 'appetizer', 'main', 'dessert'][player.tips.length];

const supportsTips = (player: PlayerState, card: CardInstance) => {
  if (player.deckId === 'italy') {
    return card.kind === 'ingredient' && card.tags.includes('exact');
  }
  if (player.deckId === 'france') {
    return card.kind === 'recipe' && card.tags.includes(nextFrenchCourse(player));
  }
  if (player.deckId === 'china') {
    return card.kind === 'recipe' && (card.tags.includes('rice') || card.tags.includes('noodles'));
  }
  if (player.deckId === 'india') {
    const tracked = new Set(player.tips.map((tip) => tip.name));
    return card.kind === 'ingredient' && card.tags.includes('spice') && !tracked.has(card.name);
  }
  if (player.deckId === 'usa') {
    return card.kind === 'recipe' &&
      (card.tags.includes('burger') || card.tags.includes('steak'));
  }
  if (player.deckId === 'turkiye') {
    return card.kind === 'recipe' && card.tags.includes('kebab');
  }
  if (player.deckId === 'japan') {
    const counts = player.tips.reduce<Record<string, number>>((acc, tip) => {
      acc[tip.name] = (acc[tip.name] ?? 0) + 1;
      return acc;
    }, {});
    return card.kind === 'ingredient' &&
      card.tags.includes('seasoning') &&
      (counts[card.name] ?? 0) < 2;
  }
  return card.kind === 'ingredient' &&
    card.ingredientType === 'ingredient' &&
    !card.tags.includes('hot');
};

const cardKeepValue = (
  state: GameState,
  player: PlayerState,
  card: CardInstance,
  policy: BotPolicy,
) => {
  let value = card.kind === 'recipe'
    ? 5
    : card.kind === 'ingredient' && card.ingredientType === 'flavor'
      ? 3.5
      : card.kind === 'ingredient'
        ? 3
        : card.kind === 'drink'
          ? 2
          : 0;

  if (supportsTips(player, card)) {
    value += policy === 'tips' ? 8 : policy === 'adaptive' ? 3.5 : policy === 'cautious' ? 1.5 : 0.5;
  }
  if (card.kind === 'recipe' && (state.activeCustomer?.order ?? 0) >= 2) value += 0.5;
  if (card.kind === 'drink' && player.hand.filter((item) => item.kind === 'drink').length > 1) value -= 1;
  return value;
};

const hasImmediateTipPotential = (player: PlayerState) => {
  if (player.deckId === 'italy') {
    const recipes = player.hand.filter((card) => card.kind === 'recipe');
    const ingredients = new Set(player.hand.filter((card) => card.kind === 'ingredient').map((card) => card.name));
    return recipes.some((recipe) => recipe.exactIngredient && ingredients.has(recipe.exactIngredient));
  }
  if (player.deckId === 'china') {
    const recipes = player.hand.filter((card) => card.kind === 'recipe');
    return recipes.some((card) => card.tags.includes('rice')) &&
      recipes.some((card) => card.tags.includes('noodles'));
  }
  return player.hand.some((card) => supportsTips(player, card));
};

const shouldRedrawFrenchHand = (
  state: GameState,
  player: PlayerState,
  policy: BotPolicy,
) => {
  if (state.activeCustomer?.deckId !== 'france' || player.hand.length < 4) return false;

  const recipes = player.hand.filter((card) => card.kind === 'recipe').length;
  if (recipes === 0) return true;
  if (policy === 'greedy') return false;

  const order = state.activeCustomer.order ?? 1;
  const support = hasImmediateTipPotential(player);
  const averageKeep = player.hand.reduce(
    (sum, card) => sum + cardKeepValue(state, player, card, policy),
    0,
  ) / player.hand.length;

  if (policy === 'tips') return !support && player.tips.length < 4;
  if (policy === 'cautious') return recipes < Math.min(2, order) && averageKeep < 3.5;
  return (recipes < Math.min(2, order) && !support) || averageKeep < 3;
};

const chooseRefreshDiscard = (
  state: GameState,
  player: PlayerState,
  policy: BotPolicy,
) => {
  if (player.refreshDiscards > 0 || player.refreshDraws > 0 || player.hand.length <= 3) return null;

  const ranked = [...player.hand]
    .map((card) => ({ card, keep: cardKeepValue(state, player, card, policy) }))
    .sort((a, b) => a.keep - b.keep || a.card.name.localeCompare(b.card.name));
  const weakest = ranked[0];
  if (!weakest) return null;

  const handLimit = currentHandLimit(state);
  const threshold = policy === 'tips' ? 5 : policy === 'adaptive' ? 3.25 : 2.5;
  if (player.hand.length < handLimit && weakest.keep >= threshold) return null;
  return weakest.card;
};

export const assignBotPolicies = (
  policy: SimulationPolicy,
  playerIds: string[],
  seed: number,
) => {
  const assignments = new Map<string, BotPolicy>();
  const offset = Math.abs(seed) % BOT_POLICIES.length;
  for (let index = 0; index < playerIds.length; index += 1) {
    assignments.set(
      playerIds[index],
      policy === 'mixed' ? BOT_POLICIES[(index + offset) % BOT_POLICIES.length] : policy,
    );
  }
  return assignments;
};

const resolveAssignments = (
  assignment: BotPolicyAssignment,
  playerIds: string[],
  seed: number,
) => typeof assignment === 'string'
  ? assignBotPolicies(assignment, playerIds, seed)
  : assignment;

export const refreshForBot = (
  state: GameState,
  playerId: string,
  policy: BotPolicy = 'adaptive',
) => {
  const player = findPlayer(state, playerId);
  if (!player || state.phase !== 'serve') return;

  if (shouldRedrawFrenchHand(state, player, policy)) {
    discardHandForRefresh(state, playerId);
    return;
  }

  const discard = chooseRefreshDiscard(state, player, policy);
  if (discard) discardFromHand(state, playerId, discard.id);
  refreshHand(state, playerId);
};

const uniqueWinningPlayerId = (state: GameState) => {
  const breakdowns = state.players
    .map((player) => valueBreakdown(state, player))
    .filter((breakdown) => breakdown.competing)
    .sort((a, b) => b.total - a.total);

  for (const breakdown of breakdowns) {
    if (breakdowns.filter((item) => item.total === breakdown.total).length === 1) {
      return breakdown.playerId;
    }
  }

  return null;
};

export const playBotPlayers = (
  state: GameState,
  playerIds: string[],
  assignment: BotPolicyAssignment = 'adaptive',
): BotTurnSummary[] => {
  if (state.phase !== 'serve') return [];
  const botIds = new Set(playerIds);
  const orderedPlayers = [...state.players]
    .filter((player) => botIds.has(player.id))
    .sort((a, b) => playerNumber(a.id) - playerNumber(b.id));
  const policies = resolveAssignments(assignment, orderedPlayers.map((player) => player.id), state.seed);

  for (const player of orderedPlayers) {
    refreshForBot(state, player.id, policies.get(player.id) ?? 'adaptive');
  }

  let current = state;
  const decisions = new Map<string, CandidateMetrics>();
  for (const player of orderedPlayers) {
    const decision = chooseMeal(current, player.id, policies.get(player.id) ?? 'adaptive');
    current = decision.state;
    decisions.set(player.id, decision.metrics);
  }

  Object.assign(state, current);

  const winningPlayerId = uniqueWinningPlayerId(state);
  const customerDiscarded = !winningPlayerId;
  const activeCustomerDeckId = state.activeCustomer?.deckId ?? null;
  const activeCustomerDeckName = state.activeCustomer?.deckName ?? null;

  return orderedPlayers.map((player, index) => {
    const currentPlayer = findPlayer(state, player.id) ?? player;
    const metrics = decisions.get(player.id) ?? metricsFor(
      state,
      player.id,
      policies.get(player.id) ?? 'adaptive',
    );
    return {
      playerId: currentPlayer.id,
      deckId: currentPlayer.deckId,
      deckName: currentPlayer.deckName,
      seat: state.players.findIndex((item) => item.id === currentPlayer.id) + 1 || index + 1,
      policy: policies.get(currentPlayer.id) ?? 'adaptive',
      activeCustomerDeckId,
      activeCustomerDeckName,
      servedRecipes: currentPlayer.meal.length,
      addedIngredients: currentPlayer.meal.reduce(
        (sum: number, dish: Dish) => sum + dish.ingredients.length,
        0,
      ),
      playedDrink: Boolean(currentPlayer.drinkPlayed),
      drinkSuccessful: Boolean(
        currentPlayer.drinkPlayed &&
        drinkRequirementMet(currentPlayer, currentPlayer.drinkPlayed),
      ),
      tipEligible: Boolean(eligibleTipCard(currentPlayer)),
      estimatedTieRisk: metrics?.tieRisk ?? 0,
      serveValue: valueBreakdown(state, currentPlayer).total,
      wonCustomer: winningPlayerId === currentPlayer.id,
      customerDiscarded,
    };
  });
};

export const playBotRound = (
  state: GameState,
  assignment: BotPolicyAssignment = 'adaptive',
): BotTurnSummary[] => {
  const summaries = playBotPlayers(
    state,
    state.players.map((player) => player.id),
    assignment,
  );

  resolveRound(state);
  return summaries;
};
