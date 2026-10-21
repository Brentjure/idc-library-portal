# Deploying for free

| Part | Host | Notes |
|---|---|---|
| Portal | Cloudflare Pages | Serves `dist/library-portal/browser`. `functions/idc-library/[[path]].js` forwards `/idc-library/*` to the backend, so there is one address and no CORS. |
| Backend | Render (free web service, Docker) | `D:\projects\library\library\Dockerfile`. Sleeps after 15 minutes idle; the first request then takes 30–60 s. |
| Database | Neon (free Postgres) | 0.5 GB. Pick the same region as Render (Frankfurt). |
| Monitoring | UptimeRobot | Pings `/idc-library/api/v1/health` every 10 minutes. It keeps Render awake and never touches the database. |

No card is needed for any of them. Put both repositories on GitHub (private is fine) first.

## 1. Database (Neon)
1. Create a project in **AWS Europe Central (Frankfurt)**, with a database called `idc_library`.
2. Copy the connection details: host, user and password.
3. Copy the local data across. Run this in a terminal, never paste the password into chat:
   ```bash
   pg_dump -d idc_library -Fc --no-owner --no-privileges -f idc_library.dump
   pg_restore --no-owner --no-privileges -d "postgresql://USER:PASSWORD@HOST/idc_library?sslmode=require" idc_library.dump
   ```
   Run any migrations still missing (`src/main/resources/db/`) against Neon in the same way, with `psql`.

## 2. Backend (Render)
New → Web Service → the backend repository. Runtime **Docker**, region **Frankfurt**, instance **Free**. Health check path: `/idc-library/api/v1/health`.

Environment variables:

| Name | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (also set in the Dockerfile) |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://HOST/idc_library?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | the Neon user |
| `SPRING_DATASOURCE_PASSWORD` | the Neon password |
| `APP_JWT_SECRET` | 32+ random bytes, e.g. `openssl rand -base64 32` |
| `APP_PORTAL_URL` | the portal address from step 3: `https://idc-library-portal.pages.dev` (base only). Invitation links and CORS use it. |

The `prod` profile has no defaults for these. The app won't start if one is missing.

## 3. Portal (Cloudflare Pages)
Workers & Pages → Create → Pages → connect the portal repository.
- Build command: `npx ng build`
- Build output directory: `dist/library-portal/browser`
- `BACKEND_URL` (the Render address, no trailing slash) is in `wrangler.toml` under `[vars]`. With that file present, Pages ignores plain variables set in the dashboard. Node 22 comes from `.nvmrc`.

After the first deploy, set `APP_PORTAL_URL` on Render to the Pages address, so invitation links point at it.

## 4. Monitoring (UptimeRobot)
Add an HTTP monitor for `https://<portal>/idc-library/api/v1/health`, every 10 minutes. It alerts by email when the site is down.

## 5. Backups
Neon's free plan keeps only about a day of history. The backend repository's `.github/workflows/backup.yml` dumps the
Neon database every night at midnight (Nairobi time), encrypts it, and keeps each backup for 90 days under
**Actions → Database backup → a run → Artifacts**. GitHub emails you when a run fails.

Repository secrets (backend repo → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `BACKUP_DATABASE_URL` | `postgresql://neondb_owner:PASSWORD@HOST/idc_library?sslmode=require`, direct host (pooling off) |
| `BACKUP_PASSPHRASE` | a long random passphrase. Store it in a password manager: **without it no backup can be opened.** |

After changing the Neon password, update `BACKUP_DATABASE_URL` too, or the backups stop (and GitHub emails you).

**Restore** (Git Bash; needs the PostgreSQL **18** client tools, since Neon runs 18):
1. Download the artifact (a zip) and unzip it: `idc-library-YYYY-MM-DD.dump.gpg`.
2. Decrypt it. gpg asks for the passphrase:
   ```bash
   gpg -d -o idc-library.dump idc-library-YYYY-MM-DD.dump.gpg
   ```
3. Look before restoring: `pg_restore --list idc-library.dump`
4. Restore into an **empty** database (a new Neon branch or database, or a local one), never over the live data:
   ```bash
   pg_restore --no-owner --no-privileges -d "postgresql://USER@HOST/NEW_DB?sslmode=require" idc-library.dump
   ```
5. Check it, then point the backend at it (`SPRING_DATASOURCE_URL` on Render), or copy the rows you need across.

Every few months, download one backup to somewhere outside GitHub (e.g. Google Drive), so one account isn't the
only copy, and try a restore so you know it works.

## Check it locally
```bash
npx ng build
npx wrangler pages dev --binding BACKEND_URL=http://localhost:8085   # http://localhost:8788
```
