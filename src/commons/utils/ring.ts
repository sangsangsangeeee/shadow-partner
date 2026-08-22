import { REF_H, REF_W } from '../constants/layout';

/**
 * 훈련 화면 배율. 폭과 높이 중 더 빡빡한 쪽을 따른다.
 * 1을 넘기지 않아 큰 화면에서도 웹판과 같은 크기로 보이고,
 * 0.72 아래로 내려가지 않아 글자가 읽을 수 없게 되지는 않는다.
 */
export function trainScale(availW: number, availH: number): number {
  if (!(availW > 0) || !(availH > 0)) return 1;
  return Math.max(0.72, Math.min(1, availW / REF_W, availH / REF_H));
}

/**
 * 링 안쪽 글자 치수. 전부 링 지름에 비례한다.
 * 웹판은 링이 288 고정이라 시간 글자를 60px로 박아둘 수 있었지만,
 * RN에서는 링이 줄어들 수 있으므로 같이 줄어야 상태 글자와 겹치지 않는다.
 *
 * 불변식: statusTop + statusLine <= size / 2 - timeLine / 2
 */
export function ringMetrics(size: number) {
  const timeFont = Math.round(size * 0.208); // 288일 때 60
  const timeLine = Math.round(timeFont * 1.03);
  const statusFont = Math.max(10, Math.round(size * 0.042)); // 288일 때 12
  const statusLine = Math.max(12, Math.round(statusFont * 1.2));
  const statusTop = size * 0.3;
  return { timeFont, timeLine, statusFont, statusLine, statusTop };
}
