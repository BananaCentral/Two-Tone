# Character Performance Benchmark Report

- Benchmark version: 3
- Sample status: all design strata represented
- Generated: 2026-11-18T23:33:21.093Z
- Scenarios sampled: 2700
- Matched candidate/wearer comparisons: 2700
- Seeds per matchup: 10; first seed: 1
- Automated policy: `skill-reserve-auto-v1`
- Scenario selection: stratified across party size, enemy count and enemy class mix, encounter length, and difficulty where the sample limit permits.

## Character benchmark scores

Score is the average battle outcome for the authored character kit in this sampled benchmark: win = 100, draw = 50, loss = 0. Sampled outcomes are averaged within enemy-class bands, then the represented bands receive equal weight. The control removes that character's passive, skill, and ultimate while preserving the authored stats and Basic Attack. This is a contextual team-benchmark score, not an intrinsic or policy-independent character rating. Paired difference compares the full kit with that control.

Scenario intervals resample sampled scenario compositions within enemy-class bands; seed intervals summarize randomness across the shared seed set. They answer different uncertainty questions and are reported separately. Scenario intervals are percentile bootstrap estimates and may remain wide when the sample is small.

| Character | Score / 100 | Scenario 95% interval | Difference vs same-stat control | Paired scenario interval | Sampled scenario cells | Design cells covered |
|---|---:|---:|---:|---:|---:|---:|
| dawn | 17.0 | 14.5–20.0 | -1.1 | -2.4 to +0.1 | 540 | 540/540 |
| lily | 17.5 | 14.8–20.1 | -0.6 | -1.6 to +0.4 | 540 | 540/540 |
| logan | 18.6 | 15.8–21.6 | +4.5 | +3.2 to +6.1 | 540 | 540/540 |
| soul | 22.3 | 19.6–24.9 | +8.3 | +6.5 to +10.4 | 540 | 540/540 |
| zero | 19.5 | 16.9–22.2 | +0.1 | -0.7 to +1.1 | 540 | 540/540 |

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

Enemy class mixes observed are listed in [benchmark coverage CSV](character-policy-reserve-2026-11-18-benchmark-coverage.csv). Full per-comparison and event evidence remain in the JSONL and stratified CSV outputs.

## Mechanic event evidence

| Mechanic tag | Comparisons with a captured event |
|---|---:|
| No component comparisons were included | |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-policy-reserve-2026-11-18-benchmark-mechanics.csv).

## Interpretation and limitations

This run uses one generic scripted policy profile. Compare it with the other profile before treating scores as robust to action strategy. Neither policy represents every player. A missing category is a coverage failure, not evidence that the character has no value there. Read activation and event evidence alongside outcome changes; component effects overlap and their scores are not additive.
