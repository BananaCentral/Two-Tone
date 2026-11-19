#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TwoToneBattleEngine, roundCombatHp, roundCombatStatQuarter } from '../src/scripts/combat-engine-api.mjs';
import { CHARACTER_COMBAT_DATA, CHARACTER_UPGRADE_EFFECTS, COMBAT_EFFECT_CATALOG, COMBAT_MECHANIC_TAGS, COMBAT_PERFORMANCE_POLICY_STANDARD, COMBAT_PERFORMANCE_STANDARD, COMBAT_RESOURCE_STANDARD, ENEMY_COMBAT_DATA, getActiveCharacterUpgradeEffect, RUNE_COMBAT_RULES } from '../src/scripts/combat-definitions.mjs';

const DEFAULT_CONFIG = fileURLToPath(new URL('../Documentation/combat-simulator/example-soul-vs-slime.json', import.meta.url));
const EPSILON = 1e-9;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function roundStat(value) { return roundCombatHp(value); }
function roundStatQuarter(value) { return roundCombatStatQuarter(value); }
const DAMAGE_CHANNELS=['direct','bleed','followUp','ricochet','summon','echo','reflect'];
const POLICY_PROFILES=new Set(COMBAT_PERFORMANCE_POLICY_STANDARD.map(policy=>policy.id));
const DEFAULT_POLICY_PROFILE='mixed-v1';
const POLICY_BY_ID=new Map(COMBAT_PERFORMANCE_POLICY_STANDARD.map(policy=>[policy.id,policy]));
function newDamageBreakdown(){return Object.fromEntries(DAMAGE_CHANNELS.map(channel=>[channel,0]))}
function sourceForAttack(attacker, spec, options, action, eventType) {
  const archetypeId = attacker.archetypeId;
  let slot = action, effect = null;
  if (options.damageChannel === 'followUp') {
    slot = 'passive'; effect = attacker.passives.find(passive => passive.type === 'followUp');
  } else if (options.damageChannel === 'ricochet') {
    slot = 'skill'; effect = CHARACTER_COMBAT_DATA.lily?.skill;
  } else if (options.damageChannel === 'summon' || attacker.isHauntling) {
    slot = 'ultimate'; effect = CHARACTER_COMBAT_DATA.lily?.ultimate;
  } else {
    const kit = CHARACTER_COMBAT_DATA[archetypeId] || ENEMY_COMBAT_DATA[archetypeId];
    effect = kit?.[slot];
    if (!effect && attacker.passives.length) { slot = 'passive'; effect = attacker.passives[0]; }
  }
  const componentId = slot === 'passive'
    ? `passive:${archetypeId}/${effect?.id || effect?.type || 'passive'}`
    : `action:${archetypeId}/${slot || 'basic'}`;
  const directTagKinds = new Set(['damage.direct', 'damage.physical', 'damage.magical', 'damage.true', 'damage.critical', 'damage.conditional_multiplier']);
  const tags = [...new Set([...(effect?.mechanicTags || []).filter(tag => directTagKinds.has(tag) || tag.startsWith('trigger.') || tag.startsWith('limit.')),
    ...(spec.damageType ? [`damage.${spec.damageType}`] : []), 'damage.direct'])];
  assert(tags.every(tag => COMBAT_MECHANIC_TAGS.includes(tag)), `Unknown combat tag in event source ${componentId}.`);
  return { componentId, mechanicTags: tags, trigger: effect?.mechanicTriggers?.['damage.direct'] || `on_${slot || 'basic'}`,
    actorId: attacker.id, eventType };
}
function upgradeSourcesForAttack(attacker, action, eventType) {
  const state = upgradeState(attacker), trigger = eventType === 'direct_hit' ? `on_${action}` : 'on_successful_hit';
  return Object.values(CHARACTER_UPGRADE_EFFECTS).filter(effect => effect.character === attacker.archetypeId &&
    getActiveCharacterUpgradeEffect(effect.id, state) && Object.values(effect.mechanicTriggers).some(value => value === trigger || value === 'always_on' || value === 'on_ability_damage'))
    .map(effect => ({ componentId: `upgrade:${effect.id}`, mechanicTags: effect.mechanicTags.filter(tag => tag.startsWith('damage.') || tag.startsWith('buff.') || tag.startsWith('debuff.')),
      trigger: Object.values(effect.mechanicTriggers)[0] || trigger }));
}
function upgradeState(unit, overrides = {}) {
  return { characterDuplicates: unit.characterDuplicates || 0, premiumWeaponDuplicates: unit.premiumWeaponDuplicates || 0,
    weaponType: unit.weapon?.type || null, disabledUpgradeEffectIds: unit.disabledUpgradeEffectIds, ...overrides };
}
function upgradeValue(unit, id, key, fallback = 0, overrides = {}) {
  return getActiveCharacterUpgradeEffect(id, upgradeState(unit, overrides))?.values?.[key] ?? fallback;
}
function statAtLevel(value, level) {
  assert(Number.isFinite(value) && value >= 0, 'Stats must be finite non-negative numbers.');
  assert(Number.isInteger(level) && level >= 1 && level <= 50, 'Unit level must be an integer from 1 to 50.');
  return roundStatQuarter(value * level);
}
function mean(values) { return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 1; }
function effectiveSpeed(unit) {
 const bonus=(unit.marks||[]).filter(mark=>mark.id==='cloud-tempo').reduce((sum,mark)=>sum+(mark.speedBonus||.2),0);
 const slow=(unit.marks||[]).filter(mark=>mark.id==='cloud-slow').reduce((sum,mark)=>sum+(mark.slowPercent||.2),0);
 return Math.max(1,unit.stats.speed*(1+bonus-slow));
}
function makeRng(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function validateConfig(config) {
  assert(config && config.version === 1, 'Config must have version: 1.');
  assert(config.archetypes && typeof config.archetypes === 'object', 'Config needs an archetypes object.');
  assert(config.teams && Array.isArray(config.teams.allies) && Array.isArray(config.teams.enemies), 'Config needs teams.allies and teams.enemies arrays.');
  assert(config.teams.allies.length > 0 && config.teams.enemies.length > 0, 'Both teams need at least one unit.');
  assert(config.teams.allies.length <= 4, 'A party may have at most four allies.');
  assert(config.teams.enemies.length <= 5, 'An enemy team may have at most five enemies.');
  const ids = new Set();
  for (const side of ['allies', 'enemies']) {
    for (const instance of config.teams[side]) {
      assert(instance && typeof instance.id === 'string' && instance.id, 'Each unit needs a unique instance id.');
      assert(!ids.has(instance.id), 'Unit instance ids must be unique: ' + instance.id);
      ids.add(instance.id);
      const archetype = config.archetypes[instance.archetype];
      assert(archetype, 'Unknown archetype ' + instance.archetype + ' for ' + instance.id + '.');
      assert(archetype.stats && Number.isFinite(archetype.stats.hp) && Number.isFinite(archetype.stats.speed), 'Archetype ' + instance.archetype + ' needs HP and Speed stats.');
      assert(Number.isFinite(archetype.stats.attack) && archetype.stats.attack >= 0, 'Archetype ' + instance.archetype + ' needs a non-negative Attack stat.');
      const barrierPercent = instance.barrierPercent ?? archetype.barrierPercent ?? 0.2;
      const stealth = instance.stealth ?? archetype.stealth ?? 0;
      const echoPercent=instance.echoPercent??archetype.echoPercent??0;
      const reflectPercent=instance.reflectPercent??archetype.reflectPercent??0;
      assert(Number.isFinite(stealth)&&stealth>=0&&stealth<=1,'Stealth chance must be from 0 to 1 (0% to 100%).');
      assert(Number.isFinite(echoPercent)&&echoPercent>=0&&echoPercent<=1,'Echo percent must be from 0 to 1 (0% to 100%).');
      assert(Number.isFinite(reflectPercent)&&reflectPercent>=0&&reflectPercent<=1,'Reflect percent must be from 0 to 1 (0% to 100%).');
      assert(Number.isFinite(barrierPercent) && barrierPercent >= 0 && barrierPercent <= 1, 'Enemy barrierPercent must be from 0 to 1.');
      const critical=instance.critical??archetype.critical??{};
      assert((critical.rate===undefined||(Number.isFinite(critical.rate)&&critical.rate>=0))&&(critical.damage===undefined||(Number.isFinite(critical.damage)&&critical.damage>=0)),'Critical rate and damage must be finite non-negative values.');
      assert([instance.criticalRateBonus,archetype.criticalRateBonus,instance.criticalDamageBonus,archetype.criticalDamageBonus].every(value=>value===undefined||(Number.isFinite(value)&&value>=0)),'Critical bonuses must be finite non-negative values.');
      assert([instance.lifesteal,archetype.lifesteal].every(value=>value===undefined||(Number.isFinite(value)&&value>=0)),'Lifesteal rates must be finite non-negative values.');
      assert([instance.lifestealBonus,archetype.lifestealBonus].every(value=>value===undefined||(Number.isFinite(value)&&value>=0)),'Lifesteal bonuses must be finite non-negative values.');
      const taunt=instance.taunt??archetype.taunt;
      assert(taunt===undefined||(taunt&&Number.isFinite(taunt.rate)&&taunt.rate>=0&&taunt.rate<=1&&Number.isInteger(taunt.turns)&&taunt.turns>0),'Taunt needs a rate from 0 to 1 and a positive integer duration.');
      assert(archetype.basic && Number.isFinite(archetype.basic.multiplier) && ['physical', 'magical', 'true'].includes(archetype.basic.damageType), 'Archetype ' + instance.archetype + ' needs a typed Basic Attack.');
      assert(!archetype.passives || archetype.passives.every(p => ['followUp', 'everyNthBasic', 'rampage', 'momentum', 'exposed', 'resourceful', 'residue', 'lethalImpact', 'pursuit', 'sharpClaws', 'bleed', 'cutthroat', 'tasteForBlood', 'cloudWeightless'].includes(p.type)), 'Unsupported passive type in ' + instance.archetype + '.');
      for (const passive of archetype.passives || []) {
        if (passive.type === 'everyNthBasic') assert(Number.isInteger(passive.every) && passive.every > 0, 'everyNthBasic needs a positive integer interval.');
        if (passive.type === 'followUp') assert(Number.isFinite(passive.multiplier) && passive.multiplier >= 0, 'followUp needs a non-negative multiplier.');
        if (passive.type === 'rampage') assert(Number.isFinite(passive.damageBonus) && passive.damageBonus >= 0 && Number.isInteger(passive.maxStacks) && passive.maxStacks >= 0, 'rampage needs a non-negative damageBonus and a non-negative integer maxStacks.');
        if (passive.type === 'momentum') assert(Number.isFinite(passive.damageBonus) && passive.damageBonus >= 0 && Number.isInteger(passive.maxStacks) && passive.maxStacks >= 0, 'momentum needs a non-negative damageBonus and a non-negative integer maxStacks.');
        if (passive.type === 'bleed') assert(Number.isInteger(passive.stacksPerHit??1)&&(passive.stacksPerHit??1)>0&&Number.isInteger(passive.maxStacks??5)&&(passive.maxStacks??5)>0,'bleed needs positive integer stacksPerHit and maxStacks.');
      }
      assert(!archetype.skill || ['enhanceBasic', 'ricochet', 'tune', 'bloodShield', 'firstStrike', 'cloudRestoration'].includes(archetype.skill.type), 'Unsupported skill type in ' + instance.archetype + '.');
      assert(!archetype.ultimate || archetype.ultimate.type==='dawnSupport'||['physical', 'magical', 'true'].includes(archetype.ultimate.damageType), 'Ultimate needs a supported damage type or support handler.');
    }
  }
  const disabledPassives=config.settings?.disabledPassives;
  assert(disabledPassives===undefined||(Array.isArray(disabledPassives)&&disabledPassives.every(value=>typeof value==='string'&&value.includes(':'))),'settings.disabledPassives must be an array of character:passive keys.');
  const actionOverride=config.settings?.actionOverride;
  if(actionOverride!==undefined){
    assert(actionOverride&&typeof actionOverride.actorId==='string','Action override needs actorId.');
    assert(config.teams.allies.some(unit=>unit.id===actionOverride.actorId),'Action override actorId must identify an ally.');
    assert(Number.isInteger(actionOverride.turn)&&actionOverride.turn>0,'Action override turn must be a positive integer.');
    assert(['basic','skill','ultimate'].includes(actionOverride.action),'Action override must be basic, skill, or ultimate.');
    if(actionOverride.targetId!==undefined)assert(config.teams.allies.some(unit=>unit.id===actionOverride.targetId),'Action override targetId must identify an ally.');
  }
  const disabledCombatEffectIds=config.settings?.disabledCombatEffectIds;
  assert(disabledCombatEffectIds===undefined||(Array.isArray(disabledCombatEffectIds)&&disabledCombatEffectIds.every(id=>typeof id==='string'&&COMBAT_EFFECT_CATALOG[id])), 'settings.disabledCombatEffectIds must contain catalogued combat effect IDs.');
  const policyProfile=config.settings?.policyProfile??DEFAULT_POLICY_PROFILE;
  assert(POLICY_PROFILES.has(policyProfile),`Unknown policy profile ${policyProfile}.`);
}

const RUNE_STAT_VALUES=COMBAT_PERFORMANCE_STANDARD.baseStats;
function signatureWeaponBonus(weapon){
 if(!weapon)return 0;
 assert(['standard','premium'].includes(weapon.type),'Weapon type must be standard or premium.');
 assert(Number.isInteger(weapon.potential)&&weapon.potential>=1&&weapon.potential<=5,'Weapon potential must be from 1 to 5.');
 const level=weapon.level??1;
 assert(Number.isInteger(level)&&level>=1&&level<=50,'Weapon level must be an integer from 1 to 50.');
 const levelOnePercent=weapon.type==='standard'?31+(weapon.potential-1)*5:51+(weapon.potential-1)*25;
 return (levelOnePercent+level-1)/100;
}
function runeStatTotals(runes=[]){
 assert(Array.isArray(runes)&&runes.length<=4,'A character may equip up to four runes.');
 const totals=Object.fromEntries(Object.keys(RUNE_STAT_VALUES).map(key=>[key,0]));
 for(const rune of runes){
  assert(rune&&Object.hasOwn(RUNE_STAT_VALUES,rune.main),'Rune needs a valid main stat.');
  assert(Number.isInteger(rune.level)&&rune.level>=1&&rune.level<=5,'Rune level must be from 1 to 5.');
  assert(Array.isArray(rune.subs)&&rune.subs.length===3,'Rune needs exactly three substats.');
  assert(new Set([rune.main,...rune.subs]).size===4&&rune.subs.every(key=>Object.hasOwn(RUNE_STAT_VALUES,key)),'Rune stats must be unique within the rune.');
  totals[rune.main]+=RUNE_STAT_VALUES[rune.main]*rune.level;
  for(const key of rune.subs)totals[key]+=RUNE_STAT_VALUES[key]*.25*rune.level;
 }
 const setIds=runes.map(rune=>rune.setId);
 totals.setId=runes.length===4&&setIds[0]&&setIds.every(id=>id===setIds[0])?setIds[0]:null;
 return totals;
}
function celestialFactor(unit,key){const level=unit.celestials?.[key]??1;assert(Number.isInteger(level)&&level>=1&&level<=10,'Celestial level must be from 1 to 10.');return 1+.1*level}
function actionPlan(state,unit,action,options={}){return state.engine.resolveActionPlan({kit:unit,action,characterId:unit.archetypeId,characterDuplicates:unit.characterDuplicates||0,premiumWeaponDuplicates:unit.premiumWeaponDuplicates||0,weaponType:unit.weapon?.type||null,disabledUpgradeEffectIds:unit.disabledUpgradeEffectIds,enhanceStacks:unit.enhanceStacks||0,targetAlreadyHit:options.targetAlreadyHit??false,tuneMultiplier:options.tuneMultiplier??1,celestialMultipliers:Object.fromEntries(['basic','skill','ultimate'].map(key=>[key,celestialFactor(unit,key)]))})}
function settleActionResources(state,actor,plan,options={}){
 const intent=state.engine.resolveActionIntent({actor,battle:state,plan,enhancedStacks:options.enhancedStacks||0,payEnergyCost:!!options.payEnergyCost}),result=intent?.resources;
 if(!result)return null;
 actor.skillPointsSpent+=result.skillPointsSpent;actor.skillPointsGenerated+=result.skillPointsGained;
 actor.energySpent=(actor.energySpent||0)+result.energySpent;actor.energyGained=(actor.energyGained||0)+result.energyGained;
 return result;
}

function instantiate(config, side) {
  return config.teams[side].map((instance, index) => {
    const archetype = config.archetypes[instance.archetype];
    const disabledPassiveIds = new Set((config.settings?.disabledPassives || [])
      .filter(value => value.startsWith(`${instance.archetype}:`))
      .map(value => value.slice(instance.archetype.length + 1)));
    const disabledUpgradeEffectIds = new Set(instance.disabledUpgradeEffectIds || []);
    const level = instance.level ?? archetype.level ?? 1;
    const weapon = instance.weapon ?? archetype.weapon ?? null;
    const weaponMultiplier = 1 + signatureWeaponBonus(weapon);
    const runeTotals = runeStatTotals(instance.runes ?? archetype.runes ?? []);
    const runeStats = config.settings?.benchmarkRunePassivesOnly
      ? Object.fromEntries(Object.keys(RUNE_STAT_VALUES).map(key => [key, 0])) : runeTotals;
    const stats = Object.fromEntries(Object.entries(archetype.stats).map(([name, value]) => [name, roundStatQuarter((statAtLevel(value, level) + (runeStats[name] || 0)) * weaponMultiplier)]));
    assert(Number.isFinite(stats.attack) && stats.attack >= 0 && Number.isFinite(stats.physicalDefense) && Number.isFinite(stats.magicalDefense), 'Archetype ' + instance.archetype + ' needs Attack and both Defense stats.');
    const characterDuplicates = instance.characterDuplicates ?? archetype.characterDuplicates ?? 0;
    assert(Number.isInteger(characterDuplicates) && characterDuplicates >= 0 && characterDuplicates <= 4, 'Character duplicates must be from 0 to 4.');
    const premiumWeaponDuplicates = weapon?.type === 'premium' ? weapon.potential - 1 : 0;
    const maxEnergy = archetype.energy?.max ?? COMBAT_RESOURCE_STANDARD.maximumEnergy;
    const passives = (archetype.passives || []).filter(passive => !disabledPassiveIds.has(passive.id || passive.type)).map((passive, index) => ({
      ...passive,
      key: passive.id || passive.type + '-' + index,
      remaining: passive.type === 'followUp' ? upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.premium-duplicate.1.follow-up-charges', 'followUpCharges', passive.charges ?? Infinity) : passive.charges ?? Infinity,
      charges: passive.type === 'followUp' ? upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.premium-duplicate.1.follow-up-charges', 'followUpCharges', passive.charges) : passive.charges,
      seenSources: new Set(),
      attackCount: 0
    }));
    return {
      id: instance.id,
      slot: instance.slot ?? index,
      archetypeId: instance.archetype,
      name: instance.name || archetype.name || instance.archetype,
      role: instance.role ?? archetype.role ?? null,
      side,
      level,
      stats,
      hp: stats.hp,
      maxHp: stats.hp,
      shield: Math.max(0,instance.shield??archetype.shield??0),
      criticalRate:instance.critical?.rate??archetype.critical?.rate??.1,
      criticalDamage:instance.critical?.damage??archetype.critical?.damage??.5,
      stealth:Math.min(1,(instance.stealth??archetype.stealth??0)),
      echoPercent:Math.min(1,(instance.echoPercent??archetype.echoPercent??0)),
      reflectPercent:instance.reflectPercent??archetype.reflectPercent??0,
      runeSetId:runeTotals.setId,
      runeCooldownState:{cooldowns:{'radiant-moon':0,'eternal-sun':0,'dark-matter':0,'clear-skies':0,recycle:0,amplify:0,'celestial-star':0,united:0},cooldownStartedTurn:{}},
      eternalSunNextActionPending:false,
      unitedLink:null,
      runeTriggeredThisTurn:{recycle:false,amplify:false},
      runeShieldRemaining:0,runeShieldTurns:0,runeShieldStartedTurn:0,runeDelayImmunityByOwner:{},
      runeActivations:0,
      runeEnergyRestored:0,
      disabledPassiveIds,
      disabledUpgradeEffectIds,
      criticalRateBonus:(archetype.criticalRateBonus||0)+(instance.criticalRateBonus||0)+upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.premium-duplicate.2.critical-stats', 'criticalRateBonus')+(!disabledPassiveIds.has('cutthroat')?(archetype.passives?.find(passive=>passive.type==='cutthroat')?.criticalRateBonus||0)*(upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'zero.duplicate.1.critical-stats', 'criticalRateMultiplier', 1)-1):0),
      criticalDamageBonus:(archetype.criticalDamageBonus||0)+(instance.criticalDamageBonus||0)+upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.premium-duplicate.2.critical-stats', 'criticalDamageBonus')+(!disabledPassiveIds.has('cutthroat')?(archetype.passives?.find(passive=>passive.type==='cutthroat')?.criticalDamageBonus||0)*(upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'zero.duplicate.1.critical-stats', 'criticalDamageMultiplier', 1)-1):0),
      defenseIgnoreBonus:upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'zero.premium-duplicate.4.defense-ignore', 'defenseIgnore'),
      lifestealRate:(instance.lifesteal??archetype.lifesteal??0)+(instance.lifestealBonus||0)+(archetype.lifestealBonus||0),
      lifestealHealing:0,
      criticalHits:0,
      tune:null,
      maxBarrier: side === 'enemies' ? roundStat(stats.hp * (instance.barrierPercent ?? archetype.barrierPercent ?? 0.2)) : 0,
      barrier: side === 'enemies' ? roundStat(stats.hp * (instance.barrierPercent ?? archetype.barrierPercent ?? 0.2)) : 0,
      barrierPercent: instance.barrierPercent ?? archetype.barrierPercent ?? 0.2,
      brokenTurns: 0,
      residueStacks: 0,
      residueTurns: 0,
      residueMaxStacks: 5,
      residueDamageReductionPerStack: 0.05,
      residueResistanceReductionPerStack: 0.05,
      debuffs: [],
      marks: [],
      bleedStacks:[],
      bleedMaxStacks:archetype.passives?.find(passive=>passive.type==='bleed')?.maxStacks??5,
      tauntEffects:instance.tauntEffects??[],
      barriersBroken: 0,
      energy: Math.max(0, Math.min(maxEnergy, instance.energy ?? archetype.energy?.start ?? (side === 'allies' ? COMBAT_RESOURCE_STANDARD.startingEnergy : 0))),
      maxEnergy,
      celestials: instance.celestials ?? archetype.celestials ?? {},
      weapon,
      characterDuplicates,
      premiumWeaponDuplicates,
      enhanceSpentRemainder: 0,
      followUpActivations: 0,
      basic: archetype.basic,
      skill: archetype.skill || null,
      ultimate: archetype.ultimate || null,
      passives,
      enhanceStacks: 0,
      basicAttackCount: 0,
      damageDealt: 0,
      damageBreakdown:newDamageBreakdown(),
      damageTaken: 0,
      supportDamageAmplified:0,
      healingDone:0,
      healingReceived:0,
      shieldGranted:0,
      shieldReceived:0,
      shieldAbsorbed:0,
      hpSpent:0,
      tuneUses:0,
      tunesReceived:0,
      turnsAdvanced:0,
      skillPointsSpent:0,
      skillPointsGenerated:0,
      skillPointsGranted:0,
      energyGranted:0,
      energySpent:0,
      energyGained:0,
      tauntRedirectedHits:0,
      skillUses:0,
      firstStrikeTargets:new Set(),
      turns: 0,
      ultimateCount: 0,
      followUpCount: 0,
      aoeCount: 0,
      skillUses:0
    };
  });
}
function attackValue(unit) {
  return roundStatQuarter(unit.stats.attack * (1 + (unit.tune?.attackBonus || 0)));
}
function healFromLifesteal(state,attacker,damageDealt,eventType='direct_hit'){
 const logan=state.allies.find(unit=>unit.archetypeId==='logan'&&unit.hp>0&&!unit.disabledPassiveIds?.has('tasteForBlood'));
 const passiveRate=attacker.side==='allies'&&logan?upgradeValue(logan,'logan.duplicate.2.lifesteal','lifestealRate',.1):0;
 const rate=Math.max(0,(attacker.lifestealRate||0)+passiveRate);
 if(rate<=0||damageDealt<=0||attacker.hp<=0)return 0;
 const healing=state.engine.resolveLifesteal({attacker,damage:damageDealt,rate,eventType,
  mechanicSource:passiveRate>0?{componentId:'passive:logan/tasteForBlood',mechanicTags:['recovery.lifesteal'],trigger:'on_ally_damage'}:null,
  sourceActorId:logan?.id})?.applied||0;
 attacker.lifestealHealing=(attacker.lifestealHealing||0)+healing;
 if(healing>0&&passiveRate>.1)state.engine.recordUpgradeEffect('logan.duplicate.2.lifesteal',{actorId:logan.id,targetIds:[attacker.id],trigger:'on_ally_damage_dealt',values:{healing,lifestealRate:passiveRate}});
 state.lifestealHealingBySide[attacker.side]+=healing;
 const passiveHealing=Math.min(healing,roundStat(damageDealt*passiveRate));
 const sharedHeal=logan?upgradeValue(logan,'logan.signature.lifesteal-share','healLoganFromAllyLifesteal'):false;if(logan&&attacker!==logan&&attacker.side==='allies'&&sharedHeal){const echo=state.engine.resolveHealing({target:logan,amount:passiveHealing})?.applied||0;if(echo>0){state.engine.recordUpgradeEffect('logan.signature.lifesteal-share',{actorId:logan.id,targetIds:[logan.id],trigger:'on_ally_lifesteal',values:{healing:echo}});logan.lifestealHealing+=echo;state.lifestealHealingBySide.allies+=echo}}
 return healing;
}
function applyBleed(state,target,source,stacks=1,maxStacks=target.bleedMaxStacks??5){
 if(target.hp<=0||!Number.isInteger(stacks)||stacks<1)return 0;
 return state.engine.applyBleed({target,sourceId:source.id,stacks,maxStacks});
}
function resolveBleedTick(state,target){
 if(target.hp<=0||!target.bleedStacks.length)return 0;
 const events=state.engine.resolveBleedTick({target,units:[...state.allies,...state.enemies]}),total=events.reduce((sum,event)=>sum+event.healthDamage,0);
 for(const event of events){target.shieldAbsorbed+=event.shieldDamage;state.damageBySide[event.source.side]+=event.healthDamage;healFromLifesteal(state,event.source,event.healthDamage,'damage_over_time')}
 if(target.hp<=0)state.engine.clearUnitEffects(target,{reason:'defeat'});
 return total;
}
function tauntRateOf(attacker,target){return Math.max(0,...(attacker.tauntEffects||[]).filter(effect=>effect.turns>0&&effect.targetId===target.id).map(effect=>effect.rate))}
function defenseValue(unit, type) {
  if (type === 'physical') return unit.stats.physicalDefense;
  if (type === 'magical') return unit.stats.magicalDefense;
  return (unit.stats.physicalDefense + unit.stats.magicalDefense) / 2;
}
function damageFor(state,attacker, target, type, multiplier, runeEffects = {}) {
  const attack = attackValue(attacker);
  if (attack <= 0) return 0;
  const defenseIgnorePassive=attacker.passives.find(passive=>passive.type==='lethalImpact'||passive.type==='sharpClaws')?.defenseIgnore||0;
  const globalIgnore=Math.min(1,Math.max(0,(attacker.tune?.defenseIgnore||0)+(attacker.defenseIgnoreBonus||0)+defenseIgnorePassive));
  const darkMatter=runeEffects.darkMatter||null;
  const runeIgnore=darkMatter?.defenseIgnore||0;
  const physicalIgnore=Math.min(1,globalIgnore+runeIgnore);
  const magicalIgnore=Math.min(1,globalIgnore+runeIgnore);
  const resistance=Math.max(0,1-(target.residueStacks||0)*(target.residueResistanceReductionPerStack??.05));
  const logan=state.allies.find(unit=>unit.archetypeId==='logan');
  const shieldedDamageBonus=attacker.side==='allies'&&attacker.shield>0&&logan
    ?upgradeValue(logan,'logan.premium-duplicate.4.shielded-damage','shieldedDamageBonus'):0;
  return state.engine.resolveTypedHit({
    type, attack,
    physicalDefense:target.stats.physicalDefense, magicalDefense:target.stats.magicalDefense,
    multiplier, physicalDefenseIgnore:physicalIgnore, magicalDefenseIgnore:magicalIgnore,
    damageMultiplier:(darkMatter?.damageMultiplier||1)*(1-(attacker.residueStacks||0)*(attacker.residueDamageReductionPerStack??.05))*(1+shieldedDamageBonus),
    defenseMultiplier:resistance,
    exposedStacks:target.marks.filter(mark=>mark.id==='exposed').length,
    exposedDefenseReduction:CHARACTER_COMBAT_DATA.lily.passives.find(passive=>passive.type==='exposed')?.defenseReduction??.2
  })?.damage??0;
}
function rollCritical(state,unit,damage,forceCritical=false,criticalDamageBonus=0){
 if(damage<=0)return {damage,critical:false};
 const rate=Math.min(1,Math.max(0,(unit.criticalRate??.1)+(unit.criticalRateBonus||0)+(unit.tune?.criticalRateBonus||0)));
 const roll=state.random(),critical=forceCritical||roll<rate;
 if(critical){state.criticalHits++;unit.criticalHits=(unit.criticalHits||0)+1}
 return {damage:critical?roundStat(damage*(1+(unit.criticalDamage??.5)+(unit.criticalDamageBonus||0)+(unit.tune?.criticalDamageBonus||0)+criticalDamageBonus)):damage,critical};
}
function applyRicochet(state,sourceActor,sourceId,hits){
 const triggered=hits.filter(hit=>hit.damage>0&&hit.target.marks.some(m=>m.id==='ricochet'));
 if(!triggered.length)return;
 const lily=state.allies.find(unit=>unit.archetypeId==='lily'&&unit.hp>0);if(!lily)return;
 const targets=[...new Set(state.enemies.filter(enemy=>enemy.hp>0&&enemy.marks.some(m=>m.id==='ricochet')))];
 const sourceDamage=Math.max(...triggered.map(hit=>hit.damage));
 const eventType=hits.some(hit=>hit.eventType==='summon_hit')?'summon_hit':'direct_hit';
 const allocations=state.engine.resolveRicochetPlan({targets,sourceId,sourceDamage,eventType,damageMultiplier:lily.skill?.ricochetDamageMultiplier??.1,repeats:upgradeValue(lily,'lily.duplicate.4.ricochet-repeat','ricochetRepeats',1),secondHitMultiplier:upgradeValue(lily,'lily.duplicate.4.ricochet-repeat','ricochetSecondHitMultiplier',.5)});
 for(const entry of allocations){if(entry.target.hp<=0)continue;const attack=attackValue(lily),hits=runAttack(state,lily,[entry.target],{damageType:'true',multiplier:attack>0?entry.damage/attack:0,target:'single'},{damageChannel:'ricochet',sourceActionId:sourceId});if(hits[0]?.damage>0)lily.ricochetHits=(lily.ricochetHits||0)+1;
 }
}
function cleanse(unit, state, full = true) {
  return state.engine.clearUnitEffects(unit,{full,taunts:full});
}
function brokenDuration(speed, baseTurns) {
  const speedFactor = Math.max(0.5, Math.min(1.5, 2 - speed / 100));
  return Math.max(1, roundStat(baseTurns * speedFactor));
}
function chooseTarget(engine, actor, candidates, mode, random) {
  if (!candidates.length) return [];
  if (mode === 'aoe') return engine.resolveTargets({candidates,mode});
  let primary = mode === 'lowestHp' || (actor.side !== 'enemies' && mode !== 'random')
    ? candidates.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0]
    : candidates[Math.floor(random() * candidates.length)];
  const taunts=candidates.map(unit=>({unit,rate:tauntRateOf(actor,unit)})).filter(entry=>entry.rate>0).sort((a,b)=>b.rate-a.rate||a.unit.id.localeCompare(b.unit.id));
  for(const entry of taunts)if(random()<entry.rate){if(primary.id!==entry.unit.id)entry.unit.tauntRedirectedHits++;primary=entry.unit;break;}
  return engine.resolveTargets({candidates,mode,primary});
}
function landedTargets(hits){return hits.filter(hit=>!hit.dodged).map(hit=>hit.target)}
function reflectPercentOf(unit,state){const rune=unit.runeSetId==='clear-skies'?state.engine.resolveRuneEffect({setId:'clear-skies',trigger:'reflect',shielded:(unit.shield||0)>0}):null;return Math.max(0,Math.min(1,(unit.reflectPercent||0)+(rune?.reflect??0)))}
function restoreRuneEnergy(state,actor,amount){if(!Number.isFinite(amount)||amount<=0)return 0;const before=actor.energy;actor.energy=Math.min(actor.maxEnergy??COMBAT_RESOURCE_STANDARD.maximumEnergy,actor.energy+amount);const gained=actor.energy-before;actor.energyGained=(actor.energyGained||0)+gained;actor.energyGranted=(actor.energyGranted||0)+gained;actor.runeEnergyRestored=(actor.runeEnergyRestored||0)+gained;return gained}
function triggerDamageRunes(state,attacker,action,actionId,targetIds) {
 const prior=state.runeActionEffects.get(actionId);if(prior)return prior;
 const effects={};
 if(attacker.side==='allies'&&attacker.runeSetId==='dark-matter'&&['basic','skill','ultimate'].includes(action))effects.darkMatter=state.engine.resolveRuneTrigger({setId:'dark-matter',trigger:'abilityDamage',state:attacker.runeCooldownState,effectId:'dark-matter',turn:attacker.turns,actorId:attacker.id,targetIds:[attacker.id]});
 if(attacker.side==='allies'&&attacker.runeSetId==='radiant-moon'&&action==='skill')effects.radiantMoon=state.engine.resolveRuneTrigger({setId:'radiant-moon',trigger:'damagingSkill',state:attacker.runeCooldownState,effectId:'radiant-moon',turn:attacker.turns,actorId:attacker.id,targetIds});
 for(const effect of Object.values(effects))if(effect)attacker.runeActivations++;
 state.runeActionEffects.set(actionId,effects);return effects;
}
function runAttack(state, attacker, candidates, spec, options = {}) {
  if (!candidates.length) return [];
  const targetMode=options.targetMode||spec.target||'single',primary=options.primaryTargetId?candidates.find(target=>target.id===options.primaryTargetId):null;
  const targets=primary?state.engine.resolveTargets({candidates,mode:targetMode,primary}):chooseTarget(state.engine,attacker,candidates,targetMode,state.random);
  if (!targets.length) return [];
  const hits = [], eventType = options.damageChannel === 'followUp' ? 'follow_up_hit'
    : options.damageChannel === 'ricochet' ? 'ricochet_hit'
    : options.damageChannel === 'summon' ? 'summon_hit' : 'direct_hit';
  const actionId = options.sourceActionId ?? ++state.sourceSerial;
  const action=options.action||(spec===attacker.basic?'basic':spec===attacker.skill?'skill':spec===attacker.ultimate?'ultimate':null);
  const runeEffects=triggerDamageRunes(state,attacker,action,actionId,targets.map(target=>target.id));
  const mechanicSource=sourceForAttack(attacker,spec,options,action,eventType),additionalMechanicSources=[...upgradeSourcesForAttack(attacker,action,eventType),...(options.additionalMechanicSources||[])];
  if(runeEffects.darkMatter)additionalMechanicSources.push({componentId:'rune:dark-matter',mechanicTags:RUNE_COMBAT_RULES['dark-matter'].mechanicTags,trigger:'on_ability_damage'});
  if(action==='basic'&&attacker.runeTriggeredThisTurn?.amplify)additionalMechanicSources.push({componentId:'rune:amplify',mechanicTags:RUNE_COMBAT_RULES.amplify.mechanicTags,trigger:'on_basic'});
  const reflectMechanicSource=target=>target.runeSetId==='clear-skies'?{componentId:'rune:clear-skies',mechanicTags:RUNE_COMBAT_RULES['clear-skies'].mechanicTags,trigger:'on_incoming_attack'}:null;
  const echoMechanicSource=runeEffects.radiantMoon?{componentId:'rune:radiant-moon',mechanicTags:RUNE_COMBAT_RULES['radiant-moon'].mechanicTags,trigger:'on_damaging_skill'}:null;
  const defenseMechanicSource=target=>target.stealth>0?target.runeSetId==='eternal-sun'?{componentId:'rune:eternal-sun',mechanicTags:RUNE_COMBAT_RULES['eternal-sun'].mechanicTags,trigger:'on_incoming_attack'}:{componentId:`trait:${target.archetypeId}/stealth`,mechanicTags:['defense.stealth'],trigger:'on_incoming_attack'}:null;
  for (const target of targets) {
    const hpBefore = target.hp,shieldBefore=target.shield||0;
    const baseDamage = damageFor(state,attacker, target, spec.damageType, (options.multiplier ?? spec.multiplier)*(1-(attacker.residueStacks||0)*(attacker.residueDamageReductionPerStack??.05)),runeEffects);
    const exposedStacks=target.marks?.filter(mark=>mark.id==='exposed').length||0,barrierLily=state.allies.find(unit=>unit.archetypeId==='lily');
    const runeEcho=runeEffects.radiantMoon?.echo||0;
    const reflectExposed=target.marks?.filter(mark=>mark.id==='exposed').length||0;
    const celestialRune=attacker.side==='allies'?state.engine.resolveRuneEffect({setId:attacker.runeSetId==='celestial-star'?'celestial-star':null,trigger:'criticalStrike',ready:state.engine.isRuneReady(attacker.runeCooldownState,'celestial-star')}):null;
    const outcome=state.engine.resolveDamageSequence({target,attacker,rawDamage:baseDamage,damageType:spec.damageType,eventType,sourceId:attacker.id,actionId,mechanicSource,additionalMechanicSources,defenseMechanicSource:defenseMechanicSource(target),reflectMechanicSource:reflectMechanicSource(target),echoMechanicSource,
      primary:{stealthChance:Math.min(1,Math.max(0,target.stealth||0)),criticalRate:celestialRune?.forceCritical?1:attacker.criticalRate+(attacker.criticalRateBonus||0)+(attacker.tune?.criticalRateBonus||0)+(options.forceCritical?1:0),criticalDamage:attacker.criticalDamage+(attacker.criticalDamageBonus||0)+(attacker.tune?.criticalDamageBonus||0)+(options.criticalDamageBonus||0)+(celestialRune?.criticalDamageBonus||0),damageReduction:target.tune?.damageReduction||0,vulnerabilityMultiplier:target.side==='enemies'&&target.brokenTurns>0?1.5:1,random:state.random,
       barrierDamageMultiplier:target.side==='enemies'?1+(attacker.tune?.barrierDamageBonus||0)+exposedStacks*upgradeValue(barrierLily||{},'lily.premium-duplicate.3.exposed-barrier-damage','exposedBarrierDamagePerStack'):1,
       breakDamagePercent:.1+exposedStacks*upgradeValue(barrierLily||{},'lily.premium-duplicate.4.exposed-break-damage','exposedBreakDamagePerStack'),brokenDuration:brokenDuration(target.stats.speed,Math.max(1,state.enemyAverage/state.slowerAverage)),
       reflectPercent:reflectPercentOf(target,state),echoPercent:attacker.side!==target.side?Math.max(0,Math.min(1,(attacker.echoPercent||0)+runeEcho)):0},
      calculateReflectDamage:(amount,reflector,reflectTarget)=>{const attack=attackValue(reflector);return attack>0?damageFor(state,reflector,reflectTarget,'true',amount/attack*(1-(reflector.residueStacks||0)*(reflector.residueDamageReductionPerStack??.05))):0},
      reflect:{stealthChance:attacker.stealth||0,criticalRate:target.criticalRate+(target.criticalRateBonus||0)+(target.tune?.criticalRateBonus||0),criticalDamage:target.criticalDamage+(target.criticalDamageBonus||0)+(target.tune?.criticalDamageBonus||0),damageReduction:attacker.tune?.damageReduction||0,vulnerabilityMultiplier:attacker.side==='enemies'&&attacker.brokenTurns>0?1.5:1,random:state.random,
       barrierDamageMultiplier:1+(attacker.tune?.barrierDamageBonus||0)+reflectExposed*upgradeValue(barrierLily||{},'lily.premium-duplicate.3.exposed-barrier-damage','exposedBarrierDamagePerStack'),
       breakDamagePercent:.1+reflectExposed*upgradeValue(barrierLily||{},'lily.premium-duplicate.4.exposed-break-damage','exposedBreakDamagePerStack'),brokenDuration:brokenDuration(attacker.stats.speed,Math.max(1,state.enemyAverage/state.slowerAverage))},
      echo:{random:state.random,reflectPercent:reflectPercentOf(target,state),barrierDamageMultiplier:1,breakDamagePercent:.1+exposedStacks*upgradeValue(barrierLily||{},'lily.premium-duplicate.4.exposed-break-damage','exposedBreakDamagePerStack'),brokenDuration:brokenDuration(target.stats.speed,Math.max(1,state.enemyAverage/state.slowerAverage))}});
    if(!outcome||outcome.dodged){hits.push({target,damage:0,shieldDamage:0,barrierDamage:0,breakDamage:0,barrierRemaining:target.barrier,broken:false,critical:false,dodged:true,eventType,actionId});continue}
    if(outcome.critical){state.criticalHits++;attacker.criticalHits=(attacker.criticalHits||0)+1;if(celestialRune&&state.engine.startRuneCooldown(attacker.runeCooldownState,'celestial-star',attacker.turns,celestialRune.cooldownTurns)){attacker.runeActivations++;state.engine.recordMechanicEvent({componentId:'rune:celestial-star',mechanicTags:RUNE_COMBAT_RULES['celestial-star'].mechanicTags,trigger:'on_critical_strike',status:'applied',actorId:attacker.id,targetIds:[target.id],values:{forceCritical:celestialRune.forceCritical,criticalDamageBonus:celestialRune.criticalDamageBonus,cooldownTurns:celestialRune.cooldownTurns}})}}
    const roll={damage:outcome.damage,critical:outcome.critical},damage=outcome.damage,shieldAbsorbed=outcome.shieldDamage,breakShieldAbsorbed=outcome.breakShieldDamage,barrierDamage=outcome.barrierDamage,breakDamage=outcome.breakDamage,broken=outcome.broken;
    target.shieldAbsorbed=(target.shieldAbsorbed||0)+shieldAbsorbed+breakShieldAbsorbed;
    if(target.runeShieldRemaining>0)target.runeShieldRemaining=Math.min(target.runeShieldRemaining,Math.max(0,target.shield||0));
    const hpDamage=outcome.directHealthDamage,finalHpDamage=outcome.healthDamage;
    if(Number.isFinite(options.unbuffedMultiplier)&&attacker.tune?.sourceId){const plainBase=damageFor(state,attacker,target,spec.damageType,options.unbuffedMultiplier*(1-(attacker.residueStacks||0)*(attacker.residueDamageReductionPerStack??.05))),critFactor=baseDamage>0?roll.damage/baseDamage:1,plainDamage=roundStat(plainBase*critFactor*(1-(target.tune?.damageReduction||0))*(target.side==='enemies'&&target.brokenTurns>0?1.5:1)),plainHpDamage=Math.min(hpBefore,Math.max(0,plainDamage-shieldBefore)),amplified=Math.max(0,hpDamage-plainHpDamage),source=state.allies.find(unit=>unit.id===attacker.tune.sourceId);if(source){source.supportDamageAmplified+=amplified;if(amplified>0)state.engine.recordMechanicEvent({componentId:'action:dawn/skill',mechanicTags:CHARACTER_COMBAT_DATA.dawn.skill.mechanicTags.filter(tag=>['buff.next_basic','buff.damage'].includes(tag)),trigger:'on_tuned_basic_used',status:'resolved',actorId:source.id,targetIds:[attacker.id,target.id],actionId,values:{damageAmplified:amplified}})}}
    target.damageTaken += finalHpDamage;
    attacker.damageDealt += finalHpDamage;
    attacker.damageBreakdown[options.damageChannel||'direct']+=finalHpDamage;
    state.damageBySide[attacker.side] += finalHpDamage;
    healFromLifesteal(state,attacker,finalHpDamage,eventType);
    const hitEffects=state.engine.resolveHitEffects({actor:attacker,target,hit:outcome,action,eventType,passives:attacker.passives,characterDuplicates:attacker.characterDuplicates||0,premiumWeaponDuplicates:attacker.premiumWeaponDuplicates||0,hasPremiumWeapon:attacker.weapon?.type==='premium',allies:state.allies,isEnemyTarget:attacker.side!==target.side});
    for(const effect of hitEffects)if(effect.type==='lily-exposed-energy'&&effect.target){effect.target.energyGained=(effect.target.energyGained||0)+effect.energyGained;effect.target.energyGranted=(effect.target.energyGranted||0)+effect.energyGained}
    let reflect=null;
    if(outcome.reflect){const hit=outcome.reflect,reflectShield=hit.shieldDamage+hit.breakShieldDamage;attacker.shieldAbsorbed=(attacker.shieldAbsorbed||0)+reflectShield;if(attacker.runeShieldRemaining>0)attacker.runeShieldRemaining=Math.min(attacker.runeShieldRemaining,Math.max(0,attacker.shield||0));attacker.damageTaken+=hit.healthDamage;target.damageDealt+=hit.healthDamage;target.damageBreakdown.reflect+=hit.healthDamage;state.damageBySide[target.side]+=hit.healthDamage;healFromLifesteal(state,target,hit.healthDamage,'reflect_hit');reflect={damage:hit.damage,healthDamage:hit.healthDamage,shieldDamage:reflectShield,damageType:'true',dodged:!!hit.dodged,eventType:hit.eventType,sourceId:hit.sourceId,actionId:hit.actionId}}
    let echo=null;
    if(outcome.echo){const hit=outcome.echo,echoShield=hit.shieldDamage+hit.breakShieldDamage;target.shieldAbsorbed=(target.shieldAbsorbed||0)+echoShield;target.damageTaken+=hit.healthDamage;attacker.damageDealt+=hit.healthDamage;attacker.damageBreakdown.echo+=hit.healthDamage;state.damageBySide[attacker.side]+=hit.healthDamage;healFromLifesteal(state,attacker,hit.healthDamage,'echo_hit');echo={damage:hit.damage,healthDamage:hit.healthDamage,directHealthDamage:hit.directHealthDamage,damageType:spec.damageType,shieldAbsorbed:echoShield,echo:true,eventType:hit.eventType,sourceId:hit.sourceId,actionId:hit.actionId};if(hit.reflect){const echoReflect=hit.reflect,reflectShield=echoReflect.shieldDamage+echoReflect.breakShieldDamage;attacker.shieldAbsorbed=(attacker.shieldAbsorbed||0)+reflectShield;attacker.damageTaken+=echoReflect.healthDamage;target.damageDealt+=echoReflect.healthDamage;target.damageBreakdown.reflect+=echoReflect.healthDamage;state.damageBySide[target.side]+=echoReflect.healthDamage;healFromLifesteal(state,target,echoReflect.healthDamage,'reflect_hit');echo.reflect={damage:echoReflect.damage,healthDamage:echoReflect.healthDamage,shieldDamage:reflectShield,damageType:'true',dodged:!!echoReflect.dodged,eventType:echoReflect.eventType,sourceId:echoReflect.sourceId,actionId:echoReflect.actionId}}}
    hits.push({ target, damage: finalHpDamage, shieldDamage:shieldAbsorbed, barrierDamage, breakDamage, barrierRemaining: target.barrier, broken,critical:roll.critical,dodged:false,damageType:spec.damageType,reflect,echo,eventType,actionId });
    if(attacker.archetypeId==='zero'&&finalHpDamage>0)attacker.firstStrikeTargets.add(target.id);
    if(target.hp<=0)state.engine.clearUnitEffects(target,{reason:'defeat',taunts:true});
  }
  if (targets.length > 1) attacker.aoeCount++;
  return hits;
}
function applyResidue(state,attacker,targets){
 const passive=attacker.passives.find(entry=>entry.type==='residue');if(!passive)return;
 for(const target of targets)state.engine.applyResidue({target,maxStacks:passive.maxStacks??5,damageReductionPerStack:passive.damageReductionPerStack??.05,resistanceReductionPerStack:passive.resistanceReductionPerStack??.05,durationTurns:2});
}
function triggerFollowUps(state, sourceId, sourceActorId, hits, { action = null, enhancedStacks = 0 } = {}) {
  for (const soul of state.allies) {
    if (soul.hp <= 0) continue;
    for (const passive of soul.passives.filter(p => p.type === 'followUp')) {
      const rawTotal = roundStat(attackValue(soul, passive.damageType) * passive.multiplier * upgradeValue(soul,'soul.duplicate.1.follow-up-damage','followUpDamageMultiplier',1) * celestialFactor(soul, 'passive'));
      const allocation=state.engine.resolveFollowUpEvent({passive,ownerId:soul.id,sourceActorId,sourceId,hits,enemies:state.enemies,action,enhancedStacks,totalDamage:rawTotal,maxCharges:passive.charges??5,refundEvery:upgradeValue(soul,'soul.premium-duplicate.4.follow-up-refund','followUpRefundEvery'),characterDuplicates:soul.characterDuplicates||0,premiumWeaponDuplicates:soul.premiumWeaponDuplicates||0,weaponType:soul.weapon?.type||null,disabledUpgradeEffectIds:soul.disabledUpgradeEffectIds});if(!allocation)continue;
      soul.followUpCount++;
      soul.followUpActivations=allocation.activations;
      allocation.targets.forEach(({target,damage:share}) => {
        const divisor = attackValue(soul, passive.damageType);
        runAttack(state,soul,[target],{damageType:passive.damageType,multiplier:divisor>0?share/divisor:0,target:'single'},{damageChannel:'followUp',sourceActionId:sourceId});
      });
    }
  }
}
function refillPassives(state,unit, passiveIds) {
  for (const passive of unit.passives) {
    if (passive.type === 'followUp' && (!passiveIds || passiveIds.includes(passive.id))) {
      state.engine.refillFollowUps({passive,maxCharges:passive.charges??5});
    }
  }
}
function dawnPremiumDuplicates(unit){return unit.archetypeId==='dawn'&&unit.weapon?.type==='premium'?unit.premiumWeaponDuplicates:0}
function chooseSupportTarget(state,actor){
 const eligible=state.allies.filter(unit=>unit.hp>0&&unit.id!==actor.id);
 if(!eligible.length)return actor;
 const target=eligible[state.supportTargetCursor%eligible.length];
 state.supportTargetCursor++;
 return target;
}
function advanceTurn(state,unit,percent){return state.timeline.modify(unit.id,percent)}
function delayTurn(state,unit,percent){return state.timeline.modify(unit.id,-percent)}
function useRuneRecycle(state,actor){
 let triggered=false;
 const clear=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'skill',state:actor.runeCooldownState,effectId:'clear-skies',turn:actor.turns,actorId:actor.id,targetIds:[actor.id]});
 if(clear){const amount=roundStat(actor.maxHp*clear.shieldMaxHp);actor.shield=(actor.shield||0)+amount;actor.runeShieldRemaining+=amount;actor.runeShieldTurns=clear.shieldDurationTurns;actor.runeShieldStartedTurn=actor.turns;actor.shieldReceived+=amount;actor.shieldGranted+=amount;actor.runeActivations++;triggered=true;state.engine.recordMechanicEvent({componentId:'rune:clear-skies',mechanicTags:RUNE_COMBAT_RULES['clear-skies'].mechanicTags,trigger:'on_skill',status:'applied',actorId:actor.id,targetIds:[actor.id],values:{shieldGranted:amount,shieldMaxHp:clear.shieldMaxHp,durationTurns:clear.shieldDurationTurns,reflectWhileShielded:RUNE_COMBAT_RULES['clear-skies'].reflect}})}
 if(!actor.runeTriggeredThisTurn.recycle){const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId==='recycle'?'recycle':null,trigger:'skill',state:actor.runeCooldownState,effectId:'recycle',turn:actor.turns,actorId:actor.id,targetIds:[actor.id]});if(effect){const before=state.skillPoints;state.skillPoints=Math.min(state.skillPointCap,state.skillPoints+effect.skillPoints);const restored=state.skillPoints-before;actor.skillPointsGenerated+=restored;actor.skillPointsGranted+=restored;advanceTurn(state,actor,effect.actionAdvance);actor.turnsAdvanced+=effect.actionAdvance/100;actor.runeActivations++;actor.runeTriggeredThisTurn.recycle=true;triggered=true;state.engine.recordMechanicEvent({componentId:'rune:recycle',mechanicTags:RUNE_COMBAT_RULES.recycle.mechanicTags,trigger:'on_skill',status:'applied',actorId:actor.id,targetIds:[actor.id],values:{skillPointsGained:restored,skillPointsBefore:before,skillPointsAfter:state.skillPoints,actionAdvance:effect.actionAdvance}})}}
 return triggered;
}
function triggerUnited(state,actor,target){
 if(actor.skill?.target!=='ally'||!target||target.side!=='allies'||target.id===actor.id||actor.unitedLink)return false;const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'allySkill',state:actor.runeCooldownState,effectId:'united',turn:actor.turns,actorId:actor.id,targetIds:[target.id]});if(!effect)return false;
 actor.unitedLink={targetId:target.id,actionsRemaining:effect.linkActions,cooldownAfterLinkTurns:effect.cooldownAfterLinkTurns};actor.runeActivations++;state.engine.recordMechanicEvent({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'on_ally_skill',status:'linked',actorId:actor.id,targetIds:[actor.id,target.id],values:{linkedActions:effect.linkActions,cooldownAfterLinkTurns:effect.cooldownAfterLinkTurns}});return true;
}
function expireUnitedLink(state,owner,targetId){const link=owner.unitedLink;if(!link||link.targetId!==targetId)return false;owner.unitedLink=null;state.engine.startRuneCooldown(owner.runeCooldownState,'united',owner.turns,link.cooldownAfterLinkTurns);state.engine.recordMechanicEvent({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'after_link_expired',status:'expired',actorId:owner.id,targetIds:[owner.id,targetId],values:{cooldownTurns:link.cooldownAfterLinkTurns,linkedActions:link.actionsRemaining}});return true}
function triggerUnitedLinkedBasics(state,actingAlly,chain=new Set([actingAlly.id])){
 if(!actingAlly||actingAlly.hp<=0)return 0;let attacks=0;
 for(const owner of state.allies){const link=owner.unitedLink;if(owner.hp<=0||!link||link.targetId!==actingAlly.id||link.actionsRemaining<=0||chain.has(owner.id))continue;
  const enemies=state.enemies.filter(enemy=>enemy.hp>0);if(!enemies.length)break;
  const plan=actionPlan(state,owner,'basic');if(!plan||!settleActionResources(state,owner,plan))continue;
  const target=enemies[Math.floor(state.random()*enemies.length)],sourceId=++state.sourceSerial;owner.basicAttackCount++;
  const hits=runAttack(state,owner,enemies,owner.basic,{multiplier:plan.multiplier*RUNE_COMBAT_RULES.united.basicDamageMultiplier,targetMode:owner.basic.target||'single',primaryTargetId:target.id,action:'basic',sourceActionId:sourceId,additionalMechanicSources:[{componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'on_linked_ally_action'}]});
  triggerFollowUps(state,sourceId,owner.id,hits);applyRicochet(state,owner,sourceId,hits);attacks++;
  const damage=hits.reduce((sum,hit)=>sum+(hit.damage||0)+(hit.shieldDamage||0)+(hit.barrierDamage||0),0);
  state.engine.recordMechanicEvent({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'on_linked_ally_action',status:'applied',actorId:owner.id,targetIds:[actingAlly.id,target.id],actionId:sourceId,values:{basicAttack:true,damage,damageMultiplier:RUNE_COMBAT_RULES.united.basicDamageMultiplier,linkedAlly:actingAlly.id,linkedActions:link.actionsRemaining}});expireUnitedLink(state,owner,actingAlly.id);
  attacks+=triggerUnitedLinkedBasics(state,owner,new Set([...chain,owner.id]));
 }
 return attacks;
}
function ageUnitedLinks(state,actingAlly){
 for(const owner of state.allies)expireUnitedLink(state,owner,actingAlly.id);
}
function applyUltimateRuneEffects(state,actor,hits=[]){
 const infinite=state.engine.resolveRuneEffect({setId:actor.runeSetId,trigger:'ultimate'});
 if(infinite){const targets=state.enemies.filter(enemy=>enemy.hp>0&&(enemy.runeDelayImmunityByOwner?.[actor.id]||0)<=0);for(const enemy of targets){delayTurn(state,enemy,infinite.actionDelay);enemy.runeDelayImmunityByOwner[actor.id]=RUNE_COMBAT_RULES['infinite-space'].immunityTurns}if(targets.length){actor.runeActivations++;state.engine.recordMechanicEvent({componentId:'rune:infinite-space',mechanicTags:RUNE_COMBAT_RULES['infinite-space'].mechanicTags,trigger:'on_ultimate',status:'applied',actorId:actor.id,targetIds:targets.map(enemy=>enemy.id),values:{actionDelay:infinite.actionDelay,targetsAffected:targets.length,immunityTurns:RUNE_COMBAT_RULES['infinite-space'].immunityTurns}})}}
}
function amplifyBasic(state,actor){
 const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'basic',state:actor.runeCooldownState,effectId:'amplify',turn:actor.turns,actorId:actor.id,targetIds:[actor.id]});if(!effect)return 1;
 actor.runeTriggeredThisTurn.amplify=true;actor.runeActivations++;return 1+effect.damageBonus;
}
function applyDawnTune(state,actor,target,plan=actionPlan(state,actor,'skill')){
 const premium=dawnPremiumDuplicates(actor),duplicates=actor.characterDuplicates||0;
 const result=state.engine.resolveDawnTune({actor,target,plan,characterDuplicates:duplicates,premiumWeaponDuplicates:premium,weaponType:actor.weapon?.type||null});if(!result)return false;
 if(result.effectApplied){actor.tuneUses++;target.tunesReceived++}
 if(result.actionAdvance)target.turnsAdvanced+=result.actionAdvance/100;
 return true;
}
function applyCloudActionPassive(state,actor){
 const advance=state.engine.resolveCloudActionPassive({actor,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,weaponType:actor.weapon?.type||null});
 actor.turnsAdvanced+=advance/100;return advance;
}
function applyCloudRestoration(state,actor,plan,actionOverride=null){
 const target=state.allies.find(unit=>unit.id===actionOverride?.targetId&&unit.hp>0)||chooseSupportTarget(state,actor);
 const result=state.engine.resolveCloudRestoration({actor,target,allies:state.allies.filter(unit=>!unit.isHauntling),plan,speed:effectiveSpeed(actor),characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,weaponType:actor.weapon?.type||null});
 if(!result)return false;
 actor.healingDone=(actor.healingDone||0)+result.healing;
 for(const entry of result.recipients)entry.target.healingReceived=(entry.target.healingReceived||0)+entry.applied;
 target.turnsAdvanced+=result.actionAdvance/100;actor.restorationUses=(actor.restorationUses||0)+1;
 applyCloudActionPassive(state,actor);useRuneRecycle(state,actor);triggerUnited(state,actor,target);return true;
}
function resolveAllyUltimate(state,actor){
 const ultimate=actor.ultimate;if(!ultimate)return false;
 const basePlan=actionPlan(state,actor,'ultimate'),sunReady=actor.runeSetId==='eternal-sun'&&state.engine.isRuneReady(actor.runeCooldownState,'eternal-sun'),plan=basePlan?{...basePlan,energyCost:Math.max(0,basePlan.energyCost-(sunReady?RUNE_COMBAT_RULES['eternal-sun'].ultimateEnergyReduction:0))}:null,cost=plan?.energyCost??Infinity;
 if(actor.energy<cost||!settleActionResources(state,actor,plan,{payEnergyCost:true}))return false;
 if(sunReady){state.engine.resolveRuneTrigger({setId:'eternal-sun',trigger:'ultimate',actorId:actor.id,targetIds:[actor.id]});actor.eternalSunNextActionPending=true;actor.runeActivations++;}
 actor.ultimateCount++;
 if(plan.type==='dawnSupport'){
  const target=chooseSupportTarget(state,actor),result=state.engine.resolveDawnUltimate({actor,target,battle:state,plan,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:dawnPremiumDuplicates(actor),weaponType:actor.weapon?.type||null});if(!result)return false;
  target.energyGranted+=result.energyGained;target.energyGained+=result.energyGained;actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained;target.turnsAdvanced+=result.actionAdvance/100;
  applyUltimateRuneEffects(state,actor,[]);triggerUnitedLinkedBasics(state,actor);
 }else{
  const sourceId=++state.sourceSerial;
  const hits=runAttack(state,actor,state.enemies.filter(unit=>unit.hp>0),ultimate,{multiplier:plan.multiplier,sourceActionId:sourceId});
  if(actor.archetypeId==='cloud'){
   const target=state.enemies.find(unit=>unit.id===hits.find(hit=>hit.target)?.target);
   if(target)state.engine.resolveCloudUltimateEffects({actor,target,enemies:state.enemies,plan,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,weaponType:actor.weapon?.type||null});
   applyCloudActionPassive(state,actor);
  }
  applyUltimateRuneEffects(state,actor,hits);applyRicochet(state,actor,sourceId,hits);triggerFollowUps(state,sourceId,actor.id,hits);triggerUnitedLinkedBasics(state,actor);
  if(actor.archetypeId==='zero'){
   const result=state.engine.resolveZeroUltimateEffects({actor,enemies:state.enemies,battle:state,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,hasPremiumWeapon:actor.weapon?.type==='premium'});
   if(result){actor.turnsAdvanced+=result.actorAdvance/100;actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained;actor.energyGained+=result.energyGained}
  }
 if(actor.archetypeId==='lily'){
   const result=state.engine.resolveLilyPremiumUltimateEffects({actor,allies:state.allies,battle:state,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.weapon?.type==='premium'?(actor.premiumWeaponDuplicates||0):0,hasPremiumWeapon:actor.weapon?.type==='premium'});
   if(result){actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained;for(const entry of result.energy){const ally=state.allies.find(unit=>unit.id===entry.id);if(ally){ally.energyGranted+=entry.energyGained;ally.energyGained+=entry.energyGained;ally.turnsAdvanced+=entry.actionAdvance/100}}}
  }
  if(actor.archetypeId==='logan'){
   const result=state.engine.resolveLoganUltimateEffects({actor,battle:state,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,hasPremiumWeapon:actor.weapon?.type==='premium'});
   if(result){actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained}
  }
  if(ultimate.refillFollowUps)refillPassives(state,actor);
  if(actor.archetypeId==='lily'&&state.enemies.some(unit=>unit.hp>0)){
   const summonPlan=state.engine.resolveSummonPlan({owner:actor,characterDuplicates:actor.characterDuplicates||0,sourceId}),summon={...actor,id:summonPlan.id,name:summonPlan.name,isHauntling:true,immediateOnSpawn:summonPlan.immediateOnSpawn,turnsRemaining:summonPlan.durationTurns,hp:summonPlan.hp,maxHp:summonPlan.maxHp,energy:0,ultimate:null,skill:null,basic:{damageType:summonPlan.damageType,multiplier:summonPlan.multiplier,target:summonPlan.target},passives:[],turns:0,damageDealt:0,damageBreakdown:newDamageBreakdown(),damageTaken:0,supportDamageAmplified:0,shieldGranted:0,shieldReceived:0,shieldAbsorbed:0,hpSpent:0,tuneUses:0,tunesReceived:0,turnsAdvanced:0,skillPointsSpent:0,skillPointsGenerated:0,skillPointsGranted:0,energyGranted:0,tauntRedirectedHits:0,skillUses:0,followUpCount:0,ultimateCount:0,aoeCount:0};
   state.allies.push(summon);
  }
 }
 return true;
}
function resolveReadyUltimates(state,scheduledActor){
 const forced=state.actionOverride?.actorId===scheduledActor?.id&&state.actionOverride.turn===scheduledActor.turns&&state.actionOverride.action==='ultimate'?scheduledActor:null;
 for(const actor of state.allies){
  if(actor.hp<=0||actor.isHauntling||!actor.ultimate)continue;
  const baseCost=actionPlan(state,actor,'ultimate')?.energyCost??Infinity,cost=Math.max(0,baseCost-(actor.runeSetId==='eternal-sun'&&state.engine.isRuneReady(actor.runeCooldownState,'eternal-sun')?RUNE_COMBAT_RULES['eternal-sun'].ultimateEnergyReduction:0));
  if(actor.energy<cost)continue;
  if(state.actionOverride?.actorId===actor.id&&state.actionOverride.action==='ultimate'&&actor!==forced)continue;
  const policy=POLICY_BY_ID.get(state.policyProfile)||POLICY_BY_ID.get(DEFAULT_POLICY_PROFILE);
  if(actor!==forced&&state.policyRandom()>=policy.ultimateUseProbability)continue;
  const before=actor.ultimateCount;
  if(resolveAllyUltimate(state,actor)&&actor===forced){state.actionOverrideObserved=true;state.actionOverrideResolved='ultimate';state.actionOverrideStatus='executed'}
  if(actor===forced&&actor.ultimateCount===before)state.actionOverrideStatus='insufficient_energy';
  if(!state.enemies.some(enemy=>enemy.hp>0))break;
 }
}
function completeEternalSunNextAction(state,actor){if(!actor.eternalSunNextActionPending)return false;const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId==='eternal-sun'?'eternal-sun':null,trigger:'nextAction',state:actor.runeCooldownState,effectId:'eternal-sun',turn:actor.turns,actorId:actor.id,targetIds:[actor.id]});actor.eternalSunNextActionPending=false;if(!effect)return false;const energyGained=restoreRuneEnergy(state,actor,effect.energyRestore);actor.runeActivations++;state.engine.recordMechanicEvent({componentId:'rune:eternal-sun',mechanicTags:RUNE_COMBAT_RULES['eternal-sun'].mechanicTags,trigger:'after_next_action',status:'applied',actorId:actor.id,targetIds:[actor.id],values:{energyGained,cooldownTurns:effect.cooldownTurns}});return true}
function resolveAllyAction(state, actor) {
  let foes = state.enemies.filter(unit => unit.hp > 0);
  if (!foes.length) return;
  const actionOverrideConfig=state.actionOverride?.actorId===actor.id&&state.actionOverride.turn===actor.turns?state.actionOverride:null;
  const actionOverride=actionOverrideConfig?.action??null;
  if(actor.isHauntling){
    const id=++state.sourceSerial,hits=runAttack(state,actor,foes,{damageType:'true',multiplier:actor.basic?.multiplier??1,target:'aoe'},{multiplier:celestialFactor(actor,'ultimate'),damageChannel:'summon',sourceActionId:id});
    const lily=state.allies.find(unit=>unit.archetypeId==='lily'&&unit.hp>0);
    if(lily)for(const target of landedTargets(hits))state.engine.resolveHitEffects({actor:lily,target,hit:{dodged:false},action:'summon',eventType:'summon_hit',passives:lily.passives,characterDuplicates:lily.characterDuplicates||0,premiumWeaponDuplicates:lily.weapon?.type==='premium'?(lily.premiumWeaponDuplicates||0):0,hasPremiumWeapon:lily.weapon?.type==='premium',isEnemyTarget:true});
    applyRicochet(state,actor,id,hits);triggerFollowUps(state,id,actor.id,hits);
    state.engine.advanceSummonTurn(actor);return;
  }
  const skill = actor.skill;
  const hasSkillResources=state.skillPoints>0;
  const policy=POLICY_BY_ID.get(state.policyProfile)||POLICY_BY_ID.get(DEFAULT_POLICY_PROFILE);
  const chooseSkill=actionOverride==='skill'||(actionOverride===null&&state.policyRandom()<policy.skillProbability);
  const canUseSkill=hasSkillResources&&chooseSkill;
  if(canUseSkill){
  if(skill?.type==='bloodShield'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const recipients=state.allies.filter(unit=>unit.hp>0),result=state.engine.resolveLoganBloodShield({actor,allies:recipients,enemies:state.enemies,plan,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0});if(!result)return;
    actor.hpSpent+=result.healthCost;for(const entry of result.shields){entry.target.shieldReceived+=entry.amount;actor.shieldGranted+=entry.amount}
    useRuneRecycle(state,actor);triggerUnited(state,actor,recipients[0]);
    return;
  }
  if(skill?.type==='tune'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const target=state.allies.find(unit=>unit.id===actionOverrideConfig?.targetId&&unit.hp>0)||chooseSupportTarget(state,actor);applyDawnTune(state,actor,target,plan);useRuneRecycle(state,actor);triggerUnited(state,actor,target);return;
  }
  if(skill?.type==='cloudRestoration'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    applyCloudRestoration(state,actor,plan,actionOverrideConfig);return;
  }
  if(skill?.type==='firstStrike'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const target=foes.slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id.localeCompare(b.id))[0];
    if(target){const sourceId=++state.sourceSerial,plan=actionPlan(state,actor,'skill',{targetAlreadyHit:actor.firstStrikeTargets.has(target.id)}),hits=runAttack(state,actor,[target],skill,{multiplier:plan.multiplier,targetMode:'single',sourceActionId:sourceId});triggerFollowUps(state,sourceId,actor.id,hits)}
    useRuneRecycle(state,actor);return;
  }
  if (skill?.type === 'enhanceBasic') {
    while (state.skillPoints > 0 && actor.enhanceStacks < (skill.maxStacks ?? Infinity)) {
      const plan=actionPlan(state,actor,'skill'),result=state.engine.resolveEnhanceAction({actor,battle:state,plan,currentStacks:actor.enhanceStacks,maxStacks:skill.maxStacks??Infinity,premiumWeapon:actor.weapon?.type==='premium',spendingRemainder:actor.enhanceSpentRemainder||0});if(!result)break;
      actor.enhanceStacks=result.enhanceStacks;actor.enhanceSpentRemainder=result.spendingRemainder;
      actor.skillPointsSpent+=result.resources.skillPointsSpent;actor.skillPointsGenerated+=result.resources.skillPointsGained+result.refundedSkillPoints;actor.skillPointsGranted+=result.refundedSkillPoints;
      state.skillUses++;actor.skillUses++;
      useRuneRecycle(state,actor);
    }
  }
  if(skill?.type==='ricochet'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const sourceId=++state.sourceSerial,hits=runAttack(state,actor,foes,skill,{multiplier:plan.multiplier,targetMode:plan.target||'aoe',sourceActionId:sourceId});
    useRuneRecycle(state,actor);
    applyRicochet(state,actor,sourceId,hits);
    triggerFollowUps(state,sourceId,actor.id,hits);return;
  }
  }
  const basic = actor.basic;
  const stacks = basic.benchmarkSlot ? 0 : actor.enhanceStacks;
  const tunedBasicFactor=actor.tune?.basicEnhanced?1+actor.tune.damageBonus:1,plan=actionPlan(state,actor,'basic',{tuneMultiplier:tunedBasicFactor});
  const targetMode=stacks>0?(plan.target||basic.target):basic.target;
  const lilyBasic=actor.archetypeId==='lily';
  const basicMultiplier=plan.multiplier;
  const amplify=basic.benchmarkSlot?1:amplifyBasic(state,actor);
  const untunedPlan=actor.tune?.basicEnhanced?actionPlan(state,actor,'basic'):plan;
  if(!settleActionResources(state,actor,plan,{enhancedStacks:stacks,payEnergyCost:basic.benchmarkSlot==='ultimate'}))return;
  if(actor.archetypeId==='cloud'){
   state.engine.applyCloudBasicTempo({actor,allies:state.allies.filter(unit=>!unit.isHauntling),plan,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,weaponType:actor.weapon?.type||null});
   applyCloudActionPassive(state,actor);
  }
  const sourceId=++state.sourceSerial;
  const hits = runAttack(state, actor, foes, basic, { multiplier:basicMultiplier*amplify,unbuffedMultiplier:actor.tune?.basicEnhanced?untunedPlan.multiplier*amplify:undefined,targetMode,sourceActionId:sourceId });
  actor.basicAttackCount++;
  if(actor.tune?.basicEnhanced){const tuneSource=state.allies.find(unit=>unit.id===actor.tune.sourceId);actor.tune.basicEnhanced=false;const tunedSpBefore=state.skillPoints;state.skillPoints=Math.min(state.skillPointCap,state.skillPoints+(actor.tune.skillPointReturn||0));const refund=state.skillPoints-tunedSpBefore;actor.skillPointsGenerated+=refund;if(tuneSource){tuneSource.skillPointsGranted+=refund;tuneSource.skillPointsGenerated+=refund;if(refund>0)state.engine.recordMechanicEvent({componentId:'action:dawn/skill',mechanicTags:['resource.skill_point'],trigger:'on_tuned_basic_used',status:'applied',actorId:tuneSource.id,targetIds:[actor.id],actionId:sourceId,values:{skillPointsGained:refund,skillPointsBefore:tunedSpBefore,skillPointsAfter:state.skillPoints}})}}
  actor.enhanceStacks = 0;
  applyRicochet(state,actor,sourceId,hits);triggerFollowUps(state, sourceId, actor.id, hits,{action:'basic',enhancedStacks:stacks});
}
function resolveEnemyAction(state, actor) {
  const targets = state.allies.filter(unit => unit.hp > 0);
  if (!targets.length) return;
  const basic = actor.basic;
  const rampage=actor.passives.find(passive=>passive.type==='rampage'),momentum=actor.passives.find(passive=>passive.type==='momentum');
  const passive=actor.passives.find(value=>['rampage','momentum','pursuit'].includes(value.type)||value.type==='everyNthBasic');
  const passiveId=passive?.id||(passive?.type==='everyNthBasic'?'slimy':passive?.type);
  const plan=state.engine.resolveEnemyBasicPlan({ownerId:actor.archetypeId,actorId:actor.id,basic:{...basic,targetMode:basic.target},passive:passive?{...passive,id:passiveId}:null,attackCount:actor.basicAttackCount||0,rampageStacks:rampage?.stacks||0,momentumStacks:momentum?.stacks||0,debuffMultiplier:(actor.debuffs||[]).reduce((value,debuff)=>value*(debuff.damageMultiplier??1),1)});
  actor.basicAttackCount=plan.nextAttackCount;
  const hits = runAttack(state, actor, targets, basic, { targetMode:plan.target, multiplier:plan.multiplier });
  if(plan.pursuitAdvance){advanceTurn(state,actor,plan.pursuitAdvance);actor.turnsAdvanced+=plan.pursuitAdvance/100}
  applyResidue(state,actor,landedTargets(hits));
  if (rampage && hits.some(hit => hit.damage > 0)) rampage.stacks = plan.nextRampageStacks;
  if (momentum) momentum.stacks = plan.nextMomentumStacks;
}
function simulateBattle(config, seed = 1, maxActionsOverride = null) {
  validateConfig(config);
  const random = makeRng(seed);
  const allies = instantiate(config, 'allies');
  const enemies = instantiate(config, 'enemies');
  const premiumLily=allies.find(unit=>unit.archetypeId==='lily'&&upgradeValue(unit,'lily.premium-duplicate.2.entry-marks','entryRicochetTurns')>0);
  const allyAverage = mean(allies.map(effectiveSpeed));
  const enemyAverage = mean(enemies.map(effectiveSpeed));
  const slowerAverage = Math.min(allyAverage, enemyAverage);
  const settings = config.settings || {};
  const state = {
    allies, enemies, random, policyRandom:makeRng((seed^0x9e3779b9)>>>0), sourceSerial: 0, supportTargetCursor: seed,
    policyProfile:settings.policyProfile??DEFAULT_POLICY_PROFILE,
    actionOverride:settings.actionOverride??null,
    actionOverrideObserved:false,
    actionOverrideResolved:null,
    actionOverrideStatus:settings.actionOverride ? 'pending' : null,
    skillPointCap: (settings.skillPointCap ?? 5)+(allies.some(unit=>unit.passives.some(passive=>passive.type==='resourceful'))?2:0),
    skillPoints: 0,
    skillUses: 0,
    damageBySide: { allies: 0, enemies: 0 },
    lifestealHealingBySide: { allies: 0, enemies: 0 },
    actions: 0, allyTurns: 0, enemyTurns: 0, enemyAverage, slowerAverage,
    maxActions: maxActionsOverride ?? settings.maxActions ?? 2000, currentTime:0,criticalHits:0,runeActionEffects:new Map(),
    engine: new TwoToneBattleEngine({ disabledCombatEffectIds: settings.disabledCombatEffectIds })
  };
  state.timeline=state.engine.timeline;
  if(premiumLily)for(const enemy of enemies){const soulMarkTurns=upgradeValue(premiumLily,'lily.premium-duplicate.2.entry-marks','entrySoulMarkTurns'),ricochetTurns=upgradeValue(premiumLily,'lily.premium-duplicate.2.entry-marks','entryRicochetTurns');if(soulMarkTurns)state.engine.setTimedMark({target:enemy,mark:{id:'soul-mark',turns:soulMarkTurns}});if(ricochetTurns)state.engine.setTimedMark({target:enemy,mark:{id:'ricochet',turns:ricochetTurns,sources:[]}});state.engine.recordUpgradeEffect('lily.premium-duplicate.2.entry-marks',{actorId:premiumLily.id,targetIds:[enemy.id],trigger:'on_enemy_enter',values:{soulMarkTurns,ricochetTurns}})}
  const resourceful=allies.some(unit=>unit.passives.some(passive=>passive.type==='resourceful'));
  state.skillPoints=Math.min(state.skillPointCap,(settings.initialSkillPoints??3)+(resourceful?2:0));
  state.engine.recordBattleStartEffects([...allies,...enemies]);
  if(resourceful){const dawn=allies.find(unit=>unit.archetypeId==='dawn'&&!unit.disabledPassiveIds?.has('resourceful'));state.engine.recordAuthoredEffect({ownerId:'dawn',slot:'passive',effectId:'resourceful',trigger:'battle_start',actorId:dawn?.id,targetIds:allies.filter(unit=>unit.hp>0).map(unit=>unit.id),values:{skillPointCapacityBonus:2,startingSkillPointsBonus:2,skillPointCap:state.skillPointCap,startingSkillPoints:state.skillPoints}})}
  while (state.engine.resolveBattleOutcome({allies,enemies,actionLimitReached:state.actions>=state.maxActions})==='ongoing') {
    const living = [...allies, ...enemies].filter(unit => unit.hp > 0);
    const timelineUnits=living.map(unit=>({id:unit.id,speed:effectiveSpeed(unit),faction:unit.side==='enemies'?'enemy':'ally',summon:!!unit.isHauntling}));
    const scheduled=state.engine.scheduleTurn({units:timelineUnits,alliedMembers:allies.filter(unit=>!unit.isHauntling).map(unit=>({id:unit.id,speed:effectiveSpeed(unit)})),enemyMembers:enemies.map(unit=>({id:unit.id,speed:effectiveSpeed(unit)})),immediateSummonIds:living.filter(unit=>unit.immediateOnSpawn).map(unit=>unit.id)});
    for(const unit of living)if(unit.immediateOnSpawn)delete unit.immediateOnSpawn;
    if(!scheduled)break;
    state.currentTime=scheduled.clock;
    const actor=living.find(unit=>unit.id===scheduled.id);
    if(!actor)continue;
    state.actions++;
    actor.turns++;
    actor.runeTriggeredThisTurn={recycle:false,amplify:false};
    const isOverriddenActor=state.actionOverride?.actorId===actor.id&&state.actionOverride.turn===actor.turns;
    const priorSkills=actor.skillUses,priorUltimates=actor.ultimateCount;
    if(isOverriddenActor)state.actionOverrideObserved=true;
    resolveReadyUltimates(state,actor);
    if (actor.side === 'allies') {
      state.allyTurns++;
      resolveBleedTick(state, actor);
      if (actor.hp <= 0) continue;
      const actionsBeforeEternalSun=[actor.basicAttackCount,actor.skillUses];if(state.enemies.some(unit=>unit.hp>0))resolveAllyAction(state, actor);if(actor.basicAttackCount>actionsBeforeEternalSun[0]||actor.skillUses>actionsBeforeEternalSun[1])completeEternalSunNextAction(state,actor);
      triggerUnitedLinkedBasics(state,actor);
      ageUnitedLinks(state,actor);
      if(isOverriddenActor){
        state.actionOverrideResolved=actor.ultimateCount>priorUltimates?'ultimate':actor.skillUses>priorSkills?'skill':'basic';
        if(state.actionOverrideResolved===state.actionOverride.action)state.actionOverrideStatus='executed';
        else if(state.actionOverride.action==='skill'&&actor.skillUses===priorSkills)state.actionOverrideStatus='insufficient_skill_points';
        else if(state.actionOverride.action==='ultimate'&&actor.ultimateCount===priorUltimates)state.actionOverrideStatus='insufficient_energy';
        else state.actionOverrideStatus='action_unavailable';
      }
    } else {
      state.enemyTurns++;
      resolveBleedTick(state,actor);
      if(actor.hp<=0)continue;
      if(!state.enemies.some(unit=>unit.hp>0)){}
      else if (actor.brokenTurns > 0) {
        actor.brokenTurns--;
        if (actor.brokenTurns === 0) {
          actor.barrier = actor.maxBarrier;
          cleanse(actor,state);
          state.timeline.modify(actor.id,100);
        }
      } else {resolveEnemyAction(state, actor)}
    }
    state.engine.ageUnitEffects(actor,{event:'affected_turn_end'});
    if(actor.side==='allies'){
      state.engine.ageRuneCooldowns(actor.runeCooldownState,actor.turns,['radiant-moon','eternal-sun','dark-matter','clear-skies','recycle','amplify','celestial-star','united']);
      if(actor.runeShieldTurns>0&&actor.runeShieldStartedTurn<actor.turns){actor.runeShieldTurns--;if(!actor.runeShieldTurns&&actor.runeShieldRemaining>0){actor.shield=Math.max(0,(actor.shield||0)-actor.runeShieldRemaining);actor.runeShieldRemaining=0}}
    }else for(const ownerId of Object.keys(actor.runeDelayImmunityByOwner||{})){actor.runeDelayImmunityByOwner[ownerId]=Math.max(0,actor.runeDelayImmunityByOwner[ownerId]-1);if(!actor.runeDelayImmunityByOwner[ownerId])delete actor.runeDelayImmunityByOwner[ownerId]}
  }
  const outcome=state.engine.resolveBattleOutcome({allies,enemies,actionLimitReached:state.actions>=state.maxActions}),winner=outcome==='defeat'?'enemies':outcome==='victory'?'allies':outcome==='incomplete'?'incomplete':outcome;
  if(state.actionOverride&&state.actionOverrideStatus==='pending'){
    const requestedActor=allies.find(unit=>unit.id===state.actionOverride.actorId);
    state.actionOverrideStatus=!requestedActor||requestedActor.hp<=0?'actor_defeated_before_action'
      :requestedActor.turns<state.actionOverride.turn?'battle_ended_before_action':'actor_unable_to_take_action';
  }
  const unitDetails=allies.filter(unit=>!unit.isHauntling).map(unit=>({id:unit.id,archetype:unit.archetypeId,role:unit.role,stats:{...unit.stats},hp:unit.hp,maxHp:unit.maxHp,shield:unit.shield||0,damage:unit.damageDealt,damageBreakdown:{...unit.damageBreakdown},damageTaken:unit.damageTaken,criticalHits:unit.criticalHits||0,supportDamageAmplified:unit.supportDamageAmplified,healingDone:unit.healingDone||0,healingReceived:unit.healingReceived||0,shieldGranted:unit.shieldGranted,shieldReceived:unit.shieldReceived,shieldAbsorbed:unit.shieldAbsorbed,hpSpent:unit.hpSpent,lifestealHealing:unit.lifestealHealing||0,turns:unit.turns,skills:unit.skillUses,ultimates:unit.ultimateCount,followUps:unit.followUpCount,tuneUses:unit.tuneUses,tunesReceived:unit.tunesReceived,turnsAdvanced:unit.turnsAdvanced,skillPointsSpent:unit.skillPointsSpent,skillPointsGenerated:unit.skillPointsGenerated,skillPointsGranted:unit.skillPointsGranted,energy:unit.energy,energySpent:unit.energySpent,energyGained:unit.energyGained,energyGranted:unit.energyGranted,runeEnergyRestored:unit.runeEnergyRestored,runeActivations:unit.runeActivations,tauntRedirectedHits:unit.tauntRedirectedHits}));
  return {
    winner, actions: state.actions, allyTurns: state.allyTurns, enemyTurns: state.enemyTurns, elapsedTime:state.currentTime,
    actionOverride:state.actionOverride?{...state.actionOverride,observed:state.actionOverrideObserved,resolved:state.actionOverrideResolved,status:state.actionOverrideStatus}:null,
    finalHp:{allies:allies.reduce((sum,unit)=>sum+unit.hp,0),enemies:enemies.reduce((sum,unit)=>sum+unit.hp,0)},
    skillUses: state.skillUses, skillPointsRemaining: state.skillPoints,criticalHits:state.criticalHits,
    damageDealt: state.damageBySide,
    lifestealHealing:state.lifestealHealingBySide,
    alliedShieldReceived:allies.filter(unit=>!unit.isHauntling).reduce((sum,unit)=>sum+unit.shieldReceived,0),
    alliedShieldAbsorbed:allies.filter(unit=>!unit.isHauntling).reduce((sum,unit)=>sum+unit.shieldAbsorbed,0),
    unitStats:allies.reduce((out,unit)=>{const key=unit.archetypeId;if(!out[key])out[key]={role:unit.role,damage:0,damageBreakdown:newDamageBreakdown(),damageTaken:0,supportDamageAmplified:0,turns:0,criticalHits:0,runeActivations:0,runeEnergyRestored:0,lifestealHealing:0,shieldGranted:0,shieldReceived:0,shieldAbsorbed:0,hpSpent:0,skills:0,ultimates:0,followUps:0,tuneUses:0,tunesReceived:0,turnsAdvanced:0,skillPointsSpent:0,skillPointsGenerated:0,skillPointsGranted:0,energyGranted:0,energySpent:0,energyGained:0,energyRemaining:0,tauntRedirectedHits:0,survivors:0,unitCount:0};const row=out[key];row.damage+=unit.damageDealt;row.damageTaken+=unit.damageTaken;row.supportDamageAmplified+=unit.supportDamageAmplified;row.turns+=unit.turns;row.criticalHits+=unit.criticalHits||0;row.lifestealHealing+=unit.lifestealHealing||0;row.shieldGranted+=unit.shieldGranted;row.shieldReceived+=unit.shieldReceived;row.shieldAbsorbed+=unit.shieldAbsorbed;row.hpSpent+=unit.hpSpent;row.skills+=unit.skillUses;row.ultimates+=unit.ultimateCount;row.followUps+=unit.followUpCount;row.tuneUses+=unit.tuneUses;row.tunesReceived+=unit.tunesReceived;row.turnsAdvanced+=unit.turnsAdvanced;row.skillPointsSpent+=unit.skillPointsSpent;row.skillPointsGenerated+=unit.skillPointsGenerated;row.skillPointsGranted+=unit.skillPointsGranted;row.energyGranted+=unit.energyGranted;row.energySpent+=unit.energySpent||0;row.energyGained+=unit.energyGained||0;row.energyRemaining+=unit.energy;row.runeActivations+=unit.runeActivations||0;row.runeEnergyRestored+=unit.runeEnergyRestored||0;row.tauntRedirectedHits+=unit.tauntRedirectedHits;if(!unit.isHauntling){row.unitCount++;if(unit.hp>0)row.survivors++}for(const channel of DAMAGE_CHANNELS)row.damageBreakdown[channel]+=unit.damageBreakdown[channel];return out;},{}),
    unitDetails,
    mechanicEvents: state.engine.mechanicEventSnapshot(),
    followUps: allies.reduce((sum, unit) => sum + unit.followUpCount, 0),
    ultimates: allies.reduce((sum, unit) => sum + unit.ultimateCount, 0),
    aoeAttacks: [...allies, ...enemies].reduce((sum, unit) => sum + unit.aoeCount, 0),
    barriersBroken: enemies.reduce((sum, unit) => sum + unit.barriersBroken, 0),
    survivors: {
      allies: allies.filter(unit => unit.hp > 0).map(unit => ({ id: unit.id, hp: unit.hp, maxHp: unit.maxHp, shield:unit.shield||0 })),
      enemies: enemies.filter(unit => unit.hp > 0).map(unit => ({ id: unit.id, hp: unit.hp, maxHp: unit.maxHp, shield:unit.shield||0, barrier: unit.barrier, maxBarrier: unit.maxBarrier, brokenTurns: unit.brokenTurns,bleedStacks:unit.bleedStacks.length }))
    }
  };
}
function mean95Interval(values){
 const avg=values.reduce((sum,value)=>sum+value,0)/Math.max(values.length,1);if(values.length<2)return{mean:avg,lower:avg,upper:avg};const variance=values.reduce((sum,value)=>sum+(value-avg)**2,0)/(values.length-1),margin=1.96*Math.sqrt(variance/values.length);return{mean:avg,lower:Math.max(0,avg-margin),upper:avg+margin};
}
function wilsonInterval(successes,total){
 if(total<=0)return{lower:0,upper:1};const z=1.96,p=successes/total,denominator=1+z*z/total,center=(p+z*z/(2*total))/denominator,margin=z*Math.sqrt((p*(1-p)+z*z/(4*total))/total)/denominator;return{lower:successes===0?0:Math.max(0,center-margin),upper:successes===total?1:Math.min(1,center+margin)};
}
function simulateBatch(config, runs = 100, seed = 1, maxActions = null) {
  assert(Number.isInteger(runs) && runs > 0, 'Runs must be a positive integer.');
  const results = Array.from({ length: runs }, (_, index) => simulateBattle(config, seed + index, maxActions));
  const meanOf = key => results.reduce((sum, result) => sum + result[key], 0) / runs;
  const wins = { allies: 0, enemies: 0, incomplete: 0 };
  for (const result of results) wins[result.winner]++;
  const unitTypes=[...new Set(results.flatMap(result=>Object.keys(result.unitStats)))],averageUnitStats={};
  for(const type of unitTypes){const rows=results.map(result=>result.unitStats[type]).filter(Boolean),meanKey=key=>rows.reduce((sum,row)=>sum+(row[key]||0),0)/runs;averageUnitStats[type]={role:rows.find(row=>row.role)?.role||null,damage:meanKey('damage'),damage95CI:mean95Interval(rows.map(row=>row.damage)),damageBreakdown:Object.fromEntries(DAMAGE_CHANNELS.map(channel=>[channel,rows.reduce((sum,row)=>sum+(row.damageBreakdown[channel]||0),0)/runs])),turns:meanKey('turns'),dps:results.reduce((sum,result)=>sum+(result.unitStats[type]?.damage||0)/Math.max(result.elapsedTime,EPSILON),0)/runs,criticalHits:meanKey('criticalHits'),damageTaken:meanKey('damageTaken'),supportDamageAmplified:meanKey('supportDamageAmplified'),lifestealHealing:meanKey('lifestealHealing'),shieldGranted:meanKey('shieldGranted'),shieldReceived:meanKey('shieldReceived'),shieldAbsorbed:meanKey('shieldAbsorbed'),hpSpent:meanKey('hpSpent'),skills:meanKey('skills'),ultimates:meanKey('ultimates'),followUps:meanKey('followUps'),tuneUses:meanKey('tuneUses'),tunesReceived:meanKey('tunesReceived'),turnsAdvanced:meanKey('turnsAdvanced'),skillPointsSpent:meanKey('skillPointsSpent'),skillPointsGenerated:meanKey('skillPointsGenerated'),skillPointsGranted:meanKey('skillPointsGranted'),energyGranted:meanKey('energyGranted'),energySpent:meanKey('energySpent'),energyGained:meanKey('energyGained'),energyRemaining:meanKey('energyRemaining'),tauntRedirectedHits:meanKey('tauntRedirectedHits'),survivalRate:rows.reduce((sum,row)=>sum+row.survivors,0)/Math.max(1,rows.reduce((sum,row)=>sum+row.unitCount,0))};}
  return {
    runs, seed, wins,
    winRate: { allies: wins.allies / runs, enemies: wins.enemies / runs, incomplete: wins.incomplete / runs },
    winRate95CI:{allies:wilsonInterval(wins.allies,runs),enemies:wilsonInterval(wins.enemies,runs),incomplete:wilsonInterval(wins.incomplete,runs)},
    averageActions: meanOf('actions'), averageAllyTurns: meanOf('allyTurns'), averageEnemyTurns: meanOf('enemyTurns'), averageElapsedTime:meanOf('elapsedTime'),
    averageSkillUses: meanOf('skillUses'), averageFollowUps: meanOf('followUps'),averageCriticalHits:meanOf('criticalHits'),
    averageUltimates: meanOf('ultimates'), averageAoeAttacks: meanOf('aoeAttacks'),
    averageDamageDealt: {
      allies: results.reduce((sum, result) => sum + result.damageDealt.allies, 0) / runs,
      enemies: results.reduce((sum, result) => sum + result.damageDealt.enemies, 0) / runs
    },
    averageDamageDealt95CI:{allies:mean95Interval(results.map(result=>result.damageDealt.allies)),enemies:mean95Interval(results.map(result=>result.damageDealt.enemies))},
    averageLifestealHealing:{
      allies:results.reduce((sum,result)=>sum+result.lifestealHealing.allies,0)/runs,
      enemies:results.reduce((sum,result)=>sum+result.lifestealHealing.enemies,0)/runs
    },
    averageAlliedShield:{received:results.reduce((sum,result)=>sum+result.alliedShieldReceived,0)/runs,absorbed:results.reduce((sum,result)=>sum+result.alliedShieldAbsorbed,0)/runs},
    averageAllyDps:results.reduce((sum,result)=>sum+result.damageDealt.allies/Math.max(result.elapsedTime,EPSILON),0)/runs,
    averageDamagePerAllyTurn:results.reduce((sum,result)=>sum+result.damageDealt.allies/Math.max(result.allyTurns,1),0)/runs,
    averageUnitStats,
    averageUnitDetails:Object.fromEntries([...new Set(results.flatMap(result=>result.unitDetails.map(unit=>unit.id)))].map(id=>{const rows=results.map(result=>result.unitDetails.find(unit=>unit.id===id)).filter(Boolean),meanKey=key=>rows.reduce((sum,row)=>sum+(row[key]||0),0)/runs;return[id,{archetype:rows[0].archetype,role:rows[0].role,damage:meanKey('damage'),damage95CI:mean95Interval(rows.map(row=>row.damage)),damageBreakdown:Object.fromEntries(DAMAGE_CHANNELS.map(channel=>[channel,rows.reduce((sum,row)=>sum+(row.damageBreakdown[channel]||0),0)/runs])),damageTaken:meanKey('damageTaken'),criticalHits:meanKey('criticalHits'),supportDamageAmplified:meanKey('supportDamageAmplified'),shieldGranted:meanKey('shieldGranted'),shieldReceived:meanKey('shieldReceived'),shieldAbsorbed:meanKey('shieldAbsorbed'),hpSpent:meanKey('hpSpent'),lifestealHealing:meanKey('lifestealHealing'),turns:meanKey('turns'),skills:meanKey('skills'),ultimates:meanKey('ultimates'),followUps:meanKey('followUps'),tuneUses:meanKey('tuneUses'),tunesReceived:meanKey('tunesReceived'),turnsAdvanced:meanKey('turnsAdvanced'),skillPointsSpent:meanKey('skillPointsSpent'),skillPointsGenerated:meanKey('skillPointsGenerated'),skillPointsGranted:meanKey('skillPointsGranted'),energyGranted:meanKey('energyGranted'),energySpent:meanKey('energySpent'),energyGained:meanKey('energyGained'),energyRemaining:meanKey('energy'),tauntRedirectedHits:meanKey('tauntRedirectedHits'),survivalRate:rows.filter(row=>row.hp>0).length/runs,averageFinalHp:meanKey('hp'),averageFinalShield:meanKey('shield')}]})),
    averageSurvivors: {
      allies: results.reduce((sum, result) => sum + result.survivors.allies.length, 0) / runs,
      enemies: results.reduce((sum, result) => sum + result.survivors.enemies.length, 0) / runs
    }
  };
}
function parseArgs(args) {
  const options = { config: DEFAULT_CONFIG, runs: 100, seed: 1, json: false, maxActions: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config') options.config = path.resolve(args[++i]);
    else if (arg === '--runs') options.runs = Number(args[++i]);
    else if (arg === '--seed') options.seed = Number(args[++i]);
    else if (arg === '--max-actions') options.maxActions = Number(args[++i]);
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error('Unknown option: ' + arg);
  }
  return options;
}
function helpText() {
  return [
    'Two-Tone headless combat simulator',
    '',
    'Usage: node tools/combat-simulator.mjs [options]',
    '  --config <file>       Scenario JSON (default: documented Soul vs Slime example)',
    '  --runs <count>        Battles to simulate (default: 100)',
    '  --seed <integer>      Reproducible RNG seed (default: 1)',
    '  --max-actions <count> Stop a battle after this many unit turns',
    '  --json                Print machine-readable summary JSON',
    '  --help                Show this help'
  ].join('\n');
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(helpText()); return; }
  const config = JSON.parse(fs.readFileSync(options.config, 'utf8'));
  const summary = simulateBatch(config, options.runs, options.seed, options.maxActions);
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log('Two-Tone combat simulation');
    console.log('Scenario: ' + (config.name || path.basename(options.config)) + ' | runs: ' + summary.runs + ' | seed: ' + summary.seed);
    console.log('Wins: allies ' + summary.wins.allies + ' (' + (summary.winRate.allies * 100).toFixed(1) + '%), enemies ' + summary.wins.enemies + ' (' + (summary.winRate.enemies * 100).toFixed(1) + '%), action-limit incomplete ' + summary.wins.incomplete);
    console.log('Avg turns: allies ' + summary.averageAllyTurns.toFixed(1) + ', enemies ' + summary.averageEnemyTurns.toFixed(1) + ' | avg actions ' + summary.averageActions.toFixed(1));
    console.log('Avg damage: allies ' + summary.averageDamageDealt.allies.toFixed(1) + ', enemies ' + summary.averageDamageDealt.enemies.toFixed(1));
    console.log('Avg Follow Ups: ' + summary.averageFollowUps.toFixed(1) + ' | Ultimates: ' + summary.averageUltimates.toFixed(1) + ' | AoE attacks: ' + summary.averageAoeAttacks.toFixed(1) + ' | Critical hits: ' + summary.averageCriticalHits.toFixed(1));
  }
}
const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
export { simulateBattle, simulateBatch };
