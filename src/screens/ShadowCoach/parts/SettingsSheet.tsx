import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { BottomSheet } from '@toss/tds-react-native';
import { Row, Segmented, Slider, Stepper, Tap, Typo } from '../../../commons/components';
import { ACCENT, C, MODES } from '../../../commons/constants';
import { fmt } from '../../../commons/utils';
import type { Settings } from '../../../commons/types';

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** 훈련 중에는 모드와 라운드 구성이 잠긴다. */
  running: boolean;
  onTestBell: () => void;
};

const MODE_OPTIONS = MODES.map((m) => ({ value: m.id, label: m.label }));

/** 훈련 설정 바텀시트. 끌어서 닫기·디머·손잡이는 TDS가 처리한다. */
export function SettingsSheet({ open, onClose, settings, onChange, running, onTestBell }: Props) {
  const modeInfo = MODES.find((m) => m.id === settings.mode) ?? MODES[0];

  return (
    <BottomSheet.Root
      open={open}
      header={<BottomSheet.Header>훈련 설정</BottomSheet.Header>}
      onClose={onClose}
      onDimmerClick={onClose}
      cta={
        // CTA가 Button을 직접 만든다. 여기에 Button을 또 넣으면 눌리는 것이 겹쳐 가장자리가 죽는다.
        <BottomSheet.CTA onPress={onClose}>완료</BottomSheet.CTA>
      }
    >
      <View style={styles.body}>
        {/* 잠긴 이유를 시트 상단에 한 줄로 알린다 */}
        {running ? (
          <View style={styles.lockNote}>
            <Typo level="caption" color={C.z500}>
              훈련 중이라 모드와 라운드는 잠겨 있어. 템포는 지금 바꿔도 바로 반영돼.
            </Typo>
          </View>
        ) : null}

        <Typo level="caption" color={C.z500}>모드</Typo>
        <Segmented
          options={MODE_OPTIONS}
          value={settings.mode}
          onChange={(v) => onChange('mode', v)}
          disabled={running}
          size="tall"
        />
        <Typo level="caption" color={C.z600}>{modeInfo.hint}</Typo>

        <View style={styles.group}>
          <Stepper
            label="라운드"
            value={settings.rounds}
            suffix="회"
            disabled={running}
            onChange={(v) => onChange('rounds', v)}
            min={1}
            max={20}
          />
          {settings.mode === 'count' ? (
            <Stepper
              label="라운드당 호출"
              value={settings.reps}
              suffix="번"
              disabled={running}
              onChange={(v) => onChange('reps', v)}
              min={1}
              max={60}
            />
          ) : null}
          <Stepper
            label="라운드 시간"
            value={settings.roundSec}
            format={fmt}
            disabled={running}
            onChange={(v) => onChange('roundSec', v)}
            min={30}
            max={600}
            step={15}
          />
          <Stepper
            label="휴식"
            value={settings.restSec}
            format={fmt}
            disabled={running}
            onChange={(v) => onChange('restSec', v)}
            min={10}
            max={300}
            step={10}
          />
        </View>

        {/* 템포·간격은 훈련 중에도 살아 있다 */}
        <View style={styles.divider}>
          {/* 템포는 재생 속도다. 너무 벌리면 음정이 무너져서 좁게 연다(기획서 6장). */}
          <Slider
            label="템포"
            format={(v) => `${v.toFixed(2)}배`}
            min={0.8}
            max={1.3}
            step={0.05}
            value={settings.tempo}
            onChange={(v) => onChange('tempo', v)}
          />
          <Slider
            label="콤보 간격"
            format={(v) => `${v.toFixed(1)}초`}
            min={0.5}
            max={6}
            step={0.1}
            value={settings.gap}
            onChange={(v) => onChange('gap', v)}
          />
          <Row label="간격을 불규칙하게">
            {/* TDS Switch는 트랙이 blue500 고정이라 액센트를 못 얹는다. 이 자리에선 색이 더 중요하다. */}
            <Switch
              value={settings.randomGap}
              onValueChange={(v) => onChange('randomGap', v)}
              trackColor={{ false: C.line, true: ACCENT }}
              thumbColor={C.white}
            />
          </Row>

          <Tap onPress={onTestBell} style={styles.testBtn}>
            <Typo level="caption" color={C.z400}>벨 테스트</Typo>
          </Tap>
        </View>
      </View>
    </BottomSheet.Root>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20 },
  lockNote: { backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 28 },
  group: { gap: 20, marginTop: 28 },
  divider: { gap: 24, marginTop: 28, paddingTop: 24, borderTopWidth: 1, borderTopColor: C.z900 },
  testBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
});
