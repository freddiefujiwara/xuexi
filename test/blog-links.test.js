import { describe, expect, test } from 'vitest';
import { blogUrlForCard } from '../src/lib/blogLinks.js';

const URL = 'https://freddiefujiwara.com/blog/1wuJcgJZ7l6gLQ85VYvCFwgr3fMsDC3lDrz3baTM-2jI';

describe('blogLinks: カードとブログ記事の対応', () => {
  test('カードの article 列の URL を返す', () => {
    expect(blogUrlForCard({ id: 'c054', article: URL })).toBe(URL);
  });

  test('前後の空白は取り除く', () => {
    expect(blogUrlForCard({ id: 'c054', article: `  ${URL} ` })).toBe(URL);
  });

  test('article が無い・空のカードは null', () => {
    expect(blogUrlForCard({ id: 'x1' })).toBeNull();
    expect(blogUrlForCard({ id: 'x2', article: '' })).toBeNull();
    expect(blogUrlForCard({ id: 'x3', article: '   ' })).toBeNull();
    expect(blogUrlForCard(null)).toBeNull();
    expect(blogUrlForCard(undefined)).toBeNull();
  });
});
