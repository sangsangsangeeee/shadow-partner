/** 도메인 모델. 기획서 5장. */

export type Kind = 'punch' | 'kick' | 'def' | 'move';
export type Mode = 'random' | 'loop' | 'count' | 'none';
export type Phase = 'idle' | 'ready' | 'work' | 'rest' | 'done';
export type Tab = 'train' | 'combos' | 'words';

export interface Move {
  id: string;
  name: string;
  kind: Kind;
  beat: number;
  num?: string | null;
  numCall?: string | null;
  aliases?: string[];
}

export interface Combo {
  id: string;
  moves: string[];
  on: boolean;
}

/** 호출어 덮어쓰기. 기본값을 대체하지 않고 위에 얹는다. */
export type Labels = Record<string, string>;
/** 길이 덮어쓰기. 위와 같다. */
export type Beats = Record<string, number>;
/** 정규화된 말 -> moveId */
export type AliasMap = Record<string, string>;

export interface Settings {
  rounds: number;
  roundSec: number;
  restSec: number;
  tempo: number;
  gap: number;
  randomGap: boolean;
  mode: Mode;
  reps: number;
  rate: number;
  voiceURI: string;
}

export interface VoiceOption {
  voiceURI: string;
  name: string;
}

/** 콤보 사이 유지 구간. ms가 null이면 다음 콤보가 예약되지 않은 상태. */
export interface HoldGap {
  cue: string;
  ms: number | null;
}

export interface Stats {
  combos: number;
  moves: number;
}

/** 저장되는 훈련 자료 전부. 세 화면이 같이 읽고 두 화면이 고친다. */
export interface Material {
  combos: Combo[];
  settings: Settings;
  labels: Labels;
  customMoves: Move[];
  beats: Beats;
}

/**
 * 방금 지운 것. 되돌리면 before를 그대로 덮어쓴다.
 *
 * 그 조작이 실제로 건드린 조각만 담는다. 전부 담으면, 지운 뒤에 다른 걸 고쳤을 때
 * 되돌리기가 그것까지 같이 되감아 버린다.
 */
export interface UndoEntry {
  text: string;
  before: Partial<Material>;
}
