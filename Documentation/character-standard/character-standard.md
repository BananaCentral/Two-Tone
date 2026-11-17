# Two-Tone Character Standard

## Purpose

This standard defines the required stat and ability entries for every playable character.

## Character Stat Sheet

Every playable character must define HP, Physical Defense, Magical Defense, and Speed. Its attack basis must follow the [Attack Standard](../attack-standard/attack-standard.md) and use one of:

- A generic Base Attack, used at full value by Physical, Magical, or True actions as specified by the action; or
- One or both typed Base Attack stats (Physical Attack and/or Magical Attack) when actions use a specific damage type.

Calculated values use the matching stat formulas and scale with character Level. A character starts at Level 1.

Critical Rate, Critical Damage, Stealth, and Lifesteal are hidden combat stats and are excluded from the primary stat list. Their rules follow the [Critical Hit Standard](../critical-hit-standard.md), [Stealth Standard](../stealth-standard.md), and [Lifesteal Standard](../lifesteal-standard.md).

Each character record must also include a stable character ID and display name. Test placeholders are not character records and do not satisfy this standard.

## Ability Set

Every playable character has exactly one ability in each of these four slots:

1. **Passive** — a persistent or triggered character effect.
2. **Basic Attack** — the character's standard attack.
3. **Skill** — the character's skill action.
4. **Ultimate** — the character's Ultimate action.

Every ability entry must define:

- Ability name and slot.
- Effect, including its trigger and timing when applicable.
- Target or target-selection rule.
- Damage type and scaling stat/rate when it deals damage.
- Resource cost or gain when it changes a resource.
- Duration, stacking, and expiration rules for temporary effects.

A field that does not apply must be marked as not applicable. Ability-specific exceptions must be written into that ability's rules.

## Shared Resource Defaults

- Every allied Basic Attack restores 1 party Skill Point by default.
- Skills usually cost 1 party Skill Point.
- Ultimates use the character's defined Energy cost and do not consume a scheduled turn.
- An ability that changes these defaults must state the exact resource change.

An ability-specific SP exception must be stated in both the character sheet and implementation. Enemy attacks do not restore party SP. The Skill Point Standard and Turn Order Standard define shared resource and timing rules.

## Per-target first-hit effects

An ability whose multiplier depends on the first time its user hits a particular target tracks that state per target and per battle. Any successful damaging action by that character counts as a hit unless the ability explicitly narrows the trigger. The record resets when a new battle starts. A character sheet must state the first-hit multiplier, subsequent multiplier, and what counts as a successful hit.

## Character Entry Template

```text
Character ID:
Display name:
Base HP:
Base Attack (or Base Physical Attack):
Base Physical Defense:
Base Magical Attack (if using separate attack stats):
Base Magical Defense:
Base Speed:

Passive
- Name:
- Effect / trigger / timing:
- Target:
- Duration / stacking / expiration:
- Resource changes:

Basic Attack
- Name:
- Effect:
- Target:
- Damage type and scaling stat/rate:
- Resource changes:

Skill
- Name:
- Effect:
- Target:
- Damage type and scaling stat/rate:
- Resource changes:

Ultimate
- Name:
- Effect:
- Target:
- Damage type and scaling stat/rate:
- Energy cost:
- Resource changes:
```
