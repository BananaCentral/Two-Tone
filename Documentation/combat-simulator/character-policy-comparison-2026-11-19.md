# Four-Person Character Policy Comparison — 2026-11-19

Balanced benchmark: five characters × 135 design strata × 10 paired seeds under each of three action policies. All parties have exactly four characters. Each character has 135/135 design strata; no action-limit timeouts were recorded. The displayed rating is the equally stratified encounter win rate (wins 100, losses 0). Scenario intervals show variation from sampled compositions; paired differences compare the full kit with the same-stat Basic-only control. Scores are conditional on the policy and scenario design.

| Character | Scripted score | Reserve score | Effect-aware score | Scripted kit delta | Reserve kit delta | Effect-aware kit delta |
|---|---:|---:|---:|---:|---:|---:|
| Dawn | 35.3 (29.6–41.3) | 37.8 (31.9–43.9) | 42.3 (36.1–48.2) | -1.3 | +1.8 | +3.4 |
| Lily | 34.5 (28.9–40.4) | 37.5 (32.0–43.3) | 39.2 (33.5–44.9) | -2.0 | +0.8 | -0.6 |
| Logan | 36.1 (30.0–41.3) | 40.1 (33.7–45.5) | 41.4 (35.0–46.9) | +9.0 | +12.0 | +11.0 |
| Soul | 34.5 (28.8–40.8) | 39.3 (33.8–45.3) | 39.4 (33.8–45.5) | +5.6 | +10.4 | +4.1 |
| Zero | 33.0 (26.9–39.3) | 38.4 (32.4–44.4) | 39.1 (32.7–45.0) | -2.1 | -1.1 | -2.0 |

## Bear benchmark stats

The authored Bear definition remains **450 HP, 90 Attack, 6 Physical Defense, 6 Magical Defense, 60 Speed**. The benchmark intentionally scales enemy HP by encounter length, and HP/Attack/defenses by difficulty; Speed stays fixed. Thus Bear scenario losses are against the recorded scaled benchmark profile, not necessarily against the authored 450-HP Bear.

| Encounter profile | Effective HP | Effective Attack | Effective defenses | Speed |
|---|---:|---:|---:|---:|
| Easy / Short | 219.375 | 67.5 | 4.5 / 4.5 | 60 |
| Medium / Medium | 2,250 | 90 | 6 / 6 | 60 |
| Hard / Long | 4,500 | 112.5 | 7.5 / 7.5 | 60 |

These are benchmark scenario settings, not edits to the Bear archetype. No enemy balance values were changed to force victories. The three policies yield different character scores, so report policy sensitivity alongside the score; do not average policy scores into a single universal rating.

Raw JSONL, per-policy score/coverage files, and charts are in the matching `character-policy-*-2026-11-19` artifacts.
