import { describe, it, expect } from 'vitest';
import { tabFromPath, tabHrefs } from '../src/lib/nav.js';

describe('tabFromPath', () => {
  it('本番パスからタブを判定する', () => {
    expect(tabFromPath('/xuexi/')).toBe('cards');
    expect(tabFromPath('/xuexi/drill/')).toBe('drill');
    expect(tabFromPath('/xuexi/vocabulary')).toBe('vocab');
    expect(tabFromPath('/xuexi/vocabulary/')).toBe('vocab');
    expect(tabFromPath('/xuexi/record')).toBe('record');
  });
  it('ステージングのパスでも判定する', () => {
    expect(tabFromPath('/xuexi/staging/drill/')).toBe('drill');
    expect(tabFromPath('/xuexi/staging/')).toBe('cards');
  });
});

describe('tabHrefs', () => {
  it('現在のページからの相対でない絶対パスを返す', () => {
    expect(tabHrefs('/xuexi/drill/')).toEqual({
      cards: '/xuexi/',
      drill: '/xuexi/drill/',
      vocab: '/xuexi/vocabulary/',
      record: '/xuexi/record/',
    });
    expect(tabHrefs('/xuexi/staging/').vocab).toBe('/xuexi/staging/vocabulary/');
  });
});
