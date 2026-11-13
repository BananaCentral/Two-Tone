# Two-Tone Magical Attack Standard

## Purpose

This standard defines how Magical Attack is calculated and used by actions.

## Magical Attack

- Each character has an individual Base Magical Attack.
- Magical Attack is calculated as:

  `Magical Attack = round(((Base Magical Attack + total non-equipment flat modifiers) × Level + total equipment flat modifiers) × (1 + total percentage modifiers))`

- Non-equipment flat modifiers add to Base Magical Attack before Level is applied.
- Equipment flat modifiers, including Runes, are added after Level scaling.
- Percentage modifiers add together and apply after Level scaling and equipment flats.
- The final value rounds to the nearest whole number.

## Action Usage

- Each character's Basic, Skill, and Ultimate defines how it uses Magical Attack.
- There is no single usage multiplier shared by every action.

## Open Design Decisions

- Each character's Base Magical Attack value.
- How much Magical Attack each Basic, Skill, and Ultimate uses.
