# Character Performance Benchmark Report

- Benchmark version: 7
- Sample status: all design strata represented
- Generated: 2026-11-19T09:12:52.265Z
- Scenario-policy cells: 675
- Character scenario runs: 675
- Seeds per matchup: 10; first seed: 1
- Policies: `basic-focused-v1`, `skill-focused-v1`, `mixed-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and Easy/Normal/Hard enemy stat levels.

## Character benchmark scores

The headline ensemble score uses each character's actual authored kit; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. Within each enemy-class band, the three policy scores are weighted Basic-focused 25%, Skill-focused 25%, Mixed 50%. Easy, Normal, and Hard are weighted 25%, 50%, and 25%; represented enemy-class bands are then averaged equally. This gives one contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because policies are reproducible probes, not estimates of player frequency. Ability event evidence records which tagged mechanics activated and their observed values; it is diagnostic and does not subtract a disabled-kit control.

Difficulty changes only enemy stats, using one uniform Level 1 stat multiplier for HP, Attack, Physical Defense, Magical Defense, and Speed: Easy ×0.75, Normal ×1, Hard ×1.5, rounded to the nearest 0.25. There are no separate encounter-length, HP, Attack, or Defense multipliers; enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

| Character | Ensemble win rate / 100 | Scenario 95% interval | Policy range | Sampled scenario cells | Design strata covered |
|---|---:|---:|---:|---:|---:|
| dawn | 48.2 | 40.4–55.0 | 46.2–49.5 | 45 | 45/45 |
| lily | 48.0 | 39.9–54.7 | 46.2–49.2 | 45 | 45/45 |
| logan | 46.7 | 39.5–53.3 | 44.5–47.8 | 45 | 45/45 |
| soul | 47.8 | 40.8–54.5 | 45.3–49.0 | 45 | 45/45 |
| zero | 47.3 | 40.3–53.7 | 45.0–48.7 | 45 | 45/45 |

## Per-policy scores

| Character | Policy | Win rate / 100 |
|---|---|---:|
| dawn | basic-focused-v1 | 46.2 |
| lily | basic-focused-v1 | 46.2 |
| logan | basic-focused-v1 | 44.5 |
| soul | basic-focused-v1 | 45.3 |
| zero | basic-focused-v1 | 45.0 |
| dawn | skill-focused-v1 | 49.5 |
| lily | skill-focused-v1 | 49.2 |
| logan | skill-focused-v1 | 47.8 |
| soul | skill-focused-v1 | 49.0 |
| zero | skill-focused-v1 | 48.7 |
| dawn | mixed-v1 | 48.5 |
| lily | mixed-v1 | 48.3 |
| logan | mixed-v1 | 47.2 |
| soul | mixed-v1 | 48.5 |
| zero | mixed-v1 | 47.8 |

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

Enemy class mixes observed are listed in [benchmark coverage CSV](character-performance-policy-probability-weighted-balanced-2026-11-19-benchmark-coverage.csv). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](character-performance-policy-probability-weighted-balanced-2026-11-19-character-winrate.svg).

## Mechanic event evidence

| Mechanic tag | Scenario-policy samples with an event |
|---|---:|
| buff.critical | 135/135 |
| buff.damage | 186/270 |
| buff.next_basic | 186/270 |
| damage.conditional_multiplier | 81/135 |
| damage.critical | 135/135 |
| damage.direct | 495/675 |
| damage.follow_up | 97/135 |
| damage.magical | 188/270 |
| damage.over_time | 112/135 |
| damage.physical | 202/270 |
| damage.true | 207/270 |
| debuff.defense | 105/135 |
| debuff.mark | 105/135 |
| defense.shield | 114/135 |
| limit.charges | 97/135 |
| limit.duration | 306/405 |
| limit.stacks | 115/135 |
| recovery.lifesteal | 115/135 |
| resource.capacity | 135/135 |
| resource.energy | 501/675 |
| resource.hp_cost | 114/135 |
| resource.skill_point | 549/675 |
| status.bleed | 112/135 |
| status.exposed | 105/135 |
| status.ricochet | 101/135 |
| status.tune | 87/135 |
| summon.action | 22/135 |
| summon.create | 22/135 |
| tempo.action_advance | 49/270 |
| tempo.taunt | 114/135 |
| trigger.first_hit_per_target | 81/135 |
| trigger.per_hit | 115/135 |
| trigger.per_source | 199/270 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](character-performance-policy-probability-weighted-balanced-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

The policy and difficulty weights define the benchmark convention; they do not claim that players or encounters occur in these proportions in live play. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
