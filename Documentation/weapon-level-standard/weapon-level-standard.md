# Two-Tone Weapon Level Standard

## Weapon Level Cap

A weapon's maximum level follows the player's Rank-based character level cap:

| Player Rank | Weapon level cap |
|---|---:|
| 1–10 | 10 |
| 11–20 | 20 |
| 21–30 | 30 |
| 31–40 | 40 |
| 41–50 | 50 |

## Weapon XP

Weapons use the character XP curve. At weapon Level `L`, the XP needed for the next Level is:

`L × 10 × (1 + floor(L ÷ 5))`

XP carries over after a level-up. At Ascension gates, weapon leveling pauses until that weapon Ascends; retained XP applies after Ascension. A weapon at its current Rank-based level cap cannot receive additional XP. Enchanted Books grant Weapon XP; see the [Item Standard](../item-standard/item-standard.md).

Weapons Ascend individually at Levels 10, 20, 30, and 40 to progress past each gate. Each weapon Ascension consumes one Gem and unlocks further leveling without directly increasing stats. Ascension can be completed only up to the player's current Rank-based weapon level cap.

## Potential and Stat Bonus

Potential determines a weapon's Level 1 stat bonus. Each weapon level adds one percentage point to the bonus. Weapon level increases do not alter the Potential rank.

| Potential | Standard bonus at Level 1 | Standard bonus at Level 50 | Premium bonus at Level 1 | Premium bonus at Level 50 |
|---:|---:|---:|---:|---:|
| 1 | 31% | 80% | 51% | 100% |
| 2 | 36% | 85% | 76% | 125% |
| 3 | 41% | 90% | 101% | 150% |
| 4 | 46% | 95% | 126% | 175% |
| 5 | 51% | 100% | 151% | 200% |

The bonus applies to all six character stats, as defined in the [Loadout Standard](../systems/loadout.md). The Level 50 values are reached only at weapon Level 50. At a lower Rank-based cap, the weapon stops at the value for its current Level and resumes leveling when the cap increases.

The bonus for weapon type `T`, Potential `P`, and weapon Level `L` is:

- Standard: `(31 + 5 × (P − 1) + (L − 1))%`
- Premium: `(51 + 25 × (P − 1) + (L − 1))%`

