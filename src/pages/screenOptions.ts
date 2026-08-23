import type { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
import { C } from '../commons/constants';

/**
 * 모든 라우트가 함께 쓰는 화면 옵션.
 *
 * 전환 애니메이션이 도는 동안 보이는 건 우리 뷰가 아니라 네이티브 화면 컨테이너다.
 * 그래니트 기본값이 흰색(`DEFAULT_BACKGROUND_COLOR = '#ffffff'`)이라
 * 검은 화면끼리 오가는데 사이에 흰 판이 한 번 번쩍인다.
 *
 * **새 라우트를 만들면 이걸 같이 넘겨라.**
 */
export const SCREEN: NativeStackNavigationOptions = {
  contentStyle: { backgroundColor: C.bg },
};
