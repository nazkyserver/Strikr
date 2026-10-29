type Cue = 'round' | 'rest' | 'end' | 'warning' | 'tick';

let audioContext: AudioContext | null = null;

export function primeAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

function ring(
  context: AudioContext,
  baseFrequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const partials = [
    { ratio: 1, gain: 1, decay: 1 },
    { ratio: 2.01, gain: 0.48, decay: 0.7 },
    { ratio: 2.76, gain: 0.26, decay: 0.55 },
    { ratio: 5.4, gain: 0.13, decay: 0.35 },
  ];

  for (const partial of partials) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(baseFrequency * partial.ratio, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume * partial.gain),
      start + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration * partial.decay,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }
}

function beep(context: AudioContext, frequency: number, start: number, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.16);
}

export function playCue(type: Cue) {
  const context = primeAudio();
  if (!context) return;
  const start = context.currentTime + 0.015;

  if (type === 'round') {
    ring(context, 923, start, 1.1, 0.075);
  } else if (type === 'rest') {
    ring(context, 659, start, 0.8, 0.055);
  } else if (type === 'end') {
    ring(context, 923, start, 1.2, 0.07);
    ring(context, 830, start + 0.29, 1.2, 0.07);
    ring(context, 923, start + 0.58, 1.5, 0.075);
  } else if (type === 'warning') {
    beep(context, 1046, start, 0.035);
  } else if (type === 'tick') {
    beep(context, 784, start, 0.025);
  }
}
