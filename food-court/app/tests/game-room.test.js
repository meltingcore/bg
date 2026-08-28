import test from "node:test";
import assert from "node:assert/strict";

import { GameRoom, ROOM_IDLE_TTL_MS } from "../worker/game-room.js";

globalThis.WebSocketRequestResponsePair ||= class WebSocketRequestResponsePair {};

function roomState(updatedAt = Date.now()) {
  return {
    id: "ABCDEFGH",
    createdAt: updatedAt,
    updatedAt,
  };
}

function roomContext(initialRoom, sockets = [], initialAlarm = null) {
  let storedRoom = initialRoom;
  let alarmAt = initialAlarm;
  let deleted = false;
  return {
    ctx: {
      storage: {
        get: async () => storedRoom,
        put: async (_key, room) => { storedRoom = room; },
        getAlarm: async () => alarmAt,
        setAlarm: async (timestamp) => { alarmAt = timestamp; },
        deleteAlarm: async () => { alarmAt = null; },
        deleteAll: async () => {
          storedRoom = undefined;
          deleted = true;
        },
      },
      setWebSocketAutoResponse() {},
      getWebSockets: () => sockets,
    },
    values: () => ({ storedRoom, alarmAt, deleted }),
  };
}

test("saving room activity schedules a 24-hour expiration alarm", async () => {
  const mock = roomContext(undefined);
  const durableRoom = new GameRoom(mock.ctx, {});
  const room = roomState(1);
  const before = Date.now();

  await durableRoom.save(room);

  assert.ok(room.updatedAt >= before);
  assert.equal(mock.values().storedRoom, room);
  assert.equal(mock.values().alarmAt, room.updatedAt + ROOM_IDLE_TTL_MS);
});

test("saving activity shortens a legacy expiration alarm", async () => {
  const room = roomState();
  const legacyAlarm = Date.now() + (7 * ROOM_IDLE_TTL_MS);
  const mock = roomContext(room, [], legacyAlarm);
  const durableRoom = new GameRoom(mock.ctx, {});

  await durableRoom.save(room);

  assert.ok(mock.values().alarmAt < legacyAlarm);
  assert.equal(mock.values().alarmAt, room.updatedAt + ROOM_IDLE_TTL_MS);
});

test("an alarm deletes a room after 24 inactive hours", async () => {
  const room = roomState(Date.now() - ROOM_IDLE_TTL_MS - 1);
  const mock = roomContext(room);
  const durableRoom = new GameRoom(mock.ctx, {});

  await durableRoom.alarm();

  assert.equal(mock.values().deleted, true);
  assert.equal(mock.values().storedRoom, undefined);
  assert.equal(mock.values().alarmAt, null);
});

test("an alarm retains a room while a player remains connected", async () => {
  const room = roomState(Date.now() - ROOM_IDLE_TTL_MS - 1);
  const mock = roomContext(room, [{}]);
  const durableRoom = new GameRoom(mock.ctx, {});
  const before = Date.now();

  await durableRoom.alarm();

  assert.equal(mock.values().deleted, false);
  assert.ok(mock.values().alarmAt >= before + ROOM_IDLE_TTL_MS);
});

test("an abnormal WebSocket close does not echo a reserved close code", async () => {
  const room = roomState();
  const mock = roomContext(room);
  const durableRoom = new GameRoom(mock.ctx, {});
  const socket = {
    close() {
      throw new Error("The runtime must handle the close handshake.");
    },
  };

  await assert.doesNotReject(() => durableRoom.webSocketClose(socket, 1005, "", false));
});
