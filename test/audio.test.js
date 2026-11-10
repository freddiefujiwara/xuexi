import { describe, it, expect } from 'vitest';
import { googleTtsUrl, playingText } from '../src/lib/audio.js';

describe('audio helpers', () => {
  it('Google TTS のURLを組み立てる', () => {
    const url = googleTtsUrl('我平时搭电车上班。');
    expect(url.startsWith('https://translate.google.com/translate_tts?')).toBe(true);
    expect(url).toContain('tl=zh-CN');
    expect(url).toContain(`q=${encodeURIComponent('我平时搭电车上班。')}`);
  });
  it('言語を指定できる', () => {
    expect(googleTtsUrl('你好', 'zh-TW')).toContain('tl=zh-TW');
  });
  it('初期状態は再生していない', () => {
    expect(playingText()).toBeNull();
  });
});
