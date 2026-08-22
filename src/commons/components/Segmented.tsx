import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ACCENT, C } from '../constants';
import { Tap } from './Tap';
import { Typo } from './Typo';

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 훈련 중 잠기는 자리가 있다. 눌리지 않고 흐리게 보인다. */
  disabled?: boolean;
  /** 시트나 전체 화면처럼 여유가 있는 곳은 'tall'. */
  size?: 'normal' | 'tall';
  /** 칸이 좁아 글자를 한 단계 줄여야 하는 자리가 있다. */
  level?: 'small' | 'caption';
  style?: StyleProp<ViewStyle>;
};

/**
 * 한 줄로 늘어선 배타 선택.
 *
 * 분류(펀치/킥/…), 모드, 동작 길이가 전부 같은 모양이라 네 군데에 같은 코드가 있었다.
 * 고르는 값의 타입만 다르므로 제네릭으로 받는다.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  size = 'normal',
  level = 'small',
  style,
}: Props<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            style={[
              size === 'tall' ? styles.segTall : styles.seg,
              on ? styles.on : styles.off,
              disabled ? styles.locked : null,
            ]}
          >
            <Typo level={level} weight="medium" color={C.white}>
              {o.label}
            </Typo>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segTall: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: ACCENT },
  off: { backgroundColor: C.card },
  locked: { opacity: 0.4 },
});
