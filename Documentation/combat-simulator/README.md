# Headless Combat Simulator

Run balance batches in Node.js without opening the canvas game.

> **Shared combat runtime:** Live battles and the headless runner now use the same authored combat definitions, math, and `TwoToneBattleEngine` for action plans/resources, typed damage and intake, shields/barriers, Echo/Reflect, status effects, character-specific effects, Rune rules, enemy attack plans, follow-ups, summons, turn scheduling, and battle outcomes. The browser owns input/animation/wave presentation; the runner owns automated action selection and metrics. Performance reports remain provisional until parity coverage is run for every action/effect family. See the [Combat Engine Standard](../combat-engine-standard.md).

## Run it

From the repository root:

```sh
node tools/combat-simulator.mjs
```

The default runs 100 battles with a reproducible seed using the Soul vs Slime example. Choose a custom scenario, batch size, and seed with:

```sh
node tools/combat-simulator.mjs --config path/to/scenario.json --runs 1000 --seed 42
```

`Documentation/combat-simulator/example-soul-lily-vs-slimes.json` is a Level 1 Soul and Lily team scenario against five Slimes. `Documentation/combat-simulator/example-logan-party-vs-bear-boss.json` includes Soul, Lily, Dawn, and Logan against the Bear boss.

`Documentation/combat-simulator/example-zero-vs-slime.json` provides a single-target Zero baseline. His current base multipliers are 0.5× Basic, 1.0× First Strike (1.5× the first time he damages a given enemy), and 1.0× Ultimate. Zero scenarios support Cutthroat Critical bonuses, per-enemy First Strike scaling, Physical Blast Basic attacks with Energy gain and shared Skill Point recovery, Ultimate self-advance and enemy delay, and configured character and Premium weapon duplicates.

## Standard character benchmark suite

Run the standard four-character encounter matrix with:

```sh
node tools/combat-simulator-benchmark.mjs --runs 1000 --seed 404
```

Run the mechanic-coverage regressions with `node --test tests/combat-simulator.test.mjs`.

The suite compares a one-bar boss, two- and three-bar boss HP benchmarks, a boss with two Elite adds, five Slimes, and three each of the Common and Elite enemies (Wolves, Hawks, Goblins, and Geodes). Pass `--config path/to/full-party.json` to use another party and its enemy archetypes. `--json` emits the full reports. Every result includes a 95% confidence interval for win rate so small batches do not look more certain than they are.

Add a `role` to each character archetype (`mainDps`, `subDps`, `support`, `sustain`, or a project-specific label) to group its results by intended job. Per-character reports separate direct damage, Bleed, Follow-up, Ricochet, summon, Echo, and Reflect damage; they also report Tune damage added, Shield granted, received, and absorbed, HP spent, Lifesteal healing, survival, Skill Point spend and generation, Tune use, action advances, and taunt redirects. These metrics describe what each kit contributes. Do not rank supports by damage alone.

The benchmark's enemy targeting and ally action policy are automated approximations, not a player-optimal strategy. A 2- or 3-bar scenario multiplies boss HP without modeling bar transitions. Compare several encounter types and inspect role-specific effects before changing a kit. Add a regression assertion for every newly supported character mechanic so future simulator changes cannot silently omit it.

Use the [Action Value Standard](../action-value-standard.md) when comparing abilities, Runes, passives, or stat investments. It defines the normalized stat budget and 16-HP Baseline Action Equivalent, equal coverage across 205 ordered legal ally formations and 9,330 ordered enemy lineups, three encounter lengths, balanced difficulty, and counterfactual win-rate Action Value.

## Standardized performance runner

Run a quick, reproducible paired comparison for every Rune and wearer represented by the selected matchup sample:

```sh
node tools/combat-performance.mjs --candidate rune:radiant-moon --runs 100 --limit-scenarios 1000
```

Candidate examples include `all-runes`, `all-stats`, `all-weapons`, `character:soul`, `weapon:premium@P1L50`, `stat:speed`, and `action:dawn/ultimate`. Use `--character` to limit a Rune, weapon, or stat comparison to one eligible wearer. Omit `--limit-scenarios` for the default 1,000-cell exploration pass; pass `--limit-scenarios 0` to enumerate the complete matrix. The complete matrix has 17,213,850 scenario cells before candidate and trial multipliers, so full runs are large batch jobs.

The runner pairs treatment/control battles by seed, measures win rates before and after, percentage-point change, HP swing and BAE, and writes detailed JSON Lines, a stratified CSV, and an SVG chart of before/after win rates with the percentage-point change. It averages seed trials inside formations, averages formations within each party/enemy composition, and then weights compositions equally. Both data outputs retain character, enemy class, team size, difficulty, encounter length, and formation details. It covers ordered ally and enemy formations, three fixed encounter lengths, and three fixed enemy-pressure levels as defined in the Action Value Standard. Results from the limited pass are exploratory; use the complete matrix and balanced sample counts for a final balance read.

Use `--json` for machine-readable output, `--max-actions 2000` to set a battle limit, or `--help` for options. Re-running with the same config and seed produces the same batch.

## Scenario structure

Each scenario defines stat and ability archetypes, then creates team instances by referencing those archetypes. Instance IDs must be unique; archetypes may be repeated, so a scenario can model five Soul instances without duplicating their definitions.

Archetypes may provide generic `attack` or separate `physicalAttack` and `magicalAttack` stats, alongside HP, defenses, and Speed. Generic Attack is used at full value for whichever damage type its action declares; action type determines the target defense. Soul, Zero, Dawn, Logan, and the Common/Elite enemies use generic Attack. Lily uses Magical Attack; Goblin and Bear use Physical Attack. Every archetype uses the simulator's level scaling for levels 1–50. Final stats follow:

`round(((base + non-equipment flat modifiers) × level + equipment flat modifiers) × (1 + percentage modifiers))`

Rune equipment flats are applied after Level scaling; signature weapon percentage bonuses apply after both. Calculated stats round to the nearest 0.25 after all stat modifiers are applied; damage and HP changes continue to round to whole HP. This scaling is standardized for characters in the game, but enemy level growth is not. The live Slime encounter uses its authored Level 1 stats directly; simulator enemy levels above 1 are hypothetical until enemy scaling is defined. Teams are listed as `teams.allies` and `teams.enemies`. The shipped Soul vs Slime example is a focused 1v1 baseline, not a full four-character party benchmark.

Optional `stealth` on an archetype or unit instance sets its hidden dodge chance from 0 to 1 (`0.5` is 50%); omitted values default to 0. Each positive-damage hit rolls independently per target before Critical Rate. A successful dodge prevents damage and effects triggered by that hit. See the [Stealth Standard](../stealth-standard.md).

Optional `weapon` settings accept `type: standard|premium`, `potential: 1–5`, and `level: 1–50` (default 1). The percentage applies to all defined combat stats. Standard Potential `P` grants `(31 + 5 × (P − 1) + (level − 1))%`; Premium grants `(51 + 25 × (P − 1) + (level − 1))%`. Optional `runes` are limited to four per unit. Each rune defines `level` 1–5, one `main` stat, three unique `subs`, and an optional `setId`; main values are HP 100, Attack/Speed 20, or defense 4 per rune level, and substats contribute 25%. Runes may be mixed; a set effect activates only when all four slots have the same `setId`. All nine Rune Set effects from the [Rune Set Standard](../rune-standard/rune-standard.md) are modeled. Optional `echoPercent` on an archetype or unit instance defines that unit's Echo source from `0` to `1`; omitted values default to `0`. Echo is resolved per direct hit and target, bypasses defenses, and is excluded from damage-over-time ticks, as specified in the [Echo Standard](../echo-standard.md). Optional `celestials` maps `passive`, `basic`, `skill`, and `ultimate` to levels 1–10 (default 1); each level adds 10% of that ability's base multiplier. Signature effects without implemented character-specific handlers are not modeled. Soul's current Premium refund and duplicate effects are supported as described below.

Supported attack damage types are `physical`, `magical`, and `true`. True Damage uses the full generic Attack stat, or the full sum of Physical and Magical Attack for split-stat units. Its defense reduction combines half of the Physical and half of the Magical defense contribution. Basic and Ultimate attacks define a multiplier and target shape (`single`, `blast`, or `aoe`). `random` and `lowestHp` are primary-target selection policies. Allies default to 20 starting Energy and enemies to 0; `energy.start` or an instance `energy` can override this. Energy is capped at 120 by default.

All simulated units default to 10% Critical Rate and 50% Critical Damage. These are hidden stats. An archetype or instance may override them with `critical: { "rate": 0.25, "damage": 0.75 }`; `criticalRateBonus` and `criticalDamageBonus` add temporary or other source bonuses. Soul's Premium Weapon Duplicate 2 adds 10 percentage points of Critical Rate and 25 percentage points of Critical Damage. Zero adds 10 and 25 percentage points from Cutthroat; Premium Weapon Duplicate 4 doubles those passive bonuses. Each damage instance rolls independently, including AoE targets and multi-hit actions. Use `--seed` to reproduce crit rolls. Batch output includes average Critical Hits.

Lifesteal is another hidden stat and defaults to 0 for all units. Set `lifesteal` to a decimal rate (for example, `0.1` for 10%); `lifestealBonus` adds a rate bonus. Healing is based on actual HP damage after all damage modifiers, Shield absorption, and HP caps, including Barrier shatter HP damage but excluding Barrier damage. Healing is capped at the source's missing HP. Battle and batch output report Lifesteal healing by side, and ally `averageUnitStats` include healing per archetype. Logan's Taste for Blood adds his party Lifesteal aura; his Premium weapon echoes allied healing back to him.

Taunt effects are stored on the affected attacker as `{ "sourceId": "logan-1", "targetId": "logan-1", "rate": 0.5, "turns": 2 }`. Automatic primary-target selection checks candidate targets in descending Taunt rate order and falls back to the normal target if all rolls fail. Duration is measured in the affected attacker's turns. Explicit player-selected targets and AoE target sets are not changed by Taunt.

Shields are tracked as a separate per-unit total. New Shields add to the existing value and persist until combat ends or damage depletes them. Final damage is absorbed by Shield before HP; Barrier remains a separate enemy gauge. Lifesteal uses HP actually lost after Shield absorption. The sample Logan scenario demonstrates his team Shield, Taunt, Bleed, and Lifesteal support.

Supported Skill and Passive effect types:

- `enhanceBasic`: consumes available shared Skill Points before that unit's Basic. Configure added multiplier, Energy per stack, and the stack threshold that changes Basic to Blast (Premium Soul Weapon Duplicate 3 changes it to AoE).
- `followUp`: triggers once for each unique damaging action from another ally while charges remain. The source actor cannot trigger its own Follow Up. Each follow-up uses its own unit's stats; damage is shared evenly among surviving targets hit by the source action.
- `everyNthBasic`: on each Nth Basic by that unit, changes its target mode and applies its damage bonus. The counter is per unit.
- `bleed`: each successful hit applies `stacksPerHit` Bleed to the target, up to `maxStacks`. Bleed deals 2% of the target’s maximum HP per stack at the start of that target’s next turn. Wolf’s Ravage applies one stack per successful Basic hit, up to five.
- `momentum`: after each enemy Basic Attack action, increases later Basic Attack damage by `damageBonus` per stack, up to `maxStacks`. It adds a stack after resolving the attack; Geode uses a 20% bonus and a 10-stack cap, so its first attack uses base Attack and its tenth stack yields +200% Attack for later attacks.
- `ricochet`: models Lily's AoE Skill, one shared Skill Point cost, Energy gain, and two-turn marks. A damaging source action that hits a marked enemy triggers 10% additional True damage on all living Ricochet-marked enemies once per source action. Lily Duplicate 4 adds a second half-strength trigger.
- `exposed`: applies Lily's defense-reduction mark after her Skill, Ultimate, and Hauntling attacks. Each stack scales the target's damage reduction by 0.9; Lily Duplicate 2 can maintain two stacks for three turns.
- `resourceful`: Dawn's passive adds 2 to the shared Skill Point cap and starts the party with 2 extra Skill Points.
- `tune`: models Dawn's single-ally Skill, enhanced next Basic, Skill Point recovery, stat and defense effects, Premium weapon duplicates, and her support Ultimate. The simulator targets Soul with Tune when present; otherwise it targets the living ally with the strongest Basic. It advances only that selected ally for Tune and Ultimate.
- `pursuit`: after each Basic Attack, the Goblin advances its next action by 20%.
- `sharpClaws`: the Bear ignores 25% of both defenses when calculating its AoE True damage.
- `lifesteal`: heals the damage source for its configured fraction of final actual HP damage. It applies to allies and enemies, including simulated direct and follow-up damage. Shields absorb damage before Lifesteal is calculated.
- Bleed stacks from either side tick at the affected unit's next scheduled turn, dealing 2% of its Max HP per stack before one stack is removed. Five stacks is the default cap; `maxStacks` and `stacksPerHit` can be configured. Bleed is true damage, bypasses Barrier and defense, cannot crit, and is attributed to its applier (including Lifesteal). Shields absorb Bleed before HP. Wolf applies one stack with Ravage on each successful attack; Logan's Basic Attack and Ultimate also apply Bleed.
- `taunt`: redirects automatic targeting toward the taunter according to the active chance and duration recorded on the attacker.
- `bloodShield`: models Logan's Skill Point-consuming Blood Shield, which applies a Shield equal to the HP cost to each living ally, plus the current-HP cost and Taunt effect.
- `firstStrike`: models Zero's single-target Skill. Its `firstHitMultiplier` applies once per enemy per battle the first time Zero damages that enemy; later uses use `multiplier`. Both multipliers scale with the Skill Celestial.

Lily's Ultimate creates an independent Hauntling after its initial AoE. It acts immediately, then takes two more scheduled turns, dealing AoE True damage with Lily's stats. Duplicate 1 applies a one-turn 10% enemy damage reduction; Duplicate 3 doubles initial Ultimate damage and adds a Hauntling turn. Her Premium weapon effects are simulated, including Exposed energy recovery, Ultimate Skill Point recovery, barrier bonuses, start-of-battle Ricochet marks, and Duplicate 4's team energy and action advance.


Soul's `characterDuplicates` field (0–4) enables his four character Duplicate effects. With a Premium weapon, potential levels 2–5 correspond to weapon duplicates 1–4. Soul's Premium weapon refunds one shared Skill Point per three Enhance points spent, starting at Potential 1. The simulator models this effect, Soul's configured character and weapon duplicates (including Duplicate 2's critical bonuses), and configured Celestial levels. Dawn's `characterDuplicates` and Premium weapon potential model her Tune upgrades; weapon potentials 2–5 map to Premium Duplicates 1–4. Zero's character duplicates model Ultimate enemy delay, Basic and Ultimate damage, and First Strike multipliers; Premium Potentials 1–5 model the Ultimate Skill Point refund and weapon Duplicates 1–4.

The [Dawn team example](example-dawn-party-vs-slime.json) demonstrates her Resourceful passive, Tune, and support Ultimate alongside Soul and Lily. It also defines the Goblin and Bear archetypes so their stats and attack/passive behavior can be selected in a scenario.

## Output

The automated policy uses a ready Ultimate before that ally's next turn action, spends available shared Skill Points on supported skills (including Soul's Enhance, Lily's Ricochet, and Zero's First Strike), and has allies focus the lowest-HP enemy for single-target attacks. Enemies choose a random living ally. The batch summary reports win rate and confidence interval, action counts, damage, Skill uses, Follow Ups, Ultimates, AoE attacks, and survivors. `averageAllyDps` is allied damage divided by elapsed simulator time; one time unit follows the Speed rate formula and is not a real second. `averageUnitStats` contains role-tagged damage and support contributions by archetype; `averageUnitDetails` reports the same measurements per party instance. A battle reaching its action limit is counted as a draw.

Blast includes the primary target and enemies in adjacent formation slots, up to three total; enemy Blast targets adjacent allies. AoE hits all living targets. The simulator uses the game's stat scaling, typed damage reduction, follow-up distribution, shared Skill Point rules, and Speed rate formula. It schedules turns by each unit's rate and does not model canvas presentation, random encounter reinforcements, or status effects that are not represented by the supported ability handlers. Dawn's configured Ultimate and Premium Duplicate 3 advance its selected ally; Zero's Ultimate advances Zero and Character Duplicate 1 delays surviving enemies. Keep scenario archetypes aligned with the approved character and enemy sheets. Soul's Enhanced Basic uses Blast targeting, except Premium Weapon Duplicate 3 changes it to AoE; Ultimate uses AoE. Generic Attack stats are single values: True damage does not sum a duplicated Physical and Magical copy.

## Enemy Barriers

Enemy archetypes and instances may define `barrierPercent` from 0 to 1. The default is `0.2` (20% of max HP). Every hit deals its normal HP damage and an additional Barrier amount equal to 25% of the damage. Barrier does not mitigate HP damage. Breaking Barrier also deals one extra hit equal to 10% of enemy max HP and starts Broken state. Excess damage does not carry over to Barrier after recovery.

The example also defines the Common Wolf archetype with its Attack stat and Ravage Bleed passive. The default example encounter remains Soul vs Slime; change the enemy instance's `archetype` to `wolf` to simulate Soul vs Wolf.

Optional `reflectPercent` on an archetype or unit instance defines a unit's Reflect from `0` to `1`; omitted values default to `0`. Reflect is calculated from actual HP and shield damage, excludes damage dealt to enemy Barriers, and deals normal True damage to the attacker. It does not trigger from damage-over-time and resolves separately for each multi-hit. See the [Reflect Standard](../reflect-standard.md).

Broken enemies take 50% more damage and skip their scheduled turns. Duration is `max(1, round(enemyBaseTurns × clamp(2 − Speed / 100, 0.5, 1.5)))`; base turns use `max(1, enemy team average Speed / slower team average Speed)`; the individual enemy Speed adjusts its Broken duration. On recovery, the enemy fully cleanses debuffs and marks and restores Barrier to maximum. The simulator reports remaining Barrier and Broken turns for survivors, plus the total number of Barrier breaks.
