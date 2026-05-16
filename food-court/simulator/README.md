# Food Court Simulator

Astro prototype for fast digital playtests of the current Food Court rules.

## Run

```sh
pnpm install
pnpm run dev
```

Open <http://127.0.0.1:4321/>.

## What It Models

- 2-4 player setup with selected cuisine decks.
- Seeded player decks and shared customer deck.
- One active customer contested by all players each round.
- Refresh discard limit, hand refill, recipe serving, ingredient slot boosts, reveal, Drink Card
  tie-breaks, customer resolution, Tips tracking, end trigger, and scoring.
- Highest unique serve value resolution, including cancellation of tied values.
- Current customer effects from `Rules.md`.
- Deck-specific serve-value bonuses as data-driven rules in `src/game/engine.ts`.

## Current Assumptions

- Easy recipes have 0 normal ingredient slots.
- Normal recipes have 1 normal ingredient slot.
- Hard recipes have 2 normal ingredient slots.
- Any recipe can take 1 Optional Ingredient.
- Drink Cards are only playable after reveal by players tied with another serve value.
- Tips tracking is automated by the first eligible card found in the winning meal.
- The simulator uses selected-player cuisine customers for the shared customer deck.

Deck and card definitions live in `src/data/decks.ts` so rule and balance changes are easy to
iterate without rewriting the UI.
