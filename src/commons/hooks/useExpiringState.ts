import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type Expiring<T> = {
  /** 살아 있는 값. 만료됐거나 아직 없으면 null. */
  value: T | null;
  /** 값을 띄우고 만료 시계를 처음부터 다시 센다. */
  show: (next: T) => void;
  /** 지금 지운다. */
  clear: () => void;
};

/**
 * ms 뒤에 스스로 사라지는 값.
 *
 * 되돌리기 토스트(6초)와 콤보 목록 하이라이트(2.4초)가 같은 모양이었다.
 * 양쪽 다 "띄울 때 이전 타이머를 반드시 먼저 끄는" 처리가 필요한데,
 * 호출부에 흩어져 있으면 한 군데씩 빠져서 토스트가 일찍 사라진다.
 */
export function useExpiringState<T>(ms: number): Expiring<T> {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setValue(null);
  }, []);

  const show = useCallback(
    (next: T) => {
      clearTimeout(timer.current);
      setValue(next);
      timer.current = setTimeout(() => setValue(null), ms);
    },
    [ms]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return useMemo(() => ({ value, show, clear }), [value, show, clear]);
}
