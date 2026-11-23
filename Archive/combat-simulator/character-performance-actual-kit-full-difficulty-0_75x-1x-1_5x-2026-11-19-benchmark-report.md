# Character Performance Benchmark Report

- Benchmark version: 6
- Sample status: all design strata represented
- Generated: 2026-11-19T08:35:55.103Z
- Scenario-policy cells: 1350
- Character scenario runs: 1350
- Seeds per matchup: 20; first seed: 1
- Policies: `scripted-auto-v1`, `skill-reserve-auto-v1`, `effect-aware-auto-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and Easy/Normal/Hard enemy stat levels.

## Character benchmark scores

The headline ensemble score is the equal-weight mean of the three named policy win rates using each character's actual authored kit; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. The score averages outcomes within enemy-class bands, then gives represented bands equal weight. It is a contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because the policies are reproducible probes, not estimates of player frequency. Ability event evidence records which tagged mechanics activated and their observed values; it is diagnostic and does not subtract a disabled-kit control.

Difficulty changes only enemy stats, using one uniform Level 1 stat multiplier for HP, Attack, Physical Defense, Magical Defense, and Speed: Easy ×0.75, Normal ×1, Hard ×1.5, rounded to the nearest 0.25. There are no separate encounter-length, HP, Attack, or Defense multipliers; enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

| Character | Ensemble win rate / 100 | Scenario 95% interval | Policy range | Sampled scenario cells | Design strata covered |
|---|---:|---:|---:|---:|---:|
| dawn | 47.5 | 41.4–53.1 | 46.0–50.1 | 88 | 45/45 |
| lily | 47.3 | 41.3–53.5 | 45.9–49.7 | 88 | 45/45 |
| logan | 47.1 | 40.8–53.2 | 45.2–49.6 | 88 | 45/45 |
| soul | 47.1 | 41.1–52.8 | 45.4–49.3 | 88 | 45/45 |
| zero | 46.2 | 39.2–52.3 | 44.6–48.0 | 88 | 45/45 |

## Per-policy scores

| Character | Policy | Win rate / 100 |
|---|---|---:|
| dawn | scripted-auto-v1 | 46.3 |
| lily | scripted-auto-v1 | 46.3 |
| logan | scripted-auto-v1 | 45.2 |
| soul | scripted-auto-v1 | 45.4 |
| zero | scripted-auto-v1 | 44.6 |
| dawn | skill-reserve-auto-v1 | 46.0 |
| lily | skill-reserve-auto-v1 | 45.9 |
| logan | skill-reserve-auto-v1 | 46.6 |
| soul | skill-reserve-auto-v1 | 46.6 |
| zero | skill-reserve-auto-v1 | 46.1 |
| dawn | effect-aware-auto-v1 | 50.1 |
| lily | effect-aware-auto-v1 | 49.7 |
| logan | effect-aware-auto-v1 | 49.6 |
| soul | effect-aware-auto-v1 | 49.3 |
| zero | effect-aware-auto-v1 | 48.0 |

## Scenario coverage

| Dimension | Categories covered | Missing categories |
|---|---:|---|
| partySize | 1/1 | Complete |
| enemyCount | 5/5 | Complete |
| enemyArchetype | 6/6 | Complete |
| enemyClassBand | 3/3 | Complete |
| difficulty | 3/3 | Complete |
| policy | 3/3 | Complete |
| benchmarkStratum | 45/45 | Complete |

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-actual-kit-full-difficulty-0_75x-1x-1_5x-2026-11-19-benchmark-coverage.csv). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](character-performance-actual-kit-full-difficulty-0_75x-1x-1_5x-2026-11-19-character-winrate.svg).

## Mechanic event evidence

| Mechanic tag | Scenario-policy samples with an event |
|---|---:|
| buff.critical | 270/270 |
| buff.damage | 314/540 |
| buff.next_basic | 314/540 |
| damage.conditional_multiplier | 175/270 |
| damage.critical | 270/270 |
| damage.direct | 843/1350 |
| damage.follow_up | 183/270 |
| damage.magical | 340/540 |
| damage.over_time | 110/270 |
| damage.physical | 290/540 |
| damage.true | 413/540 |
| debuff.defense | 210/270 |
| debuff.mark | 210/270 |
| defense.shield | 217/270 |
| limit.charges | 183/270 |
| limit.duration | 533/810 |
| limit.stacks | 113/270 |
| recovery.lifesteal | 197/270 |
| resource.capacity | 270/270 |
| resource.energy | 999/1350 |
| resource.hp_cost | 217/270 |
| resource.skill_point | 1098/1350 |
| status.bleed | 110/270 |
| status.exposed | 210/270 |
| status.ricochet | 198/270 |
| status.tune | 105/270 |
| summon.action | 24/270 |
| summon.create | 24/270 |
| tempo.action_advance | 66/540 |
| tempo.taunt | 217/270 |
| trigger.first_hit_per_target | 175/270 |
| trigger.per_hit | 113/270 |
| trigger.per_source | 383/540 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-actual-kit-full-difficulty-0_75x-1x-1_5x-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

Equal policy weights define the benchmark ensemble; they do not claim that players use the policies equally often. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
