import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/* 웹판 CSS 키프레임을 RN Animated로 옮긴 것들. */

export function FillBar({ ms, color, dim }: { ms: number; color: string; dim?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    const anim = Animated.timing(a, {
      toValue: 1,
      duration: Math.max(1, ms),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [ms, a]);
  const width = a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <Animated.View style={{ height: '100%', backgroundColor: color, opacity: dim ? 0.3 : 1, width }} />;
}

/** 웹판 animate-pulse. */
export function Pulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 0.45, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[style, { opacity: a }]}>{children}</Animated.View>;
}

/** 웹판 sc-blink. step-end라 서서히 흐려지지 않고 딱 꺼진다. */
export function Blink({ children }: { children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  const opacity = a.interpolate({ inputRange: [0, 0.55, 0.5501, 1], outputRange: [1, 1, 0, 0] });
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/** 웹판 sc-pop. */
export function Pop({ children }: { children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(a, {
      toValue: 1,
      duration: 420,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [a]);
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  return <Animated.View style={{ opacity: a, transform: [{ scale }] }}>{children}</Animated.View>;
}
