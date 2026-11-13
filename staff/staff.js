const API="https://hyhkrmkemhjuqokcoqgp.supabase.co/functions/v1/tcc-orders";
const PUBLIC_KEY="sb_publishable_pC9W2g-WgfmknBoxlJllzA_JAndRTF8";
let sessionToken="";
let selectedReference="";
const $=id=>document.getElementById(id);
const money=paise=>"₹"+(Number(paise||0)/100).toLocaleString("en-IN",{maximumFractionDigits:2});
async function callApi(payload,authenticated=false){
 const headers={"Content-Type":"application/json","apikey":PUBLIC_KEY};
 if(authenticated&&sessionToken)headers.Authorization="Bearer "+sessionToken;
 const response=await fetch(API,{method:"POST",headers,body:JSON.stringify(payload),cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Request failed");
 return data;
}
function safeText(tag,text,className){const node=document.createElement(tag);node.textContent=text??"";if(className)node.className=className;return node;}
async function loadOrders(){
 $("ordersMessage").textContent="Loading latest orders…";
 try{
  const result=await callApi({action:"list_orders"},true);
  const list=$("ordersList");list.replaceChildren();
  if(!result.orders.length){$("ordersMessage").textContent="No orders received yet.";return;}
  $("ordersMessage").textContent=result.orders.length+" recent orders";
  result.orders.forEach(order=>{
   const button=document.createElement("button");button.type="button";button.className="order-card"+(order.order_reference===selectedReference?" selected":"");
   const top=document.createElement("div");top.className="order-card-top";
   top.append(safeText("strong",order.order_reference),safeText("span",money(order.total_paise),"amount"));
   const customer=safeText("span",order.customer_name);
   const meta=safeText("small",new Date(order.created_at).toLocaleString("en-IN")+" · "+order.order_type.replace("_"," "));
   const bottom=document.createElement("div");bottom.append(safeText("span",order.payment_status,"pill"),safeText("small",(order.order_items||[]).reduce((n,item)=>n+item.quantity,0)+" items"));
   button.append(top,customer,meta,bottom);button.addEventListener("click",()=>showOrder(order));list.append(button);
  });
  if(!selectedReference)showOrder(result.orders[0]);
 }catch(error){$("ordersMessage").textContent=error.message;if(/Authentication required/i.test(error.message))logout();}
}
function showOrder(order){
 selectedReference=order.order_reference;
 document.querySelectorAll(".order-card").forEach(card=>card.classList.toggle("selected",card.querySelector("strong")?.textContent===selectedReference));
 const panel=$("orderDetails");panel.replaceChildren();
 panel.append(safeText("p","ORDER DETAILS","eyebrow"),safeText("h3",order.order_reference));
 const grid=document.createElement("div");grid.className="detail-grid";
 const fields=[["Customer",order.customer_name],["Mobile",order.customer_mobile],["Order type",order.order_type.replace("_"," ")],["Placed",new Date(order.created_at).toLocaleString("en-IN")],["Payment","Pay at counter · "+order.payment_status]];
 fields.forEach(([label,value])=>{const cell=document.createElement("div");cell.append(safeText("small",label),safeText("strong",value));grid.append(cell);});
 panel.append(grid);
 const table=document.createElement("table");table.className="detail-items";
 (order.order_items||[]).forEach(item=>{const tr=document.createElement("tr");tr.append(safeText("td",item.item_name_snapshot+" × "+item.quantity),safeText("td",money(item.line_total_paise)));table.append(tr);});
 panel.append(table);
 const total=document.createElement("div");total.className="detail-total";total.append(safeText("span","Total"),safeText("strong",money(order.total_paise)));panel.append(total);
 if(order.customer_notes)panel.append(safeText("p","Instructions: "+order.customer_notes,"detail-notes"));
}
async function login(event){
 event.preventDefault();const form=event.currentTarget;const button=form.querySelector("button[type=submit]");
 $("staffLoginError").textContent="";button.disabled=true;button.textContent="Signing in…";
 const data=new FormData(form);
 try{
  const result=await callApi({action:"admin_login",username:String(data.get("username")),password:String(data.get("password"))});
  sessionToken=result.token;form.reset();$("staffLogin").hidden=true;$("staffDashboard").hidden=false;await loadOrders();
 }catch(error){$("staffLoginError").textContent=error.message;}
 finally{button.disabled=false;button.textContent="Open dashboard";}
}
function logout(){sessionToken="";selectedReference="";$("staffDashboard").hidden=true;$("staffLogin").hidden=false;$("ordersList").replaceChildren();$("orderDetails").replaceChildren();$("staffLoginForm").reset();}
$("staffLoginForm").addEventListener("submit",login);
$("refreshOrders").addEventListener("click",loadOrders);
$("staffLogout").addEventListener("click",logout);
