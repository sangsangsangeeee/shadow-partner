import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AlertCircle, Tap, Typo } from '../../../commons/components';
import { useExpiringState } from '../../../commons/hooks';
import { ACCENT, C, COMBO_SIZE, MAXW } from '../../../commons/constants';
import type { Combo } from '../../../commons/types';
import type { ComboDraft } from '../hooks';
import { ComboCard, SlotRow, TapStage } from '../parts';

/** 초안을 움직이는 손들. 화면이 한 벌로 묶어 넘긴다 — 낱개로 받으면 prop이 스무 개가 된다. */
export type DraftEditor = {
  onTap: (at: number) => void;
  onFinish: () => void;
  onCancel: () => void;
  onRetap: () => void;
  onListen: () => void;
  onTextChange: (text: string) => void;
  /** 자리를 눌렀다. 채워진 자리는 비우고, 빈 자리는 고르기 시트를 연다. */
  onSlotPress: (index: number) => void;
};

type Props = {
  combos: Combo[];
  draft: ComboDraft;
  editor: DraftEditor;
  /** 같은 콤보가 이미 있으면 그것. */
  duplicate: Combo | null;
  label: (id: string) => string;
  /** 훈련에 들어간 콤보 수. */
  readyCount: number;
  /** 떠 있는 것들에 가리지 않도록 비워 둘 아래 여백. */
  bottomPad: number;
  onSetAll: (on: boolean) => void;
  onToggle: (combo: Combo) => void;
  onPreview: (combo: Combo) => void;
  onEdit: (combo: Combo) => void;
  onRemove: (combo: Combo) => void;
  /** 중복 안내에서 "훈련에 다시 넣기"를 눌렀을 때. */
  onEnable: (id: string) => void;
};

/** 강조가 풀리기까지(ms). 눈이 따라간 뒤 조용히 사라질 만큼. */
const HIGHLIGHT_MS = 2400;
/** 찾아간 카드가 화면 위쪽에 걸리도록 남기는 여백. */
const REVEAL_OFFSET = 140;

/** 안내문 한 줄 높이. 아이콘을 첫 줄 가운데에 맞추는 데 같은 값을 쓴다. */
const HELP_LINE = 19;

/**
 * 콤보 탭. 기획서 4.4.
 *
 * 무대와 슬롯 줄은 스크롤 밖에 있다 — 스크롤 안에 두면 세로로 끌리는 손이 탭을 먹는다.
 * 펼친 메뉴·강조·스크롤 위치는 이 화면 밖에서 쓸 일이 없어 전부 여기서 들고 있는다.
 * 카드 목록은 memo가 걸려 있으므로 아래 콜백들의 신원이 흔들리면 안 된다.
 */
export function CombosView({
  combos,
  draft,
  editor,
  duplicate,
  label,
  readyCount,
  bottomPad,
  onSetAll,
  onToggle,
  onPreview,
  onEdit,
  onRemove,
  onEnable,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const highlight = useExpiringState<string>(HIGHLIGHT_MS);

  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);
  const cardYRef = useRef<Record<string, number>>({});

  const measureCard = useCallback((id: string, y: number) => {
    cardYRef.current[id] = y;
  }, []);

  const toggleMenu = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  /** 목록에서 그 카드로 굴려 가고 잠깐 테두리를 밝힌다. */
  const reveal = useCallback(
    (id: string) => {
      const y = cardYRef.current[id];
      const sv = scrollRef.current;
      if (y !== undefined && sv) {
        sv.scrollTo({ y: Math.max(0, listTopRef.current + y - REVEAL_OFFSET), animated: true });
      }
      highlight.show(id);
    },
    [highlight]
  );

  // 카드에서 메뉴를 고른 뒤에는 메뉴를 닫아 둔다.
  const handlePreview = useCallback((c: Combo) => onPreview(c), [onPreview]);
  const handleEdit = useCallback(
    (c: Combo) => {
      setExpandedId(null);
      onEdit(c);
    },
    [onEdit]
  );
  const handleRemove = useCallback(
    (c: Combo) => {
      setExpandedId(null);
      onRemove(c);
    },
    [onRemove]
  );

  const slotLabel = useCallback(
    (i: number, id: string | null) => (id ? `${label(id)} 비우기` : `${i + 1}번째 자리`),
    [label]
  );

  const allOn = combos.every((c) => c.on);
  const tapping = draft.stage === 'tapping';
  const inSlots = draft.stage === 'slots';
  const emptyCount = draft.slots.filter((s) => s == null).length;

  return (
    <View style={styles.flex}>
      <View style={[styles.pad, styles.inner]}>
        {inSlots ? (
          <View style={styles.slotHead}>
            <View style={styles.slotRow}>
              <SlotRow
                slots={draft.slots}
                cursor={draft.cursor}
                label={label}
                onPress={editor.onSlotPress}
                pressLabel={slotLabel}
              />
            </View>
            {draft.rhythm.length ? (
              <Typo level="caption" color={C.z600} style={styles.gapText}>
                간격 {draft.rhythm.map((g) => g.toFixed(2)).join(' · ')}초
              </Typo>
            ) : null}
            <View style={styles.row}>
              <Tap onPress={editor.onRetap} accessibilityLabel="다시 두드리기" style={styles.ghost}>
                <Typo level="caption" color={C.z300} style={styles.btnText}>다시 두드리기</Typo>
              </Tap>
              <Tap onPress={editor.onListen} accessibilityLabel="초안 듣기" style={styles.ghost}>
                <Typo level="caption" color={C.z300} style={styles.btnText}>듣기</Typo>
              </Tap>
              <Tap onPress={editor.onCancel} accessibilityLabel="초안 취소" style={styles.ghost}>
                <Typo level="caption" color={C.z300} style={styles.btnText}>취소</Typo>
              </Tap>
            </View>
          </View>
        ) : (
          <TapStage
            stage={draft.stage}
            count={draft.taps.length}
            recording={draft.recording}
            onTap={editor.onTap}
            onFinish={editor.onFinish}
            onCancel={editor.onCancel}
          />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.pad, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!tapping}
      >
        {/* 두드리는 동안 목록은 죽는다. 무대 밖으로 흐른 손이 카드를 누르면 안 된다. */}
        <View style={[styles.inner, tapping ? styles.dead : null]} pointerEvents={tapping ? 'none' : 'auto'}>
          {inSlots ? (
            <>
              <TextInput
                value={draft.text}
                onChangeText={editor.onTextChange}
                placeholder={`${label('jab')} ${label('jab')} ${label('cross')} ${label('lowkick')}`}
                placeholderTextColor={C.z700}
                style={styles.input}
              />

              {!draft.text.trim() ? (
                <View style={styles.helpRow}>
                  {/* 글자는 줄 높이의 가운데에 그려진다. 아이콘도 같은 상자에 넣어야 첫 줄과 맞물린다. */}
                  <View style={styles.helpIcon}>
                    <AlertCircle size={14} color={C.z600} />
                  </View>
                  <Typo level="caption" color={C.z600} style={styles.helpText}>
                    자리를 눌러 고르거나, 한 줄로 적어도 돼 —{' '}
                    {`${label('jab')}${label('jab')}${label('cross')}`} ·{' '}
                    {`${label('jab')} ${label('jab')} ${label('cross')}`} · 1-2{'\n'}
                    붙여 써도, 쉼표를 찍어도, 번호로 써도 다 같게 인식해.
                  </Typo>
                </View>
              ) : null}

              {draft.hint ? (
                <View style={styles.notice}>
                  <Typo level="caption" color={C.white} style={styles.noteText}>{draft.hint}</Typo>
                </View>
              ) : null}

              {duplicate ? (
                <View style={styles.dupBox}>
                  <Typo level="caption" color={C.white} style={styles.noteText}>
                    {duplicate.on ? '이미 저장된 콤보야.' : '이미 저장돼 있는데 훈련에서 빠져 있어.'}
                  </Typo>
                  <View style={styles.dupRow}>
                    <Tap onPress={() => reveal(duplicate.id)} style={styles.dupBtn}>
                      <Typo level="caption" color={C.z300} style={styles.noteText}>목록에서 보기</Typo>
                    </Tap>
                    {!duplicate.on ? (
                      <Tap
                        onPress={() => {
                          onEnable(duplicate.id);
                          reveal(duplicate.id);
                        }}
                        style={styles.dupBtnAccent}
                      >
                        <Typo level="caption" weight="medium" color={C.white} style={styles.noteText}>훈련에 다시 넣기</Typo>
                      </Tap>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {draft.overflow > 0 ? (
                <Typo level="caption" color={C.white} style={styles.unknownText}>
                  두드린 건 {draft.slots.length}개, 적은 건 {draft.slots.length + draft.overflow}개야. 뒤의 {draft.overflow}개는 안 들어갔어.
                </Typo>
              ) : null}

              {draft.unknown.length > 0 ? (
                <Typo level="caption" color={C.white} style={styles.unknownText}>
                  못 알아들음: {draft.unknown.join(', ')} — 호출어 탭에서 추가할 수 있어.
                </Typo>
              ) : null}

              {emptyCount > 0 && !draft.unknown.length && !draft.hint ? (
                <Typo level="caption" color={C.z600} style={styles.unknownText}>빈 자리 {emptyCount}개.</Typo>
              ) : null}
            </>
          ) : null}

          {combos.length > 0 ? (
            <View style={styles.listHead}>
              <Typo level="caption" color={C.z600} style={styles.metaText}>
                콤보 {combos.length}개 · {readyCount}개 사용
              </Typo>
              <Tap onPress={() => onSetAll(!allOn)} style={styles.listHeadBtn}>
                <Typo level="caption" color={C.z500}>{allOn ? '전체 해제' : '전체 선택'}</Typo>
              </Tap>
            </View>
          ) : null}

          <View
            style={styles.cardList}
            onLayout={(e) => {
              listTopRef.current = e.nativeEvent.layout.y;
            }}
          >
            {combos.length === 0 ? (
              <Typo level="small" color={C.z700} style={styles.itemText}>아직 콤보가 없어.</Typo>
            ) : null}
            {combos.map((c) => (
              <ComboCard
                key={c.id}
                combo={c}
                expanded={expandedId === c.id}
                lit={highlight.value === c.id}
                label={label}
                onToggle={onToggle}
                onToggleMenu={toggleMenu}
                onPreview={handlePreview}
                onEdit={handleEdit}
                onRemove={handleRemove}
                onMeasure={measureCard}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  inner: { width: '100%', maxWidth: MAXW, alignSelf: 'center' },
  dead: { opacity: 0.3 },

  slotHead: { marginBottom: 12 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  gapText: { fontSize: COMBO_SIZE.meta, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  ghost: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  btnText: { fontSize: COMBO_SIZE.note },

  input: {
    width: '100%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: COMBO_SIZE.input,
    color: C.white,
    marginBottom: 12,
  },
  itemText: { fontSize: COMBO_SIZE.item },
  noteText: { fontSize: COMBO_SIZE.note },
  metaText: { fontSize: COMBO_SIZE.meta },
  /* 아래 목록에 붙지 않도록 다른 안내들과 같은 여백을 준다. */
  unknownText: { fontSize: COMBO_SIZE.note, marginBottom: 12 },
  helpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  helpIcon: { height: HELP_LINE, alignItems: 'center', justifyContent: 'center' },
  helpText: { flex: 1, fontSize: COMBO_SIZE.help, lineHeight: HELP_LINE, color: C.z600 },
  notice: { backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },

  dupBox: { marginBottom: 12, backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  dupRow: { flexDirection: 'row', gap: 8 },
  dupBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: C.line },
  dupBtnAccent: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: ACCENT },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  listHeadBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  cardList: { gap: 8 },
});
