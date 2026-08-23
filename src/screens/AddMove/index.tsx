import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { Field, OverlayFrame, PillButton, Plus, Segmented, Typo } from '../../commons/components';
import { BEAT_OPTIONS, C, KINDS, KIND_LABEL } from '../../commons/constants';
import { norm } from '../../commons/utils';
import type { Kind } from '../../commons/types';
import { useMaterialContext } from '../ShadowCoach/MaterialContext';

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));
const BEAT_SEGMENTS = BEAT_OPTIONS.map((o) => ({ value: o.value, label: o.short }));

/**
 * 동작 추가 화면.
 *
 * 이름·분류·길이 초안은 이 화면 밖에서 쓸 일이 없어 여기서 들고 있는다.
 * 닫기 버튼은 그리지 않는다 — 토스 내비게이션 바의 뒤로가기와 겹치면 안 된다.
 */
export default function AddMove() {
  const navigation = useNavigation();
  const { dispatch, alias } = useMaterialContext();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('punch');
  const [beat, setBeat] = useState(0.65);
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 적어줘.');
      return;
    }
    if (alias[norm(trimmed)]) {
      setError('이미 같은 말이 등록돼 있어.');
      return;
    }
    dispatch({ type: 'addMove', name: trimmed, kind, beat });
    // navigate('/')는 이미 스택에 있는 훈련 화면 위에 한 장을 더 얹는다. 왔던 길로 되돌아간다.
    navigation.goBack();
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
    <OverlayFrame title="동작 추가" avoidKeyboard foot={foot}>
      {/* 자동 포커스를 두지 않는다. 전환 애니메이션 중에 키보드가 올라와 화면이 버벅인다. */}
      <Field
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
    </OverlayFrame>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  fieldGap: { marginTop: 24 },
  beatRow: { marginBottom: 12 },
});
