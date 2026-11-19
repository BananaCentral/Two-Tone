# Energy Standard

## Purpose

This standard defines the default personal Energy resource used to activate character Ultimates.

## Starting Energy and cap

- Each allied character starts a battle with 40 Energy by default.
- A character's default maximum Energy is 120.
- Energy belongs to an individual character. It is not shared with the party and is separate from Skill Points.
- Explicit character data or a scenario override may set a different starting amount or cap when a mechanic or focused simulation requires it.

## Energy gains and costs

- Basic Attacks, Skills, Ultimates, and passive effects gain or spend Energy only as stated by their authored rules.
- Energy gains cannot raise a character above their current maximum.
- A character cannot activate an Ultimate unless they meet its Energy cost, unless an explicit rule overrides that requirement.

## Implementation source

`COMBAT_RESOURCE_STANDARD` in `src/scripts/combat-definitions.mjs` is the source of default starting and maximum Energy values. Live battles and the performance simulator use this shared definition. Enemy starting Energy remains 0 unless authored otherwise.
