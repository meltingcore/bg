# Changelog

## [0.9.0]

CHANGES:

* New **Discount** event card added to attract a customer from the central queue without having
  to meet its requirements and adhere to the 1 customer per turn limit.
* New **Drink** card type added.
  * Each deck will have 3 drink cards that can score 3VP if their deck specific requirements are
  met.
  * Drink cards can be scored regardless of the action the player takes (i.e. you can score them
  while preparing)
  * There still has to be at least 1 customer in the player queue to serve the drink to score it,
  but you do not discard the customer after scoring the drink.
* Customer cards are now slightly randomized for each deck to add variety and new effect is added
the gives you an opportunity to prepare 1 ingredient while cooking as ongoing (until discarded).
* Customers are now attracted by covering their requirements at the end of the turn after 
performing the main action so the only way to attract them at the start of the turn is by using 
**Discount** event cards.
* Attempt to ease on the scoring snowballing and math:
  * Hard recipes now just grant 4VP instead of 3VP + bonus to other recipes.
  * Optional ingredients now grant 1VP instead of 2VP.
  * Most special abilities are now simplified to just grant +1VP instead of different bonuses based
  on complex conditions.
* Effects in general do not stack anymore meaning that:
  * You cannot benefit from the same customer effect multiple times (i.e. you can only score 2 VP
  instead of 4VP if you have 2 "Gain 2VP" customers in your queue).
  * Utensil bonuses **of the same type** do not stack anymore (different types still do so you 
  cannot score +2VP from 2 Kitchenware cards on the same recipe but can from a Kitchenware and 
  Cookware cards for 2 recipes).
* Rules are now more streamlined to avoid the "wall of text" feel

## [0.8.1]

BUG FIXES:

* Fixed the print-ready PDF files link

## [0.8.0]

CHANGES:

* Redesign turn structure to choosing from 1 of 3 actions (prepare, cook & serve).
* Hand limit is now 7 cards by default (down from 8) and each turn players can discard up to 
2 (down from 3) cards before filling back their hand.
* Redesign player interaction and scoring to be based on customer queues. 
* Redesign all player decks to remove utensils & change the Block & Swap action cards to become 
Complaint and Promotion event cards instead.
* Roles functionality removed.
* No more card rotations and upside-down text.
* Removed cooking for one turn mechanic.
* Jin Long's special ability modified.
* Sakura House's special ability modified.
* Sultan Saray's special ability modified.
* Piazza Romana's primary ingredients adjusted.
* Cards used for win condition tracking now have medal icon in the upper right corner.
* Scoring calculations are now easier due to dedicated symbols on the recipe cards.
* Scoring (serving) is now only possible if a player has a customer queue.

## [0.7.1]

CHANGES:

* Various visual updates
* Added playtest data and feedback from BMG
* Optional ingredient cards now grant +2 VP when used.

## [0.7.0]

CHANGES:

* Recipes are now being cooked for one turn (before being ready for scoring).
  * Action cards are modified to reflect the recipe change.  
  * Role card descriptions are modified to reflect the recipe change.
* [Notes](Notes.md) now includes play test data.

BUG FIXES:

* Recipes can no longer be cooked with fewer ingredients than needed.
* The bonus for a complete Win Condition is again 30 VP.
* Piazza Romana's deck re-adjusted for 5 primary ingredient types and pizzas were removed.
* Le Petit Paris' special ability bonus VP adjusted.
* Jin Long's win condition tracking clarified.

## [0.6.4]

BUG FIXES:

* Action Cards rules are updated to unsure more fluidity.
* Various documentation QoL changes

## [0.6.3]

BUG FIXES:

* Adjust the complete Win Condition total bonus to 40 VP to feel more like a snitch ;)

## [0.6.2]

BUG FIXES:

* Added streamline version of the rules for quick reference.
* Added some images in the rules for guidance.

## [0.6.1]

BUG FIXES:

* Updated the deck templates.
* Removed the game throughout the documentation.

## [0.6.0]

CHANGES:

* Roles are now in pairs and their setup, play and mechanics are described in detail. 
* Various parts of the rules are rewritten for clarity.
* Main mechanics are described in separate sections.
* The theme of the game is changed to restaurants in a food court.
* The turn structure is simplified.
* Action cards adjusted to fit the "resolving before scoring" mechanic.

## [0.5.0]

CHANGES:

* Various decks adjustments:
  * All decks aligned to have 3 hard recipes.
  * Card "design" aligned so that ingredients & recipes are using "Fill color" art instead of
  borders at random.
  * Icons for ingredient types streamlined (now distinct features are with separate icon)
* Utensil adjustments:
  * Utensil order no longer starts with kitchenware for all decks.
  * Utensils now grant their bonus for each recipe.
* Removed max limit of 1 optional ingredient per recipe.
* Introduced additional recipe mechanics.
* Action cards redesigned to have offensive and defensive functions.


## [0.4.4]

CHANGES:

* Added "Mission Statement", "Discussions" & "Disclaimers" sections.
* Added notes for ideas for multi-function cards.

## [0.4.3]

CHANGES:

* The `tts` folder & the `Additional Notes` section renamed.
* Added clarification for replacing recipes that use the "Cook Recipe Twice" action card.
* Adjustments to the **Türkiye** deck.

## [0.4.2]

CHANGES:

* Added Buy Me Coffee sponsor link.
* Added Print & Play card size information.
* Added [file](Notes.md) for capturing ideas
* Added ideas for the Thai, Greek and Swedish decks.

## [0.4.1]

CHANGES:

* The tsdb files were deleted.
* Links to pdf files added for Print & Play purposes.
* Added Rules for print in the TODO list.

## [0.4.0]

FEATURES:

* Added Tabletop Simulator files for each deck (`tsdb` file and exported as `png`)

CHANGES:

* Mexico deck's special ability now asks you to discard a card from your hand for each
**secondary** ingredient you use in a recipe that is not in the requirements.
* The country name of Turkey changed to Türkiye to respect the new official spelling.
* Added Thai, Greek and Swedish decks in the TODO list.

## [0.3.1]

CHANGES:

* Decks have their special abilities and win conditions texts shortened and aligned.
* Action cards names aligned in the rules.
* The abilities for the **Supplier** and **Dishwasher** role cards were modified.
* The rules for winning the game were modified.
* Implemented the TODO actions in the deck designs.

## [0.3.0]

CHANGES:

* Win condition for each deck aligned to 4 occurrences of a condition
* Balance attempts at **extra** decks
* Utensil types added for recipes in **extra** decks
* **Japan** mechanics redesigned

## [0.2.1]

FEATURES:

* Moving detailed change explanations to release notes.
* Items added in TODO

CHANGES:

* Adjustments to **China** & **India** decks

BUGFIXES:

* Fixed the recipe count and clarify the win condition for **France**

## [0.2.0]

FEATURES:

* Made the deck composition sections collapsable.
* Added ToC for [Rules](Rules.md) and [Decks](Decks.md).

CHANGES:

* Adjustments to **Italy** & **France** decks.
* Bringing back the **self-benefitting** action cards with different effects.
* Adjusting the VP to win from 50 to 40.

## [0.1.1]

FEATURES:

* Added [TODO](TODO.md) list

CHANGES:

* Adjustments to **France** & **Italy** decks
* Removing the **self-benefitting** action cards to have a pair of the rest.
* Adjusting the VP to win from 30 to 50.
* Set limit for only 1 win condition card placement per turn per player.

## [0.1.0]

FEATURES:

* Initial version ready for first playtest.