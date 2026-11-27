import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
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

describe('buttonFace', () => {
  it('読み込み中は「…」用の dots、再生中は pause、それ以外は play', async () => {
    const { buttonFace } = await import('../src/lib/audio.js');
    expect(buttonFace('loading')).toBe('dots');
    expect(buttonFace('playing')).toBe('pause');
    expect(buttonFace(null)).toBe('play');
    expect(buttonFace(undefined)).toBe('play');
  });
});

describe('pronunciation URL cache', () => {
  let audio;
  let fetchAudio;
  let createUrl;
  let revokeUrl;
  let player;

  beforeEach(async () => {
    vi.resetModules();
    let id = 0;
    const live = new Set();
    player = {
      src: '',
      addEventListener: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(async () => expect(live.has(player.src)).toBe(true)),
    };
    createUrl = vi.fn(() => {
      const url = 'blob:test-' + ++id;
      live.add(url);
      return url;
    });
    revokeUrl = vi.fn((url) => {
      expect(url).not.toBe(player.src);
      live.delete(url);
    });
    vi.stubGlobal('Audio', class { constructor() { return player; } });
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revokeUrl;
    });
    fetchAudio = vi.fn(async () => ({
      json: async () => ({ ok: true, audio: btoa('sample') }),
    }));
    vi.stubGlobal('fetch', fetchAudio);
    audio = await import('../src/lib/audio.js');
  });

  afterEach(() => {
    audio?.stopAudio();
    vi.unstubAllGlobals();
  });

  it('reuses recently played audio and revokes the least recently used URL at the limit', async () => {
    for (let i = 0; i < 64; i++) await audio.speakChinese('发音' + i);
    await audio.speakChinese('发音0');
    expect(fetchAudio).toHaveBeenCalledTimes(64);
    expect(player.src).toBe('blob:test-1');

    await audio.speakChinese('新发音');
    expect(revokeUrl.mock.calls).toEqual([['blob:test-2']]);
    expect(player.src).toBe('blob:test-65');
    expect(player.play).toHaveBeenCalledTimes(66);
    await audio.speakChinese('发音0');
    expect(fetchAudio).toHaveBeenCalledTimes(65);
    await audio.speakChinese('发音1');
    expect(fetchAudio).toHaveBeenCalledTimes(66);
    expect(revokeUrl.mock.calls).toEqual([['blob:test-2'], ['blob:test-3']]);
    expect(player.play).toHaveBeenCalledTimes(68);
  });

  it('ignores a superseded download without creating a URL or interrupting playback', async () => {
    let finishOldDownload;
    fetchAudio.mockImplementationOnce(() => new Promise((resolve) => {
      finishOldDownload = resolve;
    }));
    const old = audio.speakChinese('旧发音');
    await audio.speakChinese('新发音');
    const currentSrc = player.src;
    finishOldDownload({ json: async () => ({ ok: true, audio: btoa('old') }) });
    await old;

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(revokeUrl).not.toHaveBeenCalled();
    expect(player.src).toBe(currentSrc);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(audio.playingText()).toBe('新发音');
  });
});
