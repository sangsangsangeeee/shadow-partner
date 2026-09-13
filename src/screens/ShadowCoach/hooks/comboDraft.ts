import { COMBO_MAX_MOVES } from '../../../commons/constants';
import { parseCombo, tapGaps } from '../../../commons/utils';
import type { AliasMap, Combo } from '../../../commons/types';

/*
 * 콤보 초안. 기획서 4.4 — 무대에서 두드려 자리를 만들고, 자리에 동작을 매긴다.
 *
 * 저장소에 안 들어가는 화면 상태지만 리듀서로 둔 이유는 한 조작이 여러 조각을 같이 움직여서다.
 * 한 줄 적으면 슬롯·넘침·미인식·열린 자리가 한꺼번에 바뀌고, 다시 두드리면 동작을 남긴 채 자리 수가 바뀐다.
 */

export type DraftStage = 'idle' | 'tapping' | 'slots';

export interface ComboDraft {
  stage: DraftStage;
  /** 두드리는 중에 쌓이는 시각(ms). */
  taps: number[];
  /** 슬롯 단계의 리듬(초). 슬롯 수보다 하나 적다. */
  rhythm: number[];
  /** 자리마다 동작. 비어 있으면 null. */
  slots: (string | null)[];
  /** 한 줄 입력창. 슬롯을 채우는 손이지 슬롯의 거울이 아니다. */
  text: string;
  unknown: string[];
  /** 적은 동작이 자리보다 많을 때 넘친 수. */
  overflow: number;
  /** 열린 자리. 없으면 -1. */
  cursor: number;
  editingId: string | null;
  hint: string;
}

export type DraftAction =
  | { type: 'tap'; at: number }
  | { type: 'finish' }
  | { type: 'cancel' }
  | { type: 'retap' }
  | { type: 'type'; text: string; alias: AliasMap }
  | { type: 'pick'; id: string }
  | { type: 'clear'; index: number }
  | { type: 'open'; index: number }
  | { type: 'edit'; combo: Combo; names: string[] }
  | { type: 'hint'; text: string }
  | { type: 'reset' };

export const INITIAL_DRAFT: ComboDraft = {
  stage: 'idle',
  taps: [],
  rhythm: [],
  slots: [],
  text: '',
  unknown: [],
  overflow: 0,
  cursor: -1,
  editingId: null,
  hint: '',
};

/** from 다음의 빈 자리. 없으면 앞에서부터 다시 찾고, 그래도 없으면 -1. */
export function nextEmpty(slots: (string | null)[], from: number): number {
  const after = slots.findIndex((s, i) => i > from && s == null);
  if (after >= 0) return after;
  return slots.findIndex((s) => s == null);
}

/** 자리 수를 n으로. 동작은 앞에서부터 남기고, 늘면 뒤가 비고 줄면 뒤가 잘린다. */
function fit(slots: (string | null)[], n: number): (string | null)[] {
  return Array.from({ length: n }, (_, i) => slots[i] ?? null);
}

export function comboDraftReducer(state: ComboDraft, action: DraftAction): ComboDraft {
  switch (action.type) {
    case 'tap': {
      if (state.stage === 'slots') return state;
      if (state.taps.length >= COMBO_MAX_MOVES) return state;
      return { ...state, stage: 'tapping', taps: [...state.taps, action.at], hint: '' };
    }

    case 'finish': {
      if (state.stage !== 'tapping') return state;
      const n = state.taps.length;
      if (n === 0) return { ...INITIAL_DRAFT, editingId: state.editingId };
      const slots = fit(state.slots, n);
      return {
        ...state,
        stage: 'slots',
        taps: [],
        rhythm: tapGaps(state.taps),
        slots,
        text: '',
        unknown: [],
        overflow: 0,
        cursor: nextEmpty(slots, -1),
        hint: '',
      };
    }

    // 두드리다 말면 두드린 것만 버린다. 슬롯 단계에서 취소하면 전부 버린다 — 수정 중이던 것까지.
    case 'cancel':
      if (state.stage === 'tapping' && state.slots.length) {
        return { ...state, stage: 'slots', taps: [], hint: '' };
      }
      return INITIAL_DRAFT;

    case 'retap':
      if (state.stage !== 'slots') return state;
      return { ...state, stage: 'tapping', taps: [], hint: '' };

    case 'type': {
      if (state.stage !== 'slots') return state;
      const parsed = parseCombo(action.text, action.alias);
      const n = state.slots.length;
      const slots = fit(parsed.moves, n);
      return {
        ...state,
        text: action.text,
        slots,
        unknown: parsed.unknown,
        overflow: Math.max(0, parsed.moves.length - n),
        cursor: nextEmpty(slots, -1),
        hint: '',
      };
    }

    case 'pick': {
      if (state.stage !== 'slots' || state.cursor < 0) return state;
      const slots = state.slots.map((s, i) => (i === state.cursor ? action.id : s));
      // 시트로 채우면 입력창은 비운다. 빈 자리를 글로 적을 수 없어 둘을 같게 둘 수 없다.
      return { ...state, slots, text: '', unknown: [], overflow: 0, cursor: nextEmpty(slots, state.cursor), hint: '' };
    }

    case 'clear': {
      if (state.stage !== 'slots') return state;
      const slots = state.slots.map((s, i) => (i === action.index ? null : s));
      return { ...state, slots, text: '', unknown: [], overflow: 0, cursor: action.index, hint: '' };
    }

    case 'open':
      if (state.stage !== 'slots') return state;
      return { ...state, cursor: action.index };

    case 'edit':
      return {
        ...INITIAL_DRAFT,
        stage: 'slots',
        slots: [...action.combo.moves],
        rhythm: action.combo.rhythm ?? [],
        text: action.names.join(' '),
        editingId: action.combo.id,
      };

    case 'hint':
      return { ...state, hint: action.text };

    case 'reset':
      return INITIAL_DRAFT;

    default:
      return state;
  }
}
