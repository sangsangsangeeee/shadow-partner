import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Toast } from '@toss/tds-react-native';
import {
  ACCENT,
  C,
  LAYER,
  MAXW,
  TOUCH,
} from '../../commons/constants';
import { parseCombo, resolveName } from '../../commons/utils';
import {
  Check,
  ListOrdered,
  Megaphone,
  Plus,
  SettingsIcon,
  Tap,
  Typo,
  Timer,
  useCoachVoice,
  X,
} from '../../commons/components';
import {
  useKeyboardHeight,
  useLatestRef,
  useTimerBank,
} from '../../commons/hooks';
import { useCallouts, useTraining, UNDO_MS } from './hooks';
import { useMaterialContext } from './MaterialContext';
import { AddMoveSheet, ComboChips, DoneOverlay, MovePickerSheet, SettingsSheet } from './parts';
import { CombosView, TrainView, WordsView } from './views';
import type {
  Beats,
  Combo,
  Kind,
  Labels,
  Move,
  Settings,
  Tab,
} from '../../commons/types';
import { useSafeAreaInsets } from '@granite-js/native/react-native-safe-area-context';



const TABS: { id: Tab; label: string; icon: typeof Timer }[] = [
  { id: 'train', label: '훈련', icon: Timer },
  { id: 'combos', label: '콤보', icon: ListOrdered },
  { id: 'words', label: '호출어', icon: Megaphone },
];

export default function ShadowCoach() {
  return <Screen />;
}

function Screen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  /* 저장되는 훈련 자료는 전부 한 리듀서에 있다. 별도 화면이 된 동작 고르기·추가와도 나눠 쓴다. */
  const { state: material, dispatch, moveMap, alias, allMoves, label, beatOf } = useMaterialContext();
  const { combos, settings, labels, customMoves, beats, undo } = material;

  const [tab, setTab] = useState<Tab>('train');

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addMoveOpen, setAddMoveOpen] = useState(false);

  const [wordKind, setWordKind] = useState<Kind>('punch');

  const [comboHint, setComboHint] = useState('');
  const kb = useKeyboardHeight();

  /** 콤보 미리듣기 전용. 훈련 진행 예약과 섞이면 안 된다. */
  const previewTimers = useTimerBank();

  const voice = useCoachVoice();

  /* ---- 파생값 ---- */

  /* 타이머 콜백 안에서 읽을 최신값. 의존성에 넣으면 타이머가 다시 만들어져 끊긴다. */
  const voiceRef = useLatestRef(voice);
  const stRef = useLatestRef(settings);
  const labelRef = useLatestRef<Labels>(labels);
  const moveRef = useLatestRef<Record<string, Move>>(moveMap);
  /* 목록을 읽어야 하는 콜백이 신원을 잃지 않도록 ref로 본다. */
  const customMovesRef = useLatestRef(customMoves);
  const beatsRef = useLatestRef<Beats>(beats);

  /**
   * 콜백 안에서 쓰는 이름 조회. label과 결과는 같지만 신원이 고정돼 있다.
   * label 쪽은 이름이 바뀌면 신원도 바뀌어야 memo를 건 자식이 다시 그려지므로 따로 둔다.
   */
  const nameOf = useCallback(
    (id: string) => resolveName(id, labelRef.current, moveRef.current),
    [labelRef, moveRef]
  );

  const parsed = useMemo(() => parseCombo(draft, alias), [draft, alias]);
  const dupCombo = parsed.moves.length
    ? (combos.find((c) => c.id !== editingId && c.moves.join('>') === parsed.moves.join('>')) ?? null)
    : null;
  const canSave = parsed.moves.length > 0 && !dupCombo;
  const saveFabShown = tab === 'combos' && draft.trim().length > 0;
  const anyFabShown = saveFabShown || tab === 'words';

  /* ---- 소리 ---- */

  const speak = useCallback((text: string) => {
    const st = stRef.current;
    voiceRef.current.speak(text, st.rate, st.voiceURI);
  }, []);

  const speakMove = useCallback(
    (id: string) => {
      const custom = labelRef.current[id];
      const m = moveRef.current[id];
      speak(custom && custom.trim() ? custom.trim() : m ? m.name : '');
    },
    [speak]
  );

  const hush = useCallback(() => voiceRef.current.hush(), []);
  const prime = useCallback(() => voiceRef.current.prime(), []);

  /* ---- 훈련 ---- */

  /* 아래 층은 콤보를 소리로 푸는 일만, 위 층은 라운드를 굴리는 일만 안다. */
  const callouts = useCallouts({ settings, moveMap, beats, speakMove, hush });
  const training = useTraining({ settings, combos, callouts, voice, speak });

  const { stats } = callouts;
  const { phase, running, start, stop } = training;

  // 타이머 묶음·만료 상태·화면 잠금은 각자의 훅이 언마운트에서 스스로 치운다.
  useEffect(() => () => voiceRef.current.hush(), [voiceRef]);

  /* ---- 음성 입력 (보류) ----
     웹판에는 Web Speech API 기반 콤보 받아쓰기가 주석으로 남아 있었다.
     RN에는 대응 API가 없어 네이티브 음성 인식 모듈이 필요하다. 기획이 정리되면 되살린다. */

  /* ---- 콤보 ---- */

  /** 칩을 지우면 입력창 텍스트가 다시 써진다. 미인식 토큰은 그대로 보존. */
  const removeChip = (idx: number) => {
    const kept = parsed.moves.filter((_, i) => i !== idx);
    setDraft([...kept.map((id) => label(id)), ...parsed.unknown].join(' '));
    setComboHint('');
  };

  const saveCombo = () => {
    if (!parsed.moves.length) {
      setComboHint(
        draft.trim()
          ? '적은 말을 못 알아들었어. 아래 목록에서 골라보거나, 호출어 탭에서 동작을 추가해줘.'
          : `먼저 콤보를 적어줘. 예: ${label('jab')} ${label('jab')} ${label('cross')} ${label('lowkick')}`
      );
      return;
    }
    if (dupCombo) {
      setComboHint(
        dupCombo.on ? '이미 같은 콤보가 있어. 아래 목록에서 확인해봐.' : '이미 같은 콤보가 있는데 훈련에서 빠져 있어.'
      );
      return;
    }
    setComboHint('');
    if (editingId) {
      dispatch({ type: 'replaceCombo', id: editingId, moves: parsed.moves });
      setEditingId(null);
    } else {
      dispatch({ type: 'addCombo', moves: parsed.moves });
    }
    setDraft('');
    Keyboard.dismiss();
  };

  const removeCombo = useCallback((c: Combo) => dispatch({ type: 'removeCombo', id: c.id }), [dispatch]);

  const toggleCombo = useCallback((c: Combo) => dispatch({ type: 'toggleCombo', id: c.id }), [dispatch]);


  // 토스트가 이 둘을 시계 이펙트의 의존성으로 잡는다. 매 렌더 새 함수를 주면 시계가 계속 되감긴다.
  const restoreUndo = useCallback(() => dispatch({ type: 'restoreUndo' }), [dispatch]);
  const dismissUndo = useCallback(() => dispatch({ type: 'dismissUndo' }), [dispatch]);

  const editCombo = useCallback(
    (c: Combo) => {
      setEditingId(c.id);
      setDraft(c.moves.map(nameOf).join(' '));
      setTab('combos');
    },
    [nameOf]
  );
  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const previewCombo = useCallback(
    (c: Combo) => {
      prime();
      hush();
      previewTimers.clearAll();
      let t = 0;
      c.moves.forEach((mid) => {
        const m = moveRef.current[mid];
        if (!m) return;
        previewTimers.later(() => speakMove(mid), t);
        const b = beatsRef.current[mid];
        t += Math.round(((typeof b === 'number' ? b : m.beat) * 1000) / stRef.current.tempo);
      });
    },
    [prime, hush, previewTimers, speakMove, moveRef, beatsRef, stRef]
  );

  /* ---- 호출어 / 동작 ---- */

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    dispatch({ type: 'patchSettings', patch: { [k]: v } as Partial<Settings> });

  const applyNumbers = () => dispatch({ type: 'applyNumberLabels' });
  const resetBaseLabels = () => dispatch({ type: 'resetBaseMoves' });

  /** 이름 중복만 여기서 막는다. 별칭 사전이 화면 쪽에 있기 때문이다. */

  /*
   * 호출어 목록의 한 줄이 부르는 것들. 전부 신원이 고정돼야 memo가 산다.
   * dispatch는 리액트가 신원을 보장하므로 목록을 ref로 들고 있을 필요가 없어졌다.
   */

  /** 직접 추가한 동작은 이름 자체를, 기본 동작은 얹은 호출어를 고친다. */
  const changeWordName = useCallback(
    (id: string, v: string) => {
      if (customMovesRef.current.some((m) => m.id === id)) {
        dispatch({ type: 'renameMove', id, name: v });
      } else {
        dispatch({ type: 'setLabel', id, value: v });
      }
    },
    [customMovesRef, dispatch]
  );

  const changeWordBeat = useCallback(
    (id: string, beat: number) => dispatch({ type: 'setBeat', id, beat }),
    [dispatch]
  );

  const resetWord = useCallback((id: string) => dispatch({ type: 'resetMove', id }), [dispatch]);

  const previewWord = useCallback(
    (id: string) => {
      prime();
      speakMove(id);
    },
    [prime, speakMove]
  );

  const deleteMove = useCallback((id: string) => dispatch({ type: 'removeMove', id }), [dispatch]);

  /* ---- 시트 ---- */

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const openSheet = useCallback(() => setSheetOpen(true), []);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const openAddMove = useCallback(() => setAddMoveOpen(true), []);
  const closeAddMove = useCallback(() => setAddMoveOpen(false), []);

  /* 방금 넣은 동작이 지금 보고 있는 분류가 아니면 목록에 없는 것처럼 보인다. 그 분류로 옮겨준다. */
  const afterAddMove = useCallback((kind: Kind) => setWordKind(kind), []);

  const changeDraft = useCallback((text: string) => {
    setDraft(text);
    setComboHint('');
  }, []);

  const setAllCombos = useCallback((on: boolean) => dispatch({ type: 'setAllCombos', on }), [dispatch]);

  /** 중복 안내에서 다시 넣기. 입력칸은 비우고 그 카드로 데려간다. */
  const enableCombo = useCallback(
    (id: string) => {
      dispatch({ type: 'enableCombo', id });
      setDraft('');
      setComboHint('');
    },
    [dispatch]
  );

  /* ---- 렌더 ---- */

  const ready = combos.filter((c) => c.on && c.moves.length).length;
  const wordList = allMoves.filter((m) => m.kind === wordKind);

  const bottomSafe = insets.bottom;

  const scrollPad = (tab === 'combos' ? (saveFabShown ? 192 : 128) : 160) + bottomSafe;

  /* 탭바를 화면 밖까지 정확히 밀려면 자기 높이를 알아야 한다. 재서 쓴다. */
  const [tabH, setTabH] = useState(0);
  const tabSlide = useRef(new Animated.Value(0)).current;

  /* 탭바가 zIndex 40이라 TDS 시트(zIndex 없음) 위로 올라온다. 어느 시트가 열려도 비켜줘야 한다. */
  const anySheetOpen = sheetOpen || pickerOpen || addMoveOpen;

  useEffect(() => {
    Animated.timing(tabSlide, {
      toValue: anySheetOpen ? tabH + LAYER.tabBar + bottomSafe : 0,
      // 기획서 3장이 정한 오르내림 속도(220~280ms)를 그대로 쓴다.
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [anySheetOpen, tabH, bottomSafe, tabSlide]);

  const goTab = (id: Tab) => {
    setTab(id);
    // 다른 탭으로 넘어가면 방금 지운 것을 되돌릴 기회는 접는다.
    dispatch({ type: 'dismissUndo' });
  };

  return (
    <View style={styles.root}>
      {/* ---------- 헤더 ---------- */}
      <View
        style={[styles.header, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            {tab === 'train' ? (
              <Tap onPress={() => setSheetOpen(true)} accessibilityLabel="설정" style={styles.headerBtn}>
                <SettingsIcon size={24} color={C.z600} />
              </Tap>
            ) : null}
          </View>
        </View>
      </View>

      {tab === 'train' ? (
        <TrainView
          training={training}
          callouts={callouts}
          settings={settings}
          label={label}
          beatOf={beatOf}
          moveMap={moveMap}
          readyCount={ready}
          windowWidth={winW}
          bottomSafe={bottomSafe}
          onOpenSettings={openSheet}
        />
      ) : null}

      {tab === 'combos' ? (
        <CombosView
          combos={combos}
          draft={draft}
          onDraftChange={changeDraft}
          parsed={parsed}
          duplicate={dupCombo}
          hint={comboHint}
          label={label}
          readyCount={ready}
          bottomPad={scrollPad}
          onRemoveChip={removeChip}
          onOpenPicker={openPicker}
          onSetAll={setAllCombos}
          onToggle={toggleCombo}
          onPreview={previewCombo}
          onEdit={editCombo}
          onRemove={removeCombo}
          onEnable={enableCombo}
        />
      ) : null}

      {tab === 'words' ? (
        <WordsView
          moves={wordList}
          kind={wordKind}
          onKindChange={setWordKind}
          labels={labels}
          beats={beats}
          label={label}
          beatOf={beatOf}
          bottomPad={scrollPad}
          onApplyNumbers={applyNumbers}
          onResetBase={resetBaseLabels}
          onChangeName={changeWordName}
          onChangeBeat={changeWordBeat}
          onReset={resetWord}
          onDelete={deleteMove}
          onPreview={previewWord}
        />
      ) : null}


      {/* ---------- 저장 / 동작 추가 (z 30) ---------- */}
      {/* FAB도 시트 위로 떠오른다(z 30 vs 시트 zIndex 없음). 시트가 열리면 걷어낸다. */}
      {tab === 'combos' && saveFabShown && !anySheetOpen ? (
        <View style={[styles.fabLayer, { bottom: (kb > 0 ? kb + 16 : LAYER.fab + bottomSafe) }]} pointerEvents="box-none">
          <View style={[styles.inner, styles.fabRow]} pointerEvents="box-none">
            {editingId ? (
              <Tap onPress={cancelEdit} accessibilityLabel="수정 취소" style={styles.fabRound}>
                <X size={20} color={C.z400} />
              </Tap>
            ) : null}
            <Tap onPress={saveCombo} style={[styles.fabPill, canSave ? styles.fabPillOn : styles.fabPillOff]}>
              {editingId ? <Check size={20} color={canSave ? C.white : C.z500} /> : <Plus size={20} color={canSave ? C.white : C.z500} />}
              <Typo level="button" weight="semibold" color={C.white}>
                {editingId ? '수정 저장' : '콤보 저장'}
              </Typo>
            </Tap>
          </View>
        </View>
      ) : null}

      {tab === 'words' && !anySheetOpen ? (
        <View style={[styles.fabLayer, { bottom: (kb > 0 ? kb + 16 : LAYER.fab + bottomSafe) }]} pointerEvents="box-none">
          <View style={[styles.inner, styles.fabEnd]} pointerEvents="box-none">
            <Tap
              onPress={openAddMove}
              accessibilityLabel="동작 추가"
              style={styles.fabCircle}
            >
              <Plus size={24} color={C.white} />
            </Tap>
          </View>
        </View>
      ) : null}

      {/* ---------- 되돌리기 토스트 ---------- */}
      {/*
        TDS Toast는 자리를 스스로 잡는다 — bottomOffset에 하단 안전영역을 더해서 깐다.
        그래서 여기서는 안전영역을 빼고 넘긴다. 두 번 더하면 그만큼 떠버린다.
        훈련 탭에서는 띄우지 않는다(기획서 9장). 삭제는 콤보·호출어 탭에서만 일어나고
        탭을 옮기면 goTab이 정리하므로, 안 떠 있는 동안 시계가 멈춰 있을 일은 없다.
      */}
      <Toast
        open={undo != null && tab !== 'train'}
        text={undo?.text ?? ''}
        duration={UNDO_MS}
        bottomOffset={kb > 0 ? kb + 80 - bottomSafe : anyFabShown ? LAYER.toastWithFab : LAYER.toastAlone}
        onClose={dismissUndo}
        button={<Toast.Button onPress={restoreUndo}>되돌리기</Toast.Button>}
      />

      {/* ---------- 탭바 (z 40) ---------- */}
      <Animated.View
        style={[
          styles.tabLayer,
          { bottom: LAYER.tabBar + bottomSafe, transform: [{ translateY: tabSlide }] },
        ]}
        pointerEvents={anySheetOpen ? 'none' : 'box-none'}
        onLayout={(e) => setTabH(e.nativeEvent.layout.height)}
      >
        <View style={styles.tabBar}>
          {TABS.map(({ id, label: l, icon: IconCmp }) => {
            const on = tab === id;
            return (
              <Tap
                key={id}
                onPress={() => goTab(id)}
                accessibilityLabel={l}
                style={[styles.tabItem, on ? styles.tabItemOn : null]}
              >
                <IconCmp size={16} color={on ? C.white : C.z500} />
                <Typo level="caption" color={C.white}>{l}</Typo>
              </Tap>
            );
          })}
        </View>
      </Animated.View>

      <DoneOverlay
        visible={phase === 'done'}
        settings={settings}
        stats={stats}
        onRestart={start}
        onQuit={stop}
      />
      <MovePickerSheet
        open={pickerOpen}
        onClose={closePicker}
        moves={allMoves}
        label={label}
        onPick={(id) => {
          setDraft((prev) => (prev ? prev + ' ' + label(id) : label(id)));
          setComboHint('');
        }}
        chips={<ComboChips moves={parsed.moves} label={label} onRemove={removeChip} />}
        hasPicked={parsed.moves.length > 0}
      />
      <AddMoveSheet open={addMoveOpen} onClose={closeAddMove} onAdded={afterAddMove} />
      <SettingsSheet
        open={sheetOpen}
        onClose={closeSheet}
        settings={settings}
        onChange={set}
        running={running}
        voices={voice.voices}
        onTestSound={() => {
          prime();
          speak(`${label('jab')} ${label('cross')} ${label('lowkick')}`);
        }}
      />

      {voice.engine}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  inner: { width: '100%', maxWidth: MAXW, alignSelf: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', height: 36 },
  headerBtn: { width: TOUCH, height: TOUCH, alignItems: 'flex-end', justifyContent: 'center' },

  fabLayer: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20, zIndex: LAYER.zFab },
  fabRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  fabEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  fabRound: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, height: 56, borderRadius: 28, elevation: 6 },
  fabPillOn: { backgroundColor: ACCENT },
  fabPillOff: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },

  tabLayer: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20, alignItems: 'center', zIndex: LAYER.zTabBar },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 4,
    elevation: 8,
  },
  tabItem: { alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 6, borderRadius: 12 },
  tabItemOn: { backgroundColor: ACCENT },

});
