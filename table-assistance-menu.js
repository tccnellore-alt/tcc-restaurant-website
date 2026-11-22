(function(){
 const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
 const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
 const token=new URLSearchParams(location.search).get("tcc_qr")?.trim();if(!token)return;
 const start=()=>{const banner=document.querySelector(".tcc-table-qr-banner");if(!banner)return;
 const button=document.createElement("button");button.type="button";button.textContent="♧  Call Staff";button.setAttribute("aria-label","Call staff to your table");
 button.style.cssText="display:block;width:100%;margin-top:10px;padding:13px 16px;border:0;border-radius:10px;background:#173c2b;color:#fffaf0;font:800 14px Arial,sans-serif;cursor:pointer";
 const note=document.createElement("p");note.setAttribute("role","status");note.style.cssText="margin:7px 0 0;font:600 12px/1.4 Arial,sans-serif;color:#365442";
 const send=async()=>{button.disabled=true;button.textContent="Sending request…";note.textContent="";
 try{const response=await fetch(API+"?action=create-table-assistance",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({table_qr_token:token})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Unable to call staff. Please try again.");button.textContent="✓ Staff Called";note.textContent="Our team has been notified. Please wait at your table.";note.style.color="#28764b";
 }catch(error){button.disabled=false;button.textContent="♧  Call Staff";note.textContent=error.message;note.style.color="#a12b20";}};
 button.addEventListener("click",send);
 const sync=async()=>{try{const response=await fetch(API+"?action=table-assistance-status&token="+encodeURIComponent(token),{headers:{apikey:KEY,Authorization:"Bearer "+KEY},cache:"no-store"});if(!response.ok)return;const data=await response.json();if(data.request){button.disabled=true;button.textContent="✓ Staff Called";note.textContent="Your request is with our team. Please wait at your table.";}}catch{}};
 const observer=new MutationObserver(()=>{if(banner.textContent.includes("Ordering for Table")&&!button.isConnected){banner.append(button,note);sync();}});observer.observe(banner,{childList:true,subtree:true,characterData:true});if(banner.textContent.includes("Ordering for Table")){banner.append(button,note);sync();}
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();