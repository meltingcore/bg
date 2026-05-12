# Repository Guidelines

## Project Structure & Module Organization
- Root docs: `README.md` is only the repository index.
- Game docs live in `food-court/`.
  - `food-court/Rules.md` is the source of truth for current mechanics.
  - `food-court/quick-reference.md` must stay a concise derivative of `Rules.md`.
  - `food-court/Decks.md` lists deck-specific abilities, card counts, and card distributions.
  - `food-court/README.md` is player-facing overview and project context.
  - `food-court/CHANGELOG.md` records dated rule/design changes.
  - `food-court/Notes.md` and `food-court/Playtesting.md` may contain historical ideas/data.
- Ignore `food-court/files/` and `food-court/images/` unless the user explicitly asks to update
  printable assets or guide images.

## Build, Test, and Development Commands
- There are no build scripts or automated tests.
- Use Markdown preview or direct reading for validation.

## Current Rules Model
- Food Court is a competitive cooking card game built around restaurant decks and a shared customer
  deck.
- Setup creates a central face-up customer queue equal to the number of players.
- Players prepare ingredients, cook dishes, and refill hands outside their own turns.
- On a turn, players serve cooked dishes and optionally play drinks.
- A customer can be competed for by up to two players. Each competing player serves cooked dishes
  equal to the customer's Base Value by placing them to the left or right of that customer card.
  Recipe serve values, optional ingredients, special abilities, and nationality bonuses determine
  which player wins the competition.
- The winner attracts the customer by moving it to their scoring pile.
- Attracted customers are the only end-game scoring source. They score base VP plus their full Tips
  Value only when the player has at least that many Tips Cards in tracking.
- Drink cards attract the top card of the customer deck directly to the player's scoring pile.
- Customer symbols provide temporary bonuses while a player competes for those customers:
  Ingredient Limit, Swap Limit, Cooking Limit, and Hand Limit.
- There are no Event Cards or standalone Utensil Cards in the current rules. Symbols on customer
  cards provide limit bonuses.

## Writing Style & Naming Conventions
- Markdown: ATX headings (`#`, `##`), Title Case for headings, concise sections.
- Keep lines readable at roughly 100 characters.
- Prefer relative links inside docs, such as `Rules.md` from within `food-court/`.
- Use `End Condition`, not `Win Condition`, for current rules text.
- Use `Tips Cards`, not `End Condition Cards`, for cards placed into tracking.
- Use `Tips Value`, not `Bonus Value`, for the customer scoring field.
- Preserve historical terminology inside dated playtest records unless editing that record for
  clarity.

## Validation Guidelines
- After changing rules, check `Rules.md`, `quick-reference.md`, `README.md`, `Decks.md`, and
  `CHANGELOG.md` for terminology drift.
- Keep `quick-reference.md` shorter than the full rules and do not introduce mechanics there that
  are absent from `Rules.md`.
- Do not update print files or images while rules are still being realigned unless explicitly asked.

## Commit & Pull Request Guidelines
- Do not run git workflows, stage files, commit, push, or open PRs. Leave git work to the user.
