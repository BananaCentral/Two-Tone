# Two-Tone Main Menu Standard

## Purpose

The main menu is the player's primary way to navigate the game. It replaces overworld navigation.

Use the [UI Copy Standard](../project-standard/ui-copy-standard.md) to keep menu labels concise and remove redundant helper text.
Use the [UI Layout Standard](../project-standard/ui-layout-standard.md) for consistent panel hierarchy, spacing, and alignment.

## Main Menu Sections

Show these sections in this order:

1. Campaign
2. Events
3. Store
4. Loadout
5. Party
6. Inventory
7. Challenges
8. Daily Reward
9. Settings

## Phone Menu Layout

- Use a dark, translucent phone-menu panel over the game background, with a grid of icon tiles.
- Start the grid near the top of the panel. Do not place a title, profile card, Rank, UID, status bar, or other header content above it.
- On the 1600×900 canvas, use three columns and three rows. Fill the tiles from left to right in the section order above.
- Give each tile one large, simple line icon, a clear section name, and at most one short supporting line. Keep tiles large enough for touch input.
- Keep the **Daily Reward** tile on the main menu. See the [Daily Coin Reward Standard](../daily-reward-standard.md) for its available and claimed states.
- Events opens the [28-Day Login Event](../event-standard/login-event-standard.md).

## Startup and Account

- Signed-in players start at the Two-Tone title screen in portrait or landscape. See the [Account and Player Data Standard](../account-and-player-data-standard.md) for sign-in and persistence.
- **Start** opens Prologue 1A on accounts without a saved first clear. The main menu becomes available from the victory screen once the clear is saved.
- **Start** opens the main menu on accounts that have already cleared Prologue 1A.
- Settings provides sign-out and account deletion.

## Fullscreen and Home Screen App

- Show a fullscreen control where the browser supports the Fullscreen API.
- iPhone Safari does not allow a web page to force arbitrary content into fullscreen. Explain that players can use **Share → Add to Home Screen**, then launch Two-Tone from its icon to hide Safari's browser controls.
- Declare standalone display metadata so installed Home Screen versions open as an app. In the installed app, show the fullscreen control disabled with an explanation.

## Placeholder Sections

- Sections may appear before they are implemented.
- An unimplemented section is visible but inactive and does not navigate elsewhere.
- Make it clear when a section is a placeholder.

## Campaign

- Campaign opens an Arc → Chapter → Part sidebar and a preview panel. Players select a part to see its summary or unlock requirement, then use **Start Part** or **Replay Part** when available.
- See the [Campaign Standard](../campaign-standard/campaign-standard.md) for story scenes, battles, and first-clear rewards.
