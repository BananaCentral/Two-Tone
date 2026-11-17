# Echo Standard

## Purpose

Echo is a secondary damage effect that copies a percentage of a direct hit to the same target. Allies and enemies may be Echo sources.

## Source Value

- A combat unit's optional `echoPercent` value is a decimal from `0` to `1`; for example, `0.2` means 20% Echo damage.
- Missing `echoPercent` defaults to `0`, so the unit does not Echo damage.
- Echo belongs to the attacking source. The target pattern comes from the source attack.

## Trigger and Amount

- Each successful direct damage hit may produce one Echo hit. Multi-target attacks calculate Echo separately for each target, and every hit in a multi-hit action is echoed separately.
- Capture the direct hit's actual HP damage after its ordinary damage resolution. Damage absorbed by a shield does not count. Barrier-break bonus damage is a separate effect and is not included in the captured hit.
- Calculate Echo damage as `round(captured direct HP damage × echoPercent)`.
- A hit dealing no HP damage produces no Echo. Echo cannot hit a target that the original hit defeated.
- Damage-over-time ticks, including Bleed, do not trigger Echo.

## Echo Resolution

- Echo hits the same target as the hit that produced it and preserves that hit's damage type: Physical, Magical, or True.
- Echo does not recalculate or apply Physical, Magical, or True Defense. It also does not roll Stealth or Critical a second time, and it does not reapply damage modifiers already reflected in the captured hit.
- Shields can absorb Echo damage. Against enemies, Echo also damages the Barrier and can trigger its normal break effect.
- Echo may benefit its source from Lifesteal based on the HP damage Echo actually deals. Echo does not reapply attack-triggered effects such as Bleed, Follow-up, or Ricochet.
- Echo cannot trigger Echo. This prevents recursive chains.

## Resolution Order

Resolve each original hit first, then its Echo hit. In a multi-target action, process each target's Echo from that target's captured damage. Echo does not divide the source damage across targets.

For example, if an attack deals 100 HP damage to each of two targets and its source has 20% Echo, each target receives a separate 20-point Echo hit of the same damage type.
