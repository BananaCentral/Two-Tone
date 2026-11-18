// Shared deterministic combat runtime primitives.
import { calculateCombatHit, roundCombatHp, roundCombatStatQuarter } from './combat-math.mjs';
import { COMBAT_EFFECT_LIFECYCLE, COMBAT_EFFECT_LIFECYCLE_EVENTS, getActiveCharacterUpgradeEffect, getCharacterUpgradeEffect, RUNE_COMBAT_RULES } from './combat-definitions.mjs';
export { roundCombatHp, roundCombatStatQuarter };

function activeUpgradeEffect(id, state = {}) {
  return getActiveCharacterUpgradeEffect(id, state);
}
function upgradeValue(id, key, state = {}, fallback = 0) {
  return activeUpgradeEffect(id, state)?.values?.[key] ?? fallback;
}

export class TwoToneTurnTimeline {
 constructor(){this.clock=0;this.states=new Map();this.sequence=0;this.history=[];this.averages={ally:0,enemy:0};}
 reset(){this.clock=0;this.states.clear();this.sequence=0;this.history=[];this.averages={ally:0,enemy:0};}
 static mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:1}
 static positive(v){return Number.isFinite(v)&&v>0?v:1}
 static rate(speed,teamAverage,slower){return Math.max(1,(speed+teamAverage)/(2*slower))}
 // Supply all associated characters in averages, including defeated members.
 // `units` are the actual living scheduled participants (plus independent summons).
 sync(units,alliedMembers,enemyMembers){
  const ally=TwoToneTurnTimeline.mean(alliedMembers.map(x=>TwoToneTurnTimeline.positive(x.speed)));
  const enemy=TwoToneTurnTimeline.mean(enemyMembers.map(x=>TwoToneTurnTimeline.positive(x.speed)));
  this.averages={ally,enemy};const slower=Math.min(ally,enemy),valid=new Set();
  for(const u of units){valid.add(u.id);
   const speed=TwoToneTurnTimeline.positive(u.speed),teamAverage=u.faction==='enemy'?enemy:ally;
   const rate=TwoToneTurnTimeline.rate(speed,teamAverage,slower);
   let state=this.states.get(u.id);
   if(!state){state={id:u.id,faction:u.faction,summon:!!u.summon,speed,rate,credit:0,index:0,nominal:[],cycle:0,carry:0,anchor:this.clock,mode:'cycle',immediate:false};this.states.set(u.id,state);}
   else if(Math.abs(state.rate-rate)>1e-9){this.changeRate(state,rate);}
   state.speed=speed;state.rate=rate;state.faction=u.faction;state.summon=!!u.summon;
  }
  for(const id of Array.from(this.states.keys()))if(!valid.has(id))this.states.delete(id);
 }
 fill(state,wanted){
  if(state.mode==='resync'){
   while(state.nominal.length<=wanted){
    if(state.resyncNext<state.anchor-1e-9){
     state.nominal.push(state.resyncNext);state.resyncNext+=1/state.rate;continue;
    }
    const total=state.carry+state.rate,count=Math.max(1,Math.floor(total+1e-10));
    state.carry=Math.max(0,total-count);
    for(let j=0;j<count;j++)state.nominal.push(state.anchor+state.cycle+(j+.5)/count);
    state.cycle++;
   }
   return;
  }
  while(state.nominal.length<=wanted){
   const total=state.carry+state.rate, count=Math.max(1,Math.floor(total+1e-10));
   state.carry=Math.max(0,total-count);
   for(let j=0;j<count;j++)state.nominal.push(state.anchor+state.cycle+(j+.5)/count);
   state.cycle++;
  }
 }
 nominalAt(state,x){
  const upper=Math.max(3,Math.ceil(x)+2);this.fill(state,upper);
  if(x<0){const gap=state.nominal[1]-state.nominal[0];return state.nominal[0]+x*gap;}
  const k=Math.floor(x),f=x-k;
  return state.nominal[k]*(1-f)+state.nominal[k+1]*f;
 }
 due(state){return state.immediate?this.clock:this.nominalAt(state,state.index-state.credit)}
 changeRate(state,newRate){
  const old=state.rate,nextBase=this.nominalAt(state,state.index);
  const first=this.clock+(nextBase-this.clock)*(old/newRate);
  // Keep earned/spent credit exactly; only the future Speed-derived spacing changes.
  state.nominal=[first];state.index=0;state.rate=newRate;state.mode='resync';
  state.anchor=Math.floor(first)+1;state.resyncNext=first+1/newRate;
  state.carry=(Math.floor(state.anchor)*newRate)%1;state.cycle=0;
 }
 modify(id,percent){
  const s=this.states.get(id);if(!s||!Number.isFinite(percent)||Math.abs(percent)>1000)return false;
  s.credit+=percent/100;
  this.history.push({kind:percent>=0?'advance':'delay',id,percent,credit:s.credit,clock:this.clock});return true;
 }
 immediateFirst(id){const s=this.states.get(id);if(!s||!s.summon)return false;s.immediate=true;this.history.push({kind:'summon-first-ready',id,clock:this.clock});return true;}
 // Immutable preview simulation: prediction does not mutate actual turn indices or clock.
 preview(count=6){
  const indexes=new Map(Array.from(this.states.entries()).map(([id,s])=>[id,s.index]));
  const first=new Set(Array.from(this.states.values()).filter(s=>s.immediate).map(s=>s.id));
  const result=[],eps=1e-9;
  for(let i=0;i<count;i++){
   const ordered=Array.from(this.states.values()).map(s=>({s,time:Math.max(this.clock,first.has(s.id)?this.clock:this.nominalAt(s,indexes.get(s.id)-s.credit))}))
     .sort((a,b)=>a.time-b.time || Number(first.has(b.s.id))-Number(first.has(a.s.id)) || b.s.speed-a.s.speed || (a.s.faction==='ally'?-1:1)-(b.s.faction==='ally'?-1:1) || a.s.id.localeCompare(b.s.id));
   if(!ordered.length)break;const {s,time}=ordered[0];result.push({id:s.id,at:Math.max(this.clock,time),summon:s.summon});indexes.set(s.id,indexes.get(s.id)+1);first.delete(s.id);
  }return result;
 }
 take(){
  const next=this.preview(1)[0];if(!next)return null;
  this.clock=Math.max(this.clock,next.at);const s=this.states.get(next.id);
  const immediate=s.immediate;s.immediate=false;s.index++;
  const result={...next,clock:this.clock,immediate,rate:s.rate,credit:s.credit};
  this.history.push({kind:'turn',id:result.id,clock:this.clock,immediate});return result;
 }
 snapshot(){return {clock:this.clock,averages:{...this.averages},states:Array.from(this.states.values()).map(s=>({id:s.id,speed:s.speed,rate:s.rate,credit:s.credit,index:s.index,immediate:s.immediate,nextAt:Math.max(this.clock,this.due(s)),summon:s.summon})),history:this.history.slice(-40),order:this.preview(8)};}
}

// Shared combat decision primitives used by live battles and headless analysis.
export class TwoToneBattleEngine {
  constructor() {
    this.timeline = new TwoToneTurnTimeline();
    this.turnCount = 0;
  }
  resetBattle() { this.timeline.reset(); this.turnCount = 0; }
  resolveBattleOutcome({ allies = [], enemies = [], encounterComplete = false,
    actionLimitReached = false, noEnemyMeansVictory = true } = {}) {
    if (!Array.isArray(allies) || !Array.isArray(enemies)) return 'invalid';
    const alliesAlive = allies.some(unit => unit && unit.hp > 0);
    const enemiesAlive = enemies.some(unit => unit && unit.hp > 0);
    if (!alliesAlive) return 'defeat';
    if (encounterComplete || (noEnemyMeansVictory && !enemiesAlive)) return 'victory';
    return actionLimitReached ? 'incomplete' : 'ongoing';
  }
  syncTurnOrder(units, alliedMembers, enemyMembers) {
    this.timeline.sync(units, alliedMembers, enemyMembers);
    return this.timeline.snapshot();
  }
  scheduleTurn({ units, alliedMembers, enemyMembers, immediateSummonIds = [] } = {}) {
    this.syncTurnOrder(units || [], alliedMembers || [], enemyMembers || []);
    for (const id of immediateSummonIds) this.timeline.immediateFirst(id);
    const next = this.timeline.take();
    if (next) this.turnCount++;
    return next ? Object.freeze({ ...next, turnNumber: this.turnCount }) : null;
  }
  resolveTargets({ candidates = [], mode = 'single', primary = null } = {}) {
    if (!Array.isArray(candidates) || !['single', 'random', 'lowestHp', 'blast', 'aoe', 'five-hit'].includes(mode)) return Object.freeze([]);
    const living = candidates.filter(unit => unit && unit.hp > 0);
    if (mode === 'aoe') return Object.freeze(living.slice());
    if (!primary || primary.hp <= 0 || !living.some(unit => unit.id === primary.id)) return Object.freeze([]);
    if (mode === 'blast' && Number.isFinite(primary.slot)) return Object.freeze(living.filter(unit => Number.isFinite(unit.slot) && Math.abs(unit.slot - primary.slot) <= 1).sort((a,b)=>a.slot-b.slot));
    return Object.freeze([primary]);
  }
  ageUnitEffects(unit, { event = null, marks = false, debuffs = false, taunts = false, tune = false, residue = false } = {}) {
    if (!unit) return Object.freeze({ tuneExpired: false, residueExpired: false });
    const clock = event || 'affected_turn_end';
    if (!COMBAT_EFFECT_LIFECYCLE_EVENTS.includes(clock)) throw new Error(`Unknown combat effect lifecycle event: ${clock}`);
    const selected = event ? null : new Set([
      ...(marks ? ['marks'] : []), ...(debuffs ? ['debuffs'] : []),
      ...(taunts ? ['tauntEffects'] : []), ...(tune ? ['tune'] : []), ...(residue ? ['residue'] : [])
    ]);
    const ageList = (list, storage) => (Array.isArray(list) ? list.map(effect => {
      const effectId = effect.id || (storage === 'tauntEffects' ? 'taunt' : null);
      const rule = COMBAT_EFFECT_LIFECYCLE[effectId];
      if (Number.isFinite(effect.turns) && (!rule || rule.storage !== storage)) throw new Error(`Timed ${storage} effect ${effectId || '(missing id)'} has no compatible lifecycle definition.`);
      if (!rule || rule.storage !== storage || rule.clock !== clock || (selected && !selected.has(storage))) return effect;
      return { ...effect, turns: Number.isFinite(effect.turns) ? effect.turns - 1 : effect.turns };
    }).filter(effect => !Number.isFinite(effect.turns) || effect.turns > 0) : []);
    if (event || marks) unit.marks = ageList(unit.marks, 'marks');
    if (event || debuffs) unit.debuffs = ageList(unit.debuffs, 'debuffs');
    if (event || taunts) unit.tauntEffects = ageList(unit.tauntEffects, 'tauntEffects');
    let tuneExpired = false;
    const tuneRule = COMBAT_EFFECT_LIFECYCLE.tune;
    if ((event || tune) && unit.tune && tuneRule.clock === clock && (!selected || selected.has(tuneRule.storage))) {
      if (unit.tune.skipFirstTick) unit.tune.skipFirstTick = false;
      else {
        unit.tune.turns--;
        if (unit.tune.turns <= 0) { unit.tune = null; tuneExpired = true; }
      }
    }
    let residueExpired = false;
    const residueRule = COMBAT_EFFECT_LIFECYCLE.residue;
    if ((event || residue) && unit.residueStacks && residueRule.clock === clock && (!selected || selected.has(residueRule.storage))) {
      unit.residueTurns = Math.max(0, (unit.residueTurns || 0) - 1);
      if (unit.residueTurns === 0) {
        unit.residueStacks = 0;
        unit.residueMaxStacks = null;
        unit.residueDamageReductionPerStack = null;
        unit.residueResistanceReductionPerStack = null;
        residueExpired = true;
      }
    }
    return Object.freeze({ tuneExpired, residueExpired });
  }
  clearUnitEffects(unit, { full = true, marks = true, debuffs = true, taunts = full, bleed = true, reason = 'cleanse' } = {}) {
    if (!unit) return false;
    const clear = (items, idFor) => (Array.isArray(items) ? items.filter(effect => {
      const id = idFor(effect), rule = COMBAT_EFFECT_LIFECYCLE[id];
      return rule ? !rule.removeOn?.includes(reason) : false;
    }) : []);
    if (full) {
      if (marks) unit.marks = clear(unit.marks, effect => effect.id);
      if (debuffs) unit.debuffs = clear(unit.debuffs, effect => effect.id);
      if (taunts) unit.tauntEffects = clear(unit.tauntEffects, effect => effect.id || 'taunt');
      if (bleed && COMBAT_EFFECT_LIFECYCLE.bleed.removeOn?.includes(reason)) unit.bleedStacks = [];
      if (unit.tune && COMBAT_EFFECT_LIFECYCLE.tune.removeOn?.includes(reason)) unit.tune = null;
      if (unit.residueStacks && COMBAT_EFFECT_LIFECYCLE.residue.removeOn?.includes(reason)) {
        unit.residueStacks = 0; unit.residueTurns = 0; unit.residueMaxStacks = null;
        unit.residueDamageReductionPerStack = null; unit.residueResistanceReductionPerStack = null;
      }
    } else {
      if (marks) unit.marks?.shift();
      if (debuffs) unit.debuffs?.shift();
      if (taunts) unit.tauntEffects?.shift();
      if (bleed) unit.bleedStacks?.shift();
    }
    return true;
  }
  applyBleed({ target, sourceId, stacks = 1, maxStacks = COMBAT_EFFECT_LIFECYCLE.bleed.defaultMaxStacks } = {}) {
    if (COMBAT_EFFECT_LIFECYCLE.bleed.reapply !== 'add_to_cap' || !target || target.hp <= 0 || typeof sourceId !== 'string' || !sourceId || !Number.isInteger(stacks) || stacks < 1 || !Number.isInteger(maxStacks) || maxStacks < 1) return 0;
    target.bleedStacks = Array.isArray(target.bleedStacks) ? target.bleedStacks : [];
    target.bleedMaxStacks = maxStacks;
    const added = Math.min(stacks, Math.max(0, maxStacks - target.bleedStacks.length));
    for (let index = 0; index < added; index++) target.bleedStacks.push({ sourceId });
    return added;
  }
  // Per-hit authored effects live here so the browser and simulator cannot
  // disagree about Bleed, Exposed, Ricochet marks, or character-duplicate
  // triggers. Clients report the resolved hit and equipment state.
  resolveHitEffects({ actor, target, hit, action, passives = actor?.passives || [],
    characterDuplicates = actor?.characterDuplicates || 0, premiumWeaponDuplicates = 0,
    hasPremiumWeapon = false, allies = [], isEnemyTarget = actor?.side !== target?.side } = {}) {
    if (!actor || !target || !hit || hit.dodged || !Array.isArray(passives)) return Object.freeze([]);
    const results = [], archetypeId = actor.archetypeId || actor.id;
    const upgradeState = { characterDuplicates, premiumWeaponDuplicates,
      weaponType: hasPremiumWeapon ? 'premium' : actor.weapon?.type || null,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    if (Array.isArray(allies) && allies.includes(actor) && (actor.id !== 'lily' || action === 'summon') &&
        target.marks?.some(mark => mark.id === 'exposed')) {
      const lily = allies.find(unit => unit?.archetypeId === 'lily' && unit.hp > 0 && unit.id !== actor.id &&
        unit.weapon?.type === 'premium' && !unit.disabledUpgradeEffectIds?.has?.('lily.signature.exposed-energy')) ||
        (actor.id === 'lily' && action === 'summon' && actor.hp > 0 && actor.weapon?.type === 'premium' ? actor : null);
      if (lily && (hit.damage ?? 1) > 0) {
        const energy = upgradeValue('lily.signature.exposed-energy', 'exposedAllyHitEnergy', {
          weaponType: lily.weapon?.type, disabledUpgradeEffectIds: lily.disabledUpgradeEffectIds
        });
        const before = lily.energy;
        lily.energy = Math.min(Number.isFinite(lily.maxEnergy) ? lily.maxEnergy : 120, lily.energy + energy);
        const gained = lily.energy - before;
        if (gained > 0) results.push(Object.freeze({ type: 'lily-exposed-energy', target: lily, energyGained: gained }));
      }
    }
    if (target.hp <= 0) return Object.freeze(results);
    for (const passive of passives) {
      if (!passive || actor.disabledPassiveIds?.has?.(passive.id || passive.type)) continue;
      if (passive.type === 'bleed' && isEnemyTarget) {
        const stacks = this.applyBleed({ target, sourceId: actor.id,
          stacks: passive.stacksPerHit ?? 1, maxStacks: passive.maxStacks ?? 5 });
        if (stacks) results.push(Object.freeze({ type: 'bleed', stacks }));
      }
      if (passive.type === 'exposed' && isEnemyTarget) {
        const exposedUpgrade = activeUpgradeEffect('lily.duplicate.2.exposed-stacking', upgradeState);
        const duplicateStacking = !!exposedUpgrade;
        const stacks = this.applyStackingTimedMark({ target, id: 'exposed',
          turns: exposedUpgrade?.values.exposedDuration ?? passive.duration ?? 2,
          maxStacks: exposedUpgrade?.values.exposedMaxStacks ?? 1 });
        if (stacks) results.push(Object.freeze({ type: 'exposed', stacks }));
      }
    }
    if (isEnemyTarget && archetypeId === 'logan' && ['basic', 'ultimate'].includes(action)) {
      const stacks = action === 'basic'
        ? upgradeValue('logan.duplicate.1.double-bleed', 'basicBleedStacks', upgradeState, 1)
        : upgradeValue('logan.duplicate.3.ultimate-bleed-and-skill-point', 'ultimateBleedStacks', upgradeState, 1);
      const added = this.applyBleed({ target, sourceId: actor.id, stacks, maxStacks: target.bleedMaxStacks ?? 5 });
      if (added) results.push(Object.freeze({ type: 'bleed', stacks: added }));
    }
    if (isEnemyTarget && archetypeId === 'zero' && action === 'basic' &&
        activeUpgradeEffect('zero.premium-duplicate.1.basic-bleed', upgradeState)) {
      const stacks = upgradeValue('zero.premium-duplicate.1.basic-bleed', 'basicBleedStacks', upgradeState, 1);
      const added = this.applyBleed({ target, sourceId: actor.id, stacks, maxStacks: target.bleedMaxStacks ?? 5 });
      if (added) results.push(Object.freeze({ type: 'bleed', stacks: added }));
    }
    if (isEnemyTarget && archetypeId === 'lily' && ['skill', 'summon'].includes(action)) {
      this.setTimedMark({ target, mark: { id: 'ricochet', turns: 2, sources: [] } });
      results.push(Object.freeze({ type: 'ricochet-mark' }));
    }
    if (isEnemyTarget && archetypeId === 'lily' && ['ultimate', 'summon'].includes(action) &&
        activeUpgradeEffect('lily.duplicate.1.ultimate-weakening', upgradeState)) {
      const effect = getCharacterUpgradeEffect('lily.duplicate.1.ultimate-weakening');
      this.setTimedDebuff({ target, debuff: { id: 'lily-weakened',
        turns: effect.values.duration, damageMultiplier: effect.values.enemyDamageMultiplier } });
      results.push(Object.freeze({ type: 'lily-weakened' }));
    }
    return Object.freeze(results);
  }
  setTimedMark({ target, mark, stacks = 1 } = {}) {
    const lifecycle = mark?.id && COMBAT_EFFECT_LIFECYCLE[mark.id];
    if (!target || target.hp <= 0 || !mark || typeof mark.id !== 'string' || !mark.id || lifecycle?.storage !== 'marks' || !['timed_mark', 'timed_stacks'].includes(lifecycle.kind) || !['refresh_duration', 'refresh_duration_reset_source_history', 'add_stack_refresh_duration'].includes(lifecycle.reapply) || !Number.isInteger(mark.turns) || mark.turns < 1 || !Number.isInteger(stacks) || stacks < 1) return false;
    target.marks = Array.isArray(target.marks) ? target.marks.filter(existing => existing.id !== mark.id) : [];
    for (let index = 0; index < stacks; index++) target.marks.push({ ...mark, ...(Array.isArray(mark.sources) ? { sources: [...mark.sources] } : {}) });
    return true;
  }
  applyStackingTimedMark({ target, id, turns, maxStacks } = {}) {
    const lifecycle = COMBAT_EFFECT_LIFECYCLE[id];
    if (!target || target.hp <= 0 || typeof id !== 'string' || !id || lifecycle?.storage !== 'marks' || lifecycle.kind !== 'timed_stacks' || !Number.isInteger(turns) || turns < 1 || !Number.isInteger(maxStacks) || maxStacks < 1) return 0;
    const current = Array.isArray(target.marks) ? target.marks.filter(mark => mark.id === id).length : 0;
    const stacks = Math.min(maxStacks, current + 1);
    this.setTimedMark({ target, mark: { id, turns }, stacks });
    return stacks;
  }
  setTimedDebuff({ target, debuff } = {}) {
    const lifecycle = debuff?.id && COMBAT_EFFECT_LIFECYCLE[debuff.id];
    if (!target || target.hp <= 0 || !debuff || typeof debuff.id !== 'string' || !debuff.id || lifecycle?.storage !== 'debuffs' || lifecycle.reapply !== 'replace_refresh_duration' || !Number.isInteger(debuff.turns) || debuff.turns < 1) return false;
    target.debuffs = Array.isArray(target.debuffs) ? target.debuffs.filter(existing => existing.id !== debuff.id) : [];
    target.debuffs.push({ ...debuff });
    return true;
  }
  recordUniqueMarkSource({ target, markId, sourceId } = {}) {
    if (!target || typeof markId !== 'string' || !markId || typeof sourceId !== 'string' || !sourceId) return false;
    const mark = target.marks?.find(entry => entry.id === markId);
    if (!mark) return false;
    mark.sources = Array.isArray(mark.sources) ? mark.sources : [];
    if (mark.sources.includes(sourceId)) return false;
    mark.sources.push(sourceId);
    return true;
  }
  resolveRicochetPlan({ targets = [], sourceId, sourceDamage, repeats = 1, damageMultiplier = .1, secondHitMultiplier = .5 } = {}) {
    if (!Array.isArray(targets) || sourceId === undefined || sourceId === null ||
        !Number.isFinite(sourceDamage) || sourceDamage <= 0 || !Number.isInteger(repeats) || repeats < 1 ||
        !Number.isFinite(damageMultiplier) || damageMultiplier < 0 ||
        !Number.isFinite(secondHitMultiplier) || secondHitMultiplier < 0) return Object.freeze([]);
    const allocations = [];
    for (const target of [...new Set(targets)]) {
      if (!target || target.hp <= 0 || !this.recordUniqueMarkSource({ target, markId: 'ricochet', sourceId: String(sourceId) })) continue;
      const baseDamage = roundCombatHp(sourceDamage * damageMultiplier);
      for (let index = 0; index < repeats; index++) allocations.push(Object.freeze({
        target, repeat: index, damage: index === 1 ? roundCombatHp(baseDamage * secondHitMultiplier) : baseDamage
      }));
    }
    return Object.freeze(allocations);
  }
  consumeFollowUpCharge({ passive, sourceId, maxCharges = passive?.charges ?? 5, refundEvery = 0 } = {}) {
    if (!passive || !Number.isInteger(maxCharges) || maxCharges < 0 || !Number.isInteger(passive.remaining) || passive.remaining <= 0 || sourceId === undefined || sourceId === null || !Number.isInteger(refundEvery) || refundEvery < 0) return null;
    passive.seenSources = passive.seenSources instanceof Set ? passive.seenSources : new Set(Array.isArray(passive.seenSources) ? passive.seenSources : []);
    const key = String(sourceId);
    if (passive.seenSources.has(key)) return null;
    passive.seenSources.add(key);
    passive.remaining--;
    passive.activations = (passive.activations || 0) + 1;
    if (refundEvery > 0 && passive.activations % refundEvery === 0) passive.remaining = Math.min(maxCharges, passive.remaining + 1);
    return Object.freeze({ remaining: passive.remaining, activations: passive.activations });
  }
  resolveFollowUpAllocation({ passive, sourceId, targets = [], totalDamage,
    maxCharges = passive?.charges ?? 5, refundEvery = 0 } = {}) {
    if (!Array.isArray(targets) || !targets.length || !Number.isInteger(totalDamage) || totalDamage <= 0) return null;
    const charge = this.consumeFollowUpCharge({ passive, sourceId, maxCharges, refundEvery });
    if (!charge) return null;
    const base = Math.floor(totalDamage / targets.length), remainder = totalDamage % targets.length;
    const allocations = targets.map((target, index) => Object.freeze({ target,
      damage: base + (index < remainder ? 1 : 0) }));
    return Object.freeze({ ...charge, totalDamage, targets: Object.freeze(allocations) });
  }
  resolveFollowUpEvent({ passive, ownerId, sourceActorId, sourceId, hits = [], enemies = [],
    totalDamage, maxCharges = passive?.charges ?? 5, refundEvery = 0 } = {}) {
    if (!passive || passive.type !== 'followUp' || ownerId === sourceActorId ||
        !Array.isArray(hits) || !Array.isArray(enemies)) return null;
    const targets = [...new Set(hits.filter(hit => hit &&
      (hit.damage > 0 || hit.shieldDamage > 0 || hit.barrierDamage > 0 || hit.breakDamage > 0) && !hit.dodged &&
      !hit.followUp && !hit.reflect && !hit.echo && !hit.ricochet && hit.phase !== 'reflect' &&
      hit.phase !== 'echo' && hit.phase !== 'follow-up' && hit.phase !== 'ricochet')
      .map(hit => typeof hit.target === 'string' ? enemies.find(enemy => enemy.id === hit.target) : hit.target)
      .filter(target => target && target.hp > 0 && enemies.some(enemy => enemy.id === target.id)))];
    const allocation = this.resolveFollowUpAllocation({ passive, sourceId, targets, totalDamage,
      maxCharges, refundEvery });
    return allocation ? Object.freeze({ ...allocation, targets: allocation.targets,
      affectedTargets: Object.freeze(targets) }) : null;
  }
  refillFollowUps({ passive, maxCharges = passive?.charges ?? 5 } = {}) {
    if (!passive || !Number.isInteger(maxCharges) || maxCharges < 0) return false;
    passive.remaining = maxCharges;
    passive.charges = maxCharges;
    passive.seenSources = new Set();
    return true;
  }
  applyTaunt({ target, sourceId, targetId = sourceId, rate, turns } = {}) {
    if (COMBAT_EFFECT_LIFECYCLE.taunt.reapply !== 'replace_same_source_and_target') return false;
    if (!target || target.hp <= 0 || typeof sourceId !== 'string' || !sourceId || typeof targetId !== 'string' || !targetId || !Number.isFinite(rate) || rate < 0 || rate > 1 || !Number.isInteger(turns) || turns < 1) return false;
    target.tauntEffects = Array.isArray(target.tauntEffects) ? target.tauntEffects : [];
    target.tauntEffects = target.tauntEffects.filter(effect => effect.targetId !== targetId || effect.sourceId !== sourceId);
    target.tauntEffects.push({ id: 'taunt', sourceId, targetId, rate, turns });
    return true;
  }
  applyResidue({ target, maxStacks = COMBAT_EFFECT_LIFECYCLE.residue.defaultMaxStacks, damageReductionPerStack = .05, resistanceReductionPerStack = .05, durationTurns = COMBAT_EFFECT_LIFECYCLE.residue.defaultDurationTurns } = {}) {
    if (COMBAT_EFFECT_LIFECYCLE.residue.reapply !== 'add_stack_refresh_duration' || !target || target.hp <= 0 || !Number.isInteger(maxStacks) || maxStacks < 1 || !Number.isFinite(damageReductionPerStack) || damageReductionPerStack < 0 || !Number.isFinite(resistanceReductionPerStack) || resistanceReductionPerStack < 0 || !Number.isInteger(durationTurns) || durationTurns < 1) return false;
    target.residueMaxStacks = maxStacks;
    target.residueDamageReductionPerStack = damageReductionPerStack;
    target.residueResistanceReductionPerStack = resistanceReductionPerStack;
    target.residueStacks = Math.min(maxStacks, (target.residueStacks || 0) + 1);
    target.residueTurns = durationTurns;
    return true;
  }
  applyTune({ target, tune } = {}) {
    if (!target || target.hp <= 0 || !tune || typeof tune.sourceId !== 'string' || !tune.sourceId || !Number.isInteger(tune.turns) || tune.turns < 1) return false;
    target.tune = { id: 'tune', ...tune };
    return true;
  }
  resolveDawnTune({ actor, target, plan, characterDuplicates = 0,
    premiumWeaponDuplicates = 0, weaponType = null } = {}) {
    if (!actor || !target || target.hp <= 0 || !plan) return null;
    const upgradeState = { characterDuplicates, premiumWeaponDuplicates, weaponType,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    const tuneDuration = upgradeValue('dawn.duplicate.3.tune-duration-and-attack', 'tuneExtraDuration', upgradeState);
    const tune = { sourceId: actor.id, turns: plan.duration + tuneDuration,
      skipFirstTick: target.id === actor.id, basicEnhanced: true,
      damageBonus: (plan.damageBonus || 0) + upgradeValue('dawn.duplicate.4.tune-damage', 'tuneDamageBonus', upgradeState),
      skillPointReturn: plan.skillPointReturn || 0,
      attackBonus: upgradeValue('dawn.duplicate.3.tune-duration-and-attack', 'tuneAttackBonus', upgradeState),
      defenseIgnore: upgradeValue('dawn.signature.tune-defense-ignore', 'tuneDefenseIgnore', upgradeState),
      damageReduction: upgradeValue('dawn.premium-duplicate.1.tune-damage-reduction', 'tuneDamageReduction', upgradeState),
      barrierDamageBonus: upgradeValue('dawn.premium-duplicate.2.tune-barrier-damage', 'tuneBarrierDamageBonus', upgradeState),
      criticalRateBonus: upgradeValue('dawn.premium-duplicate.4.tune-critical', 'tuneCriticalRateBonus', upgradeState),
      criticalDamageBonus: upgradeValue('dawn.premium-duplicate.4.tune-critical', 'tuneCriticalDamageBonus', upgradeState) };
    if (!this.applyTune({ target, tune })) return null;
    const actionAdvance = upgradeValue('dawn.premium-duplicate.3.tune-action-advance', 'tuneActionAdvance', upgradeState);
    if (actionAdvance) this.timeline.modify(target.id, actionAdvance);
    return Object.freeze({ tune: Object.freeze({ ...tune }), actionAdvance });
  }
  resolveLoganBloodShield({ actor, allies = [], enemies = [], plan,
    characterDuplicates = 0, premiumWeaponDuplicates = 0, weaponType = null } = {}) {
    if (!actor || actor.hp <= 0 || !plan || !Array.isArray(allies) || !Array.isArray(enemies)) return null;
    const upgradeState = { characterDuplicates, premiumWeaponDuplicates, weaponType: weaponType || actor.weapon?.type || null,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    const healthCost = Math.min(Math.max(0, actor.hp - 1), Math.max(1, roundCombatHp(actor.hp * plan.healthCost)));
    const shieldPerAlly = healthCost * upgradeValue('logan.duplicate.2.shield-strength', 'shieldMultiplier', upgradeState, 1);
    actor.hp = Math.max(1, actor.hp - healthCost);
    const shields = [];
    for (const ally of allies) {
      if (!ally || ally.hp <= 0) continue;
      const result = this.applyShield({ target: ally, amount: shieldPerAlly });
      shields.push(Object.freeze({ target: ally, amount: result?.applied || 0 }));
    }
    const tauntRate = upgradeValue('logan.premium-duplicate.2.taunt', 'tauntRate', upgradeState, plan.tauntChance);
    const tauntTurns = plan.tauntTurns + upgradeValue('logan.premium-duplicate.2.taunt', 'tauntExtraDuration', upgradeState);
    const taunts = enemies.filter(enemy => enemy?.hp > 0).map(enemy => this.applyTaunt({
      target: enemy, sourceId: actor.id, targetId: actor.id, rate: tauntRate, turns: tauntTurns
    }));
    return Object.freeze({ healthCost, shieldPerAlly, shields: Object.freeze(shields), tauntRate, tauntTurns,
      tauntsApplied: taunts.filter(Boolean).length });
  }
  resolveDawnUltimate({ actor, target, battle, plan, characterDuplicates = 0 } = {}) {
    if (!actor || !target || target.hp <= 0 || !battle || !plan ||
        !Number.isFinite(target.energy) || !Number.isFinite(target.maxEnergy) ||
        !Number.isFinite(battle.skillPoints) || !Number.isFinite(battle.skillPointCap)) return null;
    const energyBefore = target.energy, skillPointsBefore = battle.skillPoints;
    const upgradeState = { characterDuplicates, disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    const energyRate = upgradeValue('dawn.duplicate.1.ultimate-energy', 'ultimateEnergyRestore', upgradeState, plan.energyRestore);
    target.energy = Math.min(target.maxEnergy, target.energy + target.maxEnergy * energyRate);
    battle.skillPoints = Math.min(battle.skillPointCap, battle.skillPoints + upgradeValue('dawn.duplicate.2.ultimate-skill-points', 'ultimateSkillPointGain', upgradeState, plan.skillPointGain ?? 1));
    this.timeline.modify(target.id, plan.actionAdvance);
    return Object.freeze({ energyGained: target.energy - energyBefore,
      skillPointsGained: battle.skillPoints - skillPointsBefore, actionAdvance: plan.actionAdvance });
  }
  resolveZeroUltimateEffects({ actor, enemies = [], battle, characterDuplicates = 0,
    premiumWeaponDuplicates = 0, hasPremiumWeapon = false } = {}) {
    if (!actor || !battle || !Number.isFinite(battle.skillPoints) || !Number.isFinite(battle.skillPointCap)) return null;
    const skillPointsBefore = battle.skillPoints;
    const upgradeState = { characterDuplicates, premiumWeaponDuplicates,
      weaponType: hasPremiumWeapon ? 'premium' : actor.weapon?.type,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    const actorAdvance = actor.ultimate?.actionAdvance ?? 100;
    this.timeline.modify(actor.id, actorAdvance);
    const delayed = [];
    const enemyDelay = upgradeValue('zero.duplicate.1.ultimate-delay', 'ultimateEnemyDelay', upgradeState);
    if (enemyDelay) for (const enemy of enemies) if (enemy?.hp > 0 && this.timeline.modify(enemy.id, -enemyDelay)) delayed.push(enemy.id);
    const skillPointGain = upgradeValue('zero.signature.ultimate-skill-point', 'ultimateSkillPointGain', upgradeState);
    battle.skillPoints = Math.min(battle.skillPointCap, battle.skillPoints + skillPointGain);
    return Object.freeze({ actorAdvance, delayed: Object.freeze(delayed),
      skillPointsGained: battle.skillPoints - skillPointsBefore });
  }
  resolveLoganUltimateEffects({ actor, battle, characterDuplicates = 0 } = {}) {
    if (!actor || !battle || !Number.isFinite(battle.skillPoints) || !Number.isFinite(battle.skillPointCap)) return null;
    const before = battle.skillPoints;
    const skillPointGain = upgradeValue('logan.duplicate.3.ultimate-bleed-and-skill-point', 'ultimateSkillPointGain', {
      characterDuplicates, disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds });
    battle.skillPoints = Math.min(battle.skillPointCap, battle.skillPoints + skillPointGain);
    return Object.freeze({ skillPointsGained: battle.skillPoints - before });
  }
  resolveLilyPremiumUltimateEffects({ actor, allies = [], battle, premiumWeaponDuplicates = 0,
    hasPremiumWeapon = false } = {}) {
    if (!actor || !Array.isArray(allies) || !battle || !Number.isFinite(battle.skillPoints) || !Number.isFinite(battle.skillPointCap)) return null;
    const skillPointsBefore = battle.skillPoints, energy = [];
    const upgradeState = { premiumWeaponDuplicates, weaponType: hasPremiumWeapon ? 'premium' : actor.weapon?.type,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    const skillPointGain = upgradeValue('lily.signature.ultimate-skill-point', 'ultimateSkillPointGain', upgradeState);
    battle.skillPoints = Math.min(battle.skillPointCap, battle.skillPoints + skillPointGain);
    const teamEnergy = upgradeValue('lily.premium-duplicate.4.ultimate-team-boost', 'teamEnergy', upgradeState);
    const actionAdvance = upgradeValue('lily.premium-duplicate.4.ultimate-team-boost', 'teamActionAdvance', upgradeState);
    if (teamEnergy || actionAdvance) for (const ally of allies) {
      if (!ally || ally.hp <= 0 || ally.isHauntling) continue;
      const maxEnergy = Number.isFinite(ally.maxEnergy) ? ally.maxEnergy : 120;
      const energyBefore = ally.energy;
      ally.energy = Math.min(maxEnergy, ally.energy + teamEnergy);
      if (actionAdvance) this.timeline.modify(ally.id, actionAdvance);
      energy.push(Object.freeze({ id: ally.id, energyGained: ally.energy - energyBefore, actionAdvance }));
    }
    return Object.freeze({ skillPointsGained: battle.skillPoints - skillPointsBefore, energy: Object.freeze(energy) });
  }
  resolveSummonPlan({ owner, characterDuplicates = 0, sourceId } = {}) {
    if (!owner || owner.hp <= 0 || sourceId === undefined || sourceId === null) return null;
    const ability = owner.ultimate || {};
    const durationTurns = upgradeValue('lily.duplicate.3.ultimate-and-summon', 'summonDuration', {
      characterDuplicates, disabledUpgradeEffectIds: owner.disabledUpgradeEffectIds }, ability.summonDuration ?? 3);
    return Object.freeze({ id: `hauntling-${sourceId}`, ownerId: owner.id, name: 'Hauntling',
      durationTurns, speed: ability.summonSpeed ?? 30, hp: ability.summonHp ?? 1, maxHp: ability.summonHp ?? 1,
      damageType: ability.summonDamageType ?? 'true', multiplier: ability.summonMultiplier ?? 1,
      target: ability.summonTarget ?? 'aoe', immediateOnSpawn: true });
  }
  advanceSummonTurn(summon) {
    if (COMBAT_EFFECT_LIFECYCLE.summonLifetime.clock !== 'summon_action_end' || !summon || typeof summon !== 'object') return null;
    const field = Number.isInteger(summon.remainingTurns) ? 'remainingTurns'
      : Number.isInteger(summon.remaining) ? 'remaining'
      : Number.isInteger(summon.turnsRemaining) ? 'turnsRemaining' : null;
    if (!field) return null;
    summon[field] = Math.max(0, summon[field] - 1);
    summon.expired = summon[field] === 0;
    if (summon.expired && Number.isFinite(summon.hp)) summon.hp = 0;
    return Object.freeze({ remainingTurns: summon[field], expired: summon.expired });
  }
  resolveHit(input) { return calculateCombatHit(input); }
  // Canonical typed-hit entry point shared by live encounters and analysis.
  resolveTypedHit(input) { return this.resolveHit(input); }
  resolveDamageIntake({ rawDamage, targetHp, targetShield = 0, stealthChance = 0, criticalRate = 0,
    criticalDamage = 0, damageReduction = 0, vulnerabilityMultiplier = 1, isEcho = false, random = Math.random } = {}) {
    if (![rawDamage, targetHp, targetShield, stealthChance, criticalRate, criticalDamage, damageReduction, vulnerabilityMultiplier].every(Number.isFinite) ||
        rawDamage < 0 || targetHp < 0 || targetShield < 0 || typeof random !== 'function') return null;
    const chance = Math.min(1, Math.max(0, stealthChance));
    if (!isEcho && rawDamage > 0 && chance > 0 && random() < chance) return Object.freeze({ damage: 0, healthDamage: 0, shieldDamage: 0, dodged: true, critical: false, criticalMultiplier: 1 });
    const criticalChance = Math.min(1, Math.max(0, criticalRate));
    const critical = !isEcho && rawDamage > 0 && criticalChance > 0 && random() < criticalChance;
    const criticalMultiplier = critical ? 1 + Math.max(0, criticalDamage) : 1;
    const reduction = isEcho ? 0 : Math.min(1, Math.max(0, damageReduction));
    const damage = roundCombatHp(rawDamage * (1 - reduction) * criticalMultiplier * (isEcho ? 1 : Math.max(0, vulnerabilityMultiplier)));
    const shieldDamage = Math.min(targetShield, damage);
    const healthDamage = Math.min(targetHp, Math.max(0, damage - shieldDamage));
    return Object.freeze({ damage, healthDamage, shieldDamage, dodged: false, critical, criticalMultiplier });
  }
  resolveDamageEvent({ target, rawDamage, stealthChance = 0, criticalRate = 0, criticalDamage = 0,
    damageReduction = 0, vulnerabilityMultiplier = 1, isEcho = false, isReflect = false,
    random = Math.random, barrierDamageMultiplier = 1, barrierDamageRatio = .25,
    breakDamagePercent = .1, brokenDuration = 0, reflectPercent = 0, echoPercent = 0 } = {}) {
    if (!target || !Number.isFinite(target.hp) || !Number.isFinite(target.maxHp) || !Number.isFinite(rawDamage)) return null;
    const outcome = this.resolveDamageIntake({ rawDamage, targetHp: target.hp, targetShield: Math.max(0,target.shield||0),
      stealthChance, criticalRate, criticalDamage, damageReduction, vulnerabilityMultiplier, isEcho, random });
    if (!outcome || outcome.dodged) return outcome ? Object.freeze({ ...outcome, healthDamage: 0, directHealthDamage: 0,
      breakShieldDamage: 0, barrierDamage: 0, breakDamage: 0, broken: false, reflectRawDamage: 0, echoRawDamage: 0 }) : null;
    const targetHpBefore=target.hp;
    target.shield = Math.max(0,(target.shield||0)-outcome.shieldDamage);
    target.hp = Math.max(0,target.hp-(outcome.damage-outcome.shieldDamage));
    const directHealthDamage = Math.max(0,targetHpBefore-target.hp);
    let barrierDamage=0,breakDamage=0,breakShieldDamage=0,broken=false;
    if (Number.isFinite(target.barrier) && target.barrier>0 && Number.isFinite(barrierDamageMultiplier) && barrierDamageMultiplier>=0) {
      barrierDamage=outcome.damage*barrierDamageRatio*barrierDamageMultiplier;
      target.barrier=Math.max(0,target.barrier-barrierDamage);
      if (target.barrier===0) {
        if (Number.isFinite(brokenDuration)&&brokenDuration>0) target.brokenTurns=brokenDuration;
        const breakDamageRaw=roundCombatHp(target.maxHp*Math.max(0,breakDamagePercent));
        breakShieldDamage=Math.min(target.shield||0,breakDamageRaw);
        target.shield=Math.max(0,(target.shield||0)-breakShieldDamage);
        breakDamage=Math.min(target.hp,breakDamageRaw-breakShieldDamage);
        target.hp=Math.max(0,target.hp-(breakDamageRaw-breakShieldDamage));
        target.barriersBroken=(target.barriersBroken||0)+1;
        broken=true;
      }
    }
    const healthDamage=Math.max(0,targetHpBefore-target.hp);
    const receivedDamage=healthDamage+outcome.shieldDamage+breakShieldDamage;
    const reflectRawDamage=!isEcho&&!isReflect?roundCombatHp(receivedDamage*Math.max(0,reflectPercent)):0;
    const echoRawDamage=!isEcho&&!isReflect&&target.hp>0?roundCombatHp(directHealthDamage*Math.max(0,echoPercent)):0;
    return Object.freeze({ ...outcome, directHealthDamage, healthDamage:Math.max(0,targetHpBefore-target.hp),
      breakShieldDamage, barrierDamage, breakDamage, broken, reflectRawDamage, echoRawDamage,
      echoRequest:echoRawDamage>0?Object.freeze({rawDamage:echoRawDamage,damageType:'typed'}):null });
  }
  resolveDamageOverTime({ target, rawDamage, damageReduction = 0, vulnerabilityMultiplier = 1 } = {}) {
    if (!target || !Number.isFinite(target.hp) || !Number.isFinite(rawDamage) || rawDamage < 0 ||
        !Number.isFinite(damageReduction) || !Number.isFinite(vulnerabilityMultiplier)) return null;
    const damage = roundCombatHp(rawDamage * (1 - Math.min(1, Math.max(0, damageReduction))) * Math.max(0, vulnerabilityMultiplier));
    const shieldDamage = Math.min(Math.max(0, target.shield || 0), damage);
    target.shield = Math.max(0, (target.shield || 0) - shieldDamage);
    const healthDamage = Math.min(Math.max(0, target.hp), damage - shieldDamage);
    target.hp = Math.max(0, target.hp - (damage - shieldDamage));
    return Object.freeze({ damage, healthDamage, shieldDamage });
  }
  resolveBleedTick({ target, units = [], damagePerStack = COMBAT_EFFECT_LIFECYCLE.bleed.damagePerStack } = {}) {
    if (!target || target.hp <= 0 || !Number.isFinite(target.maxHp) || !Array.isArray(target.bleedStacks) || !target.bleedStacks.length || !Number.isFinite(damagePerStack) || damagePerStack < 0) return Object.freeze([]);
    const perStack = roundCombatHp(target.maxHp * damagePerStack), grouped = new Map();
    for (const stack of target.bleedStacks) {
      const source = units.find(unit => unit.id === stack.sourceId);
      if (source) grouped.set(source, (grouped.get(source) || 0) + perStack);
    }
    const events = [];
    for (const [source, rawDamage] of grouped) {
      const result = this.resolveDamageOverTime({ target, rawDamage, damageReduction: target.tune?.damageReduction || 0,
        vulnerabilityMultiplier: target.brokenTurns > 0 ? 1.5 : 1 });
      if (!result) continue;
      target.damageTaken = (target.damageTaken || 0) + result.healthDamage;
      source.damageDealt = (source.damageDealt || 0) + result.healthDamage;
      if (source.damageBreakdown?.bleed !== undefined) source.damageBreakdown.bleed += result.healthDamage;
      events.push(Object.freeze({ source, rawDamage, ...result }));
      if (target.hp <= 0) break;
    }
    target.bleedStacks.shift();
    return Object.freeze(events);
  }
  resolveDamageSequence({ target, attacker = null, rawDamage, damageType, primary = {},
    calculateReflectDamage = null, reflect = {}, echo = {} } = {}) {
    const direct = this.resolveDamageEvent({ target, rawDamage, ...primary });
    if (!direct || direct.dodged) return direct ? Object.freeze({ ...direct, reflect: null, echo: null }) : null;
    let reflected = null;
    if (direct.reflectRawDamage > 0 && attacker?.hp > 0 && typeof calculateReflectDamage === 'function') {
      const reflectedRawDamage = calculateReflectDamage(direct.reflectRawDamage, target, attacker);
      if (Number.isFinite(reflectedRawDamage) && reflectedRawDamage >= 0) {
        reflected = this.resolveDamageEvent({ target: attacker, rawDamage: reflectedRawDamage,
          ...reflect, isReflect: true, reflectPercent: 0, echoPercent: 0 });
      }
    }
    let echoed = null;
    if (direct.echoRawDamage > 0 && target.hp > 0) {
      echoed = this.resolveDamageEvent({ target, rawDamage: direct.echoRawDamage,
        ...echo, isEcho: true, isReflect: false, reflectPercent: 0, echoPercent: 0 });
    }
    return Object.freeze({ ...direct, reflect: reflected, echo: echoed,
      echoDamageType: echoed ? (damageType || null) : null });
  }
  applyShield({ target, amount } = {}) {
    if (!target || !Number.isFinite(target.shield) && target.shield !== undefined || !Number.isFinite(amount) || amount <= 0) return null;
    const applied = roundCombatHp(amount);
    target.shield = Math.max(0, target.shield || 0) + applied;
    return Object.freeze({ applied, total: target.shield });
  }
  resolveHealing({ target, amount, allowOverMax = false } = {}) {
    if (!target || !Number.isFinite(target.hp) || !Number.isFinite(target.maxHp) || !Number.isFinite(amount) || amount <= 0 || target.hp <= 0 || (!allowOverMax && target.hp > target.maxHp)) return null;
    const before = target.hp;
    const rounded = roundCombatHp(amount);
    target.hp = allowOverMax ? target.hp + rounded : Math.min(target.maxHp, target.hp + rounded);
    return Object.freeze({ requested: rounded, applied: Math.max(0, target.hp - before), hp: target.hp });
  }
  resolveLifesteal({ attacker, damage, rate } = {}) {
    if (!attacker || attacker.hp <= 0 || !Number.isFinite(damage) || damage <= 0 ||
        !Number.isFinite(rate) || rate <= 0) return null;
    return this.resolveHealing({ target: attacker, amount: roundCombatHp(damage * rate) });
  }
  roundHp(value) { return roundCombatHp(value); }
  roundStatQuarter(value) { return roundCombatStatQuarter(value); }
  runeRule(setId) { return RUNE_COMBAT_RULES[setId] || null; }
  resolveRuneEffect({ setId, trigger, ready = true, shielded = false } = {}) {
    const rule = this.runeRule(setId);
    if (!rule || !ready) return null;
    const effects = {
      'radiant-moon': trigger === 'directDamage' ? { echo: rule.echo } : null,
      'eternal-sun': trigger === 'passive' ? { criticalRate: rule.criticalRate, criticalDamage: rule.criticalDamage, stealth: rule.stealth } : null,
      'celestial-star': trigger === 'ultimate' ? { actionAdvance: rule.ultimateAdvance, cooldownTurns: rule.cooldownTurns } : null,
      'dark-matter': ['basic', 'skill', 'ultimate', 'passive'].includes(trigger) ? { defenseIgnore: rule.defenseIgnore, damageMultiplier: rule.damageMultiplier } : null,
      'clear-skies': trigger === 'reflect' ? { reflect: shielded ? rule.shieldedReflect : rule.reflect } : null,
      'infinite-space': trigger === 'ultimate' ? { actionDelay: rule.ultimateDelay } : null,
      recycle: trigger === 'skill' ? { skillPoints: rule.skillPoints, cooldownTurns: rule.cooldownTurns } : null,
      amplify: trigger === 'basic' ? { damageBonus: rule.basicDamageBonus, cooldownTurns: rule.cooldownTurns } : null,
      united: trigger === 'allySkill' ? { actionAdvance: rule.actionAdvance, cooldownTurns: rule.cooldownTurns } : null
    };
    const effect = effects[setId] || null;
    return effect ? Object.freeze({ ...effect }) : null;
  }
  isRuneReady(state, effectId) {
    return !!state && typeof effectId === 'string' && (!state.cooldowns || (state.cooldowns[effectId] || 0) <= 0);
  }
  startRuneCooldown(state, effectId, turn, turns) {
    if (!state || typeof effectId !== 'string' || !Number.isInteger(turn) || !Number.isInteger(turns) || turns < 1 || !this.isRuneReady(state, effectId)) return false;
    state.cooldowns = state.cooldowns || {};
    state.cooldownStartedTurn = state.cooldownStartedTurn || {};
    state.cooldowns[effectId] = turns;
    state.cooldownStartedTurn[effectId] = turn;
    return true;
  }
  ageRuneCooldowns(state, turn, effectIds = Object.keys(state?.cooldowns || {})) {
    if (COMBAT_EFFECT_LIFECYCLE.runeCooldown.clock !== 'owner_turn_end' || !state || !Number.isInteger(turn) || !Array.isArray(effectIds)) return false;
    state.cooldowns = state.cooldowns || {};
    state.cooldownStartedTurn = state.cooldownStartedTurn || {};
    for (const effectId of effectIds) {
      if ((state.cooldowns[effectId] || 0) > 0 && (state.cooldownStartedTurn[effectId] ?? -Infinity) < turn) {
        state.cooldowns[effectId]--;
        if (!state.cooldowns[effectId]) delete state.cooldownStartedTurn[effectId];
      }
    }
    return true;
  }
  resolveRuneTrigger({ setId, trigger, state = null, effectId = null, turn = 0, ...options } = {}) {
    const ready = effectId ? this.isRuneReady(state, effectId) : true;
    if (!ready) return null;
    const effect = this.resolveRuneEffect({ setId, trigger, ...options, ready });
    if (effect && effectId && effect.cooldownTurns) this.startRuneCooldown(state, effectId, turn, effect.cooldownTurns);
    return effect;
  }
  resolveActionPlan({ kit, action, characterId, characterDuplicates = 0, premiumWeaponDuplicates = 0,
    weaponType = null, disabledUpgradeEffectIds = null, enhanceStacks = 0, targetAlreadyHit = false,
    tuneMultiplier = 1, celestialMultipliers = {} }) {
    if (!kit || !['basic', 'skill', 'ultimate'].includes(action) || !kit[action]) return null;
    const ability = kit[action];
    const celestial = Number.isFinite(celestialMultipliers[action]) ? celestialMultipliers[action] : 1;
    let multiplier = Number.isFinite(ability.multiplier) ? ability.multiplier : 0;
    let damageType = ability.damageType || null;
    let target = ability.target || (action === 'skill' && ability.type === 'firstStrike' ? 'single' : null);
    const upgradeState = { characterDuplicates, premiumWeaponDuplicates, weaponType, disabledUpgradeEffectIds };

    if (action === 'basic') {
      if (characterId === 'soul') {
        const basicCelestial = Number.isFinite(celestialMultipliers.basic) ? celestialMultipliers.basic : 1;
        const skillCelestial = Number.isFinite(celestialMultipliers.skill) ? celestialMultipliers.skill : 1;
        multiplier = ability.multiplier * upgradeValue('soul.premium-duplicate.1.basic-damage', 'basicDamageMultiplier', upgradeState, 1) * basicCelestial +
          enhanceStacks * (kit.skill?.damagePerStack || 0) * upgradeValue('soul.duplicate.4.enhance-scaling', 'enhanceDamagePerStackMultiplier', upgradeState, 1) * skillCelestial;
        if (enhanceStacks >= (kit.skill?.blastAtStacks ?? Infinity)) {
          target = upgradeValue('soul.premium-duplicate.3.enhanced-aoe', 'enhancedBasicCoverage', upgradeState, 'blast');
        }
      } else if (characterId === 'logan') multiplier *= upgradeValue('logan.premium-duplicate.1.basic-damage', 'basicDamageMultiplier', upgradeState, 1);
      else if (characterId === 'zero') multiplier *= upgradeValue('zero.duplicate.2.basic-damage', 'basicDamageMultiplier', upgradeState, 1);
    } else if (action === 'skill' && ability.type === 'firstStrike') {
      multiplier = targetAlreadyHit ? ability.multiplier : ability.firstHitMultiplier;
      multiplier *= upgradeValue('zero.duplicate.4.first-strike-damage', 'firstStrikeDamageMultiplier', upgradeState, 1);
    } else if (action === 'ultimate') {
      if (characterId === 'soul') multiplier *= upgradeValue('soul.duplicate.3.ultimate-damage', 'ultimateDamageMultiplier', upgradeState, 1);
      if (characterId === 'lily') multiplier *= upgradeValue('lily.duplicate.3.ultimate-and-summon', 'ultimateDamageMultiplier', upgradeState, 1);
      if (characterId === 'zero') multiplier *= upgradeValue('zero.duplicate.3.ultimate-damage', 'ultimateDamageMultiplier', upgradeState, 1);
      if (characterId === 'logan') multiplier *= upgradeValue('logan.premium-duplicate.3.ultimate-damage', 'ultimateDamageMultiplier', upgradeState, 1);
    }

    if (action !== 'basic' || characterId !== 'soul') multiplier *= celestial;
    if (action === 'basic') multiplier *= tuneMultiplier;
    const energyCost = action === 'ultimate' && characterId === 'zero'
      ? upgradeValue('zero.premium-duplicate.2.ultimate-energy-cost', 'ultimateEnergyCost', upgradeState, ability.energyCost || 100)
      : action === 'ultimate' ? (ability.energyCost || 100) : 0;
    return Object.freeze({ action, type: ability.type || action, damageType, multiplier, target,
      energyGain: ability.energyGain || 0,
      energyPerStack: action === 'basic' && characterId === 'soul' ? (kit.skill?.energyPerStack || 0) : 0,
      skillPointCost: action === 'skill' ? 1 : 0,
      skillPointGain: action === 'basic' ? (ability.skillPointGain ?? 1) : (ability.skillPointGain || 0),
      energyCost,
      energyRestore: ability.energyRestore || 0,
      skillPointReturn: ability.skillPointReturn || 0,
      actionAdvance: ability.actionAdvance || 0,
      healthCost: ability.healthCost || 0,
      shieldDistribution: ability.shieldDistribution || null,
      tauntChance: ability.tauntChance || 0,
      tauntTurns: ability.tauntTurns || 0,
      damageBonus: ability.damageBonus || 0,
      duration: ability.duration || 0,
      support: ['tune', 'bloodShield', 'dawnSupport'].includes(ability.type) });
  }
  resolveActionResources({ actor, battle, plan, enhancedStacks = 0, payEnergyCost = false } = {}) {
    if (!actor || !battle || !plan || !Number.isFinite(actor.energy) || !Number.isFinite(battle.skillPoints) ||
        !Number.isFinite(battle.skillPointCap) || !Number.isInteger(enhancedStacks) || enhancedStacks < 0) return null;
    const skillPointCost = Math.max(0, plan.skillPointCost || 0);
    const energyCost = payEnergyCost ? Math.max(0, plan.energyCost || 0) : 0;
    if (battle.skillPoints < skillPointCost || actor.energy < energyCost) return null;
    const maxEnergy = Number.isFinite(actor.maxEnergy) ? actor.maxEnergy : 120;
    const energyGain = Math.max(0, plan.energyGain || 0) + Math.max(0, plan.energyPerStack || 0) * enhancedStacks;
    const skillPointGain = Math.max(0, plan.skillPointGain || 0);
    const energyBefore = actor.energy, skillPointsBefore = battle.skillPoints;
    actor.energy = Math.min(maxEnergy, actor.energy - energyCost + energyGain);
    battle.skillPoints = Math.max(0, Math.min(battle.skillPointCap, battle.skillPoints - skillPointCost + skillPointGain));
    return Object.freeze({ energyBefore, energyAfter: actor.energy, energySpent: Math.min(energyCost, energyBefore), energyGained: Math.max(0, actor.energy - (energyBefore - energyCost)),
      skillPointsBefore, skillPointsAfter: battle.skillPoints, skillPointsSpent: Math.min(skillPointCost, skillPointsBefore),
      skillPointsGained: Math.max(0, battle.skillPoints - Math.max(0, skillPointsBefore - skillPointCost)) });
  }
  // Shared boundary for action plans and resource commitment. A caller may
  // pass a previously previewed plan, but cannot settle it outside the engine.
  resolveActionIntent({ actor, battle, kit, characterId, action, plan = null,
    characterDuplicates = 0, premiumWeaponDuplicates = 0, enhancedStacks = 0,
    payEnergyCost = false, ...planOptions } = {}) {
    const resolvedPlan = plan || this.resolveActionPlan({ kit, characterId, action,
      characterDuplicates, premiumWeaponDuplicates, weaponType: actor.weapon?.type || null,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds, ...planOptions });
    if (!resolvedPlan) return null;
    const resources = this.resolveActionResources({ actor, battle, plan: resolvedPlan,
      enhancedStacks, payEnergyCost });
    return resources ? Object.freeze({ plan: resolvedPlan, resources }) : null;
  }
  resolveEnhanceAction({ actor, battle, plan, currentStacks = 0, maxStacks = Infinity,
    premiumWeapon = false, spendingRemainder = 0 } = {}) {
    if (!Number.isInteger(currentStacks) || currentStacks < 0 ||
        !(maxStacks === Infinity || (Number.isInteger(maxStacks) && maxStacks >= 0)) ||
        currentStacks >= maxStacks || !Number.isInteger(spendingRemainder) || spendingRemainder < 0) return null;
    const intent = this.resolveActionIntent({ actor, battle, plan });
    if (!intent) return null;
    const weaponType = premiumWeapon ? 'premium' : actor.weapon?.type || null;
    const upgradeState = { characterDuplicates: actor.characterDuplicates || 0,
      premiumWeaponDuplicates: actor.premiumWeaponDuplicates || 0, weaponType,
      disabledUpgradeEffectIds: actor.disabledUpgradeEffectIds };
    const refundEvery = upgradeValue('soul.signature.enhance-refund', 'enhanceRefundEvery', upgradeState);
    const refundAmount = upgradeValue('soul.signature.enhance-refund', 'enhanceRefundAmount', upgradeState);
    let nextRemainder = refundEvery > 0 ? spendingRemainder + 1 : spendingRemainder;
    let refundedSkillPoints = 0;
    if (refundEvery > 0 && nextRemainder >= refundEvery) {
      nextRemainder -= refundEvery;
      const before = battle.skillPoints;
      battle.skillPoints = Math.min(battle.skillPointCap, battle.skillPoints + refundAmount);
      refundedSkillPoints = battle.skillPoints - before;
    }
    return Object.freeze({ plan: intent.plan, resources: intent.resources,
      enhanceStacks: currentStacks + 1, spendingRemainder: nextRemainder, refundedSkillPoints });
  }
  resolveEnemyBasicPlan({ basic, passive = null, attackCount = 0, rampageStacks = 0, momentumStacks = 0, debuffMultiplier = 1 }) {
    if (!basic || !Number.isFinite(basic.multiplier) || !Number.isFinite(debuffMultiplier)) return null;
    const passiveId = passive?.id || (passive?.type === 'everyNthBasic' ? 'slimy' : passive?.type);
    const slimy = passiveId === 'slimy' && Number.isInteger(passive.every) && passive.every > 0 && (attackCount + 1) % passive.every === 0;
    const rampage = passiveId === 'rampage' ? (passive.damageBonus ?? .25) * rampageStacks : 0;
    const momentum = passiveId === 'momentum' ? (passive.damageBonus ?? .2) * momentumStacks : 0;
    const damageBonus = slimy ? (passive.damageBonus ?? .25) : 0;
    return Object.freeze({
      damageType: basic.damageType,
      target: slimy ? 'aoe' : basic.targetMode || basic.target || 'single',
      multiplier: basic.multiplier * (1 + damageBonus) * (1 + rampage) * (1 + momentum) * debuffMultiplier,
      enhanced: slimy,
      nextAttackCount: passiveId === 'slimy' ? attackCount + 1 : attackCount,
      nextRampageStacks: passiveId === 'rampage' ? Math.min(passive.maxStacks ?? 4, rampageStacks + 1) : rampageStacks,
      nextMomentumStacks: passiveId === 'momentum' ? Math.min(passive.maxStacks ?? 10, momentumStacks + 1) : momentumStacks,
      pursuitAdvance: passiveId === 'pursuit' ? (passive.actionAdvance ?? 20) : 0,
      bleedPerHit: passiveId === 'ravage' ? (passive.stacksPerHit ?? 1) : 0,
      bleedCap: passiveId === 'ravage' ? (passive.maxStacks ?? 5) : 0
    });
  }
}
