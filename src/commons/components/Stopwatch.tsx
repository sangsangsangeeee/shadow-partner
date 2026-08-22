import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from '@granite-js/native/react-native-svg';
import { ACCENT, C } from '../constants/colors';
import { NUMS, REF_RING } from '../constants/layout';
import { clamp, fmt } from '../utils/format';
import { ringMetrics } from '../utils/ring';
import { Typo } from './Typo';

const RING = REF_RING;
const R = 116;
const CIRC = 2 * Math.PI * R;
/** 이 아래로는 시간 글자와 상태 글자가 겹치기 시작한다. ringMetrics 불변식 참고. */
const RING_MIN = 160;

export function Stopwatch({
  seconds,
  total,
  status,
  dim,
  maxSize,
}: {
  seconds: number;
  total: number;
  status: string;
  dim: boolean;
  /**
   * 남은 세로 공간. 훈련 화면이 스크롤되지 않도록 링이 먼저 줄어든다.
   * 링을 감싼 컨테이너를 재서 넘기면 안 된다 — 링 크기가 그 컨테이너 높이를 다시 정해
   * 매 레이아웃마다 조금씩 줄어드는 되먹임이 생긴다. 창 크기에서 계산해 넘길 것.
   */
  maxSize?: number;
}) {
  const { width: winW } = useWindowDimensions();
  // 기본은 기획서대로 288. 폭이나 높이가 정말 모자랄 때만 줄인다.
  const size = Math.max(RING_MIN, Math.min(RING, winW - 40, maxSize && maxSize > 0 ? maxSize : RING));
  const m = ringMetrics(size);
  const ratio = total > 0 ? clamp(seconds / total, 0, 1) : 0;

  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 264 264">
        <Circle cx={132} cy={132} r={R} fill="none" stroke={C.z900} strokeWidth={8} />
        <Circle
          cx={132}
          cy={132}
          r={R}
          fill="none"
          stroke={ACCENT}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={CIRC * (1 - ratio)}
          opacity={dim ? 0.3 : 1}
          // 12시에서 시작하도록 SVG 좌표계 안에서 돌린다.
          // RN style 트랜스폼으로 돌리면 플랫폼에 따라 잘린다.
          rotation={-90}
          originX={132}
          originY={132}
        />
      </Svg>

      <View style={styles.ringCenter} pointerEvents="none">
        {/* TDS 스케일(최대 30)을 넘는 디스플레이 숫자라 링 지름에 비례해 직접 잡는다. */}
        <Typo
          weight="light"
          color={dim ? C.z500 : C.white}
          style={[
            styles.ringTime,
            NUMS,
            { fontSize: m.timeFont, lineHeight: m.timeLine, letterSpacing: -m.timeFont * 0.033 },
          ]}
        >
          {fmt(seconds)}
        </Typo>
      </View>

      {/* 상태는 절대 배치라 비어 있어도 시간의 중앙 정렬에 영향을 주지 않는다. */}
      <View style={[styles.ringStatus, { paddingTop: m.statusTop }]} pointerEvents="none">
        <Typo level="caption" color={C.z500} style={{ fontSize: m.statusFont, lineHeight: m.statusLine }}>
          {status}
        </Typo>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignSelf: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringTime: { fontWeight: '300' },
  ringStatus: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },
});
