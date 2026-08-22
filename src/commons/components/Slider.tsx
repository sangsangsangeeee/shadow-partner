import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Slider as TDSSlider } from '@toss/tds-react-native';
import { ACCENT, C } from '../constants/colors';
import { NUMS } from '../constants/layout';
import { Typo } from './Typo';

export function Slider({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const unit = Math.round(1 / step);
  const toTicks = (v: number) => Math.round(v * unit);
  const fromTicks = (t: number) => Number((t / unit).toFixed(4));

  return (
    <View>
      <View style={styles.head}>
        <Typo level="small" color={C.z400}>
          {label}
        </Typo>
        <Typo level="caption" color={C.z600} style={NUMS}>
          {hint}
        </Typo>
      </View>
      <TDSSlider
        min={toTicks(min)}
        max={toTicks(max)}
        step={1}
        value={toTicks(value)}
        color={ACCENT}
        onChange={(t) => onChange(fromTicks(t))}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
});
