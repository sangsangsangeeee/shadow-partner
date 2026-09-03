import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from '@granite-js/native/react-native-safe-area-context';
import { C, MAXW } from '../constants';

type Props = {
  visible: boolean;
  /** 뒤로 가기가 부른다. 닫기 버튼은 그리지 않는다 — 나가는 길은 발이 정한다. */
  onClose?: () => void;
  /** 바닥에 고정되는 것. 발이 본문을 가리므로 본문 아래 여백은 넉넉히 잡혀 있다. */
  foot?: React.ReactNode;
  bodyStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * 스크롤 본문 · 고정된 발의 전체 화면 겹침.
 *
 * 고르기·추가처럼 "갔다가 돌아오는" 것은 전부 바텀시트로 내려갔다.
 * 남은 건 훈련 완료뿐 — 나가는 길을 우리가 정하는 화면이라 전체를 덮어야 한다.
 */
export function Overlay({ visible, onClose, foot, bodyStyle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.body, bodyStyle, { paddingTop: insets.top + 64 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>{children}</View>
        </ScrollView>

        {foot ? (
          <View style={[styles.foot, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.inner}>{foot}</View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MAXW, alignSelf: 'center' },
  // 발이 바닥에 겹쳐 서므로 본문 끝은 그만큼 비워 둔다.
  body: { paddingHorizontal: 20, paddingBottom: 176 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
});
