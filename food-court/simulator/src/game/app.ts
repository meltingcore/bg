import { DECKS, type CuisineId } from '../data/decks';
import {
  RULE_NOTES,
  addIngredient,
  canPlayDrink,
  createGame,
  discardFromHand,
  refreshHand,
  playDrink,
  resolveRound,
  returnDish,
  returnIngredient,
  revealMeals,
  roundBreakdowns,
  scoreFor,
  serveRecipe,
  type CardInstance,
  type Dish,
  type GameState,
  type PlayerBreakdown,
  type PlayerState,
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
  if (card.kind === 'customer') return `Order ${card.order} / Tips ${card.tips}`;
  return 'drink';
};

const cardType = (card: CardInstance) => card.kind[0].toUpperCase() + card.kind.slice(1);

const recipeValue = (difficulty?: string) => (difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : difficulty === 'hard' ? 3 : 0);

const cardRail = (card: CardInstance) => {
  if (card.kind === 'customer') {
    return `
      <div class="card-rail">
        <span>${card.order} Order</span>
        <strong>${cardType(card)}</strong>
        <span>${card.tips} Tips</span>
      </div>
    `;
  }

  if (card.kind === 'recipe') {
    const slots = card.difficulty === 'easy' ? '0+Opt' : card.difficulty === 'normal' ? '1+Opt' : '2+Opt';
    return `
      <div class="card-rail">
        <span>${slots}</span>
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
      <span>+1</span>
      <strong>${cardType(card)}</strong>
      <span>${card.emoji}</span>
    </div>
  `;
};

const cardBody = (card: CardInstance) => {
  const detail =
    card.kind === 'customer'
      ? customerEffect(card.deckId)
      : card.kind === 'ingredient'
        ? card.tags.length
          ? card.tags.join(', ')
          : `${cardSubtype(card)} ingredient`
        : card.kind === 'recipe'
          ? card.tags.length
            ? card.tags.join(', ')
            : `${cardSubtype(card)} recipe`
          : card.requirement;
  const value =
    card.kind === 'recipe'
      ? recipeValue(card.difficulty)
      : card.kind === 'customer'
        ? (card.order ?? 0)
        : card.kind === 'drink'
          ? 1
          : card.ingredientType === 'optional'
            ? 2
            : 1;

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
      <span>${card.kind === 'ingredient' ? 'Ingredient' : card.kind === 'drink' ? 'Tie' : 'Value'}</span>
    </div>
  `;
};

const customerEffect = (deckId: CuisineId) => {
  const effects: Record<CuisineId, string> = {
    italy: 'If you serve at least 1 dish with an ingredient, gain +1.',
    france: 'If you serve at least 1 dish with all of its ingredients filled, gain +1.',
    china: 'Easy recipes gain +1.',
    india: 'Secondary Ingredients add +1 additional serve value.',
    usa: 'Easy recipes gain +1 for each non-easy recipe served with them.',
    turkiye: 'Gain +1 if you have fewer Tips Cards than at least one opponent.',
    japan: 'Hard recipes gain +1.',
    mexico: 'Normal recipes gain +1.',
  };
  return effects[deckId];
};

const renderMiniCard = (card: CardInstance) => `<div class="${cardClasses(card)}" ${cardStyle(card)}>${cardBody(card)}</div>`;

const renderBreakdown = (breakdown: PlayerBreakdown) => {
  if (!breakdown.competing) return '<span class="muted">No meal</span>';
  return `
    <span><b>${breakdown.total}</b> total</span>
    <span>${breakdown.recipe} recipe</span>
    <span>${breakdown.easyCombo} easy combo</span>
    <span>${breakdown.ingredients} ingredients</span>
    <span>${breakdown.customer} customer</span>
    <span>${breakdown.ability} ability</span>
    <span>${breakdown.drink} drink</span>
    ${breakdown.tied ? '<span class="tie-pill">Tied</span>' : ''}
  `;
};

const renderDish = (dish: Dish, player: PlayerState, phase: GameState['phase']) => `
  <article class="meal-dish">
    <header>
      <strong>${dish.recipe.emoji} ${escapeHtml(dish.recipe.name)}</strong>
      ${phase === 'serve' ? `<button data-action="return-dish" data-player="${player.id}" data-dish="${dish.id}">Return</button>` : ''}
    </header>
    <small>${escapeHtml(cardSubtype(dish.recipe))} recipe</small>
    <div class="ingredient-chips">
      ${
        dish.ingredients
          .map(
            (ingredient) => `
              <button
                class="chip-button"
                data-action="return-ingredient"
                data-player="${player.id}"
                data-dish="${dish.id}"
                data-card="${ingredient.id}"
                ${phase === 'serve' ? '' : 'disabled'}
              >
                ${ingredient.emoji} ${escapeHtml(ingredient.name)}
              </button>
            `,
          )
          .join('') || '<span class="muted">No ingredients added.</span>'
      }
    </div>
  </article>
`;

const renderHandActions = (state: GameState, player: PlayerState, card: CardInstance) => {
  if (state.phase === 'drink' && card.kind === 'drink' && canPlayDrink(state, player.id)) {
    return `<button class="primary" data-action="play-drink" data-player="${player.id}" data-card="${card.id}">Play +1</button>`;
  }

  if (state.phase !== 'serve') return '';

  if (card.kind === 'recipe') {
    return `<button class="primary" data-action="serve-recipe" data-player="${player.id}" data-card="${card.id}">Serve</button>`;
  }

  if (card.kind === 'ingredient') {
    const addButtons = player.meal
      .map(
        (dish, index) => `
          <button data-action="add-ingredient" data-player="${player.id}" data-dish="${dish.id}" data-card="${card.id}">
            Add to ${index + 1}
          </button>
        `,
      )
      .join('');
    return addButtons || '<span class="muted">Serve a recipe first.</span>';
  }

  return '';
};

const renderHandCard = (state: GameState, player: PlayerState, card: CardInstance) => `
  <div class="${cardClasses(card)}" ${cardStyle(card)}>
    ${cardBody(card)}
    <div class="card-actions button-row">
      ${renderHandActions(state, player, card)}
      ${
        state.phase === 'serve'
          ? `<button class="ghost" data-action="discard" data-player="${player.id}" data-card="${card.id}" ${player.refreshDiscards >= 3 ? 'disabled' : ''}>Discard</button>`
          : ''
      }
    </div>
  </div>
`;

const renderCustomerPanel = (state: GameState) => {
  if (!state.activeCustomer) {
    return `
      <section class="board-panel game-over">
        <header class="section-header">
          <h2>Game Complete</h2>
          <p>Final customer resolved.</p>
        </header>
      </section>
    `;
  }

  const customer = state.activeCustomer;
  return `
    <section class="board-panel">
      <header class="section-header">
        <div>
          <h2>Active Customer</h2>
          <p>${escapeHtml(customerEffect(customer.deckId))}</p>
        </div>
        <div class="header-stats">
          <span>Order ${customer.order}</span>
          <span>Tips ${customer.tips}</span>
          <span>${state.customerDeck.length} in deck</span>
        </div>
      </header>
      <div class="active-customer-grid">
        ${renderMiniCard(customer)}
        <div class="round-controls">
          <h3>Round ${state.round} · ${state.phase === 'serve' ? 'Build meals' : 'Drink tie-breaks'}</h3>
          <p>
            Serve up to ${customer.order} recipe${customer.order === 1 ? '' : 's'} per player.
            Reveal values, let tied players add one drink, then resolve by highest unique value.
          </p>
          <div class="button-row">
            <button class="primary" data-action="reveal" ${state.phase === 'serve' ? '' : 'disabled'}>Reveal Values</button>
            <button data-action="resolve" ${state.phase === 'drink' ? '' : 'disabled'}>Resolve Customer</button>
          </div>
        </div>
      </div>
    </section>
  `;
};

const renderPlayer = (state: GameState, player: PlayerState) => {
  const breakdown = roundBreakdowns(state).find((item) => item.playerId === player.id);
  return `
    <section class="player-panel" style="--accent:${player.color}">
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
        <span><b>${player.hand.length}/6</b> Hand</span>
        <span><b>${player.refreshDiscards}/3</b> Refresh discards</span>
        <span><b>${player.meal.length}/${state.activeCustomer?.order ?? 0}</b> Recipes</span>
        <span><b>${player.drawPile.length}</b> Draw</span>
        <span><b>${player.discard.length}</b> Discard</span>
      </div>

      <div class="player-actions">
        <button data-action="refresh" data-player="${player.id}" ${state.phase === 'serve' ? '' : 'disabled'}>Draw To 6</button>
      </div>

      <details open>
        <summary>Served Meal <span>${player.meal.length}</span></summary>
        <div class="breakdown-row">${breakdown ? renderBreakdown(breakdown) : ''}</div>
        <div class="dish-list">${player.meal.map((dish) => renderDish(dish, player, state.phase)).join('') || '<p class="empty-text">No recipes served.</p>'}</div>
      </details>

      <details open>
        <summary>Hand <span>${player.hand.length}</span></summary>
        <div class="card-grid">${player.hand.map((card) => renderHandCard(state, player, card)).join('') || '<p class="empty-text">No cards in hand.</p>'}</div>
      </details>

      <div class="station-grid">
        <details>
          <summary>Scoring Pile <span>${player.scoring.length}</span></summary>
          <div class="compact-list">${player.scoring.map(renderMiniCard).join('') || '<p class="empty-text">No attracted customers.</p>'}</div>
        </details>
        <details>
          <summary>Tips Tracking <span>${player.tips.length}</span></summary>
          <p class="zone-note">${escapeHtml(player.tracking)}</p>
          <div class="compact-list">${player.tips.map(renderMiniCard).join('') || '<p class="empty-text">No Tips Cards tracked.</p>'}</div>
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
              <small><b>Tips:</b> ${escapeHtml(deck.tracking)}</small>
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

const renderLog = (state: GameState) => `
  <section class="log-panel">
    <h2>Playtest Log</h2>
    <ol>${state.log.slice(0, 18).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
  </section>
`;

const render = (root: HTMLElement, state: GameState | null, historyDepth = 0) => {
  root.innerHTML = `
    <main>
      <header class="app-header">
        <div>
          <p class="eyebrow">Food Court digital playtest</p>
          <h1>Simultaneous Serve Simulator</h1>
        </div>
        <div class="header-stats">
          ${
            state
              ? `<span>Round ${state.round}</span><span>${state.phase}</span><span>${state.customerDeck.length} customers left</span><button class="undo-button" data-action="undo" ${historyDepth > 0 ? '' : 'disabled'}>Undo</button>`
              : ''
          }
        </div>
      </header>

      ${renderSetup(state)}
      ${state ? renderCustomerPanel(state) : ''}
      ${state ? `<section class="players-grid">${state.players.map((player) => renderPlayer(state, player)).join('')}</section>${renderLog(state)}` : ''}
      <section class="rule-panel"><h2>Modeled Rule Assumptions</h2><ul>${RULE_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></section>
      ${renderDeckReference()}
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

    if (action === 'refresh' && player) mutate(() => refreshHand(state as GameState, player));
    if (action === 'discard' && player && card) mutate(() => discardFromHand(state as GameState, player, card));
    if (action === 'serve-recipe' && player && card) mutate(() => serveRecipe(state as GameState, player, card));
    if (action === 'add-ingredient' && player && dish && card) {
      mutate(() => addIngredient(state as GameState, player, dish, card));
    }
    if (action === 'return-dish' && player && dish) mutate(() => returnDish(state as GameState, player, dish));
    if (action === 'return-ingredient' && player && dish && card) {
      mutate(() => returnIngredient(state as GameState, player, dish, card));
    }
    if (action === 'reveal') mutate(() => revealMeals(state as GameState));
    if (action === 'play-drink' && player && card) mutate(() => playDrink(state as GameState, player, card));
    if (action === 'resolve') mutate(() => resolveRound(state as GameState));
  });
};
