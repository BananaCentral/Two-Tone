# Character Performance Benchmark Report

- Benchmark version: 5
- Sample status: all design strata represented
- Generated: 2026-11-19T06:59:50.027Z
- Scenario-policy cells: 675
- Character scenario runs: 675
- Seeds per matchup: 10; first seed: 1
- Policies: `scripted-auto-v1`, `skill-reserve-auto-v1`, `effect-aware-auto-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and enemy Levels 1–3.

## Character benchmark scores

The headline ensemble score is the equal-weight mean of the three named policy win rates using each character's actual authored kit; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. The score averages outcomes within enemy-class bands, then gives represented bands equal weight. It is a contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because the policies are reproducible probes, not estimates of player frequency. Ability event evidence records which tagged mechanics activated and their observed values; it is diagnostic and does not subtract a disabled-kit control.

Enemies use the character Level curve: each authored Level 1 stat (HP, Attack, both defenses, and Speed) is multiplied by Level and rounded to the nearest 0.25. Enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

| Character | Ensemble win rate / 100 | Scenario 95% interval | Policy range | Sampled scenario cells | Design strata covered |
|---|---:|---:|---:|---:|---:|
| dawn | 19.6 | 10.5–30.2 | 16.0–22.9 | 45 | 45/45 |
| lily | 18.5 | 9.8–27.6 | 16.0–20.7 | 45 | 45/45 |
| logan | 19.2 | 10.2–28.1 | 16.0–21.8 | 45 | 45/45 |
| soul | 20.3 | 11.4–29.4 | 17.6–23.1 | 45 | 45/45 |
| zero | 20.7 | 11.7–30.3 | 17.8–23.1 | 45 | 45/45 |

## Per-policy scores

| Character | Policy | Win rate / 100 |
|---|---|---:|
| dawn | scripted-auto-v1 | 16.0 |
| lily | scripted-auto-v1 | 16.0 |
| logan | scripted-auto-v1 | 16.0 |
| soul | scripted-auto-v1 | 17.6 |
| zero | scripted-auto-v1 | 17.8 |
| dawn | skill-reserve-auto-v1 | 19.8 |
| lily | skill-reserve-auto-v1 | 18.9 |
| logan | skill-reserve-auto-v1 | 19.8 |
| soul | skill-reserve-auto-v1 | 20.2 |
| zero | skill-reserve-auto-v1 | 21.3 |
| dawn | effect-aware-auto-v1 | 22.9 |
| lily | effect-aware-auto-v1 | 20.7 |
| logan | effect-aware-auto-v1 | 21.8 |
| soul | effect-aware-auto-v1 | 23.1 |
| zero | effect-aware-auto-v1 | 23.1 |

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

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-actual-kit-balanced-2026-11-19-benchmark-coverage.csv). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](character-performance-actual-kit-balanced-2026-11-19-character-winrate.svg).

## Mechanic event evidence

| Mechanic tag | Scenario-policy samples with an event |
|---|---:|
| buff.critical | 135/135 |
| buff.damage | 114/270 |
| buff.next_basic | 114/270 |
| damage.conditional_multiplier | 61/135 |
| damage.critical | 135/135 |
| damage.direct | 297/675 |
| damage.follow_up | 65/135 |
| damage.magical | 120/270 |
| damage.over_time | 41/135 |
| damage.physical | 105/270 |
| damage.true | 145/270 |
| debuff.defense | 78/135 |
| debuff.mark | 78/135 |
| defense.shield | 80/135 |
| limit.charges | 65/135 |
| limit.duration | 200/405 |
| limit.stacks | 42/135 |
| recovery.lifesteal | 71/135 |
| resource.capacity | 135/135 |
| resource.energy | 359/675 |
| resource.hp_cost | 80/135 |
| resource.skill_point | 431/675 |
| status.bleed | 41/135 |
| status.exposed | 78/135 |
| status.ricochet | 73/135 |
| status.tune | 42/135 |
| summon.action | 3/135 |
| summon.create | 3/135 |
| tempo.action_advance | 8/270 |
| tempo.taunt | 80/135 |
| trigger.first_hit_per_target | 61/135 |
| trigger.per_hit | 42/135 |
| trigger.per_source | 138/270 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-actual-kit-balanced-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

Equal policy weights define the benchmark ensemble; they do not claim that players use the policies equally often. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
