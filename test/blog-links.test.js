import { describe, expect, test } from 'vitest';
import { blogUrlForCard, LESSON_ARTICLE_URLS } from '../src/lib/blogLinks.js';

describe('blogLinks: カードとブログ記事の対応', () => {
  test('レッスン日ごとに、その回のレッスン記事を返す', () => {
    for (const [lesson, url] of Object.entries(LESSON_ARTICLE_URLS)) {
      expect(blogUrlForCard({ id: 'c999', lesson })).toBe(url);
    }
  });

  test('lesson が ISO 日時で届いても先頭10文字で対応する', () => {
    expect(blogUrlForCard({ id: 'c041', lesson: '2026-11-14T15:00:00.000Z' })).toBe(
      LESSON_ARTICLE_URLS['2026-11-14']
    );
  });

  test('lesson が JST の実施日で届いても前日キーで対応する', () => {
    expect(blogUrlForCard({ id: 'c012', lesson: '2026-10-31' })).toBe(
      LESSON_ARTICLE_URLS['2026-10-30']
    );
  });

  test('雨の日の記事から作ったカードは個別対応が優先される', () => {
    const url = blogUrlForCard({ id: 'c038', lesson: '2026-10-23' });
    expect(url).toContain('1GX0Om0xWPLGzOsU2dY6lkBYA-iC-sYuwo2A0bv-7XUU');
    expect(url).not.toBe(LESSON_ARTICLE_URLS['2026-10-23']);
  });

  test('対応する記事が無いカードは null', () => {
    expect(blogUrlForCard({ id: 'x1', lesson: '2027-01-01' })).toBeNull();
    expect(blogUrlForCard({ id: 'x2', lesson: '' })).toBeNull();
    expect(blogUrlForCard(null)).toBeNull();
    expect(blogUrlForCard(undefined)).toBeNull();
  });
});
