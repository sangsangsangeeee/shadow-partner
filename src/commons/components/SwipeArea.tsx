import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from '@granite-js/native/react-native-gesture-handler';

type Props = {
  /** 오른쪽으로 쓸었다 — 왼쪽 것으로 간다. */
  onRight: () => void;
  /** 왼쪽으로 쓸었다 — 오른쪽 것으로 간다. */
  onLeft: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** 이만큼 가로로 가야 스와이프로 인정한다. 세로 스크롤이 먼저 가져가라고 넉넉히 잡았다. */
const ACTIVATE_X = 20;
/** 세로가 이만큼 먼저 움직이면 스와이프를 포기한다. */
const FAIL_Y = 12;
/** 손을 뗐을 때 이만큼은 갔어야 넘긴다. 스치는 손짓으로 분류가 바뀌면 안 된다. */
const COMMIT_X = 60;

/**
 * 가로로 쓸어서 옆으로 넘기는 영역.
 *
 * 분류를 모른다 — 왼쪽/오른쪽만 알린다. 무엇이 옆에 있는지는 쓰는 쪽이 정한다.
 *
 * 두 곳과 겹치지 않아야 해서 임계값이 셋이다:
 * - TDS 바텀시트의 끌어서 닫기는 `activateAfterLongPress(200)`이라 시간축에서 갈린다.
 *   즉시 시작하는 스와이프와 붙잡고 끄는 손짓은 다른 동작이다.
 * - 세로 스크롤과는 `failOffsetY`로 갈린다. 세로가 먼저 움직이면 여기가 물러난다.
 *
 * `runOnJS`가 필요하다 — reanimated 워크릿이 아니라 평범한 JS 콜백을 부른다.
 */
export function SwipeArea({ onRight, onLeft, children, style }: Props) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ACTIVATE_X, ACTIVATE_X])
        .failOffsetY([-FAIL_Y, FAIL_Y])
        .onEnd((e: { translationX: number }) => {
          if (e.translationX >= COMMIT_X) onRight();
          else if (e.translationX <= -COMMIT_X) onLeft();
        })
        .runOnJS(true),
    [onRight, onLeft]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={style}>{children}</View>
    </GestureDetector>
  );
}
