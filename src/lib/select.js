// レッスンの復習カードの選出。
// 直近2回分のレッスンから少し多めに取り、残りは古い回から
// レッスンごとに均等になるように巡回して拾う。
export function selectDailyCards(cards, { total = 10, recentCount = 4, random = Math.random } = {}) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  const lessonsDesc = [...new Set(cards.map((c) => c.lesson))].sort().reverse();
  const recentLessons = new Set(lessonsDesc.slice(0, 2));
  const recent = shuffle(cards.filter((c) => recentLessons.has(c.lesson)), random);
  const picked = [...recent.slice(0, recentCount)];

  // 古い回は、レッスン単位で巡回して均等に混ぜる。
  const olderGroups = shuffle(
    lessonsDesc.slice(2).map((lesson) => shuffle(cards.filter((c) => c.lesson === lesson), random)),
    random
  );
  const want = Math.max(0, total - picked.length);
  let added = 0;
  for (let round = 0; added < want; round++) {
    let progressed = false;
    for (const group of olderGroups) {
      if (added >= want) break;
      if (group[round]) {
        picked.push(group[round]);
        added++;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  // 足りない分は、まだ選んでいないカードから補充する。
  if (picked.length < total) {
    const used = new Set(picked.map((c) => c.id));
    const rest = shuffle(cards.filter((c) => !used.has(c.id)), random);
    picked.push(...rest.slice(0, total - picked.length));
  }
  // 直近のカードが前に固まらないよう、最後に全体を混ぜる。
  return shuffle(picked.slice(0, total), random);
}

export function shuffle(arr, random = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
