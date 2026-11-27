// プロパティベース（fast-check）：生成した入力に対して常に成り立つ性質を固定する。
// 対象はインベントリで候補に挙がった純粋変換（問題生成・選出・集計・往復変換）。
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { fetchSection } from '../src/lib/data.js';
import { selectDailyCards, shuffle } from '../src/lib/select.js';
import {
  answersMatch,
  buildSession,
  canOrder,
  normalizeAnswer as normalizeExerciseAnswer,
  splitChunks,
} from '../src/lib/exercises.js';
import { judgeWord, stripTones } from '../src/lib/vocab.js';
import {
  buildCalendar,
  decodeTransfer,
  encodeTransfer,
  formatMinutes,
  logByDate,
  mergeTransferLog,
  monthSummary,
} from '../src/lib/study.js';
import { streak, todayStr } from '../src/lib/progress.js';

const RUNS = { numRuns: 100 };

// 日付文字列（YYYY-MM-DD）。decodeTransfer が受理する形式に合わせる。
const dateStr = fc.stringMatching(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/);

const cardArb = fc.record({
  id: fc.string({ minLength: 1 }),
  zh: fc.string(),
  pinyin: fc.string(),
  ja: fc.string(),
  lesson: fc.string(),
  target: fc.string(),
  chunks: fc.string(),
});

const multiset = (arr) => {
  const m = new Map();
  for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
  return m;
};

describe('shuffle', () => {
  it('要素の多重集合と長さを保存し、入力を書き換えない', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))), (arr) => {
        const before = [...arr];
        const out = shuffle(arr);
        expect(out).toHaveLength(arr.length);
        expect(multiset(out)).toEqual(multiset(arr));
        expect(arr).toEqual(before);
      }),
      RUNS
    );
  });
});

describe('selectDailyCards', () => {
  it('入力の部分集合だけを、重複なく、total 以下で返す', () => {
    const cardsArb = fc.uniqueArray(cardArb, { selector: (c) => c.id, maxLength: 30 });
    fc.assert(
      fc.property(cardsArb, fc.integer({ min: 0, max: 20 }), (cards, total) => {
        const picked = selectDailyCards(cards, { total });
        expect(picked.length).toBeLessThanOrEqual(Math.min(total, cards.length));
        const ids = picked.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        const known = new Set(cards.map((c) => c.id));
        expect(ids.every((id) => known.has(id))).toBe(true);
      }),
      RUNS
    );
  });
});

describe('buildSession', () => {
  it('カードと同数の問題を返し、形式ごとの整合が取れている', () => {
    fc.assert(
      fc.property(fc.array(cardArb, { maxLength: 12 }), fc.array(cardArb, { maxLength: 12 }), (cards, pool) => {
        const session = buildSession(cards, pool);
        expect(session).toHaveLength(cards.length);
        for (const q of session) {
          expect(['card', 'choice', 'cloze-input', 'cloze-choice', 'order']).toContain(q.type);
          if (q.type === 'choice') {
            expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
            expect(new Set(q.options).size).toBe(q.options.length);
            expect(typeof q.prompt).toBe('string');
          }
          if (q.type === 'cloze-input' || q.type === 'cloze-choice') {
            expect(q.answer).toBe(q.card.target);
            expect(q.text).toContain('＿＿');
          }
          if (q.type === 'cloze-choice') {
            expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
          }
          if (q.type === 'order') {
            expect(multiset(q.pieces)).toEqual(multiset(q.answerChunks));
            expect(q.pieces.join('')).toBe(q.answerChunks.join(''));
          }
        }
      }),
      RUNS
    );
  });

  it('canOrder が真なら chunks をつなぐと元文に戻る', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        if (canOrder(card)) {
          const chunks = splitChunks(card);
          expect(chunks.length).toBeGreaterThanOrEqual(3);
          expect(chunks.join('')).toBe(String(card.zh ?? ''));
          expect(chunks.every((s) => s !== '' && s === s.trim())).toBe(true);
        }
      }),
      RUNS
    );
  });
});

describe('normalizeAnswer / answersMatch（演習）', () => {
  it('冪等で、句読点と空白を含まない', () => {
    // exercises.js の PUNCT と同じ文字集合を文字列で持ち、含まないことを見る。
    const puncts = ' 、。，．・！？!?.,：:；;「」『』（）()…—ー~～"\'""\'\'';
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeExerciseAnswer(s);
        expect(normalizeExerciseAnswer(once)).toBe(once);
        expect([...once].some((ch) => puncts.includes(ch) || /\s/.test(ch))).toBe(false);
      }),
      RUNS
    );
  });

  it('どんな値でも例外なく文字列を返す', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(typeof normalizeExerciseAnswer(v)).toBe('string');
      }),
      RUNS
    );
  });

  it('正規化して空でない文字列は自分自身と一致し、判定は対称', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        if (normalizeExerciseAnswer(a) !== '') expect(answersMatch(a, a)).toBe(true);
        expect(answersMatch(a, b)).toBe(answersMatch(b, a));
      }),
      RUNS
    );
  });
});

describe('stripTones / judgeWord（単語）', () => {
  it('stripTones は冪等で、声調記号と空白を含まない', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = stripTones(s);
        expect(stripTones(once)).toBe(once);
        expect(/[̀-ͯ\s]/.test(once)).toBe(false);
        expect(once).toBe(once.toLowerCase());
      }),
      RUNS
    );
  });

  it('中国語そのもの、またはピンインで答えれば正解になる', () => {
    const wordArb = fc.record({
      id: fc.string({ minLength: 1 }),
      zh: fc.stringMatching(/^[a-zA-Z\u4e00-\u9fff]{1,8}$/),
      // 空白だけのピンインは「無回答」と同じで、判定側が正解にしないのが仕様。
      // 生成側は声調を落としても空にならないよう、先頭を必ず文字にする。
      pinyin: fc.stringMatching(/^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ][a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ ]{0,11}$/),
      ja: fc.string(),
    });
    fc.assert(
      fc.property(wordArb, (word) => {
        expect(judgeWord(word.zh, word, [])).toBe(true);
        expect(judgeWord(word.pinyin, word, [])).toBe(true);
      }),
      RUNS
    );
  });
});

describe('fetchSection', () => {
  it('対象セクションが配列の応答だけを受け入れる', async () => {
    const payloads = fc.oneof(fc.jsonValue(), fc.record({ cards: fc.array(fc.jsonValue()) }));
    await fc.assert(
      fc.asyncProperty(payloads, async (payload) => {
        const map = new Map();
        const storage = {
          getItem: (k) => (map.has(k) ? map.get(k) : null),
          setItem: (k, v) => map.set(k, String(v)),
          removeItem: (k) => map.delete(k),
        };
        const fetcher = async () => ({ ok: true, json: async () => payload });
        const result = fetchSection('cards', { storage, fetcher });
        if (Array.isArray(payload?.cards)) {
          await expect(result).resolves.toMatchObject({ rows: payload.cards, fromCache: false });
        } else {
          await expect(result).rejects.toThrow('教材データの形式が正しくありません');
          expect(map.size).toBe(0);
        }
      }),
      RUNS
    );
  });
});

describe('study の集計', () => {
  it('formatMinutes は整数を返し、秒があるのに 0 にならず、単調', () => {
    fc.assert(
      fc.property(fc.integer({ min: -3600, max: 10_000_000 }), fc.integer({ min: -3600, max: 10_000_000 }), (a, b) => {
        const fa = formatMinutes(a);
        expect(Number.isInteger(fa)).toBe(true);
        if (a <= 0) expect(fa).toBe(0);
        if (a > 0) expect(fa).toBeGreaterThanOrEqual(1);
        if (a <= b) expect(fa).toBeLessThanOrEqual(formatMinutes(b));
      }),
      RUNS
    );
  });

  it('logByDate の値は有限な数だけになり、キーは入力の日付に限る', () => {
    const rowArb = fc.record({ date: fc.string(), seconds: fc.anything() });
    fc.assert(
      fc.property(fc.array(rowArb), (rows) => {
        const out = logByDate(rows);
        const dates = new Set(rows.map((r) => r.date));
        for (const [k, v] of Object.entries(out)) {
          expect(dates.has(k)).toBe(true);
          expect(Number.isFinite(v)).toBe(true);
        }
      }),
      RUNS
    );
  });

  it('buildCalendar は7の倍数のセルを持ち、その月の日数だけ日セルがある', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1970, max: 2100 }), fc.integer({ min: 1, max: 12 }), (year, month) => {
        const cells = buildCalendar(year, month, {});
        expect(cells.length % 7).toBe(0);
        const days = cells.filter(Boolean);
        expect(days).toHaveLength(new Date(year, month, 0).getDate());
        days.forEach((cell, i) => {
          expect(cell.day).toBe(i + 1);
          expect(cell.date).toBe(
            `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
          );
          expect([0, 1, 2, 3]).toContain(cell.level);
        });
      }),
      RUNS
    );
  });

  it('monthSummary は対象月の正の値だけを合計する', () => {
    const byDateArb = fc.dictionary(dateStr, fc.integer({ min: -600, max: 7200 }));
    fc.assert(
      fc.property(byDateArb, fc.integer({ min: 1970, max: 2100 }), fc.integer({ min: 1, max: 12 }), (byDate, year, month) => {
        const prefix = `${year}-${String(month).padStart(2, '0')}-`;
        let seconds = 0;
        let days = 0;
        for (const [d, s] of Object.entries(byDate)) {
          if (d.startsWith(prefix) && s > 0) {
            seconds += s;
            days++;
          }
        }
        expect(monthSummary(year, month, byDate)).toEqual({ seconds, days });
      }),
      RUNS
    );
  });
});

describe('引き継ぎリンクの往復', () => {
  it('encodeTransfer → decodeTransfer で記録と実施日が戻る', () => {
    const logArb = fc.dictionary(dateStr, fc.integer({ min: 1, max: 86400 }), { maxKeys: 20 });
    const doneArb = fc.uniqueArray(dateStr, { maxLength: 20 });
    fc.assert(
      fc.property(logArb, doneArb, (log, done) => {
        const decoded = decodeTransfer(encodeTransfer(log, done));
        expect(decoded).not.toBeNull();
        expect(decoded.log).toEqual(log);
        expect(decoded.done).toEqual([...done].sort());
      }),
      RUNS
    );
  });

  it('mergeTransferLog は日ごとに大きい方を残し、冪等', () => {
    const logArb = fc.dictionary(dateStr, fc.integer({ min: 0, max: 86400 }), { maxKeys: 10 });
    fc.assert(
      fc.property(logArb, logArb, (a, b) => {
        const merged = mergeTransferLog(a, b);
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
          expect(merged[k]).toBe(Math.max(a[k] || 0, b[k] || 0));
        }
        expect(mergeTransferLog(merged, b)).toEqual(merged);
      }),
      RUNS
    );
  });
});

describe('progress', () => {
  it('todayStr は有効な Date から YYYY-MM-DD を作る', () => {
    fc.assert(
      // Invalid Date を渡すと 'NaN-NaN-NaN' になり、西暦10000年以上では
      // 年が4桁に収まらない。ただし呼び出し元は常に new Date()（現在日）を
      // 渡すため到達不能で、生成側を現実的な年範囲に限る（本番コードは変えない）。
      fc.property(fc.date({ noInvalidDate: true, min: new Date(1970, 0, 1), max: new Date(2100, 11, 31) }), (d) => {
        expect(todayStr(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }),
      RUNS
    );
  });

  it('streak は 0 以上、実施日の種類数以下', () => {
    fc.assert(
      fc.property(fc.uniqueArray(dateStr, { maxLength: 40 }), (done) => {
        const s = streak(done, '2026-11-20');
        expect(Number.isInteger(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(done.length);
      }),
      RUNS
    );
  });
});
