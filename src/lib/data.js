// 学習コンテンツ（cards / drills / words）の取得とタブ間キャッシュ。
// タブごとに必要なセクションだけを GAS から取り（?type= 指定）、結果は
// sessionStorage に30分保持する。タブは別ページ構成のため、ページを
// 移るたびに全データを取り直す無駄を避けるのが目的。
import { API_URL } from '../config.js';
import { isStagingBuild } from '../staging-banner.js';

const suffix = isStagingBuild() ? ':staging' : '';
export const SECTION_CACHE_TTL_MS = 30 * 60 * 1000;

const TAB_SECTIONS = { cards: 'cards', drill: 'drills', vocab: 'words', record: null };

export function sectionForTab(tab) {
  return Object.prototype.hasOwnProperty.call(TAB_SECTIONS, tab) ? TAB_SECTIONS[tab] : null;
}

export function sectionCacheKey(section) {
  return `xuexi:section:${section}${suffix}`;
}

export function loadCachedSection(section, storage = sessionStorage) {
  try {
    const raw = storage.getItem(sectionCacheKey(section));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isFreshEntry(entry, now = Date.now()) {
  return !!entry && typeof entry.fetchedAt === 'number' && now - entry.fetchedAt < SECTION_CACHE_TTL_MS;
}

export function saveCachedSection(section, rows, generatedAt, storage = sessionStorage, now = Date.now()) {
  try {
    storage.setItem(
      sectionCacheKey(section),
      JSON.stringify({ rows, generatedAt: generatedAt || null, fetchedAt: now })
    );
  } catch {
    // 保存できなくても取得結果自体は使える。
  }
}

// 新しいキャッシュがあればそれを返し、無ければ GAS から取る。
// 取得に失敗したら、古いキャッシュでもあればそれで代替する。
export async function fetchSection(section, { storage = sessionStorage, fetcher = fetch, now = Date.now() } = {}) {
  const cached = loadCachedSection(section, storage);
  if (isFreshEntry(cached, now)) {
    return { rows: cached.rows, generatedAt: cached.generatedAt, fromCache: true };
  }
  try {
    const res = await fetcher(`${API_URL}?type=${encodeURIComponent(section)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    // 正常な空配列と異常な応答を区別し、異常時は既存キャッシュを上書きしない。
    const rows = body?.[section];
    if (!Array.isArray(rows)) throw new Error('教材データの形式が正しくありません');
    saveCachedSection(section, rows, body.generatedAt, storage, now);
    return { rows, generatedAt: body.generatedAt || null, fromCache: false };
  } catch (e) {
    if (cached) return { rows: cached.rows, generatedAt: cached.generatedAt, fromCache: true };
    throw e;
  }
}
