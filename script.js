const body=document.body,toggle=document.querySelector('[data-toggle]'),close=document.querySelector('[data-close]'),overlay=document.querySelector('[data-overlay]');
let lastFocus=null;
function setOpen(v){if(!toggle)return;body.classList.toggle('open',v);toggle.setAttribute('aria-expanded',String(v));toggle.setAttribute('aria-label',v?'Close menu':'Open menu');const drawer=document.querySelector('.drawer');if(v){lastFocus=document.activeElement;close?.focus()}else{lastFocus?.focus?.()}}
toggle?.addEventListener('click',()=>setOpen(!body.classList.contains('open')));close?.addEventListener('click',()=>setOpen(false));overlay?.addEventListener('click',()=>setOpen(false));document.querySelectorAll('.drawer a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'&&body.classList.contains('open')){const drawer=document.querySelector('.drawer');const items=[...drawer.querySelectorAll('a,button')].filter(x=>!x.hasAttribute('disabled'));if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
(()=>{
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const progress=document.querySelector('[data-scroll-progress]');
 const update=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;const pct=max>0?(window.scrollY/max)*100:0;if(progress)progress.style.width=pct+'%'};
 update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
 const reveals=[...document.querySelectorAll('[data-reveal]')];
 if('IntersectionObserver'in window&&!reduce){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});reveals.forEach((el,i)=>{el.style.setProperty('--reveal-delay',Math.min(i%4,3)*85+'ms');io.observe(el)})}else reveals.forEach(el=>el.classList.add('is-visible'));
 const heroImage=document.querySelector('[data-parallax-image] img');let ticking=false;
 if(heroImage&&!reduce&&window.matchMedia('(min-width: 851px)').matches){window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=Math.min(window.scrollY*.18,100);heroImage.style.transform='translate3d(0,'+y+'px,0) scale(1.06)';ticking=false})},{passive:true})}
 const rail=document.querySelector('[data-rail]'),prev=document.querySelector('[data-rail-prev]'),next=document.querySelector('[data-rail-next]'),bar=document.querySelector('[data-rail-progress]'),count=document.querySelector('[data-rail-count]');
 if(rail){const cards=[...rail.querySelectorAll('.v2-product-card')];let dragging=false,startX=0,startScroll=0,moved=false;
 const step=()=>cards[0]?.getBoundingClientRect().width+parseFloat(getComputedStyle(rail).columnGap||20);
 const sync=()=>{const max=rail.scrollWidth-rail.clientWidth;const pct=max>0?rail.scrollLeft/max:0;if(bar)bar.style.width=(25+pct*75)+'%';const idx=Math.min(cards.length,Math.max(1,Math.round(rail.scrollLeft/(step()||1))+1));if(count)count.innerHTML=String(idx).padStart(2,'0')+' <i>/ '+String(cards.length).padStart(2,'0')+'</i>'};
 prev?.addEventListener('click',()=>rail.scrollBy({left:-step(),behavior:reduce?'auto':'smooth'}));next?.addEventListener('click',()=>rail.scrollBy({left:step(),behavior:reduce?'auto':'smooth'}));rail.addEventListener('scroll',sync,{passive:true});sync();
 rail.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;dragging=true;moved=false;startX=e.clientX;startScroll=rail.scrollLeft;rail.classList.add('is-dragging');rail.setPointerCapture?.(e.pointerId)});
 rail.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX;if(Math.abs(dx)>5)moved=true;rail.scrollLeft=startScroll-dx});
 const end=()=>{dragging=false;rail.classList.remove('is-dragging')};rail.addEventListener('pointerup',end);rail.addEventListener('pointercancel',end);rail.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false}},true);
 }
 const strips=[...document.querySelectorAll('[data-gallery-strip]')];strips.forEach(strip=>{let down=false,x=0,left=0;strip.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;down=true;x=e.clientX;left=strip.scrollLeft;strip.setPointerCapture?.(e.pointerId)});strip.addEventListener('pointermove',e=>{if(down)strip.scrollLeft=left-(e.clientX-x)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>strip.addEventListener(ev,()=>down=false))});
 document.querySelector('[data-back-top]')?.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:reduce?'auto':'smooth'})});
})();
