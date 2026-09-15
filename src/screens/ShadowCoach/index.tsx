import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Animated, Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Toast } from '@toss/tds-react-native';
import { ACCENT, C, LAYER, MAXW, RECORD_MAX_MS, TOAST_MS, TOUCH } from '../../commons/constants';
import { clipPlan } from '../../commons/utils';
import {
  Check,
  ListOrdered,
  Plus,
  SettingsIcon,
  Tap,
  Typo,
  Timer,
  useCoachVoice,
  X,
} from '../../commons/components';
import { useKeyboardHeight, useLatestRef, useTimerBank } from '../../commons/hooks';
import { comboDraftReducer, INITIAL_DRAFT, useCallouts, useTraining } from './hooks';
import { useMaterialContext } from './MaterialContext';
import { DoneOverlay, SettingsSheet } from './parts';
import { CombosView, TrainView, type DraftEditor } from './views';
import type { Clips, Combo, Settings, Tab } from '../../commons/types';
import { useSafeAreaInsets } from '@granite-js/native/react-native-safe-area-context';

const TABS: { id: Tab; label: string; icon: typeof Timer }[] = [
  { id: 'train', label: '훈련', icon: Timer },
  { id: 'combos', label: '콤보', icon: ListOrdered },
];

/** 녹음 중 경과 초를 세는 주기(ms). 자료가 아니라 무대가 보여주는 숫자다. */
const ELAPSED_TICK = 100;

export default function ShadowCoach() {
  return <Screen />;
}

function Screen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  const { state: material, dispatch } = useMaterialContext();
  const { combos, settings, clips, undo } = material;

  /*
   * 토스트를 갈아 끼울 열쇠. 닫힌 뒤에도 마지막 번호를 들고 있는다 —
   * 사라질 때 같이 바뀌면 접히는 동작이 잘리고 그냥 없어진다.
   */
  const undoKeyRef = useRef(0);
  if (undo != null) undoKeyRef.current = undo.id;
  const undoKey = undoKeyRef.current;

  const [tab, setTab] = useState<Tab>('train');

  /* 콤보 초안 — 녹음과 이름이 한 상태다. 저장소에는 안 들어간다. */
  const [draft, dispatchDraft] = useReducer(comboDraftReducer, INITIAL_DRAFT);
  const editingId = draft.editingId;
  const [sheetOpen, setSheetOpen] = useState(false);

  const kb = useKeyboardHeight();

  /** 콤보 미리듣기 전용. 훈련 진행 예약과 섞이면 안 된다. */
  const previewTimers = useTimerBank();

  const voice = useCoachVoice();

  /* 타이머 콜백 안에서 읽을 최신값. 의존성에 넣으면 타이머가 다시 만들어져 끊긴다. */
  const voiceRef = useLatestRef(voice);
  const stRef = useLatestRef(settings);

  /* ---- 소리 ---- */

  const stopSound = useCallback(() => voiceRef.current.stop(), [voiceRef]);
  const prime = useCallback(() => voiceRef.current.prime(), [voiceRef]);

  /* ---- 훈련 ---- */

  /* 아래 층은 콤보를 소리로 푸는 일만, 위 층은 라운드를 굴리는 일만 안다. */
  const playClip = useCallback(
    (id: string, play: Parameters<typeof voice.playClip>[1]) => voiceRef.current.playClip(id, play),
    [voiceRef]
  );
  const callouts = useCallouts({ settings, clips, playClip, stop: stopSound });
  const training = useTraining({ settings, combos, callouts, voice });

  const { stats } = callouts;
  const { phase, running, start, stop } = training;

  // 타이머 묶음·화면 잠금은 각자의 훅이 언마운트에서 스스로 치운다.
  useEffect(() => () => voiceRef.current.stop(), [voiceRef]);

  /* 녹음 본체를 엔진에 풀어 둔다. 바뀐 것만 — 부를 때 풀면 첫 콤보가 늦는다(기획서 6장). */
  const loadedClipsRef = useRef<Clips>({});
  useEffect(() => {
    const was = loadedClipsRef.current;
    Object.keys({ ...was, ...clips }).forEach((id) => {
      if (clips[id] === was[id]) return;
      if (clips[id]) voiceRef.current.loadClip(id, clips[id]);
      else voiceRef.current.dropClip(id);
    });
    loadedClipsRef.current = clips;
  }, [clips, voiceRef]);

  /* ---- 마이크 알림 ---- */

  /*
   * 마이크가 없으면 콤보를 만드는 길이 아예 없다. 세션에 한 번 알린다(기획서 4.4).
   * 권한 거부는 첫 녹음 때 드러나므로 그때 무대가 말한다.
   */
  const [micNoticeSeen, setMicNoticeSeen] = useState(false);
  const micNoticeOpen = voice.micAvailable === false && !micNoticeSeen;

  /* ---- 콤보 ---- */

  const hint = useCallback((text: string) => dispatchDraft({ type: 'hint', text }), []);

  /* 마이크 쪽에서 온 일을 초안에 넣는다. 번호가 같으면 이미 넣은 것이다. */
  const recEvent = voice.recordEvent;
  const recSeenRef = useRef(0);
  useEffect(() => {
    if (!recEvent || recEvent.seq === recSeenRef.current) return;
    recSeenRef.current = recEvent.seq;
    if (recEvent.kind === 'started') dispatchDraft({ type: 'recStarted' });
    else if (recEvent.kind === 'done') {
      dispatchDraft({
        type: 'recorded',
        data: recEvent.data,
        duration: recEvent.duration,
        head: recEvent.head,
        tail: recEvent.tail,
      });
    } else dispatchDraft({ type: 'recFailed', message: recEvent.message });
  }, [recEvent]);

  /* 새 녹음은 저장 전에도 들어봐야 한다. 초안 자리에 풀어 둔다. */
  const draftClip = draft.clip;
  useEffect(() => {
    if (draftClip) voiceRef.current.loadClip('draft', draftClip.data);
    else voiceRef.current.dropClip('draft');
  }, [draftClip, voiceRef]);

  /* 경과 초는 자료가 아니다. 녹음이 도는 동안에만 화면이 센다. */
  const [elapsed, setElapsed] = useState(0);
  const isRecording = draft.stage === 'recording' && draft.recording === 'on';
  useEffect(() => {
    if (!isRecording) return undefined;
    setElapsed(0);
    const started = Date.now();
    const iv = setInterval(() => setElapsed((Date.now() - started) / 1000), ELAPSED_TICK);
    return () => clearInterval(iv);
  }, [isRecording]);

  /** 수정 중이면 저장된 녹음의 길이를, 새로 녹음했으면 그것의 길이를 보여준다. */
  const editingCombo = editingId ? combos.find((c) => c.id === editingId) : undefined;
  const clipMs = draft.clip ? Math.round(draft.clip.duration * 1000) : (editingCombo?.ms ?? 0);

  /** 죽은 버튼을 두지 않는다 — 안 되는 이유를 순서대로 말한다(기획서 8장). */
  const saveCombo = useCallback(() => {
    const d = draft;
    if (d.stage !== 'named') return;
    if (!d.name.trim()) {
      hint('이름을 적어줘.');
      return;
    }
    const clip = d.clip
      ? {
          data: d.clip.data,
          ms: Math.round(d.clip.duration * 1000),
          head: d.clip.head,
          tail: d.clip.tail,
        }
      : null;
    if (!clip && !(editingId && !d.reRecorded)) {
      hint('녹음이 없어. 다시 녹음해줘.');
      return;
    }
    if (editingId) {
      // 이름만 고쳤으면 clip을 안 준다 — 있던 녹음을 그대로 둔다.
      dispatch({ type: 'replaceCombo', id: editingId, name: d.name.trim(), ...(clip ? { clip } : {}) });
    } else if (clip) {
      dispatch({ type: 'addCombo', name: d.name.trim(), clip });
    }
    dispatchDraft({ type: 'reset' });
    Keyboard.dismiss();
  }, [draft, editingId, dispatch, hint]);

  const removeCombo = useCallback((c: Combo) => dispatch({ type: 'removeCombo', id: c.id }), [dispatch]);
  const toggleCombo = useCallback((c: Combo) => dispatch({ type: 'toggleCombo', id: c.id }), [dispatch]);

  // 토스트가 이 둘을 시계 이펙트의 의존성으로 잡는다. 매 렌더 새 함수를 주면 시계가 계속 되감긴다.
  const restoreUndo = useCallback(() => dispatch({ type: 'restoreUndo' }), [dispatch]);
  const dismissUndo = useCallback(() => dispatch({ type: 'dismissUndo' }), [dispatch]);

  /* 초안을 움직이는 손들. 뷰에 한 벌로 넘긴다. */
  const draftRef = useLatestRef(draft);
  const arm = useCallback(() => {
    prime();
    voiceRef.current.tick();
    dispatchDraft({ type: 'arm' });
    voiceRef.current.recordStart(RECORD_MAX_MS);
  }, [prime, voiceRef]);

  /** 마이크가 켜져 있거나 켜는 중이면 놓아준다. 본체는 finish 뒤에만 받는다. */
  const releaseMic = useCallback(() => {
    const r = draftRef.current.recording;
    if (r === 'on' || r === 'starting') voiceRef.current.recordStop();
  }, [draftRef, voiceRef]);

  const finishRec = useCallback(() => {
    releaseMic();
    dispatchDraft({ type: 'finish' });
  }, [releaseMic]);

  const cancelDraft = useCallback(() => {
    releaseMic();
    dispatchDraft({ type: 'cancel' });
  }, [releaseMic]);

  const changeName = useCallback((text: string) => dispatchDraft({ type: 'setName', text }), []);

  /** 저장 전 듣기 — 훈련에서 들릴 그대로. 앞뒤를 자르고 지금 템포로(기획서 4.4). */
  const listenDraft = useCallback(() => {
    prime();
    stopSound();
    previewTimers.clearAll();
    const tempo = stRef.current.tempo;
    const d = draftRef.current;
    if (d.clip) {
      const plan = clipPlan(
        { ms: Math.round(d.clip.duration * 1000), head: d.clip.head, tail: d.clip.tail },
        tempo
      );
      voiceRef.current.playClip('draft', { from: plan.from, duration: plan.duration, rate: tempo });
      return;
    }
    // 수정 중이고 새로 녹음하지 않았으면 저장된 녹음이 그대로 들린다.
    const stored = d.editingId ? combos.find((c) => c.id === d.editingId) : undefined;
    if (stored) {
      const plan = clipPlan(stored, tempo);
      voiceRef.current.playClip(stored.id, { from: plan.from, duration: plan.duration, rate: tempo });
    }
  }, [prime, stopSound, previewTimers, stRef, draftRef, voiceRef, combos]);

  const previewCombo = useCallback(
    (c: Combo) => {
      prime();
      stopSound();
      previewTimers.clearAll();
      const tempo = stRef.current.tempo;
      const plan = clipPlan(c, tempo);
      voiceRef.current.playClip(c.id, { from: plan.from, duration: plan.duration, rate: tempo });
    },
    [prime, stopSound, previewTimers, stRef, voiceRef]
  );

  /** 이름 고치기 — 이름이 채워진 채로 무대의 이름 단계에 올라간다. 녹음은 그대로. */
  const editCombo = useCallback((c: Combo) => {
    dispatchDraft({ type: 'edit', combo: c });
    setTab('combos');
  }, []);

  /** 다시 녹음 — 이름은 그대로, 녹음만 새로. 취소하면 원래 녹음이 남는다. */
  const rerecordCombo = useCallback(
    (c: Combo) => {
      dispatchDraft({ type: 'edit', combo: c });
      setTab('combos');
      arm();
    },
    [arm]
  );

  const editor: DraftEditor = useMemo(
    () => ({
      onArm: arm,
      onFinish: finishRec,
      onCancel: cancelDraft,
      onListen: listenDraft,
      onNameChange: changeName,
      onSubmit: saveCombo,
    }),
    [arm, finishRec, cancelDraft, listenDraft, changeName, saveCombo]
  );

  const setAllCombos = useCallback((on: boolean) => dispatch({ type: 'setAllCombos', on }), [dispatch]);

  const set = useCallback(
    <K extends keyof Settings>(k: K, v: Settings[K]) =>
      dispatch({ type: 'patchSettings', patch: { [k]: v } as Partial<Settings> }),
    [dispatch]
  );

  /* ---- 렌더 ---- */

  const ready = combos.filter((c) => c.on).length;
  const bottomSafe = insets.bottom;

  /* 저장 버튼은 이름 단계에서만 뜬다. 이름이 비어도 뜬다 — 눌러야 이유를 물을 수 있다. */
  const saveFabShown = tab === 'combos' && draft.stage === 'named';

  /*
   * 키보드는 스크롤 뷰를 줄이지 않고 그 위에 겹친다. 그만큼을 더 비워야
   * 마지막 카드가 키보드 위로 올라올 수 있다.
   */
  const scrollPad = (tab === 'combos' ? (saveFabShown ? 192 : 128) : 160) + bottomSafe + kb;

  /* 탭바를 화면 밖까지 정확히 밀려면 자기 높이를 알아야 한다. 재서 쓴다. */
  const [tabH, setTabH] = useState(0);
  const tabSlide = useRef(new Animated.Value(0)).current;

  /* 탭바가 zIndex 40이라 TDS 시트(zIndex 없음) 위로 올라온다. 시트가 열리면 비켜줘야 한다. */
  const anySheetOpen = sheetOpen;

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

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const openSheet = useCallback(() => setSheetOpen(true), []);

  return (
    <View style={styles.root}>
      {/* ---------- 헤더 ---------- */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            {tab === 'train' ? (
              <Tap onPress={openSheet} accessibilityLabel="설정" style={styles.headerBtn}>
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
          editor={editor}
          elapsed={elapsed}
          clipMs={clipMs}
          micAvailable={voice.micAvailable}
          readyCount={ready}
          bottomPad={scrollPad}
          onSetAll={setAllCombos}
          onToggle={toggleCombo}
          onPreview={previewCombo}
          onEdit={editCombo}
          onRerecord={rerecordCombo}
          onRemove={removeCombo}
        />
      ) : null}

      {/* ---------- 저장 (z 30) ---------- */}
      {/* FAB도 시트 위로 떠오른다(z 30 vs 시트 zIndex 없음). 시트가 열리면 걷어낸다. */}
      {saveFabShown && !anySheetOpen ? (
        <View style={[styles.fabLayer, { bottom: kb > 0 ? kb + 16 : LAYER.fab + bottomSafe }]} pointerEvents="box-none">
          <View style={[styles.inner, styles.fabRow]} pointerEvents="box-none">
            {editingId ? (
              <Tap onPress={cancelDraft} accessibilityLabel="수정 취소" style={styles.fabRound}>
                <X size={20} color={C.z400} />
              </Tap>
            ) : null}
            <Tap onPress={saveCombo} style={[styles.fabPill, styles.fabPillOn]}>
              {editingId ? <Check size={20} color={C.white} /> : <Plus size={20} color={C.white} />}
              <Typo level="button" weight="semibold" color={C.white}>
                {editingId ? '수정 저장' : '콤보 저장'}
              </Typo>
            </Tap>
          </View>
        </View>
      ) : null}

      {/* ---------- 되돌리기 토스트 ---------- */}
      {/*
        TDS Toast는 자리를 스스로 잡는다 — bottomOffset에 하단 안전영역을 더해서 깐다.
        그래서 여기서는 안전영역을 빼고 넘긴다. 두 번 더하면 그만큼 떠버린다.
        훈련 탭에서는 띄우지 않는다(기획서 8장).

        key와 duration 둘 다 TDS 쪽 사정이다.
        시계는 마운트 때 한 번만 걸리므로 되돌리기가 새로 열릴 때마다 갈아 끼워야 다시 감긴다.
        duration은 ms가 아니라 초다.
      */}
      <Toast
        key={undoKey}
        open={undo != null && tab !== 'train'}
        text={undo?.text ?? ''}
        duration={TOAST_MS / 1000}
        bottomOffset={kb > 0 ? kb + 80 - bottomSafe : saveFabShown ? LAYER.toastWithFab : LAYER.toastAlone}
        onClose={dismissUndo}
        button={<Toast.Button onPress={restoreUndo}>되돌리기</Toast.Button>}
      />

      {/* ---------- 탭바 (z 40) ---------- */}
      <Animated.View
        style={[styles.tabLayer, { bottom: LAYER.tabBar + bottomSafe, transform: [{ translateY: tabSlide }] }]}
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

      <DoneOverlay visible={phase === 'done'} settings={settings} stats={stats} onRestart={start} onQuit={stop} />

      {/* 색을 얹을 필요가 없는 자리라 TDS를 그대로 받는다(design-system.md). */}
      <MicNotice open={micNoticeOpen} onClose={() => setMicNoticeSeen(true)} />

      <SettingsSheet
        open={sheetOpen}
        onClose={closeSheet}
        settings={settings}
        onChange={set}
        running={running}
        onTestBell={() => {
          prime();
          voiceRef.current.bell(1);
        }}
      />

      {voice.engine}
    </View>
  );
}

/** 마이크를 못 쓰는 환경에 세션당 한 번. 기획서 4.4. */
function MicNotice({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <View style={styles.micNotice}>
      <View style={styles.micNoticeBox}>
        <Typo level="subtitle" weight="semibold" color={C.white}>마이크를 못 써</Typo>
        <Typo level="caption" color={C.z400} style={styles.micNoticeText}>
          이 기기에서는 마이크를 못 써서 콤보를 만들 수 없어. 훈련 타이머는 돼.
        </Typo>
        <Tap onPress={onClose} accessibilityLabel="알림 닫기" style={styles.micNoticeBtn}>
          <Typo level="button" weight="semibold" color={C.white}>알겠어</Typo>
        </Tap>
      </View>
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
  fabPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, height: 56, borderRadius: 28, elevation: 6 },
  fabPillOn: { backgroundColor: ACCENT },

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

  micNotice: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: LAYER.zToast,
  },
  micNoticeBox: {
    width: '100%',
    maxWidth: MAXW,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 24,
    gap: 12,
  },
  micNoticeText: { lineHeight: 20 },
  micNoticeBtn: { marginTop: 12, height: 52, borderRadius: 26, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
});
