# Two-Tone UI Layout Standard

## Purpose

This standard defines the shared composition, spacing, and alignment rules for menus, panels, detail views, and item cards. Use it with the [UI Copy Standard](ui-copy-standard.md).

Feature-specific standards may define exact arrangements for their screens. Keep those arrangements consistent with the shared hierarchy below.

## Screen and Panel Hierarchy

- Keep the screen's main navigation and selected content in distinct, predictable regions. Omit regions that do not serve that screen instead of filling them with unrelated controls.
- Put a section heading outside its content card, centered over the card. Leave a visible gap between the heading and the card border.
- Inside a card, align the selected item or entity name to the card's left content edge. Do not repeat a character name when the panel title already identifies the character.
- Group related state, stats, progress, and actions together. Align values and labels consistently along the left edge unless they are part of a centered visual, such as a heading or artwork.
- Keep primary actions below the information they affect. Place a value directly above the action it describes, aligned to that action's left edge.
- When two actions have equal priority, give them equal-sized buttons in one row. Use concise labels and leave enough space between them for touch input.

## Artwork and Open Space

- Let the selected character or item artwork use the largest useful area in its panel. Preserve its aspect ratio and keep its title directly above it.
- Use portrait crops for small character selectors. Do not shrink full-body character artwork into a portrait-sized circle.
- Use open space to enlarge relevant artwork or make controls easier to scan. Do not add filler copy, stretch a card across unused space, or enlarge a panel without adding useful content.
- Keep text away from borders and other controls. Use consistent internal padding and gaps within related panels.

## Item Cards

- Use a consistent card size for items that appear together. Align cards in a row with even gaps; each card carries its own icon, short name, useful value, and owned or selected quantity.
- When a panel contains one material, use one standard item card aligned to the row's left edge. Do not stretch a single material card to fill the row.
- Keep a card's icon visually centered in its icon area. Place its name and count beneath it with consistent alignment.

## Loadout Reference

The Loadout screen applies this pattern with character navigation across the top, section navigation on the left, character artwork in the center, and a detail card on the right. On the Weapons panel, the **WEAPONS** section heading sits centered above the card; the selected weapon name sits at the card's upper-left edge above larger artwork; its all-stats bonus sits below the XP bar and above the Upgrade action. Enchanted Book cards use a shared row layout. Ascension replaces that row with a single Gem card at the left edge.
