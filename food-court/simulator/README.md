# Food Court Simulator

Astro prototype for fast digital playtests of the current Food Court rules.

## Run

```sh
pnpm install
pnpm run dev
```

Open <http://127.0.0.1:4321/>.

## Automated Playtests

Run headless bot simulations without opening the Astro UI:

```sh
pnpm sim -- --games 10 --players 4 --decks italy,france,china,india --seed 1000
```

Useful options:

- `--games <n>` controls how many full games are simulated.
- `--players <n>` supports 2-4 players.
- `--decks <ids>` chooses comma-separated cuisine ids.
- `--seed <n>` sets the base seed; game `i` uses `seed + i`.
- `--json` prints machine-readable results.

The current bot policy is `greedy`: each player refreshes, chooses the meal with the highest
immediate serve value, adds the best legal Ingredient/Flavor Cards, and plays a Drink Card only
when it increases serve value.

## What It Models

- 2-4 player setup with selected cuisine decks.
- One selected-player station at a time so opponent hands and card names stay hidden.
- Seeded player decks and shared customer deck.
- One active customer contested by all players each round.
- Refresh discard and draw limits, recipe serving, ingredient and flavor boosts, reveal, Drink
  Card serve-value boosts, customer resolution, Tips tracking, end trigger, and scoring.
- Highest unique serve value resolution, including cancellation of tied values.
- Current customer effects from `Rules.md`.
- Deck-specific serve-value bonuses as data-driven rules in `src/game/engine.ts`.

## Current Assumptions

- All recipes have base serve value 1.
- Easy recipes have 0 normal ingredient slots.
- Normal recipes have 1 normal ingredient slot.
- Hard recipes have 2 normal ingredient slots.
- Refresh allows discarding up to 1 card, then drawing up to 3 cards without exceeding hand limit 6.
- Each recipe may also take 1 Flavor Card.
- Drink Cards are played face down with a served meal and add +3 serve value if their requirement
  is met.
- Tips tracking is automated by the first eligible card found in the winning meal.
- The simulator uses selected-player cuisine customers for the shared customer deck.
- Customer shuffle is spread by cuisine to avoid long same-nationality streaks during playtests.

Deck and card definitions live in `src/data/decks.ts` so rule and balance changes are easy to
iterate without rewriting the UI.
