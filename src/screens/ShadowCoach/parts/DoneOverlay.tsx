import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Blink, Overlay, Pop, RotateCcw, StatRow, Tap, Typo } from '../../../commons/components';
import { ACCENT, C, MONO } from '../../../commons/constants';
import { fmt } from '../../../commons/utils';
import type { Settings, Stats } from '../../../commons/types';

type Props = {
  visible: boolean;
  settings: Settings;
  stats: Stats;
  onRestart: () => void;
  onQuit: () => void;
};

/** 완주 화면. 오락실 스테이지 클리어를 흉내낸다. 기획서 4.3. */
export function DoneOverlay({ visible, settings, stats, onRestart, onQuit }: Props) {
  return (
    <Overlay
      visible={visible}
      onClose={onQuit}
      bodyStyle={styles.body}
      foot={
        <View style={styles.btns}>
          <Tap onPress={onRestart} style={[styles.again, styles.flex]}>
            <RotateCcw size={20} color={C.white} />
            <Typo level="button" weight="semibold" color={C.white}>한 번 더</Typo>
          </Tap>
          <Tap onPress={onQuit} style={styles.quit}>
            <Typo level="small" color={C.z400}>그만하기</Typo>
          </Tap>
        </View>
      }
    >
      <Pop>
        <Typo level="caption" color={C.z500} style={styles.stageClear}>
          STAGE CLEAR
        </Typo>
        {/* TDS 스케일(최대 30)을 넘는 자리. 기획서 4.3이 크기를 직접 정했다. */}
        <Typo weight="semibold" style={styles.title}>
          수고했어
        </Typo>
        <Typo level="small" color={C.z500} style={styles.sub}>
          오늘 몫은 다 했어.
        </Typo>
      </Pop>

      <View style={styles.statList}>
        <StatRow label="라운드" value={settings.rounds} suffix="R" />
        <StatRow label="운동 시간" value={settings.rounds * settings.roundSec} format={fmt} />
        <StatRow label="콤보" value={stats.combos} suffix="회" />
        <StatRow label="동작" value={stats.moves} suffix="개" />
      </View>

      {/* 액센트는 검정 위에서 어둡다. 오락실 화면도 흰색이 깜빡인다. */}
      <Blink>
        <Typo level="small" style={styles.toBeContinued}>
          TO BE CONTINUED...
        </Typo>
      </Blink>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingBottom: 160 },
  stageClear: { fontFamily: MONO, fontSize: 12, letterSpacing: 3, color: C.z500, marginBottom: 12 },
  title: { fontSize: 48, fontWeight: '600', letterSpacing: -1, color: C.white, marginBottom: 12 },
  sub: { fontSize: 14, color: C.z500, marginBottom: 40 },
  statList: { gap: 16, marginBottom: 40 },
  toBeContinued: { fontFamily: MONO, fontSize: 14, letterSpacing: 3, color: C.white },
  btns: { flexDirection: 'row', gap: 8 },
  again: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    height: 56,
    borderRadius: 28,
  },
  quit: {
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
