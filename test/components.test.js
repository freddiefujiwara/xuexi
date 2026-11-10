import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import ReviewCards from '../src/components/ReviewCards.vue';
import Drill from '../src/components/Drill.vue';
import Mistakes from '../src/components/Mistakes.vue';

const sampleCards = [
  { id: 'c1', zh: '你好。', pinyin: 'Nǐ hǎo.', ja: 'こんにちは。', lesson: '2026-11-07', pillar: 'あいさつ' },
  { id: 'c2', zh: '谢谢。', pinyin: 'Xièxie.', ja: 'ありがとう。', lesson: '2026-11-07', pillar: 'あいさつ' },
];

async function clickByText(wrapper, text) {
  const btn = wrapper.findAll('button').find((b) => b.text() === text);
  expect(btn, `button "${text}"`).toBeTruthy();
  await btn.trigger('click');
}

describe('ReviewCards', () => {
  test('最初は訳を隠し、タップで表示する', async () => {
    const w = mount(ReviewCards, { props: { cards: sampleCards } });
    expect(w.text()).toContain('你好。');
    expect(w.text()).not.toContain('こんにちは。');
    await clickByText(w, 'ピンインと訳を見る');
    expect(w.text()).toContain('こんにちは。');
  });

  test('「言えた」で次へ進み、全部終わると finished を出す', async () => {
    const w = mount(ReviewCards, { props: { cards: sampleCards } });
    await clickByText(w, 'ピンインと訳を見る');
    await clickByText(w, '言えた');
    expect(w.text()).toContain('谢谢。');
    await clickByText(w, 'ピンインと訳を見る');
    await clickByText(w, '言えた');
    expect(w.text()).toContain('今天的复习完了！');
    expect(w.emitted('finished')).toBeTruthy();
  });

  test('「まだ」のカードは最後にもう一度出る', async () => {
    const w = mount(ReviewCards, { props: { cards: sampleCards } });
    await clickByText(w, 'ピンインと訳を見る');
    await clickByText(w, 'まだ');
    expect(w.text()).toContain('谢谢。');
    await clickByText(w, 'ピンインと訳を見る');
    await clickByText(w, '言えた');
    // 「まだ」だった1枚目が再出題される
    expect(w.text()).toContain('你好。');
    expect(w.emitted('finished')).toBeFalsy();
    await clickByText(w, 'ピンインと訳を見る');
    await clickByText(w, '言えた');
    expect(w.emitted('finished')).toBeTruthy();
  });

  test('カードが空なら完了表示', () => {
    const w = mount(ReviewCards, { props: { cards: [] } });
    expect(w.text()).toContain('今天的复习完了！');
  });
});

describe('Drill', () => {
  const drills = Array.from({ length: 7 }, (_, i) => ({
    id: `d${i}`,
    question: `问题${i}？`,
    q_pinyin: `Wèntí ${i}?`,
    answer: `回答${i}。`,
    a_pinyin: `Huídá ${i}.`,
    qword: '什么',
  }));

  test('模範解答は隠されていて、5問で終わる', async () => {
    const w = mount(Drill, { props: { drills } });
    expect(w.text()).not.toContain('回答');
    for (let i = 0; i < 5; i++) {
      await clickByText(w, '模範解答を見る');
      expect(w.text()).toContain('回答');
      await clickByText(w, '次へ');
    }
    expect(w.text()).toContain('问答练习完了！');
    expect(w.emitted('finished')).toBeTruthy();
  });
});

describe('Mistakes', () => {
  test('間違いと正しい形を並べて表示する', () => {
    const w = mount(Mistakes, {
      props: {
        mistakes: [
          { id: 'm1', wrong: '我过老婆一起去。', right: '我跟老婆一起去。', point: '「〜と」は跟', source: '2026-10-24' },
        ],
      },
    });
    expect(w.text()).toContain('我过老婆一起去。');
    expect(w.text()).toContain('我跟老婆一起去。');
    expect(w.text()).toContain('「〜と」は跟');
  });

  test('空ならその旨を表示する', () => {
    const w = mount(Mistakes, { props: { mistakes: [] } });
    expect(w.text()).toContain('まだ登録がありません');
  });
});
