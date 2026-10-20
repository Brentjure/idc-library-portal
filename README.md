# IDC JKUAT Library Portal

Librarian front desk for the IDC JKUAT church library. Staff use it to lend books, take returns, and record donations and church purchases. Members don't sign in.

- **Frontend:** this folder. Angular 21 (standalone components, signals, zoneless) with Tailwind CSS 4.
- **Backend:** `D:\projects\library\library` (Spring Boot 4, PostgreSQL). Served at `http://localhost:8085/idc-library/api/v1`.
- **Design:** `docs/HANDOFF.md` and `docs/mockup/church-library-portal.html`.

## First-time setup

1. **Back up the database, then apply the front-desk migration.**

   ```bash
   pg_dump -d idc_library -Fc -f idc_library_before_002.dump
   psql -d idc_library -v ON_ERROR_STOP=1 -f D:/projects/library/library/src/main/resources/db/002_front_desk.sql
   ```

   The migration does the following:
   - adds members, donations and copy labelling
   - links borrow requests to members and to the staff user who lent each book
   - seeds the 10 categories and the desk permissions
   - drops the title columns duplicated on `book_copies`

   It runs in a single transaction.

2. **Start the backend.** Set a signing secret and the first administrator (created only while the users table is empty):

   ```bash
   cd D:/projects/library/library
   export APP_JWT_SECRET=<at least 32 random characters>
   export APP_BOOTSTRAP_ADMIN_EMAIL=<your email>
   export APP_BOOTSTRAP_ADMIN_PASSWORD=<8+ characters>
   mvn spring-boot:run
   ```

   Without `APP_JWT_SECRET` the server uses a random key, so everyone is signed out on every restart.

3. **Start the portal.**

   ```bash
   npm install
   npm start          # http://localhost:4200, proxies /idc-library to :8085
   ```

## What the desk can do

| Screen | Backend calls |
|---|---|
| Sign in | `POST /auth/login`, `GET /auth/me` |
| Overview (KPIs, "Borrowed today") | `GET /dashboard/summary`, `GET /loans?borrowedOn=` |
| Borrow books drawer | `GET /members?q=`, `POST /members`, `GET /books?q=`, `POST /loans` |
| Return books drawer | `GET /loans?status=ACTIVE&memberId=` or `&q=`, `POST /returns` |
| Donate a book / Add books drawer | `GET /categories`, `GET /books?q=`, `POST /donations`, `PATCH /books/copies/labelled` |

Every endpoint checks the user's permissions on the server. The portal also hides buttons a user can't use.

Excel uploads are read in the browser (SheetJS, loaded only when needed), previewed, then sent as one donation. The server checks every row again. The template is `public/book-donation-template.xlsx`.

## Code layout

```
src/app/
  core/          Plumbing shared by the whole app (no screens)
    api/         ApiClient (the only HTTP code) + members/books/loans/donations/dashboard .api.ts
    auth/        AuthService, guards, the interceptor that adds the token
    models/      TypeScript types matching the backend's JSON
  utils/         Pure helpers: dates.ts, format.ts
  components/    Reusable UI, one folder each:
                 drawer, step, typeahead, book-line, member-line, choice-chips, summary-tile,
                 alert, empty-state, kpi-card, icon, toast
  features/      One folder per business module
    shell/       Layout: sidebar (menu in nav-items.ts), top bar, drawers, toast
    login/       Sign-in page
    overview/    Home page: KPI cards, borrowed-today table, needs-attention card
    desk/        Shared by the drawers: which drawer is open, counts, desk rules, member picker
    borrow/      Borrow drawer + borrow.form.ts (rules) + book-cart, loan-period
    return/      Return drawer + return.form.ts (rules) + loan-checklist
    donate/      Donate drawer + donation.form.ts (rules) + donor-step, add-book-form,
                 sheet-upload, draft-book-list, label-codes
```

**Adding a feature, in this order:**
1. Add the types to `core/models`.
2. Add the calls to a `core/api/*.api.ts` service.
3. Put the rules in a `*.form.ts` class and write its spec.
4. Build the screen from existing `components/`.
5. Add the route in `app.routes.ts`, and a `link` for it in `features/shell/nav-items.ts`.

The full conventions are in `CLAUDE.md`.

## Commands

```bash
npm start                    # dev server with API proxy
npx ng build                 # production build into dist/
npx ng test --watch=false    # unit tests (Vitest)
```

Backend tests: `mvn test -Dtest='BorrowServiceImplTest,TitleResolverTest,DonationServiceImplTest'`.

## Not built yet

These are shown as "Soon" in the sidebar:
- Books catalogue
- Loans & Returns register
- Members
- Reservations
- Reports
- Users
- Roles & Permissions
- Settings

Cloudflare Turnstile, invitation links, password reset and lockout are also still to do.
