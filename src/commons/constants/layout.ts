import { Platform } from 'react-native';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** 화면 콘텐츠 최대 폭. 웹판의 max-w-sm에 대응. */
export const MAXW = 400;

/** 터치 영역 최소 44px. 기획서 9장 접근성. */
export const TOUCH = 44;

/**
 * 바텀시트 높이 비율. 내용에 맞춰 키가 달라지면 열 때마다 CTA와 목록이 다른 자리에 온다.
 * 화면의 2/3로 고정하고, 내용이 짧으면 아래를 비워 둔다.
 */
export const SHEET_RATIO = 2 / 3;

/**
 * 동작 고르기의 칩 상자 높이. 시트 키를 고정한 것과 같은 이유로 여기도 고정한다 —
 * 칩이 쌓일 때마다 상자가 늘어나면 아래 격자가 통째로 밀려 방금 누르려던 자리가 사라진다.
 *
 * 두 줄분이다. 칩 한 줄 33 = 글자 21(fontSize 14의 TDS lineHeight) + 세로 여백 6×2,
 * 두 줄 사이 간격 4, 상자 안쪽 여백 12×2.
 */
export const CHIP_TRAY_H = 33 * 2 + 4 + 12 * 2;

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

/**
 * 토스트가 떠 있는 시간(ms). **모든 토스트가 같은 값을 쓴다.**
 * 시계는 TDS Toast가 `duration`으로 들고 있다가 스스로 닫는다 — 우리 쪽에 또 두지 마라.
 */
export const TOAST_MS = 3000;

export const NUMS = { fontVariant: ['tabular-nums' as const] };

/**
 * 훈련 화면 기준 설계 치수. 이 비율이 모든 기기에서 그대로 보여야 한다.
 * 폭 362 = 402 기기의 좌우 여백 20씩 뺀 값, 높이 554 = 그 기기에서 훈련 화면에 주어진 높이.
 */
export const REF_W = 362;
export const REF_H = 554;
export const REF_RING = 320;
