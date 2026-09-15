# 무엇을 어느 층에서 확인하는가

89개 / 10묶음. **`npx jest --runInBand`로 돌린다** — 병렬로 돌리면 `flows.test.tsx`가
5초 제한에 걸린다. 회귀가 아니라 부하 문제다.

## 층

| 묶음 | 무엇 | 렌더 |
|---|---|---|
| `commons/utils/__tests__/play.test.ts` | 녹음을 어디서 어디까지 트는가 | 안 함 |
| `commons/components/__tests__/ring.test.ts` | 링 기하 | 안 함 |
| `ShadowCoach/hooks/__tests__/materialReducer.test.ts` | 리듀서 전이 | 안 함 |
| `ShadowCoach/hooks/__tests__/comboDraft.test.ts` | 콤보 초안 — 마이크가 답하는 순서, 늦게 오는 녹음 | 안 함 |
| `ShadowCoach/hooks/__tests__/persist.test.ts` | 쓰기를 미루는 창, v1 자료 버리기 | 안 함 |
| `commons/constants/__tests__/layout.test.ts` | 기획서가 정한 치수 | 안 함 |
| `screens/__tests__/screen.test.tsx` | 탭·녹음 단계·되돌리기 | 화면 |
| `screens/__tests__/cues.test.tsx` | 벨·클래퍼·백그라운드 | 화면 |
| `screens/__tests__/flows.test.tsx` | 긴 흐름, 저장소까지 | 화면 |
| `screens/__tests__/memo.test.tsx` | 재렌더 항등 | 화면 |

**순수 함수로 확인할 수 있는 건 화면을 띄우지 마라.** 리듀서를 뽑아낸 이득의 절반이 이거다.

## 경계에서 갈아 끼우는 것

TDS의 CJS 번들은 jest에서 `Cannot redefine property`로 터진다. 그래서 대역을 쓴다:

```ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../commons/test-support/tdsMock'));
```

**색상만은 진짜 값을 쓴다** — 팔레트 상수가 모듈 로드 시점에 읽기 때문.

`@granite-js/native/*`(svg · safe-area · webview)와 `@apps-in-toss/native-modules`도
각 테스트 파일 상단에서 mock한다.

**저장소 대역은 `@apps-in-toss/native-modules`의 `Storage` 자리에 끼운다** —
`test-support/storageMock`을 공용으로 쓰고 `resetStorage()`로 비운다.
예전에는 `AsyncStorage`를 mock했는데, 그건 **실물이 안 쓰는 것을 지키고 있었다.**
대역이 어느 모듈에 붙어 있는지는 곧 "무엇이 진짜인지"에 대한 우리 믿음이다. 그게 틀리면
테스트가 전부 초록이어도 기기에서 자료가 통째로 날아간다 — 실제로 그랬다.

`@granite-js/react-native`는 `routerMock`으로 갈아끼운다. 화면 코드는 더 이상 `useNavigation`을
부르지 않지만(하위 화면이 전부 시트다) `_layout`과 `createRoute`가 그 모듈에 닿는다.
**돌려주는 객체는 한 벌로 고정한다** — 렌더마다 새로 만들면 그걸 의존성으로 쓰는 콜백의 신원이
깨져 memo 테스트가 엉뚱하게 실패한다.

시트는 같은 트리 안에 있어서 **화면 하나만 세우면 끝난다.** 라우트였을 때는 두 화면을
나란히 렌더하거나 세웠다 걷어내야 했다. 그 우회로가 필요했던 자리를 되살리지 마라.

### 화면을 세우는 테스트는 자료를 되감는다

자료가 리액트 트리 밖에 살아서 **언마운트해도 남는다.** `beforeEach`에서 `resetMaterial()`을
부르지 않으면 앞 테스트가 넣은 콤보가 다음 테스트로 새어 나간다. 저장소 대역을 비우는 것만으로는
부족하다 — 메모리와 저장소 둘 다 되감아야 한다.

리듀서 테스트처럼 렌더를 안 하는 파일도 **import 사슬이 팔레트와 저장소에 닿으면**
TDS mock과 저장소 mock이 필요하다.

### 화면 테스트의 콤보는 심어서 만든다

**대역에서는 마이크가 영영 안 켜진다.** 숨은 WebView가 대역이라 `recordEvent`가 올라올 길이 없고,
그래서 화면에서 녹음을 끝까지 끌고 갈 수 없다. 콤보가 필요한 테스트는
`dispatchMaterial({ type: 'addCombo', ... })`로 자료에 직접 심는다.

무대가 어떻게 보이는지(눌러서 녹음 → 마이크 켜는 중 → 완료 → 이름)는 화면 테스트가 보고,
**마이크가 답하는 순서와 그 사이의 취소는 `comboDraft` 순수 테스트가 본다.**
그 둘을 한 층에서 보려 하지 마라 — 대역이 못 하는 일을 대역에게 시키게 된다.

`jest.mock()` 팩토리는 바깥 변수를 못 본다. 저장소 대역을 파일 안에서 직접 만들 때는
**`mock` 접두어가 붙은 이름만** 팩토리 안에서 참조할 수 있다(`persist.test.ts`가 그렇다).

### TDS 대역을 늘릴 때

**실물이 무엇을 스스로 하는지 그대로 흉내내라. 봐주지도 마라.**

`Toast` 대역이 이걸 두 군데서 봐주고 있었다 — `duration`을 ms로 읽고(실물은 초),
`open`이 켜질 때마다 시계를 다시 걸었다(실물은 마운트 때 한 번뿐).
**기기에서는 두 번째 삭제부터 토스트가 영영 안 접혔는데 테스트는 전부 초록이었다.**
대역을 실물에 맞추자 기존 테스트가 곧바로 깨졌다.

대역이 실물보다 친절하면 그 대역이 지키는 건 실물이 아니라 대역 자신이다.

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

숨은 WebView(`VoiceEngine`)는 **모든 테스트에서 mock이다.** 그 안에 사는 것 전부가 여기 해당한다:

- **녹음.** 마이크가 대역에서 안 켜진다. 권한 창·실제 포맷(AAC)·8초 상한은 기기에서만 본다.
- **앞뒤 침묵 잘라내기.** RMS 문턱 5%가 맞는지는 실제 목소리로만 안다 —
  첫 마디가 잘리면 내리고, 앞이 길게 남으면 올린다(기획서 6장).
- **템포의 음정.** 0.8~1.3에서 목소리가 참을 만한지는 귀로만 정한다.
- **마이크 없음 알림.** 엔진의 `ready`가 대역에서 안 오므로 `micAvailable`을 흉내낼 길이 없다.

`playClip`·`loadClip`이 불렸는지까지는 테스트가 잡지만, **소리가 실제로 났는지는 못 잡는다.**
