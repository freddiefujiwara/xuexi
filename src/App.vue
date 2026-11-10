<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ExerciseSession from './components/ExerciseSession.vue';
import Drill from './components/Drill.vue';
import Mistakes from './components/Mistakes.vue';
import StudyRecord from './components/StudyRecord.vue';
import { API_URL } from './config.js';
import { selectDailyCards } from './lib/select.js';
import { isDoneToday, loadDone, markDone, streak, todayStr } from './lib/progress.js';
import {
  addPending,
  clearBuffer,
  clearPending,
  formatMinutes,
  loadBuffer,
  loadPending,
  logByDate,
  postStudy,
  saveBuffer,
} from './lib/study.js';

const year = new Date().getFullYear();
const tab = ref('cards');
const loading = ref(true);
const error = ref('');
const data = ref({ cards: [], drills: [], mistakes: [], studyLog: [] });
const doneToday = ref(false);
const streakDays = ref(0);
// サーバー未送信の学習秒数（この画面で計測中＋前回の退避分）。
const unsentSeconds = ref(0);
let accumulated = 0;
let timer = null;

const dailyCards = computed(() => selectDailyCards(data.value.cards));
const studyByDate = computed(() => logByDate(data.value.studyLog));
const todaySeconds = computed(
  () => (studyByDate.value[todayStr()] || 0) + unsentSeconds.value
);
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

function applyStudyTotal(date, totalSeconds) {
  const log = [...(data.value.studyLog || [])];
  const idx = log.findIndex((r) => r.date === date);
  if (idx >= 0) log[idx] = { date, seconds: totalSeconds };
  else log.push({ date, seconds: totalSeconds });
  data.value = { ...data.value, studyLog: log };
}

async function flushStudy() {
  if (!API_URL || accumulated <= 0) return;
  const seconds = accumulated;
  accumulated = 0;
  clearBuffer();
  try {
    const json = await postStudy(API_URL, { date: todayStr(), seconds, source: 'auto' });
    unsentSeconds.value = Math.max(0, unsentSeconds.value - seconds);
    applyStudyTotal(json.date, json.totalSeconds);
  } catch {
    addPending(seconds);
  }
}

async function flushPending() {
  if (!API_URL) return;
  const pending = loadPending();
  const dates = Object.keys(pending);
  if (dates.length === 0) return;
  let allOk = true;
  for (const date of dates) {
    try {
      const json = await postStudy(API_URL, { date, seconds: pending[date], source: 'auto' });
      applyStudyTotal(json.date, json.totalSeconds);
      if (date === todayStr()) {
        unsentSeconds.value = Math.max(0, unsentSeconds.value - pending[date]);
      }
    } catch {
      allOk = false;
    }
  }
  if (allOk) clearPending();
}

function onVisibility() {
  if (document.visibilityState === 'hidden') flushStudy();
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
  // 前回、閉じる前に退避した計測分を未送信分へ寄せる。
  const buffer = loadBuffer();
  if (buffer) {
    addPending(buffer.seconds, localStorage, buffer.date);
    clearBuffer();
  }
  const pending = loadPending();
  unsentSeconds.value = pending[todayStr()] || 0;
  await flushPending();
  // 学習タブを開いている間だけ、画面が見えている時間を計測する。
  timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!['cards', 'drill', 'mistakes'].includes(tab.value)) return;
    accumulated++;
    unsentSeconds.value++;
    if (accumulated % 10 === 0) saveBuffer(accumulated);
    if (accumulated >= 60) flushStudy();
  }, 1000);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flushStudy);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('pagehide', flushStudy);
});
</script>

<template>
  <div>
    <nav class="site-nav">
      <a class="brand" href="https://freddiefujiwara.com/">藤原史和｜川口を歩くQAエンジニア</a>
      <ul>
        <li><button type="button" :class="{ active: tab === 'cards' }" @click="tab = 'cards'">今日の復習</button></li>
        <li><button type="button" :class="{ active: tab === 'drill' }" @click="tab = 'drill'">疑問詞ドリル</button></li>
        <li><button type="button" :class="{ active: tab === 'mistakes' }" @click="tab = 'mistakes'">間違いノート</button></li>
        <li><button type="button" :class="{ active: tab === 'record' }" @click="tab = 'record'">記録</button></li>
      </ul>
      <div></div>
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
        <Mistakes v-else-if="tab === 'mistakes'" :mistakes="data.mistakes" />
        <StudyRecord
          v-else
          :study-log="data.studyLog || []"
          :today-seconds="todaySeconds"
          :streak-days="studyStreakDays"
        />
      </template>

      <p class="meta">データ：レッスン議事録から作ったカード（全 {{ data.cards.length }} 枚）</p>

      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
        </div>
        <p class="copy">© {{ year }} 藤原史和（Fumikazu Fujiwara）— freddiefujiwara.com</p>
      </footer>
    </div>
  </div>
</template>
