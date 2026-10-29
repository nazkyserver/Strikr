import type { Combo, ComboToken, Difficulty, SessionConfig } from '../types';
import { comboLengthForConfig } from './session';

interface PunchDefinition {
  id: string;
  label: string;
  spoken: string;
  tier: Difficulty;
}

const PUNCHES: Record<string, PunchDefinition> = {
  jab: { id: 'jab', label: 'Jab', spoken: 'Jab', tier: 'beginner' },
  cross: { id: 'cross', label: 'Cross', spoken: 'Cross', tier: 'beginner' },
  leadHook: {
    id: 'leadHook',
    label: 'Lead hook',
    spoken: 'Lead hook',
    tier: 'beginner',
  },
  rearHook: {
    id: 'rearHook',
    label: 'Rear hook',
    spoken: 'Rear hook',
    tier: 'beginner',
  },
  leadBodyHook: {
    id: 'leadBodyHook',
    label: 'Lead body hook',
    spoken: 'Body hook',
    tier: 'beginner',
  },
  leadUppercut: {
    id: 'leadUppercut',
    label: 'Lead uppercut',
    spoken: 'Lead uppercut',
    tier: 'intermediate',
  },
  rearUppercut: {
    id: 'rearUppercut',
    label: 'Rear uppercut',
    spoken: 'Rear uppercut',
    tier: 'intermediate',
  },
  rearBodyHook: {
    id: 'rearBodyHook',
    label: 'Rear body hook',
    spoken: 'Rear body hook',
    tier: 'intermediate',
  },
  bodyRip: {
    id: 'bodyRip',
    label: 'Body rip',
    spoken: 'Body rip',
    tier: 'intermediate',
  },
  checkHook: {
    id: 'checkHook',
    label: 'Check hook',
    spoken: 'Check hook',
    tier: 'intermediate',
  },
  shovelHook: {
    id: 'shovelHook',
    label: 'Shovel hook',
    spoken: 'Shovel hook',
    tier: 'advanced',
  },
  counterCross: {
    id: 'counterCross',
    label: 'Counter cross',
    spoken: 'Counter cross',
    tier: 'advanced',
  },
};

const DEFENSES: Record<string, PunchDefinition> = {
  slipRight: { id: 'slipRight', label: 'Slip right', spoken: 'Slip right', tier: 'advanced' },
  slipLeft: { id: 'slipLeft', label: 'Slip left', spoken: 'Slip left', tier: 'advanced' },
  roll: { id: 'roll', label: 'Roll under', spoken: 'Roll under', tier: 'advanced' },
  stepBack: { id: 'stepBack', label: 'Step back', spoken: 'Step back', tier: 'advanced' },
  pivot: { id: 'pivot', label: 'Pivot out', spoken: 'Pivot out', tier: 'advanced' },
};

const POOLS: Record<Difficulty, string[]> = {
  beginner: ['jab', 'cross', 'leadHook', 'rearHook', 'leadBodyHook'],
  intermediate: [
    'jab',
    'jab',
    'cross',
    'leadHook',
    'rearHook',
    'leadBodyHook',
    'leadUppercut',
    'rearUppercut',
    'rearBodyHook',
    'bodyRip',
    'checkHook',
  ],
  advanced: [
    'jab',
    'cross',
    'leadHook',
    'rearHook',
    'leadBodyHook',
    'leadUppercut',
    'rearUppercut',
    'rearBodyHook',
    'bodyRip',
    'checkHook',
    'shovelHook',
    'counterCross',
  ],
};

const OPENERS: Record<Difficulty, string[]> = {
  beginner: ['jab', 'jab', 'cross', 'leadHook'],
  intermediate: ['jab', 'jab', 'jab', 'cross', 'leadHook', 'leadBodyHook'],
  advanced: ['jab', 'jab', 'cross', 'leadHook', 'leadUppercut', 'bodyRip'],
};

const FINISHERS = ['cross', 'leadHook', 'rearHook', 'rearUppercut', 'checkHook', 'counterCross'];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function toToken(definition: PunchDefinition, kind: ComboToken['kind']): ComboToken {
  return {
    key: definition.id,
    label: definition.label,
    spoken: definition.spoken,
    kind,
  };
}

function choosePunchCount(mean: number): number {
  const lower = Math.max(1, Math.floor(mean));
  const upper = Math.max(1, Math.min(8, Math.ceil(mean)));
  if (lower === upper) return upper;
  const fraction = mean - lower;
  return Math.random() < fraction ? upper : lower;
}

function chooseDefense(difficulty: Difficulty): PunchDefinition | null {
  const chance = difficulty === 'advanced' ? 0.34 : difficulty === 'intermediate' ? 0.06 : 0;
  if (Math.random() >= chance) return null;

  if (difficulty === 'intermediate') {
    return DEFENSES.stepBack;
  }

  return pick([DEFENSES.slipRight, DEFENSES.slipLeft, DEFENSES.roll, DEFENSES.stepBack, DEFENSES.pivot]);
}

export function createCombo(config: SessionConfig, id: number): Combo {
  const punchCount = choosePunchCount(comboLengthForConfig(config));
  const pool = POOLS[config.difficulty];
  const punches: string[] = [];

  for (let index = 0; index < punchCount; index += 1) {
    let choice: string;
    if (index === 0) {
      choice = pick(OPENERS[config.difficulty]);
    } else if (index === punchCount - 1 && punchCount > 2) {
      const availableFinishers = FINISHERS.filter((finisher) => pool.includes(finisher));
      choice = pick(availableFinishers.length ? [...availableFinishers, pick(pool)] : pool);
    } else {
      const previous = punches[index - 1];
      const choices = pool.filter((punch) => punch !== previous);
      choice = pick(choices.length ? choices : pool);
    }

    if (punches.length > 1 && punches[punches.length - 1] === choice && punches[punches.length - 2] === choice) {
      choice = pick(pool.filter((punch) => punch !== choice));
    }

    punches.push(choice);
  }

  const tokens = punches.map((punch) => toToken(PUNCHES[punch], 'punch'));
  const defense = chooseDefense(config.difficulty);

  if (defense) {
    const defenseToken = toToken(defense, 'defense');
    if (Math.random() < 0.68) {
      tokens.unshift(defenseToken);
    } else {
      tokens.push(defenseToken);
    }
  }

  return {
    id,
    tokens,
    punches: tokens.filter((token) => token.kind === 'punch').length,
  };
}

export function comboVoiceLine(combo: Combo): string {
  const words = combo.tokens.map((token) => token.spoken);
  return `${words.join(', ')}.`;
}

export function comboShortLine(combo: Combo): string {
  return combo.tokens.map((token) => token.label).join(' · ');
}
