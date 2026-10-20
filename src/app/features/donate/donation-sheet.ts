import { CopyCondition } from '../../core/models/book.model';
import { cleanIsbn, isValidIsbn, isValidYear } from './book-rules';

/** One spreadsheet row after checking. Rows with errors are shown in red and skipped. */
export interface SheetRow {
  row: number;
  title: string;
  author: string;
  category: string;
  copies: number;
  condition: CopyCondition;
  isbn: string;
  publisher: string;
  year: number | null;
  description: string;
  errors: string[];
}

export type SheetResult = { fileName: string; rows: SheetRow[] } | { error: string };

/** Columns of public/book-donation-template.xlsx. A trailing * in the header marks a required one. */
const COLUMNS = ['title', 'author', 'category', 'copies', 'condition', 'isbn', 'publisher', 'publication_year', 'description'];
const CONDITIONS: CopyCondition[] = ['NEW', 'GOOD', 'WORN'];

/** "Title*" → "title", "Publication year" → "publication_year" */
export function normaliseHeader(key: string): string {
  return key.toLowerCase().replace(/\*/g, '').trim().replace(/[\s-]+/g, '_');
}

/** Checks one spreadsheet row. `categories` are the allowed category names. */
export function checkRow(raw: Record<string, unknown>, rowNumber: number, categories: string[]): SheetRow {
  const cell: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const column = normaliseHeader(key);
    if (COLUMNS.includes(column)) {
      cell[column] = String(value ?? '').trim();
    }
  }
  const errors: string[] = [];

  const title = cell['title'] ?? '';
  const author = cell['author'] ?? '';
  if (!title) errors.push('Title missing');
  if (!author) errors.push('Author missing');

  const typedCategory = cell['category'] ?? '';
  const category = categories.find((c) => c.toLowerCase() === typedCategory.toLowerCase());
  if (!typedCategory) errors.push('Category missing');
  else if (!category) errors.push(`Unknown category “${typedCategory}”`);

  let copies = 1;
  if (cell['copies']) {
    copies = Number(cell['copies']);
    if (!Number.isInteger(copies) || copies < 1 || copies > 50) {
      errors.push('Copies must be 1–50');
      copies = 1;
    }
  }

  const condition = CONDITIONS.find((c) => c === (cell['condition'] || 'GOOD').toUpperCase());
  if (!condition) errors.push('Condition must be New, Good or Worn');

  const isbn = cleanIsbn(cell['isbn'] ?? '');
  if (isbn && !isValidIsbn(isbn)) errors.push('ISBN isn’t valid. Check the digits');

  let year: number | null = cell['publication_year'] ? Number(cell['publication_year']) : null;
  if (year !== null && !isValidYear(year)) {
    errors.push('Year looks wrong');
    year = null;
  }

  return {
    row: rowNumber,
    title,
    author,
    category: category ?? typedCategory,
    copies,
    condition: condition ?? 'GOOD',
    isbn,
    publisher: cell['publisher'] ?? '',
    year,
    description: cell['description'] ?? '',
    errors,
  };
}

/** Reads and checks the first sheet of an .xlsx, .xls or .csv file. SheetJS is loaded only when needed. */
export async function readDonationSheet(file: File, categories: string[]): Promise<SheetResult> {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return { error: 'Choose an Excel (.xlsx, .xls) or .csv file.' };
  }
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils
      .sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      .filter((row) => Object.values(row).some((value) => String(value).trim() !== ''));
    if (!rows.length) {
      return { error: 'That sheet has no book rows. Fill in the first sheet of the template.' };
    }
    const headers = Object.keys(rows[0]).map(normaliseHeader);
    if (!headers.includes('title') || !headers.includes('author')) {
      return { error: 'Columns not recognised. Use the template: title, author, category…' };
    }
    // Row 1 is the header, so the first book is on spreadsheet row 2.
    return { fileName: file.name, rows: rows.map((row, i) => checkRow(row, i + 2, categories)) };
  } catch {
    return { error: 'Could not read that file. Save it as .xlsx and try again.' };
  }
}
