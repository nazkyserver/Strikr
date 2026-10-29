import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Pause,
  Play,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from '@phosphor-icons/react';
import type { Combo, SessionConfig, SessionRecord } from '../types';
import { formatClock, formatDurationWords, formatNumber } from '../lib/date';
import { getIntensity } from '../lib/session';
import { useWorkout } from '../hooks/useWorkout';
import { isNativeApp, keepScreenAwake } from '../lib/native';
import { Brand } from '../components/Brand';
import { Modal } from '../components/Modal';
import { VoiceWave } from '../components/VoiceWave';

interface WorkoutScreenProps {
  config: SessionConfig;
  onFinish: (record: SessionRecord) => void;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function WorkoutScreen({ config, onFinish }: WorkoutScreenProps) {
  const {
    snapshot,
    paused,
    muted,
    togglePause,
    toggleMute,
    skipRest,
    finishNow,
    endEarly,
  } = useWorkout(config, onFinish);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resumeAfterCancel, setResumeAfterCancel] = useState(false);
  const [recentCombos, setRecentCombos] = useState<Combo[]>([]);
  const consideredComboRef = useRef<number | null>(null);

  const intensity = getIntensity(config.intensity);
  const isRest = snapshot.phase === 'rest';
  const isReady = snapshot.phase === 'ready';
  const isComplete = snapshot.phase === 'complete';
  const displayRound = isRest ? snapshot.round + 1 : snapshot.round;
  const phaseLabel = isReady ? 'Get ready' : isRest ? 'Rest' : isComplete ? 'Complete' : 'Work';
  const phaseTime = snapshot.phaseRemainingMs / 1000;
  const nextComboSeconds = Math.ceil(snapshot.comboRemainingMs / 1000);
  const comboProgress = Math.min(
    1,
    Math.max(0, 1 - snapshot.comboRemainingMs / (intensity.seconds * 1000)),
  );
  const totalWorkMs = config.rounds * config.roundSeconds * 1000;
  const sessionProgress = Math.min(1, Math.max(0, snapshot.activeMs / totalWorkMs));

  useEffect(() => {
    const combo = snapshot.currentCombo;
    if (!combo || consideredComboRef.current === combo.id) return;
    consideredComboRef.current = combo.id;
    setRecentCombos((previous) => [combo, ...previous].slice(0, 3));
  }, [snapshot.currentCombo]);

  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null;
    let releaseNative: (() => void) | null = null;
    let cancelled = false;
    const wakeLockNavigator = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };

    const requestWakeLock = async () => {
      if (isNativeApp) {
        if (releaseNative) return;
        const release = await keepScreenAwake();
        if (cancelled) {
          release?.();
          return;
        }
        releaseNative = release;
        return;
      }
      if (!wakeLockNavigator.wakeLock || document.visibilityState !== 'visible') return;
      try {
        const lock = await wakeLockNavigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        wakeLock = lock;
      } catch {
        // The screen can still sleep; the session clock remains authoritative.
      }
    };

    void requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) void wakeLock.release();
      if (releaseNative) releaseNative();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || confirmOpen || isComplete) return;
      const target = event.target as HTMLElement | null;
      if (target && ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      event.preventDefault();
      togglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmOpen, isComplete, togglePause]);

  const requestEnd = () => {
    if (!paused && !isComplete) {
      setResumeAfterCancel(true);
      togglePause();
    } else {
      setResumeAfterCancel(false);
    }
    setConfirmOpen(true);
  };

  const cancelEnd = () => {
    setConfirmOpen(false);
    if (resumeAfterCancel && paused) togglePause();
    setResumeAfterCancel(false);
  };

  const confirmEnd = () => {
    setConfirmOpen(false);
    endEarly();
  };

  return (
    <div className={`workout-page workout-page--${snapshot.phase}`}>
      <div className="workout-glow" aria-hidden="true" />
      <div className="workout-grid-lines" aria-hidden="true" />

      <header className="workout-topbar">
        <div className="workout-brand">
          <Brand />
          <span className="workout-live-tag">
            <span className="live-dot" />
            Live session
          </span>
        </div>
        <div className="workout-top-center">
          {isComplete
            ? 'Session complete'
            : isRest
              ? `Rest before round ${displayRound}`
              : `Round ${pad(snapshot.round)} of ${pad(snapshot.totalRounds)}`}
        </div>
        <div className="workout-top-actions">
          <button
            type="button"
            className="workout-icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute coach voice' : 'Mute coach voice'}
            title={muted ? 'Unmute coach' : 'Mute coach'}
          >
            {muted ? <SpeakerSlash size={19} /> : <SpeakerHigh size={19} />}
          </button>
          {!isComplete && (
            <button type="button" className="workout-end-btn" onClick={requestEnd}>
              <X size={15} weight="bold" />
              End
            </button>
          )}
        </div>
      </header>

      <div className="workout-main">
        <aside className="workout-aside workout-aside--left">
          <div className="round-indicator">
            <span className="micro-label">{isRest ? 'Next round' : 'Round'}</span>
            <div className="round-indicator-value">
              <b>{pad(displayRound)}</b>
              <span>/ {pad(snapshot.totalRounds)}</span>
            </div>
          </div>

          <div className="round-dots" aria-label="Round progress">
            {Array.from({ length: snapshot.totalRounds }, (_, index) => {
              const completed = index < snapshot.roundsCompleted;
              const active =
                (snapshot.phase === 'work' && index === snapshot.round - 1) ||
                (snapshot.phase === 'ready' && index === 0) ||
                (isRest && index === snapshot.round);
              return (
                <span
                  key={index}
                  className={`round-dot${completed ? ' is-complete' : ''}${
                    active ? ' is-active' : ''
                  }`}
                  title={`Round ${index + 1}`}
                />
              );
            })}
          </div>

          <div className="aside-rule" />

          <div className="aside-stats">
            <div>
              <span>Work time</span>
              <b>{formatClock(snapshot.activeMs / 1000)}</b>
            </div>
            <div>
              <span>Target pace</span>
              <b>{config.volume === 'light' ? 40 : config.volume === 'medium' ? 60 : 80} ppm</b>
            </div>
            <div>
              <span>Combos called</span>
              <b>{snapshot.totalCombos}</b>
            </div>
          </div>

          <p className="aside-whisper">
            {isRest ? 'Shake it out. The next round is already yours.' : 'Eyes forward. Hands up.'}
          </p>
        </aside>

        <main className="workout-center">
          <div className="phase-head">
            <div className="phase-head-copy">
              <span className={`phase-tag phase-tag--${snapshot.phase}`}>{phaseLabel}</span>
              <span className="phase-mobile-round">
                R{pad(displayRound)}/{pad(snapshot.totalRounds)}
              </span>
              <span className="phase-sub">
                {isReady
                  ? 'First bell in'
                  : isRest
                    ? `Round ${displayRound} is next`
                    : isComplete
                      ? 'Work saved'
                      : 'Stay sharp'}
              </span>
            </div>
            <div className="phase-clock">{formatClock(phaseTime)}</div>
          </div>
          <div className="phase-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, snapshot.phaseProgress * 100)}%` }} />
          </div>

          {isReady && (
            <div className="ready-stage">
              <span className="ready-eyebrow">Hands up · eyes forward</span>
              <div className="ready-count">
                {Math.max(1, Math.ceil(snapshot.phaseRemainingMs / 1000))}
              </div>
              <h1>GET READY.</h1>
              <p>Listen for the bell and the first combination.</p>
              <div className="ready-config">
                <span>{config.rounds} rounds</span>
                <span>{config.roundSeconds / 60} min work</span>
                <span>{intensity.seconds}s gaps</span>
              </div>
            </div>
          )}

          {snapshot.phase === 'work' && (
            <div className="call-stage">
              {snapshot.currentCombo ? (
                <div className="combo-call" key={snapshot.comboSequence}>
                  <div className="combo-call-top">
                    <span className="call-label">
                      <span className="call-dot" />
                      Sounding now
                    </span>
                    <span>{snapshot.currentCombo.punches} strikes</span>
                  </div>
                  <div className="combo-words">
                    {snapshot.currentCombo.tokens.map((token, index) => (
                      <span
                        className={`combo-word combo-word--${token.kind}`}
                        key={`${token.key}-${index}`}
                        style={{ animationDelay: `${index * 55}ms` }}
                      >
                        <small>{pad(index + 1)}</small>
                        {token.label}
                      </span>
                    ))}
                  </div>
                  <div className="call-live-row">
                    <span className="voice-live">
                      <VoiceWave active bars={5} />
                      Voice coach
                    </span>
                    <span className="next-call">
                      Next call in <b>{nextComboSeconds}s</b>
                    </span>
                  </div>
                  <div className="call-progress" aria-hidden="true">
                    <span style={{ width: `${comboProgress * 100}%` }} />
                  </div>
                </div>
              ) : (
                <div className="call-placeholder">
                  <VoiceWave active bars={7} />
                  <h2>LISTEN.</h2>
                  <p>First combination incoming.</p>
                </div>
              )}
            </div>
          )}

          {isRest && (
            <div className="rest-stage">
              <div className="breathing-orb" aria-hidden="true">
                <span />
                <span />
              </div>
              <span className="rest-eyebrow">Breathe · reset · reload</span>
              <h2>BREATHE.</h2>
              <p>Nose in. Mouth out. Loose shoulders. Ready for round {displayRound}.</p>
              <button className="btn btn--ghost skip-rest" type="button" onClick={skipRest}>
                Skip rest
                <SkipForward size={16} weight="fill" />
              </button>
            </div>
          )}

          {isComplete && (
            <div className="complete-stage">
              <span className="complete-check">
                <Check size={26} weight="bold" />
              </span>
              <span className="rest-eyebrow">Final bell</span>
              <h2>THAT&apos;S A WRAP.</h2>
              <p>All rounds banked. Take a breath, then check the tape.</p>
              <div className="complete-mini-stats">
                <span>
                  <b>{snapshot.totalPunches}</b> punches
                </span>
                <span>
                  <b>{snapshot.roundsCompleted}</b> rounds
                </span>
                <span>
                  <b>{formatDurationWords(snapshot.activeMs / 1000)}</b> work
                </span>
              </div>
              <button className="btn btn--primary" type="button" onClick={finishNow}>
                View summary
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>
          )}
        </main>

        <aside className="workout-aside workout-aside--right">
          <div className="live-card">
            <div className="live-card-head">
              <span className="micro-label">Live stats</span>
              <span className="live-status">
                <span className="live-dot" />
                Live
              </span>
            </div>
            <div className="live-stat">
              <span>Punches</span>
              <b>{formatNumber(snapshot.totalPunches)}</b>
            </div>
            <div className="live-stat">
              <span>This round</span>
              <b>{snapshot.roundPunches}</b>
            </div>
            <div className="live-stat">
              <span>Combos</span>
              <b>{snapshot.totalCombos}</b>
            </div>
            <div className="live-stat">
              <span>Work time</span>
              <b>{formatClock(snapshot.activeMs / 1000)}</b>
            </div>
          </div>

          <div className="recent-calls">
            <span className="micro-label">Recent calls</span>
            {recentCombos.length > 0 ? (
              recentCombos.map((combo, index) => (
                <div className={`recent-call${index === 0 ? ' is-latest' : ''}`} key={combo.id}>
                  <span>#{pad(combo.id)}</span>
                  <p>{combo.tokens.map((token) => token.label).join(' · ')}</p>
                </div>
              ))
            ) : (
              <p className="recent-calls-empty">No calls yet.</p>
            )}
          </div>
        </aside>
      </div>

      <footer className="workout-footer">
        <div className="session-progress">
          <div className="session-progress-head">
            <span>Session progress</span>
            <span>{Math.round(sessionProgress * 100)}%</span>
          </div>
          <div className="session-progress-track">
            <span style={{ width: `${sessionProgress * 100}%` }} />
          </div>
        </div>

        {!isComplete && (
          <button
            type="button"
            className="pause-btn"
            onClick={togglePause}
            aria-label={paused ? 'Resume session' : 'Pause session'}
          >
            <span>{paused ? <Play size={22} weight="fill" /> : <Pause size={22} weight="fill" />}</span>
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}

        <div className="workout-footer-note">
          <span>{paused ? 'Clock frozen' : 'Space to pause'}</span>
          <span>
            {snapshot.roundsCompleted} / {snapshot.totalRounds} rounds banked
          </span>
        </div>
      </footer>

      {paused && !confirmOpen && !isComplete && (
        <div className="pause-overlay">
          <div className="pause-card">
            <span className="pause-eyebrow">
              <span className="live-dot" />
              Clock frozen
            </span>
            <h2>Hold the round.</h2>
            <p>Catch your breath. Your session is still exactly where you left it.</p>
            <div className="pause-stats">
              <div>
                <span>Punches</span>
                <b>{snapshot.totalPunches}</b>
              </div>
              <div>
                <span>Round</span>
                <b>{displayRound}</b>
              </div>
              <div>
                <span>Work</span>
                <b>{formatClock(snapshot.activeMs / 1000)}</b>
              </div>
            </div>
            <button className="btn btn--primary btn--block" type="button" onClick={togglePause}>
              <Play size={16} weight="fill" />
              Resume session
            </button>
            <button className="btn btn--ghost btn--block" type="button" onClick={requestEnd}>
              End session
            </button>
          </div>
        </div>
      )}

      <Modal
        open={confirmOpen}
        eyebrow="End session"
        title="Leave the round unfinished?"
        description={`You've banked ${snapshot.roundsCompleted} of ${
          snapshot.totalRounds
        } rounds and thrown ${formatNumber(
          snapshot.totalPunches,
        )} punches. The work you've done will still be saved to your history.`}
        confirmLabel="End session"
        cancelLabel="Keep fighting"
        danger
        onConfirm={confirmEnd}
        onCancel={cancelEnd}
      />
    </div>
  );
}
