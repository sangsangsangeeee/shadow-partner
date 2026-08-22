import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import ShadowCoach from '../ShadowCoach';
import { ACCENT } from '../../commons/constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../commons/test-support/tdsMock'));

jest.mock('@granite-js/native/react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: View, Svg: View, Circle: View, Path: View, Rect: View };
});
jest.mock('@granite-js/native/react-native-safe-area-context', () => {
  const React2 = jest.requireActual('react');
  const insets = { top: 44, bottom: 34, left: 0, right: 0 };
  return {
    __esModule: true,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React2.createElement(React2.Fragment, null, children),
    useSafeAreaInsets: () => insets,
    initialWindowMetrics: { frame: { x: 0, y: 0, width: 390, height: 844 }, insets },
  };
});
jest.mock('@granite-js/native/@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).__flowStore = store;
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        store.delete(k);
        return Promise.resolve();
      },
    },
  };
});
jest.mock('@granite-js/native/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, WebView: View };
});
jest.mock('@apps-in-toss/native-modules', () => ({
  setScreenAwakeMode: jest.fn(() => Promise.resolve({ enabled: true })),
  generateHapticFeedback: jest.fn(),
}));

const store = () => (globalThis as Record<string, unknown>).__flowStore as Map<string, string>;
const saved = <T,>(key: string): T | null => {
  const raw = store().get(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

beforeEach(() => store().clear());

describe('reveal — 중복 콤보로 강조하고 자동 해제', () => {
  it('액센트 링이 둘러졌다가 2.4초 뒤 풀린다', async () => {
    jest.useFakeTimers();
    render(<ShadowCoach />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('콤보'));

    // SEED에 있는 콤보를 그대로 친다
    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '잽 스트레이트 로우킥');
    await act(async () => {});
    fireEvent.press(screen.getByText('목록에서 보기'));
    await act(async () => {});

    // 강조는 액센트 링 2px. 평소 카드 테두리는 1px이라 구분된다.
    const lit = () =>
      screen.UNSAFE_root.findAll((n) => {
        const flat = JSON.stringify(n.props?.style) ?? '';
        return flat.includes(ACCENT) && flat.includes('"borderWidth":2');
      }).length;

    expect(lit()).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });
    expect(lit()).toBe(0);
    jest.useRealTimers();
  });
});

describe('moveundo — 동작 삭제의 영향 범위와 전체 복원', () => {
  it('그 동작을 쓰던 콤보에서 빠지고, 되돌리면 전부 살아난다', async () => {
    render(<ShadowCoach />);
    await act(async () => {});

    // 동작 하나 추가
    fireEvent.press(screen.getByLabelText('호출어'));
    fireEvent.press(screen.getByLabelText('동작 추가'));
    await waitFor(() => expect(screen.getByText('뭐라고 부를까')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText(/엘보/), '엘보');
    fireEvent.press(screen.getByText('추가'));
    await waitFor(() => expect(screen.getByText('엘보')).toBeTruthy());

    // 그 동작으로 콤보 두 개를 만든다
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '잽 엘보');
    fireEvent.press(screen.getByText('콤보 저장'));
    await waitFor(() => expect(screen.getByText('콤보 5개 · 5개 사용')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '엘보');
    fireEvent.press(screen.getByText('콤보 저장'));
    await waitFor(() => expect(screen.getByText('콤보 6개 · 6개 사용')).toBeTruthy());

    // 동작을 지운다
    fireEvent.press(screen.getByLabelText('호출어'));
    fireEvent.press(screen.getByText('엘보'));
    await waitFor(() => expect(screen.getByLabelText('동작 삭제')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('동작 삭제'));

    // 영향 범위를 토스트에 적는다
    await waitFor(() => expect(screen.getByText('엘보 지웠어 · 콤보 2개에서 빠짐')).toBeTruthy());

    // 엘보만 있던 콤보는 비어서 사라지고, 잽 엘보는 잽만 남는다.
    // 여기서 탭을 옮기면 토스트가 정리되므로(기획서 9장) 저장소로 확인한다.
    await waitFor(() => expect(saved<unknown[]>('sbc:combos')).toHaveLength(5));
    expect(saved<unknown[]>('sbc:moves')).toHaveLength(0);

    // 되돌리면 동작·콤보가 전부 복원된다
    fireEvent.press(screen.getByText('되돌리기'));
    await waitFor(() => expect(saved<unknown[]>('sbc:combos')).toHaveLength(6));
    expect(saved<unknown[]>('sbc:moves')).toHaveLength(1);
    expect(screen.getByText('엘보')).toBeTruthy();
  });
});

describe('beats — 기본 동작 길이 변경·저장·되돌리기', () => {
  it('덮어쓰기가 저장되고 기본값으로 되돌아간다', async () => {
    render(<ShadowCoach />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('호출어'));

    // 잽은 기본 0.40 — 접힌 줄에도 길이가 보인다
    expect(screen.getByText('아주 짧게')).toBeTruthy();

    fireEvent.press(screen.getByText('잽'));
    await waitFor(() => expect(screen.getByPlaceholderText('잽')).toBeTruthy());
    fireEvent.press(screen.getByText('길게'));

    await waitFor(() => expect(saved<Record<string, number>>('sbc:beats')?.jab).toBe(0.85));
    // 기본값 안내는 그대로 남는다
    expect(screen.getByText('기본 잽 · 아주 짧게')).toBeTruthy();

    // 되돌리면 덮어쓰기가 사라진다 (기본값을 대체하지 않고 위에 얹었으므로)
    fireEvent.press(screen.getByLabelText('기본값으로'));
    await waitFor(() => expect(saved<Record<string, number>>('sbc:beats')?.jab).toBeUndefined());
  });
});

describe('gap — 콤보 사이 유지 구간 안내', () => {
  it('콤보가 끝나면 안내 칩이 뜬다', async () => {
    jest.useFakeTimers();
    render(<ShadowCoach />);
    await act(async () => {});
    fireEvent.press(screen.getByText('시작'));

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // 유지 구간은 콤보 사이에만 잠깐 뜬다. 촘촘히 훑어서 잡는다.
    const CUES = ['스탠스 유지', '가드 올리고', '롱가드', '스텝', '백스텝', '사이드 스텝', '리듬 타기'];
    let seen = false;
    for (let i = 0; i < 80 && !seen; i++) {
      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      seen = CUES.some((c) => screen.queryAllByText(c).length > 0);
    }
    expect(seen).toBe(true);
    jest.useRealTimers();
  });
});

describe('done — 완주, 통계 집계, 재시작', () => {
  it('마지막 라운드를 마치면 완료 화면이 뜨고 다시 시작할 수 있다', async () => {
    jest.useFakeTimers();
    render(<ShadowCoach />);
    await act(async () => {});

    // 3라운드 × 3:00 + 휴식 2 × 1:00 + 준비 5초
    fireEvent.press(screen.getByText('시작'));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    for (let i = 0; i < 70; i++) {
      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });
      if (screen.queryAllByText('STAGE CLEAR').length > 0) break;
    }

    expect(screen.getByText('STAGE CLEAR')).toBeTruthy();
    expect(screen.getByText('수고했어')).toBeTruthy();
    expect(screen.getByText('TO BE CONTINUED...')).toBeTruthy();

    // 통계는 세션 동안 누적된다 — 카운트업이 끝나면 실제 값이 보인다
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getByText('9:00')).toBeTruthy(); // 3라운드 × 3:00

    // 한 번 더
    fireEvent.press(screen.getByText('한 번 더'));
    await act(async () => {});
    expect(screen.queryByText('STAGE CLEAR')).toBeNull();
    expect(screen.getByText('준비')).toBeTruthy();
    jest.useRealTimers();
  });
});
