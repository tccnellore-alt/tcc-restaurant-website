'use strict';

require('dotenv').config();
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(DATA_DIR, 'tcc-orders.sqlite'));
const ADMIN_TOKEN = String(process.env.TCC_LOCAL_ADMIN_TOKEN || '');
const ALLOWED_ORIGIN = String(process.env.ALLOWED_ORIGIN || 'https://tcc-restaurant-website.pages.dev');
const MAX_BODY_BYTES = process.env.MAX_BODY_BYTES || '256kb';

if (ADMIN_TOKEN.length < 32) {
  throw new Error('Set TCC_LOCAL_ADMIN_TOKEN to a random secret of at least 32 characters.');
}
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-tcc-desk-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: MAX_BODY_BYTES, strict: true }));
app.use('/desk', express.static(path.join(__dirname, 'public'), { fallthrough: false }));

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait and try again.' }
});
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many order attempts. Please wait and retry.' }
});

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
const admin = (req, res, next) => {
  const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!match || !safeEqual(match[1], ADMIN_TOKEN)) return res.status(401).json({ error: 'Staff authentication required.' });
  next();
};
const normalizePhone = value => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
const orderDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date()).replaceAll('-', '');
const makeOrderNumber = table => 'TCC-' + orderDate() + '-' + table + '-L' + crypto.randomBytes(3).toString('hex').toUpperCase();
const tableForQr = token => {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(String(token || ''))) return null;
  return db.prepare('SELECT table_number FROM qr_tokens WHERE token_hash=? AND is_active=1').get(sha256(token))?.table_number || null;
};
const insertEvent = db.prepare(`
  INSERT INTO order_events(event_id,entity_type,entity_id,event_type,payload_json,created_at)
  VALUES(?,?,?,?,?,?)
`);
const insertOutbox = db.prepare(`
  INSERT INTO outbox(entity_type,entity_id,operation,idempotency_key,payload_json,next_attempt_at,created_at)
  VALUES(?,?,?,?,?,?,?)
  ON CONFLICT(entity_type,entity_id,operation) DO UPDATE SET payload_json=excluded.payload_json,status='pending',attempts=0,next_attempt_at=excluded.next_attempt_at,last_error=NULL,synced_at=NULL
`);
const addEvent = (type, id, eventType, payload, key) => {
  const created = now();
  insertEvent.run(uuid(), type, id, eventType, JSON.stringify(payload), created);
  insertOutbox.run(type, id, 'upsert', key || id, JSON.stringify(payload), created, created);
};
const parseOrder = row => ({ ...row, items: JSON.parse(row.payload_json).items, ...JSON.parse(row.payload_json) });

app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    const pending = db.prepare("SELECT COUNT(*) AS n FROM outbox WHERE status IN ('pending','failed')").get().n;
    const unacked = db.prepare('SELECT COUNT(*) AS n FROM order_events WHERE desk_ack_at IS NULL').get().n;
    res.json({ ok: true, service: 'tcc-local-order-server', database: 'ok', pending_cloud_sync: pending, unacknowledged_desk_events: unacked, time: now() });
  } catch (error) {
    res.status(503).json({ ok: false, service: 'tcc-local-order-server', database: 'error' });
  }
});

app.post('/v1/orders', publicLimiter, orderLimiter, (req, res) => {
  try {
    const body = req.body || {};
    const key = String(body.idempotency_key || '').trim();
    if (!isUuid(key)) return res.status(400).json({ error: 'Please retry placing your order.' });
    const existing = db.prepare('SELECT * FROM orders WHERE idempotency_key=?').get(key);
    if (existing) return res.json({ order: publicOrder(existing), duplicate: true, delivery_state: existing.desk_ack_at ? 'delivered_to_desk' : 'received' });

    const phone = normalizePhone(body.customer_phone);
    const orderType = body.order_type === 'takeaway' ? 'takeaway' : body.order_type === 'dine-in' ? 'dine-in' : '';
    const qrToken = String(body.table_qr_token || '').trim();
    const table = tableForQr(qrToken);
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
    if (!orderType || !table) return res.status(403).json({ error: 'Please scan an active TCC table QR to place an order.' });
    if (orderType !== 'dine-in') return res.status(403).json({ error: 'This QR is for dine-in ordering only.' });
    const inputItems = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
    if (!inputItems.length) return res.status(400).json({ error: 'Your cart is empty.' });

    // Prototype only: this currently mirrors the existing API's client-price behavior.
    // Production cutover is blocked until a server-owned menu/add-on price catalogue is implemented.
    const items = inputItems.map(item => {
      const name = String(item.name || '').trim().slice(0, 120);
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
      const unitPrice = Number(item.unit_price);
      if (!name || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000) throw new Error('An item has invalid price information.');
      const addons = Array.isArray(item.addons) ? item.addons.slice(0, 12).map(addon => {
        const addonName = String(addon.name || '').trim().slice(0, 100);
        const price = Number(addon.price);
        if (!addonName || !Number.isFinite(price) || price < 0 || price > 100000) throw new Error('An add-on has invalid price information.');
        return { name: addonName, price };
      }) : [];
      const fulfillment = item.fulfillment_type === 'takeaway' ? 'takeaway' : 'dine-in';
      return {
        name, quantity, unit_price: unitPrice,
        category: String(item.category || 'Menu').slice(0, 80),
        section: String(item.section || '').slice(0, 80),
        addons, note: String(item.note || '').trim().slice(0, 300),
        fulfillment_type: fulfillment, item_status: 'pending'
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.quantity * (item.unit_price + item.addons.reduce((a, addon) => a + addon.price, 0)), 0);
    const takeawayFee = items.reduce((sum, item) => sum + (item.fulfillment_type === 'takeaway' ? item.quantity * 10 : 0), 0);
    const total = subtotal + takeawayFee;
    const id = uuid(), created = now(), orderNumber = makeOrderNumber(String(table).toUpperCase());
    const payload = {
      id, order_number: orderNumber, idempotency_key: key, parent_order_id: null, customer_name: String(body.customer_name || '').trim().slice(0, 120) || 'Guest',
      customer_phone: phone, order_type: orderType, table_number: String(table).toUpperCase(),
      items, subtotal, takeaway_fee: takeawayFee, total,
      customer_note: String(body.customer_note || '').trim().slice(0, 500) || null,
      status: 'new', source: 'local-server', created_at: created, updated_at: created
    };
    const commitOrder = db.transaction(() => {
      db.prepare(`INSERT INTO orders(id,order_number,idempotency_key,customer_name,customer_phone,order_type,table_number,status,total,payload_json,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, orderNumber, key, payload.customer_name, phone, orderType, payload.table_number, 'new', total, JSON.stringify(payload), created, created
      );
      addEvent('order', id, 'order_received', payload, key);
    });
    commitOrder();
    const saved = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
    return res.status(201).json({ order: publicOrder(saved), delivery_state: 'received', received_at: created });
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed: orders.idempotency_key')) {
      const row = db.prepare('SELECT * FROM orders WHERE idempotency_key=?').get(String(req.body?.idempotency_key || ''));
      if (row) return res.json({ order: publicOrder(row), duplicate: true, delivery_state: row.desk_ack_at ? 'delivered_to_desk' : 'received' });
    }
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON request.' });
    if (error.message.includes('invalid price')) return res.status(400).json({ error: error.message });
    console.error('Order persistence failed:', error.message);
    return res.status(503).json({ error: 'We could not safely save your order. Your cart is not confirmed; please retry or ask staff.' });
  }
});

function publicOrder(row) {
  const payload = JSON.parse(row.payload_json);
  return { id: row.id, order_number: row.order_number, status: row.status, created_at: row.created_at, total: row.total, ...payload };
}

app.get('/v1/admin/orders', admin, (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 250));
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json({ orders: rows.map(publicOrder) });
});

app.get('/v1/admin/events', admin, (req, res) => {
  const after = Math.max(0, Number(req.query.after) || 0);
  const rows = db.prepare(`SELECT seq,event_id,entity_type,entity_id,event_type,payload_json,created_at,desk_ack_at
    FROM order_events WHERE seq>? OR desk_ack_at IS NULL ORDER BY seq LIMIT 250`).all(after);
  res.json({ events: rows.map(row => ({ ...row, payload: JSON.parse(row.payload_json) })), last_seq: rows.length ? rows[rows.length - 1].seq : after });
});

app.post('/v1/admin/events/:seq/ack', admin, (req, res) => {
  const seq = Number(req.params.seq);
  if (!Number.isInteger(seq) || seq < 1) return res.status(400).json({ error: 'Invalid event sequence.' });
  const event = db.prepare('SELECT * FROM order_events WHERE seq=?').get(seq);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const at = now();
  const ack = db.transaction(() => {
    db.prepare('UPDATE order_events SET desk_ack_at=COALESCE(desk_ack_at,?) WHERE seq=?').run(at, seq);
    if (event.entity_type === 'order' && event.event_type === 'order_received') {
      db.prepare('UPDATE orders SET desk_ack_at=COALESCE(desk_ack_at,?) WHERE id=?').run(at, event.entity_id);
    }
  });
  ack();
  res.json({ acknowledged: true, event_id: event.event_id, acknowledged_at: at });
});

app.patch('/v1/admin/orders/:id', admin, (req, res) => {
  const id = String(req.params.id || '');
  const status = String(req.body?.status || '');
  const allowed = new Set(['new','accepted','preparing','ready','completed','cancelled','rejected']);
  if (!allowed.has(status)) return res.status(400).json({ error: 'Invalid order status.' });
  const row = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: 'Order not found.' });
  const at = now();
  const payload = JSON.parse(row.payload_json);
  payload.status = status;
  payload.updated_at = at;
  const commitStatus = db.transaction(() => {
    db.prepare('UPDATE orders SET status=?,payload_json=?,updated_at=? WHERE id=?').run(status, JSON.stringify(payload), at, id);
    addEvent('order', id, 'order_status_changed', { id, order_number: row.order_number, status, updated_at: at }, row.idempotency_key);
    db.prepare('INSERT INTO audit_log(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(uuid(), String(req.headers['x-tcc-desk-id'] || 'Order Desk').slice(0,80), 'status_changed', 'order', id, JSON.stringify({ from: row.status, to: status }), at);
  });
  commitStatus();
  res.json({ order: publicOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(id)) });
});

app.post('/v1/table-requests', publicLimiter, (req, res) => {
  const body = req.body || {};
  const requestType = String(body.request_type || 'staff');
  if (!['staff','bill'].includes(requestType)) return res.status(400).json({ error: 'Invalid table request.' });
  const table = tableForQr(String(body.table_qr_token || '').trim());
  if (!table) return res.status(403).json({ error: 'Please scan an active TCC table QR to send a request.' });
  const open = db.prepare("SELECT * FROM table_requests WHERE table_number=? AND request_type=? AND status='pending'").get(table, requestType);
  if (open) return res.json({ request: open, duplicate: true });
  const id = uuid(), created = now();
  try {
    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO table_requests(id,table_number,request_type,status,created_at) VALUES(?,?,?,\'pending\',?)').run(id, table, requestType, created);
      const payload = { id, table_number: table, request_type: requestType, status: 'pending', created_at: created };
      addEvent('table_request', id, 'table_request_received', payload, id);
    });
    transaction();
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      const duplicate = db.prepare("SELECT * FROM table_requests WHERE table_number=? AND request_type=? AND status='pending'").get(table, requestType);
      if (duplicate) return res.json({ request: duplicate, duplicate: true });
    }
    return res.status(503).json({ error: 'We could not save the request. Please retry or call staff.' });
  }
  res.status(201).json({ request: db.prepare('SELECT * FROM table_requests WHERE id=?').get(id), delivery_state: 'received' });
});

app.get('/v1/admin/table-requests', admin, (req, res) => {
  const requests = db.prepare("SELECT * FROM table_requests WHERE status='pending' ORDER BY created_at DESC LIMIT 100").all();
  res.json({ requests });
});
app.patch('/v1/admin/table-requests/:id', admin, (req, res) => {
  const id = String(req.params.id || ''), at = now();
  const row = db.prepare("SELECT * FROM table_requests WHERE id=? AND status='pending'").get(id);
  if (!row) return res.status(404).json({ error: 'This request is already attended or no longer exists.' });
  const actor = String(req.headers['x-tcc-desk-id'] || 'Order Desk').slice(0,80);
  const transaction = db.transaction(() => {
    db.prepare("UPDATE table_requests SET status='attended',attended_at=?,attended_by=? WHERE id=? AND status='pending'").run(at, actor, id);
    const payload = { id, table_number: row.table_number, request_type: row.request_type, status: 'attended', attended_at: at, attended_by: actor };
    addEvent('table_request', id, 'table_request_attended', payload, id);
    db.prepare('INSERT INTO audit_log(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(uuid(), actor, 'table_request_attended', 'table_request', id, JSON.stringify(payload), at);
  });
  transaction();
  res.json({ request: db.prepare('SELECT * FROM table_requests WHERE id=?').get(id) });
});

app.post('/v1/admin/qr-cache', admin, (req, res) => {
  const rows = Array.isArray(req.body?.tokens) ? req.body.tokens.slice(0,200) : [];
  const at = now();
  const save = db.transaction(() => {
    db.prepare('UPDATE qr_tokens SET is_active=0,synced_at=?').run(at);
    const upsert = db.prepare(`INSERT INTO qr_tokens(token_hash,table_number,is_active,synced_at) VALUES(?,?,?,?)
      ON CONFLICT(token_hash) DO UPDATE SET table_number=excluded.table_number,is_active=excluded.is_active,synced_at=excluded.synced_at`);
    for (const row of rows) {
      if (!/^[a-f0-9]{64}$/i.test(String(row.token_hash || ''))) continue;
      const table = String(row.table_number || '').trim().toUpperCase().slice(0,30);
      if (!table) continue;
      upsert.run(row.token_hash, table, row.is_active === false ? 0 : 1, at);
    }
  });
  save();
  res.json({ updated: rows.length, synced_at: at });
});

app.get('/v1/admin/outbox', admin, (req, res) => {
  const summary = db.prepare("SELECT status,COUNT(*) AS count FROM outbox GROUP BY status").all();
  res.json({ summary });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON request.' });
  console.error('Unhandled local API error:', error.message);
  res.status(500).json({ error: 'Local order server error.' });
});

const server = app.listen(PORT, HOST, () => {
  console.log('TCC local order server listening on ' + HOST + ':' + PORT);
  console.log('Database: ' + DB_PATH);
});
const shutdown = () => {
  server.close(() => {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); } finally { process.exit(0); }
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
