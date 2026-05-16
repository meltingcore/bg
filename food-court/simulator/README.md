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
- Customer queue size equal to player count.
- Hand refill, ingredient preparation, cooking, drinks, serving, customer resolution, Tips tracking,
  final round trigger, and scoring.
- Customer symbol limit bonuses for hand, ingredient, cooking, and swap limits.
- Deck-specific serve-value bonuses as data-driven rules in `src/game/engine.ts`.

## Current Assumptions

- Easy recipes require 1 primary ingredient.
- Normal recipes require 1 primary and 1 secondary ingredient.
- Hard recipes require 1 primary and 2 secondary ingredients.
- Drink requirements are displayed, but playing a drink is manual so playtesters can decide whether
  the requirement has been met.
- The simulator uses selected-player cuisine customers for the shared customer deck.

Deck and card definitions live in `src/data/decks.ts` so rule and balance changes are easy to
iterate without rewriting the UI.
