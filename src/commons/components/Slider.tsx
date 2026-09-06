import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Slider as TDSSlider } from '@toss/tds-react-native';
import { ACCENT, C } from '../constants/colors';
import { NUMS } from '../constants/layout';
import { useLatestRef, useTimerBank } from '../hooks';
import { Typo } from './Typo';

/**
 * 미뤄 둔 값을 자료에 넣기까지 기다리는 시간(ms).
 * 이 안에 들어온 변화는 마지막 것 하나로 모인다. 손을 멈추면 바로 들어간다.
 */
const COMMIT_MS = 110;

export function Slider({
  label,
  format,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  /** 지금 값을 사람이 읽는 말로. 끄는 동안에는 아직 저장 안 된 값이 들어온다. */
  format: (v: number) => string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const unit = Math.round(1 / step);
  const toTicks = (v: number) => Math.round(v * unit);
  const fromTicks = (t: number) => Number((t / unit).toFixed(4));

  /*
   * 끄는 동안의 눈금은 여기서만 들고 있는다.
   *
   * 자료는 리액트 트리 밖의 한 벌이라 한 번 건드리면 화면 전체가 다시 그려진다.
   * TDS 슬라이더는 손가락이 움직이는 내내 — 눈금이 안 바뀌어도 — 부르므로,
   * 그대로 흘려보내면 그리는 일에 JS 스레드를 다 쓰고 정작 손가락을 못 따라간다.
   * 그래서 끄는 동안에는 이 컴포넌트만 다시 그리고, 자료에는 손을 멈춘 뒤에 넣는다.
   */
  const [dragTick, setDragTick] = useState<number | null>(null);
  const tick = dragTick ?? toTicks(value);

  const timers = useTimerBank();
  /** 아직 자료에 안 들어간 값. 손을 멈추거나 이 화면이 사라질 때 들어간다. */
  const pending = useRef<number | null>(null);
  const latest = useLatestRef(onChange);

  const commit = useCallback(() => {
    const v = pending.current;
    if (v == null) return;
    pending.current = null;
    latest.current(v);
  }, [latest]);

  const handle = (t: number) => {
    if (t === tick) return;
    setDragTick(t);
    pending.current = fromTicks(t);
    timers.clearAll();
    timers.later(commit, COMMIT_MS);
  };

  /* 자료가 바뀌면 그쪽을 따른다 — 미뤄 둔 게 들어갔든, 밖에서 바뀌었든. */
  useEffect(() => setDragTick(null), [value]);

  /* 미뤄 둔 값을 안고 사라지지 않는다. 시트를 바로 닫으면 마지막 한 칸이 날아간다. */
  useEffect(() => () => commit(), [commit]);

  return (
    <View>
      <View style={styles.head}>
        <Typo level="small" color={C.z400}>
          {label}
        </Typo>
        <Typo level="caption" color={C.z600} style={NUMS}>
          {format(fromTicks(tick))}
        </Typo>
      </View>
      <TDSSlider
        min={toTicks(min)}
        max={toTicks(max)}
        step={1}
        value={tick}
        color={ACCENT}
        onChange={handle}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
});
