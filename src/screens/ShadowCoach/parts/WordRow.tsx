import React from 'react';
import { StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { Check, Pencil, RotateCcw, Segmented, Tap, Trash2, Typo, Volume2 } from '../../../commons/components';
import { ACCENT, BEAT_OPTIONS, C, TOUCH } from '../../../commons/constants';
import { beatName } from '../../../commons/utils';
import type { Move } from '../../../commons/types';

const BEAT_SEGMENTS = BEAT_OPTIONS.map((o) => ({ value: o.value, label: o.short }));

type Props = {
  move: Move;
  /** 지금 화면에 보이는 이름. 사용자가 바꿨으면 그 말. */
  name: string;
  /** 직접 추가한 동작인가. 기본 동작과 고칠 수 있는 것이 다르다. */
  custom: boolean;
  open: boolean;
  /** 기본 동작에 사용자가 얹은 호출어. 편집칸의 값이 된다. */
  override: string;
  /** 지금 적용된 동작 길이(초). */
  beat: number;
  /** 이름이나 길이를 기본값에서 바꿔 놨는가. 되돌리기 단추가 이때만 나온다. */
  resettable: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
  /** 목록 안에서의 자리. 펼칠 때 그 줄로 굴려 가는 데 쓴다. */
  onMeasure: (id: string, y: number) => void;
  onChangeName: (id: string, value: string) => void;
  onChangeBeat: (id: string, beat: number) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
};

/**
 * 호출어 목록의 한 줄. 접히면 이름만, 펼치면 편집칸이 열린다.
 *
 * 이름은 이미 풀린 문자열로 받는다. 한 줄에서 타자를 칠 때 나머지 줄의 prop이 그대로여야
 * memo가 걸리기 때문이다. label 함수를 그대로 넘기면 한 글자마다 전부 다시 그려진다.
 */
function WordRowView({
  move,
  name,
  custom,
  open,
  override,
  beat,
  resettable,
  onOpen,
  onClose,
  onMeasure,
  onChangeName,
  onChangeBeat,
  onReset,
  onDelete,
  onPreview,
}: Props) {
  const measure = (e: LayoutChangeEvent) => onMeasure(move.id, e.nativeEvent.layout.y);

  if (!open) {
    return (
      /* Tap은 onLayout을 받지 않는다. 자리를 재려면 한 겹이 필요하다 — 픽셀은 그대로다. */
      <View onLayout={measure}>
        <Tap onPress={() => onOpen(move.id)} style={styles.row}>
          <Typo level="item" color={C.white} numberOfLines={1}>
            {name}
          </Typo>
          {/* 접힌 줄에도 현재 길이를 표시한다 */}
          <Typo level="caption" color={C.z700}>{beatName(beat)}</Typo>
          {custom ? <Typo level="caption" color={C.z700}>직접 추가</Typo> : null}
          <Pencil size={16} color={C.z700} />
        </Tap>
      </View>
    );
  }

  return (
    <View onLayout={measure} style={styles.edit}>
      <View style={styles.editTop}>
        <TextInput
          autoFocus
          value={custom ? move.name : override}
          placeholder={move.name}
          placeholderTextColor={C.z700}
          onChangeText={(v) => onChangeName(move.id, v)}
          style={styles.input}
        />
        <Tap
          onPress={() => onPreview(move.id)}
          accessibilityLabel={`${name} 들어보기`}
          style={styles.squareGhost}
        >
          <Volume2 size={16} color={C.z400} />
        </Tap>
        <Tap onPress={onClose} accessibilityLabel="편집 닫기" style={styles.squareAccent}>
          <Check size={16} color={C.white} />
        </Tap>
      </View>

      <Typo level="caption" color={C.z500} style={styles.fieldLabel}>
        동작 길이
      </Typo>
      <Segmented
        options={BEAT_SEGMENTS}
        value={beat}
        onChange={(v) => onChangeBeat(move.id, v)}
        level="caption"
        style={styles.beatRow}
      />

      <View style={styles.foot}>
        <Typo level="caption" color={C.z700} numberOfLines={1}>
          {custom ? '직접 추가한 동작' : `기본 ${move.name} · ${beatName(move.beat)}`}
        </Typo>
        <View style={styles.footBtns}>
          {resettable ? (
            <Tap onPress={() => onReset(move.id)} accessibilityLabel="기본값으로" style={styles.miniGhost}>
              <RotateCcw size={16} color={C.z500} />
            </Tap>
          ) : null}
          {custom ? (
            <Tap onPress={() => onDelete(move.id)} accessibilityLabel="동작 삭제" style={styles.miniGhost}>
              <Trash2 size={16} color={C.z500} />
            </Tap>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const WordRow = React.memo(WordRowView);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.z900,
  },
  edit: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.z900 },
  editTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: C.white,
  },
  squareGhost: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareAccent: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontSize: 12, color: C.z500, marginBottom: 8 },
  beatRow: { marginBottom: 12 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  footBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniGhost: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
