import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import Vocab from '../src/components/Vocab.vue';
import { filterByLevel, judgeWord, pickWords, stripTones } from '../src/lib/vocab.js';

const words = [
  { id: 'w1', zh: '猫', pinyin: 'māo', ja: '猫（動物）', level: 1 },
  { id: 'w2', zh: '他', pinyin: 'tā', ja: '彼', level: 1 },
  { id: 'w3', zh: '她', pinyin: 'tā', ja: '彼女', level: 1 },
  { id: 'w4', zh: '自転車', pinyin: 'zìxíngchē', ja: '自転車', level: 2 },
];

describe('stripTones', () => {
  test('声調記号を落とす', () => {
    expect(stripTones('Māo')).toBe('mao');
    expect(stripTones('nǚ')).toBe('nu');
    expect(stripTones('zì xíng chē')).toBe('zixingche');
  });
});

describe('judgeWord', () => {
  test('中国語そのままで正解', () => {
    expect(judgeWord('猫', words[0], words)).toBe(true);
    expect(judgeWord(' 猫 ', words[0], words)).toBe(true);
  });
  test('ピンインは声調記号なしでも正解', () => {
    expect(judgeWord('mao', words[0], words)).toBe(true);
    expect(judgeWord('māo', words[0], words)).toBe(true);
    expect(judgeWord('zi xing che', words[3], words)).toBe(true);
  });
  test('同じ訳の別単語でも正解（彼に彼女は不可、訳が違うため）', () => {
    expect(judgeWord('他', words[2], words)).toBe(false);
  });
  test('不正解と空欄', () => {
    expect(judgeWord('狗', words[0], words)).toBe(false);
    expect(judgeWord('', words[0], words)).toBe(false);
  });
});

describe('filterByLevel / pickWords', () => {
  test('レベルで絞れる', () => {
    expect(filterByLevel(words, 'all')).toHaveLength(4);
    expect(filterByLevel(words, 1)).toHaveLength(3);
    expect(filterByLevel(words, '2')).toHaveLength(1);
  });
  test('重複なく指定数だけ取る', () => {
    const picked = pickWords(words, 3, () => 0);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((w) => w.id)).size).toBe(3);
  });
});

describe('Vocab コンポーネント', () => {
  test('回答するまでピンインを出さず、回答後に出す', async () => {
    const w = mount(Vocab, { props: { words } });
    const start = w.findAll('button').find((b) => b.text().includes('スタート'));
    await start.trigger('click');
    const jaText = w.find('.vocab-ja').text();
    const target = words.find((x) => x.ja === jaText);
    expect(target).toBeTruthy();
    expect(w.text()).not.toContain(target.pinyin);
    await w.find('.vocab-input').setValue(target.zh);
    const judge = w.findAll('button').find((b) => b.text() === '答え合わせ');
    await judge.trigger('click');
    expect(w.text()).toContain('正解');
    expect(w.text()).toContain(target.pinyin);
  });
});
