import { describe, expect, test } from 'vitest';
import { selectDailyCards, shuffle } from '../src/lib/select.js';
import { isDoneToday, loadDone, markDone, streak, todayStr } from '../src/lib/progress.js';

const cards = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `a${i}`, lesson: '2026-11-07' })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, lesson: '2026-10-31' })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, lesson: '2026-10-24' })),
];

describe('selectDailyCards', () => {
  test('直近2回のレッスンを中心に10枚選ぶ', () => {
    const picked = selectDailyCards(cards, { random: () => 0 });
    expect(picked).toHaveLength(10);
    const recent = picked.filter((c) => c.lesson !== '2026-10-24');
    expect(recent.length).toBeGreaterThanOrEqual(7);
  });
  test('空なら空配列', () => {
    expect(selectDailyCards([])).toEqual([]);
  });
});

describe('shuffle', () => {
  test('要素を失わない', () => {
    const out = shuffle([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
}

describe('progress', () => {
  test('markDone で今日が実施済みになる', () => {
    const s = fakeStorage();
    expect(isDoneToday(s, '2026-11-10')).toBe(false);
    markDone(s, '2026-11-10');
    expect(isDoneToday(s, '2026-11-10')).toBe(true);
    expect(loadDone(s)).toEqual(['2026-11-10']);
  });
  test('streak は連続日数を数える(今日未実施なら昨日から)', () => {
    expect(streak(['2026-11-08', '2026-11-09'], '2026-11-10')).toBe(2);
    expect(streak(['2026-11-08', '2026-11-09', '2026-11-10'], '2026-11-10')).toBe(3);
    expect(streak(['2026-11-05'], '2026-11-10')).toBe(0);
  });
  test('todayStr は YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 10, 7))).toBe('2026-11-07');
  });
});
