import React from 'react';
import { StyleSheet } from 'react-native';
import { Tap, Typo } from '../../../commons/components';
import { ACCENT, C, COMBO_SIZE } from '../../../commons/constants';

type Props = {
  slots: (string | null)[];
  /** 열린 자리. 테두리를 밝힌다. */
  cursor: number;
  label: (id: string) => string;
  onPress: (index: number) => void;
  /** 누르면 무엇이 일어나는지. 콤보 탭은 비우고, 고르기 시트는 자리를 옮긴다. */
  pressLabel: (index: number, id: string | null) => string;
};

/** 두드려 만든 자리들. 콤보 탭과 동작 고르기 시트가 같이 쓴다. */
export function SlotRow({ slots, cursor, label, onPress, pressLabel }: Props) {
  return (
    <>
      {slots.map((id, i) => (
        <Tap
          key={i}
          onPress={() => onPress(i)}
          accessibilityLabel={pressLabel(i, id)}
          style={[styles.slot, id ? styles.filled : styles.empty, i === cursor ? styles.open : null]}
        >
          <Typo level="caption" weight="medium" color={id ? C.white : C.z500} style={styles.text}>
            {id ? label(id) : `${i + 1}`}
          </Typo>
        </Tap>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: COMBO_SIZE.note },
  slot: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, borderWidth: 1, minWidth: 36, alignItems: 'center' },
  filled: { backgroundColor: ACCENT, borderColor: ACCENT },
  empty: { backgroundColor: C.card, borderColor: C.line },
  open: { borderColor: C.white },
});
