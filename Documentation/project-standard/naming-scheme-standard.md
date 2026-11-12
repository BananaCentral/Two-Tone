# Two-Tone Naming Scheme Standard

## JavaScript and TypeScript Names

- Use `PascalCase` for classes and type names.
- Use `camelCase` for variables, functions, methods, properties, and module names.
- Use `UPPER_SNAKE_CASE` for constants whose values are fixed configuration or game rules; use `camelCase` for values that change while the game runs.
- Avoid underscores in identifiers unless a tool or format requires them.

## Files, HTML, and CSS

- Use lowercase `kebab-case` for file and folder names, such as `battle-scene.js` and `party-menu/`.
- Use lowercase `kebab-case` for CSS classes, HTML IDs, and data attributes.
- Use lowercase `kebab-case` for image, audio, and font filenames. Give related assets names that distinguish their purpose, such as `player-idle` and `player-run`.
- Use underscores only when a tool or format requires them.

## Folders

- Use lowercase `kebab-case` for project-created folder names at every level. This keeps paths consistent and easy to use in imports and URLs.
- Follow the required naming of any folders created or managed by project tooling.

## Player-Facing Text

- Use natural, readable display text rather than code-style casing.
- Examples: `This is an example text sentence.`, `Quests`, and `Health: 10`.
