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
- The final value rounds to the nearest whole number.

## Enemy and Summon Speed

- Enemy archetypes define their current Speed directly. Enemy categories do not apply Speed multipliers.
- The current Slime training encounter uses its authored Speed of 20 at Level 1. No enemy level-scaling standard is defined.
- Summons use the Speed defined by their creating ability or summon data. Summons do not affect the party average.

## Turn Order

- Speed determines a unit's first turn and contributes to its turn rate as defined in the Turn Order Standard.
- Team averages include the units specified by the Turn Order Standard.
- Speed changes recalculate future turn timing while preserving accumulated Advance and Delay, as defined by the Turn Order Standard.

## Open Design Decisions

- Each character's Base Speed value.
- Whether enemy Speed will receive level scaling if enemy progression is defined.
