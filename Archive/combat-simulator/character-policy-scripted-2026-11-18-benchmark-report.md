# Character Performance Benchmark Report

- Benchmark version: 3
- Sample status: all design strata represented
- Generated: 2026-11-18T23:32:18.500Z
- Scenarios sampled: 2700
- Matched candidate/wearer comparisons: 2700
- Seeds per matchup: 10; first seed: 1
- Automated policy: `scripted-auto-v1`
- Scenario selection: stratified across party size, enemy count and enemy class mix, encounter length, and difficulty where the sample limit permits.

## Character benchmark scores

Score is the average battle outcome for the authored character kit in this sampled benchmark: win = 100, draw = 50, loss = 0. Sampled outcomes are averaged within enemy-class bands, then the represented bands receive equal weight. The control removes that character's passive, skill, and ultimate while preserving the authored stats and Basic Attack. This is a contextual team-benchmark score, not an intrinsic or policy-independent character rating. Paired difference compares the full kit with that control.

Scenario intervals resample sampled scenario compositions within enemy-class bands; seed intervals summarize randomness across the shared seed set. They answer different uncertainty questions and are reported separately. Scenario intervals are percentile bootstrap estimates and may remain wide when the sample is small.

| Character | Score / 100 | Scenario 95% interval | Difference vs same-stat control | Paired scenario interval | Sampled scenario cells | Design cells covered |
|---|---:|---:|---:|---:|---:|---:|
| dawn | 16.2 | 13.6–19.0 | -1.5 | -2.7 to -0.4 | 540 | 540/540 |
| lily | 17.2 | 14.5–19.8 | -0.4 | -1.3 to +0.3 | 540 | 540/540 |
| logan | 17.9 | 15.1–20.9 | +4.6 | +3.2 to +6.1 | 540 | 540/540 |
| soul | 21.2 | 18.5–23.8 | +7.3 | +5.6 to +9.1 | 540 | 540/540 |
| zero | 18.6 | 16.1–21.3 | -0.5 | -1.4 to +0.6 | 540 | 540/540 |

## Scenario coverage

| Dimension | Categories covered | Missing categories |
|---|---:|---|
| partySize | 4/4 | Complete |
| enemyCount | 5/5 | Complete |
| enemyClassBand | 3/3 | Complete |
| enemyClassMix | 44/55 | 11 categories absent; see coverage CSV |
| length | 3/3 | Complete |
| difficulty | 3/3 | Complete |
| policy | 1/1 | Complete |
| benchmarkStratum | 540/540 | Complete |

Enemy class mixes observed are listed in [benchmark coverage CSV](character-policy-scripted-2026-11-18-benchmark-coverage.csv). Full per-comparison and event evidence remain in the JSONL and stratified CSV outputs.

## Mechanic event evidence

| Mechanic tag | Comparisons with a captured event |
|---|---:|
| No component comparisons were included | |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-policy-scripted-2026-11-18-benchmark-mechanics.csv).

## Interpretation and limitations

This run uses one generic scripted policy profile. Compare it with the other profile before treating scores as robust to action strategy. Neither policy represents every player. A missing category is a coverage failure, not evidence that the character has no value there. Read activation and event evidence alongside outcome changes; component effects overlap and their scores are not additive.
