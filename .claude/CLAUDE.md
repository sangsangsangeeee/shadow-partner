# 쉐도우 코치

킥복싱 쉐도우 트레이닝 앱. Granite / Apps-in-Toss(토스 미니앱) 위의 React Native.
콤보를 말로 불러 주고, 라운드 타이머를 돌린다.

## 첫 문장

**[docs/shadow-partner-spce.md](../docs/shadow-partner-spce.md)가 이 앱의 유일한 권위다.**
코드 주석이 "기획서 N장"을 인용하는 건 장식이 아니라 출처 표시다.
동작을 바꾸기 전에 그 장을 먼저 읽어라. 기획서와 코드가 어긋나면 기획서가 이긴다.

기획서 2장의 설계 원칙 여섯 개는 취향이 아니라 이 앱의 사용 맥락에서 나왔고,
**충돌하면 위쪽이 이긴다.** 그중 이 코드베이스를 가장 자주 흔드는 셋:

1. **화면을 안 봐도 훈련이 된다** — 화면은 보조다. 시각 효과를 늘리는 제안은 대개 틀렸다.
2. **죽은 버튼을 두지 않는다** — 비활성 버튼 대신 눌리되 이유를 말하게 한다.
6. **부가 기능 실패가 본 기능을 막지 않는다** — 오디오·음성·저장소가 없어도 타이머는 돌아야 한다.

## 명령

`node`가 PATH에 없다. 모든 명령 앞에 붙인다:

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
```

`.nvmrc`는 24를 가리키지만 설치된 건 v22.23.2와 v24.19.0뿐이고, **v22를 쓴다.**

| | |
|---|---|
| `npx tsc --noEmit` | 타입 검사 |
| `npx eslint src/commons src/screens src/pages` | 린트 |
| `npx jest --runInBand` | 테스트 (`--runInBand` 필수, 아래 참고) |
| `npx ait build` | iOS·Android 번들 (RN 0.84.0 + 0.72.6) |
| `npx granite dev` | 개발 서버 |

`ait build`는 루트에 `sange-app-1.ait`를 남긴다. **끝나면 지워라.** 커밋에 들어가면 안 된다.

## 지도

```
docs/shadow-partner-spce.md   기획서. 권위.
src/
  preview.tsx                 웹판 원본. tsconfig에서 제외됨. 원래 모습을 대조할 때만 본다.
  commons/                    화면에 매이지 않은 것
    constants/  colors · layout · moves · typography
    components/ 렌더 패턴
    hooks/      범용 훅
    utils/      파서 · 저장소 · 포맷 · 링 기하 · 이름 해석
    types.ts    도메인 모델
    test-support/tdsMock.tsx
  screens/ShadowCoach/
    index.tsx   화면 조립. 세 뷰를 갈아 끼우고 떠 있는 층을 얹는다.
    hooks/      useMaterial(자료) · useTraining(라운드) · useCallouts(호출어)
    views/      TrainView · CombosView · WordsView
    parts/      카드 · 줄 · 오버레이 · 시트
```

## 규칙

- [architecture.md](rules/architecture.md) — 무엇을 어디에 두는가
- [state-and-hooks.md](rules/state-and-hooks.md) — 상태의 주인, 훅을 자르는 선
- [rendering.md](rules/rendering.md) — memo가 실제로 걸리게 하는 법
- [design-system.md](rules/design-system.md) — TDS, 색, 글자, 픽셀 충실도
- [testing.md](rules/testing.md) — 무엇을 어느 층에서 확인하는가
- [workflow.md](rules/workflow.md) — 검증 관문과 커밋

## 지금 어디까지 왔나

포팅과 구조 분리는 끝났다. `ShadowCoach/index.tsx`는 2104줄에서 556줄이 됐다.
TDS 채택은 **선별로 바뀌었다** — `Toast` `Slider` `Txt` `BottomSheet` `Button`이 들어갔고,
`Switch`와 `Checkbox`는 액센트를 못 얹어 자체 구현으로 되돌렸다. `Stepper`는 교체 불가로 결론이 났다.
남은 `TextField` `SegmentedControl`의 조사 결과는 [TODO.md](TODO.md) 1번에 있다.

**남은 일은 [TODO.md](TODO.md)에 우선순위대로 있다. 새 작업을 시작하기 전에 거기를 먼저 읽어라.**
지금 맨 위는 실기기 점검이고, 그게 비어야 다음 TDS 교체를 시작할 수 있다.

## 말투

주석과 커밋 메시지는 한국어다. **무엇을 하는지가 아니라 왜 그런지를 적는다.**
코드를 읽으면 알 수 있는 걸 다시 쓰지 않는다.

```ts
// 나쁨:  콤보 목록이 바뀌면 startError를 비운다
// 좋음:  콤보 목록이 바뀌면 시작 실패 안내는 더 이상 맞지 않는다.
```

한 줄에 하나. 문단으로 늘어놓지 않는다. 기존 파일의 주석 밀도를 그대로 따라간다.
