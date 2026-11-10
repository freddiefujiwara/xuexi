import { describe, it, expect } from 'vitest';
import { audioPath, cardAudioFile, drillAudioFile, mistakeAudioFile } from '../src/lib/audio.js';

describe('audio helpers', () => {
  it('パスはベース配下の audio/ になる', () => {
    expect(audioPath('c001.mp3')).toMatch(/audio\/c001\.mp3$/);
  });
  it('カードとドリルのファイル名', () => {
    expect(cardAudioFile({ id: 'c027' })).toBe('c027.mp3');
    expect(cardAudioFile(null)).toBeNull();
    expect(drillAudioFile({ id: 'd011' }, 'q')).toBe('d011q.mp3');
    expect(drillAudioFile({ id: 'd011' }, 'a')).toBe('d011a.mp3');
  });
  it('間違いノートは音声のあるものだけ', () => {
    expect(mistakeAudioFile({ id: 'm001' })).toBe('m001.mp3');
    expect(mistakeAudioFile({ id: 'm002' })).toBeNull();
    expect(mistakeAudioFile({ id: 'm005' })).toBe('m005.mp3');
  });
});
