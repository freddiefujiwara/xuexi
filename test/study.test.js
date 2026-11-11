import { describe, it, expect } from 'vitest';
import {
  addStudySeconds,
  buildCalendar,
  buildShareText,
  clearStudyLog,
  formatMinutes,
  importServerStudyLog,
  loadStudyLog,
  logByDate,
  monthSummary,
  studyLevel,
  decodeTransfer,
  encodeTransfer,
  mergeTransferLog,
  studyLogEntries,
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
    expect(text).toBe('中国語学習アプリ「学习」で今日は15分学習しました。\n連続3日。');
    expect(text).toContain('連続3日。');
  });
  it('連続0日なら連続行を出さない', () => {
    const text = buildShareText({ seconds: 0, streakDays: 0 });
    expect(text).not.toContain('連続');
  });
});

describe('study log (localStorage)', () => {
  it('秒数を日次合計へ加算して保存する', () => {
    const storage = fakeStorage();
    addStudySeconds(300, storage, '2026-11-11');
    const log = addStudySeconds(120, storage, '2026-11-11');
    expect(log).toEqual({ '2026-11-11': 420 });
    expect(loadStudyLog(storage)).toEqual({ '2026-11-11': 420 });
  });
  it('削除すると空になる', () => {
    const storage = fakeStorage();
    addStudySeconds(300, storage, '2026-11-11');
    clearStudyLog(storage);
    expect(loadStudyLog(storage)).toEqual({});
  });
  it('エントリ配列は日付順', () => {
    expect(studyLogEntries({ '2026-11-11': 60, '2026-11-01': 30 })).toEqual([
      { date: '2026-11-01', seconds: 30 },
      { date: '2026-11-11', seconds: 60 },
    ]);
  });
});

describe('importServerStudyLog', () => {
  it('サーバー履歴＋未送信分＋退避分を合算して一度だけ取り込む', () => {
    const storage = fakeStorage();
    storage.setItem('xuexi:pending-study', JSON.stringify({ '2026-11-11': [{ seconds: 90, batchId: 'b1' }] }));
    storage.setItem('xuexi:session-buffer', JSON.stringify({ date: '2026-11-11', seconds: 30 }));
    const merged = importServerStudyLog(
      [
        { date: '2026-11-10', seconds: 600 },
        { date: '2026-11-11', seconds: 300 },
      ],
      storage
    );
    expect(merged).toEqual({ '2026-11-10': 600, '2026-11-11': 420 });
    expect(storage.getItem('xuexi:pending-study')).toBeNull();
    expect(storage.getItem('xuexi:session-buffer')).toBeNull();
    // 2回目は取り込まない
    const again = importServerStudyLog([{ date: '2026-11-11', seconds: 9999 }], storage);
    expect(again).toEqual({ '2026-11-10': 600, '2026-11-11': 420 });
  });
});

describe('isCountingActive', () => {
  it('操作直後は計測中、3分超で停止', async () => {
    const { isCountingActive } = await import('../src/lib/study.js');
    expect(isCountingActive(1000, 1000 + 179000)).toBe(true);
    expect(isCountingActive(1000, 1000 + 181000)).toBe(false);
  });
});

describe('transfer link', () => {
  it('エンコード→デコードで往復する', () => {
    const enc = encodeTransfer({ '2026-11-10': 600, '2026-11-11': 420 }, ['2026-11-10', '2026-11-11']);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeTransfer(enc)).toEqual({
      log: { '2026-11-10': 600, '2026-11-11': 420 },
      done: ['2026-11-10', '2026-11-11'],
    });
  });
  it('壊れたリンクは null', () => {
    expect(decodeTransfer('zzzz')).toBeNull();
    expect(decodeTransfer('')).toBeNull();
  });
  it('合体は同じ日に大きい方を残す', () => {
    expect(mergeTransferLog({ '2026-11-11': 100 }, { '2026-11-11': 420, '2026-11-10': 60 })).toEqual({
      '2026-11-11': 420,
      '2026-11-10': 60,
    });
  });
});
