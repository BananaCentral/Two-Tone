# Character Performance Benchmark Report

- Benchmark version: 2
- Sample status: exploratory: design strata are missing
- Generated: 2026-11-18T22:48:32.596Z
- Scenarios sampled: 270
- Matched candidate/wearer comparisons: 1674
- Seeds per matchup: 3; first seed: 20261118
- Automated policy: `scripted-auto-v1` (single policy; policy robustness is not evaluated)
- Scenario selection: balanced across party size, enemy count and enemy class mix, encounter length, and difficulty where the sample limit permits.

## Character benchmark scores

Score is the average battle outcome for the authored character kit in this sampled benchmark: win = 100, draw = 50, loss = 0. Sampled outcomes are averaged within enemy-class bands, then the represented bands receive equal weight. The control removes that character's passive, skill, and ultimate while preserving the authored stats and Basic Attack. This is a contextual team-benchmark score, not an intrinsic or policy-independent character rating. Paired difference compares the full kit with that control.

Scenario intervals resample sampled scenario compositions within enemy-class bands; seed intervals summarize randomness across the shared seed set. They answer different uncertainty questions and are reported separately. Scenario intervals are percentile bootstrap estimates and may remain wide when the sample is small.

| Character | Score / 100 | Scenario 95% interval | Difference vs same-stat control | Paired scenario interval | Sampled scenario cells | Design cells covered |
|---|---:|---:|---:|---:|---:|---:|
| dawn | 19.1 | 10.5–27.8 | +0.0 | -1.9 to +1.9 | 54 | 54/540 |
| lily | 18.5 | 9.9–27.2 | +0.6 | +0.0 to +1.9 | 54 | 54/540 |
| logan | 17.9 | 9.9–25.9 | +4.3 | +0.6 to +9.3 | 54 | 54/540 |
| soul | 22.8 | 13.6–32.1 | +13.0 | +6.2 to +21.0 | 54 | 54/540 |
| zero | 17.9 | 9.3–26.5 | -1.2 | -3.1 to +0.0 | 54 | 54/540 |

## Scenario coverage

| Dimension | Categories covered | Missing categories |
|---|---:|---|
| partySize | 4/4 | Complete |
| enemyCount | 5/5 | Complete |
| enemyClassBand | 3/3 | Complete |
| enemyClassMix | 25/55 | 30 categories absent; see coverage CSV |
| length | 3/3 | Complete |
| difficulty | 3/3 | Complete |
| policy | 1/1 | Complete |
| benchmarkStratum | 54/540 | 486 categories absent; see coverage CSV |

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-benchmark-pilot-2026-11-18-benchmark-coverage.csv). Full per-comparison and event evidence remain in the JSONL and stratified CSV outputs.

## Mechanic event evidence

| Mechanic tag | Comparisons with a captured event |
|---|---:|
| buff.critical | 54/54 |
| buff.damage | 97/162 |
| buff.next_basic | 97/162 |
| damage.conditional_multiplier | 32/54 |
| damage.critical | 54/54 |
| damage.direct | 397/594 |
| damage.follow_up | 24/108 |
| damage.magical | 141/216 |
| damage.over_time | 82/108 |
| damage.physical | 178/270 |
| damage.true | 139/216 |
| debuff.defense | 37/54 |
| debuff.mark | 74/108 |
| defense.shield | 80/108 |
| limit.charges | 24/54 |
| limit.duration | 172/270 |
| limit.stacks | 82/108 |
| recovery.lifesteal | 29/54 |
| resource.capacity | 54/54 |
| resource.energy | 565/864 |
| resource.hp_cost | 40/54 |
| resource.skill_point | 499/756 |
| status.bleed | 82/108 |
| status.exposed | 37/54 |
| status.ricochet | 37/54 |
| status.tune | 58/108 |
| summon.action | 36/54 |
| summon.create | 36/54 |
| tempo.action_advance | 92/162 |
| tempo.taunt | 80/108 |
| trigger.first_hit_per_target | 32/54 |
| trigger.per_hit | 82/108 |
| trigger.per_source | 61/108 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-benchmark-pilot-2026-11-18-benchmark-mechanics.csv).

## Interpretation and limitations

This run uses the existing scripted action policy, not a panel of player policies. Do not treat these scores as general character rankings until a second generic policy profile is implemented and the result is checked under both. A missing category is a coverage failure, not evidence that the character has no value there. Read activation and event evidence alongside outcome changes; component effects overlap and their scores are not additive.
