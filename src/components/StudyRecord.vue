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
const PAGE_URL = 'https://freddiefujiwara.com/xuexi';
const xIntent = computed(
  () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextValue.value)}&url=${encodeURIComponent(PAGE_URL)}`
);
const facebookIntent = computed(
  () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(PAGE_URL)}`
);
const lineIntent = computed(
  () => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(PAGE_URL)}`
);
const threadsIntent = computed(
  () =>
    `https://www.threads.net/intent/post?text=${encodeURIComponent(`${shareTextValue.value}\n${PAGE_URL}`)}`
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
        <div class="share-row">
          <a class="share-pill" :href="xIntent" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.77 7.74L24.2 22h-6.23l-4.88-6.38L7.5 22H4.34l7.24-8.28L2.4 2h6.39l4.41 5.83L18.9 2zm-1.1 18.1h1.73L7.86 3.8H6.01L17.8 20.1z"/></svg>X</a>
          <a class="share-pill" :href="facebookIntent" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.93.26-1.56 1.6-1.56h1.6V4.3c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.41-3.9 4v2.62H7.7V14h2.76v8h3.04z"/></svg>Facebook</a>
          <a class="share-pill" :href="lineIntent" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.97 7.36 9.33 7.83.36.08.85.24.97.56.11.28.07.72.03.99l-.15.9c-.05.28-.22 1.1.97.6 1.19-.5 6.42-3.78 8.76-6.46C22.36 12.9 22 12.03 22 11.1 22 6.6 17.5 3 12 3zM8.34 13.42H6.06c-.3 0-.55-.25-.55-.55V8.98c0-.3.25-.55.55-.55.3 0 .55.25.55.55v3.34h1.73c.3 0 .55.25.55.55 0 .3-.25.55-.55.55zm1.7-.55c0 .3-.25.55-.55.55-.3 0-.55-.25-.55-.55V8.98c0-.3.25-.55.55-.55.3 0 .55.25.55.55v3.89zm4.9 0c0 .3-.19.47-.4.47-.14 0-.27-.06-.41-.2l-2.28-2.77v2.5c0 .3-.25.55-.55.55-.3 0-.55-.25-.55-.55V8.98c0-.3.25-.55.55-.55.16 0 .31.07.42.2l2.28 2.77V8.98c0-.3.25-.55.55-.55.3 0 .55.25.55.55v3.89zm3.05-2.22c.3 0 .55.25.55.55 0 .3-.25.55-.55.55h-1.73v.57h1.73c.3 0 .55.25.55.55 0 .3-.25.55-.55.55h-2.28c-.3 0-.55-.25-.55-.55V8.98c0-.3.25-.55.55-.55h2.28c.3 0 .55.25.55.55 0 .3-.25.55-.55.55h-1.73v.57h1.73z"/></svg>LINE</a>
          <a class="share-pill" :href="threadsIntent" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.6 8.2c-.2-1-.6-1.84-1.3-2.5C15.22 4.66 13.9 4.2 12.36 4.2c-.05 0-.1 0-.15.01-1.6.03-3.02.55-4.1 1.5a5.35 5.35 0 0 0-1.63 3.04c-.11.7-.12 1.44-.03 2.2.2 1.66.96 3.1 2.15 4.07.93.76 2.06 1.16 3.24 1.16.08 0 .15 0 .23-.01 1.18-.05 2.27-.45 3.12-1.14.12-.1.24-.2.35-.31.03.24.04.48.03.71-.04 1.03-.4 1.84-1.06 2.42-.6.53-1.44.82-2.42.82-1.1.02-2.02-.3-2.67-.93-.5-.48-.83-1.16-.95-1.97H6.4c.14 1.24.66 2.32 1.47 3.1.95.9 2.25 1.36 3.77 1.34 1.4-.02 2.64-.45 3.58-1.24 1.05-.88 1.64-2.15 1.7-3.67.03-.7-.04-1.44-.2-2.2l-.55-2.62-.02-.09c-.17-.75-.47-1.4-.9-1.94-.66-.83-1.6-1.32-2.72-1.4-1.02-.08-1.98.16-2.7.68-.63.45-1.05 1.1-1.18 1.83-.11.62.03 1.22.4 1.7.4.53 1.02.85 1.74.9.6.05 1.2-.1 1.75-.42l.42-.25-.78-.62-.3.18c-.34.2-.7.3-1.03.27-.4-.03-.73-.2-.94-.48-.2-.26-.27-.58-.21-.93.08-.45.35-.86.76-1.15.5-.36 1.17-.52 1.88-.46.8.06 1.46.4 1.92.97.3.38.52.86.64 1.4l.52 2.47c-.17.2-.36.4-.57.58-.66.57-1.48.89-2.37.93-1.9.08-3.6-.67-4.77-2.1-.78-.96-1.3-2.2-1.45-3.52-.08-.64-.07-1.26.02-1.84.14-.9.6-1.75 1.3-2.4.86-.8 2.02-1.26 3.27-1.28 1.27-.02 2.36.4 3.16 1.22.48.5.8 1.13.96 1.87l.04.2h1.72l-.07-.35z"/></svg>Threads</a>
          <button type="button" class="share-pill" @click="copyShareText"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a4 4 0 0 0 5.66 0l3.54-3.54a4 4 0 1 0-5.66-5.65l-1.77 1.76 1.42 1.42 1.77-1.77a2 2 0 1 1 2.82 2.83l-3.53 3.54a2 2 0 0 1-2.83 0l-1.42 1.41zm2.83-2.83a4 4 0 0 0-5.66 0L4.23 14.1a4 4 0 1 0 5.66 5.66l1.77-1.77-1.42-1.41-1.77 1.76a2 2 0 1 1-2.82-2.82l3.53-3.54a2 2 0 0 1 2.83 0l1.42-1.42z"/></svg>{{ copied ? 'コピーしました' : '文をコピー' }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.share-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.share-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.share-pill:hover {
  border-color: var(--link);
  color: var(--link);
}
.share-pill svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
  flex: none;
}
</style>
