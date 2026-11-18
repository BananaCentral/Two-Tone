#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TwoToneBattleEngine, roundCombatHp, roundCombatStatQuarter } from '../src/scripts/combat-engine-api.mjs';
import { getActiveCharacterUpgradeEffect, RUNE_COMBAT_RULES } from '../src/scripts/combat-definitions.mjs';

const DEFAULT_CONFIG = fileURLToPath(new URL('../Documentation/combat-simulator/example-soul-vs-slime.json', import.meta.url));
const EPSILON = 1e-9;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function roundStat(value) { return roundCombatHp(value); }
function roundStatQuarter(value) { return roundCombatStatQuarter(value); }
const DAMAGE_CHANNELS=['direct','bleed','followUp','ricochet','summon','echo','reflect'];
function newDamageBreakdown(){return Object.fromEntries(DAMAGE_CHANNELS.map(channel=>[channel,0]))}
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
function effectiveSpeed(unit) { return Math.max(1, unit.stats.speed); }
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
      assert(Number.isFinite(archetype.stats.attack) || (Number.isFinite(archetype.stats.physicalAttack) && Number.isFinite(archetype.stats.magicalAttack)), 'Archetype ' + instance.archetype + ' needs Attack or both typed Attack stats.');
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
      assert(!archetype.passives || archetype.passives.every(p => ['followUp', 'everyNthBasic', 'rampage', 'momentum', 'exposed', 'resourceful', 'residue', 'lethalImpact', 'pursuit', 'sharpClaws', 'bleed', 'cutthroat', 'tasteForBlood'].includes(p.type)), 'Unsupported passive type in ' + instance.archetype + '.');
      for (const passive of archetype.passives || []) {
        if (passive.type === 'everyNthBasic') assert(Number.isInteger(passive.every) && passive.every > 0, 'everyNthBasic needs a positive integer interval.');
        if (passive.type === 'followUp') assert(Number.isFinite(passive.multiplier) && passive.multiplier >= 0, 'followUp needs a non-negative multiplier.');
        if (passive.type === 'rampage') assert(Number.isFinite(passive.damageBonus) && passive.damageBonus >= 0 && Number.isInteger(passive.maxStacks) && passive.maxStacks >= 0, 'rampage needs a non-negative damageBonus and a non-negative integer maxStacks.');
        if (passive.type === 'momentum') assert(Number.isFinite(passive.damageBonus) && passive.damageBonus >= 0 && Number.isInteger(passive.maxStacks) && passive.maxStacks >= 0, 'momentum needs a non-negative damageBonus and a non-negative integer maxStacks.');
        if (passive.type === 'bleed') assert(Number.isInteger(passive.stacksPerHit??1)&&(passive.stacksPerHit??1)>0&&Number.isInteger(passive.maxStacks??5)&&(passive.maxStacks??5)>0,'bleed needs positive integer stacksPerHit and maxStacks.');
      }
      assert(!archetype.skill || ['enhanceBasic', 'ricochet', 'tune', 'bloodShield', 'firstStrike'].includes(archetype.skill.type), 'Unsupported skill type in ' + instance.archetype + '.');
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
  }
}

const RUNE_STAT_VALUES={hp:100,attack:20,physicalDefense:4,magicalDefense:4,speed:20};
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
    const stats = Object.fromEntries(Object.entries(archetype.stats).map(([name, value]) => [name, roundStatQuarter((statAtLevel(value, level) + (runeTotals[name] || 0)) * weaponMultiplier)]));
    if (Number.isFinite(stats.attack)) {
      stats.physicalAttack ??= stats.attack;
      stats.magicalAttack ??= stats.attack;
    } else {
      stats.attack = null;
      stats.physicalAttack = roundStatQuarter((stats.physicalAttack ?? 0) + (runeTotals.attack || 0));
      stats.magicalAttack = roundStatQuarter((stats.magicalAttack ?? 0) + (runeTotals.attack || 0));
    }
    stats.physicalAttack ??= 0;
    stats.magicalAttack ??= 0;
    const budgetAttack=Number.isFinite(stats.attack)?stats.attack:stats.physicalAttack+stats.magicalAttack;
    const statBudget=stats.hp+5*budgetAttack+25*(stats.physicalDefense||0)+25*(stats.magicalDefense||0)+5*stats.speed;
    const characterDuplicates = instance.characterDuplicates ?? archetype.characterDuplicates ?? 0;
    assert(Number.isInteger(characterDuplicates) && characterDuplicates >= 0 && characterDuplicates <= 4, 'Character duplicates must be from 0 to 4.');
    const premiumWeaponDuplicates = weapon?.type === 'premium' ? weapon.potential - 1 : 0;
    assert(stats.physicalAttack !== undefined && stats.magicalAttack !== undefined && stats.physicalDefense !== undefined && stats.magicalDefense !== undefined, 'Archetype ' + instance.archetype + ' needs an attack basis and both defense stats.');
    const maxEnergy = archetype.energy?.max ?? 120;
    const passives = (archetype.passives || []).filter(passive => !disabledPassiveIds.has(passive.id || passive.type)).map((passive, index) => ({
      ...passive,
      key: passive.id || passive.type + '-' + index,
      remaining: passive.type === 'followUp' ? upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.duplicate.1.follow-up-charges', 'followUpCharges', passive.charges ?? Infinity) : passive.charges ?? Infinity,
      charges: passive.type === 'followUp' ? upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.duplicate.1.follow-up-charges', 'followUpCharges', passive.charges) : passive.charges,
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
      statBudget,
      hp: stats.hp,
      maxHp: stats.hp,
      shield: Math.max(0,instance.shield??archetype.shield??0),
      criticalRate:instance.critical?.rate??archetype.critical?.rate??.1,
      criticalDamage:instance.critical?.damage??archetype.critical?.damage??.5,
      stealth:Math.min(1,(instance.stealth??archetype.stealth??0)+(runeTotals.setId==='eternal-sun'?RUNE_COMBAT_RULES['eternal-sun'].stealth:0)),
      echoPercent:Math.min(1,(instance.echoPercent??archetype.echoPercent??0)),
      reflectPercent:instance.reflectPercent??archetype.reflectPercent??0,
      runeSetId:runeTotals.setId,
      runeCooldownState:{cooldowns:{recycle:0,amplify:0,'celestial-star':0,united:0},cooldownStartedTurn:{}},
      runeTriggeredThisTurn:{recycle:false,amplify:false},
      runeActivations:0,
      runeEnergyRestored:0,
      disabledPassiveIds,
      disabledUpgradeEffectIds,
      criticalRateBonus:(archetype.criticalRateBonus||0)+(instance.criticalRateBonus||0)+upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.premium-duplicate.2.critical-stats', 'criticalRateBonus')+(!disabledPassiveIds.has('cutthroat')?(archetype.passives?.find(passive=>passive.type==='cutthroat')?.criticalRateBonus||0)*(upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'zero.premium-duplicate.4.critical-stats', 'criticalRateMultiplier', 1)-1):0)+(runeTotals.setId==='eternal-sun'?RUNE_COMBAT_RULES['eternal-sun'].criticalRate:0),
      criticalDamageBonus:(archetype.criticalDamageBonus||0)+(instance.criticalDamageBonus||0)+upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'soul.premium-duplicate.2.critical-stats', 'criticalDamageBonus')+(!disabledPassiveIds.has('cutthroat')?(archetype.passives?.find(passive=>passive.type==='cutthroat')?.criticalDamageBonus||0)*(upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'zero.premium-duplicate.4.critical-stats', 'criticalDamageMultiplier', 1)-1):0)+(runeTotals.setId==='eternal-sun'?RUNE_COMBAT_RULES['eternal-sun'].criticalDamage:0),
      defenseIgnoreBonus:upgradeValue({ archetypeId: instance.archetype, characterDuplicates, premiumWeaponDuplicates, weapon, disabledUpgradeEffectIds }, 'zero.premium-duplicate.3.defense-ignore', 'defenseIgnore'),
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
      energy: Math.max(0, Math.min(maxEnergy, instance.energy ?? archetype.energy?.start ?? (side === 'allies' ? 20 : 0))),
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
function attackValue(unit, type) {
  const shieldedAttackBonus = unit.shield > 0 ? upgradeValue(unit, 'logan.premium-duplicate.4.shielded-attack', 'shieldedAttackBonus') : 0;
  if (Number.isFinite(unit.stats.attack)) {
    const generic = roundStatQuarter(unit.stats.attack * (1 + (unit.tune?.attackBonus || 0) + shieldedAttackBonus));
    return generic;
  }
  const multiplier=1+(unit.tune?.attackBonus||0)+shieldedAttackBonus,physical=roundStatQuarter(unit.stats.physicalAttack*multiplier),magical=roundStatQuarter(unit.stats.magicalAttack*multiplier);
  if (type === 'physical') return physical;
  if (type === 'magical') return magical;
  return physical + magical;
}
function healFromLifesteal(state,attacker,damageDealt){
 const logan=state.allies.find(unit=>unit.archetypeId==='logan'&&unit.hp>0&&!unit.disabledPassiveIds?.has('tasteForBlood'));
 const passiveRate=attacker.side==='allies'&&logan?upgradeValue(logan,'logan.duplicate.4.lifesteal','lifestealRate',.1):0;
 const rate=Math.max(0,(attacker.lifestealRate||0)+passiveRate);
 if(rate<=0||damageDealt<=0||attacker.hp<=0)return 0;
 const healing=state.engine.resolveLifesteal({attacker,damage:damageDealt,rate})?.applied||0;
 attacker.lifestealHealing=(attacker.lifestealHealing||0)+healing;
 state.lifestealHealingBySide[attacker.side]+=healing;
 const passiveHealing=Math.min(healing,roundStat(damageDealt*passiveRate));
 const sharedHeal=logan?upgradeValue(logan,'logan.signature.lifesteal-share','healLoganFromAllyLifesteal'):false;if(logan&&attacker!==logan&&attacker.side==='allies'&&sharedHeal){const echo=state.engine.resolveHealing({target:logan,amount:passiveHealing})?.applied||0;logan.lifestealHealing+=echo;state.lifestealHealingBySide.allies+=echo}
 return healing;
}
function applyBleed(state,target,source,stacks=1,maxStacks=target.bleedMaxStacks??5){
 if(target.hp<=0||!Number.isInteger(stacks)||stacks<1)return 0;
 return state.engine.applyBleed({target,sourceId:source.id,stacks,maxStacks});
}
function resolveBleedTick(state,target){
 if(target.hp<=0||!target.bleedStacks.length)return 0;
 const events=state.engine.resolveBleedTick({target,units:[...state.allies,...state.enemies]}),total=events.reduce((sum,event)=>sum+event.healthDamage,0);
 for(const event of events){target.shieldAbsorbed+=event.shieldDamage;state.damageBySide[event.source.side]+=event.healthDamage;healFromLifesteal(state,event.source,event.healthDamage)}
 if(target.hp<=0)state.engine.clearUnitEffects(target,{reason:'defeat'});
 return total;
}
function tauntRateOf(attacker,target){return Math.max(0,...(attacker.tauntEffects||[]).filter(effect=>effect.turns>0&&effect.targetId===target.id).map(effect=>effect.rate))}
function defenseValue(unit, type) {
  if (type === 'physical') return unit.stats.physicalDefense;
  if (type === 'magical') return unit.stats.magicalDefense;
  return (unit.stats.physicalDefense + unit.stats.magicalDefense) / 2;
}
function damageFor(state,attacker, target, type, multiplier) {
  const attack = attackValue(attacker, type);
  if (attack <= 0) return 0;
  const defenseIgnorePassive=attacker.passives.find(passive=>passive.type==='lethalImpact'||passive.type==='sharpClaws')?.defenseIgnore||0;
  const globalIgnore=Math.min(1,Math.max(0,(attacker.tune?.defenseIgnore||0)+(attacker.defenseIgnoreBonus||0)+defenseIgnorePassive));
  const darkMatter=attacker.runeSetId==='dark-matter'?state.engine.resolveRuneEffect({setId:'dark-matter',trigger:'passive'}):null;
  const runeIgnore=darkMatter?.defenseIgnore||0;
  const physicalIgnore=Math.min(1,globalIgnore+runeIgnore);
  const magicalIgnore=Math.min(1,globalIgnore+runeIgnore);
  const resistance=Math.max(0,1-(target.residueStacks||0)*(target.residueResistanceReductionPerStack??.05));
  return state.engine.resolveTypedHit({
    type, attack, physicalAttack:attackValue(attacker,'physical'), magicalAttack:attackValue(attacker,'magical'),
    physicalDefense:target.stats.physicalDefense, magicalDefense:target.stats.magicalDefense,
    multiplier, physicalDefenseIgnore:physicalIgnore, magicalDefenseIgnore:magicalIgnore,
    damageMultiplier:(darkMatter?.damageMultiplier||1)*(1-(attacker.residueStacks||0)*(attacker.residueDamageReductionPerStack??.05)),
    defenseMultiplier:resistance,
    exposedStacks:target.marks.filter(mark=>mark.id==='exposed').length
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
 const allocations=state.engine.resolveRicochetPlan({targets,sourceId,sourceDamage,damageMultiplier:lily.skill?.ricochetDamageMultiplier??.1,repeats:upgradeValue(lily,'lily.duplicate.4.ricochet-repeat','ricochetRepeats',1),secondHitMultiplier:upgradeValue(lily,'lily.duplicate.4.ricochet-repeat','ricochetSecondHitMultiplier',.5)});
 for(const entry of allocations){if(entry.target.hp<=0)continue;const trueAttack=attackValue(lily,'true'),hits=runAttack(state,lily,[entry.target],{damageType:'true',multiplier:trueAttack>0?entry.damage/trueAttack:0,target:'single'},{damageChannel:'ricochet'});if(hits[0]?.damage>0)lily.ricochetHits=(lily.ricochetHits||0)+1;
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
function runAttack(state, attacker, candidates, spec, options = {}) {
  if (!candidates.length) return [];
  const targets = chooseTarget(state.engine,attacker, candidates, options.targetMode || spec.target || 'single', state.random);
  if (!targets.length) return [];
  const hits = [];
  for (const target of targets) {
    const hpBefore = target.hp,shieldBefore=target.shield||0;
    const baseDamage = damageFor(state,attacker, target, spec.damageType, (options.multiplier ?? spec.multiplier)*(1-(attacker.residueStacks||0)*(attacker.residueDamageReductionPerStack??.05)));
    const exposedStacks=target.marks?.filter(mark=>mark.id==='exposed').length||0,barrierLily=state.allies.find(unit=>unit.archetypeId==='lily');
    const runeEcho=attacker.runeSetId==='radiant-moon'?state.engine.resolveRuneEffect({setId:'radiant-moon',trigger:'directDamage'})?.echo||0:0;
    const reflectExposed=target.marks?.filter(mark=>mark.id==='exposed').length||0;
    const outcome=state.engine.resolveDamageSequence({target,attacker,rawDamage:baseDamage,damageType:spec.damageType,
      primary:{stealthChance:Math.min(1,Math.max(0,target.stealth||0)),criticalRate:attacker.criticalRate+(attacker.criticalRateBonus||0)+(attacker.tune?.criticalRateBonus||0)+(options.forceCritical?1:0),criticalDamage:attacker.criticalDamage+(attacker.criticalDamageBonus||0)+(attacker.tune?.criticalDamageBonus||0)+(options.criticalDamageBonus||0),damageReduction:target.tune?.damageReduction||0,vulnerabilityMultiplier:target.side==='enemies'&&target.brokenTurns>0?1.5:1,random:state.random,
       barrierDamageMultiplier:target.side==='enemies'?1+(attacker.tune?.barrierDamageBonus||0)+exposedStacks*upgradeValue(barrierLily||{},'lily.premium-duplicate.2.exposed-barrier-damage','exposedBarrierDamagePerStack'):1,
       breakDamagePercent:.1+exposedStacks*upgradeValue(barrierLily||{},'lily.premium-duplicate.3.exposed-break-damage','exposedBreakDamagePerStack'),brokenDuration:brokenDuration(target.stats.speed,Math.max(1,state.enemyAverage/state.slowerAverage)),
       reflectPercent:reflectPercentOf(target,state),echoPercent:attacker.side!==target.side?Math.max(0,Math.min(1,(attacker.echoPercent||0)+runeEcho)):0},
      calculateReflectDamage:(amount,reflector,reflectTarget)=>{const trueAttack=attackValue(reflector,'true');return trueAttack>0?damageFor(state,reflector,reflectTarget,'true',amount/trueAttack*(1-(reflector.residueStacks||0)*(reflector.residueDamageReductionPerStack??.05))):0},
      reflect:{stealthChance:attacker.stealth||0,criticalRate:target.criticalRate+(target.criticalRateBonus||0)+(target.tune?.criticalRateBonus||0),criticalDamage:target.criticalDamage+(target.criticalDamageBonus||0)+(target.tune?.criticalDamageBonus||0),damageReduction:attacker.tune?.damageReduction||0,vulnerabilityMultiplier:attacker.side==='enemies'&&attacker.brokenTurns>0?1.5:1,random:state.random,
       barrierDamageMultiplier:1+(attacker.tune?.barrierDamageBonus||0)+reflectExposed*upgradeValue(barrierLily||{},'lily.premium-duplicate.2.exposed-barrier-damage','exposedBarrierDamagePerStack'),
       breakDamagePercent:.1+reflectExposed*upgradeValue(barrierLily||{},'lily.premium-duplicate.3.exposed-break-damage','exposedBreakDamagePerStack'),brokenDuration:brokenDuration(attacker.stats.speed,Math.max(1,state.enemyAverage/state.slowerAverage))},
      echo:{random:state.random,barrierDamageMultiplier:1,breakDamagePercent:.1+exposedStacks*upgradeValue(barrierLily||{},'lily.premium-duplicate.3.exposed-break-damage','exposedBreakDamagePerStack'),brokenDuration:brokenDuration(target.stats.speed,Math.max(1,state.enemyAverage/state.slowerAverage))}});
    if(!outcome||outcome.dodged){hits.push({target,damage:0,shieldDamage:0,barrierDamage:0,breakDamage:0,barrierRemaining:target.barrier,broken:false,critical:false,dodged:true});continue}
    if(outcome.critical){state.criticalHits++;attacker.criticalHits=(attacker.criticalHits||0)+1}
    const roll={damage:outcome.damage,critical:outcome.critical},damage=outcome.damage,shieldAbsorbed=outcome.shieldDamage,breakShieldAbsorbed=outcome.breakShieldDamage,barrierDamage=outcome.barrierDamage,breakDamage=outcome.breakDamage,broken=outcome.broken;
    target.shieldAbsorbed=(target.shieldAbsorbed||0)+shieldAbsorbed+breakShieldAbsorbed;
    const hpDamage=outcome.directHealthDamage,finalHpDamage=outcome.healthDamage;
    if(Number.isFinite(options.unbuffedMultiplier)&&attacker.tune?.sourceId){const plainBase=damageFor(state,attacker,target,spec.damageType,options.unbuffedMultiplier*(1-(attacker.residueStacks||0)*(attacker.residueDamageReductionPerStack??.05))),critFactor=baseDamage>0?roll.damage/baseDamage:1,plainDamage=roundStat(plainBase*critFactor*(1-(target.tune?.damageReduction||0))*(target.side==='enemies'&&target.brokenTurns>0?1.5:1)),plainHpDamage=Math.min(hpBefore,Math.max(0,plainDamage-shieldBefore)),amplified=Math.max(0,hpDamage-plainHpDamage),source=state.allies.find(unit=>unit.id===attacker.tune.sourceId);if(source)source.supportDamageAmplified+=amplified}
    target.damageTaken += finalHpDamage;
    attacker.damageDealt += finalHpDamage;
    attacker.damageBreakdown[options.damageChannel||'direct']+=finalHpDamage;
    state.damageBySide[attacker.side] += finalHpDamage;
    healFromLifesteal(state,attacker,finalHpDamage);
    const action=options.action||(spec===attacker.basic?'basic':spec===attacker.skill?'skill':spec===attacker.ultimate?'ultimate':null);
    const hitEffects=state.engine.resolveHitEffects({actor:attacker,target,hit:outcome,action,passives:attacker.passives,characterDuplicates:attacker.characterDuplicates||0,premiumWeaponDuplicates:attacker.premiumWeaponDuplicates||0,hasPremiumWeapon:attacker.weapon?.type==='premium',allies:state.allies,isEnemyTarget:attacker.side!==target.side});
    for(const effect of hitEffects)if(effect.type==='lily-exposed-energy'&&effect.target){effect.target.energyGained=(effect.target.energyGained||0)+effect.energyGained;effect.target.energyGranted=(effect.target.energyGranted||0)+effect.energyGained}
    let reflect=null;
    if(outcome.reflect){const hit=outcome.reflect,reflectShield=hit.shieldDamage+hit.breakShieldDamage;attacker.shieldAbsorbed=(attacker.shieldAbsorbed||0)+reflectShield;attacker.damageTaken+=hit.healthDamage;target.damageDealt+=hit.healthDamage;target.damageBreakdown.reflect+=hit.healthDamage;state.damageBySide[target.side]+=hit.healthDamage;healFromLifesteal(state,target,hit.healthDamage);reflect={damage:hit.damage,healthDamage:hit.healthDamage,shieldDamage:reflectShield,damageType:'true',dodged:!!hit.dodged}}
    let echo=null;
    if(outcome.echo){const hit=outcome.echo,echoShield=hit.shieldDamage+hit.breakShieldDamage;target.shieldAbsorbed=(target.shieldAbsorbed||0)+echoShield;target.damageTaken+=hit.healthDamage;attacker.damageDealt+=hit.healthDamage;attacker.damageBreakdown.echo+=hit.healthDamage;state.damageBySide[attacker.side]+=hit.healthDamage;healFromLifesteal(state,attacker,hit.healthDamage);echo={damage:hit.damage,healthDamage:hit.healthDamage,directHealthDamage:hit.directHealthDamage,damageType:spec.damageType,shieldAbsorbed:echoShield,echo:true}}
    hits.push({ target, damage: finalHpDamage, shieldDamage:shieldAbsorbed, barrierDamage, breakDamage, barrierRemaining: target.barrier, broken,critical:roll.critical,dodged:false,damageType:spec.damageType,reflect,echo });
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
function triggerFollowUps(state, sourceId, sourceActorId, hits) {
  for (const soul of state.allies) {
    if (soul.hp <= 0 || soul.id === sourceActorId) continue;
    for (const passive of soul.passives.filter(p => p.type === 'followUp')) {
      const rawTotal = roundStat(attackValue(soul, passive.damageType) * passive.multiplier * upgradeValue(soul,'soul.duplicate.2.follow-up-damage','followUpDamageMultiplier',1) * celestialFactor(soul, 'passive'));
      const allocation=state.engine.resolveFollowUpEvent({passive,ownerId:soul.id,sourceActorId,sourceId,hits,enemies:state.enemies,totalDamage:rawTotal,maxCharges:passive.charges??5,refundEvery:upgradeValue(soul,'soul.premium-duplicate.4.follow-up-refund','followUpRefundEvery')});if(!allocation)continue;
      soul.followUpCount++;
      soul.followUpActivations=allocation.activations;
      allocation.targets.forEach(({target,damage:share}) => {
        const divisor = attackValue(soul, passive.damageType);
        runAttack(state,soul,[target],{damageType:passive.damageType,multiplier:divisor>0?share/divisor:0,target:'single'},{damageChannel:'followUp'});
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
function chooseDawnTarget(state,actor){
 const living=state.allies.filter(unit=>unit.hp>0),soul=living.find(unit=>unit.archetypeId==='soul');
 if(soul&&soul.id!==actor.id)return soul;
 return living.filter(unit=>unit.id!==actor.id).slice().sort((a,b)=>attackValue(b,b.basic.damageType)*b.basic.multiplier-attackValue(a,a.basic.damageType)*a.basic.multiplier||a.id.localeCompare(b.id))[0]||actor;
}
function advanceTurn(state,unit,percent){return state.timeline.modify(unit.id,percent)}
function delayTurn(state,unit,percent){return state.timeline.modify(unit.id,-percent)}
function useRuneRecycle(state,actor){
 if(actor.runeTriggeredThisTurn.recycle)return false;const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'skill',state:actor.runeCooldownState,effectId:'recycle',turn:actor.turns});if(!effect)return false;
 const before=state.skillPoints;state.skillPoints=Math.min(state.skillPointCap,state.skillPoints+effect.skillPoints);const restored=state.skillPoints-before;
 actor.skillPointsGenerated+=restored;actor.skillPointsGranted+=restored;actor.runeActivations++;actor.runeTriggeredThisTurn.recycle=true;return true;
}
function triggerUnited(state,actor,target){
 if(!target||target.side!=='allies')return false;const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'allySkill',state:actor.runeCooldownState,effectId:'united',turn:actor.turns});if(!effect)return false;
 advanceTurn(state,actor,effect.actionAdvance);actor.turnsAdvanced+=effect.actionAdvance/100;actor.runeActivations++;return true;
}
function applyUltimateRuneEffects(state,actor,hits=[]){
 const celestial=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'ultimate',state:actor.runeCooldownState,effectId:'celestial-star',turn:actor.turns});
 if(celestial){advanceTurn(state,actor,celestial.actionAdvance);actor.turnsAdvanced+=celestial.actionAdvance/100;actor.runeActivations++}
 const infinite=state.engine.resolveRuneEffect({setId:actor.runeSetId,trigger:'ultimate'});
 if(infinite){for(const enemy of state.enemies)if(enemy.hp>0)delayTurn(state,enemy,infinite.actionDelay);if(state.enemies.some(enemy=>enemy.hp>0))actor.runeActivations++}
}
function amplifyBasic(state,actor){
 const effect=state.engine.resolveRuneTrigger({setId:actor.runeSetId,trigger:'basic',state:actor.runeCooldownState,effectId:'amplify',turn:actor.turns});if(!effect)return 1;
 actor.runeTriggeredThisTurn.amplify=true;actor.runeActivations++;return 1+effect.damageBonus;
}
function applyDawnTune(state,actor,target,plan=actionPlan(state,actor,'skill')){
 const premium=dawnPremiumDuplicates(actor),duplicates=actor.characterDuplicates||0;
 const result=state.engine.resolveDawnTune({actor,target,plan,characterDuplicates:duplicates,premiumWeaponDuplicates:premium,weaponType:actor.weapon?.type||null});if(!result)return false;
 actor.tuneUses++;target.tunesReceived++;
 if(result.actionAdvance)target.turnsAdvanced+=result.actionAdvance/100;
 return true;
}
function resolveAllyAction(state, actor) {
  let foes = state.enemies.filter(unit => unit.hp > 0);
  if (!foes.length) return;
  const actionOverride=state.actionOverride?.actorId===actor.id&&state.actionOverride.turn===actor.turns?state.actionOverride.action:null;
  if(actor.isHauntling){
    const id=++state.sourceSerial,hits=runAttack(state,actor,foes,{damageType:'true',multiplier:1,target:'aoe'},{multiplier:celestialFactor(actor,'ultimate'),damageChannel:'summon'});
    const lily=state.allies.find(unit=>unit.archetypeId==='lily'&&unit.hp>0);
    if(lily)for(const target of landedTargets(hits))state.engine.resolveHitEffects({actor:lily,target,hit:{dodged:false},action:'summon',passives:lily.passives,characterDuplicates:lily.characterDuplicates||0,isEnemyTarget:true});
    applyRicochet(state,actor,id,hits);triggerFollowUps(state,id,actor.id,hits);
    state.engine.advanceSummonTurn(actor);return;
  }
  const ultimate = actor.ultimate;
  const ultimatePlan=actionPlan(state,actor,'ultimate'),ultimateCost=ultimatePlan?.energyCost??Infinity;
  if (ultimate && actor.energy >= ultimateCost && (actionOverride===null||actionOverride==='ultimate')) {
    if(!settleActionResources(state,actor,ultimatePlan,{payEnergyCost:true}))return;
    actor.ultimateCount++;
    if(ultimatePlan.type==='dawnSupport'){
      const target=chooseDawnTarget(state,actor),result=state.engine.resolveDawnUltimate({actor,target,battle:state,plan:ultimatePlan,characterDuplicates:actor.characterDuplicates||0});if(!result)return;
      target.energyGranted+=result.energyGained;target.energyGained+=result.energyGained;actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained;target.turnsAdvanced+=result.actionAdvance/100;
      applyUltimateRuneEffects(state,actor);
    }else{
    const plan=actionPlan(state,actor,'ultimate');
    const hits = runAttack(state, actor, foes, ultimate, { multiplier: plan.multiplier });
    applyUltimateRuneEffects(state,actor,hits);
    const sourceId=++state.sourceSerial;
    applyRicochet(state,actor,sourceId,hits);triggerFollowUps(state, sourceId, actor.id, hits);
    if(actor.archetypeId==='zero'){
      const result=state.engine.resolveZeroUltimateEffects({actor,enemies:state.enemies,battle:state,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,hasPremiumWeapon:actor.weapon?.type==='premium'});
      if(result){actor.turnsAdvanced+=result.actorAdvance/100;actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained}
    }
    if(actor.archetypeId==='lily'&&actor.weapon?.type==='premium'){
      const result=state.engine.resolveLilyPremiumUltimateEffects({actor,allies:state.allies,battle:state,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0,hasPremiumWeapon:true});
      if(result){actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained;for(const entry of result.energy){const ally=state.allies.find(unit=>unit.id===entry.id);if(ally){ally.energyGranted+=entry.energyGained;ally.energyGained+=entry.energyGained;ally.turnsAdvanced+=entry.actionAdvance/100}}}
    }
    if(actor.archetypeId==='logan'){
      const result=state.engine.resolveLoganUltimateEffects({actor,battle:state,characterDuplicates:actor.characterDuplicates||0});
      if(result){actor.skillPointsGenerated+=result.skillPointsGained;actor.skillPointsGranted+=result.skillPointsGained}
    }
    if (ultimate.refillFollowUps) refillPassives(state,actor);
    if(actor.archetypeId==='lily'&&state.enemies.some(unit=>unit.hp>0)){
      const summonPlan=state.engine.resolveSummonPlan({owner:actor,characterDuplicates:actor.characterDuplicates||0,sourceId}),summon={...actor,id:summonPlan.id,name:summonPlan.name,isHauntling:true,immediateOnSpawn:summonPlan.immediateOnSpawn,turnsRemaining:summonPlan.durationTurns,hp:summonPlan.hp,maxHp:summonPlan.maxHp,energy:0,ultimate:null,skill:null,basic:{damageType:summonPlan.damageType,multiplier:summonPlan.multiplier,target:summonPlan.target},passives:[],turns:0,damageDealt:0,damageBreakdown:newDamageBreakdown(),damageTaken:0,supportDamageAmplified:0,shieldGranted:0,shieldReceived:0,shieldAbsorbed:0,hpSpent:0,tuneUses:0,tunesReceived:0,turnsAdvanced:0,skillPointsSpent:0,skillPointsGenerated:0,skillPointsGranted:0,energyGranted:0,tauntRedirectedHits:0,skillUses:0,followUpCount:0,ultimateCount:0,aoeCount:0};
      state.allies.push(summon);
    }
    }
    foes = state.enemies.filter(unit => unit.hp > 0);
    if (!foes.length) return;
  }
  const skill = actor.skill;
  if(actionOverride!=='basic'&&actionOverride!=='ultimate'){
  if(skill?.type==='bloodShield'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const recipients=state.allies.filter(unit=>unit.hp>0),result=state.engine.resolveLoganBloodShield({actor,allies:recipients,enemies:state.enemies,plan,characterDuplicates:actor.characterDuplicates||0,premiumWeaponDuplicates:actor.premiumWeaponDuplicates||0});if(!result)return;
    actor.hpSpent+=result.healthCost;for(const entry of result.shields){entry.target.shieldReceived+=entry.amount;actor.shieldGranted+=entry.amount}
    useRuneRecycle(state,actor);triggerUnited(state,actor,recipients[0]);
    return;
  }
  if(skill?.type==='tune'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const target=chooseDawnTarget(state,actor);applyDawnTune(state,actor,target,plan);useRuneRecycle(state,actor);triggerUnited(state,actor,target);return;
  }
  if(skill?.type==='firstStrike'&&state.skillPoints>0){
    const plan=actionPlan(state,actor,'skill');if(!settleActionResources(state,actor,plan))return;state.skillUses++;actor.skillUses++;
    const target=foes.slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id.localeCompare(b.id))[0];
    if(target){const plan=actionPlan(state,actor,'skill',{targetAlreadyHit:actor.firstStrikeTargets.has(target.id)}),hits=runAttack(state,actor,[target],skill,{multiplier:plan.multiplier,targetMode:'single'});const sourceId=++state.sourceSerial;triggerFollowUps(state,sourceId,actor.id,hits)}
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
    const sourceId=++state.sourceSerial,hits=runAttack(state,actor,foes,skill,{multiplier:plan.multiplier,targetMode:plan.target||'aoe'});
    useRuneRecycle(state,actor);
    applyRicochet(state,actor,sourceId,hits);
    triggerFollowUps(state,sourceId,actor.id,hits);return;
  }
  }
  const basic = actor.basic;
  const stacks = actor.enhanceStacks;
  const tunedBasicFactor=actor.tune?.basicEnhanced?1+actor.tune.damageBonus:1,plan=actionPlan(state,actor,'basic',{tuneMultiplier:tunedBasicFactor});
  const targetMode=stacks>0?(plan.target||basic.target):basic.target;
  const lilyBasic=actor.archetypeId==='lily';
  const basicMultiplier=plan.multiplier;
  const amplify=amplifyBasic(state,actor);
  const untunedPlan=actor.tune?.basicEnhanced?actionPlan(state,actor,'basic'):plan;
  if(!settleActionResources(state,actor,plan,{enhancedStacks:stacks}))return;
  const hits = runAttack(state, actor, foes, basic, { multiplier:basicMultiplier*amplify,unbuffedMultiplier:actor.tune?.basicEnhanced?untunedPlan.multiplier*amplify:undefined,targetMode });
  actor.basicAttackCount++;
  if(actor.tune?.basicEnhanced){const tuneSource=state.allies.find(unit=>unit.id===actor.tune.sourceId);actor.tune.basicEnhanced=false;const tunedSpBefore=state.skillPoints;state.skillPoints=Math.min(state.skillPointCap,state.skillPoints+(actor.tune.skillPointReturn||0));const refund=state.skillPoints-tunedSpBefore;actor.skillPointsGenerated+=refund;if(tuneSource){tuneSource.skillPointsGranted+=refund;tuneSource.skillPointsGenerated+=refund}}
  actor.enhanceStacks = 0;
  const sourceId=++state.sourceSerial;applyRicochet(state,actor,sourceId,hits);triggerFollowUps(state, sourceId, actor.id, hits);
}
function resolveEnemyAction(state, actor) {
  const targets = state.allies.filter(unit => unit.hp > 0);
  if (!targets.length) return;
  const basic = actor.basic;
  const rampage=actor.passives.find(passive=>passive.type==='rampage'),momentum=actor.passives.find(passive=>passive.type==='momentum');
  const passive=actor.passives.find(value=>['rampage','momentum','pursuit'].includes(value.type)||value.type==='everyNthBasic');
  const passiveId=passive?.id||(passive?.type==='everyNthBasic'?'slimy':passive?.type);
  const plan=state.engine.resolveEnemyBasicPlan({basic:{...basic,targetMode:basic.target},passive:passive?{...passive,id:passiveId}:null,attackCount:actor.basicAttackCount||0,rampageStacks:rampage?.stacks||0,momentumStacks:momentum?.stacks||0,debuffMultiplier:(actor.debuffs||[]).reduce((value,debuff)=>value*(debuff.damageMultiplier??1),1)});
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
  const premiumLily=allies.find(unit=>unit.archetypeId==='lily'&&upgradeValue(unit,'lily.premium-duplicate.1.entry-marks','entryRicochetTurns')>0);
  if(premiumLily)for(const enemy of enemies)state.engine.setTimedMark({target:enemy,mark:{id:'ricochet',turns:upgradeValue(premiumLily,'lily.premium-duplicate.1.entry-marks','entryRicochetTurns'),sources:[]}});
  const allyAverage = mean(allies.map(effectiveSpeed));
  const enemyAverage = mean(enemies.map(effectiveSpeed));
  const slowerAverage = Math.min(allyAverage, enemyAverage);
  const settings = config.settings || {};
  const state = {
    allies, enemies, random, sourceSerial: 0,
    actionOverride:settings.actionOverride??null,
    actionOverrideObserved:false,
    actionOverrideResolved:null,
    skillPointCap: (settings.skillPointCap ?? 5)+(allies.some(unit=>unit.passives.some(passive=>passive.type==='resourceful'))?2:0),
    skillPoints: 0,
    skillUses: 0,
    damageBySide: { allies: 0, enemies: 0 },
    lifestealHealingBySide: { allies: 0, enemies: 0 },
    actions: 0, allyTurns: 0, enemyTurns: 0, enemyAverage, slowerAverage,
    maxActions: maxActionsOverride ?? settings.maxActions ?? 2000, currentTime:0,criticalHits:0,
    engine: new TwoToneBattleEngine()
  };
  state.timeline=state.engine.timeline;
  const resourceful=allies.some(unit=>unit.passives.some(passive=>passive.type==='resourceful'));
  state.skillPoints=Math.min(state.skillPointCap,(settings.initialSkillPoints??3)+(resourceful?2:0));
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
    if (actor.side === 'allies') {
      state.allyTurns++;
      resolveBleedTick(state, actor);
      if (actor.hp <= 0) continue;
      const isOverriddenActor=state.actionOverride?.actorId===actor.id&&state.actionOverride.turn===actor.turns;
      const priorSkills=actor.skillUses,priorUltimates=actor.ultimateCount;
      if(isOverriddenActor)state.actionOverrideObserved=true;
      resolveAllyAction(state, actor);
      if(isOverriddenActor)state.actionOverrideResolved=actor.ultimateCount>priorUltimates?'ultimate':actor.skillUses>priorSkills?'skill':'basic';
    } else {
      state.enemyTurns++;
      resolveBleedTick(state,actor);
      if(actor.hp<=0)continue;
      if (actor.brokenTurns > 0) {
        actor.brokenTurns--;
        if (actor.brokenTurns === 0) {
          actor.barrier = actor.maxBarrier;
          cleanse(actor,state);
          state.timeline.modify(actor.id,100);
        }
      } else {resolveEnemyAction(state, actor)}
    }
    state.engine.ageUnitEffects(actor,{event:'affected_turn_end'});
    if(actor.side==='allies')state.engine.ageRuneCooldowns(actor.runeCooldownState,actor.turns,['recycle','amplify','celestial-star','united']);
  }
  const outcome=state.engine.resolveBattleOutcome({allies,enemies,actionLimitReached:state.actions>=state.maxActions}),winner=outcome==='defeat'?'enemies':outcome==='victory'?'allies':'draw';
  const unitDetails=allies.filter(unit=>!unit.isHauntling).map(unit=>({id:unit.id,archetype:unit.archetypeId,role:unit.role,stats:{...unit.stats},statBudget:unit.statBudget,hp:unit.hp,maxHp:unit.maxHp,shield:unit.shield||0,damage:unit.damageDealt,damageBreakdown:{...unit.damageBreakdown},damageTaken:unit.damageTaken,criticalHits:unit.criticalHits||0,supportDamageAmplified:unit.supportDamageAmplified,shieldGranted:unit.shieldGranted,shieldReceived:unit.shieldReceived,shieldAbsorbed:unit.shieldAbsorbed,hpSpent:unit.hpSpent,lifestealHealing:unit.lifestealHealing||0,turns:unit.turns,skills:unit.skillUses,ultimates:unit.ultimateCount,followUps:unit.followUpCount,tuneUses:unit.tuneUses,tunesReceived:unit.tunesReceived,turnsAdvanced:unit.turnsAdvanced,skillPointsSpent:unit.skillPointsSpent,skillPointsGenerated:unit.skillPointsGenerated,skillPointsGranted:unit.skillPointsGranted,energy:unit.energy,energySpent:unit.energySpent,energyGained:unit.energyGained,energyGranted:unit.energyGranted,runeEnergyRestored:unit.runeEnergyRestored,runeActivations:unit.runeActivations,tauntRedirectedHits:unit.tauntRedirectedHits}));
  return {
    winner, actions: state.actions, allyTurns: state.allyTurns, enemyTurns: state.enemyTurns, elapsedTime:state.currentTime,
    actionOverride:state.actionOverride?{...state.actionOverride,observed:state.actionOverrideObserved,resolved:state.actionOverrideResolved}:null,
    finalHp:{allies:allies.reduce((sum,unit)=>sum+unit.hp,0),enemies:enemies.reduce((sum,unit)=>sum+unit.hp,0)},
    statBudgets:{allies:allies.filter(unit=>!unit.isHauntling).map(unit=>({id:unit.id,archetype:unit.archetypeId,value:unit.statBudget})),enemies:enemies.map(unit=>({id:unit.id,archetype:unit.archetypeId,value:unit.statBudget}))},
    skillUses: state.skillUses, skillPointsRemaining: state.skillPoints,criticalHits:state.criticalHits,
    damageDealt: state.damageBySide,
    lifestealHealing:state.lifestealHealingBySide,
    alliedShieldReceived:allies.filter(unit=>!unit.isHauntling).reduce((sum,unit)=>sum+unit.shieldReceived,0),
    alliedShieldAbsorbed:allies.filter(unit=>!unit.isHauntling).reduce((sum,unit)=>sum+unit.shieldAbsorbed,0),
    unitStats:allies.reduce((out,unit)=>{const key=unit.archetypeId;if(!out[key])out[key]={role:unit.role,damage:0,damageBreakdown:newDamageBreakdown(),damageTaken:0,supportDamageAmplified:0,turns:0,criticalHits:0,runeActivations:0,runeEnergyRestored:0,lifestealHealing:0,shieldGranted:0,shieldReceived:0,shieldAbsorbed:0,hpSpent:0,skills:0,ultimates:0,followUps:0,tuneUses:0,tunesReceived:0,turnsAdvanced:0,skillPointsSpent:0,skillPointsGenerated:0,skillPointsGranted:0,energyGranted:0,energySpent:0,energyGained:0,energyRemaining:0,tauntRedirectedHits:0,survivors:0,unitCount:0};const row=out[key];row.damage+=unit.damageDealt;row.damageTaken+=unit.damageTaken;row.supportDamageAmplified+=unit.supportDamageAmplified;row.turns+=unit.turns;row.criticalHits+=unit.criticalHits||0;row.lifestealHealing+=unit.lifestealHealing||0;row.shieldGranted+=unit.shieldGranted;row.shieldReceived+=unit.shieldReceived;row.shieldAbsorbed+=unit.shieldAbsorbed;row.hpSpent+=unit.hpSpent;row.skills+=unit.skillUses;row.ultimates+=unit.ultimateCount;row.followUps+=unit.followUpCount;row.tuneUses+=unit.tuneUses;row.tunesReceived+=unit.tunesReceived;row.turnsAdvanced+=unit.turnsAdvanced;row.skillPointsSpent+=unit.skillPointsSpent;row.skillPointsGenerated+=unit.skillPointsGenerated;row.skillPointsGranted+=unit.skillPointsGranted;row.energyGranted+=unit.energyGranted;row.energySpent+=unit.energySpent||0;row.energyGained+=unit.energyGained||0;row.energyRemaining+=unit.energy;row.runeActivations+=unit.runeActivations||0;row.runeEnergyRestored+=unit.runeEnergyRestored||0;row.tauntRedirectedHits+=unit.tauntRedirectedHits;if(!unit.isHauntling){row.unitCount++;if(unit.hp>0)row.survivors++}for(const channel of DAMAGE_CHANNELS)row.damageBreakdown[channel]+=unit.damageBreakdown[channel];return out;},{}),
    unitDetails,
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
  const wins = { allies: 0, enemies: 0, draws: 0 };
  for (const result of results) wins[result.winner === 'draw' ? 'draws' : result.winner]++;
  const unitTypes=[...new Set(results.flatMap(result=>Object.keys(result.unitStats)))],averageUnitStats={};
  for(const type of unitTypes){const rows=results.map(result=>result.unitStats[type]).filter(Boolean),meanKey=key=>rows.reduce((sum,row)=>sum+(row[key]||0),0)/runs;averageUnitStats[type]={role:rows.find(row=>row.role)?.role||null,damage:meanKey('damage'),damage95CI:mean95Interval(rows.map(row=>row.damage)),damageBreakdown:Object.fromEntries(DAMAGE_CHANNELS.map(channel=>[channel,rows.reduce((sum,row)=>sum+(row.damageBreakdown[channel]||0),0)/runs])),turns:meanKey('turns'),dps:results.reduce((sum,result)=>sum+(result.unitStats[type]?.damage||0)/Math.max(result.elapsedTime,EPSILON),0)/runs,criticalHits:meanKey('criticalHits'),damageTaken:meanKey('damageTaken'),supportDamageAmplified:meanKey('supportDamageAmplified'),lifestealHealing:meanKey('lifestealHealing'),shieldGranted:meanKey('shieldGranted'),shieldReceived:meanKey('shieldReceived'),shieldAbsorbed:meanKey('shieldAbsorbed'),hpSpent:meanKey('hpSpent'),skills:meanKey('skills'),ultimates:meanKey('ultimates'),followUps:meanKey('followUps'),tuneUses:meanKey('tuneUses'),tunesReceived:meanKey('tunesReceived'),turnsAdvanced:meanKey('turnsAdvanced'),skillPointsSpent:meanKey('skillPointsSpent'),skillPointsGenerated:meanKey('skillPointsGenerated'),skillPointsGranted:meanKey('skillPointsGranted'),energyGranted:meanKey('energyGranted'),energySpent:meanKey('energySpent'),energyGained:meanKey('energyGained'),energyRemaining:meanKey('energyRemaining'),tauntRedirectedHits:meanKey('tauntRedirectedHits'),survivalRate:rows.reduce((sum,row)=>sum+row.survivors,0)/Math.max(1,rows.reduce((sum,row)=>sum+row.unitCount,0))};}
  return {
    runs, seed, wins,
    winRate: { allies: wins.allies / runs, enemies: wins.enemies / runs, draws: wins.draws / runs },
    winRate95CI:{allies:wilsonInterval(wins.allies,runs),enemies:wilsonInterval(wins.enemies,runs),draws:wilsonInterval(wins.draws,runs)},
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
    console.log('Wins: allies ' + summary.wins.allies + ' (' + (summary.winRate.allies * 100).toFixed(1) + '%), enemies ' + summary.wins.enemies + ' (' + (summary.winRate.enemies * 100).toFixed(1) + '%), draws ' + summary.wins.draws);
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
