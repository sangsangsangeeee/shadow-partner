import { Platform, useWindowDimensions } from 'react-native';
import { SHEET_RATIO } from '../constants';
import { useKeyboardHeight } from './useKeyboardHeight';

/** TDS 시트가 키보드 위에 남기는 여유. Container의 `defaultSafeAreaBottom`과 같은 값이어야 한다. */
const LIFT_GAP = 10;

/**
 * 시트가 비켜야 하는 위쪽 자리.
 *
 * 토스 미니앱 헤더(상태바 + 뒤로·닫기 바)가 앱 위에 그려지고, 높이를 물어볼 길이가 없다.
 * `useSafeAreaInsets().top`으로 계산했더니 실기기에서 여전히 헤더 밑으로 들어갔다 —
 * 이 환경의 top은 헤더 높이를 알려주지 않는다. 화면에서 잰 헤더 바닥(약 110)에 여유를 얹어 상수로 둔다.
 * 넉넉히 잡아 시트가 낮아지는 쪽이, 잘려서 핸들과 헤더를 잃는 쪽보다 싸다.
 */
const TOP_RESERVE = 120;

/**
 * 키보드가 시트를 밀어 올리는가.
 *
 * TDS는 iOS의 will 이벤트와 신아키텍처 안드로이드의 did 이벤트만 듣는다
 * (`utils/getKeyboardEventNames`). 구아키텍처 안드로이드에서는 시트가 제자리에 있으므로
 * 거기서 키를 줄이면 보이는 부분만 좁아진다.
 */
function liftsWithKeyboard(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS !== 'android') return false;
  const g = globalThis as unknown as {
    RN$Bridgeless?: boolean;
    nativeFabricUIManager?: unknown;
    __turboModuleProxy?: unknown;
  };
  return g.RN$Bridgeless === true || g.nativeFabricUIManager != null || g.__turboModuleProxy != null;
}

/**
 * 키 고정 바텀시트의 높이.
 *
 * TDS 컨테이너는 키보드가 오르면 시트를 키보드 높이만큼 위로 민다. 내용에 맞춰 늘어나는 시트라면
 * 그게 맞지만, 키를 고정한 시트는 밀린 만큼 위가 화면 밖으로 나간다 — 핸들과 헤더가 먼저 잘린다.
 * 그래서 키보드가 올라온 동안만 키보드 위에 남는 자리로 줄인다. 내려가면 다시 화면의 2/3다.
 */
export function useSheetHeight(): number {
  const { height } = useWindowDimensions();
  const kb = useKeyboardHeight();
  const lift = kb > 0 && liftsWithKeyboard() ? kb + LIFT_GAP : 0;

  return Math.round(Math.min(height * SHEET_RATIO, height - lift - TOP_RESERVE));
}
