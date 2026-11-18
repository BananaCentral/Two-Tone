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
  'buff.attack', 'buff.critical', 'buff.next_basic', 'buff.damage', 'buff.defense_ignore',
  'debuff.defense', 'debuff.damage', 'debuff.mark',
  'defense.shield', 'defense.barrier', 'defense.damage_reduction', 'defense.stealth',
  'recovery.healing', 'recovery.lifesteal',
  'resource.energy', 'resource.skill_point', 'resource.capacity', 'resource.hp_cost',
  'tempo.action_advance', 'tempo.action_delay', 'tempo.taunt',
  'status.bleed', 'status.exposed', 'status.ricochet', 'status.tune', 'status.residue', 'status.broken',
  'summon.create', 'summon.action',
  'trigger.per_hit', 'trigger.per_action', 'trigger.per_source', 'trigger.periodic',
  'limit.duration', 'limit.stacks', 'limit.charges', 'limit.cooldown'
]);
export const COMBAT_TARGETING_SCHEMA = Object.freeze({
  side: Object.freeze(['enemy', 'ally', 'self', 'team', 'trigger_targets']),
  acquisition: Object.freeze(['selected', 'random', 'all', 'self', 'event_defined', 'source_targets', 'attacker', 'battle_pool']),
  coverage: Object.freeze(['single', 'blast', 'aoe', 'all', 'event_defined', 'source_pattern', 'global'])
});
export const COMBAT_TRIGGER_EVENTS = Object.freeze([
  'on_basic', 'on_skill', 'on_ultimate', 'on_successful_hit', 'on_incoming_attack',
  'on_ally_damage_to_enemy', 'on_ally_damage_dealt', 'on_tuned_basic_used',
  'every_nth_basic', 'after_attack', 'battle_start', 'always_on', 'event_defined',
  'on_direct_damage', 'on_ally_skill', 'on_ability_hit', 'on_turn_start', 'on_ability_damage', 'on_barrier_break'
]);

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
  firstStrike: ['damage.conditional_multiplier', 'trigger.per_hit'],
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
  firstStrike: { 'damage.direct': ['opponent', 'selected', 'single'], 'damage.conditional_multiplier': ['opponent', 'selected', 'single'], 'resource.skill_point': ['team', 'battle_pool', 'global'], 'resource.energy': ['self', 'self', 'single'] },
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
  firstStrike: { 'damage.direct': 'on_skill', 'damage.conditional_multiplier': 'on_skill' },
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
    tags.add('damage.barrier_break');
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
  return Object.freeze({ ...effect, ...(targeting ? { targeting } : {}), mechanicTags, mechanicTargets, mechanicTriggers });
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
    { name: 'Soul', role: 'mainDps', level: 1, basic: { damageType: 'true', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'enhanceBasic', target: 'self', damagePerStack: 1, energyPerStack: 10, blastAtStacks: 3 }, ultimate: { damageType: 'true', multiplier: 2, target: 'aoe', energyCost: 100, refillFollowUps: true, mechanicTags: ['damage.follow_up'] }, passives: [{ type: 'followUp', id: 'followUp', damageType: 'true', multiplier: .5, charges: 5 }] }
  ),
  character(
    { id: 'zero', name: 'ZERO', label: 'Character', hp: 50, baseAttack: 40, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 30, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'zeroBattle', test: false, passive: { id: 'cutthroat', criticalRateBonus: .1, criticalDamageBonus: .25 } },
    { name: 'Zero', role: 'mainDps', level: 1, basic: { damageType: 'physical', multiplier: .5, target: 'blast', energyGain: 20, skillPointGain: 1 }, skill: { type: 'firstStrike', target: 'single', damageType: 'physical', multiplier: 1, firstHitMultiplier: 1.5, energyGain: 20 }, ultimate: { damageType: 'physical', multiplier: 1, target: 'aoe', energyCost: 100 }, passives: [{ type: 'cutthroat', criticalRateBonus: .1, criticalDamageBonus: .25 }] }
  ),
  character(
    { id: 'lily', name: 'LILY', label: 'Character', hp: 100, basePhysicalAttack: 0, baseMagicalAttack: 20, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'lily', test: false },
    { name: 'Lily', role: 'subDps', level: 1, basic: { damageType: 'magical', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'ricochet', damageType: 'magical', multiplier: .5, target: 'aoe', energyGain: 20, markTurns: 2 }, ultimate: { damageType: 'magical', multiplier: 1, target: 'aoe', energyCost: 100, mechanicTags: ['summon.create', 'summon.action'] }, passives: [{ type: 'exposed', defenseReduction: .1, duration: 2 }] }
  ),
  character(
    { id: 'dawn', name: 'DAWN', label: 'Character', hp: 50, baseAttack: 40, basePhysicalDefense: 2, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'dawn', test: false },
    { name: 'Dawn', role: 'support', level: 1, basic: { damageType: 'magical', multiplier: 2, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'tune', target: 'ally', energyGain: 20, damageBonus: .4, duration: 1 }, ultimate: { type: 'dawnSupport', target: 'ally', energyCost: 100, energyRestore: .5, actionAdvance: 100 }, passives: [{ type: 'resourceful', skillPointCapBonus: 2, startingSkillPointBonus: 2 }] }
  ),
  character(
    { id: 'logan', name: 'LOGAN', label: 'Character', hp: 200, baseAttack: 10, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 10, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'logan', test: false },
    { name: 'Logan', role: 'sustain', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1, mechanicTags: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'], mechanicTriggers: { 'status.bleed': 'on_successful_hit', 'damage.over_time': 'on_turn_start', 'trigger.per_hit': 'on_successful_hit' } }, skill: { type: 'bloodShield', target: 'allAllies', energyGain: 20, healthCost: .25, shieldDistribution: 'perAlly', tauntChance: .25, tauntTurns: 2 }, ultimate: { damageType: 'physical', multiplier: 1, target: 'aoe', energyCost: 100, mechanicTags: ['status.bleed', 'damage.over_time', 'trigger.per_hit', 'limit.stacks'], mechanicTriggers: { 'status.bleed': 'on_successful_hit', 'damage.over_time': 'on_turn_start', 'trigger.per_hit': 'on_successful_hit' } }, passives: [{ type: 'tasteForBlood', lifesteal: .1 }] }
  )
]);

export const ENEMY_ARCHETYPES = Object.freeze({
  slime: enemy({ id: 'slime', category: 'common', tags: { area: 'One', type: 'common', strengths: ['Magical Attacker', 'Magical Resistant', 'Defensive'], weaknesses: ['Physically Fragile', 'Slow'] }, name: 'SLIME', level: 1, hp: 150, baseAttack: 20, basePhysicalDefense: 2, baseMagicalDefense: 6, speed: 10, stealth: 0, lifesteal: 0, battleSprite: 'slimeBattle', battleAspectRatio: '1:1', artwork: 'slimeArtwork', passive: { id: 'slimy', every: 3, damageBonus: .25 }, basicAttack: { targetMode: 'single', damageType: 'magical', multiplier: 1 } },
    { name: 'Slime', role: 'enemy', level: 1, basic: { damageType: 'magical', multiplier: 1, target: 'random' }, passives: [{ type: 'everyNthBasic', id: 'slimy', every: 3, damageBonus: .25, target: 'aoe' }], barrierPercent: .2 }),
  wolf: enemy({ id: 'wolf', category: 'common', tags: { area: 'One', type: 'common', strengths: ['Fast', 'Physical Attacker', 'Strong'], weaknesses: ['Physically Fragile', 'Magically Fragile', 'Fragile'] }, name: 'WOLF', level: 1, hp: 50, baseAttack: 30, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 40, stealth: 0, lifesteal: 0, battleSprite: 'wolfBattle', battleAspectRatio: '1:1', artwork: 'wolfArtwork', passive: { id: 'ravage', stacksPerHit: 1, maxStacks: 5 }, basicAttack: { targetMode: 'single', damageType: 'physical', multiplier: 1 } },
    { name: 'Wolf', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'random' }, passives: [{ type: 'bleed', id: 'ravage', stacksPerHit: 1, maxStacks: 5 }], barrierPercent: .2 }),
  hawk: enemy({ id: 'hawk', category: 'common', tags: { area: 'One', type: 'common', strengths: ['Fast', 'Physical Attacker'], weaknesses: ['Physically Fragile', 'Magically Fragile', 'Weak', 'Fragile'] }, name: 'HAWK', level: 1, hp: 50, baseAttack: 10, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 60, stealth: .2, lifesteal: 0, battleSprite: 'hawkBattle', battleAspectRatio: '1:1', artwork: 'hawkBattle', passive: { id: 'mach-speed' }, basicAttack: { targetMode: 'single', damageType: 'physical', multiplier: 1 } },
    { name: 'Hawk', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'random' }, passives: [], barrierPercent: .2, stealth: .2 }),
  goblin: enemy({ id: 'goblin', category: 'elite', tags: { area: 'One', type: 'elite', strengths: ['Physical Attacker', 'Physically Defensive'], weaknesses: ['Magically Fragile'] }, name: 'GOBLIN', level: 1, hp: 200, basePhysicalAttack: 40, baseMagicalAttack: 0, basePhysicalDefense: 12, baseMagicalDefense: 4, speed: 40, stealth: 0, lifesteal: 0, battleSprite: 'goblinBattle', battleAspectRatio: '1:2', artwork: 'goblinBattle', passive: { id: 'pursuit', actionAdvance: 20 }, basicAttack: { targetMode: 'blast', damageType: 'physical', multiplier: 1 } },
    { name: 'Goblin', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'blast' }, passives: [{ type: 'pursuit', actionAdvance: 20 }], barrierPercent: .2 }),
  geode: enemy({ id: 'geode', category: 'elite', tags: { area: 'One', type: 'elite', strengths: ['Defensive', 'Magical Resistant', 'Physically Resistant'], weaknesses: ['Slow', 'Weak'] }, name: 'GEODE', level: 1, hp: 250, baseAttack: 20, basePhysicalDefense: 16, baseMagicalDefense: 8, speed: 10, stealth: 0, lifesteal: 0, battleSprite: 'geodeBattle', battleAspectRatio: '1:2', artwork: 'geodeBattle', passive: { id: 'momentum', damageBonus: .2, maxStacks: 10 }, basicAttack: { targetMode: 'aoe', damageType: 'physical', multiplier: 1 } },
    { name: 'Geode', role: 'enemy', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'aoe' }, passives: [{ type: 'momentum', damageBonus: .2, maxStacks: 10 }], barrierPercent: .2 }),
  bear: enemy({ id: 'bear', category: 'boss', tags: { area: 'One', type: 'boss', strengths: ['Defensive', 'Strong', 'Physical Attacker'], weaknesses: ['Physically Fragile', 'Magically Fragile'] }, name: 'BEAR', level: 1, hp: 450, basePhysicalAttack: 90, baseMagicalAttack: 0, basePhysicalDefense: 6, baseMagicalDefense: 6, speed: 60, stealth: 0, lifesteal: 0, battleSprite: 'bearBattle', battleAspectRatio: '64:70', artwork: 'bearBattle', healthBars: 1, passive: { id: 'sharp-claws', defenseIgnore: .25 }, basicAttack: { targetMode: 'aoe', damageType: 'true', multiplier: 1 } },
    { name: 'Bear', role: 'boss', level: 1, basic: { damageType: 'true', multiplier: 1, target: 'aoe' }, passives: [{ type: 'sharpClaws', defenseIgnore: .25 }], barrierPercent: .2 })
});

function runtimeStats(unit) {
  const stats = { hp: unit.hp, physicalDefense: unit.basePhysicalDefense, magicalDefense: unit.baseMagicalDefense, speed: unit.speed };
  if (Number.isFinite(unit.baseAttack)) stats.attack = unit.baseAttack;
  else { stats.physicalAttack = unit.basePhysicalAttack; stats.magicalAttack = unit.baseMagicalAttack; }
  return stats;
}

export const CHARACTER_COMBAT_DATA = Object.freeze(Object.fromEntries(CHARACTER_ROSTER.map(unit => [unit.id, Object.freeze({ ...tagCombatKit(unit.combat), stats: runtimeStats(unit) })])));

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
  stats: runtimeStats(unit), tags: unit.tags,
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
  'radiant-moon': Object.freeze({ echo: .2, mechanicTags: Object.freeze(['damage.echo']), mechanicTriggers: Object.freeze({ 'damage.echo': 'on_direct_damage' }), targeting: Object.freeze({ side: 'enemy', acquisition: 'source_targets', coverage: 'source_pattern' }) }),
  'eternal-sun': Object.freeze({ criticalRate: .1, criticalDamage: .25, stealth: .1, mechanicTags: Object.freeze(['buff.critical', 'damage.critical', 'defense.stealth']), mechanicTriggers: Object.freeze({ 'buff.critical': 'always_on', 'damage.critical': 'always_on', 'defense.stealth': 'always_on' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'celestial-star': Object.freeze({ ultimateAdvance: 100, cooldownTurns: 2, mechanicTags: Object.freeze(['tempo.action_advance', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'tempo.action_advance': 'on_ultimate', 'limit.cooldown': 'on_ultimate' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'dark-matter': Object.freeze({ defenseIgnore: .2, damageMultiplier: 1.1, mechanicTags: Object.freeze(['buff.defense_ignore', 'buff.damage']), mechanicTriggers: Object.freeze({ 'buff.defense_ignore': 'on_ability_damage', 'buff.damage': 'on_ability_damage' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  'clear-skies': Object.freeze({ reflect: .1, shieldedReflect: .2, mechanicTags: Object.freeze(['damage.reflect']), mechanicTriggers: Object.freeze({ 'damage.reflect': 'on_incoming_attack' }), targeting: Object.freeze({ side: 'enemy', acquisition: 'attacker', coverage: 'single' }) }),
  'infinite-space': Object.freeze({ ultimateDelay: 50, mechanicTags: Object.freeze(['tempo.action_delay']), mechanicTriggers: Object.freeze({ 'tempo.action_delay': 'on_ultimate' }), targeting: Object.freeze({ side: 'enemy', acquisition: 'all', coverage: 'all' }) }),
  recycle: Object.freeze({ skillPoints: 1, cooldownTurns: 1, mechanicTags: Object.freeze(['resource.skill_point', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'resource.skill_point': 'on_skill', 'limit.cooldown': 'on_skill' }), targeting: Object.freeze({ side: 'team', acquisition: 'battle_pool', coverage: 'global' }) }),
  amplify: Object.freeze({ basicDamageBonus: .5, cooldownTurns: 2, mechanicTags: Object.freeze(['buff.damage', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'buff.damage': 'on_basic', 'limit.cooldown': 'on_basic' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) }),
  united: Object.freeze({ actionAdvance: 100, cooldownTurns: 2, mechanicTags: Object.freeze(['tempo.action_advance', 'limit.cooldown']), mechanicTriggers: Object.freeze({ 'tempo.action_advance': 'on_ally_skill', 'limit.cooldown': 'on_ally_skill' }), targeting: Object.freeze({ side: 'self', acquisition: 'self', coverage: 'single' }) })
});
