# Headless Combat Simulator

Run balance batches in Node.js without opening the canvas game.

## Run it

From the repository root:

```sh
node tools/combat-simulator.mjs
```

The default runs 100 battles with a reproducible seed using the Soul vs Slime example. Choose a custom scenario, batch size, and seed with:

```sh
node tools/combat-simulator.mjs --config path/to/scenario.json --runs 1000 --seed 42
```

Use `--json` for machine-readable output, `--max-actions 2000` to set a battle limit, or `--help` for options. Re-running with the same config and seed produces the same batch.

## Scenario structure

Each scenario defines stat and ability archetypes, then creates team instances by referencing those archetypes. Instance IDs must be unique; archetypes may be repeated, so a scenario can model five Soul instances without duplicating their definitions.

Every archetype provides the six standard stats under `stats`: HP, Physical Attack, Magical Attack, Physical Defense, Magical Defense, and Speed. Stats use the project's level scaling (`base × level`, rounded to the nearest integer) for levels 1–50. Teams are listed as `teams.allies` and `teams.enemies`.

Supported attack damage types are `physical`, `magical`, and `true`. Basic and Ultimate attacks define a multiplier and target mode (`single`, `random`, `lowestHp`, or `all`). Units start with zero Energy unless `energy.start` or an instance `energy` is supplied; Energy is capped at 120 by default.

Supported Skill and Passive effect types:

- `enhanceBasic`: consumes available shared Skill Points before that unit's Basic. Configure added multiplier, Energy per stack, and the stack threshold that changes Basic to all-target.
- `followUp`: triggers once for each unique damaging action from another ally while charges remain. The source actor cannot trigger its own Follow Up. Each follow-up uses its own unit's stats; damage is shared evenly among surviving targets hit by the source action.
- `everyNthBasic`: on each Nth Basic by that unit, changes its target mode and applies its damage bonus. The counter is per unit.

Additional ability effects require adding a handler to the simulator before configs can use them.

## Output

The automated policy uses a ready Ultimate before that ally's next turn action, spends available shared Skill Points on supported Enhance skills, and has allies focus the lowest-HP enemy. Enemies choose a random living ally. The batch summary reports each team's win rate, average action counts, damage, Skill uses, Follow Ups, Ultimates, AoE attacks, and surviving unit counts. A battle reaching its action limit is counted as a draw.

The simulator uses the game's stat scaling, typed damage reduction, follow-up distribution, shared Skill Point rules, and Speed rate formula. It schedules turns by each unit's rate and does not model canvas presentation, random encounter reinforcements, action advance/delay effects, or status effects that are not represented by the supported ability handlers. Keep scenario archetypes aligned with the approved character and enemy sheets.
