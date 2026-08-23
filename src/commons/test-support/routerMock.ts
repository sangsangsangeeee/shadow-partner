/**
 * 라우팅 대역.
 *
 * 화면 전환 자체는 테스트에서 확인할 수 없다. NavigationContainer를 세우는 대신
 * 훅만 갈아끼워 화면이 렌더되게 하고, 이동은 불렸는지만 남긴다.
 *
 * **navigation 객체는 한 벌로 고정한다.** 렌더마다 새로 만들면 이걸 의존성으로 쓰는
 * 콜백의 신원이 매번 깨져 memo 테스트가 엉뚱한 이유로 실패한다.
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
