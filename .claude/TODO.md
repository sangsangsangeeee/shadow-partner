# 남은 일

우선순위를 정하는 축은 하나다 — **실기기를 몇 번 보게 되느냐.**
그래서 보이는 걸 바꾸는 일은 실물 점검 *앞에* 몰아서 끝낸다.

## 내일 여기서 시작한다 (2026-09-13 마감 기준)

**브랜치 `feat/shadow-coach`. 마지막 커밋은 이 문서 커밋. 작업 트리 깨끗.**
관문 전부 초록 — `tsc` 0 · `eslint` 0 · `jest` 162/162 (11묶음) · `ait build` 0/0 양쪽 RN. 이 숫자는 지우기 뒤에 크게 줄어든다.

**[기획서](../docs/shadow-partner-spce.md)는 v2, 코드는 아직 v1 + 녹음이다.** 무슨 일이 있었나:

1. TTS가 두드린 리듬을 못 따라갔다(말 하나 읽는 시간이 하한). 사용자가 녹음을 냈고, 토스 모듈엔 마이크가 없어
   숨은 WebView의 `getUserMedia`로 스파이크했더니 **iOS에서 됐다**(AAC 2초 50KB). `d85893d`가 두드리기+녹음(A)이다.
2. 기기에서 써 본 사용자가 판을 뒤집었다 — **TTS 전부 제거, 목소리·말 속도 설정 제거, 두드리기 제거, 호출어 탭 제거,
   콤보 = 녹음 + 이름.** 여덟 결정: 마이크 없으면 시작 때 알림 · 템포 = 재생 속도 0.8~1.3 · **이름 필수** ·
   옛 콤보 버림 · 8초 상한 · 앞뒤 침묵은 소리로 · 훈련 화면은 이름 + 막대 · 카드는 듣기·이름·다시 녹음·삭제.
3. 기획서를 v2로 다시 썼다(570 → 430줄). 6·7장(파서·리듬)과 4.5·4.6(고르기·호출어)이 나갔고 11장에 이유가 있다.

**막고 있는 질문: 없다.** 안드로이드 미확인은 보류(기획서 9장). 아래 순서대로 가면 된다 — **1번은 지우기다. 만들기 전에 지운다.**

---

## 1. 지우기 커밋 — 파서·동작·호출어·두드리기·TTS를 걷는다

**목표: 이 커밋 하나로 `jest`가 초록이고, 앱이 "녹음만 되는 v2 뼈대"로 선다.** 새 기능은 안 만든다. 빈 자리는 비워 둔다.
`tsc`가 길을 안내한다 — 아래 순서로 지우면 오류가 위에서 아래로 흘러간다.

### 1-1. 자료형 (`commons/types.ts`)

```ts
Combo    { id; name: string; on; ms: number; head: number; tail: number }   // rhythm·moves·clip 제거
Clips    그대로
Material { combos; settings; clips }                                        // labels·customMoves·beats 제거
Settings rate·voiceURI 제거
삭제: Move · Kind · Labels · Beats · AliasMap · ClipMeta · VoiceOption · Stats.moves (Stats는 { combos }만)
```

`head`/`tail`은 초. 지우기 단계에서는 값이 안 들어온다 — 2번에서 엔진이 잰다. 지금은 `head: 0, tail: ms/1000`으로 두는 자리를 남긴다.

### 1-2. 상수

- `constants/moves.ts` → **`constants/training.ts`로 이름을 바꾼다.** 남는 것: `MODES` `CUES` `DEFAULTS`(rate·voiceURI 빼고, tempo는 1.0 그대로) `STORAGE_KEYS`(combos·settings·clip).
  나가는 것: `BASE_MOVES` `KIND_LABEL` `KINDS` `BEAT_OPTIONS` `NUM_WORDS` `COMBO_MAX_MOVES`.
- **`LEGACY_KEYS = ['sbc:labels', 'sbc:moves', 'sbc:beats']`**를 같이 둔다. hydrate가 지운다(1-5).
- `constants/layout.ts` — `CHIP_TRAY_H` 삭제. `layout.test.ts`의 그 케이스도.
- `constants/typography.ts` — `COMBO_SIZE`는 남는다(카드·이름 입력 글자). `DISPLAY.done`도.
- 배럴 `constants/index.ts` 갱신.

### 1-3. commons/utils

- **삭제**: `parser.ts`(167줄) + `__tests__/parser.test.ts`(32개), `rhythm.ts`.
- `naming.ts` → **`play.ts`로.** `moveIndex` `resolveName` `resolveBeat` `comboSteps` 삭제. `clipPlan`만 남기되 **서명이 바뀐다**:
  `clipPlan(combo, tempo) → { from, duration, total }` — `head−0.15`에서 `min(ms/1000, tail+0.3)`까지, 템포로 나눈다. `marks`는 없다(칩이 없다).
  `CLIP_LEAD = 0.15`, `CLIP_TAIL = 0.3`.
- `__tests__/steps.test.ts` → `play.test.ts`. `comboSteps` 5개 나가고 `clipPlan` 3개를 새 서명으로 다시.
- `storage.ts` 그대로(`removeJSON` 남는다).

### 1-4. 소리 엔진 (`commons/components/VoiceEngine.tsx`)

- 나가는 것: `speak`, `hush`(→ `stop`으로 이름 바꾼다 — 녹음 재생을 끊는 것이 남는다), `voices` 상태와 `reportVoices`, `speechSynthesis` 관련 JS 전부, `Command`의 `'speak'`.
- 남는 것: `prime` `bell` `clapper` `blip` `tick` `tone`, 녹음 다섯(`recordStart/Stop` `loadClip/dropClip/playClip`), `recordEvent`, `baseUrl: 'https://localhost'`.
- `CoachVoice` 타입 정리. **`tick`은 두드림용이었다 — 무대 누를 때 한 번 쓰는 걸로 남긴다**(녹음 시작을 손으로 안다).

### 1-5. 자료 (`hooks/useMaterial.ts`)

- 액션 삭제: `addMove` `renameMove` `setLabel` `setBeat` `resetMove` `applyNumberLabels` `resetBaseMoves` `removeMove`.
- `addCombo { name, clip: NewClip }` · `replaceCombo { id, name?, clip?: NewClip | null }` — `moves`·`rhythm` 없음. **이름만 고치면 `clip` undefined.**
- `INITIAL_COMBOS` 삭제. `INITIAL.combos = []`.
- `removeCombo`의 되돌리기 문구: `${name} 지웠어`.
- **hydrate**: `combos`를 읽은 뒤 **`ms`가 없는 콤보(v1 것)는 버린다.** 남은 콤보의 본체를 `sbc:clip:<id>`에서 읽는다.
  `labels/moves/beats`는 읽지 않고 **`LEGACY_KEYS`를 `removeJSON`으로 지운다.** 한 번만 — 없으면 아무 일도 없다.
  옛 콤보의 `moves`/`rhythm`/`clip` 필드는 그냥 버려진다(새 형에 없다).
- `persist`에서 labels·moves·beats 줄 삭제.
- 테스트: `materialReducer.test.ts`의 `removeMove` 절과 `base()`의 labels·customMoves·beats 삭제. 녹음 절은 새 액션 서명으로. `persist.test.ts`의 "조각은 서로를 끌고 가지 않는다"에서 labels/moves/beats 언급 정리. **hydrate가 옛 콤보와 옛 키를 버리는 테스트를 새로**(persist에, `Storage.getItem`을 흉내내서).

### 1-6. 화면 자료 (`MaterialContext.tsx`)

`moveMap` `alias` `allMoves` `label` `beatOf` 전부 삭제. 남는 건 `useMaterial()` 결과를 한 번만 읽어 내리는 것뿐 — 그래도 프로바이더는 둔다(트리 밖 자료를 화면 안에서 한 번 읽는 자리).

### 1-7. 훅

- `useCallouts` — `moveMap` `beats` `speakMove` 삭제. `playCombo`는 **녹음만** 튼다: `clips[combo.id]`가 없으면 그 콤보를 건너뛰고 `pickNext()`.
  `comboSteps` 갈래 삭제. `activeIdx` 삭제(칩이 없다). `Stats.moves` 삭제.
- `useTraining` — **`speak` 매개변수 삭제.** 106줄 `speakRef.current('준비')`와 210줄 `'운동 끝. 수고했어요'`가 TTS다.
  준비는 비프가, 끝은 벨이 이미 알린다. 그냥 지운다.
- `comboDraft.ts` — 이 커밋에서는 **통째로 삭제**하지 않고 최소로 깎는다: `slots·cursor·text·unknown·overflow·taps·rhythm·firstTap` 삭제,
  `type·pick·clear·open` 액션 삭제, `tap` 삭제. 남는 것: `stage: 'idle' | 'recording' | 'named'`, `recording` 다섯 상태, `session`, `recStart`,
  `clip`, `name`, `editingId`, `hint`, `reRecorded`. 액션: `arm` `recStarted` `recFailed` `recorded` `finish` `cancel` `setName` `edit` `hint` `reset`.
  **`finish`는 `stage: 'named'`로.** 테스트 21개 중 두드리기·슬롯 절 삭제, 녹음 절은 새 형에 맞춰 남긴다(≈7개).

### 1-8. 화면 (`index.tsx`, 737줄)

- 삭제: `wordKind` `wordsEditing` `pickerOpen` `addMoveOpen`, `nameOf` `speak` `speakMove` `labelRef` `moveRef` `customMovesRef` `beatsRef`,
  `changeWordName/Beat` `resetWord` `previewWord` `deleteMove` `applyNumbers` `resetBaseLabels`, `openPicker/closePicker/openAddMove/closeAddMove/afterAddMove`,
  `changeDraftText` `pressSlot` `pickMove` `openSlot`, `draftMoves` `dupCombo`, 동작 추가 FAB 층, `MovePickerSheet` `AddMoveSheet`, `WordsView`.
- `TABS`는 둘. `anySheetOpen = sheetOpen`. `scrollPad`의 `tab === 'words'` 갈래 삭제.
- `saveCombo`: `stage !== 'named'`면 return → 이름 비었으면 `이름을 적어줘` → 녹음 없으면(마이크 실패로 `clip` null이고 수정도 아니면) `녹음이 없어` → 저장.
- `canSave = stage === 'named' && name.trim() && (clip || (editingId && !reRecorded))`.
- `listenDraft`: 녹음 갈래만(TTS·blip 갈래 삭제).
- `previewCombo`: 녹음 갈래만.
- `editor`: `onTap`(=arm) `onFinish` `onCancel` `onRetap` `onListen` `onNameChange`.
- 설정 시트 `onTestSound` → `onTestBell`(`voice.bell(1)`).

### 1-9. 뷰·부품

- **삭제**: `views/WordsView.tsx`(229) · `parts/WordRow.tsx`(187) · `parts/AddMoveSheet.tsx`(115) · `parts/MovePickerSheet.tsx`(122) · `parts/SlotRow.tsx`(42).
- `parts/TapStage.tsx` → **`RecordStage.tsx`**. 두드림·`count`·`nativeEvent.timestamp` 삭제. 이 커밋에서는 `눌러서 녹음` / 녹음 중(`● 말해`·취소·완료) / 마이크 줄만. 경과 초는 2번.
- `views/CombosView.tsx` — 슬롯 줄·한 줄 입력·넘침·미인식·중복 상자·도움말 삭제. `named` 단계에 `녹음 n초`·듣기·다시 녹음·취소·**이름 `TextInput`**(`Field` 재사용, `autoFocus`). 빈 목록 안내 `눌러서 첫 콤보를 녹음해`.
  `DraftEditor` 정리. 카드 목록·전체 선택·되돌리기는 그대로.
- `parts/ComboCard.tsx` — `moves.map(label)` 대신 `name` + `${(ms/1000).toFixed(1)}초`. `label` prop 삭제. 메뉴: 듣기·이름 고치기·다시 녹음·삭제(다시 녹음 wiring은 2번, 여기선 `onRerecord` prop만).
- `views/TrainView.tsx` — 동작 칩 줄·비트 트랙·`moveMap`·`label`·`beatOf`·`activeIdx` 삭제. `activeCombo`가 있으면 **이름 + `FillBar`(ms = clipPlan total)**. 316줄이 꽤 준다 — 3-2(쪼개기)는 완전히 죽는다.
- `parts/SettingsSheet.tsx` — 목소리 `Segmented`(voices)·말 속도 `Slider` 삭제. `소리 테스트` → `벨 테스트`. 템포 슬라이더 `min 0.8 max 1.3 step 0.05`.
- `parts/DoneOverlay.tsx` — 동작 수 행 삭제(통계 4행 → 3행. 기획서 4.3).

### 1-10. 죽은 공용 조각 — 쓰는 곳이 없어지면 내린다(architecture.md "쓰는 곳이 줄면 도로 내려라")

| 조각 | 쓰던 곳 | 처분 |
|---|---|---|
| `SwipeArea` `useAdjacentStep` `test-support/gestureMock` | 호출어 탭·고르기 시트 | **삭제.** 테스트 상단의 `gesture-handler` mock 줄과 `resetGestureMock` 호출도 |
| `useSheetHeight` | 고르기·동작 추가 시트 | **삭제**(설정 시트는 키를 고정하지 않는다 — 확인하고) |
| `Segmented` | 설정 시트 모드 | 남는다 |
| `Stepper` `Slider` `Field` | 설정 시트 · 이름 입력 | 남는다. `Field`는 이름 입력에 쓴다 |
| `Icons.tsx`의 `LayoutGrid` `Megaphone` `Pencil` | 고르기·호출어 탭·편집 | 쓰는 곳 없으면 삭제 |
| `useExpiringState` | 카드 강조(`reveal`) | `reveal`이 중복 안내에서 왔다 — 중복이 없어지면 **강조도 죽는다.** `highlight`·`reveal`·`lit`·`measureCard` 삭제, 훅도 |

### 1-11. 테스트 — 예상

| 묶음 | 지금 | 지운 뒤 |
|---|---|---|
| `parser.test` | 32 | **0 (파일 삭제)** |
| `comboDraft.test` | 21 | ≈7 (녹음 절) |
| `steps.test` → `play.test` | 8 | 3 |
| `screen.test` | 30 | ≈10 — nav(탭 둘)·훈련 화면·엔진 absolute·undo 넷·settings·시작 죽은 버튼. fabshow·fab·slot·dup·picker·words 절 삭제 |
| `flows.test` | 9 | ≈3 — gap·done·저장소(이름+녹음으로 다시). reveal·addmove·moveundo·beats 삭제 |
| `memo.test` | 4 | 2 — WordRow 둘 삭제, ComboCard·slider 남음 |
| `materialReducer.test` | 14 | ≈5 — removeMove 절 삭제, 녹음 절 새 서명 |
| `persist.test` | 11 | ≈11 — 조각 이름 정리 + hydrate 정리 테스트 추가 |
| `cues` `ring` `layout` | 8·23·2 | 8·23·1 |

**≈70개.** 화면 테스트의 `tapCombo` 헬퍼는 `recordCombo(name)`이 된다 — 무대 `pressIn` → `완료` → 이름 `changeText` → `콤보 저장`.
마이크는 대역에서 영영 안 켜지므로 **`clip`이 null인 채 저장이 막힌다**(`녹음이 없어`). 저장까지 가는 화면 테스트는
`voice.recordEvent`를 흉내낼 수 없으니, **`dispatchMaterial({type:'addCombo', name, clip})`으로 콤보를 심고** 목록·삭제·되돌리기·훈련을 본다.
`screen.test`의 `setup()`이 이미 그렇게 할 수 있다(`SEED` 자리).

### 1-12. 마무리

- `workflow.md`의 죽은 스타일 스크립트.
- `testing.md`: 묶음 표·개수 갱신. `gestureMock`·스와이프 문단 삭제. "아직 실물로만 확인되는 것"에서 TTS 문장 삭제, 녹음 문장 남김.
- `CLAUDE.md` 지도는 이미 v2다. "지금 어디까지 왔나"의 v1 문단들을 이때 걷는다.
- 커밋 메시지에 **왜 지우는지**(11장 근거)와 테스트 수 변화.

---

## 2. 녹음 무대·이름·카드 커밋 — 4.4를 완성한다

### 2-1. 엔진

- `recordStart(maxMs)` — **8초 상한.** `recorder.start()` 뒤 `setTimeout(recordStop, maxMs)`. 앱 쪽 `finish`가 먼저 오면 그 타이머는 `recordStop`이 지운다.
  상한에 닿아 멈춘 것도 같은 `recorded`로 온다 — 앱은 구분할 필요 없다.
- **`head`·`tail` 측정** — `recorded` 전에 `decode`한 `AudioBuffer`의 `getChannelData(0)`를 10ms 창으로 RMS. 최대 RMS의 **5%**를 처음·마지막으로 넘는 창의 시각(초).
  소리가 하나도 없으면 `head = 0, tail = duration`. `recorded { data, duration, head, tail }`로 보낸다. 문턱은 기획서 6장에 있다 — 기기에서 조정.
- 엔진 `ready` 메시지에 **`mic: boolean`**(`navigator.mediaDevices?.getUserMedia && window.MediaRecorder`)을 싣는다. 앱이 시작 알림에 쓴다.
- `playClip`은 그대로(from·duration·rate).

### 2-2. 초안 리듀서 (`comboDraft.ts`)

```
idle ──arm──▶ recording ──finish──▶ named ──(save)──▶ reset
                 │ cancel               │ retap(=arm, 이름 유지)
                 ▼                      │ cancel → reset
               idle                     ▼ recording
```

- `recorded { data, duration, head, tail }` — `stopping`에서만 받는다(취소한 녹음 거르기). `clip = { data, duration, head, tail }`.
- `recStart`·`firstTap`·`offset`은 **없어진다** — 앞을 소리로 자르니 시각을 맞출 필요가 없다.
- `edit { combo }` — `named`로, `name` 채우고 `clip` null, `reRecorded` false. 카드의 "이름 고치기"와 "다시 녹음" 둘 다 여기로 들어오되
  다시 녹음은 곧바로 `arm`을 잇는다(`reRecorded` true).
- `setName { text }`.
- **경과 초**는 리듀서가 아니라 무대 부품이 `recording === 'on'`인 동안 `setInterval(100ms)`로 센다 — 자료가 아니다.
- 테스트: 상태 전이 ≈10개. "취소한 뒤 도착한 본체는 버린다"는 그대로 산다.

### 2-3. 무대 (`RecordStage.tsx`)

- 쉼: `눌러서 녹음` (누르면 `prime()` + `tick()` + `arm`).
- 녹음 중: 경과 초 `3.2`(`DISPLAY.done` 크기), `● 말해` / `마이크 켜는 중…` / `마이크를 못 써 — 콤보를 만들 수 없어`, `취소` `완료`.
  녹음 중엔 무대를 눌러도 아무 일 없음(두 번 누르면 재시작되는 사고 방지).
- 이름: `녹음 2.3초` · `듣기` `다시 녹음` `취소` · **이름 입력**(`Field`, `autoFocus`, `returnKeyType="done"`, 엔터 = 저장).
- 마이크 X(엔진 `mic: false`): 무대가 그 줄만 보이고 안 눌린다 — **눌리는 것에 이유가 쓰여 있으니 죽은 버튼이 아니다**(원칙 2).
- 고정 높이 `STAGE_H = 180` 유지. 모양(살짝 움직임)은 **아직 안 넣는다** — 모양 커밋에서.

### 2-4. 시작 알림

- `voice.micAvailable: boolean | null`(ready 전 null). `false`가 되면 세션에 한 번 TDS **`AlertDialog`**(`open` `title` `description` `onClose`):
  제목 `마이크를 못 써`, 본문은 기획서 4.4 문구. 색을 얹을 필요가 없는 자리라 TDS 그대로 받는다 — design-system.md의 "액센트를 얹을 수 있나" 질문을 통과한다.
- 테스트: `tdsMock`에 `AlertDialog` 대역 추가(열리면 title·description 텍스트 렌더). WebView 대역이 `ready`를 못 보내니 `micAvailable`을 어떻게 흉내낼지 —
  `useCoachVoice`를 mock하지 말고, **엔진 `onMessage`를 직접 부르는 길**이 없으므로 이 알림은 **기기에서만 본다.** testing.md에 적는다.

### 2-5. 저장·카드

- `saveCombo` — 2번에서 실제 저장이 돈다: `addCombo { name, clip: { data, ms, head, tail } }` / `replaceCombo { id, name, clip? }`.
- 저장 FAB은 `named`에서만, **키보드를 따라 올라간다**(지금 `kb + 16` 그대로).
- 카드 메뉴 wiring: 듣기(`previewCombo`) · 이름 고치기(`edit` → named) · 다시 녹음(`edit` + `arm`) · 삭제.
- 빈 목록: 콤보 0개면 `눌러서 첫 콤보를 녹음해`. 훈련의 `시작`은 지금처럼 이유를 말한다(이미 그렇다 — `콤보가 없어`).
- 테스트: `record`(무대 누르면 대역이라 `마이크 켜는 중…`에 머문다 → 완료 → 이름 단계 → 저장 누르면 `녹음이 없어`), `name`(빈 이름 안내는 심은 콤보로 edit 진입해서), `empty`, `undo`(이름으로), 저장소(심은 콤보 + 녹음이 다시 열어도 남음).

---

## 3. 훈련 화면 커밋

- `TrainView` — 이름 + 막대는 1번에서 뼈대가 들어갔다. 여기서 모양을 맞춘다: 이름은 `Typo level="title"`쯤, 막대는 기존 `beatTrack` 높이 8px 하나.
  **요청 안 한 간격은 건드리지 않는다**(design-system.md). 칩이 있던 자리의 여백은 그대로 두고 기기에서 본 뒤 정한다.
- `useCallouts` — 본체 없는 콤보 건너뛰기(1번에서 넣었으면 확인만). `hold` 유지 구간은 그대로.
- `DoneOverlay` — 3행. 카운트업 유지.
- 설정 시트 — 템포 범위·벨 테스트는 1번에서. 여기선 `format`이 `1.00` 두 자리인지 확인.
- 테스트: `cues` 그대로. `gap`·`done` 그대로(심은 콤보로).

---

## 4. 기기 확인 — 3번 뒤에

1. 앱 열기 → 알림이 **안** 뜨는가(iOS는 마이크가 있다). 콤보 탭이 **빈 목록**인가(옛 콤보가 버려졌나). 껐다 켜도 옛 것이 안 살아나는가
2. 무대 누름 → `● 말해` → 말하기 → 완료 → `녹음 n초` → **듣기**: 첫 마디가 안 잘리고 뒤 침묵이 잘리는가. 잘리면 문턱 5%를 내린다
3. 8초 넘게 말하기 → 저절로 완료되는가
4. 이름 없이 저장 → `이름을 적어줘`. 이름 적고 저장 → 맨 위 카드, 무대는 쉼
5. 카드 듣기 · 이름 고치기 · 다시 녹음(취소하면 원래 녹음이 남는가) · 삭제 → 되돌리기(녹음까지)
6. 훈련 시작 → 내 목소리, 이름 + 막대. 일시정지 → 재생이 **즉시** 끊기는가. 건너뛰기. 앱 나갔다 오기
7. 템포 0.8 / 1.3 — 음정 변화가 참을 만한가. 아니면 9장의 보류대로 범위를 더 좁히거나 뺀다
8. **콤보 20개** 녹음 → 껐다 켜기 → 다 남는가, 켜질 때 늦지 않는가(본체를 전부 푼다). 저장소 한도는 문서에 없다
9. 저장 FAB이 키보드 위로 따라 올라오는가. 이름 입력에 포커스가 오는가

---

## 그 뒤에 남는 것

- **모양 커밋** — 무대를 누를 때 살짝 움직임(약 100ms, `Animated` + `useNativeDriver`). 결정은 났다(숫자 + 살짝 움직임 — 숫자는 경과 초가 됐다).
- **A. 스플래쉬** — 그대로 열려 있다. `granite.config.ts`의 `icon`이 비어 있다. 호스트가 주는 자리가 먼저다. 타이머 안전장치 없이 만들지 마라.
- **D. 메인 컬러** — "너무 동적이며 입체감이 없음"이 무엇을 가리키는지 아직 모른다. 화면이 둘로 줄었으니 답이 오면 한 번에.
  `C.sheet` #101013 · `C.card` #17171c · `C.line` #202027이 서로 가까운 건 그대로다.
- **B. 초기 데이터** — **닫혔다.** v2는 초기 콤보가 없다.
- **C. 콤보 추가** — v2가 곧 이것이다. 1~3번이 끝나면 닫힌다.
- 안드로이드 녹음 · 저장소 용량 · 템포 음정 — 기획서 9장 보류.
- `Segmented` 글자 1px — 설정 시트에만 남는다. 하려면 그냥 하면 된다.

---

## 닫힌 것 — 되살리자는 말이 나오면 여기를 읽어라

### 하위 화면은 바텀시트다 (2026-09-06 기기 확인)

풀모달이 토스 상태바를 덮는 문제 → 라우트(`/add-move`) → TDS 바텀시트. 시트는 `Modal`이 아니라 트리 안 `position:absolute` 뷰라
헤더를 안 덮으면서 라우트가 물던 값(결과 못 들고 오기·자료가 트리 밖·전환마다 손보기)을 안 문다. 근거는 기획서 3장.
v2에서 시트는 설정 하나뿐이지만 **새 하위 화면이 생기면 같은 답이다.** 전체 화면은 훈련 완료 하나.
시트를 띄우면 탭바(z 40)·FAB(z 30)을 걷는다 — TDS 시트는 z를 안 건다.

### TDS 채택 (2026-09-06 닫힘)

들어간 것: `TDSProvider` `Txt` `colors` `Slider` `BottomSheet` `Button` `Toast`. 2번에서 **`AlertDialog`가 하나 더** 들어간다 — 색을 얹을 필요가 없는 자리라 예외가 아니다.
안 받은 것과 이유: **TDS 2.0.5는 토스 브랜드 색에 박혀 있고 이 앱은 검정 + 딥틸이라, 액센트를 못 얹는 컴포넌트는 받지 않는다.**
`Switch` `Checkbox`(grey200 → blue500 하드코딩), `SegmentedControl`(인디케이터 `inverseGrey300` 하드코딩, 값이 string 고정),
`TextField`(색 prop 없음, 자기 높이·라벨·패딩), `Stepper`(`NumericSpinner`에 `step`이 없다), `Tabs`(`useAdaptive` 하드코딩 + `PagerView flex:1`).
**FAB는 TDS `Button`으로 바꾸지 마라** — 알약·원형 커스텀. 시트 열고 닫는 속도는 `Container.js`에 박혀 있어 못 바꾼다.
새 TDS 컴포넌트를 넣자는 제안은 먼저 이 질문을 통과해야 한다: **액센트를 얹을 수 있나?** 얹을 필요가 없는 자리(알림)면 통과다.

`.d.ts`만 읽고 두 번 틀렸다 — `Toast`의 `duration`은 초, 시계는 마운트 때 한 번. **시계를 드는 컴포넌트는 `.js` 본문까지 읽어라.**

### 실기기 점검에서 잡은 넷 (2026-09-06, 전부 고치고 다시 확인)

- **토스트가 두 번째부터 안 접힘** — 되돌리기 번호를 `key`로 갈아 끼운다. 번호는 모듈 카운터(상태에서 세면 접힐 때 같이 사라진다).
- **슬라이더가 손가락을 못 따라감** — 원인은 자료였다. 트리 밖 한 벌이라 한 틱마다 화면 전체가 다시 그려졌다.
  끄는 동안 지역 상태(110ms), `patchSettings`는 같은 값이면 상태 그대로. `memo.test`가 지킨다. 남은 비용은 TDS 슬라이더 자신의 것 — 직접 만들지 마라.
- **앱을 나가면 훈련이 조용히 멈춤(iOS)** — 나가면 일시정지로 정했다. 기획서 8장. 안드로이드는 **여전히 안 봤다.**
- **저장소가 통째로 날아감** — `AsyncStorage`가 토스 미니앱에서 안 남는다. 토스 `Storage`로. 대역도 거기 붙였다.
  **타입이 맞는다고 그 위에서 산다는 뜻이 아니다.** 새 네이티브 기능은 `@apps-in-toss`에 같은 게 있는지 먼저 — 마이크는 없었다.

### 구조 정리 — 지금 비용을 물리지 않는 것

- 떠 있는 층의 `bottom` 계산 — 둘뿐이고 식이 다르다. 묶을 중복이 없다.
- `TrainView` 쪼개기 — 1번에서 칩·비트 트랙이 나가면 이유가 완전히 사라진다. **지운다.**

### 스파이크 둘 (2026-09-13)

- **TTS 리듬** — 잽 4연타 0.2/0.3/0.4/0.5를 TTS로 들었더니 말 속도 1.15에서 셋이 같고 2.0에서 넷이 갈렸다. 하한은 말 하나 읽는 시간이다. → TTS를 버렸다.
- **녹음** — 숨은 WebView `getUserMedia` + `MediaRecorder`. iOS에서 권한 창 → 녹음(AAC 2초 50KB) → WebAudio 재생까지 됐다.
  출처를 `https://localhost`로 줘야 한다(보안 컨텍스트). TTS는 그 뒤에도 나왔다(이제 상관없다).

## 하지 않기로 한 것

| 항목 | 이유 |
|---|---|
| 두드려서 리듬 만들기 | 녹음이 리듬을 다 갖는다. 기획서 11장 |
| 클릭음으로 박자 | 3분에 100번 울린다. 녹음이 대신한다 |
| 녹음의 자동 완료(n초 침묵) | 마지막 마디 뒤 쉼을 끝으로 친다. 완료 버튼 + 8초 상한 |
| 녹음 파형 표시 | 원칙 1. 듣기가 있다 |
| 음성 인식으로 이름 채우기 | 모듈이 없다 |
| 리듬 보정·양자화 | 녹음에는 해당 없음 |
| FAB를 TDS `Button`으로 | 알약·원형 커스텀 |
| adaptive 색 토큰 | 검정 바탕 고정. 다크에서 뒤집힌다 |
| 애니메이션으로 콤보 보여주기 · 리듬게임 UI | 기획서 11장 — 화면을 응시하게 만든다 |
