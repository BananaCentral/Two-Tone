export const LOGIN_EVENT_START_DATE = '2026-01-01';
export const LOGIN_EVENT_CYCLE_DAYS = 28;
export const LOGIN_EVENT_REWARDS = Object.freeze([200, 100, 100, 200, 100, 100, 200]);

const DAY_MS = 86_400_000;
const timeZone = 'America/New_York';
const easternOffset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' });
const easternDate = new Intl.DateTimeFormat('en-US', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const firstDay = Date.parse(LOGIN_EVENT_START_DATE) / DAY_MS;

export function easternDayKey(now = new Date()) {
  const parts = easternDate.formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getLoginEventState(progress, now = new Date()) {
  const dayKey = easternDayKey(now);
  const day = Date.parse(dayKey) / DAY_MS;
  const cycle = Math.floor((day - firstDay) / LOGIN_EVENT_CYCLE_DAYS);
  const resetDate = cycle < 0 ? LOGIN_EVENT_START_DATE : new Date((firstDay + (cycle + 1) * LOGIN_EVENT_CYCLE_DAYS) * DAY_MS).toISOString().slice(0, 10);
  const cycleStart = firstDay + cycle * LOGIN_EVENT_CYCLE_DAYS;
  const lastClaimDay = Date.parse(progress?.lastClaimDay) / DAY_MS;
  const activeProgress = lastClaimDay >= cycleStart && lastClaimDay < cycleStart + LOGIN_EVENT_CYCLE_DAYS
    ? progress : null;
  const claims = activeProgress?.claims ?? 0;
  const status = cycle < 0 ? 'upcoming'
    : claims >= LOGIN_EVENT_REWARDS.length ? 'complete'
    : activeProgress?.lastClaimDay >= dayKey ? 'claimed-today' : 'available';
  return { dayKey, cycle, resetDate, claims, status, nextCoins: LOGIN_EVENT_REWARDS[claims] ?? 0 };
}

export function formatLoginEventCountdown(resetDate, now = new Date()) {
  const utcMidnight = Date.parse(resetDate + 'T00:00:00Z');
  // In New York the offset at UTC midnight remains in effect through local midnight.
  const offset = easternOffset.formatToParts(utcMidnight).find(part => part.type === 'timeZoneName').value.slice(3);
  const resetTime = Date.parse(resetDate + 'T00:00:00' + offset);
  const totalSeconds = Math.max(0, Math.ceil((resetTime - now.getTime()) / 1_000));
  const days = Math.floor(totalSeconds / 86_400);
  if (days) return days === 1 ? '1 day' : `${days} days`;
  if (totalSeconds <= 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const [major, minor] = hours ? [hours, minutes] : [minutes, seconds];
  return `${major}:${String(minor).padStart(2, '0')}`;
}

export function claimLoginEvent(profile, now = new Date()) {
  const event = getLoginEventState(profile.loginEvent, now);
  if (event.status !== 'available') return { status: event.status, coins: 0 };
  profile.loginEvent = { cycle: event.cycle, claims: event.claims + 1, lastClaimDay: event.dayKey };
  profile.coins += event.nextCoins;
  return { status: 'claimed', coins: event.nextCoins };
}
