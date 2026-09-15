/**
 * 두드린 시각(ms)들을 간격(초)으로. n번 두드리면 n-1개다.
 * ms 아래는 버린다 — 터치 시각의 정밀도가 거기까지다.
 */
export function tapGaps(timestamps: number[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const prev = timestamps[i - 1] ?? 0;
    const cur = timestamps[i] ?? prev;
    gaps.push(Math.max(0, Math.round(cur - prev)) / 1000);
  }
  return gaps;
}
