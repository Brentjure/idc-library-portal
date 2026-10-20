# IDC JKUAT Library Portal

Library portal for the IDC JKUAT church: staff lend and receive books, record donations, manage the catalogue, users and roles.

## Start here
- **Spec:** `docs/HANDOFF.md` has every agreed screen, flow, business rule and the data model. Read it before building a feature.
- **Mockup:** `docs/mockup/church-library-portal.html` is the clickable design. Open it in a browser and sign in with any email and a password of 8+ characters. Match its layout, wording and behaviour. Its code is a throwaway prototype with sample data, so don't copy it into the app.
- **Database:** existing tables are `book_titles` and `book_copies` (PostgreSQL). `docs/db/donations-migration.sql` is the drafted migration. Review it before running.
- **Bulk upload template:** `docs/templates/book-donation-template.xlsx`.

## Non-negotiables from the design
- Light mode only. Church yellow `#F5B700`. Fonts: Bricolage Grotesque (headings) and Figtree (body).
- Edit buttons green, delete buttons red, and every delete confirms first.
- Front-desk tasks (borrow, return, donate/add books) open in a right-side drawer, with "Save & next" for queues.
- Members don't log in. Staff sign in with email + password + Cloudflare Turnstile. Users set their own password through a 7-day invitation link.
- Permissions are enforced on the server for every action, not only hidden in the UI.

## Stack (decided)
- Angular 21 (standalone, signals, zoneless) + Tailwind CSS 4 in this folder. Theme tokens live in `src/styles.css` (`@theme`), shared classes in its `@layer components`.
- Backend: Spring Boot in `D:\projects\library\library` (follow its `AGENT.md`). Database migrations are in its `src/main/resources/db/` (002, 003, …), run by hand in order after a backup.
- Desk loans reuse `borrow_requests` / `borrow_request_items` / `borrow_transactions` (`source = DESK`). There is no separate loans table.
- Run instructions: `README.md`. Deploying (Cloudflare Pages + Render + Neon): `docs/DEPLOY.md`.

## Code layout (follow it for every new screen)
```
src/app/
  core/        api/ (ApiClient + one *.api.ts per backend resource), auth/, models/ (one *.model.ts per domain)
  utils/       pure functions (dates.ts, format.ts), each with a spec
  components/  reusable UI that knows nothing about the library, one folder per component
  features/    one folder per business module: shell, login, overview, books, desk (shared desk state),
               borrow, return, donate. The module's main component sits in the folder;
               its child components get subfolders.
```
- **Naming:** `name.component.ts` / `.html` (and `.css` only if needed), class `NameComponent`, selector `app-name`. Services `*.service.ts`, API services `*.api.ts`, form state `*.form.ts`, models `*.model.ts`.
- **Who does what (single responsibility):**
  - Components render and forward events.
  - Business rules and drawer state live in a plain `*.form.ts` class (signals + computeds, no HTTP), with a `*.form.spec.ts` beside it. Examples: `features/borrow/borrow.form.ts`, `features/return/return.form.ts`, `features/donate/donation.form.ts`.
  - Only `core/api/api-client.service.ts` touches `HttpClient`. Features call the `*.api.ts` services.
  - Desk limits (5 books, loan periods, conditions) are in `features/desk/desk-rules.ts`.
- **Dependency direction:**
  - `components/` may import only `utils/` and other components, never `core/` services or `features/`.
  - `features/*` may import `components/`, `core/`, `utils/` and `features/desk`, but not each other.
- **Reuse before writing markup:**
  - `BookLine` (cover + title)
  - `MemberLine` (avatar + name)
  - `ChoiceChips` (segmented / cards / pills)
  - `SummaryTile` (drawer footer)
  - `Typeahead` (search field)
  - `Drawer`, `Step`, `Alert`, `EmptyState`, `KpiCard`, `Icon`, `ToastService`
  - `ConfirmDialog` (every delete confirms first; with no `confirmLabel` it explains why something can't be done yet)
  - `ColumnChart` (grouped columns over time, legend, tooltip, table view) and `BarList` (ranked horizontal bars). Chart colours are `--color-chart-1/2`, validated for contrast and colour blindness; don't use the brand yellow for marks.
- **Pages** are lazy routes in `app.routes.ts` with `canActivate: [permissionGuard('…')]` and a `link` in `features/shell/nav-items.ts`.
- **Styles:**
  - Tailwind classes in templates.
  - `src/styles.css` holds only theme tokens and classes used by several components (`btn`, `field-input`, `card`, `pill-*`, `seg`, `tbl`, …).
  - A class used by one component goes in that component's `.css`, which starts with `@reference "<relative path>/styles.css";`.
- **No barrel files (`index.ts`).** Import from the real file.
- **Verify with:** `npx ng build`, `npx ng test --watch=false`, and a click-through of the desk flows.

## Not decided yet
Real loan rules, email/SMS provider, church email domain. See "Open questions" in `docs/HANDOFF.md`. Ask before assuming.
