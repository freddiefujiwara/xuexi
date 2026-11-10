import { describe, it, expect } from 'vitest';
import { ttsApiUrl, decodeBase64ToBlob, playingText } from '../src/lib/audio.js';

describe('audio helpers', () => {
  it('TTS取得URLは GAS の exec に text を付ける', () => {
    const url = ttsApiUrl('我平时搭电车上班。');
    expect(url).toContain(`?text=${encodeURIComponent('我平时搭电车上班。')}`);
  });
  it('base64 を Blob に戻せる（/music と同方式）', async () => {
    const blob = decodeBase64ToBlob(btoa('hello'), 'audio/mpeg');
    expect(blob.type).toBe('audio/mpeg');
    expect(blob.size).toBe(5);
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
    expect(text).toBe('hello');
  });
  it('初期状態は再生していない', () => {
    expect(playingText()).toBeNull();
  });
});
