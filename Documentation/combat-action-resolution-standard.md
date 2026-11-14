# Combat Action Resolution Standard

Resolve battle actions in visible phases so players can follow the acting character, damage source, and effect order.

## Phase order

1. Show the acting character's ability and resolve its primary hit or hits. All targets of the same AoE are one primary phase.
2. Resolve ability-triggered effects caused by those hits, such as Lily's Ricochet. Show each effect after the primary phase.
3. Resolve ally follow-ups caused by the action, such as Soul's Follow-up, after ability-triggered effects.
4. Begin the next scheduled action after the previous action's visible resolution phases have been presented.

## Timing and feedback

- Leave at least 500 ms between distinct damage phases. A follow-up must not resolve in the same frame as the hit that caused it.
- Begin the battle intro on the first actor in the scheduled turn order. Do not show the first roster ally as a temporary fallback before turn order is initialized.
- Keep the action in resolution until its chained effects have been applied, so another turn cannot interrupt the sequence.
- Keep a visible action banner on screen during resolution. Label primary damage with its actor and ability. Give each follow-up its own source/effect label and separate damage value; do not combine primary, Ricochet, and Follow-up damage into one floating number.
- Show damage near each affected target and preserve the event order in the battle log.
- This timing applies to chains of actions and triggered effects. It does not add an artificial pause between separate targets hit as part of one AoE action.

## Camera and scene transitions

- Keep the camera on the current combat shot until the action and its queued effects finish. An animation ending a frame before combat resolution must not reveal the command view or another screen.
- Ease camera changes within the same view over 250 ms. Complete ally movement before returning the character to their resting position; never snap them home when the action ends.
- Keep actors stationary through camera cuts. Basic attacks may use their designated movement; Skills and Ultimates do not inherit a generic lunge. Keep idle movement subtle and avoid continuous screen shake.
- Keep Ultimate presentation active for 1.5 seconds. An ally-targeted Ultimate stays on the party view through the recipient's effect so the camera does not cut away immediately.
- When changing between forward and reverse battlefield views, show one scene at a time and ease into the destination without a flash or dark veil. Do not cross-render both scenes, since this duplicates characters, targets, and effects.
- A new turn must not run an additional ally entrance animation while the previous action is still resolving.
- Keep the selected target and action focus stable through resolution. Change camera focus only when the next actual action or target selection begins.
- When an enemy reaches zero HP, keep its defeated sprite on stage for a 500 ms grayscale fade and sink. Treat it as defeated immediately for targeting and turn order, but keep its formation slot unavailable until the fade completes.
- Deploy reinforcements only after the defeating action and its chained effects have finished, followed by the enemy defeat presentation beat. Animate each reinforcement over 500 ms with a fade and rise into its formation slot, then allow the next combat action. Apply the same timing to Bleed defeats and independent summon attacks.

## Lily and Soul example

When Lily attacks Ricochet-marked enemies and Soul has a Follow-up available, display and resolve: Lily's initial attack, Lily's Ricochet True damage, then Soul's Follow-up True damage. Leave at least 500 ms between the Ricochet and Soul phases.
