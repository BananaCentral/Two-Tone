import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TwoToneBattleEngine } from '../src/scripts/combat-engine-api.mjs';
import { CHARACTER_COMBAT_DATA, ENEMY_COMBAT_DATA } from '../src/scripts/combat-definitions.mjs';

const canonical = { ...CHARACTER_COMBAT_DATA, ...ENEMY_COMBAT_DATA };
function runtimeDefinition(value) {
  if (Array.isArray(value)) return value.map(runtimeDefinition);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['mechanicTags', 'mechanicTargets', 'mechanicTriggers', 'targeting', 'targetingVariants'].includes(key))
    .map(([key, child]) => [key, runtimeDefinition(child)]));
}

test('live battle and simulator import the same definitions and engine', () => {
  const game = fs.readFileSync(new URL('../src/scripts/main.js', import.meta.url), 'utf8');
  const simulator = fs.readFileSync(new URL('../tools/combat-simulator.mjs', import.meta.url), 'utf8');
  for (const source of [game, simulator]) {
    assert.match(source, /combat-definitions\.mjs/);
    assert.match(source, /combat-engine-api\.mjs/);
    for (const method of ['resolveActionIntent', 'resolveDamageSequence', 'resolveHitEffects', 'resolveBattleOutcome']) {
      assert.ok(source.includes(method), `adapter does not call shared ${method}`);
    }
  }
});

test('simulator example sheets cannot drift from canonical combat definitions', () => {
  const directory = new URL('../Documentation/combat-simulator/', import.meta.url);
  for (const filename of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
    const config = JSON.parse(fs.readFileSync(new URL(filename, directory), 'utf8'));
    for (const [id, archetype] of Object.entries(config.archetypes || {})) {
      const sheet = canonical[id];
      if (!sheet) continue;
      for (const key of ['name', 'role', 'stats', 'basic', 'skill', 'ultimate', 'passives', 'tags', 'barrierPercent', 'stealth']) {
        if (sheet[key] !== undefined) assert.deepEqual(runtimeDefinition(archetype[key]), runtimeDefinition(sheet[key]), `${filename}: ${id}.${key}`);
      }
    }
  }
});

test('every authored character action can be planned by the shared engine', () => {
  const engine = new TwoToneBattleEngine();
  for (const [id, kit] of Object.entries(CHARACTER_COMBAT_DATA)) {
    for (const action of ['basic', 'skill', 'ultimate']) {
      if (!kit[action]) continue;
      const plan = engine.resolveActionPlan({ kit, action, characterId: id });
      assert.ok(plan, `${id}.${action} has no shared action plan`);
      assert.equal(plan.action, action);
      assert.ok(Number.isFinite(plan.multiplier));
      if (kit[action].target) assert.equal(plan.target, kit[action].target);
    }
  }
});

test('enemy attack plans use the same authored attack and passive data', () => {
  const engine = new TwoToneBattleEngine();
  for (const [id, kit] of Object.entries(ENEMY_COMBAT_DATA)) {
    const plan = engine.resolveEnemyBasicPlan({ basic: kit.basic, passive: kit.passives[0] || null });
    assert.ok(plan, `${id} has no shared enemy attack plan`);
    assert.equal(plan.damageType, kit.basic.damageType);
    assert.equal(plan.target, kit.basic.target);
  }
  assert.equal(engine.resolveEnemyBasicPlan({
    basic: ENEMY_COMBAT_DATA.slime.basic,
    passive: ENEMY_COMBAT_DATA.slime.passives[0], attackCount: 2
  }).target, 'aoe');
  assert.equal(engine.resolveEnemyBasicPlan({
    basic: ENEMY_COMBAT_DATA.goblin.basic,
    passive: ENEMY_COMBAT_DATA.goblin.passives[0]
  }).pursuitAdvance, 20);
  assert.equal(engine.resolveEnemyBasicPlan({
    basic: ENEMY_COMBAT_DATA.geode.basic,
    passive: ENEMY_COMBAT_DATA.geode.passives[0]
  }).nextMomentumStacks, 1);
});

test('shared damage sequence applies direct damage, shield/barrier, Reflect, and Echo consistently', () => {
  const engine = new TwoToneBattleEngine();
  const attacker = { id: 'attacker', hp: 100, maxHp: 100, shield: 0, barrier: 0 };
  const target = { id: 'target', hp: 100, maxHp: 100, shield: 20, barrier: 100,
    barriersBroken: 0, brokenTurns: 0 };
  const hit = engine.resolveDamageSequence({ target, attacker, rawDamage: 40, damageType: 'physical',
    primary: { random: () => 0.99, reflectPercent: 0.25, echoPercent: 0.5 },
    calculateReflectDamage: amount => amount,
    reflect: { random: () => 0.99 }, echo: { random: () => 0.99 } });
  assert.equal(hit.damage, 40);
  assert.equal(hit.shieldDamage, 20);
  assert.equal(hit.healthDamage, 20);
  assert.equal(hit.barrierDamage, 10);
  assert.equal(hit.reflect.damage, 10);
  assert.equal(hit.echo.damage, 10);
  assert.equal(hit.echoDamageType, 'physical');
});

test('shared hit effects apply Exposed, Ricochet, and character Bleed rules', () => {
  const engine = new TwoToneBattleEngine();
  const enemy = { id: 'enemy', hp: 500, maxHp: 500, marks: [], debuffs: [], bleedStacks: [] };
  const lily = { id: 'lily', archetypeId: 'lily', side: 'allies', hp: 100, passives: [{ type: 'exposed', duration: 2 }] };
  const effects = engine.resolveHitEffects({ actor: lily, target: enemy, hit: { damage: 10 }, action: 'skill', isEnemyTarget: true });
  assert.ok(effects.some(effect => effect.type === 'exposed'));
  assert.ok(effects.some(effect => effect.type === 'ricochet-mark'));
  assert.ok(enemy.marks.some(mark => mark.id === 'ricochet'));

  const logan = { id: 'logan', archetypeId: 'logan', side: 'allies', hp: 100, passives: [] };
  const bleed = engine.resolveHitEffects({ actor: logan, target: enemy, hit: { damage: 10 }, action: 'basic', isEnemyTarget: true });
  assert.ok(bleed.some(effect => effect.type === 'bleed'));
  assert.equal(enemy.bleedStacks.length, 1);
});

test('shared action/resource handling settles costs and Soul Enhance together', () => {
  const engine = new TwoToneBattleEngine();
  const actor = { id: 'soul', archetypeId: 'soul', hp: 100, energy: 20, maxEnergy: 120 };
  const battle = { skillPoints: 3, skillPointCap: 5 };
  const plan = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.soul, action: 'skill', characterId: 'soul' });
  const enhanced = engine.resolveEnhanceAction({ actor, battle, plan, currentStacks: 0, premiumWeapon: false });
  assert.equal(enhanced.enhanceStacks, 1);
  assert.equal(battle.skillPoints, 2);
  assert.equal(actor.energy, 20);

  const lily = { id: 'lily-1', archetypeId: 'lily', hp: 100, energy: 90, maxEnergy: 100 };
  const ultimate = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.dawn, action: 'ultimate', characterId: 'dawn' });
  const support = engine.resolveDawnUltimate({ actor: { id: 'dawn' }, target: lily, battle, plan: ultimate });
  assert.equal(support.energyGained, 10);
  assert.equal(support.skillPointsGained, 1);
  assert.equal(battle.skillPoints, 3);
});

test('shared support, ultimate, Follow-Up, summon, and timed-status handlers resolve', () => {
  const engine = new TwoToneBattleEngine();
  const dawn = { id: 'dawn', hp: 50, maxHp: 50, energy: 20, maxEnergy: 120 };
  const ally = { id: 'soul', hp: 100, maxHp: 100, energy: 20, maxEnergy: 120, shield: 0 };
  const tunePlan = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.dawn, action: 'skill', characterId: 'dawn' });
  assert.equal(engine.resolveDawnTune({ actor: dawn, target: ally, plan: tunePlan }).tune.damageBonus, .4);
  assert.equal(ally.tune.basicEnhanced, true);
  const shieldPlan = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.logan, action: 'skill', characterId: 'logan' });
  const shield = engine.resolveLoganBloodShield({ actor: { id: 'logan', hp: 200, maxHp: 200 },
    allies: [ally], enemies: [], plan: shieldPlan });
  assert.equal(shield.healthCost, 50);
  assert.equal(ally.shield, 50);

  const enemies = [{ id: 'foe-a', hp: 100, maxHp: 100, marks: [], debuffs: [], bleedStacks: [] },
    { id: 'foe-b', hp: 100, maxHp: 100, marks: [], debuffs: [], bleedStacks: [] }];
  const passive = { id: 'followUp', type: 'followUp', charges: 2, remaining: 2, seenSources: new Set() };
  const followUp = engine.resolveFollowUpEvent({ passive, ownerId: 'soul', sourceActorId: 'dawn', sourceId: 'action-1',
    hits: [{ target: 'foe-a', damage: 10 }, { target: 'foe-b', shieldDamage: 5 }], enemies, totalDamage: 11 });
  assert.deepEqual(followUp.targets.map(entry => entry.damage), [6, 5]);
  assert.equal(followUp.remaining, 1);
  assert.equal(engine.resolveFollowUpEvent({ passive, ownerId: 'soul', sourceActorId: 'dawn', sourceId: 'action-1',
    hits: [{ target: 'foe-a', damage: 10 }], enemies, totalDamage: 10 }), null);

  const summon = engine.resolveSummonPlan({ owner: { id: 'lily', hp: 100 }, sourceId: 7 });
  assert.equal(summon.durationTurns, 3);
  const summonState = { remainingTurns: summon.durationTurns, hp: 1 };
  assert.equal(engine.advanceSummonTurn(summonState).remainingTurns, 2);
  assert.equal(engine.advanceSummonTurn(summonState).remainingTurns, 1);
  assert.equal(engine.advanceSummonTurn(summonState).expired, true);

  engine.applyStackingTimedMark({ target: enemies[0], id: 'exposed', turns: 2, maxStacks: 1 });
  assert.equal(engine.ageUnitEffects(enemies[0], { marks: true }).tuneExpired, false);
  assert.equal(enemies[0].marks[0].turns, 1);
});

test('each Rune trigger is resolved by the shared Rune table', () => {
  const engine = new TwoToneBattleEngine();
  const cases = [
    ['radiant-moon', 'directDamage'], ['eternal-sun', 'passive'], ['celestial-star', 'ultimate'],
    ['dark-matter', 'skill'], ['clear-skies', 'reflect'], ['infinite-space', 'ultimate'],
    ['recycle', 'skill'], ['amplify', 'basic'], ['united', 'allySkill']
  ];
  for (const [setId, trigger] of cases) {
    assert.ok(engine.resolveRuneEffect({ setId, trigger, shielded: true }), `${setId} has no ${trigger} effect`);
  }
});

test('shared Rune cooldowns and outcome resolution are deterministic', () => {
  const engine = new TwoToneBattleEngine();
  const state = { cooldowns: {}, cooldownStartedTurn: {} };
  const effect = engine.resolveRuneTrigger({ setId: 'celestial-star', trigger: 'ultimate', state,
    effectId: 'celestial-star', turn: 3 });
  assert.equal(effect.actionAdvance, 100);
  assert.equal(engine.resolveRuneTrigger({ setId: 'celestial-star', trigger: 'ultimate', state,
    effectId: 'celestial-star', turn: 3 }), null);
  assert.equal(engine.resolveBattleOutcome({ allies: [{ hp: 10 }], enemies: [{ hp: 0 }] }), 'victory');
  assert.equal(engine.resolveBattleOutcome({ allies: [{ hp: 0 }], enemies: [{ hp: 10 }] }), 'defeat');
});
