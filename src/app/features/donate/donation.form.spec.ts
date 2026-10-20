import { Book } from '../../core/models/book.model';
import { DonationForm, NewDraftBook } from './donation.form';

function newTitle(title: string, copies = 1): NewDraftBook {
  return {
    existing: null, fromSpreadsheet: false, title, author: 'A. W. Tozer', categoryId: 2, categoryName: 'Devotional',
    copies, condition: 'GOOD', isbn: '', publisher: '', year: null, description: '',
  };
}

const KNOWING_GOD = { id: 7, title: 'Knowing God', author: 'J.I. Packer' } as Book;

describe('DonationForm', () => {
  it('needs a donor for a donation but not for a purchase', () => {
    const form = new DonationForm();
    form.addBooks(newTitle('The Pursuit of God'));
    expect(form.canSave()).toBe(false);

    form.donorName.set('Pastor James');
    expect(form.canSave()).toBe(true);

    form.donorName.set('');
    form.source.set('PURCHASE');
    expect(form.canSave()).toBe(true);
    expect(form.toRequest().donor).toBeUndefined();
  });

  it('sends only the id for an existing title and all details for a new one', () => {
    const form = new DonationForm();
    form.setAnonymous(true);
    form.addBooks(newTitle('The Pursuit of God', 2), { ...newTitle('Knowing God'), existing: KNOWING_GOD });
    expect(form.totalCopies()).toBe(3);
    expect(form.toRequest()).toEqual({
      source: 'DONATION',
      donor: { anonymous: true },
      books: [
        { title: 'The Pursuit of God', author: 'A. W. Tozer', categoryId: 2, categoryName: undefined, isbn: undefined,
          publisher: undefined, publicationYear: undefined, description: undefined, copies: 2, condition: 'GOOD' },
        { titleId: 7, copies: 1, condition: 'GOOD' },
      ],
    });
  });

  it('puts server errors next to the right book and the donor', () => {
    const form = new DonationForm();
    form.addBooks(newTitle('One'), newTitle('Two'));
    const secondKey = form.books()[1].key;
    form.showServerErrors({ 'books[1].author': 'Author is required for a new title', 'donor.name': 'Enter the donor' });
    expect(form.bookErrors()[secondKey]).toEqual(['Author is required for a new title']);
    expect(form.donorError()).toBe('Enter the donor');

    form.removeBook(secondKey);
    expect(form.bookErrors()[secondKey]).toBeUndefined();
  });

  it('keeps the source when reset for the next donor', () => {
    const form = new DonationForm();
    form.source.set('PURCHASE');
    form.addBooks(newTitle('One'));
    form.reset();
    expect(form.books()).toEqual([]);
    expect(form.isPurchase()).toBe(true);
  });
});
