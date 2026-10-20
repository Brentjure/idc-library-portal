import { IsbnLookup } from '../../../core/models/book.model';
import { IsbnLookupState } from './isbn-lookup';

function answer(overrides: Partial<IsbnLookup> = {}): IsbnLookup {
  return {
    isbn: '9780060652920',
    source: 'OPEN_LIBRARY',
    online: true,
    title: 'Mere Christianity',
    author: 'C. S. Lewis',
    publisher: 'HarperOne',
    publicationYear: 2001,
    description: null,
    coverUrl: null,
    existingTitle: null,
    ...overrides,
  };
}

describe('ISBN lookup', () => {
  it('looks up a complete, valid ISBN once', async () => {
    const calls: string[] = [];
    const state = new IsbnLookupState(async (isbn) => {
      calls.push(isbn);
      return answer();
    });

    const result = await state.check('978-0-06-065292-0');
    await state.check('9780060652920'); // same ISBN, spelled differently

    expect(calls).toEqual(['9780060652920']);
    expect(result?.title).toBe('Mere Christianity');
    expect(state.status()).toBe('done');
    expect(state.note()).toEqual({ text: '✓ Found on Open Library. Check the details before adding.', good: true });
  });

  it('says nothing while the ISBN is still being typed', async () => {
    const state = new IsbnLookupState(async () => answer());

    expect(await state.check('978006')).toBeNull();
    expect(state.status()).toBe('idle');
    expect(state.note()).toBeNull();
  });

  it('flags a full-length ISBN with a wrong check digit without looking it up', async () => {
    let called = false;
    const state = new IsbnLookupState(async () => {
      called = true;
      return answer();
    });

    await state.check('9780060652921');

    expect(called).toBe(false);
    expect(state.status()).toBe('invalid');
    expect(state.note()?.text).toContain('doesn’t look right');
  });

  it('explains when nothing was found online', async () => {
    const state = new IsbnLookupState(async () => answer({ source: 'NONE', title: null }));

    await state.check('9780060652920');

    expect(state.note()).toEqual({ text: 'Not found online. Fill in the details yourself.', good: false });
  });

  it('does not mention online catalogues when online lookup is off', async () => {
    const state = new IsbnLookupState(async () => answer({ source: 'NONE', online: false, title: null }));

    await state.check('9780060652920');

    expect(state.note()?.text).toBe('Not in the library yet. Fill in the details yourself.');
  });

  it('leaves the library message to the title note', async () => {
    const state = new IsbnLookupState(async () => answer({ source: 'LIBRARY' }));

    await state.check('9780060652920');

    expect(state.note()).toBeNull();
  });

  it('lets the person carry on when the lookup fails', async () => {
    const state = new IsbnLookupState(async () => {
      throw new Error('offline');
    });

    expect(await state.check('9780060652920')).toBeNull();
    expect(state.status()).toBe('failed');
    expect(state.note()?.text).toContain('Fill in the details yourself');
  });

  it('ignores an answer for an ISBN that has since been changed', async () => {
    let finish!: (value: IsbnLookup) => void;
    const state = new IsbnLookupState((isbn) =>
      isbn === '9780060652920' ? new Promise<IsbnLookup>((resolve) => (finish = resolve)) : Promise.resolve(answer({ isbn, title: 'Clean Code' })),
    );

    const slow = state.check('9780060652920');
    await state.check('9780132350884');
    finish(answer());

    expect(await slow).toBeNull();
    expect(state.result()?.title).toBe('Clean Code');
  });

  it('forgets everything on reset', async () => {
    const state = new IsbnLookupState(async () => answer());
    await state.check('9780060652920');

    state.reset();

    expect(state.status()).toBe('idle');
    expect(state.result()).toBeNull();
  });
});
