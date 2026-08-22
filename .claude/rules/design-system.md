# TDS, 색, 글자, 픽셀 충실도

## 픽셀 충실도가 먼저다

**사용자가 실기기로 확인한다. 요청하지 않은 간격·여백·크기를 바꾸지 마라.**
리팩터링 중에 `marginBottom: 8`을 "보기 좋아서" 넣는 일이 두 번 있었고 두 번 다 되돌렸다.
구조를 옮기는 작업과 모양을 고치는 작업을 같은 커밋에 섞지 마라.

## 색

블랙 / 화이트 / 딥틸 세 갈래. **팔레트는 전부 TDS 토큰에서 가져온다** (`constants/colors.ts`).
16진수 색상을 코드에 직접 쓰지 마라. `C.*`와 `ACCENT`만 쓴다.

`ACCENT`(#076565)는 검정 위에서 어두워 **본문 텍스트에 쓰지 않는다.** 배경·테두리·강조 링 전용.

adaptive 토큰은 쓰지 마라. 이 앱은 검정 바탕 고정이고, `adaptive.teal900`은 다크에서
#d6fcff로 뒤집혀 흰 글자를 얹을 수 없다.

## 글자

모든 글자는 `Typo`를 지난다. **숫자 크기를 코드에 흩뿌리지 마라.**
`constants/typography.ts`의 `TYPO`에서 쓰임 이름으로 고른다 — `title` `body` `item` `chip` `small` `caption`.

쓰임에 없는 자리에서만 `typography` prop으로 TDS 키를 직접 준다.
스케일을 벗어나는 건 `DISPLAY`에 둘뿐이고, 둘 다 기획서가 크기를 직접 정한 자리다.

## TDS 채택

방향이 하나가 아니다. **TDS 2.0.5는 토스 브랜드 색에 묶여 있고 이 앱은 검정 + 딥틸이라,
색을 여는 컴포넌트만 받아들인다.** 들어간 것:

`TDSProvider` `Txt` `colors` `Slider` `BottomSheet` `Button` `Checkbox` `Toast`

**전역 테마로 뚫리는 건 `Button` 하나뿐이다.** 시드 토큰이 `color.primary` 하나고
거기서 파생되는 게 `button`과 `bridge`뿐이라, 번들에서 `useTheme`을 읽는 파일이 그 둘밖에 없다.
그래서 `index.tsx`가 `token={{ color: { primary: ACCENT } }}`를 넘긴다.

`Slider`는 `color` prop을 받아 액센트가 살아 있다. `Checkbox` `Toast`는 색을 못 바꾼다.

남은 셋의 조사 결과와 우선순위는 [TODO.md](../TODO.md) 1번에 있다.
**`Stepper`는 교체 불가로 결론이 났다** — 거기 근거가 적혀 있다.

**FAB는 TDS `Button`으로 바꾸지 마라.** 알약·원형 커스텀 모양이라 맞지 않는다.

**`Switch`는 TDS에서 되돌렸다.** 트랙이 `grey200 → blue500` 하드코딩이고
`style`은 바깥 `Pressable`에만 걸려 트랙에 닿지 않는다. 액센트를 못 얹어서 RN 내장으로 돌아갔다.

**`BottomSheet.CTA`에 `Button`을 넣지 마라.** CTA가 `ComponentProps<typeof Button>`을 받아
스스로 버튼을 만든다. 안에 또 넣으면 눌리는 것이 겹쳐 바깥 28px이 죽는다.

### TDS 컴포넌트를 넣기 전에

**타입 선언을 먼저 읽어라.** 문서보다 번들이 정확하다.

```bash
# .pnpm 아래 같은 버전이 두 벌 깔려 있어 head -1이 필요하다
TDS="$(find node_modules/.pnpm -maxdepth 1 -name '@toss+tds-react-native@*' | head -1)/node_modules/@toss/tds-react-native/dist/esm"

ls "$TDS/components"                        # 무엇이 있는지
cat "$TDS/components/<이름>/"*.d.ts         # prop이 무엇인지
grep -oE 'bottom:[^,}]*|zIndex:[0-9]+' "$TDS/components/<이름>/"*.js   # 스스로 무엇을 하는지
```

특히 **그 컴포넌트가 무엇을 스스로 하는지**를 확인해라. 지나쳤다가 두 번 물릴 자리다:

- `Toast`는 `bottom = bottomOffset + 하단 안전영역`이다. 안전영역을 자기가 더하므로 넘길 때 빼야 한다.
- `Toast`는 `duration`이 지나면 스스로 닫고 `onClose`를 부른다. 우리 쪽 시계를 같이 두면 안 된다.
- `Toast`의 `onClose`는 이펙트 의존성이다. 매 렌더 새 함수를 주면 시계가 되감긴다 — `useCallback`으로 고정.
- `Checkbox`는 `PressableProps`를 상속한다. 눌리는 것 안에 넣으려면 `pointerEvents="none"`.

### 색이 바뀌는 걸 미리 말해라

TDS 컴포넌트는 자기 팔레트를 따른다. `Switch`를 바꾸면서 `trackColor`/`thumbColor`가 사라졌고
액센트 색이 TDS 기본으로 바뀌었다. **이런 변화는 커밋 메시지와 보고에 반드시 적는다.**

## 접근성

누르는 것에는 `accessibilityLabel`을 단다. 터치 영역 최소 44px(`TOUCH`).
테스트가 라벨로 요소를 찾으므로, **라벨을 바꾸면 테스트가 같이 깨진다** — 그게 정상이다.
