# Action Value Standard

## Purpose

Use actual in-game stats and the shared battle engine to define comparable combat tests. The simulator reports a **0–100 Outcome Rating** as an easy-to-read summary, while retaining win rate, paired win-rate change, HP swing/BAE, and mechanic evidence as separate diagnostics. The rating is an average benchmark battle result, not a synthetic stat budget or a standalone measure of character power.

**Validity note:** The game and runner now call the [shared combat engine](combat-engine-standard.md), and parity checks guard their shared definitions and core handlers. Scores remain provisional until coverage includes paired in-game and headless outcomes for every supported action/effect family; identical engine imports alone do not prove end-to-end parity.

Ability-effect tagging and the current mechanic vocabulary are standardized in [Combat Mechanic Tags](combat-mechanic-tags.md). The evaluator should use those tags and per-effect target/trigger metadata to measure ally support, enemy debuffs, resources, and damage without character-specific assumptions.

### Tag-driven evidence and component scoring

The evaluator builds a measurement plan from each candidate's authored tags, targeting, triggers, and stable component IDs. For every paired control/treatment battle, the shared battle engine records bounded, source-attributed mechanic events. Evidence is grouped by the candidate's own component IDs and tag, so another ability using the same tag cannot falsely count as the candidate firing. Component IDs use `passive:<character>/<id>` for passives and `action:<character>/<slot>` for Basic Attacks, Skills, and Ultimates. Tags explain the observed effect; the Outcome Rating summarizes benchmark outcomes; paired win rate and HP/BAE remain separate diagnostics.

Each event records a stable component ID, canonical mechanic tags, trigger, resolution status, actor, affected targets, optional combat event/action IDs, and numeric resolved values (such as damage, healing, shield, Energy, Skill Points, or action movement). The live game and headless runner emit events through `TwoToneBattleEngine`, so attribution follows shared combat resolutions rather than a second simulator-only interpretation. Event collection is capped at 10,000 events per battle; reports disclose dropped events and mark the evidence as truncated instead of treating missing evidence as zero.

For each tag in a candidate's measurement plan, reports show the relevant fields, authored target/trigger/coverage, component-level control-to-treatment event/value deltas, and one of these evidence states:

- **Event observed:** the tagged component resolved in at least one paired branch. A zero delta means it resolved equally; it does not mean the mechanic has no value.
- **Tagged but not triggered:** the matchup did not produce a matching event. This is matchup evidence, not a zero score for the mechanic.
- **Capture truncated:** the per-battle ledger reached its cap; event totals may be incomplete and must not be interpreted as full coverage.

Use these events to explain what the component did and to identify whether required triggers, target types, or coverage were exercised. Continue to show non-event aggregate outcomes (win rate, surviving HP, action counts and resources) because a single status application is not itself proof of combat value. Equal scenario weighting and repeated seeds are the character-gauge fairness controls; paired counterfactuals remain for focused component studies.

## Actual stat lines

The five baseline stats (HP, Attack, Physical Defense, Magical Defense, and Speed) define each character and enemy as authored. Keep those actual values visible in a matchup report. Their combat value is determined by how the shared battle engine resolves them across matched scenarios; do not merge unlike stats into a synthetic budget.

When testing a stat change, compare the exact proposed stat line with the unchanged line in the same battle states, using the same seeds and coverage. Do not normalize different stat changes into one score.

## Shared performance baseline

Use this reference stat line when describing the game's baseline scale:

| HP | Attack | Physical Defense | Magical Defense | Speed |
|---:|---:|---:|---:|---:|
| 100 | 20 | 4 | 4 | 20 |

The reference damage multipliers for damaging actions without action-specific effects are:

| Action | Single | Blast | AoE |
|---|---:|---:|---:|
| Basic Attack | 1.0× | 0.75× | 0.5× |
| Skill | 2.0× | 1.5× | 1.0× |
| Ultimate | 3.0× | 2.25× | 1.5× |

The shared definitions export this table for the performance runner and combat simulator. It is a benchmark, not a replacement for authored character stats: battle comparisons use the wearer's actual stats in both branches. Damage type selects the matching defense as usual.

## HP impact reference

Use one reference action to express combat impact in HP terms: a non-critical, single-target, 1.0× hit from 20 Attack against 4 matching Defense. Under the current damage formula, it deals 16 HP.

One **Baseline Action Equivalent (BAE)** is 16 HP of favorable HP swing. For a treatment and its counterfactual baseline, calculate:

`HP swing = (enemy HP removed by treatment − enemy HP removed by baseline) + (ally HP retained with treatment − ally HP retained with baseline)`

`HP swing in BAE = HP swing ÷ 16`

This is a diagnostic alongside action value. Include all damage sources attributed by the simulator (direct, DoT, Follow-up, Ricochet, summon, Echo, and Reflect). Actual ally HP retained captures HP damage prevented by Shields, healing, and shortened fights; also report Shield absorption separately to show how it happened. Do not count unused Shield capacity as damage prevented.

Recalculate the 16-HP reference if the game's damage formula or the reference stats change. BAE is an explanation scale; it does not replace the win-rate measure.

For **Clear Skies**, while its Rune shield is active, add 10 percentage points to the wearer's Reflect chance/value: `effective Reflect = base Reflect + 0.10`. This is additive, not a 10% multiplier; a wearer with 0% base Reflect therefore has 10% Reflect while shielded. Resolve the reflected hit as true damage and include its realized HP swing in BAE.

## Action Value

Action Value (AV) is the change in win probability caused by choosing an action instead of its standard alternative from the same combat state:

`AV(action | state) = P(win | actual action) − P(win | standard reference action)`

Report AV in **percentage points**. For damaging actions, the control uses the reference multiplier for the same action slot and Single/Blast/AoE coverage, with the same damage type and wearer stats, but without that action's authored effects. For example, a 0.5× AoE Skill is compared with the 1.0× AoE Skill reference; a 1.0× AoE Ultimate is compared with the 1.5× AoE Ultimate reference. Non-damaging/support actions use the wearer's standard Basic Attack reference as the action alternative. The report records which reference it used.

The standard Basic Attack reference grants 1 Skill Point and preserves that character's authored Basic Energy gain. The standard Skill reference spends 1 Skill Point and restores 10 Energy. The standard Ultimate reference costs 100 Energy. These are baseline resource rules; an authored action may have additional effects or different gains. Reference actions are effect-free damage benchmarks, not simulated authored Skills or Ultimates. Each benchmark consumes the same scheduled turn. The treatment resolves the actual action, its real resource costs and gains, its authored effects, and any downstream passives. This makes the comparison measure the action package against the shared baseline, not just compare printed multipliers.

The two branches must start from the same state and use the same encounter, target-selection policy, remaining team policy, and paired random seeds. Both branches consume the actor's scheduled action. Resolve the candidate action's full consequences—including damage, effects, resource costs, triggered passives, action advances, and later turns—before comparing win rates. This makes the AV include downstream consequences rather than only the action's immediate damage.

For an effect that is not an action choice, use the matching counterfactual:

- **Rune or passive:** effect enabled versus disabled, with the same action policy.
- **Action advance or delay:** effect applied versus omitted.
- **Stat change:** the exact proposed stat line versus the unchanged unit.

Compare those branches from the same starting state and report their win-rate difference in percentage points. Do not compare a Rune's effect to a Basic Attack if the Rune does not replace an action.

AV depends on the state and matchup. Report the per-scenario result and the character/action breakdown. A pooled result must state its encounter weights. Until play-frequency data is available, weight the defined benchmark scenarios equally and keep Easy/Medium/Hard, Common/Elite/Boss, single/multiple-target, and Short/Medium/Long results visible separately.

Combat has no draw. A battle that reaches the simulator's action cap is marked incomplete, counts as a non-win in the headline win rate, and is reported separately as a timeout. Incomplete battles do not receive an invented midpoint score.

AVs from different actions are not additive: an action can change which later actions are available, who survives, and whether the battle has already been won. Use a full-battle enabled/disabled comparison for the total value of a Rune or character kit rather than summing per-action AVs.

### Valuing character components

Use a paired counterfactual suited to the component; do not give every component the same artificial damage-only baseline:

- **Passive:** enable one passive versus disable only that passive. Preserve the character's stats, Basic Attack, Skills, Ultimate, equipment, and all other passives. Resolve the full battle so team-wide effects such as Follow-ups, Lifesteal, resource capacity, buffs, and mitigation count.
- **Basic Attack:** compare it against the shared Basic reference for the same Single/Blast/AoE coverage, using the same wearer's stats and damage type. The reference grants 10 Energy and 1 Skill Point. Also report realized value per use and across the full battle: damage pattern and type, BAE, target count, Energy/Skill Point changes, and triggered effects.
- **Damaging Skill and Ultimate:** compare against the shared multiplier reference for that action slot and coverage. **Non-damaging/support Skill and Ultimate:** compare against the wearer's standard Basic Attack reference. Give both branches the same starting battle state and paired seed; include actual resource costs/gains, effects, triggered passives, and downstream turns in the treatment outcome.
- **Full character kit:** report as a separate synergy comparison against the same character's passive-free, Basic-only control. Do not use this aggregate to attribute value to an individual passive, Skill, or Ultimate.

For each component, use the balanced scenario matrix, paired seeds, equal formation/composition/stratum weights, and equal wearer weights where pooling is appropriate. Show per-character and per-scenario results before the pooled result. Record win-rate change and BAE/HP swing together with relevant effects and resources—damage by source, buffs applied/consumed, shields granted/absorbed, healing, action changes, Energy, and Skill Points. For an effect with no damage, such as capacity or action manipulation, BAE may be zero while win-rate or resource value is positive; do not label it worthless from BAE alone.

### Support, debuff, and non-damage value

Use the same paired full-battle comparison for effects that help allies or weaken enemies. Keep the battle state, AI/action policy, target policy, and random seed the same; enable the effect in the treatment and disable only that effect in the control. Let both branches continue to battle end. This naturally counts a buff or debuff through every later hit, and counts mitigation when it prevents a defeat.

For each pair, record the win-rate change and HP swing, then show these supporting deltas (treatment minus control):

- Enemy HP removed and allied damage dealt, split into direct, bleed, follow-up, ricochet, summon, Echo, and Reflect damage, so ally buffs and enemy vulnerability can be seen even when the effect itself deals no damage.
- Allied HP retained and damage taken, plus healing, shields granted, shields absorbed, and remaining shield, to show protection and recovery.
- Skill Points and Energy gained, granted, spent, and remaining; allied/enemy turns; and action advances, to show resource and turn-economy effects.

Interpret each delta in its own direction: more enemy HP removed, more allied HP retained, more healing/shielding/resources, and fewer enemy turns generally help; less allied damage taken is favorable. Allied turns are context, not automatically a benefit; extra turns can help, while a longer battle can also create extra turns. These fields explain *how* the result changed. They are not extra scores to add together: damage dealt overlaps enemy HP removed, and shields/healing can affect final HP and win rate. HP swing remains the single HP-based BAE measure; paired rating and win-rate changes show outcome impact. A support effect can therefore be valuable with little personal damage, and a debuff can receive credit for damage allies deal while it is active.

The runner provides `--candidate all-passives`, `--candidate all-actions`, and `--candidate all-character-mechanics` for individual component studies. These commands report Outcome Ratings, paired rating and win-rate changes, and supporting combat deltas; they do not append unrelated stat candidates. Individual passive comparisons disable only the selected passive in the control. Action comparisons use the matching slot/coverage multiplier reference when the action deals damage, otherwise the standard Basic Attack reference. Whole-character ratings use actual kits without a disabled-abilities control; their tagged event evidence describes what happened during the real-kit battles. Each paired component trial records supporting impact deltas in JSONL; the stratified CSV includes core damage, survival, healing, shield, resource, and turn deltas. These are controlled first-action/full-battle component comparisons under the documented policies, not estimates of optimal player choices.

## Balanced Scenario Matrix

Give every eligible character, Rune, and weapon the same scenario coverage and comparison budget. A candidate is compared only in legal configurations where its wearer is present; an incompatible Rune/character pairing is marked **N/A**, never scored as zero.

### Roster coverage

- **Ally teams:** Use only full parties: all ordered lineups of four distinct characters from the five-character roster. This gives 120 legal lineups. Each focal character appears in 24 formations, with the other three slots rotating through all teammate combinations and orders.
- **Enemy lineups:** Use every ordered lineup of one to five enemies from the six archetypes. Repeats are allowed. This gives 9,330 lineups and includes all 461 underlying enemy compositions. It exhaustively balances each enemy's slot and each ordered adjacency/Blast arrangement.
- **Enemy Levels:** Test every lineup at Levels 1, 2, and 3. Enemies use the character curve: every authored Level 1 stat, including Speed, is multiplied by Level and rounded to the nearest 0.25. Enemy mechanics stay unchanged. See the [Enemy Level Standard](enemy-level-standard.md).
- **Encounter length:** The benchmark does not multiply HP to force short, medium, or long fights. It reports actual action and turn counts; enemy count, identity, class, and Level define each encounter profile.

The complete position-aware full-party matrix has 120 ally lineups × 9,330 enemy lineups × three enemy Levels = **3,358,800 scenario cells**, before candidate variants and paired trials. This is intentionally a large offline analysis. A limited pass supports implementation checks and early exploration; it is not a substitute for complete coverage.

### Candidate coverage and weighting

- A character or character-bound item is tested in every legal ally team containing its wearer. Every character appears in the same number of teams. Weapons are compared on their intended wearer at matching level and potential; potential/duplicate progression is a separate comparison axis. Hold character level and all non-candidate equipment constant between each candidate and control.
- Test each Rune on every character whose kit can activate it. Report each compatible wearer separately, then give compatible wearers equal weight in a Rune summary. Do not let a Rune with fewer eligible wearers appear weaker because incompatible pairings were counted as zeros.
- Keep results visible by four-person teammate formation, enemy team size, enemy identity/category, and Level. Average paired trials within a formation, formations within the same unordered party/enemy composition, and then compositions equally within each reported stratum. Do not pool all individual battles into one average, since compositions with more distinct orderings would otherwise dominate. For Rune summaries, also average compatible wearers equally after computing each wearer's score.
- Use the same scenario list, policy ensemble, target-selection rules, and paired seeds for every candidate/control pair. Keep item effects isolated for the balance comparison; test mixed Rune or weapon builds separately as player-build scenarios.

### Two-pass simulation

1. **Coverage pass:** exercise every composition/Level cell and required formation rotation with the candidate and its control. Confirm that no eligible character or enemy is missing. Use focused trigger scenarios to verify mechanics whose activations are rare or unlikely in a particular encounter cell.
2. **Balance pass:** choose one matched-seed trial count before the comparison and use it for every candidate/control pair in a stratum. If the predeclared confidence target is not met, rerun that whole stratum with a larger shared trial count and fresh output files; do not leave candidates with different sample counts. Reuse baseline results only when the configuration and seed set are identical.

The coverage pass checks representation, not balance precision. The balance pass supplies win-rate estimates and confidence intervals. Preserve both results so a small average cannot hide a character-, enemy-, formation-, or Level-specific effect.

The executable runner is [`tools/combat-performance.mjs`](../tools/combat-performance.mjs). It pairs baseline and treatment battles on the same seed, writes scenario-level JSON Lines, and creates a summary CSV that equal-weights distinct four-person party/enemy compositions after averaging formations. Every character performance panel uses a four-member party with the focal character present; the other three members rotate across available teammates. Enemy count (1–5), enemy class band, and enemy Level form the scenario strata. The report includes each enemy's authored and effective Level stats, so a Level 2 Bear is distinguishable from Bear's authored Level 1 stats.

The simulator resolves each Skill's modeled effects, including damage, ally buffs, shields, taunt, resource costs, and triggered effects. The character benchmark uses three generic probability-based policies: Basic-focused chooses Basic 75%/Skill 25%, Skill-focused chooses Basic 25%/Skill 75%, and Mixed chooses Basic/Skill 50%/50% when a Skill is available. These run on matched scenarios and seeds. A ready Ultimate is checked for each living ally on every scheduled combat turn, with a 75% chance to activate; an Ultimate does not replace the scheduled actor's normal action. These are reproducible probes, not player-optimal behavior. A negative resource or support result must be traced through the full action, target, resource, damage, and protection sequence before attributing a cause.

Use the runner presets to avoid rebuilding long command lines: `quick` runs 23 sampled strata × 5 paired seeds under each policy; `balanced` (the default) runs all 45 strata × 10 under each policy; `full` runs 90 cells × 20 under each policy. Full samples each current stratum twice. “Full” means the full standard sample, not exhaustive enumeration. `--limit-scenarios 0` explicitly requests the exhaustive 3,358,800-cell four-person matrix and is an offline batch. Use the same preset and policy for every candidate in a comparison. The runner caches the identical no-set Rune control once per wearer, matchup, and seed, and reuses it across that wearer's Rune candidates. Rune branches clone only mutable team data. This changes runtime and memory use, not the matched comparison or sampling weights. Output folders are created automatically, and compact per-cell summaries are the default; `--include-trials` writes individual seed records.

### Outcome Rating (0–100)

Combat has no draws. A completed battle scores **ally victory = 100** or **enemy victory = 0**. A battle stopped by the simulator action limit is marked incomplete, counted as a non-win, and reported separately as a timeout. The character Outcome Rating averages policy win rates using Basic-focused 25%, Skill-focused 25%, and Mixed 50%; it then weights Easy, Normal, and Hard enemy difficulty 25%, 50%, and 25% within each enemy-class band. Represented enemy-class bands are averaged equally. Seed and composition averaging happen within each applicable policy/difficulty/class cell so larger groups of lineups or more repeated trials do not dominate the score.

Reports show both the treatment Outcome Rating and the control Outcome Rating, plus their difference in rating points. The rating says how the tested team performed across this fixed mix of battles. The paired rating difference estimates what the tested mechanic, action, or kit added against its stated control. It is not an intrinsic “power” number: the benchmark roster, action policy, encounter profiles, and scenario weights are part of its meaning. Always read it beside win rate before/after, win-rate percentage-point change, HP swing/BAE, and mechanic-specific evidence.

Whole-character scores are actual party win rates with the authored character kit. The benchmark does not use a disabled-kit control for these scores. Passive and effect studies suppress only the tagged effect in their control; action studies compare the requested action with its standard action alternative. Action ratings are conditional on successful execution, with execution rate and all-opportunity realized impact reported separately. No eligible comparison is **N/A**, not zero. The same rating is emitted for Rune and weapon comparisons, with eligible wearers averaged equally.

The policy and difficulty weights are benchmark conventions, not estimates of how often players use each policy or how often each difficulty occurs in live play. The rating confidence interval describes variation across matched random seeds and sampled compositions; the report also shows individual policy scores and their spread. Treat `quick` as a screening pass, `balanced` as a stronger comparison, and `full` as the broad standard sample; confirm suspected balance issues across strata or with exhaustive coverage before changing game values.

### Rune impact comparison

Run `node tools/combat-performance.mjs --candidate all-rune-ratings --preset balanced` to compare each Rune with the same wearer, four Rune stat rolls, matchup, and seed while the four-piece effect is disabled in the control. The treatment enables only that Rune effect. Report Outcome Rating before/after/difference, paired win-rate change and interval, BAE/HP swing, eligibility, and wearer-specific results. Weight the standard scenario strata and compatible wearers equally.

Character-mechanic reports give the 0–100 treatment Outcome Rating and its rating-point difference from control, alongside paired win-rate change with a 95% interval, BAE, effect tags, and measured support/resource deltas. The interval summarizes paired seeds over the fixed sampled scenario set; it does not make a limited preset exhaustive. A result is classified as **positive evidence**, **negative evidence**, or **inconclusive** from the win-rate interval; no eligible comparison is reported as **N/A**, not zero. This prevents a negative estimate, a missing trigger, or a low sample from masquerading as “no performance.” Full-kit comparisons use every sampled battle; per-action ratings condition on the requested action actually executing and separately report execution rate and all-opportunity realized results.

## Support-effect and action-choice comparisons

Support abilities are evaluated in two separate paired comparisons so that their effect is not confused with the choice to spend a turn or a resource:

1. **Effect impact:** keep the same ability, actor, action timing, target, action cost, Energy/Skill Point changes, party, enemies, policy, and random seed in both branches. The control suppresses only the selected, catalogued effect ID; the treatment enables it. Other action consequences remain active in both branches. Compare full-battle win rate, HP swing/BAE, and the relevant damage, shield, healing, resource, and turn outcomes. This answers “what did this effect add?”
2. **Action choice:** compare using the actual Skill/Ultimate with taking the standard Basic Attack alternative on the same first turn. Use the standard slot and target-coverage damage reference when the ability deals damage; for a non-damaging ability, the actual resolved ally/enemy support effects remain in the treatment and the Basic is the alternative. Keep each action’s authored costs and gains intact. This answers “was taking this action better than the ordinary alternative?”

The two results answer different questions and must be reported separately. The Outcome Rating makes benchmark outcomes easy to read, while the paired rating and win-rate differences show what the action or effect added over its control. BAE/HP swing and engine-recorded mechanic events explain the observed change. A useful effect can have low direct damage if it instead prevents damage, provides resources, or improves another unit’s action.

### Effect metadata and target coverage

Every independently measurable support effect declares a stable unique ID, canonical mechanic tags, trigger, targeting metadata, and numeric `measures` beside the authored ability in `COMBAT_EFFECT_CATALOG`. This applies to beneficial or protective outcomes whether they come from a Skill or Ultimate, and whether they affect one ally, multiple allies, or the user. Runtime effect resolvers check the shared battle engine’s `isCombatEffectEnabled(effectId)` gate and report resolved magnitude with `recordCombatEffect`. The performance runner disables only that ID in the control and reports its engine event evidence; missing event evidence is surfaced as not triggered or not applied, never silently interpreted as zero value. A compound ability should declare separate effect IDs when its outcomes need to be isolated independently; effects that are intentionally one indivisible package can share one ID.

For a selectable single-ally effect, matched seeds cycle the chosen target across every eligible ally in the party in both branches. The JSONL result includes target coverage counts. Team-wide or enemy-targeted effects use their authored coverage. Add future abilities to the catalog and route their runtime handler through the same effect gate to make them eligible for `--candidate all-effects` and `all-character-mechanics` without adding character-specific scoring rules.

The current catalogued support outcomes are Dawn’s `dawn.tune.support`, her Ultimate’s separate energy restore, action advance, and Skill Point grant, and Logan’s team shield/health sacrifice and enemy taunt. Each record declares exactly which resolved values are reported, such as buff percentage, Energy received, shield amount, taunt chance, or action advance. These can be measured independently. For each selected single-ally action/effect, matched seeds cycle the chosen target across eligible allies in the party in both branches; the JSONL result includes target coverage counts. The action’s own cost, Energy gain, and turn consumption remain in place when an effect is suppressed. Run `node tools/combat-performance.mjs --candidate all-effects --preset balanced` for effect-impact comparisons, and `--candidate action:dawn/skill --preset balanced` for Dawn’s action-choice comparison. `--candidate all-character-mechanics` includes the per-effect rows, actions, and passives.

Run `node tools/combat-performance.mjs --candidate all-character-mechanics --preset balanced` to generate `*-mechanic-rating.csv` and `*-mechanic-rating-by-character.csv` alongside the scenario JSONL, summary CSV, and win-rate chart. These rating files cover passive, action, and support-effect component studies; whole-character actual-kit win rates are generated by `--candidate all-characters`. `all-actions` and `all-passives` run focused component subsets. Preserve the exact preset, seed, and sampled scenario count in any published report. Smaller presets are screening estimates; the full standard sample is broader but still does not provide exhaustive identity coverage.

The runner isolates component comparisons as follows: Rune sets use the same four Rune stat rolls in both branches, with only the four-piece effect enabled in treatment; a weapon is compared with no weapon; a passive candidate disables only that passive in the control; and an action candidate requests its action on the wearer's first turn against a slot/coverage-matched reference. Whole-character candidates report actual-kit battles and tagged event observations without a disabled-kit branch. Action candidates are scored only on paired trials where the requested action actually executes; all trials also contribute to the separately reported execution rate and realized impact. Ultimate comparisons start with enough Energy to cast. Reports include the comparison reference used for component studies.

## Required diagnostics

For each comparison, report:

1. Character and enemy authored stat lines, plus the encounter profile.
2. Win rate for both branches, the percentage-point difference, sample count, and 95% confidence intervals.
3. HP swing and BAE, with the full damage-source breakdown.
4. Ally and enemy actions, deaths, and survivors.
5. Relevant resource and support outcomes: Skill Points, Energy, Shields granted/absorbed, healing, action advances, and action delays.

Use matched seeds to reduce random noise. Keep scenario-level values visible; overall averages must not hide conditional strengths (for example, a Rune that primarily prevents failure against bosses).

## Interpretation

- **HP swing / BAE** explains the realized HP impact of a comparison.
- **AV** measures the comparison's effect on winning.

Use win rate and HP swing/BAE together when evaluating balance. A high damage or BAE result can have little win-rate impact in an already easy fight; a small HP change can create a large win-rate gain near a survival or kill threshold. Neither total damage nor a synthetic stat conversion proves that an action, Rune, or character is balanced.
