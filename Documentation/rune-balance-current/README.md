# Rune balance performance

This benchmark applies the character performance system to Rune set passives. Each eligible Rune/wearer pair is run as a matched before/after comparison: the control has no Runes equipped, and the treatment equips the four-piece set so its passive can activate. Rune main stats and substats are disabled in both branches. The party, encounter, policy, and random seed are matched. Ineligible wearer/Rune pairs are reported as `N/A`, not as zero performance.

The headline measure is the difference in the wearer's 0–100 Outcome Rating, measured through full-party battles so support, survival, and enemy-control passives can affect wins. Each battle scores 100 for a win and 0 for a loss or timeout; a change from 25 to 40 is `+15` rating points. Win-rate percentage-point change is shown alongside it. Damage, BAE, HP swing, Skill Points, Energy, Shields, and turns are diagnostics; they explain the effect but do not add to the rating. Eligible wearers are averaged equally for each Rune.

## Latest balanced run

Generated 2026-11-19 using the current Rune rules in the [Rune standard](../rune-standard/rune-standard.md). The balanced preset covered 675 policy-scenario cells, expanded to 5,130 candidate/wearer comparisons, each with 10 matched seeds (51,300 paired comparisons). Coverage includes all five current characters where their authored kit can activate the Rune, four-person parties, the five enemy counts and enemy class bands, Easy/Normal/Hard enemy levels, and basic-focused, skill-focused, and mixed policies. The benchmark policy weights are 25% basic-focused, 25% skill-focused, and 50% mixed. Difficulty weights are 25% Easy, 50% Normal, and 25% Hard. See the benchmark report and coverage CSV for exact dimensions and sampled strata.

| Rune | Eligible wearers | No-Rune → with Rune | Change |
|---|---|---:|---:|
| Amplify | All five | 47.60 → 48.21 | +0.61 |
| Celestial Star | All five | 47.60 → 48.13 | +0.53 |
| Clear Skies | All five | 47.60 → 48.08 | +0.48 |
| Dark Matter | All five | 47.60 → 48.14 | +0.54 |
| Eternal Sun | All five | 47.60 → 48.07 | +0.47 |
| Infinite Space | All five | 47.60 → 48.16 | +0.56 |
| Radiant Moon | Lily, Zero | 47.67 → 48.23 | +0.56 |
| Recycle | All five | 47.60 → 48.08 | +0.48 |
| United | Dawn | 48.17 → 48.83 | +0.67 |

These are averages across eligible wearers, not one score shared by every character. United has one eligible wearer in the current roster, so its result is Dawn's result. Recycle now averages +0.48 rating points with its 80% action advance and two-turn cooldown. The wearer-level results vary, and the benchmark classifies every Rune as inconclusive or wearer-dependent rather than establishing a definitive balance verdict. Celestial Star averages +0.53 points with its updated 25% Critical Damage bonus. Eternal Sun reduces Ultimate cost by 20 Energy and restores 20 Energy after the wearer's next action. Treat these as estimated win-rate effects in this benchmark, not a definitive Rune ranking. The policies do not optimize around Rune effects, and diagnostics can show gains that do not change the winner. Read each character's before/after score, interval, and mechanic event evidence before drawing balance conclusions.

## Artifacts

- [Rune summary](rune-impact-r9-balanced-2026-11-19-rune-impact.csv): equal-weighted eligible-wearer summaries.
- [Rune results by wearer](rune-impact-r9-balanced-2026-11-19-rune-impact-by-wearer.csv): score and win-rate change, intervals, eligibility, and activation evidence for each pair.
- [Win-rate chart](rune-impact-r9-balanced-2026-11-19-winrate.svg): control and Rune outcomes.
- [Benchmark report](rune-impact-r9-balanced-2026-11-19-benchmark-report.md), [scenario coverage](rune-impact-r9-balanced-2026-11-19-benchmark-coverage.csv), and [mechanic coverage](rune-impact-r9-balanced-2026-11-19-benchmark-mechanics.csv): benchmark design and coverage diagnostics.
- [Policy scores](rune-impact-r9-balanced-2026-11-19-benchmark-policy-scores.csv) and [character win-rate chart](rune-impact-r9-balanced-2026-11-19-character-winrate.svg): supporting views.

## Eligibility

Eligibility is derived from each character's authored kit actions, not hardcoded by character name. For this roster, Radiant Moon applies to Lily and Zero because their Skills deal damage; United applies to Dawn because Tune targets exactly one ally. Other Runes have a trigger available to all five current characters. Future characters are classified from their authored actions.

## Reproduction

```sh
node tools/combat-performance.mjs --preset balanced --candidate all-rune-impact \
  --output Documentation/rune-balance-current/rune-impact-r9-balanced-2026-11-19.jsonl
```

The benchmark is conditional on the current roster, shared combat engine, sampling design, and supplied Rune rules. The confidence intervals in the wearer CSV describe seed variation within sampled scenarios; they do not include all possible scenario-design uncertainty. These results support investigation and comparison, but should not alone trigger balance changes.
