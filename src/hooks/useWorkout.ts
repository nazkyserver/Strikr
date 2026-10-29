import { useEffect, useRef, useState } from 'react';
import type { Combo, SessionConfig, SessionRecord, VoiceGender, WorkoutPhase } from '../types';
import { comboVoiceLine, createCombo } from '../lib/combos';
import { playCue, primeAudio } from '../lib/sound';
import {
  cancelSpeech,
  isSpeechSupported,
  pauseSpeech,
  resumeSpeech,
  speak,
  warmUpSpeech,
} from '../lib/speech';
import { createSessionId } from '../lib/storage';
import { getIntensity } from '../lib/session';

interface Engine {
  phase: WorkoutPhase;
  round: number;
  phaseRemainingMs: number;
  phaseTotalMs: number;
  comboRemainingMs: number;
  currentCombo: Combo | null;
  comboSequence: number;
  roundsCompleted: number;
  totalPunches: number;
  totalCombos: number;
  roundPunches: number;
  roundCombos: number;
  punchHistory: number[];
  activeMs: number;
  totalMs: number;
  warningSent: boolean;
  restCueSecond: number;
}

export interface WorkoutSnapshot {
  phase: WorkoutPhase;
  round: number;
  totalRounds: number;
  phaseRemainingMs: number;
  phaseTotalMs: number;
  comboRemainingMs: number;
  currentCombo: Combo | null;
  comboSequence: number;
  roundsCompleted: number;
  totalPunches: number;
  totalCombos: number;
  roundPunches: number;
  roundCombos: number;
  punchHistory: number[];
  activeMs: number;
  totalMs: number;
  phaseProgress: number;
}

interface SpeakEvent {
  type: 'speak';
  text: string;
  rate?: number;
}

interface CueEvent {
  type: 'cue';
  cue: 'round' | 'rest' | 'end' | 'warning' | 'tick';
}

type EngineEvent = SpeakEvent | CueEvent;

const READY_DURATION = 3000;

function createTimestamp(): string {
  return new Date().toISOString();
}

function createEngine(): Engine {
  return {
    phase: 'ready',
    round: 1,
    phaseRemainingMs: READY_DURATION,
    phaseTotalMs: READY_DURATION,
    comboRemainingMs: 0,
    currentCombo: null,
    comboSequence: 0,
    roundsCompleted: 0,
    totalPunches: 0,
    totalCombos: 0,
    roundPunches: 0,
    roundCombos: 0,
    punchHistory: [],
    activeMs: 0,
    totalMs: 0,
    warningSent: false,
    restCueSecond: 0,
  };
}

function snapshotFromEngine(engine: Engine, config: SessionConfig): WorkoutSnapshot {
  return {
    phase: engine.phase,
    round: engine.round,
    totalRounds: config.rounds,
    phaseRemainingMs: Math.max(0, engine.phaseRemainingMs),
    phaseTotalMs: engine.phaseTotalMs,
    comboRemainingMs: Math.max(0, engine.comboRemainingMs),
    currentCombo: engine.currentCombo,
    comboSequence: engine.comboSequence,
    roundsCompleted: engine.roundsCompleted,
    totalPunches: engine.totalPunches,
    totalCombos: engine.totalCombos,
    roundPunches: engine.roundPunches,
    roundCombos: engine.roundCombos,
    punchHistory: [...engine.punchHistory],
    activeMs: engine.activeMs,
    totalMs: engine.totalMs,
    phaseProgress:
      engine.phaseTotalMs > 0
        ? Math.min(1, Math.max(0, 1 - engine.phaseRemainingMs / engine.phaseTotalMs))
        : 0,
  };
}

function ordinal(round: number): string {
  if (round === 1) return 'One';
  if (round === 2) return 'Two';
  if (round === 3) return 'Three';
  if (round === 4) return 'Four';
  if (round === 5) return 'Five';
  if (round === 6) return 'Six';
  if (round === 7) return 'Seven';
  if (round === 8) return 'Eight';
  if (round === 9) return 'Nine';
  if (round === 10) return 'Ten';
  return String(round);
}

function restAnnouncement(seconds: number): string {
  if (seconds === 60) return 'Rest. One minute.';
  if (seconds === 90) return 'Rest. Ninety seconds.';
  if (seconds === 120) return 'Rest. Two minutes.';
  return `Rest. ${seconds} seconds.`;
}

function beginRound(engine: Engine, round: number, config: SessionConfig, events: EngineEvent[]) {
  engine.phase = 'work';
  engine.round = round;
  engine.phaseTotalMs = config.roundSeconds * 1000;
  engine.phaseRemainingMs = config.roundSeconds * 1000;
  engine.comboRemainingMs = 1200;
  engine.currentCombo = null;
  engine.roundPunches = 0;
  engine.roundCombos = 0;
  engine.warningSent = false;
  engine.restCueSecond = 0;
  events.push({ type: 'cue', cue: 'round' });

  if (round > 1) {
    events.push({
      type: 'speak',
      text: round === config.rounds ? 'Final round.' : `Round ${ordinal(round)}.`,
      rate: 0.94,
    });
    engine.comboRemainingMs = 1900;
  }
}

function buildRecord(
  engine: Engine,
  config: SessionConfig,
  startedAt: string,
  completed: boolean,
): SessionRecord {
  const finishedAt = new Date().toISOString();
  const history = [...engine.punchHistory];
  if (completed) {
    if (history.length < engine.roundsCompleted) history.push(engine.roundPunches);
  } else if (engine.roundPunches > 0 && engine.phase === 'work') {
    history.push(engine.roundPunches);
  }

  return {
    id: createSessionId(),
    startedAt,
    finishedAt,
    config,
    completed,
    roundsCompleted: engine.roundsCompleted,
    totalRounds: config.rounds,
    activeSeconds: Math.round(engine.activeMs / 1000),
    totalSeconds: Math.round(engine.totalMs / 1000),
    punches: engine.totalPunches,
    combos: engine.totalCombos,
    punchHistory: history,
  };
}

function advance(
  engine: Engine,
  deltaMs: number,
  config: SessionConfig,
  events: EngineEvent[],
): void {
  if (engine.phase === 'complete') return;

  engine.totalMs += deltaMs;
  const previousRemaining = engine.phaseRemainingMs;
  engine.phaseRemainingMs -= deltaMs;

  if (engine.phase === 'ready') {
    if (engine.phaseRemainingMs <= 0) {
      beginRound(engine, 1, config, events);
    }
    return;
  }

  if (engine.phase === 'work') {
    engine.activeMs += Math.min(deltaMs, previousRemaining);
    engine.comboRemainingMs -= deltaMs;

    if (engine.phaseRemainingMs <= 0) {
      engine.punchHistory.push(engine.roundPunches);
      engine.roundsCompleted += 1;

      if (engine.round >= config.rounds) {
        engine.phase = 'complete';
        engine.currentCombo = null;
        engine.comboRemainingMs = 0;
        events.push({ type: 'cue', cue: 'end' });
        events.push({ type: 'speak', text: "That's the bell. Great work.", rate: 0.94 });
        return;
      }

      engine.phase = 'rest';
      engine.phaseTotalMs = config.restSeconds * 1000;
      engine.phaseRemainingMs = config.restSeconds * 1000;
      engine.comboRemainingMs = 0;
      engine.currentCombo = null;
      engine.roundPunches = 0;
      engine.roundCombos = 0;
      engine.warningSent = false;
      engine.restCueSecond = 0;
      events.push({ type: 'cue', cue: 'rest' });
      events.push({ type: 'speak', text: restAnnouncement(config.restSeconds), rate: 0.92 });
      return;
    }

    if (!engine.warningSent && previousRemaining > 10_000 && engine.phaseRemainingMs <= 10_000) {
      engine.warningSent = true;
      events.push({ type: 'cue', cue: 'warning' });
    }

    if (engine.comboRemainingMs <= 0) {
      const combo = createCombo(config, engine.comboSequence + 1);
      engine.comboSequence += 1;
      engine.currentCombo = combo;
      engine.totalCombos += 1;
      engine.roundCombos += 1;
      engine.totalPunches += combo.punches;
      engine.roundPunches += combo.punches;
      engine.comboRemainingMs = getIntensity(config.intensity).seconds * 1000;
      events.push({ type: 'speak', text: comboVoiceLine(combo) });
    }
    return;
  }

  if (engine.phase === 'rest') {
    const remainingSeconds = Math.ceil(Math.max(0, engine.phaseRemainingMs) / 1000);
    if (remainingSeconds > 0 && remainingSeconds <= 3 && remainingSeconds !== engine.restCueSecond) {
      engine.restCueSecond = remainingSeconds;
      events.push({ type: 'cue', cue: 'tick' });
    }

    if (!engine.warningSent && previousRemaining > 10_000 && engine.phaseRemainingMs <= 10_000) {
      engine.warningSent = true;
      events.push({ type: 'cue', cue: 'warning' });
    }

    if (engine.phaseRemainingMs <= 0) {
      beginRound(engine, engine.round + 1, config, events);
    }
  }
}

function processEvents(events: EngineEvent[], muted: boolean, voiceGender: VoiceGender) {
  for (const event of events) {
    if (event.type === 'cue') {
      playCue(event.cue);
    } else if (event.type === 'speak' && !muted) {
      speak(event.text, { rate: event.rate, voiceGender });
    }
  }
}

export function useWorkout(config: SessionConfig, onFinish: (record: SessionRecord) => void) {
  const configRef = useRef(config);
  const engineRef = useRef<Engine>(createEngine());
  const [snapshot, setSnapshot] = useState<WorkoutSnapshot>(() =>
    snapshotFromEngine(createEngine(), config),
  );
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(!config.voice);
  const [startedAt] = useState(createTimestamp);
  const pausedRef = useRef(false);
  const mutedRef = useRef(!config.voice);
  const onFinishRef = useRef(onFinish);
  const finishTimeoutRef = useRef<number | null>(null);
  const finishScheduledRef = useRef(false);
  const endedRef = useRef(false);
  const pendingRecordRef = useRef<SessionRecord | null>(null);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    warmUpSpeech();
    primeAudio();
    if (configRef.current.voice) {
      speak('Hands up. Get ready.', { rate: 0.95, voiceGender: configRef.current.voiceGender });
    }

    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 500);
      last = now;

      if (pausedRef.current || engineRef.current.phase === 'complete') return;

      const events: EngineEvent[] = [];
      advance(engineRef.current, delta, configRef.current, events);
      processEvents(events, mutedRef.current, configRef.current.voiceGender);
      setSnapshot(snapshotFromEngine(engineRef.current, configRef.current));

      const currentPhase = engineRef.current.phase as WorkoutPhase;
      if (
        currentPhase === 'complete' &&
        !finishScheduledRef.current &&
        !endedRef.current
      ) {
        finishScheduledRef.current = true;
        const record = buildRecord(engineRef.current, configRef.current, startedAt, true);
        pendingRecordRef.current = record;
        finishTimeoutRef.current = window.setTimeout(() => {
          if (endedRef.current) return;
          endedRef.current = true;
          onFinishRef.current(record);
        }, 2800);
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
      if (finishTimeoutRef.current !== null) window.clearTimeout(finishTimeoutRef.current);
      cancelSpeech();
    };
  }, [startedAt]);

  const togglePause = () => {
    setPaused((current) => {
      const next = !current;
      pausedRef.current = next;
      if (next) {
        pauseSpeech();
      } else {
        resumeSpeech();
      }
      setSnapshot(snapshotFromEngine(engineRef.current, configRef.current));
      return next;
    });
  };

  const toggleMute = () => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      if (next) cancelSpeech();
      return next;
    });
  };

  const skipRest = () => {
    if (engineRef.current.phase !== 'rest') return;
    cancelSpeech();
    const events: EngineEvent[] = [];
    beginRound(
      engineRef.current,
      engineRef.current.round + 1,
      configRef.current,
      events,
    );
    processEvents(events, mutedRef.current, configRef.current.voiceGender);
    setSnapshot(snapshotFromEngine(engineRef.current, configRef.current));
  };

  const finishNow = () => {
    if (endedRef.current) return;
    const record =
      pendingRecordRef.current ??
      buildRecord(
        engineRef.current,
        configRef.current,
        startedAt,
        engineRef.current.phase === 'complete',
      );
    if (finishTimeoutRef.current !== null) window.clearTimeout(finishTimeoutRef.current);
    cancelSpeech();
    endedRef.current = true;
    onFinishRef.current(record);
  };

  const endEarly = () => {
    if (endedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    cancelSpeech();
    const record = buildRecord(engineRef.current, configRef.current, startedAt, false);
    endedRef.current = true;
    onFinishRef.current(record);
  };

  return {
    snapshot,
    paused,
    muted,
    voiceSupported: isSpeechSupported(),
    togglePause,
    toggleMute,
    skipRest,
    finishNow,
    endEarly,
  };
}
