/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * TDS의 CJS 번들은 jest에서 `Cannot redefine property`로 터진다.
 * (core/hooks의 재수출이 babel interop과 부딪힌다.)
 * 테스트가 확인할 것은 화면 동작이므로 경계에서 가벼운 대역으로 갈아끼운다.
 * 색상만은 진짜 값을 쓴다 — 팔레트 상수가 모듈 로드 시점에 읽기 때문.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const { colors } = require('@toss/tds-colors');

export function TDSProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Txt({ children, style, color, ...rest }: any) {
  return (
    <Text {...rest} style={[style, color ? { color } : null]}>
      {children}
    </Text>
  );
}

export function Button({ children, onPress, disabled, ...rest }: any) {
  return (
    <Pressable {...rest} onPress={onPress} disabled={disabled} accessibilityRole="button">
      <Text>{children}</Text>
    </Pressable>
  );
}

export function Slider({ value, min, max, step = 1, onChange, accessibilityLabel }: any) {
  /*
   * 실물은 손가락 자리를 눈금으로 바꿔 onChange를 부른다. 여기서 손가락을 흉내낼 수는 없다.
   * 대신 실물이 스스로 처리하는 접근성 증감을 그대로 흉내낸다 — 테스트가 값을 미는 통로다.
   */
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e: any) => {
        const name = e?.nativeEvent?.actionName;
        if (name === 'increment') onChange?.(clamp(value + step));
        if (name === 'decrement') onChange?.(clamp(value - step));
      }}
      onTouchEnd={() => onChange?.(value)}
    />
  );
}

function Root({ open, header, cta, children }: any) {
  if (!open) return null;
  return (
    <View accessibilityViewIsModal>
      {header}
      {children}
      {cta}
    </View>
  );
}
const Header = ({ children }: any) => <Text>{children}</Text>;
/** 실물 CTA는 Button props를 그대로 받아 스스로 버튼을 만든다. 대역도 눌리게 둔다. */
const CTA = ({ children, onPress, ...rest }: any) => (
  <Pressable {...rest} onPress={onPress} accessibilityRole="button">
    <Text>{children}</Text>
  </Pressable>
);
const HeaderDescription = ({ children }: any) => <Text>{children}</Text>;
const Select = ({ children }: any) => <View>{children}</View>;

export const BottomSheet = { Root, Header, CTA, HeaderDescription, Select };

/** 실물은 duration이 지나면 스스로 onClose를 부른다. 대역도 그 시계를 그대로 흉내낸다. */
function ToastBase({ open, text, button, duration, onClose }: any) {
  /*
   * 실물을 그대로 흉내낸다. 두 가지가 함정이라 여기서 봐줘 버리면 기기에서만 깨진다.
   * `duration`은 ms가 아니라 **초**고(`duration * 1000`으로 건다),
   * 시계는 **마운트 때 한 번만** 걸린다 — open이 다시 켜져도 되감기지 않는다.
   * 트리에 계속 남아 있는 토스트는 그래서 두 번째부터 스스로 안 닫힌다.
   */
  React.useEffect(() => {
    const t = setTimeout(() => onClose?.(), (duration ?? (button ? 5 : 3)) * 1000);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;
  return (
    <View>
      <Text>{text}</Text>
      {button}
    </View>
  );
}
const ToastButton = ({ children, onPress, ...rest }: any) => (
  <Pressable {...rest} onPress={onPress} accessibilityRole="button">
    <Text>{children}</Text>
  </Pressable>
);
export const Toast = Object.assign(ToastBase, { Button: ToastButton });
