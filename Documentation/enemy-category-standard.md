# Enemy Category Standard

## Categories

Every enemy record uses a required `category` field with one canonical lowercase value:

| Value | Display name |
|---|---|
| `common` | Common |
| `elite` | Elite |
| `boss` | Boss |

Runtime data must validate the value against these three categories before the enemy is added to a wave.

## Wave composition and field limits

- A wave may contain at most one Boss.
- A wave may contain at most five Elite enemies in total. This includes Elite enemies deployed on the field and held in the reinforcement queue.
- At most three Elite enemies may be on the field at once. Further Elites stay in the reinforcement queue until an Elite leaves the field.
- Bosses have one health bar by default. A Boss archetype may set `healthBars` to two or three; other enemy categories use one health bar.
- While a Boss is on the field, at most two Elite enemies may be on the field at the same time. Additional Elite enemies stay queued until an Elite leaves the field; queued reinforcements do not bypass the limit.
- A Boss cannot enter the field while more than two Elite enemies are already there. If a Boss is queued, deploy it before Elite reinforcements so the stricter two-Elite limit applies immediately.
- The one-Boss and five-Elite limits are counted independently for each wave. Common enemies do not count toward either category limit. The existing five-enemy formation limit still applies to total field size.
- Deploy Elite enemies in the center three formation slots when possible. During a Boss encounter, the Boss occupies the center slot and up to two Elites occupy the slots immediately to its left and right.
- Validate a wave's category counts when constructing its encounter plan, and enforce the Boss and Elite field limits whenever an enemy is deployed, including initial deployment and reinforcements.

## Scope

Category classifies an enemy's encounter role. It does not itself define stat multipliers, HP scaling, turn frequency, abilities, or other combat behavior. Those rules must be specified separately.

## Enemy Levels and Barriers

- Category does not define enemy Level or level-based stat growth.
- The current Slime training encounter is explicitly Level 1. The current enemy runtime uses authored archetype stats directly. No enemy level-scaling or progression standard is defined; do not infer a Level 50 Slime by multiplying its stats by 50.
- Enemy archetypes define HP, Attack, Defense, and Speed. Enemy Barrier and Broken State rules are defined in the [Turn Order Standard](turn-order-standard/turn-order-standard.md).

## Current roster

Slime, Wolf, and Hawk are Common enemies, Goblin and Geode are Elite, and Bear is a Boss. Every wave instance receives the validated category and health-bar count from its enemy archetype. The default Mixed training encounter cycles through Common Slime, Wolf, and Hawk enemies, includes a Goblin in its first wave, a Bear in its final wave, and may include a Geode among the final-wave Elites. The roster can be set to Slime, Wolf, Hawk, Mixed, Goblin, Geode, or Bear in Battle Test Options. Hawk waves contain only Common Hawks. Goblin and Geode waves include at most five of their selected Elite enemy, with remaining slots filled by Common Slimes. Bear waves include one Boss, with remaining slots filled by Common Slimes.
