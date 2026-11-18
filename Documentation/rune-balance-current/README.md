# Rune balance performance

This report compares each Rune's four-piece effect against a matched control using the same wearer, Rune stat rolls, battle state, action policy, encounter, and random seed. The control has the four-piece set effect disabled. The treatment enables only that effect.

The primary result is paired win-rate change in percentage points. BAE and HP swing describe the resulting combat impact; they are supporting diagnostics, not a second normalized score. The wearer-level report preserves fit differences, since a Rune may be useful to one character and ineffective for another. The overall estimate weights eligible wearers equally.

The benchmark balances sampled scenarios across party size, enemy count, encounter length, and difficulty. Results are directional for the selected sample and seed count; they do not claim exhaustive coverage of all identities or formations. Read per-wearer and per-stratum results before changing balance.

## Artifacts

- [`paired-performance.jsonl`](paired-performance.jsonl): paired encounter results and direct Rune effect counterfactuals.
- [`paired-performance-summary.csv`](paired-performance-summary.csv): equally weighted scenario-stratum estimates.
- [`paired-performance-winrate.svg`](paired-performance-winrate.svg): before/after win rates and percentage-point differences by Rune and wearer.
- [`paired-performance-rune-impact.csv`](paired-performance-rune-impact.csv): equal-wearer Rune outcome and BAE summaries.
- [`paired-performance-rune-impact-by-wearer.csv`](paired-performance-rune-impact-by-wearer.csv): direct impact estimates for each eligible wearer.

## Reproduction

```sh
node tools/combat-performance.mjs --candidate all-rune-impact --preset balanced --seed 71017 --output Documentation/rune-balance-current/paired-performance.jsonl
```
