import { BEAT_OPTIONS, CUES } from '../constants/moves';

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const fmt = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const pickCue = (): string => CUES[Math.floor(Math.random() * CUES.length)] ?? CUES[0];

/** 임의의 초를 5단계 척도 이름으로 되돌린다. 정확히 맞는 값이 없으면 가장 가까운 단계. */
export const beatName = (v: number): string => {
  const hit = BEAT_OPTIONS.find((o) => o.value === v);
  if (hit) return hit.label;
  let best: { label: string; value: number } = BEAT_OPTIONS[0];
  BEAT_OPTIONS.forEach((o) => {
    if (Math.abs(o.value - v) < Math.abs(best.value - v)) best = o;
  });
  return best.label;
};

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
