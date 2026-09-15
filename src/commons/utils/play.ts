import type { Combo } from '../types';

/** 첫 소리보다 이만큼 앞에서 튼다(초). 말의 시작이 잘리면 안 된다. */
export const CLIP_LEAD = 0.15;
/** 마지막 소리보다 이만큼 뒤에서 끝낸다(초). 끝은 여운을 남긴다. */
export const CLIP_TAIL = 0.3;

export interface ClipPlan {
  /** 녹음의 어디서부터 틀지(초). */
  from: number;
  /** 얼마나 틀지(초). 템포로 나눈 실제 흐르는 시간이다. */
  duration: number;
  /** 콤보가 끝나는 시각(ms). 다음 콤보까지의 간격은 여기서 센다. */
  total: number;
}

/**
 * 콤보 하나를 어떻게 틀지. 기획서 6장.
 *
 * 훈련 중 호출과 카드의 듣기, 저장 전 듣기가 **같은 규칙**을 본다.
 * 앞뒤 침묵은 소리로 잡아 잘라낸다 — 두드림 같은 표시가 없으니 소리가 유일한 단서다.
 */
export function clipPlan(combo: Pick<Combo, 'ms' | 'head' | 'tail'>, tempo: number): ClipPlan {
  const len = Math.max(0, combo.ms / 1000);
  const from = Math.max(0, combo.head - CLIP_LEAD);
  const end = Math.min(len, combo.tail + CLIP_TAIL);
  // 템포는 재생 속도라 같은 구간이 그만큼 빨리 흐른다.
  const duration = Math.max(0, (end - from) / tempo);
  return { from, duration, total: Math.round(duration * 1000) };
}
