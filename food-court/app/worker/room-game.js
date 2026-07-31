import { CUISINES } from "../src/data.js";
import {
  buildCustomerDeck,
  calculateMeal,
  canAttachIngredient,
  chooseAiMeal,
  cleanupMeal,
  emptyMeal,
  flattenMeal,
  makePlayer,
  moveMealFromHand,
  refreshPlayer,
  scorePlayer,
  tipCandidates,
} from "../src/game.js";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export class RoomError extends Error {
  constructor(message, status = 400, code = "INVALID_ACTION") {
    super(message);
    this.name = "RoomError";
    this.status = status;
    this.code = code;
  }
}

const unique = (items) => [...new Set(items)];

function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function normalizePlayerName(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ").slice(0, 24);
  return normalized || "Guest chef";
}

export function assertCuisine(cuisineId) {
  if (!CUISINES[cuisineId]) {
    throw new RoomError("Choose a valid restaurant deck.", 400, "INVALID_CUISINE");
  }
  return cuisineId;
}

function assertCuisineAvailable(room, cuisineId, ignoredPlayerId = null) {
  assertCuisine(cuisineId);
  const taken = room.players.some((player) =>
    player.id !== ignoredPlayerId && player.cuisineId === cuisineId);
  if (taken) {
    throw new RoomError(
      "That restaurant is already taken at this table.",
      409,
      "CUISINE_TAKEN",
    );
  }
}

function playerSession(player) {
  return { playerId: player.id, token: player.token };
}

export function createRoomState({
  roomId,
  name,
  cuisineId,
  playerId = randomId("human"),
  token = randomToken(),
  now = Date.now(),
}) {
  assertCuisine(cuisineId);
  const host = {
    id: playerId,
    token,
    name: normalizePlayerName(name),
    cuisineId,
    isAi: false,
  };
  return {
    id: roomId,
    status: "lobby",
    hostPlayerId: host.id,
    players: [host],
    game: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function findPlayerByToken(room, token) {
  if (!token) return null;
  return room.players.find((player) => !player.isAi && player.token === token) || null;
}

export function joinRoomState(room, {
  name,
  cuisineId,
  token,
  playerId = randomId("human"),
  playerToken = randomToken(),
  now = Date.now(),
}) {
  const existing = findPlayerByToken(room, token);
  if (existing) return playerSession(existing);
  if (room.status !== "lobby") {
    throw new RoomError("This game has already started.", 409, "GAME_STARTED");
  }

  assertCuisineAvailable(room, cuisineId);
  if (room.players.length >= MAX_PLAYERS) {
    const replaceableAi = [...room.players].reverse().find((player) => player.isAi);
    if (!replaceableAi) {
      throw new RoomError("This table already has four human players.", 409, "ROOM_FULL");
    }
    room.players = room.players.filter((player) => player.id !== replaceableAi.id);
  }

  const player = {
    id: playerId,
    token: playerToken,
    name: normalizePlayerName(name),
    cuisineId,
    isAi: false,
  };
  room.players.push(player);
  if (!room.hostPlayerId) room.hostPlayerId = player.id;
  room.updatedAt = now;
  return playerSession(player);
}

function publicPlayers(room, connectedPlayerIds = []) {
  const connected = new Set(connectedPlayerIds);
  return room.players.map((player) => ({
    id: player.id,
    name: player.name,
    cuisineId: player.cuisineId,
    isAi: player.isAi,
    connected: player.isAi || connected.has(player.id),
  }));
}

export function roomPreview(room, connectedPlayerIds = []) {
  return {
    id: room.id,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    players: publicPlayers(room, connectedPlayerIds),
    maxPlayers: MAX_PLAYERS,
    joinable: room.status === "lobby" && (
      room.players.length < MAX_PLAYERS || room.players.some((player) => player.isAi)
    ),
  };
}

function makeTableGame(room, random) {
  const players = room.players.map((seat) => {
    const player = makePlayer(seat.cuisineId, seat.name, random);
    player.id = seat.id;
    player.isAi = seat.isAi;
    return player;
  });
  const customerDeck = buildCustomerDeck(players.map((player) => player.cuisineId), random);
  return {
    round: 1,
    phase: "refresh",
    players,
    customerDeck,
    activeCustomer: customerDeck.pop(),
    history: [],
    ready: { refresh: [], serve: [], reveal: [] },
    pending: null,
  };
}

function gamePlayer(room, playerId) {
  return room.game?.players.find((player) => player.id === playerId) || null;
}

function roomSeat(room, playerId) {
  return room.players.find((player) => player.id === playerId) || null;
}

function assertHumanPlayer(room, playerId) {
  const seat = roomSeat(room, playerId);
  if (!seat || seat.isAi) {
    throw new RoomError("This player is not seated at the table.", 403, "NOT_SEATED");
  }
  return seat;
}

function assertHost(room, playerId) {
  assertHumanPlayer(room, playerId);
  if (room.hostPlayerId !== playerId) {
    throw new RoomError("Only the host can change the table.", 403, "HOST_ONLY");
  }
}

function markReady(game, phase, playerId) {
  game.ready[phase] = unique([...game.ready[phase], playerId]);
}

function allReady(game, phase) {
  const ready = new Set(game.ready[phase]);
  return game.players.every((player) => ready.has(player.id));
}

function refreshAiPlayers(room, random) {
  const { game } = room;
  game.players.filter((player) => player.isAi).forEach((player) => {
    if (game.ready.refresh.includes(player.id)) return;
    const recipes = player.hand.filter((card) => card.type === "recipe");
    const expendable = recipes.length === 0
      ? player.hand.find((card) => card.type === "drink") || player.hand[0]
      : null;
    refreshPlayer(player, game.activeCustomer, expendable ? [expendable.id] : [], false, random);
    markReady(game, "refresh", player.id);
  });
}

function prepareAiMeals(room) {
  const { game } = room;
  game.players.filter((player) => player.isAi).forEach((player) => {
    if (game.ready.serve.includes(player.id)) return;
    const opponents = game.players.filter((other) => other.id !== player.id);
    player.meal = chooseAiMeal(player, opponents, game.activeCustomer);
    moveMealFromHand(player, player.meal);
    markReady(game, "serve", player.id);
  });
}

function replacePlayerWithAi(room, hostPlayerId, targetPlayerId, random) {
  assertHost(room, hostPlayerId);
  if (targetPlayerId === room.hostPlayerId) {
    throw new RoomError("The host cannot replace their own seat.", 400, "INVALID_SEAT");
  }
  const seat = roomSeat(room, targetPlayerId);
  const player = gamePlayer(room, targetPlayerId);
  if (!seat || !player || seat.isAi) {
    throw new RoomError("That human seat is not available for AI takeover.", 404, "SEAT_NOT_FOUND");
  }
  seat.isAi = true;
  seat.token = null;
  seat.name = `${seat.name} (AI)`;
  player.isAi = true;
  player.name = seat.name;

  const { game } = room;
  if (game.phase === "refresh") {
    refreshAiPlayers(room, random);
    advanceFromRefresh(room);
  } else if (game.phase === "serve") {
    prepareAiMeals(room);
    if (allReady(game, "serve")) resolveContest(room);
  } else if (game.phase === "reveal" && !game.ready.reveal.includes(player.id)) {
    const candidates = game.pending.tipCandidates[player.id] || [];
    if (game.pending.winnerId === player.id && candidates[0]) {
      game.pending.selectedTips[player.id] = candidates[0].id;
    }
    markReady(game, "reveal", player.id);
    if (allReady(game, "reveal")) completeRound(room, random);
  }
}

export function buildSubmittedMeal(player, selection, orderValue) {
  const handById = new Map(player.hand.map((card) => [card.id, card]));
  const used = new Set();
  const dishes = Array.isArray(selection?.dishes) ? selection.dishes : [];
  if (dishes.length > orderValue) {
    throw new RoomError(
      `This customer accepts at most ${orderValue} dishes.`,
      400,
      "TOO_MANY_DISHES",
    );
  }

  const takeCard = (cardId, type, label) => {
    const card = handById.get(cardId);
    if (!card || card.type !== type || used.has(cardId)) {
      throw new RoomError(`The submitted ${label} is not available in your hand.`, 400, "INVALID_MEAL");
    }
    used.add(cardId);
    return card;
  };

  const meal = emptyMeal();
  dishes.forEach((submittedDish) => {
    const recipe = takeCard(submittedDish?.recipeId, "recipe", "Recipe Card");
    const dish = { recipe, ingredients: [], flavor: null };
    meal.dishes.push(dish);

    const ingredientIds = Array.isArray(submittedDish?.ingredientIds)
      ? submittedDish.ingredientIds
      : [];
    ingredientIds.forEach((ingredientId) => {
      const card = takeCard(ingredientId, "ingredient", "Ingredient Card");
      const dishIndex = meal.dishes.length - 1;
      if (!canAttachIngredient(meal, dishIndex, card, player.cuisineId)) {
        throw new RoomError(
          `${recipe.name} cannot take that many Ingredient Cards.`,
          400,
          "INVALID_MEAL",
        );
      }
      dish.ingredients.push(card);
    });

    if (submittedDish?.flavorId) {
      dish.flavor = takeCard(submittedDish.flavorId, "flavor", "Flavor Card");
    }
  });

  if (selection?.drinkId) {
    if (!meal.dishes.length) {
      throw new RoomError("Serve a Recipe Card before adding a Drink Card.", 400, "INVALID_MEAL");
    }
    meal.drink = takeCard(selection.drinkId, "drink", "Drink Card");
  }

  return meal;
}

function resolveContest(room) {
  const { game } = room;
  const results = Object.fromEntries(game.players.map((player) => {
    const opponents = game.players.filter((other) => other.id !== player.id);
    return [player.id, calculateMeal(
      player.meal,
      player.cuisineId,
      game.activeCustomer,
      player,
      opponents,
    )];
  }));
  const competing = game.players.filter((player) => player.meal.dishes.length > 0);
  const valueCounts = new Map();
  competing.forEach((player) => {
    const value = results[player.id].total;
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  });
  const highestUnique = [...valueCounts.entries()]
    .filter(([, count]) => count === 1)
    .map(([value]) => value)
    .sort((left, right) => right - left)[0];
  const winner = highestUnique === undefined
    ? null
    : competing.find((player) => results[player.id].total === highestUnique) || null;

  if (winner) winner.customers.push(game.activeCustomer);
  const candidates = winner
    ? tipCandidates(winner.meal, winner.cuisineId, winner.tips)
    : [];
  const selectedTips = {};
  if (winner?.isAi && candidates[0]) selectedTips[winner.id] = candidates[0].id;

  game.pending = {
    winnerId: winner?.id || null,
    results,
    tipCandidates: winner ? { [winner.id]: candidates } : {},
    selectedTips,
  };
  game.ready.reveal = game.players.filter((player) => player.isAi).map((player) => player.id);
  game.phase = "reveal";
}

function advanceFromRefresh(room) {
  const { game } = room;
  if (game.phase !== "refresh" || !allReady(game, "refresh")) return;
  game.phase = "serve";
  prepareAiMeals(room);
  if (allReady(game, "serve")) resolveContest(room);
}

function completeRound(room, random) {
  const { game } = room;
  const pending = game.pending;
  game.players.forEach((player) => {
    const selectedId = pending.selectedTips[player.id] || null;
    const selectedCard = (pending.tipCandidates[player.id] || [])
      .find((card) => card.id === selectedId) || null;
    cleanupMeal(player, player.meal, selectedCard);
  });
  game.history.push({
    round: game.round,
    customer: game.activeCustomer,
    winnerId: pending.winnerId,
    values: Object.fromEntries(
      Object.entries(pending.results).map(([playerId, result]) => [playerId, result.total]),
    ),
  });

  const ended = game.players.some((player) => player.tips.length >= 4)
    || game.customerDeck.length === 0;
  game.pending = null;
  if (ended) {
    game.phase = "ended";
    return;
  }

  game.round += 1;
  game.activeCustomer = game.customerDeck.pop();
  game.phase = "refresh";
  game.ready = { refresh: [], serve: [], reveal: [] };
  refreshAiPlayers(room, random);
  advanceFromRefresh(room);
}

function startGame(room, random) {
  if (room.players.length < MIN_PLAYERS) {
    throw new RoomError("Add at least one rival before starting.", 409, "NOT_ENOUGH_PLAYERS");
  }
  if (room.players.length > MAX_PLAYERS) {
    throw new RoomError("A table can have at most four players.", 409, "ROOM_FULL");
  }
  if (unique(room.players.map((player) => player.cuisineId)).length !== room.players.length) {
    throw new RoomError("Every restaurant deck at the table must be unique.", 409, "DUPLICATE_CUISINE");
  }
  room.game = makeTableGame(room, random);
  room.status = "playing";
  refreshAiPlayers(room, random);
  advanceFromRefresh(room);
}

function applyLobbyAction(room, playerId, action, random) {
  const player = assertHumanPlayer(room, playerId);
  if (action.type === "set_cuisine") {
    assertCuisineAvailable(room, action.cuisineId, player.id);
    player.cuisineId = action.cuisineId;
  } else if (action.type === "set_name") {
    player.name = normalizePlayerName(action.name);
  } else if (action.type === "add_ai") {
    assertHost(room, playerId);
    if (room.players.length >= MAX_PLAYERS) {
      throw new RoomError("This table already has four players.", 409, "ROOM_FULL");
    }
    assertCuisineAvailable(room, action.cuisineId);
    room.players.push({
      id: randomId("ai"),
      token: null,
      name: `AI rival ${room.players.filter((seat) => seat.isAi).length + 1}`,
      cuisineId: action.cuisineId,
      isAi: true,
    });
  } else if (action.type === "remove_ai") {
    assertHost(room, playerId);
    const target = room.players.find((seat) => seat.id === action.playerId && seat.isAi);
    if (!target) throw new RoomError("That AI seat no longer exists.", 404, "SEAT_NOT_FOUND");
    room.players = room.players.filter((seat) => seat.id !== target.id);
  } else if (action.type === "set_ai_cuisine") {
    assertHost(room, playerId);
    const target = room.players.find((seat) => seat.id === action.playerId && seat.isAi);
    if (!target) throw new RoomError("That AI seat no longer exists.", 404, "SEAT_NOT_FOUND");
    assertCuisineAvailable(room, action.cuisineId, target.id);
    target.cuisineId = action.cuisineId;
  } else if (action.type === "start") {
    assertHost(room, playerId);
    startGame(room, random);
  } else {
    throw new RoomError("That lobby action is not supported.", 400, "UNKNOWN_ACTION");
  }
}

function applyGameAction(room, playerId, action, random) {
  const seat = assertHumanPlayer(room, playerId);
  const player = gamePlayer(room, playerId);
  const { game } = room;
  if (!player) throw new RoomError("Your game seat could not be found.", 404, "SEAT_NOT_FOUND");

  if (action.type === "refresh") {
    if (game.phase !== "refresh") throw new RoomError("Refresh is already complete.", 409, "WRONG_PHASE");
    if (game.ready.refresh.includes(playerId)) return;
    refreshPlayer(
      player,
      game.activeCustomer,
      Array.isArray(action.discardIds) ? action.discardIds : [],
      Boolean(action.mulligan),
      random,
    );
    markReady(game, "refresh", playerId);
    advanceFromRefresh(room);
  } else if (action.type === "serve") {
    if (game.phase !== "serve") throw new RoomError("Serving is already complete.", 409, "WRONG_PHASE");
    if (game.ready.serve.includes(playerId)) return;
    player.meal = buildSubmittedMeal(player, action.meal, game.activeCustomer.order);
    moveMealFromHand(player, player.meal);
    markReady(game, "serve", playerId);
    if (allReady(game, "serve")) resolveContest(room);
  } else if (action.type === "reveal_ack") {
    if (game.phase !== "reveal") throw new RoomError("There is no reveal to confirm.", 409, "WRONG_PHASE");
    if (game.ready.reveal.includes(playerId)) return;
    if (game.pending.winnerId === playerId) {
      const candidates = game.pending.tipCandidates[playerId] || [];
      const selectedTipId = action.tipCardId || null;
      if (selectedTipId && !candidates.some((card) => card.id === selectedTipId)) {
        throw new RoomError("That Tips Card is not eligible.", 400, "INVALID_TIP");
      }
      game.pending.selectedTips[playerId] = selectedTipId;
    }
    markReady(game, "reveal", playerId);
    if (allReady(game, "reveal")) completeRound(room, random);
  } else if (action.type === "rematch") {
    assertHost(room, playerId);
    if (game.phase !== "ended") throw new RoomError("The current game is not over yet.", 409, "WRONG_PHASE");
    startGame(room, random);
  } else if (action.type === "replace_disconnected") {
    replacePlayerWithAi(room, playerId, action.playerId, random);
  } else {
    throw new RoomError("That game action is not supported.", 400, "UNKNOWN_ACTION");
  }
  seat.name = player.name;
}

export function applyRoomAction(room, playerId, action, random = undefined, now = Date.now()) {
  if (!action || typeof action.type !== "string") {
    throw new RoomError("A valid action is required.", 400, "INVALID_ACTION");
  }
  if (room.status === "lobby") applyLobbyAction(room, playerId, action, random);
  else applyGameAction(room, playerId, action, random);
  room.updatedAt = now;
  return room;
}

function hiddenHand(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `hidden-${index}` }));
}

function publicGamePlayer(player, revealMeals, playedCount, connected) {
  return {
    id: player.id,
    name: player.name,
    cuisineId: player.cuisineId,
    isAi: player.isAi,
    connected: player.isAi || connected,
    hand: hiddenHand(player.hand.length),
    deck: [],
    discard: [],
    meal: revealMeals ? player.meal : emptyMeal(),
    playedCount,
    customers: player.customers,
    tips: player.tips,
  };
}

function gameSnapshot(room, viewerId, connectedPlayerIds = []) {
  const { game } = room;
  const viewer = gamePlayer(room, viewerId);
  if (!viewer) return null;
  const connected = new Set(connectedPlayerIds);
  const revealMeals = game.phase === "reveal" || game.phase === "ended";
  const opponents = game.players
    .filter((player) => player.id !== viewerId)
    .map((player) => publicGamePlayer(
      player,
      revealMeals,
      game.ready.serve.includes(player.id) ? flattenMeal(player.meal).length : 0,
      connected.has(player.id),
    ));
  const readyIds = game.ready[game.phase] || [];
  const waitingFor = game.players
    .filter((player) => !player.isAi && !readyIds.includes(player.id))
    .map((player) => player.name);
  const playerView = structuredClone(viewer);
  playerView.connected = connected.has(viewer.id);
  playerView.deck = hiddenHand(viewer.deck.length);
  playerView.discard = hiddenHand(viewer.discard.length);
  const customerDeck = Array.from(
    { length: game.customerDeck.length },
    (_, index) => ({ id: `hidden-customer-${index}` }),
  );
  let pending = null;
  if (game.pending) {
    pending = {
      winnerId: game.pending.winnerId,
      playerResult: game.pending.results[viewerId],
      opponentResults: opponents.map((player) => ({
        player,
        result: game.pending.results[player.id],
      })),
      tipCandidates: game.pending.tipCandidates[viewerId] || [],
      selectedTipId: Object.hasOwn(game.pending.selectedTips, viewerId)
        ? game.pending.selectedTips[viewerId]
        : game.pending.tipCandidates[viewerId]?.[0]?.id || null,
    };
  }
  return {
    round: game.round,
    phase: game.phase,
    player: playerView,
    opponents,
    customerDeck,
    activeCustomer: game.activeCustomer,
    history: game.history,
    pending,
    multiplayer: {
      roomId: room.id,
      isHost: room.hostPlayerId === viewerId,
      submitted: readyIds.includes(viewerId),
      readyPlayerIds: readyIds,
      waitingFor,
      disconnectedPlayerIds: game.players
        .filter((player) => !player.isAi && !connected.has(player.id))
        .map((player) => player.id),
    },
  };
}

export function roomSnapshot(room, viewerId, connectedPlayerIds = []) {
  const preview = roomPreview(room, connectedPlayerIds);
  return {
    ...preview,
    you: viewerId,
    isHost: room.hostPlayerId === viewerId,
    game: room.status === "playing" ? gameSnapshot(room, viewerId, connectedPlayerIds) : null,
  };
}

export function roomStandings(room) {
  if (!room.game) return [];
  return room.game.players
    .map((player) => ({ playerId: player.id, score: scorePlayer(player) }))
    .sort((left, right) => right.score - left.score);
}
