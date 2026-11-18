# Two-Tone Attack Standard

## One Attack stat

Every character and enemy has one **Attack** stat. Physical, Magical, and True damage actions all use that full Attack stat. An action's damage type determines which defense applies; it does not select a different attack stat.

`Attack = round-to-nearest-0.25(((Base Attack + non-equipment flat modifiers) × Level + equipment flat modifiers) × (1 + percentage modifiers))`

Attack increases from character Level, weapons, Tune, shields, and Attack Runes use the same calculation. An Attack Rune adds its full value to Attack. Percentage Attack effects apply once to the unified Attack stat.

## Damage and defense

- Physical damage uses Attack and the target's Physical Defense.
- Magical damage uses Attack and the target's Magical Defense.
- True damage uses full Attack. Its defense reduction combines both defenses:

  `True damage reduction = 0.5 × min(Physical Defense ÷ Attack, 1) + 0.5 × min(Magical Defense ÷ Attack, 1)`

Apply damage-type-specific defense ignores to their matching defense contributions before calculating the True damage reduction. The total reduction cannot exceed 100%.

Calculated stats round to the nearest 0.25 without rounding to whole numbers. Damage and HP changes use their separate whole-number rounding rules. See the [Damage Type Standard](../damage-type-standard/damage-type-standard.md).
