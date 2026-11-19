# Character Performance Benchmark Standard

## Purpose

This standard defines what the combat performance runner measures and what its results mean. It is intended to make character comparisons repeatable, expose gaps in the sample, and prevent a single automated policy from being mistaken for a universal character rating.

The benchmark uses the combat definitions and `TwoToneBattleEngine` shared with live battles. A result is valid only for mechanics that the shared engine resolves and the simulator records. A passing simulation is not a substitute for game-versus-simulator event-trace parity.

## Benchmark population

The benchmark roster is discovered from `CHARACTER_COMBAT_DATA`, `ENEMY_COMBAT_DATA`, and `RUNE_COMBAT_RULES`. The evaluator must not maintain a second hand-written character or enemy roster. Adding a combat definition should make the combatant available to scenario generation; unsupported mechanics must produce an explicit coverage or implementation failure.

Every character performance scenario uses exactly four living ally slots at battle start. Each focal character appears in every scenario; the other three slots rotate across legal teammate formations. Each scenario records:

- number of allies and enemies;
- enemy class mix, using authored enemy tags;
- difficulty (Easy, Normal, or Hard) and the resulting enemy stat multiplier;
- exact enemy identities, class mix, and formation;
- the automated action policy identifier;
- candidate, character, and teammate composition.

The sampled suite allocates cells across enemy count, enemy class band, and difficulty. Enemy lineups are selected to expose the individual archetypes as well as mixed groups. Teammate formations rotate within those strata. The report lists categories that were absent from the sample. A missing category is a coverage gap; it is never treated as zero performance. Party size is fixed at four and is not a rating dimension. Encounter duration is observed from actions and turns; difficulty does not impose an encounter-length multiplier.

Candidate characters are tested in candidate-anchored panels: every tested character receives the same number of cells across the same four-person team, enemy-count/class, and difficulty strata. The focal character is included in its own party, and the other slots rotate through available teammates. The report lists design cells covered by each character so a low sample cannot be hidden by global coverage. Teammates are part of the test population because characters act in a team combat system. A character score therefore describes performance in this benchmark population; it does not claim to measure an isolated character independent of allies.

## Enemy Level scaling

The game uses integer enemy Levels 1–50, applying `roundToNearest0.25(authoredLevelOneStat × level)` to HP, Attack, Physical Defense, Magical Defense, and Speed. The benchmark uses three difficulty choices over the same Level 1 base stats: Easy 0.75×, Normal 1×, and Hard 1.5×. These factors apply uniformly to all five stats; difficulty does not separately scale encounter length, HP, Attack, or Defense. Enemy mechanics do not change. Each result records authored and effective stats. The final rating weights Easy/Normal/Hard as 25%/50%/25%. See the [Enemy Level Standard](enemy-level-standard.md).

## Policy contract

Every result names its automated policy. Policy is part of the benchmark definition because different legal decisions can change the value of an ability. Candidate names must not appear in a policy's decision rules.

The runner provides three generic, probability-based policies. When the acting ally has at least one Skill Point and a usable Skill, it rolls once to choose between Basic and Skill:

| Policy | Basic probability | Skill probability | Final rating weight |
|---|---:|---:|---:|
| `basic-focused-v1` | 75% | 25% | 25% |
| `skill-focused-v1` | 25% | 75% | 25% |
| `mixed-v1` | 50% | 50% | 50% |

When a Skill is unavailable because of its resource cost, the ally uses a Basic Attack. The probability is redrawn for each scheduled ally action; a policy preference does not force one action every time.

Ultimates are checked independently of the scheduled actor because they can be activated between that actor's normal actions. At the start of every scheduled combat turn, each living ally with a ready Ultimate gets a 75% chance to use it. On a failed roll, it remains ready and is checked again at the next scheduled combat turn. Casting an Ultimate does not consume the scheduled actor's Basic/Skill action. A requested diagnostic Ultimate override is deterministic and bypasses the probability roll. The simulator uses a separate seeded random stream for policy decisions so policy rolls do not shift battle hit/damage rolls.

These policies are reproducible probes, not optimal-play or human-play models. The default benchmark runs all three on matched scenarios and seeds, then weights their results as shown above. Individual policy scores and their range remain visible for diagnosis.

Policy changes require a new policy identifier and a new benchmark report. This makes a result reproducible and prevents comparing scores that used different action rules as if they came from the same test.

## Outcome score

Each completed battle receives an outcome score:

- ally victory: 100;
- enemy victory: 0.

Combat has no draws. Reaching the simulator's action limit is reported as an incomplete timeout; the benchmark counts it as a non-win in the headline win rate and reports timeout rates separately. Within each enemy-class band (`common_only`, `elite_present`, and `boss_present`), Easy, Normal, and Hard results receive weights of 25%, 50%, and 25%, respectively. Within each sampled scenario, the Basic-focused, Skill-focused, and Mixed policy results receive weights of 25%, 25%, and 50%. Represented enemy-class bands are then given equal weight. Thus the headline is the weighted mean of actual-kit party win rates across difficulty and policy, with equal class-band representation. Scenario selection balances four-person teammate formations and enemy count/class band; the report exposes missing design cells and enemy archetype coverage. The score is a 0–100 summary of success under this benchmark mix. It is not a character's intrinsic power, and a score of 0 does not mean a character contributed nothing.

Character outcome ratings use each character's actual authored kit in every battle. The gauge does not create a disabled-abilities version or calculate a full-kit-versus-control difference. Instead, battle events report which tagged abilities activated and the values the shared engine recorded. Individual passive, action, or effect studies may still use a narrowly scoped control to answer a specific component question; those results are separate from whole-character win rates.

## Mechanic contribution

The runner compares a mechanic and its control under matched scenarios and random seeds. It records the observed battle-outcome difference and event evidence, including opportunities, activations, applications, and resolved values where the engine exposes them.

Interpret the metrics together:

- **Outcome change** says whether the paired change affected wins, losses, or action-limit timeouts in this benchmark.
- **Opportunity and activation counts** show whether the mechanic was actually tested and how often it ran.
- **Resolved event values** show what the mechanic changed, such as damage, healing, Shield, energy, Skill Points, or action timing.
- **Scenario coverage** shows where the observation came from.

Event values explain the result; they are not arbitrary point weights. Mechanic contribution scores are not additive because effects can overlap, enable one another, or change later decisions. An unobserved mechanic is reported as unobserved, not as ineffective.

### Rune passive comparisons

The standardized Rune test compares a character with no Runes equipped against the same character with only one eligible four-piece Rune passive enabled. Rune main stats and substats are disabled in both branches. Both branches use the same four-person party scenarios, enemies, policies, difficulties, and matched seeds. Rune summaries report each eligible wearer separately, then average eligible wearers equally; an ineligible pairing is N/A, not zero. The detailed comparison method and current Rune results are in the [Action Value Standard](action-value-standard.md) and [Rune balance report](rune-balance-current/README.md).

The Outcome Rating remains a weighted win-rate result (100 per win, 0 per loss or timeout). Damage, BAE, HP swing, resources, Shields, and turns are diagnostics only; they explain whether the passive fired and what changed in combat, but they do not add to the score. These policy probes are not optimal-play models. If a resource or action-tempo passive changes later decisions, branches can diverge even with a matched seed. A small negative estimate is therefore not proof that a beneficial Rune has negative intrinsic value; inspect event evidence, per-wearer results, and uncertainty.

## Pairing and uncertainty

Treatment and control use the same scenario and seed. This paired comparison reduces noise when the shared random inputs affect both branches similarly. The paired analysis is used directly; sharing random numbers is not assumed to reduce variance in every case.

Character benchmark reports show two separate 95% intervals:

1. **Seed interval:** variation across the repeated, matched seeds in the sampled scenarios.
2. **Scenario interval:** stratified bootstrap variation from resampling scenario compositions within enemy-class bands.

The intervals answer different questions. Rune wearer reports currently include seed intervals but not scenario-bootstrap intervals; they disclose that limitation. Neither interval repairs missing scenario coverage or an inaccurate combat model. Reports must show sample counts and disclose missing benchmark categories.

## Efficiency and sample size

Quick, balanced, and full are named reproducible sample sizes, not confidence guarantees. The current design contains 45 scenario strata per character panel: five enemy counts × three enemy-class bands × three difficulty choices. Quick samples 23 strata with 5 matched seeds. Balanced covers all 45 strata once with 10 matched seeds under each of the three policies. Full samples each stratum twice (90 compositions) with 20 matched seeds under each policy. Enemy identity and composition rotate within count/class/difficulty strata. The rating weights apply after sampling; they do not change how many samples are collected for each difficulty or policy. A narrow seed interval alone is not a stopping rule. Increase scenario coverage when the scenario interval remains wide, when enemy identities are missing, or when a result changes substantially by stratum. Increase seed repetitions when seed uncertainty remains wide.

The full combinatorial scenario matrix is for offline enumeration. Standard balance work should use a documented stratified sample and report its coverage rather than waiting for every possible lineup. Reuse paired control results when their configuration is identical. Preserve a seed, benchmark version, policy identifier, scenario selection, and combat-definition revision with every report.

## Required report fields

Every benchmark report includes:

- benchmark version, generation time, seed range, scenario-policy count, and character simulation count;
- policy identifier and a statement of policy coverage;
- per-character 0–100 party win rate using the character's actual kit;
- separate seed and scenario uncertainty intervals;
- coverage counts and missing categories for four-person teammate formations, enemy count/class band, enemy identity, and difficulty;
- authored and effective enemy stats by Level, enemy identity coverage, and action-limit timeout rates;
- tagged ability event evidence, observed values, and per-stratum party results;
- a warning when any category or mechanic was not observed.

## Current limitations

The three policies sample only a small part of possible player decisions. None models full target-selection judgment, encounter-specific plans, or optimal play. The Basic/Skill probabilities and the 25/25/50 and 25/50/25 rating weights are benchmark conventions, not claims about player behavior. Keep individual policy scores and policy spread visible. Add policies only when they are generic, versioned, and applied equally to every candidate, then rerun the full candidate set if the ensemble changes.

The scenario bootstrap is a practical uncertainty estimate for the sampled design, not a guarantee about every possible composition. Use human playtesting and engine parity checks before making consequential balance changes.
