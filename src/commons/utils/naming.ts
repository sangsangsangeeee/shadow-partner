import { BASE_MOVES } from '../constants';
import type { Beats, Combo, Labels, Move } from '../types';

/** 녹음을 첫 두드림보다 이만큼 앞에서 튼다(초). 말은 손보다 조금 먼저 나온다. */
export const CLIP_LEAD = 0.15;

/** 기본 동작에 정해진 길이가 없을 때 쓰는 값(초). */
const FALLBACK_BEAT = 0.65;

/** id로 동작을 찾을 수 있게 펼친다. 직접 추가한 동작이 같은 id의 기본 동작을 덮는다. */
export function moveIndex(customMoves: Move[]): Record<string, Move> {
  const m: Record<string, Move> = {};
  BASE_MOVES.forEach((x) => {
    m[x.id] = x;
  });
  customMoves.forEach((x) => {
    m[x.id] = x;
  });
  return m;
}

/** 코치가 부를 이름. 사용자가 정한 호출어가 있으면 그걸 쓴다. */
export function resolveName(id: string, labels: Labels, moves: Record<string, Move>): string {
  const custom = labels[id];
  if (custom && custom.trim()) return custom.trim();
  const m = moves[id];
  return m ? m.name : '?';
}

/** 그 동작에 주어지는 시간(초). 사용자가 덮어쓴 값이 있으면 그걸 쓴다. */
export function resolveBeat(id: string, beats: Beats, moves: Record<string, Move>): number {
  const b = beats[id];
  if (typeof b === 'number') return b;
  const m = moves[id];
  return m ? m.beat : FALLBACK_BEAT;
}

/**
 * 콤보 안에서 동작마다 다음 동작까지 기다리는 시간(ms). 호출·미리듣기·비트 트랙이 같은 값을 봐야 한다.
 *
 * 두드려 만든 리듬이 있으면 동작의 길이를 이긴다 — 리듬을 담으려고 두드린 것이다.
 * 마지막 동작과, 동작을 고쳐 리듬이 닿지 않게 된 자리는 동작의 길이로 메운다.
 */
export function comboSteps(combo: Combo, beatOf: (id: string) => number, tempo: number): number[] {
  return combo.moves.map((mid, i) => {
    const tapped = combo.rhythm?.[i];
    const sec = typeof tapped === 'number' && i < combo.moves.length - 1 ? tapped : beatOf(mid);
    return Math.round((sec * 1000) / tempo);
  });
}

export interface ClipPlan {
  /** 녹음의 어디서부터 틀지(초). */
  from: number;
  /** 얼마나 틀지(초). */
  duration: number;
  /** 동작마다 칩이 넘어가는 시각(ms, 틀기 시작한 순간 기준). */
  marks: number[];
  /** 콤보가 끝나는 시각(ms). 다음 콤보까지의 간격은 여기서 센다. */
  total: number;
}

/**
 * 녹음이 있는 콤보를 어떻게 틀지. 녹음이 진실이고 칩은 두드린 시각을 따라간다(기획서 7장).
 * 첫 두드림 앞을 잘라 첫 동작에 맞추고, 마지막 동작 뒤는 동작 길이만큼만 남긴다.
 * 템포는 재생 속도라 시각도 같이 나눈다.
 */
export function clipPlan(combo: Combo, beatOf: (id: string) => number, tempo: number): ClipPlan {
  const meta = combo.clip;
  const offset = meta ? Math.max(0, meta.offset) : 0;
  const from = Math.max(0, offset - CLIP_LEAD);
  const steps = comboSteps(combo, beatOf, 1);
  let cum = 0;
  const marks = combo.moves.map((_, i) => {
    const at = Math.round(((offset - from + cum) * 1000) / tempo);
    cum += (steps[i] ?? 0) / 1000;
    return at;
  });
  // 마지막 두드림 뒤에는 그 동작의 길이만큼만. 완료 버튼까지 흐른 침묵은 잘라낸다.
  const end = Math.min(meta ? meta.ms / 1000 : offset + cum, offset + cum);
  const duration = Math.max(0, (end - from) / tempo);
  return { from, duration, marks, total: Math.round(duration * 1000) };
}
