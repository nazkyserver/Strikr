import { BoxingGlove, Check } from '@phosphor-icons/react';
import type { SessionRecord } from '../types';
import { formatDurationWords, formatShortDate } from '../lib/date';
import { getDifficulty, getIntensity } from '../lib/session';

interface SessionRowProps {
  session: SessionRecord;
  compact?: boolean;
}

export function SessionRow({ session, compact = false }: SessionRowProps) {
  const difficulty = getDifficulty(session.config.difficulty);
  const intensity = getIntensity(session.config.intensity);

  return (
    <div className={`session-row${compact ? ' session-row--compact' : ''}`}>
      <span className="session-row-icon">
        <BoxingGlove size={compact ? 18 : 20} weight="fill" />
      </span>
      <div className="session-row-main">
        <div className="session-row-title">
          <b>{difficulty.label} session</b>
          {session.completed ? (
            <span className="session-complete">
              <Check size={10} weight="bold" /> Completed
            </span>
          ) : (
            <span className="session-partial">Ended early</span>
          )}
        </div>
        <span className="session-row-meta">
          {formatShortDate(session.startedAt)} · {session.roundsCompleted}/{session.totalRounds}{' '}
          rounds · {intensity.shortLabel} pace
        </span>
      </div>
      <div className="session-row-stats">
        <span>
          <b>{session.punches.toLocaleString()}</b> punches
        </span>
        <span>
          <b>{formatDurationWords(session.activeSeconds)}</b>
        </span>
      </div>
    </div>
  );
}
