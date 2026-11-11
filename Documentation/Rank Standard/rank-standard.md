# Two-Tone Rank Standard

## Purpose

This standard defines player rank as account progression. Rank belongs to the player account or saved file, not to individual characters.

## Rank Rules

- Rank is the player's account level.
- Rank progression is earned through Rank XP, tracked separately from character progression.
- Each account or saved file has its own Rank XP and rank progression.
- A player starts at Rank 1 and can reach a maximum of Rank 50.
- The base required Rank XP starts at 5.
- The Rank XP required to advance from the current rank is the current base required Rank XP multiplied by the current rank level.
- Every fifth rank is a milestone, beginning at Rank 5. Reaching a milestone increases the base required Rank XP by 5. The increased base applies to rank advances after that milestone.
- Rank 5 requires 20 Rank XP to reach from Rank 4. Reaching Rank 5 increases the base from 5 to 10, so advancing from Rank 5 to Rank 6 requires 50 Rank XP.
- Advancing from Rank 1 to Rank 5 requires 50 total Rank XP: 5 + 10 + 15 + 20.
- Rank XP continues to accumulate at Rank 50, but rank does not increase beyond 50.
- Rank does not decrease or reset.
- The rank is named `Rank`.
- The main menu displays the player's rank.
- Rank determines multiple aspects of the game. The specific effects are defined as those systems are designed.
- Rank data is part of the player's local save. The storage method is an implementation detail and is not prescribed by this standard.

## Open Design Decisions

- Which activities grant Rank XP and how much they grant.
- Which game systems and rewards are determined by rank.
- Whether rank data will eventually use online account storage.
