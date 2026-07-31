export class MultiplayerError extends Error {
  constructor(message, status = 0, code = "NETWORK_ERROR") {
    super(message);
    this.name = "MultiplayerError";
    this.status = status;
    this.code = code;
  }
}

async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new MultiplayerError(
      "The table could not be reached. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MultiplayerError(
      payload.error || `The table request failed (${response.status}).`,
      response.status,
      payload.code || "REQUEST_FAILED",
    );
  }
  return payload;
}

export function normalizeRoomId(value) {
  const roomId = String(value || "").trim().toUpperCase();
  return /^[A-Z2-9]{8}$/.test(roomId) ? roomId : null;
}

export function roomIdFromUrl(url = window.location.href) {
  return normalizeRoomId(new URL(url).searchParams.get("room"));
}

export function shareableRoomUrl(roomId, location = window.location) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", normalizeRoomId(roomId));
  return url.toString();
}

export function serializeMeal(meal) {
  return {
    dishes: meal.dishes.map((dish) => ({
      recipeId: dish.recipe.id,
      ingredientIds: dish.ingredients.map((card) => card.id),
      flavorId: dish.flavor?.id || null,
    })),
    drinkId: meal.drink?.id || null,
  };
}

export function roomTokenKey(roomId) {
  return `food-court-room-${normalizeRoomId(roomId)}`;
}

export function storedRoomToken(roomId) {
  try {
    return window.localStorage.getItem(roomTokenKey(roomId));
  } catch {
    return null;
  }
}

export function storeRoomToken(roomId, token) {
  try {
    window.localStorage.setItem(roomTokenKey(roomId), token);
  } catch {
    // Reconnection works for the current page even when persistent storage is unavailable.
  }
}

export function forgetRoomToken(roomId) {
  try {
    window.localStorage.removeItem(roomTokenKey(roomId));
  } catch {
    // The in-memory session is still cleared by the caller.
  }
}

export function createRoom({ name, cuisineId }) {
  return requestJson("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ name, cuisineId }),
  });
}

export function loadRoom(roomId) {
  return requestJson(`/api/rooms/${normalizeRoomId(roomId)}`);
}

export function joinRoom(roomId, { name, cuisineId, token } = {}) {
  return requestJson(`/api/rooms/${normalizeRoomId(roomId)}/join`, {
    method: "POST",
    body: JSON.stringify({ name, cuisineId, token }),
  });
}

export function leaveRoom(roomId, token) {
  return requestJson(`/api/rooms/${normalizeRoomId(roomId)}/leave`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function connectToRoom(roomId, token, handlers = {}) {
  let socket = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let stopped = false;
  let heartbeatTimer = null;

  const status = (value) => handlers.onStatus?.(value);
  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    const delay = Math.min(10000, 750 * (2 ** reconnectAttempt));
    reconnectAttempt += 1;
    status("reconnecting");
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      open();
    }, delay);
  };

  const open = () => {
    if (stopped) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(`${protocol}//${window.location.host}/api/rooms/${roomId}/websocket`);
    url.searchParams.set("token", token);
    status(reconnectAttempt ? "reconnecting" : "connecting");
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      reconnectAttempt = 0;
      status("connected");
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
      }, 25000);
    });
    socket.addEventListener("message", (event) => {
      if (event.data === "pong") return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "state") handlers.onState?.(payload.room);
        else if (payload.type === "error") {
          handlers.onError?.(new MultiplayerError(payload.error, 0, payload.code));
        }
      } catch {
        handlers.onError?.(new MultiplayerError("The table sent an unreadable update."));
      }
    });
    socket.addEventListener("close", (event) => {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      if (stopped) return;
      if (event.code === 1008) {
        status("failed");
        handlers.onError?.(new MultiplayerError("Your room session is no longer valid.", 403, "INVALID_SESSION"));
        return;
      }
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      if (!stopped) status("reconnecting");
    });
  };

  open();
  return {
    send(action) {
      if (socket?.readyState !== WebSocket.OPEN) {
        throw new MultiplayerError("The table is reconnecting. Try that action again in a moment.");
      }
      socket.send(JSON.stringify({ type: "action", action }));
    },
    close() {
      stopped = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeatTimer);
      reconnectTimer = null;
      heartbeatTimer = null;
      socket?.close(1000, "Leaving room");
      status("disconnected");
    },
  };
}
