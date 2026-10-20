import { passwordChecklist, passwordReady } from './password-checklist';

const ok = (password: string, confirm = password, name = 'Grace Mensah', email = 'grace@idc.org') =>
  passwordChecklist(password, confirm, name, email).map((item) => item.ok);

describe('password checklist', () => {
  it('ticks everything for a good password typed twice', () => {
    expect(ok('shelf7Lantern')).toEqual([true, true, true, true]);
    expect(passwordReady(passwordChecklist('shelf7Lantern', 'shelf7Lantern', 'Grace', 'grace@idc.org'))).toBe(true);
  });

  it('starts with nothing ticked', () => {
    expect(ok('', '')).toEqual([false, false, false, false]);
  });

  it('needs length, a letter and a number', () => {
    expect(ok('ab1')).toEqual([false, true, true, true]);
    expect(ok('abcdefghij')).toEqual([true, false, true, true]);
  });

  it('refuses their name, their email and common passwords', () => {
    expect(ok('mensah2026')[2]).toBe(false);
    expect(ok('xgrace99x')[2]).toBe(false);
    expect(ok('Password123')[2]).toBe(false);
  });

  it('needs both boxes to match', () => {
    expect(ok('shelf7Lantern', 'shelf7lantern')[3]).toBe(false);
  });
});
