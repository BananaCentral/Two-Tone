# Lifesteal Standard

## Purpose

This standard defines Lifesteal, a hidden combat stat available to allies and enemies.

## Hidden Stat

- Lifesteal is a fraction of damage converted to healing. For example, `0.10` means 10%.
- Lifesteal is hidden and is not shown as one of the six standard combat stats or on visible stat cards.
- Allies and enemies have 0% Lifesteal by default.
- The effective rate is the base rate plus active bonuses and modifiers, with a minimum of 0. There is no default maximum rate.

## Resolution

For each damage instance, heal its source by `round(actual HP damage × effective Lifesteal rate)`.

- Calculate healing after critical hits, defense, resistance, damage increases or reductions, and all other final damage modifiers.
- Actual HP damage is capped by the target's remaining HP, so overkill cannot produce extra healing.
- Include HP damage from effects such as Barrier shatter damage. Barrier damage itself does not count because it does not reduce HP.
- Heal the source, up to its Max HP. Lifesteal cannot revive a defeated unit, and a damage instance that deals no HP damage does not heal.
- Resolve Lifesteal separately for each hit, including each AoE target and each follow-up, ricochet, or summon damage instance. Use the unit that owns the damage instance as its source.

The battle renderer shows a `LIFESTEAL +N` cue when a source actually recovers HP. The hidden rate itself is not displayed.

## Runtime Fields

Units may define `lifesteal` as their base rate. Effects may add a `lifestealBonus` or named entries in `lifestealModifiers`; bonuses are additive fractions. Enemy archetype modifiers are copied onto their battle units. An absent value is treated as zero.
