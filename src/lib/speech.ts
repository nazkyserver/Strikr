import { Capacitor } from '@capacitor/core';
import type { Intensity, VoiceGender } from '../types';

const isNative = Capacitor.isNativePlatform();

interface VoiceLike {
  name: string;
  lang: string;
  voiceURI?: string;
  localService?: boolean;
  default?: boolean;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voiceListenerAttached = false;
let nativeVoiceIndexes: Record<VoiceGender, number | null> = { female: null, male: null };
let nativeVoicesLoaded = false;
let nativeVoicesLoading = false;

type NativeSpeechModule = typeof import('@capacitor-community/text-to-speech');
let nativeModule: NativeSpeechModule | null = null;

const FEMALE_VOICE_CUES = [
  'female',
  'samantha',
  'karen',
  'moira',
  'tessa',
  'fiona',
  'victoria',
  'serena',
  'susan',
  'allison',
  'ava',
  'emma',
  'olivia',
  'sophia',
  'aria',
  'jenny',
  'zira',
  'michelle',
  'amber',
  'ashley',
  'google us english',
  'google uk english female',
];

const MALE_VOICE_CUES = [
  'male',
  'daniel',
  'alex',
  'fred',
  'tom',
  'david',
  'guy',
  'mark',
  'george',
  'james',
  'ryan',
  'aaron',
  'arthur',
  'oliver',
  'thomas',
  'rishi',
  'lee',
  'google uk english male',
];

export const SPEECH_RATE: Record<Intensity, number> = {
  light: 0.92,
  medium: 1.02,
  hard: 1.14,
};

export function isSpeechSupported(): boolean {
  if (isNative) return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function voicePitch(gender: VoiceGender): number {
  return gender === 'male' ? 0.84 : 1.03;
}

function genderScore(voice: VoiceLike, gender: VoiceGender): number {
  const haystack = `${voice.name} ${voice.voiceURI ?? ''}`.toLowerCase();
  const cues = gender === 'female' ? FEMALE_VOICE_CUES : MALE_VOICE_CUES;
  let score = 0;

  for (const cue of cues) {
    // Word boundaries avoid matching "male" inside "female".
    if (new RegExp(`\\b${cue}\\b`).test(haystack)) score += cue.includes(' ') ? 5 : 4;
  }

  if (voice.localService) score += 0.5;
  if (voice.default) score += 0.25;
  return score;
}

function pickFallback<T>(pool: T[], gender: VoiceGender): T | null {
  if (!pool.length) return null;
  if (gender === 'female') return pool[0] ?? null;
  return pool[1] ?? pool[0] ?? null;
}

async function getNativeModule(): Promise<NativeSpeechModule> {
  if (!nativeModule) nativeModule = await import('@capacitor-community/text-to-speech');
  return nativeModule;
}

function selectNativeIndex(voices: VoiceLike[], gender: VoiceGender): number | null {
  if (!voices.length) return null;
  const indexed = voices.map((voice, index) => ({ voice, index }));
  const english = indexed.filter(({ voice }) => voice.lang.toLowerCase().startsWith('en'));
  const pool = english.length ? english : indexed;

  const ranked = pool
    .map((entry) => ({ ...entry, score: genderScore(entry.voice, gender) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (ranked[0] && ranked[0].score >= 4) return ranked[0].index;

  const local = pool.filter(({ voice }) => voice.localService);
  const fallbackPool = local.length ? local : pool;
  return pickFallback(fallbackPool, gender)?.index ?? null;
}

async function loadNativeVoices() {
  if (!isNative || nativeVoicesLoaded || nativeVoicesLoading) return;
  nativeVoicesLoading = true;
  try {
    const { TextToSpeech } = await getNativeModule();
    const { voices } = await TextToSpeech.getSupportedVoices();
    nativeVoiceIndexes = {
      female: selectNativeIndex(voices, 'female'),
      male: selectNativeIndex(voices, 'male'),
    };
    nativeVoicesLoaded = true;
  } catch {
    // The engine can still be initialising; the system default voice is used.
  } finally {
    nativeVoicesLoading = false;
  }
}

function refreshVoices() {
  if (!isSpeechSupported() || isNative) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    cachedVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    if (!cachedVoices.length) cachedVoices = voices;
  }
}

export function warmUpSpeech() {
  if (!isSpeechSupported()) return;
  if (isNative) {
    void loadNativeVoices();
    return;
  }
  refreshVoices();
  if (voiceListenerAttached) return;
  voiceListenerAttached = true;
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

function selectVoice(gender: VoiceGender): SpeechSynthesisVoice | null {
  if (!cachedVoices.length) refreshVoices();
  if (!cachedVoices.length) return null;

  const ranked = cachedVoices
    .map((voice) => ({ voice, score: genderScore(voice, gender) }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0] && ranked[0].score >= 4) return ranked[0].voice;

  const local = cachedVoices.filter((voice) => voice.localService);
  const fallbackPool = local.length ? local : cachedVoices;
  return pickFallback(fallbackPool, gender) ?? cachedVoices[0] ?? null;
}

async function speakNative(
  text: string,
  rate: number,
  gender: VoiceGender,
  interrupt: boolean,
) {
  try {
    const { TextToSpeech, QueueStrategy } = await getNativeModule();
    if (!nativeVoicesLoaded) void loadNativeVoices();
    const voiceIndex = nativeVoiceIndexes[gender];
    await TextToSpeech.speak({
      text,
      lang: 'en-US',
      rate,
      pitch: voicePitch(gender),
      volume: 1,
      ...(voiceIndex !== null ? { voice: voiceIndex } : {}),
      queueStrategy: interrupt ? QueueStrategy.Flush : QueueStrategy.Add,
    });
  } catch {
    // A missing or busy TTS engine must never interrupt a training session.
  }
}

async function stopNativeSpeech() {
  try {
    const { TextToSpeech } = await getNativeModule();
    await TextToSpeech.stop();
  } catch {
    // Nothing to stop.
  }
}

export function speak(
  text: string,
  options: {
    intensity?: Intensity;
    rate?: number;
    interrupt?: boolean;
    voiceGender?: VoiceGender;
  } = {},
) {
  if (!isSpeechSupported()) return;
  const rate = options.rate ?? (options.intensity ? SPEECH_RATE[options.intensity] : 1);
  const gender = options.voiceGender ?? 'female';

  if (isNative) {
    void speakNative(text, rate, gender, options.interrupt !== false);
    return;
  }

  const synth = window.speechSynthesis;

  if (options.interrupt !== false) {
    synth.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = selectVoice(gender);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || 'en-US';
  utterance.rate = rate;
  utterance.pitch = voicePitch(gender);
  utterance.volume = 1;

  currentUtterance = utterance;
  utterance.onend = () => {
    if (currentUtterance === utterance) currentUtterance = null;
  };
  synth.speak(utterance);
}

export function previewVoice(gender: VoiceGender = 'female') {
  speak('Jab, cross, lead hook, body rip. Keep your hands up.', {
    rate: 0.96,
    voiceGender: gender,
  });
}

export function pauseSpeech() {
  if (!isSpeechSupported()) return;
  if (isNative) {
    void stopNativeSpeech();
    return;
  }
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeech() {
  if (!isSpeechSupported() || isNative) return;
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

export function cancelSpeech() {
  if (!isSpeechSupported()) return;
  if (isNative) {
    void stopNativeSpeech();
    return;
  }
  window.speechSynthesis.cancel();
  currentUtterance = null;
}
