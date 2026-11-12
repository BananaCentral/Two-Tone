# Two-Tone Turn Order Standard

## Purpose

This standard defines how combat turns are scheduled and how actions affect turn order.

## Turn Scheduling

- At battle start, all units begin at the same timeline clock, with no initial Advance or Delay. Speed determines their first turn.
- Every unit receives at least one turn per cycle. Higher turn rates can grant additional turns.
- A unit's turn rate is calculated using its Speed, its team's average Speed, and the slower team's average Speed:

  `Turn rate = max(1, (unit Speed + team average Speed) / (2 × slower team average Speed))`

- The unit's Speed and its team average have equal weight in this calculation.
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

- An Ultimate is an off-turn action and does not consume a scheduled turn.
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
