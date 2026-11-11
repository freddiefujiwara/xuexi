import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/xuexi/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        drill: 'drill/index.html',
        vocabulary: 'vocabulary/index.html',
        record: 'record/index.html'
      }
    }
  },
  test: {
    environment: 'jsdom'
  }
});
