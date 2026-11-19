# Character Performance Benchmark Standard

## Purpose

This standard defines what the combat performance runner measures and what its results mean. It is intended to make character comparisons repeatable, expose gaps in the sample, and prevent a single automated policy from being mistaken for a universal character rating.

The benchmark uses the combat definitions and `TwoToneBattleEngine` shared with live battles. A result is valid only for mechanics that the shared engine resolves and the simulator records. A passing simulation is not a substitute for game-versus-simulator event-trace parity.

## Benchmark population

The benchmark roster is discovered from `CHARACTER_COMBAT_DATA`, `ENEMY_COMBAT_DATA`, and `RUNE_COMBAT_RULES`. The evaluator must not maintain a second hand-written character or enemy roster. Adding a combat definition should make the combatant available to scenario generation; unsupported mechanics must produce an explicit coverage or implementation failure.

Every character performance scenario uses exactly four living ally slots at battle start. Each focal character appears in every scenario; the other three slots rotate across legal teammate formations. Each scenario records:

- number of allies and enemies;
- enemy class mix, using authored enemy tags;
- enemy Level (1: authored stats, 2: +1, 3: +2);
- exact enemy identities, class mix, and formation;
- the automated action policy identifier;
- candidate, character, and teammate composition.

The sampled suite allocates cells across enemy count, enemy class band, and enemy Level. Enemy lineups are selected to expose the individual archetypes as well as mixed groups. Teammate formations rotate within those strata. The report lists categories that were absent from the sample. A missing category is a coverage gap; it is never treated as zero performance. Party size is fixed at four and is not a rating dimension. Encounter duration is observed from actions and turns; the benchmark does not force short, medium, or long fights by multiplying HP.

Candidate characters are tested in candidate-anchored panels: every tested character receives the same number of cells across the same four-person team, enemy-count/class, and enemy-Level strata. The focal character is included in its own party, and the other slots rotate through available teammates. The report lists design cells covered by each character so a low sample cannot be hidden by global coverage. Teammates are part of the test population because characters act in a team combat system. A character score therefore describes performance in this benchmark population; it does not claim to measure an isolated character independent of allies.

## Enemy Level scaling

Enemies use the same level curve as characters. For each stat, `effectiveStat = roundToNearest0.25(authoredLevelOneStat × level)`. This applies to HP, Attack, Physical Defense, Magical Defense, and Speed. Enemy passives, attacks, stealth, and other mechanics do not change with Level. The game supports enemy Levels 1–50; the benchmark uses Levels 1, 2, and 3 as authored, +1, and +2 challenge bands without changing authored Level 1 data. Each result records authored and effective stats. Bear is authored at 450 HP, 90 Attack, 6/6 defenses, and Speed 60; at Level 2 it has 900 HP, 180 Attack, 12/12 defenses, and Speed 120. See the [Enemy Level Standard](enemy-level-standard.md).

## Policy contract

Every result names its automated policy. Policy is part of the benchmark definition because different legal decisions can change the value of an ability. Candidate names must not appear in a policy's decision rules.

The runner provides three generic policies that use no character-name decision rules:

- `scripted-auto-v1`: use a ready Ultimate, then use a Skill whenever the current shared Skill Point pool allows it, otherwise use a Basic Attack.
- `skill-reserve-auto-v1`: use a ready Ultimate, but preserve one shared Skill Point; use a Skill only while the pool is above that reserve, otherwise use a Basic Attack.
- `effect-aware-auto-v1`: use a ready Ultimate; choose a Skill when its tagged effect is useful in the current state. It compares expected Skill and Basic damage using current targets, and checks for available support value such as a teammate able to use a next-Basic buff, an unfilled healing/shield need, or a new tagged enemy status. For ally-targeted support, it chooses the next scheduled living ally, breaking ties by expected Basic damage.

These are reproducible policy probes, not optimal-play or human-play models. The default benchmark runs all three policies on matched scenarios and seeds and equally averages their scores for the headline rating. It also reports each policy score and the minimum-to-maximum spread. A single policy can be selected for diagnosis, but is not the default character rating.

Policy changes require a new policy identifier and a new benchmark report. This makes a result reproducible and prevents comparing scores that used different action rules as if they came from the same test.

## Outcome score

Each completed battle receives an outcome score:

- ally victory: 100;
- enemy victory: 0.

Combat has no draws. Reaching the simulator's action limit is reported as an incomplete timeout; the benchmark counts it as a non-win in the headline win rate and reports timeout rates separately. The score averages sampled encounter outcomes within enemy-class bands (`common_only`, `elite_present`, and `boss_present`), then gives each represented band equal weight. Within each sampled scenario, the three policy win rates receive equal weight. Scenario selection balances four-person teammate formations, enemy count/class band, and enemy Level; the report exposes missing design cells and enemy archetype coverage. The score is a 0–100 summary of success under the named scenario and policy mix. It is not a character's intrinsic power, and a score of 0 does not mean a character contributed nothing.

Character outcome ratings use each character's actual authored kit in every battle. The gauge does not create a disabled-abilities version or calculate a full-kit-versus-control difference. Instead, battle events report which tagged abilities activated and the values the shared engine recorded. Individual passive, action, or effect studies may still use a narrowly scoped control to answer a specific component question; those results are separate from whole-character win rates.

## Mechanic contribution

The runner compares a mechanic and its control under matched scenarios and random seeds. It records the observed battle-outcome difference and event evidence, including opportunities, activations, applications, and resolved values where the engine exposes them.

Interpret the metrics together:

- **Outcome change** says whether the paired change affected wins, losses, or action-limit timeouts in this benchmark.
- **Opportunity and activation counts** show whether the mechanic was actually tested and how often it ran.
- **Resolved event values** show what the mechanic changed, such as damage, healing, Shield, energy, Skill Points, or action timing.
- **Scenario coverage** shows where the observation came from.

Event values explain the result; they are not arbitrary point weights. Mechanic contribution scores are not additive because effects can overlap, enable one another, or change later decisions. An unobserved mechanic is reported as unobserved, not as ineffective.

## Pairing and uncertainty

Treatment and control use the same scenario and seed. This paired comparison reduces noise when the shared random inputs affect both branches similarly. The paired analysis is used directly; sharing random numbers is not assumed to reduce variance in every case.

Reports show two separate 95% intervals:

1. **Seed interval:** variation across the repeated, matched seeds in the sampled scenarios.
2. **Scenario interval:** stratified bootstrap variation from resampling scenario compositions within enemy-class bands.

The intervals answer different questions. Neither repairs missing scenario coverage or an inaccurate combat model. Reports must show sample counts and disclose missing benchmark categories.

## Efficiency and sample size

Quick, balanced, and full are named reproducible sample sizes, not confidence guarantees. The current design contains 45 scenario strata per character panel: five enemy counts × three enemy-class bands × three enemy Levels. Quick samples 23 strata with 5 matched seeds. Balanced covers all 45 strata once with 10 matched seeds under each of the three policies. Full samples each stratum twice (90 compositions) with 20 matched seeds under each policy. Enemy identity and composition rotate within count/class/Level strata. A narrow seed interval alone is not a stopping rule. Increase scenario coverage when the scenario interval remains wide, when enemy identities are missing, or when a result changes substantially by stratum. Increase seed repetitions when seed uncertainty remains wide.

The full combinatorial scenario matrix is for offline enumeration. Standard balance work should use a documented stratified sample and report its coverage rather than waiting for every possible lineup. Reuse paired control results when their configuration is identical. Preserve a seed, benchmark version, policy identifier, scenario selection, and combat-definition revision with every report.

## Required report fields

Every benchmark report includes:

- benchmark version, generation time, seed range, scenario-policy count, and character simulation count;
- policy identifier and a statement of policy coverage;
- per-character 0–100 party win rate using the character's actual kit;
- separate seed and scenario uncertainty intervals;
- coverage counts and missing categories for four-person teammate formations, enemy count/class band, enemy identity, and Level;
- authored and effective enemy stats by Level, enemy identity coverage, and action-limit timeout rates;
- tagged ability event evidence, observed values, and per-stratum party results;
- a warning when any category or mechanic was not observed.

## Current limitations

The three policies sample only a small part of possible player decisions. None models full target-selection judgment, encounter-specific plans, or optimal play. The effect-aware policy uses a shared tag-driven heuristic, not a learned player model. Equal policy weights are a transparent benchmark convention, not a claim about player behavior; keep individual scores and policy spread visible. Add policies only when they are generic, versioned, and applied equally to every candidate, then rerun the full candidate set if the ensemble changes.

The scenario bootstrap is a practical uncertainty estimate for the sampled design, not a guarantee about every possible composition. Use human playtesting and engine parity checks before making consequential balance changes.
