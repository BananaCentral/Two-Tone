# Targeting Standard

Attacks use one of three canonical target shapes:

| Shape | Target rule |
|---|---|
| `single` | The selected primary target only. |
| `blast` | The primary target and enemies in adjacent formation slots, up to three targets total. |
| `aoe` | Every living enemy. |

Target selection policy is separate from target shape. For example, an automated ally may select the lowest-HP enemy as a primary target, while an enemy may select a random ally. The shape then determines which additional units, if any, are hit.

`five-hit` is a repeated-hit attack pattern used by development controls; it is not a target shape.

## Soul targeting

- Basic is `single` by default.
- After spending at least three Skill Points on Enhance, the next Basic is `blast`. Each target receives the full damage.
- Ultimate is `aoe` and hits every living enemy.
