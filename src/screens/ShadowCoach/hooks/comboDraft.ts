import type { Combo } from '../../../commons/types';

/*
 * 콤보 초안. 기획서 4.4 — 무대에서 녹음하고 이름을 붙인다.
 *
 * 저장소에 안 들어가는 화면 상태지만 리듀서로 둔 이유는 마이크가 늦게 답해서다.
 * 켜 달라고 한 뒤 켜지고, 멈춰 달라고 한 뒤 본체가 온다. 그 사이에 사람이 취소하거나
 * 다시 녹음할 수 있어서, 어느 답을 받고 어느 답을 버릴지가 한자리에 있어야 한다.
 */

export type DraftStage = 'idle' | 'recording' | 'named';
/** 마이크의 상태. starting은 켜 달라고 한 뒤, stopping은 멈춰 달라고 한 뒤 본체를 기다리는 동안. */
export type Recording = 'off' | 'starting' | 'on' | 'failed' | 'stopping';

export interface DraftClip {
  data: string;
  /** 초. */
  duration: number;
  /** 첫 소리의 위치(초). */
  head: number;
  /** 마지막 소리의 위치(초). */
  tail: number;
}

export interface ComboDraft {
  stage: DraftStage;
  name: string;
  editingId: string | null;
  hint: string;
  recording: Recording;
  /** 녹음을 켤 때마다 오른다. 늦게 도착한 지난 녹음을 걸러낸다. */
  session: number;
  clip: DraftClip | null;
  /** 이번 초안에서 녹음을 새로 시도했는가. 수정 중이면 있던 녹음을 버릴지 정하는 근거다. */
  reRecorded: boolean;
}

export type DraftAction =
  /** 무대를 눌렀다. 마이크를 켠다 — 이름 단계에서 부르면 다시 녹음이다. */
  | { type: 'arm' }
  | { type: 'recStarted' }
  | { type: 'recFailed'; message: string }
  | { type: 'recorded'; data: string; duration: number; head: number; tail: number }
  | { type: 'finish' }
  | { type: 'cancel' }
  | { type: 'setName'; text: string }
  | { type: 'edit'; combo: Combo }
  | { type: 'hint'; text: string }
  | { type: 'reset' };

export const INITIAL_DRAFT: ComboDraft = {
  stage: 'idle',
  name: '',
  editingId: null,
  hint: '',
  recording: 'off',
  session: 0,
  clip: null,
  reRecorded: false,
};

export function comboDraftReducer(state: ComboDraft, action: DraftAction): ComboDraft {
  switch (action.type) {
    // 이름을 남기고 녹음만 새로 한다(기획서 4.4). 녹음 중에 또 누르면 아무 일도 없다.
    case 'arm':
      if (state.stage === 'recording') return state;
      return {
        ...state,
        stage: 'recording',
        recording: 'starting',
        session: state.session + 1,
        clip: null,
        reRecorded: true,
        hint: '',
      };

    case 'recStarted':
      if (state.recording !== 'starting') return state;
      return { ...state, recording: 'on' };

    case 'recFailed':
      if (state.recording === 'off') return state;
      return { ...state, recording: 'failed' };

    // 본체는 멈춰 달라고 한 뒤에만 받는다. 취소한 녹음이나 지난 판의 것은 여기서 걸러진다.
    case 'recorded': {
      if (state.recording !== 'stopping' || state.stage !== 'named') return state;
      return {
        ...state,
        recording: 'off',
        clip: { data: action.data, duration: action.duration, head: action.head, tail: action.tail },
      };
    }

    case 'finish': {
      if (state.stage !== 'recording') return state;
      const live = state.recording === 'on' || state.recording === 'starting';
      return { ...state, stage: 'named', hint: '', recording: live ? 'stopping' : 'off' };
    }

    /*
     * 녹음 중 취소는 녹음만 버리고 원래 자리로 돌아간다 —
     * 이름을 붙이던 중이었다면(수정이든 새것이든) 그 자리가 남아야 "취소하면 원래 녹음이 남는다"가 된다.
     */
    case 'cancel':
      if (state.stage === 'recording' && state.editingId) {
        return { ...state, stage: 'named', recording: 'off', clip: null, reRecorded: false, hint: '' };
      }
      return INITIAL_DRAFT;

    case 'setName':
      return { ...state, name: action.text, hint: '' };

    /** 카드의 "이름 고치기"와 "다시 녹음"이 둘 다 여기로 들어온다. 다시 녹음은 곧바로 arm을 잇는다. */
    case 'edit':
      return {
        ...INITIAL_DRAFT,
        stage: 'named',
        name: action.combo.name,
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
