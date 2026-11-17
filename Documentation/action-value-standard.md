# Action Value Standard

## Purpose

Use a shared stat budget to define comparable combat tests, HP impact to explain an action's effect, and win probability to measure whether it improves the chance of victory. Do not combine stat points, HP, and win rate into one arbitrary sum.

## Normalized stat budget

The reference stat line is worth 100 normalized Stat Value Points (SVP) in each stat:

| Stat | SVP conversion | Reference value |
| --- | ---: | ---: |
| HP | HP × 1 | 100 HP = 100 SVP |
| Attack | Attack × 5 | 20 Attack = 100 SVP |
| Physical Defense | Defense × 25 | 4 Defense = 100 SVP |
| Magical Defense | Defense × 25 | 4 Defense = 100 SVP |
| Speed | Speed × 5 | 20 Speed = 100 SVP |

For a unit, calculate:

`Stat Budget (SVP) = HP + 5 × Attack + 25 × Physical Defense + 25 × Magical Defense + 5 × Speed`

If an archetype has separate Physical Attack and Magical Attack values instead of generic Attack, use their sum for the Attack term. Do not count a derived generic Attack again.

The reference character line (100 HP, 20 Attack, 4/4 Defense, 20 Speed) is 500 SVP. The current character lines and Common enemy lines also total 500 SVP; the listed Elite enemies total 1,000 SVP and the Bear boss totals 1,500 SVP. These budgets standardize test inputs. Equal SVP is not a claim that every stat has equal combat impact in every encounter.

For calibration, a 100-SVP stat control changes only one stat: +100 HP, +20 Attack, +4 Physical Defense, +4 Magical Defense, or +20 Speed. Compare each control in the same encounter matrix to see whether the assumed stat exchange rates match observed combat outcomes.

## HP impact reference

Use one reference action to express combat impact in HP terms: a non-critical, single-target, 1.0× hit from 20 Attack against 4 matching Defense. Under the current damage formula, it deals 16 HP.

One **Baseline Action Equivalent (BAE)** is 16 HP of favorable HP swing. For a treatment and its counterfactual baseline, calculate:

`HP swing = (enemy HP removed by treatment − enemy HP removed by baseline) + (ally HP retained with treatment − ally HP retained with baseline)`

`HP swing in BAE = HP swing ÷ 16`

This is a diagnostic alongside action value. Include all damage sources attributed by the simulator (direct, DoT, Follow-up, Ricochet, summon, Echo, and Reflect). Actual ally HP retained captures HP damage prevented by Shields, healing, and shortened fights; also report Shield absorption separately to show how it happened. Do not count unused Shield capacity as damage prevented.

Recalculate the 16-HP reference if the game's damage formula or the reference stats change. BAE is an explanation scale; it does not replace the win-rate measure.

## Action Value

Action Value (AV) is the change in win probability caused by choosing an action instead of its standard alternative from the same combat state:

`AV(action | state) = P(win | take action) − P(win | same unit uses Basic Attack)`

Report AV in **percentage points**. For example, if the counterfactual Basic Attack yields a 45% win chance and the Skill yields 52%, the Skill's AV is `+7 percentage points` in that state.

The two branches must start from the same state and use the same encounter, target-selection policy, remaining team policy, and paired random seeds. Both branches consume the actor's scheduled action. Resolve the candidate action's full consequences—including damage, effects, resource costs, triggered passives, action advances, and later turns—before comparing win rates. This makes the AV include downstream consequences rather than only the action's immediate damage.

For an effect that is not an action choice, use the matching counterfactual:

- **Rune or passive:** effect enabled versus disabled, with the same action policy.
- **Action advance or delay:** effect applied versus omitted.
- **Stat investment:** the 100-SVP stat control versus the unchanged unit.

Compare those branches from the same starting state and report their win-rate difference in percentage points. Do not compare a Rune's effect to a Basic Attack if the Rune does not replace an action.

AV depends on the state and matchup. Report the per-scenario result and the character/action breakdown. A pooled result must state its encounter weights. Until play-frequency data is available, weight the defined benchmark scenarios equally and keep Easy/Medium/Hard, Common/Elite/Boss, single/multiple-target, and Short/Medium/Long results visible separately.

A battle that reaches its action cap is a draw. Draws are reported separately and count as non-wins in the win-rate calculation; they are not scored as half a win.

AVs from different actions are not additive: an action can change which later actions are available, who survives, and whether the battle has already been won. Use a full-battle enabled/disabled comparison for the total value of a Rune or character kit rather than summing per-action AVs.

## Balanced Scenario Matrix

Give every eligible character, Rune, and weapon the same scenario coverage and comparison budget. A candidate is compared only in legal configurations where its wearer is present; an incompatible Rune/character pairing is marked **N/A**, never scored as zero.

### Roster coverage

- **Ally teams:** Use all ordered lineups of one to four distinct characters from the five-character roster. This gives 205 legal teams and gives each character equal representation at each party size.
- **Enemy lineups:** Use every ordered lineup of one to five enemies from the six archetypes. Repeats are allowed. This gives 9,330 lineups and includes all 461 underlying enemy compositions. It exhaustively balances each enemy's slot and each ordered adjacency/Blast arrangement.
- **Encounter length:** Test every lineup in Short, Medium, and Long profiles. The simulator freezes enemy HP multipliers before candidate changes: Short uses 0.65× base HP, Medium uses 3× for Common/Elite enemies and 5× for Bosses, and Long uses 8×. These are benchmark conventions rather than claims about live battle duration.
- **Difficulty:** Each profile also has Easy, Medium, and Hard pressure settings. Easy scales enemy HP, Attack, and both Defenses to 0.75×; Medium uses 1×; Hard uses 1.25×. Speed and passive rules stay fixed. Length HP and difficulty HP multipliers combine multiplicatively.

The complete position-aware matrix has 205 ally lineups × 9,330 enemy lineups × three lengths × three difficulties = **17,213,850 scenario cells**, before candidate variants and paired trials. This is intentionally a large offline analysis. A limited pass supports implementation checks and early exploration; it is not a substitute for complete coverage.

### Candidate coverage and weighting

- A character or character-bound item is tested in every legal ally team containing its wearer. Every character appears in the same number of teams. Weapons are compared on their intended wearer at matching level and potential; potential/duplicate progression is a separate comparison axis. Hold character level and all non-candidate equipment constant between each candidate and control.
- Test each Rune on every character whose kit can activate it. Report each compatible wearer separately, then give compatible wearers equal weight in a Rune summary. Do not let a Rune with fewer eligible wearers appear weaker because incompatible pairings were counted as zeros.
- Keep results visible by ally team size, enemy team size, enemy identity/category, difficulty, encounter length, and formation. Average paired trials within a formation, formations within the same unordered party/enemy composition, and then compositions equally within each reported stratum. Do not pool all individual battles into one average, since compositions with more distinct orderings would otherwise dominate. For Rune summaries, also average compatible wearers equally after computing each wearer's score.
- Use the same scenario list, action policy, target-selection policy, and paired seeds for every candidate/control pair. Keep item effects isolated for the balance comparison; test mixed Rune or weapon builds separately as player-build scenarios.

### Two-pass simulation

1. **Coverage pass:** exercise every composition/length cell and required formation rotation with the candidate and its control. Confirm that no eligible character or enemy is missing. Use focused trigger scenarios to verify mechanics whose activations are rare or unlikely in a particular encounter cell.
2. **Balance pass:** choose one matched-seed trial count before the comparison and use it for every candidate/control pair in a stratum. If the predeclared confidence target is not met, rerun that whole stratum with a larger shared trial count and fresh output files; do not leave candidates with different sample counts. Reuse baseline results only when the configuration and seed set are identical.

The coverage pass checks representation, not balance precision. The balance pass supplies win-rate estimates and confidence intervals. Preserve both results so a small average cannot hide a character-, enemy-, formation-, or duration-specific effect.

The executable runner is [`tools/combat-performance.mjs`](../tools/combat-performance.mjs). It pairs baseline and treatment battles on the same seed, writes scenario-level JSON Lines, and creates a summary CSV that equal-weights distinct party/enemy compositions after averaging formations. Its frozen difficulty and length profile definitions above are implemented in that runner. When `--limit-scenarios` is used, the runner allocates the sample evenly across party sizes (1–4), enemy counts (1–5), lengths, and difficulties, then cycles through the legal ally formations and enemy lineups for each stratum. This preserves the main matchup dimensions but does not replace exhaustive identity, composition, and formation coverage; report sampled and total cell counts together.

Use the runner presets to avoid rebuilding long command lines: `quick` (default) runs 180 sampled cells × 5 paired seeds; `balanced` runs 360 × 10; `deep` runs 1,000 × 20; `full` runs the complete 17,213,850-cell matrix × 100. Limited presets are screening passes; use the same preset for every candidate in a comparison. The runner caches the identical no-set Rune control once per wearer, matchup, and seed, and reuses it across that wearer's Rune candidates. Rune branches clone only mutable team data. This changes runtime and memory use, not the matched comparison or sampling weights. Output folders are created automatically, and compact per-cell summaries are the default; `--include-trials` writes individual seed records.

The runner isolates comparison branches as follows: Rune sets use the same four Rune stat rolls in both branches, with only the four-piece effect enabled in treatment; a weapon is compared with no weapon; a stat candidate adds exactly 100 SVP in one stat; a character kit is compared with a basic-only control that keeps that character's stats and Basic Attack; and an action candidate is forced on the wearer's first turn and compared with that same unit using Basic Attack. For characters with separate Physical and Magical Attack stats, the 20-point Attack investment is split proportionally across their existing Attack values, preserving a 100-SVP increase. Ultimate comparisons start both branches with enough Energy to cast it. These controls identify what the reported difference measures.

## Required diagnostics

For each comparison, report:

1. Character and enemy Stat Budgets, plus the encounter profile.
2. Win rate for both branches, the percentage-point difference, sample count, and 95% confidence intervals.
3. HP swing and BAE, with the full damage-source breakdown.
4. Ally and enemy actions, deaths, and survivors.
5. Relevant resource and support outcomes: Skill Points, Energy, Shields granted/absorbed, healing, action advances, and action delays.

Use matched seeds to reduce random noise. Keep scenario-level values visible; overall averages must not hide conditional strengths (for example, a Rune that primarily prevents failure against bosses).

## Interpretation

- **Stat Budget** describes the unit's authored stat allocation.
- **HP swing / BAE** explains the realized HP impact of a comparison.
- **AV** measures the comparison's effect on winning.

Use all three when evaluating balance. A high damage or BAE result can have little win-rate impact in an already easy fight; a small HP change can create a large win-rate gain near a survival or kill threshold. Neither total damage nor equal SVP alone proves that an action, Rune, or character is balanced.
