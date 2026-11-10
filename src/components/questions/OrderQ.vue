<script setup>
import { computed, ref } from 'vue';
import AudioButton from '../AudioButton.vue';

const props = defineProps({ q: { type: Object, required: true } });
const emit = defineEmits(['done']);

// pieces は重複しうるので、位置（インデックス）で管理する。
const placed = ref([]);
const ok = ref(null);

const remaining = computed(() =>
  props.q.pieces.map((_, i) => i).filter((i) => !placed.value.includes(i))
);
const built = computed(() => placed.value.map((i) => props.q.pieces[i]).join(''));
const complete = computed(() => placed.value.length === props.q.pieces.length);

function add(i) {
  if (ok.value !== null) return;
  placed.value.push(i);
}
function removeAt(pos) {
  if (ok.value !== null) return;
  placed.value.splice(pos, 1);
}
function judge() {
  if (ok.value !== null || !complete.value) return;
  ok.value = built.value === props.q.answerChunks.join('');
}
</script>

<template>
  <div>
    <p>{{ q.card.ja }}</p>
    <p class="pinyin">{{ q.card.pinyin }}</p>
    <p class="meta">フレーズをタップして、文の順番に並べてください。</p>
    <div class="built" :class="{ empty: placed.length === 0 }">
      <button v-for="(pi, pos) in placed" :key="pos" class="chunk placed" @click="removeAt(pos)">
        {{ q.pieces[pi] }}
      </button>
      <span v-if="placed.length === 0" class="placeholder">ここに文が組み上がります</span>
      <span v-if="q.suffix" class="suffix">{{ q.suffix }}</span>
    </div>
    <div class="pool">
      <button v-for="i in remaining" :key="i" class="chunk" @click="add(i)">{{ q.pieces[i] }}</button>
    </div>
    <div class="row">
      <button class="primary" :disabled="ok !== null || !complete" @click="judge">答え合わせ</button>
    </div>
    <div v-if="ok !== null" class="answer">
      <p :class="ok ? 'right' : 'wrong'">{{ ok ? '正解！' : '不正解…' }}</p>
      <p class="zh small">{{ q.card.zh }}</p>
      <div class="row">
        <button class="primary" @click="emit('done', ok)">次へ</button>
        <AudioButton :text="q.card.zh" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.built {
  min-height: 52px; border: 1px dashed var(--border); border-radius: 12px; padding: 8px;
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px;
}
.pool { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chunk {
  padding: 8px 12px; border-radius: 999px; font-size: 16px; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border); color: var(--text);
}
.chunk.placed { background: var(--surface-elevated); border-color: var(--link-active); color: var(--link-active); }
.placeholder { color: var(--muted-2); font-size: 13px; }
.suffix { font-size: 18px; color: var(--muted-2); }
</style>
