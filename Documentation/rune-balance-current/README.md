# Rune balance performance — current draft

## Verdict

No Rune is clearly overtuned across the roster in this pass. Clear Skies and United have the largest average win-rate lifts; Radiant Moon has the largest average damage value among damage Skills. Celestial Star, Eternal Sun, and Infinite Space show smaller average lifts, but their activation rates are low and their value is concentrated in particular encounter types. Recycle is the most character-dependent: its Soul result is strong, while the Dawn and Logan results are weak or negative.

Treat these as **directional results, not final balance labels**. The Action Value Standard defines how to measure effects but does not define a numerical target range for “balanced.” The sample is 360 of 17,213,850 benchmark cells (0.0021%), with 10 paired seeds per sampled matchup. The sample is balanced across all party sizes (1–4), enemy counts (1–5), Short/Medium/Long, and Easy/Medium/Hard; it cycles through legal formations and enemy lineups, but it does not exhaust identities or ordered formations.

## Equal-wearer summary

Win-rate change is shown in percentage points relative to the same character, party, battle policy, and seed without a four-piece set effect. BAE is the favorable HP swing divided by 16 HP. Rune summaries weight eligible wearers equally; wearer-specific detail is in [`rune-summary-by-wearer.csv`](rune-summary-by-wearer.csv).

| Rune | Eligible wearers | Win-rate change | HP swing | BAE | Activations / battle | Assessment |
|---|---|---:|---:|---:|---:|---|
| Amplify | dawn, lily, logan, soul, zero | +0.92 pp | +28.9 | +1.81 | 0.76 | Modest overall. Soul gains far more because enhanced basic actions multiply the same bonus across multiple targets. |
| Celestial Star | dawn, lily, logan, soul, zero | +0.66 pp | +12.7 | +0.80 | 0.53 | Low average impact in this sample; only a small portion of battles reached an eligible Ultimate. |
| Clear Skies | dawn, lily, logan, soul, zero | +1.97 pp | +39.8 | +2.49 | 1.55 | Highest broad win-rate lift. Its shield contributes; the Reflect bonus is dormant in the current roster because no unit has a base Reflect source. |
| Dark Matter | dawn, lily, logan, soul, zero | +0.96 pp | +27.5 | +1.72 | 1.57 | Useful for damage dealers, especially Soul, Lily, and Zero; less useful on support/tank turns that do not deal damage. |
| Eternal Sun | lily, logan, soul, zero | +0.58 pp | +19.2 | +1.20 | 0.35 | Smaller average lift, with limited Ultimate activations. More of a burst option than a consistent value Rune. |
| Infinite Space | dawn, lily, logan, soul, zero | +0.75 pp | +15.9 | +1.00 | 0.30 | Modest average, with more value in medium/long fights where the wearer can use an Ultimate while multiple enemies remain. |
| Radiant Moon | lily, zero | +1.43 pp | +42.4 | +2.65 | 1.46 | High damage value on both eligible users, Lily and Zero; stronger in short fights where the Skill Echo lands early. |
| Recycle | dawn, lily, logan, soul, zero | +0.44 pp | +19.5 | +1.22 | 1.62 | Highly character-dependent: strongest on Soul in this model, while the Dawn/Logan results are weak or negative and need action-policy review. |
| United | dawn, logan | +2.16 pp | +27.2 | +1.70 | 1.49 | Strong average utility for its two eligible users, Dawn and Logan; particularly noticeable when short fights reward the extra action sooner. |

## Rating relative to +100 SVP stat controls

The rating compares each Rune's win-rate lift with the average lift from five +100 SVP stat controls, using the same setless four-Rune stat loadout, wearer, matchup, and paired seeds. The tier is based on a stratified paired-bootstrap 95% interval for that difference. “Below reference” means a lower win-rate lift than the average +100 SVP stat control; it does not automatically mean the Rune is undertuned. BAE is shown as an explanation of HP impact and does not affect the rating.

| Rune | Rune win lift | Mean +100 SVP lift | Difference vs reference (95% CI) | Rating |
|---|---:|---:|---:|---|
| Radiant Moon | +1.43 pp | +3.35 pp | −1.91 pp (−2.20 to −1.59) | Below reference |
| Eternal Sun | +0.58 pp | +2.85 pp | −2.26 pp (−2.47 to −2.09) | Below reference |
| Celestial Star | +0.66 pp | +2.80 pp | −2.14 pp (−2.34 to −1.95) | Below reference |
| Dark Matter | +0.96 pp | +2.80 pp | −1.84 pp (−2.00 to −1.66) | Below reference |
| Clear Skies | +1.97 pp | +2.80 pp | −0.83 pp (−1.08 to −0.59) | Below reference overall |
| Infinite Space | +0.75 pp | +2.80 pp | −2.05 pp (−2.23 to −1.90) | Below reference |
| Recycle | +0.44 pp | +2.80 pp | −2.36 pp (−2.60 to −2.11) | Below reference |
| Amplify | +0.92 pp | +2.80 pp | −1.88 pp (−2.05 to −1.73) | Below reference |
| United | +2.16 pp | +2.09 pp | +0.07 pp (−0.32 to +0.41) | Within reference range |

Clear Skies is above the stat reference for Dawn in this sample. Its overall Rune tier is lower because compatible wearers are weighted equally and its other wearer results are smaller.

## How to read the results

- **BAE:** 1 BAE represents 16 HP of favorable swing. Average BAE averages each matchup's `(extra enemy HP removed + extra ally HP retained) ÷ 16` across the sampled strata and eligible wearers. The prior Clear Skies result of +2.49 BAE therefore means about +39.8 HP of favorable swing per sampled matchup, including damage and prevented HP loss; it is not 39.8 damage dealt.
- Win-rate lift is the primary performance measure. BAE and HP swing explain the effect's combat contribution; neither is added to the Rune rating.
- The sample contains 360 of 17,213,850 scenario cells, with 10 paired seeds per cell. It covers party sizes 1–4, enemy counts 1–5, all lengths, and all difficulties, but does not exhaust roster identities or ordered formations.

## Rules simulated

- **Radiant Moon:** 50% Echo on damaging Skills; two wearer-turn cooldown.
- **Eternal Sun:** next damaging Ultimate is guaranteed to crit, with +50 percentage points Critical Damage and +10 Energy; two wearer-turn cooldown.
- **Celestial Star:** Ultimate advances the wearer 100% and grants 30 Energy; two wearer-turn cooldown.
- **Dark Matter:** one damaging Basic, Skill, or Ultimate ignores 40% of both defenses and deals 20% more Physical, Magical, or True damage; one wearer-turn cooldown.
- **Clear Skies:** after a Skill, grants a shield equal to 10% of max HP for two turns; while shielded, adds 10 percentage points Reflect; two wearer-turn cooldown after applying the shield.
- **Infinite Space:** Ultimate delays each living enemy 100%; each affected enemy is immune to this Rune for its next two turns.
- **Recycle:** Skill grants one Skill Point and 10 Energy; two wearer-turn cooldown.
- **Amplify:** Basic Attack deals 50% more damage across its full target pattern; two wearer-turn cooldown.
- **United:** ally-targeted Skill advances the wearer 50% and grants 20 Energy; two wearer-turn cooldown.

- These average lifts are small because the benchmark has many short fights where the player already wins or loses before a Rune can change the outcome. The per-wearer CSV and chart preserve the uneven matchup results.
- Clear Skies currently grants its shield, but its +10% Reflect cannot add damage in the current single-set comparison: no current unit has base Reflect. A focused fixture with a Reflect source is needed to value that clause.
- Radiant Moon is tested only on Lily and Zero, whose Skills deal damage. Eternal Sun is tested only on damage-Ultimate users. United is tested only on Dawn and Logan, who have ally-targeting Skills. Ineligible combinations are marked N/A by exclusion, not scored as zero.
- Recycle’s negative Dawn/Logan averages are a diagnostic signal, not proof that the energy/SP refund is inherently harmful. The battle policy may turn the refunded point into an extra Skill at a worse time, and branch divergence adds variance; investigate those action sequences before nerfing it.

## Artifacts

- [`paired-performance-winrate.svg`](paired-performance-winrate.svg): Before/after win rates and percentage-point changes by Rune and wearer.
- [`paired-performance-summary.csv`](paired-performance-summary.csv): Equal-weighted composition strata, including matchup size, enemy category, length, and difficulty.
- [`paired-performance.jsonl`](paired-performance.jsonl): Compact per-cell paired estimates and confidence intervals.
- [`rune-summary.csv`](rune-summary.csv): Overall Rune estimates, weighting each eligible wearer equally.
- [`rune-summary-by-wearer.csv`](rune-summary-by-wearer.csv): Per-character estimates and activation diagnostics.
- [`calibrated-rune-ratings-rune-rating.csv`](calibrated-rune-ratings-rune-rating.csv): Overall reference-based Rune tiers.
- [`calibrated-rune-ratings-rune-rating-by-wearer.csv`](calibrated-rune-ratings-rune-rating-by-wearer.csv): The same comparison for each compatible character.
- [`calibrated-rune-ratings-winrate.svg`](calibrated-rune-ratings-winrate.svg): Win rates for Runes and +100 SVP stat controls.

## Reproduction

```sh
node tools/combat-performance.mjs --candidate all-rune-ratings --preset balanced --seed 71017 --output Documentation/rune-balance-current/calibrated-rune-ratings.jsonl
```
