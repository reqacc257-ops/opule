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
