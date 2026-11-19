// 勉強時間の記録（端末ローカル保存）。
// 学習記録は localStorage の xuexi:study-log に日次合計で持ち、サーバーには
// 送らない（複数ユーザーが使っても個人の記録が混ざらないようにするため）。
import { isStagingBuild } from '../staging-banner.js';
import { todayStr } from './progress.js';

const suffix = isStagingBuild() ? ':staging' : '';

// 表示用の分数。学習実績があるのに 0 分と出ないよう、秒があれば最低 1 分にする。
export function formatMinutes(seconds) {
  const s = Number(seconds) || 0;
  if (s <= 0) return 0;
  return Math.max(1, Math.round(s / 60));
}

// studyLog 配列を { 'YYYY-MM-DD': seconds } に変形する。
export function logByDate(studyLog) {
  const out = {};
  for (const row of studyLog || []) {
    if (row && row.date) out[row.date] = Number(row.seconds) || 0;
  }
  return out;
}

// 時間の長さで 0〜3 の濃さレベルを返す（カレンダーの色分け用）。
export function studyLevel(seconds) {
  const min = (Number(seconds) || 0) / 60;
  if (min <= 0) return 0;
  if (min < 10) return 1;
  if (min < 25) return 2;
  return 3;
}

// 月カレンダーのセル配列（週×7）。範囲外の日は null。
export function buildCalendar(year, month, byDate) {
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const seconds = byDate[date] || 0;
    cells.push({ date, day: d, seconds, level: studyLevel(seconds) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// その月の合計秒数と勉強した日数。
export function monthSummary(year, month, byDate) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  let seconds = 0;
  let days = 0;
  for (const [date, s] of Object.entries(byDate || {})) {
    if (date.startsWith(prefix) && s > 0) {
      seconds += s;
      days++;
    }
  }
  return { seconds, days };
}

// みんチャレ投稿用のテキスト。
export function buildShareText({ seconds, streakDays }) {
  const lines = [`中国語学習アプリ「学习」で今日は${formatMinutes(seconds)}分学習しました。`];
  if (streakDays > 0) lines.push(`連続${streakDays}日。`);
  return lines.join('\n');
}

// ---- 端末ローカルの学習記録 ----
const LOG_KEY = `xuexi:study-log${suffix}`;

export function loadStudyLog(storage = localStorage) {
  try {
    const v = JSON.parse(storage.getItem(LOG_KEY) || '{}');
    if (!v || typeof v !== 'object') return {};
    const out = {};
    for (const [date, sec] of Object.entries(v)) {
      const n = Number(sec) || 0;
      if (n > 0) out[date] = n;
    }
    return out;
  } catch {
    return {};
  }
}

export function addStudySeconds(seconds, storage = localStorage, date = todayStr()) {
  const log = loadStudyLog(storage);
  if (seconds > 0) {
    log[date] = (log[date] || 0) + seconds;
    storage.setItem(LOG_KEY, JSON.stringify(log));
  }
  return log;
}

export function saveStudyLog(log, storage = localStorage) {
  storage.setItem(LOG_KEY, JSON.stringify(log || {}));
  return log;
}

export function clearStudyLog(storage = localStorage) {
  storage.removeItem(LOG_KEY);
}

export function studyLogEntries(log) {
  return Object.entries(log || {})
    .map(([date, seconds]) => ({ date, seconds }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// 操作が止まってから idleLimitMs を超えたら計測を止める（開きっぱなし対策）。
export function isCountingActive(lastInteractionAt, now, idleLimitMs = 180000) {
  return now - lastInteractionAt <= idleLimitMs;
}

// ---- 端末間の引き継ぎリンク ----
// 学習記録を URL 自体に埋め込んで運ぶ（md2img と同じ発想）。サーバーには
// 送りたくないので、パスではなくフラグメント（#import=...）に入れる。
// 形式: "v1|yyyymmdd.seconds;...|yyyymmdd,..." を base64url 化したもの。
export function encodeTransfer(log, doneDates) {
  const studyPart = Object.entries(log || {})
    .filter(([, sec]) => Number(sec) > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, sec]) => `${date.replaceAll('-', '')}.${Number(sec)}`)
    .join(';');
  const donePart = [...(doneDates || [])]
    .sort()
    .map((d) => d.replaceAll('-', ''))
    .join(',');
  const raw = `v1|${studyPart}|${donePart}`;
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function hyphenDate(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function decodeTransfer(encoded) {
  try {
    const b64 = String(encoded || '').replaceAll('-', '+').replaceAll('_', '/');
    const raw = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const parts = raw.split('|');
    if (parts.length !== 3 || parts[0] !== 'v1') return null;
    const log = {};
    for (const item of parts[1].split(';')) {
      if (!item) continue;
      const [d, sec] = item.split('.');
      if (!/^\d{8}$/.test(d)) return null;
      const n = Number(sec);
      if (!Number.isFinite(n) || n <= 0 || n > 86400) return null;
      log[hyphenDate(d)] = n;
    }
    const done = [];
    for (const d of parts[2].split(',')) {
      if (!d) continue;
      if (!/^\d{8}$/.test(d)) return null;
      done.push(hyphenDate(d));
    }
    return { log, done };
  } catch {
    return null;
  }
}

// 引き継ぎデータの合体：同じ日は大きい方を残す（同じリンクを2回開いても二重にならない）。
export function mergeTransferLog(local, imported) {
  const out = { ...(local || {}) };
  for (const [date, sec] of Object.entries(imported || {})) {
    out[date] = Math.max(out[date] || 0, Number(sec) || 0);
  }
  return out;
}
