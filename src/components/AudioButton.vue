<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { audioState, playingText, speakChinese, subscribeAudio } from '../lib/audio.js';

const props = defineProps({
  text: { type: String, default: '' },
  label: { type: String, default: '聞く' },
});

const state = ref(null);
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
    :aria-label="label"
    :title="label"
    @click="speakChinese(text)"
  >
    <svg viewBox="0 0 24 24" class="audio-ico" aria-hidden="true">
      <path :d="state === 'playing' ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'" />
    </svg>
  </button>
</template>
