<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ExerciseSession from './components/ExerciseSession.vue';
import Drill from './components/Drill.vue';
import Vocab from './components/Vocab.vue';
import StudyRecord from './components/StudyRecord.vue';
import { API_URL } from './config.js';
import { selectDailyCards } from './lib/select.js';
import { clearDone, isDoneToday, loadDone, markDone, streak, todayStr } from './lib/progress.js';
import {
  addStudySeconds,
  clearStudyLog,
  formatMinutes,
  importServerStudyLog,
  isCountingActive,
  loadStudyLog,
  studyLogEntries,
} from './lib/study.js';
import { tabFromPath, tabHrefs } from './lib/nav.js';

const year = new Date().getFullYear();
const tab = ref(tabFromPath(location.pathname));
const hrefs = tabHrefs(location.pathname);
const loading = ref(true);
const error = ref('');
const data = ref({ cards: [], drills: [], mistakes: [], words: [], studyLog: [] });
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
  doneToday.value = isDoneToday();
  streakDays.value = streak(loadDone());
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
  if (!API_URL) {
    error.value = 'データAPIのURLが未設定です（ビルド時の設定待ち）。';
    loading.value = false;
    return;
  }
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.value = await res.json();
  } catch (e) {
    error.value = `データを読み込めませんでした（${e.message}）。時間をおいて開き直してください。`;
  } finally {
    loading.value = false;
  }
  // サーバー保存だった頃の履歴を一度だけ端末へ取り込む（取得できた時だけ）。
  if (!error.value) {
    localLog.value = importServerStudyLog(data.value.studyLog);
  }
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
      <ul>
        <li><a :href="hrefs.cards" :class="{ active: tab === 'cards' }">レッスンの復習</a></li>
        <li><a :href="hrefs.drill" :class="{ active: tab === 'drill' }">疑問詞ドリル</a></li>
        <li><a :href="hrefs.vocab" :class="{ active: tab === 'vocab' }">単語練習</a></li>
        <li><a :href="hrefs.record" :class="{ active: tab === 'record' }">記録</a></li>
      </ul>
    </nav>
    <div class="layout">
      <header class="page-head">
        <h1>学习</h1>
        <p class="lead">レッスンで学んだことの復習</p>
        <p class="status">
          <span v-if="doneToday">今日の分は実施済みです。</span>
          <span v-else>今日の分はこれからです。</span>
          <span v-if="streakDays > 0">連続 {{ streakDays }} 日</span>
          <span> ・ 今日の勉強 {{ formatMinutes(todaySeconds) }} 分</span>
        </p>
      </header>

      <p v-if="loading" class="panel center">読み込み中...</p>
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
          @clear-records="onClearRecords"
        />
      </template>

      <p class="meta">データ：レッスン議事録から作ったカード（全 {{ data.cards.length }} 枚）</p>

      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
        </div>
        <p class="copy">© {{ year }} freddiefujiwara.com</p>
      </footer>
    </div>
  </div>
</template>
