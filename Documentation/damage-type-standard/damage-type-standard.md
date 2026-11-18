# Damage Type Standard

An action's damage type selects its defense interaction, not its Attack stat. Every Physical, Magical, and True damage action uses the attacker's full unified Attack stat multiplied by the action's multiplier.

## Types

- **Physical:** uses target Physical Defense.
- **Magical:** uses target Magical Defense.
- **True:** uses full Attack and combines Physical and Magical Defense contributions. Each defense contributes up to half of the damage reduction:

  `True damage reduction = 0.5 × min(target Physical Defense ÷ Attack, 1) + 0.5 × min(target Magical Defense ÷ Attack, 1)`

Apply the corresponding defense ignores, damage amplifiers, and exposed effects before resolving damage. Total reduction cannot exceed 100%.

There are no separate Physical Attack or Magical Attack stats. Attack and its level/equipment scaling are defined in the [Attack Standard](../attack-standard/attack-standard.md).
