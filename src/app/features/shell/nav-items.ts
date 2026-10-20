import { IconName } from '../../components/icon/icons';
import { Permission } from '../../core/models/auth.model';
import { DonationSource } from '../../core/models/donation.model';

/**
 * One menu entry. It either opens a page (`link`), opens the donate drawer (`opens`),
 * or has neither and shows "Soon" because the page isn't built yet.
 */
export interface NavItem {
  label: string;
  icon: IconName;
  link?: string;
  /** Query parameters for the link, e.g. { tab: 'overdue' }. */
  query?: Record<string, string>;
  opens?: DonationSource;
  /** Hidden from users without this permission. */
  permission?: Permission;
  /** Shows the overdue count as a red badge. */
  showsOverdue?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** The sidebar menu, as in the mockup. When a "Soon" page is built, add its route and a `link`. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main menu',
    items: [
      { label: 'Overview', icon: 'home', link: '/' },
      { label: 'Books', icon: 'book', link: '/books', permission: 'books.view' },
      { label: 'Loans & Returns', icon: 'swap', link: '/loans', permission: 'loans.view' },
      { label: 'Members', icon: 'users', link: '/members', permission: 'members.list' },
      { label: 'Reservations', icon: 'bookmark' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Reports & Analytics', icon: 'chart', link: '/reports', permission: 'VIEW_REPORTS' },
      { label: 'Overdue Reminders', icon: 'clock', link: '/loans', query: { tab: 'overdue' }, permission: 'loans.view', showsOverdue: true },
      { label: 'Add Books', icon: 'bookPlus', opens: 'PURCHASE', permission: 'donations.record' },
      { label: 'Donations', icon: 'gift', opens: 'DONATION', permission: 'donations.record' },
      { label: 'Users', icon: 'user', link: '/users', permission: 'MANAGE_USERS' },
      { label: 'Roles & Permissions', icon: 'shield', link: '/roles', permission: 'MANAGE_USERS' },
    ],
  },
  {
    label: 'Settings & others',
    items: [
      { label: 'Settings', icon: 'settings' },
      { label: 'Help', icon: 'help' },
    ],
  },
];
