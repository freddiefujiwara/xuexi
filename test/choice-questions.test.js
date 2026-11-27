import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import ChoiceQ from '../src/components/questions/ChoiceQ.vue';
import ClozeChoiceQ from '../src/components/questions/ClozeChoiceQ.vue';

const card = { zh: '我喝茶。', pinyin: 'Wǒ hē chá.', ja: '私はお茶を飲みます。' };
const options = ['茶', '水'];

describe('choice question presentation', () => {
  test.each([
    ['ja2zh', card.ja, true],
    ['zh2ja', card.zh, false],
  ])('regular choice preserves the %s prompt and answer translation', async (dir, prompt, small) => {
    const w = mount(ChoiceQ, { props: { q: { dir, prompt, card, options, answer: '茶' } } });
    expect(w.get('p.zh').text()).toBe(prompt);
    expect(w.get('p.zh').classes().includes('small')).toBe(small);
    expect(w.get('.meta').text()).toBe('正しいものを選んでください。');
    await w.findAll('.option')[1].trigger('click');
    expect(w.get('.verdict').text()).toBe('✗ 不正解…');
    expect(w.get('.answer').text()).toContain(card.ja);
    w.unmount();
  });

  test('cloze renders its text and translation before the answer, and shows the missing word on error', async () => {
    const w = mount(ClozeChoiceQ, {
      props: { q: { text: '我喝＿＿。', card, options, answer: '茶' } },
    });
    expect(w.get('p.zh').text()).toBe('我喝＿＿。');
    expect(w.text()).toContain(card.ja);
    expect(w.get('.meta').text()).toBe('空欄に入るものを選んでください。');
    await w.findAll('.option')[1].trigger('click');
    expect(w.get('.verdict').text()).toBe('✗ 不正解…（正解は「茶」）');
    expect(w.get('.answer').text()).not.toContain(card.ja);
    w.unmount();
  });
});

describe.each([['regular', ChoiceQ], ['cloze', ClozeChoiceQ]])('%s grading', (_name, component) => {
  test.each([true, false])('keeps the first answer and emits done=%s only on Next', async (correct) => {
    const w = mount(component, {
      props: { q: { dir: 'ja2zh', prompt: card.ja, text: '我喝＿＿。', card, options, answer: '茶' } },
    });
    expect(w.find('.answer').exists()).toBe(false);
    const [right, wrong] = w.findAll('.option');
    await (correct ? right : wrong).trigger('click');
    await (correct ? wrong : right).trigger('click');
    expect(right.classes()).toContain('correct');
    expect(wrong.classes().includes('wrongpick')).toBe(!correct);
    expect(w.get('.verdict').classes()).toContain(correct ? 'ok' : 'ng');
    expect(w.get('.answer .zh').text()).toBe(card.zh);
    expect(w.get('.answer .pinyin').text()).toBe(card.pinyin);
    expect(w.get('.answer .audio-btn').attributes('aria-label')).toBe('聞く');
    expect(w.emitted('done')).toBeUndefined();
    await w.get('.answer .primary').trigger('click');
    expect(w.emitted('done')).toEqual([[correct]]);
    w.unmount();
  });
});
