import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CardAction,
  Check,
  MoreHorizontal,
  RotateCcw,
  Tap,
  Trash2,
  Typo,
  Volume2,
} from '../../../commons/components';
import { ACCENT, C, COMBO_SIZE } from '../../../commons/constants';
import { secs } from '../../../commons/utils';
import type { Combo } from '../../../commons/types';

/** 이름 한 줄 높이 = `item` 글자 줄 높이. 체크박스를 그 가운데에 맞춘다. */
const NAME_LINE = 25.5;
const CHECK_SIZE = 24;

type Props = {
  combo: Combo;
  /** 더보기 메뉴가 펼쳐져 있는가. */
  expanded: boolean;
  /** 훈련에 넣고 빼기. */
  onToggle: (combo: Combo) => void;
  onToggleMenu: (id: string) => void;
  onPreview: (combo: Combo) => void;
  onEdit: (combo: Combo) => void;
  onRerecord: (combo: Combo) => void;
  onRemove: (combo: Combo) => void;
};

/**
 * 콤보 한 장. 기획서 4.4.
 *
 * 콤보 20개를 띄워 놓고 하나를 켜고 끌 때 스무 장이 전부 다시 그려지지 않도록 memo를 건다.
 * 그러려면 부모가 넘기는 콜백이 렌더마다 새로 만들어지면 안 된다. 전부 콤보를 인자로 받는다.
 */
function ComboCardView({
  combo,
  expanded,
  onToggle,
  onToggleMenu,
  onPreview,
  onEdit,
  onRerecord,
  onRemove,
}: Props) {
  return (
    <View style={[styles.card, { borderColor: combo.on ? ACCENT : C.line }]}>
      <View style={styles.top}>
        <Tap
          onPress={() => onToggle(combo)}
          accessibilityLabel={combo.on ? '훈련에서 빼기' : '훈련에 넣기'}
          style={styles.main}
        >
          {/* TDS Checkbox는 트랙이 blue500 고정이라 액센트를 못 얹는다. 상태만 보여주면 되는 자리다. */}
          <View style={[styles.checkbox, combo.on ? styles.checkboxOn : styles.checkboxOff]}>
            {combo.on ? <Check size={16} color={C.white} /> : null}
          </View>
          <View style={styles.body}>
            <Typo level="item" color={combo.on ? C.white : C.z500} style={styles.name}>{combo.name}</Typo>
            <Typo level="caption" color={C.z600} style={styles.meta}>{secs(combo.ms)}</Typo>
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
          <CardAction icon={Check} label="이름 고치기" onPress={() => onEdit(combo)} />
          <CardAction icon={RotateCcw} label="다시 녹음" onPress={() => onRerecord(combo)} />
          <CardAction icon={Trash2} label="삭제" onPress={() => onRemove(combo)} />
        </View>
      ) : null}
    </View>
  );
}

export const ComboCard = React.memo(ComboCardView);

const styles = StyleSheet.create({
  card: { borderRadius: 16, backgroundColor: C.card, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'stretch' },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  checkbox: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    marginTop: (NAME_LINE - CHECK_SIZE) / 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: ACCENT },
  checkboxOff: { borderWidth: 1, borderColor: C.z700 },
  body: { flex: 1 },
  name: { fontSize: COMBO_SIZE.item },
  meta: { fontSize: COMBO_SIZE.meta },
  more: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line },
});
