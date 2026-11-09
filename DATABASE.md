# PostgreSQL and encrypted storage

The site now needs the Node.js server, not `file://` URLs. Install Node 24 LTS and PostgreSQL 17+.

## Run

1. Run `npm install`.
2. Create a PostgreSQL database and a dedicated **non-superuser** owner role.
3. Copy `.env.example` to `.env` and fill the database connection string.
4. Generate `DATA_ENCRYPTION_KEY` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. Run `npm start`, then open `http://localhost:3000`.
6. Run `npm test`. PostgreSQL integration tests additionally need `TEST_DATABASE_URL`; use a disposable database.

Windows local bootstrap is optional: set `PG_BIN` to the installed PostgreSQL `bin` directory, run `node server/setup.js initialize`, start `postgres -D data\postgres -h 127.0.0.1 -p 55432`, then run `node server/setup.js configure`. This generates a private `.env` and a non-superuser application role without printing passwords. The cluster stays in `data\postgres`.

## Render deployment

The root [render.yaml](render.yaml) Blueprint configures a Node.js web service with the Node version pinned in [.node-version](.node-version), a reproducible `npm ci` build, the production start command, and `/api/health` health checks. Create a Blueprint in Render from this repository and use the prompted environment variables:

- `DATABASE_URL`: a production PostgreSQL connection string. For Render Postgres, use its **external** connection URL so PostgreSQL TLS certificates can be verified; internal Render Postgres TLS uses self-signed certificates and is not compatible with this app's strict certificate verification.
- `DATA_ENCRYPTION_KEY`: generate a new key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Back it up securely and keep it unchanged for the lifetime of the database.

The Blueprint sets `NODE_ENV=production`, `DATABASE_TLS=true`, and `ENABLE_DEMO=false`. Render supplies `PORT` and `RENDER_EXTERNAL_URL`; the server listens on the supplied port and uses the Render URL as its allowed origin. If you add a custom domain, set `APP_ORIGIN` in the Render service environment to that exact HTTPS origin (no trailing slash). Optionally set `DATABASE_CA_FILE` to the path of a trusted CA certificate if your PostgreSQL provider requires a custom CA.

Use Render's Environment page or the Blueprint prompts for secrets; never put production values in `render.yaml` or commit them to `.env`. Use a PostgreSQL service with persistent storage; a free web service can sleep between requests, so select a paid web-service plan if you need always-on behavior. The first successful server startup initializes the schema. After deploy, confirm `/api/health` returns `{"ok":true}`.

## Vercel deployment

Deploy from the repository root. [vercel.json](vercel.json) runs `npm run build`, publishes only the HTML pages and assets from `dist`, and routes **all** `/api/*` requests to [api/index.js](api/index.js). The function uses the same Express routes and PostgreSQL storage as the local server, without starting a separate listener.

Set these environment variables in the Vercel project **before redeploying**:

- `NODE_ENV=production`
- `APP_ORIGIN=https://opule-2f65.vercel.app` (replace with your actual public domain; no trailing slash)
- `DATABASE_URL`: your hosted PostgreSQL connection string
- `DATABASE_TLS=true`
- `DATA_ENCRYPTION_KEY`: your existing 64-character hexadecimal encryption key, or a newly generated key for a new database
- `ENABLE_DEMO=false`
- `DATABASE_CA_FILE`, only if the database requires a custom trusted CA. Include that certificate in the function bundle; never publish it in `assets`.

The database must be reachable from Vercel and the configured role must be able to initialize the schema. Keep existing encryption keys when reusing a database. A local PostgreSQL URL will not work on Vercel.

After deployment, check `/api/health` for `{"ok":true}`, `/api/bootstrap` for JSON, and `/assets/styles.css` for CSS. Missing configuration or a failed database connection returns JSON with HTTP 503 and logs the startup failure, rather than a platform HTML/text 404. Frontend changes alone cannot provision a database or configure deployment secrets.

## Data model

- `users`: accounts, salted scrypt password hashes, keyed email lookup.
- `sellers`: applications and review status.
- `listings`, `venues`: catalog and public meeting-place records.
- `conversations`, `messages`: participants and encrypted message bodies.
- `handovers`: versioned demo plan snapshots and completion state.
- `rewards`: one idempotent reward per completed handover.
- `notifications`: recipient-owned message notifications.
- `settings`: account-owned preferences.
- `sessions`: hashed opaque session tokens with eight-hour expiry.

Foreign keys enforce relationships. Message/reward writes are transactional. Public listing data is accessible anonymously; private collections require a valid server session. Message access is restricted to participants. Browser storage is no longer the authoritative database. Existing localStorage/IndexedDB data is not imported or deleted.

## Encryption and boundaries

All record JSON payloads, including messages and seller application fields, use AES-256-GCM with a random nonce and record-specific authenticated context. This is **server-side encryption, not end-to-end encryption**: the server can decrypt records. Relationship IDs, role/status flags, timestamps, password hashes and session-token hashes remain queryable metadata.

Production also requires HTTPS at a trusted reverse proxy, verified PostgreSQL TLS (`DATABASE_TLS=true` plus a trusted CA if needed), encrypted disks/backups, restricted database networking, secret management, key backups/rotation, and a least-privilege runtime role. Database connection strings must not contain SSL override parameters. The server refuses insecure production flags and disables demo login/simulation in production.

Do not commit `.env`, credentials, database files, or keys. Losing the key loses access to ciphertext; changing it without re-encryption will fail authentication of existing records. Provision keys via your deployment secret manager; never send them to the browser. PostgreSQL itself does not automatically encrypt all files at rest—enable encrypted volumes on your host/provider.

## Prototype limitations

Demo account switching is available only in development from loopback connections. Two fictional personas (Jamie/Alex) share database-persisted messages; switch reloads the saved history. Simulated other-person replies, approvals, completion, and rewards remain **test controls**, not real identity checks, escrow, payments, or camera verification.

Real account registration/sign-in is available through `auth.html`. Seller applications persist but real users cannot approve themselves. The demo phone handover workflow is intentionally unavailable as a real-money workflow. Staff administration, independently authenticated handover acceptance, live delivery/read receipts, real rewards, moderation, data deletion/retention, password recovery, and production operations still need implementation before public launch.

No “fully secure” guarantee is made. Run deployment-specific security review, monitoring, and restore tests before accepting real personal data.
