const body=document.body,toggle=document.querySelector('[data-toggle]'),close=document.querySelector('[data-close]'),overlay=document.querySelector('[data-overlay]');function setOpen(v){body.classList.toggle('open',v);toggle?.setAttribute('aria-expanded',v)}toggle?.addEventListener('click',()=>setOpen(!body.classList.contains('open')));close?.addEventListener('click',()=>setOpen(false));overlay?.addEventListener('click',()=>setOpen(false));document.querySelectorAll('.drawer a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});

/* TCC Customer Wishlist — menu-page only */
(function(){
  if(!document.querySelector('.menu-page')) return;
  const STORAGE_KEY='tccCustomerWishlistV1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}};
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
    .menu-page .m-item .tcc-wish-add{position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:0!important;min-height:30px!important;margin:0 12px 12px!important;padding:0 12px!important;border:1px solid rgba(23,60,43,.18)!important;border-radius:999px!important;background:#f5f0e5!important;color:#365442!important;box-shadow:none!important;font:700 10px/1 Arial,sans-serif!important;letter-spacing:.02em!important;cursor:pointer!important}
    .menu-page .m-item .tcc-wish-add.is-added{background:#173c2b!important;color:#fffaf0!important;border-color:#173c2b!important;min-width:0!important;padding-left:12px!important;padding-right:12px!important}
    body.menu-text-mode .menu-page .m-item .tcc-wish-title-row{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;gap:7px!important;min-width:0!important;width:100%!important}
    body.menu-text-mode .menu-page .m-item .tcc-wish-title-row h3{display:inline!important;flex:0 1 auto!important;min-width:0!important;margin:0!important}
    body.menu-text-mode .menu-page .m-item .tcc-wish-title-row .tcc-wish-add{display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:100%!important;vertical-align:middle!important;white-space:nowrap!important;min-height:28px!important;margin:0!important;padding:0 10px!important;font-size:10px!important;line-height:1!important}
    .tcc-wish-choice{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(7,22,15,.68)}
    .tcc-wish-choice.is-open{display:flex}
    .tcc-wish-choice-panel{width:min(100%,440px);max-height:85dvh;overflow:auto;padding:20px;border-radius:18px;background:#fffaf0;color:#173c2b;box-shadow:0 18px 60px rgba(0,0,0,.3)}
    .tcc-wish-choice-panel h3{margin:0 0 6px;font:700 21px Georgia,serif}
    .tcc-wish-choice-panel p{margin:0 0 12px;color:#6d776e;font:12px Arial,sans-serif}
    .tcc-wish-addon-options{display:grid;gap:8px;margin:12px 0}
    .tcc-wish-addon-options label{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid rgba(23,60,43,.15);border-radius:10px;background:#fff;font:12px Arial,sans-serif}
    .tcc-wish-addon-options input{accent-color:#173c2b}
    .tcc-wish-choice-actions{display:flex;gap:8px;margin-top:14px}
    .tcc-wish-choice-actions button{flex:1;min-height:42px;border:1px solid #173c2b;border-radius:10px;background:#173c2b;color:#fffaf0;font:700 12px Arial,sans-serif}
    .tcc-wish-choice-actions .secondary{background:transparent;color:#173c2b}
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
    .tcc-wish-table-field label span{color:#b33b32}
    .tcc-wish-table-field input{width:100%;box-sizing:border-box;min-height:42px;padding:9px 11px;border:1px solid rgba(23,60,43,.22);border-radius:8px;background:#fffaf0;color:#173c2b;font:600 14px Arial,sans-serif;text-transform:uppercase;outline:none}
    .tcc-wish-table-field input:focus{border-color:#8d7337;box-shadow:0 0 0 2px rgba(141,115,55,.12)}
    .tcc-wish-table-field small{min-height:0;color:#b33b32;font:11px Arial,sans-serif}
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
  float.type='button';float.className='tcc-wish-float';float.innerHTML='<span aria-hidden="true">♡</span><span>Cart</span><span class="tcc-wish-count">0</span>';
  float.setAttribute('aria-label','Open cart');
  const backdrop=document.createElement('div');backdrop.className='tcc-wish-backdrop';backdrop.setAttribute('aria-hidden','true');
  backdrop.innerHTML='<section class="tcc-wish-panel" role="dialog" aria-modal="true" aria-labelledby="tccWishTitle"><div class="tcc-wish-head"><h2 id="tccWishTitle">Your Cart</h2><button type="button" class="tcc-wish-close" aria-label="Close cart">×</button></div><div class="tcc-wish-list"></div><div class="tcc-wish-table-field"><label for="tccWishTableNumber">Table Number <span>*</span></label><input id="tccWishTableNumber" type="text" required autocomplete="off" autocapitalize="characters" placeholder="Enter table number (e.g. S1, C2, P1, T1)" aria-describedby="tccWishTableError"><small id="tccWishTableError" role="alert"></small></div><div class="tcc-wish-total"><span>Estimated total</span><strong>₹0</strong></div><div class="tcc-wish-actions"><button type="button" class="tcc-wish-send">Send Cart to WhatsApp</button><button type="button" class="tcc-wish-clear secondary">Clear Cart</button></div><p class="tcc-wish-hint">Show this list to the TCC manager when placing your order. Final order and availability will be confirmed by the team.</p></section>';
  const choice=document.createElement('div');choice.className='tcc-wish-choice';choice.setAttribute('aria-hidden','true');
  choice.innerHTML='<section class="tcc-wish-choice-panel" role="dialog" aria-modal="true"><h3 class="tcc-wish-choice-title">Choose add-ons</h3><p>Select up to 2 add-ons. You can also continue with No Add-ons.</p><div class="tcc-wish-addon-options"></div><div class="tcc-wish-choice-actions"><button type="button" class="tcc-wish-choice-confirm">Add to Cart</button><button type="button" class="tcc-wish-choice-cancel secondary">Cancel</button></div></section>';
  document.body.append(float,backdrop,choice);
  let pendingProduct=null;
  const closeChoice=()=>{choice.classList.remove('is-open');choice.setAttribute('aria-hidden','true');pendingProduct=null;};
  const openChoice=(card,data,options)=>{
    pendingProduct={card,data,options};
    const wrap=choice.querySelector('.tcc-wish-addon-options');wrap.replaceChildren();
    choice.querySelector('.tcc-wish-choice-title').textContent=data.name;
    const none=document.createElement('label'),noneInput=document.createElement('input');noneInput.type='radio';noneInput.name='tccWishNoAddon';noneInput.value='none';noneInput.checked=true;none.append(noneInput,document.createTextNode('No Add-ons'));wrap.append(none);
    options.forEach((opt,index)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=String(index);input.addEventListener('change',()=>{const checked=[...wrap.querySelectorAll('input[type="checkbox"]:checked')];if(checked.length>2){input.checked=false;}});label.append(input,document.createTextNode(opt.name+' — '+money(opt.price)));wrap.append(label);});
    noneInput.addEventListener('change',()=>wrap.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=false));
    choice.classList.add('is-open');choice.setAttribute('aria-hidden','false');
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
  const render=()=>{
    count().textContent=items.reduce((sum,item)=>sum+Math.max(1,Number(item.qty)||1),0);
    document.querySelectorAll('.m-item').forEach(card=>{
      const data=getData(card),btn=card.querySelector('.tcc-wish-add');
      if(btn){const added=items.some(x=>x.key===data.key);btn.classList.toggle('is-added',added);btn.textContent=added?'✓ Added · + Add another':'＋ Add to Cart';btn.setAttribute('aria-label',added?'Add another '+data.name+' to cart':'Add '+data.name+' to cart');btn.setAttribute('title',added?'Tap to add this item again':'Add to cart');btn.setAttribute('aria-pressed',String(added));}
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
      const amount=document.createElement('span');amount.textContent=money(unitPrice)+' each';
      const qty=document.createElement('div');qty.className='tcc-wish-qty';
      const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Decrease '+item.name+' quantity');
      const qtyValue=document.createElement('strong');qtyValue.textContent=Math.max(1,Number(item.qty)||1);
      const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Increase '+item.name+' quantity');
      minus.addEventListener('click',()=>{item.qty=Math.max(1,(Number(item.qty)||1)-1);save();render()});
      plus.addEventListener('click',()=>{item.qty=(Number(item.qty)||1)+1;save();render()});
      qty.append(minus,qtyValue,plus);
      const remove=document.createElement('button');remove.type='button';remove.className='tcc-wish-remove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>{items=items.filter(x=>x!==item);save();render()});
      price.append(amount,qty,remove);row.append(info,price);list.append(row);
    });
    
    
    backdrop.querySelector('.tcc-wish-total').style.display=items.length?'flex':'none';
    backdrop.querySelector('.tcc-wish-actions').style.display=items.length?'grid':'none';
  };
  const placeWishlistButton=(card,btn)=>{
    if(document.body.classList.contains('menu-text-mode')){
      const heading=card.querySelector('.m-item-info h3, h3');
      if(heading&&heading.parentElement){
        let row=heading.closest('.tcc-wish-title-row');
        if(!row){
          row=document.createElement('div');row.className='tcc-wish-title-row';
          heading.parentElement.insertBefore(row,heading);
          row.appendChild(heading);
        }
        if(btn.parentElement!==row)row.appendChild(btn);
        return;
      }
    }
    const price=card.querySelector(':scope > strong');
    if(price){
      if(btn.parentElement!==card||price.nextElementSibling!==btn)price.insertAdjacentElement('afterend',btn);
    }else{
      const info=card.querySelector('.m-item-info')||card;
      if(btn.parentElement!==info)info.appendChild(btn);
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
      const btn=document.createElement('button');
      btn.type='button';btn.className='tcc-wish-add';
      btn.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const options=addonOptions(card);
        if(options.length){openChoice(card,data,options);return;}
        animateProductToWishlist(card,data);
        const found=items.find(x=>x.key===data.key&&!(x.addons||[]).length);
        if(found){found.qty=(Number(found.qty)||1)+1;}
        else items.push({...data,addons:[],note:'',qty:1,lineId:String(Date.now())+'-'+Math.random().toString(36).slice(2)});
        save();render();
      });
      card.appendChild(btn);
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
    const wrap=choice.querySelector('.tcc-wish-addon-options');
    const selected=[...wrap.querySelectorAll('input[type="checkbox"]:checked')].slice(0,2).map(input=>pendingProduct.options[Number(input.value)]);
    animateProductToWishlist(pendingProduct.card,pendingProduct.data);
    const sameConfig=item=>item.key===pendingProduct.data.key&&JSON.stringify((item.addons||[]).map(x=>x.name).sort())===JSON.stringify(selected.map(x=>x.name).sort());
    const found=items.find(sameConfig);
    if(found){found.qty=(Number(found.qty)||1)+1;}
    else items.push({...pendingProduct.data,addons:selected,note:'',qty:1,lineId:String(Date.now())+'-'+Math.random().toString(36).slice(2)});
    save();render();closeChoice();
  });
  choice.querySelector('.tcc-wish-choice-cancel').addEventListener('click',closeChoice);
  choice.addEventListener('click',event=>{if(event.target===choice)closeChoice();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&choice.classList.contains('is-open'))closeChoice();});
  backdrop.querySelector('.tcc-wish-clear').addEventListener('click',()=>{items=[];save();render()});
  const tableInput=backdrop.querySelector('#tccWishTableNumber');
  const tableError=backdrop.querySelector('#tccWishTableError');
  const validTableNumber=value=>/^(?:s[1-6]|c[1-4]|p[1-3]|t[12])$/i.test(value.trim());
  tableInput.addEventListener('input',()=>{
    tableInput.setCustomValidity('');
    tableError.textContent='';
    tableInput.value=tableInput.value.replace(/\\s+/g,'');
  });
  backdrop.querySelector('.tcc-wish-send').addEventListener('click',()=>{
    if(!items.length)return;
    const tableNumber=tableInput.value.trim();
    if(!validTableNumber(tableNumber)){
      tableInput.setCustomValidity('Enter a valid table number.');
      tableError.textContent='Required. Accepted tables: S1–S6, C1–C4, P1–P3, T1–T2 (uppercase or lowercase).';
      tableInput.reportValidity();
      tableInput.focus();
      return;
    }
    tableInput.setCustomValidity('');
    tableError.textContent='';
    const sections=items.map((item,index)=>{
      const quantity=Math.max(1,Number(item.qty)||1);
      const details=[
        '*'+(index+1)+'. '+item.name+'*',
        '*Quantity: '+quantity+'*',
        
      ];
      if(item.addons?.length){
        details.push('Add-ons: '+item.addons.map(x=>x.name+' ('+money(x.price)+')').join(', '));
      }
      if(item.note?.trim())details.push('Note: '+item.note.trim());
      return details.join('\n');
    });
    const message=[
      'Hello TCC! 👋',
      '',
      'I would like to place an order for the following:',
      '',
      '*Table Number: '+tableNumber.toUpperCase()+'*',
      '',
      sections.join('\n\n━━━━━━━━━━━━━━━━━━\n\n'),
      '',
      'Please confirm item availability and the order details.',
      'Thank you!'
    ].join('\n');
    const url='https://wa.me/919059059553?text='+encodeURIComponent(message);
    window.open(url,'_blank','noopener,noreferrer');
  });
  render();
})();