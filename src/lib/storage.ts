import type { SessionConfig, SessionRecord } from '../types';
import { DEFAULT_CONFIG, validateConfig } from './session';

const SESSIONS_KEY = 'strikr:sessions:v1';
const CONFIG_KEY = 'strikr:config:v1';

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private modes. The app still runs in-memory.
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeSession(raw: unknown): SessionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<SessionRecord>;
  const started = typeof value.startedAt === 'string' ? new Date(value.startedAt) : null;
  if (!started || Number.isNaN(started.getTime())) return null;
  const startedAt = started.toISOString();

  const finished =
    typeof value.finishedAt === 'string' && !Number.isNaN(new Date(value.finishedAt).getTime())
      ? value.finishedAt
      : startedAt;

  const config = validateConfig(value.config);
  const totalRounds = isFiniteNumber(value.totalRounds)
    ? Math.max(1, Math.round(value.totalRounds))
    : config.rounds;
  const roundsCompleted = isFiniteNumber(value.roundsCompleted)
    ? Math.max(0, Math.min(totalRounds, Math.round(value.roundsCompleted)))
    : 0;

  return {
    id:
      typeof value.id === 'string' && value.id
        ? value.id
        : `session-${started.getTime()}-${Math.random().toString(16).slice(2)}`,
    startedAt,
    finishedAt: finished,
    config,
    completed: typeof value.completed === 'boolean' ? value.completed : roundsCompleted >= totalRounds,
    roundsCompleted,
    totalRounds,
    activeSeconds: isFiniteNumber(value.activeSeconds)
      ? Math.max(0, Math.round(value.activeSeconds))
      : 0,
    totalSeconds: isFiniteNumber(value.totalSeconds)
      ? Math.max(0, Math.round(value.totalSeconds))
      : 0,
    punches: isFiniteNumber(value.punches) ? Math.max(0, Math.round(value.punches)) : 0,
    combos: isFiniteNumber(value.combos) ? Math.max(0, Math.round(value.combos)) : 0,
    punchHistory: Array.isArray(value.punchHistory)
      ? value.punchHistory
          .filter(isFiniteNumber)
          .map((punches) => Math.max(0, Math.round(punches)))
      : [],
  };
}

export function loadSessions(): SessionRecord[] {
  const stored = readStorage(SESSIONS_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeSession)
      .filter((session): session is SessionRecord => session !== null)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  } catch {
    return [];
  }
}

export function saveSessions(sessions: SessionRecord[]) {
  writeStorage(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadConfig(): SessionConfig {
  const stored = readStorage(CONFIG_KEY);
  if (!stored) return { ...DEFAULT_CONFIG };
  try {
    return validateConfig(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: SessionConfig) {
  writeStorage(CONFIG_KEY, JSON.stringify(config));
}

export function createSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
