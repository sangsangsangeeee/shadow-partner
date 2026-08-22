import type { Kind, Mode, Move, Settings } from '../types';

/* ---------------- 기본 동작 ---------------- */

export const BASE_MOVES: Move[] = [
  { id: 'jab', name: '잽', num: '1', numCall: '원', beat: 0.4, kind: 'punch', aliases: ['잽', '잼', '자브', 'jab'] },
  {
    id: 'cross',
    name: '스트레이트',
    num: '2',
    numCall: '투',
    beat: 0.5,
    kind: 'punch',
    aliases: ['스트레이트', '크로스', '스트', '라이트', 'cross'],
  },
  {
    id: 'lhook',
    name: '레프트훅',
    num: '3',
    numCall: '쓰리',
    beat: 0.65,
    kind: 'punch',
    aliases: ['레프트훅', '왼훅', '레프트후크', '훅', '후크', 'hook'],
  },
  {
    id: 'rhook',
    name: '라이트훅',
    num: '4',
    numCall: '포',
    beat: 0.65,
    kind: 'punch',
    aliases: ['라이트훅', '오른훅', '라이트후크'],
  },
  {
    id: 'lupper',
    name: '레프트어퍼',
    num: '5',
    numCall: '파이브',
    beat: 0.65,
    kind: 'punch',
    aliases: ['레프트어퍼', '왼어퍼', '어퍼', '어퍼컷', 'uppercut'],
  },
  {
    id: 'rupper',
    name: '라이트어퍼',
    num: '6',
    numCall: '식스',
    beat: 0.65,
    kind: 'punch',
    aliases: ['라이트어퍼', '오른어퍼'],
  },
  {
    id: 'bodyshot',
    name: '바디',
    num: null,
    numCall: null,
    beat: 0.65,
    kind: 'punch',
    aliases: ['바디', '바디샷', 'body'],
  },

  {
    id: 'lowkick',
    name: '로우킥',
    num: null,
    numCall: null,
    beat: 0.85,
    kind: 'kick',
    aliases: ['로우킥', '로킥', '로우', 'lowkick'],
  },
  {
    id: 'midkick',
    name: '미들킥',
    num: null,
    numCall: null,
    beat: 0.85,
    kind: 'kick',
    aliases: ['미들킥', '미들', '바디킥', 'midkick'],
  },
  {
    id: 'highkick',
    name: '하이킥',
    num: null,
    numCall: null,
    beat: 1.05,
    kind: 'kick',
    aliases: ['하이킥', '하이', 'highkick'],
  },
  {
    id: 'pushkick',
    name: '푸시킥',
    num: null,
    numCall: null,
    beat: 0.85,
    kind: 'kick',
    aliases: ['푸시킥', '앞차기', '테프', '띱', 'teep'],
  },
  {
    id: 'knee',
    name: '니킥',
    num: null,
    numCall: null,
    beat: 0.65,
    kind: 'kick',
    aliases: ['니킥', '무릎', '니', 'knee'],
  },

  { id: 'slip', name: '슬립', num: null, numCall: null, beat: 0.5, kind: 'def', aliases: ['슬립', '슬립핑', 'slip'] },
  { id: 'weave', name: '위빙', num: null, numCall: null, beat: 0.65, kind: 'def', aliases: ['위빙', '위브', 'weave'] },
  { id: 'duck', name: '더킹', num: null, numCall: null, beat: 0.5, kind: 'def', aliases: ['더킹', '덕', 'duck'] },
  {
    id: 'block',
    name: '블로킹',
    num: null,
    numCall: null,
    beat: 0.5,
    kind: 'def',
    aliases: ['블로킹', '블럭', '블록', '가드', 'block'],
  },

  { id: 'step', name: '스텝', num: null, numCall: null, beat: 0.5, kind: 'move', aliases: ['스텝', '스탭', 'step'] },
  {
    id: 'back',
    name: '백스텝',
    num: null,
    numCall: null,
    beat: 0.5,
    kind: 'move',
    aliases: ['백스텝', '백스탭', '백'],
  },
  { id: 'switch', name: '스위치', num: null, numCall: null, beat: 0.65, kind: 'move', aliases: ['스위치', 'switch'] },
  { id: 'pivot', name: '피벗', num: null, numCall: null, beat: 0.5, kind: 'move', aliases: ['피벗', '피봇', 'pivot'] },
];

export const KIND_LABEL: Record<Kind, string> = { punch: '펀치', kick: '킥', def: '방어', move: '풋워크' };
export const KINDS: Kind[] = ['punch', 'kick', 'def', 'move'];

/** 리듬 모델 5단계 척도. 기획서 7장. */
export const BEAT_OPTIONS = [
  { label: '아주 짧게', short: '아주짧게', value: 0.4 },
  { label: '짧게', short: '짧게', value: 0.5 },
  { label: '보통', short: '보통', value: 0.65 },
  { label: '길게', short: '길게', value: 0.85 },
  { label: '아주 길게', short: '아주길게', value: 1.05 },
] as const;

export const NUM_WORDS = [
  { word: '하나', num: '1' },
  { word: '둘', num: '2' },
  { word: '셋', num: '3' },
  { word: '넷', num: '4' },
  { word: '다섯', num: '5' },
  { word: '여섯', num: '6' },
] as const;

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
  rate: 1.15,
  voiceURI: '',
};

export const STORAGE_KEYS = {
  combos: 'sbc:combos',
  settings: 'sbc:settings',
  labels: 'sbc:labels',
  moves: 'sbc:moves',
  beats: 'sbc:beats',
} as const;
