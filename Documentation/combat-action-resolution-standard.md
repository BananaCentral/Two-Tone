# Combat Action Resolution Standard

Resolve battle actions in visible phases so players can follow the acting character, damage source, and effect order.

## Phase order

1. Show the acting character's ability and resolve its primary hit or hits. All targets of the same AoE are one primary phase.
2. Resolve ability-triggered effects caused by those hits, such as Lily's Ricochet. Show each effect after the primary phase.
3. Resolve ally follow-ups caused by the action, such as Soul's Follow-up, after ability-triggered effects.
4. Begin the next scheduled action after the previous action's visible resolution phases have been presented.

## Timing and feedback

- Leave at least 250 ms between distinct damage phases. A follow-up must not resolve in the same frame as the hit that caused it.
- Keep the action in resolution until its chained effects have been applied, so another turn cannot interrupt the sequence.
- Keep a visible action banner on screen during resolution. Label primary damage with its actor and ability. Give each follow-up its own source/effect label and separate damage value; do not combine primary, Ricochet, and Follow-up damage into one floating number.
- Show damage near each affected target and preserve the event order in the battle log.
- This timing applies to chains of actions and triggered effects. It does not add an artificial pause between separate targets hit as part of one AoE action.

## Lily and Soul example

When Lily attacks Ricochet-marked enemies and Soul has a Follow-up available, display and resolve: Lily's initial attack, Lily's Ricochet True damage, then Soul's Follow-up True damage. Leave at least 250 ms between the Ricochet and Soul phases.
