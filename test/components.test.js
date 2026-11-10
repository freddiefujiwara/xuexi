import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ReviewCards from '../src/components/ReviewCards.vue';
import { formatLesson } from '../src/lib/format.js';
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

describe('formatLesson', () => {
  test('ISO文字列は日付部分だけにする', () => {
    expect(formatLesson('2026-10-30T15:00:00.000Z')).toBe('2026-10-30');
    expect(formatLesson('2026-11-07')).toBe('2026-11-07');
    expect(formatLesson('')).toBe('');
  });
});

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockJudge(payload) {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => payload })));
  }

  test('AI判定で正解すると次へ進み、5問で終わる', async () => {
    mockJudge({ ok: true, verdict: 'correct', comment: 'いいですね' });
    const w = mount(Drill, { props: { drills } });
    expect(w.text()).not.toContain('模範解答');
    for (let i = 0; i < 5; i++) {
      await w.find('.drill-input').setValue('我的回答。');
      await clickByText(w, '判定する');
      await flushPromises();
      expect(w.text()).toContain('正解！');
      expect(w.text()).toContain('いいですね');
      await clickByText(w, '次へ');
    }
    expect(w.text()).toContain('问答练习完了！');
    expect(w.emitted('finished')).toBeTruthy();
  });

  test('AI判定が使えないと自己判定にフォールバックする', async () => {
    mockJudge({ ok: false, reason: 'no_key' });
    const w = mount(Drill, { props: { drills } });
    await w.find('.drill-input').setValue('我的回答。');
    await clickByText(w, '判定する');
    await flushPromises();
    expect(w.text()).toContain('自己判定します');
    expect(w.text()).toContain('回答');
    await clickByText(w, '言えた');
    expect(w.text()).toContain('2 問目');
  });

  test('自己判定リンクからもフォールバックできる', async () => {
    mockJudge({ ok: true, verdict: 'correct', comment: '' });
    const w = mount(Drill, { props: { drills } });
    await clickByText(w, 'AI判定を使わず自己判定する');
    expect(w.text()).toContain('自己判定します');
  });

  test('不正解の問は最後にもう一度出る', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls++;
      return { json: async () => (calls <= 2 ? { ok: true, verdict: 'wrong', comment: '違います' } : { ok: true, verdict: 'correct', comment: '' }) };
    }));
    const two = drills.slice(0, 2);
    const w = mount(Drill, { props: { drills: two } });
    // 2問とも不正解 → 再挑戦ラウンドに入る
    for (let i = 0; i < 2; i++) {
      await w.find('.drill-input').setValue('x');
      await clickByText(w, '判定する');
      await flushPromises();
      expect(w.text()).toContain('不正解');
      await clickByText(w, '次へ');
    }
    expect(w.emitted('finished')).toBeFalsy();
    expect(w.text()).toContain('再挑戦');
    for (let i = 0; i < 2; i++) {
      await w.find('.drill-input').setValue('x');
      await clickByText(w, '判定する');
      await flushPromises();
      await clickByText(w, '次へ');
    }
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
