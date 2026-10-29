import {
  ArrowCounterClockwise,
  ArrowRight,
  ArrowUpRight,
  BoxingGlove,
  Check,
  Clock,
  Lightning,
  Target,
} from '@phosphor-icons/react';
import type { SessionRecord } from '../types';
import {
  formatClock,
  formatDateTime,
  formatDurationWords,
  formatNumber,
} from '../lib/date';
import {
  formatConfigClock,
  getDifficulty,
  getIntensity,
  getVolume,
} from '../lib/session';

interface SummaryScreenProps {
  record: SessionRecord;
  onHome: () => void;
  onAgain: () => void;
  onStats: () => void;
}

export function SummaryScreen({ record, onHome, onAgain, onStats }: SummaryScreenProps) {
  const difficulty = getDifficulty(record.config.difficulty);
  const intensity = getIntensity(record.config.intensity);
  const volume = getVolume(record.config.volume);
  const activeMinutes = record.activeSeconds / 60;
  const averagePace = activeMinutes > 0 ? Math.round(record.punches / activeMinutes) : 0;
  const maxRoundPunches = Math.max(...record.punchHistory, 1);
  const complete = record.completed;

  return (
    <div className="page-content summary-page">
      <section className="summary-hero">
        <div className="summary-copy">
          <p className="eyebrow">
            Session report <span className="eyebrow-dot" /> {formatDateTime(record.finishedAt)}
          </p>
          <h1 className="summary-title">
            {complete ? (
              <>
                Bell to <span className="text-accent">bell.</span>
              </>
            ) : (
              <>
                Work <span className="text-accent">banked.</span>
              </>
            )}
          </h1>
          <p className="summary-lede">
            {complete
              ? 'Every round answered. The version of you that started is not the one leaving.'
              : 'You left before the final bell, but every punch still counts. Come back sharper.'}
          </p>
          <div className="summary-actions">
            <button className="btn btn--primary" type="button" onClick={onHome}>
              Back to dashboard
              <ArrowRight size={16} weight="bold" />
            </button>
            <button className="btn btn--ghost" type="button" onClick={onAgain}>
              <ArrowCounterClockwise size={16} weight="bold" />
              Run it back
            </button>
            <button className="summary-stats-link" type="button" onClick={onStats}>
              See progress
              <ArrowUpRight size={14} weight="bold" />
            </button>
          </div>
        </div>

        <div className="summary-stamp" aria-hidden="true">
          <span className="summary-stamp-ring" />
          <span className="summary-stamp-text summary-stamp-text--top">ROUND</span>
          <span className="summary-stamp-icon">
            {complete ? <Check size={38} weight="bold" /> : <BoxingGlove size={38} weight="fill" />}
          </span>
          <span className="summary-stamp-text summary-stamp-text--bottom">
            {complete ? 'COMPLETE' : 'BANKED'}
          </span>
          <span className="summary-stamp-code">STRIKR / {record.id.slice(0, 4).toUpperCase()}</span>
        </div>
      </section>

      <section className="summary-metrics" aria-label="Session metrics">
        <div className="summary-metric summary-metric--accent">
          <span className="summary-metric-icon">
            <BoxingGlove size={18} weight="fill" />
          </span>
          <strong>{formatNumber(record.punches)}</strong>
          <span>Punches thrown</span>
          <small>{record.combos} combinations called</small>
        </div>
        <div className="summary-metric">
          <span className="summary-metric-icon">
            <Target size={18} weight="bold" />
          </span>
          <strong>
            {record.roundsCompleted}
            <em>/{record.totalRounds}</em>
          </strong>
          <span>Rounds completed</span>
          <small>{complete ? 'Full session' : 'Ended early'}</small>
        </div>
        <div className="summary-metric">
          <span className="summary-metric-icon">
            <Clock size={18} weight="bold" />
          </span>
          <strong>{formatDurationWords(record.activeSeconds)}</strong>
          <span>Active work</span>
          <small>{formatClock(record.activeSeconds)} on the clock</small>
        </div>
        <div className="summary-metric">
          <span className="summary-metric-icon">
            <Lightning size={18} weight="fill" />
          </span>
          <strong>
            {averagePace}
            <em> ppm</em>
          </strong>
          <span>Average output</span>
          <small>Target was {volume.punchesPerMinute} ppm</small>
        </div>
      </section>

      <div className="summary-grid">
        <section className="panel round-breakdown">
          <header className="panel-head">
            <div>
              <p className="micro-label">The tape</p>
              <h2>Punches by round</h2>
            </div>
            <span className="panel-chip">
              {record.roundsCompleted}/{record.totalRounds} banked
            </span>
          </header>

          {record.punchHistory.length > 0 ? (
            <div className="round-bars">
              {record.punchHistory.map((punches, index) => {
                const width = punches > 0 ? Math.max(3, (punches / maxRoundPunches) * 100) : 1;
                const isWork = index < record.roundsCompleted;
                return (
                  <div className="round-bar-row" key={index}>
                    <span className="round-bar-label">R{String(index + 1).padStart(2, '0')}</span>
                    <div className="round-bar-track">
                      <span
                        className={`round-bar-fill${isWork ? '' : ' is-partial'}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="round-bar-value">{punches}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-breakdown">
              <BoxingGlove size={24} weight="fill" />
              <p>No completed rounds in this session. The next one is yours.</p>
            </div>
          )}

          <div className="round-breakdown-foot">
            <span>
              <b>{formatDurationWords(record.totalSeconds)}</b> total session
            </span>
            <span>
              <b>{formatNumber(record.combos)}</b> combos called
            </span>
            <span>
              <b>{formatNumber(record.punches)}</b> total strikes
            </span>
          </div>
        </section>

        <section className="panel session-report">
          <header className="panel-head">
            <div>
              <p className="micro-label">Session card</p>
              <h2>The setup</h2>
            </div>
            <span className={`report-status${complete ? ' is-complete' : ''}`}>
              {complete ? 'Completed' : 'Partial'}
            </span>
          </header>

          <div className="report-list">
            <div>
              <span>Level</span>
              <b>{difficulty.label}</b>
            </div>
            <div>
              <span>Intensity</span>
              <b>
                {intensity.label} · {intensity.seconds}s
              </b>
            </div>
            <div>
              <span>Volume</span>
              <b>{volume.punchesPerMinute} punches / min</b>
            </div>
            <div>
              <span>Rounds</span>
              <b>
                {record.totalRounds} × {formatConfigClock(record.config.roundSeconds)}
              </b>
            </div>
            <div>
              <span>Rest</span>
              <b>{formatConfigClock(record.config.restSeconds)}</b>
            </div>
            <div>
              <span>Started</span>
              <b>
                {new Intl.DateTimeFormat('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(new Date(record.startedAt))}
              </b>
            </div>
          </div>

          <div className="report-quote">
            <span>“</span>
            <p>
              {complete
                ? 'You answered every bell. Recovery is part of the work too.'
                : 'Showing up is half the fight. Finish the story next time.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
