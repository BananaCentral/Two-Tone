# Two-Tone Character Level Standard

## Purpose

This standard defines character Levels and Character XP. All six primary stats—HP, Physical Attack, Physical Defense, Magical Attack, Magical Defense, and Speed—scale with character Level according to their individual stat standards.

## Character Levels

- Each character has an individual Level and Character XP total.
- A newly acquired character starts at Level 1 with 0 Character XP.
- A character's maximum Level depends on the player's Rank:

  | Player Rank | Character level cap |
  |---|---:|
  | 1–10 | 10 |
  | 11–20 | 20 |
  | 21–30 | 30 |
  | 31–40 | 40 |
  | 41–50 | 50 |

## Character XP and Leveling

- Battles do not grant Character XP. Other XP sources will be decided later.
- For a character at Level `L`, the XP needed for the next Level is:

  `L × Base`, where `Base = 10 × (1 + floor(L ÷ 5))`

- The Base starts at 10 and increases by 10 after the character reaches each fifth Level.
- Examples: Level 1→2 requires 10 XP; Level 4→5 requires 40 XP; Level 5→6 requires 100 XP; Level 10→11 requires 300 XP.
- Characters level up automatically when they have enough XP. XP remaining after a level-up carries into the next Level.
- At Ascension gates, leveling pauses until that character Ascends. Any remaining XP stays with them and applies after Ascension.
- Once at their Rank-based level cap, a character cannot receive new XP. Any XP remaining from the gain that brought them to the cap is retained.
- If Rank raises the character's cap, retained XP applies automatically until the next Ascension gate or the new cap.

## Ascension

- Each character must Ascend individually at Levels 10, 20, 30, and 40 to progress past that Level.
- Ascension unlocks further leveling; it does not directly increase stats.
- Ascension requirements will be decided later.

## Open Design Decisions

- Sources of Character XP.
- Ascension requirements.
