# Combat Mechanic Tags

## Purpose

Mechanic tags describe what an ability or combat rule does so the performance evaluator can choose relevant measurements without identifying a character by name or role. The shared combat definitions remain authoritative for numeric values and runtime behavior. Tags add analysis metadata; they do not change damage, costs, targeting, or timing.

Character and enemy actions/passives expose `mechanicTags`, per-tag `mechanicTargets`, and per-tag `mechanicTriggers`. Actions also expose `targeting` for their primary target and may expose `targetingVariants` when a rule changes coverage conditionally. Rune rules expose tags, triggers, and targeting. Temporary effects additionally use `COMBAT_EFFECT_LIFECYCLE`, documented in the [Combat Effect Lifecycle Standard](combat-effect-lifecycle-standard.md). The canonical lists are exported from `src/scripts/combat-definitions.mjs` as `COMBAT_MECHANIC_TAGS`, `COMBAT_TARGETING_SCHEMA`, and `COMBAT_TRIGGER_EVENTS`.

Damage-event provenance and proc eligibility are defined separately by `COMBAT_DAMAGE_EVENT_TYPES` and `COMBAT_TRIGGER_ELIGIBILITY`. See the [Combat Trigger Eligibility Standard](combat-trigger-eligibility-standard.md); mechanic tags describe what an effect does, while the event catalog defines which damage sources may activate it.

## Targeting fields

Target side, acquisition, and coverage are separate:

```js
targeting: {
  side: 'enemy',
  acquisition: 'selected',
  coverage: 'blast'
}
```

- `side`: `enemy`, `ally`, `self`, `team`, or `trigger_targets`.
- `acquisition`: `selected`, `random`, `all`, `self`, `event_defined`, `source_targets`, `attacker`, or `battle_pool`.
- `coverage`: `single`, `blast`, `aoe`, `all`, `event_defined`, `source_pattern`, or `global`.

For example, a Blast attack selects one primary enemy and has `coverage: 'blast'`; a single-target attack has `coverage: 'single'`. This avoids using “one enemy” and “single target” as interchangeable labels. Passive effects that resolve against targets from an event use `trigger_targets` and `event_defined` until the event determines the affected set.

An ability can affect more than one side. Its primary `targeting` describes the chosen target; `mechanicTargets` records the target for each tag. Logan’s Skill, for example, targets all allies for shields and all enemies for Taunt. `mechanicTriggers` records when each tag resolves, such as `on_skill`, `on_tuned_basic_used`, or `on_incoming_attack`. The allowed event names are in `COMBAT_TRIGGER_EVENTS`.

## Independently measured effects

For performance analysis, each separable outcome declares an effect record beside its authored ability. The record has:

- A stable unique `id` used to isolate the effect in matched control/treatment battles.
- One or more canonical `mechanicTags` describing the kind of effect.
- `targeting` and `trigger` describing who receives it and when it resolves.
- `measures`, the numeric result fields that the battle engine must report, such as `damageBonus`, `energyGained`, `shieldGranted`, `tauntRate`, or `actionAdvance`.

The shared `COMBAT_EFFECT_CATALOG` validates unique IDs, recognized tags, and declared measurement fields. Resolvers use `TwoToneBattleEngine.isCombatEffectEnabled(id)` to suppress a single effect for counterfactual analysis, and `recordCombatEffect(id, ...)` to record its status and actual resolved magnitudes. Every declared measure must be present as a numeric value, including zero when an effect was prevented or capped. This distinguishes “the effect did nothing in this situation” from “the simulator did not measure it.”

Use separate IDs for distinct outcomes of a compound action when you want to know which part mattered. Dawn’s Ultimate has separate Energy, action-advance, and Skill Point effects; Logan’s Blood Shield separates the team protection/health cost from enemy Taunt. For an indivisible effect, one ID can own several tags and measures. Future support effects should follow this contract instead of adding character-specific scoring weights.

## Mechanic tag catalog

| Tag | Meaning |
|---|---|
| `damage.direct` | Direct ability hit |
| `damage.physical`, `damage.magical`, `damage.true` | Damage type |
| `damage.critical` | Critical chance or critical damage effect |
| `damage.conditional_multiplier` | Conditional or periodic damage multiplier |
| `damage.over_time` | Damage resolved over time |
| `damage.echo`, `damage.reflect`, `damage.follow_up` | Secondary damage mechanics |
| `damage.barrier_break` | Automatic damage caused when barrier health is depleted; not an attack property |
| `buff.attack`, `buff.critical`, `buff.next_basic`, `buff.damage`, `buff.barrier_damage`, `buff.barrier_break_damage`, `buff.defense_ignore` | Ally or self bonuses |
| `debuff.defense`, `debuff.attack`, `debuff.damage`, `debuff.mark`, `debuff.stun` | Enemy weakening, attack reduction, a mark used by another effect, or action control |
| `defense.shield`, `defense.barrier`, `defense.damage_reduction`, `defense.stealth` | Damage prevention or avoidance |
| `recovery.healing`, `recovery.lifesteal` | HP recovery |
| `resource.energy`, `resource.skill_point`, `resource.capacity`, `resource.hp_cost` | Resource gains, costs, caps, or starting amounts |
| `tempo.action_advance`, `tempo.action_delay`, `tempo.taunt` | Turn order or attack redirection |
| `status.bleed`, `status.exposed`, `status.ricochet`, `status.tune`, `status.residue`, `status.broken`, `status.stun`, `status.slow_start` | Combat statuses and marks |
| `summon.create`, `summon.action` | Summon creation and its actions |
| `trigger.per_hit`, `trigger.first_hit_per_target`, `trigger.per_action`, `trigger.per_source`, `trigger.periodic` | Activation conditions |
| `limit.duration`, `limit.stacks`, `limit.charges`, `limit.cooldown` | Effect lifetime or activation limits |

Tags identify mechanic kinds. Actual values—multipliers, chances, duration, stacks, cooldown turns, resource amounts—stay in the combat definition. `targeting.coverage` describes who gets hit; `damage.conditional_multiplier` describes a conditional damage increase. A trigger records when an effect resolves; its condition records what must be true for it to resolve.

## Current character tags

| Character | Passive | Basic | Skill | Ultimate |
|---|---|---|---|---|
| Soul | `damage.follow_up`, `damage.true`, `trigger.per_source`, `limit.charges` | `damage.direct`, `damage.true`, `resource.energy`, `resource.skill_point` | `buff.next_basic`, `buff.damage`, `resource.skill_point`, `resource.energy` | `damage.direct`, `damage.true`, `damage.follow_up`, `resource.energy`, AoE targeting |
| Lily | `status.exposed`, `debuff.mark`, `debuff.defense`, `limit.duration` | `damage.direct`, `damage.magical`, `resource.energy`, `resource.skill_point` | `damage.direct`, `damage.magical`, `status.ricochet`, `debuff.mark`, `damage.true`, `trigger.per_source`, `resource.energy`, `resource.skill_point`, `limit.duration` | `damage.direct`, `damage.magical`, `summon.create`, `summon.action`, `resource.energy` |
| Dawn | `resource.skill_point`, `resource.capacity` | `damage.direct`, `damage.magical`, `resource.energy`, `resource.skill_point` | `status.tune`, `buff.next_basic`, `buff.damage`, `resource.skill_point`, `resource.energy`, `limit.duration` | `resource.energy`, `resource.skill_point`, `tempo.action_advance` |
| Logan | `recovery.lifesteal` | `damage.direct`, `damage.physical`, `status.bleed`, `damage.over_time`, `resource.energy`, `resource.skill_point` | `defense.shield`, `resource.hp_cost`, `tempo.taunt`, `resource.energy`, `resource.skill_point` | `damage.direct`, `damage.physical`, `status.bleed`, `damage.over_time`, `resource.energy` |
| Zero | `buff.critical`, `damage.critical` | `damage.direct`, `damage.physical`, `resource.energy`, `resource.skill_point`; targeting coverage `blast` | `damage.direct`, `damage.physical`, `damage.conditional_multiplier`, `trigger.first_hit_per_target`, `resource.energy`, `resource.skill_point` | `damage.direct`, `damage.physical`, `tempo.action_advance`, `resource.energy` |

The action’s numeric fields and target metadata specify its current multiplier, cost, duration, and target pattern. Tags do not repeat those values. Zero’s First Strike multiplier applies on the first hit to each enemy, so it uses `trigger.first_hit_per_target` and the `on_first_hit_per_target` event. Soul’s Enhance metadata derives a Basic Attack targeting variant from `blastAtStacks`: at three enhanced stacks the Basic is Blast, with a premium-weapon-duplicate override that makes it AoE. The threshold comes from the combat definition rather than being repeated in the tag rules.

Every attack hit also reduces the target’s barrier health when it has a barrier. This is shared damage resolution, not an attack-specific barrier-break property. When barrier health reaches zero, the engine emits the barrier depletion/broken event and its automatic break damage; individual attacks are not tagged as barrier-breaking attacks.

## Current enemy tags

All six enemy archetypes have `defense.barrier` and `status.broken` because enemy barrier health and the broken state are part of combat. The automatic barrier-depletion damage is not a tag on their attacks. Hawk additionally has `defense.stealth`.

| Enemy | Basic / passive mechanics |
|---|---|
| Slime | Magical single-target hit; every third Basic becomes a stronger AoE: `trigger.periodic`, `damage.conditional_multiplier` |
| Wolf | Physical single-target hit; applies Bleed: `status.bleed`, `damage.over_time`, `trigger.per_hit`, `limit.stacks` |
| Hawk | Physical single-target hit; Stealth trait: `defense.stealth` |
| Goblin | Physical Blast hit; advances its action after attacking: `tempo.action_advance`, `trigger.per_action` |
| Geode | Physical AoE hit; attack increases and stacks after attacking: `buff.attack`, `limit.stacks` |
| Bear | True-damage AoE hit; ignores defense: `buff.defense_ignore` |

Enemy area/type/strength/weakness descriptors remain encounter classification metadata, separate from mechanic tags.

## Current Rune tags

| Rune | Mechanic tags |
|---|---|
| Radiant Moon | `damage.echo` |
| Eternal Sun | `buff.critical`, `damage.critical`, `defense.stealth` |
| Celestial Star | `tempo.action_advance`, `limit.cooldown` |
| Dark Matter | `buff.defense_ignore`, `buff.damage` |
| Clear Skies | `damage.reflect` |
| Infinite Space | `tempo.action_delay` |
| Recycle | `resource.skill_point`, `limit.cooldown` |
| Amplify | `buff.damage`, `limit.cooldown` |
| United | `tempo.action_advance`, `limit.cooldown` |

## Character duplicate and weapon effects

`CHARACTER_UPGRADE_EFFECTS` in the shared combat definitions contains one record per character duplicate, signature weapon effect, and premium weapon duplicate. Every record has a stable ID, its source and rank, tagged mechanics, per-tag targets and triggers, and the values the engine applies. `getActiveCharacterUpgradeEffect` uses the same source/rank/equipped-weapon state to select an active record. The engine and analysis tools should use this catalog rather than repeat rank thresholds and effect values.

The record IDs use character names only to identify ownership and provenance; the mechanic tags remain shared. For example, Logan’s second duplicate is a `defense.shield` effect, while his second premium weapon duplicate is a `tempo.taunt` effect. A simulator counterfactual can disable one stable effect ID while keeping the character’s other duplicates and equipment unchanged.

The standard also includes `buff.barrier_damage` and `buff.barrier_break_damage` for effects that change the amount of barrier-health damage or automatic damage after barrier depletion. Neither tag marks an attack as a barrier-breaking attack.

## Performance evidence contract

Tags are also the evaluator's measurement selectors. `tools/combat-performance.mjs` maintains a required registry mapping every canonical tag to outcome fields (for example damage, shield/survival, Energy, Skill Points, action movement, status, duration, or trigger evidence). Startup validation fails if a combat tag has no measurement rule or if the registry refers to a tag that is not canonical. A candidate's plan is derived from its shared definition, including its target, trigger, and coverage metadata. This prevents the evaluator from silently ignoring a tagged mechanic or inventing character-specific score weights.

The shared `TwoToneBattleEngine` records mechanic events when effects resolve. Every event identifies its stable source component, tags, trigger, status (`attempted`, `triggered`, `applied`, `resolved`, `prevented`, or `dodged`), actor, target IDs, optional damage event/action IDs, and finite numeric values. `triggered` events confirm activation and may include an effect payload; `applied` and `resolved` values are the realized outcome. For instance, resource gains are recorded after caps and damage includes actual HP/shield/barrier resolution. The evaluator excludes `triggered` payload values from summed outcome deltas so a configured amount is not counted again alongside its resolved result. Persistent effects retain their source component and tags so later damage-over-time ticks remain attributable to the effect that applied them. Summons record creation/lifetime events and attribute their attacks to the owning Ultimate.

The event ledger is capped at 10,000 events per battle to bound memory. Its snapshot includes the dropped-event count and truncation flag. Performance reports aggregate event counts/statuses/values by component and tag and compare the paired branches. A tag can be present in a candidate plan but absent from a particular matchup; reports call this `tagged_but_not_triggered_in_this_comparison`, not a zero-value result. If the capture cap is reached, reports expose truncation. An observed event with zero delta means both branches resolved the event equally.

The tag registry selects evidence and interpretation only. It does not itself award score points. Component value is measured by paired outcomes against a same-state control in the [Action Value Standard](action-value-standard.md): win probability, HP swing/BAE, and relevant resolved support/resource evidence. Keep these outcome measures visible together so a trigger count or raw damage total cannot stand in for win impact.

Tag coverage follows the current shared combat definitions. A change to a Rune’s values or behavior must update that definition; a new mechanic requires a catalog tag and test coverage.

## Engine-supported, currently unassigned

The tag vocabulary also reserves mechanics supported by shared engine helpers but not currently assigned to a character or enemy ability, including generic healing, damage reduction, and Residue. Rampage handling is similarly available in enemy attack planning without a current roster user. These tags must not be interpreted as active roster effects until an ability definition uses them.

## Coverage rule

Every authored action, passive, enemy trait, Rune effect, character duplicate, and weapon effect must expose its relevant mechanic tags, per-tag target, and per-tag trigger. Temporary effects must also have a lifecycle record that declares their clock, stack/reapplication policy, and cleanup rules. Every tag must appear in `COMBAT_MECHANIC_TAGS`; target and trigger values must appear in their exported schemas. Performance analysis can enumerate eligible allies/enemies from target metadata and select outcome measures from the tags.

Adding an unregistered combat effect type requires an explicit `mechanicTags` list; definitions without one fail during shared combat data initialization. Add tests for the new tag, target, and trigger so it cannot silently receive only generic damage tags.
