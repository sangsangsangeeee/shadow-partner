import { useCallback, useEffect, useMemo, useRef } from 'react';

export type TimerBank = {
  /** ms 뒤에 실행하고, 그 타이머를 이 묶음이 기억한다. */
  later: (fn: () => void, ms: number) => void;
  /** 이 묶음의 예약을 전부 취소한다. */
  clearAll: () => void;
};

/**
 * setTimeout 묶음.
 *
 * 콤보 호출은 동작 하나마다 타이머를 하나씩 깐다. 정지·건너뛰기·일시정지가
 * 그걸 통째로 걷어내야 해서 id를 모아 둬야 한다. 언마운트 정리도 여기서 같이 한다.
 *
 * 훈련 진행과 콤보 미리듣기는 서로를 취소하면 안 되므로 묶음을 따로 만들어 쓴다.
 */
export function useTimerBank(): TimerBank {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    ids.current.push(setTimeout(fn, ms));
  }, []);

  const clearAll = useCallback(() => {
    ids.current.forEach(clearTimeout);
    ids.current = [];
  }, []);

  useEffect(
    () => () => {
      ids.current.forEach(clearTimeout);
      ids.current = [];
    },
    []
  );

  // later와 clearAll이 항등이라 이 객체도 한 번만 만들어진다.
  return useMemo(() => ({ later, clearAll }), [later, clearAll]);
}
