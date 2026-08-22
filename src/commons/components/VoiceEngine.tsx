import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from '@granite-js/native/react-native-webview';
import { generateHapticFeedback, type HapticFeedbackType } from '@apps-in-toss/native-modules';
import type { VoiceOption } from '../types';

/**
 * 코치의 신호를 내보내는 곳. 소리와 진동 둘 다 여기서 나간다.
 *
 * React Native에는 speechSynthesis도 AudioContext도 없다.
 * 화면 밖 1px 웹뷰를 소리 엔진으로 두고 웹판과 같은 API를 그대로 쓴다.
 *
 * 웹뷰 오디오는 이 이식본에서 가장 약한 고리라, 라운드 벨과 10초 클래퍼에는
 * 네이티브 햅틱을 같은 리듬으로 겹쳐 둔다. 소리가 안 나는 기기에서도
 * 라운드가 시작·종료됐다는 것과 10초 남았다는 것은 몸으로 알 수 있어야 한다.
 * 유지 구간 안내에는 걸지 않는다 — 3분에 30회면 시끄러운 건 진동도 마찬가지다.
 *
 * 이 엔진이 통째로 죽어도 타이머는 돌아야 한다. 기획서 원칙 6.
 * 따라서 모든 호출은 실패해도 조용히 넘어가고, 준비 전 명령은 큐에 쌓았다가 흘려보낸다.
 */

const ENGINE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>
(function () {
  var ctx = null;
  function post(m) { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }

  function initAudio() {
    try {
      if (!ctx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        ctx = new Ctx();
      }
      if (ctx.state === 'suspended') { ctx.resume(); }
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, delay, gain) {
    if (!ctx) { initAudio(); }
    if (!ctx) return;
    try {
      var t0 = ctx.currentTime + delay;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  function speak(text, rate, voiceURI) {
    if (!text) return;
    try {
      var synth = window.speechSynthesis;
      var Utter = window.SpeechSynthesisUtterance;
      if (!synth || !Utter) return;
      var u = new Utter(text);
      u.lang = 'ko-KR';
      u.rate = rate;
      if (voiceURI) {
        var all = synth.getVoices();
        for (var i = 0; i < all.length; i++) {
          if (all[i].voiceURI === voiceURI) { u.voice = all[i]; break; }
        }
      }
      synth.speak(u);
    } catch (e) {}
  }

  function reportVoices() {
    try {
      var synth = window.speechSynthesis;
      if (!synth) return;
      var out = [];
      var all = synth.getVoices();
      for (var i = 0; i < all.length; i++) {
        var v = all[i];
        if (v.lang && v.lang.toLowerCase().indexOf('ko') === 0) {
          out.push({ voiceURI: v.voiceURI, name: v.name });
        }
      }
      post({ t: 'voices', voices: out });
    } catch (e) {}
  }

  window.__sc = function (raw) {
    var m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'init') { initAudio(); reportVoices(); }
    else if (m.t === 'speak') { speak(m.text, m.rate, m.voiceURI); }
    else if (m.t === 'cancel') { try { window.speechSynthesis.cancel(); } catch (e) {} }
    else if (m.t === 'tone') { tone(m.freq, m.dur, m.delay, m.gain); }
  };

  try { if (window.speechSynthesis) { window.speechSynthesis.onvoiceschanged = reportVoices; } } catch (e) {}
  reportVoices();
  post({ t: 'ready' });
})();
</script></body></html>`;

const ENGINE_SOURCE = { html: ENGINE_HTML };

type Command =
  | { t: 'init' }
  | { t: 'cancel' }
  | { t: 'speak'; text: string; rate: number; voiceURI: string }
  | { t: 'tone'; freq: number; dur: number; delay: number; gain: number };

export interface CoachVoice {
  /** 화면 어딘가에 한 번 그려두면 된다. 보이지 않는다. */
  engine: React.ReactElement;
  /** 사용자 제스처 직후에 불러 오디오를 깨운다. 웹판의 initAudio. */
  prime: () => void;
  speak: (text: string, rate: number, voiceURI: string) => void;
  /** 말하던 것을 끊는다. 웹판의 hush. */
  hush: () => void;
  /** 라운드 시작 3회 / 종료 1회. 소리와 진동이 같이 나간다. */
  bell: (n?: number) => void;
  /** 10초 전 경고. 소리와 진동이 같이 나간다. */
  clapper: () => void;
  blip: () => void;
  voices: VoiceOption[];
}

export function useCoachVoice(): CoachVoice {
  const ref = useRef<WebView | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  const run = useCallback((js: string) => {
    try {
      const node = ref.current;
      if (readyRef.current && node) node.injectJavaScript(js);
      else queueRef.current.push(js);
    } catch {
      // 엔진이 없는 환경. 소리만 안 난다.
    }
  }, []);

  const send = useCallback(
    (cmd: Command) => {
      run(`window.__sc && window.__sc(${JSON.stringify(JSON.stringify(cmd))}); true;`);
    },
    [run]
  );

  const buzzTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** 소리의 delay(초)와 같은 자리에 진동을 놓는다. */
  const buzz = useCallback((type: HapticFeedbackType, delayMs: number) => {
    const fire = () => {
      try {
        generateHapticFeedback({ type });
      } catch {
        // 햅틱 미지원 환경
      }
    };
    if (delayMs <= 0) {
      fire();
      return;
    }
    buzzTimers.current.push(setTimeout(fire, delayMs));
  }, []);

  useEffect(
    () => () => {
      buzzTimers.current.forEach(clearTimeout);
      buzzTimers.current = [];
    },
    []
  );

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { t?: string; voices?: VoiceOption[] };
      if (m.t === 'ready') {
        readyRef.current = true;
        const pending = queueRef.current;
        queueRef.current = [];
        const node = ref.current;
        if (node) pending.forEach((js) => node.injectJavaScript(js));
      } else if (m.t === 'voices' && Array.isArray(m.voices)) {
        setVoices(m.voices);
      }
    } catch {
      // 알 수 없는 메시지는 버린다.
    }
  }, []);

  return useMemo<CoachVoice>(() => {
    const tone = (freq: number, dur: number, delay = 0, gain = 0.25) =>
      send({ t: 'tone', freq, dur, delay, gain });

    return {
      engine: (
        /*
         * WebView는 자기 자신을 flex:1 컨테이너 View로 감싼다(WebView.ios.js의 webViewContainerStyle).
         * style만 주면 그 컨테이너가 흐름에 남아 형제와 공간을 나눠 갖는다.
         * 반드시 흐름 밖으로 뺀 호스트 안에 넣고 containerStyle까지 같이 줄 것.
         */
        <View style={styles.engineHost} pointerEvents="none" testID="sc-voice-engine">
          <WebView
            ref={ref}
            source={ENGINE_SOURCE}
            originWhitelist={['*']}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled={false}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            androidLayerType="software"
            style={styles.engine}
            containerStyle={styles.engine}
          />
        </View>
      ),
      prime: () => send({ t: 'init' }),
      speak: (text, rate, voiceURI) => {
        if (!text) return;
        send({ t: 'speak', text, rate, voiceURI });
      },
      hush: () => send({ t: 'cancel' }),
      bell: (n = 1) => {
        for (let i = 0; i < n; i++) {
          tone(880, 0.7, i * 0.32, 0.3);
          tone(1320, 0.5, i * 0.32, 0.15);
          // 3회는 시작, 1회는 종료. 횟수가 그대로 손에 잡혀야 한다.
          buzz('basicMedium', i * 320);
        }
      },
      clapper: () => {
        for (let i = 0; i < 3; i++) {
          tone(1500, 0.09, i * 0.16, 0.2);
          buzz('tickMedium', i * 160);
        }
      },
      blip: () => tone(660, 0.14, 0, 0.2),
      voices,
    };
  }, [send, onMessage, buzz, voices]);
}

const styles = StyleSheet.create({
  /** 흐름 밖으로 완전히 빼낸다. 화면 레이아웃에 영향을 주면 안 된다. */
  engineHost: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  engine: { width: 1, height: 1, backgroundColor: 'transparent' },
});
