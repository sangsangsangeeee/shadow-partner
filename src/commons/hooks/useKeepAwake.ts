import { useEffect } from 'react';
import { setScreenAwakeMode } from '@apps-in-toss/native-modules';

/** 화면 꺼짐 방지. 지원하지 않는 환경이어도 타이머는 계속 돈다. 기획서 원칙 6. */
function setAwake(enabled: boolean) {
  try {
    const p = setScreenAwakeMode({ enabled });
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    // 화면 제어 미지원 환경
  }
}

/**
 * enabled인 동안에만 화면을 켜 둔다.
 *
 * 끄는 책임을 호출부에서 떼어낸다. 예전에는 시작·정지·완료·언마운트 네 곳에서
 * 각자 껐다 켰다 해야 했고, 한 곳만 빠뜨려도 화면이 계속 켜진 채 남았다.
 */
export function useKeepAwake(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    setAwake(true);
    return () => setAwake(false);
  }, [enabled]);
}
