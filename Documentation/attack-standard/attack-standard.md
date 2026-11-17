# Two-Tone Attack Standard

## Generic Attack

Characters may have one generic Attack stat instead of separate Physical Attack and Magical Attack stats. Generic Attack is used at its full value by Physical, Magical, and True actions. The action's damage type determines which target Defense applies.

`Attack = round-to-nearest-0.25(((Base Attack + non-equipment flat modifiers) × Level + equipment flat modifiers) × (1 + percentage modifiers))`

Attack increases from character Level, weapons, Tune, and Attack Runes use this same calculation. An Attack Rune adds its full value to generic Attack. For a character with typed Attack stats, it adds to each defined typed Attack stat.

## Typed Attack

Characters may instead define Physical Attack, Magical Attack, or both when their ability kits require separate stats. Physical actions use Physical Attack and Magical actions use Magical Attack. True Attack for a split-stat character is the full sum of its Physical and Magical Attack values.

Calculated stats round to the nearest 0.25 without rounding to whole numbers. Damage and HP changes use their separate whole-number rounding rules. See the [Damage Type Standard](../damage-type-standard/damage-type-standard.md).
