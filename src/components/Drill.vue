<script setup>
import { computed, ref } from 'vue';
import { shuffle } from '../lib/select.js';
import { API_URL } from '../config.js';
import AudioButton from './AudioButton.vue';

const props = defineProps({
  drills: { type: Array, default: () => [] },
});
const emit = defineEmits(['finished']);

const VERDICTS = {
  correct: { label: '✓ 正解！', cls: 'ok' },
  close: { label: 'ほぼ正解（惜しい）', cls: 'ok' },
  wrong: { label: '✗ 不正解', cls: 'ng' },
};

const queue = ref(shuffle(props.drills).slice(0, 5));
const index = ref(0);
const round = ref(0);
const missed = ref([]);
const seenCount = ref(0);
const input = ref('');
const phase = ref('input'); // input | judging | result | fallback
const result = ref(null);

const current = computed(() => queue.value[index.value] || null);
const finished = computed(() => !current.value);

async function judge() {
  if (!current.value || !input.value.trim() || phase.value === 'judging') return;
  phase.value = 'judging';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        question: current.value.question,
        qword: current.value.qword,
        expected: current.value.answer,
        answer: input.value,
      }),
    });
    const data = await res.json();
    if (data && data.ok && VERDICTS[data.verdict]) {
      result.value = data;
      phase.value = 'result';
      return;
    }
  } catch (e) {
    // 通信失敗時は自己判定に落とす
  }
  phase.value = 'fallback';
}

function done(ok) {
  if (!current.value) return;
  seenCount.value++;
  if (!ok) missed.value.push(current.value);
  index.value++;
  input.value = '';
  result.value = null;
  phase.value = 'input';
  if (index.value >= queue.value.length && missed.value.length > 0) {
    queue.value = [...missed.value];
    missed.value = [];
    index.value = 0;
    round.value++;
  }
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
      <p class="meta">
        {{ seenCount + 1 }} 問目 ・ 疑問詞：{{ current.qword }}
        <span v-if="round > 0"> ・ 再挑戦</span>
      </p>
      <p class="zh">{{ current.question }}</p>
      <p class="pinyin">{{ current.q_pinyin }}</p>
      <div class="row"><AudioButton :text="current.question" label="質問を聞く" /></div>

      <template v-if="phase === 'input' || phase === 'judging'">
        <p class="meta">中国語で答えを入力してください（声に出してから打つのがおすすめです）。</p>
        <div class="row">
          <input
            v-model="input"
            class="drill-input"
            type="text"
            :disabled="phase === 'judging'"
            placeholder="あなたの答え"
            @keyup.enter="judge"
          />
          <button class="primary" :disabled="phase === 'judging' || !input.trim()" @click="judge">
            {{ phase === 'judging' ? '判定中…' : '判定する' }}
          </button>
        </div>
        <p class="hint">
          <button class="linklike" :disabled="phase === 'judging'" @click="phase = 'fallback'">AI判定を使わず自己判定する</button>
        </p>
      </template>

      <template v-else-if="phase === 'result'">
        <div class="answer">
          <p class="verdict" :class="VERDICTS[result.verdict].cls">{{ VERDICTS[result.verdict].label }}</p>
          <p v-if="result.comment" class="point">{{ result.comment }}</p>
          <p class="meta">模範解答</p>
          <p class="zh small">{{ current.answer }}</p>
          <p class="pinyin">{{ current.a_pinyin }}</p>
          <div class="row"><AudioButton :text="current.answer" label="模範解答を聞く" /></div>
          <p class="meta">あなたの答え：{{ input }}</p>
        </div>
        <div class="row">
          <button class="primary" @click="done(result.verdict !== 'wrong')">次へ</button>
        </div>
      </template>

      <template v-else>
        <p class="hint">AI判定が使えないため、自己判定します。声に出して答えてから模範解答と比べてください。</p>
        <div class="answer">
          <p class="zh small">{{ current.answer }}</p>
          <p class="pinyin">{{ current.a_pinyin }}</p>
          <div class="row"><AudioButton :text="current.answer" label="模範解答を聞く" /></div>
        </div>
        <div class="row">
          <button class="primary" @click="done(true)">言えた</button>
          <button class="ghost" @click="done(false)">まだ</button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.drill-input {
  flex: 2; padding: 12px; border-radius: 14px; font-size: 16px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
}
.linklike {
  background: none; border: none; color: var(--link-active); cursor: pointer;
  font-size: 12px; padding: 0; text-decoration: underline;
}
</style>
