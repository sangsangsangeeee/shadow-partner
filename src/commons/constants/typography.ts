import type { ComponentProps } from 'react';
import { Txt } from '@toss/tds-react-native';

type TxtProps = ComponentProps<typeof Txt>;
export type TypoLevel = NonNullable<TxtProps['typography']>;
export type TypoWeight = NonNullable<TxtProps['fontWeight']>;

/**
 * TDS 타이포그래피 스케일에 이 앱의 쓰임을 붙인 것.
 * 숫자 크기를 코드에 흩뿌리지 않고 여기서만 고른다.
 *
 *   t1 30/40   t2 26/35   t3 22/31   t4 20/29
 *   t5 17/25.5 t6 15/22.5 t7 13/19.5
 */
export const TYPO = {
  /** 화면 제목 */
  title: 't3',
  /** 오버레이·시트 제목 */
  subtitle: 't5',
  /** 본문 */
  body: 't5',
  /** 목록 항목 이름 */
  item: 't5',
  /** 버튼 글자 */
  button: 't5',
  /** 콤보 칩, 유지 구간 안내 */
  chip: 't4',
  /** 작은 본문 — 설명, 요약 알약 */
  small: 't6',
  /** 부가 설명 — 도움말, 안내, 토스트 */
  caption: 't7',
} as const satisfies Record<string, TypoLevel>;

/**
 * TDS 스케일을 벗어나는 디스플레이 숫자 둘. 기획서가 크기를 직접 정한 자리다.
 * 스톱워치 시간은 링 지름에 비례해 따로 계산한다(ringMetrics).
 */
export const DISPLAY = {
  /** 훈련 완료 화면의 `수고했어` */
  done: { fontSize: 48, lineHeight: 56 },
} as const;
