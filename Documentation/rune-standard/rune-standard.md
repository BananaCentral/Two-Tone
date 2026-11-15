# Two-Tone Rune Set Standard

## Purpose

This standard defines Rune Set equipment and combat effects. Rune Sets are selected per character and provide one fixed effect to their wearer.

## Set Equipment and Rune Levels

- A character may equip one Rune Set at a time. Runes equipped on that character must belong to that set; effects from different sets cannot be combined on the same character.
- Each character chooses their set independently. Different characters may equip different sets, including the same set.
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

## Timing and Combination Rules

- A cooldown starts after its triggering action resolves. The next two scheduled turns belonging to the Rune's wearer are the cooldown turns; the effect is ready again after those turns.
- A two-turn effect starts after its triggering action resolves and remains active through the wearer's next two scheduled turns.
- Action Advance and Action Delay use the action interval rules in the [Turn Order Standard](../turn-order-standard/turn-order-standard.md). Independent effects from separate actions resolve normally under that standard.
- Apply set effects once per named trigger as specified above. Do not reapply an effect for each hit within one action unless the effect explicitly says otherwise.

## Implementation Status

This document defines the intended Rune Set behavior. The current Loadout implementation supports four Rune stat slots and Rune leveling, but does not yet provide Rune Set selection or apply these set effects in combat.
