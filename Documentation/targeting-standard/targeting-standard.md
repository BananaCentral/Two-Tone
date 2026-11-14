# Targeting Standard

Attacks use one of three canonical target shapes:

| Shape | Target rule |
|---|---|
| `single` | The selected primary target only. |
| `blast` | The primary target and enemies in adjacent formation slots, up to three targets total. |
| `aoe` | Every living enemy. |

Target selection policy is separate from target shape. For example, an automated ally may select the lowest-HP enemy as a primary target, while an enemy may select a random ally. The shape then determines which additional units, if any, are hit.

`five-hit` is a repeated-hit attack pattern used by development controls; it is not a target shape.

## Enemy attack targeting

Enemy Basic Attacks use the same `single`, `blast`, and `aoe` shapes against living allies. Single selects one random living ally. Blast selects a random living ally as the primary target and also hits living allies in the immediately adjacent party formation slots, up to three total. AoE hits every living ally. Each target receives the full attack unless the ability explicitly defines divided damage.

## Ally support targeting

- A targeted support action enters selection after the ability is chosen, matching the enemy-target flow.
- A support action that affects all living allies resolves immediately after one ability press; it does not enter enemy or ally target selection. Validate its Skill Point cost before applying it.
- Select a living ally by tapping their battlefield sprite or HUD portrait card. The selected ally receives a visible circular outline, matching the enemy target indicator, and remains highlighted through resolution.
- Pressing the same targeted ability again confirms the currently highlighted eligible ally. Selecting another ally changes the target; choosing another action switches the pending action.
- Self-targeting abilities keep the acting ally selectable. Defeated allies are not valid targets unless the ability explicitly supports revival.

## Soul targeting

- Basic is `single` by default.
- After spending at least three Skill Points on Enhance, the next Basic is `blast`. Each target receives the full damage. Premium Weapon Duplicate 3 changes it to `aoe`.
- Ultimate is `aoe` and hits every living enemy.
