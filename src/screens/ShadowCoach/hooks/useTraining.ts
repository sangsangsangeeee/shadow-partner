import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKeepAwake, useLatestRef, useTimerBank } from '../../../commons/hooks';
import type { CoachVoice } from '../../../commons/components';
import type { Combo, Phase, Settings } from '../../../commons/types';
import type { Callouts } from './useCallouts';

/** 시작 전 카운트다운 길이(초). */
const READY_SEC = 5;
/** 종소리가 끝나고 첫 호출이 나가기까지의 여유(ms). */
const ROUND_OPEN_MS = 1200;
/** 완주 안내를 말하기까지의 여유(ms). */
const FINISH_MS = 900;

type Params = {
  settings: Settings;
  combos: Combo[];
  callouts: Callouts;
  voice: CoachVoice;
  speak: (text: string) => void;
};

export type Training = {
  phase: Phase;
  paused: boolean;
  round: number;
  /** 현재 구간의 남은 초. */
  timeLeft: number;
  /** 훈련이 도는 중인가. 준비·진행·휴식이 참, 대기·완료가 거짓. */
  running: boolean;
  /** 시작할 수 없는 이유. 없으면 빈 문자열. 콤보 목록이 바뀌면 저절로 사라진다. */
  startError: string;

  start: () => void;
  stop: () => void;
  togglePause: () => void;
  skip: () => void;
};

/**
 * 라운드 기계.
 *
 * 준비 → 진행 → 휴식 → 진행 … → 완료 를 초 단위로 굴리고,
 * 구간이 바뀔 때마다 종을 치고 호출 층(useCallouts)에 신호를 준다.
 * 어떤 콤보를 어떻게 부르는지는 이 층이 모른다.
 */
export function useTraining({ settings, combos, callouts, voice, speak }: Params): Training {
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startError, setStartError] = useState('');

  /** 구간 넘김 지연용. 호출 층의 예약과 섞이지 않게 묶음을 따로 쓴다. */
  const timers = useTimerBank();
  const { later, clearAll } = timers;

  /**
   * 남은 초의 실체. timeLeft는 이 값의 화면용 그림자다.
   * 틱마다 렌더보다 먼저 앞서 나가므로 상태를 거울로 삼으면 같은 초를 두 번 읽는다.
   */
  const timeRef = useRef(0);

  const stRef = useLatestRef(settings);
  const roundRef = useLatestRef(round);
  const voiceRef = useLatestRef(voice);
  const speakRef = useLatestRef(speak);
  // 호출 층은 상태를 들고 있어 렌더마다 바뀐다. ref로 읽어 핸들러 신원을 고정한다.
  const cueRef = useLatestRef(callouts);

  /** 남은 초를 상태와 실체 양쪽에 동시에 적는다. 둘이 어긋나면 시계가 튄다. */
  const setClock = useCallback((sec: number) => {
    timeRef.current = sec;
    setTimeLeft(sec);
  }, []);

  const running = phase !== 'idle' && phase !== 'done';

  // 훈련이 도는 동안에만 화면을 켜 둔다. 일시정지 중에도 켜져 있어야 한다.
  useKeepAwake(running);

  /* ---- 조작 ---- */

  /** 상태 전환을 먼저 하고 소리·음성은 그 뒤에 시도한다. 기획서 4.1 실패 처리. */
  const start = useCallback(() => {
    const on = combos.filter((c) => c.on && c.moves.length);
    const queue = on.length ? on : combos.filter((c) => c.moves.length);

    if (!queue.length && stRef.current.mode !== 'none') {
      setStartError(
        combos.length
          ? '훈련에 넣은 콤보가 없어. 콤보 탭에서 체크하거나, 모드를 "없음"으로 바꾸면 타이머만 돌릴 수 있어.'
          : '저장된 콤보가 없어. 콤보 탭에서 하나 만들어줘.'
      );
      return;
    }

    setStartError('');
    cueRef.current.arm(queue);
    setRound(1);
    setPaused(false);
    setPhase('ready');
    setClock(READY_SEC);

    voiceRef.current.prime();
    speakRef.current('준비');
  }, [combos, stRef, cueRef, setClock, voiceRef, speakRef]);

  const stop = useCallback(() => {
    clearAll();
    cueRef.current.reset();
    setPhase('idle');
    setPaused(false);
    setClock(0);
  }, [clearAll, cueRef, setClock]);

  const togglePause = useCallback(() => {
    if (phase === 'idle' || phase === 'done') return;
    if (paused) {
      setPaused(false);
      // 진행 중에만 호출을 되살린다. 준비·휴식은 시계만 다시 돈다.
      if (phase === 'work') {
        clearAll();
        cueRef.current.silence();
        cueRef.current.resume(timeRef.current * 1000);
      }
    } else {
      setPaused(true);
      // 아직 안 터진 구간 넘김 예약까지 걷어내야 멈춘 뒤에 호출이 튀어나오지 않는다.
      clearAll();
      cueRef.current.silence();
    }
  }, [phase, paused, clearAll, cueRef]);

  const skip = useCallback(() => {
    if (phase !== 'work' || paused || stRef.current.mode === 'none') return;
    // 라운드가 막 열렸다면 아직 안 터진 첫 호출 예약이 남아 있다. 그것부터 없앤다.
    clearAll();
    cueRef.current.silence();
    cueRef.current.advance(timeRef.current * 1000);
  }, [phase, paused, stRef, cueRef, clearAll]);

  // 콤보 목록이 바뀌면 시작 실패 안내는 더 이상 맞지 않는다.
  useEffect(() => setStartError(''), [combos]);

  /* ---- 시계 ---- */

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || paused) return undefined;
    const iv = setInterval(() => {
      // timeRef를 먼저 진행시킨다. 렌더가 밀려도 다음 틱이 같은 값을 두 번 읽지 않는다.
      const next = phase === 'ready' ? Math.max(0, timeRef.current - 1) : timeRef.current - 1;
      timeRef.current = next;
      const v = voiceRef.current;
      if (phase === 'ready') {
        if (next > 0) v.blip();
      } else {
        if (phase === 'work' && next === 10) v.clapper();
        if (phase === 'rest' && next > 0 && next <= 3) v.blip();
      }
      setTimeLeft(next);
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, paused, voiceRef]);

  /** 0초에 닿으면 구간을 넘긴다. */
  useEffect(() => {
    if (paused || timeLeft > 0) return;
    const v = voiceRef.current;
    const st = stRef.current;
    const cue = cueRef.current;

    if (phase === 'ready') {
      v.bell(3);
      setPhase('work');
      setClock(st.roundSec);
      cue.openRound();
      later(() => cueRef.current.startRound(), ROUND_OPEN_MS);
    } else if (phase === 'work') {
      clearAll();
      cue.endRound();
      v.bell(1);
      if (roundRef.current >= st.rounds) {
        setPhase('done');
        later(() => speakRef.current('운동 끝. 수고했어요'), FINISH_MS);
      } else {
        setPhase('rest');
        setClock(st.restSec);
      }
    } else if (phase === 'rest') {
      v.bell(3);
      setRound((r) => r + 1);
      setPhase('work');
      setClock(st.roundSec);
      cue.openRound();
      later(() => cueRef.current.startRound(), ROUND_OPEN_MS);
    }
    // 의도적으로 timeLeft/phase/paused에만 반응한다. 나머지는 ref로 읽는다.
  }, [timeLeft, phase, paused]);

  return useMemo(
    () => ({
      phase,
      paused,
      round,
      timeLeft,
      running,
      startError,
      start,
      stop,
      togglePause,
      skip,
    }),
    [phase, paused, round, timeLeft, running, startError, start, stop, togglePause, skip]
  );
}
