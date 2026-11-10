<script setup>
import AudioButton from './AudioButton.vue';
import { mistakeAudioFile } from '../lib/audio.js';

defineProps({
  mistakes: { type: Array, default: () => [] },
});
</script>

<template>
  <section class="panel">
    <p class="meta">これまでに直した表現です。時々見返してください。</p>
    <article v-for="m in mistakes" :key="m.id" class="mistake">
      <p class="wrong">✗ {{ m.wrong }}</p>
      <p class="right">○ {{ m.right }}</p>
      <div class="row" v-if="mistakeAudioFile(m)"><AudioButton :file="mistakeAudioFile(m)" /></div>
      <p class="point">{{ m.point }}</p>
      <p class="meta">{{ m.source }}</p>
    </article>
    <p v-if="mistakes.length === 0" class="meta">まだ登録がありません。</p>
  </section>
</template>
