<script setup>
import { computed, onMounted, ref } from 'vue';
import ExerciseSession from './components/ExerciseSession.vue';
import Drill from './components/Drill.vue';
import Mistakes from './components/Mistakes.vue';
import { API_URL } from './config.js';
import { selectDailyCards } from './lib/select.js';
import { isDoneToday, loadDone, markDone, streak } from './lib/progress.js';

const tab = ref('cards');
const loading = ref(true);
const error = ref('');
const data = ref({ cards: [], drills: [], mistakes: [] });
const doneToday = ref(false);
const streakDays = ref(0);

const dailyCards = computed(() => selectDailyCards(data.value.cards));

function refreshProgress() {
  doneToday.value = isDoneToday();
  streakDays.value = streak(loadDone());
}

function onFinished() {
  markDone();
  refreshProgress();
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
});
</script>

<template>
  <main class="wrap">
    <header>
      <h1>学习 <span class="sub">中国語レッスンの復習</span></h1>
      <p class="status">
        <span v-if="doneToday">今日の分は実施済みです。</span>
        <span v-else>今日の分はこれからです。</span>
        <span v-if="streakDays > 0">連続 {{ streakDays }} 日</span>
      </p>
    </header>

    <nav class="tabs">
      <button :class="{ active: tab === 'cards' }" @click="tab = 'cards'">今日の復習</button>
      <button :class="{ active: tab === 'drill' }" @click="tab = 'drill'">疑問詞ドリル</button>
      <button :class="{ active: tab === 'mistakes' }" @click="tab = 'mistakes'">間違いノート</button>
    </nav>

    <p v-if="loading" class="panel center">読み込み中...</p>
    <p v-else-if="error" class="panel center">{{ error }}</p>
    <template v-else>
      <ExerciseSession v-if="tab === 'cards'" :cards="dailyCards" :pool="data.cards" @finished="onFinished" />
      <Drill v-else-if="tab === 'drill'" :drills="data.drills" @finished="onFinished" />
      <Mistakes v-else :mistakes="data.mistakes" />
    </template>

    <footer>
      <p class="meta">データ：レッスン議事録から作ったカード（全 {{ data.cards.length }} 枚）</p>
    </footer>
  </main>
</template>
