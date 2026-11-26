'use strict';

require('dotenv').config();
const port = Number(process.env.PORT || 8787);
const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const adminToken = String(process.env.TCC_LOCAL_ADMIN_TOKEN || '');
const intervalMs = Math.max(30000, Number(process.env.QR_SYNC_INTERVAL_MS || 60000));

if (!base || !serviceKey || adminToken.length < 32) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TCC_LOCAL_ADMIN_TOKEN in .env.');
}
const local = String(process.env.LOCAL_SERVER_URL || 'http://127.0.0.1:' + port).replace(/\/$/, '');

async function sync() {
  const response = await fetch(base + '/rest/v1/tcc_table_qr_tokens?select=token_hash,table_number,is_active', {
    headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('QR source returned HTTP ' + response.status);
  const tokens = await response.json();
  const settingResponse = await fetch(base + '/rest/v1/tcc_store_settings?setting_key=eq.customer_ordering_enabled&select=setting_value&limit=1', {
    headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
    signal: AbortSignal.timeout(15000)
  });
  if (!settingResponse.ok) throw new Error('Ordering setting source returned HTTP ' + settingResponse.status);
  const settingRows = await settingResponse.json();
  const orderingEnabled = settingRows?.[0]?.setting_value !== false;
  const saved = await fetch(local + '/v1/admin/qr-cache', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens, customer_ordering_enabled: orderingEnabled }),
    signal: AbortSignal.timeout(15000)
  });
  if (!saved.ok) throw new Error('Local QR cache returned HTTP ' + saved.status);
  const result = await saved.json();
  console.log('QR cache refreshed: ' + result.updated + ' token records; online ordering ' + (orderingEnabled ? 'enabled' : 'paused') + '.');
}
async function loop() {
  while (true) {
    try { await sync(); }
    catch (error) { console.error('QR cache refresh deferred: ' + error.message); }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
loop();
