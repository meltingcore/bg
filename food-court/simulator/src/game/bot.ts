import type { CuisineId } from '../data/decks.ts';
import {
  addIngredient,
  canPlayDrink,
  currentHandLimit,
  discardFromHand,
  discardHandForRefresh,
  drinkRequirementMet,
  eligiblePromotionCard,
  GAME_ROUND_LIMIT,
  playDrink,
  refreshHand,
  resolveRound,
  scoreFor,
  scoreForPromotionCount,
  serveRecipe,
  valueBreakdown,
  type CardInstance,
  type Dish,
  type GameState,
  type PlayerState,
  type PromotionBidContext,
  type PromotionTrackingContext,
} from './engine.ts';

export const BOT_POLICIES = ['greedy', 'promotions', 'cautious', 'adaptive'] as const;
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
  promotionEligible: boolean;
  estimatedTieRisk: number;
  customerEffectValue: number;
  usedFrenchRedraw: boolean;
  usedItalianHandLimit: boolean;
  serveValue: number;
  promotionsBid: number;
  promotionTracked: boolean;
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
  promotionEligible: boolean;
  promotionScoreSwing: number;
  completesPromotions: boolean;
  tieRisk: number;
  customerEffectValue: number;
  abilityValue: number;
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

const scoreAtPromotions = (player: PlayerState, promotionCount: number) =>
  scoreForPromotionCount(player, promotionCount);

const promotionScoreSwing = (player: PlayerState) =>
  scoreAtPromotions(player, player.promotions.length + 1) - scoreAtPromotions(player, player.promotions.length);

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
  const promotionBonus = metrics.promotionEligible
    ? 7 + metrics.promotionScoreSwing * 2 + (metrics.completesPromotions ? 16 : 0)
    : 0;
  const jitter = policy === 'greedy'
    ? 0
    : (hashText(candidateKey(state, player)) % 1000) / 10_000;

  if (policy === 'greedy') {
    return metrics.value * 100 +
      metrics.customerEffectValue * 0.1 +
      metrics.abilityValue * 0.05 +
      Number(metrics.playedDrink) * 0.03 -
      metrics.cardsSpent * 0.001;
  }

  if (policy === 'promotions') {
    return metrics.value * 10 +
      promotionBonus * 1.5 -
      metrics.tieRisk * 4 -
      metrics.cardsSpent * 0.08 +
      metrics.customerEffectValue * 0.04 +
      jitter;
  }

  if (policy === 'cautious') {
    return metrics.value * 10 +
      promotionBonus * 0.35 -
      metrics.tieRisk * 18 -
      metrics.cardsSpent * 0.2 +
      metrics.handSize * 0.05 +
      metrics.customerEffectValue * 0.04 +
      jitter;
  }

  return metrics.value * 10 +
    promotionBonus -
    metrics.tieRisk * 10 -
    metrics.cardsSpent * 0.12 +
    metrics.handSize * 0.08 +
    metrics.customerEffectValue * 0.04 +
    jitter;
};

const metricsFor = (
  state: GameState,
  playerId: string,
  policy: BotPolicy,
): CandidateMetrics | null => {
  const player = findPlayer(state, playerId);
  if (!player) return null;

  const breakdown = valueBreakdown(state, player);
  const value = breakdown.total;
  const promotionEligible = Boolean(eligiblePromotionCard(player));
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
    promotionEligible,
    promotionScoreSwing: promotionEligible ? promotionScoreSwing(player) : 0,
    completesPromotions: promotionEligible && player.promotions.length === 2,
    tieRisk: tieRiskFor(state, player, value),
    customerEffectValue: breakdown.customer + breakdown.hand,
    abilityValue: breakdown.ability,
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
      Number(b.promotionEligible) - Number(a.promotionEligible) ||
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
  if (policy === 'promotions' && candidates.length > 0) {
    const bestValue = Math.max(...candidates.map((candidate) => candidate.value));
    const promotionCandidates = candidates.filter(
      (candidate) => candidate.promotionEligible && candidate.value >= bestValue - 1,
    );
    if (promotionCandidates.length > 0) competitiveCandidates = promotionCandidates;
  }

  const best = rankCandidates(competitiveCandidates)[0] ?? fallback;
  return { state: best.state, metrics: best };
};

const supportsPromotions = (player: PlayerState, card: CardInstance) => {
  if (player.deckId === 'italy') {
    return card.kind === 'ingredient' && card.tags.includes('exact');
  }
  if (player.deckId === 'france') {
    const promotedCourses = new Set(player.promotions.flatMap((promotion) => promotion.tags));
    return card.kind === 'recipe' && card.tags.some((tag) =>
      ['entree', 'appetizer', 'main', 'dessert'].includes(tag) && !promotedCourses.has(tag));
  }
  if (player.deckId === 'china') {
    return card.kind === 'recipe' && (card.tags.includes('rice') || card.tags.includes('noodles'));
  }
  if (player.deckId === 'india') {
    const tracked = new Set(player.promotions.map((promotion) => promotion.name));
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
    const tracked = new Set(player.promotions.map((promotion) => promotion.name));
    return card.kind === 'ingredient' &&
      card.tags.includes('seasoning') &&
      !tracked.has(card.name);
  }
  return card.kind === 'ingredient' &&
    card.ingredientType === 'ingredient' &&
    card.tags.includes('hot');
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

  if (supportsPromotions(player, card)) {
    value += policy === 'promotions' ? 8 : policy === 'adaptive' ? 3.5 : policy === 'cautious' ? 1.5 : 0.5;
  }
  if (card.kind === 'recipe' && (state.activeCustomer?.order ?? 0) >= 2) value += 0.5;
  if (card.kind === 'drink' && player.hand.filter((item) => item.kind === 'drink').length > 1) value -= 1;
  return value;
};

const hasImmediatePromotionPotential = (player: PlayerState) => {
  if (player.deckId === 'italy') {
    const recipes = player.hand.filter((card) => card.kind === 'recipe');
    const ingredients = new Set(player.hand.filter((card) => card.kind === 'ingredient').map((card) => card.name));
    return recipes.some((recipe) => recipe.exactIngredient && ingredients.has(recipe.exactIngredient));
  }
  if (player.deckId === 'china') {
    const recipes = player.hand.filter((card) => card.kind === 'recipe');
    return ['rice', 'noodles'].some(
      (tag) => recipes.filter((card) => card.tags.includes(tag)).length >= 2,
    );
  }
  return player.hand.some((card) => supportsPromotions(player, card));
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
  const support = hasImmediatePromotionPotential(player);
  const averageKeep = player.hand.reduce(
    (sum, card) => sum + cardKeepValue(state, player, card, policy),
    0,
  ) / player.hand.length;

  if (policy === 'promotions') return !support && player.promotions.length < 3;
  if (policy === 'cautious') return recipes < Math.min(2, order) && averageKeep < 3.5;
  return (recipes < Math.min(2, order) && !support) || averageKeep < 3;
};

const chooseRefreshDiscards = (
  state: GameState,
  player: PlayerState,
  policy: BotPolicy,
) => {
  if (player.refreshDiscards > 0 || player.hand.length === 0) return [];

  const ranked = [...player.hand]
    .map((card) => ({ card, keep: cardKeepValue(state, player, card, policy) }))
    .sort((a, b) => a.keep - b.keep || a.card.name.localeCompare(b.card.name));
  const handLimit = currentHandLimit(state);
  const threshold = policy === 'promotions' ? 5 : policy === 'adaptive' ? 3.25 : 2.5;
  return ranked
    .filter(({ keep }) => player.hand.length >= handLimit || keep < threshold)
    .slice(0, 2)
    .map(({ card }) => card);
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
  if (!player || state.phase !== 'serve') return false;

  refreshHand(state, playerId);

  if (shouldRedrawFrenchHand(state, player, policy)) {
    discardHandForRefresh(state, playerId);
    return true;
  }

  const discards = chooseRefreshDiscards(state, player, policy);
  discards.forEach((card) => discardFromHand(state, playerId, card.id));
  return false;
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
  const frenchRedraws = new Map<string, boolean>();
  const italianHandLimitUses = new Map<string, boolean>();

  for (const player of orderedPlayers) {
    frenchRedraws.set(
      player.id,
      refreshForBot(state, player.id, policies.get(player.id) ?? 'adaptive'),
    );
    italianHandLimitUses.set(
      player.id,
      state.activeCustomer?.deckId === 'italy' && player.hand.length > 6,
    );
  }

  let current = state;
  const decisions = new Map<string, CandidateMetrics>();
  for (const player of orderedPlayers) {
    const decision = chooseMeal(current, player.id, policies.get(player.id) ?? 'adaptive');
    current = decision.state;
    decisions.set(player.id, decision.metrics);
  }

  Object.assign(state, current);

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
      promotionEligible: Boolean(eligiblePromotionCard(currentPlayer)),
      estimatedTieRisk: metrics?.tieRisk ?? 0,
      customerEffectValue: metrics?.customerEffectValue ?? 0,
      usedFrenchRedraw: frenchRedraws.get(player.id) ?? false,
      usedItalianHandLimit: italianHandLimitUses.get(player.id) ?? false,
      serveValue: valueBreakdown(state, currentPlayer).total,
      promotionsBid: 0,
      promotionTracked: false,
      wonCustomer: false,
      customerDiscarded: false,
    };
  });
};

const promotionRecoveryPotential = (player: PlayerState, promotion: CardInstance) => {
  const available = [
    ...player.hand,
    ...player.drawPile,
    ...player.discard,
    ...player.meal.flatMap((dish) => [dish.recipe, ...dish.ingredients]),
  ].filter((card) => card.id !== promotion.id);

  if (player.deckId === 'italy') {
    return available.filter((card) =>
      card.name === promotion.name || card.exactIngredient === promotion.name).length;
  }
  if (player.deckId === 'france') {
    const courses = promotion.tags.filter((tag) =>
      ['entree', 'appetizer', 'main', 'dessert'].includes(tag));
    return available.filter((card) =>
      card.kind === 'recipe' && courses.some((course) => card.tags.includes(course))).length;
  }
  if (player.deckId === 'china') {
    const types = promotion.tags.filter((tag) => ['rice', 'noodles'].includes(tag));
    return available.filter((card) =>
      card.kind === 'recipe' && types.some((type) => card.tags.includes(type))).length;
  }
  if (player.deckId === 'india' || player.deckId === 'japan') {
    return available.filter((card) => card.kind === 'ingredient' && card.name === promotion.name).length;
  }
  if (player.deckId === 'usa') {
    return available.filter((card) =>
      card.kind === 'recipe' && (card.tags.includes('burger') || card.tags.includes('steak'))).length;
  }
  if (player.deckId === 'turkiye') {
    return available.filter((card) => card.kind === 'recipe' && card.tags.includes('kebab')).length;
  }
  return available.filter((card) =>
    card.kind === 'ingredient' && card.tags.includes('hot')).length;
};

const choosePromotionCard = (
  state: GameState,
  player: PlayerState,
  cards: CardInstance[],
  preferEasyRecovery: boolean,
) => [...cards].sort((a, b) => {
  const recoveryDelta = promotionRecoveryPotential(player, b) - promotionRecoveryPotential(player, a);
  if (recoveryDelta !== 0) return preferEasyRecovery ? recoveryDelta : -recoveryDelta;
  return hashText(`${state.seed}:${state.round}:${player.id}:${a.id}`) -
    hashText(`${state.seed}:${state.round}:${player.id}:${b.id}`);
})[0] ?? null;

const choosePromotionToSpend = (
  policy: BotPolicy,
  state: GameState,
  context: PromotionBidContext,
) => {
  const { player, customer, bidLevel, role } = context;
  if (!player.promotions.length) return null;
  const remaining = player.promotions.length - 1;
  const opportunityCost = scoreFor(player) - scoreForPromotionCount(player, remaining);
  const prize = (customer.order ?? 0) + Number(remaining >= (customer.order ?? 0));
  const pressure = bidLevel - 1;
  const policyThreshold = {
    greedy: 0.15,
    promotions: 1.35,
    cautious: 1.05,
    adaptive: 0.65,
  }[policy];
  const jitter = (hashText(`${state.seed}:${state.round}:${player.id}:${bidLevel}:${role}`) % 100) / 200;
  return prize - opportunityCost - pressure + jitter > policyThreshold
    ? choosePromotionCard(state, player, player.promotions, true)
    : null;
};

const choosePromotionToTrack = (
  policy: BotPolicy,
  state: GameState,
  context: PromotionTrackingContext,
) => {
  const { player, eligibleCards } = context;
  if (eligibleCards.length === 0) return null;
  const scoreGain = scoreForPromotionCount(player, player.promotions.length + 1) - scoreFor(player);
  const roundsRemaining = GAME_ROUND_LIMIT - state.round;
  const shouldTrack = policy === 'promotions' ||
    scoreGain > 0 ||
    (policy === 'adaptive' && roundsRemaining > 0) ||
    (policy === 'greedy' && roundsRemaining >= 2) ||
    (policy === 'cautious' && roundsRemaining >= 2 && player.promotions.length < 2);
  return shouldTrack
    ? choosePromotionCard(state, player, eligibleCards, false)
    : null;
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
  const policies = resolveAssignments(
    assignment,
    state.players.map((player) => player.id),
    state.seed,
  );
  const resolution = resolveRound(
    state,
    (context) => choosePromotionToSpend(
      policies.get(context.player.id) ?? 'adaptive',
      state,
      context,
    ),
    (context) => choosePromotionToTrack(
      policies.get(context.player.id) ?? 'adaptive',
      state,
      context,
    ),
  );
  summaries.forEach((summary) => {
    summary.promotionsBid = resolution?.promotionBids[summary.playerId] ?? 0;
    summary.promotionTracked = Boolean(resolution?.trackedPromotions[summary.playerId]);
    summary.wonCustomer = resolution?.winnerId === summary.playerId;
    summary.customerDiscarded = !resolution?.winnerId;
  });
  return summaries;
};
