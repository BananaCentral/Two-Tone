# Two-Tone Physical Defense Standard

## Purpose

This standard defines how Physical Defense is calculated and how it reduces incoming Physical damage.

## Physical Defense

- Each character has an individual Base Physical Defense.
- Physical Defense is calculated as:

  `Physical Defense = round((Base Physical Defense + total flat modifiers) × Level × (1 + total percentage modifiers))`

- Flat modifiers add to Base Physical Defense before Level is applied.
- Percentage modifiers add together and apply after Level scaling.
- The final value rounds to the nearest whole number.

## Physical Damage Reduction

- Physical Defense reduces Physical damage using the target's Physical Defense and the attacker's Physical Attack.
- The action first determines its Physical damage before Defense. The amount of Physical Attack an action uses remains action-specific.
- Damage reduction is capped at 100%:

  `Physical damage reduction = min(target Physical Defense ÷ attacker Physical Attack, 1)`

  `Physical damage taken = round(Physical damage before Defense × (1 − Physical damage reduction))`

- If Physical Defense equals or exceeds Physical Attack, it prevents all Physical damage from that attack.
- Damage may be reduced to zero.

## Contribution to True Damage Reduction

- Physical Defense contributes up to 50% reduction to True damage, based on the attacker's Physical Attack:

  `Physical contribution = 0.5 × min(target Physical Defense ÷ attacker Physical Attack, 1)`

- Magical Defense contributes the other half, using the matching Magical Defense and Magical Attack values. The combined True damage reduction cannot exceed 100%.

## Open Design Decisions

- Each character's Base Physical Defense value.
- How much Physical Attack each Basic, Skill, and Ultimate uses to determine its pre-Defense damage.
