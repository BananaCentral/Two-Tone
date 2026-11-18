# Combat Trigger Eligibility Standard

## Purpose

Every damage event has a source type and action identity. Trigger rules consult the shared `COMBAT_DAMAGE_EVENT_TYPES` and `COMBAT_TRIGGER_ELIGIBILITY` catalog in `src/scripts/combat-definitions.mjs`; live combat and the simulator use the same eligibility.

`sourceId` identifies the unit responsible for the damage. `actionId` identifies the source action, so effects with once-per-action or once-per-source limits do not count each target or hit as a different action.

## Damage event types

| Event | Counts as an attack? | Summary |
|---|---:|---|
| `direct_hit` | Yes | Basic, Skill, Ultimate, or enemy attack hit |
| `follow_up_hit` | Yes | Direct hit created by a Follow-Up |
| `ricochet_hit` | Yes | Direct hit created by Ricochet |
| `summon_hit` | Yes | Direct hit created by a summon action |
| `echo_hit` | No | Copied damage from an eligible hit |
| `reflect_hit` | No | True damage returned by Reflect |
| `damage_over_time` | No | A periodic tick such as Bleed |
| `barrier_break` | No | Automatic damage caused when Barrier health is depleted |

Every target hit in an AoE and every hit in a multi-hit action is a separate damage event. Events from one action retain the same `actionId`.

## Default eligibility

| Triggered mechanic | Eligible source events | Requirement and limits |
|---|---|---|
| Echo | Direct, Follow-Up, Ricochet, and summon hits | Must deal HP damage. Each event echoes at most once. Echo, Reflect, damage-over-time, and Barrier-break events cannot create Echo. |
| Reflect | Direct, Follow-Up, Ricochet, summon, and Echo hits | Must cause HP or Shield damage. Barrier damage alone does not count. Reflect damage cannot create another Reflect. |
| Attack-triggered effects | Direct, Follow-Up, Ricochet, and summon hits | Each effect may narrow its eligible events. Echo, Reflect, damage-over-time, and Barrier-break events are not attacks. |
| Soul Follow-Up | Direct and summon hits from an ally action | One activation per unique source action; excludes Soul's own action and cannot chain from another Follow-Up or secondary damage. |
| Lily Ricochet | Direct and summon hits from an ally action | One activation per unique source action and marked target; cannot chain from Ricochet or secondary damage. |
| Lifesteal | Any event that deals actual HP damage | Uses the source of that damage event. Shield loss and Barrier damage alone do not heal. |

The eligible source lists are defaults for these mechanics. An ability-specific rule may narrow the list in its shared definition, but may not silently broaden it. Add a catalog entry and update this document when a new event or trigger kind is introduced.

## Resolution and chains

Resolve an attack hit, then its direct Reflect, then its Echo, then any Reflect caused by that Echo. Echo preserves the source hit's damage type and does not trigger attack-only effects. Reflect resolves as True damage and cannot create more Reflect or Echo. Damage-over-time and automatic Barrier-break damage do not trigger attack-only effects, Echo, or Reflect.

Follow-Up and Ricochet are allocated from the eligible source action's hit events after its primary hits resolve. Their resulting hits use their own event type and action identity. They may create Echo and Reflect, but do not start another Follow-Up or Ricochet chain.

## Implementation rules

- Use a registered event type for each damage event; do not infer attack eligibility from damage type or animation name.
- Preserve the original source unit and source action identity through Echo and Reflect.
- Resolve Echo and Reflect through the shared damage engine so Shields, Barriers, True damage, and defeat use the same rules in live combat and simulation.
- When changing a mechanic's proc rules, update this catalog, its mechanic definition, and its specific standard together.
