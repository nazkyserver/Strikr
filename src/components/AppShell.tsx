import { useState, type ReactNode } from 'react';
import {
  BoxingGlove,
  CaretRight,
  ChartLineUp,
  Flame,
  HouseSimple,
  ShieldCheck,
  Waveform,
} from '@phosphor-icons/react';
import type { AppView, TrainingStats } from '../types';
import { formatFullDate } from '../lib/date';
import { Brand } from './Brand';
import { VoiceWave } from './VoiceWave';

interface AppShellProps {
  children: ReactNode;
  view: AppView;
  stats: TrainingStats;
  onNavigate: (view: 'home' | 'setup' | 'stats') => void;
}

const NAV_ITEMS = [
  { id: 'home' as const, label: 'Overview', mobileLabel: 'Home', icon: HouseSimple },
  {
    id: 'setup' as const,
    label: 'New session',
    mobileLabel: 'Train',
    icon: BoxingGlove,
  },
  { id: 'stats' as const, label: 'Progress', mobileLabel: 'Stats', icon: ChartLineUp },
];

const PAGE_LABELS: Record<string, string> = {
  home: 'Overview',
  setup: 'Session builder',
  stats: 'Progress',
  summary: 'Session complete',
};

function currentDate() {
  return new Date();
}

export function AppShell({ children, view, stats, onNavigate }: AppShellProps) {
  const activeView = view === 'summary' ? 'stats' : view;
  const [today] = useState(currentDate);

  return (
    <div className="app-shell">
      <div className="noise" aria-hidden="true" />
      <aside className="sidebar">
        <button className="brand-link" type="button" onClick={() => onNavigate('home')}>
          <Brand />
        </button>
        <p className="sidebar-kicker">Voice-guided boxing</p>

        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`side-link${active ? ' is-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="side-link-icon">
                  <Icon size={19} weight={active ? 'fill' : 'regular'} />
                </span>
                <span>{item.label}</span>
                <CaretRight className="side-link-arrow" size={14} weight="bold" />
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <section className="sidebar-streak">
          <div className="sidebar-streak-head">
            <span className="sidebar-streak-icon">
              <Flame size={15} weight="fill" />
            </span>
            <span>Training streak</span>
          </div>
          <div className="sidebar-streak-value">
            {stats.currentStreak}
            <span>{stats.currentStreak === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="streak-pips" aria-label="Last seven days">
            {stats.last7Days.map((day) => (
              <span
                key={day.key}
                className={`streak-pip${day.sessions > 0 ? ' is-on' : ''}`}
                title={`${day.label}: ${day.sessions} session${day.sessions === 1 ? '' : 's'}`}
              />
            ))}
          </div>
          <p className="sidebar-streak-copy">
            {stats.currentStreak > 0
              ? 'Keep the chain alive. One more round today.'
              : 'Your next session starts the chain.'}
          </p>
        </section>

        <button
          type="button"
          className="sidebar-voice"
          onClick={() => onNavigate('setup')}
        >
          <span className="sidebar-voice-icon">
            <Waveform size={17} weight="bold" />
          </span>
          <span>
            <b>Voice coach ready</b>
            <small>Start a guided session</small>
          </span>
          <CaretRight size={14} weight="bold" />
        </button>

        <div className="sidebar-footer">
          <ShieldCheck size={15} />
          <span>Your data stays on this device.</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand">
            <button type="button" onClick={() => onNavigate('home')} aria-label="Go home">
              <Brand />
            </button>
          </div>
          <div className="topbar-crumb">
            <span className="topbar-club">Strikr Training Club</span>
            <span className="topbar-slash">/</span>
            <span className="topbar-page">{PAGE_LABELS[view] ?? 'Overview'}</span>
          </div>
          <div className="topbar-right">
            <div className="topbar-voice">
              <VoiceWave active={false} bars={4} />
              <span>Voice coach ready</span>
            </div>
            <span className="topbar-date">{formatFullDate(today)}</span>
            <span className="topbar-avatar" aria-hidden="true">
              <BoxingGlove size={19} weight="fill" />
            </span>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-link${active ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={21} weight={active ? 'fill' : 'regular'} />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
