import { REF_H, REF_RING, REF_W } from '../../constants/layout';
import { ringMetrics, trainScale } from '../../utils/ring';

/**
 * 링이 줄어들면 안쪽 글자도 같이 줄어야 한다.
 * 시간 글자가 그대로면 상태 글자(`준비`, `라운드 2 / 3`)와 겹친다.
 */

const SIZES = [160, 180, 200, 220, 240, 260, 288, 320];

describe('원형 스톱워치 치수', () => {
  it.each(SIZES)('%ipx — 상태 글자가 시간 글자와 겹치지 않는다', (size) => {
    const m = ringMetrics(size);
    const statusBottom = m.statusTop + m.statusLine;
    const timeTop = size / 2 - m.timeLine / 2;
    expect(statusBottom).toBeLessThanOrEqual(timeTop);
  });

  it.each(SIZES)('%ipx — 시간 글자가 링 밖으로 넘치지 않는다', (size) => {
    const m = ringMetrics(size);
    // `0:03`은 4글자. 탭룰러 숫자 폭을 글꼴 크기의 약 0.6배로 잡는다.
    const approxWidth = m.timeFont * 0.6 * 4;
    expect(approxWidth).toBeLessThan(size);
  });

  it('288px에서는 웹판 값을 그대로 낸다', () => {
    const m = ringMetrics(288);
    expect(m.timeFont).toBe(60);
    expect(m.statusFont).toBe(12);
    expect(Math.round(m.statusTop)).toBe(86); // 웹판 paddingTop: 30%
  });
});

describe('훈련 화면 배율', () => {
  it('기준 기기(402x874)에서는 1배 — 웹판 그대로', () => {
    expect(trainScale(REF_W, REF_H)).toBe(1);
  });

  it('큰 화면에서도 1을 넘지 않는다', () => {
    expect(trainScale(800, 1200)).toBe(1);
    expect(trainScale(REF_W * 2, REF_H * 2)).toBe(1);
  });

  it('좁거나 낮으면 더 빡빡한 쪽을 따라 줄어든다', () => {
    expect(trainScale(REF_W * 0.9, REF_H)).toBeCloseTo(0.9, 5);
    expect(trainScale(REF_W, REF_H * 0.85)).toBeCloseTo(0.85, 5);
    // 폭은 넉넉해도 높이가 모자라면 높이를 따른다
    expect(trainScale(REF_W * 2, REF_H * 0.8)).toBeCloseTo(0.8, 5);
  });

  it('글자를 못 읽을 만큼 작아지지는 않는다', () => {
    expect(trainScale(100, 100)).toBe(0.72);
  });

  it('측정 전(0)에는 1배로 둔다 — 첫 프레임이 튀지 않게', () => {
    expect(trainScale(0, 0)).toBe(1);
    expect(trainScale(REF_W, 0)).toBe(1);
  });

  it('어느 배율에서든 링 안쪽 글자가 겹치지 않는다', () => {
    for (const w of [280, 320, 362, 420, 800]) {
      for (const h of [380, 450, 554, 700, 1000]) {
        const size = Math.round(REF_RING * trainScale(w, h));
        const m = ringMetrics(size);
        expect(m.statusTop + m.statusLine).toBeLessThanOrEqual(size / 2 - m.timeLine / 2);
      }
    }
  });
});
