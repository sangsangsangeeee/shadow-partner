import { comboDraftReducer as r, INITIAL_DRAFT, type ComboDraft, type DraftAction } from '../comboDraft';
import type { Combo } from '../../../../commons/types';

/* 팔레트가 모듈 로드 때 TDS를 읽는다. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../../../commons/test-support/tdsMock'));
jest.mock('@apps-in-toss/native-modules', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Storage: require('../../../../commons/test-support/storageMock').Storage,
  setScreenAwakeMode: jest.fn(),
  generateHapticFeedback: jest.fn(),
}));

/*
 * 콤보 초안의 전이. 기획서 4.4.
 *
 * 마이크는 늦게 답한다 — 켜 달라고 한 뒤 켜지고, 멈춰 달라고 한 뒤 본체가 온다.
 * 그 사이에 사람이 취소하거나 다시 녹음할 수 있으므로, 어느 답을 받고 어느 답을 버릴지가 여기 있다.
 * 실물 마이크는 대역에서 영영 안 켜져서 이 층이 유일하게 그 순서를 확인하는 자리다.
 */
const run = (...actions: DraftAction[]): ComboDraft => actions.reduce(r, INITIAL_DRAFT);

const SAVED: Combo = { id: 'c1', name: '원투', on: true, ms: 2100, head: 0.3, tail: 1.8 };

const DONE = { type: 'recorded' as const, data: 'data:audio/mp4;base64,AAAA', duration: 2.1, head: 0.3, tail: 1.8 };

describe('녹음', () => {
  it('누르면 녹음이 시작되고, 완료하면 이름 단계로 간다', () => {
    const s = run({ type: 'arm' }, { type: 'recStarted' }, { type: 'finish' }, DONE);
    expect(s.stage).toBe('named');
    expect(s.recording).toBe('off');
    expect(s.clip).toEqual({ data: DONE.data, duration: 2.1, head: 0.3, tail: 1.8 });
  });

  it('녹음 중에 또 누르면 아무 일도 없다', () => {
    const armed = run({ type: 'arm' }, { type: 'recStarted' });
    expect(r(armed, { type: 'arm' })).toBe(armed);
  });

  it('마이크가 켜지기 전에 완료해도 본체는 받는다', () => {
    const s = run({ type: 'arm' }, { type: 'finish' }, DONE);
    expect(s.clip?.duration).toBe(2.1);
  });

  it('마이크를 못 쓰면 녹음이 없다', () => {
    const s = run({ type: 'arm' }, { type: 'recFailed', message: 'NotAllowedError' }, { type: 'finish' });
    expect(s.stage).toBe('named');
    expect(s.clip).toBeNull();
  });

  // 취소한 녹음의 본체가 뒤늦게 오면 받으면 안 된다 — 지난 자리에 엉뚱한 목소리가 붙는다.
  it('취소한 뒤 도착한 본체는 버린다', () => {
    const s = run({ type: 'arm' }, { type: 'recStarted' }, { type: 'cancel' }, DONE);
    expect(s).toEqual(INITIAL_DRAFT);
    expect(s.clip).toBeNull();
  });

  it('다시 녹음하면 지난 녹음은 버리고 새로 시도한 것으로 표시한다', () => {
    const first = run({ type: 'arm' }, { type: 'finish' }, DONE);
    expect(first.clip?.data).toBe(DONE.data);
    const again = r(first, { type: 'arm' });
    expect(again.clip).toBeNull();
    expect(again.reRecorded).toBe(true);
    expect(again.session).toBe(first.session + 1);
  });
});

describe('이름', () => {
  it('이름을 적으면 담기고 안내는 걷힌다', () => {
    const s = run({ type: 'arm' }, { type: 'finish' }, DONE, { type: 'hint', text: '이름을 적어줘.' }, { type: 'setName', text: '원투' });
    expect(s.name).toBe('원투');
    expect(s.hint).toBe('');
  });
});

describe('수정', () => {
  it('이름 고치기는 이름을 싣고 이름 단계로 들어간다', () => {
    const s = r(INITIAL_DRAFT, { type: 'edit', combo: SAVED });
    expect(s.stage).toBe('named');
    expect(s.name).toBe('원투');
    expect(s.editingId).toBe('c1');
    // 새로 녹음하기 전까지는 있던 녹음을 건드린 게 아니다
    expect(s.reRecorded).toBe(false);
    expect(s.clip).toBeNull();
  });

  /* 기획서 4.4 — 다시 녹음을 취소하면 원래 녹음이 남는다. 수정 자리를 잃으면 그게 안 된다. */
  it('수정 중 다시 녹음하다 취소하면 이름 단계로 돌아온다', () => {
    const s = run({ type: 'edit', combo: SAVED }, { type: 'arm' }, { type: 'cancel' });
    expect(s.stage).toBe('named');
    expect(s.editingId).toBe('c1');
    expect(s.name).toBe('원투');
    expect(s.reRecorded).toBe(false);
  });

  it('새로 만들다 취소하면 전부 버린다', () => {
    const s = run({ type: 'arm' }, { type: 'cancel' });
    expect(s).toEqual(INITIAL_DRAFT);
  });
});
