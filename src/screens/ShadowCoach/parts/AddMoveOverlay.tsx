import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Field, Overlay, PillButton, Plus, Segmented, Typo } from '../../../commons/components';
import { BEAT_OPTIONS, C, KINDS, KIND_LABEL } from '../../../commons/constants';
import type { Kind } from '../../../commons/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * 동작을 실제로 등록한다. 성공하면 null, 막혔으면 그 이유를 돌려준다.
   * 중복 판정에는 별칭 사전이 필요해서 화면 쪽이 들고 있다.
   */
  onAdd: (name: string, kind: Kind, beat: number) => string | null;
};

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));
const BEAT_SEGMENTS = BEAT_OPTIONS.map((o) => ({ value: o.value, label: o.short }));

/**
 * 동작 추가 전체 화면.
 *
 * 이름·분류·길이 초안은 이 화면 밖에서 쓸 일이 없어 여기서 들고 있는다.
 * 화면을 열 때마다 지난 오류만 지우고 분류·길이는 남긴다. 여러 개를 이어 넣기 편하다.
 */
export function AddMoveOverlay({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('punch');
  const [beat, setBeat] = useState(0.65);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) setError('');
  }, [visible]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 적어줘.');
      return;
    }
    const rejected = onAdd(trimmed, kind, beat);
    if (rejected) {
      setError(rejected);
      return;
    }
    setError('');
    setName('');
    onClose();
  };

  const foot = (
    <View style={styles.center}>
      <PillButton
        label="추가"
        active={name.trim().length > 0}
        onPress={submit}
        icon={(color) => <Plus size={20} color={color} />}
      />
    </View>
  );

  return (
    <Overlay visible={visible} onClose={onClose} title="동작 추가" avoidKeyboard foot={foot}>
      <Field
        autoFocus
        label="뭐라고 부를까"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError('');
        }}
        placeholder="엘보, 스핀킥, 관장님이 쓰는 말…"
        error={error}
      />

      <Typo level="caption" color={C.z500} style={styles.fieldGap}>분류</Typo>
      <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} size="tall" />

      <Typo level="caption" color={C.z500} style={styles.fieldGap}>동작 길이</Typo>
      <Segmented
        options={BEAT_SEGMENTS}
        value={beat}
        onChange={setBeat}
        size="tall"
        level="caption"
        style={styles.beatRow}
      />
      <Typo level="caption" color={C.z600}>이 동작에 주어지는 시간이야. 킥처럼 오래 걸리면 길게.</Typo>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  fieldGap: { marginTop: 24 },
  beatRow: { marginBottom: 12 },
});
