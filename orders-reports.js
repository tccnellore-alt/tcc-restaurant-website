"use strict";
const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
const PUBLIC_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
const TOKEN_KEY="tccOrderDeskSessionV1",token=localStorage.getItem(TOKEN_KEY)||"";
let customerDirectory=[],salesSummary={sales:0,orders:0,customers:0,products:[]};
const $=id=>document.getElementById(id);
const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const phone=c=>String(c.phone||c.customer_phone||c.mobile||"").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
async function request(action,params={}){
 const url=new URL(API);url.searchParams.set("action",action);Object.entries(params).forEach(([k,v])=>{if(v!==null&&v!==undefined&&v!=="")url.searchParams.set(k,String(v));});
 const res=await fetch(url,{headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY,"x-tcc-admin-session":token}});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Unable to load report data.");return data;
}
function periodParams(){
 const p=$("reportPeriod").value,today=key(new Date());let from=null,to=null;
 if(p==="today")from=today,to=today;
 else if(["7","30","90"].includes(p)){const d=new Date();d.setDate(d.getDate()-Number(p)+1);from=key(d);to=today;}
 else if(p==="custom"){from=$("reportFrom").value||null;to=$("reportTo").value||today;}
 return {from,to};
}
async function load(){
 const refresh=$("reportRefresh");refresh.disabled=true;refresh.textContent="Loading…";
 try{
  if(!token)throw new Error("Please sign in from the Order Desk first.");
  const data=await request("reports-dashboard",periodParams());
  customerDirectory=data.customers||[];salesSummary=data.sales||{sales:0,orders:0,customers:0,products:[]};
  $("reportError").textContent="";render();$("reportUpdated").textContent="Updated "+new Date().toLocaleString("en-IN");
 }catch(error){$("reportError").textContent=error.message||"Could not load reports.";if(/sign in|session|login/i.test(error.message||""))localStorage.removeItem(TOKEN_KEY);}
 finally{refresh.disabled=false;refresh.textContent="Refresh";}
}
async function loadSalesSummary(){
 const controls=$("reportPeriod");controls.disabled=true;
 try{const data=await request("report-sales-summary",periodParams());salesSummary=data||{sales:0,orders:0,customers:0,products:[]};$("reportError").textContent="";renderSales();$("reportUpdated").textContent="Updated "+new Date().toLocaleString("en-IN");}
 catch(error){$("reportError").textContent=error.message||"Could not load sales summary.";}
 finally{controls.disabled=false;}
}
function renderCustomers(){
 const q=$("customerSearch").value.trim().toLowerCase(),qPhone=q.replace(/\D/g,"");
 const customers=[...customerDirectory].sort((a,b)=>Number(b.spend||0)-Number(a.spend||0));
 const filtered=customers.filter(c=>String(c.name||"").toLowerCase().includes(q)||(qPhone&&phone(c).includes(qPhone)));
 $("customerRows").innerHTML=filtered.map(c=>'<tr><td><strong>'+esc(c.name||"Customer")+'</strong></td><td>'+esc(phone(c)||"—")+'</td><td class="numeric">'+Number(c.orders||0)+'</td><td class="numeric">'+money(c.spend)+'</td><td>'+esc(c.first_order?new Date(c.first_order).toLocaleDateString("en-IN"):"—")+'</td><td>'+esc(c.last_order?new Date(c.last_order).toLocaleDateString("en-IN"):"—")+'</td></tr>').join("")||'<tr><td class="empty-row" colspan="6">No matching customers.</td></tr>';
 $("customerSummary").textContent=customers.length+" recorded customers · "+Number(salesSummary.customers||0)+" customers ordered in this period";
}
function renderProducts(){
 const products=[...(salesSummary.products||[])].sort((a,b)=>Number(b.sales||0)-Number(a.sales||0)||Number(b.quantity||0)-Number(a.quantity||0));
 $("productRows").innerHTML=products.map(p=>'<tr><td><strong>'+esc(p.name||"Unnamed product")+'</strong></td><td class="numeric">'+Number(p.quantity||0).toLocaleString("en-IN")+'</td><td class="numeric">'+Number(p.orders||0).toLocaleString("en-IN")+'</td><td class="numeric">'+money(p.sales)+'</td><td class="numeric">'+money(Number(p.quantity||0)?Number(p.sales||0)/Number(p.quantity||0):0)+'</td></tr>').join("")||'<tr><td class="empty-row" colspan="5">No product sales in this period.</td></tr>';
}
function renderSales(){
 $("rSales").textContent=money(salesSummary.sales);$("rOrders").textContent=Number(salesSummary.orders||0).toLocaleString("en-IN");$("rCustomers").textContent=customerDirectory.length.toLocaleString("en-IN");
 renderProducts();renderCustomers();
}
function render(){renderSales();}
function csvDownload(filename,rows){
 const csv=rows.map(row=>row.map(value=>'"'+String(value??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
}
$("reportPeriod").addEventListener("change",()=>{const custom=$("reportPeriod").value==="custom";$("fromWrap").hidden=!custom;$("toWrap").hidden=!custom;loadSalesSummary();});
["reportFrom","reportTo"].forEach(id=>$(id).addEventListener("change",loadSalesSummary));
$("customerSearch").addEventListener("input",renderCustomers);
$("reportRefresh").addEventListener("click",load);
$("reportLogout").addEventListener("click",()=>{localStorage.removeItem(TOKEN_KEY);location.href="orders.html";});
$("exportCustomers").addEventListener("click",()=>csvDownload("TCC-customer-data.csv",[["Name","Mobile","Orders","Total spend","First order","Last order"],...customerDirectory.map(c=>[c.name,phone(c),c.orders,c.spend,c.first_order,c.last_order])]));
$("exportProducts").addEventListener("click",()=>csvDownload("TCC-product-wise-sales.csv",[["Product","Units sold","Orders","Sales","Average per unit"],...(salesSummary.products||[]).map(p=>[p.name,p.quantity,p.orders,p.sales,Number(p.quantity||0)?Number(p.sales||0)/Number(p.quantity||0):0])]));
load();