(()=>{
"use strict";
const QR=new URLSearchParams(location.search).get("tcc_qr")?.trim();
if(!QR||!/^[A-Za-z0-9_-]{40,80}$/.test(QR))return;
const API="https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-game";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
const STORE="tccPerfect10SessionV1";
let game=null,startedAt=0,frame=0,running=false,displayedElapsedMs=0;
async function request(action,{method="GET",body}={}){const r=await fetch(API+"?action="+encodeURIComponent(action),{method,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,cache:"no-store"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Perfect 10 is temporarily unavailable.");return data;}
const format=ms=>(Math.max(0,ms)/1000).toFixed(2);
function mountEntry(){
 if(document.getElementById("tccPerfect10Entry"))return;
 const host=document.querySelector(".menu-content .container")||document.querySelector("main")||document.body;
 const entry=document.createElement("section");entry.id="tccPerfect10Entry";entry.className="tcc-p10-entry";
 const isTestTable=String(game?.table_number||"").toUpperCase()==="T4";
 entry.innerHTML='<div class="tcc-p10-entry-top"><span class="tcc-p10-eyebrow">A LITTLE TCC CHALLENGE</span><span class="tcc-p10-tag">PLAY & WIN</span></div><h2>THE PERFECT 10</h2><div class="tcc-p10-offer"><strong>10% OFF</strong><span>ALL BEVERAGES</span></div><p class="tcc-p10-how">Can you stop the timer at exactly <strong>10.00 seconds?</strong></p><p class="tcc-p10-explain">Tap to start. Tap again to stop. Hit 10.00 and win your drink discount!</p><small class="tcc-p10-table-note">'+(isTestTable?"T4 TEST TABLE · UNLIMITED ATTEMPTS":"3 attempts · Valid during this visit")+'</small><button type="button" class="tcc-p10-play">PLAY NOW & WIN 10% OFF <span aria-hidden="true">→</span></button>';
 entry.querySelector("button").addEventListener("click",openGame);host.prepend(entry);
}
function ensureModal(){
 if(document.getElementById("tccP10Modal"))return;
 const modal=document.createElement("div");modal.id="tccP10Modal";modal.className="tcc-p10-overlay";modal.hidden=true;
 modal.innerHTML='<section class="tcc-p10-modal" role="dialog" aria-modal="true" aria-labelledby="tccP10Title"><button class="tcc-p10-close" type="button" aria-label="Close">×</button><div class="tcc-p10-modal-brand">TCC <span>THE COFFEE CLUB · NELLORE</span></div><div class="tcc-p10-content"><span class="tcc-p10-eyebrow">THE CHALLENGE</span><h2 id="tccP10Title">THE PERFECT 10</h2><p class="tcc-p10-instruction">Stop the timer as close as you can to <strong>10.00 seconds</strong>.</p><div class="tcc-p10-attempts" id="tccP10Attempts">3 ATTEMPTS LEFT</div><div class="tcc-p10-clock" id="tccP10Clock">0.00</div><div class="tcc-p10-unit">SECONDS</div><button class="tcc-p10-start" id="tccP10Start" type="button">START ATTEMPT</button><p class="tcc-p10-feedback" id="tccP10Feedback" role="status">Ready when you are.</p><div class="tcc-p10-reward" id="tccP10Reward" hidden></div><small class="tcc-p10-footnote">Win 10% off all hot and cold beverages. Cannot be combined with other offers. Valid during this visit only.</small></div><div class="tcc-p10-fireworks" id="tccP10Fireworks" aria-hidden="true"></div></section>';
 document.body.append(modal);
 modal.querySelector(".tcc-p10-close").addEventListener("click",closeGame);
 modal.addEventListener("click",e=>{if(e.target===modal)closeGame();});
 modal.querySelector("#tccP10Start").addEventListener("click",toggleAttempt);
}
function closeGame(){const modal=document.getElementById("tccP10Modal");if(!modal)return;modal.hidden=true;if(running){running=false;cancelAnimationFrame(frame);}}
function openGame(){ensureModal();const modal=document.getElementById("tccP10Modal");modal.hidden=false;renderState();modal.querySelector(".tcc-p10-close").focus();}
function renderState(){
 const attempts=document.getElementById("tccP10Attempts"),clock=document.getElementById("tccP10Clock"),button=document.getElementById("tccP10Start"),feedback=document.getElementById("tccP10Feedback"),rewardBox=document.getElementById("tccP10Reward");
 const unlimited=game?.unlimited_attempts===true||String(game?.table_number||"").toUpperCase()==="T4";
 const remaining=Math.max(0,Number(game?.attempts_remaining??3));
 attempts.textContent=unlimited?"UNLIMITED TEST ATTEMPTS":remaining+" ATTEMPT"+(remaining===1?"":"S")+" LEFT";
 clock.textContent=game?.reward?"10.00":"0.00";
 rewardBox.hidden=true;rewardBox.innerHTML="";document.getElementById("tccP10Fireworks").innerHTML="";
 button.hidden=false;
 if(game?.is_winner&&game.reward){showWinner(game.reward);return;}
 if(!unlimited&&remaining===0){button.disabled=true;button.textContent="NO ATTEMPTS LEFT";feedback.textContent="Thank you for playing. Enjoy your time at TCC!";return;}
 button.disabled=false;button.textContent="START ATTEMPT";feedback.textContent="Ready when you are.";
}
function tick(){if(!running)return;const elapsed=performance.now()-startedAt;displayedElapsedMs=Math.round(elapsed/10)*10;document.getElementById("tccP10Clock").textContent=format(displayedElapsedMs);frame=requestAnimationFrame(tick);}
async function toggleAttempt(){
 const button=document.getElementById("tccP10Start"),feedback=document.getElementById("tccP10Feedback");
 if(!running){running=true;startedAt=performance.now();displayedElapsedMs=0;button.textContent="STOP";feedback.textContent="Tap STOP when you think it is 10.00.";tick();return;}
 running=false;cancelAnimationFrame(frame);const elapsed=displayedElapsedMs;
 button.disabled=true;button.textContent="CHECKING…";feedback.textContent="Checking your attempt…";
 try{
  const result=await request("game-attempt",{method:"POST",body:{session_token:game.session_token,elapsed_ms:elapsed}});
  game.attempts_used=result.attempts_used;game.attempts_remaining=result.attempts_remaining;game.unlimited_attempts=result.unlimited_attempts===true||String(game.table_number||"").toUpperCase()==="T4";game.is_winner=result.winner;game.reward=result.reward||null;
  document.getElementById("tccP10Clock").textContent=format(elapsed);
  if(result.winner){showWinner(result.reward);}
  else{const unlimited=game.unlimited_attempts===true;button.disabled=!unlimited&&result.attempts_remaining===0;button.textContent=unlimited||result.attempts_remaining?"TRY AGAIN":"NO ATTEMPTS LEFT";feedback.textContent=unlimited?("You stopped at "+format(elapsed)+" seconds. Try again — unlimited test attempts for T4."):result.attempts_remaining?("You stopped at "+format(elapsed)+" seconds. "+result.attempts_remaining+" attempt"+(result.attempts_remaining===1?"":"s")+" remaining."):("You stopped at "+format(elapsed)+" seconds. Better luck next time!");document.getElementById("tccP10Attempts").textContent=unlimited?"UNLIMITED TEST ATTEMPTS":result.attempts_remaining+" ATTEMPT"+(result.attempts_remaining===1?"":"S")+" LEFT";}
 }catch(error){button.disabled=false;button.textContent="TRY AGAIN";feedback.textContent=error.message;}
}
function showWinner(reward){
 const box=document.getElementById("tccP10Reward"),button=document.getElementById("tccP10Start"),feedback=document.getElementById("tccP10Feedback");
 const expired=reward.expires_at&&Date.parse(reward.expires_at)<=Date.now();
 button.hidden=true;document.getElementById("tccP10Attempts").textContent="CHALLENGE COMPLETED";
 document.getElementById("tccP10Clock").textContent="10.00";
 feedback.textContent=expired?"Your visit reward window has ended.":"You did it! Perfect timing.";
 box.hidden=false;
 if(expired){box.innerHTML='<div class="tcc-p10-won">YOU DID IT!</div><h3>VISIT REWARD EXPIRED</h3><p>Your 10% beverage reward was valid during this visit window.</p>';}
 else{box.innerHTML='<div class="tcc-p10-won">YOU DID IT!</div><h3>10% OFF ALL BEVERAGES</h3><p>Show this reward code to our team before you pay.</p><div class="tcc-p10-code">'+reward.code+'</div><button type="button" class="tcc-p10-copy">COPY REWARD CODE</button><small>Table '+reward.table_number+' · Expires '+new Date(reward.expires_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})+'</small><small>Cannot be combined with other offers.</small>';
  box.querySelector(".tcc-p10-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(reward.code);box.querySelector(".tcc-p10-copy").textContent="COPIED";}catch{box.querySelector(".tcc-p10-copy").textContent=reward.code;}});
 }
 const fx=document.getElementById("tccP10Fireworks");for(let i=0;i<34;i++){const p=document.createElement("i");p.style.setProperty("--x",Math.round(Math.random()*100)+"%");p.style.setProperty("--delay",(Math.random()*1.1)+"s");p.style.setProperty("--h",Math.round(Math.random()*360));fx.append(p);}
}
async function init(){
 try{
  const status=await request("game-status");if(!status.enabled)return;
  const saved=JSON.parse(localStorage.getItem(STORE)||"null");
  const existing=saved?.qr_token===QR?saved.session_token:"";
  game=await request("game-start",{method:"POST",body:{table_qr_token:QR,session_token:existing}});
  localStorage.setItem(STORE,JSON.stringify({qr_token:QR,session_token:game.session_token}));
  if(!game.table_number)return;
  mountEntry();ensureModal();
  setInterval(async()=>{try{const current=await request("game-status");if(!current.enabled){document.getElementById("tccPerfect10Entry")?.remove();closeGame();}}catch{}},12000);
  if(game.is_winner&&game.reward){game.reward={...game.reward,code:game.reward.reward_code};}
 }catch(error){console.warn("Perfect 10 unavailable:",error);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();