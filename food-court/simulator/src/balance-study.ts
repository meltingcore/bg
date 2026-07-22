// @ts-nocheck
import { isMainThread, parentPort, workerData, Worker } from 'node:worker_threads';
import { DECKS, type CuisineId } from './data/decks.ts';
import {
  avg,
  runSimulation,
  type CustomerImpact,
  type DeckAggregate,
  type SimulationResult,
  type StrategyDiagnostic,
} from './game/simulation.ts';

declare const process: {
  argv: string[];
  stdout: { write(value: string): void };
  exitCode?: number;
};

interface StudyTask {
  kind: 'two-player' | 'four-player';
  tableKey: string;
  decks: CuisineId[];
  games: number;
  seed: number;
}

interface EffectUsage {
  customerDeckId: CuisineId;
  deckId: CuisineId;
  samples: number;
  positive: number;
  totalValue: number;
  frenchRedraws: number;
  italianHandLimitUses: number;
}

interface RawSeat {
  seat: number;
  games: number;
  winShare: number;
  topFinishes: number;
  totalScore: number;
}

interface RawStrategy {
  policy: string;
  games: number;
  winShare: number;
  topFinishes: number;
  totalScore: number;
  totalCustomers: number;
  totalTips: number;
  tipsCompletions: number;
  tipEligibleMeals: number;
  totalTieRisk: number;
}

interface TaskSummary {
  task: StudyTask;
  aggregates: DeckAggregate[];
  customerImpact: CustomerImpact[];
  strategies: RawStrategy[];
  seats: RawSeat[];
  effects: EffectUsage[];
  totalRounds: number;
  totalDiscardedCustomers: number;
  totalDrinks: number;
  totalScoreSpread: number;
}

const combinations = <T>(values: T[], size: number) => {
  const result: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length === size) {
      result.push([...selected]);
      return;
    }
    for (let index = start; index <= values.length - (size - selected.length); index += 1) {
      selected.push(values[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return result;
};

const effectUsageFor = (result: SimulationResult) => {
  const usage = new Map<string, EffectUsage>();
  for (const game of result.games) {
    for (const round of game.roundResults) {
      for (const player of round.players) {
        const key = `${round.customerDeckId}:${player.deckId}`;
        const entry = usage.get(key) ?? {
          customerDeckId: round.customerDeckId,
          deckId: player.deckId,
          samples: 0,
          positive: 0,
          totalValue: 0,
          frenchRedraws: 0,
          italianHandLimitUses: 0,
        };
        entry.samples += 1;
        entry.positive += player.customerEffectValue > 0 ? 1 : 0;
        entry.totalValue += player.customerEffectValue;
        entry.frenchRedraws += player.usedFrenchRedraw ? 1 : 0;
        entry.italianHandLimitUses += player.usedItalianHandLimit ? 1 : 0;
        usage.set(key, entry);
      }
    }
  }
  return [...usage.values()];
};

const rawStrategy = (strategy: StrategyDiagnostic): RawStrategy => ({
  policy: strategy.policy,
  games: strategy.games,
  winShare: strategy.winShare,
  topFinishes: strategy.topFinishes,
  totalScore: strategy.averageScore * strategy.games,
  totalCustomers: strategy.averageCustomers * strategy.games,
  totalTips: strategy.averageTips * strategy.games,
  tipsCompletions: strategy.tipsCompletionRate * strategy.games,
  tipEligibleMeals: strategy.tipEligibleMealsPerGame * strategy.games,
  totalTieRisk: strategy.averageTieRisk * strategy.games,
});

const summarizeTask = (task: StudyTask): TaskSummary => {
  const result = runSimulation({
    games: task.games,
    players: task.decks.length,
    decks: task.decks,
    seed: task.seed,
    policy: 'mixed',
  });

  return {
    task,
    aggregates: result.aggregates,
    customerImpact: result.diagnostics.customerImpact,
    strategies: result.diagnostics.strategyImpact.map(rawStrategy),
    seats: result.diagnostics.seatBias.map((seat) => ({
      seat: seat.seat,
      games: seat.games,
      winShare: seat.winShare,
      topFinishes: seat.topFinishes,
      totalScore: seat.averageScore * seat.games,
    })),
    effects: effectUsageFor(result),
    totalRounds: result.games.reduce((sum, game) => sum + game.rounds, 0),
    totalDiscardedCustomers: result.games.reduce(
      (sum, game) => sum + game.discardedCustomers,
      0,
    ),
    totalDrinks: result.games.reduce((sum, game) => sum + game.drinkAttempts, 0),
    totalScoreSpread: result.games.reduce((sum, game) => sum + game.scoreSpread, 0),
  };
};

const mergeDeckAggregates = (summaries: TaskSummary[]) => {
  const merged = new Map<CuisineId, DeckAggregate>();
  for (const summary of summaries) {
    for (const deck of summary.aggregates) {
      const entry = merged.get(deck.deckId) ?? {
        ...deck,
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
        tipEligibleMeals: 0,
        totalTieRisk: 0,
        tieRiskSamples: 0,
        tipsCompletions: 0,
        totalScoreSquared: 0,
      };
      for (const key of [
        'games',
        'winShare',
        'topFinishes',
        'totalScore',
        'totalCustomers',
        'totalTips',
        'totalServeValue',
        'serveValueSamples',
        'drinkAttempts',
        'drinkSuccesses',
        'tipEligibleMeals',
        'totalTieRisk',
        'tieRiskSamples',
        'tipsCompletions',
        'totalScoreSquared',
      ] as const) {
        entry[key] += deck[key];
      }
      merged.set(deck.deckId, entry);
    }
  }
  return [...merged.values()];
};

const mergeEffects = (summaries: TaskSummary[]) => {
  const merged = new Map<string, EffectUsage>();
  for (const effect of summaries.flatMap((summary) => summary.effects)) {
    const key = `${effect.customerDeckId}:${effect.deckId}`;
    const entry = merged.get(key) ?? { ...effect, samples: 0, positive: 0, totalValue: 0, frenchRedraws: 0, italianHandLimitUses: 0 };
    entry.samples += effect.samples;
    entry.positive += effect.positive;
    entry.totalValue += effect.totalValue;
    entry.frenchRedraws += effect.frenchRedraws;
    entry.italianHandLimitUses += effect.italianHandLimitUses;
    merged.set(key, entry);
  }
  return [...merged.values()];
};

const mergeCustomerImpact = (summaries: TaskSummary[]) => {
  const merged = new Map<CuisineId, {
    customerDeckId: CuisineId;
    customerDeckName: string;
    appearances: number;
    awarded: number;
    discarded: number;
    totalWinningServeValue: number;
    winnerDecks: Map<CuisineId, { deckName: string; wins: number }>;
  }>();

  for (const impact of summaries.flatMap((summary) => summary.customerImpact)) {
    const entry = merged.get(impact.customerDeckId) ?? {
      customerDeckId: impact.customerDeckId,
      customerDeckName: impact.customerDeckName,
      appearances: 0,
      awarded: 0,
      discarded: 0,
      totalWinningServeValue: 0,
      winnerDecks: new Map(),
    };
    entry.appearances += impact.appearances;
    entry.awarded += impact.awarded;
    entry.discarded += impact.discarded;
    entry.totalWinningServeValue += impact.averageWinningServeValue * impact.awarded;
    for (const winner of impact.winnerDecks) {
      const current = entry.winnerDecks.get(winner.deckId) ?? { deckName: winner.deckName, wins: 0 };
      current.wins += winner.wins;
      entry.winnerDecks.set(winner.deckId, current);
    }
    merged.set(impact.customerDeckId, entry);
  }

  return [...merged.values()].map((entry) => ({
    customerDeckId: entry.customerDeckId,
    customerDeckName: entry.customerDeckName,
    appearances: entry.appearances,
    awardRate: avg(entry.awarded, entry.appearances),
    discardRate: avg(entry.discarded, entry.appearances),
    averageWinningServeValue: avg(entry.totalWinningServeValue, entry.awarded),
    winnerDecks: [...entry.winnerDecks.entries()]
      .map(([deckId, winner]) => ({
        deckId,
        deckName: winner.deckName,
        wins: winner.wins,
        share: avg(winner.wins, entry.awarded),
      }))
      .sort((a, b) => b.wins - a.wins),
  }));
};

const mergeStrategies = (summaries: TaskSummary[]) => {
  const merged = new Map<string, RawStrategy>();
  for (const strategy of summaries.flatMap((summary) => summary.strategies)) {
    const entry = merged.get(strategy.policy) ?? {
      ...strategy,
      games: 0,
      winShare: 0,
      topFinishes: 0,
      totalScore: 0,
      totalCustomers: 0,
      totalTips: 0,
      tipsCompletions: 0,
      tipEligibleMeals: 0,
      totalTieRisk: 0,
    };
    for (const key of [
      'games',
      'winShare',
      'topFinishes',
      'totalScore',
      'totalCustomers',
      'totalTips',
      'tipsCompletions',
      'tipEligibleMeals',
      'totalTieRisk',
    ] as const) {
      entry[key] += strategy[key];
    }
    merged.set(strategy.policy, entry);
  }
  return [...merged.values()].map((entry) => ({
    policy: entry.policy,
    games: entry.games,
    winRate: avg(entry.winShare, entry.games),
    averageScore: avg(entry.totalScore, entry.games),
    averageCustomers: avg(entry.totalCustomers, entry.games),
    averageTips: avg(entry.totalTips, entry.games),
    tipsCompletionRate: avg(entry.tipsCompletions, entry.games),
    tipEligibleMealsPerGame: avg(entry.tipEligibleMeals, entry.games),
    averageTieRisk: avg(entry.totalTieRisk, entry.games),
  }));
};

const mergeSeats = (summaries: TaskSummary[]) => {
  const merged = new Map<number, RawSeat>();
  for (const seat of summaries.flatMap((summary) => summary.seats)) {
    const entry = merged.get(seat.seat) ?? { seat: seat.seat, games: 0, winShare: 0, topFinishes: 0, totalScore: 0 };
    entry.games += seat.games;
    entry.winShare += seat.winShare;
    entry.topFinishes += seat.topFinishes;
    entry.totalScore += seat.totalScore;
    merged.set(seat.seat, entry);
  }
  return [...merged.values()].sort((a, b) => a.seat - b.seat).map((entry) => ({
    seat: entry.seat,
    games: entry.games,
    winRate: avg(entry.winShare, entry.games),
    topFinishRate: avg(entry.topFinishes, entry.games),
    averageScore: avg(entry.totalScore, entry.games),
  }));
};

const normalizedDeckStats = (aggregates: DeckAggregate[]) =>
  aggregates
    .map((deck) => ({
      deckId: deck.deckId,
      deckName: deck.deckName,
      games: deck.games,
      winRate: avg(deck.winShare, deck.games),
      topFinishRate: avg(deck.topFinishes, deck.games),
      averageScore: avg(deck.totalScore, deck.games),
      averageCustomers: avg(deck.totalCustomers, deck.games),
      averageTips: avg(deck.totalTips, deck.games),
      averageServeValue: avg(deck.totalServeValue, deck.serveValueSamples),
      drinksPerGame: avg(deck.drinkAttempts, deck.games),
      tipEligibleMealsPerGame: avg(deck.tipEligibleMeals, deck.games),
      tipsCompletionRate: avg(deck.tipsCompletions, deck.games),
    }))
    .sort((a, b) => b.winRate - a.winRate);

const normalizedEffects = (effects: EffectUsage[]) =>
  effects.map((effect) => ({
    ...effect,
    averageValue: avg(effect.totalValue, effect.samples),
    triggerRate: avg(effect.positive, effect.samples),
    frenchRedrawRate: avg(effect.frenchRedraws, effect.samples),
    italianHandLimitUseRate: avg(effect.italianHandLimitUses, effect.samples),
  }));

const combinationStats = (summaries: TaskSummary[]) => {
  const grouped = new Map<string, TaskSummary[]>();
  for (const summary of summaries) {
    const entries = grouped.get(summary.task.tableKey) ?? [];
    entries.push(summary);
    grouped.set(summary.task.tableKey, entries);
  }
  return [...grouped.entries()].map(([tableKey, entries]) => {
    const aggregates = mergeDeckAggregates(entries);
    return {
      decks: tableKey.split(',') as CuisineId[],
      games: entries.reduce((sum, entry) => sum + entry.task.games, 0),
      deckWinRates: aggregates
        .map((deck) => ({
          deckId: deck.deckId,
          winRate: avg(deck.winShare, deck.games),
          averageScore: avg(deck.totalScore, deck.games),
        }))
        .sort((a, b) => b.winRate - a.winRate),
    };
  });
};

const normalizedGroup = (summaries: TaskSummary[]) => {
  const games = summaries.reduce((sum, summary) => sum + summary.task.games, 0);
  return {
    games,
    tables: new Set(summaries.map((summary) => summary.task.tableKey)).size,
    deckStats: normalizedDeckStats(mergeDeckAggregates(summaries)),
    effects: normalizedEffects(mergeEffects(summaries)),
    customerImpact: mergeCustomerImpact(summaries),
    strategies: mergeStrategies(summaries),
    seats: mergeSeats(summaries),
    averageRounds: avg(summaries.reduce((sum, summary) => sum + summary.totalRounds, 0), games),
    averageDiscardedCustomers: avg(
      summaries.reduce((sum, summary) => sum + summary.totalDiscardedCustomers, 0),
      games,
    ),
    averageDrinks: avg(summaries.reduce((sum, summary) => sum + summary.totalDrinks, 0), games),
    averageScoreSpread: avg(
      summaries.reduce((sum, summary) => sum + summary.totalScoreSpread, 0),
      games,
    ),
    combinations: combinationStats(summaries),
  };
};

const workerMain = () => {
  const tasks = workerData as StudyTask[];
  parentPort?.postMessage(tasks.map(summarizeTask));
};

const parsePositiveInteger = (name: string, value: string | undefined, fallback: number) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
};

const optionValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const splitGames = (games: number, parts: number) =>
  Array.from({ length: parts }, (_, index) =>
    Math.floor(games / parts) + (index < games % parts ? 1 : 0),
  );

const main = async () => {
  const games2 = parsePositiveInteger('--games2', optionValue('--games2'), 300);
  const games4 = parsePositiveInteger('--games4', optionValue('--games4'), 40);
  const workerCount = parsePositiveInteger('--workers', optionValue('--workers'), 4);
  const seed = parsePositiveInteger('--seed', optionValue('--seed'), 700_000);
  const ids = DECKS.map((deck) => deck.id);
  const twoPlayerTasks = combinations(ids, 2).flatMap((decks, index) => {
    const tableKey = decks.join(',');
    return splitGames(games2, 2).map((games, variant) => ({
      kind: 'two-player' as const,
      tableKey,
      decks: variant === 0 ? decks : [...decks].reverse(),
      games,
      seed: seed + index * 1_000_000 + variant * 100_000,
    })).filter((task) => task.games > 0);
  });
  const fourPlayerTasks = combinations(ids, 4).flatMap((decks, index) => {
    const tableKey = decks.join(',');
    return splitGames(games4, 4).map((games, variant) => ({
      kind: 'four-player' as const,
      tableKey,
      decks: [...decks.slice(variant), ...decks.slice(0, variant)],
      games,
      seed: seed + 100_000_000 + index * 1_000_000 + variant * 100_000,
    })).filter((task) => task.games > 0);
  });
  const tasks: StudyTask[] = [...twoPlayerTasks, ...fourPlayerTasks];

  const shards = Array.from({ length: Math.min(workerCount, tasks.length) }, () => [] as StudyTask[]);
  tasks.forEach((task, index) => shards[index % shards.length].push(task));
  const summaries = (await Promise.all(
    shards.map((shard) => new Promise<TaskSummary[]>((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: shard });
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', (code) => {
        if (code !== 0) reject(new Error(`Balance worker exited with code ${code}.`));
      });
    })),
  )).flat();

  const twoPlayer = summaries.filter((summary) => summary.task.kind === 'two-player');
  const fourPlayer = summaries.filter((summary) => summary.task.kind === 'four-player');
  process.stdout.write(`${JSON.stringify({
    generatedAt: new Date().toISOString(),
    parameters: { games2, games4, workers: shards.length, seed },
    twoPlayer: normalizedGroup(twoPlayer),
    fourPlayer: normalizedGroup(fourPlayer),
  }, null, 2)}\n`);
};

if (isMainThread) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
} else {
  workerMain();
}
