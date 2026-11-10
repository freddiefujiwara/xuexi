<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { playAudio, playingFile, subscribeAudio } from '../lib/audio.js';

const props = defineProps({
  file: { type: String, default: null },
  label: { type: String, default: '聞く' },
});

const playing = ref(false);
let unsubscribe = null;

function sync(current) {
  playing.value = Boolean(props.file) && current === props.file;
}

onMounted(() => {
  unsubscribe = subscribeAudio(sync);
  sync(playingFile());
});
onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <button v-if="file" type="button" class="ghost audio-btn" @click="playAudio(file)">
    <span aria-hidden="true">🔊</span> {{ playing ? '再生中…' : label }}
  </button>
</template>
