# Two-Tone File Management Standard

## Purpose

This standard defines where project files belong and how they are grouped.

## Project Root

- Keep the browser entry point, `index.html`, at the project root.
- Keep application source code under `src`, grouped by feature or responsibility.
- Keep static files that are served directly, such as images, audio, and fonts, under `assets/`.
- Keep `Documentation` at the project root.
- Add `package.json` and build configuration only when the project uses the corresponding tools or dependencies.
- Create a top-level `third-party` folder only when the project includes third-party content that must be kept with the repository.

## Documentation

- Keep active standards, reference sheets, setup guides, and reproducible simulator examples in `Documentation`.
- Keep superseded studies and raw runs in [Archive](../../Archive/README.md). Preserve the examples and current report paths used by tooling.
- Give each fundamental standard its own lowercase kebab-case folder.
- Place specific standards as documents inside the fundamental standard folder they belong to.
- For example, naming and file-management standards belong under `project-standard`; a combat-specific standard belongs under `combat-standard`.

## Source and Static Files

- Group code by feature where that makes related behavior easy to find. Keep shared utilities in a clearly named shared folder.
- Keep browser-served static files in `assets/`, grouped by type or feature as appropriate.
- Use the project’s naming scheme for source files, folders, and assets.
- Follow the [Artwork Loading Standard](artwork-loading-standard.md) for browser requests and full-resolution delivery formats.

## Example Layout

The source folders shown here are examples; add categories as the project needs them.

```text
Two-Tone/
├── index.html
├── assets/
│   └── [browser-served artwork]
├── src/
│   ├── scripts/
│   │   └── [feature]/
│   └── styles/
├── Archive/
├── Documentation/
│   ├── project-standard/
│   │   ├── naming-scheme-standard.md
│   │   └── file-management-standard.md
│   └── [other-standard]/
│       └── [specific-standard].md
├── package.json  (when needed)
└── third-party/  (only when needed)
```
