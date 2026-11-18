# Character Performance Benchmark Standard

## Purpose

This standard defines what the combat performance runner measures and what its results mean. It is intended to make character comparisons repeatable, expose gaps in the sample, and prevent a single automated policy from being mistaken for a universal character rating.

The benchmark uses the combat definitions and `TwoToneBattleEngine` shared with live battles. A result is valid only for mechanics that the shared engine resolves and the simulator records. A passing simulation is not a substitute for game-versus-simulator event-trace parity.

## Benchmark population

The benchmark roster is discovered from `CHARACTER_COMBAT_DATA`, `ENEMY_COMBAT_DATA`, and `RUNE_COMBAT_RULES`. The evaluator must not maintain a second hand-written character or enemy roster. Adding a combat definition should make the combatant available to scenario generation; unsupported mechanics must produce an explicit coverage or implementation failure.

Each benchmark scenario records:

- number of allies and enemies;
- enemy class mix, using authored enemy tags;
- encounter length: short, medium, or long;
- difficulty: easy, medium, or hard;
- the automated action policy identifier;
- candidate, wearer, and teammate composition when the scenario is used for a paired comparison.

The sampled suite aims to allocate scenarios evenly across the available party sizes, enemy counts, enemy class mixes, encounter lengths, and difficulty levels. The report lists categories that were absent from the sample. A missing category is a coverage gap; it is never treated as zero performance.

Candidate characters are tested in candidate-anchored panels: every tested character receives the same number of scenario cells, sampled across the same team-size, enemy-count/class, length, and difficulty strata. The focal character is included in its own party, and the other slots rotate through available teammates. The report lists the design cells covered by each character so a low sample cannot be hidden by global coverage. Teammates are part of the test population because characters act in a team combat system. A character score therefore describes performance in this benchmark population; it does not claim to measure an isolated character independent of allies.

## Policy contract

Every result names its automated policy. Policy is part of the benchmark definition because different legal decisions can change the value of an ability. Candidate names must not appear in a policy's decision rules.

The current runner uses one scripted policy, `scripted-auto-v1`. It is an initial, reproducible reference policy. Until an additional generic policy is implemented and results are compared under both, the benchmark report must state that policy robustness is not evaluated. Do not describe these scores as universal or player-optimal.

Policy changes require a new policy identifier and a new benchmark report. This makes a result reproducible and prevents comparing scores that used different action rules as if they came from the same test.

## Outcome score

Each battle receives an outcome score:

- ally victory: 100;
- draw: 50;
- enemy victory: 0.

The benchmark score averages sampled encounter outcomes within each enemy-class band (`common_only`, `elite_present`, and `boss_present`), then gives each represented band equal weight. Scenario selection balances party size, enemy count, exact enemy class mix, length, and difficulty; the report exposes any missing design cells. The score is a 0–100 summary of success under the named scenario and policy mix. It is not a character's intrinsic power, and a score of 0 does not mean a character contributed nothing.

For full-kit character comparisons, the paired control keeps the character's authored stats and Basic Attack but removes its passive, Skill, and Ultimate. The report shows both full-kit score and the paired difference from this same-stat control. This isolates the contribution of those kit mechanics; it does not claim that the control is a real playable character.

## Mechanic contribution

The runner compares a mechanic and its control under matched scenarios and random seeds. It records the observed battle-outcome difference and event evidence, including opportunities, activations, applications, and resolved values where the engine exposes them.

Interpret the metrics together:

- **Outcome change** says whether the paired change affected wins, draws, or losses in this benchmark.
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

Quick, balanced, and full are named reproducible sample sizes, not confidence guarantees. A narrow seed interval alone is not a stopping rule. Increase scenario coverage when the scenario interval remains wide, when important categories are missing, or when a result changes substantially by stratum. Increase seed repetitions when seed uncertainty remains wide.

The full combinatorial scenario matrix is for offline enumeration. Standard balance work should use a documented stratified sample and report its coverage rather than waiting for every possible lineup. Reuse paired control results when their configuration is identical. Preserve a seed, benchmark version, policy identifier, scenario selection, and combat-definition revision with every report.

## Required report fields

Every benchmark report includes:

- benchmark version, generation time, seed range, scenario count, and comparison count;
- policy identifier and a statement of policy coverage;
- per-character 0–100 score, same-stat control score, and paired difference;
- separate seed and scenario uncertainty intervals;
- coverage counts and missing categories for party size, enemy count, enemy class mix, length, and difficulty;
- event evidence and per-stratum results for mechanic comparisons;
- a warning when any category or mechanic was not observed.

## Current limitations

`scripted-auto-v1` is one fixed action policy. Its results do not measure every reasonable way to play a character. The evaluator reports this limitation rather than compensating with guessed values for support abilities. A later policy ensemble must be generic, versioned, and applied equally to every candidate.

The scenario bootstrap is a practical uncertainty estimate for the sampled design, not a guarantee about every possible composition. Use human playtesting and engine parity checks before making consequential balance changes.
