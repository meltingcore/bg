import { authorizeAccessRequest, isPreviewHostname } from "./access.js";
export { GameRoom } from "./game-room.js";

const WORKER_NAME = "foodcourt";
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function accessError(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function applyBrowserCachePolicy(request, response) {
  const { pathname } = new URL(request.url);
  if (pathname !== "/" && !pathname.endsWith(".html")) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-cache, must-revalidate");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function apiError(message, status = 400, code = "API_ERROR") {
  return Response.json(
    { error: message, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function roomCode() {
  const values = new Uint8Array(8);
  crypto.getRandomValues(values);
  return [...values].map((value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join("");
}

function roomRoute(pathname) {
  const match = pathname.match(/^\/api\/rooms\/([A-Z2-9]{8})(?:\/(websocket|join|leave))?$/i);
  if (!match) return null;
  return { roomId: match[1].toUpperCase(), action: match[2]?.toLowerCase() || "preview" };
}

async function createRoom(request, env) {
  if (request.method !== "POST") return apiError("Use POST to create a room.", 405, "METHOD_NOT_ALLOWED");
  let body;
  try {
    body = await request.json();
  } catch {
    return apiError("Send a valid JSON request body.", 400, "INVALID_JSON");
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const roomId = roomCode();
    const stub = env.GAME_ROOMS.getByName(roomId);
    const response = await stub.fetch("https://room.internal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        name: body.name,
        cuisineId: body.cuisineId,
        maxPlayers: body.maxPlayers,
        aiCuisineIds: body.aiCuisineIds,
      }),
    });
    if (response.status !== 409) return response;
    const payload = await response.clone().json().catch(() => ({}));
    if (payload.code !== "ROOM_EXISTS") return response;
  }
  return apiError("A room code could not be allocated. Try again.", 503, "ROOM_CODE_UNAVAILABLE");
}

async function handleRoomApi(request, env, url) {
  if (!env.GAME_ROOMS) {
    return apiError("Multiplayer rooms are not configured for this deployment.", 503, "ROOMS_UNAVAILABLE");
  }
  if (url.pathname === "/api/rooms") return createRoom(request, env);

  const route = roomRoute(url.pathname);
  if (!route) return apiError("That room route does not exist.", 404, "NOT_FOUND");
  const stub = env.GAME_ROOMS.getByName(route.roomId);
  const internalUrl = new URL(`https://room.internal/${route.action}`);
  internalUrl.search = url.search;
  return stub.fetch(new Request(internalUrl, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { hostname } = url;

    if (isPreviewHostname(hostname, WORKER_NAME)) {
      const authorization = await authorizeAccessRequest(request, env);

      if (authorization.configurationMissing) {
        return accessError("Cloudflare Access is not configured.", 503);
      }

      if (!authorization.allowed) {
        return accessError("Forbidden", 403);
      }
    }

    if (url.pathname === "/api/rooms" || url.pathname.startsWith("/api/rooms/")) {
      return handleRoomApi(request, env, url);
    }

    const response = await env.ASSETS.fetch(request);
    return applyBrowserCachePolicy(request, response);
  },
};
