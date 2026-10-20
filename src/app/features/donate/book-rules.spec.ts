import { cleanIsbn, isValidIsbn, isValidYear } from './book-rules';

describe('book rules', () => {
  it('cleans spaces and hyphens from an ISBN', () => {
    expect(cleanIsbn(' 978-0-13-235088-4 ')).toBe('9780132350884');
    expect(cleanIsbn('0-8044-2957-x')).toBe('080442957X');
  });

  it('accepts ISBNs whose check digit is right', () => {
    expect(isValidIsbn('9780132350884')).toBe(true);
    expect(isValidIsbn('0132350882')).toBe(true);
    expect(isValidIsbn('080442957X')).toBe(true);
    expect(isValidIsbn('9798886450101')).toBe(true);
  });

  it('rejects typos and wrong shapes', () => {
    expect(isValidIsbn('9780132350885')).toBe(false); // wrong check digit
    expect(isValidIsbn('9780132530884')).toBe(false); // two digits swapped
    expect(isValidIsbn('1234567890123')).toBe(false); // 13 digits not starting 978 or 979
    expect(isValidIsbn('013235088')).toBe(false);
    expect(isValidIsbn('X132350882')).toBe(false);
  });

  it('accepts years from the printing press to now', () => {
    expect(isValidYear(1450)).toBe(true);
    expect(isValidYear(new Date().getFullYear())).toBe(true);
    expect(isValidYear(1449)).toBe(false);
    expect(isValidYear(new Date().getFullYear() + 1)).toBe(false);
  });
});
