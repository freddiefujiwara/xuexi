import { describe, expect, test } from 'vitest';
import { selectDailyCards, shuffle } from '../src/lib/select.js';
import { isStagingBuild } from '../src/staging-banner.js';
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
  test('総数が上限未満なら全部返す', () => {
    const few = Array.from({ length: 3 }, (_, i) => ({ id: `x${i}`, lesson: '2026-11-07' }));
    expect(selectDailyCards(few, { total: 10, random: () => 0.5 })).toHaveLength(3);
  });
  test('直近が recentCount 未満なら古い分で補充する', () => {
    const all = [
      ...Array.from({ length: 3 }, (_, i) => ({ id: `n${i}`, lesson: '2026-11-07' })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `o${i}`, lesson: '2026-10-17' })),
    ];
    const picked = selectDailyCards(all, { total: 10, recentCount: 7, random: () => 0.5 });
    expect(picked).toHaveLength(10);
    expect(picked.filter((c) => c.lesson === '2026-11-07')).toHaveLength(3);
    expect(picked.filter((c) => c.lesson === '2026-10-17')).toHaveLength(7);
  });
  test('古いカードが無ければ直近の残りで補充し重複しない', () => {
    const all = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, lesson: '2026-11-07' }));
    const picked = selectDailyCards(all, { total: 10, recentCount: 7, random: () => 0.5 });
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((c) => c.id)).size).toBe(10);
  });
});

describe('isStagingBuild', () => {
  test('VITE_STAGING=1 のときだけ true', () => {
    expect(isStagingBuild({ VITE_STAGING: '1' })).toBe(true);
    expect(isStagingBuild({})).toBe(false);
    expect(isStagingBuild({ VITE_STAGING: '0' })).toBe(false);
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
  test('markDone を2回呼んでも重複しない', () => {
    const s = fakeStorage();
    markDone(s, '2026-11-10');
    markDone(s, '2026-11-10');
    expect(loadDone(s)).toEqual(['2026-11-10']);
  });
  test('保存値が壊れていれば空として扱う', () => {
    const s = fakeStorage();
    s.setItem('xuexi:done', '{broken json');
    expect(loadDone(s)).toEqual([]);
    expect(isDoneToday(s, '2026-11-10')).toBe(false);
  });
  test('streak は今日だけ実施なら1', () => {
    expect(streak(['2026-11-10'], '2026-11-10')).toBe(1);
    expect(streak(['2026-11-09'], '2026-11-10')).toBe(1);
  });
});
