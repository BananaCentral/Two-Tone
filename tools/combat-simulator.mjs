#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_CONFIG = fileURLToPath(new URL('../Documentation/combat-simulator/example-soul-vs-slime.json', import.meta.url));
const EPSILON = 1e-9;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function roundStat(value) { return Math.floor(value + 0.5); }
function statAtLevel(value, level) {
  assert(Number.isFinite(value) && value >= 0, 'Stats must be finite non-negative numbers.');
  assert(Number.isInteger(level) && level >= 1 && level <= 50, 'Unit level must be an integer from 1 to 50.');
  return roundStat(value * level);
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
  const ids = new Set();
  for (const side of ['allies', 'enemies']) {
    for (const instance of config.teams[side]) {
      assert(instance && typeof instance.id === 'string' && instance.id, 'Each unit needs a unique instance id.');
      assert(!ids.has(instance.id), 'Unit instance ids must be unique: ' + instance.id);
      ids.add(instance.id);
      const archetype = config.archetypes[instance.archetype];
      assert(archetype, 'Unknown archetype ' + instance.archetype + ' for ' + instance.id + '.');
      assert(archetype.stats && Number.isFinite(archetype.stats.hp) && Number.isFinite(archetype.stats.speed), 'Archetype ' + instance.archetype + ' needs HP and Speed stats.');
      const barrierPercent = instance.barrierPercent ?? archetype.barrierPercent ?? 0.2;
      assert(Number.isFinite(barrierPercent) && barrierPercent >= 0 && barrierPercent <= 1, 'Enemy barrierPercent must be from 0 to 1.');
      const critical=instance.critical??archetype.critical??{};
      assert((critical.rate===undefined||(Number.isFinite(critical.rate)&&critical.rate>=0))&&(critical.damage===undefined||(Number.isFinite(critical.damage)&&critical.damage>=0)),'Critical rate and damage must be finite non-negative values.');
      assert([instance.criticalRateBonus,archetype.criticalRateBonus,instance.criticalDamageBonus,archetype.criticalDamageBonus].every(value=>value===undefined||(Number.isFinite(value)&&value>=0)),'Critical bonuses must be finite non-negative values.');
      assert(archetype.basic && Number.isFinite(archetype.basic.multiplier) && ['physical', 'magical', 'true'].includes(archetype.basic.damageType), 'Archetype ' + instance.archetype + ' needs a typed Basic Attack.');
      assert(!archetype.passives || archetype.passives.every(p => ['followUp', 'everyNthBasic', 'rampage', 'exposed', 'resourceful', 'residue', 'lethalImpact'].includes(p.type)), 'Unsupported passive type in ' + instance.archetype + '.');
      for (const passive of archetype.passives || []) {
        if (passive.type === 'everyNthBasic') assert(Number.isInteger(passive.every) && passive.every > 0, 'everyNthBasic needs a positive integer interval.');
        if (passive.type === 'followUp') assert(Number.isFinite(passive.multiplier) && passive.multiplier >= 0, 'followUp needs a non-negative multiplier.');
        if (passive.type === 'rampage') assert(Number.isFinite(passive.damageBonus) && passive.damageBonus >= 0 && Number.isInteger(passive.maxStacks) && passive.maxStacks >= 0, 'rampage needs a non-negative damageBonus and a non-negative integer maxStacks.');
      }
      assert(!archetype.skill || ['enhanceBasic', 'ricochet', 'tune'].includes(archetype.skill.type), 'Unsupported skill type in ' + instance.archetype + '.');
      assert(!archetype.ultimate || archetype.ultimate.type==='dawnSupport'||['physical', 'magical', 'true'].includes(archetype.ultimate.damageType), 'Ultimate needs a supported damage type or support handler.');
    }
  }
}

const RUNE_STAT_VALUES={hp:100,physicalAttack:20,magicalAttack:20,physicalDefense:4,magicalDefense:4,speed:20};
function signatureWeaponBonus(weapon){
 if(!weapon)return 0;
 assert(['standard','premium'].includes(weapon.type),'Weapon type must be standard or premium.');
 assert(Number.isInteger(weapon.potential)&&weapon.potential>=1&&weapon.potential<=5,'Weapon potential must be from 1 to 5.');
 return weapon.type==='standard'?.8+(weapon.potential-1)*.05:1+(weapon.potential-1)*.25;
}
function runeStatTotals(runes=[]){
 assert(Array.isArray(runes)&&runes.length<=4,'A character may equip up to four runes.');
 const totals=Object.fromEntries(Object.keys(RUNE_STAT_VALUES).map(key=>[key,0]));let setId=null;
 for(const rune of runes){
  assert(rune&&Object.hasOwn(RUNE_STAT_VALUES,rune.main),'Rune needs a valid main stat.');
  assert(Number.isInteger(rune.level)&&rune.level>=1&&rune.level<=5,'Rune level must be from 1 to 5.');
  assert(Array.isArray(rune.subs)&&rune.subs.length===3,'Rune needs exactly three substats.');
  assert(new Set([rune.main,...rune.subs]).size===4&&rune.subs.every(key=>Object.hasOwn(RUNE_STAT_VALUES,key)),'Rune stats must be unique within the rune.');
  if(rune.setId){assert(setId===null||setId===rune.setId,'All equipped runes must belong to one set.');setId=rune.setId;}
  totals[rune.main]+=RUNE_STAT_VALUES[rune.main]*rune.level;
  for(const key of rune.subs)totals[key]+=RUNE_STAT_VALUES[key]*.25*rune.level;
 }
 return totals;
}
function celestialFactor(unit,key){const level=unit.celestials?.[key]??0;assert(Number.isInteger(level)&&level>=0&&level<=10,'Celestial level must be from 1 to 10.');return 1+.1*level}

function instantiate(config, side) {
  return config.teams[side].map((instance, index) => {
    const archetype = config.archetypes[instance.archetype];
    const level = instance.level ?? archetype.level ?? 1;
    const weapon = instance.weapon ?? archetype.weapon ?? null;
    const weaponMultiplier = 1 + signatureWeaponBonus(weapon);
    const runeTotals = runeStatTotals(instance.runes ?? archetype.runes ?? []);
    const stats = Object.fromEntries(Object.entries(archetype.stats).map(([name, value]) => [name, roundStat((statAtLevel(value, level) + (runeTotals[name] || 0)) * weaponMultiplier)]));
    const characterDuplicates = instance.characterDuplicates ?? archetype.characterDuplicates ?? 0;
    assert(Number.isInteger(characterDuplicates) && characterDuplicates >= 0 && characterDuplicates <= 4, 'Character duplicates must be from 0 to 4.');
    const premiumWeaponDuplicates = weapon?.type === 'premium' ? weapon.potential - 1 : 0;
    assert(stats.physicalAttack !== undefined && stats.magicalAttack !== undefined && stats.physicalDefense !== undefined && stats.magicalDefense !== undefined, 'Archetype ' + instance.archetype + ' needs all six standard stats.');
    const maxEnergy = archetype.energy?.max ?? 120;
    const passives = (archetype.passives || []).map((passive, index) => ({
      ...passive,
      key: passive.id || passive.type + '-' + index,
      remaining: passive.type === 'followUp' && instance.archetype === 'soul' && characterDuplicates >= 1 ? 7 : passive.charges ?? Infinity,
      charges: passive.type === 'followUp' && instance.archetype === 'soul' && characterDuplicates >= 1 ? 7 : passive.charges,
      seenSources: new Set(),
      attackCount: 0
    }));
    return {
      id: instance.id,
      slot: instance.slot ?? index,
      archetypeId: instance.archetype,
      name: instance.name || archetype.name || instance.archetype,
      side,
      level,
      stats,
      hp: stats.hp,
      maxHp: stats.hp,
      criticalRate:instance.critical?.rate??archetype.critical?.rate??.1,
      criticalDamage:instance.critical?.damage??archetype.critical?.damage??.5,
      criticalRateBonus:(archetype.criticalRateBonus||0)+(instance.criticalRateBonus||0)+(instance.archetype==='soul'&&premiumWeaponDuplicates>=2?.1:0),
      criticalDamageBonus:(archetype.criticalDamageBonus||0)+(instance.criticalDamageBonus||0)+(instance.archetype==='soul'&&premiumWeaponDuplicates>=2?.25:0),
      criticalHits:0,
      tune:null,
      maxBarrier: side === 'enemies' ? roundStat(stats.hp * (instance.barrierPercent ?? archetype.barrierPercent ?? 0.2)) : 0,
      barrier: side === 'enemies' ? roundStat(stats.hp * (instance.barrierPercent ?? archetype.barrierPercent ?? 0.2)) : 0,
      barrierPercent: instance.barrierPercent ?? archetype.barrierPercent ?? 0.2,
      brokenTurns: 0,
      residueStacks: 0,
      residueTurns: 0,
      debuffs: [],
      marks: [],
      barriersBroken: 0,
      energy: Math.max(0, Math.min(maxEnergy, instance.energy ?? archetype.energy?.start ?? 0)),
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
      timeToNextTurn: 0,
      turnRate: 1,
      damageDealt: 0,
      damageTaken: 0,
      turns: 0,
      ultimateCount: 0,
      followUpCount: 0,
      aoeCount: 0
    };
  });
}
function attackValue(unit, type) {
  const multiplier=1+(unit.tune?.attackBonus||0),physical=roundStat(unit.stats.physicalAttack*multiplier),magical=roundStat(unit.stats.magicalAttack*multiplier);
  if (type === 'physical') return physical;
  if (type === 'magical') return magical;
  return (physical + magical) / 2;
}
function defenseValue(unit, type) {
  if (type === 'physical') return unit.stats.physicalDefense;
  if (type === 'magical') return unit.stats.magicalDefense;
  return (unit.stats.physicalDefense + unit.stats.magicalDefense) / 2;
}
function damageFor(attacker, target, type, multiplier) {
  const attack = attackValue(attacker, type);
  if (attack <= 0) return 0;
  const lethalImpact=attacker.passives.find(passive=>passive.type==='lethalImpact')?.defenseIgnore||0;
  const ignore=Math.min(1,Math.max(0,(attacker.tune?.defenseIgnore||0)+lethalImpact)),resistance=Math.max(0,1-(target.residueStacks||0)*.05),physicalDefense=target.stats.physicalDefense*resistance*(1-ignore),magicalDefense=target.stats.magicalDefense*resistance*(1-ignore);
  let reduction;
  if (type === 'true') {
    const physicalAttack=attackValue(attacker,'physical'),magicalAttack=attackValue(attacker,'magical');
    const physicalReduction = physicalAttack > 0 ? 0.5 * Math.min(physicalDefense / physicalAttack, 1) : 0;
    const magicalReduction = magicalAttack > 0 ? 0.5 * Math.min(magicalDefense / magicalAttack, 1) : 0;
    reduction = physicalReduction + magicalReduction;
  } else {
    reduction = Math.min((type==='physical'?physicalDefense:magicalDefense) / attack, 1);
  }
  const exposedStacks=target.marks.filter(mark=>mark.id==='exposed').length;
  if(exposedStacks)reduction*=Math.pow(.9,exposedStacks);
  return roundStat(attack * multiplier * (1 - reduction));
}
function rollCritical(state,unit,damage){
 if(damage<=0)return {damage,critical:false};
 const rate=Math.min(1,Math.max(0,(unit.criticalRate??.1)+(unit.criticalRateBonus||0)+(unit.tune?.criticalRateBonus||0)));
 const critical=state.random()<rate;
 if(critical){state.criticalHits++;unit.criticalHits=(unit.criticalHits||0)+1}
 return {damage:critical?roundStat(damage*(1+(unit.criticalDamage??.5)+(unit.criticalDamageBonus||0)+(unit.tune?.criticalDamageBonus||0))):damage,critical};
}
function applyExposed(attacker,targets){
 if(attacker.archetypeId!=='lily')return;
 const duplicate=attacker.characterDuplicates||0;
 for(const target of targets){if(target.hp<=0)continue;const old=target.marks.filter(m=>m.id==='exposed').length;target.marks=target.marks.filter(m=>m.id!=='exposed');const stacks=duplicate>=2?Math.min(2,old+1):1;for(let i=0;i<stacks;i++)target.marks.push({id:'exposed',turns:duplicate>=2?3:2})}
}
function applyLilyWeakened(attacker,targets){
 if(attacker.archetypeId!=='lily'||attacker.characterDuplicates<1)return;
 for(const target of targets){if(target.hp<=0)continue;target.debuffs=target.debuffs.filter(d=>d.id!=='lily-weakened');target.debuffs.push({id:'lily-weakened',turns:1,damageMultiplier:.9})}
}
function applyRicochet(state,sourceActor,sourceId,hits){
 const triggered=hits.filter(hit=>hit.damage>0&&hit.target.marks.some(m=>m.id==='ricochet'));
 if(!triggered.length)return;
 const lily=state.allies.find(unit=>unit.archetypeId==='lily'&&unit.hp>0);if(!lily)return;
 const targets=[...new Set(state.enemies.filter(enemy=>enemy.hp>0&&enemy.marks.some(m=>m.id==='ricochet')))];
 const sourceDamage=Math.max(...triggered.map(hit=>hit.damage));
 for(const enemy of targets){const mark=enemy.marks.find(m=>m.id==='ricochet');mark.sources ||= [];if(mark.sources.includes(sourceId))continue;mark.sources.push(sourceId);
  const base=roundStat(sourceDamage*.1);
  const repeats=lily.characterDuplicates>=4?2:1;
  for(let i=0;i<repeats&&enemy.hp>0;i++){const raw=base*(i===1?.5:1),trueAttack=attackValue(lily,'true'),uncrit=roundStat(raw*(trueAttack>0?damageFor(lily,enemy,'true',1)/trueAttack:0)),roll=rollCritical(state,lily,uncrit);
   const before=enemy.hp,damage=Math.min(before,roll.damage);enemy.hp=Math.max(0,enemy.hp-damage);enemy.damageTaken+=damage;lily.damageDealt+=damage;state.damageBySide.allies+=damage;
  }
 }
}
function cleanse(unit, full = true) {
  if (full) { unit.debuffs = []; unit.marks = []; return; }
  unit.debuffs.shift(); unit.marks.shift();
}
function ageMarks(unit){unit.marks=unit.marks.map(mark=>({...mark,turns:mark.turns-1})).filter(mark=>mark.turns>0);unit.debuffs=unit.debuffs.map(debuff=>({...debuff,turns:debuff.turns-1})).filter(debuff=>debuff.turns>0)}
function brokenDuration(speed, baseTurns) {
  const speedFactor = Math.max(0.5, Math.min(1.5, 2 - speed / 100));
  return Math.max(1, roundStat(baseTurns * speedFactor));
}
function chooseTarget(actor, candidates, mode, random) {
  if (!candidates.length) return [];
  if (mode === 'aoe') return [...candidates];
  const primary = mode === 'lowestHp' || (actor.side !== 'enemies' && mode !== 'random')
    ? candidates.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0]
    : candidates[Math.floor(random() * candidates.length)];
  if (mode === 'blast') return candidates.filter(unit => Math.abs(unit.slot - primary.slot) <= 1).sort((a, b) => a.slot - b.slot);
  return [primary];
}
function runAttack(state, attacker, candidates, spec, options = {}) {
  if (!candidates.length) return [];
  const targets = chooseTarget(attacker, candidates, options.targetMode || spec.target || 'single', state.random);
  if (!targets.length) return [];
  const hits = [];
  for (const target of targets) {
    const hpBefore = target.hp;
    const baseDamage = damageFor(attacker, target, spec.damageType, (options.multiplier ?? spec.multiplier)*(1-(attacker.residueStacks||0)*.05));
    const roll=rollCritical(state,attacker,baseDamage),damage = roundStat(roll.damage*(1-(target.tune?.damageReduction||0)) * (target.side === 'enemies' && target.brokenTurns > 0 ? 1.5 : 1));
    target.hp = Math.max(0, target.hp - damage);
    const hpDamage=Math.min(hpBefore,damage);
    let barrierDamage = 0, breakDamage = 0, broken = false;
    if (target.side === 'enemies' && target.barrier > 0) {
      barrierDamage = damage * 0.25*(1+(attacker.tune?.barrierDamageBonus||0));
      target.barrier = Math.max(0, target.barrier - barrierDamage);
      if (target.barrier === 0) {
        target.brokenTurns = brokenDuration(target.stats.speed, Math.max(1, state.enemyAverage / state.slowerAverage));
        breakDamage = roundStat(target.maxHp * 0.1);
        const appliedBreakDamage=Math.min(target.hp,breakDamage);
        target.hp = Math.max(0, target.hp - breakDamage);
        breakDamage=appliedBreakDamage;
        target.barriersBroken++;
        broken = true;
      }
    }
    target.damageTaken += hpDamage + breakDamage;
    attacker.damageDealt += hpDamage + breakDamage;
    state.damageBySide[attacker.side] += hpDamage + breakDamage;
    hits.push({ target, damage: hpDamage + breakDamage, barrierDamage, breakDamage, barrierRemaining: target.barrier, broken,critical:roll.critical });
  }
  if (targets.length > 1) attacker.aoeCount++;
  return hits;
}
function applyResidue(attacker,targets){
 if(!attacker.passives.some(passive=>passive.type==='residue'))return;
 for(const target of targets){if(target.hp<=0)continue;target.residueStacks=Math.min(5,(target.residueStacks||0)+1);target.residueTurns=2}
}
function ageResidue(unit){if(!unit.residueStacks)return;unit.residueTurns--;if(unit.residueTurns<=0){unit.residueStacks=0;unit.residueTurns=0}}
function triggerFollowUps(state, sourceId, sourceActorId, affectedTargets) {
  const targets = [...new Set(affectedTargets.filter(target => target.hp > 0))];
  if (!targets.length) return;
  for (const soul of state.allies) {
    if (soul.hp <= 0 || soul.id === sourceActorId) continue;
    for (const passive of soul.passives.filter(p => p.type === 'followUp')) {
      if (passive.remaining <= 0 || passive.seenSources.has(sourceId)) continue;
      const activeTargets = targets.filter(target => target.hp > 0);
      if (!activeTargets.length) break;
      const rawTotal = roundStat(attackValue(soul, passive.damageType) * passive.multiplier * (soul.archetypeId === 'soul' && soul.characterDuplicates >= 2 ? 2 : 1) * celestialFactor(soul, 'passive'));
      if (rawTotal <= 0) continue;
      passive.seenSources.add(sourceId);
      passive.remaining--;
      soul.followUpCount++;
      soul.followUpActivations++;
      if (soul.archetypeId === 'soul' && soul.premiumWeaponDuplicates >= 4 && soul.followUpActivations % 2 === 0) passive.remaining = Math.min(passive.charges ?? 5, passive.remaining + 1);
      const base = Math.floor(rawTotal / activeTargets.length);
      const remainder = rawTotal % activeTargets.length;
      activeTargets.forEach((target, index) => {
        const share = base + (index < remainder ? 1 : 0);
        const divisor = attackValue(soul, passive.damageType);
        const uncrit=damageFor(soul, target, passive.damageType, share / divisor),damage=Math.min(target.hp,rollCritical(state,soul,uncrit).damage);
        target.hp = Math.max(0, target.hp - damage);
        target.damageTaken += damage;
        soul.damageDealt += damage;
        state.damageBySide.allies += damage;
      });
    }
  }
}
function refillPassives(unit, passiveIds) {
  for (const passive of unit.passives) {
    if (passive.type === 'followUp' && (!passiveIds || passiveIds.includes(passive.id))) {
      passive.remaining = passive.charges ?? 5;
      passive.seenSources.clear();
    }
  }
}
function ageTune(unit){if(!unit.tune)return;if(unit.tune.skipFirstTick){unit.tune.skipFirstTick=false;return}unit.tune.turns--;if(unit.tune.turns<=0)unit.tune=null}
function dawnPremiumDuplicates(unit){return unit.archetypeId==='dawn'&&unit.weapon?.type==='premium'?unit.premiumWeaponDuplicates:0}
function chooseDawnTarget(state,actor){
 const living=state.allies.filter(unit=>unit.hp>0),soul=living.find(unit=>unit.archetypeId==='soul');
 if(soul&&soul.id!==actor.id)return soul;
 return living.filter(unit=>unit.id!==actor.id).slice().sort((a,b)=>attackValue(b,b.basic.damageType)*b.basic.multiplier-attackValue(a,a.basic.damageType)*a.basic.multiplier||a.id.localeCompare(b.id))[0]||actor;
}
function advanceTurn(state,unit,percent){unit.timeToNextTurn=Math.max(state.currentTime,unit.timeToNextTurn-percent/100/Math.max(unit.turnRate,EPSILON))}
function applyDawnTune(state,actor,target){
 const premium=dawnPremiumDuplicates(actor),duplicates=actor.characterDuplicates||0;
 target.tune={turns:duplicates>=3?2:1,skipFirstTick:target.id===actor.id,basicEnhanced:true,damageBonus:.4+(duplicates>=4 ? .4 : 0),attackBonus:duplicates>=3 ? .2 : 0,defenseIgnore:actor.weapon&&(actor.weapon.type==='standard'||actor.weapon.type==='premium') ? .2 : 0,damageReduction:premium>=1 ? .2 : 0,barrierDamageBonus:premium>=2 ? .2 : 0,criticalRateBonus:premium>=4 ? .2 : 0,criticalDamageBonus:premium>=4 ? .5 : 0};
 if(premium>=3)advanceTurn(state,target,20);
}
function resolveAllyAction(state, actor) {
  let foes = state.enemies.filter(unit => unit.hp > 0);
  if (!foes.length) return;
  if(actor.isHauntling){
    const id=++state.sourceSerial,hits=runAttack(state,actor,foes,{damageType:'true',multiplier:1,target:'aoe'},{multiplier:celestialFactor(actor,'ultimate')});
    applyExposed(state.allies.find(u=>u.archetypeId==='lily')||actor,hits.map(hit=>hit.target));
    applyLilyWeakened(state.allies.find(u=>u.archetypeId==='lily')||actor,hits.map(hit=>hit.target));
    applyRicochet(state,actor,id,hits);triggerFollowUps(state,id,actor.id,hits.map(hit=>hit.target));
    actor.turnsRemaining--;if(actor.turnsRemaining<=0)actor.hp=0;return;
  }
  const ultimate = actor.ultimate;
  if (ultimate && actor.energy >= (ultimate.energyCost ?? 100)) {
    actor.energy -= ultimate.energyCost ?? 100;
    actor.ultimateCount++;
    if(ultimate.type==='dawnSupport'&&actor.archetypeId==='dawn'){
      const target=chooseDawnTarget(state,actor);target.energy=Math.min(target.maxEnergy,target.energy+target.maxEnergy*(actor.characterDuplicates>=1?1:.5));
      state.skillPoints=Math.min(state.skillPointCap,state.skillPoints+(actor.characterDuplicates>=2?3:1));advanceTurn(state,target,100);
    }else{
    const duplicate=actor.archetypeId==='soul'&&actor.characterDuplicates>=3?2:actor.archetypeId==='lily'&&actor.characterDuplicates>=3?2:1;
    const hits = runAttack(state, actor, foes, ultimate, { multiplier: ultimate.multiplier * duplicate * celestialFactor(actor, 'ultimate') });
    const sourceId=++state.sourceSerial;
    if(actor.archetypeId==='lily')applyExposed(actor,hits.map(hit=>hit.target));
    if(actor.archetypeId==='lily')applyLilyWeakened(actor,hits.map(hit=>hit.target));
    applyRicochet(state,actor,sourceId,hits);triggerFollowUps(state, sourceId, actor.id, hits.map(hit => hit.target));
    if (ultimate.refillFollowUps) refillPassives(actor);
    if(actor.archetypeId==='lily'&&state.enemies.some(unit=>unit.hp>0)){
      const summon={...actor,id:'hauntling-'+sourceId,name:'Hauntling',isHauntling:true,turnsRemaining:actor.characterDuplicates>=3?4:3,hp:1,maxHp:1,energy:0,ultimate:null,skill:null,basic:{damageType:'true',multiplier:1,target:'aoe'},passives:[],timeToNextTurn:state.currentTime,turnRate:actor.turnRate,turns:0,damageDealt:0,damageTaken:0,followUpCount:0,ultimateCount:0,aoeCount:0};
      state.allies.push(summon);
    }
    }
    foes = state.enemies.filter(unit => unit.hp > 0);
    if (!foes.length) return;
  }
  const skill = actor.skill;
  if(skill?.type==='tune'&&actor.archetypeId==='dawn'&&state.skillPoints>0){
    state.skillPoints--;state.skillUses++;actor.energy=Math.min(actor.maxEnergy,actor.energy+(skill.energyGain??20));
    applyDawnTune(state,actor,chooseDawnTarget(state,actor));ageTune(actor);return;
  }
  if (skill?.type === 'enhanceBasic') {
    while (state.skillPoints > 0 && actor.enhanceStacks < (skill.maxStacks ?? Infinity)) {
      state.skillPoints--;
      actor.enhanceStacks++;
      state.skillUses++;
      if (actor.archetypeId === 'soul' && actor.weapon?.type === 'premium') {
        actor.enhanceSpentRemainder++;
        if (actor.enhanceSpentRemainder >= 3) {
          actor.enhanceSpentRemainder -= 3;
          state.skillPoints = Math.min(state.skillPointCap, state.skillPoints + 1);
        }
      }
    }
  }
  if(skill?.type==='ricochet'&&state.skillPoints>0){
    state.skillPoints--;state.skillUses++;actor.energy=Math.min(actor.maxEnergy,actor.energy+(skill.energyGain??20));
    const sourceId=++state.sourceSerial,hits=runAttack(state,actor,foes,skill,{multiplier:skill.multiplier*celestialFactor(actor,'skill'),targetMode:'aoe'});
    applyRicochet(state,actor,sourceId,hits);applyExposed(actor,hits.map(hit=>hit.target));
    for(const hit of hits)if(hit.target.hp>0){hit.target.marks=hit.target.marks.filter(m=>m.id!=='ricochet');hit.target.marks.push({id:'ricochet',turns:skill.markTurns??2,sources:[]})}
    triggerFollowUps(state,sourceId,actor.id,hits.map(hit=>hit.target));ageTune(actor);return;
  }
  const basic = actor.basic;
  const stacks = actor.enhanceStacks;
  const baseBasicMultiplier = basic.multiplier * (actor.archetypeId === 'soul' && actor.premiumWeaponDuplicates >= 1 ? 2 : 1);
  const skillPerStack = (skill?.damagePerStack ?? 0) * (actor.archetypeId === 'soul' && actor.characterDuplicates >= 4 ? 2 : 1);
  const multiplier = (baseBasicMultiplier * celestialFactor(actor, 'basic') + stacks * skillPerStack * celestialFactor(actor, 'skill'))*(actor.tune?.basicEnhanced?1+actor.tune.damageBonus:1);
  const targetMode = skill && stacks >= (skill.blastAtStacks ?? Infinity) ? (actor.archetypeId === 'soul' && actor.premiumWeaponDuplicates >= 3 ? 'aoe' : 'blast') : basic.target;
  const lilyBasic=actor.archetypeId==='lily';
  const hits = runAttack(state, actor, foes, basic, { multiplier:lilyBasic?basic.multiplier*celestialFactor(actor,'basic')*(actor.tune?.basicEnhanced?1+actor.tune.damageBonus:1):multiplier, targetMode });
  actor.basicAttackCount++;
  actor.energy = Math.min(actor.maxEnergy, actor.energy + (lilyBasic?10:(basic.energyGain ?? 0) + stacks * (skill?.energyPerStack ?? 0)));
  state.skillPoints = Math.min(state.skillPointCap, state.skillPoints + (lilyBasic?0:(basic.skillPointGain ?? 0)));
  if(actor.tune?.basicEnhanced){actor.tune.basicEnhanced=false;state.skillPoints=Math.min(state.skillPointCap,state.skillPoints+1)}
  actor.enhanceStacks = 0;
  const sourceId=++state.sourceSerial;applyRicochet(state,actor,sourceId,hits);triggerFollowUps(state, sourceId, actor.id, hits.map(hit => hit.target));
  ageTune(actor);
}
function resolveEnemyAction(state, actor) {
  const targets = state.allies.filter(unit => unit.hp > 0);
  if (!targets.length) return;
  const basic = actor.basic;
  actor.basicAttackCount++;
  let targetMode = basic.target;
  let multiplier = basic.multiplier*(actor.debuffs||[]).reduce((value,debuff)=>value*(debuff.damageMultiplier??1),1);
  const rampage = actor.passives.find(passive => passive.type === 'rampage');
  if (rampage) multiplier *= 1 + rampage.damageBonus * (rampage.stacks || 0);
  for (const passive of actor.passives) {
    if (passive.type !== 'everyNthBasic') continue;
    passive.attackCount++;
    if (passive.attackCount % passive.every === 0) {
      targetMode = passive.target || 'all';
      multiplier *= 1 + passive.damageBonus;
    }
  }
  const hits = runAttack(state, actor, targets, basic, { targetMode, multiplier });
  applyResidue(actor,hits.map(hit=>hit.target));
  if (rampage && hits.some(hit => hit.damage > 0)) rampage.stacks = Math.min(rampage.maxStacks, (rampage.stacks || 0) + 1);
}
function simulateBattle(config, seed = 1, maxActionsOverride = null) {
  validateConfig(config);
  const random = makeRng(seed);
  const allies = instantiate(config, 'allies');
  const enemies = instantiate(config, 'enemies');
  const allyAverage = mean(allies.map(effectiveSpeed));
  const enemyAverage = mean(enemies.map(effectiveSpeed));
  const slowerAverage = Math.min(allyAverage, enemyAverage);
  for (const unit of allies) unit.turnRate = Math.max(1, (effectiveSpeed(unit) + allyAverage) / (2 * slowerAverage));
  for (const unit of enemies) unit.turnRate = Math.max(1, (effectiveSpeed(unit) + enemyAverage) / (2 * slowerAverage));
  for (const unit of [...allies, ...enemies]) unit.timeToNextTurn = 1 / unit.turnRate;
  const settings = config.settings || {};
  const state = {
    allies, enemies, random, sourceSerial: 0,
    skillPointCap: (settings.skillPointCap ?? 5)+(allies.some(unit=>unit.passives.some(passive=>passive.type==='resourceful'))?2:0),
    skillPoints: 0,
    skillUses: 0,
    damageBySide: { allies: 0, enemies: 0 },
    actions: 0, allyTurns: 0, enemyTurns: 0, enemyAverage, slowerAverage,
    maxActions: maxActionsOverride ?? settings.maxActions ?? 2000, currentTime:0,criticalHits:0
  };
  const resourceful=allies.some(unit=>unit.passives.some(passive=>passive.type==='resourceful'));
  state.skillPoints=Math.min(state.skillPointCap,(settings.initialSkillPoints??3)+(resourceful?2:0));
  while (state.actions < state.maxActions && allies.some(unit => unit.hp > 0) && enemies.some(unit => unit.hp > 0)) {
    const living = [...allies, ...enemies].filter(unit => unit.hp > 0);
    const nextAt = Math.min(...living.map(unit => unit.timeToNextTurn));
    state.currentTime=nextAt;
    const ready = living.filter(unit => Math.abs(unit.timeToNextTurn - nextAt) <= EPSILON);
    const actor = ready[Math.floor(random() * ready.length)];
    actor.timeToNextTurn += 1 / actor.turnRate;
    state.actions++;
    actor.turns++;
    if (actor.side === 'allies') {
      state.allyTurns++;
      resolveAllyAction(state, actor);
      ageResidue(actor);
    } else {
      state.enemyTurns++;
      if (actor.brokenTurns > 0) {
        actor.brokenTurns--;
        ageMarks(actor);
        if (actor.brokenTurns === 0) {
          actor.barrier = actor.maxBarrier;
          cleanse(actor);
          actor.timeToNextTurn = Math.min(actor.timeToNextTurn, nextAt);
        }
      } else {resolveEnemyAction(state, actor);ageMarks(actor)}
    }
  }
  const winner = !allies.some(unit => unit.hp > 0) ? 'enemies' : !enemies.some(unit => unit.hp > 0) ? 'allies' : 'draw';
  return {
    winner, actions: state.actions, allyTurns: state.allyTurns, enemyTurns: state.enemyTurns, elapsedTime:state.currentTime,
    skillUses: state.skillUses, skillPointsRemaining: state.skillPoints,criticalHits:state.criticalHits,
    damageDealt: state.damageBySide,
    unitStats:allies.reduce((out,unit)=>{const key=unit.archetypeId;if(!out[key])out[key]={damage:0,turns:0,criticalHits:0};out[key].damage+=unit.damageDealt;out[key].turns+=unit.turns;out[key].criticalHits+=unit.criticalHits||0;return out;},{}),
    followUps: allies.reduce((sum, unit) => sum + unit.followUpCount, 0),
    ultimates: allies.reduce((sum, unit) => sum + unit.ultimateCount, 0),
    aoeAttacks: [...allies, ...enemies].reduce((sum, unit) => sum + unit.aoeCount, 0),
    barriersBroken: enemies.reduce((sum, unit) => sum + unit.barriersBroken, 0),
    survivors: {
      allies: allies.filter(unit => unit.hp > 0).map(unit => ({ id: unit.id, hp: unit.hp, maxHp: unit.maxHp })),
      enemies: enemies.filter(unit => unit.hp > 0).map(unit => ({ id: unit.id, hp: unit.hp, maxHp: unit.maxHp, barrier: unit.barrier, maxBarrier: unit.maxBarrier, brokenTurns: unit.brokenTurns }))
    }
  };
}
function simulateBatch(config, runs = 100, seed = 1, maxActions = null) {
  assert(Number.isInteger(runs) && runs > 0, 'Runs must be a positive integer.');
  const results = Array.from({ length: runs }, (_, index) => simulateBattle(config, seed + index, maxActions));
  const meanOf = key => results.reduce((sum, result) => sum + result[key], 0) / runs;
  const wins = { allies: 0, enemies: 0, draws: 0 };
  for (const result of results) wins[result.winner === 'draw' ? 'draws' : result.winner]++;
  return {
    runs, seed, wins,
    winRate: { allies: wins.allies / runs, enemies: wins.enemies / runs, draws: wins.draws / runs },
    averageActions: meanOf('actions'), averageAllyTurns: meanOf('allyTurns'), averageEnemyTurns: meanOf('enemyTurns'), averageElapsedTime:meanOf('elapsedTime'),
    averageSkillUses: meanOf('skillUses'), averageFollowUps: meanOf('followUps'),averageCriticalHits:meanOf('criticalHits'),
    averageUltimates: meanOf('ultimates'), averageAoeAttacks: meanOf('aoeAttacks'),
    averageDamageDealt: {
      allies: results.reduce((sum, result) => sum + result.damageDealt.allies, 0) / runs,
      enemies: results.reduce((sum, result) => sum + result.damageDealt.enemies, 0) / runs
    },
    averageAllyDps:results.reduce((sum,result)=>sum+result.damageDealt.allies/Math.max(result.elapsedTime,EPSILON),0)/runs,
    averageDamagePerAllyTurn:results.reduce((sum,result)=>sum+result.damageDealt.allies/Math.max(result.allyTurns,1),0)/runs,
    averageUnitStats:Object.fromEntries([...new Set(results.flatMap(result=>Object.keys(result.unitStats)))].map(id=>[id,{damage:results.reduce((sum,result)=>sum+(result.unitStats[id]?.damage||0),0)/runs,turns:results.reduce((sum,result)=>sum+(result.unitStats[id]?.turns||0),0)/runs,dps:results.reduce((sum,result)=>sum+(result.unitStats[id]?.damage||0)/Math.max(result.elapsedTime,EPSILON),0)/runs,criticalHits:results.reduce((sum,result)=>sum+(result.unitStats[id]?.criticalHits||0),0)/runs}])),
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
