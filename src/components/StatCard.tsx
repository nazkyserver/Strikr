import type { ReactNode } from 'react';
import { TrendDown, TrendUp } from '@phosphor-icons/react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  suffix?: string;
  detail?: string;
  trend?: number | null;
  trendLabel?: string;
  tone?: 'default' | 'accent' | 'blue';
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  suffix,
  detail,
  trend,
  trendLabel = 'vs previous 7 days',
  tone = 'default',
  className = '',
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone} ${className}`.trim()}>
      <div className="stat-card-top">
        <span className="stat-card-icon">{icon}</span>
        {trend !== undefined && (
          <span
            className={`stat-trend${
              trend === null || trend === 0 ? ' is-flat' : trend > 0 ? ' is-up' : ' is-down'
            }`}
          >
            {trend !== null && trend !== 0 && (trend > 0 ? <TrendUp size={13} weight="bold" /> : <TrendDown size={13} weight="bold" />)}
            {trend === null ? 'New' : `${trend > 0 ? '+' : ''}${trend}%`}
          </span>
        )}
      </div>
      <div className="stat-card-value">
        {value}
        {suffix && <span>{suffix}</span>}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-meta">
        {detail && <span>{detail}</span>}
        {trend !== undefined && <span className="stat-card-comparison">{trendLabel}</span>}
      </div>
    </article>
  );
}
