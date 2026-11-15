# Featured Lottery Standard

## Store Access and Cost

The Store offers featured character and premium weapon lotteries. Each lottery draw costs 100 coins and is purchased from the merchant. A draw delivers its reward immediately.

New Regular and Dev Mode wallets start with 0 coins. Coin balance is saved in the active mode's profile. Players can claim 100 free coins once per day from the main menu; see the [Daily Coin Reward Standard](../daily-reward-standard.md).

For manual testing, switch to Dev Mode from the main menu or append `?dev=1` to the site URL. Dev Mode shows Store controls that grant 100, 500, 1,000, or 5,000 coins. These controls are hidden in Regular mode.

## Banner UI

Follow the shared [UI Layout Standard](../project-standard/ui-layout-standard.md) for panel hierarchy, spacing, and alignment. The two-panel banner arrangement below defines the Store-specific layout.

- Use a two-panel layout modeled on event-banner screens: a selectable banner list on the left and the selected banner's detail view on the right.
- Show all current featured options in the left list: up to three character banners and their three paired premium weapon banners. Each row shows portrait art, the target name, and whether it is a Character or Premium Weapon banner.
- On the 1600×900 game canvas, the left list is approximately 338×714 at x=28, y=116. The right detail panel is approximately 1186×714 at x=386, y=116. Keep the coin balance and Back control above both panels and the weekly rotation note below them.
- Clicking a left-side row selects that banner as the corresponding lottery's target and updates the right detail panel. Character and weapon targets remain independent. Show the active row clearly; mark any other saved target for the other lottery type without making it the active detail view.
- The right detail panel emphasizes the selected character or weapon artwork and name, then shows the relevant pity, odds, and single-draw / ten-draw controls. Draw controls are disabled until a target for that lottery type has been selected.
- When there is no saved target, show an empty detail state that directs the player to choose one of the left-side banners. Do not add banner chips, a second target-selection panel, limited-time subtitles, or a persistent instruction bar.
- Opening the Store or selecting a banner does not show a confirmation notice. Show notices only for actionable errors or action confirmations, such as a completed draw summary or a Dev Mode coin grant.

Each banner offers a single draw for 100 coins and a ten-draw option for 1,000 coins. Ten draws are resolved in order, one ticket at a time, with the same pity and reward rules as individual draws. The ten-draw option has no discount.

For the reveal, each ticket rises into view showing its back over 1,000 ms, then waits for the player to tap or click it. The card flips to reveal the reward over 500 ms. Keep the reward face visible for as long as the player wants. In a ten-draw, tapping or clicking the revealed card brings out the next ticket; after the tenth reward, the next tap opens the summary. The summary remains open until the player presses **Done**, which is available immediately. These durations follow the 250 ms animation timing unit in the [Combat Action Resolution Standard](../combat-action-resolution-standard.md).

## Featured Rotation

The Store may feature up to three character and signature premium weapon pairs at once. A player chooses one featured target for each lottery type they use. The character and weapon in each pair correspond to one another.

Featured selections rotate weekly at 12:00 AM in the `America/New_York` time zone. The character rotation must show every available character before showing a character again. The paired signature weapons follow the character rotation. When a rotation changes, players must select a new target from the current lineup. Pity progress and heightened state are preserved.

## Reward Tiers

Each draw has the following base tier chances:

| Tier | Base chance |
| --- | ---: |
| Mythic | 1% |
| Rare | 10% |
| Common | 89% |

Within a tier, every item in that tier's reward pool has an equal chance. Tier chances are independent of the number of items in a pool.

Common lottery rewards include bundles of five Large Enchanted Bottles in character lotteries and five Large Enchanted Books in premium weapon lotteries. Rare lottery rewards include Cores and Gems. See the [Item Standard](../item-standard/item-standard.md) for item effects and other acquisition sources.

For a mythic reward, there is a 75% chance to receive the player's selected featured target and a 25% chance to receive an off-feature reward of the same type. Character lotteries award off-feature characters; premium weapon lotteries award off-feature premium weapons.

## Pity Counters

Counters are stored per player and shared by all lotteries of the same type. Character lotteries share one character mythic counter, rare counter, and heightened state. Premium weapon lotteries share their own weapon mythic counter, rare counter, and heightened state. Character and weapon progress are independent. Counters and heightened state carry over when one featured lottery ends and another begins, including across rotations.

| Lottery type | Mythic guarantee, regular | Mythic guarantee, heightened | Rare guarantee |
| --- | ---: | ---: | ---: |
| Character | 100 draws | 50 draws | 10 draws |
| Premium weapon | 50 draws | 25 draws | 10 draws |

A mythic drop resets only that type's mythic counter. A rare drop resets only that type's rare counter. Other counters are unchanged. If the mythic and rare guarantees are both due on a draw, the mythic guarantee takes priority. Since a mythic drop does not reset the rare counter, the rare guarantee remains due for the next draw until a rare reward is received.

An off-feature mythic reward immediately activates the heightened state for that lottery type. In the heightened state, the base mythic chance is 2% and the type-specific heightened guarantee applies. The heightened state ends when the player receives their selected featured target. The lottery then returns to its regular rules.

## Draw Resolution

1. Charge 100 coins and increment the selected lottery type's draw counters.
2. If its mythic guarantee is due, award mythic. Otherwise, if its rare guarantee is due, award rare. Otherwise, roll the mythic chance, then the rare chance, then common.
3. Reset only the counter for a tier that was awarded.
4. For mythic rewards, roll the 75% featured / 25% off-feature outcome from the correct type's pool.
5. Start heightened state on an off-feature mythic. End heightened state on the selected featured target.

