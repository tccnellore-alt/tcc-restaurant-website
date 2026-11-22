(function(){
 const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
 const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
 const token=new URLSearchParams(location.search).get("tcc_qr")?.trim();if(!token)return;
 let button=null,note=null,ready=false;
 const slot=document.querySelector(".menu-intro-actions");
 if(!slot)return;
 const showMessage=(message,error=false)=>{note.textContent=message;note.style.color=error?"#ffd6ce":"#e8efdf";note.style.display=message?"block":"none";};
 const sync=async()=>{try{const r=await fetch(API+"?action=table-assistance-status&token="+encodeURIComponent(token),{headers:{apikey:KEY,Authorization:"Bearer "+KEY},cache:"no-store"});if(!r.ok)return;const d=await r.json();if(d.request){button.disabled=true;button.textContent="✓ Staff Called";showMessage("Our team has been notified.");}}catch{}};
 const createButton=()=>{
  if(button)return;
  button=document.createElement("button");button.type="button";button.className="tcc-call-staff-action";button.textContent="♧ Call for Help";button.setAttribute("aria-label","Call staff to your table");
  note=document.createElement("span");note.className="tcc-call-staff-note";note.setAttribute("role","status");note.style.display="none";
  button.addEventListener("click",async()=>{
   if(button.disabled)return;button.disabled=true;button.textContent="Sending…";showMessage("");
   try{const r=await fetch(API+"?action=create-table-assistance",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({table_qr_token:token})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Unable to call staff. Please try again.");button.textContent="✓ Staff Called";showMessage("Our team has been notified. Please wait at your table.");}
   catch(e){button.disabled=false;button.textContent="♧ Call for Help";showMessage(e.message,true);}
  });
  slot.append(button,note);sync();
 };
 const attach=()=>{const banner=document.querySelector(".tcc-table-qr-banner");if(!banner)return;if(banner.textContent.includes("Ordering for Table")){ready=true;createButton();}else if(ready&&/invalid|disabled/i.test(banner.textContent)){button?.remove();note?.remove();button=null;note=null;}};
 const observer=new MutationObserver(attach);
 const init=()=>{observer.observe(document.body,{childList:true,subtree:true,characterData:true});attach();};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();