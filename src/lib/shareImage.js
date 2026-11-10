import { buildCalendar, formatMinutes, monthSummary } from './study.js';

// 記録画面をそのまま共有できるよう、Canvas で画像を組み立てる。
// DOM のスクリーンショット方式は端末差が大きいため、決まった画を描く。
export const SHARE_W = 1080;
export const SHARE_H = 1350;

export function sharePalette(dark) {
  return dark
    ? {
        bg: '#17140f', text: '#f2ecdf', muted: '#c2b8a4', border: '#3a332a',
        surface: '#211c15', lv1: '#4a2c1e', lv2: '#7a4530', lv3: '#ec7a52',
        onLv3: '#17140f', accent: '#ec7a52',
      }
    : {
        bg: '#fbfaf7', text: '#221d16', muted: '#5d5546', border: '#e3ddd0',
        surface: '#ffffff', lv1: '#f6e3d8', lv2: '#eabfa8', lv3: '#b23a1f',
        onLv3: '#ffffff', accent: '#b23a1f',
      };
}

export function shareTexts({ todaySeconds, streakDays, year, month, byDate }) {
  const summary = monthSummary(year, month, byDate);
  return {
    title: `今日の勉強 ${formatMinutes(todaySeconds)} 分`,
    sub: `連続 ${streakDays} 日`,
    monthTitle: `${year}年${month}月`,
    footer: `今月は ${summary.days} 日、合計 ${formatMinutes(summary.seconds)} 分勉強しました。`,
    credit: 'freddiefujiwara.com/xuexi',
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildShareCanvas({ year, month, byDate, todaySeconds, streakDays, dark, today }) {
  const pal = sharePalette(dark);
  const texts = shareTexts({ todaySeconds, streakDays, year, month, byDate });
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* フォント未読込でも描く */ }
  }
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  const pad = 72;
  ctx.fillStyle = pal.text;
  ctx.font = '800 84px "Shippori Mincho B1", "Hiragino Mincho ProN", serif';
  ctx.fillText(texts.title, pad, 168);
  ctx.font = '500 40px "Zen Kaku Gothic New", sans-serif';
  ctx.fillStyle = pal.muted;
  ctx.fillText(texts.sub, pad, 244);

  ctx.fillStyle = pal.text;
  ctx.font = '700 52px "Zen Kaku Gothic New", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(texts.monthTitle, SHARE_W / 2, 372);
  ctx.textAlign = 'left';

  // カレンダー
  const gridX = pad;
  const gridY = 420;
  const gridW = SHARE_W - pad * 2;
  const gap = 12;
  const cellW = (gridW - gap * 6) / 7;
  const cellH = 116;
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  ctx.font = '500 30px "Zen Kaku Gothic New", sans-serif';
  ctx.fillStyle = pal.muted;
  ctx.textAlign = 'center';
  weekdays.forEach((w, i) => {
    ctx.fillText(w, gridX + i * (cellW + gap) + cellW / 2, gridY - 18);
  });
  ctx.textAlign = 'left';

  const cells = buildCalendar(year, month, byDate);
  cells.forEach((cell, i) => {
    if (!cell) return;
    const x = gridX + (i % 7) * (cellW + gap);
    const y = gridY + Math.floor(i / 7) * (cellH + gap);
    const fill = cell.level === 3 ? pal.lv3 : cell.level === 2 ? pal.lv2 : cell.level === 1 ? pal.lv1 : pal.surface;
    ctx.fillStyle = fill;
    roundRectPath(ctx, x, y, cellW, cellH, 16);
    ctx.fill();
    ctx.strokeStyle = cell.date === today ? pal.accent : pal.border;
    ctx.lineWidth = cell.date === today ? 5 : 2;
    roundRectPath(ctx, x, y, cellW, cellH, 16);
    ctx.stroke();
    ctx.fillStyle = cell.level === 3 ? pal.onLv3 : pal.text;
    ctx.font = '500 34px "Zen Kaku Gothic New", sans-serif';
    ctx.fillText(String(cell.day), x + 14, y + 44);
    if (cell.seconds > 0) {
      ctx.fillStyle = cell.level === 3 ? pal.onLv3 : pal.muted;
      ctx.font = '500 28px "Zen Kaku Gothic New", sans-serif';
      ctx.fillText(`${formatMinutes(cell.seconds)}分`, x + 14, y + cellH - 16);
    }
  });

  ctx.fillStyle = pal.muted;
  ctx.font = '500 36px "Zen Kaku Gothic New", sans-serif';
  ctx.fillText(texts.footer, pad, 1230);
  ctx.font = '400 28px "Zen Kaku Gothic New", sans-serif';
  ctx.fillText(texts.credit, pad, 1290);
  return canvas;
}

export async function shareCanvasImage(canvas, text = '') {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('画像を作れませんでした');
  const file = new File([blob], 'xuexi-record.png', { type: 'image/png' });
  if (navigator.canShare) {
    // 画像と投稿文をまとめて共有シートへ渡す（対応アプリなら一回で投稿できる）。
    if (text && navigator.canShare({ files: [file], text })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'xuexi-record.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
