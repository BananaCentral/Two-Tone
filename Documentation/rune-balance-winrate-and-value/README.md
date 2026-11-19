# Rune balance: win rate and combat value

> **Historical study:** This was an exploratory report from an earlier simulator and scenario design. It is superseded by the shared-engine, passive-only comparison in [Rune balance current](../rune-balance-current/README.md). Do not combine these older figures with the current benchmark.

## What was measured

Each Rune was compared with the same party and encounter without a Rune, using matched random seeds. The selected Rune was assigned to one character at a time. This measures individual Rune value, not the effect of equipping the same set on several characters.

- 5 playable characters, 9 Rune effects, and 2 party compositions
- Single common, elite, and boss enemies; common and elite groups; boss with adds
- Short, medium, and long encounter lengths at easy, medium, and hard settings
- 150 battles per Rune condition; 874,800 Rune battles and 24,300 baseline battles

The simulator’s short/medium/long encounter health and difficulty settings are synthetic comparison profiles. Treat results as a controlled balance signal, not a prediction of live game win rates.

## Damage and value accounting

Character damage is the character’s **total recorded damage**, not just direct attacks. It includes direct damage, bleed, follow-up, ricochet, summon, echo, and reflect damage. Damage is attributed to the character’s archetype; Lily’s hauntling damage is included with Lily. `scenario-results.csv` shows before and after totals, the change by damage source, and the paired win rates with 95% intervals.

The summaries also show total party damage, incoming enemy damage, shield value granted and absorbed, energy, skill points, action advances, and Rune activations. Incoming damage change can reflect shorter fights or action control as well as mitigation, so it is not a pure blocked-damage measure.

Only characters whose current abilities can activate a Rune are included in the Rune-level eligible summaries. The eligible character mix differs by Rune, so compare Rune averages as broad signals; use `character-rune-eligible-summary.csv` for character-specific fit.

## Current results

Across eligible wearer/encounter conditions:

| Rune | Win rate before | Win rate with Rune | Change | Wearer total damage | Party damage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Recycle | 91.07% | 91.84% | +0.77 pp | +5.3% | +1.45% |
| United | 91.07% | 91.72% | +0.66 pp | +24.8% | +1.27% |
| Amplify | 91.07% | 91.70% | +0.63 pp | +11.5% | +1.04% |
| Dark Matter | 91.07% | 91.57% | +0.50 pp | +9.8% | +0.84% |
| Radiant Moon | 91.07% | 91.56% | +0.50 pp | +13.2% | +0.82% |
| Clear Skies | 91.07% | 91.50% | +0.43 pp | +3.2% | +0.73% |
| Infinite Space | 91.07% | 91.39% | +0.32 pp | +0.9% | +0.63% |
| Eternal Sun | 91.07% | 91.37% | +0.31 pp | +6.6% | +0.67% |
| Celestial Star | 91.07% | 91.30% | +0.23 pp | +5.2% | +0.43% |

Percent-point changes are absolute differences in win rate. The overall average includes encounters where both Rune and baseline already have high win rates; hard, longer encounters separate the effects more clearly.

Dark Matter did increase damage materially: about **9.8% more total wearer damage overall**, and **15.4% more in long, hard boss encounters**. Its average win-rate gain was smaller (+0.50 percentage points overall; +3.87 points in long, hard boss encounters), because it only improves damage during eligible wearer actions. Other Runes add team skill points, energy, shields, or enemy action delay, which can prevent losses without producing as large a wearer-damage increase.

Dark Matter is especially effective on Soul in the current model: +8.4% wearer damage and +1.23 win-rate points across eligible scenarios; in long, hard boss encounters, +15.5% wearer damage and +9.17 win-rate points. The character-specific table contains results for every eligible pairing.

## Files

- `winrate-and-value.png` — all-encounter win rates and damage changes
- `long-hard-boss-value.png` — long, hard boss comparison
- `rune-eligible-summary.csv` — overall Rune-level summary using compatible wearers
- `character-rune-eligible-summary.csv` — all scenario results by compatible wearer and Rune
- `long-hard-boss-eligible-summary.csv` — Rune-level results for long, hard boss encounters
- `long-hard-boss-character-summary.csv` — character-specific long, hard boss results
- `scenario-results.csv` — condition-by-condition results, source breakdowns, and confidence intervals
- `study-metadata.json` — test matrix and assumptions
- `source/` — simulator and matched-seed runner used for this study

To rerun from the repository root:

```sh
node Documentation/rune-balance-winrate-and-value/source/run-study.mjs
```

The runner writes the full, unaggregated results to `Documentation/rune-balance-winrate-and-value/raw-run.json`.
