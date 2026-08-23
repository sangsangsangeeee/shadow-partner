# memo가 실제로 걸리게 하는 법

`React.memo`를 붙이는 건 쉽고, 그게 아무 일도 안 하게 만드는 건 더 쉽다.
`ComboCard`와 `WordRow`가 memo를 쓰고, 그게 진짜로 걸리는지 지키는 테스트가
`src/screens/__tests__/memo.test.tsx`에 있다.

## 콜백은 id를 받는다

닫아 넣지 말고 인자로 받아라. 그래야 함수 항등이 목록 전체에서 하나로 유지된다.

```tsx
// 나쁨 — 항목마다 새 함수, memo 무력화
{combos.map((c) => <ComboCard onToggle={() => toggle(c.id)} />)}

// 좋음 — 함수 하나를 전부가 나눠 쓴다
const onToggle = useCallback((c: Combo) => dispatch({ type: 'toggleCombo', id: c.id }), [dispatch]);
{combos.map((c) => <ComboCard combo={c} onToggle={onToggle} />)}
```

`dispatch`는 신원이 고정돼 있다(지금은 모듈 상수다). 그래서 리듀서로 옮기면서 `combosRef`를 지울 수 있었다 —
목록을 읽으려고 ref를 들 필요가 없어졌다.

의존성이 자주 바뀌어서 `useCallback`이 소용없을 때는 `useLatestRef`로 스냅샷을 잡고
의존성 배열을 비워라.

## 풀린 값을 넘길지, 푸는 함수를 넘길지

**이게 이 코드베이스에서 가장 미묘한 자리다. 둘 다 옳고, 자리마다 다르다.**

```tsx
<ComboCard label={label} />   // 함수를 넘긴다
<WordRow name={name} />       // 풀린 문자열을 넘긴다
```

- `ComboCard` — 호출어를 바꾸면 **모든** 카드의 칩 글자가 따라 바뀌어야 한다.
  함수를 넘겨야 `labels`가 바뀔 때 전부 다시 그려진다. 여기선 다시 그리는 게 정답이다.
- `WordRow` — 한 줄에서 타자를 치는 동안 **나머지 줄의 prop이 그대로여야** 한다.
  `label` 함수를 그대로 넘기면 한 글자마다 목록 전체가 다시 그려진다.

고를 때 물어라 — *이 값이 바뀌면 정말 전부 다시 그려져야 하나?*

## 측정은 바깥에서

`TrainView`는 `availH`를 **바깥 컨테이너**에서 잰다. 안쪽에서 재면 스케일이 높이를 바꾸고
높이가 다시 스케일을 바꿔서 되먹임 고리가 생긴다.

## 떠 있는 층

기획서 9장 표 그대로 `LAYER` 상수에 있다. **`zIndex`를 빼먹지 마라.**
iOS는 그리는 순서 덕에 우연히 동작하지만, 안드로이드는 앞 형제(스크롤 뷰)가 터치를 먼저 가져간다.

## 중첩 Pressable

`Tap` 안에 눌리는 것을 또 넣지 마라. 안드로이드에서 터치를 가로챈다.
상태만 보여줄 거면 `pointerEvents="none"`으로 감싼다 — `ComboCard`의 체크박스가 그렇다.
