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

- Deals AoE Magical damage at a 0.50× Attack multiplier.
- Applies one Erosion mark to each enemy hit. Each enemy can hold up to four marks; each mark reduces Magical Defense by 10% and lasts for two of that enemy's turns. Reapplying a mark adds a stack and refreshes its duration.
- Each successful new mark application adds one to Luna's personal counter, up to 20. The counter is independent of the marks still active on enemies, so enemy defeat or mark expiration does not remove counted applications. At the 20-count cap, Erosion can still be applied to enemies, but the counter does not increase further.
- Restores 20 Energy and 1 party Skill Point.

## Skill: Arcane Burst

- Costs 1 party Skill Point and restores 20 Energy.
- Consumes Luna's personal counter, not the Erosion marks on enemies. Marks remain until they expire or their target is defeated or cleansed.
- Luna gains 5% Magical damage per count consumed for two of her turns, up to a 100% bonus from 20 counts. The counter resets to zero; a new cast replaces her previous Arcane Burst bonus.

## Ultimate: Lunar Eclipse

- Costs 80 Energy and is an off-turn action.
- Increases Luna's Attack by 100% for two of her turns.

## Simulator Notes

- The benchmark and live battle use the same personal 20-count counter for Erosion applications. The counter survives enemy defeat and mark expiration until Arcane Burst consumes it; Arcane Burst leaves enemy marks in place. Moonlight, defense reduction, the Arcane Burst damage buff, and Lunar Eclipse use their authored values.
- The 100% Ultimate Attack bonus doubles Luna's Attack while it lasts; the Arcane Burst bonus multiplies Magical damage and is separate from Attack.
- Negative effective defense follows the [Damage Type Standard](../damage-type-standard/damage-type-standard.md), including its 2× per-hit damage-factor cap.
- No artwork, weapon, duplicate, or upgrade data is authored for Luna yet.
