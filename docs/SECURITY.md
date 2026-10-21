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
   - **Prevent it:** make the backend refuse to start in `prod` when `APP_PORTAL_URL` isn't an `https://` address
     without a path, and log the value at start-up. *(To do.)*
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
| H1 | **No sign-in protection**: no Turnstile, lockout or rate limit | Unlimited password guessing against staff emails | Cloudflare Turnstile on the sign-in page, verified on the server; lock the account for 15 minutes after 5 failed attempts; per-IP rate limit on `/auth/login`. The CSP then needs `https://challenges.cloudflare.com` in `script-src` and `frame-src`. |
| H2 | **Render can be called directly**, bypassing Cloudflare | Skips Cloudflare's protections; `X-Forwarded-For` can be faked, which would defeat per-IP limits from H1 | The Pages proxy adds a secret header (e.g. `X-Proxy-Key`) from a Pages secret; the backend rejects requests without it, except `/api/v1/health`. Do this together with H1. |
| H3 | **The Google Sheet is still shared by link** | About 170 members' phone numbers and emails readable by anyone with the link | Sheet → Share → General access → **Restricted**. Delete `D:\projects\library\backups\012_import_from_sheet.sql` and other local exports. |

### Medium

| # | Gap | Risk | Fix |
|---|---|---|---|
| M1 | **Sessions last 12 hours, and "Keep me signed in" uses `localStorage`** | On a shared desk PC, a session survives closing the browser; a copied token works anywhere until it expires | Shorten to about 8 hours, sign out after 30 minutes of no activity, and hide "Keep me signed in" or label it "only on your own device". |
| M2 | **Signing out doesn't revoke the token** | A token copied before sign-out keeps working until it expires | Add a `token_version` per user, checked on each request (it's already read from the database), and raised on sign-out, password change and "sign out everywhere". |
| M3 | **The backend uses the database owner (`neondb_owner`)** | A backend bug or injection could drop or alter tables | Create a role with only `SELECT/INSERT/UPDATE/DELETE` on the tables and sequence use; keep the owner for migrations only. |
| M4 | **No audit log for admin actions** | Can't tell who changed roles, deleted a book or invited someone | An `audit_events` table (who, what, when, before/after) written by the user, role, book and member services; a simple page in Settings. |

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
2. Turnstile, sign-in lockout and the proxy secret header (H1 + H2), with the start-up check for `APP_PORTAL_URL`.
3. Session hardening and revocation (M1 + M2).
4. Limited database role (M3), Dependabot (L1), audit log (M4).
