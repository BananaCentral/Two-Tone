# Bleed Standard

## Purpose

Bleed is a stackable damage-over-time debuff applied to enemies.

## Stacks and Duration

- Each stack deals damage equal to 2% of the affected enemy's Max HP on a Bleed tick.
- The default cap is five stacks. A source may explicitly define a different cap.
- At the start of the affected enemy's scheduled turn, every current stack deals its damage, then one stack expires. For example, five stacks deal 10% of Max HP on the first tick, then 8%, 6%, 4%, and 2% on the following turns.
- Applying stacks while Bleed is active adds to the current stack count up to the cap. There is no separate duration timer; the remaining stacks define how many turns it can tick.
- Stacks retain their applier as the damage source. The oldest stack expires after each tick.

## Damage Resolution

- Bleed deals true damage: it ignores defense and Barrier and cannot critically strike.
- Apply applicable incoming damage modifiers after calculating the stack damage. Broken's damage increase applies while the enemy is Broken.
- Cap damage at the enemy's remaining HP. A defeated enemy does not take further Bleed ticks.
- Bleed ticks are attributed to their applier. Lifesteal, if any, uses the final HP actually lost and follows the [Lifesteal Standard](lifesteal-standard.md).
- Bleed damage does not count as an attack, so it does not trigger attack-based effects such as Ricochet.

## Runtime Fields

Battle enemies store Bleed stacks as ordered entries containing the applying unit ID. `bleedMaxStacks` defaults to 5 and may be overridden by a source. Clear Bleed when an enemy is fully cleansed.
