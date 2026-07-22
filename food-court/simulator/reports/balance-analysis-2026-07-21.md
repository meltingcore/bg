# Food Court Balance Analysis: Latest Decks

Date: 2026-07-21

## Conclusion

The latest adjustments are the strongest balance state measured so far. Four-player balance is now
healthy across all eight decks, and two-player balance has only one matchup just outside the target
band. No broad deck change is justified from this run alone.

Recommended action: keep the current deck definitions for the next live playtest and repeat the
simulation with another seed before making further changes. Watch Sakura House and El Nopalito in
two-player games, Piazza Romana in two-player games, and Raj Mahal and Le Petit Paris at the edges
of the four-player range.

## Study Design

- 8,400 two-player games: 300 games for every one of the 28 unique deck pairings.
- 2,800 four-player games: 40 games for every one of the 70 unique four-deck tables.
- Both seat orders were used for every two-player pairing.
- Every deck was rotated through all four seats at every four-player table.
- Greedy, Tips, cautious, and adaptive bot policies rotated across seats and seeds.
- The bots evaluated the active customer's effect each round when choosing hands and meals.
- Fresh base seed: `2700000`.

The simulator was aligned to the current deck wording before this run:

- Jin Long gains +1 serve value for every pair of recipes in the meal and earns a Tips Card only
  after winning with a same-type rice or noodles pair.
- El Nopalito may use at most two hot Ingredients in a meal; hot Ingredients on zero-slot recipes
  gain +1 serve value.

## Aggregate Results

Expected win share is 50% with two players and 25% with four players. The working target bands are
43-57% for two players and 18-32% for four players.

| Deck           | 2P Win Share | 2P Avg VP | 4P Win Share | 4P Avg VP | Assessment               |
|----------------|-------------:|----------:|-------------:|----------:|--------------------------|
| Sakura House   |        58.9% |     17.49 |        31.2% |     14.90 | Mildly high in 2P        |
| El Nopalito    |        58.5% |     16.94 |        25.1% |     13.24 | Mildly high in 2P        |
| Le Petit Paris |        51.5% |     16.59 |        19.5% |     12.87 | Healthy; low edge in 4P  |
| Sultan Saray   |        51.2% |     16.71 |        21.1% |     12.86 | Healthy                  |
| Liberty Grill  |        49.2% |     14.55 |        23.5% |     11.96 | Healthy                  |
| Raj Mahal      |        44.7% |     14.57 |        31.6% |     13.75 | Healthy; high edge in 4P |
| Jin Long       |        44.6% |     14.81 |        24.3% |     14.27 | Healthy                  |
| Piazza Romana  |        41.3% |     14.81 |        23.6% |     12.37 | Mildly low in 2P         |

The two-player strongest-to-weakest spread is 17.6 percentage points. The four-player spread is 12.1
points, with every deck inside the target band.

| Metric                      | Two Players | Four Players |
|-----------------------------|------------:|-------------:|
| Average rounds              |       10.31 |        16.08 |
| Average discarded customers |        1.64 |         1.24 |
| Average score spread        |        9.90 |        16.73 |
| Average drinks used         |        1.84 |         6.06 |

## Two-Player Matchups

Each cell is the row deck's score win share against the column deck.

| Deck    | Italy | France | China | India |   USA | Türkiye | Japan | Mexico |
|---------|------:|-------:|------:|------:|------:|--------:|------:|-------:|
| Italy   |     - |  37.0% | 51.8% | 44.5% | 42.0% |   44.2% | 32.8% |  37.0% |
| France  | 63.0% |      - | 39.2% | 60.0% | 67.8% |   45.3% | 42.0% |  42.8% |
| China   | 48.2% |  60.8% |     - | 41.5% | 49.7% |   50.0% | 27.8% |  34.2% |
| India   | 55.5% |  40.0% | 58.5% |     - | 39.3% |   41.8% | 38.2% |  39.5% |
| USA     | 58.0% |  32.2% | 50.3% | 60.7% |     - |   55.0% | 45.5% |  43.0% |
| Türkiye | 55.8% |  54.7% | 50.0% | 58.2% | 45.0% |       - | 48.5% |  46.3% |
| Japan   | 67.2% |  58.0% | 72.2% | 61.8% | 54.5% |   51.5% |     - |  47.3% |
| Mexico  | 63.0% |  57.2% | 65.8% | 60.5% | 57.0% |   53.7% | 52.7% |      - |

Only Sakura House versus Jin Long falls outside the 30-70% matchup target, at 72.2-27.8. It is a
narrow miss rather than a systemic counter pattern. El Nopalito has no matchup above 66%, despite
its elevated aggregate win share.

## Tips Performance

| Deck           | 2P Avg Tips | 2P Completion | 4P Avg Tips | 4P Completion |
|----------------|------------:|--------------:|------------:|--------------:|
| Sakura House   |        3.06 |         39.9% |        2.66 |         27.5% |
| El Nopalito    |        2.98 |         41.9% |        2.48 |         26.7% |
| Le Petit Paris |        2.22 |         18.7% |        1.63 |         11.4% |
| Sultan Saray   |        2.59 |         24.2% |        2.12 |         16.1% |
| Liberty Grill  |        3.07 |         48.1% |        2.53 |         31.3% |
| Raj Mahal      |        2.98 |         45.1% |        2.87 |         43.0% |
| Jin Long       |        1.46 |          2.1% |        1.53 |          5.7% |
| Piazza Romana  |        2.32 |         21.6% |        2.18 |         22.3% |

Jin Long's win share is now healthy even though its Tips End Condition remains exceptionally rare.
Its recipe-pair ability supplies enough customer-winning strength, so further buffs would risk
overcorrecting the deck. The low Tips completion is still worth watching as an experience and deck
identity issue.

Raj Mahal has the highest four-player Tips completion and sits at the top of the four-player win
range. This is not yet outside target, but it is the clearest deck to monitor for a future small
nerf if the result repeats.

## Customer Effects

The bots reconsidered the active customer effect every round. Every effect was used at a measurable
rate, confirming that the simulation did not treat customers as scoring-only cards.

| Customer Effect         | 2P Use or Trigger Rate | 2P Avg Value | 4P Use or Trigger Rate | 4P Avg Value |
|-------------------------|-----------------------:|-------------:|-----------------------:|-------------:|
| Italy hand limit        |                  30.2% |            - |                  24.8% |            - |
| France redraw           |                  16.0% |            - |                  21.5% |            - |
| China recipe-pair bonus |                  77.4% |        +1.16 |                  76.6% |        +1.14 |
| India vegetarian bonus  |                  27.1% |        +0.27 |                  27.7% |        +0.28 |
| USA ingredient bonus    |                  80.6% |        +1.17 |                  78.3% |        +1.13 |
| Türkiye recipe bonus    |                  26.8% |        +0.27 |                  46.8% |        +0.47 |
| Japan seasoning bonus   |                  22.7% |        +0.23 |                  23.2% |        +0.23 |
| Mexico hot bonus        |                  73.0% |        +0.91 |                  69.6% |        +0.84 |

The China, USA, and Mexico effects are the most frequently exploitable. India and Japan are more
conditional but still trigger in roughly one quarter of opportunities. France's redraw and Italy's
hand-limit choice are also being exercised rather than ignored.

## Seat And Strategy Checks

- Two-player seats split exactly 50.0-50.0.
- Four-player seats won 25.3%, 25.1%, 22.8%, and 26.9% of games respectively.
- In two-player games, Tips and adaptive policies won 59.8% and 57.5%; greedy and cautious won 43.8%
  and 38.9%.
- In four-player games, the same policies won 28.0%, 27.3%, 22.7%, and 22.1% respectively.

Policy assignment was rotated evenly, so the strategy difference does not favor a particular deck.

## Recommendation

Do not make another broad balance pass yet. The current rules fixed the severe four-player problems
and brought almost every two-player matchup inside the target band. Another global buff or nerf
could easily repair one player count while damaging the other.

For the next validation cycle:

1. Repeat this full study with a different seed to check whether the edge results persist.
2. In live two-player tests, prioritize Sakura House versus Jin Long and games involving Piazza
   Romana or El Nopalito.
3. In live four-player tests, watch Raj Mahal's Tips race and Le Petit Paris's ability to keep pace.
4. Record whether Jin Long's low Tips completion feels frustrating even when its overall win rate is
   fair.

Exact four-player table results use only 40 games per combination and remain noisy. The aggregate
four-player deck results use 1,400 appearances per deck and are the stronger signal.
