import React, { createContext, useContext } from 'react';
import { useMaterial } from './hooks';

/**
 * 저장되는 자료를 화면 안에서 한 번만 읽어 내리는 자리.
 *
 * 자료 자체는 useMaterial이 트리 밖에서 들고 있으니 화면마다 세워도 한 벌이다.
 * 파생 조회는 v2에서 전부 사라졌다 — 콤보가 이름과 녹음만 갖는다.
 *
 * **여기 올라오는 건 저장소에 들어가는 것뿐이다.** draft·tab 같은 화면 상태는 화면이 들고 있는다.
 */
type MaterialValue = ReturnType<typeof useMaterial>;

const MaterialContext = createContext<MaterialValue | null>(null);

export function MaterialProvider({ children }: { children: React.ReactNode }) {
  const material = useMaterial();
  return <MaterialContext.Provider value={material}>{children}</MaterialContext.Provider>;
}

export function useMaterialContext(): MaterialValue {
  const value = useContext(MaterialContext);
  if (value == null) {
    throw new Error('MaterialProvider 안에서만 쓸 수 있다. pages/_layout이 감싸고 있는지 확인해라.');
  }
  return value;
}
