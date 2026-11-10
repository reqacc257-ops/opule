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

The Blueprint also sets `ENABLE_SAMPLE_ACCOUNTS=true` to provision the fictional Jamie (buyer) and Alex (seller) accounts shown beside the sign-in form. For an existing manually configured Render service, add this variable and redeploy. Anyone can open these shared test accounts without a password, so their sample chat is public to other testers: never enter personal information. Sample users can only use sample conversations and simulations; they cannot publish listings or change the shared seller profile. Set `ENABLE_SAMPLE_ACCOUNTS=false` to turn off public sample login and simulation controls. This setting does not enable `ENABLE_DEMO`, which remains development-only.

The server also recognizes Render's automatic `RENDER=true` flag and enforces production mode there even if `NODE_ENV` is accidentally set to `development`. Production listens on `0.0.0.0`; local development listens on `127.0.0.1`. Startup logs include the bound address and port. If Render reports ports only on localhost, set `NODE_ENV=production` in the web service's Environment settings and redeploy the latest code.

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

Browser scripts and the Bodoni Moda/Hanken Grotesk variable fonts are served from `assets`, not third-party CDNs. Font license notices are retained in `assets/fonts`. Page scripts are external same-origin files; inline event handlers and evaluated scripts are blocked by CSP. Both Express and Vercel static responses enforce `script-src 'self'` and `script-src-attr 'none'`. Inline styles remain allowed for the current page templates. Dynamic HTML rendering still uses escaped values; a scanner's generic `innerHTML` warning is not by itself proof of XSS.

All record JSON payloads, including messages and seller application fields, use AES-256-GCM with a random nonce and record-specific authenticated context. This is **server-side encryption, not end-to-end encryption**: the server can decrypt records. Relationship IDs, role/status flags, timestamps, password hashes and session-token hashes remain queryable metadata.

Production also requires HTTPS at a trusted reverse proxy, verified PostgreSQL TLS (`DATABASE_TLS=true` plus a trusted CA if needed), encrypted disks/backups, restricted database networking, secret management, key backups/rotation, and a least-privilege runtime role. Database connection strings must not contain SSL override parameters. The server refuses insecure production flags; public sample login/simulation requires the explicit `ENABLE_SAMPLE_ACCOUNTS` setting.

Do not commit `.env`, credentials, database files, or keys. Losing the key loses access to ciphertext; changing it without re-encryption will fail authentication of existing records. Provision keys via your deployment secret manager; never send them to the browser. PostgreSQL itself does not automatically encrypt all files at rest—enable encrypted volumes on your host/provider.

## Prototype limitations

The shared visual system uses warm-white surfaces, near-black text, restrained bronze accents, and locally hosted Hanken Grotesk for editorial headings and interface text. Bodoni Moda is reserved for the wordmark and decorative monogram. The handover simulation keeps its dark, scoped palette so its map and device preview remain legible. Palette regression checks enforce 4.5:1 text contrast and 3:1 form-border contrast.

The seller navigation uses a warm ivory-and-stone palette with muted bronze details, matching the light workspace, and a compact mobile navigation bar. Overview, Collection, and Correspondence are separate in-place views rather than anchors down one long page. Sample collection and inbox content mounts on first selection and stays cached so filters, selected conversations, and drafts survive switching views. Shared summary data still loads initially for accurate counts. Real-seller inventory and publishing controls initialize on first opening Collection. Section links, direct URLs, and browser back/forward navigation select the same views; handover links open Correspondence and the listing shortcut opens Collection. The current-section highlight glides between links and repositions with responsive layout changes. Reduced-motion preferences disable the glide and view entrance. Desktop navigation stays within the viewport and scrolls independently on short screens. Studio entrance and hover motion only runs when reduced motion is not requested; messages and drafts are not animated or reset.

The same navigation helper powers the buyer edit, collection, and approach views, listing details versus chat information, and sign-in versus account creation. The buyer collection renders on first opening, then keeps its filters and rendered cards when switching sections. Account fields remain filled when switching modes; registration-only fields are disabled during sign-in. Seller applications show one validated step at a time (identity/contact, collection, video call), retaining entered values on Back. The handover preview shows only the current location, identity-confirmation, or inspection stage; earlier available stages can be reviewed without bypassing agreement, proximity, identity, or acceptance checks. Moving out of range still clears confirmations. Native page navigation uses short same-origin document transitions where supported, with normal navigation as the fallback; reduced-motion settings disable document and section animations. Long content can still scroll within its own view.

The buyer landing page is a filterable marketplace: search by piece or designer, narrow by category, general area, and maximum price, and sort by price or name. Filters are local to the current view, not saved preferences. On mobile, additional filters collapse behind "Refine your selection."

Sample login opens Jamie's buyer marketplace or Alex's seller studio. The studio shows only the signed-in seller's listings and authorized conversation/open-handover counts, with access to the existing shared sample inbox. Real verified sellers retain the listing form; applicants retain application and pending-review views. No sales totals or revenue are invented, and real messaging/payment tools remain unavailable.

The sample studio includes an inline shared inbox: find a buyer, read persisted messages, refresh a conversation, and send a reply without leaving the dashboard. Unsent drafts remain in memory per conversation during the visit; they are not saved across reloads. Failed sends retain the draft. Inventory search and category filters operate on the sample seller's own pieces. Handover cards show the latest saved plan per conversation, and "Open handover" resumes the selected buyer's simulation rather than always opening Jamie's chat.

Local demo account switching uses development loopback connections. Hosted sample switching additionally requires `ENABLE_SAMPLE_ACCOUNTS=true`. Two fictional personas (Jamie/Alex) share database-persisted messages; switching reloads the saved history. Simulated other-person replies, approvals, completion, and rewards remain **test controls**, not real identity checks, escrow, payments, or camera verification.

Real account registration/sign-in is available through `auth.html`. Seller applications persist but real users cannot approve themselves. The demo phone handover workflow is intentionally unavailable as a real-money workflow. Staff administration, independently authenticated handover acceptance, live delivery/read receipts, real rewards, moderation, data deletion/retention, password recovery, and production operations still need implementation before public launch.

No “fully secure” guarantee is made. Run deployment-specific security review, monitoring, and restore tests before accepting real personal data.
