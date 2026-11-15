# Featured Lottery Standard

## Store Access and Cost

The Store offers featured character and premium weapon lotteries. Each lottery draw costs 100 coins and is purchased from the merchant. A draw delivers its reward immediately.

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

Common lottery rewards include bundles of five Large Enchanted Bottles in character lotteries and five Large Experience Books in premium weapon lotteries. Rare lottery rewards include Cores and Gems. See the [Item Standard](../item-standard/item-standard.md) for item effects and other acquisition sources.

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

