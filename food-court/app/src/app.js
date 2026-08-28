import { CUISINES, CUISINE_LIST, TYPE_META } from "./data.js";
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
  drawForRefresh,
  emptyMeal,
  flattenMeal,
  handLimit,
  moveMealFromHand,
  replaceForRefresh,
  scoreCustomer,
  scorePlayer,
  tipCandidates,
} from "./game.js";
import {
  connectToRoom,
  createRoom,
  forgetRoomToken,
  joinRoom,
  leaveRoom,
  loadRoom,
  roomIdFromUrl,
  serializeMeal,
  shareableRoomUrl,
  storedRoomToken,
  storeRoomToken,
} from "./multiplayer.js";

const app = document.querySelector("#app");
const announcer = document.querySelector("#announcer");

let screen = "lobby";
let selectedCuisineId = "italy";
let opponentCount = 1;
let selectedOpponentCuisineIds = ["france"];
let game = null;
let playMode = roomIdFromUrl() ? "online" : "solo";
let playerName = "Guest chef";
let onlineHumanCount = 2;
let onlineAiCount = 0;
let selectedOnlineAiCuisineIds = [];
let toastTimer = null;
let dialogFocusPending = false;
let focusReturnAction = null;
let customerCardObserver = null;
let responsiveLayoutTimer = null;
const online = {
  roomId: roomIdFromUrl(),
  token: null,
  room: null,
  connection: null,
  connectionStatus: "disconnected",
  busy: false,
  error: "",
  pendingAction: null,
};
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
    body: "First, draw up to three cards without passing your hand limit. Then you may replace up to two cards from your hand by discarding them and drawing the same number of new cards.",
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

function isOnlineGame() {
  return Boolean(game?.multiplayer && online.roomId);
}

function onlineActionLocked() {
  return isOnlineGame() && (game.multiplayer.submitted || online.pendingAction === game.phase);
}

function rememberPlayerName() {
  try {
    window.localStorage.setItem("food-court-player-name", playerName);
  } catch {
    // The name is still retained for the current page.
  }
}

function restorePlayerName() {
  try {
    playerName = window.localStorage.getItem("food-court-player-name") || playerName;
  } catch {
    // Use the default guest name when storage is unavailable.
  }
}

function setRoomUrl(roomId = null) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  window.history.replaceState({}, "", url);
}

function sendRoomAction(action) {
  try {
    if (!online.connection) throw new Error("The table is not connected yet.");
    online.connection.send(action);
  } catch (error) {
    online.pendingAction = null;
    showToast(error.message || "The table is reconnecting.");
  }
}

function applyOnlineRoomState(roomState) {
  const previousPhase = game?.phase;
  const previousRound = game?.round;
  const previousGame = game;
  online.room = roomState;
  online.error = "";

  const currentSeat = roomState.players.find((player) => player.id === roomState.you);
  if (currentSeat) {
    selectedCuisineId = currentSeat.cuisineId;
    playerName = currentSeat.name;
  }

  if (roomState.game) {
    const nextGame = roomState.game;
    const preserveServeDraft = previousGame?.multiplayer
      && previousGame.round === nextGame.round
      && previousGame.phase === "serve"
      && nextGame.phase === "serve"
      && !previousGame.multiplayer.submitted
      && !nextGame.multiplayer.submitted;
    if (preserveServeDraft) {
      nextGame.player.hand = previousGame.player.hand;
      nextGame.player.meal = previousGame.player.meal;
    }
    game = nextGame;
    if (game.multiplayer.submitted || previousPhase !== game.phase || previousRound !== game.round) {
      online.pendingAction = null;
    }
    ui.pending = nextGame.pending;
    screen = "game";
    if (previousPhase !== game.phase || previousRound !== game.round) {
      ui.discardIds.clear();
      ui.selectedDish = 0;
      clearUndo();
    }
  } else {
    game = null;
    ui.pending = null;
    screen = "lobby";
  }
  render();
}

function connectOnlineSession(session) {
  online.connection?.close();
  online.roomId = session.roomId;
  online.token = session.token;
  online.busy = false;
  online.error = "";
  playMode = "online";
  storeRoomToken(session.roomId, session.token);
  setRoomUrl(session.roomId);
  online.connection = connectToRoom(session.roomId, session.token, {
    onState: applyOnlineRoomState,
    onError: (error) => {
      online.pendingAction = null;
      online.error = error.message;
      showToast(error.message);
    },
    onStatus: (status) => {
      online.connectionStatus = status;
      render();
    },
  });
  render();
}

async function createOnlineRoom() {
  online.busy = true;
  online.error = "";
  rememberPlayerName();
  render();
  try {
    connectOnlineSession(await createRoom({
      name: playerName,
      cuisineId: selectedCuisineId,
      maxPlayers: onlineHumanCount + onlineAiCount,
      aiCuisineIds: selectedOnlineAiCuisineIds,
    }));
  } catch (error) {
    online.busy = false;
    online.error = error.message;
    render();
  }
}

async function joinOnlineRoom() {
  if (!online.roomId) return;
  online.busy = true;
  online.error = "";
  rememberPlayerName();
  render();
  try {
    connectOnlineSession(await joinRoom(online.roomId, {
      name: playerName,
      cuisineId: selectedCuisineId,
    }));
  } catch (error) {
    online.busy = false;
    online.error = error.message;
    render();
  }
}

async function initializeOnlineRoom() {
  if (!online.roomId) return;
  online.busy = true;
  render();
  const token = storedRoomToken(online.roomId);
  if (token) {
    try {
      connectOnlineSession(await joinRoom(online.roomId, { token }));
      return;
    } catch (error) {
      if (error.code === "INVALID_SESSION") forgetRoomToken(online.roomId);
      else if (error.code !== "GAME_STARTED") online.error = error.message;
    }
  }
  try {
    const { room } = await loadRoom(online.roomId);
    online.room = room;
    const availableCuisine = CUISINE_LIST.find((cuisine) =>
      !room.players.some((player) => player.cuisineId === cuisine.id));
    if (availableCuisine) selectedCuisineId = availableCuisine.id;
  } catch (error) {
    online.error = error.message;
  } finally {
    online.busy = false;
    render();
  }
}

async function leaveOnlineTable() {
  const roomId = online.roomId;
  const token = online.token;
  const inProgress = Boolean(online.room?.game);
  if (inProgress && !window.confirm("Leave this game? You can return with the same invite URL on this device.")) {
    return;
  }
  if (!inProgress && roomId && token) {
    try {
      await leaveRoom(roomId, token);
      forgetRoomToken(roomId);
    } catch (error) {
      showToast(error.message);
      return;
    }
  }
  online.connection?.close();
  online.connection = null;
  online.roomId = null;
  online.token = null;
  online.room = null;
  online.error = "";
  online.busy = false;
  online.connectionStatus = "disconnected";
  online.pendingAction = null;
  game = null;
  screen = "lobby";
  playMode = "solo";
  setRoomUrl();
  clearUndo();
  render();
}

async function copyInviteLink() {
  const invite = shareableRoomUrl(online.roomId);
  try {
    await navigator.clipboard.writeText(invite);
    showToast("Invite link copied.");
  } catch {
    window.prompt("Copy this invite link", invite);
  }
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
  if (onlineActionLocked()) return;
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
  const currentPlayerId = online.room?.you || null;
  const takenOnline = playMode === "online" && online.room?.players.some((player) =>
    player.id !== currentPlayerId && player.cuisineId === cuisine.id);
  return `
    <button
      class="cuisine-option ${selected ? "is-selected" : ""} ${takenOnline ? "is-unavailable" : ""}"
      style="--cuisine: ${cuisine.accent}"
      data-action="select-cuisine"
      data-cuisine="${cuisine.id}"
      aria-pressed="${selected}"
      ${takenOnline ? "disabled" : ""}
    >
      <span class="cuisine-seal restaurant-flag" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
      <span class="cuisine-copy">
        <span class="cuisine-flag">${cuisine.flag}</span>
        <strong>${escapeHtml(cuisine.name)}</strong>
        <small>${escapeHtml(cuisine.region)}</small>
      </span>
      <span class="cuisine-ability">${escapeHtml(cuisine.ability)}</span>
      <span class="cuisine-check">${takenOnline ? "Taken" : "✓"}</span>
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

function reconcileOnlineAiDecks() {
  const available = CUISINE_LIST.map((cuisine) => cuisine.id)
    .filter((id) => id !== selectedCuisineId);
  const next = [];
  for (let index = 0; index < onlineAiCount; index += 1) {
    const preferred = selectedOnlineAiCuisineIds[index];
    const selection = available.includes(preferred) && !next.includes(preferred)
      ? preferred
      : available.find((id) => !next.includes(id));
    next.push(selection);
  }
  selectedOnlineAiCuisineIds = next;
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

function onlineTableSetup() {
  const minimumAiCount = onlineHumanCount === 1 ? 1 : 0;
  const maximumAiCount = 4 - onlineHumanCount;
  const aiCounts = Array.from(
    { length: maximumAiCount - minimumAiCount + 1 },
    (_, index) => minimumAiCount + index,
  );
  return `
    <div class="match-setup online-table-setup">
      <div class="opponent-count-row">
        <div><span class="step-label"><b>2</b> Set the table</span><strong>People, including you</strong></div>
        <div class="count-toggle" aria-label="Number of human players">
          ${[1, 2, 3, 4].map((count) => `
            <button data-action="set-online-human-count" data-count="${count}" class="${onlineHumanCount === count ? "is-selected" : ""}" aria-pressed="${onlineHumanCount === count}">${count}</button>
          `).join("")}
        </div>
      </div>
      <div class="opponent-count-row">
        <div><span class="eyebrow">Fill open seats</span><strong>AI rivals</strong></div>
        <div class="count-toggle" aria-label="Number of AI rivals">
          ${aiCounts.map((count) => `
            <button data-action="set-online-ai-count" data-count="${count}" class="${onlineAiCount === count ? "is-selected" : ""}" aria-pressed="${onlineAiCount === count}">${count}</button>
          `).join("")}
        </div>
      </div>
      ${selectedOnlineAiCuisineIds.length ? `
        <div class="opponent-selects">
          ${selectedOnlineAiCuisineIds.map((selectedId, index) => `
            <label>
              <span>AI rival ${index + 1}</span>
              <select data-online-ai-index="${index}" aria-label="Restaurant deck for AI rival ${index + 1}">
                ${CUISINE_LIST.filter((cuisine) => cuisine.id !== selectedCuisineId).map((cuisine) => {
                  const chosenElsewhere = selectedOnlineAiCuisineIds.some(
                    (id, rivalIndex) => rivalIndex !== index && id === cuisine.id,
                  );
                  return `<option value="${cuisine.id}" ${cuisine.id === selectedId ? "selected" : ""} ${chosenElsewhere ? "disabled" : ""}>${cuisine.flag} ${escapeHtml(cuisine.name)}</option>`;
                }).join("")}
              </select>
            </label>
          `).join("")}
        </div>
      ` : ""}
      <p class="setup-note">${onlineHumanCount} human seat${onlineHumanCount === 1 ? "" : "s"} and ${onlineAiCount} AI rival${onlineAiCount === 1 ? "" : "s"}. Share the invite link for the other people.</p>
    </div>
  `;
}

function modeSwitcher() {
  if (online.room?.you) return "";
  return `
    <div class="play-mode-switcher" aria-label="Game mode">
      <button data-action="set-play-mode" data-mode="solo" class="${playMode === "solo" ? "is-selected" : ""}" aria-pressed="${playMode === "solo"}">
        <span>Single player</span><small>Play with AI bots</small>
      </button>
      <button data-action="set-play-mode" data-mode="online" class="${playMode === "online" ? "is-selected" : ""}" aria-pressed="${playMode === "online"}">
        <span>Multiplayer table</span><small>Choose people and AI rivals</small>
      </button>
    </div>
  `;
}

function roomConnectionBadge() {
  const labels = {
    connected: "Live",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    failed: "Connection lost",
    disconnected: "Offline",
  };
  return `<span class="room-connection is-${online.connectionStatus}"><i></i>${labels[online.connectionStatus] || "Connecting"}</span>`;
}

function roomPlayerCard(player, index) {
  const cuisine = CUISINES[player.cuisineId];
  const isYou = player.id === online.room.you;
  const isHost = player.id === online.room.hostPlayerId;
  const canManageAi = online.room.isHost && player.isAi;
  const availableCuisines = CUISINE_LIST.filter((candidate) =>
    candidate.id === player.cuisineId
      || !online.room.players.some((seat) => seat.id !== player.id && seat.cuisineId === candidate.id));
  return `
    <article class="room-seat ${isYou ? "is-you" : ""} ${player.connected ? "is-connected" : "is-disconnected"}">
      <span class="room-seat-number">${index + 1}</span>
      <span class="mini-seal restaurant-flag" style="--cuisine:${cuisine.accent}" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
      <div class="room-seat-copy">
        <small>${isYou ? "You" : player.isAi ? "AI rival" : player.connected ? "Joined" : "Reconnecting"}${isHost ? " · Host" : ""}</small>
        <strong>${escapeHtml(player.name)}</strong>
        ${canManageAi ? `
          <select data-ai-player-id="${player.id}" aria-label="Restaurant deck for ${escapeHtml(player.name)}">
            ${availableCuisines.map((candidate) => `<option value="${candidate.id}" ${candidate.id === player.cuisineId ? "selected" : ""}>${candidate.flag} ${escapeHtml(candidate.name)}</option>`).join("")}
          </select>` : `<span>${escapeHtml(cuisine.name)}</span>`}
      </div>
      ${canManageAi ? `<button class="room-seat-remove" data-action="remove-ai" data-player-id="${player.id}" aria-label="Remove ${escapeHtml(player.name)}">×</button>` : ""}
    </article>
  `;
}

function joinedRoomSetup() {
  const room = online.room;
  const isHost = room.isHost;
  const availableCuisine = CUISINE_LIST.find((cuisine) =>
    !room.players.some((player) => player.cuisineId === cuisine.id));
  const enoughPlayers = room.startable ?? room.players.length >= 2;
  return `
    <section class="online-room-panel" aria-label="Private online table">
      <header class="online-room-heading">
        <div><span class="step-label"><b>2</b> Private table</span><strong>Room ${room.id}</strong></div>
        ${roomConnectionBadge()}
      </header>
      <div class="room-invite-row">
        <div><small>Invite link</small><code>${escapeHtml(shareableRoomUrl(room.id))}</code></div>
        <button class="secondary-button" data-action="copy-invite">Copy link</button>
      </div>
      <div class="room-seats">
        ${room.players.map(roomPlayerCard).join("")}
        ${Array.from({ length: room.maxPlayers - room.players.length }, (_, index) => `
          <div class="room-seat is-empty"><span class="room-seat-number">${room.players.length + index + 1}</span><span class="empty-seat-icon">＋</span><div><small>Open seat</small><strong>Share the link to invite a player</strong></div></div>
        `).join("")}
      </div>
      ${isHost ? `
        <div class="room-host-actions">
          <button class="secondary-button" data-action="add-ai" ${availableCuisine && room.players.length < room.maxPlayers ? "" : "disabled"}>＋ Add AI rival</button>
          <button class="primary-button" data-action="start-online-game" ${enoughPlayers && online.connectionStatus === "connected" ? "" : "disabled"}>
            Start game <span>→</span>
          </button>
        </div>
        <p class="setup-note">Human guests can take an AI seat until the game starts. Every restaurant deck must be unique.</p>
      ` : `<div class="room-waiting"><span></span><div><strong>Waiting for the host</strong><small>You can change your restaurant while the table is open.</small></div></div>`}
      <button class="text-button leave-room-button" data-action="leave-room">Leave table</button>
    </section>
  `;
}

function onlineEntrySetup() {
  if (online.busy && !online.room) {
    return `<div class="online-entry-state"><span class="loading-spinner"></span><strong>Opening the private table…</strong></div>`;
  }
  if (online.room?.you) return joinedRoomSetup();

  const joining = Boolean(online.roomId);
  const roomUnavailable = joining && online.room && !online.room.joinable;
  return `
    <section class="online-entry-panel">
      <label class="player-name-field">
        <span>Your display name</span>
        <input data-player-name maxlength="24" value="${escapeHtml(playerName)}" autocomplete="nickname" placeholder="Guest chef" />
      </label>
      ${joining ? "" : onlineTableSetup()}
      ${joining && online.room ? `
        <div class="room-preview">
          <span>Room ${online.room.id}</span>
          <strong>${online.room.players.length} seated player${online.room.players.length === 1 ? "" : "s"}</strong>
          <small>${online.room.players.map((player) => escapeHtml(player.name)).join(" · ")}</small>
        </div>` : ""}
      ${online.error ? `<p class="online-error" role="alert">${escapeHtml(online.error)}</p>` : ""}
      ${roomUnavailable ? `
        <div class="online-entry-state is-error"><strong>${online.room.status === "playing" ? "This game is already in progress." : "This table is full."}</strong><small>Ask the host to open a seat, or create a new table.</small></div>
      ` : `
        <button class="primary-button online-entry-button" data-action="${joining ? "join-room" : "create-room"}" ${online.busy ? "disabled" : ""}>
          ${online.busy ? "Connecting…" : joining ? "Join private table" : "Create private table"} <span>→</span>
        </button>
        <p class="setup-note">No account needed. Your session stays on this device so you can reconnect after a refresh.</p>
      `}
    </section>
  `;
}

function renderLobby() {
  const selected = CUISINES[selectedCuisineId];
  return `
    <main class="lobby-shell cuisine-theme-${selectedCuisineId}">
      <div class="lobby-vignette" aria-hidden="true"></div>
      <section class="lobby-content">
        <div class="brand-lockup">
          <span class="brand-kicker">A competitive cooking card game</span>
          <h1><span>Food</span> Court</h1>
          <p>Cook dishes. Serve meals. Attract customers.</p>
          <div class="game-facts"><span>2–4 restaurants</span><span>Simultaneous turns</span><span>About 15 minutes</span></div>
          <button class="secondary-button how-to-button" data-action="open-tutorial">How to Play</button>
        </div>

        <div class="restaurant-picker panel-parchment">
          <div class="picker-heading">
            <div class="picker-title">
              <span class="step-label"><b>1</b> Choose your restaurant</span>
              <h2>Who is opening tonight?</h2>
            </div>
            <div class="picker-actions">
              <button class="icon-button" data-action="open-rules" aria-label="Open complete game rules">?</button>
            </div>
          </div>
          ${modeSwitcher()}
          <div class="cuisine-grid">
            ${CUISINE_LIST.map(cuisineCard).join("")}
          </div>
          <div class="selected-brief" style="--cuisine: ${selected.accent}">
            <span class="brief-icon">↯</span>
            <div>
              <small>Your signature ability</small>
              <strong>${escapeHtml(selected.ability)}</strong>
              <p>${escapeHtml(selected.abilityText)}</p>
            </div>
          </div>
          ${playMode === "online" ? onlineEntrySetup() : `
            ${opponentSetup()}
            <button class="primary-button lobby-start" data-action="start-game">
              <span>Open for service <b>→</b></span>
              <small>You + ${opponentCount} AI rival${opponentCount === 1 ? "" : "s"}</small>
            </button>
          `}
        </div>
      </section>
      <footer class="lobby-footer">Eight restaurants compete for customers in the food corner of the mall</footer>
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
      <span class="score-name"><small>${side === "player" ? "Your restaurant" : player.isAi ? `AI rival ${index + 1}` : `Rival ${index + 1}`}</small>${escapeHtml(player.name || cuisine.name)}${player.name ? `<em>${escapeHtml(cuisine.name)}</em>` : ""}</span>
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
        const playedCount = opponent.playedCount ?? flattenMeal(opponent.meal).length;
        const hiddenCards = Array.from({ length: Math.min(opponent.hand.length, 4) }, (_, cardIndex) =>
          `<span class="card-back" style="--i:${cardIndex}"><i aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></i></span>`).join("");
        return `
          <article class="opponent-seat">
            <div class="opponent-identity">
              <span class="mini-seal restaurant-flag" style="--cuisine:${cuisine.accent}" aria-hidden="true"><span class="flag-glyph">${cuisine.flag}</span></span>
              <div><small>${opponent.isAi ? `AI rival ${rivalIndex + 1}` : `Rival ${rivalIndex + 1}`}</small><strong>${escapeHtml(opponent.name || cuisine.name)}</strong><span>${escapeHtml(cuisine.name)} · ${escapeHtml(cuisine.ability)}</span></div>
            </div>
            <div class="opponent-hand" aria-label="Rival ${rivalIndex + 1} has ${opponent.hand.length} cards">${hiddenCards}</div>
            <div class="opponent-status" aria-label="Rival ${rivalIndex + 1}: ${playedCount} cards played and ${opponent.hand.length} cards left in hand">
              ${game.phase === "refresh"
                ? `<span><b>${opponent.hand.length}</b> in hand</span><i>${opponent.connected === false ? "disconnected" : game.multiplayer?.readyPlayerIds.includes(opponent.id) ? "ready ✓" : "refreshing…"}</i>`
                : `<span class="played-count"><b>${playedCount}</b> played</span><span><b>${opponent.hand.length}</b> in hand</span><i>${opponent.connected === false ? "disconnected" : game.phase === "reveal" ? "revealed" : game.multiplayer?.readyPlayerIds.includes(opponent.id) ? "served ✓" : "cooking…"}</i>`}
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

function servedAttachmentCard(card, index, total) {
  const meta = TYPE_META[card.type];
  const abilityContext = cardAbilityContext(card);
  const center = (total - 1) / 2;
  const shift = index * 35;
  const tilt = (index - center) * 2.5;
  return `
    <button
      class="served-card served-attachment-card card-${card.type} ${abilityContext ? "has-ability-marker" : ""}"
      style="--card-shift:${shift}px; --card-tilt:${tilt}deg; --card-layer:${index + 1}"
      data-action="remove-meal-card"
      data-card-id="${card.id}"
      aria-label="Return ${escapeHtml(meta.label)} ${escapeHtml(card.name)} to your hand"
    >
      ${abilityMarker(abilityContext)}
      <span class="served-card-corner"><b>${meta.symbol}</b><small>${meta.value}</small></span>
      <span class="served-card-art" aria-hidden="true">${meta.symbol}</span>
      <span class="served-card-type">${meta.label}</span>
      <strong>${escapeHtml(card.name)}</strong>
      <small class="served-card-rule">${escapeHtml(cardDetail(card))}</small>
      <span class="served-card-return" aria-hidden="true">Return ↩</span>
    </button>
  `;
}

function mealDish(dish, index) {
  const selected = ui.selectedDish === index;
  const difficulty = dish.ingredients.length === 0 ? "Easy" : dish.ingredients.length === 1 ? "Normal" : "Hard";
  const recipeAbilityContext = cardAbilityContext(dish.recipe);
  const additions = [...dish.ingredients, ...(dish.flavor ? [dish.flavor] : [])];
  return `
    <article
      class="meal-dish ${selected ? "is-selected" : ""}"
      data-action="select-dish"
      data-dish-index="${index}"
      aria-label="Dish ${index + 1}: ${escapeHtml(dish.recipe.name)}${selected ? ", selected as the target for added cards" : ""}"
    >
      <div class="dish-number">Dish ${index + 1} ${selected ? `<b>Selected target</b>` : ""}</div>
      <div class="served-card served-recipe-card card-recipe ${recipeAbilityContext ? "has-ability-marker" : ""}">
        ${abilityMarker(recipeAbilityContext)}
        <button class="remove-card" data-action="remove-meal-card" data-card-id="${dish.recipe.id}" aria-label="Return ${escapeHtml(dish.recipe.name)} to hand">×</button>
        <span class="served-card-corner"><b>♨</b><small>+1</small></span>
        <span class="served-card-art" aria-hidden="true">♨</span>
        <span class="served-card-type">Recipe Card</span>
        <strong>${escapeHtml(dish.recipe.name)}</strong>
        <small class="served-card-rule">${difficulty} dish · ${escapeHtml(cardDetail(dish.recipe))}</small>
        <div class="dish-capacity">${ingredientSlots(dish)}</div>
        <button class="dish-target" data-action="select-dish" data-dish-index="${index}" aria-pressed="${selected}">${selected ? "Adding cards here" : "Target this dish"}</button>
      </div>
      <div class="served-attachments" aria-label="Cards added to ${escapeHtml(dish.recipe.name)}">
        ${additions.length
          ? additions.map((card, cardIndex) => servedAttachmentCard(card, cardIndex, additions.length)).join("")
          : `<span class="empty-addition-card"><b>＋</b><small>Add Ingredient<br>or Flavor</small></span>`}
      </div>
    </article>
  `;
}

function servedDrinkCard(meal, validDrink) {
  if (!meal.drink) {
    return `
      <div class="drink-card-wrap">
        <div class="dish-number">Optional</div>
        <div class="served-card empty-drink-card card-drink" aria-label="Empty Drink Card slot">
          <span class="served-card-corner"><b>◒</b><small>+3</small></span>
          <span class="served-card-art" aria-hidden="true">＋</span>
          <span class="served-card-type">Drink Card</span>
          <strong>Add one drink</strong>
          <small class="served-card-rule">Its printed condition must be met to score.</small>
        </div>
      </div>
    `;
  }
  const abilityContext = cardAbilityContext(meal.drink);
  return `
    <div class="drink-card-wrap ${validDrink ? "is-valid" : "is-invalid"}">
      <div class="dish-number">Drink ${validDrink ? `<b>Condition met</b>` : `<b>Not scoring</b>`}</div>
      <button
        class="served-card served-drink-card card-drink ${abilityContext ? "has-ability-marker" : ""}"
        data-action="remove-meal-card"
        data-card-id="${meal.drink.id}"
        aria-label="${escapeHtml(meal.drink.name)}. ${validDrink ? "Condition met, worth 3 Serve Value." : "Condition not met, worth 0 Serve Value."} Return this card to your hand."
      >
        ${abilityMarker(abilityContext)}
        <span class="served-card-corner"><b>◒</b><small>${validDrink ? "+3" : "+0"}</small></span>
        <span class="drink-status" aria-hidden="true">${validDrink ? "✓" : "!"}</span>
        <span class="served-card-art" aria-hidden="true">◒</span>
        <span class="served-card-type">Drink Card</span>
        <strong>${escapeHtml(meal.drink.name)}</strong>
        <small class="served-card-rule">${escapeHtml(meal.drink.condition)}</small>
        <span class="served-card-return" aria-hidden="true">Return ↩</span>
      </button>
    </div>
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
        <div class="ability-chip" style="--cuisine:${cuisine.accent}">
          <span>↯</span><div><small>${escapeHtml(cuisine.ability)}</small>${escapeHtml(cuisine.abilityText)}</div>
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
            <span class="served-card-corner"><b>♨</b><small>+1</small></span>
            <span class="empty-slot-art">＋</span>
            <span class="served-card-type">Recipe Card</span>
            <strong>${meal.dishes.length ? "Add another recipe" : "Choose a recipe from your hand"}</strong>
            <small>Up to ${maxRecipes} dish${maxRecipes === 1 ? "" : "es"} for this customer</small>
          </div>` : ""}
        ${servedDrinkCard(meal, preview.validDrink)}
      </div>
    </section>
  `;
}

function disconnectRecoveryControls() {
  if (!isOnlineGame() || !game.multiplayer.isHost) return "";
  const disconnectedPlayers = online.room.players.filter((player) =>
    game.multiplayer.disconnectedPlayerIds.includes(player.id)
      && !game.multiplayer.readyPlayerIds.includes(player.id));
  if (!disconnectedPlayers.length) return "";
  return `
    <div class="disconnect-recovery">
      <small>Disconnected player</small>
      ${disconnectedPlayers.map((player) => `
        <button class="secondary-button" data-action="replace-disconnected" data-player-id="${player.id}">
          Let AI finish for ${escapeHtml(player.name)}
        </button>
      `).join("")}
    </div>
  `;
}

function phaseAction() {
  if (onlineActionLocked()) {
    const waitingFor = game.multiplayer.waitingFor;
    return `
      <aside class="phase-action waiting-action">
        <div><span class="phase-step">✓</span><div><small>Your choice is locked in</small><strong>${game.phase === "refresh" ? "Hand refreshed" : "Meal served face down"}</strong></div></div>
        <p>${waitingFor.length ? `Waiting for ${escapeHtml(waitingFor.join(", "))}.` : "Resolving the table…"}</p>
        <div class="waiting-pulse"><i></i><i></i><i></i><span>Live table sync</span></div>
        ${disconnectRecoveryControls()}
      </aside>
    `;
  }
  if (game.phase === "refresh") {
    const limit = handLimit(game.activeCustomer);
    const french = game.activeCustomer.nationality === "france";
    const drawn = game.player.refreshDrawn || 0;
    return `
      <aside class="phase-action refresh-action">
        <div><span class="phase-step">1</span><div><small>Now · Refresh</small><strong>${ui.discardIds.size ? "Replace the marked cards" : "Keep your hand or choose replacements"}</strong></div></div>
        <p>You drew ${drawn || "no"} card${drawn === 1 ? "" : "s"} first. Now select up to two cards to replace.</p>
        <div class="phase-metrics"><span>Hand <b>${game.player.hand.length}/${limit}</b></span><span>First draw <b>${drawn}/3</b></span><span>Replace <b>${ui.discardIds.size}/2</b></span></div>
        <div class="action-buttons">
          ${undoButton()}
          ${french ? `<button class="secondary-button" data-action="mulligan">Replace whole hand</button>` : ""}
          <button class="primary-button" data-action="finish-refresh">
            ${ui.discardIds.size ? `Replace ${ui.discardIds.size}` : "Keep hand"} <span>→</span>
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
  if (onlineActionLocked()) return "";
  if (game.phase === "refresh") {
    const french = game.activeCustomer.nationality === "france";
    return `
      <nav class="mobile-action-bar" aria-label="Refresh actions">
        ${undoButton()}
        ${french ? `<button class="secondary-button" data-action="mulligan">New hand</button>` : ""}
        <button class="primary-button" data-action="finish-refresh">${ui.discardIds.size ? `Replace ${ui.discardIds.size}` : "Keep hand"} <span>→</span></button>
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
    ? (ui.discardIds.size ? "Marked cards return to normal when you click them again." : "Your first draw is complete. Optionally mark up to two cards to replace.")
    : !game.player.meal.dishes.length
      ? "Choose a gold Recipe Card to create your first dish."
      : `Targeting Dish ${ui.selectedDish + 1}: ${selectedDish?.recipe.name}. Ingredients and Flavors go here.`;
  return `
    <section class="hand-section ${refresh ? "refresh-mode" : ""} ${onlineActionLocked() ? "is-readonly" : ""}">
      <div class="hand-toolbar">
        <div><span class="eyebrow">Your hand</span><strong>${game.player.hand.length} cards</strong></div>
        <div class="hand-legend">
          ${Object.entries(TYPE_META).map(([type, meta]) => `<span class="legend-${type}">${meta.symbol} ${counts[type]}</span>`).join("")}
          <span class="legend-ability" title="Cards marked with ↯ can participate in your restaurant's special ability">↯ ability</span>
        </div>
        ${refresh ? `<span class="discard-counter">${ui.discardIds.size}/2 selected to replace</span>` : ""}
      </div>
      <div class="hand-coach ${refresh ? "" : "serve-coach"}"><span>${refresh ? "↻" : "◎"}</span>${escapeHtml(coach)}</div>
      <div class="hand-cards hand-count-${game.player.hand.length}" role="list" aria-label="Your hand of cards">
        ${game.player.hand.length ? game.player.hand.map((card) => cardMarkup(card, {
          selected: ui.discardIds.has(card.id),
          action: onlineActionLocked() ? "noop" : refresh ? "toggle-discard" : "play-card",
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
          ${resultPanel("player", game.player, game.player.meal, pending.playerResult, `${game.player.name || "Your restaurant"} · your meal`, statusFor(game.player.id))}
          ${pending.opponentResults.map(({ player, result }, index) =>
            resultPanel("opponent", player, player.meal, result, player.name || `Rival ${index + 1}`, statusFor(player.id))).join("")}
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
        <button class="primary-button continue-button" data-action="continue-round" ${onlineActionLocked() ? "disabled" : ""}>
          ${onlineActionLocked()
            ? `Ready · waiting for ${escapeHtml(game.multiplayer.waitingFor.join(", ") || "the table")}`
            : game.customerDeck.length === 0 ? "See final scores" : "Continue to next customer"} <span>→</span>
        </button>
        ${onlineActionLocked() ? disconnectRecoveryControls() : ""}
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
              <small>${player.id === game.player.id ? "You" : player.isAi ? `AI rival ${index}` : escapeHtml(player.name || `Rival ${index}`)}</small>
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
          <button class="secondary-button" data-action="${isOnlineGame() ? "leave-room" : "back-to-lobby"}">${isOnlineGame() ? "Leave table" : "Choose restaurant"}</button>
          ${isOnlineGame() && !game.multiplayer.isHost
            ? `<button class="primary-button" disabled data-dialog-primary>Waiting for host…</button>`
            : `<button class="primary-button" data-action="rematch" data-dialog-primary>Play again <span>↻</span></button>`}
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
          <li><span>1</span><div><strong>Refresh</strong><p>Draw up to three without passing your hand limit, then replace up to two cards.</p></div></li>
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
    return `<div class="tutorial-cards"><i>Draw ≤ 3</i><i class="is-marked">Replace ≤ 2</i><span>in that order</span></div>`;
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
    <main class="game-shell ${isOnlineGame() ? "is-online" : ""} phase-${game.phase} cuisine-theme-${game.player.cuisineId}">
      <header class="game-header">
        <div class="game-header-inner">
          <button class="wordmark" data-action="${isOnlineGame() ? "leave-room" : "back-to-lobby"}" aria-label="${isOnlineGame() ? "Leave online table" : "Return to restaurant selection"}"><span>Food</span> Court</button>
          <div class="round-marker"><small>Round ${game.round}</small><strong>${phaseLabel}</strong>${phaseTrail()}</div>
          <div class="scoreboard player-count-${game.opponents.length + 1}">
            ${scorePill(game.player, "player")}
            ${game.opponents.map((opponent, index) => `
              <span class="score-divider">vs</span>
              ${scorePill(opponent, "opponent", index)}
            `).join("")}
          </div>
          <div class="header-tools">
            ${isOnlineGame() ? `<button class="room-header-link" data-action="copy-invite" title="Copy invite link"><span>${online.roomId}</span>${roomConnectionBadge()}</button>` : ""}
            <button class="icon-button dark" data-action="open-rules" aria-label="Open complete game rules" title="Complete rules">≡</button>
            <button class="icon-button dark tutorial-button" data-action="open-tutorial" aria-label="Open How to Play guided tour" title="How to play">?</button>
          </div>
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
        ${game.phase === "serve" || game.phase === "reveal" ? mealBuilder() : ""}
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
  [game.player, ...game.opponents].forEach((player) =>
    drawForRefresh(player, game.activeCustomer));
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
      discardIds = [...opponent.hand]
        .sort((left, right) => Number(right.type === "drink") - Number(left.type === "drink"))
        .slice(0, 2)
        .map((card) => card.id);
    }
    replaceForRefresh(opponent, game.activeCustomer, discardIds);
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
  if (isOnlineGame()) {
    if (onlineActionLocked()) return;
    online.pendingAction = "refresh";
    sendRoomAction({
      type: "refresh",
      discardIds: [...ui.discardIds],
      mulligan,
    });
    clearUndo();
    render();
    return;
  }
  replaceForRefresh(game.player, game.activeCustomer, [...ui.discardIds], mulligan);
  refreshOpponents();
  prepareOpponentMeals();
  ui.discardIds.clear();
  clearUndo();
  game.phase = "serve";
  announce("Refresh complete. Build your meal.");
  render();
}

function playCard(cardId) {
  if (game.phase !== "serve" || onlineActionLocked()) return;
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
  if (onlineActionLocked()) return;
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
  if (isOnlineGame()) {
    if (onlineActionLocked()) return;
    const meal = pass ? emptyMeal() : game.player.meal;
    online.pendingAction = "serve";
    sendRoomAction({ type: "serve", meal: serializeMeal(meal) });
    clearUndo();
    render();
    return;
  }
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
  if (isOnlineGame()) {
    if (onlineActionLocked()) return;
    online.pendingAction = "reveal";
    sendRoomAction({
      type: "reveal_ack",
      tipCardId: ui.pending?.selectedTipId || null,
    });
    render();
    return;
  }
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
    [game.player, ...game.opponents].forEach((player) =>
      drawForRefresh(player, game.activeCustomer));
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

  if (action === "set-play-mode") {
    playMode = target.dataset.mode;
    online.error = "";
    if (playMode === "solo" && !online.token) {
      online.roomId = null;
      online.room = null;
      setRoomUrl();
    }
    render();
  } else if (action === "select-cuisine") {
    selectedCuisineId = target.dataset.cuisine;
    if (playMode === "online" && online.room?.you) {
      sendRoomAction({ type: "set_cuisine", cuisineId: selectedCuisineId });
    } else {
      reconcileOpponentDecks();
      reconcileOnlineAiDecks();
    }
    render();
  } else if (action === "set-online-human-count") {
    onlineHumanCount = Number(target.dataset.count);
    const minimumAiCount = onlineHumanCount === 1 ? 1 : 0;
    onlineAiCount = Math.max(minimumAiCount, Math.min(onlineAiCount, 4 - onlineHumanCount));
    reconcileOnlineAiDecks();
    render();
  } else if (action === "set-online-ai-count") {
    onlineAiCount = Number(target.dataset.count);
    reconcileOnlineAiDecks();
    render();
  } else if (action === "set-opponent-count") {
    opponentCount = Number(target.dataset.count);
    reconcileOpponentDecks();
    render();
  } else if (action === "start-game") {
    startGame();
  } else if (action === "create-room") {
    void createOnlineRoom();
  } else if (action === "join-room") {
    void joinOnlineRoom();
  } else if (action === "copy-invite") {
    void copyInviteLink();
  } else if (action === "leave-room") {
    void leaveOnlineTable();
  } else if (action === "add-ai") {
    const available = CUISINE_LIST.find((cuisine) =>
      !online.room.players.some((player) => player.cuisineId === cuisine.id));
    if (available) sendRoomAction({ type: "add_ai", cuisineId: available.id });
  } else if (action === "remove-ai") {
    sendRoomAction({ type: "remove_ai", playerId: target.dataset.playerId });
  } else if (action === "start-online-game") {
    sendRoomAction({ type: "start" });
  } else if (action === "replace-disconnected") {
    sendRoomAction({ type: "replace_disconnected", playerId: target.dataset.playerId });
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
    if (isOnlineGame()) sendRoomAction({ type: "rematch" });
    else startGame();
  } else if (action === "toggle-discard") {
    const cardId = target.dataset.cardId;
    const card = game.player.hand.find((item) => item.id === cardId);
    if (!card) return;
    if (!ui.discardIds.has(cardId) && ui.discardIds.size >= 2) {
      showToast("You can replace up to two cards during Refresh.");
      return;
    }
    pushUndo(`${ui.discardIds.has(cardId) ? "keeping" : "marking"} ${card.name}`);
    if (ui.discardIds.has(cardId)) ui.discardIds.delete(cardId);
    else ui.discardIds.add(cardId);
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
  const onlineAiSelect = event.target.closest("select[data-online-ai-index]");
  if (onlineAiSelect) {
    selectedOnlineAiCuisineIds[Number(onlineAiSelect.dataset.onlineAiIndex)] = onlineAiSelect.value;
    reconcileOnlineAiDecks();
    render();
    return;
  }
  const aiSelect = event.target.closest("select[data-ai-player-id]");
  if (aiSelect) {
    sendRoomAction({
      type: "set_ai_cuisine",
      playerId: aiSelect.dataset.aiPlayerId,
      cuisineId: aiSelect.value,
    });
    return;
  }
  const select = event.target.closest("select[data-opponent-index]");
  if (!select) return;
  selectedOpponentCuisineIds[Number(select.dataset.opponentIndex)] = select.value;
  reconcileOpponentDecks();
  render();
});

app.addEventListener("input", (event) => {
  const input = event.target.closest("input[data-player-name]");
  if (!input) return;
  playerName = input.value.slice(0, 24);
});

document.addEventListener("keydown", (event) => {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const activeDialog = dialogs.at(-1);
  if (event.key === "Enter" && event.target.matches("input[data-player-name]")) {
    event.preventDefault();
    if (online.busy || (online.roomId && online.room && !online.room.joinable)) return;
    if (online.roomId) void joinOnlineRoom();
    else void createOnlineRoom();
  } else if (event.key === "Tab" && activeDialog) {
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

restorePlayerName();
render();
void initializeOnlineRoom();
