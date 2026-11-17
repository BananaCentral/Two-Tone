# Two-Tone Damage Type Standard

## Purpose

This standard defines which attack and defense stats apply to Physical, Magical, and True damage. Attack bases and their scaling follow the [Attack Standard](../attack-standard/attack-standard.md).

## Damage Types and Attack Basis

- An action declares its damage type and uses its stated multiplier with the character’s Attack basis.
- Characters with generic Attack use its full value for Physical, Magical, and True actions. The action type chooses the target defense; it does not halve generic Attack.
- Characters with separate Physical and Magical Attack stats use the matching stat for Physical or Magical actions. Their True Attack is the full sum of both stats: `True Attack = Physical Attack + Magical Attack`.

- Each action determines how much of its applicable attack basis it uses to calculate damage before Defense.

## Damage Reduction

- Physical damage uses the target's Physical Defense and the attacker's Physical Attack:

  `Physical reduction = min(target Physical Defense ÷ Physical Attack basis, 1)`

- Magical damage uses the target's Magical Defense and the attacker's Magical Attack:

  `Magical reduction = min(target Magical Defense ÷ Magical Attack basis, 1)`

- True damage uses both defense stats at 50% value each:

  `Physical reduction contribution = 0.5 × min(Physical Defense ÷ True Attack basis, 1)`

  `Magical reduction contribution = 0.5 × min(Magical Defense ÷ True Attack basis, 1)`

  `True reduction = Physical reduction contribution + Magical reduction contribution`

- Damage taken is calculated as:

  `Damage taken = round(damage before Defense × (1 − reduction))`

- Each Defense type can reduce True damage by at most 50%; both together can reduce it by up to 100%.
- If a Defense type equals or exceeds its matching Attack stat, it contributes its full 50% reduction to True damage.
- For Physical and Magical damage, reduction is capped at 100%. If applicable Defense equals or exceeds the matching Attack stat, that damage is reduced to zero.
- Damage rounds to the nearest whole number.

## Echo Damage

Echo preserves the damage type of its source hit, but copies a percentage of the source hit's actual HP damage. It does not recalculate that damage type's Attack or Defense basis and bypasses Physical, Magical, and True Defense. See the [Echo Standard](../echo-standard.md) for its trigger, rounding, shield, and barrier rules.

## Reflect Damage

Reflect always deals True damage and follows the normal True-damage resolution against the original attacker. Damage dealt to an enemy Barrier does not count toward Reflect, though HP or shield damage from the same hit does. See the [Reflect Standard](../reflect-standard.md).
