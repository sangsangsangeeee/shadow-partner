import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

/** 눌림 피드백이 붙은 Pressable. 화면 전체에서 이걸 쓴다. */
export function Tap({
  style,
  children,
  disabled,
  onPress,
  accessibilityLabel,
  hitSlop,
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  hitSlop?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [style, pressed ? { opacity: 0.6 } : null]}
    >
      {children}
    </Pressable>
  );
}
