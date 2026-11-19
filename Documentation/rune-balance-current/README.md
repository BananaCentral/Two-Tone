# Rune balance performance

This benchmark applies the character performance system to Rune set passives. Each eligible Rune/wearer pair is run as a matched before/after comparison: the control has no Runes equipped, and the treatment equips the four-piece set so its passive can activate. Rune main stats and substats are disabled in both branches. The party, encounter, policy, and random seed are matched. Ineligible wearer/Rune pairs are reported as `N/A`, not as zero performance.

The headline measure is the difference in the wearer's 0–100 Outcome Rating, measured through full-party battles so support, survival, and enemy-control passives can affect wins. Each battle scores 100 for a win and 0 for a loss or timeout; a change from 25 to 40 is `+15` rating points. Win-rate percentage-point change is shown alongside it. Damage, BAE, HP swing, Skill Points, Energy, Shields, and turns are diagnostics; they explain the effect but do not add to the rating. Eligible wearers are averaged equally for each Rune.

## Current balanced run

Generated 2026-11-19 with the balanced preset: 5,130 eligible wearer/Rune scenario-policy cells across 675 scenario-policy cells. Each cell ran 10 matched seeds, for 51,300 before/after battle pairs. Coverage includes all five current characters where their authored kit can activate the Rune, four-person parties, the five enemy counts and enemy class bands, Easy/Normal/Hard enemy levels, and basic-focused, skill-focused, and mixed policies. The benchmark policy weights are 25% basic-focused, 25% skill-focused, and 50% mixed. Difficulty weights are 25% Easy, 50% Normal, and 25% Hard. See the benchmark report and coverage CSV for exact dimensions and sampled strata.

| Rune | Eligible wearers | Before → with passive | Change |
|---|---|---:|---:|
| Amplify | All five | 47.60 → 48.21 | +0.61 |
| Celestial Star | All five | 47.60 → 47.78 | +0.18 |
| Clear Skies | All five | 47.60 → 47.90 | +0.30 |
| Dark Matter | All five | 47.60 → 48.60 | +1.00 |
| Eternal Sun | Lily, Logan, Soul, Zero | 47.46 → 47.70 | +0.24 |
| Infinite Space | All five | 47.60 → 48.16 | +0.56 |
| Radiant Moon | Lily, Zero | 47.67 → 48.23 | +0.56 |
| Recycle | All five | 47.60 → 47.45 | −0.15 |
| United | Dawn, Logan | 47.42 → 47.42 | 0.00 |

These are averages across eligible wearers, not one score shared by every character. Most sampled changes are under one point. The small negative Recycle estimate and United's neutral estimate are win-rate results under the preset policies; they do not establish that either buff has negative intrinsic value. The policy does not optimize around Rune effects, and diagnostics can show gains that do not change the winner. Read each character's before/after score and event evidence in the detailed CSV before drawing balance conclusions.

## Artifacts

- [Scenario records](rune-impact-balanced-2026-11-19.jsonl): treatment/control outcome summaries and aggregated mechanic event evidence for each matchup-policy cell.
- [Rune summary](rune-impact-balanced-2026-11-19-rune-impact.csv): equal-weighted eligible-wearer summaries.
- [Rune results by wearer](rune-impact-balanced-2026-11-19-rune-impact-by-wearer.csv): score and win-rate change, intervals, eligibility, and activation evidence for each pair.
- [Win-rate chart](rune-impact-balanced-2026-11-19-winrate.svg): control and Rune outcomes.
- [Benchmark report](rune-impact-balanced-2026-11-19-benchmark-report.md), [scenario coverage](rune-impact-balanced-2026-11-19-benchmark-coverage.csv), and [mechanic coverage](rune-impact-balanced-2026-11-19-benchmark-mechanics.csv): benchmark design and coverage diagnostics.

## Eligibility

Eligibility is derived from each character's authored kit actions, not hardcoded by character name. For this roster, Radiant Moon applies to Lily and Zero because their Skills deal damage; Eternal Sun applies to Lily, Logan, Soul, and Zero because Dawn's Ultimate does not deal damage; United applies to Dawn and Logan because their Skills can target allies. Other Runes have a trigger available to all five current characters. Future characters are classified from their authored actions.

## Reproduction

```sh
node tools/combat-performance.mjs --preset balanced --candidate all-rune-impact \
  --output Documentation/rune-balance-current/rune-impact-balanced-2026-11-19.jsonl
```

The benchmark is conditional on the current roster, shared combat engine, sampling design, and supplied Rune rules. The confidence intervals in the wearer CSV describe seed variation within sampled scenarios; they do not include all possible scenario-design uncertainty. These results support investigation and comparison, but should not alone trigger balance changes.
