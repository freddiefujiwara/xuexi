<script setup>
import { computed, ref } from 'vue';
import { shuffle } from '../lib/select.js';

const props = defineProps({
  drills: { type: Array, default: () => [] },
});
const emit = defineEmits(['finished']);

const queue = ref(shuffle(props.drills).slice(0, 5));
const index = ref(0);
const revealed = ref(false);

const current = computed(() => queue.value[index.value] || null);
const finished = computed(() => !current.value);

function next() {
  index.value++;
  revealed.value = false;
  if (finished.value) emit('finished');
}
</script>

<template>
  <section>
    <div v-if="finished" class="panel center">
      <p class="big">问答练习完了！</p>
      <p>疑問詞ドリルは全部終わりました。</p>
    </div>
    <div v-else class="panel">
      <p class="meta">{{ index + 1 }} 問目 ・ 疑問詞：{{ current.qword }}</p>
      <p class="zh">{{ current.question }}</p>
      <p class="pinyin">{{ current.q_pinyin }}</p>
      <div v-if="revealed" class="answer">
        <p class="zh small">{{ current.answer }}</p>
        <p class="pinyin">{{ current.a_pinyin }}</p>
      </div>
      <div class="row">
        <button v-if="!revealed" class="primary" @click="revealed = true">模範解答を見る</button>
        <button v-else class="primary" @click="next">次へ</button>
      </div>
      <p class="hint">声に出して答えてから、模範解答と比べてください。</p>
    </div>
  </section>
</template>
