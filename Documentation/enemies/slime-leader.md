# Slime Leader

## Identity

- Category: Elite (`elite`)
- Runtime archetype: `slime-leader`
- Level: 1
- Health bars: 1

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 200 |
| Physical Attack | 0 |
| Magical Attack | 40 |
| Physical Defense | 8 |
| Magical Defense | 16 |
| Speed | 40 |

## Passive: Residue

When the Slime Leader damages an ally, it applies one Residue stack to that ally. Residue lowers both defenses and damage dealt by 5% per stack, up to five stacks (25%). Each application refreshes the duration to two of the marked ally's turns. The duration decreases after that ally completes a Basic Attack or Skill; an off-turn Ultimate does not consume a Residue turn. Residue ends when its duration expires or the battle ends.

## Basic Attack

- Chooses a random living ally as the primary target.
- Hits that ally and living allies in adjacent party formation slots, up to three targets total.
- Deals Magical damage at a 1.0× multiplier to each target.
- Each ally damaged receives one Residue stack.

## Barrier and Battle Display

Slime Leader uses the standard enemy Barrier equal to 20% of Max HP. Its supplied transparent 256 × 256 sprite is used for both battlefield rendering and its turn-order portrait.
