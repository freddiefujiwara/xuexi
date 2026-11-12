import { describe, it, expect, vi } from 'vitest';
import {
  SECTION_CACHE_TTL_MS,
  fetchSection,
  isFreshEntry,
  loadCachedSection,
  saveCachedSection,
  sectionCacheKey,
  sectionForTab,
} from '../src/lib/data.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('sectionForTab', () => {
  it('タブごとに必要なセクションを返す（記録は不要）', () => {
    expect(sectionForTab('cards')).toBe('cards');
    expect(sectionForTab('drill')).toBe('drills');
    expect(sectionForTab('vocab')).toBe('words');
    expect(sectionForTab('record')).toBeNull();
    expect(sectionForTab('unknown')).toBeNull();
  });
});

describe('セクションキャッシュ', () => {
  it('保存した内容を読み戻せる', () => {
    const storage = fakeStorage();
    saveCachedSection('words', [{ id: 'w001' }], '2026-11-12T00:00:00.000Z', storage, 1000);
    const entry = loadCachedSection('words', storage);
    expect(entry.rows).toEqual([{ id: 'w001' }]);
    expect(entry.generatedAt).toBe('2026-11-12T00:00:00.000Z');
    expect(entry.fetchedAt).toBe(1000);
    expect(storage.getItem(sectionCacheKey('words'))).toBeTruthy();
  });
  it('無い・壊れたキャッシュは null', () => {
    const storage = fakeStorage();
    expect(loadCachedSection('cards', storage)).toBeNull();
    storage.setItem(sectionCacheKey('cards'), '{broken');
    expect(loadCachedSection('cards', storage)).toBeNull();
  });
  it('鮮度は TTL で判定する', () => {
    const now = 10_000_000;
    expect(isFreshEntry({ fetchedAt: now - SECTION_CACHE_TTL_MS + 1 }, now)).toBe(true);
    expect(isFreshEntry({ fetchedAt: now - SECTION_CACHE_TTL_MS }, now)).toBe(false);
    expect(isFreshEntry(null, now)).toBe(false);
    expect(isFreshEntry({}, now)).toBe(false);
  });
});

describe('fetchSection', () => {
  const okFetcher = (rows) =>
    vi.fn(async () => ({ ok: true, json: async () => ({ words: rows, generatedAt: 'g1' }) }));

  it('新しいキャッシュがあれば取得しない', async () => {
    const storage = fakeStorage();
    saveCachedSection('words', [{ id: 'cached' }], 'g0', storage, Date.now());
    const fetcher = okFetcher([{ id: 'fresh' }]);
    const result = await fetchSection('words', { storage, fetcher });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ rows: [{ id: 'cached' }], generatedAt: 'g0', fromCache: true });
  });
  it('キャッシュが古ければ取得して保存し直す', async () => {
    const storage = fakeStorage();
    saveCachedSection('words', [{ id: 'old' }], 'g0', storage, 0);
    const fetcher = okFetcher([{ id: 'fresh' }]);
    const result = await fetchSection('words', { storage, fetcher, now: SECTION_CACHE_TTL_MS + 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('?type=words');
    expect(result.rows).toEqual([{ id: 'fresh' }]);
    expect(result.fromCache).toBe(false);
    expect(loadCachedSection('words', storage).rows).toEqual([{ id: 'fresh' }]);
  });
  it('取得に失敗したら古いキャッシュで代替する', async () => {
    const storage = fakeStorage();
    saveCachedSection('words', [{ id: 'old' }], 'g0', storage, 0);
    const fetcher = vi.fn(async () => {
      throw new Error('network');
    });
    const result = await fetchSection('words', { storage, fetcher, now: SECTION_CACHE_TTL_MS + 1 });
    expect(result.rows).toEqual([{ id: 'old' }]);
    expect(result.fromCache).toBe(true);
  });
  it('キャッシュが無く取得も失敗したら投げる', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await expect(fetchSection('words', { storage: fakeStorage(), fetcher })).rejects.toThrow('HTTP 500');
  });
});
