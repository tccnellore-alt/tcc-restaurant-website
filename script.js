const body=document.body,toggle=document.querySelector('[data-toggle]'),close=document.querySelector('[data-close]'),overlay=document.querySelector('[data-overlay]');function setOpen(v){body.classList.toggle('open',v);toggle?.setAttribute('aria-expanded',v)}toggle?.addEventListener('click',()=>setOpen(!body.classList.contains('open')));close?.addEventListener('click',()=>setOpen(false));overlay?.addEventListener('click',()=>setOpen(false));document.querySelectorAll('.drawer a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});

/* TCC Customer Wishlist — menu-page only */
(function(){
  if(!document.querySelector('.menu-page')) return;
  const STORAGE_KEY='tccCustomerWishlistV1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}};
  let items=read();
  const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}catch{}};
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  const clean=s=>(s||'').replace(/\s+/g,' ').trim();
  const getData=card=>{
    const name=clean(card.querySelector('h3')?.childNodes[0]?.textContent || card.querySelector('h3')?.textContent);
    const priceText=clean(card.querySelector(':scope > strong')?.textContent);
    const price=Number((priceText.match(/[\d,]+/)||['0'])[0].replace(/,/g,''));
    const category=clean(card.closest('.menu-group')?.getAttribute('data-group')||'Menu');
    return {name,price,category,key:(category+'|'+name).toLowerCase()};
  };
  const style=document.createElement('style');
  style.textContent=`
    .tcc-wish-add{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;margin:8px 0 0;padding:7px 10px;border:1px solid rgba(23,60,43,.2);border-radius:999px;background:#f4eee1;color:#173c2b;font:800 10px/1 Arial,sans-serif;cursor:pointer}
    .tcc-wish-add.is-added{background:#173c2b;color:#fff;border-color:#173c2b}
    .tcc-wish-float{position:fixed;right:16px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:2100;display:flex;align-items:center;gap:9px;min-height:48px;padding:0 17px;border:1px solid #d6bd82;border-radius:999px;background:#173c2b;color:#fffaf0;box-shadow:0 8px 24px rgba(0,0,0,.22);font:800 12px Arial,sans-serif;cursor:pointer}
    .tcc-wish-count{display:grid;place-items:center;min-width:21px;height:21px;padding:0 5px;border-radius:50%;background:#f2dfb0;color:#173c2b;font-size:10px}
    .tcc-wish-backdrop{position:fixed;inset:0;z-index:10000;display:none;align-items:flex-end;justify-content:center;padding:16px;background:rgba(7,22,15,.62);backdrop-filter:blur(4px)}
    .tcc-wish-backdrop.is-open{display:flex}
    .tcc-wish-panel{width:min(100%,560px);max-height:min(82dvh,760px);overflow:auto;border:1px solid rgba(183,154,90,.55);border-radius:22px;background:#fffaf0;color:#173c2b;box-shadow:0 20px 70px rgba(0,0,0,.3);padding:20px}
    .tcc-wish-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .tcc-wish-head h2{margin:0;font:600 27px Georgia,serif;color:#173c2b}
    .tcc-wish-close{width:36px;height:36px;border:1px solid rgba(23,60,43,.16);border-radius:50%;background:transparent;color:#173c2b;font-size:23px;cursor:pointer}
    .tcc-wish-empty{padding:34px 10px;text-align:center;color:#68756c;font:13px/1.5 Arial,sans-serif}
    .tcc-wish-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:13px 0;border-bottom:1px solid rgba(23,60,43,.12)}
    .tcc-wish-row strong{display:block;font:700 14px/1.35 Arial,sans-serif;color:#173c2b}
    .tcc-wish-row small{display:block;margin-top:4px;color:#7b806f;font:11px Arial,sans-serif}
    .tcc-wish-row-price{display:flex;align-items:center;gap:7px;white-space:nowrap;color:#8d7337;font:800 13px Arial,sans-serif}.tcc-wish-qty{display:flex;align-items:center;gap:5px;color:#173c2b}.tcc-wish-qty button{width:25px;height:25px;border:1px solid rgba(23,60,43,.2);border-radius:50%;background:#fff;color:#173c2b;font:700 15px Arial,sans-serif;cursor:pointer}
    .tcc-wish-remove{border:0;background:transparent;color:#a33e34;font:700 11px Arial,sans-serif;cursor:pointer;padding:5px}
    .tcc-wish-total{display:none!important}
    .tcc-wish-total strong{font-size:18px;color:#8d7337}
    .tcc-wish-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .tcc-wish-actions button{min-height:46px;border:1px solid #173c2b;border-radius:12px;background:#173c2b;color:#fffaf0;font:800 11px Arial,sans-serif;cursor:pointer}
    .tcc-wish-actions button.secondary{background:transparent;color:#173c2b}
    .tcc-wish-hint{margin:12px 0 0;color:#788075;font:11px/1.45 Arial,sans-serif;text-align:center}
    @media(max-width:480px){.tcc-wish-float{right:12px;bottom:calc(82px + env(safe-area-inset-bottom))}.tcc-wish-panel{padding:17px;border-radius:20px 20px 16px 16px}.tcc-wish-actions{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.tcc-wish-backdrop{backdrop-filter:none}}
  `;
  document.head.appendChild(style);
  const float=document.createElement('button');
  float.type='button';float.className='tcc-wish-float';float.innerHTML='<span aria-hidden="true">♡</span><span>Wishlist</span><span class="tcc-wish-count">0</span>';
  float.setAttribute('aria-label','Open wishlist');
  const backdrop=document.createElement('div');backdrop.className='tcc-wish-backdrop';backdrop.setAttribute('aria-hidden','true');
  backdrop.innerHTML='<section class="tcc-wish-panel" role="dialog" aria-modal="true" aria-labelledby="tccWishTitle"><div class="tcc-wish-head"><h2 id="tccWishTitle">Your Wishlist</h2><button type="button" class="tcc-wish-close" aria-label="Close wishlist">×</button></div><div class="tcc-wish-list"></div><div class="tcc-wish-total"><span>Estimated total</span><strong>₹0</strong></div><div class="tcc-wish-actions"><button type="button" class="tcc-wish-show">Show to Manager</button><button type="button" class="tcc-wish-clear secondary">Clear Wishlist</button></div><p class="tcc-wish-hint">Show this list to the TCC manager when placing your order. Final order and availability will be confirmed by the team.</p></section>';
  document.body.append(float,backdrop);
  const count=()=>float.querySelector('.tcc-wish-count');
  const render=()=>{
    count().textContent=items.reduce((s,x)=>s+x.qty,0);
    document.querySelectorAll('.m-item').forEach(card=>{
      const data=getData(card),btn=card.querySelector('.tcc-wish-add');
      if(btn){const added=items.some(x=>x.key===data.key);btn.classList.toggle('is-added',added);btn.textContent=added?'✓ Added to Wishlist':'♡ Add to Wishlist';btn.setAttribute('aria-pressed',String(added));}
    });
    const list=backdrop.querySelector('.tcc-wish-list');
    list.innerHTML='';
    if(!items.length){list.innerHTML='<div class="tcc-wish-empty">Your wishlist is empty.<br>Add your favourite items from the menu.</div>';}
    items.forEach(item=>{
      const row=document.createElement('div');row.className='tcc-wish-row';
      const info=document.createElement('div');const title=document.createElement('strong');title.textContent=item.name;const meta=document.createElement('small');meta.textContent=item.category+' · Qty '+item.qty;info.append(title,meta);
      const price=document.createElement('div');price.className='tcc-wish-row-price';const amount=document.createElement('span');amount.textContent=money(item.price*item.qty);const qty=document.createElement('div');qty.className='tcc-wish-qty';const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Decrease quantity of '+item.name);const qtyText=document.createElement('span');qtyText.textContent=item.qty;const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Increase quantity of '+item.name);minus.addEventListener('click',()=>{item.qty=Math.max(1,item.qty-1);save();render()});plus.addEventListener('click',()=>{item.qty+=1;save();render()});qty.append(minus,qtyText,plus);const remove=document.createElement('button');remove.type='button';remove.className='tcc-wish-remove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>{items=items.filter(x=>x.key!==item.key);save();render()});price.append(amount,qty,remove);row.append(info,price);list.append(row);
    });
    
    
    backdrop.querySelector('.tcc-wish-total').style.display=items.length?'flex':'none';
    backdrop.querySelector('.tcc-wish-actions').style.display=items.length?'grid':'none';
  };
  const attachWishlistButtons=(root=document)=>{
    const cards=[];
    if(root.matches?.('.m-item'))cards.push(root);
    root.querySelectorAll?.('.m-item').forEach(card=>cards.push(card));
    cards.forEach(card=>{
      if(card.querySelector('.tcc-wish-add')||card.querySelector('.availability-status'))return;
      const data=getData(card);
      if(!data.name||!data.price)return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='tcc-wish-add';
      btn.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const found=items.find(x=>x.key===data.key);
        if(found)items=items.filter(x=>x.key!==data.key);else items.push({...data,qty:1});
        save();render();
      });
      const info=card.querySelector('.m-item-info')||card.firstElementChild||card;
      info.appendChild(btn);
    });
    render();
  };
  // Menu products are injected after DOM ready; observe them so every product gets a button.
  const startWishlistButtons=()=>{
    attachWishlistButtons();
    const menuRoot=document.querySelector('.menu-page');
    if(!menuRoot)return;
    const observer=new MutationObserver(()=>{
      // The menu builder replaces each product's info wrapper in place.
      // Re-scan the full menu so buttons are attached to the final wrapper,
      // not to the temporary source node that gets removed.
      attachWishlistButtons(menuRoot);
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
  backdrop.querySelector('.tcc-wish-clear').addEventListener('click',()=>{items=[];save();render()});
  backdrop.querySelector('.tcc-wish-show').addEventListener('click',()=>{backdrop.querySelector('.tcc-wish-hint').textContent='Please show this wishlist to your TCC manager. Your selections are saved on this device.';});
  render();
})();