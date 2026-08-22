import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Trash2,
  Volume2,
  Check,
  Pencil,
  X,
  RotateCcw,
  Plus,
  Minus,
  MoreHorizontal,
  Settings,
  ChevronUp,
  LayoutGrid,
  Timer,
  ListOrdered,
  Megaphone,
} from 'lucide-react';

/* ---------------- 기본 동작 ---------------- */

const BASE_MOVES = [
  { id: 'jab', name: '잽', num: '1', numCall: '원', beat: 0.4, kind: 'punch', aliases: ['잽', '잼', '자브', 'jab'] },
  {
    id: 'cross',
    name: '스트레이트',
    num: '2',
    numCall: '투',
    beat: 0.5,
    kind: 'punch',
    aliases: ['스트레이트', '크로스', '스트', '라이트', 'cross'],
  },
  {
    id: 'lhook',
    name: '레프트훅',
    num: '3',
    numCall: '쓰리',
    beat: 0.65,
    kind: 'punch',
    aliases: ['레프트훅', '왼훅', '레프트후크', '훅', '후크', 'hook'],
  },
  {
    id: 'rhook',
    name: '라이트훅',
    num: '4',
    numCall: '포',
    beat: 0.65,
    kind: 'punch',
    aliases: ['라이트훅', '오른훅', '라이트후크'],
  },
  {
    id: 'lupper',
    name: '레프트어퍼',
    num: '5',
    numCall: '파이브',
    beat: 0.65,
    kind: 'punch',
    aliases: ['레프트어퍼', '왼어퍼', '어퍼', '어퍼컷', 'uppercut'],
  },
  {
    id: 'rupper',
    name: '라이트어퍼',
    num: '6',
    numCall: '식스',
    beat: 0.65,
    kind: 'punch',
    aliases: ['라이트어퍼', '오른어퍼'],
  },
  {
    id: 'bodyshot',
    name: '바디',
    num: null,
    numCall: null,
    beat: 0.65,
    kind: 'punch',
    aliases: ['바디', '바디샷', 'body'],
  },

  {
    id: 'lowkick',
    name: '로우킥',
    num: null,
    numCall: null,
    beat: 0.85,
    kind: 'kick',
    aliases: ['로우킥', '로킥', '로우', 'lowkick'],
  },
  {
    id: 'midkick',
    name: '미들킥',
    num: null,
    numCall: null,
    beat: 0.85,
    kind: 'kick',
    aliases: ['미들킥', '미들', '바디킥', 'midkick'],
  },
  {
    id: 'highkick',
    name: '하이킥',
    num: null,
    numCall: null,
    beat: 1.05,
    kind: 'kick',
    aliases: ['하이킥', '하이', 'highkick'],
  },
  {
    id: 'pushkick',
    name: '푸시킥',
    num: null,
    numCall: null,
    beat: 0.85,
    kind: 'kick',
    aliases: ['푸시킥', '앞차기', '테프', '띱', 'teep'],
  },
  {
    id: 'knee',
    name: '니킥',
    num: null,
    numCall: null,
    beat: 0.65,
    kind: 'kick',
    aliases: ['니킥', '무릎', '니', 'knee'],
  },

  { id: 'slip', name: '슬립', num: null, numCall: null, beat: 0.5, kind: 'def', aliases: ['슬립', '슬립핑', 'slip'] },
  { id: 'weave', name: '위빙', num: null, numCall: null, beat: 0.65, kind: 'def', aliases: ['위빙', '위브', 'weave'] },
  { id: 'duck', name: '더킹', num: null, numCall: null, beat: 0.5, kind: 'def', aliases: ['더킹', '덕', 'duck'] },
  {
    id: 'block',
    name: '블로킹',
    num: null,
    numCall: null,
    beat: 0.5,
    kind: 'def',
    aliases: ['블로킹', '블럭', '블록', '가드', 'block'],
  },

  { id: 'step', name: '스텝', num: null, numCall: null, beat: 0.5, kind: 'move', aliases: ['스텝', '스탭', 'step'] },
  {
    id: 'back',
    name: '백스텝',
    num: null,
    numCall: null,
    beat: 0.5,
    kind: 'move',
    aliases: ['백스텝', '백스탭', '백'],
  },
  { id: 'switch', name: '스위치', num: null, numCall: null, beat: 0.65, kind: 'move', aliases: ['스위치', 'switch'] },
  { id: 'pivot', name: '피벗', num: null, numCall: null, beat: 0.5, kind: 'move', aliases: ['피벗', '피봇', 'pivot'] },
];

const KIND_LABEL = { punch: '펀치', kick: '킥', def: '방어', move: '풋워크' };
const KINDS = ['punch', 'kick', 'def', 'move'];
const BEAT_OPTIONS = [
  ['아주 짧게', 0.4],
  ['짧게', 0.5],
  ['보통', 0.65],
  ['길게', 0.85],
  ['아주 길게', 1.05],
];
const NUM_WORDS = [
  ['하나', '1'],
  ['둘', '2'],
  ['셋', '3'],
  ['넷', '4'],
  ['다섯', '5'],
  ['여섯', '6'],
];

const CUES = ['스탠스 유지', '가드 올리고', '롱가드', '스텝', '백스텝', '사이드 스텝', '리듬 타기'];
const pickCue = () => CUES[Math.floor(Math.random() * CUES.length)];

const beatName = (v) => {
  const hit = BEAT_OPTIONS.find(([, b]) => b === v);
  if (hit) return hit[0];
  let best = BEAT_OPTIONS[0];
  BEAT_OPTIONS.forEach((o) => {
    if (Math.abs(o[1] - v) < Math.abs(best[1] - v)) best = o;
  });
  return best[0];
};

const ACCENT = '#006064';

/* ---------------- 별칭 사전 ---------------- */

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');

export function buildAlias(customMoves, labels) {
  const map = {};
  const add = (key, id) => {
    if (key) map[norm(key)] = id;
  };

  BASE_MOVES.forEach((m) => {
    [m.name, ...m.aliases, m.num, m.numCall].forEach((k) => add(k, m.id));
  });
  NUM_WORDS.forEach(([word, n]) => {
    const found = BASE_MOVES.find((m) => m.num === n);
    if (found) add(word, found.id);
  });
  customMoves.forEach((m) => {
    add(m.name, m.id);
    (m.aliases || []).forEach((a) => add(a, m.id));
  });
  Object.keys(labels).forEach((id) => {
    if (labels[id] && labels[id].trim()) add(labels[id], id);
  });
  return map;
}

/* ---------------- 파서 ---------------- */

function consumeGreedy(str, alias) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    let matched = null;
    for (let len = Math.min(8, str.length - i); len >= 1; len--) {
      const sub = str.slice(i, i + len);
      if (alias[sub]) {
        matched = { id: alias[sub], len };
        break;
      }
    }
    if (!matched) return null;
    out.push(matched.id);
    i += matched.len;
  }
  return out;
}

const KO_COUNT = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };

export function parseCombo(text, alias) {
  const moves = [];
  const unknown = [];
  if (!text) return { moves, unknown };

  const s = String(text)
    .toLowerCase()
    .replace(/[\-–—,/>·|+&]/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/(더블|트리플|double|triple)(?=\S)/g, '$1 ')
    .replace(/([^\s×x*])([×x*]\d+)/g, '$1 $2')
    .replace(/([^\s\d])(\d+)(번|회)/g, '$1 $2$3')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = s.split(' ').filter(Boolean).map(norm);

  let pendingRepeat = 0;
  const push = (id) => {
    if (!id) return;
    const times = pendingRepeat > 0 ? pendingRepeat : 1;
    for (let k = 0; k < times; k++) moves.push(id);
    pendingRepeat = 0;
  };
  const repeatLast = (n) => {
    const last = moves[moves.length - 1];
    for (let k = 1; k < n; k++) moves.push(last);
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    if (t === '더블' || t === 'double') {
      pendingRepeat = 2;
      i += 1;
      continue;
    }
    if (t === '트리플' || t === 'triple') {
      pendingRepeat = 3;
      i += 1;
      continue;
    }

    const rep = t.match(/^[x×*](\d+)$/) || t.match(/^(\d+)(번|회)$/);
    if (rep && moves.length) {
      repeatLast(parseInt(rep[1], 10));
      i += 1;
      continue;
    }
    const koRep = t.match(/^(한|두|세|네|다섯)(번|회)$/);
    if (koRep && moves.length) {
      repeatLast(KO_COUNT[koRep[1]]);
      i += 1;
      continue;
    }

    // 공백을 넘어 이어지는 이름을 먼저 본다. 긴 쪽이 이긴다.
    let joined = false;
    for (let span = Math.min(4, tokens.length - i); span >= 2; span -= 1) {
      const key = tokens.slice(i, i + span).join('');
      if (alias[key]) {
        push(alias[key]);
        i += span;
        joined = true;
        break;
      }
    }
    if (joined) continue;

    if (/^[1-6]{2,}$/.test(t)) {
      t.split('').forEach((d) => push(alias[d]));
      i += 1;
      continue;
    }
    if (alias[t]) {
      push(alias[t]);
      i += 1;
      continue;
    }

    const greedy = consumeGreedy(t, alias);
    if (greedy) {
      greedy.forEach((id) => push(id));
      i += 1;
      continue;
    }

    unknown.push(t);
    i += 1;
  }

  return { moves, unknown };
}

/* ---------------- 유틸 ---------------- */

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const SEED = [
  { id: uid(), moves: ['jab', 'cross', 'lowkick'], on: true },
  { id: uid(), moves: ['jab', 'jab', 'cross', 'lhook'], on: true },
  { id: uid(), moves: ['jab', 'midkick'], on: true },
  { id: uid(), moves: ['jab', 'cross', 'slip', 'cross'], on: true },
];

const MODES = [
  { id: 'random', label: '랜덤', hint: '선택한 콤보를 무작위로 계속 불러줘.' },
  { id: 'loop', label: '반복', hint: '선택한 콤보를 순서대로 계속 돌려.' },
  { id: 'count', label: '횟수', hint: '라운드마다 정해진 횟수만 불러줘.' },
  { id: 'none', label: '없음', hint: '호출 없이 타이머만 돌아가.' },
];

const DEFAULTS = {
  rounds: 3,
  roundSec: 180,
  restSec: 60,
  tempo: 1.0,
  gap: 1.6,
  randomGap: true,
  mode: 'random',
  reps: 8,
  rate: 1.15,
  voiceURI: '',
};

/* ---------------- 메인 ---------------- */

export default function ShadowCoach() {
  const [tab, setTab] = useState('train');
  const [combos, setCombos] = useState(SEED);
  const [settings, setSettings] = useState(DEFAULTS);
  const [labels, setLabels] = useState({});
  const [customMoves, setCustomMoves] = useState([]);
  const [beats, setBeats] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [phase, setPhase] = useState('idle');
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeCombo, setActiveCombo] = useState(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [repCount, setRepCount] = useState(0);
  const [gap, setGap] = useState(null);
  const [stats, setStats] = useState({ combos: 0, moves: 0 });

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [voices, setVoices] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetIn, setSheetIn] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState('punch');
  const [expandedId, setExpandedId] = useState(null);
  const [undo, setUndo] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState('punch');
  const [newBeat, setNewBeat] = useState(0.65);
  const [addError, setAddError] = useState('');
  const [wordKind, setWordKind] = useState('punch');
  const [editingMoveId, setEditingMoveId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [startError, setStartError] = useState('');
  const [comboHint, setComboHint] = useState('');

  const timersRef = useRef([]);
  const audioRef = useRef(null);
  const wakeRef = useRef(null);
  const queueRef = useRef([]);
  const posRef = useRef(0);
  const stRef = useRef(settings);
  const labelRef = useRef(labels);
  const moveRef = useRef({});
  const beatRef = useRef({});
  const curRef = useRef(null);
  const repRef = useRef(0);
  const undoRef = useRef(null);
  const hiRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    repRef.current = repCount;
  }, [repCount]);

  useEffect(() => {
    if (!sheetOpen) {
      setSheetIn(false);
      return;
    }
    const id = requestAnimationFrame(() => setSheetIn(true));
    return () => cancelAnimationFrame(id);
  }, [sheetOpen]);

  const closeSheet = () => {
    setSheetIn(false);
    setTimeout(() => setSheetOpen(false), 200);
  };

  const moveMap = useMemo(() => {
    const m = {};
    BASE_MOVES.forEach((x) => {
      m[x.id] = x;
    });
    customMoves.forEach((x) => {
      m[x.id] = x;
    });
    return m;
  }, [customMoves]);

  const alias = useMemo(() => buildAlias(customMoves, labels), [customMoves, labels]);

  useEffect(() => {
    stRef.current = settings;
  }, [settings]);
  useEffect(() => {
    labelRef.current = labels;
  }, [labels]);
  useEffect(() => {
    moveRef.current = moveMap;
  }, [moveMap]);
  useEffect(() => {
    beatRef.current = beats;
  }, [beats]);

  const label = useCallback(
    (id) => {
      const custom = labels[id];
      if (custom && custom.trim()) return custom.trim();
      return moveMap[id] ? moveMap[id].name : '?';
    },
    [labels, moveMap]
  );

  const beatOf = useCallback(
    (id) => {
      const b = beats[id];
      if (typeof b === 'number') return b;
      return moveMap[id] ? moveMap[id].beat : 0.65;
    },
    [beats, moveMap]
  );

  const parsed = parseCombo(draft, alias);
  const dupCombo = parsed.moves.length
    ? combos.find((c) => c.id !== editingId && c.moves.join('>') === parsed.moves.join('>')) || null
    : null;
  const canSave = parsed.moves.length > 0 && !dupCombo;
  const saveFabShown = tab === 'combos' && draft.trim().length > 0;
  const anyFabShown = saveFabShown || tab === 'words';

  /* ---- 저장소 ---- */

  useEffect(() => {
    let alive = true;
    (async () => {
      const jobs = [
        ['sbc:combos', (v) => setCombos(v)],
        ['sbc:settings', (v) => setSettings({ ...DEFAULTS, ...v })],
        ['sbc:labels', (v) => setLabels(v)],
        ['sbc:moves', (v) => setCustomMoves(v)],
        ['sbc:beats', (v) => setBeats(v)],
      ];
      for (const [key, apply] of jobs) {
        try {
          const r = await window.storage.get(key);
          if (alive && r && r.value) apply(JSON.parse(r.value));
        } catch (e) {
          /* 최초 실행 */
        }
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = (key, val) => {
    if (!loaded) return;
    try {
      const r = window.storage.set(key, JSON.stringify(val));
      if (r && r.catch) r.catch(() => {});
    } catch (e) {
      /* 저장소 미지원 환경 */
    }
  };
  useEffect(() => {
    persist('sbc:combos', combos);
    setStartError('');
  }, [combos, loaded]);
  useEffect(() => {
    persist('sbc:settings', settings);
  }, [settings, loaded]);
  useEffect(() => {
    persist('sbc:labels', labels);
  }, [labels, loaded]);
  useEffect(() => {
    persist('sbc:moves', customMoves);
  }, [customMoves, loaded]);
  useEffect(() => {
    persist('sbc:beats', beats);
  }, [beats, loaded]);

  /* ---- 음성 ---- */

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () =>
      setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('ko')));
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text) => {
    if (!text) return;
    try {
      const synth = window.speechSynthesis;
      const Utter = window.SpeechSynthesisUtterance;
      if (!synth || !Utter) return;
      const st = stRef.current;
      const u = new Utter(text);
      u.lang = 'ko-KR';
      u.rate = st.rate;
      if (st.voiceURI) {
        const v = synth.getVoices().find((x) => x.voiceURI === st.voiceURI);
        if (v) u.voice = v;
      }
      synth.speak(u);
    } catch (e) {
      /* 음성 미지원 환경 */
    }
  }, []);

  const speakMove = useCallback(
    (id) => {
      const custom = labelRef.current[id];
      const m = moveRef.current[id];
      speak(custom && custom.trim() ? custom.trim() : m ? m.name : '');
    },
    [speak]
  );

  /* ---- 사운드 ---- */

  const initAudio = () => {
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioRef.current = new Ctx();
      }
      if (audioRef.current.state === 'suspended') audioRef.current.resume();
    } catch (e) {
      audioRef.current = null;
    }
  };

  const tone = (freq, dur, delay = 0, gain = 0.25) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) {
      /* 오디오 미지원 환경 */
    }
  };

  const bell = (n = 1) => {
    for (let i = 0; i < n; i++) {
      tone(880, 0.7, i * 0.32, 0.3);
      tone(1320, 0.5, i * 0.32, 0.15);
    }
  };
  const clapper = () => {
    for (let i = 0; i < 3; i++) tone(1500, 0.09, i * 0.16, 0.2);
  };
  const blip = () => tone(660, 0.14, 0, 0.2);

  /* ---- 진행 ---- */

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const hush = () => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {
      /* noop */
    }
  };

  const pickNext = () => {
    const q = queueRef.current;
    if (!q.length) return null;
    if (stRef.current.mode === 'random') return q[Math.floor(Math.random() * q.length)];
    const c = q[posRef.current % q.length];
    posRef.current += 1;
    return c;
  };

  const playCombo = useCallback(
    (combo, chain = true) => {
      if (!combo) return;
      const st = stRef.current;
      curRef.current = combo;
      setGap(null);
      setStats((p) => ({ combos: p.combos + 1, moves: p.moves + combo.moves.length }));
      setActiveCombo(combo);
      setActiveIdx(-1);
      let t = 0;
      combo.moves.forEach((mid, i) => {
        const m = moveRef.current[mid];
        if (!m) return;
        later(() => {
          setActiveIdx(i);
          speakMove(mid);
        }, t);
        const bt = beatRef.current[mid];
        t += Math.round(((typeof bt === 'number' ? bt : m.beat) * 1000) / st.tempo);
      });
      if (chain) {
        const gapMs = Math.round(st.gap * 1000 + (st.randomGap ? Math.random() * 1200 : 0));
        later(() => {
          setActiveIdx(-1);
          setGap({ cue: pickCue(), ms: gapMs });
        }, t);
        later(() => {
          setGap(null);
          const n = pickNext();
          if (n) playCombo(n, true);
        }, t + gapMs);
      } else {
        later(() => {
          setActiveIdx(-1);
          setGap({ cue: pickCue(), ms: null });
        }, t + 300);
      }
    },
    [speakMove]
  );

  const scheduleReps = useCallback(
    (remaining, msLeft, doneSoFar) => {
      if (remaining <= 0) return;
      const interval = Math.max(2500, msLeft / remaining);
      for (let i = 0; i < remaining; i++) {
        later(
          () => {
            const c = pickNext();
            if (c) {
              setRepCount(doneSoFar + i + 1);
              playCombo(c, false);
            }
          },
          600 + i * interval
        );
      }
    },
    [playCombo]
  );

  const startCallouts = useCallback(() => {
    const st = stRef.current;
    if (st.mode === 'none') return;
    if (st.mode === 'count') {
      setRepCount(0);
      scheduleReps(Math.max(1, st.reps), st.roundSec * 1000, 0);
      return;
    }
    const n = pickNext();
    if (n) playCombo(n, true);
  }, [playCombo, scheduleReps]);

  const start = () => {
    const on = combos.filter((c) => c.on && c.moves.length);
    const queue = on.length ? on : combos.filter((c) => c.moves.length);

    if (!queue.length && settings.mode !== 'none') {
      setStartError(
        combos.length
          ? '훈련에 넣은 콤보가 없어. 콤보 탭에서 체크하거나, 모드를 "없음"으로 바꾸면 타이머만 돌릴 수 있어.'
          : '저장된 콤보가 없어. 콤보 탭에서 하나 만들어줘.'
      );
      return;
    }

    setStartError('');
    queueRef.current = queue;
    posRef.current = 0;
    setRound(1);
    setPaused(false);
    setRepCount(0);
    setGap(null);
    setStats({ combos: 0, moves: 0 });
    setPhase('ready');
    setTimeLeft(5);

    initAudio();
    speak('준비');
    try {
      if ('wakeLock' in navigator) {
        navigator.wakeLock
          .request('screen')
          .then((w) => {
            wakeRef.current = w;
          })
          .catch(() => {});
      }
    } catch (e) {
      /* 지원 안 함 */
    }
  };

  const stop = () => {
    clearTimers();
    hush();
    setPhase('idle');
    setPaused(false);
    setActiveCombo(null);
    setActiveIdx(-1);
    setTimeLeft(0);
    setGap(null);
    if (wakeRef.current) {
      try {
        wakeRef.current.release();
      } catch (e) {
        /* noop */
      }
      wakeRef.current = null;
    }
  };

  const togglePause = () => {
    if (phase === 'idle' || phase === 'done') return;
    if (paused) {
      setPaused(false);
      if (phase === 'work') {
        clearTimers();
        const st = stRef.current;
        if (st.mode === 'count') {
          scheduleReps(Math.max(0, st.reps - repRef.current), timeLeft * 1000, repRef.current);
        } else if (st.mode !== 'none') {
          playCombo(curRef.current || pickNext(), true);
        }
      }
    } else {
      setPaused(true);
      clearTimers();
      hush();
      setGap(null);
    }
  };

  const skip = () => {
    if (phase !== 'work' || paused || settings.mode === 'none') return;
    clearTimers();
    hush();
    setGap(null);
    const st = stRef.current;
    if (st.mode === 'count') {
      scheduleReps(Math.max(0, st.reps - repRef.current), timeLeft * 1000, repRef.current);
      return;
    }
    const n = pickNext();
    if (n) playCombo(n, true);
  };

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || paused) return;
    const iv = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (phase === 'ready') {
          if (next > 0) blip();
          return Math.max(0, next);
        }
        if (phase === 'work' && next === 10) clapper();
        if (phase === 'rest' && next > 0 && next <= 3) blip();
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, paused]);

  useEffect(() => {
    if (paused || timeLeft > 0) return;
    if (phase === 'ready') {
      bell(3);
      setPhase('work');
      setTimeLeft(settings.roundSec);
      setRepCount(0);
      later(() => startCallouts(), 1200);
    } else if (phase === 'work') {
      clearTimers();
      hush();
      bell(1);
      setActiveCombo(null);
      setActiveIdx(-1);
      setGap(null);
      if (round >= settings.rounds) {
        setPhase('done');
        later(() => speak('운동 끝. 수고했어요'), 900);
        if (wakeRef.current) {
          try {
            wakeRef.current.release();
          } catch (e) {
            /* noop */
          }
          wakeRef.current = null;
        }
      } else {
        setPhase('rest');
        setTimeLeft(settings.restSec);
      }
    } else if (phase === 'rest') {
      bell(3);
      setRound((r) => r + 1);
      setPhase('work');
      setTimeLeft(settings.roundSec);
      setRepCount(0);
      later(() => startCallouts(), 1200);
    }
  }, [timeLeft, phase, paused]); // eslint-disable-line

  useEffect(
    () => () => {
      clearTimers();
      hush();
      clearTimeout(undoRef.current);
      clearTimeout(hiRef.current);
    },
    []
  );

  /* ---- 음성 입력 ---- */

  /* ---- 음성 입력 (보류) ----
     아래는 Web Speech API 기반 콤보 받아쓰기. 기획이 정리되면 되살린다.
     되살릴 때 필요한 것: listening / micError 상태, recogRef, 그리고 콤보 탭 입력창 옆 마이크 버튼.

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError('이 브라우저는 음성 입력을 지원하지 않아. Chrome을 써봐.'); return; }
    setMicError('');
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = false; r.interimResults = false;
    r.onresult = (e) => setDraft((p) => (p ? p + ' ' + e.results[0][0].transcript : e.results[0][0].transcript));
    r.onerror = (e) => { setMicError(e.error === 'not-allowed' ? '마이크 권한이 필요해.' : '인식에 실패했어. 다시 해봐.'); setListening(false); };
    r.onend = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    try { r.start(); } catch (e) { setListening(false); }
  };
  const unlisten = () => { if (recogRef.current) { try { recogRef.current.stop(); } catch (e) {} } setListening(false); };
  ---- */

  /* ---- 콤보 ---- */

  const removeChip = (idx) => {
    const kept = parsed.moves.filter((_, i) => i !== idx);
    setDraft([...kept.map((id) => label(id)), ...parsed.unknown].join(' '));
    setComboHint('');
  };

  const saveCombo = () => {
    if (!parsed.moves.length) {
      setComboHint(
        draft.trim()
          ? '적은 말을 못 알아들었어. 아래 목록에서 골라보거나, 호출어 탭에서 동작을 추가해줘.'
          : `먼저 콤보를 적어줘. 예: ${label('jab')} ${label('jab')} ${label('cross')} ${label('lowkick')}`
      );
      return;
    }
    if (dupCombo) {
      setComboHint(
        dupCombo.on ? '이미 같은 콤보가 있어. 아래 목록에서 확인해봐.' : '이미 같은 콤보가 있는데 훈련에서 빠져 있어.'
      );
      return;
    }
    setComboHint('');
    if (editingId) {
      setCombos((p) => p.map((c) => (c.id === editingId ? { ...c, moves: parsed.moves } : c)));
      setEditingId(null);
    } else {
      setCombos((p) => [{ id: uid(), moves: parsed.moves, on: true }, ...p]);
    }
    setDraft('');
  };

  const revealCombo = (id) => {
    setHighlightId(id);
    const el = cardRefs.current[id];
    if (el && el.scrollIntoView) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        el.scrollIntoView();
      }
    }
    clearTimeout(hiRef.current);
    hiRef.current = setTimeout(() => setHighlightId(null), 2400);
  };

  const removeCombo = (c) => {
    const index = combos.findIndex((x) => x.id === c.id);
    setCombos((p) => p.filter((x) => x.id !== c.id));
    setExpandedId(null);
    setUndo({
      kind: 'combo',
      text: `${c.moves.map((id) => label(id)).join(' ')} 지웠어`,
      combo: c,
      index: index < 0 ? 0 : index,
    });
    clearTimeout(undoRef.current);
    undoRef.current = setTimeout(() => setUndo(null), 6000);
  };

  const restoreUndo = () => {
    if (!undo) return;
    if (undo.kind === 'combo') {
      setCombos((p) => {
        const next = [...p];
        next.splice(Math.min(undo.index, next.length), 0, undo.combo);
        return next;
      });
    } else {
      setCustomMoves((p) => {
        const next = [...p];
        next.splice(Math.min(undo.index, next.length), 0, undo.move);
        return next;
      });
      setCombos(undo.prevCombos);
      if (undo.beat !== undefined) setBeats((p) => ({ ...p, [undo.move.id]: undo.beat }));
      if (undo.labelValue !== undefined) setLabels((p) => ({ ...p, [undo.move.id]: undo.labelValue }));
    }
    setUndo(null);
    clearTimeout(undoRef.current);
  };
  const editCombo = (c) => {
    setEditingId(c.id);
    setDraft(c.moves.map((id) => label(id)).join(' '));
    setTab('combos');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };
  const preview = (c) => {
    initAudio();
    hush();
    let t = 0;
    c.moves.forEach((mid) => {
      const m = moveMap[mid];
      if (!m) return;
      setTimeout(() => speakMove(mid), t);
      t += Math.round((beatOf(mid) * 1000) / settings.tempo);
    });
  };

  /* ---- 호출어 / 동작 ---- */

  const set = (k, v) => setSettings((p) => ({ ...p, [k]: v }));
  const setLabel = (id, v) => setLabels((p) => ({ ...p, [id]: v }));

  const applyNumbers = () => {
    const next = { ...labels };
    BASE_MOVES.forEach((m) => {
      if (m.numCall) next[m.id] = m.numCall;
    });
    setLabels(next);
  };
  const resetBaseLabels = () => {
    const next = {};
    Object.keys(labels).forEach((id) => {
      if (!BASE_MOVES.some((m) => m.id === id)) next[id] = labels[id];
    });
    setLabels(next);
    setBeats((p) => {
      const n = { ...p };
      BASE_MOVES.forEach((m) => {
        delete n[m.id];
      });
      return n;
    });
  };

  const addMove = () => {
    const name = newName.trim();
    if (!name) {
      setAddError('이름을 적어줘.');
      return;
    }
    if (alias[norm(name)]) {
      setAddError('이미 같은 말이 등록돼 있어.');
      return;
    }
    setAddError('');
    setCustomMoves((p) => [...p, { id: 'c_' + uid(), name, kind: newKind, beat: newBeat, aliases: [] }]);
    setNewName('');
    setWordKind(newKind);
    setAddOpen(false);
  };

  const renameMove = (id, v) => setCustomMoves((p) => p.map((m) => (m.id === id ? { ...m, name: v } : m)));
  const setMoveBeat = (id, b) => setBeats((p) => ({ ...p, [id]: b }));

  const deleteMove = (id) => {
    const move = customMoves.find((m) => m.id === id);
    if (!move) return;
    const index = customMoves.findIndex((m) => m.id === id);
    const prevCombos = combos;
    const affected = combos.filter((c) => c.moves.includes(id)).length;

    setCustomMoves((p) => p.filter((m) => m.id !== id));
    setCombos((p) =>
      p.map((c) => ({ ...c, moves: c.moves.filter((mid) => mid !== id) })).filter((c) => c.moves.length)
    );
    setBeats((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setLabels((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });

    setUndo({
      kind: 'move',
      text: affected ? `${move.name} 지웠어 · 콤보 ${affected}개에서 빠짐` : `${move.name} 지웠어`,
      move,
      index,
      prevCombos,
      beat: beats[id],
      labelValue: labels[id],
    });
    clearTimeout(undoRef.current);
    undoRef.current = setTimeout(() => setUndo(null), 6000);
  };

  /* ---------------- 렌더 ---------------- */

  const running = phase !== 'idle' && phase !== 'done';
  const ready = combos.filter((c) => c.on && c.moves.length).length;
  const status = { idle: '', ready: '준비', work: `라운드 ${round} / ${settings.rounds}`, rest: '휴식', done: '완료' }[
    phase
  ];
  const TABS = [
    ['train', '훈련', Timer],
    ['combos', '콤보', ListOrdered],
    ['words', '호출어', Megaphone],
  ];

  const modeInfo = MODES.find((m) => m.id === settings.mode) || MODES[0];
  const summary = [
    settings.mode === 'count' ? `횟수 ${settings.reps}번` : modeInfo.label,
    `${settings.rounds}라운드`,
    `${fmt(settings.roundSec)} / ${fmt(settings.restSec)}`,
  ].join(' · ');

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
@keyframes sc-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes sc-rise { from { transform: translateY(130%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes sc-blink { 0%, 55% { opacity: 1 } 56%, 100% { opacity: 0 } }
@keyframes sc-pop { from { transform: scale(.88); opacity: 0 } to { transform: scale(1); opacity: 1 } }
`}</style>
      <div className="max-w-sm mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6 h-9">
          <span className="text-sm text-zinc-600">쉐도우 코치</span>
          {tab === 'train' && (
            <button onClick={() => setSheetOpen(true)} aria-label="설정" className="p-2 -mr-2 text-zinc-600">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ---------- 훈련 ---------- */}
        {tab === 'train' && (
          <div className="pb-24">
            <Stopwatch
              seconds={phase === 'idle' ? settings.roundSec : timeLeft}
              total={
                phase === 'idle'
                  ? settings.roundSec
                  : phase === 'ready'
                    ? 5
                    : phase === 'rest'
                      ? settings.restSec
                      : settings.roundSec
              }
              status={status}
              dim={phase === 'idle' || paused}
            />

            <div className="min-h-20 mb-6">
              {gap ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-2 rounded-lg text-lg text-zinc-500 border border-dashed border-zinc-800 animate-pulse">
                      {gap.cue}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                    {gap.ms ? (
                      <div
                        className="h-full w-full bg-zinc-700"
                        style={{ transformOrigin: 'left', animation: `sc-fill ${gap.ms}ms linear forwards` }}
                      />
                    ) : (
                      <div className="h-full w-1/3 bg-zinc-800 animate-pulse" />
                    )}
                  </div>
                </div>
              ) : activeCombo ? (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {activeCombo.moves.map((mid, i) => {
                      const done = i < activeIdx;
                      const now = i === activeIdx;
                      return (
                        <span
                          key={i}
                          style={now ? { backgroundColor: ACCENT } : undefined}
                          className={`px-3 py-2 rounded-lg text-lg transition-transform duration-100 ${
                            now ? 'text-white font-semibold scale-110' : done ? 'text-zinc-800' : 'text-zinc-500'
                          }`}
                        >
                          {label(mid)}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex gap-1 h-2">
                    {activeCombo.moves.map((mid, i) => {
                      const m = moveMap[mid];
                      if (!m) return null;
                      const bt = beatOf(mid);
                      const ms = Math.round((bt * 1000) / settings.tempo);
                      return (
                        <div key={i} style={{ flexGrow: bt }} className="rounded-full bg-zinc-900 overflow-hidden">
                          {i < activeIdx && (
                            <div className="h-full w-full" style={{ backgroundColor: ACCENT, opacity: 0.3 }} />
                          )}
                          {i === activeIdx && (
                            <div
                              className="h-full w-full"
                              style={{
                                backgroundColor: ACCENT,
                                transformOrigin: 'left',
                                animation: `sc-fill ${ms}ms linear forwards`,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {settings.mode === 'count' && (
                    <div className="text-xs text-zinc-600 mt-3 tabular-nums">
                      {repCount} / {settings.reps}회
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">
                  {phase === 'rest'
                    ? '숨 고르고 물 마셔.'
                    : phase === 'done'
                      ? '전부 끝났어. 잘했어.'
                      : phase === 'ready'
                        ? '스탠스 잡고 대기.'
                        : settings.mode === 'none'
                          ? '호출 없이 타이머만 돌아가.'
                          : `콤보 ${ready}개 준비됨.`}
                </p>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              {!running ? (
                <button
                  onClick={start}
                  style={{ backgroundColor: ACCENT }}
                  className="flex-1 flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-4"
                >
                  <Play className="w-5 h-5" /> 시작
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 rounded-xl py-4 text-sm"
                  >
                    {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {paused ? '재개' : '일시정지'}
                  </button>
                  {settings.mode !== 'none' && (
                    <button onClick={skip} aria-label="다음 콤보" className="px-5 bg-zinc-800 rounded-xl">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={stop} aria-label="정지" className="px-5 bg-zinc-800 text-zinc-400 rounded-xl">
                    <Square className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {startError && (
              <p className="text-xs text-white bg-zinc-900 rounded-lg px-3 py-3 mb-3 leading-relaxed">{startError}</p>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setSheetOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-300"
              >
                {summary}
                <ChevronUp className="w-4 h-4 text-zinc-600" />
              </button>
            </div>
          </div>
        )}

        {/* ---------- 콤보 ---------- */}
        {tab === 'combos' && (
          <div>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setComboHint('');
              }}
              placeholder={`${label('jab')} ${label('jab')} ${label('cross')} ${label('lowkick')}`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-base placeholder-zinc-700 mb-3"
            />

            {!draft.trim() && (
              <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
                {`${label('jab')}${label('jab')}${label('cross')}`} ·{' '}
                {`${label('jab')},${label('jab')},${label('cross')}`} ·{' '}
                {`${label('jab')} ${label('jab')} ${label('cross')}`} · 1-2
                <br />
                붙여 써도, 쉼표를 찍어도, 번호로 써도 다 같게 인식해.
              </p>
            )}

            {comboHint && (
              <p className="text-xs text-white bg-zinc-900 rounded-lg px-3 py-3 mb-3 leading-relaxed">{comboHint}</p>
            )}

            {parsed.moves.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1 mb-2">
                  {parsed.moves.map((mid, i) => (
                    <button
                      key={i}
                      onClick={() => removeChip(i)}
                      aria-label={`${label(mid)} 지우기`}
                      style={{ backgroundColor: ACCENT }}
                      className="flex items-center gap-1 pl-2 pr-1 py-1 text-white rounded text-xs font-medium"
                    >
                      {label(mid)}
                      <X className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600">칩을 눌러서 뺄 수 있어.</p>
              </div>
            )}

            {dupCombo && (
              <div className="mb-3 bg-zinc-900 rounded-lg px-3 py-3">
                <p className="text-xs text-white leading-relaxed mb-2">
                  {dupCombo.on ? '이미 저장된 콤보야.' : '이미 저장돼 있는데 훈련에서 빠져 있어.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => revealCombo(dupCombo.id)}
                    className="px-3 py-2 rounded-lg text-xs text-zinc-300 bg-zinc-800"
                  >
                    목록에서 보기
                  </button>
                  {!dupCombo.on && (
                    <button
                      onClick={() => {
                        setCombos((p) => p.map((c) => (c.id === dupCombo.id ? { ...c, on: true } : c)));
                        setDraft('');
                        setComboHint('');
                        revealCombo(dupCombo.id);
                      }}
                      style={{ backgroundColor: ACCENT }}
                      className="px-3 py-2 rounded-lg text-xs text-white font-medium"
                    >
                      훈련에 다시 넣기
                    </button>
                  )}
                </div>
              </div>
            )}
            {parsed.unknown.length > 0 && (
              <p className="text-xs text-white mb-3">
                못 알아들음: {parsed.unknown.join(', ')} — 호출어 탭에서 추가할 수 있어.
              </p>
            )}

            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center justify-center gap-2 mb-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300"
            >
              <LayoutGrid className="w-4 h-4" />
              목록에서 고르기
            </button>

            {combos.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-600">
                  콤보 {combos.length}개 · {ready}개 사용
                </span>
                <button
                  onClick={() => {
                    const allOn = combos.every((c) => c.on);
                    setCombos((p) => p.map((c) => ({ ...c, on: !allOn })));
                  }}
                  className="text-xs text-zinc-500 px-3 py-2"
                >
                  {combos.every((c) => c.on) ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            )}

            <div className={`space-y-2 ${saveFabShown ? 'pb-48' : 'pb-32'}`}>
              {combos.length === 0 && <p className="text-sm text-zinc-700 py-8">아직 콤보가 없어.</p>}
              {combos.map((c) => {
                const open = expandedId === c.id;
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-zinc-900 border transition-shadow duration-200"
                    ref={(el) => {
                      cardRefs.current[c.id] = el;
                    }}
                    style={{
                      borderColor: c.on ? ACCENT : '#27272a',
                      boxShadow: highlightId === c.id ? `0 0 0 2px ${ACCENT}` : undefined,
                    }}
                  >
                    <div className="flex items-stretch">
                      <button
                        onClick={() => setCombos((p) => p.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)))}
                        aria-label={c.on ? '훈련에서 빼기' : '훈련에 넣기'}
                        className="flex-1 min-w-0 flex items-start gap-3 text-left px-4 py-4"
                      >
                        {' '}
                        <span
                          style={c.on ? { backgroundColor: ACCENT } : undefined}
                          className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center ${
                            c.on ? '' : 'border border-zinc-700'
                          }`}
                        >
                          {c.on && <Check className="w-4 h-4 text-white" />}
                        </span>
                        <span className="flex flex-wrap gap-1 min-w-0">
                          {c.moves.map((mid, i) => (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded text-sm ${
                                c.on ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 text-zinc-700'
                              }`}
                            >
                              {label(mid)}
                            </span>
                          ))}
                        </span>
                      </button>

                      <button
                        onClick={() => setExpandedId(open ? null : c.id)}
                        aria-label={open ? '메뉴 닫기' : '더보기'}
                        className="px-4 flex items-center text-zinc-600"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {open && (
                      <div className="flex border-t border-zinc-800">
                        <CardAction icon={Volume2} label="듣기" onClick={() => preview(c)} />
                        <CardAction
                          icon={Pencil}
                          label="수정"
                          onClick={() => {
                            setExpandedId(null);
                            editCombo(c);
                          }}
                        />
                        <CardAction icon={Trash2} label="삭제" onClick={() => removeCombo(c)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- 호출어 ---------- */}
        {tab === 'words' && (
          <div>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
              코치가 뭐라고 부를지 정해. 여기서 정한 말은 콤보를 적을 때도 그대로 인식돼.
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={applyNumbers}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300"
              >
                번호로 일괄 변경
              </button>
              <button
                onClick={resetBaseLabels}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> 기본으로
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 mb-2">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setWordKind(k);
                    setEditingMoveId(null);
                  }}
                  style={wordKind === k ? { backgroundColor: ACCENT } : undefined}
                  className={`py-2 rounded-lg text-sm ${
                    wordKind === k ? 'text-white font-medium' : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>

            <div className="pb-40">
              {[...BASE_MOVES, ...customMoves]
                .filter((m) => m.kind === wordKind)
                .map((m) => {
                  const isCustom = !BASE_MOVES.some((b) => b.id === m.id);
                  const changed = !isCustom && labels[m.id] && labels[m.id].trim() && labels[m.id].trim() !== m.name;
                  const open = editingMoveId === m.id;

                  if (!open) {
                    return (
                      <button
                        key={m.id}
                        onClick={() => setEditingMoveId(m.id)}
                        className="w-full flex items-center gap-3 py-4 border-b border-zinc-900 text-left"
                      >
                        <span className="flex-1 min-w-0 text-base truncate">{label(m.id)}</span>
                        <span className="text-xs text-zinc-700 shrink-0">{beatName(beatOf(m.id))}</span>
                        {isCustom && <span className="text-xs text-zinc-700 shrink-0">직접 추가</span>}
                        <Pencil className="w-4 h-4 text-zinc-700 shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <div key={m.id} className="py-3 border-b border-zinc-900">
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          autoFocus
                          value={isCustom ? m.name : labels[m.id] || ''}
                          placeholder={m.name}
                          onChange={(e) =>
                            isCustom ? renameMove(m.id, e.target.value) : setLabel(m.id, e.target.value)
                          }
                          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-base placeholder-zinc-700"
                        />
                        <button
                          onClick={() => {
                            initAudio();
                            speakMove(m.id);
                          }}
                          aria-label={`${label(m.id)} 들어보기`}
                          className="shrink-0 w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingMoveId(null)}
                          aria-label="편집 닫기"
                          style={{ backgroundColor: ACCENT }}
                          className="shrink-0 w-11 h-11 rounded-lg text-white flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-zinc-500 mb-2">동작 길이</div>
                      <div className="grid grid-cols-5 gap-1 mb-3">
                        {BEAT_OPTIONS.map(([l, v]) => (
                          <button
                            key={l}
                            onClick={() => setMoveBeat(m.id, v)}
                            style={beatOf(m.id) === v ? { backgroundColor: ACCENT } : undefined}
                            className={`py-2 rounded-lg text-xs ${
                              beatOf(m.id) === v ? 'text-white font-medium' : 'bg-zinc-900 text-zinc-500'
                            }`}
                          >
                            {l.replace(' ', '')}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-700 truncate">
                          {isCustom ? '직접 추가한 동작' : `기본 ${m.name} · ${beatName(m.beat)}`}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {(changed || beats[m.id] !== undefined) && (
                            <button
                              onClick={() => {
                                if (!isCustom) setLabel(m.id, '');
                                setBeats((p) => {
                                  const n = { ...p };
                                  delete n[m.id];
                                  return n;
                                });
                              }}
                              aria-label="기본값으로"
                              className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {isCustom && (
                            <button
                              onClick={() => {
                                deleteMove(m.id);
                                setEditingMoveId(null);
                              }}
                              aria-label="동작 삭제"
                              className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-40 px-5 pb-4 pointer-events-none">
        <div className="flex justify-center">
          <div className="inline-flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1 pointer-events-auto">
            {TABS.map(([k, l, Icon]) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k);
                  setUndo(null);
                  clearTimeout(undoRef.current);
                }}
                aria-label={l}
                style={tab === k ? { backgroundColor: ACCENT } : undefined}
                className={`flex flex-col items-center gap-1.5 px-6 py-1.5 rounded-xl transition-colors duration-150 ${
                  tab === k ? 'text-white' : 'text-zinc-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {undo && tab !== 'train' && (
        <div
          className={`fixed left-0 right-0 bottom-0 z-40 px-5 pointer-events-none ${anyFabShown ? 'pb-40' : 'pb-24'}`}
        >
          <div
            className="max-w-sm mx-auto flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pointer-events-auto"
            style={{ animation: 'sc-rise 240ms cubic-bezier(.2,.8,.2,1)' }}
          >
            <span className="flex-1 min-w-0 text-xs text-zinc-400 truncate">{undo.text}</span>
            <button
              onClick={restoreUndo}
              style={{ backgroundColor: ACCENT }}
              className="shrink-0 px-3 py-2 rounded-lg text-xs text-white font-medium"
            >
              되돌리기
            </button>
          </div>
        </div>
      )}

      {tab === 'combos' && (
        <div className="fixed left-0 right-0 bottom-0 z-30 px-5 pb-24 pointer-events-none">
          <div
            className="max-w-sm mx-auto flex justify-center items-center gap-2 transition-all duration-200"
            style={{
              transform: saveFabShown ? 'translateY(0)' : 'translateY(180%)',
              opacity: saveFabShown ? 1 : 0,
            }}
          >
            {editingId && (
              <button
                onClick={cancelEdit}
                aria-label="수정 취소"
                className="pointer-events-auto w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={saveCombo}
              tabIndex={saveFabShown ? 0 : -1}
              style={canSave ? { backgroundColor: ACCENT } : undefined}
              className={`pointer-events-auto flex items-center gap-2 px-8 h-14 rounded-full font-semibold transition-colors duration-200 ${
                canSave ? 'text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
              }`}
            >
              {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? '수정 저장' : '콤보 저장'}
            </button>
          </div>
        </div>
      )}

      {tab === 'words' && (
        <div className="fixed left-0 right-0 bottom-0 z-30 px-5 pb-24 pointer-events-none">
          <div className="max-w-sm mx-auto flex justify-end">
            <button
              onClick={() => {
                setAddOpen(true);
                setAddError('');
              }}
              aria-label="동작 추가"
              style={{ backgroundColor: ACCENT }}
              className="pointer-events-auto w-14 h-14 rounded-full text-white flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ animation: 'sc-rise 220ms cubic-bezier(.2,.8,.2,1)' }}
        >
          <div className="shrink-0 px-5 pt-5 pb-3">
            <div className="max-w-sm mx-auto flex items-center justify-between">
              <span className="text-sm font-medium">동작 추가</span>
              <button onClick={() => setAddOpen(false)} aria-label="닫기" className="p-2 -mr-2 text-zinc-500">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-44">
            <div className="max-w-sm mx-auto space-y-6">
              <div>
                <div className="text-xs text-zinc-500 mb-2">뭐라고 부를까</div>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setAddError('');
                  }}
                  placeholder="엘보, 스핀킥, 관장님이 쓰는 말…"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-base placeholder-zinc-700"
                />
                {addError && <p className="text-xs text-white mt-2">{addError}</p>}
              </div>

              <div>
                <div className="text-xs text-zinc-500 mb-2">분류</div>
                <div className="grid grid-cols-4 gap-1">
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setNewKind(k)}
                      style={newKind === k ? { backgroundColor: ACCENT } : undefined}
                      className={`py-3 rounded-lg text-sm ${
                        newKind === k ? 'text-white font-medium' : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-500 mb-2">동작 길이</div>
                <div className="grid grid-cols-5 gap-1">
                  {BEAT_OPTIONS.map(([l, v]) => (
                    <button
                      key={l}
                      onClick={() => setNewBeat(v)}
                      style={newBeat === v ? { backgroundColor: ACCENT } : undefined}
                      className={`py-3 rounded-lg text-xs ${
                        newBeat === v ? 'text-white font-medium' : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {l.replace(' ', '')}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-2">이 동작에 주어지는 시간이야. 킥처럼 오래 걸리면 길게.</p>
              </div>
            </div>
          </div>

          <div className="absolute left-0 right-0 bottom-0 px-5 pb-6 pointer-events-none">
            <div className="max-w-sm mx-auto flex justify-center">
              <button
                onClick={addMove}
                style={newName.trim() ? { backgroundColor: ACCENT } : undefined}
                className={`pointer-events-auto flex items-center gap-2 px-8 h-14 rounded-full text-sm font-semibold transition-colors duration-200 ${
                  newName.trim() ? 'text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                }`}
              >
                <Plus className="w-5 h-5" />
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ animation: 'sc-rise 280ms cubic-bezier(.2,.8,.2,1)' }}
        >
          <div className="flex-1 overflow-y-auto px-5 pt-16 pb-40">
            <div className="max-w-sm mx-auto">
              <div style={{ animation: 'sc-pop 420ms cubic-bezier(.2,.9,.3,1)' }}>
                <div className="font-mono text-xs tracking-widest text-zinc-500 mb-3">STAGE CLEAR</div>
                <div className="text-5xl font-semibold tracking-tight mb-3">수고했어</div>
                <div className="text-sm text-zinc-500 mb-10">오늘 몫은 다 했어.</div>
              </div>

              <div className="space-y-4 mb-10">
                <StatRow label="라운드" value={settings.rounds} suffix="R" />
                <StatRow label="운동 시간" value={settings.rounds * settings.roundSec} format={fmt} />
                <StatRow label="콤보" value={stats.combos} suffix="회" />
                <StatRow label="동작" value={stats.moves} suffix="개" />
              </div>

              <div
                className="font-mono text-sm tracking-widest text-white"
                style={{ animation: 'sc-blink 1.1s step-end infinite' }}
              >
                TO BE CONTINUED...
              </div>
            </div>
          </div>

          <div className="absolute left-0 right-0 bottom-0 px-5 pb-6 pointer-events-none">
            <div className="max-w-sm mx-auto flex gap-2">
              <button
                onClick={start}
                style={{ backgroundColor: ACCENT }}
                className="pointer-events-auto flex-1 flex items-center justify-center gap-2 text-white font-semibold rounded-full h-14"
              >
                <RotateCcw className="w-5 h-5" /> 한 번 더
              </button>
              <button
                onClick={stop}
                className="pointer-events-auto px-6 h-14 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-sm"
              >
                그만하기
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ animation: 'sc-rise 220ms cubic-bezier(.2,.8,.2,1)' }}
        >
          <div className="shrink-0 px-5 pt-5 pb-3">
            <div className="max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">동작 고르기</span>
                <button onClick={() => setPickerOpen(false)} aria-label="닫기" className="p-2 -mr-2 text-zinc-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setPickerKind(k)}
                    style={pickerKind === k ? { backgroundColor: ACCENT } : undefined}
                    className={`py-2 rounded-lg text-sm ${
                      pickerKind === k ? 'text-white font-medium' : 'bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pt-2 pb-44">
            <div className="max-w-sm mx-auto grid grid-cols-2 gap-2">
              {[...BASE_MOVES, ...customMoves]
                .filter((m) => m.kind === pickerKind)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setDraft((p) => (p ? p + ' ' + label(m.id) : label(m.id)));
                      setComboHint('');
                    }}
                    className="py-4 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200"
                  >
                    {label(m.id)}
                  </button>
                ))}
            </div>
          </div>

          <div className="absolute left-0 right-0 bottom-0 px-5 pb-6 pointer-events-none">
            <div className="max-w-sm mx-auto">
              {parsed.moves.length > 0 ? (
                <div className="pointer-events-auto flex flex-wrap gap-1 mb-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3">
                  {parsed.moves.map((mid, i) => (
                    <button
                      key={i}
                      onClick={() => removeChip(i)}
                      aria-label={`${label(mid)} 지우기`}
                      style={{ backgroundColor: ACCENT }}
                      className="flex items-center gap-1 pl-2 pr-1 py-1 text-white rounded text-xs font-medium"
                    >
                      {label(mid)}
                      <X className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pointer-events-auto mb-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3">
                  <p className="text-xs text-zinc-600">동작을 눌러서 순서대로 쌓아봐.</p>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={() => setPickerOpen(false)}
                  style={parsed.moves.length ? { backgroundColor: ACCENT } : undefined}
                  className={`pointer-events-auto flex items-center gap-2 px-8 h-14 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    parsed.moves.length ? 'text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sheetOpen && (
        <>
          <div
            onClick={closeSheet}
            aria-hidden="true"
            style={{ opacity: sheetIn ? 1 : 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-70 transition-opacity duration-200"
          />

          <div
            role="dialog"
            aria-label="훈련 설정"
            style={{ maxHeight: '86vh', transform: sheetIn ? 'translateY(0)' : 'translateY(100%)' }}
            className="fixed left-0 right-0 bottom-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl transition-transform duration-200 flex flex-col"
          >
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <span className="text-sm font-medium">훈련 설정</span>
              <button onClick={closeSheet} aria-label="닫기" className="p-2 -mr-2 text-zinc-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-8">
              <div className="max-w-sm mx-auto space-y-7">
                {running && (
                  <p className="text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2 leading-relaxed">
                    훈련 중이라 모드와 라운드는 잠겨 있어. 템포와 목소리는 지금 바꿔도 바로 반영돼.
                  </p>
                )}

                <div>
                  <div className="text-xs text-zinc-500 mb-2">모드</div>
                  <div className="grid grid-cols-4 gap-1">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => set('mode', m.id)}
                        disabled={running}
                        style={settings.mode === m.id ? { backgroundColor: ACCENT } : undefined}
                        className={`py-3 rounded-lg text-sm ${
                          settings.mode === m.id ? 'text-white font-medium' : 'bg-zinc-900 text-zinc-500'
                        } ${running ? 'opacity-40' : ''}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">{modeInfo.hint}</p>
                </div>

                <div className="space-y-5">
                  <Stepper
                    label="라운드"
                    value={settings.rounds}
                    suffix="회"
                    disabled={running}
                    onChange={(v) => set('rounds', v)}
                    min={1}
                    max={20}
                  />

                  {settings.mode === 'count' && (
                    <Stepper
                      label="라운드당 호출"
                      value={settings.reps}
                      suffix="번"
                      disabled={running}
                      onChange={(v) => set('reps', v)}
                      min={1}
                      max={60}
                    />
                  )}

                  <Stepper
                    label="라운드 시간"
                    value={settings.roundSec}
                    format={fmt}
                    disabled={running}
                    onChange={(v) => set('roundSec', v)}
                    min={30}
                    max={600}
                    step={15}
                  />

                  <Stepper
                    label="휴식"
                    value={settings.restSec}
                    format={fmt}
                    disabled={running}
                    onChange={(v) => set('restSec', v)}
                    min={10}
                    max={300}
                    step={10}
                  />
                </div>

                <div className="pt-6 border-t border-zinc-900 space-y-6">
                  <Slider
                    label="템포"
                    hint={`${settings.tempo.toFixed(2)}배`}
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={settings.tempo}
                    onChange={(v) => set('tempo', v)}
                  />
                  <Slider
                    label="콤보 간격"
                    hint={`${settings.gap.toFixed(1)}초`}
                    min={0.5}
                    max={6}
                    step={0.1}
                    value={settings.gap}
                    onChange={(v) => set('gap', v)}
                  />
                  <Row label="간격을 불규칙하게">
                    <input
                      type="checkbox"
                      checked={settings.randomGap}
                      onChange={(e) => set('randomGap', e.target.checked)}
                      style={{ accentColor: ACCENT }}
                      className="w-5 h-5"
                    />
                  </Row>
                </div>

                <div className="pt-6 border-t border-zinc-900 space-y-6">
                  {voices.length > 0 && (
                    <select
                      value={settings.voiceURI}
                      onChange={(e) => set('voiceURI', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-sm"
                    >
                      <option value="">기본 한국어 음성</option>
                      {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Slider
                    label="말 속도"
                    hint={settings.rate.toFixed(2)}
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={settings.rate}
                    onChange={(v) => set('rate', v)}
                  />
                  <button
                    onClick={() => {
                      initAudio();
                      speak(`${label('jab')} ${label('cross')} ${label('lowkick')}`);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 text-xs text-zinc-400"
                  >
                    소리 테스트
                  </button>
                </div>

                <button
                  onClick={closeSheet}
                  style={{ backgroundColor: ACCENT }}
                  className="w-full text-white font-semibold rounded-xl py-4 text-sm"
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- 작은 조각 ---------------- */

function Slider({ label, hint, value, onChange, min, max, step }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-600 tabular-nums">{hint}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ accentColor: ACCENT }}
        className="w-full"
      />
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      {children}
    </div>
  );
}

function StatRow({ label, value, suffix = '', format }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
    const cancel = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout;
    let id;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = raf(tick);
    };
    id = raf(tick);
    return () => cancel(id);
  }, [value]);

  return (
    <div className="flex items-baseline justify-between border-b border-zinc-900 pb-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="font-mono text-3xl tabular-nums" style={{ color: '#ffffff' }}>
        {format ? format(n) : n}
        {suffix && <span className="text-base text-zinc-600 ml-1">{suffix}</span>}
      </span>
    </div>
  );
}

function Stopwatch({ seconds, total, status, dim }) {
  const R = 116;
  const C = 2 * Math.PI * R;
  const ratio = total > 0 ? Math.min(1, Math.max(0, seconds / total)) : 0;

  return (
    <div className="relative w-72 h-72 mx-auto mb-6">
      <svg viewBox="0 0 264 264" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="132" cy="132" r={R} fill="none" stroke="#18181b" strokeWidth="8" />
        <circle
          cx="132"
          cy="132"
          r={R}
          fill="none"
          stroke={ACCENT}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          opacity={dim ? 0.3 : 1}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-6xl font-light tabular-nums tracking-tighter leading-none ${
            dim ? 'text-zinc-500' : 'text-white'
          }`}
        >
          {fmt(seconds)}
        </span>
      </div>

      {status && (
        <div className="absolute inset-x-0 top-0 flex justify-center" style={{ paddingTop: '30%' }}>
          <span className="text-xs text-zinc-500 leading-none">{status}</span>
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, min, max, step = 1, suffix = '', format, disabled }) {
  const btn = `w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center ${
    disabled ? 'text-zinc-700' : 'text-zinc-300'
  }`;
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={disabled}
          aria-label={`${label} 줄이기`}
          className={btn}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-20 text-center text-lg tabular-nums">{format ? format(value) : `${value}${suffix}`}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={disabled}
          aria-label={`${label} 늘리기`}
          className={btn}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="flex gap-1">
      {options.map(([v, l]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          style={value === v ? { backgroundColor: ACCENT } : undefined}
          className={`px-3 py-2 rounded-md text-xs ${value === v ? 'text-white' : 'text-zinc-500'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function CardAction({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs ${
        danger ? 'text-white font-medium' : 'text-zinc-400'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
