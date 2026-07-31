import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import {
  getAccessConfiguration,
  isPreviewHostname,
  verifyAccessToken,
} from "../worker/access.js";
import worker from "../worker/index.js";

test("recognizes Food Court preview URLs without protecting production", () => {
  assert.equal(
    isPreviewHostname("feature-123-foodcourt.example.workers.dev", "foodcourt"),
    true,
  );
  assert.equal(
    isPreviewHostname("foodcourt.example.workers.dev", "foodcourt"),
    false,
  );
  assert.equal(isPreviewHostname("play.foodcourt.example", "foodcourt"), false);
});

test("requires a valid Access team domain and audience", () => {
  assert.deepEqual(
    getAccessConfiguration({
      TEAM_DOMAIN: "https://food-court.cloudflareaccess.com/",
      POLICY_AUD: " audience-tag ",
    }),
    {
      teamDomain: "https://food-court.cloudflareaccess.com",
      audience: "audience-tag",
    },
  );
  assert.equal(
    getAccessConfiguration({
      TEAM_DOMAIN: "http://food-court.cloudflareaccess.com",
      POLICY_AUD: "audience-tag",
    }),
    null,
  );
  assert.equal(getAccessConfiguration({}), null);
});

test("verifies the signature, issuer, audience, and expiry", async () => {
  const teamDomain = "https://food-court.cloudflareaccess.com";
  const audience = "food-court-preview";
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = "RS256";
  publicJwk.kid = "test-key";
  const jwks = createLocalJWKSet({ keys: [publicJwk] });
  const token = await new SignJWT({ email: "chef@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(teamDomain)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  assert.equal(
    await verifyAccessToken(token, { teamDomain, audience }, jwks),
    true,
  );
  assert.equal(
    await verifyAccessToken(
      token,
      { teamDomain, audience: "another-application" },
      jwks,
    ),
    false,
  );
});

test("the Worker gates previews and serves production assets", async () => {
  const env = {
    ASSETS: {
      fetch: () => new Response("game asset"),
    },
  };

  const productionResponse = await worker.fetch(
    new Request("https://foodcourt.example.workers.dev/"),
    env,
  );
  assert.equal(productionResponse.status, 200);
  assert.equal(await productionResponse.text(), "game asset");
  assert.equal(
    productionResponse.headers.get("Cache-Control"),
    "no-cache, must-revalidate",
  );

  const staticAssetResponse = await worker.fetch(
    new Request("https://foodcourt.example.workers.dev/src/app.js"),
    env,
  );
  assert.equal(staticAssetResponse.headers.get("Cache-Control"), null);

  const unconfiguredPreviewResponse = await worker.fetch(
    new Request("https://version-foodcourt.example.workers.dev/"),
    env,
  );
  assert.equal(unconfiguredPreviewResponse.status, 503);

  const unauthorizedPreviewResponse = await worker.fetch(
    new Request("https://version-foodcourt.example.workers.dev/"),
    {
      ...env,
      TEAM_DOMAIN: "https://food-court.cloudflareaccess.com",
      POLICY_AUD: "food-court-preview",
    },
  );
  assert.equal(unauthorizedPreviewResponse.status, 403);
  assert.equal(
    unauthorizedPreviewResponse.headers.get("Cache-Control"),
    "no-store",
  );
});
