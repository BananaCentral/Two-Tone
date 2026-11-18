#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { simulateBattle } from './combat-simulator.mjs';
import { CHARACTER_COMBAT_DATA, CHARACTER_UPGRADE_EFFECTS, COMBAT_EFFECT_CATALOG, COMBAT_MECHANIC_TAGS, COMBAT_PERFORMANCE_STANDARD, ENEMY_COMBAT_DATA, RUNE_COMBAT_RULES } from '../src/scripts/combat-definitions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The benchmark roster follows the same authored definitions as the live game.
// Adding a combatant must not require editing this analysis runner.
const CHARACTER_IDS = Object.keys(CHARACTER_COMBAT_DATA).sort();
const ENEMY_IDS = Object.keys(ENEMY_COMBAT_DATA).sort();
const RUNES = Object.keys(RUNE_COMBAT_RULES).sort();
const CHARACTER_PASSIVES = Object.entries(CHARACTER_COMBAT_DATA).flatMap(([character, kit]) =>
  kit.passives.map(passive => ({ character, id: passive.id || passive.type })));
const LENGTHS = ['short', 'medium', 'long'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const BENCHMARK_POLICY_PROFILE = 'scripted-auto-v1';
const RUNE_MAIN = ['hp', 'attack', 'physicalDefense', 'magicalDefense'];
const BAE_REFERENCE_HP = COMBAT_PERFORMANCE_STANDARD.baseStats.attack * (1 - Math.min(
  COMBAT_PERFORMANCE_STANDARD.baseStats.physicalDefense / COMBAT_PERFORMANCE_STANDARD.baseStats.attack, 1));

// This registry is the contract between authored tags, event evidence, and
// scenario coverage. It never contributes an extra score weight.
const TAG_MEASUREMENT_RULES = Object.freeze({
  'damage.direct': ['damage'], 'damage.physical': ['damage'], 'damage.magical': ['damage'], 'damage.true': ['damage'],
  'damage.critical': ['damage', 'critical'], 'damage.conditional_multiplier': ['damage', 'trigger'],
  'damage.over_time': ['damage', 'status'], 'damage.echo': ['damage'], 'damage.reflect': ['damage'],
  'damage.follow_up': ['damage', 'trigger'], 'damage.barrier_break': ['damage', 'barrier'],
  'buff.attack': ['damage', 'support'], 'buff.critical': ['damage', 'critical'], 'buff.next_basic': ['damage', 'support'],
  'buff.damage': ['damage', 'support'], 'buff.barrier_damage': ['damage', 'barrier'], 'buff.barrier_break_damage': ['damage', 'barrier'],
  'buff.defense_ignore': ['damage', 'defense'], 'debuff.defense': ['damage', 'defense'], 'debuff.damage': ['damage', 'mitigation'],
  'debuff.mark': ['status', 'damage'], 'defense.shield': ['shield', 'survival'], 'defense.barrier': ['barrier'],
  'defense.damage_reduction': ['mitigation', 'survival'], 'defense.stealth': ['dodge', 'survival'],
  'recovery.healing': ['healing', 'survival'], 'recovery.lifesteal': ['healing', 'survival'],
  'resource.energy': ['energy'], 'resource.skill_point': ['skillPoints'], 'resource.capacity': ['skillPoints'], 'resource.hp_cost': ['healthCost', 'survival'],
  'tempo.action_advance': ['actionAdvance', 'turns'], 'tempo.action_delay': ['actionDelay', 'turns'], 'tempo.taunt': ['taunt', 'mitigation'],
  'status.bleed': ['status', 'damage'], 'status.exposed': ['status', 'damage'], 'status.ricochet': ['status', 'damage'],
  'status.tune': ['status', 'support'], 'status.residue': ['status', 'mitigation'], 'status.broken': ['status', 'barrier'],
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
function makeBaseConfig(library, allies, enemies, difficulty, length, archetypeCache = null) {
  const profileKey = `${difficulty}|${length}`;
  let archetypes = archetypeCache?.get(profileKey);
  if (!archetypes) {
    archetypes = itemlessLibrary(library);
    const hpMultiplier = length === 'short' ? 0.65 : length === 'medium' ? 3 : 8;
    const bossHpMultiplier = length === 'medium' ? 5 : hpMultiplier;
    const pressure = difficulty === 'easy' ? 0.75 : difficulty === 'hard' ? 1.25 : 1;
    for (const id of ENEMY_IDS) {
      const archetype = archetypes[id];
      const isBoss = archetype.tags?.type === 'boss';
      const hpScale = (isBoss ? bossHpMultiplier : hpMultiplier) * pressure;
      archetype.stats.hp *= hpScale;
      for (const stat of ['attack']) if (Number.isFinite(archetype.stats[stat])) archetype.stats[stat] *= pressure;
      archetype.stats.physicalDefense *= pressure;
      archetype.stats.magicalDefense *= pressure;
    }
    archetypeCache?.set(profileKey, archetypes);
  }
  // Every enemy composition is scaled to its frozen length profile, not to the candidate's performance.
  return {
    version: 1,
    name: `${difficulty}/${length}: ${allies.join('+')} vs ${enemies.join('+')}`,
    settings: { initialSkillPoints: 3, skillPointCap: 5, maxActions: 2000, policyProfile: BENCHMARK_POLICY_PROFILE },
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
    ...CHARACTER_IDS.flatMap(character => ['basic', 'skill', 'ultimate'].map(id => ({ type: 'action', id, character }))),
    ...CHARACTER_IDS.map(character => ({ type: 'character-overall', id: character, character }))
  ];
  if (raw === 'all-rune-impact' || raw === 'all-rune-ratings') return RUNES.map(id => ({ type: 'rune', id }));
  if (raw === 'all-runes') return RUNES.map(id => ({ type: 'rune', id }));
  if (raw === 'all-weapons') return ['standard', 'premium'].flatMap(type => [1, 2, 3, 4, 5].flatMap(potential => [1, 10, 25, 50].map(level => ({ type: 'weapon', id: type, potential, level }))));
  const [type, ...rest] = raw.split(':');
  const value = rest.join(':');
  if (type === 'rune' && RUNES.includes(value)) return [{ type, id: value }];
  if (type === 'effect' && COMBAT_EFFECT_CATALOG[value]) return [{ type, id: value, character: COMBAT_EFFECT_CATALOG[value].character }];
  if ((type === 'character' || type === 'character-overall') && CHARACTER_IDS.includes(value)) return [{ type, id: value, character: value }];
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
    return { mechanicTags: [...new Set(effects.flatMap(effect => effect?.mechanicTags || []))],
      mechanicTargets: Object.assign({}, ...effects.map(effect => effect?.mechanicTargets || {})),
      mechanicTriggers: Object.assign({}, ...effects.map(effect => effect?.mechanicTriggers || {})) };
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
function wearersFor(spec, party) {
  if (spec.type === 'upgrade') return party.includes(spec.character) ? [spec.character] : [];
  if (spec.type === 'character') return party.includes(spec.id) ? [spec.id] : [];
  if (spec.type === 'action' || spec.type === 'passive' || spec.type === 'character-overall') return party.includes(spec.character) ? [spec.character] : [];
  if (spec.type === 'effect') return party.includes(spec.character) ? [spec.character] : [];
  // Runes are equippable by every character. Eligibility and actual activation
  // are reported separately from the measured outcome; no roster names belong here.
  return party.slice();
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
  if (spec.type === 'character-overall') return actionComparisonReference({ type: 'action', id: 'basic' }, archetype)?.label || 'standard basic reference';
  return null;
}
function makeRuneBranch(base, wearer, setId) {
  // Rune candidates only change one ally's Rune slots. Keep immutable archetypes shared
  // and clone the small team/settings structures instead of deep-cloning the library.
  const branch = {
    ...base,
    settings: { ...base.settings },
    teams: {
      allies: base.teams.allies.map(unit => ({ ...unit })),
      enemies: base.teams.enemies.map(unit => ({ ...unit }))
    }
  };
  const wearerUnit = findUnit(branch, wearer);
  assert(wearerUnit, `Wearer ${wearer} is absent from matchup.`);
  wearerUnit.runes = makeBalancedRunes(setId);
  return branch;
}
function makeBranches(base, spec, wearer) {
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
function outcomeRating(result) { return result.winner === 'allies' ? 100 : result.winner === 'draw' ? 50 : 0; }
function average(values) { return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0; }
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
function benchmarkCharacterRows(samples, seed = 1, expectedDesignStrata = 540, bootstrapReplicates = 1000) {
  const grouped = new Map();
  for (const sample of samples.filter(row => row.componentType === 'character-overall')) {
    const key = `${sample.candidate}|${sample.wearer}`;
    if (!grouped.has(key)) grouped.set(key, { candidate: sample.candidate, character: sample.wearer, scenarios: new Map(), designStrata: new Set() });
    grouped.get(key).designStrata.add([sample.allyCount, sample.enemyCount, sample.enemyCategory, sample.length, sample.difficulty].join('|'));
    // Use enemy class band as the bootstrap block. The design already spreads
    // party size, enemy count, length, and difficulty within those blocks; using
    // the full cross-product here would leave a single-row block and fake a zero-width interval.
    const scenarioKey = sample.enemyCategory;
    const strata = grouped.get(key).scenarios.get(scenarioKey) || [];
    strata.push(sample); grouped.get(key).scenarios.set(scenarioKey, strata);
  }
  let randomState = (seed >>> 0) || 1;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const output = [];
  for (const entry of grouped.values()) {
    const strata = [...entry.scenarios.values()];
    const cells = strata.map(rows => rows.map(row => ({
      treatment: average(row.treatmentRatings), control: average(row.controlRatings),
      difference: average(row.ratingDeltas)
    })));
    const averageAcross = key => average(cells.map(group => average(group.map(cell => cell[key]))));
    const treatment = averageAcross('treatment'), control = averageAcross('control'), difference = averageAcross('difference');
    const runCount = Math.min(...[...entry.scenarios.values()].flat().map(row => row.treatmentRatings.length));
    const perSeed = Array.from({ length: runCount }, (_, run) => average(strata.map(rows => average(rows.map(row => row.treatmentRatings[run])))));
    const perSeedDelta = Array.from({ length: runCount }, (_, run) => average(strata.map(rows => average(rows.map(row => row.ratingDeltas[run])))));
    const scenarioScores = [], scenarioDeltas = [];
    for (let replicate = 0; replicate < bootstrapReplicates; replicate++) {
      const picked = cells.map(group => Array.from({ length: group.length }, () => group[Math.floor(random() * group.length)]));
      scenarioScores.push(average(picked.map(group => average(group.map(cell => cell.treatment)))));
      scenarioDeltas.push(average(picked.map(group => average(group.map(cell => cell.difference)))));
    }
    output.push({ candidate: entry.candidate, character: entry.character, outcomeScore: treatment, controlScore: control,
      difference, sampledScenarioCells: cells.reduce((sum, group) => sum + group.length, 0), scenarioBootstrapBlocks: strata.length,
      sampledDesignStrata: entry.designStrata.size, expectedDesignStrata,
      scenario95Lower: percentile(scenarioScores, .025), scenario95Upper: percentile(scenarioScores, .975),
      pairedScenarioDifference95Lower: percentile(scenarioDeltas, .025), pairedScenarioDifference95Upper: percentile(scenarioDeltas, .975),
      seed95Lower: Math.max(0, meanCI(perSeed).lower), seed95Upper: Math.min(100, meanCI(perSeed).upper),
      pairedSeedDifference95Lower: meanCI(perSeedDelta).lower, pairedSeedDifference95Upper: meanCI(perSeedDelta).upper });
  }
  return output;
}
function writeBenchmarkArtifacts(outputPath, samples, coverage, expectedEnemyClassMixes, expectedBenchmarkStrata, options, scenarioCount, comparisonCount) {
  const scoreRows = benchmarkCharacterRows(samples, options.seed, expectedBenchmarkStrata.length);
  const mechanicCoverage = new Map();
  for (const sample of samples.filter(row => row.componentType !== 'character-overall')) {
    for (const tag of (sample.mechanicTags || '').split(';').filter(Boolean)) {
      const row = mechanicCoverage.get(tag) || { tag, candidateComparisons: 0, comparisonsWithEvents: 0 };
      row.candidateComparisons++;
      if (sample.eventObserved?.[tag]) row.comparisonsWithEvents++;
      mechanicCoverage.set(tag, row);
    }
  }
  const basePath = outputPath.replace(/\.jsonl$/i, '');
  const coveragePath = `${basePath}-benchmark-coverage.csv`;
  const scorePath = `${basePath}-benchmark-score.csv`;
  const mechanicCoveragePath = `${basePath}-benchmark-mechanics.csv`;
  const reportPath = `${basePath}-benchmark-report.md`;
  const completeDesign = scoreRows.length > 0 && scoreRows.every(row => row.sampledDesignStrata === expectedBenchmarkStrata.length);
  const csv = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const expected = {
    partySize: ['1', '2', '3', '4'], enemyCount: ['1', '2', '3', '4', '5'],
    enemyClassBand: ['common_only', 'elite_present', 'boss_present'], enemyClassMix: expectedEnemyClassMixes,
    length: LENGTHS, difficulty: DIFFICULTIES, policy: [BENCHMARK_POLICY_PROFILE], benchmarkStratum: expectedBenchmarkStrata
  };
  const coverageRows = Object.entries(expected).flatMap(([dimension, categories]) => {
    const values = coverage.get(dimension) || new Map();
    return categories.map(category => ({ dimension, category, sampledScenarioCells: values.get(String(category)) || 0 }));
  });
  const perCharacterCoverage = new Map();
  for (const sample of samples.filter(row => row.componentType === 'character-overall')) {
    const stratum = [sample.allyCount, sample.enemyCount, sample.enemyCategory, sample.length, sample.difficulty].join('|');
    const key = `${sample.wearer}|${stratum}`;
    perCharacterCoverage.set(key, (perCharacterCoverage.get(key) || 0) + 1);
  }
  coverageRows.push(...[...perCharacterCoverage].map(([key, count]) => ({ dimension: 'candidateDesignStratum', category: key, sampledScenarioCells: count })));
  fs.writeFileSync(coveragePath, ['dimension,category,sampledScenarioCells', ...coverageRows.map(row =>
    [row.dimension, row.category, row.sampledScenarioCells].map(csv).join(','))].join('\n') + '\n');
  const scoreColumns = Object.keys(scoreRows[0] || {});
  fs.writeFileSync(scorePath, [scoreColumns.join(','), ...scoreRows.map(row => scoreColumns.map(key => csv(row[key])).join(','))].join('\n') + '\n');
  const mechanicRows = [...mechanicCoverage.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  fs.writeFileSync(mechanicCoveragePath, ['tag,candidateComparisons,comparisonsWithEvents', ...mechanicRows.map(row =>
    [row.tag, row.candidateComparisons, row.comparisonsWithEvents].map(csv).join(','))].join('\n') + '\n');
  const coverageLines = Object.entries(expected).map(([dimension, categories]) => {
    const seen = coverage.get(dimension) || new Map();
    const present = categories.filter(category => seen.has(String(category)));
    const missing = categories.filter(category => !seen.has(String(category)));
    const missingText = !missing.length ? 'Complete' : missing.length > 8
      ? `${missing.length} categories absent; see coverage CSV` : missing.join(', ');
    return `| ${dimension} | ${present.length}/${categories.length} | ${missingText} |`;
  });
  const scoreLines = scoreRows.map(row => `| ${row.character} | ${row.outcomeScore.toFixed(1)} | ${row.scenario95Lower.toFixed(1)}–${row.scenario95Upper.toFixed(1)} | ${row.difference >= 0 ? '+' : ''}${row.difference.toFixed(1)} | ${row.pairedScenarioDifference95Lower >= 0 ? '+' : ''}${row.pairedScenarioDifference95Lower.toFixed(1)} to ${row.pairedScenarioDifference95Upper >= 0 ? '+' : ''}${row.pairedScenarioDifference95Upper.toFixed(1)} | ${row.sampledScenarioCells} | ${row.sampledDesignStrata}/${row.expectedDesignStrata} |`);
  const mechanicLines = mechanicRows.map(row => `| ${row.tag} | ${row.comparisonsWithEvents}/${row.candidateComparisons} |`);
  const report = `# Character Performance Benchmark Report\n\n`+
    `- Benchmark version: 2\n- Sample status: ${completeDesign ? 'all design strata represented' : 'exploratory: design strata are missing'}\n- Generated: ${new Date().toISOString()}\n- Scenarios sampled: ${scenarioCount}\n- Matched candidate/wearer comparisons: ${comparisonCount}\n- Seeds per matchup: ${options.runs}; first seed: ${options.seed}\n- Automated policy: \`${BENCHMARK_POLICY_PROFILE}\` (single policy; policy robustness is not evaluated)\n- Scenario selection: balanced across party size, enemy count and enemy class mix, encounter length, and difficulty where the sample limit permits.\n\n`+
    `## Character benchmark scores\n\n`+
    `Score is the average battle outcome for the authored character kit in this sampled benchmark: win = 100, draw = 50, loss = 0. Sampled outcomes are averaged within enemy-class bands, then the represented bands receive equal weight. The control removes that character's passive, skill, and ultimate while preserving the authored stats and Basic Attack. This is a contextual team-benchmark score, not an intrinsic or policy-independent character rating. Paired difference compares the full kit with that control.\n\n`+
    `Scenario intervals resample sampled scenario compositions within enemy-class bands; seed intervals summarize randomness across the shared seed set. They answer different uncertainty questions and are reported separately. Scenario intervals are percentile bootstrap estimates and may remain wide when the sample is small.\n\n`+
    `| Character | Score / 100 | Scenario 95% interval | Difference vs same-stat control | Paired scenario interval | Sampled scenario cells | Design cells covered |\n|---|---:|---:|---:|---:|---:|---:|\n${scoreLines.join('\n') || '| No character-overall candidates were included | | | | | | |'}\n\n`+
    `## Scenario coverage\n\n| Dimension | Categories covered | Missing categories |\n|---|---:|---|\n${coverageLines.join('\n')}\n\n`+
    `Enemy class mixes observed are listed in [benchmark coverage CSV](${path.basename(coveragePath)}). Full per-comparison and event evidence remain in the JSONL and stratified CSV outputs.\n\n`+
    `## Mechanic event evidence\n\n| Mechanic tag | Comparisons with a captured event |\n|---|---:|\n${mechanicLines.join('\n') || '| No component comparisons were included | |'}\n\n`+
    `A missing event may mean the mechanic was unsupported, ineligible, or rare in this sample. It is not evidence of zero value. See [mechanic coverage CSV](${path.basename(mechanicCoveragePath)}).\n\n`+
    `## Interpretation and limitations\n\n`+
    `This run uses the existing scripted action policy, not a panel of player policies. Do not treat these scores as general character rankings until a second generic policy profile is implemented and the result is checked under both. A missing category is a coverage failure, not evidence that the character has no value there. Read activation and event evidence alongside outcome changes; component effects overlap and their scores are not additive.\n`;
  fs.writeFileSync(reportPath, report);
  console.log(`Benchmark report: ${reportPath}`);
  console.log(`Benchmark coverage: ${coveragePath}`);
  console.log(`Mechanic event coverage: ${mechanicCoveragePath}`);
  if (scoreRows.length) {
    console.log(`Benchmark scores: ${scorePath}`);
    for (const row of scoreRows) console.log(`  ${row.character}: ${row.outcomeScore.toFixed(1)}/100; paired ${row.difference >= 0 ? '+' : ''}${row.difference.toFixed(1)} vs same-stat control; scenario interval ${row.scenario95Lower.toFixed(1)}–${row.scenario95Upper.toFixed(1)}.`);
  }
}
function totalAllyHp(result) { return result.finalHp.allies; }
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
  const controlWin = winValue(control), treatmentWin = winValue(treatment);
  const enemyHpDelta = control.finalHp.enemies - treatment.finalHp.enemies;
  const allyHpRetainedDelta = treatment.finalHp.allies - control.finalHp.allies;
  return {
    seed,
    controlWin,
    treatmentWin,
    controlRating: outcomeRating(control),
    treatmentRating: outcomeRating(treatment),
    controlDraw: control.winner === 'draw' ? 1 : 0,
    treatmentDraw: treatment.winner === 'draw' ? 1 : 0,
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
function parseArgs(args) {
  const options = { candidates: [], preset: 'balanced', runs: 10, seed: 1, output: 'Documentation/combat-simulator/performance-results.jsonl', limitScenarios: 500, maxActions: 2000, compact: true, runeImpactReport: false, mechanicRating: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--preset') {
      const preset = args[++index];
      options.preset = preset;
      if (preset === 'quick') Object.assign(options, { runs: 5, limitScenarios: 250, compact: true });
      else if (preset === 'balanced') Object.assign(options, { runs: 10, limitScenarios: 500, compact: true });
      else if (preset === 'full') Object.assign(options, { runs: 20, limitScenarios: 1000, compact: true });
      else fail(`Unknown preset ${preset}. Choose quick, balanced, or full.`);
    }
    else if (arg === '--candidate') {
      const raw = args[++index];
      options.candidates.push(...candidateSpecs(raw));
      if (raw === 'all-rune-impact' || raw === 'all-rune-ratings') options.runeImpactReport = true;
      if (raw === 'all-characters') options.characterBenchmarkReport = true;
      if (['all-character-mechanics', 'all-actions', 'all-passives', 'all-effects', 'all-upgrade-effects'].includes(raw) || /^(upgrade|action|passive|effect|character-overall):/.test(raw)) options.mechanicRating = true;
    }
    else if (arg === '--character') options.character = args[++index];
    else if (arg === '--runs') options.runs = Number(args[++index]);
    else if (arg === '--seed') options.seed = Number(args[++index]);
    else if (arg === '--limit-scenarios') options.limitScenarios = Number(args[++index]);
    else if (arg === '--max-actions') options.maxActions = Number(args[++index]);
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
  return options;
}
function help() {
  return `Two-Tone matched combat performance runner\n\nUsage: node tools/combat-performance.mjs [options]\n\nOptions:\n  --preset quick|balanced|full  Select a coverage/run-count preset (default balanced)\n  --candidate all-characters|all-rune-impact|all-rune-ratings|all-runes|all-weapons\n  --candidate all-actions|all-passives|all-effects|all-character-mechanics|all-upgrade-effects\n  --candidate rune:<id>|character:<id>|passive:<character>/<id>\n  --candidate effect:<stable-effect-id>|upgrade:<effect-id>\n  --candidate weapon:standard@P1L1|weapon:premium@P1L50\n  --candidate action:<character>/basic|skill|ultimate\n  --character <id>           Restrict item tests to this eligible wearer\n  --runs <n>                  Matched seeds per matchup\n  --seed <n>                  First reproducible seed (default 1)\n  --limit-scenarios <n>       Per-character panel cap; use 0 for exhaustive panels\n  --max-actions <n>           Maximum unit actions in one battle (default 2000)\n  --output <path>             JSONL result path\n  --include-trials            Include per-seed details (larger output)\n\nThe roster is read from authored combat definitions. Character studies pin each candidate into an equally sized scenario panel, so total scenarios scale with roster size. Scenario strata balance party size, enemy count and class mix, encounter length, and difficulty. Current results use one explicitly named automated policy (${BENCHMARK_POLICY_PROFILE}); they are not policy-robust or universal character ratings. Reports include separate seed and scenario-resampling intervals. Win/draw/loss scores are conditional on the benchmark's documented scenario and policy mix.`;
}
function* scenarioSamples(allyLists, enemyTeams, limit, library) {
  if (!limit) {
    for (const party of allyLists) for (const enemies of enemyTeams)
      for (const length of LENGTHS) for (const difficulty of DIFFICULTIES)
      yield { party, enemies, length, difficulty, enemyClassMix: enemyClassMix(enemies, library), enemyClassBand: enemyClassBand(enemies, library) };
    return;
  }
  const partyGroups = new Map(), enemyGroups = new Map();
  for (const party of allyLists) {
    const group = partyGroups.get(party.length) || [];
    group.push(party); partyGroups.set(party.length, group);
  }
  for (const enemies of enemyTeams) {
    const enemyGroupKey = `${enemies.length}|${enemyClassBand(enemies, library)}`;
    const group = enemyGroups.get(enemyGroupKey) || [];
    group.push(enemies); enemyGroups.set(enemyGroupKey, group);
  }
  const strata = [];
  const enemyGroupKeys = [...enemyGroups.keys()].sort();
  for (const partySize of [...partyGroups.keys()].sort((a, b) => a - b))
    for (const enemyGroupKey of enemyGroupKeys)
      for (const length of LENGTHS) for (const difficulty of DIFFICULTIES)
        strata.push({ partySize, enemyGroupKey, length, difficulty });
  const count = Math.min(limit, allyLists.length * enemyTeams.length * LENGTHS.length * DIFFICULTIES.length);
  const selectedStrata = count < strata.length
    ? Array.from({ length: count }, (_, index) => Math.floor((index + .5) * strata.length / count))
    : strata.map((_, index) => index);
  const extraCount = Math.max(0, count - strata.length);
  const perStratum = strata.length ? Math.floor(extraCount / strata.length) : 0;
  const remainder = strata.length ? extraCount % strata.length : 0;
  for (const index of selectedStrata) {
    const stratum = strata[index], parties = partyGroups.get(stratum.partySize), enemies = enemyGroups.get(stratum.enemyGroupKey);
    const quota = count < strata.length ? 1 : 1 + perStratum + (index < remainder ? 1 : 0);
    for (let sample = 0; sample < quota; sample++) {
      const partyIndex = (index * 13 + sample * 7) % parties.length;
      const enemyIndex = (index * 17 + sample * 11) % enemies.length;
      yield { party: parties[partyIndex], enemies: enemies[enemyIndex], length: stratum.length, difficulty: stratum.difficulty,
        enemyClassMix: enemyClassMix(enemies[enemyIndex], library), enemyClassBand: enemyClassBand(enemies[enemyIndex], library) };
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
  return { overallRows, wearerRows };
}
function buildMechanicRatingRows(samples, runCount) {
  const candidates = new Map();
  for (const sample of samples) {
    const candidateRows = candidates.get(sample.candidate) || { metadata: sample, wearers: new Map() };
    candidates.set(sample.candidate, candidateRows);
    const strata = candidateRows.wearers.get(sample.wearer) || new Map();
    candidateRows.wearers.set(sample.wearer, strata);
    const stratum = [sample.difficulty, sample.length, sample.allyCount, sample.enemyCount, sample.enemyCategory].join('|');
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
          const battleWins = [], battleBaes = [], useWins = [], useBaes = [];
          const battleControlRatings = [], battleTreatmentRatings = [], battleRatingDeltas = [];
          const useControlRatings = [], useTreatmentRatings = [], useRatingDeltas = [];
          for (const formation of formations) {
            const status = formation.actionStatuses?.[seedIndex] || null;
            if (isAction) {
              activationOpportunities++;
              opportunityCount++;
              statusCounts[status || 'missing_status'] = (statusCounts[status || 'missing_status'] || 0) + 1;
              const executed = status === 'executed';
              if (executed) { activationSum++; executedCount++; }
              const delta = formation.winDeltas[seedIndex], bae = formation.baeValues[seedIndex];
              battleWins.push(delta); battleBaes.push(bae);
              battleControlRatings.push(formation.controlRatings[seedIndex]);
              battleTreatmentRatings.push(formation.treatmentRatings[seedIndex]);
              battleRatingDeltas.push(formation.ratingDeltas[seedIndex]);
              if (executed) {
                useWins.push(delta); useBaes.push(bae);
                useControlRatings.push(formation.controlRatings[seedIndex]);
                useTreatmentRatings.push(formation.treatmentRatings[seedIndex]);
                useRatingDeltas.push(formation.ratingDeltas[seedIndex]);
              }
            } else {
              battleWins.push(formation.winDeltas[seedIndex]); battleBaes.push(formation.baeValues[seedIndex]);
              useWins.push(formation.winDeltas[seedIndex]); useBaes.push(formation.baeValues[seedIndex]);
              battleControlRatings.push(formation.controlRatings[seedIndex]);
              battleTreatmentRatings.push(formation.treatmentRatings[seedIndex]);
              battleRatingDeltas.push(formation.ratingDeltas[seedIndex]);
              useControlRatings.push(formation.controlRatings[seedIndex]);
              useTreatmentRatings.push(formation.treatmentRatings[seedIndex]);
              useRatingDeltas.push(formation.ratingDeltas[seedIndex]);
            }
          }
          values.battleWin[seedIndex] = meanFinite(battleWins);
          values.battleBae[seedIndex] = meanFinite(battleBaes);
          values.useWin[seedIndex] = meanFinite(useWins);
          values.useBae[seedIndex] = meanFinite(useBaes);
          values.battleControlRating[seedIndex] = meanFinite(battleControlRatings);
          values.battleTreatmentRating[seedIndex] = meanFinite(battleTreatmentRatings);
          values.battleRatingDelta[seedIndex] = meanFinite(battleRatingDeltas);
          values.useControlRating[seedIndex] = meanFinite(useControlRatings);
          values.useTreatmentRating[seedIndex] = meanFinite(useTreatmentRatings);
          values.useRatingDelta[seedIndex] = meanFinite(useRatingDeltas);
        }
        compositionRows.push({ values, activationRate: activationOpportunities ? activationSum / activationOpportunities : null });
      }
      const weighted = Object.fromEntries(fields.map(field => [field, Array.from({ length: runCount }, (_, i) => meanFinite(compositionRows.map(row => row.values[field][i])))]));
      stratumRows.push({ stratum, values: weighted,
        activationRate: meanFinite(compositionRows.map(row => row.activationRate)), compositionCount: compositionRows.length,
        onUseCompositionCount: compositionRows.filter(row => row.values.useWin.some(Number.isFinite)).length });
    }

    const perSeed = Object.fromEntries(fields.map(field => [field, Array.from({ length: runCount }, (_, i) => meanFinite(stratumRows.map(row => row.values[field][i])))]));
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
  const allyTeams = orderedUniqueTeams(CHARACTER_IDS, 1, 4);
  const enemyTeams = [...enemyLineups(ENEMY_IDS, 5)];
  const allAllyLists = [...allyTeams];
  const scaledArchetypes = new Map();
  const characterStudies = options.characterBenchmarkReport || options.mechanicRating;
  const anchors = options.character ? [options.character] : characterStudies
    ? [...new Set(options.candidates.map(spec => spec.character || (spec.type === 'character' ? spec.id : null)).filter(Boolean))].sort()
    : [null];
  const anchorMatrixCounts = anchors.map(anchor => (anchor ? allAllyLists.filter(party => party.includes(anchor)).length : allAllyLists.length)
    * enemyTeams.length * LENGTHS.length * DIFFICULTIES.length);
  const targetScenarios = anchorMatrixCounts.reduce((sum, count) => sum + (options.limitScenarios ? Math.min(options.limitScenarios, count) : count), 0);
  console.log(`Scenario universe: ${anchorMatrixCounts.reduce((sum, count) => sum + count, 0).toLocaleString()} anchored cells; selected ${targetScenarios.toLocaleString()} total (${options.limitScenarios || 'all'} per candidate anchor); ${options.runs} matched runs per comparison.`);
  const progressEvery = Math.max(1, Math.ceil(targetScenarios / 20));
  const sampledScenarioCoverage = new Map();
  for (const { party, enemies, length, difficulty, enemyClassMix: sampledEnemyClassMix, enemyClassBand: sampledEnemyClassBand, focalCharacter } of candidateScenarioSamples(allAllyLists, enemyTeams, options.limitScenarios, library, anchors)) {
      scenarios++;
      for (const [dimension, value] of Object.entries({ partySize: party.length, enemyCount: enemies.length,
        enemyClassBand: sampledEnemyClassBand, enemyClassMix: sampledEnemyClassMix, length, difficulty, policy: BENCHMARK_POLICY_PROFILE,
        benchmarkStratum: `${party.length}|${enemies.length}|${sampledEnemyClassBand}|${length}|${difficulty}` })) {
        const values = sampledScenarioCoverage.get(dimension) || new Map();
        values.set(String(value), (values.get(String(value)) || 0) + 1);
        sampledScenarioCoverage.set(dimension, values);
      }
      const base = makeBaseConfig(library, party, enemies, difficulty, length, scaledArchetypes);
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
          for (let run = 0; run < options.runs; run++) {
            const seed = options.seed + run;
            if (effectTargets.length) {
              const targetId = effectTargets[(run + scenarios - 1) % effectTargets.length];
              controlConfig.settings.actionOverride.targetId = targetId;
              treatmentConfig.settings.actionOverride.targetId = targetId;
              effectTargetCoverage[targetId]++;
            }
            const controlResult = controlRuns?.[run] || simulateBattle(controlConfig, seed, options.maxActions);
            if (shouldCacheControl) controlRuns.push(controlResult);
            const treatmentResult = simulateBattle(treatmentConfig, seed, options.maxActions);
            trials.push(battleMetrics(controlResult, treatmentResult, seed));
          }
          if (shouldCacheControl) neutralControlResults.set(wearer, controlRuns);
          const winsControl = trials.reduce((sum, trial) => sum + trial.controlWin, 0);
          const winsTreatment = trials.reduce((sum, trial) => sum + trial.treatmentWin, 0);
          const mechanicEvaluation = evaluationPlan(spec);
          const comparisonReference = comparisonReferenceFor(spec, base.archetypes[wearer]);
          const tagMeasurements = summarizeMechanicEventDeltas(trials, mechanicEvaluation,
            trials.reduce((sum, trial) => sum + trial.mechanicEventCapture.controlDropped, 0),
            trials.reduce((sum, trial) => sum + trial.mechanicEventCapture.treatmentDropped, 0));
          const summary = {
            candidate: candidateLabel(spec),
            wearer, party, enemies,
            comparisonReference,
            performanceStandard: { baseStats: COMBAT_PERFORMANCE_STANDARD.baseStats,
              damageMultipliers: COMBAT_PERFORMANCE_STANDARD.damageMultipliers, baeReferenceHp: BAE_REFERENCE_HP },
            enemyCategories: [...new Set(enemies.map(id => library[id].tags?.type || 'unknown'))].sort(),
            enemyClassMix: sampledEnemyClassMix, enemyClassBand: sampledEnemyClassBand, policyProfile: BENCHMARK_POLICY_PROFILE,
            difficulty, length, runs: options.runs, seed: options.seed,
            mechanicEvaluation,
            tagMeasurements,
            winRate: { control: winsControl / options.runs * 100, treatment: winsTreatment / options.runs * 100,
              control95CI: percentCI(trials.map(row => row.controlWin)),
              treatment95CI: percentCI(trials.map(row => row.treatmentWin)),
              controlDrawRatePct: average(trials.map(row => row.controlDraw)) * 100,
              treatmentDrawRatePct: average(trials.map(row => row.treatmentDraw)) * 100,
              differencePercentagePoints: average(trials.map(row => row.winDelta)) * 100,
              paired95CI: percentCI(trials.map(row => row.winDelta)) },
            outcomeRating: { control: average(trials.map(row => row.controlRating)), treatment: average(trials.map(row => row.treatmentRating)),
              control95CI: boundedRatingCI(trials.map(row => row.controlRating)),
              treatment95CI: boundedRatingCI(trials.map(row => row.treatmentRating)),
              difference: average(trials.map(row => row.treatmentRating - row.controlRating)),
              paired95CI: meanCI(trials.map(row => row.treatmentRating - row.controlRating)) },
            hpSwing: meanCI(trials.map(row => row.hpSwing)),
            bae: meanCI(trials.map(row => row.bae)),
            impact: Object.fromEntries(Object.keys(trials[0]?.impact || {}).map(key => [key, meanCI(trials.map(row => row.impact[key]))])),
            averageDamage: { control: average(trials.map(row => row.controlDamage)), treatment: average(trials.map(row => row.treatmentDamage)) },
            averageAllyHpRetained: { control: average(trials.map(row => row.control.finalHp.allies)), treatment: average(trials.map(row => row.treatment.finalHp.allies)) },
            averageShieldAbsorbed: { control: average(trials.map(row => row.control.shields)), treatment: average(trials.map(row => row.treatment.shields)) },
            averageTurns: { alliesControl: average(trials.map(row => row.control.allyTurns)), alliesTreatment: average(trials.map(row => row.treatment.allyTurns)), enemiesControl: average(trials.map(row => row.control.enemyTurns)), enemiesTreatment: average(trials.map(row => row.treatment.enemyTurns)) },
            actionOverride: trials.find(row => row.treatment.actionOverride)?.treatment.actionOverride || null,
            supportTargetCoverage: effectTargetCoverage,
            runeDiagnostics: { averageActivations: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeActivations || 0)), averageEnergyRestored: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeEnergyRestored || 0)) },
            trials
          };
          if (options.compact) delete summary.trials;
          else summary.trials = trials.map(({ mechanicEventDeltas, ...trial }) => ({ ...trial, mechanicEventDeltas: Object.values(mechanicEventDeltas).filter(row => mechanicEvaluation.tags.includes(row.tag)) }));
          out.write(JSON.stringify(summary) + '\n');
          comparisons++;
          if ((options.runeImpactReport && spec.type === 'rune') ||
              (options.characterBenchmarkReport && spec.type === 'character-overall') ||
              (options.mechanicRating && ['passive', 'action', 'effect', 'character-overall', 'upgrade'].includes(spec.type))) ratingSamples.push({
            candidate: candidateLabel(spec), wearer, scenarioId: scenarios,
            comparisonReference,
            difficulty, length, partyComposition: party.slice().sort().join('+'),
            enemyComposition: enemies.slice().sort().join('+'), allyCount: party.length,
            enemyCount: enemies.length, enemyCategory: sampledEnemyClassBand,
            componentType: spec.type,
            winDeltas: trials.map(trial => trial.winDelta), baeValues: trials.map(trial => trial.bae),
            controlRatings: trials.map(trial => trial.controlRating), treatmentRatings: trials.map(trial => trial.treatmentRating),
            ratingDeltas: trials.map(trial => trial.treatmentRating - trial.controlRating),
            actionStatuses: spec.type === 'action' ? trials.map(trial => trial.treatment.actionOverride?.status || 'missing_status') : null,
            eventObserved: Object.fromEntries(tagMeasurements.map(entry => [entry.tag, entry.evidenceStatus === 'event_observed'])),
            mechanicTags: mechanicEvaluation.tags.join(';'), measurementPlan: measurementPlanLabel(mechanicEvaluation),
            requiredCoverage: [...new Set(mechanicEvaluation.byTag.map(entry => entry.coverage))].join(';'),
            unobservedTags: tagMeasurements.filter(entry => entry.evidenceStatus !== 'event_observed').map(entry => entry.tag).join(';')
          });
          const partyComposition = party.slice().sort().join('+');
          const enemyComposition = enemies.slice().sort().join('+');
          const key = `${summary.candidate}|${wearer}|${difficulty}|${length}|${partyComposition}|${enemyComposition}`;
          if (!accumulated.has(key)) accumulated.set(key, { candidate: summary.candidate, wearer, mechanicTags: mechanicEvaluation.tags.join(';'), measurementPlan: measurementPlanLabel(mechanicEvaluation), unobservedTags: tagMeasurements.filter(entry => entry.evidenceStatus !== 'event_observed').map(entry => entry.tag).join(';'), requiredCoverage: [...new Set(mechanicEvaluation.byTag.map(entry => entry.coverage))].join(';'), difficulty, length, partyComposition, enemyComposition, enemyCategory: summary.enemyCategories.join('+'), allyCount: party.length, enemyCount: enemies.length, formations: 0, controlWin: 0, treatmentWin: 0, controlDraw: 0, treatmentDraw: 0, controlRating: 0, treatmentRating: 0, ratingDelta: 0, winDelta: 0, hpSwing: 0, bae: 0, impact: {} });
          const aggregate = accumulated.get(key); aggregate.formations++; aggregate.controlWin += summary.winRate.control / 100; aggregate.treatmentWin += summary.winRate.treatment / 100; aggregate.controlDraw += summary.winRate.controlDrawRatePct / 100; aggregate.treatmentDraw += summary.winRate.treatmentDrawRatePct / 100; aggregate.controlRating += summary.outcomeRating.control; aggregate.treatmentRating += summary.outcomeRating.treatment; aggregate.ratingDelta += summary.outcomeRating.difference; aggregate.winDelta += summary.winRate.differencePercentagePoints; aggregate.hpSwing += summary.hpSwing.mean; aggregate.bae += summary.bae.mean;
          for (const [metric, estimate] of Object.entries(summary.impact)) aggregate.impact[metric] = (aggregate.impact[metric] || 0) + estimate.mean;
        }
      }
      if (scenarios % progressEvery === 0 || scenarios === targetScenarios)
        console.log(`Progress: ${scenarios.toLocaleString()}/${targetScenarios.toLocaleString()} scenario cells; ${comparisons.toLocaleString()} candidate/wearer comparisons.`);
  }
  await new Promise((resolve, reject) => out.end(error => error ? reject(error) : resolve()));
  const summaryFile = options.output.replace(/\.jsonl$/i, '') + '-summary.csv';
  const expectedEnemyClassMixes = [...new Set(enemyTeams.map(enemies => enemyClassMix(enemies, library)))].sort();
  const expectedBenchmarkStrata = [];
  for (const partySize of [1, 2, 3, 4]) for (const enemyCount of [1, 2, 3, 4, 5])
    for (const enemyBand of ['common_only', 'elite_present', 'boss_present'])
      for (const length of LENGTHS) for (const difficulty of DIFFICULTIES)
        expectedBenchmarkStrata.push(`${partySize}|${enemyCount}|${enemyBand}|${length}|${difficulty}`);
  writeBenchmarkArtifacts(options.output, ratingSamples, sampledScenarioCoverage, expectedEnemyClassMixes, expectedBenchmarkStrata, options, scenarios, comparisons);
  const compositionMeans = [...accumulated.values()].map(row => ({ ...row,
    controlWin: row.controlWin / row.formations, treatmentWin: row.treatmentWin / row.formations, controlDraw: row.controlDraw / row.formations, treatmentDraw: row.treatmentDraw / row.formations,
    controlRating: row.controlRating / row.formations, treatmentRating: row.treatmentRating / row.formations, ratingDelta: row.ratingDelta / row.formations,
    winDelta: row.winDelta / row.formations, hpSwing: row.hpSwing / row.formations, bae: row.bae / row.formations,
    impact: Object.fromEntries(Object.entries(row.impact).map(([metric, value]) => [metric, value / row.formations])) }));
  const strata = new Map();
  for (const row of compositionMeans) {
    const key = `${row.candidate}|${row.wearer}|${row.difficulty}|${row.length}|${row.allyCount}|${row.enemyCount}|${row.enemyCategory}`;
    if (!strata.has(key)) strata.set(key, { candidate: row.candidate, wearer: row.wearer, difficulty: row.difficulty, length: row.length, allyCount: row.allyCount, enemyCount: row.enemyCount, enemyCategory: row.enemyCategory, compositionPairs: 0, controlWin: 0, treatmentWin: 0, controlDraw: 0, treatmentDraw: 0, controlRating: 0, treatmentRating: 0, ratingDelta: 0, winDelta: 0, hpSwing: 0, bae: 0, impact: {} });
    const aggregate = strata.get(key); aggregate.compositionPairs++; aggregate.controlWin += row.controlWin; aggregate.treatmentWin += row.treatmentWin; aggregate.controlDraw += row.controlDraw; aggregate.treatmentDraw += row.treatmentDraw; aggregate.controlRating += row.controlRating; aggregate.treatmentRating += row.treatmentRating; aggregate.ratingDelta += row.ratingDelta; aggregate.winDelta += row.winDelta; aggregate.hpSwing += row.hpSwing; aggregate.bae += row.bae;
    for (const [metric, value] of Object.entries(row.impact)) aggregate.impact[metric] = (aggregate.impact[metric] || 0) + value;
  }
  const rows = [...strata.values()];
  fs.writeFileSync(summaryFile, [
    'candidate,wearer,comparisonReference,mechanicTags,measurementPlan,unobservedTags,requiredCoverage,difficulty,length,allyCount,enemyCount,enemyCategory,equallyWeightedCompositionPairs,outcomeRatingBefore,outcomeRatingAfter,outcomeRatingDifference,winRateBeforePct,winRateAfterPct,drawRateBeforePct,drawRateAfterPct,differencePercentagePoints,meanHpSwing,meanBAE,enemyHpRemovedDelta,allyHpRetainedDelta,allyDamageDealtDelta,allyDamageTakenDelta,allyHealingDelta,allyShieldGrantedDelta,allyShieldAbsorbedDelta,allyEnergyGrantedDelta,allyEnergyGainedDelta,allyEnergySpentDelta,allyEnergyRemainingDelta,allySkillPointsGrantedDelta,allyTurnsDelta,enemyTurnsDelta',
    ...rows.map(row => [row.candidate, row.wearer, row.comparisonReference, row.mechanicTags, row.measurementPlan, row.unobservedTags, row.requiredCoverage, row.difficulty, row.length, row.allyCount, row.enemyCount, row.enemyCategory, row.compositionPairs, row.controlRating / row.compositionPairs, row.treatmentRating / row.compositionPairs, row.ratingDelta / row.compositionPairs, row.controlWin / row.compositionPairs * 100, row.treatmentWin / row.compositionPairs * 100, row.controlDraw / row.compositionPairs * 100, row.treatmentDraw / row.compositionPairs * 100, row.winDelta / row.compositionPairs, row.hpSwing / row.compositionPairs, row.bae / row.compositionPairs, row.impact.enemyHpRemoved / row.compositionPairs, row.impact.allyHpRetained / row.compositionPairs, row.impact.damageDealt / row.compositionPairs, row.impact.damageTaken / row.compositionPairs, row.impact.healing / row.compositionPairs, row.impact.shieldsGranted / row.compositionPairs, row.impact.shieldsAbsorbed / row.compositionPairs, row.impact.energyGranted / row.compositionPairs, row.impact.energyGained / row.compositionPairs, row.impact.energySpent / row.compositionPairs, row.impact.energyRemaining / row.compositionPairs, row.impact.skillPointsGranted / row.compositionPairs, row.impact.allyTurns / row.compositionPairs, row.impact.enemyTurns / row.compositionPairs].map(csvEscape).join(','))
  ].join('\n') + '\n');
  const chartFile = options.output.replace(/\.jsonl$/i, '') + '-winrate.svg';
  fs.writeFileSync(chartFile, makeWinRateSvg(rows));
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
  console.log(`Completed ${scenarios.toLocaleString()} scenario cells and ${comparisons.toLocaleString()} candidate/wearer comparisons.`);
  console.log(`Detailed pairs: ${options.output}`);
  console.log(`Stratified averages: ${summaryFile}`);
  console.log(`Win-rate chart: ${chartFile}`);
}
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

export { archetypeLibrary, candidateSpecs, enemyLineups, impactDeltas, makeBaseConfig, makeBranches, orderedUniqueTeams };
