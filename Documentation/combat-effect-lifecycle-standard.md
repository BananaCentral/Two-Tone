# Combat Effect Lifecycle Standard

## Purpose

This standard defines how temporary effects are applied, refreshed, stacked, timed, consumed, cleansed, and removed. The shared engine and simulator use the same lifecycle metadata in `COMBAT_EFFECT_LIFECYCLE` from `src/scripts/combat-definitions.mjs`.

Effect magnitude and duration values stay on the authored ability or effect. Lifecycle metadata defines how those values behave.

## Turn clocks

| Clock | Advances when | Used for |
|---|---|---|
| `affected_turn_start` | An affected unit begins its turn, before its action | Bleed tick timing |
| `affected_turn_end` | An affected unit finishes its turn, including a skipped turn while Broken or Stunned | Marks, debuffs, buffs, taunts, and Residue duration |
| `owner_turn_end` | The effect owner finishes a turn after activating it | Rune cooldowns; the turn that started the cooldown does not consume a cooldown turn |
| `summon_action_end` | A summon completes one of its own actions | Summon lifetime |
| `encounter_end` | The battle ends | Shield and Barrier cleanup |

Effects do not lose duration while another unit acts. A unit defeated before its turn ends does not advance its `affected_turn_end` clock; defeat removes effects marked for defeat cleanup.

## Current effect rules

| Effect | Application and reapplication | Timing and expiry |
|---|---|---|
| Bleed | Successful applications add stacks up to the ability's cap (default five). | At the affected unit's turn start, before its action, deal the configured damage per stack and consume one stack. Removed by cleanse or defeat. |
| Exposed | Add a stack up to the active cap; reapplication refreshes the duration of all stacks. | Decrement at the enemy's turn end. Lily's Duplicate 2 supplies its larger stack cap and duration. |
| Ricochet | Refresh the mark duration and clear its used-source history. | Decrement at the marked enemy's turn end. A target can trigger once per unique source action while marked. |
| Soul Mark | Refresh the mark duration when reapplied. | Decrement at the marked enemy's turn end. |
| Lily Weakened | Replace the same debuff and refresh its duration. | Decrement at the affected enemy's turn end. |
| Stun | A successful eligible hit applies it based on the action's `stunChance` (0 to 1) and `stunTurns`; reapplication replaces it and refreshes duration. | Decrement at the affected unit's turn end. Each scheduled turn skipped counts once; removed by cleanse or defeat. |
| Tsunade Slow Start | Each action adds one 50% Speed stack, up to ten, and refreshes all stacks to two turns. Successful Stun or debuff applications consume one stack per affected target. | Decrement at Tsunade's turn end; removed by cleanse or defeat. |
| Tsunade Defense Down / Attack Down | A successful Skill or Ultimate proc replaces the same debuff and refreshes its duration. | Decrement at the affected enemy's turn end; removed by cleanse or defeat. |
| Tune | Replace any existing Tune on the recipient. The next Basic Attack consumes its enhancement. | Decrement at the recipient's turn end if not consumed. |
| Taunt | Replace the same source and target pair; different sources remain separate. Targeting uses the highest active Taunt chance. | Decrement at the taunted enemy's turn end. |
| Residue | Add stacks up to its cap and refresh its duration. | Decrement at the affected unit's turn end; clear when duration reaches zero. |
| Rune cooldown | Starts when its trigger resolves. | Counts the owner's completed turns after the activation turn. |
| Summon lifetime | Starts with the summon’s immediate action. | One duration count is consumed per completed summon action; remove at zero. |
| Shield | Adds to the unit's shield pool. | Absorbed by incoming damage and removed when depleted or the encounter ends. |
| Enemy Barrier | Damage reduces Barrier health alongside normal HP resolution. | On depletion, resolve the automatic break effect; restore Barrier on Broken recovery. |

## Removal and cleanse

Lifecycle records declare whether an effect is removed by cleanse, defeat, duration expiry, depletion, or encounter end. Full cleanse uses those declarations for marks, debuffs, Bleed, and Taunt. Defeat cleanup removes effects whose lifecycle says they do not survive defeat. A partial cleanse removes one selected stack or entry according to its caller.

## Implementation rules

- Add a lifecycle record for every timed effect, stackable effect, cooldown, summon lifetime, Shield, or Barrier.
- Timed effect entries must have a registered ID, storage location, clock, and reapplication policy.
- Stack policies must state whether reapplication adds, replaces, refreshes, or resets source history, plus where the cap comes from.
- Damage-over-time rules must state tick timing, damage basis, and stack consumption.
- An action with Stun declares `stunChance` and positive integer `stunTurns` together. Stun chance rolls once per target per source action, on that target's first eligible successful hit.
- Cooldown and summon counts use their own owner's completed turns/actions, not global rounds.
- The shared engine owns effect application, expiry, cleanse, and defeat cleanup. Game and simulator code may present or record results but must not age effects independently.
- If a mechanic changes, update this standard and the corresponding lifecycle data together.

## Validation

`COMBAT_EFFECT_LIFECYCLE` validates clock names at module initialization. The engine rejects timed marks and debuffs without a compatible lifecycle record and ages the same effect clocks for live battles and simulations.
