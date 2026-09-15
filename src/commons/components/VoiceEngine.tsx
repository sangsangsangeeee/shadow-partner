import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from '@granite-js/native/react-native-webview';
import { generateHapticFeedback, type HapticFeedbackType } from '@apps-in-toss/native-modules';

/**
 * 코치의 신호를 내보내는 곳. 소리·진동·녹음이 전부 여기서 나간다.
 *
 * React Native에는 AudioContext도 MediaRecorder도 없다.
 * 화면 밖 1px 웹뷰를 엔진으로 두고 웹 API를 그대로 쓴다.
 * 토스 모듈에 마이크가 없어 녹음도 여기 붙는다(기획서 4.4).
 *
 * 웹뷰 오디오는 이 이식본에서 가장 약한 고리라, 라운드 벨과 10초 클래퍼에는
 * 네이티브 햅틱을 같은 리듬으로 겹쳐 둔다. 소리가 안 나는 기기에서도
 * 라운드가 시작·종료됐다는 것과 10초 남았다는 것은 몸으로 알 수 있어야 한다.
 *
 * 소리가 죽어도 타이머는 돌아야 한다(원칙 6). 따라서 모든 호출은 실패해도 조용히 넘어가고,
 * 준비 전 명령은 큐에 쌓았다가 흘려보낸다. **마이크만은 예외다** — 본 기능이라 못 쓰면 말한다.
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

  /*
   * 녹음과 되틀기. 녹음 본체는 dataURL로 앱에 넘기고,
   * 재생용으로는 여기서 AudioBuffer로 풀어 id별로 들고 있는다.
   */
  var recorder = null, chunks = [], clips = {}, playing = [], maxTimer = null;
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

  /*
   * 앞뒤 침묵을 소리로 잡는다(기획서 6장).
   * 10ms 창의 RMS가 최대치의 5%를 처음·마지막으로 넘는 자리.
   * 숨소리·손 소리보다 크고 말보다 작은 문턱이다 — 기기에서 조정한다.
   */
  function edges(audio) {
    try {
      var d = audio.getChannelData(0);
      var win = Math.max(1, Math.floor(audio.sampleRate * 0.01));
      var n = Math.floor(d.length / win);
      var rms = [], peak = 0, i, j;
      for (i = 0; i < n; i++) {
        var sum = 0;
        for (j = 0; j < win; j++) { var v = d[i * win + j] || 0; sum += v * v; }
        var r = Math.sqrt(sum / win);
        rms.push(r);
        if (r > peak) peak = r;
      }
      if (peak <= 0) return { head: 0, tail: audio.duration };
      var th = peak * 0.05, first = -1, last = -1;
      for (i = 0; i < n; i++) { if (rms[i] >= th) { if (first < 0) first = i; last = i; } }
      if (first < 0) return { head: 0, tail: audio.duration };
      return { head: (first * win) / audio.sampleRate, tail: ((last + 1) * win) / audio.sampleRate };
    } catch (e) { return { head: 0, tail: audio.duration }; }
  }

  function recordStart(maxMs) {
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
            // 길이도 앞뒤도 풀어 봐야 안다. 못 풀면 틀 수도 없으니 실패로 친다.
            decode(data, function (audio) {
              var e = edges(audio);
              post({ t: 'recorded', data: data, duration: audio.duration, head: e.head, tail: e.tail });
            }, function (m) { post({ t: 'recordError', message: m }); });
          };
          fr.onerror = function () { post({ t: 'recordError', message: 'read' }); };
          fr.readAsDataURL(blob);
        };
        recorder.start();
        // 상한에 닿으면 저절로 멈춘다. 앱의 완료가 먼저 오면 recordStop이 이 시계를 지운다.
        if (maxMs > 0) { maxTimer = setTimeout(function () { recordStop(); }, maxMs); }
        post({ t: 'recStarted' });
      }).catch(function (err) { post({ t: 'recordError', message: String((err && err.name) || err) }); });
    } catch (e) { post({ t: 'recordError', message: String(e) }); }
  }
  function recordStop() {
    if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
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
    if (m.t === 'init') { initAudio(); }
    else if (m.t === 'cancel') { stopClips(); }
    else if (m.t === 'tone') { tone(m.freq, m.dur, m.delay, m.gain); }
    else if (m.t === 'recordStart') { recordStart(m.maxMs); }
    else if (m.t === 'recordStop') { recordStop(); }
    else if (m.t === 'loadClip') { loadClip(m.id, m.data); }
    else if (m.t === 'dropClip') { dropClip(m.id); }
    else if (m.t === 'playClip') { playClip(m.id, m.delay, m.from, m.duration, m.rate); }
  };

  // 마이크를 쓸 수 있는 환경인지 앱이 시작할 때 알아야 한다(기획서 4.4).
  post({ t: 'ready', mic: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) });
})();
</script></body></html>`;

/* getUserMedia는 보안 컨텍스트에서만 산다. about:blank 대신 localhost를 출처로 준다. */
const ENGINE_SOURCE = { html: ENGINE_HTML, baseUrl: 'https://localhost' };

type Command =
  | { t: 'init' }
  | { t: 'cancel' }
  | { t: 'tone'; freq: number; dur: number; delay: number; gain: number }
  | { t: 'recordStart'; maxMs: number }
  | { t: 'recordStop' }
  | { t: 'loadClip'; id: string; data: string }
  | { t: 'dropClip'; id: string }
  | { t: 'playClip'; id: string; delay: number; from: number; duration: number; rate: number };

/** 녹음 쪽에서 올라오는 일. 번호가 오를 때마다 새 일이다 — 같은 종류가 연달아 와도 구분된다. */
export type RecordEvent =
  | { seq: number; kind: 'started' }
  | { seq: number; kind: 'done'; data: string; duration: number; head: number; tail: number }
  | { seq: number; kind: 'error'; message: string };

export type ClipPlay = { from: number; duration: number; rate: number; delay?: number };

export interface CoachVoice {
  /** 화면 어딘가에 한 번 그려두면 된다. 보이지 않는다. */
  engine: React.ReactElement;
  /** 사용자 제스처 직후에 불러 오디오를 깨운다. */
  prime: () => void;
  /** 나오던 녹음을 끊는다. 일시정지·정지·건너뛰기가 즉시 끊어야 한다(기획서 6장). */
  stop: () => void;
  /** 라운드 시작 3회 / 종료 1회. 소리와 진동이 같이 나간다. */
  bell: (n?: number) => void;
  /** 10초 전 경고. 소리와 진동이 같이 나간다. */
  clapper: () => void;
  blip: () => void;
  /** 손이 닿았다. 녹음 시작을 손으로 알린다 — 소리는 안 낸다. */
  tick: () => void;
  /** 마이크를 쓸 수 있는 환경인가. 엔진이 답하기 전에는 null. */
  micAvailable: boolean | null;
  /** 마이크를 켠다. 켜지면 recordEvent가 started로, 못 켜면 error로 온다. */
  recordStart: (maxMs: number) => void;
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
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
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
        mic?: boolean;
        message?: string;
        data?: string;
        duration?: number;
        head?: number;
        tail?: number;
      };
      if (m.t === 'recStarted') {
        setRecordEvent({ seq: (recSeq.current += 1), kind: 'started' });
      } else if (m.t === 'recorded' && typeof m.data === 'string') {
        setRecordEvent({
          seq: (recSeq.current += 1),
          kind: 'done',
          data: m.data,
          duration: m.duration ?? 0,
          head: m.head ?? 0,
          tail: m.tail ?? m.duration ?? 0,
        });
      } else if (m.t === 'recordError') {
        setRecordEvent({ seq: (recSeq.current += 1), kind: 'error', message: m.message ?? '?' });
      }
      if (m.t === 'ready') {
        readyRef.current = true;
        setMicAvailable(!!m.mic);
        const pending = queueRef.current;
        queueRef.current = [];
        const node = ref.current;
        if (node) pending.forEach((js) => node.injectJavaScript(js));
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
      stop: () => send({ t: 'cancel' }),
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
      micAvailable,
      recordStart: (maxMs) => send({ t: 'recordStart', maxMs }),
      recordStop: () => send({ t: 'recordStop' }),
      recordEvent,
      loadClip: (id, data) => send({ t: 'loadClip', id, data }),
      dropClip: (id) => send({ t: 'dropClip', id }),
      playClip: (id, play) =>
        send({ t: 'playClip', id, delay: play.delay ?? 0, from: play.from, duration: play.duration, rate: play.rate }),
    };
  }, [send, onMessage, buzz, micAvailable, recordEvent]);
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
