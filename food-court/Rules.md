# Rules of the Game

<!-- TOC -->
* [Rules of the Game](#rules-of-the-game)
  * [Overview](#overview)
  * [Objective](#objective)
  * [Setup](#setup)
  * [Turn Structure](#turn-structure)
  * [Limits](#limits)
  * [Card Types](#card-types)
    * [Ingredient Cards](#ingredient-cards)
    * [Recipe Cards](#recipe-cards)
    * [Drink Cards](#drink-cards)
    * [Customer Cards](#customer-cards)
    * [Ability Card](#ability-card)
  * [Player Actions](#player-actions)
    * [Fill Hand](#fill-hand)
    * [Prepare](#prepare)
    * [Cook](#cook)
    * [Serve](#serve)
      * [Play Drink Cards](#play-drink-cards)
      * [Play Utensil Cards](#play-utensil-cards)
  * [Winning the Game](#winning-the-game)
  * [Examples](#examples)
  * [Glossary](#glossary)
<!-- TOC -->

## Overview

You take on the role of a restaurant owner competing in a bustling mall food court. Each
restaurant specializes in a unique cuisine, represented by its own deck of cards. These decks
contain ingredients, recipes, drinks, utensils, events and customers that reflect each restaurant's 
theme.

Your goal is to prepare delicious meals, attract and serve customers, and leverage your deck’s
unique ability to score the most victory points at the end of the game.

## Objective

Have the highest score at the end of the game.
All scoring comes from served customers - each customer has a base value (1–4).
Served customers also give bonuses to preparation, cooking or serving actions.
Recipes are served to attract customers for scoring.
Drinks are played to serve customers directly from their deck.
End Condition cards can end the game early.

## Setup

1. Deck Selection: Each player selects one restaurant deck.
2. Customer Deck:
    - Remove all Customer Cards from the cuisine decks and combine them into a shared customer deck.
    - Shuffle, then draw a central customer queue of a number of face‑up cards equal to the number 
   of players. Place the rest face down as a draw pile next to it.
3. Your Station:
    - Place your Ability Card in front of you.
    - Place your deck face down as a draw pile; draw 6 cards.
    - Reserve space for a discard pile, End Condition cards in tracking, an in‑play area
      for recipes/drinks/utensils, and a scoring pile for served customers.
4. First Player: choose randomly. Turns proceed clockwise.

Check the [Examples](#examples) section for a visual representation of the setup.

## Turn Structure

The game is played in rounds in which all players take a turn. 

On your turn:

1. Play cards from your hand up to the play limit to do any of the following (see
   [Player Actions](#player-actions) and [Limits](#limits) for details):
   - Cook Recipes using prepared ingredients. See [Cook](#cook) and [Recipe Cards](#recipe-cards).
   - Play Drink Cards when their requirements are met (to serve a customer directly from the 
   customer deck). See [Play Drink Cards](#play-drink-cards).
2. Serve: 
   - Serve customers a number of cooked recipes equal to the customer's base value. Calculate total 
   points based on special ability and total recipes value. Move served customers to your scoring 
   pile. See [Serve Customers](#serve-customers).
   - After a customer is served, immediately refill the central queue from the customer deck, 
   if possible, to maintain its size.
   - When you serve a recipe to a customer you gain its bonus based on the utensil symbol on it.
   See [Customer Cards](#customer-cards).
   - If you met your special ability condition, you may put one End Condition card into tracking.
   See [Ability Card](#ability-card).

Outside your turn you:
- discard unnecessary cards and fill up your hand. See [Fill Hand](#fill-hand).
- prepare ingredients. See [Prepare](#prepare).

## Limits

The game uses a few simple limits. Utensil symbols on customer cards can increase these limits 
while the customers are being served and the bonuses stack:

- Preparation Limit (How much ingredient cards you can have prepared): Default is 3 
(+1 for each Kitchenware utensil symbol).
- Cooking Limit (How much recipe cards you can have cooked): Default is 2 (+1 for each Cookware
utensil symbol).
- Serving Limit (How many cards you can have at most in your hand): 6 customers (+1 for each
Tableware utensil in play).

## Card Types

### Ingredient Cards

Ingredient cards represent the various components needed to cook recipes. They come in three
categories:

- **Primary Ingredients** – Required in every recipe.
- **Secondary Ingredients** – Required in **normal** and **hard** recipes.
- **Optional Ingredients** – Can be added to any recipe to raise its serve value by 1. More than one
is allowed.

![image](images/guide_ingredient.png)

Ingredient cards have the following structure:

- **Ingredient Icon** - Represents the type of the ingredient so you can recognize it in
  recipe requirements. Darker border means it is a **primary** ingredient.
- **Ingredient Picture** - A picture of the ingredient.
- **Ingredient Description** - Tells you which recipes the ingredient can be used in.
- **Ingredient Type** - The type of the ingredient (primary, secondary, optional).
- **Ingredient Name** - The name of the ingredient.
- **Special Symbol** - In some decks, the ingredient has a special symbol that can be used as visual
  aid for certain deck mechanics. In the above example it tells you that this is a Tagliatelle
  so you know if the recipe cooked with it scores extra points for using exact pasta ingredient.
- **End Condition Symbol** - If present it indicates this card can be used to track the end
  condition for the deck.

### Recipe Cards

Recipe cards represent dishes you cook to serve customers. Each recipe has a serve value that
contributes towards covering a customer’s base value (e.g., easy=1, normal=2). Recipes themselves
do not score directly.

![image](images/guide_recipe.png)

Recipe cards have the following structure:

- **Recipe Picture** - A picture of the dish.
- **Recipe Type** - The difficulty of the recipe (easy, normal, hard).
- **Recipe Name** - The name of the dish.
- **Ingredient Requirements** - The ingredients needed to cook the recipe.
- **Special Symbol** - In some decks, the recipe has a special symbol that is used for their special
  ability. In the above example it tells you that this recipe is a Main course recipe.
- **Serve Value & Bonus** - Shows the recipe’s serve value and whether your deck’s special ability
  or any optional ingredients grant an extra +1 serve value in specific situations when serving.
- **End Condition Symbol** - If present it indicates this card can be used to track the end
  condition of the deck.

### Drink Cards

Drink cards are played by meeting their requirement. When put in play, you may immediately put the
top card from the customer deck to your scoring pile (serving it without covering its base value). 
The drink card is discarded after use.

![image](images/guide_drinks.png)

Drink cards have the following structure:

- **Drink Name** - The name of the drink.
- **Drink Symbol** - Indicates that this is a drink card.
- **Drink Picture** - A picture of the drink.
- **Requirement** - The condition you must meet to put the drink card into play.

### Customer Cards

Customer cards represent diners in a shared central queue. Each customer has a base value (1–4) 
showing how much cooked recipes must be served to them to attract them for scoring and bonus value
(1-3) that can be gained based on how many End Condition Cards were put into tracking.
For each customer 2 players must compete by serving cooked recipes. When both players served the 
number of cooked recipes the customer requires each player calculates the total amount of points 
they generated by:

- using the recipes' base value
- any bonuses from special abilities
- any bonuses from optional ingredients
- +1 bonus from the customer nationality (if the same as the player's deck)
 
The player with more points moves the customer to their scoring pile. 
If there is a tie, the customer is discarded and no one scores.
At the end of the game, served customers are used for scoring.

![image](images/guide_customer.png)

Customer cards have the following structure:

- Base Value - The amount of cooked recipes that need to be served to attract the customer (1–4).
- Bonus Value - (1-3) Bonus VP for the amount of end condition cards in tracking up to the shown 
amount (i.e. two medal symbols means the customer can score up to +2VP if the player put 2 End
Condition cards in tracking).
- Nationality - The customer’s nationality.
- Utensil Symbol - The symbol that indicates the bonus you get when serving a recipe to that 
customer.

For serve limit and turn flow, see [Limits](#limits) and [Turn Structure](#turn-structure).

See [Decks](Decks.md) for specific configurations.

### Ability Card

Each deck includes an Ability Card that outlines:

– The deck’s unique special ability.
– The End Condition and how to track it.

Use this to guide your strategy and scoring plan.

Note: Special abilities are evaluated only in the context of a customer (from the recipes served to 
a customer).

Example: If you play with the French deck (where the special ability is entrée + appetizer = +1 and
appetizer + main = +1), and you have 4 cooked recipes: 2 entrée, 1 appetizer and 1 main, and you 
decide to serve the 2 entrée and the appetizer recipes, you score +1 serve value only once because 
the appetizer can only be used in one special ability occurrence and the main course was not served.

## Player Actions

### Fill Hand

Outside your turn, you may discard any number of cards and then draw up to your hand limit. 
If the draw pile is empty, reshuffle the discard pile as draw pile and continue. 

### Prepare

Outside your turn, you may put ingredient cards in play up to your preparation limit. They now count
as prepared and unused (available for cooking recipes).

### Cook

Use prepared, unused ingredients to fulfill a recipe’s requirements:

- Ingredients are arranged in a column.
- The matching recipe card is placed on top of the stack.

![image](images/guide_cooking.png)

The above picture demonstrates that the player can do one of the following:

- Prepare 1 primary and 1 secondary ingredient and cook 1 normal recipe.
- Prepare 2 primary ingredients and cook 1 easy recipe.

### Serve

When a player serves, they move one or more of their cooked recipes to a customer.
If a customer's value is fully covered by both players competing for them, compare the points to 
determine who gets to move the customer to their scoring pile. 
When a player wins a customer, they may move 1 End Condition card (that participated in serving that 
customer) into tracking. All other cards used to serve the customer are discarded.

A player must serve a customer if it's possible to do so i.e. they have cooked recipes and there is
a customer that do not have 2 players competing for it yet or there is a customer they are already 
competing for that they haven't met their base value yet.

#### Play Drink Cards

You may play Drink Cards when their requirements are met to immediately attract the top card from 
the customer deck. See [Drink Cards](#drink-cards).

## Winning the Game

The game ends after the round in which either a player puts 4 End Condition cards into tracking or
the customer deck is emptied (discarded customers due to ties are not reused). 
Players must finish the current round (everyone gets to play their turn).

After the game ends, sum Victory Points (VP) from your served customers using their Base and Bonus
values as described under [Customer Cards](#customer-cards). The player with the highest total VP wins.

Tiebreaker: the player who most recently cooked a real-life meal wins.

## Examples

![image](images/guide_table.png)

In this 4‑player game example only one player station and the central queue is shown:

- The visible player is using the **Piazza Romana** deck.
- They have 2 End Condition cards in tracking (2 more needed).
- They have 3 prepared ingredients: 1 primary, 1 secondary, 1 optional.
- They have cooked 2 recipes: 1 easy, 1 normal.
- The central queue shows 4 customers.

If the player serves now and fully covers a customer’s base value with cooked serve value, they
move that customer to their scoring pile and the central queue is then refilled. Any End Condition 
cards in tracking will help score bonus points for end‑game scoring.

## Glossary

- Serve Value: The value on recipes used when serving customers. Optional ingredients and special
  abilities may add +1 serve value in specific situations.
- Base Value: The number on a customer (1–4) indicating how much serve value must be allocated in a
  single turn to serve them.
- Bonus Value: Extra value a customer provides at end of game based on End Condition cards in 
  tracking and mood/personality matches. 
- Central Queue: The shared row of face‑up customers sized (players + 1).
- Served Customers: Customers you have moved to your scoring pile by serving them from the central 
  queue or via drinks/events.
- End Condition: A deck-specific condition that, when achieved, ends the game and the number of 
  cards used for its tracking may appear as customer bonus point prerequisites.
