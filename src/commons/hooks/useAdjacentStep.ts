import { useCallback, useMemo } from 'react';
import { useLatestRef } from './useLatestRef';

/**
 * 목록 안에서 한 칸 옆으로 옮기는 콜백 한 쌍.
 *
 * 끝에서는 감기지 않는다 — 스와이프로 마지막 분류에서 처음으로 돌아오면
 * 어디까지 왔는지 감이 사라진다. 끝에 닿으면 아무 일도 일어나지 않는다.
 *
 * 값과 목록은 ref로 읽는다. 스와이프 제스처는 한 번 만들어 두고 계속 쓰는 물건이라,
 * 여기서 돌려주는 함수의 신원이 흔들리면 제스처가 매 렌더 다시 만들어진다.
 */
export function useAdjacentStep<T>(options: readonly T[], value: T, onChange: (next: T) => void) {
  const ref = useLatestRef({ options, value, onChange });

  const step = useCallback(
    (delta: 1 | -1) => {
      const { options: list, value: cur, onChange: emit } = ref.current;
      const at = list.indexOf(cur);
      if (at < 0) return;
      const next = list[at + delta];
      if (next === undefined) return;
      emit(next);
    },
    [ref]
  );

  const prev = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  /* 끌리는 쪽에 갈 곳이 있는지는 쓰는 쪽이 손에 알려줘야 해서 같이 내보낸다. */
  const at = options.indexOf(value);
  const hasPrev = at > 0;
  const hasNext = at >= 0 && at < options.length - 1;

  return useMemo(() => ({ prev, next, hasPrev, hasNext }), [prev, next, hasPrev, hasNext]);
}
