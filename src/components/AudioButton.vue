<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { audioState, buttonFace, playingText, speakChinese, subscribeAudio } from '../lib/audio.js';

const props = defineProps({
  text: { type: String, default: '' },
  label: { type: String, default: '聞く' },
});

const state = ref(null);
const face = computed(() => buttonFace(state.value));
// /blog の音楽プレイヤーと同じく、読み込み中は名前も「読み込み中」にする。
const effectiveLabel = computed(() => (state.value === 'loading' ? '読み込み中' : props.label));
let unsubscribe = null;

function sync(current) {
  state.value = props.text && current.text === props.text ? current.state : null;
}

onMounted(() => {
  unsubscribe = subscribeAudio(sync);
  sync({ text: playingText(), state: audioState() });
});
onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <button
    v-if="text"
    type="button"
    class="audio-btn"
    :class="{ loading: state === 'loading' }"
    :aria-label="effectiveLabel"
    :title="effectiveLabel"
    @click="speakChinese(text)"
  >
    <span v-if="face === 'dots'" class="audio-dots" aria-hidden="true">…</span>
    <svg v-else viewBox="0 0 24 24" class="audio-ico" aria-hidden="true">
      <path :d="face === 'pause' ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'" />
    </svg>
  </button>
</template>
