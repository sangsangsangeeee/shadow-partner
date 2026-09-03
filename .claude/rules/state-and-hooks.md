# 상태의 주인, 훅을 자르는 선

## 훅은 무겁지 않아야 한다

**하나의 훅은 하나의 관심사만 갖는다.** 여러 개를 모아 담은 신(神) 훅을 만들지 마라.
`ShadowCoach`는 세 층으로 갈라져 있고 각 층이 자기 것만 안다:

| 훅 | 아는 것 | 모르는 것 |
|---|---|---|
| `useMaterial` | 저장되는 자료 다섯 조각 | 라운드도 호출어도 |
| `useTraining` | 라운드 상태 기계 (준비·라운드·휴식·완료) | 호출어를 어떻게 고르는지 |
| `useCallouts` | 호출어 큐와 재생 타이밍 | 지금 몇 라운드인지 |

`useTraining`은 `useCallouts`를 **ref로 읽는다**(`cueRef = useLatestRef(callouts)`).
의존성 배열에 넣으면 핸들러 항등성이 매 렌더 깨진다.

반환은 `useMemo`로 고정한다. 안 그러면 이 훅을 쓰는 쪽의 memo가 전부 무의미해진다.

```ts
return useMemo(() => ({ state, dispatch }), [state]);
```

## 자료는 리액트 트리 밖에 산다

`useMaterial`은 `useReducer`가 아니라 **모듈 상태 + `useSyncExternalStore`**다.

라우터의 `_layout`은 화면을 통째로 감싸지 않고 **Screen 하나씩** 감싼다(`useRouterControls`).
훈련 화면과 동작 추가 화면이 동시에 살아 있으면 프로바이더가 두 벌 서고,
자료를 트리 안에 두면 한쪽에서 넣은 동작이 다른 쪽에 안 보인다.
게다가 둘 다 저장소에 써서 **늦게 쓴 쪽이 상대가 넣은 것을 덮는다.** 실기기에서 그렇게 깨졌다.

하위 화면이 시트로 내려오면서 지금은 라우트가 `/` 하나뿐이라 이 상황이 당장은 안 생긴다.
**그래도 `useReducer`로 되돌리지 마라.** 이 구조가 주는 것이 그 사고 하나만이 아니다 —
저장이 `dispatchMaterial` 안에서 바뀐 조각만 쓰게 되면서 이펙트 다섯 개가 사라졌고,
`dispatch`가 모듈 상수가 되면서 memo 계약이 단순해졌다([rendering.md](rendering.md)).
되돌리면 그 셋을 한꺼번에 잃고, 라우트를 다시 파는 순간 같은 사고가 그대로 돌아온다.

- 저장소 읽기는 `hydrateOnce()`가 한 번만 한다
- 저장은 `dispatchMaterial` 안에서 **바뀐 조각만** 쓴다(이펙트 다섯 개가 사라졌다)
- `dispatchMaterial`은 모듈 상수라 신원이 영영 고정이다

**트리 밖에 사는 값은 저절로 초기화되지 않는다.** 그래서 `resetMaterial()`이 있고,
화면을 세우는 테스트는 `beforeEach`에서 반드시 부른다.

`MaterialContext`는 자료를 나르는 게 아니다 — 파생 조회(`moveMap` `alias` `label` `beatOf`)를
화면 안에서 한 번만 계산하려고 있는 것이다.

## 리듀서에 넣을 것과 넣지 말 것

경계는 **"저장소에 들어가는가"**다.

**리듀서 (`useMaterial`)** — `combos` `settings` `labels` `customMoves` `beats` + `loaded` `undo`
**`useState`로 남김** — `tab` `draft` `editingId` `sheetOpen` `pickerOpen` `wordKind` `addOpen` `comboHint`

리듀서를 정당화하는 건 줄 수가 아니라 **한 조작이 여러 조각을 동시에 건드리는가**다.
동작 하나를 지우면 `customMoves` `combos` `beats` `labels` 네 곳이 같이 움직이고,
되돌리기는 그 넷을 정확히 되감아야 한다. 손으로 `setState`를 줄 세우면 한 줄 빠져도 조용히 어긋난다.

UI 상태를 리듀서에 밀어 넣지 마라. 한 뷰만 쓰고 저장도 안 되는 값을 넣으면 잡동사니 창고가 된다.

## 되돌리기 스냅샷은 좁게

```ts
export interface UndoEntry {
  text: string;
  before: Partial<Material>;   // 그 조작이 실제로 건드린 조각만
}
```

**전부 담으면, 지운 뒤에 다른 걸 고쳤을 때 되돌리기가 그것까지 같이 되감아 버린다.**
이걸 지키는 테스트가 `materialReducer.test.ts`에 있다.

`Partial<Material>` 하나로 콤보 삭제와 동작 삭제의 복원 경로가 합쳐졌다.
새 되돌리기를 추가할 때 `kind` 같은 분기를 다시 만들지 마라.

## useLatestRef

```ts
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;   // 렌더 중에 대입한다
  return ref;
}
```

이펙트로 미루면 같은 커밋 안에서 한 틱 늦은 값이 읽힌다.

**순수한 거울에만 쓴다.** 스스로 앞서 나가는 값(카운트다운처럼 ref가 state보다 먼저 가야 하는 것)에는
쓰지 마라. 그런 값은 `timeRef`처럼 직접 관리하고 `setClock`으로 둘을 함께 민다.

## 타이머

`setTimeout`을 맨손으로 부르지 마라. `useTimerBank()`를 쓴다 — `{ later, clearAll }`,
항등이 고정돼 있고 언마운트에서 스스로 정리한다.

**서로를 취소하면 안 되는 흐름은 묶음을 따로 판다.** 지금 셋이 있다:
호출어(`useCallouts` 안), 라운드 전환(`useTraining` 안), 콤보 미리듣기(화면).

같은 마감에 시계를 둘 두지 마라. 되돌리기 시계는 TDS Toast가 `duration`으로 갖고 있고,
그래서 `useMaterial`에서 `setTimeout`을 걷어냈다. 두 벌이면 어느 쪽이 이길지 아무도 모른다.

## 저장소는 실패해도 된다

`loadJSON` / `saveJSON`은 동기 예외와 Promise 거부를 **둘 다** 삼킨다.
저장소가 없는 환경에서도 타이머는 돌아야 한다(기획서 2장 원칙 6).
새 저장 지점을 추가할 때 이 계약을 깨지 마라.
