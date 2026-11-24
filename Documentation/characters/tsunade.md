# Tsunade Character Sheet

## Identity

- Character ID: `tsunade`
- Display name: Tsunade
- Archetype: Sub DPS / Control
- Level: 1 by default
- Uses the shared portrait placeholder until character artwork is added.

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 125 |
| Attack | 30 |
| Physical Defense | 4 |
| Magical Defense | 4 |
| Speed | 5 |

Calculated stats scale with Level and follow the shared character, Attack, Defense, and Speed standards.

## Passive: Slow Start

- When Tsunade uses a Basic Attack, Skill, or Ultimate, she gains one +50% Speed stack for two of her turns, up to ten stacks.
- Speed stacks are additive. Each new action refreshes all Slow Start stacks to two turns.
- The action's stack is added before its hit effects resolve. A successful Stun or debuff proc removes one Slow Start stack per affected target.

## Basic Attack: Brute Force

- Deals single-target Physical damage at a 1.0× Attack multiplier.
- Has a 25% chance to Stun the target for one turn. A successful Stun removes one Slow Start stack.
- Restores 10 Energy and 1 party Skill Point.

## Skill: Intense Smash

- Costs 1 party Skill Point and restores 20 Energy.
- Deals blast Physical damage at a 1.5× Attack multiplier.
- Each living target hit has a 25% chance to reduce its Physical Defense by 25% for two turns. A successful application removes one Slow Start stack; repeat applications refresh that target's debuff duration.

## Ultimate: Sudden Impact

- Costs 120 Energy and is an off-turn action.
- Deals AoE Physical damage at a 2.0× Attack multiplier.
- Each living target hit has a 25% chance to reduce its Attack damage by 25% for two turns. A successful application removes one Slow Start stack; repeat applications refresh that target's debuff duration.

## Equipment and Duplicates

- No weapon or duplicate effects are defined for Tsunade yet.

## Simulator Notes

- The shared engine and simulator use seeded chance rolls for Stun and the Skill / Ultimate debuffs.
- Slow Start changes future turn timing using the same Speed modifiers as Cloud's Speed buff.
