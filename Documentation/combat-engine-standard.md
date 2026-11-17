# Shared Combat Engine Standard

## Goal

Combat balance reports must execute the same combat rules and authored combat data as live battles. A second rules implementation can drift from the game and produce attractive but invalid ratings.

## Source of truth

- `src/scripts/combat-definitions.mjs` owns character and enemy combat sheets. The browser game and analysis tools import these definitions. Display-only art and labels remain in the live roster entries.
- `src/scripts/combat-math.mjs` owns shared numeric primitives used by live battle code and the simulator, including HP/stat rounding and typed direct-hit damage.
- `src/scripts/combat-engine-api.mjs` is the shared runtime API boundary. Both live battles and the runner use its action intents (authored action plan plus resource commitment), typed-hit calculation, target plans, enemy basic-attack plans, Rune triggers, complete direct/Reflect/Echo damage sequences, bleed ticks, Shield/healing application, character-specific effect handlers, shared status application and aging, Follow-Up/Ricochet allocation, summon lifetime, battle outcomes, and turn timeline.
- Simulation-only scenario settings may select lineups, scale encounter profiles, choose AI policies, and seed randomness. They must not redefine a character's stats, abilities, passives, enemy attacks, or damage rules.

## Required architecture for trusted results

The headless runner must call the same deterministic combat runtime as a live battle for:

1. action eligibility and resource costs;
2. basic attacks, skills, ultimates, and passive triggers;
3. damage intake, stealth, critical hits, shields, barriers, barrier breaks, Echo/Reflect trigger amounts, and damage-over-time intake;
4. turn scheduling, action advance/delay, status durations, defeat, and victory.

The live UI should provide presentation callbacks around this runtime; it must not own a second set of combat outcomes. Randomness must be injectable so paired simulation branches can replay identical seeds.

## Current migration status

The browser game and runner share authored character/enemy sheets, typed damage math, direct-hit intake, barrier damage and break resolution, complete Reflect/Echo event sequencing, Bleed stacks and tick resolution, Exposed/Bleed/Ricochet hit effects, Follow-Up charge and target allocation, Shield/healing application, Dawn Tune/Ultimate, Logan Blood Shield, Zero/Lily/Logan ultimate effects, Lily summon plans and duration, shared mark/debuff/taunt/tune/residue updates, action intents, target plans, skill-point and Energy settlement, Rune effects and cooldown timing, enemy basic-attack plans, battle outcome checks, turn scheduling, and status-duration/cleanse operations. Both call `TwoToneBattleEngine` for those state changes. The engine owns shared combat formulas and state transitions; callers provide derived equipment/stat context and retain presentation/metrics bookkeeping.

## Runtime boundary

The player controller and simulator policy choose different actions by design. They submit those intents to `TwoToneBattleEngine`, which owns action planning and resource commitment, typed damage and intake, character hit effects, support actions, ultimate effects, Rune cooldowns, Follow-Up and Ricochet allocation, summon duration, enemy attack plans, status state, turn scheduling, and battle outcome decisions. The browser retains animation, input, and wave presentation; the simulator retains its AI policy, scenario loop, and metrics collection. Adapters may choose targets or attach presentation/metrics, but must not add alternate damage, resource, status, or ability-effect rules.

Performance reports should still be treated as provisional until parity coverage exercises every authored action/effect family against the same initial state and seed. Add a shared-engine handler and parity coverage whenever a mechanic changes or a new one is added.

## Change requirements

- Update the shared combat sheet when a character, enemy, or ability changes; do not patch only a report fixture.
- Add a shared runtime handler before treating a newly implemented game mechanic as simulator coverage.
- Keep unsupported mechanics explicit. Never silently approximate them as zero-value or disable them.
- Record the engine/schema version and source revision with generated studies.
- Compare paired branches from identical state, policy, and random seed.

## Completion criteria

This standard is satisfied when a headless battle can be run through the same combat runtime that resolves live battles, with parity cases covering every supported action/effect family. Shared data or shared hit resolution alone does not establish engine parity.
