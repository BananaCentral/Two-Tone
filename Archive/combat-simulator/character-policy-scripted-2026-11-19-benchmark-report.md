# Character Performance Benchmark Report

- Benchmark version: 3
- Sample status: all design strata represented
- Generated: 2026-11-19T00:17:06.416Z
- Scenarios sampled: 675
- Matched candidate/wearer comparisons: 675
- Seeds per matchup: 10; first seed: 1
- Automated policy: `scripted-auto-v1`
- Scenario selection: four-person parties stratified across enemy count and enemy class mix, encounter length, and difficulty where the sample limit permits.

## Character benchmark scores

Score is the four-person party win rate for the authored character kit in this sampled benchmark; wins score 100 and losses score 0. Combat has no draws. A battle reaching the simulator action limit is marked incomplete, counted as a non-win, and its timeout rate is reported separately. Sampled outcomes are averaged within enemy-class bands, then the represented bands receive equal weight. The control removes that character's passive, Skill, and Ultimate while preserving its authored stats and Basic Attack. This is a contextual team-benchmark score, not an intrinsic or policy-independent character rating. Paired difference compares the full kit with that control.

The scenario's enemy HP, Attack, and Defense multipliers are stored with each row. They are benchmark length/difficulty transforms of the authored enemy stats; they do not change the enemy definitions. Scenario intervals resample sampled teammate/enemy compositions within enemy-class bands; seed intervals summarize randomness across the shared seed set. They answer different uncertainty questions and are reported separately. Scenario intervals are percentile bootstrap estimates and may remain wide when the sample is small.

| Character | Score / 100 | Scenario 95% interval | Difference vs same-stat control | Paired scenario interval | Sampled scenario cells | Design cells covered |
|---|---:|---:|---:|---:|---:|---:|
| dawn | 35.3 | 29.6–41.3 | -1.3 | -3.9 to +0.9 | 135 | 135/135 |
| lily | 34.5 | 28.9–40.4 | -2.0 | -4.4 to +0.1 | 135 | 135/135 |
| logan | 36.1 | 30.0–41.3 | +9.0 | +5.0 to +13.4 | 135 | 135/135 |
| soul | 34.5 | 28.8–40.8 | +5.6 | +2.3 to +9.3 | 135 | 135/135 |
| zero | 33.0 | 26.9–39.3 | -2.1 | -4.8 to +0.3 | 135 | 135/135 |

## Scenario coverage

| Dimension | Categories covered | Missing categories |
|---|---:|---|
| partySize | 1/1 | Complete |
| enemyCount | 5/5 | Complete |
| enemyClassBand | 3/3 | Complete |
| enemyClassMix | 33/55 | 22 categories absent; see coverage CSV |
| length | 3/3 | Complete |
| difficulty | 3/3 | Complete |
| policy | 1/1 | Complete |
| benchmarkStratum | 135/135 | Complete |

Enemy class mixes observed are listed in [benchmark coverage CSV](character-policy-scripted-2026-11-19-benchmark-coverage.csv). Full per-comparison and event evidence remain in the JSONL and stratified CSV outputs.

## Mechanic event evidence

| Mechanic tag | Comparisons with a captured event |
|---|---:|
| No component comparisons were included | |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-policy-scripted-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

This run uses one generic policy profile. Compare it with the other two profiles before treating scores as robust to action strategy. None represents every player. A missing category is a coverage failure, not evidence that the character has no value there. Read activation and event evidence alongside outcome changes; component effects overlap and their scores are not additive.
