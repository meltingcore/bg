# Food Court Game App

A standalone player-facing browser game for Food Court.

> **Rules compatibility:** Solo and multiplayer games implement the v0.15.0 Promotion Card rules.

## Run Locally

```sh
cd food-court/app
npm run dev
```

Open <http://localhost:4173>.

The static server supports solo games. To run URL-based multiplayer rooms locally, use the Worker
development server instead:

```sh
npm run dev:online
```

Open the local URL printed by Wrangler, choose **Private online table**, and share the generated
invite URL. A room supports two to four restaurants in any mix of human players and AI rivals.
Every human keeps a reconnect token in local browser storage; private hands and future deck cards
remain server-side. If someone cannot reconnect, the host can hand that seat to the AI so the
current round can finish. Rooms are removed after 24 hours without activity; an open player
connection postpones cleanup.

## Checks

```sh
npm run check
npm test
```

The player-facing app uses browser-native JavaScript modules. Its Cloudflare Worker uses the
`jose` package to validate Cloudflare Access tokens on preview URLs and a Durable Object per
multiplayer room to coordinate game state and WebSocket connections.

## Cloudflare Workers

This directory is the production Cloudflare Workers project. It builds only the player-facing
assets into `dist/`.

```sh
npm run build
npx wrangler@latest dev
```

Deploy manually with `npm run deploy`. For Workers Builds, use `food-court/app` as the root
directory, `npm run build` as the build command, and `npx wrangler@latest deploy --keep-vars` as
the deploy command. `wrangler.jsonc` includes the `GameRoom` Durable Object binding and its initial
SQLite migration.

Static assets are served without invoking the Worker. Only `/api/rooms` multiplayer requests run
Worker-first, preserving Cloudflare's free and unlimited static asset delivery. Cloudflare Access
protects preview assets at the edge, while the Worker also validates Access tokens on preview API
requests.

### Restrict Preview URLs With Cloudflare Access

1. In **Workers & Pages > foodcourt > Settings > Domains & Routes**, enable Cloudflare Access for
   Preview URLs and configure the allowed identities.
2. In **Settings > Variables and Secrets**, add `TEAM_DOMAIN` with the value
   `https://<team-name>.cloudflareaccess.com`.
3. Add `POLICY_AUD` with the Access application's AUD tag.

The Worker validates `Cf-Access-Jwt-Assertion` for multiplayer API requests on version and alias
preview URLs. The production `foodcourt.<subdomain>.workers.dev` hostname and custom production
domains remain public. The deploy command uses `--keep-vars` so dashboard-managed variables are
preserved.
