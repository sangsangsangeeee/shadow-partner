import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../constants/colors';
import { MONO, NUMS } from '../constants/layout';
import type { Icon } from './Icons';
import { Tap } from './Tap';
import { Typo } from './Typo';

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.rowBetween}>
      <Typo level="small" color={C.z400}>
        {label}
      </Typo>
      {children}
    </View>
  );
}

/** 훈련 완료 화면 통계. 900ms 감속 카운트업. */

export function StatRow({
  label,
  value,
  suffix = '',
  format,
}: {
  label: string;
  value: number;
  suffix?: string;
  format?: (v: number) => string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let id: number | undefined;
    let alive = true;
    const t0 = Date.now();
    const tick = () => {
      if (!alive) return;
      const p = Math.min(1, (Date.now() - t0) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (id !== undefined) cancelAnimationFrame(id);
    };
  }, [value]);

  return (
    <View style={styles.statRow}>
      <Typo level="small" color={C.z500}>
        {label}
      </Typo>
      <View style={styles.statValueWrap}>
        <Typo style={[styles.statValue, NUMS]}>{format ? format(n) : String(n)}</Typo>
        {suffix ? (
          <Typo level="body" color={C.z600} style={styles.statSuffix}>
            {suffix}
          </Typo>
        ) : null}
      </View>
    </View>
  );
}

export function CardAction({
  icon: IconCmp,
  label,
  onPress,
  danger,
}: {
  icon: Icon;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Tap onPress={onPress} style={styles.cardAction}>
      <IconCmp size={16} color={danger ? C.white : C.z400} />
      <Typo level="caption" weight={danger ? 'medium' : 'regular'} color={danger ? C.white : C.z400}>
        {label}
      </Typo>
    </Tap>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: C.z900,
    paddingBottom: 12,
  },
  statSuffix: { marginLeft: 4 },
  statValueWrap: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontFamily: MONO, fontSize: 30, lineHeight: 34, color: C.white },
  cardAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
});
