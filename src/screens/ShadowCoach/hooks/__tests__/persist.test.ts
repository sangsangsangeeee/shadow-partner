/*
 * 쓰기를 미루는 창.
 *
 * 슬라이더가 이 창을 요구한다 — TDS Slider는 onChangeEnd가 없어서 끄는 내내 발화하고,
 * 콤보 간격은 끝에서 끝까지 한 번 끌면 쓰기가 55번이다.
 * 미루는 대신 "마지막 값이 안 써지고 앱이 죽는" 창이 새로 생기므로, 여기서 그 둘을 같이 본다.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../../../commons/test-support/tdsMock'));

const writes: { key: string; value: string }[] = [];

jest.mock('@granite-js/native/@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: (key: string, value: string) => {
      writes.push({ key, value });
      return Promise.resolve();
    },
  },
}));

import { dispatchMaterial, flushMaterial, resetMaterial } from '../useMaterial';
import { STORAGE_KEYS } from '../../../../commons/constants';

/** 저장은 loaded 뒤에만 일어난다. 읽기를 흉내내 창을 연다. */
const hydrate = () => dispatchMaterial({ type: 'hydrate', value: {} });

beforeEach(() => {
  jest.useFakeTimers();
  writes.length = 0;
  resetMaterial();
});

afterEach(() => {
  jest.useRealTimers();
});

const settingsWrites = () => writes.filter((w) => w.key === STORAGE_KEYS.settings);

describe('창 안의 연속 조작은 한 번만 쓴다', () => {
  it('슬라이더를 끄는 동안 열 번 바뀌어도 쓰기는 한 번이고, 마지막 값이 남는다', () => {
    hydrate();
    writes.length = 0;

    for (let i = 1; i <= 10; i++) {
      dispatchMaterial({ type: 'patchSettings', patch: { tempo: 0.5 + i * 0.05 } });
    }
    // 아직 창이 열려 있다
    expect(settingsWrites()).toHaveLength(0);

    jest.advanceTimersByTime(300);

    expect(settingsWrites()).toHaveLength(1);
    expect(JSON.parse(settingsWrites()[0]!.value).tempo).toBeCloseTo(1.0);
  });

  it('창이 닫힌 뒤의 조작은 새 쓰기다', () => {
    hydrate();
    writes.length = 0;

    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.2 } });
    jest.advanceTimersByTime(300);
    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.4 } });
    jest.advanceTimersByTime(300);

    expect(settingsWrites()).toHaveLength(2);
  });
});

describe('조각은 서로를 끌고 가지 않는다', () => {
  it('설정만 바꾸면 설정만 쓴다', () => {
    hydrate();
    writes.length = 0;

    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.5 } });
    jest.advanceTimersByTime(300);

    expect(writes.map((w) => w.key)).toEqual([STORAGE_KEYS.settings]);
  });

  it('한 창 안에서 두 조각이 바뀌면 둘 다 나간다', () => {
    hydrate();
    writes.length = 0;

    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.5 } });
    dispatchMaterial({ type: 'setLabel', id: 'jab', value: '원' });
    jest.advanceTimersByTime(300);

    expect(writes.map((w) => w.key).sort()).toEqual([STORAGE_KEYS.labels, STORAGE_KEYS.settings].sort());
  });
});

describe('flush — 앱이 내려가는 순간', () => {
  it('창이 닫히기 전에 불러도 마지막 값이 나간다', () => {
    hydrate();
    writes.length = 0;

    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.9 } });
    expect(settingsWrites()).toHaveLength(0);

    flushMaterial();

    expect(settingsWrites()).toHaveLength(1);
    expect(JSON.parse(settingsWrites()[0]!.value).tempo).toBeCloseTo(1.9);
  });

  it('flush 뒤에 창이 또 열려 같은 값을 두 번 쓰지 않는다', () => {
    hydrate();
    writes.length = 0;

    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.9 } });
    flushMaterial();
    jest.advanceTimersByTime(300);

    expect(settingsWrites()).toHaveLength(1);
  });
});

describe('되감기는 미뤄둔 것을 버린다', () => {
  it('resetMaterial 뒤에 창이 닫혀도 앞의 값이 새어 나가지 않는다', () => {
    hydrate();
    writes.length = 0;

    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.9 } });
    resetMaterial();
    jest.advanceTimersByTime(300);

    expect(writes).toHaveLength(0);
  });
});

describe('읽기 전에는 쓰지 않는다', () => {
  it('loaded 전의 조작은 창에도 들어가지 않는다', () => {
    dispatchMaterial({ type: 'patchSettings', patch: { tempo: 1.9 } });
    jest.advanceTimersByTime(300);

    expect(writes).toHaveLength(0);
  });
});
