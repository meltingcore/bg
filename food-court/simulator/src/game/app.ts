import { DECKS, type CuisineId } from '../data/decks';
import { playBotPlayers } from './bot';
import {
  RULE_NOTES,
  addIngredient,
  canPlayDrink,
  createGame,
  currentHandLimit,
  discardHandForRefresh,
  discardFromHand,
  refreshHand,
  playDrink,
  resolveRound,
  returnDish,
  returnDrink,
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

const defaultDecks: CuisineId[] = ['italy', 'france', 'china', 'india'];
const maxHistory = 50;
const humanPlayerId = 'p1';

const cloneGameState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);

const optionDecks = (selected: CuisineId) =>
  DECKS.map(
    (deck) => `<option value="${deck.id}" ${deck.id === selected ? 'selected' : ''}>${deck.flag} ${escapeHtml(deck.name)}</option>`,
  ).join('');

const cardClasses = (card: CardInstance) => `card ${card.kind} ${card.ingredientType ?? ''} ${card.difficulty ?? ''}`;

const cardStyle = (card: CardInstance) => `style="--deck-color:${card.deckColor}"`;

const recipeIngredientSlots = (difficulty?: string) => {
  if (difficulty === 'normal') return 1;
  if (difficulty === 'hard') return 2;
  return 0;
};

const recipeSlotLabel = (difficulty?: string) => {
  if (difficulty === 'easy') return 'Easy · 0 Ingredients';
  if (difficulty === 'normal') return 'Normal · 1 Ingredient';
  if (difficulty === 'hard') return 'Hard · 2 Ingredients';
  return '';
};

const cardSubtype = (card: CardInstance) => {
  if (card.kind === 'ingredient') return card.ingredientType === 'flavor' ? 'flavor' : 'ingredient';
  if (card.kind === 'recipe') return recipeSlotLabel(card.difficulty);
  if (card.kind === 'customer') return `Order ${card.order} / Tips ${card.tips}`;
  return 'drink';
};

const cardType = (card: CardInstance) => {
  if (card.kind === 'ingredient' && card.ingredientType === 'flavor') return 'Flavor';
  return card.kind[0].toUpperCase() + card.kind.slice(1);
};

const recipeValue = (difficulty?: string) => (difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard' ? 1 : 0);

const tagLabel = (tags: string[]) => tags.map((tag) => tag[0].toUpperCase() + tag.slice(1)).join(', ');

const displayCardName = (card: CardInstance) =>
  card.kind === 'customer' ? `${card.deckName} Customer` : card.name;

const countryFlagEmoji = (deckId: CuisineId) => {
  const flags: Record<CuisineId, string> = {
    italy: '🇮🇹',
    france: '🇫🇷',
    china: '🇨🇳',
    india: '🇮🇳',
    usa: '🇺🇸',
    turkiye: '🇹🇷',
    japan: '🇯🇵',
    mexico: '🇲🇽',
  };
  return flags[deckId];
};

const cardArtEmoji = (card: CardInstance) => (card.kind === 'customer' ? countryFlagEmoji(card.deckId) : card.emoji);

const drinkRequirement = (requirement?: string) =>
  (requirement ?? '')
    .replace(/^Play if you /, '')
    .replace(/^Play if /, '')
    .replace(/\.$/, '')
    .replace(/Ingredient Cards?/g, 'Ingredients')
    .replace(/Recipe Cards?/g, 'Recipes');

const customerEffectShort = (deckId: CuisineId) => {
  const effects: Record<CuisineId, string> = {
    italy: 'Refresh hand limit is 8.',
    france: 'May discard hand and redraw.',
    china: 'Easy dishes gain +1 SV.',
    india: 'Each ingredient pair gains +1 SV.',
    usa: '+1 SV per 2 cards in hand.',
    turkiye: '+1 SV if behind on Tips.',
    japan: 'Hard dishes gain +1 SV.',
    mexico: 'Normal dishes gain +1 SV.',
  };
  return effects[deckId];
};

const cardBody = (card: CardInstance) => {
  const kind = cardType(card);
  const stat =
    card.kind === 'customer'
      ? `O${card.order} T${card.tips}`
      : card.kind === 'recipe'
        ? `+${recipeValue(card.difficulty)} SV · I${recipeIngredientSlots(card.difficulty)}`
      : card.kind === 'drink'
        ? '+3 if'
      : card.ingredientType === 'flavor'
        ? '+2 SV'
        : '+1 SV';

  const detailRows =
    card.kind === 'customer'
      ? [
          ['Effect', customerEffectShort(card.deckId)],
        ]
      : card.kind === 'recipe'
        ? [
            ...(card.tags.length ? [['Tags', tagLabel(card.tags)]] : []),
            ...(card.exactIngredient ? [['Exact', card.exactIngredient]] : []),
          ]
        : card.kind === 'ingredient' && card.ingredientType === 'flavor'
          ? [
              ['Slot', 'Flavor slot'],
              ['Rule', 'No difficulty change'],
            ]
          : card.kind === 'ingredient'
            ? [
                ['Slot', 'Ingredient slot'],
                ...(card.tags.length ? [['Tags', tagLabel(card.tags)]] : []),
              ]
            : [
                ['Need', drinkRequirement(card.requirement)],
                ['Limit', '1 Drink per meal'],
              ];

  const footer =
    card.kind === 'customer'
      ? ''
      : card.kind === 'recipe'
        ? 'Serve as one dish'
        : card.kind === 'drink'
          ? 'Missed requirement scores +0'
          : card.tags.length
            ? 'Deck-relevant card'
            : card.ingredientType === 'flavor'
              ? 'One Flavor per dish'
              : 'Adds to dish difficulty';

  return `
    <div class="card-top">
      <span class="card-kind">${escapeHtml(kind)}</span>
      <span class="card-stat">${escapeHtml(stat)}</span>
    </div>
    <div class="card-title">${escapeHtml(displayCardName(card))}</div>
    <div class="card-art">${cardArtEmoji(card)}</div>
    <div class="card-details">
      ${detailRows
        .map(([label, value]) => `
          <div class="card-detail-row">
            <b>${escapeHtml(label)}</b>
            <span>${escapeHtml(value)}</span>
          </div>
        `)
        .join('')}
    </div>
    ${footer ? `<div class="card-footer">${escapeHtml(footer)}</div>` : ''}
  `;
};

const customerEffect = (deckId: CuisineId) => {
  const effects: Record<CuisineId, string> = {
    italy: 'Players hand limit is increased to 8 when refreshing.',
    france: 'Players can discard their hand and draw a new one when refreshing.',
    china: 'Easy recipes gain +1.',
    india: 'Each pair of Ingredient Cards adds +1.',
    usa: 'Gain +1 for each pair of cards in hand.',
    turkiye: 'Gain +1 if you have fewer Tips Cards than at least one opponent.',
    japan: 'Hard dishes gain +1.',
    mexico: 'Normal dishes gain +1.',
  };
  return effects[deckId];
};

const renderMiniCard = (card: CardInstance) => `<div class="${cardClasses(card)}" ${cardStyle(card)}>${cardBody(card)}</div>`;

const renderBreakdown = (breakdown: PlayerBreakdown) => {
  if (!breakdown.competing) return '<span class="muted">No meal</span>';
  return `
    <span><b>${breakdown.total}</b> total</span>
    <span>${breakdown.recipe} recipe</span>
    <span>${breakdown.hand} hand</span>
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

const renderPlayedDrink = (player: PlayerState, phase: GameState['phase']) => {
  if (!player.drinkPlayed) return '<p class="empty-text">No Drink Card served.</p>';
  const drink = player.drinkPlayed;
  return `
    <div class="served-drink">
      <span>${drink.emoji} ${escapeHtml(drink.name)}</span>
      ${phase === 'serve' ? `<button data-action="return-drink" data-player="${player.id}">Return</button>` : ''}
    </div>
  `;
};

const renderHandActions = (state: GameState, player: PlayerState, card: CardInstance) => {
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
    return addButtons || '<span class="muted">Need recipe first</span>';
  }

  if (card.kind === 'drink') {
    return canPlayDrink(state, player.id)
      ? `<button class="primary" data-action="play-drink" data-player="${player.id}" data-card="${card.id}">Serve Drink</button>`
      : '<span class="muted">Need recipe first</span>';
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
          ? `<button class="ghost" data-action="discard" data-player="${player.id}" data-card="${card.id}" ${player.refreshDiscards >= 1 || player.refreshDraws > 0 ? 'disabled' : ''}>Discard</button>`
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
          <h3>Round ${state.round} · ${state.phase === 'serve' ? 'Build meals' : 'Meals revealed'}</h3>
          <p>
            Serve up to ${customer.order} recipe${customer.order === 1 ? '' : 's'} per player.
            Optionally include 1 Drink Card with your meal, then reveal and resolve by highest unique value.
          </p>
          <div class="button-row">
            <button class="primary" data-action="reveal" ${state.phase === 'serve' ? '' : 'disabled'}>Reveal Values</button>
            <button data-action="resolve" ${state.phase === 'reveal' ? '' : 'disabled'}>Resolve Customer</button>
          </div>
        </div>
      </div>
    </section>
  `;
};

const renderPlayerSwitcher = (state: GameState, activePlayerId: string, historyDepth: number) => `
  <section class="player-switch-panel">
    <div>
      <h2>Your Seat</h2>
      <p>You play ${escapeHtml(state.players.find((player) => player.id === activePlayerId)?.deckName ?? 'Player 1')}; other seats are automated bots.</p>
    </div>
    <div class="player-switch-actions">
      <div class="player-switcher">
        ${state.players
          .map(
            (player) => `
              <span class="seat-pill ${player.id === activePlayerId ? 'human' : ''}">
                ${player.flag} ${player.id === activePlayerId ? 'You' : `Bot ${player.id.replace(/\D/g, '')}`}
              </span>
            `,
          )
          .join('')}
      </div>
      <button class="undo-button" data-action="undo" ${historyDepth > 0 ? '' : 'disabled'}>Undo Action</button>
    </div>
  </section>
`;

const renderPublicPlayerSummary = (state: GameState, activePlayerId: string) => `
  <section class="public-summary-panel">
    <header class="section-header">
      <div>
        <h2>Public Table</h2>
        <p>Opponent hands stay hidden; revealed meals show after Reveal Values.</p>
      </div>
    </header>
    <div class="public-player-grid">
      ${state.players
        .map((player) => {
          const breakdown = roundBreakdowns(state).find((item) => item.playerId === player.id);
          const revealed = state.phase !== 'serve';
          const showPlayedCards = revealed && player.id !== activePlayerId;
          return `
            <article class="public-player ${player.id === activePlayerId ? 'active' : ''}" style="--accent:${player.color}">
              <strong>${player.flag} ${escapeHtml(player.name)}</strong>
              <span>${escapeHtml(player.deckName)}</span>
              <div class="pill-row">
                <span>${scoreFor(player)} VP</span>
                <span>${player.tips.length}/4 Tips</span>
                <span>${player.hand.length} Hand</span>
                <span>${player.meal.length}/${state.activeCustomer?.order ?? 0} Recipes</span>
                <span>${revealed && breakdown?.competing ? `${breakdown.total} Value` : revealed ? 'No Meal' : 'Value Hidden'}</span>
                ${revealed && breakdown?.competing ? `<span>${breakdown.customer} Customer</span>` : ''}
                ${revealed && breakdown?.competing ? `<span>${breakdown.ability} Ability</span>` : ''}
                ${revealed && breakdown?.tied ? '<span>Tied</span>' : ''}
              </div>
              ${showPlayedCards ? renderPublicPlayedCards(player) : ''}
            </article>
          `;
        })
        .join('')}
    </div>
  </section>
`;

const renderPublicPlayedCards = (player: PlayerState) => `
  <details class="public-played-cards" open>
    <summary>Played Cards <span>${player.meal.reduce((sum, dish) => sum + 1 + dish.ingredients.length, 0) + (player.drinkPlayed ? 1 : 0)}</span></summary>
    ${
      player.meal.length > 0 || player.drinkPlayed
        ? `
          <div class="public-played-list">
            ${player.meal
              .map(
                (dish, index) => `
                  <div class="public-played-group">
                    <strong>Dish ${index + 1}</strong>
                    <div class="public-card-strip">
                      ${renderMiniCard(dish.recipe)}
                      ${dish.ingredients.map(renderMiniCard).join('')}
                    </div>
                  </div>
                `,
              )
              .join('')}
            ${
              player.drinkPlayed
                ? `
                  <div class="public-played-group">
                    <strong>Drink</strong>
                    <div class="public-card-strip">${renderMiniCard(player.drinkPlayed)}</div>
                  </div>
                `
                : ''
            }
          </div>
        `
        : '<p class="empty-text">No cards served.</p>'
    }
  </details>
`;

const renderPlayer = (state: GameState, player: PlayerState, historyDepth: number) => {
  const breakdown = roundBreakdowns(state).find((item) => item.playerId === player.id);
  const handLimit = currentHandLimit(state);
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
        <span><b>${player.hand.length}/${handLimit}</b> Hand</span>
        <span><b>${player.refreshDiscards}/1</b> Refresh discards</span>
        <span><b>${player.refreshDraws}/3</b> Refresh draws</span>
        <span><b>${player.meal.length}/${state.activeCustomer?.order ?? 0}</b> Recipes</span>
        <span><b>${player.drawPile.length}</b> Draw</span>
        <span><b>${player.discard.length}</b> Discard</span>
      </div>

      <div class="player-actions">
        <button data-action="refresh" data-player="${player.id}" ${state.phase === 'serve' && player.refreshDraws < 3 && player.hand.length < handLimit ? '' : 'disabled'}>Draw Up To 3</button>
        <button data-action="discard-hand" data-player="${player.id}" ${state.phase === 'serve' && state.activeCustomer?.deckId === 'france' && player.refreshDiscards === 0 && player.refreshDraws === 0 ? '' : 'disabled'}>Redraw Hand</button>
        <button class="undo-button" data-action="undo" ${historyDepth > 0 ? '' : 'disabled'}>Undo Action</button>
      </div>

      <details open>
        <summary>Served Meal <span>${player.meal.length}</span></summary>
        <div class="breakdown-row">${breakdown ? renderBreakdown(breakdown) : ''}</div>
        <div class="dish-list">${player.meal.map((dish) => renderDish(dish, player, state.phase)).join('') || '<p class="empty-text">No recipes served.</p>'}</div>
        <div class="drink-slot">${renderPlayedDrink(player, state.phase)}</div>
      </details>

      ${state.phase !== 'serve' ? renderOwnPlayedCards(player) : ''}

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

const renderOwnPlayedCards = (player: PlayerState) => `
  <details class="own-played-cards" open>
    <summary>Played Cards <span>${player.meal.reduce((sum, dish) => sum + 1 + dish.ingredients.length, 0) + (player.drinkPlayed ? 1 : 0)}</span></summary>
    ${
      player.meal.length > 0 || player.drinkPlayed
        ? `
          <div class="public-played-list">
            ${player.meal
              .map(
                (dish, index) => `
                  <div class="public-played-group">
                    <strong>Dish ${index + 1}</strong>
                    <div class="public-card-strip">
                      ${renderMiniCard(dish.recipe)}
                      ${dish.ingredients.map(renderMiniCard).join('')}
                    </div>
                  </div>
                `,
              )
              .join('')}
            ${
              player.drinkPlayed
                ? `
                  <div class="public-played-group">
                    <strong>Drink</strong>
                    <div class="public-card-strip">${renderMiniCard(player.drinkPlayed)}</div>
                  </div>
                `
                : ''
            }
          </div>
        `
        : '<p class="empty-text">No cards served.</p>'
    }
  </details>
`;

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
              <label>${index === 0 ? 'Your Deck' : `Bot ${index + 1} Deck`}
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

const redactPrivateLog = (entry: string, state: GameState, activePlayerId: string) => {
  const hiddenPlayer = state.players.find((player) => player.id !== activePlayerId && entry.startsWith(`${player.name} `));
  if (!hiddenPlayer) return entry;

  if (entry.includes(' discarded ')) return `${hiddenPlayer.name} discarded a card during refresh.`;
  if (entry.includes(' staged ')) return `${hiddenPlayer.name} staged a recipe.`;
  if (entry.includes(' added ')) return `${hiddenPlayer.name} added an ingredient to a recipe.`;
  if (entry.includes(' returned ')) return `${hiddenPlayer.name} returned a card to hand.`;
  if (entry.includes(' added a Drink Card ')) return `${hiddenPlayer.name} added a Drink Card to their meal.`;
  if (entry.includes(' tracked ')) return `${hiddenPlayer.name} tracked a Tips Card.`;
  return entry;
};

const renderLog = (state: GameState, activePlayerId: string) => `
  <section class="log-panel">
    <h2>Playtest Log</h2>
    <ol>${state.log.slice(0, 18).map((item) => `<li>${escapeHtml(redactPrivateLog(item, state, activePlayerId))}</li>`).join('')}</ol>
  </section>
`;

const render = (root: HTMLElement, state: GameState | null, activePlayerId: string | null, historyDepth = 0) => {
  const activePlayer = state?.players.find((player) => player.id === activePlayerId) ?? state?.players[0] ?? null;

  root.innerHTML = `
    <main>
      <header class="app-header">
        <div>
          <h1>Food Court Simulator</h1>
        </div>
        <div class="header-tools">
          <nav class="mode-nav" aria-label="Simulator modes">
            <a href="/" aria-current="page">Manual Simulator</a>
            <a href="/simulate/">Simulation Lab</a>
          </nav>
          <div class="header-stats">
            ${
              state
                ? `<span>Round ${state.round}</span><span>${state.phase}</span><span>${state.customerDeck.length} customers left</span><button class="undo-button" data-action="undo" ${historyDepth > 0 ? '' : 'disabled'}>Undo</button>`
                : ''
            }
          </div>
        </div>
      </header>

      ${renderSetup(state)}
      ${state ? renderCustomerPanel(state) : ''}
      ${state && activePlayer ? renderPlayerSwitcher(state, activePlayer.id, historyDepth) : ''}
      ${state && activePlayer ? renderPublicPlayerSummary(state, activePlayer.id) : ''}
      ${state && activePlayer ? `<section class="players-grid single-player-grid">${renderPlayer(state, activePlayer, historyDepth)}</section>${renderLog(state, activePlayer.id)}` : ''}
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
        <label>${index === 0 ? 'Your Deck' : `Bot ${index + 1} Deck`}
          <select class="deck-select" data-index="${index}">${optionDecks(deckId)}</select>
        </label>
      `,
    )
    .join('');
};

export const mountFoodCourtApp = (root: HTMLElement) => {
  let state: GameState | null = createGame(DECKS, defaultDecks, Math.floor(Date.now() / 1000));
  let history: GameState[] = [];
  let activePlayerId: string | null = humanPlayerId;

  const remember = () => {
    if (!state) return;
    history.push(cloneGameState(state));
    if (history.length > maxHistory) history = history.slice(history.length - maxHistory);
  };

  const renderCurrent = () => {
    if (state && !state.players.some((player) => player.id === activePlayerId)) {
      activePlayerId = state.players[0]?.id ?? null;
    }
    render(root, state, activePlayerId, history.length);
  };

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
      activePlayerId = humanPlayerId;
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
    if (action === 'discard-hand' && player) mutate(() => discardHandForRefresh(state as GameState, player));
    if (action === 'discard' && player && card) mutate(() => discardFromHand(state as GameState, player, card));
    if (action === 'serve-recipe' && player && card) mutate(() => serveRecipe(state as GameState, player, card));
    if (action === 'add-ingredient' && player && dish && card) {
      mutate(() => addIngredient(state as GameState, player, dish, card));
    }
    if (action === 'return-dish' && player && dish) mutate(() => returnDish(state as GameState, player, dish));
    if (action === 'return-ingredient' && player && dish && card) {
      mutate(() => returnIngredient(state as GameState, player, dish, card));
    }
    if (action === 'return-drink' && player) mutate(() => returnDrink(state as GameState, player));
    if (action === 'reveal') {
      mutate(() => {
        const current = state as GameState;
        playBotPlayers(
          current,
          current.players.filter((item) => item.id !== humanPlayerId).map((item) => item.id),
        );
        revealMeals(current);
      });
    }
    if (action === 'play-drink' && player && card) mutate(() => playDrink(state as GameState, player, card));
    if (action === 'resolve') mutate(() => resolveRound(state as GameState));
  });
};
