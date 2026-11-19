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

`enemyStatsAtLevel` in `src/scripts/combat-definitions.mjs` is the shared resolver. Live battle wave construction and the combat-performance simulator both use it. Enemy definitions remain authored as Level 1 values; increasing an enemy's `level` resolves effective stats at battle setup.

The performance benchmark currently covers enemy Levels 1, 2, and 3 in each standard scenario band. Those levels correspond to the authored baseline and two progressively harder level steps; they do not change the enemy's abilities or identity.
