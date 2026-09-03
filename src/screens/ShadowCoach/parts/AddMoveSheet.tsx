import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet } from '@toss/tds-react-native';
import { Field, Segmented, Typo } from '../../../commons/components';
import { BEAT_OPTIONS, C, KINDS, KIND_LABEL } from '../../../commons/constants';
import { norm } from '../../../commons/utils';
import type { Kind } from '../../../commons/types';
import { useMaterialContext } from '../MaterialContext';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 넣고 나면 그 분류를 보여줘야 한다. 방금 넣은 게 다른 탭에 있으면 없는 것처럼 보인다. */
  onAdded: (kind: Kind) => void;
};

const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));
const BEAT_SEGMENTS = BEAT_OPTIONS.map((o) => ({ value: o.value, label: o.short }));

/**
 * 동작 추가 바텀시트.
 *
 * 라우트로 나가 있던 화면이다. 이름 한 줄과 고르기 둘뿐이라 화면을 갈아탈 만큼 무겁지 않고,
 * 넘어갔다 돌아오는 동안 호출어 목록을 놓치는 것도 사라진다.
 * 이름·분류·길이 초안은 이 시트 밖에서 쓸 일이 없어 여기서 들고 있는다.
 */
export function AddMoveSheet({ open, onClose, onAdded }: Props) {
  const { dispatch, alias } = useMaterialContext();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('punch');
  const [beat, setBeat] = useState(0.65);
  const [error, setError] = useState('');

  /* 시트는 닫혀도 트리에 남는다. 다음에 열 때 지난 초안이 남아 있으면 안 된다. */
  useEffect(() => {
    if (open) return;
    setName('');
    setKind('punch');
    setBeat(0.65);
    setError('');
  }, [open]);

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
    onAdded(kind);
    onClose();
  };

  return (
    <BottomSheet.Root
      open={open}
      header={<BottomSheet.Header>동작 추가</BottomSheet.Header>}
      onClose={onClose}
      onDimmerClick={onClose}
      cta={
        // CTA가 Button을 직접 만든다. 여기에 Button을 또 넣으면 눌리는 것이 겹쳐 가장자리가 죽는다.
        <BottomSheet.CTA onPress={submit} disabled={name.trim().length === 0}>
          추가
        </BottomSheet.CTA>
      }
    >
      <View style={styles.body}>
        {/* 자동 포커스를 두지 않는다. 시트가 올라오는 중에 키보드가 겹쳐 올라오면 화면이 버벅인다. */}
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
      </View>
    </BottomSheet.Root>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 8 },
  fieldGap: { marginTop: 24 },
  beatRow: { marginBottom: 12 },
});
