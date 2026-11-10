CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  login_hash text UNIQUE,
  password_hash text,
  role text NOT NULL CHECK (role IN ('buyer','seller')),
  demo boolean NOT NULL DEFAULT false,
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS sellers (
  id text PRIMARY KEY REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('pending','verified')),
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
  id text PRIMARY KEY,
  seller_id text NOT NULL REFERENCES sellers(id),
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS venues (id text PRIMARY KEY, payload text NOT NULL);
CREATE TABLE IF NOT EXISTS listing_photos (
  id text PRIMARY KEY REFERENCES listings(id),
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  buyer_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES sellers(id),
  listing_id text NOT NULL REFERENCES listings(id),
  payload text NOT NULL,
  CHECK (buyer_id <> seller_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id),
  sender_id text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  payload text NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, created_at, id);
CREATE TABLE IF NOT EXISTS handovers (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id),
  buyer_id text NOT NULL REFERENCES users(id),
  completed boolean NOT NULL DEFAULT false,
  payload text NOT NULL
);
CREATE INDEX IF NOT EXISTS handovers_conversation ON handovers(conversation_id);
CREATE TABLE IF NOT EXISTS rewards (
  id text PRIMARY KEY REFERENCES handovers(id),
  user_id text NOT NULL REFERENCES users(id),
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY REFERENCES messages(id),
  user_id text NOT NULL REFERENCES users(id),
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  id text NOT NULL,
  user_id text NOT NULL REFERENCES users(id),
  payload text NOT NULL,
  PRIMARY KEY(id,user_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
