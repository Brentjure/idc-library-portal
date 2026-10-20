import { capitalise, coverColor, formatPhone, initials, plural, roleLabel } from './format';

describe('format', () => {
  it('pluralises', () => {
    expect(plural(1, 'book')).toBe('1 book');
    expect(plural(3, 'book')).toBe('3 books');
    expect(plural(2, 'copy', 'copies')).toBe('2 copies');
  });

  it('makes initials from first and last name', () => {
    expect(initials('Grace Mensah')).toBe('GM');
    expect(initials('  ruth  wanjiru kamau ')).toBe('RK');
    expect(initials('Samuel')).toBe('S');
  });

  it('shows Kenyan numbers in local form', () => {
    expect(formatPhone('254712448210')).toBe('0712 448 210');
    expect(formatPhone('447700900123')).toBe('447700900123');
    expect(formatPhone(null)).toBe('');
  });

  it('gives a title the same cover colour every time', () => {
    expect(coverColor('Knowing God')).toBe(coverColor('knowing god'));
  });

  it('capitalises enum words', () => {
    expect(capitalise('DAMAGED')).toBe('Damaged');
  });
  it('shows role names the way people say them', () => {
    expect(roleLabel('ADMIN')).toBe('Administrator');
    expect(roleLabel('LIBRARIAN')).toBe('Librarian');
    expect(roleLabel('HEAD_LIBRARIAN')).toBe('Head Librarian');
    expect(roleLabel(null)).toBe('No role');
  });
});
