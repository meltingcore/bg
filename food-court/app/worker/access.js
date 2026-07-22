import { createRemoteJWKSet, jwtVerify } from "jose";

const jwksByTeamDomain = new Map();

function normalizeTeamDomain(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const isAccessDomain = url.hostname.endsWith(".cloudflareaccess.com");

    if (url.protocol !== "https:" || !isAccessDomain) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getRemoteJwks(teamDomain) {
  if (!jwksByTeamDomain.has(teamDomain)) {
    jwksByTeamDomain.set(
      teamDomain,
      createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`)),
    );
  }

  return jwksByTeamDomain.get(teamDomain);
}

export function isPreviewHostname(hostname, workerName) {
  if (!hostname || !workerName) {
    return false;
  }

  const normalizedHostname = hostname.toLowerCase();
  const normalizedWorkerName = workerName.toLowerCase();
  const firstLabel = normalizedHostname.split(".")[0];

  return (
    normalizedHostname.endsWith(".workers.dev") &&
    firstLabel.endsWith(`-${normalizedWorkerName}`)
  );
}

export function getAccessConfiguration(env) {
  const teamDomain = normalizeTeamDomain(env.TEAM_DOMAIN);
  const audience = env.POLICY_AUD?.trim();

  if (!teamDomain || !audience) {
    return null;
  }

  return { teamDomain, audience };
}

export async function verifyAccessToken(token, configuration, jwks) {
  if (!token || !configuration) {
    return false;
  }

  try {
    await jwtVerify(
      token,
      jwks ?? getRemoteJwks(configuration.teamDomain),
      {
        issuer: configuration.teamDomain,
        audience: configuration.audience,
      },
    );

    return true;
  } catch {
    return false;
  }
}

export async function authorizeAccessRequest(request, env) {
  const configuration = getAccessConfiguration(env);

  if (!configuration) {
    return { allowed: false, configurationMissing: true };
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const allowed = await verifyAccessToken(token, configuration);

  return { allowed, configurationMissing: false };
}
