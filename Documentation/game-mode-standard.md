# Game Mode Standard

## Modes

Two-Tone has two modes, selected from the Game Mode tile on the main menu:

- **Regular** is the default mode for normal play.
- **Dev Mode** exposes tools used to inspect and exercise unfinished systems.

Switching modes reloads the page in the selected mode. Dev Mode can also be opened directly with `?dev=1` in the URL.

## Regular Mode

- A new player starts with Soul as their only party member and 0 coins.
- The main-menu Daily Reward offers 100 coins once per 12:00 AM Eastern claim period. Each mode saves its claim state separately; see the [Daily Coin Reward Standard](daily-reward-standard.md).
- Do not show developer controls or test-only actions in menus, battle, or loadout screens.
- Do not apply developer grants or test hooks to regular play.
- Existing intentional regular-mode progress is retained. The one-time migration removes the old prototype's default test coins, resets its default Soul/Lily/Dawn demo party to Soul, and clears free duplicate, potential, and rune previews from the former shared profile.

## Dev Mode

- Developer controls may be shown and used for testing.
- A new Dev Mode profile also starts with Soul and 0 coins; the developer coin-grant controls can add test currency.
- Test changes are saved in a separate browser profile from Regular mode.

## Profile Separation

Keep party, character progression, saved HP, loadouts, item inventory, coins, daily reward claim state, player Rank, lottery pity counters, target selections, featured rotation state, and character-ID migration state separate between modes. Switching modes must not overwrite or expose the other mode's browser-saved progress.

## Main Menu

The Game Mode tile shows the current mode and switches to the other mode. See the [Main Menu Standard](main-menu-standard/main-menu-standard.md).
