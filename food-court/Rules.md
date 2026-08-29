# Rules of the Game

<!-- TOC -->
* [Rules of the Game](#rules-of-the-game)
  * [Overview](#overview)
  * [Objective](#objective)
  * [Setup](#setup)
  * [Round Structure](#round-structure)
  * [Serve Value](#serve-value)
  * [Drink Cards](#drink-cards)
  * [Ties](#ties)
  * [Promotion Cards](#promotion-cards)
  * [Card Types](#card-types)
    * [Recipe Cards](#recipe-cards)
    * [Ingredient Cards](#ingredient-cards)
    * [Flavor Cards](#flavor-cards)
    * [Drink Cards](#drink-cards-1)
    * [Customer Cards](#customer-cards)
    * [Ability Card](#ability-card)
  * [Customer Effects](#customer-effects)
  * [Winning the Game](#winning-the-game)
  * [Glossary](#glossary)
<!-- TOC -->

## Overview

Each player takes on the role of a restaurant owner competing in a bustling mall food court. Each
restaurant specializes in a unique cuisine, represented by its own deck of cards. These decks
contain recipes, ingredients, drinks, customers, and an ability that reflects the restaurant's
theme.

Each round, a customer appears in the middle of the table. All players may secretly serve a meal for
that customer at the same time. Players reveal their cooked dishes, calculate serve value, and the 
highest unique serve value attracts the customer.

## Objective

The player with the highest score at the end of the game wins.
All scoring comes from attracted customers.
Promotion Cards can increase customer scoring or be spent to resolve tied contests.

## Setup

1. Deck Selection: Each player selects one restaurant deck.
2. Customer Deck:
   - Remove all Customer Cards from the restaurant decks and combine them into a shared customer
     deck.
   - Shuffle the customer deck and place it face down in the middle of the table.
   - Reveal the top customer as the active customer.
3. Player Station:
   - Each player places their Ability Card in front of them for reference.
   - Each player places their remaining deck face down as a draw pile and draws 6 cards.
   - Each player reserves space for a discard pile, up to 3 Promotion Cards in tracking, and a
     scoring pile for attracted customers.

## Round Structure

Each round is a simultaneous contest for the active customer.

1. **Refresh Hands** - Each player may first draw up to 3 cards without exceeding their hand limit.
   Then, they may replace up to 2 cards from their hand by discarding those cards and drawing the
   same number of new cards. The default hand limit is 6 unless a card effect changes it. If the
   draw pile is empty, the player reshuffles their discard pile as a new draw pile and continues
   drawing.
2. **Serve Dishes** - Each player may secretly serve a meal of a number of Recipe Cards from their 
   hand as cooked dishes up to the active customer's Order Value.
3. **Add Cards** - Players may add extra ingredients and flavor to recipes for bonus points.
   Each Recipe Card states whether it can take 0, 1, or 2 Ingredient Cards. A player who served at 
   least 1 Recipe Card may also add up to 1 Drink Card face down with their meal.
4. **Reveal** - All players reveal their served cards at the same time.
5. **Calculate Serve Value** - Each player totals the serve value of their revealed meal.
6. **Resolve Ties** - Players tied at a serve value may openly bid Promotion Cards. After bidding,
   the highest unique serve value attracts the customer. See [Ties](#ties).
7. **Award Customer And Promotions** - The winner moves the attracted customer to their scoring
   pile. Each non-winning player may then move up to 1 eligible card used in their meal into
   Promotion tracking, to a maximum of 3 Promotion Cards. If no customer was attracted, nobody
   tracks a Promotion Card.
8. **Cleanup** - Served dishes, added cards, and played drinks are discarded. Cards moved into
   Promotion tracking are not discarded.
9. **Reveal Next Customer** - If fewer than 10 customers have been resolved, reveal the next
   customer from the customer deck.

## Serve Value

A player's serve value is the total value of their served meal, formed by Recipe Cards, added
Ingredient Cards, added Flavor Cards, valid Drink Cards, customer effects, and the player's deck
ability.

A Recipe Card may have 0, 1, or 2 Ingredient Cards added as extra to it. Each Recipe Card may also
have 1 Flavor Card added to it.

Served dish difficulty:

- Easy dish: 0 Ingredient Cards added.
- Normal dish: 1 Ingredient Card added.
- Hard dish: 2 Ingredient Cards added.

Card values:

- Recipe Card: +1 serve value.
- Ingredient Card: +1 serve value.
- Flavor Card: +2 serve value.
- Drink Card: +3 serve value if its requirement is met.

A Recipe Card cannot have more Ingredient Cards added than its printed number unless a card ability
says otherwise. Flavor Cards do not count when determining whether a served dish is easy, normal,
or hard.
After recipe, ingredient, flavor, and valid drink values are counted, apply the active customer's
effect and each player's deck ability.

## Drink Cards

When serving, each player who served at least 1 Recipe Card may include up to 1 Drink Card face
down with their meal. Drink Cards are revealed with the rest of the meal. If the Drink Card's
requirement is met, it adds +3 serve value for that contest.

Drink Card requirements check only the revealed Recipe Cards, Ingredient Cards, and Flavor Cards.
If a revealed Drink Card's requirement is not met, it adds no serve value and is still discarded
during cleanup.

## Ties

After serve values are calculated, check values from highest to lowest.

- A unique serve value attracts the customer.
- If a serve value is tied, any player in that tie may raise by spending 1 Promotion Card from
  tracking, adding +1 to that player's serve value for the contest. Each other player still in the
  tie must either spend 1 Promotion Card to match or withdraw from that tie.
- If every remaining player matches, any remaining player may raise again. Bidding continues until
  only 1 player remains or no player raises while the bids are equal.
- If only 1 player remains, that player attracts the customer.
- If nobody raises or the remaining bids stay equal, the tie persists. Ignore all players still in
  that tie and continue checking the next highest serve value.
- All Promotion Cards bid are spent and moved to their owners' discard piles, including cards bid
  by players who withdraw or remain tied.
- If every competing serve value is tied, the customer is discarded.
- If no player served any recipes, the customer is discarded.

## Promotion Cards

Promotion Cards represent eligible items from unchosen meals that losing restaurants promote to
attract future customers. The winning restaurant serves its meal to the attracted customer instead.

After a customer is attracted, each non-winning player may track 1 eligible Recipe Card or
Ingredient Card used in their meal as a Promotion Card. Each restaurant deck defines which cards
are eligible. A player who did not serve an eligible card cannot track a Promotion Card that round.
The winner cannot track a Promotion Card, and nobody tracks one if the customer was discarded.

A player may have at most 3 Promotion Cards in tracking. Tracking is optional. A tracked card is
removed from the meal before cleanup and kept face up in the player's Promotion area. When a
Promotion Card is spent during bidding, it moves to its owner's discard pile and no longer counts
for customer scoring. It may be drawn and tracked again after the discard pile is reshuffled.

## Card Types

### Recipe Cards

Recipe Cards represent dishes players serve to compete for customers. Each Recipe Card states
whether it can take 0, 1, or 2 extra Ingredient Cards. All recipes have the same base serve value
of 1. A served dish's difficulty is determined by how many Ingredient Cards were added to it:
0 for easy, 1 for normal, or 2 for hard.

Some recipes also have deck-specific symbols, such as pasta type, meal course, food type (rice,
noodles, kebab, etc.). These tags are used by deck abilities or Promotion eligibility.

### Ingredient Cards

Ingredient Cards are extra additions to recipes. Each Ingredient Card added to a recipe gives that
dish +1 serve value and increases its difficulty.

Some Ingredient Cards have deck-specific tags used by abilities or Promotion eligibility. For
example, the Italian deck cares about exact pasta Ingredient Cards, the Indian deck cares about
spice Ingredient Cards, and the Mexican deck cares about hot Ingredient Cards.

### Flavor Cards

Flavor Cards are extra boosts that can be added to any recipe when serving a dish. Each recipe may
have up to 1 Flavor Card. Flavor Cards add +2 serve value and do not change dish difficulty.

### Drink Cards

Drink Cards are conditional boosts played face down with a meal. A player may play up to 1 Drink
Card if they served at least 1 Recipe Card. A revealed Drink Card adds +3 serve value for that
contest if its requirement is met.

### Customer Cards

Customer Cards represent people choosing among the food court's restaurants. Each customer has:

- **Order Value** - The maximum number of recipes each player may serve to that customer. It is
  also the customer's base VP and the number of Promotion Cards needed for its +1 VP bonus at end
  game.
- **Nationality** - Determines the customer's printed effect.
- **Effect** - A deck-agnostic bonus that applies to every player competing for that customer.

### Ability Card

Each deck includes an Ability Card that outlines:

- The deck's unique special ability.
- Which cards are eligible for Promotion tracking.

Special abilities are evaluated only from the Recipe Cards, Ingredient Cards, and Flavor Cards
served to the active customer.

## Customer Effects

Customer effects are printed on customer cards and apply to all players.

- **Italian Customer** - Players hand limit is increased to 8 when refreshing.
- **French Customer** - After the initial Refresh draw, players may replace their whole hand.
- **Chinese Customer** - Easy dishes gain +1 serve value.
- **Indian Customer** - A pair of added ingredients add +1 serve value.
- **American Customer** - Gain +1 serve value for each pair of cards in hand.
- **Turkish Customer** - Gain +1 serve value if you have fewer Promotion Cards in tracking than at
  least one opponent.
- **Japanese Customer** - Hard dishes gain +1 serve value.
- **Mexican Customer** - Normal dishes gain +1 serve value.

## Winning the Game

The game ends after resolving the 10th customer. Any Customer Cards still in the shared customer
deck are left unused and do not score.

After the game ends, each player sums VP from attracted customers. Each attracted customer scores
its Order Value plus 1 VP if the player has Promotion Cards in tracking equal to or greater than
that Order Value.

The player with the highest total VP wins.

Tiebreaker: the player who most recently cooked a real-life dish wins.

## Glossary

- **Active Customer** - The face-up customer all players may compete for this round.
- **Attracted Customer** - A customer a player has won and moved to their scoring pile.
- **Order Value** - The number on a customer showing the recipe limit for that contest, the
  customer's base VP, and the Promotion Cards required for its +1 VP bonus.
- **Dish** - A served Recipe Card, with any Ingredient Cards or Flavor Card added to it.
- **Dish Difficulty** - Whether a served dish is easy, normal, or hard, based on whether it has 0,
  1, or 2 Ingredient Cards added to it.
- **Meal** - All dishes a player serves to the active customer in one contest.
- **Serve Value** - The total value of a player's revealed meal after recipe, ingredient, flavor,
  customer effect, deck ability, and drink values are counted.
- **Promotion Card** - An eligible card from a non-winning meal moved into tracking after another
  player attracts the customer. A player may track at most 3 Promotion Cards. They may be spent to
  bid during tied contests or kept to increase customer scoring.
