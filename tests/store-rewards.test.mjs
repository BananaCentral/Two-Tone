import assert from 'node:assert/strict';
import test from 'node:test';
import { commonStoreReward } from '../lib/store-rewards.js';

test('Common rewards use the approved size thresholds, bundle counts, and banner item types', () => {
  const cases = [
    [0, 'small', 'Small', 15],
    [0.599999, 'small', 'Small', 15],
    [0.6, 'medium', 'Medium', 7],
    [0.899999, 'medium', 'Medium', 7],
    [0.9, 'large', 'Large', 1],
    [0.999999, 'large', 'Large', 1],
  ];
  for (const [type, item, noun] of [['character', 'bottle', 'Bottle'], ['weapon', 'book', 'Book']]) {
    for (const [roll, size, label, quantity] of cases) {
      const id = `${item}:${size}`;
      assert.deepEqual(commonStoreReward(type, roll), {
        id, inventoryItem: id, name: `${label} Enchanted ${noun}${quantity === 1 ? '' : 's'}`, quantity,
      });
    }
  }
});
