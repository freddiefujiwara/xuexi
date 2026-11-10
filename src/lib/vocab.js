// 単語練習（旧HSK1〜3）の出題と判定。
// 問題は日本語訳を見て、中国語をフリーテキストで答える。
// 判定は「中国語そのもの」か「ピンイン（声調記号なしでも可）」のどちらかで正解にする。

export function normalizeAnswer(s) {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// 声調記号を落としたピンイン比較用文字列にする（NFDで分解して結合記号を除去）。
export function stripTones(s) {
  return normalizeAnswer(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}

function pinyinMatches(input, word) {
  const bare = stripTones(input);
  return bare !== '' && bare === stripTones(word.pinyin);
}

export function judgeWord(input, word, allWords = []) {
  const t = normalizeAnswer(input);
  if (!t || !word) return false;
  if (t === normalizeAnswer(word.zh)) return true;
  if (pinyinMatches(t, word)) return true;
  // 同じ日本語訳を持つ別の単語で答えても正解にする。
  for (const w of allWords) {
    if (w.id === word.id || w.ja !== word.ja) continue;
    if (t === normalizeAnswer(w.zh) || pinyinMatches(t, w)) return true;
  }
  return false;
}

export function filterByLevel(words, level) {
  if (level === 'all') return words;
  return words.filter((w) => Number(w.level) === Number(level));
}

export function pickWords(words, count = 10, random = Math.random) {
  const pool = [...words];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
