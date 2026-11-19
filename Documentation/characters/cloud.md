# Cloud Character Sheet

Cloud has no custom artwork yet. The battle scene and party portrait use the generic character placeholder until his assets are added.

## Identity

- Character ID: `cloud`
- Display name: Cloud
- Role: Support
- Level: 1 by default

## Base Stats

| Stat | Base value |
|---|---:|
| HP | 50 |
| Attack | 10 |
| Physical Defense | 2 |
| Magical Defense | 2 |
| Speed | 60 |

Calculated stats scale with Level and follow the shared character, Attack, Defense, and Speed standards.

## Passive: Weightless

- After Cloud completes a Basic Attack, Skill, or Ultimate, he advances his own next action by 20 percentage points.
- Character Duplicate 1 raises this to 40 percentage points.
- An Ultimate remains an off-turn action under the Turn Order Standard; Weightless also triggers after Cloud uses it.
- Mechanic tags: `tempo.action_advance`, `trigger.per_action`.

## Basic Attack

- Deals AoE Magical damage at a 0.25× Attack multiplier.
- Restores 10 Energy and 1 party Skill Point under the shared Basic Attack defaults.
- Grants each living ally, including Cloud, +20% Speed for two of that ally's turns. Each use adds one stack, up to five. Reapplying the effect refreshes the stacks' duration.
- The Speed bonus is additive with other percentage modifiers and recalculates future turn timing. Cloud's current Speed, including active Speed effects, is used by Restoration.
- Character Duplicate 2 changes the bonus to +40% per stack and duration to three turns; the five-stack maximum remains.
- Premium Weapon Duplicate 1 doubles the Basic Attack multiplier to 0.5×.
- Mechanic tags: `damage.magical`, `buff.speed`, `limit.duration`, `limit.stacks`, `resource.energy`, `resource.skill_point`.

## Skill: Restoration

- Costs 1 party Skill Point and restores 20 Energy.
- Choose one living ally. The target recovers HP equal to Cloud's current Speed × 1.0. Up to two living allies in the immediately adjacent party slots each recover 50% of that amount.
- The chosen ally receives 40 percentage points of Action Advance. Character Duplicate 3 raises this to 80 percentage points.
- Healing cannot raise a recipient above maximum HP. A vacant or defeated adjacent slot does not cause the spread heal to skip to a farther slot.
- Premium Weapon Duplicate 4 doubles the healing multiplier to 2.0×.
- Mechanic tags: `recovery.healing`, `tempo.action_advance`, `resource.energy`, `resource.skill_point`.

## Ultimate

- Costs 100 Energy.
- Deals single-target Magical damage at a 1.25× Attack multiplier and delays the target's next action by 60 percentage points.
- Character Duplicate 4 increases the delay to 100 percentage points and reduces the Energy cost to 80.
- Ultimates are off-turn actions and do not consume a scheduled turn.
- Mechanic tags: `damage.magical`, `tempo.action_delay`, `debuff.speed`, `limit.duration`, `limit.stacks`, `resource.energy`.

## Premium Weapon Effect

- While Cloud has his Premium weapon equipped, using his Ultimate applies a 20% Speed slow to every living enemy for two of that enemy's turns.
- Slow stacks up to five times; reapplying refreshes the stacks' duration. Enemy Speed cannot fall below 1.
- Premium Weapon Duplicate 3 increases each slow stack to 40%. The duration and five-stack maximum remain unchanged.

## Character Duplicates

1. Weightless advances Cloud by 40% after each action instead of 20%.
2. Basic Attack's Speed bonus becomes +40% per stack and lasts three turns instead of two.
3. Restoration advances its selected ally by 80% instead of 40%.
4. Ultimate action delay increases to 100% and its Energy cost decreases to 80.

## Premium Weapon Duplicates

1. Basic Attack multiplier doubles from 0.25× to 0.5×.
2. Ultimate multiplier doubles from 1.25× to 2.5×.
3. Ultimate's enemy Speed slow increases from 20% to 40% per stack.
4. Restoration's healing multiplier doubles from 1.0× to 2.0×.

## Availability and Assets

- Cloud is included in the playable character roster and featured-character rotation. A new account does not receive him automatically.
- Add Cloud's battle art and portrait when the assets are ready; until then, both use the standard placeholder.
