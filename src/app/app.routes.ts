import { Routes } from '@angular/router';
import { permissionGuard, signedInGuard, signedOutGuard } from './core/auth/auth.guard';

/**
 * Pages of the app. Each page is loaded only when first visited.
 * `data.heading` is the title shown in the top bar.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · IDC JKUAT Library',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./features/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    // From an invitation link: open to anyone with the link, signed in or not.
    path: 'setup/:token',
    title: 'Set up your account · IDC JKUAT Library',
    loadComponent: () => import('./features/setup/setup-page.component').then((m) => m.SetupPageComponent),
  },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        title: 'Overview · IDC JKUAT Library',
        data: { heading: 'Overview' },
        loadComponent: () => import('./features/overview/overview-page.component').then((m) => m.OverviewPageComponent),
      },
      {
        path: 'loans',
        title: 'Loans & Returns · IDC JKUAT Library',
        data: { heading: 'Loans & Returns' },
        canActivate: [permissionGuard('loans.view')],
        loadComponent: () => import('./features/loans/loans-page.component').then((m) => m.LoansPageComponent),
      },
      {
        path: 'reports',
        title: 'Reports & Analytics · IDC JKUAT Library',
        data: { heading: 'Reports & Analytics' },
        canActivate: [permissionGuard('VIEW_REPORTS')],
        loadComponent: () => import('./features/reports/reports-page.component').then((m) => m.ReportsPageComponent),
      },
      {
        path: 'roles',
        title: 'Roles & Permissions · IDC JKUAT Library',
        data: { heading: 'Roles & Permissions' },
        canActivate: [permissionGuard('MANAGE_USERS')],
        loadComponent: () => import('./features/roles/roles-page.component').then((m) => m.RolesPageComponent),
      },
      {
        path: 'users',
        title: 'Users · IDC JKUAT Library',
        data: { heading: 'Users' },
        canActivate: [permissionGuard('MANAGE_USERS')],
        loadComponent: () => import('./features/users/users-page.component').then((m) => m.UsersPageComponent),
      },
      {
        path: 'members',
        title: 'Members · IDC JKUAT Library',
        data: { heading: 'Members' },
        canActivate: [permissionGuard('members.list')],
        loadComponent: () => import('./features/members/members-page.component').then((m) => m.MembersPageComponent),
      },
      {
        path: 'books',
        title: 'Books · IDC JKUAT Library',
        data: { heading: 'Books' },
        canActivate: [permissionGuard('books.view')],
        loadComponent: () => import('./features/books/books-page.component').then((m) => m.BooksPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
