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
| HP | 100 × L |
| Physical Attack | 20 × L |
| Magical Attack | 20 × L |
| Physical Defense | 4 × L |
| Magical Defense | 4 × L |
| Speed | 20 × L |

Each substat adds 25% of its corresponding main stat value at that rune level.

## Rune selection UI

- Each rune card shows the main stat as a prominent clickable control above its three clickable substats.
- Selecting the main stat or a substat opens a picker showing all six available stats at once.
- Choices that would duplicate another stat within that rune are disabled.

## Celestials

Each character has four Celestials, corresponding to Passive, Basic Attack, Skill, and Ultimate. Each starts at Level 1 and can be upgraded to Level 10.

Each Celestial level adds 10% of the ability's base multiplier. This is applied multiplicatively as `base multiplier × (1 + 0.10 × celestial level)`; Level 1 therefore gives the character a default +10% multiplier.

## Character and weapon duplicates

Character Duplicates are separate from weapon Potential and persist on each character's Loadout. Soul's Duplicate effects are listed in the Soul Character Sheet. Lily's Duplicate effects are listed in the Lily Character Sheet.

Soul's Premium signature effect at Potential 1 and above refunds 1 Skill Point after each three Skill Points spent on Enhance. Soul's Premium signature duplicates map to Premium Potential 2–5: each potential above 1 is one duplicate. Duplicate 1 doubles Basic's base multiplier; Duplicate 2 restores one Follow Up after Soul kills an enemy; Duplicate 3 makes a 3-stack Enhanced Basic AoE; Duplicate 4 restores one Follow Up after every two Follow Up activations. Premium weapon effects only apply while Soul owns and has selected the Premium weapon.

## Prototype boundaries

The Loadout screen persists weapon potential, rune configuration, Celestial levels, and character Duplicate level locally. Its upgrade controls do not charge resources because upgrade costs have not been defined. Premium weapons remain locked until Store acquisition is implemented. Rune-set choices/passives and weapon effects without character-specific definitions remain pending. Premium Potential 2–5 map to weapon Duplicates 1–4. The current playable roster is Soul and Lily; Lily's Premium effects are documented in her Character Sheet and require an owned, equipped Premium weapon.
