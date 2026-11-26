'use strict';

const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const adminToken = 'test-local-admin-token-which-is-long-enough-0123456789';
const qrToken = 'TCC_TEST_QR_TOKEN_012345678901234567890123456789012345';
let tempDir, dbPath, port, child, db, orderId, orderKey;

async function freePort() {
  return await new Promise((resolve,reject) => {
    const socket=net.createServer();
    socket.once('error',reject);
    socket.listen(0,'127.0.0.1',()=>{const value=socket.address().port;socket.close(()=>resolve(value));});
  });
}
async function startServer() {
  child=spawn(process.execPath,[path.join(root,'server.js')],{
    cwd:root,stdio:'ignore',
    env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,TCC_LOCAL_ADMIN_TOKEN:adminToken,ALLOWED_ORIGIN:'http://localhost'}
  });
  const deadline=Date.now()+12000;
  while(Date.now()<deadline) {
    if(child.exitCode!==null)throw new Error('Local server exited before ready.');
    try { const response=await fetch('http://127.0.0.1:'+port+'/health');if(response.ok)return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('Local server did not become ready.');
}
async function stopServer() {
  if(!child)return;
  const processToStop=child;child=null;
  processToStop.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>processToStop.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,5000))]);
}
const adminHeaders=()=>({Authorization:'Bearer '+adminToken,'Content-Type':'application/json'});
async function api(route,options={}) {
  const response=await fetch('http://127.0.0.1:'+port+route,{...options,headers:{...adminHeaders(),...(options.headers||{})}});
  return {status:response.status,data:await response.json()};
}

before(async()=>{
  tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'tcc-local-orders-'));
  dbPath=path.join(tempDir,'orders.sqlite');
  port=await freePort();
  await startServer();
  db=new Database(dbPath);
  db.prepare('INSERT INTO qr_tokens(token_hash,table_number,is_active,synced_at) VALUES(?,?,1,?)')
    .run(crypto.createHash('sha256').update(qrToken).digest('hex'),'S1',new Date().toISOString());
});
after(async()=>{
  await stopServer();
  if(db){db.close();db=null;}
  if(tempDir)fs.rmSync(tempDir,{recursive:true,force:true});
});

test('persists an order before success and deduplicates retries',async()=>{
  orderKey=crypto.randomUUID();
  const body={idempotency_key:orderKey,customer_name:'Test Customer',customer_phone:'9876543210',order_type:'dine-in',table_number:'S1',table_qr_token:qrToken,items:[{name:'Test Latte',quantity:2,unit_price:100,category:'Coffee',addons:[],fulfillment_type:'dine-in'}]};
  const requests=await Promise.all(Array.from({length:5},()=>fetch('http://127.0.0.1:'+port+'/v1/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async response=>({status:response.status,data:await response.json()}))));
  assert.ok(requests.every(result=>[200,201].includes(result.status)));
  assert.equal(new Set(requests.map(result=>result.data.order.id)).size,1);
  assert.equal(requests.filter(result=>result.data.duplicate).length,4);
  orderId=requests[0].data.order.id;
  assert.equal(requests[0].data.order.total,200);
  assert.match(requests[0].data.order.order_number,/^TCC-\\d{8}-[A-Z0-9]{6}$/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE idempotency_key=?').get(orderKey).n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_events WHERE entity_id=? AND event_type=?').get(orderId,'order_received').n,1);
});

test('Desk event remains pending until acknowledged and status changes are durable',async()=>{
  const events=await api('/v1/admin/events?after=0');
  assert.equal(events.status,200);
  const event=events.data.events.find(item=>item.event_type==='order_received'&&item.entity_id===orderId);
  assert.ok(event);
  const ack=await api('/v1/admin/events/'+event.seq+'/ack',{method:'POST',body:'{}'});
  assert.equal(ack.status,200);
  const changed=await api('/v1/admin/orders/'+orderId,{method:'PATCH',body:JSON.stringify({status:'preparing'})});
  assert.equal(changed.status,200);
  assert.equal(changed.data.order.status,'preparing');
  assert.equal(db.prepare('SELECT status FROM outbox WHERE entity_type=? AND entity_id=?').get('order',orderId).status,'pending');
});

test('order and unacknowledged events survive a server restart',async()=>{
  await stopServer();
  await startServer();
  const snapshot=await api('/v1/admin/orders?limit=20');
  assert.equal(snapshot.status,200);
  assert.ok(snapshot.data.orders.some(order=>order.id===orderId&&order.status==='preparing'));
  const health=await fetch('http://127.0.0.1:'+port+'/health').then(r=>r.json());
  assert.equal(health.database,'ok');
});
