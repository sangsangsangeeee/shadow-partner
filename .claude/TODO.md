# 남은 일

우선순위를 정하는 축은 하나다 — **실기기를 몇 번 보게 되느냐.**
TDS 교체는 보이는 걸 바꾸므로 전체 실물 점검 *앞에* 끝내야 한 번만 본다.

마지막 갱신: `5d43603` 기준. 브랜치 `feat/shadow-coach`, main 미병합.

---

## 0. 실기기 점검 — 쌓인 것부터

TDS 교체(`1503da4`) 이후 아직 기기에서 안 봤다. **다음 TDS 작업을 시작하기 전에 여기를 비워라.**
지금 쌓인 게 셋뿐이라 몇 분이면 끝나고, 여기서 어긋나면 그 위에 쌓은 게 전부 흔들린다.

- [ ] **설정 시트 스위치 색** — `trackColor`/`thumbColor`를 걷어내서 액센트가 아니라 TDS 팔레트를 따른다.
      검정 바탕에서 어색하면 되돌릴지 판단.
- [ ] **콤보 카드 터치 범위** — 줄 아무 데나 눌러 켜고 꺼지는지. **체크박스 위를 눌러도** 되는지.
      `pointerEvents="none"`이 안드로이드에서 실제로 먹는지 보는 자리다.
- [ ] **되돌리기 토스트 높이 3종** — FAB 있을 때 / 없을 때 / 키보드 올라왔을 때.
      TDS가 안전영역을 자기가 더해서 우리는 빼고 넘긴다. 어긋나면 딱 안전영역만큼 뜬다.
- [ ] **6초 자동 사라짐** — 시계 주인이 `useMaterial`에서 TDS Toast로 넘어갔다.

목소리(TTS)는 2026-08-22 확인 완료. 그 뒤로 `VoiceEngine`은 안 건드렸다.

---

## 1. TDS 남은 셋 — 위험이 낮은 순서로

방향은 자체 구현을 TDS로 밀어내는 것. 넣기 전 절차는
[design-system.md](rules/design-system.md)의 "TDS 컴포넌트를 넣기 전에".

### 1-1. `Stepper` → `StepperRow` / `NumericSpinner`

- [ ] 어느 쪽이 맞는지 `.d.ts`로 먼저 판단 (라운드 수·시간은 행 전체, 값만 필요하면 스피너)
- [ ] 4곳 교체 — 전부 [SettingsSheet.tsx](../src/screens/ShadowCoach/parts/SettingsSheet.tsx)
- [ ] [Stepper.tsx](../src/commons/components/Stepper.tsx) 76줄 삭제, 배럴에서 제거
- [ ] 훈련 중 잠금(`disabled`)이 유지되는지

**왜 먼저** — 범위가 한 파일 안에 닫혀 있다. 깨져도 설정 시트만 깨진다.

### 1-2. `Segmented` → `SegmentedControl.Root/Item`

- [ ] 제네릭(`<T extends string | number>`)을 TDS가 받는지 확인 — 못 받으면 호출부 6곳이 다 바뀐다
- [ ] `size: 'normal' | 'tall'`, `level: 'small' | 'caption'` 대응물이 있는지
- [ ] 6곳 교체 — AddMoveOverlay(2) · SettingsSheet · MovePickerOverlay · WordRow · WordsView
- [ ] [Segmented.tsx](../src/commons/components/Segmented.tsx) 72줄 삭제

**위험** — 6곳이 동시에 움직인다. `WordRow` 것은 memo가 걸린 줄 안에 있어서
prop 항등이 깨지면 [rendering.md](rules/rendering.md)의 재렌더 테스트가 잡는다. 잡히면 고마운 거다.

### 1-3. `TextInput` → `TextField`

- [ ] [Field.tsx](../src/commons/components/Field.tsx) — 라벨+입력. TDS TextField가 라벨을 갖고 있으면 이 컴포넌트가 통째로 없어진다
- [ ] [CombosView.tsx:122](../src/screens/ShadowCoach/views/CombosView.tsx#L122) — 콤보 입력. 칩 역동기화가 붙어 있다
- [ ] [WordRow.tsx:71](../src/screens/ShadowCoach/parts/WordRow.tsx#L71) — **한 줄 인라인 편집기. 여기가 제일 위험**

**위험** — TDS TextField는 자기 높이·라벨·패딩을 들고 온다.
`WordRow`는 줄 안에 끼워 넣은 좁은 편집기라 픽셀이 깨진다면 여기다.
[design-system.md](rules/design-system.md)의 픽셀 충실도 규칙이 가장 세게 걸리는 자리.

**셋을 한 커밋에 묶지 마라.** 실물에서 어디가 깨졌는지 못 짚는다.

---

## 2. 전체 실기기 점검

- [ ] 기획서 11장의 13개 시나리오를 기기에서 한 번씩 —
      `nav` `fabshow` `fab` `chip` `dup` `reveal` `undo` `moveundo` `words` `beats` `picker` `gap` `done`
- [ ] 3라운드 완주 한 번 (화면 꺼짐 방지 `useKeepAwake`가 실제로 먹는지)
- [ ] 저장소 껐다 켜기 — 앱 종료 후 콤보·설정·호출어가 살아 있는지

TDS 교체가 끝난 상태로 한 번에. 여기를 통과하면 main에 병합할 수 있다.

---

## 3. 구조 정리 — 미룰수록 이득

### 3-1. 떠 있는 층의 `bottom` 계산

**보류를 권한다.** 원래 3곳 중복이었는데 TDS Toast가 하나를 다른 모양으로 바꿔서
지금은 **동일한 표현이 2곳**뿐이다 ([index.tsx:411](../src/screens/ShadowCoach/index.tsx#L411), [429](../src/screens/ShadowCoach/index.tsx#L429)).
2곳은 묶을 만한 중복이 아니다. TDS 교체로 층이 더 줄면 그때 다시 본다.

### 3-2. `TrainView` 쪼개기

- [ ] `TrainStage`(~70줄) · `TrainControls`(~28줄) 분리 검토

316줄은 안 무겁다. **순수 취향이므로 다른 이유가 생기기 전엔 하지 마라.**
자를 거면 [architecture.md](rules/architecture.md)의 "자를지 말지" — 감이 아니라 재고 나서.

### 3-3. `preview.tsx` 삭제

- [ ] 2단계(전체 실기기 점검) 통과 후 2289줄 삭제, `tsconfig`의 `exclude`에서도 제거

원래 모습을 대조할 유일한 원본이라 그 전에는 두다.

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
