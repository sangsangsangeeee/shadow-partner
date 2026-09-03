import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { generateHapticFeedback, setScreenAwakeMode } from '@apps-in-toss/native-modules';
import ShadowCoach from '../ShadowCoach';
import Layout from '../../pages/_layout';
import { resetMaterial } from '../ShadowCoach/hooks';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../commons/test-support/tdsMock'));

/* _layout이 이 모듈에 닿는다. 라우트는 하나뿐이지만 렌더하려면 대역이 필요하다. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@granite-js/react-native', () => require('../../commons/test-support/routerMock'));

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
