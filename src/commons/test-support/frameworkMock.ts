/**
 * 앱스인토스 프레임워크 대역.
 *
 * `useWaitForReturnNavigator`는 화면이 다시 보일 때까지 기다렸다가 풀린다.
 * 테스트에는 스택이 없어 그 순간이 영영 안 오므로, 이동만 받아 두고 바로 풀어 준다.
 *
 * **돌려주는 함수는 한 벌로 고정한다.** 이걸 의존성으로 쓰는 콜백의 신원이 매 렌더 깨지면
 * memo 테스트가 엉뚱한 이유로 실패한다.
 */
export const openScreenMock = jest.fn(() => Promise.resolve());

export function useWaitForReturnNavigator() {
  return openScreenMock;
}
