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

export function Slider({ value, min, max, onChange, accessibilityLabel }: any) {
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
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
const CTA = ({ children }: any) => <View>{children}</View>;
const HeaderDescription = ({ children }: any) => <Text>{children}</Text>;
const Select = ({ children }: any) => <View>{children}</View>;

export const BottomSheet = { Root, Header, CTA, HeaderDescription, Select };
