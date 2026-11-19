# Rune Set Passive Benchmark Report

- Benchmark version: 7
- Sample status: all design strata represented
- Generated: 2026-11-19T12:56:36.028Z
- Scenario-policy cells: 675
- Character scenario runs: 5130
- Seeds per matchup: 10; first seed: 1
- Policies: `basic-focused-v1`, `skill-focused-v1`, `mixed-v1`
- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and Easy/Normal/Hard enemy stat levels.

## Rune passive comparisons

Each eligible wearer is compared with no Runes equipped against the same character with only the selected four-piece Rune passive enabled. Rune stat bonuses are disabled in both branches. The [Rune summary](rune-impact-r9-balanced-2026-11-19-rune-impact.csv) and [by-wearer results](rune-impact-r9-balanced-2026-11-19-rune-impact-by-wearer.csv) contain the before/after ratings and differences.

Difficulty changes only enemy stats, using one uniform Level 1 stat multiplier for HP, Attack, Physical Defense, Magical Defense, and Speed: Easy ×0.75, Normal ×1, Hard ×1.5, rounded to the nearest 0.25. There are no separate encounter-length, HP, Attack, or Defense multipliers; enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.

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

Enemy class mixes observed are listed in [benchmark coverage CSV](rune-impact-r9-balanced-2026-11-19-benchmark-coverage.csv). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](rune-impact-r9-balanced-2026-11-19-character-winrate.svg).

## Mechanic event evidence

| Mechanic tag | Scenario-policy samples with an event |
|---|---:|
| buff.damage | 490/675 |
| buff.defense_ignore | 495/675 |
| damage.critical | 474/675 |
| damage.direct | 84/135 |
| damage.echo | 183/270 |
| damage.reflect | 489/675 |
| defense.shield | 489/675 |
| limit.cooldown | 2993/4455 |
| limit.duration | 84/135 |
| resource.energy | 295/675 |
| resource.skill_point | 483/675 |
| tempo.action_advance | 483/675 |
| tempo.action_delay | 151/675 |
| trigger.per_action | 379/810 |

A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](rune-impact-r9-balanced-2026-11-19-benchmark-mechanics.csv).

## Interpretation and limitations

The policy and difficulty weights define the benchmark convention; they do not claim that players or encounters occur in these proportions in live play. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.
