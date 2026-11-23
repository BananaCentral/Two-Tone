import assert from 'node:assert/strict';
import { test } from 'node:test';
import { claimSoulGift, hasClaimedSoulGift } from '../src/scripts/permanent-event.mjs';

test('Soul’s Gift awards the full grant once, including on legacy profiles', () => {
  const profile = { coins: 37, loginEvent: { cycle: 3, claims: 2 }, inventory: {} };
  const addInventory = (state, id, quantity) => {
    state.inventory[id] = (state.inventory[id] ?? 0) + quantity;
  };

  assert.equal(hasClaimedSoulGift(profile), false);
  const rewards = claimSoulGift(profile, addInventory);
  assert.equal(rewards.length, 5);
  assert.equal(profile.coins, 20_037);
  assert.deepEqual(profile.inventory, { 'book:small': 200, 'bottle:small': 200, gem: 2, core: 2 });
  assert.deepEqual(profile.loginEvent, { cycle: 3, claims: 2 });

  const reloaded = JSON.parse(JSON.stringify(profile));
  assert.equal(hasClaimedSoulGift(reloaded), true);
  assert.equal(claimSoulGift(reloaded, addInventory), null);
  assert.deepEqual(reloaded, profile);
});
