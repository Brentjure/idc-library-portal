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
| `APP_PORTAL_URL` | the portal address from step 3, e.g. `https://idc-library.pages.dev` |

The `prod` profile has no defaults for these. The app won't start if one is missing.

## 3. Portal (Cloudflare Pages)
Workers & Pages → Create → Pages → connect the portal repository.
- Build command: `npx ng build`
- Build output directory: `dist/library-portal/browser`
- Environment variable: `BACKEND_URL` = the Render address, e.g. `https://idc-library.onrender.com`, with no trailing slash.

After the first deploy, set `APP_PORTAL_URL` on Render to the Pages address, so invitation links point at it.

## 4. Monitoring (UptimeRobot)
Add an HTTP monitor for `https://<portal>/idc-library/api/v1/health`, every 10 minutes. It alerts by email when the site is down.

## 5. Backups
Neon's free plan keeps only a short restore window. Take a weekly `pg_dump` of the Neon database, e.g. to Google Drive.

## Check it locally
```bash
npx ng build
npx wrangler pages dev --binding BACKEND_URL=http://localhost:8085   # http://localhost:8788
```
