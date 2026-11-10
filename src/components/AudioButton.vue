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
  <button v-if="text" type="button" class="ghost audio-btn" @click="speakChinese(text)">
    <span aria-hidden="true">🔊</span>
    {{ state === 'loading' ? '読み込み中…' : state === 'playing' ? '再生中…' : label }}
  </button>
</template>
