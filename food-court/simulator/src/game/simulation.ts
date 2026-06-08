import { DECKS, type CuisineId } from '../data/decks.ts';
import { playBotRound, type BotPolicy, type BotTurnSummary } from './bot.ts';
import { createGame, scoreFor, type PlayerState } from './engine.ts';

export interface SimulationOptions {
  games: number;
  players: number;
  decks: CuisineId[];
  seed: number;
  policy: BotPolicy;
}

export interface PlayerResult {
  playerId: string;
  deckId: CuisineId;
  deckName: string;
  score: number;
  customers: number;
  tips: number;
  drinkAttempts: number;
  averageServeValue: number;
  winShare: number;
  topFinish: boolean;
}

export interface GameResult {
  seed: number;
  rounds: number;
  players: PlayerResult[];
  discardedCustomers: number;
  contestedRounds: number;
  drinkAttempts: number;
  totalServeValue: number;
  servedMeals: number;
}

export interface DeckAggregate {
  deckId: CuisineId;
  deckName: string;
  games: number;
  winShare: number;
  topFinishes: number;
  totalScore: number;
  totalCustomers: number;
  totalTips: number;
  totalServeValue: number;
  serveValueSamples: number;
  drinkAttempts: number;
}

export interface SimulationResult {
  options: SimulationOptions;
  games: GameResult[];
  aggregates: DeckAggregate[];
  insights: string[];
  averageRounds: number;
  averageDiscardedCustomers: number;
  averageDrinksPlayed: number;
}

export const defaultSimulationOptions: SimulationOptions = {
  games: 10,
  players: 4,
  decks: ['italy', 'france', 'china', 'india'],
  seed: 1000,
  policy: 'greedy',
};

export const deckIds = new Set(DECKS.map((deck) => deck.id));

export const avg = (total: number, count: number) => (count === 0 ? 0 : total / count);
export const fixed = (value: number) => value.toFixed(2);
export const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export const validateSimulationOptions = (options: SimulationOptions) => {
  if (!Number.isInteger(options.games) || options.games <= 0) {
    throw new Error('Games must be a positive integer.');
  }
  if (!Number.isInteger(options.players) || options.players < 2 || options.players > 4) {
    throw new Error('Players must be between 2 and 4.');
  }
  if (options.policy !== 'greedy') throw new Error(`Unsupported policy "${options.policy}".`);
  if (options.decks.length !== options.players) {
    throw new Error(`Choose exactly ${options.players} decks.`);
  }

  const duplicates = options.decks.filter((deckId, index) => options.decks.indexOf(deckId) !== index);
  if (duplicates.length > 0) throw new Error(`Duplicate decks are not supported: ${duplicates.join(', ')}`);

  const invalid = options.decks.filter((deckId) => !deckIds.has(deckId));
  if (invalid.length > 0) throw new Error(`Unknown deck ids: ${invalid.join(', ')}`);
};

const playerResult = (
  player: PlayerState,
  winners: PlayerState[],
  turnSummaries: BotTurnSummary[],
): PlayerResult => {
  const playerTurns = turnSummaries.filter((summary) => summary.playerId === player.id);

  return {
    playerId: player.id,
    deckId: player.deckId,
    deckName: player.deckName,
    score: scoreFor(player),
    customers: player.scoring.length,
    tips: player.tips.length,
    drinkAttempts: playerTurns.filter((summary) => summary.playedDrink).length,
    averageServeValue: avg(
      playerTurns.reduce((sum, summary) => sum + summary.serveValue, 0),
      playerTurns.length,
    ),
    winShare: winners.some((winner) => winner.id === player.id) ? 1 / winners.length : 0,
    topFinish: winners.some((winner) => winner.id === player.id),
  };
};

export const runGame = (options: SimulationOptions, seed: number): GameResult => {
  const state = createGame(DECKS, options.decks, seed);
  const turnSummaries: BotTurnSummary[] = [];
  let discardedCustomers = 0;
  let contestedRounds = 0;

  while (state.phase !== 'game-over') {
    const discardedBefore = state.customerDiscard.length;
    const summaries = playBotRound(state, options.policy);
    turnSummaries.push(...summaries);
    contestedRounds += 1;
    discardedCustomers += Math.max(0, state.customerDiscard.length - discardedBefore);

    if (contestedRounds > 100) {
      throw new Error(`Simulation exceeded 100 rounds for seed ${seed}.`);
    }
  }

  const highScore = Math.max(...state.players.map(scoreFor));
  const winners = state.players.filter((player) => scoreFor(player) === highScore);

  return {
    seed,
    rounds: state.round,
    players: state.players.map((player) => playerResult(player, winners, turnSummaries)),
    discardedCustomers,
    contestedRounds,
    drinkAttempts: turnSummaries.filter((summary) => summary.playedDrink).length,
    totalServeValue: turnSummaries.reduce((sum, summary) => sum + summary.serveValue, 0),
    servedMeals: turnSummaries.filter((summary) => summary.servedRecipes > 0).length,
  };
};

export const aggregateByDeck = (games: GameResult[]) => {
  const aggregates = new Map<CuisineId, DeckAggregate>();

  for (const game of games) {
    for (const player of game.players) {
      const aggregate = aggregates.get(player.deckId) ?? {
        deckId: player.deckId,
        deckName: player.deckName,
        games: 0,
        winShare: 0,
        topFinishes: 0,
        totalScore: 0,
        totalCustomers: 0,
        totalTips: 0,
        totalServeValue: 0,
        serveValueSamples: 0,
        drinkAttempts: 0,
      };

      aggregate.games += 1;
      aggregate.winShare += player.winShare;
      aggregate.topFinishes += player.topFinish ? 1 : 0;
      aggregate.totalScore += player.score;
      aggregate.totalCustomers += player.customers;
      aggregate.totalTips += player.tips;
      aggregate.totalServeValue += player.averageServeValue;
      aggregate.serveValueSamples += 1;
      aggregate.drinkAttempts += player.drinkAttempts;

      aggregates.set(player.deckId, aggregate);
    }
  }

  return [...aggregates.values()].sort((a, b) => b.winShare - a.winShare);
};

export const simulationInsights = (
  options: SimulationOptions,
  games: GameResult[],
  aggregates: DeckAggregate[],
) => {
  const lines: string[] = [];
  const expected = 1 / options.players;
  const averageRounds = avg(games.reduce((sum, game) => sum + game.rounds, 0), games.length);
  const discardRate = avg(games.reduce((sum, game) => sum + game.discardedCustomers, 0), games.length);
  const spreads = games.map((game) => {
    const scores = game.players.map((player) => player.score);
    return Math.max(...scores) - Math.min(...scores);
  });
  const averageSpread = avg(spreads.reduce((sum, spread) => sum + spread, 0), spreads.length);

  if (options.games < 100) {
    lines.push('Sample is small; treat win-rate findings as smoke-test signals, not balance proof.');
  }

  for (const deck of aggregates) {
    const winRate = deck.winShare / deck.games;
    if (winRate >= expected + 0.15) {
      lines.push(`${deck.deckName} is over expected win share by ${pct(winRate - expected)}.`);
    }
    if (winRate <= expected - 0.15) {
      lines.push(`${deck.deckName} is under expected win share by ${pct(expected - winRate)}.`);
    }
    if (avg(deck.totalTips, deck.games) < 1.25) {
      lines.push(`${deck.deckName} rarely reaches Tips tracking under this bot policy.`);
    }
  }

  if (discardRate > averageRounds * 0.25) {
    lines.push('More than a quarter of customers are being discarded from tied or empty contests.');
  }
  if (averageSpread <= 2) {
    lines.push('Average score spread is very tight; tie-breakers and endgame scoring may matter often.');
  }

  if (lines.length === 0) lines.push('No strong balance flags from this run.');
  return lines;
};

export const runSimulation = (input: SimulationOptions): SimulationResult => {
  const options = { ...input, decks: [...input.decks] };
  validateSimulationOptions(options);

  const games = Array.from({ length: options.games }, (_, index) => runGame(options, options.seed + index));
  return buildSimulationResult(options, games);
};

export const buildSimulationResult = (
  input: SimulationOptions,
  games: GameResult[],
): SimulationResult => {
  const options = { ...input, decks: [...input.decks] };
  const aggregates = aggregateByDeck(games);

  return {
    options,
    games,
    aggregates,
    insights: simulationInsights(options, games, aggregates),
    averageRounds: avg(games.reduce((sum, game) => sum + game.rounds, 0), games.length),
    averageDiscardedCustomers: avg(
      games.reduce((sum, game) => sum + game.discardedCustomers, 0),
      games.length,
    ),
    averageDrinksPlayed: avg(games.reduce((sum, game) => sum + game.drinkAttempts, 0), games.length),
  };
};

const pad = (value: string, width: number) => value.padEnd(width, ' ');

export const deckTable = (aggregates: DeckAggregate[]) => {
  const rows = [
    ['Deck', 'Win Share', 'Top', 'Avg VP', 'Avg Cust', 'Avg Tips', 'Avg SV', 'Drink/G'],
    ...aggregates.map((deck) => [
      deck.deckName,
      pct(deck.winShare / deck.games),
      String(deck.topFinishes),
      fixed(avg(deck.totalScore, deck.games)),
      fixed(avg(deck.totalCustomers, deck.games)),
      fixed(avg(deck.totalTips, deck.games)),
      fixed(avg(deck.totalServeValue, deck.serveValueSamples)),
      fixed(avg(deck.drinkAttempts, deck.games)),
    ]),
  ];

  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => pad(cell, widths[column])).join('  ')).join('\n');
};

export const formatSimulationReport = (result: SimulationResult) => [
  'Food Court Automated Simulation',
  '',
  `Games: ${result.options.games}`,
  `Players: ${result.options.players}`,
  `Decks: ${result.options.decks.join(', ')}`,
  `Policy: ${result.options.policy}`,
  `Seeds: ${result.options.seed}-${result.options.seed + result.options.games - 1}`,
  '',
  deckTable(result.aggregates),
  '',
  `Average rounds: ${fixed(result.averageRounds)}`,
  `Average discarded customers: ${fixed(result.averageDiscardedCustomers)}`,
  `Average drinks played: ${fixed(result.averageDrinksPlayed)}`,
  '',
  'Insights:',
  ...result.insights.map((line) => `- ${line}`),
].join('\n');
