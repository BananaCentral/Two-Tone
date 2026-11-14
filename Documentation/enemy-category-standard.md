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
- Bosses have one health bar by default. A Boss archetype may set `healthBars` to two or three; other enemy categories use one health bar.
- While a Boss is on the field, at most two Elite enemies may be on the field at the same time. Additional Elite enemies stay queued until an Elite leaves the field; queued reinforcements do not bypass the limit.
- A Boss cannot enter the field while more than two Elite enemies are already there. If a Boss is still queued, the field may contain more than two Elites until the Boss can enter.
- The one-Boss and five-Elite limits are counted independently for each wave. Common enemies do not count toward either category limit. The existing five-enemy formation limit still applies to total field size.
- Validate a wave's category counts when constructing its encounter plan, and enforce the Boss and Elite field limits whenever an enemy is deployed, including initial deployment and reinforcements.

## Scope

Category classifies an enemy's encounter role. It does not itself define stat multipliers, HP scaling, turn frequency, abilities, or other combat behavior. Those rules must be specified separately.

## Enemy Levels and Barriers

- Category does not define enemy Level or level-based stat growth.
- The current Slime training encounter is explicitly Level 1. The current enemy runtime uses authored archetype stats directly. No enemy level-scaling or progression standard is defined; do not infer a Level 50 Slime by multiplying its stats by 50.
- Enemy archetypes define HP, Attack, Defense, and Speed. Enemy Barrier and Broken State rules are defined in the [Turn Order Standard](turn-order-standard/turn-order-standard.md).

## Current roster

Slime and Wolf are Common enemies, Slime Leader is Elite, and Slime Monster is a Boss. Every wave instance receives the validated category and health-bar count from its enemy archetype. The default Mixed training encounter includes a Slime Leader in its first wave and a Slime Monster in its final wave; a final wave with three or more enemies also includes two Slime Leaders. The roster can be set to Slime, Wolf, Mixed, Slime Leader, or Slime Monster in Battle Test Options. Slime Leader waves include at most five Leaders, with remaining slots filled by Common Slimes. Slime Monster waves include one Boss, with remaining slots filled by Common Slimes.
