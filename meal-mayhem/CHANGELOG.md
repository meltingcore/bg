# Changelog

## [0.2.0]

FEATURES:

* Made the deck composition sections collapsable.
* Added ToC for [Rules](Rules.md) and [Decks](Decks.md).

CHANGES:

Play testing `0.1.1` proved to drag a game too long with win conditions being too hard to achieve.
In addition, 5 pairs of action cards that penalize opponents were too much as they hinder every
attempt to do anything. Therefore, the overall goal in the changes below is to make the game more
dynamic, fast and fun to play.

- **Decks**:
  - **Italy**:
    - Win condition adjusted to **4 exact** pasta recipes and tracking was reverted back to pasta
    ingredient cards as win condition cards. The change makes the win condition more achievable
    and since it no longer penalizes players with lack of **primary** ingredients, the tracking was
    reverted back from recipes to pasta ingredients.
    - In a balance attempt the deck composition is adjusted as follows:
      - The "Ravioli Burro e Salvia" recipe was changed from **normal** to **hard** thus resulting
      in 4/6/4 easy/normal/hard recipes.
      - The "Balsamic Vinegar" **optional** ingredient was removed to free up space for 1 more
      **secondary** ingredient card to a total of 14/9/3 primary/secondary/optional ingredients.
  - **France**:
    - To meet the 4 cards to win condition concept you now build towards a 4-course meal 
    (introducing **appetizer** as recipe type). Therefore, the special ability was changed as
    follows: entrée + appetizer=+1 VP, appetizer + main=+2 VP and main + dessert=+3 VP;
    - The win condition was also adjusted to now just complete a 4-course meal in order once.
    - To facilitate the above changes the deck composition was adjusted as follows:
      - Remove the "Herbs de Provence" **optional** ingredient to free up 1 slot resulting in
      12/10/3 primary/secondary/optional ingredients.
      - Remove the "Opera Cake" **hard** recipe to free up 1 slot.
      - Add 4 **appetizer** recipes from the 2 free spots and from converting 2 **main** recipes
      to have a 4th course resulting in 4/8/3 easy/normal/hard recipes as described below. Utensils
      assignments were also adjusted accordingly across all recipes.
        - Coq au Vin (Main) -> Quiche Lorraine (Appetizer) [cookware]
        - Duck à l’Orange (Main) -> Escargots de Bourguignon (Appetizer) [tableware]
        - Salade Niçoise (Appetizer) [kitchenware] -> NEW
        - Soufflé au Fromage (Appetizer) [cookware] -> NEW
- **Actions**:
  - Reverting back to 7 opponent action cards and 3 self-benefitting action cards as follows:
        - **Play Again** - Changed to **Draw 2 Cards** to allow 2 more cards in hand for 1 turn.
        - **Universal Ingredient** - Changed to **Universal Ingredients** to act as covering all
        ingredient requirements for a recipe.
        - **Cook With Less** - Changed to **Cook Twice** to score double VP from a recipe.
        - **Block An Opponent Action** - Back to 3 cards.
        - The **Discard** action cards are back to 1 card each.
  - Added clarifying notes for action cards in the rules.
- **Rules**
  - Win by VP adjusted from 50 to 40 as 50 was too slow to reach.

## [0.1.1]

FEATURES:

* Added [TODO](TODO.md) list

CHANGES:

- **Decks**:
  - **France**:
    - Special ability changed to grant extra VP when cooked adjacent recipes from a 3-course meal
    in the same turn (instead of when fulfilling win condition) cause extra VP were granted very
    rarely otherwise;
    - Win condition was modified to not discard recipes anymore when tracking a course so you should
    have 6 win condition cards to win instead of 2; Change was made so that everyone loses similar
    amount of cards from its deck to track win condition.
  - **Italy**:
    - Special ability was changed to grant **+1 VP** for **normal** and **+2 VP** for **hard**
    recipes since flat **+2 VP** for both was a little too powerful.
    - Win condition tracking now use recipes instead of pasta ingredients as win condition cards in 
    order not to penalize that much players with lack of primary ingredients.
- **Actions**:
  - The 3 action cards benefitting self (**Play Again**, **Universal Ingredient** and
  **Cook With Less**) are removed. Instead, the other action cards (afflicting opponents) are
  adjusted to be a pair of each.
- **Rules**:
  - Score to win by VP adjusted from 30 to 50 as 30 was reached too quickly.
  - Added a rule that specifies that only 1 win condition card can be placed per turn per player
  as otherwise cooking combos can occur that can result in a player meeting half of its win 
  condition in a single turn.


## [0.1.0]

FEATURES:

* Initial version ready for first playtest.