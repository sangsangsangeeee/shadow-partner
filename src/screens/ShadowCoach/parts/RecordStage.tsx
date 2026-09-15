import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Field, Tap, Typo } from '../../../commons/components';
import { ACCENT, C, COMBO_SIZE, DISPLAY } from '../../../commons/constants';
import { secs } from '../../../commons/utils';
import type { DraftStage, Recording } from '../hooks';

type Props = {
  stage: DraftStage;
  recording: Recording;
  /** 녹음 중 경과 초. 무대가 스스로 센다 — 자료가 아니다. */
  elapsed: number;
  /** 이름 단계에서 보여줄 녹음 길이(ms). 수정 중이면 저장된 것의 길이다. */
  clipMs: number;
  name: string;
  /** 마이크를 쓸 수 있는 환경인가. 엔진이 답하기 전에는 null. */
  micAvailable: boolean | null;
  onArm: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onListen: () => void;
  onNameChange: (text: string) => void;
  onSubmit: () => void;
};

/** 무대 높이. 기획서 4.4가 고정만 정했고 값은 여기서 정한다 — 스톱워치 링(320)의 절반 남짓. */
export const STAGE_H = 180;

/** 마이크가 어떤지 한 줄로. 못 쓰는 건 알려야 한다 — 콤보를 만드는 다른 길이 없다(원칙 2). */
const MIC_LINE: Record<Recording, string> = {
  off: '',
  starting: '마이크 켜는 중…',
  on: '● 말해',
  failed: '마이크를 못 써 — 콤보를 만들 수 없어',
  stopping: '',
};

/**
 * 녹음 무대. 기획서 4.4.
 *
 * 누르면 곧바로 녹음이 시작된다 — 시작 버튼을 따로 두지 않는다.
 * 끝은 명시적 완료 버튼이다. 마지막 마디 뒤의 쉼을 끝으로 치면 콤보가 잘린다.
 */
export function RecordStage({
  stage,
  recording,
  elapsed,
  clipMs,
  name,
  micAvailable,
  onArm,
  onFinish,
  onCancel,
  onListen,
  onNameChange,
  onSubmit,
}: Props) {
  const recording_ = stage === 'recording';
  const named = stage === 'named';
  const noMic = micAvailable === false;

  return (
    <View style={styles.wrap}>
      <Pressable
        // 녹음 중에 또 누르면 재시작되는 사고가 난다. 마이크가 없으면 아예 안 눌린다.
        onPress={recording_ || named || noMic ? undefined : onArm}
        disabled={recording_ || named || noMic}
        accessibilityRole="button"
        accessibilityLabel="녹음 무대"
        style={[styles.stage, recording_ ? styles.stageOn : null]}
      >
        {recording_ ? (
          <>
            <Typo weight="bold" color={C.white} style={styles.count}>{elapsed.toFixed(1)}</Typo>
            <Typo level="caption" color={recording === 'failed' ? C.white : C.z500}>{MIC_LINE[recording]}</Typo>
          </>
        ) : named ? (
          <Typo level="small" color={C.z500} style={styles.hintText}>녹음 {secs(clipMs)}</Typo>
        ) : noMic ? (
          <Typo level="caption" color={C.white} style={styles.hintText}>{MIC_LINE.failed}</Typo>
        ) : (
          <Typo level="small" color={C.z500} style={styles.hintText}>눌러서 녹음</Typo>
        )}
      </Pressable>

      {recording_ ? (
        <View style={styles.row}>
          <Tap onPress={onCancel} accessibilityLabel="녹음 취소" style={styles.ghost}>
            <Typo level="caption" color={C.z300} style={styles.btnText}>취소</Typo>
          </Tap>
          <Tap onPress={onFinish} accessibilityLabel="녹음 완료" style={styles.solid}>
            <Typo level="caption" weight="medium" color={C.white} style={styles.btnText}>완료</Typo>
          </Tap>
        </View>
      ) : null}

      {named ? (
        <>
          <View style={styles.row}>
            <Tap onPress={onListen} accessibilityLabel="녹음 듣기" style={styles.ghost}>
              <Typo level="caption" color={C.z300} style={styles.btnText}>듣기</Typo>
            </Tap>
            <Tap onPress={onArm} accessibilityLabel="다시 녹음" style={styles.ghost}>
              <Typo level="caption" color={C.z300} style={styles.btnText}>다시 녹음</Typo>
            </Tap>
            <Tap onPress={onCancel} accessibilityLabel="초안 취소" style={styles.ghost}>
              <Typo level="caption" color={C.z300} style={styles.btnText}>취소</Typo>
            </Tap>
          </View>
          <View style={styles.nameBox}>
            <Field
              value={name}
              onChangeText={onNameChange}
              placeholder="이름 (예: 원투 로우킥)"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>
        </>
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
  nameBox: { marginTop: 8 },
  ghost: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  solid: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: ACCENT },
});
