import { Injectable, inject } from '@angular/core';
import { Book, BookDetail, BookUpdate, CatalogueEntry, Category, IsbnLookup } from '../models/book.model';
import { ApiClient } from './api-client.service';

/** /api/v1/books and /api/v1/categories */
@Injectable({ providedIn: 'root' })
export class BooksApi {
  private readonly api = inject(ApiClient);

  /** Title, author or ISBN search, with copies on the shelf. */
  search(query: string, limit = 8): Promise<Book[]> {
    return this.api.get('/books', { q: query, limit });
  }

  /** Our catalogue first, then the online catalogues. Fails with 400 for an ISBN with a wrong check digit. */
  lookupIsbn(isbn: string): Promise<IsbnLookup> {
    return this.api.get(`/books/isbn/${encodeURIComponent(isbn)}`);
  }

  /** The Books page: every title with counts, times borrowed and book codes. */
  catalogue(): Promise<CatalogueEntry[]> {
    return this.api.get('/books/catalogue');
  }

  detail(id: number): Promise<BookDetail> {
    return this.api.get(`/books/${id}`);
  }

  /** Field errors come back on ApiError.fieldErrors (title, author, isbn, publicationYear, categoryId). */
  update(id: number, changes: BookUpdate): Promise<BookDetail> {
    return this.api.put(`/books/${id}`, changes);
  }

  /** Soft delete. Fails with 409 while a copy is on loan or set aside. */
  remove(id: number): Promise<void> {
    return this.api.delete(`/books/${id}`);
  }

  categories(): Promise<Category[]> {
    return this.api.get('/categories');
  }

  /** The labelling step: these copies now carry their code. */
  markLabelled(copyIds: number[]): Promise<number> {
    return this.api.patch('/books/copies/labelled', { copyIds });
  }
}
