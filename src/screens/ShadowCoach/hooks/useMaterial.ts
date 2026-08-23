import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { BASE_MOVES, DEFAULTS, STORAGE_KEYS } from '../../../commons/constants';
import { loadJSON, moveIndex, resolveName, saveJSON, uid } from '../../../commons/utils';
import type { Beats, Combo, Kind, Labels, Material, Move, Settings, UndoEntry } from '../../../commons/types';

/** 되돌리기 토스트가 떠 있는 시간(ms). */
/** 되돌릴 기회를 주는 시간. 토스트가 이 시계를 들고 있다가 스스로 닫는다. */
export const UNDO_MS = 6000;

export type MaterialState = Material & {
  /** 저장소를 다 읽었는가. 읽기 전에 쓰면 빈 값으로 덮어쓴다. */
  loaded: boolean;
  undo: UndoEntry | null;
};

export type MaterialAction =
  | { type: 'hydrate'; value: Partial<Material> }
  | { type: 'patchSettings'; patch: Partial<Settings> }
  | { type: 'addCombo'; moves: string[] }
  | { type: 'replaceCombo'; id: string; moves: string[] }
  | { type: 'toggleCombo'; id: string }
  | { type: 'enableCombo'; id: string }
  | { type: 'setAllCombos'; on: boolean }
  | { type: 'removeCombo'; id: string }
  | { type: 'addMove'; name: string; kind: Kind; beat: number }
  | { type: 'renameMove'; id: string; name: string }
  | { type: 'setLabel'; id: string; value: string }
  | { type: 'setBeat'; id: string; beat: number }
  | { type: 'resetMove'; id: string }
  | { type: 'applyNumberLabels' }
  | { type: 'resetBaseMoves' }
  | { type: 'removeMove'; id: string }
  | { type: 'restoreUndo' }
  | { type: 'dismissUndo' };

const INITIAL_COMBOS: Combo[] = [
  { id: uid(), moves: ['jab', 'cross', 'lowkick'], on: true },
  { id: uid(), moves: ['jab', 'jab', 'cross', 'lhook'], on: true },
  { id: uid(), moves: ['jab', 'midkick'], on: true },
  { id: uid(), moves: ['jab', 'cross', 'slip', 'cross'], on: true },
];

const INITIAL: MaterialState = {
  combos: INITIAL_COMBOS,
  settings: DEFAULTS,
  labels: {},
  customMoves: [],
  beats: {},
  loaded: false,
  undo: null,
};

const isBase = (id: string) => BASE_MOVES.some((m) => m.id === id);

/** 키 하나를 뺀 사본. 되돌아갈 값이 "없음"인 경우를 표현한다. */
function omit<T>(map: Record<string, T>, id: string): Record<string, T> {
  const next = { ...map };
  delete next[id];
  return next;
}

/**
 * 훈련 자료의 단 하나의 진실.
 *
 * 조작 하나가 여러 조각을 한꺼번에 건드리는 경우가 많아서 리듀서로 묶었다.
 * 동작 하나를 지우면 customMoves·combos·beats·labels 네 곳이 같이 바뀌고,
 * 되돌리기는 그 넷을 정확히 원래대로 돌려놔야 한다. setState를 손으로 줄 세우면
 * 한 줄만 빠져도 조용히 어긋난다.
 */
export function materialReducer(state: MaterialState, action: MaterialAction): MaterialState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.value, loaded: true };

    case 'patchSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'addCombo':
      return { ...state, combos: [{ id: uid(), moves: action.moves, on: true }, ...state.combos] };

    case 'replaceCombo':
      return {
        ...state,
        combos: state.combos.map((c) => (c.id === action.id ? { ...c, moves: action.moves } : c)),
      };

    case 'toggleCombo':
      return {
        ...state,
        combos: state.combos.map((c) => (c.id === action.id ? { ...c, on: !c.on } : c)),
      };

    case 'enableCombo':
      return {
        ...state,
        combos: state.combos.map((c) => (c.id === action.id ? { ...c, on: true } : c)),
      };

    case 'setAllCombos':
      return { ...state, combos: state.combos.map((c) => ({ ...c, on: action.on })) };

    case 'removeCombo': {
      const target = state.combos.find((c) => c.id === action.id);
      if (!target) return state;
      const moves = moveIndex(state.customMoves);
      const text = `${target.moves.map((id) => resolveName(id, state.labels, moves)).join(' ')} 지웠어`;
      return {
        ...state,
        combos: state.combos.filter((c) => c.id !== action.id),
        undo: { text, before: { combos: state.combos } },
      };
    }

    case 'addMove':
      return {
        ...state,
        customMoves: [
          ...state.customMoves,
          { id: 'c_' + uid(), name: action.name, kind: action.kind, beat: action.beat, aliases: [] },
        ],
      };

    case 'renameMove':
      return {
        ...state,
        customMoves: state.customMoves.map((m) => (m.id === action.id ? { ...m, name: action.name } : m)),
      };

    case 'setLabel':
      return { ...state, labels: { ...state.labels, [action.id]: action.value } };

    case 'setBeat':
      return { ...state, beats: { ...state.beats, [action.id]: action.beat } };

    case 'resetMove':
      return {
        ...state,
        // 기본 동작만 호출어를 지운다. 직접 추가한 동작은 이름이 곧 그 동작이다.
        labels: isBase(action.id) ? { ...state.labels, [action.id]: '' } : state.labels,
        beats: omit(state.beats, action.id),
      };

    case 'applyNumberLabels': {
      const next: Labels = { ...state.labels };
      BASE_MOVES.forEach((m) => {
        if (m.numCall) next[m.id] = m.numCall;
      });
      return { ...state, labels: next };
    }

    case 'resetBaseMoves': {
      const labels: Labels = {};
      Object.keys(state.labels).forEach((id) => {
        const v = state.labels[id];
        if (v !== undefined && !isBase(id)) labels[id] = v;
      });
      const beats: Beats = { ...state.beats };
      BASE_MOVES.forEach((m) => {
        delete beats[m.id];
      });
      return { ...state, labels, beats };
    }

    /**
     * 동작 삭제는 콤보 삭제보다 위험하다. 그 동작을 쓰던 콤보에서도 빠지고,
     * 비어버린 콤보는 사라진다. 그래서 영향 범위를 토스트에 적고 넷을 통째로 되돌린다.
     */
    case 'removeMove': {
      const move = state.customMoves.find((m) => m.id === action.id);
      if (!move) return state;
      const affected = state.combos.filter((c) => c.moves.includes(action.id)).length;
      return {
        ...state,
        customMoves: state.customMoves.filter((m) => m.id !== action.id),
        combos: state.combos
          .map((c) => ({ ...c, moves: c.moves.filter((mid) => mid !== action.id) }))
          .filter((c) => c.moves.length),
        beats: omit(state.beats, action.id),
        labels: omit(state.labels, action.id),
        undo: {
          text: affected ? `${move.name} 지웠어 · 콤보 ${affected}개에서 빠짐` : `${move.name} 지웠어`,
          before: {
            combos: state.combos,
            customMoves: state.customMoves,
            beats: state.beats,
            labels: state.labels,
          },
        },
      };
    }

    case 'restoreUndo':
      return state.undo ? { ...state, ...state.undo.before, undo: null } : state;

    case 'dismissUndo':
      return state.undo ? { ...state, undo: null } : state;

    default:
      return state;
  }
}

export type MaterialStore = {
  state: MaterialState;
  dispatch: (action: MaterialAction) => void;
};

/*
 * 리듀서 상태는 리액트 트리 밖에 산다.
 *
 * 라우터의 _layout은 화면을 하나씩 감싼다. 트리 안에 두면 훈련 화면과 동작 추가 화면이
 * 자료를 한 벌씩 갖게 되어 한쪽에서 넣은 동작이 다른 쪽에 안 보인다.
 * 게다가 둘 다 저장소에 쓰므로 늦게 쓴 쪽이 상대가 넣은 것을 덮어버린다.
 */
let current: MaterialState = INITIAL;
const listeners = new Set<() => void>();

const getSnapshot = () => current;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* 조각마다 따로 저장한다. 하나를 고쳤을 때 다섯을 다 쓰지 않는다. */
function persist(prev: MaterialState, next: MaterialState) {
  // 다 읽기 전에 쓰면 빈 값으로 덮는다. 방금 읽어 온 값을 되쓰는 것도 이 줄이 막는다.
  if (!prev.loaded) return;
  if (next.combos !== prev.combos) saveJSON(STORAGE_KEYS.combos, next.combos);
  if (next.settings !== prev.settings) saveJSON(STORAGE_KEYS.settings, next.settings);
  if (next.labels !== prev.labels) saveJSON(STORAGE_KEYS.labels, next.labels);
  if (next.customMoves !== prev.customMoves) saveJSON(STORAGE_KEYS.moves, next.customMoves);
  if (next.beats !== prev.beats) saveJSON(STORAGE_KEYS.beats, next.beats);
}

/** 신원이 영영 고정된 dispatch. memo를 건 자식들이 이걸 믿고 있다. */
export function dispatchMaterial(action: MaterialAction) {
  const prev = current;
  const next = materialReducer(prev, action);
  if (next === prev) return;
  current = next;
  persist(prev, next);
  listeners.forEach((listener) => listener());
}

let loading = false;

/** 화면이 몇 개가 서든 저장소는 한 번만 읽는다. */
function hydrateOnce() {
  if (loading || current.loaded) return;
  loading = true;
  void (async () => {
    const c = await loadJSON<Combo[]>(STORAGE_KEYS.combos);
    const s = await loadJSON<Partial<Settings>>(STORAGE_KEYS.settings);
    const l = await loadJSON<Labels>(STORAGE_KEYS.labels);
    const m = await loadJSON<Move[]>(STORAGE_KEYS.moves);
    const b = await loadJSON<Beats>(STORAGE_KEYS.beats);
    const value: Partial<Material> = {};
    if (c) value.combos = c;
    if (s) value.settings = { ...DEFAULTS, ...s };
    if (l) value.labels = l;
    if (m) value.customMoves = m;
    if (b) value.beats = b;
    dispatchMaterial({ type: 'hydrate', value });
  })();
}

/** 트리 밖에 사는 값은 저절로 초기화되지 않는다. 테스트가 화면을 여러 번 세운다. */
export function resetMaterial() {
  current = INITIAL;
  loading = false;
  listeners.forEach((listener) => listener());
}

/** 리듀서에 저장소 읽기·쓰기를 붙인 것. */
export function useMaterial(): MaterialStore {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    hydrateOnce();
  }, []);

  return useMemo(() => ({ state, dispatch: dispatchMaterial }), [state]);
}
