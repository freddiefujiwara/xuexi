<script setup>
import { computed, ref } from 'vue';
import { buildSession } from '../lib/exercises.js';
import ChoiceQ from './questions/ChoiceQ.vue';
import ClozeChoiceQ from './questions/ClozeChoiceQ.vue';
import ClozeInputQ from './questions/ClozeInputQ.vue';
import OrderQ from './questions/OrderQ.vue';
import CardQ from './questions/CardQ.vue';

const props = defineProps({
  cards: { type: Array, default: () => [] },
  pool: { type: Array, default: () => [] },
});
const emit = defineEmits(['finished']);

const LABELS = {
  choice: '選択問題',
  'cloze-choice': '穴埋め（選択）',
  'cloze-input': '穴埋め（入力）',
  order: '並べ替え',
  card: 'カード',
};
const COMPONENTS = {
  choice: ChoiceQ,
  'cloze-choice': ClozeChoiceQ,
  'cloze-input': ClozeInputQ,
  order: OrderQ,
  card: CardQ,
};

const queue = ref(buildSession(props.cards, props.pool.length ? props.pool : props.cards));
const index = ref(0);
const round = ref(0);
const missed = ref([]);
const seenCount = ref(0);
const firstTryTotal = ref(queue.value.length);
const firstTryCorrect = ref(0);

const current = computed(() => queue.value[index.value] || null);
const progressPct = computed(() =>
  firstTryTotal.value > 0 ? Math.min(100, Math.round((seenCount.value / firstTryTotal.value) * 100)) : 0
);
const finished = computed(() => !current.value);

// lesson は '2026-11-07' でも ISO 日時でも来るので先頭10文字でそろえる。
function lessonLabel(lesson) {
  return String(lesson ?? '').slice(0, 10);
}

function onDone(ok) {
  if (!current.value) return;
  seenCount.value++;
  if (round.value === 0 && ok) firstTryCorrect.value++;
  if (!ok) missed.value.push(current.value);
  index.value++;
  if (index.value >= queue.value.length && missed.value.length > 0) {
    queue.value = [...missed.value];
    missed.value = [];
    index.value = 0;
    round.value++;
  }
  if (!current.value) emit('finished');
}
</script>

<template>
  <section>
    <div v-if="finished" class="panel center">
      <p class="big">今天的练习完了！</p>
      <p>今日の演習は全部終わりました。</p>
      <p v-if="firstTryTotal > 0" class="meta">一発で正解 {{ firstTryCorrect }} / {{ firstTryTotal }} 問</p>
    </div>
    <div v-else class="panel">
      <div class="sess-head">
        <span class="tag">{{ LABELS[current.type] }}</span>
        <span class="tag gray">{{ lessonLabel(current.card.lesson) }} のレッスン ・ {{ current.card.pillar }}</span>
        <span v-if="round > 0" class="tag">再挑戦</span>
      </div>
      <div v-if="round === 0" class="prog">
        <div class="prog-row"><span>進み具合</span><span><b>{{ seenCount }}</b> / {{ firstTryTotal }} 問</span></div>
        <div class="bar"><i :style="{ width: progressPct + '%' }"></i></div>
      </div>
      <component
        :is="COMPONENTS[current.type]"
        :key="`${round}-${index}`"
        :q="current"
        @done="onDone"
      />
    </div>
  </section>
</template>
