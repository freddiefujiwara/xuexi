<script setup>
import { computed, ref } from 'vue';
import { buildCalendar, buildMinchalleText, formatMinutes, logByDate, monthSummary } from '../lib/study.js';
import { buildShareCanvas, shareCanvasImage } from '../lib/shareImage.js';
import { todayStr } from '../lib/progress.js';

const props = defineProps({
  studyLog: { type: Array, default: () => [] },
  todaySeconds: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
});

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth() + 1);
const copied = ref(false);
const showText = ref(false);

const byDate = computed(() => logByDate(props.studyLog));
const cells = computed(() => buildCalendar(viewYear.value, viewMonth.value, byDate.value));
const summary = computed(() => monthSummary(viewYear.value, viewMonth.value, byDate.value));
const today = todayStr();
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

const shareText = computed(() =>
  buildMinchalleText({ date: today, seconds: props.todaySeconds, streakDays: props.streakDays })
);

function moveMonth(delta) {
  const d = new Date(viewYear.value, viewMonth.value - 1 + delta, 1);
  viewYear.value = d.getFullYear();
  viewMonth.value = d.getMonth() + 1;
}

const imageNote = ref('');

async function saveImage() {
  imageNote.value = '';
  try {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const canvas = await buildShareCanvas({
      year: viewYear.value,
      month: viewMonth.value,
      byDate: byDate.value,
      todaySeconds: props.todaySeconds,
      streakDays: props.streakDays,
      dark,
      today,
    });
    const how = await shareCanvasImage(canvas);
    imageNote.value = how === 'shared' ? '共有しました。' : '画像をダウンロードしました。';
  } catch {
    imageNote.value = '画像を作れませんでした。';
  }
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(shareText.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    showText.value = true;
  }
}
</script>

<template>
  <section class="panel">
    <p class="big">今日の勉強 {{ formatMinutes(todaySeconds) }} 分</p>
    <p class="meta">連続 {{ streakDays }} 日</p>

    <div class="cal-head">
      <button class="ghost cal-nav" @click="moveMonth(-1)">←</button>
      <p class="cal-title">{{ viewYear }}年{{ viewMonth }}月</p>
      <button class="ghost cal-nav" @click="moveMonth(1)">→</button>
    </div>
    <div class="cal-grid cal-week">
      <span v-for="w in weekdays" :key="w" class="cal-wd">{{ w }}</span>
    </div>
    <div class="cal-grid">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="cal-cell"
        :class="[cell ? `lv${cell.level}` : 'empty', cell && cell.date === today ? 'today' : '']"
      >
        <template v-if="cell">
          <span class="cal-day">{{ cell.day }}</span>
          <span v-if="cell.seconds > 0" class="cal-min">{{ formatMinutes(cell.seconds) }}分</span>
        </template>
      </div>
    </div>
    <p class="meta">今月は {{ summary.days }} 日、合計 {{ formatMinutes(summary.seconds) }} 分勉強しました。</p>

    <div class="answer">
      <p class="meta">みんチャレ投稿用</p>
      <div class="row">
        <button class="primary" @click="copyText">{{ copied ? 'コピーしました' : '今日の記録をコピー' }}</button>
        <button class="ghost" @click="saveImage">画像で保存</button>
        <button class="ghost" @click="showText = !showText">テキストを見る</button>
      </div>
      <p v-if="imageNote" class="hint">{{ imageNote }}</p>
      <textarea v-if="showText" class="share-text" readonly rows="3" :value="shareText"></textarea>
    </div>
  </section>
</template>
