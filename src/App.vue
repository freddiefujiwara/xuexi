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

async function onAddManual(minutes) {
  if (!API_URL) return;
  const seconds = minutes * 60;
  try {
    const json = await postStudy(API_URL, { date: todayStr(), seconds, source: 'manual' });
    applyStudyTotal(json.date, json.totalSeconds);
  } catch {
    addPending(seconds);
    unsentSeconds.value += seconds;
  }
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
        <li><a href="https://freddiefujiwara.com/">トップ</a></li>
        <li class="nav-section"><a href="https://freddiefujiwara.com/#about">プロフィール</a></li>
        <li class="nav-section"><a href="https://freddiefujiwara.com/#activity">活動・発信</a></li>
        <li class="nav-section"><a href="https://freddiefujiwara.com/#contact">情報交換</a></li>
        <li><a href="https://freddiefujiwara.com/blog/">ブログ</a></li>
        <li><a href="https://freddiefujiwara.com/list-of-stuff/">持ち物リスト</a></li>
        <li><a href="https://freddiefujiwara.com/music">川口の歌 ♪</a></li>
      </ul>
      <div></div>
    </nav>
    <div class="layout">
      <header class="page-head">
        <p class="page-eyebrow">CHINESE STUDY</p>
        <h1>中国語の復習</h1>
        <p class="lead">マンツーマンレッスンの議事録から作った、そのまま使える例文で復習します。</p>
        <p class="status">
          <span v-if="doneToday">今日の分は実施済みです。</span>
          <span v-else>今日の分はこれからです。</span>
          <span v-if="streakDays > 0">連続 {{ streakDays }} 日</span>
          <span> ・ 今日の勉強 {{ formatMinutes(todaySeconds) }} 分</span>
        </p>
      </header>

      <nav class="tabs">
        <button :class="{ active: tab === 'cards' }" @click="tab = 'cards'">今日の復習</button>
        <button :class="{ active: tab === 'drill' }" @click="tab = 'drill'">疑問詞ドリル</button>
        <button :class="{ active: tab === 'mistakes' }" @click="tab = 'mistakes'">間違いノート</button>
        <button :class="{ active: tab === 'record' }" @click="tab = 'record'">記録</button>
      </nav>

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
          @add-manual="onAddManual"
        />
      </template>

      <p class="meta">データ：レッスン議事録から作ったカード（全 {{ data.cards.length }} 枚）</p>

      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
          <a href="https://freddiefujiwara.com/blog/" target="_blank" rel="noopener">ブログ <span class="arr">↗</span></a>
          <a href="https://freddiefujiwara.com/list-of-stuff/" target="_blank" rel="noopener">持ち物 <span class="arr">↗</span></a>
          <a href="https://freddiefujiwara.com/bucket-list/" target="_blank" rel="noopener">バケットリスト <span class="arr">↗</span></a>
          <a href="https://www.instagram.com/freddiefujiwara" target="_blank" rel="noopener">Instagram <span class="arr">↗</span></a>
          <a href="https://www.facebook.com/freddiefujiwara" target="_blank" rel="noopener">Facebook <span class="arr">↗</span></a>
          <a href="https://www.google.com/maps/contrib/105456242747265663411/reviews" target="_blank" rel="noopener">Googleマップの口コミ <span class="arr">↗</span></a>
          <a href="https://review.travel.rakuten.co.jp/reviewer/fumikazufujiwara" target="_blank" rel="noopener">楽天トラベルの口コミ <span class="arr">↗</span></a>
          <a href="https://tabelog.com/rvwr/zegenvs/" target="_blank" rel="noopener">食べログの口コミ <span class="arr">↗</span></a>
          <a href="https://retty.me/user/50281/" target="_blank" rel="noopener">Rettyの口コミ <span class="arr">↗</span></a>
          <a href="https://x.com/freddiefujiwara" target="_blank" rel="noopener">X <span class="arr">↗</span></a>
          <a href="https://github.com/freddiefujiwara" target="_blank" rel="noopener">GitHub <span class="arr">↗</span></a>
          <a href="https://linkedin.com/in/freddiefujiwara" target="_blank" rel="noopener">LinkedIn <span class="arr">↗</span></a>
          <a href="https://youtrust.jp/users/freddiefujiwara" target="_blank" rel="noopener">YOUTRUST <span class="arr">↗</span></a>
          <a href="https://fril.jp/shop/freddiefujiwara" target="_blank" rel="noopener">ラクマ <span class="arr">↗</span></a>
        </div>
        <p class="copy">© {{ year }} 藤原史和（Fumikazu Fujiwara）— freddiefujiwara.com</p>
      </footer>
    </div>
  </div>
</template>
