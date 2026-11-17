// Shared authored combat data used by the live game and analysis tools.
// `combat` contains the character's combat sheet; benchmark schemas are derived
// below for the current performance runner and are not a separate source of stats.
const character = (roster, combat) => Object.freeze({ ...roster, combat: Object.freeze(combat) });
const enemy = (definition, combat) => Object.freeze({ ...definition, combat: Object.freeze(combat) });

export const CHARACTER_ROSTER = Object.freeze([
  character(
    { id: 'soul', name: 'SOUL', label: 'Character', hp: 100, baseAttack: 20, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'soul', test: false },
    { name: 'Soul', role: 'mainDps', level: 1, basic: { damageType: 'true', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'enhanceBasic', target: 'self', damagePerStack: 1, energyPerStack: 10, blastAtStacks: 3 }, ultimate: { damageType: 'true', multiplier: 2, target: 'aoe', energyCost: 100, refillFollowUps: true }, passives: [{ type: 'followUp', id: 'followUp', damageType: 'true', multiplier: .5, charges: 5 }] }
  ),
  character(
    { id: 'zero', name: 'ZERO', label: 'Character', hp: 50, baseAttack: 40, basePhysicalDefense: 2, baseMagicalDefense: 2, speed: 30, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'zeroBattle', test: false, passive: { id: 'cutthroat', criticalRateBonus: .1, criticalDamageBonus: .25 } },
    { name: 'Zero', role: 'mainDps', level: 1, basic: { damageType: 'physical', multiplier: .5, target: 'blast', energyGain: 20, skillPointGain: 1 }, skill: { type: 'firstStrike', target: 'single', damageType: 'physical', multiplier: 1, firstHitMultiplier: 1.5, energyGain: 20 }, ultimate: { damageType: 'physical', multiplier: 1, target: 'aoe', energyCost: 100 }, passives: [{ type: 'cutthroat', criticalRateBonus: .1, criticalDamageBonus: .25 }] }
  ),
  character(
    { id: 'lily', name: 'LILY', label: 'Character', hp: 100, basePhysicalAttack: 0, baseMagicalAttack: 20, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'lily', test: false },
    { name: 'Lily', role: 'subDps', level: 1, basic: { damageType: 'magical', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'ricochet', damageType: 'magical', multiplier: .5, target: 'aoe', energyGain: 20, markTurns: 2 }, ultimate: { damageType: 'magical', multiplier: 1, target: 'aoe', energyCost: 100 }, passives: [{ type: 'exposed', defenseReduction: .1, duration: 2 }] }
  ),
  character(
    { id: 'dawn', name: 'DAWN', label: 'Character', hp: 50, baseAttack: 40, basePhysicalDefense: 2, baseMagicalDefense: 4, speed: 20, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'dawn', test: false },
    { name: 'Dawn', role: 'support', level: 1, basic: { damageType: 'magical', multiplier: 2, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'tune', target: 'ally', energyGain: 20, damageBonus: .4, duration: 1 }, ultimate: { type: 'dawnSupport', target: 'ally', energyCost: 100, energyRestore: .5, actionAdvance: 100 }, passives: [{ type: 'resourceful', skillPointCapBonus: 2, startingSkillPointBonus: 2 }] }
  ),
  character(
    { id: 'logan', name: 'LOGAN', label: 'Character', hp: 200, baseAttack: 10, basePhysicalDefense: 4, baseMagicalDefense: 4, speed: 10, stealth: 0, lifesteal: 0, echoPercent: 0, reflectPercent: 0, art: 'logan', test: false },
    { name: 'Logan', role: 'sustain', level: 1, basic: { damageType: 'physical', multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 }, skill: { type: 'bloodShield', target: 'allAllies', energyGain: 20, healthCost: .25, shieldDistribution: 'perAlly', tauntChance: .25, tauntTurns: 2 }, ultimate: { damageType: 'physical', multiplier: 1, target: 'aoe', energyCost: 100 }, passives: [{ type: 'tasteForBlood', lifesteal: .1 }] }
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

export const CHARACTER_COMBAT_DATA = Object.freeze(Object.fromEntries(CHARACTER_ROSTER.map(unit => [unit.id, Object.freeze({ ...unit.combat, stats: runtimeStats(unit) })])));

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
  ...unit.combat, name: unit.name, role: unit.category, level: unit.level,
  stats: runtimeStats(unit), basic: { damageType: unit.basicAttack.damageType, multiplier: unit.basicAttack.multiplier, target: unit.basicAttack.targetMode === 'single' ? 'random' : unit.basicAttack.targetMode },
  passives: enemyPassive(unit) ? [enemyPassive(unit)] : [], tags: unit.tags,
  stealth: unit.stealth, barrierPercent: .2
})])));

// Current in-game Rune behavior. Runtime and analysis must read these values
// instead of maintaining separate numeric Rune rules.
export const RUNE_COMBAT_RULES = Object.freeze({
  'radiant-moon': Object.freeze({ echo: .2 }),
  'eternal-sun': Object.freeze({ criticalRate: .1, criticalDamage: .25, stealth: .1 }),
  'celestial-star': Object.freeze({ ultimateAdvance: 100, cooldownTurns: 2 }),
  'dark-matter': Object.freeze({ defenseIgnore: .2, damageMultiplier: 1.1 }),
  'clear-skies': Object.freeze({ reflect: .1, shieldedReflect: .2 }),
  'infinite-space': Object.freeze({ ultimateDelay: 50 }),
  recycle: Object.freeze({ skillPoints: 1, cooldownTurns: 1 }),
  amplify: Object.freeze({ basicDamageBonus: .5, cooldownTurns: 2 }),
  united: Object.freeze({ actionAdvance: 100, cooldownTurns: 2 })
});
