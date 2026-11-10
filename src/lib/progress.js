// 実施記録(localStorage)。
// キーは本番とステージングで分ける(ステージングが本番の記録を読まないように)。
import { isStagingBuild } from '../staging-banner.js';

const suffix = isStagingBuild() ? ':staging' : '';
const DONE_KEY = `xuexi:done${suffix}`;

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadDone(storage = localStorage) {
  try {
    const v = JSON.parse(storage.getItem(DONE_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function markDone(storage = localStorage, date = todayStr()) {
  const done = loadDone(storage);
  if (!done.includes(date)) {
    done.push(date);
    storage.setItem(DONE_KEY, JSON.stringify(done.sort()));
  }
  return done;
}

export function isDoneToday(storage = localStorage, date = todayStr()) {
  return loadDone(storage).includes(date);
}

// 今日(未実施なら昨日)から遡る連続日数。
export function streak(doneDates, today = todayStr()) {
  const done = new Set(doneDates);
  let count = 0;
  const cursor = new Date(`${today}T00:00:00`);
  if (!done.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (done.has(todayStr(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
