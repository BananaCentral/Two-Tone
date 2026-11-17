# Wolf

## Identity

- Category: Common (`common`)
- Runtime archetype: `wolf`
- Level: 1 in the current training encounter

## Tags

- Area: One
- Type: Common
- Strengths: Fast, Physical Attacker, Strong
- Weaknesses: Physically Fragile, Magically Fragile, Fragile

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 50 |
| Attack | 30 |
| Physical Defense | 2 |
| Magical Defense | 2 |
| Speed | 40 |

## Passive: Ravage

Each successful attack applies one Bleed stack to the target, up to five stacks. A successful attack means it deals damage and is not dodged. Each Bleed stack deals damage equal to 2% of the affected unit's maximum HP at the start of that unit's next turn.

## Basic Attack

- Targets one random living ally.
- Deals Physical damage at a 1.0× multiplier.
- Ravage applies one Bleed stack on a successful hit.

## Barrier

Wolf has a Barrier equal to 20% of maximum HP by default. Damage still applies fully to HP; each damaging hit also removes Barrier equal to 25% of that hit. Breaking Barrier deals an additional hit equal to 10% of maximum HP and starts Broken state, following the [Turn Order Standard](../turn-order-standard/turn-order-standard.md).

## Battle Display

Wolf's battle sprite uses a transparent 1:1 PNG canvas. The renderer trims transparent padding for placement, preserves the canvas proportions, aligns visible artwork to the formation-slot baseline, and centers the target circle on the visible sprite.

## Artwork

- Battle sprite: `assets/wolf.png` (transparent PNG), used for in-battle rendering.
- Character artwork: `assets/wolf-artwork.png`, registered separately from the battle sprite.
