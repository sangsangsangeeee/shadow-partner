import { CLIP_LEAD, clipPlan, comboSteps } from '../naming';
import type { Combo } from '../../types';

/* naming은 constants 배럴을 거쳐 팔레트에 닿고, 팔레트는 모듈 로드 때 TDS를 읽는다. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@toss/tds-react-native', () => require('../../test-support/tdsMock'));

/*
 * 콤보의 박자를 어디서 읽는가.
 *
 * 호출·미리듣기·비트 트랙이 같은 함수를 보므로, 여기가 맞으면 셋이 같이 맞고 틀리면 같이 틀린다.
 * 두드린 리듬이 있을 때 그것이 동작의 길이를 이긴다는 것이 이 함수가 있는 이유다.
 */
const beat: Record<string, number> = { jab: 0.4, cross: 0.5, lowkick: 0.85 };
const beatOf = (id: string) => beat[id] ?? 0.65;

const combo = (moves: string[], rhythm?: number[]): Combo => ({ id: 'c', moves, on: true, rhythm });

describe('comboSteps', () => {
  it('리듬이 없으면 동작마다 정해진 길이를 따른다', () => {
    expect(comboSteps(combo(['jab', 'cross', 'lowkick']), beatOf, 1)).toEqual([400, 500, 850]);
  });

  it('두드린 리듬이 동작의 길이를 이긴다', () => {
    expect(comboSteps(combo(['jab', 'jab', 'jab'], [0.2, 0.2]), beatOf, 1)).toEqual([200, 200, 400]);
  });

  // 마지막 동작 뒤는 두드려서 못 얻는다. 리듬이 길게 들어와도 거기는 동작의 길이다.
  it('마지막 동작은 언제나 동작의 길이다', () => {
    expect(comboSteps(combo(['jab', 'cross'], [0.2, 0.9]), beatOf, 1)).toEqual([200, 500]);
  });

  // 동작을 고치면 리듬이 짧아질 수 있다. 닿지 않는 자리에서 콤보가 서면 안 된다.
  it('리듬이 닿지 않는 자리는 동작의 길이로 메운다', () => {
    expect(comboSteps(combo(['jab', 'jab', 'cross', 'lowkick'], [0.2]), beatOf, 1)).toEqual([200, 400, 500, 850]);
  });

  it('템포는 리듬에도 똑같이 걸린다', () => {
    expect(comboSteps(combo(['jab', 'jab', 'jab'], [0.3, 0.3]), beatOf, 1.5)).toEqual([200, 200, 267]);
  });
});

/*
 * 녹음이 있는 콤보. 녹음이 진실이고 칩은 두드린 시각을 따라간다(기획서 7장).
 * 첫 두드림 앞은 잘라 첫 동작에 맞추고, 마지막 두드림 뒤는 그 동작의 길이만큼만 남긴다.
 */
describe('clipPlan', () => {
  const c = combo(['jab', 'jab', 'cross'], [0.2, 0.3]);

  it('첫 두드림보다 조금 앞에서 틀고, 칩은 두드린 간격으로 넘어간다', () => {
    const p = clipPlan({ ...c, clip: { offset: 1.0, ms: 5000 } }, beatOf, 1);
    expect(p.from).toBeCloseTo(1.0 - CLIP_LEAD);
    expect(p.marks).toEqual([150, 350, 650]);
    // 마지막 동작(스트레이트 0.5) 뒤는 잘라낸다: 1.0 + 0.5 + 0.5 = 2.0초까지
    expect(p.duration).toBeCloseTo(2.0 - (1.0 - CLIP_LEAD));
    expect(p.total).toBe(Math.round(p.duration * 1000));
  });

  it('녹음이 짧으면 녹음 끝까지만 튼다', () => {
    const p = clipPlan({ ...c, clip: { offset: 0.2, ms: 700 } }, beatOf, 1);
    expect(p.duration).toBeCloseTo(0.7 - (0.2 - CLIP_LEAD));
  });

  it('템포는 재생 속도라 시각도 같이 준다', () => {
    const p = clipPlan({ ...c, clip: { offset: 0, ms: 5000 } }, beatOf, 2);
    expect(p.from).toBe(0);
    expect(p.marks).toEqual([0, 100, 250]);
    expect(p.duration).toBeCloseTo(1.0 / 2);
  });
});
