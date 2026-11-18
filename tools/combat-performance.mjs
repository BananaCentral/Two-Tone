#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { simulateBattle } from './combat-simulator.mjs';
import { CHARACTER_COMBAT_DATA, CHARACTER_UPGRADE_EFFECTS, COMBAT_MECHANIC_TAGS, ENEMY_COMBAT_DATA, RUNE_COMBAT_RULES } from '../src/scripts/combat-definitions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHARACTER_IDS = ['soul', 'lily', 'dawn', 'logan', 'zero'];
const ENEMY_IDS = ['slime', 'wolf', 'hawk', 'geode', 'goblin', 'bear'];
const RUNES = ['radiant-moon', 'eternal-sun', 'celestial-star', 'dark-matter', 'clear-skies', 'infinite-space', 'recycle', 'amplify', 'united'];
const CHARACTER_PASSIVES = Object.entries(CHARACTER_COMBAT_DATA).flatMap(([character, kit]) =>
  kit.passives.map(passive => ({ character, id: passive.id || passive.type })));
const LENGTHS = ['short', 'medium', 'long'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const RUNE_MAIN = ['hp', 'attack', 'physicalDefense', 'magicalDefense'];
const SVP_GAINS = { hp: 100, attack: 20, physicalDefense: 4, magicalDefense: 4, speed: 20 };

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
function statBudget(stats) {
  const attack = Number.isFinite(stats.attack) ? stats.attack : (stats.physicalAttack || 0) + (stats.magicalAttack || 0);
  return stats.hp + 5 * attack + 25 * (stats.physicalDefense || 0) + 25 * (stats.magicalDefense || 0) + 5 * stats.speed;
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
      for (const stat of ['attack', 'physicalAttack', 'magicalAttack']) if (Number.isFinite(archetype.stats[stat])) archetype.stats[stat] *= pressure;
      archetype.stats.physicalDefense *= pressure;
      archetype.stats.magicalDefense *= pressure;
    }
    archetypeCache?.set(profileKey, archetypes);
  }
  // Every enemy composition is scaled to its frozen length profile, not to the candidate's performance.
  return {
    version: 1,
    name: `${difficulty}/${length}: ${allies.join('+')} vs ${enemies.join('+')}`,
    settings: { initialSkillPoints: 3, skillPointCap: 5, maxActions: 2000 },
    archetypes,
    teams: {
      allies: allies.map((archetype, slot) => ({ id: `ally-${slot}-${archetype}`, archetype, slot })),
      enemies: enemies.map((archetype, slot) => ({ id: `enemy-${slot}-${archetype}`, archetype, slot }))
    }
  };
}
function candidateSpecs(raw) {
  if (raw === 'all-upgrade-effects') return Object.values(CHARACTER_UPGRADE_EFFECTS).map(effect => ({ type: 'upgrade', id: effect.id, character: effect.character, source: effect.source }));
  if (raw === 'all-actions') return [...CHARACTER_IDS.flatMap(character => ['basic', 'skill', 'ultimate'].map(id => ({ type: 'action', id, character }))), ...Object.keys(SVP_GAINS).map(id => ({ type: 'stat', id }))];
  if (raw === 'all-passives') return [...CHARACTER_PASSIVES.map(spec => ({ type: 'passive', ...spec })), ...Object.keys(SVP_GAINS).map(id => ({ type: 'stat', id }))];
  if (raw === 'all-character-mechanics') return [
    ...CHARACTER_PASSIVES.map(spec => ({ type: 'passive', ...spec })),
    ...CHARACTER_IDS.flatMap(character => ['basic', 'skill', 'ultimate'].map(id => ({ type: 'action', id, character }))),
    ...CHARACTER_IDS.map(character => ({ type: 'character-overall', id: character, character })),
    ...Object.keys(SVP_GAINS).map(id => ({ type: 'stat', id }))
  ];
  if (raw === 'all-rune-ratings') return [...RUNES.map(id => ({ type: 'rune', id })), ...Object.keys(SVP_GAINS).map(id => ({ type: 'stat', id }))];
  if (raw === 'all-runes') return RUNES.map(id => ({ type: 'rune', id }));
  if (raw === 'all-stats') return Object.keys(SVP_GAINS).map(id => ({ type: 'stat', id }));
  if (raw === 'all-weapons') return ['standard', 'premium'].flatMap(type => [1, 2, 3, 4, 5].flatMap(potential => [1, 10, 25, 50].map(level => ({ type: 'weapon', id: type, potential, level }))));
  const [type, ...rest] = raw.split(':');
  const value = rest.join(':');
  if (type === 'rune' && RUNES.includes(value)) return [{ type, id: value }];
  if ((type === 'character' || type === 'character-overall') && CHARACTER_IDS.includes(value)) return [{ type, id: value, character: value }];
  if (type === 'passive' && /^(soul|lily|dawn|logan|zero)\/[A-Za-z][A-Za-z0-9-]*$/.test(value)) {
    const [character, id] = value.split('/');
    if (CHARACTER_PASSIVES.some(spec => spec.character === character && spec.id === id)) return [{ type, id, character }];
  }
  if (type === 'upgrade' && CHARACTER_UPGRADE_EFFECTS[value]) {
    const effect = CHARACTER_UPGRADE_EFFECTS[value];
    return [{ type, id: effect.id, character: effect.character, source: effect.source }];
  }
  if (type === 'stat' && Object.hasOwn(SVP_GAINS, value)) return [{ type, id: value }];
  if (type === 'action' && /^(soul|lily|dawn|logan|zero)\/(basic|skill|ultimate)$/.test(value)) {
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
  return `${spec.type}:${spec.id}${spec.potential ? `@P${spec.potential}L${spec.level || 1}` : ''}`;
}
function componentFor(spec) {
  if (spec.type === 'action') return CHARACTER_COMBAT_DATA[spec.character]?.[spec.id] || null;
  if (spec.type === 'passive') return CHARACTER_COMBAT_DATA[spec.character]?.passives.find(effect => (effect.id || effect.type) === spec.id) || null;
  if (spec.type === 'upgrade') return CHARACTER_UPGRADE_EFFECTS[spec.id] || null;
  if (spec.type === 'rune') return RUNE_COMBAT_RULES[spec.id] || null;
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
          : spec.type === 'character-overall' ? [
            ...(CHARACTER_COMBAT_DATA[spec.character]?.passives || []).map(effect => `passive:${spec.character}/${effect.id || effect.type}`),
            ...['basic', 'skill', 'ultimate'].map(slot => `action:${spec.character}/${slot}`)
          ] : [];
  for (const tag of tags) assert(TAG_MEASUREMENT_RULES[tag], `No event-evidence rule for ${tag} on ${candidateLabel(spec)}.`);
  return { tags, componentIds, byTag: tags.map(tag => ({ tag, measurementFields: TAG_MEASUREMENT_RULES[tag],
    target: component?.mechanicTargets?.[tag] || component?.targeting || null,
    trigger: component?.mechanicTriggers?.[tag] || null,
    coverage: component?.mechanicTargets?.[tag]?.coverage || component?.targeting?.coverage || 'event_defined' })) };
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
  if (spec.id === 'radiant-moon') return party.filter(id => ['lily', 'zero'].includes(id));
  if (spec.id === 'eternal-sun') return party.filter(id => id !== 'dawn');
  if (spec.id === 'united') return party.filter(id => ['dawn', 'logan'].includes(id));
  return party.slice();
}
function findUnit(config, archetype) { return config.teams.allies.find(unit => unit.archetype === archetype); }
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
  let treatmentStatBudget = null;
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
  } else if (spec.type === 'stat') {
    // Use the same setless four-Rune stat loadout as Rune-effect comparisons.
    controlled.runes = makeBalancedRunes();
    treated.runes = makeBalancedRunes();
    const before = statBudget(treatment.archetypes[wearer].stats);
    const stats = treatment.archetypes[wearer].stats;
    if (spec.id === 'attack' && !Number.isFinite(stats.attack)) {
      const physical = stats.physicalAttack || 0, magical = stats.magicalAttack || 0, total = physical + magical;
      if (total > 0) {
        stats.physicalAttack = physical + SVP_GAINS.attack * physical / total;
        stats.magicalAttack = magical + SVP_GAINS.attack * magical / total;
      } else stats.physicalAttack = SVP_GAINS.attack;
    } else stats[spec.id] += SVP_GAINS[spec.id];
    treatmentStatBudget = statBudget(treatment.archetypes[wearer].stats) - before;
  } else if (spec.type === 'character' || spec.type === 'character-overall') {
    const archetype = control.archetypes[wearer];
    archetype.passives = [];
    delete archetype.skill;
    delete archetype.ultimate;
    control.settings.disabledPassives = [...(control.settings.disabledPassives || []), ...CHARACTER_PASSIVES.filter(passive => passive.character === wearer).map(passive => `${wearer}:${passive.id}`)];
    if (spec.type === 'character-overall') {
      const basic = archetype.basic;
      archetype.basic = { damageType: basic.damageType, multiplier: 1, target: 'single', energyGain: 10, skillPointGain: 1 };
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
      const basic = treatment.archetypes[wearer].basic;
      control.archetypes[wearer].basic = {
        damageType: basic.damageType,
        multiplier: 1,
        target: 'single',
        energyGain: 10,
        skillPointGain: 1
      };
    }
  }
  return { control, treatment, treatmentStatBudget };
}
function winValue(result) { return result.winner === 'allies' ? 1 : 0; }
function average(values) { return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0; }
function meanCI(values) {
  const mean = average(values);
  if (values.length < 2) return { mean, lower: mean, upper: mean };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  const margin = 1.96 * Math.sqrt(variance / values.length);
  return { mean, lower: mean - margin, upper: mean + margin };
}
function percentCI(values) {
  const interval = meanCI(values);
  return { mean: interval.mean * 100, lower: interval.lower * 100, upper: interval.upper * 100 };
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
    bae: (enemyHpDelta + allyHpRetainedDelta) / 16,
    impact: impactDeltas(control, treatment),
    mechanicEventDeltas: mechanicEventDeltas(control, treatment),
    mechanicEventCapture: { controlDropped: control.mechanicEvents?.dropped || 0, treatmentDropped: treatment.mechanicEvents?.dropped || 0 },
    control: {
      winner: control.winner, actions: control.actions, allyTurns: control.allyTurns, enemyTurns: control.enemyTurns,
      finalHp: control.finalHp, damageDealt: control.damageDealt, shields: control.alliedShieldAbsorbed,
      skillPoints: control.skillPointsRemaining, actionOverride: control.actionOverride,
      statBudgets: control.statBudgets,
      survivors: { allies: control.survivors.allies.length, enemies: control.survivors.enemies.length }
    },
    treatment: {
      winner: treatment.winner, actions: treatment.actions, allyTurns: treatment.allyTurns, enemyTurns: treatment.enemyTurns,
      finalHp: treatment.finalHp, damageDealt: treatment.damageDealt, shields: treatment.alliedShieldAbsorbed,
      skillPoints: treatment.skillPointsRemaining, actionOverride: treatment.actionOverride,
      statBudgets: treatment.statBudgets,
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
  const options = { candidates: [], preset: 'quick', runs: 5, seed: 1, output: 'Documentation/combat-simulator/performance-results.jsonl', limitScenarios: 180, maxActions: 2000, compact: true, runeRating: false, mechanicRating: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--preset') {
      const preset = args[++index];
      options.preset = preset;
      if (preset === 'quick') Object.assign(options, { runs: 5, limitScenarios: 180, compact: true });
      else if (preset === 'balanced') Object.assign(options, { runs: 10, limitScenarios: 360, compact: true });
      else if (preset === 'deep') Object.assign(options, { runs: 20, limitScenarios: 1000, compact: true });
      else if (preset === 'full') Object.assign(options, { runs: 100, limitScenarios: 0, compact: true });
      else fail(`Unknown preset ${preset}. Choose quick, balanced, deep, or full.`);
    }
    else if (arg === '--candidate') {
      const raw = args[++index];
      options.candidates.push(...candidateSpecs(raw));
      if (raw === 'all-rune-ratings') options.runeRating = true;
      if (['all-character-mechanics', 'all-actions', 'all-passives', 'all-upgrade-effects'].includes(raw) || raw.startsWith('upgrade:')) options.mechanicRating = true;
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
    options.candidates = candidateSpecs('all-rune-ratings');
    options.runeRating = true;
  }
  if (options.character && !CHARACTER_IDS.includes(options.character)) fail(`Unknown character ${options.character}.`);
  assert(Number.isInteger(options.runs) && options.runs > 0, '--runs must be a positive integer.');
  assert(Number.isInteger(options.seed) && options.seed >= 0, '--seed must be a non-negative integer.');
  assert(Number.isInteger(options.limitScenarios) && options.limitScenarios >= 0, '--limit-scenarios must be zero (all) or a positive integer.');
  assert(Number.isInteger(options.maxActions) && options.maxActions > 0, '--max-actions must be a positive integer.');
  return options;
}
function help() {
  return `Two-Tone matched combat performance runner\n\nUsage: node tools/combat-performance.mjs [options]\n\nOptions:\n  --preset quick|balanced|deep|full  Select a coverage/run-count preset (default quick)\n  --candidate all-rune-ratings|all-runes|all-stats|all-weapons\n  --candidate all-actions|all-passives|all-character-mechanics|all-upgrade-effects\n  --candidate rune:<id>|character:<id>|passive:<character>/<id>|stat:<id>\n  --candidate upgrade:<effect-id>\n  --candidate weapon:standard@P1L1|weapon:premium@P1L50\n  --candidate action:<character>/basic|skill|ultimate\n  --character <id>           Restrict item/stat tests to this eligible wearer\n  --runs <n>                  Matched seeds per matchup\n  --seed <n>                  First reproducible seed (default 1)\n  --limit-scenarios <n>       Scenario cap; use 0 for the full matrix\n  --max-actions <n>           Maximum unit actions in one battle (default 2000)\n  --output <path>             JSONL result path\n  --include-trials            Include per-seed details (larger output)\n\nWithout --candidate, tests all Runes against the average +100 SVP stat reference and writes a rating report. Presets: quick=180 scenarios × 5 seeds; balanced=360 × 10; deep=1,000 × 20; full=all 17,213,850 × 100. Limited presets balance party size, enemy count, length, and difficulty. The full position-aware matrix uses 205 ordered legal ally teams and 9,330 ordered enemy lineups.`;
}
function* scenarioSamples(allyLists, enemyTeams, limit) {
  if (!limit) {
    for (const party of allyLists) for (const enemies of enemyTeams)
      for (const length of LENGTHS) for (const difficulty of DIFFICULTIES)
        yield { party, enemies, length, difficulty };
    return;
  }
  const partyGroups = new Map(), enemyGroups = new Map();
  for (const party of allyLists) {
    const group = partyGroups.get(party.length) || [];
    group.push(party); partyGroups.set(party.length, group);
  }
  for (const enemies of enemyTeams) {
    const group = enemyGroups.get(enemies.length) || [];
    group.push(enemies); enemyGroups.set(enemies.length, group);
  }
  const strata = [];
  for (const partySize of [1, 2, 3, 4]) for (const enemyCount of [1, 2, 3, 4, 5])
    for (const length of LENGTHS) for (const difficulty of DIFFICULTIES)
      if (partyGroups.has(partySize) && enemyGroups.has(enemyCount)) strata.push({ partySize, enemyCount, length, difficulty });
  const count = Math.min(limit, allyLists.length * enemyTeams.length * LENGTHS.length * DIFFICULTIES.length);
  const perStratum = Math.floor(count / strata.length), remainder = count % strata.length;
  for (let index = 0; index < strata.length; index++) {
    const stratum = strata[index], parties = partyGroups.get(stratum.partySize), enemies = enemyGroups.get(stratum.enemyCount);
    const quota = perStratum + (index < remainder ? 1 : 0);
    for (let sample = 0; sample < quota; sample++) {
      const partyIndex = (index * 13 + sample * 7) % parties.length;
      const enemyIndex = (index * 17 + sample * 11) % enemies.length;
      yield { party: parties[partyIndex], enemies: enemies[enemyIndex], length: stratum.length, difficulty: stratum.difficulty };
    }
  }
}
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function quantile(sortedValues, probability) {
  if (!sortedValues.length) return 0;
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position), upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const ratio = position - lower;
  return sortedValues[lower] * (1 - ratio) + sortedValues[upper] * ratio;
}
function buildRuneRatingRows(samples, runCount, seed) {
  const scenarioGroups = new Map();
  for (const sample of samples) {
    const key = `${sample.wearer}|${sample.scenarioId}`;
    if (!scenarioGroups.has(key)) scenarioGroups.set(key, { stats: new Map(), runes: [] });
    const group = scenarioGroups.get(key);
    if (sample.candidate.startsWith('stat:')) group.stats.set(sample.candidate.slice(5), sample);
    else group.runes.push(sample);
  }
  const formationGroups = new Map();
  for (const scenario of scenarioGroups.values()) {
    if (!scenario.runes.length) continue;
    assert(scenario.stats.size === Object.keys(SVP_GAINS).length, `Rune rating requires all five 100-SVP stat controls for ${scenario.runes[0].wearer}.`);
    for (const rune of scenario.runes) {
      const reference = Array.from({ length: runCount }, (_, index) => average([...scenario.stats.values()].map(stat => stat.winDeltas[index])));
      const referenceBae = Array.from({ length: runCount }, (_, index) => average([...scenario.stats.values()].map(stat => stat.baeValues[index])));
      const gap = rune.winDeltas.map((value, index) => value - reference[index]);
      const stratum = [rune.difficulty, rune.length, rune.allyCount, rune.enemyCount, rune.enemyCategory].join('|');
      const composition = `${rune.partyComposition}|${rune.enemyComposition}`;
      const key = `${rune.candidate}|${rune.wearer}|${stratum}|${composition}`;
      if (!formationGroups.has(key)) formationGroups.set(key, {
        rune: rune.candidate.slice(5), wearer: rune.wearer, stratum, composition,
        deltas: Array(runCount).fill(0), references: Array(runCount).fill(0), gaps: Array(runCount).fill(0),
        bae: Array(runCount).fill(0), referenceBae: Array(runCount).fill(0), formations: 0
      });
      const aggregate = formationGroups.get(key);
      aggregate.formations++;
      for (let index = 0; index < runCount; index++) {
        aggregate.deltas[index] += rune.winDeltas[index];
        aggregate.references[index] += reference[index];
        aggregate.gaps[index] += gap[index];
        aggregate.bae[index] += rune.baeValues[index];
        aggregate.referenceBae[index] += referenceBae[index];
      }
    }
  }
  const runes = new Map();
  for (const group of formationGroups.values()) {
    for (const field of ['deltas', 'references', 'gaps', 'bae', 'referenceBae']) group[field] = group[field].map(value => value / group.formations);
    if (!runes.has(group.rune)) runes.set(group.rune, new Map());
    const byWearer = runes.get(group.rune);
    if (!byWearer.has(group.wearer)) byWearer.set(group.wearer, new Map());
    const strata = byWearer.get(group.wearer);
    if (!strata.has(group.stratum)) strata.set(group.stratum, []);
    strata.get(group.stratum).push(group);
  }
  function summarizeWearer(strata) {
    const deltaBySeed = Array(runCount).fill(0), referenceBySeed = Array(runCount).fill(0), gapBySeed = Array(runCount).fill(0), baeBySeed = Array(runCount).fill(0), referenceBaeBySeed = Array(runCount).fill(0);
    const positiveStrata = [];
    for (const compositions of strata.values()) {
      const delta = Array(runCount).fill(0), reference = Array(runCount).fill(0), gap = Array(runCount).fill(0), bae = Array(runCount).fill(0), referenceBae = Array(runCount).fill(0);
      for (const composition of compositions) for (let index = 0; index < runCount; index++) {
        delta[index] += composition.deltas[index]; reference[index] += composition.references[index];
        gap[index] += composition.gaps[index]; bae[index] += composition.bae[index];
        referenceBae[index] += composition.referenceBae[index];
      }
      for (let index = 0; index < runCount; index++) {
        delta[index] /= compositions.length; reference[index] /= compositions.length;
        gap[index] /= compositions.length; bae[index] /= compositions.length;
        referenceBae[index] /= compositions.length;
        deltaBySeed[index] += delta[index]; referenceBySeed[index] += reference[index];
        gapBySeed[index] += gap[index]; baeBySeed[index] += bae[index]; referenceBaeBySeed[index] += referenceBae[index];
      }
      positiveStrata.push(average(delta) > 0 ? 1 : 0);
    }
    const count = strata.size;
    for (let index = 0; index < runCount; index++) {
      deltaBySeed[index] /= count; referenceBySeed[index] /= count;
      gapBySeed[index] /= count; baeBySeed[index] /= count;
      referenceBaeBySeed[index] /= count;
    }
    return { deltaBySeed, referenceBySeed, gapBySeed, baeBySeed, referenceBaeBySeed, positiveStrataPct: average(positiveStrata) * 100, strataCount: count };
  }
  const random = seededRandom(seed), bootstrapRuns = 1000;
  function bootstrapCI(byWearer, selectedWearer = null) {
    const wearers = selectedWearer ? [selectedWearer] : [...byWearer.keys()];
    const estimates = [];
    for (let iteration = 0; iteration < bootstrapRuns; iteration++) {
      const sampledSeeds = Array.from({ length: runCount }, () => Math.floor(random() * runCount));
      const wearerMeans = [];
      for (const wearer of wearers) {
        const strata = byWearer.get(wearer), stratumMeans = [];
        for (const compositions of strata.values()) {
          let stratumRune = 0, stratumReference = 0, stratumGap = 0, stratumBae = 0, stratumReferenceBae = 0;
          for (let index = 0; index < compositions.length; index++) {
            const composition = compositions[Math.floor(random() * compositions.length)];
            stratumRune += average(sampledSeeds.map(seedIndex => composition.deltas[seedIndex]));
            stratumReference += average(sampledSeeds.map(seedIndex => composition.references[seedIndex]));
            stratumGap += average(sampledSeeds.map(seedIndex => composition.gaps[seedIndex]));
            stratumBae += average(sampledSeeds.map(seedIndex => composition.bae[seedIndex]));
            stratumReferenceBae += average(sampledSeeds.map(seedIndex => composition.referenceBae[seedIndex]));
          }
          stratumMeans.push({
            rune: stratumRune / compositions.length,
            reference: stratumReference / compositions.length,
            gap: stratumGap / compositions.length,
            bae: stratumBae / compositions.length,
            referenceBae: stratumReferenceBae / compositions.length
          });
        }
        wearerMeans.push({
          rune: average(stratumMeans.map(value => value.rune)),
          reference: average(stratumMeans.map(value => value.reference)),
          gap: average(stratumMeans.map(value => value.gap)),
          bae: average(stratumMeans.map(value => value.bae)),
          referenceBae: average(stratumMeans.map(value => value.referenceBae))
        });
      }
      const rune = average(wearerMeans.map(value => value.rune));
      const reference = average(wearerMeans.map(value => value.reference));
      estimates.push({
        gap: average(wearerMeans.map(value => value.gap)),
        runeBae: average(wearerMeans.map(value => value.bae)),
        referenceBae: average(wearerMeans.map(value => value.referenceBae)),
        winScore: reference > 0 ? Math.max(0, Math.min(100, 100 * rune / reference)) : 0
      });
    }
    const gaps = estimates.map(value => value.gap).sort((a, b) => a - b);
    const scores = estimates.map(value => {
      const actionScore = value.referenceBae > 0 ? Math.max(0, Math.min(100, 100 * value.runeBae / value.referenceBae)) : 0;
      return Math.sqrt(value.winScore * actionScore);
    }).sort((a, b) => a - b);
    return {
      lower: quantile(gaps, 0.025), upper: quantile(gaps, 0.975),
      scoreLower: quantile(scores, 0.025), scoreUpper: quantile(scores, 0.975)
    };
  }
  const overallRows = [], wearerRows = [];
  for (const rune of RUNES) {
    const byWearer = runes.get(rune);
    if (!byWearer?.size) continue;
    const wearerSummaries = [...byWearer].map(([wearer, strata]) => ({ wearer, ...summarizeWearer(strata) }));
    for (const summary of wearerSummaries) {
      const ci = bootstrapCI(byWearer, summary.wearer);
      wearerRows.push({ rune, wearer: summary.wearer, strata: summary.strataCount,
        runeWinLiftPp: average(summary.deltaBySeed) * 100,
        mean100SVPReferencePp: average(summary.referenceBySeed) * 100,
        winLiftScore0to100: average(summary.referenceBySeed) > 0 ? Math.max(0, Math.min(100, 100 * average(summary.deltaBySeed) / average(summary.referenceBySeed))) : 0,
        meanBAE: average(summary.baeBySeed), mean100SVPReferenceBAE: average(summary.referenceBaeBySeed),
        actionValueScore0to100: average(summary.referenceBaeBySeed) > 0 ? Math.max(0, Math.min(100, 100 * average(summary.baeBySeed) / average(summary.referenceBaeBySeed))) : 0,
        score0to100: Math.sqrt(
          (average(summary.referenceBySeed) > 0 ? Math.max(0, Math.min(100, 100 * average(summary.deltaBySeed) / average(summary.referenceBySeed))) : 0) *
          (average(summary.referenceBaeBySeed) > 0 ? Math.max(0, Math.min(100, 100 * average(summary.baeBySeed) / average(summary.referenceBaeBySeed))) : 0)
        ),
        score95Lower: ci.scoreLower, score95Upper: ci.scoreUpper,
        differenceVsReferencePp: average(summary.gapBySeed) * 100,
        ci95LowerPp: ci.lower * 100, ci95UpperPp: ci.upper * 100,
        rating: ci.lower > 0 ? 'Above 100-SVP reference' : ci.upper < 0 ? 'Below 100-SVP reference' : 'Within reference range',
        positiveWinLiftStrataPct: summary.positiveStrataPct,
        meanHpSwing: average(summary.baeBySeed) * 16
      });
    }
    const combined = {
      deltaBySeed: Array.from({ length: runCount }, (_, index) => average(wearerSummaries.map(row => row.deltaBySeed[index]))),
      referenceBySeed: Array.from({ length: runCount }, (_, index) => average(wearerSummaries.map(row => row.referenceBySeed[index]))),
      gapBySeed: Array.from({ length: runCount }, (_, index) => average(wearerSummaries.map(row => row.gapBySeed[index]))),
      baeBySeed: Array.from({ length: runCount }, (_, index) => average(wearerSummaries.map(row => row.baeBySeed[index]))),
      referenceBaeBySeed: Array.from({ length: runCount }, (_, index) => average(wearerSummaries.map(row => row.referenceBaeBySeed[index]))),
      positiveStrataPct: average(wearerSummaries.map(row => row.positiveStrataPct))
    };
    const ci = bootstrapCI(byWearer);
    const winLiftScore = average(combined.referenceBySeed) > 0 ? Math.max(0, Math.min(100, 100 * average(combined.deltaBySeed) / average(combined.referenceBySeed))) : 0;
    const actionValueScore = average(combined.referenceBaeBySeed) > 0 ? Math.max(0, Math.min(100, 100 * average(combined.baeBySeed) / average(combined.referenceBaeBySeed))) : 0;
    overallRows.push({ rune, eligibleWearers: [...byWearer.keys()].join(';'), wearerCount: byWearer.size,
      runeWinLiftPp: average(combined.deltaBySeed) * 100,
      mean100SVPReferencePp: average(combined.referenceBySeed) * 100,
      winLiftScore0to100: winLiftScore,
      meanBAE: average(combined.baeBySeed), mean100SVPReferenceBAE: average(combined.referenceBaeBySeed),
      actionValueScore0to100: actionValueScore,
      score0to100: Math.sqrt(winLiftScore * actionValueScore),
      score95Lower: ci.scoreLower, score95Upper: ci.scoreUpper,
      differenceVsReferencePp: average(combined.gapBySeed) * 100,
      ci95LowerPp: ci.lower * 100, ci95UpperPp: ci.upper * 100,
      rating: ci.lower > 0 ? 'Above 100-SVP reference' : ci.upper < 0 ? 'Below 100-SVP reference' : 'Within reference range',
      positiveWinLiftStrataPct: combined.positiveStrataPct,
      meanHpSwing: average(combined.baeBySeed) * 16
    });
  }
  return { overallRows, wearerRows };
}
function buildMechanicRatingRows(samples, runCount, seed) {
  // Same matched, stratified reference score used for Runes. Candidate controls
  // are five +100-SVP investments; each mechanic is paired against the same
  // wearer, matchup, and seeds. This scores impact, not standalone damage.
  const scenarioGroups = new Map(), candidateMetadata = new Map();
  for (const sample of samples) {
    if (!sample.candidate.startsWith('stat:') && !candidateMetadata.has(sample.candidate)) candidateMetadata.set(sample.candidate, {
      mechanicTags: sample.mechanicTags, measurementPlan: sample.measurementPlan,
      requiredCoverage: sample.requiredCoverage, unobservedTags: sample.unobservedTags
    });
    const key = `${sample.wearer}|${sample.scenarioId}`;
    if (!scenarioGroups.has(key)) scenarioGroups.set(key, { stats: new Map(), candidates: [] });
    const group = scenarioGroups.get(key);
    if (sample.candidate.startsWith('stat:')) group.stats.set(sample.candidate.slice(5), sample);
    else group.candidates.push(sample);
  }
  const formationGroups = new Map();
  for (const scenario of scenarioGroups.values()) {
    if (!scenario.candidates.length) continue;
    assert(scenario.stats.size === Object.keys(SVP_GAINS).length, `Mechanic rating requires all five 100-SVP stat controls for ${scenario.candidates[0].wearer}.`);
    const reference = Array.from({ length: runCount }, (_, index) => average([...scenario.stats.values()].map(stat => stat.winDeltas[index])));
    const referenceBae = Array.from({ length: runCount }, (_, index) => average([...scenario.stats.values()].map(stat => stat.baeValues[index])));
    for (const candidate of scenario.candidates) {
      const stratum = [candidate.difficulty, candidate.length, candidate.allyCount, candidate.enemyCount, candidate.enemyCategory].join('|');
      const composition = `${candidate.partyComposition}|${candidate.enemyComposition}`;
      const key = `${candidate.candidate}|${candidate.wearer}|${stratum}|${composition}`;
      if (!formationGroups.has(key)) formationGroups.set(key, {
        candidate: candidate.candidate, wearer: candidate.wearer, stratum, composition,
        deltas: Array(runCount).fill(0), references: Array(runCount).fill(0), gaps: Array(runCount).fill(0),
        bae: Array(runCount).fill(0), referenceBae: Array(runCount).fill(0), formations: 0
      });
      const aggregate = formationGroups.get(key);
      aggregate.formations++;
      for (let index = 0; index < runCount; index++) {
        aggregate.deltas[index] += candidate.winDeltas[index]; aggregate.references[index] += reference[index];
        aggregate.gaps[index] += candidate.winDeltas[index] - reference[index];
        aggregate.bae[index] += candidate.baeValues[index]; aggregate.referenceBae[index] += referenceBae[index];
      }
    }
  }
  const candidates = new Map();
  for (const group of formationGroups.values()) {
    for (const field of ['deltas', 'references', 'gaps', 'bae', 'referenceBae']) group[field] = group[field].map(value => value / group.formations);
    if (!candidates.has(group.candidate)) candidates.set(group.candidate, new Map());
    const byWearer = candidates.get(group.candidate);
    if (!byWearer.has(group.wearer)) byWearer.set(group.wearer, new Map());
    const strata = byWearer.get(group.wearer);
    if (!strata.has(group.stratum)) strata.set(group.stratum, []);
    strata.get(group.stratum).push(group);
  }
  function summarize(strata) {
    const fields = ['deltas', 'references', 'gaps', 'bae', 'referenceBae'];
    const bySeed = Object.fromEntries(fields.map(field => [field, Array(runCount).fill(0)]));
    const positive = [];
    for (const compositions of strata.values()) {
      const means = Object.fromEntries(fields.map(field => [field, Array(runCount).fill(0)]));
      for (const composition of compositions) for (const field of fields) for (let i = 0; i < runCount; i++) means[field][i] += composition[field][i];
      for (const field of fields) for (let i = 0; i < runCount; i++) bySeed[field][i] += means[field][i] / compositions.length;
      positive.push(average(means.deltas) > 0 ? 1 : 0);
    }
    for (const field of fields) for (let i = 0; i < runCount; i++) bySeed[field][i] /= strata.size;
    return { ...bySeed, positiveStrataPct: average(positive) * 100, strataCount: strata.size };
  }
  const random = seededRandom(seed), bootstrapRuns = 1000;
  function scoreOf(runeLift, referenceLift, bae, referenceBae) {
    const win = referenceLift > 0 ? Math.max(0, Math.min(100, 100 * runeLift / referenceLift)) : 0;
    const action = referenceBae > 0 ? Math.max(0, Math.min(100, 100 * bae / referenceBae)) : 0;
    return { win, action, overall: Math.sqrt(win * action) };
  }
  function bootstrap(byWearer, selectedWearer = null) {
    const wearers = selectedWearer ? [selectedWearer] : [...byWearer.keys()], estimates = [];
    for (let b = 0; b < bootstrapRuns; b++) {
      const seeds = Array.from({ length: runCount }, () => Math.floor(random() * runCount)), wearerStats = [];
      for (const wearer of wearers) {
        const strataStats = [];
        for (const compositions of byWearer.get(wearer).values()) {
          const sums = { delta: 0, reference: 0, gap: 0, bae: 0, referenceBae: 0 };
          for (let i = 0; i < compositions.length; i++) {
            const row = compositions[Math.floor(random() * compositions.length)];
            sums.delta += average(seeds.map(s => row.deltas[s])); sums.reference += average(seeds.map(s => row.references[s]));
            sums.gap += average(seeds.map(s => row.gaps[s])); sums.bae += average(seeds.map(s => row.bae[s]));
            sums.referenceBae += average(seeds.map(s => row.referenceBae[s]));
          }
          strataStats.push(Object.fromEntries(Object.entries(sums).map(([key, value]) => [key, value / compositions.length])));
        }
        wearerStats.push(Object.fromEntries(['delta', 'reference', 'gap', 'bae', 'referenceBae'].map(key => [key, average(strataStats.map(row => row[key]))])));
      }
      const combined = Object.fromEntries(['delta', 'reference', 'gap', 'bae', 'referenceBae'].map(key => [key, average(wearerStats.map(row => row[key]))]));
      estimates.push({ gap: combined.gap, score: scoreOf(combined.delta, combined.reference, combined.bae, combined.referenceBae).overall });
    }
    const scores = estimates.map(row => row.score).sort((a, b) => a - b), gaps = estimates.map(row => row.gap).sort((a, b) => a - b);
    return { scoreLower: quantile(scores, 0.025), scoreUpper: quantile(scores, 0.975), gapLower: quantile(gaps, 0.025), gapUpper: quantile(gaps, 0.975) };
  }
  const overallRows = [], wearerRows = [];
  for (const [candidate, byWearer] of candidates) {
    const metadata = candidateMetadata.get(candidate) || {};
    const summaries = [...byWearer].map(([wearer, strata]) => ({ wearer, ...summarize(strata) }));
    for (const summary of summaries) {
      const ci = bootstrap(byWearer, summary.wearer), score = scoreOf(average(summary.deltas), average(summary.references), average(summary.bae), average(summary.referenceBae));
      wearerRows.push({ candidate, ...metadata, wearer: summary.wearer, strata: summary.strataCount, winLiftPp: average(summary.deltas) * 100,
        mean100SVPReferencePp: average(summary.references) * 100, winLiftScore0to100: score.win, meanBAE: average(summary.bae),
        mean100SVPReferenceBAE: average(summary.referenceBae), actionValueScore0to100: score.action, score0to100: score.overall,
        score95Lower: ci.scoreLower, score95Upper: ci.scoreUpper, differenceVsReferencePp: average(summary.gaps) * 100,
        ci95LowerPp: ci.gapLower * 100, ci95UpperPp: ci.gapUpper * 100,
        rating: ci.gapLower > 0 ? 'Above 100-SVP reference' : ci.gapUpper < 0 ? 'Below 100-SVP reference' : 'Within reference range',
        positiveWinLiftStrataPct: summary.positiveStrataPct, meanHpSwing: average(summary.bae) * 16 });
    }
    const combined = Object.fromEntries(['deltas', 'references', 'gaps', 'bae', 'referenceBae'].map(field => [field,
      Array.from({ length: runCount }, (_, i) => average(summaries.map(row => row[field][i])))]));
    const ci = bootstrap(byWearer), score = scoreOf(average(combined.deltas), average(combined.references), average(combined.bae), average(combined.referenceBae));
    overallRows.push({ candidate, ...metadata, eligibleCharacters: [...byWearer.keys()].join(';'), characterCount: byWearer.size,
      winLiftPp: average(combined.deltas) * 100, mean100SVPReferencePp: average(combined.references) * 100,
      winLiftScore0to100: score.win, meanBAE: average(combined.bae), mean100SVPReferenceBAE: average(combined.referenceBae),
      actionValueScore0to100: score.action, score0to100: score.overall, score95Lower: ci.scoreLower, score95Upper: ci.scoreUpper,
      differenceVsReferencePp: average(combined.gaps) * 100, ci95LowerPp: ci.gapLower * 100, ci95UpperPp: ci.gapUpper * 100,
      rating: ci.gapLower > 0 ? 'Above 100-SVP reference' : ci.gapUpper < 0 ? 'Below 100-SVP reference' : 'Within reference range',
      positiveWinLiftStrataPct: average(summaries.map(row => row.positiveStrataPct)),
      meanHpSwing: average(combined.bae) * 16 });
  }
  return { overallRows, wearerRows };
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
  const allyLists = options.character ? allAllyLists.filter(party => party.includes(options.character)) : allAllyLists;
  const scaledArchetypes = new Map();
  const matrixCount = allyLists.length * enemyTeams.length * LENGTHS.length * DIFFICULTIES.length;
  console.log(`Full matrix: ${matrixCount.toLocaleString()} scenarios; ${options.runs} matched runs per candidate/wearer.`);
  const targetScenarios = options.limitScenarios ? Math.min(options.limitScenarios, matrixCount) : matrixCount;
  const progressEvery = Math.max(1, Math.ceil(targetScenarios / 20));
  for (const { party, enemies, length, difficulty } of scenarioSamples(allyLists, enemyTeams, options.limitScenarios)) {
      scenarios++;
      const base = makeBaseConfig(library, party, enemies, difficulty, length, scaledArchetypes);
      const neutralControlConfigs = new Map(), neutralControlResults = new Map();
      for (const spec of options.candidates) {
        const wearers = wearersFor(spec, party).filter(wearer => !options.character || wearer === options.character);
        for (const wearer of wearers) {
          let controlConfig, treatmentConfig, treatmentStatBudget = null;
          if (spec.type === 'rune') {
            controlConfig = neutralControlConfigs.get(wearer);
            if (!controlConfig) {
              controlConfig = makeRuneBranch(base, wearer, null);
              neutralControlConfigs.set(wearer, controlConfig);
            }
            treatmentConfig = makeRuneBranch(base, wearer, spec.id);
          } else if (spec.type === 'stat') {
            const branches = makeBranches(base, spec, wearer);
            controlConfig = neutralControlConfigs.get(wearer) || branches.control;
            neutralControlConfigs.set(wearer, controlConfig);
            treatmentConfig = branches.treatment;
            treatmentStatBudget = branches.treatmentStatBudget;
          } else {
            ({ control: controlConfig, treatment: treatmentConfig, treatmentStatBudget } = makeBranches(base, spec, wearer));
          }
          const trials = [];
          let controlRuns = neutralControlResults.get(wearer);
          const shouldCacheControl = (spec.type === 'rune' || spec.type === 'stat') && !controlRuns;
          if (shouldCacheControl) controlRuns = [];
          for (let run = 0; run < options.runs; run++) {
            const seed = options.seed + run;
            const controlResult = controlRuns?.[run] || simulateBattle(controlConfig, seed, options.maxActions);
            if (shouldCacheControl) controlRuns.push(controlResult);
            const treatmentResult = simulateBattle(treatmentConfig, seed, options.maxActions);
            trials.push(battleMetrics(controlResult, treatmentResult, seed));
          }
          if (shouldCacheControl) neutralControlResults.set(wearer, controlRuns);
          const winsControl = trials.reduce((sum, trial) => sum + trial.controlWin, 0);
          const winsTreatment = trials.reduce((sum, trial) => sum + trial.treatmentWin, 0);
          const mechanicEvaluation = evaluationPlan(spec);
          const tagMeasurements = summarizeMechanicEventDeltas(trials, mechanicEvaluation,
            trials.reduce((sum, trial) => sum + trial.mechanicEventCapture.controlDropped, 0),
            trials.reduce((sum, trial) => sum + trial.mechanicEventCapture.treatmentDropped, 0));
          const summary = {
            candidate: candidateLabel(spec),
            wearer, party, enemies,
            enemyCategories: [...new Set(enemies.map(id => library[id].tags?.type || 'unknown'))].sort(),
            difficulty, length, runs: options.runs, seed: options.seed,
            statBudgets: { wearer: statBudget(library[wearer].stats), enemies: enemies.map(id => ({ archetype: id, svp: statBudget(library[id].stats) })) },
            treatmentStatBudget,
            mechanicEvaluation,
            tagMeasurements,
            winRate: { control: winsControl / options.runs * 100, treatment: winsTreatment / options.runs * 100,
              control95CI: percentCI(trials.map(row => row.controlWin)),
              treatment95CI: percentCI(trials.map(row => row.treatmentWin)),
              controlDrawRatePct: average(trials.map(row => row.controlDraw)) * 100,
              treatmentDrawRatePct: average(trials.map(row => row.treatmentDraw)) * 100,
              differencePercentagePoints: average(trials.map(row => row.winDelta)) * 100,
              paired95CI: percentCI(trials.map(row => row.winDelta)) },
            hpSwing: meanCI(trials.map(row => row.hpSwing)),
            bae: meanCI(trials.map(row => row.bae)),
            impact: Object.fromEntries(Object.keys(trials[0]?.impact || {}).map(key => [key, meanCI(trials.map(row => row.impact[key]))])),
            averageDamage: { control: average(trials.map(row => row.controlDamage)), treatment: average(trials.map(row => row.treatmentDamage)) },
            averageAllyHpRetained: { control: average(trials.map(row => row.control.finalHp.allies)), treatment: average(trials.map(row => row.treatment.finalHp.allies)) },
            averageShieldAbsorbed: { control: average(trials.map(row => row.control.shields)), treatment: average(trials.map(row => row.treatment.shields)) },
            averageTurns: { alliesControl: average(trials.map(row => row.control.allyTurns)), alliesTreatment: average(trials.map(row => row.treatment.allyTurns)), enemiesControl: average(trials.map(row => row.control.enemyTurns)), enemiesTreatment: average(trials.map(row => row.treatment.enemyTurns)) },
            actionOverride: trials.find(row => row.treatment.actionOverride)?.treatment.actionOverride || null,
            runeDiagnostics: { averageActivations: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeActivations || 0)), averageEnergyRestored: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeEnergyRestored || 0)) },
            trials
          };
          if (options.compact) delete summary.trials;
          else summary.trials = trials.map(({ mechanicEventDeltas, ...trial }) => ({ ...trial, mechanicEventDeltas: Object.values(mechanicEventDeltas).filter(row => mechanicEvaluation.tags.includes(row.tag)) }));
          out.write(JSON.stringify(summary) + '\n');
          comparisons++;
          if ((options.runeRating && (spec.type === 'rune' || spec.type === 'stat')) ||
              (options.mechanicRating && ['passive', 'action', 'character-overall', 'stat', 'upgrade'].includes(spec.type))) ratingSamples.push({
            candidate: candidateLabel(spec), wearer, scenarioId: scenarios,
            difficulty, length, partyComposition: party.slice().sort().join('+'),
            enemyComposition: enemies.slice().sort().join('+'), allyCount: party.length,
            enemyCount: enemies.length, enemyCategory: summary.enemyCategories.join('+'),
            winDeltas: trials.map(trial => trial.winDelta), baeValues: trials.map(trial => trial.bae),
            mechanicTags: mechanicEvaluation.tags.join(';'), measurementPlan: measurementPlanLabel(mechanicEvaluation),
            requiredCoverage: [...new Set(mechanicEvaluation.byTag.map(entry => entry.coverage))].join(';'),
            unobservedTags: tagMeasurements.filter(entry => entry.evidenceStatus !== 'event_observed').map(entry => entry.tag).join(';')
          });
          const partyComposition = party.slice().sort().join('+');
          const enemyComposition = enemies.slice().sort().join('+');
          const key = `${summary.candidate}|${wearer}|${difficulty}|${length}|${partyComposition}|${enemyComposition}`;
          if (!accumulated.has(key)) accumulated.set(key, { candidate: summary.candidate, wearer, mechanicTags: mechanicEvaluation.tags.join(';'), measurementPlan: measurementPlanLabel(mechanicEvaluation), unobservedTags: tagMeasurements.filter(entry => entry.evidenceStatus !== 'event_observed').map(entry => entry.tag).join(';'), requiredCoverage: [...new Set(mechanicEvaluation.byTag.map(entry => entry.coverage))].join(';'), difficulty, length, partyComposition, enemyComposition, enemyCategory: summary.enemyCategories.join('+'), allyCount: party.length, enemyCount: enemies.length, formations: 0, controlWin: 0, treatmentWin: 0, controlDraw: 0, treatmentDraw: 0, winDelta: 0, hpSwing: 0, bae: 0, impact: {} });
          const aggregate = accumulated.get(key); aggregate.formations++; aggregate.controlWin += summary.winRate.control / 100; aggregate.treatmentWin += summary.winRate.treatment / 100; aggregate.controlDraw += summary.winRate.controlDrawRatePct / 100; aggregate.treatmentDraw += summary.winRate.treatmentDrawRatePct / 100; aggregate.winDelta += summary.winRate.differencePercentagePoints; aggregate.hpSwing += summary.hpSwing.mean; aggregate.bae += summary.bae.mean;
          for (const [metric, estimate] of Object.entries(summary.impact)) aggregate.impact[metric] = (aggregate.impact[metric] || 0) + estimate.mean;
        }
      }
      if (scenarios % progressEvery === 0 || scenarios === targetScenarios)
        console.log(`Progress: ${scenarios.toLocaleString()}/${targetScenarios.toLocaleString()} scenario cells; ${comparisons.toLocaleString()} candidate/wearer comparisons.`);
  }
  await new Promise((resolve, reject) => out.end(error => error ? reject(error) : resolve()));
  const summaryFile = options.output.replace(/\.jsonl$/i, '') + '-summary.csv';
  const compositionMeans = [...accumulated.values()].map(row => ({ ...row,
    controlWin: row.controlWin / row.formations, treatmentWin: row.treatmentWin / row.formations, controlDraw: row.controlDraw / row.formations, treatmentDraw: row.treatmentDraw / row.formations,
    winDelta: row.winDelta / row.formations, hpSwing: row.hpSwing / row.formations, bae: row.bae / row.formations,
    impact: Object.fromEntries(Object.entries(row.impact).map(([metric, value]) => [metric, value / row.formations])) }));
  const strata = new Map();
  for (const row of compositionMeans) {
    const key = `${row.candidate}|${row.wearer}|${row.difficulty}|${row.length}|${row.allyCount}|${row.enemyCount}|${row.enemyCategory}`;
    if (!strata.has(key)) strata.set(key, { candidate: row.candidate, wearer: row.wearer, difficulty: row.difficulty, length: row.length, allyCount: row.allyCount, enemyCount: row.enemyCount, enemyCategory: row.enemyCategory, compositionPairs: 0, controlWin: 0, treatmentWin: 0, controlDraw: 0, treatmentDraw: 0, winDelta: 0, hpSwing: 0, bae: 0, impact: {} });
    const aggregate = strata.get(key); aggregate.compositionPairs++; aggregate.controlWin += row.controlWin; aggregate.treatmentWin += row.treatmentWin; aggregate.controlDraw += row.controlDraw; aggregate.treatmentDraw += row.treatmentDraw; aggregate.winDelta += row.winDelta; aggregate.hpSwing += row.hpSwing; aggregate.bae += row.bae;
    for (const [metric, value] of Object.entries(row.impact)) aggregate.impact[metric] = (aggregate.impact[metric] || 0) + value;
  }
  const rows = [...strata.values()];
  fs.writeFileSync(summaryFile, [
    'candidate,wearer,mechanicTags,measurementPlan,unobservedTags,requiredCoverage,difficulty,length,allyCount,enemyCount,enemyCategory,equallyWeightedCompositionPairs,winRateBeforePct,winRateAfterPct,drawRateBeforePct,drawRateAfterPct,differencePercentagePoints,meanHpSwing,meanBAE,enemyHpRemovedDelta,allyHpRetainedDelta,allyDamageDealtDelta,allyDamageTakenDelta,allyHealingDelta,allyShieldGrantedDelta,allyShieldAbsorbedDelta,allyEnergyGrantedDelta,allyEnergyGainedDelta,allyEnergySpentDelta,allyEnergyRemainingDelta,allySkillPointsGrantedDelta,allyTurnsDelta,enemyTurnsDelta',
    ...rows.map(row => [row.candidate, row.wearer, row.mechanicTags, row.measurementPlan, row.unobservedTags, row.requiredCoverage, row.difficulty, row.length, row.allyCount, row.enemyCount, row.enemyCategory, row.compositionPairs, row.controlWin / row.compositionPairs * 100, row.treatmentWin / row.compositionPairs * 100, row.controlDraw / row.compositionPairs * 100, row.treatmentDraw / row.compositionPairs * 100, row.winDelta / row.compositionPairs, row.hpSwing / row.compositionPairs, row.bae / row.compositionPairs, row.impact.enemyHpRemoved / row.compositionPairs, row.impact.allyHpRetained / row.compositionPairs, row.impact.damageDealt / row.compositionPairs, row.impact.damageTaken / row.compositionPairs, row.impact.healing / row.compositionPairs, row.impact.shieldsGranted / row.compositionPairs, row.impact.shieldsAbsorbed / row.compositionPairs, row.impact.energyGranted / row.compositionPairs, row.impact.energyGained / row.compositionPairs, row.impact.energySpent / row.compositionPairs, row.impact.energyRemaining / row.compositionPairs, row.impact.skillPointsGranted / row.compositionPairs, row.impact.allyTurns / row.compositionPairs, row.impact.enemyTurns / row.compositionPairs].map(csvEscape).join(','))
  ].join('\n') + '\n');
  const chartFile = options.output.replace(/\.jsonl$/i, '') + '-winrate.svg';
  fs.writeFileSync(chartFile, makeWinRateSvg(rows));
  if (options.runeRating) {
    const { overallRows, wearerRows } = buildRuneRatingRows(ratingSamples, options.runs, options.seed + 42017);
    const ratingFile = options.output.replace(/\.jsonl$/i, '') + '-rune-rating.csv';
    const wearerRatingFile = options.output.replace(/\.jsonl$/i, '') + '-rune-rating-by-wearer.csv';
    const columns = Object.keys(overallRows[0] || {});
    fs.writeFileSync(ratingFile, [columns.join(','), ...overallRows.map(row => columns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    const wearerColumns = Object.keys(wearerRows[0] || {});
    fs.writeFileSync(wearerRatingFile, [wearerColumns.join(','), ...wearerRows.map(row => wearerColumns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    console.log(`Rune ratings (compared with average +100-SVP controls): ${ratingFile}`);
    console.log(`Rune ratings by wearer: ${wearerRatingFile}`);
    for (const row of overallRows) console.log(`  ${row.rune}: ${row.score0to100.toFixed(0)}/100 (win ${row.winLiftScore0to100.toFixed(0)}, action ${row.actionValueScore0to100.toFixed(0)}; 95% CI ${row.score95Lower.toFixed(0)} to ${row.score95Upper.toFixed(0)}); ${row.rating} (${row.differenceVsReferencePp >= 0 ? '+' : ''}${row.differenceVsReferencePp.toFixed(2)} pp vs reference).`);
  }
  if (options.mechanicRating) {
    const { overallRows, wearerRows } = buildMechanicRatingRows(ratingSamples, options.runs, options.seed + 82031);
    const ratingFile = options.output.replace(/\.jsonl$/i, '') + '-mechanic-rating.csv';
    const characterFile = options.output.replace(/\.jsonl$/i, '') + '-mechanic-rating-by-character.csv';
    const columns = Object.keys(overallRows[0] || {}), characterColumns = Object.keys(wearerRows[0] || {});
    fs.writeFileSync(ratingFile, [columns.join(','), ...overallRows.map(row => columns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    fs.writeFileSync(characterFile, [characterColumns.join(','), ...wearerRows.map(row => characterColumns.map(column => csvEscape(row[column])).join(','))].join('\n') + '\n');
    console.log(`Mechanic and character ratings (vs average +100-SVP controls): ${ratingFile}`);
    console.log(`Character-specific component ratings: ${characterFile}`);
    for (const row of overallRows) console.log(`  ${row.candidate}: ${row.score0to100.toFixed(0)}/100 (win ${row.winLiftScore0to100.toFixed(0)}, action ${row.actionValueScore0to100.toFixed(0)}; 95% CI ${row.score95Lower.toFixed(0)} to ${row.score95Upper.toFixed(0)}); ${row.rating}.`);
  }
  console.log(`Completed ${scenarios.toLocaleString()} scenario cells and ${comparisons.toLocaleString()} candidate/wearer comparisons.`);
  console.log(`Detailed pairs: ${options.output}`);
  console.log(`Stratified averages: ${summaryFile}`);
  console.log(`Win-rate chart: ${chartFile}`);
}
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

export { archetypeLibrary, candidateSpecs, enemyLineups, impactDeltas, makeBaseConfig, makeBranches, orderedUniqueTeams, statBudget };
