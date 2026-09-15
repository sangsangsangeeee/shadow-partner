/*
 * 리듀서는 순수 함수라 화면 없이 바로 굴릴 수 있다.
 * 여기서 보는 것은 "한 조작이 여러 조각을 동시에 맞게 바꾸는가"다 —
 * 콤보와 녹음 본체는 따로 살면서 같이 움직여야 한다(기획서 5장).
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

const base = (): MaterialState => ({
  combos: [
    { id: 'a', name: '원투', on: true, ms: 2100, head: 0.3, tail: 1.8 },
    { id: 'b', name: '로우킥', on: true, ms: 1500, head: 0.2, tail: 1.2 },
  ],
  settings: DEFAULTS,
  clips: { a: 'clip-a', b: 'clip-b' },
  loaded: true,
  undo: null,
});

const NEW = { data: 'clip-new', ms: 1800, head: 0.1, tail: 1.5 };

describe('addCombo — 자리와 본체가 따로 간다', () => {
  it('콤보에는 잰 값이, clips에는 본체가 들어간다', () => {
    const next = materialReducer(base(), { type: 'addCombo', name: '훅', clip: NEW });
    const added = next.combos[0]!;
    // 새 콤보는 목록 맨 위로. 오늘 담은 것이 제일 중요하다(기획서 4.4).
    expect(added.name).toBe('훅');
    expect({ ms: added.ms, head: added.head, tail: added.tail }).toEqual({ ms: 1800, head: 0.1, tail: 1.5 });
    expect(next.clips[added.id]).toBe('clip-new');
  });
});

describe('replaceCombo — 이름만 고칠 때와 다시 녹음할 때가 다르다', () => {
  it('이름만 주면 녹음은 그대로 남는다', () => {
    const next = materialReducer(base(), { type: 'replaceCombo', id: 'a', name: '원투쓰리' });
    const c = next.combos.find((x) => x.id === 'a')!;
    expect(c.name).toBe('원투쓰리');
    expect(c.ms).toBe(2100);
    expect(next.clips.a).toBe('clip-a');
  });

  it('새 녹음을 주면 잰 값이 통째로 갈린다', () => {
    const next = materialReducer(base(), { type: 'replaceCombo', id: 'a', name: '원투', clip: NEW });
    const c = next.combos.find((x) => x.id === 'a')!;
    expect({ ms: c.ms, head: c.head, tail: c.tail }).toEqual({ ms: 1800, head: 0.1, tail: 1.5 });
    expect(next.clips.a).toBe('clip-new');
  });

  // ms가 곧 "녹음이 있나"다. 본체만 지우고 잰 값을 남기면 틀 수 없는 콤보가 남는다.
  it('null을 주면 본체도 잰 값도 같이 사라진다', () => {
    const next = materialReducer(base(), { type: 'replaceCombo', id: 'a', clip: null });
    const c = next.combos.find((x) => x.id === 'a')!;
    expect(c.ms).toBe(0);
    expect(next.clips.a).toBeUndefined();
  });
});

describe('removeCombo — 되돌릴 범위는 건드린 조각까지만', () => {
  it('이름으로 토스트를 적고 본체도 같이 뺀다', () => {
    const next = materialReducer(base(), { type: 'removeCombo', id: 'a' });
    expect(next.undo?.text).toBe('원투 지웠어');
    expect(next.combos.map((c) => c.id)).toEqual(['b']);
    expect(next.clips.a).toBeUndefined();
  });

  it('되돌리면 콤보와 녹음이 같이 돌아온다', () => {
    const before = base();
    const gone = materialReducer(before, { type: 'removeCombo', id: 'a' });
    const back = materialReducer(gone, { type: 'restoreUndo' });
    expect(back.combos).toEqual(before.combos);
    expect(back.clips).toEqual(before.clips);
    expect(back.undo).toBeNull();
  });

  // 전부 담으면, 지운 뒤에 다른 걸 고쳤을 때 되돌리기가 그것까지 되감는다.
  it('지운 뒤에 바꾼 설정은 되돌리기가 되감지 않는다', () => {
    const gone = materialReducer(base(), { type: 'removeCombo', id: 'a' });
    const tuned = materialReducer(gone, { type: 'patchSettings', patch: { tempo: 1.2 } });
    const back = materialReducer(tuned, { type: 'restoreUndo' });
    expect(back.combos.map((c) => c.id)).toEqual(['a', 'b']);
    expect(back.settings.tempo).toBeCloseTo(1.2);
  });

  it('없는 콤보를 지우라고 하면 아무것도 건드리지 않는다', () => {
    const before = base();
    expect(materialReducer(before, { type: 'removeCombo', id: 'nope' })).toBe(before);
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
