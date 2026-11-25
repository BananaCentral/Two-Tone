#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHARACTER_COMBAT_DATA, CHARACTER_UPGRADE_EFFECTS, COMBAT_EFFECT_CATALOG, COMBAT_MECHANIC_TAGS, COMBAT_PERFORMANCE_POLICY_STANDARD, COMBAT_PERFORMANCE_STANDARD, COMBAT_RESOURCE_STANDARD, ENEMY_COMBAT_DATA, ENEMY_DIFFICULTY_STANDARD, ENEMY_LEVEL_SCALING, enemyStatsAtMultiplier, RUNE_COMBAT_RULES } from '../src/scripts/combat-definitions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The benchmark roster follows the same authored definitions as the live game.
// Adding a combatant must not require editing this analysis runner.
const CHARACTER_IDS = Object.keys(CHARACTER_COMBAT_DATA).sort();
const ENEMY_IDS = Object.keys(ENEMY_COMBAT_DATA).sort();
const RUNES = Object.keys(RUNE_COMBAT_RULES).sort();
const CHARACTER_PASSIVES = Object.entries(CHARACTER_COMBAT_DATA).flatMap(([character, kit]) =>
  kit.passives.map(passive => ({ character, id: passive.id || passive.type })));
const ENEMY_DIFFICULTIES = ENEMY_DIFFICULTY_STANDARD;
const DEFAULT_POLICY_PROFILE = 'ensemble';
const POLICY_PROFILES = COMBAT_PERFORMANCE_POLICY_STANDARD.map(policy => policy.id);
const POLICY_WEIGHTS = new Map(COMBAT_PERFORMANCE_POLICY_STANDARD.map(policy => [policy.id, policy.ratingWeight]));
const PRESET_WORKERS = Object.freeze({ quick: 1, balanced: 2, full: 3 });
const BENCHMARK_PARTY_SIZE = 4;
const RUNE_MAIN = ['hp', 'attack', 'physicalDefense', 'magicalDefense'];
const BAE_REFERENCE_HP = COMBAT_PERFORMANCE_STANDARD.baseStats.attack * (1 - Math.min(
  COMBAT_PERFORMANCE_STANDARD.baseStats.physicalDefense / COMBAT_PERFORMANCE_STANDARD.baseStats.attack, 1));
const DEFAULT_WORKERS = Math.max(1, Math.min(8, os.availableParallelism?.() || os.cpus().length));

class SimulationWorkerPool {
  constructor(size) {
    this.nextId = 1;
    this.queue = [];
    this.workers = Array.from({ length: size }, () => {
      const slot = { worker: new Worker(new URL('./combat-performance-worker.mjs', import.meta.url)), current: null };
      slot.worker.on('message', message => {
        const task = slot.current;
        slot.current = null;
        if (task) message.error ? task.reject(new Error(message.error)) : task.resolve(message.result);
        this.dispatch(slot);
      });
      slot.worker.on('error', error => {
        slot.current?.reject(error);
        slot.current = null;
      });
      return slot;
    });
  }
  runBatch(jobs, maxActions) {
    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId++, jobs, maxActions, resolve, reject });
      for (const slot of this.workers) this.dispatch(slot);
    });
  }
  dispatch(slot) {
    if (slot.current || !this.queue.length) return;
    slot.current = this.queue.shift();
    const { id, jobs, maxActions } = slot.current;
    try { slot.worker.postMessage({ id, jobs, maxActions }); }
    catch (error) { slot.current.reject(error); slot.current = null; this.dispatch(slot); }
  }
  async close() {
    await Promise.all(this.workers.map(slot => slot.worker.terminate()));
  }
}
function characterPanelCacheKey(config, seed, maxActions) {
  return JSON.stringify([config.version, config.teams, config.settings, seed, maxActions]);
}

// This registry is the contract between authored tags, event evidence, and
// scenario coverage. It never contributes an extra score weight.
const TAG_MEASUREMENT_RULES = Object.freeze({
  'damage.direct': ['damage'], 'damage.physical': ['damage'], 'damage.magical': ['damage'], 'damage.true': ['damage'],
  'damage.critical': ['damage', 'critical'], 'damage.conditional_multiplier': ['damage', 'trigger'],
  'damage.over_time': ['damage', 'status'], 'damage.echo': ['damage'], 'damage.reflect': ['damage'],
  'damage.follow_up': ['damage', 'trigger'], 'damage.barrier_break': ['damage', 'barrier'],
  'buff.attack': ['damage', 'support'], 'buff.speed': ['speed', 'support'], 'buff.critical': ['damage', 'critical'], 'buff.next_basic': ['damage', 'support'],
  'buff.damage': ['damage', 'support'], 'buff.barrier_damage': ['damage', 'barrier'], 'buff.barrier_break_damage': ['damage', 'barrier'],
  'buff.defense_ignore': ['damage', 'defense'], 'debuff.defense': ['damage', 'defense'], 'debuff.damage': ['damage', 'mitigation'],
  'debuff.speed': ['speed', 'control'], 'debuff.attack': ['damage', 'mitigation'], 'debuff.mark': ['status', 'damage'], 'debuff.stun': ['status', 'control', 'turns'], 'defense.shield': ['shield', 'survival'], 'defense.barrier': ['barrier'],
  'defense.damage_reduction': ['mitigation', 'survival'], 'defense.stealth': ['dodge', 'survival'],
  'recovery.healing': ['healing', 'survival'], 'recovery.lifesteal': ['healing', 'survival'],
  'resource.energy': ['energy'], 'resource.skill_point': ['skillPoints'], 'resource.capacity': ['skillPoints'], 'resource.hp_cost': ['healthCost', 'survival'],
  'tempo.action_advance': ['actionAdvance', 'turns'], 'tempo.action_delay': ['actionDelay', 'turns'], 'tempo.taunt': ['taunt', 'mitigation'],
  'status.bleed': ['status', 'damage'], 'status.exposed': ['status', 'damage'], 'status.ricochet': ['status', 'damage'],
  'status.tune': ['status', 'support'], 'status.residue': ['status', 'mitigation'], 'status.broken': ['status', 'barrier'], 'status.stun': ['status', 'control', 'turns'], 'status.slow_start': ['status', 'speed', 'turns'],
  'summon.create': ['summon', 'damage'], 'summon.action': ['summon', 'damage'],
  'trigger.per_hit': ['trigger', 'status'], 'trigger.first_hit_per_target': ['trigger', 'damage'],
  'trigger.per_action': ['trigger', 'turns'], 'trigger.per_source': ['trigger', 'damage'], 'trigger.periodic': ['trigger', 'damage'],
  'limit.duration': ['duration', 'status'], 'limit.stacks': ['stacks', 'status'], 'limit.charges': ['charges', 'trigger'], 'limit.cooldown': ['cooldown', 'trigger']
});
assert(COMBAT_MECHANIC_TAGS.every(tag => TAG_MEASUREMENT_RULES[tag]), `Missing evaluator registration for mechanic tags: ${COMBAT_MECHANIC_TAGS.filter(tag => !TAG_MEASUREMENT_RULES[tag]).join(', ')}.`);
assert(Object.keys(TAG_MEASUREMENT_RULES).every(tag => COMBAT_MECHANIC_TAGS.includes(tag)), 'Evaluator registry includes a non-canonical combat tag.');

function fail(message) { throw new Error(message); }
function assert(ok, message) { if (!ok) fail(message); }
function permutations(values) {
  if (values.length < 2) return [values.slice()];
  const output = [];
  for (let index = 0; index < values.length; index++) {
    const rest = values.slice(0, index).concat(values.slice(index + 1));
    for (const tail of permutations(rest)) output.push([values[index], ...tail]);
  }
  return output;
}
function* orderedUniqueTeams(values, minSize, maxSize) {
  for (let size = minSize; size <= maxSize; size++) {
    for (const subset of combinations(values, size)) yield* permutations(subset);
  }
}
function* combinations(values, size, start = 0, prefix = []) {
  if (!size) { yield prefix; return; }
  for (let index = start; index <= values.length - size; index++) yield* combinations(values, size - 1, index + 1, [...prefix, values[index]]);
}
function* enemyLineups(ids, maxSize = 5, prefix = []) {
  if (prefix.length) yield prefix;
  if (prefix.length >= maxSize) return;
  for (const id of ids) yield* enemyLineups(ids, maxSize, [...prefix, id]);
}
function archetypeLibrary() {
  const archetypes = structuredClone({ ...CHARACTER_COMBAT_DATA, ...ENEMY_COMBAT_DATA });
  for (const id of [...CHARACTER_IDS, ...ENEMY_IDS]) assert(archetypes[id], `Missing combat definition for ${id}.`);
  return archetypes;
}
function enemyClassMix(enemies, library) {
  const counts = new Map();
  for (const id of enemies) {
    const type = library[id]?.tags?.type || 'unclassified';
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => `${type}:${count}`).join('+');
}
function enemyClassBand(enemies, library) {
  const types = new Set(enemies.map(id => library[id]?.tags?.type || 'unclassified'));
  if (types.has('boss')) return 'boss_present';
  if (types.has('elite')) return 'elite_present';
  return 'common_only';
}
function itemlessLibrary(source) {
  return Object.fromEntries(Object.entries(source).map(([id, archetype]) => {
    const clone = structuredClone(archetype);
    delete clone.weapon;
    delete clone.runes;
    return [id, clone];
  }));
}
function makeBalancedRunes(setId = null) {
  return [0, 1, 2, 3].map(index => ({
    level: 1,
    main: RUNE_MAIN[index],
    subs: ['hp', 'attack', 'physicalDefense', 'magicalDefense', 'speed'].filter(stat => stat !== RUNE_MAIN[index]).slice(0, 3),
    ...(setId ? { setId } : {})
  }));
}
function enemyDifficultyMetadata(archetype, difficulty) {
  const authoredStats = { ...(archetype.baseStats ?? archetype.stats) };
  const multiplier = difficulty.statMultiplier;
  return { difficulty: difficulty.id, authoredLevel: archetype.level ?? 1, statMultiplier: multiplier,
    authoredStats, benchmarkStats: enemyStatsAtMultiplier(authoredStats, multiplier),
    unchangedStats: ENEMY_LEVEL_SCALING.unchangedStats };
}
function makeBaseConfig(library, allies, enemies, difficulty, archetypeCache = null) {
  const profileKey = difficulty.id;
  let archetypes = archetypeCache?.get(profileKey);
  if (!archetypes) {
    archetypes = itemlessLibrary(library);
    for (const id of ENEMY_IDS) {
      archetypes[id].stats = enemyStatsAtMultiplier(archetypes[id].baseStats ?? archetypes[id].stats, difficulty.statMultiplier);
      archetypes[id].level = 1;
    }
    archetypeCache?.set(profileKey, archetypes);
  }
  // Difficulty applies one uniform Level 1 stat multiplier, never a separate
  // encounter-length, HP, Attack, or Defense adjustment.
  return {
    version: 1,
    name: `enemy-${difficulty.id}: ${allies.join('+')} vs ${enemies.join('+')}`,
    settings: { initialSkillPoints: 3, skillPointCap: 5, maxActions: 2000, policyProfile: DEFAULT_POLICY_PROFILE,
      benchmarkDifficulty: difficulty.id,
      benchmarkEnemyScaling: Object.fromEntries([...new Set(enemies)].map(id => [id, enemyDifficultyMetadata(library[id], difficulty)])) },
    archetypes,
    teams: {
      allies: allies.map((archetype, slot) => ({ id: `ally-${slot}-${archetype}`, archetype, slot })),
      enemies: enemies.map((archetype, slot) => ({ id: `enemy-${slot}-${archetype}`, archetype, slot }))
    }
  };
}
function candidateSpecs(raw) {
  if (raw === 'all-characters') return CHARACTER_IDS.map(character => ({ type: 'character-overall', id: character, character }));
  if (raw === 'all-upgrade-effects') return Object.values(CHARACTER_UPGRADE_EFFECTS).map(effect => ({ type: 'upgrade', id: effect.id, character: effect.character, source: effect.source }));
  if (raw === 'all-actions') return CHARACTER_IDS.flatMap(character => ['basic', 'skill', 'ultimate'].map(id => ({ type: 'action', id, character })));
  if (raw === 'all-passives') return CHARACTER_PASSIVES.map(spec => ({ type: 'passive', ...spec }));
  if (raw === 'all-effects') return Object.values(COMBAT_EFFECT_CATALOG).map(effect => ({ type: 'effect', id: effect.id, character: effect.character }));
  if (raw === 'all-character-mechanics') return [
    ...CHARACTER_PASSIVES.map(spec => ({ type: 'passive', ...spec })),
    ...Object.values(COMBAT_EFFECT_CATALOG).map(effect => ({ type: 'effect', id: effect.id, character: effect.character })),
    ...CHARACTER_IDS.flatMap(character => ['basic', 'skill', 'ultimate'].map(id => ({ type: 'action', id, character })))
  ];
  if (raw === 'all-rune-impact' || raw === 'all-rune-ratings') return RUNES.map(id => ({ type: 'rune', id }));
  if (raw === 'all-runes') return RUNES.map(id => ({ type: 'rune', id }));
  if (raw === 'all-weapons') return ['standard', 'premium'].flatMap(type => [1, 2, 3, 4, 5].flatMap(potential => [1, 10, 25, 50].map(level => ({ type: 'weapon', id: type, potential, level }))));
  const [type, ...rest] = raw.split(':');
  const value = rest.join(':');
  if (type === 'rune' && RUNES.includes(value)) return [{ type, id: value }];
  if (type === 'effect' && COMBAT_EFFECT_CATALOG[value]) return [{ type, id: value, character: COMBAT_EFFECT_CATALOG[value].character }];
  if ((type === 'character' || type === 'character-overall') && CHARACTER_IDS.includes(value)) return [{ type: 'character-overall', id: value, character: value }];
  if (type === 'passive' && /^[a-z0-9-]+\/[A-Za-z][A-Za-z0-9-]*$/.test(value)) {
    const [character, id] = value.split('/');
    if (CHARACTER_PASSIVES.some(spec => spec.character === character && spec.id === id)) return [{ type, id, character }];
  }
  if (type === 'upgrade' && CHARACTER_UPGRADE_EFFECTS[value]) {
    const effect = CHARACTER_UPGRADE_EFFECTS[value];
    return [{ type, id: effect.id, character: effect.character, source: effect.source }];
  }
  if (type === 'action' && /^[a-z0-9-]+\/(basic|skill|ultimate)$/.test(value)) {
    const [character, action] = value.split('/'); return [{ type, id: action, character }];
  }
  if (type === 'weapon' && /^(standard|premium)(?:@P[1-5](?:L(?:[1-9]|[1-4][0-9]|50))?)?$/.test(value)) {
    const [, id, p, level] = value.match(/^(standard|premium)(?:@P([1-5])(?:L([1-9]|[1-4][0-9]|50))?)?$/);
    return [{ type, id, potential: Number(p || 1), level: Number(level || 1) }];
  }
  fail(`Unknown candidate ${raw}. See --help.`);
}
function candidateLabel(spec) {
  if (spec.type === 'character-overall') return `${spec.type}:${spec.character}`;
  if (spec.type === 'action' || spec.type === 'passive') return `${spec.type}:${spec.character}/${spec.id}`;
  if (spec.type === 'effect') return `effect:${spec.id}`;
  return `${spec.type}:${spec.id}${spec.potential ? `@P${spec.potential}L${spec.level || 1}` : ''}`;
}
function componentFor(spec) {
  if (spec.type === 'action') return CHARACTER_COMBAT_DATA[spec.character]?.[spec.id] || null;
  if (spec.type === 'passive') return CHARACTER_COMBAT_DATA[spec.character]?.passives.find(effect => (effect.id || effect.type) === spec.id) || null;
  if (spec.type === 'upgrade') return CHARACTER_UPGRADE_EFFECTS[spec.id] || null;
  if (spec.type === 'rune') return RUNE_COMBAT_RULES[spec.id] || null;
  if (spec.type === 'effect') return COMBAT_EFFECT_CATALOG[spec.id] || null;
  if (spec.type === 'character-overall') {
    const kit = CHARACTER_COMBAT_DATA[spec.character];
    if (!kit) return null;
    const effects = [...kit.passives, kit.basic, kit.skill, kit.ultimate];
    const authoredEffects = Object.values(COMBAT_EFFECT_CATALOG).filter(effect => effect.character === spec.character);
    const allEffects = [...effects, ...authoredEffects];
    const metadataByTag = field => {
      const values = new Map();
      for (const effect of allEffects) for (const tag of effect?.mechanicTags || []) {
        const value = effect?.[field]?.[tag] ?? (field === 'mechanicTargets' ? effect?.targeting : field === 'mechanicTriggers' ? effect?.trigger : null);
        if (!value) continue;
        const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (!values.has(tag)) values.set(tag, { normalized, value });
        else if (values.get(tag).normalized !== normalized) values.set(tag, { normalized: 'event_defined', value: field === 'mechanicTargets'
          ? { side: 'trigger_targets', acquisition: 'event_defined', coverage: 'event_defined' } : 'event_defined' });
      }
      return Object.fromEntries([...values].map(([tag, entry]) => [tag, entry.value]));
    };
    return { mechanicTags: [...new Set(allEffects.flatMap(effect => effect?.mechanicTags || []))],
      mechanicTargets: metadataByTag('mechanicTargets'), mechanicTriggers: metadataByTag('mechanicTriggers') };
  }
  return null;
}
function evaluationPlan(spec) {
  const component = componentFor(spec), tags = [...new Set(component?.mechanicTags || [])].sort();
  const componentIds = spec.type === 'action' ? [`action:${spec.character}/${spec.id}`]
    : spec.type === 'passive' ? [`passive:${spec.character}/${spec.id}`]
      : spec.type === 'upgrade' ? [`upgrade:${spec.id}`]
        : spec.type === 'rune' ? [`rune:${spec.id}`]
        : spec.type === 'effect' ? [`effect:${spec.id}`]
          : spec.type === 'character-overall' ? [
            ...(CHARACTER_COMBAT_DATA[spec.character]?.passives || []).map(effect => `passive:${spec.character}/${effect.id || effect.type}`),
            ...['basic', 'skill', 'ultimate'].map(slot => `action:${spec.character}/${slot}`)
          ] : [];
  for (const tag of tags) assert(TAG_MEASUREMENT_RULES[tag], `No event-evidence rule for ${tag} on ${candidateLabel(spec)}.`);
  return { tags, componentIds, byTag: tags.map(tag => ({ tag, measurementFields: TAG_MEASUREMENT_RULES[tag],
    target: component?.mechanicTargets?.[tag] || component?.targeting || null,
    trigger: component?.mechanicTriggers?.[tag] || null,
    coverage: component?.mechanicTargets?.[tag]?.coverage || component?.targeting?.coverage || 'event_defined' })),
    measuredValues: component?.measures || [] };
}
function measurementPlanLabel(plan) {
  return plan.byTag.map(entry => `${entry.tag}:${entry.measurementFields.join('+')}@${entry.trigger || 'event_defined'}:${entry.target?.side || 'event_defined'}/${entry.coverage}`).join(';');
}
function aggregateMechanicEvents(result) {
  const rows = new Map(), events = result?.mechanicEvents?.events || [];
  for (const event of events) for (const tag of event.mechanicTags || []) {
    const key = `${event.componentId}|${tag}`;
    if (!rows.has(key)) rows.set(key, { componentId: event.componentId, tag, events: 0, statuses: {}, values: {} });
    const row = rows.get(key); row.events++; row.statuses[event.status] = (row.statuses[event.status] || 0) + 1;
    if (!['triggered', 'attempted'].includes(event.status)) for (const [name, value] of Object.entries(event.values || {}))
      if (Number.isFinite(value)) row.values[name] = (row.values[name] || 0) + value;
  }
  return rows;
}
function mechanicEventDeltas(control, treatment) {
  const before = aggregateMechanicEvents(control), after = aggregateMechanicEvents(treatment), output = {};
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const a = before.get(key) || { events: 0, statuses: {}, values: {} }, b = after.get(key) || { events: 0, statuses: {}, values: {} };
    const [componentId, tag] = key.split('|');
    output[key] = { componentId, tag, eventCountDelta: b.events - a.events,
      statusCountDeltas: Object.fromEntries([...new Set([...Object.keys(a.statuses), ...Object.keys(b.statuses)])].map(status => [status, (b.statuses[status] || 0) - (a.statuses[status] || 0)])),
      valueDeltas: Object.fromEntries([...new Set([...Object.keys(a.values), ...Object.keys(b.values)])].map(name => [name, (b.values[name] || 0) - (a.values[name] || 0)])) };
  }
  return output;
}
function summarizeMechanicEventDeltas(trials, plan, controlDropped, treatmentDropped) {
  return plan.byTag.map(({ tag, measurementFields, target, trigger, coverage }) => {
    const perTrial = trials.map(trial => Object.values(trial.mechanicEventDeltas).filter(row => row.tag === tag && plan.componentIds.includes(row.componentId)));
    const componentIds = [...new Set(perTrial.flatMap(rows => rows.map(row => row.componentId)))].sort();
    const components = componentIds.map(componentId => {
      const rows = perTrial.map(events => events.find(event => event.componentId === componentId));
      const metricFields = [...new Set(rows.flatMap(row => Object.keys(row?.valueDeltas || {})))].sort();
      const statusFields = [...new Set(rows.flatMap(row => Object.keys(row?.statusCountDeltas || {})))].sort();
      return { componentId, eventCountDelta: meanCI(rows.map(row => row?.eventCountDelta || 0)),
        statusCountDeltas: Object.fromEntries(statusFields.map(status => [status, meanCI(rows.map(row => row?.statusCountDeltas?.[status] || 0))])),
        valueDeltas: Object.fromEntries(metricFields.map(metric => [metric, meanCI(rows.map(row => row?.valueDeltas?.[metric] || 0))])) };
    });
    const observed = perTrial.some(rows => rows.length > 0);
    return { tag, measurementFields, target, trigger, requiredCoverage: coverage,
      evidenceStatus: observed ? 'event_observed' : 'tagged_but_not_triggered_in_this_comparison',
      components, eventCapture: { truncated: controlDropped > 0 || treatmentDropped > 0,
        droppedControl: controlDropped, droppedTreatment: treatmentDropped } };
  });
}
function summarizeMechanicEventObservations(trials, plan) {
  const componentIds = new Set(plan.componentIds);
  const perTrialByTag = trials.map(trial => {
    const events = aggregateMechanicEvents({ mechanicEvents: trial.treatmentMechanicEvents });
    const byTag = new Map();
    for (const row of events.values()) {
      if (!componentIds.has(row.componentId)) continue;
      const rows = byTag.get(row.tag) || [];
      rows.push(row);
      byTag.set(row.tag, rows);
    }
    return byTag;
  });
  const droppedTreatment = trials.reduce((sum, trial) => sum + (trial.treatmentMechanicEvents?.dropped || 0), 0);
  return plan.byTag.map(({ tag, measurementFields, target, trigger, coverage }) => {
    const perTrial = perTrialByTag.map(byTag => byTag.get(tag) || []);
    const componentIds = [...new Set(perTrial.flatMap(rows => rows.map(row => row.componentId)))].sort();
    const components = componentIds.map(componentId => {
      const rows = perTrial.map(events => events.find(event => event.componentId === componentId));
      const valueFields = [...new Set(rows.flatMap(row => Object.keys(row?.values || {})))].sort();
      const statusFields = [...new Set(rows.flatMap(row => Object.keys(row?.statuses || {})))].sort();
      return { componentId, eventCount: meanCI(rows.map(row => row?.events || 0)),
        statusCounts: Object.fromEntries(statusFields.map(status => [status, meanCI(rows.map(row => row?.statuses?.[status] || 0))])),
        values: Object.fromEntries(valueFields.map(name => [name, meanCI(rows.map(row => row?.values?.[name] || 0))])) };
    });
    const observed = perTrial.some(rows => rows.length > 0);
    return { tag, measurementFields, target, trigger, requiredCoverage: coverage,
      evidenceStatus: observed ? 'event_observed' : 'tagged_but_not_triggered_in_sample', components,
      eventCapture: { truncated: trials.some(trial => trial.treatmentMechanicEvents?.dropped > 0),
        droppedTreatment } };
  });
}
function wearersFor(spec, party) {
  if (spec.type === 'upgrade') return party.includes(spec.character) ? [spec.character] : [];
  if (spec.type === 'character') return party.includes(spec.id) ? [spec.id] : [];
  if (spec.type === 'action' || spec.type === 'passive' || spec.type === 'character-overall') return party.includes(spec.character) ? [spec.character] : [];
  if (spec.type === 'effect') return party.includes(spec.character) ? [spec.character] : [];
  if (spec.type === 'rune') {
    return party.filter(character => isRuneEligible(spec.id, character));
  }
  return party.slice();
}
function isRuneEligible(runeId, characterId) {
  const requirement = RUNE_COMBAT_RULES[runeId]?.eligibility, kit = CHARACTER_COMBAT_DATA[characterId];
  if (!requirement || !kit) return false;
  const damaging = action => Boolean(action?.damageType && Number(action.multiplier) > 0);
  if (requirement === 'damaging_skill') return damaging(kit.skill);
  if (requirement === 'damaging_ultimate') return damaging(kit.ultimate);
  if (requirement === 'damaging_ability') return ['basic', 'skill', 'ultimate'].some(slot => damaging(kit[slot]));
  if (requirement === 'skill') return Boolean(kit.skill);
  if (requirement === 'ultimate') return Boolean(kit.ultimate);
  if (requirement === 'basic') return Boolean(kit.basic);
  if (requirement === 'single_ally_targeted_skill') return kit.skill?.target === 'ally';
  if (requirement === 'ally_targeted_skill') return ['ally', 'allAllies', 'actor_team'].includes(kit.skill?.target);
  return false;
}
function findUnit(config, archetype) { return config.teams.allies.find(unit => unit.archetype === archetype); }
function selectedAllyTargetIds(spec, base) {
  if (!['effect', 'action'].includes(spec.type)) return [];
  const targeting = spec.type === 'effect' ? COMBAT_EFFECT_CATALOG[spec.id]?.targeting : componentFor(spec)?.targeting;
  return targeting?.side === 'ally' && targeting?.acquisition === 'selected' && targeting?.coverage === 'single'
    ? base.teams.allies.map(unit => unit.id) : [];
}
function referenceDamageAction(slot, action) {
  const coverage = action?.target || action?.targetMode;
  const multiplier = COMBAT_PERFORMANCE_STANDARD.damageMultipliers[slot]?.[coverage];
  if (!Number.isFinite(multiplier) || !['physical', 'magical', 'true'].includes(action?.damageType)) return null;
  return {
    benchmarkSlot: slot,
    damageType: action.damageType,
    multiplier,
    target: coverage,
    energyGain: slot === 'basic' ? (Number.isFinite(action.energyGain) ? action.energyGain : 0)
      : slot === 'skill' ? COMBAT_PERFORMANCE_STANDARD.referenceSkillEnergyGain : 0,
    skillPointGain: slot === 'basic' ? COMBAT_PERFORMANCE_STANDARD.referenceBasicSkillPointGain : 0,
    skillPointCost: slot === 'skill' ? COMBAT_PERFORMANCE_STANDARD.referenceSkillPointCost : 0,
    energyCost: slot === 'ultimate' ? COMBAT_PERFORMANCE_STANDARD.referenceUltimateEnergyCost : 0
  };
}
function actionComparisonReference(spec, archetype) {
  const action = archetype?.[spec.id];
  if (spec.type === 'action' && action) {
    const slotReference = referenceDamageAction(spec.id, action);
    if (slotReference) return { action: slotReference, label: `standard ${spec.id} (${slotReference.target}, ${slotReference.multiplier}x)` };
  }
  const basicReference = referenceDamageAction('basic', archetype?.basic);
  return basicReference ? { action: basicReference, label: `standard basic (${basicReference.target}, ${basicReference.multiplier}x)` } : null;
}
function comparisonReferenceFor(spec, archetype) {
  if (spec.type === 'action') return actionComparisonReference(spec, archetype)?.label || 'standard basic reference';
  if (spec.type === 'rune') return 'character with no equipped Runes vs the same character with only this four-piece set passive enabled; Rune stat bonuses are disabled in both branches';
  return null;
}
function makeRuneBranch(base, wearer, setId) {
  // Rune passive comparisons are before/after character gauges: neither branch
  // receives Rune main/substats. Control has no Runes; treatment equips a complete
  // set so only its passive is active. Keep immutable archetypes shared.
  const branch = {
    ...base,
    settings: { ...base.settings, benchmarkRunePassivesOnly: true },
    teams: {
      allies: base.teams.allies.map(unit => ({ ...unit })),
      enemies: base.teams.enemies.map(unit => ({ ...unit }))
    }
  };
  const wearerUnit = findUnit(branch, wearer);
  assert(wearerUnit, `Wearer ${wearer} is absent from matchup.`);
  if (setId) wearerUnit.runes = makeBalancedRunes(setId);
  else delete wearerUnit.runes;
  return branch;
}
function makeBranches(base, spec, wearer) {
  if (spec.type === 'character-overall') {
    const treatment = structuredClone(base);
    assert(findUnit(treatment, wearer), `Wearer ${wearer} is absent from matchup.`);
    return { control: null, treatment };
  }
  const control = structuredClone(base);
  const treatment = structuredClone(base);
  const controlled = findUnit(control, wearer);
  const treated = findUnit(treatment, wearer);
  assert(controlled && treated, `Wearer ${wearer} is absent from matchup.`);
  if (spec.type === 'upgrade') {
    const source = spec.source;
    const equipped = source.kind === 'premium_weapon_duplicate' || source.kind === 'signature_weapon';
    const weapon = equipped ? { type: 'premium', potential: source.kind === 'premium_weapon_duplicate' ? source.rank + 1 : 1 } : null;
    if (source.kind === 'character_duplicate') {
      controlled.characterDuplicates = source.rank;
      treated.characterDuplicates = source.rank;
    }
    if (equipped) {
      controlled.weapon = { ...weapon };
      treated.weapon = { ...weapon };
    }
    controlled.disabledUpgradeEffectIds = [...new Set([...(controlled.disabledUpgradeEffectIds || []), spec.id])];
  } else if (spec.type === 'weapon') {
    treated.weapon = { type: spec.id, potential: spec.potential, level: spec.level || 1 };
  } else if (spec.type === 'character' || spec.type === 'character-overall') {
    const archetype = control.archetypes[wearer];
    archetype.passives = [];
    delete archetype.skill;
    delete archetype.ultimate;
    control.settings.disabledPassives = [...(control.settings.disabledPassives || []), ...CHARACTER_PASSIVES.filter(passive => passive.character === wearer).map(passive => `${wearer}:${passive.id}`)];
    if (spec.type === 'character-overall') {
      const reference = referenceDamageAction('basic', archetype.basic);
      if (reference) archetype.basic = reference;
    }
  } else if (spec.type === 'passive') {
    control.settings.disabledPassives = [...(control.settings.disabledPassives || []), `${wearer}:${spec.id}`];
  } else if (spec.type === 'action') {
    for (const config of [control, treatment]) {
      const unit = findUnit(config, wearer);
      if (spec.id === 'ultimate') config.archetypes[wearer].energy = { ...(config.archetypes[wearer].energy || {}), start: 100 };
      config.settings.actionOverride = { actorId: unit.id, turn: 1, action: config === treatment ? spec.id : 'basic' };
    }
    if (spec.id === 'basic') {
      const reference = referenceDamageAction('basic', treatment.archetypes[wearer].basic);
      if (reference) control.archetypes[wearer].basic = reference;
    } else {
      const reference = actionComparisonReference(spec, treatment.archetypes[wearer]);
      if (reference) control.archetypes[wearer].basic = reference.action;
    }
  } else if (spec.type === 'effect') {
    const effect = COMBAT_EFFECT_CATALOG[spec.id];
    control.settings.disabledCombatEffectIds = [...(control.settings.disabledCombatEffectIds || []), spec.id];
    for (const config of [control, treatment]) {
      const unit = findUnit(config, wearer);
      if (effect.slot === 'ultimate') config.archetypes[wearer].energy = { ...(config.archetypes[wearer].energy || {}), start: 100 };
      config.settings.actionOverride = { actorId: unit.id, turn: 1, action: effect.slot };
    }
  }
  return { control, treatment };
}
function winValue(result) { return result.winner === 'allies' ? 1 : 0; }
function outcomeRating(result) { return result.winner === 'allies' ? 100 : 0; }
function average(values) { return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0; }
function weightedMean(entries, valueOf, weightOf) {
  let weightedTotal=0,totalWeight=0;
  for(const entry of entries){const value=valueOf(entry),weight=weightOf(entry);if(Number.isFinite(value)&&Number.isFinite(weight)&&weight>0){weightedTotal+=value*weight;totalWeight+=weight}}
  return totalWeight?weightedTotal/totalWeight:null;
}
function meanCI(values) {
  const mean = average(values);
  if (values.length < 2) return { mean, lower: mean, upper: mean };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  const margin = 1.96 * Math.sqrt(variance / values.length);
  return { mean, lower: mean - margin, upper: mean + margin };
}
function boundedRatingCI(values) {
  const interval = meanCI(values);
  return { mean: interval.mean, lower: Math.max(0, interval.lower), upper: Math.min(100, interval.upper) };
}
function percentCI(values) {
  const interval = meanCI(values);
  return { mean: interval.mean * 100, lower: interval.lower * 100, upper: interval.upper * 100 };
}
function percentile(values, probability) {
  const ordered = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!ordered.length) return null;
  const position = (ordered.length - 1) * probability, lower = Math.floor(position), upper = Math.ceil(position);
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
}
function benchmarkCharacterRows(samples, seed = 1, expectedDesignStrata = 45, bootstrapReplicates = 1000, policyFilter = null) {
  const grouped = new Map();
  for (const sample of samples.filter(row => row.componentType === 'character-overall' && (!policyFilter || row.policyProfile === policyFilter))) {
    const key = `${sample.candidate}|${sample.wearer}`;
    if (!grouped.has(key)) grouped.set(key, { candidate: sample.candidate, character: sample.wearer, scenarios: new Map(), designStrata: new Set() });
    const entry = grouped.get(key);
    entry.designStrata.add([sample.allyCount, sample.enemyCount, sample.enemyCategory, sample.difficulty].join('|'));
    const block = entry.scenarios.get(sample.enemyCategory) || new Map();
    const compositionKey = [sample.allyCount, sample.enemyCount, sample.difficulty, sample.partyComposition, sample.enemyComposition].join('|');
    const policies = block.get(compositionKey) || [];
    policies.push(sample); block.set(compositionKey, policies); entry.scenarios.set(sample.enemyCategory, block);
  }
  let randomState = (seed >>> 0) || 1;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const output = [];
  for (const entry of grouped.values()) {
    const bands=[...entry.scenarios.values()].map(compositions=>{
      const byDifficulty=new Map();
      for(const policyRows of compositions.values()){
        const difficulty=policyRows[0].difficulty,rows=byDifficulty.get(difficulty)||[];
        rows.push({treatmentBySeed:Array.from({length:policyRows[0].treatmentRatings.length},(_,i)=>weightedMean(policyRows,row=>row.treatmentRatings[i],row=>POLICY_WEIGHTS.get(row.policyProfile)??1))});
        byDifficulty.set(difficulty,rows);
      }
      return byDifficulty;
    });
    const runCount=Math.min(...[...entry.scenarios.values()].flatMap(block=>[...block.values()].map(rows=>rows[0].treatmentRatings.length)));
    const bandMean=(band,valueOf)=>weightedMean(ENEMY_DIFFICULTIES.map(difficulty=>{const cells=band.get(difficulty.id)||[];return {difficulty,value:cells.length?average(cells.map(valueOf)):null}}),item=>item.value,item=>item.difficulty.ratingWeight);
    const perSeed=Array.from({length:runCount},(_,run)=>average(bands.map(band=>bandMean(band,cell=>cell.treatmentBySeed[run]))));
    const treatment=average(perSeed);
    const scenarioScores=[];
    for(let replicate=0;replicate<bootstrapReplicates;replicate++){
      const pickedBands=bands.map(band=>weightedMean(ENEMY_DIFFICULTIES.map(difficulty=>{
        const cells=band.get(difficulty.id)||[];
        const picked=cells.length?Array.from({length:cells.length},()=>cells[Math.floor(random()*cells.length)]):[];
        return {difficulty,value:cells.length?average(picked.map(cell=>average(cell.treatmentBySeed))):null};
      }),item=>item.value,item=>item.difficulty.ratingWeight));
      scenarioScores.push(average(pickedBands));
    }
    output.push({ candidate: entry.candidate, character: entry.character, outcomeScore: treatment,
      policyProfile: policyFilter || 'weighted-ensemble', sampledScenarioCells: bands.reduce((sum,band)=>sum+[...band.values()].reduce((subtotal,cells)=>subtotal+cells.length,0),0),
      policyScenarioCells: [...entry.scenarios.values()].flatMap(block => [...block.values()]).reduce((sum, rows) => sum + rows.length, 0), scenarioBootstrapBlocks: bands.length,
      sampledDesignStrata: entry.designStrata.size, expectedDesignStrata,
      scenario95Lower: percentile(scenarioScores, .025), scenario95Upper: percentile(scenarioScores, .975),
      seed95Lower: Math.max(0, meanCI(perSeed).lower), seed95Upper: Math.min(100, meanCI(perSeed).upper) });
  }
  return output;
}
function writeBenchmarkArtifacts(outputPath, samples, coverage, expectedBenchmarkStrata, options, scenarioCount, comparisonCount) {
  const scoreRows = benchmarkCharacterRows(samples, options.seed, expectedBenchmarkStrata.length);
  const policyProfiles = options.policyProfile === 'ensemble' ? POLICY_PROFILES : [options.policyProfile];
  const policyScoreRows = policyProfiles.flatMap(policy => benchmarkCharacterRows(samples, options.seed, expectedBenchmarkStrata.length, 1000, policy));
  for (const score of scoreRows) {
    const policyScores = policyScoreRows.filter(row => row.character === score.character).map(row => row.outcomeScore);
    score.policyMinimum = Math.min(...policyScores); score.policyMaximum = Math.max(...policyScores);
    score.policySpread = score.policyMaximum - score.policyMinimum;
  }
  const mechanicCoverage = new Map();
  for (const sample of samples) {
    for (const tag of (sample.mechanicTags || '').split(';').filter(Boolean)) {
      const row = mechanicCoverage.get(tag) || { tag, scenarioPolicySamples: 0, samplesWithEvents: 0 };
      row.scenarioPolicySamples++;
      if (sample.eventObserved?.[tag]) row.samplesWithEvents++;
      mechanicCoverage.set(tag, row);
    }
  }
  const basePath = outputPath.replace(/\.jsonl$/i, '');
  const coveragePath = `${basePath}-benchmark-coverage.csv`;
  const scorePath = `${basePath}-benchmark-score.csv`;
  const policyScorePath = `${basePath}-benchmark-policy-scores.csv`;
  const mechanicCoveragePath = `${basePath}-benchmark-mechanics.csv`;
  const reportPath = `${basePath}-benchmark-report.md`;
  const chartFile = `${basePath}-character-winrate.svg`;
  const runeImpactSummary = `${path.basename(outputPath).replace(/\.jsonl$/i, '')}-rune-impact.csv`;
  const runeImpactByWearer = `${path.basename(outputPath).replace(/\.jsonl$/i, '')}-rune-impact-by-wearer.csv`;
  const runeOnlyReport = scoreRows.length === 0 && samples.some(row => row.componentType === 'rune');
  const runeDesign = new Map();
  for (const row of samples.filter(sample => sample.componentType === 'rune')) {
    const key = `${row.candidate}|${row.wearer}`;
    const strata = runeDesign.get(key) || new Set();
    strata.add([row.allyCount, row.enemyCount, row.enemyCategory, row.difficulty].join('|'));
    runeDesign.set(key, strata);
  }
  const completeDesign = runeOnlyReport
    ? runeDesign.size > 0 && [...runeDesign.values()].every(strata => strata.size === expectedBenchmarkStrata.length)
    : scoreRows.length > 0 && scoreRows.every(row => row.sampledDesignStrata === expectedBenchmarkStrata.length);
  const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const expected = {
    partySize: [String(BENCHMARK_PARTY_SIZE)], enemyCount: ['1', '2', '3', '4', '5'],
    enemyArchetype: ENEMY_IDS, enemyClassBand: ['common_only', 'elite_present', 'boss_present'],
    difficulty: ENEMY_DIFFICULTIES.map(({id}) => id), policy: policyProfiles, benchmarkStratum: expectedBenchmarkStrata
  };
  const coverageRows = Object.entries(expected).flatMap(([dimension, categories]) => {
    const values = coverage.get(dimension) || new Map();
    return categories.map(category => ({ dimension, category, sampledScenarioCells: values.get(String(category)) || 0 }));
  });
  const perCharacterCoverage = new Map();
  for (const sample of samples.filter(row => row.componentType === 'character-overall')) {
    const stratum = [sample.allyCount, sample.enemyCount, sample.enemyCategory, sample.difficulty].join('|');
    const key = `${sample.wearer}|${stratum}`;
    if (!perCharacterCoverage.has(key)) perCharacterCoverage.set(key, new Set());
    perCharacterCoverage.get(key).add(sample.policyProfile);
  }
  coverageRows.push(...[...perCharacterCoverage].map(([key, policies]) => ({ dimension: 'candidateDesignStratum', category: key, sampledScenarioCells: policies.size })));
  fs.writeFileSync(coveragePath, ['dimension,category,sampledScenarioCells', ...coverageRows.map(row =>
    [row.dimension, row.category, row.sampledScenarioCells].map(csv).join(','))].join('\n') + '\n');
  const scoreColumns = Object.keys(scoreRows[0] || {});
  fs.writeFileSync(scorePath, [scoreColumns.join(','), ...scoreRows.map(row => scoreColumns.map(key => csv(row[key])).join(','))].join('\n') + '\n');
  const policyScoreColumns = Object.keys(policyScoreRows[0] || {});
  fs.writeFileSync(policyScorePath, [policyScoreColumns.join(','), ...policyScoreRows.map(row => policyScoreColumns.map(key => csv(row[key])).join(','))].join('\n') + '\n');
  const mechanicRows = [...mechanicCoverage.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  fs.writeFileSync(mechanicCoveragePath, ['tag,scenarioPolicySamples,samplesWithEvents', ...mechanicRows.map(row =>
    [row.tag, row.scenarioPolicySamples, row.samplesWithEvents].map(csv).join(','))].join('\n') + '\n');
  const coverageLines = Object.entries(expected).map(([dimension, categories]) => {
    const seen = coverage.get(dimension) || new Map();
    const present = categories.filter(category => seen.has(String(category)));
    const missing = categories.filter(category => !seen.has(String(category)));
    const missingText = !missing.length ? 'Complete' : missing.length > 8
      ? `${missing.length} categories absent; see coverage CSV` : missing.join(', ');
    return `| ${dimension} | ${present.length}/${categories.length} | ${missingText} |`;
  });
  const scoreLines = scoreRows.map(row => `| ${row.character} | ${row.outcomeScore.toFixed(1)} | ${row.scenario95Lower.toFixed(1)}–${row.scenario95Upper.toFixed(1)} | ${row.policyMinimum.toFixed(1)}–${row.policyMaximum.toFixed(1)} | ${row.sampledScenarioCells} | ${row.sampledDesignStrata}/${row.expectedDesignStrata} |`);
  const policyLines = policyScoreRows.map(row => `| ${row.character} | ${row.policyProfile} | ${row.outcomeScore.toFixed(1)} |`);
  const mechanicLines = mechanicRows.map(row => `| ${row.tag} | ${row.samplesWithEvents}/${row.scenarioPolicySamples} |`);
  fs.writeFileSync(chartFile, makeCharacterScoreSvg(scoreRows));
  const report = `# ${runeOnlyReport ? 'Rune Set Passive Benchmark Report' : 'Character Performance Benchmark Report'}\n\n`+
    `- Benchmark version: 7\n- Sample status: ${completeDesign ? 'all design strata represented' : 'exploratory: design strata are missing'}\n- Generated: ${new Date().toISOString()}\n- Scenario-policy cells: ${scenarioCount}\n- Character scenario runs: ${comparisonCount}\n- Seeds per matchup: ${options.runs}; first seed: ${options.seed}\n- Policies: ${policyProfiles.map(policy => `\`${policy}\``).join(', ')}\n- Scenario selection: four-person parties across all five enemy counts, enemy class bands, and Easy/Normal/Hard enemy stat levels.\n\n`+
    `## ${runeOnlyReport ? 'Rune passive comparisons' : 'Character benchmark scores'}\n\n`+
    `${runeOnlyReport
      ? `Each eligible wearer is compared with no Runes equipped against the same character with only the selected four-piece Rune passive enabled. Rune stat bonuses are disabled in both branches. The [Rune summary](${path.basename(runeImpactSummary)}) and [by-wearer results](${path.basename(runeImpactByWearer)}) contain the before/after ratings and differences.`
      : "The headline ensemble score uses each character's actual authored kit; each win scores 100 and each completed loss scores 0. Action-limit incompletes count as non-wins and are reported separately. Within each enemy-class band, the three policy scores are weighted Basic-focused 25%, Skill-focused 25%, Mixed 50%. Easy, Normal, and Hard are weighted 25%, 50%, and 25%; represented enemy-class bands are then averaged equally. This gives one contextual party-benchmark score, not an intrinsic character rating. The policy range is shown because policies are reproducible probes, not estimates of player frequency. Ability event evidence records which tagged mechanics activated and their observed values; it is diagnostic and does not subtract a disabled-kit control."}\n\n`+
    `Difficulty changes only enemy stats, using one uniform Level 1 stat multiplier for HP, Attack, Physical Defense, Magical Defense, and Speed: Easy ×0.75, Normal ×1, Hard ×1.5, rounded to the nearest 0.25. There are no separate encounter-length, HP, Attack, or Defense multipliers; enemy mechanics remain unchanged. Per-enemy authored and effective stats are recorded in each JSONL row. Scenario intervals resample enemy/team compositions within class bands; seed intervals summarize matched-seed variation.\n\n`+
    `${scoreRows.length ? `| Character | Ensemble win rate / 100 | Scenario 95% interval | Policy range | Sampled scenario cells | Design strata covered |\n|---|---:|---:|---:|---:|---:|\n${scoreLines.join('\n')}\n\n` : ''}`+
    `${policyScoreRows.length ? `## Per-policy scores\n\n| Character | Policy | Win rate / 100 |\n|---|---|---:|\n${policyLines.join('\n')}\n\n` : ''}`+
    `## Scenario coverage\n\n| Dimension | Categories covered | Missing categories |\n|---|---:|---|\n${coverageLines.join('\n')}\n\n`+
    `Enemy class mixes observed are listed in [benchmark coverage CSV](${path.basename(coveragePath)}). Per-battle results and tagged ability event evidence remain in the JSONL. See the [character win-rate chart](${path.basename(chartFile)}).\n\n`+
    `## Mechanic event evidence\n\n| Mechanic tag | Scenario-policy samples with an event |\n|---|---:|\n${mechanicLines.join('\n') || '| No tagged events were captured | |'}\n\n`+
    `A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](${path.basename(mechanicCoveragePath)}).\n\n`+
    `## Interpretation and limitations\n\n`+
    `The policy and difficulty weights define the benchmark convention; they do not claim that players or encounters occur in these proportions in live play. Results remain sensitive to the authored roster, sampled compositions, and shared engine. Read policy-specific scores, coverage, and event evidence alongside the ensemble result.\n`;
  fs.writeFileSync(reportPath, report);
  console.log(`Benchmark report: ${reportPath}`);
  console.log(`Benchmark coverage: ${coveragePath}`);
  console.log(`Per-policy benchmark scores: ${policyScorePath}`);
  console.log(`Mechanic event coverage: ${mechanicCoveragePath}`);
  if (scoreRows.length) {
    console.log(`Benchmark scores: ${scorePath}`);
    for (const row of scoreRows) console.log(`  ${row.character}: ${row.outcomeScore.toFixed(1)}/100 ensemble win rate (policy ${row.policyMinimum.toFixed(1)}–${row.policyMaximum.toFixed(1)}).`);
  }
}
function sumAllyMetric(result, key) {
  return Object.values(result.unitStats || {}).reduce((sum, unit) => sum + (Number(unit[key]) || 0), 0);
}
function allyImpactSnapshot(result) {
  const snapshot = {
    damageDealt: result.damageDealt?.allies || 0,
    damageTaken: sumAllyMetric(result, 'damageTaken'),
    supportDamageAmplified: sumAllyMetric(result, 'supportDamageAmplified'),
    healing: result.lifestealHealing?.allies || 0,
    shieldsGranted: sumAllyMetric(result, 'shieldGranted'),
    shieldsAbsorbed: result.alliedShieldAbsorbed || 0,
    shieldRemaining: (result.survivors?.allies || []).reduce((sum, unit) => sum + (unit.shield || 0), 0),
    energyGranted: sumAllyMetric(result, 'energyGranted'),
    energyGained: sumAllyMetric(result, 'energyGained'),
    energySpent: sumAllyMetric(result, 'energySpent'),
    energyRemaining: sumAllyMetric(result, 'energyRemaining'),
    skillPointsGenerated: sumAllyMetric(result, 'skillPointsGenerated'),
    skillPointsGranted: sumAllyMetric(result, 'skillPointsGranted'),
    skillPointsSpent: sumAllyMetric(result, 'skillPointsSpent'),
    allyTurns: result.allyTurns || 0,
    enemyTurns: result.enemyTurns || 0,
    turnsAdvanced: sumAllyMetric(result, 'turnsAdvanced'),
    skills: sumAllyMetric(result, 'skills'),
    ultimates: sumAllyMetric(result, 'ultimates')
  };
  for (const channel of ['direct', 'bleed', 'followUp', 'ricochet', 'summon', 'echo', 'reflect']) {
    snapshot[`damage_${channel}`] = Object.values(result.unitStats || {}).reduce((sum, unit) => sum + (Number(unit.damageBreakdown?.[channel]) || 0), 0);
  }
  return snapshot;
}
function impactDeltas(control, treatment) {
  const before = allyImpactSnapshot(control), after = allyImpactSnapshot(treatment);
  return {
    enemyHpRemoved: control.finalHp.enemies - treatment.finalHp.enemies,
    allyHpRetained: treatment.finalHp.allies - control.finalHp.allies,
    ...Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]])),
    skillPointsRemaining: treatment.skillPointsRemaining - control.skillPointsRemaining
  };
}
function battleMetrics(control, treatment, seed) {
  if (!control) {
    return { seed, controlWin: null, treatmentWin: winValue(treatment), controlRating: null, treatmentRating: outcomeRating(treatment),
      controlTimeout: null, treatmentTimeout: treatment.winner === 'incomplete' ? 1 : 0, winDelta: null,
      controlDamage: null, treatmentDamage: treatment.damageDealt.allies, wearerDamageControl: null, wearerDamageTreatment: treatment.unitStats,
      enemyHpDelta: null, allyHpRetainedDelta: null, hpSwing: null, bae: null, impact: null, actualImpact: allyImpactSnapshot(treatment),
      mechanicEventDeltas: {}, treatmentMechanicEvents: treatment.mechanicEvents,
      mechanicEventCapture: { controlDropped: 0, treatmentDropped: treatment.mechanicEvents?.dropped || 0 },
      control: null, treatment: { winner: treatment.winner, actions: treatment.actions, allyTurns: treatment.allyTurns, enemyTurns: treatment.enemyTurns,
        finalHp: treatment.finalHp, damageDealt: treatment.damageDealt, shields: treatment.alliedShieldAbsorbed,
        skillPoints: treatment.skillPointsRemaining, actionOverride: treatment.actionOverride,
        survivors: { allies: treatment.survivors.allies.length, enemies: treatment.survivors.enemies.length } } };
  }
  const controlWin = winValue(control), treatmentWin = winValue(treatment);
  const enemyHpDelta = control.finalHp.enemies - treatment.finalHp.enemies;
  const allyHpRetainedDelta = treatment.finalHp.allies - control.finalHp.allies;
  return {
    seed,
    controlWin,
    treatmentWin,
    controlRating: outcomeRating(control),
    treatmentRating: outcomeRating(treatment),
    controlTimeout: control.winner === 'incomplete' ? 1 : 0,
    treatmentTimeout: treatment.winner === 'incomplete' ? 1 : 0,
    winDelta: treatmentWin - controlWin,
    controlDamage: control.damageDealt.allies,
    treatmentDamage: treatment.damageDealt.allies,
    wearerDamageControl: control.unitStats,
    wearerDamageTreatment: treatment.unitStats,
    enemyHpDelta,
    allyHpRetainedDelta,
    hpSwing: enemyHpDelta + allyHpRetainedDelta,
    bae: (enemyHpDelta + allyHpRetainedDelta) / BAE_REFERENCE_HP,
    impact: impactDeltas(control, treatment),
    mechanicEventDeltas: mechanicEventDeltas(control, treatment),
    treatmentMechanicEvents: treatment.mechanicEvents,
    mechanicEventCapture: { controlDropped: control.mechanicEvents?.dropped || 0, treatmentDropped: treatment.mechanicEvents?.dropped || 0 },
    control: {
      winner: control.winner, actions: control.actions, allyTurns: control.allyTurns, enemyTurns: control.enemyTurns,
      finalHp: control.finalHp, damageDealt: control.damageDealt, shields: control.alliedShieldAbsorbed,
      skillPoints: control.skillPointsRemaining, actionOverride: control.actionOverride,
      survivors: { allies: control.survivors.allies.length, enemies: control.survivors.enemies.length }
    },
    treatment: {
      winner: treatment.winner, actions: treatment.actions, allyTurns: treatment.allyTurns, enemyTurns: treatment.enemyTurns,
      finalHp: treatment.finalHp, damageDealt: treatment.damageDealt, shields: treatment.alliedShieldAbsorbed,
      skillPoints: treatment.skillPointsRemaining, actionOverride: treatment.actionOverride,
      survivors: { allies: treatment.survivors.allies.length, enemies: treatment.survivors.enemies.length }
    }
  };
}
function csvEscape(value) { const text = typeof value === 'string' ? value : JSON.stringify(value); return `"${String(text ?? '').replaceAll('"', '""')}"`; }
function xmlEscape(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function makeWinRateSvg(strataRows) {
  const groups = new Map();
  for (const row of strataRows) {
    const key = `${row.candidate}|${row.wearer}`;
    if (!groups.has(key)) groups.set(key, { candidate: row.candidate, wearer: row.wearer, n: 0, before: 0, after: 0 });
    const group = groups.get(key); group.n++; group.before += row.controlWin / row.compositionPairs; group.after += row.treatmentWin / row.compositionPairs;
  }
  const rows = [...groups.values()].sort((a, b) => a.candidate.localeCompare(b.candidate) || a.wearer.localeCompare(b.wearer));
  const width = 1150, rowHeight = 31, top = 68, left = 300, plotWidth = 490, valuesX = 810, deltaX = 1015, height = top + rows.length * rowHeight + 45;
  const x = percent => left + plotWidth * percent / 100;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
    '<title id="title">Performance comparison win rates</title>',
    '<desc id="description">Equal-weighted baseline and treatment win rates by candidate and wearer, plus percentage-point difference.</desc>',
    '<rect width="100%" height="100%" fill="#0b1020"/>',
    '<text x="28" y="34" fill="#f5f7ff" font-size="20" font-family="system-ui,sans-serif" font-weight="700">Win rate before and after</text>',
    '<text x="28" y="53" fill="#aeb9ce" font-size="11" font-family="system-ui,sans-serif">Each row equally weights the reported scenario strata for that candidate and wearer.</text>'];
  for (const value of [0, 25, 50, 75, 100]) {
    const xpos = x(value);
    parts.push(`<line x1="${xpos}" y1="${top - 12}" x2="${xpos}" y2="${height - 30}" stroke="#27334a" stroke-width="1"/>`);
    parts.push(`<text x="${xpos}" y="${top - 20}" fill="#aeb9ce" font-size="11" text-anchor="middle" font-family="system-ui,sans-serif">${value}%</text>`);
  }
  rows.forEach((row, index) => {
    const cy = top + index * rowHeight;
    const before = row.before / row.n * 100, after = row.after / row.n * 100, delta = after - before;
    const color = delta >= 0 ? '#71ddb2' : '#ff8b8b';
    parts.push(`<text x="28" y="${cy + 4}" fill="#e8edf7" font-size="12" font-family="system-ui,sans-serif">${xmlEscape(row.candidate)} · ${xmlEscape(row.wearer)}</text>`);
    parts.push(`<line x1="${x(before)}" y1="${cy}" x2="${x(after)}" y2="${cy}" stroke="${color}" stroke-width="3"/>`);
    parts.push(`<circle cx="${x(before)}" cy="${cy}" r="5" fill="#f3bd66" stroke="#101728" stroke-width="1"/>`);
    parts.push(`<circle cx="${x(after)}" cy="${cy}" r="4" fill="#79baff" stroke="#101728" stroke-width="1"/>`);
    parts.push(`<text x="${valuesX}" y="${cy + 4}" fill="#d6deec" font-size="11" font-family="system-ui,sans-serif">${before.toFixed(1)}% → ${after.toFixed(1)}%</text>`);
    parts.push(`<text x="${deltaX}" y="${cy + 4}" fill="${color}" font-size="12" font-family="system-ui,sans-serif">${delta >= 0 ? '+' : ''}${delta.toFixed(2)} pp</text>`);
  });
  parts.push(`<circle cx="${left + 8}" cy="${height - 12}" r="5" fill="#f3bd66"/><text x="${left + 19}" y="${height - 8}" fill="#aeb9ce" font-size="11" font-family="system-ui,sans-serif">Before</text><circle cx="${left + 92}" cy="${height - 12}" r="4" fill="#79baff"/><text x="${left + 103}" y="${height - 8}" fill="#aeb9ce" font-size="11" font-family="system-ui,sans-serif">After</text><text x="${deltaX}" y="${height - 8}" fill="#aeb9ce" font-size="11" font-family="system-ui,sans-serif">Difference</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}
function makeCharacterScoreSvg(scoreRows) {
  const rows = scoreRows.slice().sort((a, b) => a.character.localeCompare(b.character));
  const width = 850, top = 68, rowHeight = 42, left = 175, plotWidth = 560, height = top + rows.length * rowHeight + 32;
  const x = score => left + plotWidth * score / 100;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
    '<title id="title">Character party win rates</title>',
    '<desc id="description">Balanced benchmark win rate for each character using its actual kit.</desc>',
    '<rect width="100%" height="100%" fill="#0b1020"/>',
    '<text x="24" y="32" fill="#f5f7ff" font-size="19" font-family="system-ui,sans-serif" font-weight="700">Character win rates with actual kits</text>'];
  for (const value of [0, 25, 50, 75, 100]) {
    const xpos = x(value);
    parts.push(`<line x1="${xpos}" y1="${top - 10}" x2="${xpos}" y2="${height - 20}" stroke="#27334a" stroke-width="1"/>`);
    parts.push(`<text x="${xpos}" y="${top - 17}" fill="#aeb9ce" font-size="11" text-anchor="middle" font-family="system-ui,sans-serif">${value}%</text>`);
  }
  rows.forEach((row, index) => {
    const cy = top + index * rowHeight, color = '#79baff';
    parts.push(`<text x="24" y="${cy + 5}" fill="#e8edf7" font-size="13" font-family="system-ui,sans-serif">${xmlEscape(row.character)}</text>`);
    parts.push(`<rect x="${left}" y="${cy - 9}" width="${Math.max(0, plotWidth * row.outcomeScore / 100)}" height="18" rx="5" fill="${color}" opacity=".85"/>`);
    parts.push(`<text x="${Math.min(width - 55, x(row.outcomeScore) + 8)}" y="${cy + 5}" fill="#d6deec" font-size="12" font-family="system-ui,sans-serif">${row.outcomeScore.toFixed(1)}%</text>`);
  });
  parts.push('</svg>');
  return parts.join('\n');
}
function parseArgs(args) {
  const options = { candidates: [], preset: 'balanced', runs: 10, seed: 1, output: 'Documentation/combat-simulator/performance-results.jsonl', limitScenarios: 100, maxActions: 2000, workers: Math.min(PRESET_WORKERS.balanced, DEFAULT_WORKERS), cacheCharacterPanels: true, compact: true, runeImpactReport: false, mechanicRating: false, policyProfile: DEFAULT_POLICY_PROFILE };
  let workersExplicit = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--preset') {
      const preset = args[++index];
      options.preset = preset;
      if (preset === 'quick') Object.assign(options, { runs: 5, limitScenarios: 50, compact: true });
      else if (preset === 'balanced') Object.assign(options, { runs: 10, limitScenarios: 100, compact: true });
      else if (preset === 'full') Object.assign(options, { runs: 15, limitScenarios: 150, compact: true });
      else fail(`Unknown preset ${preset}. Choose quick, balanced, or full.`);
      if (!workersExplicit) options.workers = Math.min(PRESET_WORKERS[preset], DEFAULT_WORKERS);
    }
    else if (arg === '--candidate') {
      const raw = args[++index];
      options.candidates.push(...candidateSpecs(raw));
      if (raw === 'all-rune-impact' || raw === 'all-rune-ratings') options.runeImpactReport = true;
      if (raw === 'all-characters' || raw.startsWith('character:') || raw.startsWith('character-overall:')) options.characterBenchmarkReport = true;
      if (['all-character-mechanics', 'all-actions', 'all-passives', 'all-effects', 'all-upgrade-effects'].includes(raw) || /^(upgrade|action|passive|effect):/.test(raw)) options.mechanicRating = true;
    }
    else if (arg === '--policy') {
      options.policyProfile = args[++index];
      if (options.policyProfile !== 'ensemble' && !POLICY_PROFILES.includes(options.policyProfile)) fail(`Unknown policy ${options.policyProfile}. Choose ensemble or ${POLICY_PROFILES.join(' or ')}.`);
    }
    else if (arg === '--character') options.character = args[++index];
    else if (arg === '--runs') options.runs = Number(args[++index]);
    else if (arg === '--seed') options.seed = Number(args[++index]);
    else if (arg === '--limit-scenarios') options.limitScenarios = Number(args[++index]);
    else if (arg === '--max-actions') options.maxActions = Number(args[++index]);
    else if (arg === '--workers') { options.workers = Number(args[++index]); workersExplicit = true; }
    else if (arg === '--no-character-cache') options.cacheCharacterPanels = false;
    else if (arg === '--output') options.output = path.resolve(args[++index]);
    else if (arg === '--compact') options.compact = true;
    else if (arg === '--include-trials') options.compact = false;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else fail(`Unknown option: ${arg}`);
  }
  if (!options.candidates.length && !options.help) {
    options.candidates = candidateSpecs('all-rune-impact');
    options.runeImpactReport = true;
  }
  if (options.character && !CHARACTER_IDS.includes(options.character)) fail(`Unknown character ${options.character}.`);
  assert(Number.isInteger(options.runs) && options.runs > 0, '--runs must be a positive integer.');
  assert(Number.isInteger(options.seed) && options.seed >= 0, '--seed must be a non-negative integer.');
  assert(Number.isInteger(options.limitScenarios) && options.limitScenarios >= 0, '--limit-scenarios must be zero (all) or a positive integer.');
  assert(Number.isInteger(options.maxActions) && options.maxActions > 0, '--max-actions must be a positive integer.');
  assert(Number.isInteger(options.workers) && options.workers >= 1 && options.workers <= 64, '--workers must be an integer from 1 to 64.');
  return options;
}
function help() {
  return `Two-Tone matched combat performance runner\n\nUsage: node tools/combat-performance.mjs [options]\n\nOptions:\n  --preset quick|balanced|full  Select a coverage/run-count preset (default balanced)\n  --candidate all-characters|all-rune-impact|all-rune-ratings|all-runes|all-weapons\n  --candidate all-actions|all-passives|all-effects|all-character-mechanics|all-upgrade-effects\n  --candidate rune:<id>|character:<id>|passive:<character>/<id>\n  --candidate effect:<stable-effect-id>|upgrade:<effect-id>\n  --candidate weapon:standard@P1L1|weapon:premium@P1L50\n  --candidate action:<character>/basic|skill|ultimate\n  --policy ensemble|basic-focused-v1|skill-focused-v1|mixed-v1 (default ensemble)\n  --character <id>           Restrict item tests to this eligible wearer\n  --runs <n>                  Matched seeds per matchup\n  --seed <n>                  First reproducible seed (default 1)\n  --limit-scenarios <n>       Per-character panel cap; use 0 for exhaustive panels\n  --workers <n>               Concurrent battles; preset defaults quick/balanced/full to 1/2/3, capped by available parallelism\n  --no-character-cache        Disable exact battle reuse across character panels\n  --max-actions <n>           Maximum unit actions in one battle (default 2000)\n  --output <path>             JSONL result path\n  --include-trials            Include per-seed details (larger output)\n\nThe roster is read from authored combat definitions. Character studies use four-ally parties, all enemy counts and class bands, and Easy/Normal/Hard difficulty. Enemy HP, Attack, defenses, and Speed use one uniform Level 1 stat multiplier (0.75×/1×/1.5×), rounded to 0.25; mechanics stay unchanged. Quick samples all 45 enemy-count/class/difficulty strata with up to 50 scenarios and 5 seeds; balanced uses up to 100 scenarios and 10 seeds; full uses up to 150 scenarios and 15 seeds. Basic/Skill action probabilities are 75/25, 25/75, and 50/50 for Basic-focused, Skill-focused, and Mixed policies. Whenever an ally has a ready Ultimate, each scheduled combat turn independently rolls a 75% activation chance; that Ultimate does not consume the actor's normal action. The final rating weights policies 25/25/50 and Easy/Normal/Hard 25/50/25. Per-policy scores are also reported.`;
}
function enemyLineupGroups(enemyTeams, library) {
  const groups = new Map();
  for (const lineup of enemyTeams) {
    const key = `${lineup.length}|${enemyClassBand(lineup, library)}`;
    const group = groups.get(key) || new Map();
    const composition = lineup.slice().sort().join('+');
    const orders = group.get(composition) || [];
    orders.push(lineup); group.set(composition, orders); groups.set(key, group);
  }
  return groups;
}
function* scenarioSamples(allyLists, enemyTeams, limit, library) {
  const groupMap = enemyLineupGroups(enemyTeams, library);
  const groups = [...groupMap.entries()].map(([key, compositions]) => ({ key,
    count: Number(key.split('|')[0]), band: key.split('|')[1],
    compositions: [...compositions.entries()].sort(([a], [b]) => a.localeCompare(b)) }));
  if (!limit) {
    for (const party of allyLists) for (const group of groups) for (const [,orders] of group.compositions)
      for (const enemies of orders) for (const difficulty of ENEMY_DIFFICULTIES)
        yield { party, enemies, difficulty, enemyClassMix: enemyClassMix(enemies, library), enemyClassBand: enemyClassBand(enemies, library) };
    return;
  }
  const strata = [];
  for (let enemyCount = 1; enemyCount <= 5; enemyCount++)
    for (const band of ['common_only', 'elite_present', 'boss_present']) {
      const group = groups.find(row => row.count === enemyCount && row.band === band);
      if (group) for (const difficulty of ENEMY_DIFFICULTIES) strata.push({ group, difficulty });
    }
  const count = Math.min(limit, allyLists.length * strata.length);
  const selectedStrata = count < strata.length
    ? Array.from({ length: count }, (_, index) => Math.floor((index + .5) * strata.length / count))
    : strata.map((_, index) => index);
  const extraCount = Math.max(0, count - strata.length);
  const perStratum = strata.length ? Math.floor(extraCount / strata.length) : 0;
  const remainder = strata.length ? extraCount % strata.length : 0;
  for (const index of selectedStrata) {
    const stratum = strata[index], group = stratum.group, compositions = group.compositions;
    const difficultyIndex = ENEMY_DIFFICULTIES.indexOf(stratum.difficulty);
    const quota = count < strata.length ? 1 : 1 + perStratum + (index < remainder ? 1 : 0);
    for (let sample = 0; sample < quota; sample++) {
      const partyIndex = (index * 13 + sample * 7) % allyLists.length;
      // Spread the three difficulty levels across distinct enemy identities/compositions,
      // then rotate formation order so Blast layouts also receive coverage.
      const compositionIndex = compositions.length <= ENEMY_DIFFICULTIES.length
        ? (difficultyIndex + sample) % compositions.length
        : Math.floor(((difficultyIndex + sample + 0.5) % ENEMY_DIFFICULTIES.length) * compositions.length / ENEMY_DIFFICULTIES.length);
      const [composition, orders] = compositions[compositionIndex];
      const order = orders[(sample + difficultyIndex + group.count) % orders.length];
      yield { party: allyLists[partyIndex], enemies: order, difficulty: stratum.difficulty,
        enemyClassMix: enemyClassMix(order, library), enemyClassBand: enemyClassBand(order, library), enemyComposition: composition };
    }
  }
}
function* candidateScenarioSamples(allyLists, enemyTeams, limit, library, anchors) {
  for (const anchor of anchors) {
    const candidateTeams = anchor ? allyLists.filter(party => party.includes(anchor)) : allyLists;
    for (const sample of scenarioSamples(candidateTeams, enemyTeams, limit, library))
      yield { ...sample, focalCharacter: anchor };
  }
}
function buildRuneImpactRows(samples, runCount) {
  // Rune performance uses the same direct, paired battle counterfactual as all
  // other components. The wearer detail is primary; no synthetic stat score.
  const { overallRows: wearerRows } = buildMechanicRatingRows(samples, runCount);
  const groups = new Map();
  for (const row of wearerRows) {
    const rune = row.candidate.slice('rune:'.length);
    const rows = groups.get(rune) || [];
    rows.push(row);
    groups.set(rune, rows);
  }
  const overallRows = [...groups].map(([rune, rows]) => ({
    rune,
    eligibleWearers: rows.map(row => row.wearer).sort().join(';'),
    wearerCount: rows.length,
    outcomeRating: average(rows.map(row => row.outcomeRating)),
    controlOutcomeRating: average(rows.map(row => row.controlOutcomeRating)),
    ratingDifference: average(rows.map(row => row.ratingDifference)),
    winLiftPp: average(rows.map(row => row.winLiftPp)),
    meanBAE: average(rows.map(row => row.meanBAE)),
    meanHpSwing: average(rows.map(row => row.meanBAE * BAE_REFERENCE_HP)),
    outcomeAssessment: rows.some(row => row.outcomeAssessment === 'positive evidence')
      ? 'positive for at least one eligible wearer'
      : rows.every(row => row.outcomeAssessment === 'negative evidence') ? 'negative for all eligible wearers' : 'inconclusive or wearer-dependent'
  }));
  const byRuneWearer = new Map(wearerRows.map(row => [`${row.candidate.slice('rune:'.length)}|${row.wearer}`, row]));
  const completeWearerRows = RUNES.flatMap(rune => CHARACTER_IDS.map(wearer => {
    const row = byRuneWearer.get(`${rune}|${wearer}`);
    if (row) return { ...row, eligibility: 'eligible', ratingScope: 'four-ally battle outcome while wearer is present' };
    const eligible = isRuneEligible(rune, wearer);
    return { candidate: `rune:${rune}`, wearer, eligibility: eligible ? 'not sampled' : 'ineligible',
      ratingScope: 'four-ally battle outcome while wearer is present', outcomeRating: null, controlOutcomeRating: null,
      ratingDifference: null, winLiftPp: null, meanBAE: null, eventEvidence: null, outcomeAssessment: 'N/A' };
  }));
  const completeOverallRows = RUNES.map(rune => overallRows.find(row => row.rune === rune) || ({ rune, eligibleWearers: '', wearerCount: 0,
    outcomeRating: null, controlOutcomeRating: null, ratingDifference: null, winLiftPp: null, meanBAE: null, meanHpSwing: null,
    outcomeAssessment: 'no eligible comparisons' }));
  return { overallRows: completeOverallRows, wearerRows: completeWearerRows };
}
function buildMechanicRatingRows(samples, runCount) {
  const candidates = new Map();
  for (const sample of samples) {
    const candidateRows = candidates.get(sample.candidate) || { metadata: sample, wearers: new Map() };
    candidates.set(sample.candidate, candidateRows);
    const strata = candidateRows.wearers.get(sample.wearer) || new Map();
    candidateRows.wearers.set(sample.wearer, strata);
    const stratum = [sample.difficulty, sample.allyCount, sample.enemyCount, sample.enemyCategory].join('|');
    const compositions = strata.get(stratum) || new Map();
    strata.set(stratum, compositions);
    const composition = `${sample.partyComposition}|${sample.enemyComposition}`;
    const formations = compositions.get(composition) || [];
    formations.push(sample);
    compositions.set(composition, formations);
  }

  const meanFinite = values => {
    const finite = values.filter(Number.isFinite);
    return finite.length ? average(finite) : null;
  };
  const meanFiniteCI = (values, asPercent = false) => {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return { mean: null, lower: null, upper: null };
    return asPercent ? percentCI(finite) : meanCI(finite);
  };
  const meanFiniteRatingCI = values => {
    const finite = values.filter(Number.isFinite);
    return finite.length ? boundedRatingCI(finite) : { mean: null, lower: null, upper: null };
  };
  const aggregateRows = [];
  for (const [candidate, entry] of candidates) for (const [wearer, strata] of entry.wearers) {
    const metadata = entry.metadata, isAction = metadata.componentType === 'action';
    const fields = ['battleWin', 'battleBae', 'useWin', 'useBae', 'battleControlRating', 'battleTreatmentRating', 'battleRatingDelta', 'useControlRating', 'useTreatmentRating', 'useRatingDelta'];
    const stratumRows = [];
    let executedCount = 0, opportunityCount = 0;
    const statusCounts = {};
    const evidence = new Map();

    for (const [stratum, compositions] of strata) {
      const compositionRows = [];
      for (const formations of compositions.values()) {
        const values = Object.fromEntries(fields.map(field => [field, Array(runCount).fill(null)]));
        let activationSum = 0, activationOpportunities = 0;
        for (const formation of formations) for (const [tag, observed] of Object.entries(formation.eventObserved || {})) {
          const row = evidence.get(tag) || { observed: 0, comparisons: 0 };
          row.comparisons++;
          if (observed) row.observed++;
          evidence.set(tag, row);
        }
        for (let seedIndex = 0; seedIndex < runCount; seedIndex++) {
          const executedForms = formations.filter(formation => (formation.actionStatuses?.[seedIndex] || null) === 'executed');
          for (const formation of formations) {
            const status = formation.actionStatuses?.[seedIndex] || null;
            if (isAction) {
              activationOpportunities++;
              opportunityCount++;
              statusCounts[status || 'missing_status'] = (statusCounts[status || 'missing_status'] || 0) + 1;
              const executed = status === 'executed';
              if (executed) { activationSum++; executedCount++; }
            }
          }
          const policyMean = (rows, field) => weightedMean(rows, row => row[field][seedIndex], row => POLICY_WEIGHTS.get(row.policyProfile) ?? 1);
          values.battleWin[seedIndex] = policyMean(formations, 'winDeltas');
          values.battleBae[seedIndex] = policyMean(formations, 'baeValues');
          values.battleControlRating[seedIndex] = policyMean(formations, 'controlRatings');
          values.battleTreatmentRating[seedIndex] = policyMean(formations, 'treatmentRatings');
          values.battleRatingDelta[seedIndex] = policyMean(formations, 'ratingDeltas');
          values.useWin[seedIndex] = policyMean(isAction ? executedForms : formations, 'winDeltas');
          values.useBae[seedIndex] = policyMean(isAction ? executedForms : formations, 'baeValues');
          values.useControlRating[seedIndex] = policyMean(isAction ? executedForms : formations, 'controlRatings');
          values.useTreatmentRating[seedIndex] = policyMean(isAction ? executedForms : formations, 'treatmentRatings');
          values.useRatingDelta[seedIndex] = policyMean(isAction ? executedForms : formations, 'ratingDeltas');
        }
        compositionRows.push({ values, activationRate: activationOpportunities ? activationSum / activationOpportunities : null });
      }
      const weighted = Object.fromEntries(fields.map(field => [field, Array.from({ length: runCount }, (_, i) => meanFinite(compositionRows.map(row => row.values[field][i])))]));
      stratumRows.push({ stratum, values: weighted,
        activationRate: meanFinite(compositionRows.map(row => row.activationRate)), compositionCount: compositionRows.length,
        onUseCompositionCount: compositionRows.filter(row => row.values.useWin.some(Number.isFinite)).length });
    }

    const strataByBand = new Map();
    for (const row of stratumRows) {
      const [difficulty, , enemyCount, enemyCategory] = row.stratum.split('|');
      const counts = strataByBand.get(enemyCategory) || new Map();
      const difficulties = counts.get(enemyCount) || [];
      difficulties.push({ ...row, difficulty }); counts.set(enemyCount, difficulties); strataByBand.set(enemyCategory, counts);
    }
    const perSeed = Object.fromEntries(fields.map(field => {
      const scores = Array.from({ length: runCount }, (_, seedIndex) => {
        const bandScores = [...strataByBand.values()].map(counts => {
          const enemyCountScores = [...counts.values()].map(difficultyRows => weightedMean(
            difficultyRows,
            row => row.values[field][seedIndex],
            row => ENEMY_DIFFICULTIES.find(item => item.id === row.difficulty)?.ratingWeight ?? 1
          ));
          return meanFinite(enemyCountScores);
        });
        return meanFinite(bandScores);
      });
      return [field, scores];
    }));
    const primaryWin = isAction ? perSeed.useWin : perSeed.battleWin;
    const primaryBae = isAction ? perSeed.useBae : perSeed.battleBae;
    const primaryControlRating = isAction ? perSeed.useControlRating : perSeed.battleControlRating;
    const primaryTreatmentRating = isAction ? perSeed.useTreatmentRating : perSeed.battleTreatmentRating;
    const primaryRatingDelta = isAction ? perSeed.useRatingDelta : perSeed.battleRatingDelta;
    const winCI = meanFiniteCI(primaryWin, true);
    const baeCI = meanFiniteCI(primaryBae);
    const ratingCI = meanFiniteRatingCI(primaryTreatmentRating);
    const controlRatingCI = meanFiniteRatingCI(primaryControlRating);
    const ratingDeltaCI = meanFiniteCI(primaryRatingDelta);
    const realizedWinCI = meanFiniteCI(perSeed.battleWin, true);
    const realizedBaeCI = meanFiniteCI(perSeed.battleBae);
    const realizedRatingCI = meanFiniteRatingCI(perSeed.battleTreatmentRating);
    const realizedControlRatingCI = meanFiniteRatingCI(perSeed.battleControlRating);
    const realizedRatingDeltaCI = meanFiniteCI(perSeed.battleRatingDelta);
    const executionRate = isAction ? meanFinite(stratumRows.map(row => row.activationRate)) : null;
    const activationRatePct = Number.isFinite(executionRate) ? executionRate * 100 : null;
    const assessment = !Number.isFinite(winCI.mean) ? 'no eligible comparisons'
      : 'seed-only interval; scenario uncertainty not included';
    const eventEvidence = [...evidence].sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, counts]) => `${tag}:${counts.observed}/${counts.comparisons}`).join(';');
    const base = {
      candidate, wearer, componentType: metadata.componentType,
      comparisonReference: metadata.comparisonReference || null,
      comparisonScope: isAction ? 'per executed action; realized impact also shown' : 'full battle counterfactual',
      mechanicTags: metadata.mechanicTags, measurementPlan: metadata.measurementPlan,
      eventEvidence, requiredCoverage: metadata.requiredCoverage,
      strata: stratumRows.length,
      sampledCompositions: stratumRows.reduce((sum, row) => sum + row.compositionCount, 0),
      outcomeRating: ratingCI.mean, outcomeRating95Lower: ratingCI.lower, outcomeRating95Upper: ratingCI.upper,
      controlOutcomeRating: controlRatingCI.mean, ratingDifference: ratingDeltaCI.mean,
      ratingDifference95Lower: ratingDeltaCI.lower, ratingDifference95Upper: ratingDeltaCI.upper,
      realizedOutcomeRating: realizedRatingCI.mean, realizedControlOutcomeRating: realizedControlRatingCI.mean,
      realizedRatingDifference: realizedRatingDeltaCI.mean,
      winLiftPp: winCI.mean, winLift95LowerPp: winCI.lower, winLift95UpperPp: winCI.upper,
      meanBAE: baeCI.mean, bae95Lower: baeCI.lower, bae95Upper: baeCI.upper,
      realizedWinLiftPp: realizedWinCI.mean, realizedWin95LowerPp: realizedWinCI.lower, realizedWin95UpperPp: realizedWinCI.upper,
      realizedMeanBAE: realizedBaeCI.mean, realizedBAE95Lower: realizedBaeCI.lower, realizedBAE95Upper: realizedBaeCI.upper,
      outcomeAssessment: assessment,
      executionRatePct: activationRatePct,
      executedComparisons: isAction ? executedCount : null,
      actionOpportunities: isAction ? opportunityCount : null,
      executionStatuses: isAction ? JSON.stringify(statusCounts) : null
    };
    aggregateRows.push(base);
  }
  return { overallRows: aggregateRows, wearerRows: aggregateRows };
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(help()); return; }
  const library = archetypeLibrary();
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  const out = fs.createWriteStream(options.output, { flags: 'w' });
  let scenarios = 0, comparisons = 0;
  const accumulated = new Map();
  const ratingSamples = [];
  const allyTeams = orderedUniqueTeams(CHARACTER_IDS, BENCHMARK_PARTY_SIZE, BENCHMARK_PARTY_SIZE);
  const enemyTeams = [...enemyLineups(ENEMY_IDS, 5)];
  const allAllyLists = [...allyTeams];
  const scaledArchetypes = new Map();
  const activePolicies = options.policyProfile === 'ensemble' ? POLICY_PROFILES : [options.policyProfile];
  const characterStudies = options.characterBenchmarkReport || options.mechanicRating || options.runeImpactReport;
  const anchors = options.character ? [options.character] : options.runeImpactReport ? CHARACTER_IDS
    : characterStudies
    ? [...new Set(options.candidates.map(spec => spec.character || (spec.type === 'character' ? spec.id : null)).filter(Boolean))].sort()
    : [null];
  const anchorMatrixCounts = anchors.map(anchor => (anchor ? allAllyLists.filter(party => party.includes(anchor)).length : allAllyLists.length)
    * enemyTeams.length * ENEMY_DIFFICULTIES.length);
  const targetScenarios = anchorMatrixCounts.reduce((sum, count) => sum + (options.limitScenarios ? Math.min(options.limitScenarios, count) : count), 0) * activePolicies.length;
  console.log(`Scenario universe: ${anchorMatrixCounts.reduce((sum, count) => sum + count, 0).toLocaleString()} anchored cells; selected ${targetScenarios.toLocaleString()} policy-scenario cells across ${activePolicies.length} policy profile(s); ${options.runs} matched runs per comparison.`);
  const progressEvery = Math.max(1, Math.ceil(targetScenarios / 20));
  const sampledScenarioCoverage = new Map();
  const characterPanelCache = new Map();
  let characterPanelCacheHits = 0, characterPanelCacheMisses = 0;
  const simulationPool = new SimulationWorkerPool(options.workers);
  console.log(`Battle simulation workers: ${options.workers}`);
  try {
  for (const policyProfile of activePolicies) {
  characterPanelCache.clear();
  let policyScenarioIndex = 0;
  for (const { party, enemies, difficulty, enemyClassMix: sampledEnemyClassMix, enemyClassBand: sampledEnemyClassBand, focalCharacter } of candidateScenarioSamples(allAllyLists, enemyTeams, options.limitScenarios, library, anchors)) {
      scenarios++; policyScenarioIndex++;
      for (const [dimension, value] of Object.entries({ partySize: party.length, enemyCount: enemies.length,
        enemyArchetype: [...new Set(enemies)], enemyClassBand: sampledEnemyClassBand, enemyClassMix: sampledEnemyClassMix, difficulty: difficulty.id, policy: policyProfile,
        benchmarkStratum: `${party.length}|${enemies.length}|${sampledEnemyClassBand}|${difficulty.id}` })) {
        const values = sampledScenarioCoverage.get(dimension) || new Map();
        for (const category of (Array.isArray(value) ? value : [value])) values.set(String(category), (values.get(String(category)) || 0) + 1);
        sampledScenarioCoverage.set(dimension, values);
      }
      const base = makeBaseConfig(library, party, enemies, difficulty, scaledArchetypes);
      base.settings.policyProfile = policyProfile;
      const neutralControlConfigs = new Map(), neutralControlResults = new Map();
      for (const spec of options.candidates) {
        const boundCharacter = spec.character || (spec.type === 'character' ? spec.id : null);
        if (focalCharacter && boundCharacter && boundCharacter !== focalCharacter) continue;
        const wearers = wearersFor(spec, party).filter(wearer => (!options.character || wearer === options.character)
          && (!focalCharacter || wearer === focalCharacter));
        for (const wearer of wearers) {
          let controlConfig, treatmentConfig;
          if (spec.type === 'rune') {
            controlConfig = neutralControlConfigs.get(wearer);
            if (!controlConfig) {
              controlConfig = makeRuneBranch(base, wearer, null);
              neutralControlConfigs.set(wearer, controlConfig);
            }
            treatmentConfig = makeRuneBranch(base, wearer, spec.id);
          } else {
            ({ control: controlConfig, treatment: treatmentConfig } = makeBranches(base, spec, wearer));
          }
          const trials = [];
          const effectTargets = selectedAllyTargetIds(spec, base);
          const effectTargetCoverage = Object.fromEntries(effectTargets.map(id => [id, 0]));
          let controlRuns = neutralControlResults.get(wearer);
          const shouldCacheControl = spec.type === 'rune' && !controlRuns;
          if (shouldCacheControl) controlRuns = [];
          const actualCharacterGauge = spec.type === 'character-overall';
          const batchCount = Math.min(options.workers, options.runs);
          const workerBatches = Array.from({ length: batchCount }, () => []);
          const cachedControls = [];
          const cachedTrials = [], characterCacheKeys = [];
          for (let run = 0; run < options.runs; run++) {
            const seed = options.seed + run;
            let runControlConfig = controlConfig, runTreatmentConfig = treatmentConfig;
            if (effectTargets.length) {
              const targetId = effectTargets[(run + policyScenarioIndex - 1) % effectTargets.length];
              if (controlConfig) { runControlConfig = structuredClone(controlConfig); runControlConfig.settings.actionOverride.targetId = targetId; }
              runTreatmentConfig = structuredClone(treatmentConfig); runTreatmentConfig.settings.actionOverride.targetId = targetId;
              effectTargetCoverage[targetId]++;
            }
            cachedControls[run] = actualCharacterGauge ? null : controlRuns?.[run] || null;
            if (actualCharacterGauge && options.cacheCharacterPanels) {
              const cacheKey = characterPanelCacheKey(runTreatmentConfig, seed, options.maxActions);
              characterCacheKeys[run] = cacheKey;
              const cachedTrial = characterPanelCache.get(cacheKey);
              if (cachedTrial) {
                cachedTrials[run] = cachedTrial;
                characterPanelCacheHits++;
                continue;
              }
              characterPanelCacheMisses++;
            }
            const needsControl = !actualCharacterGauge && !cachedControls[run];
            workerBatches[run % batchCount].push({ run, seed, configs: [needsControl ? runControlConfig : null, runTreatmentConfig] });
          }
          const batchResults = await Promise.all(workerBatches.map(jobs => jobs.length ? simulationPool.runBatch(jobs, options.maxActions) : Promise.resolve([])));
          for (let batchIndex = 0; batchIndex < workerBatches.length; batchIndex++) {
            for (let index = 0; index < workerBatches[batchIndex].length; index++) {
              const job = workerBatches[batchIndex][index], run = job.run;
              const [controlResult, treatmentResult] = batchResults[batchIndex][index];
              const resolvedControl = cachedControls[run] || controlResult;
              if (shouldCacheControl) controlRuns[run] = resolvedControl;
              trials[run] = battleMetrics(resolvedControl, treatmentResult, job.seed);
              if (actualCharacterGauge && options.cacheCharacterPanels) characterPanelCache.set(characterCacheKeys[run], trials[run]);
            }
          }
          for (let run = 0; run < options.runs; run++) if (cachedTrials[run]) trials[run] = cachedTrials[run];
          if (shouldCacheControl) neutralControlResults.set(wearer, controlRuns);
          const winsControl = actualCharacterGauge ? null : trials.reduce((sum, trial) => sum + trial.controlWin, 0);
          const winsTreatment = trials.reduce((sum, trial) => sum + trial.treatmentWin, 0);
          const mechanicEvaluation = evaluationPlan(spec);
          const comparisonReference = comparisonReferenceFor(spec, base.archetypes[wearer]);
          const tagMeasurements = actualCharacterGauge
            ? summarizeMechanicEventObservations(trials, mechanicEvaluation)
            : summarizeMechanicEventDeltas(trials, mechanicEvaluation,
              trials.reduce((sum, trial) => sum + trial.mechanicEventCapture.controlDropped, 0),
              trials.reduce((sum, trial) => sum + trial.mechanicEventCapture.treatmentDropped, 0));
          const actualImpact = actualCharacterGauge
            ? Object.fromEntries(Object.keys(trials[0]?.actualImpact || {}).map(key => [key, meanCI(trials.map(row => row.actualImpact[key]))]))
            : null;
          const winRate = actualCharacterGauge ? {
            treatment: winsTreatment / options.runs * 100,
            treatment95CI: percentCI(trials.map(row => row.treatmentWin)),
            treatmentTimeoutRatePct: average(trials.map(row => row.treatmentTimeout)) * 100
          } : {
            control: winsControl / options.runs * 100, treatment: winsTreatment / options.runs * 100,
            control95CI: percentCI(trials.map(row => row.controlWin)), treatment95CI: percentCI(trials.map(row => row.treatmentWin)),
            controlTimeoutRatePct: average(trials.map(row => row.controlTimeout)) * 100,
            treatmentTimeoutRatePct: average(trials.map(row => row.treatmentTimeout)) * 100,
            differencePercentagePoints: average(trials.map(row => row.winDelta)) * 100,
            paired95CI: percentCI(trials.map(row => row.winDelta))
          };
          const outcomeRating = actualCharacterGauge ? {
            treatment: average(trials.map(row => row.treatmentRating)),
            treatment95CI: boundedRatingCI(trials.map(row => row.treatmentRating))
          } : {
            control: average(trials.map(row => row.controlRating)), treatment: average(trials.map(row => row.treatmentRating)),
            control95CI: boundedRatingCI(trials.map(row => row.controlRating)), treatment95CI: boundedRatingCI(trials.map(row => row.treatmentRating)),
            difference: average(trials.map(row => row.treatmentRating - row.controlRating)),
            paired95CI: meanCI(trials.map(row => row.treatmentRating - row.controlRating))
          };
          const summary = {
            candidate: candidateLabel(spec),
            wearer, party, enemies,
            comparisonReference,
            performanceStandard: { baseStats: COMBAT_PERFORMANCE_STANDARD.baseStats, resources: COMBAT_RESOURCE_STANDARD,
              damageMultipliers: COMBAT_PERFORMANCE_STANDARD.damageMultipliers, baeReferenceHp: BAE_REFERENCE_HP },
            enemyCategories: [...new Set(enemies.map(id => library[id].tags?.type || 'unknown'))].sort(),
            enemyClassMix: sampledEnemyClassMix, enemyClassBand: sampledEnemyClassBand, policyProfile,
            benchmarkEnemyScaling: base.settings.benchmarkEnemyScaling,
            difficulty: difficulty.id, enemyStatMultiplier: difficulty.statMultiplier, runs: options.runs, seed: options.seed,
            mechanicEvaluation,
            tagMeasurements,
            winRate, outcomeRating,
            hpSwing: actualCharacterGauge ? null : meanCI(trials.map(row => row.hpSwing)),
            bae: actualCharacterGauge ? null : meanCI(trials.map(row => row.bae)),
            impact: actualCharacterGauge ? actualImpact : Object.fromEntries(Object.keys(trials[0]?.impact || {}).map(key => [key, meanCI(trials.map(row => row.impact[key]))])),
            averageDamage: { control: actualCharacterGauge ? null : average(trials.map(row => row.controlDamage)), treatment: average(trials.map(row => row.treatmentDamage)) },
            averageAllyHpRetained: { control: actualCharacterGauge ? null : average(trials.map(row => row.control.finalHp.allies)), treatment: average(trials.map(row => row.treatment.finalHp.allies)) },
            averageShieldAbsorbed: { control: actualCharacterGauge ? null : average(trials.map(row => row.control.shields)), treatment: average(trials.map(row => row.treatment.shields)) },
            averageTurns: { alliesControl: actualCharacterGauge ? null : average(trials.map(row => row.control.allyTurns)), alliesTreatment: average(trials.map(row => row.treatment.allyTurns)), enemiesControl: actualCharacterGauge ? null : average(trials.map(row => row.control.enemyTurns)), enemiesTreatment: average(trials.map(row => row.treatment.enemyTurns)) },
            actionOverride: trials.find(row => row.treatment.actionOverride)?.treatment.actionOverride || null,
            supportTargetCoverage: effectTargetCoverage,
            runeDiagnostics: { averageActivations: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeActivations || 0)), averageEnergyRestored: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeEnergyRestored || 0)) },
            trials
          };
          if (options.compact) delete summary.trials;
          else summary.trials = trials.map(({ mechanicEventDeltas, treatmentMechanicEvents, ...trial }) => ({ ...trial, mechanicEventDeltas: Object.values(mechanicEventDeltas).filter(row => mechanicEvaluation.tags.includes(row.tag)) }));
          out.write(JSON.stringify(summary) + '\n');
          comparisons++;
          if ((options.runeImpactReport && spec.type === 'rune') ||
              (options.characterBenchmarkReport && spec.type === 'character-overall') ||
              (options.mechanicRating && ['passive', 'action', 'effect', 'character-overall', 'upgrade'].includes(spec.type))) ratingSamples.push({
            candidate: candidateLabel(spec), wearer, scenarioId: scenarios,
            comparisonReference,
            policyProfile, difficulty: difficulty.id, enemyStatMultiplier: difficulty.statMultiplier, partyComposition: party.slice().sort().join('+'),
            enemyComposition: enemies.slice().sort().join('+'), allyCount: party.length,
            enemyCount: enemies.length, enemyCategory: sampledEnemyClassBand,
            componentType: spec.type,
              winDeltas: trials.map(trial => trial.winDelta), baeValues: trials.map(trial => trial.bae),
              controlRatings: trials.map(trial => trial.controlRating), treatmentRatings: trials.map(trial => trial.treatmentRating),
              ratingDeltas: trials.map(trial => trial.controlRating === null ? null : trial.treatmentRating - trial.controlRating),
            actionStatuses: spec.type === 'action' ? trials.map(trial => trial.treatment.actionOverride?.status || 'missing_status') : null,
            eventObserved: Object.fromEntries(tagMeasurements.map(entry => [entry.tag, entry.evidenceStatus === 'event_observed'])),
            mechanicTags: mechanicEvaluation.tags.join(';'), measurementPlan: measurementPlanLabel(mechanicEvaluation),
            requiredCoverage: [...new Set(mechanicEvaluation.byTag.map(entry => entry.coverage))].join(';'),
            unobservedTags: tagMeasurements.filter(entry => entry.evidenceStatus !== 'event_observed').map(entry => entry.tag).join(';')
          });
          if (!actualCharacterGauge) {
            const partyComposition = party.slice().sort().join('+');
            const enemyComposition = enemies.slice().sort().join('+');
            const key = `${summary.candidate}|${wearer}|${difficulty.id}|${partyComposition}|${enemyComposition}`;
            if (!accumulated.has(key)) accumulated.set(key, { candidate: summary.candidate, wearer, mechanicTags: mechanicEvaluation.tags.join(';'), measurementPlan: measurementPlanLabel(mechanicEvaluation), unobservedTags: tagMeasurements.filter(entry => entry.evidenceStatus !== 'event_observed').map(entry => entry.tag).join(';'), requiredCoverage: [...new Set(mechanicEvaluation.byTag.map(entry => entry.coverage))].join(';'), difficulty: difficulty.id, enemyStatMultiplier: difficulty.statMultiplier, partyComposition, enemyComposition, enemyCategory: summary.enemyCategories.join('+'), allyCount: party.length, enemyCount: enemies.length, formations: 0, controlWin: 0, treatmentWin: 0, controlTimeout: 0, treatmentTimeout: 0, controlRating: 0, treatmentRating: 0, ratingDelta: 0, winDelta: 0, hpSwing: 0, bae: 0, impact: {} });
            const aggregate = accumulated.get(key); aggregate.formations++; aggregate.controlWin += summary.winRate.control / 100; aggregate.treatmentWin += summary.winRate.treatment / 100; aggregate.controlTimeout += summary.winRate.controlTimeoutRatePct / 100; aggregate.treatmentTimeout += summary.winRate.treatmentTimeoutRatePct / 100; aggregate.controlRating += summary.outcomeRating.control; aggregate.treatmentRating += summary.outcomeRating.treatment; aggregate.ratingDelta += summary.outcomeRating.difference; aggregate.winDelta += summary.winRate.differencePercentagePoints; aggregate.hpSwing += summary.hpSwing.mean; aggregate.bae += summary.bae.mean;
            for (const [metric, estimate] of Object.entries(summary.impact)) aggregate.impact[metric] = (aggregate.impact[metric] || 0) + estimate.mean;
          }
        }
      }
      if (scenarios % progressEvery === 0 || scenarios === targetScenarios)
        console.log(`Progress: ${scenarios.toLocaleString()}/${targetScenarios.toLocaleString()} scenario-policy cells; ${comparisons.toLocaleString()} candidate/wearer simulations.`);
  }
  }
  } finally {
    await simulationPool.close();
  }
  if (options.cacheCharacterPanels && options.characterBenchmarkReport)
    console.log(`Character-panel simulation cache: ${characterPanelCacheHits.toLocaleString()} cached trial reuses, ${characterPanelCacheMisses.toLocaleString()} new battle simulations across all policies (cache resets per policy).`);
  await new Promise((resolve, reject) => out.end(error => error ? reject(error) : resolve()));
  const summaryFile = options.output.replace(/\.jsonl$/i, '') + '-summary.csv';
  const expectedBenchmarkStrata = [];
  for (const partySize of [BENCHMARK_PARTY_SIZE]) for (const enemyCount of [1, 2, 3, 4, 5])
    for (const enemyBand of ['common_only', 'elite_present', 'boss_present'])
      for (const difficulty of ENEMY_DIFFICULTIES)
        expectedBenchmarkStrata.push(`${partySize}|${enemyCount}|${enemyBand}|${difficulty.id}`);
  writeBenchmarkArtifacts(options.output, ratingSamples, sampledScenarioCoverage, expectedBenchmarkStrata, options, scenarios, comparisons);
  const compositionMeans = [...accumulated.values()].map(row => ({ ...row,
    controlWin: row.controlWin / row.formations, treatmentWin: row.treatmentWin / row.formations, controlTimeout: row.controlTimeout / row.formations, treatmentTimeout: row.treatmentTimeout / row.formations,
    controlRating: row.controlRating / row.formations, treatmentRating: row.treatmentRating / row.formations, ratingDelta: row.ratingDelta / row.formations,
    winDelta: row.winDelta / row.formations, hpSwing: row.hpSwing / row.formations, bae: row.bae / row.formations,
    impact: Object.fromEntries(Object.entries(row.impact).map(([metric, value]) => [metric, value / row.formations])) }));
  const strata = new Map();
  for (const row of compositionMeans) {
    const key = `${row.candidate}|${row.wearer}|${row.difficulty}|${row.allyCount}|${row.enemyCount}|${row.enemyCategory}`;
    if (!strata.has(key)) strata.set(key, { candidate: row.candidate, wearer: row.wearer, difficulty: row.difficulty, enemyStatMultiplier: row.enemyStatMultiplier, allyCount: row.allyCount, enemyCount: row.enemyCount, enemyCategory: row.enemyCategory, compositionPairs: 0, controlWin: 0, treatmentWin: 0, controlTimeout: 0, treatmentTimeout: 0, controlRating: 0, treatmentRating: 0, ratingDelta: 0, winDelta: 0, hpSwing: 0, bae: 0, impact: {} });
    const aggregate = strata.get(key); aggregate.compositionPairs++; aggregate.controlWin += row.controlWin; aggregate.treatmentWin += row.treatmentWin; aggregate.controlTimeout += row.controlTimeout; aggregate.treatmentTimeout += row.treatmentTimeout; aggregate.controlRating += row.controlRating; aggregate.treatmentRating += row.treatmentRating; aggregate.ratingDelta += row.ratingDelta; aggregate.winDelta += row.winDelta; aggregate.hpSwing += row.hpSwing; aggregate.bae += row.bae;
    for (const [metric, value] of Object.entries(row.impact)) aggregate.impact[metric] = (aggregate.impact[metric] || 0) + value;
  }
  const rows = [...strata.values()];
  if (rows.length) fs.writeFileSync(summaryFile, [
    'candidate,wearer,comparisonReference,mechanicTags,measurementPlan,unobservedTags,requiredCoverage,difficulty,enemyStatMultiplier,allyCount,enemyCount,enemyCategory,equallyWeightedCompositionPairs,outcomeRatingBefore,outcomeRatingAfter,outcomeRatingDifference,winRateBeforePct,winRateAfterPct,timeoutRateBeforePct,timeoutRateAfterPct,differencePercentagePoints,meanHpSwing,meanBAE,enemyHpRemovedDelta,allyHpRetainedDelta,allyDamageDealtDelta,allyDamageTakenDelta,allyHealingDelta,allyShieldGrantedDelta,allyShieldAbsorbedDelta,allyEnergyGrantedDelta,allyEnergyGainedDelta,allyEnergySpentDelta,allyEnergyRemainingDelta,allySkillPointsGrantedDelta,allyTurnsDelta,enemyTurnsDelta',
    ...rows.map(row => [row.candidate, row.wearer, row.comparisonReference, row.mechanicTags, row.measurementPlan, row.unobservedTags, row.requiredCoverage, row.difficulty, row.enemyStatMultiplier, row.allyCount, row.enemyCount, row.enemyCategory, row.compositionPairs, row.controlRating / row.compositionPairs, row.treatmentRating / row.compositionPairs, row.ratingDelta / row.compositionPairs, row.controlWin / row.compositionPairs * 100, row.treatmentWin / row.compositionPairs * 100, row.controlTimeout / row.compositionPairs * 100, row.treatmentTimeout / row.compositionPairs * 100, row.winDelta / row.compositionPairs, row.hpSwing / row.compositionPairs, row.bae / row.compositionPairs, row.impact.enemyHpRemoved / row.compositionPairs, row.impact.allyHpRetained / row.compositionPairs, row.impact.damageDealt / row.compositionPairs, row.impact.damageTaken / row.compositionPairs, row.impact.healing / row.compositionPairs, row.impact.shieldsGranted / row.compositionPairs, row.impact.shieldsAbsorbed / row.compositionPairs, row.impact.energyGranted / row.compositionPairs, row.impact.energyGained / row.compositionPairs, row.impact.energySpent / row.compositionPairs, row.impact.energyRemaining / row.compositionPairs, row.impact.skillPointsGranted / row.compositionPairs, row.impact.allyTurns / row.compositionPairs, row.impact.enemyTurns / row.compositionPairs].map(csvEscape).join(','))
  ].join('\n') + '\n');
  const chartFile = options.output.replace(/\.jsonl$/i, '') + (options.characterBenchmarkReport ? '-character-winrate.svg' : '-winrate.svg');
  if (!options.characterBenchmarkReport) fs.writeFileSync(chartFile, makeWinRateSvg(rows));
  if (options.runeImpactReport) {
    const { overallRows, wearerRows } = buildRuneImpactRows(ratingSamples, options.runs);
    const impactFile = options.output.replace(/\.jsonl$/i, '') + '-rune-impact.csv';
    const wearerImpactFile = options.output.replace(/\.jsonl$/i, '') + '-rune-impact-by-wearer.csv';
    const columns = Object.keys(overallRows[0] || {});
    fs.writeFileSync(impactFile, [columns.join(','), ...overallRows.map(row => columns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    const wearerColumns = Object.keys(wearerRows[0] || {});
    fs.writeFileSync(wearerImpactFile, [wearerColumns.join(','), ...wearerRows.map(row => wearerColumns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    console.log(`Rune impact estimates: ${impactFile}`);
    console.log(`Rune impact by wearer: ${wearerImpactFile}`);
    for (const row of overallRows) console.log(`  ${row.rune}: ${row.outcomeRating.toFixed(1)}/100 (${row.ratingDifference >= 0 ? '+' : ''}${row.ratingDifference.toFixed(1)} vs control); ${row.winLiftPp >= 0 ? '+' : ''}${row.winLiftPp.toFixed(2)} pp; ${row.meanBAE >= 0 ? '+' : ''}${row.meanBAE.toFixed(2)} BAE; ${row.outcomeAssessment}.`);
  }
  if (options.mechanicRating) {
    const { overallRows, wearerRows } = buildMechanicRatingRows(ratingSamples, options.runs);
    const ratingFile = options.output.replace(/\.jsonl$/i, '') + '-mechanic-rating.csv';
    const characterFile = options.output.replace(/\.jsonl$/i, '') + '-mechanic-rating-by-character.csv';
    const columns = Object.keys(overallRows[0] || {}), characterColumns = Object.keys(wearerRows[0] || {});
    fs.writeFileSync(ratingFile, [columns.join(','), ...overallRows.map(row => columns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    fs.writeFileSync(characterFile, [characterColumns.join(','), ...wearerRows.map(row => characterColumns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    console.log(`0–100 outcome ratings and paired mechanic impact: ${ratingFile}`);
    console.log(`Character-specific component estimates: ${characterFile}`);
    for (const row of overallRows) {
      const interval = Number.isFinite(row.winLift95LowerPp) ? `seed-only 95% interval ${row.winLift95LowerPp.toFixed(2)} to ${row.winLift95UpperPp.toFixed(2)} pp` : 'no eligible comparisons';
      const execution = Number.isFinite(row.executionRatePct) ? `; executed ${row.executionRatePct.toFixed(1)}% of opportunities` : '';
      const rating = Number.isFinite(row.outcomeRating) ? `${row.outcomeRating.toFixed(1)}/100` : 'N/A';
      const change = Number.isFinite(row.ratingDifference) ? `; ${row.ratingDifference >= 0 ? '+' : ''}${row.ratingDifference.toFixed(1)} rating points vs control` : '';
      console.log(`  ${row.candidate}: ${rating}${change}; ${Number.isFinite(row.winLiftPp) ? `${row.winLiftPp >= 0 ? '+' : ''}${row.winLiftPp.toFixed(2)} pp` : 'N/A'} win-rate lift (${row.outcomeAssessment}; ${interval}${execution}).`);
    }
  }
  console.log(`Completed ${scenarios.toLocaleString()} scenario-policy cells and ${comparisons.toLocaleString()} candidate/wearer simulations.`);
  console.log(`Battle records: ${options.output}`);
  if (rows.length) console.log(`Stratified averages: ${summaryFile}`);
  console.log(`Win-rate chart: ${chartFile}`);
}
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

export { archetypeLibrary, candidateSpecs, enemyLineups, impactDeltas, makeBaseConfig, makeBranches, orderedUniqueTeams };
