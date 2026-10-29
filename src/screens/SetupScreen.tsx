import { useState } from 'react';
import {
  ArrowRight,
  BoxingGlove,
  Check,
  Clock,
  Flag,
  GenderFemale,
  GenderMale,
  Lightning,
  MicrophoneStage,
  Minus,
  Play,
  Plus,
  ShieldCheck,
  Sneaker,
  Sparkle,
  Timer,
  Waveform,
} from '@phosphor-icons/react';
import type { Difficulty, SessionConfig, VoiceGender } from '../types';
import {
  DIFFICULTY_OPTIONS,
  INTENSITY_OPTIONS,
  MAX_CUSTOM_ROUND,
  MAX_ROUNDS,
  MIN_CUSTOM_ROUND,
  MIN_ROUNDS,
  REST_OPTIONS,
  ROUND_LENGTH_OPTIONS,
  SPEECH_PACE_OPTIONS,
  VOICE_GENDER_OPTIONS,
  VOLUME_OPTIONS,
  clampRoundSeconds,
  clampRounds,
  configSummary,
  estimateSession,
  formatConfigClock,
  getDifficulty,
  getIntensity,
  getSpeechPace,
  getVoiceGender,
  getVolume,
} from '../lib/session';
import {
  formatDurationWords,
  formatNumber,
  formatClock,
} from '../lib/date';
import { isSpeechSupported, previewVoice, warmUpSpeech } from '../lib/speech';
import { Toggle } from '../components/Toggle';
import { VoiceWave } from '../components/VoiceWave';

interface SetupScreenProps {
  config: SessionConfig;
  onChange: (config: SessionConfig) => void;
  onStart: () => void;
}

const DIFFICULTY_ICONS: Record<Difficulty, typeof Flag> = {
  beginner: Sneaker,
  intermediate: Lightning,
  advanced: BoxingGlove,
};

const VOICE_GENDER_ICONS: Record<VoiceGender, typeof GenderFemale> = {
  female: GenderFemale,
  male: GenderMale,
};

export function SetupScreen({ config, onChange, onStart }: SetupScreenProps) {
  const [customOpen, setCustomOpen] = useState(
    () => !ROUND_LENGTH_OPTIONS.includes(config.roundSeconds),
  );
  const estimate = estimateSession(config);
  const difficulty = getDifficulty(config.difficulty);
  const intensity = getIntensity(config.intensity);
  const volume = getVolume(config.volume);
  const voiceGender = getVoiceGender(config.voiceGender);
  const speechPace = getSpeechPace(config.speechPace);
  const customActive = customOpen || !ROUND_LENGTH_OPTIONS.includes(config.roundSeconds);

  const update = <K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const chooseRoundLength = (seconds: number) => {
    setCustomOpen(false);
    update('roundSeconds', seconds);
  };

  const chooseCustomLength = () => {
    setCustomOpen(true);
    if (ROUND_LENGTH_OPTIONS.includes(config.roundSeconds)) {
      update('roundSeconds', 240);
    }
  };

  const stepCustom = (delta: number) => {
    update('roundSeconds', clampRoundSeconds(config.roundSeconds + delta));
  };

  const handleVoicePreview = () => {
    warmUpSpeech();
    previewVoice(config.voiceGender, 0.96 * speechPace.rate);
  };

  return (
    <div className="page-content setup-page">
      <header className="setup-header">
        <div>
          <p className="eyebrow">
            New session <span className="eyebrow-dot" /> pre-fight
          </p>
          <h1 className="page-title">
            Build your <span className="text-accent">round.</span>
          </h1>
          <p className="page-lede">
            Set the work. The coach calls the combinations. You answer the bell.
          </p>
        </div>
        <div className="setup-header-status">
          <span className="status-badge">
            <span className="live-dot" />
            Voice ready
          </span>
          <span className="setup-header-note">Changes are saved to this device.</span>
        </div>
      </header>

      <div className="setup-layout">
        <div className="setup-form">
          <section className="setup-section" aria-labelledby="difficulty-heading">
            <header className="setup-section-head">
              <span className="section-number">01</span>
              <div>
                <h2 id="difficulty-heading">Choose your level</h2>
                <p>The higher the level, the deeper the punch vocabulary.</p>
              </div>
            </header>
            <div className="difficulty-grid" role="group" aria-label="Difficulty">
              {DIFFICULTY_OPTIONS.map((option) => {
                const Icon = DIFFICULTY_ICONS[option.id];
                const selected = config.difficulty === option.id;
                return (
                  <button
                    className={`difficulty-card${selected ? ' is-selected' : ''}`}
                    type="button"
                    key={option.id}
                    onClick={() => update('difficulty', option.id)}
                    aria-pressed={selected}
                  >
                    <span className="difficulty-card-top">
                      <span className="difficulty-icon">
                        <Icon size={19} weight={selected ? 'fill' : 'regular'} />
                      </span>
                      <span className="difficulty-index">{option.level}</span>
                    </span>
                    <span className="difficulty-title">{option.label}</span>
                    <span className="difficulty-tag">{option.shortLabel}</span>
                    <span className="difficulty-description">{option.description}</span>
                    <span className="option-check" aria-hidden="true">
                      {selected && <Check size={12} weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="setup-section" aria-labelledby="pace-heading">
            <header className="setup-section-head">
              <span className="section-number">02</span>
              <div>
                <h2 id="pace-heading">Set the pace</h2>
                <p>Control how often the coach calls and how much work lands each minute.</p>
              </div>
            </header>

            <div className="pace-grid">
              <div className="control-box">
                <div className="control-box-head">
                  <span>
                    <Waveform size={16} weight="bold" />
                    Intensity
                  </span>
                  <small>Time between calls</small>
                </div>
                <div className="intensity-options" role="group" aria-label="Intensity">
                  {INTENSITY_OPTIONS.map((option) => {
                    const selected = config.intensity === option.id;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={`intensity-option${selected ? ' is-selected' : ''}`}
                        onClick={() => update('intensity', option.id)}
                        aria-pressed={selected}
                      >
                        <span className="intensity-option-label">{option.label}</span>
                        <span className="intensity-seconds">
                          {option.seconds}
                          <small>s</small>
                        </span>
                        <span className="intensity-option-sub">{option.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="control-hint">{intensity.description}</p>
              </div>

              <div className="control-box">
                <div className="control-box-head">
                  <span>
                    <BoxingGlove size={16} weight="bold" />
                    Punch volume
                  </span>
                  <small>Per minute</small>
                </div>
                <div className="volume-options" role="group" aria-label="Punch volume">
                  {VOLUME_OPTIONS.map((option) => {
                    const selected = config.volume === option.id;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={`volume-option${selected ? ' is-selected' : ''}`}
                        onClick={() => update('volume', option.id)}
                        aria-pressed={selected}
                      >
                        <span className="volume-option-row">
                          <b>{option.label}</b>
                          <span>
                            {option.punchesPerMinute}
                            <small> ppm</small>
                          </span>
                        </span>
                        <span className="volume-meter" aria-hidden="true">
                          {[1, 2, 3].map((bar) => (
                            <span
                              key={bar}
                              className={bar <= option.bars ? 'is-filled' : ''}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="control-hint">{volume.description}</p>
              </div>
            </div>
          </section>

          <section className="setup-section" aria-labelledby="format-heading">
            <header className="setup-section-head">
              <span className="section-number">03</span>
              <div>
                <h2 id="format-heading">Round format</h2>
                <p>Set the distance. Six rounds is a strong place to start.</p>
              </div>
            </header>

            <div className="format-top">
              <div className="control-box round-count-box">
                <div className="control-box-head">
                  <span>
                    <Flag size={16} weight="bold" />
                    Rounds
                  </span>
                  <small>1–20</small>
                </div>
                <div className="rounds-stepper">
                  <button
                    type="button"
                    className="stepper-button"
                    onClick={() => update('rounds', clampRounds(config.rounds - 1))}
                    disabled={config.rounds <= MIN_ROUNDS}
                    aria-label="Remove one round"
                  >
                    <Minus size={17} weight="bold" />
                  </button>
                  <span className="stepper-value">
                    <b>{config.rounds}</b>
                    <span>{config.rounds === 1 ? 'round' : 'rounds'}</span>
                  </span>
                  <button
                    type="button"
                    className="stepper-button"
                    onClick={() => update('rounds', clampRounds(config.rounds + 1))}
                    disabled={config.rounds >= MAX_ROUNDS}
                    aria-label="Add one round"
                  >
                    <Plus size={17} weight="bold" />
                  </button>
                </div>
              </div>

              <div className="control-box">
                <div className="control-box-head">
                  <span>
                    <Clock size={16} weight="bold" />
                    Rest between rounds
                  </span>
                  <small>3 choices</small>
                </div>
                <div className="rest-options" role="group" aria-label="Rest duration">
                  {REST_OPTIONS.map((seconds) => {
                    const selected = config.restSeconds === seconds;
                    return (
                      <button
                        type="button"
                        key={seconds}
                        className={`rest-option${selected ? ' is-selected' : ''}`}
                        onClick={() => update('restSeconds', seconds)}
                        aria-pressed={selected}
                      >
                        <span>{formatConfigClock(seconds)}</span>
                        <small>{seconds === 90 ? '90 sec' : `${seconds / 60} min`}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="control-box round-length-box">
              <div className="control-box-head">
                <span>
                  <Timer size={16} weight="bold" />
                  Round length
                </span>
                <small>Work time per round</small>
              </div>
              <div className="round-length-options" role="group" aria-label="Round length">
                {ROUND_LENGTH_OPTIONS.map((seconds) => {
                  const selected =
                    !customActive && config.roundSeconds === seconds;
                  return (
                    <button
                      type="button"
                      key={seconds}
                      className={`length-option${selected ? ' is-selected' : ''}`}
                      onClick={() => chooseRoundLength(seconds)}
                      aria-pressed={selected}
                    >
                      <b>{seconds / 60}</b>
                      <small>min</small>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`length-option length-option--custom${
                    customActive ? ' is-selected' : ''
                  }`}
                  onClick={chooseCustomLength}
                  aria-pressed={customActive}
                >
                  <b>Custom</b>
                  <small>{customActive ? formatConfigClock(config.roundSeconds) : 'set'}</small>
                </button>
              </div>

              {customActive && (
                <div className="custom-round">
                  <div className="custom-round-copy">
                    <span className="custom-round-label">Custom round length</span>
                    <span>30 sec steps, up to 30 minutes.</span>
                  </div>
                  <div className="custom-stepper">
                    <button
                      type="button"
                      className="stepper-button stepper-button--small"
                      onClick={() => stepCustom(-30)}
                      disabled={config.roundSeconds <= MIN_CUSTOM_ROUND}
                      aria-label="Decrease round length by 30 seconds"
                    >
                      <Minus size={15} weight="bold" />
                    </button>
                    <span className="custom-clock">{formatConfigClock(config.roundSeconds)}</span>
                    <button
                      type="button"
                      className="stepper-button stepper-button--small"
                      onClick={() => stepCustom(30)}
                      disabled={config.roundSeconds >= MAX_CUSTOM_ROUND}
                      aria-label="Increase round length by 30 seconds"
                    >
                      <Plus size={15} weight="bold" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="setup-section" aria-labelledby="coach-heading">
            <header className="setup-section-head">
              <span className="section-number">04</span>
              <div>
                <h2 id="coach-heading">Coach preferences</h2>
                <p>Your coach speaks every combination. Keep the volume up.</p>
              </div>
            </header>

            <div className="voice-panel">
              <div className="voice-panel-copy">
                <span className="voice-panel-icon">
                  <MicrophoneStage size={22} weight="fill" />
                </span>
                <div>
                  <h3>Voice cues</h3>
                  <p>
                    {isSpeechSupported()
                      ? 'Combinations are called out loud using your device’s English voice.'
                      : 'This browser does not support voice synthesis. Bells and timers will still work.'}
                  </p>
                  <span className="voice-panel-meta">
                    <Waveform size={13} weight="bold" />
                    {config.voice
                      ? `English (US) · ${voiceGender.label} · Live calls`
                      : 'Voice muted'}
                  </span>
                  <div className="voice-choice" role="group" aria-label="Coach voice">
                    <span className="voice-choice-label">Coach voice</span>
                    {VOICE_GENDER_OPTIONS.map((option) => {
                      const Icon = VOICE_GENDER_ICONS[option.id];
                      const selected = config.voiceGender === option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`voice-choice-option${selected ? ' is-selected' : ''}`}
                          onClick={() => update('voiceGender', option.id)}
                          aria-pressed={selected}
                          title={option.description}
                        >
                          <Icon size={13} weight={selected ? 'fill' : 'regular'} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="voice-choice" role="group" aria-label="Speech pace">
                    <span className="voice-choice-label">Speech pace</span>
                    {SPEECH_PACE_OPTIONS.map((option) => {
                      const selected = config.speechPace === option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`voice-choice-option${selected ? ' is-selected' : ''}`}
                          onClick={() => update('speechPace', option.id)}
                          aria-pressed={selected}
                          title={`${option.description} (${option.shortLabel})`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="voice-panel-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleVoicePreview}
                  disabled={!config.voice || !isSpeechSupported()}
                >
                  <Play size={13} weight="fill" />
                  Test voice
                </button>
                <div className="voice-toggle-wrap">
                  <span>{config.voice ? 'On' : 'Off'}</span>
                  <Toggle
                    checked={config.voice}
                    onChange={(checked) => update('voice', checked)}
                    label="Voice cues"
                  />
                </div>
              </div>
              <VoiceWave active={config.voice} bars={6} className="voice-panel-wave" />
            </div>

            <div className="coach-note">
              <Sparkle size={16} weight="fill" />
              <span>
                Tip: don&apos;t look at the screen. Listen for your combo, breathe on the reset.
              </span>
            </div>
          </section>
        </div>

        <aside className="session-preview" aria-label="Session preview">
          <div className="session-card">
            <header className="session-card-head">
              <span>Session card</span>
              <span className="session-card-code">STRK / {String(config.rounds).padStart(2, '0')}</span>
            </header>
            <div className="session-card-main">
              <span className="micro-label">Total time</span>
              <strong className="session-card-clock">{formatClock(estimate.totalSeconds)}</strong>
              <div className="session-card-time-split">
                <span>{formatDurationWords(estimate.activeSeconds)} work</span>
                <span>{formatDurationWords(estimate.restSeconds)} rest</span>
              </div>
            </div>

            <div className="session-card-punches">
              <div>
                <span className="micro-label">Est. output</span>
                <strong>{formatNumber(estimate.punches)}</strong>
                <span>punches</span>
              </div>
              <span className="session-card-combo">
                ~{estimate.avgCombo.toFixed(1)} per combo
              </span>
            </div>

            <div className="session-card-rows">
              <div className="session-card-row">
                <span>Level</span>
                <b>{difficulty.label}</b>
              </div>
              <div className="session-card-row">
                <span>Intensity</span>
                <b>
                  {intensity.label} · {intensity.seconds}s
                </b>
              </div>
              <div className="session-card-row">
                <span>Volume</span>
                <b>{volume.punchesPerMinute} ppm</b>
              </div>
              <div className="session-card-row">
                <span>Rounds</span>
                <b>{configSummary(config)}</b>
              </div>
            </div>

            <button className="btn btn--primary btn--block session-start" type="button" onClick={onStart}>
              <Play size={17} weight="fill" />
              Start session
              <ArrowRight size={17} weight="bold" />
            </button>
            <p className="session-card-note">
              <ShieldCheck size={14} />
              Voice AI will call every combo. The first bell is 3 seconds after start.
            </p>
          </div>

          <div className="session-corner-note">
            <span className="session-corner-mark">“</span>
            <p>The body breaks before the mind. Stay in the pocket.</p>
            <span className="micro-label">Coach&apos;s corner</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
