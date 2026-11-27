"use strict";
const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
const PUBLIC_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
const TOKEN_KEY="tccOrderDeskSessionV1",token=localStorage.getItem(TOKEN_KEY)||"";
let allOrders=[],customerDirectory=[];
const $=id=>document.getElementById(id);
const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const valid=o=>!["cancelled","rejected"].includes(String(o.status||"").toLowerCase());
const phone=c=>String(c.phone||c.customer_phone||c.mobile||"").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
async function request(action){const res=await fetch(API+"?action="+encodeURIComponent(action),{headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY,"x-tcc-admin-session":token}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Unable to load report data.");return data;}
async function load(){
 const refresh=$("reportRefresh");refresh.disabled=true;refresh.textContent="Loading…";
 try{
  if(!token)throw new Error("Please sign in from the Order Desk first.");
  const [ordersData,customerData]=await Promise.all([request("orders"),request("customer-directory")]);
  allOrders=ordersData.orders||[];customerDirectory=customerData.customers||[];
  $("reportUpdated").textContent="Updated "+new Date().toLocaleString("en-IN");
  $("reportError").textContent="";render();
 }catch(error){
  $("reportError").textContent=error.message||"Could not load reports.";
  if(/sign in|session|login/i.test(error.message||""))localStorage.removeItem(TOKEN_KEY);
 }finally{refresh.disabled=false;refresh.textContent="Refresh";}
}
function periodOrders(){
 const p=$("reportPeriod").value,now=new Date();let from=null,to=key(now);
 if(p==="today")from=to;
 else if(["7","30","90"].includes(p)){const d=new Date(now);d.setDate(d.getDate()-Number(p)+1);from=key(d);}
 else if(p==="custom"){from=$("reportFrom").value||null;to=$("reportTo").value||key(now);}
 return allOrders.filter(o=>{const d=key(new Date(o.created_at));return(!from||d>=from)&&(!to||d<=to);});
}
function itemSales(item){
 const quantity=Math.max(1,Number(item.quantity)||1);
 const addons=(item.addons||[]).reduce((sum,addon)=>sum+Number(addon.price||0),0);
 return quantity*(Number(item.unit_price||0)+addons);
}
function renderCustomers(){
 const q=$("customerSearch").value.trim().toLowerCase();
 const customers=[...customerDirectory].sort((a,b)=>Number(b.spend||0)-Number(a.spend||0));
 const filtered=customers.filter(c=>String(c.name||"").toLowerCase().includes(q)||phone(c).includes(q.replace(/\D/g,"")));
 $("customerRows").innerHTML=filtered.map(c=>'<tr><td><strong>'+esc(c.name||"Customer")+'</strong></td><td>'+esc(phone(c)||"—")+'</td><td class="numeric">'+Number(c.orders||0)+'</td><td class="numeric">'+money(c.spend)+'</td><td>'+esc(c.first_order?new Date(c.first_order).toLocaleDateString("en-IN"):"—")+'</td><td>'+esc(c.last_order?new Date(c.last_order).toLocaleDateString("en-IN"):"—")+'</td></tr>').join("")||'<tr><td class="empty-row" colspan="6">No matching customers.</td></tr>';
 $("customerSummary").textContent=customers.length+" recorded customers · "+filtered.length+" shown";
}
function renderProducts(rows){
 const products=new Map();
 rows.filter(valid).forEach(order=>(order.items||[]).forEach(item=>{
  if(String(item.item_status||"").toLowerCase()==="cancelled")return;
  const name=String(item.name||"Unnamed product"),quantity=Math.max(1,Number(item.quantity)||1);
  const entry=products.get(name)||{name,quantity:0,sales:0,orders:new Set()};
  entry.quantity+=quantity;entry.sales+=itemSales(item);entry.orders.add(order.id||order.order_number||order.created_at);products.set(name,entry);
 }));
 const list=[...products.values()].sort((a,b)=>b.sales-a.sales||b.quantity-a.quantity||a.name.localeCompare(b.name));
 $("productRows").innerHTML=list.map(p=>'<tr><td><strong>'+esc(p.name)+'</strong></td><td class="numeric">'+p.quantity+'</td><td class="numeric">'+p.orders.size+'</td><td class="numeric">'+money(p.sales)+'</td><td class="numeric">'+money(p.quantity?p.sales/p.quantity:0)+'</td></tr>').join("")||'<tr><td class="empty-row" colspan="5">No product sales in this period.</td></tr>';
 window.tccProductSalesForExport=list.map(p=>[p.name,p.quantity,p.orders.size,p.sales,p.quantity?p.sales/p.quantity:0]);
}
function render(){
 const rows=periodOrders(),validRows=rows.filter(valid),sales=validRows.reduce((sum,o)=>sum+Number(o.total||0),0);
 const periodPhones=new Set(validRows.map(o=>String(o.customer_phone||"").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"")).filter(p=>/^\d{10}$/.test(p)));
 $("rSales").textContent=money(sales);$("rOrders").textContent=validRows.length;$("rCustomers").textContent=customerDirectory.length;
 $("customerSummary").textContent=customerDirectory.length+" recorded customers · "+periodPhones.size+" customers ordered in this period";
 renderCustomers();renderProducts(rows);
}
function csvDownload(filename,rows){
 const csv=rows.map(row=>row.map(value=>'"'+String(value??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("reportPeriod").addEventListener("change",()=>{const custom=$("reportPeriod").value==="custom";$("fromWrap").hidden=!custom;$("toWrap").hidden=!custom;render();});
["reportFrom","reportTo"].forEach(id=>$(id).addEventListener("change",render));
$("customerSearch").addEventListener("input",renderCustomers);
$("reportRefresh").addEventListener("click",load);
$("reportLogout").addEventListener("click",()=>{localStorage.removeItem(TOKEN_KEY);location.href="orders.html";});
$("exportCustomers").addEventListener("click",()=>csvDownload("TCC-customer-data.csv",[["Name","Mobile","Orders","Total spend","First order","Last order"],...customerDirectory.map(c=>[c.name,phone(c),c.orders,c.spend,c.first_order,c.last_order])]));
$("exportProducts").addEventListener("click",()=>csvDownload("TCC-product-wise-sales.csv",[["Product","Units sold","Orders","Sales","Average per unit"],...(window.tccProductSalesForExport||[])]));
load();