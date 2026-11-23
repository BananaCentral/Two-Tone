import test from 'node:test';
import assert from 'node:assert/strict';
import { claimLoginEvent, getLoginEventState } from '../src/scripts/login-event.mjs';

test('seven nonconsecutive Eastern daily claims earn exactly 1,000 coins', () => {
  const profile = { coins: 0 };
  const dates = ['01-01','01-03','01-05','01-07','01-09','01-12','01-27'];
  const payout = dates.map(day => {
    const now = new Date(`2026-${day}T05:00:00Z`);
    const result = claimLoginEvent(profile, now);
    assert.equal(claimLoginEvent(profile, now).coins, 0);
    return result.coins;
  });
  assert.deepEqual(payout, [200,100,100,200,100,100,200]);
  assert.equal(profile.coins, 1000);
  assert.equal(getLoginEventState(profile.loginEvent, new Date('2026-01-28T05:00:00Z')).status, 'complete');
  assert.equal(claimLoginEvent(profile, new Date('2026-01-29T05:00:00Z')).coins, 200);
  assert.equal(profile.coins, 1200);
});

test('claims and cycle changes follow Eastern midnight, including daylight saving time', () => {
  const profile = { coins: 0 };
  assert.equal(getLoginEventState(null, new Date('2026-01-01T04:59:59Z')).status, 'upcoming');
  assert.equal(claimLoginEvent(profile, new Date('2026-01-01T05:00:00Z')).coins, 200);
  assert.equal(claimLoginEvent(profile, new Date('2026-01-02T04:59:59Z')).coins, 0);
  assert.equal(claimLoginEvent(profile, new Date('2026-01-02T05:00:00Z')).coins, 100);
  const priorCycle = getLoginEventState(null, new Date('2026-03-26T03:59:59Z'));
  const nextCycle = getLoginEventState(null, new Date('2026-03-26T04:00:00Z'));
  assert.equal(priorCycle.resetDate, '2026-03-26');
  assert.equal(nextCycle.cycle, priorCycle.cycle + 1);
});

test('progress from the original launch schedule carries over without another same-day payout', () => {
  const profile = { coins: 200, loginEvent: { cycle: 0, claims: 1, lastClaimDay: '2026-11-23' } };
  const sameDay = new Date('2026-11-23T18:00:00Z');
  assert.equal(getLoginEventState(profile.loginEvent, sameDay).resetDate, '2026-12-03');
  assert.equal(claimLoginEvent(profile, sameDay).status, 'claimed-today');
  assert.equal(claimLoginEvent(profile, new Date('2026-11-24T05:00:00Z')).coins, 100);
  assert.equal(profile.coins, 300);
  assert.equal(claimLoginEvent(profile, new Date('2026-12-03T05:00:00Z')).coins, 200);
});
