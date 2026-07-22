# Food Court Game App

A standalone player-facing browser game for Food Court.

## Run Locally

```sh
cd food-court/app
npm run dev
```

Open <http://localhost:4173>.

## Checks

```sh
npm run check
npm test
```

The player-facing app uses browser-native JavaScript modules. Its Cloudflare Worker uses the
`jose` package to validate Cloudflare Access tokens on preview URLs.

## Cloudflare Workers

This directory is the production Cloudflare Workers project. It builds only the player-facing
assets into `dist/`.

```sh
npm run build
npx wrangler@latest dev
```

Deploy manually with `npm run deploy`. For Workers Builds, use `food-court/app` as the root
directory, `npm run build` as the build command, and `npx wrangler@latest deploy --keep-vars` as
the deploy command.

### Restrict Preview URLs With Cloudflare Access

1. In **Workers & Pages > foodcourt > Settings > Domains & Routes**, enable Cloudflare Access for
   Preview URLs and configure the allowed identities.
2. In **Settings > Variables and Secrets**, add `TEAM_DOMAIN` with the value
   `https://<team-name>.cloudflareaccess.com`.
3. Add `POLICY_AUD` with the Access application's AUD tag.

The Worker validates `Cf-Access-Jwt-Assertion` for version and alias preview URLs. The production
`foodcourt.<subdomain>.workers.dev` hostname and custom production domains remain public. The
deploy command uses `--keep-vars` so dashboard-managed variables are preserved.
