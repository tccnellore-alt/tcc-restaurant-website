const body=document.body,toggle=document.querySelector('[data-toggle]'),close=document.querySelector('[data-close]'),overlay=document.querySelector('[data-overlay]');function setOpen(v){body.classList.toggle('open',v);toggle?.setAttribute('aria-expanded',v)}toggle?.addEventListener('click',()=>setOpen(!body.classList.contains('open')));close?.addEventListener('click',()=>setOpen(false));overlay?.addEventListener('click',()=>setOpen(false));document.querySelectorAll('.drawer a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});

/* TCC Customer Wishlist — menu-page only */
(function(){
  if(!document.querySelector('.menu-page')) return;
  const STORAGE_KEY='tccCustomerWishlistV1';
  const HISTORY_KEY='tccCustomerOrderHistoryV1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}};
  const readHistory=()=>{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return []}};
  const saveHistory=history=>{try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,50)))}catch{}};
  let items=read().map(item=>({...item,qty:Math.max(1,Number(item.qty)||1)}));
  const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}catch{}};
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  const clean=s=>(s||'').replace(/\s+/g,' ').trim();
  const getData=card=>{
    const heading=card.querySelector('h3');
    const cleanHeading=heading?.cloneNode(true);
    cleanHeading?.querySelectorAll('.tcc-bestseller-badge,.tcc-new-arrival-badge,.food-badge,.availability-status,[class*="bestseller"],[class*="best-seller"]').forEach(el=>el.remove());
    const name=clean(cleanHeading?.textContent || heading?.textContent);
    const priceText=clean(card.querySelector(':scope > strong')?.textContent);
    const price=Number((priceText.match(/[\d,]+/)||['0'])[0].replace(/,/g,''));
    const category=clean(card.closest('.menu-group')?.getAttribute('data-group')||'Menu');
    const section=clean(card.closest('.menu-section')?.querySelector('h2')?.textContent||'');
    return {name,price,category,section,key:(category+'|'+name).toLowerCase()};
  };
  const addonOptions=card=>{
    const data=getData(card),section=data.section.toLowerCase(),group=card.closest('.menu-group');
    let source=[];
    if(group?.id==='coffee'&&typeof tccCoffeeAddonsByDrink!=='undefined'&&tccCoffeeAddonsByDrink[data.name]){
      const price=typeof tccCoffeeAddonPrice!=='undefined'?Number(String(tccCoffeeAddonPrice).replace(/[^\d.]/g,''))||50:50;
      source=tccCoffeeAddonsByDrink[data.name].map(name=>({name,price}));
    }else if(section.includes('pasta')){
      source=[...document.querySelectorAll('.pasta-addon-inline[aria-label="Pasta add-ons"] .addons-row>span')].map(el=>({name:clean(el.firstChild?.textContent||el.textContent),price:Number((el.querySelector('b')?.textContent.match(/[\d,]+/)||['0'])[0].replace(/,/g,''))}));
    }else if(section.includes('pizza')){
      const panel=card.closest('.menu-section')?.querySelector('.pizza-addon-inline');
      source=[...(panel?.querySelectorAll('.addons-row>span')||[])].map(el=>({name:clean(el.firstChild?.textContent||el.textContent),price:Number((el.querySelector('b')?.textContent.match(/[\d,]+/)||['0'])[0].replace(/,/g,''))}));
    }
    return source.filter(x=>x.name);
  };
  const style=document.createElement('style');
  style.textContent=`
    .menu-page .m-item .tcc-wish-add{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:0!important;min-height:38px!important;margin:0!important;padding:0 16px!important;border:1px solid rgba(23,60,43,.18)!important;border-radius:999px!important;background:#f5f0e5!important;color:#365442!important;box-shadow:none!important;font:700 12px/1 Arial,sans-serif!important;cursor:pointer!important;white-space:nowrap!important}
    .menu-page .m-item .tcc-wish-add.is-added{background:#173c2b!important;color:#fffaf0!important;border-color:#173c2b!important;min-width:0!important;padding-left:12px!important;padding-right:12px!important}
    .tcc-menu-qty{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;width:max-content!important;min-height:44px!important;margin:10px 12px 12px!important;padding:4px 8px!important;border:1px solid rgba(23,60,43,.18)!important;border-radius:999px!important;background:#f5f0e5!important;color:#173c2b!important;box-sizing:border-box!important}
    .tcc-menu-qty button{width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#173c2b!important;color:#fffaf0!important;font:700 18px Arial,sans-serif!important;cursor:pointer!important}
    .tcc-menu-qty button[hidden],.tcc-menu-qty span[hidden],.tcc-menu-qty [hidden]{display:none!important}
    .tcc-menu-qty .tcc-wish-add[hidden]{display:none!important}
    .tcc-menu-qty span{min-width:18px;text-align:center;font:800 14px Arial,sans-serif}
    .tcc-menu-qty[hidden]{display:none!important}
    .tcc-menu-qty:has(.tcc-wish-add:not([hidden])){min-height:0!important;margin:10px 12px 12px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;}
    .tcc-menu-qty:has(.tcc-wish-add:not([hidden])) .tcc-wish-add{min-height:48px!important;padding:0 22px!important;border:0!important;border-radius:999px!important;background:#173c2b!important;color:#fffaf0!important;font-weight:800!important;box-shadow:0 5px 14px rgba(23,60,43,.16)!important;}
    body.menu-text-mode .menu-page .m-item .tcc-wish-title-row{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;gap:7px!important;min-width:0!important;width:100%!important}
    body.menu-text-mode .menu-page .m-item .tcc-wish-title-row h3{display:inline!important;flex:0 1 auto!important;min-width:0!important;margin:0!important}
    body.menu-text-mode .menu-page .m-item .tcc-wish-title-row .tcc-wish-add{display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:100%!important;vertical-align:middle!important;white-space:nowrap!important;min-height:28px!important;margin:0!important;padding:0 10px!important;font-size:10px!important;line-height:1!important}
    .tcc-wish-choice{position:fixed;inset:0;z-index:12000;display:none;align-items:flex-end;justify-content:center;padding:0;background:rgba(7,22,15,.62);backdrop-filter:blur(3px)}
    .tcc-wish-choice.is-open{display:flex}
    .tcc-wish-choice-panel{position:relative;display:flex;flex-direction:column;width:min(100%,560px);max-height:min(88dvh,820px);overflow:hidden;padding:0;border-radius:24px 24px 0 0;background:#fffaf0;color:#173c2b;box-shadow:0 -12px 50px rgba(0,0,0,.22);animation:tccChoiceUp .22s ease-out}
    @keyframes tccChoiceUp{from{transform:translateY(24px);opacity:.7}to{transform:translateY(0);opacity:1}}
    .tcc-wish-choice-header{display:flex;align-items:center;gap:12px;padding:17px 20px 14px;border-bottom:1px solid rgba(23,60,43,.1)}
    .tcc-wish-choice-thumb{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;overflow:hidden;border-radius:12px;background:#eee8d9;color:#173c2b;font-size:20px}
    .tcc-wish-choice-thumb img{width:100%;height:100%;object-fit:cover}
    .tcc-wish-choice-heading{min-width:0}.tcc-wish-choice-panel h3{margin:0 0 4px;font:700 19px Georgia,serif;color:#173c2b}
    .tcc-wish-choice-panel p{margin:0;color:#6d776e;font:12px Arial,sans-serif}
    .tcc-wish-choice-body{overflow:auto;overscroll-behavior:contain;padding:16px 20px 18px}
    .tcc-wish-choice-section-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 9px;font:700 13px Arial,sans-serif;color:#173c2b}
    .tcc-wish-choice-section-title small{color:#788075;font-weight:400}
    .tcc-wish-addon-options{display:grid;gap:7px;margin:0}
    .tcc-wish-addon-options label{display:flex;align-items:center;gap:11px;min-height:48px;padding:10px 12px;border:1px solid rgba(23,60,43,.13);border-radius:12px;background:#fff;font:13px Arial,sans-serif;color:#30483b}
    .tcc-wish-addon-options label:has(input:checked){border-color:#173c2b;background:#f0f4ed}
    .tcc-wish-addon-options input{width:18px;height:18px;flex:0 0 18px;accent-color:#173c2b}
    .tcc-wish-addon-options .tcc-addon-price{margin-left:auto;white-space:nowrap;color:#8d7337;font-weight:700}
    .tcc-remove-option{display:grid;grid-template-columns:1fr auto;gap:4px 10px;width:100%;text-align:left;padding:12px;border:1px solid rgba(23,60,43,.16);border-radius:12px;background:#fff;color:#173c2b}.tcc-remove-option span{font-weight:700}.tcc-remove-option strong{grid-column:2;grid-row:1;font-size:12px}.tcc-remove-option small{grid-column:1/-1;color:#8d7337;font-size:11px}
    .tcc-wish-choice-footer{display:flex;align-items:center;gap:12px;padding:12px 18px calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(23,60,43,.12);background:#fffaf0}
    .tcc-choice-qty{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 132px;padding:5px;border:1px solid rgba(23,60,43,.2);border-radius:12px;background:#fff}
    .tcc-choice-qty button{width:32px;height:32px;border:0;border-radius:8px;background:#f0f4ed;color:#173c2b;font-size:19px;font-weight:700}
    .tcc-choice-qty strong{font-size:14px}
    .tcc-wish-choice-actions{display:flex;flex:1;gap:8px;margin:0}
    .tcc-wish-choice-actions button{flex:1;min-height:44px;border:1px solid #173c2b;border-radius:11px;background:#173c2b;color:#fffaf0;font:700 12px Arial,sans-serif}
    .tcc-wish-choice-actions .secondary{display:none;background:transparent;color:#173c2b}
    @media(min-width:700px){.tcc-wish-choice{align-items:center;padding:18px}.tcc-wish-choice-panel{border-radius:22px;max-height:85dvh}.tcc-wish-choice-footer{padding-bottom:14px}}
    .tcc-wish-note-toggle{display:inline-flex;align-items:center;margin-top:7px;padding:4px 0;border:0;background:transparent;color:#8d7337;font:700 11px Arial,sans-serif;cursor:pointer}
    .tcc-wish-item-note{width:100%;min-height:48px;box-sizing:border-box;margin-top:7px;padding:8px;border:1px solid rgba(23,60,43,.16);border-radius:8px;background:#fff;color:#173c2b;font:12px Arial,sans-serif;resize:vertical}
    .tcc-wish-item-note[hidden]{display:none!important}
    .tcc-wish-float{position:fixed;right:16px;bottom:calc(108px + env(safe-area-inset-bottom));z-index:2100;display:flex;align-items:center;gap:9px;min-height:48px;padding:0 17px;border:1px solid #d6bd82;border-radius:999px;background:#173c2b;color:#fffaf0;box-shadow:0 8px 24px rgba(0,0,0,.22);font:800 12px Arial,sans-serif;cursor:pointer}
    .tcc-wish-float .tcc-wish-count{display:grid;place-items:center;min-width:21px;height:21px;padding:0 5px;border-radius:50%;background:#f2dfb0;color:#173c2b;font-size:10px}
    @media(max-width:480px){.tcc-wish-float{right:12px;bottom:calc(108px + env(safe-area-inset-bottom))}}
    .tcc-wish-count{display:grid;place-items:center;min-width:21px;height:21px;padding:0 5px;border-radius:50%;background:#f2dfb0;color:#173c2b;font-size:10px}
    .tcc-wish-backdrop{position:fixed;inset:0;z-index:10000;display:none;align-items:flex-end;justify-content:center;padding:16px;background:rgba(7,22,15,.62);backdrop-filter:blur(4px)}
    .tcc-wish-backdrop.is-open{display:flex}
    .tcc-wish-panel{width:min(100%,560px);max-height:min(82dvh,760px);overflow:auto;border:1px solid rgba(183,154,90,.55);border-radius:22px;background:#fffaf0;color:#173c2b;box-shadow:0 20px 70px rgba(0,0,0,.3);padding:20px}
    .tcc-wish-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .tcc-wish-head h2{margin:0;font:600 27px Georgia,serif;color:#173c2b}
    .tcc-wish-close{width:36px;height:36px;border:1px solid rgba(23,60,43,.16);border-radius:50%;background:transparent;color:#173c2b;font-size:23px;cursor:pointer}
    .tcc-wish-table-field{display:grid;gap:6px;margin:14px 0 12px;padding:12px;border:1px solid rgba(23,60,43,.14);border-radius:12px;background:#fff}
    .tcc-wish-table-field label{color:#173c2b;font:700 12px Arial,sans-serif}
    .tcc-wish-customer-field{margin:0 0 10px;padding:10px 12px}.tcc-wish-customer-field label small{color:#788075;font-weight:400}.tcc-wish-customer-field input{ text-transform:none!important}
    .tcc-wish-table-field label span{color:#b33b32}
    .tcc-wish-table-field input{width:100%;box-sizing:border-box;min-height:42px;padding:9px 11px;border:1px solid rgba(23,60,43,.22);border-radius:8px;background:#fffaf0;color:#173c2b;font:600 14px Arial,sans-serif;text-transform:uppercase;outline:none}
    .tcc-wish-table-field input:focus{border-color:#8d7337;box-shadow:0 0 0 2px rgba(141,115,55,.12)}
    .tcc-wish-table-field small{min-height:0;color:#b33b32;font:11px Arial,sans-serif}
    .tcc-wish-empty{padding:34px 10px;text-align:center;color:#68756c;font:13px/1.5 Arial,sans-serif}
    .tcc-wish-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(23,60,43,.12)}
    .tcc-wish-row>div:first-child{min-width:0}.tcc-wish-row>div:first-child strong{display:block;font-size:13px;line-height:1.3}.tcc-wish-row>div:first-child small{display:block;margin-top:3px;font-size:10px;line-height:1.3}
    .tcc-wish-row-price{justify-content:flex-end!important;gap:7px!important;white-space:nowrap!important}.tcc-wish-qty{gap:5px!important}.tcc-wish-qty button{width:27px!important;height:27px!important}.tcc-wish-remove{font-size:10px!important;padding:4px!important}
    .tcc-wish-row strong{display:block;font:700 14px/1.35 Arial,sans-serif;color:#173c2b}
    .tcc-wish-row small{display:block;margin-top:4px;color:#7b806f;font:11px Arial,sans-serif}
    .tcc-wish-row-price{display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:9px;color:#173c2b;font:700 12px Arial,sans-serif}.tcc-wish-qty{display:flex;align-items:center;gap:8px;color:#173c2b}.tcc-wish-qty button{width:30px;height:30px;border:1px solid rgba(23,60,43,.2);border-radius:50%;background:#fff;color:#173c2b;font:700 16px Arial,sans-serif;cursor:pointer}
    .tcc-wish-remove{border:0;background:transparent;color:#a33e34;font:700 11px Arial,sans-serif;cursor:pointer;padding:5px}
    .tcc-wish-total{display:none!important}
    .tcc-total-lines{display:grid;grid-template-columns:1fr auto;gap:8px;font:12px Arial,sans-serif}.tcc-total-lines strong{text-align:right}.tcc-total-lines .tcc-grand-label,.tcc-total-lines .tcc-grand-total{margin-top:5px;padding-top:10px;border-top:1px solid rgba(23,60,43,.15);font-weight:800;color:#173c2b}
    .tcc-wish-total strong{font-size:18px;color:#8d7337}
    .tcc-wish-actions{display:grid;grid-template-columns:1fr;gap:9px}
    .tcc-wish-secondary-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .tcc-wish-actions button{min-height:46px;border:1px solid #173c2b;border-radius:12px;background:#173c2b;color:#fffaf0;font:800 11px Arial,sans-serif;cursor:pointer}
    .tcc-wish-actions button.secondary{background:transparent;color:#173c2b}
    .tcc-wish-continue{width:100%;min-height:44px;border:1px solid rgba(23,60,43,.2);border-radius:11px;background:transparent;color:#173c2b;font:700 12px Arial,sans-serif;cursor:pointer}
    .tcc-order-type{display:flex;gap:8px;margin:12px 0}
    .tcc-order-type button,.tcc-table-options button{flex:1;min-height:38px;border:1px solid rgba(23,60,43,.2);border-radius:9px;background:#fff;color:#173c2b;font:700 12px Arial,sans-serif}
    .tcc-order-type button.active,.tcc-table-options button.active{background:#173c2b;color:#fffaf0;border-color:#173c2b}
    .tcc-table-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}
    .tcc-table-options button{min-height:38px}
    .tcc-table-options[hidden]{display:none!important}
    .tcc-wish-hint{margin:12px 0 0;color:#788075;font:11px/1.45 Arial,sans-serif;text-align:center}
    .tcc-wish-head-actions{display:flex;align-items:center;gap:8px}.tcc-order-history-open{min-height:36px;padding:0 11px;border:1px solid rgba(23,60,43,.2);border-radius:999px;background:#f0f4ed;color:#173c2b;font:700 11px Arial,sans-serif}.tcc-order-history-backdrop{position:fixed;inset:0;z-index:10020;display:none;align-items:flex-end;justify-content:center;padding:14px;background:rgba(7,22,15,.65);backdrop-filter:blur(4px)}.tcc-order-history-backdrop.is-open{display:flex}.tcc-order-history-panel{width:min(100%,560px);max-height:82dvh;overflow:auto;padding:18px;border-radius:20px;background:#fffaf0;color:#173c2b}.tcc-order-lookup{margin:8px 0 16px;padding:13px;border:1px solid rgba(23,60,43,.15);border-radius:13px;background:#f5f2e9}.tcc-order-lookup label{display:block;margin-bottom:8px;font:700 12px Arial,sans-serif}.tcc-order-lookup>div:first-of-type{display:flex;gap:7px}.tcc-order-lookup input{min-width:0;flex:1;height:42px;padding:0 10px;border:1px solid rgba(23,60,43,.2);border-radius:9px;background:#fff;font:13px Arial,sans-serif}.tcc-order-lookup-button{padding:0 15px;border:0;border-radius:9px;background:#173c2b;color:#fffaf0;font-weight:700}.tcc-order-lookup small{display:block;margin-top:7px;color:#788075;font:11px/1.4 Arial,sans-serif}.tcc-order-lookup-message{margin:7px 0 0;color:#a33e34;font:12px Arial,sans-serif}.tcc-order-lookup-results:empty{display:none}.tcc-order-lookup-result{padding:10px 0;border-top:1px solid rgba(23,60,43,.12);font:12px/1.5 Arial,sans-serif}.tcc-order-lookup-result strong{display:block;font-size:13px}.tcc-order-history-subtitle{margin:14px 0 4px;font:700 14px Arial,sans-serif;color:#173c2b}.tcc-order-history-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.tcc-order-history-panel h2{margin:0;font:600 24px Georgia,serif}.tcc-order-history-close{width:36px;height:36px;border:1px solid rgba(23,60,43,.2);border-radius:50%;background:transparent;color:#173c2b;font-size:22px}.tcc-order-history-card{padding:13px 0;border-bottom:1px solid rgba(23,60,43,.12)}.tcc-order-history-card-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.tcc-order-history-card small{display:block;margin:5px 0;color:#788075;font-size:11px}.tcc-order-history-status{font-size:11px;font-weight:700;color:#8d7337}.tcc-order-history-items{font-size:12px;line-height:1.55}.tcc-order-history-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.tcc-order-history-view,.tcc-order-history-resend{min-height:34px;padding:0 12px;border:1px solid rgba(23,60,43,.2);border-radius:999px;background:#f0f4ed;color:#173c2b;font:700 11px Arial,sans-serif}.tcc-order-history-resend{background:#173c2b;border-color:#173c2b;color:#fffaf0}.tcc-order-history-detail{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f4f1e8}.tcc-order-history-detail[hidden]{display:none!important}.tcc-order-history-detail p{margin:0 0 8px;font:12px Arial,sans-serif}.tcc-order-history-line{padding:7px 0;border-bottom:1px solid rgba(23,60,43,.1)}.tcc-order-history-line:last-child{border-bottom:0}.tcc-order-history-line strong,.tcc-order-history-line small{display:block;font:12px/1.45 Arial,sans-serif}.tcc-order-history-line small{margin-top:3px;color:#788075}.tcc-order-history-new{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:999px;background:#173c2b;color:#fffaf0;font-weight:700}.tcc-order-send-notice{position:fixed;left:14px;right:14px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:2147483000;padding:14px 16px;border-radius:14px;background:#173c2b;color:#fffaf0;box-shadow:0 8px 28px rgba(0,0,0,.22);font:600 13px/1.45 Arial,sans-serif;text-align:center}
    @media(max-width:480px){.tcc-wish-float{right:12px;bottom:calc(82px + env(safe-area-inset-bottom))}.tcc-wish-panel{padding:17px;border-radius:20px 20px 16px 16px}.tcc-wish-actions{grid-template-columns:1fr}.tcc-wish-secondary-actions{grid-template-columns:1fr 1fr}.tcc-wish-actions button{font-size:10px;min-height:44px}.tcc-wish-panel{max-height:88dvh}}
    @media(prefers-reduced-motion:reduce){.tcc-wish-backdrop{backdrop-filter:none}}
  `;
  document.head.appendChild(style);
  const float=document.createElement('button');
  float.type='button';float.className='tcc-wish-float';float.innerHTML='<svg class="tcc-cart-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"></path></svg><span>Cart</span><span class="tcc-wish-count">0</span>';
  float.setAttribute('aria-label','Open cart');
  const backdrop=document.createElement('div');backdrop.className='tcc-wish-backdrop';backdrop.setAttribute('aria-hidden','true');
  backdrop.innerHTML='<section class="tcc-wish-panel" role="dialog" aria-modal="true" aria-labelledby="tccWishTitle"><div class="tcc-wish-head"><h2 id="tccWishTitle">Your Cart</h2><div class="tcc-wish-head-actions"><button type="button" class="tcc-order-history-open">Order History</button><button type="button" class="tcc-wish-close" aria-label="Close cart">×</button></div></div><div class="tcc-wish-list"></div><div class="tcc-wish-table-field tcc-wish-customer-field"><label for="tccCustomerName">Customer name <small>(Optional)</small></label><input id="tccCustomerName" type="text" maxlength="60" placeholder="Enter your name (optional)" autocomplete="name" /><label for="tccCustomerPhone">Mobile number <span>*</span></label><input id="tccCustomerPhone" type="tel" maxlength="15" inputmode="numeric" placeholder="Enter 10-digit mobile number" autocomplete="tel" required /></div><div class="tcc-wish-table-field"><label>Order type <span>*</span></label><div class="tcc-order-type"><button type="button" data-order-type="dine-in" class="active">Dine-in</button><button type="button" data-order-type="takeaway">Takeaway</button></div><label class="tcc-table-label">Select table <span>*</span></label><div class="tcc-table-options"><button type="button" data-table="S1">S1</button><button type="button" data-table="S2">S2</button><button type="button" data-table="S3">S3</button><button type="button" data-table="S4">S4</button><button type="button" data-table="S5">S5</button><button type="button" data-table="S6">S6</button><button type="button" data-table="C1">C1</button><button type="button" data-table="C2">C2</button><button type="button" data-table="C3">C3</button><button type="button" data-table="C4">C4</button><button type="button" data-table="P1">P1</button><button type="button" data-table="P2">P2</button><button type="button" data-table="P3">P3</button><button type="button" data-table="T1">T1</button><button type="button" data-table="T2">T2</button></div><small class="tcc-wish-table-error" role="alert"></small></div><div class="tcc-wish-total"><span>Order subtotal</span><strong>₹0</strong></div><div class="tcc-wish-actions"><button type="button" class="tcc-wish-send">Place Order</button><div class="tcc-wish-secondary-actions"><button type="button" class="tcc-wish-clear secondary">Clear Cart</button><button type="button" class="tcc-wish-continue">Continue browsing</button></div></div><p class="tcc-wish-hint">Your order will be sent directly to the TCC kitchen. You will receive an order reference after successful placement.</p></section>';
  const choice=document.createElement('div');choice.className='tcc-wish-choice';choice.setAttribute('aria-hidden','true');
  choice.innerHTML='<section class="tcc-wish-choice-panel" role="dialog" aria-modal="true"><header class="tcc-wish-choice-header"><div class="tcc-wish-choice-thumb"></div><div class="tcc-wish-choice-heading"><h3 class="tcc-wish-choice-title">Choose add-ons</h3><p>Select up to 2 add-ons · No Add-ons is also available</p></div></header><div class="tcc-wish-choice-body"><div class="tcc-wish-choice-section-title"><span>Customise your item</span><small>Choose up to 2</small></div><div class="tcc-wish-addon-options"></div></div><footer class="tcc-wish-choice-footer"><div class="tcc-choice-qty"><button type="button" class="tcc-choice-minus" aria-label="Decrease quantity">−</button><strong class="tcc-choice-quantity">1</strong><button type="button" class="tcc-choice-plus" aria-label="Increase quantity">+</button></div><div class="tcc-wish-choice-actions"><button type="button" class="tcc-wish-choice-confirm">Add Item · ₹0</button><button type="button" class="tcc-wish-choice-cancel secondary">Cancel</button></div></footer></section>';
  document.body.append(float,backdrop,choice);
  let pendingProduct=null,choiceQuantity=1;
  let orderType='dine-in',selectedTable='',customerName='',customerPhone='';
  const historyPanel=document.createElement('div');historyPanel.className='tcc-order-history-backdrop';historyPanel.setAttribute('aria-hidden','true');
  historyPanel.innerHTML='<section class="tcc-order-history-panel" role="dialog" aria-modal="true"><header><h2>Order History</h2><button type="button" class="tcc-order-history-close" aria-label="Close order history">×</button></header><div class="tcc-order-lookup"><label for="tccOrderLookup">Find orders on this or another device</label><div><input id="tccOrderLookup" type="text" maxlength="30" placeholder="Order reference or mobile number" autocomplete="off"><button type="button" class="tcc-order-lookup-button">Find</button></div><small>Enter either your order reference or the mobile number used to place the order.</small><p class="tcc-order-lookup-message" role="status"></p><div class="tcc-order-lookup-results"></div></div><h3 class="tcc-order-history-subtitle">Orders on this device</h3><div class="tcc-order-history-list"></div><button type="button" class="tcc-order-history-new">＋ Start a New Order</button></section>';
  document.body.append(historyPanel);
  const closeChoice=()=>{choice.classList.remove('is-open');choice.setAttribute('aria-hidden','true');pendingProduct=null;};
  const lookupInput=historyPanel.querySelector('#tccOrderLookup'),lookupButton=historyPanel.querySelector('.tcc-order-lookup-button'),lookupMessage=historyPanel.querySelector('.tcc-order-lookup-message'),lookupResults=historyPanel.querySelector('.tcc-order-lookup-results');
  const runOrderLookup=async()=>{const value=lookupInput.value.trim();lookupMessage.textContent='';lookupResults.replaceChildren();if(!value){lookupMessage.textContent='Enter an order reference or mobile number.';return;}lookupButton.disabled=true;lookupButton.textContent='Finding…';try{const response=await fetch('https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=order-lookup&lookup='+encodeURIComponent(value),{headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Could not find orders.');const orders=data.orders||[];if(!orders.length){lookupMessage.textContent='No matching orders found.';return;}orders.forEach(order=>{const row=document.createElement('div');row.className='tcc-order-lookup-result';const title=document.createElement('strong');title.textContent=order.order_number+' · '+String(order.status||'').toUpperCase();const meta=document.createElement('span');meta.textContent=new Date(order.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})+' · '+(order.order_type==='dine-in'?'Dine-in'+(order.table_number?' · '+order.table_number:''):'Takeaway')+' · ₹'+Number(order.total||0).toLocaleString('en-IN');const view=document.createElement('button');view.type='button';view.className='tcc-order-history-view';view.textContent='View Order';view.setAttribute('aria-expanded','false');const detail=document.createElement('div');detail.className='tcc-order-history-detail';detail.hidden=true;if(order.customer_name){const customer=document.createElement('p');customer.textContent='Customer: '+order.customer_name;detail.append(customer);}(order.items||[]).forEach(item=>{const line=document.createElement('div');line.className='tcc-order-history-line';const itemTitle=document.createElement('strong');itemTitle.textContent=Number(item.quantity||1)+' × '+item.name;line.append(itemTitle);if(item.addons?.length){const addons=document.createElement('small');addons.textContent='Add-ons: '+item.addons.map(a=>a.name).join(', ');line.append(addons);}if(item.note){const note=document.createElement('small');note.textContent='Note: '+item.note;line.append(note);}detail.append(line);});view.addEventListener('click',()=>{detail.hidden=!detail.hidden;view.textContent=detail.hidden?'View Order':'Hide Order';view.setAttribute('aria-expanded',String(!detail.hidden));});row.append(meta,view,detail);lookupResults.append(row);});}catch(error){lookupMessage.textContent=error.message||'Unable to find orders.';}finally{lookupButton.disabled=false;lookupButton.textContent='Find';}};
  lookupButton.addEventListener('click',runOrderLookup);lookupInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();runOrderLookup();}});
  const closeHistory=()=>{historyPanel.classList.remove('is-open');historyPanel.setAttribute('aria-hidden','true');clearInterval(historyRefreshTimer);};
  const renderHistory=()=>{const list=historyPanel.querySelector('.tcc-order-history-list'),history=readHistory();list.replaceChildren();if(!history.length){const empty=document.createElement('p');empty.textContent='No previous orders on this device yet.';list.append(empty);}history.forEach(order=>{
    const card=document.createElement('article');card.className='tcc-order-history-card';
    const top=document.createElement('div');top.className='tcc-order-history-card-top';
    const ref=document.createElement('strong');ref.textContent=order.ref;
    const status=document.createElement('span');status.className='tcc-order-history-status';status.textContent=order.kitchenStatus?'Kitchen: '+order.kitchenStatus.charAt(0).toUpperCase()+order.kitchenStatus.slice(1):(order.status||'Saved on this device');top.append(ref,status);
    const meta=document.createElement('small');meta.textContent=order.dateTime+' · '+order.orderType+(order.table?' · '+order.table:'');
    const actions=document.createElement('div');actions.className='tcc-order-history-actions';
    const view=document.createElement('button');view.type='button';view.className='tcc-order-history-view';view.textContent='View Order';view.setAttribute('aria-expanded','false');
    const detail=document.createElement('div');detail.className='tcc-order-history-detail';detail.hidden=true;
    if(order.customerName){const customer=document.createElement('p');customer.textContent='Customer: '+order.customerName;detail.append(customer);}
    (order.items||[]).forEach(item=>{const line=document.createElement('div');line.className='tcc-order-history-line';const title=document.createElement('strong');title.textContent=Math.max(1,Number(item.qty)||1)+' × '+item.name;line.append(title);if(item.addons?.length){const addons=document.createElement('small');addons.textContent='Add-ons: '+item.addons.map(x=>x.name).join(', ');line.append(addons);}if(item.note?.trim()){const note=document.createElement('small');note.textContent='Note: '+item.note.trim();line.append(note);}detail.append(line);});
    view.addEventListener('click',()=>{detail.hidden=!detail.hidden;view.textContent=detail.hidden?'View Order':'Hide Order';view.setAttribute('aria-expanded',String(!detail.hidden));});
    actions.append(view);
    card.append(top,meta,actions,detail);list.append(card);
  });};
  let historyRefreshTimer=null;
  const refreshCustomerOrderStatuses=async()=>{const history=readHistory();let changed=false;await Promise.all(history.filter(order=>order.ref&&order.customerPhone).map(async order=>{try{const url='https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=order-status&order_number='+encodeURIComponent(order.ref)+'&phone='+encodeURIComponent(order.customerPhone);const response=await fetch(url,{headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'}});if(!response.ok)return;const data=await response.json();if(data.order&&order.kitchenStatus!==data.order.status){order.kitchenStatus=data.order.status;changed=true;}}catch{}}));if(changed){saveHistory(history);renderHistory();}};
  const openHistory=()=>{renderHistory();historyPanel.classList.add('is-open');historyPanel.setAttribute('aria-hidden','false');refreshCustomerOrderStatuses();clearInterval(historyRefreshTimer);historyRefreshTimer=setInterval(()=>{if(historyPanel.classList.contains('is-open'))refreshCustomerOrderStatuses();else clearInterval(historyRefreshTimer);},10000);};
  const openRemoveChoice=(matching)=>{
    pendingProduct=null;
    choice.querySelector('.tcc-wish-choice-title').textContent='Which '+matching[0].name+' would you like to remove?';
    const body=choice.querySelector('.tcc-wish-choice-body'),wrap=choice.querySelector('.tcc-wish-addon-options');
    body.querySelector('.tcc-wish-choice-section-title span').textContent='Choose the customisation';
    body.querySelector('.tcc-wish-choice-section-title small').textContent='Remove one';
    wrap.replaceChildren();
    matching.forEach(item=>{
      const option=document.createElement('button');option.type='button';option.className='tcc-remove-option';
      const detail=(item.addons||[]).length?item.addons.map(x=>x.name).join(' · '):'No Add-ons';
      option.innerHTML='<span></span><strong></strong><small></small>';
      option.querySelector('span').textContent=detail;
      option.querySelector('strong').textContent='Qty '+Math.max(1,Number(item.qty)||1);
      option.querySelector('small').textContent='Remove 1';
      option.addEventListener('click',()=>{if((Number(item.qty)||1)>1)item.qty--;else items=items.filter(x=>x!==item);save();render();closeChoice();});
      wrap.append(option);
    });
    choice.querySelector('.tcc-wish-choice-footer').style.display='none';
    choice.classList.add('is-open');choice.setAttribute('aria-hidden','false');
  };
  const updateChoiceSummary=()=>{
    if(!pendingProduct)return;
    const selected=[...choice.querySelectorAll('.tcc-wish-addon-options input[type="checkbox"]:checked')].map(input=>pendingProduct.options[Number(input.value)]);
    const unit=(Number(pendingProduct.data.price)||0)+selected.reduce((sum,item)=>sum+(Number(item.price)||0),0);
    choice.querySelector('.tcc-choice-quantity').textContent=String(choiceQuantity);
    choice.querySelector('.tcc-wish-choice-confirm').textContent=(pendingProduct.editItem?'Save Changes':'Add Item')+' · '+money(unit*choiceQuantity);
  };
  const openChoice=(card,data,options,editItem=null)=>{
    choice.querySelector('.tcc-wish-choice-footer').style.display='flex';
    pendingProduct={card,data,options,editItem};choiceQuantity=editItem?Math.max(1,Number(editItem.qty)||1):1;
    const wrap=choice.querySelector('.tcc-wish-addon-options');wrap.replaceChildren();
    choice.querySelector('.tcc-wish-choice-title').textContent=data.name;
    const thumb=choice.querySelector('.tcc-wish-choice-thumb'),source=card.querySelector('.m-photo-wrap img,.m-photo,img');thumb.replaceChildren();
    if(source?.tagName==='IMG'&&(source.currentSrc||source.src)){const image=document.createElement('img');image.src=source.currentSrc||source.src;image.alt=data.name;thumb.append(image);}else thumb.textContent='☕';
    const none=document.createElement('label'),noneInput=document.createElement('input');noneInput.type='radio';noneInput.name='tccWishNoAddon';noneInput.checked=true;none.append(noneInput,document.createTextNode('No Add-ons'));wrap.append(none);
    options.forEach((opt,index)=>{const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),price=document.createElement('span');input.type='checkbox';input.value=String(index);input.checked=!!editItem&&(editItem.addons||[]).some(item=>item.name===opt.name);name.textContent=opt.name;price.className='tcc-addon-price';price.textContent='+'+money(opt.price);input.addEventListener('change',()=>{if(wrap.querySelectorAll('input[type="checkbox"]:checked').length>2)input.checked=false;noneInput.checked=wrap.querySelectorAll('input[type="checkbox"]:checked').length===0;updateChoiceSummary();});label.append(input,name,price);wrap.append(label);});
    noneInput.checked=wrap.querySelectorAll('input[type="checkbox"]:checked').length===0;noneInput.addEventListener('change',()=>{wrap.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=false);updateChoiceSummary();});
    choice.querySelector('.tcc-choice-minus').onclick=()=>{choiceQuantity=Math.max(1,choiceQuantity-1);updateChoiceSummary();};
    choice.querySelector('.tcc-choice-plus').onclick=()=>{choiceQuantity=Math.min(99,choiceQuantity+1);updateChoiceSummary();};
    choice.classList.add('is-open');choice.setAttribute('aria-hidden','false');updateChoiceSummary();
  };

  const animateProductToWishlist=(card,data)=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const target=float.getBoundingClientRect();
    const source=card.querySelector('.m-photo-wrap img,.m-photo, img')||card;
    const start=source.getBoundingClientRect();
    if(!start.width||!start.height||!target.width||!target.height)return;
    const flyer=document.createElement('div');
    flyer.className='tcc-wish-flyer';
    const image=source.tagName==='IMG'?source.currentSrc||source.src:'';
    flyer.innerHTML=image?'<img alt="">':'<span></span>';
    if(image){const img=flyer.querySelector('img');img.src=image;img.alt=data.name;}
    else flyer.querySelector('span').textContent=data.name;
    Object.assign(flyer.style,{position:'fixed',left:start.left+'px',top:start.top+'px',width:Math.min(start.width,150)+'px',height:Math.min(start.height,110)+'px',zIndex:'15000',overflow:'hidden',borderRadius:'12px',background:'#fffaf0',boxShadow:'0 8px 28px rgba(0,0,0,.25)',pointerEvents:'none',opacity:'1',transition:'left .62s cubic-bezier(.2,.75,.25,1),top .62s cubic-bezier(.2,.75,.25,1),width .62s ease,height .62s ease,opacity .62s ease,transform .62s cubic-bezier(.2,.75,.25,1)'});
    const img=flyer.querySelector('img');
    if(img)Object.assign(img.style,{width:'100%',height:'100%',objectFit:'cover'});
    else Object.assign(flyer.querySelector('span').style,{display:'grid',placeItems:'center',height:'100%',padding:'8px',color:'#173c2b',font:'700 12px Arial',textAlign:'center'});
    document.body.appendChild(flyer);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      flyer.style.left=(target.left+target.width/2-18)+'px';
      flyer.style.top=(target.top+target.height/2-18)+'px';
      flyer.style.width='36px';flyer.style.height='36px';flyer.style.borderRadius='50%';flyer.style.transform='scale(.55)';flyer.style.opacity='.25';
    }));
    flyer.addEventListener('transitionend',()=>flyer.remove(),{once:true});
    setTimeout(()=>flyer.remove(),850);
    float.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:420,easing:'ease-out'});
  };
  const count=()=>float.querySelector('.tcc-wish-count');
  const sameProduct=(item,data)=>String(item.key||'').toLowerCase()===String(data.key||'').toLowerCase()||clean(item.name).toLowerCase()===clean(data.name).toLowerCase();
  const render=()=>{
    count().textContent=items.reduce((sum,item)=>sum+Math.max(1,Number(item.qty)||1),0);
    document.querySelectorAll('.m-item').forEach(card=>{
      const data=getData(card),btn=card.querySelector('.tcc-wish-add');
      if(btn){const matching=items.filter(x=>sameProduct(x,data));const quantity=matching.reduce((sum,x)=>sum+Math.max(1,Number(x.qty)||1),0);const stepper=card.querySelector('.tcc-menu-qty');if(stepper){const controls=stepper.querySelectorAll('button');const qtyLabel=stepper.querySelector('span');stepper.hidden=false;qtyLabel.textContent=String(quantity);qtyLabel.hidden=!quantity;controls[0].hidden=!quantity;controls[1].hidden=!quantity;btn.hidden=quantity>0;}btn.classList.toggle('is-added',!!quantity);btn.textContent='＋ Add to Cart';btn.setAttribute('aria-label',quantity?'Add another '+data.name+' to cart':'Add '+data.name+' to cart');btn.setAttribute('title','Add to cart');btn.setAttribute('aria-pressed',String(!!quantity));}
    });
    const list=backdrop.querySelector('.tcc-wish-list');
    list.innerHTML='';
    if(!items.length){list.innerHTML='<div class="tcc-wish-empty">Your cart is empty.<br>Add your favourite items from the menu.</div>';}
    items.forEach(item=>{
      const row=document.createElement('div');row.className='tcc-wish-row';
      const info=document.createElement('div');const title=document.createElement('strong');title.textContent=item.name;const meta=document.createElement('small');meta.textContent=item.category;info.append(title,meta);
      if(item.addons?.length){const addonLine=document.createElement('small');addonLine.textContent='Add-ons: '+item.addons.map(x=>x.name).join(', ');info.append(addonLine);}
      const noteToggle=document.createElement('button');noteToggle.type='button';noteToggle.className='tcc-wish-note-toggle';noteToggle.textContent=item.note?.trim()?'Edit note':'＋ Add note';noteToggle.setAttribute('aria-expanded','false');
      const note=document.createElement('textarea');note.className='tcc-wish-item-note';note.placeholder='Add a note for this product (optional)';note.value=item.note||'';note.setAttribute('aria-label','Note for '+item.name);note.hidden=true;
      noteToggle.addEventListener('click',()=>{const expanded=!note.hidden;note.hidden=expanded;noteToggle.setAttribute('aria-expanded',String(!expanded));noteToggle.textContent=expanded?(item.note?.trim()?'Edit note':'＋ Add note'):'− Hide note';if(!expanded)note.focus();});
      note.addEventListener('input',()=>{item.note=note.value;save();if(note.value.trim())noteToggle.textContent='− Hide note';});
      info.append(noteToggle,note);
      const price=document.createElement('div');price.className='tcc-wish-row-price';
      const unitPrice=item.price+(item.addons||[]).reduce((sum,x)=>sum+x.price,0);
      const amount=document.createElement('span');amount.textContent='';
      const qty=document.createElement('div');qty.className='tcc-wish-qty';
      const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Decrease '+item.name+' quantity');
      const qtyValue=document.createElement('strong');qtyValue.textContent=Math.max(1,Number(item.qty)||1);
      const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Increase '+item.name+' quantity');
      minus.addEventListener('click',()=>{item.qty=Math.max(1,(Number(item.qty)||1)-1);save();render()});
      plus.addEventListener('click',()=>{item.qty=(Number(item.qty)||1)+1;save();render()});
      qty.append(minus,qtyValue,plus);
      if((item.addons||[]).length){const edit=document.createElement('button');edit.type='button';edit.className='tcc-wish-remove';edit.textContent='Edit';edit.addEventListener('click',()=>{const card=[...document.querySelectorAll('.m-item')].find(node=>sameProduct(item,getData(node)));if(card)openChoice(card,getData(card),addonOptions(card),item);});price.append(edit);}
      const remove=document.createElement('button');remove.type='button';remove.className='tcc-wish-remove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>{items=items.filter(x=>x!==item);save();render()});
      price.append(amount,qty,remove);row.append(info,price);list.append(row);
    });
    
    
    backdrop.querySelector('.tcc-wish-total').innerHTML='';
    backdrop.querySelector('.tcc-wish-total').style.display='none';
    backdrop.querySelector('.tcc-wish-table-field').style.display=items.length?'block':'none';
    backdrop.querySelector('.tcc-wish-actions').style.display=items.length?'grid':'none';
    backdrop.querySelector('.tcc-wish-continue').style.display=items.length?'block':'none';
    backdrop.querySelectorAll('[data-order-type]').forEach(button=>button.classList.toggle('active',button.dataset.orderType===orderType));
    backdrop.querySelector('.tcc-table-options').hidden=orderType!=='dine-in';
    backdrop.querySelector('.tcc-table-label').hidden=orderType!=='dine-in';
    backdrop.querySelectorAll('[data-table]').forEach(button=>button.classList.toggle('active',button.dataset.table===selectedTable));
  };
  const placeWishlistButton=(card,btn)=>{
    const control=btn.closest('.tcc-menu-qty')||btn;
    if(document.body.classList.contains('menu-text-mode')){
      const heading=card.querySelector('.m-item-info h3, h3');
      if(heading&&heading.parentElement){
        let row=heading.closest('.tcc-wish-title-row');
        if(!row){
          row=document.createElement('div');row.className='tcc-wish-title-row';
          heading.parentElement.insertBefore(row,heading);
          row.appendChild(heading);
        }
        if(control.parentElement!==row)row.appendChild(control);
        return;
      }
    }
    const price=card.querySelector(':scope > strong');
    if(price){
      if(control.parentElement!==card||price.nextElementSibling!==control)price.insertAdjacentElement('afterend',control);
    }else{
      const info=card.querySelector('.m-item-info')||card;
      if(control.parentElement!==info)info.appendChild(control);
    }
  };
  document.querySelectorAll('[data-menu-view]').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      requestAnimationFrame(()=>document.querySelectorAll('.m-item').forEach(card=>{
        const btn=card.querySelector('.tcc-wish-add');
        if(btn)placeWishlistButton(card,btn);
      }));
    });
  });
  const attachWishlistButtons=(root=document)=>{
    const cards=[];
    if(root.matches?.('.m-item'))cards.push(root);
    root.querySelectorAll?.('.m-item').forEach(card=>cards.push(card));
    let added=false;
    cards.forEach(card=>{
      if(card.querySelector('.tcc-wish-add')||card.querySelector('.availability-status'))return;
      const data=getData(card);
      if(!data.name||!data.price)return;
      const stepper=document.createElement('div');stepper.className='tcc-menu-qty';
      const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Remove one '+data.name+' from cart');
      const qty=document.createElement('span');qty.textContent='0';
      const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Add one '+data.name+' to cart');
      minus.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const matching=items.filter(x=>sameProduct(x,data));if(!matching.length)return;const distinct=new Set(matching.map(x=>JSON.stringify((x.addons||[]).map(a=>a.name).sort())));if(distinct.size>1){openRemoveChoice(matching);return;}const last=matching[matching.length-1];if((Number(last.qty)||1)>1)last.qty--;else items=items.filter(x=>x!==last);save();render();});
      plus.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const options=addonOptions(card);if(options.length){openChoice(card,data,options);return;}const last=items.filter(x=>sameProduct(x,data)).slice(-1)[0];if(last){last.qty=(Number(last.qty)||1)+1;save();render();}else btn.click();});
      stepper.append(minus,qty,plus);
      const btn=document.createElement('button');
      btn.type='button';btn.className='tcc-wish-add';
      btn.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const options=addonOptions(card);
        if(options.length){openChoice(card,data,options);return;}
        animateProductToWishlist(card,data);
        const found=items.find(x=>sameProduct(x,data)&&!(x.addons||[]).length);
        if(found){found.qty=(Number(found.qty)||1)+1;}
        else items.push({...data,addons:[],note:'',qty:1,lineId:String(Date.now())+'-'+Math.random().toString(36).slice(2)});
        save();render();
      });
      stepper.appendChild(btn);
      card.appendChild(stepper);
      placeWishlistButton(card,btn);
      added=true;
    });
    if(added)render();
  };
  // Menu products are injected and then have their info wrappers rebuilt.
  // Observe only newly-added element nodes, and ignore our own wishlist button,
  // to avoid reacting to our own DOM updates or creating a mutation loop.
  const startWishlistButtons=()=>{
    attachWishlistButtons();
    const menuRoot=document.querySelector('.menu-page');
    if(!menuRoot)return;
    const observer=new MutationObserver(records=>{
      records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node.nodeType!==1||node.classList.contains('tcc-wish-add'))return;
        const card=node.matches('.m-item')?node:node.closest('.m-item');
        if(card)attachWishlistButtons(card);
        else if(node.querySelector?.('.m-item'))attachWishlistButtons(node);
      }));
    });
    observer.observe(menuRoot,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startWishlistButtons,{once:true});
  else startWishlistButtons();
  const open=()=>{backdrop.classList.add('is-open');backdrop.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';backdrop.querySelector('.tcc-wish-close').focus()};
  const close=()=>{backdrop.classList.remove('is-open');backdrop.setAttribute('aria-hidden','true');document.body.style.overflow=''};
  float.addEventListener('click',open);
  backdrop.querySelector('.tcc-wish-close').addEventListener('click',close);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&backdrop.classList.contains('is-open'))close()});
  choice.querySelector('.tcc-wish-choice-confirm').addEventListener('click',()=>{
    if(!pendingProduct)return;
    const current=pendingProduct,wrap=choice.querySelector('.tcc-wish-addon-options');
    const selected=[...wrap.querySelectorAll('input[type="checkbox"]:checked')].slice(0,2).map(input=>current.options[Number(input.value)]);
    animateProductToWishlist(current.card,current.data);
    if(current.editItem){current.editItem.addons=selected;current.editItem.qty=choiceQuantity;}
    else{const sameConfig=item=>sameProduct(item,current.data)&&JSON.stringify((item.addons||[]).map(x=>x.name).sort())===JSON.stringify(selected.map(x=>x.name).sort());const found=items.find(sameConfig);if(found)found.qty=(Number(found.qty)||1)+choiceQuantity;else items.push({...current.data,addons:selected,note:'',qty:choiceQuantity,lineId:String(Date.now())+'-'+Math.random().toString(36).slice(2)});}
    save();render();closeChoice();
  });
  choice.querySelector('.tcc-wish-choice-cancel').addEventListener('click',closeChoice);
  choice.addEventListener('click',event=>{if(event.target===choice)closeChoice();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&choice.classList.contains('is-open'))closeChoice();});
  backdrop.querySelector('.tcc-wish-clear').addEventListener('click',()=>{items=[];selectedTable='';save();render()});
  backdrop.querySelector('.tcc-wish-continue').addEventListener('click',close);
  backdrop.querySelector('#tccCustomerName').addEventListener('input',event=>{customerName=event.target.value.trimStart();});
  backdrop.querySelector('#tccCustomerPhone').addEventListener('input',event=>{customerPhone=event.target.value.trim();});
  backdrop.querySelector('.tcc-order-history-open').addEventListener('click',openHistory);
  document.querySelector('.tcc-mobile-track')?.addEventListener('click',()=>{openHistory();setTimeout(()=>lookupInput?.focus(),80);});
  document.querySelector('.tcc-mobile-history')?.addEventListener('click',()=>{openHistory();setTimeout(()=>historyPanel.querySelector('.tcc-order-history-subtitle')?.scrollIntoView({block:'start',behavior:'smooth'}),100);});
  historyPanel.querySelector('.tcc-order-history-close').addEventListener('click',closeHistory);
  historyPanel.querySelector('.tcc-order-history-new').addEventListener('click',()=>{closeHistory();backdrop.classList.remove('is-open');backdrop.setAttribute('aria-hidden','true');});
  backdrop.querySelectorAll('[data-order-type]').forEach(button=>button.addEventListener('click',()=>{orderType=button.dataset.orderType;selectedTable='';backdrop.querySelector('.tcc-wish-table-error').textContent='';render();}));
  backdrop.querySelectorAll('[data-table]').forEach(button=>button.addEventListener('click',()=>{selectedTable=button.dataset.table;backdrop.querySelector('.tcc-wish-table-error').textContent='';render();}));
  let orderSubmissionBusy=false;
  backdrop.querySelector('.tcc-wish-send').addEventListener('click',async()=>{
    if(orderSubmissionBusy||!items.length)return;
    const tableError=backdrop.querySelector('.tcc-wish-table-error');
    const normalizedPhone=customerPhone.replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'');
    if(!/^\d{10}$/.test(normalizedPhone)){tableError.textContent='Please enter a valid 10-digit mobile number.';backdrop.querySelector('#tccCustomerPhone').focus();return;}
    if(orderType==='dine-in'&&!selectedTable){tableError.textContent='Please select your table number to continue.';return;}
    tableError.textContent='';
    const sendButton=backdrop.querySelector('.tcc-wish-send');
    orderSubmissionBusy=true;sendButton.disabled=true;sendButton.textContent='Placing Order…';
    const tableNumber=selectedTable,now=new Date();
    const dateTime=now.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
    const dayKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const history=readHistory();
    const sameOrderSession=history.filter(order=>order.dayKey===dayKey&&order.orderType===(orderType==='dine-in'?'Dine-in':'Takeaway')&&(orderType==='dine-in'?order.table===tableNumber:!!customerName.trim()&&order.customerName===customerName.trim()));
    const order={ref:'',dateTime,dayKey,orderSequence:sameOrderSession.length+1,orderType:orderType==='dine-in'?'Dine-in':'Takeaway',table:orderType==='dine-in'?tableNumber:'',customerName:customerName.trim(),customerPhone:normalizedPhone,status:'New',kitchenStatus:'new',items:items.map(item=>({...item,addons:(item.addons||[]).map(addon=>({...addon}))}))};
    let requestKey='';
    const requestSignature=JSON.stringify({phone:normalizedPhone,type:orderType,table:tableNumber,name:customerName.trim(),items:items.map(item=>({name:item.name,qty:item.qty,price:item.price,addons:item.addons||[],note:item.note||''}))});
    try{const priorSignature=sessionStorage.getItem('tccPendingOrderSignature');requestKey=sessionStorage.getItem('tccPendingOrderRequestKey')||'';if(!requestKey||priorSignature!==requestSignature){requestKey=crypto.randomUUID();sessionStorage.setItem('tccPendingOrderRequestKey',requestKey);sessionStorage.setItem('tccPendingOrderSignature',requestSignature);}}catch{requestKey=crypto.randomUUID();}
    try{
      const apiResponse=await fetch('https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=create-order',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'},
        body:JSON.stringify({idempotency_key:requestKey,customer_name:customerName.trim(),customer_phone:normalizedPhone,order_type:orderType,table_number:tableNumber,items:items.map(item=>({name:item.name,quantity:item.qty,unit_price:item.price,category:item.category,section:item.section,addons:item.addons||[],note:item.note||''}))})
      });
      const saved=await apiResponse.json().catch(()=>({}));
      if(!apiResponse.ok||!saved.order)throw new Error(saved.error||'We could not confirm your order. Your cart is saved; please retry.');
      order.ref=saved.order.order_number;order.status=saved.order.status||'new';order.kitchenStatus=saved.order.status||'new';order.total=saved.order.total;
      history.unshift(order);saveHistory(history);
      items=[];save();render();backdrop.classList.remove('is-open');backdrop.setAttribute('aria-hidden','true');
      try{sessionStorage.removeItem('tccPendingOrderRequestKey');sessionStorage.removeItem('tccPendingOrderSignature');}catch{}
      const notice=document.createElement('div');notice.className='tcc-order-send-notice';notice.setAttribute('role','status');
      notice.innerHTML='<strong>Order placed successfully!</strong><br>Reference: '+order.ref+'<br>Your order has been sent to TCC’s kitchen. Track its progress in Order History.';
      document.body.append(notice);setTimeout(()=>notice.remove(),9000);
    }catch(error){tableError.textContent=error.message||'Unable to place your order. Your cart is saved — please retry.';}
    finally{orderSubmissionBusy=false;sendButton.disabled=false;sendButton.textContent='Place Order';}
  });
  render();
})();