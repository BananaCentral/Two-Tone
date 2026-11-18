# Two-Tone Magical Defense Standard

## Purpose

This standard defines how Magical Defense is calculated and how it reduces incoming Magical damage.

## Magical Defense

- Each character has an individual Base Magical Defense.
- Magical Defense is calculated as:

  `Magical Defense = round(((Base Magical Defense + total non-equipment flat modifiers) × Level + total equipment flat modifiers) × (1 + total percentage modifiers))`

- Non-equipment flat modifiers add to Base Magical Defense before Level is applied.
- Equipment flat modifiers, including Runes, are added after Level scaling.
- Percentage modifiers add together and apply after Level scaling and equipment flats.
- The final value rounds to the nearest whole number.

## Magical Damage Reduction

- Magical Defense reduces Magical damage using the target's Magical Defense and the attacker's Attack.
- The action first determines its Magical damage before Defense. The action's multiplier is action-specific; every damage type uses the same Attack stat.
- Damage reduction is capped at 100%:

  `Magical damage reduction = min(target Magical Defense ÷ attacker Attack, 1)`

  `Magical damage taken = round(Magical damage before Defense × (1 − Magical damage reduction))`

- If Magical Defense equals or exceeds Attack, it prevents all Magical damage from that attack.
- Damage may be reduced to zero.

## Contribution to True Damage Reduction

- Magical Defense contributes up to 50% reduction to True damage, based on the attacker's Attack:

  `Magical contribution = 0.5 × min(target Magical Defense ÷ attacker Attack, 1)`

- Physical Defense contributes the other half, using the target's Physical Defense and the same Attack stat. The combined True damage reduction cannot exceed 100%.

## Open Design Decisions

- Each character's Base Magical Defense value.
- The Attack multiplier on each Basic, Skill, and Ultimate.
