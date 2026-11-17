# Two-Tone Rune Set Standard

## Purpose

This standard defines Rune Set equipment and combat effects. Rune Set effects are fixed and activate for a character only when all four equipped Runes belong to the same set.

## Set Equipment and Rune Levels

- A character has four Rune slots and may equip any owned Rune in each slot. Equipped Runes may come from different sets.
- A set effect activates only when all four slots contain Runes from that same set. Mixed sets have no set effect; there are no partial set bonuses.
- Each character's four slots are independent. Different characters may equip pieces from the same Rune sets.
- A set effect applies to its wearer, except where its rule explicitly affects a target or targets.
- Set effects keep the values listed below at every Rune level. Rune levels continue to increase the equipped Runes' main and substats as defined in the [Loadout standard](../systems/loadout.md).

## Set Effects

| Rune Set | Effect |
|---|---|
| **Radiant Moon** | Direct damage from the wearer's passives, Basic Attacks, Skills, and Ultimates applies 20% Echo to each hit. Damage-over-time does not Echo. Echo follows the [Echo Standard](../echo-standard.md). |
| **Eternal Sun** | Adds 10 percentage points of Critical Rate, 25 percentage points of Critical Damage, and 10 percentage points of Stealth (dodge chance) to the wearer. Effective Critical Rate and Stealth are each capped at 100%; Critical Damage bonuses add together before being applied to a critical hit. |
| **Celestial Star** | After the wearer resolves an Ultimate, advance the wearer's next action by 100% of their action interval. Then Celestial Star is unavailable for the wearer's next two turns. |
| **Dark Matter** | The wearer's Physical, Magical, and True damage is amplified by 10%. The wearer's attacks also ignore 20% of both Physical and Magical Defense. This applies to each defense wherever it contributes to damage, including both portions of True Damage. |
| **Clear Skies** | The wearer reflects 10% of received HP and shield damage as True damage. While the wearer has a shield, this increases to 20%; the increase ends immediately when the shield is depleted. Damage dealt to an enemy Barrier does not trigger Reflect. Reflect follows the [Reflect Standard](../reflect-standard.md). |
| **Infinite Space** | When the wearer uses an Ultimate, delay every living enemy on the field by 50% of that enemy's action interval. This applies even if the Ultimate does not damage an enemy and only once per enemy per Ultimate. |
| **Recycle** | When the wearer uses a Skill, restore 1 Skill Point, subject to the party's Skill Point cap. After the Skill resolves, Recycle is unavailable for the wearer's next turn. |
| **Amplify** | When Amplify is not on cooldown, the wearer's Basic Attack deals 50% more damage. Apply the bonus once per Basic Attack action to the complete action, including all its hits and targets, whether Single Target, Blast, or AoE. After the Basic Attack resolves, Amplify is unavailable for the wearer's next two turns. |
| **United** | When the wearer successfully uses a Skill on one or more allies, advance the wearer by 100% of their action interval. United is then unavailable for the wearer's next two turns. |

## Rune Set Artwork

Each Rune Set uses its supplied 256 × 256 transparent sprite as its icon. The sprite filenames and application asset keys are standardized here:

| Rune Set | Sprite | Asset key | Visual |
|---|---|---|---|
| **Radiant Moon** | `rune-radiant-moon.png` | `runeRadiantMoon` | Crescent moon and star |
| **Eternal Sun** | `rune-eternal-sun.png` | `runeEternalSun` | Sun |
| **Celestial Star** | `rune-celestial-star.png` | `runeCelestialStar` | Star |
| **Dark Matter** | `rune-dark-matter.png` | `runeDarkMatter` | Black hole |
| **Clear Skies** | `rune-clear-skies.png` | `runeClearSkies` | Clouds and clear sky |
| **Infinite Space** | `rune-infinite-space.png` | `runeInfiniteSpace` | Infinity symbol and stars |
| **Recycle** | `rune-recycle.png` | `runeRecycle` | Repeating arrows |
| **Amplify** | `rune-amplify.png` | `runeAmplify` | Upward power motif |
| **United** | `rune-united.png` | `runeUnited` | Allies and upward arrow |

All sprites are stored in `assets/` and registered in the application asset catalog. Use these icons wherever a Rune Set is represented in the interface.

## Timing and Combination Rules

- A cooldown starts after its triggering action resolves. Recycle is unavailable during the wearer's next scheduled turn; Celestial Star, Amplify, and United are unavailable during the wearer's next two scheduled turns. Each becomes ready again after those turns.
- Action Advance and Action Delay use the action interval rules in the [Turn Order Standard](../turn-order-standard/turn-order-standard.md). Independent effects from separate actions resolve normally under that standard.
- Apply set effects once per named trigger as specified above. Do not reapply an effect for each hit within one action unless the effect explicitly says otherwise.

## Implementation Status

Rune equipment is available per character in Loadout → Runes. Each slot can equip a Rune from any set the player owns. Slot selection, Rune stats, and Rune levels persist independently per character. Set effects use fixed values at every Rune level.

The set effect list shows the equipped count for each represented set and marks a bonus active only at four pieces. Mixed sets are allowed and grant no set effects. Selecting an occupied slot opens its main and substat controls, upgrade action, and Switch/Remove actions. Selecting an empty slot opens the owned Rune picker. Switching or removing a Rune returns it to inventory.

Set cooldowns are tracked per wearer for the current battle and reset when a new battle starts. Recycle becomes ready after the wearer's next scheduled turn; Amplify, Celestial Star, and United become ready after the wearer's next two scheduled turns. Runes are intended to come from Challenges; Challenge content and reward rules are not configured yet.
