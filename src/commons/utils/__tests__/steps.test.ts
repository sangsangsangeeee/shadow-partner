import { comboSteps } from '../naming';
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
