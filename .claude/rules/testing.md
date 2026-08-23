# 무엇을 어느 층에서 확인하는가

95개 / 7묶음. **`npx jest --runInBand`로 돌린다** — 병렬로 돌리면 `flows.test.tsx`가
5초 제한에 걸린다. 회귀가 아니라 부하 문제다.

## 층

| 묶음 | 무엇 | 렌더 |
|---|---|---|
| `commons/utils/__tests__/parser.test.ts` | 콤보 파서 | 안 함 |
| `commons/components/__tests__/ring.test.ts` | 링 기하 | 안 함 |
| `ShadowCoach/hooks/__tests__/materialReducer.test.ts` | 리듀서 전이 | 안 함 |
| `screens/__tests__/screen.test.tsx` | 탭·편집·되돌리기 | 화면 |
| `screens/__tests__/cues.test.tsx` | 호출어 타이밍 | 화면 |
| `screens/__tests__/flows.test.tsx` | 긴 흐름, 저장소까지 | 화면 |
| `screens/__tests__/memo.test.tsx` | 재렌더 항등 | 화면 |

**순수 함수로 확인할 수 있는 건 화면을 띄우지 마라.** 리듀서를 뽑아낸 이득의 절반이 이거다.
동작 삭제가 네 조각을 맞게 바꾸는지 보려고 예전엔 전체 렌더 + `fireEvent`를 거쳐야 했다.

## 경계에서 갈아 끼우는 것

TDS의 CJS 번들은 jest에서 `Cannot redefine property`로 터진다. 그래서 대역을 쓴다:

```ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../commons/test-support/tdsMock'));
```

**색상만은 진짜 값을 쓴다** — 팔레트 상수가 모듈 로드 시점에 읽기 때문.

`@granite-js/native/*`(svg · safe-area · async-storage · webview)와
`@apps-in-toss/native-modules`도 각 테스트 파일 상단에서 mock한다.

화면이 라우트로 갈라지면서 둘이 더 붙었다 —
`@granite-js/react-native`는 `routerMock`(navigation), `@apps-in-toss/framework`는
`frameworkMock`(갔다 돌아오는 것을 기다리는 훅). **둘 다 돌려주는 객체를 한 벌로 고정한다.**
렌더마다 새로 만들면 그걸 의존성으로 쓰는 콜백의 신원이 깨져 memo 테스트가 엉뚱하게 실패한다.

### 화면을 세우는 테스트는 자료를 되감는다

자료가 리액트 트리 밖에 살아서 **언마운트해도 남는다.** `beforeEach`에서 `resetMaterial()`을
부르지 않으면 앞 테스트가 넣은 콤보가 다음 테스트로 새어 나간다. AsyncStorage 대역을 비우는 것만으로는
부족하다 — 메모리와 저장소 둘 다 되감아야 한다.

리듀서 테스트처럼 렌더를 안 하는 파일도 **import 사슬이 팔레트와 저장소에 닿으면**
TDS mock과 AsyncStorage mock이 필요하다.

### TDS 대역을 늘릴 때

**실물이 무엇을 스스로 하는지 그대로 흉내내라.** `Toast` 대역은 `duration`이 지나면
`onClose`를 부른다 — 그걸 빼면 되돌리기 자동 사라짐이 테스트에서 영영 안 일어난다.

## 새 테스트는 헛돌지 않는지 확인한다

**통과하는 걸 보고 끝내지 마라. 고의로 깨뜨려 봐라.**

이 코드베이스에서 두 번 했다:

- `toggleCombo`의 `useCallback`을 떼자 memo 테스트가 `count: 1 → 2`로 실패했다.
- `onClose={dismissUndo}`를 `() => {}`로 바꾸자 6초 테스트가 실패했다.

확인한 뒤 원래대로 되돌린다. 이 절차를 밟은 테스트만 믿을 만하다.

## 테스트에 남기는 주석

**왜 이 테스트가 있는지**를 적어라. 깨졌을 때 지워도 되는지 판단할 근거가 된다.

```ts
// 되돌릴 기회의 시계는 토스트가 들고 있다. 여기서 끊기면 되돌리기가 영영 안 사라진다.
```

## 아직 실물로만 확인되는 것

숨은 WebView + TTS 경로(`VoiceEngine`)는 **모든 테스트에서 mock이다.**
목소리·속도·목소리 목록에 손대는 변경은 기기에서 봐야 한다.
