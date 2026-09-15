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
  /** 두드려 만든 자리들. 어느 자리를 채우고 있는지 여기서 보인다. */
  tray: React.ReactNode;
};

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));

/**
 * 동작을 눌러서 자리 하나를 채우는 바텀시트. 기획서 4.5.
 *
 * 전체 화면이었지만 하는 일은 "고르고 닫기" 하나뿐이라 시트가 맞다.
 * 어떤 분류를 보고 있는지는 여기서만 안다. 어느 자리가 열려 있는지는 밖이 안다.
 */
export function MovePickerSheet({ open, onClose, moves, label, onPick, tray }: Props) {
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
        <BottomSheet.CTA onPress={onClose}>완료</BottomSheet.CTA>
      }
    >
      <View style={styles.body}>
        <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />

        {/*
          자리들은 목록 위에 둔다. CTA 옆에 두면 시트가 늘었다 줄었다 한다.
          키는 두 줄분으로 고정한다 — 상자가 내용 따라 자라면 아래 격자가 밀려서
          방금 누르려던 자리가 손 밑에서 사라진다. 넘치면 상자 안에서 스크롤된다.
        */}
        <ScrollView
          style={styles.tray}
          contentContainerStyle={styles.trayInner}
          keyboardShouldPersistTaps="handled"
        >
          {tray}
        </ScrollView>

        {/* 격자만 감싼다. 위 자리 상자에는 자리를 옮기는 터치가 있어 얽히면 안 된다. */}
        <SwipeArea
          onRight={swipe.prev}
          onLeft={swipe.next}
          canRight={swipe.hasPrev}
          canLeft={swipe.hasNext}
          style={styles.grid}
        >
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
