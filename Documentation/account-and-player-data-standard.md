# Account and Player Data Standard

## Purpose

Each player has a persistent game profile that follows their Google account across devices. The server is the source of truth for identity and saved progress.

## Identity and sign-in

- Players sign in with Google through the game's authentication provider.
- The server identifies a player by the authentication provider's stable user ID. Email and display name are profile details, not identifiers.
- Client requests never choose a player ID. The server derives it from the verified session.
- Authentication is required before loading or changing a player profile.
- Sign-out clears the local session. It does not delete the account or saved progress.
- Account deletion requires an explicit confirmation and removes the authentication user and server profile, including lottery receipts.

## Regular and Dev Mode

- Regular Mode is the only mode available to ordinary players.
- Regular players begin with Soul, zero coins, and the standard starting profile.
- Dev Mode is a server-authorized developer capability. A URL parameter or browser setting cannot grant it.
- Developer authorization is checked by the server on every developer-only operation. Hiding a control in the UI is not authorization.
- Dev Mode data is isolated from Regular Mode data and cannot grant items, currency, or progress to a Regular profile.

## Server-owned data

The authenticated server profile is authoritative for:

- Coins and daily claim periods
- Owned characters and weapons, duplicates, and potential
- Item inventory, including cores, gems, enchanted bottles, and enchanted books
- Character and weapon levels, XP, ascensions, and celestial progression
- Team and loadouts
- Rune ownership, set, and equipped slots
- Lottery targets, pity counters, heightened state, and rotation state

The client may request a game action, but it must not submit a replacement balance, inventory, ownership list, lottery result, or progression total. Economy-changing actions are validated and committed by the server as one transaction.

## Persistence and saves

- Progress is loaded after authentication and saved to the player's server profile.
- Regular Mode has no player-facing save-file export or import. Server state replaces save files as the persistence mechanism.
- Browser storage may hold non-authoritative presentation preferences or a temporary session cache. It is never the source of truth for player progress.
- Legacy local progress is not silently merged into an account. Any one-time migration must validate the data, prevent currency/reward duplication, and be explicitly versioned.

## Data access and integrity

- Every read and write is scoped to the authenticated user ID on the server.
- Store draws, daily rewards, and other grants must be atomic and safe against concurrent requests or retries.
- Server-generated randomness determines lottery results. Clients receive the result after the transaction commits.
- Developer grants require the server-side developer allowlist and are recorded separately from player actions.
- Account deletion cascades through the authentication user and all Two-Tone profile data. The app does not retain an undeleted progress copy.

## Current implementation status

The public client no longer enables Dev Mode from `?dev=1`, and the save/load file controls and handlers have been removed. Dev Mode is disabled for all accounts until a server-side developer role is configured. Google sign-in is required before the game loads. Player profiles, Store draws, daily claims, team selections, vitals, and loadout upgrades use authenticated server routes; browser `localStorage` is a per-account cache. Google OAuth credentials and a production database must be configured before the live flow can start. The browser does not provide a general profile replacement endpoint.
