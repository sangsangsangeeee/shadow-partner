/** 도메인 모델. 기획서 5장. */

export type Mode = 'random' | 'loop' | 'count' | 'none';
export type Phase = 'idle' | 'ready' | 'work' | 'rest' | 'done';
export type Tab = 'train' | 'combos';

export interface Combo {
  id: string;
  /** 이름은 필수다. 녹음은 열어 보기 전엔 뭐가 들었는지 모른다(기획서 4.4). */
  name: string;
  on: boolean;
  /** 녹음 길이(ms). */
  ms: number;
  /** 첫 소리의 위치(초). 재생은 여기서 CLIP_LEAD만큼 앞에서 시작한다. */
  head: number;
  /** 마지막 소리의 위치(초). 재생은 여기서 CLIP_TAIL만큼 뒤에서 끝난다. */
  tail: number;
}

/** 콤보별 녹음 본체(dataURL). 콤보 목록과 따로 저장한다 — 초당 25KB라 같이 두면 켜고 끌 때마다 전부 다시 쓴다. */
export type Clips = Record<string, string>;

export interface Settings {
  rounds: number;
  roundSec: number;
  restSec: number;
  /** 재생 속도. 음정도 그만큼 따라 올라간다(기획서 6장). */
  tempo: number;
  gap: number;
  randomGap: boolean;
  mode: Mode;
  reps: number;
}

/** 콤보 사이 유지 구간. ms가 null이면 다음 콤보가 예약되지 않은 상태. */
export interface HoldGap {
  cue: string;
  ms: number | null;
}

export interface Stats {
  combos: number;
}

/** 저장되는 훈련 자료 전부. */
export interface Material {
  combos: Combo[];
  settings: Settings;
  clips: Clips;
}

/**
 * 방금 지운 것. 되돌리면 before를 그대로 덮어쓴다.
 *
 * 그 조작이 실제로 건드린 조각만 담는다. 전부 담으면, 지운 뒤에 다른 걸 고쳤을 때
 * 되돌리기가 그것까지 같이 되감아 버린다.
 */
export interface UndoEntry {
  /** 되돌릴 기회가 새로 열릴 때마다 올라간다. 토스트의 시계를 다시 감는 열쇠다. */
  id: number;
  text: string;
  before: Partial<Material>;
}
