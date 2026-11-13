# Wolf

## Identity

- Category: Common (`common`)
- Runtime archetype: `wolf`
- Level: 1 in the current training encounter

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 100 |
| Physical Attack | 40 |
| Magical Attack | 0 |
| Physical Defense | 2 |
| Magical Defense | 2 |
| Speed | 40 |

## Passive: Rampage

Each successful Basic Attack adds one Rampage stack after that attack resolves. Each stack increases the Wolf's Basic Attack damage by 25%. Rampage stacks up to four times, for a maximum +100% Basic Attack damage. A failed attack that deals no damage does not add a stack. Reaching four stacks does not consume or remove them.

| Successful Basics completed | Stacks before next Basic | Basic damage bonus |
|---:|---:|---:|
| 0 | 0 | 0% |
| 1 | 1 | 25% |
| 2 | 2 | 50% |
| 3 | 3 | 75% |
| 4 or more | 4 | 100% |

## Basic Attack

- Targets one random living ally.
- Deals Physical damage at a 1.0× multiplier.
- Applies the current Rampage damage bonus. The first Basic Attack uses the base multiplier; subsequent attacks use the stacks earned from earlier successful Basics.

## Barrier

Wolf has a Barrier equal to 20% of maximum HP by default. Damage still applies fully to HP; each damaging hit also removes Barrier equal to 25% of that hit. Breaking Barrier deals an additional hit equal to 10% of maximum HP and starts Broken state, following the [Turn Order Standard](../turn-order-standard/turn-order-standard.md).

## Battle Display

Wolf's battle sprite uses a transparent 1:1 PNG canvas. The renderer trims transparent padding for placement, preserves the canvas proportions, aligns visible artwork to the formation-slot baseline, and centers the target circle on the visible sprite.

## Artwork

- Battle sprite: `assets/wolf.png` (transparent PNG), used for in-battle rendering.
- Character artwork: `assets/wolf-artwork.png`, registered separately from the battle sprite.
