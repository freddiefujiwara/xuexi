<script setup>
import { computed, ref } from 'vue';
import { formatLesson } from '../lib/format.js';

const props = defineProps({
  cards: { type: Array, default: () => [] },
});
const emit = defineEmits(['finished']);

const queue = ref([...props.cards]);
const index = ref(0);
const revealed = ref(false);
const missed = ref([]);
const doneCount = ref(0);

const current = computed(() => queue.value[index.value] || null);
const total = computed(() => props.cards.length + missed.value.length);
const finished = computed(() => !current.value);

function answer(ok) {
  if (!current.value) return;
  if (!ok) missed.value.push(current.value);
  doneCount.value++;
  index.value++;
  revealed.value = false;
  // 最後まで行ったら、「まだ」のカードをもう一周する。
  if (index.value >= queue.value.length && missed.value.length > 0) {
    queue.value = [...missed.value];
    missed.value = [];
    index.value = 0;
  }
  if (!current.value) emit('finished');
}
</script>

<template>
  <section>
    <div v-if="finished" class="panel center">
      <p class="big">今天的复习完了！</p>
      <p>レッスンの復習カードは全部終わりました。</p>
    </div>
    <div v-else class="panel">
      <p class="meta">{{ doneCount + 1 }} 枚目 ・ {{ formatLesson(current.lesson) }} のレッスン（{{ current.pillar }}）</p>
      <p class="zh">{{ current.zh }}</p>
      <div v-if="revealed" class="answer">
        <p class="pinyin">{{ current.pinyin }}</p>
        <p>{{ current.ja }}</p>
      </div>
      <div class="row">
        <button v-if="!revealed" class="primary" @click="revealed = true">ピンインと訳を見る</button>
        <template v-else>
          <button class="primary" @click="answer(true)">言えた</button>
          <button class="ghost" @click="answer(false)">まだ</button>
        </template>
      </div>
      <p class="hint">声に出して言ってから、自己判定してください。</p>
    </div>
  </section>
</template>
