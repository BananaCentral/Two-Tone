# Two-Tone UI Layout Standard

## Purpose

Use this standard for every menu, screen, panel, card, and overlay. It defines shared hierarchy, spacing, alignment, and component behavior. Feature-specific standards may define an arrangement for their screen; those arrangements still follow the shared rules unless an exception is named below.

Pair it with the [UI Copy Standard](ui-copy-standard.md) for concise labels and state text.

## Screen and Panel Hierarchy

- Keep navigation and selected content in distinct, predictable regions. Omit regions that do not serve that screen instead of filling them with unrelated controls.
- Put a section heading outside its content card, centered over the card, with a visible gap. The screen title may identify a whole-page panel; do not repeat it as an inner card title.
- Inside a detail card, align the selected item or entity name to the card's left content edge. Do not repeat a character name when the panel title already identifies the character.
- Group related state, stats, progress, and actions together. Align labels and values consistently along the left edge unless they are part of a centered visual, such as a heading or artwork.
- Put primary actions below the information they affect. Place the value directly above its action, aligned to that action's left edge.
- When two actions have equal priority, give them equal-sized buttons in one row with enough spacing for touch input.
- Keep buttons, status, and content within the panel's inner padding. Align repeated sections to the same edges and use even gaps.

## Artwork and Open Space

- Let selected character or item artwork use the largest useful area in its panel. Preserve its aspect ratio and keep its title directly above it.
- Use portrait crops for small character selectors. Do not shrink full-body character artwork into a portrait-sized circle.
- Use open space to enlarge relevant artwork or make controls easier to scan. Do not add filler copy, stretch a card across unused space, or enlarge a panel without adding useful content.
- Keep text away from borders and other controls. Use consistent internal padding and gaps within related panels.

## Item Cards

- The **Inventory** screen presents every owned item type in one shared grid, including Rune pieces. Do not divide it into category panels or category-specific rows. Hide items with a quantity of zero.
- Use one consistent card size and even spacing throughout the Inventory grid. Fill each row from left to right and align an incomplete final row to the left. Each card carries its own icon, short name, useful value where relevant, and owned quantity.
- Other item-card groups outside Inventory use a consistent card size within their panel and align cards in a row with even gaps.
- When a panel contains one material, use one standard item card aligned to the row's left edge. Do not stretch a single material card to fill the row.
- Keep a card's icon visually centered in its icon area. Place its name and count beneath it with consistent alignment.

## Screen Patterns

- **Main menu:** follow the [phone-menu layout](../main-menu-standard/main-menu-standard.md). Its icon grid intentionally has no heading above it. Use one short state line only where a tile needs to show the current mode.
- **Startup, Settings, Inventory, Challenges, Party, and battle setup:** use a centered screen or section heading, then align the content cards beneath it. Keep their content rows and actions evenly spaced.
- **Loadout:** use character navigation across the top, section navigation on the left, character artwork in the center, and a detail card on the right. The [Loadout standard](../systems/loadout.md) defines its screen-specific behavior. On the Weapons panel, the **WEAPONS** section heading sits centered above the card; the selected weapon name sits at the card's upper-left edge above larger artwork; its all-stats bonus sits below the XP bar and above the Upgrade action. Enchanted Book cards use a shared row layout. Ascension replaces that row with a single Gem card at the left edge. On Runes, show four equally sized equipment slots and the represented sets' piece counts and effects beneath them. Selecting a slot opens its Rune details or owned Rune picker.
- **Store:** keep the six banner choices in a left selector and the selected banner detail on the right. Follow the [featured lottery standard](../store-standard/featured-lottery-standard.md) for banner content and controls.
- **Events:** put event tabs in a left rail and show the selected event on the right. Center the selected event heading above its banner. Keep equally sized reward cards in a row beneath the art and place the claim action below them. See the [Events Standard](../event-standard/events-standard.md).
- **Battle HUD:** use the dedicated [Battle HUD Standard](../battle-hud-standard.md) for battle controls and screen-space status. Pause and result dialogs still follow the shared panel, alignment, and concise-copy rules.

## Review Checklist

Before adding a screen or changing its layout, check that:

1. A player can identify the screen, selected content, and primary action at a glance.
2. Section headings sit above their content cards; detail names and values align consistently inside them.
3. Artwork and action areas use available room before adding explanatory text or empty cards.
4. Repeated cards, buttons, and content rows share sizes and even spacing.
5. Navigation and controls remain comfortably tappable without overlapping content.
