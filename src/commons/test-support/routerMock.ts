/**
 * 라우팅 대역.
 *
 * 하위 화면이 전부 시트로 내려와서 지금 화면 코드는 `useNavigation`을 부르지 않는다.
 * 그래도 이 대역이 필요한 건 `_layout`과 `createRoute`가 이 모듈에 닿기 때문이다 —
 * NavigationContainer를 세우는 대신 모듈째 갈아끼워 화면이 렌더되게 한다.
 *
 * **navigation 객체는 한 벌로 고정한다.** 렌더마다 새로 만들면 이걸 의존성으로 쓰는
 * 콜백의 신원이 매번 깨져 memo 테스트가 엉뚱한 이유로 실패한다.
 * 다시 라우트를 파게 되면 그때 이 계약이 필요해진다.
 */
export const navigateMock = jest.fn();
export const goBackMock = jest.fn();

const navigation = {
  navigate: navigateMock,
  goBack: goBackMock,
  canGoBack: () => false,
};

export function useNavigation() {
  return navigation;
}

export function createRoute(_path: string, options: Record<string, unknown>) {
  return options;
}
