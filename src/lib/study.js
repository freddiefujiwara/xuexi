// 勉強時間の記録（サーバー保存）。
// GAS の study_log タブが正本で、doGet の studyLog で全日分を受け取り、
// doPost の action:addStudy で加算する。送信に失敗した分は localStorage に
// 退避しておき、次回まとめて送る。
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
export function buildMinchalleText({ date, seconds, streakDays }) {
  const lines = [
    `中国語の勉強 ${formatMinutes(seconds)}分`,
    `連続 ${streakDays} 日`,
    'レッスン復習アプリで勉強しました。',
  ];
  return lines.join('\n');
}

export async function postStudy(apiUrl, { date, seconds, source }) {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'addStudy', date, seconds, source }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.reason || 'addStudy failed');
  return json;
}

// 送信できなかった秒数を端末に退避する（次回に再送）。
export function loadPending(storage = localStorage) {
  try {
    const v = JSON.parse(storage.getItem(PENDING_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function addPending(seconds, storage = localStorage, date = todayStr()) {
  if (!seconds || seconds <= 0) return;
  const pending = loadPending(storage);
  pending[date] = (pending[date] || 0) + seconds;
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function clearPending(storage = localStorage) {
  storage.removeItem(PENDING_KEY);
}

// 計測中の秒数は、画面を閉じても失わないよう定期的に端末へ退避する。
const BUFFER_KEY = `xuexi:session-buffer${suffix}`;

export function saveBuffer(seconds, storage = localStorage, date = todayStr()) {
  if (seconds > 0) storage.setItem(BUFFER_KEY, JSON.stringify({ date, seconds }));
  else storage.removeItem(BUFFER_KEY);
}

export function loadBuffer(storage = localStorage) {
  try {
    const v = JSON.parse(storage.getItem(BUFFER_KEY) || 'null');
    if (v && v.date && Number(v.seconds) > 0) return { date: v.date, seconds: Number(v.seconds) };
  } catch {
    // ignore broken buffer
  }
  return null;
}

export function clearBuffer(storage = localStorage) {
  storage.removeItem(BUFFER_KEY);
}
