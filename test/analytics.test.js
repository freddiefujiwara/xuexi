import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GA_MEASUREMENT_ID,
  trackAppReady,
  trackDataFetch,
  trackJudge,
  trackPageView,
  trackTtsLoad,
} from '../src/lib/analytics.js';

describe('analytics', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
  });
  afterEach(() => {
    delete window.gtag;
  });

  it('計測IDはサイト共通のもの', () => {
    expect(GA_MEASUREMENT_ID).toBe('G-W2C6FNCW86');
  });

  it('page_view はパスとタブ付きで送る', () => {
    trackPageView('cards');
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({ page_path: location.pathname, tab: 'cards' })
    );
  });

  it('data_fetch はミリ秒を丸めてセクション・キャッシュ状態付きで送る', () => {
    trackDataFetch('words', 123.6, 'miss');
    expect(window.gtag).toHaveBeenCalledWith('event', 'data_fetch', {
      fetch_ms: 124,
      section: 'words',
      cache: 'miss',
    });
  });

  it('app_ready / tts_load / judge も数値イベントで送る', () => {
    trackAppReady('drill', 999.4);
    expect(window.gtag).toHaveBeenCalledWith('event', 'app_ready', { ready_ms: 999, tab: 'drill' });
    trackTtsLoad(450, 'hit');
    expect(window.gtag).toHaveBeenCalledWith('event', 'tts_load', { load_ms: 450, cache: 'hit' });
    trackJudge(2300, 'ok');
    expect(window.gtag).toHaveBeenCalledWith('event', 'judge', { judge_ms: 2300, result: 'ok' });
  });

  it('不正なミリ秒（NaN・負数）は送らない', () => {
    trackDataFetch('words', Number.NaN, 'miss');
    trackAppReady('cards', -5);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('gtag が無くても例外にならない', () => {
    delete window.gtag;
    expect(() => trackPageView('record')).not.toThrow();
    expect(() => trackTtsLoad(100, 'miss')).not.toThrow();
  });
});
