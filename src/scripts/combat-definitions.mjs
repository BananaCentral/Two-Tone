// Shared authored combat data used by the live game and analysis tools.
// `combat` contains the character's combat sheet; benchmark schemas are derived
// below for the current performance runner and are not a separate source of stats.
const character = (roster, combat) => Object.freeze({ ...roster, combat: Object.freeze(combat) });
const enemy = (definition, combat) => Object.freeze({ ...definition, combat: Object.freeze(combat) });

// Stable mechanic vocabulary shared by authored combat data and analysis.
// Numeric values remain on the ability/effect fields.
export const COMBAT_MECHANIC_TAGS = Object.freeze([
  'damage.direct', 'damage.physical', 'damage.magical', 'damage.true', 'damage.critical',
  'damage.conditional_multiplier', 'damage.over_time', 'damage.echo', 'damage.reflect',
  'damage.follow_up', 'damage.barrier_break',
  'buff.attack', 'buff.speed', 'buff.critical', 'buff.next_basic', 'buff.damage', 'buff.barrier_damage', 'buff.barrier_break_damage', 'buff.defense_ignore',
  'debuff.defense', 'debuff.damage', 'debuff.mark', 'debuff.speed',
  'defense.shield', 'defense.barrier', 'defense.damage_reduction', 'defense.stealth',
  'recovery.healing', 'recovery.lifesteal',
  'resource.energy', 'resource.skill_point', 'resource.capacity', 'resource.hp_cost',
  'tempo.action_advance', 'tempo.action_delay', 'tempo.taunt',
  'status.bleed', 'status.exposed', 'status.ricochet', 'status.tune', 'status.residue', 'status.broken',
  'summon.create', 'summon.action',
  'trigger.per_hit', 'trigger.first_hit_per_target', 'trigger.per_action', 'trigger.per_source', 'trigger.periodic',
  'limit.duration', 'limit.stacks', 'limit.charges', 'limit.cooldown'
]);
export const COMBAT_TARGETING_SCHEMA = Object.freeze({
  side: Object.freeze(['enemy', 'ally', 'self', 'team', 'trigger_targets']),
  acquisition: Object.freeze(['selected', 'random', 'all', 'self', 'event_defined', 'source_targets', 'attacker', 'battle_pool']),
  coverage: Object.freeze(['single', 'blast', 'aoe', 'all', 'event_defined', 'source_pattern', 'global'])
});
export const COMBAT_TRIGGER_EVENTS = Object.freeze([
  'on_basic', 'on_skill', 'on_ultimate', 'on_successful_hit', 'on_incoming_attack',
  'on_ally_damage_to_enemy', 'on_ally_damage_dealt', 'on_enemy_enter', 'on_self_enhanced_basic', 'on_linked_ally_action', 'after_link_expired', 'on_tuned_basic_used', 'on_action',
  'every_nth_basic', 'after_attack', 'battle_start', 'always_on', 'event_defined',
  'on_direct_damage', 'on_ally_skill', 'on_ability_hit', 'on_turn_start', 'on_ability_damage', 'on_barrier_break', 'on_first_hit_per_target', 'on_shield_applied'
]);

// Shared reference values for performance comparisons and BAE reporting.
export const COMBAT_PERFORMANCE_STANDARD = Object.freeze({
  baseStats: Object.freeze({ hp: 100, attack: 20, physicalDefense: 4, magicalDefense: 4, speed: 20 }),
  damageMultipliers: Object.freeze({
    basic: Object.freeze({ single: 1, blast: .75, aoe: .5 }),
    skill: Object.freeze({ single: 2, blast: 1.5, aoe: 1 }),
    ultimate: Object.freeze({ single: 3, blast: 2.25, aoe: 1.5 })
  }),
  referenceBasicSkillPointGain: 1,
  referenceSkillEnergyGain: 10,
  referenceSkillPointCost: 1,
  referenceUltimateEnergyCost: 100
});

// Shared individual Energy baseline for allied characters. Energy is separate
// from the party's shared Skill Point pool.
export const COMBAT_RESOURCE_STANDARD = Object.freeze({ startingEnergy: 40, maximumEnergy: 120 });

// Enemy levels use the same linear stat curve as character levels: authored
// Level 1 stats scale by Level, rounded to the nearest 0.25. Enemy mechanics
// remain unchanged as they do for characters.
export const ENEMY_LEVEL_SCALING = Object.freeze({ maxLevel: 50, statStep: 0.25, multiplier: 'base-stat-times-level',
  scaledStats: Object.freeze(['hp', 'attack', 'physicalDefense', 'magicalDefense', 'speed']), unchangedStats: Object.freeze([]) });
// Benchmark difficulty changes only the enemy stat level multiplier. It does
// not add separate HP, Attack, Defense, or encounter-length adjustments.
export const ENEMY_DIFFICULTY_STANDARD = Object.freeze([
  Object.freeze({ id: 'easy', statMultiplier: 0.75, ratingWeight: 0.25 }),
  Object.freeze({ id: 'normal', statMultiplier: 1, ratingWeight: 0.5 }),
  Object.freeze({ id: 'hard', statMultiplier: 1.5, ratingWeight: 0.25 })
]);
// The benchmark's generic action policies and their final-rating weights live
// here so the simulator and performance reporter consume one shared contract.
// Ultimate readiness is sampled once per living eligible ally per scheduled
// combat turn; policy sampling uses its own seeded RNG stream.
export const COMBAT_PERFORMANCE_POLICY_STANDARD = Object.freeze([
  Object.freeze({ id: 'basic-focused-v1', basicProbability: 0.75, skillProbability: 0.25, ultimateUseProbability: 0.75, ratingWeight: 0.25 }),
  Object.freeze({ id: 'skill-focused-v1', basicProbability: 0.25, skillProbability: 0.75, ultimateUseProbability: 0.75, ratingWeight: 0.25 }),
  Object.freeze({ id: 'mixed-v1', basicProbability: 0.5, skillProbability: 0.5, ultimateUseProbability: 0.75, ratingWeight: 0.5 })
]);
export function enemyStatsAtMultiplier(levelOneStats, multiplier) {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > ENEMY_LEVEL_SCALING.maxLevel) throw new RangeError(`Enemy stat multiplier must be greater than 0 and no more than ${ENEMY_LEVEL_SCALING.maxLevel}.`);
  const step = ENEMY_LEVEL_SCALING.statStep;
  return { ...levelOneStats, ...Object.fromEntries(ENEMY_LEVEL_SCALING.scaledStats.map(stat => {
    const value = levelOneStats[stat];
    return [stat, Number.isFinite(value) ? Math.round(value * multiplier / step) * step : value];
  })) };
}
export function enemyStatsAtLevel(levelOneStats, level = 1) {
  if (!Number.isInteger(level) || level < 1 || level > ENEMY_LEVEL_SCALING.maxLevel) throw new RangeError(`Enemy level must be an integer from 1 to ${ENEMY_LEVEL_SCALING.maxLevel}.`);
  return enemyStatsAtMultiplier(levelOneStats, level);
}

// Damage events carry provenance separately from ability tags. This matrix is
// the shared default for proc eligibility in live battles and simulations.
export const COMBAT_DAMAGE_EVENT_TYPES = Object.freeze([
  'direct_hit', 'follow_up_hit', 'ricochet_hit', 'summon_hit',
  'echo_hit', 'reflect_hit', 'damage_over_time', 'barrier_break'
]);
export const COMBAT_TRIGGER_ELIGIBILITY = Object.freeze({
  echo: Object.freeze({ from: Object.freeze(['direct_hit', 'follow_up_hit', 'ricochet_hit', 'summon_hit']),
    requires: 'hp_damage', recursive: false }),
  reflect: Object.freeze({ from: Object.freeze(['direct_hit', 'follow_up_hit', 'ricochet_hit', 'summon_hit', 'echo_hit']),
    requires: 'hp_or_shield_damage', recursive: false }),
  attackEffects: Object.freeze({ from: Object.freeze(['direct_hit', 'follow_up_hit', 'ricochet_hit', 'summon_hit']) }),
  soulFollowUp: Object.freeze({ from: Object.freeze(['direct_hit', 'summon_hit']), uniqueBy: 'source_action', recursive: false }),
  lilyRicochet: Object.freeze({ from: Object.freeze(['direct_hit', 'summon_hit']), uniqueBy: 'source_action', recursive: false }),
  lifesteal: Object.freeze({ from: COMBAT_DAMAGE_EVENT_TYPES, requires: 'actual_hp_damage' })
});
for (const [trigger, rule] of Object.entries(COMBAT_TRIGGER_ELIGIBILITY)) {
  if (!Array.isArray(rule.from) || rule.from.some(eventType => !COMBAT_DAMAGE_EVENT_TYPES.includes(eventType))) {
    throw new Error(`Combat trigger ${trigger} references an unregistered damage event type.`);
  }
}

// Lifecycle rules define the clock and reapplication behavior for timed effects.
// Numeric duration, stack cap, and magnitude values remain on authored effects.
export const COMBAT_EFFECT_LIFECYCLE_EVENTS = Object.freeze([
  'affected_turn_start', 'affected_turn_end', 'owner_turn_end', 'summon_action_end', 'encounter_end'
]);
export const COMBAT_EFFECT_LIFECYCLE = Object.freeze({
  bleed: Object.freeze({ storage: 'bleedStacks', kind: 'stacked_damage', defaultMaxStacks: 5, damagePerStack: .02, tick: Object.freeze({ event: 'affected_turn_start', phase: 'before_action', stacksConsumed: 1 }), reapply: 'add_to_cap', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  exposed: Object.freeze({ storage: 'marks', kind: 'timed_stacks', clock: 'affected_turn_end', reapply: 'add_stack_refresh_duration', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  'cloud-tempo': Object.freeze({ storage: 'marks', kind: 'timed_stacks', clock: 'affected_turn_end', reapply: 'add_stack_refresh_duration', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  'cloud-slow': Object.freeze({ storage: 'marks', kind: 'timed_stacks', clock: 'affected_turn_end', reapply: 'add_stack_refresh_duration', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  ricochet: Object.freeze({ storage: 'marks', kind: 'timed_mark', clock: 'affected_turn_end', reapply: 'refresh_duration_reset_source_history', consume: 'once_per_target_per_source', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  'soul-mark': Object.freeze({ storage: 'marks', kind: 'timed_mark', clock: 'affected_turn_end', reapply: 'refresh_duration', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  'lily-weakened': Object.freeze({ storage: 'debuffs', kind: 'timed_debuff', clock: 'affected_turn_end', reapply: 'replace_refresh_duration', removeOn: Object.freeze(['cleanse', 'defeat']) }),
  tune: Object.freeze({ storage: 'tune', kind: 'timed_buff', clock: 'affected_turn_end', reapply: 'replace', consume: 'next_basic', removeOn: Object.freeze(['duration_expired', 'defeat']) }),
  taunt: Object.freeze({ storage: 'tauntEffects', kind: 'timed_redirect', clock: 'affected_turn_end', reapply: 'replace_same_source_and_target', removeOn: Object.freeze(['duration_expired', 'cleanse', 'defeat']) }),
  residue: Object.freeze({ storage: 'residue', kind: 'timed_stacks', defaultMaxStacks: 5, defaultDurationTurns: 2, clock: 'affected_turn_end', reapply: 'add_stack_refresh_duration', removeOn: Object.freeze(['duration_expired', 'cleanse', 'defeat']) }),
  runeCooldown: Object.freeze({ storage: 'cooldowns', kind: 'cooldown', clock: 'owner_turn_end', startsAfterTriggerTurn: true }),
  summonLifetime: Object.freeze({ storage: 'summon', kind: 'action_count', clock: 'summon_action_end', expiresAtZero: true }),
  shield: Object.freeze({ storage: 'shield', kind: 'depleting_pool', expiresOn: Object.freeze(['depleted', 'encounter_end']) }),
  barrier: Object.freeze({ storage: 'barrier', kind: 'depleting_pool', expiresOn: Object.freeze(['depleted', 'encounter_end']), recovery: 'restore_on_broken_recovery' })
});
for (const [id, rule] of Object.entries(COMBAT_EFFECT_LIFECYCLE)) {
  for (const event of [rule.clock, rule.tick?.event].filter(Boolean)) {
    if (!COMBAT_EFFECT_LIFECYCLE_EVENTS.includes(event)) throw new Error(`Unknown lifecycle event ${event} on ${id}.`);
  }
  if (!rule.storage || !rule.kind) throw new Error(`Incomplete lifecycle definition for ${id}.`);
}

const TYPE_MECHANIC_TAGS = Object.freeze({
  followUp: ['damage.follow_up', 'trigger.per_source', 'limit.charges'],
  cutthroat: ['buff.critical'],
  exposed: ['status.exposed', 'debuff.mark', 'debuff.defense', 'limit.duration'],
  resourceful: ['resource.skill_point', 'resource.capacity'],
  tasteForBlood: ['recovery.lifesteal'],
  bleed: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'],
  everyNthBasic: ['trigger.periodic', 'damage.conditional_multiplier'],
  pursuit: ['tempo.action_advance', 'trigger.per_action'],
  momentum: ['buff.attack', 'limit.stacks'],
  sharpClaws: ['buff.defense_ignore'],
  enhanceBasic: ['buff.next_basic', 'buff.damage', 'resource.skill_point', 'resource.energy'],
  firstStrike: ['damage.conditional_multiplier', 'trigger.first_hit_per_target'],
  ricochet: ['status.ricochet', 'debuff.mark', 'damage.true', 'trigger.per_source', 'limit.duration'],
  tune: ['status.tune', 'buff.next_basic', 'buff.damage', 'resource.skill_point', 'resource.energy', 'limit.duration'],
  bloodShield: ['defense.shield', 'resource.hp_cost', 'tempo.taunt', 'resource.energy'],
  dawnSupport: ['resource.energy', 'resource.skill_point', 'tempo.action_advance'],
  residue: ['status.residue', 'debuff.damage', 'debuff.defense', 'limit.stacks', 'limit.duration']
});
const TYPE_MECHANIC_TARGETS = Object.freeze({
  followUp: { 'damage.follow_up': ['opponent', 'event_defined', 'event_defined'] },
  cutthroat: { 'buff.critical': ['self', 'self', 'single'], 'damage.critical': ['self', 'self', 'single'] },
  exposed: { 'debuff.mark': ['opponent', 'event_defined', 'event_defined'], 'debuff.defense': ['opponent', 'event_defined', 'event_defined'] },
  resourceful: { 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.capacity': ['team', 'battle_pool', 'global'] },
  tasteForBlood: { 'recovery.lifesteal': ['actor_team', 'all', 'all'] },
  bleed: { 'status.bleed': ['opponent', 'event_defined', 'event_defined'] },
  everyNthBasic: { 'damage.conditional_multiplier': ['opponent', 'all', 'aoe'] },
  pursuit: { 'tempo.action_advance': ['self', 'self', 'single'] },
  momentum: { 'buff.attack': ['self', 'self', 'single'] },
  sharpClaws: { 'buff.defense_ignore': ['self', 'self', 'single'] },
  enhanceBasic: { 'buff.next_basic': ['self', 'self', 'single'], 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.energy': ['self', 'self', 'single'] },
  firstStrike: { 'damage.direct': ['opponent', 'selected', 'single'], 'damage.conditional_multiplier': ['opponent', 'selected', 'single'], 'trigger.first_hit_per_target': ['opponent', 'selected', 'single'], 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.energy': ['self', 'self', 'single'] },
  ricochet: { 'debuff.mark': ['opponent', 'all', 'aoe'], 'damage.true': ['opponent', 'event_defined', 'event_defined'], 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.energy': ['self', 'self', 'single'] },
  tune: { 'buff.next_basic': ['ally', 'selected', 'single'], 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.energy': ['self', 'self', 'single'] },
  bloodShield: { 'defense.shield': ['actor_team', 'all', 'all'], 'tempo.taunt': ['opponent', 'all', 'all'], 'resource.hp_cost': ['self', 'self', 'single'], 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.energy': ['self', 'self', 'single'] },
  dawnSupport: { 'resource.energy': ['ally', 'selected', 'single'], 'tempo.action_advance': ['ally', 'selected', 'single'], 'resource.skill_point': ['team', 'battle_pool', 'global'] },
  residue: { 'status.residue': ['self', 'self', 'single'], 'debuff.damage': ['opponent', 'event_defined', 'event_defined'], 'debuff.defense': ['opponent', 'event_defined', 'event_defined'] }
});
const TYPE_MECHANIC_TRIGGERS = Object.freeze({
  followUp: { 'damage.follow_up': 'on_ally_damage_to_enemy' },
  cutthroat: { 'buff.critical': 'always_on', 'damage.critical': 'always_on' },
  exposed: { 'debuff.mark': 'on_ability_hit', 'debuff.defense': 'on_ability_hit', 'status.exposed': 'on_ability_hit' },
  resourceful: { 'resource.skill_point': 'battle_start', 'resource.capacity': 'battle_start' },
  tasteForBlood: { 'recovery.lifesteal': 'on_ally_damage_dealt' },
  bleed: { 'status.bleed': 'on_successful_hit', 'damage.over_time': 'on_turn_start' },
  everyNthBasic: { 'damage.conditional_multiplier': 'every_nth_basic' },
  pursuit: { 'tempo.action_advance': 'after_attack' },
  momentum: { 'buff.attack': 'after_attack' },
  sharpClaws: { 'buff.defense_ignore': 'always_on' },
  enhanceBasic: { 'buff.next_basic': 'on_skill', 'resource.skill_point': 'on_skill', 'resource.energy': 'on_basic' },
  firstStrike: { 'damage.direct': 'on_skill', 'damage.conditional_multiplier': 'on_first_hit_per_target', 'trigger.first_hit_per_target': 'on_first_hit_per_target' },
  ricochet: { 'debuff.mark': 'on_successful_hit', 'status.ricochet': 'on_successful_hit', 'damage.true': 'on_ally_damage_to_enemy' },
  tune: { 'status.tune': 'on_skill', 'buff.next_basic': 'on_skill', 'buff.damage': 'on_skill', 'resource.skill_point': 'on_tuned_basic_used', 'resource.energy': 'on_skill' },
  bloodShield: { 'defense.shield': 'on_skill', 'tempo.taunt': 'on_skill', 'resource.hp_cost': 'on_skill', 'resource.energy': 'on_skill', 'resource.skill_point': 'on_skill' },
  dawnSupport: { 'resource.energy': 'on_ultimate', 'tempo.action_advance': 'on_ultimate', 'resource.skill_point': 'on_ultimate' },
  residue: { 'status.residue': 'on_incoming_attack', 'debuff.damage': 'on_incoming_attack', 'debuff.defense': 'on_incoming_attack' }
});

function targetingFor(target, slot, defaultSide = 'enemy') {
  if (target === 'self') return Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' });
  if (target === 'ally') return Object.freeze({ side: 'ally', acquisition: 'selected', coverage: 'single' });
  if (target === 'allAllies') return Object.freeze({ side: 'ally', acquisition: 'all', coverage: 'all' });
  if (target === 'aoe') return Object.freeze({ side: defaultSide, acquisition: 'all', coverage: 'aoe' });
  if (target === 'blast') return Object.freeze({ side: defaultSide, acquisition: 'selected', coverage: 'blast' });
  if (target === 'single') return Object.freeze({ side: defaultSide, acquisition: defaultSide === 'enemy' && slot === 'enemyBasic' ? 'random' : 'selected', coverage: 'single' });
  if (target === 'random') return Object.freeze({ side: defaultSide, acquisition: 'random', coverage: 'single' });
  if (slot === 'passive') return Object.freeze({ side: 'trigger_targets', acquisition: 'event_defined', coverage: 'event_defined' });
  return null;
}

function mechanicTargetsFor(effect, defaultSide, primaryTargeting, mechanicTags) {
  const targets = {};
  const typeTargets = TYPE_MECHANIC_TARGETS[effect.type] || {};
  for (const [tag, [side, acquisition, coverage]] of Object.entries(typeTargets)) {
    const resolvedSide = side === 'opponent' ? defaultSide : side === 'actor_team' ? (defaultSide === 'enemy' ? 'ally' : 'enemy') : side;
    targets[tag] = Object.freeze({ side: resolvedSide, acquisition, coverage });
  }
  for (const tag of new Set([...Object.keys(typeTargets), ...mechanicTags])) {
    targets[tag] ||= primaryTargeting || Object.freeze({ side: 'trigger_targets', acquisition: 'event_defined', coverage: 'event_defined' });
  }
  for (const [tag, targeting] of Object.entries(effect.mechanicTargets || {})) targets[tag] = Object.freeze({ ...targeting });
  return Object.freeze(targets);
}

function mechanicTriggersFor(effect, slot, mechanicTags) {
  const defaultEvent = slot === 'basic' ? 'on_basic' : slot === 'skill' ? 'on_skill' : slot === 'ultimate' ? 'on_ultimate' : 'event_defined';
  const triggers = Object.fromEntries(mechanicTags.map(tag => [tag, defaultEvent]));
  if (mechanicTags.includes('damage.barrier_break')) triggers['damage.barrier_break'] = 'on_barrier_break';
  Object.assign(triggers, TYPE_MECHANIC_TRIGGERS[effect.type] || {}, effect.mechanicTriggers || {});
  return Object.freeze(triggers);
}

function tagCombatEffect(effect, slot, defaultSide = 'enemy') {
  if (!effect) return effect;
  if (effect.type && !['basic', 'ultimate'].includes(effect.type) && !Object.hasOwn(TYPE_MECHANIC_TAGS, effect.type) && !effect.mechanicTags?.length) {
    throw new Error(`Combat effect type ${effect.type} needs explicit mechanicTags before it can be used in analysis.`);
  }
  const tags = new Set(effect.mechanicTags || []);
  for (const tag of TYPE_MECHANIC_TAGS[effect.type] || []) tags.add(tag);
  if (effect.damageType && ['physical', 'magical', 'true'].includes(effect.damageType)) tags.add(`damage.${effect.damageType}`);
  if (Number.isFinite(effect.multiplier) && effect.multiplier > 0 && slot !== 'passive') {
    tags.add('damage.direct');
  }
  if (Number.isFinite(effect.criticalRateBonus) || Number.isFinite(effect.criticalDamageBonus)) tags.add('damage.critical');
  if (Number.isFinite(effect.energyGain) || Number.isFinite(effect.energyCost) || Number.isFinite(effect.energyPerStack)) tags.add('resource.energy');
  if (Number.isFinite(effect.skillPointGain) || Number.isFinite(effect.skillPointCost)) tags.add('resource.skill_point');
  if (slot === 'skill') tags.add('resource.skill_point');
  if (slot === 'ultimate') tags.add('resource.energy');
  if (Number.isFinite(effect.healthCost)) tags.add('resource.hp_cost');
  if (Number.isFinite(effect.damageBonus) || Number.isFinite(effect.damagePerStack)) tags.add('buff.damage');
  if (Number.isFinite(effect.defenseIgnore) || Number.isFinite(effect.defenseIgnoreBonus)) tags.add('buff.defense_ignore');
  if (Number.isFinite(effect.actionAdvance)) tags.add('tempo.action_advance');
  if (Number.isFinite(effect.duration) || Number.isFinite(effect.markTurns) || Number.isFinite(effect.tauntTurns)) tags.add('limit.duration');
  if (Number.isFinite(effect.charges)) tags.add('limit.charges');
  if (Number.isFinite(effect.maxStacks)) tags.add('limit.stacks');
  for (const tag of tags) if (!COMBAT_MECHANIC_TAGS.includes(tag)) throw new Error(`Unknown combat mechanic tag ${tag} on ${effect.id || effect.type || slot}.`);
  const targeting = effect.target !== undefined ? targetingFor(effect.target, slot, defaultSide) :
    slot === 'passive' ? targetingFor(undefined, slot, defaultSide) : null;
  const mechanicTags = Object.freeze([...tags].sort());
  const mechanicTargets = mechanicTargetsFor(effect, defaultSide, targeting, mechanicTags);
  const mechanicTriggers = mechanicTriggersFor(effect, slot, mechanicTags);
  const targetingVariants = effect.type === 'enhanceBasic' && Number.isFinite(effect.blastAtStacks) ? Object.freeze([
    Object.freeze({
      action: 'basic',
      when: Object.freeze({ enhanceStacksAtLeast: effect.blastAtStacks }),
      targeting: Object.freeze({ side: defaultSide, acquisition: 'selected', coverage: 'blast' }),
      overrides: Object.freeze([Object.freeze({
        when: Object.freeze({ premiumWeaponDuplicatesAtLeast: 3 }),
        coverage: 'aoe'
      })])
    })
  ]) : undefined;
  return Object.freeze({ ...effect, ...(targeting ? { targeting } : {}), ...(targetingVariants ? { targetingVariants } : {}), mechanicTags, mechanicTargets, mechanicTriggers });
}

function tagCombatKit(kit, defaultSide = 'enemy') {
  return Object.freeze({
    ...kit,
    basic: tagCombatEffect(kit.basic, 'basic', defaultSide),
    skill: tagCombatEffect(kit.skill, 'skill', defaultSide),
    ultimate: tagCombatEffect(kit.ultimate, 'ultimate', defaultSide),
    passives: Object.freeze((kit.passives || []).map(passive => tagCombatEffect(passive, 'passive', defaultSide)))
  });
}

export const CHARACTER_ROSTER = Object.freeze([
  character(
    { id: 'soul', name: 'SOUL', label: 'Character', hp: 100, baseAttack: 20, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'soul', test: false },
    { name: 'Soul', role: 'mainDps', level: 1, basic: { damageType: 'true', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'enhanceBasic', target: 'self', damagePerStack: 1, energyPerStack: 10, blastAtStacks: 3 }, ultimate: { damageType: 'true', multiplier: 1.5, target: 'aoe', energyCost: 100, refillFollowUps: true, mechanicTags: ['damage.follow_up'] }, passives: [{ type: 'followUp', id: 'followUp', damageType: 'true', multiplier: .5, charges: 5 }] }
  ),
  character(
    { id: 'zero', name: 'ZERO', label: 'Character', hp: 50, baseAttack: 40, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 30, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'zeroBattle', test: false, passive: { id: 'cutthroat', criticalRateBonus: .1, criticalDamageBonus: .25 } },
    { name: 'Zero', role: 'mainDps', level: 1, basic: { damageType: 'physical', multiplier: .75, target: 'blast', energyGain: 20, skillPointGain: 1 }, skill: { type: 'firstStrike', target: 'single', damageType: 'physical', multiplier: 1, firstHitMultiplier: 2, energyGain: 20 }, ultimate: { damageType: 'physical', multiplier: 1, target: 'aoe', energyCost: 100, actionAdvance: 100, mechanicTargets: { 'tempo.action_advance': { side: 'self', acquisition: 'self', coverage: 'single' } } }, passives: [{ type: 'cutthroat', criticalRateBonus: .1, criticalDamageBonus: .25 }] }
  ),
  character(
    { id: 'lily', name: 'LILY', label: 'Character', hp: 100, baseAttack: 20, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'lily', test: false },
    { name: 'Lily', role: 'subDps', level: 1, basic: { damageType: 'magical', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'ricochet', damageType: 'magical', multiplier: .75, target: 'aoe', energyGain: 20, markTurns: 2, ricochetDamageMultiplier: .1 }, ultimate: { damageType: 'magical', multiplier: .75, target: 'aoe', energyCost: 100, summonDuration: 3, summonSpeed: 30, summonHp: 1, summonDamageType: 'true', summonMultiplier: .75, summonTarget: 'aoe', mechanicTags: ['summon.create', 'summon.action'] }, passives: [{ type: 'exposed', defenseReduction: .2, duration: 2 }] }
  ),
  character(
    { id: 'dawn', name: 'DAWN', label: 'Character', hp: 50, baseAttack: 40, basePhysicalDefense: 2, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'dawn', test: false },
    { name: 'Dawn', role: 'support', level: 1, basic: { damageType: 'magical', multiplier: 2, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'tune', target: 'ally', energyGain: 20, damageBonus: .4, duration: 1, skillPointReturn: 1,
      effects: [{ id: 'dawn.tune.support', mechanicTags: ['status.tune', 'buff.next_basic', 'buff.damage', 'resource.skill_point', 'limit.duration'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', measures: ['damageBonus', 'duration', 'skillPointReturn', 'actionAdvance'] }] }, ultimate: { type: 'dawnSupport', target: 'ally', energyCost: 100, energyRestore: .5, skillPointGain: 1, actionAdvance: 100,
      effects: [
        { id: 'dawn.ultimate.energy-restore', mechanicTags: ['resource.energy'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_ultimate', measures: ['energyGained'] },
        { id: 'dawn.ultimate.action-advance', mechanicTags: ['tempo.action_advance'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_ultimate', measures: ['actionAdvance'] },
        { id: 'dawn.ultimate.skill-point', mechanicTags: ['resource.skill_point'], targeting: { side: 'self', acquisition: 'self', coverage: 'single' }, trigger: 'on_ultimate', measures: ['skillPointsGained'] }
      ] }, passives: [{ type: 'resourceful', skillPointCapBonus: 2, startingSkillPointBonus: 2 }] }
  ),
  character(
    { id: 'cloud', name: 'CLOUD', label: 'Character', hp: 50, baseAttack: 10, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 60, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'portrait', test: false },
    { name: 'Cloud', role: 'support', level: 1,
      basic: { damageType: 'magical', multiplier: .25, target: 'aoe', energyGain: 10, skillPointGain: 1,
        speedBonus: .2, speedDuration: 2, speedMaxStacks: 5,
        mechanicTags: ['buff.speed', 'limit.duration', 'limit.stacks'],
        mechanicTargets: {
          'buff.speed': { side: 'ally', acquisition: 'all', coverage: 'all' },
          'limit.duration': { side: 'ally', acquisition: 'all', coverage: 'all' },
          'limit.stacks': { side: 'ally', acquisition: 'all', coverage: 'all' }
        },
        mechanicTriggers: { 'buff.speed': 'on_basic', 'limit.duration': 'on_basic', 'limit.stacks': 'on_basic' },
        effects: [{ id: 'cloud.basic.speed', mechanicTags: ['buff.speed', 'limit.duration', 'limit.stacks'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_basic', measures: ['speedBonus', 'duration', 'maxStacks'] }] },
      skill: { type: 'cloudRestoration', target: 'ally', healMultiplier: 1, adjacentHealMultiplier: .5, actionAdvance: 40, energyGain: 20,
        mechanicTags: ['recovery.healing', 'tempo.action_advance'],
        effects: [{ id: 'cloud.skill.restoration', mechanicTags: ['recovery.healing', 'tempo.action_advance'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', measures: ['healing', 'actionAdvance'] }] },
      ultimate: { damageType: 'magical', multiplier: 1.25, target: 'single', energyCost: 100, actionDelay: 60, slowPercent: .2, slowDuration: 2, slowMaxStacks: 5,
        mechanicTags: ['tempo.action_delay', 'debuff.speed', 'limit.duration', 'limit.stacks'],
        effects: [{ id: 'cloud.ultimate.control', mechanicTags: ['tempo.action_delay', 'debuff.speed', 'limit.duration', 'limit.stacks'], targeting: { side: 'enemy', acquisition: 'selected', coverage: 'single' }, trigger: 'on_ultimate', measures: ['actionDelay', 'slowPercent', 'duration', 'maxStacks'] }] },
      passives: [{ type: 'cloudWeightless', id: 'weightless', actionAdvance: 20, mechanicTags: ['tempo.action_advance', 'trigger.per_action'], mechanicTriggers: { 'tempo.action_advance': 'on_action', 'trigger.per_action': 'on_action' } }] }
  ),
  character(
    { id: 'logan', name: 'LOGAN', label: 'Character', hp: 200, baseAttack: 10, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 10, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'logan', test: false },
    { name: 'Logan', role: 'sustain', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1, mechanicTags: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'], mechanicTriggers: { 'status.bleed': 'on_successful_hit', 'damage.over_time': 'on_turn_start', 'trigger.per_hit': 'on_successful_hit' } }, skill: { type: 'bloodShield', target: 'allAllies', energyGain: 20, healthCost: .25, shieldDistribution: 'perAlly', tauntChance: .25, tauntTurns: 2,
      effects: [
        { id: 'logan.blood-shield.protection', mechanicTags: ['defense.shield'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_skill', measures: ['shieldGranted', 'shieldPerAlly'] },
        { id: 'logan.blood-shield.taunt', mechanicTags: ['tempo.taunt'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'all' }, trigger: 'on_skill', measures: ['tauntRate', 'duration', 'tauntsApplied'] }
      ] }, ultimate: { damageType: 'physical', multiplier: 1.25, target: 'aoe', energyCost: 100, mechanicTags: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'], mechanicTriggers: { 'status.bleed': 'on_successful_hit', 'damage.over_time': 'on_turn_start', 'trigger.per_hit': 'on_successful_hit' } }, passives: [{ type: 'tasteForBlood', lifesteal: .1 }] }
  )
]);

export const ENEMY_ARCHETYPES = Object.freeze({
  slime: enemy({ id: 'slime', category: 'common', tags: { area: 'One', type: 'common', strengths: ['Magical Attacker', 'Magical Resistant', 'Defensive'], weaknesses: ['Physically Fragile', 'Slow'] }, name: 'SLIME', level: 1, hp: 150, baseAttack: 20, basePhysicalDefense: 2, baseMagicalDefense: 6, speed: 10, stealth: 0, lifesteal: 0, battleSprite: 'slimeBattle', battleAspectRatio: '1:1', artwork: 'slimeArtwork', passive: { id: 'slimy', every: 3, damageBonus: .25 }, basicAttack: { targetMode: 'single', damageType: 'magical', multiplier: 1 } },
    { name: 'Slime', role: 'enemy', level: 1, basic: { damageType: 'magical', multiplier: 1, target: 'random' }, passives: [{ type: 'everyNthBasic', id: 'slimy', every: 3, damageBonus: .25, target: 'aoe' }], barrierPercent: .2 }),
  wolf: enemy({ id: 'wolf', category: 'common', tags: { area: 'One', type: 'common', strengths: ['Fast', 'Physical Attacker', 'Strong'], weaknesses: ['Physically Fragile', 'Magically Fragile', 'Fragile'] }, name: 'WOLF', level: 1, hp: 50, baseAttack: 30, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 40, stealth: 0, lifesteal: 0, battleSprite: 'wolfBattle', battleAspectRatio: '1:1', artwork: 'wolfArtwork', passive: { id: 'ravage', stacksPerHit: 1, maxStacks: 5 }, basicAttack: { targetMode: 'single', damageType: 'physical', multiplier: 1 } },
    { name: 'Wolf', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'random' }, passives: [{ type: 'bleed', id: 'ravage', stacksPerHit: 1, maxStacks: 5 }], barrierPercent: .2 }),
  hawk: enemy({ id: 'hawk', category: 'common', tags: { area: 'One', type: 'common', strengths: ['Fast', 'Physical Attacker'], weaknesses: ['Physically Fragile', 'Magically Fragile', 'Weak', 'Fragile'] }, name: 'HAWK', level: 1, hp: 50, baseAttack: 10, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 60, stealth: .2, lifesteal: 0, battleSprite: 'hawkBattle', battleAspectRatio: '1:1', artwork: 'hawkBattle', passive: { id: 'mach-speed' }, basicAttack: { targetMode: 'single', damageType: 'physical', multiplier: 1 } },
    { name: 'Hawk', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'random' }, passives: [], barrierPercent: .2, stealth: .2 }),
  goblin: enemy({ id: 'goblin', category: 'elite', tags: { area: 'One', type: 'elite', strengths: ['Physical Attacker', 'Physically Defensive'], weaknesses: ['Magically Fragile'] }, name: 'GOBLIN', level: 1, hp: 200, baseAttack: 40, basePhysicalDefense: 12, baseMagicalDefense: 4, speed: 40, stealth: 0, lifesteal: 0, battleSprite: 'goblinBattle', battleAspectRatio: '1:2', artwork: 'goblinBattle', passive: { id: 'pursuit', actionAdvance: 20 }, basicAttack: { targetMode: 'blast', damageType: 'physical', multiplier: 1 } },
    { name: 'Goblin', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'blast' }, passives: [{ type: 'pursuit', actionAdvance: 20 }], barrierPercent: .2 }),
  geode: enemy({ id: 'geode', category: 'elite', tags: { area: 'One', type: 'elite', strengths: ['Defensive', 'Magical Resistant', 'Physically Resistant'], weaknesses: ['Slow', 'Weak'] }, name: 'GEODE', level: 1, hp: 250, baseAttack: 20, basePhysicalDefense: 16, baseMagicalDefense: 8, speed: 10, stealth: 0, lifesteal: 0, battleSprite: 'geodeBattle', battleAspectRatio: '1:2', artwork: 'geodeBattle', passive: { id: 'momentum', damageBonus: .2, maxStacks: 10 }, basicAttack: { targetMode: 'aoe', damageType: 'physical', multiplier: 1 } },
    { name: 'Geode', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'aoe' }, passives: [{ type: 'momentum', damageBonus: .2, maxStacks: 10 }], barrierPercent: .2 }),
  bear: enemy({ id: 'bear', category: 'boss', tags: { area: 'One', type: 'boss', strengths: ['Defensive', 'Strong', 'Physical Attacker'], weaknesses: ['Physically Fragile', 'Magically Fragile'] }, name: 'BEAR', level: 1, hp: 450, baseAttack: 90, basePhysicalDefense: 6, baseMagicalDefense: 6, speed: 60, stealth: 0, lifesteal: 0, battleSprite: 'bearBattle', battleAspectRatio: '64:70', artwork: 'bearBattle', healthBars: 1, passive: { id: 'sharp-claws', defenseIgnore: .25 }, basicAttack: { targetMode: 'aoe', damageType: 'true', multiplier: 1 } },
    { name: 'Bear', role: 'boss', level: 1, basic: { damageType: 'true', multiplier: 1, target: 'aoe' }, passives: [{ type: 'sharpClaws', defenseIgnore: .25 }], barrierPercent: .2 })
});

function runtimeStats(unit) {
  const stats = { hp: unit.hp, physicalDefense: unit.basePhysicalDefense, magicalDefense: unit.baseMagicalDefense, speed: unit.speed };
  stats.attack = unit.baseAttack;
  return stats;
}

export const CHARACTER_COMBAT_DATA = Object.freeze(Object.fromEntries(CHARACTER_ROSTER.map(unit => [unit.id, Object.freeze({ ...tagCombatKit(unit.combat), stats: runtimeStats(unit) })])));

// Catalogued effects are independently measurable and suppressible by stable ID.
// Keep effect metadata beside the authored ability so tags, targeting, and trigger
// semantics cannot drift away from the mechanic they describe.
const combatEffectCatalog = {};
for (const unit of CHARACTER_ROSTER) for (const slot of ['basic', 'skill', 'ultimate'])
  for (const effect of unit.combat[slot]?.effects || []) {
    if (!effect.id || typeof effect.id !== 'string') throw new Error(`${unit.id}.${slot} effect needs a stable ID.`);
    if (Object.hasOwn(combatEffectCatalog, effect.id)) throw new Error(`Duplicate combat effect ID: ${effect.id}.`);
    if (!Array.isArray(effect.mechanicTags) || !effect.mechanicTags.length || effect.mechanicTags.some(tag => !COMBAT_MECHANIC_TAGS.includes(tag)))
      throw new Error(`${effect.id} needs canonical mechanic tags.`);
    if (!Array.isArray(effect.measures) || !effect.measures.length || effect.measures.some(key => typeof key !== 'string'))
      throw new Error(`${effect.id} needs numeric measure fields for reporting its magnitude.`);
    if (new Set(effect.measures).size !== effect.measures.length || !effect.targeting ||
        !COMBAT_TARGETING_SCHEMA.side.includes(effect.targeting.side) ||
        !COMBAT_TARGETING_SCHEMA.acquisition.includes(effect.targeting.acquisition) ||
        !COMBAT_TARGETING_SCHEMA.coverage.includes(effect.targeting.coverage) ||
        !COMBAT_TRIGGER_EVENTS.includes(effect.trigger))
      throw new Error(`${effect.id} needs valid, unique targeting, trigger, and measure metadata.`);
    combatEffectCatalog[effect.id] = Object.freeze({ ...effect, character: unit.id, slot });
  }
export const COMBAT_EFFECT_CATALOG = Object.freeze(combatEffectCatalog);

function enemyPassive(unit) {
  const passive = unit.passive || {};
  if (passive.id === 'slimy') return { type: 'everyNthBasic', id: 'slimy', every: passive.every, damageBonus: passive.damageBonus, target: 'aoe' };
  if (passive.id === 'ravage') return { type: 'bleed', id: 'ravage', stacksPerHit: passive.stacksPerHit, maxStacks: passive.maxStacks };
  if (passive.id === 'pursuit') return { type: 'pursuit', actionAdvance: passive.actionAdvance };
  if (passive.id === 'momentum') return { type: 'momentum', damageBonus: passive.damageBonus, maxStacks: passive.maxStacks };
  if (passive.id === 'sharp-claws') return { type: 'sharpClaws', defenseIgnore: passive.defenseIgnore };
  return null;
}

export const ENEMY_COMBAT_DATA = Object.freeze(Object.fromEntries(Object.entries(ENEMY_ARCHETYPES).map(([id, unit]) => [id, Object.freeze({
  ...tagCombatKit({
    name: unit.name, role: unit.category, level: unit.level,
    basic: { damageType: unit.basicAttack.damageType, multiplier: unit.basicAttack.multiplier, target: unit.basicAttack.targetMode === 'single' ? 'random' : unit.basicAttack.targetMode },
    passives: enemyPassive(unit) ? [enemyPassive(unit)] : []
  }, 'ally'),
  baseStats: Object.freeze(runtimeStats(unit)), stats: Object.freeze(runtimeStats(unit)), tags: unit.tags,
  mechanicTags: Object.freeze([...(unit.stealth > 0 ? ['defense.stealth'] : []), 'defense.barrier', 'status.broken']),
  mechanicTargets: Object.freeze({
    'defense.barrier': Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }),
    'status.broken': Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }),
    ...(unit.stealth > 0 ? { 'defense.stealth': Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) } : {})
  }),
  mechanicTriggers: Object.freeze({ 'defense.barrier': 'battle_start', 'status.broken': 'on_barrier_break', ...(unit.stealth > 0 ? { 'defense.stealth': 'always_on' } : {}) }),
  traitMechanics: Object.freeze(unit.stealth > 0 ? [Object.freeze({ id: unit.passive?.id || 'stealth', mechanicTags: Object.freeze(['defense.stealth']), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }), mechanicTriggers: Object.freeze({ 'defense.stealth': 'always_on' }) })] : []),
  stealth: unit.stealth, barrierPercent: .2
})])));

// Current in-game Rune behavior. Runtime and analysis must read these values
// instead of maintaining separate numeric Rune rules.
export const RUNE_COMBAT_RULES = Object.freeze({
  'radiant-moon': Object.freeze({ echo: .5, cooldownTurns: 2, eligibility: 'damaging_skill', mechanicTags: Object.freeze(['damage.echo', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'damage.echo': 'on_damaging_skill', 'limit.cooldown': 'on_damaging_skill' }), targeting: Object.freeze({ side: 'enemy', acquisition: 'source_targets', coverage: 'source_pattern' }) }),
  'eternal-sun': Object.freeze({ ultimateEnergyReduction: 20, nextActionEnergyRestore: 20, cooldownTurns: 1, eligibility: 'ultimate', mechanicTags: Object.freeze(['resource.energy', 'trigger.per_action', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'resource.energy': 'on_ultimate_and_next_action', 'trigger.per_action': 'on_ultimate', 'limit.cooldown': 'after_next_action' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'celestial-star': Object.freeze({ forceCritical: true, criticalDamageBonus: .25, cooldownTurns: 2, eligibility: 'damaging_ability', mechanicTags: Object.freeze(['damage.critical', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'damage.critical': 'while_ready', 'limit.cooldown': 'on_critical_strike' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'dark-matter': Object.freeze({ defenseIgnore: .4, cooldownTurns: 1, eligibility: 'damaging_ability', mechanicTags: Object.freeze(['buff.defense_ignore', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'buff.defense_ignore': 'on_ability_damage', 'limit.cooldown': 'on_ability_damage' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'clear-skies': Object.freeze({ shieldMaxHp: .2, shieldDurationTurns: 2, reflect: .1, cooldownTurns: 1, eligibility: 'skill', mechanicTags: Object.freeze(['defense.shield', 'damage.reflect', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'defense.shield': 'on_skill', 'damage.reflect': 'while_shielded', 'limit.cooldown': 'on_skill' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'infinite-space': Object.freeze({ ultimateDelay: 100, immunityTurns: 2, eligibility: 'ultimate', mechanicTags: Object.freeze(['tempo.action_delay']), mechanicTriggers: Object.freeze({ 'tempo.action_delay': 'on_ultimate' }), targeting: Object.freeze({ side: 'enemy', acquisition: 'all', coverage: 'all' }) }),
  recycle: Object.freeze({ skillPoints: 1, actionAdvance: 80, cooldownTurns: 2, eligibility: 'skill', mechanicTags: Object.freeze(['resource.skill_point', 'tempo.action_advance', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'resource.skill_point': 'on_skill', 'tempo.action_advance': 'on_skill', 'limit.cooldown': 'on_skill' }), targeting: Object.freeze({ side: 'team', acquisition: 'battle_pool', coverage: 'global' }) }),
  amplify: Object.freeze({ basicDamageBonus: .5, cooldownTurns: 2, eligibility: 'basic', mechanicTags: Object.freeze(['buff.damage', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'buff.damage': 'on_basic', 'limit.cooldown': 'on_basic' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  united: Object.freeze({ linkActions: 1, basicDamageMultiplier: .5, cooldownAfterLinkTurns: 2, eligibility: 'single_ally_targeted_skill', mechanicTags: Object.freeze(['damage.direct', 'trigger.per_action', 'limit.duration', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'damage.direct': 'on_linked_ally_action', 'trigger.per_action': 'on_linked_ally_action', 'limit.duration': 'on_ally_skill', 'limit.cooldown': 'after_link_expired' }), targeting: Object.freeze({ side: 'ally', acquisition: 'selected', coverage: 'single' }) })
});

function upgradeComponent({ id, character, source, mechanicTags, targeting, trigger, values, targets = {}, triggers = {} }) {
  const mechanicTargets = Object.fromEntries(mechanicTags.map(tag => [tag, Object.freeze({ ...(targets[tag] || targeting) })]));
  const mechanicTriggers = Object.fromEntries(mechanicTags.map(tag => [tag, triggers[tag] || trigger]));
  return Object.freeze({ id, character, source: Object.freeze({ ...source }), mechanicTags: Object.freeze([...mechanicTags]),
    targeting: Object.freeze({ ...targeting }), mechanicTargets: Object.freeze(mechanicTargets),
    mechanicTriggers: Object.freeze(mechanicTriggers), values: Object.freeze({ ...values }) });
}

const enemyOnEvent = Object.freeze({ side: 'enemy', acquisition: 'event_defined', coverage: 'event_defined' });
const selfTarget = Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' });
const teamPoolTarget = Object.freeze({ side: 'team', acquisition: 'battle_pool', coverage: 'global' });

// Per-rank upgrades and weapon effects are analysis-visible components. The
// engine reads these values; tags describe the effect without encoding its owner.
const upgradeComponents = [
  upgradeComponent({ id: 'soul.duplicate.1.follow-up-damage', character: 'soul', source: { kind: 'character_duplicate', rank: 1 }, mechanicTags: ['damage.follow_up', 'buff.damage'], targeting: enemyOnEvent, trigger: 'on_ally_damage_to_enemy', values: { followUpDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'soul.duplicate.2.basic-damage', character: 'soul', source: { kind: 'character_duplicate', rank: 2 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: enemyOnEvent, trigger: 'on_basic', values: { basicDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'soul.duplicate.3.ultimate-damage', character: 'soul', source: { kind: 'character_duplicate', rank: 3 }, mechanicTags: ['damage.direct', 'damage.true', 'buff.damage'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'aoe' }, trigger: 'on_ultimate', values: { ultimateDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'soul.duplicate.4.enhance-scaling', character: 'soul', source: { kind: 'character_duplicate', rank: 4 }, mechanicTags: ['buff.next_basic', 'buff.damage'], targeting: selfTarget, trigger: 'on_skill', values: { enhanceDamagePerStackMultiplier: 2 } }),
  upgradeComponent({ id: 'soul.signature.enhance-refund', character: 'soul', source: { kind: 'signature_weapon' }, mechanicTags: ['resource.skill_point'], targeting: teamPoolTarget, trigger: 'on_skill', values: { enhanceRefundEvery: 3, enhanceRefundAmount: 1 } }),
  upgradeComponent({ id: 'soul.signature.enhanced-basic-follow-up', character: 'soul', source: { kind: 'signature_weapon' }, mechanicTags: ['damage.follow_up', 'trigger.per_source'], targeting: enemyOnEvent, trigger: 'on_self_enhanced_basic', values: { selfFollowUpAtEnhanceStacks: 3 } }),
  upgradeComponent({ id: 'soul.premium-duplicate.1.follow-up-charges', character: 'soul', source: { kind: 'premium_weapon_duplicate', rank: 1 }, mechanicTags: ['damage.follow_up', 'limit.charges'], targeting: enemyOnEvent, trigger: 'on_ally_damage_to_enemy', values: { followUpCharges: 7 } }),
  upgradeComponent({ id: 'soul.premium-duplicate.2.critical-stats', character: 'soul', source: { kind: 'premium_weapon_duplicate', rank: 2 }, mechanicTags: ['buff.critical', 'damage.critical'], targeting: selfTarget, trigger: 'always_on', values: { criticalRateBonus: .1, criticalDamageBonus: .25 } }),
  upgradeComponent({ id: 'soul.premium-duplicate.3.enhanced-aoe', character: 'soul', source: { kind: 'premium_weapon_duplicate', rank: 3 }, mechanicTags: ['buff.next_basic'], targeting: enemyOnEvent, trigger: 'on_basic', values: { enhancedBasicCoverage: 'aoe' } }),
  upgradeComponent({ id: 'soul.premium-duplicate.4.follow-up-refund', character: 'soul', source: { kind: 'premium_weapon_duplicate', rank: 4 }, mechanicTags: ['damage.follow_up', 'limit.charges'], targeting: enemyOnEvent, trigger: 'on_ally_damage_to_enemy', values: { followUpRefundEvery: 2 } }),

  upgradeComponent({ id: 'zero.duplicate.1.critical-stats', character: 'zero', source: { kind: 'character_duplicate', rank: 1 }, mechanicTags: ['buff.critical', 'damage.critical'], targeting: selfTarget, trigger: 'always_on', values: { criticalRateMultiplier: 2, criticalDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'zero.duplicate.2.basic-damage', character: 'zero', source: { kind: 'character_duplicate', rank: 2 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: enemyOnEvent, trigger: 'on_basic', values: { basicDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'zero.duplicate.3.ultimate-damage', character: 'zero', source: { kind: 'character_duplicate', rank: 3 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'aoe' }, trigger: 'on_ultimate', values: { ultimateDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'zero.duplicate.4.first-strike-damage', character: 'zero', source: { kind: 'character_duplicate', rank: 4 }, mechanicTags: ['damage.conditional_multiplier', 'trigger.first_hit_per_target'], targeting: enemyOnEvent, trigger: 'on_first_hit_per_target', values: { firstStrikeDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'zero.signature.ultimate-resources', character: 'zero', source: { kind: 'signature_weapon' }, mechanicTags: ['resource.skill_point', 'resource.energy'], targeting: teamPoolTarget, targets: { 'resource.energy': selfTarget }, trigger: 'on_ultimate', values: { ultimateSkillPointGain: 1, ultimateEnergyGain: 20 } }),
  upgradeComponent({ id: 'zero.premium-duplicate.1.basic-bleed', character: 'zero', source: { kind: 'premium_weapon_duplicate', rank: 1 }, mechanicTags: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'], targeting: enemyOnEvent, trigger: 'on_successful_hit', values: { basicBleedStacks: 1 } }),
  upgradeComponent({ id: 'zero.premium-duplicate.2.ultimate-delay', character: 'zero', source: { kind: 'premium_weapon_duplicate', rank: 2 }, mechanicTags: ['tempo.action_delay'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'all' }, trigger: 'on_ultimate', values: { ultimateEnemyDelay: 20 } }),
  upgradeComponent({ id: 'zero.premium-duplicate.3.ultimate-energy-cost', character: 'zero', source: { kind: 'premium_weapon_duplicate', rank: 3 }, mechanicTags: ['resource.energy'], targeting: selfTarget, trigger: 'on_ultimate', values: { ultimateEnergyCost: 80 } }),
  upgradeComponent({ id: 'zero.premium-duplicate.4.defense-ignore', character: 'zero', source: { kind: 'premium_weapon_duplicate', rank: 4 }, mechanicTags: ['buff.defense_ignore'], targeting: selfTarget, trigger: 'always_on', values: { defenseIgnore: .4 } }),

  upgradeComponent({ id: 'lily.duplicate.1.exposed-stacking', character: 'lily', source: { kind: 'character_duplicate', rank: 1 }, mechanicTags: ['status.exposed', 'debuff.defense', 'limit.duration', 'limit.stacks'], targeting: enemyOnEvent, trigger: 'on_ability_hit', values: { exposedMaxStacks: 2, exposedDuration: 3 } }),
  upgradeComponent({ id: 'lily.duplicate.2.ultimate-and-summon', character: 'lily', source: { kind: 'character_duplicate', rank: 2 }, mechanicTags: ['damage.direct', 'summon.action', 'limit.duration'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'aoe' }, trigger: 'on_ultimate', values: { ultimateDamageMultiplier: 2, summonDamageMultiplier: 2, summonDuration: 4 } }),
  upgradeComponent({ id: 'lily.duplicate.3.ultimate-team-boost', character: 'lily', source: { kind: 'character_duplicate', rank: 3 }, mechanicTags: ['resource.energy', 'tempo.action_advance'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_ultimate', values: { teamEnergy: 20, teamActionAdvance: 20 } }),
  upgradeComponent({ id: 'lily.duplicate.4.ricochet-repeat', character: 'lily', source: { kind: 'character_duplicate', rank: 4 }, mechanicTags: ['damage.true', 'status.ricochet', 'trigger.per_source'], targeting: enemyOnEvent, trigger: 'on_ally_damage_to_enemy', values: { ricochetRepeats: 2, ricochetSecondHitMultiplier: .5 } }),
  upgradeComponent({ id: 'lily.signature.exposed-energy', character: 'lily', source: { kind: 'signature_weapon' }, mechanicTags: ['resource.energy'], targeting: selfTarget, trigger: 'on_ally_damage_to_enemy', values: { exposedAllyHitEnergy: 5 } }),
  upgradeComponent({ id: 'lily.signature.ultimate-skill-point', character: 'lily', source: { kind: 'signature_weapon' }, mechanicTags: ['resource.skill_point'], targeting: teamPoolTarget, trigger: 'on_ultimate', values: { ultimateSkillPointGain: 1 } }),
  upgradeComponent({ id: 'lily.premium-duplicate.1.ultimate-weakening', character: 'lily', source: { kind: 'premium_weapon_duplicate', rank: 1 }, mechanicTags: ['debuff.damage', 'limit.duration'], targeting: enemyOnEvent, trigger: 'on_ultimate', values: { enemyDamageMultiplier: .8, duration: 1 } }),
  upgradeComponent({ id: 'lily.premium-duplicate.2.entry-marks', character: 'lily', source: { kind: 'premium_weapon_duplicate', rank: 2 }, mechanicTags: ['status.ricochet', 'debuff.mark', 'limit.duration'], targeting: { side: 'enemy', acquisition: 'battle_pool', coverage: 'all' }, trigger: 'on_enemy_enter', values: { entrySoulMarkTurns: 2, entryRicochetTurns: 2 } }),
  upgradeComponent({ id: 'lily.premium-duplicate.3.exposed-barrier-damage', character: 'lily', source: { kind: 'premium_weapon_duplicate', rank: 3 }, mechanicTags: ['buff.barrier_damage', 'debuff.mark'], targeting: enemyOnEvent, trigger: 'on_ability_damage', values: { exposedBarrierDamagePerStack: .1 } }),
  upgradeComponent({ id: 'lily.premium-duplicate.4.exposed-break-damage', character: 'lily', source: { kind: 'premium_weapon_duplicate', rank: 4 }, mechanicTags: ['buff.barrier_break_damage', 'debuff.mark'], targeting: enemyOnEvent, trigger: 'on_barrier_break', values: { exposedBreakDamagePerStack: .05 } }),

  upgradeComponent({ id: 'dawn.duplicate.1.ultimate-energy', character: 'dawn', source: { kind: 'character_duplicate', rank: 1 }, mechanicTags: ['resource.energy'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_ultimate', values: { ultimateEnergyRestore: 1 } }),
  upgradeComponent({ id: 'dawn.duplicate.2.tune-critical', character: 'dawn', source: { kind: 'character_duplicate', rank: 2 }, mechanicTags: ['buff.critical', 'damage.critical'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneCriticalRateBonus: .2, tuneCriticalDamageBonus: .5 } }),
  upgradeComponent({ id: 'dawn.duplicate.3.tune-duration-and-attack', character: 'dawn', source: { kind: 'character_duplicate', rank: 3 }, mechanicTags: ['status.tune', 'buff.attack', 'limit.duration'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneExtraDuration: 1, tuneAttackBonus: .2 } }),
  upgradeComponent({ id: 'dawn.duplicate.4.tune-damage', character: 'dawn', source: { kind: 'character_duplicate', rank: 4 }, mechanicTags: ['buff.next_basic', 'buff.damage'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneDamageBonus: .4 } }),
  upgradeComponent({ id: 'dawn.signature.tune-defense-ignore', character: 'dawn', source: { kind: 'signature_weapon' }, mechanicTags: ['buff.defense_ignore'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneDefenseIgnore: .2 } }),
  upgradeComponent({ id: 'dawn.premium-duplicate.1.tune-damage-reduction', character: 'dawn', source: { kind: 'premium_weapon_duplicate', rank: 1 }, mechanicTags: ['defense.damage_reduction'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneDamageReduction: .2 } }),
  upgradeComponent({ id: 'dawn.premium-duplicate.2.tune-barrier-damage', character: 'dawn', source: { kind: 'premium_weapon_duplicate', rank: 2 }, mechanicTags: ['buff.barrier_damage'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneBarrierDamageBonus: .2 } }),
  upgradeComponent({ id: 'dawn.premium-duplicate.3.ultimate-skill-points', character: 'dawn', source: { kind: 'premium_weapon_duplicate', rank: 3 }, mechanicTags: ['resource.skill_point'], targeting: teamPoolTarget, trigger: 'on_ultimate', values: { ultimateSkillPointGain: 3 } }),
  upgradeComponent({ id: 'dawn.premium-duplicate.4.tune-action-advance', character: 'dawn', source: { kind: 'premium_weapon_duplicate', rank: 4 }, mechanicTags: ['tempo.action_advance'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { tuneActionAdvance: 50 } }),

  upgradeComponent({ id: 'cloud.duplicate.1.weightless-advance', character: 'cloud', source: { kind: 'character_duplicate', rank: 1 }, mechanicTags: ['tempo.action_advance'], targeting: selfTarget, trigger: 'on_action', values: { actionAdvance: 40 } }),
  upgradeComponent({ id: 'cloud.duplicate.2.basic-tempo', character: 'cloud', source: { kind: 'character_duplicate', rank: 2 }, mechanicTags: ['buff.speed', 'limit.duration', 'limit.stacks'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_basic', values: { speedBonus: .4, speedDuration: 3, speedMaxStacks: 5 } }),
  upgradeComponent({ id: 'cloud.duplicate.3.restoration-advance', character: 'cloud', source: { kind: 'character_duplicate', rank: 3 }, mechanicTags: ['recovery.healing', 'tempo.action_advance'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { actionAdvance: 80 } }),
  upgradeComponent({ id: 'cloud.duplicate.4.ultimate-control', character: 'cloud', source: { kind: 'character_duplicate', rank: 4 }, mechanicTags: ['tempo.action_delay', 'resource.energy'], targeting: { side: 'enemy', acquisition: 'selected', coverage: 'single' }, trigger: 'on_ultimate', values: { actionDelay: 100, ultimateEnergyCost: 80 } }),
  upgradeComponent({ id: 'cloud.premium-duplicate.1.basic-damage', character: 'cloud', source: { kind: 'premium_weapon_duplicate', rank: 1 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: enemyOnEvent, trigger: 'on_basic', values: { basicDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'cloud.premium-duplicate.2.ultimate-damage', character: 'cloud', source: { kind: 'premium_weapon_duplicate', rank: 2 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: enemyOnEvent, trigger: 'on_ultimate', values: { ultimateDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'cloud.premium-duplicate.3.ultimate-slow', character: 'cloud', source: { kind: 'premium_weapon_duplicate', rank: 3 }, mechanicTags: ['debuff.speed'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'all' }, trigger: 'on_ultimate', values: { slowPercent: .4 } }),
  upgradeComponent({ id: 'cloud.premium-duplicate.4.restoration-healing', character: 'cloud', source: { kind: 'premium_weapon_duplicate', rank: 4 }, mechanicTags: ['recovery.healing'], targeting: { side: 'ally', acquisition: 'selected', coverage: 'single' }, trigger: 'on_skill', values: { healMultiplier: 2 } }),

  upgradeComponent({ id: 'logan.duplicate.1.basic-damage', character: 'logan', source: { kind: 'character_duplicate', rank: 1 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: enemyOnEvent, trigger: 'on_basic', values: { basicDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'logan.duplicate.2.lifesteal', character: 'logan', source: { kind: 'character_duplicate', rank: 2 }, mechanicTags: ['recovery.lifesteal'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_ally_damage_dealt', values: { lifestealRate: .2 } }),
  upgradeComponent({ id: 'logan.duplicate.3.ultimate-damage', character: 'logan', source: { kind: 'character_duplicate', rank: 3 }, mechanicTags: ['damage.direct', 'buff.damage'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'aoe' }, trigger: 'on_ultimate', values: { ultimateDamageMultiplier: 2 } }),
  upgradeComponent({ id: 'logan.duplicate.4.shield-strength', character: 'logan', source: { kind: 'character_duplicate', rank: 4 }, mechanicTags: ['defense.shield'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_skill', values: { shieldMultiplier: 2 } }),
  upgradeComponent({ id: 'logan.signature.lifesteal-share', character: 'logan', source: { kind: 'signature_weapon' }, mechanicTags: ['recovery.healing'], targeting: selfTarget, trigger: 'on_ally_damage_dealt', values: { healLoganFromAllyLifesteal: true } }),
  upgradeComponent({ id: 'logan.premium-duplicate.1.basic-bleed', character: 'logan', source: { kind: 'premium_weapon_duplicate', rank: 1 }, mechanicTags: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'], targeting: enemyOnEvent, trigger: 'on_successful_hit', values: { basicBleedStacks: 2 } }),
  upgradeComponent({ id: 'logan.premium-duplicate.2.ultimate-bleed-and-skill-point', character: 'logan', source: { kind: 'premium_weapon_duplicate', rank: 2 }, mechanicTags: ['status.bleed', 'damage.over_time', 'resource.skill_point', 'trigger.per_hit'], targeting: enemyOnEvent, trigger: 'on_ultimate', values: { ultimateBleedStacks: 2, ultimateSkillPointGain: 1 } }),
  upgradeComponent({ id: 'logan.premium-duplicate.3.taunt', character: 'logan', source: { kind: 'premium_weapon_duplicate', rank: 3 }, mechanicTags: ['tempo.taunt', 'limit.duration'], targeting: { side: 'enemy', acquisition: 'all', coverage: 'all' }, trigger: 'on_skill', values: { tauntRate: .5, tauntTurns: 3 } }),
  upgradeComponent({ id: 'logan.premium-duplicate.4.shielded-damage', character: 'logan', source: { kind: 'premium_weapon_duplicate', rank: 4 }, mechanicTags: ['buff.damage'], targeting: { side: 'ally', acquisition: 'all', coverage: 'all' }, trigger: 'on_shield_applied', values: { shieldedDamageBonus: .2 } })
];

for (const component of upgradeComponents) {
  for (const tag of component.mechanicTags) if (!COMBAT_MECHANIC_TAGS.includes(tag)) throw new Error(`Unknown upgrade mechanic tag ${tag} on ${component.id}.`);
}
export const CHARACTER_UPGRADE_EFFECTS = Object.freeze(Object.fromEntries(upgradeComponents.map(component => [component.id, component])));
export function getCharacterUpgradeEffect(id) { return CHARACTER_UPGRADE_EFFECTS[id] || null; }
export function isCharacterUpgradeEffectActive(id, state = {}) {
  const effect = getCharacterUpgradeEffect(id);
  if (!effect || state.disabledUpgradeEffectIds?.has?.(id) || state.disabledUpgradeEffectIds?.includes?.(id)) return false;
  if (effect.source.kind === 'character_duplicate') return (state.characterDuplicates || 0) >= effect.source.rank;
  if (effect.source.kind === 'premium_weapon_duplicate') return state.weaponType === 'premium' && (state.premiumWeaponDuplicates || 0) >= effect.source.rank;
  if (effect.source.kind === 'signature_weapon') return state.weaponType === 'premium';
  return false;
}
export function getActiveCharacterUpgradeEffect(id, state = {}) {
  return isCharacterUpgradeEffectActive(id, state) ? getCharacterUpgradeEffect(id) : null;
}
