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

  /*
   * 녹음과 되틀기. 토스 모듈에 마이크가 없어 WebView의 getUserMedia로 잡는다(기획서 4.4·12장).
   * 녹음 본체는 dataURL로 앱에 넘기고, 재생용으로는 여기서 AudioBuffer로 풀어 id별로 들고 있는다.
   */
  var recorder = null, chunks = [], clips = {}, playing = [];
  function decode(dataUrl, ok, fail) {
    if (!ctx) { initAudio(); }
    if (!ctx) { fail('no-ctx'); return; }
    try {
      var b64 = dataUrl.split(',')[1] || '';
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
      ctx.decodeAudioData(bytes.buffer, ok, function (err) { fail('decode:' + String((err && err.name) || err)); });
    } catch (e) { fail(String(e)); }
  }
  function recordStart() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        post({ t: 'recordError', message: 'no-api' }); return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        chunks = [];
        var mime = '';
        var cands = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
        for (var i = 0; i < cands.length; i++) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cands[i])) { mime = cands[i]; break; }
        }
        recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var blob = new Blob(chunks, { type: recorder.mimeType || mime });
          var fr = new FileReader();
          fr.onload = function () {
            var data = fr.result;
            // 길이는 풀어 봐야 안다. 못 풀면 틀 수도 없으니 실패로 친다.
            decode(data, function (audio) { post({ t: 'recorded', data: data, duration: audio.duration, size: blob.size }); },
              function (m) { post({ t: 'recordError', message: m }); });
          };
          fr.onerror = function () { post({ t: 'recordError', message: 'read' }); };
          fr.readAsDataURL(blob);
        };
        recorder.start();
        post({ t: 'recStarted' });
      }).catch(function (err) { post({ t: 'recordError', message: String((err && err.name) || err) }); });
    } catch (e) { post({ t: 'recordError', message: String(e) }); }
  }
  function recordStop() {
    try { if (recorder && recorder.state !== 'inactive') { recorder.stop(); } } catch (e) {}
  }
  function loadClip(id, dataUrl) {
    decode(dataUrl, function (audio) { clips[id] = audio; }, function (m) { post({ t: 'clipError', id: id, message: m }); });
  }
  function dropClip(id) { delete clips[id]; }
  function stopClips() {
    playing.forEach(function (src) { try { src.stop(); } catch (e) {} });
    playing = [];
  }
  /* from·duration은 녹음 기준 초. 템포는 재생 속도라 그만큼 더 많은 녹음이 같은 시간에 흐른다. */
  function playClip(id, delay, from, duration, rate) {
    if (!ctx) { initAudio(); }
    var buf = clips[id];
    if (!ctx || !buf) return;
    try {
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate || 1;
      src.connect(ctx.destination);
      src.start(ctx.currentTime + (delay || 0), from || 0, duration * (rate || 1));
      playing.push(src);
      src.onended = function () { playing = playing.filter(function (x) { return x !== src; }); };
    } catch (e) {}
  }

  window.__sc = function (raw) {
    var m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'init') { initAudio(); reportVoices(); }
    else if (m.t === 'speak') { speak(m.text, m.rate, m.voiceURI); }
    else if (m.t === 'cancel') { try { window.speechSynthesis.cancel(); } catch (e) {} stopClips(); }
    else if (m.t === 'tone') { tone(m.freq, m.dur, m.delay, m.gain); }
    else if (m.t === 'recordStart') { recordStart(); }
    else if (m.t === 'recordStop') { recordStop(); }
    else if (m.t === 'loadClip') { loadClip(m.id, m.data); }
    else if (m.t === 'dropClip') { dropClip(m.id); }
    else if (m.t === 'playClip') { playClip(m.id, m.delay, m.from, m.duration, m.rate); }
  };

  try { if (window.speechSynthesis) { window.speechSynthesis.onvoiceschanged = reportVoices; } } catch (e) {}
  reportVoices();
  post({ t: 'ready' });
})();
</script></body></html>`;

/* getUserMedia는 보안 컨텍스트에서만 산다. about:blank 대신 localhost를 출처로 준다. */
const ENGINE_SOURCE = { html: ENGINE_HTML, baseUrl: 'https://localhost' };

type Command =
  | { t: 'init' }
  | { t: 'cancel' }
  | { t: 'speak'; text: string; rate: number; voiceURI: string }
  | { t: 'tone'; freq: number; dur: number; delay: number; gain: number }
  | { t: 'recordStart' }
  | { t: 'recordStop' }
  | { t: 'loadClip'; id: string; data: string }
  | { t: 'dropClip'; id: string }
  | { t: 'playClip'; id: string; delay: number; from: number; duration: number; rate: number };

/** 녹음 쪽에서 올라오는 일. 번호가 오를 때마다 새 일이다 — 같은 종류가 연달아 와도 구분된다. */
export type RecordEvent =
  | { seq: number; kind: 'started'; at: number }
  | { seq: number; kind: 'done'; data: string; duration: number }
  | { seq: number; kind: 'error'; message: string };

export type ClipPlay = { from: number; duration: number; rate: number; delay?: number };

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
  /** 손이 닿았다. 두드리는 무대가 탭마다 부른다 — 소리는 안 낸다. */
  tick: () => void;
  voices: VoiceOption[];
  /** 마이크를 켠다. 켜지면 recordEvent가 started로, 못 켜면 error로 온다. */
  recordStart: () => void;
  /** 녹음을 멈춘다. 본체는 recordEvent가 done으로 들고 온다. */
  recordStop: () => void;
  recordEvent: RecordEvent | null;
  /** 녹음 본체를 엔진에 풀어 둔다. 틀기 전에 한 번. */
  loadClip: (id: string, data: string) => void;
  dropClip: (id: string) => void;
  playClip: (id: string, play: ClipPlay) => void;
}

export function useCoachVoice(): CoachVoice {
  const ref = useRef<WebView | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [recordEvent, setRecordEvent] = useState<RecordEvent | null>(null);
  const recSeq = useRef(0);

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
      const m = JSON.parse(e.nativeEvent.data) as {
        t?: string;
        voices?: VoiceOption[];
        message?: string;
        data?: string;
        duration?: number;
      };
      if (m.t === 'recStarted') {
        // 첫 두드림과 맞출 시계. 브리지 지연은 몇 ms라 여기서 잰다.
        setRecordEvent({ seq: (recSeq.current += 1), kind: 'started', at: Date.now() });
      } else if (m.t === 'recorded' && typeof m.data === 'string') {
        setRecordEvent({ seq: (recSeq.current += 1), kind: 'done', data: m.data, duration: m.duration ?? 0 });
      } else if (m.t === 'recordError') {
        setRecordEvent({ seq: (recSeq.current += 1), kind: 'error', message: m.message ?? '?' });
      }
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
            mediaCapturePermissionGrantType="grant"
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
      // tickMedium은 기기에서 손맛이 없었다. 벨과 같은 세기로 올린다.
      tick: () => buzz('basicMedium', 0),
      voices,
      recordStart: () => send({ t: 'recordStart' }),
      recordStop: () => send({ t: 'recordStop' }),
      recordEvent,
      loadClip: (id, data) => send({ t: 'loadClip', id, data }),
      dropClip: (id) => send({ t: 'dropClip', id }),
      playClip: (id, play) =>
        send({ t: 'playClip', id, delay: play.delay ?? 0, from: play.from, duration: play.duration, rate: play.rate }),
    };
  }, [send, onMessage, buzz, voices, recordEvent]);
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
