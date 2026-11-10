<script setup>
import { ref } from 'vue';

const props = defineProps({ q: { type: Object, required: true } });
const emit = defineEmits(['done']);

const picked = ref(null);
const ok = ref(null);

function judge(option) {
  if (ok.value !== null) return;
  picked.value = option;
  ok.value = option === props.q.answer;
}
</script>

<template>
  <div>
    <p class="zh">{{ q.text }}</p>
    <p>{{ q.card.ja }}</p>
    <p class="meta">空欄に入るものを選んでください。</p>
    <div class="options">
      <button
        v-for="option in q.options"
        :key="option"
        class="option"
        :class="{ correct: ok !== null && option === q.answer, wrongpick: ok === false && option === picked }"
        @click="judge(option)"
      >
        {{ option }}
      </button>
    </div>
    <div v-if="ok !== null" class="answer">
      <p :class="ok ? 'right' : 'wrong'">{{ ok ? '正解！' : `不正解…（正解は「${q.answer}」）` }}</p>
      <p class="zh small">{{ q.card.zh }}</p>
      <p class="pinyin">{{ q.card.pinyin }}</p>
      <div class="row">
        <button class="primary" @click="emit('done', ok)">次へ</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.options { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.option {
  text-align: left; padding: 12px; border-radius: 12px; font-size: 16px; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border); color: var(--text);
}
.option.correct { border-color: var(--ok); background: var(--ok-bg); }
.option.wrongpick { border-color: var(--error); background: color-mix(in srgb, var(--error) 8%, var(--surface)); }
</style>
