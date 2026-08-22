import { Platform } from 'react-native';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** 화면 콘텐츠 최대 폭. 웹판의 max-w-sm에 대응. */
export const MAXW = 400;

/** 터치 영역 최소 44px. 기획서 9장 접근성. */
export const TOUCH = 44;

/**
 * 플로팅 레이어. 기획서 9장 표 그대로.
 * z를 빼먹으면 iOS는 그리는 순서 덕에 우연히 동작하지만
 * Android는 앞 형제(스크롤 뷰)가 터치를 먼저 가져간다.
 */
export const LAYER = {
  tabBar: 16,
  fab: 96,
  toastWithFab: 160,
  toastAlone: 96,
  zTabBar: 40,
  zFab: 30,
  zToast: 40,
} as const;

export const NUMS = { fontVariant: ['tabular-nums' as const] };

/**
 * 훈련 화면 기준 설계 치수. 이 비율이 모든 기기에서 그대로 보여야 한다.
 * 폭 362 = 402 기기의 좌우 여백 20씩 뺀 값, 높이 554 = 그 기기에서 훈련 화면에 주어진 높이.
 */
export const REF_W = 362;
export const REF_H = 554;
export const REF_RING = 288;
