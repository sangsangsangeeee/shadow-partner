import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { generateHapticFeedback, setScreenAwakeMode } from '@apps-in-toss/native-modules';
import ShadowCoach from '../ShadowCoach';
import Layout from '../../pages/_layout';
import { resetMaterial } from '../ShadowCoach/hooks';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../commons/test-support/tdsMock'));

/* _layout이 이 모듈에 닿는다. 라우트는 하나뿐이지만 렌더하려면 대역이 필요하다. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@granite-js/react-native', () => require('../../commons/test-support/routerMock'));

/* 번들러가 실제 패키지로 치환하는 껍데기라 jest에서는 비어 있다. 모듈째 갈아끼운다. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@granite-js/native/react-native-gesture-handler', () => require('../../commons/test-support/gestureMock'));

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
jest.mock('@granite-js/native/@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  },
}));
jest.mock('@granite-js/native/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, WebView: View };
});
jest.mock('@apps-in-toss/native-modules', () => ({
  setScreenAwakeMode: jest.fn(() => Promise.resolve({ enabled: true })),
  generateHapticFeedback: jest.fn(),
}));

const haptic = generateHapticFeedback as jest.Mock;
const awake = setScreenAwakeMode as jest.Mock;

/** 진동 종류별 호출 횟수 */
// 자료는 트리 밖에 산다. 테스트마다 초기 상태에서 시작한다.
beforeEach(resetMaterial);

const buzzCounts = () =>
  haptic.mock.calls.reduce<Record<string, number>>((acc, [arg]) => {
    const t = (arg as { type: string }).type;
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

describe('벨·클래퍼 — 소리가 안 나는 기기에서도 몸으로 안다', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    haptic.mockClear();
    awake.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const startTraining = async () => {
    render(
      <Layout>
        <ShadowCoach />
      </Layout>
    );
    await act(async () => {});
    fireEvent.press(screen.getByText('시작'));
    await act(async () => {});
  };

  it('시작하면 화면을 켜둔다', async () => {
    await startTraining();
    expect(awake).toHaveBeenCalledWith({ enabled: true });
  });

  it('준비 카운트다운(비프)에는 진동을 걸지 않는다', async () => {
    await startTraining();
    // 준비 5초 중 4초 경과 — 비프만 울린다
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(haptic).not.toHaveBeenCalled();
  });

  it('라운드 시작 벨은 3회 울린다', async () => {
    await startTraining();
    haptic.mockClear();
    // 준비 5초를 넘겨 라운드 진입
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(buzzCounts()['basicMedium']).toBe(3);
  });

  it('10초 전에는 클래퍼가 3번 튄다', async () => {
    await startTraining();
    // 준비 5초 + 라운드 170초 = 라운드 잔여 10초
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    haptic.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(170 * 1000);
    });
    // 클래퍼 3번은 0.16초 간격이라 마지막 틱 이후를 조금 더 흘린다
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(buzzCounts()['tickMedium']).toBe(3);
  });

  it('정지하면 화면 켜둠을 해제한다', async () => {
    await startTraining();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    awake.mockClear();
    fireEvent.press(screen.getByLabelText('정지'));
    await act(async () => {});
    expect(awake).toHaveBeenCalledWith({ enabled: false });
  });
});

/*
 * iOS는 백그라운드에서 JS를 세운다. 나오던 말 한 마디까지만 나오고 시계도 선다 —
 * 미니앱이라 오디오 백그라운드 모드를 우리가 선언할 수 없어 이어갈 방법이 없다.
 * 그냥 두면 돌아왔을 때 라운드가 밀려 있고 밀린 호출이 한꺼번에 터진다. 그래서 나가면 멈춘다.
 */
describe('백그라운드 — 나가면 멈추고, 재개는 사람이 정한다', () => {
  const listeners: ((state: AppStateStatus) => void)[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    listeners.length = 0;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler: (state: AppStateStatus) => void) => {
        listeners.push(handler);
        return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
      });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const goto = (state: AppStateStatus) => act(() => listeners.forEach((h) => h(state)));

  const startTraining = async () => {
    render(
      <Layout>
        <ShadowCoach />
      </Layout>
    );
    await act(async () => {});
    fireEvent.press(screen.getByText('시작'));
    await act(async () => {});
  };

  it('나가면 멈추고, 돌아와도 저절로 이어지지 않는다', async () => {
    await startTraining();
    expect(screen.getByText('일시정지')).toBeTruthy();

    goto('background');
    expect(screen.getByText('재개')).toBeTruthy();

    // 돌아오는 것만으로 다시 돌면 주머니 속에서 훈련이 이어진다
    goto('active');
    expect(screen.getByText('재개')).toBeTruthy();
  });

  it('알림 배너처럼 스쳐 가는 inactive로는 안 멈춘다', async () => {
    await startTraining();
    goto('inactive');
    expect(screen.getByText('일시정지')).toBeTruthy();
  });

  it('멈춘 동안에는 시계가 안 간다', async () => {
    await startTraining();
    const before = screen.getByText('0:05');
    expect(before).toBeTruthy();

    goto('background');
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('0:05')).toBeTruthy();
  });
});
