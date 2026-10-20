import { MemberEditForm } from './member-edit.form';

describe('Member form', () => {
  it('starts empty for a new member', () => {
    const form = new MemberEditForm();
    form.load(null);
    expect(form.fullName()).toBe('');
    expect(form.validate()).toBe(false);
    expect(form.errors()).toEqual({ fullName: 'Enter the member’s full name.' });
  });

  it('shows a stored number the way it is written at the desk', () => {
    const form = new MemberEditForm();
    form.load({ id: 1, fullName: 'Grace Mensah', phone: '254712448210', group: 'Choir', onLoanCount: 0, overdueCount: 0 });
    expect(form.phone()).toBe('0712 448 210');
    expect(form.group()).toBe('Choir');
  });

  it('builds the request, tidying spaces and clearing empty fields', () => {
    const form = new MemberEditForm();
    form.fullName.set('  Grace   Wanjiku ');
    form.phone.set(' ');
    form.group.set('');
    expect(form.validate()).toBe(true);
    expect(form.toRequest()).toEqual({ fullName: 'Grace Wanjiku', phone: null, group: null });
  });

  it('flags a phone number that is too short or too long', () => {
    const form = new MemberEditForm();
    form.fullName.set('Grace');
    form.phone.set('0712');
    expect(form.validate()).toBe(false);
    expect(form.firstError()).toBe('phone');
    form.phone.set('+254 712 448 210');
    expect(form.validate()).toBe(true);
  });

  it('shows the server’s errors and clears one when its field changes', () => {
    const form = new MemberEditForm();
    form.showServerErrors({ phone: 'This number belongs to Samuel Okoro', other: 'ignored' });
    expect(form.errors()).toEqual({ phone: 'This number belongs to Samuel Okoro' });
    form.clearError('phone');
    expect(form.errors()).toEqual({});
  });
});
