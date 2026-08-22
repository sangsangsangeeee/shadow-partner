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
