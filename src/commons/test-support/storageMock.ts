/**
 * 토스 저장소 대역.
 *
 * 실물은 미니앱을 껐다 켜도 남는다. 그래서 대역도 **테스트 파일 안에서는 살아남아야** 한다 —
 * 껐다 켜는 것을 흉내내는 테스트가 여기 값이 남아 있는지로 확인한다.
 * 테스트 사이에는 `resetStorage()`로 비운다. 안 비우면 앞 테스트가 넣은 것이 새어 나간다.
 */
const store = new Map<string, string>();

export const Storage = {
  getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
  setItem: (key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    store.delete(key);
    return Promise.resolve();
  },
  clearItems: () => {
    store.clear();
    return Promise.resolve();
  },
};

export function resetStorage() {
  store.clear();
}

/** 무엇이 들어 있는지 들여다본다. 저장까지 보는 테스트가 쓴다. */
export function storageSnapshot() {
  return new Map(store);
}
