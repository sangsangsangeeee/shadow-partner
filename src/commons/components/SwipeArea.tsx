import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, Easing, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from '@granite-js/native/react-native-gesture-handler';
import { useLatestRef } from '../hooks';

type Props = {
  /** 오른쪽으로 쓸었다 — 왼쪽 것으로 간다. */
  onRight: () => void;
  /** 왼쪽으로 쓸었다 — 오른쪽 것으로 간다. */
  onLeft: () => void;
  /** 그쪽에 갈 곳이 있는가. 없으면 끌려도 조금만 밀리고 되돌아온다. */
  canRight?: boolean;
  canLeft?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 감싼 자리를 재는 곳이 있다. 이 층이 View 하나를 세우므로 그 자리를 그대로 물려준다. */
  onLayout?: (e: LayoutChangeEvent) => void;
};

/** 이만큼 가로로 가야 스와이프로 인정한다. 세로 스크롤이 먼저 가져가라고 넉넉히 잡았다. */
const ACTIVATE_X = 20;
/** 세로가 이만큼 먼저 움직이면 스와이프를 포기한다. */
const FAIL_Y = 12;
/** 손을 뗐을 때 이만큼은 갔어야 넘긴다. 스치는 손짓으로 분류가 바뀌면 안 된다. */
const COMMIT_X = 60;
/** 갈 곳이 없는 쪽으로 끌 때 남기는 비율. 아예 안 움직이면 고장인지 끝인지 구별이 안 된다. */
const EDGE_GIVE = 0.25;
/** 손을 뗀 뒤 제자리로 들어오는 시간(ms). */
const SETTLE_MS = 190;

/**
 * 가로로 쓸어서 옆으로 넘기는 영역.
 *
 * 분류를 모른다 — 왼쪽/오른쪽만 알린다. 무엇이 옆에 있는지는 쓰는 쪽이 정한다.
 *
 * **끄는 동안 내용이 손가락을 따라간다.** 넘어간 뒤에야 알면 쓸 수 있다는 것 자체를 모른다.
 * 넘길 때 새 내용은 `t - 폭`에서 시작한다 — 옆 것이 처음부터 붙어 있었다면 있었을 자리다.
 * 그래서 손을 떼는 지점에서 끊기지 않는다.
 *
 * 두 곳과 겹치지 않아야 해서 임계값이 셋이다:
 * - TDS 바텀시트의 끌어서 닫기는 `activateAfterLongPress(200)`이라 시간축에서 갈린다.
 *   즉시 시작하는 스와이프와 붙잡고 끄는 손짓은 다른 동작이다.
 * - 세로 스크롤과는 `failOffsetY`로 갈린다. 세로가 먼저 움직이면 여기가 물러난다.
 *
 * `runOnJS`가 필요하다 — reanimated 워크릿이 아니라 평범한 JS 콜백을 부른다.
 */
export function SwipeArea({
  onRight,
  onLeft,
  canRight = true,
  canLeft = true,
  children,
  style,
  onLayout,
}: Props) {
  const x = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(0);

  /* 갈 곳이 있는지는 넘길 때마다 바뀐다. 제스처는 한 번 만들고 계속 쓰므로 ref로 읽는다. */
  const edgeRef = useLatestRef({ canRight, canLeft });

  const settle = useCallback(
    (from: number) => {
      x.setValue(from);
      Animated.timing(x, {
        toValue: 0,
        duration: SETTLE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [x]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ACTIVATE_X, ACTIVATE_X])
        .failOffsetY([-FAIL_Y, FAIL_Y])
        // 들어오던 중에 다시 잡으면 그 자리에서 이어받는다. 안 멈추면 애니메이션과 손가락이 다툰다.
        .onBegin(() => x.stopAnimation())
        .onUpdate((e: { translationX: number }) => {
          const { canRight: r, canLeft: l } = edgeRef.current;
          const t = e.translationX;
          const blocked = t > 0 ? !r : t < 0 ? !l : false;
          x.setValue(blocked ? t * EDGE_GIVE : t);
        })
        .onEnd((e: { translationX: number }) => {
          const { canRight: r, canLeft: l } = edgeRef.current;
          const t = e.translationX;
          const dir = t >= COMMIT_X && r ? 1 : t <= -COMMIT_X && l ? -1 : 0;
          if (dir === 0) {
            settle(t);
            return;
          }
          if (dir === 1) onRight();
          else onLeft();
          settle(t - dir * widthRef.current);
        })
        .runOnJS(true),
    [onRight, onLeft, settle, edgeRef, x]
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[style, { transform: [{ translateX: x }] }]}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          onLayout?.(e);
        }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
