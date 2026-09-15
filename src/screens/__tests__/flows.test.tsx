import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import ShadowCoach from '../ShadowCoach';
import Layout from '../../pages/_layout';
import { dispatchMaterial, flushMaterial, resetMaterial } from '../ShadowCoach/hooks';
import { resetStorage, storageSnapshot } from '../../commons/test-support/storageMock';

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

jest.mock('@granite-js/native/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, WebView: View };
});
jest.mock('@apps-in-toss/native-modules', () => ({
  setScreenAwakeMode: jest.fn(() => Promise.resolve({ enabled: true })),
  generateHapticFeedback: jest.fn(),
  /* 저장소는 토스 것을 쓴다. 미니앱을 껐다 켜도 남아야 하는 자리라 AsyncStorage로는 안 된다. */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Storage: require('../../commons/test-support/storageMock').Storage,
}));

const saved = <T,>(key: string): T | null => {
  const raw = storageSnapshot().get(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

beforeEach(() => {
  resetStorage();
  resetMaterial();
});

/* 마이크는 대역에서 영영 안 켜진다. 콤보는 자료에 직접 심는다. */
const seed = (...names: string[]) => {
  act(() => {
    dispatchMaterial({ type: 'hydrate', value: {} });
    names.forEach((name, i) =>
      dispatchMaterial({
        type: 'addCombo',
        name,
        clip: { data: `clip-${i}`, ms: 2000, head: 0.2, tail: 1.6 },
      })
    );
  });
};

const open = async () => {
  const view = render(
    <Layout>
      <ShadowCoach />
    </Layout>
  );
  await act(async () => {});
  return view;
};

describe('gap — 콤보 사이 유지 구간 안내', () => {
  it('콤보가 끝나면 안내 칩이 뜬다', async () => {
    jest.useFakeTimers();
    await open();
    seed('원투');
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
    await open();
    seed('원투');

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

/*
 * 미니앱을 완전히 종료했다 다시 여는 것.
 *
 * 기기에서 콤보가 통째로 초기화되는 것으로 깨진 자리다 —
 * `AsyncStorage`는 토스 미니앱을 껐다 켜면 남지 않는다. 지금은 토스 저장소를 쓴다.
 *
 * 흉내내는 방법: 저장소는 그대로 두고 **메모리만** 되감는다.
 * 자료는 리액트 트리 밖 모듈 상태라, 그것이 곧 JS 컨텍스트가 새로 서는 것과 같다.
 */
describe('저장소 — 껐다 켜도 남는다', () => {
  it('넣은 콤보와 녹음이 다시 열었을 때 그대로다', async () => {
    const first = await open();
    seed('원투', '로우킥');

    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 2개 · 2개 사용')).toBeTruthy());

    // 미뤄둔 쓰기를 내보낸다. 앱이 내려가는 순간에 일어나는 일과 같다.
    act(() => flushMaterial());
    const stored = saved<{ id: string; name: string }[]>('sbc:combos');
    expect(stored).toHaveLength(2);
    // 본체는 콤보별 키로 따로 나간다(기획서 5장)
    expect(saved<string>('sbc:clip:' + stored![0]!.id)).toBe('clip-1');

    first.unmount();

    // 여기서부터 새로 켠 앱이다. 저장소는 그대로, 메모리는 비었다.
    resetMaterial();

    await open();
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 2개 · 2개 사용')).toBeTruthy());
    expect(screen.getByText('로우킥')).toBeTruthy();
    expect(screen.getByText('원투')).toBeTruthy();
  });
});
