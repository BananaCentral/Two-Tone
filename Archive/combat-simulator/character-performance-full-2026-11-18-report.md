# Character Performance Benchmark — 2026-11-18

## Run configuration

- Candidate set: every character's passive, Basic Attack, Skill, Ultimate, catalogued support effect, and full kit.
- Preset: Full standard sample, 1,000 scenario cells × 20 paired seeds, starting seed `20261118`.
- Scenario dimensions: one to four allies, one to five enemies, Easy/Medium/Hard, and Short/Medium/Long.
- Total evaluated comparisons: 14,949 candidate/wearer matchups.
- Outcome score: win 100, draw 50, loss 0. The full-kit control keeps the same character and stats but removes their passive, Skill, and Ultimate and substitutes the standard Basic.

The Outcome Rating is the average team result in this benchmark mix, not a character's intrinsic power grade. The **rating difference** is the more useful character comparison: it measures the full kit against its stated control. In this run, the overall character ratings equal the weighted win rates because the full-kit matchups recorded no draws. Intervals describe variation across the 20 paired seeds, not uncertainty in the selected scenario sample.

## Full-kit comparison

| Character | Outcome rating | Control rating | Rating difference | Win-rate change (95% CI) | HP swing (BAE) | Read |
|---|---:|---:|---:|---:|---:|---|
| Soul | 21.64 | 14.32 | **+7.32** | +7.32 pp (7.12 to 7.52) | +6.18 | Positive evidence |
| Logan | 19.88 | 15.94 | **+3.93** | +3.93 pp (3.67 to 4.20) | +1.51 | Positive evidence |
| Lily | 18.26 | 18.06 | +0.21 | +0.21 pp (-0.11 to 0.52) | +0.69 | Inconclusive |
| Zero | 18.23 | 18.12 | +0.11 | +0.11 pp (-0.14 to 0.36) | -0.75 | Inconclusive |
| Dawn | 17.58 | 19.53 | **-1.95** | -1.95 pp (-2.19 to -1.72) | -0.55 | Negative under this policy |

## Component impact

Rating-point changes below are paired treatment-minus-control estimates. Action comparisons force that action on the first eligible turn and compare it with the standard Basic alternative; action execution rate is reported in the CSV.

| Character | Passive | Basic | Skill | Ultimate | Full kit |
|---|---:|---:|---:|---:|---:|
| Soul | +1.30 | +6.49 | +8.46 | +10.51 | +7.32 |
| Dawn | +0.93 | +3.03 | **-2.81** | +4.01 | **-1.95** |
| Zero | +0.00 | **-1.33** | +1.09 | +6.01 | +0.11 |
| Lily | +0.25 | +0.20 | +0.85 | +4.40 | +0.21 |
| Logan | +0.71 | -0.00 | +2.28 | +0.94 | +3.93 |

### What stands out

- **Soul** has the largest full-kit gain. His Ultimate is his strongest measured action, followed by Skill and Basic.
- **Logan** gains strongly from his full kit. The isolated Blood Shield protection effect adds +5.66 rating points; the isolated Taunt effect was inconclusive at approximately zero win-rate change.
- **Dawn** needs a closer look. Her passive and Ultimate effects help, and isolated Tune support is positive (+0.43). But her Skill action is -2.81 against the Basic alternative, pulling the full-kit comparison below its control. The simulator's fixed policy spends Skill Points on Skills whenever available, so this is evidence about that policy and action tradeoff—not proof that Dawn is weak in player-selected teams.
- **Lily** and **Zero** are near neutral at the full-kit level in this sample; both confidence intervals cross zero. Their Ultimates show positive action impact, especially Lily's +4.40 and Zero's +6.01.
- **Zero's Basic** is -1.33 against its standard Basic reference. That is a component comparison, not a judgment of his complete kit.

## Files

- [Component ratings CSV](character-performance-full-2026-11-18-mechanic-rating.csv)
- [Character-specific ratings CSV](character-performance-full-2026-11-18-mechanic-rating-by-character.csv)
- [Scenario-stratified results CSV](character-performance-full-2026-11-18-summary.csv)
- [Win-rate chart](character-performance-full-2026-11-18-winrate.svg)
- [Detailed battle results (compressed JSONL)](character-performance-full-2026-11-18.jsonl.gz)
- [Run metadata](character-performance-full-2026-11-18-metadata.json)
