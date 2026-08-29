# Food Court Simulator

Local-only, headless balance-analysis tooling for Food Court.

> **Rules compatibility:** The simulator models the v0.15.0 Promotion Card rules.

## Automated Playtests

Run headless bot simulations:

```sh
npm run sim -- --games 10 --players 4 --decks italy,france,china,india --seed 1000
```

Run the exhaustive balance study across all 28 two-player matchups, all 56 three-player tables, and
all 70 four-player tables:

```sh
npm run balance -- --games2 300 --games3 90 --games4 40 --workers 4 --seed 700000
```

The balance study prints compact JSON containing aggregate deck performance, every matchup/table,
customer-effect usage, nationality impact, strategy performance, and seat diagnostics.

Useful options:

- `--games <n>` controls how many full games are simulated.
- `--players <n>` supports 2-4 players.
- `--decks <ids>` chooses comma-separated cuisine ids.
- `--seed <n>` sets the base seed; game `i` uses `seed + i`.
- `--policy <name>` chooses `greedy`, `promotions`, `cautious`, `adaptive`, or `mixed`.
- `--json` prints machine-readable results, including every player's decision and serve value for
  every round of every game.

Bot policies:

- `greedy` maximizes immediate serve value.
- `promotions` values Promotion-eligible meals and conserves cards that protect end-game bonuses.
- `cautious` uses previously revealed serve values to avoid historically common ties and conserves
  cards when extra value is unlikely to help.
- `adaptive` balances serve value, Promotion progress, tie risk, open bidding, and cards in hand.
- `mixed` assigns all four policies across seats and rotates them by seed. This is the default and
  is the preferred mode for deck balance work.

Refresh decisions are policy-aware. Bots can use the French full-hand redraw before reaching an
empty-recipe hand, discard cards based on deck-specific Promotion paths, and account for customer effects
when choosing how many cards to commit. When two meals have the same serve value, bots prefer the
meal that gains more from the active customer effect and conserves more cards.

## What It Models

- 2-4 player setup with selected cuisine decks.
- Seeded player decks and shared customer deck.
- One active customer contested by all players in each of 10 rounds.
- Refresh discard and draw limits, recipe serving, ingredient and flavor boosts, reveal, Drink
  Card serve-value boosts, customer resolution, Promotion tracking, and scoring.
- Open Promotion bidding at tied values, including raising, matching, withdrawing, spent-card discard,
  and cancellation when the tie persists.
- Seeded bid initiative so the first opportunity to raise is not fixed to seat order.
- Public serve history used by cautious and adaptive bots to estimate tie risk without reading
  hidden opponent hands or meals.
- Current customer effects from `Rules.md`.
- Deck-specific serve-value bonuses as data-driven rules in `src/game/engine.ts`.
- Strategy diagnostics including win share, Promotion paths, accepted tie risk, and bid spending by policy.
- Per-game `roundResults` containing the customer, all player serve values, cards committed, Drink
  use, Promotion eligibility, bid spending, tie estimate, and winner for every round.

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
- After a customer is attracted, each eligible non-winner may track one eligible card, up to the
  3-card maximum; bot policies may decline and choose which eligible card to track.
- Bot policies make open raise/match/withdraw decisions and choose which committed Promotion Card
  to discard.
- Customer Order Value is also its Promotion threshold and grants exactly +1 bonus VP when met.
- The simulator uses selected-player cuisine customers for the shared customer deck.
- The full shared customer deck is uniformly shuffled with no nationality-spacing rule, but the
  game ends after resolving 10 customers; the remaining cards are unused.

Deck and card definitions live in `src/data/decks.ts` so rule and balance changes are easy to
iterate without changing the simulation engine.

## Validation

```sh
npm test
```
