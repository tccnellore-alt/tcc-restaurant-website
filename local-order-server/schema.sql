PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK(order_type IN ('dine-in','takeaway')),
  table_number TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  total REAL NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  desk_ack_at TEXT,
  cloud_synced_at TEXT,
  cloud_error TEXT
);
CREATE TABLE IF NOT EXISTS order_sequences (
  order_date TEXT NOT NULL,
  table_key TEXT NOT NULL,
  next_number INTEGER NOT NULL CHECK(next_number > 0),
  PRIMARY KEY(order_date,table_key)
);

CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status,created_at DESC);

CREATE TABLE IF NOT EXISTS order_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  desk_ack_at TEXT
);
CREATE INDEX IF NOT EXISTS order_events_unacked_idx ON order_events(desk_ack_at,seq);

CREATE TABLE IF NOT EXISTS table_requests (
  id TEXT PRIMARY KEY,
  table_number TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK(request_type IN ('staff','bill')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','attended')),
  created_at TEXT NOT NULL,
  attended_at TEXT,
  attended_by TEXT,
  cloud_synced_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS table_requests_one_open_idx
  ON table_requests(table_number,request_type) WHERE status='pending';

CREATE TABLE IF NOT EXISTS qr_tokens (
  token_hash TEXT PRIMARY KEY,
  table_number TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','syncing','synced','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  UNIQUE(entity_type,entity_id,operation)
);
CREATE INDEX IF NOT EXISTS outbox_due_idx ON outbox(status,next_attempt_at,id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
