import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { DEFAULTS, LEGACY_KEYS, STORAGE_KEYS } from '../../../commons/constants';
import { loadJSON, removeJSON, saveJSON, uid } from '../../../commons/utils';
import type { Clips, Combo, Material, Settings, UndoEntry } from '../../../commons/types';

export type MaterialState = Material & {
  /** 저장소를 다 읽었는가. 읽기 전에 쓰면 빈 값으로 덮어쓴다. */
  loaded: boolean;
  undo: UndoEntry | null;
};

export type MaterialAction =
  | { type: 'hydrate'; value: Partial<Material> }
  | { type: 'patchSettings'; patch: Partial<Settings> }
  | { type: 'addCombo'; name: string; clip: NewClip }
  /** clip을 안 주면 있던 녹음을 둔다(이름만 고친 것). null이면 버린다. */
  | { type: 'replaceCombo'; id: string; name?: string; clip?: NewClip | null }
  | { type: 'toggleCombo'; id: string }
  | { type: 'setAllCombos'; on: boolean }
  | { type: 'removeCombo'; id: string }
  | { type: 'restoreUndo' }
  | { type: 'dismissUndo' };

/** 저장하러 들어오는 녹음. 잰 자리(ms·head·tail)와 본체(data)가 같이 온다. */
export type NewClip = { data: string; ms: number; head: number; tail: number };

/** 첫 실행은 빈 목록이다. 초기 콤보는 없다(기획서 5장). */
const INITIAL: MaterialState = {
  combos: [],
  settings: DEFAULTS,
  clips: {},
  loaded: false,
  undo: null,
};

/*
 * 되돌리기가 열릴 때마다 새 번호를 준다.
 * TDS 토스트는 사라지는 시계를 **마운트 때 한 번만** 걸어서, 트리에 계속 떠 있는 채로는
 * 두 번째 삭제부터 영영 안 닫힌다. 화면이 이 번호를 key로 써서 시계를 다시 감는다.
 *
 * 상태에서 세지 않는다 — 접히면 undo가 null이 되어 번호도 같이 사라진다.
 */
let undoSeq = 0;
const nextUndoId = () => (undoSeq += 1);

/** 키 하나를 뺀 사본. 되돌아갈 값이 "없음"인 경우를 표현한다. */
function omit<T>(map: Record<string, T>, id: string): Record<string, T> {
  const next = { ...map };
  delete next[id];
  return next;
}

/**
 * 훈련 자료의 단 하나의 진실.
 *
 * 콤보 하나를 지우면 목록과 녹음 본체가 같이 움직이고, 되돌리기는 둘을 정확히 되감아야 한다.
 * setState를 손으로 줄 세우면 한 줄만 빠져도 조용히 어긋난다.
 */
export function materialReducer(state: MaterialState, action: MaterialAction): MaterialState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.value, loaded: true };

    case 'patchSettings': {
      /*
       * 값이 그대로면 상태도 그대로여야 한다.
       * 슬라이더는 손가락이 움직이는 내내 부르고 같은 눈금에서도 여러 번 온다.
       */
      const keys = Object.keys(action.patch) as (keyof Settings)[];
      if (keys.every((k) => Object.is(state.settings[k], action.patch[k]))) return state;
      return { ...state, settings: { ...state.settings, ...action.patch } };
    }

    case 'addCombo': {
      const id = uid();
      const { data, ...meta } = action.clip;
      const combo: Combo = { id, name: action.name, on: true, ...meta };
      return {
        ...state,
        combos: [combo, ...state.combos],
        clips: { ...state.clips, [id]: data },
      };
    }

    case 'replaceCombo': {
      const keep = action.clip === undefined;
      return {
        ...state,
        combos: state.combos.map((c) => {
          if (c.id !== action.id) return c;
          const named = action.name === undefined ? c : { ...c, name: action.name };
          if (keep) return named;
          // 녹음을 버리면 잰 자리도 같이 0으로 돌아간다. ms가 곧 "녹음이 있나"다.
          if (!action.clip) return { ...named, ms: 0, head: 0, tail: 0 };
          const { ms, head, tail } = action.clip;
          return { ...named, ms, head, tail };
        }),
        clips: keep
          ? state.clips
          : action.clip
            ? { ...state.clips, [action.id]: action.clip.data }
            : omit(state.clips, action.id),
      };
    }

    case 'toggleCombo':
      return {
        ...state,
        combos: state.combos.map((c) => (c.id === action.id ? { ...c, on: !c.on } : c)),
      };

    case 'setAllCombos':
      return { ...state, combos: state.combos.map((c) => ({ ...c, on: action.on })) };

    case 'removeCombo': {
      const target = state.combos.find((c) => c.id === action.id);
      if (!target) return state;
      return {
        ...state,
        combos: state.combos.filter((c) => c.id !== action.id),
        clips: omit(state.clips, action.id),
        undo: {
          id: nextUndoId(),
          text: `${target.name} 지웠어`,
          before: { combos: state.combos, clips: state.clips },
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
 * 라우터의 _layout은 화면을 하나씩 감싼다. 트리 안에 두면 화면이 둘 설 때 자료가 한 벌씩 생기고,
 * 둘 다 저장소에 쓰므로 늦게 쓴 쪽이 상대가 넣은 것을 덮는다. 지금은 라우트가 하나뿐이지만
 * 저장이 dispatch 안에서 일어나는 구조와 dispatch의 고정된 신원이 여기서 같이 나온다.
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

/**
 * 쓰기를 미루는 창.
 *
 * 슬라이더가 이걸 요구한다. TDS Slider는 onChangeEnd가 없어서 끄는 내내 스텝마다
 * 발화하고, 콤보 간격(0.5~6.0 / 0.1)은 끝에서 끝까지 한 번 끌면 쓰기가 55번이다.
 */
const WRITE_DELAY = 300;

/** 아직 안 나간 쓰기. 키마다 마지막 값만 남긴다 — 중간 값은 어차피 덮인다. */
const pending = new Map<string, unknown>();
/** 큐에 실린 "지워라". 녹음을 뺀 콤보의 키를 저장소에서도 걷는다. */
const REMOVE = Symbol('remove');
let writeTimer: ReturnType<typeof setTimeout> | null = null;

/** 미뤄둔 것을 지금 전부 내보낸다. 앱이 내려갈 때와 테스트가 되감을 때 부른다. */
export function flushMaterial() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  pending.forEach((value, key) => (value === REMOVE ? removeJSON(key) : saveJSON(key, value)));
  pending.clear();
}

function queue(key: string, value: unknown) {
  pending.set(key, value);
  if (writeTimer) return; // 창이 이미 열려 있다. 뒤에 온 값이 앞의 것을 덮었다.
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushMaterial();
  }, WRITE_DELAY);
}

/* 조각마다 따로 저장한다. 하나를 고쳤을 때 전부를 다 쓰지 않는다. */
function persist(prev: MaterialState, next: MaterialState) {
  // 다 읽기 전에 쓰면 빈 값으로 덮는다. 방금 읽어 온 값을 되쓰는 것도 이 줄이 막는다.
  if (!prev.loaded) return;
  if (next.combos !== prev.combos) queue(STORAGE_KEYS.combos, next.combos);
  if (next.settings !== prev.settings) queue(STORAGE_KEYS.settings, next.settings);
  if (next.clips !== prev.clips) {
    // 콤보 하나의 녹음만 바뀐다. 다른 콤보의 것을 같이 쓰지 않는다.
    Object.keys({ ...prev.clips, ...next.clips }).forEach((id) => {
      if (next.clips[id] === prev.clips[id]) return;
      queue(STORAGE_KEYS.clip + id, next.clips[id] ?? REMOVE);
    });
  }
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

    /*
     * v1이 만든 콤보는 버린다(기획서 5장). 이제 부를 방법이 없다 —
     * 동작 목록도 파서도 없어서 ms 없는 콤보는 이름도 소리도 못 만든다.
     */
    const fresh = (c ?? []).filter((x) => typeof x.ms === 'number' && x.ms > 0);

    const clips: Clips = {};
    const bodies = await Promise.all(fresh.map((x) => loadJSON<string>(STORAGE_KEYS.clip + x.id)));
    fresh.forEach((x, i) => {
      const body = bodies[i];
      if (typeof body === 'string') clips[x.id] = body;
    });

    const value: Partial<Material> = {};
    if (c) {
      value.combos = fresh;
      value.clips = clips;
    }
    if (s) value.settings = { ...DEFAULTS, ...s };
    dispatchMaterial({ type: 'hydrate', value });

    // v1의 키는 읽지 않고 지운다. 한 번만 — 없으면 아무 일도 없다.
    LEGACY_KEYS.forEach(removeJSON);
  })();
}

/** 트리 밖에 사는 값은 저절로 초기화되지 않는다. 테스트가 화면을 여러 번 세운다. */
export function resetMaterial() {
  // 미뤄둔 쓰기는 내보내지 말고 버린다. 앞 테스트의 값이 뒤 테스트에 떨어지면 안 된다.
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  pending.clear();
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

  /*
   * 쓰기를 미루는 대신 앱이 내려가는 순간을 붙잡아야 한다.
   * 토스 미니앱은 사용자가 언제든 나가고, 슬라이더를 놓자마자 나가면 300ms 창이 안 닫힌다.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') flushMaterial();
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => ({ state, dispatch: dispatchMaterial }), [state]);
}
