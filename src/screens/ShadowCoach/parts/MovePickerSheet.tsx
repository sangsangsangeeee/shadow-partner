import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@toss/tds-react-native';
import { Segmented, SwipeArea, Tap, Typo } from '../../../commons/components';
import { C, CHIP_TRAY_H, COMBO_SIZE, KINDS, KIND_LABEL } from '../../../commons/constants';
import { useAdjacentStep, useSheetHeight } from '../../../commons/hooks';
import type { Kind, Move } from '../../../commons/types';

type Props = {
  open: boolean;
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

/**
 * 동작을 눌러서 콤보를 쌓는 바텀시트.
 *
 * 전체 화면이었지만 하는 일은 "고르고 닫기" 하나뿐이라 시트가 맞다.
 * 무엇보다 뒤에 깔린 입력칸이 그대로 보여서, 쌓이는 콤보를 눈으로 확인하며 고를 수 있다.
 * 어떤 분류를 보고 있는지는 여기서만 안다.
 */
export function MovePickerSheet({ open, onClose, moves, label, onPick, chips, hasPicked }: Props) {
  const [kind, setKind] = useState<Kind>('punch');
  const list = moves.filter((m) => m.kind === kind);
  const swipe = useAdjacentStep(KINDS, kind, setKind);
  const sheetHeight = useSheetHeight();

  /* 시트는 닫혀도 트리에 남는다. 다음에 열 때는 첫 분류부터 보여준다. */
  useEffect(() => {
    if (!open) setKind('punch');
  }, [open]);

  return (
    <BottomSheet.Root
      open={open}
      // 분류를 옮기면 목록 길이가 달라진다. 시트가 그때마다 늘었다 줄었다 하면 손이 목표를 잃는다.
      style={{ height: sheetHeight }}
      wrapperProps={{ style: styles.scroll }}
      header={<BottomSheet.Header>동작 고르기</BottomSheet.Header>}
      onClose={onClose}
      onDimmerClick={onClose}
      cta={
        // CTA가 Button을 직접 만든다. 여기에 Button을 또 넣으면 눌리는 것이 겹쳐 가장자리가 죽는다.
        <BottomSheet.CTA onPress={onClose} disabled={!hasPicked}>
          완료
        </BottomSheet.CTA>
      }
    >
      <View style={styles.body}>
        <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />

        {/*
          쌓인 칩은 목록 위에 둔다. CTA 옆에 두면 시트가 늘었다 줄었다 한다.
          키는 두 줄분으로 고정한다 — 칩이 늘 때마다 상자가 자라면 아래 격자가 밀려서
          방금 누르려던 자리가 손 밑에서 사라진다. 넘치면 상자 안에서 스크롤된다.
        */}
        <ScrollView
          style={styles.tray}
          contentContainerStyle={styles.trayInner}
          keyboardShouldPersistTaps="handled"
        >
          {hasPicked ? (
            chips
          ) : (
            <Typo level="caption" color={C.z600} style={styles.noteText}>동작을 눌러서 순서대로 쌓아봐.</Typo>
          )}
        </ScrollView>

        {/* 격자만 감싼다. 위 칩 트레이에는 지우는 터치가 있어 얽히면 안 된다. */}
        <SwipeArea onRight={swipe.prev} onLeft={swipe.next} style={styles.grid}>
          {list.map((m) => (
            <Tap key={m.id} onPress={() => onPick(m.id)} style={styles.cell}>
              <Typo level="small" color={C.z200} style={styles.cellText}>{label(m.id)}</Typo>
            </Tap>
          ))}
        </SwipeArea>
      </View>
    </BottomSheet.Root>
  );
}

const styles = StyleSheet.create({
  // 시트 키가 고정이라 본문이 남은 자리를 다 먹어야 한다. 안 주면 내용이 시트 밖으로 넘친다.
  scroll: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 8 },
  cellText: { fontSize: COMBO_SIZE.item },
  noteText: { fontSize: COMBO_SIZE.note },
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
    // flexGrow를 막지 않으면 ScrollView가 남은 자리를 다 먹어 격자를 밀어낸다.
    height: CHIP_TRAY_H,
    flexGrow: 0,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
  },
  trayInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
