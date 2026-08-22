import { useRef, type MutableRefObject } from 'react';

/**
 * 항상 최신 값을 담은 ref.
 *
 * 타이머 콜백이나 이벤트 리스너처럼 "한 번 만들고 다시 만들면 안 되는" 함수 안에서
 * 최신 상태를 읽을 때 쓴다. 의존성 배열에 상태를 넣어 콜백을 다시 만드는 대신
 * ref로 읽으면 타이머가 끊기지 않는다.
 *
 * 렌더 중에 대입한다. 이펙트로 미루면 같은 커밋 안에서 한 틱 늦은 값이 읽힐 수 있다.
 * 그래서 이 훅은 순수한 거울에만 쓴다. 스스로 앞서 나가는 값(예: 카운트다운)에는 쓰지 마라.
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
