# Two-Tone Damage Type Standard

## Purpose

This standard defines which attack and defense stats apply to Physical, Magical, and True damage.

## Damage Types and Attack Basis

- Physical damage uses Physical Attack.
- Magical damage uses Magical Attack.
- True damage uses both attack stats at 50% value each:

  `True Attack = (Physical Attack × 0.5) + (Magical Attack × 0.5)`

- Each action determines how much of its applicable attack basis it uses to calculate damage before Defense.

## Damage Reduction

- Physical damage uses the target's Physical Defense and the attacker's Physical Attack:

  `Physical reduction = min(target Physical Defense ÷ attacker Physical Attack, 1)`

- Magical damage uses the target's Magical Defense and the attacker's Magical Attack:

  `Magical reduction = min(target Magical Defense ÷ attacker Magical Attack, 1)`

- True damage uses both defense stats at 50% value each:

  `Physical reduction contribution = 0.5 × min(Physical Defense ÷ Physical Attack, 1)`

  `Magical reduction contribution = 0.5 × min(Magical Defense ÷ Magical Attack, 1)`

  `True reduction = Physical reduction contribution + Magical reduction contribution`

- Damage taken is calculated as:

  `Damage taken = round(damage before Defense × (1 − reduction))`

- Each Defense type can reduce True damage by at most 50%; both together can reduce it by up to 100%.
- If a Defense type equals or exceeds its matching Attack stat, it contributes its full 50% reduction to True damage.
- For Physical and Magical damage, reduction is capped at 100%. If applicable Defense equals or exceeds the matching Attack stat, that damage is reduced to zero.
- Damage rounds to the nearest whole number.
