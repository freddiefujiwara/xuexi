// 異常系：xuexi-gas /exec の返却が崩れていた場合に、整形層が
// 例外を投げずに「使えるものだけ使う」形へ倒れることを固定する。
// fetchSection は配列かどうかしか見ないため、要素の null や型違いは
// そのまま各 lib に届く前提で試験する。
import { describe, it, expect, vi } from 'vitest';
import { fetchSection } from '../src/lib/data.js';
import { selectDailyCards } from '../src/lib/select.js';
import {
  answersMatch,
  buildSession,
  makeChoice,
  normalizeAnswer as normalizeExerciseAnswer,
} from '../src/lib/exercises.js';
import {
  filterByLevel,
  judgeWord,
  normalizeAnswer as normalizeVocabAnswer,
  pickWords,
  stripTones,
} from '../src/lib/vocab.js';
import { buildCalendar, decodeTransfer, encodeTransfer } from '../src/lib/study.js';
import { pool } from './fixtures.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('fetchSection：ペイロード自体が崩れている', () => {
  it('JSON が null / undefined でも例外にせず空の rows を返す', async () => {
    for (const payload of [null, undefined]) {
      const fetcher = vi.fn(async () => ({ ok: true, json: async () => payload }));
      const result = await fetchSection('cards', { storage: fakeStorage(), fetcher });
      expect(result.rows).toEqual([]);
      expect(result.fromCache).toBe(false);
    }
  });

  it('セクションが配列でなければ空、要素の null はそのまま通す（整形側で捌く）', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ cards: [pool[0], null], generatedAt: 'g1' }),
    }));
    const result = await fetchSection('cards', { storage: fakeStorage(), fetcher });
    expect(result.rows).toEqual([pool[0], null]);
  });
});

describe('selectDailyCards：カード配列に壊れた要素が混ざる', () => {
  it('null や文字列の要素は無視し、実在するカードだけから選ぶ', () => {
    const picked = selectDailyCards([pool[0], null, 'junk', undefined, pool[1]], { random: () => 0 });
    expect(picked.length).toBe(2);
    expect(picked.every((c) => c && typeof c === 'object')).toBe(true);
    expect(new Set(picked.map((c) => c.id))).toEqual(new Set(['c1', 'c2']));
  });
});

describe('buildSession / makeChoice：カードやプールが崩れている', () => {
  it('null のカードはセッションから落とし、残りで組み立てる', () => {
    const session = buildSession([pool[0], null, pool[1]], pool, () => 0);
    expect(session).toHaveLength(2);
    expect(session.every((q) => q.card && typeof q.card === 'object')).toBe(true);
  });

  it('cards が配列でなければ空セッション', () => {
    expect(buildSession(null, pool)).toEqual([]);
    expect(buildSession(undefined, pool)).toEqual([]);
  });

  it('プールに null が混ざっても選択問題を作れる', () => {
    const q = makeChoice(pool[0], [null, pool[1], undefined, pool[2]], () => 0);
    expect(q.type).toBe('choice');
    expect(q.options).toContain(q.answer);
    expect(q.options.every((o) => typeof o === 'string')).toBe(true);
  });

  it('誤答の材料が無ければ選択問題を諦めてカード形式に倒す', () => {
    // pool[4] は数字・時間・主語の差し替え材料を持たず、プールも null だけ。
    const q = makeChoice(pool[4], [null], () => 0);
    expect(q.type).toBe('card');
  });
});

describe('normalizeAnswer / answersMatch：文字列化できない値', () => {
  it('toString が関数でないオブジェクトでも例外にせず空として扱う', () => {
    expect(normalizeExerciseAnswer({ toString: [] })).toBe('');
    expect(normalizeExerciseAnswer({ toString: 42 })).toBe('');
    expect(answersMatch({ toString: [] }, '得很快')).toBe(false);
    expect(answersMatch('得很快', { toString: [] })).toBe(false);
  });

  it('数値はその文字列表現として扱う', () => {
    expect(normalizeExerciseAnswer(42)).toBe('42');
    expect(answersMatch(42, '42')).toBe(true);
  });
});

describe('vocab の正規化：非文字列の入力・単語', () => {
  it('数値でも例外にせず文字列表現で正規化する', () => {
    expect(normalizeVocabAnswer(42)).toBe('42');
    expect(stripTones(42)).toBe('42');
    expect(normalizeVocabAnswer({ toString: [] })).toBe('');
  });

  it('zh が数値の単語でも判定できる（ピンインで正解になる）', () => {
    const word = { id: 'w1', zh: 3, pinyin: 'sān', ja: '三' };
    expect(judgeWord('sān', word, [])).toBe(true);
    expect(judgeWord('3', word, [])).toBe(true);
    expect(judgeWord('sì', word, [])).toBe(false);
  });

  it('数値の入力は例外にせず文字列として判定する', () => {
    const word = { id: 'w1', zh: '猫', pinyin: 'māo', ja: '猫' };
    expect(judgeWord(42, word, [])).toBe(false);
  });

  it('allWords に null が混ざっても他の同訳語で判定できる', () => {
    const word = { id: 'w1', zh: '猫', pinyin: 'māo', ja: '猫' };
    const same = { id: 'w2', zh: 'ねこ', pinyin: 'neko', ja: '猫' };
    expect(judgeWord('ねこ', word, [null, same, undefined])).toBe(true);
    expect(judgeWord('犬', word, [null])).toBe(false);
  });
});

describe('filterByLevel / pickWords：単語配列が崩れている', () => {
  it('配列でなければ空を返す', () => {
    expect(filterByLevel(null, 2)).toEqual([]);
    expect(filterByLevel('words', 2)).toEqual([]);
    expect(pickWords(null)).toEqual([]);
    expect(pickWords(undefined)).toEqual([]);
  });

  it('null の要素は無視し、レベルの型が違っても数値として比べる', () => {
    const words = [null, { id: 'w1', level: '2' }, { id: 'w2', level: 2 }, { id: 'w3', level: 1 }];
    expect(filterByLevel(words, 2).map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(pickWords(words, 2, () => 0)).toHaveLength(2);
  });
});

describe('buildCalendar：日次集計が無い・崩れている', () => {
  it('byDate が null / undefined でも全日 0 のカレンダーを返す', () => {
    for (const byDate of [null, undefined]) {
      const cells = buildCalendar(2026, 11, byDate);
      expect(cells.length % 7).toBe(0);
      const days = cells.filter(Boolean);
      expect(days).toHaveLength(30);
      expect(days.every((c) => c.seconds === 0 && c.level === 0)).toBe(true);
    }
  });
});

describe('encodeTransfer：実施日に数値が混ざる', () => {
  it('例外にせず、数値の日付も往復できる形にする', () => {
    const encoded = encodeTransfer({ '2026-11-01': 600 }, [20261102, '2026-11-03']);
    const decoded = decodeTransfer(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded.log).toEqual({ '2026-11-01': 600 });
    expect(decoded.done).toEqual(['2026-11-02', '2026-11-03']);
  });
});
