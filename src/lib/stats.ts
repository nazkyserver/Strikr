import type {
  DayActivity,
  DayStat,
  HeatmapWeek,
  PeriodStat,
  SessionRecord,
  TrainingStats,
  WeekStat,
} from '../types';
import {
  addDays,
  formatMonthDay,
  fromDateKey,
  startOfDay,
  startOfWeek,
  toDateKey,
} from './date';

interface DayAggregate {
  sessions: number;
  seconds: number;
  punches: number;
  rounds: number;
}

function aggregateDays(sessions: SessionRecord[]): Map<string, DayAggregate> {
  const days = new Map<string, DayAggregate>();
  for (const session of sessions) {
    const date = new Date(session.startedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = toDateKey(date);
    const current = days.get(key) ?? { sessions: 0, seconds: 0, punches: 0, rounds: 0 };
    current.sessions += 1;
    current.seconds += session.activeSeconds;
    current.punches += session.punches;
    current.rounds += session.roundsCompleted;
    days.set(key, current);
  }
  return days;
}

function levelForMinutes(minutes: number, sessions: number): 0 | 1 | 2 | 3 | 4 {
  if (sessions === 0) return 0;
  if (minutes < 10) return 1;
  if (minutes < 20) return 2;
  if (minutes < 40) return 3;
  return 4;
}

export function buildHeatmapWeeks(
  sessions: SessionRecord[],
  weeks: number,
  now = new Date(),
): HeatmapWeek[] {
  const aggregates = aggregateDays(sessions);
  const today = startOfDay(now);
  const currentWeekStart = startOfWeek(today);
  const firstWeekStart = addDays(currentWeekStart, -(weeks - 1) * 7);
  const result: HeatmapWeek[] = [];
  let previousMonth = -1;

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const weekStart = addDays(firstWeekStart, weekIndex * 7);
    const month = weekStart.getMonth();
    const days: DayActivity[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex);
      const key = toDateKey(date);
      const aggregate = aggregates.get(key);
      const future = date.getTime() > today.getTime();
      const minutes = (aggregate?.seconds ?? 0) / 60;
      const sessionsForDay = aggregate?.sessions ?? 0;
      days.push({
        key,
        date,
        future,
        sessions: sessionsForDay,
        minutes,
        punches: aggregate?.punches ?? 0,
        rounds: aggregate?.rounds ?? 0,
        level: future ? 0 : levelForMinutes(minutes, sessionsForDay),
      });
    }

    result.push({
      start: weekStart,
      monthLabel:
        month !== previousMonth
          ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(weekStart)
          : null,
      days,
    });
    previousMonth = month;
  }

  return result;
}

function summarizeSessions(sessions: SessionRecord[]): PeriodStat {
  return sessions.reduce<PeriodStat>(
    (total, session) => ({
      sessions: total.sessions + 1,
      minutes: total.minutes + session.activeSeconds / 60,
      punches: total.punches + session.punches,
      rounds: total.rounds + session.roundsCompleted,
    }),
    { sessions: 0, minutes: 0, punches: 0, rounds: 0 },
  );
}

function inRange(session: SessionRecord, start: Date, end: Date): boolean {
  const time = new Date(session.startedAt).getTime();
  return time >= start.getTime() && time < end.getTime();
}

function buildDayStats(days: Map<string, DayAggregate>, dates: Date[]): DayStat[] {
  return dates.map((date) => {
    const key = toDateKey(date);
    const aggregate = days.get(key);
    return {
      key,
      date,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
      shortLabel: new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(date),
      sessions: aggregate?.sessions ?? 0,
      minutes: (aggregate?.seconds ?? 0) / 60,
      punches: aggregate?.punches ?? 0,
      rounds: aggregate?.rounds ?? 0,
    };
  });
}

function buildWeekStat(weekStart: Date, days: Map<string, DayAggregate>): WeekStat {
  let sessions = 0;
  let seconds = 0;
  let punches = 0;
  let rounds = 0;

  for (let index = 0; index < 7; index += 1) {
    const aggregate = days.get(toDateKey(addDays(weekStart, index)));
    if (!aggregate) continue;
    sessions += aggregate.sessions;
    seconds += aggregate.seconds;
    punches += aggregate.punches;
    rounds += aggregate.rounds;
  }

  const weekEnd = addDays(weekStart, 6);
  return {
    start: weekStart,
    end: weekEnd,
    label: formatMonthDay(weekStart),
    shortLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      weekStart,
    ),
    sessions,
    minutes: seconds / 60,
    punches,
    rounds,
  };
}

function computeCurrentStreak(activeDays: Set<string>, now: Date): number {
  let cursor = startOfDay(now);
  if (!activeDays.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  if (!activeDays.has(toDateKey(cursor))) return 0;

  let streak = 0;
  while (activeDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function computeLongestStreak(activeDays: Set<string>): number {
  const sorted = [...activeDays].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const key of sorted) {
    const date = fromDateKey(key);
    if (previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

export function calculateStats(sessions: SessionRecord[], now = new Date()): TrainingStats {
  const days = aggregateDays(sessions);
  const activeDays = new Set(days.keys());
  const today = startOfDay(now);
  const last7Start = addDays(today, -6);
  const last14Start = addDays(today, -13);
  const tomorrow = addDays(today, 1);

  const last7Sessions = sessions.filter((session) =>
    inRange(session, last7Start, tomorrow),
  );
  const previous7Sessions = sessions.filter((session) =>
    inRange(session, last14Start, last7Start),
  );

  const weekStarts: Date[] = [];
  const currentWeekStart = startOfWeek(today);
  for (let index = 7; index >= 0; index -= 1) {
    weekStarts.push(addDays(currentWeekStart, -index * 7));
  }

  const weekly = weekStarts.map((weekStart) => buildWeekStat(weekStart, days));
  const last7Days = buildDayStats(
    days,
    Array.from({ length: 7 }, (_, index) => addDays(last7Start, index)),
  );

  let bestWeek: WeekStat | null = null;
  if (sessions.length && days.size) {
    const firstKey = [...days.keys()].sort()[0];
    let cursor = startOfWeek(fromDateKey(firstKey));
    const allWeeks: WeekStat[] = [];
    while (cursor.getTime() <= currentWeekStart.getTime()) {
      allWeeks.push(buildWeekStat(cursor, days));
      cursor = addDays(cursor, 7);
    }
    bestWeek =
      allWeeks
        .filter((week) => week.sessions > 0)
        .sort((a, b) => b.punches - a.punches || b.minutes - a.minutes)[0] ?? null;
  }

  const totalSeconds = sessions.reduce((total, session) => total + session.activeSeconds, 0);
  const bestSession =
    sessions
      .slice()
      .sort((a, b) => b.punches - a.punches || b.activeSeconds - a.activeSeconds)[0] ?? null;

  return {
    totalSessions: sessions.length,
    totalRounds: sessions.reduce((total, session) => total + session.roundsCompleted, 0),
    totalPunches: sessions.reduce((total, session) => total + session.punches, 0),
    totalMinutes: totalSeconds / 60,
    activeDays: activeDays.size,
    currentStreak: computeCurrentStreak(activeDays, now),
    longestStreak: computeLongestStreak(activeDays),
    avgSessionMinutes: sessions.length ? totalSeconds / 60 / sessions.length : 0,
    last7Days,
    weekly,
    thisWeek: summarizeSessions(last7Sessions),
    previousWeek: summarizeSessions(previous7Sessions),
    bestSession,
    bestWeek,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}
