// レッスンカードと、その元になったブログ記事（レッスン記事）の対応。
// カードの lesson は Sheets の日付型が ISO 文字列（UTC）で届くため、
// レッスン実施日（JST）より1日早い日付になる。キーは API で届く
// 先頭10文字に合わせている（括弧内は実施日）。
const BLOG = 'https://freddiefujiwara.com/blog/';

const LESSON_URLS = {
  '2026-10-09': `${BLOG}13jx2m400GXkY5vf4KJZQtFglwa4I0VtqtlFigtsFrTE`, // 2026-10-10 学び直し1回目
  '2026-10-16': `${BLOG}1gwZkiVfc-49AyMjqT3xYFf88loAAnXw0eSc70n77L_o`, // 2026-10-17 学び直し2回目
  '2026-10-23': `${BLOG}1miVeFJ_0ZcKWg3baLywSTTLemh6EAzJcVD8GvUxXAjg`, // 2026-10-24 学び直し3回目
  '2026-10-30': `${BLOG}1BfOXlaRhgN0Ksxxx0wT9Ku3KPYMbLrzgaZ9xQ7_MOMY`, // 2026-10-31 学び直し4回目
  '2026-11-06': `${BLOG}186JmaWRWpqCCu97m1EJHliffTNbgMlf4ivYFcY8lB6k`, // 2026-11-07 学び直し5回目
  '2026-11-14': `${BLOG}1N3MbM6oMJiJ6Ab0H3y9beGuXY75dcniechM6GnL8Gmw`, // 2026-11-15 学び直し6回目
};

// 同じレッスン日でも、別の記事から作ったカードは個別に対応させる。
const CARD_URLS = {
  c038: `${BLOG}1GX0Om0xWPLGzOsU2dY6lkBYA-iC-sYuwo2A0bv-7XUU`, // 雨の日の中国語レッスン（2026-10-24）
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

export function blogUrlForCard(card) {
  if (!card) return null;
  if (CARD_URLS[card.id]) return CARD_URLS[card.id];
  for (const key of lessonKeys(card.lesson)) {
    if (LESSON_URLS[key]) return LESSON_URLS[key];
  }
  return null;
}
