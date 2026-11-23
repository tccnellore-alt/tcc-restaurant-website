(function(){
 const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
 const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
 const token=new URLSearchParams(location.search).get("tcc_qr")?.trim();if(!token)return;
 const slot=document.querySelector(".menu-intro-actions");if(!slot)return;
 const style=document.createElement("style");style.textContent=`
 .menu-intro-actions{display:block!important;margin:18px 0 0!important;width:100%!important}
 .tcc-table-actions{padding:13px;border:1px solid rgba(237,221,181,.25);border-radius:16px;background:rgba(255,255,255,.07)}
 .tcc-table-actions-heading{margin:0 0 10px;color:#e8dfc9;font:800 9px/1.2 Manrope,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase}
 .tcc-table-actions-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 .tcc-table-action{display:flex;min-height:54px;align-items:center;justify-content:center;gap:8px;padding:11px 10px;border:1px solid rgba(237,221,181,.3);border-radius:12px;background:#fffaf0;color:#173c2b;font:800 13px/1.2 Manrope,Arial,sans-serif;cursor:pointer;box-shadow:0 5px 16px #071d1330}
 .tcc-table-action span{font-size:17px}
 .tcc-table-action.bill{background:#e8dfc9}
 .tcc-table-action:disabled{opacity:.78;cursor:default}
 .tcc-table-action-note{display:none;margin:9px 2px 0;color:#e8efdf;font:600 11px/1.4 Manrope,Arial,sans-serif}
 @media(max-width:360px){.tcc-table-actions-grid{gap:7px}.tcc-table-action{font-size:11px;padding:10px 6px}}
 `;document.head.append(style);
 const actions=document.createElement("section");actions.className="tcc-table-actions";actions.setAttribute("aria-label","Table assistance");
 actions.innerHTML='<p class="tcc-table-actions-heading">Need anything else?</p><div class="tcc-table-actions-grid"><button type="button" class="tcc-table-action staff"><span aria-hidden="true">♧</span>Call Staff</button><button type="button" class="tcc-table-action bill"><span aria-hidden="true">▤</span>Request Bill</button></div><p class="tcc-table-action-note" role="status"></p>';
 slot.replaceChildren(actions);
 const note=actions.querySelector(".tcc-table-action-note");
 const buttons={staff:actions.querySelector(".staff"),bill:actions.querySelector(".bill")};
 const labels={staff:"Call Staff",bill:"Request Bill"};
 const show=(msg,error=false)=>{note.textContent=msg;note.style.display=msg?"block":"none";note.style.color=error?"#ffd6ce":"#e8efdf";};
 async function sync(){try{const r=await fetch(API+"?action=table-assistance-status&token="+encodeURIComponent(token),{headers:{apikey:KEY,Authorization:"Bearer "+KEY},cache:"no-store"});if(!r.ok)return;const d=await r.json();(d.requests||[]).forEach(item=>{const type=item.request_type==="bill"?"bill":"staff";const b=buttons[type];b.disabled=true;b.innerHTML='<span aria-hidden="true">✓</span>'+(type==="bill"?"Bill Requested":"Staff Called");});}catch{}}
 async function send(type){const b=buttons[type];if(b.disabled)return;b.disabled=true;b.textContent="Sending…";show("");
  try{const r=await fetch(API+"?action=create-table-assistance",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({table_qr_token:token,request_type:type})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Unable to send request. Please try again.");b.innerHTML='<span aria-hidden="true">✓</span>'+(type==="bill"?"Bill Requested":"Staff Called");show(type==="bill"?"Your bill request has been sent. Our team will assist you shortly.":"Our team has been notified and will come to your table.");}
  catch(e){b.disabled=false;b.innerHTML='<span aria-hidden="true">'+(type==="bill"?"▤":"♧")+'</span>'+labels[type];show(e.message,true);}
 }
 buttons.staff.addEventListener("click",()=>send("staff"));buttons.bill.addEventListener("click",()=>send("bill"));
 const attach=()=>{const banner=document.querySelector(".tcc-table-qr-banner");const valid=banner&&banner.textContent.includes("Ordering for Table");actions.hidden=!valid;if(valid)sync();};
 const observer=new MutationObserver(attach);observer.observe(document.body,{childList:true,subtree:true,characterData:true});attach();
})();