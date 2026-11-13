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
      assert(archetype.basic && Number.isFinite(archetype.basic.multiplier) && ['physical', 'magical', 'true'].includes(archetype.basic.damageType), 'Archetype ' + instance.archetype + ' needs a typed Basic Attack.');
      assert(!archetype.passives || archetype.passives.every(p => ['followUp', 'everyNthBasic'].includes(p.type)), 'Unsupported passive type in ' + instance.archetype + '.');
      for (const passive of archetype.passives || []) {
        if (passive.type === 'everyNthBasic') assert(Number.isInteger(passive.every) && passive.every > 0, 'everyNthBasic needs a positive integer interval.');
        if (passive.type === 'followUp') assert(Number.isFinite(passive.multiplier) && passive.multiplier >= 0, 'followUp needs a non-negative multiplier.');
      }
      assert(!archetype.skill || archetype.skill.type === 'enhanceBasic', 'Unsupported skill type in ' + instance.archetype + '.');
      assert(!archetype.ultimate || ['physical', 'magical', 'true'].includes(archetype.ultimate.damageType), 'Ultimate needs a supported damage type.');
    }
  }
}
function instantiate(config, side) {
  return config.teams[side].map(instance => {
    const archetype = config.archetypes[instance.archetype];
    const level = instance.level ?? archetype.level ?? 1;
    const stats = Object.fromEntries(Object.entries(archetype.stats).map(([name, value]) => [name, statAtLevel(value, level)]));
    assert(stats.physicalAttack !== undefined && stats.magicalAttack !== undefined && stats.physicalDefense !== undefined && stats.magicalDefense !== undefined, 'Archetype ' + instance.archetype + ' needs all six standard stats.');
    const maxEnergy = archetype.energy?.max ?? 120;
    const passives = (archetype.passives || []).map((passive, index) => ({
      ...passive,
      key: passive.id || passive.type + '-' + index,
      remaining: passive.charges ?? Infinity,
      seenSources: new Set(),
      attackCount: 0
    }));
    return {
      id: instance.id,
      archetypeId: instance.archetype,
      name: instance.name || archetype.name || instance.archetype,
      side,
      level,
      stats,
      hp: stats.hp,
      maxHp: stats.hp,
      energy: Math.max(0, Math.min(maxEnergy, instance.energy ?? archetype.energy?.start ?? 0)),
      maxEnergy,
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
  if (type === 'physical') return unit.stats.physicalAttack;
  if (type === 'magical') return unit.stats.magicalAttack;
  return (unit.stats.physicalAttack + unit.stats.magicalAttack) / 2;
}
function defenseValue(unit, type) {
  if (type === 'physical') return unit.stats.physicalDefense;
  if (type === 'magical') return unit.stats.magicalDefense;
  return (unit.stats.physicalDefense + unit.stats.magicalDefense) / 2;
}
function damageFor(attacker, target, type, multiplier) {
  const attack = attackValue(attacker, type);
  if (attack <= 0) return 0;
  let reduction;
  if (type === 'true') {
    const physicalReduction = attacker.stats.physicalAttack > 0 ? 0.5 * Math.min(target.stats.physicalDefense / attacker.stats.physicalAttack, 1) : 0;
    const magicalReduction = attacker.stats.magicalAttack > 0 ? 0.5 * Math.min(target.stats.magicalDefense / attacker.stats.magicalAttack, 1) : 0;
    reduction = physicalReduction + magicalReduction;
  } else {
    reduction = Math.min(defenseValue(target, type) / attack, 1);
  }
  return roundStat(attack * multiplier * (1 - reduction));
}
function chooseTarget(actor, candidates, mode, random) {
  if (!candidates.length) return [];
  if (mode === 'all') return [...candidates];
  if (mode === 'lowestHp') return [candidates.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0]];
  if (actor.side === 'enemies' || mode === 'random') return [candidates[Math.floor(random() * candidates.length)]];
  return [candidates.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0]];
}
function runAttack(state, attacker, candidates, spec, options = {}) {
  if (!candidates.length) return [];
  const targets = chooseTarget(attacker, candidates, options.targetMode || spec.target || 'single', state.random);
  if (!targets.length) return [];
  const hits = [];
  for (const target of targets) {
    const damage = damageFor(attacker, target, spec.damageType, options.multiplier ?? spec.multiplier);
    target.hp = Math.max(0, target.hp - damage);
    target.damageTaken += damage;
    attacker.damageDealt += damage;
    state.damageBySide[attacker.side] += damage;
    hits.push({ target, damage });
  }
  if (targets.length > 1) attacker.aoeCount++;
  return hits;
}
function triggerFollowUps(state, sourceId, sourceActorId, affectedTargets) {
  const targets = [...new Set(affectedTargets.filter(target => target.hp > 0))];
  if (!targets.length) return;
  for (const soul of state.allies) {
    if (soul.hp <= 0 || soul.id === sourceActorId) continue;
    for (const passive of soul.passives.filter(p => p.type === 'followUp')) {
      if (passive.remaining <= 0 || passive.seenSources.has(sourceId)) continue;
      const activeTargets = targets.filter(target => target.hp > 0);
      if (!activeTargets.length) break;
      const rawTotal = roundStat(attackValue(soul, passive.damageType) * passive.multiplier);
      if (rawTotal <= 0) continue;
      passive.seenSources.add(sourceId);
      passive.remaining--;
      soul.followUpCount++;
      const base = Math.floor(rawTotal / activeTargets.length);
      const remainder = rawTotal % activeTargets.length;
      activeTargets.forEach((target, index) => {
        const share = base + (index < remainder ? 1 : 0);
        const divisor = attackValue(soul, passive.damageType);
        const damage = damageFor(soul, target, passive.damageType, share / divisor);
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
function resolveAllyAction(state, actor) {
  let foes = state.enemies.filter(unit => unit.hp > 0);
  if (!foes.length) return;
  const ultimate = actor.ultimate;
  if (ultimate && actor.energy >= (ultimate.energyCost ?? 100)) {
    actor.energy -= ultimate.energyCost ?? 100;
    actor.ultimateCount++;
    const hits = runAttack(state, actor, foes, ultimate);
    triggerFollowUps(state, ++state.sourceSerial, actor.id, hits.map(hit => hit.target));
    if (ultimate.refillFollowUps) refillPassives(actor);
    foes = state.enemies.filter(unit => unit.hp > 0);
    if (!foes.length) return;
  }
  const skill = actor.skill;
  if (skill?.type === 'enhanceBasic') {
    while (state.skillPoints > 0 && actor.enhanceStacks < (skill.maxStacks ?? Infinity)) {
      state.skillPoints--;
      actor.enhanceStacks++;
      state.skillUses++;
    }
  }
  const basic = actor.basic;
  const stacks = actor.enhanceStacks;
  const multiplier = basic.multiplier + stacks * (skill?.damagePerStack ?? 0);
  const targetMode = skill && stacks >= (skill.aoeAtStacks ?? Infinity) ? 'all' : basic.target;
  const hits = runAttack(state, actor, foes, basic, { multiplier, targetMode });
  actor.basicAttackCount++;
  actor.energy = Math.min(actor.maxEnergy, actor.energy + (basic.energyGain ?? 0) + stacks * (skill?.energyPerStack ?? 0));
  state.skillPoints = Math.min(state.skillPointCap, state.skillPoints + (basic.skillPointGain ?? 0));
  actor.enhanceStacks = 0;
  triggerFollowUps(state, ++state.sourceSerial, actor.id, hits.map(hit => hit.target));
}
function resolveEnemyAction(state, actor) {
  const targets = state.allies.filter(unit => unit.hp > 0);
  if (!targets.length) return;
  const basic = actor.basic;
  actor.basicAttackCount++;
  let targetMode = basic.target;
  let multiplier = basic.multiplier;
  for (const passive of actor.passives) {
    if (passive.type !== 'everyNthBasic') continue;
    passive.attackCount++;
    if (passive.attackCount % passive.every === 0) {
      targetMode = passive.target || 'all';
      multiplier *= 1 + passive.damageBonus;
    }
  }
  runAttack(state, actor, targets, basic, { targetMode, multiplier });
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
    skillPointCap: settings.skillPointCap ?? 5,
    skillPoints: Math.min(settings.skillPointCap ?? 5, settings.initialSkillPoints ?? 3),
    skillUses: 0,
    damageBySide: { allies: 0, enemies: 0 },
    actions: 0, allyTurns: 0, enemyTurns: 0,
    maxActions: maxActionsOverride ?? settings.maxActions ?? 2000
  };
  while (state.actions < state.maxActions && allies.some(unit => unit.hp > 0) && enemies.some(unit => unit.hp > 0)) {
    const living = [...allies, ...enemies].filter(unit => unit.hp > 0);
    const nextAt = Math.min(...living.map(unit => unit.timeToNextTurn));
    const ready = living.filter(unit => Math.abs(unit.timeToNextTurn - nextAt) <= EPSILON);
    const actor = ready[Math.floor(random() * ready.length)];
    actor.timeToNextTurn += 1 / actor.turnRate;
    state.actions++;
    actor.turns++;
    if (actor.side === 'allies') {
      state.allyTurns++;
      resolveAllyAction(state, actor);
    } else {
      state.enemyTurns++;
      resolveEnemyAction(state, actor);
    }
  }
  const winner = !allies.some(unit => unit.hp > 0) ? 'enemies' : !enemies.some(unit => unit.hp > 0) ? 'allies' : 'draw';
  return {
    winner, actions: state.actions, allyTurns: state.allyTurns, enemyTurns: state.enemyTurns,
    skillUses: state.skillUses, skillPointsRemaining: state.skillPoints,
    damageDealt: state.damageBySide,
    followUps: allies.reduce((sum, unit) => sum + unit.followUpCount, 0),
    ultimates: allies.reduce((sum, unit) => sum + unit.ultimateCount, 0),
    aoeAttacks: [...allies, ...enemies].reduce((sum, unit) => sum + unit.aoeCount, 0),
    survivors: {
      allies: allies.filter(unit => unit.hp > 0).map(unit => ({ id: unit.id, hp: unit.hp, maxHp: unit.maxHp })),
      enemies: enemies.filter(unit => unit.hp > 0).map(unit => ({ id: unit.id, hp: unit.hp, maxHp: unit.maxHp }))
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
    averageActions: meanOf('actions'), averageAllyTurns: meanOf('allyTurns'), averageEnemyTurns: meanOf('enemyTurns'),
    averageSkillUses: meanOf('skillUses'), averageFollowUps: meanOf('followUps'),
    averageUltimates: meanOf('ultimates'), averageAoeAttacks: meanOf('aoeAttacks'),
    averageDamageDealt: {
      allies: results.reduce((sum, result) => sum + result.damageDealt.allies, 0) / runs,
      enemies: results.reduce((sum, result) => sum + result.damageDealt.enemies, 0) / runs
    },
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
    console.log('Avg Follow Ups: ' + summary.averageFollowUps.toFixed(1) + ' | Ultimates: ' + summary.averageUltimates.toFixed(1) + ' | AoE attacks: ' + summary.averageAoeAttacks.toFixed(1));
  }
}
const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
export { simulateBattle, simulateBatch };
