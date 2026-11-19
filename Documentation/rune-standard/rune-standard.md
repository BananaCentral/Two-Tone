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
| **Radiant Moon** | When the wearer uses a damaging Skill, it adds 50% Echo to each direct hit of that Skill. Passive, Basic Attack, Ultimate, and damage-over-time events do not activate it. Echo follows the [Echo Standard](../echo-standard.md). |
| **Eternal Sun** | The wearer's next damaging Ultimate is guaranteed to critically hit and gains 50 percentage points of Critical Damage. |
| **Celestial Star** | After the wearer resolves an Ultimate, advance the wearer's next action by 100% of their action interval. Then Celestial Star is unavailable for the wearer's next two turns. |
| **Dark Matter** | On the wearer's next damaging Basic Attack, Skill, or Ultimate, ignore 40% of both Physical and Magical Defense and amplify the attack's Physical, Magical, or True damage by 20%. |
| **Clear Skies** | After the wearer uses a Skill, grant a shield equal to 10% of their Max HP for two wearer turns. While the wearer has any shield, add 10 percentage points of Reflect. Damage dealt to an enemy Barrier does not trigger Reflect. Reflect follows the [Reflect Standard](../reflect-standard.md). |
| **Infinite Space** | When the wearer uses an Ultimate, delay every living enemy on the field by 100% of that enemy's action interval, even if the Ultimate deals no damage. Each affected enemy is immune to Infinite Space's delay for its next two turns. |
| **Recycle** | When the wearer uses a Skill, restore 1 Skill Point, subject to the party's Skill Point cap. |
| **Amplify** | When Amplify is not on cooldown, the wearer's Basic Attack deals 50% more damage. Apply the bonus once per Basic Attack action to the complete action, including all its hits and targets, whether Single Target, Blast, or AoE. After the Basic Attack resolves, Amplify is unavailable for the wearer's next two turns. |
| **United** | When the wearer successfully uses a Skill on one or more allies, advance the wearer by 50% of their action interval. United is then unavailable for the wearer's next two turns. |

## Cooldowns and Eligibility

Each cooldown starts when the effect triggers and is measured in the wearer's own turns. A two-turn cooldown is unavailable during the wearer's next two turns; a one-turn cooldown is unavailable during the wearer's next turn. Radiant Moon, Eternal Sun, Celestial Star, Clear Skies, Recycle, Amplify, and United have two-turn cooldowns. Dark Matter has a one-turn cooldown. Infinite Space instead tracks immunity separately for each enemy it delayed.

All Runes require a four-piece set to activate. Eligibility below describes whether a character's current kit has an action that can trigger the effect; future characters are evaluated from their authored actions, not a fixed roster list.

| Rune | Current eligible wearers | Trigger condition |
|---|---|---|
| Radiant Moon | Lily, Zero | A damaging Skill resolves. |
| Eternal Sun | Lily, Logan, Soul, Zero | A damaging Ultimate resolves. |
| Celestial Star | All current characters | An Ultimate resolves. |
| Dark Matter | All current characters | A damaging Basic Attack, Skill, or Ultimate resolves. |
| Clear Skies | All current characters | The wearer uses a Skill. |
| Infinite Space | All current characters | The wearer uses an Ultimate. |
| Recycle | All current characters | The wearer uses a Skill. |
| Amplify | All current characters | The wearer uses a Basic Attack. |
| United | Dawn, Logan | The wearer uses a Skill targeting one or more allies. |

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

- Cooldowns expire after the listed number of the wearer's turns. A shield from Clear Skies lasts through two of the wearer's turns; unused shield is removed when it expires.
- Action Advance and Action Delay use the action interval rules in the [Turn Order Standard](../turn-order-standard/turn-order-standard.md). Independent effects from separate actions resolve normally under that standard.
- Activate each set effect at most once for its triggering action. A multi-hit damaging Skill gets Echo on each hit, while Radiant Moon's cooldown begins only once for the whole Skill. Infinite Space's immunity is tracked separately for each wearer and enemy.

## Implementation Status

Rune equipment is available per character in Loadout → Runes. Each slot can equip a Rune from any set the player owns. Slot selection, Rune stats, and Rune levels persist independently per character. Set effects use fixed values at every Rune level.

The set effect list shows the equipped count for each represented set and marks a bonus active only at four pieces. Mixed sets are allowed and grant no set effects. Selecting an occupied slot opens its main and substat controls, upgrade action, and Switch/Remove actions. Selecting an empty slot opens the owned Rune picker. Switching or removing a Rune returns it to inventory.

Set cooldowns, shields, and Infinite Space enemy immunities are tracked during battle and reset when a new battle starts. Runes are intended to come from Challenges; Challenge content and reward rules are not configured yet.

Rune performance comparisons follow the [Action Value Standard](../action-value-standard.md): compare the no-Rune wearer baseline against the same wearer with only one eligible four-piece set passive active. Rune main stats and substats are excluded from both branches so the report isolates the set passive.
