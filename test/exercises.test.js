import { pool } from './fixtures.js';
import { describe, expect, test } from 'vitest';
import {
  answersMatch,
  buildSession,
  canCloze,
  canOrder,
  clozeText,
  makeChoice,
  makeCloze,
  makeOrder,
  normalizeAnswer,
  splitChunks,
} from '../src/lib/exercises.js';



describe('normalizeAnswer / answersMatch', () => {
  test('句読点と空白を無視する', () => {
    expect(normalizeAnswer(' 得很快。 ')).toBe('得很快');
    expect(answersMatch('得很快。', '得很快')).toBe(true);
    expect(answersMatch('得 很 快', '得很快')).toBe(true);
  });
  test('空入力や不一致は false', () => {
    expect(answersMatch('', '得很快')).toBe(false);
    expect(answersMatch('得慢', '得很快')).toBe(false);
  });
});

describe('canOrder / canCloze', () => {
  test('chunks が3つ以上で元文に戻るときだけ並べ替え可', () => {
    expect(canOrder(pool[0])).toBe(true);
    expect(canOrder(pool[4])).toBe(false); // 2つしかない
    expect(canOrder({ zh: 'あいう。', chunks: 'あ|い|う' })).toBe(false); // つなぐと一致しない
  });
  test('target が文中にあれば穴埋め可', () => {
    expect(canCloze(pool[0])).toBe(true);
    expect(canCloze({ zh: '你好。', target: '' })).toBe(false);
    expect(canCloze({ zh: '你好。', target: '您好' })).toBe(false);
    expect(clozeText(pool[0])).toBe('他走＿＿。');
  });
  test('splitChunks は空要素を除く', () => {
    expect(splitChunks({ chunks: '他||走得|' })).toEqual(['他', '走得']);
  });
});

describe('makeChoice', () => {
  test('正解を含む重複なしの選択肢を作る', () => {
    const q = makeChoice(pool[0], pool, () => 0);
    expect(q.type).toBe('choice');
    expect(q.options).toContain(q.answer);
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.options.length).toBe(4);
  });
  test('プールが空ならカード形式に落ちる', () => {
    expect(makeChoice(pool[0], [pool[0]], () => 0).type).toBe('card');
  });
});

describe('makeCloze', () => {
  test('選択式は target を含む選択肢を持つ', () => {
    const q = makeCloze(pool[0], pool, () => 0.4, 'choice');
    expect(q.type).toBe('cloze-choice');
    expect(q.text).toContain('＿＿');
    expect(q.options).toContain('得很快');
  });
  test('入力式は選択肢を持たない', () => {
    const q = makeCloze(pool[0], pool, () => 0.4, 'input');
    expect(q.type).toBe('cloze-input');
    expect(q.options).toBeUndefined();
    expect(q.answer).toBe('得很快');
  });
});

describe('makeOrder', () => {
  test('ピースは chunks の並べ替えで、答えの並びを保持する', () => {
    const q = makeOrder(pool[1], () => 0.3);
    expect([...q.pieces].sort()).toEqual([...q.answerChunks].sort());
    expect(q.answerChunks).toEqual(['墙上', '贴着', '一张', '布告。']);
  });
});

describe('buildSession', () => {
  test('形式が巡回割当てされる', () => {
    const types = buildSession(pool.slice(0, 4), pool, () => 0.4).map((q) => q.type);
    expect(types).toEqual(['order', 'cloze-input', 'choice', 'cloze-choice']);
  });
  test('target も chunks も無いカードは選択問題に落ちる', () => {
    const bare = { id: 'x1', zh: '你好。', pinyin: 'Nǐ hǎo.', ja: 'こんにちは。', lesson: '2026-10-31', pillar: '-', target: '', chunks: '' };
    const [q] = buildSession([bare], [...pool, bare], () => 0.4);
    expect(q.type).toBe('choice');
  });
});
