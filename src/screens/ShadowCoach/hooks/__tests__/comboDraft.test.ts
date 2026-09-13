import { comboDraftReducer as r, INITIAL_DRAFT, nextEmpty, type ComboDraft, type DraftAction } from '../comboDraft';
import { buildAlias } from '../../../../commons/utils';

/* 팔레트가 모듈 로드 때 TDS를 읽고, utils 배럴이 저장소를 거쳐 네이티브 모듈에 닿는다. */
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
 * 한 조작이 슬롯·리듬·열린 자리·넘침을 같이 움직인다. 여기서 맞으면 화면은 그리기만 하면 된다.
 */
const alias = buildAlias([], {});
const run = (...actions: DraftAction[]): ComboDraft => actions.reduce(r, INITIAL_DRAFT);
/** 첫 터치는 마이크를 켠다. 두드림은 그다음부터다 — 그래서 arm이 앞에 붙는다. */
const taps = (...at: number[]): DraftAction[] => [{ type: 'arm' }, ...at.map((a) => ({ type: 'tap' as const, at: a, wall: a }))];

describe('두드리기', () => {
  it('첫 터치가 시작이고, 완료하면 탭 수만큼 빈 자리와 하나 적은 리듬이 생긴다', () => {
    const s = run(...taps(1000, 1200, 1500), { type: 'finish' });
    expect(s.stage).toBe('slots');
    expect(s.slots).toEqual([null, null, null]);
    expect(s.rhythm).toEqual([0.2, 0.3]);
    expect(s.cursor).toBe(0);
  });

  it('한 번도 안 두드리고 완료하면 아무 일도 없다', () => {
    const s = run({ type: 'arm' }, { type: 'finish' });
    expect(s.stage).toBe('idle');
    expect(s.slots).toEqual([]);
  });

  it('두드리다 취소하면 두드린 것만 버린다', () => {
    expect(run(...taps(1, 2), { type: 'cancel' })).toEqual(INITIAL_DRAFT);
  });

  // 기획서: 다시 두드리면 동작은 앞에서부터 남고, 탭이 줄면 뒤가 잘리고 늘면 뒤가 빈다.
  it('다시 두드리면 동작은 남기고 자리 수만 바뀐다', () => {
    const base = run(...taps(0, 300, 600), { type: 'finish' }, { type: 'type', text: '잽 잽 스트레이트', alias });
    const fewer = run(...taps(0, 300, 600), { type: 'finish' }, { type: 'type', text: '잽 잽 스트레이트', alias },
      ...taps(0, 500), { type: 'finish' });
    expect(base.slots).toEqual(['jab', 'jab', 'cross']);
    expect(fewer.slots).toEqual(['jab', 'jab']);
    expect(fewer.rhythm).toEqual([0.5]);

    const more = taps(0, 200, 400, 600).reduce(r, base);
    expect(r(more, { type: 'finish' }).slots).toEqual(['jab', 'jab', 'cross', null]);
  });

  it('다시 두드리다 취소하면 자리와 동작이 그대로다', () => {
    const s = run(...taps(0, 300), { type: 'finish' }, { type: 'type', text: '잽 잽', alias },
      ...taps(0), { type: 'cancel' });
    expect(s.stage).toBe('slots');
    expect(s.slots).toEqual(['jab', 'jab']);
  });
});

describe('한 줄로 채우기', () => {
  const three = run(...taps(0, 300, 600), { type: 'finish' });

  it('적은 순서대로 들어가고 모자라면 뒤가 빈다', () => {
    const s = r(three, { type: 'type', text: '잽 스트레이트', alias });
    expect(s.slots).toEqual(['jab', 'cross', null]);
    expect(s.cursor).toBe(2);
    expect(s.overflow).toBe(0);
  });

  it('자리보다 많이 적으면 넘친 수를 센다', () => {
    const s = r(three, { type: 'type', text: '1-2-3-4', alias });
    expect(s.slots).toEqual(['jab', 'cross', 'lhook']);
    expect(s.overflow).toBe(1);
  });

  it('못 알아들은 말은 남는다', () => {
    const s = r(three, { type: 'type', text: '잽 엘보', alias });
    expect(s.slots).toEqual(['jab', null, null]);
    expect(s.unknown).toEqual(['엘보']);
  });
});

describe('자리 하나씩', () => {
  const three = run(...taps(0, 300, 600), { type: 'finish' });

  it('고르면 채워지고 다음 빈 자리가 열린다', () => {
    const s = r(three, { type: 'pick', id: 'jab' });
    expect(s.slots).toEqual(['jab', null, null]);
    expect(s.cursor).toBe(1);
  });

  it('마지막을 채우면 열린 자리가 없다', () => {
    const s = [{ type: 'pick', id: 'jab' }, { type: 'pick', id: 'cross' }, { type: 'pick', id: 'lowkick' }]
      .reduce<ComboDraft>((acc, a) => r(acc, a as DraftAction), three);
    expect(s.cursor).toBe(-1);
  });

  // 시트로 채우면 입력창은 비운다. 빈 자리를 글로 적을 수 없어 둘을 같게 둘 수 없다.
  it('시트로 채우거나 비우면 입력창이 비고 넘침·미인식도 지워진다', () => {
    const typed = r(three, { type: 'type', text: '잽 잽 잽 잽 엘보', alias });
    expect(typed.overflow).toBe(1);
    const cleared = r(typed, { type: 'clear', index: 1 });
    expect(cleared.slots).toEqual(['jab', null, 'jab']);
    expect(cleared.text).toBe('');
    expect(cleared.overflow).toBe(0);
    expect(cleared.unknown).toEqual([]);
    expect(cleared.cursor).toBe(1);
  });

  it('뒤가 다 찼으면 앞의 빈 자리로 돌아간다', () => {
    expect(nextEmpty([null, 'jab', null], 2)).toBe(0);
    expect(nextEmpty(['jab', 'jab'], 0)).toBe(-1);
  });
});

describe('수정', () => {
  it('동작과 리듬을 그대로 싣고 슬롯 단계로 들어간다', () => {
    const s = r(INITIAL_DRAFT, {
      type: 'edit',
      combo: { id: 'c1', moves: ['jab', 'cross'], on: true, rhythm: [0.25] },
      names: ['잽', '스트레이트'],
    });
    expect(s.stage).toBe('slots');
    expect(s.slots).toEqual(['jab', 'cross']);
    expect(s.rhythm).toEqual([0.25]);
    expect(s.text).toBe('잽 스트레이트');
    expect(s.editingId).toBe('c1');
  });

  it('슬롯 단계에서 취소하면 수정 중이던 것까지 버린다', () => {
    const s = run({ type: 'edit', combo: { id: 'c1', moves: ['jab'], on: true }, names: ['잽'] }, { type: 'cancel' });
    expect(s).toEqual(INITIAL_DRAFT);
  });
});

/*
 * 마이크는 늦게 답한다. 켜 달라고 한 뒤 켜지고, 멈춰 달라고 한 뒤 본체가 온다.
 * 그 사이에 사람이 취소하거나 다시 두드릴 수 있으므로, 어느 답을 받고 어느 답을 버릴지가 여기 있다.
 */
describe('녹음', () => {
  it('첫 터치가 마이크를 켜고, 켜진 시각과 첫 두드림의 차가 offset이 된다', () => {
    const s = run(
      { type: 'arm' },
      { type: 'recStarted', at: 1000 },
      { type: 'tap', at: 5, wall: 1400 },
      { type: 'tap', at: 305, wall: 1700 },
      { type: 'finish' },
      { type: 'recorded', data: 'data:audio/mp4;base64,AAAA', duration: 2.1 }
    );
    expect(s.stage).toBe('slots');
    expect(s.recording).toBe('off');
    expect(s.clip).toEqual({ data: 'data:audio/mp4;base64,AAAA', duration: 2.1, offset: 0.4 });
    expect(s.rhythm).toEqual([0.3]);
  });

  it('마이크가 켜지기 전에 완료해도 본체는 받는다 — 켜진 시각을 모르면 offset은 0', () => {
    const s = run({ type: 'arm' }, { type: 'tap', at: 0, wall: 1000 }, { type: 'finish' },
      { type: 'recorded', data: 'd', duration: 1 });
    expect(s.clip?.offset).toBe(0);
  });

  it('마이크를 못 쓰면 두드리기는 그대로 되고 녹음만 없다', () => {
    const s = run({ type: 'arm' }, { type: 'recFailed', message: 'NotAllowedError' },
      { type: 'tap', at: 0, wall: 0 }, { type: 'tap', at: 300, wall: 300 }, { type: 'finish' });
    // 완료하면 마이크 상태는 접힌다. 녹음이 없다는 건 clip이 말한다.
    expect(s.recording).toBe('off');
    expect(s.slots).toEqual([null, null]);
    expect(s.clip).toBeNull();
  });

  // 취소한 녹음의 본체가 뒤늦게 오면 받으면 안 된다 — 지난 자리에 엉뚱한 목소리가 붙는다.
  it('취소한 뒤 도착한 본체는 버린다', () => {
    const s = run(...taps(0, 300), { type: 'finish' }, { type: 'type', text: '잽 잽', alias },
      { type: 'arm' }, { type: 'recStarted', at: 0 }, { type: 'tap', at: 0, wall: 0 }, { type: 'cancel' },
      { type: 'recorded', data: 'late', duration: 1 });
    expect(s.stage).toBe('slots');
    expect(s.clip).toBeNull();
    expect(s.slots).toEqual(['jab', 'jab']);
  });

  it('다시 두드리면 지난 녹음은 버리고 새로 시도한 것으로 표시한다', () => {
    const first = run(...taps(0, 300), { type: 'finish' }, { type: 'recorded', data: 'one', duration: 1 });
    expect(first.clip?.data).toBe('one');
    const again = r(first, { type: 'arm' });
    expect(again.clip).toBeNull();
    expect(again.reRecorded).toBe(true);
    expect(again.session).toBe(first.session + 1);
  });

  it('수정으로 들어오면 새로 두드리기 전까지는 있던 녹음을 건드린 게 아니다', () => {
    const s = run({ type: 'edit', combo: { id: 'c1', moves: ['jab'], on: true, clip: { offset: 0.2, ms: 1500 } }, names: ['잽'] });
    expect(s.reRecorded).toBe(false);
  });
});

describe('수정 — 취소', () => {
  it('취소하면 수정 중이던 것까지 버린다', () => {
    const s = run({ type: 'edit', combo: { id: 'c1', moves: ['jab'], on: true }, names: ['잽'] }, { type: 'cancel' });
    expect(s).toEqual(INITIAL_DRAFT);
  });
});
