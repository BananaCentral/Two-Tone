# Character Loadout

The main-menu **Loadout** opens the character equipment and ability progression screen.

## Screen layout

Follow the [UI Copy Standard](../project-standard/ui-copy-standard.md) for concise labels, and the [UI Layout Standard](../project-standard/ui-layout-standard.md) for panel hierarchy, spacing, and alignment.

The Loadout uses one character-details view with a persistent four-part frame:

- A strip of large, circular portrait crops across the top switches the selected character without leaving the current tab. Use face portraits cropped from character artwork, not scaled-down full-body artwork.
- A vertical navigation rail on the left opens **Details**, **Weapons**, **Runes**, and **Celestials**.
- The selected character's standing character artwork occupies the center. Battle sprites are reserved for combat.
- The right panel contains the active tab's information and controls. The close button returns to the main menu.

Character level, combat stats, Enchanted Bottles, and character Ascension are grouped under **Details**. Weapon level, Potential, Enchanted Books, weapon Ascension, and equip state are grouped under **Weapons**. Rune slots and Core upgrades are grouped under **Runes**. Celestial upgrades are grouped under **Celestials**. Character selection and tab navigation remain available while using each panel. Dev-only preview controls remain hidden in Regular Mode.

On the Weapons panel, center the larger **WEAPONS** heading above the panel card. Inside the card, show only the selected weapon's name at the left edge, where the former section heading appeared, directly above its artwork. Give the weapon artwork the full panel width. Put the current all-stats bonus below the XP bar, left-aligned just above the **Upgrade**/**Ascend** button. Keep the three Enchanted Book selectors visible at the bottom of the panel, with each book's XP value, owned quantity, and selected quantity. Tap anywhere on a book card to allocate one book, up to the owned quantity. **Clear** resets the current book selection. **Upgrade** confirms and consumes the selected books. At an uncompleted Ascension gate, that same control becomes **Ascend** and the book selectors are replaced by a **GEMS** heading and one Gem card at the left edge, the same size as a book card, showing the owned Gem count. One Gem is consumed on confirmation. At the current level cap it is disabled. **Switch** equips the other signature weapon when the Premium weapon is owned. Premium Potential increases when a duplicate Premium weapon is awarded by the lottery.

## Signature weapons

Each character has exactly two character-bound signature weapon options. Each option has its own weapon Level and XP progression. Weapon Level caps follow the character level caps defined by player Rank and use the Character XP curve.

- **Standard** is the default weapon and starts at Potential 1. Its Level 1 stat bonus is 31%, increasing by 5 percentage points per Potential. Weapon Level adds 1 percentage point per level, reaching 80% at Potential 1 and 100% at Potential 5 at weapon Level 50.
- **Premium** is acquired through the Store. It starts at Potential 1 with a 51% Level 1 stat bonus, increasing by 25 percentage points per Potential. Weapon Level adds 1 percentage point per level, reaching 100% at Potential 1 and 200% at Potential 5 at weapon Level 50.

A character can use only their own Standard or Premium signature weapon. The active weapon percentage applies to all defined combat stats. Character-specific weapon effects are added when that character's weapon is defined.

See the [Weapon Level Standard](../weapon-level-standard/weapon-level-standard.md) for caps, XP requirements, and the full Potential bonus table.

## Runes

A character equips up to four owned Runes in independent slots. Slots may contain Runes from different sets; a set effect activates only when all four equipped pieces belong to that same set. Mixed sets have no set effect. Selecting an occupied slot opens its main and substat customization, level upgrade, Switch, and Remove actions. Selecting an empty slot opens the owned Rune picker. Set effects are fixed at every Rune level and affect the wearer as defined in the [Rune Set Standard](../rune-standard/rune-standard.md).

Calculated combat stats round to the nearest 0.25 after character level, equipment, and percentage modifiers are applied. Keep quarter-point precision through stat calculations. Damage and HP changes continue to round to whole HP.

Each rune has a level from 1 to 5, one main stat, and three substats. Within each rune, all four selected stats must be different. Main and substats may repeat across different runes.

One Core raises one Rune by one level. See the [Item Standard](../item-standard/item-standard.md).

At rune level L, the main stat adds:

| Stat | Main stat bonus |
|---|---:|
| HP | 100 × L |
| Attack | 20 × L |
| Physical Defense | 4 × L |
| Magical Defense | 4 × L |
| Speed | 20 × L |

Each substat adds 25% of its corresponding main stat value at that rune level. Attack is a universal flat bonus added once to the character's Attack stat.

## Rune selection UI

- Each rune card shows the main stat as a prominent clickable control above its three clickable substats.
- Selecting the main stat or a substat opens a picker showing all five available stats at once.
- Choices that would duplicate another stat within that rune are disabled.

## Celestials

Each character has four Celestials, corresponding to Passive, Basic Attack, Skill, and Ultimate. Each starts at Level 1 and can be upgraded to Level 10.

Each Celestial level adds 10% of the ability's base multiplier. This is applied multiplicatively as `base multiplier × (1 + 0.10 × celestial level)`; Level 1 therefore gives the character a default +10% multiplier.

One Core raises one Celestial by one level, up to its Level 10 cap. See the [Item Standard](../item-standard/item-standard.md).

## Character and weapon duplicates

Character Duplicates are separate from weapon Potential and persist on each character's Loadout. Each playable character's Duplicate effects are listed in their Character Sheet.

Premium Potential 2–5 correspond to weapon Duplicates 1–4. Character-specific effects are defined in the character sheets, including [Soul](../characters/soul.md), [Dawn](../characters/dawn.md), and [Zero](../characters/zero.md). Premium effects require that the weapon be owned and equipped.

## Saved equipment and progression

The authenticated player profile stores weapon ownership, Potential, Level and XP, Rune configuration and equipment, Celestial levels, and character Duplicates. Players acquire premium weapons and their duplicates through the [Featured Lottery](../store-standard/featured-lottery-standard.md). See the [Account and Player Data Standard](../account-and-player-data-standard.md) for persistence.
