import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import ExerciseSession from '../src/components/ExerciseSession.vue';
import { pool } from './fixtures.js';

async function clickButtonWithText(wrapper, text, selector = 'button') {
  const btn = wrapper.findAll(selector).find((b) => b.text() === text);
  expect(btn, `button "${text}"`).toBeTruthy();
  await btn.trigger('click');
}

describe('ExerciseSession: 選択問題', () => {
  const bare = { id: 'x1', zh: '你好。', pinyin: 'Nǐ hǎo.', ja: 'こんにちは。', lesson: '2026-10-31', pillar: '-', target: '', chunks: '' };
  const cards = [bare];
  const fullPool = [...pool, bare];

  // 方向（ja→zh / zh→ja）はランダムなので、選択肢を見て正解を判定する。
  function correctOption(wrapper) {
    const options = wrapper.findAll('.option').map((b) => b.text());
    return options.includes('你好。') ? '你好。' : 'こんにちは。';
  }

  test('正解を選ぶと完了できる', async () => {
    const w = mount(ExerciseSession, { props: { cards, pool: fullPool } });
    expect(w.text()).toContain('選択問題');
    await clickButtonWithText(w, correctOption(w), '.option');
    expect(w.text()).toContain('正解！');
    await clickButtonWithText(w, '次へ');
    expect(w.text()).toContain('今天的练习完了！');
    expect(w.emitted('finished')).toBeTruthy();
  });

  test('間違えると最後にもう一度出て、正解するまで終わらない', async () => {
    const w = mount(ExerciseSession, { props: { cards, pool: fullPool } });
    const correct = correctOption(w);
    const wrong = w.findAll('.option').map((b) => b.text()).find((t) => t !== correct);
    await clickButtonWithText(w, wrong, '.option');
    expect(w.text()).toContain('不正解');
    await clickButtonWithText(w, '次へ');
    expect(w.emitted('finished')).toBeFalsy();
    expect(w.text()).toContain('再挑戦');
    await clickButtonWithText(w, correctOption(w), '.option');
    await clickButtonWithText(w, '次へ');
    expect(w.emitted('finished')).toBeTruthy();
    expect(w.text()).toContain('一発で正解 0 / 1 問');
  });
});

describe('ExerciseSession: 並べ替え→穴埋め入力', () => {
  test('並べ替えを正しい順で組み立て、穴埋めに句読点付きで答えて完了する', async () => {
    const cards = [pool[1], pool[0]]; // 1問目 order、2問目 cloze-input
    const w = mount(ExerciseSession, { props: { cards, pool } });
    expect(w.text()).toContain('並べ替え');
    // 答えの順にプールのチャンクをタップする
    for (const chunk of ['墙上', '贴着', '一张', '布告']) {
      const btn = w.findAll('.pool .chunk').find((b) => b.text() === chunk);
      expect(btn, `chunk "${chunk}"`).toBeTruthy();
      await btn.trigger('click');
    }
    await clickButtonWithText(w, '答え合わせ');
    expect(w.text()).toContain('正解！');
    await clickButtonWithText(w, '次へ');
    // 2問目：穴埋め入力（target は 得很快）
    expect(w.text()).toContain('穴埋め（入力）');
    await w.find('.cloze-input').setValue('得很快。');
    await clickButtonWithText(w, '答え合わせ');
    expect(w.text()).toContain('正解！');
    await clickButtonWithText(w, '次へ');
    expect(w.text()).toContain('今天的练习完了！');
    expect(w.text()).toContain('一発で正解 2 / 2 問');
    expect(w.emitted('finished')).toBeTruthy();
  });

  test('並べ替えを間違えると不正解表示になる', async () => {
    const cards = [pool[1]];
    const w = mount(ExerciseSession, { props: { cards, pool } });
    for (const chunk of ['贴着', '墙上', '一张', '布告']) {
      const btn = w.findAll('.pool .chunk').find((b) => b.text() === chunk);
      await btn.trigger('click');
    }
    await clickButtonWithText(w, '答え合わせ');
    expect(w.text()).toContain('不正解');
    expect(w.text()).toContain('墙上贴着一张布告');
  });
});
