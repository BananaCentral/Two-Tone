# Two-Tone Physical Attack Standard

## Purpose

This standard defines how Physical Attack is calculated and used by actions.

## Physical Attack

- Each character has an individual Base Physical Attack.
- Physical Attack is calculated as:

  `Physical Attack = round(((Base Physical Attack + total non-equipment flat modifiers) × Level + total equipment flat modifiers) × (1 + total percentage modifiers))`

- Non-equipment flat modifiers add to Base Physical Attack before Level is applied.
- Equipment flat modifiers, including Runes, are added after Level scaling.
- Percentage modifiers add together and apply after Level scaling and equipment flats.
- The final value rounds to the nearest whole number.

## Action Usage

- Each character's Basic, Skill, and Ultimate defines how it uses Physical Attack.
- There is no single usage multiplier shared by every action.

## Open Design Decisions

- Each character's Base Physical Attack value.
- How much Physical Attack each Basic, Skill, and Ultimate uses.
