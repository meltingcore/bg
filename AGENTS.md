# Repository Guidelines

## Project Structure & Module Organization
- Root docs: `README.md` (repo overview).
- Game: `food-court/` contains all rules and materials.
  - Rules and docs: `food-court/Rules.md`, `food-court/README.md`, `food-court/quick-reference.md`, `food-court/Notes.md`, `food-court/Playtesting.md`, `food-court/CHANGELOG.md`.
  - Images for guides: `food-court/images/`.
  - Print-ready assets and templates: `food-court/files/templates/`.

## Build, Test, and Development Commands
- n/a - no build scripts or automation.

## Coding Style & Naming Conventions
- Markdown: ATX headings (`#`, `##`), Title Case for headings, concise sections.
- Line width: keep lines readable (~100 chars); use hard breaks sparingly.
- File naming: kebab-case for new Markdown files (e.g., `design-notes.md`).
- Assets: place images in `food-court/images/`; keep filenames lowercase with hyphens.
- Links: prefer relative paths (e.g., `food-court/Rules.md`).

## Testing Guidelines
- No automated tests. Validate by:
  - Reading flows in `food-court/Rules.md` and `quick-reference.md` for consistency.
  - Updating `food-court/Playtesting.md` with scenarios, findings, and dates.
  - Checking that images render and relative links resolve in preview.

## Commit & Pull Request Guidelines
- Don't touch git and leave the git work to the user as manual work.

## Agent-Specific Notes
- Only modify content under `food-court/`; do not overwrite templates in `files/templates/` unless explicitly requested.
- Preserve tag style (no `v` prefix) and keep changelog entries terse and dated.
