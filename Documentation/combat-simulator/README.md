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

`Documentation/combat-simulator/example-zero-vs-slime.json` provides a single-target Zero baseline. See the [Zero Character Sheet](../characters/zero.md) for current multipliers. Zero scenarios support Cutthroat Critical bonuses, per-enemy First Strike scaling, Physical Blast Basic attacks with Energy gain and shared Skill Point recovery, Ultimate self-advance and enemy delay, and configured character and Premium weapon duplicates.

## Standard character benchmark suite

Run the standard four-character encounter matrix with:

```sh
node tools/combat-simulator-benchmark.mjs --runs 1000 --seed 404
```

Run combat-engine parity and simulator mechanic coverage with:

```sh
node --test tests/combat-engine-parity.test.mjs tests/combat-simulator.test.mjs
```

Compare one duplicate or weapon effect while preserving the rest of the loadout with `--candidate upgrade:<effect-id>`. Use `--candidate all-upgrade-effects` to enumerate the shared tagged catalog. The control branch disables only the selected effect and retains the same duplicate rank or weapon potential as its treatment branch.

The parity checks ensure the live game and runner import the same engine and combat sheets, sample scenarios stay aligned with canonical data, and shared handlers resolve authored actions, enemy passives, damage sequences, character effects, resources, Runes, and battle outcomes. They verify shared-runtime parity; they do not assert that a UI-controlled battle and an AI-controlled simulation choose identical actions.

The suite compares a one-bar boss, two- and three-bar boss HP benchmarks, a boss with two Elite adds, five Slimes, and three each of the Common and Elite enemies (Wolves, Hawks, Goblins, and Geodes). Pass `--config path/to/full-party.json` to use another party and its enemy archetypes. `--json` emits the full reports. Every result includes a 95% confidence interval for win rate so small batches do not look more certain than they are.

Add a `role` to each character archetype (`mainDps`, `subDps`, `support`, `sustain`, or a project-specific label) to group its results by intended job. Per-character reports separate direct damage, Bleed, Follow-up, Ricochet, summon, Echo, and Reflect damage; they also report Tune damage added, Shield granted, received, and absorbed, HP spent, Lifesteal healing, survival, Skill Point spend and generation, Tune use, action advances, and taunt redirects. These metrics describe what each kit contributes. Do not rank supports by damage alone.

The benchmark's enemy targeting and ally action policy are automated approximations, not a player-optimal strategy. A 2- or 3-bar scenario multiplies boss HP without modeling bar transitions. Compare several encounter types and inspect role-specific effects before changing a kit. Add a regression assertion for every newly supported character mechanic so future simulator changes cannot silently omit it.

Use the [Action Value Standard](../action-value-standard.md) when comparing abilities, Runes, passives, or stat investments. Shared benchmark stats and Single/Blast/AoE multipliers come from `COMBAT_PERFORMANCE_STANDARD` in the combat definitions. The runner compares damaging actions against the matching slot and coverage reference, and reports that reference with each result. It also defines the 16-HP Baseline Action Equivalent, candidate-anchored four-character parties, five enemy counts, three enemy class bands, Easy/Normal/Hard enemy stat multipliers (0.75×/1×/1.5×), and counterfactual win-rate Action Value.

## Standardized performance runner

The benchmark contract and rating interpretation are documented in the [Character Performance Benchmark Standard](../character-performance-benchmark-standard.md). The runner discovers its character, enemy, and Rune catalogs from authored combat definitions, uses four-character parties, stratifies sampled scenarios by enemy count/class band and Easy/Normal/Hard difficulty, and emits coverage counts and separate seed/scenario intervals. Use `--candidate all-characters` for actual-kit character win rates and tagged ability event evidence. Use `--candidate all-character-mechanics` for separate passive, action, and effect studies. The character gauge does not compare against a disabled-kit character. The default `--policy ensemble` runs `basic-focused-v1` (75% Basic/25% Skill), `skill-focused-v1` (25% Basic/75% Skill), and `mixed-v1` (50%/50%) on matched scenarios/seeds. These policies receive 25%, 25%, and 50% of the headline policy weight. A ready Ultimate is independently checked on every scheduled combat turn for each living ally, with a 75% activation chance; casting it does not consume the scheduled actor's normal Basic/Skill action. The report also lists each policy score and the spread.

Character studies use the scenario cap for each focal character, so the total number of scenario cells grows with the roster. The report shows the total and each character's coverage. This keeps candidate panels equally sized while allowing coverage to scale as characters are added.

Run the balanced, reproducible paired comparison for every Rune and each eligible wearer:

```sh
node tools/combat-performance.mjs --candidate all-rune-impact --preset balanced
```

Candidate examples include `all-runes`, `all-weapons`, `character:soul`, `weapon:premium@P1L50`, and `action:dawn/ultimate`. Rune passive reports compare each eligible character's no-Rune baseline with the same character using only the selected four-piece set passive. Rune main stats and substats are disabled in both branches; the paired full-party matchups, policies, difficulty weights, and seeds are held constant. The by-wearer report includes every character/Rune pairing; incompatible pairings are marked `ineligible` with N/A scores, not zero. Eligibility is based on whether the authored kit has a triggerable action (for example, Radiant Moon requires a damaging Skill). The report shows the before/after 0–100 battle outcome rating, rating difference, win-rate lift, BAE, and event-tag evidence. Conditional trigger frequency is also available in the JSONL `runeDiagnostics` fields. Use `--character` to restrict the study to one wearer. Omit `--limit-scenarios` to use the selected preset's sample size (100 balanced scenario cells per wearer); pass `--limit-scenarios 0` to enumerate the complete full-party matrix. The complete matrix has 3,358,800 scenario cells before candidate and trial multipliers, so exhaustive runs are large batch jobs.

Use `--candidate all-effects` or `--candidate effect:<stable-effect-id>` to measure a support outcome by disabling only that effect in the control while forcing the same action in both branches. The catalog records its mechanic tags, trigger, targeting, and numeric measures; the JSONL includes resolved event values and selectable ally target coverage. `--candidate action:<character>/<skill-or-ultimate>` separately compares the action against its ordinary Basic alternative. Current catalogued support outcomes include Dawn’s Tune and Ultimate effects and Logan’s Blood Shield and Taunt. Add new support outcomes to `COMBAT_EFFECT_CATALOG` and route their shared engine resolver through the effect gate and event recorder before including them in the balance suite.

The runner pairs treatment/control battles by seed, measures outcome changes and event evidence, and writes detailed JSON Lines, a stratified CSV, an SVG chart, coverage CSVs, score CSVs, and a Markdown benchmark report. Combat outcomes score 100 for an ally victory or 0 for an enemy victory. Reaching the simulator's action limit is recorded as an incomplete timeout, counted as a non-win, and reported separately. The headline score weights Easy/Normal/Hard results 25%/50%/25%; within each difficulty, it weights Basic-focused/Skill-focused/Mixed policies 25%/25%/50%, while keeping enemy-class bands equally represented. The report separates seed uncertainty from scenario-resampling uncertainty and lists missing categories. Inspect per-policy scores, their spread, coverage, and per-stratum results before a balance change.

Presets are `quick` (up to 50 sampled scenarios × 5 seeds per policy), `balanced` (up to 100 × 10, the default), and `full` (up to 150 × 15). All presets cover the 45 enemy-count/class/difficulty design strata; quick samples each about once, balanced about twice, and full about three times. Their worker defaults are 1, 2, and 3 respectively, capped by available parallelism; `--workers <n>` overrides the preset. Full character studies reuse identical seeded four-person battles across the character panels that share them. These are standard samples, not exhaustive enumeration of every possible lineup. Use `--limit-scenarios 0` only for exhaustive offline enumeration. Independent battles run in a bounded worker pool. Use `--no-character-cache` to compare an uncached character-panel run. Use `--max-actions 2000` to set a battle limit, or `--help` for options. Re-running with the same config, policy, and seed produces the same batch.

The game supports integer enemy Levels 1–50, with all five base stats scaling by Level. Performance benchmark difficulties scale the Level 1 enemy stat line uniformly: Easy ×0.75, Normal ×1, Hard ×1.5, rounding to the nearest 0.25. No separate encounter-length, HP, Attack, or Defense multipliers are applied; mechanics stay the same. See the [Enemy Level Standard](../enemy-level-standard.md).

The [November 19 four-person policy comparison](../../Archive/combat-simulator/character-policy-comparison-2026-11-19.md) records the previous benchmark version. New Level-scaled ensemble runs write per-policy scores and policy spread alongside the ensemble result.

## Scenario structure

Each scenario defines stat and ability archetypes, then creates team instances by referencing those archetypes. Instance IDs must be unique; archetypes may be repeated, so a scenario can model five Soul instances without duplicating their definitions.

Archetypes provide one `attack` stat alongside HP, defenses, and Speed. Every damage type uses the full Attack value; the action's damage type selects the target defense. All characters and enemies use this same Attack stat. Every archetype uses the simulator's level scaling for levels 1–50. Final stats follow:

`round(((base + non-equipment flat modifiers) × level + equipment flat modifiers) × (1 + percentage modifiers))`

Rune equipment flats are applied after Level scaling; signature weapon percentage bonuses apply after both. Calculated stats round to the nearest 0.25 after all stat modifiers are applied; damage and HP changes continue to round to whole HP. Enemy level growth is defined by the [Enemy Level Standard](../enemy-level-standard.md); the live Slime encounter uses authored Level 1 stats. Teams are listed as `teams.allies` and `teams.enemies`. The shipped Soul vs Slime example is a focused 1v1 baseline, not a full four-character party benchmark.

Optional `stealth` on an archetype or unit instance sets its hidden dodge chance from 0 to 1 (`0.5` is 50%); omitted values default to 0. Each positive-damage hit rolls independently per target before Critical Rate. A successful dodge prevents damage and effects triggered by that hit. See the [Stealth Standard](../stealth-standard.md).

Optional `weapon` settings accept `type: standard|premium`, `potential: 1–5`, and `level: 1–50` (default 1). The percentage applies to all defined combat stats. Standard Potential `P` grants `(31 + 5 × (P − 1) + (level − 1))%`; Premium grants `(51 + 25 × (P − 1) + (level − 1))%`. Optional `runes` are limited to four per unit. Each rune defines `level` 1–5, one `main` stat, three unique `subs`, and an optional `setId`; main values are HP 100, Attack/Speed 20, or defense 4 per rune level, and substats contribute 25%. Runes may be mixed; a set effect activates only when all four slots have the same `setId`. All nine Rune Set effects from the [Rune Set Standard](../rune-standard/rune-standard.md) are modeled. Optional `echoPercent` on an archetype or unit instance defines that unit's Echo source from `0` to `1`; omitted values default to `0`. Echo is resolved per direct hit and target, bypasses defenses, and is excluded from damage-over-time ticks, as specified in the [Echo Standard](../echo-standard.md). Optional `celestials` maps `passive`, `basic`, `skill`, and `ultimate` to levels 1–10 (default 1); each level adds 10% of that ability's base multiplier. Character duplicates, signature effects, and Premium weapon duplicates are defined in the shared tagged upgrade-effect catalog.

Supported attack damage types are `physical`, `magical`, and `true`. True Damage uses the full Attack stat. Its defense reduction combines half of the Physical and half of the Magical defense contribution. Effective defenses may fall below zero; negative defense increases damage, with damage capped at 2× after defense for each hit. Basic and Ultimate attacks define a multiplier and target shape (`single`, `blast`, or `aoe`). `random` and `lowestHp` are primary-target selection policies. Allies default to 40 starting Energy and enemies to 0; `energy.start` or an instance `energy` can override this. Energy is capped at 120 by default.

All simulated units default to 10% Critical Rate and 50% Critical Damage. These are hidden stats. An archetype or instance may override them with `critical: { "rate": 0.25, "damage": 0.75 }`; `criticalRateBonus` and `criticalDamageBonus` add temporary or other source bonuses. Soul's Premium Weapon Duplicate 2 adds 10 percentage points of Critical Rate and 25 percentage points of Critical Damage. See the [Zero Character Sheet](../characters/zero.md) for Cutthroat and Nightshade effects. Each damage instance rolls independently, including AoE targets and multi-hit actions. Use `--seed` to reproduce crit rolls. Batch output includes average Critical Hits.

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

The automated policies use seeded probability rolls for Basic-versus-Skill choices, with the action probabilities and Ultimate activation rule defined in the shared combat standard above. Single-target attacks focus the lowest-HP enemy; enemies choose a random living ally. The batch summary reports win rate and confidence interval, action counts, damage, Skill uses, Follow Ups, Ultimates, AoE attacks, and survivors. `averageAllyDps` is allied damage divided by elapsed simulator time; one time unit follows the Speed rate formula and is not a real second. `averageUnitStats` contains role-tagged damage and support contributions by archetype; `averageUnitDetails` reports the same measurements per party instance. A battle reaching its action limit is recorded as incomplete and reported separately from completed wins/losses.

Blast includes the primary target and enemies in adjacent formation slots, up to three total; enemy Blast targets adjacent allies. AoE hits all living targets. The simulator uses the game's stat scaling, typed damage reduction, follow-up distribution, shared Skill Point rules, and Speed rate formula. It schedules turns by each unit's rate and does not model canvas presentation, random encounter reinforcements, or status effects that are not represented by the supported ability handlers. Dawn's configured Ultimate and Premium Duplicate 3 advance its selected ally; Zero's Ultimate advances Zero and Character Duplicate 1 delays surviving enemies. Keep scenario archetypes aligned with the approved character and enemy sheets. Soul's Enhanced Basic uses Blast targeting, except Premium Weapon Duplicate 3 changes it to AoE; Ultimate uses AoE. Generic Attack stats are single values: True damage does not sum a duplicated Physical and Magical copy.

## Enemy Barriers

Enemy archetypes and instances may define `barrierPercent` from 0 to 1. The default is `0.2` (20% of max HP). Every hit deals its normal HP damage and an additional Barrier amount equal to 25% of the damage. Barrier does not mitigate HP damage. Breaking Barrier also deals one extra hit equal to 10% of enemy max HP and starts Broken state. Excess damage does not carry over to Barrier after recovery.

The example also defines the Common Wolf archetype with its Attack stat and Ravage Bleed passive. The default example encounter remains Soul vs Slime; change the enemy instance's `archetype` to `wolf` to simulate Soul vs Wolf.

Optional `reflectPercent` on an archetype or unit instance defines a unit's Reflect from `0` to `1`; omitted values default to `0`. Reflect is calculated from actual HP and shield damage, excludes damage dealt to enemy Barriers, and deals normal True damage to the attacker. It does not trigger from damage-over-time and resolves separately for each multi-hit. See the [Reflect Standard](../reflect-standard.md).

Broken enemies take 50% more damage and skip their scheduled turns. Duration is `max(1, round(enemyBaseTurns × clamp(2 − Speed / 100, 0.5, 1.5)))`; base turns use `max(1, enemy team average Speed / slower team average Speed)`; the individual enemy Speed adjusts its Broken duration. On recovery, the enemy fully cleanses debuffs and marks and restores Barrier to maximum. The simulator reports remaining Barrier and Broken turns for survivors, plus the total number of Barrier breaks.
