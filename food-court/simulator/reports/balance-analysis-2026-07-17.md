# Food Court Post-Change Balance Analysis

Date: 2026-07-17

Status: The three second-pass changes recommended in this report were applied to the working tree
later on 2026-07-17 for review. The simulation results below describe the first-pass rules.

## Study Design

This study repeated the seat-balanced baseline methodology after applying the first balance pass:

- 8,400 two-player games: 300 games for each of the 28 unique deck pairings.
- 2,800 four-player games: 40 games for each of the 70 unique four-deck tables.
- Both seat orders were used for every two-player pairing.
- Every deck was rotated through all four seats at every four-player table.
- Greedy, Tips, cautious, and adaptive policies rotated across seats and seeds.
- A fresh base seed of `1700000` was used.

The pre-change comparison is in
[balance-analysis-2026-07-16.md](balance-analysis-2026-07-16.md).

## Changes Tested

- Sakura House Tips Cards must be four different seasonings.
- Jin Long earns a Tips Card after winning with at least 2 rice dishes or at least 2 noodles dishes.
- El Nopalito tracks a hot Ingredient instead of a non-hot Ingredient.

## Aggregate Results

Expected win share is 50% with two players and 25% with four players.

| Deck           | 2P Before | 2P After | Change | 4P Before | 4P After | Change |
|----------------|----------:|---------:|-------:|----------:|---------:|-------:|
| Sakura House   |     65.7% |    63.5% |   -2.2 |     46.4% |    40.0% |   -6.4 |
| Sultan Saray   |     55.0% |    58.0% |   +3.0 |     23.0% |    26.6% |   +3.5 |
| Le Petit Paris |     58.1% |    57.6% |   -0.5 |     26.9% |    26.5% |   -0.4 |
| Liberty Grill  |     51.5% |    50.5% |   -0.9 |     26.0% |    25.5% |   -0.5 |
| Piazza Romana  |     46.5% |    47.8% |   +1.3 |     25.7% |    25.8% |   +0.1 |
| Raj Mahal      |     49.9% |    47.0% |   -2.9 |     32.7% |    32.2% |   -0.5 |
| Jin Long       |     29.1% |    35.2% |   +6.1 |      7.1% |    12.3% |   +5.2 |
| El Nopalito    |     44.2% |    40.3% |   -3.9 |     12.1% |    11.1% |   -1.0 |

The overall extremes narrowed:

- The two-player strongest-to-weakest gap fell from 36.6 to 28.3 percentage points.
- The four-player gap fell from 39.3 to 28.9 percentage points.
- Before the changes, several two-player matchups exceeded 70/30. Afterwards, only Sakura House
  versus Jin Long remained outside that band, at 79.8/20.2.

The game became slightly longer because the Sakura House Tips nerf delayed some End Conditions:

| Metric                      | Before 2P | After 2P | Before 4P | After 4P |
|-----------------------------|----------:|---------:|----------:|---------:|
| Average rounds              |     10.15 |    10.38 |     15.19 |    15.96 |
| Average discarded customers |      1.73 |     1.74 |      1.27 |     1.35 |
| Average score spread        |      9.90 |    10.25 |     16.58 |    16.89 |

## Tips Results

| Deck         | 2P Tips Before | 2P Tips After | 2P Completion Before | After | 4P Tips Before | 4P Tips After | 4P Completion Before | After |
|--------------|---------------:|--------------:|---------------------:|------:|---------------:|--------------:|---------------------:|------:|
| Sakura House |           3.41 |          3.09 |                64.8% | 40.7% |           3.13 |          2.83 |                54.5% | 34.7% |
| Jin Long     |           0.87 |          1.40 |                 0.4% |  2.0% |           0.76 |          1.28 |                 0.6% |  3.5% |
| El Nopalito  |           2.39 |          2.40 |                24.5% | 21.2% |           1.64 |          1.82 |                 7.6% | 10.1% |

Interpretation:

- The Sakura House change successfully reduced Tips completion into a healthier range.
- Jin Long improved, but completing four Tips remains exceptionally rare.
- El Nopalito's hot-Tips alignment slightly improved four-player Tips progress but did not increase
  its win rate.

## Two-Player Matchup Matrix

Each cell is the row deck's score win share against the column deck.

| Deck    | Italy | France | China | India |   USA | Türkiye | Japan | Mexico |
|---------|------:|-------:|------:|------:|------:|--------:|------:|-------:|
| Italy   |     — |  43.5% | 67.8% | 45.7% | 47.5% |   36.7% | 36.0% |  57.3% |
| France  | 56.5% |      — | 63.8% | 59.5% | 65.3% |   48.3% | 43.5% |  66.3% |
| China   | 32.2% |  36.2% |     — | 36.0% | 45.8% |   34.5% | 20.2% |  41.3% |
| India   | 54.3% |  40.5% | 64.0% |     — | 42.7% |   40.0% | 32.5% |  55.0% |
| USA     | 52.5% |  34.7% | 54.2% | 57.3% |     — |   46.8% | 40.0% |  68.3% |
| Türkiye | 63.3% |  51.7% | 65.5% | 60.0% | 53.2% |       — | 52.0% |  60.5% |
| Japan   | 64.0% |  56.5% | 79.8% | 67.5% | 60.0% |   48.0% |     — |  68.8% |
| Mexico  | 42.7% |  33.7% | 58.7% | 45.0% | 31.7% |   39.5% | 31.2% |      — |

## Balance Assessment

### Changes That Worked

Sakura House moved in the intended direction:

- Four-player win share fell by 6.4 points.
- Four-player Tips completion fell by 19.8 points.
- Two-player Tips completion fell by 24.1 points.

Jin Long also moved in the intended direction:

- Two-player win share rose by 6.1 points.
- Four-player win share rose by 5.2 points.
- Average Tips increased by roughly 0.5 in both player counts.

### Changes That Were Insufficient

Sakura House remains too strong at 63.5% in two-player and 40.0% in four-player games. Its Tips
completion is no longer the sole problem. Longer games let it attract more customers: its
four-player average increased from 3.85 to 4.29 customers despite a small reduction in average serve
value.

Jin Long remains too weak at 35.2% in two-player and 12.3% in four-player games. The same-type-pair
Tips requirement is an improvement, but it still normally requires an Order 2 or Order 3 customer
and two matching recipes in hand. Four Tips completion remains only 3.5%.

The El Nopalito change did not improve balance. Win share fell to 40.3% in two-player and 11.1% in
four-player games. Hot-Tips meals were not stronger enough to win more contests, so aligning the
tracking card type did not solve the deck's serve-value disadvantage.

### Decks Close To Target

- Piazza Romana: 47.8% in two-player and 25.8% in four-player.
- Liberty Grill: 50.5% and 25.5%.
- Le Petit Paris: slightly high in two-player at 57.6%, but healthy in four-player at 26.5%.
- Sultan Saray: high in two-player at 58.0%, but healthy in four-player at 26.6%.
- Raj Mahal: healthy in two-player at 47.0%, but still slightly high in four-player at 32.2%.

These decks should remain unchanged until the three extreme decks receive another pass.

## Recommended Second Pass

### Sakura House

Keep the four-different-seasonings Tips restriction and narrow the special ability:

> Gain +1 serve value only if exactly one seasoning Ingredient Card is used in the meal.

The current wording can trigger when several seasonings are used as long as one name occurs exactly
once. The narrower version reduces customer-winning strength while preserving the deck's seasoning
identity.

### Jin Long

Replace the same-type-pair Tips requirement with the stronger fallback:

> After attracting a customer using a rice or noodles dish, use that Recipe Card as a Tips Card.
> Tracked Recipe Cards must alternate between rice and noodles.

This allows Tips progress on Order 1 customers while retaining a sequencing constraint and the
rice/noodles identity.

### El Nopalito

Keep hot Ingredients as Tips Cards and add the previously identified serve-value buff:

> A hot Ingredient added to a Recipe Card with no printed Ingredient slots gains an additional
> +1 serve value.

This improves the exact meals that express the deck's special ability and advance its Tips path,
without strengthening every El Nopalito meal.

## Methodology Checks

Seat balance remained healthy:

| Seat | Four-Player Win Share |
|------|----------------------:|
| 1    |                 24.6% |
| 2    |                 24.8% |
| 3    |                 25.6% |
| 4    |                 25.0% |

Tips and adaptive bots again outperformed greedy and cautious bots, but policy rotation was even
across decks and seats. The deck comparison is therefore not driven by strategy assignment.

Each exact four-player table contains only 40 games, so individual table percentages remain noisy.
Aggregate four-player results contain 1,400 games per deck and are the primary balance signal.
