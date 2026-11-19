# Character Performance Benchmark Report

- Benchmark version: 4
- Sample status: all design strata represented
- Generated: 2026-11-19T06:31:51.295Z
- Scenario-policy cells: 675
- Matched candidate/wearer comparisons: 675
- Seeds per matchup: 10; first seed: 1
- Policies: `scripted-auto-v1`, `skill-reserve-auto-v1`, `effect-aware-auto-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and enemy Levels 1–3.

## Character benchmark scores

The headline ensemble score is the equal-weight mean of the three named policy win rates; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. The score averages outcomes within enemy-class bands, then gives represented bands equal weight. The control removes the character's passive, Skill, and Ultimate while preserving its authored stats and Basic Attack. This is a contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because the policies are reproducible probes, not estimates of player frequency.

Enemies use the character Level curve: each authored Level 1 stat (HP, Attack, both defenses, and Speed) is multiplied by Level and rounded to the nearest 0.25. Enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

| Character | Ensemble / 100 | Scenario 95% interval | Policy range | Difference vs same-stat control | Sampled compositions | Design strata covered |
|---|---:|---:|---:|---:|---:|---:|
| dawn | 19.6 | 10.5–30.2 | 16.0–22.9 | +0.8 | 45 | 45/45 |
| lily | 18.5 | 9.8–27.6 | 16.0–20.7 | -0.1 | 45 | 45/45 |
| logan | 19.2 | 10.2–28.1 | 16.0–21.8 | +2.6 | 45 | 45/45 |
| soul | 20.3 | 11.4–29.4 | 17.6–23.1 | +4.0 | 45 | 45/45 |
| zero | 20.7 | 11.7–30.3 | 17.8–23.1 | -1.3 | 45 | 45/45 |

## Per-policy scores

| Character | Policy | Score / 100 | Difference vs same-stat control |
|---|---|---:|---:|
| dawn | scripted-auto-v1 | 16.0 | -2.9 |
| lily | scripted-auto-v1 | 16.0 | +0.0 |
| logan | scripted-auto-v1 | 16.0 | +0.4 |
| soul | scripted-auto-v1 | 17.6 | +2.0 |
| zero | scripted-auto-v1 | 17.8 | -1.8 |
| dawn | skill-reserve-auto-v1 | 19.8 | +2.2 |
| lily | skill-reserve-auto-v1 | 18.9 | +0.7 |
| logan | skill-reserve-auto-v1 | 19.8 | +3.3 |
| soul | skill-reserve-auto-v1 | 20.2 | +4.7 |
| zero | skill-reserve-auto-v1 | 21.3 | -1.3 |
| dawn | effect-aware-auto-v1 | 22.9 | +3.1 |
| lily | effect-aware-auto-v1 | 20.7 | -1.1 |
| logan | effect-aware-auto-v1 | 21.8 | +4.0 |
| soul | effect-aware-auto-v1 | 23.1 | +5.3 |
| zero | effect-aware-auto-v1 | 23.1 | -0.7 |

## Scenario coverage

| Dimension | Categories covered | Missing categories |
|---|---:|---|
| partySize | 1/1 | Complete |
| enemyCount | 5/5 | Complete |
| enemyArchetype | 6/6 | Complete |
| enemyClassBand | 3/3 | Complete |
| enemyLevel | 3/3 | Complete |
| policy | 3/3 | Complete |
| benchmarkStratum | 45/45 | Complete |

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-level-scaled-ensemble-balanced-2026-11-19-benchmark-coverage.csv). Full per-comparison and event evidence remain in the JSONL and stratified CSV outputs.

## Mechanic event evidence

| Mechanic tag | Comparisons with a captured event |
|---|---:|
| No component comparisons were included | |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-level-scaled-ensemble-balanced-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

Equal policy weights define the benchmark ensemble; they do not claim that players use the policies equally often. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
