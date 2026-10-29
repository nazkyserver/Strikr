export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Intensity = 'light' | 'medium' | 'hard';
export type Volume = 'light' | 'medium' | 'hard';
export type VoiceGender = 'female' | 'male';
export type AppView = 'home' | 'setup' | 'stats' | 'workout' | 'summary';
export type WorkoutPhase = 'ready' | 'work' | 'rest' | 'complete';

export interface SessionConfig {
  difficulty: Difficulty;
  intensity: Intensity;
  volume: Volume;
  roundSeconds: number;
  restSeconds: number;
  rounds: number;
  voice: boolean;
  voiceGender: VoiceGender;
}

export interface ComboToken {
  key: string;
  label: string;
  spoken: string;
  kind: 'punch' | 'defense';
}

export interface Combo {
  id: number;
  tokens: ComboToken[];
  punches: number;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  config: SessionConfig;
  completed: boolean;
  roundsCompleted: number;
  totalRounds: number;
  activeSeconds: number;
  totalSeconds: number;
  punches: number;
  combos: number;
  punchHistory: number[];
}

export interface DayActivity {
  key: string;
  date: Date;
  future: boolean;
  sessions: number;
  minutes: number;
  punches: number;
  rounds: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapWeek {
  start: Date;
  monthLabel: string | null;
  days: DayActivity[];
}

export interface WeekStat {
  start: Date;
  end: Date;
  label: string;
  shortLabel: string;
  sessions: number;
  minutes: number;
  punches: number;
  rounds: number;
}

export interface DayStat {
  key: string;
  date: Date;
  label: string;
  shortLabel: string;
  sessions: number;
  minutes: number;
  punches: number;
  rounds: number;
}

export interface PeriodStat {
  sessions: number;
  minutes: number;
  punches: number;
  rounds: number;
}

export interface TrainingStats {
  totalSessions: number;
  totalRounds: number;
  totalPunches: number;
  totalMinutes: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  avgSessionMinutes: number;
  last7Days: DayStat[];
  weekly: WeekStat[];
  thisWeek: PeriodStat;
  previousWeek: PeriodStat;
  bestSession: SessionRecord | null;
  bestWeek: WeekStat | null;
}
