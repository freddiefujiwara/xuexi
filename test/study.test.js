import { describe, it, expect } from 'vitest';
import {
  addPending,
  buildCalendar,
  buildShareText,
  clearPending,
  formatMinutes,
  loadPending,
  logByDate,
  pendingSeconds,
  removePendingChunk,
  monthSummary,
  studyLevel,
} from '../src/lib/study.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('formatMinutes', () => {
  it('秒を分に丸める', () => {
    expect(formatMinutes(0)).toBe(0);
    expect(formatMinutes(600)).toBe(10);
    expect(formatMinutes(660)).toBe(11);
  });
  it('学習があれば最低1分と表示する', () => {
    expect(formatMinutes(20)).toBe(1);
  });
});

describe('logByDate / studyLevel', () => {
  it('配列を日付キーに変形する', () => {
    expect(logByDate([{ date: '2026-11-10', seconds: 300 }])).toEqual({ '2026-11-10': 300 });
    expect(logByDate(null)).toEqual({});
  });
  it('時間でレベルを分ける', () => {
    expect(studyLevel(0)).toBe(0);
    expect(studyLevel(300)).toBe(1);
    expect(studyLevel(900)).toBe(2);
    expect(studyLevel(1800)).toBe(3);
  });
});

describe('buildCalendar', () => {
  it('2026年11月（1日が日曜）のセルを作る', () => {
    const cells = buildCalendar(2026, 11, { '2026-11-10': 720 });
    expect(cells.length % 7).toBe(0);
    const nov10 = cells.find((c) => c && c.date === '2026-11-10');
    expect(nov10.day).toBe(10);
    expect(nov10.seconds).toBe(720);
    expect(nov10.level).toBe(2);
    const nov1 = cells.find((c) => c && c.date === '2026-11-01');
    expect(nov1.level).toBe(0);
  });
});

describe('monthSummary', () => {
  it('月の合計と日数を出す', () => {
    const byDate = { '2026-11-01': 600, '2026-11-10': 1200, '2026-10-31': 9999 };
    expect(monthSummary(2026, 11, byDate)).toEqual({ seconds: 1800, days: 2 });
  });
});

describe('buildShareText', () => {
  it('SNS投稿文を作る', () => {
    const text = buildShareText({ seconds: 900, streakDays: 3 });
    expect(text).toContain('「学习」で今日は15分学習しました。');
    expect(text).toContain('連続3日。');
    expect(text).toContain('https://freddiefujiwara.com/xuexi');
  });
  it('連続0日なら連続行を出さない', () => {
    const text = buildShareText({ seconds: 0, streakDays: 0 });
    expect(text).not.toContain('連続');
  });
});

describe('pending', () => {
  it('未送信分をチャンク（バッチID付き）で貯め、成功分だけ消せる', () => {
    const storage = fakeStorage();
    addPending(120, storage, '2026-11-10', 'b1');
    addPending(60, storage, '2026-11-10', 'b2');
    addPending(30, storage, '2026-11-09');
    expect(loadPending(storage)).toEqual({
      '2026-11-10': [
        { seconds: 120, batchId: 'b1' },
        { seconds: 60, batchId: 'b2' },
      ],
      '2026-11-09': [{ seconds: 30, batchId: null }],
    });
    expect(pendingSeconds(loadPending(storage), '2026-11-10')).toBe(180);
    removePendingChunk('2026-11-10', { seconds: 120, batchId: 'b1' }, storage);
    expect(pendingSeconds(loadPending(storage), '2026-11-10')).toBe(60);
    clearPending(storage);
    expect(loadPending(storage)).toEqual({});
  });

  it('旧形式（日付→秒数）も読み込める', () => {
    const storage = fakeStorage();
    storage.setItem('xuexi:pending-study', JSON.stringify({ '2026-11-10': 180 }));
    expect(loadPending(storage)).toEqual({ '2026-11-10': [{ seconds: 180, batchId: null }] });
  });
});

describe('session buffer', () => {
  it('計測中の秒数を退避して読み戻せる', async () => {
    const { saveBuffer, loadBuffer, clearBuffer } = await import('../src/lib/study.js');
    const storage = fakeStorage();
    expect(loadBuffer(storage)).toBeNull();
    saveBuffer(42, storage, '2026-11-10');
    expect(loadBuffer(storage)).toEqual({ date: '2026-11-10', seconds: 42 });
    saveBuffer(0, storage, '2026-11-10');
    expect(loadBuffer(storage)).toBeNull();
    saveBuffer(10, storage, '2026-11-10');
    clearBuffer(storage);
    expect(loadBuffer(storage)).toBeNull();
  });
});

describe('isCountingActive', () => {
  it('操作直後は計測中、3分超で停止', async () => {
    const { isCountingActive } = await import('../src/lib/study.js');
    expect(isCountingActive(1000, 1000 + 179000)).toBe(true);
    expect(isCountingActive(1000, 1000 + 181000)).toBe(false);
  });
});
