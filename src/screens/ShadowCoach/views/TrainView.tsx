import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  ChevronUp,
  FillBar,
  Pause,
  Play,
  Pulse,
  SkipForward,
  SquareIcon,
  Stopwatch,
  Tap,
  Typo,
} from '../../../commons/components';
import { ACCENT, C, MAXW, MODES, NUMS, REF_H, REF_RING } from '../../../commons/constants';
import { fmt, trainScale } from '../../../commons/utils';
import type { Move, Phase, Settings } from '../../../commons/types';
import type { Callouts, Training } from '../hooks';

type Props = {
  training: Training;
  callouts: Callouts;
  settings: Settings;
  label: (id: string) => string;
  beatOf: (id: string) => number;
  moveMap: Record<string, Move>;
  /** 훈련에 들어간 콤보 수. 대기 화면 안내에 쓴다. */
  readyCount: number;
  /** 창 너비. 배율 계산에 들어간다. */
  windowWidth: number;
  bottomSafe: number;
  onOpenSettings: () => void;
};

/** 준비 카운트다운은 항상 5초다. 링의 눈금이 이 값을 기준으로 채워진다. */
const READY_SEC = 5;
/** 탭바가 차지하는 높이. 링이 그 아래로 내려가면 안 된다. */
const TAB_BAR_ROOM = 96;

/**
 * 훈련 화면.
 *
 * 여기만 스크롤하지 않는다. 남는 높이에 링을 맞춰 넣고 나머지 치수를 같은 배율로 따라가게 해서
 * 기기 해상도가 달라도 같은 그림이 나오게 한다. 그래서 배율에 관한 상태는 전부 이 화면 안에 있다.
 */
export function TrainView({
  training,
  callouts,
  settings,
  label,
  beatOf,
  moveMap,
  readyCount,
  windowWidth,
  bottomSafe,
  onOpenSettings,
}: Props) {
  const { phase, paused, round, timeLeft, running, startError, start, stop, togglePause, skip } = training;
  const { activeCombo, activeIdx, hold, repCount } = callouts;

  /**
   * 이 화면에 실제로 주어진 높이. flex:1이라 자식과 무관하게 정해진다.
   * 링을 감싼 컨테이너를 재면 링 크기가 그 높이를 다시 정해 되먹임이 생기므로
   * 반드시 바깥 컨테이너를 잰다.
   */
  const [availH, setAvailH] = useState(0);
  const measure = (e: LayoutChangeEvent) => setAvailH(e.nativeEvent.layout.height);

  const scale = trainScale(
    Math.min(MAXW, windowWidth - 40),
    availH > 0 ? availH - (TAB_BAR_ROOM + bottomSafe) : REF_H
  );
  /** 기준 치수를 현재 배율로 옮긴다. */
  const px = (n: number) => Math.round(n * scale);
  const ringSize = px(REF_RING);

  const statusText: Record<Phase, string> = {
    idle: '',
    ready: '준비',
    work: `라운드 ${round} / ${settings.rounds}`,
    rest: '휴식',
    done: '완료',
  };

  const summary = [
    settings.mode === 'count'
      ? `횟수 ${settings.reps}번`
      : (MODES.find((m) => m.id === settings.mode) ?? MODES[0]).label,
    `${settings.rounds}라운드`,
    `${fmt(settings.roundSec)} / ${fmt(settings.restSec)}`,
  ].join(' · ');

  const ringTotal =
    phase === 'idle'
      ? settings.roundSec
      : phase === 'ready'
        ? READY_SEC
        : phase === 'rest'
          ? settings.restSec
          : settings.roundSec;

  const idleHint =
    phase === 'rest'
      ? '숨 고르고 물 마셔.'
      : phase === 'done'
        ? '전부 끝났어. 잘했어.'
        : phase === 'ready'
          ? '스탠스 잡고 대기.'
          : settings.mode === 'none'
            ? '호출 없이 타이머만 돌아가.'
            : `콤보 ${readyCount}개 준비됨.`;

  return (
    <View style={[styles.flex, styles.pad, { paddingBottom: TAB_BAR_ROOM + bottomSafe }]} onLayout={measure}>
      <View style={[styles.inner, styles.flex]}>
        <View style={[styles.ringSlot, { marginBottom: px(24) }]}>
          <Stopwatch
            seconds={phase === 'idle' ? settings.roundSec : timeLeft}
            total={ringTotal}
            status={statusText[phase]}
            dim={phase === 'idle' || paused}
            maxSize={ringSize}
          />
        </View>

        <View style={[styles.stage, { minHeight: px(80), marginBottom: px(24) }]}>
          {hold ? (
            <View>
              <View style={[styles.chipRow, { gap: px(8), marginBottom: px(16) }]}>
                <Pulse style={[styles.cueChip, { paddingHorizontal: px(12), paddingVertical: px(8) }]}>
                  <Typo level="chip" color={C.z500} style={[{ fontSize: px(19) }]}>{hold.cue}</Typo>
                </Pulse>
              </View>
              <View style={styles.gauge}>
                {hold.ms !== null ? (
                  <FillBar ms={hold.ms} color={C.z700} />
                ) : (
                  <Pulse style={styles.gaugeIdle}>
                    <View style={styles.gaugeIdleFill} />
                  </Pulse>
                )}
              </View>
            </View>
          ) : activeCombo ? (
            <View>
              <View style={[styles.chipRow, { gap: px(8), marginBottom: px(16) }]}>
                {activeCombo.moves.map((mid, i) => {
                  const done = i < activeIdx;
                  const now = i === activeIdx;
                  return (
                    <View
                      key={`${mid}-${i}`}
                      style={[
                        styles.callChip,
                        { paddingHorizontal: px(12), paddingVertical: px(8) },
                        now ? styles.callChipNow : null,
                      ]}
                    >
                      <Typo
                        level="chip"
                        weight={now ? 'semibold' : 'regular'}
                        color={now ? C.white : done ? C.z800 : C.z500}
                        style={{ fontSize: px(19) }}
                      >
                        {label(mid)}
                      </Typo>
                    </View>
                  );
                })}
              </View>

              {/* 비트 트랙 — 동작별 소요 시간에 비례한 폭 */}
              <View style={[styles.beatTrack, { height: px(8), gap: px(4) }]}>
                {activeCombo.moves.map((mid, i) => {
                  const m = moveMap[mid];
                  if (!m) return null;
                  const bt = beatOf(mid);
                  const ms = Math.round((bt * 1000) / settings.tempo);
                  return (
                    <View key={`${mid}-${i}`} style={[styles.beatCell, { flexGrow: bt }]}>
                      {i < activeIdx ? <View style={styles.beatDone} /> : null}
                      {i === activeIdx ? <FillBar ms={ms} color={ACCENT} /> : null}
                    </View>
                  );
                })}
              </View>

              {settings.mode === 'count' ? (
                <Typo level="caption" color={C.z600} style={[NUMS, { fontSize: px(14) }]}>
                  {repCount} / {settings.reps}회
                </Typo>
              ) : null}
            </View>
          ) : (
            <Typo level="small" color={C.z600} style={[{ fontSize: px(15) }]}>
              {idleHint}
            </Typo>
          )}
        </View>

        <View style={[styles.controls, { gap: px(8), marginBottom: px(16) }]}>
          {!running ? (
            <Tap onPress={start} style={[styles.primaryBtn, styles.flex, { paddingVertical: px(16), gap: px(8) }]}>
              <Play size={px(20)} color={C.white} />
              <Typo level="button" weight="semibold" color={C.white} style={[{ fontSize: px(17) }]}>시작</Typo>
            </Tap>
          ) : (
            <>
              <Tap onPress={togglePause} style={[styles.subBtn, styles.flex, { paddingVertical: px(16), gap: px(8) }]}>
                {paused ? <Play size={px(16)} color={C.white} /> : <Pause size={px(16)} color={C.white} />}
                <Typo level="small" color={C.white} style={[{ fontSize: px(15) }]}>
                  {paused ? '재개' : '일시정지'}
                </Typo>
              </Tap>
              {/* 없음 모드에서는 부를 콤보가 없다 */}
              {settings.mode !== 'none' ? (
                <Tap onPress={skip} accessibilityLabel="다음 콤보" style={[styles.iconBtn, { paddingHorizontal: px(20) }]}>
                  <SkipForward size={px(16)} color={C.white} />
                </Tap>
              ) : null}
              <Tap onPress={stop} accessibilityLabel="정지" style={[styles.iconBtn, { paddingHorizontal: px(20) }]}>
                <SquareIcon size={px(16)} color={C.z400} />
              </Tap>
            </>
          )}
        </View>

        {startError ? (
          <View style={styles.notice}>
            <Typo level="caption" color={C.white} style={{ fontSize: px(14) }}>{startError}</Typo>
          </View>
        ) : null}

        <View style={styles.center}>
          <Tap
            onPress={onOpenSettings}
            style={[styles.summaryPill, { paddingHorizontal: px(16), paddingVertical: px(12), gap: px(8) }]}
          >
            <Typo level="small" color={C.z300} style={[{ fontSize: px(15) }]}>{summary}</Typo>
            <ChevronUp size={px(16)} color={C.z600} />
          </Tap>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  inner: { width: '100%', maxWidth: MAXW, alignSelf: 'center' },
  center: { alignItems: 'center' },

  ringSlot: { flex: 1, justifyContent: 'center', marginBottom: 24 },
  stage: { minHeight: 80, marginBottom: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },

  cueChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.line,
  },
  gauge: { height: 8, borderRadius: 4, backgroundColor: C.card, overflow: 'hidden' },
  gaugeIdle: { height: '100%', width: '33%' },
  gaugeIdleFill: { flex: 1, backgroundColor: C.line },

  callChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  callChipNow: { backgroundColor: ACCENT, transform: [{ scale: 1.1 }] },

  beatTrack: { flexDirection: 'row', gap: 4, height: 8 },
  beatCell: { flexBasis: 0, borderRadius: 4, backgroundColor: C.card, overflow: 'hidden' },
  beatDone: { height: '100%', width: '100%', backgroundColor: ACCENT, opacity: 0.3 },

  controls: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
  },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.line,
    borderRadius: 12,
    paddingVertical: 16,
  },
  iconBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.line,
    borderRadius: 12,
  },

  notice: { backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
});
