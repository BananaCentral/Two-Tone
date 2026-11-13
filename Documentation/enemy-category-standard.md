# Enemy Category Standard

## Categories

Every enemy record uses a required `category` field with one canonical lowercase value:

| Value | Display name |
|---|---|
| `common` | Common |
| `elite` | Elite |
| `boss` | Boss |

Runtime data must validate the value against these three categories before the enemy is added to a wave.

## Scope

Category classifies an enemy's encounter role. It does not itself define stat multipliers, HP scaling, turn frequency, abilities, or other combat behavior. Those rules must be specified separately.

## Enemy Levels and Barriers

- Category does not define enemy Level or level-based stat growth.
- The current Slime training encounter is explicitly Level 1. The current enemy runtime uses authored archetype stats directly. No enemy level-scaling or progression standard is defined; do not infer a Level 50 Slime by multiplying its stats by 50.
- Enemy archetypes define HP, Attack, Defense, and Speed. Enemy Barrier and Broken State rules are defined in the [Turn Order Standard](turn-order-standard/turn-order-standard.md).

## Current roster

Slime and Wolf are the currently defined Common enemies. Every wave instance receives the validated category from its enemy archetype. The five formation slots define placement only. No Elite or Boss enemy is currently defined. The training encounter defaults to a mixed roster beginning with Wolf and can be set directly to Slime, Wolf, or Mixed in Battle Test Options.
