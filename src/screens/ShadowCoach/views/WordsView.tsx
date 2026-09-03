import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { RotateCcw, Segmented, Tap, Typo } from '../../../commons/components';
import { BASE_MOVES, C, KINDS, KIND_LABEL, MAXW } from '../../../commons/constants';
import type { Beats, Kind, Labels, Move } from '../../../commons/types';
import { WordRow } from '../parts';

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));

/**
 * 펼친 줄이 걸릴 화면 위쪽 자리.
 * 토스 헤더가 스크롤 영역 위쪽을 덮으므로 0에 붙이면 그 밑으로 들어간다.
 */
const REVEAL_OFFSET = 100;

type Props = {
  /** 지금 분류에 해당하는 동작들. */
  moves: Move[];
  kind: Kind;
  onKindChange: (kind: Kind) => void;
  /** 기본 동작에 얹은 호출어. */
  labels: Labels;
  /** 기본 길이를 덮어쓴 값. */
  beats: Beats;
  label: (id: string) => string;
  beatOf: (id: string) => number;
  bottomPad: number;
  onApplyNumbers: () => void;
  onResetBase: () => void;
  onChangeName: (id: string, value: string) => void;
  onChangeBeat: (id: string, beat: number) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
};

/**
 * 호출어 탭.
 *
 * 어느 줄이 펼쳐져 있는지는 이 화면 밖에서 쓸 일이 없어 여기서 들고 있는다.
 * 줄 목록은 memo가 걸려 있으므로 아래로 넘기는 콜백의 신원이 흔들리면 안 된다.
 */
export function WordsView({
  moves,
  kind,
  onKindChange,
  labels,
  beats,
  label,
  beatOf,
  bottomPad,
  onApplyNumbers,
  onResetBase,
  onChangeName,
  onChangeBeat,
  onReset,
  onDelete,
  onPreview,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);
  const rowYRef = useRef<Record<string, number>>({});

  /** 굴려 가는 중인 줄. 키보드가 뒤늦게 올라올 때 다시 겨눌 대상이다. */
  const revealRef = useRef<string | null>(null);
  const padRef = useRef(bottomPad);

  const measureRow = useCallback((id: string, y: number) => {
    rowYRef.current[id] = y;
  }, []);

  /** 그 줄의 입력칸이 화면 위쪽에 걸리도록 굴려 간다. 펼친 줄은 위가 곧 입력칸이다. */
  const scrollToRow = useCallback((id: string) => {
    const y = rowYRef.current[id];
    const sv = scrollRef.current;
    if (y === undefined || sv == null) return;
    sv.scrollTo({ y: Math.max(0, listTopRef.current + y - REVEAL_OFFSET), animated: true });
  }, []);

  /*
   * 펼치면서 그 줄로 굴려 간다. 아래쪽 줄은 편집칸이 열려도 키보드에 덮여서
   * 그냥 두면 동작 길이와 삭제에 손이 닿지 않는다.
   */
  const open = useCallback(
    (id: string) => {
      setEditingId(id);
      revealRef.current = id;
      scrollToRow(id);
    },
    [scrollToRow]
  );

  const close = useCallback(() => {
    revealRef.current = null;
    setEditingId(null);
  }, []);

  /*
   * 여백이 늘어나면 한 번 더 겨눈다.
   *
   * 펼치는 순간에는 아래 여백에 키보드가 안 들어가 있어서 굴릴 수 있는 끝이 짧다 —
   * 마지막 줄은 그 끝에 걸려 목표까지 못 간다. 키보드가 올라와 여백이 늘어난 뒤 다시 부른다.
   * 줄어들 때는 겨누지 않는다. 키보드를 내린 사람을 다시 끌고 갈 이유가 없다.
   */
  useEffect(() => {
    const grew = bottomPad > padRef.current;
    padRef.current = bottomPad;
    if (grew && revealRef.current != null) scrollToRow(revealRef.current);
  }, [bottomPad, scrollToRow]);

  // 지운 줄은 사라지므로 편집칸도 같이 닫는다.
  const remove = useCallback(
    (id: string) => {
      revealRef.current = null;
      setEditingId(null);
      onDelete(id);
    },
    [onDelete]
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={[styles.pad, { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inner}>
        <Typo level="caption" color={C.z600}>
          코치가 뭐라고 부를지 정해. 여기서 정한 말은 콤보를 적을 때도 그대로 인식돼.
        </Typo>

        <View style={styles.tools}>
          <Tap onPress={onApplyNumbers} style={styles.ghostChip}>
            <Typo level="caption" color={C.z300}>번호로 일괄 변경</Typo>
          </Tap>
          <Tap onPress={onResetBase} style={styles.ghostChip}>
            <RotateCcw size={12} color={C.z500} />
            <Typo level="caption" color={C.z500}>기본으로</Typo>
          </Tap>
        </View>

        <Segmented
          options={KIND_OPTIONS}
          value={kind}
          onChange={(k) => {
            revealRef.current = null;
            setEditingId(null);
            onKindChange(k);
          }}
        />

        <View
          onLayout={(e) => {
            listTopRef.current = e.nativeEvent.layout.y;
          }}
        >
          {moves.map((m) => {
            const custom = !BASE_MOVES.some((b) => b.id === m.id);
            const override = labels[m.id] ?? '';
            const renamed = !custom && !!override.trim() && override.trim() !== m.name;
            return (
              <WordRow
                key={m.id}
                move={m}
                name={label(m.id)}
                custom={custom}
                open={editingId === m.id}
                override={override}
                beat={beatOf(m.id)}
                resettable={renamed || beats[m.id] !== undefined}
                onOpen={open}
                onClose={close}
                onMeasure={measureRow}
                onChangeName={onChangeName}
                onChangeBeat={onChangeBeat}
                onReset={onReset}
                onDelete={remove}
                onPreview={onPreview}
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  inner: { width: '100%', maxWidth: MAXW, alignSelf: 'center' },
  tools: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  ghostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
  },
});
