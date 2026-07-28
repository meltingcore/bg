import { CUISINES, CUISINE_LIST, TYPE_META } from "./data.js?v=0.13.3-1";
import {
  cardParticipatesInAbility,
  cardPlayability,
  calculateMeal,
  canAttachIngredient,
  chooseAiMeal,
  classifyContest,
  cleanupMeal,
  createGame,
  determineUniqueWinner,
  emptyMeal,
  flattenMeal,
  handLimit,
  moveMealFromHand,
  refreshPlayer,
  scoreCustomer,
  scorePlayer,
  tipCandidates,
} from "./game.js?v=0.13.3-1";

const app = document.querySelector("#app");
const announcer = document.querySelector("#announcer");

let screen = "lobby";
let selectedCuisineId = "italy";
let opponentCount = 1;
let selectedOpponentCuisineIds = ["france"];
let game = null;
let toastTimer = null;
let dialogFocusPending = false;
let focusReturnAction = null;
let customerCardObserver = null;
let responsiveLayoutTimer = null;
const ui = {
  discardIds: new Set(),
  selectedDish: 0,
  rulesOpen: false,
  tipsOpen: false,
  customersPlayerId: null,
  tutorialOpen: false,
  tutorialStep: 0,
  pending: null,
  toast: "",
  undoStack: [],
};

const TUTORIAL_STEPS = [
  {
    kicker: "Welcome to the mall food court",
    title: "Attract browsing customers to your restaurant",
    symbol: "★",
    visual: "goal",
    body: "You run one of several restaurants in a busy mall food court. Customers wander between the available options, wondering what to eat. Each round, every restaurant secretly prepares an offer for the same customer.",
    note: "The game ends when any restaurant tracks 4 Tips Cards or the customer deck runs out. Then the restaurant with the most VP wins.",
  },
  {
    kicker: "First · A customer considers the court",
    title: "Read what could attract this customer",
    symbol: "◎",
    visual: "customer",
    body: "The active Customer Card represents a customer comparing the food court's restaurants. Order Value limits how many Recipe Cards you may serve and becomes base VP if they choose you. Tips Value is possible bonus VP, and the printed effect applies to every restaurant.",
    note: "Example: Order 2 means you may serve at most 2 recipes and the customer is worth 2 base VP. Tips +2 is gained only when you have at least 2 tracked Tips Cards.",
  },
  {
    kicker: "Know your cards",
    title: "Recipes become dishes; other cards improve them",
    symbol: "♨",
    visual: "formula",
    body: "A Recipe starts a dish for +1. Ingredients fill that recipe's printed slots for +1 each. You may add one Flavor to each recipe for +2, plus one Drink to the whole meal for +3 when its requirement is met.",
    note: "Ingredients determine dish difficulty: 0 is Easy, 1 is Normal, and 2 is Hard. A ↯ in a card's upper-right corner means it can participate in your restaurant's special ability.",
  },
  {
    kicker: "Phase 1 · Refresh",
    title: "Prepare your hand for this customer",
    symbol: "↻",
    visual: "refresh",
    body: "You may discard up to one card, then draw up to three cards without passing your hand limit. You may also keep every card and simply draw into any open space in your hand.",
    note: "The normal hand limit is 6. Some customers change Refresh: an Italian customer raises the limit to 8, while a French customer lets you replace your whole hand.",
  },
  {
    kicker: "Phase 2 · Serve",
    title: "Prepare the meal that could draw them to your counter",
    symbol: "＋",
    visual: "build",
    body: "Click a gold Recipe Card first. Select the dish you want to work on, then click Ingredients and a Flavor to add them there. If you want a Drink, add it after serving at least one recipe.",
    note: "You may serve fewer recipes than the Order Value or pass completely. Each restaurant's offer stays face down while the customer considers their options.",
  },
  {
    kicker: "While everyone cooks",
    title: "Use the public card counts as clues",
    symbol: "◫",
    visual: "counts",
    body: "Each restaurant shows how many cards it committed to its face-down meal and how many remain in hand. Card names stay hidden until Reveal, like watching rival counters prepare while a customer browses the court.",
    note: "A large play may be a powerful meal—or several low-value cards. The counts are information, not certainty.",
  },
  {
    kicker: "Phase 3 · Reveal",
    title: "Total the meals, then find the highest unique value",
    symbol: "✦",
    visual: "contest",
    body: "Every restaurant reveals its offer. Add card values, then the customer effect and each restaurant's ability. A Drink that misses its requirement adds +0. The highest unique Serve Value attracts the browsing customer.",
    note: "Matching values cancel. If two restaurants score 7 and another scores 5, both 7s are ignored and the unique 5 attracts the customer.",
  },
  {
    kicker: "After the winner is found",
    title: "Attract customers, track Tips, and score at the end",
    symbol: "◆",
    visual: "tips",
    body: "The customer chooses the winning restaurant. If that meal meets the restaurant deck's tracking condition, its owner may set aside one eligible card as a Tips Card. Tracked cards leave the draw cycle.",
    note: "At game end, each customer scores its Order Value plus its full Tips Value when your tracked Tips count meets that customer's threshold. Tracking 4 Tips Cards ends the game after that round.",
  },
];

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function tutorialWasSeen() {
  try {
    return window.localStorage.getItem("food-court-tutorial-seen") === "yes";
  } catch {
    return false;
  }
}

function rememberTutorial() {
  try {
    window.localStorage.setItem("food-court-tutorial-seen", "yes");
  } catch {
    // The tutorial still works when storage is unavailable.
  }
}

function announce(message) {
  announcer.textContent = message;
}

function showToast(message) {
  ui.toast = message;
  announce(message);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    ui.toast = "";
    render();
  }, 2400);
  render();
}

function cloneMeal(meal) {
  return {
    dishes: meal.dishes.map((dish) => ({
      recipe: dish.recipe,
      ingredients: [...dish.ingredients],
      flavor: dish.flavor,
    })),
    drink: meal.drink,
  };
}

function pushUndo(label) {
  ui.undoStack.push({
    label,
    phase: game.phase,
    hand: [...game.player.hand],
    meal: cloneMeal(game.player.meal),
    discardIds: [...ui.discardIds],
    selectedDish: ui.selectedDish,
  });
  if (ui.undoStack.length > 20) ui.undoStack.shift();
}

function clearUndo() {
  ui.undoStack = [];
}

function undoLastAction() {
  const snapshot = ui.undoStack.pop();
  if (!snapshot || snapshot.phase !== game.phase) return;
  game.player.hand = snapshot.hand;
  game.player.meal = snapshot.meal;
  ui.discardIds = new Set(snapshot.discardIds);
  ui.selectedDish = snapshot.selectedDish;
  announce(`Undid ${snapshot.label}.`);
  render();
}

function undoButton() {
  const last = ui.undoStack.at(-1);
  return `<button class="undo-button" data-action="undo-last" ${last ? "" : "disabled"} title="${last ? `Undo ${escapeHtml(last.label)}` : "Nothing to undo in this phase"}">↶ Undo</button>`;
}

function cuisineCard(cuisine) {
  const selected = selectedCuisineId === cuisine.id;
  return `
    <button
      class="cuisine-option ${selected ? "is-selected" : ""}"
      style="--cuisine: ${cuisine.accent}"
      data-action="select-cuisine"
      data-cuisine="${cuisine.id}"
      aria-pressed="${selected}"
    >
      <span class="cuisine-seal restaurant-flag" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
      <span class="cuisine-copy">
        <span class="cuisine-flag">${cuisine.flag}</span>
        <strong>${escapeHtml(cuisine.name)}</strong>
        <small>${escapeHtml(cuisine.region)}</small>
      </span>
      <span class="cuisine-ability">${escapeHtml(cuisine.ability)}</span>
      <span class="cuisine-check">✓</span>
    </button>
  `;
}

function reconcileOpponentDecks() {
  const available = CUISINE_LIST.map((cuisine) => cuisine.id).filter((id) => id !== selectedCuisineId);
  const next = [];
  for (let index = 0; index < opponentCount; index += 1) {
    const preferred = selectedOpponentCuisineIds[index];
    const selection = available.includes(preferred) && !next.includes(preferred)
      ? preferred
      : available.find((id) => !next.includes(id));
    next.push(selection);
  }
  selectedOpponentCuisineIds = next;
}

function opponentSetup() {
  return `
    <div class="match-setup">
      <div class="opponent-count-row">
        <div><span class="step-label"><b>2</b> Set the table</span><strong>Choose your rival restaurants</strong></div>
        <div class="count-toggle" aria-label="Number of AI rivals">
          ${[1, 2, 3].map((count) => `
            <button data-action="set-opponent-count" data-count="${count}" class="${opponentCount === count ? "is-selected" : ""}" aria-pressed="${opponentCount === count}">${count}</button>
          `).join("")}
        </div>
      </div>
      <div class="opponent-selects">
        ${selectedOpponentCuisineIds.map((selectedId, index) => `
          <label>
            <span>Rival ${index + 1}</span>
            <select data-opponent-index="${index}" aria-label="Rival ${index + 1} restaurant deck">
              ${CUISINE_LIST.filter((cuisine) => cuisine.id !== selectedCuisineId).map((cuisine) => {
                const chosenElsewhere = selectedOpponentCuisineIds.some((id, rivalIndex) => rivalIndex !== index && id === cuisine.id);
                return `<option value="${cuisine.id}" ${cuisine.id === selectedId ? "selected" : ""} ${chosenElsewhere ? "disabled" : ""}>${cuisine.flag} ${escapeHtml(cuisine.name)}</option>`;
              }).join("")}
            </select>
          </label>
        `).join("")}
      </div>
      <p class="setup-note">Each restaurant deck is unique at the table. Rivals play automatically.</p>
    </div>
  `;
}

function renderLobby() {
  const selected = CUISINES[selectedCuisineId];
  return `
    <main class="lobby-shell cuisine-theme-${selectedCuisineId}">
      <div class="lobby-art" aria-hidden="true"></div>
      <div class="lobby-vignette" aria-hidden="true"></div>
      <section class="lobby-content">
        <div class="brand-lockup">
          <span class="brand-kicker">A competitive cooking card game</span>
          <h1><span>Food</span> Court</h1>
          <p>Build a menu. Read the room. Attract customers.</p>
          <div class="game-facts"><span>2–4 restaurants</span><span>Simultaneous turns</span><span>About 15 minutes</span></div>
        </div>

        <div class="restaurant-picker panel-parchment">
          <div class="picker-heading">
            <div>
              <span class="step-label"><b>1</b> Choose your restaurant</span>
              <h2>Who is opening tonight?</h2>
            </div>
            <div class="picker-actions">
              <button class="text-button" data-action="open-tutorial"><span>▶</span> Guided tour</button>
              <button class="icon-button" data-action="open-rules" aria-label="Open complete game rules">?</button>
            </div>
          </div>
          <div class="cuisine-grid">
            ${CUISINE_LIST.map(cuisineCard).join("")}
          </div>
          <div class="selected-brief" style="--cuisine: ${selected.accent}">
            <span class="brief-icon">✦</span>
            <div>
              <small>Your signature ability</small>
              <strong>${escapeHtml(selected.ability)}</strong>
              <p>${escapeHtml(selected.abilityText)}</p>
            </div>
          </div>
          ${opponentSetup()}
          <button class="primary-button lobby-start" data-action="start-game">
            <span>Open for service <b>→</b></span>
            <small>You + ${opponentCount} AI rival${opponentCount === 1 ? "" : "s"}</small>
          </button>
        </div>
      </section>
      <footer class="lobby-footer">Eight restaurants · one shared court · highest unique meal wins</footer>
      ${ui.rulesOpen ? rulesModal() : ""}
      ${ui.tutorialOpen ? tutorialModal() : ""}
    </main>
  `;
}

function cardDetail(card) {
  if (card.type === "recipe") {
    const tag = card.tag ? ` · ${card.tag}` : "";
    return `${card.slots === 0 ? "No" : card.slots} ingredient slot${card.slots === 1 ? "" : "s"}${tag}`;
  }
  if (card.type === "ingredient") return card.tag ? `${card.tag} ingredient` : "Add to a recipe";
  if (card.type === "flavor") return "Add to a recipe · +2";
  return card.condition;
}

function cardAbilityContext(card) {
  if (!cardParticipatesInAbility(card)) return null;
  const cuisine = CUISINES[card.cuisineId];
  if (!cuisine) return null;
  return {
    label: `Ability marker: works with ${cuisine.ability}`,
  };
}

function abilityMarker(context) {
  if (!context) return "";
  return `
    <span
      class="ability-card-marker"
      title="${escapeHtml(context.label)}"
      aria-hidden="true"
    >↯</span>
  `;
}

function cardMarkup(card, options = {}) {
  const meta = TYPE_META[card.type];
  const abilityContext = cardAbilityContext(card);
  const selected = options.selected ? "is-selected" : "";
  const compact = options.compact ? "is-compact" : "";
  const action = options.action || "play-card";
  const playability = options.playability;
  const unplayable = playability && !playability.playable;
  return `
    <button
      class="game-card card-${card.type} ${abilityContext ? "has-ability-marker" : ""} ${selected} ${compact} ${unplayable ? "is-unplayable" : ""}"
      data-action="${action}"
      data-card-id="${card.id}"
      aria-disabled="${unplayable ? "true" : "false"}"
      aria-label="${escapeHtml(meta.label)}: ${escapeHtml(card.name)}. ${escapeHtml(cardDetail(card))}${abilityContext ? `. ${escapeHtml(abilityContext.label)}` : ""}${playability ? `. ${escapeHtml(playability.reason)}` : ""}"
    >
      ${abilityMarker(abilityContext)}
      ${unplayable ? `<span class="card-state-badge"><b>×</b> Not playable</span>` : ""}
      <span class="card-corner">
        <span class="type-symbol">${meta.symbol}</span>
        <span class="card-value">${meta.value}</span>
      </span>
      <span class="card-illustration" aria-hidden="true">
        <span>${meta.symbol}</span>
      </span>
      <span class="card-type">${meta.label}</span>
      <strong class="card-name">${escapeHtml(card.name)}</strong>
      <span class="card-rule">${escapeHtml(cardDetail(card))}</span>
      ${card.type === "recipe" ? `<span class="slot-row">${card.slots ? "◇".repeat(card.slots) : "—"}</span>` : ""}
    </button>
  `;
}

function customerCard(customer) {
  const cuisine = CUISINES[customer.cuisineId];
  return `
    <article class="customer-card" style="--customer: ${customer.accent}">
      <div class="customer-ribbon">Now ordering</div>
      <div class="customer-portrait" aria-hidden="true">
        <span class="customer-portrait-medallion"><span class="flag-glyph">${customer.flag}</span></span>
      </div>
      <div class="customer-title">
        <span>${escapeHtml(cuisine.region)}</span>
        <h2>${escapeHtml(customer.name)}</h2>
      </div>
      <div class="customer-values">
        <div aria-label="Order Value ${customer.order}: serve at most ${customer.order} recipe${customer.order === 1 ? "" : "s"}; worth ${customer.order} base victory point${customer.order === 1 ? "" : "s"}"><strong>${customer.order}</strong><span>Order <i>max dishes</i></span></div>
        <div aria-label="Tips Value ${customer.tips}: gain ${customer.tips} bonus victory points when you have at least ${customer.tips} tracked Tips Cards"><strong>+${customer.tips}</strong><span>Tips <i>bonus VP</i></span></div>
      </div>
      <p class="customer-effect"><span>✦</span>${escapeHtml(customer.effect)}</p>
    </article>
  `;
}

function mobileCustomerSummary(customer) {
  return `
    <aside
      class="mobile-customer-summary"
      aria-label="Current customer: ${escapeHtml(customer.name)}. Order Value ${customer.order}. Tips Value ${customer.tips}."
      aria-hidden="true"
      style="--customer:${customer.accent}"
    >
      <span class="mobile-customer-flag restaurant-flag" aria-hidden="true"><span class="flag-glyph">${customer.flag}</span></span>
      <span class="mobile-customer-name"><small>Current customer</small><strong>${escapeHtml(customer.name)}</strong></span>
      <span class="mobile-customer-value"><b>${customer.order}</b><small>Order</small></span>
      <span class="mobile-customer-value is-tips"><b>+${customer.tips}</b><small>Tips</small></span>
    </aside>
  `;
}

function scorePill(player, side, index = 0) {
  const cuisine = CUISINES[player.cuisineId];
  const restaurantLabel = side === "player" ? "your restaurant" : `Rival ${index + 1}`;
  const tipsCounter = side === "player"
    ? `<button
        class="score-tips score-tips-button"
        data-action="open-tips"
        aria-haspopup="dialog"
        aria-label="View your ${player.tips.length} tracked Tips Cards"
      ><b>${player.tips.length}/4</b><span>tips</span></button>`
    : `<span class="score-tips"><b>${player.tips.length}/4</b><span>tips</span></span>`;
  return `
    <div class="score-pill ${side}">
      <span class="score-avatar restaurant-flag" style="--cuisine: ${cuisine.accent}" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
      <span class="score-name"><small>${side === "player" ? "Your restaurant" : `Rival ${index + 1}`}</small>${escapeHtml(cuisine.name)}</span>
      <button
        type="button"
        class="score-value score-value-button"
        data-action="open-customers"
        data-player-id="${player.id}"
        aria-haspopup="dialog"
        aria-label="View ${restaurantLabel}'s ${player.customers.length} attracted customer${player.customers.length === 1 ? "" : "s"} contributing ${scorePlayer(player)} victory points"
      ><strong>${scorePlayer(player)}</strong><small>VP</small></button>
      ${tipsCounter}
    </div>
  `;
}

function trackedTipCard(card, index) {
  const meta = TYPE_META[card.type];
  const abilityContext = cardAbilityContext(card);
  return `
    <article
      class="tracked-tip-card card-${card.type} ${abilityContext ? "has-ability-marker" : ""}"
      aria-label="Tracked Tips Card ${index + 1}: ${escapeHtml(card.name)}${abilityContext ? `. ${escapeHtml(abilityContext.label)}` : ""}"
    >
      ${abilityMarker(abilityContext)}
      <span class="tracked-tip-number">Tips Card ${index + 1}</span>
      <span class="tracked-tip-symbol" aria-hidden="true">${meta.symbol}</span>
      <span class="card-type">${meta.label}</span>
      <strong>${escapeHtml(card.name)}</strong>
      <p>${escapeHtml(cardDetail(card))}</p>
      <small>Set aside · no longer in your draw cycle</small>
    </article>
  `;
}

function tipsModal() {
  const cuisine = CUISINES[game.player.cuisineId];
  const trackedCount = game.player.tips.length;
  const bonusCustomers = game.player.customers.filter((customer) => trackedCount >= customer.tips);
  const bonusVp = bonusCustomers.reduce((total, customer) => total + customer.tips, 0);
  return `
    <div
      class="overlay tips-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tips-title"
      aria-describedby="tips-summary"
    >
      <section class="tips-panel panel-parchment">
        <button
          class="close-button"
          data-action="close-tips"
          data-dialog-primary
          aria-label="Close Tips Cards"
        >×</button>
        <span class="eyebrow">Your set-aside cards</span>
        <h2 id="tips-title">Tips Cards</h2>
        <p id="tips-summary" class="tips-lead">
          <strong>${trackedCount}/4 tracked</strong> · Tracking four ends the game.
        </p>
        <div class="tips-ability" style="--cuisine:${cuisine.accent}">
          <span>✦</span>
          <div>
            <small>${escapeHtml(cuisine.name)} tracking condition</small>
            <strong>${escapeHtml(cuisine.tipsText)}</strong>
          </div>
        </div>
        ${trackedCount ? `
          <div class="tracked-tips-grid" aria-label="Your tracked Tips Cards">
            ${game.player.tips.map(trackedTipCard).join("")}
          </div>` : `
          <div class="tips-empty">
            <span aria-hidden="true">✦</span>
            <strong>No Tips Cards tracked yet</strong>
            <p>
              Attract a customer with your restaurant's tracking combination, then choose an eligible
              card during the reveal.
            </p>
          </div>`}
        <p class="tips-score-impact">
          <strong>Current scoring:</strong> ${bonusCustomers.length} of ${game.player.customers.length}
          attracted customers receive their Tips Value, adding <b>+${bonusVp} VP</b>.
        </p>
      </section>
    </div>
  `;
}

function restaurantPlayers() {
  return game ? [game.player, ...game.opponents] : [];
}

function restaurantLabel(player) {
  if (player.id === game.player.id) return "Your restaurant";
  return `Rival ${game.opponents.findIndex((opponent) => opponent.id === player.id) + 1}`;
}

function attractedCustomerCard(customer, trackedTips, index) {
  const cuisine = CUISINES[customer.cuisineId];
  const scoring = scoreCustomer(customer, trackedTips);
  return `
    <article
      class="attracted-customer-card ${scoring.tipsUnlocked ? "has-tips" : "needs-tips"}"
      style="--customer:${customer.accent}"
      aria-label="Attracted Customer ${index + 1}: ${escapeHtml(customer.name)}. Scores ${scoring.total} victory points."
    >
      <header>
        <span class="attracted-customer-flag restaurant-flag" aria-hidden="true">
          <span class="flag-glyph">${customer.flag}</span>
        </span>
        <span>
          <small>Attracted Customer ${index + 1}</small>
          <strong>${escapeHtml(customer.name)}</strong>
          <i>${escapeHtml(cuisine.region)}</i>
        </span>
      </header>
      <div class="attracted-customer-values">
        <span><b>${customer.order}</b><small>Order VP</small></span>
        <span class="${scoring.tipsUnlocked ? "is-unlocked" : ""}"><b>+${customer.tips}</b><small>Tips Value</small></span>
      </div>
      <p><span aria-hidden="true">✦</span>${escapeHtml(customer.effect)}</p>
      <footer class="${scoring.tipsUnlocked ? "is-unlocked" : ""}">
        <span>${scoring.tipsUnlocked
          ? `Tips unlocked with ${trackedTips} tracked`
          : `Needs ${customer.tips} tracked Tips · currently ${trackedTips}`}</span>
        <strong>${scoring.orderVp} + ${scoring.tipsVp} = ${scoring.total} VP</strong>
      </footer>
    </article>
  `;
}

function customersModal() {
  const player = restaurantPlayers().find((candidate) => candidate.id === ui.customersPlayerId);
  if (!player) return "";

  const cuisine = CUISINES[player.cuisineId];
  const baseVp = player.customers.reduce(
    (total, customer) => total + scoreCustomer(customer, player.tips.length).orderVp,
    0,
  );
  const tipsVp = player.customers.reduce(
    (total, customer) => total + scoreCustomer(customer, player.tips.length).tipsVp,
    0,
  );
  const label = restaurantLabel(player);
  return `
    <div
      class="overlay customers-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customers-title"
      aria-describedby="customers-summary"
    >
      <section class="customers-panel panel-parchment">
        <button
          class="close-button"
          data-action="close-customers"
          data-dialog-primary
          aria-label="Close attracted customers"
        >×</button>
        <div class="customers-heading" style="--cuisine:${cuisine.accent}">
          <span class="customers-restaurant-flag restaurant-flag" aria-hidden="true">
            <span class="flag-glyph">${cuisine.flag}</span>
          </span>
          <div>
            <span class="eyebrow">${label}</span>
            <h2 id="customers-title">${escapeHtml(cuisine.name)} customers</h2>
          </div>
        </div>
        <div id="customers-summary" class="customers-score-summary">
          <p>
            <strong>${scorePlayer(player)} VP</strong>
            from ${player.customers.length} attracted customer${player.customers.length === 1 ? "" : "s"}
          </p>
          <div aria-label="${baseVp} Order Value points plus ${tipsVp} Tips Value points">
            <span><b>${baseVp}</b><small>Order VP</small></span>
            <i aria-hidden="true">+</i>
            <span><b>${tipsVp}</b><small>Tips VP</small></span>
            <i aria-hidden="true">=</i>
            <span class="is-total"><b>${scorePlayer(player)}</b><small>Total VP</small></span>
          </div>
          <small>${player.tips.length}/4 Tips Cards tracked</small>
        </div>
        ${player.customers.length ? `
          <div class="attracted-customers-grid" aria-label="${label}'s attracted Customer Cards">
            ${player.customers.map((customer, index) =>
              attractedCustomerCard(customer, player.tips.length, index)).join("")}
          </div>` : `
          <div class="customers-empty">
            <span aria-hidden="true">◎</span>
            <strong>No customers attracted yet</strong>
            <p>Customer Cards will appear here after this restaurant wins a meal contest.</p>
          </div>`}
      </section>
    </div>
  `;
}

function closeCustomers() {
  const playerId = ui.customersPlayerId;
  ui.customersPlayerId = null;
  render();
  window.queueMicrotask(() => {
    [...document.querySelectorAll('[data-action="open-customers"]')]
      .find((button) => button.dataset.playerId === playerId)?.focus();
  });
}

function phaseTrail() {
  const phases = [
    { id: "refresh", label: "Refresh" },
    { id: "serve", label: "Serve" },
    { id: "reveal", label: "Reveal" },
  ];
  const currentIndex = Math.max(0, phases.findIndex((phase) => phase.id === game.phase));
  return `
    <ol class="phase-trail" aria-label="Round phases">
      ${phases.map((phase, index) => `
        <li class="${index < currentIndex ? "is-complete" : ""} ${phase.id === game.phase ? "is-current" : ""}" ${phase.id === game.phase ? 'aria-current="step"' : ""}>
          <span>${index < currentIndex ? "✓" : index + 1}</span>${phase.label}
        </li>
      `).join("")}
    </ol>
  `;
}

function opponentZone() {
  return `
    <section class="opponent-zone" aria-label="Rival restaurants">
      ${game.opponents.map((opponent, rivalIndex) => {
        const cuisine = CUISINES[opponent.cuisineId];
        const playedCount = flattenMeal(opponent.meal).length;
        const hiddenCards = Array.from({ length: Math.min(opponent.hand.length, 4) }, (_, cardIndex) =>
          `<span class="card-back" style="--i:${cardIndex}"><i aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></i></span>`).join("");
        return `
          <article class="opponent-seat">
            <div class="opponent-identity">
              <span class="mini-seal restaurant-flag" style="--cuisine:${cuisine.accent}" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
              <div><small>Rival ${rivalIndex + 1}</small><strong>${escapeHtml(cuisine.name)}</strong><span>${escapeHtml(cuisine.ability)}</span></div>
            </div>
            <div class="opponent-hand" aria-label="Rival ${rivalIndex + 1} has ${opponent.hand.length} cards">${hiddenCards}</div>
            <div class="opponent-status" aria-label="Rival ${rivalIndex + 1}: ${playedCount} cards played and ${opponent.hand.length} cards left in hand">
              ${game.phase === "refresh"
                ? `<span><b>${opponent.hand.length}</b> in hand</span><i>refreshing…</i>`
                : `<span class="played-count"><b>${playedCount}</b> played</span><span><b>${opponent.hand.length}</b> in hand</span><i>${game.phase === "reveal" ? "revealed" : "cooking…"}</i>`}
            </div>
          </article>
        `;
      }).join("")}
    </section>
  `;
}

function ingredientSlots(dish) {
  const printed = dish.recipe.slots;
  const visibleSlots = Math.max(printed, dish.ingredients.length);
  if (visibleSlots === 0) return `<span class="no-slots">No printed ingredient slots</span>`;
  return `
    <span class="ingredient-slots" aria-label="${dish.ingredients.length} of ${printed} printed ingredient slots used">
      ${Array.from({ length: visibleSlots }, (_, index) => `
        <i class="${index < dish.ingredients.length ? "is-filled" : ""} ${index >= printed ? "is-extra" : ""}">${index >= printed ? "+" : "◇"}</i>
      `).join("")}
    </span>
  `;
}

function mealDish(dish, index) {
  const selected = ui.selectedDish === index;
  const difficulty = dish.ingredients.length === 0 ? "Easy" : dish.ingredients.length === 1 ? "Normal" : "Hard";
  return `
    <article class="meal-dish ${selected ? "is-selected" : ""}" data-action="select-dish" data-dish-index="${index}">
      <div class="dish-number">Dish ${index + 1} ${selected ? `<b>Selected target</b>` : ""}</div>
      <button class="remove-card" data-action="remove-meal-card" data-card-id="${dish.recipe.id}" aria-label="Return ${escapeHtml(dish.recipe.name)} to hand">×</button>
      <div class="dish-recipe">
        <span>♨</span>
        <strong>${escapeHtml(dish.recipe.name)}</strong>
        <small>${difficulty} dish · Recipe +1</small>
      </div>
      <div class="dish-capacity">${ingredientSlots(dish)}<button class="dish-target" data-action="select-dish" data-dish-index="${index}" aria-pressed="${selected}">${selected ? "Adding cards here" : "Target this dish"}</button></div>
      <div class="dish-additions">
        ${dish.ingredients.map((card) => `
          <button class="addition ingredient" data-action="remove-meal-card" data-card-id="${card.id}">
            ◇ ${escapeHtml(card.name)} <b>+1</b>
          </button>`).join("")}
        ${dish.flavor ? `
          <button class="addition flavor" data-action="remove-meal-card" data-card-id="${dish.flavor.id}">
            ✦ ${escapeHtml(dish.flavor.name)} <b>+2</b>
          </button>` : ""}
        ${dish.ingredients.length === 0 && !dish.flavor ? `<span class="empty-addition">Ingredient and Flavor Cards will appear here</span>` : ""}
      </div>
    </article>
  `;
}

function mealBuilder() {
  const meal = game.player.meal;
  const cuisine = CUISINES[game.player.cuisineId];
  const preview = calculateMeal(
    meal,
    game.player.cuisineId,
    game.activeCustomer,
    game.player,
    game.opponents,
  );
  const maxRecipes = game.activeCustomer.order;
  const activeBreakdown = Object.entries(preview.breakdown).filter(([, value]) => value > 0);
  return `
    <section class="meal-builder ${meal.dishes.length ? "has-dishes" : "is-empty"}" aria-label="Your serving board">
      <div class="meal-heading">
        <div>
          <span class="eyebrow">Your serving board</span>
          <h2>${meal.dishes.length ? "Tonight's meal" : "Build a meal"}</h2>
        </div>
        <div class="serve-preview" aria-live="polite" aria-label="Current Serve Value ${preview.total}">
          <small>Live Serve Value</small>
          <strong>${preview.total}</strong>
        </div>
      </div>
      <div class="live-breakdown" aria-label="Serve Value breakdown">
        ${activeBreakdown.length
          ? activeBreakdown.map(([label, value]) => `<span>${label} <b>+${value}</b></span>`).join("")
          : `<span class="empty-breakdown">Choose a Recipe Card to begin scoring</span>`}
      </div>
      <div class="dish-slots">
        ${meal.dishes.map(mealDish).join("")}
        ${meal.dishes.length < maxRecipes ? `
          <div class="empty-dish-slot">
            <span>＋</span>
            <strong>${meal.dishes.length ? "Add another recipe" : "Choose a recipe from your hand"}</strong>
            <small>Up to ${maxRecipes} dish${maxRecipes === 1 ? "" : "es"} for this customer</small>
          </div>` : ""}
      </div>
      <div class="meal-footer">
        <div class="ability-chip" style="--cuisine:${cuisine.accent}">
          <span>✦</span><div><small>${escapeHtml(cuisine.ability)}</small>${escapeHtml(cuisine.abilityText)}</div>
        </div>
        <div class="drink-slot ${meal.drink ? "has-drink" : ""} ${meal.drink ? (preview.validDrink ? "is-valid" : "is-invalid") : ""}">
          ${meal.drink ? `
            <button data-action="remove-meal-card" data-card-id="${meal.drink.id}">
              <span>◒</span><div><small>${preview.validDrink ? "Requirement met · +3" : "Requirement not met · +0"}</small><strong>${escapeHtml(meal.drink.name)}</strong><em>${escapeHtml(meal.drink.condition)}</em></div><b>${preview.validDrink ? "✓" : "!"}</b>
            </button>` : `<span>◒</span><div><small>Optional · one per meal</small><strong>Drink slot</strong></div>`}
        </div>
      </div>
    </section>
  `;
}

function phaseAction() {
  if (game.phase === "refresh") {
    const limit = handLimit(game.activeCustomer);
    const french = game.activeCustomer.nationality === "france";
    const drawCount = Math.min(3, Math.max(0, limit - game.player.hand.length + ui.discardIds.size));
    return `
      <aside class="phase-action refresh-action">
        <div><span class="phase-step">1</span><div><small>Now · Refresh</small><strong>${ui.discardIds.size ? "Replace the marked card" : "Keep or mark one card"}</strong></div></div>
        <p>Select up to one card to discard. You will draw ${drawCount || "no"} card${drawCount === 1 ? "" : "s"} when you continue.</p>
        <div class="phase-metrics"><span>Hand <b>${game.player.hand.length}/${limit}</b></span><span>Marked <b>${ui.discardIds.size}/1</b></span><span>Draw <b>${drawCount}</b></span></div>
        <div class="action-buttons">
          ${undoButton()}
          ${french ? `<button class="secondary-button" data-action="mulligan">Replace hand</button>` : ""}
          <button class="primary-button" data-action="finish-refresh">
            ${ui.discardIds.size ? "Discard & draw" : "Keep hand & draw"} <span>→</span>
          </button>
        </div>
      </aside>
    `;
  }
  return `
    <aside class="phase-action serve-action">
      <div><span class="phase-step">2</span><div><small>Now · Serve</small><strong>${game.player.meal.dishes.length ? "Finish and commit your meal" : "Start with a Recipe Card"}</strong></div></div>
      <p>${game.player.meal.dishes.length ? "Select a dish to direct Ingredients and Flavors, then serve when ready." : "Gold Recipe Cards create dishes. This customer accepts up to " + game.activeCustomer.order + "."}</p>
      <div class="phase-metrics"><span>Played <b>${flattenMeal(game.player.meal).length}</b></span><span>In hand <b>${game.player.hand.length}</b></span><span>Dishes <b>${game.player.meal.dishes.length}/${game.activeCustomer.order}</b></span></div>
      <div class="action-buttons">
        ${undoButton()}
        <button class="secondary-button" data-action="serve-meal" data-pass="true">Pass</button>
        <button class="primary-button" data-action="serve-meal" ${game.player.meal.dishes.length ? "" : "disabled"}>
          Serve face down <span>↟</span>
        </button>
      </div>
    </aside>
  `;
}

function mobileActionBar() {
  if (game.phase === "refresh") {
    const french = game.activeCustomer.nationality === "france";
    return `
      <nav class="mobile-action-bar" aria-label="Refresh actions">
        ${undoButton()}
        ${french ? `<button class="secondary-button" data-action="mulligan">New hand</button>` : ""}
        <button class="primary-button" data-action="finish-refresh">${ui.discardIds.size ? "Discard & draw" : "Keep & draw"} <span>→</span></button>
      </nav>
    `;
  }
  if (game.phase === "serve") {
    return `
      <nav class="mobile-action-bar" aria-label="Serve actions">
        ${undoButton()}
        <button class="secondary-button" data-action="serve-meal" data-pass="true">Pass</button>
        <button class="primary-button" data-action="serve-meal" ${game.player.meal.dishes.length ? "" : "disabled"}>Serve <span>↟</span></button>
      </nav>
    `;
  }
  return "";
}

function handSection() {
  const refresh = game.phase === "refresh";
  const counts = Object.fromEntries(Object.keys(TYPE_META).map((type) => [
    type,
    game.player.hand.filter((card) => card.type === type).length,
  ]));
  const selectedDish = game.player.meal.dishes[ui.selectedDish];
  const coach = refresh
    ? (ui.discardIds.size ? "Marked cards return to normal when you click them again." : "Optional: mark one card you do not need this round.")
    : !game.player.meal.dishes.length
      ? "Choose a gold Recipe Card to create your first dish."
      : `Targeting Dish ${ui.selectedDish + 1}: ${selectedDish?.recipe.name}. Ingredients and Flavors go here.`;
  return `
    <section class="hand-section ${refresh ? "refresh-mode" : ""}">
      <div class="hand-toolbar">
        <div><span class="eyebrow">Your hand</span><strong>${game.player.hand.length} cards</strong></div>
        <div class="hand-legend">
          ${Object.entries(TYPE_META).map(([type, meta]) => `<span class="legend-${type}">${meta.symbol} ${counts[type]}</span>`).join("")}
          <span class="legend-ability" title="Cards marked with ↯ can participate in your restaurant's special ability">↯ ability</span>
        </div>
        ${refresh ? `<span class="discard-counter">${ui.discardIds.size}/1 selected to discard</span>` : ""}
      </div>
      <div class="hand-coach ${refresh ? "" : "serve-coach"}"><span>${refresh ? "↻" : "◎"}</span>${escapeHtml(coach)}</div>
      <div class="hand-cards" role="list" aria-label="Your hand of cards">
        ${game.player.hand.length ? game.player.hand.map((card) => cardMarkup(card, {
          selected: ui.discardIds.has(card.id),
          action: refresh ? "toggle-discard" : "play-card",
          playability: refresh ? null : cardPlayability(card, game.player.meal, game.player.cuisineId, game.activeCustomer.order, ui.selectedDish),
        })).join("") : `<div class="empty-hand">Your hand is empty. Your discard pile will be reshuffled when needed.</div>`}
      </div>
    </section>
  `;
}

function breakdownRows(result, player) {
  const cuisine = CUISINES[player.cuisineId];
  const sourceLabels = {
    Recipes: "Recipe Cards",
    Ingredients: "Ingredient Cards",
    Flavors: "Flavor Cards",
    Drink: "Valid Drink Card",
    Customer: "Customer effect",
    Ability: cuisine.ability,
  };
  return Object.entries(result.breakdown)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `<li><span>${label}<small>${escapeHtml(sourceLabels[label])}</small></span><strong>+${value}</strong></li>`)
    .join("");
}

function revealedCard(card, value, note = cardDetail(card)) {
  const meta = TYPE_META[card.type];
  const abilityContext = cardAbilityContext(card);
  return `
    <article
      class="revealed-card card-${card.type} ${abilityContext ? "has-ability-marker" : ""}"
      aria-label="${escapeHtml(meta.label)}: ${escapeHtml(card.name)}. Value ${escapeHtml(value)}${abilityContext ? `. ${escapeHtml(abilityContext.label)}` : ""}"
    >
      ${abilityMarker(abilityContext)}
      <div><span>${meta.symbol} ${escapeHtml(meta.label)}</span><b>${value}</b></div>
      <strong>${escapeHtml(card.name)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function revealedMealDetails(player, meal, result) {
  const cuisine = CUISINES[player.cuisineId];
  const playedCount = flattenMeal(meal).length;
  const cardSubtotal = result.breakdown.Recipes
    + result.breakdown.Ingredients
    + result.breakdown.Flavors
    + result.breakdown.Drink;
  return `
    <details class="result-details">
      <summary>
        <span>${playedCount ? "Examine the actual cards" : "Examine this pass"}<small>${playedCount ? `${playedCount} revealed card${playedCount === 1 ? "" : "s"} · click to inspect` : "No meal was served"}</small></span>
        <b aria-hidden="true">⌄</b>
      </summary>
      <div class="revealed-meal">
        ${meal.dishes.length ? meal.dishes.map((dish, index) => {
          const difficulty = dish.ingredients.length === 0 ? "Easy" : dish.ingredients.length === 1 ? "Normal" : "Hard";
          const dishSubtotal = 1 + dish.ingredients.length + (dish.flavor ? 2 : 0);
          return `
            <section class="revealed-dish">
              <header><span>Dish ${index + 1} · ${difficulty}</span><b>+${dishSubtotal}</b></header>
              <div class="revealed-card-grid">
                ${revealedCard(dish.recipe, "+1")}
                ${dish.ingredients.map((card) => revealedCard(card, "+1")).join("")}
                ${dish.flavor ? revealedCard(dish.flavor, "+2") : ""}
              </div>
            </section>
          `;
        }).join("") : `<p class="revealed-pass">No Recipe Cards were served, so this restaurant did not compete for the customer.</p>`}
        ${meal.drink ? `
          <section class="revealed-dish revealed-drink">
            <header><span>Drink Card · ${result.validDrink ? "requirement met" : "requirement missed"}</span><b>+${result.validDrink ? 3 : 0}</b></header>
            <div class="revealed-card-grid">
              ${revealedCard(meal.drink, result.validDrink ? "+3" : "+0", `${meal.drink.condition} · ${result.validDrink ? "valid" : "not met"}`)}
            </div>
          </section>` : ""}
        <dl class="serve-ledger">
          <div><dt>Revealed cards</dt><dd>+${cardSubtotal}</dd></div>
          <div><dt>Customer effect<small>${escapeHtml(game.activeCustomer.effect)}</small></dt><dd>+${result.breakdown.Customer}</dd></div>
          <div><dt>${escapeHtml(cuisine.ability)}<small>${escapeHtml(cuisine.abilityText)}</small></dt><dd>+${result.breakdown.Ability}</dd></div>
          <div class="serve-ledger-total"><dt>Total Serve Value</dt><dd>${result.total}</dd></div>
        </dl>
      </div>
    </details>
  `;
}

function resultPanel(side, player, meal, result, label, status) {
  const cuisine = CUISINES[player.cuisineId];
  const statusText = {
    winner: "Highest unique · wins",
    cancelled: "Tied value · canceled",
    outscored: "Unique, but lower",
    passed: "Passed this customer",
  }[status];
  return `
    <article class="result-side ${side} status-${status}">
      <span class="result-status">${status === "winner" ? "✦" : status === "cancelled" ? "×" : "·"} ${statusText}</span>
      <div class="result-restaurant">
        <span class="mini-seal restaurant-flag" style="--cuisine:${cuisine.accent}" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
        <div><small>${escapeHtml(label)}</small><strong>${escapeHtml(cuisine.name)}</strong></div>
      </div>
      <div class="result-card-counts"><b>${flattenMeal(meal).length}</b> played · <b>${player.hand.length}</b> left in hand</div>
      <div class="result-total">${result.total}</div>
      <ul>${breakdownRows(result, player)}</ul>
      <div class="result-cards">
        ${meal.dishes.map((dish) => `<span title="${escapeHtml(dish.recipe.name)}">♨ ${escapeHtml(dish.recipe.name)}</span>`).join("") || `<span>Passed</span>`}
        ${meal.drink ? `<span title="${escapeHtml(meal.drink.name)}">◒ ${escapeHtml(meal.drink.name)} ${result.validDrink ? "+3" : "+0"}</span>` : ""}
      </div>
      ${revealedMealDetails(player, meal, result)}
    </article>
  `;
}

function resolutionTrail(classified) {
  const groups = [...new Set(classified.filter((entry) => entry.competing).map((entry) => entry.value))]
    .sort((a, b) => b - a)
    .map((value) => {
      const entries = classified.filter((entry) => entry.competing && entry.value === value);
      const status = entries[0]?.status;
      return `<span class="resolution-value status-${status}"><b>${value}</b><small>${entries.length > 1 ? `${entries.length}-way tie · canceled` : status === "winner" ? "highest unique · wins" : "unique but lower"}</small></span>`;
    });
  if (!groups.length) return `<div class="resolution-trail"><span class="resolution-value status-passed"><b>—</b><small>Everyone passed</small></span></div>`;
  return `<div class="resolution-trail" aria-label="Contest resolution">${groups.join('<i aria-hidden="true">→</i>')}</div>`;
}

function revealOverlay() {
  const pending = ui.pending;
  const isPlayerWinner = pending.winnerId === game.player.id;
  const winner = [game.player, ...game.opponents].find((player) => player.id === pending.winnerId);
  const contestEntries = [
    { id: game.player.id, value: pending.playerResult.total, competing: game.player.meal.dishes.length > 0 },
    ...pending.opponentResults.map(({ player, result }) => ({ id: player.id, value: result.total, competing: player.meal.dishes.length > 0 })),
  ];
  const classified = classifyContest(contestEntries);
  const statusFor = (playerId) => classified.find((entry) => entry.id === playerId)?.status || "passed";
  const heading = isPlayerWinner
    ? "Your table wins!"
    : winner
      ? `${CUISINES[winner.cuisineId].name} attracts the customer`
      : "The customer walks away";
  const subheading = winner
    ? `${isPlayerWinner ? "Your meal" : "Their meal"} had the highest unique serve value.`
    : "Tied values canceled out, leaving no unique winner.";
  return `
    <div class="overlay reveal-overlay" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <div class="reveal-panel" tabindex="-1" data-dialog-primary>
        <div class="reveal-heading">
          <span class="reveal-kicker">Round ${game.round} · Reveal</span>
          <h2 id="reveal-title">${heading}</h2>
          <p>${subheading}</p>
        </div>
        ${resolutionTrail(classified)}
        <div class="result-comparison result-count-${game.opponents.length + 1}">
          ${resultPanel("player", game.player, game.player.meal, pending.playerResult, "Your meal", statusFor(game.player.id))}
          ${pending.opponentResults.map(({ player, result }, index) =>
            resultPanel("opponent", player, player.meal, result, `Rival ${index + 1}`, statusFor(player.id))).join("")}
        </div>
        ${isPlayerWinner && pending.tipCandidates.length ? `
          <div class="tip-choice">
            <div><span>✦</span><div><strong>Track a Tips Card?</strong><small>Choose one eligible card, or keep it in your discard cycle.</small></div></div>
            <div class="tip-options">
              ${pending.tipCandidates.map((card) => `
                <button class="tip-option ${pending.selectedTipId === card.id ? "is-selected" : ""}" data-action="select-tip" data-card-id="${card.id}">
                  ${escapeHtml(card.name)} ${pending.selectedTipId === card.id ? "✓" : ""}
                </button>`).join("")}
              <button class="tip-option ${pending.selectedTipId === null ? "is-selected" : ""}" data-action="skip-tip">Skip</button>
            </div>
            <p class="tip-impact">${pending.selectedTipId
              ? `Tracking this card moves you to <b>${game.player.tips.length + 1}/4 Tips</b>. Attracted customers with Tips Value ${game.player.tips.length + 1} or less now score their bonus.${game.player.tips.length + 1 === 4 ? " This ends the game." : ""}`
              : `Skipping leaves you at <b>${game.player.tips.length}/4 Tips</b>. The eligible card returns to your discard cycle.`}</p>
          </div>` : ""}
        <button class="primary-button continue-button" data-action="continue-round">
          ${game.customerDeck.length === 0 ? "See final scores" : "Continue to next customer"} <span>→</span>
        </button>
      </div>
    </div>
  `;
}

function gameOverOverlay() {
  const standings = [game.player, ...game.opponents]
    .map((player, index) => ({ player, index, score: scorePlayer(player) }))
    .sort((a, b) => b.score - a.score);
  const topScore = standings[0].score;
  const leaders = standings.filter((entry) => entry.score === topScore);
  const playerWon = leaders.length === 1 && leaders[0].player.id === game.player.id;
  const playerTied = leaders.length > 1 && leaders.some((entry) => entry.player.id === game.player.id);
  return `
    <div class="overlay end-overlay" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div class="end-panel">
        <span class="end-ornament">✦</span>
        <span class="eyebrow">The court is closed</span>
        <h2 id="end-title">${playerWon ? "You rule the food court" : playerTied ? "A delicious draw" : "A rival takes the crown"}</h2>
        <p>${playerWon ? "Your customers leave happy—and they are already planning their next visit." : playerTied ? "The top restaurants finish with the same score." : "A close service. Sharpen the menu and open again tomorrow."}</p>
        <div class="final-score final-count-${standings.length}">
          ${standings.map(({ player, index, score }) => `
            <div class="${score === topScore ? "winner" : ""}">
              <small>${player.id === game.player.id ? "You" : `Rival ${index}`}</small>
              <button
                type="button"
                class="final-score-vp"
                data-action="open-customers"
                data-player-id="${player.id}"
                aria-haspopup="dialog"
                aria-label="View ${player.id === game.player.id ? "your restaurant" : `Rival ${index}`}'s ${player.customers.length} attracted customer${player.customers.length === 1 ? "" : "s"} contributing ${score} victory points"
              >${score}<span>VP</span></button>
              <span>${escapeHtml(CUISINES[player.cuisineId].name)} · ${player.customers.length} customers · ${player.tips.length} tips</span>
            </div>
          `).join("")}
        </div>
        <div class="end-actions">
          <button class="secondary-button" data-action="back-to-lobby">Choose restaurant</button>
          <button class="primary-button" data-action="rematch" data-dialog-primary>Play again <span>↻</span></button>
        </div>
      </div>
    </div>
  `;
}

function rulesModal() {
  return `
    <div class="overlay rules-overlay" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <div class="rules-panel panel-parchment">
        <button class="close-button" data-action="close-rules" aria-label="Close rules">×</button>
        <span class="eyebrow">How to play</span>
        <h2 id="rules-title">Attract customers</h2>
        <p class="rules-lead">Every round, all restaurants secretly build a meal for the same customer.</p>
        <ol class="rules-flow">
          <li><span>1</span><div><strong>Refresh</strong><p>Discard up to one card, then draw up to three without passing your hand limit.</p></div></li>
          <li><span>2</span><div><strong>Build</strong><p>Serve recipes up to the customer's Order Value. Add ingredients, one flavor per recipe, and one drink per meal.</p></div></li>
          <li><span>3</span><div><strong>Reveal</strong><p>Recipes and ingredients add +1, flavors +2, and a valid drink +3. Then abilities and the customer effect apply.</p></div></li>
          <li><span>4</span><div><strong>Attract</strong><p>The highest unique serve value wins. Tied values are ignored until a unique value is found.</p></div></li>
        </ol>
        <div class="rules-values">
          <span class="recipe">♨ Recipe <b>+1</b></span>
          <span class="ingredient">◇ Ingredient <b>+1</b></span>
          <span class="flavor">✦ Flavor <b>+2</b></span>
          <span class="drink">◒ Drink <b>+3</b></span>
        </div>
        <div class="rules-finish"><strong>End Condition</strong><p>Play ends when a restaurant tracks 4 Tips Cards or the customer deck empties. Score each customer's Order Value, plus their Tips Value when you have enough tracked Tips Cards.</p></div>
        <button class="primary-button" data-action="close-rules" data-dialog-primary>Back to the table</button>
      </div>
    </div>
  `;
}

function tutorialVisual(visual) {
  if (visual === "goal") {
    return `<div class="tutorial-goal"><span>♨<small>Your restaurant</small></span><i>competes for</i><span>◎<small>The customer</small></span><i>earns</i><span>★<small>Victory points</small></span></div>`;
  }
  if (visual === "customer") {
    return `<div class="tutorial-values"><span><b>2</b><small>Order<br>max recipes + base VP</small></span><span><b>+2</b><small>Tips<br>conditional bonus VP</small></span></div>`;
  }
  if (visual === "refresh") {
    return `<div class="tutorial-cards"><i>Keep</i><i class="is-marked">Discard</i><span>→ draw up to 3</span></div>`;
  }
  if (visual === "formula") {
    return `<div class="tutorial-formula"><span class="recipe">♨ <b>+1</b></span><i>+</i><span class="ingredient">◇ <b>+1</b></span><i>+</i><span class="flavor">✦ <b>+2</b></span><i>+</i><span class="drink">◒ <b>+3</b></span></div>`;
  }
  if (visual === "build") {
    return `<div class="tutorial-build"><span class="recipe">♨<small>1. Recipe</small></span><i>→</i><span class="dish">◎<small>2. Select dish</small></span><i>→</i><span class="extras">◇ ✦<small>3. Add extras</small></span></div>`;
  }
  if (visual === "counts") {
    return `<div class="tutorial-counts"><span class="played-count"><b>4</b><small>cards played</small></span><i>face down</i><span><b>2</b><small>cards in hand</small></span></div>`;
  }
  if (visual === "tips") {
    return `<div class="tutorial-tips"><span><b>◎ 2 VP</b><small>Order Value</small></span><i>+</i><span><b>◆ +2 VP</b><small>with 2+ tracked Tips</small></span><i>→</i><span class="tips-end"><b>4 ◆</b><small>ends the game</small></span></div>`;
  }
  return `<div class="tutorial-contest"><span class="is-tied">7 <small>tied</small></span><b>=</b><span class="is-tied">7 <small>tied</small></span><i>cancel</i><span class="is-winner">5 <small>wins</small></span></div>`;
}

function tutorialModal() {
  const step = TUTORIAL_STEPS[ui.tutorialStep];
  const isLast = ui.tutorialStep === TUTORIAL_STEPS.length - 1;
  return `
    <div class="overlay tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <section class="tutorial-panel panel-parchment">
        <button class="close-button" data-action="close-tutorial" aria-label="Close guided tour">×</button>
        <div class="tutorial-progress" aria-label="Tutorial step ${ui.tutorialStep + 1} of ${TUTORIAL_STEPS.length}">
          ${TUTORIAL_STEPS.map((_, index) => `<i class="${index <= ui.tutorialStep ? "is-active" : ""}"></i>`).join("")}
          <span>${ui.tutorialStep + 1}/${TUTORIAL_STEPS.length}</span>
        </div>
        <div class="tutorial-symbol" aria-hidden="true">${step.symbol}</div>
        <span class="tutorial-kicker">${escapeHtml(step.kicker)}</span>
        <h2 id="tutorial-title">${escapeHtml(step.title)}</h2>
        <p>${escapeHtml(step.body)}</p>
        ${tutorialVisual(step.visual)}
        <div class="tutorial-note"><span>✦</span>${escapeHtml(step.note)}</div>
        <footer>
          <button class="text-button tutorial-skip" data-action="close-tutorial">Skip tour</button>
          <div>
            ${ui.tutorialStep > 0 ? `<button class="secondary-button" data-action="tutorial-back">Back</button>` : ""}
            <button class="primary-button" data-action="${isLast ? "finish-tutorial" : "tutorial-next"}" data-dialog-primary>
              ${isLast ? "Start cooking" : "Next"} <span>→</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  `;
}

function renderGame() {
  const phaseLabel = game.phase === "refresh" ? "Refresh" : game.phase === "serve" ? "Serve" : "Reveal";
  return `
    <main class="game-shell cuisine-theme-${game.player.cuisineId}">
      <header class="game-header">
        <button class="wordmark" data-action="back-to-lobby" aria-label="Return to restaurant selection"><span>Food</span> Court</button>
        <div class="round-marker"><small>Round ${game.round}</small><strong>${phaseLabel}</strong>${phaseTrail()}</div>
        <div class="scoreboard player-count-${game.opponents.length + 1}">
          ${scorePill(game.player, "player")}
          ${game.opponents.map((opponent, index) => `
            <span class="score-divider">vs</span>
            ${scorePill(opponent, "opponent", index)}
          `).join("")}
        </div>
        <div class="header-tools">
          <button class="icon-button dark" data-action="open-rules" aria-label="Open complete game rules" title="Complete rules">≡</button>
          <button class="icon-button dark tutorial-button" data-action="open-tutorial" aria-label="Open guided tour" title="Guided tour">?</button>
        </div>
      </header>
      ${mobileCustomerSummary(game.activeCustomer)}
      <div class="table-surface">
        ${opponentZone()}
        <section class="center-table">
          <div class="deck-stack" aria-label="${game.customerDeck.length} customers remain">
            <span class="stack-card back-3"></span><span class="stack-card back-2"></span><span class="stack-card back-1"></span>
            <span class="stack-count">${game.customerDeck.length}<small>left</small></span>
          </div>
          ${customerCard(game.activeCustomer)}
          ${phaseAction()}
        </section>
        ${game.phase === "serve" || game.phase === "reveal" ? mealBuilder() : `
          <section class="refresh-board" aria-label="Refresh phase guidance">
            <div class="refresh-emblem">↻</div>
            <div class="refresh-copy"><span class="eyebrow">Before service</span>
            <h2>Tune your hand</h2>
            <p>Keep what works, discard one weak card, and draw toward a meal that fits this customer.</p></div>
            <div class="refresh-hint"><span>✦</span><div><strong>${escapeHtml(CUISINES[game.player.cuisineId].ability)}</strong><small>${escapeHtml(CUISINES[game.player.cuisineId].abilityText)}</small></div></div>
          </section>`}
        ${handSection()}
      </div>
      ${mobileActionBar()}
      ${ui.toast ? `<div class="toast" role="status">${escapeHtml(ui.toast)}</div>` : ""}
      ${game.phase === "reveal" ? revealOverlay() : ""}
      ${game.phase === "ended" && !ui.customersPlayerId ? gameOverOverlay() : ""}
      ${ui.rulesOpen ? rulesModal() : ""}
      ${ui.tipsOpen ? tipsModal() : ""}
      ${ui.tutorialOpen ? tutorialModal() : ""}
      ${ui.customersPlayerId ? customersModal() : ""}
    </main>
  `;
}

function render() {
  app.innerHTML = screen === "lobby" ? renderLobby() : renderGame();
  setupMobileCustomerSummary();
  if (dialogFocusPending) {
    dialogFocusPending = false;
    window.queueMicrotask(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const dialog = dialogs.at(-1);
      (dialog?.querySelector("[data-dialog-primary]") || dialog?.querySelector("button, select"))?.focus();
    });
  }
}

function setupMobileCustomerSummary() {
  customerCardObserver?.disconnect();
  customerCardObserver = null;

  const summary = document.querySelector(".mobile-customer-summary");
  const customer = document.querySelector(".customer-card");
  const header = document.querySelector(".game-header");
  if (!summary || !customer || !header || !window.matchMedia("(max-width: 780px)").matches) return;

  const headerOffset = Math.ceil(header.getBoundingClientRect().height);
  summary.style.setProperty("--mobile-customer-top", `${headerOffset}px`);

  const setVisibility = (visible) => {
    summary.classList.toggle("is-visible", visible);
    summary.setAttribute("aria-hidden", String(!visible));
  };
  const customerBounds = customer.getBoundingClientRect();
  setVisibility(customerBounds.bottom <= headerOffset);

  if (!("IntersectionObserver" in window)) return;
  customerCardObserver = new IntersectionObserver(([entry]) => {
    setVisibility(!entry.isIntersecting && entry.boundingClientRect.top < headerOffset);
  }, {
    rootMargin: `-${headerOffset}px 0px 0px 0px`,
    threshold: 0,
  });
  customerCardObserver.observe(customer);
}

function updateTutorialStep() {
  const currentPanel = document.querySelector(".tutorial-overlay .tutorial-panel");
  if (!currentPanel) {
    render();
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = tutorialModal();
  const nextPanel = template.content.querySelector(".tutorial-panel");
  currentPanel.replaceChildren(...nextPanel.childNodes);
  currentPanel.querySelector("[data-dialog-primary]")?.focus({ preventScroll: true });
}

function openTutorial() {
  focusReturnAction = "open-tutorial";
  ui.tutorialStep = 0;
  ui.tutorialOpen = true;
  dialogFocusPending = true;
  render();
}

function closeTutorial() {
  rememberTutorial();
  ui.tutorialOpen = false;
  render();
  window.queueMicrotask(() => {
    if (focusReturnAction) document.querySelector(`[data-action="${focusReturnAction}"]`)?.focus();
  });
}

function startGame() {
  reconcileOpponentDecks();
  game = createGame(selectedCuisineId, selectedOpponentCuisineIds);
  screen = "game";
  ui.discardIds.clear();
  ui.selectedDish = 0;
  ui.pending = null;
  ui.tipsOpen = false;
  ui.customersPlayerId = null;
  clearUndo();
  if (!tutorialWasSeen()) {
    ui.tutorialOpen = true;
    ui.tutorialStep = 0;
    dialogFocusPending = true;
  }
  announce(
    `Game started. You are playing ${CUISINES[selectedCuisineId].name} against `
      + `${selectedOpponentCuisineIds.length} rival restaurant${selectedOpponentCuisineIds.length === 1 ? "" : "s"}.`,
  );
  render();
  window.queueMicrotask(() => window.scrollTo({ top: 0, left: 0 }));
}

function refreshOpponents() {
  game.opponents.forEach((opponent) => {
    const recipes = opponent.hand.filter((card) => card.type === "recipe");
    let discardIds = [];
    if (recipes.length === 0) {
      const expendable = opponent.hand.find((card) => card.type === "drink") || opponent.hand[0];
      if (expendable) discardIds = [expendable.id];
    }
    refreshPlayer(opponent, game.activeCustomer, discardIds);
  });
}

function prepareOpponentMeals() {
  game.opponents.forEach((opponent) => {
    const rivals = [game.player, ...game.opponents.filter((other) => other.id !== opponent.id)];
    opponent.meal = chooseAiMeal(opponent, rivals, game.activeCustomer);
    moveMealFromHand(opponent, opponent.meal);
  });
}

function finishRefresh(mulligan = false) {
  refreshPlayer(game.player, game.activeCustomer, [...ui.discardIds], mulligan);
  refreshOpponents();
  prepareOpponentMeals();
  ui.discardIds.clear();
  clearUndo();
  game.phase = "serve";
  announce("Refresh complete. Build your meal.");
  render();
}

function playCard(cardId) {
  if (game.phase !== "serve") return;
  const cardIndex = game.player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex < 0) return;
  const card = game.player.hand[cardIndex];
  const meal = game.player.meal;
  const playability = cardPlayability(card, meal, game.player.cuisineId, game.activeCustomer.order, ui.selectedDish);
  if (!playability.playable) {
    showToast(playability.reason);
    return;
  }

  if (card.type === "recipe") {
    if (meal.dishes.length >= game.activeCustomer.order) {
      showToast(`This customer orders at most ${game.activeCustomer.order} dish${game.activeCustomer.order === 1 ? "" : "es"}.`);
      return;
    }
    pushUndo(`playing ${card.name}`);
    game.player.hand.splice(cardIndex, 1);
    meal.dishes.push({ recipe: card, ingredients: [], flavor: null });
    ui.selectedDish = meal.dishes.length - 1;
  } else if (card.type === "ingredient") {
    if (!meal.dishes.length) {
      showToast("Choose a recipe before adding ingredients.");
      return;
    }
    let target = ui.selectedDish;
    if (!canAttachIngredient(meal, target, card, game.player.cuisineId)) {
      target = meal.dishes.findIndex((_, index) => canAttachIngredient(meal, index, card, game.player.cuisineId));
    }
    if (target < 0) {
      showToast("No served recipe has room for this ingredient.");
      return;
    }
    pushUndo(`adding ${card.name}`);
    game.player.hand.splice(cardIndex, 1);
    meal.dishes[target].ingredients.push(card);
    ui.selectedDish = target;
  } else if (card.type === "flavor") {
    if (!meal.dishes.length) {
      showToast("Choose a recipe before adding flavor.");
      return;
    }
    let target = ui.selectedDish;
    if (meal.dishes[target]?.flavor) target = meal.dishes.findIndex((dish) => !dish.flavor);
    if (target < 0) {
      showToast("Each recipe can take only one flavor card.");
      return;
    }
    pushUndo(`adding ${card.name}`);
    game.player.hand.splice(cardIndex, 1);
    meal.dishes[target].flavor = card;
    ui.selectedDish = target;
  } else if (card.type === "drink") {
    if (!meal.dishes.length) {
      showToast("Serve at least one recipe before adding a drink.");
      return;
    }
    if (meal.drink) {
      showToast("A meal can include only one drink.");
      return;
    }
    pushUndo(`adding ${card.name}`);
    game.player.hand.splice(cardIndex, 1);
    meal.drink = card;
  }
  render();
}

function removeMealCard(cardId) {
  const meal = game.player.meal;
  if (meal.drink?.id === cardId) {
    pushUndo(`removing ${meal.drink.name}`);
    game.player.hand.push(meal.drink);
    meal.drink = null;
    render();
    return;
  }
  const dishIndex = meal.dishes.findIndex((dish) => dish.recipe.id === cardId);
  if (dishIndex >= 0) {
    pushUndo(`removing ${meal.dishes[dishIndex].recipe.name}`);
    const [dish] = meal.dishes.splice(dishIndex, 1);
    game.player.hand.push(dish.recipe, ...dish.ingredients, ...(dish.flavor ? [dish.flavor] : []));
    ui.selectedDish = Math.max(0, Math.min(ui.selectedDish, meal.dishes.length - 1));
    render();
    return;
  }
  for (const dish of meal.dishes) {
    const ingredientIndex = dish.ingredients.findIndex((card) => card.id === cardId);
    if (ingredientIndex >= 0) {
      pushUndo(`removing ${dish.ingredients[ingredientIndex].name}`);
      game.player.hand.push(dish.ingredients.splice(ingredientIndex, 1)[0]);
      render();
      return;
    }
    if (dish.flavor?.id === cardId) {
      pushUndo(`removing ${dish.flavor.name}`);
      game.player.hand.push(dish.flavor);
      dish.flavor = null;
      render();
      return;
    }
  }
}

function resolveRound(pass = false) {
  if (game.phase !== "serve") return;
  if (pass) {
    flattenMeal(game.player.meal).forEach((card) => game.player.hand.push(card));
    game.player.meal = emptyMeal();
  }
  const aiMeals = game.opponents.map((opponent) => opponent.meal);

  const playerResult = calculateMeal(
    game.player.meal,
    game.player.cuisineId,
    game.activeCustomer,
    game.player,
    game.opponents,
  );
  const opponentResults = game.opponents.map((opponent, index) => ({
    player: opponent,
    result: calculateMeal(
      aiMeals[index],
      opponent.cuisineId,
      game.activeCustomer,
      opponent,
      [game.player, ...game.opponents.filter((other) => other.id !== opponent.id)],
    ),
  }));
  const winnerId = determineUniqueWinner([
    { id: game.player.id, value: playerResult.total, competing: game.player.meal.dishes.length > 0 },
    ...opponentResults.map(({ player, result }, index) => ({
      id: player.id,
      value: result.total,
      competing: aiMeals[index].dishes.length > 0,
    })),
  ]);

  const winner = [game.player, ...game.opponents].find((player) => player.id === winnerId);
  if (winner) winner.customers.push(game.activeCustomer);

  const playerTips = winnerId === game.player.id
    ? tipCandidates(game.player.meal, game.player.cuisineId, game.player.tips)
    : [];
  const opponentTips = game.opponents.map((opponent, index) =>
    winnerId === opponent.id
      ? tipCandidates(aiMeals[index], opponent.cuisineId, opponent.tips)[0] ?? null
      : null);
  ui.pending = {
    winnerId,
    playerResult,
    opponentResults,
    tipCandidates: playerTips,
    selectedTipId: playerTips[0]?.id ?? null,
    opponentTips,
  };
  clearUndo();
  game.phase = "reveal";
  dialogFocusPending = true;
  announce(winnerId === game.player.id ? "You attracted the customer." : winner ? `${CUISINES[winner.cuisineId].name} attracted the customer.` : "Tied values canceled out.");
  render();
}

function continueRound() {
  const playerTip = ui.pending.tipCandidates.find((card) => card.id === ui.pending.selectedTipId) || null;
  cleanupMeal(game.player, game.player.meal, playerTip);
  game.opponents.forEach((opponent, index) =>
    cleanupMeal(opponent, opponent.meal, ui.pending.opponentTips[index]));

  game.history.push({
    round: game.round,
    customer: game.activeCustomer,
    winnerId: ui.pending.winnerId,
    playerValue: ui.pending.playerResult.total,
    opponentValues: ui.pending.opponentResults.map(({ result }) => result.total),
  });

  const gameEnded = [game.player, ...game.opponents].some((player) => player.tips.length >= 4)
    || game.customerDeck.length === 0;
  ui.pending = null;
  clearUndo();
  if (gameEnded) {
    game.phase = "ended";
    dialogFocusPending = true;
    announce(`Game over. You scored ${scorePlayer(game.player)} points.`);
  } else {
    game.round += 1;
    game.activeCustomer = game.customerDeck.pop();
    game.phase = "refresh";
    ui.discardIds.clear();
    ui.selectedDish = 0;
    announce(`Round ${game.round}. A new customer is ordering.`);
  }
  render();
  window.queueMicrotask(() => window.scrollTo({ top: 0, left: 0 }));
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "select-cuisine") {
    selectedCuisineId = target.dataset.cuisine;
    reconcileOpponentDecks();
    render();
  } else if (action === "set-opponent-count") {
    opponentCount = Number(target.dataset.count);
    reconcileOpponentDecks();
    render();
  } else if (action === "start-game") {
    startGame();
  } else if (action === "open-rules") {
    focusReturnAction = "open-rules";
    ui.rulesOpen = true;
    dialogFocusPending = true;
    render();
  } else if (action === "open-tips") {
    focusReturnAction = "open-tips";
    ui.tipsOpen = true;
    dialogFocusPending = true;
    render();
  } else if (action === "open-customers") {
    const player = restaurantPlayers().find((candidate) => candidate.id === target.dataset.playerId);
    if (!player) return;
    ui.customersPlayerId = player.id;
    dialogFocusPending = true;
    announce(`${restaurantLabel(player)} has ${player.customers.length} attracted customer${player.customers.length === 1 ? "" : "s"} worth ${scorePlayer(player)} points.`);
    render();
  } else if (action === "close-customers") {
    closeCustomers();
  } else if (action === "close-tips") {
    ui.tipsOpen = false;
    render();
    window.queueMicrotask(() => document.querySelector('[data-action="open-tips"]')?.focus());
  } else if (action === "close-rules") {
    ui.rulesOpen = false;
    render();
    window.queueMicrotask(() => document.querySelector('[data-action="open-rules"]')?.focus());
  } else if (action === "open-tutorial") {
    openTutorial();
  } else if (action === "close-tutorial" || action === "finish-tutorial") {
    closeTutorial();
  } else if (action === "tutorial-next") {
    ui.tutorialStep = Math.min(TUTORIAL_STEPS.length - 1, ui.tutorialStep + 1);
    updateTutorialStep();
    announce(`Guided tour step ${ui.tutorialStep + 1} of ${TUTORIAL_STEPS.length}.`);
  } else if (action === "tutorial-back") {
    ui.tutorialStep = Math.max(0, ui.tutorialStep - 1);
    updateTutorialStep();
    announce(`Guided tour step ${ui.tutorialStep + 1} of ${TUTORIAL_STEPS.length}.`);
  } else if (action === "back-to-lobby") {
    screen = "lobby";
    game = null;
    ui.pending = null;
    ui.rulesOpen = false;
    ui.tipsOpen = false;
    ui.customersPlayerId = null;
    clearUndo();
    render();
    window.queueMicrotask(() => window.scrollTo({ top: 0, left: 0 }));
  } else if (action === "rematch") {
    startGame();
  } else if (action === "toggle-discard") {
    const cardId = target.dataset.cardId;
    const card = game.player.hand.find((item) => item.id === cardId);
    pushUndo(`${ui.discardIds.has(cardId) ? "keeping" : "marking"} ${card?.name || "a card"}`);
    if (ui.discardIds.has(cardId)) ui.discardIds.delete(cardId);
    else {
      ui.discardIds.clear();
      ui.discardIds.add(cardId);
    }
    render();
  } else if (action === "finish-refresh") {
    finishRefresh(false);
  } else if (action === "mulligan") {
    finishRefresh(true);
  } else if (action === "undo-last") {
    undoLastAction();
  } else if (action === "play-card") {
    playCard(target.dataset.cardId);
  } else if (action === "select-dish") {
    ui.selectedDish = Number(target.dataset.dishIndex);
    render();
  } else if (action === "remove-meal-card") {
    event.stopPropagation();
    removeMealCard(target.dataset.cardId);
  } else if (action === "serve-meal") {
    resolveRound(target.dataset.pass === "true");
  } else if (action === "select-tip") {
    ui.pending.selectedTipId = target.dataset.cardId;
    render();
  } else if (action === "skip-tip") {
    ui.pending.selectedTipId = null;
    render();
  } else if (action === "continue-round") {
    continueRound();
  }
});

app.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-opponent-index]");
  if (!select) return;
  selectedOpponentCuisineIds[Number(select.dataset.opponentIndex)] = select.value;
  reconcileOpponentDecks();
  render();
});

document.addEventListener("keydown", (event) => {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const activeDialog = dialogs.at(-1);
  if (event.key === "Tab" && activeDialog) {
    const focusable = [...activeDialog.querySelectorAll('button:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  } else if (event.key === "Escape" && ui.customersPlayerId) {
    closeCustomers();
  } else if (event.key === "Escape" && ui.tutorialOpen) {
    closeTutorial();
  } else if (event.key === "Escape" && ui.tipsOpen) {
    ui.tipsOpen = false;
    render();
    window.queueMicrotask(() => document.querySelector('[data-action="open-tips"]')?.focus());
  } else if (event.key === "Escape" && ui.rulesOpen) {
    ui.rulesOpen = false;
    render();
  } else if ((event.key === "Enter" || event.key === " ") && event.target.matches('[data-action="select-dish"]')) {
    event.preventDefault();
    ui.selectedDish = Number(event.target.dataset.dishIndex);
    render();
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(responsiveLayoutTimer);
  responsiveLayoutTimer = window.setTimeout(setupMobileCustomerSummary, 120);
});

render();
