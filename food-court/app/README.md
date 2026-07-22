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

The app is dependency-free and uses browser-native JavaScript modules.

## Cloudflare Workers

This directory is the production Cloudflare Workers project. It builds only the player-facing
assets into `dist/`.

```sh
npm run build
npx wrangler@latest dev
```

Deploy manually with `npm run deploy`. For Workers Builds, use `food-court/app` as the root
directory, `npm run build` as the build command, and `npx wrangler@latest deploy` as the deploy
command.
