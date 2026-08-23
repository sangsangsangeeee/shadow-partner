import React from 'react';
import { TDSProvider } from '@toss/tds-react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from '@granite-js/native/react-native-safe-area-context';
import { ACCENT } from '../commons/constants';
import { MaterialProvider } from '../screens/ShadowCoach/MaterialContext';

/**
 * 모든 화면을 감싸는 껍데기.
 *
 * 동작 고르기·동작 추가가 별도 화면이 되면서 팔레트·안전영역·자료를 셋 다 나눠 써야 한다.
 * **이 껍데기는 화면마다 따로 세워진다**(라우터가 Screen 하나씩 감싼다).
 * 그래서 여기 있는 것들은 여러 벌이 서도 괜찮아야 한다 — 자료가 트리 밖에 사는 이유다.
 *
 * TDS 토큰의 primary는 Button만 읽는다. 바텀시트 CTA가 그 Button을 만든다.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TDSProvider colorPreference="dark" token={{ color: { primary: ACCENT } }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <MaterialProvider>{children}</MaterialProvider>
      </SafeAreaProvider>
    </TDSProvider>
  );
}
