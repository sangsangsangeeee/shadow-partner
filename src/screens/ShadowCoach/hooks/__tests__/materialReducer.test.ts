/*
 * 리듀서는 순수 함수라 화면 없이 바로 굴릴 수 있다.
 * 여기서 보는 것은 "한 조작이 여러 조각을 동시에 맞게 바꾸는가"다.
 * 그게 예전에 setState를 손으로 줄 세우던 자리이고, 어긋나도 조용하던 자리다.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../../../commons/test-support/tdsMock'));

/* 렌더를 안 해도 import 사슬이 저장소에 닿는다. */
jest.mock('@apps-in-toss/native-modules', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Storage: require('../../../../commons/test-support/storageMock').Storage,
  setScreenAwakeMode: jest.fn(() => Promise.resolve({ enabled: true })),
  generateHapticFeedback: jest.fn(),
}));

import { materialReducer, type MaterialState } from '../useMaterial';
import { DEFAULTS } from '../../../../commons/constants';
import type { Move } from '../../../../commons/types';

const ELBOW: Move = { id: 'c_elbow', name: '엘보', kind: 'punch', beat: 0.5, aliases: [] };

const base = (): MaterialState => ({
  combos: [
    { id: 'a', moves: ['jab', 'cross'], on: true },
    { id: 'b', moves: ['jab', 'c_elbow'], on: true },
    { id: 'c', moves: ['c_elbow'], on: false },
  ],
  settings: DEFAULTS,
  labels: { jab: '원', c_elbow: '팔꿈치' },
  customMoves: [ELBOW],
  beats: { jab: 0.4, c_elbow: 0.9 },
  loaded: true,
  undo: null,
});

describe('removeMove — 네 조각이 한 번에 바뀐다', () => {
  it('동작이 빠지고, 그 동작을 쓰던 콤보에서도 빠지고, 비면 콤보가 사라진다', () => {
    const next = materialReducer(base(), { type: 'removeMove', id: 'c_elbow' });

    expect(next.customMoves).toEqual([]);
    // b는 잽만 남고, c는 텅 비어 사라진다
    expect(next.combos.map((c) => c.id)).toEqual(['a', 'b']);
    expect(next.combos.find((c) => c.id === 'b')?.moves).toEqual(['jab']);
    // 그 동작에만 걸려 있던 길이·호출어도 같이 지워진다
    expect(next.beats).toEqual({ jab: 0.4 });
    expect(next.labels).toEqual({ jab: '원' });
  });

  it('영향받은 콤보 수를 토스트에 적는다', () => {
    const next = materialReducer(base(), { type: 'removeMove', id: 'c_elbow' });
    expect(next.undo?.text).toBe('엘보 지웠어 · 콤보 2개에서 빠짐');
  });

  it('되돌리면 넷이 전부 원래대로 온다', () => {
    const before = base();
    const gone = materialReducer(before, { type: 'removeMove', id: 'c_elbow' });
    const back = materialReducer(gone, { type: 'restoreUndo' });

    expect(back.customMoves).toEqual(before.customMoves);
    expect(back.combos).toEqual(before.combos);
    expect(back.beats).toEqual(before.beats);
    expect(back.labels).toEqual(before.labels);
    expect(back.undo).toBeNull();
  });

  it('없는 동작을 지우라고 하면 아무것도 건드리지 않는다', () => {
    const before = base();
    expect(materialReducer(before, { type: 'removeMove', id: 'nope' })).toBe(before);
  });
});

describe('removeCombo — 되돌릴 범위는 건드린 조각까지만', () => {
  it('사용자가 정한 호출어로 토스트를 적는다', () => {
    const next = materialReducer(base(), { type: 'removeCombo', id: 'a' });
    // jab의 호출어가 '원'으로 바뀌어 있으므로 그 말로 적는다
    expect(next.undo?.text).toBe('원 스트레이트 지웠어');
  });

  it('지운 뒤에 고친 호출어는 되돌리기가 되감지 않는다', () => {
    const gone = materialReducer(base(), { type: 'removeCombo', id: 'a' });
    const renamed = materialReducer(gone, { type: 'setLabel', id: 'cross', value: '투' });
    const back = materialReducer(renamed, { type: 'restoreUndo' });

    expect(back.combos.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(back.labels['cross']).toBe('투');
  });
});

describe('resetMove — 기본 동작과 직접 추가한 동작이 다르다', () => {
  it('기본 동작은 호출어를 비우고 길이를 되돌린다', () => {
    const next = materialReducer(base(), { type: 'resetMove', id: 'jab' });
    expect(next.labels['jab']).toBe('');
    expect(next.beats['jab']).toBeUndefined();
  });

  it('직접 추가한 동작은 이름이 곧 그 동작이라 이름을 지우지 않는다', () => {
    const next = materialReducer(base(), { type: 'resetMove', id: 'c_elbow' });
    expect(next.labels['c_elbow']).toBe('팔꿈치');
    expect(next.beats['c_elbow']).toBeUndefined();
  });
});

describe('resetBaseMoves — 기본만 되돌리고 직접 추가한 것은 남긴다', () => {
  it('기본 동작의 호출어·길이만 사라진다', () => {
    const next = materialReducer(base(), { type: 'resetBaseMoves' });
    expect(next.labels).toEqual({ c_elbow: '팔꿈치' });
    expect(next.beats).toEqual({ c_elbow: 0.9 });
  });
});

/*
 * 값이 그대로면 상태도 그대로여야 한다. 자료가 트리 밖에 한 벌이라
 * 새 객체를 하나 만들 때마다 화면 전체가 다시 그려진다 — 슬라이더는 같은 눈금에서도 여러 번 부른다.
 */
describe('patchSettings — 안 바뀐 값은 상태를 새로 만들지 않는다', () => {
  it('같은 값을 넣으면 들어온 상태를 그대로 돌려준다', () => {
    const state = base();
    expect(materialReducer(state, { type: 'patchSettings', patch: { tempo: state.settings.tempo } })).toBe(state);
  });

  it('한 조각이라도 다르면 새로 만든다', () => {
    const state = base();
    const next = materialReducer(state, {
      type: 'patchSettings',
      patch: { tempo: state.settings.tempo, gap: state.settings.gap + 0.1 },
    });
    expect(next).not.toBe(state);
    expect(next.settings.gap).toBeCloseTo(state.settings.gap + 0.1);
  });
});
