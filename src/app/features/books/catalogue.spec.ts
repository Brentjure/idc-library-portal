import { CatalogueEntry } from '../../core/models/book.model';
import { catalogueStats, categoryCounts, filterCatalogue, shelfStatus, sortCatalogue } from './catalogue';

function entry(overrides: Partial<CatalogueEntry>): CatalogueEntry {
  return {
    id: 1,
    title: 'Mere Christianity',
    author: 'C. S. Lewis',
    publicationYear: 2001,
    categoryId: 1,
    categoryName: 'Classics',
    isbn: '9780060652920',
    totalCopies: 3,
    availableCopies: 2,
    onLoanCopies: 1,
    timesBorrowed: 10,
    addedAt: '2026-10-01T09:00:00',
    bookCodes: ['BK-000101', 'BK-000102', 'BK-000103'],
    ...overrides,
  };
}

const MERE = entry({});
const KNOWING = entry({
  id: 2,
  title: 'Knowing God',
  author: 'J. I. Packer',
  categoryId: 2,
  categoryName: 'Theology',
  isbn: null,
  totalCopies: 2,
  availableCopies: 0,
  onLoanCopies: 2,
  timesBorrowed: 30,
  addedAt: '2026-10-15T09:00:00',
  bookCodes: ['BK-000201', 'BK-000202'],
});
const PURSUIT = entry({
  id: 3,
  title: 'The Pursuit of God',
  author: 'A. W. Tozer',
  isbn: '9781600661068',
  totalCopies: 4,
  availableCopies: 1,
  onLoanCopies: 3,
  timesBorrowed: 5,
  addedAt: '2026-09-01T09:00:00',
  bookCodes: ['BK-000301'],
});
const ALL = [MERE, KNOWING, PURSUIT];

describe('catalogue', () => {
  it('says how full the shelf is', () => {
    expect(shelfStatus(MERE)).toEqual({ label: 'On shelf', pill: 'pill-ok' });
    expect(shelfStatus(PURSUIT)).toEqual({ label: 'Few left', pill: 'pill-loan' });
    expect(shelfStatus(KNOWING)).toEqual({ label: 'All out', pill: 'pill-bad' });
  });

  it('adds up the summary strip', () => {
    expect(catalogueStats(ALL)).toEqual({ titles: 3, copies: 9, onShelf: 3, onLoan: 6, allOut: 1 });
  });

  it('searches title, author, ISBN with hyphens and book codes', () => {
    const find = (query: string) => filterCatalogue(ALL, { query, categoryId: null, availability: 'all' }).map((e) => e.id);
    expect(find('knowing')).toEqual([2]);
    expect(find('tozer')).toEqual([3]);
    expect(find('978-0-06-065292')).toEqual([1]);
    expect(find('bk-000202')).toEqual([2]);
    expect(find('  ')).toEqual([1, 2, 3]);
    expect(find('nothing like this')).toEqual([]);
  });

  it('filters by category and by what is on the shelf', () => {
    expect(filterCatalogue(ALL, { query: '', categoryId: 2, availability: 'all' }).map((e) => e.id)).toEqual([2]);
    expect(filterCatalogue(ALL, { query: '', categoryId: null, availability: 'in' }).map((e) => e.id)).toEqual([1, 3]);
    expect(filterCatalogue(ALL, { query: '', categoryId: null, availability: 'out' }).map((e) => e.id)).toEqual([2]);
  });

  it('sorts four ways without changing the list it was given', () => {
    expect(sortCatalogue(ALL, 'title').map((e) => e.id)).toEqual([2, 1, 3]);
    expect(sortCatalogue(ALL, 'popular').map((e) => e.id)).toEqual([2, 1, 3]);
    expect(sortCatalogue(ALL, 'recent').map((e) => e.id)).toEqual([2, 1, 3]);
    expect(sortCatalogue(ALL, 'out').map((e) => e.id)).toEqual([2, 3, 1]);
    expect(ALL.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('counts titles per category for the chips', () => {
    expect(categoryCounts(ALL)).toEqual([
      { id: 1, name: 'Classics', count: 2 },
      { id: 2, name: 'Theology', count: 1 },
    ]);
  });
});
