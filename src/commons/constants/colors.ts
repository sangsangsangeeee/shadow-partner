import { colors } from '@toss/tds-react-native';

/**
 * 팔레트는 전부 TDS 토큰에서 가져온다.
 * 기획서 2장이 정한 블랙 / 화이트 / 딥틸 세 갈래는 그대로 두고,
 * 각 값을 TDS에서 가장 가까운 토큰으로 옮겼다. 괄호 안이 원래 값과의 색 거리.
 *
 * 이 앱은 검정 바탕 고정이라 adaptive 토큰(라이트/다크에서 뒤집히는 값)은 쓰지 않는다.
 * adaptive.teal900은 다크에서 #d6fcff로 뒤집혀 흰 글자를 얹을 수 없다.
 */

/** 원래 #006064 → TDS lightThemeTeal900 #076565 (Δ8.7). 배경·테두리·강조 링 전용. */
export const ACCENT = colors.lightThemeTeal900;

export const C = {
  bg: colors.black, //                    #000000 (Δ0)
  sheet: colors.darkGreyBackground, //    #101013 (Δ12.7)
  card: colors.darkBackground, //         #17171c (Δ1.7)
  line: colors.darkLayeredBackground, //  #202027 (Δ10.3)
  z900: colors.darkBackground,
  z800: colors.darkLayeredBackground,
  z700: colors.darkThemeGrey200, //       #3c3c47 (Δ4.4)
  z600: colors.darkThemeGrey300, //       #4d4d59 (Δ7.3)
  z500: colors.grey600, //                #6b7684 (Δ12.7)
  z400: colors.darkThemeGrey600, //       #9e9ea4 (Δ7.3)
  z300: colors.grey300, //                #d1d6db (Δ4.7)
  z200: colors.darkThemeGrey800, //       #e4e4e5 (Δ2.0)
  white: colors.white, //                 #ffffff (Δ0)
} as const;
