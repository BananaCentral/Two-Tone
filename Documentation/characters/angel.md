# Angel Character Sheet

## Identity

- Character ID: `angel`
- Display name: Angel
- Archetype: Sub DPS
- Level: 1 by default
- Uses the shared portrait placeholder until character artwork is added.

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 75 |
| Attack | 25 |
| Physical Defense | 3 |
| Magical Defense | 3 |
| Speed | 30 |

## Passive: Hydration

- Each time Angel deals HP damage, he heals for 10% of that damage.
- Healing is limited by Angel's missing HP. Damage absorbed by a barrier does not count as HP damage.

## Basic Attack: Splash

- Deals blast Magical damage at a 1.25× Attack multiplier.
- Restores 10 Energy and 1 party Skill Point.

## Skill: Current

- Costs 1 party Skill Point. Each use advances to the next cycle; cycle 3 returns to cycle 1.

| Cycle | Target pattern | Damage multiplier | Energy restored |
|---|---|---:|---:|
| 1 | Single target | 0.75× | 10 |
| 2 | Blast | 1.25× | 20 |
| 3 | AoE | 1.75× | 30 |

## Ultimate: Tsunami

- Costs 100 Energy and deals AoE Magical damage.
- Each use randomly selects a 1.25×, 1.5×, or 1.75× Attack multiplier with equal probability.

## Equipment and Duplicates

- No weapon or duplicate effects are defined for Angel yet.

## Simulator Notes

- The seeded simulator rolls Tsunami's multiplier from the same three equally likely values.
- Hydration uses the shared lifesteal rule, which counts damage to HP after barrier absorption.
