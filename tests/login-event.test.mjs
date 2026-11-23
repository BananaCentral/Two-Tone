import test from 'node:test';
import assert from 'node:assert/strict';
import { claimLoginEvent, getLoginEventState } from '../src/scripts/login-event.mjs';

test('seven nonconsecutive Eastern daily claims earn exactly 1,000 coins', () => {
  const profile = { coins: 0 };
  const dates = ['11-23','11-25','11-27','11-29','12-01','12-04','12-19'];
  const payout = dates.map(day => {
    const now = new Date(`2026-${day}T05:00:00Z`);
    const result = claimLoginEvent(profile, now);
    assert.equal(claimLoginEvent(profile, now).coins, 0);
    return result.coins;
  });
  assert.deepEqual(payout, [200,100,100,200,100,100,200]);
  assert.equal(profile.coins, 1000);
  assert.equal(getLoginEventState(profile.loginEvent, new Date('2026-12-20T05:00:00Z')).status, 'complete');
  assert.equal(claimLoginEvent(profile, new Date('2026-12-21T05:00:00Z')).coins, 200);
  assert.equal(profile.coins, 1200);
});

test('claims and cycle changes follow Eastern midnight, including daylight saving time', () => {
  const profile = { coins: 0 };
  assert.equal(getLoginEventState(null, new Date('2026-11-23T04:59:59Z')).status, 'upcoming');
  assert.equal(claimLoginEvent(profile, new Date('2026-11-23T05:00:00Z')).coins, 200);
  assert.equal(claimLoginEvent(profile, new Date('2026-11-24T04:59:59Z')).coins, 0);
  assert.equal(claimLoginEvent(profile, new Date('2026-11-24T05:00:00Z')).coins, 100);
  const priorCycle = getLoginEventState(null, new Date('2027-04-12T03:59:59Z'));
  const nextCycle = getLoginEventState(null, new Date('2027-04-12T04:00:00Z'));
  assert.equal(priorCycle.resetDate, '2027-04-12');
  assert.equal(nextCycle.cycle, priorCycle.cycle + 1);
});
