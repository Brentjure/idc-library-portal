# Security: what's done and what remains

Status as of 21 Oct 2026. The live site is the portal on Cloudflare Pages (`https://idc-library-portal.pages.dev`), the
backend on Render (`https://library-qwyt.onrender.com`) and the database on Neon. How they fit together: `DEPLOY.md`.

## Done

| Area | What protects it |
|---|---|
| Passwords | BCrypt hashes. Staff choose their own password from an invitation link; nobody else ever knows it. |
| Permissions | Checked on the server for every action (`@PreAuthorize`). The browser's copy of the user's permissions only hides buttons. |
| Disabled staff | The user's status is re-read from the database on each request (cached 5 minutes), so disabling someone ends their session within 5 minutes. |
| Administrator role | Locked: it can't be edited or deleted, and always has every permission. |
| Reservations (`POST /api/v1/borrow`) | Needs `MANAGE_BORROWING` and at most 5 books per request. It used to be public, so anyone could reserve every copy. |
| CORS | Browsers may call the API only from the portal's address (`APP_PORTAL_URL`, or `APP_CORS_ORIGINS`). Other sites get 403, even with a stolen token. |
| Content-Security-Policy | The portal runs only its own scripts, no inline scripts, and talks only to its own address, so an injected script can't send the token away. Also `frame-ancestors 'none'`, HSTS, nosniff. |
| Secrets | Database password, JWT secret and backup passphrase are environment variables or GitHub secrets, never in git. The `prod` profile refuses to start if one is missing. |
| Invitation tokens | Random 32 bytes, stored only as a SHA-256 hash, valid 7 days, replaced when a new link is made. |
| CSV exports | Cells starting with `= + - @` are neutralised, so a report can't run formulas in Excel. |
| Errors | Production responses never include stack traces or internal messages. |
| Backups | Nightly, encrypted (AES-256), kept 90 days. Restore tested on 20 Oct 2026. |

## Onboarding (fix first)

New staff join through **Users → Invite**, which produces a link `{APP_PORTAL_URL}/setup/{token}`.

1. **Wrong address in invitation links.** Links pointed to `https://idc-library.pages.dev/...`, which doesn't exist,
   because Render's `APP_PORTAL_URL` still held the placeholder from before Cloudflare named the site.
   - **Fix:** on Render, set `APP_PORTAL_URL` = `https://idc-library-portal.pages.dev`: the base address only, no
     `/users`, no trailing slash. It also sets the CORS origin.
   - **Links already sent:** the token is still valid. Send the same link with the right domain, or press **New link**
     on the user's row, which replaces the token.
   - **Prevented (done):** in `prod` the backend refuses to start unless `APP_PORTAL_URL` is an `https://` address
     with no path, and logs the value at start-up. It can't tell a wrong site name, so still check the first invitation.
2. **Links are shared over WhatsApp/SMS.** Anyone holding an unused link can set that account's password.
   - Send each link privately, never in a group.
   - If a link was posted somewhere public, press **New link**, which makes the old one stop working.
   - Consider 3 days instead of 7 (`APP_INVITATION_DAYS`).
3. **No "Forgot password".** Today an admin must issue a new invitation link. Build a reset flow once an email
   provider is chosen (an open question in `HANDOFF.md`). Until then, ask staff to keep their password in a password manager.
4. **Check the person before inviting.** Invitations go to whatever email is typed. Confirm the address with the
   person directly, not from a group chat message, and give the lowest role that fits (Librarian, not Administrator).

## Remaining

### High

| # | Gap | Risk | Fix |
|---|---|---|---|
| H1 | ~~No sign-in protection~~ **Done (migration 014).** | — | Turnstile on the sign-in page, checked on the server (fails closed if Cloudflare can't be reached). After `app.security.login.max-failed-attempts` wrong passwords in a row (5) the account locks for `lock-minutes` (15); Users shows **Locked** with **Unlock now**. One address may try `max-attempts-per-ip-per-minute` (10) times a minute. All in `application.yml`. Turnstile stays off until `APP_TURNSTILE_SITE_KEY` and `APP_TURNSTILE_SECRET_KEY` are set. |
| H2 | ~~Render can be called directly~~ **Done.** | — | The Pages proxy sends `X-Proxy-Key` (Pages secret `PROXY_KEY`); with `APP_PROXY_KEY` set to the same value on Render, everything else gets 403, except `/api/v1/health`. Off until both are set. |
| H3 | **The Google Sheet is still shared by link** | About 170 members' phone numbers and emails readable by anyone with the link | Sheet → Share → General access → **Restricted**. Delete `D:\projects\library\backups\012_import_from_sheet.sql` and other local exports. |

### Medium

| # | Gap | Risk | Fix |
|---|---|---|---|
| M1 | **Sessions last 12 hours, and "Keep me signed in" uses `localStorage`** | On a shared desk PC, a session survives closing the browser; a copied token works anywhere until it expires | Shorten to about 8 hours, sign out after 30 minutes of no activity, and hide "Keep me signed in" or label it "only on your own device". |
| M2 | **Signing out doesn't revoke the token** | A token copied before sign-out keeps working until it expires | Add a `token_version` per user, checked on each request (it's already read from the database), and raised on sign-out, password change and "sign out everywhere". |
| M3 | **The backend uses the database owner (`neondb_owner`)** | A backend bug or injection could drop or alter tables | Create a role with only `SELECT/INSERT/UPDATE/DELETE` on the tables and sequence use; keep the owner for migrations only. |
| M4 | **No audit log for admin actions** | Can't tell who changed roles, deleted a book or invited someone | An `audit_events` table (who, what, when, before/after) written by the user, role, book and member services; a simple page in Settings. |
| M5 | **Sign-ins on several devices or browsers at once aren't tracked** | See "Simultaneous sign-ins" below | See below; builds on M2. |

### Simultaneous sign-ins (M5)

**Today:** every sign-in issues its own independent token. The same account can be signed in on the desk PC, a phone
and a second browser at the same time, and the server keeps no list of them. So:

- nobody can see where an account is signed in;
- signing out on one device leaves the others signed in, and there's no "sign out everywhere" (M2);
- a session left open on the desk PC, or a stolen token, looks exactly like the real user, and nothing alerts anyone;
- two people sharing one account (e.g. one desk login for several volunteers) can't be told apart, so the loan
  records' "issued by" means little.

**Options:**

| Option | Behaviour | Fits the desk? |
|---|---|---|
| A. Track sessions, allow several (recommended) | A `user_sessions` table: id, user, browser/device, IP, created, last seen, revoked. The token carries the session id; each request checks it isn't revoked (it's already read with the user). A "Where you're signed in" list with **Sign out** per device and **Sign out everywhere**; admins can do the same for any user from Users. Optional cap, e.g. 3 active sessions, oldest signed out first. | Yes: staff often use the desk PC and their own phone. |
| B. One session per user | A new sign-in ends the previous one (raise `token_version`). | Strict, but volunteers would sign each other out if they share a PC browser, and switching between phone and PC means signing in again each time. |
| C. Allow freely, just notify | Email the user when their account signs in from a new browser. | Needs the email provider, which isn't chosen yet. Good addition to A later. |

**Also:** one account per person, no shared desk logins, so every loan, return and donation records who did it. State
this when inviting staff.

**Acceptance (option A):**
1. Signing in on two browsers shows two entries under "Where you're signed in", each with browser, approximate
   location (IP) and last activity.
2. **Sign out** on one entry ends that session within one request; the other keeps working.
3. **Sign out everywhere** ends every session, including the current one.
4. Disabling a user or changing their password ends all their sessions.
5. With the cap set, a 4th sign-in ends the oldest session, and the sign-in page says so.

### Low

| # | Gap | Fix |
|---|---|---|
| L1 | Dependencies aren't updated automatically | Turn on Dependabot alerts and security updates in both GitHub repos. |
| L2 | One admin account, no second factor | Done well enough once H1 is in. Later: TOTP for Administrators. |
| L3 | The token can be read by scripts (`sessionStorage`) | Covered by the CSP. If ever needed: an HttpOnly cookie plus CSRF protection. |
| L4 | The public catalogue (`GET /api/v1/books`) is open | Intended, for the parked online catalogue. It returns only book data; review it when that feature is built. |

## Operational habits

- Never paste passwords, tokens or connection strings into chat, tickets or group messages. If one leaks, reset it
  and update every place it's used: Render, the GitHub secret `BACKUP_DATABASE_URL`.
- After changing the Neon password, update `SPRING_DATASOURCE_PASSWORD` on Render **and** `BACKUP_DATABASE_URL` on GitHub.
- Keep the backup passphrase outside GitHub (a password manager). Without it no backup can be opened.
- Every few months, download a backup, decrypt it and restore it into a spare database (`DEPLOY.md`, "Backups").
- Remove staff accounts as soon as someone stops serving at the desk (Users → disable).

## Suggested order

1. Set `APP_PORTAL_URL` on Render (onboarding 1), restrict the Google Sheet (H3).
2. ~~Turnstile, sign-in lockout and the proxy secret header (H1 + H2), with the start-up check for `APP_PORTAL_URL`.~~
   Built; switch on with the keys in `DEPLOY.md` ("Sign-in protection").
3. Session hardening, revocation and session tracking (M1 + M2 + M5). They share one change: a session id in the
   token, checked on every request.
4. Limited database role (M3), Dependabot (L1), audit log (M4).
