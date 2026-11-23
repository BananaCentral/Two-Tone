# Character Performance Benchmark Report

- Benchmark version: 5
- Sample status: all design strata represented
- Generated: 2026-11-19T07:32:38.377Z
- Scenario-policy cells: 1350
- Character scenario runs: 1350
- Seeds per matchup: 20; first seed: 1
- Policies: `scripted-auto-v1`, `skill-reserve-auto-v1`, `effect-aware-auto-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and enemy Levels 1–3.

## Character benchmark scores

The headline ensemble score is the equal-weight mean of the three named policy win rates using each character's actual authored kit; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. The score averages outcomes within enemy-class bands, then gives represented bands equal weight. It is a contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because the policies are reproducible probes, not estimates of player frequency. Ability event evidence records which tagged mechanics activated and their observed values; it is diagnostic and does not subtract a disabled-kit control.

Enemies use the character Level curve: each authored Level 1 stat (HP, Attack, both defenses, and Speed) is multiplied by Level and rounded to the nearest 0.25. Enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

| Character | Ensemble win rate / 100 | Scenario 95% interval | Policy range | Sampled scenario cells | Design strata covered |
|---|---:|---:|---:|---:|---:|
| dawn | 20.3 | 13.6–27.3 | 17.8–23.1 | 88 | 45/45 |
| lily | 19.8 | 13.8–27.5 | 17.8–22.0 | 88 | 45/45 |
| logan | 20.1 | 13.4–27.5 | 17.8–22.4 | 88 | 45/45 |
| soul | 22.5 | 15.5–29.6 | 20.4–24.1 | 88 | 45/45 |
| zero | 22.8 | 15.7–29.8 | 20.8–24.1 | 88 | 45/45 |

## Per-policy scores

| Character | Policy | Win rate / 100 |
|---|---|---:|
| dawn | scripted-auto-v1 | 17.8 |
| lily | scripted-auto-v1 | 17.8 |
| logan | scripted-auto-v1 | 17.8 |
| soul | scripted-auto-v1 | 20.4 |
| zero | scripted-auto-v1 | 20.8 |
| dawn | skill-reserve-auto-v1 | 19.9 |
| lily | skill-reserve-auto-v1 | 19.7 |
| logan | skill-reserve-auto-v1 | 20.1 |
| soul | skill-reserve-auto-v1 | 22.9 |
| zero | skill-reserve-auto-v1 | 23.6 |
| dawn | effect-aware-auto-v1 | 23.1 |
| lily | effect-aware-auto-v1 | 22.0 |
| logan | effect-aware-auto-v1 | 22.4 |
| soul | effect-aware-auto-v1 | 24.1 |
| zero | effect-aware-auto-v1 | 24.1 |

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

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-actual-kit-full-2026-11-19-benchmark-coverage.csv). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](character-performance-actual-kit-full-2026-11-19-character-winrate.svg).

## Mechanic event evidence

| Mechanic tag | Scenario-policy samples with an event |
|---|---:|
| buff.critical | 270/270 |
| buff.damage | 224/540 |
| buff.next_basic | 224/540 |
| damage.conditional_multiplier | 120/270 |
| damage.critical | 270/270 |
| damage.direct | 583/1350 |
| damage.follow_up | 123/270 |
| damage.magical | 233/540 |
| damage.over_time | 86/270 |
| damage.physical | 209/540 |
| damage.true | 286/540 |
| debuff.defense | 150/270 |
| debuff.mark | 150/270 |
| defense.shield | 164/270 |
| limit.charges | 123/270 |
| limit.duration | 398/810 |
| limit.stacks | 86/270 |
| recovery.lifesteal | 133/270 |
| resource.capacity | 270/270 |
| resource.energy | 706/1350 |
| resource.hp_cost | 164/270 |
| resource.skill_point | 853/1350 |
| status.bleed | 86/270 |
| status.exposed | 150/270 |
| status.ricochet | 145/270 |
| status.tune | 84/270 |
| summon.action | 9/270 |
| summon.create | 9/270 |
| tempo.action_advance | 21/540 |
| tempo.taunt | 164/270 |
| trigger.first_hit_per_target | 120/270 |
| trigger.per_hit | 86/270 |
| trigger.per_source | 268/540 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-actual-kit-full-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

Equal policy weights define the benchmark ensemble; they do not claim that players use the policies equally often. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
