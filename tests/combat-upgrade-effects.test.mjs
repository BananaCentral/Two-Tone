import test from 'node:test';
import assert from 'node:assert/strict';
import { TwoToneBattleEngine } from '../src/scripts/combat-engine-api.mjs';
import {
  CHARACTER_COMBAT_DATA,
  CHARACTER_UPGRADE_EFFECTS,
  getActiveCharacterUpgradeEffect,
  isCharacterUpgradeEffectActive
} from '../src/scripts/combat-definitions.mjs';

test('upgrade catalog activation follows character rank, weapon potential, and effect-level disables', () => {
  const state = { characterDuplicates: 2 };
  assert.equal(isCharacterUpgradeEffectActive('soul.duplicate.2.follow-up-damage', state), true);
  assert.equal(isCharacterUpgradeEffectActive('soul.duplicate.3.ultimate-damage', state), false);
  assert.equal(isCharacterUpgradeEffectActive('soul.premium-duplicate.2.critical-stats', { ...state, weaponType: 'premium', premiumWeaponDuplicates: 1 }), false);
  assert.equal(isCharacterUpgradeEffectActive('soul.premium-duplicate.2.critical-stats', { ...state, weaponType: 'premium', premiumWeaponDuplicates: 2 }), true);
  assert.equal(isCharacterUpgradeEffectActive('soul.duplicate.2.follow-up-damage', { ...state, disabledUpgradeEffectIds: ['soul.duplicate.2.follow-up-damage'] }), false);
  assert.equal(getActiveCharacterUpgradeEffect('soul.signature.enhance-refund', { weaponType: 'standard' }), null);
  assert.equal(getActiveCharacterUpgradeEffect('soul.signature.enhance-refund', { weaponType: 'premium' }).values.enhanceRefundEvery, 3);
});

test('action plans apply tagged upgrade values from the shared catalog', () => {
  const engine = new TwoToneBattleEngine();
  const soul = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.soul, characterId: 'soul', action: 'basic',
    characterDuplicates: 4, premiumWeaponDuplicates: 3, weaponType: 'premium', enhanceStacks: 3 });
  assert.equal(soul.multiplier, 8);
  assert.equal(soul.target, 'aoe');

  const zeroFirstHit = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.zero, characterId: 'zero', action: 'skill',
    characterDuplicates: 4, targetAlreadyHit: false });
  const zeroLaterHit = engine.resolveActionPlan({ kit: CHARACTER_COMBAT_DATA.zero, characterId: 'zero', action: 'skill',
    characterDuplicates: 4, targetAlreadyHit: true });
  assert.equal(zeroFirstHit.multiplier, 3);
  assert.equal(zeroLaterHit.multiplier, 2);
});

test('upgrade component identifiers are unique and include weapon source metadata', () => {
  const effects = Object.values(CHARACTER_UPGRADE_EFFECTS);
  assert.equal(new Set(effects.map(effect => effect.id)).size, effects.length);
  assert.ok(effects.some(effect => effect.source.kind === 'signature_weapon'));
  assert.ok(effects.some(effect => effect.source.kind === 'premium_weapon_duplicate'));
});
