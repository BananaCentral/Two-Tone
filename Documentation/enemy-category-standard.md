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

## Current roster

Slime is the first defined Common enemy. Every wave instance receives the validated category from its enemy archetype. The five formation slots define placement only. No Elite or Boss enemy is currently defined.
