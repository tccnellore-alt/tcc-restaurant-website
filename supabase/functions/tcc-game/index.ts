import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!,SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-tcc-admin-session","Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const db=async(path:string,init:RequestInit={})=>{const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,"Content-Type":"application/json",...(init.headers||{})}});const t=await r.text();if(!r.ok)throw new Error(t||`Database request failed: ${r.status}`);return t?JSON.parse(t):null;};
const b64=(v:Uint8Array)=>btoa(String.fromCharCode(...v));
const digest=async(v:string)=>b64(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))));
const newToken=()=>b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const adminSession=async(req:Request)=>{const token=req.headers.get("x-tcc-admin-session")||"";if(token.length<32)return false;const rows=await db(`tcc_admin_sessions?token_hash=eq.${encodeURIComponent(await digest(token))}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id&limit=1`);return Array.isArray(rows)&&rows.length===1;};
const gameEnabled=async()=>{const rows=await db("tcc_store_settings?setting_key=eq.perfect_10_enabled&select=setting_value&limit=1");return rows?.[0]?.setting_value===true;};
const requireAdmin=async(req:Request)=>await adminSession(req)?null:json({error:"Your TCC Desk session has expired. Please sign in again."},401);
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});try{
 const url=new URL(req.url),action=url.searchParams.get("action");
 if(req.method==="GET"&&action==="game-status")return json({enabled:await gameEnabled()});
 if(req.method==="POST"&&action==="game-start"){
  if(!(await gameEnabled()))return json({error:"Perfect 10 is currently unavailable."},423);
  const body=await req.json(),qrToken=String(body.table_qr_token||"").trim();
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(qrToken))return json({error:"Please scan a valid dedicated TCC table QR code."},403);
  const qrHash=await digest(qrToken),qrRows=await db(`tcc_table_qr_tokens?token_hash=eq.${encodeURIComponent(qrHash)}&is_active=eq.true&select=table_number&limit=1`);
  if(!qrRows?.[0])return json({error:"This table QR is invalid or has been disabled."},403);
  const existingToken=String(body.session_token||"").trim();
  if(/^[A-Za-z0-9_-]{40,80}$/.test(existingToken)){
   const existingHash=await digest(existingToken),existing=await db(`tcc_game_sessions?session_hash=eq.${encodeURIComponent(existingHash)}&qr_token_hash=eq.${encodeURIComponent(qrHash)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,table_number,attempts_used,is_winner,expires_at&limit=1`);
   if(existing?.[0]){
    let reward=null;
    if(existing[0].is_winner){const rewards=await db(`tcc_game_rewards?session_id=eq.${encodeURIComponent(existing[0].id)}&select=reward_code,table_number,discount_percent,discount_scope,combine_with_offers,status,expires_at&limit=1`);reward=rewards?.[0]||null;}
    return json({session_token:existingToken,table_number:existing[0].table_number,attempts_used:existing[0].attempts_used,attempts_remaining:String(existing[0].table_number).toUpperCase()==="T4"?-1:Math.max(0,3-Number(existing[0].attempts_used||0)),unlimited_attempts:String(existing[0].table_number).toUpperCase()==="T4",is_winner:existing[0].is_winner,expires_at:existing[0].expires_at,reward,resumed:true});
   }
  }
  const sessionToken=newToken(),expiresAt=new Date(Date.now()+3*60*60*1000).toISOString();
  const created=await db("tcc_game_sessions?select=table_number,attempts_used,is_winner,expires_at",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({session_hash:await digest(sessionToken),table_number:String(qrRows[0].table_number).toUpperCase(),qr_token_hash:qrHash,expires_at:expiresAt})});
  if(!created?.[0])throw new Error("Unable to create the game session.");
  return json({session_token:sessionToken,table_number:created[0].table_number,attempts_used:0,attempts_remaining:String(created[0].table_number).toUpperCase()==="T4"?-1:3,unlimited_attempts:String(created[0].table_number).toUpperCase()==="T4",is_winner:false,expires_at:created[0].expires_at,reward:null,resumed:false},201);
 }
 if(req.method==="POST"&&action==="game-attempt"){
  if(!(await gameEnabled()))return json({error:"Perfect 10 has been paused by TCC."},423);
  const body=await req.json(),sessionToken=String(body.session_token||"").trim(),elapsedMs=Number(body.elapsed_ms);
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(sessionToken)||!Number.isInteger(elapsedMs))return json({error:"Invalid game attempt."},400);
  const result=await db("rpc/tcc_game_consume_attempt",{method:"POST",body:JSON.stringify({p_session_hash:await digest(sessionToken),p_elapsed_ms:elapsedMs})});
  if(result?.status)return json({error:result.error},Number(result.status));return json(result);
 }
 if(req.method==="GET"&&action==="game-rewards"){
  const denied=await requireAdmin(req);if(denied)return denied;
  const rows=await db("tcc_game_rewards?select=id,reward_code,session_id,table_number,discount_percent,discount_scope,combine_with_offers,status,created_at,expires_at,redeemed_at,redeemed_by&order=created_at.desc&limit=250");
  return json({rewards:rows||[],enabled:await gameEnabled()});
 }
 if(req.method==="GET"&&action==="game-validate"){
  const denied=await requireAdmin(req);if(denied)return denied;
  const code=String(url.searchParams.get("code")||"").trim().toUpperCase();
  if(!/^TCC10-[A-F0-9]{8}$/.test(code))return json({error:"Enter a valid Perfect 10 reward code."},400);
  const rows=await db(`tcc_game_rewards?reward_code=eq.${encodeURIComponent(code)}&select=reward_code,table_number,discount_percent,discount_scope,combine_with_offers,status,created_at,expires_at,redeemed_at&limit=1`);
  if(!rows?.[0])return json({error:"Reward code not found."},404);
  const reward=rows[0];if(reward.status==="redeemed")return json({error:"This reward has already been redeemed.",reward},409);
  if(Date.parse(reward.expires_at)<=Date.now())return json({error:"This reward has expired for this visit.",reward},410);
  return json({valid:true,reward});
 }
 if(req.method==="PATCH"&&action==="game-setting"){
  const denied=await requireAdmin(req);if(denied)return denied;
  const body=await req.json(),enabled=body.enabled===true;
  await db("tcc_store_settings?on_conflict=setting_key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({setting_key:"perfect_10_enabled",setting_value:enabled,updated_at:new Date().toISOString()})});
  return json({enabled});
 }
 if(req.method==="POST"&&action==="game-redeem"){
  const denied=await requireAdmin(req);if(denied)return denied;
  const body=await req.json(),code=String(body.code||"").trim().toUpperCase();
  if(!/^TCC10-[A-F0-9]{8}$/.test(code))return json({error:"Enter a valid Perfect 10 reward code."},400);
  const result=await db("rpc/tcc_game_redeem_reward",{method:"POST",body:JSON.stringify({p_reward_code:code,p_redeemed_by:"TCC Desk"})});
  if(result?.status)return json({error:result.error},Number(result.status));return json(result);
 }
 return json({error:"Unknown action."},404);
 }catch(error){console.error("tcc-game error",error);return json({error:"Unable to process this game request right now. Please try again."},500);}});
