import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_COMBAT_DATA,
  COMBAT_MECHANIC_TAGS,
  COMBAT_TRIGGER_EVENTS,
  COMBAT_TARGETING_SCHEMA,
  CHARACTER_UPGRADE_EFFECTS,
  ENEMY_COMBAT_DATA,
  RUNE_COMBAT_RULES
} from '../src/scripts/combat-definitions.mjs';

const validTagSet = new Set(COMBAT_MECHANIC_TAGS);

test('all active character actions and passives have catalogued mechanic tags', () => {
  for (const [id, kit] of Object.entries(CHARACTER_COMBAT_DATA)) {
    for (const [slot, effect] of Object.entries({ basic: kit.basic, skill: kit.skill, ultimate: kit.ultimate })) {
      assert.ok(effect?.mechanicTags?.length, `${id}.${slot} needs mechanic tags`);
      for (const tag of effect.mechanicTags) assert.ok(validTagSet.has(tag), `${id}.${slot} uses unknown tag ${tag}`);
      if (effect.targeting) assertValidTargeting(effect.targeting, `${id}.${slot}`);
      assertTaggedTargets(effect, `${id}.${slot}`);
      assertTaggedTriggers(effect, `${id}.${slot}`);
    }
    for (const passive of kit.passives) {
      assert.ok(passive.mechanicTags?.length, `${id}.${passive.id || passive.type} needs mechanic tags`);
      for (const tag of passive.mechanicTags) assert.ok(validTagSet.has(tag), `${id}.${passive.type} uses unknown tag ${tag}`);
      assertTaggedTargets(passive, `${id}.${passive.type}`);
      assertTaggedTriggers(passive, `${id}.${passive.type}`);
    }
  }
});

test('target acquisition and hit coverage stay distinct for selected, Blast, and AoE attacks', () => {
  assert.deepEqual(CHARACTER_COMBAT_DATA.zero.basic.targeting, { side: 'enemy', acquisition: 'selected', coverage: 'blast' });
  assert.deepEqual(CHARACTER_COMBAT_DATA.soul.basic.targeting, { side: 'enemy', acquisition: 'selected', coverage: 'single' });
  assert.deepEqual(CHARACTER_COMBAT_DATA.lily.skill.targeting, { side: 'enemy', acquisition: 'all', coverage: 'aoe' });
  assert.deepEqual(CHARACTER_COMBAT_DATA.dawn.skill.targeting, { side: 'ally', acquisition: 'selected', coverage: 'single' });
  assert.deepEqual(ENEMY_COMBAT_DATA.slime.basic.targeting, { side: 'ally', acquisition: 'random', coverage: 'single' });
});

test('conditional targeting and first-hit rules are represented explicitly', () => {
  const zeroFirstStrike = CHARACTER_COMBAT_DATA.zero.skill;
  assert.ok(zeroFirstStrike.mechanicTags.includes('trigger.first_hit_per_target'));
  assert.equal(zeroFirstStrike.mechanicTriggers['damage.conditional_multiplier'], 'on_first_hit_per_target');
  assert.equal(zeroFirstStrike.mechanicTriggers['trigger.first_hit_per_target'], 'on_first_hit_per_target');

  const [soulEnhancedBasic] = CHARACTER_COMBAT_DATA.soul.skill.targetingVariants;
  assert.equal(soulEnhancedBasic.action, 'basic');
  assert.deepEqual(soulEnhancedBasic.when, { enhanceStacksAtLeast: 3 });
  assert.deepEqual(soulEnhancedBasic.targeting, { side: 'enemy', acquisition: 'selected', coverage: 'blast' });
  assert.deepEqual(soulEnhancedBasic.overrides[0], { when: { premiumWeaponDuplicatesAtLeast: 3 }, coverage: 'aoe' });
});

test('all enemies and Rune rules use known mechanic tags and targeting values', () => {
  for (const [id, enemy] of Object.entries(ENEMY_COMBAT_DATA)) {
    assert.ok(enemy.mechanicTags.includes('defense.barrier'), `${id} barrier mechanics must be tagged`);
    for (const tag of [...enemy.mechanicTags, ...enemy.basic.mechanicTags]) assert.ok(validTagSet.has(tag), `${id} uses unknown tag ${tag}`);
    assertValidTargeting(enemy.basic.targeting, `${id}.basic`);
    assertTaggedTargets(enemy, `${id} traits`);
    assertTaggedTriggers(enemy, `${id} traits`);
    for (const passive of enemy.passives) {
      for (const tag of passive.mechanicTags) assert.ok(validTagSet.has(tag), `${id} passive uses unknown tag ${tag}`);
      assertTaggedTargets(passive, `${id}.${passive.type}`);
      assertTaggedTriggers(passive, `${id}.${passive.type}`);
    }
  }
  for (const [id, rule] of Object.entries(RUNE_COMBAT_RULES)) {
    assert.ok(rule.mechanicTags.length, `${id} needs mechanic tags`);
    for (const tag of rule.mechanicTags) assert.ok(validTagSet.has(tag), `${id} uses unknown tag ${tag}`);
    assertValidTargeting(rule.targeting, `Rune ${id}`);
    assertTaggedTriggers(rule, `Rune ${id}`);
  }
});

test('ordinary direct attacks do not carry a barrier-break tag', () => {
  for (const [id, kit] of Object.entries(CHARACTER_COMBAT_DATA)) {
    for (const [slot, effect] of Object.entries({ basic: kit.basic, skill: kit.skill, ultimate: kit.ultimate })) {
      assert.ok(!effect.mechanicTags.includes('damage.barrier_break'), `${id}.${slot} should not be tagged as a barrier-breaking attack`);
    }
  }
  for (const [id, enemy] of Object.entries(ENEMY_COMBAT_DATA)) {
    assert.ok(!enemy.basic.mechanicTags.includes('damage.barrier_break'), `${id}.basic should not be tagged as a barrier-breaking attack`);
  }
});

test('character duplicates and weapon effects use the same mechanic tag schema', () => {
  assert.ok(Object.keys(CHARACTER_UPGRADE_EFFECTS).length >= 40, 'all current character and weapon upgrade effects should be listed');
  for (const effect of Object.values(CHARACTER_UPGRADE_EFFECTS)) {
    assert.ok(effect.id && effect.character, 'upgrade effects need a stable id and character owner');
    assert.ok(['character_duplicate', 'signature_weapon', 'premium_weapon_duplicate'].includes(effect.source.kind), `${effect.id} has an unknown source kind`);
    if (effect.source.rank !== undefined) assert.ok(Number.isInteger(effect.source.rank) && effect.source.rank >= 1 && effect.source.rank <= 4, `${effect.id} has an invalid rank`);
    assert.ok(effect.mechanicTags.length, `${effect.id} needs mechanic tags`);
    for (const tag of effect.mechanicTags) assert.ok(validTagSet.has(tag), `${effect.id} uses unknown tag ${tag}`);
    assertValidTargeting(effect.targeting, effect.id);
    assertTaggedTargets(effect, effect.id);
    assertTaggedTriggers(effect, effect.id);
  }
});

function assertValidTargeting(targeting, label) {
  assert.ok(COMBAT_TARGETING_SCHEMA.side.includes(targeting.side), `${label} has unknown target side ${targeting.side}`);
  assert.ok(COMBAT_TARGETING_SCHEMA.acquisition.includes(targeting.acquisition), `${label} has unknown acquisition ${targeting.acquisition}`);
  assert.ok(COMBAT_TARGETING_SCHEMA.coverage.includes(targeting.coverage), `${label} has unknown coverage ${targeting.coverage}`);
}

function assertTaggedTargets(effect, label) {
  for (const [tag, targeting] of Object.entries(effect.mechanicTargets || {})) {
    assert.ok(effect.mechanicTags.includes(tag), `${label} target record has untagged mechanic ${tag}`);
    assertValidTargeting(targeting, `${label}.${tag}`);
  }
  for (const tag of effect.mechanicTags) assert.ok(effect.mechanicTargets?.[tag], `${label} tag ${tag} needs target metadata`);
}

function assertTaggedTriggers(effect, label) {
  for (const [tag, event] of Object.entries(effect.mechanicTriggers || {})) {
    assert.ok(effect.mechanicTags.includes(tag), `${label} trigger has untagged mechanic ${tag}`);
    assert.ok(COMBAT_TRIGGER_EVENTS.includes(event), `${label}.${tag} uses unknown trigger ${event}`);
  }
  for (const tag of effect.mechanicTags) assert.ok(effect.mechanicTriggers?.[tag], `${label} tag ${tag} needs trigger metadata`);
}
