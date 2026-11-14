# Taunt Standard

## Purpose

Taunt changes the chance that an opposing unit selects its bearer as the primary target of an attack.

## Taunt Effect

- A Taunt rate is a decimal from `0` to `1`; `0.25` means a 25% chance and `1.0` guarantees selection when checked.
- Taunt is applied to the opposing attacker, and names the unit that caused it as the preferred target. Duration is measured in the affected attacker's scheduled turns and expires at the start of that turn.
- Multiple active Taunts on one attacker remain independent. For each candidate target, use the highest active rate naming that target.

## Target Selection

1. Determine the attack’s normal primary target.
2. Check each living opposing unit named by a Taunt on the attacker, from highest rate to lowest. Roll its Taunt rate; the first successful roll becomes the primary target.
3. If every roll fails, use the normal primary target.

Taunt is a redirection chance. If the normal target is also a Taunt bearer, that target can still be hit when all Taunt rolls fail. A Blast attack uses the resolved target as its center. An AoE attack already hits every target, so Taunt does not change its target set. Explicit player-selected attacks keep the player’s chosen target; automated targeting follows Taunt.

## Runtime Fields

The affected attacker stores `tauntEffects` entries with `{ sourceId, targetId, rate, turns }`. Apply effects through the Taunt helper with an explicit target, rate, and duration. A full cleanse removes the affected attacker's Taunt effects.
