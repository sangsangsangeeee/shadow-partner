import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Txt } from '@toss/tds-react-native';
import { C } from '../constants/colors';
import { TYPO, type TypoLevel, type TypoWeight } from '../constants/typography';

type Level = keyof typeof TYPO;

export interface TypoProps {
  /** 쓰임으로 고른다. 숫자 크기는 constants/typography에서만 정한다. */
  level?: Level;
  /** 쓰임에 없는 자리에서만 TDS 키를 직접 준다. */
  typography?: TypoLevel;
  weight?: TypoWeight;
  color?: string;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

/**
 * 이 앱의 모든 글자는 여기를 지난다.
 * TDS Txt를 감싸서 기본색을 검정 바탕에 맞추고, 쓰임 이름으로 크기를 고르게 한다.
 */
export function Typo({
  level = 'body',
  typography,
  weight = 'regular',
  color = C.white,
  align,
  numberOfLines,
  style,
  children,
}: TypoProps) {
  return (
    <Txt
      typography={typography ?? TYPO[level]}
      fontWeight={weight}
      color={color}
      textAlign={align}
      numberOfLines={numberOfLines}
      style={style}
    >
      {children}
    </Txt>
  );
}
