import { authorizeAccessRequest, isPreviewHostname } from "./access.js";

const WORKER_NAME = "foodcourt";

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

export default {
  async fetch(request, env) {
    const { hostname } = new URL(request.url);

    if (isPreviewHostname(hostname, WORKER_NAME)) {
      const authorization = await authorizeAccessRequest(request, env);

      if (authorization.configurationMissing) {
        return accessError("Cloudflare Access is not configured.", 503);
      }

      if (!authorization.allowed) {
        return accessError("Forbidden", 403);
      }
    }

    const response = await env.ASSETS.fetch(request);
    return applyBrowserCachePolicy(request, response);
  },
};
