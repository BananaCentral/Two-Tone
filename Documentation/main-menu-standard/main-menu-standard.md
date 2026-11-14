# Two-Tone Main Menu Standard

## Purpose

The main menu is the player's primary way to navigate the game. It replaces overworld navigation.

## Main Menu Sections

Show these sections in this order:

1. Story
2. Events
3. Game Mode
4. Store
5. Loadout
6. Party

The main menu displays the player's Rank, as defined in the Rank Standard.

## Startup Menu

- On launch, show a startup menu with **Start** and **Load** options.
- Start opens the main menu.
- Load opens the device's file picker for a Two-Tone save file. A valid import restores progress and opens the main menu.
- Reject unsupported or invalid files without changing current progress. Confirm before replacing existing local progress.

## Save Files

- The main menu has a **Save** option that downloads a portable JSON save file.
- Save files include the party, account Rank, character levels and EXP, ascensions, saved HP, and character loadouts.
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
