# Character Loadout

The main-menu **Loadout** opens the character equipment and ability progression screen.

## Signature weapons

Each character has exactly two character-bound signature weapon options:

- **Standard** is the default weapon and starts at Potential 1. Its stat bonus is 80%, increasing by 5 percentage points per potential, through 100% at Potential 5.
- **Premium** is acquired through the Store. It starts at Potential 1 with a 100% stat bonus, increasing by 25 percentage points per potential, through 200% at Potential 5.

A character can use only their own Standard or Premium signature weapon. The active weapon percentage applies to all six stats. Character-specific weapon effects are added when that character's weapon is defined.

## Runes

A character can equip up to four runes, all from one rune set. Rune-set names and their passive effects are character-specific and have not been defined yet.

Each rune has a level from 1 to 5, one main stat, and three substats. Within each rune, all four selected stats must be different. Main and substats may repeat across different runes.

At rune level L, the main stat adds:

| Stat | Main stat bonus |
|---|---:|
| HP | 200 × L |
| Physical Attack | 20 × L |
| Magical Attack | 20 × L |
| Physical Defense | 2 × L |
| Magical Defense | 2 × L |
| Speed | 20 × L |

Each substat adds 50% of its corresponding main stat value at that rune level.

## Celestials

Each character has four Celestials, corresponding to Passive, Basic Attack, Skill, and Ultimate. Each starts at Level 1 and can be upgraded to Level 10.

Each Celestial level adds 10% of the ability's base multiplier. This is applied multiplicatively as `base multiplier × (1 + 0.10 × celestial level)`; Level 1 therefore gives the character a default +10% multiplier.

## Prototype boundaries

The Loadout screen persists weapon potential, rune configuration, and Celestial levels locally. Its upgrade controls do not charge resources because upgrade costs have not been defined. Premium weapons remain locked until Store acquisition is implemented. Rune-set choices/passives and signature weapon effects await character-specific definitions. The current character roster has Soul's real stats; placeholder slots are not loadout-enabled.
