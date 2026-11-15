# Two-Tone Main Menu Standard

## Purpose

The main menu is the player's primary way to navigate the game. It replaces overworld navigation.

Use the [UI Copy Standard](../project-standard/ui-copy-standard.md) to keep menu labels concise and remove redundant helper text.
Use the [UI Layout Standard](../project-standard/ui-layout-standard.md) for consistent panel hierarchy, spacing, and alignment.

## Main Menu Sections

Show these sections in this order:

1. Story
2. Events
3. Game Mode
4. Store
5. Loadout
6. Party
7. Daily Reward

The Game Mode section switches between Regular and Dev Mode. Regular is the default and starts new players with Soul and 0 coins. Dev Mode exposes development tools and uses a separate saved profile. See the [Game Mode Standard](../game-mode-standard.md).

## Phone Menu Layout

- Use a dark, translucent phone-menu panel over the game background, with a grid of icon tiles.
- Start the grid near the top of the panel. Do not place a title, profile card, Rank, UID, status bar, or other header content above it.
- On the 1600×900 canvas, use four columns and three rows. Order the first row as Story, Events, Game Mode, Store; the second as Loadout, Party, Inventory, Challenges; center Daily Reward, Save, and Settings in the final row.
- Give each tile one large, simple line icon, a clear section name, and at most one short supporting line. Keep tiles large enough for touch input.
- The Daily Reward tile shows **Claim 100 Coins** while available and a concise claimed/reset state after claiming. It remains on the main menu.
- Events remains a visibly inactive placeholder until implemented. Other tiles open their corresponding game sections directly.

## Startup Menu

- On launch, show a startup menu with **Start** and **Load** options.
- Start opens the main menu.
- Load opens the device's file picker for a Two-Tone save file. A valid import restores progress and opens the main menu.
- Reject unsupported or invalid files without changing current progress. Confirm before replacing existing local progress.

## Save Files

- The main menu has a **Save** option that downloads a portable JSON save file.
- Save files include the party, account Rank, character levels and EXP, ascensions, saved HP, character loadouts, coins, and Daily Reward claim state.
- Save files have an explicit format name and version. Loading must validate the entire file before replacing local progress.
- Local browser storage remains the active device's automatic save; file export lets the player carry or back up progress.

## Fullscreen and Home Screen App

- Show a fullscreen control where the browser supports the Fullscreen API.
- iPhone Safari does not allow a web page to force arbitrary content into fullscreen. Explain that players can use **Share → Add to Home Screen**, then launch Two-Tone from its icon to hide Safari's browser controls.
- Declare standalone display metadata so installed Home Screen versions open as an app. Hide the fullscreen control when already running standalone.

## Placeholder Sections

- Sections may appear before they are implemented.
- An unimplemented section is visible but inactive and does not navigate elsewhere.
- Make it clear when a section is a placeholder.

## Story

- Story contains the current battle prototype as the initial playable content.
- The battle prototype remains available while the rest of Story is developed.
