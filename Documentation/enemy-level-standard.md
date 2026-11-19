# Enemy Level Standard

Enemy levels use the same stat progression as character levels so benchmark difficulty and live combat apply one consistent rule.

## Level curve

- Enemy Levels are integers from 1 through 50, matching the character level cap.
- Level 1 uses the enemy's authored base stats.
- At Level `L`, each stat is `roundToNearest0.25(Level 1 base stat × L)`.
- The curve applies to HP, Attack, Physical Defense, Magical Defense, and Speed.
- Enemy passives, attack patterns, stealth, tags, and other mechanics do not change with Level.
- Equipment and character-only progression modifiers do not apply to enemies.

For example, Bear's Level 1 stats are 450 HP, 90 Attack, 6 Physical Defense, 6 Magical Defense, and 60 Speed. At Level 2, its stats are 900 HP, 180 Attack, 12 Physical Defense, 12 Magical Defense, and 120 Speed.

## Implementation

`enemyStatsAtLevel` in `src/scripts/combat-definitions.mjs` resolves integer game Levels. `enemyStatsAtMultiplier` applies the same rounding rule to benchmark difficulty factors. Enemy definitions remain authored as Level 1 values.

The performance benchmark covers three named difficulties in each standard scenario band. Difficulty changes only enemy stats; it does not change an enemy's abilities or identity.

## Benchmark difficulty

Performance studies choose Easy, Normal, or Hard. Each choice applies one uniform multiplier to the enemy's Level 1 stats: HP, Attack, Physical Defense, Magical Defense, and Speed. Stats are rounded to the nearest 0.25.

| Difficulty | Stat multiplier | Character-rating weight |
|---|---:|---:|
| Easy | 0.75× | 25% |
| Normal | 1× | 50% |
| Hard | 1.5× | 25% |

These are benchmark multipliers based on the Level 1 stat line. There are no separate encounter-length, HP, Attack, or Defense adjustments, and enemy mechanics remain unchanged. They do not change the game's integer enemy Level progression.
