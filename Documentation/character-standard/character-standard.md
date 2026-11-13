# Two-Tone Character Standard

## Purpose

This standard defines the required stat and ability entries for every playable character.

## Character Stat Sheet

Every playable character must define these six base stats:

- Base HP
- Base Physical Attack
- Base Physical Defense
- Base Magical Attack
- Base Magical Defense
- Base Speed

Calculated values use the formulas in the matching stat standards. All six stats scale with character Level. A character starts at Level 1.

Critical Rate and Critical Damage are hidden combat stats and are excluded from this six-stat list. Their default values and modifiers follow the [Critical Hit Standard](../critical-hit-standard.md).

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

- Basic Attacks usually restore 1 party Skill Point.
- Skills usually cost 1 party Skill Point.
- Ultimates use the character's defined Energy cost and do not consume a scheduled turn.
- An ability that changes these defaults must state the exact resource change.

The Skill Point Standard and Turn Order Standard define shared resource and timing rules.

## Character Entry Template

```text
Character ID:
Display name:
Base HP:
Base Physical Attack:
Base Physical Defense:
Base Magical Attack:
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
