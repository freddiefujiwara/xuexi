<script setup>
import { ref } from 'vue';
import AudioButton from '../AudioButton.vue';


defineProps({ q: { type: Object, required: true } });
const emit = defineEmits(['done']);
const revealed = ref(false);
</script>

<template>
  <div>
    <p class="zh">{{ q.card.zh }}</p>
    <div v-if="revealed" class="answer">
      <p class="pinyin">{{ q.card.pinyin }}</p>
      <p>{{ q.card.ja }}</p>
      <div class="row"><AudioButton :text="q.card.zh" /></div>
    </div>
    <div class="row">
      <button v-if="!revealed" class="primary" @click="revealed = true">ピンインと訳を見る</button>
      <template v-else>
        <button class="primary" @click="emit('done', true)">言えた</button>
        <button class="ghost" @click="emit('done', false)">まだ</button>
      </template>
    </div>
    <p class="hint">声に出して言ってから、自己判定してください。</p>
  </div>
</template>
