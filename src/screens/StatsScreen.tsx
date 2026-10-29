import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BoxingGlove,
  CalendarBlank,
  ChartLineUp,
  Clock,
  Flame,
  Medal,
  Target,
  Trophy,
} from '@phosphor-icons/react';
import type { SessionRecord, TrainingStats } from '../types';
import {
  formatDurationWords,
  formatMonthDay,
  formatNumber,
  formatShortDate,
  pluralize,
} from '../lib/date';
import { buildHeatmapWeeks, percentChange } from '../lib/stats';
import { Heatmap } from '../components/Heatmap';
import { SessionRow } from '../components/SessionRow';
import { StatCard } from '../components/StatCard';

interface StatsScreenProps {
  sessions: SessionRecord[];
  stats: TrainingStats;
  onStart: () => void;
}

const PERIODS = [
  { id: '3M' as const, label: '3 months', weeks: 13 },
  { id: '6M' as const, label: '6 months', weeks: 26 },
  { id: '1Y' as const, label: '1 year', weeks: 53 },
];

type PeriodId = (typeof PERIODS)[number]['id'];

export function StatsScreen({ sessions, stats, onStart }: StatsScreenProps) {
  const [period, setPeriod] = useState<PeriodId>('6M');
  const weekCount = PERIODS.find((option) => option.id === period)?.weeks ?? 26;
  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(sessions, weekCount), [sessions, weekCount]);
  const selectedPeriod = PERIODS.find((option) => option.id === period) ?? PERIODS[1];
  const maxWeekPunches = Math.max(...stats.weekly.map((week) => week.punches), 1);
  const lastEightPunches = stats.weekly.reduce((total, week) => total + week.punches, 0);
  const activeWeekly = stats.weekly.filter((week) => week.sessions > 0).length;
  const punchTrend = percentChange(stats.thisWeek.punches, stats.previousWeek.punches);
  const roundTrend = percentChange(stats.thisWeek.rounds, stats.previousWeek.rounds);
  const minuteTrend = percentChange(stats.thisWeek.minutes, stats.previousWeek.minutes);

  return (
    <div className="page-content stats-page">
      <header className="stats-header">
        <div>
          <p className="eyebrow">
            Progress <span className="eyebrow-dot" /> the record books
          </p>
          <h1 className="page-title">
            Proof of <span className="text-accent">work.</span>
          </h1>
          <p className="page-lede">
            Every bell, every combo, every small decision to show up. This is your tape.
          </p>
        </div>
        <button className="btn btn--primary" type="button" onClick={onStart}>
          <BoxingGlove size={17} weight="fill" />
          New session
          <ArrowRight size={16} weight="bold" />
        </button>
      </header>

      <section className="stats-metric-grid" aria-label="All-time stats">
        <StatCard
          icon={<BoxingGlove size={18} weight="fill" />}
          label="Punches thrown"
          value={formatNumber(stats.totalPunches)}
          trend={punchTrend}
          detail={`${formatNumber(stats.thisWeek.punches)} this week`}
        />
        <StatCard
          icon={<Target size={18} weight="bold" />}
          label="Rounds completed"
          value={formatNumber(stats.totalRounds)}
          trend={roundTrend}
          detail={`${stats.thisWeek.rounds} this week`}
        />
        <StatCard
          icon={<Clock size={18} weight="bold" />}
          label="Time in the ring"
          value={formatDurationWords(stats.totalMinutes * 60)}
          trend={minuteTrend}
          detail={`${formatDurationWords(stats.thisWeek.minutes * 60)} this week`}
        />
        <StatCard
          icon={<Flame size={18} weight="fill" />}
          label="Current streak"
          value={stats.currentStreak}
          suffix={stats.currentStreak === 1 ? 'day' : 'days'}
          detail={`Longest: ${pluralize(stats.longestStreak, 'day')}`}
          tone="accent"
        />
      </section>

      <section className="panel heatmap-panel">
        <header className="panel-head">
          <div>
            <p className="micro-label">Activity</p>
            <h2>Training heatmap</h2>
          </div>
          <div className="segmented" role="group" aria-label="Heatmap period">
            {PERIODS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={period === option.id ? 'is-active' : ''}
                onClick={() => setPeriod(option.id)}
                aria-pressed={period === option.id}
              >
                {option.id}
              </button>
            ))}
          </div>
        </header>

        <div className="heatmap-summary">
          <span>
            <b>{stats.activeDays}</b> active days
          </span>
          <span>
            <b>{stats.currentStreak}</b> day streak
          </span>
          <span>
            <b>{pluralize(stats.totalSessions, 'session')}</b> all time
          </span>
          <span className="heatmap-summary-period">Showing {selectedPeriod.label}</span>
        </div>

        <Heatmap weeks={heatmapWeeks} showReadout />
      </section>

      <div className="stats-secondary-grid">
        <section className="panel load-panel">
          <header className="panel-head">
            <div>
              <p className="micro-label">Output</p>
              <h2>Weekly load</h2>
            </div>
            <span className="panel-chip">Last 8 weeks</span>
          </header>

          <div className="load-summary">
            <div>
              <strong>{formatNumber(lastEightPunches)}</strong>
              <span>total punches</span>
            </div>
            <div>
              <strong>{Math.round(lastEightPunches / 8).toLocaleString()}</strong>
              <span>avg / week</span>
            </div>
            <div>
              <strong>{activeWeekly}/8</strong>
              <span>active weeks</span>
            </div>
          </div>

          <div className="load-chart" role="img" aria-label="Punches per week for the last eight weeks">
            <div className="load-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="load-bars">
              {stats.weekly.map((week, index) => {
                const height =
                  week.punches > 0 ? Math.max(5, (week.punches / maxWeekPunches) * 82) : 1.5;
                const isCurrent = index === stats.weekly.length - 1;
                return (
                  <div
                    className={`load-bar${isCurrent ? ' is-current' : ''}${
                      week.punches === 0 ? ' is-empty' : ''
                    }`}
                    key={week.start.toISOString()}
                    title={`${formatMonthDay(week.start)}–${formatMonthDay(
                      week.end,
                    )}: ${week.punches} punches · ${Math.round(week.minutes)} min`}
                  >
                    <span className="load-bar-value">
                      {week.punches > 0 ? formatNumber(week.punches) : ''}
                    </span>
                    <span className="load-bar-fill" style={{ height: `${height}%` }} />
                    <span className="load-bar-label">
                      {isCurrent ? 'This wk' : formatMonthDay(week.start)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel records-panel">
          <header className="panel-head">
            <div>
              <p className="micro-label">Personal bests</p>
              <h2>Redline moments</h2>
            </div>
            <Trophy size={21} weight="fill" className="panel-head-icon" />
          </header>

          <div className="record-list">
            <div className="record-row">
              <span className="record-icon">
                <Medal size={18} weight="fill" />
              </span>
              <div>
                <span>Best session</span>
                <b>
                  {stats.bestSession
                    ? `${formatNumber(stats.bestSession.punches)} punches`
                    : 'No sessions yet'}
                </b>
              </div>
              <span className="record-date">
                {stats.bestSession ? formatShortDate(stats.bestSession.startedAt) : '—'}
              </span>
            </div>

            <div className="record-row">
              <span className="record-icon">
                <ChartLineUp size={18} weight="bold" />
              </span>
              <div>
                <span>Biggest week</span>
                <b>
                  {stats.bestWeek
                    ? `${formatNumber(stats.bestWeek.punches)} punches`
                    : 'No training week yet'}
                </b>
              </div>
              <span className="record-date">
                {stats.bestWeek ? formatMonthDay(stats.bestWeek.start) : '—'}
              </span>
            </div>

            <div className="record-row">
              <span className="record-icon">
                <Flame size={18} weight="fill" />
              </span>
              <div>
                <span>Longest streak</span>
                <b>{pluralize(stats.longestStreak, 'day')}</b>
              </div>
              <span className="record-date">All time</span>
            </div>

            <div className="record-row">
              <span className="record-icon">
                <CalendarBlank size={18} weight="bold" />
              </span>
              <div>
                <span>Average session</span>
                <b>{formatDurationWords(stats.avgSessionMinutes * 60)}</b>
              </div>
              <span className="record-date">{pluralize(stats.totalSessions, 'session')}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="panel history-panel">
        <header className="panel-head">
          <div>
            <p className="micro-label">The tape</p>
            <h2>Session history</h2>
          </div>
          <span className="panel-chip">{pluralize(stats.totalSessions, 'session')}</span>
        </header>

        {sessions.length > 0 ? (
          <div className="history-list">
            {sessions.map((session) => (
              <SessionRow session={session} key={session.id} />
            ))}
          </div>
        ) : (
          <div className="empty-history">
            <span className="empty-session-icon">
              <BoxingGlove size={24} weight="fill" />
            </span>
            <h3>No rounds on tape. Yet.</h3>
            <p>Your first bell is the start of the record. Build a session and make it count.</p>
            <button className="btn btn--primary btn--sm" type="button" onClick={onStart}>
              Start your first session
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
