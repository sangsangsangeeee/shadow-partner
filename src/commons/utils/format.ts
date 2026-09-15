import { CUES } from '../constants/training';

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const fmt = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const pickCue = (): string => CUES[Math.floor(Math.random() * CUES.length)] ?? CUES[0];

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** 녹음 길이를 사람이 읽는 초로. `2.3초`. */
export const secs = (ms: number): string => `${(Math.max(0, ms) / 1000).toFixed(1)}초`;
