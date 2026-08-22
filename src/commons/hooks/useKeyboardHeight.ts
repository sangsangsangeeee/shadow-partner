import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * 키보드가 가린 높이. 안 떠 있으면 0.
 *
 * iOS는 애니메이션이 시작될 때(will), Android는 다 뜬 뒤(did) 알려준다.
 * iOS에서 did를 쓰면 버튼이 키보드보다 늦게 올라와 한 번 튄다.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
