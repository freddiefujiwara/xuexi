import { describe, expect, test } from 'vitest';
import { blogUrlForCard } from '../src/lib/blogLinks.js';

const BLOG = 'https://freddiefujiwara.com/blog/';

describe('blogLinks: カードとブログ記事の対応', () => {
  test('レッスン日ごとに、その回のレッスン記事の URL を返す', () => {
    expect(blogUrlForCard({ id: 'c999', lesson: '2026-10-09' })).toBe(
      `${BLOG}13jx2m400GXkY5vf4KJZQtFglwa4I0VtqtlFigtsFrTE`
    );
    expect(blogUrlForCard({ id: 'c999', lesson: '2026-11-14' })).toBe(
      `${BLOG}1N3MbM6oMJiJ6Ab0H3y9beGuXY75dcniechM6GnL8Gmw`
    );
  });

  test('lesson が ISO 日時で届いても先頭10文字で対応する', () => {
    expect(blogUrlForCard({ id: 'c041', lesson: '2026-11-14T15:00:00.000Z' })).toBe(
      `${BLOG}1N3MbM6oMJiJ6Ab0H3y9beGuXY75dcniechM6GnL8Gmw`
    );
  });

  test('lesson が JST の実施日で届いても前日キーで対応する', () => {
    expect(blogUrlForCard({ id: 'c012', lesson: '2026-10-31' })).toBe(
      `${BLOG}1BfOXlaRhgN0Ksxxx0wT9Ku3KPYMbLrzgaZ9xQ7_MOMY`
    );
  });

  test('雨の日の記事から作ったカードは個別対応が優先される', () => {
    const url = blogUrlForCard({ id: 'c038', lesson: '2026-10-23' });
    expect(url).toBe(`${BLOG}1GX0Om0xWPLGzOsU2dY6lkBYA-iC-sYuwo2A0bv-7XUU`);
  });

  test('対応する記事が無いカードは null', () => {
    expect(blogUrlForCard({ id: 'x1', lesson: '2027-01-01' })).toBeNull();
    expect(blogUrlForCard({ id: 'x2', lesson: '' })).toBeNull();
    expect(blogUrlForCard(null)).toBeNull();
    expect(blogUrlForCard(undefined)).toBeNull();
  });
});
