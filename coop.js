(function(){
"use strict";
const $=id=>document.getElementById(id);
const lobby=$("coopLobby"),createBtn=$("coopCreate"),joinBtn=$("coopJoin"),closeBtn=$("coopClose"),signal=$("coopSignal"),output=$("coopCodeOut"),input=$("coopCodeIn"),copyBtn=$("coopCopy"),nextBtn=$("coopNext"),startBtn=$("coopHostStart"),status=$("coopStatus"),normalStart=$("startButton");
const view=document.createElement("div");view.id="coopGuestView";
view.innerHTML='<div id="coopGuestBar"><span id="coopGuestInfo">🐱🐱 Esperando partida…</span><button id="coopGuestLeave" type="button">Salir del cooperativo</button></div><div id="coopGuestPhase">Esperando al anfitrión…</div><div id="coopGuestChoices" hidden><div id="coopGuestChoiceTitle">Elige tu mejora</div><div id="coopGuestChoiceCards"></div></div>';
document.body.appendChild(view);
const info=$("coopGuestInfo"),phaseText=$("coopGuestPhase"),choicePanel=$("coopGuestChoices"),choiceCards=$("coopGuestChoiceCards"),choiceTitle=$("coopGuestChoiceTitle");
let pc=null,channel=null,mode="none",connected=false,coopStarted=false,phaseAt=0,frameAt=0,controlAt=0,pointerAt=0,pendingGuest=null,hostOffers=new Set(),guestOffered=new Set(),hostOffered=new Set(),guestOwned=new Set(),hostOwned=new Set(),guestLevel=1,guestAccepted=false,hostFinish=null,lastFrame=null,guestChoiceId=0,activeOfferId=0,guestPendingReasons=[],guestSelecting=false,guestPauseRequested=false;
const remote={x:0,y:0,angle:0,shootAnim:0,hurtAnim:0,r:22,hp:100,level:1,xp:0,xpNeed:0,xpFraction:0,coins:0,shopPurchases:0,shopFusionPurchases:0,lastShot:-Infinity,lastManual:-Infinity,lastBloquito:-Infinity,manualCount:0,keys:{},aimX:0,aimY:0,clicks:0,receivedAt:0};
const guestKeys={};let guestAimX=.5,guestAimY=.5;
function msg(s){status.textContent=s}
function send(d){if(channel?.readyState==="open")try{channel.send(JSON.stringify(d))}catch(e){}}
function enabled(){return mode!=="none"}
function allowStart(block){normalStart.hidden=block;normalStart.disabled=block}
function resetRemote(){remote.x=Math.min(canvas.width-40,player.x+85);remote.y=Math.min(canvas.height-40,player.y+35);remote.angle=0;remote.shootAnim=0;remote.hurtAnim=0;remote.lastShot=-Infinity;remote.lastManual=-Infinity;remote.lastBloquito=-Infinity;remote.manualCount=0;remote.keys={};remote.aimX=remote.x+80;remote.aimY=remote.y;remote.clicks=0;remote.hp=100;remote.level=1;remote.xp=0;remote.xpNeed=getXpNeedForLevel(1);remote.xpFraction=0;remote.coins=0;remote.shopPurchases=0;remote.shopFusionPurchases=0;remote.receivedAt=performance.now();guestLevel=1;guestPendingReasons=[];guestSelecting=false;guestPauseRequested=false;hostOffers.clear();guestOffered.clear();hostOffered.clear();guestOwned.clear();hostOwned.clear();guestAccepted=false;pendingGuest=null;hostFinish=null;window.coopBridge?.resetGuestBuild()}
function release(){const wasRunning=coopStarted;if(wasRunning&&mode==="host")send({t:"end"});coopStarted=false;lastFrame=null;for(const k in guestKeys)delete guestKeys[k];if(channel){try{channel.close()}catch(e){}}channel=null;if(pc){try{pc.close()}catch(e){}}pc=null;connected=false;mode="none";phaseAt=0;frameAt=0;pendingGuest=null;hostFinish=null;guestPendingReasons=[];guestSelecting=false;guestPauseRequested=false;choicePanel.hidden=true;view.style.display="none";document.body.classList.remove("coopGuestRunning");closeBtn.hidden=true;createBtn.disabled=false;joinBtn.disabled=false;signal.hidden=true;startBtn.hidden=true;nextBtn.hidden=true;output.value="";input.value="";allowStart(false);if(wasRunning){gameStarted=false;paused=false;choosingUpgrade=false;clearAllInputKeys();startPanel.style.display="flex";}msg("Conexión cerrada. Puedes crear otra partida.")}
function dropped(){if(!connected)return;connected=false;remote.keys={};remote.clicks=0;if(mode==="host"){msg("Se perdió la conexión. Partida cooperativa detenida; no afecta al ranking.");if(coopStarted){paused=true;choosingUpgrade=false;pendingGuest=null;guestPendingReasons=[];hostFinish=null;levelUpPanel.style.display="none";pausePanel.style.display="none";}}else{phaseText.textContent="Conexión perdida. Sal para volver al menú.";info.textContent="🔌 Desconectado"}}
function makePC(){if(!window.RTCPeerConnection)throw Error("Este navegador no admite WebRTC.");pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});pc.onconnectionstatechange=()=>{const s=pc?.connectionState;if(s==="failed"||s==="disconnected"||s==="closed")dropped()};return pc}
function gather(p){return new Promise(resolve=>{if(p.iceGatheringState==="complete")return resolve();let done=false;const finish=()=>{if(done)return;done=true;p.removeEventListener("icegatheringstatechange",changed);resolve()};function changed(){if(p.iceGatheringState==="complete")finish()}p.addEventListener("icegatheringstatechange",changed);setTimeout(finish,12000)})}
function pack(s){return btoa(JSON.stringify({t:s.type,s:s.sdp,v:2}))}
function unpack(v,type){const d=JSON.parse(atob(String(v).replace(/\s/g,"")));if(d?.v!==2||d.t!==type||typeof d.s!=="string"||d.s.length>180000)throw Error("Utilizad ambos la misma versión: código de conexión incompatible.");return {type:d.t,sdp:d.s}}
function bind(ch){channel=ch;ch.onopen=()=>{connected=true;if(mode==="host"){signal.hidden=true;startBtn.hidden=false;msg("Conexión lista. Cada uno renderizará su propio juego y elegirá su build.")}else{signal.hidden=true;view.style.display="flex";phaseText.textContent="Esperando a que el anfitrión inicie la partida…";msg("Conectado. Esperando la partida.")}};ch.onclose=dropped;ch.onerror=()=>msg("Error de conexión WebRTC.");ch.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch(err){return}if(!d||typeof d!=="object")return;if(mode==="host")receiveHost(d);else if(mode==="guest")receiveGuest(d)}}
async function host(){release();mode="host";closeBtn.hidden=false;createBtn.disabled=true;joinBtn.disabled=true;signal.hidden=false;allowStart(true);$("coopCodeLabel").textContent="1. Envía este código de invitación";$("coopInputLabel").textContent="3. Pega la respuesta del invitado";nextBtn.textContent="Conectar con la respuesta";nextBtn.hidden=true;msg("Generando invitación…");try{makePC();bind(pc.createDataChannel("gatitos-coop",{ordered:true}));await pc.setLocalDescription(await pc.createOffer());await gather(pc);if(mode!=="host")return;output.value=pack(pc.localDescription);nextBtn.hidden=false;msg("Comparte el código; después pega la respuesta que te envíe el invitado.")}catch(e){release();msg("No se pudo crear la partida: "+e.message)}}
function join(){release();mode="guest";closeBtn.hidden=false;createBtn.disabled=true;joinBtn.disabled=true;signal.hidden=false;allowStart(true);$("coopCodeLabel").textContent="2. Envía esta respuesta al anfitrión";$("coopInputLabel").textContent="1. Pega el código del anfitrión";nextBtn.textContent="Generar respuesta";nextBtn.hidden=false;msg("Introduce el código del anfitrión y genera tu respuesta.")}
async function next(){nextBtn.disabled=true;try{if(mode==="host"){await pc.setRemoteDescription(unpack(input.value,"answer"));nextBtn.hidden=true;msg("Respuesta recibida. Estableciendo conexión…")}else if(mode==="guest"){if(pc)pc.close();makePC();pc.ondatachannel=e=>bind(e.channel);await pc.setRemoteDescription(unpack(input.value,"offer"));await pc.setLocalDescription(await pc.createAnswer());await gather(pc);if(mode!=="guest")return;output.value=pack(pc.localDescription);nextBtn.hidden=true;msg("Envía esta respuesta al anfitrión y espera la conexión.")}}catch(e){msg("Error en el intercambio: "+e.message)}finally{nextBtn.disabled=false}}
function sendGuest(c=0){if(mode!=="guest"||!connected)return;send({t:"i",k:guestKeys,x:guestAimX,y:guestAimY,c})}
function pointer(e){const rect=canvas.getBoundingClientRect();guestAimX=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));guestAimY=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));if(performance.now()-pointerAt>25){pointerAt=performance.now();sendGuest()}}
function guestMenu(offer){
  for(const k in guestKeys)delete guestKeys[k];
  choicePanel.hidden=false;choiceCards.replaceChildren();
  choiceTitle.textContent=offer.reason==="shop"?"🪙 Mi tienda de gatitos":offer.reason==="rainbow"?"🌈 Mi premio del gato arcoíris":(offer.reason==="wave"?"🌊 Ronda superada":"⭐ Mi subida de nivel")+" · Elige tu mejora";
  guestChoiceId=offer.id;
  for(const c of offer.cards){
    const b=document.createElement("button");b.className="coopGuestUpgrade";b.dataset.key=c.key;
    const title=document.createElement("strong");title.textContent=(c.icon||"✨")+" "+c.title;
    const desc=document.createElement("span");desc.textContent=c.desc||"";
    const lv=document.createElement("small");lv.textContent=(c.levelTag||"")+(offer.reason==="shop"&&c.price?" · "+c.price+" 🪙":"");
    b.append(title,desc,lv);b.disabled=!!c.locked;b.style.opacity=c.locked?".52":"1";
    b.onclick=()=>{if(choicePanel.hidden||guestChoiceId!==offer.id)return;choicePanel.hidden=true;phaseText.textContent="Validando elección…";send({t:"pick",id:offer.id,key:c.key})};
    choiceCards.appendChild(b);
  }
  if(!offer.cards.length){choicePanel.hidden=true;phaseText.textContent="No hay mejoras disponibles. Esperando al compañero…";send({t:"pick",id:offer.id,key:null})}
}

function receiveGuest(d){if(d.t==="begin"){coopStarted=true;window.coopBridge?.resetGuestBuild();startPanel.style.display="none";document.body.classList.add("coopGuestRunning");view.style.display="flex";phaseText.textContent="¡Partida compartida!";info.textContent="🐱🐱 Cooperativo · dos builds"}else if(d.t==="frame"&&coopStarted){try{const f=typeof d.f==="string"?JSON.parse(d.f):d.f;lastFrame=f;window.coopBridge?.apply(f);if(!choicePanel.hidden)phaseText.textContent="Elige tu mejora para continuar";else if(f.over)phaseText.textContent="Fin de la partida cooperativa";else if(f.paused)phaseText.textContent="Esperando al otro gatito…";else phaseText.textContent="";info.textContent=`🐱🐱 Ronda ${f.w||1} · Mi nivel ${f.gl||1} · ❤️ ${Math.max(0,Math.ceil(f.ghp||0))} · 🪙 ${f.gco||0}`;}catch(err){console.error("Coop frame",err)}}else if(d.t==="offer"&&Number.isSafeInteger(d.id)&&d.id>guestChoiceId&&Array.isArray(d.cards)){guestMenu(d)}else if(d.t==="pickError"&&d.offer?.id===guestChoiceId){guestMenu(d.offer);phaseText.textContent=d.message||"Elige otra mejora"}else if(d.t==="chosen"&&d.id===guestChoiceId){choicePanel.hidden=true;phaseText.textContent="Mejora confirmada. Esperando al anfitrión…"}else if(d.t==="end"){connected=false;coopStarted=false;gameStarted=false;choicePanel.hidden=true;phaseText.textContent="El anfitrión terminó la partida. Pulsa Salir del cooperativo."}}
function receiveHost(d){
 if(d.t==="i"){
   if(!connected)return;
   const incoming=d.k&&typeof d.k==="object"?d.k:{};remote.keys={};
   for(const key of ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"])if(incoming[key]===true)remote.keys[key]=true;
   if(Number.isFinite(d.x))remote.aimX=Math.max(0,Math.min(canvas.width,d.x*canvas.width));
   if(Number.isFinite(d.y))remote.aimY=Math.max(0,Math.min(canvas.height,d.y*canvas.height));
   remote.clicks=Math.min(3,remote.clicks+(d.c?1:0));remote.receivedAt=performance.now();
 }else if(d.t==="pick"&&pendingGuest&&d.id===pendingGuest.id&&!pendingGuest.done){
   if(d.key===null&&pendingGuest.cards.length)return;
   if(d.key!==null&&!pendingGuest.cards.some(c=>c.key===d.key&&!c.locked))return;
   const reason=pendingGuest.reason;
   const oldMaxLife=window.coopBridge.guestMaxLife();
   let ok=true;
   if(d.key!==null){
     ok=!!window.coopBridge.applyGuestChoice(d.key,reason,remote.hp,remote.level);
     if(ok){guestOwned.add(d.key);remote.coins=window.coopBridge.guestWallet();remote.shopPurchases=window.coopBridge.guestShopPurchases();remote.shopFusionPurchases=window.coopBridge.guestFusionPurchases();
       const maxLife=window.coopBridge.guestMaxLife();
       remote.hp=Math.min(maxLife,remote.hp+Math.max(0,maxLife-oldMaxLife));
     }
   }
   if(!ok){send({t:"pickError",offer:{t:"offer",id:pendingGuest.id,reason,cards:pendingGuest.cards},message:"Esa opción no está disponible o faltan monedas."});return;}
   pendingGuest.done=true;send({t:"chosen",id:d.id});pendingGuest=null;
   if(reason==="rainbow"&&d.key===null){window.coopBridge.guestRainbowCompleted();remote.coins=window.coopBridge.guestWallet();}
   if(reason==="shop"&&d.key!=="shop:exit"&&d.key!==null){offerGuestShop();return;}
   if(guestPendingReasons.length){offerNextGuest();return;}
   guestSelecting=false;
   const finish=hostFinish;hostFinish=null;
   if(finish)finish();else if(guestPauseRequested){guestPauseRequested=false;choosingUpgrade=false;processPendingUpgradeQueue();}
 }
}

function allowsHost(key){return true}
function noteHostOffers(keys){hostOffers=new Set(keys.filter(Boolean))}
function markHostChoice(key){if(key)hostOwned.add(key)}
function makeGuestOffer(reason){
 if(mode!=="host"||!connected||!coopStarted||pendingGuest)return false;
 const id=++activeOfferId,cards=reason==="shop"?window.coopBridge.guestShopChoices(remote.hp,remote.level):window.coopBridge.guestChoices(reason,remote.hp,remote.level);
 pendingGuest={id,reason,cards,done:false};guestSelecting=true;
 send({t:"offer",id,reason,cards});return true;
}
function offerGuestShop(){makeGuestOffer("shop")}
function offerNextGuest(){
 if(!guestPendingReasons.length||pendingGuest||!connected||!coopStarted)return false;
 return makeGuestOffer(guestPendingReasons.shift());
}
function prepareGuestUpgrade(reason){
 if(mode!=="host"||!connected||!coopStarted)return;
 if(pendingGuest)guestPendingReasons.push(reason);
 else makeGuestOffer(reason);
}
function prepareGuestShop(){prepareGuestUpgrade("shop")}
function waitGuestShop(fn){
 if(mode!=="host"||!connected||!coopStarted||(!pendingGuest&&!guestPendingReasons.includes("shop")))return false;
 hostFinish=fn;return true;
}
function waitGuestUpgrade(fn){
 if(mode!=="host"||!connected||!coopStarted||(!pendingGuest&&!guestPendingReasons.length))return false;
 hostFinish=fn;return true;
}
function guestCollectCoin(amount,pickups=1){
 if(mode!=="host"||!connected||!coopStarted||!(amount>0))return;
 grantGuestCoins(amount);
 let bonusXp=0;
 window.coopBridge.withGuestBuild(()=>{
   if(hasDoneFusionPair("coinMagnet+xpBoost"))bonusXp=amount*(.25+.45*fusionStrength("coinMagnet+xpBoost"));
   if(hasDoneFusionPair("healOnWave+luck"))remote.hp=Math.min(upgrades.maxLife,remote.hp+amount*(2+4*fusionStrength("healOnWave+luck")));
   if(hasDoneFusionPair("coinMagnet+healOnWave"))remote.hp=Math.min(upgrades.maxLife,remote.hp+Math.max(1,Math.round(upgrades.healOnWave*.10))*Math.max(1,pickups));
 });
 if(bonusXp>0)grantGuestXP(bonusXp);
}
function grantGuestCoins(amount){
 if(mode!=="host"||!connected||!coopStarted||!Number.isFinite(amount)||amount<=0)return;
 window.coopBridge.grantGuestCoins(amount);
 remote.coins=window.coopBridge.guestWallet();
}
function grantGuestXP(amount){
 if(mode!=="host"||!connected||!coopStarted||!Number.isFinite(amount)||amount<=0)return;
 const boosted=amount*window.coopBridge.guestXpMultiplier()+remote.xpFraction;
 const added=Math.floor(boosted+1e-9);remote.xpFraction=Math.max(0,boosted-added);
 remote.xp+=added;
 let gained=0;
 while(Number.isFinite(remote.xpNeed)&&remote.xpNeed>0&&remote.xp>=remote.xpNeed&&gained<1000){remote.xp-=remote.xpNeed;remote.level++;remote.xpNeed=nextXpRequirement(remote.xpNeed);gained++;}
 for(let n=0;n<gained;n++)guestPendingReasons.push("level");
}
function grantGuestBossLevel(){
 if(mode!=="host"||!connected||!coopStarted)return;
 remote.level++;remote.xpNeed=nextXpRequirement(remote.xpNeed);guestPendingReasons.push("level");
}
function offerQueuedGuest(){
 if(mode!=="host"||!connected||!coopStarted||pendingGuest||!guestPendingReasons.length||choosingUpgrade||paused||gameOver)return;
 guestPauseRequested=true;choosingUpgrade=true;offerNextGuest();
}
function guestCanCollect(coin){return mode==="host"&&connected&&coopStarted&&remote.hp>0&&Math.hypot(coin.x-remote.x,coin.y-remote.y)<remote.r+22}
function applyGuestDamage(amount){
 if(mode!=="host"||!connected||!coopStarted||remote.hp<=0||!Number.isFinite(amount)||amount<=0)return false;
 window.coopBridge.withGuestBuild(()=>{remote.hp=Math.max(0,remote.hp-amount*(1-Math.min(.45,Math.max(0,upgrades.damageReduction||0))))});
 remote.hurtAnim=.24;return true;
}
function guestProjectileHit(entity,amount){
 if(mode!=="host"||!connected||!coopStarted||remote.hp<=0||!entity||Math.hypot(entity.x-remote.x,entity.y-remote.y)>=remote.r+(entity.r||0))return false;
 return applyGuestDamage(amount);
}
function guestAreaHit(x,y,r,amount){
 if(mode!=="host"||!connected||!coopStarted||remote.hp<=0||Math.hypot(x-remote.x,y-remote.y)>=r+remote.r)return false;
 return applyGuestDamage(amount);
}
function guestHeal(amount){
 if(mode!=="host"||!connected||!coopStarted||!Number.isFinite(amount)||amount<=0)return;
 window.coopBridge.withGuestBuild(()=>{remote.hp=Math.min(upgrades.maxLife,remote.hp+amount)});
}
function guestWaveHeal(){
 if(mode!=="host"||!connected||!coopStarted)return;
 window.coopBridge.withGuestBuild(()=>{remote.hp=Math.min(upgrades.maxLife,remote.hp+upgrades.healOnWave)});
}
function fishPlayer(fish){return fish?.ownerId==="guest"&&mode==="host"&&connected&&coopStarted?remote:player}
function guestLifeSteal(damage){
 if(mode!=="host"||!connected||!coopStarted||!Number.isFinite(damage)||damage<=0)return;
 window.coopBridge.withGuestBuild(()=>{if(upgrades.lifeSteal>0){life=remote.hp;remote.hp=Math.min(upgrades.maxLife,remote.hp+damage*getCurrentLifeSteal());}});
}
function guestSaltLifeSteal(damage){
 if(mode!=="host"||!connected||!coopStarted||!(damage>0))return;
 window.coopBridge.withGuestBuild(()=>{if(hasDoneFusionPair("lifeSteal+saltScales"))remote.hp=Math.min(upgrades.maxLife,remote.hp+damage*.12)});
}
function withFishOwner(fish,fn){return window.coopBridge.withFishOwner(fish,fn)}
function targetFor(x,y){
 if(mode!=="host"||!connected||!coopStarted||remote.hp<=0)return player;
 if(life<=0)return remote;
 return (x-player.x)**2+(y-player.y)**2 <= (x-remote.x)**2+(y-remote.y)**2 ?player:remote;
}

function autoFish(manual=false){
 if(!connected||!coopStarted||!gameStarted||gameOver||paused||choosingUpgrade||remote.hp<=0)return;
 window.coopBridge.guestShoot(remote,manual);
}
function update(dt){if(mode!=="host"||!connected||!coopStarted||!gameStarted||gameOver||paused||choosingUpgrade)return;if(performance.now()-remote.receivedAt>1300){remote.keys={};remote.clicks=0}let mx=0,my=0;const k=remote.keys;if(k.w||k.arrowup)my--;if(k.s||k.arrowdown)my++;if(k.a||k.arrowleft)mx--;if(k.d||k.arrowright)mx++;const len=Math.hypot(mx,my);if(len&&remote.hp>0){window.coopBridge.withGuestBuild(()=>{const speed=player.speed*upgrades.moveSpeed*getZoomiesMoveMultiplier()*getStarSpeedMultiplier()*dt;remote.x=Math.max(remote.r,Math.min(canvas.width-remote.r,remote.x+mx/len*speed));remote.y=Math.max(remote.r,Math.min(canvas.height-remote.r,remote.y+my/len*speed))},remote.hp,false,remote.level)}remote.angle=Math.atan2(remote.aimY-remote.y,remote.aimX-remote.x);remote.shootAnim=Math.max(0,remote.shootAnim-dt);remote.hurtAnim=Math.max(0,remote.hurtAnim-dt);autoFish();if(remote.clicks){remote.clicks=0;autoFish(true)}if(remote.hp>0)for(const cat of cats){if(!isCombatTargetAvailable(cat)||cat.damageCooldown>0)continue;if(Math.hypot(cat.x-remote.x,cat.y-remote.y)<cat.r+remote.r-4){cat.damageCooldown=.75;remote.hurtAnim=.24;window.coopBridge.withGuestBuild(()=>{remote.hp-=Math.max(1,cat.small?2:5)*(1-Math.min(.45,Math.max(0,upgrades.damageReduction||0)))});remote.hp=Math.max(0,remote.hp);break}}
if(remote.hp>0&&boss&&isCombatTargetAvailable(boss)&&Math.hypot(remote.x-boss.x,remote.y-boss.y)<remote.r+boss.r-8){const damage=boss.type==="demon"?boss.contactDamage*dt:Math.max(3,boss.contactDamage||12)*dt;window.coopBridge.withGuestBuild(()=>{remote.hp=Math.max(0,remote.hp-damage*(1-Math.min(.45,Math.max(0,upgrades.damageReduction||0))))});remote.hurtAnim=.2;}
}
function draw(){if(!coopStarted)return;if(mode==="host")window.coopBridge.drawSecond({...remote,hp:remote.hp});else if(mode==="guest"&&lastFrame)window.coopBridge.drawSecond({...lastFrame.p,skin:lastFrame.sk||"default",label:"J1"})}
function sync(){if(mode!=="host"||!connected||!coopStarted)return;const now=performance.now();if(now-frameAt<80||channel?.bufferedAmount>350000)return;frameAt=now;try{const serialized=window.coopBridge.capture(remote);send({t:"frame",f:serialized})}catch(e){console.warn("Coop sync",e)}}
createBtn.addEventListener("click",host);joinBtn.addEventListener("click",join);closeBtn.addEventListener("click",release);nextBtn.addEventListener("click",next);copyBtn.addEventListener("click",async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value);msg("Código copiado. Compártelo de forma privada.")}catch(e){output.focus();output.select();msg("Selecciona el código y pulsa Ctrl+C.")}});
startBtn.addEventListener("click",()=>{if(mode!=="host"||!connected)return;startBtn.hidden=true;coopStarted=true;startGame();remote.hp=window.coopBridge.guestMaxLife();send({t:"begin"});msg("Cooperativo iniciado. Ranking y récords desactivados.")});$("coopGuestLeave").addEventListener("click",()=>{release();startPanel.style.display="flex";document.body.classList.remove("coopGuestRunning")});
canvas.addEventListener("mousemove",e=>{if(mode==="guest"&&coopStarted)pointer(e)});canvas.addEventListener("mousedown",e=>{if(mode!=="guest"||!coopStarted)return;e.preventDefault();pointer(e);if(e.button===0)sendGuest(1)},true);canvas.addEventListener("contextmenu",e=>{if(mode==="guest")e.preventDefault()});
window.addEventListener("keydown",e=>{if(mode!=="guest"||!connected||!coopStarted)return;const k=e.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)){e.preventDefault();e.stopImmediatePropagation();guestKeys[k]=true;sendGuest()}},true);window.addEventListener("keyup",e=>{if(mode!=="guest"||!connected)return;const k=e.key.toLowerCase();if(guestKeys[k]){delete guestKeys[k];sendGuest()}},true);window.addEventListener("blur",()=>{for(const k in guestKeys)delete guestKeys[k];sendGuest()});setInterval(()=>{if(mode==="guest"&&connected&&coopStarted)sendGuest()},95);
window.coopTest={get hostActive(){return mode==="host"&&connected&&coopStarted},get guestActive(){return mode==="guest"&&connected&&coopStarted},get inRun(){return coopStarted},resetSolo(){coopStarted=false},leave:release,resetPlayer:resetRemote,allowsHost,noteHostOffers,markHostChoice,prepareGuestUpgrade,prepareGuestShop,waitGuestShop,waitGuestUpgrade,grantGuestCoins,guestCollectCoin,grantGuestXP,grantGuestBossLevel,offerQueuedGuest,targetFor,guestCanCollect,guestProjectileHit,guestAreaHit,guestHeal,guestWaveHeal,fishPlayer,guestLifeSteal,guestSaltLifeSteal,withFishOwner,update,draw,sync};
})();
