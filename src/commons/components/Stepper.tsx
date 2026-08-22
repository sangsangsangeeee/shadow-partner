import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../constants/colors';
import { NUMS, TOUCH } from '../constants/layout';
import { Minus, Plus } from './Icons';
import { Tap } from './Tap';
import { Typo } from './Typo';

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  format,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const tint = disabled ? C.z700 : C.z300;
  return (
    <View style={[styles.rowBetween, disabled ? styles.locked : null]}>
      <Typo level="small" color={C.z400}>
        {label}
      </Typo>
      <View style={styles.stepperRight}>
        <Tap
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={disabled}
          accessibilityLabel={`${label} 줄이기`}
          style={styles.stepperBtn}
        >
          <Minus size={16} color={tint} />
        </Tap>
        <Typo level="subtitle" style={[styles.stepperValue, NUMS]}>
          {format ? format(value) : `${value}${suffix}`}
        </Typo>
        <Tap
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={disabled}
          accessibilityLabel={`${label} 늘리기`}
          style={styles.stepperBtn}
        >
          <Plus size={16} color={tint} />
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locked: { opacity: 0.4 },
  stepperRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { width: 80, textAlign: 'center' },
});
