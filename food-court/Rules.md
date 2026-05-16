# Rules of the Game

<!-- TOC -->
* [Rules of the Game](#rules-of-the-game)
  * [Overview](#overview)
  * [Objective](#objective)
  * [Setup](#setup)
  * [Round Structure](#round-structure)
  * [Serve Value](#serve-value)
  * [Ties And Drink Cards](#ties-and-drink-cards)
  * [Card Types](#card-types)
    * [Recipe Cards](#recipe-cards)
    * [Ingredient Cards](#ingredient-cards)
    * [Drink Cards](#drink-cards)
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

1. **Refresh Hands** - Each player may discard up to 3 cards, then draw up to their hand limit.
   The default hand limit is 6 unless a card effect changes it. If the draw pile is empty, the
   player reshuffles their discard pile as a new draw pile and continues drawing.
2. **Serve Dishes** - Each player may secretly serve a meal of a number of Recipe Cards from their 
   hand as cooked dishes up to the active customer's Order Value.
3. **Add Ingredients** - Players may add Ingredient Cards to a recipe for bonus points based
   on its ingredient requirements. Ingredients are optional boosts, not required costs.
4. **Reveal** - All players reveal their served dishes at the same time.
5. **Calculate Serve Value** - Each player totals the serve value of their revealed meal.
6. **Play Drink Cards** - Tied players may play Drink Cards to try to break ties.
7. **Determine Winner** - The highest unique serve value wins the customer. See
   [Ties And Drink Cards](#ties-and-drink-cards).
8. **Cleanup** - Served dishes, added ingredients, and played drinks are discarded. The winner
   moves the attracted customer to their scoring pile and may move 1 eligible Tips Card used in
   that contest into tracking.
9. **Reveal Next Customer** - Reveal the next customer from the customer deck, if possible.

## Serve Value

A player's serve value is the total value of their served meal.

Recipe values:

- Easy recipe: 1 serve value.
- Normal recipe: 2 serve value.
- Hard recipe: 3 serve value.

Easy recipes gain +1 serve value if at least 1 non-easy recipe is served with them.

Added ingredients:

- Easy recipes have 0 normal ingredient slots.
- Normal recipes have 1 normal ingredient slot.
- Hard recipes have 2 normal ingredient slots.
- Any recipe may also have 1 Optional Ingredient added to it.

Ingredient values:

- Primary Ingredient: +1 serve value.
- Secondary Ingredient: +1 serve value.
- Optional Ingredient: +2 serve value.

A recipe cannot use more ingredients than its slots allow unless a card ability says otherwise.
After recipe and ingredient values are counted, apply the active customer's effect and each player's
deck ability.

## Ties And Drink Cards

After meals are revealed, any player whose serve value is tied with another player's serve value may
play 1 Drink Card from hand. A played Drink Card adds +1 serve value for that contest and is then
discarded.

After any Drink Cards are played, determine the winner:

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

Recipe cards represent dishes players serve to compete for customers. Each recipe has a difficulty:
easy, normal, or hard and ingredient requirements. Difficulty determines the recipe's base serve 
value. Ingredient requirements determine how many and what type of ingredients can be added to that 
recipe.

Some recipes also have deck-specific symbols, such as pasta type, meal course, food type (rice, 
noodles, kebab, etc.). These tags are used by deck abilities or for Tips tracking.

### Ingredient Cards

Ingredient cards are optional boosts that can be added to recipes when serving a dish.

- **Primary Ingredients** add +1 serve value.
- **Secondary Ingredients** add +1 serve value.
- **Optional Ingredients** add +2 serve value and may be added to any recipe.

Some decks care about specific ingredients. For example, the Italian deck cares about
exact pasta ingredients, while the Japanese deck cares about ginger, umami, and wasabi.

### Drink Cards

Drink Cards are reactive tie-breakers. After reveal, if a player is tied with at least one other
player, they may play 1 Drink Card from hand to add +1 serve value for that contest.

Drink Cards are discarded after use.

### Customer Cards

Customer cards represent diners in the food court. Each customer has:

- **Order Value** - The maximum number of recipes each player may serve to that customer. It is
  also the customer's base VP at end game.
- **Tips Value** - Extra VP gained only if the player has at least that many Tips Cards in
  tracking.
- **Nationality** - Determines the customer's printed effect.
- **Effect** - A deck-agnostic bonus that applies to every player competing for that customer.

### Ability Card

Each deck includes an Ability Card that outlines:

- The deck's unique special ability.
- How to track Tips Cards.

Special abilities are evaluated only from the recipes and ingredients served to the active
customer.

## Customer Effects

Customer effects are printed on customer cards and apply to all players.

- **Italian Customer** - If you serve at least 1 dish with an ingredient, gain +1 serve value.
- **French Customer** - If you serve at least 1 dish with all of its ingredients filled, gain +1 
  serve value.
- **Chinese Customer** - Easy recipes gain +1 serve value.
- **Indian Customer** - Secondary Ingredients add +1 serve value.
- **American Customer** - Easy recipes gain +1 serve value for each non-easy recipe served with
  them instead of just once.
- **Turkish Customer** - Gain +1 serve value if you have fewer Tips Cards in tracking than at
  least one opponent.
- **Japanese Customer** - Hard recipes gain +1 serve value.
- **Mexican Customer** - Normal recipes gain +1 serve value.

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
- **Order Value** - The number on a customer showing both the recipe capacity for that contest and
  the customer's base VP.
- **Dish** - A served Recipe Card, with any ingredients added to it.
- **Meal** - All dishes a player serves to the active customer in one contest.
- **Serve Value** - The total value of a player's revealed meal after recipe values, ingredient
  values, customer effects, deck abilities, and drinks are counted.
- **Tips Cards** - Deck-specific cards moved into tracking after winning a customer. Tips Cards can
  increase customer scoring and end the game.
