import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ShadowCoach from '../ShadowCoach';

/* 아래 목들은 다른 화면 테스트와 같은 이유로 경계에서 갈아끼운다. */
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
  (globalThis as Record<string, unknown>).__memoStore = store;
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

/*
 * 목록 아이템에 React.memo를 걸어도, 부모가 렌더마다 새 콜백을 만들면 아무 효과가 없다.
 * 그 전제가 깨지는 건 조용하다 — 화면은 멀쩡하고 콤보가 많아졌을 때만 느려진다.
 * 그래서 넘어가는 prop의 신원을 직접 붙잡아 확인한다.
 */
type Captured = Record<string, unknown>;
const mockCardProps: Captured[] = [];
const mockRowProps: Captured[] = [];

jest.mock('../ShadowCoach/parts', () => {
  const actual = jest.requireActual('../ShadowCoach/parts');
  const React2 = jest.requireActual('react');
  return {
    ...actual,
    ComboCard: (props: Captured) => {
      mockCardProps.push(props);
      return React2.createElement(actual.ComboCard, props);
    },
    WordRow: (props: Captured) => {
      mockRowProps.push(props);
      return React2.createElement(actual.WordRow, props);
    },
  };
});

beforeEach(() => {
  const store = (globalThis as Record<string, unknown>).__memoStore as Map<string, string> | undefined;
  store?.clear();
  mockCardProps.length = 0;
  mockRowProps.length = 0;
});

const setup = async () => {
  render(<ShadowCoach />);
  await waitFor(() => expect(screen.getByLabelText('훈련')).toBeTruthy());
};

/** 같은 이름의 prop들을 렌더 시점별로 모아 신원이 하나뿐인지 본다. */
const identities = (batch: Captured[], key: string) => new Set(batch.map((p) => p[key]));

describe('memo — 목록 아이템에 넘어가는 콜백의 신원', () => {
  it('콤보를 켜고 꺼도 ComboCard의 콜백은 그대로다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    await act(async () => {});

    const before = [...mockCardProps];
    expect(before.length).toBeGreaterThan(0);
    mockCardProps.length = 0;

    // 첫 카드를 훈련에서 뺀다 — 목록 상태가 바뀌는 가장 흔한 조작
    fireEvent.press(screen.getAllByLabelText('훈련에서 빼기')[0]!);
    await act(async () => {});

    const after = [...mockCardProps];
    expect(after.length).toBeGreaterThan(0);

    for (const key of ['onToggle', 'onToggleMenu', 'onPreview', 'onEdit', 'onRemove', 'onMeasure']) {
      const ids = identities([...before, ...after], key);
      expect({ key, count: ids.size }).toEqual({ key, count: 1 });
    }
  });

  it('호출어를 고쳐도 WordRow의 콜백은 그대로다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));
    await act(async () => {});

    const before = [...mockRowProps];
    expect(before.length).toBeGreaterThan(0);
    mockRowProps.length = 0;

    // 한 줄을 펼치고 이름을 고친다
    fireEvent.press(screen.getByText('잽'));
    await act(async () => {});
    fireEvent.changeText(screen.getByPlaceholderText('잽'), '원');
    await act(async () => {});

    const after = [...mockRowProps];
    expect(after.length).toBeGreaterThan(0);

    for (const key of [
      'onOpen',
      'onClose',
      'onChangeName',
      'onChangeBeat',
      'onReset',
      'onDelete',
      'onPreview',
    ]) {
      const ids = identities([...before, ...after], key);
      expect({ key, count: ids.size }).toEqual({ key, count: 1 });
    }
  });

  it('한 줄에서 타자를 쳐도 다른 줄의 prop은 바뀌지 않는다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));
    await act(async () => {});
    fireEvent.press(screen.getByText('잽'));
    await act(async () => {});

    mockRowProps.length = 0;
    fireEvent.changeText(screen.getByPlaceholderText('잽'), '원투');
    await act(async () => {});

    // 고친 줄(잽)만 name이 달라지고 나머지는 그대로여야 한다
    const changed = mockRowProps.filter((p) => (p['move'] as { id: string }).id === 'jab');
    const others = mockRowProps.filter((p) => (p['move'] as { id: string }).id !== 'jab');
    expect(changed.some((p) => p['name'] === '원투')).toBe(true);
    expect(others.every((p) => p['name'] !== '원투')).toBe(true);
  });
});
