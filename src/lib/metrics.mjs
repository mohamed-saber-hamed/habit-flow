export function dateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(key, amount) {
  const [year, month, day] = key.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + amount));
  return value.toISOString().slice(0, 10);
}

export function weekdayForKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function normalizeDays(days) {
  const set = new Set((days?.length ? days : [0, 1, 2, 3, 4, 5, 6]).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  return set.size ? set : new Set([0, 1, 2, 3, 4, 5, 6]);
}

export function currentStreak(logDates, plannedDays = [0, 1, 2, 3, 4, 5, 6], today = dateKey()) {
  const completed = new Set(logDates);
  const days = normalizeDays(plannedDays);
  let cursor = today;
  if (days.has(weekdayForKey(today)) && !completed.has(today)) cursor = shiftDateKey(today, -1);
  let streak = 0;
  for (let checked = 0; checked < 740; checked += 1) {
    if (days.has(weekdayForKey(cursor))) {
      if (!completed.has(cursor)) break;
      streak += 1;
    }
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function longestStreak(logDates, plannedDays = [0, 1, 2, 3, 4, 5, 6]) {
  const completed = new Set(logDates);
  if (completed.size === 0) return 0;
  const days = normalizeDays(plannedDays);
  const sorted = [...completed].sort();
  let cursor = sorted[0];
  const last = sorted.at(-1);
  let streak = 0;
  let longest = 0;
  for (let checked = 0; cursor <= last && checked < 7400; checked += 1) {
    if (days.has(weekdayForKey(cursor))) {
      if (completed.has(cursor)) {
        streak += 1;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
      }
    }
    cursor = shiftDateKey(cursor, 1);
  }
  return longest;
}

export function weekKeys(anchor = dateKey(), weekOffset = 0) {
  const day = weekdayForKey(anchor);
  const mondayOffset = (day + 6) % 7;
  const monday = shiftDateKey(anchor, -mondayOffset + weekOffset * 7);
  return Array.from({ length: 7 }, (_, index) => shiftDateKey(monday, index));
}

export function completionRate(completed, planned) {
  if (planned <= 0) return 0;
  return Math.min(100, Math.round((completed / planned) * 100));
}
