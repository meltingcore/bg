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
    tipCardId: reveal.game.pending.selectedTipId,
  }, stableRandom);
  assert.ok(["refresh", "ended"].includes(room.game.phase));
  assert.equal(room.game.history.length, 1);
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
