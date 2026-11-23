# Character Performance Benchmark Report

- Benchmark version: 6
- Sample status: all design strata represented
- Generated: 2026-11-19T08:29:29.958Z
- Scenario-policy cells: 1350
- Character scenario runs: 1350
- Seeds per matchup: 20; first seed: 1
- Policies: `scripted-auto-v1`, `skill-reserve-auto-v1`, `effect-aware-auto-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and Easy/Normal/Hard enemy stat levels.

## Character benchmark scores

The headline ensemble score is the equal-weight mean of the three named policy win rates using each character's actual authored kit; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. The score averages outcomes within enemy-class bands, then gives represented bands equal weight. It is a contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because the policies are reproducible probes, not estimates of player frequency. Ability event evidence records which tagged mechanics activated and their observed values; it is diagnostic and does not subtract a disabled-kit control.

Difficulty changes only enemy stats, using the same Level 1 growth rule for HP, Attack, Physical Defense, Magical Defense, and Speed: Easy ×1, Normal ×1.5, Hard ×2, rounded to the nearest 0.25. There are no separate encounter-length, HP, Attack, or Defense multipliers; enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

| Character | Ensemble win rate / 100 | Scenario 95% interval | Policy range | Sampled scenario cells | Design strata covered |
|---|---:|---:|---:|---:|---:|
| dawn | 28.7 | 22.1–34.6 | 24.3–34.4 | 88 | 45/45 |
| lily | 27.5 | 21.3–34.1 | 24.4–31.1 | 88 | 45/45 |
| logan | 27.7 | 21.1–34.3 | 24.8–30.8 | 88 | 45/45 |
| soul | 29.4 | 22.9–36.0 | 26.9–31.7 | 88 | 45/45 |
| zero | 29.4 | 21.9–36.2 | 27.1–30.6 | 88 | 45/45 |

## Per-policy scores

| Character | Policy | Win rate / 100 |
|---|---|---:|
| dawn | scripted-auto-v1 | 24.3 |
| lily | scripted-auto-v1 | 24.4 |
| logan | scripted-auto-v1 | 24.8 |
| soul | scripted-auto-v1 | 26.9 |
| zero | scripted-auto-v1 | 27.1 |
| dawn | skill-reserve-auto-v1 | 27.3 |
| lily | skill-reserve-auto-v1 | 26.9 |
| logan | skill-reserve-auto-v1 | 27.5 |
| soul | skill-reserve-auto-v1 | 29.6 |
| zero | skill-reserve-auto-v1 | 30.4 |
| dawn | effect-aware-auto-v1 | 34.4 |
| lily | effect-aware-auto-v1 | 31.1 |
| logan | effect-aware-auto-v1 | 30.8 |
| soul | effect-aware-auto-v1 | 31.7 |
| zero | effect-aware-auto-v1 | 30.6 |

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

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-actual-kit-full-difficulty-1x-1_5x-2x-2026-11-19-benchmark-coverage.csv). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](character-performance-actual-kit-full-difficulty-1x-1_5x-2x-2026-11-19-character-winrate.svg).

## Mechanic event evidence

| Mechanic tag | Scenario-policy samples with an event |
|---|---:|
| buff.critical | 270/270 |
| buff.damage | 293/540 |
| buff.next_basic | 293/540 |
| damage.conditional_multiplier | 158/270 |
| damage.critical | 270/270 |
| damage.direct | 757/1350 |
| damage.follow_up | 159/270 |
| damage.magical | 300/540 |
| damage.over_time | 111/270 |
| damage.physical | 274/540 |
| damage.true | 363/540 |
| debuff.defense | 183/270 |
| debuff.mark | 183/270 |
| defense.shield | 192/270 |
| limit.charges | 159/270 |
| limit.duration | 486/810 |
| limit.stacks | 112/270 |
| recovery.lifesteal | 173/270 |
| resource.capacity | 270/270 |
| resource.energy | 886/1350 |
| resource.hp_cost | 192/270 |
| resource.skill_point | 994/1350 |
| status.bleed | 111/270 |
| status.exposed | 183/270 |
| status.ricochet | 180/270 |
| status.tune | 111/270 |
| summon.action | 30/270 |
| summon.create | 30/270 |
| tempo.action_advance | 50/540 |
| tempo.taunt | 192/270 |
| trigger.first_hit_per_target | 158/270 |
| trigger.per_hit | 112/270 |
| trigger.per_source | 339/540 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-actual-kit-full-difficulty-1x-1_5x-2x-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

Equal policy weights define the benchmark ensemble; they do not claim that players use the policies equally often. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
