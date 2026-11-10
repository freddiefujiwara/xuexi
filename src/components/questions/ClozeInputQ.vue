<script setup>
import { ref } from 'vue';
import AudioButton from '../AudioButton.vue';
import { cardAudioFile } from '../../lib/audio.js';

import { answersMatch } from '../../lib/exercises.js';

const props = defineProps({ q: { type: Object, required: true } });
const emit = defineEmits(['done']);

const input = ref('');
const ok = ref(null);

function judge() {
  if (ok.value !== null || !input.value.trim()) return;
  ok.value = answersMatch(input.value, props.q.answer);
}
</script>

<template>
  <div>
    <p class="zh">{{ q.text }}</p>
    <p>{{ q.card.ja }}</p>
    <p class="meta">空欄に入る語を入力してください（ピンイン入力で変換してOK）。</p>
    <div class="row">
      <input v-model="input" class="cloze-input" type="text" :disabled="ok !== null" placeholder="空欄の語" @keyup.enter="judge" />
      <button class="primary" :disabled="ok !== null || !input.trim()" @click="judge">答え合わせ</button>
    </div>
    <div v-if="ok !== null" class="answer">
      <p :class="ok ? 'right' : 'wrong'">
        {{ ok ? '正解！' : `不正解…（あなた：${input} ／ 正解：${q.answer}）` }}
      </p>
      <p class="zh small">{{ q.card.zh }}</p>
      <p class="pinyin">{{ q.card.pinyin }}</p>
      <div class="row">
        <button class="primary" @click="emit('done', ok)">次へ</button>
        <AudioButton :file="cardAudioFile(q.card)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cloze-input {
  flex: 2; padding: 12px; border-radius: 12px; font-size: 16px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
}
</style>
