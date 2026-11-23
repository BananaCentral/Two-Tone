# Character Benchmark: Policy Sensitivity

Balanced benchmark run on 2026-11-18. Each policy covers all 540 current scenario strata per character (party size, enemy count/class band, encounter length, difficulty), with 10 matched seeds per scenario. That is 2,700 character-scenario comparisons per policy.

| Character | Scripted score / 100 | Skill-reserve score / 100 | Change | Scripted kit lift vs control | Skill-reserve kit lift vs control |
|---|---:|---:|---:|---:|---:|
| Dawn | 16.2 | 17.0 | +0.8 | -1.5 | -1.1 |
| Lily | 17.2 | 17.5 | +0.3 | -0.4 | -0.6 |
| Logan | 17.9 | 18.6 | +0.7 | +4.6 | +4.5 |
| Soul | 21.2 | 22.3 | +1.1 | +7.3 | +8.3 |
| Zero | 18.6 | 19.5 | +0.9 | -0.5 | +0.1 |

The overall score is the benchmark's equally band-weighted battle outcome (win 100, draw 50, loss 0). “Kit lift” is the paired score difference from a same-stat control with that character's Passive, Skill, and Ultimate removed. These numbers are conditional on this scenario matrix and these two scripted action policies; they are not intrinsic or player-optimal ratings.

The policy change preserves one shared Skill Point before using a Skill. The highest-to-lowest ordering did not change. Absolute scores moved by 0.3–1.1 points, and kit-lift changes were also small. This suggests limited sensitivity to this specific resource-conservation rule. It does not establish robustness to different target choices, encounter plans, or optimal human play.

## Reports

- [Scripted policy report](character-policy-scripted-2026-11-18-benchmark-report.md)
- [Skill-reserve policy report](character-policy-reserve-2026-11-18-benchmark-report.md)
