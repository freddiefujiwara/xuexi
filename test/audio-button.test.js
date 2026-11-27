import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import AudioButton from '../src/components/AudioButton.vue';

const audio = vi.hoisted(() => ({
  listener: null,
  unsubscribe: vi.fn(),
}));

vi.mock('../src/lib/audio.js', () => ({
  audioState: () => 'loading',
  playingText: () => '你好',
  subscribeAudio: (fn) => {
    audio.listener = fn;
    return audio.unsubscribe;
  },
  speakChinese: () => {},
  buttonFace: (state) => state === 'loading' ? 'dots' : 'play',
}));

test('発音ボタンは音声イベントがなくても問題文の変更に追随する', async () => {
  const wrapper = mount(AudioButton, { props: { text: '你好' } });
  try {
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes('aria-label')).toBe('読み込み中');

    await wrapper.setProps({ text: '再见' });
    expect(wrapper.attributes('aria-label')).toBe('聞く');
    expect(wrapper.find('.audio-dots').exists()).toBe(false);

    await wrapper.setProps({ text: '你好' });
    expect(wrapper.attributes('aria-label')).toBe('読み込み中');

    audio.listener({ text: null, state: null });
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes('aria-label')).toBe('聞く');
  } finally {
    wrapper.unmount();
  }
  expect(audio.unsubscribe).toHaveBeenCalledOnce();
});
