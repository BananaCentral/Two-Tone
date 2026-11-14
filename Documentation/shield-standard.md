# Shield Standard

## Purpose

Shields are a per-unit damage buffer. They are separate from HP and enemy Barriers.

## Rules

- A unit starts a battle with zero Shield unless an effect grants one.
- Shield amounts from every source add to that unit's existing Shield. A new Shield never replaces another source's Shield, and there is no default cap.
- Shield does not expire with turns or when its source leaves the field. It remains until damage depletes it or the battle ends.
- Resolve the final damage instance after attack, defense, critical, and other damage modifiers. Shield absorbs that damage first; any remainder reduces HP.
- This applies to physical, magical, and true damage, including Bleed. Shields do not prevent status effects from being applied.
- Lifesteal uses actual HP lost after Shield absorption. Damage absorbed by Shield does not heal the attacker.
- Enemy Barrier remains a separate mechanic. It tracks Barrier damage and breaking; it does not absorb the damage that is applied to HP. A unit's Shield absorbs incoming HP damage, including Barrier shatter damage.
- Each unit owns an independent Shield total. Excess Shield on one unit cannot protect another.
- A multi-target Shield effect may apply its full stated amount to every target. Do not divide the amount among targets unless the effect explicitly says to distribute a shared pool.
- Shields are cleared when combat ends. Between-battle persistence is not defined.

## Display

Show Shield as a translucent gray layer over the green HP bar. Extend the gray layer past the current HP fill to visualize the Shield buffer, with a small amount of extra room beyond the HP scale. Keep HP green visible through the layer. Do not print the current Shield total on ally cards or enemy and boss HUDs. Increase the ally battle card height to give the layered bar room. Damage feedback may still identify how much damage a Shield absorbed.

## Runtime

Units store remaining Shield in `shield`, defaulting to `0`. Add Shield through the shared additive helper and route every incoming damage instance through the shared absorption rule.
