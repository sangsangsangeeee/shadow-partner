import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from '@granite-js/native/react-native-safe-area-context';
import { C, MAXW, TOUCH } from '../constants';
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
  /** 키보드가 뜨는 화면이면 참. 발이 키보드 위로 밀려 올라간다. */
  avoidKeyboard?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * 전체 화면 겹침. 머리 · 스크롤 본문 · 고정된 발의 3단 구조.
 *
 * 동작 추가·훈련 완료·동작 고르기가 같은 뼈대에 안전 영역 계산까지 똑같이 반복하고 있었다.
 * 안전 영역을 여기서 한 번만 읽으므로 쓰는 쪽은 insets를 몰라도 된다.
 */
export function Overlay({
  visible,
  onClose,
  title,
  headExtra,
  foot,
  avoidKeyboard = false,
  bodyStyle,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const Frame = avoidKeyboard ? KeyboardAvoidingView : View;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <Frame
        style={styles.root}
        behavior={avoidKeyboard && Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          <View style={[styles.foot, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.inner}>{foot}</View>
          </View>
        ) : null}
      </Frame>
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
