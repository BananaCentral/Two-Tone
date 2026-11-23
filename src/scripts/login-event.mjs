export const LOGIN_EVENT_START_DATE = '2026-11-23';
export const LOGIN_EVENT_CYCLE_DAYS = 28;
export const LOGIN_EVENT_REWARDS = Object.freeze([200, 100, 100, 200, 100, 100, 200]);

const DAY_MS = 86_400_000;
const easternDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
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
  const activeProgress = progress?.cycle === cycle ? progress : null;
  const claims = activeProgress?.claims ?? 0;
  const status = cycle < 0 ? 'upcoming'
    : claims >= LOGIN_EVENT_REWARDS.length ? 'complete'
    : activeProgress?.lastClaimDay >= dayKey ? 'claimed-today' : 'available';
  return { dayKey, cycle, resetDate, claims, status, nextCoins: LOGIN_EVENT_REWARDS[claims] ?? 0 };
}

export function claimLoginEvent(profile, now = new Date()) {
  const event = getLoginEventState(profile.loginEvent, now);
  if (event.status !== 'available') return { status: event.status, coins: 0 };
  profile.loginEvent = { cycle: event.cycle, claims: event.claims + 1, lastClaimDay: event.dayKey };
  profile.coins += event.nextCoins;
  return { status: 'claimed', coins: event.nextCoins };
}
