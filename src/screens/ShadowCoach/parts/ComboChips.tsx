import React from 'react';
import { StyleSheet } from 'react-native';
import { Tap, Typo, X } from '../../../commons/components';
import { ACCENT, C, COMBO_SIZE } from '../../../commons/constants';

type Props = {
  /** 해석된 동작 id들. 적힌 순서 그대로다. */
  moves: string[];
  label: (id: string) => string;
  /** 칩을 누르면 그 자리를 뺀다. */
  onRemove: (index: number) => void;
};

/** 입력한 콤보를 알아들은 결과. 콤보 탭과 동작 고르기 화면이 같이 쓴다. */
export function ComboChips({ moves, label, onRemove }: Props) {
  return (
    <>
      {moves.map((mid, i) => (
        <Tap
          key={`${mid}-${i}`}
          onPress={() => onRemove(i)}
          accessibilityLabel={`${label(mid)} 지우기`}
          style={styles.chip}
        >
          <Typo level="caption" weight="medium" color={C.white} style={styles.chipText}>{label(mid)}</Typo>
          <X size={12} color={C.white} opacity={0.6} />
        </Tap>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  chipText: { fontSize: COMBO_SIZE.note },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 6,
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
});
