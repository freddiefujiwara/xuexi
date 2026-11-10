// 今日の復習カードの選出。
// 直近2回分のレッスンを中心にし、古い回のカードを少し混ぜる。
export function selectDailyCards(cards, { total = 10, recentCount = 7, random = Math.random } = {}) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  const lessonsDesc = [...new Set(cards.map((c) => c.lesson))].sort().reverse();
  const recentLessons = new Set(lessonsDesc.slice(0, 2));
  const recent = shuffle(cards.filter((c) => recentLessons.has(c.lesson)), random);
  const older = shuffle(cards.filter((c) => !recentLessons.has(c.lesson)), random);
  const picked = [
    ...recent.slice(0, recentCount),
    ...older.slice(0, Math.max(0, total - recentCount)),
  ];
  // 足りない分は残りから補充する。
  if (picked.length < total) {
    const rest = [...recent.slice(recentCount), ...older.slice(Math.max(0, total - recentCount))];
    picked.push(...rest.slice(0, total - picked.length));
  }
  return picked.slice(0, total);
}

export function shuffle(arr, random = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
