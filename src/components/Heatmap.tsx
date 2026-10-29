import { useState } from 'react';
import type { DayActivity, HeatmapWeek } from '../types';
import { formatDateKey, formatMinutes, toDateKey } from '../lib/date';

interface HeatmapProps {
  weeks: HeatmapWeek[];
  compact?: boolean;
  showReadout?: boolean;
}

function currentDayKey() {
  return toDateKey(new Date());
}

export function Heatmap({ weeks, compact = false, showReadout = false }: HeatmapProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [todayKey] = useState(currentDayKey);
  const allDays = weeks.flatMap((week) => week.days);
  const activeDay =
    allDays.find((day) => day.key === activeKey) ??
    allDays.find((day) => day.key === todayKey) ??
    null;

  const cellLabel = (day: DayActivity) => {
    if (day.future) return 'Future date';
    if (day.sessions === 0) return `${formatDateKey(day.key)}: no training`;
    return `${formatDateKey(day.key)}: ${formatMinutes(Math.round(day.minutes))}, ${
      day.punches
    } punches, ${day.sessions} session${day.sessions === 1 ? '' : 's'}`;
  };

  return (
    <div className={`heatmap${compact ? ' heatmap--compact' : ''}`}>
      {showReadout && (
        <div className="heatmap-readout" aria-live="polite">
          {activeDay ? (
            <>
              <span className="heatmap-readout-date">{formatDateKey(activeDay.key)}</span>
              <span className="heatmap-readout-divider" />
              {activeDay.sessions > 0 ? (
                <span>
                  {formatMinutes(Math.round(activeDay.minutes))} · {activeDay.punches} punches ·{' '}
                  {activeDay.sessions} session{activeDay.sessions === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="is-muted">No session logged</span>
              )}
            </>
          ) : (
            <span className="is-muted">Hover or tap a day to inspect it.</span>
          )}
        </div>
      )}

      <div className="heatmap-body">
        <div className="heatmap-weekdays" aria-hidden="true">
          <span />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
        </div>
        <div className="heatmap-scroll">
          <div className="heatmap-months" aria-hidden="true">
            {weeks.map((week) => (
              <span key={week.start.toISOString()} className="heatmap-month">
                {week.monthLabel ?? ''}
              </span>
            ))}
          </div>
          <div
            className="heatmap-grid"
            onMouseLeave={() => setActiveKey(null)}
            role="group"
            aria-label="Training activity heatmap"
          >
            {weeks.map((week) => (
              <div className="heatmap-week" key={week.start.toISOString()}>
                {week.days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    className={`heat-cell level-${day.level}${day.future ? ' is-future' : ''}${
                      activeDay?.key === day.key ? ' is-active' : ''
                    }`}
                    onMouseEnter={() => !day.future && setActiveKey(day.key)}
                    onFocus={() => !day.future && setActiveKey(day.key)}
                    onClick={() => !day.future && setActiveKey(day.key)}
                    disabled={day.future}
                    aria-label={cellLabel(day)}
                    title={cellLabel(day)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-footer">
        <span className="heatmap-footer-note">Each square is one training day.</span>
        <div className="heatmap-legend" aria-label="Activity intensity legend">
          <span>Less</span>
          <i className="heat-cell level-0" />
          <i className="heat-cell level-1" />
          <i className="heat-cell level-2" />
          <i className="heat-cell level-3" />
          <i className="heat-cell level-4" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
