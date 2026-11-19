# Rune Set Passive Benchmark Report

- Generated: 2026-11-19
- Balanced preset: 675 scenario-policy cells, 5,130 matched wearer/battle simulations
- Action policies: Basic-focused 25%, Skill-focused 25%, Mixed 50%
- Enemy difficulty weights: Easy 25%, Normal 50%, Hard 25%

## Before/after comparison

For each eligible wearer, the control is that character with no Runes equipped. The treatment enables the selected four-piece Rune set passive. Rune main stats and substats are disabled in both branches, so the score difference measures only the passive. The same party, enemies, policy, and random seed are used for each pair. Each party has four allies so support effects, survival, enemy control, and damage can affect the outcome.

The [summary CSV](rune-impact-balanced-2026-11-19-rune-impact.csv) averages before/after ratings across eligible wearers. The [wearer CSV](rune-impact-balanced-2026-11-19-rune-impact-by-wearer.csv) shows each character's before score, after score, and difference. Ineligible pairings are N/A. Scores measure the wearer-anchored four-person battle outcome on a 0–100 scale; they are not isolated damage ratings.

## Coverage

| Dimension | Coverage |
|---|---:|
| Four-person party size | 1/1 |
| Enemy counts | 5/5 |
| Enemy archetypes | 6/6 |
| Enemy class bands | 3/3 |
| Difficulty levels | 3/3 |
| Action policies | 3/3 |
| Enemy-count/class/difficulty strata | 45/45 |

See [scenario coverage](rune-impact-balanced-2026-11-19-benchmark-coverage.csv) and [mechanic event coverage](rune-impact-balanced-2026-11-19-benchmark-mechanics.csv). The compact [JSONL](rune-impact-balanced-2026-11-19.jsonl) contains each scenario-policy comparison aggregated over its 10 matched seeds, including mechanic event evidence. The [chart](rune-impact-balanced-2026-11-19-winrate.svg) compares before and after outcomes.

## Limits

This is a balanced sample of the current roster and shared combat engine. It represents each win/loss as 100/0 and weights the policy and difficulty groups using the standardized benchmark. Results may vary by wearer and scenario. Rune main/substat value is intentionally excluded from this passive-only comparison.
