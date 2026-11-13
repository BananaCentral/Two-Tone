# Slime

## Identity

- Category: Common (`common`)
- Runtime archetype: `slime`
- Level: 1 in the current training encounter

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 100 |
| Physical Attack | 0 |
| Magical Attack | 10 |
| Physical Defense | 1 |
| Magical Defense | 2 |
| Speed | 5 |

## Passive: Slimy

Every third Basic Attack is empowered: it deals 25% more damage and hits all living allied targets. Each target receives the full damage; it is not divided among them. The attack counter resets after the empowered attack, so attacks 3, 6, 9, and so on are empowered.

## Basic Attack

- Targets one random living ally by default.
- Deals Magical damage at a 1.0× multiplier.
- On every third attack, Slimy changes the target pattern to all living allies and increases the multiplier to 1.25×.

## Artwork

The two supplied images are stored separately:

- Battle sprite: `assets/slime.png` (transparent 256 × 256 PNG), used for the in-battle enemy rendering.
- Character artwork: `assets/slime-artwork.jpg` (1254 × 1254 JPEG), registered as the enemy's artwork asset.
