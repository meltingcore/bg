# Rules of the Game

<!-- TOC -->
* [Rules of the Game](#rules-of-the-game)
  * [Overview](#overview)
  * [Objective](#objective)
  * [Setup](#setup)
  * [Turn Structure](#turn-structure)
    * [Perform One Main Action](#perform-one-main-action)
    * [Additional Actions](#additional-actions)
  * [Card Types](#card-types)
    * [Ingredient Cards](#ingredient-cards)
    * [Recipe Cards](#recipe-cards)
    * [Drink Cards](#drink-cards)
    * [Event Cards](#event-cards)
    * [Customer Cards](#customer-cards)
    * [Ability Card](#ability-card)
  * [Player Actions](#player-actions)
    * [Fill Hand](#fill-hand)
    * [Cook](#cook)
    * [Serve](#serve)
    * [Attract Customers](#attract-customers)
    * [Play Event Cards](#play-event-cards)
    * [Play Drink Cards](#play-drink-cards)
  * [Winning the Game](#winning-the-game)
  * [Examples](#examples)
<!-- TOC -->

## Overview

Players take on the role of restaurant owners competing in a bustling mall food court. Each
restaurant specializes in a unique cuisine, represented by its own deck of cards. These decks
contain ingredients, recipes, abilities, and customers that reflect each restaurant's theme.

The goal is to prepare and serve delicious meals, attract customers, and leverage unique abilities
to earn the most Victory Points (VP) before the game ends.

## Objective

Players aim to score the highest number of Victory Points (VP) at the end of the game.
All VP come from attracted customers: each customer scores its base value (1–4) plus any extra
value granted by meeting the card’s depicted requirements. Recipes enable you to attract customers 
and drinks, utensils and end condition cards satisfy their extra requirements;

## Setup

1. **Deck Selection:** Each player selects one restaurant deck.
2. **Customer Deck:**
    - Remove all customer cards from the player decks and combine them into a shared customer deck.
    - Shuffle, then deal 1 face‑up customer to each player (start their personal queue).
    - Reveal 2 face‑up customers in the center as the **central queue**; place the rest face down
      as a draw pile.
3. **Player Station Setup:**
    - Place the **Ability Card** in front of the player.
    - Place the player deck face down as a draw pile; draw 6 cards (hand limit).
    - Reserve space for a **discard pile**, **End Condition cards in tracking**, an **in‑play area**
      for recipes/drinks/utensils, and a spot for **attracted customers** as scoring pile.
4. Choose **First Player:** randomly. Turns proceed clockwise.

Check the [Examples](#examples) section for a visual representation of the setup.

## Turn Structure

Game is played in rounds in which all players take a turn. When not taking a turn, a player may 
discard up to 3 cards then draw to their hand limit (6 by default).

On your turn:

1. Take 1 customer from the central queue and add it to the right of your personal queue. Then 
   refill the central queue from the deck if possible).
2. Put up to 3 cards into play:
   - prepare ingredients
   - cook recipes, 
   - serve drinks, 
   - trigger events
   - put utensils
3. Serve cooked recipes to attract customers by covering their base values in full.
4. End of turn: 
   - If your customer queue is empty draw 1 customer from the central queue
   - If your customer queue is full move the leftmost customer in your queue to the end of the queue
   of the player on your left.

### Actions

Players spend most of their turn playing different type of cards as follows:

- Prepare Ingredients - put ingredient cards into play as prepared but unused.
- Cook Recipes - put recipes cards into play by covering its ingredient requirements from the 
  prepared and unused ones. For example to put normal recipe into play you need to have 1 primary
  and 1 secondary ingredient.
- Serve Recipes - allocate cooked recipe value to customers in your queue to attract them. For
  example to attract a customer with base value 2 you can serve 2 easy recipes (1+1), 1 normal
  recipe (2), or any other combination that sums to 2 or more. When serving discard the cooked 
  recipes used to attract customers (along with their ingredients) and move those customers to your
  attracted customers pile.
- Serve Drinks - put drink cards into play when their prerequisites are met to attract all customers
  directly from your queue. Drinks stay in play until end of game for scoring purposes and activate
  (attract all from queue) each time their requirement is met.
- Trigger Events - play event cards to manipulate customer queues.
- Put Utensils - if you serve 2 recipes with the same utensil symbol in a single turn, you may put 
  the matching utensil card into play. Utensils stay in play until end of game for scoring purposes.

## Card Types

### Ingredient Cards

Ingredient cards represent the various components needed to cook recipes. They come in three
categories:

- **Primary Ingredients** – Required in every recipe.
- **Secondary Ingredients** – Required in **normal** and **hard** recipes.
- **Optional Ingredients** – Can be added to any recipe to raise its value by 1.

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

Recipe cards represent dishes you cook to attract customers. Each recipe has a base value that
contributes towards covering a customer’s base value (e.g., easy=1, normal=2). Recipes themselves
do not score VP directly.

![image](images/guide_recipe.png)

Recipe cards have the following structure:

- **Utensil Symbol** - Depicts the utensil type relevant for summoning a matching utensil card.
- **Recipe Picture** - A picture of the dish.
- **Recipe Type** - The difficulty of the recipe (easy, normal, hard).
- **Recipe Name** - The name of the dish.
- **Ingredient Requirements** - The ingredients needed to cook the recipe.
- **Special Symbol** - In some decks, the recipe has a special symbol that is used for their special
  ability. In the above example it tells you that this recipe is a Main course recipe.
- **Value & Bonus** - Shows the recipe’s base value and whether your deck’s special ability or any
  optional ingredients grant an extra +1 value in specific situations when serving.
- **End Condition Symbol** - If present it indicates this card can be used to track the end
  condition of the deck.

### Drink Cards

Drink cards are played by meeting their prerequisites (no ingredients). When put in play, a drink
immediately attracts all customers directly from the player's queue. Drinks remain in play until the
end of the game for scoring purposes so their effect (attract all customers from the player's queue)
is triggered each time their requirements is met.

![image](images/guide_drinks.png)

Drink cards have the following structure:

- **Drink Name** - The name of the drink.
- **Drink Symbol** - Indicates that this is a drink card.
- **Drink Picture** - A picture of the drink.
- **Requirement** - The condition you must meet to play the drink or retrigger its effect.

### Event Cards

Event cards provide one-time effects affecting queues:

- **Complaint:** Discard 1 customer from any queue.
- **Promotion:** Swap 2 customers between any two queues.
- **Discount:** Attract 1 customer from your own or from the central queue without serving (move it 
  to your attracted pile immediately).

Any queue includes the central one.

![image](images/guide_events.png)

Event cards have the following structure:

- **Event Name** - The name of the event.
- **Event Picture** - Visual representation of the event.
- **Event Description** - Describes what the event does.

### Customer Cards

Customer cards represent diners waiting in queues. Each customer has a base value (1–4) showing how
much recipe value must be served in a single turn to attract them. At the end of the game, each
attracted customer scores their base value and their extra value if their requirements are met.

![image](images/guide_customer.png)

Customer cards have the following structure:

- **Base Value** - The total recipe value needed this turn to attract the customer (1–4).
- **Extra Value** - The total recipe value needed this turn to attract the customer (1–4).
- **Requirements** - If met at end of game, add extra value to this customer:
  - Globe: your deck nationality matches the customer.
  - Utensil: you have the depicted utensil in play.
  - Gold medal (X): you have at least X End Condition cards in tracking.
  - Drink (X): you have at least X drink cards in play.
  Icons may be single, combined with AND/OR, or multiple of the same type.
- **Nationality** - The customer’s nationality.

**Notable Rules:**

- Customer queue limit is 2 by default (Tableware raises it to 3).
- On your turn, take 1 from the central queue, then attempt to attract by serving recipes.
- At end of your turn, if your queue is empty, draw 1 customer so you always have at least 1.
- At end of your turn, if still at your queue limit, pass your leftmost queued customer to the
  player on your left.

See [Decks](Decks.md) for specific configurations.

### Utensil Cards

Each deck has 3 utensil cards: Kitchenware, Cookware & Tableware.

- Putting in play: during a single serve step, if you serve 2 recipes showing the same utensil
  symbol, you may put the matching utensil card into play. Utensils stay in play until end of game.
- Ongoing effects while in play:
  - Kitchenware: Hand limit +1 (default 6 → 7).
  - Cookware: Play‑card limit per turn +1 (default 3 → 4).
  - Tableware: Customer queue limit +1 (default 2 → 3).

### Ability Card

Each deck includes an ability card that outlines:

- The deck’s unique special ability.
- The end condition and how to track it.

Players can use this to guide their strategy and scoring plan.

## Player Actions

### Fill Hand

Outside their turn, players may discard up to 3 cards and then draw up to their hand limit (default
6; Kitchenware raises it to 7). If the draw pile is empty or does not have enough cards, reshuffle 
the discard pile into it.

### Cook

Players move ingredient cards from their hand into play. These become **prepared but unused** 
ingredients, which remain available for cooking recipes.

Players then use the prepared unused ingredients to fulfill a recipe’s requirements:

- Ingredients are arranged in a column.
- The matching recipe card is placed on top of the stack.

You may cook as many recipes as your prepared ingredients allow. The total number of cards you play
from hand in a turn (including recipes, drinks, events, ingredients) is limited to 3 by default (4
with Cookware).

![image](images/guide_cooking.png)

The above picture demonstrates that the player can do one of the following:

- Prepare 1 primary and 1 secondary ingredient and cook 1 normal recipe.
- Prepare 2 primary ingredients and cook 1 easy recipes.

### Serve

When you serve, allocate cooked recipes to customers in your queue. If a customer’s base value is 
fully covered this turn, move it to your attracted customers pile. If one or more served cards 
qualify for End Condition tracking, you may place **exactly one** into tracking.

### Attract Customers

See [Customer Cards](#customer-cards) for the full customer flow.

### Play Event Cards

Players may play event cards (Complaint, Promotion, Discount) to manipulate customer queues at any
time during their turn. For more details, see [Event Cards](#event-cards).

### Play Drink Cards

You may play drink cards when their prerequisites are met to attract all customers from your queue.
See [Drink Cards](#drink-cards).

## Winning the Game

The game ends after the round in which either a player puts 4 End Condition cards into tracking or
the customer deck is emptied. All players finish the current round.

After the game ends, each player sums the VP of attracted customers (base + extra) and the player 
with the highest total VP wins.

If there is a tie the player who most recently cooked a real-life meal wins.

## Examples

![image](images/guide_table.png)

In this 4-player game example only one player station and the central queue is shown:

- The visible player is using the **Piazza Romana** deck.
- They have 2 end condition cards in tracking (2 more needed).
- They have 3 prepared ingredients: 1 primary, 1 secondary, 1 optional.
- They have cooked 2 recipes: 1 easy, 1 normal.
- Their queue includes 2 customers.

If the player serves now and fully covers a customer’s base value with cooked recipe value, they
attract that customer to their attracted customers pile. Any drinks and utensils in play may help 
satisfy extra icons for end‑game scoring.
