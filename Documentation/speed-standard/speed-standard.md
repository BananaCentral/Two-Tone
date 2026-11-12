# Two-Tone Speed Standard

## Purpose

This standard defines Speed as a character and enemy stat and describes how it interacts with the turn timeline.

## Speed

- Each character and enemy has an individual Base Speed.
- Speed is calculated as:

  `Speed = round((Base Speed + total flat modifiers) × Level × (1 + total percentage modifiers))`

- Flat modifiers add to Base Speed before Level is applied.
- Percentage modifiers add together and apply after Level scaling.
- The final value rounds to the nearest whole number.
- Summons use the Speed defined by their creating ability or summon data. Summons do not affect the party average.

## Turn Order

- Speed determines a unit's first turn and contributes to its turn rate as defined in the Turn Order Standard.
- Team averages include the units specified by the Turn Order Standard.
- Speed changes recalculate future turn timing while preserving accumulated Advance and Delay, as defined in the Turn Order Standard.

## Open Design Decisions

- Each character's and enemy's Base Speed value.
- Whether any units use a level other than their character Level when calculating Speed.
