import React from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Tap, Typo } from '../../../commons/components';
import { ACCENT, C, COMBO_SIZE, DISPLAY } from '../../../commons/constants';
import type { DraftStage, Recording } from '../hooks';

type Props = {
  stage: DraftStage;
  /** 지금까지 두드린 수. */
  count: number;
  recording: Recording;
  onTap: (at: number) => void;
  onFinish: () => void;
  onCancel: () => void;
};

/** 무대 높이. 기획서 4.4가 고정만 정했고 값은 여기서 정한다 — 스톱워치 링(320)의 절반 남짓. */
export const STAGE_H = 180;

/**
 * 두드려서 리듬을 만드는 무대. 기획서 4.4.
 *
 * 첫 터치가 시작이라 시작 버튼이 없다. 시각은 손이 닿는 순간(pressIn)의 것이다 —
 * 손을 떼는 순간을 재면 누르고 있던 시간이 리듬에 섞인다.
 */
/** 마이크가 어떤지 한 줄로. 못 쓰는 건 알려야 한다 — 조용히 목소리 없이 저장되면 안 된다(원칙 2·6). */
const MIC_LINE: Record<Recording, string> = {
  off: '',
  starting: '마이크 켜는 중…',
  on: '● 두드리면서 말해',
  failed: '마이크를 못 써 — 목소리 없이 저장돼',
  stopping: '',
};

export function TapStage({ stage, count, recording, onTap, onFinish, onCancel }: Props) {
  const tapping = stage === 'tapping';
  const press = (e: GestureResponderEvent) => {
    // JS가 바쁘면 Date.now()는 밀린다. 터치 자체의 시각을 쓴다.
    onTap(e.nativeEvent.timestamp ?? Date.now());
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPressIn={press}
        accessibilityRole="button"
        accessibilityLabel="두드리는 무대"
        style={[styles.stage, tapping ? styles.stageOn : null]}
      >
        {tapping ? (
          <>
            <Typo weight="bold" color={C.white} style={styles.count}>{count}</Typo>
            <Typo level="caption" color={recording === 'failed' ? C.white : C.z500}>{MIC_LINE[recording]}</Typo>
          </>
        ) : (
          <Typo level="small" color={C.z500} style={styles.hintText}>두드려서 시작</Typo>
        )}
      </Pressable>

      {tapping ? (
        <View style={styles.row}>
          <Tap onPress={onCancel} accessibilityLabel="두드리기 취소" style={styles.ghost}>
            <Typo level="caption" color={C.z300} style={styles.btnText}>취소</Typo>
          </Tap>
          <Tap onPress={onFinish} accessibilityLabel="두드리기 완료" style={styles.solid}>
            <Typo level="caption" weight="medium" color={C.white} style={styles.btnText}>완료</Typo>
          </Tap>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  stage: {
    height: STAGE_H,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageOn: { borderColor: ACCENT },
  /* 기획서가 크기를 안 정한 자리라 새 숫자를 만들지 않고 완료 화면의 것을 빌린다. */
  count: DISPLAY.done,
  hintText: { fontSize: COMBO_SIZE.item },
  btnText: { fontSize: COMBO_SIZE.note },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ghost: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  solid: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: ACCENT },
});
