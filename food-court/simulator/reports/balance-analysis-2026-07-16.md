# Food Court Balance Analysis

Date: 2026-07-16

Status: The three first-pass changes recommended in this report were applied to the working tree on
2026-07-17 for review. The simulation results below describe the rules before those changes.

## Study Design

The final study simulated 11,200 games with the mixed bot policy:

- 8,400 two-player games: 300 games for each of the 28 unique deck pairings.
- 2,800 four-player games: 40 games for each of the 70 unique four-deck tables.
- Every two-player pairing was run in both seat orders.
- Every deck at each four-player table was rotated through all four seats.
- Greedy, Tips, cautious, and adaptive policies rotated across seats and seeds.
- Base seed: `700000`.

The bots evaluate the active customer effect while selecting every meal. Equal-value meals prefer
more customer-effect value and fewer spent cards. French redraw and Italian hand-limit usage are
also tracked.

The simulator was first aligned with the latest lists and abilities in `Decks.md`:

- Jin Long now tags Congee as rice and Lo Mein as noodles, and scores same-type recipe pairs.
- Raj Mahal now has two copies of each of the six spices, includes Chicken Curry, and scores
  distinct pairs of different Ingredient Cards.
- Liberty Grill now allows two above-limit Ingredient Cards across the whole meal.
- Sakura House now has five other Ingredients and two each of Umami, Wasabi, Ginger, and Garlic.

## Interpretation Assumptions

- Three same-type Jin Long recipes contain three pairs and therefore give +3.
- Three different Raj Mahal Ingredient names contain three distinct pairs and therefore give +3.
- Liberty Grill may place both above-limit Ingredient Cards on one dish or split them across dishes.
- Sakura House Tips Cards may repeat a seasoning name because `Decks.md` does not require them to
  be different.

These assumptions should be confirmed before adopting balance changes because the pair-counting
interpretations materially affect Jin Long and Raj Mahal.

## Aggregate Results

The expected win shares are 50% in two-player games and 25% in four-player games.

| Deck           | 2P Win | 2P VP | 2P Tips | 2P Tips Complete | 4P Win | 4P VP | 4P Tips | 4P Tips Complete |
|----------------|-------:|------:|--------:|-----------------:|-------:|------:|--------:|-----------------:|
| Sakura House   |  65.7% | 16.62 |    3.41 |            64.8% |  46.4% | 14.69 |    3.13 |            54.5% |
| Raj Mahal      |  49.9% | 14.87 |    3.07 |            48.2% |  32.7% | 12.93 |    2.72 |            38.0% |
| Le Petit Paris |  58.1% | 17.11 |    2.29 |            19.3% |  26.9% | 13.83 |    1.77 |            14.9% |
| Liberty Grill  |  51.5% | 14.51 |    3.07 |            46.5% |  26.0% | 11.96 |    2.55 |            31.4% |
| Piazza Romana  |  46.5% | 15.23 |    2.39 |            24.8% |  25.7% | 12.57 |    2.18 |            23.1% |
| Sultan Saray   |  55.0% | 17.10 |    2.63 |            24.6% |  23.0% | 12.76 |    2.13 |            16.4% |
| El Nopalito    |  44.2% | 14.47 |    2.39 |            24.5% |  12.1% |  9.72 |    1.64 |             7.6% |
| Jin Long       |  29.1% | 11.16 |    0.87 |             0.4% |   7.1% |  8.64 |    0.76 |             0.6% |

Other table-level results:

| Metric                      | 2 Players | 4 Players |
|-----------------------------|----------:|----------:|
| Average rounds              |     10.15 |     15.19 |
| Average discarded customers |      1.73 |      1.27 |
| Average score spread        |      9.90 |     16.58 |
| Average Drinks played       |      1.83 |      5.80 |

## Two-Player Matchup Matrix

Each cell is the row deck's score win share against the column deck.

| Deck    | Italy | France | China | India |   USA | Türkiye | Japan | Mexico |
|---------|------:|-------:|------:|------:|------:|--------:|------:|-------:|
| Italy   |     — |  40.7% | 74.7% | 38.7% | 45.0% |   39.3% | 30.0% |  57.3% |
| France  | 59.3% |      — | 72.5% | 58.5% | 62.8% |   48.5% | 40.2% |  64.7% |
| China   | 25.3% |  27.5% |     — | 25.8% | 38.5% |   37.3% | 15.7% |  33.5% |
| India   | 61.3% |  41.5% | 74.2% |     — | 41.7% |   42.8% | 35.5% |  52.5% |
| USA     | 55.0% |  37.2% | 61.5% | 58.3% |     — |   47.5% | 38.0% |  62.7% |
| Türkiye | 60.7% |  51.5% | 62.7% | 57.2% | 52.5% |       — | 47.5% |  53.0% |
| Japan   | 70.0% |  59.8% | 84.3% | 64.5% | 62.0% |   52.5% |     — |  66.8% |
| Mexico  | 42.7% |  35.3% | 66.5% | 47.5% | 37.3% |   47.0% | 33.2% |      — |

The clearest matchup signals are:

- Sakura House wins every pairing and is at least 59.8% against every deck except Sultan Saray.
- Jin Long loses every pairing and falls to 15.7% against Sakura House.
- Le Petit Paris is broadly strong in two-player games, especially against Jin Long and El
  Nopalito, but falls behind Sakura House.
- El Nopalito is competitive with Italy, India, and Türkiye, but struggles badly against France,
  USA, and Japan.

## Customer-Effect Usage

Bots demonstrably changed their play around every active customer:

| Customer Effect              |                    4P Trigger or Usage Rate | Average Serve Value Added |
|------------------------------|--------------------------------------------:|--------------------------:|
| Italian hand limit           |       Hand exceeded 6 in 24.9% of decisions |            Refresh effect |
| French redraw                | Full-hand redraw used in 21.1% of decisions |            Refresh effect |
| Chinese easy-dish bonus      |             Triggered in 77.5% of decisions |                    +1.156 |
| Indian Ingredient-pair bonus |             Triggered in 28.6% of decisions |                    +0.291 |
| American cards-in-hand bonus |             Triggered in 78.3% of decisions |                    +1.129 |
| Turkish catch-up bonus       |             Triggered in 47.4% of decisions |                    +0.474 |
| Japanese hard-dish bonus     |             Triggered in 22.6% of decisions |                    +0.228 |
| Mexican normal-dish bonus    |             Triggered in 69.4% of decisions |                    +0.841 |

The customer effects do create deck-specific advantages, but they do not explain the largest
balance gaps:

- Sakura House receives only +0.228 on average from Japanese customers, so its dominance comes
  primarily from its deck and Tips path rather than its nationality effect.
- Jin Long uses the Chinese easy-dish effect well, averaging +1.314 when it appears, but remains
  weak because its own Tips path rarely progresses.
- Liberty Grill benefits most from Indian and Japanese customers because its extra Ingredient
  capacity creates pairs and hard dishes more easily. Its overall win share remains close to the
  target, so this interaction does not currently require a change.

## Strategy And Seat Checks

After rotating deck order, seat results are close to neutral:

| Seat | 4P Win Share |
|------|-------------:|
| 1    |        25.7% |
| 2    |        24.8% |
| 3    |        24.8% |
| 4    |        24.7% |

Tips and adaptive bots outperform greedy and cautious bots:

| Policy   | 2P Win | 4P Win |
|----------|-------:|-------:|
| Greedy   |  43.6% |  22.1% |
| Tips     |  58.2% |  28.0% |
| Cautious |  40.8% |  22.8% |
| Adaptive |  57.3% |  27.1% |

Strategies rotate evenly, so this does not bias deck comparisons. It does show that pursuing Tips
is a central part of successful play under the current scoring and End Condition.

## Recommended Balance Changes

### 1. Nerf Sakura House Tips Tracking

Recommended first change:

> Tips Cards must be four different seasoning Ingredients.

Why:

- Sakura House completes four Tips in 64.8% of two-player games and 54.5% of four-player games.
- The next-highest four-player completion rate is Raj Mahal at 38.0%.
- Sakura House's average serve value is not exceptional; the excessive strength is concentrated
  in Tips progression and Tips scoring.
- Requiring different seasoning names preserves the deck's current ability and ingredient counts
  while directly targeting the measured advantage.

Do not nerf the Japanese customer effect or special ability in the first pass.

### 2. Rework Jin Long Tips To Match Its Ability

Recommended first change:

> Attract a customer using at least two rice dishes or at least two noodles dishes in the same meal,
> then use one of those Recipe Cards as a Tips Card.

Why:

- Jin Long completes four Tips in only 0.4% of two-player games and 0.6% of four-player games.
- Its current Tips requirement wants a rice-and-noodles pair, while its ability rewards same-type
  pairs. The deck asks the player to pursue two conflicting meal patterns.
- Aligning Tips with the same-type-pair ability keeps the Order 2+ restriction, but makes a
  Tips-eligible meal more likely to have enough serve value to win.

If the completion rate remains below roughly 15% after retesting, use the stronger fallback:

> Track a rice or noodles Recipe after any win, but tracked recipes must alternate between rice and
> noodles.

### 3. Align El Nopalito Tips With Hot Ingredients

Recommended first change:

> Attract a customer using a dish with a hot Ingredient Card and use that hot Ingredient as a Tips
> Card.

Why:

- El Nopalito falls from 44.2% in two-player games to 12.1% in four-player games.
- Its ability and two Drinks encourage hot Ingredients, while its Tips path requires non-hot
  Ingredients. Its strongest meals do not advance its scoring engine.
- Moving Tips to hot Ingredients improves internal synergy without adding automatic serve value.

Do not initially require four different hot Ingredients. Add that restriction only if the first
retest overshoots.

If this Tips alignment is insufficient, the next measured buff should be:

> A hot Ingredient added to a recipe with no printed Ingredient slots gains an additional +1 serve
> value.

### 4. Hold Other Decks For The Next Pass

- Raj Mahal is high in four-player games at 32.7%, but exactly balanced in two-player games at
  49.9%. Its relative share may fall naturally after Sakura House is nerfed and the two weakest
  decks are improved.
- Le Petit Paris is high in two-player games at 58.1% but close to target in four-player games at
  26.9%. Do not change it until the extreme decks are corrected.
- Piazza Romana, Liberty Grill, and Sultan Saray are currently within a reasonable first-pass
  balance band across the two player counts.

If Raj Mahal remains above 30% in the next four-player study, clarify or cap its ability:

> Gain at most +2 serve value from distinct Ingredient pairs per meal.

## Suggested Retest Targets

After applying the three first-pass changes, rerun the same study and target:

- Two-player aggregate win share between 43% and 57% for every deck.
- Four-player aggregate win share between 18% and 32% for every deck.
- No isolated two-player matchup below 30% or above 70%.
- Tips completion between roughly 15% and 45%.
- Seat win shares within 3 percentage points of the player-count baseline.

The exact-table four-player samples are only 40 games each, so use them to find repeated matchup
patterns rather than treating a single table's percentage as precise. The aggregate four-player
deck results each contain 1,400 games and are the more reliable balance signal.
