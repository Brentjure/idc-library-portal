import { CatalogueEntry } from '../../core/models/book.model';

export type Availability = 'all' | 'in' | 'out';
export type CatalogueSort = 'title' | 'popular' | 'recent' | 'out';

export interface CatalogueFilter {
  query: string;
  /** A category id, or null for all. */
  categoryId: number | null;
  availability: Availability;
}

export interface CatalogueStats {
  titles: number;
  copies: number;
  onShelf: number;
  onLoan: number;
  allOut: number;
}

export interface ShelfStatus {
  label: 'On shelf' | 'Few left' | 'All out';
  pill: 'pill-ok' | 'pill-loan' | 'pill-bad';
}

/** "All out" when nothing is on the shelf, "Few left" at a third or less, otherwise "On shelf". */
export function shelfStatus(entry: CatalogueEntry): ShelfStatus {
  if (!entry.availableCopies) return { label: 'All out', pill: 'pill-bad' };
  if (entry.availableCopies / entry.totalCopies <= 0.34) return { label: 'Few left', pill: 'pill-loan' };
  return { label: 'On shelf', pill: 'pill-ok' };
}

export function catalogueStats(entries: readonly CatalogueEntry[]): CatalogueStats {
  return {
    titles: entries.length,
    copies: sum(entries, (e) => e.totalCopies),
    onShelf: sum(entries, (e) => e.availableCopies),
    onLoan: sum(entries, (e) => e.onLoanCopies),
    allOut: entries.filter((e) => e.totalCopies > 0 && !e.availableCopies).length,
  };
}

/** Matches title, author, ISBN (with or without hyphens) or any copy's code, ignoring case. */
export function matchesQuery(entry: CatalogueEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = q.replace(/[-\s]/g, '');
  return (
    entry.title.toLowerCase().includes(q) ||
    entry.author.toLowerCase().includes(q) ||
    (!!compact && !!entry.isbn && entry.isbn.toLowerCase().includes(compact)) ||
    entry.bookCodes.some((code) => code.toLowerCase().includes(q))
  );
}

export function filterCatalogue(entries: readonly CatalogueEntry[], filter: CatalogueFilter): CatalogueEntry[] {
  return entries.filter(
    (e) =>
      (filter.categoryId === null || e.categoryId === filter.categoryId) &&
      (filter.availability === 'all' || (filter.availability === 'in' ? e.availableCopies > 0 : e.availableCopies === 0)) &&
      matchesQuery(e, filter.query),
  );
}

const SHELF_SHARE = (e: CatalogueEntry) => (e.totalCopies ? e.availableCopies / e.totalCopies : 0);

const COMPARE: Record<CatalogueSort, (a: CatalogueEntry, b: CatalogueEntry) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  popular: (a, b) => b.timesBorrowed - a.timesBorrowed,
  recent: (a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''),
  out: (a, b) => SHELF_SHARE(a) - SHELF_SHARE(b),
};

/** A sorted copy. Ties fall back to the title so the order never jumps around. */
export function sortCatalogue(entries: readonly CatalogueEntry[], sort: CatalogueSort): CatalogueEntry[] {
  return [...entries].sort((a, b) => COMPARE[sort](a, b) || COMPARE.title(a, b));
}

/** Category chips: those with at least one title, with how many titles each has. */
export function categoryCounts(entries: readonly CatalogueEntry[]): { id: number; name: string; count: number }[] {
  const byId = new Map<number, { id: number; name: string; count: number }>();
  for (const e of entries) {
    const chip = byId.get(e.categoryId) ?? { id: e.categoryId, name: e.categoryName ?? 'Other', count: 0 };
    chip.count++;
    byId.set(e.categoryId, chip);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function sum(entries: readonly CatalogueEntry[], value: (e: CatalogueEntry) => number): number {
  return entries.reduce((total, e) => total + value(e), 0);
}
