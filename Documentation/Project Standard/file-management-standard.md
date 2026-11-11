# Two-Tone File Management Standard

## Purpose

This standard defines where project files belong and how they are grouped.

## Project Root

- Keep the browser entry point, `index.html`, at the project root.
- Keep application source code under `src`, grouped by feature or responsibility.
- Keep static files that are served directly, such as images, audio, and fonts, under `public/assets`.
- Keep `Documentation` at the project root.
- Add `package.json` and build configuration only when the project uses the corresponding tools or dependencies.
- Create a top-level `third-party` folder only when the project includes third-party content that must be kept with the repository.

## Documentation

- Use `Documentation` only for project standards.
- Give each fundamental standard its own folder.
- Place specific standards as documents inside the fundamental standard folder they belong to.
- For example, naming and file-management standards belong under `Project Standard`; a combat-specific standard belongs under `Combat Standard`.

## Source and Static Files

- Group code by feature where that makes related behavior easy to find. Keep shared utilities in a clearly named shared folder.
- Keep browser-served static files in `public/assets`, grouped by type or feature as appropriate.
- Use the project’s naming scheme for source files, folders, and assets.

## Example Layout

The source folders shown here are examples; add categories as the project needs them.

```text
Two-Tone/
├── index.html
├── public/
│   └── assets/
│       └── [asset type or feature]/
├── src/
│   ├── scripts/
│   │   └── [feature]/
│   └── styles/
├── Documentation/
│   ├── Project Standard/
│   │   ├── naming-scheme-standard.md
│   │   └── file-management-standard.md
│   └── [Other Standard]/
│       └── [specific-standard].md
├── package.json  (when needed)
└── third-party/  (only when needed)
```
