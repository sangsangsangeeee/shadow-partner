import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Overlay, PillButton, Segmented, Tap, Typo } from '../../../commons/components';
import { C, COMBO_SIZE, KINDS, KIND_LABEL } from '../../../commons/constants';
import type { Kind, Move } from '../../../commons/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 기본 동작과 직접 추가한 동작을 합친 전체 목록. 분류 거르기는 안에서 한다. */
  moves: Move[];
  label: (id: string) => string;
  onPick: (id: string) => void;
  /** 지금까지 쌓인 동작 칩. 비어 있으면 안내 문구를 대신 띄운다. */
  chips: React.ReactNode;
  hasPicked: boolean;
};

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));

/** 동작을 눌러서 콤보를 쌓는 전체 화면. 어떤 분류를 보고 있는지는 여기서만 안다. */
export function MovePickerOverlay({ visible, onClose, moves, label, onPick, chips, hasPicked }: Props) {
  const [kind, setKind] = useState<Kind>('punch');
  const list = moves.filter((m) => m.kind === kind);

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      title="동작 고르기"
      headExtra={<Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />}
      bodyStyle={styles.body}
      foot={
        <View>
          {/* 칩 묶음에만 배경을 둔다. 스크롤되는 버튼 위에 겹치면 글자가 안 읽힌다. */}
          <View style={styles.tray}>
            {hasPicked ? (
              chips
            ) : (
              <Typo level="caption" color={C.z600} style={styles.noteText}>동작을 눌러서 순서대로 쌓아봐.</Typo>
            )}
          </View>
          <View style={styles.center}>
            <PillButton
              label="완료"
              active={hasPicked}
              onPress={onClose}
              icon={(color) => <Check size={20} color={color} />}
            />
          </View>
        </View>
      }
    >
      <View style={styles.grid}>
        {list.map((m) => (
          <Tap key={m.id} onPress={() => onPick(m.id)} style={styles.cell}>
            <Typo level="small" color={C.z200} style={styles.cellText}>{label(m.id)}</Typo>
          </Tap>
        ))}
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  cellText: { fontSize: COMBO_SIZE.item },
  noteText: { fontSize: COMBO_SIZE.note },
  body: { paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
  },
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
