<script setup>
import { computed, ref } from 'vue';
import AudioButton from './AudioButton.vue';
import { filterByLevel, judgeWord, pickWords } from '../lib/vocab.js';

const props = defineProps({
  words: { type: Array, default: () => [] },
});

const LEVELS = [
  { key: 'all', label: '全部' },
  { key: 1, label: 'HSK1' },
  { key: 2, label: 'HSK2' },
  { key: 3, label: 'HSK3' },
];

const level = ref('all');
const queue = ref([]);
const current = ref(null);
const input = ref('');
const answered = ref(null); // null | true | false
const attempted = ref(new Set());
const total = ref(0);
const firstTry = ref(0);
const finished = ref(false);

const countFor = (key) => filterByLevel(props.words, key).length;

function start() {
  const picked = pickWords(filterByLevel(props.words, level.value), 10);
  queue.value = picked.slice(1);
  current.value = picked[0] || null;
  total.value = picked.length;
  firstTry.value = 0;
  attempted.value = new Set();
  finished.value = false;
  input.value = '';
  answered.value = null;
}

function setLevel(key) {
  level.value = key;
  queue.value = [];
  current.value = null;
  finished.value = false;
  answered.value = null;
  input.value = '';
}

function judge() {
  if (answered.value !== null || !input.value.trim() || !current.value) return;
  const ok = judgeWord(input.value, current.value, props.words);
  const first = !attempted.value.has(current.value.id);
  attempted.value.add(current.value.id);
  if (ok && first) firstTry.value++;
  answered.value = ok;
}

function next() {
  if (!current.value) return;
  if (answered.value === false) queue.value.push(current.value);
  const nxt = queue.value.shift();
  current.value = nxt || null;
  input.value = '';
  answered.value = null;
  if (!nxt) finished.value = true;
}
</script>

<template>
  <section class="panel">
    <div class="row chips">
      <button
        v-for="lv in LEVELS"
        :key="lv.key"
        type="button"
        class="chip"
        :class="{ active: level === lv.key }"
        @click="setLevel(lv.key)"
      >
        {{ lv.label }}（{{ countFor(lv.key) }}）
      </button>
    </div>

    <template v-if="!current && !finished">
      <p class="meta">日本語訳を見て、中国語を入力してください。中国語でもピンインでも答えられます。</p>
      <div class="row">
        <button class="primary" :disabled="countFor(level) === 0" @click="start">スタート（10問）</button>
      </div>
      <p v-if="countFor(level) === 0" class="hint">単語データがまだ届いていません。時間をおいて開き直してください。</p>
    </template>

    <template v-else-if="current">
      <p class="meta">{{ total }}問中 {{ attempted.size }} 問解答済み</p>
      <p class="vocab-ja">{{ current.ja }}</p>
      <div class="row">
        <input
          v-model="input"
          class="vocab-input"
          type="text"
          :disabled="answered !== null"
          placeholder="中国語またはピンインで回答"
          @keyup.enter="answered === null ? judge() : next()"
        />
        <button v-if="answered === null" class="primary" :disabled="!input.trim()" @click="judge">答え合わせ</button>
      </div>
      <div v-if="answered !== null" class="answer">
        <p :class="answered ? 'right' : 'wrong'">
          {{ answered ? '正解！' : `不正解…（あなた：${input}）` }}
        </p>
        <p class="zh">{{ current.zh }}</p>
        <p class="pinyin">{{ current.pinyin }}</p>
        <div class="row">
          <button class="primary" @click="next">次へ</button>
          <AudioButton :text="current.zh" />
        </div>
      </div>
    </template>

    <template v-else>
      <p class="big">お疲れさまでした</p>
      <p>{{ total }}問中 {{ firstTry }}問 一発で正解</p>
      <div class="row">
        <button class="primary" @click="start">もう10問</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.chips { flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 6px 12px; border-radius: 999px; font-size: 0.9rem; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border); color: var(--text);
}
.chip.active { border-color: var(--link-active); color: var(--link-active); }
.vocab-ja { font-size: 26px; font-weight: 700; margin: 14px 0 10px; }
.vocab-input {
  flex: 2; padding: 12px; border-radius: 12px; font-size: 16px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
}
</style>
