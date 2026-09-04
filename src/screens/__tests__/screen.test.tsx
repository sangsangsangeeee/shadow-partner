import React from 'react';
import { Keyboard, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ShadowCoach from '../ShadowCoach';
import Layout from '../../pages/_layout';
import { resetMaterial } from '../ShadowCoach/hooks';
import { fireSwipe, resetGestureMock, swipeAreaCount } from '../../commons/test-support/gestureMock';
import { CHIP_TRAY_H, TOAST_MS } from '../../commons/constants';

/** SwipeArea가 넘김으로 인정하는 거리. 여기가 바뀌면 이 테스트도 같이 움직여야 한다. */
const COMMIT = 60;

/*
 * @granite-js/native/* 는 실제 패키지를 그대로 재수출하는 얇은 껍데기다.
 * Metro에서는 제대로 풀리지만 jest 프리셋에서는 자기 자신으로 되돌아와 무한 재귀에 빠진다.
 * 테스트에서 확인할 것은 화면 동작이므로 경계에서 갈아끼운다.
 */
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
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => React2.createElement(React2.Fragment, null, children),
    useSafeAreaInsets: () => insets,
    initialWindowMetrics: { frame: { x: 0, y: 0, width: 390, height: 844 }, insets },
  };
});

jest.mock('@granite-js/native/@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).__sbcStore = store;
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

// 소리 엔진은 화면 밖 웹뷰다. 렌더만 되면 된다.
jest.mock('@granite-js/native/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, WebView: View };
});

// 화면 잠금과 햅틱은 네이티브다. 이식이 호출만 하면 된다.
jest.mock('@apps-in-toss/native-modules', () => ({
  setScreenAwakeMode: jest.fn(() => Promise.resolve({ enabled: true })),
  generateHapticFeedback: jest.fn(),
}));

beforeEach(() => {
  // 저장소도 자료도 파일 안에서 공유된다. 테스트마다 초기 상태에서 시작한다.
  const store = (globalThis as Record<string, unknown>).__sbcStore as Map<string, string> | undefined;
  store?.clear();
  resetMaterial();
  // 제스처 대역도 트리 밖에 산다. 안 비우면 앞 테스트의 스와이프 영역이 남는다.
  resetGestureMock();
});

const setup = async () => {
  const view = render(
      <Layout>
        <ShadowCoach />
      </Layout>
    );
  // 저장소를 읽고 나면 loaded가 켜진다. 탭바는 어느 탭에서도 서 있어서 렌더 완료 신호로 삼는다.
  await waitFor(() => expect(screen.getByLabelText('훈련')).toBeTruthy());
  return view;
};

describe('nav — 하단 탭 전환', () => {
  it('세 탭을 오간다', async () => {
    await setup();
    expect(screen.getByText('시작')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('콤보'));
    expect(screen.getByText('목록에서 고르기')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('호출어'));
    expect(screen.getByText('번호로 일괄 변경')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('훈련'));
    expect(screen.getByText('시작')).toBeTruthy();
  });
});

describe('훈련 화면은 스크롤 없이 다 보인다', () => {
  it('시작 버튼과 요약 알약이 한 화면에 같이 있다', async () => {
    await setup();
    expect(screen.getByText('시작')).toBeTruthy();
    // 요약 알약은 시작 버튼보다 아래다. 스크롤 화면이면 밀려서 안 보이던 자리.
    expect(screen.getByText('랜덤 · 3라운드 · 3:00 / 1:00')).toBeTruthy();
  });

  it('훈련 탭에는 스크롤 뷰가 없다', async () => {
    const { UNSAFE_queryAllByType } = await setup();
    const { ScrollView } = jest.requireActual('react-native');
    expect(UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
  });
});

describe('소리 엔진 웹뷰가 레이아웃을 먹지 않는다', () => {
  it('흐름 밖(absolute)으로 빠져 있다', async () => {
    await setup();
    // WebView는 자기 자신을 flex:1 컨테이너로 감싼다. 흐름에 남으면
    // 형제인 스크롤 뷰와 화면을 반씩 나눠 갖는다. 실제로 그렇게 깨졌었다.
    const host = screen.getByTestId('sc-voice-engine');
    const flat = JSON.stringify(host.props.style);
    expect(flat).toContain('"position":"absolute"');
    expect(flat).not.toContain('"flex":1');
  });
});

describe('fabshow — 저장 버튼 노출 조건', () => {
  it('입력창에 글자가 있을 때만 뜬다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    expect(screen.queryByText('콤보 저장')).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '엘보');
    // 인식 못 해도 버튼은 있어야 이유를 물을 수 있다. 기획서 4.4
    expect(screen.getByText('콤보 저장')).toBeTruthy();
  });
});

describe('fab — 저장 안내', () => {
  it('인식 실패와 정상 저장이 다르게 안내된다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));

    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '엘보');
    fireEvent.press(screen.getByText('콤보 저장'));
    expect(screen.getByText(/적은 말을 못 알아들었어/)).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '잽 하이킥');
    fireEvent.press(screen.getByText('콤보 저장'));
    // 새 콤보는 목록 맨 위로
    await waitFor(() => expect(screen.getByText('콤보 5개 · 5개 사용')).toBeTruthy());
  });
});

describe('chip — 칩 삭제와 텍스트 역동기화', () => {
  it('칩을 지우면 입력창이 다시 써지고 미인식은 보존된다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    const input = screen.getByPlaceholderText(/잽/);

    fireEvent.changeText(input, '1-2-3 엘보');
    // 축약이 풀린다
    fireEvent.press(screen.getByLabelText('잽 지우기'));

    await waitFor(() => {
      expect(screen.getByLabelText('스트레이트 지우기')).toBeTruthy();
      expect(screen.getByLabelText('레프트훅 지우기')).toBeTruthy();
      // 사용자가 친 말은 사라지지 않는다
      expect(screen.getByText(/못 알아들음: 엘보/)).toBeTruthy();
    });
  });
});

describe('dup — 중복 차단', () => {
  it('동작 순서가 완전히 같으면 저장을 막는다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    // SEED에 있는 잽 스트레이트 로우킥
    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '잽 스트레이트 로우킥');
    await waitFor(() => expect(screen.getByText('이미 저장된 콤보야.')).toBeTruthy());
    expect(screen.getByText('목록에서 보기')).toBeTruthy();
  });

  it('순서가 다르면 다른 훈련이라 막지 않는다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.changeText(screen.getByPlaceholderText(/잽/), '로우킥 스트레이트 잽');
    await waitFor(() => expect(screen.queryByText('이미 저장된 콤보야.')).toBeNull());
  });
});

describe('undo — 삭제와 되돌리기', () => {
  it('확인 없이 지우고 되돌리기 토스트를 띄운다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    expect(screen.getByText('콤보 4개 · 4개 사용')).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('삭제'));

    await waitFor(() => expect(screen.getByText('콤보 3개 · 3개 사용')).toBeTruthy());
    expect(screen.getByText('되돌리기')).toBeTruthy();

    fireEvent.press(screen.getByText('되돌리기'));
    await waitFor(() => expect(screen.getByText('콤보 4개 · 4개 사용')).toBeTruthy());
  });

  it('탭을 옮기면 토스트를 정리한다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('삭제'));
    await waitFor(() => expect(screen.getByText('되돌리기')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('호출어'));
    expect(screen.queryByText('되돌리기')).toBeNull();
  });

  // 되돌릴 기회의 시계는 토스트가 들고 있다. 여기서 끊기면 되돌리기가 영영 안 사라진다.
  it('정해진 시간이 지나면 스스로 접는다', async () => {
    jest.useFakeTimers();
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('삭제'));
    await waitFor(() => expect(screen.getByText('되돌리기')).toBeTruthy());

    // 시간이 차기 전에 걷히면 되돌릴 기회를 뺏는 것이다. 양쪽을 다 본다.
    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS - 100);
    });
    expect(screen.getByText('되돌리기')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByText('되돌리기')).toBeNull();

    // 접혀도 지운 건 지워진 채로 남는다
    expect(screen.getByText('콤보 3개 · 3개 사용')).toBeTruthy();
    jest.useRealTimers();
  });
});

describe('words — 호출어 한 줄 편집', () => {
  it('평소엔 글자만 보이고, 누르면 그 줄만 편집으로 바뀐다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));

    // 입력 상자 0개
    expect(screen.queryAllByPlaceholderText('잽')).toHaveLength(0);

    fireEvent.press(screen.getByText('잽'));
    await waitFor(() => expect(screen.getByPlaceholderText('잽')).toBeTruthy());
    // 한 줄만 열린다
    expect(screen.queryAllByPlaceholderText('스트레이트')).toHaveLength(0);
  });

  it('분류 탭으로 걸러진다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));
    expect(screen.getByText('잽')).toBeTruthy();

    fireEvent.press(screen.getByText('킥'));
    await waitFor(() => expect(screen.queryByText('잽')).toBeNull());
    expect(screen.getByText('로우킥')).toBeTruthy();
  });

  it('쓸어 넘기면 옆 분류로 간다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));
    expect(screen.getByText('잽')).toBeTruthy();

    // 왼쪽으로 쓸면 오른쪽 것(펀치 → 킥)
    act(() => fireSwipe(-COMMIT));
    await waitFor(() => expect(screen.queryByText('잽')).toBeNull());
    expect(screen.getByText('로우킥')).toBeTruthy();

    // 오른쪽으로 쓸면 되돌아온다
    act(() => fireSwipe(COMMIT));
    await waitFor(() => expect(screen.getByText('잽')).toBeTruthy());
  });

  it('끝에서는 감기지 않는다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));

    // 첫 분류에서 오른쪽으로 쓸어도 마지막(풋워크)으로 건너뛰지 않는다
    act(() => fireSwipe(COMMIT));
    await waitFor(() => expect(screen.getByText('잽')).toBeTruthy());
  });

  it('살짝 스친 것으로는 분류가 안 바뀐다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));

    act(() => fireSwipe(-(COMMIT - 1)));
    await waitFor(() => expect(screen.getByText('잽')).toBeTruthy());
  });

  /*
   * 편집칸은 자동으로 포커스를 받는다. 스크롤이 따라가지 않으면 포커스는 키보드 아래에 있다.
   * 두 번 겨누는 게 핵심이다 — 펼치는 순간에는 아래 여백에 키보드가 없어서 마지막 줄이
   * 굴릴 수 있는 끝에 걸리고, 여백이 늘어난 뒤에야 목표까지 간다.
   */
  it('줄을 펼치면 그 줄로 굴려 가고, 키보드가 올라오면 다시 겨눈다', async () => {
    const { ScrollView } = jest.requireActual('react-native');
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const heard: Record<string, ((e: unknown) => void)[]> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((evt: string, cb: (e: unknown) => void) => {
      (heard[evt] ??= []).push(cb);
      return { remove: () => {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    try {
      await setup();
      fireEvent.press(screen.getByLabelText('호출어'));

      /* jest에는 레이아웃 엔진이 없다. 자리를 아는 것이 전제인 동작이라 직접 재 준다. */
      fireEvent(screen.getByText('잽'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 400, width: 350, height: 57 } },
      });

      fireEvent.press(screen.getByText('잽'));
      await waitFor(() => expect(screen.getByPlaceholderText('잽')).toBeTruthy());
      // 줄 위치 400 − 위쪽 여백 100. 목록은 0에 있다.
      expect(scrollTo).toHaveBeenCalledWith({ y: 300, animated: true });

      const before = scrollTo.mock.calls.length;
      act(() => {
        heard.keyboardWillShow?.forEach((cb) => cb({ endCoordinates: { height: 336 } }));
      });
      await waitFor(() => expect(scrollTo.mock.calls.length).toBeGreaterThan(before));

      // 키보드를 내린 사람을 다시 끌고 가지는 않는다.
      const after = scrollTo.mock.calls.length;
      act(() => {
        heard.keyboardWillHide?.forEach((cb) => cb({}));
      });
      await act(async () => {});
      expect(scrollTo.mock.calls.length).toBe(after);
    } finally {
      spy.mockRestore();
      scrollTo.mockRestore();
    }
  });

  /*
   * FAB이 키보드 위에 서면 편집칸의 들어보기·확인 단추를 정확히 덮는다.
   * 실기기에서 그렇게 막혔고, 자리 계산이 아니라 "타자 중에는 걷어낸다"는 규칙이 그걸 푼다.
   * Keyboard에는 emit이 없어서 등록된 청취자를 붙잡아 직접 부른다(화면과 시트 셋이 함께 듣는다).
   */
  it('타자 중에는 동작 추가 FAB을 걷어낸다', async () => {
    const heard: Record<string, ((e: unknown) => void)[]> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((evt: string, cb: (e: unknown) => void) => {
      (heard[evt] ??= []).push(cb);
      return { remove: () => {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    try {
      await setup();
      fireEvent.press(screen.getByLabelText('호출어'));
      expect(screen.getByLabelText('동작 추가')).toBeTruthy();

      act(() => {
        heard.keyboardWillShow?.forEach((cb) => cb({ endCoordinates: { height: 336 } }));
      });
      await waitFor(() => expect(screen.queryByLabelText('동작 추가')).toBeNull());

      act(() => {
        heard.keyboardWillHide?.forEach((cb) => cb({}));
      });
      await waitFor(() => expect(screen.getByLabelText('동작 추가')).toBeTruthy());
    } finally {
      spy.mockRestore();
    }
  });

  it('번호로 일괄 변경하면 호출어가 번호가 된다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('호출어'));
    fireEvent.press(screen.getByText('번호로 일괄 변경'));
    await waitFor(() => expect(screen.getByText('원')).toBeTruthy());
    expect(screen.getByText('투')).toBeTruthy();
  });
});

describe('picker — 탭으로 콤보 쌓기', () => {
  it('동작을 누르면 칩이 쌓이고 분류를 바꿔도 유지된다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByText('목록에서 고르기'));

    await waitFor(() => expect(screen.getByText('동작 고르기')).toBeTruthy());
    expect(screen.getByText('동작을 눌러서 순서대로 쌓아봐.')).toBeTruthy();

    fireEvent.press(screen.getByText('바디'));
    // 콤보 탭의 칩과 피커 트레이의 칩이 같은 것을 가리킨다
    await waitFor(() => expect(screen.getAllByLabelText('바디 지우기').length).toBeGreaterThan(0));

    fireEvent.press(screen.getByText('킥'));
    fireEvent.press(screen.getByText('하이킥'));
    await waitFor(() => expect(screen.getAllByLabelText('하이킥 지우기').length).toBeGreaterThan(0));
    // 앞서 쌓은 것도 남아 있다
    expect(screen.getAllByLabelText('바디 지우기').length).toBeGreaterThan(0);
  });

  it('격자를 쓸어 넘기면 옆 분류로 간다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByText('목록에서 고르기'));
    await waitFor(() => expect(screen.getByText('동작 고르기')).toBeTruthy());

    // 콤보 탭에는 스와이프 영역이 없다. 시트가 열려야 처음 생긴다.
    expect(swipeAreaCount()).toBe(1);

    act(() => fireSwipe(-COMMIT));
    await waitFor(() => expect(screen.getByText('로우킥')).toBeTruthy());
    expect(screen.queryByText('바디')).toBeNull();
  });

  /*
   * 칩 상자가 내용에 따라 자라면 아래 격자가 통째로 밀린다.
   * 누르려던 자리가 손 밑에서 사라지는 것이라, 키는 칩 개수와 무관해야 한다.
   */
  it('칩이 쌓여도 칩 상자 높이가 그대로다', async () => {
    const { UNSAFE_getAllByType } = await setup();
    const { ScrollView } = jest.requireActual('react-native');
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByText('목록에서 고르기'));
    await waitFor(() => expect(screen.getByText('동작 고르기')).toBeTruthy());

    /* 콤보 탭 본문도 스크롤이라 순서로 짚지 않는다. 키가 걸린 층이 칩 상자다. */
    const trayHeight = () => {
      const heights = UNSAFE_getAllByType(ScrollView)
        .map((n: { props: { style?: StyleProp<ViewStyle> } }) => StyleSheet.flatten(n.props.style)?.height)
        .filter((h): h is number => typeof h === 'number');
      expect(heights).toHaveLength(1);
      return heights[0]!;
    };

    const empty = trayHeight();
    expect(empty).toBe(CHIP_TRAY_H);

    fireEvent.press(screen.getByText('바디'));
    await waitFor(() => expect(screen.getAllByLabelText('바디 지우기').length).toBeGreaterThan(0));
    expect(trayHeight()).toBe(empty);

    // 한 줄을 넘길 만큼 쌓아도 그대로다. 넘치면 상자 안에서 스크롤된다.
    for (const name of ['잽', '스트레이트', '레프트훅', '라이트훅', '레프트어퍼']) {
      fireEvent.press(screen.getByText(name));
    }
    await waitFor(() => expect(screen.getAllByLabelText('레프트어퍼 지우기').length).toBeGreaterThan(0));
    expect(trayHeight()).toBe(empty);
  });

  it('닫았다 다시 열면 첫 분류부터 보여준다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByText('목록에서 고르기'));
    await waitFor(() => expect(screen.getByText('동작 고르기')).toBeTruthy());

    act(() => fireSwipe(-COMMIT));
    await waitFor(() => expect(screen.getByText('로우킥')).toBeTruthy());

    // 완료는 하나라도 쌓아야 눌린다. 시트를 닫는 게 목적이라 아무거나 하나 고른다.
    fireEvent.press(screen.getByText('로우킥'));
    fireEvent.press(screen.getByText('완료'));
    await waitFor(() => expect(screen.queryByText('동작 고르기')).toBeNull());
    fireEvent.press(screen.getByText('목록에서 고르기'));

    await waitFor(() => expect(screen.getByText('바디')).toBeTruthy());
  });
});

describe('시작 — 죽은 버튼 금지', () => {
  it('콤보가 하나도 체크되지 않으면 왜 안 되는지 말한다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByText('전체 해제'));
    await waitFor(() => expect(screen.getByText('콤보 4개 · 0개 사용')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('훈련'));
    fireEvent.press(screen.getByText('시작'));

    // 선택된 콤보가 없으면 저장된 콤보 전부를 쓴다 — 관대한 폴백이라 그냥 시작된다
    await waitFor(() => expect(screen.getByText('준비')).toBeTruthy());
  });
});
