import { CLIP_LEAD, CLIP_TAIL, clipPlan } from '../play';

/* play는 constants 배럴을 거쳐 팔레트에 닿고, 팔레트는 모듈 로드 때 TDS를 읽는다. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../test-support/tdsMock'));

/*
 * 녹음 하나를 어디서 어디까지 트는가. 기획서 6장.
 *
 * 훈련 중 호출·카드의 듣기·저장 전 듣기가 같은 함수를 보므로,
 * 여기가 맞으면 셋이 같이 맞고 틀리면 같이 틀린다.
 */
describe('clipPlan', () => {
  it('첫 소리보다 조금 앞에서 틀고 마지막 소리보다 조금 뒤에서 끝낸다', () => {
    const p = clipPlan({ ms: 5000, head: 1.0, tail: 3.0 }, 1);
    expect(p.from).toBeCloseTo(1.0 - CLIP_LEAD);
    expect(p.duration).toBeCloseTo(3.0 + CLIP_TAIL - (1.0 - CLIP_LEAD));
    expect(p.total).toBe(Math.round(p.duration * 1000));
  });

  // 여운을 붙이다 녹음 밖으로 나가면 안 된다. 없는 소리를 틀 수는 없다.
  it('여운이 녹음 끝을 넘으면 녹음 끝까지만 튼다', () => {
    const p = clipPlan({ ms: 2000, head: 0.2, tail: 1.9 }, 1);
    expect(p.duration).toBeCloseTo(2.0 - (0.2 - CLIP_LEAD));
  });

  // 앞이 CLIP_LEAD보다 짧으면 0 앞으로는 못 간다.
  it('첫 소리가 아주 앞이면 0에서 시작한다', () => {
    const p = clipPlan({ ms: 3000, head: 0.05, tail: 1.0 }, 1);
    expect(p.from).toBe(0);
  });

  it('템포는 재생 속도라 같은 구간이 그만큼 빨리 흐른다', () => {
    const one = clipPlan({ ms: 5000, head: 1.0, tail: 3.0 }, 1);
    const fast = clipPlan({ ms: 5000, head: 1.0, tail: 3.0 }, 2);
    // 어디서 시작하는지는 안 바뀐다 — 녹음 기준 자리다
    expect(fast.from).toBeCloseTo(one.from);
    expect(fast.duration).toBeCloseTo(one.duration / 2);
  });
});
