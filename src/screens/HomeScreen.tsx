import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BoxingGlove,
  ChartLineUp,
  Clock,
  Flame,
  Play,
  Target,
} from '@phosphor-icons/react';
import type { SessionConfig, SessionRecord, TrainingStats } from '../types';
import {
  formatDurationWords,
  formatFullDate,
  formatNumber,
  getGreeting,
  pluralize,
} from '../lib/date';
import { buildHeatmapWeeks } from '../lib/stats';
import {
  configSummary,
  formatConfigClock,
  getDifficulty,
  getIntensity,
} from '../lib/session';
import { Heatmap } from '../components/Heatmap';
import { SessionRow } from '../components/SessionRow';
import { StatCard } from '../components/StatCard';

interface HomeScreenProps {
  sessions: SessionRecord[];
  stats: TrainingStats;
  config: SessionConfig;
  onStart: () => void;
  onViewStats: () => void;
}

function formatToday() {
  return formatFullDate(new Date());
}

export function HomeScreen({ sessions, stats, config, onStart, onViewStats }: HomeScreenProps) {
  const [today] = useState(formatToday);
  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(sessions, 26), [sessions]);
  const latestSessions = sessions.slice(0, 3);
  const maxMinutes = Math.max(...stats.last7Days.map((day) => day.minutes), 1);
  const difficulty = getDifficulty(config.difficulty);
  const intensity = getIntensity(config.intensity);

  return (
    <div className="page-content home-page">
      <header className="home-header">
        <div>
          <p className="eyebrow">
            {today}
            <span className="eyebrow-dot" />
            {stats.currentStreak > 0
              ? `${pluralize(stats.currentStreak, 'day')} on the chain`
              : 'Your corner is ready'}
          </p>
          <h1 className="page-title">
            {getGreeting()}, <span className="text-accent">fighter.</span>
          </h1>
          <p className="page-lede">The rounds you don&apos;t throw are the ones you regret.</p>
        </div>
        <div className="home-header-side">
          <span className="micro-label">Saved blueprint</span>
          <strong>{configSummary(config)}</strong>
          <span>{difficulty.label} · {intensity.label} intensity</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-lines" aria-hidden="true" />
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="live-dot" />
            Voice coach standing by
          </p>
          <h2 className="hero-title" id="hero-title">
            <span>STAY IN</span>
            <span>
              THE <em>FIGHT.</em>
            </span>
          </h2>
          <p className="hero-description">
            Random combinations called out loud. No screen to stare at. Just hands up, eyes
            forward, and one more round.
          </p>
          <div className="hero-actions">
            <button className="btn btn--primary btn--lg" type="button" onClick={onStart}>
              <Play size={17} weight="fill" />
              Start a session
              <ArrowRight size={17} weight="bold" />
            </button>
            <button className="hero-link" type="button" onClick={onViewStats}>
              View progress
              <ArrowUpRight size={15} weight="bold" />
            </button>
          </div>
          <div className="hero-footnote">
            <span>Voice-guided</span>
            <span>Real bells</span>
            <span>Every combo random</span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-corner hero-art-corner--top">STRIKR / VOICE AI</div>
          <div className="hero-orbit">
            <span className="hero-orbit-ring hero-orbit-ring--outer" />
            <span className="hero-orbit-ring hero-orbit-ring--inner" />
            <span className="hero-combo-tag hero-combo-tag--one">JAB</span>
            <span className="hero-combo-tag hero-combo-tag--two">CROSS</span>
            <span className="hero-combo-tag hero-combo-tag--three">HOOK</span>
            <div className="hero-glove-wrap">
              <BoxingGlove className="hero-glove" size={128} weight="fill" />
              <span className="hero-round-label">NEXT SESSION</span>
              <span className="hero-round-value">{String(config.rounds).padStart(2, '0')}</span>
              <span className="hero-round-unit">
                {config.rounds === 1 ? 'ROUND' : 'ROUNDS'}
              </span>
            </div>
            <span className="hero-orbit-word">VOICE COACH · STRIKR ·</span>
          </div>
          <div className="hero-art-bar">
            <span>
              <small>LEVEL</small>
              <b>{difficulty.shortLabel}</b>
            </span>
            <span>
              <small>TEMPO</small>
              <b>{intensity.seconds}s gap</b>
            </span>
            <span>
              <small>FORMAT</small>
              <b>
                {config.rounds} × {formatConfigClock(config.roundSeconds)}
              </b>
            </span>
          </div>
        </div>
      </section>

      <section className="quick-stats" aria-label="Training totals">
        <StatCard
          icon={<Flame size={18} weight="fill" />}
          label="Current streak"
          value={stats.currentStreak}
          suffix={stats.currentStreak === 1 ? 'day' : 'days'}
          detail={`Longest: ${pluralize(stats.longestStreak, 'day')}`}
          tone="accent"
        />
        <StatCard
          icon={<BoxingGlove size={18} weight="fill" />}
          label="Punches thrown"
          value={formatNumber(stats.totalPunches)}
          detail={`${pluralize(stats.totalSessions, 'session')} logged`}
        />
        <StatCard
          icon={<Target size={18} weight="bold" />}
          label="Rounds completed"
          value={formatNumber(stats.totalRounds)}
          detail="All time"
        />
        <StatCard
          icon={<Clock size={18} weight="bold" />}
          label="Ring time"
          value={formatDurationWords(stats.totalMinutes * 60)}
          detail={`${pluralize(stats.activeDays, 'active day')}`}
        />
      </section>

      <div className="home-grid">
        <section className="panel week-panel">
          <header className="panel-head">
            <div>
              <p className="micro-label">Last 7 days</p>
              <h2>Weekly work</h2>
            </div>
            <span className="panel-chip">
              {pluralize(stats.thisWeek.sessions, 'session')}
            </span>
          </header>

          <div className="week-numbers">
            <div>
              <strong>{formatDurationWords(stats.thisWeek.minutes * 60)}</strong>
              <span>time in the ring</span>
            </div>
            <div>
              <strong>{formatNumber(stats.thisWeek.punches)}</strong>
              <span>punches thrown</span>
            </div>
            <div>
              <strong>{formatNumber(stats.thisWeek.rounds)}</strong>
              <span>rounds finished</span>
            </div>
          </div>

          <div className="week-chart">
            {stats.last7Days.map((day, index) => {
              const height = day.minutes > 0 ? Math.max(8, (day.minutes / maxMinutes) * 82) : 2;
              const isToday = index === stats.last7Days.length - 1;
              return (
                <div
                  className={`week-bar${isToday ? ' is-today' : ''}${
                    day.minutes === 0 ? ' is-empty' : ''
                  }`}
                  key={day.key}
                  title={`${day.label}: ${Math.round(day.minutes)} min · ${day.punches} punches`}
                >
                  <div className="week-bar-visual">
                    <span className="week-bar-value">
                      {day.minutes > 0 ? Math.round(day.minutes) : '—'}
                    </span>
                    <span className="week-bar-fill" style={{ height: `${height}%` }} />
                  </div>
                  <span className="week-bar-label">{day.label.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
          <div className="week-chart-caption">
            <span>Minutes per day</span>
            <span>Peak {Math.round(maxMinutes)} min</span>
          </div>
        </section>

        <section className="panel recent-panel">
          <header className="panel-head">
            <div>
              <p className="micro-label">The tape</p>
              <h2>Recent sessions</h2>
            </div>
            <button className="text-link" type="button" onClick={onViewStats}>
              View all
              <ArrowUpRight size={13} weight="bold" />
            </button>
          </header>

          {latestSessions.length > 0 ? (
            <div className="session-list">
              {latestSessions.map((session) => (
                <SessionRow key={session.id} session={session} compact />
              ))}
            </div>
          ) : (
            <div className="empty-session">
              <span className="empty-session-icon">
                <ChartLineUp size={22} weight="bold" />
              </span>
              <h3>The tape is empty.</h3>
              <p>Run your first session and every round will land here.</p>
              <button className="btn btn--ghost btn--sm" type="button" onClick={onStart}>
                Build first session
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="panel consistency-panel">
        <header className="panel-head">
          <div>
            <p className="micro-label">Consistency</p>
            <h2>Show up. Stack days.</h2>
          </div>
          <div className="panel-head-stats">
            <span>
              <b>{stats.activeDays}</b> active days
            </span>
            <span>
              <b>{pluralize(stats.longestStreak, 'day')}</b> longest streak
            </span>
            <button className="text-link" type="button" onClick={onViewStats}>
              Full history
              <ArrowUpRight size={13} weight="bold" />
            </button>
          </div>
        </header>
        <Heatmap weeks={heatmapWeeks} compact />
      </section>
    </div>
  );
}
