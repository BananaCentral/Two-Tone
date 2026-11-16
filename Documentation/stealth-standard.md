# Stealth Standard

## Hidden Stat

Stealth is a hidden combat stat. Do not display its value on character or enemy stat cards. Show a `DODGE` cue when a Stealth roll succeeds, without revealing the chance.

- Stealth is the target's chance to dodge an incoming attack hit.
- Store the chance as a decimal from `0` to `1`: `0.5` is 50% and `1` is 100%.
- Chance is capped at 100%. A missing value defaults to 0%.
- Stealth is assigned directly and does not scale with character level.
- Existing characters and enemies have 0% Stealth until their data assigns a different value.

## Dodge Resolution

1. Resolve the attack's damage after its attack, defense, and damage modifiers.
2. If the resulting damage is positive, roll the target's Stealth chance independently for that hit.
3. If the roll succeeds, the hit deals no damage and does not proceed to Critical, Shield, Barrier, Barrier break, or Lifesteal resolution.
4. A dodged hit does not grant the target hit-based Energy and does not apply effects triggered by that hit, such as Bleed, marks, or debuffs. Costs, Energy, and other effects belonging to the acting unit's action still resolve normally.

Damage instances that resolve to zero before the Stealth check do not roll. Damage-over-time ticks such as Bleed are not attacks and cannot be dodged with Stealth.

## Targeting and Multiple Hits

Stealth does not change target selection. Single-target, Blast, and AoE attacks can all be dodged. Roll separately for each target and each hit, so a dodge affects only that target's hit; the attack continues against its other targets. Multi-hit attacks make a separate roll for every hit.

## Runtime and Simulator Data

Store Stealth as `stealth` on a unit. The runtime clamps it to the 0–1 range. Combat simulator archetypes and instances accept the same field and validate it within that range; omitted values use 0.
