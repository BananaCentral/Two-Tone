# Soul Character Sheet

Battle-stage artwork uses `assets/soul-battle.png` under the shared Character Battle Sprite Standard. The HUD portrait uses `assets/soul-portrait.png`.

## Identity

- Character ID: `soul` (legacy runtime key: `zero`)
- Display name: Soul
- Level: 1 by default

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 100 |
| Physical Attack | 20 |
| Magical Attack | 20 |
| Physical Defense | 4 |
| Magical Defense | 4 |
| Speed | 20 |

Calculated stats scale with Level and use the matching stat standards.

## Passive: Follow Up

- When another ally's action deals damage to one or more enemies, Soul makes one automatic Follow Up attack if a proc remains.
- Soul's own Basic and Ultimate do not trigger Follow Up.
- Follow Up deals True damage at a 0.5× multiplier.
- Each allied action instance is one unique source. A multi-hit or multi-target action can trigger at most one Follow Up.
- Follow Up has 5 procs by default, or 7 with Character Duplicate 1. The Ultimate refills it to the current proc limit after its damage resolves.
- If the triggering action damaged multiple enemies, the Follow Up's total damage is distributed as evenly as possible across the surviving enemies it hit. Any remainder is assigned in target order.
- A Follow Up attack cannot trigger another Follow Up.

## Basic Attack

- Deals True damage at a 1.0× multiplier.
- Restores 10 Energy.
- Restores 1 party Skill Point under the shared Basic default.
- If Soul has Enhanced Basic stacks, each stack adds 1.0× to this Basic's multiplier and restores an additional 10 Energy.
- Enhanced Basic stacks are consumed by the next Basic Attack.
- With at least 3 stacks, Basic becomes a Blast: it hits the selected enemy and up to two adjacent enemies, with full damage to each. Premium Weapon Duplicate 3 changes this to AoE.

## Skill: Enhance

- Enhance is not an action and does not advance the turn.
- Each activation spends 1 party Skill Point and adds one Enhanced Basic stack.
- Soul may activate Enhance repeatedly while Skill Points remain.
- Each stack adds 1.0× Basic damage and 10 Energy to the next Basic Attack.
- At 3 or more stacks, that Basic becomes a Blast targeting up to three adjacent enemies. With Premium Weapon Duplicate 3, it instead becomes AoE.

## Ultimate

- Costs 100 Energy.
- Deals True damage to all enemies at a 2.0× multiplier.
- After its damage resolves, refills Follow Up to its current limit (5 by default, or 7 with Character Duplicate 1).

## Loadout

- Soul starts with his Standard signature weapon at Potential 1, granting +80% to all six stats. Potential 5 grants +100%; each intermediate potential adds 5 percentage points.
- The Premium signature effect refunds 1 Skill Point after every 3 Skill Points spent on Enhance. It is active starting at Potential 1.
- His Premium signature weapon is a separate, character-locked option. It grants +100% at Potential 1 and +200% at Potential 5, with 25 percentage points per potential. Its Potential 1 effect refunds 1 Skill Point after every 3 Skill Points spent on Enhance. Store ownership remains unavailable until the Store is implemented.
- Premium Potential 2–5 correspond to weapon Duplicates 1–4. Duplicate 1 doubles Basic's base multiplier; Duplicate 2 adds 10 percentage points of Critical Rate and 25 percentage points of Critical Damage; Duplicate 3 changes a 3-stack Enhanced Basic from Blast to AoE; Duplicate 4 restores one Follow Up proc for every two Follow Up activations.
- Soul's four Celestials start at Level 1. Each level increases its corresponding ability multiplier by 10% of its base value. At Level 1, Follow Up is 0.55×, Basic is 1.1×, each Enhance stack adds 1.1×, and Ultimate is 2.2×.
- Runes add flat stats: main-stat value × rune level; each of three distinct substats contributes 25% of that value. Rune-set names and passive effects are not defined yet.

## Character Duplicates

- Duplicate 1 raises Follow Up capacity from 5 to 7.
- Duplicate 2 doubles Follow Up's base multiplier from 0.5× to 1.0×.
- Duplicate 3 doubles Ultimate's base multiplier from 2.0× to 4.0×.
- Duplicate 4 raises each Enhance stack's Basic damage increase from +100% to +200%.
- Character Duplicate levels are separate from weapon Potential. Their acquisition costs are not defined yet.

## Implementation Notes

- The runtime retains the historical internal ID `zero` so existing saved parties and progression remain valid; the player-facing name and character sheet use Soul.
- Unique source means one damaging action instance from another ally, including a source action that hits multiple targets or has multiple hits.
