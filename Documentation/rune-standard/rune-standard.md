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
| **Radiant Moon** | Adds 10 percentage points of Critical Rate to the wearer. Effective Critical Rate remains capped at 100%. |
| **Eternal Sun** | Adds 25 percentage points of Critical Damage to the wearer. Critical Damage bonuses add together before being applied to a critical hit. |
| **Celestial Star** | After the wearer resolves an Ultimate, advance the wearer's next action by 50% of their action interval. |
| **Dark Matter** | The wearer's attacks ignore 20% of the target's Magical Defense. This applies to Magical Defense wherever it contributes to damage, including the Magical Defense portion of True Damage. |
| **Clear Skies** | The wearer's attacks ignore 20% of the target's Physical Defense. This applies to Physical Defense wherever it contributes to damage, including the Physical Defense portion of True Damage. |
| **Infinite Space** | Once per Ultimate, delay each enemy damaged by that Ultimate by 25% of that enemy's action interval. An enemy must take damage from the Ultimate to be delayed. Multi-hit Ultimates still delay each affected enemy only once per Ultimate. |
| **Recycle** | When the wearer uses a Skill, restore 1 Skill Point, subject to the party's Skill Point cap. After the Skill resolves, Recycle is unavailable for the wearer's next two turns. |
| **Amplify** | When Amplify is not on cooldown, the wearer's Basic Attack deals 50% more damage. Apply the bonus once per Basic Attack action to the complete action, including all its hits and targets, whether Single Target, Blast, or AoE. After the Basic Attack resolves, Amplify is unavailable for the wearer's next two turns. |
| **United** | When the wearer successfully uses a Skill or Ultimate on one or more allies, increase the wearer's Speed by 25% for the wearer's next two turns. This affects only the wearer. Reapplying United refreshes its duration; the Speed bonus does not stack. |

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

- A cooldown starts after its triggering action resolves. The next two scheduled turns belonging to the Rune's wearer are the cooldown turns; the effect is ready again after those turns.
- A two-turn effect starts after its triggering action resolves and remains active through the wearer's next two scheduled turns.
- Action Advance and Action Delay use the action interval rules in the [Turn Order Standard](../turn-order-standard/turn-order-standard.md). Independent effects from separate actions resolve normally under that standard.
- Apply set effects once per named trigger as specified above. Do not reapply an effect for each hit within one action unless the effect explicitly says otherwise.

## Implementation Status

Rune equipment is available per character in Loadout → Runes. Each slot can equip a Rune from any set the player owns. Slot selection, Rune stats, and Rune levels persist independently per character. Set effects use fixed values at every Rune level.

The set effect list shows the equipped count for each represented set and marks a bonus active only at four pieces. Mixed sets are allowed and grant no set effects. Selecting an occupied slot opens its main and substat controls, upgrade action, and Switch/Remove actions. Selecting an empty slot opens the owned Rune picker. Switching or removing a Rune returns it to inventory.

Set cooldowns and durations are tracked per wearer for the current battle and reset when a new battle starts. Recycle and Amplify become ready again after the wearer's next two scheduled turns. United remains active through the wearer's next two scheduled turns. Runes are intended to come from Challenges; Challenge content and reward rules are not configured yet.
