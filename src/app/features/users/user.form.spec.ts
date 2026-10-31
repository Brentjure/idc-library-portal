import { StaffUser } from '../../core/models/user.model';
import { UserForm } from './user.form';

const GRACE: StaffUser = {
  id: 2,
  name: 'Grace Mensah',
  email: 'grace@idc.org',
  phone: null,
  status: 'DISABLED',
  inviteExpiresAt: null,
  inviteExpired: false,
  lastLoginAt: null,
  roleId: 2,
  roleName: 'LIBRARIAN',
  createdAt: null,
  lockedUntil: null,
};

describe('User form', () => {
  it('starts a new user with the default role and able to sign in', () => {
    const form = new UserForm();
    form.load(null, 2);
    expect(form.roleId()).toBe(2);
    expect(form.canSignIn()).toBe(true);
    expect(form.validate()).toBe(false);
    expect(Object.keys(form.errors())).toEqual(['name', 'email']);
  });

  it('loads an existing user, disabled ones switched off', () => {
    const form = new UserForm();
    form.load(GRACE);
    expect(form.email()).toBe('grace@idc.org');
    expect(form.canSignIn()).toBe(false);
  });

  it('builds the request with a tidy name and a lower-case email', () => {
    const form = new UserForm();
    form.load(null, 1);
    form.name.set('  Grace   Mensah ');
    form.email.set(' Grace@IDC.org ');
    expect(form.validate()).toBe(true);
    expect(form.toNewUser()).toEqual({ name: 'Grace Mensah', email: 'grace@idc.org', phone: null, roleId: 1 });
    expect(form.toUpdate().canSignIn).toBe(true);
  });

  it('flags a bad email, a bad phone and a missing role, in form order', () => {
    const form = new UserForm();
    form.load(null, null);
    form.name.set('Grace');
    form.email.set('grace@');
    form.phone.set('0712');
    expect(form.validate()).toBe(false);
    expect(form.firstError()).toBe('email');
    expect(Object.keys(form.errors())).toEqual(['email', 'phone', 'roleId']);
  });

  it('shows the server’s field errors', () => {
    const form = new UserForm();
    form.showServerErrors({ email: 'This email belongs to Grace Mensah' });
    expect(form.errors()).toEqual({ email: 'This email belongs to Grace Mensah' });
    form.clearError('email');
    expect(form.errors()).toEqual({});
  });
});
