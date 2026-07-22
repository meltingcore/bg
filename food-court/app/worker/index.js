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

    return env.ASSETS.fetch(request);
  },
};
