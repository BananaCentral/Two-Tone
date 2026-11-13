# Soul Character Sheet

## Identity

- Character ID: `soul` (legacy runtime key: `zero`)
- Display name: Soul
- Level: 1 by default

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 200 |
| Physical Attack | 20 |
| Magical Attack | 20 |
| Physical Defense | 2 |
| Magical Defense | 2 |
| Speed | 20 |

Calculated stats scale with Level and use the matching stat standards.

## Passive: Follow Up

- When another ally's action deals damage to one or more enemies, Soul makes one automatic Follow Up attack if a proc remains.
- Soul's own Basic and Ultimate do not trigger Follow Up.
- Follow Up deals True damage at a 0.5× multiplier.
- Each allied action instance is one unique source. A multi-hit or multi-target action can trigger at most one Follow Up.
- Follow Up has 5 procs at battle start. The Ultimate refills it to 5 after its damage resolves.
- If the triggering action damaged multiple enemies, the Follow Up's total damage is distributed as evenly as possible across the surviving enemies it hit. Any remainder is assigned in target order.
- A Follow Up attack cannot trigger another Follow Up.

## Basic Attack

- Deals True damage at a 1.0× multiplier.
- Restores 10 Energy.
- Restores 1 party Skill Point under the shared Basic default.
- If Soul has Enhanced Basic stacks, each stack adds 1.0× to this Basic's multiplier and restores an additional 10 Energy.
- Enhanced Basic stacks are consumed by the next Basic Attack.
- With at least 3 stacks, Basic becomes a Blast: it hits the selected enemy and up to two adjacent enemies, with full damage to each.

## Skill: Enhance

- Enhance is not an action and does not advance the turn.
- Each activation spends 1 party Skill Point and adds one Enhanced Basic stack.
- Soul may activate Enhance repeatedly while Skill Points remain.
- Each stack adds 1.0× Basic damage and 10 Energy to the next Basic Attack.
- At 3 or more stacks, that Basic becomes a Blast targeting up to three adjacent enemies.

## Ultimate

- Costs 100 Energy.
- Deals True damage to all enemies at a 2.0× multiplier.
- After its damage resolves, refills Follow Up to 5 procs.

## Implementation Notes

- The runtime retains the historical internal ID `zero` so existing saved parties and progression remain valid; the player-facing name and character sheet use Soul.
- Unique source means one damaging action instance from another ally, including a source action that hits multiple targets or has multiple hits.
