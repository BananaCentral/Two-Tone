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
| Magical Attack | 20 |
| Physical Defense | 4 |
| Magical Defense | 8 |
| Speed | 20 |

## Level Scaling

Slime is Level 1 in the current training encounter, and the game uses its authored base stats directly. Enemy level-based stat growth has not been defined. A hypothetical Level 50 Slime should not be calculated by applying the character level formula.

## Passive: Slimy

Every third Basic Attack is empowered: it deals 25% more damage and hits all living allied targets. Each target receives the full damage; it is not divided among them. The attack counter resets after the empowered attack, so attacks 3, 6, 9, and so on are empowered.

## Basic Attack

- Targets one random living ally by default.
- Deals Magical damage at a 1.0× multiplier.
- On every third attack, Slimy changes the target pattern to all living allies and increases the multiplier to 1.25×.

## Barrier

Slime has a Barrier equal to 20% of maximum HP. Damage still applies fully to HP; each damaging hit also removes Barrier equal to 25% of that hit. Breaking Barrier deals an additional hit equal to 10% of maximum HP and starts Broken state, following the [Turn Order Standard](../turn-order-standard/turn-order-standard.md).

## Battle Display

The Slime battle sprite asset is a 1:1 256 × 256 PNG. Its visible non-transparent artwork occupies pixels x=20–235 and y=68–196. Rendering trims transparent padding for placement, aligns the visible artwork bottom to its formation-slot baseline, and centers the target circle on the visible sprite.

## Artwork

The two supplied images are stored separately:

- Battle sprite: `assets/slime.png` (transparent 256 × 256 PNG), used for the in-battle enemy rendering.
- Character artwork: `assets/slime-artwork.jpg` (1254 × 1254 JPEG), registered as the enemy's artwork asset.
