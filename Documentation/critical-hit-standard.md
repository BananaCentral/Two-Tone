# Critical Hit Standard

## Hidden Stats

Critical Rate and Critical Damage are hidden combat stats. They are not part of the six displayed primary stats and must not be added to the character or enemy stat cards.

- **Critical Rate** is the probability that one damage instance becomes a Critical Hit.
- **Critical Damage** is the bonus damage multiplier applied when that hit is critical.
- Allies and enemies default to 10% Critical Rate and +50% Critical Damage.
- A critical hit deals `base damage × (1 + Critical Damage)`. With the defaults, it deals 1.5× base damage.
- Critical Rate and Critical Damage bonuses from passives, skills, Ultimates, allies, runes, or other effects add to the unit's corresponding hidden stat. Store effect values as decimal bonuses: `0.10` means +10 percentage points.
- Effective Critical Rate is capped at 100%; extra rate bonuses beyond that do not raise the chance further. Critical Damage cannot be negative.

## Damage Resolution

- Roll Critical Rate independently for each positive damage instance after attack and defense have determined base damage.
- Apply Critical Damage to that post-defense damage before barrier damage is calculated. A critical therefore increases both HP damage and barrier damage.
- Multi-hit attacks roll separately for each hit and target. AoE attacks roll separately for each target.
- Follow-ups, Ricochet damage, summons, and enemy attacks use the attacker's hidden Critical Rate and Critical Damage like other damage instances.
- Barrier-shatter damage is a separate system-generated hit and does not make its own Critical Hit roll.
- A damage modifier that changes an attack's base damage is calculated before the critical multiplier. Critical Damage bonuses are additive with one another, then added to 1 for the final multiplier.

## Runtime Modifiers

The runtime stores optional additive effects in `criticalRateModifiers` and `criticalDamageModifiers` maps on the unit. Each source uses a stable key so its own value can be refreshed or removed without overwriting other sources. Rune records may contribute `criticalRateBonus` and `criticalDamageBonus`, stored as decimal bonuses. Soul's Premium Weapon Duplicate 2 adds `0.10` Critical Rate and `0.25` Critical Damage while that Premium weapon is equipped. The headless simulator accepts `critical: { "rate": ..., "damage": ... }` defaults on archetypes or instances, plus `criticalRateBonus` and `criticalDamageBonus` for additional effects.

