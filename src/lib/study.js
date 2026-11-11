// 勉強時間の記録（端末ローカル保存）。
// 学習記録は localStorage の xuexi:study-log に日次合計で持ち、サーバーには
// 送らない（複数ユーザーが使っても個人の記録が混ざらないようにするため）。
// サーバー保存だった頃の履歴は importServerStudyLog で一度だけ取り込む。
import { isStagingBuild } from '../staging-banner.js';
import { todayStr } from './progress.js';

const suffix = isStagingBuild() ? ':staging' : '';
const PENDING_KEY = `xuexi:pending-study${suffix}`;

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
const MIGRATED_KEY = `xuexi:study-migrated${suffix}`;
const BUFFER_KEY = `xuexi:session-buffer${suffix}`;

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

export function clearStudyLog(storage = localStorage) {
  storage.removeItem(LOG_KEY);
}

export function studyLogEntries(log) {
  return Object.entries(log || {})
    .map(([date, seconds]) => ({ date, seconds }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function pendingSecondsOf(chunks) {
  if (Array.isArray(chunks)) {
    return chunks.reduce((sum, c) => sum + (typeof c === 'number' ? c : Number(c && c.seconds) || 0), 0);
  }
  if (typeof chunks === 'number') return chunks;
  if (chunks && typeof chunks === 'object') return Number(chunks.seconds) || 0;
  return 0;
}

// サーバー保存だった頃の履歴を一度だけ取り込む。サーバーの日次合計に、
// 未送信分（pending）と退避分（buffer）を合算する。取り込み後は
// pending / buffer を消し、以後は端末ローカルだけに記録する。
export function importServerStudyLog(serverLog, storage = localStorage) {
  if (storage.getItem(MIGRATED_KEY)) return loadStudyLog(storage);
  const merged = logByDate(serverLog);
  try {
    const pending = JSON.parse(storage.getItem(PENDING_KEY) || '{}');
    for (const [date, chunks] of Object.entries(pending || {})) {
      const sec = pendingSecondsOf(chunks);
      if (sec > 0) merged[date] = (merged[date] || 0) + sec;
    }
  } catch {
    // 壊れた退避データは無視する
  }
  try {
    const buffer = JSON.parse(storage.getItem(BUFFER_KEY) || 'null');
    if (buffer && buffer.date && Number(buffer.seconds) > 0) {
      merged[buffer.date] = (merged[buffer.date] || 0) + Number(buffer.seconds);
    }
  } catch {
    // 壊れた退避データは無視する
  }
  storage.setItem(LOG_KEY, JSON.stringify(merged));
  storage.setItem(MIGRATED_KEY, '1');
  storage.removeItem(PENDING_KEY);
  storage.removeItem(BUFFER_KEY);
  return merged;
}

// 操作が止まってから idleLimitMs を超えたら計測を止める（開きっぱなし対策）。
export function isCountingActive(lastInteractionAt, now, idleLimitMs = 180000) {
  return now - lastInteractionAt <= idleLimitMs;
}
