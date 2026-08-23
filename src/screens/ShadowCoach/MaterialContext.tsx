import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { BASE_MOVES } from '../../commons/constants';
import { buildAlias, moveIndex, resolveBeat, resolveName } from '../../commons/utils';
import type { Move } from '../../commons/types';
import { useMaterial } from './hooks';

/**
 * 저장되는 자료와 거기서 바로 나오는 조회들.
 *
 * 동작 고르기·동작 추가가 별도 화면이 되면서 자료를 두 곳에서 봐야 한다.
 * 자료 자체는 useMaterial이 트리 밖에서 들고 있으니 화면마다 세워도 한 벌이다.
 * 여기 있는 건 파생 조회를 화면 안에서 한 번만 계산하려는 것뿐이다.
 *
 * **여기 올라오는 건 저장소에 들어가는 것뿐이다.** draft·tab 같은 화면 상태는 각 화면이 들고 있는다.
 */
type MaterialValue = ReturnType<typeof useMaterial> & {
  moveMap: Record<string, Move>;
  alias: Record<string, string>;
  /** 기본 동작 + 직접 추가한 동작. */
  allMoves: Move[];
  label: (id: string) => string;
  beatOf: (id: string) => number;
};

const MaterialContext = createContext<MaterialValue | null>(null);

export function MaterialProvider({ children }: { children: React.ReactNode }) {
  const material = useMaterial();
  const { customMoves, labels, beats } = material.state;

  const moveMap = useMemo(() => moveIndex(customMoves), [customMoves]);
  const alias = useMemo(() => buildAlias(customMoves, labels), [customMoves, labels]);
  const allMoves = useMemo(() => [...BASE_MOVES, ...customMoves], [customMoves]);

  const label = useCallback((id: string) => resolveName(id, labels, moveMap), [labels, moveMap]);
  const beatOf = useCallback((id: string) => resolveBeat(id, beats, moveMap), [beats, moveMap]);

  const value = useMemo(
    () => ({ ...material, moveMap, alias, allMoves, label, beatOf }),
    [material, moveMap, alias, allMoves, label, beatOf]
  );

  return <MaterialContext.Provider value={value}>{children}</MaterialContext.Provider>;
}

export function useMaterialContext(): MaterialValue {
  const value = useContext(MaterialContext);
  if (value == null) {
    throw new Error('MaterialProvider 안에서만 쓸 수 있다. pages/_layout이 감싸고 있는지 확인해라.');
  }
  return value;
}
