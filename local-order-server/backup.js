'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(__dirname,'data'),'tcc-orders.sqlite'));
const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(process.env.DATA_DIR || path.join(__dirname,'data'),'backups'));
const retentionDays = Math.max(3, Number(process.env.BACKUP_RETENTION_DAYS || 14));

async function main() {
  fs.mkdirSync(backupDir,{recursive:true});
  if(!fs.existsSync(dbPath))throw new Error('Database not found at configured DB_PATH.');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const destination=path.join(backupDir,'tcc-orders-'+stamp+'.sqlite');
  const db=new Database(dbPath,{readonly:true,fileMustExist:true});
  try {
    await db.backup(destination);
  } finally {
    db.close();
  }
  const check=new Database(destination,{readonly:true,fileMustExist:true});
  try {
    const result=check.pragma('integrity_check',{simple:true});
    if(result!=='ok')throw new Error('Backup integrity check failed: '+result);
  } finally { check.close(); }
  const cutoff=Date.now()-retentionDays*24*60*60*1000;
  for(const name of fs.readdirSync(backupDir)) {
    if(!/^tcc-orders-.*\.sqlite$/.test(name))continue;
    const file=path.join(backupDir,name);
    if(fs.statSync(file).mtimeMs<cutoff)fs.unlinkSync(file);
  }
  console.log('Verified SQLite backup: '+destination);
}
main().catch(error=>{console.error('Backup failed:',error.message);process.exit(1);});
