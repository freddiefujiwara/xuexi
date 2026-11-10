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

const ZH_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const TIME_WORDS = ['今天', '昨天', '明天', '周末', '每天'];
const SUBJECTS = ['我', '你', '他', '她'];

// 正解の文を少しだけ崩した「紛らわしい誤答」を作る。
// 無関係な文より、数字違い・対象語違い・語順違いのほうが判別が難しく学習になる。
export function mutateZh(card, pool, random = Math.random) {
const zh = String(card.zh);
const out = [];
const push = (s) => {
if (s && s!== zh &&!out.includes(s)) out.push(s);
};
// 対象語を他のカードの対象語に入れ替える
if (card.target && zh.includes(card.target)) {
const targets = shuffle(
uniqueValues(pool.filter((c) => c.id!== card.id && c.target).map((c) => c.target)),
random
);
for (const t of targets.slice(0, 2)) push(zh.replace(card.target, t));
}
// 漢数字を1つ入れ替える
const numeral = ZH_NUMERALS.find((n) => zh.includes(n));
if (numeral) {
const others = shuffle(ZH_NUMERALS.filter((n) => n!== numeral), random);
push(zh.replace(numeral, others[0]));
}
// 時間の語を入れ替える
const time = TIME_WORDS.find((w) => zh.includes(w));
if (time) {
const others = shuffle(TIME_WORDS.filter((w) => w!== time), random);
push(zh.replace(time, others[0]));
}
// 文頭の主語を入れ替える
const subject = SUBJECTS.find((s) => zh.startsWith(s));
if (subject) {
const others = shuffle(SUBJECTS.filter((s) => s!== subject), random);
push(others[0] + zh.slice(1));
}
// フレーズの並びを1か所入れ替える（語順違い）
if (canOrder(card)) {
const chunks = splitChunks(card);
const swapped = [...chunks];
const i = Math.floor(random() * (chunks.length - 1));
[swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
push(swapped.join(''));
}
return out;
}

// 日本語訳側の誤答は、数字違いを優先し、同レッスンの訳で埋める。
export function mutateJa(card, random = Math.random) {
const ja = String(card.ja);
const m = ja.match(/[0-9０-９]/);
if (!m) return [];
const d = m[0];
const others = shuffle(['1', '2', '3', '4', '5', '6', '7', '8', '9'].filter((n) => n!== d), random);
return [ja.replace(d, others[0])];
}

export function makeChoice(card, pool, random = Math.random) {
const dir = random() < 0.5? 'ja2zh': 'zh2ja';
const field = dir === 'ja2zh'? 'zh': 'ja';
const mutations = field === 'zh'? mutateZh(card, pool, random): mutateJa(card, random);
const fromPool = shuffle(distractorPool(pool, card, field), random);
const distractors = uniqueValues([...mutations,...fromPool]).slice(0, 3);
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

const FINAL_PUNCT = /[。！？]$/;

export function makeOrder(card, random = Math.random) {
let answerChunks = splitChunks(card);
// 文末の句読点はタイルにすると「最後」がバレるので、外して固定表示にする。
let suffix = '';
const last = answerChunks[answerChunks.length - 1];
if (FINAL_PUNCT.test(last)) {
suffix = last.slice(-1);
answerChunks = [...answerChunks.slice(0, -1), last.slice(0, -1)];
}
let pieces = shuffle(answerChunks, random);
// 元の並びと完全一致したら、ずらして出題する。
for (let i = 0; i < 10 && pieces.join('') === answerChunks.join(''); i++) {
pieces = shuffle(answerChunks, random);
}
if (pieces.join('') === answerChunks.join('') && pieces.length > 1) {
pieces = [...pieces.slice(1), pieces[0]];
}
return { type: 'order', card, pieces, answerChunks, suffix};
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
