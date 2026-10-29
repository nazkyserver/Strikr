import type { Difficulty, Intensity, SessionConfig, VoiceGender, Volume } from '../types';

export interface OptionMeta<T extends string> {
  id: T;
  label: string;
  shortLabel: string;
  description: string;
}

export const DIFFICULTY_OPTIONS: Array<OptionMeta<Difficulty> & { level: string }> = [
  {
    id: 'beginner',
    label: 'Beginner',
    shortLabel: 'Rookie',
    level: '01',
    description: 'Build clean fundamentals with jabs, crosses and hooks.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    shortLabel: 'Contender',
    level: '02',
    description: 'Mix uppercuts, body work and sharper combinations.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    shortLabel: 'Fight ready',
    level: '03',
    description: 'Add slips, rolls and counter punches under pressure.',
  },
];

export const INTENSITY_OPTIONS: Array<
  OptionMeta<Intensity> & { seconds: number; action: string }
> = [
  {
    id: 'light',
    label: 'Light',
    shortLabel: 'Controlled',
    seconds: 5,
    action: '5s between calls',
    description: 'Controlled pace with room to reset.',
  },
  {
    id: 'medium',
    label: 'Medium',
    shortLabel: 'Steady',
    seconds: 3,
    action: '3s between calls',
    description: 'A steady rhythm. Keep your guard up.',
  },
  {
    id: 'hard',
    label: 'Hard',
    shortLabel: 'Relentless',
    seconds: 2,
    action: '2s between calls',
    description: 'Rapid-fire calls. Stay in the pocket.',
  },
];

export const VOLUME_OPTIONS: Array<
  OptionMeta<Volume> & { punchesPerMinute: number; bars: number }
> = [
  {
    id: 'light',
    label: 'Light',
    shortLabel: 'Low output',
    punchesPerMinute: 40,
    bars: 1,
    description: 'Short, sharp combinations with room to breathe.',
  },
  {
    id: 'medium',
    label: 'Medium',
    shortLabel: 'Balanced',
    punchesPerMinute: 60,
    bars: 2,
    description: 'A balanced work rate for sharp, technical rounds.',
  },
  {
    id: 'hard',
    label: 'Hard',
    shortLabel: 'High output',
    punchesPerMinute: 80,
    bars: 3,
    description: 'High-density output. Empty the tank.',
  },
];

export const VOICE_GENDER_OPTIONS: Array<OptionMeta<VoiceGender>> = [
  {
    id: 'female',
    label: 'Female',
    shortLabel: 'Warm and sharp',
    description: 'A clear, steady female coach.',
  },
  {
    id: 'male',
    label: 'Male',
    shortLabel: 'Low and direct',
    description: 'A deeper, driving male coach.',
  },
];

export const ROUND_LENGTH_OPTIONS = [60, 120, 180, 300, 420, 600];
export const REST_OPTIONS = [60, 90, 120];
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 20;
export const MIN_CUSTOM_ROUND = 30;
export const MAX_CUSTOM_ROUND = 1800;

export const DEFAULT_CONFIG: SessionConfig = {
  difficulty: 'intermediate',
  intensity: 'medium',
  volume: 'medium',
  roundSeconds: 180,
  restSeconds: 60,
  rounds: 6,
  voice: true,
  voiceGender: 'female',
};

export function getDifficulty(id: Difficulty) {
  return DIFFICULTY_OPTIONS.find((option) => option.id === id) ?? DIFFICULTY_OPTIONS[0];
}

export function getIntensity(id: Intensity) {
  return INTENSITY_OPTIONS.find((option) => option.id === id) ?? INTENSITY_OPTIONS[1];
}

export function getVolume(id: Volume) {
  return VOLUME_OPTIONS.find((option) => option.id === id) ?? VOLUME_OPTIONS[1];
}

export function getVoiceGender(id: VoiceGender) {
  return VOICE_GENDER_OPTIONS.find((option) => option.id === id) ?? VOICE_GENDER_OPTIONS[0];
}

export function clampRounds(value: number): number {
  return Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, Math.round(value)));
}

export function clampRoundSeconds(value: number): number {
  const rounded = Math.round(value / 30) * 30;
  return Math.max(MIN_CUSTOM_ROUND, Math.min(MAX_CUSTOM_ROUND, rounded));
}

export function comboLengthForConfig(config: SessionConfig): number {
  const intensity = getIntensity(config.intensity);
  const volume = getVolume(config.volume);
  const callsPerMinute = 60 / intensity.seconds;
  return Math.max(1, Math.min(8, volume.punchesPerMinute / callsPerMinute));
}

export function estimateSession(config: SessionConfig) {
  const activeSeconds = config.rounds * config.roundSeconds;
  const restSeconds = Math.max(0, config.rounds - 1) * config.restSeconds;
  const readySeconds = 3;
  const volume = getVolume(config.volume);
  const punches = Math.round((volume.punchesPerMinute / 60) * activeSeconds);
  const calls = Math.round((activeSeconds / getIntensity(config.intensity).seconds));
  return {
    activeSeconds,
    restSeconds,
    totalSeconds: activeSeconds + restSeconds + readySeconds,
    punches,
    calls,
    avgCombo: comboLengthForConfig(config),
  };
}

export function configSummary(config: SessionConfig): string {
  const roundLabel = config.rounds === 1 ? 'round' : 'rounds';
  return `${config.rounds} ${roundLabel} · ${formatConfigClock(config.roundSeconds)} work · ${formatConfigClock(
    config.restSeconds,
  )} rest`;
}

export function formatConfigClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function validateConfig(raw: unknown): SessionConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const candidate = raw as Partial<SessionConfig>;
  const difficulty = DIFFICULTY_OPTIONS.some((option) => option.id === candidate.difficulty)
    ? candidate.difficulty
    : DEFAULT_CONFIG.difficulty;
  const intensity = INTENSITY_OPTIONS.some((option) => option.id === candidate.intensity)
    ? candidate.intensity
    : DEFAULT_CONFIG.intensity;
  const volume = VOLUME_OPTIONS.some((option) => option.id === candidate.volume)
    ? candidate.volume
    : DEFAULT_CONFIG.volume;
  const voiceGender = VOICE_GENDER_OPTIONS.some((option) => option.id === candidate.voiceGender)
    ? candidate.voiceGender
    : DEFAULT_CONFIG.voiceGender;

  const roundSeconds =
    typeof candidate.roundSeconds === 'number' &&
    Number.isFinite(candidate.roundSeconds) &&
    candidate.roundSeconds >= MIN_CUSTOM_ROUND &&
    candidate.roundSeconds <= MAX_CUSTOM_ROUND
      ? Math.round(candidate.roundSeconds)
      : DEFAULT_CONFIG.roundSeconds;

  const restSeconds = REST_OPTIONS.includes(Number(candidate.restSeconds))
    ? Number(candidate.restSeconds)
    : DEFAULT_CONFIG.restSeconds;

  return {
    difficulty: difficulty as Difficulty,
    intensity: intensity as Intensity,
    volume: volume as Volume,
    roundSeconds,
    restSeconds,
    rounds:
      typeof candidate.rounds === 'number' && Number.isFinite(candidate.rounds)
        ? clampRounds(candidate.rounds)
        : DEFAULT_CONFIG.rounds,
    voice: typeof candidate.voice === 'boolean' ? candidate.voice : true,
    voiceGender: voiceGender as VoiceGender,
  };
}
