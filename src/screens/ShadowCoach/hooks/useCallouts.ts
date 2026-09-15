import { useCallback, useMemo, useRef, useState } from 'react';
import { clipPlan, pickCue } from '../../../commons/utils';
import { useLatestRef, useTimerBank } from '../../../commons/hooks';
import type { ClipPlay } from '../../../commons/components';
import type { Clips, Combo, HoldGap, Settings, Stats } from '../../../commons/types';

type Params = {
  settings: Settings;
  /** 콤보별 녹음 본체. 없으면 그 콤보는 건너뛴다. */
  clips: Clips;
  /** 녹음을 튼다. */
  playClip: (id: string, play: ClipPlay) => void;
  /** 나오던 소리를 즉시 끊는다. */
  stop: () => void;
};

export type Callouts = {
  /** 지금 부르고 있는 콤보. 없으면 null. */
  activeCombo: Combo | null;
  /** 콤보 사이 유지 구간. 안내 문구와 남은 시간을 담는다. */
  hold: HoldGap | null;
  /** 횟수 모드에서 지금까지 부른 횟수. */
  repCount: number;
  stats: Stats;

  /** 훈련을 시작할 큐를 세우고 진행 상태를 0으로 돌린다. */
  arm: (queue: Combo[]) => void;
  /** 라운드가 열렸다. 횟수를 0으로 돌린다. 호출은 아직 걸지 않는다. */
  openRound: () => void;
  /** 종소리가 끝났다. 설정된 모드에 맞게 호출을 건다. */
  startRound: () => void;
  /** 일시정지에서 돌아왔다. 부르던 콤보부터 남은 시간에 다시 건다. */
  resume: (msLeft: number) => void;
  /** 건너뛰기. 다음 콤보로 즉시 넘어간다. */
  advance: (msLeft: number) => void;
  /** 예약과 소리를 멈춘다. 큐와 진행 위치는 남긴다. */
  silence: () => void;
  /** 라운드가 끝났다. 화면에서 콤보를 내린다. */
  endRound: () => void;
  /** 훈련이 끝났다. 전부 비운다. */
  reset: () => void;
};

/**
 * 콤보를 소리로 풀어내는 층.
 *
 * 라운드도 페이즈도 모른다. "이 콤보를 지금 불러라", "멈춰라"만 안다.
 * 그래서 화면 없이도 호출 타이밍을 검증할 수 있다.
 */
export function useCallouts({ settings, clips, playClip, stop }: Params): Callouts {
  const [activeCombo, setActiveCombo] = useState<Combo | null>(null);
  const [hold, setHold] = useState<HoldGap | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [stats, setStats] = useState<Stats>({ combos: 0 });

  const timers = useTimerBank();
  const { later, clearAll } = timers;

  const queueRef = useRef<Combo[]>([]);
  const posRef = useRef(0);
  const curRef = useRef<Combo | null>(null);

  // 타이머 콜백이 다시 만들어지지 않도록 최신값은 ref로 읽는다.
  const stRef = useLatestRef(settings);
  const repRef = useLatestRef(repCount);
  const clipsRef = useLatestRef(clips);
  const playClipRef = useLatestRef(playClip);

  /** 순서 모드는 큐를 한 바퀴 돌고, 무작위 모드는 매번 새로 뽑는다. */
  const pickNext = useCallback((): Combo | null => {
    const q = queueRef.current;
    if (!q.length) return null;
    if (stRef.current.mode === 'random') return q[Math.floor(Math.random() * q.length)] ?? null;
    const c = q[posRef.current % q.length] ?? null;
    posRef.current += 1;
    return c;
  }, [stRef]);

  /** chain이면 유지 구간을 두고 다음 콤보로 이어 붙인다. 횟수 모드는 이어 붙이지 않는다. */
  const playCombo = useCallback(
    (combo: Combo | null, chain = true) => {
      if (!combo) return;
      /*
       * 본체를 못 읽은 콤보는 건너뛴다(기획서 5장). 소리가 안 나는 동안 화면만 바뀌면
       * 무엇이 고장인지 알 수 없어서, 아예 다음 것을 집는다.
       */
      if (!clipsRef.current[combo.id]) {
        const n = pickNext();
        if (n && n.id !== combo.id) playCombo(n, chain);
        return;
      }
      const st = stRef.current;
      curRef.current = combo;
      setHold(null);
      setStats((p) => ({ combos: p.combos + 1 }));
      setActiveCombo(combo);

      const plan = clipPlan(combo, st.tempo);
      playClipRef.current(combo.id, { from: plan.from, duration: plan.duration, rate: st.tempo });
      const t = plan.total;

      if (chain) {
        const gapMs = Math.round(st.gap * 1000 + (st.randomGap ? Math.random() * 1200 : 0));
        later(() => {
          setHold({ cue: pickCue(), ms: gapMs });
        }, t);
        later(() => {
          setHold(null);
          const n = pickNext();
          if (n) playCombo(n, true);
        }, t + gapMs);
      } else {
        later(() => {
          setHold({ cue: pickCue(), ms: null });
        }, t + 300);
      }
    },
    [later, pickNext, stRef, clipsRef, playClipRef]
  );

  /** 횟수 모드. 남은 횟수를 남은 시간에 고르게 재배분한다. 최소 간격 2.5초. */
  const scheduleReps = useCallback(
    (remaining: number, msLeft: number, doneSoFar: number) => {
      if (remaining <= 0) return;
      const interval = Math.max(2500, msLeft / remaining);
      for (let i = 0; i < remaining; i++) {
        later(() => {
          const c = pickNext();
          if (c) {
            setRepCount(doneSoFar + i + 1);
            playCombo(c, false);
          }
        }, 600 + i * interval);
      }
    },
    [later, pickNext, playCombo]
  );

  const silence = useCallback(() => {
    clearAll();
    stop();
    setHold(null);
  }, [clearAll, stop]);

  const arm = useCallback((queue: Combo[]) => {
    queueRef.current = queue;
    posRef.current = 0;
    curRef.current = null;
    setRepCount(0);
    setHold(null);
    setActiveCombo(null);
    setStats({ combos: 0 });
  }, []);

  const openRound = useCallback(() => {
    setRepCount(0);
    setHold(null);
  }, []);

  const startRound = useCallback(() => {
    const st = stRef.current;
    if (st.mode === 'none') return;
    if (st.mode === 'count') {
      setRepCount(0);
      scheduleReps(Math.max(1, st.reps), st.roundSec * 1000, 0);
      return;
    }
    const n = pickNext();
    if (n) playCombo(n, true);
  }, [stRef, pickNext, playCombo, scheduleReps]);

  /**
   * 남은 시간에 맞춰 호출을 다시 건다.
   * fromCurrent면 부르던 콤보를 처음부터 다시 부르고(재개), 아니면 다음 콤보로 넘어간다(건너뛰기).
   */
  const restart = useCallback(
    (msLeft: number, fromCurrent: boolean) => {
      const st = stRef.current;
      if (st.mode === 'none') return;
      if (st.mode === 'count') {
        scheduleReps(Math.max(0, st.reps - repRef.current), msLeft, repRef.current);
        return;
      }
      const target = fromCurrent ? (curRef.current ?? pickNext()) : pickNext();
      if (target) playCombo(target, true);
    },
    [stRef, repRef, pickNext, playCombo, scheduleReps]
  );

  const resume = useCallback((msLeft: number) => restart(msLeft, true), [restart]);
  const advance = useCallback((msLeft: number) => restart(msLeft, false), [restart]);

  const endRound = useCallback(() => {
    silence();
    setActiveCombo(null);
  }, [silence]);

  const reset = useCallback(() => {
    silence();
    curRef.current = null;
    setActiveCombo(null);
  }, [silence]);

  return useMemo(
    () => ({
      activeCombo,
      hold,
      repCount,
      stats,
      arm,
      openRound,
      startRound,
      resume,
      advance,
      silence,
      endRound,
      reset,
    }),
    [activeCombo, hold, repCount, stats, arm, openRound, startRound, resume, advance, silence, endRound, reset]
  );
}
