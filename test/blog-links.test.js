import { describe, expect, test } from 'vitest';
import { blogArticleForCard, blogUrlForCard, LESSON_ARTICLES } from '../src/lib/blogLinks.js';

describe('blogLinks: カードとブログ記事の対応', () => {
  test('レッスン日ごとに、その回のレッスン記事（URLとタイトル）を返す', () => {
    for (const [lesson, article] of Object.entries(LESSON_ARTICLES)) {
      expect(blogArticleForCard({ id: 'c999', lesson })).toEqual(article);
      expect(article.url).toMatch(/^https:\/\/freddiefujiwara\.com\/blog\//);
      expect(article.title.length).toBeGreaterThan(0);
    }
  });

  test('lesson が ISO 日時で届いても先頭10文字で対応する', () => {
    expect(blogUrlForCard({ id: 'c041', lesson: '2026-11-14T15:00:00.000Z' })).toBe(
      LESSON_ARTICLES['2026-11-14'].url
    );
  });

  test('lesson が JST の実施日で届いても前日キーで対応する', () => {
    expect(blogUrlForCard({ id: 'c012', lesson: '2026-10-31' })).toBe(
      LESSON_ARTICLES['2026-10-30'].url
    );
  });

  test('雨の日の記事から作ったカードは個別対応が優先される', () => {
    const article = blogArticleForCard({ id: 'c038', lesson: '2026-10-23' });
    expect(article.url).toContain('1GX0Om0xWPLGzOsU2dY6lkBYA-iC-sYuwo2A0bv-7XUU');
    expect(article.title).toContain('雨の日の中国語レッスン');
    expect(article.url).not.toBe(LESSON_ARTICLES['2026-10-23'].url);
  });

  test('対応する記事が無いカードは null', () => {
    expect(blogArticleForCard({ id: 'x1', lesson: '2027-01-01' })).toBeNull();
    expect(blogArticleForCard({ id: 'x2', lesson: '' })).toBeNull();
    expect(blogArticleForCard(null)).toBeNull();
    expect(blogUrlForCard(undefined)).toBeNull();
  });
});
