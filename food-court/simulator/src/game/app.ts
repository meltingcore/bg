import { DECKS, type CuisineId } from '../data/decks';
import {
  RULE_NOTES,
  activePlayer,
  cookRecipe,
  createGame,
  discardFromHand,
  endTurn,
  fillHand,
  limitsFor,
  playDrink,
  prepareIngredient,
  scoreFor,
  serveDish,
  serveValue,
  type CardInstance,
  type Dish,
  type GameState,
  type PlayerState,
  type QueueCustomer,
} from './engine';

const defaultDecks: CuisineId[] = ['italy', 'france'];
const maxHistory = 50;

const cloneGameState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);

const optionDecks = (selected: CuisineId) =>
  DECKS.map(
    (deck) => `<option value="${deck.id}" ${deck.id === selected ? 'selected' : ''}>${deck.flag} ${escapeHtml(deck.name)}</option>`,
  ).join('');

const cardClasses = (card: CardInstance) => `card ${card.kind} ${card.ingredientType ?? ''} ${card.difficulty ?? ''}`;

const cardStyle = (card: CardInstance) => `style="--deck-color:${card.deckColor}"`;

const cardSubtype = (card: CardInstance) => {
  if (card.kind === 'ingredient') return card.ingredientType ?? '';
  if (card.kind === 'recipe') return card.difficulty ?? '';
  if (card.kind === 'customer') return `Base ${card.base} / Tips ${card.tips}`;
  return 'drink';
};

const cardType = (card: CardInstance) => card.kind[0].toUpperCase() + card.kind.slice(1);

const recipeValue = (difficulty?: string) => (difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : difficulty === 'hard' ? 3 : 0);

const cardRail = (card: CardInstance) => {
  if (card.kind === 'customer') {
    return `
      <div class="card-rail">
        <span>${card.base} Base</span>
        <strong>${cardType(card)}</strong>
        <span>${card.tips} Tips</span>
      </div>
    `;
  }

  if (card.kind === 'recipe') {
    const req = card.difficulty === 'easy' ? '1P' : card.difficulty === 'normal' ? '1P 1S' : '1P 2S';
    return `
      <div class="card-rail">
        <span>${req}</span>
        <strong>${cardType(card)}</strong>
        <span>${escapeHtml(cardSubtype(card))}</span>
      </div>
    `;
  }

  if (card.kind === 'ingredient') {
    return `
      <div class="card-rail">
        <span>${card.emoji}</span>
        <strong>${cardType(card)}</strong>
        <span>${escapeHtml(cardSubtype(card))}</span>
      </div>
    `;
  }

  return `
    <div class="card-rail">
      <span>Req</span>
      <strong>${cardType(card)}</strong>
      <span>${card.emoji}</span>
    </div>
  `;
};

const cardBody = (card: CardInstance) => {
  const detail =
    card.kind === 'customer'
      ? card.symbol
      : card.kind === 'ingredient'
      ? card.tags.length
        ? card.tags.join(', ')
        : `${cardSubtype(card)} ingredient`
      : card.kind === 'recipe'
        ? card.tags.length
          ? card.tags.join(', ')
          : `${cardSubtype(card)} recipe`
        : card.requirement;
  const value = card.kind === 'recipe' ? recipeValue(card.difficulty) : card.kind === 'customer' ? (card.base ?? 0) : card.kind === 'drink' ? 3 : '';

  return `
    ${cardRail(card)}
    <div class="card-title">${escapeHtml(card.name)}</div>
    <div class="card-art">${card.emoji}</div>
    <div class="card-meta">
      <span>${escapeHtml(cardType(card))}</span>
      <span>${escapeHtml(cardSubtype(card))}</span>
    </div>
    <div class="card-rule">${escapeHtml(detail ?? '')}</div>
    <div class="card-value-strip">
      <b>${value}</b>
      <span>${card.kind === 'ingredient' ? cardSubtype(card) : card.kind === 'drink' ? 'Bonus' : 'Value'}</span>
    </div>
  `;
};

const renderMiniCard = (card: CardInstance) => `<div class="${cardClasses(card)}" ${cardStyle(card)}>${cardBody(card)}</div>`;

const dishValue = (dish: Dish) => `${dish.recipe.emoji} ${escapeHtml(dish.recipe.name)} <b>${dish.baseValue}</b>`;

const renderDish = (dish: Dish, player: PlayerState) => {
  return `
    <div class="dish" draggable="true" data-drag-kind="dish" data-player="${player.id}" data-dish="${dish.id}">
      <div>
        <strong>${dishValue(dish)}</strong>
        <small>${dish.ingredients.map((card) => `${card.emoji} ${escapeHtml(card.name)}`).join(', ')}</small>
      </div>
    </div>
  `;
};

const renderHandCard = (card: CardInstance, player: PlayerState) => {
  return `
    <div class="${cardClasses(card)}" ${cardStyle(card)} draggable="true" data-drag-kind="card" data-player="${player.id}" data-card="${card.id}" data-card-kind="${card.kind}">
      ${cardBody(card)}
    </div>
  `;
};

const renderCompetitor = (state: GameState, customer: QueueCustomer, side: 'left' | 'right') => {
  const competitor = customer.competitors.find((item) => item.side === side);
  if (!competitor) return `<div class="competition-side empty"><span>Open</span><b>${side}</b></div>`;
  const competitorPlayer = state.players.find((item) => item.id === competitor.playerId);
  if (!competitorPlayer) return '';
  const value = serveValue(competitorPlayer, customer.card, competitor.dishes);
  return `
    <div class="competition-side" style="--accent:${competitorPlayer.color}">
      <b>${escapeHtml(competitorPlayer.name)}</b>
      <span>${competitor.dishes.length}/${customer.card.base} dishes</span>
      <em>Serve value ${value}</em>
      <small>${competitor.dishes.map((dish) => dishValue(dish)).join('<br>')}</small>
    </div>
  `;
};

const renderCustomer = (state: GameState, customer: QueueCustomer, index: number) => `
  <article class="queue-card" data-drop="serve" data-queue="${customer.id}">
    <div class="queue-index">Customer ${index + 1}</div>
    <div class="drop-hint">Drop cooked dish here to serve</div>
    <div class="competition-grid">
      ${renderCompetitor(state, customer, 'left')}
      ${renderMiniCard(customer.card)}
      ${renderCompetitor(state, customer, 'right')}
    </div>
  </article>
`;

const renderPlayer = (state: GameState, player: PlayerState) => {
  const limits = limitsFor(state, player.id);
  const isActive = activePlayer(state).id === player.id;
  return `
    <section class="player-panel ${isActive ? 'active' : ''}" style="--accent:${player.color}">
      <header class="player-header">
        <div>
          <h2>${player.flag} ${escapeHtml(player.name)} · ${escapeHtml(player.deckName)}</h2>
          <p>${escapeHtml(player.ability)}</p>
        </div>
        <div class="score-box">
          <strong>${scoreFor(player)} VP</strong>
          <span>${player.tips.length}/4 Tips</span>
        </div>
      </header>

      <div class="limit-row">
        <span><b>${player.hand.length}/${limits.hand}</b> Hand</span>
        <span><b>${player.prepared.length}/${limits.ingredients}</b> Prepared</span>
        <span><b>${player.cooked.length}/${limits.cooking}</b> Cooked</span>
        <span><b>${state.queue.filter((customer) => customer.competitors.some((competitor) => competitor.playerId === player.id)).length}/${limits.customers}</b> Customers</span>
        <span><b>${limits.swaps}</b> Swaps</span>
      </div>

      <div class="player-actions">
        <button data-action="fill" data-player="${player.id}">Fill Hand</button>
        ${isActive ? '<button class="primary" data-action="end-turn">End Serve Turn</button>' : ''}
      </div>

      <details open>
        <summary>Hand <span>${player.hand.length}</span></summary>
        <p class="zone-note">Drag cards into the matching station zone.</p>
        <div class="card-grid">${player.hand.map((card) => renderHandCard(card, player)).join('') || '<p class="empty-text">No cards in hand.</p>'}</div>
      </details>

      <div class="station-grid">
        <details open data-drop="prepare" data-player="${player.id}">
          <summary>Prepared Ingredients <span>${player.prepared.length}</span></summary>
          <p class="zone-note">Drop ingredient cards here.</p>
          <div class="compact-list">${player.prepared.map(renderMiniCard).join('') || '<p class="empty-text">No prepared ingredients.</p>'}</div>
        </details>

        <details open data-drop="cook" data-player="${player.id}">
          <summary>Cooked Dishes <span>${player.cooked.length}</span></summary>
          <p class="zone-note">Drop recipe cards here. Drop on the bonus strip to use available extras.</p>
          <div class="bonus-drop" data-drop="cook-bonus" data-player="${player.id}">Cook with optional / deck bonus</div>
          <div class="dish-list">${player.cooked.map((dish) => renderDish(dish, player)).join('') || '<p class="empty-text">No cooked dishes.</p>'}</div>
        </details>

        <details open data-drop="drink" data-player="${player.id}">
          <summary>Drink Service <span>${player.hand.filter((card) => card.kind === 'drink').length}</span></summary>
          <p class="zone-note">Drop a drink card here when its requirement is met.</p>
        </details>

        <details>
          <summary>Scoring Pile <span>${player.scoring.length}</span></summary>
          <div class="compact-list">${player.scoring.map(renderMiniCard).join('') || '<p class="empty-text">No attracted customers.</p>'}</div>
        </details>

        <details>
          <summary>Tips Tracking <span>${player.tips.length}</span></summary>
          <p class="zone-note">${escapeHtml(player.tracking)}</p>
          <div class="compact-list">${player.tips.map(renderMiniCard).join('') || '<p class="empty-text">No Tips Cards tracked.</p>'}</div>
        </details>

        <details open data-drop="discard" data-player="${player.id}">
          <summary>Discard <span>${player.discard.length}</span></summary>
          <p class="zone-note">Drop unwanted hand cards here, then Fill Hand.</p>
        </details>
      </div>
    </section>
  `;
};

const renderSetup = (state: GameState | null) => {
  const selected = state?.players.map((player) => player.deckId) ?? defaultDecks;
  return `
    <section class="setup-panel">
      <div>
        <label for="player-count">Players</label>
        <select id="player-count">
          ${[2, 3, 4].map((count) => `<option value="${count}" ${count === selected.length ? 'selected' : ''}>${count}</option>`).join('')}
        </select>
      </div>
      <div id="deck-selectors" class="deck-selectors">
        ${selected
          .map(
            (deckId, index) => `
              <label>Player ${index + 1}
                <select class="deck-select" data-index="${index}">${optionDecks(deckId)}</select>
              </label>
            `,
          )
          .join('')}
      </div>
      <div>
        <label for="seed">Seed</label>
        <input id="seed" type="number" value="${state?.seed ?? Math.floor(Date.now() / 1000)}" />
      </div>
      <button class="primary" data-action="new-game">New Game</button>
    </section>
  `;
};

const renderDeckReference = () => `
  <section class="reference-panel">
    <details>
      <summary>Deck Layout Reference</summary>
      <div class="deck-reference-grid">
        ${DECKS.map(
          (deck) => `
            <article class="deck-reference" style="--accent:${deck.color}">
              <h3>${deck.flag} ${escapeHtml(deck.name)}</h3>
              <p>${escapeHtml(deck.ability)}</p>
              <small><b>End Condition:</b> ${escapeHtml(deck.endCondition)}</small>
              <div class="pill-row">
                <span>${deck.ingredients.reduce((sum, card) => sum + card.count, 0)} Ingredients</span>
                <span>${deck.recipes.length} Recipes</span>
                <span>${deck.drinks.length} Drinks</span>
                <span>${deck.customers.length} Customers</span>
              </div>
            </article>
          `,
        ).join('')}
      </div>
    </details>
  </section>
`;

const render = (root: HTMLElement, state: GameState | null, historyDepth = 0) => {
  root.innerHTML = `
    <main>
      <header class="app-header">
        <div>
          <p class="eyebrow">Food Court digital playtest</p>
          <h1>Rule Iteration Simulator</h1>
        </div>
        <div class="header-stats">
          ${
            state
              ? `<span>Round ${state.round}</span><span>${escapeHtml(activePlayer(state).name)} serving</span><span>${state.customerDeck.length} customers in deck</span><button class="undo-button" data-action="undo" ${historyDepth > 0 ? '' : 'disabled'}>Undo</button>`
              : ''
          }
        </div>
      </header>

      ${renderSetup(state)}

      ${
        state
          ? `
            <section class="board-panel ${state.isGameOver ? 'game-over' : ''}">
              <header class="section-header">
                <h2>Central Customer Queue</h2>
                <p>${state.finalRound ? `Final round triggered: finish round ${state.finalRound}.` : 'Serve cooked dishes to complete competitions.'}</p>
              </header>
              <div class="queue-grid">${state.queue.map((customer, index) => renderCustomer(state, customer, index)).join('') || '<p>No customers left in queue.</p>'}</div>
            </section>

            <section class="players-grid">
              ${renderPlayer(state, activePlayer(state))}
            </section>

          `
          : ''
      }
      ${state ? '' : `<section class="rule-panel"><h2>Rule Assumptions</h2><ul>${RULE_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></section>${renderDeckReference()}`}
    </main>
  `;
};

const selectedDeckIds = (root: HTMLElement): CuisineId[] => {
  const selectors = [...root.querySelectorAll<HTMLSelectElement>('.deck-select')];
  return selectors.map((select) => select.value as CuisineId);
};

const syncDeckSelectors = (root: HTMLElement) => {
  const count = Number(root.querySelector<HTMLSelectElement>('#player-count')?.value ?? 2);
  const container = root.querySelector<HTMLElement>('#deck-selectors');
  if (!container) return;
  const current = selectedDeckIds(root);
  const next = Array.from({ length: count }, (_, index) => current[index] ?? DECKS[index]?.id ?? DECKS[0].id);
  container.innerHTML = next
    .map(
      (deckId, index) => `
        <label>Player ${index + 1}
          <select class="deck-select" data-index="${index}">${optionDecks(deckId)}</select>
        </label>
      `,
    )
    .join('');
};

export const mountFoodCourtApp = (root: HTMLElement) => {
  let state: GameState | null = createGame(DECKS, defaultDecks, Math.floor(Date.now() / 1000));
  let history: GameState[] = [];

  const remember = () => {
    if (!state) return;
    history.push(cloneGameState(state));
    if (history.length > maxHistory) history = history.slice(history.length - maxHistory);
  };

  const renderCurrent = () => render(root, state, history.length);

  const mutate = (action: () => void) => {
    remember();
    action();
    renderCurrent();
  };

  renderCurrent();

  root.addEventListener('dragstart', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[draggable="true"]');
    if (!target || !event.dataTransfer) return;
    target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        dragKind: target.dataset.dragKind,
        player: target.dataset.player,
        card: target.dataset.card,
        cardKind: target.dataset.cardKind,
        dish: target.dataset.dish,
      }),
    );
  });

  root.addEventListener('dragend', () => {
    root.querySelectorAll('.dragging, .drag-over').forEach((element) => element.classList.remove('dragging', 'drag-over'));
  });

  root.addEventListener('dragover', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drop]');
    if (!target) return;
    event.preventDefault();
    target.classList.add('drag-over');
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });

  root.addEventListener('dragleave', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drop]');
    if (!target || target.contains(event.relatedTarget as Node | null)) return;
    target.classList.remove('drag-over');
  });

  root.addEventListener('drop', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drop]');
    if (!target || !event.dataTransfer || !state) return;
    event.preventDefault();
    target.classList.remove('drag-over');

    const payload = JSON.parse(event.dataTransfer.getData('application/json') || '{}') as {
      dragKind?: string;
      player?: string;
      card?: string;
      cardKind?: string;
      dish?: string;
    };

    const drop = target.dataset.drop;
    const player = target.dataset.player ?? payload.player;

    if (payload.dragKind === 'card' && player && payload.card) {
      if (drop === 'prepare' && payload.cardKind === 'ingredient') mutate(() => prepareIngredient(state as GameState, player, payload.card as string));
      if (drop === 'cook' && payload.cardKind === 'recipe') mutate(() => cookRecipe(state as GameState, player, payload.card as string, false));
      if (drop === 'cook-bonus' && payload.cardKind === 'recipe') mutate(() => cookRecipe(state as GameState, player, payload.card as string, true));
      if (drop === 'drink' && payload.cardKind === 'drink') mutate(() => playDrink(state as GameState, player, payload.card as string));
      if (drop === 'discard') mutate(() => discardFromHand(state as GameState, player, payload.card as string));
    }

    if (payload.dragKind === 'dish' && drop === 'serve' && payload.player && payload.dish && target.dataset.queue) {
      mutate(() => serveDish(state as GameState, payload.player as string, payload.dish as string, target.dataset.queue as string));
    }
  });

  root.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.id === 'player-count') syncDeckSelectors(root);
  });

  root.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'new-game') {
      const seed = Number(root.querySelector<HTMLInputElement>('#seed')?.value || Date.now());
      state = createGame(DECKS, selectedDeckIds(root), seed);
      history = [];
      renderCurrent();
      return;
    }

    if (action === 'undo') {
      const previous = history.pop();
      if (previous) state = previous;
      renderCurrent();
      return;
    }

    if (!state) return;
    const player = target.dataset.player;
    const card = target.dataset.card;
    const dish = target.dataset.dish;
    const queue = target.dataset.queue;

    if (action === 'fill' && player) mutate(() => fillHand(state as GameState, player));
    if (action === 'prepare' && player && card) mutate(() => prepareIngredient(state as GameState, player, card));
    if (action === 'discard' && player && card) mutate(() => discardFromHand(state as GameState, player, card));
    if (action === 'cook' && player && card) mutate(() => cookRecipe(state as GameState, player, card, false));
    if (action === 'cook-bonus' && player && card) mutate(() => cookRecipe(state as GameState, player, card, true));
    if (action === 'drink' && player && card) mutate(() => playDrink(state as GameState, player, card));
    if (action === 'serve' && player && dish && queue) mutate(() => serveDish(state as GameState, player, dish, queue));
    if (action === 'end-turn') mutate(() => endTurn(state as GameState));
  });
};
