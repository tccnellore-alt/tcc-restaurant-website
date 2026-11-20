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
    if(group?.id==='coffee'&&data.name==='Hot Chocolate'){
      source=[{name:'With Ice Cream',price:0},{name:'Without Ice Cream',price:0}];
    }else if(group?.id==='coffee'&&typeof tccCoffeeAddonsByDrink!=='undefined'&&tccCoffeeAddonsByDrink[data.name]){
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
    .menu-page .m-item .tcc-wish-add{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:0!important;min-height:42px!important;margin:0!important;padding:0 12px!important;border:1px solid rgba(23,60,43,.18)!important;border-radius:999px!important;background:#f5f0e5!important;color:#365442!important;box-shadow:none!important;font:700 11px/1 Arial,sans-serif!important;cursor:pointer!important;white-space:nowrap!important}
    .menu-page .m-item .tcc-wish-add.is-added{background:#173c2b!important;color:#fffaf0!important;border-color:#173c2b!important;min-width:0!important;padding-left:12px!important;padding-right:12px!important}
    .tcc-price-action-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:auto!important;min-width:0!important;min-height:40px!important;margin:6px 0 8px!important;box-sizing:border-box!important}
    .tcc-price-action-row{margin:3px 0 0!important}
    body:not(.menu-text-mode) .menu-page .m-item-info{padding-bottom:3px!important}
    .tcc-price-action-row > strong{display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;flex:0 0 48px!important;width:50px!important;height:40px!important;min-height:40px!important;margin:0!important;padding:0!important;border-radius:999px!important;font-size:20px!important;line-height:1!important;box-sizing:border-box!important}
    .tcc-price-action-row .tcc-menu-qty{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;min-height:36px!important;margin:0!important;padding:2px 4px!important;border:1px solid rgba(23,60,43,.18)!important;border-radius:999px!important;background:#f5f0e5!important;color:#173c2b!important;box-sizing:border-box!important}
    .tcc-price-action-row .tcc-menu-qty button{width:25px!important;height:25px!important;min-width:25px!important;min-height:25px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#173c2b!important;color:#fffaf0!important;font:700 16px Arial,sans-serif!important;cursor:pointer!important}
    .tcc-menu-qty button[hidden],.tcc-menu-qty span[hidden],.tcc-menu-qty [hidden]{display:none!important}
    .tcc-menu-qty .tcc-wish-add[hidden]{display:none!important}
    .tcc-menu-qty span{min-width:18px;text-align:center;font:800 14px Arial,sans-serif}
    .tcc-menu-qty[hidden]{display:none!important}
    .tcc-price-action-row .tcc-menu-qty:has(.tcc-wish-add:not([hidden])){min-height:34px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;}
    .tcc-price-action-row .tcc-menu-qty:has(.tcc-wish-add:not([hidden])) .tcc-wish-add{min-height:38px!important;margin-right:12px!important;padding:0 9px!important;border:0!important;border-radius:999px!important;background:#173c2b!important;color:#fffaf0!important;font:800 11px/1 Manrope,Arial,sans-serif!important;letter-spacing:0!important;box-shadow:0 2px 7px rgba(23,60,43,.12)!important;}
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
    .tcc-wish-fulfillment{display:flex;align-items:center;gap:8px;margin-top:9px;color:#365442;font:700 11px Arial,sans-serif}.tcc-wish-fulfillment input{width:17px;height:17px;min-height:17px;margin:0;accent-color:#173c2b}.tcc-wish-note-toggle{display:inline-flex;align-items:center;margin-top:7px;padding:4px 0;border:0;background:transparent;color:#8d7337;font:700 11px Arial,sans-serif;cursor:pointer}
    .tcc-wish-item-note{width:100%;min-height:48px;box-sizing:border-box;margin-top:7px;padding:8px;border:1px solid rgba(23,60,43,.16);border-radius:8px;background:#fff;color:#173c2b;font:12px Arial,sans-serif;resize:vertical}
    /* Compact centered TCC customization modal */
    .tcc-wish-choice{align-items:center!important;justify-content:center!important;padding:14px!important;background:rgba(8,20,14,.58)!important;backdrop-filter:blur(7px)!important}
    .tcc-wish-choice-panel{width:min(78vw,420px)!important;max-height:min(74dvh,620px)!important;border-radius:22px!important;box-shadow:0 18px 55px rgba(0,0,0,.28)!important;animation:tccChoicePop .18s ease-out!important}
    @keyframes tccChoicePop{from{transform:translateY(8px) scale(.985);opacity:.75}to{transform:translateY(0) scale(1);opacity:1}}
    .tcc-wish-choice-header{gap:10px!important;padding:13px 14px 11px!important}
    .tcc-wish-choice-thumb{flex-basis:56px!important;width:56px!important;height:56px!important;border-radius:13px!important}
    .tcc-wish-choice-panel h3{font-size:17px!important;line-height:1.2!important;margin:0 0 4px!important}
    .tcc-wish-choice-panel p{font-size:11px!important;line-height:1.35!important}
    .tcc-wish-choice-close{display:grid!important;place-items:center!important;flex:0 0 32px!important;width:32px!important;height:32px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#f0eadc!important;color:#173c2b!important;font:400 23px/1 Arial,sans-serif!important}
    .tcc-wish-choice-body{padding:11px 14px 12px!important;min-height:0!important}
    .tcc-wish-choice-section-title{margin:0 0 8px!important;font-size:13px!important}
    .tcc-wish-addon-options{gap:5px!important}
    .tcc-wish-addon-options label{min-height:38px!important;gap:8px!important;padding:5px 9px!important;border-radius:10px!important;font-size:12px!important}
    .tcc-wish-addon-options input{width:17px!important;height:17px!important;flex-basis:17px!important}
    .tcc-wish-addon-options .tcc-addon-price{font-size:12px!important}
    .tcc-wish-choice-footer{gap:9px!important;padding:10px 12px calc(10px + env(safe-area-inset-bottom))!important}
    .tcc-choice-qty{flex-basis:108px!important;gap:5px!important;padding:4px!important;border-radius:10px!important}
    .tcc-choice-qty button{width:29px!important;height:29px!important;font-size:17px!important}
    .tcc-choice-qty strong{font-size:13px!important}
    .tcc-wish-choice-actions{gap:0!important}
    .tcc-wish-choice-actions button{min-height:40px!important;border-radius:10px!important;font-size:12px!important}
    .tcc-wish-choice-actions .secondary{display:none!important}
    @media(min-width:700px){.tcc-wish-choice{padding:20px!important}.tcc-wish-choice-panel{width:min(78vw,420px)!important;max-height:min(74dvh,620px)!important;border-radius:22px!important}.tcc-wish-choice-footer{padding:10px 14px!important}}
    @media(max-width:380px){.tcc-wish-choice{padding:10px!important}.tcc-wish-choice-header{padding:11px 12px 9px!important}.tcc-wish-choice-body{padding:9px 12px!important}.tcc-wish-choice-footer{gap:7px!important;padding-left:10px!important;padding-right:10px!important}.tcc-choice-qty{flex-basis:100px!important}}
    /* Stronger, clearer typography for customization modal */
    .tcc-wish-choice-panel h3{font-weight:800!important}
    .tcc-wish-choice-panel p{font-weight:600!important}
    .tcc-wish-choice-section-title{font-weight:800!important}
    .tcc-wish-choice-section-title small{font-weight:700!important}
    .tcc-wish-addon-options label{font-weight:700!important}
    .tcc-wish-addon-options .tcc-addon-price{font-weight:800!important}
    .tcc-choice-qty strong{font-weight:800!important}
    .tcc-wish-choice-actions button{font-weight:800!important}
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
    .tcc-table-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(6,48px);gap:8px;margin:10px 0 4px;padding:12px;border:1px solid rgba(23,60,43,.16);border-radius:15px;background:#f2f0e8;position:relative}
    .tcc-table-options{display:contents}
    .tcc-table-options button{width:100%;min-width:0;min-height:42px;padding:0 4px;border:1px solid rgba(23,60,43,.18);border-radius:9px;background:#fff;color:#263b2e;font:800 12px Arial,sans-serif;cursor:pointer}
    .tcc-table-options button.active{background:#173c2b;color:#fffaf0;border-color:#173c2b;box-shadow:0 0 0 2px rgba(23,60,43,.15)}
    .tcc-table-groups [data-table="S6"]{grid-column:1;grid-row:1}.tcc-table-groups [data-table="C4"]{grid-column:2;grid-row:1}
    .tcc-table-groups [data-table="S5"]{grid-column:1;grid-row:2}.tcc-table-groups [data-table="C3"]{grid-column:2;grid-row:2}
    .tcc-table-groups [data-table="S4"]{grid-column:1;grid-row:3}.tcc-table-groups [data-table="C2"]{grid-column:2;grid-row:3}
    .tcc-table-groups [data-table="S3"]{grid-column:1;grid-row:4}.tcc-table-groups [data-table="C1"]{grid-column:2;grid-row:4}
    .tcc-table-groups [data-table="S2"]{grid-column:1;grid-row:5}.tcc-table-groups [data-table="S1"]{grid-column:1;grid-row:6}
    .tcc-table-groups [data-table="P3"]{grid-column:3;grid-row:1}.tcc-table-groups [data-table="P2"]{grid-column:3;grid-row:2}.tcc-table-groups [data-table="P1"]{grid-column:3;grid-row:3}
    .tcc-table-counter{grid-column:3;grid-row:5 / span 2;display:flex;align-items:center;justify-content:center;border:1px solid #c8bda4;border-radius:10px;background:#49443a;color:#fffaf0;font:800 12px Arial,sans-serif;letter-spacing:.04em}
    .tcc-table-entrance{grid-column:2;grid-row:7;justify-self:center;align-self:center;color:#788075;font:700 10px Arial,sans-serif;letter-spacing:.08em}
    .tcc-table-groups{grid-template-rows:repeat(6,48px) 18px}
    .tcc-table-options[hidden]{display:none!important}
    @media(max-width:380px){.tcc-table-groups{gap:6px;padding:9px;grid-template-rows:repeat(6,43px) 18px}.tcc-table-options button{font-size:11px}}
    .tcc-wish-hint{margin:12px 0 0;color:#788075;font:11px/1.45 Arial,sans-serif;text-align:center}
    .tcc-wish-head-actions{display:flex;align-items:center;gap:8px}.tcc-order-history-open{min-height:36px;padding:0 11px;border:1px solid rgba(23,60,43,.2);border-radius:999px;background:#f0f4ed;color:#173c2b;font:700 11px Arial,sans-serif}.tcc-order-history-backdrop{position:fixed;inset:0;z-index:10020;display:none;align-items:flex-end;justify-content:center;padding:14px;background:rgba(7,22,15,.65);backdrop-filter:blur(4px)}.tcc-order-history-backdrop.is-open{display:flex}.tcc-order-history-panel{width:min(100%,560px);max-height:82dvh;overflow:auto;padding:18px;border-radius:20px;background:#fffaf0;color:#173c2b}.tcc-order-lookup{margin:8px 0 16px;padding:13px;border:1px solid rgba(23,60,43,.15);border-radius:13px;background:#f5f2e9}.tcc-order-lookup label{display:block;margin-bottom:8px;font:700 12px Arial,sans-serif}.tcc-order-lookup>div:first-of-type{display:flex;gap:7px}.tcc-order-lookup input{min-width:0;flex:1;height:42px;padding:0 10px;border:1px solid rgba(23,60,43,.2);border-radius:9px;background:#fff;font:13px Arial,sans-serif}.tcc-order-lookup-button{padding:0 15px;border:0;border-radius:9px;background:#173c2b;color:#fffaf0;font-weight:700}.tcc-order-lookup small{display:block;margin-top:7px;color:#788075;font:11px/1.4 Arial,sans-serif}.tcc-order-lookup-message{margin:7px 0 0;color:#a33e34;font:12px Arial,sans-serif}.tcc-order-lookup-results:empty{display:none}.tcc-order-lookup-result{padding:10px 0;border-top:1px solid rgba(23,60,43,.12);font:12px/1.5 Arial,sans-serif}.tcc-order-lookup-result strong{display:block;font-size:13px}.tcc-order-lookup-status{display:inline-flex;align-items:center;margin:5px 0;padding:4px 9px;border-radius:999px;background:#e7eee8;color:#173c2b;font-size:11px;font-weight:800;text-transform:capitalize}.tcc-order-lookup-result>span:not(.tcc-order-lookup-status){display:block}.tcc-order-history-subtitle{margin:14px 0 4px;font:700 14px Arial,sans-serif;color:#173c2b}.tcc-order-history-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.tcc-order-history-panel h2{margin:0;font:600 24px Georgia,serif}.tcc-order-history-close{width:36px;height:36px;border:1px solid rgba(23,60,43,.2);border-radius:50%;background:transparent;color:#173c2b;font-size:22px}.tcc-order-history-card{padding:13px 0;border-bottom:1px solid rgba(23,60,43,.12)}.tcc-order-history-card-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.tcc-order-history-card small{display:block;margin:5px 0;color:#788075;font-size:11px}.tcc-order-history-status{font-size:11px;font-weight:700;color:#8d7337}.tcc-order-history-items{font-size:12px;line-height:1.55}.tcc-order-history-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.tcc-order-history-view,.tcc-order-history-resend{min-height:34px;padding:0 12px;border:1px solid rgba(23,60,43,.2);border-radius:999px;background:#f0f4ed;color:#173c2b;font:700 11px Arial,sans-serif}.tcc-order-history-resend{background:#173c2b;border-color:#173c2b;color:#fffaf0}.tcc-order-history-detail{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f4f1e8}.tcc-order-history-detail[hidden]{display:none!important}.tcc-order-history-detail p{margin:0 0 8px;font:12px Arial,sans-serif}.tcc-order-history-line{padding:7px 0;border-bottom:1px solid rgba(23,60,43,.1)}.tcc-order-history-line:last-child{border-bottom:0}.tcc-order-history-line strong,.tcc-order-history-line small{display:block;font:12px/1.45 Arial,sans-serif}.tcc-order-history-line small{margin-top:3px;color:#788075}.tcc-order-history-new{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:999px;background:#173c2b;color:#fffaf0;font-weight:700}.tcc-order-send-notice{position:fixed;left:14px;right:14px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:2147483000;padding:14px 16px;border-radius:14px;background:#173c2b;color:#fffaf0;box-shadow:0 8px 28px rgba(0,0,0,.22);font:600 13px/1.45 Arial,sans-serif;text-align:center}
    @media(max-width:480px){.tcc-wish-float{right:12px;bottom:calc(82px + env(safe-area-inset-bottom))}.tcc-wish-panel{padding:17px;border-radius:20px 20px 16px 16px}.tcc-wish-actions{grid-template-columns:1fr}.tcc-wish-secondary-actions{grid-template-columns:1fr 1fr}.tcc-wish-actions button{font-size:10px;min-height:44px}.tcc-wish-panel{max-height:88dvh}}
    @media(prefers-reduced-motion:reduce){.tcc-wish-backdrop{backdrop-filter:none}}
    .tcc-continuation-box{margin:12px 0;padding:12px;border:1px solid #cbd8ed;border-radius:12px;background:#f5f8ff;color:#24436e;display:grid;gap:8px}
    .tcc-continuation-box[hidden]{display:none}
    .tcc-continuation-box strong{font-size:12px;font-weight:800}
    .tcc-continuation-box small{font-size:11px;line-height:1.4;color:#526783}
    .tcc-continuation-option,.tcc-continuation-new{width:100%;min-height:40px;padding:9px 11px;border:1px solid #cbd8ed;border-radius:9px;background:#fff;color:#24436e;font:700 12px Arial,sans-serif;text-align:left}
    .tcc-continuation-new{background:transparent;text-align:center;border-style:dashed}

    /* Cart refresh — clean mobile hierarchy */
    .tcc-wish-head{gap:10px;margin-bottom:12px;align-items:center}
    .tcc-wish-head h2{font-size:clamp(23px,5vw,27px);line-height:1.05}
    .tcc-wish-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
    .tcc-order-history-open{min-height:38px;padding:0 13px;border:1px solid rgba(23,60,43,.16);border-radius:999px;background:#f3f4ed;color:#244536;font:700 11px Arial,sans-serif;white-space:nowrap}
    .tcc-wish-close{flex:0 0 38px;width:38px;height:38px;display:grid;place-items:center;line-height:1}
    .tcc-wish-panel{display:flex;flex-direction:column;box-sizing:border-box}
.tcc-wish-list{display:block!important;visibility:visible!important;min-height:0;overflow:visible}
    .tcc-wish-list[hidden]{display:block!important}
    .tcc-wish-empty{display:block!important;visibility:visible!important}
    .tcc-wish-row{grid-template-columns:minmax(0,1fr);gap:8px;padding:14px 0}
    .tcc-wish-row>div:first-child{width:100%;min-width:0}
    .tcc-wish-row>div:first-child strong{font:750 14px/1.35 Manrope,Arial,sans-serif;letter-spacing:-.01em}
    .tcc-wish-row>div:first-child small{font:11px/1.4 Manrope,Arial,sans-serif}
    .tcc-wish-row-price{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-start;gap:12px;flex-wrap:nowrap}
    .tcc-wish-qty{margin-right:auto;gap:9px}
    .tcc-wish-qty button{width:32px;height:32px;border-radius:50%;background:#fff}
    .tcc-wish-qty strong{min-width:14px;text-align:center;font:800 14px Manrope,Arial,sans-serif}
    .tcc-wish-remove{font:700 11px Manrope,Arial,sans-serif}
    .tcc-wish-fulfillment{width:fit-content;max-width:100%;margin-top:9px;padding:7px 10px;border:1px solid rgba(23,60,43,.10);border-radius:9px;background:#f6f5ee;font:650 11px Manrope,Arial,sans-serif}
    .tcc-wish-note-toggle{font:700 11px Manrope,Arial,sans-serif}
    .tcc-wish-customer-field{display:grid;gap:7px;margin:12px 0 10px;padding:13px;border:1px solid rgba(23,60,43,.12);border-radius:13px;background:#fffdf8}
    .tcc-wish-customer-field label{margin-top:2px;font:750 11px Manrope,Arial,sans-serif;letter-spacing:.01em}
    .tcc-wish-customer-field input{min-height:44px;padding:10px 12px;border:1px solid rgba(23,60,43,.16);border-radius:9px;background:#fff;color:#173c2b;font:500 13px Manrope,Arial,sans-serif}
    .tcc-wish-customer-field input::placeholder{color:#9a9b91}
    .tcc-wish-customer-field input:focus{border-color:#8d7337;box-shadow:0 0 0 3px rgba(141,115,55,.10);outline:none}
    .tcc-wish-table-field:not(.tcc-wish-customer-field){padding:13px;border-radius:13px;background:#fffdf8}
    .tcc-wish-table-field label{font:750 11px Manrope,Arial,sans-serif}
    .tcc-wish-panel .tcc-wish-hint{margin:10px 2px 0;color:#788075;font:10px/1.45 Manrope,Arial,sans-serif;text-align:center}
    .tcc-wish-actions{gap:8px}
    .tcc-wish-actions>.tcc-wish-send{min-height:48px;border-radius:11px;background:#173c2b;font:800 12px Manrope,Arial,sans-serif}
    .tcc-wish-secondary-actions button{min-height:40px;border-radius:10px;font:700 11px Manrope,Arial,sans-serif}
    @media(max-width:600px){
      .tcc-wish-backdrop{align-items:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
      .tcc-wish-panel{width:100%;max-height:calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom));padding:16px 14px;border-radius:20px}
      .tcc-wish-head{margin-bottom:8px}
      .tcc-wish-head h2{font-size:24px}
      .tcc-wish-row{padding:12px 0;gap:7px}
      .tcc-wish-row-price{gap:10px}
      .tcc-wish-fulfillment{margin-top:8px}
      .tcc-wish-list{display:block!important;visibility:visible!important;overflow-y:auto;overscroll-behavior:contain;flex:0 0 auto!important;flex-shrink:0!important;min-height:0;max-height:35dvh;padding:0 2px 0 0;margin:0 0 10px}
      .tcc-wish-customer-field{margin-top:10px}
    }
    @media(max-width:360px){
      .tcc-wish-head-actions{gap:6px}
      .tcc-order-history-open{padding:0 10px;font-size:10px}
      .tcc-wish-head h2{font-size:22px}
      .tcc-wish-panel{padding:14px 12px}
    }

    /* Compact mobile cart: condensed product rows and takeaway toggle. */
    .tcc-wish-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:7px!important;padding:7px 0!important;border-bottom:1px solid rgba(23,60,43,.10)!important}
    .tcc-wish-item-info{display:flex!important;flex-direction:column!important;gap:3px!important;min-width:0!important}
    .tcc-wish-item-info>strong{font:750 12px/1.2 Manrope,Arial,sans-serif!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tcc-wish-item-info .tcc-wish-addon-line{font:10px/1.2 Manrope,Arial,sans-serif!important;margin:0!important;color:#777d70!important}
    .tcc-wish-item-options{display:flex!important;align-items:center!important;gap:9px!important;min-height:17px!important}
    .tcc-wish-fulfillment{display:inline-flex!important;align-items:center!important;gap:4px!important;width:auto!important;max-width:100%!important;margin:0!important;padding:2px 5px!important;border:0!important;border-radius:5px!important;background:#f2efe5!important;font:650 9px/1.2 Manrope,Arial,sans-serif!important;color:#536052!important;white-space:nowrap}
    .tcc-wish-fulfillment input{width:12px!important;height:12px!important;margin:0!important;accent-color:#173c2b}
    .tcc-wish-note-toggle{border:0!important;background:transparent!important;padding:2px 0!important;color:#8b7440!important;font:700 9px/1 Manrope,Arial,sans-serif!important;white-space:nowrap}
    .tcc-wish-item-note{width:100%!important;min-height:34px!important;max-height:54px!important;margin-top:3px!important;padding:6px!important;font:11px Manrope,Arial,sans-serif!important}
    .tcc-wish-row-price{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;flex-wrap:nowrap!important;white-space:nowrap!important}
    .tcc-wish-qty{gap:4px!important}
    .tcc-wish-qty button{width:23px!important;height:23px!important;font-size:13px!important}
    .tcc-wish-qty strong{min-width:12px!important;font-size:11px!important}
    .tcc-wish-remove{font-size:9px!important;padding:2px!important}
    @media(max-width:600px){.tcc-wish-list{max-height:38dvh!important;overflow-y:auto!important}.tcc-wish-row{padding:6px 0!important;gap:5px!important}.tcc-wish-item-info>strong{font-size:11px!important}.tcc-wish-fulfillment{font-size:8px!important}}

    .tcc-table-picker-trigger{width:100%;min-height:43px;display:flex;align-items:center;gap:10px;padding:0 12px;border:1px solid rgba(23,60,43,.2);border-radius:10px;background:#fff;color:#173c2b;text-align:left}
    .tcc-table-picker-caption{font:600 11px Manrope,Arial,sans-serif;color:#758075}
    .tcc-table-picker-value{margin-left:auto;font:800 13px Manrope,Arial,sans-serif;color:#173c2b}
    .tcc-table-picker-trigger>span:last-child{font-size:18px;color:#8d7337}
    .tcc-table-picker-backdrop{position:fixed;inset:0;z-index:2147483002;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(7,22,15,.66);backdrop-filter:blur(4px)}
    .tcc-table-picker-backdrop.is-open{display:flex}
    .tcc-table-picker-panel{width:min(100%,460px);max-height:88dvh;overflow:auto;padding:18px;border:1px solid rgba(183,154,90,.55);border-radius:20px;background:#fffaf0;box-shadow:0 18px 60px rgba(0,0,0,.3)}
    .tcc-table-picker-panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .tcc-table-picker-panel h3{margin:0;color:#173c2b;font:700 21px Georgia,serif}
    .tcc-table-picker-panel header small{display:block;margin-top:4px;color:#788075;font:11px Manrope,Arial,sans-serif}
    .tcc-table-picker-close{width:36px;height:36px;border:1px solid rgba(23,60,43,.16);border-radius:50%;background:transparent;color:#173c2b;font-size:23px}
    .tcc-table-picker-panel .tcc-table-groups{margin:8px 0 0}

    /* Refined cart hierarchy: item prices, visible total and tighter form. */
    .tcc-wish-row-price{gap:7px!important}
    .tcc-wish-line-total{display:inline-block!important;min-width:42px!important;text-align:right!important;color:#173c2b!important;font:800 11px Manrope,Arial,sans-serif!important}
    .tcc-wish-total{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:8px 0 10px!important;padding:10px 12px!important;border:1px solid rgba(183,154,90,.35)!important;border-radius:11px!important;background:#f4efdf!important;color:#596454!important;font:700 12px Manrope,Arial,sans-serif!important}
    .tcc-wish-total strong{color:#173c2b!important;font:800 17px Manrope,Arial,sans-serif!important}
    .tcc-wish-customer-field{gap:5px!important;padding:9px 11px!important;margin:8px 0!important}
    .tcc-wish-customer-field label{font-size:10px!important;margin-top:2px!important}
    .tcc-wish-customer-field input{min-height:38px!important;padding:7px 10px!important;font-size:13px!important;border-radius:8px!important}
    .tcc-table-picker-field{gap:5px!important;padding:9px 11px!important;margin:8px 0!important}
    .tcc-table-picker-trigger{min-height:40px!important}
    .tcc-wish-actions{gap:7px!important}
    .tcc-wish-send{min-height:44px!important;border-radius:11px!important;font-size:12px!important;letter-spacing:.01em}
    .tcc-wish-secondary-actions button{min-height:34px!important}
    @media(max-width:600px){
      .tcc-wish-panel{padding:14px 12px!important}
      .tcc-wish-head{margin-bottom:6px!important}
      .tcc-wish-row{padding:6px 0!important}
      .tcc-wish-list{max-height:34dvh!important}
      .tcc-wish-total{margin:6px 0 8px!important;padding:8px 10px!important}
    }

    /* Remove oversized rounded checkout cards; keep fields compact and flat. */
    .tcc-wish-customer-field,.tcc-table-picker-field{
      margin:5px 0!important;
      padding:6px 0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      gap:4px!important;
    }
    .tcc-wish-customer-field label,.tcc-table-picker-field>label{
      margin:2px 0!important;
      font-size:11px!important;
    }
    .tcc-wish-customer-field input{
      min-height:36px!important;
      padding:6px 10px!important;
      border-radius:8px!important;
      font-size:13px!important;
      background:#fff!important;
    }
    .tcc-table-picker-trigger{
      min-height:48px!important;
      padding:0 14px!important;
      border:2px solid #8d7337!important;
      border-radius:11px!important;
      background:#fffdf7!important;
      box-shadow:0 2px 0 rgba(141,115,55,.12),0 0 0 3px rgba(141,115,55,.09)!important;
      cursor:pointer!important;
    }
    .tcc-table-picker-caption{color:#526354!important;font:750 12px Manrope,Arial,sans-serif!important}
    .tcc-table-picker-value{color:#173c2b!important;font:850 14px Manrope,Arial,sans-serif!important}
    .tcc-table-picker-trigger>span:last-child{display:grid!important;place-items:center!important;width:25px!important;height:25px!important;border-radius:7px!important;background:#173c2b!important;color:#fffaf0!important;font-size:17px!important;font-weight:900!important}
    .tcc-table-picker-trigger:focus-visible{outline:3px solid rgba(141,115,55,.35)!important;outline-offset:2px!important}
    .tcc-wish-line-total{display:none!important}
    .tcc-wish-total{display:none!important}
    @media(max-width:600px){
      .tcc-wish-customer-field,.tcc-table-picker-field{
        margin:3px 0!important;
        padding:4px 0!important;
      }
      .tcc-wish-customer-field input{min-height:34px!important}
    }

    /* Keep every cart line in the normal panel flow; never create an inner scroller. */
    .tcc-wish-list{
      display:block!important;
      visibility:visible!important;
      height:auto!important;
      max-height:none!important;
      overflow:visible!important;
      overflow-y:visible!important;
      flex:0 0 auto!important;
      flex-shrink:0!important;
      padding:0 2px 0 0!important;
      margin:0 0 8px!important;
    }
    .tcc-wish-row{padding:5px 0!important;gap:4px!important}
    .tcc-wish-item-info{gap:2px!important}
    .tcc-wish-item-info>strong{font-size:11px!important;line-height:1.15!important}
    .tcc-wish-addon-line{display:block!important;font-size:9px!important;line-height:1.15!important;color:#788075!important}
    .tcc-wish-item-options{gap:7px!important;min-height:15px!important}
    .tcc-wish-fulfillment{padding:1px 4px!important;font-size:8px!important}
    .tcc-wish-fulfillment input{width:11px!important;height:11px!important}
    .tcc-wish-note-toggle{font-size:9px!important}
    .tcc-wish-qty button{width:22px!important;height:22px!important}
    @media(max-width:600px){
      .tcc-wish-list{max-height:none!important;overflow:visible!important;overflow-y:visible!important}
      .tcc-wish-row{padding:4px 0!important}
    }

    /* Practical tap-friendly cart rows: stronger product names, controls and inline takeaway. */
    .tcc-wish-row{grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:6px 0!important}
    .tcc-wish-item-info{gap:3px!important;min-width:0!important}
    .tcc-wish-title-line{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;min-width:0!important;flex-wrap:wrap!important}
    .tcc-wish-item-info> .tcc-wish-title-line>strong{font:800 14px/1.2 Manrope,Arial,sans-serif!important;letter-spacing:-.015em!important;color:#173c2b!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
    .tcc-wish-fulfillment{display:inline-flex!important;align-items:center!important;gap:5px!important;flex:0 0 auto!important;margin:0!important;padding:4px 7px!important;border:1px solid rgba(141,115,55,.28)!important;border-radius:7px!important;background:#f3efdf!important;color:#536052!important;font:750 10px/1.1 Manrope,Arial,sans-serif!important;min-height:27px!important;white-space:nowrap!important}
    .tcc-wish-fulfillment input{width:16px!important;height:16px!important;margin:0!important;accent-color:#173c2b}
    .tcc-wish-addon-line{font:600 11px/1.25 Manrope,Arial,sans-serif!important;color:#737b6e!important}
    .tcc-wish-item-options{min-height:22px!important;gap:8px!important}
    .tcc-wish-note-toggle{font:750 11px/1 Manrope,Arial,sans-serif!important;padding:5px 3px!important;min-height:28px!important}
    .tcc-wish-qty{gap:6px!important}
    .tcc-wish-qty button{width:34px!important;height:34px!important;min-width:34px!important;border-radius:50%!important;font-size:18px!important;font-weight:800!important}
    .tcc-wish-qty strong{min-width:18px!important;font-size:14px!important;font-weight:800!important}
    .tcc-wish-remove{min-height:32px!important;min-width:44px!important;padding:5px 4px!important;font:750 11px Manrope,Arial,sans-serif!important}
    .tcc-wish-row-price{gap:6px!important}
    @media(max-width:600px){
      .tcc-wish-row{gap:7px!important;padding:5px 0!important}
      .tcc-wish-item-info> .tcc-wish-title-line>strong{font-size:13px!important}
      .tcc-wish-fulfillment{font-size:9px!important;min-height:26px!important;padding:3px 6px!important}
      .tcc-wish-fulfillment input{width:15px!important;height:15px!important}
      .tcc-wish-qty button{width:32px!important;height:32px!important;min-width:32px!important}
      .tcc-wish-remove{min-width:42px!important;font-size:10px!important}
    }

    /* Product row hierarchy: title + note action on first line, takeaway below. */
    .tcc-wish-title-line{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;flex-wrap:nowrap!important;min-width:0!important}
    .tcc-wish-item-info>.tcc-wish-title-line>strong{font-size:14px!important;line-height:1.2!important;flex:0 1 auto!important;min-width:0!important}
    .tcc-wish-note-inline{flex:0 0 auto!important;min-height:28px!important;padding:4px 7px!important;border:1px solid rgba(141,115,55,.28)!important;border-radius:7px!important;background:#f8f3e6!important;color:#8b7440!important;font:800 10px/1 Manrope,Arial,sans-serif!important;white-space:nowrap!important}
    .tcc-wish-item-options{display:flex!important;align-items:center!important;gap:7px!important;margin-top:3px!important;min-height:25px!important}
    .tcc-wish-fulfillment{min-height:26px!important;padding:3px 7px!important;font-size:10px!important}
    .tcc-wish-fulfillment input{width:15px!important;height:15px!important}
    .tcc-wish-addon-line{font-size:11px!important;line-height:1.25!important}
    @media(max-width:600px){
      .tcc-wish-item-info>.tcc-wish-title-line>strong{font-size:13px!important}
      .tcc-wish-note-inline{font-size:9px!important;min-height:27px!important;padding:4px 6px!important}
      .tcc-wish-item-options{margin-top:2px!important;min-height:24px!important}
      .tcc-wish-fulfillment{font-size:9px!important;min-height:25px!important}
    }

    .tcc-wish-addon-line{
      display:block!important;
      margin:2px 0 1px!important;
      color:#737b6e!important;
      font:600 11px/1.3 Manrope,Arial,sans-serif!important;
      overflow-wrap:anywhere!important;
    }

  `;
  document.head.appendChild(style);
  const float=document.createElement('button');
  float.type='button';float.className='tcc-wish-float';float.innerHTML='<svg class="tcc-cart-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"></path></svg><span>Cart</span><span class="tcc-wish-count">0</span>';
  float.setAttribute('aria-label','Open cart');
  const backdrop=document.createElement('div');backdrop.className='tcc-wish-backdrop';backdrop.setAttribute('aria-hidden','true');
  backdrop.innerHTML='<section class="tcc-wish-panel" role="dialog" aria-modal="true" aria-labelledby="tccWishTitle"><div class="tcc-wish-head"><h2 id="tccWishTitle">Your Cart</h2><div class="tcc-wish-head-actions"><button type="button" class="tcc-order-history-open">Order History</button><button type="button" class="tcc-wish-close" aria-label="Close cart">×</button></div></div><div class="tcc-wish-list"></div><div class="tcc-wish-table-field tcc-wish-customer-field"><label for="tccCustomerName">Customer name <small>(Optional)</small></label><input id="tccCustomerName" type="text" maxlength="60" placeholder="Enter your name (optional)" autocomplete="name" /><label for="tccCustomerPhone">Mobile number <span>*</span></label><input id="tccCustomerPhone" type="tel" maxlength="15" inputmode="numeric" placeholder="Enter 10-digit mobile number" autocomplete="tel" required /></div><div class="tcc-wish-table-field tcc-table-picker-field"><label class="tcc-table-label">Select table <span>*</span></label><button type="button" class="tcc-table-picker-trigger"><span class="tcc-table-picker-caption">Choose your table</span><strong class="tcc-table-picker-value">Not selected</strong><span aria-hidden="true">⌄</span></button><small class="tcc-wish-table-error" role="alert"></small><div class="tcc-continuation-box" aria-live="polite" hidden></div></div><div class="tcc-table-picker-backdrop" aria-hidden="true"><section class="tcc-table-picker-panel" role="dialog" aria-modal="true" aria-labelledby="tccTablePickerTitle"><header><div><h3 id="tccTablePickerTitle">Choose Your Table</h3><small>Select your table from the café layout</small></div><button type="button" class="tcc-table-picker-close" aria-label="Close table selector">×</button></header><div class="tcc-table-groups" aria-label="Café floor plan table selector"><div class="tcc-table-options"><button type="button" data-table="S6">S6</button><button type="button" data-table="S5">S5</button><button type="button" data-table="S4">S4</button><button type="button" data-table="S3">S3</button><button type="button" data-table="S2">S2</button><button type="button" data-table="S1">S1</button><button type="button" data-table="C4">C4</button><button type="button" data-table="C3">C3</button><button type="button" data-table="C2">C2</button><button type="button" data-table="C1">C1</button><button type="button" data-table="P3">P3</button><button type="button" data-table="P2">P2</button><button type="button" data-table="P1">P1</button></div><div class="tcc-table-counter" aria-label="Counter">COUNTER</div><div class="tcc-table-entrance" aria-hidden="true">ENTRANCE</div></div></section></div><div class="tcc-wish-total"><span>Order subtotal</span><strong>₹0</strong></div><div class="tcc-wish-actions"><button type="button" class="tcc-wish-send">Place Order</button><div class="tcc-wish-secondary-actions"><button type="button" class="tcc-wish-clear secondary">Clear Cart</button><button type="button" class="tcc-wish-continue">Continue browsing</button></div></div><p class="tcc-wish-hint">Your order will be sent directly to the TCC kitchen. You will receive an order reference after successful placement.</p></section>';
  const choice=document.createElement('div');choice.className='tcc-wish-choice';choice.setAttribute('aria-hidden','true');
  choice.innerHTML='<section class="tcc-wish-choice-panel" role="dialog" aria-modal="true" aria-labelledby="tccChoiceTitle"><header class="tcc-wish-choice-header"><div class="tcc-wish-choice-thumb"></div><div class="tcc-wish-choice-heading"><h3 id="tccChoiceTitle" class="tcc-wish-choice-title">Choose add-ons</h3><p>Select up to 3 add-ons · No Add-ons is also available</p></div><button type="button" class="tcc-wish-choice-close" aria-label="Close customisation">×</button></header><div class="tcc-wish-choice-body"><div class="tcc-wish-choice-section-title"><span>Choose your add-ons</span><small>Up to 3</small></div><div class="tcc-wish-addon-options"></div></div><footer class="tcc-wish-choice-footer"><div class="tcc-choice-qty"><button type="button" class="tcc-choice-minus" aria-label="Decrease quantity">−</button><strong class="tcc-choice-quantity">1</strong><button type="button" class="tcc-choice-plus" aria-label="Increase quantity">+</button></div><div class="tcc-wish-choice-actions"><button type="button" class="tcc-wish-choice-confirm">Add Item · ₹0</button><button type="button" class="tcc-wish-choice-cancel secondary">Cancel</button></div></footer></section>';
  document.body.append(float,backdrop,choice);
  let pendingProduct=null,choiceQuantity=1;
  let orderType='dine-in',selectedTable='',customerName='',customerPhone='';
  let continuationOrder=null,recentOrderCheck=0;
  const historyPanel=document.createElement('div');historyPanel.className='tcc-order-history-backdrop';historyPanel.setAttribute('aria-hidden','true');
  historyPanel.innerHTML='<section class="tcc-order-history-panel" role="dialog" aria-modal="true"><header><h2>Order History</h2><button type="button" class="tcc-order-history-close" aria-label="Close order history">×</button></header><div class="tcc-order-lookup"><label for="tccOrderLookup">Find orders on this or another device</label><div><input id="tccOrderLookup" type="text" maxlength="30" placeholder="Order reference or mobile number" autocomplete="off"><button type="button" class="tcc-order-lookup-button">Find</button></div><small>Enter either your order reference or the mobile number used to place the order.</small><p class="tcc-order-lookup-message" role="status"></p><div class="tcc-order-lookup-results"></div></div><h3 class="tcc-order-history-subtitle">Orders on this device</h3><div class="tcc-order-history-list"></div><button type="button" class="tcc-order-history-new">＋ Start a New Order</button></section>';
  document.body.append(historyPanel);
  const closeChoice=()=>{choice.classList.remove('is-open');choice.setAttribute('aria-hidden','true');pendingProduct=null;};
  const lookupInput=historyPanel.querySelector('#tccOrderLookup'),lookupButton=historyPanel.querySelector('.tcc-order-lookup-button'),lookupMessage=historyPanel.querySelector('.tcc-order-lookup-message'),lookupResults=historyPanel.querySelector('.tcc-order-lookup-results');
  const continuationBox=backdrop.querySelector('.tcc-continuation-box');
  const checkRecentOrders=async()=>{
    // Read the live form values as browsers may autofill fields without firing input events.
    customerName=backdrop.querySelector('#tccCustomerName').value.trimStart();
    customerPhone=backdrop.querySelector('#tccCustomerPhone').value.trim();
    const activeOrderType=backdrop.querySelector('[data-order-type].active');
    if(activeOrderType)orderType=activeOrderType.dataset.orderType;
    const activeTable=backdrop.querySelector('[data-table].active');
    if(activeTable)selectedTable=activeTable.dataset.table;
    const requestId=++recentOrderCheck,phone=customerPhone.replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'');
    continuationBox.hidden=true;continuationBox.replaceChildren();
    if(!/^\d{10}$/.test(phone)||(orderType==='dine-in'&&!selectedTable))return;
    if(continuationOrder&&continuationOrder.customer_phone===phone&&continuationOrder.order_type===orderType&&(orderType!=='dine-in'||continuationOrder.table_number===selectedTable)){renderContinuationChoice();return;}
    const message=document.createElement('small');message.textContent='Checking for a recent order…';continuationBox.append(message);continuationBox.hidden=false;
    try{
      const url='https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=recent-orders&phone='+encodeURIComponent(phone)+'&order_type='+encodeURIComponent(orderType)+'&table_number='+encodeURIComponent(selectedTable);
      const response=await fetch(url,{headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'}});
      const data=await response.json().catch(()=>({}));if(requestId!==recentOrderCheck)return;
      continuationBox.replaceChildren();const orders=data.orders||[];
      if(!response.ok||!orders.length){continuationBox.hidden=true;continuationOrder=null;return;}
      const heading=document.createElement('strong');heading.textContent='Already placed an order recently?';continuationBox.append(heading);
      const help=document.createElement('small');help.textContent='Choose an order to mark this as a continuation, or place a new order.';continuationBox.append(help);
      orders.forEach(order=>{const button=document.createElement('button');button.type='button';button.className='tcc-continuation-option';button.textContent='Continue '+order.order_number+' · '+new Date(order.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});button.addEventListener('click',()=>{continuationOrder={...order,customer_phone:phone,order_type:orderType,table_number:selectedTable};renderContinuationChoice();});continuationBox.append(button);});
      const fresh=document.createElement('button');fresh.type='button';fresh.className='tcc-continuation-new';fresh.textContent='Place as a new order';fresh.addEventListener('click',()=>{continuationOrder=null;continuationBox.hidden=true;});continuationBox.append(fresh);
    }catch{if(requestId===recentOrderCheck)continuationBox.hidden=true;}
  };
  const renderContinuationChoice=()=>{
    continuationBox.replaceChildren();continuationBox.hidden=false;
    const label=document.createElement('strong');label.textContent='CONTINUATION OF '+continuationOrder.order_number;continuationBox.append(label);
    const change=document.createElement('button');change.type='button';change.className='tcc-continuation-new';change.textContent='Change / place as new';change.addEventListener('click',()=>{continuationOrder=null;checkRecentOrders();});continuationBox.append(change);
  };

  const runOrderLookup=async()=>{const value=lookupInput.value.trim();lookupMessage.textContent='';lookupResults.replaceChildren();if(!value){lookupMessage.textContent='Enter an order reference or mobile number.';return;}lookupButton.disabled=true;lookupButton.textContent='Finding…';try{const response=await fetch('https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=order-lookup&lookup='+encodeURIComponent(value),{headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Could not find orders.');const orders=data.orders||[];if(!orders.length){lookupMessage.textContent='No matching orders found.';return;}orders.forEach(order=>{const row=document.createElement('div');row.className='tcc-order-lookup-result';const title=document.createElement('strong');title.textContent=order.order_number;const status=document.createElement('span');status.className='tcc-order-lookup-status';const rawStatus=String(order.status||'unknown').toLowerCase();status.textContent=rawStatus.charAt(0).toUpperCase()+rawStatus.slice(1);const meta=document.createElement('span');meta.textContent=new Date(order.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})+' · '+(order.order_type==='dine-in'?'Dine-in'+(order.table_number?' · '+order.table_number:''):'Takeaway')+' · ₹'+Number(order.total||0).toLocaleString('en-IN');const view=document.createElement('button');view.type='button';view.className='tcc-order-history-view';view.textContent='View Order';view.setAttribute('aria-expanded','false');const detail=document.createElement('div');detail.className='tcc-order-history-detail';detail.hidden=true;if(order.customer_name){const customer=document.createElement('p');customer.textContent='Customer: '+order.customer_name;detail.append(customer);}(order.items||[]).forEach(item=>{const line=document.createElement('div');line.className='tcc-order-history-line';const itemTitle=document.createElement('strong');itemTitle.textContent=Number(item.quantity||1)+' × '+item.name+' · '+(item.item_status==='cancelled'?'Cancelled':item.item_status==='completed'?'Completed':(item.item_status==='preparing'||(!item.item_status&&order.status!=='new'))?'Preparing':'Awaiting acceptance');line.append(itemTitle);const fulfillment=document.createElement('small');fulfillment.textContent=(item.fulfillment_type==='takeaway'||(order.order_type==='takeaway'&&!item.fulfillment_type))?'Pack as takeaway':'Dine-in · Serve at table';line.append(fulfillment);if(item.addons?.length){const addons=document.createElement('small');addons.textContent='Add-ons: '+item.addons.map(a=>a.name).join(', ');line.append(addons);}if(item.note){const note=document.createElement('small');note.textContent='Note: '+item.note;line.append(note);}detail.append(line);});view.addEventListener('click',()=>{detail.hidden=!detail.hidden;view.textContent=detail.hidden?'View Order':'Hide Order';view.setAttribute('aria-expanded',String(!detail.hidden));});row.append(title,status,meta,view,detail);lookupResults.append(row);});}catch(error){lookupMessage.textContent=error.message||'Unable to find orders.';}finally{lookupButton.disabled=false;lookupButton.textContent='Find';}};
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
    (order.items||[]).forEach(item=>{const line=document.createElement('div');line.className='tcc-order-history-line';const title=document.createElement('strong');title.textContent=Math.max(1,Number(item.quantity||item.qty)||1)+' × '+item.name+' · '+(item.item_status==='cancelled'?'Cancelled':item.item_status==='completed'?'Completed':(item.item_status==='preparing'||(!item.item_status&&order.status!=='new'))?'Preparing':'Awaiting acceptance');line.append(title);const fulfillment=document.createElement('small');fulfillment.textContent=(item.fulfillment_type==='takeaway'||(order.orderType==='Takeaway'&&!item.fulfillment_type))?'Pack as takeaway':'Dine-in · Serve at table';line.append(fulfillment);if(item.addons?.length){const addons=document.createElement('small');addons.textContent='Add-ons: '+item.addons.map(x=>x.name).join(', ');line.append(addons);}if(item.note?.trim()){const note=document.createElement('small');note.textContent='Note: '+item.note.trim();line.append(note);}detail.append(line);});
    view.addEventListener('click',()=>{detail.hidden=!detail.hidden;view.textContent=detail.hidden?'View Order':'Hide Order';view.setAttribute('aria-expanded',String(!detail.hidden));});
    actions.append(view);
    card.append(top,meta,actions,detail);list.append(card);
  });};
  let historyRefreshTimer=null;
  const refreshCustomerOrderStatuses=async()=>{const history=readHistory();let changed=false;await Promise.all(history.filter(order=>order.ref&&order.customerPhone).map(async order=>{try{const url='https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=order-status&order_number='+encodeURIComponent(order.ref)+'&phone='+encodeURIComponent(order.customerPhone);const response=await fetch(url,{headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'}});if(!response.ok)return;const data=await response.json();if(data.order){if(order.kitchenStatus!==data.order.status){order.kitchenStatus=data.order.status;changed=true;}if(data.order.items&&JSON.stringify(order.items)!==JSON.stringify(data.order.items)){order.items=data.order.items;changed=true;}if(data.order.total!==undefined&&order.total!==data.order.total){order.total=data.order.total;changed=true;}}}catch{}}));if(changed){saveHistory(history);renderHistory();}};
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
    const selected=[...choice.querySelectorAll('.tcc-wish-addon-options input[type="checkbox"]:checked,.tcc-wish-addon-options input[type="radio"][data-addon-index]:checked')].map(input=>pendingProduct.options[Number(input.value)]);
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
    const singleChoice=data.name==='Hot Chocolate';
    const none=document.createElement('label'),noneInput=document.createElement('input');noneInput.type='radio';noneInput.name='tccWishNoAddon';noneInput.checked=!singleChoice&&!(editItem?.addons||[]).length;none.append(noneInput,document.createTextNode(singleChoice?'Choose an option':'No Add-ons'));wrap.append(none);
    options.forEach((opt,index)=>{const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),price=document.createElement('span');input.type=singleChoice?'radio':'checkbox';if(singleChoice){input.name='tccHotChocolateOption';input.dataset.addonIndex=String(index);}input.value=String(index);input.checked=!!editItem&&(editItem.addons||[]).some(item=>item.name===opt.name);name.textContent=opt.name;price.className='tcc-addon-price';price.textContent='+'+money(opt.price);input.addEventListener('change',()=>{if(!singleChoice&&wrap.querySelectorAll('input[type="checkbox"]:checked').length>3)input.checked=false;if(singleChoice)noneInput.checked=false;else noneInput.checked=wrap.querySelectorAll('input[type="checkbox"]:checked').length===0;updateChoiceSummary();});label.append(input,name,price);wrap.append(label);});
    if(singleChoice&&!(editItem?.addons||[]).length)noneInput.checked=true;
    noneInput.addEventListener('change',()=>{wrap.querySelectorAll('input[type="checkbox"],input[data-addon-index]').forEach(x=>x.checked=false);updateChoiceSummary();});
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
    list.style.setProperty('display','block','important');
    list.style.setProperty('visibility','visible','important');
    list.style.setProperty('flex','0 0 auto','important');
    list.style.setProperty('flex-shrink','0','important');
    list.style.minHeight=items.length?'64px':'0';
    list.innerHTML='';
    if(!items.length){list.innerHTML='<div class="tcc-wish-empty">Your cart is empty.<br>Add your favourite items from the menu.</div>';}
    items.forEach(item=>{
      const row=document.createElement('div');row.className='tcc-wish-row';
      const info=document.createElement('div');info.className='tcc-wish-item-info';
      const titleLine=document.createElement('div');titleLine.className='tcc-wish-title-line';
      const title=document.createElement('strong');title.textContent=item.name;titleLine.append(title);
      info.append(titleLine);
      if(Array.isArray(item.addons)&&item.addons.length){
        const addonLine=document.createElement('small');
        addonLine.className='tcc-wish-addon-line';
        addonLine.textContent='Add-ons: '+item.addons.map(addon=>addon.name).filter(Boolean).join(' · ');
        info.append(addonLine);
      }
      const fulfillment=document.createElement('label');fulfillment.className='tcc-wish-fulfillment';const fulfillmentInput=document.createElement('input');fulfillmentInput.type='checkbox';fulfillmentInput.checked=item.fulfillment_type==='takeaway'||(orderType==='takeaway');fulfillmentInput.setAttribute('aria-label','Pack '+item.name+' as takeaway (+₹10 each)');fulfillmentInput.addEventListener('change',()=>{item.fulfillment_type=fulfillmentInput.checked?'takeaway':'dine-in';save();render();});const fulfillmentText=document.createElement('span');fulfillmentText.textContent='Takeaway +₹10';fulfillment.append(fulfillmentInput,fulfillmentText);
      const itemOptions=document.createElement('div');itemOptions.className='tcc-wish-item-options';itemOptions.append(fulfillment);
      info.append(itemOptions);
      const price=document.createElement('div');price.className='tcc-wish-row-price';
      const unitPrice=item.price+(item.addons||[]).reduce((sum,x)=>sum+x.price,0);
      const amount=document.createElement('span');amount.className='tcc-wish-line-total';amount.textContent='';
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
    // Always show the beginning of the cart after rebuilding it. The previous
    // scroll position could otherwise leave the first item half-hidden.
    list.scrollTop=0;
    list.style.setProperty('max-height','none','important');
    list.style.setProperty('height','auto','important');
    list.style.setProperty('overflow','visible','important');
    list.style.setProperty('flex','0 0 auto','important');
    
    const totalBox=backdrop.querySelector('.tcc-wish-total');
    totalBox.innerHTML='';
    totalBox.style.display='none';
    backdrop.querySelector('.tcc-wish-table-field').style.display=items.length?'block':'none';
    backdrop.querySelector('.tcc-wish-actions').style.display=items.length?'grid':'none';
    backdrop.querySelector('.tcc-wish-continue').style.display=items.length?'block':'none';
    backdrop.querySelector('.tcc-table-options').hidden=false;
    backdrop.querySelector('.tcc-table-label').hidden=false;
    backdrop.querySelectorAll('[data-table]').forEach(button=>button.classList.toggle('active',button.dataset.table===selectedTable));
    const tableValue=backdrop.querySelector('.tcc-table-picker-value');
    if(tableValue)tableValue.textContent=selectedTable||'Not selected';
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
      let row=card.querySelector(':scope > .tcc-price-action-row');
      if(!row){
        row=document.createElement('div');
        row.className='tcc-price-action-row';
        price.parentElement.insertBefore(row,price);
      }
      if(price.parentElement!==row)row.appendChild(price);
      if(control.parentElement!==row)row.appendChild(control);
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
  const open=()=>{
    if(backdrop.classList.contains('is-open'))return;
    // Re-read saved cart data and rebuild rows every time the cart opens.
    // This prevents a blank/stale item list after returning to the menu.
    items=read().map(item=>({...item,qty:Math.max(1,Number(item.qty)||1)}));
    render();
    const cartList=backdrop.querySelector('.tcc-wish-list');
    if(cartList){
      cartList.hidden=false;
      cartList.style.setProperty('display','block','important');
      cartList.style.setProperty('visibility','visible','important');
    }
    // Give the cart its own browser-history entry so Android/iOS Back closes
    // the cart first instead of leaving the menu page.
    if(!history.state?.tccCartOpen){
      history.pushState({...history.state,tccCartOpen:true},"",window.location.href);
    }
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    backdrop.querySelector('.tcc-wish-close').focus();
    requestAnimationFrame(()=>checkRecentOrders());
    setTimeout(checkRecentOrders,180);
  };
  const close=(fromPopState=false)=>{
    if(!backdrop.classList.contains('is-open'))return;
    if(!fromPopState&&history.state?.tccCartOpen){
      history.back();
      return;
    }
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  };
  window.addEventListener('popstate',()=>{
    if(backdrop.classList.contains('is-open'))close(true);
  });
  float.addEventListener('click',open);
  backdrop.querySelector('.tcc-wish-close').addEventListener('click',close);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&backdrop.classList.contains('is-open'))close()});
  choice.querySelector('.tcc-wish-choice-close').addEventListener('click',closeChoice);
  choice.querySelector('.tcc-wish-choice-confirm').addEventListener('click',()=>{
    if(!pendingProduct)return;
    const current=pendingProduct,wrap=choice.querySelector('.tcc-wish-addon-options');
    const selected=[...wrap.querySelectorAll('input[type="checkbox"]:checked,input[type="radio"][data-addon-index]:checked')] .slice(0,3).map(input=>current.options[Number(input.value)]);
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
  backdrop.querySelector('#tccCustomerName').addEventListener('change',event=>{customerName=event.target.value.trimStart();});
  backdrop.querySelector('#tccCustomerPhone').addEventListener('input',event=>{customerPhone=event.target.value.trim();if(customerPhone.replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'').length===10)checkRecentOrders();});
  backdrop.querySelector('#tccCustomerPhone').addEventListener('change',checkRecentOrders);
  backdrop.querySelector('#tccCustomerPhone').addEventListener('blur',checkRecentOrders);
  backdrop.querySelector('.tcc-order-history-open').addEventListener('click',openHistory);
  document.querySelector('.tcc-mobile-track')?.addEventListener('click',()=>{openHistory();setTimeout(()=>lookupInput?.focus(),80);});
  document.querySelector('.tcc-mobile-history')?.addEventListener('click',()=>{openHistory();setTimeout(()=>historyPanel.querySelector('.tcc-order-history-subtitle')?.scrollIntoView({block:'start',behavior:'smooth'}),100);});
  historyPanel.querySelector('.tcc-order-history-close').addEventListener('click',closeHistory);
  historyPanel.querySelector('.tcc-order-history-new').addEventListener('click',()=>{closeHistory();backdrop.classList.remove('is-open');backdrop.setAttribute('aria-hidden','true');});
  const tablePicker=document.querySelector('.tcc-table-picker-backdrop');
  const closeTablePicker=()=>{tablePicker.classList.remove('is-open');tablePicker.setAttribute('aria-hidden','true');};
  backdrop.querySelector('.tcc-table-picker-trigger').addEventListener('click',()=>{tablePicker.classList.add('is-open');tablePicker.setAttribute('aria-hidden','false');});
  tablePicker.querySelector('.tcc-table-picker-close').addEventListener('click',closeTablePicker);
  tablePicker.addEventListener('click',event=>{if(event.target===tablePicker)closeTablePicker();});
  tablePicker.querySelectorAll('[data-table]').forEach(button=>button.addEventListener('click',()=>{selectedTable=button.dataset.table;continuationOrder=null;backdrop.querySelector('.tcc-wish-table-error').textContent='';render();closeTablePicker();checkRecentOrders();}));

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
    const order={ref:'',dateTime,dayKey,orderSequence:sameOrderSession.length+1,orderType:orderType==='dine-in'?'Dine-in':'Takeaway',table:orderType==='dine-in'?tableNumber:'',customerName:customerName.trim(),customerPhone:normalizedPhone,status:'New',kitchenStatus:'new',items:items.map(item=>({...item,fulfillment_type:orderType==='takeaway'?'takeaway':(item.fulfillment_type==='takeaway'?'takeaway':'dine-in'),addons:(item.addons||[]).map(addon=>({...addon}))}))};
    let requestKey='';
    const requestSignature=JSON.stringify({phone:normalizedPhone,type:orderType,table:tableNumber,parent:continuationOrder?.order_number||'',name:customerName.trim(),items:items.map(item=>({name:item.name,qty:item.qty,price:item.price,addons:item.addons||[],note:item.note||'',fulfillment_type:item.fulfillment_type||'dine-in'}))});
    if(continuationOrder&&(continuationOrder.customer_phone!==normalizedPhone||continuationOrder.order_type!==orderType||(orderType==='dine-in'&&continuationOrder.table_number!==tableNumber)))continuationOrder=null;
    try{const priorSignature=sessionStorage.getItem('tccPendingOrderSignature');requestKey=sessionStorage.getItem('tccPendingOrderRequestKey')||'';if(!requestKey||priorSignature!==requestSignature){requestKey=crypto.randomUUID();sessionStorage.setItem('tccPendingOrderRequestKey',requestKey);sessionStorage.setItem('tccPendingOrderSignature',requestSignature);}}catch{requestKey=crypto.randomUUID();}
    try{
      const apiResponse=await fetch('https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders?action=create-order',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A'},
        body:JSON.stringify({idempotency_key:requestKey,parent_order_number:continuationOrder?.order_number||null,customer_name:customerName.trim(),customer_phone:normalizedPhone,order_type:orderType,table_number:tableNumber,items:items.map(item=>({name:item.name,quantity:item.qty,unit_price:item.price,category:item.category,section:item.section,addons:item.addons||[],note:item.note||'',fulfillment_type:orderType==='takeaway'?'takeaway':(item.fulfillment_type==='takeaway'?'takeaway':'dine-in')}))})
      });
      const saved=await apiResponse.json().catch(()=>({}));
      if(!apiResponse.ok||!saved.order)throw new Error(saved.error||'We could not confirm your order. Your cart is saved; please retry.');
      order.ref=saved.order.order_number;order.parentOrderRef=continuationOrder?.order_number||'';order.status=saved.order.status||'new';order.kitchenStatus=saved.order.status||'new';order.total=saved.order.total;
      history.unshift(order);saveHistory(history);
      items=[];save();continuationOrder=null;continuationBox.hidden=true;render();close();
      try{sessionStorage.removeItem('tccPendingOrderRequestKey');sessionStorage.removeItem('tccPendingOrderSignature');}catch{}
      const notice=document.createElement('div');notice.className='tcc-order-send-notice';notice.setAttribute('role','status');
      notice.innerHTML='<strong>Order placed successfully!</strong><br>Reference: '+order.ref+'<br>Your order has been sent to TCC’s kitchen. Track its progress in Order History.';
      document.body.append(notice);setTimeout(()=>notice.remove(),9000);
    }catch(error){tableError.textContent=error.message||'Unable to place your order. Your cart is saved — please retry.';}
    finally{orderSubmissionBusy=false;sendButton.disabled=false;sendButton.textContent='Place Order';}
  });
  render();
})();