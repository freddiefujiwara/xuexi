import { describe, it, expect } from 'vitest';
import { sharePalette, shareTexts, prefersShareSheet, SHARE_W, SHARE_H } from '../src/lib/shareImage.js';

describe('sharePalette', () => {
  it('ライトとダークで配色が切り替わる', () => {
    const light = sharePalette(false);
    const dark = sharePalette(true);
    expect(light.bg).toBe('#fbfaf7');
    expect(dark.bg).toBe('#17140f');
    expect(light.lv3).toBe('#b23a1f');
    expect(dark.lv3).not.toBe(light.lv3);
  });
});

describe('shareTexts', () => {
  it('タイトル・連続日数・月のまとめを作る', () => {
    const texts = shareTexts({
      todaySeconds: 780,
      streakDays: 2,
      year: 2026,
      month: 11,
      byDate: { '2026-11-10': 300, '2026-11-11': 780 },
    });
    expect(texts.title).toBe('今日の勉強 13 分');
    expect(texts.sub).toBe('連続 2 日');
    expect(texts.monthTitle).toBe('2026年11月');
    expect(texts.footer).toContain('2 日');
    expect(texts.footer).toContain('18 分');
  });
  it('画像サイズは 1080x1350', () => {
    expect(SHARE_W).toBe(1080);
    expect(SHARE_H).toBe(1350);
  });
});

describe('prefersShareSheet', () => {
  it('タッチ端末＋ファイル共有可ならシートを使う', () => {
    expect(prefersShareSheet({ hasShare: true, canShareFiles: true, coarsePointer: true })).toBe(true);
  });
  it('PC（細かいポインタ）ではシートを使わない', () => {
    expect(prefersShareSheet({ hasShare: true, canShareFiles: true, coarsePointer: false })).toBe(false);
  });
  it('共有APIが無ければシートを使わない', () => {
    expect(prefersShareSheet({ hasShare: false, canShareFiles: false, coarsePointer: true })).toBe(false);
  });
});
