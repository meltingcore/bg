# Food Court Simulator

Local-only, headless balance-analysis tooling for the current Food Court rules.

## Automated Playtests

Run headless bot simulations:

```sh
npm run sim -- --games 10 --players 4 --decks italy,france,china,india --seed 1000
```

Run the exhaustive balance study across all 28 two-player matchups and all 70 four-player tables:

```sh
npm run balance -- --games2 300 --games4 40 --workers 4 --seed 700000
```

The balance study prints compact JSON containing aggregate deck performance, every matchup/table,
customer-effect usage, nationality impact, strategy performance, and seat diagnostics.

Useful options:

- `--games <n>` controls how many full games are simulated.
- `--players <n>` supports 2-4 players.
- `--decks <ids>` chooses comma-separated cuisine ids.
- `--seed <n>` sets the base seed; game `i` uses `seed + i`.
- `--policy <name>` chooses `greedy`, `tips`, `cautious`, `adaptive`, or `mixed`.
- `--json` prints machine-readable results, including every player's decision and serve value for
  every round of every game.

Bot policies:

- `greedy` maximizes immediate serve value.
- `tips` values Tips-eligible meals, Tips scoring thresholds, and the 4-Tips End Condition.
- `cautious` uses previously revealed serve values to avoid historically common ties and conserves
  cards when extra value is unlikely to help.
- `adaptive` balances serve value, Tips progress, tie risk, and cards remaining in hand.
- `mixed` assigns all four policies across seats and rotates them by seed. This is the default and
  is the preferred mode for deck balance work.

Refresh decisions are policy-aware. Bots can use the French full-hand redraw before reaching an
empty-recipe hand, discard cards based on deck-specific Tips paths, and account for customer effects
when choosing how many cards to commit. When two meals have the same serve value, bots prefer the
meal that gains more from the active customer effect and conserves more cards.

## What It Models

- 2-4 player setup with selected cuisine decks.
- Seeded player decks and shared customer deck.
- One active customer contested by all players each round.
- Refresh discard and draw limits, recipe serving, ingredient and flavor boosts, reveal, Drink
  Card serve-value boosts, customer resolution, Tips tracking, end trigger, and scoring.
- Highest unique serve value resolution, including cancellation of tied values.
- Public serve history used by cautious and adaptive bots to estimate tie risk without reading
  hidden opponent hands or meals.
- Current customer effects from `Rules.md`.
- Deck-specific serve-value bonuses as data-driven rules in `src/game/engine.ts`.
- Strategy diagnostics including win share, Tips paths, and accepted tie risk by policy.
- Per-game `roundResults` containing the customer, all player serve values, cards committed, Drink
  use, Tips eligibility, tie estimate, and winner for every round.

## Current Assumptions

- All recipes have base serve value 1.
- Easy recipes have 0 normal ingredient slots.
- Normal recipes have 1 normal ingredient slot.
- Hard recipes have 2 normal ingredient slots.
- Refresh first draws up to 3 cards without exceeding hand limit 6, then optionally replaces up to
  2 cards.
- Each recipe may also take 1 Flavor Card.
- Drink Cards are played face down with a served meal and add +3 serve value if their requirement
  is met.
- Tips tracking is automated by the first eligible card found in the winning meal.
- The simulator uses selected-player cuisine customers for the shared customer deck.
- Customer shuffle is spread by cuisine to avoid long same-nationality streaks during playtests.

Deck and card definitions live in `src/data/decks.ts` so rule and balance changes are easy to
iterate without changing the simulation engine.

## Validation

```sh
npm test
```
