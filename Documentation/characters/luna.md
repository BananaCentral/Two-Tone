# Luna Character Sheet

## Identity

- Character ID: `luna`
- Display name: Luna
- Archetype: Sub DPS
- Level: 1 by default

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 50 |
| Attack | 25 |
| Physical Defense | 1 |
| Magical Defense | 6 |
| Speed | 30 |

Calculated stats scale with Level and follow the shared character, Attack, Defense, and Speed standards.

## Passive: Moonlight

- Luna ignores 60% of the target's Magical Defense when dealing Magical damage.

## Basic Attack: Magical Erosion

- Deals AoE Magical damage at a 0.30× Attack multiplier.
- Applies one Erosion stack to each enemy hit. Erosion lasts for two of the affected enemy's turns, reduces Magical Defense by 10% per stack, and stacks up to four times per enemy. Reapplying Erosion adds a stack and refreshes its duration.
- Restores 20 Energy and 1 party Skill Point.

## Skill: Arcane Burst

- Costs 1 party Skill Point and restores 20 Energy.
- Consumes every Erosion stack on living enemies. Luna gains 10% Magical damage per stack consumed for two of her turns. The bonus is based on the total stacks consumed across all enemies, has no additional cap, and a new cast replaces the previous bonus.

## Ultimate: Lunar Eclipse

- Costs 100 Energy and is an off-turn action.
- Advances Luna's next action by 50 percentage points and delays every living enemy's next action by 50 percentage points.
- Increases Luna's Attack by 100% for two of her turns.

## Simulator Notes

- The benchmark models Moonlight, Erosion, Arcane Burst, and Lunar Eclipse as described above. The 100% Ultimate Attack bonus doubles Luna's Attack while it lasts; the Arcane Burst bonus multiplies Magical damage and is separate from Attack.
- Negative effective defense follows the [Damage Type Standard](../damage-type-standard/damage-type-standard.md), including its 2× per-hit damage-factor cap.
- No artwork, weapon, duplicate, or upgrade data is authored for Luna yet.
