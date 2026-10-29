interface VoiceWaveProps {
  active?: boolean;
  className?: string;
  bars?: number;
}

export function VoiceWave({ active = true, className = '', bars = 5 }: VoiceWaveProps) {
  return (
    <span className={`voice-wave${active ? ' is-active' : ''} ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          style={{
            animationDelay: `${index * 90}ms`,
            height: `${[38, 72, 100, 58, 84, 44, 68][index % 7]}%`,
          }}
        />
      ))}
    </span>
  );
}
