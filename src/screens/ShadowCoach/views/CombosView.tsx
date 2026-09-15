import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Typo, Tap } from '../../../commons/components';
import { C, COMBO_SIZE, MAXW } from '../../../commons/constants';
import type { Combo } from '../../../commons/types';
import type { ComboDraft } from '../hooks';
import { ComboCard, RecordStage } from '../parts';

/** 무대를 움직이는 손들. 화면이 한 벌로 묶어 넘긴다 — 낱개로 받으면 prop이 열 개가 넘는다. */
export type DraftEditor = {
  onArm: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onListen: () => void;
  onNameChange: (text: string) => void;
  onSubmit: () => void;
};

type Props = {
  combos: Combo[];
  draft: ComboDraft;
  editor: DraftEditor;
  /** 녹음 중 경과 초. */
  elapsed: number;
  /** 이름 단계에서 보여줄 녹음 길이(ms). */
  clipMs: number;
  micAvailable: boolean | null;
  /** 훈련에 들어간 콤보 수. */
  readyCount: number;
  /** 떠 있는 것들에 가리지 않도록 비워 둘 아래 여백. */
  bottomPad: number;
  onSetAll: (on: boolean) => void;
  onToggle: (combo: Combo) => void;
  onPreview: (combo: Combo) => void;
  onEdit: (combo: Combo) => void;
  onRerecord: (combo: Combo) => void;
  onRemove: (combo: Combo) => void;
};

/**
 * 콤보 탭. 기획서 4.4.
 *
 * 무대는 스크롤 밖에 있다 — 스크롤 안에 두면 세로로 끌리는 손이 무대를 먹는다.
 * 펼친 메뉴는 이 화면 밖에서 쓸 일이 없어 여기서 들고 있는다.
 * 카드 목록은 memo가 걸려 있으므로 아래 콜백들의 신원이 흔들리면 안 된다.
 */
export function CombosView({
  combos,
  draft,
  editor,
  elapsed,
  clipMs,
  micAvailable,
  readyCount,
  bottomPad,
  onSetAll,
  onToggle,
  onPreview,
  onEdit,
  onRerecord,
  onRemove,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleMenu = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // 카드에서 메뉴를 고른 뒤에는 메뉴를 닫아 둔다.
  const handlePreview = useCallback((c: Combo) => onPreview(c), [onPreview]);
  const handleEdit = useCallback(
    (c: Combo) => {
      setExpandedId(null);
      onEdit(c);
    },
    [onEdit]
  );
  const handleRerecord = useCallback(
    (c: Combo) => {
      setExpandedId(null);
      onRerecord(c);
    },
    [onRerecord]
  );
  const handleRemove = useCallback(
    (c: Combo) => {
      setExpandedId(null);
      onRemove(c);
    },
    [onRemove]
  );

  const allOn = combos.length > 0 && combos.every((c) => c.on);
  const recording = draft.stage === 'recording';

  return (
    <View style={styles.flex}>
      <View style={[styles.pad, styles.inner]}>
        <RecordStage
          stage={draft.stage}
          recording={draft.recording}
          elapsed={elapsed}
          clipMs={clipMs}
          name={draft.name}
          micAvailable={micAvailable}
          onArm={editor.onArm}
          onFinish={editor.onFinish}
          onCancel={editor.onCancel}
          onListen={editor.onListen}
          onNameChange={editor.onNameChange}
          onSubmit={editor.onSubmit}
        />
        {draft.hint ? (
          <View style={styles.notice}>
            <Typo level="caption" color={C.white} style={styles.noteText}>{draft.hint}</Typo>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.pad, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!recording}
      >
        {/* 녹음 중에는 목록이 죽는다. 무대 밖으로 흐른 손이 카드를 누르면 안 된다(기획서 4.4). */}
        <View style={[styles.inner, recording ? styles.dead : null]} pointerEvents={recording ? 'none' : 'auto'}>
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

          <View style={styles.cardList}>
            {combos.length === 0 ? (
              <Typo level="small" color={C.z700} style={styles.itemText}>눌러서 첫 콤보를 녹음해</Typo>
            ) : null}
            {combos.map((c) => (
              <ComboCard
                key={c.id}
                combo={c}
                expanded={expandedId === c.id}
                onToggle={onToggle}
                onToggleMenu={toggleMenu}
                onPreview={handlePreview}
                onEdit={handleEdit}
                onRerecord={handleRerecord}
                onRemove={handleRemove}
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

  itemText: { fontSize: COMBO_SIZE.item },
  noteText: { fontSize: COMBO_SIZE.note },
  metaText: { fontSize: COMBO_SIZE.meta },
  notice: { backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  listHeadBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  cardList: { gap: 8 },
});
