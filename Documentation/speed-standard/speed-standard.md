# Two-Tone Speed Standard

## Purpose

This standard defines character Speed and explains how Speed interacts with the turn timeline.

## Character Speed

- Each character has an individual Base Speed.
- Character Speed is calculated as:

  `Speed = round(((Base Speed + total non-equipment flat modifiers) × Level + total equipment flat modifiers) × (1 + total percentage modifiers))`

- Non-equipment flat modifiers add to Base Speed before Level is applied.
- Equipment flat modifiers, including Runes, are added after Level scaling.
- Percentage modifiers add together and apply after Level scaling and equipment flats.
- The final value rounds to the nearest 0.25.

## Enemy and Summon Speed

- Enemy definitions provide their authored Level 1 Speed. Enemy categories do not apply Speed multipliers.
- Enemy Speed follows the [Enemy Level Standard](../enemy-level-standard.md): authored Level 1 Speed multiplied by enemy Level, rounded to the nearest 0.25. The current Slime training encounter is Level 1 and uses its authored Speed of 10.
- Summons use the Speed defined by their creating ability or summon data. Summons do not affect the party average.

## Turn Order

- Speed determines a unit's first turn and contributes to its turn rate as defined in the Turn Order Standard.
- Team averages include the units specified by the Turn Order Standard.
- Speed changes recalculate future turn timing while preserving accumulated Advance and Delay, as defined by the Turn Order Standard.
