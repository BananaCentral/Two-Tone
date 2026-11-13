# Two-Tone Turn Order Standard

## Purpose

This standard defines how combat turns are scheduled and how actions affect turn order.

## Turn Scheduling

- At battle start, all units begin at the same timeline clock, with no initial Advance or Delay. Speed determines their first turn.
- Every unit receives at least one turn per cycle. Higher turn rates can grant additional turns.
- A unit's turn rate is calculated using its Speed, its team's average Speed, and the slower team's average Speed:

  `Turn rate = max(1, (unit Speed + team average Speed) / (2 × slower team average Speed))`

- The unit's Speed and its team average have equal weight in this calculation. The result is that unit's individual turn rate.
- Team base turns are calculated from team average Speed: `max(1, team average Speed / slower team's average Speed)`. The slower team therefore has at least 1 base turn.
- Example: if ally average Speed is 200 and enemy average Speed is 50, the ally team has 4 base turns per cycle (`200 / 50`) and the enemy team has 1 (`50 / 50`). Each unit still has its own turn rate under the formula above.
- Fractional turns carry between cycles. Turns earned in a cycle are spaced evenly through that cycle.
- If two turns occur at the same time, resolve an immediate turn first, then use higher Speed, ally before enemy, and alphabetical unit ID to break ties.

## Speed Averages

- The party average includes every party member, including knocked out members.
- The enemy average includes every enemy in the current wave, including defeated enemies and enemies waiting to enter.
- Summons do not affect the party average.
- Only living party members, living active enemies, and eligible independent summons take turns.
- Speed changes recalculate future turn timing while preserving accumulated Advance and Delay.

## Actions and Turn Changes

- Basic and Skill each use the acting character's scheduled turn. After the action resolves, the timeline advances.
- Enemies take one attack on their scheduled turn. After it resolves, the timeline advances.
- Advance moves a unit's next turn earlier; Delay moves it later. Effects stack, and enough Advance can bring a turn forward to the current timeline position.
- When a wave changes, the timeline continues. Living allies keep their place; new enemies join from the current timeline position.
- A replacement enemy joins as a new unit from the current timeline position.

## Ultimates

- An Ultimate is an off-turn action and does not consume a scheduled turn. In the battle interface, select the Ultimate first, then select an enemy to confirm it; the Ultimate user is shown during targeting and its camera cut-in.
- If no attack is underway, it begins immediately. Otherwise, it waits until that attack resolves, then executes before the next scheduled turn.
- After an Ultimate used before the character's normal action, that character keeps their scheduled turn and may still use Basic or Skill.
- Multiple queued Ultimates resolve in request order.
- Energy is reserved when an Ultimate is queued and spent when it begins. If its user is knocked out first, the Ultimate is canceled and the energy is released.

## Summons

- An independent summon takes an immediate first turn after creation, then follows the normal timeline. It takes three turns total before expiring.
- A controlled summon does not take its own turns. Creating one gives its owner 100% Advance.

## Open Design Decisions

- Speed values for each character and enemy.
- Which characters can create summons and the abilities that control them.
- How a revived character re-enters the timeline.

## Enemy Barriers and Broken State

- Every enemy has Barrier HP. Unless its data overrides `barrierPercent`, maximum Barrier HP is 20% of maximum HP.
- Each damaging hit applies its normal HP damage and also deals Barrier damage equal to 25% of that hit's damage. Barrier does not absorb damage, reduce HP damage, or prevent HP damage.
- When Barrier reaches zero, the enemy immediately takes one additional hit equal to 10% of its maximum HP and enters Broken state. Damage beyond the amount needed to break Barrier is discarded; it does not carry into the restored Barrier.
- While Broken, an enemy takes 50% more damage and cannot receive Action Advance.
- Broken duration starts from the enemy team's base turns, calculated as `max(1, enemy team average Speed / slower team's average Speed)`. Adjust that team base turn count using the Broken enemy's individual Speed:

  `Broken turns = max(1, round(base turns × clamp(2 − Speed / 100, 0.5, 1.5)))`

- `clamp(value, 0.5, 1.5)` means values below 0.5 become 0.5, and values above 1.5 become 1.5. `round` rounds to the nearest whole turn.
- At Speed 100, duration equals base turns. Speed 25 uses the maximum 1.5 multiplier; Speed 400 uses the minimum 0.5 multiplier. For 8 base turns, these produce 12 and 4 Broken turns. Broken duration can never be lower than 1 turn.
- Each scheduled enemy turn while Broken is counted as one lost turn and the enemy does not act. After the final lost turn, the enemy recovers before it can act again.
- Recovery fully cleanses all debuffs and marks, restores Barrier to maximum, and gives the enemy 100% Action Advance.
- A full cleanse removes every debuff and every mark. A normal cleanse removes one debuff type and one mark type, clearing every stack of each selected type.

The simulator uses the enemy team's average Speed ratio for base turns and the individual enemy's Speed for the Broken duration adjustment.
