const TCC_ORDERS_URL = "https://hyhkrmkemhjuqokcoqgp.supabase.co/functions/v1/tcc-orders";
const TCC_ORDERS_PUBLIC_KEY = "sb_publishable_pC9W2g-WgfmknBoxlJllzA_JAndRTF8";
const cart = new Map();
let orderType = "takeaway";
let pendingOrderPayload = null;
let orderComplete = false;

const slug = value => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const money = paise => "₹" + (paise / 100).toLocaleString("en-IN",{maximumFractionDigits:2});
const cleanItemName = row => {
  const heading = row.querySelector("h3")?.cloneNode(true);
  if (!heading) return "";
  heading.querySelectorAll(".tcc-bestseller-badge,.tcc-new-arrival-badge,.food-badge,.availability-status").forEach(node=>node.remove());
  return heading.textContent.replace(/\s+/g," ").trim();
};
const readPricePaise = row => {
  const match = row.querySelector(":scope > strong")?.textContent.match(/[\d,]+/);
  return match ? Number(match[0].replace(/,/g,"")) * 100 : 0;
};

function ensureCartUI(){
  if(document.getElementById("tccOrderCart")) return;
  const launcher = document.createElement("button");
  launcher.id="tccOrderCart"; launcher.className="tcc-order-launcher"; launcher.type="button";
  launcher.innerHTML='<span>Your order</span><b id="tccOrderCount">0</b><strong id="tccOrderLauncherTotal">₹0</strong>';
  launcher.addEventListener("click",openCart);
  document.body.append(launcher);

  const overlay=document.createElement("div");
  overlay.id="tccOrderOverlay"; overlay.className="tcc-order-overlay"; overlay.hidden=true;
  overlay.innerHTML=`
    <section class="tcc-order-sheet" role="dialog" aria-modal="true" aria-labelledby="tccOrderTitle">
      <header class="tcc-order-head"><div><small>THE COFFEE CLUB · NELLORE</small><h2 id="tccOrderTitle">Your order</h2></div><button type="button" class="tcc-order-close" aria-label="Close">×</button></header>
      <div id="tccOrderLines" class="tcc-order-lines"></div>
      <div id="tccOrderEmpty" class="tcc-order-empty">Your cart is empty. Add something you love from the menu.</div>
      <form id="tccCheckoutForm" class="tcc-checkout" hidden>
        <fieldset><legend>How would you like your order?</legend>
          <label><input type="radio" name="orderType" value="takeaway" checked> Takeaway</label>
          <label><input type="radio" name="orderType" value="dine_in"> Dine-in</label>
        </fieldset>
        <label>Your name<input name="customerName" autocomplete="name" maxlength="80" required placeholder="Enter your name"></label>
        <label>Mobile number<input name="customerMobile" autocomplete="tel" inputmode="tel" maxlength="20" required placeholder="10-digit mobile number"></label>
        <label>Special instructions <span>(optional)</span><textarea name="customerNotes" maxlength="500" rows="2" placeholder="Any instructions for the team?"></textarea></label>
        <div class="tcc-order-summary">
          <div><span>Items subtotal</span><b id="tccOrderSubtotal">₹0</b></div>
          <div><span>Takeaway charge</span><b id="tccOrderTakeaway">₹0</b></div>
          <div class="total"><span>Total</span><b id="tccOrderTotal">₹0</b></div>
          <small>Payment at the counter · No online payment</small>
        </div>
        <p id="tccOrderError" class="tcc-order-error" role="alert"></p>
        <button class="tcc-order-submit" type="submit">Place order · <span id="tccOrderSubmitTotal">₹0</span></button>
      </form>
      <div id="tccOrderConfirmation" class="tcc-order-confirmation" hidden></div>
    </section>`;
  overlay.addEventListener("click",event=>{if(event.target===overlay)closeCart();});
  overlay.querySelector(".tcc-order-close").addEventListener("click",closeCart);
  overlay.querySelectorAll('input[name="orderType"]').forEach(input=>input.addEventListener("change",event=>{orderType=event.target.value;renderCart();}));
  overlay.querySelector("#tccCheckoutForm").addEventListener("submit",submitOrder);
  document.body.append(overlay);
}

function renderProductControl(row){
  if(!row)return;
  const action=row.querySelector(".tcc-menu-order-action");
  const add=action?.querySelector(".tcc-add-order");
  const controls=action?.querySelector(".tcc-product-qty");
  if(!action||!add||!controls)return;
  const item=cart.get(row.dataset.orderItemId);
  const count=controls.querySelector(".tcc-product-qty-count");
  const minus=controls.querySelector('[data-qty-change="-1"]');
  const plus=controls.querySelector('[data-qty-change="1"]');
  add.hidden=!!item;
  controls.hidden=!item;
  if(item){
    count.textContent=String(item.quantity);
    minus.disabled=!!pendingOrderPayload||orderComplete;
    plus.disabled=!!pendingOrderPayload||orderComplete||item.quantity>=20;
  }
}
function findOrderRow(id){
  return [...document.querySelectorAll(".menu-group .m-item")].find(row=>row.dataset.orderItemId===id);
}
function installAddButtons(){
  document.querySelectorAll(".menu-group .m-item").forEach(row=>{
    if(row.querySelector(".tcc-menu-order-action"))return;
    const name=cleanItemName(row),price=readPricePaise(row);
    if(!name||!price)return;
    const id=slug(name);
    row.dataset.orderItemId=id;
    row.dataset.orderItemName=name;
    row.dataset.orderItemPrice=String(price);
    const unavailable=!!row.querySelector(".availability-status");
    const priceWrap=document.createElement("div");
    priceWrap.className="tcc-menu-order-action";
    const priceNode=row.querySelector(":scope > strong");
    if(priceNode){priceNode.replaceWith(priceWrap);priceWrap.append(priceNode);}
    else row.append(priceWrap);
    const add=document.createElement("button");
    add.type="button";
    add.className="tcc-add-order";
    add.textContent=unavailable?"Sold out":"＋ Add";
    add.disabled=unavailable;
    add.setAttribute("aria-label",unavailable?name+" is sold out":"Add "+name+" to your order");
    const controls=document.createElement("div");
    controls.className="tcc-product-qty";
    controls.hidden=true;
    const minus=document.createElement("button");
    minus.type="button";minus.textContent="−";minus.dataset.qtyChange="-1";
    minus.setAttribute("aria-label","Remove one "+name);
    const count=document.createElement("span");
    count.className="tcc-product-qty-count";
    const plus=document.createElement("button");
    plus.type="button";plus.textContent="+";plus.dataset.qtyChange="1";
    plus.setAttribute("aria-label","Add one "+name);
    controls.append(minus,count,plus);
    priceWrap.append(add,controls);
  });
}
function handleMenuOrderClick(event){
  const button=event.target.closest(".tcc-add-order,.tcc-product-qty button");
  if(!button||button.disabled)return;
  const row=button.closest(".m-item");
  if(!row)return;
  event.preventDefault();
  event.stopPropagation();
  if(button.classList.contains("tcc-add-order")){
    addItem({id:row.dataset.orderItemId,name:row.dataset.orderItemName,price:Number(row.dataset.orderItemPrice)});
  }else{
    updateQty(row.dataset.orderItemId,Number(button.dataset.qtyChange));
  }
}
function addItem(item){
  if(pendingOrderPayload||orderComplete)return;
  const existing=cart.get(item.id);
  cart.set(item.id,{...item,quantity:Math.min(20,(existing?.quantity??0)+1)});
  renderCart();
  renderProductControl(findOrderRow(item.id));
  const launcher=document.getElementById("tccOrderCart");
  launcher?.classList.add("has-items");
  window.setTimeout(()=>launcher?.classList.remove("has-items"),350);
}
function updateQty(id,delta){
  if(pendingOrderPayload||orderComplete)return;
  const item=cart.get(id); if(!item)return;
  const next=item.quantity+delta;
  if(next<=0)cart.delete(id); else item.quantity=Math.min(20,next);
  renderCart();
  renderProductControl(findOrderRow(id));
}
function totals(){
  const items=[...cart.values()];
  const units=items.reduce((sum,item)=>sum+item.quantity,0);
  const subtotal=items.reduce((sum,item)=>sum+item.price*item.quantity,0);
  const fee=orderType==="takeaway"?units*1000:0;
  return {items,units,subtotal,fee,total:subtotal+fee};
}
function renderCart(){
  const ui=document.getElementById("tccOrderOverlay"); if(!ui)return;
  const {items,units,subtotal,fee,total}=totals();
  document.getElementById("tccOrderCount").textContent=String(units);
  document.getElementById("tccOrderLauncherTotal").textContent=money(total);
  document.getElementById("tccOrderEmpty").hidden=items.length>0;
  document.getElementById("tccCheckoutForm").hidden=items.length===0;
  document.getElementById("tccOrderLines").innerHTML="";
  items.forEach(item=>{
    const line=document.createElement("div"); line.className="tcc-order-line";
    const info=document.createElement("div"); info.className="tcc-order-line-info";
    const name=document.createElement("strong"); name.textContent=item.name;
    const price=document.createElement("small"); price.textContent=money(item.price)+" each";
    info.append(name,price);
    const controls=document.createElement("div"); controls.className="tcc-qty-controls";
    const minus=document.createElement("button"); minus.type="button"; minus.textContent="−"; minus.disabled=!!pendingOrderPayload||orderComplete; minus.setAttribute("aria-label","Remove one "+item.name); minus.addEventListener("click",()=>updateQty(item.id,-1));
    const qty=document.createElement("span"); qty.textContent=String(item.quantity);
    const plus=document.createElement("button"); plus.type="button"; plus.textContent="+"; plus.setAttribute("aria-label","Add one "+item.name); plus.disabled=!!pendingOrderPayload||orderComplete||item.quantity>=20; plus.addEventListener("click",()=>updateQty(item.id,1));
    controls.append(minus,qty,plus);
    const lineTotal=document.createElement("b"); lineTotal.textContent=money(item.price*item.quantity);
    line.append(info,controls,lineTotal); document.getElementById("tccOrderLines").append(line);
  });
  document.getElementById("tccOrderSubtotal").textContent=money(subtotal);
  document.getElementById("tccOrderTakeaway").textContent=money(fee);
  document.getElementById("tccOrderTotal").textContent=money(total);
  document.getElementById("tccOrderSubmitTotal").textContent=money(total);
  ui.querySelector('input[value="takeaway"]').checked=orderType==="takeaway";
  ui.querySelector('input[value="dine_in"]').checked=orderType==="dine_in";
}
function openCart(){
  const ui=document.getElementById("tccOrderOverlay"); ui.hidden=false; document.body.classList.add("tcc-order-open"); renderCart();
}
function closeCart(){
  document.getElementById("tccOrderOverlay").hidden=true; document.body.classList.remove("tcc-order-open");
}
async function submitOrder(event){
  event.preventDefault();
  const form=event.currentTarget, error=document.getElementById("tccOrderError"), submit=form.querySelector('button[type="submit"]');
  const {items}=totals();
  if(!items.length)return;
  const data=new FormData(form);
  const mobile=String(data.get("customerMobile")??"").trim();
  if(!pendingOrderPayload&&(!/^[0-9+() -]{8,20}$/.test(mobile)||mobile.replace(/[^0-9]/g,"").length<8||mobile.replace(/[^0-9]/g,"").length>15)){error.textContent="Please enter a valid mobile number.";return;}
  if(!pendingOrderPayload){
    pendingOrderPayload={
      action:"create_order",idempotency_key:crypto.randomUUID(),order_type:orderType,
      customer_name:String(data.get("customerName")??"").trim(),customer_mobile:mobile,
      customer_notes:String(data.get("customerNotes")??"").trim(),
      items:items.map(item=>({item_id:item.id,quantity:item.quantity}))
    };
  }
  error.textContent=""; submit.disabled=true; submit.textContent="Placing your order…"; renderCart();
  const requestController=new AbortController();
  const requestTimeout=window.setTimeout(()=>requestController.abort(),20000);
  try{
    const response=await fetch(TCC_ORDERS_URL,{method:"POST",headers:{"Content-Type":"application/json","apikey":TCC_ORDERS_PUBLIC_KEY},body:JSON.stringify(pendingOrderPayload),signal:requestController.signal});
    let result;
    try{result=await response.json();}catch{throw new Error("We received an unexpected response. Please retry; your order will not be duplicated.");}
    if(!response.ok){const failure=new Error(result.error||"We couldn't place your order. Please try again.");failure.status=response.status;throw failure;}
    pendingOrderPayload=null; orderComplete=true;
    form.hidden=true; document.getElementById("tccOrderLines").hidden=true; document.getElementById("tccOrderEmpty").hidden=true;
    const confirmation=document.getElementById("tccOrderConfirmation"); confirmation.hidden=false;
    confirmation.innerHTML="";
    const title=document.createElement("h3"); title.textContent="Your order is confirmed";
    const reference=document.createElement("strong"); reference.textContent=result.order_reference;
    const total=document.createElement("p"); total.textContent="Total: "+money(result.total_paise);
    const note=document.createElement("p"); note.textContent="Please pay at the counter. Thank you for choosing TCC!";
    const done=document.createElement("button"); done.type="button"; done.className="tcc-order-submit"; done.textContent="Done"; done.addEventListener("click",()=>{cart.clear();orderType="takeaway";orderComplete=false;pendingOrderPayload=null;closeCart();confirmation.hidden=true;document.getElementById("tccOrderLines").hidden=false;form.reset();form.hidden=true;renderCart();});
    confirmation.append(title,reference,total,note,done);
    document.getElementById("tccOrderCount").textContent="0";
    document.getElementById("tccOrderLauncherTotal").textContent="₹0";
  }catch(err){
    if(err.status&&err.status<500)pendingOrderPayload=null;
    error.textContent=err.name==="AbortError"
      ?"This is taking longer than expected. Your order may still have been received. Please tap Retry; we’ll safely check the same order and prevent duplicates."
      :(err.message||"Please try again.");
    submit.disabled=false;
    submit.innerHTML='Retry order · <span id="tccOrderSubmitTotal"></span>';
    document.getElementById("tccOrderSubmitTotal").textContent=money(totals().total);
    renderCart();
  }finally{window.clearTimeout(requestTimeout);}
}

function initTccOrdering(){
  ensureCartUI();
  const menu=document.querySelector(".menu-content");
  if(menu){
    menu.addEventListener("click",handleMenuOrderClick);
    installAddButtons();
    const observer=new MutationObserver(()=>installAddButtons());
    observer.observe(menu,{childList:true,subtree:true});
  }
  renderCart();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initTccOrdering);
else initTccOrdering();
