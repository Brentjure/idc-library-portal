import { checkRow, normaliseHeader } from './donation-sheet';

const CATEGORIES = ['Christian living', 'Children', 'Devotional'];

describe('donation sheet rows', () => {
  it('reads template headers with stars and spaces', () => {
    expect(normaliseHeader('Title*')).toBe('title');
    expect(normaliseHeader(' publication year ')).toBe('publication_year');
  });

  it('accepts a complete row and matches the category ignoring case', () => {
    const row = checkRow(
      { 'title*': 'Mere Christianity', 'author*': 'C. S. Lewis', 'category*': 'christian LIVING', copies: 2, condition: 'Good', isbn: '978-0-06-065292-0' },
      2,
      CATEGORIES,
    );
    expect(row.errors).toEqual([]);
    expect(row.category).toBe('Christian living');
    expect(row.copies).toBe(2);
    expect(row.condition).toBe('GOOD');
    expect(row.isbn).toBe('9780060652920');
  });

  it('defaults copies to 1 and condition to Good', () => {
    const row = checkRow({ title: 'A', author: 'B', category: 'Children' }, 3, CATEGORIES);
    expect(row.errors).toEqual([]);
    expect(row.copies).toBe(1);
    expect(row.condition).toBe('GOOD');
  });

  it('lists every problem in a bad row', () => {
    const row = checkRow(
      { title: 'Cookbook', author: '', category: 'Cookery', copies: 99, condition: 'Fair', isbn: '12345', publication_year: 1200 },
      4,
      CATEGORIES,
    );
    expect(row.errors).toEqual([
      'Author missing',
      'Unknown category “Cookery”',
      'Copies must be 1–50',
      'Condition must be New, Good or Worn',
      'ISBN isn’t valid. Check the digits',
      'Year looks wrong',
    ]);
  });
});
