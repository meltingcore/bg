import assert from "node:assert/strict";
import test from "node:test";

import {
  connectToRoom,
  normalizeRoomId,
  ROOM_HEARTBEAT_INTERVAL_MS,
} from "../src/multiplayer.js";

test("room codes normalize pasted lowercase values and reject malformed codes", () => {
  assert.equal(normalizeRoomId(" abcd2345 "), "ABCD2345");
  assert.equal(normalizeRoomId("ABC12345"), null);
  assert.equal(normalizeRoomId("TOO-SHORT"), null);
});

test("room connections send a heartbeat before short corporate idle timeouts", (t) => {
  const originalWindow = globalThis.window;
  const originalWebSocket = globalThis.WebSocket;
  const listeners = new Map();
  const sent = [];
  let heartbeatCallback = null;
  let heartbeatDelay = null;

  class FakeWebSocket {
    static OPEN = 1;

    constructor() {
      this.readyState = FakeWebSocket.OPEN;
    }

    addEventListener(type, listener) {
      listeners.set(type, listener);
    }

    send(message) {
      sent.push(message);
    }

    close() {}
  }

  globalThis.window = {
    location: { protocol: "https:", host: "foodcourt.example" },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval(callback, delay) {
      heartbeatCallback = callback;
      heartbeatDelay = delay;
      return 2;
    },
    clearInterval() {},
  };
  globalThis.WebSocket = FakeWebSocket;
  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.WebSocket = originalWebSocket;
  });

  const connection = connectToRoom("ABCDEFGH", "host-token");
  listeners.get("open")();

  assert.equal(heartbeatDelay, ROOM_HEARTBEAT_INTERVAL_MS);
  assert.ok(heartbeatDelay < 10000);
  heartbeatCallback();
  assert.deepEqual(sent, ["ping"]);

  connection.close();
});
