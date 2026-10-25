# IDC JKUAT Library Portal: build handoff

This is the agreed design for the IDC JKUAT church library portal. The clickable mockup is `docs/mockup/church-library-portal.html`. Open it in a browser and sign in with any email and a password of 8+ characters. It is a single-file **visual and behavioural reference** with sample data. Do not ship its code. Rebuild it properly in the project's stack.

Online copy of the mockup (owner's Claude account): https://claude.ai/artifact/H4UF74YRT9MB8QbwMX7d9n

---

## 1. Who uses it

- **Staff and volunteers sign in.** Library members (borrowers) do **not** have accounts. The librarian records everything for them at the desk, usually with a queue of people waiting.
- Everything is designed for speed at the front desk. Common tasks open in a **side drawer** over the current page, not a new page, so the librarian keeps context.

## 2. Branding and look

| Item | Value |
|---|---|
| Name | **IDC JKUAT** · "Church Library" (page title: IDC JKUAT Library) |
| Motto | "Make disciples of all nations." (Matthew 28:19). Shown on login and at the foot of the sidebar |
| Logo | Yellow sunrise, cross, open book, family. File has a white background, so it sits on a white rounded tile. A transparent PNG would be better |
| Theme | **Light mode only.** No dark mode, no theme switch |
| Main colour | Church yellow `#F5B700` (deeper `#C98F00`, soft `#FFF4CC`), dark text on yellow `#2A2203` |
| Neutrals | Background `#F6F6F3`, cards `#FFFFFF`, lines `#ECEBE4`, text `#1F1D16` / `#615D50` / `#9A9585` |
| Status colours | Good `#1E8E5A`, warning `#B86E00`, danger `#C2412D` (each with a pale background) |
| Fonts | Headings: Bricolage Grotesque. Body: Figtree (Google Fonts) |
| Buttons | Edit actions **green**, delete actions **red**. Every delete asks for confirmation in a dialog (focus starts on Cancel) |

## 3. Layout

- **Sidebar** (fits the screen height, never scrolls, collapsible to icons):
  - Main menu: Overview, Books, Loans & Returns, Members, Reservations
  - Management: Reports & Analytics, Overdue Reminders, Add Books, Donations, **Users**, **Roles & Permissions**
  - Settings & others: Settings, Help
  - Footer: motto, signed-in user, sign-out icon
- **Top bar:** page title + greeting, search, notifications, **sign-out icon**, buttons *Return books*, *Donate a book*, *Borrow books* (primary).

## 4. Pages and flows

### Login
- Split screen: yellow brand panel (logo, headline, motto, drawn bookshelf) + white sign-in card.
- Email, password (show/hide), "Keep me signed in on this computer", "Forgot password?".
- **Security check: Cloudflare Turnstile (managed mode)**, placed under the password.
  - Client: `<div class="cf-turnstile" data-sitekey="…" data-theme="light">` + `https://challenges.cloudflare.com/turnstile/v0/api.js`
  - Server: POST the `cf-turnstile-response` token to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the secret key. Refuse login unless `success: true`. Call `turnstile.reset()` after a failed attempt.
- Errors never reveal whether the email exists. Lock the account for 15 minutes after 5 wrong passwords.
- Forgot password: email form, then a neutral "check your email" screen (link valid 30 minutes).

### Set up your account (invitation)
- Admin creates a user, who becomes **Invited** and gets an email link valid **7 days**. Admin can also **Copy link** (prefilled WhatsApp/SMS message), **Resend**, or **Preview**.
- Page shows "Welcome, {first name}" and "{inviter} added you … as a {role}".
- Fields: full name (editable), email (read-only, used to sign in), phone (optional), password + confirm, with a live checklist:
  - at least 8 characters
  - a letter and a number
  - not their name, email or a common password
  - both match
- Success: "Your account is ready", which leads to sign-in with the email prefilled. Status becomes **Active** and the token is cleared (single use).
- Expired or used links show "This link no longer works" with what to do next.
- **As built (2026-10-17):** there's no email provider yet, so the link is sent by hand: after **Invite** (or **New link**) the drawer shows it once with **Copy link** and **Copy message** (WhatsApp/SMS text). Only a hash of the token is stored, so a lost link can't be shown again; **New link** replaces it and the old one stops working. **Withdraw** removes someone who never set up their account. Not built yet: email sending, Preview, password reset and sign-in lockout. Settings: `app.invitations.valid-days` and `portal-url`.

### Dashboard (Overview)
- KPI row: Total books, Active members, Borrowed now, Overdue (red).
- **Main panel: "Borrowed today"** table: counts (on loan / returned same day / reserved), search, status filter, columns Member · Book · Category · Out · Due · Status, newest first. Each on-loan row has a **Return** button.
- Side column: Top borrowed book (carousel), Top authors, Most borrowed categories (donut).

### Borrow books (drawer)
1. **Member:** Full name *or* phone search (pick from list), plus group tags and an overdue warning.
2. **Books:** search by title. Several books allowed. Limit **5 books per member**, shown as 5 slots (on loan / adding / free). Unavailable titles can't be picked.
3. **Loan period:** 1 / 2 / 3 weeks (default 2), each showing the actual date, or pick a date.

Footer: summary with a due-date card, **Save & next member** (keeps the drawer open for the queue) and **Save & close**. No note field, no fee text, no member ID.

### Return books (drawer)
- Find by **member** (name/phone) or **by book** (title or copy code).
- Lists all their loans, overdue first, with status *Due in N days* / *Due today* / *N days late*.
- Tick the books handed back. Condition per book: Good / Worn / **Damaged** (damaged copies are not put back on the shelf).
- **Save & next member** / **Save & close**. Updates Borrowed now, Overdue and the Books availability.

### Donate a book / Add books (one drawer, two sources)
- Switch: **Donation** or **Church purchase** ("Add books" opens on purchase, "Donate a book" on donation).
- Donor (donations only): search members by name. If not found, just type a full name. **Phone optional.** "Anonymous" checkbox.
- Books, either:
  - **One by one:** title (suggests existing titles, so existing ones become extra copies), author and category (required for new titles), ISBN (optional, shown beside them; read-only for an existing title). A complete ISBN is looked up through the backend (our catalogue, then `isbn_records`, then Open Library / Google Books, see `app.isbn-lookup`): an owned title is picked for extra copies, otherwise empty fields are filled in to check. Then "More details (optional)" with publisher and year, then copies (stepper) and condition New / Good / Worn.
  - **Upload Excel:** .xlsx/.xls/.csv. Preview shows ready rows and rows to fix with reasons. Bad rows are skipped. Template: `book-donation-template.xlsx`, columns `title*, author*, category*, copies, condition, isbn, publisher, publication_year, description`. Category is a **name**; map it to `category_id` on import.
- **Save**, then the **labelling step**: every new copy gets a code (`BK-010001` …). The librarian ticks each code once it is written or stuck in the book.
  - **Done** is enabled only when all are ticked.
  - **Finish later** leaves unlabelled copies to follow up.

### Books (catalogue)
- Summary strip: titles, copies, on shelf, on loan, all copies out.
- Search (title, author, ISBN, code), filters (On shelf / All out, category chips), sort (title, most borrowed, recently added, fewest on shelf).
- Table: cover, title/author/year, category, copies on shelf ("1 / 4" + blocks), status (On shelf / Few left / All out), times borrowed, added, **green edit / red delete**.
- Detail drawer: details (ISBN, publisher, year, added, description). **Copies** list shows code, where it is (shelf, or on loan to X with due date), condition, source (donated by X / purchased), and "needs a label".
  - Buttons: Delete, Edit, Borrow this book.
- **Edit:** title*, author*, category, ISBN, year, publisher, description. Validates duplicates, ISBN (10/13) and year (1450–current).
- **Delete:** blocked while any copy is on loan (shows who has them). Otherwise confirm. Implement as **soft delete** (see data model).

### Loans & Returns (register)
- Summary: on loan, overdue, due in 3 days, returned in 30 days, average loan length.
- Tabs with counts: **On loan** (default, by due date), **Overdue** (the "Overdue Reminders" menu opens this), Returned, All.
- Filters: search (member, phone, book, code), borrowed in (any time / today / 7 / 30 days), sort.
- Columns: Member + phone · Book + code · Borrowed · Due · Returned · Status (with "On time" / "N days late" note).
- Actions:
  - **Return** (opens the return drawer prefilled)
  - **Extend** (opens the Extend drawer; also on overdue rows, also from the Return drawer and a member's details)
  - **Copy reminder** on overdue rows (polite WhatsApp/SMS text)
- "Show more" loads 25 rows at a time.

### Extend drawer
Opened from a loan: the Loans page row, **Extend instead** in the Return drawer, or a member's details.
1. The member, and their books on loan as a checklist; the book it was opened for is ticked. Each line shows the
   due pill and "N extensions left"; books with none left can't be ticked ("It needs to come back").
2. **How much longer?** +1 / +2 / +3 weeks (default +2), and an optional note ("asked by phone").
3. Each ticked book shows its new due date ("counted from today" when overdue); the footer says "Due back …".
Saving moves the due date, adds one to the count, clears the reminder and records the extension. Not yet covered:
reservations (no check whether someone is waiting for the book), fines, and telling the member by SMS/email.

### Members (admin only)
- Agreed 2026-10-17 (there was no mockup). Visible only with `members.list` (ADMIN). Librarians keep `members.view` / `members.manage` for the desk drawers but don't see the tab.
- Summary: members, active, with books out, with overdue books, joined in 30 days.
- Search (name, or phone however it's written), group chips, show Active (default) / Has overdue / Inactive / All, sort (name, most books out, recently joined).
- Table: member + phone, group, books out (n / 5 with blocks), overdue, times borrowed, green edit.
- Drawer: details (no join date), books they have now (each with **Return**), recently returned, donations. Buttons: Delete / Deactivate, Edit, **Lend books** (opens Borrow with the member picked).
- **Add member / Edit:** full name*, phone (optional, one member per number), group (suggests existing groups). Needs `members.manage` / `members.edit`.
- **Remove** (`members.delete`): blocked while they have books out. With history (loans, reservations or donations) they are **deactivated**: hidden from desk searches, can't borrow, can be reactivated. With no history they are deleted for good. Always confirms first.

### Reports & Analytics
- Agreed 2026-10-18 (there was no mockup). Needs `VIEW_REPORTS`; CSV downloads need `reports.export` (ADMIN only to start: exports leave the system and the borrowers list names members).
- Period: This month / Last month / Last 3 months / This year / Custom dates (up to ~3 years). Every headline number is compared with the same number of days just before.
- Headline: loans, returns, back on time (%), active borrowers, new members, books added (donated · bought).
- Borrowing activity: loans and returns per day (≤ 1 month), week (≤ 6 months) or month, with legend, hover tooltip and a table view.
- Most borrowed (top 10), loans by category, not borrowed in the period (never borrowed first), books received, top donors (anonymous gifts left out), most active borrowers (top 10).
- Each section has a **CSV** download that opens in Excel (cells that look like formulas are made safe).

### Users
- Summary: users, active, invited, disabled, roles. Search, role filter, status filter.
- Columns: user (name, email, "You" tag), phone, role, status (Active / Invited + expiry / Invite expired / Disabled), last sign-in, actions.
- Create/edit drawer: full name*, email*, phone, **role** (radio cards with description and permission count). Edit adds Can sign in / Disabled. No password field: users set their own via the invitation.
- Rules:
  - You can't delete or disable yourself, or remove your own Administrator role.
  - There is always at least one active Administrator.
  - Emails are unique.
  - Prefer *Disabled* over delete.

### Roles & Permissions
- Left: role list (users count, permissions count). Right: the selected role's permissions grouped by section, each with a checkbox, plain-language description and key.
  - "Select all" per section.
  - A save bar appears with unsaved changes; switching roles with unsaved changes asks to discard.
- **New role:** name*, description, optionally copy permissions from an existing role.
- **New permission:** name*, section, key (auto: `module.snake_name`, editable, unique, `^[a-z]+(\.[a-z0-9_]+)+$`), description, which roles get it now. Custom permissions can be deleted; built-in ones can't.
- **Administrator** is a locked system role with every permission, including new ones.
- A role can't be deleted while users have it.
- Starting roles: Administrator, Head Librarian, Librarian, Volunteer, Viewer.
- The **server must check permissions on every action**. Hiding buttons is not security.
- **As built (2026-10-18):** no *New permission* form: a permission only works if code checks it, so developers add them in a migration (009 gives each a label, section and order). Administrator is the system role (`roles.is_system`): the server treats it as holding every permission, so it can't be edited, renamed or deleted. The starting roles are ADMIN and LIBRARIAN; the church creates others with **New role** and "start with the permissions of". The tab needs `MANAGE_USERS`. Role names are unique ignoring case.

Permission keys:
`books.view, books.add, books.edit, books.delete, loans.borrow, loans.return, loans.renew, loans.view, loans.remind, donations.record, donations.view, members.view, members.manage, reports.view, reports.export, users.manage, roles.manage, settings.manage`

## 5. Business rules (confirm with the church)

| Rule | Value used in the mockup |
|---|---|
| Books per member | 5 |
| Loan period | 14 days default (7 / 21 options) |
| Extension | +1, +2 or +3 weeks, at most 2 times per loan, also when overdue. Overdue books get the time from today, others from their due date. "Back on time" in Reports is measured against the original due date. |
| Late fees | none shown (decision: don't display fees) |
| Invitation link | 7 days, single use |
| Password reset link | 30 minutes |
| Lockout | 5 failed sign-ins, 15 minutes |
| Categories | Bible Study & Doctrine, Biography & Testimony, Christian Living, Church & Ministry, Evangelism & Missions, Leadership, Marriage, Family & Relationships, Prayer & Worship, Society & Culture (from the church spreadsheet, migration 012) |

## 6. Data model

Existing tables: `book_titles`, `book_copies`. Migration drafted in `docs/db/donations-migration.sql`:

- **book_copies:**
  - Drop the columns duplicated from `book_titles` (title, author, isbn, publisher, publication_year, description, cover_image).
  - Add `donation_id`.
  - CHECKs: status `AVAILABLE | ON_LOAN | RESERVED | LOST | DAMAGED | WITHDRAWN`, condition `NEW | GOOD | WORN | DAMAGED`.
  - Indexes, `updated_at` trigger, and a `book_code` default (`BK-000001` sequence).
  - Add `labelled_at` (null = still needs a label).
- **book_titles:**
  - FK to categories.
  - Unique `(lower(title), lower(author))` and unique `isbn` when present.
  - `deleted_at` for soft delete (delete = set `deleted_at` and mark copies `WITHDRAWN`).
- **donations:** `member_id` (nullable), `donor_name`, `donor_phone` (nullable), `is_anonymous`, `received_by`, `received_at`.
  - Purchases are copies with `donation_id IS NULL`. Optionally add a `purchases` table if the church tracks supplier/cost.
- **loans** are `borrow_transactions`: `borrowed_at`, `due_date` (current), `original_due_date` (agreed at lending, never changes), `returned_at`, `return_condition`, `renewed_count` (times extended), `last_reminded_at`, `recorded_by`, `returned_by`.
- **loan_extensions** (migration 013): one row per extension: `borrow_transaction_id`, `previous_due_date`, `new_due_date`, `was_overdue`, `extended_by`, `extended_at`, `note`.
- **members** (to design): name, phone, ministry/group, active flag.
- **users:**
  - `email` (unique), `password_hash` (null until set up), `role_id`, `status` (`INVITED | ACTIVE | DISABLED`), `last_login_at`
  - `invite_token_hash`, `invite_expires_at`, `invited_by`
  - reset token hash + expiry, failed-login counter + `locked_until`
- **roles** (`name` unique, `description`, `is_system`), **permissions** (`key` unique, `name`, `module`, `description`, `is_built_in`), **role_permissions** (`role_id`, `permission_id`).

## 7. Open questions

1. Backend and frontend stack (not decided in the design sessions).
2. Real loan, limit and renewal rules; fines yes/no.
3. Email and SMS/WhatsApp provider for invitations and reminders.
4. The church's email domain (mockup uses example.com).
5. Transparent PNG version of the logo.
6. Pages not designed yet: Reservations, Settings, Donations list.
