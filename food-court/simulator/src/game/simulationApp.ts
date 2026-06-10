import { DECKS, type CuisineId } from '../data/decks.ts';
import {
  avg,
  buildSimulationResult,
  defaultSimulationOptions,
  fixed,
  pct,
  runGame,
  validateSimulationOptions,
  type GameResult,
  type SimulationOptions,
  type SimulationResult,
} from './simulation.ts';

interface UiState {
  options: SimulationOptions;
  result: SimulationResult | null;
  selectedGameIndex: number;
  running: boolean;
  randomizeSeed: boolean;
  progress: { completed: number; total: number } | null;
  error: string | null;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);

const optionDecks = (selected: CuisineId) =>
  DECKS.map(
    (deck) => `<option value="${deck.id}" ${deck.id === selected ? 'selected' : ''}>${deck.flag} ${escapeHtml(deck.name)}</option>`,
  ).join('');

const selectedDeckIds = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLSelectElement>('.sim-deck-select')].map((select) => select.value as CuisineId);

const uniqueDecksForPlayerCount = (current: CuisineId[], players: number) => {
  const next: CuisineId[] = [];
  for (let index = 0; index < players; index += 1) {
    const candidate = current[index];
    if (candidate && !next.includes(candidate)) {
      next.push(candidate);
      continue;
    }

    const fallback = DECKS.find((deck) => !next.includes(deck.id))?.id ?? DECKS[0].id;
    next.push(fallback);
  }
  return next;
};

const randomSeed = () => {
  const values = new Uint32Array(1);
  window.crypto?.getRandomValues(values);
  return (values[0] % 1_000_000_000) + 1;
};

const renderDeckSelectors = (options: SimulationOptions) =>
  uniqueDecksForPlayerCount(options.decks, options.players)
    .map(
      (deckId, index) => `
        <label>Player ${index + 1}
          <select class="sim-deck-select" data-index="${index}">
            ${optionDecks(deckId)}
          </select>
        </label>
      `,
    )
    .join('');

const renderSetup = (state: UiState) => `
  <section class="simulation-panel simulation-controls">
    <div class="simulation-control-grid">
      <label>Games
        <input id="sim-games" type="number" min="1" max="5000" step="1" value="${state.options.games}" />
      </label>
      <label>Players
        <select id="sim-players">
          ${[2, 3, 4].map((count) => `<option value="${count}" ${count === state.options.players ? 'selected' : ''}>${count}</option>`).join('')}
        </select>
      </label>
      <label>Seed
        <input id="sim-seed" type="number" min="1" step="1" value="${state.options.seed}" ${state.randomizeSeed ? 'disabled' : ''} />
      </label>
      <label>Policy
        <select id="sim-policy">
          <option value="greedy" selected>Greedy</option>
        </select>
      </label>
    </div>
    <label class="checkbox-control">
      <input id="sim-random-seed" type="checkbox" ${state.randomizeSeed ? 'checked' : ''} />
      <span>Random seed each run</span>
    </label>
    <div class="simulation-decks" id="sim-decks">
      ${renderDeckSelectors(state.options)}
    </div>
    <div class="simulation-actions">
      <button class="primary" data-action="run-simulation" ${state.running ? 'disabled' : ''}>
        ${
          state.running && state.progress
            ? `Running ${state.progress.completed}/${state.progress.total}...`
            : state.running
              ? 'Running...'
              : 'Run Simulation'
        }
      </button>
      <button data-action="quick-games" data-games="10">10 Games</button>
      <button data-action="quick-games" data-games="100">100 Games</button>
      <button data-action="quick-games" data-games="1000">1000 Games</button>
    </div>
    ${
      state.progress
        ? `<div class="simulation-progress"><span style="width:${Math.round((state.progress.completed / state.progress.total) * 100)}%"></span></div>`
        : ''
    }
    ${state.error ? `<p class="simulation-error">${escapeHtml(state.error)}</p>` : ''}
  </section>
`;

const renderSummary = (result: SimulationResult) => `
  <section class="simulation-summary">
    <article>
      <span>Games</span>
      <strong>${result.options.games}</strong>
    </article>
    <article>
      <span>Seed Range</span>
      <strong>${result.options.seed}-${result.options.seed + result.options.games - 1}</strong>
    </article>
    <article>
      <span>Average Rounds</span>
      <strong>${fixed(result.averageRounds)}</strong>
    </article>
    <article>
      <span>Discarded Customers</span>
      <strong>${fixed(result.averageDiscardedCustomers)}</strong>
    </article>
    <article>
      <span>Drinks Played</span>
      <strong>${fixed(result.averageDrinksPlayed)}</strong>
    </article>
    <article>
      <span>Avg Score Spread</span>
      <strong>${fixed(avg(result.games.reduce((sum, game) => sum + game.scoreSpread, 0), result.games.length))}</strong>
    </article>
  </section>
`;

const renderAggregateTable = (result: SimulationResult) => `
  <section class="simulation-panel">
    <div class="section-header">
      <div>
        <h2>Deck Results</h2>
        <p>Win share splits tied first-place finishes across tied players.</p>
      </div>
    </div>
    <div class="table-scroll">
      <table class="simulation-table">
        <thead>
          <tr>
            <th>Deck</th>
            <th>Win Share</th>
            <th>Top</th>
            <th>Avg VP</th>
            <th>Avg Customers</th>
            <th>Avg Tips</th>
            <th>Avg SV</th>
            <th>Drinks/Game</th>
            <th>Drink Success</th>
            <th>Tips Complete</th>
          </tr>
        </thead>
        <tbody>
          ${result.aggregates
            .map(
              (deck) => `
                <tr>
                  <td><strong>${escapeHtml(deck.deckName)}</strong></td>
                  <td>${pct(deck.winShare / deck.games)}</td>
                  <td>${deck.topFinishes}</td>
                  <td>${fixed(avg(deck.totalScore, deck.games))}</td>
                  <td>${fixed(avg(deck.totalCustomers, deck.games))}</td>
                  <td>${fixed(avg(deck.totalTips, deck.games))}</td>
                  <td>${fixed(avg(deck.totalServeValue, deck.serveValueSamples))}</td>
                  <td>${fixed(avg(deck.drinkAttempts, deck.games))}</td>
                  <td>${pct(avg(deck.drinkSuccesses, deck.drinkAttempts))}</td>
                  <td>${pct(avg(deck.tipsCompletions, deck.games))}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </section>
`;

const renderInsights = (result: SimulationResult) => `
  <section class="simulation-panel insights-panel">
    <div class="section-header">
      <div>
        <h2>Insights</h2>
        <p>Rule-of-thumb flags from this bot policy and sample size.</p>
      </div>
    </div>
    <ul class="insight-list">
      ${result.insights.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
    </ul>
  </section>
`;

const renderRecommendations = (result: SimulationResult) => `
  <section class="simulation-panel insights-panel">
    <div class="section-header">
      <div>
        <h2>Balance Recommendations</h2>
        <p>Suggested follow-up changes from this batch.</p>
      </div>
    </div>
    <ul class="insight-list">
      ${result.recommendations.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
    </ul>
  </section>
`;

const renderDiagnostics = (result: SimulationResult) => `
  <section class="simulation-panel">
    <div class="section-header">
      <div>
        <h2>Balance Diagnostics</h2>
        <p>Richer aggregate checks for matchup shape, scoring, seat order, customers, drinks, and Tips.</p>
      </div>
    </div>
    <div class="diagnostic-grid">
      <div class="diagnostic-block">
        <h3>Deck-vs-Deck Matchups</h3>
        <div class="table-scroll">
          <table class="simulation-table">
            <thead>
              <tr>
                <th>Deck</th>
                <th>Opponent</th>
                <th>Score Share</th>
                <th>Tie Rate</th>
                <th>Avg Delta</th>
              </tr>
            </thead>
            <tbody>
              ${result.diagnostics.matchups
                .map(
                  (matchup) => `
                    <tr>
                      <td><strong>${escapeHtml(matchup.deckName)}</strong></td>
                      <td>${escapeHtml(matchup.opponentDeckName)}</td>
                      <td>${pct(avg(matchup.winShare, matchup.games))}</td>
                      <td>${pct(avg(matchup.ties, matchup.games))}</td>
                      <td>${fixed(avg(matchup.totalScoreDelta, matchup.games))}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="diagnostic-block">
        <h3>Score Distribution</h3>
        <div class="table-scroll">
          <table class="simulation-table">
            <thead>
              <tr>
                <th>Deck</th>
                <th>Mean</th>
                <th>P10</th>
                <th>Median</th>
                <th>P90</th>
                <th>Range</th>
                <th>Std Dev</th>
              </tr>
            </thead>
            <tbody>
              ${result.diagnostics.scoreDistributions
                .map(
                  (score) => `
                    <tr>
                      <td><strong>${escapeHtml(score.deckName)}</strong></td>
                      <td>${fixed(score.mean)}</td>
                      <td>${fixed(score.p10)}</td>
                      <td>${fixed(score.median)}</td>
                      <td>${fixed(score.p90)}</td>
                      <td>${score.min}-${score.max}</td>
                      <td>${fixed(score.standardDeviation)}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="diagnostic-block">
        <h3>First-Seat Bias</h3>
        <div class="table-scroll">
          <table class="simulation-table">
            <thead>
              <tr>
                <th>Seat</th>
                <th>Win Share</th>
                <th>Top</th>
                <th>Avg VP</th>
              </tr>
            </thead>
            <tbody>
              ${result.diagnostics.seatBias
                .map(
                  (seat) => `
                    <tr>
                      <td><strong>${seat.seat}</strong></td>
                      <td>${pct(avg(seat.winShare, seat.games))}</td>
                      <td>${seat.topFinishes}</td>
                      <td>${fixed(seat.averageScore)}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="diagnostic-block">
        <h3>Customer Nationality Impact</h3>
        <div class="table-scroll">
          <table class="simulation-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Awarded</th>
                <th>Discarded</th>
                <th>Avg Winning SV</th>
                <th>Top Winner</th>
              </tr>
            </thead>
            <tbody>
              ${result.diagnostics.customerImpact
                .map((impact) => {
                  const topWinner = impact.winnerDecks[0];
                  return `
                    <tr>
                      <td><strong>${escapeHtml(impact.customerDeckName)}</strong></td>
                      <td>${pct(avg(impact.awarded, impact.appearances))}</td>
                      <td>${pct(avg(impact.discarded, impact.appearances))}</td>
                      <td>${fixed(impact.averageWinningServeValue)}</td>
                      <td>${topWinner ? `${escapeHtml(topWinner.deckName)} (${pct(avg(topWinner.wins, impact.awarded))})` : 'None'}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="diagnostic-block">
        <h3>Drink Success</h3>
        <div class="table-scroll">
          <table class="simulation-table">
            <thead>
              <tr>
                <th>Deck</th>
                <th>Attempts/Game</th>
                <th>Success Rate</th>
                <th>Successes</th>
              </tr>
            </thead>
            <tbody>
              ${result.diagnostics.drinkSuccess
                .map(
                  (drink) => `
                    <tr>
                      <td><strong>${escapeHtml(drink.deckName)}</strong></td>
                      <td>${fixed(avg(drink.attempts, drink.games))}</td>
                      <td>${pct(avg(drink.successes, drink.attempts))}</td>
                      <td>${drink.successes}/${drink.attempts}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="diagnostic-block">
        <h3>Tips Completion</h3>
        <div class="table-scroll">
          <table class="simulation-table">
            <thead>
              <tr>
                <th>Deck</th>
                <th>Complete</th>
                <th>Avg Tips</th>
              </tr>
            </thead>
            <tbody>
              ${result.diagnostics.tipsCompletion
                .map(
                  (tips) => `
                    <tr>
                      <td><strong>${escapeHtml(tips.deckName)}</strong></td>
                      <td>${pct(avg(tips.completions, tips.games))}</td>
                      <td>${fixed(tips.averageTips)}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
`;

const gameWinnerNames = (game: GameResult) =>
  game.players
    .filter((player) => player.topFinish)
    .map((player) => player.deckName)
    .join(', ');

const renderGamePicker = (result: SimulationResult, selectedGameIndex: number) => {
  const selectedGame = result.games[selectedGameIndex] ?? result.games[0];
  if (!selectedGame) return '';

  return `
    <section class="simulation-panel">
      <div class="section-header">
        <div>
          <h2>Game Browser</h2>
          <p>Inspect a single simulated game by seed.</p>
        </div>
        <div class="game-browser-controls">
          <button data-action="previous-game" ${selectedGameIndex <= 0 ? 'disabled' : ''}>Previous</button>
          <select id="game-select">
            ${result.games
              .map(
                (game, index) => `
                  <option value="${index}" ${index === selectedGameIndex ? 'selected' : ''}>
                    Game ${index + 1} / Seed ${game.seed}
                  </option>
                `,
              )
              .join('')}
          </select>
          <button data-action="next-game" ${selectedGameIndex >= result.games.length - 1 ? 'disabled' : ''}>Next</button>
        </div>
      </div>
      <div class="game-detail-grid">
        <article class="game-detail-stat">
          <span>Winner</span>
          <strong>${escapeHtml(gameWinnerNames(selectedGame) || 'Tie')}</strong>
        </article>
        <article class="game-detail-stat">
          <span>Rounds</span>
          <strong>${selectedGame.rounds}</strong>
        </article>
        <article class="game-detail-stat">
          <span>Discarded Customers</span>
          <strong>${selectedGame.discardedCustomers}</strong>
        </article>
        <article class="game-detail-stat">
          <span>Drinks Played</span>
          <strong>${selectedGame.drinkAttempts}</strong>
        </article>
      </div>
      <div class="table-scroll">
        <table class="simulation-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Deck</th>
              <th>VP</th>
              <th>Customers</th>
              <th>Tips</th>
              <th>Avg SV</th>
              <th>Drinks</th>
            </tr>
          </thead>
          <tbody>
            ${selectedGame.players
              .map(
                (player) => `
                  <tr class="${player.topFinish ? 'winner-row' : ''}">
                    <td>${escapeHtml(player.playerId.toUpperCase())}</td>
                    <td><strong>${escapeHtml(player.deckName)}</strong></td>
                    <td>${player.score}</td>
                    <td>${player.customers}</td>
                    <td>${player.tips}</td>
                    <td>${fixed(player.averageServeValue)}</td>
                    <td>${player.drinkAttempts}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
};

const renderGameList = (result: SimulationResult) => `
  <section class="simulation-panel">
    <details>
      <summary>All Game Results <span>${result.games.length}</span></summary>
      <div class="table-scroll compact-game-list">
        <table class="simulation-table">
          <thead>
            <tr>
              <th>Game</th>
              <th>Seed</th>
              <th>Winner</th>
              <th>Rounds</th>
              <th>Discarded</th>
              <th>Scores</th>
            </tr>
          </thead>
          <tbody>
            ${result.games
              .map(
                (game, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${game.seed}</td>
                    <td>${escapeHtml(gameWinnerNames(game) || 'Tie')}</td>
                    <td>${game.rounds}</td>
                    <td>${game.discardedCustomers}</td>
                    <td>${escapeHtml(game.players.map((player) => `${player.deckName}: ${player.score}`).join(' | '))}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </details>
  </section>
`;

const renderJson = (result: SimulationResult) => `
  <section class="simulation-panel">
    <details>
      <summary>JSON Result <span>Raw</span></summary>
      <textarea class="json-output" readonly>${escapeHtml(JSON.stringify(result, null, 2))}</textarea>
    </details>
  </section>
`;

const renderResults = (state: UiState) => {
  if (!state.result) {
    return `
      <section class="simulation-panel empty-results">
        <h2>No Results Yet</h2>
        <p>Choose the simulation parameters and run a batch to see deck performance, insights, and per-game results.</p>
      </section>
    `;
  }

  return [
    renderSummary(state.result),
    renderAggregateTable(state.result),
    renderDiagnostics(state.result),
    renderInsights(state.result),
    renderRecommendations(state.result),
    renderGamePicker(state.result, state.selectedGameIndex),
    renderGameList(state.result),
    renderJson(state.result),
  ].join('');
};

const readOptions = (root: HTMLElement, current: SimulationOptions): SimulationOptions => {
  const players = Number(root.querySelector<HTMLSelectElement>('#sim-players')?.value ?? current.players);
  return {
    games: Number(root.querySelector<HTMLInputElement>('#sim-games')?.value ?? current.games),
    players,
    decks: uniqueDecksForPlayerCount(selectedDeckIds(root), players),
    seed: Number(root.querySelector<HTMLInputElement>('#sim-seed')?.value ?? current.seed),
    policy: 'greedy',
  };
};

const yieldToBrowser = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

const runSimulationIncrementally = async (
  options: SimulationOptions,
  state: UiState,
  renderCurrent: () => void,
) => {
  validateSimulationOptions(options);
  const games: GameResult[] = [];
  const batchSize = options.games >= 500 ? 10 : options.games >= 100 ? 5 : 1;

  state.progress = { completed: 0, total: options.games };
  renderCurrent();

  for (let index = 0; index < options.games; index += 1) {
    games.push(runGame(options, options.seed + index));

    const shouldRender = games.length === options.games || games.length % batchSize === 0;
    if (shouldRender) {
      state.progress = { completed: games.length, total: options.games };
      renderCurrent();
      await yieldToBrowser();
    }
  }

  return buildSimulationResult(options, games);
};

const render = (root: HTMLElement, state: UiState) => {
  root.innerHTML = `
    <main>
      <header class="app-header">
        <div>
          <p class="eyebrow">Automated Playtesting</p>
          <h1>Simulation Lab</h1>
        </div>
        <nav class="mode-nav" aria-label="Simulator modes">
          <a href="/">Manual Simulator</a>
          <a href="/simulate/" aria-current="page">Simulation Lab</a>
        </nav>
      </header>
      ${renderSetup(state)}
      ${renderResults(state)}
    </main>
  `;
};

export const mountSimulationApp = (root: HTMLElement) => {
  const state: UiState = {
    options: { ...defaultSimulationOptions, decks: [...defaultSimulationOptions.decks] },
    result: null,
    selectedGameIndex: 0,
    running: false,
    randomizeSeed: true,
    progress: null,
    error: null,
  };

  const renderCurrent = () => render(root, state);

  renderCurrent();

  root.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.id === 'sim-players') {
      state.options = readOptions(root, state.options);
      state.options.decks = uniqueDecksForPlayerCount(state.options.decks, state.options.players);
      renderCurrent();
      return;
    }

    if (target.id === 'sim-random-seed') {
      state.randomizeSeed = (target as HTMLInputElement).checked;
      state.options = readOptions(root, state.options);
      renderCurrent();
      return;
    }

    if (target.id === 'game-select') {
      state.selectedGameIndex = Number((target as HTMLSelectElement).value);
      renderCurrent();
    }
  });

  root.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (action === 'quick-games') {
      const input = root.querySelector<HTMLInputElement>('#sim-games');
      if (input && target.dataset.games) input.value = target.dataset.games;
      state.options = readOptions(root, state.options);
      renderCurrent();
      return;
    }

    if (action === 'previous-game') {
      state.selectedGameIndex = Math.max(0, state.selectedGameIndex - 1);
      renderCurrent();
      return;
    }

    if (action === 'next-game') {
      const maxIndex = Math.max(0, (state.result?.games.length ?? 1) - 1);
      state.selectedGameIndex = Math.min(maxIndex, state.selectedGameIndex + 1);
      renderCurrent();
      return;
    }

    if (action === 'run-simulation') {
      state.options = readOptions(root, state.options);
      if (state.randomizeSeed) state.options.seed = randomSeed();
      state.running = true;
      state.progress = { completed: 0, total: state.options.games };
      state.error = null;
      renderCurrent();

      window.setTimeout(async () => {
        try {
          state.result = await runSimulationIncrementally(state.options, state, renderCurrent);
          state.selectedGameIndex = 0;
        } catch (error) {
          state.error = error instanceof Error ? error.message : String(error);
        } finally {
          state.running = false;
          state.progress = null;
          renderCurrent();
        }
      }, 16);
    }
  });
};
