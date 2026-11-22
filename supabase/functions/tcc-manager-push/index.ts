import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-tcc-admin-session", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const b64url = (value:string|Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
};
const digest = async(value:string)=>b64url(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
const db = async(path:string,init:RequestInit={}) => {
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,"Content-Type":"application/json",...(init.headers||{})}});
  const body=await response.text(); if(!response.ok) throw new Error(body||`Database error ${response.status}`); return body?JSON.parse(body):null;
};
const validSession = async(req:Request) => {
  const token=req.headers.get("x-tcc-admin-session")||"";
  if(token.length<32)return false;
  const rows=await db(`tcc_admin_sessions?token_hash=eq.${encodeURIComponent(await digest(token))}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id&limit=1`);
  return Array.isArray(rows)&&rows.length===1;
};
let cachedAccessToken="",cachedExpiry=0;
async function googleAccessToken(){
  if(cachedAccessToken&&Date.now()<cachedExpiry-60000)return cachedAccessToken;
  const raw=Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if(!raw)throw new Error("Firebase service account secret is not configured.");
  const account=JSON.parse(raw);
  const pem=String(account.private_key||"").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");
  const keyBytes=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",keyBytes,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const now=Math.floor(Date.now()/1000);
  const head=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const body=b64url(JSON.stringify({iss:account.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const unsigned=head+"."+body;
  const signature=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned)));
  const assertion=unsigned+"."+b64url(signature);
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  const data=await response.json(); if(!response.ok)throw new Error(data.error_description||data.error||"Google OAuth failed.");
  cachedAccessToken=data.access_token;cachedExpiry=Date.now()+Number(data.expires_in||3600)*1000;return cachedAccessToken;
}
async function sendOrder(order:any){
  const account=JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON")||"{}");
  if(!account.project_id)throw new Error("Firebase project is missing from service account.");
  const devices=await db("tcc_manager_devices?is_active=eq.true&select=id,fcm_token");
  if(!devices?.length)return {sent:0};
  const access=await googleAccessToken();let sent=0;
  for(const device of devices){
    const response=await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,{
      method:"POST",headers:{Authorization:`Bearer ${access}`,"Content-Type":"application/json"},
      body:JSON.stringify({message:{token:device.fcm_token,data:{title:"TCC · New order",body:`${order.order_number} · ₹${Number(order.total||0).toFixed(0)} · ${order.order_type==="takeaway"?"Takeaway":("Table "+(order.table_number||""))}`,orderId:String(order.id),url:`/orders.html?order=${encodeURIComponent(order.id)}&source=push`},android:{priority:"HIGH"},webpush:{headers:{"Urgency":"high","TTL":"3600"}}}})
    });
    const result=await response.json().catch(()=>({}));
    if(response.ok){sent++;continue;}
    const detail=JSON.stringify(result);
    if(response.status===404||detail.includes("UNREGISTERED")||detail.includes("INVALID_ARGUMENT")){
      await db("tcc_manager_devices?id=eq."+encodeURIComponent(device.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({is_active:false,updated_at:new Date().toISOString()})});
    }else console.warn("FCM delivery failed",response.status,detail);
  }
  return {sent};
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed."},405);
  try{
    const url=new URL(req.url),action=url.searchParams.get("action"),authorization=req.headers.get("Authorization")||"";
    if(action==="send-order"){
      if(authorization!==`Bearer ${SERVICE_KEY}`)return json({error:"Unauthorized."},401);
      const body=await req.json(),order=body.order;
      if(!order?.id||!order?.order_number)return json({error:"Invalid order payload."},400);
      return json(await sendOrder(order));
    }
    if(!await validSession(req))return json({error:"Please sign in to the TCC Order Desk again."},401);
    const body=await req.json();
    if(action==="register"){
      const token=String(body.token||"").trim(),deviceName=String(body.device_name||"").slice(0,180),manager=String(body.manager_username||"manager").trim().slice(0,80);
      if(token.length<100||token.length>8192)return json({error:"Invalid Firebase device registration."},400);
      await db("tcc_manager_devices?on_conflict=fcm_token",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({fcm_token:token,manager_username:manager,device_name:deviceName,is_active:true,updated_at:new Date().toISOString(),last_seen_at:new Date().toISOString()})});
      return json({registered:true});
    }
    if(action==="unregister"){
      const token=String(body.token||"").trim();if(!token)return json({error:"Missing device token."},400);
      await db("tcc_manager_devices?fcm_token=eq."+encodeURIComponent(token),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({is_active:false,updated_at:new Date().toISOString()})});
      return json({unregistered:true});
    }
    return json({error:"Unknown action."},404);
  }catch(error){console.error("TCC Manager push error",error);return json({error:(error as Error).message||"Push service failed."},500);}
});
