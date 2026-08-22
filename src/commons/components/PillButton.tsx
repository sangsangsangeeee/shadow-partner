import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ACCENT, C } from '../constants';
import { Tap } from './Tap';
import { Typo } from './Typo';

type Props = {
  label: string;
  onPress: () => void;
  /** 지금 누를 만한 상태인가. 거짓이면 눌리긴 하되 안내를 띄우는 쪽으로 쓴다. */
  active: boolean;
  /** 글자 왼쪽 아이콘. 색은 active에 따라 정해진다. */
  icon?: (color: string) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * 떠 있는 알약 버튼. 저장·추가·완료 세 자리가 같은 모양이었다.
 *
 * 꺼진 상태에서도 누를 수 있게 둔다. 눌러야 왜 안 되는지 알려줄 수 있기 때문이다.
 */
export function PillButton({ label, onPress, active, icon, style }: Props) {
  const iconColor = active ? C.white : C.z500;
  return (
    <Tap onPress={onPress} style={[styles.pill, active ? styles.on : styles.off, style]}>
      {icon ? icon(iconColor) : null}
      <Typo level="button" weight="semibold" color={C.white}>
        {label}
      </Typo>
    </Tap>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    height: 56,
    borderRadius: 28,
    elevation: 6,
  },
  on: { backgroundColor: ACCENT },
  off: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
});
