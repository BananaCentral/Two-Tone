# Taunt Standard

## Purpose

Taunt changes the chance that an opposing unit selects its bearer as the primary target of an attack.

## Taunt Effect

- A Taunt rate is a decimal from `0` to `1`; `0.25` means a 25% chance and `1.0` guarantees selection when checked.
- Each source defines the Taunt duration. Duration is measured in the bearer’s scheduled turns; a Taunt with one turn expires at the start of that bearer’s next turn.
- Multiple Taunt effects on one bearer do not add together. Each effect remains independent, and the highest active rate is that bearer’s chance. If it expires, the next-highest active effect can apply.
- Taunt from different bearers is resolved in descending rate order. Ties use the unit ID order for deterministic resolution.

## Target Selection

1. Determine the attack’s normal primary target.
2. Check each opposing living bearer with active Taunt, from highest rate to lowest. Roll its Taunt rate; the first successful roll becomes the primary target.
3. If every roll fails, use the normal primary target.

Taunt is a redirection chance. If the normal target is also a Taunt bearer, that target can still be hit when all Taunt rolls fail. A Blast attack uses the resolved target as its center. An AoE attack already hits every target, so Taunt does not change its target set. Explicit player-selected attacks keep the player’s chosen target; automated targeting follows Taunt.

## Runtime Fields

Units store active effects in `tauntEffects`, with `{ sourceId, rate, turns }` entries. Apply effects through the Taunt helper with an explicit rate and duration; expire them at the start of the bearer’s scheduled turn. A full cleanse removes the bearer’s Taunt effects.
