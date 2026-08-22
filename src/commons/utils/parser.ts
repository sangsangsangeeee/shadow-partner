import { BASE_MOVES, NUM_WORDS } from '../constants/moves';
import type { AliasMap, Labels, Move } from '../types';

export const norm = (s: string | number | null | undefined): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');

/* ---------------- 별칭 사전 ---------------- */

export function buildAlias(customMoves: Move[], labels: Labels): AliasMap {
  const map: AliasMap = {};
  const add = (key: string | null | undefined, id: string) => {
    if (key) map[norm(key)] = id;
  };

  BASE_MOVES.forEach((m) => {
    [m.name, ...(m.aliases ?? []), m.num, m.numCall].forEach((k) => add(k, m.id));
  });
  NUM_WORDS.forEach(({ word, num }) => {
    const found = BASE_MOVES.find((m) => m.num === num);
    if (found) add(word, found.id);
  });
  customMoves.forEach((m) => {
    add(m.name, m.id);
    (m.aliases ?? []).forEach((a) => add(a, m.id));
  });
  Object.keys(labels).forEach((id) => {
    const v = labels[id];
    if (v && v.trim()) add(v, id);
  });
  return map;
}

/* ---------------- 파서 ---------------- */

/** 띄어쓰기 없는 토큰을 앞에서부터 긴 쪽 우선으로 쪼갠다. 하나라도 못 쪼개면 실패. */
function consumeGreedy(str: string, alias: AliasMap): string[] | null {
  const out: string[] = [];
  let i = 0;
  while (i < str.length) {
    let matched: { id: string; len: number } | null = null;
    for (let len = Math.min(8, str.length - i); len >= 1; len--) {
      const hit = alias[str.slice(i, i + len)];
      if (hit) {
        matched = { id: hit, len };
        break;
      }
    }
    if (!matched) return null;
    out.push(matched.id);
    i += matched.len;
  }
  return out;
}

const KO_COUNT: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };

export interface ParseResult {
  moves: string[];
  unknown: string[];
}

export function parseCombo(text: string, alias: AliasMap): ParseResult {
  const moves: string[] = [];
  const unknown: string[] = [];
  if (!text) return { moves, unknown };

  const s = String(text)
    .toLowerCase()
    .replace(/[-–—,/>·|+&]/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/(더블|트리플|double|triple)(?=\S)/g, '$1 ')
    .replace(/([^\s×x*])([×x*]\d+)/g, '$1 $2')
    .replace(/([^\s\d])(\d+)(번|회)/g, '$1 $2$3')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = s.split(' ').filter(Boolean).map(norm);

  let pendingRepeat = 0;
  const push = (id: string | undefined) => {
    if (!id) return;
    const times = pendingRepeat > 0 ? pendingRepeat : 1;
    for (let k = 0; k < times; k++) moves.push(id);
    pendingRepeat = 0;
  };
  const repeatLast = (n: number) => {
    const last = moves[moves.length - 1];
    if (!last) return;
    for (let k = 1; k < n; k++) moves.push(last);
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === undefined) break;

    // 1. 반복 지시어 — 뒤 동작에 적용
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

    // 2. 반복 수량 — 앞 동작에 적용
    const rep = t.match(/^[x×*](\d+)$/) ?? t.match(/^(\d+)(번|회)$/);
    if (rep && moves.length) {
      repeatLast(parseInt(rep[1] ?? '1', 10));
      i += 1;
      continue;
    }
    const koRep = t.match(/^(한|두|세|네|다섯)(번|회)$/);
    if (koRep && moves.length) {
      repeatLast(KO_COUNT[koRep[1] ?? ''] ?? 1);
      i += 1;
      continue;
    }

    // 3. 공백을 넘어 이어지는 이름을 먼저 본다. 긴 쪽이 이긴다.
    let joined = false;
    for (let span = Math.min(4, tokens.length - i); span >= 2; span -= 1) {
      const key = tokens.slice(i, i + span).join('');
      const hit = alias[key];
      if (hit) {
        push(hit);
        i += span;
        joined = true;
        break;
      }
    }
    if (joined) continue;

    // 4. 숫자 나열
    if (/^[1-6]{2,}$/.test(t)) {
      t.split('').forEach((d) => push(alias[d]));
      i += 1;
      continue;
    }

    // 5. 토큰 단독 일치
    const direct = alias[t];
    if (direct) {
      push(direct);
      i += 1;
      continue;
    }

    // 6. 토큰 내부 탐욕 분해
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
