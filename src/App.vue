<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ExerciseSession from './components/ExerciseSession.vue';
import Drill from './components/Drill.vue';
import Vocab from './components/Vocab.vue';
import StudyRecord from './components/StudyRecord.vue';
import { API_URL } from './config.js';
import { selectDailyCards } from './lib/select.js';
import { clearDone, isDoneToday, loadDone, markDone, mergeDone, streak, todayStr } from './lib/progress.js';
import {
  addStudySeconds,
  clearStudyLog,
  formatMinutes,
  importServerStudyLog,
  isCountingActive,
  decodeTransfer,
  loadStudyLog,
  mergeTransferLog,
  saveStudyLog,
  studyLogEntries,
} from './lib/study.js';
import { tabFromPath, tabHrefs } from './lib/nav.js';
import { fetchSection, sectionForTab } from './lib/data.js';
import { trackAppReady, trackDataFetch, trackPageView } from './lib/analytics.js';

const year = new Date().getFullYear();
const PAGE_HEADS = {
  cards: { title: 'レッスンの復習', lead: 'レッスンで学んだことの復習' },
  drill: { title: '疑問詞ドリル', lead: '疑問詞の質問に、中国語で答える練習' },
  vocab: { title: '単語練習', lead: '日本語訳を見て、中国語を答える練習' },
  record: { title: '学習の記録', lead: '勉強時間と実施日の記録' },
};
const tab = ref(tabFromPath(location.pathname));
const hrefs = tabHrefs(location.pathname);
const loading = ref(true);
const error = ref('');
const data = ref({ cards: [], drills: [], words: [] });
const doneDates = ref(loadDone());
const transferNote = ref('');
const doneToday = ref(false);
const streakDays = ref(0);
// 学習記録は端末ローカル（localStorage）に日次合計で持つ。
const localLog = ref(loadStudyLog());
let accumulated = 0;
let timer = null;
let lastInteractionAt = Date.now();

function noteInteraction() {
  lastInteractionAt = Date.now();
}

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

const dailyCards = computed(() => selectDailyCards(data.value.cards));
const studyByDate = computed(() => localLog.value);
const studyEntries = computed(() => studyLogEntries(localLog.value));
const todaySeconds = computed(() => localLog.value[todayStr()] || 0);
const studyStreakDays = computed(() =>
  streak(Object.keys(studyByDate.value).filter((d) => studyByDate.value[d] > 0))
);

function refreshProgress() {
  doneDates.value = loadDone();
  doneToday.value = isDoneToday();
  streakDays.value = streak(loadDone());
}

// 引き継ぎリンク（#import=...）を開いたら、確認のうえ記録を取り込む。
function applyTransferFromHash() {
  const m = location.hash.match(/#import=([A-Za-z0-9_-]+)/);
  // リンクは一度使ったらURLから消す（再取り込みと漏えい防止）。
  if (m) history.replaceState(null, '', location.pathname + location.search);
  if (!m) return;
  const data = decodeTransfer(m[1]);
  if (!data || (Object.keys(data.log).length === 0 && data.done.length === 0)) {
    transferNote.value = '引き継ぎリンクを読み取れませんでした。';
    return;
  }
  if (!window.confirm('引き継ぎデータの学習記録を取り込みますか？（同じ日は大きい方の記録を残します）')) return;
  localLog.value = saveStudyLog(mergeTransferLog(localLog.value, data.log));
  mergeDone(data.done);
  refreshProgress();
  transferNote.value = '引き継ぎデータを取り込みました。';
}

function onFinished() {
  markDone();
  refreshProgress();
}

// 計測した秒数を端末ローカルの記録へ確定する。
function commitStudy() {
  if (accumulated <= 0) return;
  localLog.value = addStudySeconds(accumulated);
  accumulated = 0;
}

function onClearRecords() {
  clearStudyLog();
  clearDone();
  localLog.value = {};
  refreshProgress();
}

function onVisibility() {
  if (document.visibilityState === 'hidden') commitStudy();
}

onMounted(async () => {
  refreshProgress();
  trackPageView(tab.value);
  if (!API_URL) {
    error.value = 'データAPIのURLが未設定です（ビルド時の設定待ち）。';
    loading.value = false;
    return;
  }
  // タブごとに必要なセクションだけ取る（記録タブは取得自体をしない）。
  const section = sectionForTab(tab.value);
  if (section) {
    const fetchStartedAt = performance.now();
    try {
      const result = await fetchSection(section);
      data.value = { ...data.value, [section]: result.rows };
      trackDataFetch(section, performance.now() - fetchStartedAt, result.fromCache ? 'hit' : 'miss');
    } catch (e) {
      trackDataFetch(section, performance.now() - fetchStartedAt, 'error');
      error.value = `データを読み込めませんでした（${e.message}）。時間をおいて開き直してください。`;
    }
  }
  loading.value = false;
  trackAppReady(tab.value, performance.now());
  // サーバー保存だった頃の履歴を一度だけ端末へ取り込む（取得できた時だけ）。
  if (!error.value) {
    localLog.value = importServerStudyLog(data.value.studyLog);
  }
  applyTransferFromHash();
  // 学習タブを開いている間だけ、画面が見えている時間を計測する。
  for (const ev of INTERACTION_EVENTS) window.addEventListener(ev, noteInteraction, { passive: true });
  timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!['cards', 'drill', 'vocab'].includes(tab.value)) return;
    // 開きっぱなしの画面（操作なし3分超・非フォーカス）は数えない。
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
    if (!isCountingActive(lastInteractionAt, Date.now())) {
      commitStudy();
      return;
    }
    accumulated++;
    // 10秒ごとに端末ローカルの記録へ確定する（落ちても失わない）。
    if (accumulated >= 10) commitStudy();
  }, 1000);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', commitStudy);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  for (const ev of INTERACTION_EVENTS) window.removeEventListener(ev, noteInteraction);
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('pagehide', commitStudy);
});
</script>

<template>
  <div>
    <nav class="site-nav">
      <a class="brand" :href="hrefs.cards" aria-label="学习 トップへ">
        <span class="brand-mark">学</span>
        <span class="brand-text">
          <span class="brand-name">学习</span>
          <span class="brand-sub">中国語の復習</span>
        </span>
      </a>
      <ul>
        <li><a :href="hrefs.cards" :class="{ active: tab === 'cards' }">レッスンの復習</a></li>
        <li><a :href="hrefs.drill" :class="{ active: tab === 'drill' }">疑問詞ドリル</a></li>
        <li><a :href="hrefs.vocab" :class="{ active: tab === 'vocab' }">単語練習</a></li>
        <li><a :href="hrefs.record" :class="{ active: tab === 'record' }">記録</a></li>
      </ul>
      <span v-if="streakDays > 0" class="streak-pill">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c4.4 0 7.5-3 7.5-7.3 0-3.2-2-5.4-3.4-7.5-.4 1-1 1.8-2 2.3.3-2.9-.6-6.4-3.1-8.5C10.3 7.6 4.5 10.7 4.5 14.7 4.5 19 7.6 22 12 22z"/></svg>
        連続 {{ streakDays }} 日
      </span>
      <span v-else></span>
    </nav>
    <div class="layout">
      <header class="page-head">
        <h1>{{ PAGE_HEADS[tab].title }}</h1>
        <p class="lead">{{ PAGE_HEADS[tab].lead }}</p>
        <p v-if="transferNote" class="status">{{ transferNote }}</p>
        <p class="status">
          <span v-if="doneToday">今日の分は実施済みです。</span>
          <span v-else>今日の分はこれからです。</span>
          <span v-if="streakDays > 0">連続 {{ streakDays }} 日</span>
          <span> ・ 今日の勉強 {{ formatMinutes(todaySeconds) }} 分</span>
        </p>
      </header>

      <p v-if="loading" class="panel center"><span class="spinner"></span>読み込み中...</p>
      <p v-else-if="error" class="panel center">{{ error }}</p>
      <template v-else>
        <ExerciseSession v-if="tab === 'cards'" :cards="dailyCards" :pool="data.cards" @finished="onFinished" />
        <Drill v-else-if="tab === 'drill'" :drills="data.drills" @finished="onFinished" />
        <Vocab v-else-if="tab === 'vocab'" :words="data.words || []" />
        <StudyRecord
          v-else
          :study-log="studyEntries"
          :today-seconds="todaySeconds"
          :streak-days="studyStreakDays"
          :done-dates="doneDates"
          @clear-records="onClearRecords"
        />
      </template>

      <p v-if="tab === 'cards'" class="meta">データ：レッスン議事録から作ったカード（全 {{ data.cards.length }} 枚）</p>

      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
        </div>
        <p class="copy">© {{ year }} freddiefujiwara.com</p>
      </footer>
    </div>
    <nav class="tabbar" aria-label="メインメニュー">
      <a :href="hrefs.cards" :class="{ active: tab === 'cards' }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg>
        復習
      </a>
      <a :href="hrefs.drill" :class="{ active: tab === 'drill' }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        ドリル
      </a>
      <a :href="hrefs.vocab" :class="{ active: tab === 'vocab' }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        単語
      </a>
      <a :href="hrefs.record" :class="{ active: tab === 'record' }">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        記録
      </a>
    </nav>
  </div>
</template>
