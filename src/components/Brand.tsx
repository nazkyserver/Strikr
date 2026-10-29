interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`} aria-label="Strikr">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" role="presentation">
          <rect width="40" height="40" rx="10" fill="currentColor" />
          <path d="M9.5 30 22.5 10h7.1L16.6 30H9.5Z" fill="#090a09" />
          <path d="M22 30 35 10h1.4L23.4 30H22Z" fill="#090a09" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-word">
          STRIKR<span className="brand-dot">.</span>
        </span>
      )}
    </div>
  );
}
