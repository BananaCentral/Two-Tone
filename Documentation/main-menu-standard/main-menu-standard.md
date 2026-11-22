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

Regular Mode is the only mode currently available to players. Dev Mode requires server-side developer authorization. See the [Game Mode Standard](../game-mode-standard.md).

## Phone Menu Layout

- Use a dark, translucent phone-menu panel over the game background, with a grid of icon tiles.
- Start the grid near the top of the panel. Do not place a title, profile card, Rank, UID, status bar, or other header content above it.
- On the 1600×900 canvas, use four columns and three rows. Place Campaign, Events, Store, and Loadout first; Party, Inventory, Challenges, and Daily Reward next; use Settings in the remaining tile.
- Give each tile one large, simple line icon, a clear section name, and at most one short supporting line. Keep tiles large enough for touch input.
- The Daily Reward tile shows **Claim 100 Coins** while available and a concise claimed/reset state after claiming. It remains on the main menu.
- Events remains a visibly inactive placeholder until implemented. Other tiles open their corresponding game sections directly.

## Startup and Account

- Google sign-in loads the player's server profile. Signed-in players start at the Two-Tone title screen in portrait or landscape.
- **Start** opens Prologue 1A on accounts without a saved first clear. The main menu becomes available from the victory screen once the clear is saved.
- **Start** opens the main menu on accounts that have already cleared Prologue 1A.
- Regular Mode has no player-facing save-file export or import. Account data follows the verified Google identity across devices.
- Settings provides sign-out and account deletion.

## Fullscreen and Home Screen App

- Show a fullscreen control where the browser supports the Fullscreen API.
- iPhone Safari does not allow a web page to force arbitrary content into fullscreen. Explain that players can use **Share → Add to Home Screen**, then launch Two-Tone from its icon to hide Safari's browser controls.
- Declare standalone display metadata so installed Home Screen versions open as an app. Hide the fullscreen control when already running standalone.

## Placeholder Sections

- Sections may appear before they are implemented.
- An unimplemented section is visible but inactive and does not navigate elsewhere.
- Make it clear when a section is a placeholder.

## Campaign

- Campaign opens the Arc → Chapter → Part selector. Players can start any available part or replay a cleared one. Locked parts are visible.
- See the [Campaign Standard](../campaign-standard/campaign-standard.md) for story scenes, battles, and first-clear rewards.
