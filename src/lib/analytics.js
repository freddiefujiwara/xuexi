// Google Analytics 4 (gtag.js) の計測。ブログ（/blog の src/analytics.js）と
// 同じ流儀：gtag 本体は各エントリHTMLで send_page_view:false で読み込み、
// 送信はこのモジュールに集約する。ステージングでは一切送らない（本番の
// 数値を水増ししないため）。
import { isStagingBuild } from '../staging-banner.js';

export const GA_MEASUREMENT_ID = 'G-W2C6FNCW86';

function sendEvent(eventName, params = {}) {
  if (isStagingBuild()) return;
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

// ミリ秒の数値をカスタム指標として送るための共通処理。
// GA4 側で fetch_ms / ready_ms / load_ms / judge_ms をカスタム指標に
// 登録すると、平均値としてレポートで読める。
const sendTiming = (eventName, paramName, ms, extra = {}) => {
  const value = Math.round(Number(ms));
  if (!Number.isFinite(value) || value < 0) return;
  sendEvent(eventName, { [paramName]: value, ...extra });
};

export function trackPageView(tab) {
  sendEvent('page_view', {
    page_path: typeof location !== 'undefined' ? location.pathname : '/',
    page_title: typeof document !== 'undefined' ? document.title : '',
    tab,
  });
}

// データ取得にかかった時間。cache は hit（端末内キャッシュ）/
// miss（GASへ取得）/ error（失敗）。
export function trackDataFetch(section, ms, cache) {
  sendTiming('data_fetch', 'fetch_ms', ms, { section, cache });
}

// ページを開いてから内容が表示されるまでの時間（タブ別）。
export function trackAppReady(tab, ms) {
  sendTiming('app_ready', 'ready_ms', ms, { tab });
}

// 音声の読み込み時間（「…」表示が出ている間の長さ）。
// cache は hit（再生済み音声の再利用）/ miss（GASへ取得）。
export function trackTtsLoad(ms, cache) {
  sendTiming('tts_load', 'load_ms', ms, { cache });
}

// 疑問詞ドリルの AI 判定にかかった時間。
// result は ok（AI判定が返った）/ fallback（自己判定に落ちた）。
export function trackJudge(ms, result) {
  sendTiming('judge', 'judge_ms', ms, { result });
}
