import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ShadowCoach from '../ShadowCoach';
import Layout from '../../pages/_layout';
import { dispatchMaterial, resetMaterial } from '../ShadowCoach/hooks';
import { resetStorage } from '../../commons/test-support/storageMock';
import { TOAST_MS } from '../../commons/constants';

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

// 소리 엔진은 화면 밖 웹뷰다. 렌더만 되면 된다.
jest.mock('@granite-js/native/react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, WebView: View };
});

// 화면 잠금과 햅틱은 네이티브다. 이식이 호출만 하면 된다.
jest.mock('@apps-in-toss/native-modules', () => ({
  setScreenAwakeMode: jest.fn(() => Promise.resolve({ enabled: true })),
  generateHapticFeedback: jest.fn(),
  /* 저장소는 토스 것을 쓴다. 미니앱을 껐다 켜도 남아야 하는 자리라 AsyncStorage로는 안 된다. */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Storage: require('../../commons/test-support/storageMock').Storage,
}));

beforeEach(() => {
  // 저장소도 자료도 파일 안에서 공유된다. 테스트마다 초기 상태에서 시작한다.
  resetStorage();
  resetMaterial();
});

/*
 * 마이크는 대역에서 영영 안 켜진다 — 웹뷰가 대역이라 recordEvent가 올라올 길이 없다.
 * 그래서 콤보는 자료에 직접 심는다. 녹음이 실제로 도는 순서는 comboDraft 순수 테스트가 본다.
 */
const seed = (...names: string[]) => {
  act(() => {
    dispatchMaterial({ type: 'hydrate', value: {} });
    names.forEach((name, i) =>
      dispatchMaterial({
        type: 'addCombo',
        name,
        clip: { data: `clip-${i}`, ms: 2000 + i * 100, head: 0.2, tail: 1.6 },
      })
    );
  });
};

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
  it('두 탭을 오간다', async () => {
    await setup();
    expect(screen.getByText('시작')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('콤보'));
    expect(screen.getByText('눌러서 녹음')).toBeTruthy();

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

describe('empty — 첫 실행은 빈 목록이다', () => {
  it('초기 콤보가 없고 안내 한 줄만 있다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    // 기획서 5장 — 초기 콤보도 없다. 첫 실행은 빈 목록이다.
    expect(screen.getByText('눌러서 첫 콤보를 녹음해')).toBeTruthy();
    expect(screen.queryByText(/콤보 \d+개/)).toBeNull();
  });
});

describe('record — 무대의 상태', () => {
  it('누르면 녹음 중으로 가고, 대역이라 마이크는 안 켜진다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));

    fireEvent.press(screen.getByLabelText('녹음 무대'));
    await act(async () => {});

    // 대역 웹뷰는 recStarted를 못 보낸다 — 켜는 중에 머문다
    expect(screen.getByText('마이크 켜는 중…')).toBeTruthy();
    expect(screen.getByText('완료')).toBeTruthy();
  });

  it('완료하면 이름 단계로 가고 저장 버튼이 뜬다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByLabelText('녹음 무대'));
    await act(async () => {});
    fireEvent.press(screen.getByText('완료'));
    await act(async () => {});

    expect(screen.getByText('콤보 저장')).toBeTruthy();
    expect(screen.getByPlaceholderText(/이름/)).toBeTruthy();
  });
});

describe('name — 죽은 버튼 금지', () => {
  it('이름이 비면 이유를 말하고, 녹음이 없으면 그것도 말한다', async () => {
    await setup();
    fireEvent.press(screen.getByLabelText('콤보'));
    fireEvent.press(screen.getByLabelText('녹음 무대'));
    await act(async () => {});
    fireEvent.press(screen.getByText('완료'));
    await act(async () => {});

    // 이름이 먼저다 — 기획서 4.4는 이름을 필수로 못 박았다
    fireEvent.press(screen.getByText('콤보 저장'));
    await waitFor(() => expect(screen.getByText('이름을 적어줘.')).toBeTruthy());

    // 이름을 적어도 대역에는 녹음이 없다
    fireEvent.changeText(screen.getByPlaceholderText(/이름/), '원투');
    fireEvent.press(screen.getByText('콤보 저장'));
    await waitFor(() => expect(screen.getByText(/녹음이 없어/)).toBeTruthy());
  });
});

/*
 * 카드 메뉴에서 올라오는 두 길. 기획서 4.4가 둘을 명확히 갈라 놨다 —
 * 이름 고치기는 녹음을 그대로 두고, 다시 녹음은 이름을 그대로 둔다.
 * 대역에는 마이크가 없어서 "취소하면 원래 녹음이 남는다"가 여기서만 확인된다.
 */
describe('edit — 이름 고치기와 다시 녹음', () => {
  it('이름 고치기는 이름이 채워진 채 무대로 올라오고, 저장하면 이름만 바뀐다', async () => {
    await setup();
    seed('원투');
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());
    // 심은 녹음은 2000ms다. 이름을 고쳐도 이 길이가 그대로여야 한다.
    expect(screen.getByText('2.0초')).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('이름 고치기'));
    await act(async () => {});

    const input = screen.getByPlaceholderText(/이름/);
    expect(input.props.value).toBe('원투');

    fireEvent.changeText(input, '원투쓰리');
    fireEvent.press(screen.getByText('수정 저장'));
    await waitFor(() => expect(screen.getByText('원투쓰리')).toBeTruthy());

    // 녹음은 건드리지 않았다 — 목소리는 여전히 맞는 말을 하고 있다
    expect(screen.getByText('2.0초')).toBeTruthy();
    expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy();
  });

  it('다시 녹음을 취소하면 이름 단계로 돌아오고 원래 녹음이 남는다', async () => {
    await setup();
    seed('원투');
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());

    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('다시 녹음'));
    await act(async () => {});
    // 곧바로 녹음이 시작된다 — 이름은 그대로 두고 녹음만 새로
    expect(screen.getByText('마이크 켜는 중…')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('녹음 취소'));
    await act(async () => {});

    // 이름 단계로 돌아온다. 저장하면 원래 녹음이 그대로 남는다.
    expect(screen.getByPlaceholderText(/이름/).props.value).toBe('원투');
    fireEvent.press(screen.getByText('수정 저장'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());
    expect(screen.getByText('2.0초')).toBeTruthy();
  });
});

describe('undo — 삭제와 되돌리기', () => {
  it('확인 없이 지우고 되돌리기 토스트를 띄운다', async () => {
    await setup();
    seed('원투', '로우킥');
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 2개 · 2개 사용')).toBeTruthy());

    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('삭제'));

    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());
    expect(screen.getByText('되돌리기')).toBeTruthy();

    fireEvent.press(screen.getByText('되돌리기'));
    await waitFor(() => expect(screen.getByText('콤보 2개 · 2개 사용')).toBeTruthy());
  });

  it('지운 것의 이름으로 알린다', async () => {
    await setup();
    seed('원투');
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());

    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('삭제'));
    await waitFor(() => expect(screen.getByText('원투 지웠어')).toBeTruthy());
  });

  it('탭을 옮기면 토스트를 정리한다', async () => {
    await setup();
    seed('원투');
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());
    fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
    fireEvent.press(screen.getByText('삭제'));
    await waitFor(() => expect(screen.getByText('되돌리기')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('훈련'));
    expect(screen.queryByText('되돌리기')).toBeNull();
  });

  // 되돌릴 기회의 시계는 토스트가 들고 있다. 여기서 끊기면 되돌리기가 영영 안 사라진다.
  it('정해진 시간이 지나면 스스로 접는다', async () => {
    jest.useFakeTimers();
    await setup();
    seed('원투', '로우킥');
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
    expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy();
    jest.useRealTimers();
  });

  /*
   * 실기기에서 잡힌 것 — 첫 번째만 접히고 두 번째부터 영영 남아 있었다.
   * TDS 토스트는 시계를 마운트 때 한 번만 걸어서, 트리에 계속 떠 있으면 다시 감기지 않는다.
   * 화면이 되돌리기 번호를 key로 써서 갈아 끼우는 것으로 푼다. 그 갈아 끼움이 여기서 깨진다.
   */
  it('두 번째 삭제도 스스로 접는다', async () => {
    jest.useFakeTimers();
    await setup();
    seed('원투', '로우킥', '훅');
    fireEvent.press(screen.getByLabelText('콤보'));

    const deleteFirst = () => {
      fireEvent.press(screen.getAllByLabelText('더보기')[0]!);
      fireEvent.press(screen.getByText('삭제'));
    };

    deleteFirst();
    await waitFor(() => expect(screen.getByText('되돌리기')).toBeTruthy());
    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS + 100);
    });
    expect(screen.queryByText('되돌리기')).toBeNull();

    deleteFirst();
    await waitFor(() => expect(screen.getByText('되돌리기')).toBeTruthy());
    await act(async () => {
      jest.advanceTimersByTime(TOAST_MS + 100);
    });
    expect(screen.queryByText('되돌리기')).toBeNull();

    jest.useRealTimers();
  });
});

/*
 * 슬라이더는 자료에 바로 안 넣고 손을 멈추기를 기다린다(화면 전체가 다시 그려지는 걸 막으려고).
 * 그 사이에 시트를 닫으면 미뤄 둔 마지막 한 칸이 날아갈 자리라, 사라질 때 넣고 간다.
 */
describe('settings — 미뤄 둔 슬라이더 값', () => {
  it('끌자마자 시트를 닫아도 마지막 값이 남는다', async () => {
    jest.useFakeTimers();
    await setup();
    fireEvent.press(screen.getByLabelText('설정'));
    await act(async () => {});

    fireEvent(screen.getByLabelText('템포'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(screen.getByText('1.05배')).toBeTruthy();

    // 미루는 시간이 차기 전에 닫는다
    fireEvent.press(screen.getByText('완료'));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    fireEvent.press(screen.getByLabelText('설정'));
    await act(async () => {});
    expect(screen.getByText('1.05배')).toBeTruthy();

    jest.useRealTimers();
  });
});

describe('시작 — 죽은 버튼 금지', () => {
  it('콤보가 하나도 없으면 왜 안 되는지 말한다', async () => {
    await setup();
    fireEvent.press(screen.getByText('시작'));
    await waitFor(() => expect(screen.getByText(/저장된 콤보가 없어/)).toBeTruthy());
  });

  it('하나도 체크되지 않으면 저장된 것 전부를 쓴다', async () => {
    await setup();
    seed('원투');
    fireEvent.press(screen.getByLabelText('콤보'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 1개 사용')).toBeTruthy());
    fireEvent.press(screen.getByText('전체 해제'));
    await waitFor(() => expect(screen.getByText('콤보 1개 · 0개 사용')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('훈련'));
    fireEvent.press(screen.getByText('시작'));

    // 선택된 콤보가 없으면 저장된 콤보 전부를 쓴다 — 관대한 폴백이라 그냥 시작된다(기획서 7장)
    await waitFor(() => expect(screen.getByText('준비')).toBeTruthy());
  });
});
