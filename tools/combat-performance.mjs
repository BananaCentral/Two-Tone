#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { simulateBattle } from './combat-simulator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DIR = path.join(ROOT, 'Documentation/combat-simulator');
const CHARACTER_IDS = ['soul', 'lily', 'dawn', 'logan', 'zero'];
const ENEMY_IDS = ['slime', 'wolf', 'hawk', 'geode', 'goblin', 'bear'];
const RUNES = ['radiant-moon', 'eternal-sun', 'celestial-star', 'dark-matter', 'clear-skies', 'infinite-space', 'recycle', 'amplify', 'united'];
const LENGTHS = ['short', 'medium', 'long'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const RUNE_MAIN = ['hp', 'attack', 'physicalDefense', 'magicalDefense'];
const SVP_GAINS = { hp: 100, attack: 20, physicalDefense: 4, magicalDefense: 4, speed: 20 };

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
  const archetypes = {};
  for (const filename of ['example-logan-party-vs-bear-boss.json', 'example-zero-vs-slime.json']) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, filename), 'utf8'));
    for (const [id, archetype] of Object.entries(fixture.archetypes)) {
      archetypes[id] = { ...(archetypes[id] || {}), ...archetype, tags: archetype.tags ?? archetypes[id]?.tags };
    }
  }
  for (const id of [...CHARACTER_IDS, ...ENEMY_IDS]) assert(archetypes[id], `Missing archetype ${id} in benchmark fixtures.`);
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
function makeBaseConfig(library, allies, enemies, difficulty, length) {
  const archetypes = itemlessLibrary(library);
  const enemyCount = enemies.length;
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
  if (raw === 'all-runes') return RUNES.map(id => ({ type: 'rune', id }));
  if (raw === 'all-stats') return Object.keys(SVP_GAINS).map(id => ({ type: 'stat', id }));
  if (raw === 'all-weapons') return ['standard', 'premium'].flatMap(type => [1, 2, 3, 4, 5].flatMap(potential => [1, 10, 25, 50].map(level => ({ type: 'weapon', id: type, potential, level }))));
  const [type, ...rest] = raw.split(':');
  const value = rest.join(':');
  if (type === 'rune' && RUNES.includes(value)) return [{ type, id: value }];
  if (type === 'character' && CHARACTER_IDS.includes(value)) return [{ type, id: value }];
  if (type === 'stat' && Object.hasOwn(SVP_GAINS, value)) return [{ type, id: value }];
  if (type === 'action' && /^(soul|lily|dawn|logan|zero)\/(skill|ultimate)$/.test(value)) {
    const [character, action] = value.split('/'); return [{ type, id: action, character }];
  }
  if (type === 'weapon' && /^(standard|premium)(?:@P[1-5](?:L(?:[1-9]|[1-4][0-9]|50))?)?$/.test(value)) {
    const [, id, p, level] = value.match(/^(standard|premium)(?:@P([1-5])(?:L([1-9]|[1-4][0-9]|50))?)?$/);
    return [{ type, id, potential: Number(p || 1), level: Number(level || 1) }];
  }
  fail(`Unknown candidate ${raw}. See --help.`);
}
function wearersFor(spec, party) {
  if (spec.type === 'character') return party.includes(spec.id) ? [spec.id] : [];
  if (spec.type === 'action') return party.includes(spec.character) ? [spec.character] : [];
  if (spec.id === 'radiant-moon') return party.filter(id => ['lily', 'zero'].includes(id));
  if (spec.id === 'eternal-sun') return party.filter(id => id !== 'dawn');
  if (spec.id === 'united') return party.filter(id => ['dawn', 'logan'].includes(id));
  return party.slice();
}
function findUnit(config, archetype) { return config.teams.allies.find(unit => unit.archetype === archetype); }
function makeBranches(base, spec, wearer) {
  const control = structuredClone(base);
  const treatment = structuredClone(base);
  const controlled = findUnit(control, wearer);
  const treated = findUnit(treatment, wearer);
  assert(controlled && treated, `Wearer ${wearer} is absent from matchup.`);
  let treatmentStatBudget = null;
  if (spec.type === 'rune') {
    controlled.runes = makeBalancedRunes();
    treated.runes = makeBalancedRunes(spec.id);
    // The set effect is the only difference; the full four-Rune stat bundle is identical.
  } else if (spec.type === 'weapon') {
    treated.weapon = { type: spec.id, potential: spec.potential, level: spec.level || 1 };
  } else if (spec.type === 'stat') {
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
  } else if (spec.type === 'character') {
    const archetype = control.archetypes[wearer];
    archetype.passives = [];
    delete archetype.skill;
    delete archetype.ultimate;
    // Preserve the character's authored stats and Basic Attack as the kit-free control.
  } else if (spec.type === 'action') {
    for (const config of [control, treatment]) {
      const unit = findUnit(config, wearer);
      if (spec.id === 'ultimate') config.archetypes[wearer].energy.start = 100;
      config.settings.actionOverride = { actorId: unit.id, turn: 1, action: config === treatment ? spec.id : 'basic' };
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
  const options = { candidates: [], runs: 100, seed: 1, output: 'Documentation/combat-simulator/performance-results.jsonl', limitScenarios: 1000, maxActions: 2000, compact: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--candidate') options.candidates.push(...candidateSpecs(args[++index]));
    else if (arg === '--character') options.character = args[++index];
    else if (arg === '--runs') options.runs = Number(args[++index]);
    else if (arg === '--seed') options.seed = Number(args[++index]);
    else if (arg === '--limit-scenarios') options.limitScenarios = Number(args[++index]);
    else if (arg === '--max-actions') options.maxActions = Number(args[++index]);
    else if (arg === '--output') options.output = path.resolve(args[++index]);
    else if (arg === '--compact') options.compact = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else fail(`Unknown option: ${arg}`);
  }
  if (!options.candidates.length && !options.help) options.candidates = candidateSpecs('all-runes');
  if (options.character && !CHARACTER_IDS.includes(options.character)) fail(`Unknown character ${options.character}.`);
  assert(Number.isInteger(options.runs) && options.runs > 0, '--runs must be a positive integer.');
  assert(Number.isInteger(options.seed) && options.seed >= 0, '--seed must be a non-negative integer.');
  assert(Number.isInteger(options.limitScenarios) && options.limitScenarios >= 0, '--limit-scenarios must be zero (all) or a positive integer.');
  assert(Number.isInteger(options.maxActions) && options.maxActions > 0, '--max-actions must be a positive integer.');
  return options;
}
function help() {
  return `Two-Tone matched combat performance runner\n\nUsage: node tools/combat-performance.mjs [options]\n\nOptions:\n  --candidate all-runes|all-stats|all-weapons\n  --candidate rune:<id>|character:<id>|stat:<id>|weapon:standard@P1L1|weapon:premium@P1L50\n  --candidate action:<character>/skill|ultimate\n  --character <id>           Restrict item/stat tests to this eligible wearer\n  --runs <n>                  Matched seeds per matchup (default 100)\n  --seed <n>                  First reproducible seed (default 1)\n  --limit-scenarios <n>       Scenario cap (default 1000); use 0 for the full matrix\n  --max-actions <n>           Maximum unit actions in one battle (default 2000)\n  --output <path>             JSONL result path\n  --compact                   Omit seed-level details; keep paired averages and confidence intervals\n\nThe full position-aware matrix has 205 ordered legal ally teams, 9,330 ordered enemy lineups, three lengths and three difficulties (17,213,850 scenario cells). Full Monte Carlo is intentionally a large offline job.`;
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
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(help()); return; }
  const library = archetypeLibrary();
  const out = fs.createWriteStream(options.output, { flags: 'w' });
  let scenarios = 0, comparisons = 0;
  const accumulated = new Map();
  const allyTeams = orderedUniqueTeams(CHARACTER_IDS, 1, 4);
  const enemyTeams = [...enemyLineups(ENEMY_IDS, 5)];
  const allAllyLists = [...allyTeams];
  const allyLists = options.character ? allAllyLists.filter(party => party.includes(options.character)) : allAllyLists;
  const matrixCount = allyLists.length * enemyTeams.length * LENGTHS.length * DIFFICULTIES.length;
  console.log(`Full matrix: ${matrixCount.toLocaleString()} scenarios; ${options.runs} matched runs per candidate/wearer.`);
  const selectedScenarioCount = options.limitScenarios ? Math.min(options.limitScenarios, matrixCount) : matrixCount;
  for (const { party, enemies, length, difficulty } of scenarioSamples(allyLists, enemyTeams, options.limitScenarios)) {
      scenarios++;
      const base = makeBaseConfig(library, party, enemies, difficulty, length);
      for (const spec of options.candidates) {
        const wearers = wearersFor(spec, party).filter(wearer => !options.character || wearer === options.character);
        for (const wearer of wearers) {
          const { control: controlConfig, treatment: treatmentConfig, treatmentStatBudget } = makeBranches(base, spec, wearer);
          const trials = [];
          for (let run = 0; run < options.runs; run++) {
            const seed = options.seed + run;
            const controlResult = simulateBattle(controlConfig, seed, options.maxActions);
            const treatmentResult = simulateBattle(treatmentConfig, seed, options.maxActions);
            trials.push(battleMetrics(controlResult, treatmentResult, seed));
          }
          const winsControl = trials.reduce((sum, trial) => sum + trial.controlWin, 0);
          const winsTreatment = trials.reduce((sum, trial) => sum + trial.treatmentWin, 0);
          const summary = {
            candidate: `${spec.type}:${spec.id}${spec.potential ? `@P${spec.potential}L${spec.level || 1}` : ''}`,
            wearer, party, enemies,
            enemyCategories: [...new Set(enemies.map(id => library[id].tags?.type || 'unknown'))].sort(),
            difficulty, length, runs: options.runs, seed: options.seed,
            statBudgets: { wearer: statBudget(library[wearer].stats), enemies: enemies.map(id => ({ archetype: id, svp: statBudget(library[id].stats) })) },
            treatmentStatBudget,
            winRate: { control: winsControl / options.runs * 100, treatment: winsTreatment / options.runs * 100,
              control95CI: percentCI(trials.map(row => row.controlWin)),
              treatment95CI: percentCI(trials.map(row => row.treatmentWin)),
              controlDrawRatePct: average(trials.map(row => row.controlDraw)) * 100,
              treatmentDrawRatePct: average(trials.map(row => row.treatmentDraw)) * 100,
              differencePercentagePoints: average(trials.map(row => row.winDelta)) * 100,
              paired95CI: percentCI(trials.map(row => row.winDelta)) },
            hpSwing: meanCI(trials.map(row => row.hpSwing)),
            bae: meanCI(trials.map(row => row.bae)),
            averageDamage: { control: average(trials.map(row => row.controlDamage)), treatment: average(trials.map(row => row.treatmentDamage)) },
            averageAllyHpRetained: { control: average(trials.map(row => row.control.finalHp.allies)), treatment: average(trials.map(row => row.treatment.finalHp.allies)) },
            averageShieldAbsorbed: { control: average(trials.map(row => row.control.shields)), treatment: average(trials.map(row => row.treatment.shields)) },
            averageTurns: { alliesControl: average(trials.map(row => row.control.allyTurns)), alliesTreatment: average(trials.map(row => row.treatment.allyTurns)), enemiesControl: average(trials.map(row => row.control.enemyTurns)), enemiesTreatment: average(trials.map(row => row.treatment.enemyTurns)) },
            actionOverride: trials.find(row => row.treatment.actionOverride)?.treatment.actionOverride || null,
            runeDiagnostics: { averageActivations: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeActivations || 0)), averageEnergyRestored: average(trials.map(row => row.wearerDamageTreatment[wearer]?.runeEnergyRestored || 0)) },
            trials
          };
          if (options.compact) delete summary.trials;
          out.write(JSON.stringify(summary) + '\n');
          comparisons++;
          const partyComposition = party.slice().sort().join('+');
          const enemyComposition = enemies.slice().sort().join('+');
          const key = `${summary.candidate}|${wearer}|${difficulty}|${length}|${partyComposition}|${enemyComposition}`;
          if (!accumulated.has(key)) accumulated.set(key, { candidate: summary.candidate, wearer, difficulty, length, partyComposition, enemyComposition, enemyCategory: summary.enemyCategories.join('+'), allyCount: party.length, enemyCount: enemies.length, formations: 0, controlWin: 0, treatmentWin: 0, controlDraw: 0, treatmentDraw: 0, winDelta: 0, hpSwing: 0, bae: 0 });
          const aggregate = accumulated.get(key); aggregate.formations++; aggregate.controlWin += summary.winRate.control / 100; aggregate.treatmentWin += summary.winRate.treatment / 100; aggregate.controlDraw += summary.winRate.controlDrawRatePct / 100; aggregate.treatmentDraw += summary.winRate.treatmentDrawRatePct / 100; aggregate.winDelta += summary.winRate.differencePercentagePoints; aggregate.hpSwing += summary.hpSwing.mean; aggregate.bae += summary.bae.mean;
        }
      }
  }
  await new Promise((resolve, reject) => out.end(error => error ? reject(error) : resolve()));
  const summaryFile = options.output.replace(/\.jsonl$/i, '') + '-summary.csv';
  const compositionMeans = [...accumulated.values()].map(row => ({ ...row,
    controlWin: row.controlWin / row.formations, treatmentWin: row.treatmentWin / row.formations, controlDraw: row.controlDraw / row.formations, treatmentDraw: row.treatmentDraw / row.formations,
    winDelta: row.winDelta / row.formations, hpSwing: row.hpSwing / row.formations, bae: row.bae / row.formations }));
  const strata = new Map();
  for (const row of compositionMeans) {
    const key = `${row.candidate}|${row.wearer}|${row.difficulty}|${row.length}|${row.allyCount}|${row.enemyCount}|${row.enemyCategory}`;
    if (!strata.has(key)) strata.set(key, { candidate: row.candidate, wearer: row.wearer, difficulty: row.difficulty, length: row.length, allyCount: row.allyCount, enemyCount: row.enemyCount, enemyCategory: row.enemyCategory, compositionPairs: 0, controlWin: 0, treatmentWin: 0, controlDraw: 0, treatmentDraw: 0, winDelta: 0, hpSwing: 0, bae: 0 });
    const aggregate = strata.get(key); aggregate.compositionPairs++; aggregate.controlWin += row.controlWin; aggregate.treatmentWin += row.treatmentWin; aggregate.controlDraw += row.controlDraw; aggregate.treatmentDraw += row.treatmentDraw; aggregate.winDelta += row.winDelta; aggregate.hpSwing += row.hpSwing; aggregate.bae += row.bae;
  }
  const rows = [...strata.values()];
  fs.writeFileSync(summaryFile, [
    'candidate,wearer,difficulty,length,allyCount,enemyCount,enemyCategory,equallyWeightedCompositionPairs,winRateBeforePct,winRateAfterPct,drawRateBeforePct,drawRateAfterPct,differencePercentagePoints,meanHpSwing,meanBAE',
    ...rows.map(row => [row.candidate, row.wearer, row.difficulty, row.length, row.allyCount, row.enemyCount, row.enemyCategory, row.compositionPairs, row.controlWin / row.compositionPairs * 100, row.treatmentWin / row.compositionPairs * 100, row.controlDraw / row.compositionPairs * 100, row.treatmentDraw / row.compositionPairs * 100, row.winDelta / row.compositionPairs, row.hpSwing / row.compositionPairs, row.bae / row.compositionPairs].map(csvEscape).join(','))
  ].join('\n') + '\n');
  const chartFile = options.output.replace(/\.jsonl$/i, '') + '-winrate.svg';
  fs.writeFileSync(chartFile, makeWinRateSvg(rows));
  console.log(`Completed ${scenarios.toLocaleString()} scenario cells and ${comparisons.toLocaleString()} candidate/wearer comparisons.`);
  console.log(`Detailed pairs: ${options.output}`);
  console.log(`Stratified averages: ${summaryFile}`);
  console.log(`Win-rate chart: ${chartFile}`);
}
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

export { archetypeLibrary, candidateSpecs, enemyLineups, makeBaseConfig, orderedUniqueTeams, statBudget };
