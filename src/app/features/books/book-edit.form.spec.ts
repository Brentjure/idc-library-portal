import { Book } from '../../core/models/book.model';
import { BookEditForm } from './book-edit.form';

const BOOK: Book = {
  id: 5,
  categoryId: 1,
  categoryName: 'Classics',
  title: 'Mere Christianity',
  author: 'C. S. Lewis',
  isbn: '9780060652920',
  publisher: null,
  publicationYear: 2001,
  description: null,
  coverImage: null,
  totalCopies: 3,
  availableCopies: 2,
};

describe('Edit book form', () => {
  it('starts from the book as it is', () => {
    const form = new BookEditForm();
    form.load(BOOK);

    expect(form.title()).toBe('Mere Christianity');
    expect(form.year()).toBe('2001');
    expect(form.publisher()).toBe('');
    expect(form.validate()).toBe(true);
  });

  it('builds the request, trimming text and cleaning the ISBN', () => {
    const form = new BookEditForm();
    form.load(BOOK);
    form.title.set('  Mere Christianity ');
    form.isbn.set('0-06-065292-6');
    form.year.set('');
    form.publisher.set(' HarperOne ');

    expect(form.toRequest()).toEqual({
      title: 'Mere Christianity',
      author: 'C. S. Lewis',
      categoryId: 1,
      isbn: '0060652926',
      publicationYear: null,
      publisher: 'HarperOne',
      description: null,
    });
  });

  it('explains what is missing or wrong, in form order', () => {
    const form = new BookEditForm();
    form.load(BOOK);
    form.title.set(' ');
    form.author.set('');
    form.isbn.set('9780060652921');
    form.year.set('2099');

    expect(form.validate(2026)).toBe(false);
    expect(form.errors()).toEqual({
      title: 'Enter the title.',
      author: 'Enter the author. Use “Unknown” if it isn’t printed on the book.',
      isbn: 'That ISBN isn’t valid. Check the digits.',
      publicationYear: 'Enter a year between 1450 and 2026.',
    });
    expect(form.firstError()).toBe('title');
  });

  it('shows the server’s field errors and ignores unknown fields', () => {
    const form = new BookEditForm();
    form.showServerErrors({ title: 'Another book already has this title and author', 'books[0].x': 'nope' });

    expect(form.errors()).toEqual({ title: 'Another book already has this title and author' });
  });

  it('clears one field’s error as soon as it is edited', () => {
    const form = new BookEditForm();
    form.showServerErrors({ title: 'Taken', isbn: 'Bad' });

    form.clearError('title');

    expect(form.errors()).toEqual({ isbn: 'Bad' });
  });
});
