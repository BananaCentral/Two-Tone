# Character Loadout

The main-menu **Loadout** opens the character equipment and ability progression screen.

## Signature weapons

Each character has exactly two character-bound signature weapon options. Each option has its own weapon Level and XP progression. Weapon Level caps follow the character level caps defined by player Rank and use the Character XP curve.

- **Standard** is the default weapon and starts at Potential 1. Its Level 1 stat bonus is 31%, increasing by 5 percentage points per Potential. Weapon Level adds 1 percentage point per level, reaching 80% at Potential 1 and 100% at Potential 5 at weapon Level 50.
- **Premium** is acquired through the Store. It starts at Potential 1 with a 51% Level 1 stat bonus, increasing by 25 percentage points per Potential. Weapon Level adds 1 percentage point per level, reaching 100% at Potential 1 and 200% at Potential 5 at weapon Level 50.

A character can use only their own Standard or Premium signature weapon. The active weapon percentage applies to all six stats. Character-specific weapon effects are added when that character's weapon is defined.

See the [Weapon Level Standard](../weapon-level-standard/weapon-level-standard.md) for caps, XP requirements, and the full Potential bonus table.

## Runes

A character can equip up to four runes, all from one rune set. Rune-set names and their passive effects are character-specific and have not been defined yet.

Each rune has a level from 1 to 5, one main stat, and three substats. Within each rune, all four selected stats must be different. Main and substats may repeat across different runes.

One Core raises one Rune by one level. See the [Item Standard](../item-standard/item-standard.md).

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

One Core raises one Celestial by one level, up to its Level 10 cap. See the [Item Standard](../item-standard/item-standard.md).

## Character and weapon duplicates

Character Duplicates are separate from weapon Potential and persist on each character's Loadout. Each playable character's Duplicate effects are listed in their Character Sheet.

Soul's Premium signature effect at Potential 1 and above refunds 1 Skill Point after each three Skill Points spent on Enhance. Soul's Premium signature duplicates map to Premium Potential 2–5: each potential above 1 is one duplicate. Duplicate 1 doubles Basic's base multiplier; Duplicate 2 adds 10 percentage points of Critical Rate and 25 percentage points of Critical Damage; Duplicate 3 makes a 3-stack Enhanced Basic AoE; Duplicate 4 restores one Follow Up after every two Follow Up activations. Premium weapon effects only apply while Soul owns and has selected the Premium weapon.

Dawn's Standard and Premium signature weapons let Tuned allies ignore 20% of enemy defenses. While the owned Premium weapon is equipped, Duplicates 1–4 add Tune damage reduction, Barrier damage, 20% Advance for its target, and Critical Rate/Critical Damage, respectively.

Zero's Premium signature weapon restores 1 Skill Point when he uses his Ultimate. Its Duplicates 1–4 add Basic Attack Bleed, reduce Ultimate Energy cost to 80, grant 20% defense ignore, and double Cutthroat's Critical Rate/Critical Damage bonuses. See the [Zero Character Sheet](../characters/zero.md) for exact values and trigger rules.

## Prototype boundaries

The Loadout screen persists weapon Potential, Level and XP, rune configuration, Celestial levels, and character Duplicate level locally. Potential upgrades do not charge resources because their coin costs have not been defined. Weapon XP comes from Enchanted Books. Premium weapons remain locked until Store acquisition is implemented. Rune-set choices/passives and weapon effects without character-specific definitions remain pending. Premium Potential 2–5 map to weapon Duplicates 1–4. Premium effects require an owned, equipped Premium weapon.
