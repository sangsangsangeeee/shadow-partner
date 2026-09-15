import type { Mode, Settings } from '../types';

/** 유지 구간 안내. 소리를 내지 않는다. 기획서 4.1 정책. */
export const CUES = ['스탠스 유지', '가드 올리고', '롱가드', '스텝', '백스텝', '사이드 스텝', '리듬 타기'] as const;

export const MODES = [
  { id: 'random', label: '랜덤', hint: '선택한 콤보를 무작위로 계속 불러줘.' },
  { id: 'loop', label: '반복', hint: '선택한 콤보를 순서대로 계속 돌려.' },
  { id: 'count', label: '횟수', hint: '라운드마다 정해진 횟수만 불러줘.' },
  { id: 'none', label: '없음', hint: '호출 없이 타이머만 돌아가.' },
] as const satisfies readonly { id: Mode; label: string; hint: string }[];

export const DEFAULTS: Settings = {
  rounds: 3,
  roundSec: 180,
  restSec: 60,
  tempo: 1.0,
  gap: 1.6,
  randomGap: true,
  mode: 'random',
  reps: 8,
};

export const STORAGE_KEYS = {
  combos: 'sbc:combos',
  settings: 'sbc:settings',
  /** 콤보별 녹음. 뒤에 콤보 id가 붙는다. */
  clip: 'sbc:clip:',
} as const;

/**
 * v1이 남긴 키들. 읽지 않고 처음 열 때 지운다(기획서 5장).
 * 동작·호출어·리듬은 v2에 없다 — 남겨 두면 저장소만 차지한다.
 */
export const LEGACY_KEYS = ['sbc:labels', 'sbc:moves', 'sbc:beats'] as const;

/** 녹음 상한(ms). 콤보 하나는 그 안에 끝나고, 초당 25KB라 길이를 열어 두면 저장소가 무너진다(기획서 4.4). */
export const RECORD_MAX_MS = 8000;
