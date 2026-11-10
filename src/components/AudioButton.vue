<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { playingText, speakChinese, subscribeAudio } from '../lib/audio.js';

const props = defineProps({
  text: { type: String, default: '' },
  label: { type: String, default: '聞く' },
});

const playing = ref(false);
let unsubscribe = null;

function sync(current) {
  playing.value = Boolean(props.text) && current === props.text;
}

onMounted(() => {
  unsubscribe = subscribeAudio(sync);
  sync(playingText());
});
onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <button v-if="text" type="button" class="ghost audio-btn" @click="speakChinese(text)">
    <span aria-hidden="true">🔊</span> {{ playing ? '再生中…' : label }}
  </button>
</template>
