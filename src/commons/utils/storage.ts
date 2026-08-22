import AsyncStorage from '@granite-js/native/@react-native-async-storage/async-storage';

/**
 * 저장소는 동기 예외와 Promise 거부를 둘 다 처리한다. 기획서 9장 실패 처리.
 * 저장소가 없는 환경에서도 타이머는 돌아야 한다.
 */

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null; // 최초 실행이거나 저장소 미지원 환경
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    const p = AsyncStorage.setItem(key, JSON.stringify(value));
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    // 저장소 미지원 환경
  }
}
