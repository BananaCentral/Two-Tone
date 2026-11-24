# Damage Type Standard

An action's damage type selects its defense interaction, not its Attack stat. Every Physical, Magical, and True damage action uses the attacker's full unified Attack stat multiplied by the action's multiplier.

## Types

- **Physical:** uses target Physical Defense.
- **Magical:** uses target Magical Defense.
- **True:** uses full Attack and combines Physical and Magical Defense contributions. Each defense contributes up to half of the damage reduction:

  `True damage reduction = 0.5 × clamp(effective Physical Defense ÷ Attack, −1, 1) + 0.5 × clamp(effective Magical Defense ÷ Attack, −1, 1)`

Apply the corresponding defense ignores and reduction effects to find each effective defense before resolving damage. Effective defense may be negative. For Physical and Magical hits, `damage factor = clamp(1 − effective Defense ÷ Attack, 0, 2)`. For True hits, use `damage factor = clamp(1 − True damage reduction, 0, 2)`. The factor is applied to damage after Attack, the action multiplier, and other damage amplifiers. Thus defense equal to Attack blocks damage, zero defense leaves damage unchanged, and negative defense amplifies damage. The 2× cap limits amplification from any one hit; damage still follows the normal whole-number rounding rule.

There are no separate Physical Attack or Magical Attack stats. Attack and its level/equipment scaling are defined in the [Attack Standard](../attack-standard/attack-standard.md).
