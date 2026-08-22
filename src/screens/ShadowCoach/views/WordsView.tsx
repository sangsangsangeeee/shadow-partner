import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { RotateCcw, Segmented, Tap, Typo } from '../../../commons/components';
import { BASE_MOVES, C, KINDS, KIND_LABEL, MAXW } from '../../../commons/constants';
import type { Beats, Kind, Labels, Move } from '../../../commons/types';
import { WordRow } from '../parts';

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));

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

  const open = useCallback((id: string) => setEditingId(id), []);
  const close = useCallback(() => setEditingId(null), []);

  // 지운 줄은 사라지므로 편집칸도 같이 닫는다.
  const remove = useCallback(
    (id: string) => {
      setEditingId(null);
      onDelete(id);
    },
    [onDelete]
  );

  return (
    <ScrollView
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
            setEditingId(null);
            onKindChange(k);
          }}
        />

        <View>
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
