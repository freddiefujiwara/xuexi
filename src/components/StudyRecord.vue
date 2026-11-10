<script setup>
import { computed, onMounted, ref } from 'vue';
import { buildCalendar, buildShareText, formatMinutes, logByDate, monthSummary } from '../lib/study.js';
import { buildShareCanvas, prefersShareSheet, shareCanvasImage } from '../lib/shareImage.js';
import { todayStr } from '../lib/progress.js';

const props = defineProps({
  studyLog: { type: Array, default: () => [] },
  todaySeconds: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
});

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth() + 1);

const byDate = computed(() => logByDate(props.studyLog));
const cells = computed(() => buildCalendar(viewYear.value, viewMonth.value, byDate.value));
const summary = computed(() => monthSummary(viewYear.value, viewMonth.value, byDate.value));
const today = todayStr();
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

function moveMonth(delta) {
  const d = new Date(viewYear.value, viewMonth.value - 1 + delta, 1);
  viewYear.value = d.getFullYear();
  viewMonth.value = d.getMonth() + 1;
}

const imageNote = ref('');
const shareNote = ref('');
const showShareFallback = ref(false);
const copied = ref(false);

const shareTextValue = computed(() =>
  buildShareText({ seconds: props.todaySeconds, streakDays: props.streakDays })
);
const xIntent = computed(
  () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextValue.value)}`
);
const threadsIntent = computed(
  () => `https://www.threads.net/intent/post?text=${encodeURIComponent(shareTextValue.value)}`
);

async function copyShareText() {
  try {
    await navigator.clipboard.writeText(shareTextValue.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    shareNote.value = 'コピーできませんでした。上の文を長押しでコピーしてください。';
  }
}

// 共有シートで出すのは「ファイル共有ができて、タッチ主体の端末」のときだけ。
// PC では最初からコピー＋投稿リンクの形にする（PCにも navigator.share はあるため）。
const sheetMode = ref(false);
onMounted(() => {
  let canFiles = false;
  try {
    canFiles = !!(
      navigator.canShare &&
      navigator.canShare({ files: [new File(['x'], 'x.png', { type: 'image/png' })] })
    );
  } catch {
    canFiles = false;
  }
  sheetMode.value = prefersShareSheet({
    hasShare: !!navigator.share,
    canShareFiles: canFiles,
    coarsePointer: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
  });
});

function buildCanvas() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return buildShareCanvas({
    year: viewYear.value,
    month: viewMonth.value,
    byDate: byDate.value,
    todaySeconds: props.todaySeconds,
    streakDays: props.streakDays,
    dark,
    today,
  });
}

async function saveImageOnly() {
  imageNote.value = '';
  try {
    const canvas = await buildCanvas();
    const how = await shareCanvasImage(canvas);
    imageNote.value = how === 'shared' ? '共有しました。' : '画像をダウンロードしました。';
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    imageNote.value = '画像を作れませんでした。';
  }
}

async function shareAll() {
  imageNote.value = '';
  shareNote.value = '';
  try {
    const canvas = await buildCanvas();
    const how = await shareCanvasImage(canvas, shareTextValue.value);
    if (how === 'shared') {
      imageNote.value = '共有しました。';
    } else {
      // 共有シートが無い環境では、画像を保存して投稿文の貼り付け先を出す。
      imageNote.value = '画像をダウンロードしました。投稿文は下からどうぞ。';
      showShareFallback.value = true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    imageNote.value = '共有できませんでした。';
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
      <p class="meta">SNS投稿用</p>
      <div v-if="sheetMode" class="row">
        <button class="primary" @click="shareAll">学習記録をSNSに共有</button>
        <button class="ghost" @click="saveImageOnly">画像で保存</button>
      </div>
      <div v-else class="row">
        <button class="primary" @click="saveImageOnly">画像で保存</button>
      </div>
      <p v-if="imageNote" class="hint">{{ imageNote }}</p>
      <p v-if="shareNote" class="hint">{{ shareNote }}</p>
      <div v-if="!sheetMode || showShareFallback">
        <textarea class="share-text" readonly rows="3" :value="shareTextValue"></textarea>
        <div class="row">
          <button class="ghost" @click="copyShareText">{{ copied ? 'コピーしました' : 'コピー' }}</button>
          <a class="share-link" :href="xIntent" target="_blank" rel="noopener">Xで投稿</a>
          <a class="share-link" :href="threadsIntent" target="_blank" rel="noopener">Threadsで投稿</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.share-link {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
  font-size: 0.9rem;
}
</style>
