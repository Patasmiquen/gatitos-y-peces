

const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const scoreEl=document.getElementById("score"),shotsEl=document.getElementById("shots"),lifeEl=document.getElementById("life"),levelEl=document.getElementById("level"),xpEl=document.getElementById("xp"),xpNeedEl=document.getElementById("xpNeed"),waveEl=document.getElementById("wave"),timeLeftEl=document.getElementById("timeLeft"),lifeBar=document.getElementById("lifeBar"),xpBar=document.getElementById("xpBar"),timeBar=document.getElementById("timeBar"),messageEl=document.getElementById("message"),startPanel=document.getElementById("startPanel"),startButton=document.getElementById("startButton"),levelUpPhrase=document.getElementById("levelUpPhrase"),levelUpPanel=document.getElementById("levelUpPanel"),levelUpBox=document.getElementById("levelUpBox"),upgradeCards=document.getElementById("upgradeCards"),upgradeTitle=document.getElementById("upgradeTitle"),upgradeSubtitle=document.getElementById("upgradeSubtitle"),coinsEl=document.getElementById("coins");
const victoryPanel=document.getElementById("victoryPanel"),victoryFinishBtn=document.getElementById("victoryFinish"),victoryContinueBtn=document.getElementById("victoryContinue");
const gameOverPanel=document.getElementById("gameOverPanel"),gameOverRestartBtn=document.getElementById("gameOverRestart"),gameOverMenuBtn=document.getElementById("gameOverMenu"),gameOverTotalEl=document.getElementById("gameOverTotal"),gameOverBreakdownEl=document.getElementById("gameOverBreakdown"),gameOverRankEmojiEl=document.getElementById("gameOverRankEmoji"),gameOverRankLabelEl=document.getElementById("gameOverRankLabel"),victoryScoreAreaEl=document.getElementById("victoryScoreArea");
const fusionBackBtn=document.getElementById("fusionBackBtn");
const objectiveMainEl=document.getElementById("objectiveMain"),objectiveFusionEl=document.getElementById("objectiveFusion"),helpEl=document.getElementById("help");
const pausePanel=document.getElementById("pausePanel"),pauseStats=document.getElementById("pauseStats"),pauseRecordBadge=document.getElementById("pauseRecordBadge"),pauseUpgradesList=document.getElementById("pauseUpgradesList"),resumeButton=document.getElementById("resumeButton"),restartButton=document.getElementById("restartButton"),menuButton=document.getElementById("menuButton"),perfNotice=document.getElementById("perfNotice"),themeButtons=[...document.querySelectorAll(".themeChoice")];
const adminToggle=document.getElementById("adminToggle"),adminPanel=document.getElementById("adminPanel"),adminUpgradeSelect=document.getElementById("adminUpgradeSelect"),adminUniqueSelect=document.getElementById("adminUniqueSelect"),adminLog=document.getElementById("adminLog"),adminLock=document.getElementById("adminLock"),adminTools=document.getElementById("adminTools"),adminStateTag=document.getElementById("adminStateTag"),adminPassword=document.getElementById("adminPassword"),adminUnlockBtn=document.getElementById("adminUnlockBtn"),adminUpgradeAmount=document.getElementById("adminUpgradeAmount"),adminCoinAmount=document.getElementById("adminCoinAmount"),adminLevelAmount=document.getElementById("adminLevelAmount"),adminWaveValue=document.getElementById("adminWaveValue");
const playerNameInput=document.getElementById("playerNameInput"),nameWarning=document.getElementById("nameWarning"),refreshRankingBtn=document.getElementById("refreshRankingBtn"),startRankingList=document.getElementById("startRankingList"),victoryRankingList=document.getElementById("victoryRankingList"),gameOverRankingList=document.getElementById("gameOverRankingList"),victoryOnlineStatus=document.getElementById("victoryOnlineStatus"),gameOverOnlineStatus=document.getElementById("gameOverOnlineStatus");
const autoModeButton=document.getElementById("autoModeButton");

function getGameViewportSize(){
  const screenW=Number(window.screen?.availWidth)||window.innerWidth;
  const screenH=Number(window.screen?.availHeight)||window.innerHeight;
  const w=Math.max(320,Math.min(window.innerWidth,screenW));
  const h=Math.max(320,Math.min(window.innerHeight,screenH));
  return{w:Math.floor(w),h:Math.floor(h)};
}
function resize(){
  const size=getGameViewportSize();
  canvas.width=size.w;
  canvas.height=size.h;
  canvas.style.width=size.w+"px";
  canvas.style.height=size.h+"px";
}
function pointerToGame(e){
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/(rect.width||canvas.width||1);
  const sy=canvas.height/(rect.height||canvas.height||1);
  return{
    x:(e.clientX-rect.left)*sx,
    y:(e.clientY-rect.top)*sy
  };
}
resize();window.addEventListener("resize",resize);
let panelTheme=localStorage.getItem("gatitosPanelTheme")||"light";
function applyPanelTheme(theme){
  panelTheme=theme==="dark"?"dark":"light";
  document.body.classList.toggle("panel-theme-dark",panelTheme==="dark");
  themeButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.theme===panelTheme));
  try{localStorage.setItem("gatitosPanelTheme",panelTheme)}catch(e){}

  
}
themeButtons.forEach(btn=>btn.addEventListener("click",()=>applyPanelTheme(btn.dataset.theme)));

applyPanelTheme(panelTheme);

/* === Ranking online con Firebase === */
const GAME_VERSION="v59-no-theme-switch";
const PLAYER_NAME_KEY="gatitos_player_name";
const firebaseConfig={
  apiKey:"AIzaSyD2DJyvaXseXX2ZNZrUCmjXqa1fYytanRA",
  authDomain:"gatitos-peces-ranking.firebaseapp.com",
  projectId:"gatitos-peces-ranking",
  storageBucket:"gatitos-peces-ranking.firebasestorage.app",
  messagingSenderId:"1012763431319",
  appId:"1:1012763431319:web:4705c55fad841924cd34d2"
};
let rankingDb=null;
let firebaseReady=false;
let currentPlayerName="";
let lastScoreUploadKey="";
let rankingEligibleThisRun=true;
let rankingDisabledReason="";
let runStartWave=1;
const uploadingScoreKeys=new Set();
const rankingLists=["start","victory","gameOver"];
const rankingListEls={start:startRankingList,victory:victoryRankingList,gameOver:gameOverRankingList};
const rankingToggleAllBtns={start:document.getElementById("startRankingToggleAll"),victory:document.getElementById("victoryRankingToggleAll"),gameOver:document.getElementById("gameOverRankingToggleAll")};
const rankingDuplicateChecks={start:document.getElementById("startRankingShowDuplicates"),victory:document.getElementById("victoryRankingShowDuplicates"),gameOver:document.getElementById("gameOverRankingShowDuplicates")};
let rankingExpanded=false;
let rankingShowDuplicates=false;
let lastRankingRawRows=[];
let expandedRankingNameKey="";
function initRanking(){
  try{
    if(window.firebase&&firebaseConfig?.projectId){
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      rankingDb=firebase.firestore();
      firebaseReady=true;
    }
  }catch(e){firebaseReady=false;console.warn("Firebase ranking no disponible",e)}
}
function cleanPlayerName(value){
  return String(value||"").replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,16);
}
function getPlayerName(){
  const typed=cleanPlayerName(playerNameInput?.value||"");
  if(typed)return typed;
  return cleanPlayerName(localStorage.getItem(PLAYER_NAME_KEY)||"");
}
function savePlayerName(name){
  currentPlayerName=cleanPlayerName(name)||"Jugador";
  try{localStorage.setItem(PLAYER_NAME_KEY,currentPlayerName)}catch(e){}
  if(playerNameInput)playerNameInput.value=currentPlayerName;
  return currentPlayerName;
}
function setOnlineStatus(el,msg,type="info"){
  if(!el)return;
  el.textContent=msg;
  el.style.color=type==="ok"?"#8ce99a":type==="error"?"#ffb3c1":"#ffd6e7";
}
function rankingNameKey(name){
  return cleanPlayerName(name||"Jugador").toLowerCase();
}
function dedupeBestScoreByName(rows){
  const best=new Map();
  (rows||[]).forEach((row,index)=>{
    const key=rankingNameKey(row?.name);
    const current={...row,_fullRank:index+1,_nameKey:key};
    const prev=best.get(key);
    if(!prev||Number(current.score||0)>Number(prev.score||0))best.set(key,current);
  });
  return [...best.values()].sort((a,b)=>Number(b.score||0)-Number(a.score||0));
}
function getRowsForRankingView(){
  const exact=dedupeScoreRows(lastRankingRawRows);
  return rankingShowDuplicates?exact:dedupeBestScoreByName(exact);
}
function getRankingPositionsForName(nameKey){
  return dedupeScoreRows(lastRankingRawRows)
    .map((row,index)=>({...row,_fullRank:index+1,_nameKey:rankingNameKey(row?.name)}))
    .filter(row=>row._nameKey===nameKey);
}
function updateRankingControlVisibility(){
  rankingLists.forEach(id=>{
    const btn=rankingToggleAllBtns[id];
    const chk=rankingDuplicateChecks[id];
    if(btn)btn.textContent=rankingExpanded?"Ver top":"Ver todos";
    if(chk){
      chk.checked=!!rankingShowDuplicates;
      chk.closest(".onlineRankDuplicateToggle")?.classList.toggle("visible",rankingExpanded);
    }
  });
}
function renderRankingList(el,items){
  if(!el)return;
  if(!firebaseReady){el.innerHTML='<div class="onlineRankStatus">Ranking online no disponible.</div>';return;}
  if(!items||!items.length){el.innerHTML='<div class="onlineRankStatus">Todavía no hay puntuaciones. Sé la primera persona 💖</div>';return;}
  const me=cleanPlayerName(playerNameInput?.value||currentPlayerName);
  const exactRows=dedupeScoreRows(lastRankingRawRows);
  const rows=items.map((row,index)=>({...row,_shownRank:index+1,_nameKey:rankingNameKey(row?.name)}));
  el.innerHTML=rows.map((s,i)=>{
    const safeName=escapeHtml(cleanPlayerName(s.name)||"Jugador");
    const isMe=me&&safeName.toLowerCase()===escapeHtml(me).toLowerCase();
    const total=Number(s.score||0).toLocaleString();
    const meta=`Ronda ${Number(s.wave||0)} · Nivel ${Number(s.level||0)} · Jefes ${Number(s.bosses||0)}/4`;
    const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
    const realRank=s._fullRank&&s._fullRank!==i+1?` · puesto real #${s._fullRank}`:"";
    const duplicateCount=exactRows.filter(r=>rankingNameKey(r?.name)===s._nameKey).length;
    const dupeHint=duplicateCount>1&&!rankingShowDuplicates?` · ${duplicateCount} partidas`:"";
    const detailsOpen=expandedRankingNameKey&&expandedRankingNameKey===s._nameKey;
    const details=detailsOpen?renderRankingNameDetails(s._nameKey):"";
    return `<div class="onlineRankRow ${isMe?"me":""}" data-rank-name="${escapeHtml(s._nameKey)}" title="Click para ver sus otras posiciones"><div class="onlineRankPos">${medal}</div><div class="onlineRankName">${safeName}</div><div class="onlineRankScore">${total}</div><div class="onlineRankMeta">${escapeHtml(meta+realRank+dupeHint)}</div>${details}</div>`;
  }).join("");
  el.querySelectorAll(".onlineRankRow").forEach(row=>row.addEventListener("click",()=>{
    const key=row.dataset.rankName||"";
    expandedRankingNameKey=expandedRankingNameKey===key?"":key;
    renderAllRankingLists();
  }));
}
function renderRankingNameDetails(nameKey){
  const rows=getRankingPositionsForName(nameKey);
  if(rows.length<=1)return `<div class="onlineRankDetails">Solo tiene una puntuación guardada.</div>`;
  const positions=rows.slice(0,12).map(r=>`#${r._fullRank}: ${Number(r.score||0).toLocaleString()} pts · R${Number(r.wave||0)} · Nv${Number(r.level||0)}`).join("<br>");
  const more=rows.length>12?`<br>… y ${rows.length-12} más`:"";
  return `<div class="onlineRankDetails"><b>También aparece en:</b><br>${positions}${more}</div>`;
}
function renderAllRankingLists(targetEls=[startRankingList,victoryRankingList,gameOverRankingList].filter(Boolean)){
  updateRankingControlVisibility();
  const rows=getRowsForRankingView();
  const limited=rankingExpanded?rows:rows.slice(0,10);
  targetEls.forEach(el=>renderRankingList(el,limited));
}
function getRankQueryLimit(){
  return rankingExpanded?0:500;
}
function getScoreIdentityKey(data){
  return `${cleanPlayerName(data?.name)||"Jugador"}|${Number(data?.score||0)}|${Number(data?.wave||0)}|${Number(data?.level||0)}|${Number(data?.bosses||0)}|${Number(data?.impacts||0)}`;
}
function scoreDocIdFromKey(key){
  let h=2166136261;
  for(let i=0;i<key.length;i++){
    h^=key.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return "score_"+(h>>>0).toString(36);
}
function dedupeScoreRows(rows){
  const seen=new Set();
  return (rows||[]).filter(row=>{
    const key=getScoreIdentityKey(row);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
async function loadOnlineRanking(targetEls=[startRankingList]){
  initRanking();
  targetEls.forEach(el=>{if(el)el.innerHTML='<div class="onlineRankStatus">Cargando ranking...</div>';});
  updateRankingControlVisibility();
  if(!firebaseReady||!rankingDb){targetEls.forEach(el=>renderRankingList(el,[]));return;}
  try{
    const limit=getRankQueryLimit();
    const query=rankingDb.collection("scores").orderBy("score","desc");
    const snap=limit>0?await query.limit(limit).get():await query.get();
    const rows=[];
    snap.forEach(doc=>rows.push(doc.data()));
    lastRankingRawRows=rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
    renderAllRankingLists(targetEls);
  }catch(e){
    console.warn("No se pudo cargar ranking",e);
    targetEls.forEach(el=>{if(el)el.innerHTML='<div class="onlineRankStatus">No se pudo cargar el ranking. Revisa reglas/conexión.</div>';});
  }
}
async function submitOnlineScore(finalScore, statusEl, rankingEl){
  initRanking();

  const playedFromWave=Math.max(1,Math.floor(Number(runStartWave)||1));
  if(autoModeUsedThisRun||autoMode||playedFromWave!==1||!rankingEligibleThisRun){
    const disabledMsg=rankingDisabledReason||`Ranking desactivado: la partida empezó en ronda ${playedFromWave}.`;
    setOnlineStatus(statusEl,disabledMsg,"error");
    await loadOnlineRanking([startRankingList,rankingEl].filter(Boolean));
    return;
  }
  const name=savePlayerName(getPlayerName()||"Jugador");
  if(!firebaseReady||!rankingDb){setOnlineStatus(statusEl,"Ranking online no disponible en este momento.","error");return;}
  const data={
    name,
    score:Math.max(0,Math.floor(Number(finalScore.total)||0)),
    wave:Math.max(1,Math.floor(Number(wave)||1)),
    level:Math.max(1,Math.floor(Number(level)||1)),
    bosses:Math.max(0,Math.min(4,Math.floor(defeatedBossTypes?.size||0))),
    impacts:Math.max(0,Math.floor(Number(finalScore.impactCount)||0)),
    result:defeatedBossTypes?.size>=4?"boss_victory":"game_over",
    version:GAME_VERSION,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  const uploadKey=getScoreIdentityKey(data);
  const scoreDocId=scoreDocIdFromKey(uploadKey);
  if(uploadKey===lastScoreUploadKey||uploadingScoreKeys.has(uploadKey)){
    setOnlineStatus(statusEl,"Puntuación ya enviada al ranking.","ok");
    return;
  }
  uploadingScoreKeys.add(uploadKey);
  try{
    setOnlineStatus(statusEl,"Subiendo puntuación al ranking online...","info");
    const scoreRef=rankingDb.collection("scores").doc(scoreDocId);
    const existing=await scoreRef.get();
    if(existing.exists){
      lastScoreUploadKey=uploadKey;
      setOnlineStatus(statusEl,"Puntuación ya enviada al ranking.","ok");
    }else{
      await scoreRef.set(data);
      lastScoreUploadKey=uploadKey;
      setOnlineStatus(statusEl,"Puntuación guardada en el ranking online 💖","ok");
    }
    await loadOnlineRanking([startRankingList,rankingEl].filter(Boolean));
  }catch(e){
    console.warn("No se pudo subir puntuación",e);
    setOnlineStatus(statusEl,"No se pudo guardar online. Revisa que las reglas estén publicadas.","error");
  }finally{
    uploadingScoreKeys.delete(uploadKey);
  }
}
if(playerNameInput){
  playerNameInput.value=cleanPlayerName(localStorage.getItem(PLAYER_NAME_KEY)||"");
  playerNameInput.addEventListener("input",()=>{
    const clean=cleanPlayerName(playerNameInput.value);
    if(playerNameInput.value!==clean)playerNameInput.value=clean;
    if(nameWarning)nameWarning.textContent="";
    document.getElementById("startBox")?.classList.remove("nameError");
  });
}
if(refreshRankingBtn)refreshRankingBtn.addEventListener("click",()=>loadOnlineRanking([startRankingList]));
rankingLists.forEach(id=>{
  rankingToggleAllBtns[id]?.addEventListener("click",()=>{
    rankingExpanded=!rankingExpanded;
    if(!rankingExpanded)rankingShowDuplicates=false;
    expandedRankingNameKey="";
    loadOnlineRanking([startRankingList,victoryRankingList,gameOverRankingList].filter(Boolean));
  });
  rankingDuplicateChecks[id]?.addEventListener("change",e=>{
    rankingShowDuplicates=!!e.target.checked;
    expandedRankingNameKey="";
    renderAllRankingLists([startRankingList,victoryRankingList,gameOverRankingList].filter(Boolean));
  });
});
initRanking();
loadOnlineRanking([startRankingList]);

const keys={},mouse={x:canvas.width/2,y:canvas.height/2};
const player={x:canvas.width/2,y:canvas.height/2,r:24,speed:270,angle:0,shootAnim:0,hurtAnim:0};
const dogCompanion={x:canvas.width/2-50,y:canvas.height/2+45,r:15,shootCooldown:0,wag:0};
const lovePhrases=["Muy bien miamor, lo estás haciendo muy bien 💖","Lo has hecho muy bien pequeña 🌸","Mi niña es muy valiente 🐾","Eres la mejor gorda 💕","Estoy muy orgulloso de ti miamor ✨","Sigue así, preciosa 💗"];

function isPanelActuallyVisible(el){
  if(!el)return false;
  const style=window.getComputedStyle(el);
  return style.display!=="none"&&style.visibility!=="hidden"&&style.opacity!=="0";
}
function isAdminInterfaceOpen(){return !!adminPanel&&isPanelActuallyVisible(adminPanel)}
function shouldLockGamePointer(){
  // Desactivado: el bloqueo real del cursor rompía el click derecho para fijar enemigos.
  return false;
}
function releaseGamePointer(){
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  canvas.style.cursor="crosshair";
  document.body.style.cursor="auto";
}
function requestGamePointerLock(){
  // No usamos Pointer Lock para mantener el click derecho y el cursor normal del navegador.
  releaseGamePointer();
}
function syncGamePointerLock(){
  releaseGamePointer();
}
document.addEventListener("pointerlockchange",()=>{
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  canvas.style.cursor="crosshair";
  document.body.style.cursor="auto";
});

let score,shots,lastShot,lastAutoShot,lastFrame,gameOver,wave,spawnCooldown,life,level,xp,xpNeed,choosingUpgrade,gameStarted=false,paused=false,waveTime,waveDuration,waveUpgradePending=false,boss=null,shieldAngle=0,lastShieldHit=0,lastOmniBurst=0,rainbowChanceLevel=1,rainbowSelectedThisWave=false,rainbowSpawnedThisWave=false,rainbowPendingUntilKilled=false,coins=0,shopAvailable=false,firstShopReached=false,shopBossPending=false,fusionAvailable=false,lastBossType="",shopUpgradePurchases=0,shopFusionPurchases=0,dogKidnapped=false,avalancheActive=false,avalancheTime=0,avalancheDelay=999,avalancheThisWave=false,avalancheSpawnTimer=0,starChanceLevel=1,starActive=false,starTime=0,starWarningPlayed=false,forceDemonNextBoss=false,sevenLivesTime=0,sevenLivesCooldown=0,sevenLivesUsedThisWave=false,musicianSpawnedThisWave=false,musicianNoteTimer=0,musicianMelodyIdx=0;
let perfFps=60,lowPerfMode=false,lowPerfTimer=0,perfNoticeTimer=0;
let backgroundFishSeed=Math.floor(Math.random()*1000000);
let pendingUpgradeQueue=[];
let runStats;
let defeatedBossTypes=new Set();
let bossEncounterCounts={giantCat:0,duck:0,seal:0,demon:0};
let giantFishEasterEggsUsed=0;
let mouseIsDown=false;
let selectedTarget=null;
let fusionMoveXpTimer=0;
let lastFusionShieldGuard=0;
let screenShake=0,screenShakeX=0,screenShakeY=0,lastStarTrail=0;
const fishes=[],cats=[],hearts=[],smokes=[],floatingTexts=[],pawPrints=[],quacks=[],coinsDrops=[],dogBones=[],demonOrbs=[],yarnBalls=[],powerStars=[],shockwaves=[],sparkles=[],tunaDrops=[];
let audioCtx=null;
let starAudio=null,starTwinkleTimer=0;
let lastImpactSoundAt=0;
let lastMeowSoundAt=0;
let catInstinctUsedThisWave=false,catInstinctUsesThisWave=0;
let dogSacrificeUsed=false;
let yarnTargetCounter=1;
let fusedUpgradeNames={};
let doneFusionPairs={};
let fusionProgressLevels={};
let bossVictoryAlreadyShown=false;
let bossVictoryScoreSaved=false;
let bossVictoryPending=false;
let dogRelaxTime=0;
let enemyIntroSeen={};
let finalChoiceLocked=false;
let demonSpawnPressure=0;
let thiefCoinsStolenThisWave=0;
perfFps=60;lowPerfMode=false;lowPerfTimer=0;perfNoticeTimer=0;if(perfNotice)perfNotice.classList.remove("visible");

const upgrades={fireRate:1,fishSpeed:1,damage:1,moveSpeed:1,maxLife:100,bigFishChance:0,doubleFishChance:0,pierceChance:0,fishSize:1,catSlow:0,healOnWave:8,lifeSteal:0,xpBoost:1,boomerangChance:0,shield:false,shieldLevel:0,autoFire:false,autoFireLevel:0,critChance:0,zoomies:false,zoomiesHyper:false,zoomiesCannon:false,zoomiesCrit:false,aimAssist:false,moralSupport:false,darkPact:false,catInstinct:false,boyfriendDog:false,boyfriendDogSpirit:false,boyfriendDogReturned:false,bigCursor:false,coinMagnetRange:0,combatAI:false,assistedShot:false,perfectAim:false,moraleFire:false,braveHeart:false,reflexBurst:false,valorCasa:false,cursedInstinct:false,fusionBonusPower:0,sevenLives:false,holdShoot:false};
const upgradeLevels={moveSpeed:0,fireRate:0,fishSpeed:0,bigFish:0,doubleFish:0,pierce:0,damage:0,catSlow:0,healOnWave:0,fishSize:0,maxLife:0,lifeSteal:0,xpBoost:0,boomerang:0,shield:0,coinMagnet:0,omniBurst:0,yarnBounce:0,autoFire:0,critChance:0};
const upgradeMaxLevels={moveSpeed:5,fireRate:5,fishSpeed:5,bigFish:5,doubleFish:5,pierce:5,damage:5,catSlow:5,healOnWave:5,fishSize:5,maxLife:5,lifeSteal:5,xpBoost:5,boomerang:5,shield:5,coinMagnet:5,omniBurst:5,yarnBounce:5,autoFire:5,critChance:5};
const fusedBaseLevels={}; // niveles ya "conservados" por fusiones: mantienen stats aunque la mejora vuelva a 0/5

const UPGRADE_META={
maxLife:{icon:"❤️",name:"Corazón de atún",desc:l=>"Aguantas más golpes."},
moveSpeed:{icon:"👟",name:"Zapatillas blanditas",desc:l=>"Te mueves más rápido."},
fireRate:{icon:"🐾",name:"Patita nerviosa",desc:l=>"Lanzas peces más seguido."},
fishSpeed:{icon:"🐟",name:"Pez cohete",desc:l=>"Tus peces van más rápido."},
bigFish:{icon:"💙",name:"Pez grandote",desc:l=>"A veces lanzas peces enormes."},
doubleFish:{icon:"🐠",name:"Banco de peces",desc:l=>"A veces lanzas peces extra."},
pierce:{icon:"✨",name:"Pez brillante",desc:l=>"Algunos peces atraviesan enemigos."},
damage:{icon:"💪",name:"Mimos potentes",desc:l=>"Tus peces hacen más daño."},
catSlow:{icon:"🧊",name:"Arena fresquita",desc:l=>"Los gatitos se acercan más lento."},
healOnWave:{icon:"🍣",name:"Sushi de descanso",desc:l=>"Te curas al superar rondas."},
fishSize:{icon:"🫧",name:"Peces esponjosos",desc:l=>"Tus peces son más grandes."},
lifeSteal:{icon:"🩸",name:"Besito vampiro",desc:l=>"Atacar también te cura un poco."},
xpBoost:{icon:"📚",name:"Aprendizaje gatuno",desc:l=>"Subes de nivel más rápido."},
boomerang:{icon:"🪃",name:"Pez boomerang",desc:l=>"Algunos peces vuelven hacia ti."},
coinMagnet:{icon:"🧲",name:"Imán de monedas",desc:l=>"Las monedas vienen hacia ti."},
shield:{icon:"🛡️",name:"Escudo de pececitos",desc:l=>"Peces guardianes giran a tu alrededor."},
omniBurst:{icon:"💥",name:"Metralladora gatuna",desc:l=>"De vez en cuando disparas en círculo."},
yarnBounce:{icon:"🧶",name:"Ovillo táctico",desc:l=>"Algunos peces rebotan a otro enemigo."},
autoFire:{icon:"🤖",name:"Patita automática",desc:l=>"Dispara automáticamente."},
critChance:{icon:"💥",name:"Mimos críticos",desc:l=>"A veces haces daño doble."}
};

const RECOMMEND_DIMENSIONS=["damage","defense","healing","mobility","economy","control","consistency","automation","area","scaling"];
const UPGRADE_RECOMMENDATION_PROFILE={
  maxLife:{defense:.95,healing:.15,scaling:.35},
  moveSpeed:{mobility:1,defense:.25,control:.2,consistency:.15},
  fireRate:{damage:.7,consistency:.35,scaling:.45},
  fishSpeed:{damage:.25,consistency:.7,control:.2},
  bigFish:{damage:.85,area:.35,scaling:.35},
  doubleFish:{damage:.65,area:.45,control:.25,scaling:.4},
  pierce:{area:.8,control:.55,damage:.35,consistency:.3},
  damage:{damage:1,scaling:.45},
  catSlow:{control:.85,defense:.45,mobility:.2},
  healOnWave:{healing:.9,defense:.35,scaling:.2},
  fishSize:{area:.65,consistency:.45,damage:.3},
  lifeSteal:{healing:1,damage:.2,scaling:.35},
  xpBoost:{scaling:1,economy:.35},
  boomerang:{control:.35,consistency:.75,area:.35,damage:.25},
  coinMagnet:{economy:1,consistency:.55,mobility:.15},
  shield:{defense:.9,control:.45,area:.25},
  omniBurst:{area:.95,control:.65,damage:.45},
  yarnBounce:{control:.85,area:.65,consistency:.4,damage:.25},
  autoFire:{automation:1,consistency:.8,damage:.25},
  critChance:{damage:.9,scaling:.35},
  aimAssist:{consistency:1,control:.35,automation:.25},
  bigCursor:{consistency:.75,control:.2},
  moralSupport:{healing:.3,defense:.25,consistency:.45},
  darkPact:{scaling:.95,damage:.25,automation:.2},
  catInstinct:{defense:1,healing:.35,consistency:.55},
  zoomies:{mobility:.9,damage:.35,control:.25}
};
const FUSION_RECOMMENDATION_PROFILE={
  "aimAssist+autoFire":{consistency:1,automation:1,control:.45,damage:.25},
  "autoFire+bigCursor":{consistency:.9,automation:.85,control:.25},
  "aimAssist+bigCursor":{consistency:1,control:.35},
  "darkPact+moralSupport":{defense:.65,healing:.35,automation:.55,consistency:.75},
  "catInstinct+darkPact":{defense:1,healing:.45,scaling:.35},
  "zoomies+autoFire":{automation:.85,damage:.45,mobility:.65,consistency:.45},
  "zoomies+catInstinct":{defense:.65,mobility:.9,consistency:.55},
  "coinMagnet+xpBoost":{economy:1,scaling:.9,consistency:.45},
  "catInstinct+coinMagnet":{economy:.9,defense:.8,healing:.45,consistency:.7,scaling:.35},
  "bigCursor+boomerang":{consistency:.95,control:.75,automation:.35},
  "boomerang+catInstinct":{control:.9,defense:.65,consistency:.65},
  "catInstinct+omniBurst":{area:1,defense:.65,damage:.45},
  "coinMagnet+darkPact":{economy:1,scaling:.8,consistency:.45},
  "shield+lifeSteal":{defense:.9,healing:.9,control:.25},
  "damage+critChance":{damage:1,scaling:.55},
  "pierce+yarnBounce":{area:.95,control:.9,consistency:.45},
  "doubleFish+omniBurst":{area:1,damage:.65,control:.7},
  "boomerang+aimAssist":{consistency:.95,control:.65,automation:.35},
  "fireRate+autoFire":{automation:.9,damage:.6,consistency:.55},
  "fishSize+bigFish":{area:.85,damage:.75,control:.35}
};
Object.keys(FUSION_RECOMMENDATION_PROFILE).forEach(pair=>{
  const parts=pair.split("+");
  if(parts.length!==2)return;
  const normalized=parts.sort().join("+");
  if(!FUSION_RECOMMENDATION_PROFILE[normalized])FUSION_RECOMMENDATION_PROFILE[normalized]=FUSION_RECOMMENDATION_PROFILE[pair];
});
function freshRunStats(){return{damageTaken:0,damageEvents:0,lowHpTime:0,enemiesNearTime:0,kills:0,shotsFired:0,fishHits:0,fishMisses:0,bossDamage:0,coinsGenerated:0,coinsCollected:0,coinsMissed:0,elapsed:0,lastShopAt:0};}
function clamp01(v){return Math.max(0,Math.min(1,Number.isFinite(v)?v:0))}
function emptyProfile(){return Object.fromEntries(RECOMMEND_DIMENSIONS.map(k=>[k,0]))}
function mergeProfiles(a,b,wa=1,wb=1){const p=emptyProfile();RECOMMEND_DIMENSIONS.forEach(k=>{p[k]=clamp01((a?.[k]||0)*wa+(b?.[k]||0)*wb)});return p}
function getRecommendationNeeds(){
  const st=runStats||freshRunStats(),mins=Math.max(.35,(st.elapsed||1)/60);
  const hpRatio=clamp01(life/Math.max(1,upgrades.maxLife||100));
  const killsPerMin=(st.kills||0)/mins;
  const hitRate=(st.fishHits||0)/Math.max(1,(st.fishHits||0)+(st.fishMisses||0));
  const damagePerMin=(st.damageTaken||0)/mins;
  const nearRatio=clamp01((st.enemiesNearTime||0)/Math.max(1,st.elapsed||1));
  const lowHpRatio=clamp01((st.lowHpTime||0)/Math.max(1,st.elapsed||1));
  const coinRate=(st.coinsCollected||0)/Math.max(1,(st.coinsCollected||0)+(st.coinsMissed||0));
  const bossPressure=boss?0.25:0;
  return{
    damage:clamp01(.30+(killsPerMin<18?(18-killsPerMin)/18*.45:0)+(hitRate>.55?0.1:0)+bossPressure+wave*.006),
    defense:clamp01(.15+(1-hpRatio)*.45+damagePerMin/70*.35+nearRatio*.25),
    healing:clamp01(.10+(1-hpRatio)*.55+lowHpRatio*.65+damagePerMin/90*.25),
    mobility:clamp01(.12+nearRatio*.55+(1-hitRate)*.15+damagePerMin/100*.18),
    economy:clamp01(.12+(1-coinRate)*.65+(coins<3?.22:0)+(st.elapsed<120?.12:0)),
    control:clamp01(.18+nearRatio*.75+(cats.length>18?.25:0)+(wave>10?.12:0)),
    consistency:clamp01(.15+(1-hitRate)*.78+nearRatio*.2+(st.shotsFired>18&&hitRate<.45?.22:0)),
    automation:clamp01(.10+(1-hitRate)*.35+nearRatio*.3+(st.shotsFired<8&&st.elapsed>60?.25:0)),
    area:clamp01(.12+nearRatio*.55+(cats.length>14?.3:0)+(wave>8?.15:0)),
    scaling:clamp01(.18+Math.min(.45,wave*.012)+(hpRatio>.65&&damagePerMin<20?.2:0))
  }
}
function profileForKey(key){return UPGRADE_RECOMMENDATION_PROFILE[key]||emptyProfile()}
function profileForChoice(choice){
  if(!choice)return emptyProfile();
  if(choice.randomShopUpgrade&&choice.hiddenUpgrade)return profileForChoice(choice.hiddenUpgrade);
  if(choice.first&&choice.key){const pair=sortedPair(choice.first,choice.key);return FUSION_RECOMMENDATION_PROFILE[pair]||mergeProfiles(profileForKey(choice.first),profileForKey(choice.key),.55,.55)}
  const pair=choice.key?getFusedPairForKey(choice.key):null;
  if(pair){return FUSION_RECOMMENDATION_PROFILE[pair]||mergeProfiles(...pair.split("+").map(profileForKey),.55,.55)}
  if(choice.key)return profileForKey(choice.key);
  if(choice.title&&String(choice.title).includes("Fusión"))return {scaling:.45,consistency:.25,damage:.15,defense:.15};
  return emptyProfile();
}
function recommendationKeyForChoice(choice){
  if(!choice)return "";
  if(choice.randomShopUpgrade&&choice.hiddenUpgrade)return choice.hiddenUpgrade.key||"";
  if(choice.key)return choice.key;
  return "";
}
function recommendationFusionPairForChoice(choice){
  if(!choice)return "";
  if(choice.first&&choice.key)return sortedPair(choice.first,choice.key);
  if(choice.key)return getFusedPairForKey(choice.key)||"";
  return "";
}
function recommendationProfileFit(prof,needs){
  let weighted=0,totalProfile=0,peak=0;
  RECOMMEND_DIMENSIONS.forEach(k=>{
    const p=prof?.[k]||0;
    const n=needs?.[k]||0;
    weighted+=p*n;
    totalProfile+=p;
    peak=Math.max(peak,p*n);
  });
  if(totalProfile<=0)return 0;
  return clamp01((weighted/Math.max(.01,totalProfile))*.82+peak*.32);
}
function recommendationStrategicFitForKey(key){
  if(!key)return 0;
  const strategic=Math.max(0,autoStrategicKeyScore(key)||0);
  const route=Math.max(0,autoFusionRouteValue(key)||0);
  const future=Math.max(0,autoFusionFutureValue(key)||0);
  return clamp01(strategic/1850+route/2600+future/3200);
}
function recommendationContextFit(key,context,needs){
  if(!key)return 0;
  let bonus=0;
  const hpRatio=life/Math.max(1,upgrades.maxLife||100);
  const pressure=cats.length+(boss?8:0)+quacks.length+yarnBalls.length+demonOrbs.length;
  if(hpRatio<.5&&["maxLife","healOnWave","lifeSteal","shield","catSlow","moveSpeed","catInstinct"].includes(key))bonus+=.14;
  if(pressure>15&&["pierce","yarnBounce","omniBurst","doubleFish","catSlow","shield","damage","fireRate"].includes(key))bonus+=.12;
  if(boss&&["damage","fireRate","critChance","lifeSteal","shield","autoFire"].includes(key))bonus+=.10;
  if(context==="shop"&&["coinMagnet","xpBoost"].includes(key)&&wave<14)bonus+=.06;
  if((needs?.consistency||0)>.55&&["aimAssist","fishSpeed","fishSize","autoFire","bigCursor"].includes(key))bonus+=.08;
  return clamp01(bonus);
}
function scoreRecommendationChoice(choice,needs,context="generic"){
  if(!choice||choice.locked||choice.skipShop)return -999;

  if(choice.openFusionShop){
    if(!canFuse(getEffectiveShopFusionPrice()))return -999;
    const bestPair=autoBestAvailableFusionPairScore();
    const noAffordableUpgrade=context==="shop"&&coins<getShopUpgradePrice()&&coins>=getEffectiveShopFusionPrice();
    return clamp01(bestPair/1650*.72+(noAffordableUpgrade ? .22 : 0)+.08);
  }

  const key=recommendationKeyForChoice(choice);
  const prof=profileForChoice(choice);
  const profileFit=recommendationProfileFit(prof,needs);
  const strategicFit=recommendationStrategicFitForKey(key);
  const oldRec=key?clamp01((scoreUpgradeRecommendation(key)?.score||0)/100):0;
  const contextFit=recommendationContextFit(key,context,needs);
  const pair=recommendationFusionPairForChoice(choice);
  const fusionFit=pair?clamp01(autoPairValue(pair)/1650):0;

  let score=profileFit*.42+strategicFit*.30+oldRec*.15+contextFit*.13;
  if(pair)score=Math.max(score,profileFit*.30+fusionFit*.46+oldRec*.16+contextFit*.08);
  if(choice.first&&choice.key)score+=.08;
  if(choice.fusion)score+=.04;

  if(choice.randomShopUpgrade){
    return -999;
  }

  if(key&&Object.prototype.hasOwnProperty.call(upgradeLevels,key)){
    const lv=upgradeLevels[key]||0;
    const max=upgradeMaxLevels[key]||5;
    if(max-lv<=1&&autoFusionFutureValue(key)>350)score+=.07;
    if(lv===0&&strategicFit<.34)score-=.04;
  }

  if(["bigCursor","moralSupport","darkPact"].includes(key)&&autoFusionFutureValue(key)<420&&autoFusionRouteValue(key)<420)score-=.16;
  if(key&&isUpgradeFinal(key))score-=10;

  return clamp01(score);
}
function recommendationReasonForProfile(prof,needs){
  const labels={damage:"Tu limpieza de enemigos va algo lenta.",defense:"Te vendrá bien aguantar más presión.",healing:"Necesitas recuperar vida con más seguridad.",mobility:"Te ayudará a reposicionarte mejor.",economy:"Te ayudará a aprovechar mejor las monedas.",control:"Tienes demasiada presión cerca.",consistency:"Hará tus ataques más constantes.",automation:"Te dará más comodidad al atacar.",area:"Te ayudará contra grupos grandes.",scaling:"Escala bien para rondas largas."};
  let best="damage",bestScore=-1;
  RECOMMEND_DIMENSIONS.forEach(k=>{const v=(prof[k]||0)*(needs[k]||0);if(v>bestScore){bestScore=v;best=k;}});
  return labels[best]||"Encaja mejor con tu partida actual.";
}
function applyRecommendationsToChoices(choices,context="generic"){
  const list=choices||[];
  list.forEach(c=>{if(c){delete c.recommended;delete c.recommendReason;delete c.recommendScore;}});

  // Recomendaciones no forzadas: solo aparece etiqueta si una opción encaja claramente.
  // Se aplica a tienda, subida de nivel, rondas, fusiones y gato arcoíris.
  if(!firstShopReached||context==="admin")return choices;

  const needs=getRecommendationNeeds();
  const valid=list
    .filter(c=>!c.locked&&!c.skipShop&&!c.randomShopUpgrade&&(c.key||c.fusion||!c.special))
    .map(c=>({choice:c,score:scoreRecommendationChoice(c,needs,context)}))
    .filter(entry=>entry.score>-100);

  if(valid.length===0)return choices;

  valid.sort((a,b)=>b.score-a.score);
  const best=valid[0];
  const secondScore=valid[1]?.score??0;
  const thirdScore=valid[2]?.score??0;
  const minScore=(context==="fusionFirst"||context==="fusionPartner")?.58:(context==="shop"?.54:.50);
  const lead=best.score-secondScore;
  const clusterLead=best.score-Math.max(secondScore,thirdScore);

  // Evita recomendaciones forzadas: si la mejor opción no destaca claramente,
  // no se marca nada aunque haya una pequeña ventaja matemática.
  if(best.score<minScore)return choices;
  if(best.score<.68&&lead<.085)return choices;
  if(best.score<.58&&clusterLead<.12)return choices;
  if(valid.length>=3&&best.score<.64&&clusterLead<.075)return choices;

  best.choice.recommended=true;
  best.choice.recommendScore=best.score;
  return choices;
}



function getAudioCtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function playCuteMeow(){const ac=getAudioCtx(),g=ac.createGain();g.gain.setValueAtTime(.045,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.34);g.connect(ac.destination);const o1=ac.createOscillator();o1.type="sine";o1.frequency.setValueAtTime(760+Math.random()*60,ac.currentTime);o1.frequency.exponentialRampToValueAtTime(520+Math.random()*40,ac.currentTime+.14);o1.connect(g);o1.start();o1.stop(ac.currentTime+.16);const o2=ac.createOscillator();o2.type="triangle";o2.frequency.setValueAtTime(470+Math.random()*40,ac.currentTime+.13);o2.frequency.exponentialRampToValueAtTime(330+Math.random()*30,ac.currentTime+.34);o2.connect(g);o2.start(ac.currentTime+.12);o2.stop(ac.currentTime+.36)}
function playFishSound(type="bloop"){const ac=getAudioCtx(),o=ac.createOscillator(),g=ac.createGain();if(type==="fiu"){o.type="sine";o.frequency.setValueAtTime(900,ac.currentTime);o.frequency.exponentialRampToValueAtTime(360,ac.currentTime+.18);g.gain.setValueAtTime(.023,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.2)}else{o.type="sine";o.frequency.setValueAtTime(260+Math.random()*80,ac.currentTime);o.frequency.exponentialRampToValueAtTime(190+Math.random()*60,ac.currentTime+.11);g.gain.setValueAtTime(.021,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.13)}o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.22)}
function startGame(){
  gameStarted=true;
  startPanel.style.display="none";
  restart();
  requestGamePointerLock();
}

function playSoftPop(){const ac=getAudioCtx(),o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.setValueAtTime(210,ac.currentTime);o.frequency.exponentialRampToValueAtTime(95,ac.currentTime+.16);g.gain.setValueAtTime(.03,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.2)}
function playCuteMeowThrottled(chance=.18,cooldown=180){
const now=performance.now();
if(now-lastMeowSoundAt<cooldown||Math.random()>chance)return;
lastMeowSoundAt=now;
playCuteMeow();
}
function playImpactSoundThrottled(chance=.22,cooldown=110){
const now=performance.now();
if(now-lastImpactSoundAt<cooldown||Math.random()>chance)return;
lastImpactSoundAt=now;
playImpactSound();
}
function playCatInstinctSound(){
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.055,ac.currentTime);
g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.55);
g.connect(ac.destination);
const low=ac.createOscillator();low.type="sine";low.frequency.setValueAtTime(150,ac.currentTime);low.frequency.exponentialRampToValueAtTime(58,ac.currentTime+.45);low.connect(g);low.start();low.stop(ac.currentTime+.5);
const high=ac.createOscillator();high.type="triangle";high.frequency.setValueAtTime(620,ac.currentTime+.03);high.frequency.exponentialRampToValueAtTime(980,ac.currentTime+.22);high.connect(g);high.start(ac.currentTime+.03);high.stop(ac.currentTime+.28);
}
function playMagicChime(){
const ac=getAudioCtx(),g=ac.createGain();g.gain.setValueAtTime(.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.7);g.connect(ac.destination);
[660,880,1320].forEach((f,i)=>{const o=ac.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,ac.currentTime+i*.055);o.connect(g);o.start(ac.currentTime+i*.055);o.stop(ac.currentTime+.45+i*.03)});
}

function playShopBuySound(){
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.028,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.22);
g.connect(ac.destination);
[523,659].forEach((f,i)=>{const o=ac.createOscillator();o.type="triangle";o.frequency.setValueAtTime(f,ac.currentTime+i*.07);o.connect(g);o.start(ac.currentTime+i*.07);o.stop(ac.currentTime+.22+i*.04)});
}
function playFusionCompleteSound(){
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.038,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.9);
g.connect(ac.destination);
[440,550,660,880].forEach((f,i)=>{const o=ac.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,ac.currentTime+i*.09);o.frequency.linearRampToValueAtTime(f*1.04,ac.currentTime+i*.09+.18);o.connect(g);o.start(ac.currentTime+i*.09);o.stop(ac.currentTime+.55+i*.07)});
}
function playVictoryJingle(){
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.042,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.4);
g.connect(ac.destination);
[523,659,784,1047,1319].forEach((f,i)=>{const o=ac.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,ac.currentTime+i*.12);o.connect(g);o.start(ac.currentTime+i*.12);o.stop(ac.currentTime+.55+i*.12)});
}


window.addEventListener("keydown",e=>{
const k=e.key.toLowerCase();
keys[k]=true;
if(k===" "||k==="spacebar"){e.preventDefault();if(gameStarted&&!gameOver&&!choosingUpgrade)togglePause()}
// La R solo reinicia desde Game Over. En el menú inicial no hace nada.
if(k==="r"&&gameStarted&&gameOver&&startPanel.style.display==="none"){restart()}
});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("mousemove",e=>{
  if(document.pointerLockElement===canvas){
    mouse.x=Math.max(0,Math.min(canvas.width,mouse.x+(e.movementX||0)));
    mouse.y=Math.max(0,Math.min(canvas.height,mouse.y+(e.movementY||0)));
  }else{
    const p=pointerToGame(e);mouse.x=p.x;mouse.y=p.y;
  }
});
canvas.addEventListener("mousedown",e=>{
mouseIsDown=true;
if(e.button===0&&!gameOver&&gameStarted&&!paused&&!choosingUpgrade)shootFish();
if(e.button===2&&!gameOver&&gameStarted&&!paused&&!choosingUpgrade){
  e.preventDefault();
  const p=pointerToGame(e);
  selectTargetAt(p.x,p.y);
}
});
window.addEventListener("mouseup",()=>{mouseIsDown=false});
resumeButton.addEventListener("click",closePause);
victoryFinishBtn.addEventListener("click",()=>{
  finalChoiceLocked=true;
  victoryPanel.style.display="none";
  gameOver=true;
  choosingUpgrade=false;
  levelUpPanel.style.display="none";
  messageEl.classList.remove("dogSave");
  const r=computeFinalScore();
  messageEl.innerHTML=`🌸 ¡Gracias por jugar!<br><small>Lo has hecho genial 💖 · ${r.total.toLocaleString()} puntos</small><br><button class="victoryBtn finish" onclick="returnToMainMenu()" style="margin-top:18px;font-size:16px;padding:10px 22px">Volver al menú 🏠</button>`;
  messageEl.style.display="block";
});
gameOverRestartBtn.addEventListener("click",()=>{gameOverPanel.style.display="none";startGame()});
victoryContinueBtn.addEventListener("click",()=>{
  victoryPanel.style.display="none";
  gameOver=false;
  choosingUpgrade=false;
  levelUpPanel.style.display="none";
  if(!bossVictoryAlreadyShown){
    bossVictoryAlreadyShown=true;
    floatingTexts.push({x:canvas.width/2,y:130,text:"💪 ¡Sigue mejorando!",life:2.5,maxLife:2.5,big:true});
  }
  if(shopAvailable)openCoinShop();
  else maybeOpenShopOrFusion();
});
restartButton.addEventListener("click",()=>{closePause();gameStarted=true;startPanel.style.display="none";restart()});
canvas.addEventListener("contextmenu",e=>e.preventDefault());
startButton.addEventListener("click",()=>{
  const name=getPlayerName();
  if(!name){
    if(nameWarning)nameWarning.textContent="Pon un nombre para entrar en el ranking.";
    document.getElementById("startBox")?.classList.add("nameError");
    playerNameInput?.focus();
    return;
  }
  savePlayerName(name);
  startGame();
});

function returnToMainMenu(){
  releaseGamePointer();
  mouseIsDown=false;
  paused=false;
  choosingUpgrade=false;
  gameOver=false;
  finalChoiceLocked=false;
  pausePanel.style.display="none";
  levelUpPanel.style.display="none";
  victoryPanel.style.display="none";
  gameOverPanel.style.display="none";
  messageEl.classList.remove("dogSave");
  messageEl.style.display="none";
  restart(1);
  gameStarted=false;
  paused=false;
  choosingUpgrade=false;
  startPanel.style.display="flex";
  loadOnlineRanking([startRankingList]);
}
menuButton.addEventListener("click",returnToMainMenu);
if(gameOverMenuBtn)gameOverMenuBtn.addEventListener("click",returnToMainMenu);

function resetUpgrades(){
Object.assign(upgrades,{fireRate:1,fishSpeed:1,damage:1,moveSpeed:1,maxLife:100,bigFishChance:0,doubleFishChance:0,pierceChance:0,fishSize:1,catSlow:0,healOnWave:8,lifeSteal:0,xpBoost:1,boomerangChance:0,shield:false,shieldLevel:0,autoFire:false,autoFireLevel:0,critChance:0,zoomies:false,zoomiesHyper:false,zoomiesCannon:false,zoomiesCrit:false,aimAssist:false,moralSupport:false,darkPact:false,catInstinct:false,boyfriendDog:false,boyfriendDogSpirit:false,boyfriendDogReturned:false,bigCursor:false,coinMagnetRange:0,combatAI:false,assistedShot:false,perfectAim:false,moraleFire:false,braveHeart:false,reflexBurst:false,valorCasa:false,cursedInstinct:false,fusionBonusPower:0,sevenLives:false,holdShoot:false});
Object.keys(upgradeLevels).forEach(k=>upgradeLevels[k]=0);Object.keys(upgradeMaxLevels).forEach(k=>upgradeMaxLevels[k]=5);Object.keys(fusedBaseLevels).forEach(k=>delete fusedBaseLevels[k]);fusedUpgradeNames={};doneFusionPairs={};fusionProgressLevels={};
}

function getXpNeedForLevel(targetLevel){
let need=5;
const lvl=Math.max(1,Math.floor(targetLevel||1));
for(let i=1;i<lvl;i++)need=Math.ceil(need*1.35+2);
return need;
}

function restart(){
stopPowerStarLoop();
backgroundFishSeed=Math.floor(Math.random()*1000000);
autoRunChoices=[];autoRunStartTime=performance.now();autoLastPlayerX=player.x;autoLastPlayerY=player.y;autoStuckTimer=0;autoEmergencyEscapeUntil=0;
resetUpgrades();
runStartWave=1;
autoModeUsedThisRun=!!autoMode;
rankingEligibleThisRun=!autoModeUsedThisRun;
rankingDisabledReason=rankingEligibleThisRun?"":"Ranking desactivado: la partida empezó con IA activada.";
score=0;shots=0;runStats=freshRunStats();lastScoreUploadKey="";lastShot=0;lastAutoShot=0;lastFrame=performance.now();gameOver=false;choosingUpgrade=false;paused=false;waveUpgradePending=false;pendingUpgradeQueue=[];wave=1;thiefCoinsStolenThisWave=0;spawnCooldown=0;life=upgrades.maxLife;level=1;xp=0;xpNeed=getXpNeedForLevel(level);boss=null;shieldAngle=0;lastShieldHit=0;lastOmniBurst=0;rainbowChanceLevel=1;rainbowSelectedThisWave=false;rainbowSpawnedThisWave=false;catInstinctUsedThisWave=false;catInstinctUsesThisWave=0;dogSacrificeUsed=false;rainbowPendingUntilKilled=false;coins=0;musicianSpawnedThisWave=false;shopAvailable=false;firstShopReached=false;shopBossPending=false;fusionAvailable=false;lastBossType="";shopUpgradePurchases=0;shopFusionPurchases=0;dogKidnapped=false;avalancheActive=false;avalancheTime=0;avalancheDelay=999;avalancheThisWave=false;avalancheSpawnTimer=0;starChanceLevel=1;starActive=false;starTime=0;starWarningPlayed=false;forceDemonNextBoss=false;sevenLivesTime=0;sevenLivesCooldown=0;sevenLivesUsedThisWave=false;defeatedBossTypes=new Set();bossEncounterCounts={giantCat:0,duck:0,seal:0,demon:0};giantFishEasterEggsUsed=0;bossVictoryAlreadyShown=false;bossVictoryScoreSaved=false;bossVictoryPending=false;dogRelaxTime=0;fusionMoveXpTimer=0;lastFusionShieldGuard=0;enemyIntroSeen={};finalChoiceLocked=false;demonSpawnPressure=0;thiefCoinsStolenThisWave=0;perfFps=60;lowPerfMode=false;lowPerfTimer=0;perfNoticeTimer=0;if(perfNotice)perfNotice.classList.remove("visible");
demonOrbs.length=0;yarnBalls.length=0;powerStars.length=0;shockwaves.length=0;sparkles.length=0;tunaDrops.length=0;
player.x=canvas.width/2;player.y=canvas.height/2;player.angle=0;player.shootAnim=0;player.hurtAnim=0;dogCompanion.x=player.x-50;dogCompanion.y=player.y+45;dogCompanion.shootCooldown=0;
fishes.length=0;cats.length=0;hearts.length=0;smokes.length=0;floatingTexts.length=0;pawPrints.length=0;quacks.length=0;coinsDrops.length=0;dogBones.length=0;demonOrbs.length=0;yarnBalls.length=0;shockwaves.length=0;sparkles.length=0;
canvas.style.cursor="crosshair";
messageEl.classList.remove("dogSave");messageEl.style.display="none";levelUpPanel.style.display="none";gameOverPanel.style.display="none";victoryPanel.style.display="none";life=upgrades.maxLife;startWave();updateHud()
}

function queueUpgradeMenus(reason,count){
  count=Math.max(0,Math.floor(count||0));
  for(let i=0;i<count;i++)pendingUpgradeQueue.push(reason||"level");
  processPendingUpgradeQueue();
}
function processPendingUpgradeQueue(){
  if(choosingUpgrade||gameOver||paused||!gameStarted)return;
  if(!pendingUpgradeQueue.length){maybeOpenShopOrFusion();return;}
  const next=pendingUpgradeQueue.shift();
  openUpgradeMenu(next,{fromQueue:true});
}
function cleanupRoundScreen(opts={}){
  const keepFloating=!!opts.keepFloating;
  const keepSoftEffects=!!opts.keepSoftEffects;
  cats.length=0;
  fishes.length=0;
  quacks.length=0;
  coinsDrops.length=0;
  dogBones.length=0;
  demonOrbs.length=0;
  yarnBalls.length=0;
  powerStars.length=0;
  tunaDrops.length=0;
  hearts.length=0;
  if(!keepSoftEffects){
    smokes.length=0;
    pawPrints.length=0;
    shockwaves.length=0;
    sparkles.length=0;
  }
  if(!keepFloating)floatingTexts.length=0;
  avalancheActive=false;
  avalancheTime=0;
  avalancheSpawnTimer=0;
  stopPowerStarLoop();
  starActive=false;
  starTime=0;
  starWarningPlayed=false;
}

function collectAllMapLootAfterBoss(){
  let collectedCoins=0;
  for(let i=0;i<coinsDrops.length;i++){
    const coin=coinsDrops[i];
    const amount=Math.max(0,Math.floor(Number(coin?.amount)||0));
    if(amount<=0)continue;
    coins+=amount;
    collectedCoins+=amount;
    if(runStats)runStats.coinsCollected+=amount;
    if(hasDoneFusionPair("coinMagnet+healOnWave")){
      life=Math.min(upgrades.maxLife,life+Math.max(1,Math.round(upgrades.healOnWave*.10))*amount);
    }
  }

  let collectedTuna=0;
  let healed=0;
  for(let i=0;i<tunaDrops.length;i++){
    const heal=Math.round(15+Math.random()*10);
    healed+=heal;
    collectedTuna++;
  }
  if(healed>0)life=Math.min(upgrades.maxLife,life+healed);

  coinsDrops.length=0;
  tunaDrops.length=0;

  if(collectedCoins>0||collectedTuna>0){
    const parts=[];
    if(collectedCoins>0)parts.push(`+${collectedCoins} 🪙`);
    if(collectedTuna>0)parts.push(`+${collectedTuna} 🐟`);
    floatingTexts.push({x:canvas.width/2,y:150,text:`Recogido: ${parts.join(" · ")}`,life:1.7,maxLife:1.7,big:true});
  }
  updateHud();
}

function startWave(){
waveDuration=Math.min(45,10+(wave-1)*5);
waveTime=waveDuration;
spawnCooldown=.25;
cleanupRoundScreen({keepFloating:true,keepSoftEffects:false});boss=null;
rainbowSpawnedThisWave=false;
catInstinctUsedThisWave=false;catInstinctUsesThisWave=0;sevenLivesUsedThisWave=false;musicianSpawnedThisWave=false;
if(rainbowPendingUntilKilled)rainbowSelectedThisWave=true;
else{
const rainbowChance=Math.min(.78,rainbowChanceLevel*.013);
rainbowSelectedThisWave=Math.random()<rainbowChance;
if(rainbowSelectedThisWave)rainbowPendingUntilKilled=true;
else rainbowChanceLevel++;
}
avalancheActive=false;
avalancheTime=0;
avalancheSpawnTimer=0;
const avalancheCfg=getAvalancheConfig();
// Avalancha progresiva:
// - Siempre ocurre en la ronda posterior a un boss: 6, 11, 16, 21...
// - Además puede aparecer de forma aleatoria en rondas avanzadas que no sean boss.
const forcedPostBossAvalanche=wave>=6&&wave%5===1;
const randomAvalanche=wave>=14&&wave%5!==0&&Math.random()<avalancheCfg.chance;
avalancheThisWave=forcedPostBossAvalanche||randomAvalanche;
avalancheDelay=avalancheThisWave?Math.max(2.8,waveDuration*(.58-avalancheCfg.intensity*.14)):999;
trySpawnPowerStar();
if(wave%5===0)spawnBoss();
floatingTexts.push({x:canvas.width/2,y:115,text:wave%5===0?`Jefe ronda ${wave}`:`Ronda ${wave}`,life:1.8,maxLife:1.8,big:true})
}

function getAvalancheConfig(){
const intensity=Math.max(0,Math.min(1,(wave-6)/34));
return {
  intensity,
  chance:Math.min(.42,.045+Math.max(0,wave-14)*.014),
  duration:2.8+intensity*7.2,
  amount:1+Math.floor(intensity*5),
  interval:Math.max(.28,1.05-intensity*.62),
  smallChance:Math.max(.32,1-intensity*.62)
};
}

function updateAvalanche(dt){
if(boss||!avalancheThisWave)return;
const cfg=getAvalancheConfig();

if(avalancheThisWave&&!avalancheActive){
avalancheDelay-=dt;
if(avalancheDelay<=0){
avalancheActive=true;
avalancheTime=cfg.duration;
avalancheSpawnTimer=0;
const label=wave<15?"⚠️ Mini avalancha de gatitos":wave<25?"⚠️ Avalancha de gatitos":"⚠️ ¡Gran avalancha felina!";
floatingTexts.push({x:canvas.width/2,y:145,text:label,life:2,maxLife:2,big:true});
}
}

if(!avalancheActive)return;

avalancheTime-=dt;
avalancheSpawnTimer-=dt;

if(avalancheSpawnTimer<=0){
for(let i=0;i<cfg.amount;i++){
const small=Math.random()<cfg.smallChance;
spawnCat(null,null,small);
}
avalancheSpawnTimer=cfg.interval;
}

if(avalancheTime<=0){
avalancheActive=false;
floatingTexts.push({x:canvas.width/2,y:145,text:"La avalancha terminó 🐾",life:1.5,maxLife:1.5,big:false});
}
}

function trySpawnPowerStar(){
if(starActive||powerStars.length>0)return;
const chance=Math.min(.22,.018+starChanceLevel*.012);
if(Math.random()<chance){
const margin=90;
powerStars.push({x:margin+Math.random()*(canvas.width-margin*2),y:margin+Math.random()*(canvas.height-margin*2),r:18,life:14,wobble:Math.random()*Math.PI*2});
starChanceLevel=1;
floatingTexts.push({x:canvas.width/2,y:175,text:"⭐ ¡Ha aparecido una estrella!",life:2,maxLife:2,big:true});
}else starChanceLevel++;
}

function playStarPickupSound(){
// Sonido de recoger estrella: toma como base el “cling” de moneda/compra, pero más suave y musical.
try{
  const ac=getAudioCtx();
  const t=ac.currentTime;
  const master=ac.createGain();
  master.gain.setValueAtTime(.0001,t);
  master.gain.linearRampToValueAtTime(.010,t+.035);
  master.gain.exponentialRampToValueAtTime(.0001,t+.72);
  master.connect(ac.destination);

  const notes=[523.25,659.25,783.99,1046.50];
  notes.forEach((freq,i)=>{
    const start=t+i*.085;
    const g=ac.createGain();
    g.gain.setValueAtTime(.0001,start);
    g.gain.linearRampToValueAtTime(.20,start+.025);
    g.gain.exponentialRampToValueAtTime(.0001,start+.25);
    g.connect(master);
    const o=ac.createOscillator();
    o.type="triangle";
    o.frequency.setValueAtTime(freq,start);
    o.frequency.linearRampToValueAtTime(freq*1.008,start+.16);
    o.connect(g);
    o.start(start);
    o.stop(start+.30);
  });
}catch(e){}
}

function stopPowerStarLoop(){
try{
  if(starAudio&&starAudio.gain){
    const ac=getAudioCtx(),t=ac.currentTime;
    starAudio.gain.gain.cancelScheduledValues(t);
    starAudio.gain.gain.setValueAtTime(Math.max(.0001,starAudio.gain.gain.value||.001),t);
    starAudio.gain.gain.exponentialRampToValueAtTime(.0001,t+.18);
  }
}catch(e){}
starAudio=null;
starTwinkleTimer=0;
}
function startPowerStarLoop(){
try{
  stopPowerStarLoop();
  const ac=getAudioCtx(),t=ac.currentTime;
  const main=ac.createGain();
  main.gain.setValueAtTime(.0001,t);
  main.gain.linearRampToValueAtTime(.020,t+.18);
  main.connect(ac.destination);
  // No hay zumbido constante: solo pequeñas notas tranquilas mientras dura la estrella.
  starAudio={gain:main,duration:10,melodyIndex:0};
  starTwinkleTimer=.08;
}catch(e){starAudio=null;}
}
function updatePowerStarLoop(){
try{
  if(!starAudio||!starActive||starTime<=0)return;
  const ac=getAudioCtx(),t=ac.currentTime;
  const ratio=Math.max(0,Math.min(1,starTime/(starAudio.duration||10)));
  const vol=.004+ratio*.018;
  starAudio.gain.gain.cancelScheduledValues(t);
  starAudio.gain.gain.setTargetAtTime(vol,t,.12);
}catch(e){}
}
function playStarTwinkle(intensity=1){
try{
  if(!starAudio||!starAudio.gain)return;
  const ac=getAudioCtx(),t=ac.currentTime;
  const ratio=Math.max(0,Math.min(1,intensity));

  // Melodía tranquila, inspirada en el sonido de moneda: notas cortas, dulces y sin golpe fuerte.
  const melody=[523.25,659.25,783.99,1046.50,783.99,659.25,587.33,659.25,783.99,659.25,523.25,392.00];
  const idx=starAudio.melodyIndex||0;
  const freq=melody[idx%melody.length];
  starAudio.melodyIndex=idx+1;

  const g=ac.createGain();
  g.gain.setValueAtTime(.0001,t);
  g.gain.linearRampToValueAtTime(.18+ratio*.16,t+.022);
  g.gain.exponentialRampToValueAtTime(.0001,t+.24+ratio*.08);
  g.connect(starAudio.gain);

  const o=ac.createOscillator();
  o.type="triangle";
  o.frequency.setValueAtTime(freq,t);
  o.frequency.linearRampToValueAtTime(freq*1.006,t+.16);
  o.connect(g);
  o.start(t);
  o.stop(t+.30+ratio*.08);
}catch(e){}
}

function activatePowerStar(){
starActive=true;
starTime=10;
starWarningPlayed=false;
playStarPickupSound();
startPowerStarLoop();
shockwaves.push({x:player.x,y:player.y,r:8,maxR:130,life:.55,maxLife:.55,color:"#ffd166",line:6});
shockwaves.push({x:player.x,y:player.y,r:5,maxR:80,life:.38,maxLife:.38,color:"#fff176",line:4});
makeSmoke(player.x,player.y);
floatingTexts.push({x:player.x,y:player.y-80,text:"⭐ ¡Invencible!",life:1.8,maxLife:1.8,big:true});
}

function isPowerStarActive(){return starActive&&starTime>0}
function getStarSpeedMultiplier(){return isPowerStarActive()?1.55:1}
function isSevenLivesActive(){return upgrades.sevenLives&&sevenLivesTime>0}
function isPlayerProtected(){return isPowerStarActive()||isSevenLivesActive()}
function activateSevenLives(){
  if(!upgrades.sevenLives||sevenLivesUsedThisWave||sevenLivesCooldown>0||gameOver)return false;
  sevenLivesUsedThisWave=true;
  sevenLivesCooldown=70;
  sevenLivesTime=7;
  life=Math.max(7,Math.min(upgrades.maxLife,Math.max(life,Math.ceil(upgrades.maxLife*.18))));
  player.hurtAnim=.35;
  playMagicChime();
  makeSmoke(player.x,player.y);
  shockwaves.push({x:player.x,y:player.y,r:8,maxR:170,life:.75,maxLife:.75,color:"#80ed99",line:7});
  shockwaves.push({x:player.x,y:player.y,r:5,maxR:105,life:.55,maxLife:.55,color:"#ffd166",line:5});
  for(let i=0;i<20;i++){const a=Math.random()*Math.PI*2,sp=80+Math.random()*190;sparkles.push({x:player.x,y:player.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,size:4+Math.random()*5,life:.7+Math.random()*.35,maxLife:1,color:i%2?"#80ed99":"#ffd166"});}
  floatingTexts.push({x:player.x,y:player.y-92,text:"🐱 ¡Siete vidas!",life:1.8,maxLife:1.8,big:true});
  return true;
}
function takePlayerDamage(amount,deathText,hurt=.2){
if(runStats){runStats.damageTaken+=(Number.isFinite(amount)?amount:0);runStats.damageEvents++;}
if(isPlayerProtected()){
player.hurtAnim=.08;
if(Math.random()<.22)floatingTexts.push({x:player.x,y:player.y-56,text:isSevenLivesActive()?"🐱 protegido":"⭐ invulnerable",life:.65,maxLife:.65,big:false});
return false;
}
if(hasDoneFusionPair("catInstinct+shield")&&upgrades.shield&&performance.now()-lastFusionShieldGuard>10000){
lastFusionShieldGuard=performance.now();
amount*=0.35;
shockwaves.push({x:player.x,y:player.y,r:8,maxR:150,life:.55,maxLife:.55,color:"#90e0ef",line:6});
cats.forEach(cat=>{if(!isFinitePos(cat))return;const dx=cat.x-player.x,dy=cat.y-player.y,d=Math.hypot(dx,dy)||1;if(d<330){cat.knockVx=(cat.knockVx||0)+(dx/d)*420;cat.knockVy=(cat.knockVy||0)+(dy/d)*420;cat.hitAnim=.18;}});
floatingTexts.push({x:player.x,y:player.y-86,text:"🛡️ Guardia felina",life:1.1,maxLife:1.1,big:false});
}
const predictedLife=life-amount;
if(upgrades.sevenLives&&predictedLife<7&&activateSevenLives())return false;
life=predictedLife;
player.hurtAnim=hurt;
if(life<=0)endGame(deathText);
return true;
}

const BOSS_DISPLAY_NAMES={giantCat:"Gato gigante",duck:"Pato",seal:"Foca",demon:"Demonio"};
function getBossRepeatLevel(type){
  return Math.max(0,(bossEncounterCounts&&bossEncounterCounts[type]?bossEncounterCounts[type]:0)-1);
}

function showBossVictoryPanel(){
  releaseGamePointer();
  if(!victoryPanel||gameOver||bossVictoryAlreadyShown)return;
  bossVictoryPending=false;
  stopPowerStarLoop();
  gameOver=true;
  levelUpPanel.style.display="none";
  document.querySelector("#victoryBox h1").textContent="🏆 ¡Lo has hecho genial!";
  document.querySelector("#victoryBox .victoryMsg").innerHTML=`<span class="vLine vMain">Lo has hecho muy bien, mi amor 💖. ¡Has derrotado a todos los jefes!</span><span class="vLine vSub">Puedes seguir jugando para conseguirlo todo ✨</span>`;
  injectVictoryScore();
  victoryPanel.style.display="flex";
  playVictoryJingle();
}

function getPendingBossTypes(){
  return ["giantCat","duck","seal","demon"].filter(t=>!defeatedBossTypes.has(t));
}
function isBossTypeAllowedNow(type){
  if(type!=="demon")return true;

  // Primer jefe: nunca demonio. La ronda 5 debe ser una pelea normal y balanceada.
  if(wave<=5)return false;

  const hasDogFusion=upgrades.boyfriendDog&&!dogKidnapped&&!dogSacrificeUsed;

  // Con la fusión del perro, el demonio puede aparecer antes y con mucho más peso.
  if(hasDogFusion)return wave>=10;
  if(forceDemonNextBoss)return wave>=10;

  // Sin perro, el demonio aparece como jefe tardío.
  return wave>=20;
}
function weightedRandomBoss(weightedList){
  const valid=weightedList.filter(item=>item.weight>0);
  if(!valid.length)return null;

  const total=valid.reduce((sum,item)=>sum+item.weight,0);
  let roll=Math.random()*total;

  for(const item of valid){
    roll-=item.weight;
    if(roll<=0)return item.type;
  }

  return valid[valid.length-1].type;
}
function chooseNextBossType(types){
  let valid=types.filter(t=>isBossTypeAllowedNow(t));

  if(lastBossType==="demon"){
    const withoutDemon=valid.filter(t=>t!=="demon");
    if(withoutDemon.length)valid=withoutDemon;
  }

  if(!valid.length)return types.find(t=>t!=="demon")||"giantCat";

  const pending=getPendingBossTypes();
  const hasDogFusion=upgrades.boyfriendDog&&!dogKidnapped&&!dogSacrificeUsed;
  const allBossesDefeated=pending.length===0;

  const weighted=valid.map(type=>{
    let weight=1;

    // Los jefes que todavía no han salido pesan más, pero no fuerzan un orden fijo.
    if(pending.includes(type))weight+=4;

    // Repetir el mismo jefe seguido es posible, pero muy raro.
    if(type===lastBossType)weight*=0.08;

    if(type==="demon"){
      if(wave<=5)return{type,weight:0};

      if(hasDogFusion){
        // Mucha probabilidad al tener perro, y cada boss fallido aumenta presión.
        weight+=8+demonSpawnPressure*7;
      }else if(forceDemonNextBoss){
        weight+=5+demonSpawnPressure*4;
      }else{
        weight+=wave>=20?1.5:0;
      }

      if(pending.includes("demon"))weight+=3;
    }

    // Una vez derrotados todos, vuelve a ser más libre, evitando repetir demasiado.
    if(allBossesDefeated)weight=type===lastBossType?0.12:1;

    return{type,weight};
  });

  return weightedRandomBoss(weighted)||valid[Math.floor(Math.random()*valid.length)]||"giantCat";
}
function getUpcomingFusionHints(limit=3){
  const hints=[];
  const keys=Object.keys(upgradeLevels).filter(k=>!fusedUpgradeNames[k]&&!isUpgradeFinal(k));
  for(const a of keys){
    for(const b of Object.keys(fusionPairs)){
      if(a===b||!areFusionCompatible(a,b)||hasFusionBeenDone(a,b)||fusedUpgradeNames[b])continue;
      const aNeed=Math.max(0,(upgradeMaxLevels[a]||5)-(upgradeLevels[a]||0));
      const bOwned=isUniqueKey(b)?hasUniqueUpgrade(b):true;
      const bNeed=isUniqueKey(b)?(bOwned?0:1):Math.max(0,(upgradeMaxLevels[b]||5)-(upgradeLevels[b]||0));
      if(aNeed+bNeed<=3)hints.push({text:`${getAnyName(a)} + ${getAnyName(b)}${aNeed+bNeed?` · faltan ${aNeed+bNeed}`:" · lista"}`,need:aNeed+bNeed});
    }
  }
  const ready=getMaxedFusionKeys();
  ready.forEach((a,i)=>ready.slice(i+1).forEach(b=>{if(areFusionCompatible(a,b)&&!hasFusionBeenDone(a,b))hints.push({text:`${getAnyName(a)} + ${getAnyName(b)} · lista`,need:0});}));
  const seen=new Set();
  return hints.sort((a,b)=>a.need-b.need).filter(h=>{if(seen.has(h.text))return false;seen.add(h.text);return true;}).slice(0,limit).map(h=>h.text);
}
function updateObjectivePanel(){
  if(!objectiveMainEl||!objectiveFusionEl)return;
  if(!gameStarted){objectiveMainEl.textContent="🎯 Objetivo: empieza la partida";objectiveFusionEl.textContent="🔮 Fusiones próximas: todavía no";return;}
  const pending=getPendingBossTypes().map(t=>BOSS_DISPLAY_NAMES[t]);
  let main=boss?`👑 Objetivo: derrota a ${BOSS_DISPLAY_NAMES[boss.type]||"el jefe"}`:wave%5===0?"👑 Objetivo: prepárate para jefe":"🎯 Objetivo: sobrevive y sube mejoras";
  if(pending.length)main+=` · faltan: ${pending.join(", ")}`;
  else main="🏆 Todos los jefes derrotados · puedes seguir o terminar";
  objectiveMainEl.textContent=main;
  const hints=getUpcomingFusionHints(2);
  objectiveFusionEl.textContent=hints.length?`🔮 Fusiones próximas: ${hints.join(" / ")}`:"🔮 Fusiones próximas: sube mejoras compatibles";
}
function showEnemyIntro(type){
  // Sin pop-ups explicativos para gatos especiales.
  // Se dejan solo sus señales visuales y comportamiento propio durante la partida.
  if(!type||type==="normal")return;
  enemyIntroSeen[type]=true;
}
function activateDogRescueRelax(){
  dogRelaxTime=3.2;
  const radius=820,force=760;
  shockwaves.push({x:player.x,y:player.y,r:8,maxR:radius*.55,life:.75,maxLife:.75,color:"#74d7f7",line:8});
  shockwaves.push({x:player.x,y:player.y,r:4,maxR:radius*.82,life:1.05,maxLife:1.05,color:"#ffd166",line:5});
  cats.forEach(cat=>{
    const dx=cat.x-player.x,dy=cat.y-player.y,d=Math.hypot(dx,dy)||1;
    const falloff=Math.max(.25,1-Math.min(d/radius,.85));
    cat.knockVx=(cat.knockVx||0)+(dx/d)*force*falloff;
    cat.knockVy=(cat.knockVy||0)+(dy/d)*force*falloff;
    cat.freezeTimer=Math.max(cat.freezeTimer||0,2.4);
    cat.damageCooldown=Math.max(cat.damageCooldown||0,3.0);
  });
  [quacks,yarnBalls,demonOrbs].forEach(list=>list.forEach(o=>{const dx=o.x-player.x,dy=o.y-player.y,d=Math.hypot(dx,dy)||1;o.vx=(dx/d)*Math.max(260,Math.hypot(o.vx||0,o.vy||0));o.vy=(dy/d)*Math.max(260,Math.hypot(o.vx||0,o.vy||0));}));
  if(boss){const dx=boss.x-player.x,dy=boss.y-player.y,d=Math.hypot(dx,dy)||1;boss.knockVx=(boss.knockVx||0)+(dx/d)*260;boss.knockVy=(boss.knockVy||0)+(dy/d)*260;boss.relaxTimer=Math.max(boss.relaxTimer||0,2.0);}
  floatingTexts.push({x:player.x,y:player.y-120,text:"🐶 Relax, yo te cubro",life:2,maxLife:2,big:true});
}
function isDogRelaxActive(){return dogRelaxTime>0}

function spawnBoss(){
let types=["giantCat","duck","seal"];

if(isBossTypeAllowedNow("demon")){
  types.push("demon");
}

let type=chooseNextBossType(types);
const hasDogFusion=upgrades.boyfriendDog&&!dogKidnapped&&!dogSacrificeUsed;

if(type==="demon"){
  demonSpawnPressure=0;
  forceDemonNextBoss=false;
}else if(hasDogFusion&&wave>5){
  // Si tienes perro y no sale demonio, la siguiente batalla de jefe sube su probabilidad.
  demonSpawnPressure++;
}

lastBossType=type;
const previousBossEncounters=bossEncounterCounts[type]||0;
bossEncounterCounts[type]=previousBossEncounters+1;
const bossRepeatLevel=previousBossEncounters;
if(bossRepeatLevel>0){
  floatingTexts.push({x:canvas.width/2,y:205,text:"👑 Jefe reforzado",life:1.6,maxLife:1.6,big:false});
}
const hpScale=wave<=5?1.05:1+wave*.10;

if(type==="demon"){
const hasDog=upgrades.boyfriendDog&&!dogSacrificeUsed;
if(hasDog){dogKidnapped=true;dogBones.length=0;}
demonOrbs.length=0;
const hp=Math.round((140+wave*22)*hpScale);
boss={
type,
x:canvas.width/2,
y:canvas.height*.22,
r:66+Math.min(26,wave*.75),
hp,
maxHp:hp,
speed:95+wave*2.2,
shoot:.9,
baseShoot:Math.max(.42,1.15-wave*.025),
circleCount:10+Math.min(10,Math.floor(wave/5))+Math.min(8,bossRepeatLevel*2),
orbSpeed:165+wave*5,
hitAnim:0,
wobble:0,
contactDamage:20+wave*.45
};
boss.repeatLevel=bossRepeatLevel;
const demonMsg=hasDog?"😈 El demonio ha robado a tu perro":"😈 ¡El demonio ha llegado!";
floatingTexts.push({x:canvas.width/2,y:170,text:demonMsg,life:2.6,maxLife:2.6,big:true});
return;
}

if(type==="giantCat"){
const hp=Math.round((80+wave*16)*hpScale);
boss={type,x:canvas.width/2,y:-90,r:62+Math.min(28,wave*1.2),hp,maxHp:hp,speed:42+wave*3.4,summon:Math.max(.42,2.15-wave*.07-bossRepeatLevel*.12),baseSummon:Math.max(.42,2.15-wave*.07-bossRepeatLevel*.12),summonCount:Math.min(8,2+Math.floor(wave/10)+Math.floor((bossRepeatLevel+1)/2)),hitAnim:0,wobble:0,contactDamage:16+wave*.7}
}else if(type==="duck"){
const hp=Math.round((90+wave*18)*hpScale);
boss={type,x:canvas.width/2,y:canvas.height*.25,r:58+Math.min(20,wave*.9),hp,maxHp:hp,shoot:Math.max(.30,1.25-wave*.045-bossRepeatLevel*.10),baseShoot:Math.max(.30,1.25-wave*.045-bossRepeatLevel*.10),burst:Math.min(4,1+Math.floor(wave/15)),quackSpeed:190+wave*12,hitAnim:0,wobble:0}
}else{
const tx=Math.random()*(canvas.width-180)+90,ty=Math.random()*(canvas.height-180)+90;
const hp=Math.round((95+wave*19)*hpScale);
boss={type,x:canvas.width/2,y:canvas.height*.35,r:55+Math.min(22,wave*.85),hp,maxHp:hp,hitAnim:0,wobble:0,state:"jumping",baseJumpDuration:Math.max(.52,1.12-wave*.025),jumpTimer:Math.max(.52,1.12-wave*.025),jumpDuration:Math.max(.52,1.12-wave*.025),startX:canvas.width/2,startY:canvas.height*.35,targetX:tx,targetY:ty,shadowX:tx,shadowY:ty,jumps:0,jumpsBeforeRest:Math.max(2,5-Math.floor(wave/15)+bossRepeatLevel),stunTimer:0,stunDuration:Math.max(.85,2.5-wave*.035-bossRepeatLevel*.16),slamDamage:13+wave*.65}
}
if(boss)boss.repeatLevel=bossRepeatLevel;
}

function fusionPostLevel(key){
let lvl=Object.prototype.hasOwnProperty.call(upgradeLevels,key)?(upgradeLevels[key]||0):0;
Object.keys(doneFusionPairs||{}).forEach(pair=>{
  if(!pair.split("+").includes(key))return;
  const rep=getFusionRepresentativeKey(pair);
  if(rep!==key&&Object.prototype.hasOwnProperty.call(upgradeLevels,key))lvl+=getFusionProgress(pair);
});
return lvl;
}
function effectLevel(key){return (fusedBaseLevels[key]||0)+fusionPostLevel(key)}
function getFusionComponentProgressBonus(key){
let bonus=0;
Object.keys(doneFusionPairs).forEach(pair=>{
  if(!pair.split("+").includes(key))return;
  const rep=getFusionRepresentativeKey(pair);
  if(rep===key)return;
  bonus+=getFusionProgress(pair);
});
return bonus;
}

function hasFusionComponent(key){
return Object.keys(doneFusionPairs||{}).some(pair=>pair.split("+").includes(key));
}
function getDoneFusionPairKeysFor(key){
return Object.keys(doneFusionPairs||{}).filter(pair=>pair.split("+").includes(key));
}
function getFusionComponentLevel(key){
return Math.max(0,effectLevel(key)||0);
}

function hasDoneFusionPair(pair){return !!doneFusionPairs[sortedPair(...String(pair||"").split("+"))]}
function getFishSizeFusionBonus(){
let bonus=0;
Object.keys(doneFusionPairs).forEach(pair=>{
  const parts=pair.split("+");
  if(!parts.includes("fishSize"))return;
  bonus+=1;
});
if(hasDoneFusionPair("bigFish+fishSize"))bonus+=2;
return bonus;
}
function nextLevel(key){return upgradeLevels[key]+1}
function isMax(key){return upgradeLevels[key]>=upgradeMaxLevels[key]}
function getUpgradeVisualLevel(key){const l=upgradeLevels[key]||0;if(isUpgradeFinal(key))return"upgradeTierMax";if(isUniqueKey(key)&&hasUniqueUpgrade(key))return"upgradeTierMax";if((upgradeMaxLevels[key]||5)<=1&&l>0)return"upgradeTierMax";if(l>=5)return"upgradeTierMax";if(l>=3)return"upgradeTierBoost";return"upgradeTierBase"}
function getOfferTierClass(upgrade){
if(!upgrade||upgrade.locked||upgrade.skipShop)return"";
if(upgrade.fusion){
  if(upgrade.title==="Fusión de mejoras")return"fusionTierBase";
  const pair=upgrade.key?getFusedPairForKey(upgrade.key):null;
  if(pair){
    const [a,b]=pair.split("+");
    if(isUniqueKey(a)&&isUniqueKey(b))return"fusionTierMax";
    const lv=getFusionVisualNextLevel(pair);
    if(lv>=5)return"fusionTierMax";
    if(lv>=3)return"fusionTierBoost";
    return"fusionTierBase";
  }
  if(upgrade.first&&upgrade.key){
    return (isUniqueKey(upgrade.first)&&isUniqueKey(upgrade.key))?"fusionTierMax":"fusionTierBase";
  }
  return"fusionTierBase";
}
if(upgrade.key&&isUniqueKey(upgrade.key))return"upgradeTierMax";
let targetLevel=1,maxLevel=5;
if(upgrade.key&&Object.prototype.hasOwnProperty.call(upgradeLevels,upgrade.key)){
  targetLevel=(upgradeLevels[upgrade.key]||0)+1;
  maxLevel=upgradeMaxLevels[upgrade.key]||5;
}else if(typeof upgrade.levelTag==="string"&&upgrade.levelTag.includes("/")){
  const parts=upgrade.levelTag.split("/");
  targetLevel=parseInt(parts[0],10)||1;
  maxLevel=parseInt(parts[1],10)||Math.max(1,targetLevel);
}
if((maxLevel<=1&&targetLevel>=1)||upgrade.levelTag==="DEF"||targetLevel>=maxLevel)return"upgradeTierMax";
if(targetLevel>=3)return"upgradeTierBoost";
return"upgradeTierBase";
}
function getOwnedVisualTierClass(row){
if(!row||row.locked)return"";
if(row.fusion){
  if(row.max<=1||row.maxed)return"fusionTierMax";
  if(row.level>=3)return"fusionTierBoost";
  return"fusionTierBase";
}
if(row.max<=1&&row.level>=1)return"upgradeTierMax";
if(row.maxed)return"upgradeTierMax";
if(row.level>=3)return"upgradeTierBoost";
return"upgradeTierBase";
}
function makeUpgradeTitle(key){
const pair=getFusedPairForKey(key);
if(pair){
  const [a,b]=pair.split("+");
  return `${getFusionNameFromPair(a,b)} Nv.${getFusionVisualNextLevel(pair)}`;
}
const n=nextLevel(key),displayName=getUpgradeDisplayName(key);
if(isPercentLimitedKey(key)&&nextPercentValue(key)>=100)return `${displayName} DEFINITIVA`;
if(n===5)return `${displayName} EVOLUCIÓN`;
return `${displayName} Nv.${n}`
}
function upgradeDesc(key){return getUpgradeDisplayDesc(key,nextLevel(key))}
function pct(n){return Math.min(100,Math.round(n*13))}

// post-fusión: pre-fusion levels aportan 13%/lv, post-fusion levels aportan 7%/lv → tope 100%
function fusionStatScale(key,preRate,postRate){
const base=fusedBaseLevels[key]||0;
const curr=fusionPostLevel(key);
return base>0?base*preRate+curr*postRate:curr*preRate;
}
// porcentaje del PRÓXIMO nivel (para etiqueta DEF)
function nextPercentValue(key){
const base=fusedBaseLevels[key]||0;
const curr=fusionPostLevel(key);
return Math.min(100,base>0?base*13+(curr+1)*7:(curr+1)*13);
}
function percentValue(key){
return Math.min(100,Math.round(fusionStatScale(key,13,7)))
}
function isDefinitivePercent(key){
return percentValue(key)>=100
}
function percentText(key){
return isDefinitivePercent(key)?"100% · DEFINITIVA":`${percentValue(key)}%`
}
function prospectivePercentText(key){
const next=nextPercentValue(key);
return next>=100?"100% · DEFINITIVA":`${next}%`
}
function canScaleMore(key){
return percentValue(key)<100
}


function applyUpgradeStatsFromLevels(){
// Ayudante: 13%/lv sin fusión, 7%/lv post-fusión → tope natural 65% y 100%
const s=k=>Math.min(1,fusionStatScale(k,0.13,0.07));
// Stats no-porcentaje: siguen usando effectLevel (no tienen pantalla de %)
upgrades.maxLife=100+effectLevel("maxLife")*20+(effectLevel("maxLife")>=5?80:0);
upgrades.healOnWave=8+effectLevel("healOnWave")*5+(effectLevel("healOnWave")>=5?20:0);
upgrades.shieldLevel=effectLevel("shield");
upgrades.shield=effectLevel("shield")>0;
upgrades.coinMagnetRange=effectLevel("coinMagnet")>0?90+effectLevel("coinMagnet")*45+(effectLevel("coinMagnet")>=5?100:0):0;
upgrades.autoFireLevel=effectLevel("autoFire");
upgrades.autoFire=upgrades.autoFireLevel>0;
// Stats multiplicativas: 65% sin fusión, 100% con fusión al máximo
upgrades.moveSpeed=1+s("moveSpeed");
upgrades.fireRate=1+s("fireRate");
upgrades.fishSpeed=1+s("fishSpeed");
upgrades.damage=1+s("damage");
const fishSizeFusionLevel=effectLevel("fishSize")+getFishSizeFusionBonus();
upgrades.fishSize=1+Math.min(1.45,fishSizeFusionLevel*.12);
if(hasDoneFusionPair("bigFish+fishSize"))upgrades.fishSize*=1.18;
upgrades.xpBoost=1+Math.min(1,s("xpBoost"));
// Probabilidades (topes duros: 95% o 85%)
const bigFishFusionLevel=effectLevel("bigFish");
upgrades.bigFishChance=Math.min(.95,bigFishFusionLevel*.13);
upgrades.doubleFishChance=Math.min(.95,s("doubleFish"));
upgrades.pierceChance=Math.min((upgrades.autoFire&&upgrades.aimAssist)?0.78:0.95,s("pierce"));
upgrades.catSlow=Math.min(.85,s("catSlow"));
upgrades.boomerangChance=Math.min(.95,s("boomerang"));
upgrades.critChance=Math.min((upgrades.autoFire&&upgrades.aimAssist)?0.78:0.95,s("critChance"));
// lifeSteal: 1.3%/lv en ambas fases → tope 6.5% sin fusión, 13% con fusión
upgrades.lifeSteal=Math.min(.13,fusionStatScale("lifeSteal",0.013,0.013));
life=Math.min(life,upgrades.maxLife)
}


function isPercentLimitedKey(key){return ["moveSpeed","fireRate","fishSpeed","bigFish","doubleFish","pierce","damage","catSlow","fishSize","xpBoost","boomerang","omniBurst","yarnBounce","autoFire","critChance"].includes(key)}
function isUpgradeFinal(key){return isPercentLimitedKey(key)&&(upgradeLevels[key]||0)>=(upgradeMaxLevels[key]||5)}


function getFusedPairForKey(key){
  return Object.keys(doneFusionPairs).find(pair=>pair.split("+").includes(key))||null;
}
function getFusionRepresentativeKey(pair){
  const parts=pair.split("+");
  const scalable=parts.filter(k=>Object.prototype.hasOwnProperty.call(upgradeLevels,k));
  return scalable[0]||parts[0];
}
function getFusionProgress(pair){
  pair=sortedPair(...String(pair||"").split("+"));
  const rep=getFusionRepresentativeKey(pair);
  const stored=Number(fusionProgressLevels[pair]||0);
  const repLevel=Object.prototype.hasOwnProperty.call(upgradeLevels,rep)?Number(upgradeLevels[rep]||0):0;
  return Math.max(0,Math.min(5,Math.max(stored,repLevel)));
}
function setFusionProgress(pair,value){
  pair=sortedPair(...String(pair||"").split("+"));
  const rep=getFusionRepresentativeKey(pair);
  const lvl=Math.max(0,Math.min(5,Math.floor(Number(value)||0)));
  fusionProgressLevels[pair]=lvl;
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,rep)){
    upgradeLevels[rep]=lvl;
    upgradeMaxLevels[rep]=5;
  }
  const parts=pair.split("+");
  parts.forEach(k=>{
    if(k!==rep&&Object.prototype.hasOwnProperty.call(upgradeLevels,k)){
      upgradeLevels[k]=0;
      upgradeMaxLevels[k]=5;
    }
  });
  return lvl;
}
function addFusionProgress(pair,amount=1){
  return setFusionProgress(pair,getFusionProgress(pair)+amount);
}
function isHiddenFusedComponent(key){
  const pair=getFusedPairForKey(key);
  if(!pair)return false;
  return key!==getFusionRepresentativeKey(pair);
}
function getFusionVisualNextLevel(pair){
  return Math.min(5,getFusionProgress(pair)+1);
}
function getFusionVisualCurrentLevel(pair){
  return Math.min(5,Math.max(1,getFusionProgress(pair)));
}
function getFusionIconFromPair(pair){
  const [a,b]=pair.split("+");
  return `${getOriginalUpgradeIcon(a)} ${getOriginalUpgradeIcon(b)}`;
}

function getLevelUpgradeKeys(){return Object.keys(upgradeLevels).filter(k=>!isHiddenFusedComponent(k)&&upgradeLevels[k]<upgradeMaxLevels[k]&&!isUpgradeFinal(k))}
function makeLevelUpgrade(key,forceLowest=false){
const pair=getFusedPairForKey(key);
if(pair){
  const [a,b]=pair.split("+");
  const rep=getFusionRepresentativeKey(pair);
  const title=`${getFusionNameFromPair(a,b)} Nv.${getFusionVisualNextLevel(pair)}`;
  return {
    icon:getFusionIconFromPair(pair),
    key,
    title,
    levelTag:(getFusionVisualNextLevel(pair)>=5?"DEF":`${getFusionVisualNextLevel(pair)}/5`),
    desc:getFusionEffectDesc(a,b),
    special:true,
    fusion:true,
    apply:()=>{
      if(getFusionProgress(pair)>=5)return;
      const newLevel=addFusionProgress(pair,1);
      applyUpgradeStatsFromLevels();
      if(rep==="maxLife")life=Math.min(upgrades.maxLife,life+25+(newLevel>=5?45:0));
    }
  }
}
const meta=UPGRADE_META[key];
return {icon:meta.icon,key,title:makeUpgradeTitle(key),levelTag:(isPercentLimitedKey(key)&&nextPercentValue(key)>=100)?"DEF":`${upgradeLevels[key]+1}/${upgradeMaxLevels[key]}`,desc:upgradeDesc(key),apply:()=>{if(isUpgradeFinal(key))return;upgradeLevels[key]++;applyUpgradeStatsFromLevels();if(key==="maxLife")life=Math.min(upgrades.maxLife,life+25+(upgradeLevels[key]>=5?45:0))}}
}

function getUpgradePool(){
const arr=getLevelUpgradeKeys().map(k=>makeLevelUpgrade(k));
if(!upgrades.aimAssist)arr.push({key:"aimAssist",icon:"🎯",title:"Peces listillos",levelTag:"1/1",desc:"Los peces giran hacia enemigos cercanos.",apply:()=>{upgrades.aimAssist=true}});
if(!upgrades.bigCursor)arr.push({key:"bigCursor",icon:"🌈",title:"Mirilla brillante",levelTag:"1/1",desc:"La mirilla se ve mucho mejor.",apply:()=>{upgrades.bigCursor=true}});
if(!upgrades.moralSupport)arr.push({key:"moralSupport",icon:"💛",title:"Apoyo Moral",levelTag:"1/1",desc:"Tu novio te anima durante la partida.",special:true,apply:()=>{upgrades.moralSupport=true}});
if(!upgrades.darkPact)arr.push({key:"darkPact",icon:"🖤",title:"Voluntad Oscura",levelTag:"1/1",desc:"Menos opciones, pero más poder.",dark:true,apply:()=>{upgrades.darkPact=true}});
if(!upgrades.catInstinct)arr.push({key:"catInstinct",icon:"🥷",title:"Instinto gatuno",levelTag:"1/1",desc:"Te ayuda cuando estás en peligro.",special:true,apply:()=>{upgrades.catInstinct=true}});
if(!upgrades.zoomies)arr.push({key:"zoomies",icon:"💨",title:"Zoomies",levelTag:"1/1",desc:"A veces entras en modo hiperactivo.",special:true,apply:()=>{upgrades.zoomies=true}});
return arr
}
function getRandomUpgradeChoices(amount){
const pool=getUpgradePool();
const choices=[];
// Si faltan mejoras únicas, forzar al menos 1 en las opciones
const missingUniques=pool.filter(u=>u.key&&uniqueFusionKeys.includes(u.key));
if(missingUniques.length>0&&amount>0){
  const idx=Math.floor(Math.random()*missingUniques.length);
  const forced=missingUniques[idx];
  pool.splice(pool.indexOf(forced),1);
  choices.push(forced);
}
while(choices.length<amount&&pool.length>0){const index=Math.floor(Math.random()*pool.length);choices.push(pool.splice(index,1)[0])}
return choices
}

function getRandomScalableUpgradeChoices(amount){
const pool=getLevelUpgradeKeys().map(k=>makeLevelUpgrade(k)),choices=[];
while(choices.length<amount&&pool.length>0){const index=Math.floor(Math.random()*pool.length);choices.push(pool.splice(index,1)[0])}
return choices
}


/* ─── ALGORITMO DE RECOMENDACIÓN ─────────────────────────── */
function scoreUpgradeRecommendation(key){
if(!key)return{score:0,reason:null};
const pair=getFusedPairForKey(key);
if(pair){
  const rep=getFusionRepresentativeKey(pair);
  const lv=upgradeLevels[rep]||0;
  const maxLv=upgradeMaxLevels[rep]||5;
  if(lv<maxLv)return{score:50,reason:`Continúa mejorando tu fusión (${lv+1}/${maxLv})`};
  return{score:0,reason:null};
}
const isUnique=isUniqueKey(key);
const lv=upgradeLevels[key]||0;
const maxLv=upgradeMaxLevels[key]||5;
const maxedKeys=getMaxedFusionKeys();
if(isUnique){
  if(hasUniqueUpgrade(key))return{score:0,reason:null};
  const compatMaxed=maxedKeys.filter(m=>areFusionCompatible(key,m)&&!hasFusionBeenDone(key,m)&&!fusedUpgradeNames[m]);
  if(compatMaxed.length>0)return{score:92,reason:`¡Desbloquea fusión con ${getAnyName(compatMaxed[0])}!`};
  const nearMax=Object.keys(upgradeLevels).filter(m=>areFusionCompatible(key,m)&&!hasFusionBeenDone(key,m)&&!fusedUpgradeNames[m]&&(upgradeMaxLevels[m]-(upgradeLevels[m]||0))<=2);
  if(nearMax.length>0)return{score:66,reason:`Buena sinergia con ${getAnyName(nearMax[0])}`};
  return{score:18,reason:null};
}
if(fusedUpgradeNames[key])return{score:0,reason:null};
const stepsToMax=maxLv-lv;
const compatMaxed=maxedKeys.filter(m=>m!==key&&areFusionCompatible(key,m)&&!hasFusionBeenDone(key,m)&&!fusedUpgradeNames[m]);
const fusionReady=compatMaxed.length>0;
if(key==="maxLife"&&life<upgrades.maxLife*0.4){
  return{score:fusionReady?88:80,reason:fusionReady?"¡Vida baja! Y acerca una fusión":"¡Tu vida está muy baja!"};
}
if(key==="healOnWave"&&life<upgrades.maxLife*0.55&&!fusionReady){
  return{score:62,reason:"Curación extra — tu vida está baja"};
}
if(fusionReady){
  if(stepsToMax===0)return{score:78,reason:`¡Lista para fusionar con ${getAnyName(compatMaxed[0])}!`};
  if(stepsToMax===1)return{score:96,reason:`¡1 nivel para fusionar con ${getAnyName(compatMaxed[0])}!`};
  if(stepsToMax===2)return{score:84,reason:`2 niveles para fusionar con ${getAnyName(compatMaxed[0])}`};
  if(stepsToMax<=4)return{score:70,reason:`${stepsToMax} niveles para fusionar con ${getAnyName(compatMaxed[0])}`};
  return{score:52,reason:`Camino a fusión con ${getAnyName(compatMaxed[0])}`};
}
const compatUnique=uniqueFusionKeys.filter(u=>hasUniqueUpgrade(u)&&u!==key&&areFusionCompatible(key,u)&&!hasFusionBeenDone(key,u)&&!Object.keys(doneFusionPairs).some(pair=>pair.split("+").includes(u)));
if(compatUnique.length>0){
  if(stepsToMax<=1)return{score:78,reason:`${stepsToMax===0?"¡Lista":"1 nivel"} para fusionar con ${getAnyName(compatUnique[0])}`};
  if(stepsToMax<=3)return{score:63,reason:`Cerca de fusionar con ${getAnyName(compatUnique[0])}`};
  return{score:44,reason:null};
}
const anyCompatible=Object.keys(fusionPairs).filter(m=>m!==key&&areFusionCompatible(key,m)&&!hasFusionBeenDone(key,m)&&!fusedUpgradeNames[m]&&(upgradeLevels[m]||0)>=Math.max(1,(upgradeMaxLevels[m]||5)-3));
if(anyCompatible.length>0&&stepsToMax<=3)return{score:48,reason:null};
return{score:0,reason:null};
}
function markRecommended(choices){return choices;}
/* ─────────────────────────────────────────────────────────── */
function escapeHtml(str){
return String(str??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]||ch));
}
function formatCardText(str){
return escapeHtml(str)
  .replace(/&lt;br\s*\/?&gt;/gi,"<br>")
  .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi,"<b>$1</b>")
  .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi,"<b>$1</b>")
  .replace(/&lt;span class=&quot;shopHint&quot;&gt;(.*?)&lt;\/span&gt;/gi,'<span class="shopHint">$1</span>');
}
function getUpgradeCardType(upgrade){
if(upgrade.fusion)return "Fusión";
if(upgrade.dark)return "Oscura";
if(upgrade.special)return "Especial";
if(upgrade.easter)return "Secreta";
if(upgrade.key){
  const p=profileForChoice(upgrade)||{};
  const entries=Object.entries(p).filter(([k,v])=>v>0);
  entries.sort((a,b)=>b[1]-a[1]);
  const top=entries[0]?.[0]||"mejora";
  const names={damage:"Daño",defense:"Defensa",healing:"Curación",mobility:"Velocidad",economy:"Economía",control:"Control",consistency:"Precisión",automation:"Automática",area:"Área",scaling:"Escalado"};
  return names[top]||"Mejora";
}
return "Mejora";
}
function buildUpgradeCardHTML(upgrade){
let desc=String(upgrade.desc||"");
let bonus="";
const m=desc.match(/^(.*?)(?:\s*Bonus de fusión:\s*)(.*)$/i);
if(m){desc=m[1].trim();bonus="Bonus de fusión: "+m[2].trim();}
const iconText=String(upgrade.icon||"✨").trim();
const iconParts=iconText.split(/\s+/).filter(Boolean);
const isComboIcon=iconParts.length>1;
const iconHTML=isComboIcon?iconParts.slice(0,2).map(i=>`<span class="miniIcon">${escapeHtml(i)}</span>`).join(""):escapeHtml(iconText);
return `${upgrade.recommended?`<div class="recommendedTag">✨ RECOMENDADO</div>`:""}<div class="upgradeCardTop"><div class="upgradeIconBubble${isComboIcon?" comboIconBubble":""}">${iconHTML}</div><div class="upgradeBadges">${upgrade.levelTag?`<span class="upgradeLevelTag">${upgrade.levelTag}</span>`:""}</div></div><div class="upgradeTitle">${escapeHtml(upgrade.title)}</div><div class="upgradeDesc"><span class="upgradeDescMain">${formatCardText(desc)}</span>${bonus?`<span class="upgradeFusionBonus">${formatCardText(bonus)}</span>`:""}${upgrade.lockReason?`<span class="upgradeLockedReason">🔒 ${formatCardText(upgrade.lockReason)}</span>`:""}</div>`;
}
function showCards(title,phrase,subtitle,choices,onPick,onBack,context="generic"){
choices=applyRecommendationsToChoices(choices,context);
choosingUpgrade=true;
releaseGamePointer();
canvas.style.cursor="crosshair";
document.body.style.cursor="auto";
levelUpPanel.style.display="flex";upgradeCards.innerHTML="";
const oldCoinBadge=levelUpBox.querySelector(".shopCoinBadge");
if(oldCoinBadge)oldCoinBadge.remove();
levelUpBox.classList.toggle("shopMode",context==="shop");
upgradeTitle.textContent=title;levelUpPhrase.textContent=phrase;upgradeSubtitle.textContent=subtitle;
if(context==="shop"){
  const coinBadge=document.createElement("div");
  coinBadge.className="shopCoinBadge";
  coinBadge.innerHTML=`<span>🪙</span><span><small>Monedas</small>${coins}</span>`;
  levelUpBox.insertBefore(coinBadge,upgradeTitle);
}
if(onBack){
fusionBackBtn.style.display="block";
fusionBackBtn.onclick=()=>onBack();
}else{
fusionBackBtn.style.display="none";
fusionBackBtn.onclick=null;
}
const unlockAt=performance.now()+800;
const shouldPaginate=(context==="fusionFirst"||context==="fusionPartner")&&choices.length>9;
const pageSize=9;
let currentPage=0;
const totalPages=Math.max(1,Math.ceil(choices.length/pageSize));
function renderCardList(){
  upgradeCards.innerHTML="";
  const visible=shouldPaginate?choices.slice(currentPage*pageSize,currentPage*pageSize+pageSize):choices;
  visible.forEach(upgrade=>{
    const card=document.createElement("button");
    let visualClass=getOfferTierClass(upgrade);
    const _uniqueClassMap={aimAssist:" aimAssistUpgrade",bigCursor:" bigCursorUpgrade",catInstinct:" catInstinctUpgrade",zoomies:" zoomiesUpgrade",moralSupport:" apoyoMoralUpgrade",darkPact:" voluntadOscuraUpgrade"};
    const _uniqueClass=upgrade.key&&!upgrade.fusion?(_uniqueClassMap[upgrade.key]||""):"";
    card.className="upgradeCard "+visualClass+(upgrade.fusion?" fusionCard":"")+(_uniqueClass||((upgrade.special&&!upgrade.fusion?" specialUpgrade":"")+(upgrade.dark?" darkUpgrade":"")))+(upgrade.easter?" easterUpgrade":"")+(upgrade.locked?" locked":"")+(upgrade.recommended?" recommended":"");
    card.innerHTML=buildUpgradeCardHTML(upgrade);
    if(upgrade.locked)card.disabled=true;
    else card.addEventListener("click",()=>{
      if(performance.now()<unlockAt)return;
      onPick(upgrade);checkGameCompletion();
    });
    upgradeCards.appendChild(card);
  });
  if(shouldPaginate){
    const nav=document.createElement("div");
    nav.className="fusionPageControls";
    const prev=document.createElement("button");
    prev.className="fusionPageBtn";
    prev.textContent="← Anterior";
    prev.disabled=currentPage<=0;
    prev.onclick=()=>{if(currentPage>0){currentPage--;renderCardList();}};
    const info=document.createElement("span");
    info.className="fusionPageInfo";
    info.textContent=`Página ${currentPage+1}/${totalPages}`;
    const next=document.createElement("button");
    next.className="fusionPageBtn";
    next.textContent="Siguiente →";
    next.disabled=currentPage>=totalPages-1;
    next.onclick=()=>{if(currentPage<totalPages-1){currentPage++;renderCardList();}};
    nav.append(prev,info,next);
    upgradeCards.appendChild(nav);
  }
}
renderCardList();
autoRegisterChoiceMenu(choices,onPick,context);
}



function getNormalUpgradeChoices(){
return getRandomUpgradeChoices(3).filter(u=>!u.fusion);
}

function allDirectUpgradesMaxed(){
const allScalable=Object.keys(upgradeLevels).every(k=>{
  if(isHiddenFusedComponent(k))return true;
  const pair=getFusedPairForKey(k);
  if(pair)return getFusionProgress(pair)>=5;
  return upgradeLevels[k]>=upgradeMaxLevels[k]||isUpgradeFinal(k);
});
const allUnique=uniqueFusionKeys.every(k=>hasUniqueUpgrade(k));
return allScalable&&allUnique;
}

function giveLevelCoins(reason=""){
const amount=2+Math.floor(Math.random()*3);
coins+=amount;
floatingTexts.push({x:player.x,y:player.y-70,text:`+${amount} monedas ${reason}`,life:1.4,maxLife:1.4,big:false});
updateHud();
maybeOpenShopOrFusion();
}

function openUpgradeMenu(reason="level",opts={}){
releaseGamePointer();
const darkWave=reason==="wave"&&upgrades.darkPact;
const choices=darkWave?getRandomScalableUpgradeChoices(1):getRandomUpgradeChoices(3);
if(choices.length===0||allDirectUpgradesMaxed()){
if(reason==="wave"&&waveUpgradePending){waveUpgradePending=false;wave++;
thiefCoinsStolenThisWave=0;life=Math.min(upgrades.maxLife,life+upgrades.healOnWave);startWave()}
giveLevelCoins("por tener mejoras al máximo");
if(pendingUpgradeQueue.length)processPendingUpgradeQueue();
return
}
showCards(reason==="wave"?"🌊 ¡Ronda superada!":"⭐ ¡Subiste de nivel!",darkWave?"🖤 La Voluntad Oscura elige por ti":lovePhrases[Math.floor(Math.random()*lovePhrases.length)],darkWave?"Solo aparecen mejoras escalables para que el +2 no se desperdicie":"Elige una mejora gatuna",choices,upgrade=>{
upgrade.apply();
if(darkWave){let bonusCoins=1+Math.floor(Math.random()*5);if(hasDoneFusionPair("coinMagnet+darkPact")){const fp=getFusionProgress("coinMagnet+darkPact");bonusCoins+=2+Math.floor(Math.random()*(3+fp));}coins+=bonusCoins;floatingTexts.push({x:player.x,y:player.y-105,text:`🖤 +${bonusCoins} monedas`,life:1.3,maxLife:1.3,big:false})}
if(darkWave&&upgrade.key){
  let doubled=false;
  if(upgrade.fusion){
    const pair=getFusedPairForKey(upgrade.key);
    const before=pair?getFusionProgress(pair):0;
    if(pair&&before<5){
      upgrade.apply();
      doubled=getFusionProgress(pair)>before;
    }
  }else if(!isUpgradeFinal(upgrade.key)&&upgradeLevels[upgrade.key]<upgradeMaxLevels[upgrade.key]){
    const before=upgradeLevels[upgrade.key]||0;
    upgrade.apply();
    doubled=(upgradeLevels[upgrade.key]||0)>before;
  }
  if(doubled)floatingTexts.push({x:player.x,y:player.y-85,text:upgrade.fusion?"🖤 +2 niveles de fusión":"🖤 +2 niveles",life:1.4,maxLife:1.4,big:false})
}
choosingUpgrade=false;levelUpPanel.style.display="none";canvas.style.cursor=upgrades.bigCursor?"none":"crosshair";
syncGamePointerLock();
floatingTexts.push({x:player.x,y:player.y-55,text:upgrade.title,life:1.5,maxLife:1.5,big:false});
refreshAdminPanelUI();
if(waveUpgradePending){waveUpgradePending=false;wave++;life=Math.min(upgrades.maxLife,life+upgrades.healOnWave);startWave()}
updateHud();
if(pendingUpgradeQueue.length)processPendingUpgradeQueue();else maybeOpenShopOrFusion()
})
}

function getShopEligibleUpgradeKeys(){
return Object.keys(upgradeLevels).filter(k=>{
if(isHiddenFusedComponent(k))return false;
const pair=getFusedPairForKey(k);
if(pair){if(getFusionProgress(pair)>=5)return false;return true;}
if(isUpgradeFinal(k))return false;
return upgradeLevels[k]<upgradeMaxLevels[k];
});
}
function getShopChoiceGroupKey(key){
  const fusionName=fusedUpgradeNames[key];
  return fusionName?`fusion:${fusionName}`:`single:${key}`;
}
function getShopCurrentLevelForKey(key){
  const pair=getFusedPairForKey(key);
  if(pair)return getFusionProgress(pair);
  return upgradeLevels[key]||0;
}
function getRandomShopUpgradeChoice(currentChoices=[]){
  const blockedGroups=new Set((currentChoices||[]).map(u=>u&&u.key?getShopChoiceGroupKey(u.key):u?.title).filter(Boolean));
  const keys=getShopEligibleUpgradeKeys().filter(k=>!blockedGroups.has(getShopChoiceGroupKey(k)));
  if(keys.length===0)return null;
  const minLevel=Math.min(...keys.map(k=>getShopCurrentLevelForKey(k)));
  const lowest=keys.filter(k=>getShopCurrentLevelForKey(k)===minLevel);
  const key=lowest[Math.floor(Math.random()*lowest.length)];
  return makeLevelUpgrade(key,true);
}

function getShopUpgradeChoices(amount=3){
const keys=getShopEligibleUpgradeKeys();
if(keys.length===0)return[];

const currentFusionKeys=getMaxedFusionKeys();
function hasUsefulFusionPath(key){
  return currentFusionKeys.some(other=>other!==key&&areFusionCompatible(key,other)&&!hasFusionBeenDone(key,other));
}
function hasCompatibleAlmostReady(key){
  return Object.keys(upgradeLevels).some(other=>{
    if(other===key)return false;
    if(!areFusionCompatible(key,other)||hasFusionBeenDone(key,other)||fusedUpgradeNames[other])return false;
    return upgradeLevels[other]>=upgradeMaxLevels[other]-1;
  })||getFusableUniqueKeys().some(other=>areFusionCompatible(key,other)&&!hasFusionBeenDone(key,other));
}
function groupKey(key){
  const fusionName=fusedUpgradeNames[key];
  return fusionName?`fusion:${fusionName}`:`single:${key}`;
}
function scoreKey(key){
  const lvl=upgradeLevels[key]||0;
  const max=upgradeMaxLevels[key]||5;
  let score=0;

  // Prioridad 1: terminar una mejora que ya puede fusionar con algo listo.
  if(lvl>=max-1&&hasUsefulFusionPath(key))score+=1000;

  // Prioridad 2: subir piezas que están cerca de crear una fusión útil.
  if(hasCompatibleAlmostReady(key))score+=420;

  // Prioridad 3: si una fusión escalable acaba de empezar, enseñarla como progreso nuevo.
  if(fusedUpgradeNames[key])score+=360-lvl*20;

  // Prioridad 4: cubrir mejoras atrasadas o sin desbloquear.
  if(lvl===0)score+=260;
  score+=(max-lvl)*35;

  // Pequeño desempate para que no sea siempre idéntico.
  score+=Math.random()*8;
  return score;
}

const bestByGroup=new Map();
keys.forEach(k=>{
  const g=groupKey(k);
  const entry={key:k,score:scoreKey(k)};
  if(!bestByGroup.has(g)||entry.score>bestByGroup.get(g).score)bestByGroup.set(g,entry);
});

return [...bestByGroup.values()]
  .sort((a,b)=>b.score-a.score)
  .slice(0,amount)
  .map(entry=>makeLevelUpgrade(entry.key,true));
}

function getLowestUpgradeChoices(){
return getShopUpgradeChoices(3);
}
function maybeOpenShopOrFusion(){
if(choosingUpgrade||gameOver||!gameStarted||paused)return;
if(canFuse()&&!fusionAvailable){fusionAvailable=true;floatingTexts.push({x:player.x,y:player.y-70,text:"🔮 Fusión disponible",life:1.4,maxLife:1.4,big:false})}
if(shopBossPending&&!shopAvailable){shopBossPending=false;startShopSession()}
}

function getShopUpgradePrice(){return 1+shopUpgradePurchases}
function getShopFusionPrice(){return 5+shopFusionPurchases*3}
function hasPendingShopFusionPair(){
  const keys=getMaxedFusionKeys();
  return keys.some((a,i)=>keys.slice(i+1).some(b=>areFusionCompatible(a,b)&&!hasFusionBeenDone(a,b)));
}
function isFusionOnlyShopDiscountActive(){
  return getShopEligibleUpgradeKeys().length===0&&hasPendingShopFusionPair();
}
function getEffectiveShopFusionPrice(){
  const normal=getShopFusionPrice();
  return isFusionOnlyShopDiscountActive()?Math.max(1,Math.ceil(normal/2)):normal;
}
function startShopSession(){shopAvailable=true;openCoinShop()}
function closeShopSession(){shopAvailable=false;choosingUpgrade=false;levelUpPanel.style.display="none";syncGamePointerLock();floatingTexts.push({x:player.x,y:player.y-65,text:"Tienda cerrada 💰",life:1.2,maxLife:1.2,big:false});updateHud()}

function getFusionLockReason(cost=getEffectiveShopFusionPrice()){
const keys=getMaxedFusionKeys();
const hasPair=keys.some((a,i)=>keys.slice(i+1).some(b=>areFusionCompatible(a,b)&&!hasFusionBeenDone(a,b)));
if(coins<cost&&!hasPair)return `Bloqueado: necesitas ${cost} monedas y 2 mejoras compatibles listas para fusionar.`;
if(coins<cost)return `Bloqueado: necesitas ${cost} monedas.`;
if(!hasPair)return "Bloqueado: no tienes 2 mejoras compatibles listas para fusionar.";
return `Disponible: fusiona 2 mejoras compatibles.`
}
function getShopAdvice(key){
  const pair=getFusedPairForKey(key);
  if(pair)return "Consejo: mejora esta fusión para que vuelva a escalar hasta definitiva.";
  const rec=scoreUpgradeRecommendation(key);
  if(rec&&rec.reason)return `Consejo: ${rec.reason}`;
  const profile=profileForKey(key);
  const top=Object.entries(profile).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const text={damage:"buena para matar más rápido y bajar jefes.",defense:"buena si te cuesta aguantar.",healing:"buena para recuperar vida entre golpes.",mobility:"buena para esquivar y reposicionarte.",economy:"buena para comprar más en tienda.",control:"buena para controlar grupos grandes.",consistency:"buena si fallas disparos o hay enemigos rápidos.",automation:"buena para disparar sin pensar tanto.",area:"buena contra oleadas llenas de gatos.",scaling:"buena para crecer a largo plazo."}[top]||"mejora estable para seguir progresando.";
  return `Consejo: ${text}`;
}

function openCoinShop(){
releaseGamePointer();
shopAvailable=true;
firstShopReached=true;
const upgradePrice=getShopUpgradePrice();
const normalFusionPrice=getShopFusionPrice();
const fusionPrice=getEffectiveShopFusionPrice();
const fusionDiscountActive=fusionPrice<normalFusionPrice;
const seenShopGroups=new Set();
const upgradeChoices=getShopUpgradeChoices(6).filter(u=>{
  const g=u.key?(fusedUpgradeNames[u.key]?`fusion:${fusedUpgradeNames[u.key]}`:`single:${u.key}`):u.title;
  if(seenShopGroups.has(g))return false;
  seenShopGroups.add(g);
  return true;
}).slice(0,3).map(u=>({
...u,
price:upgradePrice,
locked:coins<upgradePrice,
originalDesc:u.desc,
levelTag:u.levelTag||"",
 desc:u.desc
}));
const fusionChoice={icon:"🔮",title:"Fusión de mejoras",levelTag:"",desc:canFuse(fusionPrice)?`Disponible: fusiona 2 mejoras compatibles.`:getFusionLockReason(fusionPrice),special:true,fusion:true,openFusionShop:true,locked:!canFuse(fusionPrice)};
const randomUpgrade=getRandomShopUpgradeChoice(upgradeChoices);
const randomPrice=Math.max(1,Math.ceil(upgradePrice/2));
const randomChoice=randomUpgrade?{
  icon:"🎲",
  title:"Mejora aleatoria",
  levelTag:`${randomPrice}🪙`,
  desc:"Sorpresa",
  special:true,
  randomShopUpgrade:true,
  hiddenUpgrade:randomUpgrade,
  locked:coins<randomPrice
}:null;
const choices=canFuse(fusionPrice)?[fusionChoice,...upgradeChoices]:[...upgradeChoices,fusionChoice];
if(randomChoice)choices.push(randomChoice);
choices.push({icon:"🚪",title:"Salir de la tienda",levelTag:"",desc:"Cierra la tienda y conserva las monedas que te queden.",special:true,skipShop:true});
const randomLabel=randomChoice?`${randomPrice}🪙`:"—";
const fusionLabel=fusionDiscountActive?`${fusionPrice}🪙 <span class="shopHint">(rebajada)</span>`:`${fusionPrice}🪙`;
showCards("🪙 Tienda de gatitos","Compra todo lo que quieras hasta que decidas salir 💖",`Mejora: ${upgradePrice}🪙 (+1 por compra) · Aleatoria: ${randomLabel} · Fusión: ${fusionLabel} (+3 por fusión)`,choices,upgrade=>{
if(upgrade.skipShop){closeShopSession();return}
if(upgrade.openFusionShop){openFusionChoice(fusionPrice);return}
if(upgrade.randomShopUpgrade){
  if(coins<randomPrice){openCoinShop();return}
  const hidden=upgrade.hiddenUpgrade;
  if(!hidden||typeof hidden.apply!=="function"){openCoinShop();return}
  coins-=randomPrice;shopUpgradePurchases++;
  hidden.apply();playShopBuySound();
  floatingTexts.push({x:player.x,y:player.y-65,text:`🎲 Sorpresa: ${hidden.title}`,life:1.3,maxLife:1.3,big:false});
  updateHud();refreshAdminPanelUI();checkGameCompletion();
  if(isGameCompleted())return;
  openCoinShop();
  return;
}
if(coins<upgradePrice){openCoinShop();return}
coins-=upgradePrice;shopUpgradePurchases++;
upgrade.apply();playShopBuySound();
floatingTexts.push({x:player.x,y:player.y-65,text:`Comprado por ${upgradePrice}🪙: ${upgrade.title}`,life:1.3,maxLife:1.3,big:false});
updateHud();refreshAdminPanelUI();checkGameCompletion();
if(isGameCompleted())return;
openCoinShop();
},null,"shop")
}
function isUniqueOnlyUpgrade(key){return !Object.prototype.hasOwnProperty.call(upgradeLevels,key)}



const uniqueFusionKeys=["aimAssist","bigCursor","moralSupport","darkPact","catInstinct","zoomies"];
const uniqueFusionMeta={
autoFire:{icon:"🤖",name:"Patita automática",desc:"Dispara sola hacia donde apuntes."},
aimAssist:{icon:"🎯",name:"Peces listillos",desc:"Los peces se curvan hacia enemigos cercanos."},
bigCursor:{icon:"🌈",name:"Mirilla brillante",desc:"Hace la mirilla más visible."},
moralSupport:{icon:"💛",name:"Apoyo Moral",desc:"Tu novio te anima de vez en cuando."},
darkPact:{icon:"🖤",name:"Voluntad Oscura",desc:"La mejora maldita: menos elección, más potencia."},
catInstinct:{icon:"🥷",name:"Instinto gatuno",desc:"Te salva cuando estás en peligro."},
zoomies:{icon:"💨",name:"Zoomies",desc:"A veces vas rapidísima."}
};

const fusionPairs={
aimAssist:["autoFire", "bigCursor", "catInstinct", "damage", "pierce", "fishSpeed", "boomerang", "critChance"],
autoFire:["aimAssist", "bigCursor", "moralSupport"],
bigCursor:["aimAssist", "autoFire", "moralSupport", "damage", "pierce", "critChance", "fishSize", "boomerang"],
bigFish:["damage", "doubleFish", "fireRate", "fishSize", "pierce", "yarnBounce"],
boomerang:["doubleFish", "fireRate", "fishSpeed", "omniBurst", "pierce", "yarnBounce", "bigCursor", "catInstinct"],
catInstinct:["aimAssist", "darkPact", "moralSupport", "shield", "maxLife", "catSlow", "moveSpeed", "healOnWave", "coinMagnet", "boomerang", "omniBurst"],
catSlow:["coinMagnet", "fishSize", "maxLife", "moveSpeed", "shield"],
coinMagnet:["catSlow", "healOnWave", "moveSpeed", "xpBoost", "catInstinct", "darkPact"],
critChance:["damage", "doubleFish", "autoFire", "zoomies"],
damage:["bigFish", "doubleFish", "lifeSteal", "omniBurst", "pierce", "shield", "yarnBounce", "critChance"],
darkPact:["catInstinct", "moralSupport", "damage", "critChance", "lifeSteal", "xpBoost", "omniBurst", "coinMagnet"],
doubleFish:["bigFish", "boomerang", "damage", "fireRate", "omniBurst", "yarnBounce", "critChance"],
fireRate:["bigFish", "boomerang", "doubleFish", "fishSpeed", "omniBurst", "zoomies"],
fishSize:["bigFish", "catSlow", "pierce", "shield", "yarnBounce"],
fishSpeed:["boomerang", "fireRate", "omniBurst", "pierce", "yarnBounce"],
healOnWave:["coinMagnet", "lifeSteal", "maxLife", "xpBoost"],
lifeSteal:["damage", "healOnWave", "maxLife", "shield"],
maxLife:["catSlow", "healOnWave", "lifeSteal", "shield"],
moralSupport:["autoFire", "bigCursor", "catInstinct", "darkPact", "maxLife", "healOnWave", "xpBoost", "moveSpeed"],
moveSpeed:["catSlow", "coinMagnet", "xpBoost", "zoomies"],
omniBurst:["boomerang", "damage", "doubleFish", "fireRate", "fishSpeed", "xpBoost", "yarnBounce", "catInstinct"],
pierce:["bigFish", "boomerang", "damage", "fishSize", "fishSpeed", "yarnBounce"],
shield:["catInstinct", "catSlow", "damage", "fishSize", "lifeSteal", "maxLife"],
xpBoost:["coinMagnet", "healOnWave", "moveSpeed", "omniBurst"],
zoomies:["moveSpeed", "fireRate", "autoFire", "critChance", "fishSpeed", "doubleFish", "boomerang"],
yarnBounce:["bigFish", "boomerang", "damage", "doubleFish", "fishSize", "fishSpeed", "omniBurst", "pierce"]
};

const fusionNameMap={
"damage+pierce":"Mimos devastadores",
"bigFish+damage":"Golpe crítico gatuno",
"damage+doubleFish":"Doble destrucción",
"fireRate+doubleFish":"Lluvia de peces",
"fireRate+fishSpeed":"Disparo relámpago",
"boomerang+fireRate":"Tiro constante",
"fishSpeed+pierce":"Proyectiles fantasmas",
"boomerang+fishSpeed":"Misiles guiados",
"boomerang+pierce":"Cuchillas eternas",
"boomerang+doubleFish":"Tormenta circular",
"damage+lifeSteal":"Depredador",
"lifeSteal+maxLife":"Absorción vital",
"healOnWave+lifeSteal":"Regeneración total",
"healOnWave+maxLife":"Tanque gatuno",
"catSlow+shield":"Zona segura",
"fishSize+shield":"Escudo gigante",
"damage+shield":"Escudo ofensivo",
"coinMagnet+xpBoost":"Progreso acelerado",
"catInstinct+coinMagnet":"Instinto recolector",
"bigCursor+boomerang":"Retorno marcado",
"boomerang+catInstinct":"Reflejo circular",
"catInstinct+omniBurst":"Ráfaga felina",
"coinMagnet+darkPact":"Codicia oscura",
"healOnWave+xpBoost":"Crecimiento estable",
"coinMagnet+moveSpeed":"Recolector ágil",
"fireRate+omniBurst":"Caos continuo",
"damage+omniBurst":"Explosión total",
"boomerang+omniBurst":"Tormenta infinita",
"autoFire+aimAssist":"IA de combate",
"autoFire+bigCursor":"Disparo asistido",
"bigCursor+aimAssist":"Puntería perfecta",
"autoFire+moralSupport":"Motivación bélica",
"bigCursor+moralSupport":"Corazón valiente",
"darkPact+moralSupport":"Tu novio ha hecho este juego",
"boomerang+yarnBounce":"Ovillo boomerang",
"pierce+yarnBounce":"Hilo perforante",
"fishSpeed+yarnBounce":"Ovillo supersónico",
"doubleFish+yarnBounce":"Enredo de peces",
"bigFish+yarnBounce":"Ovillo gigante",
"fishSize+yarnBounce":"Bola de lana colosal",
"omniBurst+yarnBounce":"Tormenta de ovillos",
"damage+yarnBounce":"Lana contundente",
"aimAssist+catInstinct":"Reflejos perfectos",
"catInstinct+moralSupport":"Valor de casa",
"catInstinct+darkPact":"Instinto maldito",
"critChance+damage":"Mimos devastadores críticos",
"critChance+doubleFish":"Tormenta crítica",
"autoFire+critChance":"IA destructiva",
"moveSpeed+zoomies":"Hiperactividad",
"fireRate+zoomies":"Modo cañón",
"autoFire+zoomies":"Patitas hiperactivas",
"critChance+zoomies":"Subidón crítico",
"aimAssist+damage":"Mimos guiados",
"aimAssist+pierce":"Agujas guiadas",
"aimAssist+fishSpeed":"Peces teledirigidos",
"aimAssist+boomerang":"Retorno dirigido",
"aimAssist+critChance":"Punto débil",
"bigCursor+damage":"Golpe marcado",
"bigCursor+pierce":"Marca perforante",
"bigCursor+critChance":"Marca crítica",
"bigCursor+fishSize":"Blanco enorme",
"moralSupport+maxLife":"Ánimo protector",
"healOnWave+moralSupport":"Descanso acompañado",
"moralSupport+xpBoost":"Aprender con ánimo",
"moralSupport+moveSpeed":"Pasitos valientes",
"damage+darkPact":"Daño maldito",
"critChance+darkPact":"Crítico oscuro",
"darkPact+lifeSteal":"Sangre oscura",
"darkPact+xpBoost":"Conocimiento prohibido",
"darkPact+omniBurst":"Ráfaga maldita",
"catInstinct+maxLife":"Siete vidas de gato",
"catInstinct+catSlow":"Instinto helado",
"catInstinct+moveSpeed":"Reflejo veloz",
"catInstinct+healOnWave":"Instinto sanador",
"fishSpeed+zoomies":"Peces hiperactivos",
"doubleFish+zoomies":"Banco hiperactivo",
"boomerang+zoomies":"Boomerang frenético",
"aimAssist+autoFire":"IA de Combate",
"aimAssist+bigCursor":"Mirilla Inteligente",
"bigFish+doubleFish":"Cardumen Gigante",
"bigFish+fireRate":"Avalancha de Peces",
"bigFish+fishSize":"Leviatán",
"bigFish+pierce":"Lanza Oceánica",
"catInstinct+shield":"Guardia Felina",
"catSlow+coinMagnet":"Trampa Lucrativa",
"catSlow+fishSize":"Bloque de Hielo",
"catSlow+maxLife":"Armadura Helada",
"catSlow+moveSpeed":"Deslizamiento Gélido",
"coinMagnet+healOnWave":"Botiquín Magnético",
"doubleFish+fireRate":"Metralleta de Peces",
"doubleFish+omniBurst":"Tormenta Duplicada",
"fishSize+pierce":"Titán Perforador",
"fishSpeed+omniBurst":"Ráfaga Ultrasónica",
"lifeSteal+shield":"Escudo Vampírico",
"maxLife+moralSupport":"Abrazo Reconfortante",
"maxLife+shield":"Fortaleza Máxima",
"moveSpeed+xpBoost":"Aprendizaje Veloz",
"omniBurst+xpBoost":"Explosión de Sabiduría",
};

const fusionEffectDescMap={
"damage+pierce":"Tus peces mantienen el daño alto y además atraviesan enemigos. Al seguir subiendo esta fusión, cada disparo se vuelve más fiable contra grupos y jefes.",
"bigFish+damage":"Los peces grandes pegan mucho más fuerte. Es una fusión pensada para borrar enemigos duros y castigar jefes.",
"damage+doubleFish":"Cada disparo extra también aprovecha tu daño acumulado, así que las ráfagas dobles limpian mucho mejor.",
"doubleFish+fireRate":"Disparas más veces y con más peces por disparo. Ideal para llenar la pantalla de proyectiles.",
"fireRate+fishSpeed":"Los peces salen más rápido y llegan antes al objetivo. Se nota especialmente contra enemigos móviles.",
"boomerang+fireRate":"Lanzas boomerangs con más frecuencia, así que la pantalla se llena de peces que van y vuelven.",
"fishSpeed+pierce":"Los peces rápidos atraviesan enemigos con más facilidad, funcionando como proyectiles fantasma.",
"boomerang+fishSpeed":"Los boomerangs tienen más alcance efectivo y vuelven mejor desde lejos.",
"boomerang+pierce":"Los peces que vuelven pueden atravesar enemigos, haciendo daño tanto de ida como de vuelta.",
"boomerang+doubleFish":"Lanzas más boomerangs a la vez, creando una tormenta circular alrededor del jugador.",
"damage+lifeSteal":"El daño alto también te cura más, haciendo que atacar sea una forma real de sobrevivir.",
"lifeSteal+maxLife":"Aumenta tu aguante y convierte parte del daño en curación, perfecta para builds tanque.",
"healOnWave+lifeSteal":"Te recuperas entre rondas y durante el combate, creando una regeneración muy estable.",
"healOnWave+maxLife":"Más vida máxima y más curación al superar rondas. Aguantas mucho mejor las rondas largas.",
"catSlow+shield":"Los enemigos se acercan más lento y el escudo tiene más tiempo para golpearlos antes de tocarte.",
"fishSize+shield":"Los peces del escudo crecen y golpean con más presencia, sin tapar al personaje.",
"damage+shield":"El escudo deja de ser solo defensa: sus peces hacen más daño al contacto.",
"coinMagnet+xpBoost":"Recoges recursos y subes de nivel más rápido, acelerando muchísimo la progresión.",
"catInstinct+coinMagnet":"Cuando se activa el instinto gatuno, atrae monedas y latas cercanas hacia ti. Al subir esta fusión, aumenta el rango de atracción.",
"bigCursor+boomerang":"Los boomerangs quedan marcados por la mirilla y, al volver, buscan enemigos cercanos antes de regresar. Al subir esta fusión, corrigen mejor su trayectoria.",
"boomerang+catInstinct":"Cuando se activa Instinto gatuno, los boomerangs que haya en pantalla se reorientan hacia enemigos cercanos y duran un poco más.",
"catInstinct+omniBurst":"Cuando se activa Instinto gatuno, dispara una ráfaga circular defensiva. Al subir esta fusión, salen más peces.",
"coinMagnet+darkPact":"Voluntad Oscura se vuelve codiciosa: al elegir por ti al final de ronda, gana monedas extra. Al subir esta fusión, aumenta la recompensa.",
"healOnWave+xpBoost":"Subes de nivel con más estabilidad porque ganas experiencia y recuperas vida entre rondas.",
"coinMagnet+moveSpeed":"Te mueves rápido y recoges monedas desde más lejos, ideal para jugar agresivo sin perder recursos.",
"fireRate+omniBurst":"La ráfaga circular se activa con mejor ritmo y combina muy bien con una cadencia alta.",
"damage+omniBurst":"La explosión circular de peces pega mucho más fuerte, perfecta para limpiar pantalla.",
"boomerang+omniBurst":"Las ráfagas generan mucha presión alrededor del personaje y se combinan con proyectiles de largo recorrido.",
"aimAssist+autoFire":"La patita automática ya no dispara a ciegas: apunta al enemigo más cercano, prioriza objetivos útiles y dispara más rápido. Se nota mucho en jefes y enemigos lejanos.",
"autoFire+bigCursor":"El disparo automático gana asistencia extra y mejor ritmo. Aunque no apuntes perfecto, el juego ayuda a mantener presión constante.",
"aimAssist+bigCursor":"Los peces giran mucho más fuerte hacia los enemigos y corrigen mejor la trayectoria. Es la fusión de puntería más cómoda.",
"autoFire+moralSupport":"El apoyo moral potencia la ofensiva: el disparo automático gana velocidad y se siente como una patita más agresiva.",
"bigCursor+moralSupport":"Cuando estás a poca vida, entras en modo emergencia: mejoras tu ritmo ofensivo y puedes aguantar mejor momentos peligrosos.",
"darkPact+moralSupport":"Desbloquea el perro acompañante. Te sigue y dispara huesos automáticamente a enemigos cercanos. Una vez por partida, si vas a morir, dará su vida por ti y te curará completamente.",
"boomerang+yarnBounce":"Los peces pueden volver y además rebotar hacia otros objetivos, creando cadenas muy buenas contra grupos.",
"pierce+yarnBounce":"Los peces atraviesan y después pueden buscar otro objetivo cercano con rebote de ovillo.",
"fishSpeed+yarnBounce":"Los rebotes salen más rápidos y alcanzan mejor a enemigos lejanos.",
"doubleFish+yarnBounce":"Más peces significa más oportunidades de rebote. Muy buena para limpiar oleadas.",
"bigFish+yarnBounce":"Los rebotes pueden salir desde impactos grandes, haciendo que los peces enormes sean más útiles contra grupos.",
"fishSize+yarnBounce":"Peces más grandes con rebote: más facilidad para impactar y encadenar enemigos.",
"omniBurst+yarnBounce":"La ráfaga circular puede generar muchos rebotes, convirtiéndose en una limpieza de pantalla.",
"damage+yarnBounce":"Los rebotes pegan más fuerte, así que no solo saltan a otros enemigos: también duelen.",
"aimAssist+catInstinct":"Cuando se activa el instinto gatuno, además de empujar, dispara una ráfaga guiada a enemigos cercanos.",
"catInstinct+moralSupport":"El instinto puede ayudarte más veces por ronda y además recupera vida al activarse.",
"catInstinct+darkPact":"El instinto gatuno se vuelve maldito: empuja con más fuerza y te da una recuperación agresiva en situaciones críticas.",
"catInstinct+maxLife":"Cuando la vida cae por debajo de 7, activas 7 segundos de protección. Tiene recarga y solo puede salvarte una vez por ronda.",
"critChance+damage":"Los críticos aprovechan mejor el daño acumulado. Es la fusión ideal para pegar golpes enormes.",
"critChance+doubleFish":"Cada pez extra puede criticar, así que cuantos más disparos salgan, más probabilidades tienes de reventar enemigos.",
"autoFire+critChance":"La patita automática dispara más rápido y puede activar críticos constantemente. Muy buena para daño pasivo contra jefes.",
"moveSpeed+zoomies":"Los Zoomies duran más y te vuelves mucho más rápido durante el subidón.",
"fireRate+zoomies":"Durante Zoomies disparas muchísimo más rápido. Es una ventana corta de daño explosivo.",
"autoFire+zoomies":"Durante Zoomies, el disparo automático se vuelve mucho más agresivo y mantiene presión sin que tengas que clicar tanto.",
"critChance+zoomies":"Durante Zoomies aumenta mucho la probabilidad de crítico, convirtiendo el subidón en una fase de burst.",
};

function normalizeFusionMap(map){
Object.keys(map).forEach(k=>{
  const parts=k.split("+");
  if(parts.length!==2)return;
  const normalized=parts.sort().join("+");
  if(!map[normalized])map[normalized]=map[k];
});
}
normalizeFusionMap(fusionNameMap);
normalizeFusionMap(fusionEffectDescMap);


const fusionShortDescMap={
"damage+pierce":"Tus peces pegan fuerte y atraviesan mejor.",
"bigFish+damage":"Los peces grandes hacen golpes brutales.",
"damage+doubleFish":"Más peces y más daño por disparo.",
"doubleFish+fireRate":"Disparas más peces en menos tiempo.",
"fireRate+fishSpeed":"Peces rápidos y disparos rápidos.",
"boomerang+fireRate":"Más peces que van y vuelven.",
"fishSpeed+pierce":"Proyectiles rápidos que atraviesan.",
"boomerang+fishSpeed":"Boomerangs más veloces y cómodos.",
"boomerang+pierce":"Los peces atraviesan al ir y volver.",
"boomerang+doubleFish":"Lanzas más boomerangs a la vez.",
"damage+lifeSteal":"Pegar fuerte también te cura.",
"lifeSteal+maxLife":"Más vida y más curación al atacar.",
"healOnWave+lifeSteal":"Te curas entre rondas y peleando.",
"healOnWave+maxLife":"Build tanque: más vida y descanso.",
"catSlow+shield":"Zona segura alrededor de ti.",
"fishSize+shield":"Escudo con peces grandes.",
"damage+shield":"El escudo también pega más.",
"coinMagnet+xpBoost":"Recoges y progresas más rápido.",
"catInstinct+coinMagnet":"Tu instinto atrae monedas y latas.",
"bigCursor+boomerang":"Boomerangs que vuelven marcando objetivos.",
"boomerang+catInstinct":"Tu instinto redirige los boomerangs.",
"catInstinct+omniBurst":"Tu instinto dispara una ráfaga defensiva.",
"coinMagnet+darkPact":"Voluntad Oscura da más monedas.",
"healOnWave+xpBoost":"Subes mejor y te recuperas al pasar ronda.",
"coinMagnet+moveSpeed":"Corres y recoges monedas más fácil.",
"fireRate+omniBurst":"Más disparo y más ráfagas.",
"damage+omniBurst":"La explosión circular pega más.",
"boomerang+omniBurst":"Ráfagas con presión alrededor.",
"aimAssist+autoFire":"Disparo automático con mejor puntería.",
"autoFire+bigCursor":"El disparo automático ayuda más al apuntar.",
"aimAssist+bigCursor":"Puntería cómoda y muy guiada.",
"autoFire+moralSupport":"El apoyo moral anima tu ofensiva.",
"bigCursor+moralSupport":"Cuando vas mal, reaccionas mejor.",
"darkPact+moralSupport":"Aparece tu perro acompañante. Te ayuda y puede salvarte una vez.",
"boomerang+yarnBounce":"Los peces vuelven y rebotan.",
"pierce+yarnBounce":"Atraviesas y encadenas rebotes.",
"fishSpeed+yarnBounce":"Rebotes más rápidos.",
"doubleFish+yarnBounce":"Más peces significa más rebotes.",
"bigFish+yarnBounce":"Peces grandes que encadenan mejor.",
"fishSize+yarnBounce":"Peces grandes con rebote.",
"omniBurst+yarnBounce":"La ráfaga puede encadenar rebotes.",
"damage+yarnBounce":"Los rebotes también duelen.",
"aimAssist+catInstinct":"Cuando estás en peligro, respondes mejor.",
"catInstinct+moralSupport":"Tu instinto te cuida más.",
"catInstinct+darkPact":"Instinto más agresivo y oscuro.",
"critChance+damage":"Críticos más dolorosos.",
"critChance+doubleFish":"Más peces con opción a crítico.",
"autoFire+critChance":"Auto-disparo con críticos.",
"moveSpeed+zoomies":"Zoomies más rápidos y largos.",
"fireRate+zoomies":"Durante Zoomies disparas muchísimo.",
"autoFire+zoomies":"Auto-disparo loco durante Zoomies.",
"critChance+zoomies":"Zoomies con golpes críticos.",
"aimAssist+damage":"Los disparos guiados pegan más.",
"aimAssist+pierce":"Los peces guiados atraviesan mejor.",
"aimAssist+fishSpeed":"Peces rápidos y guiados.",
"aimAssist+boomerang":"Los boomerangs corrigen mejor su ruta.",
"aimAssist+critChance":"La puntería busca puntos débiles.",
"bigCursor+damage":"Marcas mejor al objetivo y pegas más.",
"bigCursor+pierce":"La marca ayuda a atravesar enemigos.",
"bigCursor+critChance":"Apuntar bien facilita críticos.",
"bigCursor+fishSize":"La mirilla potencia peces grandes.",
"moralSupport+maxLife":"El apoyo te hace aguantar más.",
"healOnWave+moralSupport":"Te recuperas mejor entre rondas.",
"moralSupport+xpBoost":"Con ánimo se aprende mejor.",
"moralSupport+moveSpeed":"Te mueves con más confianza.",
"damage+darkPact":"Daño fuerte con poder oscuro.",
"critChance+darkPact":"Críticos más peligrosos.",
"darkPact+lifeSteal":"El pacto roba vida.",
"darkPact+xpBoost":"El pacto acelera tu progreso.",
"darkPact+omniBurst":"Ráfagas con energía oscura.",
"catInstinct+maxLife":"Si quedas casi sin vida, te protege unos segundos.",
"catInstinct+catSlow":"Tu instinto frena la presión enemiga.",
"catInstinct+moveSpeed":"Reaccionas y huyes mejor.",
"catInstinct+healOnWave":"Instinto defensivo con recuperación.",
"fishSpeed+zoomies":"Los peces también entran en zoomies.",
"doubleFish+zoomies":"Más peces durante el caos.",
"boomerang+zoomies":"Boomerangs más locos y rápidos.",
"bigFish+doubleFish":"A veces dispara dos peces grandes extra.",
"bigFish+fireRate":"Los peces grandes llueven sin parar. Una avalancha de escamas y daño.",
"bigFish+fishSize":"Peces mucho más grandes.",
"bigFish+pierce":"Un pez enorme que atraviesa a todos los enemigos en línea recta.",
"catInstinct+shield":"A veces reduce un golpe y empuja enemigos.",
"catSlow+coinMagnet":"Los enemigos sueltan más monedas.",
"catSlow+fishSize":"Pez gigante y helado.",
"catSlow+maxLife":"El frío protege el cuerpo. Ralentizas a los enemigos y ganas más vida máxima.",
"catSlow+moveSpeed":"Te deslizas velozmente mientras los enemigos se arrastran en el hielo.",
"coinMagnet+healOnWave":"Las monedas también curan un poco.",
"doubleFish+omniBurst":"Dos peces por ola y ráfagas en todas direcciones. El caos es total.",
"fishSize+pierce":"Peces grandes que perforan.",
"fishSpeed+omniBurst":"Ráfagas mucho más rápidas.",
"lifeSteal+shield":"El escudo cura al golpear.",
"maxLife+moralSupport":"El apoyo de tu novio te da fuerzas para aguantar mucho más.",
"maxLife+shield":"Máxima vida y máxima defensa. Una fortaleza que nada puede derribar.",
"moveSpeed+xpBoost":"Moverte también da experiencia poco a poco.",
"omniBurst+xpBoost":"Las ráfagas también dan experiencia.",
};
normalizeFusionMap(fusionShortDescMap);

function getAllOfficialFusionPairs(){
  const pairs=new Set();
  Object.keys(fusionPairs).forEach(a=>{
    (fusionPairs[a]||[]).forEach(b=>{if(a!==b)pairs.add(sortedPair(a,b));});
  });
  return [...pairs].sort();
}
function ensureFusionCatalogueComplete(){
  getAllOfficialFusionPairs().forEach(pair=>{
    const [a,b]=pair.split("+");
    if(!fusionNameMap[pair])fusionNameMap[pair]=`${getAnyMeta(a)?.name||a} + ${getAnyMeta(b)?.name||b}`;
    if(!fusionShortDescMap[pair])fusionShortDescMap[pair]=`Combina ${getOriginalUpgradeName(a)} y ${getOriginalUpgradeName(b)} con un efecto propio.`;
    if(!fusionEffectDescMap[pair])fusionEffectDescMap[pair]=fusionShortDescMap[pair];
  });
}

function auditFusionDefinitions(){
  const pairs=getAllOfficialFusionPairs();
  pairs.forEach(pair=>{
    const [a,b]=pair.split("+");
    if(!fusionNameMap[pair])fusionNameMap[pair]=`${getOriginalUpgradeName(a)} + ${getOriginalUpgradeName(b)}`;
    if(!fusionShortDescMap[pair])fusionShortDescMap[pair]=`Combina ${getOriginalUpgradeName(a)} y ${getOriginalUpgradeName(b)}.`;
    if(!fusionEffectDescMap[pair])fusionEffectDescMap[pair]=fusionShortDescMap[pair];
  });
}

ensureFusionCatalogueComplete();
auditFusionDefinitions();
let FUSION_DATA=[];
let FUSION_BY_PAIR={};
function rebuildFusionDataCatalogue(){
  FUSION_DATA=getAllOfficialFusionPairs().map(pair=>{
    const [a,b]=pair.split("+");
    return {
      pair,
      keys:[a,b],
      name:fusionNameMap[pair]||`${getAnyMeta(a)?.name||a} + ${getAnyMeta(b)?.name||b}`,
      shortDesc:fusionShortDescMap[pair]||`Combina ${getOriginalUpgradeName(a)} y ${getOriginalUpgradeName(b)}.`,
      effectDesc:fusionEffectDescMap[pair]||fusionShortDescMap[pair]||`Combina ${getOriginalUpgradeName(a)} y ${getOriginalUpgradeName(b)}.`
    };
  });
  FUSION_BY_PAIR=Object.fromEntries(FUSION_DATA.map(f=>[f.pair,f]));
}
rebuildFusionDataCatalogue();

function getFusionExtraBonusDesc(pair){
  const parts=pair.split("+");
  const has=k=>parts.includes(k);

  if(pair==="darkPact+moralSupport")return "Bonus de fusión: invoca al perrito protector.";
  if(pair==="catInstinct+maxLife")return "Bonus de fusión: protección de emergencia.";
  if(pair==="catInstinct+coinMagnet")return "Bonus de fusión: el instinto atrae recursos.";
  if(pair==="bigCursor+boomerang")return "Bonus de fusión: boomerangs con retorno marcado.";
  if(pair==="boomerang+catInstinct")return "Bonus de fusión: el instinto redirige boomerangs.";
  if(pair==="catInstinct+omniBurst")return "Bonus de fusión: ráfaga defensiva al activar instinto.";
  if(pair==="coinMagnet+darkPact")return "Bonus de fusión: Voluntad Oscura da más monedas.";
  if(has("lifeSteal")&&has("shield"))return "Bonus de fusión: el escudo roba vida.";
  if(has("lifeSteal"))return "Bonus de fusión: más robo de vida.";
  if(has("shield")&&has("damage"))return "Bonus de fusión: el escudo pega más.";
  if(has("shield"))return "Bonus de fusión: defensa reforzada.";
  if(has("omniBurst")&&has("damage"))return "Bonus de fusión: ráfagas más destructivas.";
  if(has("omniBurst"))return "Bonus de fusión: ráfagas mejoradas.";
  if(has("yarnBounce")&&has("pierce"))return "Bonus de fusión: atraviesa y rebota.";
  if(has("yarnBounce"))return "Bonus de fusión: rebotes extra.";
  if(has("autoFire")&&has("aimAssist"))return "Bonus de fusión: autoapuntado mejorado.";
  if(has("autoFire"))return "Bonus de fusión: disparo automático reforzado.";
  if(has("aimAssist"))return "Bonus de fusión: mejor guiado.";
  if(has("critChance")&&has("damage"))return "Bonus de fusión: críticos más fuertes.";
  if(has("critChance"))return "Bonus de fusión: más críticos.";
  if(has("boomerang"))return "Bonus de fusión: retorno mejorado.";
  if(has("doubleFish"))return "Bonus de fusión: más peces por disparo.";
  if(has("fireRate"))return "Bonus de fusión: más cadencia.";
  if(has("fishSpeed"))return "Bonus de fusión: peces más rápidos.";
  if(has("pierce"))return "Bonus de fusión: más perforación.";
  if(has("damage"))return "Bonus de fusión: más daño.";
  if(has("bigFish")&&has("fishSize"))return "Bonus de fusión: tamaño extra.";
  if(has("fishSize"))return "Bonus de fusión: tamaño extra.";
  if(has("bigFish"))return "Bonus de fusión: peces más grandes.";
  if(has("maxLife"))return "Bonus de fusión: más aguante.";
  if(has("healOnWave"))return "Bonus de fusión: más curación.";
  if(has("moveSpeed")||has("zoomies"))return "Bonus de fusión: más velocidad.";
  if(has("xpBoost"))return "Bonus de fusión: progreso extra.";
  if(has("coinMagnet"))return "Bonus de fusión: recolección mejorada.";
  if(has("catSlow"))return "Bonus de fusión: más control de enemigos.";
  if(has("moralSupport"))return "Bonus de fusión: apoyo mejorado.";
  if(has("darkPact"))return "Bonus de fusión: poder oscuro extra.";
  if(has("catInstinct"))return "Bonus de fusión: instinto reforzado.";
  return "Bonus de fusión: efecto especial propio.";
}

function addFusionLevelBonus(key,amount=1){
  if(!Object.prototype.hasOwnProperty.call(upgradeLevels,key))return;
  fusedBaseLevels[key]=(fusedBaseLevels[key]||0)+amount;
}
function applyFusionBonus(pair,a,b){
  // Todas las fusiones dan un pequeño empujón propio además de conservar ambas mejoras.
  upgrades.fusionBonusPower=(upgrades.fusionBonusPower||0)+1;
  if(pair.includes("damage"))addFusionLevelBonus("damage",1);
  if(pair.includes("fireRate")||pair.includes("autoFire"))addFusionLevelBonus("fireRate",1);
  if(pair.includes("fishSpeed")||pair.includes("boomerang"))addFusionLevelBonus("fishSpeed",1);
  if(pair.includes("doubleFish"))addFusionLevelBonus("doubleFish",1);
  if(pair.includes("pierce"))addFusionLevelBonus("pierce",1);
  if(pair.includes("bigFish")||pair.includes("fishSize"))addFusionLevelBonus("fishSize",1);
  if(pair.includes("shield"))addFusionLevelBonus("shield",1);
  if(pair.includes("lifeSteal"))addFusionLevelBonus("lifeSteal",1);
  if(pair.includes("maxLife")){addFusionLevelBonus("maxLife",1);life=Math.min(upgrades.maxLife+40,life+35)}
  if(pair.includes("healOnWave")){addFusionLevelBonus("healOnWave",1);life=Math.min(upgrades.maxLife,life+25)}
  if(pair.includes("moveSpeed")||pair.includes("zoomies"))addFusionLevelBonus("moveSpeed",1);
  if(pair.includes("xpBoost"))addFusionLevelBonus("xpBoost",1);
  if(pair.includes("coinMagnet"))addFusionLevelBonus("coinMagnet",1);
  if(pair.includes("catSlow"))addFusionLevelBonus("catSlow",1);
  if(pair.includes("omniBurst"))addFusionLevelBonus("omniBurst",1);
  if(pair.includes("yarnBounce"))addFusionLevelBonus("yarnBounce",1);
  if(pair.includes("critChance"))addFusionLevelBonus("critChance",1);
}

function sortedPair(a,b){return [a,b].sort().join("+")}
function isUniqueKey(key){return uniqueFusionKeys.includes(key)}
function getAnyMeta(key){return UPGRADE_META[key]||uniqueFusionMeta[key]}
function getAnyName(key){return getFusionName(key)||getAnyMeta(key)?.name||key}
function getAnyIcon(key){return getAnyMeta(key)?.icon||"✨"}
function areFusionCompatible(a,b){
return a!==b&&((fusionPairs[a]||[]).includes(b)||(fusionPairs[b]||[]).includes(a))
}
function getFusionNameFromPair(a,b){
const pair=sortedPair(a,b);
return FUSION_BY_PAIR[pair]?.name||fusionNameMap[pair]||`${getAnyMeta(a)?.name||a} + ${getAnyMeta(b)?.name||b}`
}
function hasFusionBeenDone(a,b){
return !!doneFusionPairs[sortedPair(a,b)]
}
function getFusionName(key){
return fusedUpgradeNames[key]||null
}
function getUpgradeDisplayName(key){
return getFusionName(key)||getAnyMeta(key)?.name||key
}
function getFusionEffectDesc(a,b){
const pair=sortedPair(a,b);
const data=FUSION_BY_PAIR[pair];
let desc=data?.shortDesc||fusionShortDescMap[pair]||fusionEffectDescMap[pair]||`Combina ${getOriginalUpgradeName(a)} y ${getOriginalUpgradeName(b)}.`;
if(pair==="darkPact+moralSupport"){
if(upgrades.boyfriendDogReturned)desc="El perro ha vuelto y puede salvarte otra vez.";
else if(upgrades.boyfriendDogSpirit)desc="El perro ya te salvó una vez. Su espíritu sigue contigo.";
}
return `${desc} ${getFusionExtraBonusDesc(pair)}`;
}
function getUpgradeDisplayDesc(key,lvl){
const fused=getFusionName(key);
if(fused){
const pairs=Object.keys(doneFusionPairs).filter(pair=>pair.split("+").includes(key));
if(pairs.length>0){
  return pairs.map(pair=>{
    const [a,b]=pair.split("+");
    return getFusionEffectDesc(a,b);
  }).join(" ");
}
return `Fusión activa: mantiene los efectos anteriores y permite seguir escalando esta mejora.`;
}
return UPGRADE_META[key]?.desc?UPGRADE_META[key].desc(lvl):(uniqueFusionMeta[key]?.desc||"Mejora.")
}
function getFusionDesc(a,b){
return getFusionEffectDesc(a,b);
}
function getFusableScalableKeys(){
return Object.keys(upgradeLevels).filter(k=>upgradeLevels[k]>=upgradeMaxLevels[k]&&!fusedUpgradeNames[k])
}
function getFusableUniqueKeys(){
return uniqueFusionKeys.filter(k=>hasUniqueUpgrade(k)&&!Object.keys(doneFusionPairs).some(pair=>pair.split("+").includes(k)))
}
function hasUniqueUpgrade(key){
if(key==="aimAssist")return upgrades.aimAssist;
if(key==="bigCursor")return upgrades.bigCursor;
if(key==="moralSupport")return upgrades.moralSupport;
if(key==="darkPact")return upgrades.darkPact;
if(key==="catInstinct")return upgrades.catInstinct;
if(key==="zoomies")return upgrades.zoomies;
return false
}
function getMaxedFusionKeys(){
return [...getFusableScalableKeys(),...getFusableUniqueKeys()]
}

function hasPendingFusionPairs(){
const keys=[...getFusableScalableKeys(),...getFusableUniqueKeys()];
return keys.some((a,i)=>keys.slice(i+1).some(b=>areFusionCompatible(a,b)&&!hasFusionBeenDone(a,b)))
}


/* ─── SISTEMA DE PUNTUACIÓN FINAL ──────────────────────────── */

/* ─── RÉCORD LOCAL ─────────────────────────────────────────── */
const HS_KEY="gatitos_peces_hs";
function getHighScore(){return parseInt(localStorage.getItem(HS_KEY)||"0",10)||0}
function saveHighScore(s){localStorage.setItem(HS_KEY,String(s))}
function checkAndSaveRecord(total){
const prev=getHighScore();
if(total>prev){saveHighScore(total);return true;}
return false;
}
/* ─────────────────────────────────────────────────────────── */
function computeFinalScore(){
// Los jefes aparecen aleatoriamente: podrías terminar en ronda 20 (mucha suerte)
// o en ronda 55 (poca suerte). El peso de las rondas se reduce y los jefes
// se convierten en el factor principal de la puntuación.
const bossBonus=defeatedBossTypes.size*3500;
// Bono por victoria completa (todos los jefes): el logro real del juego
const completionBonus=defeatedBossTypes.size===4?25000:0;
// Bono de eficiencia: terminar antes implica haber peleado con menos mejoras (más difícil)
// Máximo en ronda 15, cero a partir de ronda 65. Solo si se completó el juego.
const efficiencyBonus=defeatedBossTypes.size===4?Math.max(0,Math.floor((65-Math.min(wave,65))*120)):0;
// Factores de partida (peso reducido porque la cuenta de rondas depende en parte de la suerte)
const wavePoints=wave*150;
const levelPoints=level*250;
const killPoints=score*50;
const impactCount=runStats?Math.floor(runStats.fishHits||0):0;
const fishBonus=Math.floor(impactCount*0.6);
const total=wavePoints+levelPoints+killPoints+fishBonus+bossBonus+completionBonus+efficiencyBonus;
let rank,rankEmoji,rankMsg;
if(total>=65000&&defeatedBossTypes.size>=4){rank="S";rankEmoji="🌟";rankMsg="¡Rango S! Eres una leyenda gatuna"}
else if(total>=35000){rank="A";rankEmoji="⭐";rankMsg="¡Rango A! Muy impresionante"}
else if(total>=16000){rank="B";rankEmoji="💫";rankMsg="¡Rango B! Buen trabajo"}
else if(total>=6000){rank="C";rankEmoji="🐾";rankMsg="Rango C — sigue practicando"}
else{rank="D";rankEmoji="🐱";rankMsg="Rango D — ¡inténtalo de nuevo!"}
return{total,rank,rankEmoji,rankMsg,wavePoints,levelPoints,killPoints,fishBonus,impactCount,bossBonus,completionBonus,efficiencyBonus};
}
function buildScoreRows(r,cssClass){
return `<div class="${cssClass}">
${r.completionBonus>0?`<div class="sRow"><span>🏆 Victoria completa</span><span>+${r.completionBonus.toLocaleString()}</span></div>`:""}
${r.efficiencyBonus>0?`<div class="sRow"><span>⚡ Eficiencia (ronda ${wave})</span><span>+${r.efficiencyBonus.toLocaleString()}</span></div>`:""}
<div class="sRow"><span>💀 Jefes derrotados</span><span>${defeatedBossTypes.size}/4 jefes: +${r.bossBonus.toLocaleString()}</span></div>
<div class="sRow"><span>🌊 Rondas superadas</span><span>Ronda ${wave}: +${r.wavePoints.toLocaleString()}</span></div>
<div class="sRow"><span>⭐ Nivel alcanzado</span><span>Nivel ${level}: +${r.levelPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🐱 Gatitos mimados</span><span>${score} gatitos: +${r.killPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🎯 Impactos</span><span>${r.impactCount||0} impactos: +${r.fishBonus.toLocaleString()}</span></div>
<div class="sRow"><span>PUNTUACIÓN TOTAL</span><span>${r.total.toLocaleString()}</span></div>
</div>`;
}
function showGameOverScreen(){
const r=computeFinalScore();
const isRecord=checkAndSaveRecord(r.total);
const prevBest=isRecord?r.total:getHighScore();
gameOverRankEmojiEl.textContent=r.rankEmoji;
gameOverRankLabelEl.textContent=`${r.rank} · ${r.rankMsg}`;
gameOverTotalEl.textContent=r.total.toLocaleString();
gameOverBreakdownEl.innerHTML=`
${r.completionBonus>0?`<div class="sRow"><span>🏆 Victoria completa</span><span>+${r.completionBonus.toLocaleString()}</span></div>`:""}
${r.efficiencyBonus>0?`<div class="sRow"><span>⚡ Eficiencia (ronda ${wave})</span><span>+${r.efficiencyBonus.toLocaleString()}</span></div>`:""}
<div class="sRow"><span>💀 Jefes derrotados</span><span>${defeatedBossTypes.size}/4 jefes: +${r.bossBonus.toLocaleString()}</span></div>
<div class="sRow"><span>🌊 Rondas superadas</span><span>Ronda ${wave}: +${r.wavePoints.toLocaleString()}</span></div>
<div class="sRow"><span>⭐ Nivel alcanzado</span><span>Nivel ${level}: +${r.levelPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🐱 Gatitos mimados</span><span>${score} gatitos: +${r.killPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🎯 Impactos</span><span>${r.impactCount||0} impactos: +${r.fishBonus.toLocaleString()}</span></div>
<div class="sRow"><span>PUNTUACIÓN TOTAL</span><span>${r.total.toLocaleString()}</span></div>
${isRecord?`<div class="sRow" style="color:#ffd166;font-size:13px">🏆 ¡Nuevo récord personal!</div>`:""}
<div class="sRow" style="color:#888;font-size:12px"><span>Mejor puntuación</span><span>${prevBest.toLocaleString()}</span></div>`;
releaseGamePointer();
gameOverPanel.style.display="flex";
autoLearnFromFinalScore(r,"gameOver");
submitOnlineScore(r,gameOverOnlineStatus,gameOverRankingList);
}
function injectVictoryScore(){
const r=computeFinalScore();
const isVicRecord=checkAndSaveRecord(r.total);
const prevVicBest=isVicRecord?r.total:getHighScore();
victoryScoreAreaEl.innerHTML=`
${isVicRecord?'<div style="background:linear-gradient(90deg,#ffd166,#ff7aa8);color:#4b2636;font-size:13px;font-weight:900;padding:4px 16px;border-radius:999px;margin-bottom:6px;display:inline-block">🏆 ¡Nuevo récord personal!</div>':''}<div style="font-size:52px;margin:4px 0">${r.rankEmoji}</div>
<div style="font-size:22px;font-weight:900;color:#e67700;margin-bottom:6px">${r.rank} · ${r.rankMsg}</div>
<div style="font-size:34px;font-weight:900;color:#e67700;margin:4px 0">${r.total.toLocaleString()} <span style="font-size:14px;font-weight:400;color:#999">puntos</span></div>
<div class="victoryScore">
${r.completionBonus>0?`<div class="sRow"><span>🏆 Victoria completa</span><span>+${r.completionBonus.toLocaleString()}</span></div>`:""}
${r.efficiencyBonus>0?`<div class="sRow"><span>⚡ Eficiencia (ronda ${wave})</span><span>+${r.efficiencyBonus.toLocaleString()}</span></div>`:""}
<div class="sRow"><span>💀 Jefes derrotados</span><span>${defeatedBossTypes.size}/4 jefes: +${r.bossBonus.toLocaleString()}</span></div>
<div class="sRow"><span>🌊 Rondas superadas</span><span>Ronda ${wave}: +${r.wavePoints.toLocaleString()}</span></div>
<div class="sRow"><span>⭐ Nivel alcanzado</span><span>Nivel ${level}: +${r.levelPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🐱 Gatitos mimados</span><span>${score} gatitos: +${r.killPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🎯 Impactos</span><span>${r.impactCount||0} impactos: +${r.fishBonus.toLocaleString()}</span></div>
<div class="sRow"><span>TOTAL</span><span>${r.total.toLocaleString()}</span></div>
</div>`;
if(!bossVictoryScoreSaved){
bossVictoryScoreSaved=true;
setOnlineStatus(victoryOnlineStatus,"Guardando victoria en el ranking online...","info");
autoLearnFromFinalScore(r,"victory");
submitOnlineScore(r,victoryOnlineStatus,victoryRankingList);
}else{
setOnlineStatus(victoryOnlineStatus,"Victoria ya enviada al ranking.","ok");
loadOnlineRanking([startRankingList,victoryRankingList].filter(Boolean));
}
}
/* ─────────────────────────────────────────────────────────── */
function isGameCompleted(){
// El juego termina cuando ya no queda progreso real posible:
// 1) no hay mejoras ni fusiones existentes que puedan seguir subiendo,
// 2) todas las mejoras únicas están conseguidas,
// 3) no queda ninguna pareja compatible pendiente para fusionar.
// Esto evita bloqueos cuando al final quedan dos mejoras maxeadas que no son compatibles entre sí.
const noUpgradeableLevels=getLevelUpgradeKeys().length===0;
const allUniqueOwned=uniqueFusionKeys.every(k=>hasUniqueUpgrade(k));
const noFusionPairsLeft=!hasPendingFusionPairs();
return noUpgradeableLevels&&allUniqueOwned&&noFusionPairsLeft;
}

function finishGame(){
releaseGamePointer();
unlockAdmin("Juego completado");
stopPowerStarLoop();
gameOver=true;
injectVictoryScore();
victoryPanel.style.display="flex";
playVictoryJingle();
document.querySelector("#victoryBox h1").textContent="🌟 ¡Juego completado!";
document.querySelector("#victoryBox .victoryMsg").innerHTML=`<span class="vLine vMain">Has maxeado todas las mejoras y agotado todas las fusiones posibles.</span><span class="vLine vSub">Has alcanzado el poder absoluto gatuno. ✨🏆</span>`;
floatingTexts.push({x:canvas.width/2,y:canvas.height/2-110,text:"¡FINAL COMPLETADO!",life:4,maxLife:4,big:true})
}
function checkGameCompletion(){if(!gameOver&&isGameCompleted())finishGame()}

function canFuse(cost=5){
const maxed=getMaxedFusionKeys();
return coins>=cost&&maxed.some((a,i)=>maxed.slice(i+1).some(b=>areFusionCompatible(a,b)&&!hasFusionBeenDone(a,b)))
}
function openFusionChoice(cost=5){
releaseGamePointer();
if(!canFuse(cost)){openCoinShop();return}
const maxed=getMaxedFusionKeys();
// Paso 1: solo claves que tienen AL MENOS 1 pareja válida en maxed
const firstChoices=maxed.filter(k=>maxed.some(other=>other!==k&&areFusionCompatible(k,other)&&!hasFusionBeenDone(k,other))).map(k=>({
icon:getAnyIcon(k),
key:k,
title:getAnyName(k),
levelTag:isUniqueKey(k)?"1/1":`${upgradeLevels[k]}/${upgradeMaxLevels[k]}`,
desc:"Primera mejora compatible para fusionar.",
special:true,
fusion:true
}));
const backToShop=()=>{choosingUpgrade=false;levelUpPanel.style.display="none";fusionBackBtn.style.display="none";if(shopAvailable)openCoinShop()};
showCards("🔮 Fusión de mejoras","Elige la primera mejora",`Después elegirás una compatible. Cuesta ${cost} monedas.`,firstChoices,first=>{
// Paso 2: catálogo completo — todas las fusiones posibles con first.key (desbloqueadas y bloqueadas)
const allCompatibleKeys=new Set();
(fusionPairs[first.key]||[]).forEach(k=>allCompatibleKeys.add(k));
Object.keys(fusionPairs).forEach(k=>{if((fusionPairs[k]||[]).includes(first.key))allCompatibleKeys.add(k)});
uniqueFusionKeys.forEach(k=>{if(areFusionCompatible(first.key,k))allCompatibleKeys.add(k)});
allCompatibleKeys.delete(first.key);
const allPartners=[...allCompatibleKeys].map(k=>{
const fusionName=getFusionNameFromPair(first.key,k);
const fusionDesc=getFusionDesc(first.key,k);
let locked=false,lockDesc="";
if(hasFusionBeenDone(first.key,k)){locked=true;lockDesc="Fusión ya realizada ✓";}
else if(isUniqueKey(k)){
  if(!hasUniqueUpgrade(k)){locked=true;lockDesc="Aún no tienes esta mejora";}
  else if(Object.keys(doneFusionPairs).some(p=>p.split("+").includes(k))){locked=true;lockDesc="Ya fusionada con otra mejora";}
}else{
  if(fusedUpgradeNames[k]){locked=true;lockDesc="Ya fusionada con otra mejora";}
  else{const lv=upgradeLevels[k]||0,max=upgradeMaxLevels[k]||5;if(lv<max){locked=true;lockDesc=`Necesita ${max-lv} nivel${max-lv>1?"es":""} más`;}}
}
return{
icon:getAnyIcon(k),key:k,title:getAnyName(k),
levelTag:isUniqueKey(k)?"1/1":`${upgradeLevels[k]||0}/${upgradeMaxLevels[k]||5}`,
desc:locked?`🔒 ${lockDesc} — ${fusionDesc}`:fusionDesc,
special:true,locked,
fusion:!locked,
easter:sortedPair(first.key,k)==="darkPact+moralSupport",first:first.key
}}).sort((a,b)=>Number(a.locked)-Number(b.locked));
showCards("🔮 Fusión compatible",`Fusiones posibles con ${getAnyName(first.key)}`,"Las bloqueadas aún no están disponibles.",allPartners,second=>{
if(second.locked)return;
const wasShopOpen=shopAvailable;
coins-=cost;
if(shopAvailable)shopFusionPurchases++;
const pair=sortedPair(first.key,second.key);
doneFusionPairs[pair]=true;
if(pair.includes("autoFire"))upgrades.holdShoot=true;
const fusionName=getFusionNameFromPair(first.key,second.key);
if(pair==="aimAssist+autoFire"){upgrades.combatAI=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🤖 IA de combate activada",life:1.8,maxLife:1.8,big:false})}
if(pair==="autoFire+bigCursor"){upgrades.assistedShot=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🌈 Disparo asistido",life:1.8,maxLife:1.8,big:false})}
if(pair==="aimAssist+bigCursor"){upgrades.perfectAim=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🎯 Puntería perfecta",life:1.8,maxLife:1.8,big:false})}
if(pair==="autoFire+moralSupport"){upgrades.moraleFire=true;floatingTexts.push({x:player.x,y:player.y-95,text:"💛 Motivación bélica",life:1.8,maxLife:1.8,big:false})}
if(pair==="bigCursor+moralSupport"){upgrades.braveHeart=true;floatingTexts.push({x:player.x,y:player.y-95,text:"💗 Corazón valiente",life:1.8,maxLife:1.8,big:false})}
if(pair==="aimAssist+catInstinct"){upgrades.reflexBurst=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🐱‍👤 Reflejos perfectos",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+moralSupport"){upgrades.valorCasa=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🏠 Valor de casa",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+darkPact"){upgrades.cursedInstinct=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🖤 Instinto maldito",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+maxLife"){upgrades.sevenLives=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🐱 Siete vidas de gato",life:2,maxLife:2,big:false})}
if(pair==="catInstinct+coinMagnet"){floatingTexts.push({x:player.x,y:player.y-95,text:"🧲 Instinto recolector",life:1.8,maxLife:1.8,big:false})}
if(pair==="bigCursor+boomerang"){floatingTexts.push({x:player.x,y:player.y-95,text:"🪃 Retorno marcado",life:1.8,maxLife:1.8,big:false})}
if(pair==="boomerang+catInstinct"){floatingTexts.push({x:player.x,y:player.y-95,text:"🥷 Reflejo circular",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+omniBurst"){floatingTexts.push({x:player.x,y:player.y-95,text:"💥 Ráfaga felina",life:1.8,maxLife:1.8,big:false})}
if(pair==="coinMagnet+darkPact"){floatingTexts.push({x:player.x,y:player.y-95,text:"🖤 Codicia oscura",life:1.8,maxLife:1.8,big:false})}
if(pair==="darkPact+moralSupport"){upgrades.boyfriendDog=true;upgrades.boyfriendDogSpirit=false;dogSacrificeUsed=false;forceDemonNextBoss=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🐶 Tu novio ha hecho este juego",life:2.3,maxLife:2.3,big:false});floatingTexts.push({x:player.x,y:player.y-125,text:"😈 El demonio te está buscando...",life:2,maxLife:2,big:false})}
if(pair==="moveSpeed+zoomies"){upgrades.zoomiesHyper=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🐱💨 Hiperactividad",life:1.8,maxLife:1.8,big:false})}
if(pair==="fireRate+zoomies"||pair==="autoFire+zoomies"){upgrades.zoomiesCannon=true;floatingTexts.push({x:player.x,y:player.y-95,text:"🐱💨 Modo cañón",life:1.8,maxLife:1.8,big:false})}
if(pair==="critChance+zoomies"||pair==="autoFire+critChance"){upgrades.zoomiesCrit=true;floatingTexts.push({x:player.x,y:player.y-95,text:"💥 Subidón crítico",life:1.8,maxLife:1.8,big:false})}
[first.key,second.key].forEach(k=>{
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,k)){
    fusedBaseLevels[k]=(fusedBaseLevels[k]||0)+(upgradeLevels[k]||0);
    upgradeLevels[k]=0;
    upgradeMaxLevels[k]=5;
  }
});
fusionProgressLevels[pair]=0;
setFusionProgress(pair,0);
applyFusionBonus(pair,first.key,second.key);
applyUpgradeStatsFromLevels();
playFusionCompleteSound();
fusedUpgradeNames[first.key]=fusionName;
fusedUpgradeNames[second.key]=fusionName;
fusionAvailable=false;shopAvailable=false;choosingUpgrade=false;levelUpPanel.style.display="none";
syncGamePointerLock();
floatingTexts.push({x:player.x,y:player.y-75,text:`🔮 ${fusionName}`,life:1.8,maxLife:1.8,big:false});
updateHud();refreshAdminPanelUI();checkGameCompletion();
if(!gameOver&&wasShopOpen)openCoinShop();else maybeOpenShopOrFusion()
},()=>{fusionBackBtn.style.display="none";openFusionChoice(cost)},"fusionPartner")
},backToShop,"fusionFirst")
}


function getRainbowLowestChoices(amount=3){
const pool=[];

getLevelUpgradeKeys().forEach(key=>{
const pair=getFusedPairForKey(key);
const level=pair?getFusionProgress(pair):(upgradeLevels[key]||0);
pool.push({key,level,upgrade:makeLevelUpgrade(key)});
});

if(!upgrades.aimAssist)pool.push({key:"aimAssist",level:0,upgrade:{icon:"🎯",title:"Peces listillos",levelTag:"1/1",desc:"Los peces giran hacia enemigos cercanos.",apply:()=>{upgrades.aimAssist=true}}});
if(!upgrades.bigCursor)pool.push({key:"bigCursor",level:0,upgrade:{icon:"🌈",title:"Mirilla brillante",levelTag:"1/1",desc:"La mirilla se ve mucho mejor.",apply:()=>{upgrades.bigCursor=true}}});
if(!upgrades.moralSupport)pool.push({key:"moralSupport",level:0,upgrade:{icon:"💛",title:"Apoyo Moral",levelTag:"1/1",desc:"Tu novio te anima durante la partida.",special:true,apply:()=>{upgrades.moralSupport=true}}});
if(!upgrades.darkPact)pool.push({key:"darkPact",level:0,upgrade:{icon:"🖤",title:"Voluntad Oscura",levelTag:"1/1",desc:"Menos opciones, pero más poder.",dark:true,apply:()=>{upgrades.darkPact=true}}});
if(!upgrades.catInstinct)pool.push({key:"catInstinct",level:0,upgrade:{icon:"🥷",title:"Instinto gatuno",levelTag:"1/1",desc:"Te ayuda cuando estás en peligro.",special:true,apply:()=>{upgrades.catInstinct=true}}});
if(!upgrades.zoomies)pool.push({key:"zoomies",level:0,upgrade:{icon:"💨",title:"Zoomies",levelTag:"1/1",desc:"A veces vas rapidísima.",special:true,apply:()=>{upgrades.zoomies=true}}});

if(pool.length===0)return [];

const minLevel=Math.min(...pool.map(p=>p.level));
const lowest=pool.filter(p=>p.level===minLevel).map(p=>p.upgrade).filter(Boolean);
const choices=[];

while(choices.length<amount&&lowest.length>0){
const index=Math.floor(Math.random()*lowest.length);
choices.push(lowest.splice(index,1)[0]);
}

return choices;
}

function giveRainbowMaxedReward(){
const amount=12+Math.floor(Math.random()*9);
coins+=amount;
floatingTexts.push({x:player.x,y:player.y-82,text:`🌈 +${amount} monedas`,life:1.8,maxLife:1.8,big:true});
floatingTexts.push({x:player.x,y:player.y-48,text:"Todo está al máximo",life:1.4,maxLife:1.4,big:false});
choosingUpgrade=false;
levelUpPanel.style.display="none";
canvas.style.cursor=upgrades.bigCursor?"none":"crosshair";
syncGamePointerLock();
updateHud();
refreshAdminPanelUI();
checkGameCompletion();
}

function openRainbowLowestMenu(){
const choices=getRainbowLowestChoices(3);
if(choices.length===0){
giveRainbowMaxedReward();
return;
}
showCards("🌈 ¡Gatito arcoíris!","Elige una mejora de las más bajas 💖","Cuenta también las no desbloqueadas como nivel 0",choices,upgrade=>{
upgrade.apply();
choosingUpgrade=false;
levelUpPanel.style.display="none";
canvas.style.cursor=upgrades.bigCursor?"none":"crosshair";
syncGamePointerLock();
floatingTexts.push({x:player.x,y:player.y-65,text:"🌈 "+upgrade.title,life:1.3,maxLife:1.3,big:false});
updateHud();refreshAdminPanelUI();checkGameCompletion();
});
}

function openRainbowChoice(best){
const names=UPGRADE_META;
const choices=best.map(([key])=>{const fusedPair=getFusedPairForKey(key);return{icon:fusedPair?getFusionIconFromPair(fusedPair):names[key].icon,key,title:getUpgradeDisplayName(key),levelTag:(isPercentLimitedKey(key)&&nextPercentValue(key)>=100)?"DEF":`${upgradeLevels[key]+1}/${upgradeMaxLevels[key]}`,desc:getUpgradeDisplayDesc(key,upgradeLevels[key]+1),special:true,fusion:!!fusedPair}});
showCards("🌈 ¡Gatito arcoíris!","Elige qué mejora potenciar 💖","Sube gratis una de tus mejoras más fuertes",choices,upgrade=>{
if(!isUpgradeFinal(upgrade.key))upgradeLevels[upgrade.key]++;applyUpgradeStatsFromLevels();choosingUpgrade=false;levelUpPanel.style.display="none";
syncGamePointerLock();
floatingTexts.push({x:player.x,y:player.y-65,text:"¡Mejora potenciada!",life:1.3,maxLife:1.3,big:false});updateHud();checkGameCompletion()
})
}
function boostTopUpgrade(){
openRainbowLowestMenu()
}


function grantFullLevel(){
level++;
xpNeed=Math.ceil(xpNeed*1.35+2);
queueUpgradeMenus("level",1);
updateHud();
}

function gainXP(amount){
const real=Math.max(1,Math.round(amount*upgrades.xpBoost));
xp+=real;
let gainedLevels=0;
while(xp>=xpNeed){xp-=xpNeed;level++;xpNeed=Math.ceil(xpNeed*1.35+2);gainedLevels++;}
if(gainedLevels>0)queueUpgradeMenus("level",gainedLevels);
}



function getThiefStealTier(){
  return Math.max(1,Math.min(5,Math.ceil(Math.max(1,wave)/10)));
}
function getThiefStealPerTouch(){
  return getThiefStealTier();
}
function getThiefWaveStealLimit(){
  return getThiefStealTier()*5;
}
function getThiefRemainingWaveSteal(){
  return Math.max(0,getThiefWaveStealLimit()-thiefCoinsStolenThisWave);
}
function dropRecoveredStolenCoins(cat){
  const stolen=Math.max(0,Math.floor(Number(cat?.stolenCoins)||0));
  if(!stolen)return;
  const roll=Math.random();
  let recovered=0;
  if(roll<.10)recovered=stolen;
  else if(roll<.30)recovered=Math.max(1,Math.floor(stolen/2));
  if(recovered>0){
    for(let i=0;i<recovered;i++){
      const a=Math.random()*Math.PI*2;
      coinsDrops.push({x:cat.x+Math.cos(a)*(12+Math.random()*18),y:cat.y+Math.sin(a)*(12+Math.random()*18),r:10,amount:1,life:18});
    }
    floatingTexts.push({x:cat.x,y:cat.y-44,text:`+${recovered} recuperadas 🪙`,life:1.0,maxLife:1.0,big:false});
  }
}

function hasActiveMusicianCat(){
return cats.some(c=>c&&c.type==="musician"&&!c.dead&&isFinitePos(c));
}
function normalizeSpecialCatSpawnType(catType){
if(catType==="musician"&&(hasActiveMusicianCat()||musicianSpawnedThisWave))return "normal";
return catType;
}

function spawnCat(x=null,y=null,small=false){
if(x===null){
const side=Math.floor(Math.random()*4);
if(side===0){x=-50;y=Math.random()*canvas.height}else if(side===1){x=canvas.width+50;y=Math.random()*canvas.height}else if(side===2){x=Math.random()*canvas.width;y=-50}else{x=Math.random()*canvas.width;y=canvas.height+50}
}
const maxHp=small?1:1+Math.floor(wave/3);
const rainbow=!small&&rainbowSelectedThisWave&&!rainbowSpawnedThisWave;
if(rainbow)rainbowSpawnedThisWave=true;
let catType="normal";
if(!small&&!rainbow){
  const thiefChance=wave>=14?Math.min(.16,.05+(wave-14)*.008):0;
  const yarnChance=wave>=10?Math.min(.18,.06+(wave-10)*.01):0;
  const sleepyChance=wave>=5?Math.min(.14,.04+(wave-5)*.012):0;
  const glutChance=wave>=9?Math.min(.11,.03+(wave-9)*.009):0;
  const musicChance=wave>=12?Math.min(.09,.025+(wave-12)*.008):0;
  const studChance=wave>=15?Math.min(.10,.025+(wave-15)*.008):0;
  const miniChance=wave>=7?Math.min(.13,.04+(wave-7)*.010):0;
  let acc=0,roll=Math.random();
  if(roll<(acc+=thiefChance))catType="thief";
  else if(roll<(acc+=yarnChance))catType="yarn";
  else if(roll<(acc+=sleepyChance))catType="sleepy";
  else if(roll<(acc+=glutChance))catType="glutton";
  else if(roll<(acc+=musicChance))catType="musician";
  else if(roll<(acc+=studChance))catType="student";
  else if(roll<(acc+=miniChance))catType="mini";
}
catType=normalizeSpecialCatSpawnType(catType);
let color=rainbow?"rainbow":small?"#ffd6a5":["#f7b7c9","#f4c28b","#d7c1ff","#bde0fe","#caffbf"][Math.floor(Math.random()*5)];
let r=rainbow?28:(small?17:24);
let speed=(rainbow?70:(small?85:48+wave*7+Math.random()*18))*Math.max(.45,1-upgrades.catSlow);
let hp=rainbow?Math.max(2,maxHp):maxHp;
if(catType==="yarn"){
  color="#b197fc";
  r=29;
  // Más vida para que el gato lanero sea un objetivo prioritario, pero sin volverse un jefe.
  hp+=4+Math.floor(wave/5);
  speed*=.72;
}
if(catType==="thief"){
  color="#343a40";
  r=21;
  hp=Math.max(1,hp);
  speed*=1.78;
}
if(catType==="sleepy"){color="#c8b6e2";r=28;hp+=3;speed*=.34;}
if(catType==="mini"){color="#ffb347";r=12;hp=1;speed*=1.65;}
if(catType==="glutton"){color="#e8956d";r=34;hp+=6;speed*=.38;}
if(catType==="musician"){color="#d084c8";r=26;hp+=2;speed*=.78;}
if(catType==="student"){color="#74b9ff";r=24;const startStudy=Math.min(4,Math.max(0,Math.floor((wave-12)/8)));hp+=2+startStudy*2;speed*=Math.max(.38,.54-startStudy*.025);}
const initialStudyLevel=catType==="student"?Math.min(4,Math.max(0,Math.floor((wave-12)/8))):0;
const musicianImmune=catType==="musician"?1:0;
cats.push({x,y,r,speed,hp,maxHp:hp,damageCooldown:0,hitAnim:0,wobble:Math.random()*Math.PI*2,color,rainbow,small,type:catType,yarnCooldown:1.2+Math.random()*1.1,stealCooldown:0,fleeTimer:0,spawnAnim:.32,maxSpawnAnim:.32,sleepState:catType==="sleepy"?"sleeping":null,wakeTimer:0,rushTimer:0,sleepAwakeDuration:0,baseSpeed:speed,zigzagPhase:Math.random()*Math.PI*2,studyTimer:0,studyLevel:initialStudyLevel,musicImmuneTimer:musicianImmune,stolenCoins:0,freezeTimer:0})
if(catType==="musician")musicianSpawnedThisWave=true;
showEnemyIntro(catType);
if(catType==="mini"){
  for(let pk=0;pk<3;pk++){
    const px=x+Math.cos(Math.random()*Math.PI*2)*65;const py=y+Math.sin(Math.random()*Math.PI*2)*65;
    cats.push({x:px,y:py,r:12,speed,hp:1,maxHp:1,damageCooldown:0,hitAnim:0,wobble:Math.random()*Math.PI*2,color:"#ffb347",rainbow:false,small:false,type:"mini",yarnCooldown:999,stealCooldown:0,fleeTimer:0,spawnAnim:.32,maxSpawnAnim:.32,sleepState:null,wakeTimer:0,rushTimer:0,sleepAwakeDuration:0,baseSpeed:speed,zigzagPhase:Math.random()*Math.PI*2,studyTimer:0,studyLevel:0,musicImmuneTimer:0,stolenCoins:0,freezeTimer:0});
    makeSpawnPuff(px,py,"#ffb347");
  }
}
const spawnColor=catType==="thief"?"#ffd166":catType==="yarn"?"#b197fc":catType==="mini"?"#ffb347":catType==="sleepy"?"#c8b6e2":catType==="glutton"?"#e8956d":catType==="musician"?"#d084c8":catType==="student"?"#74b9ff":"#ffc2d1";
makeSpawnPuff(x,y,spawnColor)
}

function dropCoins(x,y,chance=.013){
if(hasDoneFusionPair("catSlow+coinMagnet"))chance*=1.75;
if(Math.random()>chance)return;
const amount=1;
if(runStats)runStats.coinsGenerated+=amount;
coinsDrops.push({x,y,r:10,amount,life:18})
}

function damageBoss(amount){
if(!boss)return;
const real=boss.type==="seal"&&boss.state!=="stunned"?amount*.35:amount;
if(runStats)runStats.bossDamage+=real;
boss.hp-=real;boss.hitAnim=.15;
makeImpact(boss.x,boss.y,boss.type==="demon"?"#ff4d8d":"#ffd166",1.35);addScreenShake(boss.type==="demon"?5:3);playImpactSound();
if(upgrades.lifeSteal>0)life=Math.min(upgrades.maxLife,life+real*upgrades.lifeSteal);
if(boss.hp<=0){
const defeatedType=boss.type;
makeSmoke(boss.x,boss.y);
playSoftPop();
dropCoins(boss.x,boss.y,1);

if(defeatedType==="demon"){
demonOrbs.length=0;
if(dogKidnapped){
dogKidnapped=false;
floatingTexts.push({x:boss.x,y:boss.y-80,text:"🐶 ¡Has recuperado a tu perro!",life:2,maxLife:2,big:true});
}else if(dogSacrificeUsed){
upgrades.boyfriendDog=true;
upgrades.boyfriendDogSpirit=false;
upgrades.boyfriendDogReturned=true;
dogSacrificeUsed=false;
floatingTexts.push({x:boss.x,y:boss.y-100,text:"🐶 Te dije que seguiría contigo...",life:2.6,maxLife:2.6,big:true});
floatingTexts.push({x:boss.x,y:boss.y-58,text:"💖 ¡El perro ha vuelto!",life:2,maxLife:2,big:false});
}else{
floatingTexts.push({x:boss.x,y:boss.y-80,text:"😈 ¡Has derrotado al demonio!",life:2,maxLife:2,big:true});
}
}else{
floatingTexts.push({x:boss.x,y:boss.y-70,text:"¡Jefe mimado!",life:1.3,maxLife:1.3,big:true});
}

score+=5;
grantFullLevel();
shopBossPending=true;
defeatedBossTypes.add(defeatedType);
boss=null;
collectAllMapLootAfterBoss();
cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});
const allBossTypes=["giantCat","duck","seal","demon"];
if(allBossTypes.every(t=>defeatedBossTypes.has(t))&&victoryPanel&&!gameOver&&!bossVictoryAlreadyShown){
  shopBossPending=false;
  shopAvailable=true;
  showBossVictoryPanel();
}else{
  maybeOpenShopOrFusion();
}
}
}

function isZoomiesActive(){
if(!upgrades.zoomies)return false;
const now=performance.now()/1000;
const period=upgrades.zoomiesHyper?5.2:7.2;
const active=upgrades.zoomiesHyper?2.35:1.65;
return (now%period)<active;
}
function getZoomiesMoveMultiplier(){return isZoomiesActive()?(upgrades.zoomiesHyper?1.85:1.45):1}
function getZoomiesFireMultiplier(){return isZoomiesActive()?(upgrades.zoomiesCannon?2.05:1.45):1}
function getCurrentCritChance(){const comboCap=(upgrades.autoFire&&upgrades.aimAssist&&upgrades.pierceChance>.55)?0.72:0.92;return Math.min(comboCap,upgrades.critChance+((isZoomiesActive()&&upgrades.zoomiesCrit)?0.22:0))}
function getHoldShootMultiplier(){
  if(!upgrades.holdShoot)return 1;
  const autoLvl=Math.max(1,effectLevel("autoFire"));
  return 1+Math.min(.35,autoLvl*.035);
}


function hasFishSizeFusionForGiantFish(){
return !!doneFusionPairs[sortedPair("bigFish","fishSize")];
}


function hasCardumenGiganteFusion(){
return !!doneFusionPairs[sortedPair("bigFish","doubleFish")];
}

function shootFish(fromHold=false){
const now=performance.now();
let delay=210/(upgrades.fireRate*getZoomiesFireMultiplier());
if(fromHold&&upgrades.holdShoot)delay/=getHoldShootMultiplier();
if(now-lastShot<delay)return;
lastShot=now;shots++;if(runStats)runStats.shotsFired++;player.shootAnim=.12;
const angle=Math.atan2(mouse.y-player.y,mouse.x-player.x),giantFishEasterEgg=giantFishEasterEggsUsed<1&&hasFishSizeFusionForGiantFish()&&Math.random()<0.00001,isBigFish=giantFishEasterEgg||Math.random()<upgrades.bigFishChance,fishScale=upgrades.fishSize*(giantFishEasterEgg?7.5:(isBigFish?1.65:1)),lowLifeBonus=(life<upgrades.maxLife*.35?(upgrades.braveHeart?0.35:0)+(upgrades.cursedInstinct?0.45:0):0),fishDamage=upgrades.damage*(1+lowLifeBonus)*(giantFishEasterEgg?35:(isBigFish?2.1:1)),canPierce=giantFishEasterEgg||Math.random()<upgrades.pierceChance,boomerang=!giantFishEasterEgg&&Math.random()<upgrades.boomerangChance;
function addFish(offsetAngle=0){
const finalAngle=angle+offsetAngle;
const boomerangLvl=effectLevel("boomerang");
const boomerangRangeBonus=boomerang?1+boomerangLvl*.08:1;
const critRoll=Math.random()<getCurrentCritChance();
fishes.push({x:player.x+Math.cos(finalAngle)*62,y:player.y+Math.sin(finalAngle)*62,vx:Math.cos(finalAngle)*610*upgrades.fishSpeed*boomerangRangeBonus,vy:Math.sin(finalAngle)*610*upgrades.fishSpeed*boomerangRangeBonus,angle:finalAngle,damage:fishDamage*(critRoll?((upgrades.autoFire&&upgrades.aimAssist)?1.75:2):1),life:giantFishEasterEgg?2.2:(boomerang?3.35+boomerangLvl*.18:1.45),scale:fishScale,pierce:canPierce,boomerang,crit:critRoll&&!boomerang,giantEaster:giantFishEasterEgg,returning:false,age:0,turnTime:boomerang?0.95+boomerangLvl*.06:0,hitIds:new Set()})
}
function addCardumenGiganteFish(offsetAngle){
const finalAngle=angle+offsetAngle;
const critRoll=Math.random()<getCurrentCritChance();
fishes.push({x:player.x+Math.cos(finalAngle)*66,y:player.y+Math.sin(finalAngle)*66,vx:Math.cos(finalAngle)*585*upgrades.fishSpeed,vy:Math.sin(finalAngle)*585*upgrades.fishSpeed,angle:finalAngle,damage:upgrades.damage*2.4*(critRoll?1.7:1),life:1.55,scale:Math.max(upgrades.fishSize*2.15,2.05),pierce:Math.random()<Math.max(.15,upgrades.pierceChance*.55),boomerang:false,crit:critRoll,cardumenGigante:true,returning:false,age:0,turnTime:0,hitIds:new Set()})
}
addFish();
if(giantFishEasterEgg){
  giantFishEasterEggsUsed++;
  floatingTexts.push({x:player.x,y:player.y-92,text:"🐟 PEZ GIGANTE",life:1.8,maxLife:1.8,big:true});
  shockwaves.push({x:player.x,y:player.y,r:10,maxR:180,life:.65,maxLife:.65,color:"#4cc9f0",line:7});
  addScreenShake(10);
}
if(!giantFishEasterEgg&&Math.random()<upgrades.doubleFishChance){addFish(.14);addFish(-.14)}
if(!giantFishEasterEgg&&hasCardumenGiganteFusion()&&Math.random()<Math.min(.34,.16+effectLevel("bigFish")*.018+effectLevel("doubleFish")*.018)){
  addCardumenGiganteFish(.32);
  addCardumenGiganteFish(-.32);
  floatingTexts.push({x:player.x,y:player.y-82,text:"🐟🐟 Cardumen Gigante",life:1.05,maxLife:1.05,big:false});
  if(!lowPerfMode)shockwaves.push({x:player.x,y:player.y,r:8,maxR:95,life:.35,maxLife:.35,color:"#4cc9f0",line:4});
}
if(!lowPerfMode||Math.random()<.35)pawPrints.push({x:player.x+Math.cos(angle)*38,y:player.y+Math.sin(angle)*38,angle,life:.22,maxLife:.22});
if(Math.random()<(lowPerfMode?.08:.18)){const phrases=["glugluglu","fiuuu","ñomñom","pez vaaa","blu blu","mimitos!"],phrase=phrases[Math.floor(Math.random()*phrases.length)];playFishSound(phrase.includes("fiu")?"fiu":"bloop");floatingTexts.push({x:player.x+Math.cos(angle)*58,y:player.y+Math.sin(angle)*58-14,text:phrase,life:.85,maxLife:.85,big:false})}
if(upgrades.moralSupport&&Math.random()<.16)floatingTexts.push({x:player.x+Math.cos(angle)*75,y:player.y+Math.sin(angle)*75-38,text:lovePhrases[Math.floor(Math.random()*lovePhrases.length)],life:1.45,maxLife:1.45,big:false})
}

function shootAutoFish(){
const now=performance.now();
let delay=520-Math.min(360,effectLevel("autoFire")*70);
if(upgrades.assistedShot)delay-=35;
if(upgrades.combatAI)delay-=55;
if(upgrades.moraleFire)delay-=45;
if(upgrades.braveHeart&&life<upgrades.maxLife*.35)delay-=70;
delay=Math.max(125,delay/((1+effectLevel("fireRate")*.04)*getZoomiesFireMultiplier()));
if(now-lastAutoShot<delay)return;
lastAutoShot=now;
let oldMouseX=mouse.x,oldMouseY=mouse.y;
if(upgrades.combatAI||upgrades.assistedShot){
const target=findNearestEnemy(player.x,player.y,upgrades.combatAI?99999:760);
if(target){mouse.x=target.x;mouse.y=target.y}
}
const saved=lastShot;lastShot=0;shootFish();lastShot=saved;
mouse.x=oldMouseX;mouse.y=oldMouseY
}

function shieldAttack(){
if(effectLevel("shield")<5)return;
if(Math.random()>.012)return;
let target=null,dist=Infinity;
cats.forEach(cat=>{if(!isFinitePos(cat))return;const d=Math.hypot(cat.x-player.x,cat.y-player.y);if(d<dist){dist=d;target=cat}});
if(boss){const d=Math.hypot(boss.x-player.x,boss.y-player.y);if(d<dist){dist=d;target=boss}}
if(!target)return;
const a=Math.atan2(target.y-player.y,target.x-player.x);
fishes.push({x:player.x+Math.cos(a)*56,y:player.y+Math.sin(a)*56,vx:Math.cos(a)*530,vy:Math.sin(a)*530,angle:a,damage:upgrades.damage*.75,life:1.2,scale:.85,pierce:false,boomerang:false,returning:false,age:0,hitIds:new Set(),shieldShot:true})
}

function applyAimAssist(fish){
const fixed=getSelectedTarget();
if((!upgrades.aimAssist&&!fish.shieldShot&&!upgrades.perfectAim&&!fixed)||cats.length===0&&!boss)return;
let nearest=null,nearestDist=Infinity;
if(fixed&&isFinitePos(fish)){
const d=Math.hypot(fixed.x-fish.x,fixed.y-fish.y);
if(d<1200){nearest=fixed;nearestDist=d}
}
if(!nearest){
cats.forEach(cat=>{if(!isFinitePos(cat)||!isFinitePos(fish))return;const d=Math.hypot(cat.x-fish.x,cat.y-fish.y);if(d<nearestDist){nearestDist=d;nearest=cat}});
if(boss){const d=Math.hypot(boss.x-fish.x,boss.y-fish.y);if(d<nearestDist){nearestDist=d;nearest=boss}}
}
const assistRange=fixed?1200:(upgrades.perfectAim?720:(upgrades.combatAI?520:380));
if(nearest&&nearestDist<assistRange){
const desiredAngle=Math.atan2(nearest.y-fish.y,nearest.x-fish.x),currentAngle=Math.atan2(fish.vy,fish.vx);
let diff=desiredAngle-currentAngle;
while(diff>Math.PI)diff-=Math.PI*2;
while(diff<-Math.PI)diff+=Math.PI*2;
const turnStrength=fixed?.14:(upgrades.perfectAim?.145:(upgrades.combatAI?.075:(fish.shieldShot?.075:.05)));
const newAngle=currentAngle+diff*turnStrength,speed=Math.hypot(fish.vx,fish.vy);
fish.vx=Math.cos(newAngle)*speed;fish.vy=Math.sin(newAngle)*speed;fish.angle=newAngle
}
}

function limitArray(array,maxItems){if(array.length>maxItems)array.splice(0,array.length-maxItems)}
function makeHearts(x,y){
  const q=getEffectQuality();
  const count=Math.max(2,Math.round(8*q));
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;hearts.push({x,y,vx:Math.cos(a)*(35+Math.random()*75*q),vy:Math.sin(a)*(35+Math.random()*75*q)-50,life:.75+.25*q,maxLife:1,size:12+Math.random()*8})}
}
function makeSmoke(x,y){
  const q=getEffectQuality();
  const count=Math.max(4,Math.round(18*q));
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;smokes.push({x,y,vx:Math.cos(a)*(30+Math.random()*105*q),vy:Math.sin(a)*(30+Math.random()*105*q),life:.55+Math.random()*.35,maxLife:1.1,size:10+Math.random()*16})}
}

function addScreenShake(amount){screenShake=Math.min(18,Math.max(screenShake||0,amount||4))}
function makeImpact(x,y,color="#ffd166",power=1){
  const q=getEffectQuality();
  if(!lowPerfMode||Math.random()<.55)shockwaves.push({x,y,r:5,maxR:28+power*17,life:.18+power*.045,maxLife:.25+power*.045,color,line:3+power});
  const count=Math.max(2,Math.round((10+Math.floor(power*5))*q));
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,sp=70+Math.random()*180*power*q;
    sparkles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,size:2.2+Math.random()*3,life:.22+Math.random()*.26,maxLife:.55,color});
  }
}
function makeSpawnPuff(x,y,color="#ffc2d1"){
  const q=getEffectQuality();
  if(!lowPerfMode)shockwaves.push({x,y,r:4,maxR:30,life:.26,maxLife:.3,color,line:3});
  const count=Math.max(1,Math.round(7*q));
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,sp=30+Math.random()*65*q;
    sparkles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,size:2+Math.random()*2.5,life:.28+Math.random()*.18,maxLife:.52,color});
  }
}
function playImpactSound(){
  try{const ac=getAudioCtx(),o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.setValueAtTime(520,ac.currentTime);o.frequency.exponentialRampToValueAtTime(190,ac.currentTime+.09);g.gain.setValueAtTime(.018,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.1);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.11)}catch(e){}
}
function playDemonShotSound(){
  try{const ac=getAudioCtx(),o=ac.createOscillator(),g=ac.createGain();o.type="sawtooth";o.frequency.setValueAtTime(120,ac.currentTime);o.frequency.exponentialRampToValueAtTime(55,ac.currentTime+.22);g.gain.setValueAtTime(.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.25);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.27)}catch(e){}
}

function makeQuack(){
if(!boss||boss.type!=="duck")return;
const angle=Math.atan2(player.y-boss.y,player.x-boss.x),speed=boss.quackSpeed||190+wave*8,word=Math.random()<.5?"QUACK!":"QUACK?";
quacks.push({x:boss.x+Math.cos(angle)*65,y:boss.y+Math.sin(angle)*65,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:24,life:4,text:word,hp:2+Math.floor(wave/10)})
}

function startSealJump(){
if(!boss||boss.type!=="seal")return;
const margin=70;
const tx=Math.max(margin,Math.min(canvas.width-margin,player.x));
const ty=Math.max(margin,Math.min(canvas.height-margin,player.y));
boss.state="jumping";
boss.jumpDuration=Math.max(1.05,(boss.baseJumpDuration||1.05)+.55+Math.random()*.22);
boss.jumpTimer=boss.jumpDuration;boss.startX=boss.x;boss.startY=boss.y;boss.targetX=tx;boss.targetY=ty;boss.shadowX=tx;boss.shadowY=ty
}

function updateBoss(dt){
if(!boss)return;
boss.hitAnim=Math.max(0,boss.hitAnim-dt);
boss.relaxTimer=Math.max(0,(boss.relaxTimer||0)-dt);
if(boss.relaxTimer>0){boss.hitAnim=Math.max(boss.hitAnim,.12);return;}
boss.wobble+=dt*4;
if(boss.knockVx||boss.knockVy){boss.x+=(boss.knockVx||0)*dt;boss.y+=(boss.knockVy||0)*dt;boss.knockVx=(boss.knockVx||0)*Math.pow(.12,dt);boss.knockVy=(boss.knockVy||0)*Math.pow(.12,dt);if(Math.abs(boss.knockVx)<8)boss.knockVx=0;if(Math.abs(boss.knockVy)<8)boss.knockVy=0;}
if(boss.type==="giantCat"){
const dx=player.x-boss.x,dy=player.y-boss.y,dist=Math.hypot(dx,dy)||1;
boss.x+=(dx/dist)*boss.speed*dt;boss.y+=(dy/dist)*boss.speed*dt;boss.summon-=dt;
if(boss.summon<=0&&isCatOnScreen(boss)){boss.summon=boss.baseSummon||Math.max(.55,2.15-wave*.07);for(let i=0;i<(boss.summonCount||2);i++)spawnCat(boss.x+(Math.random()*110-55),boss.y+(Math.random()*110-55),true)}else if(boss.summon<=0){boss.summon=Math.max(.32,boss.baseSummon||Math.max(.55,2.15-wave*.07));}
if(dist<player.r+boss.r-8){takePlayerDamage((boss.contactDamage||18)*dt,"El jefe te ha llenado de mimos 🐱",.1)}
}else if(boss.type==="duck"){
boss.shoot-=dt;
if(boss.shoot<=0){boss.shoot=boss.baseShoot||Math.max(.42,1.25-wave*.045);for(let i=0;i<(boss.burst||1);i++)setTimeout(()=>{if(boss&&boss.type==="duck")makeQuack()},i*130);floatingTexts.push({x:boss.x,y:boss.y-70,text:Math.random()<.5?"QUACK!":"QUACK?",life:.7,maxLife:.7,big:false})}
}else if(boss.type==="seal"){
if(boss.state==="jumping"){
boss.jumpTimer-=dt;
const p=1-Math.max(0,boss.jumpTimer/boss.jumpDuration);
boss.x=boss.startX+(boss.targetX-boss.startX)*p;
boss.y=boss.startY+(boss.targetY-boss.startY)*p-Math.sin(p*Math.PI)*140;
if(boss.jumpTimer<=0){
boss.x=boss.targetX;boss.y=boss.targetY;makeSmoke(boss.x,boss.y);
if(Math.hypot(player.x-boss.x,player.y-boss.y)<boss.r+player.r+38){takePlayerDamage((boss.slamDamage||18),"La foca ha caído encima de ti 🦭",.2)}
boss.jumps++;
if(boss.jumps>=boss.jumpsBeforeRest){
boss.state="stunned";boss.stunTimer=boss.stunDuration||2.4;boss.jumps=0;boss.jumpsBeforeRest=Math.max(2,5-Math.floor(wave/15)+(boss.repeatLevel||0));boss.hp-=Math.max(4,boss.maxHp*.055);floatingTexts.push({x:boss.x,y:boss.y-boss.r-25,text:"La foca se ha mareado",life:1.4,maxLife:1.4,big:false})
}else startSealJump()
}
}else{
boss.stunTimer-=dt;
if(boss.stunTimer<=0)startSealJump()
}
}
else if(boss.type==="demon"){
boss.wobble+=dt*2.8;

const targetX=player.x+Math.cos(boss.wobble)*230;
const targetY=player.y+Math.sin(boss.wobble*.8)*150-80;
const dx=targetX-boss.x;
const dy=targetY-boss.y;
const d=Math.hypot(dx,dy)||1;

boss.x+=(dx/d)*boss.speed*dt;
boss.y+=(dy/d)*boss.speed*dt;
boss.x=Math.max(90,Math.min(canvas.width-90,boss.x));
boss.y=Math.max(90,Math.min(canvas.height-90,boss.y));

boss.shoot-=dt;
if(boss.shoot<=0){
boss.shoot=boss.baseShoot;
const count=boss.circleCount||12;
const offset=Math.random()*Math.PI*2;
for(let i=0;i<count;i++){
const a=offset+i*Math.PI*2/count;
demonOrbs.push({
x:boss.x,
y:boss.y,
vx:Math.cos(a)*boss.orbSpeed,
vy:Math.sin(a)*boss.orbSpeed,
r:13,
life:5,
damage:16+wave*.45
});
}
floatingTexts.push({x:boss.x,y:boss.y-boss.r-32,text:"círculo oscuro",life:.8,maxLife:.8,big:false});
shockwaves.push({x:boss.x,y:boss.y,r:8,maxR:boss.r+90,life:.45,maxLife:.45,color:"#ff4d8d",line:6});
makeImpact(boss.x,boss.y,"#9b5de5",1.2);
addScreenShake(6);
playDemonShotSound();
}

if(Math.hypot(player.x-boss.x,player.y-boss.y)<player.r+boss.r-8){
takePlayerDamage(boss.contactDamage*dt,"El demonio oscuro te ha atrapado 😈",.15);
}
}
}

function triggerDogSacrifice(){
if(!upgrades.boyfriendDog||dogKidnapped||dogSacrificeUsed||gameOver)return false;
dogSacrificeUsed=true;
upgrades.boyfriendDog=false;
upgrades.boyfriendDogSpirit=true;
dogBones.length=0;
life=upgrades.maxLife;
player.hurtAnim=0;
makeSmoke(player.x,player.y);
makeHearts(player.x,player.y);
activateDogRescueRelax();
messageEl.classList.add("dogSave");
messageEl.innerHTML=`🐶 Daria mi vida por ti<br><small>Aun en el mas allá te seguiré cuidando</small>`;
messageEl.style.display="block";
setTimeout(()=>{if(!gameOver){messageEl.style.display="none";messageEl.classList.remove("dogSave")}},2100);
return true;
}

function endGame(text){
if(triggerDogSacrifice())return;
stopPowerStarLoop();
life=0;gameOver=true;
showGameOverScreen();
}

function updateShield(dt){
if(!upgrades.shield)return;
const shieldLvl=effectLevel("shield");
shieldAngle+=dt*(2.2+shieldLvl*.18);
shieldAttack();
const now=performance.now();
if(now-lastShieldHit<160)return;
const shieldR=52+shieldLvl*4,orbs=2+Math.min(4,shieldLvl),orbSize=12+Math.min(12,shieldLvl*1.7);
for(let i=0;i<orbs;i++){
const a=shieldAngle+i*Math.PI*2/orbs,ox=player.x+Math.cos(a)*shieldR,oy=player.y+Math.sin(a)*shieldR;
for(let c=cats.length-1;c>=0;c--){
const cat=cats[c];if(!isFinitePos(cat))continue;const d=Math.hypot(cat.x-ox,cat.y-oy);
if(d<cat.r+orbSize){
cat.hp-=1+shieldLvl*.95;cat.hitAnim=.15;makeHearts(cat.x,cat.y);if(hasDoneFusionPair("lifeSteal+shield"))life=Math.min(upgrades.maxLife,life+Math.max(.35,shieldLvl*.45));lastShieldHit=now;
if(cat.hp<=0)killCat(c,cat);
return
}
}
for(let q=quacks.length-1;q>=0;q--){
const quack=quacks[q],d=Math.hypot(quack.x-ox,quack.y-oy);
if(d<quack.r+orbSize){makeSmoke(quack.x,quack.y);quacks.splice(q,1);lastShieldHit=now;return}
}
}
}

function teleportThiefCat(cat){
if(!cat||!isFinitePos(cat))return;
const oldX=cat.x,oldY=cat.y;
makeSmoke(oldX,oldY);
const margin=80;
let nx=oldX,ny=oldY;
for(let tries=0;tries<12;tries++){
  nx=margin+Math.random()*Math.max(1,canvas.width-margin*2);
  ny=margin+Math.random()*Math.max(1,canvas.height-margin*2);
  if(Math.hypot(nx-player.x,ny-player.y)>260)break;
}
cat.x=nx;cat.y=ny;cat.fleeTimer=Math.max(cat.fleeTimer||0,1.15);cat.damageCooldown=Math.max(cat.damageCooldown||0,.25);
makeSpawnPuff(cat.x,cat.y,"#ffd166");
floatingTexts.push({x:cat.x,y:cat.y-36,text:"¡puf!",life:.75,maxLife:.75,big:false});
}

function explodeYarnCat(cat){
if(!cat||!isFinitePos(cat))return;
const count=10+Math.min(10,Math.floor(wave/6));
const speed=155+wave*4;
for(let i=0;i<count;i++){
  const a=(Math.PI*2/count)*i+Math.random()*.12;
  yarnBalls.push({x:cat.x+Math.cos(a)*cat.r,y:cat.y+Math.sin(a)*cat.r,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:12,life:3.4,damage:6+wave*.2,spin:0,deathBurst:true});
}
shockwaves.push({x:cat.x,y:cat.y,r:8,maxR:90,life:.42,maxLife:.42,color:"#b197fc",line:5});
makeImpact(cat.x,cat.y,"#b197fc",1.1);
floatingTexts.push({x:cat.x,y:cat.y-52,text:"¡explosión de lana!",life:1,maxLife:1,big:false});
}

function killCat(index,cat=null){
if(!cat)cat=cats[index];
if(!cat||cat.dead)return;
const realIndex=cats.indexOf(cat);
if(realIndex!==-1)index=realIndex;
if(index<0||index>=cats.length||cats[index]!==cat)return;
cat.dead=true;
dropRecoveredStolenCoins(cat);
if(cat.type==="yarn")explodeYarnCat(cat);
if(cat.type==="glutton"){const tunaCount=2+Math.floor(Math.random()*2);for(let t=0;t<tunaCount;t++){tunaDrops.push({x:cat.x+(Math.random()*44-22),y:cat.y+(Math.random()*44-22),r:16,life:16,wobble:0});floatingTexts.push({x:cat.x,y:cat.y-38-t*18,text:"🐟 ¡Lata!",life:1.0,maxLife:1.0,big:false});}}
if(cat.type==="mini")gainXP(2+Math.floor(wave/3));
if(cat.type==="student"&&(cat.studyLevel||0)>0)gainXP((cat.studyLevel||0));
score++;if(runStats)runStats.kills++;gainXP(1+Math.floor(wave/4));makeSmoke(cat.x,cat.y);playSoftPop();dropCoins(cat.x,cat.y,cat.rainbow?.25:.013);if(!cat.rainbow&&Math.random()<(!cat.type?.22:.10))tunaDrops.push({x:cat.x,y:cat.y+(Math.random()*20-10),r:16,life:16,wobble:0});floatingTexts.push({x:cat.x,y:cat.y-38,text:"🐟 ¡Lata!",life:1.0,maxLife:1.0,big:false});
if(cat.rainbow){rainbowChanceLevel=1;rainbowPendingUntilKilled=false;rainbowSelectedThisWave=false;floatingTexts.push({x:cat.x,y:cat.y-35,text:"🌈 Gatito arcoíris",life:1.2,maxLife:1.2,big:false});openRainbowLowestMenu()}
else floatingTexts.push({x:cat.x,y:cat.y-30,text:"miau~",life:.8,maxLife:.8,big:false});
if(cats[index]===cat)cats.splice(index,1);
else{const i=cats.indexOf(cat);if(i!==-1)cats.splice(i,1)}
maybeOpenShopOrFusion()
}



function getYarnTargetId(target){
if(!target)return null;
if(!target.yarnTargetId)target.yarnTargetId=yarnTargetCounter++;
return target.yarnTargetId;
}

function spawnYarnBounce(sourceX,sourceY,currentTargetId=null,visitedIds=[]){
const chance=Math.min(1,effectLevel("yarnBounce")*.13);
if(chance<=0||Math.random()>chance)return false;

// Cada rebote recuerda TODOS los enemigos tocados por esa cadena.
// Así no puede quedarse rebotando infinitamente contra un jefe o el mismo gato.
const visited=new Set(Array.isArray(visitedIds)?visitedIds:[]);
if(currentTargetId!==null&&currentTargetId!==undefined)visited.add(currentTargetId);

let target=null,best=430;

cats.forEach(c=>{
if(!isFinitePos(c)||c.dead)return;
const id=getYarnTargetId(c);
if(visited.has(id))return;
const d=Math.hypot(c.x-sourceX,c.y-sourceY);
if(d<best){best=d;target=c}
});

if(boss&&isFinitePos(boss)){
const id=getYarnTargetId(boss);
if(!visited.has(id)){
const d=Math.hypot(boss.x-sourceX,boss.y-sourceY);
if(d<best){best=d;target=boss}
}
}

if(!target)return false;
const targetId=getYarnTargetId(target);
const newVisited=[...visited,targetId];
const a=Math.atan2(target.y-sourceY,target.x-sourceX);
fishes.push({
x:sourceX+Math.cos(a)*22,
y:sourceY+Math.sin(a)*22,
vx:Math.cos(a)*560*upgrades.fishSpeed,
vy:Math.sin(a)*560*upgrades.fishSpeed,
angle:a,
damage:Math.max(.5,upgrades.damage*.65),
life:1.05,
scale:Math.max(.75,upgrades.fishSize*.78),
pierce:false,
boomerang:false,
yarnBounceShot:true,
yarnVisitedIds:newVisited
});
floatingTexts.push({x:sourceX,y:sourceY-24,text:"rebote 🧶",life:.55,maxLife:.55,big:false});
return true;
}

function shootOmniBurst(){
const lvl=effectLevel("omniBurst");
if(lvl<=0)return;
const count=10+Math.min(14,lvl*2);
const baseDamage=upgrades.damage*.72;
const fishScale=upgrades.fishSize*.82;
const burstSpeed=520*upgrades.fishSpeed*(hasDoneFusionPair("fishSpeed+omniBurst")?1.35:1);
for(let i=0;i<count;i++){
const a=(Math.PI*2/count)*i+Math.random()*.08;
fishes.push({
x:player.x+Math.cos(a)*52,
y:player.y+Math.sin(a)*52,
vx:Math.cos(a)*burstSpeed,
vy:Math.sin(a)*burstSpeed,
angle:a,
damage:baseDamage,
life:1.05,
scale:fishScale,
pierce:Math.random()<upgrades.pierceChance*.55,
boomerang:false
});
}
makeSmoke(player.x,player.y);
if(hasDoneFusionPair("omniBurst+xpBoost"))gainXP(1+Math.floor(lvl/3));
floatingTexts.push({x:player.x,y:player.y-70,text:"💥 ¡Ráfaga gatuna!",life:1.05,maxLife:1.05,big:false});
}

function updateOmniBurst(){
const lvl=effectLevel("omniBurst");
if(lvl<=0)return;
const now=performance.now();
const cooldown=Math.max(3200,9000/(1+lvl*.13));
if(now-lastOmniBurst>=cooldown){
lastOmniBurst=now;
shootOmniBurst();
}
}



function isTargetAlive(target){
if(!target)return false;
if(target===boss)return !!boss&&isFinitePos(boss)&&boss.hp>0;
return cats.includes(target)&&isFinitePos(target)&&!target.dead&&target.hp>0;
}

function getSelectedTarget(){
if(isTargetAlive(selectedTarget))return selectedTarget;
selectedTarget=null;
return null;
}

function selectTargetAt(x,y){
let target=null;
let best=Infinity;
if(boss&&isFinitePos(boss)){
const d=Math.hypot(x-boss.x,y-boss.y);
if(d<boss.r+26){target=boss;best=d}
}
cats.forEach(cat=>{
if(!isFinitePos(cat)||cat.dead)return;
const d=Math.hypot(x-cat.x,y-cat.y);
if(d<cat.r+22&&d<best){target=cat;best=d}
});
selectedTarget=target;
floatingTexts.push({x:x,y:y-28,text:target?"🎯 Objetivo fijado":"Objetivo quitado",life:1,maxLife:1,big:false});
}

function drawTargetMarker(target){
if(!isTargetAlive(target))return;
const t=performance.now()/180;
ctx.save();
ctx.globalAlpha=.9;
ctx.strokeStyle="#70e000";
ctx.lineWidth=4;
ctx.shadowColor="#70e000";
ctx.shadowBlur=15;
ctx.beginPath();
ctx.arc(target.x,target.y,(target.r||24)+12+Math.sin(t)*3,0,Math.PI*2);
ctx.stroke();
ctx.strokeStyle="#ffffff";
ctx.lineWidth=2;
ctx.beginPath();
ctx.moveTo(target.x-10,target.y);ctx.lineTo(target.x+10,target.y);
ctx.moveTo(target.x,target.y-10);ctx.lineTo(target.x,target.y+10);
ctx.stroke();
ctx.restore();
}

function findNearestEnemy(x,y,range=520){
const fixed=getSelectedTarget();
if(fixed){
const d=Math.hypot(fixed.x-x,fixed.y-y);
if(d<range*2.2)return fixed;
}
let best=null,bestD=range;
cats.forEach(c=>{
if(!isFinitePos(c))return;
const d=Math.hypot(c.x-x,c.y-y);
if(d<bestD){best=c;bestD=d}
});
if(boss&&isFinitePos(boss)){
const d=Math.hypot(boss.x-x,boss.y-y);
if(d<bestD){best=boss;bestD=d}
}
return best
}

function updateDog(dt){
if(!upgrades.boyfriendDog||dogKidnapped)return;
dogCompanion.wag+=dt*10;
const targetX=player.x-45-Math.cos(player.angle)*20;
const targetY=player.y+45-Math.sin(player.angle)*20;
const dx=targetX-dogCompanion.x,dy=targetY-dogCompanion.y;
dogCompanion.x+=dx*Math.min(1,dt*5);
dogCompanion.y+=dy*Math.min(1,dt*5);
dogCompanion.shootCooldown-=dt;
const enemy=findNearestEnemy(dogCompanion.x,dogCompanion.y,560);
if(enemy&&dogCompanion.shootCooldown<=0){
const a=Math.atan2(enemy.y-dogCompanion.y,enemy.x-dogCompanion.x);
dogBones.push({x:dogCompanion.x+Math.cos(a)*18,y:dogCompanion.y+Math.sin(a)*18,vx:Math.cos(a)*460,vy:Math.sin(a)*460,angle:a,life:1.4,damage:Math.max(.8,upgrades.damage*.55)});
dogCompanion.shootCooldown=.75;
floatingTexts.push({x:dogCompanion.x,y:dogCompanion.y-28,text:"guau!",life:.55,maxLife:.55,big:false})
}
for(let i=dogBones.length-1;i>=0;i--){
const b=dogBones[i];
if(!isFinitePos(b)){dogBones.splice(i,1);continue}
b.x+=(Number.isFinite(b.vx)?b.vx:0)*dt;b.y+=(Number.isFinite(b.vy)?b.vy:0)*dt;b.life-=dt;
let hit=false;
for(let j=cats.length-1;j>=0;j--){
const c=cats[j];
if(!isFinitePos(c)||!isFinitePos(b)||!isCatOnScreen(c))continue;
if(Math.hypot(c.x-b.x,c.y-b.y)<c.r+8){
c.hp-=b.damage;c.hitAnim=.12;makeHearts(c.x,c.y);hit=true;
if(c.hp<=0)killCat(j,c);
break
}
}
if(!hit&&boss&&Math.hypot(boss.x-b.x,boss.y-b.y)<boss.r+8){
damageBoss(b.damage);hit=true
}
if(hit||b.life<=0||b.x<-80||b.x>canvas.width+80||b.y<-80||b.y>canvas.height+80)dogBones.splice(i,1)
}
}

function drawDog(){
if(!upgrades.boyfriendDog||dogKidnapped)return;
ctx.save();
ctx.translate(dogCompanion.x,dogCompanion.y);
const bob=Math.sin(dogCompanion.wag)*2;
ctx.fillStyle="#f4c28b";
ctx.beginPath();
ctx.ellipse(0,bob,18,13,0,0,Math.PI*2);
ctx.fill();
ctx.fillStyle="#8d5524";
ctx.beginPath();
ctx.arc(-7,-9+bob,6,0,Math.PI*2);
ctx.arc(8,-9+bob,6,0,Math.PI*2);
ctx.fill();
ctx.fillStyle="#f4c28b";
ctx.beginPath();
ctx.arc(0,-3+bob,15,0,Math.PI*2);
ctx.fill();
ctx.fillStyle="#2b133f";
ctx.beginPath();
ctx.arc(-5,-5+bob,2,0,Math.PI*2);
ctx.arc(6,-5+bob,2,0,Math.PI*2);
ctx.fill();
ctx.strokeStyle="#8d5524";
ctx.lineWidth=3;
ctx.beginPath();
ctx.moveTo(-17,2+bob);
ctx.quadraticCurveTo(-30,-8+bob,-20,-16+bob);
ctx.stroke();
ctx.fillStyle="#ff7aa8";
ctx.beginPath();
ctx.arc(0,2+bob,3,0,Math.PI*2);
ctx.fill();
ctx.restore()
}

function drawDogBone(b){
ctx.save();
ctx.translate(b.x,b.y);
ctx.rotate(b.angle);
ctx.strokeStyle="#fff3d6";
ctx.lineWidth=5;
ctx.lineCap="round";
ctx.beginPath();
ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.stroke();
ctx.fillStyle="#fff3d6";
[[-12,-4],[-12,4],[12,-4],[12,4]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],4,0,Math.PI*2);ctx.fill()});
ctx.restore()
}


function getCatInstinctMagnetRange(){
  const pair="catInstinct+coinMagnet";
  if(!hasDoneFusionPair(pair))return 0;
  const fusionLvl=getFusionProgress(pair);
  const magnetLvl=effectLevel("coinMagnet");
  return 260+fusionLvl*120+Math.min(220,magnetLvl*24);
}
function pullResourcesWithCatInstinct(){
  const range=getCatInstinctMagnetRange();
  if(range<=0)return;
  const fusionLvl=getFusionProgress("catInstinct+coinMagnet");
  const items=[...coinsDrops,...tunaDrops];
  let pulled=0;
  items.forEach(item=>{
    if(!item||!isFinitePos(item))return;
    const dx=player.x-item.x,dy=player.y-item.y,d=Math.hypot(dx,dy)||1;
    if(d>range)return;
    const closeness=1-Math.min(1,d/range);
    const pull=Math.min(.9,.38+fusionLvl*.08+closeness*.25);
    item.x+=dx*pull;
    item.y+=dy*pull;
    pulled++;
  });
  if(pulled>0){
    floatingTexts.push({x:player.x,y:player.y-126,text:`🧲 Instinto recolector`,life:1.15,maxLife:1.15,big:false});
    shockwaves.push({x:player.x,y:player.y,r:6,maxR:Math.min(range*.55,420),life:.65,maxLife:.65,color:"#4cc9f0",line:3});
  }
}

function getNearestCombatTargetFrom(x,y,maxDist=900){
  let target=null,best=maxDist;
  cats.forEach(cat=>{if(!isFinitePos(cat)||cat.dead)return;const d=Math.hypot(cat.x-x,cat.y-y);if(d<best){best=d;target=cat;}});
  if(boss&&isFinitePos(boss)&&boss.hp>0){const d=Math.hypot(boss.x-x,boss.y-y);if(d<best){best=d;target=boss;}}
  return target;
}
function redirectBoomerangsWithCatInstinct(){
  const pair="boomerang+catInstinct";
  if(!hasDoneFusionPair(pair))return;
  const lvl=getFusionProgress(pair);
  let count=0;
  fishes.forEach(fish=>{
    if(!fish||!fish.boomerang||!isFinitePos(fish))return;
    const target=getNearestCombatTargetFrom(fish.x,fish.y,680+lvl*90);
    if(!target)return;
    const a=Math.atan2(target.y-fish.y,target.x-fish.x);
    const speed=Math.max(560,Math.hypot(fish.vx,fish.vy))*(1+.03*lvl);
    fish.vx=Math.cos(a)*speed;
    fish.vy=Math.sin(a)*speed;
    fish.angle=a;
    fish.returning=false;
    fish.life=Math.max(fish.life,1.0+lvl*.22);
    fish.pierce=true;
    count++;
  });
  if(count>0)floatingTexts.push({x:player.x,y:player.y-140,text:"🪃 Reflejo circular",life:1.05,maxLife:1.05,big:false});
}
function shootCatInstinctBurst(){
  const pair="catInstinct+omniBurst";
  if(!hasDoneFusionPair(pair))return;
  const lvl=getFusionProgress(pair);
  const count=8+lvl*3;
  const speed=500*upgrades.fishSpeed*(1+lvl*.035);
  for(let i=0;i<count;i++){
    const a=(Math.PI*2/count)*i+Math.random()*.05;
    fishes.push({x:player.x+Math.cos(a)*50,y:player.y+Math.sin(a)*50,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,angle:a,damage:Math.max(.75,upgrades.damage*(.62+lvl*.06)),life:1.05+lvl*.05,scale:Math.max(.72,upgrades.fishSize*.75),pierce:Math.random()<Math.min(.65,upgrades.pierceChance*.35+lvl*.04),boomerang:false,returning:false,age:0,hitIds:new Set(),shieldShot:true});
  }
  floatingTexts.push({x:player.x,y:player.y-154,text:"💥 Ráfaga felina",life:1.15,maxLife:1.15,big:false});
}

function triggerCatInstinct(){
if(!upgrades.catInstinct||life>upgrades.maxLife*.3)return;
const maxUses=upgrades.valorCasa?2:1;
if(catInstinctUsesThisWave>=maxUses)return;
catInstinctUsesThisWave++;
catInstinctUsedThisWave=catInstinctUsesThisWave>=maxUses;

playCatInstinctSound();
const force=420+upgrades.maxLife*2.2+(upgrades.cursedInstinct?180:0);
const radius=upgrades.cursedInstinct?720:620;
shockwaves.push({x:player.x,y:player.y,r:10,maxR:radius*.55,life:.55,maxLife:.55,color:upgrades.cursedInstinct?"#ff4d8d":"#ffd166",line:7});
shockwaves.push({x:player.x,y:player.y,r:4,maxR:radius*.82,life:.85,maxLife:.85,color:upgrades.valorCasa?"#80ed99":"#ffafcc",line:4});

for(let i=0;i<26;i++){
  const a=Math.random()*Math.PI*2;
  const sp=90+Math.random()*250;
  sparkles.push({x:player.x+Math.cos(a)*18,y:player.y+Math.sin(a)*18,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,size:3+Math.random()*5,life:.55+Math.random()*.35,maxLife:.9,color:upgrades.cursedInstinct?"#ff4d8d":"#ffd166"});
}
for(let i=0;i<12;i++){
  const a=i*Math.PI*2/12;
  smokes.push({x:player.x+Math.cos(a)*28,y:player.y+Math.sin(a)*28,vx:Math.cos(a)*170,vy:Math.sin(a)*170,life:.7,maxLife:.7,size:16+Math.random()*12});
}

if(upgrades.valorCasa)life=Math.min(upgrades.maxLife,life+upgrades.maxLife*.12);
if(upgrades.cursedInstinct){
  life=Math.min(upgrades.maxLife,life+upgrades.maxLife*.08);
  floatingTexts.push({x:player.x,y:player.y-108,text:"🖤 Modo instinto maldito",life:1.4,maxLife:1.4,big:false});
}
floatingTexts.push({x:player.x,y:player.y-82,text:upgrades.valorCasa?"🏠 ¡Valor de casa!":"🥷 ¡Instinto gatuno!",life:1.35,maxLife:1.35,big:false});
pullResourcesWithCatInstinct();
redirectBoomerangsWithCatInstinct();
shootCatInstinctBurst();

cats.forEach(cat=>{
  if(!isFinitePos(cat))return;
  const dx=cat.x-player.x,dy=cat.y-player.y,d=Math.hypot(dx,dy)||1;
  const falloff=Math.max(.28,1-Math.min(d/radius,.78));
  const push=(force*falloff)+(cat.small?110:0);
  cat.knockVx=(cat.knockVx||0)+(dx/d)*push;
  cat.knockVy=(cat.knockVy||0)+(dy/d)*push;
  cat.hitAnim=.28;
  cat.damageCooldown=Math.max(cat.damageCooldown,1.05);
});
quacks.forEach(q=>{
  const dx=q.x-player.x,dy=q.y-player.y,d=Math.hypot(dx,dy)||1;
  q.vx+=(dx/d)*360;
  q.vy+=(dy/d)*360;
});
yarnBalls.forEach(y=>{
  const dx=y.x-player.x,dy=y.y-player.y,d=Math.hypot(dx,dy)||1;
  y.vx+=(dx/d)*420;
  y.vy+=(dy/d)*420;
});
demonOrbs.forEach(o=>{
  const dx=o.x-player.x,dy=o.y-player.y,d=Math.hypot(dx,dy)||1;
  o.vx+=(dx/d)*320;
  o.vy+=(dy/d)*320;
});
if(boss){
  const dx=boss.x-player.x,dy=boss.y-player.y,d=Math.hypot(dx,dy)||1;
  boss.knockVx=(boss.knockVx||0)+(dx/d)*(force*.34);
  boss.knockVy=(boss.knockVy||0)+(dy/d)*(force*.34);
  boss.hitAnim=.28;
}
if(upgrades.reflexBurst){
  const targets=[...cats];if(boss)targets.push(boss);
  targets.slice(0,16).forEach(target=>{
    const a=Math.atan2(target.y-player.y,target.x-player.x);
    fishes.push({x:player.x+Math.cos(a)*54,y:player.y+Math.sin(a)*54,vx:Math.cos(a)*620*upgrades.fishSpeed,vy:Math.sin(a)*620*upgrades.fishSpeed,angle:a,damage:Math.max(1,upgrades.damage*.9),life:1.25,scale:upgrades.fishSize*.85,pierce:true,boomerang:false,returning:false,age:0,hitIds:new Set(),shieldShot:true});
  });
}
}

function getOriginalUpgradeName(key){
return (UPGRADE_META[key]&&UPGRADE_META[key].name)||(uniqueFusionMeta[key]&&uniqueFusionMeta[key].name)||key;
}

function getOriginalUpgradeIcon(key){
return (UPGRADE_META[key]&&UPGRADE_META[key].icon)||(uniqueFusionMeta[key]&&uniqueFusionMeta[key].icon)||"✨";
}

function getAllUpgradeRows(){
const rows=[];
const fusedKeys=new Set();

Object.keys(doneFusionPairs).forEach(pair=>{
const parts=pair.split("+");
if(parts.length!==2)return;
const [a,b]=parts;
const pairKey=sortedPair(a,b);
const aIsScalable=Object.prototype.hasOwnProperty.call(upgradeLevels,a);
const bIsScalable=Object.prototype.hasOwnProperty.call(upgradeLevels,b);
const aIsUnique=uniqueFusionKeys.includes(a);
const bIsUnique=uniqueFusionKeys.includes(b);
if((!aIsScalable&&!aIsUnique)||(!bIsScalable&&!bIsUnique))return;

fusedKeys.add(a);
fusedKeys.add(b);

const fusionName=getFusionNameFromPair(a,b);
const componentNames=`${getOriginalUpgradeName(a)} + ${getOriginalUpgradeName(b)}`;
const icon=pairKey==="darkPact+moralSupport"&&upgrades.boyfriendDogReturned?"🐶✨":(pairKey==="darkPact+moralSupport"&&upgrades.boyfriendDogSpirit?"🕯️🐶":`${getOriginalUpgradeIcon(a)} ${getOriginalUpgradeIcon(b)}`);
let level=1,max=1;

if(aIsScalable||bIsScalable){
level=getFusionVisualCurrentLevel(pairKey);
max=5;
}else if(aIsUnique&&bIsUnique){
level=1;
max=1;
}

rows.push({
icon,
name:(pairKey==="darkPact+moralSupport"&&upgrades.boyfriendDogReturned?"Te dije que seguiría contigo 🐶":(pairKey==="darkPact+moralSupport"&&upgrades.boyfriendDogSpirit?"Tu novio ha hecho este juego 🕯️":fusionName)),
level,
max,
components:componentNames,
desc:`${getFusionEffectDesc(a,b)}`,
locked:false,
maxed:level>=max,
fusion:true
});
});

Object.keys(upgradeLevels).forEach(key=>{
if(fusedKeys.has(key))return;
const lvl=upgradeLevels[key],max=(upgradeMaxLevels[key]||5),meta=UPGRADE_META[key];
rows.push({icon:meta.icon,name:getUpgradeDisplayName(key),level:lvl,max,desc:getUpgradeDisplayDesc(key,Math.max(1,lvl)),locked:lvl===0,maxed:lvl>=max||isUpgradeFinal(key),fusion:false});
});

uniqueFusionKeys.forEach(key=>{
if(fusedKeys.has(key))return;
const meta=uniqueFusionMeta[key];
rows.push({icon:meta.icon,name:getAnyName(key),level:hasUniqueUpgrade(key)?1:0,max:1,desc:meta.desc,locked:!hasUniqueUpgrade(key),maxed:hasUniqueUpgrade(key),fusion:false});
});
return rows;
}

function renderPauseMenu(){
const hs=getHighScore();
const bossCount=defeatedBossTypes.size;
pauseStats.innerHTML=`
<div class="pStat"><div class="pStatVal">⚡ ${wave}</div><div class="pStatLbl">Ronda</div></div>
<div class="pStat"><div class="pStatVal">⭐ ${level}</div><div class="pStatLbl">Nivel</div></div>
<div class="pStat"><div class="pStatVal">🪙 ${coins}</div><div class="pStatLbl">Monedas</div></div>
<div class="pStat"><div class="pStatVal">🐱 ${score}</div><div class="pStatLbl">Gatitos mimados</div></div>
<div class="pStat"><div class="pStatVal">🐟 ${runStats?Math.floor(runStats.fishHits||0):0}</div><div class="pStatLbl">Impactos</div></div>
<div class="pStat"><div class="pStatVal">💀 ${bossCount}/4</div><div class="pStatLbl">Jefes</div></div>
`;
if(hs>0){
  pauseRecordBadge.style.display="block";
  if(computeFinalScore().total>=hs){
    pauseRecordBadge.textContent="🏆 Récord personal: "+hs.toLocaleString()+" · ¡Vas camino de superarlo!";
  }else{
    pauseRecordBadge.textContent="🏆 Récord personal: "+hs.toLocaleString();
  }
}else{pauseRecordBadge.style.display="none";}
pauseUpgradesList.innerHTML=(()=>{
const rows=getAllUpgradeRows();
rows.sort((a,b)=>{
  const aFusion=!!a.fusion, bFusion=!!b.fusion;
  const aOwned=!a.locked, bOwned=!b.locked;
  if(aFusion!==bFusion)return aFusion?-1:1;
  if(aOwned!==bOwned)return aOwned?-1:1;
  if(aOwned){if(b.level!==a.level)return b.level-a.level;}
  return a.name.localeCompare(b.name,"es");
});
return rows;
})().map(r=>`
<div class="pauseUpgrade ${getOwnedVisualTierClass(r)} ${r.maxed?'maxed':''} ${r.locked?'locked':''} ${r.fusion?'fusion':''}">
  <div class="pauseUpgradeName">${r.icon} ${r.name}</div>
  <div class="pauseUpgradeLevel">${r.level}/${r.max}${r.maxed?' ⭐':''}</div>
  ${r.components?`<div class="pauseUpgradeComponents">Incluye: ${r.components}</div>`:""}
  <div class="pauseUpgradeDesc">${r.desc}</div>
</div>
`).join("");
}

function openPause(){
paused=true;
releaseGamePointer();
renderPauseMenu();
pausePanel.style.display="flex";
}

function closePause(){
paused=false;
pausePanel.style.display="none";
requestGamePointerLock();
}

function togglePause(){
if(paused)closePause();else openPause();
}


function isFinitePos(o){return o&&Number.isFinite(o.x)&&Number.isFinite(o.y)}
function isCatOnScreen(o){if(!o)return false;const m=(o.r||20)+8;return o.x>-m&&o.x<canvas.width+m&&o.y>-m&&o.y<canvas.height+m;}
let lastSoftErrorAt=0;
function clampNumber(value,min,max,fallback){
  if(!Number.isFinite(value))return fallback;
  return Math.max(min,Math.min(max,value));
}
function cleanBrokenEntities(){
  for(const arr of [cats,fishes,hearts,smokes,floatingTexts,pawPrints,quacks,coinsDrops,dogBones,demonOrbs,yarnBalls,powerStars,shockwaves,sparkles,tunaDrops]){
    for(let i=arr.length-1;i>=0;i--){
      const e=arr[i];
      if(!e||e.dead||!Number.isFinite(e.x)||!Number.isFinite(e.y))arr.splice(i,1);
    }
  }
  if(boss&&(!Number.isFinite(boss.x)||!Number.isFinite(boss.y)||!Number.isFinite(boss.hp)||boss.dead))boss=null;
  if(!isTargetAlive(selectedTarget))selectedTarget=null;
  if(!Number.isFinite(player.x)||!Number.isFinite(player.y)){player.x=canvas.width/2;player.y=canvas.height/2}
  player.x=clampNumber(player.x,player.r||20,canvas.width-(player.r||20),canvas.width/2);
  player.y=clampNumber(player.y,player.r||20,canvas.height-(player.r||20),canvas.height/2);
  if(!Number.isFinite(life))life=upgrades.maxLife||100;
  life=Math.max(0,Math.min(life,upgrades.maxLife||100));
  if(!Number.isFinite(xp))xp=0;
  if(!Number.isFinite(xpNeed)||xpNeed<=0)xpNeed=getXpNeedForLevel(level||1);
  if(!Number.isFinite(coins)||coins<0)coins=0;
  if(!Number.isFinite(level)||level<1)level=1;
  if(!Number.isFinite(wave)||wave<1)wave=1;
  Object.keys(upgradeLevels).forEach(k=>{
    if(!Number.isFinite(upgradeLevels[k])||upgradeLevels[k]<0)upgradeLevels[k]=0;
    if(!Number.isFinite(upgradeMaxLevels[k])||upgradeMaxLevels[k]<5)upgradeMaxLevels[k]=5;
    upgradeLevels[k]=Math.min(upgradeLevels[k],upgradeMaxLevels[k]);
  });
  shopUpgradePurchases=Math.max(0,Math.floor(Number.isFinite(shopUpgradePurchases)?shopUpgradePurchases:0));
  shopFusionPurchases=Math.max(0,Math.floor(Number.isFinite(shopFusionPurchases)?shopFusionPurchases:0));
}
function showSoftError(err){
  console.error(err);
  window.__lastGameError=String(err&&err.stack?err.stack:err);
  cleanBrokenEntities();
  const now=performance.now();
  if(now-lastSoftErrorAt>2500){
    lastSoftErrorAt=now;
    floatingTexts.push({x:canvas.width/2,y:110,text:"⚠️ Error recuperado",life:.9,maxLife:.9,big:false});
  }
}
window.addEventListener('error',e=>{showSoftError(e.error||e.message)});
window.addEventListener('unhandledrejection',e=>{showSoftError(e.reason||e)});


function updatePerformanceMode(rawDt){
  if(!Number.isFinite(rawDt)||rawDt<=0)return;
  const fps=Math.max(1,Math.min(120,1/rawDt));
  perfFps=perfFps*.94+fps*.06;
  const manyEntities=fishes.length+cats.length+quacks.length+demonOrbs.length+yarnBalls.length+sparkles.length+smokes.length+hearts.length;
  const overload=perfFps<42||manyEntities>360;
  if(overload)lowPerfTimer+=rawDt;
  else lowPerfTimer=Math.max(0,lowPerfTimer-rawDt*1.75);
  const shouldUseLow=lowPerfMode?lowPerfTimer>.28:lowPerfTimer>1.05;
  if(shouldUseLow!==lowPerfMode){
    lowPerfMode=shouldUseLow;
    perfNoticeTimer=0;
  }
  if(perfNotice)perfNotice.classList.remove("visible");
}
function getEffectQuality(){
  return lowPerfMode?.34:1;
}
function getEntityLimit(base,mid,low){
  return lowPerfMode?low:base;
}

function update(dt){
if(!gameStarted||gameOver||choosingUpgrade||paused)return;
if(autoMode)updateAutoPlayer(dt);
if(runStats){runStats.elapsed+=dt;if(life<upgrades.maxLife*.35)runStats.lowHpTime+=dt;}
triggerCatInstinct();if(dogRelaxTime>0)dogRelaxTime=Math.max(0,dogRelaxTime-dt);updateAvalanche(dt);
if(starActive){
starTime-=dt;
updatePowerStarLoop();
starTwinkleTimer-=dt;
if(starTime>0&&starTwinkleTimer<=0){const sr=Math.max(0,Math.min(1,starTime/10));playStarTwinkle(sr);starTwinkleTimer=.18+(1-sr)*.30;}
if(starTime>0&&starTime<=3&&!starWarningPlayed){
  starWarningPlayed=true;
  floatingTexts.push({x:player.x,y:player.y-88,text:"⭐ ¡Se acaba!",life:1.2,maxLife:1.2,big:false});
  makeSmoke(player.x,player.y);
  playStarTwinkle(.28);
}
if(starTime>0&&starTime<=3&&Math.random()<.18){
  floatingTexts.push({x:player.x,y:player.y-62,text:"pipipi ⭐",life:.45,maxLife:.45,big:false});
}
if(starTime<=0){
  stopPowerStarLoop();
  starActive=false;
  starTime=0;
  starWarningPlayed=false;
  floatingTexts.push({x:player.x,y:player.y-65,text:"⭐ La estrella se apagó",life:1.1,maxLife:1.1,big:false});
}
}

if(sevenLivesCooldown>0)sevenLivesCooldown=Math.max(0,sevenLivesCooldown-dt);
if(sevenLivesTime>0){
  sevenLivesTime=Math.max(0,sevenLivesTime-dt);
  if(sevenLivesTime>0&&sevenLivesTime<=2.2&&Math.random()<.13){
    floatingTexts.push({x:player.x,y:player.y-68,text:"🐱 protección acabando",life:.45,maxLife:.45,big:false});
  }
  if(sevenLivesTime<=0){
    floatingTexts.push({x:player.x,y:player.y-62,text:"🐱 Siete vidas se apagó",life:1,maxLife:1,big:false});
  }
}

if(isSevenLivesActive()&&performance.now()-lastStarTrail>55){
  lastStarTrail=performance.now();
  for(let i=0;i<3;i++){const a=Math.random()*Math.PI*2; sparkles.push({x:player.x+Math.cos(a)*16,y:player.y+Math.sin(a)*16,vx:Math.cos(a)*(20+Math.random()*55),vy:Math.sin(a)*(20+Math.random()*55),size:3+Math.random()*4,life:.42,maxLife:.42,color:i%2?"#80ed99":"#ffd166"});}
}

if(isPowerStarActive()&&performance.now()-lastStarTrail>45){
  lastStarTrail=performance.now();
  for(let i=0;i<5;i++){const a=Math.random()*Math.PI*2; sparkles.push({x:player.x-Math.cos(player.angle)*18+Math.cos(a)*18,y:player.y-Math.sin(player.angle)*18+Math.sin(a)*18,vx:Math.cos(a)*(25+Math.random()*65),vy:Math.sin(a)*(25+Math.random()*65),size:3+Math.random()*4,life:.45,maxLife:.45,color:`hsl(${(performance.now()/5+i*45)%360},100%,70%)`});}
}
waveTime-=dt;
if(waveTime<=0&&!boss){
  waveTime=0;
  if(bossVictoryPending){cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});showBossVictoryPanel();return}
  if(shopBossPending){cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});maybeOpenShopOrFusion();return}
  if(!waveUpgradePending){waveUpgradePending=true;cleanupRoundScreen();openUpgradeMenu("wave");}
  return
}
if(waveTime<=0&&boss)waveTime=0;

spawnCooldown-=dt;
if(spawnCooldown<=0&&!boss){spawnCat();spawnCooldown=Math.max(.18,1.05-wave*.045)}
if(spawnCooldown<=0&&boss&&boss.type!=="giantCat"){spawnCat();spawnCooldown=Math.max(.45,1.5-wave*.04)}

let mx=0,my=0;
if(keys.w)my--;if(keys.s)my++;if(keys.a)mx--;if(keys.d)mx++;
const movementLen=Math.hypot(mx,my);
if(movementLen>0){mx/=movementLen;my/=movementLen;player.x+=mx*player.speed*upgrades.moveSpeed*getZoomiesMoveMultiplier()*getStarSpeedMultiplier()*dt;player.y+=my*player.speed*upgrades.moveSpeed*getZoomiesMoveMultiplier()*getStarSpeedMultiplier()*dt;
if(hasDoneFusionPair("moveSpeed+xpBoost")){fusionMoveXpTimer+=dt;if(fusionMoveXpTimer>=2.8){fusionMoveXpTimer=0;gainXP(1);}}
}

player.x=Math.max(player.r,Math.min(canvas.width-player.r,player.x));
player.y=Math.max(player.r,Math.min(canvas.height-player.r,player.y));
player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
player.shootAnim=Math.max(0,player.shootAnim-dt);
player.hurtAnim=Math.max(0,player.hurtAnim-dt);

if(upgrades.braveHeart&&life<upgrades.maxLife*.35&&Math.random()<.025){floatingTexts.push({x:player.x,y:player.y-60,text:"💗 Corazón valiente",life:.75,maxLife:.75,big:false})}
if(isZoomiesActive()&&Math.random()<.018){floatingTexts.push({x:player.x,y:player.y-72,text:"💨 ZOOMIES",life:.65,maxLife:.65,big:false})}
if(upgrades.autoFire&&(cats.length>0||boss))shootAutoFish();
if(mouseIsDown&&upgrades.holdShoot&&!gameOver&&gameStarted&&!paused&&!choosingUpgrade)shootFish(true);
updateOmniBurst();
updateDog(dt);
updateShield(dt);
updateBoss(dt);
if(runStats){const nearbyCats=cats.some(c=>isFinitePos(c)&&Math.hypot(player.x-c.x,player.y-c.y)<190);const nearbyBoss=boss&&Math.hypot(player.x-boss.x,player.y-boss.y)<boss.r+210;if(nearbyCats||nearbyBoss)runStats.enemiesNearTime+=dt;}
if(isPowerStarActive()&&boss&&Math.hypot(player.x-boss.x,player.y-boss.y)<player.r+boss.r+18){damageBoss(Math.max(1.5,upgrades.damage*18*dt));}

fishes.forEach(fish=>{
fish.age+=dt;
if(fish.boomerang&&!fish.returning&&fish.age>(fish.turnTime||.95)){fish.returning=true;fish.pierce=true}
if(fish.returning){
let returnTarget={x:player.x,y:player.y};
let expireAtPlayer=true;
if(hasDoneFusionPair("bigCursor+boomerang")){
  const lvl=getFusionProgress("bigCursor+boomerang");
  const marked=getSelectedTarget();
  const nearby=marked&&isFinitePos(marked)?marked:getNearestCombatTargetFrom(fish.x,fish.y,520+lvl*95);
  if(nearby){returnTarget=nearby;expireAtPlayer=false;fish.pierce=true;}
}
const a=Math.atan2(returnTarget.y-fish.y,returnTarget.x-fish.x),speed=690*upgrades.fishSpeed*(1+effectLevel("boomerang")*.05+(hasDoneFusionPair("bigCursor+boomerang")?getFusionProgress("bigCursor+boomerang")*.025:0));
fish.vx=Math.cos(a)*speed;fish.vy=Math.sin(a)*speed;fish.angle=a;
if(expireAtPlayer&&Math.hypot(player.x-fish.x,player.y-fish.y)<player.r+10)fish.life=0
}else applyAimAssist(fish);
fish.x+=fish.vx*dt;fish.y+=fish.vy*dt;fish.life-=dt
});
for(let i=fishes.length-1;i>=0;i--){const fish=fishes[i];if(fish.life<=0||fish.x<-120||fish.x>canvas.width+120||fish.y<-120||fish.y>canvas.height+120){if(runStats&&(!fish.hitIds||fish.hitIds.size===0))runStats.fishMisses++;fishes.splice(i,1)}}

for(let q=quacks.length-1;q>=0;q--){
const quack=quacks[q];quack.x+=quack.vx*dt;quack.y+=quack.vy*dt;quack.life-=dt;
if(Math.hypot(player.x-quack.x,player.y-quack.y)<player.r+quack.r){takePlayerDamage(14,"Te ha dado un QUACK 🦆",.2);makeSmoke(quack.x,quack.y);quacks.splice(q,1);continue}
if(quack.life<=0||quack.x<-100||quack.x>canvas.width+100||quack.y<-100||quack.y>canvas.height+100)quacks.splice(q,1)
}

for(let i=demonOrbs.length-1;i>=0;i--){
const orb=demonOrbs[i];orb.x+=orb.vx*dt;orb.y+=orb.vy*dt;orb.life-=dt;
if(Math.hypot(player.x-orb.x,player.y-orb.y)<player.r+orb.r){
takePlayerDamage(orb.damage,"El demonio oscuro te ha destruido 😈",.25);makeSmoke(orb.x,orb.y);demonOrbs.splice(i,1);continue
}
for(let j=fishes.length-1;j>=0;j--){
const fish=fishes[j];if(!isFinitePos(fish))continue;
if(Math.hypot(fish.x-orb.x,fish.y-orb.y)<orb.r+12*(fish.scale||1)){makeSmoke(orb.x,orb.y);demonOrbs.splice(i,1);if(!fish.pierce)fishes.splice(j,1);break}
}
if(orb.life<=0||orb.x<-120||orb.x>canvas.width+120||orb.y<-120||orb.y>canvas.height+120)demonOrbs.splice(i,1)
}

for(let i=yarnBalls.length-1;i>=0;i--){
const y=yarnBalls[i];y.x+=y.vx*dt;y.y+=y.vy*dt;y.life-=dt;y.spin=(y.spin||0)+dt*8;
if(Math.hypot(player.x-y.x,player.y-y.y)<player.r+y.r){
takePlayerDamage(y.damage,"Los ovillos te han atrapado 🧶",.2);makeSmoke(y.x,y.y);yarnBalls.splice(i,1);
floatingTexts.push({x:player.x,y:player.y-42,text:"¡ovillo!",life:.8,maxLife:.8,big:false});continue
}
if(y.life<=0||y.x<-100||y.x>canvas.width+100||y.y<-100||y.y>canvas.height+100)yarnBalls.splice(i,1)
}

for(let cd=coinsDrops.length-1;cd>=0;cd--){
const coin=coinsDrops[cd];coin.life-=dt;
let dx=player.x-coin.x,dy=player.y-coin.y,d=Math.hypot(dx,dy);
if(upgrades.coinMagnetRange>0&&d<upgrades.coinMagnetRange&&d>1){
const pull=220+effectLevel("coinMagnet")*55+(effectLevel("coinMagnet")>=5?140:0);
coin.x+=(dx/d)*pull*dt;coin.y+=(dy/d)*pull*dt;
dx=player.x-coin.x;dy=player.y-coin.y;d=Math.hypot(dx,dy)
}
if(d<player.r+22){
coins+=coin.amount;if(runStats)runStats.coinsCollected+=coin.amount;if(hasDoneFusionPair("coinMagnet+healOnWave"))life=Math.min(upgrades.maxLife,life+Math.max(1,Math.round(upgrades.healOnWave*.10)));coinsDrops.splice(cd,1);
floatingTexts.push({x:player.x,y:player.y-55,text:`+${coin.amount} moneda`,life:.9,maxLife:.9,big:false});
updateHud();checkGameCompletion();maybeOpenShopOrFusion()
}else if(coin.life<=0){if(runStats)runStats.coinsMissed+=coin.amount||1;coinsDrops.splice(cd,1)}
}

for(let td=tunaDrops.length-1;td>=0;td--){
const tuna=tunaDrops[td];tuna.life-=dt;tuna.wobble+=dt*3;
let dx=player.x-tuna.x,dy=player.y-tuna.y,d=Math.hypot(dx,dy);
if(upgrades.coinMagnetRange>0&&fusedUpgradeNames["coinMagnet"]&&d<upgrades.coinMagnetRange&&d>1){const pull=220;tuna.x+=(dx/d)*pull*dt;tuna.y+=(dy/d)*pull*dt;dx=player.x-tuna.x;dy=player.y-tuna.y;d=Math.hypot(dx,dy)}
if(d<player.r+tuna.r+14){
const heal=Math.round(15+Math.random()*10);
life=Math.min(upgrades.maxLife,life+heal);
tunaDrops.splice(td,1);
floatingTexts.push({x:player.x,y:player.y-62,text:`🐟 +${heal} vida`,life:1.1,maxLife:1.1,big:false});
updateHud();
}else if(tuna.life<=0){tunaDrops.splice(td,1)}
}
for(let ps=powerStars.length-1;ps>=0;ps--){
const star=powerStars[ps];
star.life-=dt;star.wobble+=dt*7;
if(Math.hypot(player.x-star.x,player.y-star.y)<player.r+star.r+8){
powerStars.splice(ps,1);activatePowerStar();
}else if(star.life<=0){
powerStars.splice(ps,1);
floatingTexts.push({x:star.x,y:star.y-28,text:"⭐",life:.7,maxLife:.7,big:false});
}
}

const musicianPositions=cats.filter(c=>c.type==="musician"&&!c.dead&&isFinitePos(c)).map(c=>({x:c.x,y:c.y}));
if(musicianPositions.length>0&&!paused&&!gameOver){musicianNoteTimer-=dt;if(musicianNoteTimer<=0){playMusicianNote();musicianNoteTimer=.36;}}else if(musicianPositions.length===0){musicianNoteTimer=0;}
cats.forEach(cat=>{
if(!isFinitePos(cat))return;
if(cat.spawnAnim>0)cat.spawnAnim=Math.max(0,cat.spawnAnim-dt);
let dx=player.x-cat.x,dy=player.y-cat.y,dist=Math.hypot(dx,dy)||1;
cat.wobble+=dt*7;cat.damageCooldown=Math.max(0,cat.damageCooldown-dt);cat.hitAnim=Math.max(0,cat.hitAnim-dt);cat.stealCooldown=Math.max(0,(cat.stealCooldown||0)-dt);cat.fleeTimer=Math.max(0,(cat.fleeTimer||0)-dt);cat.freezeTimer=Math.max(0,(cat.freezeTimer||0)-dt);cat.musicImmuneTimer=Math.max(0,(cat.musicImmuneTimer||0)-dt);
if(cat.freezeTimer>0){cat.hitAnim=Math.max(cat.hitAnim,.12);return;}
if(isPowerStarActive()&&dist<player.r+cat.r+10){killCat(cats.indexOf(cat),cat);return;}
if(cat.type==="yarn"){
  cat.yarnCooldown-=dt;
  if(cat.yarnCooldown<=0&&isCatOnScreen(cat)){
    const hpRatio=Math.max(0,Math.min(1,cat.hp/cat.maxHp));
    const rage=1+(1-hpRatio)*1.65;
    cat.yarnCooldown=Math.max(.42,(2.25-wave*.032)/rage);
    const a=Math.atan2(player.y-cat.y,player.x-cat.x),spd=190+wave*7+(1-hpRatio)*70;
    const burst=hpRatio<.35?2:1;
    for(let by=0;by<burst;by++){
      const aa=a+(by===0?0:(Math.random()<.5?-.18:.18));
      yarnBalls.push({x:cat.x+Math.cos(aa)*cat.r,y:cat.y+Math.sin(aa)*cat.r,vx:Math.cos(aa)*spd,vy:Math.sin(aa)*spd,r:13,life:4.2,damage:8+wave*.28,spin:0});
    }
    floatingTexts.push({x:cat.x,y:cat.y-38,text:hpRatio<.35?"🧶🧶":"🧶",life:.55,maxLife:.55,big:false});
  }
  if(dist<260){cat.x-=(dx/dist)*cat.speed*.75*dt;cat.y-=(dy/dist)*cat.speed*.75*dt}else{cat.x+=(dx/dist)*cat.speed*.42*dt;cat.y+=(dy/dist)*cat.speed*.42*dt}
}else if(cat.type==="thief"){
  const dir=cat.fleeTimer>0?-1:1;
  const thiefBoost=cat.fleeTimer>0?1.18:1;
  cat.x+=(dx/dist)*cat.speed*dir*thiefBoost*dt+Math.cos(cat.wobble)*16*dt;
  cat.y+=(dy/dist)*cat.speed*dir*thiefBoost*dt+Math.sin(cat.wobble)*16*dt;
  if(dist<player.r+cat.r+8&&cat.stealCooldown<=0&&coins>0&&isCatOnScreen(cat)){
    const remaining=getThiefRemainingWaveSteal();
    const stolen=Math.min(coins,getThiefStealPerTouch(),remaining);
    if(stolen>0){
      coins=Math.max(0,coins-stolen);
      thiefCoinsStolenThisWave+=stolen;
      cat.stolenCoins=(cat.stolenCoins||0)+stolen;
      cat.stealCooldown=1.8;
      cat.fleeTimer=2.8;
      player.hurtAnim=.12;
      floatingTexts.push({x:player.x,y:player.y-45,text:`-${stolen} moneda${stolen>1?"s":""} 😾`,life:1,maxLife:1,big:false});
      updateHud();
    }else{
      cat.stealCooldown=1.1;
      cat.fleeTimer=1.4;
    }
  }
}else if(cat.type==="sleepy"){
  cat.wakeTimer=Math.max(0,(cat.wakeTimer||0)-dt);cat.rushTimer=Math.max(0,(cat.rushTimer||0)-dt);
  if(cat.sleepState==="sleeping"||!cat.sleepState){cat.x+=(dx/dist)*cat.speed*.46*dt+Math.cos(cat.wobble)*4*dt;cat.y+=(dy/dist)*cat.speed*.46*dt+Math.sin(cat.wobble)*4*dt;}
  else if(cat.sleepState==="waking"){if(cat.wakeTimer<=0){cat.sleepState="awake";cat.rushTimer=cat.sleepAwakeDuration||Math.min(7.2,3.0+wave*.12);}}
  else if(cat.sleepState==="awake"){
  const awakeSpeed=4.2+Math.min(2.4,wave*.045);
  cat.x+=(dx/dist)*cat.speed*awakeSpeed*dt;cat.y+=(dy/dist)*cat.speed*awakeSpeed*dt;
  if(cat.rushTimer<=0){cat.sleepState="sleeping";floatingTexts.push({x:cat.x,y:cat.y-38,text:"💤 vuelve a dormir",life:.7,maxLife:.7,big:false});}
  }
}else if(cat.type==="mini"){
  const perp=-Math.atan2(dx,dy);const zz=Math.sin((cat.zigzagPhase||0)+performance.now()*.005)*34;
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(perp)*zz*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(perp)*zz*dt;
}else if(cat.type==="glutton"){
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(cat.wobble)*4*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(cat.wobble)*4*dt;
}else if(cat.type==="musician"){
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(cat.wobble)*8*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(cat.wobble)*8*dt;
}else if(cat.type==="student"){
  if(isCatOnScreen(cat))cat.studyTimer=(cat.studyTimer||0)+dt;
  if(cat.studyTimer>=2.35&&(cat.studyLevel||0)<5){
    cat.studyLevel=(cat.studyLevel||0)+1;
    cat.studyTimer=0;
    cat.hp=Math.min(cat.maxHp+(cat.studyLevel||0)*2,(cat.hp||1)+1);
    floatingTexts.push({x:cat.x,y:cat.y-48,text:`📚 Estudia ${cat.studyLevel}/5`,life:1.05,maxLife:1.05,big:false});
    makeImpact(cat.x,cat.y,"#74b9ff",.65);
  }
  const studBonus=1+(cat.studyLevel||0)*.34;
  cat.x+=(dx/dist)*cat.speed*studBonus*dt+Math.cos(cat.wobble)*9*dt;cat.y+=(dy/dist)*cat.speed*studBonus*dt+Math.sin(cat.wobble)*9*dt;
}else{
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(cat.wobble)*9*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(cat.wobble)*9*dt;
}
if(musicianPositions.length>0&&cat.type!=="musician"){
  const nearM=musicianPositions.some(m=>Math.hypot(m.x-cat.x,m.y-cat.y)<240);
  if(nearM){
    cat.x+=(dx/dist)*cat.speed*.52*dt;
    cat.y+=(dy/dist)*cat.speed*.52*dt;
    cat.damageCooldown=Math.max(0,cat.damageCooldown-dt*.35);
    if(Math.random()<.006)floatingTexts.push({x:cat.x,y:cat.y-cat.r-12,text:"♪ rápido",life:.45,maxLife:.45,big:false});
  }
}
if(cat.knockVx||cat.knockVy){cat.x+=(cat.knockVx||0)*dt;cat.y+=(cat.knockVy||0)*dt;cat.knockVx=(cat.knockVx||0)*Math.pow(.08,dt);cat.knockVy=(cat.knockVy||0)*Math.pow(.08,dt);if(Math.abs(cat.knockVx)<8)cat.knockVx=0;if(Math.abs(cat.knockVy)<8)cat.knockVy=0;}
cat.x=Math.max(-240,Math.min(canvas.width+240,cat.x));cat.y=Math.max(-240,Math.min(canvas.height+240,cat.y));
if(dist<player.r+cat.r-4&&cat.damageCooldown<=0&&isCatOnScreen(cat)){
  const dmg=cat.type==="thief"?6:cat.type==="yarn"?8:cat.type==="glutton"?14:cat.type==="student"?11+(cat.studyLevel||0)*3:cat.type==="musician"?9:cat.type==="sleepy"&&cat.sleepState==="awake"?16:7;
  const hitTxt=cat.type==="thief"?"¡ladrón!":cat.type==="yarn"?"¡lana!":cat.type==="glutton"?"¡ñam ñam! 🍽️":cat.type==="musician"?"¡mi música! 🎵":cat.type==="student"?"¡interrumpiste mi estudio! 📚":cat.type==="mini"?"¡ayy! 🐱":cat.type==="sleepy"&&cat.sleepState==="awake"?"¡rabia somnolienta! 😤":"auch, miau!";
  takePlayerDamage(dmg,"Te han invadido los gatitos 🐱",.18);cat.damageCooldown=.75;makeHearts(player.x,player.y);floatingTexts.push({x:player.x,y:player.y-38,text:hitTxt,life:.9,maxLife:.9,big:false})
}
});

for(let i=cats.length-1;i>=0;i--){
const cat=cats[i];
if(!isFinitePos(cat))continue;
if(!isCatOnScreen(cat))continue;
for(let j=fishes.length-1;j>=0;j--){
const fish=fishes[j];
if(!isFinitePos(fish))continue;
const d=Math.hypot(cat.x-fish.x,cat.y-fish.y);
if(d<cat.r+14*(fish.scale||1)){
const hitTargetId=getYarnTargetId(cat);
if(!fish.hitIds)fish.hitIds=new Set();
if(fish.hitIds.has(hitTargetId))continue;
fish.hitIds.add(hitTargetId);
const hitX=cat.x, hitY=cat.y;
const dealt=Number.isFinite(fish.damage)?fish.damage:1;
if(cat.type==="musician"&&(cat.musicImmuneTimer||0)>0){
  if(runStats)runStats.fishHits++;
  cat.hitAnim=.12;
  makeImpact(hitX,hitY,"#d084c8",.45);
  floatingTexts.push({x:hitX,y:hitY-32,text:"♪ protegido",life:.45,maxLife:.45,big:false});
  if(!fish.pierce)fishes.splice(j,1);else fish.damage*=.72;
  continue;
}
cat.hp-=dealt;
if(runStats)runStats.fishHits++;
cat.hitAnim=.15;
if(cat.type==="musician"&&cat.hp>0)cat.musicImmuneTimer=1;

// Primero aplicamos daño y quitamos el pez. Los efectos van protegidos para que
// nunca bloqueen el daño si algún efecto visual/sonoro falla.
if(!fish.pierce)fishes.splice(j,1);else fish.damage*=((upgrades.autoFire&&upgrades.aimAssist)?0.62:0.72);

try{makeImpact(hitX,hitY,cat.type==="yarn"?"#b197fc":cat.type==="thief"?"#ffd166":cat.type==="sleepy"?"#c8b6e2":cat.type==="mini"?"#ffb347":cat.type==="glutton"?"#e8956d":cat.type==="musician"?"#d084c8":cat.type==="student"?"#74b9ff":"#ffc2d1",.65)}catch(e){console.warn(e)}
try{playImpactSoundThrottled()}catch(e){}
try{spawnYarnBounce(hitX,hitY,hitTargetId,fish.yarnVisitedIds||[])}catch(e){console.warn(e)}
try{makeHearts(hitX,hitY)}catch(e){}
try{playCuteMeowThrottled()}catch(e){}

if(cat.type==="thief"&&cat.hp>0)teleportThiefCat(cat);
if(cat.type==="sleepy"&&cat.hp>0&&(cat.sleepState==="sleeping"||!cat.sleepState)){
cat.sleepState="waking";
cat.wakeTimer=.30;
cat.sleepAwakeDuration=Math.min(7.2,3.0+wave*.12);
cat.rushTimer=cat.sleepAwakeDuration;
cat.baseSpeed=cat.baseSpeed||cat.speed;
shockwaves.push({x:cat.x,y:cat.y,r:6,maxR:85+Math.min(70,wave*2.2),life:.42,maxLife:.42,color:"#ff8fab",line:4});
floatingTexts.push({x:cat.x,y:cat.y-48,text:"😤 ¡DESPERTÓ!",life:1.15,maxLife:1.15,big:false});
}
if(upgrades.lifeSteal>0)life=Math.min(upgrades.maxLife,life+dealt*upgrades.lifeSteal);
floatingTexts.push({x:hitX,y:hitY-34,text:cat.rainbow?"🌈 miua!":Math.random()<.5?"miua!":"miau!",life:.65,maxLife:.65,big:false});
if(cat.hp<=0)killCat(i,cat);
break
}
}
}

if(boss){
for(let j=fishes.length-1;j>=0;j--){
if(!boss)break;
const fish=fishes[j],d=Math.hypot(boss.x-fish.x,boss.y-fish.y);
if(d<boss.r+16*(fish.scale||1)){
const bossYarnId=getYarnTargetId(boss);
if(!fish.hitIds)fish.hitIds=new Set();
if(fish.hitIds.has(bossYarnId))continue;
fish.hitIds.add(bossYarnId);
const hitX=fish.x, hitY=fish.y;
const dealt=Number.isFinite(fish.damage)?fish.damage:1;
if(runStats)runStats.fishHits++;
damageBoss(dealt);
if(!fish.pierce)fishes.splice(j,1);else fish.damage*=((upgrades.autoFire&&upgrades.aimAssist)?0.62:0.72);
try{spawnYarnBounce(hitX,hitY,bossYarnId,fish.yarnVisitedIds||[])}catch(e){console.warn(e)}
}
}
}

for(let q=quacks.length-1;q>=0;q--){
for(let j=fishes.length-1;j>=0;j--){
const fish=fishes[j],quack=quacks[q];if(!quack)break;
const d=Math.hypot(quack.x-fish.x,quack.y-fish.y);
if(d<quack.r+14*(fish.scale||1)){quack.hp-=fish.damage;makeImpact(quack.x,quack.y,"#ffd166",.7);fishes.splice(j,1);if(quack.hp<=0){makeSmoke(quack.x,quack.y);dropCoins(quack.x,quack.y,.3);quacks.splice(q,1)}break}
}
}

hearts.forEach(h=>{h.x+=h.vx*dt;h.y+=h.vy*dt;h.vy+=130*dt;h.life-=dt});
smokes.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.96;s.vy*=.96;s.life-=dt});
shockwaves.forEach(w=>{w.r+=(w.maxR-w.r)*Math.min(1,dt*7.5);w.life-=dt});
sparkles.forEach(sp=>{sp.x+=sp.vx*dt;sp.y+=sp.vy*dt;sp.vx*=.92;sp.vy*=.92;sp.life-=dt});
if(screenShake>0){screenShake=Math.max(0,screenShake-dt*22);screenShakeX=(Math.random()*2-1)*screenShake;screenShakeY=(Math.random()*2-1)*screenShake}else{screenShakeX=0;screenShakeY=0;}
floatingTexts.forEach(t=>{t.y-=(t.big?18:28)*dt;t.life-=dt});
pawPrints.forEach(p=>p.life-=dt);

for(let i=hearts.length-1;i>=0;i--)if(hearts[i].life<=0)hearts.splice(i,1);
for(let i=smokes.length-1;i>=0;i--)if(smokes[i].life<=0)smokes.splice(i,1);
for(let i=floatingTexts.length-1;i>=0;i--)if(floatingTexts[i].life<=0)floatingTexts.splice(i,1);
for(let i=pawPrints.length-1;i>=0;i--)if(pawPrints[i].life<=0)pawPrints.splice(i,1);
for(let i=shockwaves.length-1;i>=0;i--)if(shockwaves[i].life<=0)shockwaves.splice(i,1);
for(let i=sparkles.length-1;i>=0;i--)if(sparkles[i].life<=0)sparkles.splice(i,1);

// El modo ligero solo debe recortar elementos visuales, no elementos de gameplay.
limitArray(hearts,getEntityLimit(120,70,42));
limitArray(smokes,getEntityLimit(160,90,52));
limitArray(shockwaves,getEntityLimit(20,14,8));
limitArray(sparkles,getEntityLimit(180,95,50));
limitArray(floatingTexts,getEntityLimit(42,26,16));
limitArray(pawPrints,getEntityLimit(28,18,8));

// Proyectiles, enemigos y objetos jugables mantienen límites seguros incluso en modo ligero.
// Si se recortan demasiado, desaparecen balas de gatos/demonio y cambia la partida.
limitArray(fishes,140);
limitArray(cats,avalancheActive?150:105);
limitArray(quacks,70);
limitArray(coinsDrops,90);
limitArray(dogBones,80);
limitArray(demonOrbs,110);
limitArray(yarnBalls,110);
limitArray(tunaDrops,70);
limitArray(powerStars,2);
updateHud()
}

function updateHud(){
if(scoreEl)scoreEl.textContent=score;
if(shotsEl)shotsEl.textContent=runStats?Math.floor(runStats.fishHits||0):0;
lifeEl.textContent=Math.ceil(life);levelEl.textContent=level;xpEl.textContent=xp;xpNeedEl.textContent=xpNeed;waveEl.textContent=wave;coinsEl.textContent=coins;timeLeftEl.textContent=boss&&waveTime<=0?"Jefe":Math.ceil(waveTime);
lifeBar.style.width=`${Math.max(0,(life/upgrades.maxLife)*100)}%`;xpBar.style.width=`${Math.min(100,(xp/xpNeed)*100)}%`;timeBar.style.width=`${Math.max(0,(waveTime/waveDuration)*100)}%`;
if(helpEl)helpEl.classList.toggle("hiddenAfterIntro",gameStarted&&wave>=3);
}

function drawAmbientBackgroundHeart(x,y,scale,alpha,angle,color){
ctx.save();
ctx.translate(x,y);
ctx.rotate(angle||0);
ctx.scale(scale,scale);
ctx.globalAlpha=alpha;
ctx.fillStyle=color||"rgba(255,122,168,1)";
ctx.shadowBlur=lowPerfMode?0:10;
ctx.shadowColor="rgba(255,122,168,.14)";
ctx.beginPath();
ctx.moveTo(0,8);
ctx.bezierCurveTo(-22,-8,-12,-26,0,-13);
ctx.bezierCurveTo(12,-26,22,-8,0,8);
ctx.fill();
ctx.restore();
}

function ambientFishRand(i,offset=0){
const x=Math.sin((backgroundFishSeed+1)*12.9898+(i+1)*78.233+offset*37.719)*43758.5453;
return x-Math.floor(x);
}

function drawAmbientBackgroundFish(now){
const count=lowPerfMode?5:10;
const specialPalette=["rgba(120,205,255,1)","rgba(255,174,204,1)","rgba(205,190,255,1)","rgba(255,209,102,1)","rgba(128,237,153,1)","rgba(179,255,236,1)","rgba(255,156,192,1)"];
for(let i=0;i<count;i++){
  const dir=ambientFishRand(i,1)<.5?1:-1;
  const speed=(lowPerfMode?10:15)+ambientFishRand(i,2)*24;
  const lane=(i+ambientFishRand(i,3))/(count+1);
  const bandY=canvas.height*(.10+lane*.76);
  const bob=8+ambientFishRand(i,4)*22;
  const y=bandY+Math.sin(now*(.00016+ambientFishRand(i,5)*.00018)+ambientFishRand(i,6)*Math.PI*2)*bob;
  const phaseOffset=ambientFishRand(i,7)*(canvas.width+300);
  const travel=(now*.001*speed + phaseOffset)%(canvas.width+300);
  const x=dir>0?travel-150:canvas.width-travel+150;
  const isLarge=ambientFishRand(i,8)>.72;
  const scale=(lowPerfMode?.38:.43)+ambientFishRand(i,9)*.34+(isLarge?.20:0);
  const alpha=(lowPerfMode?.048:.06)+ambientFishRand(i,10)*.055;
  const tint=specialPalette[Math.floor(ambientFishRand(i,11)*specialPalette.length)%specialPalette.length];
  drawOneAmbientFish(x,y,dir,scale,alpha,tint,now*(.00032+ambientFishRand(i,12)*.00035)+ambientFishRand(i,13)*6,false);
}

// Pez enorme muy raro. Su momento, altura, color y dirección cambian en cada partida.
if(!lowPerfMode){
  const rareCycle=48000+ambientFishRand(90,1)*26000;
  const shiftedNow=now+ambientFishRand(90,2)*rareCycle;
  const phase=(shiftedNow%rareCycle)/rareCycle;
  const windowStart=.66+ambientFishRand(90,3)*.14;
  const windowSize=.13+ambientFishRand(90,4)*.08;
  if(phase>windowStart&&phase<windowStart+windowSize){
    const t=(phase-windowStart)/windowSize;
    const alpha=Math.sin(t*Math.PI)*(.035+ambientFishRand(90,5)*.03);
    const dir=ambientFishRand(90,6)<.5?1:-1;
    const x=dir>0?canvas.width*(t*1.28-.16):canvas.width*(1.16-t*1.28);
    const y=canvas.height*(.18+ambientFishRand(90,7)*.58) + Math.sin(now*(.00012+ambientFishRand(90,8)*.00012))*24;
    const hugePalette=["rgba(255,209,235,1)","rgba(160,225,255,1)","rgba(255,226,140,1)","rgba(205,190,255,1)"];
    const tint=hugePalette[Math.floor(ambientFishRand(90,9)*hugePalette.length)%hugePalette.length];
    drawOneAmbientFish(x,y,dir,1.35+ambientFishRand(90,10)*.75,alpha,tint,now*.00024+ambientFishRand(90,11)*6,true);
  }
}

// Corazones de fondo, suaves y lentos, también con posición distinta por partida.
const heartCount=lowPerfMode?1:3;
for(let h=0;h<heartCount;h++){
  const cycle=23000+ambientFishRand(120+h,1)*16000;
  const phase=((now+ambientFishRand(120+h,2)*cycle)%cycle)/cycle;
  const x=canvas.width*(phase*1.22-.11);
  const y=canvas.height*(.16+ambientFishRand(120+h,3)*.62)+Math.sin(now*(.00022+ambientFishRand(120+h,4)*.00022)+h)*18;
  const alpha=.025+Math.sin(phase*Math.PI)*(.035+ambientFishRand(120+h,5)*.035);
  drawAmbientBackgroundHeart(x,y,.28+ambientFishRand(120+h,6)*.22,alpha,Math.sin(now*.00025+h)*.18,ambientFishRand(120+h,7)<.5?"rgba(255,174,204,1)":"rgba(255,122,168,1)");
}
}

function drawOneAmbientFish(x,y,dir,scale,alpha,tint,wave,giant){
ctx.save();
ctx.translate(x,y);
if(dir<0)ctx.scale(-1,1);
ctx.rotate(Math.sin(wave||0)*(giant?.035:.055));
ctx.scale(scale,scale);
ctx.globalAlpha=alpha;
ctx.fillStyle=tint;
ctx.shadowBlur=lowPerfMode?0:(giant?18:10);
ctx.shadowColor=tint.replace(',1)',`,${giant?.16:.13})`);

ctx.beginPath();
ctx.ellipse(0,0,24,12,0,0,Math.PI*2);
ctx.fill();

ctx.beginPath();
ctx.moveTo(-24,0);
ctx.lineTo(-42,-12);
ctx.lineTo(-37,0);
ctx.lineTo(-42,12);
ctx.closePath();
ctx.fill();

ctx.beginPath();
ctx.moveTo(2,-4);
ctx.quadraticCurveTo(-2,-16,-11,-18);
ctx.quadraticCurveTo(-3,-10,4,-8);
ctx.closePath();
ctx.fill();

ctx.beginPath();
ctx.moveTo(4,4);
ctx.quadraticCurveTo(-3,14,-14,16);
ctx.quadraticCurveTo(-5,8,3,7);
ctx.closePath();
ctx.fill();

ctx.globalAlpha*=.45;
ctx.fillStyle="#f7fbff";
ctx.beginPath();
ctx.ellipse(8,-3,6,2.5,-.25,0,Math.PI*2);
ctx.fill();
ctx.restore();
}


function drawBackground(){
ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.globalCompositeOperation="source-over";
const now=performance.now();
const gradient=ctx.createLinearGradient(0,0,0,canvas.height);
gradient.addColorStop(0,"#171326");gradient.addColorStop(.55,"#2b2144");gradient.addColorStop(1,"#3d2b58");
ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);

// Luces suaves de fondo para que el escenario no se vea plano.
const glow1=ctx.createRadialGradient(canvas.width*.22,canvas.height*.2,0,canvas.width*.22,canvas.height*.2,canvas.width*.55);
glow1.addColorStop(0,"rgba(255,122,168,.20)");glow1.addColorStop(.48,"rgba(255,122,168,.06)");glow1.addColorStop(1,"rgba(255,122,168,0)");
ctx.fillStyle=glow1;ctx.fillRect(0,0,canvas.width,canvas.height);
const glow2=ctx.createRadialGradient(canvas.width*.82,canvas.height*.82,0,canvas.width*.82,canvas.height*.82,canvas.width*.52);
glow2.addColorStop(0,"rgba(76,201,240,.16)");glow2.addColorStop(.5,"rgba(76,201,240,.05)");glow2.addColorStop(1,"rgba(76,201,240,0)");
ctx.fillStyle=glow2;ctx.fillRect(0,0,canvas.width,canvas.height);

// Peces decorativos muy suaves por el fondo, para dar más vida sin molestar.
drawAmbientBackgroundFish(now);

// Patrón muy sutil de puntitos/estrellas en movimiento.
if(!lowPerfMode){
for(let i=0;i<58;i++){
  const x=(i*173+now*.012*(1+i%3))%canvas.width;
  const y=(i*97+Math.sin(now*.0007+i)*10)%canvas.height;
  const r=1.2+(i%5)*.55;
  ctx.globalAlpha=.10+(i%4)*.025;
  ctx.fillStyle=i%7===0?"#ffd166":(i%5===0?"#ffafcc":"#ffffff");
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
ctx.globalAlpha=1;
}


// Viñeta suave para centrar la mirada.
const vignette=ctx.createRadialGradient(canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.18,canvas.width/2,canvas.height/2,Math.max(canvas.width,canvas.height)*.72);
vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(5,3,12,.34)");
ctx.fillStyle=vignette;ctx.fillRect(0,0,canvas.width,canvas.height);
}

function drawEntityShadow(x,y,w,h,alpha=.18){
if(!Number.isFinite(x)||!Number.isFinite(y))return;
ctx.save();
ctx.globalAlpha=alpha;
ctx.fillStyle="#05030a";
ctx.beginPath();
ctx.ellipse(x,y+h*.72,w,h,0,0,Math.PI*2);
ctx.fill();
ctx.restore();
}

function drawPlayer(){
drawEntityShadow(player.x,player.y,player.r*1.05,player.r*.34,.20);
ctx.save();
ctx.translate(player.x,player.y);
ctx.rotate(player.angle);

const starOn=isPowerStarActive();
const sevenOn=isSevenLivesActive();
const starEnding=starOn&&starTime<=3;
const blinkInvisible=starEnding&&Math.sin(performance.now()*0.035)>0;
const hurtScale=player.hurtAnim>0?1.08:1;
const starPulse=starOn?1+Math.sin(performance.now()*0.018)*.08:(sevenOn?1+Math.sin(performance.now()*0.025)*.05:1);
ctx.scale(hurtScale*starPulse,hurtScale*starPulse);

if(starOn){
  ctx.shadowColor=starEnding?"#ff4d8d":"#ffd166";
  ctx.shadowBlur=starEnding?34:22;
  if(starEnding&&blinkInvisible)ctx.globalAlpha=.42;
}else if(sevenOn){
  ctx.shadowColor=sevenLivesTime<=2.2?"#ffd166":"#80ed99";
  ctx.shadowBlur=sevenLivesTime<=2.2?30:22;
  if(sevenLivesTime<=2.2&&Math.sin(performance.now()*0.04)>0)ctx.globalAlpha=.62;
}

ctx.fillStyle=starOn?`hsl(${(performance.now()/6)%360},100%,70%)`:(sevenOn?"#80ed99":(player.hurtAnim>0?"#ff6b9a":"#7048e8"));
ctx.beginPath();
ctx.arc(0,0,player.r,0,Math.PI*2);
ctx.fill();
ctx.strokeStyle=starOn?"rgba(255,255,255,.88)":"rgba(255,214,231,.8)";
ctx.lineWidth=3;
ctx.stroke();
ctx.fillStyle="rgba(255,255,255,.16)";
ctx.beginPath();ctx.arc(-player.r*.28,-player.r*.36,player.r*.28,0,Math.PI*2);ctx.fill();

if(starOn){
  ctx.strokeStyle=starEnding?"#ff4d8d":"#fff176";
  ctx.lineWidth=starEnding?5:3;
  ctx.globalAlpha=starEnding&&blinkInvisible?.9:.75;
  ctx.beginPath();
  ctx.arc(0,0,player.r+9+Math.sin(performance.now()*0.03)*3,0,Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha=starEnding&&blinkInvisible?.42:1;
}else if(sevenOn){
  ctx.strokeStyle=sevenLivesTime<=2.2?"#ffd166":"#80ed99";
  ctx.lineWidth=4;
  ctx.globalAlpha=.78;
  ctx.beginPath();
  ctx.arc(0,0,player.r+10+Math.sin(performance.now()*0.032)*4,0,Math.PI*2);
  ctx.stroke();
  ctx.globalAlpha=1;
}

ctx.shadowBlur=0;
ctx.fillStyle="#ffffff";
ctx.beginPath();
ctx.arc(7,-7,5,0,Math.PI*2);
ctx.arc(7,7,5,0,Math.PI*2);
ctx.fill();
ctx.fillStyle="#2b133f";
ctx.beginPath();
ctx.arc(9,-7,2,0,Math.PI*2);
ctx.arc(9,7,2,0,Math.PI*2);
ctx.fill();

const kick=player.shootAnim>0?10:0;
ctx.translate(36+kick,0);
ctx.strokeStyle=starOn?(starEnding?"#ff4d8d":"#fff176"):"#ff8fab";
ctx.lineWidth=7;
ctx.lineCap="round";
ctx.beginPath();
ctx.moveTo(-22,0);
ctx.lineTo(0,0);
ctx.stroke();
ctx.strokeStyle=starOn?(starEnding?"#ff4d8d":"#ffd166"):"#ff8fab";
ctx.lineWidth=3;
ctx.fillStyle=starOn?(starEnding?"#ffd6e7":"#fff3bf"):"#ffc2d1";
// Almohadilla central (pad)
ctx.beginPath();
ctx.ellipse(6,0,12,10,0,0,Math.PI*2);
ctx.fill();
ctx.stroke();
// 4 dedos claramente por delante del pad (pad acaba en x≈18, dedos empiezan en x=24)
const toes=[{x:24,y:-13,r:4.4},{x:32,y:-5,r:5.1},{x:32,y:5,r:5.1},{x:24,y:13,r:4.4}];
toes.forEach(t=>{ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.stroke()});
ctx.restore();
}

function drawPlayerLifeBar(){
const max=upgrades&&upgrades.maxLife?upgrades.maxLife:100;
if(life>=max||!gameStarted||gameOver)return;
const pct=Math.max(0,Math.min(1,life/max));
const w=58,h=8,x=player.x-w/2,y=player.y-player.r-24;
ctx.save();
ctx.globalAlpha=.94;
ctx.fillStyle="rgba(20,15,28,.72)";
ctx.strokeStyle="rgba(255,214,231,.55)";
ctx.lineWidth=1.5;
roundRect(ctx,x,y,w,h,999);
ctx.fill();
ctx.stroke();
ctx.fillStyle=pct>.45?"#ff7aa8":pct>.22?"#ffd166":"#ff4d6d";
roundRect(ctx,x+1.5,y+1.5,(w-3)*pct,h-3,999);
ctx.fill();
ctx.restore();
}

function roundRect(ctx,x,y,w,h,r){
const rr=Math.min(r,w/2,h/2);
ctx.beginPath();
ctx.moveTo(x+rr,y);
ctx.lineTo(x+w-rr,y);
ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
ctx.lineTo(x+w,y+h-rr);
ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
ctx.lineTo(x+rr,y+h);
ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
ctx.lineTo(x,y+rr);
ctx.quadraticCurveTo(x,y,x+rr,y);
ctx.closePath();
}

function drawShield(){
if(!upgrades.shield)return;
const shieldLvl=effectLevel("shield");
const shieldR=52+shieldLvl*4,orbs=2+Math.min(4,shieldLvl),orbSize=12+Math.min(12,shieldLvl*1.7);
for(let i=0;i<orbs;i++){
const a=shieldAngle+i*Math.PI*2/orbs,x=player.x+Math.cos(a)*shieldR,y=player.y+Math.sin(a)*shieldR;
ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
ctx.fillStyle=shieldLvl>=5?"#ffd166":"#90e0ef";ctx.beginPath();ctx.ellipse(0,0,orbSize,orbSize*.55,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle=shieldLvl>=5?"#ffb703":"#48cae4";ctx.beginPath();ctx.moveTo(-orbSize*.85,0);ctx.lineTo(-orbSize*1.6,-orbSize*.55);ctx.lineTo(-orbSize*1.6,orbSize*.55);ctx.closePath();ctx.fill();
ctx.fillStyle="#111";ctx.beginPath();ctx.arc(7,-2,2,0,Math.PI*2);ctx.fill();ctx.restore()
}
}

function drawFish(f){
drawEntityShadow(f.x,f.y,18*(f.scale||1),5*(f.scale||1),.10);
ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.scale(f.scale||1,f.scale||1);
ctx.shadowColor=f.giantEaster?"#ffd166":f.cardumenGigante?"#80d8ff":f.boomerang?"#80ed99":f.crit?"#ff6b6b":f.shieldShot?"#ffd166":"#4cc9f0";ctx.shadowBlur=f.giantEaster?28:(f.cardumenGigante?18:(f.crit?14:8));
ctx.fillStyle=f.giantEaster?"#ffd166":f.cardumenGigante?"#80d8ff":f.boomerang?"#80ed99":f.crit?"#ff6b6b":f.shieldShot?"#ffd166":"#4cc9f0";ctx.beginPath();ctx.ellipse(0,0,16,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.72)";ctx.lineWidth=1.6;ctx.stroke();
ctx.fillStyle=f.giantEaster?"#fb8500":f.cardumenGigante?"#00b4d8":f.boomerang?"#57cc99":f.crit?"#e03131":f.shieldShot?"#ffb703":"#4895ef";ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(-27,-9);ctx.lineTo(-27,9);ctx.closePath();ctx.fill();
ctx.fillStyle="#111111";ctx.beginPath();ctx.arc(8,-2,2,0,Math.PI*2);ctx.fill();ctx.restore()
}

function drawCat(cat){
drawEntityShadow(cat.x,cat.y,cat.r*.9,cat.r*.26,.17);
ctx.save();ctx.translate(cat.x,cat.y);const spawnScale=cat.maxSpawnAnim?Math.max(.05,1-(cat.spawnAnim||0)/cat.maxSpawnAnim):1;ctx.scale(spawnScale,spawnScale);const knocked=Math.hypot(cat.knockVx||0,cat.knockVy||0)>60;if(knocked){ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle="#ffd166";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,cat.r+10+Math.sin(performance.now()*0.035)*3,0,Math.PI*2);ctx.stroke();ctx.restore();}const squeeze=cat.hitAnim>0?1.16:1;ctx.scale(squeeze,1/squeeze);
if(cat.rainbow){const g=ctx.createLinearGradient(-cat.r,-cat.r,cat.r,cat.r);g.addColorStop(0,"#ff4d8d");g.addColorStop(.2,"#ffd166");g.addColorStop(.4,"#70e000");g.addColorStop(.6,"#4cc9f0");g.addColorStop(.8,"#9b5de5");g.addColorStop(1,"#ff4d8d");ctx.fillStyle=g}else ctx.fillStyle=cat.color;
ctx.beginPath();ctx.arc(0,0,cat.r,0,Math.PI*2);ctx.fill();
ctx.strokeStyle=cat.rainbow?"rgba(255,255,255,.75)":"rgba(255,255,255,.55)";ctx.lineWidth=2.5;ctx.stroke();
ctx.fillStyle="rgba(255,255,255,.16)";ctx.beginPath();ctx.arc(-cat.r*.32,-cat.r*.36,cat.r*.24,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.moveTo(-18,-15);ctx.lineTo(-10,-36);ctx.lineTo(0,-16);ctx.closePath();ctx.fill();
ctx.beginPath();ctx.moveTo(18,-15);ctx.lineTo(10,-36);ctx.lineTo(0,-16);ctx.closePath();ctx.fill();
if(cat.type==="thief"){
  ctx.fillStyle="#111";ctx.fillRect(-17,-10,34,10);
  ctx.fillStyle="#ffd166";ctx.font="bold 18px Arial";ctx.textAlign="center";ctx.fillText("🪙",0,-31);
}else if(cat.type==="yarn"){
  ctx.strokeStyle="#f8f0ff";ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(0,2,cat.r*.58,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-13,4);ctx.quadraticCurveTo(0,-12,13,4);ctx.stroke();
  ctx.fillStyle="#fff";ctx.font="bold 17px Arial";ctx.textAlign="center";ctx.fillText("🧶",0,-32);
}
if(cat.type==="sleepy"){
  // Orejas interiores (color de alerta si está despierto)
  if(cat.sleepState==="awake"){ctx.fillStyle="#ff8fab";ctx.beginPath();ctx.moveTo(-18,-15);ctx.lineTo(-10,-36);ctx.lineTo(0,-16);ctx.closePath();ctx.moveTo(18,-15);ctx.lineTo(10,-36);ctx.lineTo(0,-16);ctx.closePath();ctx.fill();}
  // Z flotantes
  if(cat.sleepState==="sleeping"||!cat.sleepState){const ta=performance.now()/1000;const za=Math.abs(Math.sin(ta*1.4));ctx.save();ctx.globalAlpha=za;ctx.fillStyle="#7c5cbf";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText("z",cat.r-2,-20);ctx.globalAlpha=za*.55;ctx.font="bold 8px Arial";ctx.fillText("z",cat.r+8,-32);ctx.restore();}
  ctx.font=cat.sleepState==="awake"?"bold 20px Arial":"bold 14px Arial";ctx.textAlign="center";ctx.fillText(cat.sleepState==="awake"?"😡":"💤",0,-34);
}else if(cat.type==="mini"){
  ctx.font="9px Arial";ctx.textAlign="center";ctx.fillText("🐾",0,-17);
}else if(cat.type==="glutton"){
  ctx.strokeStyle="#c86a3c";ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,6,cat.r*.54,cat.r*.42,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,0.35)";ctx.beginPath();ctx.ellipse(0,6,10,8,0,0,Math.PI*2);ctx.fill();
  ctx.font="bold 15px Arial";ctx.textAlign="center";ctx.fillText("🍽️",0,-36);
}else if(cat.type==="musician"){
  ctx.save();ctx.globalAlpha=.22+.08*Math.sin(performance.now()/180);ctx.strokeStyle=(cat.musicImmuneTimer||0)>0?"#ffd166":"#f06595";ctx.lineWidth=(cat.musicImmuneTimer||0)>0?6:4;ctx.beginPath();ctx.arc(0,0,cat.r+18+((cat.musicImmuneTimer||0)>0?5:0),0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.strokeStyle="#9b4fba";ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(0,-4,15,.75*Math.PI,.25*Math.PI,true);ctx.stroke();
  ctx.fillStyle="#9b4fba";ctx.beginPath();ctx.ellipse(-15,1,5,7,-.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(15,1,5,7,.2,0,Math.PI*2);ctx.fill();
  const tNote=performance.now()/1000;const na=tNote*2.6;
  ctx.font="bold 15px Arial";ctx.textAlign="center";ctx.save();ctx.translate(Math.cos(na)*28,Math.sin(na)*12-10);ctx.fillText("♪",0,0);ctx.restore();
  ctx.save();ctx.translate(Math.cos(na+Math.PI)*28,Math.sin(na+Math.PI)*12-10);ctx.fillText("♩",0,0);ctx.restore();
}else if(cat.type==="student"){
  ctx.strokeStyle="#2c5fa8";ctx.lineWidth=2;ctx.beginPath();ctx.arc(-8,-4,5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(8,-4,5,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(3,-4);ctx.stroke();ctx.beginPath();ctx.moveTo(-13,-4);ctx.lineTo(-16,-2);ctx.stroke();ctx.beginPath();ctx.moveTo(13,-4);ctx.lineTo(16,-2);ctx.stroke();
  ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillText("📚",0,-34);
  const sl=cat.studyLevel||0;if(sl>0){ctx.fillStyle="rgba(255,255,255,0.85)";ctx.fillRect(-17,-53,34,5);ctx.fillStyle=sl>=4?"#ff4d6d":"#ffd166";ctx.fillRect(-17,-53,34*(sl/5),5);ctx.fillStyle="#fff";ctx.font="bold 10px Arial";ctx.fillText(sl>=5?"EXAMEN":"ESTUDIA",0,-59);}
}
if(cat.type==="sleepy"&&cat.sleepState!=="awake"){ctx.strokeStyle="#44222b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-4);ctx.lineTo(-6,-4);ctx.stroke();ctx.beginPath();ctx.moveTo(6,-4);ctx.lineTo(12,-4);ctx.stroke();}else{ctx.fillStyle="#44222b";ctx.beginPath();ctx.arc(-9,-4,3,0,Math.PI*2);ctx.arc(9,-4,3,0,Math.PI*2);ctx.fill();}
ctx.strokeStyle="#44222b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(0,9);ctx.stroke();
ctx.beginPath();ctx.arc(-5,9,5,0,Math.PI);ctx.arc(5,9,5,0,Math.PI);ctx.stroke();
ctx.strokeStyle="#5a2a3a";ctx.beginPath();ctx.moveTo(-15,4);ctx.lineTo(-31,0);ctx.moveTo(-15,9);ctx.lineTo(-32,11);ctx.moveTo(15,4);ctx.lineTo(31,0);ctx.moveTo(15,9);ctx.lineTo(32,11);ctx.stroke();
if(cat.maxHp>1){ctx.fillStyle="rgba(255,255,255,0.85)";ctx.fillRect(-18,-48,36,5);ctx.fillStyle=cat.rainbow?"#ffd166":cat.type==="thief"?"#ffd166":cat.type==="yarn"?"#b197fc":cat.type==="sleepy"?"#c8b6e2":cat.type==="glutton"?"#e8956d":cat.type==="musician"?"#d084c8":cat.type==="student"?"#74b9ff":"#ff8fab";ctx.fillRect(-18,-48,36*Math.max(0,cat.hp/cat.maxHp),5)}
ctx.restore()
}

function drawBoss(){
if(!boss||!isFinitePos(boss))return;
const now=performance.now()/1000;
drawEntityShadow(boss.x,boss.y,boss.r*1.12,boss.r*.34,boss.type==="demon"?.34:.22);
if(boss.type==="seal"){
ctx.save();ctx.globalAlpha=.33;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(boss.shadowX,boss.shadowY,boss.r*.98,boss.r*.34,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
ctx.save();
ctx.translate(boss.x,boss.y);
const sc=(boss.hitAnim>0?1.08:1)*(boss.type==="demon"?1+Math.sin(boss.wobble*4)*.035:1);
ctx.scale(sc,sc);
const r=boss.r;
ctx.lineJoin="round";ctx.lineCap="round";

if(boss.type==="giantCat"){
  // Jefe gato: cabeza kawaii grande, contorno grueso, coloretes y bigotes como el referente.
  ctx.save();
  ctx.rotate(Math.sin(boss.wobble)*.025);
  ctx.shadowColor="rgba(255,185,220,.45)";ctx.shadowBlur=22;
  ctx.fillStyle="#fff7e8";
  ctx.strokeStyle="#241f27";
  ctx.lineWidth=Math.max(5,r*.08);
  ctx.beginPath();
  ctx.moveTo(-r*.78,-r*.34);
  ctx.lineTo(-r*.98,-r*1.00);
  ctx.lineTo(-r*.35,-r*.70);
  ctx.quadraticCurveTo(0,-r*.88,r*.35,-r*.70);
  ctx.lineTo(r*.98,-r*1.00);
  ctx.lineTo(r*.78,-r*.34);
  ctx.quadraticCurveTo(r*.98,r*.34,r*.42,r*.72);
  ctx.quadraticCurveTo(0,r*.96,-r*.42,r*.72);
  ctx.quadraticCurveTo(-r*.98,r*.34,-r*.78,-r*.34);
  ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle="#ffb6a8";
  ctx.beginPath();ctx.moveTo(-r*.76,-r*.52);ctx.lineTo(-r*.86,-r*.82);ctx.lineTo(-r*.52,-r*.64);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(r*.76,-r*.52);ctx.lineTo(r*.86,-r*.82);ctx.lineTo(r*.52,-r*.64);ctx.closePath();ctx.fill();
  ctx.fillStyle="#1f2026";
  ctx.beginPath();ctx.ellipse(-r*.32,-r*.12,r*.13,r*.17,0,0,Math.PI*2);ctx.ellipse(r*.32,-r*.12,r*.13,r*.17,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";
  ctx.beginPath();ctx.arc(-r*.36,-r*.18,r*.035,0,Math.PI*2);ctx.arc(r*.28,-r*.18,r*.035,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffb5a8";
  ctx.beginPath();ctx.ellipse(-r*.56,r*.16,r*.18,r*.11,0,0,Math.PI*2);ctx.ellipse(r*.56,r*.16,r*.18,r*.11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#22232a";
  ctx.beginPath();ctx.ellipse(0,r*.08,r*.09,r*.06,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#22232a";ctx.lineWidth=Math.max(3,r*.045);
  ctx.beginPath();ctx.moveTo(0,r*.12);ctx.lineTo(0,r*.25);ctx.stroke();
  ctx.beginPath();ctx.arc(-r*.10,r*.25,r*.10,0,Math.PI);ctx.arc(r*.10,r*.25,r*.10,0,Math.PI);ctx.stroke();
  ctx.lineWidth=Math.max(3,r*.04);
  ctx.beginPath();
  ctx.moveTo(-r*.55,r*.03);ctx.lineTo(-r*.92,-r*.04);
  ctx.moveTo(-r*.55,r*.16);ctx.lineTo(-r*.96,r*.17);
  ctx.moveTo(r*.55,r*.03);ctx.lineTo(r*.92,-r*.04);
  ctx.moveTo(r*.55,r*.16);ctx.lineTo(r*.96,r*.17);
  ctx.stroke();
  ctx.restore();

}else if(boss.type==="duck"){
  // Jefe pato: patito de goma clásico, más redondo, limpio y reconocible.
  ctx.save();
  ctx.rotate(Math.sin(boss.wobble*1.1)*.018);
  ctx.shadowColor="rgba(255,213,43,.42)";ctx.shadowBlur=24;

  // Cuerpo horizontal de goma
  const duckBody=ctx.createRadialGradient(-r*.15,-r*.30,r*.12,0,0,r*1.28);
  duckBody.addColorStop(0,"#fff27a");
  duckBody.addColorStop(.42,"#ffd22a");
  duckBody.addColorStop(1,"#f2ae00");
  ctx.fillStyle=duckBody;
  ctx.strokeStyle="#e6a000";
  ctx.lineWidth=Math.max(4,r*.05);
  ctx.beginPath();
  ctx.moveTo(-r*.78,r*.10);
  ctx.quadraticCurveTo(-r*.98,r*.42,-r*.60,r*.68);
  ctx.quadraticCurveTo(-r*.08,r*1.00,r*.62,r*.66);
  ctx.quadraticCurveTo(r*1.06,r*.44,r*.92,r*.06);
  ctx.quadraticCurveTo(r*.75,-r*.26,r*.30,-r*.22);
  ctx.quadraticCurveTo(-r*.16,-r*.20,-r*.42,-r*.02);
  ctx.quadraticCurveTo(-r*.62,-r*.10,-r*.78,r*.10);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Cabeza grande y redonda por encima del cuerpo
  const duckHead=ctx.createRadialGradient(-r*.30,-r*.78,r*.08,-r*.12,-r*.56,r*.52);
  duckHead.addColorStop(0,"#fff58a");
  duckHead.addColorStop(.48,"#ffd735");
  duckHead.addColorStop(1,"#f4b600");
  ctx.fillStyle=duckHead;
  ctx.beginPath();ctx.arc(-r*.18,-r*.50,r*.47,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;

  // Colita levantada
  ctx.fillStyle="#ffd32a";ctx.strokeStyle="#e6a000";ctx.lineWidth=Math.max(3,r*.042);
  ctx.beginPath();
  ctx.moveTo(r*.62,-r*.08);
  ctx.quadraticCurveTo(r*.96,-r*.38,r*1.02,-r*.05);
  ctx.quadraticCurveTo(r*.92,r*.18,r*.66,r*.14);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Ala sencilla de goma
  ctx.fillStyle="rgba(255,202,0,.92)";
  ctx.beginPath();
  ctx.moveTo(-r*.06,r*.22);
  ctx.quadraticCurveTo(r*.26,r*.04,r*.55,r*.20);
  ctx.quadraticCurveTo(r*.36,r*.42,r*.05,r*.40);
  ctx.quadraticCurveTo(-r*.16,r*.34,-r*.06,r*.22);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Pico corto de dos piezas, mirando a la izquierda
  const beak=ctx.createLinearGradient(-r*.50,-r*.50,-r*1.05,-r*.38);
  beak.addColorStop(0,"#ff9b18");beak.addColorStop(1,"#ff5f00");
  ctx.fillStyle=beak;ctx.strokeStyle="#df6100";ctx.lineWidth=Math.max(3,r*.04);
  ctx.beginPath();
  ctx.moveTo(-r*.54,-r*.52);
  ctx.quadraticCurveTo(-r*.92,-r*.62,-r*1.08,-r*.43);
  ctx.quadraticCurveTo(-r*.86,-r*.28,-r*.52,-r*.34);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r*.52,-r*.34);
  ctx.quadraticCurveTo(-r*.86,-r*.30,-r*1.02,-r*.15);
  ctx.quadraticCurveTo(-r*.80,-r*.06,-r*.48,-r*.16);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Ojo negro brillante
  ctx.fillStyle="#111217";
  ctx.beginPath();ctx.ellipse(-r*.28,-r*.68,r*.075,r*.11,.25,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-r*.255,-r*.715,r*.024,r*.035,.25,0,Math.PI*2);ctx.fill();

  // Brillos tipo goma
  ctx.fillStyle="rgba(255,255,255,.25)";
  ctx.beginPath();ctx.ellipse(-r*.22,-r*.83,r*.18,r*.06,-.18,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(.05*r,.33*r,r*.46,r*.07,.04,0,Math.PI*2);ctx.fill();
  ctx.restore();

}else if(boss.type==="seal"){
  // Jefe foca: más achuchable, con cuerpo de peluche, cara clara y aletas bien separadas.
  ctx.save();
  ctx.rotate((boss.state==="stunned"?.11:0)+Math.sin(boss.wobble)*.014);
  ctx.shadowColor="rgba(190,210,215,.36)";ctx.shadowBlur=22;

  const sealBody=ctx.createRadialGradient(r*.08,-r*.45,r*.10,0,0,r*1.35);
  sealBody.addColorStop(0,boss.state==="stunned"?"#edf8ff":"#d5dbd5");
  sealBody.addColorStop(.55,boss.state==="stunned"?"#bfd7eb":"#879290");
  sealBody.addColorStop(1,boss.state==="stunned"?"#7fa8c8":"#5f6b6a");
  ctx.fillStyle=sealBody;ctx.strokeStyle="#282b2c";ctx.lineWidth=Math.max(5,r*.068);

  // Cuerpo redondo tumbado
  ctx.beginPath();
  ctx.moveTo(-r*.92,r*.22);
  ctx.quadraticCurveTo(-r*.84,-r*.58,-r*.28,-r*.82);
  ctx.quadraticCurveTo(r*.42,-r*1.12,r*.88,-r*.54);
  ctx.quadraticCurveTo(r*1.22,-r*.10,r*.88,r*.40);
  ctx.quadraticCurveTo(r*.48,r*.82,-r*.28,r*.66);
  ctx.quadraticCurveTo(-r*.72,r*.58,-r*.92,r*.22);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;

  // Cara/barriga clara grande
  ctx.fillStyle="#e9ebe2";
  ctx.beginPath();ctx.ellipse(r*.20,-r*.25,r*.54,r*.63,-.08,0,Math.PI*2);ctx.fill();

  // Cola doble a la izquierda
  ctx.fillStyle="#778282";ctx.strokeStyle="#282b2c";ctx.lineWidth=Math.max(4,r*.052);
  ctx.beginPath();
  ctx.moveTo(-r*.90,r*.17);
  ctx.quadraticCurveTo(-r*1.24,-r*.08,-r*1.28,r*.18);
  ctx.quadraticCurveTo(-r*1.10,r*.36,-r*.90,r*.30);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r*.84,r*.23);
  ctx.quadraticCurveTo(-r*1.08,r*.52,-r*.82,r*.62);
  ctx.quadraticCurveTo(-r*.62,r*.50,-r*.66,r*.30);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Aletas delanteras
  ctx.beginPath();ctx.ellipse(-r*.22,r*.48,r*.19,r*.30,.20,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(r*.62,r*.34,r*.16,r*.26,-.58,0,Math.PI*2);ctx.fill();ctx.stroke();

  // Manchitas
  ctx.fillStyle="#6f7b7b";
  [[-.32,-.58,.08],[-.12,-.68,.07],[.08,-.72,.09],[-.48,-.36,.06],[-.22,-.26,.055]].forEach(p=>{ctx.beginPath();ctx.ellipse(r*p[0],r*p[1],r*p[2],r*p[2]*.70,-.25,0,Math.PI*2);ctx.fill();});

  // Ojos, nariz y mofletes
  ctx.fillStyle="#202326";
  ctx.beginPath();ctx.arc(r*.02,-r*.22,r*.07,0,Math.PI*2);ctx.arc(r*.38,-r*.22,r*.07,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffd1d5";ctx.globalAlpha=.86;
  ctx.beginPath();ctx.ellipse(-r*.12,-r*.02,r*.14,r*.085,0,0,Math.PI*2);ctx.ellipse(r*.54,-r*.02,r*.14,r*.085,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle="#202326";
  ctx.beginPath();ctx.ellipse(r*.20,-r*.08,r*.09,r*.065,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#202326";ctx.lineWidth=Math.max(3,r*.033);
  ctx.beginPath();
  ctx.moveTo(r*.20,-r*.02);ctx.quadraticCurveTo(r*.08,r*.10,-r*.05,r*.04);
  ctx.moveTo(r*.20,-r*.02);ctx.quadraticCurveTo(r*.32,r*.10,r*.45,r*.04);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r*.02,-r*.05);ctx.lineTo(-r*.26,-r*.14);
  ctx.moveTo(-r*.02,r*.03);ctx.lineTo(-r*.28,r*.02);
  ctx.moveTo(r*.40,-r*.05);ctx.lineTo(r*.68,-r*.14);
  ctx.moveTo(r*.40,r*.03);ctx.lineTo(r*.68,r*.02);
  ctx.stroke();

  if(boss.state==="stunned"){
    ctx.fillStyle="#5a2a3a";ctx.font="bold 18px Arial";ctx.textAlign="center";ctx.fillText("zzz",r*.22,-r*.92)
  }
  ctx.restore();

}else if(boss.type==="demon"){
  // Jefe demonio: más enfadado, cuernos torcidos y dientes integrados dentro de la boca.
  ctx.save();
  const shake=(boss.hp<boss.maxHp*.5)?(Math.random()*2.8-1.4):(Math.random()*.9-.45);
  ctx.translate(shake,shake);

  // Aura más agresiva
  ctx.shadowColor="#ff2aa8";ctx.shadowBlur=34;
  ctx.strokeStyle="rgba(255,42,168,.38)";ctx.lineWidth=Math.max(4,r*.055);
  ctx.beginPath();ctx.arc(0,0,r+10+Math.sin(now*8)*4,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="rgba(120,20,255,.28)";
  ctx.beginPath();ctx.arc(0,0,r+20+Math.sin(now*5)*5,0,Math.PI*2);ctx.stroke();

  // Cuernos torcidos/asimétricos, detrás de la cabeza
  const hornGrad=ctx.createLinearGradient(0,-r*1.18,0,-r*.20);
  hornGrad.addColorStop(0,"#030207");
  hornGrad.addColorStop(.48,"#2a1834");
  hornGrad.addColorStop(1,"#07030b");
  ctx.fillStyle=hornGrad;ctx.strokeStyle="#120719";ctx.lineWidth=Math.max(4,r*.055);
  ctx.beginPath();
  ctx.moveTo(-r*.42,-r*.46);
  ctx.bezierCurveTo(-r*.78,-r*.78,-r*.90,-r*1.22,-r*1.20,-r*1.06);
  ctx.bezierCurveTo(-r*1.02,-r*.76,-r*.92,-r*.42,-r*.27,-r*.20);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r*.40,-r*.48);
  ctx.bezierCurveTo(r*.80,-r*.86,r*.82,-r*1.24,r*1.16,-r*1.02);
  ctx.bezierCurveTo(r*.96,-r*.70,r*.88,-r*.36,r*.24,-r*.18);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Cara redonda roja/morada
  const face=ctx.createRadialGradient(-r*.22,-r*.42,r*.10,0,0,r*1.14);
  face.addColorStop(0,"#ff7a99");
  face.addColorStop(.24,"#ff314d");
  face.addColorStop(.62,"#d01846");
  face.addColorStop(1,"#7b0fb9");
  ctx.fillStyle=face;ctx.strokeStyle="#870f40";ctx.lineWidth=Math.max(5,r*.062);
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;

  // Ojos muy enfadados: blancos amarillos inclinados hacia el centro
  ctx.fillStyle="#f4ff6b";
  ctx.beginPath();
  ctx.moveTo(-r*.58,-r*.17);
  ctx.quadraticCurveTo(-r*.34,-r*.36,-r*.10,-r*.16);
  ctx.quadraticCurveTo(-r*.32,-r*.02,-r*.58,-r*.17);
  ctx.closePath();
  ctx.moveTo(r*.58,-r*.17);
  ctx.quadraticCurveTo(r*.34,-r*.36,r*.10,-r*.16);
  ctx.quadraticCurveTo(r*.32,-r*.02,r*.58,-r*.17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle="#171018";
  ctx.beginPath();ctx.ellipse(-r*.32,-r*.16,r*.045,r*.062,-.20,0,Math.PI*2);ctx.ellipse(r*.32,-r*.16,r*.045,r*.062,.20,0,Math.PI*2);ctx.fill();

  // Cejas gruesas descendiendo hacia el centro para que se lea enfado, no tristeza
  ctx.fillStyle="#2b0715";
  ctx.beginPath();
  ctx.moveTo(-r*.66,-r*.42);ctx.lineTo(-r*.08,-r*.22);ctx.lineTo(-r*.14,-r*.11);ctx.lineTo(-r*.70,-r*.31);ctx.closePath();
  ctx.moveTo(r*.66,-r*.42);ctx.lineTo(r*.08,-r*.22);ctx.lineTo(r*.14,-r*.11);ctx.lineTo(r*.70,-r*.31);ctx.closePath();
  ctx.fill();

  // Boca negra con línea superior recta: menos sonrisa y más rabia
  ctx.fillStyle="#17040b";ctx.strokeStyle="#4b0920";ctx.lineWidth=Math.max(4,r*.045);
  ctx.beginPath();
  ctx.moveTo(-r*.44,r*.18);
  ctx.quadraticCurveTo(-r*.18,r*.28,0,r*.24);
  ctx.quadraticCurveTo(r*.18,r*.28,r*.44,r*.18);
  ctx.quadraticCurveTo(r*.34,r*.66,0,r*.73);
  ctx.quadraticCurveTo(-r*.34,r*.66,-r*.44,r*.18);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Encía/línea roja superior para integrar los dientes con la boca
  ctx.strokeStyle="#7d1230";ctx.lineWidth=Math.max(3,r*.035);
  ctx.beginPath();ctx.moveTo(-r*.38,r*.22);ctx.quadraticCurveTo(0,r*.30,r*.38,r*.22);ctx.stroke();

  // Dientes superiores integrados y mejor alineados
  ctx.fillStyle="#fff5e8";ctx.strokeStyle="rgba(60,15,22,.18)";ctx.lineWidth=Math.max(1,r*.012);
  [
    [-.34,.22,-.25,.22,-.30,.46],
    [-.17,.25,-.07,.25,-.12,.52],
    [.02,.25,.12,.25,.07,.52],
    [.25,.22,.34,.22,.30,.46]
  ].forEach(d=>{
    ctx.beginPath();
    ctx.moveTo(r*d[0],r*d[1]);ctx.lineTo(r*d[2],r*d[3]);ctx.lineTo(r*d[4],r*d[5]);ctx.closePath();ctx.fill();ctx.stroke();
  });
  // Colmillos laterales más grandes pero dentro de la boca
  ctx.beginPath();ctx.moveTo(-r*.47,r*.20);ctx.lineTo(-r*.33,r*.20);ctx.lineTo(-r*.42,r*.58);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(r*.47,r*.20);ctx.lineTo(r*.33,r*.20);ctx.lineTo(r*.42,r*.58);ctx.closePath();ctx.fill();ctx.stroke();

  // Pequeños dientes inferiores, más cortos y centrados para que no parezcan rotos
  ctx.fillStyle="#fff5e8";
  [[-.16,.66,-.08,.66,-.12,.50],[.08,.66,.16,.66,.12,.50]].forEach(d=>{
    ctx.beginPath();ctx.moveTo(r*d[0],r*d[1]);ctx.lineTo(r*d[2],r*d[3]);ctx.lineTo(r*d[4],r*d[5]);ctx.closePath();ctx.fill();ctx.stroke();
  });

  // Brillo de bola
  ctx.fillStyle="rgba(255,255,255,.22)";
  ctx.beginPath();ctx.ellipse(-r*.30,-r*.50,r*.25,r*.09,-.45,0,Math.PI*2);ctx.fill();

  if(dogKidnapped){ctx.fillStyle="#ffd6e7";ctx.font="bold 14px Arial";ctx.textAlign="center";ctx.fillText("PERRO ROBADO",0,r+30)}
  ctx.restore();
}
ctx.restore();

ctx.save();
ctx.shadowColor="rgba(0,0,0,.45)";ctx.shadowBlur=10;
ctx.fillStyle="rgba(20,10,24,.62)";ctx.beginPath();ctx.roundRect(boss.x-76,boss.y-boss.r-38,152,18,9);ctx.fill();
ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,.82)";ctx.beginPath();ctx.roundRect(boss.x-70,boss.y-boss.r-32,140,8,4);ctx.fill();
const hpGrad=ctx.createLinearGradient(boss.x-70,boss.y,boss.x+70,boss.y);hpGrad.addColorStop(0,boss.type==="demon"?"#7209b7":"#ff4d6d");hpGrad.addColorStop(1,boss.type==="demon"?"#ff4d8d":"#ffd166");ctx.fillStyle=hpGrad;ctx.beginPath();ctx.roundRect(boss.x-70,boss.y-boss.r-32,140*Math.max(0,boss.hp/boss.maxHp),8,4);ctx.fill();
ctx.restore();
}

function drawQuack(q){
ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));
ctx.fillStyle=q.text==="QUACK!"?"#ffd166":"#f8edeb";ctx.strokeStyle="#fb8500";ctx.lineWidth=3;
ctx.beginPath();ctx.roundRect(-34,-16,68,32,12);ctx.fill();ctx.stroke();
ctx.fillStyle="#3a2f55";ctx.font="bold 14px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(q.text,0,0);ctx.restore()
}

function drawDemonOrb(o){
ctx.save();ctx.translate(o.x,o.y);
ctx.fillStyle="#16051f";ctx.strokeStyle="#ff4d8d";ctx.lineWidth=3;ctx.shadowColor="#9b5de5";ctx.shadowBlur=16;
ctx.beginPath();ctx.arc(0,0,o.r,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle="rgba(255,77,141,.75)";ctx.beginPath();ctx.arc(-4,-4,o.r*.35,0,Math.PI*2);ctx.fill();
ctx.restore()
}

function drawYarnBall(o){
ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.spin||0);
ctx.fillStyle="#d0bfff";ctx.strokeStyle="#845ef7";ctx.lineWidth=3;ctx.shadowColor="#b197fc";ctx.shadowBlur=10;
ctx.beginPath();ctx.arc(0,0,o.r,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.strokeStyle="#ffffff";ctx.lineWidth=2;
ctx.beginPath();ctx.arc(0,0,o.r*.65,0,Math.PI*2);ctx.stroke();
ctx.beginPath();ctx.moveTo(-o.r*.7,0);ctx.quadraticCurveTo(0,-o.r*.9,o.r*.7,0);ctx.stroke();
ctx.restore()
}

const _musicMelody=[523,659,784,659,523,392,440,523,587,659];
function playMusicianNote(){try{const ac=getAudioCtx();const g=ac.createGain();g.gain.setValueAtTime(.025,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.30);g.connect(ac.destination);const o=ac.createOscillator();o.type="triangle";o.frequency.setValueAtTime(_musicMelody[musicianMelodyIdx%_musicMelody.length],ac.currentTime);o.connect(g);o.start();o.stop(ac.currentTime+.32);musicianMelodyIdx++;}catch(e){}}
function drawTuna(t){
ctx.save();
ctx.translate(t.x,t.y+Math.sin(t.wobble)*3);
const a=Math.max(0,Math.min(1,t.life/3));
ctx.globalAlpha=a<1?a:1;
ctx.shadowColor="#06d6a0";ctx.shadowBlur=18;
ctx.fillStyle="#06d6a0";ctx.strokeStyle="#028a60";ctx.lineWidth=2.5;
ctx.beginPath();ctx.roundRect(-16,-10,32,20,6);ctx.fill();ctx.stroke();
ctx.shadowBlur=0;
ctx.fillStyle="#004030";ctx.beginPath();ctx.ellipse(0,-10,12,4,0,Math.PI,Math.PI*2);ctx.fill();
ctx.strokeStyle="#028a60";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-10,12,4,0,Math.PI,Math.PI*2);ctx.stroke();
ctx.font="13px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🐟",0,2);
ctx.restore();
}
function drawCoin(c){
ctx.save();ctx.translate(c.x,c.y);ctx.fillStyle="#ffd166";ctx.strokeStyle="#ffb703";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,c.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#8a5a00";ctx.font="bold 12px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(c.amount,0,1);ctx.restore()
}
function drawHeart(h){ctx.save();ctx.globalAlpha=Math.max(0,h.life/h.maxLife);ctx.translate(h.x,h.y);ctx.scale(h.size/20,h.size/20);ctx.fillStyle="#ff4d8d";ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(-18,-8,-10,-22,0,-10);ctx.bezierCurveTo(10,-22,18,-8,0,6);ctx.fill();ctx.restore()}
function drawSmoke(s){ctx.save();ctx.globalAlpha=Math.max(0,s.life/s.maxLife)*.45;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawPowerStar(s){
ctx.save();ctx.translate(s.x,s.y);ctx.rotate((s.wobble||0)*.55);
const pulse=1+Math.sin((s.wobble||0)*2)*.08;ctx.scale(pulse,pulse);
const fading=s.life<5;
const blinkHide=fading&&Math.sin(performance.now()*(s.life<2?.04:.022))>0;
if(blinkHide){ctx.restore();return;}
ctx.globalAlpha=fading?Math.max(.35,s.life/5):1;
ctx.shadowColor="#ffd166";ctx.shadowBlur=fading?8:18;
ctx.fillStyle="#ffd166";ctx.strokeStyle="#fff3bf";ctx.lineWidth=3;
ctx.beginPath();
for(let i=0;i<10;i++){
const a=-Math.PI/2+i*Math.PI/5;
const rr=i%2===0?s.r:s.r*.45;
const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
}
ctx.closePath();ctx.fill();ctx.stroke();
ctx.fillStyle="#3a2f55";ctx.beginPath();ctx.arc(-5,-3,2.5,0,Math.PI*2);ctx.arc(5,-3,2.5,0,Math.PI*2);ctx.fill();
ctx.restore()
}

function drawStarAura(){
if(!isPowerStarActive())return;
const t=performance.now()/120;
ctx.save();ctx.translate(player.x,player.y);ctx.globalAlpha=.55+Math.sin(t)*.15;ctx.shadowColor="#ffd166";ctx.shadowBlur=28;
ctx.strokeStyle=`hsl(${(t*35)%360},100%,75%)`;ctx.lineWidth=5;
ctx.beginPath();ctx.arc(0,0,player.r+18+Math.sin(t)*4,0,Math.PI*2);ctx.stroke();
for(let i=0;i<6;i++){
const a=t*.8+i*Math.PI*2/6;
ctx.fillStyle=`hsl(${(t*45+i*55)%360},100%,72%)`;
ctx.beginPath();ctx.arc(Math.cos(a)*(player.r+24),Math.sin(a)*(player.r+24),4,0,Math.PI*2);ctx.fill();
}
ctx.restore()
}


function drawShockwave(w){
ctx.save();
const alpha=Math.max(0,w.life/w.maxLife);
ctx.globalAlpha=alpha*.75;
ctx.strokeStyle=w.color||"#ffd166";
ctx.lineWidth=(w.line||4)*alpha;
ctx.shadowColor=w.color||"#ffd166";
ctx.shadowBlur=18;
ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();
ctx.restore();
}
function drawSparkle(sp){
ctx.save();
ctx.globalAlpha=Math.max(0,sp.life/sp.maxLife);
ctx.fillStyle=sp.color||"#ffd166";
ctx.shadowColor=sp.color||"#ffd166";
ctx.shadowBlur=10;
ctx.beginPath();ctx.arc(sp.x,sp.y,sp.size||4,0,Math.PI*2);ctx.fill();
ctx.restore();
}
function drawFloatingText(t){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,t.life/t.maxLife));ctx.fillStyle="#ffd6e7";ctx.font=t.big?"bold 34px Arial":"bold 15px Arial";ctx.textAlign="center";ctx.fillText(t.text,t.x,t.y);ctx.restore()}
function drawPawPrint(p){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.maxLife)*.65;ctx.translate(p.x,p.y);ctx.rotate(p.angle+Math.PI/2);ctx.fillStyle="#ffafcc";ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();[-8,0,8].forEach((x,index)=>{ctx.beginPath();ctx.arc(x,-10-(index===1?2:0),3.5,0,Math.PI*2);ctx.fill()});ctx.restore()}

function drawReticle(){
const pointerLocked=document.pointerLockElement===canvas;
if(choosingUpgrade||paused||gameOver||!gameStarted)return;
if(!upgrades.bigCursor&&!pointerLocked)return;
const t=performance.now()/220,x=mouse.x,y=mouse.y;
ctx.save();
ctx.translate(x,y);
if(upgrades.bigCursor){
  ctx.strokeStyle=`hsl(${(t*60)%360},100%,75%)`;ctx.lineWidth=3;ctx.shadowColor="#ffd6e7";ctx.shadowBlur=12;
  ctx.beginPath();ctx.arc(0,0,18+Math.sin(t)*2,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-12,0);ctx.moveTo(12,0);ctx.lineTo(34,0);ctx.moveTo(0,-34);ctx.lineTo(0,-12);ctx.moveTo(0,12);ctx.lineTo(0,34);ctx.stroke();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
}else{
  ctx.globalAlpha=.72;
  ctx.strokeStyle="#ffd6e7";
  ctx.lineWidth=1.4;
  ctx.shadowBlur=0;
  ctx.beginPath();
  ctx.moveTo(-9,0);ctx.lineTo(-3,0);
  ctx.moveTo(3,0);ctx.lineTo(9,0);
  ctx.moveTo(0,-9);ctx.lineTo(0,-3);
  ctx.moveTo(0,3);ctx.lineTo(0,9);
  ctx.stroke();
}
ctx.restore()
}

function render(){
ctx.setTransform(1,0,0,1,0,0);
ctx.globalAlpha=1;
ctx.shadowBlur=0;
ctx.shadowColor="transparent";
ctx.globalCompositeOperation="source-over";
drawBackground();
ctx.setTransform(1,0,0,1,screenShakeX||0,screenShakeY||0);
ctx.globalAlpha=1;
ctx.shadowBlur=0;
pawPrints.forEach(drawPawPrint);
shockwaves.forEach(w=>{if(isFinitePos(w))drawShockwave(w)});
smokes.forEach(drawSmoke);
sparkles.forEach(sp=>{if(isFinitePos(sp))drawSparkle(sp)});
drawShield();
coinsDrops.forEach(c=>{if(isFinitePos(c))drawCoin(c)});tunaDrops.forEach(t=>{if(isFinitePos(t))drawTuna(t)});
powerStars.forEach(s=>{if(isFinitePos(s))drawPowerStar(s)});
cats.forEach(cat=>{if(isFinitePos(cat))drawCat(cat)});
drawBoss();
drawTargetMarker(selectedTarget);
quacks.forEach(q=>{if(isFinitePos(q))drawQuack(q)});
demonOrbs.forEach(o=>{if(isFinitePos(o))drawDemonOrb(o)});
yarnBalls.forEach(o=>{if(isFinitePos(o))drawYarnBall(o)});
fishes.forEach(f=>{if(isFinitePos(f))drawFish(f)});
dogBones.forEach(b=>{if(isFinitePos(b))drawDogBone(b)});
hearts.forEach(h=>{if(isFinitePos(h))drawHeart(h)});
floatingTexts.forEach(t=>{if(isFinitePos(t))drawFloatingText(t)});
drawPlayer();
drawPlayerLifeBar();
drawStarAura();
drawDog();
ctx.setTransform(1,0,0,1,0,0);
ctx.globalAlpha=1;
ctx.shadowBlur=0;
drawReticle();
}

function loop(now){
try{
const safeNow=Number.isFinite(now)?now:performance.now();
const rawDt=Math.max(0,Math.min((safeNow-lastFrame)/1000,.12));
updatePerformanceMode(rawDt);
const dt=Math.max(0,Math.min(rawDt,lowPerfMode?.05:.033));
lastFrame=safeNow;
cleanBrokenEntities();
update(dt);
cleanBrokenEntities();
render();
}catch(err){
showSoftError(err);
try{render()}catch(renderErr){console.error(renderErr)}
}
requestAnimationFrame(loop)
}




/* ─── MODO AUTOMÁTICO AVANZADO CON MEMORIA ────────────────── */
let autoMode=false;
let autoChoiceToken=0;
let autoBadge=null;
let autoLastDebugText=0;
let autoChoiceMenu=null;
let autoChoiceTimer=null;
let autoRunChoices=[];
let autoRunStartTime=0;
let autoModeUsedThisRun=false;
let autoLastPlayerX=0;
let autoLastPlayerY=0;
let autoStuckTimer=0;
let autoEmergencyEscapeUntil=0;
let autoEmergencyEscapeAngle=0;
const AUTO_MEMORY_KEY="gatitos_auto_ai_memory_v2";

function autoLoadMemory(){
  try{
    const raw=localStorage.getItem(AUTO_MEMORY_KEY);
    if(!raw)return {runs:0,best:0,globalAvg:0,choices:{}};
    const mem=JSON.parse(raw);
    mem.runs=mem.runs||0;
    mem.best=mem.best||0;
    mem.globalAvg=mem.globalAvg||0;
    mem.choices=mem.choices||{};
    return mem;
  }catch(e){return {runs:0,best:0,globalAvg:0,choices:{}}}
}
function autoSaveMemory(mem){
  try{localStorage.setItem(AUTO_MEMORY_KEY,JSON.stringify(mem))}catch(e){}
}
let autoMemory=autoLoadMemory();

function initAutoMode(){
  autoBadge=document.createElement("div");
  autoBadge.className="autoBadge";
  autoBadge.textContent="🤖 IA avanzada";
  document.body.appendChild(autoBadge);

  try{autoMode=localStorage.getItem("gatitos_auto_mode")==="1"&&isAdminUnlocked()}catch(e){autoMode=false}
  refreshAutoModeUI();

  if(autoModeButton){
    autoModeButton.addEventListener("click",()=>{
      setAutoMode(!autoMode);
      if(autoMode){
        floatingTexts.push({x:canvas.width/2,y:120,text:"🤖 IA avanzada activada",life:1.5,maxLife:1.5,big:true});
        if(autoChoiceMenu)autoScheduleChoice(autoChoiceMenu.choices,autoChoiceMenu.onPick,autoChoiceMenu.context);
      }
    });
  }

  setInterval(()=>{if(autoMode)autoTryPickChoice(false)},450);
}

function markRankingInvalidByAI(){
  autoModeUsedThisRun=true;
  rankingEligibleThisRun=false;
  rankingDisabledReason="Ranking desactivado: se usó el modo IA.";
}

function setAutoMode(value){
  if(value&&!isAdminUnlocked()){
    autoMode=false;
    try{localStorage.setItem("gatitos_auto_mode","0")}catch(e){}
    if(typeof adminMessage==="function")adminMessage("El modo IA solo se desbloquea desde ADMIN.");
    refreshAutoModeUI();
    if(typeof refreshAdminLockUI==="function")refreshAdminLockUI();
    return;
  }
  autoMode=!!value;
  if(autoMode&&gameStarted&&!gameOver){
    markRankingInvalidByAI();
  }
  try{localStorage.setItem("gatitos_auto_mode",autoMode?"1":"0")}catch(e){}
  if(!autoMode){
    ["w","a","s","d"].forEach(k=>keys[k]=false);
  }
  refreshAutoModeUI();
  if(typeof refreshAdminLockUI==="function")refreshAdminLockUI();
}
function refreshAutoModeUI(){
  const adminUnlocked=typeof isAdminUnlocked==="function"&&isAdminUnlocked();
  if(!adminUnlocked&&autoMode)autoMode=false;
  if(autoModeButton){
    autoModeButton.style.display=adminUnlocked?"inline-block":"none";
    autoModeButton.textContent=autoMode?"🤖 Modo automático: ON":"🤖 Modo automático: OFF";
    autoModeButton.classList.toggle("active",autoMode);
  }
  if(autoBadge)autoBadge.classList.toggle("visible",autoMode&&gameStarted&&!gameOver);
}
function autoRegisterChoiceMenu(choices,onPick,context){
  autoChoiceMenu={choices,onPick,context,createdAt:performance.now(),picked:false};
  autoScheduleChoice(choices,onPick,context);
}
function autoTryPickChoice(force=false){
  if(!autoMode||!autoChoiceMenu||autoChoiceMenu.picked||!choosingUpgrade||paused||gameOver)return;
  const wait=autoChoiceMenu.context==="shop"?3400:3300;
  if(!force&&performance.now()-autoChoiceMenu.createdAt<wait)return;
  const choice=autoPickChoice(autoChoiceMenu.choices,autoChoiceMenu.context);
  if(!choice)return;
  autoChoiceMenu.picked=true;
  autoRememberChoice(choice,autoChoiceMenu.context);
  floatingTexts.push({x:canvas.width/2,y:115,text:`🤖 elige: ${choice.title||"opción"}`,life:1.0,maxLife:1.0,big:false});
  try{
    autoChoiceMenu.onPick(choice);
    checkGameCompletion();
  }catch(e){
    console.warn("Auto choice failed",e);
    autoChoiceMenu.picked=false;
  }
}
function autoScheduleChoice(choices,onPick,context){
  if(autoChoiceTimer)clearTimeout(autoChoiceTimer);
  const token=++autoChoiceToken;
  autoChoiceTimer=setTimeout(()=>{
    if(token!==autoChoiceToken)return;
    autoTryPickChoice(true);
  },context==="shop"?3600:3400);
}

/* Movimiento y combate */
function autoSafeAdd(v,dx,dy,weight){
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(weight))return;
  v.x+=dx*weight;
  v.y+=dy*weight;
}
function autoRepelFrom(v,obj,radius,weight=1){
  if(!isFinitePos(obj))return 0;
  const dx=player.x-obj.x,dy=player.y-obj.y,d=Math.hypot(dx,dy)||1;
  if(d>=radius)return 0;
  const f=((radius-d)/radius)*weight;
  autoSafeAdd(v,dx/d,dy/d,f);
  return f;
}
function autoAttractTo(v,obj,radius,weight=1){
  if(!isFinitePos(obj))return 0;
  const dx=obj.x-player.x,dy=obj.y-player.y,d=Math.hypot(dx,dy)||1;
  if(d>=radius)return 0;
  const f=(1-d/radius)*weight;
  autoSafeAdd(v,dx/d,dy/d,f);
  return f;
}
function autoProjectileThreat(obj,radius,weight=1){
  if(!isFinitePos(obj))return 0;
  let dx=player.x-obj.x,dy=player.y-obj.y,d=Math.hypot(dx,dy)||1;
  let threat=0;
  if(d<radius)threat+=(radius-d)/radius;
  if(Number.isFinite(obj.vx)&&Number.isFinite(obj.vy)){
    const sp=Math.hypot(obj.vx,obj.vy)||1;
    const ux=obj.vx/sp,uy=obj.vy/sp;
    const relx=player.x-obj.x,rely=player.y-obj.y;
    const ahead=relx*ux+rely*uy;
    const side=Math.abs(relx*uy-rely*ux);
    if(ahead>0&&ahead<radius*1.25&&side<52+player.r){
      threat+=1.25*(1-side/(52+player.r))*(1-ahead/(radius*1.25));
    }
  }
  return Math.max(0,threat*weight);
}
function autoFindBestTarget(){
  let best=null,bestScore=-999;

  // Gato arcoíris: prioridad altísima porque da mejora gratis.
  cats.forEach(c=>{
    if(!isFinitePos(c)||c.dead||!isCatOnScreen(c)||!c.rainbow)return;
    const d=Math.hypot(c.x-player.x,c.y-player.y);
    const s=1800-d*.10;
    if(s>bestScore){best=c;bestScore=s;}
  });

  // Jefe: sigue siendo objetivo muy importante, pero no por encima del arcoíris.
  if(boss&&isFinitePos(boss)){
    const d=Math.hypot(boss.x-player.x,boss.y-player.y);
    let s=1120-d*.07;
    if(boss.type==="demon")s+=160;
    if(boss.hp&&boss.maxHp&&boss.hp<boss.maxHp*.35)s+=120;
    if(s>bestScore){best=boss;bestScore=s;}
  }

  cats.forEach(c=>{
    if(!isFinitePos(c)||c.dead||!isCatOnScreen(c)||c.rainbow)return;
    const d=Math.hypot(c.x-player.x,c.y-player.y);
    let s=360-d*.18;
    if(c.type==="yarn")s+=230;
    if(c.type==="thief")s+=190;
    if(c.type==="musician")s+=260;
    if(c.type==="student")s+=240+(c.studyLevel||0)*125;
    if(c.type==="sleepy"&&c.sleepState==="awake")s+=320+Math.min(180,wave*6);
    if(c.type==="glutton")s+=125;
    if(d<260)s+=170;
    if(s>bestScore){best=c;bestScore=s;}
  });
  return best;
}
function autoMoveKeysFromVector(v){
  const mag=Math.hypot(v.x,v.y);
  if(mag<.08){keys.w=keys.a=keys.s=keys.d=false;return;}
  const x=v.x/mag,y=v.y/mag;
  keys.a=x<-.24;keys.d=x>.24;keys.w=y<-.24;keys.s=y>.24;
}
function autoUpdateAimAndShoot(target){
  if(target&&isFinitePos(target)){
    const lead=.13;
    mouse.x=target.x+(target.vx||0)*lead;
    mouse.y=target.y+(target.vy||0)*lead;
  }else{
    mouse.x=canvas.width/2;
    mouse.y=canvas.height/2;
  }
  if(target&&!choosingUpgrade&&!paused&&!gameOver)shootFish(true);
}

function autoDistanceToWall(){
  return Math.min(player.x,player.y,canvas.width-player.x,canvas.height-player.y);
}
function autoIsInCorner(){
  const m=150;
  const nearX=player.x<m||player.x>canvas.width-m;
  const nearY=player.y<m||player.y>canvas.height-m;
  return nearX&&nearY;
}
function autoForceCenterEscape(v,weight=1){
  const cx=canvas.width/2,cy=canvas.height/2;
  const dx=cx-player.x,dy=cy-player.y,d=Math.hypot(dx,dy)||1;
  autoSafeAdd(v,dx/d,dy/d,weight);
}
function autoForceAwayFromBoss(v,weight=1){
  if(!boss||!isFinitePos(boss))return;
  const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;
  autoSafeAdd(v,dx/d,dy/d,weight);
}
function autoUpdateStuckState(dt,danger){
  const moved=Math.hypot(player.x-autoLastPlayerX,player.y-autoLastPlayerY);
  autoLastPlayerX=player.x;
  autoLastPlayerY=player.y;
  const wall=autoDistanceToWall();
  const demonNear=boss&&boss.type==="demon"&&Math.hypot(player.x-boss.x,player.y-boss.y)<520;
  if(gameStarted&&!gameOver&&autoMode&&(moved<18*dt)&&(danger>.8||demonNear||wall<95))autoStuckTimer+=dt;
  else autoStuckTimer=Math.max(0,autoStuckTimer-dt*1.8);
  if(autoStuckTimer>.65||((autoIsInCorner()||wall<70)&&(danger>1.05||demonNear))){
    autoEmergencyEscapeUntil=performance.now()+1300;
    autoEmergencyEscapeAngle=Math.atan2(canvas.height/2-player.y,canvas.width/2-player.x)+(Math.random()*.55-.275);
    autoStuckTimer=0;
    floatingTexts.push({x:player.x,y:player.y-82,text:"🤖 escape de emergencia",life:.85,maxLife:.85,big:false});
  }
}
function autoApplyEmergencyEscape(v,danger){
  const now=performance.now();
  const wall=autoDistanceToWall();
  const demonNear=boss&&boss.type==="demon"&&Math.hypot(player.x-boss.x,player.y-boss.y)<620;
  if(now<autoEmergencyEscapeUntil){
    autoSafeAdd(v,Math.cos(autoEmergencyEscapeAngle),Math.sin(autoEmergencyEscapeAngle),7.5);
    autoForceCenterEscape(v,4.8);
    if(demonNear)autoForceAwayFromBoss(v,4.5);
    return true;
  }
  if((autoIsInCorner()||wall<85)&&(danger>.75||demonNear)){
    autoForceCenterEscape(v,demonNear?8.5:6.2);
    if(demonNear)autoForceAwayFromBoss(v,5.4);
    return true;
  }
  return false;
}

function updateAutoPlayer(dt){
  if(gameStarted&&!gameOver)markRankingInvalidByAI();
  refreshAutoModeUI();
  if(typeof refreshAdminLockUI==="function")refreshAdminLockUI();
  if(!autoRunStartTime)autoRunStartTime=performance.now();
  const target=autoFindBestTarget();
  autoUpdateAimAndShoot(target);

  const v={x:0,y:0};
  let danger=0;

  cats.forEach(c=>{
    if(!isFinitePos(c)||c.dead)return;
    const radius=c.type==="mini"?190:c.type==="glutton"?380:c.type==="yarn"?350:285;
    const weight=c.type==="glutton"?4.6:c.type==="mini"?2.9:c.type==="yarn"?4.1:c.type==="thief"?3.5:3.25;
    danger+=autoRepelFrom(v,c,radius,weight);
  });
  if(boss&&isFinitePos(boss)){
    danger+=autoRepelFrom(v,boss,(boss.r||60)+280,boss.type==="demon"?5.9:4.5);
  }
  quacks.forEach(q=>{
    const t=autoProjectileThreat(q,365,5.2);
    if(t>0){const dx=player.x-q.x,dy=player.y-q.y,d=Math.hypot(dx,dy)||1;autoSafeAdd(v,dx/d,dy/d,t);danger+=t;}
  });
  yarnBalls.forEach(y=>{
    const t=autoProjectileThreat(y,350,5.8);
    if(t>0){const dx=player.x-y.x,dy=player.y-y.y,d=Math.hypot(dx,dy)||1;autoSafeAdd(v,dx/d,dy/d,t);danger+=t;}
  });
  demonOrbs.forEach(o=>{
    const t=autoProjectileThreat(o,395,6.5);
    if(t>0){const dx=player.x-o.x,dy=player.y-o.y,d=Math.hypot(dx,dy)||1;autoSafeAdd(v,dx/d,dy/d,t);danger+=t;}
  });

  autoUpdateStuckState(dt,danger);
  const emergencyEscaping=autoApplyEmergencyEscape(v,danger);

  const margin=boss&&boss.type==="demon"?180:125;
  if(player.x<margin)v.x+=(margin-player.x)/margin*(boss&&boss.type==="demon"?6.6:4.4);
  if(player.x>canvas.width-margin)v.x-=(player.x-(canvas.width-margin))/margin*(boss&&boss.type==="demon"?6.6:4.4);
  if(player.y<margin)v.y+=(margin-player.y)/margin*(boss&&boss.type==="demon"?6.6:4.4);
  if(player.y>canvas.height-margin)v.y-=(player.y-(canvas.height-margin))/margin*(boss&&boss.type==="demon"?6.6:4.4);

  const hpRatio=life/Math.max(1,upgrades.maxLife||100);
  const safeToLoot=!emergencyEscaping&&danger<.72&&hpRatio>.58;
  const verySafeToLoot=!emergencyEscaping&&danger<.42&&hpRatio>.72;

  // Estrella: prioridad de recogida muy alta, salvo peligro extremo.
  let nearestStar=null,nearestStarD=Infinity;
  powerStars.forEach(s=>{
    if(!isFinitePos(s))return;
    const d=Math.hypot(s.x-player.x,s.y-player.y);
    if(d<nearestStarD){nearestStar=s;nearestStarD=d;}
  });
  if(nearestStar){
    autoAttractTo(v,nearestStar,1200,danger>1.35?3.8:9.5);
  }

  // Latas: si hace falta vida, las busca incluso con algo de riesgo.
  if(hpRatio<.78)tunaDrops.forEach(t=>autoAttractTo(v,t,720,hpRatio<.45?6.2:4.4));

  // Monedas: solo si no es peligroso; si hay mucha vida puede arriesgar un poco.
  if(safeToLoot){
    const coinRange=verySafeToLoot?760:520;
    const collectWeight=verySafeToLoot?3.3:1.55;
    coinsDrops.forEach(c=>autoAttractTo(v,c,coinRange,collectWeight));
  }

  if(target&&isFinitePos(target)){
    const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy)||1;
    let desired=boss?(boss.type==="demon"?560:430):335;
    if(target.rainbow)desired=260;
    if(!emergencyEscaping&&target.rainbow&&danger<1.05){
      // Arcoíris: acercarse más para matarlo rápido y asegurar la recompensa.
      if(d>desired)autoSafeAdd(v,dx/d,dy/d,1.65);
      else autoSafeAdd(v,-dx/d,-dy/d,.35);
    }else{
      if(d<desired)autoSafeAdd(v,-dx/d,-dy/d,(desired-d)/desired*(boss&&boss.type==="demon"?4.1:2.9));
      else if(!emergencyEscaping&&d>desired+250&&danger<.7)autoSafeAdd(v,dx/d,dy/d,.8);
    }
    const strafeStrength=target.rainbow?.25:(.6+(boss&&boss.type==="demon"?.55:0));
    const strafe=(Math.sin(performance.now()/520)>0?1:-1)*strafeStrength;
    autoSafeAdd(v,-dy/d,dx/d,strafe);
  }else autoSafeAdd(v,canvas.width/2-player.x,canvas.height/2-player.y,.002);

  autoMoveKeysFromVector(v);

  if(autoMode&&performance.now()-autoLastDebugText>9000&&gameStarted&&!choosingUpgrade&&!paused&&!gameOver){
    autoLastDebugText=performance.now();
    const msg=emergencyEscaping?"🤖 saliendo de peligro":(powerStars.length?"🤖 buscando estrella":(target&&target.rainbow?"🤖 cazando arcoíris":(danger>1.2?"🤖 esquivando":(target?"🤖 atacando":"🤖 buscando recursos"))));
    floatingTexts.push({x:player.x,y:player.y-72,text:msg,life:.75,maxLife:.75,big:false});
  }
}

/* Decisiones avanzadas */
function autoKeyOwned(key){
  if(!key)return false;
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,key))return (upgradeLevels[key]||0)>0;
  return hasUniqueUpgrade(key);
}
function autoKeyMaxed(key){
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,key))return (upgradeLevels[key]||0)>=(upgradeMaxLevels[key]||5)||isUpgradeFinal(key);
  return hasUniqueUpgrade(key);
}
function autoStepsToFusionReady(key){
  if(!key)return 99;
  if(isUniqueKey(key))return hasUniqueUpgrade(key)?0:1;
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,key))return Math.max(0,(upgradeMaxLevels[key]||5)-(upgradeLevels[key]||0));
  return 99;
}
function autoPairValue(pair){
  pair=sortedPair(...String(pair).split("+"));
  const parts=pair.split("+");
  let v=0;
  const name=(fusionNameMap[pair]||"").toLowerCase();
  const desc=(fusionShortDescMap[pair]||fusionEffectDescMap[pair]||"").toLowerCase();

  const table={
    "aimAssist+autoFire":1250,
    "darkPact+moralSupport":1180,
    "catInstinct+maxLife":1100,
    "damage+critChance":1080,
    "damage+pierce":1000,
    "damage+lifeSteal":980,
    "lifeSteal+shield":960,
    "doubleFish+omniBurst":940,
    "pierce+yarnBounce":930,
    "bigFish+fishSize":920,
    "autoFire+critChance":900,
    "autoFire+bigCursor":860,
    "aimAssist+bigCursor":840,
    "coinMagnet+xpBoost":820,
    "catInstinct+coinMagnet":835,
    "bigCursor+boomerang":855,
    "boomerang+catInstinct":845,
    "catInstinct+omniBurst":875,
    "coinMagnet+darkPact":830,
    "catInstinct+moralSupport":810,
    "catInstinct+darkPact":800,
    "shield+maxLife":780,
    "fireRate+omniBurst":760,
    "doubleFish+fireRate":740,
    "fishSpeed+omniBurst":700
  };
  if(table[pair])v+=table[pair];

  if(name.includes("ia")||name.includes("combate"))v+=330;
  if(name.includes("perro")||name.includes("novio"))v+=310;
  if(name.includes("leviatán"))v+=260;
  if(name.includes("crít"))v+=220;
  if(name.includes("vamp")||name.includes("vida"))v+=210;
  if(desc.includes("rebote")||desc.includes("ráfaga")||desc.includes("perfora"))v+=170;
  if(desc.includes("cur")||desc.includes("vida")||desc.includes("escudo"))v+=160;

  if(parts.includes("damage"))v+=260;
  if(parts.includes("fireRate"))v+=210;
  if(parts.includes("doubleFish"))v+=190;
  if(parts.includes("critChance"))v+=190;
  if(parts.includes("pierce"))v+=180;
  if(parts.includes("omniBurst"))v+=180;
  if(parts.includes("lifeSteal"))v+=170;
  if(parts.includes("shield"))v+=160;
  if(parts.includes("autoFire"))v+=150;
  if(parts.includes("aimAssist"))v+=150;
  if(parts.includes("maxLife")&&life<upgrades.maxLife*.65)v+=180;
  if(parts.includes("coinMagnet")&&coins<7)v+=120;
  if(parts.includes("catInstinct")&&parts.includes("coinMagnet"))v+=140;
  if(parts.includes("boomerang")&&parts.includes("bigCursor"))v+=150;
  if(parts.includes("boomerang")&&parts.includes("catInstinct"))v+=145;
  if(parts.includes("omniBurst")&&parts.includes("catInstinct"))v+=160;
  if(parts.includes("coinMagnet")&&parts.includes("darkPact"))v+=150;
  if(parts.includes("xpBoost")&&wave<16)v+=130;

  return v;
}
function autoFusionFutureValue(key){
  if(!key)return 0;
  let best=0;
  const possible=new Set();
  (fusionPairs[key]||[]).forEach(k=>possible.add(k));
  Object.keys(fusionPairs).forEach(k=>{if((fusionPairs[k]||[]).includes(key))possible.add(k)});
  possible.forEach(other=>{
    if(other===key||hasFusionBeenDone(key,other))return;
    if(fusedUpgradeNames[key]||fusedUpgradeNames[other])return;
    const pair=sortedPair(key,other);
    const raw=autoPairValue(pair);
    const steps=autoStepsToFusionReady(other);
    const ownedBonus=autoKeyOwned(other)?120:0;
    const readyBonus=autoKeyMaxed(other)?260:0;
    const costPenalty=steps*55;
    best=Math.max(best,raw*.58+ownedBonus+readyBonus-costPenalty);
  });
  return Math.max(0,best);
}
function autoStepsToFusionReadyAfterTaking(key){
  if(!key)return 99;
  if(isUniqueKey(key))return 0;
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,key)){
    const current=upgradeLevels[key]||0;
    const max=upgradeMaxLevels[key]||5;
    return Math.max(0,max-(current+1));
  }
  return autoStepsToFusionReady(key);
}
function autoFusionRouteValue(key){
  if(!key||fusedUpgradeNames[key])return 0;
  const possible=new Set();
  (fusionPairs[key]||[]).forEach(k=>possible.add(k));
  Object.keys(fusionPairs).forEach(k=>{if((fusionPairs[k]||[]).includes(key))possible.add(k)});
  let best=0,total=0,count=0;
  possible.forEach(other=>{
    if(other===key||hasFusionBeenDone(key,other)||fusedUpgradeNames[other])return;
    const pair=sortedPair(key,other);
    const raw=autoPairValue(pair);
    if(raw<=0)return;
    const selfSteps=autoStepsToFusionReadyAfterTaking(key);
    const otherSteps=autoStepsToFusionReady(other);
    const readiness=1/(1+selfSteps*.52+otherSteps*.62);
    const ownedBonus=autoKeyOwned(other)?170:0;
    const readyBonus=autoKeyMaxed(other)?420:0;
    const closeBonus=(selfSteps<=1?190:0)+(otherSteps<=1?170:0);
    const value=Math.max(0,raw*readiness+ownedBonus+readyBonus+closeBonus-selfSteps*24-otherSteps*32);
    best=Math.max(best,value);
    total+=value;count++;
  });
  return Math.max(0,best+Math.min(260,total*.18));
}
function autoStrategicKeyScore(key){
  if(!key)return 0;
  let score=autoDirectNeedScore(key);
  score+=autoFusionFutureValue(key);
  score+=autoFusionRouteValue(key);
  const pair=getFusedPairForKey(key);
  if(pair){
    const progress=getFusionProgress(pair);
    score+=760+autoPairValue(pair)*.45+(5-progress)*45;
  }else if(Object.prototype.hasOwnProperty.call(upgradeLevels,key)){
    const lvl=upgradeLevels[key]||0;
    const max=upgradeMaxLevels[key]||5;
    if(max-lvl<=1&&autoFusionFutureValue(key)>0)score+=240;
    if(lvl===0)score+=70;
  }
  return score;
}
function autoRandomShopUpgradeScore(choice,context){
  const hidden=choice&&choice.hiddenUpgrade;
  const key=hidden&&hidden.key;
  let score=520;
  if(key){
    score=autoStrategicKeyScore(key);
    const current=getShopCurrentLevelForKey(key);
    const minLevel=Math.min(...getShopEligibleUpgradeKeys().map(k=>getShopCurrentLevelForKey(k)));
    if(Number.isFinite(minLevel)&&current<=minLevel)score+=130;
    if(autoFusionRouteValue(key)>420)score+=210;
  }
  // Es más barata que una mejora normal, así que se premia la eficiencia,
  // pero no por encima de una fusión claramente buena.
  score+=260;
  const tag=String(choice.levelTag||"");
  const price=parseInt(tag,10);
  if(Number.isFinite(price))score-=price*12;
  return score+autoLearningBonus(choice,context)+Math.random()*10;
}
function autoBestAvailableFusionPairScore(){
  const ready=getMaxedFusionKeys();
  let best=0;
  ready.forEach((a,i)=>ready.slice(i+1).forEach(b=>{
    if(areFusionCompatible(a,b)&&!hasFusionBeenDone(a,b)){
      const pair=sortedPair(a,b);
      best=Math.max(best,autoPairValue(pair));
    }
  }));
  return best;
}
function autoChoiceSignature(choice,context){
  if(!choice)return "none";
  if(choice.first&&choice.key)return "fusion:"+sortedPair(choice.first,choice.key);
  if(choice.openFusionShop)return "openFusion";
  if(choice.key)return "key:"+choice.key;
  return "title:"+String(choice.title||"unknown").slice(0,32);
}
function autoLearningBonus(choice,context){
  const sig=autoChoiceSignature(choice,context);
  const st=autoMemory.choices&&autoMemory.choices[sig];
  if(!st||!st.n)return 0;
  const avg=st.avg||0;
  const baseline=autoMemory.globalAvg||0;
  const diff=avg-baseline;
  const confidence=Math.min(1,Math.log(1+(st.n||0))/2.2);
  return Math.max(-360,Math.min(520,(diff/95)*confidence));
}
function autoRememberChoice(choice,context){
  const sig=autoChoiceSignature(choice,context);
  autoRunChoices.push({sig,context,wave,level,coins,t:performance.now()});
}
function autoLearnFromFinalScore(finalScore,reason="end"){
  if(!autoMode||!finalScore||!autoRunChoices.length)return;
  const total=Math.max(0,Math.floor(finalScore.total||0));
  const reward=total+(defeatedBossTypes?.size||0)*2800+wave*180+level*110;
  const mem=autoLoadMemory();
  mem.runs=(mem.runs||0)+1;
  mem.best=Math.max(mem.best||0,total);
  mem.globalAvg=mem.globalAvg?mem.globalAvg*.88+reward*.12:reward;
  mem.choices=mem.choices||{};
  autoRunChoices.forEach((c,i)=>{
    const st=mem.choices[c.sig]||{n:0,avg:0,last:0};
    const recency=1+i/Math.max(1,autoRunChoices.length);
    const weighted=reward*recency;
    st.n=(st.n||0)+1;
    st.avg=st.avg?st.avg*.82+weighted*.18:weighted;
    st.last=Date.now();
    mem.choices[c.sig]=st;
  });
  autoMemory=mem;
  autoSaveMemory(mem);
  autoRunChoices=[];
  autoRunStartTime=0;
}
function autoDirectNeedScore(key){
  const hpRatio=life/Math.max(1,upgrades.maxLife||100);
  const pressure=(cats.length+(boss?8:0)+quacks.length+yarnBalls.length+demonOrbs.length);
  const early=wave<14;
  const base={
    damage:700,fireRate:620,doubleFish:570,pierce:540,critChance:520,
    fishSpeed:410,bigFish:450,fishSize:420,omniBurst:570,yarnBounce:550,
    autoFire:560,aimAssist:570,bigCursor:180,moveSpeed:460,
    maxLife:hpRatio<.55?760:360,healOnWave:hpRatio<.7?560:280,lifeSteal:hpRatio<.78?640:430,
    shield:pressure>12?660:410,catSlow:pressure>12?600:370,coinMagnet:coins<8?450:240,xpBoost:early?470:210,
    boomerang:360,moralSupport:170,darkPact:150,catInstinct:hpRatio<.62?650:350,zoomies:390
  };
  return base[key]||240;
}
function autoChoiceScore(choice,context){
  if(!choice||choice.locked)return -999999;
  if(choice.skipShop)return context==="shop"?-120:-999;
  const recommendedBonus=choice.recommended?520+Math.max(0,(choice.recommendScore||0)*900):0;
  let score=recommendedBonus;

  if(choice.randomShopUpgrade){
    return autoRandomShopUpgradeScore(choice,context)+recommendedBonus;
  }

  if(choice.openFusionShop){
    if(!canFuse(getEffectiveShopFusionPrice()))return -9999;
    const bestPair=autoBestAvailableFusionPairScore();
    const noAffordableUpgrade=context==="shop"&&coins<getShopUpgradePrice()&&coins>=getEffectiveShopFusionPrice();
    return 520+bestPair*.9+(noAffordableUpgrade?360:0)+recommendedBonus+autoLearningBonus(choice,context);
  }

  const key=choice.key||"";
  if(choice.first&&choice.key){
    const pair=sortedPair(choice.first,choice.key);
    score+=1200+autoPairValue(pair);
    score+=autoLearningBonus(choice,context);
    return score+Math.random()*8;
  }

  if(choice.fusion){
    const pair=choice.key?getFusedPairForKey(choice.key):null;
    if(pair)score+=760+autoPairValue(pair)*.45;
    else score+=260;
  }

  score+=autoStrategicKeyScore(key);
  if(runStats){
    const hpRatioNow=life/Math.max(1,upgrades.maxLife||100);
    const pressureNow=(cats.length+(boss?8:0)+quacks.length+yarnBalls.length+demonOrbs.length);
    const defensiveKeys=["maxLife","healOnWave","lifeSteal","shield","catSlow","moveSpeed","catInstinct"];
    if((hpRatioNow<.55||pressureNow>15||(runStats.damageTaken||0)>upgrades.maxLife*.65)&&defensiveKeys.includes(key))score+=220;
    if((runStats.fishHits||0)<Math.max(4,(runStats.shotsFired||0)*.35)&&["aimAssist","fishSpeed","fishSize","autoFire","bigCursor"].includes(key))score+=150;
  }

  // No coge "mejoras flojas" salvo que tengan futuro real.
  if(key==="bigCursor"||key==="moralSupport"||key==="darkPact"){
    const future=autoFusionFutureValue(key);
    if(future<420)score-=320;
    else score+=future*.45;
  }
  if(cats.some(c=>c.type==="yarn"||c.type==="thief"||c.type==="student"||c.type==="musician")){
    if(["fishSpeed","aimAssist","autoFire","pierce","damage","catSlow"].includes(key))score+=140;
  }

  if(choice.easter)score+=240;
  if(choice.levelTag==="DEF"||choice.levelTag==="5/5")score+=100;
  if(context==="shop"&&choice.price)score-=choice.price*22;
  score+=autoLearningBonus(choice,context);

  return score+Math.random()*12;
}
function autoPickChoice(choices,context){
  const usable=(choices||[]).filter(c=>c&&!c.locked);
  if(!usable.length)return null;

  if(context==="shop"){
    const nonExit=usable.filter(c=>!c.skipShop);
    if(!nonExit.length)return usable.find(c=>c.skipShop)||usable[0];

    const fusion=nonExit.find(c=>c.openFusionShop);
    const bestUpgrade=nonExit.filter(c=>!c.openFusionShop).sort((a,b)=>autoChoiceScore(b,context)-autoChoiceScore(a,context))[0];
    const fusionScore=fusion?autoChoiceScore(fusion,context):-9999;
    const upgradeScore=bestUpgrade?autoChoiceScore(bestUpgrade,context):-9999;

    if(fusion&&coins>=getEffectiveShopFusionPrice()){
      const anyAffordableBuy=nonExit.some(c=>!c.openFusionShop&&!c.locked);
      if(!anyAffordableBuy)return fusion;
      if(fusionScore>upgradeScore+60)return fusion;
    }
    return bestUpgrade||fusion||usable.find(c=>c.skipShop)||usable[0];
  }

  return usable.sort((a,b)=>autoChoiceScore(b,context)-autoChoiceScore(a,context))[0];
}
/* ─────────────────────────────────────────────────────────── */


const ADMIN_PASSWORD="Patasmiquen";
const ADMIN_UNLOCK_KEY="gatitos_peces_admin_unlocked";
function isAdminUnlocked(){return localStorage.getItem(ADMIN_UNLOCK_KEY)==="1"||isGameCompleted()}
function setAdminUnlocked(value=true){if(value)localStorage.setItem(ADMIN_UNLOCK_KEY,"1")}
function refreshAdminLockUI(){
  const unlocked=isAdminUnlocked();
  if(adminToggle){adminToggle.textContent=unlocked?"ADMIN ✨":"ADMIN 🔒";adminToggle.classList.toggle("unlocked",unlocked)}
  if(adminLock)adminLock.style.display=unlocked?"none":"block";
  if(adminTools)adminTools.style.display=unlocked?"block":"none";
  if(adminStateTag)adminStateTag.textContent=unlocked?"desbloqueado":"bloqueado";
  if(adminLog){
    if(unlocked){
      if(autoMode&&gameStarted)adminLog.textContent="Modo admin desbloqueado. IA activa: esta partida no entra al ranking.";
      else if(autoMode&&!gameStarted)adminLog.textContent="Modo admin desbloqueado. IA activada: si empiezas así, no contará para ranking.";
      else if(autoModeUsedThisRun)adminLog.textContent="Modo admin desbloqueado. IA desactivada, pero esta partida no entra al ranking porque se usó IA.";
      else adminLog.textContent="Modo admin desbloqueado.";
    }else{
      adminLog.textContent="Modo admin bloqueado. Usa la contraseña o completa el juego.";
    }
  }
}
function unlockAdmin(reason="Contraseña correcta"){
  setAdminUnlocked(true);
  refreshAdminLockUI();
  if(typeof refreshAutoModeUI==="function")refreshAutoModeUI();
  adminMessage("Admin desbloqueado · "+reason);
}
function requireAdmin(){
  refreshAdminLockUI();
  if(isAdminUnlocked())return true;
  if(adminLog)adminLog.textContent="Bloqueado: completa el juego o escribe la contraseña.";
  return false;
}
function adminNumber(el,def=1,min=0,max=9999){
  const v=parseInt(el?.value,10);
  if(!Number.isFinite(v))return def;
  return Math.max(min,Math.min(max,v));
}
function adminMessage(text){refreshAdminPanelUI();if(adminLog)adminLog.textContent=`${text} · ${adminFusionStatsText()}`;if(typeof floatingTexts!=="undefined")floatingTexts.push({x:canvas.width/2,y:95,text:"🛠️ "+text,life:1.4,maxLife:1.4,big:false});}
function adminFusionStatsText(){
  const total=typeof getAllOfficialFusionPairs==="function"?getAllOfficialFusionPairs().length:Object.keys(fusionNameMap||{}).length;
  const done=Object.keys(doneFusionPairs||{}).length;
  const hasCollector=!!(doneFusionPairs&&doneFusionPairs[sortedPair("catInstinct","coinMagnet")]);
  return `${done}/${total} fusiones activas${hasCollector?" · Instinto recolector activo":""}`;
}
function refreshAdminSelectLabels(){
  const scalable=Object.keys(upgradeLevels);
  const unique=uniqueFusionKeys;
  if(adminUpgradeSelect){
    const selected=adminUpgradeSelect.value;
    adminUpgradeSelect.innerHTML=scalable.map(k=>{
      const pair=getFusedPairForKey(k);
      const fused=pair?` · ${getFusionNameFromPair(...pair.split("+"))} ${getFusionProgress(pair)}/5`:"";
      const final=isUpgradeFinal(k)?" · DEF":"";
      return `<option value="${k}">${getAnyIcon(k)} ${getOriginalUpgradeName(k)} · ${upgradeLevels[k]}/${upgradeMaxLevels[k]}${final}${fused}</option>`;
    }).join("");
    if(selected&&scalable.includes(selected))adminUpgradeSelect.value=selected;
  }
  if(adminUniqueSelect){
    const selected=adminUniqueSelect.value;
    adminUniqueSelect.innerHTML=unique.map(k=>{
      const pair=getFusedPairForKey(k);
      const owned=hasUniqueUpgrade(k)?"1/1":"0/1";
      const fused=pair?` · ${getFusionNameFromPair(...pair.split("+"))}`:"";
      return `<option value="${k}">${getAnyIcon(k)} ${getOriginalUpgradeName(k)} · ${owned}${fused}</option>`;
    }).join("");
    if(selected&&unique.includes(selected))adminUniqueSelect.value=selected;
  }
}
function refreshAdminPanelUI(){
  refreshAdminSelectLabels();
  if(typeof refreshAutoModeUI==="function")refreshAutoModeUI();
}
function initAdminPanel(){
  if(!adminToggle||!adminPanel)return;
  refreshAdminSelectLabels();
  window.adminRefreshSelectLabels=refreshAdminSelectLabels;
  window.adminRefreshPanelUI=refreshAdminPanelUI;
  adminToggle.addEventListener("click",()=>{adminPanel.style.display=adminPanel.style.display==="block"?"none":"block";refreshAdminLockUI();refreshAdminPanelUI();syncGamePointerLock();});
  adminUnlockBtn?.addEventListener("click",()=>{
    const pass=(adminPassword?.value||"").trim();
    if(pass===ADMIN_PASSWORD){unlockAdmin("contraseña correcta");if(adminPassword)adminPassword.value="";}
    else{if(adminLog)adminLog.textContent="Contraseña incorrecta.";if(adminPassword)adminPassword.select();}
  });
  adminPassword?.addEventListener("keydown",e=>{if(e.key==="Enter")adminUnlockBtn?.click();});
  document.getElementById("adminGiveUpgrade")?.addEventListener("click",()=>{if(!requireAdmin())return;adminAddUpgrade(adminUpgradeSelect.value,adminNumber(adminUpgradeAmount,1,1,99));refreshAdminPanelUI();});
  document.getElementById("adminMaxUpgrade")?.addEventListener("click",()=>{if(!requireAdmin())return;adminAddUpgrade(adminUpgradeSelect.value,999);refreshAdminPanelUI();});
  document.getElementById("adminGiveUnique")?.addEventListener("click",()=>{if(!requireAdmin())return;adminGiveUnique(adminUniqueSelect.value)});
  document.getElementById("adminGiveDog")?.addEventListener("click",()=>{if(!requireAdmin())return;adminGiveDog()});
  document.getElementById("adminCoins")?.addEventListener("click",()=>{if(!requireAdmin())return;const n=adminNumber(adminCoinAmount,25,1,9999);coins+=n;updateHud();adminMessage(`+${n} monedas`)});
  document.getElementById("adminOpenShop")?.addEventListener("click",()=>{if(!requireAdmin())return;adminOpenShop();});
  document.getElementById("adminLevel")?.addEventListener("click",()=>{if(!requireAdmin())return;const n=adminNumber(adminLevelAmount,1,1,50);level+=n;xpNeed=getXpNeedForLevel(level);updateHud();queueUpgradeMenus("level",n);adminMessage(`+${n} nivel${n===1?"":"es"} · ${n} elección${n===1?"":"es"} pendiente${n===1?"":"s"}`)});
  document.getElementById("adminSetWave")?.addEventListener("click",()=>{if(!requireAdmin())return;const n=adminNumber(adminWaveValue,1,1,999);const skipped=Math.max(0,n-wave);wave=n;level=Math.max(level,n);xpNeed=getXpNeedForLevel(level);waveUpgradePending=false;startWave();updateHud();if(skipped>0)queueUpgradeMenus("wave",skipped);adminMessage(`ronda fijada en ${n}${skipped>0?` · ${skipped} mejora${skipped===1?"":"s"} de ronda pendiente${skipped===1?"":"s"}`:""}`)});
  document.getElementById("adminHeal")?.addEventListener("click",()=>{if(!requireAdmin())return;life=upgrades.maxLife;updateHud();adminMessage("vida restaurada")});
  document.getElementById("adminHurt")?.addEventListener("click",()=>{if(!requireAdmin())return;life=Math.max(1,life-25);updateHud();adminMessage("-25 vida")});
  document.getElementById("adminBoss")?.addEventListener("click",()=>{if(!requireAdmin())return;adminSpawnBoss(false)});
  document.getElementById("adminDemon")?.addEventListener("click",()=>{if(!requireAdmin())return;adminSpawnBoss(true)});
  document.getElementById("adminAvalanche")?.addEventListener("click",()=>{if(!requireAdmin())return;avalancheThisWave=true;avalancheActive=true;avalancheTime=getAvalancheConfig().duration;avalancheSpawnTimer=0;adminMessage("avalancha forzada")});
  document.getElementById("adminStar")?.addEventListener("click",()=>{if(!requireAdmin())return;activatePowerStar();adminMessage("estrella activada")});
  document.getElementById("adminClearEnemies")?.addEventListener("click",()=>{if(!requireAdmin())return;cats.length=0;fishes.length=0;quacks.length=0;yarnBalls.length=0;demonOrbs.length=0;boss=null;adminMessage("enemigos limpiados")});
  document.getElementById("adminMaxAll")?.addEventListener("click",()=>{if(!requireAdmin())return;adminMaxAllUpgrades();refreshAdminPanelUI();});
  document.getElementById("adminCompleteAll")?.addEventListener("click",()=>{if(!requireAdmin())return;adminCompleteAllFusions();refreshAdminPanelUI();});
  refreshAdminLockUI();
}
function adminAddUpgrade(key,amount=1){
  if(!Object.prototype.hasOwnProperty.call(upgradeLevels,key))return;
  const before=upgradeLevels[key]||0;
  upgradeLevels[key]=Math.min(upgradeMaxLevels[key]||5,before+amount);
  applyUpgradeStatsFromLevels();
  if(key==="maxLife")life=upgrades.maxLife;
  updateHud();renderPauseMenu();
  adminMessage(`${getOriginalUpgradeName(key)} ${upgradeLevels[key]}/${upgradeMaxLevels[key]}`);
}
function adminGiveUnique(key){
  if(key==="aimAssist")upgrades.aimAssist=true;
  if(key==="bigCursor")upgrades.bigCursor=true;
  if(key==="moralSupport")upgrades.moralSupport=true;
  if(key==="darkPact")upgrades.darkPact=true;
  if(key==="catInstinct")upgrades.catInstinct=true;
  if(key==="zoomies")upgrades.zoomies=true;
  updateHud();renderPauseMenu();adminMessage(`única dada: ${getOriginalUpgradeName(key)}`);
}
function adminGiveDog(){
  upgrades.darkPact=true;upgrades.moralSupport=true;upgrades.boyfriendDog=true;upgrades.boyfriendDogSpirit=false;dogKidnapped=false;dogSacrificeUsed=false;forceDemonNextBoss=true;
  doneFusionPairs[sortedPair("darkPact","moralSupport")]=true;
  fusedUpgradeNames.darkPact="Tu novio ha hecho este juego";fusedUpgradeNames.moralSupport="Tu novio ha hecho este juego";
  updateHud();renderPauseMenu();adminMessage("perro dado · próximo jefe demonio");
}
function adminMaxAllUpgrades(){
  Object.keys(upgradeLevels).forEach(k=>upgradeLevels[k]=upgradeMaxLevels[k]||5);
  uniqueFusionKeys.forEach(k=>adminGiveUnique(k));
  applyUpgradeStatsFromLevels();life=upgrades.maxLife;updateHud();renderPauseMenu();adminMessage("todas las mejoras al máximo");
}
function adminShuffleArray(arr){
  const copy=[...arr];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
function adminClearFusionState(){
  doneFusionPairs={};
  fusedUpgradeNames={};
  fusionProgressLevels={};
  Object.keys(fusedBaseLevels).forEach(k=>delete fusedBaseLevels[k]);
  upgrades.fusionBonusPower=0;
}
function adminApplyRandomFusionPair(a,b){
  if(!a||!b||a===b||!areFusionCompatible(a,b))return false;
  const pair=sortedPair(a,b);
  if(!isOfficialFusionPairKey(pair))return false;
  if(doneFusionPairs[pair]||fusedUpgradeNames[a]||fusedUpgradeNames[b])return false;
  doneFusionPairs[pair]=true;
  const name=getFusionNameFromPair(a,b);
  fusedUpgradeNames[a]=name;
  fusedUpgradeNames[b]=name;
  fusionProgressLevels[pair]=0;
  setFusionProgress(pair,0);
  applyFusionBonus(pair,a,b);
  return true;
}
function adminOpenShop(){
  if(!gameStarted){
    gameStarted=true;
    startPanel.style.display="none";
    restart(1);
  }
  paused=false;
  if(pausePanel)pausePanel.style.display="none";
  choosingUpgrade=false;
  shopAvailable=true;
  openCoinShop();
  adminMessage("tienda abierta");
}
function isOfficialFusionPairKey(pair){
  return !!(FUSION_BY_PAIR[pair]||fusionNameMap[pair]||fusionShortDescMap[pair]||fusionEffectDescMap[pair]);
}
function adminBuildRandomFusionSet(preferredPairs=[]){
  // El admin aleatoriza un conjunto de fusiones oficiales sin repetir ninguna mejora base.
  // Las parejas preferidas se intentan incluir primero para probar fusiones nuevas.
  rebuildFusionDataCatalogue();
  const officialPairs=adminShuffleArray(FUSION_DATA.map(f=>f.pair))
    .map(pair=>sortedPair(...pair.split("+")))
    .filter((pair,idx,arr)=>arr.indexOf(pair)===idx)
    .filter(pair=>{
      const [a,b]=pair.split("+");
      return areFusionCompatible(a,b)&&isOfficialFusionPairKey(pair);
    });

  const allKeys=[...new Set([...Object.keys(upgradeLevels),...uniqueFusionKeys])];
  const preferred=preferredPairs
    .map(pair=>sortedPair(...String(pair).split("+")))
    .filter(pair=>officialPairs.includes(pair));
  let bestSelected=[];
  let bestUsedCount=0;

  for(let attempt=0;attempt<300;attempt++){
    const used=new Set();
    const selected=[];
    preferred.forEach(pair=>{
      const [a,b]=pair.split("+");
      if(!allKeys.includes(a)||!allKeys.includes(b))return;
      if(used.has(a)||used.has(b))return;
      selected.push([a,b]);
      used.add(a);
      used.add(b);
    });
    adminShuffleArray(officialPairs).forEach(pair=>{
      const [a,b]=pair.split("+");
      if(!allKeys.includes(a)||!allKeys.includes(b))return;
      if(used.has(a)||used.has(b))return;
      selected.push([a,b]);
      used.add(a);
      used.add(b);
    });
    if(used.size>bestUsedCount){
      bestUsedCount=used.size;
      bestSelected=selected;
    }
    if(bestUsedCount===allKeys.length)break;
  }

  return bestSelected;
}
function adminCompleteAllFusions(){
  adminMaxAllUpgrades();
  adminClearFusionState();

  const pairs=adminBuildRandomFusionSet(["catInstinct+coinMagnet","bigCursor+boomerang","boomerang+catInstinct","catInstinct+omniBurst","coinMagnet+darkPact"]);
  let applied=0;
  pairs.forEach(([a,b])=>{if(adminApplyRandomFusionPair(a,b))applied++;});

  Object.keys(upgradeLevels).forEach(k=>{upgradeLevels[k]=upgradeMaxLevels[k]||5;});
  applyUpgradeStatsFromLevels();
  life=upgrades.maxLife;
  updateHud();
  renderPauseMenu();
  adminMessage(`set aleatorio sin repetir bases · ${applied} fusiones`);
  checkGameCompletion();
}
function adminSpawnBoss(forceDemon=false){
  if(!gameStarted){gameStarted=true;startPanel.style.display="none";restart(1);}
  cats.length=0;fishes.length=0;quacks.length=0;yarnBalls.length=0;demonOrbs.length=0;boss=null;
  if(forceDemon){upgrades.boyfriendDog=true;dogKidnapped=false;forceDemonNextBoss=true;wave=Math.max(15,wave);}
  spawnBoss();
  waveTime=0;
  adminMessage(forceDemon?"demonio invocado":"jefe invocado");
}
initAutoMode();
initAdminPanel();

restart();gameStarted=false;startPanel.style.display="flex";requestAnimationFrame(loop);





