# 검증 관문과 커밋

## 관문

**작업을 끝냈다고 말하기 전에 네 개를 전부 통과시킨다. 순서대로.**

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
npx tsc --noEmit                             # 0
npx eslint src/commons src/screens src/pages # 0
npx jest --runInBand                         # 전부 통과
npx ait build                                # 0 errors / 0 warnings, 양쪽 RN
rm -f sange-app-1.ait                        # 산출물 정리
```

`ait build`를 건너뛰지 마라. `tsc`가 통과해도 번들러에서 걸리는 게 있다.
RN 0.84.0과 0.72.6 두 벌을 만들고 **둘 다** 0이어야 한다.

## 죽은 스타일

컴포넌트를 자르거나 옮기면 `StyleSheet` 키가 남는다. `tsc`도 `eslint`도 못 잡는다.
지금까지 세 단계에서 40 + 23 + 36개를 걷어냈다. 구조를 건드렸으면 훑어라:

```bash
python3 - <<'PY'
import re, pathlib
for f in pathlib.Path('src').rglob('*.tsx'):
    if '__tests__' in str(f): continue
    s = f.read_text()
    m = re.search(r'StyleSheet\.create\(\{(.*)\n\}\);', s, re.S)
    if not m: continue
    body, head = m.group(1), s[:m.start()]
    dead = [k for k in re.findall(r'^  ([A-Za-z0-9_]+):', body, re.M)
            if not re.search(r'styles\.%s\b' % k, head)]
    if dead: print(f, '->', dead)
PY
```

## 없는 린트 규칙

`eslint-disable-next-line react-hooks/exhaustive-deps`를 쓰지 마라.
그 플러그인이 이 프로젝트에 없어서 **"Definition for rule was not found"로 린트가 깨진다.**
의존성을 비워야 하면 주석으로 이유를 적어라.

## 자르기 전에 재라

구조를 바꿀 때 감으로 정하지 마라. 스크립트로 구역별 줄 수와
그 구역이 참조하는 화면 스코프 식별자 집합을 뽑고, 그걸 근거로 자른다.
이 코드베이스의 모든 분리 결정이 그렇게 나왔다.

## 커밋

기본 브랜치에 바로 쌓지 않는다. 브랜치를 먼저 판다.
한국어로 쓰고, **무엇을 바꿨는지가 아니라 왜 그렇게 됐는지**를 적는다.

제목은 `feat:` `refactor:` `fix:` 같은 관례를 따르고, 본문에는:

- 딸려 온 변화 (주인이 바뀐 것, 색이 바뀐 것, 계약이 바뀐 것)
- 이식·리팩터링 중에 잡은 버그는 **따로 적는다.** 구조 변경에 묻히면 안 된다.
- 테스트 수의 변화

끝에 붙인다:

```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

## 보고

끝났다고 말할 때:

- **실기기에서 봐야 할 것을 짚어라.** 특히 눈에 보이게 달라진 것.
- 검증 결과를 숫자로 적는다 (`92/92`, `0 errors`).
- 확인 안 한 건 확인 안 했다고 말한다.
