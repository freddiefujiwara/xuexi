<script setup>
import ChoiceQuestion from './ChoiceQuestion.vue';

defineProps({ q: { type: Object, required: true } });
const emit = defineEmits(['done']);
</script>

<template>
  <ChoiceQuestion :q="q" @done="emit('done', $event)">
    <p class="zh" :class="{ small: q.dir === 'ja2zh' }">{{ q.prompt }}</p>
    <p class="meta">正しいものを選んでください。</p>
    <template #translation>
      <p>{{ q.card.ja }}</p>
    </template>
  </ChoiceQuestion>
</template>
