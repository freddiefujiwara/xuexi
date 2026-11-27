<script setup>
import ChoiceQuestion from './ChoiceQuestion.vue';

defineProps({ q: { type: Object, required: true } });
const emit = defineEmits(['done']);
</script>

<template>
  <ChoiceQuestion :q="q" @done="emit('done', $event)">
    <p class="zh">{{ q.text }}</p>
    <p>{{ q.card.ja }}</p>
    <p class="meta">空欄に入るものを選んでください。</p>
    <template #incorrect>✗ 不正解…（正解は「{{ q.answer }}」）</template>
  </ChoiceQuestion>
</template>
