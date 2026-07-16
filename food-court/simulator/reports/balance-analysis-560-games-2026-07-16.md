# Food Court Balance Analysis - 560 Games

Generated: 2026-07-16

## Method

- Simulator: current greedy automated simulator.
- Player count: 4.
- Games per pass: 560.
- Table coverage: all 70 possible four-deck combinations.
- Repetitions: 8 games per combination, including four seat rotations.
- Exposure: 280 games per deck and 120 shared games per deck pair.
- Seeds: 20000-20559 for both the current-rules and proposed-rules passes.
- Proposed changes were tested in an isolated copy under `/private/tmp`; repository rules and
  simulator code were not changed.

At a 25% expected win share and 280 appearances, ordinary binomial sampling error is about 2.6
percentage points, or roughly +/-5.1 points for a 95% interval. The proposed 23.0%-27.3% spread is
therefore inside normal sample noise.

## Results

| Deck           | Current Win | Proposed Win | Current Score | Proposed Score | Current Tips | Proposed Tips |
|----------------|------------:|-------------:|--------------:|---------------:|-------------:|--------------:|
| Piazza Romana  |        7.3% |        23.0% |          9.45 |          12.14 |         1.10 |          1.87 |
| Le Petit Paris |       33.9% |        24.6% |         15.97 |          13.81 |         2.04 |          1.82 |
| Jin Long       |       10.5% |        24.8% |         10.18 |          11.25 |         0.71 |          2.56 |
| Raj Mahal      |       13.2% |        27.3% |         10.20 |          12.60 |         1.66 |          2.32 |
| Liberty Grill  |       42.5% |        23.2% |         19.32 |          14.64 |         2.62 |          2.00 |
| Sultan Saray   |       30.5% |        26.3% |         14.87 |          13.80 |         2.31 |          2.20 |
| Sakura House   |       17.1% |        23.6% |         11.30 |          12.06 |         2.01 |          2.18 |
| El Nopalito    |       44.8% |        27.1% |         16.96 |          14.90 |         2.97 |          2.26 |

Average game length changed from 17.71 rounds to 16.16 rounds. Average discarded customers changed
from 1.96 to 1.59 per game.

## Tested Deck Changes

### Piazza Romana

Replace the three pasta Ingredient Cards that have no matching recipe:

- Remove Campanelle, Gnocchi, and Ravioli.
- Add one additional Spaghetti, Fettuccine, and Tagliatelle.
- Final pasta counts: Spaghetti 2, Fettuccine 2, Tagliatelle 2, Lasagna Sheets 1, Penne 1.

Change the ability to:

> Dishes served with their exact pasta Ingredient Card gain +2 serve value.

Keep Tips tracking unchanged. This preserves the exact-match puzzle while removing three cards that
cannot currently activate the ability or become Tips Cards.

### Le Petit Paris

Change the ability to:

> Each adjacent course pair served in the same meal gains +1 serve value, to a maximum of +2 per
> meal.

Keep card counts, Drinks, and Tips tracking unchanged. A +1 cap was tested and was too severe;
retaining up to two pairs produced a 24.6% win share.

### Jin Long

Keep the ability and card counts unchanged. Change Tips tracking to:

> After attracting a customer using at least one rice or noodles dish, use one rice or noodles
> Recipe Card from that meal as a Tips Card.

The simulator already treats Lo Mein as noodles. `Decks.md` omits the `(noodles)` label, so that is
a documentation mismatch rather than a new balance change.

### Raj Mahal

Change the seven spice cards from five unique names to seven unique names:

- Cumin 1
- Saffron 1
- Coriander 1
- Cinnamon 1
- Cardamom 1
- Turmeric 1
- Clove 1

Change the ability to:

> Each served dish with at least one spice Ingredient Card gains +1 serve value.

Keep unique-spice Tips tracking unchanged. This improves both contest strength and the availability
of four different Tips Cards without changing deck size.

### Liberty Grill

Change the ability to:

> Once per meal, add 1 Ingredient Card to a dish above its printed ingredient limit.

Change two Drinks:

- Coke: require at least 2 burger dishes.
- Bourbon: require at least 2 steak dishes.
- Root Beer: unchanged.

Limiting the extra ingredient alone still produced a 36.1% win share. Tightening the two order-1
Drink triggers was also necessary; the combined change produced 23.2%.

### Sultan Saray

Make no deck change. Its current 30.5% result fell to 26.3% once the stronger and weaker decks were
adjusted. Nerfing it directly would overreact to the current field imbalance.

### Sakura House

Change the ability to:

> If a meal contains at least 2 Recipe Cards and at least one seasoning Ingredient Card, gain +1
> serve value. Also gain +1 for each pair of different seasoning Ingredient Cards used in the meal.

Keep card counts, Drinks, and Tips tracking unchanged. An unconditional first-seasoning bonus was
tested and raised Japan to 33.8%; the two-recipe condition produced 23.6%.

### El Nopalito

Reduce hot Ingredient Cards from 6 to 5 while keeping the total deck size unchanged:

- Cayenne Pepper 3
- Jalapeno 2
- Other unnamed Ingredient Cards 6 instead of 5
- Avocado remains 2

Change the ability to:

> The first hot Ingredient Card used in a meal gains +1 serve value. Up to 2 hot Ingredient Cards
> can be added to dishes in a meal.

Add this Tips restriction:

> No more than 2 Tips Cards may have the same hot Ingredient name.

Four hot cards was tested and reduced Mexico to 13.6%; five cards produced 27.1%.

## Residual Matchups

The global rates are balanced, but two pairings remain outside a preferred 40%-60% score-share
band:

| Deck           | Opponent      | Score Share | Average Score Delta | Shared Games |
|----------------|---------------|------------:|--------------------:|-------------:|
| Le Petit Paris | Liberty Grill |       65.4% |               +4.28 |          120 |
| El Nopalito    | Piazza Romana |       62.9% |               +5.63 |          120 |

These should be observed in live play before adding matchup-specific exceptions. The highest-unique
serve rule can turn small serve-value differences into nonlinear results, so direct counters are
more likely to create new problems than solve these two pairings.

## Simulator Limits

- The greedy bot maximizes immediate serve value and does not intentionally pursue future Tips.
- It plays a Drink only when the requirement is already satisfied, so Drink success is always 100%.
- It uses the French full-hand redraw only when it has no Recipe Cards, which understates strategic
  mulligan use.
- Customer shuffling is spread by cuisine rather than being fully unconstrained.
- The simulator cannot model bluffing, deliberate tie avoidance, hand-reading, or the real-life
  tiebreaker.

The proposed package should therefore be treated as a strong playtest candidate, not mathematical
proof. The large current-rules gaps are robust; the exact final percentages should be validated with
human games.
