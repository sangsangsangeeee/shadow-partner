import React from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  CardAction,
  Check,
  MoreHorizontal,
  Pencil,
  Tap,
  Trash2,
  Typo,
  Volume2,
} from '../../../commons/components';
import { ACCENT, C } from '../../../commons/constants';
import type { Combo } from '../../../commons/types';

type Props = {
  combo: Combo;
  /** 더보기 메뉴가 펼쳐져 있는가. */
  expanded: boolean;
  /** 중복 저장 안내에서 "목록에서 보기"로 찾아온 카드인가. */
  lit: boolean;
  label: (id: string) => string;
  /** 훈련에 넣고 빼기. */
  onToggle: (combo: Combo) => void;
  onToggleMenu: (id: string) => void;
  onPreview: (combo: Combo) => void;
  onEdit: (combo: Combo) => void;
  onRemove: (combo: Combo) => void;
  /** 스크롤로 찾아가려면 카드의 y를 알아야 한다. */
  onMeasure: (id: string, y: number) => void;
};

/**
 * 콤보 한 장.
 *
 * 콤보 20개를 띄워 놓고 하나를 켜고 끌 때 스무 장이 전부 다시 그려지지 않도록 memo를 건다.
 * 그러려면 부모가 넘기는 콜백이 렌더마다 새로 만들어지면 안 된다. 전부 id나 콤보를 인자로 받는다.
 */
function ComboCardView({
  combo,
  expanded,
  lit,
  label,
  onToggle,
  onToggleMenu,
  onPreview,
  onEdit,
  onRemove,
  onMeasure,
}: Props) {
  const measure = (e: LayoutChangeEvent) => onMeasure(combo.id, e.nativeEvent.layout.y);

  return (
    <View
      onLayout={measure}
      style={[styles.card, { borderColor: combo.on ? ACCENT : C.line }, lit ? styles.lit : null]}
    >
      <View style={styles.top}>
        <Tap
          onPress={() => onToggle(combo)}
          accessibilityLabel={combo.on ? '훈련에서 빼기' : '훈련에 넣기'}
          style={styles.main}
        >
          <View style={[styles.checkbox, combo.on ? styles.checkboxOn : styles.checkboxOff]}>
            {combo.on ? <Check size={16} color={C.white} /> : null}
          </View>
          <View style={styles.moves}>
            {combo.moves.map((mid, i) => (
              <View key={`${mid}-${i}`} style={[styles.tag, combo.on ? styles.tagOn : null]}>
                <Typo level="small" color={C.z200}>{label(mid)}</Typo>
              </View>
            ))}
          </View>
        </Tap>

        <Tap
          onPress={() => onToggleMenu(combo.id)}
          accessibilityLabel={expanded ? '메뉴 닫기' : '더보기'}
          style={styles.more}
        >
          <MoreHorizontal size={20} color={C.z600} />
        </Tap>
      </View>

      {expanded ? (
        <View style={styles.actions}>
          <CardAction icon={Volume2} label="듣기" onPress={() => onPreview(combo)} />
          <CardAction icon={Pencil} label="수정" onPress={() => onEdit(combo)} />
          <CardAction icon={Trash2} label="삭제" onPress={() => onRemove(combo)} />
        </View>
      ) : null}
    </View>
  );
}

export const ComboCard = React.memo(ComboCardView);

const styles = StyleSheet.create({
  card: { borderRadius: 16, backgroundColor: C.card, borderWidth: 1 },
  lit: { borderColor: ACCENT, borderWidth: 2 },
  top: { flexDirection: 'row', alignItems: 'stretch' },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  checkbox: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: ACCENT },
  checkboxOff: { borderWidth: 1, borderColor: C.z700 },
  moves: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagOn: { backgroundColor: C.line },
  more: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line },
});
