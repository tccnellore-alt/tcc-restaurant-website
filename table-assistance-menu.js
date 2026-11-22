(function(){
 const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
 const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
 const token=new URLSearchParams(location.search).get("tcc_qr")?.trim();if(!token)return;
 let ready=false,button=null,note=null;
 const nav=document.querySelector(".mobile-bar");
 const callLink=nav?.querySelector('a[href^="tel:"]');
 if(!nav||!callLink)return;
 const sync=async()=>{try{const r=await fetch(API+"?action=table-assistance-status&token="+encodeURIComponent(token),{headers:{apikey:KEY,Authorization:"Bearer "+KEY},cache:"no-store"});if(!r.ok)return;const d=await r.json();if(d.request){button.disabled=true;button.textContent="✓ Staff Called";note.textContent="Staff have been notified. Please wait at your table.";}}catch{}};
 const createButton=()=>{
  if(button)return;
  button=document.createElement("button");button.type="button";button.className="tcc-call-staff-action";button.textContent="♧ Call for Help";button.setAttribute("aria-label","Call staff to your table");
  button.style.cssText="display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;min-height:46px!important;padding:7px 1px!important;border:0!important;border-radius:12px!important;background:rgba(255,255,255,.12)!important;color:#fff!important;font:800 9px/1.15 Arial,sans-serif!important;white-space:normal!important;cursor:pointer!important";
  note=document.createElement("span");note.setAttribute("role","status");note.style.cssText="position:absolute;left:50%;bottom:calc(100% + 12px);transform:translateX(-50%);width:max-content;max-width:90vw;padding:8px 12px;border-radius:9px;background:#173c2b;color:#fff;font:600 12px Arial,sans-serif;box-shadow:0 3px 14px #0003;display:none";
  button.addEventListener("click",async()=>{
   if(button.disabled)return;button.disabled=true;button.textContent="Sending…";note.textContent="";note.style.display="none";
   try{const r=await fetch(API+"?action=create-table-assistance",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({table_qr_token:token})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Unable to call staff. Please try again.");button.textContent="✓ Staff Called";note.textContent="Our team has been notified. Please wait at your table.";note.style.display="block";note.style.background="#173c2b";}
   catch(e){button.disabled=false;button.textContent="♧ Call for Help";note.textContent=e.message;note.style.display="block";note.style.background="#8b2922";}
  });
  callLink.replaceWith(button);nav.style.position="relative";nav.append(note);sync();
 };
 const attach=()=>{const banner=document.querySelector(".tcc-table-qr-banner");if(!banner)return;if(banner.textContent.includes("Ordering for Table")){ready=true;createButton();}else if(ready&&banner.textContent.includes("invalid")){button?.remove();note?.remove();button=null;callLink.hidden=false;}};
 const observer=new MutationObserver(attach);
 const init=()=>{observer.observe(document.body,{childList:true,subtree:true,characterData:true});attach();};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();