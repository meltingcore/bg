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
Tips Cards can increase customer scoring and can end the game early.

## Setup

1. Deck Selection: Each player selects one restaurant deck.
2. Customer Deck:
   - Remove all Customer Cards from the cuisine decks and combine them into a shared customer deck.
   - Shuffle the customer deck and place it face down in the middle of the table.
   - Reveal the top customer as the active customer.
3. Player Station:
   - Each player places their Ability Card in front of them for reference.
   - Each player places their remaining deck face down as a draw pile and draws 6 cards.
   - Each player reserves space for a discard pile, Tips Cards in tracking, and a scoring pile for
     attracted customers.

## Round Structure

Each round is a simultaneous contest for the active customer.

1. **Refresh Hands** - Each player may discard up to 1 card, then draw up to 3 cards if below their
   hand limit and without exceeding it. The default hand limit is 6 unless a card effect changes it. 
   If the draw pile is empty, the player reshuffles their discard pile as a new draw pile and 
   continues drawing.
2. **Serve Dishes** - Each player may secretly serve a meal of a number of Recipe Cards from their 
   hand as cooked dishes up to the active customer's Order Value.
3. **Add Cards** - Players may add extra ingredients and flavor to recipes for bonus points.
   Each Recipe Card states whether it can take 0, 1, or 2 Ingredient Cards. A player who served at 
   least 1 Recipe Card may also add up to 1 Drink Card face down with their meal.
4. **Reveal** - All players reveal their served cards at the same time.
5. **Calculate Serve Value** - Each player totals the serve value of their revealed meal.
6. **Determine Winner** - The highest unique serve value wins the customer. See also [Ties](#ties).
7. **Cleanup** - Served dishes, added cards, and played drinks are discarded. The winner
   moves the attracted customer to their scoring pile and may move 1 eligible Tips Card used in
   that contest into tracking.
8. **Reveal Next Customer** - Reveal the next customer from the customer deck, if possible.

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
- Primary Ingredient: +1 serve value.
- Secondary Ingredient: +1 serve value.
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

After serve values are calculated, determine the winner:

- The highest unique serve value wins the customer.
- If the highest serve value is tied, all players tied at that value are ignored.
- Continue checking the next highest serve value until a unique value is found.
- If every competing serve value is tied, the customer is discarded.
- If no player served any recipes, the customer is discarded.

Example:

```text
Italy: 7
France: 7
China: 5
Mexico: 4
```

Italy and France cancel each other out because they are tied at the highest value. 
China wins with 5.

## Card Types

### Recipe Cards

Recipe Cards represent dishes players serve to compete for customers. Each Recipe Card states
whether it can take 0, 1, or 2 extra Ingredient Cards. All recipes have the same base serve value
of 1. A served dish's difficulty is determined by how many Ingredient Cards were added to it:
0 for easy, 1 for normal, or 2 for hard.

Some recipes also have deck-specific symbols, such as pasta type, meal course, food type (rice, 
noodles, kebab, etc.). These tags are used by deck abilities or for Tips tracking.

### Ingredient Cards

Ingredient Cards are extra additions to recipes. Each Ingredient Card added to a recipe gives that
dish +1 serve value and increases its difficulty.

Some decks care about specific Ingredient Cards. For example, the Italian deck cares about exact
pasta Ingredient Cards, while the Japanese deck cares about ginger, umami, and wasabi.

### Flavor Cards

Flavor Cards are extra boosts that can be added to any recipe when serving a dish. Each recipe may
have up to 1 Flavor Card. Flavor Cards add +2 serve value and do not change dish difficulty.

### Drink Cards

Drink Cards are conditional boosts played face down with a meal. A player may play up to 1 Drink
Card if they served at least 1 Recipe Card. A revealed Drink Card adds +3 serve value for that
contest if its requirement is met.

### Customer Cards

Customer cards represent diners in the food court. Each customer has:

- **Order Value** - The maximum number of recipes each player may serve to that customer. It is
  also the customer's base VP at end game.
- **Tips Value** - Extra VP gained at end game only if the player has at least that many Tips Cards 
  in tracking.
- **Nationality** - Determines the customer's printed effect.
- **Effect** - A deck-agnostic bonus that applies to every player competing for that customer.

### Ability Card

Each deck includes an Ability Card that outlines:

- The deck's unique special ability.
- How to track Tips Cards.

Special abilities are evaluated only from the Recipe Cards, Ingredient Cards, and Flavor Cards
served to the active customer.

## Customer Effects

Customer effects are printed on customer cards and apply to all players.

- **Italian Customer** - Players hand limit is increased to 8 when refreshing.
- **French Customer** - Players can discard their hand and draw new one when refreshing.
- **Chinese Customer** - Easy dishes gain +1 serve value.
- **Indian Customer** - A pair of added ingredients add +1 serve value.
- **American Customer** - Gain +1 serve value for each pair of cards in hand.
- **Turkish Customer** - Gain +1 serve value if you have fewer Tips Cards in tracking than at
  least one opponent.
- **Japanese Customer** - Hard dishes gain +1 serve value.
- **Mexican Customer** - Normal dishes gain +1 serve value.

## Winning the Game

The game ends after resolving a round in which either a player gets 4 Tips Cards in tracking or the
customer deck is emptied.

After the game ends, each player sums VP from attracted customers. Each attracted customer scores
its Order Value. It also scores its full Tips Value if the player has Tips Cards in tracking equal
to or greater than that Tips Value.

The player with the highest total VP wins.

Tiebreaker: the player who most recently cooked a real-life dish wins.

## Glossary

- **Active Customer** - The face-up customer all players may compete for this round.
- **Attracted Customer** - A customer a player has won and moved to their scoring pile.
- **Order Value** - The number on a customer showing both the recipe limit for that contest and
  the customer's base VP.
- **Dish** - A served Recipe Card, with any Ingredient Cards or Flavor Card added to it.
- **Dish Difficulty** - Whether a served dish is easy, normal, or hard, based on whether it has 0,
  1, or 2 Ingredient Cards added to it.
- **Meal** - All dishes a player serves to the active customer in one contest.
- **Serve Value** - The total value of a player's revealed meal after recipe, ingredient, flavor,
  customer effect, deck ability, and drink values are counted.
- **Tips Cards** - Deck-specific cards moved into tracking after winning a customer. Tips Cards can
  increase customer scoring and end the game.
