import { createClient } from "npm:@supabase/supabase-js@2";

import MENU from "./menu-catalog.json" with { type: "json" };
const ALLOWED_ORIGINS = new Set([
  "https://tcc-restaurant-website.pages.dev",
  "https://order.tcc-restaurant-website.pages.dev",
  "http://localhost:8788"
]);
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
});
const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
const enc = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec = (value: string) => Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0));
const hex = (bytes: Uint8Array) => [...bytes].map(v => v.toString(16).padStart(2,"0")).join("");
const fromHex = (value: string) => new Uint8Array(value.match(/.{1,2}/g)?.map(v => parseInt(v,16)) ?? []);
const supabase = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    (Deno.env.get("SUPABASE_SECRET_KEYS") ? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!).default : undefined);
  if (!url || !serviceKey) throw new Error("Server database configuration is missing");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
};
async function getStaffSecret(db: ReturnType<typeof createClient>, name: string) {
  const {data,error} = await db.rpc("get_tcc_staff_secret",{p_name:name});
  if (error) throw error;
  return typeof data === "string" ? data : "";
}
async function sessionSecret(db: ReturnType<typeof createClient>) {
  const value = await getStaffSecret(db,"tcc_session_secret");
  if (!value || value.length < 32) throw new Error("Staff session secret is not configured");
  return value;
}
async function signSession(payload: Record<string, unknown>, db: ReturnType<typeof createClient>) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(await sessionSecret(db)), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const body = enc(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return body + "." + enc(signature);
}
async function verifySession(token: string, db: ReturnType<typeof createClient>) {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(await sessionSecret(db)), {name:"HMAC",hash:"SHA-256"}, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, dec(signature), new TextEncoder().encode(body));
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(dec(body)));
    return payload.role === "admin" && Number(payload.exp) > Math.floor(Date.now()/1000);
  } catch {
    return false;
  }
}
async function passwordMatches(password: string, db: ReturnType<typeof createClient>) {
  const stored = await getStaffSecret(db,"tcc_admin_password_hash");
  const [saltHex, expectedHex] = stored.split(":");
  if (!saltHex || !expectedHex || !/^[a-f0-9]{32,}$/i.test(saltHex) || !/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:fromHex(saltHex),iterations:210000,hash:"SHA-256"}, material, 256));
  const expected = fromHex(expectedHex);
  let difference = bits.length ^ expected.length;
  for (let index=0; index<bits.length; index++) difference |= bits[index] ^ (expected[index] ?? 0);
  return difference === 0;
}
async function sourceHash(req: Request, db: ReturnType<typeof createClient>) {
  const source = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const bytes = new TextEncoder().encode(source + ":" + await sessionSecret(db));
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
function validMobile(value: string) {
  const digits = value.replace(/[^0-9]/g,"");
  return /^[0-9+() -]{8,20}$/.test(value) && digits.length >= 8 && digits.length <= 15;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders(origin)});
  if (req.method !== "POST" || !origin || !ALLOWED_ORIGINS.has(origin)) return json({error:"Request not allowed"},403,origin);
  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({error:"Invalid request"},400,origin); }
  try {
    const db = supabase();
    const action = String(body.action ?? "");

    if (action === "create_order") {
      const sourceIp = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
      const sourceDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tcc-orders-public:" + sourceIp));
      const sourceKey = hex(new Uint8Array(sourceDigest));
      const {data:allowed,error:limitError} = await db.rpc("allow_tcc_order_submission",{p_source_hash:sourceKey});
      if (limitError) throw limitError;
      if (allowed !== true) return json({error:"Too many order attempts. Please wait a few minutes and try again."},429,origin);
      const type = body.order_type;
      const name = String(body.customer_name ?? "").trim();
      const mobile = String(body.customer_mobile ?? "").trim();
      const notes = String(body.customer_notes ?? "").trim();
      const key = String(body.idempotency_key ?? "");
      if (!["takeaway","dine_in"].includes(type) || name.length < 2 || name.length > 80 || !validMobile(mobile) || notes.length > 500 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
        return json({error:"Please check your order details and try again."},400,origin);
      }
      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) return json({error:"Your cart is empty or contains too many items."},400,origin);
      const lineItems = [];
      let subtotal = 0, units = 0;
      for (const requested of body.items) {
        if (!requested || typeof requested !== "object") return json({error:"One or more cart items are invalid."},400,origin);
        const item = MENU.find((entry:any)=>entry.id === requested.item_id);
        const quantity = Number(requested.quantity);
        if (!item || !item.available || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return json({error:"One or more items are unavailable. Please refresh the menu and try again."},409,origin);
        units += quantity;
        if (units > 50) return json({error:"The order quantity is above the allowed limit."},400,origin);
        const lineTotal = item.price_paise * quantity;
        subtotal += lineTotal;
        lineItems.push({item_id:item.id,item_name:item.name,unit_price_paise:item.price_paise,quantity,line_total_paise:lineTotal});
      }
      const takeawayFee = type === "takeaway" ? units * 1000 : 0;
      const total = subtotal + takeawayFee;
      const dateCode = new Date().toISOString().slice(2,10).replace(/-/g,"");
      const random = new Uint8Array(6); crypto.getRandomValues(random);
      const reference = "TCC-" + dateCode + "-" + hex(random).toUpperCase();
      const order = {
        order_reference:reference,order_type:type,customer_name:name,customer_mobile:mobile,
        customer_notes:notes,subtotal_paise:subtotal,takeaway_fee_paise:takeawayFee,total_paise:total,
        payment_method:"pay_at_counter",payment_status:"unpaid",idempotency_key:key
      };
      const {data,error} = await db.rpc("create_tcc_order",{p_order:order,p_items:lineItems});
      if (error) throw error;
      return json({ok:true,order_reference:data.order_reference,total_paise:data.total_paise,duplicate:data.duplicate===true},200,origin);
    }

    if (action === "admin_login") {
      const username = String(body.username ?? "");
      const password = String(body.password ?? "");
      if (username.length > 80 || password.length > 256) return json({error:"Invalid username or password"},401,origin);
      const hash = await sourceHash(req,db);
      const {data:allowed,error:loginLimitError} = await db.rpc("begin_tcc_staff_login_attempt",{p_source_hash:hash});
      if (loginLimitError) throw loginLimitError;
      if (allowed !== true) return json({error:"Too many attempts. Try again in 15 minutes."},429,origin);
      const expectedUser = Deno.env.get("TCC_ADMIN_USERNAME") ?? "admin";
      const passwordOk = await passwordMatches(password,db);
      const good = username === expectedUser && passwordOk;
      if (!good) return json({error:"Invalid username or password"},401,origin);
      await db.from("staff_login_attempts").delete().eq("source_hash",hash);
      const token = await signSession({role:"admin",exp:Math.floor(Date.now()/1000)+4*60*60},db);
      return json({ok:true,token,expires_in:14400},200,origin);
    }

    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !await verifySession(token,db)) return json({error:"Authentication required"},401,origin);

    if (action === "admin_session") return json({ok:true,role:"admin"},200,origin);
    if (action === "list_orders") {
      const {data,error} = await db.from("orders").select("*, order_items(*)").order("created_at",{ascending:false}).limit(100);
      if (error) throw error;
      return json({ok:true,orders:data ?? []},200,origin);
    }
    if (action === "get_order") {
      const reference = String(body.order_reference ?? "");
      const {data,error} = await db.from("orders").select("*, order_items(*)").eq("order_reference",reference).maybeSingle();
      if (error) throw error;
      if (!data) return json({error:"Order not found"},404,origin);
      return json({ok:true,order:data},200,origin);
    }
    return json({error:"Unknown action"},400,origin);
  } catch (error) {
    console.error("TCC orders API error:",error instanceof Error?error.message:"unknown");
    return json({error:"The service is temporarily unavailable. Please try again."},500,origin);
  }
});
