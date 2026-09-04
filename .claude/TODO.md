# 남은 일

우선순위를 정하는 축은 하나다 — **실기기를 몇 번 보게 되느냐.**
TDS 교체는 보이는 걸 바꾸므로 전체 실물 점검 *앞에* 끝내야 한 번만 본다.

마지막 갱신: 하위 화면을 전부 바텀시트로. 브랜치 `feat/shadow-coach`, main 미병합.

---

## 진행 중 — 하위 화면을 바텀시트로. **기기 확인 대기**

풀모달이 토스 상태바까지 덮는 문제에서 시작했다. 처음엔 라우트로 풀었는데(`/add-move`),
**TDS 바텀시트가 같은 문제를 값 없이 푼다**는 걸 알고 라우트를 도로 걷어냈다.
`BottomSheetRoot`는 `Modal`이 아니라 앱 트리 안의 `position:absolute` 뷰라 토스 헤더를 안 덮는다.

한 일:

- [x] 동작 추가: `/add-move` 라우트 → `AddMoveSheet`. 라우트 3파일과 `screens/AddMove/` 삭제
- [x] 동작 고르기: 풀모달 `MovePickerOverlay` → `MovePickerSheet`
- [x] 훈련 완료만 전체 화면으로 남김. `Overlay`에서 `OverlayFrame`·`avoidKeyboard`·`headExtra` 갈래 제거
- [x] 고아가 된 `PillButton`(46줄)·`frameworkMock` 삭제
- [x] 시트가 열리면 탭바·FAB를 걷어내도록 `anySheetOpen`으로 묶음 — 셋 중 하나만 봤으면 나머지에서 뚫린다
- [x] 라우트 왕복이 사라져 "돌아온 뒤 목록 길이를 재서 뭐가 추가됐는지 추측하던" 우회로 제거

**라우트를 파며 고쳤던 것들은 이제 해당 없다** — 전환 중 흰 번쩍임, 자동 포커스 버벅임,
`goBack` 스택 쌓임, 라우트별 `contentStyle`. 화면을 안 갈아타니 전환 자체가 없다.
`screenOptions.ts`는 `/` 하나만 쓰지만 남겨 뒀다(새 라우트를 파면 다시 필요하다).

기기에서 볼 것:

- [ ] **세 시트가 토스 헤더를 안 덮는지.** 이게 이번 변경의 전제다. 깨지면 전부 되돌아간다
- [ ] **동작 추가 시트에서 키보드가 CTA를 가리는지.** 라우트일 때는 `useKeyboardHeight`로 발을 올렸는데,
      시트는 TDS가 `Keyboard.dismiss()`까지 들고 있어 자기가 처리할 것으로 본다. **확인 안 됐다**
- [ ] 동작 고르기 시트 높이 — 동작이 20개 넘는 분류에서 시트가 화면을 다 먹지 않는지
- [ ] 시트 위에 탭바·FAB가 안 뜨는지 (z를 안 거는 TDS 시트라 직접 걷어냈다)
- [ ] 시트 닫고 다시 열었을 때 지난 입력이 안 남는지 (닫힘에서 되감지만 실물로 확인)

남은 단계:

- [x] 분류 **스와이프 전환** — 호출어 탭과 동작 고르기 시트 둘 다. **기기 확인 대기**
- [ ] `Segmented` 글자 1px 키우기. 여러 화면이 공유해서 같이 움직인다.

### 스와이프에서 확인된 것 — 다시 조사하지 마라

**제스처 충돌 걱정은 근거가 없었다.** TDS 시트의 끌어서 닫기는
`Gesture.Pan().activateAfterLongPress(200)`이라(`bottom-sheet/DragAnimation.js`)
즉시 시작하는 스와이프와 시간축에서 갈린다. 붙잡고 끄는 손짓과 쓸어 넘기는 손짓은 다른 동작이다.

`react-native-gesture-handler`는 **새로 깔 필요가 없다.** `@granite-js/native/react-native-gesture-handler`로
공식 재수출되고 두 RN 버전에 다 있다. `GestureHandlerRootView`도 `TDSProvider`가 안에서
`flex:1`로 이미 감싼다 — 우리가 루트에 얹을 게 없다.

**TDS `Tabs`(extensions/tab-view)는 쓰지 마라.** 최상위 export라 후보로 보이지만 둘 다 막힌다:
`TabItem`·`Indicator`가 `useAdaptive()`의 `grey800`/`grey600` 하드코딩이라 액센트를 못 얹고
(1-2의 `SegmentedControl`과 같은 병), `TabsViewList`는 네이티브 `PagerView`에 `flex:1`이라
시트 안에서 높이를 못 잡는다. 그래서 `Segmented`를 그대로 두고 스와이프만 얹었다.

기기에서 볼 것:

- [ ] **호출어 탭에서 세로 스크롤이 안 죽는지.** `failOffsetY(12)`로 양보하게 했지만 실물 감각은 다르다
- [ ] **시트 격자에서 스와이프와 끌어서 닫기가 안 싸우는지.** 롱프레스 200ms로 갈린다는 게 코드 근거다
- [ ] **넘김 임계 60px이 적당한지.** 너무 예민하면 동작을 누르려다 분류가 바뀐다
- [ ] 끝 분류에서 더 쓸었을 때 아무 일도 안 일어나는 게 답답하지 않은지 (감기지 않게 했다)

**키보드·시트 작업과 한 브랜치에서 만났다.** 겹친 자리가 둘이고 둘 다 손으로 합쳤다:

- 호출어 탭에서 분류를 바꿀 때 `revealRef`를 비우는 처리가 `changeKind` 안으로 들어갔다.
  스와이프로 바꿔도 굴려 갈 대상이 같이 지워져야 한다 — 사라진 줄을 뒤늦게 겨누면 엉뚱한 자리로 간다.
- 목록의 자리를 재던 `<View onLayout>`이 `SwipeArea`가 세우는 `View`로 바뀌었다.
  그래서 `SwipeArea`가 `onLayout`을 물려준다. **이 둘은 같이 봐야 한다** —
  스와이프로 분류를 옮긴 뒤 줄을 펼쳤을 때 제자리로 굴려 가는지.

**루트 `pages/`와 `src/pages/`는 통일할 수 없다.** 플러그인이 스캔 경로(`pages`)와
출력 경로(`src/router.gen.ts`)를 하드코딩하고 옵션은 `watch` 하나뿐이다.
새 라우트는 두 파일이 짝이다. 루트 쪽을 **빈 파일로** 먼저 만들면 플러그인이 템플릿을 채운다
(내용이 있으면 `add`에서 그냥 빠져나간다). 이미 있는 파일은 다시 저장하면 `router.gen.ts`가 갱신된다.
라우트를 지울 때는 두 파일과 `router.gen.ts`의 해당 줄을 같이 지운다.

---

## 0. 실기기 점검 — 쌓인 것부터

훈련 화면은 2026-08-22에 개발 서버로 보면서 고쳤다. **아래는 아직 기기에서 안 본 것들이다.**

- [ ] **콤보 카드 터치 범위** — 줄 아무 데나 눌러 켜고 꺼지는지. **체크박스 위를 눌러도** 되는지.
      `pointerEvents="none"`이 안드로이드에서 실제로 먹는지 보는 자리다.
- [ ] **되돌리기 토스트 높이 3종** — FAB 있을 때 / 없을 때 / 키보드 올라왔을 때.
      TDS가 안전영역을 자기가 더해서 우리는 빼고 넘긴다. 어긋나면 딱 안전영역만큼 뜬다.
- [ ] **6초 자동 사라짐** — 시계 주인이 `useMaterial`에서 TDS Toast로 넘어갔다.
- [ ] **스위치 모양 양쪽 기기** — RN 내장으로 되돌려서 iOS·안드로이드가 각자 기본 모양으로 그려진다.
      TDS는 50×30 고정이었다. iOS는 `thumbColor`를 무시할 수 있다.
- [ ] **시트 완료 버튼 가장자리** — 이중 버튼을 걷어냈다. 바깥 28px이 실제로 눌리는지.
- [ ] **탭바 내려가는 타이밍** — 시트는 스프링(`spring.quick`), 탭바는 220ms 등속이라 곡선이 다르다.
      어긋나 보이면 탭바 쪽을 맞춘다.
- [ ] **콤보·호출어 탭의 빈 헤더** — 타이틀을 지워서 그 두 탭은 헤더가 완전히 빈다.
      여백을 줄일지는 보고 정한다.

목소리(TTS)는 2026-08-22 확인 완료. 그 뒤로 `VoiceEngine`은 안 건드렸다.

---

## 1. TDS 남은 것 — `.d.ts`를 다 읽고 결론이 바뀌었다

**아래는 추측이 아니라 번들에서 확인한 것이다. 다시 조사하지 마라.**

공통 원인 하나가 셋 전부에 걸린다 — **TDS 2.0.5는 토스 브랜드 색(파랑·회색)에 박혀 있고
이 앱은 검정 + 딥틸이다.** 전역 테마(`TDSProvider`의 `token`)로 뚫리는 건 `Button` 하나뿐이다.

### 1-1. `Stepper` → **교체 불가. 하지 마라**

TODO에 적혀 있던 후보 지정이 이름만 보고 한 오답이었다.

- `StepperRow`는 값 증감이 아니다. 온보딩 절차를 나타내는 행이다 —
  `NumberIcon`(1~7) · `Texts`(제목/설명) · 연결선(`hideLine`) · 오른쪽 화살표/버튼.
- `NumericSpinner`에는 **`step`이 없다.** 항상 ±1이고 `format`도 `suffix`도 없다.

우리 4곳이 전부 걸린다 — 라운드 시간(`step={15}` + `fmt`의 `3:00`), 휴식(`step={10}` + `fmt`),
라운드(`suffix="회"`), 라운드당 호출(`suffix="번"`).

**4곳 중 0곳이 그대로 옮겨진다.** 둘만 바꾸면 같은 시트 안에 두 모양이 섞이고
[Stepper.tsx](../src/commons/components/Stepper.tsx) 76줄도 못 지운다 — 노렸던 이득이 사라진다.

### 1-2. `Segmented` → `SegmentedControl.Root/Item`

제네릭 우려는 사실이었다. `Root`는 `value: string` 고정인데
`BEAT_SEGMENTS`의 값은 **number**(0.4·0.5·0.65·0.85·1.05)다.

- [ ] `AddMoveSheet`·`WordRow` 두 곳에 문자열 왕복(`String`/`Number`)을 붙인다
- [ ] `name: string`이 필수 — 6곳 전부 새 prop
- [ ] 세로 패딩이 `small` 5px / `large` 7px다. 우리는 `normal` 10 / `tall` 14 — **납작해진다**
- [ ] `level: 'small' | 'caption'` 대응물 없음. 글자가 `t6`/`t5`로 내부 고정이라
      동작 길이 5칸에서 줄이지 못한다
- [ ] 6곳 교체 — AddMoveSheet(2) · SettingsSheet · MovePickerSheet · WordRow · WordsView
- [ ] [Segmented.tsx](../src/commons/components/Segmented.tsx) 72줄 삭제

**색** — 인디케이터가 `colorPreference`만 보고 `dark → inverseGrey300`으로 하드코딩돼 있다.
선택된 칸의 `ACCENT` 딥틸이 회색이 된다. `Indicator`는 공개 API(`SegmentedControl = { Root, Item }`)에
없어서 갈아끼울 통로도 마땅치 않다.

**위험** — 6곳이 동시에 움직인다. `WordRow` 것은 memo가 걸린 줄 안에 있어서
prop 항등이 깨지면 [rendering.md](rules/rendering.md)의 재렌더 테스트가 잡는다. 잡히면 고마운 거다.

### 1-3. `TextInput` → `TextField`

**계약은 셋 중 제일 잘 맞는다.** `variant`(필수) · `label` · `labelOption` · `help` · `hasError` ·
`paddingTop/Bottom` · `containerStyle` · `prefix`/`suffix`/`right`가 있고 `TextInputProps`가 통과한다.

- [ ] [Field.tsx](../src/commons/components/Field.tsx) — 라벨이 내장이라 이 컴포넌트가 통째로 없어진다
- [ ] [CombosView.tsx:125](../src/screens/ShadowCoach/views/CombosView.tsx#L125) — 콤보 입력. 칩 역동기화가 붙어 있다
- [ ] [WordRow.tsx:71](../src/screens/ShadowCoach/parts/WordRow.tsx#L71) — **한 줄 인라인 편집기. 여기가 제일 위험**

**색은 못 맞춘다.** 색 prop이 없고 전부 `useAdaptive()`가 정한다 —
글자 `grey800` · 플레이스홀더 `grey500` · 라인 `grey100` / 포커스 `blue400` / 오류 `red600`.
`backgroundColor`·`placeholderColor`를 받는 건 `OldTextField`인데 **deprecated**다.

**위험** — TDS TextField는 자기 높이·라벨·패딩을 들고 온다.
`WordRow`는 줄 안에 끼워 넣은 좁은 편집기라 픽셀이 깨진다면 여기다.

### 못 하는 것 둘

- **바텀시트 열고 닫는 속도** — `Container.js`에 `spring.quick`(stiffness 800 / damping 55)이 박혀 있다.
  `RootProps`에 속도 prop이 없고 `style`은 애니메이션이 걸린 wrapper가 아니라 안쪽 컨테이너로 간다.
  `Container`는 export되지도 않는다. 바꾸려면 자체 시트를 만드는 수밖에 없다.
- **`Switch` 트랙 색** — `grey200 → blue500` 하드코딩. 그래서 RN 내장으로 되돌렸다.

**둘을 한 커밋에 묶지 마라.** 실물에서 어디가 깨졌는지 못 짚는다.

---

## 2. 전체 실기기 점검

- [ ] 기획서 11장의 14개 시나리오를 기기에서 한 번씩 —
      `nav` `fabshow` `fab` `chip` `dup` `reveal` `undo` `moveundo` `addmove` `words` `beats` `picker` `gap` `done`
- [ ] 3라운드 완주 한 번 (화면 꺼짐 방지 `useKeepAwake`가 실제로 먹는지)
- [ ] 저장소 껐다 켜기 — 앱 종료 후 콤보·설정·호출어가 살아 있는지

TDS 교체가 끝난 상태로 한 번에. 여기를 통과하면 main에 병합할 수 있다.

---

## 3. 구조 정리 — 지금 비용을 물리지 않는 것들

**"구조 정리는 미룬다"는 규칙이 아니다.** 지금 실제로 비용을 물리고 있는 구조 문제는 즉시 한다 —
2104줄을 556줄로 가른 작업이 그랬다. 아래 셋이 뒤로 밀린 이유는 각각 다르고, 셋 다 그 이유가 사라지면 올라온다.


### 3-1. 떠 있는 층의 `bottom` 계산

**보류를 권한다. 이유 — 모양이 아직 움직이는 중이다.**

원래 3곳 중복이었는데 TDS Toast가 하나를 다른 모양으로 바꿔서
지금은 **동일한 표현이 2곳**뿐이다 ([index.tsx:401](../src/screens/ShadowCoach/index.tsx#L401), [419](../src/screens/ShadowCoach/index.tsx#L419)).
3곳일 때 묶었다면 추상을 만들고, TDS가 한 호출부를 어긋나게 만들고,
그걸 억지로 늘리거나 도로 푸는 일을 했을 것이다.
페이지 이식 때 셋째(`Overlay`의 발)가 잠깐 생겼다가 시트 전환으로 다시 사라졌다 —
`useKeyboardHeight`를 쓰는 곳은 이제 이 둘뿐이다. **한 번 늘었다 줄어든 것 자체가 근거다.**
변하는 중인 모양 위에 추상을 얹지 마라. TDS 교체로 층이 더 줄면 그때 다시 센다.

### 3-2. `TrainView` 쪼개기

- [ ] `TrainStage`(~70줄) · `TrainControls`(~28줄) 분리 검토

**이유 — 지금 풀 문제가 없다.** 316줄은 안 무겁고, 자를 근거가 취향밖에 없다.

지금 자르면 **어디를 자를지를 감으로 정하게 된다.** 나중에 진짜 이유가 생기면
(prop 수가 실제로 터지거나, 다른 데서 재사용하게 되거나) 그 이유가 자를 자리를 알려준다.
미뤄서 이득이 아니라 **미뤄도 손해가 없고 근거만 늘어난다.**
자를 거면 [architecture.md](rules/architecture.md)의 "자를지 말지" — 감이 아니라 재고 나서.

### 3-3. `preview.tsx` 삭제

- [ ] 2단계(전체 실기기 점검) 통과 후 2289줄 삭제, `tsconfig`의 `exclude`에서도 제거

**이유 — 순서 문제일 뿐이다.** 리팩터링이 아니라 삭제고, 나중에 지우는 비용은 똑같다.
다만 실기기 점검 때 원래 모습을 대조할 유일한 원본이라, 점검 전에 지우면 필요한 걸 없애는 게 된다.

---

## 하지 않기로 한 것

되살리자는 제안이 나오면 여기를 먼저 읽어라.

| 항목 | 이유 |
|---|---|
| FAB를 TDS `Button`으로 | 알약·원형 커스텀 모양이라 맞지 않는다. 실물에서 어색하면 그때 다시 |
| adaptive 색 토큰 | 검정 바탕 고정. 다크에서 뒤집혀 흰 글자를 못 얹는다 |
| 애니메이션으로 콤보 보여주기 | 기획서 12장 — 화면을 응시하게 만들어 자세가 무너진다 |
| 리듬게임 UI·판정·점수 | 기획서 12장 — TTS 첫 호출 지연이 100~400ms 튄다. 어긋난 리듬을 배우게 된다 |

기획서 10장의 보류 항목 9개(음성 입력, 콤보 순서 바꾸기, 폴더·태그·검색, 훈련 기록 등)는
**기획 판단이 필요한 것들이다. 코드로 먼저 만들지 마라.**
