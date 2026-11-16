// レッスンカードと、その元になったブログ記事（レッスン記事）の対応。
// カードの lesson は Sheets の日付型が ISO 文字列（UTC）で届くため、
// レッスン実施日（JST）より1日早い日付になる。キーは API で届く
// 先頭10文字に合わせている（括弧内は実施日）。
// title は記事タイトルから日付部分を除いたもの。
const BLOG = 'https://freddiefujiwara.com/blog/';

export const LESSON_ARTICLES = {
  '2026-10-09': { // 2026-10-10 学び直し1回目
    url: `${BLOG}13jx2m400GXkY5vf4KJZQtFglwa4I0VtqtlFigtsFrTE`,
    title: '7年ぶりに中国語を学び直す。最初のマンツーマンレッスンで感じたこと',
  },
  '2026-10-16': { // 2026-10-17 学び直し2回目
    url: `${BLOG}1gwZkiVfc-49AyMjqT3xYFf88loAAnXw0eSc70n77L_o`,
    title: '中国語の「ちょっと」は一つじゃない。学び直し2回目のレッスン',
  },
  '2026-10-23': { // 2026-10-24 学び直し3回目
    url: `${BLOG}1miVeFJ_0ZcKWg3baLywSTTLemh6EAzJcVD8GvUxXAjg`,
    title: '中国語が少しずつ話せるようになる。先生の「越来越好」がうれしかった3回目のレッスン',
  },
  '2026-10-30': { // 2026-10-31 学び直し4回目
    url: `${BLOG}1BfOXlaRhgN0Ksxxx0wT9Ku3KPYMbLrzgaZ9xQ7_MOMY`,
    title: '「壁に貼ってある」「机に置いてある」。中国語で様子を描写する、学び直し4回目のレッスン',
  },
  '2026-11-06': { // 2026-11-07 学び直し5回目
    url: `${BLOG}186JmaWRWpqCCu97m1EJHliffTNbgMlf4ivYFcY8lB6k`,
    title: '「忙しかったけれど、少しも疲れていない」。中国語の強調表現を学んだ、学び直し5回目のレッスン',
  },
  '2026-11-14': { // 2026-11-15 学び直し6回目
    url: `${BLOG}1N3MbM6oMJiJ6Ab0H3y9beGuXY75dcniechM6GnL8Gmw`,
    title: '「あと10分で授業が終わります」。否定の使い分けを学んだ、学び直し6回目のレッスン',
  },
};

// 同じレッスン日でも、別の記事から作ったカードは個別に対応させる。
const CARD_ARTICLE_OVERRIDES = {
  c038: { // 雨の日の中国語レッスン（2026-10-24）
    url: `${BLOG}1GX0Om0xWPLGzOsU2dY6lkBYA-iC-sYuwo2A0bv-7XUU`,
    title: '雨の日の中国語レッスン。「今天下雨」と「今天下雨了」のどっち？',
  },
};

// まず届いた日付のまま引き、無ければ前日でも引く。
// （lesson が JST の実施日で届いた場合、その前日が UTC キーになる。）
function lessonKeys(lesson) {
  const head = String(lesson ?? '').slice(0, 10);
  const keys = [head];
  const d = new Date(`${head}T00:00:00Z`);
  if (!Number.isNaN(d.getTime())) {
    d.setUTCDate(d.getUTCDate() - 1);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export function blogArticleForCard(card) {
  if (!card) return null;
  if (CARD_ARTICLE_OVERRIDES[card.id]) return CARD_ARTICLE_OVERRIDES[card.id];
  for (const key of lessonKeys(card.lesson)) {
    if (LESSON_ARTICLES[key]) return LESSON_ARTICLES[key];
  }
  return null;
}

export function blogUrlForCard(card) {
  const article = blogArticleForCard(card);
  return article ? article.url : null;
}
