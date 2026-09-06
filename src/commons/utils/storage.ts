import { Storage } from '@apps-in-toss/native-modules';

/**
 * 저장소는 동기 예외와 Promise 거부를 둘 다 처리한다. 기획서 9장 실패 처리.
 * 저장소가 없는 환경에서도 타이머는 돌아야 한다.
 *
 * **`AsyncStorage`가 아니라 토스 저장소를 쓴다.** 미니앱을 완전히 종료하면
 * `AsyncStorage`에 넣은 것은 남지 않는다 — 기기에서 콤보와 호출어가 통째로 초기화되는 것으로 드러났다.
 * 토스 `Storage`는 "앱이 종료되었다가 다시 시작해도 유지"라고 문서가 직접 말하는 자리다.
 */

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await Storage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null; // 최초 실행이거나 저장소 미지원 환경
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    const p = Storage.setItem(key, JSON.stringify(value));
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    // 저장소 미지원 환경
  }
}
