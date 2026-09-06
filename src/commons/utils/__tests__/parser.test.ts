import { buildAlias, parseCombo } from '../parser';
import type { Move } from '../../types';

/**
 * 아래 기대값은 웹판 원본 파서를 실제로 돌려 받아낸 출력이다(원본은 이식 완료 후 지웠다).
 * 이식할 때 두 파서에 같은 입력을 넣어 전부 일치하는 것을 확인했고,
 * 원본이 삭제된 뒤에도 그 결과가 유지되도록 여기에 고정해 둔다.
 */

const CUSTOM: Move[] = [{ id: 'c_over', name: '라이트 오버훅', kind: 'punch', beat: 0.65, aliases: [] }];

type Case = [input: string, moves: string[], unknown: string[]];

const CASES: Case[] = [
  // 같은 결과여야 하는 표기들 — 붙여 쓰기 / 쉼표 / 띄어쓰기 / 번호
  ['원원투', ['jab', 'jab', 'cross'], []],
  ['원,원,투', ['jab', 'jab', 'cross'], []],
  ['원 원 투', ['jab', 'jab', 'cross'], []],
  ['1-1-2', ['jab', 'jab', 'cross'], []],
  ['잽잽스트레이트', ['jab', 'jab', 'cross'], []],
  ['잽 잽 스트레이트', ['jab', 'jab', 'cross'], []],

  // 기획서 6장 표기 예시의 1-2-2는 원원투와 다른 콤보다(잽 스트레이트 스트레이트).
  // 같은 결과를 내는 쪽은 1-1-2. 원본 파서도 이렇게 읽는다.
  ['1-2-2', ['jab', 'cross', 'cross'], []],

  // 공백을 넘는 이름 — 긴 쪽이 이긴다
  ['라이트훅', ['rhook'], []],
  ['라이트 훅', ['rhook'], []],
  ['라이트 오버훅', ['c_over'], []],

  // 반복 지시어(뒤 동작) / 반복 수량(앞 동작)
  ['더블잽 투', ['jab', 'jab', 'cross'], []],
  ['더블 잽 투', ['jab', 'jab', 'cross'], []],
  ['트리플잽', ['jab', 'jab', 'jab'], []],
  ['훅x2 로우킥', ['lhook', 'lhook', 'lowkick'], []],
  ['훅 x2 로우킥', ['lhook', 'lhook', 'lowkick'], []],
  ['잽2번 로우킥', ['jab', 'jab', 'lowkick'], []],
  ['잽 두번 스트레이트', ['jab', 'jab', 'cross'], []],

  // 숫자 나열과 구분자
  ['123', ['jab', 'cross', 'lhook'], []],
  ['1-2 로우킥', ['jab', 'cross', 'lowkick'], []],
  ['1,2/3', ['jab', 'cross', 'lhook'], []],
  ['잽 > 스트레이트 · 로우킥', ['jab', 'cross', 'lowkick'], []],
  ['잽+스트레이트&훅', ['jab', 'cross', 'lhook'], []],

  // 토큰 내부 탐욕 분해 — 띄어쓰기 없는 긴 입력
  ['잽스트레이트로우킥', ['jab', 'cross', 'lowkick'], []],
  ['원투쓰리포', ['jab', 'cross', 'lhook', 'rhook'], []],

  // 못 알아듣는 말은 그대로 남는다
  ['엘보 잽', ['jab'], ['엘보']],
  ['스핀킥', [], ['스핀킥']],
  ['', [], []],
  ['   ', [], []],
];

describe('콤보 파서', () => {
  const alias = buildAlias(CUSTOM, {});

  it.each(CASES)('%p → %p', (input, moves, unknown) => {
    expect(parseCombo(input, alias)).toEqual({ moves, unknown });
  });
});

describe('별칭 사전', () => {
  it('기본 동작의 이름·별칭·번호·번호호출을 모두 담는다', () => {
    const alias = buildAlias([], {});
    expect(Object.keys(alias)).toHaveLength(91);
    expect(alias['잽']).toBe('jab');
    expect(alias['1']).toBe('jab');
    expect(alias['원']).toBe('jab');
    expect(alias['하나']).toBe('jab');
    expect(alias['jab']).toBe('jab');
  });

  it('직접 추가한 동작이 사전에 들어간다', () => {
    const alias = buildAlias(CUSTOM, {});
    expect(Object.keys(alias)).toHaveLength(92);
    expect(alias['라이트오버훅']).toBe('c_over');
  });

  it('호출어 덮어쓰기가 파서에도 자동 등록된다', () => {
    const alias = buildAlias([], { jab: '원', cross: '투' });
    expect(parseCombo('원 투 원', alias)).toEqual({ moves: ['jab', 'cross', 'jab'], unknown: [] });
  });

  it('이름 충돌 시 긴 쪽이 이긴다', () => {
    const oneTwo: Move[] = [{ id: 'c_12', name: '원투', kind: 'punch', beat: 0.65, aliases: [] }];
    const alias = buildAlias(oneTwo, {});
    // 원투라는 동작을 추가하면 "원 투"가 그 동작 하나로 해석된다. 기획서 6장 알려진 한계.
    expect(parseCombo('원 투', alias).moves).toEqual(['c_12']);
  });
});
