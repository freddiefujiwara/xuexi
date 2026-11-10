// 表示用の整形ヘルパー。
// Sheets 側で日付型になった lesson は ISO 文字列で届くため、日付部分だけ見せる。
export function formatLesson(lesson) {
  const s = String(lesson ?? '');
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : s;
}
