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

`Documentation/combat-simulator/example-soul-lily-vs-slimes.json` is a Level 1 Soul and Lily team scenario against five Slimes. To compare either character solo under the same conditions, remove the other ally from `teams.allies`.

Use `--json` for machine-readable output, `--max-actions 2000` to set a battle limit, or `--help` for options. Re-running with the same config and seed produces the same batch.

## Scenario structure

Each scenario defines stat and ability archetypes, then creates team instances by referencing those archetypes. Instance IDs must be unique; archetypes may be repeated, so a scenario can model five Soul instances without duplicating their definitions.

Every archetype provides the six standard stats under `stats`: HP, Physical Attack, Magical Attack, Physical Defense, Magical Defense, and Speed. Every archetype uses the simulator's level scaling for levels 1–50. Final stats follow:

`round(((base + non-equipment flat modifiers) × level + equipment flat modifiers) × (1 + percentage modifiers))`

Rune equipment flats are applied after Level scaling; signature weapon percentage bonuses apply after both. This scaling is standardized for characters in the game, but enemy level growth is not. The live Slime encounter uses its authored Level 1 stats directly; simulator enemy levels above 1 are hypothetical until enemy scaling is defined. Teams are listed as `teams.allies` and `teams.enemies`. The shipped Soul vs Slime example is a focused 1v1 baseline, not a full four-character party benchmark.

Optional `weapon` settings accept `type: standard|premium` and `potential: 1–5`; the weapon percentage applies to all six stats. Standard grants 80% at Potential 1, then 5 percentage points per potential; Premium grants 100% at Potential 1, then 25 points per potential. Optional `runes` are limited to four per unit. Each rune defines `level` 1–5, one `main` stat, three unique `subs`, and an optional shared `setId`; main values are HP 100, defense 4, or attack/speed 20 per rune level, and substats contribute 25%. Optional `celestials` maps `passive`, `basic`, `skill`, and `ultimate` to levels 1–10; each level adds 10% of that ability's base multiplier. Rune-set passives and signature effects without implemented character-specific handlers are not modeled. Soul's current Premium refund and duplicate effects are supported as described below.

Supported attack damage types are `physical`, `magical`, and `true`. Basic and Ultimate attacks define a multiplier and target shape (`single`, `blast`, or `aoe`). `random` and `lowestHp` are primary-target selection policies. Units start with zero Energy unless `energy.start` or an instance `energy` is supplied; Energy is capped at 120 by default.

Supported Skill and Passive effect types:

- `enhanceBasic`: consumes available shared Skill Points before that unit's Basic. Configure added multiplier, Energy per stack, and the stack threshold that changes Basic to Blast (Premium Soul Weapon Duplicate 3 changes it to AoE).
- `followUp`: triggers once for each unique damaging action from another ally while charges remain. The source actor cannot trigger its own Follow Up. Each follow-up uses its own unit's stats; damage is shared evenly among surviving targets hit by the source action.
- `everyNthBasic`: on each Nth Basic by that unit, changes its target mode and applies its damage bonus. The counter is per unit.
- `rampage`: each successful Basic Attack increases later Basic Attack damage by `damageBonus`, up to `maxStacks`. A successful attack adds one stack after resolving, so the first Basic uses base damage; a stack cap of 4 with a 25% bonus reaches +100% damage.
- `ricochet`: models Lily's AoE Skill, one shared Skill Point cost, Energy gain, and two-turn marks. A damaging source action that hits a marked enemy triggers 10% additional True damage on all living Ricochet-marked enemies once per source action. Lily Duplicate 4 adds a second half-strength trigger.
- `exposed`: applies Lily's defense-reduction mark after her Skill, Ultimate, and Hauntling attacks. Each stack scales the target's damage reduction by 0.9; Lily Duplicate 2 can maintain two stacks for three turns.

Lily's Ultimate creates an independent Hauntling after its initial AoE. It acts immediately, then takes two more scheduled turns, dealing AoE True damage with Lily's stats. Duplicate 1 applies a one-turn 10% enemy damage reduction; Duplicate 3 doubles initial Ultimate damage and adds a Hauntling turn. Lily's Premium weapon effects are not modeled.


Soul's `characterDuplicates` field (0–4) enables his four character Duplicate effects. With a Premium weapon, potential levels 2–5 correspond to weapon duplicates 1–4. Soul's Premium weapon refunds one shared Skill Point per three Enhance points spent, starting at Potential 1. The simulator models this effect, Soul's configured character and weapon duplicates, and configured Celestial levels.

## Output

The automated policy uses a ready Ultimate before that ally's next turn action, spends available shared Skill Points on Soul's Enhance, uses Lily's Ricochet Skill when a Skill Point is available, and has allies focus the lowest-HP enemy for single-target attacks. Enemies choose a random living ally. The batch summary reports win rate, average action counts, damage, Skill uses, Follow Ups, Ultimates, AoE attacks, and surviving unit counts. `averageAllyDps` is allied damage divided by elapsed simulator time; one time unit follows the Speed rate formula and is not a real second. `averageUnitStats` contains average damage, turns, and damage per simulator time unit by archetype. A battle reaching its action limit is counted as a draw.

Blast includes the primary target and enemies in adjacent formation slots, up to three total. AoE hits all living enemies. The simulator uses the game's stat scaling, typed damage reduction, follow-up distribution, shared Skill Point rules, and Speed rate formula. It schedules turns by each unit's rate and does not model canvas presentation, random encounter reinforcements, action advance/delay effects, or status effects that are not represented by the supported ability handlers. Keep scenario archetypes aligned with the approved character and enemy sheets. Soul's Enhanced Basic uses Blast targeting, except Premium Weapon Duplicate 3 changes it to AoE; Ultimate uses AoE.

## Enemy Barriers

Enemy archetypes and instances may define `barrierPercent` from 0 to 1. The default is `0.2` (20% of max HP). Every hit deals its normal HP damage and an additional Barrier amount equal to 25% of the damage. Barrier does not mitigate HP damage. Breaking Barrier also deals one extra hit equal to 10% of enemy max HP and starts Broken state. Excess damage does not carry over to Barrier after recovery.

The example also defines the Common Wolf archetype with its live stats and capped Rampage passive. The default example encounter remains Soul vs Slime; change the enemy instance's `archetype` to `wolf` to simulate Soul vs Wolf.

Broken enemies take 50% more damage and skip their scheduled turns. Duration is `max(1, round(enemyBaseTurns × clamp(2 − Speed / 100, 0.5, 1.5)))`; base turns use `max(1, enemy team average Speed / slower team average Speed)`; the individual enemy Speed adjusts its Broken duration. On recovery, the enemy fully cleanses debuffs and marks and restores Barrier to maximum. The simulator reports remaining Barrier and Broken turns for survivors, plus the total number of Barrier breaks.
