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
import { C, MAXW, TOUCH } from '../constants';
import { useKeyboardHeight } from '../hooks';
import { X } from './Icons';
import { Tap } from './Tap';
import { Typo } from './Typo';

type Props = {
  visible: boolean;
  /** 뒤로 가기와 닫기 버튼이 함께 부른다. 없으면 닫기 버튼을 그리지 않는다. */
  onClose?: () => void;
  title?: string;
  /** 제목 줄 아래에 붙는 것. 분류 탭 같은 게 온다. */
  headExtra?: React.ReactNode;
  /** 바닥에 고정되는 것. 발이 본문을 가리므로 본문 아래 여백은 넉넉히 잡혀 있다. */
  foot?: React.ReactNode;
  /** 키보드가 뜨는 화면이면 참. 발이 키보드 위로 올라선다. */
  avoidKeyboard?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * 머리 · 스크롤 본문 · 고정된 발의 3단 구조. **겹침 없이 뼈대만.**
 *
 * 별도 화면(라우트)이 된 것들은 토스 내비게이션 바 아래에 그냥 놓이면 되므로
 * Modal을 두르지 않고 이것을 직접 쓴다. `onClose`를 주지 않으면 닫기 버튼도 그리지 않는다 —
 * 토스 뒤로가기와 우리 닫기가 같이 보이면 안 된다.
 */
export function OverlayFrame({
  onClose,
  title,
  headExtra,
  foot,
  avoidKeyboard = false,
  bodyStyle,
  children,
}: Omit<Props, 'visible'>) {
  const insets = useSafeAreaInsets();
  /*
   * KeyboardAvoidingView는 쓰지 않는다. 자기 layout의 y를 화면 좌표로 믿는데,
   * 라우트 화면은 토스 내비게이션 바 아래에서 시작해서 그만큼 덜 올린다.
   * 키보드 높이를 직접 받아 발을 그 위에 세운다 — 훈련 화면의 FAB와 같은 방식.
   */
  const kb = useKeyboardHeight();
  const lift = avoidKeyboard ? kb : 0;

  return (
    <View style={styles.root}>
      {title || headExtra ? (
        <View style={[styles.head, { paddingTop: insets.top + 20 }]}>
          <View style={styles.inner}>
            {title ? (
              <View style={[styles.titleRow, headExtra ? styles.titleGap : null]}>
                <Typo level="subtitle" weight="medium" color={C.white}>
                  {title}
                </Typo>
                {onClose ? (
                  <Tap onPress={onClose} accessibilityLabel="닫기" style={styles.closeBtn}>
                    <X size={20} color={C.z500} />
                  </Tap>
                ) : null}
              </View>
            ) : null}
            {headExtra}
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.body, bodyStyle, title ? null : { paddingTop: insets.top + 64 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>

      {foot ? (
        <View style={[styles.foot, { bottom: lift, paddingBottom: lift > 0 ? 24 : insets.bottom + 24 }]}>
          <View style={styles.inner}>{foot}</View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 전체 화면 겹침. 위 뼈대를 Modal로 두른 것.
 *
 * 훈련 완료처럼 "나가는 길을 우리가 정하는" 화면만 이걸 쓴다.
 * 갔다가 돌아오는 화면은 라우트로 나가 있어서 `OverlayFrame`을 직접 쓴다.
 */
export function Overlay({ visible, ...rest }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={rest.onClose} transparent={false}>
      <OverlayFrame {...rest} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MAXW, alignSelf: 'center' },
  head: { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36 },
  titleGap: { marginBottom: 16 },
  closeBtn: { width: TOUCH, height: TOUCH, alignItems: 'flex-end', justifyContent: 'center' },
  // 발이 바닥에 겹쳐 서므로 본문 끝은 그만큼 비워 둔다.
  body: { paddingHorizontal: 20, paddingBottom: 176 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
});
