'use strict';

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('node:path');

const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const dbPath = path.resolve(process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(__dirname,'data'),'tcc-orders.sqlite'));
const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');
db.prepare("UPDATE outbox SET status='pending',next_attempt_at=? WHERE status='syncing'").run(new Date().toISOString());

if (!base || !key) {
  console.error('Cloud sync disabled: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local .env.');
  process.exit(1);
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const now = () => new Date().toISOString();
async function syncOne(row) {
  const payload = JSON.parse(row.payload_json);
  const table = row.entity_type === 'order' ? 'tcc_orders' : row.entity_type === 'table_request' ? 'tcc_table_assistance_requests' : null;
  if (!table) throw new Error('Unsupported cloud entity type: ' + row.entity_type);
  const response = await fetch(base + '/rest/v1/' + table + '?on_conflict=id', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Supabase sync returned HTTP ' + response.status);
}
async function run() {
  while (true) {
    const row = db.prepare("SELECT * FROM outbox WHERE status IN ('pending','failed') AND next_attempt_at<=? ORDER BY id LIMIT 1").get(now());
    if (!row) { await wait(1000); continue; }
    db.prepare("UPDATE outbox SET status='syncing',attempts=attempts+1 WHERE id=?").run(row.id);
    try {
      await syncOne(row);
      const at = now();
      const tx = db.transaction(() => {
        const marked=db.prepare("UPDATE outbox SET status='synced',synced_at=?,last_error=NULL WHERE id=? AND status='syncing' AND payload_json=?").run(at,row.id,row.payload_json);
        if (!marked.changes) return;
        if (row.entity_type === 'order') db.prepare('UPDATE orders SET cloud_synced_at=?,cloud_error=NULL WHERE id=?').run(at,row.entity_id);
        if (row.entity_type === 'table_request') db.prepare('UPDATE table_requests SET cloud_synced_at=? WHERE id=?').run(at,row.entity_id);
      });
      tx();
    } catch (error) {
      const attempts = Number(row.attempts || 0) + 1;
      const delay = Math.min(15 * 60 * 1000, 1000 * (2 ** Math.min(attempts,10)));
      const next = new Date(Date.now() + delay).toISOString();
      const message = String(error.message || 'Cloud sync failed').slice(0,300);
      db.prepare("UPDATE outbox SET status='failed',next_attempt_at=?,last_error=? WHERE id=? AND status='syncing' AND payload_json=?").run(next,message,row.id,row.payload_json);
      if (row.entity_type === 'order') db.prepare('UPDATE orders SET cloud_error=? WHERE id=?').run(message,row.entity_id);
      console.error('Cloud sync deferred for ' + row.entity_type + ' ' + row.entity_id + ': ' + message);
    }
  }
}
run().catch(error => { console.error('Cloud sync worker stopped:',error.message); process.exit(1); });
