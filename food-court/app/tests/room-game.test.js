import test from "node:test";
import assert from "node:assert/strict";

import {
  applyRoomAction,
  buildSubmittedMeal,
  createRoomState,
  joinRoomState,
  roomSnapshot,
  RoomError,
} from "../worker/room-game.js";

const stableRandom = () => 0.42;

function roomWithHost() {
  return createRoomState({
    roomId: "ABCDEFGH",
    name: "Host chef",
    cuisineId: "italy",
    playerId: "host",
    token: "host-token",
    now: 1,
  });
}

test("room sessions resume by token and human guests can replace AI seats", () => {
  const room = roomWithHost();
  applyRoomAction(room, "host", { type: "add_ai", cuisineId: "france" }, stableRandom);
  applyRoomAction(room, "host", { type: "add_ai", cuisineId: "china" }, stableRandom);
  applyRoomAction(room, "host", { type: "add_ai", cuisineId: "india" }, stableRandom);
  assert.equal(room.players.length, 4);

  const guest = joinRoomState(room, {
    name: "Guest chef",
    cuisineId: "mexico",
    playerId: "guest",
    playerToken: "guest-token",
    now: 2,
  });
  assert.deepEqual(guest, { playerId: "guest", token: "guest-token" });
  assert.equal(room.players.length, 4);
  assert.equal(room.players.filter((player) => player.isAi).length, 2);
  assert.deepEqual(joinRoomState(room, { token: "guest-token" }), guest);
});

test("a room enforces unique restaurants and a four-seat human limit", () => {
  const room = roomWithHost();
  assert.throws(
    () => joinRoomState(room, { name: "Duplicate", cuisineId: "italy" }),
    (error) => error instanceof RoomError && error.code === "CUISINE_TAKEN",
  );

  for (const [index, cuisineId] of ["france", "china", "india"].entries()) {
    joinRoomState(room, {
      name: `Guest ${index + 1}`,
      cuisineId,
      playerId: `guest-${index + 1}`,
      playerToken: `token-${index + 1}`,
    });
  }
  assert.throws(
    () => joinRoomState(room, { name: "Fifth", cuisineId: "mexico" }),
    (error) => error instanceof RoomError && error.code === "ROOM_FULL",
  );
});

test("a room can be created with configured human and AI seats", () => {
  const room = createRoomState({
    roomId: "SETUP123",
    name: "Host chef",
    cuisineId: "italy",
    maxPlayers: 4,
    aiCuisineIds: ["france", "china"],
    playerId: "host",
    token: "host-token",
  });

  assert.equal(room.maxPlayers, 4);
  assert.equal(room.players.length, 3);
  assert.deepEqual(
    room.players.filter((player) => player.isAi).map((player) => player.cuisineId),
    ["france", "china"],
  );
  assert.equal(roomSnapshot(room, "host").maxPlayers, 4);
});

test("a configured room size limits the number of human seats", () => {
  const room = createRoomState({
    roomId: "SMALL123",
    name: "Host chef",
    cuisineId: "italy",
    maxPlayers: 2,
    playerId: "host",
    token: "host-token",
  });
  joinRoomState(room, {
    name: "Guest",
    cuisineId: "france",
    playerId: "guest",
    playerToken: "guest-token",
  });

  assert.throws(
    () => joinRoomState(room, { name: "Third", cuisineId: "china" }),
    (error) => error instanceof RoomError && error.code === "ROOM_FULL",
  );
});

test("a configured room waits for every selected seat before starting", () => {
  const room = createRoomState({
    roomId: "WAIT1234",
    name: "Host chef",
    cuisineId: "italy",
    maxPlayers: 3,
    playerId: "host",
    token: "host-token",
  });
  joinRoomState(room, {
    name: "Guest",
    cuisineId: "france",
    playerId: "guest",
    playerToken: "guest-token",
  });

  assert.equal(roomSnapshot(room, "host").startable, false);
  assert.throws(
    () => applyRoomAction(room, "host", { type: "start" }, stableRandom),
    (error) => error instanceof RoomError && error.code === "OPEN_SEATS",
  );
});

test("server snapshots keep rival hands and future customers private", () => {
  const room = roomWithHost();
  applyRoomAction(room, "host", { type: "add_ai", cuisineId: "france" }, stableRandom);
  applyRoomAction(room, "host", { type: "start" }, stableRandom);
  applyRoomAction(room, "host", { type: "refresh", discardIds: [] }, stableRandom);

  const snapshot = roomSnapshot(room, "host", ["host"]);
  assert.equal(snapshot.game.phase, "serve");
  assert.equal(snapshot.game.player.hand.some((card) => card.name), true);
  assert.equal(snapshot.game.player.deck.every((card) => !card.name), true);
  assert.equal(snapshot.game.player.discard.every((card) => !card.name), true);
  assert.equal(snapshot.game.opponents[0].hand.every((card) => !card.name), true);
  assert.equal(snapshot.game.customerDeck.every((customer) => !customer.name), true);
  assert.equal(snapshot.game.opponents[0].playedCount >= 0, true);
  assert.equal(snapshot.players.find((player) => player.id === "host").connected, true);
});

test("server validates submitted cards and resolves synchronized phases", () => {
  const room = roomWithHost();
  applyRoomAction(room, "host", { type: "add_ai", cuisineId: "france" }, stableRandom);
  applyRoomAction(room, "host", { type: "start" }, stableRandom);
  applyRoomAction(room, "host", { type: "refresh", discardIds: [] }, stableRandom);
  const host = room.game.players.find((player) => player.id === "host");

  assert.throws(
    () => buildSubmittedMeal(host, {
      dishes: [{ recipeId: "not-in-hand", ingredientIds: [] }],
    }, room.game.activeCustomer.order),
    (error) => error instanceof RoomError && error.code === "INVALID_MEAL",
  );

  const recipe = host.hand.find((card) => card.type === "recipe");
  const meal = recipe
    ? { dishes: [{ recipeId: recipe.id, ingredientIds: [], flavorId: null }], drinkId: null }
    : { dishes: [], drinkId: null };
  applyRoomAction(room, "host", { type: "serve", meal }, stableRandom);
  assert.equal(room.game.phase, "reveal");
  assert.ok(room.game.pending);
  assert.equal(Object.keys(room.game.pending.results).length, 2);

  const reveal = roomSnapshot(room, "host", ["host"]);
  assert.ok(reveal.game.pending.playerResult);
  assert.ok(reveal.game.pending.opponentResults[0].result);
  assert.equal(reveal.game.opponents[0].meal.dishes instanceof Array, true);

  applyRoomAction(room, "host", {
    type: "reveal_ack",
    promotionCardId: reveal.game.pending.selectedPromotionId,
  }, stableRandom);
  assert.ok(["refresh", "ended"].includes(room.game.phase));
  assert.equal(room.game.history.length, 1);
});

test("multiplayer resolves open Promotion bidding and rewards only the non-winner", () => {
  const room = roomWithHost();
  joinRoomState(room, {
    name: "Guest chef",
    cuisineId: "france",
    playerId: "guest",
    playerToken: "guest-token",
  });
  applyRoomAction(room, "host", { type: "start" }, stableRandom);
  applyRoomAction(room, "host", { type: "refresh", discardIds: [] }, stableRandom);
  applyRoomAction(room, "guest", { type: "refresh", discardIds: [] }, stableRandom);

  const host = room.game.players.find((player) => player.id === "host");
  const guest = room.game.players.find((player) => player.id === "guest");
  const hostRecipe = { id: "host-recipe", type: "recipe", name: "Pasta", slots: 0 };
  const guestRecipe = { id: "guest-recipe", type: "recipe", name: "Ratatouille", slots: 0, tag: "main" };
  host.hand = [hostRecipe];
  guest.hand = [guestRecipe];
  host.promotions = [{ id: "host-promo", type: "ingredient", name: "Old promotion" }];
  guest.promotions = [{ id: "guest-promo", type: "recipe", name: "Old promotion", promotionKey: "entree" }];
  room.game.activeCustomer.order = 1;
  room.game.activeCustomer.nationality = "italy";

  applyRoomAction(room, "host", {
    type: "serve",
    meal: { dishes: [{ recipeId: hostRecipe.id, ingredientIds: [] }], drinkId: null },
  }, stableRandom);
  applyRoomAction(room, "guest", {
    type: "serve",
    meal: { dishes: [{ recipeId: guestRecipe.id, ingredientIds: [] }], drinkId: null },
  }, stableRandom);
  assert.equal(room.game.pending.contest.resolved, false);

  applyRoomAction(room, "host", { type: "promotion_bid", bid: "raise" }, stableRandom);
  applyRoomAction(room, "guest", { type: "promotion_bid", bid: "withdraw" }, stableRandom);
  assert.equal(room.game.pending.winnerId, "host");
  assert.equal(host.promotions.length, 0);
  assert.equal(host.discard.some((card) => card.id === "host-promo"), true);

  const guestView = roomSnapshot(room, "guest", ["host", "guest"]);
  assert.equal(guestView.game.pending.promotionCandidates[0].id, guestRecipe.id);
  applyRoomAction(room, "host", { type: "reveal_ack" }, stableRandom);
  applyRoomAction(room, "guest", {
    type: "reveal_ack",
    promotionCardId: guestView.game.pending.selectedPromotionId,
  }, stableRandom);

  assert.equal(host.customers.length, 1);
  assert.equal(host.promotions.length, 0);
  assert.equal(guest.promotions.length, 2);
  assert.notEqual(room.game.phase, "ended");
});

test("multiplayer resolves 10 customers and leaves the rest of the shared deck unused", () => {
  const room = roomWithHost();
  applyRoomAction(room, "host", { type: "add_ai", cuisineId: "france" }, stableRandom);
  applyRoomAction(room, "host", { type: "start" }, stableRandom);

  let actions = 0;
  while (room.game.phase !== "ended" && actions < 40) {
    actions += 1;
    if (room.game.phase === "refresh") {
      applyRoomAction(room, "host", { type: "refresh", discardIds: [] }, stableRandom);
    } else if (room.game.phase === "serve") {
      applyRoomAction(room, "host", {
        type: "serve",
        meal: { dishes: [], drinkId: null },
      }, stableRandom);
    } else if (room.game.phase === "reveal") {
      applyRoomAction(room, "host", { type: "reveal_ack" }, stableRandom);
    }
  }

  assert.equal(room.game.phase, "ended");
  assert.equal(room.game.round, 10);
  assert.equal(room.game.history.length, 10);
  assert.equal(room.game.customerDeck.length, 2);
});

test("only the host can start or manage AI seats", () => {
  const room = roomWithHost();
  joinRoomState(room, {
    name: "Guest",
    cuisineId: "france",
    playerId: "guest",
    playerToken: "guest-token",
  });
  assert.throws(
    () => applyRoomAction(room, "guest", { type: "add_ai", cuisineId: "china" }),
    (error) => error instanceof RoomError && error.code === "HOST_ONLY",
  );
  assert.throws(
    () => applyRoomAction(room, "guest", { type: "start" }),
    (error) => error instanceof RoomError && error.code === "HOST_ONLY",
  );
});

test("the host can hand a disconnected human seat to the AI without stalling the round", () => {
  const room = roomWithHost();
  joinRoomState(room, {
    name: "Dropped guest",
    cuisineId: "france",
    playerId: "guest",
    playerToken: "guest-token",
  });
  applyRoomAction(room, "host", { type: "start" }, stableRandom);
  applyRoomAction(room, "host", { type: "refresh", discardIds: [] }, stableRandom);
  assert.equal(room.game.phase, "refresh");

  applyRoomAction(room, "host", {
    type: "replace_disconnected",
    playerId: "guest",
  }, stableRandom);
  assert.equal(room.players.find((player) => player.id === "guest").isAi, true);
  assert.equal(room.game.players.find((player) => player.id === "guest").isAi, true);
  assert.equal(room.game.phase, "serve");
  assert.equal(room.game.ready.serve.includes("guest"), true);

  applyRoomAction(room, "host", {
    type: "serve",
    meal: { dishes: [], drinkId: null },
  }, stableRandom);
  assert.equal(room.game.phase, "reveal");
});
