import {
  applyRoomAction,
  createRoomState,
  findPlayerByToken,
  joinRoomState,
  roomPreview,
  roomSnapshot,
  RoomError,
} from "./room-game.js";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export const ROOM_IDLE_TTL_MS = 24 * 60 * 60 * 1000;

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  Object.entries(JSON_HEADERS).forEach(([name, value]) => headers.set(name, value));
  return new Response(JSON.stringify(data), { ...init, headers });
}

function errorResponse(error) {
  const status = error instanceof RoomError ? error.status : 500;
  const message = error instanceof RoomError ? error.message : "The room could not process that request.";
  const code = error instanceof RoomError ? error.code : "ROOM_ERROR";
  return json({ error: message, code }, { status });
}

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    throw new RoomError("Send a valid JSON request body.", 400, "INVALID_JSON");
  }
}

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.roomPromise = ctx.storage.get("room");
    this.alarmPromise = ctx.storage.getAlarm();
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async room() {
    return this.roomPromise;
  }

  async save(room) {
    room.updatedAt = Date.now();
    this.roomPromise = Promise.resolve(room);
    await this.ctx.storage.put("room", room);
    const expiration = room.updatedAt + ROOM_IDLE_TTL_MS;
    const scheduledAlarm = await this.alarmPromise;
    if (scheduledAlarm === null || scheduledAlarm > expiration) {
      await this.scheduleExpiration(expiration);
    }
  }

  async scheduleExpiration(timestamp) {
    await this.ctx.storage.setAlarm(timestamp);
    this.alarmPromise = Promise.resolve(timestamp);
  }

  connectedPlayerIds() {
    return [...new Set(this.ctx.getWebSockets().map((socket) =>
      socket.deserializeAttachment()?.playerId).filter(Boolean))];
  }

  send(socket, payload) {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      // A stale socket is removed by the runtime; other players still receive state.
    }
  }

  broadcast(room) {
    const connected = this.connectedPlayerIds();
    this.ctx.getWebSockets().forEach((socket) => {
      const { playerId } = socket.deserializeAttachment() || {};
      if (playerId) this.send(socket, { type: "state", room: roomSnapshot(room, playerId, connected) });
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const route = url.pathname.split("/").filter(Boolean).at(-1);
    try {
      if (route === "create" && request.method === "POST") {
        if (await this.room()) {
          throw new RoomError("That room code is already in use.", 409, "ROOM_EXISTS");
        }
        const body = await requestBody(request);
        const room = createRoomState(body);
        await this.save(room);
        const host = room.players[0];
        return json({
          roomId: room.id,
          playerId: host.id,
          token: host.token,
          room: roomSnapshot(room, host.id, this.connectedPlayerIds()),
        });
      }

      const room = await this.room();
      if (!room) throw new RoomError("That table does not exist.", 404, "ROOM_NOT_FOUND");

      if (route === "preview" && request.method === "GET") {
        return json({ room: roomPreview(room, this.connectedPlayerIds()) });
      }

      if (route === "join" && request.method === "POST") {
        const session = joinRoomState(room, await requestBody(request));
        await this.save(room);
        this.broadcast(room);
        return json({
          roomId: room.id,
          ...session,
          room: roomSnapshot(room, session.playerId, this.connectedPlayerIds()),
        });
      }

      if (route === "leave" && request.method === "POST") {
        const { token } = await requestBody(request);
        const player = findPlayerByToken(room, token);
        if (!player) throw new RoomError("That room session is not valid.", 403, "INVALID_SESSION");
        if (room.status !== "lobby") {
          throw new RoomError("Reconnect to finish the game before leaving the table.", 409, "GAME_STARTED");
        }
        room.players = room.players.filter((seat) => seat.id !== player.id);
        if (room.hostPlayerId === player.id) {
          room.hostPlayerId = room.players.find((seat) => !seat.isAi)?.id || null;
        }
        await this.save(room);
        this.broadcast(room);
        return json({ left: true });
      }

      if (route === "websocket") {
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
          throw new RoomError("A WebSocket connection is required.", 426, "UPGRADE_REQUIRED");
        }
        const player = findPlayerByToken(room, url.searchParams.get("token"));
        if (!player) throw new RoomError("That room session is not valid.", 403, "INVALID_SESSION");
        await this.save(room);
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        server.serializeAttachment({ playerId: player.id });
        this.ctx.acceptWebSocket(server);
        this.send(server, {
          type: "state",
          room: roomSnapshot(room, player.id, this.connectedPlayerIds()),
        });
        this.broadcast(room);
        return new Response(null, { status: 101, webSocket: client });
      }

      throw new RoomError("That room route does not exist.", 404, "NOT_FOUND");
    } catch (error) {
      if (!(error instanceof RoomError)) console.error("Game room error", error);
      return errorResponse(error);
    }
  }

  async webSocketMessage(socket, message) {
    const { playerId } = socket.deserializeAttachment() || {};
    try {
      if (!playerId || typeof message !== "string") {
        throw new RoomError("Invalid room message.", 400, "INVALID_MESSAGE");
      }
      const payload = JSON.parse(message);
      if (payload.type === "ping") {
        this.send(socket, { type: "pong" });
        return;
      }
      if (payload.type !== "action") {
        throw new RoomError("That room message is not supported.", 400, "INVALID_MESSAGE");
      }
      if (
        payload.action?.type === "replace_disconnected"
        && this.connectedPlayerIds().includes(payload.action.playerId)
      ) {
        throw new RoomError("That player is still connected.", 409, "PLAYER_CONNECTED");
      }
      const room = await this.room();
      if (!room) throw new RoomError("That table no longer exists.", 404, "ROOM_NOT_FOUND");
      applyRoomAction(room, playerId, payload.action);
      await this.save(room);
      this.broadcast(room);
    } catch (error) {
      const roomError = error instanceof RoomError
        ? error
        : new RoomError("The room could not read that message.", 400, "INVALID_MESSAGE");
      this.send(socket, { type: "error", error: roomError.message, code: roomError.code });
    }
  }

  async webSocketClose() {
    // The current compatibility date enables Cloudflare's automatic close reply.
    // Calling close() here can throw for reserved event codes such as 1005/1006.
    const room = await this.room();
    if (room) this.broadcast(room);
  }

  async webSocketError() {
    const room = await this.room();
    if (room) this.broadcast(room);
  }

  async alarm() {
    this.alarmPromise = Promise.resolve(null);
    const room = await this.room();
    if (!room) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    if (this.ctx.getWebSockets().length > 0) {
      await this.scheduleExpiration(Date.now() + ROOM_IDLE_TTL_MS);
      return;
    }

    const lastActivity = room.updatedAt || room.createdAt || 0;
    const expiration = lastActivity + ROOM_IDLE_TTL_MS;
    if (expiration > Date.now()) {
      await this.scheduleExpiration(expiration);
      return;
    }

    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    this.roomPromise = Promise.resolve(undefined);
    this.alarmPromise = Promise.resolve(null);
  }
}
