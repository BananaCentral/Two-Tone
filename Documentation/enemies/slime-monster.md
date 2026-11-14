# Slime Monster

## Identity

- Category: Boss (`boss`)
- Runtime archetype: `slime-monster`
- Level: 1
- Health bars: 1 by default; the Boss health display supports up to three.

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 300 |
| Physical Attack | 0 |
| Magical Attack | 60 |
| Physical Defense | 12 |
| Magical Defense | 24 |
| Speed | 60 |

## Passive: Lethal Impact

The Slime Monster ignores 25% of its targets' Physical and Magical Defense when calculating damage.

## Basic Attack

- Targets every living ally.
- Deals Magical damage at a 1.0× multiplier to each target.

## Barrier and Battle Display

Slime Monster uses the standard enemy Barrier equal to 20% of Max HP. Its Boss HP is displayed at the top of the screen with one dot to the left of each HP bar. Its supplied bulky transparent 256 × 256 sprite is used for battlefield rendering and its turn-order portrait.
