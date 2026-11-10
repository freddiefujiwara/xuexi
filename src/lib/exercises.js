// 演習問題の生成と判定（v2）。
// カード（zh/pinyin/ja/lesson/target/chunks）から4形式の問題を作る。
import { shuffle} from './select.js';

const PUNCT = /[\s。、，．・！？!?.,：:；;「」『』（）()…—ー~～"'""'']/g;

export function normalizeAnswer(s) {
return String(s?? '').replace(PUNCT, '');
}

export function answersMatch(input, answer) {
const a = normalizeAnswer(input);
return a!== '' && a === normalizeAnswer(answer);
}

export function splitChunks(card) {
return String(card?.chunks?? '')
.split('|')
.map((s) => s.trim())
.filter(Boolean);
}

// chunks をつなぐと元の文に戻る場合だけ並べ替えに使える（データ不整合の安全弁）。
export function canOrder(card) {
const chunks = splitChunks(card);
return chunks.length >= 3 && chunks.join('') === String(card?.zh?? '');
}

export function canCloze(card) {
return!!card?.target && String(card?.zh?? '').includes(card.target);
}

export function clozeText(card) {
return String(card.zh).replace(card.target, '＿＿');
}

function uniqueValues(items) {
return [...new Set(items)];
}

// 同じレッスンのカードを優先して誤答候補を集める。
function distractorPool(pool, card, field) {
const others = pool.filter((c) => c.id!== card.id);
const sameLesson = others.filter((c) => c.lesson === card.lesson);
const rest = others.filter((c) => c.lesson!== card.lesson);
const ordered = [...sameLesson,...rest];
const values = [];
for (const c of ordered) {
const v = field === 'target'? c.target: c[field];
if (v && v!== (field === 'target'? card.target: card[field])) values.push(v);
}
return uniqueValues(values);
}

export function makeChoice(card, pool, random = Math.random) {
const dir = random() < 0.5? 'ja2zh': 'zh2ja';
const field = dir === 'ja2zh'? 'zh': 'ja';
const distractors = shuffle(distractorPool(pool, card, field), random).slice(0, 3);
if (distractors.length === 0) return { type: 'card', card};
return {
type: 'choice',
card,
dir,
prompt: dir === 'ja2zh'? card.ja: card.zh,
options: shuffle([card[field],...distractors], random),
answer: card[field],
};
}

export function makeCloze(card, pool, random = Math.random, mode = 'input') {
if (!canCloze(card)) return { type: 'card', card};
const base = { card, text: clozeText(card), answer: card.target};
if (mode === 'choice') {
const distractors = shuffle(distractorPool(pool, card, 'target'), random).slice(0, 3);
if (distractors.length === 0) return { type: 'cloze-input',...base};
return { type: 'cloze-choice',...base, options: shuffle([card.target,...distractors], random)};
}
return { type: 'cloze-input',...base};
}

export function makeOrder(card, random = Math.random) {
const answerChunks = splitChunks(card);
let pieces = shuffle(answerChunks, random);
// 元の並びと完全一致したら、ずらして出題する。
for (let i = 0; i < 10 && pieces.join('') === answerChunks.join(''); i++) {
pieces = shuffle(answerChunks, random);
}
if (pieces.join('') === answerChunks.join('') && pieces.length > 1) {
pieces = [...pieces.slice(1), pieces[0]];
}
return { type: 'order', card, pieces, answerChunks};
}

const FORMAT_CYCLE = ['order', 'cloze-input', 'choice', 'cloze-choice'];

// その日のカードに形式を巡回割当てする。条件を満たさない場合は
// 並べ替え→穴埋め入力→選択→カード（自己判定）の順にフォールバックする。
export function buildSession(cards, pool, random = Math.random) {
const all = pool && pool.length? pool: cards;
return cards.map((card, i) => {
const want = FORMAT_CYCLE[i % FORMAT_CYCLE.length];
if (want === 'order' && canOrder(card)) return makeOrder(card, random);
if (want === 'cloze-input' && canCloze(card)) return makeCloze(card, all, random, 'input');
if (want === 'cloze-choice' && canCloze(card)) return makeCloze(card, all, random, 'choice');
if (want === 'choice') {
const q = makeChoice(card, all, random);
if (q.type === 'choice') return q;
}
if (canOrder(card)) return makeOrder(card, random);
if (canCloze(card)) return makeCloze(card, all, random, 'input');
const q = makeChoice(card, all, random);
if (q.type === 'choice') return q;
return { type: 'card', card};
});
}
