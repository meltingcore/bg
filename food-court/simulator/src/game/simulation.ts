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
  seat: number;
  score: number;
  customers: number;
  tips: number;
  tipsCompleted: boolean;
  drinkAttempts: number;
  drinkSuccesses: number;
  averageServeValue: number;
  winShare: number;
  topFinish: boolean;
}

export interface CustomerRoundResult {
  customerDeckId: CuisineId;
  customerDeckName: string;
  winnerDeckId: CuisineId | null;
  winnerDeckName: string | null;
  discarded: boolean;
  winningServeValue: number;
}

export interface GameResult {
  seed: number;
  rounds: number;
  players: PlayerResult[];
  discardedCustomers: number;
  contestedRounds: number;
  drinkAttempts: number;
  drinkSuccesses: number;
  totalServeValue: number;
  servedMeals: number;
  scoreSpread: number;
  customerResults: CustomerRoundResult[];
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
  drinkSuccesses: number;
  tipsCompletions: number;
  totalScoreSquared: number;
}

export interface MatchupRate {
  deckId: CuisineId;
  deckName: string;
  opponentDeckId: CuisineId;
  opponentDeckName: string;
  games: number;
  winShare: number;
  ties: number;
  totalScoreDelta: number;
}

export interface ScoreDistribution {
  deckId: CuisineId;
  deckName: string;
  samples: number;
  min: number;
  p10: number;
  median: number;
  p90: number;
  max: number;
  mean: number;
  standardDeviation: number;
}

export interface SeatBias {
  seat: number;
  games: number;
  winShare: number;
  topFinishes: number;
  averageScore: number;
}

export interface CustomerImpact {
  customerDeckId: CuisineId;
  customerDeckName: string;
  appearances: number;
  awarded: number;
  discarded: number;
  averageWinningServeValue: number;
  winnerDecks: Array<{ deckId: CuisineId; deckName: string; wins: number }>;
}

export interface DrinkDiagnostic {
  deckId: CuisineId;
  deckName: string;
  games: number;
  attempts: number;
  successes: number;
}

export interface TipsCompletionDiagnostic {
  deckId: CuisineId;
  deckName: string;
  games: number;
  completions: number;
  averageTips: number;
}

export interface BalanceDiagnostics {
  matchups: MatchupRate[];
  scoreDistributions: ScoreDistribution[];
  seatBias: SeatBias[];
  customerImpact: CustomerImpact[];
  drinkSuccess: DrinkDiagnostic[];
  tipsCompletion: TipsCompletionDiagnostic[];
}

export interface SimulationResult {
  options: SimulationOptions;
  games: GameResult[];
  aggregates: DeckAggregate[];
  diagnostics: BalanceDiagnostics;
  insights: string[];
  recommendations: string[];
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
    seat: Number(player.id.replace(/\D/g, '')) || 0,
    score: scoreFor(player),
    customers: player.scoring.length,
    tips: player.tips.length,
    tipsCompleted: player.tips.length >= 4,
    drinkAttempts: playerTurns.filter((summary) => summary.playedDrink).length,
    drinkSuccesses: playerTurns.filter((summary) => summary.drinkSuccessful).length,
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
  const customerResults: CustomerRoundResult[] = [];
  let discardedCustomers = 0;
  let contestedRounds = 0;

  while (state.phase !== 'game-over') {
    const discardedBefore = state.customerDiscard.length;
    const summaries = playBotRound(state, options.policy);
    turnSummaries.push(...summaries);
    const firstSummary = summaries[0];
    const winnerSummary = summaries.find((summary) => summary.wonCustomer);
    if (firstSummary?.activeCustomerDeckId && firstSummary.activeCustomerDeckName) {
      customerResults.push({
        customerDeckId: firstSummary.activeCustomerDeckId,
        customerDeckName: firstSummary.activeCustomerDeckName,
        winnerDeckId: winnerSummary?.deckId ?? null,
        winnerDeckName: winnerSummary?.deckName ?? null,
        discarded: firstSummary.customerDiscarded,
        winningServeValue: winnerSummary?.serveValue ?? 0,
      });
    }
    contestedRounds += 1;
    discardedCustomers += Math.max(0, state.customerDiscard.length - discardedBefore);

    if (contestedRounds > 100) {
      throw new Error(`Simulation exceeded 100 rounds for seed ${seed}.`);
    }
  }

  const highScore = Math.max(...state.players.map(scoreFor));
  const winners = state.players.filter((player) => scoreFor(player) === highScore);
  const scores = state.players.map(scoreFor);

  return {
    seed,
    rounds: state.round,
    players: state.players.map((player) => playerResult(player, winners, turnSummaries)),
    discardedCustomers,
    contestedRounds,
    drinkAttempts: turnSummaries.filter((summary) => summary.playedDrink).length,
    drinkSuccesses: turnSummaries.filter((summary) => summary.drinkSuccessful).length,
    totalServeValue: turnSummaries.reduce((sum, summary) => sum + summary.serveValue, 0),
    servedMeals: turnSummaries.filter((summary) => summary.servedRecipes > 0).length,
    scoreSpread: Math.max(...scores) - Math.min(...scores),
    customerResults,
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
        drinkSuccesses: 0,
        tipsCompletions: 0,
        totalScoreSquared: 0,
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
      aggregate.drinkSuccesses += player.drinkSuccesses;
      aggregate.tipsCompletions += player.tipsCompleted ? 1 : 0;
      aggregate.totalScoreSquared += player.score * player.score;

      aggregates.set(player.deckId, aggregate);
    }
  }

  return [...aggregates.values()].sort((a, b) => b.winShare - a.winShare);
};

const quantile = (sortedValues: number[], q: number) => {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sortedValues[base + 1];
  return next === undefined ? sortedValues[base] : sortedValues[base] + rest * (next - sortedValues[base]);
};

const buildMatchups = (games: GameResult[]): MatchupRate[] => {
  const matchups = new Map<string, MatchupRate>();

  const ensure = (player: PlayerResult, opponent: PlayerResult) => {
    const key = `${player.deckId}:${opponent.deckId}`;
    const matchup = matchups.get(key) ?? {
      deckId: player.deckId,
      deckName: player.deckName,
      opponentDeckId: opponent.deckId,
      opponentDeckName: opponent.deckName,
      games: 0,
      winShare: 0,
      ties: 0,
      totalScoreDelta: 0,
    };
    matchups.set(key, matchup);
    return matchup;
  };

  for (const game of games) {
    for (let left = 0; left < game.players.length; left += 1) {
      for (let right = left + 1; right < game.players.length; right += 1) {
        const a = game.players[left];
        const b = game.players[right];
        const aShare = a.score === b.score ? 0.5 : a.score > b.score ? 1 : 0;
        const bShare = 1 - aShare;

        const aMatchup = ensure(a, b);
        aMatchup.games += 1;
        aMatchup.winShare += aShare;
        aMatchup.ties += a.score === b.score ? 1 : 0;
        aMatchup.totalScoreDelta += a.score - b.score;

        const bMatchup = ensure(b, a);
        bMatchup.games += 1;
        bMatchup.winShare += bShare;
        bMatchup.ties += a.score === b.score ? 1 : 0;
        bMatchup.totalScoreDelta += b.score - a.score;
      }
    }
  }

  return [...matchups.values()].sort(
    (a, b) => a.deckName.localeCompare(b.deckName) || a.opponentDeckName.localeCompare(b.opponentDeckName),
  );
};

const buildScoreDistributions = (games: GameResult[]): ScoreDistribution[] => {
  const scores = new Map<CuisineId, { deckName: string; values: number[] }>();

  for (const game of games) {
    for (const player of game.players) {
      const entry = scores.get(player.deckId) ?? { deckName: player.deckName, values: [] };
      entry.values.push(player.score);
      scores.set(player.deckId, entry);
    }
  }

  return [...scores.entries()]
    .map(([deckId, entry]) => {
      const values = [...entry.values].sort((a, b) => a - b);
      const mean = avg(values.reduce((sum, value) => sum + value, 0), values.length);
      const variance = avg(values.reduce((sum, value) => sum + (value - mean) ** 2, 0), values.length);
      return {
        deckId,
        deckName: entry.deckName,
        samples: values.length,
        min: values[0] ?? 0,
        p10: quantile(values, 0.1),
        median: quantile(values, 0.5),
        p90: quantile(values, 0.9),
        max: values[values.length - 1] ?? 0,
        mean,
        standardDeviation: Math.sqrt(variance),
      };
    })
    .sort((a, b) => b.mean - a.mean);
};

const buildSeatBias = (games: GameResult[]): SeatBias[] => {
  const seats = new Map<number, { games: number; winShare: number; topFinishes: number; totalScore: number }>();

  for (const game of games) {
    for (const player of game.players) {
      const seat = seats.get(player.seat) ?? { games: 0, winShare: 0, topFinishes: 0, totalScore: 0 };
      seat.games += 1;
      seat.winShare += player.winShare;
      seat.topFinishes += player.topFinish ? 1 : 0;
      seat.totalScore += player.score;
      seats.set(player.seat, seat);
    }
  }

  return [...seats.entries()]
    .map(([seat, value]) => ({
      seat,
      games: value.games,
      winShare: value.winShare,
      topFinishes: value.topFinishes,
      averageScore: avg(value.totalScore, value.games),
    }))
    .sort((a, b) => a.seat - b.seat);
};

const buildCustomerImpact = (games: GameResult[]): CustomerImpact[] => {
  const impacts = new Map<
    CuisineId,
    {
      customerDeckName: string;
      appearances: number;
      awarded: number;
      discarded: number;
      totalWinningServeValue: number;
      winnerDecks: Map<CuisineId, { deckName: string; wins: number }>;
    }
  >();

  for (const game of games) {
    for (const result of game.customerResults) {
      const impact = impacts.get(result.customerDeckId) ?? {
        customerDeckName: result.customerDeckName,
        appearances: 0,
        awarded: 0,
        discarded: 0,
        totalWinningServeValue: 0,
        winnerDecks: new Map<CuisineId, { deckName: string; wins: number }>(),
      };

      impact.appearances += 1;
      impact.discarded += result.discarded ? 1 : 0;
      if (result.winnerDeckId && result.winnerDeckName) {
        impact.awarded += 1;
        impact.totalWinningServeValue += result.winningServeValue;
        const winner = impact.winnerDecks.get(result.winnerDeckId) ?? {
          deckName: result.winnerDeckName,
          wins: 0,
        };
        winner.wins += 1;
        impact.winnerDecks.set(result.winnerDeckId, winner);
      }

      impacts.set(result.customerDeckId, impact);
    }
  }

  return [...impacts.entries()]
    .map(([customerDeckId, impact]) => ({
      customerDeckId,
      customerDeckName: impact.customerDeckName,
      appearances: impact.appearances,
      awarded: impact.awarded,
      discarded: impact.discarded,
      averageWinningServeValue: avg(impact.totalWinningServeValue, impact.awarded),
      winnerDecks: [...impact.winnerDecks.entries()]
        .map(([deckId, winner]) => ({ deckId, deckName: winner.deckName, wins: winner.wins }))
        .sort((a, b) => b.wins - a.wins),
    }))
    .sort((a, b) => a.customerDeckName.localeCompare(b.customerDeckName));
};

export const buildDiagnostics = (
  games: GameResult[],
  aggregates: DeckAggregate[],
): BalanceDiagnostics => ({
  matchups: buildMatchups(games),
  scoreDistributions: buildScoreDistributions(games),
  seatBias: buildSeatBias(games),
  customerImpact: buildCustomerImpact(games),
  drinkSuccess: aggregates
    .map((deck) => ({
      deckId: deck.deckId,
      deckName: deck.deckName,
      games: deck.games,
      attempts: deck.drinkAttempts,
      successes: deck.drinkSuccesses,
    }))
    .sort((a, b) => avg(b.successes, b.attempts) - avg(a.successes, a.attempts)),
  tipsCompletion: aggregates
    .map((deck) => ({
      deckId: deck.deckId,
      deckName: deck.deckName,
      games: deck.games,
      completions: deck.tipsCompletions,
      averageTips: avg(deck.totalTips, deck.games),
    }))
    .sort((a, b) => avg(b.completions, b.games) - avg(a.completions, a.games)),
});

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

export const balanceRecommendations = (
  options: SimulationOptions,
  aggregates: DeckAggregate[],
  diagnostics: BalanceDiagnostics,
) => {
  const lines: string[] = [];
  const expected = 1 / options.players;

  for (const deck of aggregates) {
    const winRate = avg(deck.winShare, deck.games);
    const tipsCompletion = avg(deck.tipsCompletions, deck.games);
    const drinkRate = avg(deck.drinkSuccesses, deck.drinkAttempts);

    if (winRate >= expected + 0.12) {
      lines.push(
        `Pressure-test ${deck.deckName}: its win share is ${pct(winRate)}, above the ${pct(expected)} table baseline. Try a small serve-value or Tips-tracking nerf first.`,
      );
    } else if (winRate <= expected - 0.12) {
      lines.push(
        `Support ${deck.deckName}: its win share is ${pct(winRate)}, below the ${pct(expected)} table baseline. Start by making its Tips tracking or signature ingredients easier to assemble.`,
      );
    }

    if (deck.drinkAttempts >= deck.games * 0.35 && drinkRate < 0.3) {
      lines.push(`${deck.deckName} drinks are often attempted but only succeed ${pct(drinkRate)} of the time; simplify at least one drink trigger.`);
    }
    if (deck.drinkAttempts >= deck.games * 0.35 && drinkRate > 0.8) {
      lines.push(`${deck.deckName} drinks succeed ${pct(drinkRate)} of the time when played; consider making the easiest trigger narrower.`);
    }
    if (tipsCompletion < 0.12) {
      lines.push(`${deck.deckName} almost never completes Tips tracking (${pct(tipsCompletion)}); check whether its tracking card type appears too late or too rarely.`);
    }
    if (tipsCompletion > 0.65) {
      lines.push(`${deck.deckName} completes Tips tracking very often (${pct(tipsCompletion)}); verify that its end condition is not ending games too early.`);
    }
  }

  for (const matchup of diagnostics.matchups) {
    const rate = avg(matchup.winShare, matchup.games);
    if (matchup.games >= Math.max(20, options.games * 0.6) && rate >= 0.68) {
      lines.push(
        `${matchup.deckName} is heavily favored into ${matchup.opponentDeckName} (${pct(rate)} head-to-head score share); inspect whether their customer abilities reward the same meal pattern.`,
      );
    }
  }

  for (const seat of diagnostics.seatBias) {
    const rate = avg(seat.winShare, seat.games);
    if (rate >= expected + 0.1) {
      lines.push(`Seat ${seat.seat} is overperforming at ${pct(rate)} win share; rotate starting seat in live tests or randomize customer reveal tie-break exposure.`);
    }
  }

  for (const impact of diagnostics.customerImpact) {
    const discardRate = avg(impact.discarded, impact.appearances);
    const topWinner = impact.winnerDecks[0];
    if (discardRate > 0.35) {
      lines.push(`${impact.customerDeckName} customers are discarded ${pct(discardRate)} of the time; their ability may be producing too many tied serve values.`);
    }
    if (topWinner && avg(topWinner.wins, impact.awarded) > 0.5) {
      lines.push(`${impact.customerDeckName} customers are won by ${topWinner.deckName} more than half the time; check for a nationality ability that disproportionately rewards that deck.`);
    }
  }

  if (lines.length === 0) {
    lines.push('No immediate balance changes recommended from this run; increase sample size or test different deck mixes before changing rules.');
  }

  return lines.slice(0, 12);
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
  const diagnostics = buildDiagnostics(games, aggregates);

  return {
    options,
    games,
    aggregates,
    diagnostics,
    insights: simulationInsights(options, games, aggregates),
    recommendations: balanceRecommendations(options, aggregates, diagnostics),
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
    ['Deck', 'Win Share', 'Top', 'Avg VP', 'Avg Cust', 'Avg Tips', 'Avg SV', 'Drink/G', 'Drink %', 'Tips %'],
    ...aggregates.map((deck) => [
      deck.deckName,
      pct(deck.winShare / deck.games),
      String(deck.topFinishes),
      fixed(avg(deck.totalScore, deck.games)),
      fixed(avg(deck.totalCustomers, deck.games)),
      fixed(avg(deck.totalTips, deck.games)),
      fixed(avg(deck.totalServeValue, deck.serveValueSamples)),
      fixed(avg(deck.drinkAttempts, deck.games)),
      pct(avg(deck.drinkSuccesses, deck.drinkAttempts)),
      pct(avg(deck.tipsCompletions, deck.games)),
    ]),
  ];

  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => pad(cell, widths[column])).join('  ')).join('\n');
};

const tableFromRows = (rows: string[][]) => {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map((row) => row.map((cell, column) => pad(cell, widths[column])).join('  ')).join('\n');
};

const matchupTable = (diagnostics: BalanceDiagnostics) =>
  tableFromRows([
    ['Deck', 'Opponent', 'Share', 'Tie', 'Delta'],
    ...diagnostics.matchups.map((matchup) => [
      matchup.deckName,
      matchup.opponentDeckName,
      pct(avg(matchup.winShare, matchup.games)),
      pct(avg(matchup.ties, matchup.games)),
      fixed(avg(matchup.totalScoreDelta, matchup.games)),
    ]),
  ]);

const scoreDistributionTable = (diagnostics: BalanceDiagnostics) =>
  tableFromRows([
    ['Deck', 'Mean', 'P10', 'Median', 'P90', 'Range', 'StdDev'],
    ...diagnostics.scoreDistributions.map((score) => [
      score.deckName,
      fixed(score.mean),
      fixed(score.p10),
      fixed(score.median),
      fixed(score.p90),
      `${score.min}-${score.max}`,
      fixed(score.standardDeviation),
    ]),
  ]);

const seatBiasTable = (diagnostics: BalanceDiagnostics) =>
  tableFromRows([
    ['Seat', 'Win Share', 'Top', 'Avg VP'],
    ...diagnostics.seatBias.map((seat) => [
      String(seat.seat),
      pct(avg(seat.winShare, seat.games)),
      String(seat.topFinishes),
      fixed(seat.averageScore),
    ]),
  ]);

const customerImpactTable = (diagnostics: BalanceDiagnostics) =>
  tableFromRows([
    ['Customer', 'Awarded', 'Discard', 'Avg Win SV', 'Top Winner'],
    ...diagnostics.customerImpact.map((impact) => {
      const topWinner = impact.winnerDecks[0];
      return [
        impact.customerDeckName,
        pct(avg(impact.awarded, impact.appearances)),
        pct(avg(impact.discarded, impact.appearances)),
        fixed(impact.averageWinningServeValue),
        topWinner ? `${topWinner.deckName} ${pct(avg(topWinner.wins, impact.awarded))}` : 'None',
      ];
    }),
  ]);

const drinkTable = (diagnostics: BalanceDiagnostics) =>
  tableFromRows([
    ['Deck', 'Attempts/G', 'Success', 'Made'],
    ...diagnostics.drinkSuccess.map((drink) => [
      drink.deckName,
      fixed(avg(drink.attempts, drink.games)),
      pct(avg(drink.successes, drink.attempts)),
      `${drink.successes}/${drink.attempts}`,
    ]),
  ]);

const tipsTable = (diagnostics: BalanceDiagnostics) =>
  tableFromRows([
    ['Deck', 'Complete', 'Avg Tips'],
    ...diagnostics.tipsCompletion.map((tips) => [
      tips.deckName,
      pct(avg(tips.completions, tips.games)),
      fixed(tips.averageTips),
    ]),
  ]);

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
  `Average score spread: ${fixed(avg(result.games.reduce((sum, game) => sum + game.scoreSpread, 0), result.games.length))}`,
  '',
  'Deck-vs-Deck Matchups:',
  matchupTable(result.diagnostics),
  '',
  'Score Distribution:',
  scoreDistributionTable(result.diagnostics),
  '',
  'First-Seat Bias:',
  seatBiasTable(result.diagnostics),
  '',
  'Customer Nationality Impact:',
  customerImpactTable(result.diagnostics),
  '',
  'Drink Success:',
  drinkTable(result.diagnostics),
  '',
  'Tips Completion:',
  tipsTable(result.diagnostics),
  '',
  'Insights:',
  ...result.insights.map((line) => `- ${line}`),
  '',
  'Balance Recommendations:',
  ...result.recommendations.map((line) => `- ${line}`),
].join('\n');
