# Rules of the Game

<!-- TOC -->
* [Rules of the Game](#rules-of-the-game)
  * [Overview](#overview)
  * [Objective](#objective)
  * [Setup](#setup)
  * [Turn Structure](#turn-structure)
  * [Limits And Bonuses](#limits-and-bonuses)
  * [Card Types](#card-types)
    * [Ingredient Cards](#ingredient-cards)
    * [Recipe Cards](#recipe-cards)
    * [Drink Cards](#drink-cards)
    * [Customer Cards](#customer-cards)
    * [Ability Card](#ability-card)
  * [Player Actions](#player-actions)
    * [Fill Hand](#fill-hand)
    * [Prepare Ingredients](#prepare-ingredients)
    * [Cook Dishes](#cook-dishes)
    * [Serve](#serve)
      * [Play Drink Cards](#play-drink-cards)
  * [Winning the Game](#winning-the-game)
  * [Examples](#examples)
  * [Glossary](#glossary)
<!-- TOC -->

## Overview

Each player takes on the role of a restaurant owner competing in a bustling mall food court. Each
restaurant specializes in a unique cuisine, represented by its own deck of cards. These decks
contain ingredients, recipes, drinks, customers, and a deck ability that reflects each restaurant's
theme.

Each player's goal is to prepare delicious dishes, compete for customers by serving them food, and
leverage their deck's unique ability to score the most victory points at the end of the game.

## Objective

The player with the highest score at the end of the game wins.
All scoring comes from attracted customers.
Players compete for customers by serving them cooked dishes.
Drinks are played to attract customers directly from the customer deck.
Tips Cards can end the game early.

## Setup

1. Deck Selection: Each player selects one restaurant deck.
2. Customer Deck:
   - Remove all Customer Cards from the cuisine decks and combine them into a shared customer deck.
   - Shuffle, then draw a central customer queue of face-up cards equal to the number of players.
   - Players place the rest face down as a draw pile next to it.
3. Player Station:
   - Each player places their Ability Card in front of them for reference.
   - Each player places their deck face down as a draw pile and draws 6 cards.
   - Each player reserves space for a discard pile, Tips tracking, an in-play area for
     prepared ingredients and cooked dishes, and a scoring pile for attracted customers.
4. First Player: players choose randomly. Turns proceed clockwise.

The [Examples](#examples) section includes a visual representation of the setup.

## Turn Structure

The game is played in rounds in which all players take a turn. Outside their turn, players cook by
managing their hand, preparing ingredients, and cooking dishes. On their turn, players serve those
dishes to customers to compete for and attract them.

On a player's turn (**Serve**):

- The player may play Drink Cards when their requirements are met.
- The player serves cooked dishes to customers in the central queue.
- If a customer competition resolves, the winner attracts the customer by moving it to their
  scoring pile. Tied customers are discarded.
- After a customer leaves the central queue, players refill the queue from the customer deck,
  if possible, to maintain its size.

Outside a player's turn (**Cook**):

- The player may discard unnecessary cards and fill up their hand.
  See [Fill Hand](#fill-hand).
- The player may prepare ingredients.
  See [Prepare Ingredients](#prepare-ingredients).
- The player may cook dishes by using prepared ingredients.
  See [Cook Dishes](#cook-dishes) and [Recipe Cards](#recipe-cards).

## Limits And Bonuses

The game uses a few simple limits. Symbols on customer cards provide bonuses to these limits while
a player competes for those customers.

- Customer Limit - A player cannot compete for more than 2 customers at the same time.
- Ingredient Limit - How many ingredient cards a player can prepare. Default is 4
  (+2 for each Cutting Board symbol on a customer the player competes for).
- Swap Limit - How many cooked dishes a player can move between customers while serving. Default is
  0 (+1 for each Swap symbol on a customer the player competes for).
- Cooking Limit - How many dishes a player can have cooked. Default is 2
  (+1 for each Cooking Pot symbol on a customer the player competes for).
- Hand Limit - How many cards a player can have at most in hand. Default is 6
  (+1 for each Playing Card symbol on a customer the player competes for).

Bonuses stack. For example, if a player competes for 2 customers with a Cutting Board symbol, they
get +4 Ingredient Limit to a total of 8.

Limits are checked when a player takes the related action. If a symbol bonus later disappears
because a customer competition resolves, the player discards excess cards or dishes.

## Card Types

### Ingredient Cards

Ingredient cards represent the various components needed to cook recipes. They come in three
categories:

- **Primary Ingredients** – Required in every recipe.
- **Secondary Ingredients** – Required in **normal** and **hard** recipes.
- **Optional Ingredients** – Can be added to any recipe to raise its serve value by 1. More than 
  one is allowed.

![image](images/guide_ingredient.png)

Ingredient cards have the following structure:

- **Ingredient Icon** - Represents the type of the ingredient so players can recognize it in
  recipe requirements. Darker border means it is a **primary** ingredient.
- **Ingredient Picture** - A picture of the ingredient.
- **Ingredient Description** - Indicates which recipes the ingredient can be used in.
- **Ingredient Type** - The type of the ingredient (primary, secondary, optional).
- **Ingredient Name** - The name of the ingredient.
- **Special Symbol** - In some decks, the ingredient has a special symbol that can be used as visual
  aid for certain deck mechanics. In the above example it shows that this is a Tagliatelle so the
  player knows if the recipe cooked with it scores extra points for using an exact pasta ingredient.
- **Tips Symbol** - If present it indicates this card can be moved into tracking as a Tips Card.

### Recipe Cards

Recipe cards represent dishes players can cook to serve customers. When a player combines a recipe
with its prepared ingredient cards, it becomes a cooked dish that can be served to customers. Each
recipe has a value that contributes to a player's total serve value when competing for a customer.

![image](images/guide_recipe.png)

Recipe cards have the following structure:

- **Recipe Picture** - A picture of the dish.
- **Recipe Type** - The difficulty of the recipe (easy, normal, hard).
- **Recipe Name** - The name of the dish.
- **Ingredient Requirements** - The ingredients needed to cook the recipe.
- **Special Symbol** - In some decks, the recipe has a special symbol that is used for their special
  ability. In the above example it shows that this recipe is a Main course recipe.
- **Serve Value & Bonus** - Shows the recipe’s serve value and whether a deck’s special ability
  or any optional ingredients grant an extra +1 serve value in specific situations when serving.
- **Tips Symbol** - If present it indicates this card can be moved into tracking as a Tips Card.

### Drink Cards

Drink cards are played by meeting their requirement. When played, the player immediately puts the
top card from the customer deck into their scoring pile, attracting that customer without
competition.
The drink card is discarded after use.

![image](images/guide_drinks.png)

Drink cards have the following structure:

- **Drink Name** - The name of the drink.
- **Drink Symbol** - Indicates that this is a drink card.
- **Drink Picture** - A picture of the drink.
- **Requirement** - The condition a player must meet to put the drink card into play.

### Customer Cards

Customer cards represent diners in a shared central queue. Each customer has a Base Value (1-4)
showing how many cooked dishes each competing player must serve to them and a Tips Value (1-3)
that can be gained only when the player has at least that many Tips Cards in tracking.

When a customer competition resolves, each player calculates total serve value from:

- using the recipes' serve value
- any bonuses from special abilities
- any bonuses from optional ingredients
- +1 bonus from the customer nationality (if the same as the player's deck)

At the end of the game, attracted customers are used for scoring. Each attracted customer scores 
its Base Value plus its Tips Value if the player has at least that many Tips Cards in tracking.

![image](images/guide_customer.png)

Customer cards have the following structure:

- Base Value - The number of cooked dishes each competing player must serve to compete for the
  customer (1-4). Also used for scoring as the base VP the customer provides.
- Tips Value - (1-3) Tips VP gained only if the player has at least that many Tips Cards in
  tracking.
- Nationality - The customer’s nationality.
- Symbol - The symbol that indicates the bonus a player gains when competing for that customer:
  Cutting Board for Ingredient Limit, Cooking Pot for Cooking Limit, Swap for Swap Limit, or
  Playing Cards for Hand Limit.

For limits and turn flow, see [Limits and Bonuses](#limits-and-bonuses) and
[Turn Structure](#turn-structure).

See [Decks](Decks.md) for specific configurations.

### Ability Card

Each deck includes an Ability Card that outlines:

- The deck's unique special ability.
- How to track Tips.

Players use this to guide their strategy and scoring plan.

Note: Special abilities are evaluated only in the context of a customer (from the dishes served to
a specific customer).

Example: If a player uses the French deck (where the special ability is entrée + appetizer = +1 and
appetizer + main = +1), and has 4 cooked dishes: 2 entrée, 1 appetizer and 1 main, then serving
the 2 entrée and the appetizer recipes scores +1 serve value only once because the appetizer can
only be used in one special ability occurrence and the main course was not served.

## Player Actions

### Fill Hand

Outside their turn, a player may discard any number of cards and then draw up to their hand limit.
If the draw pile is empty, the player reshuffles the discard pile as draw pile and continues.

### Prepare Ingredients

Outside their turn, a player may put ingredient cards in play up to the ingredient limit. They
now count as prepared and unused (available for cooking dishes).

### Cook Dishes

A player cooks a dish by using prepared, unused ingredients along with a recipe to fulfill its
requirements.

- Ingredients are arranged in a column.
- The matching recipe card is placed on top of the stack.

![image](images/guide_cooking.png)

The above picture demonstrates that the player may do one of the following:

- Prepare 1 primary and 1 secondary ingredient, then cook 1 normal dish.
- Prepare 2 primary ingredients, then cook 1 easy dish.

### Serve

When a player serves, they place one or more of their cooked dishes next to a customer card. The
first competing player chooses either the left or right side of that customer card; the second
competing player uses the opposite side.

A player's side of a customer is complete when the number of served cooked dishes on that side
equals the customer's Base Value. A player cannot serve more cooked dishes to a customer than that
customer's Base Value.

Before serving a dish, a player may move already served cooked dishes between unresolved customers
they compete for, up to their Swap Limit. After a swap, no customer may have more served dishes on
that player's side than its Base Value.

If a customer already has a competing player on one side, the next competing player places served
dishes on the empty side. If both competing players have served the number of cooked dishes the
customer requires, players compare their total serve value to determine which player wins the
competition. The player with the higher total serve value attracts the customer by moving it to
their scoring pile. If there is a tie, the customer is discarded and no one attracts it.

When a customer is attracted or discarded, all cooked dishes used to compete for that customer are
discarded. If a player attracts the customer, they may move 1 eligible Tips Card that participated
in serving that customer into tracking.

A player must serve a customer if it is possible to do so. Serving is possible when the player has
cooked dishes and either:

- the player is already competing for a customer where they have not met its Base Value yet; or
- the player is below the Customer Limit and there is a customer with fewer than 2 players competing
  for it.

#### Play Drink Cards

A player may play Drink Cards when their requirements are met to immediately attract the top card
from the customer deck. See [Drink Cards](#drink-cards).

## Winning the Game

The game ends after the round in which either a player gets 4 tips (puts 4 Tips Cards into tracking)
or the customer deck is emptied (discarded customers due to ties are not reused).
Players must finish the current round (everyone gets to play their turn).

After the game ends, each player sums Victory Points (VP) from their attracted customers using
their Base Value and Tips Value as described under [Customer Cards](#customer-cards). The player
with the highest total VP wins.

Tiebreaker: the player who most recently cooked a real-life dish wins.

## Examples

![image](images/guide_table.png)

In this 4-player game example only one player station and the central queue is shown:

- The visible player is using the **Piazza Romana** deck.
- They have 2 Tips Cards in tracking (2 more needed).
- They have 3 prepared ingredients: 1 primary, 1 secondary, 1 optional.
- They have cooked 2 dishes: 1 easy, 1 normal.
- The central queue shows 4 customers.

If the player serves now, they may place cooked dishes to the left or right of a customer that has
room for another competitor. Once two players have each served enough dishes to match that
customer's Base Value, the higher total serve value wins. The winner attracts the customer, moves
it to their scoring pile, and the central queue is then refilled.

## Glossary

- Serve Value: The value on recipes used when serving customers. Optional ingredients and special
  abilities may add +1 serve value in specific situations.
- Base Value: The number on a customer (1-4) indicating how many cooked dishes each competing
  player must serve to compete for them.
- Tips Value: Extra VP (1-3) a customer provides at end of game when the player has at least that
  many Tips Cards in tracking.
- Central Queue: The shared row of face-up customers sized to the number of players.
- Attracted Customers: Customers a player has moved to their scoring pile by winning a competition
  or playing a drink.
- End Condition: A deck-specific condition to track Tips that ends the game when 4 Tips Cards are
  put into tracking.
