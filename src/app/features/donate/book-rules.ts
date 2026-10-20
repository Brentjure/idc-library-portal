/** Checks for book details typed at the desk or read from a spreadsheet. The server checks them again. */

export const MIN_PUBLICATION_YEAR = 1450;

/** "978-0-06-065292-0" → "9780060652920" */
export function cleanIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, '').toUpperCase();
}

/** A cleaned ISBN-10 or ISBN-13 whose last (check) digit is right, so most typos are caught. */
export function isValidIsbn(isbn: string): boolean {
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((total, ch, i) => total + (10 - i) * (ch === 'X' ? 10 : Number(ch)), 0);
    return sum % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, ch, i) => total + (i % 2 === 0 ? 1 : 3) * Number(ch), 0);
    return sum % 10 === 0;
  }
  return false;
}

export function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_PUBLICATION_YEAR && year <= new Date().getFullYear();
}
