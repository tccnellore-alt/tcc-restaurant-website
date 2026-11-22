(()=> {
  const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
  const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
  const token=new URLSearchParams(location.search).get("tcc_qr");
  if(!token)return;
  const style=document.createElement("style");style.textContent=".tcc-call-staff{position:fixed;right:18px;bottom:22px;z-index:9000;border:0;border-radius:999px;padding:14px 20px;background:#173c2b;color:#fffaf0;font:800 14px Manrope,Arial,sans-serif;box-shadow:0 8px 24px #173c2b35;cursor:pointer}.tcc-call-staff:disabled{opacity:.7}.tcc-call-staff-note{position:fixed;right:18px;bottom:82px;z-index:9001;max-width:310px;padding:13px 16px;border-radius:12px;background:#fffaf0;color:#173c2b;border:1px solid #b79a5a;box-shadow:0 8px 24px #0002;font:600 13px/1.4 Manrope,Arial,sans-serif}";
  document.head.append(style);
  fetch(API+"?action=resolve-table-qr&token="+encodeURIComponent(token),{headers:{apikey:KEY,Authorization:"Bearer "+KEY}}).then(r=>r.ok?r.json():null).then(table=>{
    if(!table?.table_number)return;
    const button=document.createElement("button");button.className="tcc-call-staff";button.type="button";button.textContent="♧  Need Help Ordering? · Call Staff";
    button.addEventListener("click",async()=>{
      if(button.disabled)return;button.disabled=true;button.textContent="Sending request…";
      try{const response=await fetch(API+"?action=create-table-assistance",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({table_qr_token:token})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Please try again.");
        button.textContent="Request Sent";const note=document.createElement("div");note.className="tcc-call-staff-note";note.textContent="Our team has been notified and will come to your table shortly.";document.body.append(note);
      }catch(error){button.disabled=false;button.textContent="♧  Need Help Ordering? · Call Staff";alert(error.message);}
    });
    document.body.append(button);
  }).catch(()=>{});
})();