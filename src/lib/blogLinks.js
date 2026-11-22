// カードと、その元になったブログ記事（レッスン記事）の対応は、
// カードデータ（Sheets）の article 列が持つ。新しいレッスンの記事は、
// カード追加時に article 列へ URL を入れるだけでよい（コード変更は不要）。
export function blogUrlForCard(card) {
  const url = card && typeof card.article === 'string' ? card.article.trim() : '';
  return url || null;
}
