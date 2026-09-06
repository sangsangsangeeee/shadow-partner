import React from 'react';
import { View } from 'react-native';

/**
 * 제스처 대역.
 *
 * `@granite-js/native/*`는 번들러가 실제 패키지로 치환하는 껍데기라
 * jest에서는 빈 객체가 들어온다(`Gesture`가 undefined). 그래서 모듈째 갈아끼운다.
 *
 * **손가락 판정을 여기서 흉내내지 않는다.** 얼마나 갔을 때 인정할지는 실물만 알고,
 * 그걸 대역이 다시 정하면 테스트가 대역의 규칙을 확인하게 된다.
 * 대신 만들어진 `onEnd`를 붙잡아 뒀다가 테스트가 직접 부른다 —
 * 확인 대상은 "이만큼 갔을 때 어느 쪽으로 넘기는가"이지 제스처 인식기가 아니다.
 */

type PanEnd = (e: { translationX: number; translationY: number }) => void;

/** GestureDetector가 자기 제스처를 여기 등록한다. 화면에 스와이프 영역이 둘 이상일 수 있다. */
const ends = new Map<object, PanEnd>();

export function resetGestureMock() {
  ends.clear();
}

/** 화면에 붙어 있는 스와이프 영역 수. 엉뚱한 걸 밀고 있지 않은지 확인할 때 쓴다. */
export function swipeAreaCount() {
  return ends.size;
}

/** 스와이프를 흉내낸다. dx가 양수면 오른쪽으로 쓴 것이다. */
export function fireSwipe(dx: number, index = 0) {
  const list = [...ends.values()];
  const fn = list[index];
  if (fn == null) throw new Error(`스와이프 영역이 없다 (있는 것: ${list.length})`);
  fn({ translationX: dx, translationY: 0 });
}

function makePan() {
  const self = {};
  const pan = {
    activeOffsetX: () => pan,
    failOffsetY: () => pan,
    activateAfterLongPress: () => pan,
    runOnJS: () => pan,
    onUpdate: () => pan,
    onBegin: () => pan,
    onFinalize: () => pan,
    onStart: () => pan,
    onEnd: (fn: PanEnd) => {
      ends.set(self, fn);
      return pan;
    },
  };
  return pan;
}

export const Gesture = {
  Pan: makePan,
  LongPress: makePan,
  Simultaneous: makePan,
};

export function GestureDetector({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function GestureHandlerRootView({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}
