# Combat Visual Effects Standard

## Purpose

This standard defines how combat actions and passive effects receive readable, character-specific visual feedback. Visual effects communicate the action, target, damage type, and status changes; they do not change combat rules or calculations.

## Required effect coverage

- Each playable character's Passive, Basic Attack, Skill, and Ultimate must have a distinct visual treatment. A passive may use a triggered effect rather than an always-on animation.
- Triggered effects such as Soul's follow-up, Lily's Exposed and Ricochet marks, and Ricochet damage must have separate cues so players can distinguish the base action from the passive or mark trigger.
- Targeted ally skills show the normal ally selection circle on the selected living ally. The cue stays visible during the action's resolution.
- Independent summons use their own effect identity, separate from their summoner's normal Basic Attack.
- Enemy archetypes use recognizable attack cues that distinguish their attack behavior.
- Area effects render for each affected target. Single-target effects stay centered on the selected target. Ally effects center on the selected ally.
- Visuals should use a short entrance, a clear impact/mark moment, and a fade. They must not cover the party HUD or hide damage and status feedback.

## Current visual registry

| Source | Action or trigger | Visual treatment |
|---|---|---|
| Soul | Passive follow-up | Blue white cross-slash on each affected enemy |
| Soul | Basic | Steel blue sword slash |
| Soul | Skill / Enhance | Blue runic ring and starburst around Soul |
| Soul | Ultimate | Expanding blue and gold sigils on affected enemies |
| Lily | Passive / Exposed | Violet sigil with an Exposed label |
| Lily | Basic | Pink petal burst |
| Lily | Skill / Ricochet | Purple ripple; separate Ricochet mark and trigger flashes |
| Lily | Ultimate | Violet hauntling portals and spectral orbs |
| Lily | Independent hauntling turn | Ghostly violet AoE rings |
| Dawn | Passive / Resourceful | Party-wide teal ripple and +2 SP cue at battle start |
| Dawn | Basic | Teal starburst and gold ring |
| Dawn | Skill / Tune | Teal note symbols and rings on the selected ally |
| Dawn | Ultimate | Gold advance rings and energy trail on the selected ally |
| Slime | Basic | Green acid globules on affected allies |
| Slime Leader | Basic / blast | Bright green globules and an expanding target ring on each ally in the blast |
| Slime Monster | Basic / AoE | Wide green shockwave with slime motes across the allied formation |
| Wolf | Basic | Three red claw strokes on affected allies |

The character and enemy visual registries are implemented in `src/scripts/main.js` as `ACTION_VISUALS` and `ENEMY_ACTION_VISUALS`, with the combat visual drawing helpers. Keep the registries, rendering behavior, and this table aligned when adding or changing an action.

## Rendering and gameplay boundary

- Visual effects are presentation only. They must not modify damage, Energy, Skill Points, target selection, turn order, durations, or mark state.
- Apply mechanics through the combat action resolver. Emit visual events from the same action or status trigger that applies the mechanic, using the actual affected target IDs.
- The rendering layer reads the effect identity and target IDs; it does not infer or recalculate gameplay outcomes.
- Hidden critical stats remain represented by the existing critical damage feedback and critical label.
- Ally-targeting selection uses the same selection state as the support resolver. The ring is an input affordance, not a second targeting rule.

## Adding an effect

1. Add or update the action-to-visual identity in `ACTION_VISUALS`.
2. Implement the visual using the existing canvas helpers, preserving fade timing and target placement.
3. Emit a dedicated visual event at the passive/status trigger when the trigger needs a cue distinct from the action itself.
4. Add the new effect to this registry table and document its trigger in the character entry.
5. Keep the same combat outcome when an effect is hidden or reduced-motion presentation is later added.
