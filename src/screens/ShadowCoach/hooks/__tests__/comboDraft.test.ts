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
const taps = (...at: number[]): DraftAction[] => at.map((a) => ({ type: 'tap', at: a }));

describe('두드리기', () => {
  it('첫 터치가 시작이고, 완료하면 탭 수만큼 빈 자리와 하나 적은 리듬이 생긴다', () => {
    const s = run(...taps(1000, 1200, 1500), { type: 'finish' });
    expect(s.stage).toBe('slots');
    expect(s.slots).toEqual([null, null, null]);
    expect(s.rhythm).toEqual([0.2, 0.3]);
    expect(s.cursor).toBe(0);
  });

  it('한 번도 안 두드리고 완료하면 아무 일도 없다', () => {
    expect(run({ type: 'finish' })).toEqual(INITIAL_DRAFT);
  });

  it('두드리다 취소하면 두드린 것만 버린다', () => {
    expect(run(...taps(1, 2), { type: 'cancel' })).toEqual(INITIAL_DRAFT);
  });

  // 기획서: 다시 두드리면 동작은 앞에서부터 남고, 탭이 줄면 뒤가 잘리고 늘면 뒤가 빈다.
  it('다시 두드리면 동작은 남기고 자리 수만 바뀐다', () => {
    const base = run(...taps(0, 300, 600), { type: 'finish' }, { type: 'type', text: '잽 잽 스트레이트', alias });
    const fewer = run(...taps(0, 300, 600), { type: 'finish' }, { type: 'type', text: '잽 잽 스트레이트', alias },
      { type: 'retap' }, ...taps(0, 500), { type: 'finish' });
    expect(base.slots).toEqual(['jab', 'jab', 'cross']);
    expect(fewer.slots).toEqual(['jab', 'jab']);
    expect(fewer.rhythm).toEqual([0.5]);

    const more = [...taps(0, 200, 400, 600)].reduce(r, { ...base, stage: 'tapping', taps: [] });
    expect(r(more, { type: 'finish' }).slots).toEqual(['jab', 'jab', 'cross', null]);
  });

  it('다시 두드리다 취소하면 자리와 동작이 그대로다', () => {
    const s = run(...taps(0, 300), { type: 'finish' }, { type: 'type', text: '잽 잽', alias },
      { type: 'retap' }, ...taps(0), { type: 'cancel' });
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
