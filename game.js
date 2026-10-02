const gameStorage=(()=>{
  const memory=new Map();
  let unavailable=false;
  function warn(){
    if(unavailable)return;
    unavailable=true;
    console.warn("El almacenamiento local no está disponible; el progreso de esta sesión es temporal.");
  }
  return {
    getItem(key){
      if(memory.has(key))return memory.get(key);
      try{return localStorage.getItem(key)}catch(e){warn();return null}
    },
    setItem(key,value){
      value=String(value);memory.set(key,value);
      try{localStorage.setItem(key,value)}catch(e){warn()}
    },
    get unavailable(){return unavailable}
  };
})();
function savedObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function safeCount(value,fallback=0){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(n))):fallback}
let simulationMs=0,frameAccumulator=0,updatingWorld=false;
const BOSS_TYPES=Object.freeze(["giantCat","duck","seal","demon","octopus"]);
const END_GAME_FRAME=Symbol("end-game-frame");
function gameNow(){return simulationMs}

const canvas=document.getElementById("game");
const bossPathCache=new Map();
let ctx=canvas.getContext("2d");
const scoreEl=document.getElementById("score"),shotsEl=document.getElementById("shots"),lifeEl=document.getElementById("life"),levelEl=document.getElementById("level"),xpEl=document.getElementById("xp"),xpNeedEl=document.getElementById("xpNeed"),waveEl=document.getElementById("wave"),timeLeftEl=document.getElementById("timeLeft"),lifeBar=document.getElementById("lifeBar"),xpBar=document.getElementById("xpBar"),timeBar=document.getElementById("timeBar"),messageEl=document.getElementById("message"),startPanel=document.getElementById("startPanel"),startButton=document.getElementById("startButton"),levelUpPhrase=document.getElementById("levelUpPhrase"),levelUpPanel=document.getElementById("levelUpPanel"),levelUpBox=document.getElementById("levelUpBox"),upgradeCards=document.getElementById("upgradeCards"),upgradeTitle=document.getElementById("upgradeTitle"),upgradeSubtitle=document.getElementById("upgradeSubtitle"),coinsEl=document.getElementById("coins");
const victoryPanel=document.getElementById("victoryPanel"),victoryFinishBtn=document.getElementById("victoryFinish"),victoryContinueBtn=document.getElementById("victoryContinue");
const gameOverPanel=document.getElementById("gameOverPanel"),gameOverRestartBtn=document.getElementById("gameOverRestart"),gameOverMenuBtn=document.getElementById("gameOverMenu"),gameOverTotalEl=document.getElementById("gameOverTotal"),gameOverBreakdownEl=document.getElementById("gameOverBreakdown"),gameOverRankEmojiEl=document.getElementById("gameOverRankEmoji"),gameOverRankLabelEl=document.getElementById("gameOverRankLabel"),victoryScoreAreaEl=document.getElementById("victoryScoreArea");
const fusionBackBtn=document.getElementById("fusionBackBtn");
const objectiveMainEl=document.getElementById("objectiveMain"),objectiveFusionEl=document.getElementById("objectiveFusion"),helpEl=document.getElementById("help");
const pausePanel=document.getElementById("pausePanel"),pauseStats=document.getElementById("pauseStats"),pauseRecordBadge=document.getElementById("pauseRecordBadge"),pauseUpgradesList=document.getElementById("pauseUpgradesList"),resumeButton=document.getElementById("resumeButton"),restartButton=document.getElementById("restartButton"),menuButton=document.getElementById("menuButton"),perfNotice=null,themeButtons=[...document.querySelectorAll(".themeChoice")];
const playerNameInput=document.getElementById("playerNameInput"),nameWarning=document.getElementById("nameWarning"),refreshRankingBtn=document.getElementById("refreshRankingBtn"),startRankingList=document.getElementById("startRankingList"),victoryRankingList=document.getElementById("victoryRankingList"),gameOverRankingList=document.getElementById("gameOverRankingList"),victoryOnlineStatus=document.getElementById("victoryOnlineStatus"),gameOverOnlineStatus=document.getElementById("gameOverOnlineStatus");

const MUSIC_KEY="gatitos_music_enabled";
const MUSIC_VOL_KEY="gatitos_music_volume";
let musicEnabled=gameStorage.getItem(MUSIC_KEY)!=="0";
let musicVolume=Math.max(0,Math.min(1,(Number.isFinite(Number(gameStorage.getItem(MUSIC_VOL_KEY)??"0.28"))?Number(gameStorage.getItem(MUSIC_VOL_KEY)??"0.28"):0.28)));
let currentMusicTrack="";
let musicFadeTimer=null;
const musicMenuToggle=document.getElementById("musicMenuToggle");
const musicVolumeRange=document.getElementById("musicVolumeRange");
const musicVolumeValue=document.getElementById("musicVolumeValue");
const pauseMusicToggle=document.getElementById("pauseMusicToggle");
const pauseMusicVolumeRange=document.getElementById("pauseMusicVolumeRange");
const pauseMusicVolumeValue=document.getElementById("pauseMusicVolumeValue");
const bgMusic=new Audio("audio/Rondas.mp3");
const bossMusic=new Audio("audio/Jefes.mp3");
[bgMusic,bossMusic].forEach(a=>{
  a.loop=true;
  a.preload="auto";
  a.volume=0;
});
function getMusicTargetVolume(track){
  const mul=track==="boss"?1.12:.88;
  return Math.max(0,Math.min(.70,musicVolume*mul));
}
function updateMusicButton(){
  const label=musicEnabled?"🎵 Música":"🔇 Música";
  [musicMenuToggle,pauseMusicToggle].forEach(btn=>{
    if(!btn)return;
    btn.textContent=musicEnabled?"🎵 Música activada":"🔇 Música desactivada";
    btn.classList.toggle("off",!musicEnabled);
  });
  [musicVolumeRange,pauseMusicVolumeRange].forEach(range=>{if(range)range.value=String(Math.round(musicVolume*100));});
  [musicVolumeValue,pauseMusicVolumeValue].forEach(label=>{if(label)label.textContent=`${Math.round(musicVolume*100)}%`;});
}
function saveMusicSettings(){
  try{
    gameStorage.setItem(MUSIC_KEY,musicEnabled?"1":"0");
    gameStorage.setItem(MUSIC_VOL_KEY,String(musicVolume));
  }catch(e){}
}
function fadeAudio(audio,target,duration=650){
  if(!audio)return;
  const token=audio._fadeToken=(audio._fadeToken||0)+1;
  const start=audio.volume||0;
  const t0=performance.now();
  function step(){
    if(audio._fadeToken!==token)return;
    const p=Math.min(1,(performance.now()-t0)/duration);
    audio.volume=start+(target-start)*p;
    if(p<1)requestAnimationFrame(step);
    else audio.volume=target;
  }
  requestAnimationFrame(step);
}
function playMusicTrack(track,force=false){
  if(!musicEnabled||musicVolume<=0||!gameStarted||gameOver){
    pauseAllMusic();
    return;
  }
  if(paused){
    pauseAllMusic();
    return;
  }
  const target=track==="boss"?bossMusic:bgMusic;
  const other=track==="boss"?bgMusic:bossMusic;
  if(!force&&currentMusicTrack===track&&!target.paused){
    fadeAudio(target,getMusicTargetVolume(track),220);
    return;
  }
  currentMusicTrack=track;
  other.pause();
  other.volume=0;
  try{
    target.play().catch(()=>{});
  }catch(e){}
  fadeAudio(target,getMusicTargetVolume(track),700);
}
function pauseAllMusic(){
  if(typeof starAudio!=="undefined"&&starAudio?.gain){try{starAudio.gain.gain.setValueAtTime(.0001,audioCtx.currentTime)}catch(e){}}
  [bgMusic,bossMusic].forEach(a=>{try{a._fadeToken=(a._fadeToken||0)+1;a.pause()}catch(e){}});
}
function stopAllMusic(){
  currentMusicTrack="";
  [bgMusic,bossMusic].forEach(a=>{
    try{a._fadeToken=(a._fadeToken||0)+1;a.pause();a.currentTime=0;a.volume=0}catch(e){}
  });
}
function syncMusic(){
  if(!musicEnabled||musicVolume<=0||!gameStarted||gameOver){
    pauseAllMusic();
    return;
  }
  if(paused){
    pauseAllMusic();
    return;
  }
  playMusicTrack(boss&&boss.hp>0?"boss":"round");
}
function toggleMusicEnabled(){
  musicEnabled=!musicEnabled;
  saveMusicSettings();
  updateMusicButton();
  if(musicEnabled)syncMusic();
  else stopAllMusic();
}
musicMenuToggle?.addEventListener("click",toggleMusicEnabled);
pauseMusicToggle?.addEventListener("click",toggleMusicEnabled);
function handleMusicVolumeInput(e){
  musicVolume=Math.max(0,Math.min(1,(Number(e.target.value)||0)/100));
  if(musicVolume>0&&!musicEnabled)musicEnabled=true;
  saveMusicSettings();
  updateMusicButton();
  syncMusic();
}
musicVolumeRange?.addEventListener("input",handleMusicVolumeInput);
pauseMusicVolumeRange?.addEventListener("input",handleMusicVolumeInput);
updateMusicButton();

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
  if(document.pointerLockElement===canvas)return {x:mouse.x,y:mouse.y};
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/(rect.width||canvas.width||1);
  const sy=canvas.height/(rect.height||canvas.height||1);
  return{
    x:(e.clientX-rect.left)*sx,
    y:(e.clientY-rect.top)*sy
  };
}
resize();window.addEventListener("resize",resize);
let panelTheme=gameStorage.getItem("gatitosPanelTheme")||"light";
function applyPanelTheme(theme){
  panelTheme=theme==="dark"?"dark":"light";
  document.body.classList.toggle("panel-theme-dark",panelTheme==="dark");
  themeButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.theme===panelTheme));
  try{gameStorage.setItem("gatitosPanelTheme",panelTheme)}catch(e){}

}
themeButtons.forEach(btn=>btn.addEventListener("click",()=>applyPanelTheme(btn.dataset.theme)));

applyPanelTheme(panelTheme);

const GAME_VERSION=window.GAME_BUILD||"v.144";
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
let rankingCursor=null,rankingHasMore=false,rankingRequestId=0;
let expandedRankingNameKey="";
function initRanking(){
  try{
    const fb=window.firebase;
    if(fb&&firebaseConfig?.projectId){
      if(!fb.apps.length)fb.initializeApp(firebaseConfig);
      rankingDb=fb.firestore();
      firebaseReady=true;
    }
  }catch(e){firebaseReady=false;console.warn("Firebase ranking no disponible",e)}
}
function cleanPlayerName(value){
  return String(value||"").replace(/[<>]/g,"").replace(/\s+/g," ").trim().slice(0,32);
}
function getPlayerName(){
  const typed=cleanPlayerName(playerNameInput?.value||"");
  if(typed)return typed;
  return cleanPlayerName(gameStorage.getItem(PLAYER_NAME_KEY)||"");
}
function savePlayerName(name){
  currentPlayerName=cleanPlayerName(name)||"Jugador";
  try{gameStorage.setItem(PLAYER_NAME_KEY,currentPlayerName)}catch(e){}
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
    if(btn)btn.textContent=rankingExpanded?"Ver top":"Ver más";
    if(chk){
      chk.checked=!!rankingShowDuplicates;
      chk.closest(".onlineRankDuplicateToggle")?.classList.toggle("visible",rankingExpanded);
    }
  });
}
function renderRankingList(el,items,sharedNameCounts=null){
  if(!el)return;
  if(!firebaseReady){el.innerHTML='<div class="onlineRankStatus">Ranking online no disponible.</div>';return;}
  if(!items||!items.length){el.innerHTML='<div class="onlineRankStatus">Todavía no hay puntuaciones. Sé la primera persona 💖</div>';return;}
  const me=cleanPlayerName(playerNameInput?.value||currentPlayerName);
  const rankNameCounts=sharedNameCounts||getRankingNameCounts();
  const rows=items.map((row,index)=>({...row,_shownRank:index+1,_nameKey:rankingNameKey(row?.name)}));
  el.innerHTML=rows.map((s,i)=>{
    const safeName=escapeHtml(cleanPlayerName(s.name)||"Jugador");
    const isMe=me&&safeName.toLowerCase()===escapeHtml(me).toLowerCase();
    const isGold=!!s.goldenName||(isMe&&hasGoldenPlayerName());
    const total=Number(s.score||0).toLocaleString();
    const meta=`Ronda ${Number(s.wave||0)} · Nivel ${Number(s.level||0)} · Tiempo ${Number.isFinite(s.elapsedSeconds)?formatRunTime(s.elapsedSeconds):"sin registrar"}`;
    const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
    const realRank=s._fullRank&&s._fullRank!==i+1?` · puesto real #${s._fullRank}`:"";
    const duplicateCount=rankNameCounts.get(s._nameKey)||1;
    const dupeHint=duplicateCount>1&&!rankingShowDuplicates?` · ${duplicateCount} partidas`:"";
    const detailsOpen=expandedRankingNameKey&&expandedRankingNameKey===s._nameKey;
    const details=detailsOpen?renderRankingNameDetails(s._nameKey):"";
    return `<div role="button" tabindex="0" class="onlineRankRow ${isMe?"me":""} ${isGold?"goldenRankRow":""}" data-rank-name="${escapeHtml(s._nameKey)}" title="Click para ver sus otras posiciones"><div class="onlineRankPos">${medal}</div><div class="onlineRankName ${isGold?"goldenName":""}">${safeName}</div><div class="onlineRankScore">${total}</div><div class="onlineRankMeta">${escapeHtml(meta+realRank+dupeHint)}</div>${details}</div>`;
  }).join("");
  el.querySelectorAll(".onlineRankRow").forEach(row=>row.addEventListener("click",()=>{
    const key=row.dataset.rankName||"";
    expandedRankingNameKey=expandedRankingNameKey===key?"":key;
    renderAllRankingLists();
  }));
}
rankingLists.forEach(id=>rankingListEls[id]?.addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ")return;
  const row=e.target.closest(".onlineRankRow");
  if(row){e.preventDefault();row.click();}
}));
function renderRankingNameDetails(nameKey){
  const rows=getRankingPositionsForName(nameKey);
  if(rows.length<=1)return `<div class="onlineRankDetails">Solo aparece una puntuación en los resultados cargados.</div>`;
  const positions=rows.slice(0,12).map(r=>`#${r._fullRank}: ${Number(r.score||0).toLocaleString()} pts · R${Number(r.wave||0)} · Nv${Number(r.level||0)} · ${Number.isFinite(r.elapsedSeconds)?formatRunTime(r.elapsedSeconds):"Tiempo sin registrar"}`).join("<br>");
  const more=rows.length>12?`<br>… y ${rows.length-12} más`:"";
  return `<div class="onlineRankDetails"><b>También aparece en:</b><br>${positions}${more}</div>`;
}
function getRankingNameCounts(){
  const counts=new Map();
  for(const row of dedupeScoreRows(lastRankingRawRows)){
    const key=rankingNameKey(row?.name);
    counts.set(key,(counts.get(key)||0)+1);
  }
  return counts;
}
function renderAllRankingLists(targetEls=[startRankingList,victoryRankingList,gameOverRankingList].filter(Boolean)){
  updateRankingControlVisibility();
  const rows=getRowsForRankingView();
  const limited=rankingExpanded?rows:rows.slice(0,10);
  const nameCounts=getRankingNameCounts();
  targetEls.forEach(el=>{
    renderRankingList(el,limited,nameCounts);
    if(el&&rankingExpanded&&rankingHasMore){
      const more=document.createElement("button");
      more.className="onlineRankRefresh";more.type="button";more.textContent="Cargar más puntuaciones";
      more.addEventListener("click",()=>{more.disabled=true;loadOnlineRanking(rankingLists.map(id=>rankingListEls[id]).filter(Boolean),true)});
      el.appendChild(more);
    }
  });
}
function getRankQueryLimit(){
  return 100;
}
function getScoreIdentityKey(data){
  if(data?._docId)return `doc:${data._docId}`;
  const stamp=data?.createdAt?.seconds??data?.createdAt?.toMillis?.()??data?.savedAt??"";
  return `${cleanPlayerName(data?.name)||"Jugador"}|${Number(data?.score||0)}|${Number(data?.wave||0)}|${Number(data?.level||0)}|${Number(data?.bosses||0)}|${Number(data?.impacts||0)}|${Number(data?.elapsedSeconds??-1)}|${stamp}`;
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
async function loadOnlineRanking(targetEls=[startRankingList],append=false){
  initRanking();
  const requestId=++rankingRequestId;
  targetEls.forEach(el=>{if(el&&!append)el.innerHTML='<div class="onlineRankStatus">Cargando ranking...</div>';});
  updateRankingControlVisibility();
  if(!firebaseReady||!rankingDb){targetEls.forEach(el=>renderRankingList(el,[]));return;}
  if(append&&!rankingHasMore)return;
  try{
    let query=rankingDb.collection("scores").orderBy("score","desc").limit(getRankQueryLimit());
    if(append&&rankingCursor)query=query.startAfter(rankingCursor);
    const snap=await query.get();
    if(requestId!==rankingRequestId)return;
    const docs=[];snap.forEach(doc=>docs.push(doc));
    const rows=docs.map(doc=>({...doc.data(),_docId:doc.id})).filter(row=>row&&Number.isFinite(Number(row.score)));
    rankingCursor=docs[docs.length-1]||null;
    rankingHasMore=docs.length===getRankQueryLimit();
    lastRankingRawRows=(append?lastRankingRawRows.concat(rows):rows).sort((a,b)=>Number(b.score||0)-Number(a.score||0));
    renderAllRankingLists(targetEls);
  }catch(e){
    if(requestId!==rankingRequestId)return;
    console.warn("No se pudo cargar ranking",e);
    targetEls.forEach(el=>{if(el)el.innerHTML='<div class="onlineRankStatus">No se pudo cargar el ranking. Pulsa Actualizar para reintentarlo.</div>';});
  }
}
const SCORE_BACKUP_KEY="gatitos_pending_scores_v210";
const SCORE_HISTORY_KEY="gatitos_score_history_v210";
let retryingPendingScores=false;
let runScoreBackups=new Map();
function readScoreStore(key){
  try{const data=JSON.parse(gameStorage.getItem(key)||"[]");return Array.isArray(data)?data.filter(x=>x&&typeof x==="object"):[]}catch(e){return []}
}
function persistScoreStore(key,items){
  const value=JSON.stringify(items);
  try{localStorage.setItem(key,value);gameStorage.setItem(key,value);return localStorage.getItem(key)===value}catch(e){gameStorage.setItem(key,value);return false}
}
function scoreBackupId(){
  if(window.crypto?.randomUUID)return `score_${window.crypto.randomUUID().replace(/-/g,"")}`;
  return `score_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
function saveScoreBackup(data){
  const pending=readScoreStore(SCORE_BACKUP_KEY);
  if(!pending.some(x=>x.id===data.id))pending.push(data);
  const stored=persistScoreStore(SCORE_BACKUP_KEY,pending);
  const history=readScoreStore(SCORE_HISTORY_KEY);
  if(!history.some(x=>x.id===data.id))history.push(data);
  persistScoreStore(SCORE_HISTORY_KEY,history.slice(-60));
  updateScoreBackupUI();
  return stored;
}
function removePendingScore(id){
  persistScoreStore(SCORE_BACKUP_KEY,readScoreStore(SCORE_BACKUP_KEY).filter(x=>x.id!==id));
  updateScoreBackupUI();
}
function updateScoreBackupUI(){
  const pending=readScoreStore(SCORE_BACKUP_KEY).length;
  for(const el of document.querySelectorAll(".scoreBackupCount"))el.textContent=pending?`${pending} puntuación${pending===1?"":"es"} pendiente${pending===1?"":"s"} de subir.`:"No hay puntuaciones pendientes.";
}
function exportScoreBackup(){
  const history=readScoreStore(SCORE_HISTORY_KEY);
  const pending=readScoreStore(SCORE_BACKUP_KEY);
  const legacyBest=getHighScore();
  const data={game:"Gatitos & Peces",exportedAt:new Date().toISOString(),history,pending,legacyBestScore:legacyBest,legacyBestNote:"Récord antiguo: solo se conserva la puntuación; no se pueden reconstruir los datos de la partida."};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=`gatitos-puntuaciones-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function uploadBackedScore(entry,statusEl=null,rankingEl=null){
  initRanking();
  if(!firebaseReady||!rankingDb){setOnlineStatus(statusEl,"Puntuación respaldada. Firebase no está disponible; reintenta más tarde.","error");return false}
  if(uploadingScoreKeys.has(entry.id))return false;
  uploadingScoreKeys.add(entry.id);
  try{
    setOnlineStatus(statusEl,"Puntuación respaldada. Subiendo al ranking...","info");
    const {id,savedAt,...fields}=entry;
    const data={...fields,createdAt:window.firebase.firestore.FieldValue.serverTimestamp()};
    await rankingDb.collection("scores").doc(id).set(data);
    removePendingScore(id);
    lastScoreUploadKey=id;
    setOnlineStatus(statusEl,"Puntuación guardada en el ranking online 💖","ok");
    if(rankingEl)await loadOnlineRanking([startRankingList,rankingEl].filter(Boolean));
    return true;
  }catch(e){
    const code=String(e?.code||"unknown");
    console.warn("Ranking Firebase: puntuación conservada en el respaldo",code,e);
    if(code.includes("permission-denied")){
      try{
        const existing=await rankingDb.collection("scores").doc(entry.id).get();
        if(existing.exists){removePendingScore(entry.id);setOnlineStatus(statusEl,"Puntuación ya guardada en Firebase 💖","ok");return true}
      }catch(checkError){}
    }
    const msg=code.includes("permission-denied")?"Firebase rechazó la puntuación. Respaldo local conservado; revisa las reglas y pulsa Reintentar.":"No se pudo subir. Puntuación respaldada; puedes reintentar o descargar una copia.";
    setOnlineStatus(statusEl,msg,"error");
    return false;
  }finally{uploadingScoreKeys.delete(entry.id);updateScoreBackupUI()}
}
async function retryPendingScores(){
  if(retryingPendingScores)return;
  retryingPendingScores=true;
  try{
    const pending=readScoreStore(SCORE_BACKUP_KEY);
    if(!pending.length){updateScoreBackupUI();return}
    if(!firebaseReady||!rankingDb){initRanking();if(!firebaseReady)return}
    for(const entry of pending)await uploadBackedScore(entry);
    await loadOnlineRanking([startRankingList,victoryRankingList,gameOverRankingList].filter(Boolean));
  }finally{retryingPendingScores=false;updateScoreBackupUI()}
}
async function submitOnlineScore(finalScore,statusEl,rankingEl){
  const aiScoreRun=false;
  if(!aiScoreRun&&!rankingEligibleThisRun){
    setOnlineStatus(statusEl,rankingDisabledReason||"Ranking desactivado para esta partida.","error");
    return;
  }
  const name=savePlayerName(getPlayerName()||"Jugador");
  const data={
    id:scoreBackupId(),savedAt:new Date().toISOString(),name,
    goldenName:hasGoldenPlayerName(),
    score:Math.max(0,Math.floor(Number(finalScore.total)||0)),
    wave:Math.max(1,Math.floor(Number(wave)||1)),
    level:Math.max(1,Math.floor(Number(level)||1)),
    elapsedSeconds:Math.max(0,Math.floor(runStats?.elapsed||0)),
    bosses:Math.max(0,Math.min(BOSS_TYPES.length,Math.floor(defeatedBossTypes?.size||0))),
    impacts:Math.max(0,Math.floor(Number(finalScore.impactCount)||0)),
    result:defeatedBossTypes?.size>=BOSS_TYPES.length?"boss_victory":"game_over",
    version:GAME_VERSION
  };
  const uploadKey=getScoreIdentityKey({...data,savedAt:""});
  const previousId=runScoreBackups.get(uploadKey);
  if(previousId){
    const previous=readScoreStore(SCORE_BACKUP_KEY).find(x=>x.id===previousId);
    if(previous)await uploadBackedScore(previous,statusEl,rankingEl);
    else setOnlineStatus(statusEl,"Puntuación ya registrada en el ranking.","ok");
    return;
  }
  runScoreBackups.set(uploadKey,data.id);
  const durable=saveScoreBackup(data);
  if(!durable)setOnlineStatus(statusEl,"El navegador no permite guardar el respaldo. Descarga una copia antes de salir.","error");
  await uploadBackedScore(data,statusEl,rankingEl);
  if(!durable&&readScoreStore(SCORE_BACKUP_KEY).some(x=>x.id===data.id))setOnlineStatus(statusEl,"Puntuación conservada solo durante esta sesión: descarga una copia JSON antes de cerrar.","error");
}
if(playerNameInput){
  playerNameInput.value=cleanPlayerName(gameStorage.getItem(PLAYER_NAME_KEY)||"");
  playerNameInput.addEventListener("input",()=>{
    const clean=cleanPlayerName(playerNameInput.value);
    if(playerNameInput.value!==clean)playerNameInput.value=clean;
    if(nameWarning)nameWarning.textContent="";
    document.getElementById("startBox")?.classList.remove("nameError");
  });
}
if(refreshRankingBtn)refreshRankingBtn.addEventListener("click",()=>{loadOnlineRanking([startRankingList]);retryPendingScores()});
document.querySelectorAll(".scoreBackupDownload").forEach(btn=>btn.addEventListener("click",exportScoreBackup));
document.querySelectorAll(".scoreBackupRetry").forEach(btn=>btn.addEventListener("click",retryPendingScores));
window.addEventListener("online",()=>retryPendingScores());
updateScoreBackupUI();
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

const COSMETIC_KEYS={scales:"gatitos_cosmetic_scales",owned:"gatitos_cosmetic_owned",selected:"gatitos_cosmetic_selected"};
const cosmeticPanel=document.getElementById("cosmeticsPanel"),scaleBalanceEl=document.getElementById("scaleBalance"),cosmeticsContentEl=document.getElementById("cosmeticsContent"),cosmeticsSkinsTab=document.getElementById("cosmeticsSkinsTab"),cosmeticsPacksTab=document.getElementById("cosmeticsPacksTab"),cosmeticsResetBtn=document.getElementById("cosmeticsResetBtn");
const COSMETIC_CATEGORIES={player:"Jugador",fish:"Peces",enemy:"Enemigos",boss_giant:"Jefe gato gigante",boss_duck:"Jefe pato",boss_seal:"Jefe foca",boss_demon:"Jefe demonio",boss_octopus:"Jefe pulpo"};
const COSMETICS=[
  {id:"player_pirate",name:"Capitana Patita",category:"player",price:190,preview:"🏴‍☠️",pack:"pirate"},
  {id:"enemy_pirate",name:"Gatos de cubierta",category:"enemy",price:220,preview:"🏴‍☠️",pack:"pirate"},
  {id:"boss_giant_pirate",name:"Almirante Bigotes",category:"boss_giant",price:290,preview:"🏴‍☠️",pack:"pirate"},
  {id:"boss_duck_pirate",name:"Pato bucanero",category:"boss_duck",price:270,preview:"🏴‍☠️",pack:"pirate"},
  {id:"boss_seal_pirate",name:"Foca navegante",category:"boss_seal",price:270,preview:"🏴‍☠️",pack:"pirate"},
  {id:"boss_demon_pirate",name:"Demonio del abordaje",category:"boss_demon",price:300,preview:"🏴‍☠️",pack:"pirate"},
  {id:"boss_octopus_pirate",name:"Pulpo de los siete mares",category:"boss_octopus",price:300,preview:"🏴‍☠️",pack:"pirate"},
  {id:"player_biolum",name:"Gato luciérnaga",category:"player",price:190,preview:"🪼",pack:"biolum"},
  {id:"fish_biolum",name:"Pez abisal",category:"fish",price:210,preview:"🪼",pack:"biolum"},
  {id:"enemy_biolum",name:"Gatos de marea",category:"enemy",price:220,preview:"🪼",pack:"biolum"},
  {id:"boss_giant_biolum",name:"Coloso fosforescente",category:"boss_giant",price:290,preview:"🪼",pack:"biolum"},
  {id:"boss_duck_biolum",name:"Pato medusa",category:"boss_duck",price:270,preview:"🪼",pack:"biolum"},
  {id:"boss_seal_biolum",name:"Foca aurora",category:"boss_seal",price:270,preview:"🪼",pack:"biolum"},
  {id:"boss_demon_biolum",name:"Demonio de las profundidades",category:"boss_demon",price:300,preview:"🪼",pack:"biolum"},
  {id:"boss_octopus_biolum",name:"Pulpo de luz abisal",category:"boss_octopus",price:300,preview:"🪼",pack:"biolum"},
  {id:"player_celestial",name:"Gato estelar",category:"player",price:190,preview:"🌙",pack:"celestial"},
  {id:"fish_celestial",name:"Pez cometa",category:"fish",price:210,preview:"🌙",pack:"celestial"},
  {id:"enemy_celestial",name:"Gatos de constelación",category:"enemy",price:220,preview:"🌙",pack:"celestial"},
  {id:"boss_giant_celestial",name:"Titán solar",category:"boss_giant",price:290,preview:"🌙",pack:"celestial"},
  {id:"boss_duck_celestial",name:"Pato lunático",category:"boss_duck",price:270,preview:"🌙",pack:"celestial"},
  {id:"boss_seal_celestial",name:"Foca de luna",category:"boss_seal",price:270,preview:"🌙",pack:"celestial"},
  {id:"boss_demon_celestial",name:"Demonio eclipsado",category:"boss_demon",price:300,preview:"🌙",pack:"celestial"},
  {id:"boss_octopus_celestial",name:"Pulpo del firmamento",category:"boss_octopus",price:300,preview:"🌙",pack:"celestial"},
  {id:"boss_octopus_elegant",name:"Pulpo · Almirante de marfil",category:"boss_octopus",price:280,preview:"🐙",pack:"elegant"},
  {id:"boss_octopus_low_poly",name:"Pulpo · Octágono abisal",category:"boss_octopus",price:280,preview:"🐙",pack:"low_poly"},
  {id:"boss_octopus_grayscale",name:"Pulpo · Tinta de plata",category:"boss_octopus",price:280,preview:"◐",pack:"grayscale"},
  {id:"player_green",name:"Jugador · Guardián del bosque",category:"player",price:100,preview:"🟢"},
  {id:"player_pink",name:"Jugador · Flor de cerezo",category:"player",price:100,preview:"🌸"},
  {id:"player_elegant",name:"Jugador · Gala de marfil",category:"player",price:200,preview:"🎀",pack:"elegant"},
  {id:"fish_elegant",name:"Peces · Sombrero de copa",category:"fish",price:250,preview:"🎩",pack:"elegant"},
  {id:"fish_pirate",name:"Peces · Corsarios",category:"fish",price:180,preview:"🏴‍☠️",pack:"pirate"},
  {id:"fish_heart",name:"Peces · Corazones",category:"fish",price:180,preview:"💖"},
  {id:"fish_realistic",name:"Peces · Sardina realista",category:"fish",price:180,preview:"📷"},
  {id:"enemy_gray",name:"Enemigos · Tigres de plata",category:"enemy",price:150,preview:"🐱"},
  {id:"enemy_elegant",name:"Enemigos · Pajarita de gala",category:"enemy",price:250,preview:"🎀",pack:"elegant"},
  {id:"boss_duck_monocle",name:"Pato · Señor Monóculo",category:"boss_duck",price:250,preview:"🦆",pack:"elegant"},
  {id:"boss_seal_tie",name:"Foca · Dama de las perlas",category:"boss_seal",price:250,preview:"🦭",pack:"elegant"},
  {id:"boss_demon_cape",name:"Demonio · Conde Carmesí",category:"boss_demon",price:300,preview:"😈",pack:"elegant"},
  {id:"player_low_poly",name:"Jugador · Gato poligonal",category:"player",price:180,preview:"🐱",pack:"low_poly"},
  {id:"fish_low_poly",name:"Peces · Pez poligonal",category:"fish",price:180,preview:"🐟",pack:"low_poly"},
  {id:"enemy_low_poly",name:"Enemigos · Gatos poligonales",category:"enemy",price:220,preview:"🐈",pack:"low_poly"},
  {id:"boss_giant_low_poly",name:"Gato jefe · Coloso poligonal",category:"boss_giant",price:260,preview:"😼",pack:"low_poly"},
  {id:"boss_giant_elegant",name:"Gato jefe · Duque de marfil",category:"boss_giant",price:300,preview:"👑",pack:"elegant"},
  {id:"boss_duck_low_poly",name:"Pato · Pico poligonal",category:"boss_duck",price:260,preview:"🦆",pack:"low_poly"},
  {id:"boss_seal_low_poly",name:"Foca · Bloque polar",category:"boss_seal",price:260,preview:"🦭",pack:"low_poly"},
  {id:"boss_demon_low_poly",name:"Demonio · Prisma oscuro",category:"boss_demon",price:300,preview:"😈",pack:"low_poly"},
  {"id": "player_grayscale", "name": "Jugador · Retrato en blanco y negro", "category": "player", "price": 180, "preview": "◐", "pack": "grayscale"},
  {"id": "fish_grayscale", "name": "Peces · Tinta y plata", "category": "fish", "price": 180, "preview": "◐", "pack": "grayscale"},
  {"id": "enemy_grayscale", "name": "Enemigos · Cine mudo", "category": "enemy", "price": 220, "preview": "◐", "pack": "grayscale"},
  {"id": "boss_giant_grayscale", "name": "Gato jefe · Titán monocromo", "category": "boss_giant", "price": 260, "preview": "◐", "pack": "grayscale"},
  {"id": "boss_duck_grayscale", "name": "Pato · Fotograma clásico", "category": "boss_duck", "price": 260, "preview": "◐", "pack": "grayscale"},
  {"id": "boss_seal_grayscale", "name": "Foca · Nieve y carbón", "category": "boss_seal", "price": 260, "preview": "◐", "pack": "grayscale"},
  {"id": "boss_demon_grayscale", "name": "Demonio · Sombra de celuloide", "category": "boss_demon", "price": 300, "preview": "◐", "pack": "grayscale"}
];
const COSMETIC_PACKS=[{id:"elegant",name:"Pack Elegante",discount:.20,items:["player_elegant","fish_elegant","enemy_elegant","boss_giant_elegant","boss_duck_monocle","boss_seal_tie","boss_demon_cape","boss_octopus_elegant"],desc:"Marfil, pajaritas, sombreros, monóculos, coronas, perlas, capas y gorra de almirante."},{id:"low_poly",name:"Pack Low Poly",discount:.25,items:["player_low_poly","fish_low_poly","enemy_low_poly","boss_giant_low_poly","boss_duck_low_poly","boss_seal_low_poly","boss_demon_low_poly","boss_octopus_low_poly"],desc:"Personajes y proyectiles facetados, con siluetas propias y reconocibles."}];
COSMETIC_PACKS.push({"id": "grayscale", "name": "Pack Escala de grises", "discount": 0.25, "items": ["player_grayscale", "fish_grayscale", "enemy_grayscale", "boss_giant_grayscale", "boss_duck_grayscale", "boss_seal_grayscale", "boss_demon_grayscale", "boss_octopus_grayscale"], "desc": "Ocho skins en blanco y negro. Las variantes se distinguen por sus formas y accesorios."});

COSMETIC_PACKS.push({id:"pirate",name:"Pack Pirata",discount:0.23,items:["player_pirate", "fish_pirate", "enemy_pirate", "boss_giant_pirate", "boss_duck_pirate", "boss_seal_pirate", "boss_demon_pirate", "boss_octopus_pirate"],desc:"Sombreros, pañuelos, parches y detalles marineros diferentes en cada personaje."});
COSMETIC_PACKS.push({id:"biolum",name:"Pack Bioluminiscente",discount:0.25,items:["player_biolum", "fish_biolum", "enemy_biolum", "boss_giant_biolum", "boss_duck_biolum", "boss_seal_biolum", "boss_demon_biolum", "boss_octopus_biolum"],desc:"Marcas luminiscentes marinas, aletas y tentáculos con puntos de luz suaves."});
COSMETIC_PACKS.push({id:"celestial",name:"Pack Celestial",discount:0.25,items:["player_celestial", "fish_celestial", "enemy_celestial", "boss_giant_celestial", "boss_duck_celestial", "boss_seal_celestial", "boss_demon_celestial", "boss_octopus_celestial"],desc:"Coronas astrales, lunas, estrellas y constelaciones adaptadas a cada silueta."});
let cosmeticTab="skins";
let cosmeticFilter="all";
let cosmeticPreviewGeneration=0;
let randomSkinsEnabled=gameStorage.getItem("gatitos_random_skins")==="true";
let runCosmeticSelections=null;
let cosmeticScales=0,ownedCosmetics=new Set(),selectedCosmetics={player:"default",fish:"default",enemy:"default",boss_giant:"default",boss_duck:"default",boss_seal:"default",boss_demon:"default",boss_octopus:"default"};
let cosmeticAwardedThisRun=false,cosmeticScalesAwardedThisRun=0;
function safeJsonParse(value,fallback){try{return JSON.parse(value)}catch(e){return fallback}}
function loadCosmetics(){
  cosmeticScales=safeCount(gameStorage.getItem(COSMETIC_KEYS.scales));
  const rawOwned=safeJsonParse(gameStorage.getItem(COSMETIC_KEYS.owned)||"[]",[]);
  ownedCosmetics=new Set((Array.isArray(rawOwned)?rawOwned:[]).filter(id=>COSMETICS.some(c=>c.id===id)));
  const rawSelected=savedObject(safeJsonParse(gameStorage.getItem(COSMETIC_KEYS.selected)||"{}",{}));
  Object.keys(selectedCosmetics).forEach(category=>{
    const id=rawSelected[category];
    selectedCosmetics[category]=ownedCosmetics.has(id)&&COSMETICS.some(c=>c.id===id&&c.category===category)?id:"default";
  });
}
function saveCosmetics(){
  try{gameStorage.setItem(COSMETIC_KEYS.scales,String(cosmeticScales));gameStorage.setItem(COSMETIC_KEYS.owned,JSON.stringify([...ownedCosmetics]));gameStorage.setItem(COSMETIC_KEYS.selected,JSON.stringify(selectedCosmetics));}catch(e){}
}
function getCosmetic(id){return COSMETICS.find(c=>c.id===id)||null}
function isCosmeticOwned(id){return id==="default"||ownedCosmetics.has(id)}
function selectedCosmetic(category){return (runCosmeticSelections||selectedCosmetics)[category]||"default"}
function updateScaleBalance(){if(scaleBalanceEl)scaleBalanceEl.textContent=cosmeticScales.toLocaleString()}
function equipCosmetic(id){const c=getCosmetic(id);if(!c||!isCosmeticOwned(id))return;selectedCosmetics[c.category]=id;saveCosmetics();renderCosmetics()}
function resetCosmeticSelections(){selectedCosmetics={player:"default",fish:"default",enemy:"default",boss_giant:"default",boss_duck:"default",boss_seal:"default",boss_demon:"default",boss_octopus:"default"};saveCosmetics();renderCosmetics()}
function buyCosmetic(id){const c=getCosmetic(id);if(!c||ownedCosmetics.has(id)||cosmeticScales<c.price)return;cosmeticScales-=c.price;registerScalesSpent(c.price);ownedCosmetics.add(id);selectedCosmetics[c.category]=id;saveCosmetics();renderCosmetics()}
function getPackInfo(pack){
  const items=pack.items.map(getCosmetic).filter(Boolean);
  const owned=items.filter(i=>ownedCosmetics.has(i.id));
  const missing=items.filter(i=>!ownedCosmetics.has(i.id));
  const ownedValue=owned.reduce((s,i)=>s+i.price,0);
  const missingValue=missing.reduce((s,i)=>s+i.price,0);
  const totalValue=items.reduce((s,i)=>s+i.price,0);
  const price=Math.ceil(missingValue*(1-pack.discount));
  return{items,owned,missing,ownedValue,missingValue,totalValue,price,complete:missing.length===0};
}
function buyPack(id){const pack=COSMETIC_PACKS.find(p=>p.id===id);if(!pack)return;const info=getPackInfo(pack);if(info.complete||cosmeticScales<info.price)return;cosmeticScales-=info.price;registerScalesSpent(info.price);info.missing.forEach(i=>ownedCosmetics.add(i.id));saveCosmetics();renderCosmetics()}
function equipPack(id){const pack=COSMETIC_PACKS.find(p=>p.id===id);if(!pack)return;const info=getPackInfo(pack);if(!info.complete)return;info.items.forEach(i=>{selectedCosmetics[i.category]=i.id});saveCosmetics();renderCosmetics()}
function renderCosmeticCard(c){
  const owned=isCosmeticOwned(c.id),equipped=selectedCosmetic(c.category)===c.id;
  const btn=equipped?`<button class="cosmeticButton owned" disabled>Equipada</button>`:owned?`<button class="cosmeticButton secondary" onclick="equipCosmetic('${c.id}')">Equipar</button>`:`<button class="cosmeticButton" ${cosmeticScales<c.price?"disabled":""} onclick="buyCosmetic('${c.id}')">Comprar ${c.price} escamas</button>`;
  return `<div class="cosmeticCard ${equipped?"equipped":owned?"owned":""}"><div class="cosmeticPreview" data-skin="${c.id}" data-category="${c.category}" aria-label="${escapeHtml(c.name)}"></div><div class="cosmeticName">${escapeHtml(c.name)}</div><div class="cosmeticMeta">${escapeHtml(COSMETIC_CATEGORIES[c.category]||c.category)}</div>${btn}</div>`;
}
function cosmeticVisible(c){return cosmeticFilter==="all"||(cosmeticFilter==="owned"?isCosmeticOwned(c.id):!isCosmeticOwned(c.id));}
function setCosmeticFilter(filter){if(!["all","owned","locked"].includes(filter))return;cosmeticFilter=filter;renderCosmetics();}
function renderSkinsTab(){
  const cats=Object.keys(COSMETIC_CATEGORIES);
  return cats.map(cat=>{
    const items=COSMETICS.filter(c=>c.category===cat&&cosmeticVisible(c));
    if(!items.length&&cosmeticFilter==="locked")return "";
    const normal=`<div class="cosmeticCard ${selectedCosmetic(cat)==="default"?"equipped":"owned"}"><div class="cosmeticPreview" data-skin="default" data-category="${cat}" aria-label="Aspecto normal"></div><div class="cosmeticName">Aspecto normal</div><div class="cosmeticMeta">${escapeHtml(COSMETIC_CATEGORIES[cat]||cat)} · Gratis</div>${selectedCosmetic(cat)==="default"?`<button class="cosmeticButton owned" disabled>Equipada</button>`:`<button class="cosmeticButton secondary" onclick="selectedCosmetics['${cat}']='default';saveCosmetics();renderCosmetics()">Equipar</button>`}</div>`;
    return `<section class="cosmeticSection"><div class="cosmeticCategoryTitle">${escapeHtml(COSMETIC_CATEGORIES[cat]||cat)}</div><div class="cosmeticGrid">${cosmeticFilter!=="locked"?normal:""}${items.map(renderCosmeticCard).join("")}</div></section>`;
  }).join("");
}
function renderPacksTab(){
  return COSMETIC_PACKS.map(pack=>{
    const info=getPackInfo(pack);
    const discount=Math.round(pack.discount*100);
    const gallery=info.items.map(i=>`<div class="packSkin"><div class="cosmeticPreview" data-skin="${i.id}" data-category="${i.category}" aria-label="${escapeHtml(i.name)}"></div><span>${ownedCosmetics.has(i.id)?"✓ ":""}${escapeHtml(COSMETIC_CATEGORIES[i.category])}</span></div>`).join("");
    const action=info.complete?`<button class="cosmeticButton secondary" onclick="equipPack('${pack.id}')">Equipar pack</button>`:`<button class="cosmeticButton" ${cosmeticScales<info.price?"disabled":""} onclick="buyPack('${pack.id}')">Comprar pack por ${info.price} escamas</button>`;
    return `<div class="cosmeticCard packCard"><div class="cosmeticName">${escapeHtml(pack.name)}</div><div class="cosmeticMeta">${escapeHtml(pack.desc)} · Descuento ${discount}%</div><div class="packGallery">${gallery}</div><div class="packPriceLine">Ya tienes ${info.owned.length}/${info.items.length} · Restante suelto: ${info.missingValue} · Pack: ${info.complete?"completo":info.price+" escamas"}</div>${action}</div>`;
  }).join("");
}
function renderCosmetics(){
updateRandomSkinsButton();
  updateScaleBalance();
  if(cosmeticsSkinsTab)cosmeticsSkinsTab.classList.toggle("active",cosmeticTab==="skins");
  if(cosmeticsPacksTab)cosmeticsPacksTab.classList.toggle("active",cosmeticTab==="packs");
  const filters=document.getElementById("cosmeticsFilters");
  if(filters){filters.hidden=cosmeticTab!=="skins";for(const b of filters.querySelectorAll("[data-filter]")){b.classList.toggle("active",b.dataset.filter===cosmeticFilter);b.setAttribute("aria-pressed",String(b.dataset.filter===cosmeticFilter));}}
  if(cosmeticsContentEl)cosmeticsContentEl.innerHTML=cosmeticTab==="packs"?renderPacksTab():renderSkinsTab();
  const generation=++cosmeticPreviewGeneration;
  requestAnimationFrame(()=>paintCosmeticPreviews(generation));
}
function earnScalesFromScore(finalScore){
  if(window.coopTest?.inRun)return 0;
  const total=safeCount(finalScore?.total);
  const entitled=Math.floor(total<=30000?total/300:100*Math.sqrt(total/30000));
  const gained=Math.max(0,entitled-cosmeticScalesAwardedThisRun);
  if(gained>0){cosmeticScales+=gained;cosmeticScalesAwardedThisRun+=gained;cosmeticAwardedThisRun=true;saveCosmetics();renderCosmetics();}
  return gained;
}

function cosmeticRewardRow(gained){return gained>0?`<div class="sRow" style="color:#4cc9f0"><span>🫧 Escamas ganadas</span><span>+${gained.toLocaleString()} · Total ${cosmeticScales.toLocaleString()}</span></div>`:""}
function getPlayerSkinColor(defaultColor){const s=selectedCosmetic("player");if(s==="player_green")return "#55c271";if(s==="player_pink")return "#ff8fab";if(s==="player_elegant")return "#fff0ca";if(s==="player_low_poly")return "#4dabf7";if(s==="player_pirate")return "#e6b989";if(s==="player_biolum")return "#438eac";if(s==="player_celestial")return "#a5a3e9";return defaultColor}
function drawLowPolyCube(size,fill="#74c0fc",stroke="#1c2b36",accent="#d0ebff"){
  const s=size;
  ctx.save();
  ctx.lineJoin="round";ctx.lineCap="round";ctx.shadowBlur=0;
  ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(2,s*.075);
  ctx.beginPath();ctx.roundRect(-s*.5,-s*.5,s,s,s*.055);ctx.fill();ctx.stroke();
  ctx.fillStyle=accent;ctx.globalAlpha=.34;ctx.beginPath();ctx.moveTo(-s*.5,-s*.5);ctx.lineTo(s*.5,-s*.5);ctx.lineTo(s*.18,-s*.18);ctx.lineTo(-s*.5,-s*.12);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.14;ctx.fillStyle="#000";ctx.beginPath();ctx.moveTo(s*.5,-s*.5);ctx.lineTo(s*.5,s*.5);ctx.lineTo(s*.16,s*.18);ctx.lineTo(s*.18,-s*.18);ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawLowPolyFace(size,eyeColor="#101820"){
  ctx.save();
  ctx.fillStyle=eyeColor;
  const e=Math.max(3,size*.095);
  ctx.fillRect(-size*.20,-size*.12,e,e);
  ctx.fillRect(size*.12,-size*.12,e,e);
  ctx.fillRect(-size*.06,size*.14,size*.12,Math.max(2,size*.045));
  ctx.restore();
}
function drawLowPolyPlayer(){
  drawEntityShadow(player.x,player.y,player.r*1.08,player.r*.31,.18);
  ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);
  const starOn=isPowerStarActive(),sevenOn=isSevenLivesActive(),hurtBlink=player.hurtAnim>0;
  if(hurtBlink&&!starOn&&!sevenOn)ctx.globalAlpha=Math.sin(performance.now()*0.07)>0?.42:.96;
  const color=starOn?`hsl(${(performance.now()/6)%360},100%,70%)`:(sevenOn?"#80ed99":(player.hurtAnim>0?"#ff6b9a":"#4dabf7"));
  const s=player.r*1.58;
  drawLowPolyCube(s,color,"#1c2b36","#d0ebff");
  ctx.fillStyle=color;ctx.strokeStyle="#1c2b36";ctx.lineWidth=Math.max(2,s*.075);
  ctx.beginPath();ctx.moveTo(-s*.43,-s*.42);ctx.lineTo(-s*.29,-s*.82);ctx.lineTo(-s*.05,-s*.48);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*.43,-s*.42);ctx.lineTo(s*.29,-s*.82);ctx.lineTo(s*.05,-s*.48);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#ffb3c7";ctx.beginPath();ctx.moveTo(-s*.34,-s*.49);ctx.lineTo(-s*.28,-s*.70);ctx.lineTo(-s*.15,-s*.50);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(s*.34,-s*.49);ctx.lineTo(s*.28,-s*.70);ctx.lineTo(s*.15,-s*.50);ctx.closePath();ctx.fill();
  drawLowPolyFace(s);
  ctx.fillStyle="#ff9fba";ctx.beginPath();ctx.moveTo(-s*.07,s*.03);ctx.lineTo(s*.07,s*.03);ctx.lineTo(0,s*.12);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#263746";ctx.lineWidth=Math.max(1.5,s*.035);for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*s*.10,s*.13);ctx.lineTo(side*s*.52,s*.08);ctx.moveTo(side*s*.10,s*.19);ctx.lineTo(side*s*.50,s*.25);ctx.stroke();}
  ctx.strokeStyle=color;ctx.lineWidth=Math.max(4,s*.12);ctx.beginPath();ctx.moveTo(-s*.46,s*.30);ctx.bezierCurveTo(-s*.82,s*.34,-s*.82,-s*.10,-s*.58,-s*.08);ctx.stroke();
  ctx.fillStyle="#ff8fab";ctx.fillRect(s*.45,-s*.10,s*.48,s*.20);
  ctx.restore();
}
function drawLowPolyCat(cat){
  drawEntityShadow(cat.x,cat.y,cat.r*.94,cat.r*.27,.16);
  ctx.save();ctx.translate(cat.x,cat.y);
  const spawnScale=cat.maxSpawnAnim?Math.max(.05,1-(cat.spawnAnim||0)/cat.maxSpawnAnim):1;ctx.scale(spawnScale,spawnScale);
  const squeeze=cat.hitAnim>0?1.10:1;ctx.scale(squeeze,1/squeeze);
  const base=cat.rainbow?"#ffd43b":cat.type==="thief"?"#343a40":cat.type==="yarn"?"#b197fc":cat.type==="sleepy"?"#c8b6e2":cat.type==="mini"?"#ffb347":cat.type==="glutton"?"#e8956d":cat.type==="musician"?"#d084c8":"#c08457";
  const s=cat.r*1.58;
  drawLowPolyCube(s,base,"#2b2118","#ffe8cc");
  ctx.fillStyle=base;ctx.strokeStyle="#2b2118";ctx.lineWidth=Math.max(2,s*.07);
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*s*.42,-s*.39);ctx.lineTo(side*s*.29,-s*.79);ctx.lineTo(side*s*.05,-s*.47);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.fillStyle="#f4b6ad";for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*s*.33,-s*.47);ctx.lineTo(side*s*.28,-s*.66);ctx.lineTo(side*s*.16,-s*.49);ctx.closePath();ctx.fill();}
  drawLowPolyFace(s,cat.type==="thief"?"#fff":"#1f2026");
  ctx.fillStyle="#8b5e55";ctx.beginPath();ctx.moveTo(-s*.06,s*.03);ctx.lineTo(s*.06,s*.03);ctx.lineTo(0,s*.11);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#3b2b26";ctx.lineWidth=Math.max(1.3,s*.03);for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*s*.09,s*.13);ctx.lineTo(side*s*.51,s*.07);ctx.moveTo(side*s*.09,s*.19);ctx.lineTo(side*s*.48,s*.27);ctx.stroke();}
  ctx.strokeStyle=base;ctx.lineWidth=Math.max(4,s*.11);ctx.beginPath();ctx.moveTo(-s*.44,s*.30);ctx.bezierCurveTo(-s*.78,s*.38,-s*.82,s*.02,-s*.60,-s*.08);ctx.stroke();
  drawEnemyIdentity(cat);
  if(cat.maxHp>1){ctx.fillStyle="rgba(255,255,255,0.85)";ctx.fillRect(-18,-48,36,5);ctx.fillStyle=cat.rainbow?"#ffd166":cat.type==="thief"?"#ffd166":cat.type==="yarn"?"#b197fc":cat.type==="sleepy"?"#c8b6e2":cat.type==="glutton"?"#e8956d":cat.type==="musician"?"#d084c8":"#ff8fab";ctx.fillRect(-18,-48,36*Math.max(0,Math.min(1,cat.hp/cat.maxHp)),5)}
  ctx.restore();
}
function drawLowPolyFish(f){
  const angle=Number.isFinite(f.angle)?f.angle:Math.atan2(f.vy||0,f.vx||1);
  const goldenShield=!!(f.shieldShot&&effectLevel("shield")>=5);
  const body=f.boomerang&&f.crit&&hasDoneFusionPair("boomerang+critChance")?"#ffe066":goldenShield?"#ffd166":f.giantEaster?"#ffd166":f.ramFish?(f.boomerang?"#80ed99":f.crit?"#ff6b6b":"#7ef5ff"):f.cardumenGigante?"#80d8ff":f.boomerang?"#80ed99":f.crit?"#ff6b6b":f.shieldShot?"#6ed7ed":"#4cc9f0";
  const accent=f.boomerang&&f.crit&&hasDoneFusionPair("boomerang+critChance")?"#e0a800":goldenShield?"#ffb703":f.giantEaster?"#fff0a6":f.ramFish?(f.boomerang?"#57cc99":f.crit?"#e03131":"#e3ffff"):f.cardumenGigante?"#caf0f8":f.boomerang?"#57cc99":f.crit?"#ffc2d1":"#caf0f8";
  const outline=goldenShield?"#b77900":f.shieldShot?"#45aecd":"#12394a";
  drawEntityShadow(f.x,f.y,12*(f.scale||1),4*(f.scale||1),.08);
  ctx.save();ctx.translate(f.x,f.y);ctx.rotate(angle);ctx.scale(f.scale||1,f.scale||1);
  ctx.lineJoin="round";ctx.strokeStyle=outline;ctx.lineWidth=2;
  ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-4,-8);ctx.lineTo(8,-7);ctx.lineTo(13,0);ctx.lineTo(8,7);ctx.lineTo(-4,8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-18,-9);ctx.lineTo(-16,0);ctx.lineTo(-18,9);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-2,-7);ctx.lineTo(3,-13);ctx.lineTo(6,-6);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.globalAlpha=.35;ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(-3,-7);ctx.lineTo(8,-7);ctx.lineTo(4,-1);ctx.lineTo(-7,-1);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle="#f8fbff";ctx.beginPath();ctx.arc(7,-2,2.3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#023047";ctx.beginPath();ctx.arc(7.5,-2,1.1,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawLowPolyBoss(type,r){bossArt(type,r,true);}
function drawHeartShape(x,y,size,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,size*.92);ctx.bezierCurveTo(size*.92,size*.30,size*.98,-size*.46,0,-size*.12);ctx.bezierCurveTo(-size*.98,-size*.46,-size*.92,size*.30,0,size*.92);ctx.closePath();ctx.fill();ctx.restore()}
function drawBowTieShape(x,y,size,leftColor="#ff7aa8",rightColor=leftColor,knotColor="#ffd166"){ctx.save();ctx.translate(x,y);ctx.fillStyle=leftColor;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-size*1.16,-size*.64);ctx.quadraticCurveTo(-size*1.46,0,-size*1.16,size*.64);ctx.closePath();ctx.fill();ctx.fillStyle=rightColor;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(size*1.16,-size*.64);ctx.quadraticCurveTo(size*1.46,0,size*1.16,size*.64);ctx.closePath();ctx.fill();ctx.fillStyle=knotColor;ctx.beginPath();ctx.roundRect(-size*.30,-size*.34,size*.60,size*.68,size*.20);ctx.fill();ctx.restore()}
function getEnemySkinBaseColor(cat){if(selectedCosmetic("enemy")==="enemy_gray"&&(!cat.type||cat.type==="normal")){if(!cat.grayTone){const tones=["#b7bcc2","#9ea4ab","#878d95","#c7ccd1"];const seed=Math.abs(Math.round((cat.x||0)*17+(cat.y||0)*11+(cat.r||0)*13+(cat.hp||0)));cat.grayTone=tones[seed%tones.length]}return cat.grayTone}if(selectedCosmetic("enemy")==="enemy_elegant"&&(!cat.type||cat.type==="normal"))return "#e8e2d2";if(!cat.type||cat.type==="normal"){const theme=getThemeSkin("enemy");if(theme==="pirate")return "#dbad83";if(theme==="biolum")return "#559aa9";if(theme==="celestial")return "#b0a5e5";}return cat.color}

function getThemeSkin(category){const id=selectedCosmetic(category);return id.endsWith("_pirate")?"pirate":id.endsWith("_biolum")?"biolum":id.endsWith("_celestial")?"celestial":"";}
function drawThemeSkinDetails(category,r){
 const theme=getThemeSkin(category);if(!theme||(theme==="pirate"&&category==="fish"))return;
 ctx.save();ctx.scale(r,r);ctx.shadowBlur=0;ctx.lineJoin="round";ctx.lineCap="round";
 const fish=category==="fish",oct=category==="boss_octopus",duck=category==="boss_duck",seal=category==="boss_seal",demon=category==="boss_demon";
 const hx=fish?-.06:duck?-.32:0,hy=fish?-.40:oct?-1.01:seal?-.78:demon?-.88:-.95;
 if(theme==="pirate"){
  ctx.fillStyle="#34273c";ctx.strokeStyle="#c6a36e";ctx.lineWidth=.065;
  ctx.beginPath();ctx.moveTo(hx-.68,hy+.07);ctx.quadraticCurveTo(hx-.46,hy-.07,hx-.35,hy-.38);ctx.quadraticCurveTo(hx,hy-.55,hx+.35,hy-.38);ctx.quadraticCurveTo(hx+.46,hy-.07,hx+.68,hy+.07);ctx.quadraticCurveTo(hx,hy-.05,hx-.68,hy+.07);ctx.fill();ctx.stroke();
  ctx.fillStyle="#f5d79a";ctx.beginPath();ctx.arc(hx,hy-.23,.10,0,Math.PI*2);ctx.fill();
  if(!fish){ctx.strokeStyle="#39283a";ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(-.52,-.14);ctx.lineTo(.02,-.06);ctx.stroke();ctx.fillStyle="#39283a";ctx.beginPath();ctx.ellipse(-.30,-.13,.18,.14,-.15,0,Math.PI*2);ctx.fill();}
  if(oct){ctx.strokeStyle="#f3dba6";ctx.lineWidth=.055;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-.82+i*.76,.66,.08,0,Math.PI*2);ctx.stroke();}}
  else if(fish){ctx.fillStyle="#bb4254";ctx.beginPath();ctx.moveTo(-.58,.30);ctx.lineTo(-.10,.30);ctx.lineTo(-.43,.55);ctx.closePath();ctx.fill();}
  else if(seal){ctx.fillStyle="#bb4254";ctx.beginPath();ctx.moveTo(-.50,.55);ctx.lineTo(.46,.55);ctx.lineTo(.34,.70);ctx.lineTo(-.40,.70);ctx.closePath();ctx.fill();}
  else if(demon){ctx.fillStyle="#bb4254";ctx.beginPath();ctx.moveTo(-.64,.35);ctx.lineTo(.66,.35);ctx.lineTo(.28,.64);ctx.lineTo(-.25,.64);ctx.closePath();ctx.fill();}
  else {ctx.fillStyle="#bb4254";ctx.fillRect(-.35,.48,.7,.12);}
 }else if(theme==="biolum"){
  ctx.strokeStyle="#4ce9d9";ctx.fillStyle="#b8fff1";ctx.lineWidth=.052;
  const dots=fish?[[-.43,-.08],[-.13,.08],[.20,-.10],[.45,.07]]:oct?[[-.45,-.55],[.04,-.78],[.43,-.50],[-.67,.40],[.69,.44]]:[[-.49,-.42],[0,-.65],[.49,-.42],[-.62,.35],[.62,.35]];
  for(const [x,y] of dots){ctx.beginPath();ctx.arc(x,y,.07,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x,y,.13,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(-.44,.10);ctx.quadraticCurveTo(0,.38,.43,.12);ctx.stroke();
  if(oct){for(const x of [-1.0,-.7,.7,1.0]){ctx.beginPath();ctx.arc(x,.63,.06,0,Math.PI*2);ctx.fill();}}
  else if(fish){ctx.beginPath();ctx.moveTo(-.55,-.17);ctx.lineTo(-.73,-.55);ctx.lineTo(-.18,-.24);ctx.closePath();ctx.fill();}
  else{ctx.beginPath();ctx.moveTo(-.32,hy-.09);ctx.quadraticCurveTo(0,hy-.35,.32,hy-.09);ctx.stroke();}
 }else{
  ctx.fillStyle="#f6d77c";ctx.strokeStyle="#fff0b5";ctx.lineWidth=.04;
  ctx.beginPath();ctx.arc(hx,hy-.19,.24,-Math.PI*.42,Math.PI*.75);ctx.arc(hx+.12,hy-.26,.20,Math.PI*.83,-Math.PI*.40,true);ctx.closePath();ctx.fill();
  const stars=fish?[[.38,-.15,.13],[-.40,.12,.10]]:oct?[[-.42,-.53,.13],[.46,-.52,.12],[-.65,.38,.08]]:[[-.51,.08,.11],[.47,.20,.10]];
  for(const [x,y,size] of stars){ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,d=i%2?size*.44:size;if(i===0)ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);else ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}ctx.closePath();ctx.fill();}
  if(oct){ctx.beginPath();ctx.arc(0,.58,.14,0,Math.PI*2);ctx.stroke();}
  else if(demon){ctx.strokeStyle="#d5b2f8";ctx.beginPath();ctx.arc(0,.45,.35,0,Math.PI);ctx.stroke();}
 }
 ctx.restore();
}
function drawPlayerSkinDetails(){
const s=selectedCosmetic('player');ctx.save();ctx.shadowBlur=0;
if(s==='player_green'){
 ctx.fillStyle='#22705a';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*17,5,5,11,side*.35,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#b4ed87';ctx.beginPath();ctx.ellipse(-3,-24,5,11,-.7,0,Math.PI*2);ctx.ellipse(6,-25,5,10,.65,0,Math.PI*2);ctx.fill();
}else if(s==='player_pink'){
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.fillStyle='#fff1d8';ctx.beginPath();ctx.arc(15+Math.cos(a)*6,-21+Math.sin(a)*6,4.3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#e8b350';ctx.beginPath();ctx.arc(15,-21,3,0,Math.PI*2);ctx.fill();drawHeartShape(-16,9,6,'#c43770');
}else if(s==='player_elegant'){
 ctx.fillStyle='#242b40';ctx.beginPath();ctx.roundRect(-19,-28,38,7,2);ctx.roundRect(-11,-44,23,19,3);ctx.fill();ctx.fillStyle='#d2a94f';ctx.fillRect(-11,-29,23,4);drawBowTieShape(0,18,11,'#273749','#344c65','#f4d477');
}
drawThemeSkinDetails("player",24);
ctx.restore();
}
const REALISTIC_SARDINE_SOURCE="assets/sardina-realista.png";
const realisticSardineImage=new Image();
realisticSardineImage.decoding="async";
realisticSardineImage.referrerPolicy="no-referrer";
realisticSardineImage.src=REALISTIC_SARDINE_SOURCE;
function getRealisticSardineTint(f={}){
  const fusedCriticalBoomerang=!!(f.crit&&f.boomerang&&hasDoneFusionPair("boomerang+critChance"));
  const goldenShield=!!(f.shieldShot&&effectLevel("shield")>=5);
  if(fusedCriticalBoomerang||goldenShield)return {color:"#ffd43b",alpha:.54,glow:"#ffe066"};
  if(f.crit)return {color:"#ff3b3b",alpha:.50,glow:"#ff6b6b"};
  if(f.boomerang)return {color:"#35d06f",alpha:.48,glow:"#80ed99"};
  return null;
}
const realisticSardineTintCache=new Map();
function getTintedRealisticSardine(tint){
  if(!tint||!realisticSardineImage.complete||!realisticSardineImage.naturalWidth)return realisticSardineImage;
  const key=tint.color+"|"+tint.alpha;
  if(realisticSardineTintCache.has(key))return realisticSardineTintCache.get(key);
  const c=document.createElement("canvas");
  c.width=192;
  c.height=Math.max(1,Math.round(c.width*realisticSardineImage.naturalHeight/realisticSardineImage.naturalWidth));
  const cctx=c.getContext("2d");
  cctx.clearRect(0,0,c.width,c.height);
  cctx.drawImage(realisticSardineImage,0,0,c.width,c.height);
  cctx.globalCompositeOperation="source-atop";
  cctx.globalAlpha=tint.alpha;
  cctx.fillStyle=tint.color;
  cctx.fillRect(0,0,c.width,c.height);
  cctx.globalCompositeOperation="source-over";
  cctx.globalAlpha=1;
  realisticSardineTintCache.set(key,c);
  return c;
}
function drawRealisticSardineLocal(f={}){
  const tint=getRealisticSardineTint(f);
  ctx.save();
  if(realisticSardineImage.complete&&realisticSardineImage.naturalWidth>0){
    const w=48;
    const aspect=realisticSardineImage.naturalHeight/realisticSardineImage.naturalWidth;
    const h=w*aspect;
    const sprite=tint?getTintedRealisticSardine(tint):realisticSardineImage;
    if(tint&&!lowPerfMode){
      ctx.save();
      ctx.globalAlpha=.28;
      ctx.shadowColor=tint.glow;
      ctx.shadowBlur=6;
      ctx.drawImage(sprite,-w/2,-h/2,w,h);
      ctx.restore();
    }
    ctx.drawImage(sprite,-w/2,-h/2,w,h);
  }else{
    const g=ctx.createLinearGradient(0,-7,0,7);
    g.addColorStop(0,"#36566a");g.addColorStop(.45,"#a9c6cf");g.addColorStop(1,"#eef4ef");
    ctx.fillStyle=g;
    ctx.beginPath();ctx.ellipse(0,0,19,6.5,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawRealisticSardineWorld(f,x=f.x,y=f.y,angle=f.angle,scale=f.scale||1){
  drawEntityShadow(x,y,18*scale,5*scale,.10);
  ctx.save();ctx.translate(x,y);ctx.rotate(Number.isFinite(angle)?angle:0);ctx.scale(scale,scale);
  drawRealisticSardineLocal(f);
  ctx.restore();
}
function drawFishSkinDetails(f){
const s=selectedCosmetic("fish");
if(s==="default")return;
ctx.save();
ctx.shadowBlur=0;
ctx.lineWidth=1.6;

if(s==="fish_elegant"){
  ctx.translate(0,8);
  
  ctx.fillStyle="#171018";
  ctx.beginPath();
  ctx.roundRect(-2,-19,17,5.5,2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(0,-31,12,12,2);
  ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.10)";
  ctx.beginPath();
  ctx.roundRect(2,-29,2.6,7,1);
  ctx.fill();
  ctx.fillStyle="#ff8fab";
  ctx.fillRect(-1,-19,15,1.4);
}

if(s==="fish_pirate"){
 ctx.fillStyle='#a62d43';ctx.beginPath();ctx.moveTo(-13,-8);ctx.quadraticCurveTo(0,-18,15,-8);ctx.lineTo(15,-5);ctx.lineTo(-13,-5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(-22,-15);ctx.lineTo(-20,-3);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#3b2240";
  ctx.lineWidth=2.2;
  ctx.beginPath();
  ctx.moveTo(2,-8);
  ctx.quadraticCurveTo(7,-12,13,-9);
  ctx.stroke();
  ctx.fillStyle="#2b1730";
  ctx.beginPath();
  ctx.ellipse(8,-2,5.5,4.8,0,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.85)";
  ctx.lineWidth=1.1;
  ctx.beginPath();
  ctx.moveTo(4,-2);
  ctx.lineTo(12,-2);
  ctx.moveTo(8,-6);
  ctx.lineTo(8,2);
  ctx.stroke();
}

if(s==="fish_heart"){
 drawHeartShape(-5,0,9,'#bd3167');drawHeartShape(8,-2,3,'#bd3167');
}
drawThemeSkinDetails("fish",20);
ctx.restore();
}
function drawEnemySkinDetails(cat){
const s=selectedCosmetic('enemy');ctx.save();ctx.shadowBlur=0;
if(s==='enemy_gray'&&(!cat.type||cat.type==='normal')){
 ctx.strokeStyle='#263c50';ctx.lineWidth=4;ctx.lineCap='round';
 for(const side of [-1,1])for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(side*(20-j),-13+j*10);ctx.lineTo(side*(12-j),-9+j*10);ctx.stroke();}
 ctx.fillStyle='#f3ce64';ctx.beginPath();ctx.arc(0,19,5,0,Math.PI*2);ctx.fill();
}else if(s==='enemy_elegant'){
 ctx.fillStyle='#23354c';ctx.beginPath();ctx.moveTo(-18,12);ctx.lineTo(-14,25);ctx.lineTo(14,25);ctx.lineTo(18,12);ctx.lineTo(0,20);ctx.closePath();ctx.fill();drawBowTieShape(0,17,11,'#dbab49','#f0cc77','#fff0c3');
}
drawThemeSkinDetails("enemy",cat.r);
ctx.restore();
}
function drawBossSkinUnderlay(type,r){
if(type==="giantCat"&&selectedCosmetic("boss_giant")==="boss_giant_elegant"){
ctx.save();ctx.shadowBlur=0;ctx.fillStyle="#243a68";ctx.strokeStyle="#d8ad48";ctx.lineWidth=Math.max(2,r*.025);
ctx.beginPath();ctx.moveTo(-r*.62,-r*.38);ctx.quadraticCurveTo(-r*.98,r*.20,-r*.88,r*.96);ctx.quadraticCurveTo(0,r*1.18,r*.88,r*.96);ctx.quadraticCurveTo(r*.98,r*.20,r*.62,-r*.38);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;
}
if(type!=="demon"||selectedCosmetic("boss_demon")!=="boss_demon_cape")return;
ctx.save();ctx.shadowBlur=0;ctx.fillStyle="#7e244b";ctx.strokeStyle="#f2c769";ctx.lineWidth=Math.max(2,r*.025);
ctx.beginPath();ctx.moveTo(-r*.7,-r*.62);ctx.quadraticCurveTo(-r*1.05,-r*.5,-r*1.27,r*.92);ctx.quadraticCurveTo(-r*.92,r*1.16,-r*.45,r*.92);ctx.lineTo(r*.45,r*.92);ctx.quadraticCurveTo(r*.92,r*1.16,r*1.27,r*.92);ctx.quadraticCurveTo(r*1.05,-r*.5,r*.7,-r*.62);ctx.closePath();ctx.fill();ctx.stroke();
ctx.strokeStyle="#d39362";for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.78,-r*.30);ctx.quadraticCurveTo(side*r*.86,r*.5,side*r*1.07,r*.91);ctx.stroke();}ctx.restore();
}
function drawBossSkinDetails(type,r){
 if(type==="giantCat"&&selectedCosmetic("boss_giant")==="boss_giant_elegant"){
  ctx.save();ctx.shadowBlur=0;
  ctx.fillStyle="#e4b94f";ctx.strokeStyle="#7a5620";ctx.lineWidth=Math.max(2,r*.022);ctx.beginPath();
  ctx.moveTo(-r*.42,-r*.72);ctx.lineTo(-r*.48,-r*1.03);ctx.lineTo(-r*.19,-r*.87);ctx.lineTo(0,-r*1.12);ctx.lineTo(r*.19,-r*.87);ctx.lineTo(r*.48,-r*1.03);ctx.lineTo(r*.42,-r*.72);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#8f4fb5";for(const x of [-.24,0,.24]){ctx.beginPath();ctx.arc(x*r,-r*.82,r*.045,0,Math.PI*2);ctx.fill();}
  drawBowTieShape(0,r*.38,r*.19,"#243a68","#36538c","#e4b94f");
  ctx.restore();
 }
 if(type==='seal'&&selectedCosmetic('boss_seal')==='boss_seal_tie'){
 ctx.save();ctx.fillStyle='#d3a63e';ctx.strokeStyle='#74532b';ctx.lineWidth=r*.025;ctx.beginPath();ctx.moveTo(-r*.43,-r*.75);ctx.lineTo(-r*.5,-r*1.07);ctx.lineTo(-r*.18,-r*.91);ctx.lineTo(0,-r*1.2);ctx.lineTo(r*.18,-r*.91);ctx.lineTo(r*.48,-r*1.07);ctx.lineTo(r*.40,-r*.75);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#b34394';ctx.beginPath();ctx.arc(0,-r*.93,r*.08,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 if(type==='duck'&&selectedCosmetic('boss_duck')==='boss_duck_monocle'){ctx.save();drawBowTieShape(-r*.2,-r*.11,r*.20,'#28425b','#385771','#dabb63');ctx.restore();}

  if(type==="duck"&&selectedCosmetic("boss_duck")==="boss_duck_monocle"){const hatX=-r*.38,hatY=-r*1.04;ctx.fillStyle="#171018";ctx.beginPath();ctx.roundRect(hatX-r*.36,hatY-r*.04,r*.72,r*.12,r*.04);ctx.fill();ctx.fillRect(hatX-r*.20,hatY-r*.32,r*.40,r*.32);ctx.fillStyle="#7b2cbf";ctx.fillRect(hatX-r*.20,hatY-r*.06,r*.40,r*.06);ctx.strokeStyle="#171018";ctx.lineWidth=Math.max(3,r*.035);ctx.beginPath();ctx.arc(-r*.28,-r*.68,r*.14,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="rgba(23,16,24,.65)";ctx.lineWidth=Math.max(2,r*.02);ctx.beginPath();ctx.moveTo(-r*.17,-r*.57);ctx.quadraticCurveTo(r*.02,-r*.34,r*.14,-r*.06);ctx.stroke();}
  if(type==="seal"&&selectedCosmetic("boss_seal")==="boss_seal_tie"){
ctx.save();ctx.shadowBlur=0;ctx.strokeStyle='#9d8b91';ctx.lineWidth=Math.max(1,r*.012);
for(let i=0;i<11;i++){const t=i/10,x=(-.53+t*1.08)*r,y=(.37+Math.sin(t*Math.PI)*.19)*r;ctx.fillStyle='#fff8e8';ctx.beginPath();ctx.arc(x,y,r*.044,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-r*.013,y-r*.013,r*.012,0,Math.PI*2);ctx.fill();}
drawBowTieShape(r*.45,r*.40,r*.14,'#9a6cb5','#bb92d0','#ffe3a2');ctx.restore();
}
 const category={giantCat:"boss_giant",duck:"boss_duck",seal:"boss_seal",demon:"boss_demon"}[type];
 if(category)drawThemeSkinDetails(category,r);
}
loadCosmetics();
cosmeticsSkinsTab?.addEventListener("click",()=>{cosmeticTab="skins";renderCosmetics()});
cosmeticsPacksTab?.addEventListener("click",()=>{cosmeticTab="packs";renderCosmetics()});
cosmeticsResetBtn?.addEventListener("click",resetCosmeticSelections);
document.getElementById("cosmeticsFilters")?.addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(b)setCosmeticFilter(b.dataset.filter);});
cosmeticPanel?.addEventListener("toggle",()=>{if(cosmeticPanel.open)renderCosmetics()});
renderCosmetics();

const ACHIEVEMENT_KEYS={state:"gatitos_achievements_state_v1"};
const achievementsPanel=document.getElementById("achievementsPanel"),achievementsContentEl=document.getElementById("achievementsContent"),achievementProgressText=document.getElementById("achievementProgressText"),achievementsRefreshBtn=document.getElementById("achievementsRefreshBtn");
const ACHIEVEMENTS=[
  {id:"complete_game",icon:"🌟",name:"Poder absoluto gatuno",stat:"completeGame",desc:"Fusiona las 28 mejoras en 14 parejas y lleva todas las fusiones al máximo.",phases:[{target:1,label:"Completa el juego al 100%",reward:0}]},
  {id:"bosses_run",icon:"👑",name:"Los venciste a todos",stat:"bossesInRun",desc:"Derrota a los 5 jefes diferentes en una misma partida.",phases:[{target:5,label:"5 jefes en una partida",reward:0}]},
  {id:"shots",icon:"🐟",name:"Lluvia de peces",stat:"shots",desc:"Dispara peces a lo largo de tus partidas.",phases:[{target:500,label:"500 peces",reward:0},{target:2500,label:"2.500 peces",reward:0},{target:10000,label:"10.000 peces",reward:0},{target:50000,label:"50.000 peces",reward:0}]},
  {id:"cats",icon:"🐱",name:"Mimos gatunos",stat:"cats",desc:"Mima gatitos a lo largo de tus partidas.",phases:[{target:100,label:"100 gatos",reward:0},{target:1000,label:"1.000 gatos",reward:0},{target:5000,label:"5.000 gatos",reward:0},{target:25000,label:"25.000 gatos",reward:0}]},
  {id:"thieves",icon:"😾",name:"Ladrones desgraciados",stat:"coinsStolen",desc:"Pierde monedas por culpa de los gatos ladrones.",phases:[{target:25,label:"25 monedas robadas",reward:0},{target:100,label:"100 monedas robadas",reward:0},{target:300,label:"300 monedas robadas",reward:0},{target:1000,label:"1.000 monedas robadas",reward:0}]},
  {id:"no_damage",icon:"🛡️",name:"Ni un rasguño",stat:"noDamageStreak",desc:"Aguanta rondas seguidas sin recibir daño.",phases:[{target:3,label:"3 rondas seguidas",reward:0},{target:5,label:"5 rondas seguidas",reward:0},{target:10,label:"10 rondas seguidas",reward:0}]},
  {id:"one_hp",icon:"🍀",name:"Suerte pura",stat:"oneHpLuck",desc:"Quédate al 10% de vida o menos sin activar una mejora de salvación.",phases:[{target:1,label:"Quedarte al 10% de vida",reward:0}]},
  {id:"score_million",icon:"🏆",name:"Puntuación de leyenda",stat:"maxScore",desc:"Alcanza puntuaciones cada vez más altas.",phases:[{target:50000,label:"50.000 puntos",reward:0},{target:250000,label:"250.000 puntos",reward:0},{target:1000000,label:"1.000.000 de puntos",reward:0}]},
  {id:"waves",icon:"🌊",name:"Superviviente",stat:"maxWave",desc:"Llega a rondas cada vez más altas.",phases:[{target:10,label:"Ronda 10",reward:0},{target:20,label:"Ronda 20",reward:0},{target:30,label:"Ronda 30",reward:0},{target:50,label:"Ronda 50",reward:0}]},
  {id:"fusions_created",icon:"🔮",name:"Alquimia gatuna",stat:"fusionsCreated",desc:"Crea fusiones diferentes durante tus partidas.",phases:[{target:1,label:"1 fusión",reward:0},{target:5,label:"5 fusiones",reward:0},{target:15,label:"15 fusiones",reward:0},{target:30,label:"30 fusiones",reward:0}]},
  {id:"fusions_maxed",icon:"💎",name:"Fusión definitiva",stat:"fusionsMaxed",desc:"Sube fusiones al máximo.",phases:[{target:1,label:"1 fusión máxima",reward:0},{target:5,label:"5 fusiones máximas",reward:0},{target:15,label:"15 fusiones máximas",reward:0}]},
  {id:"shop_spender",icon:"🪙",name:"Compradora gatuna",stat:"shopCoinsSpent",desc:"Gasta monedas en la tienda de mejoras.",phases:[{target:25,label:"25 monedas gastadas",reward:0},{target:100,label:"100 monedas gastadas",reward:0},{target:250,label:"250 monedas gastadas",reward:0},{target:500,label:"500 monedas gastadas",reward:0}]},
  {id:"flawless_bosses",icon:"🛡️",name:"Jefes sin un rasguño",stat:"flawlessBosses",desc:"Derrota jefes sin recibir daño durante su ronda.",phases:[{target:1,label:"1 jefe impecable",reward:0},{target:5,label:"5 jefes impecables",reward:0}]},
  {id:"salt_kills",icon:"🧂",name:"Marea salada",stat:"saltKills",desc:"Derrota enemigos mediante el daño continuo de Escamas saladas.",phases:[{target:25,label:"25 bajas por sal",reward:0},{target:150,label:"150 bajas por sal",reward:0}]},
  {id:"leviathan_sightings",icon:"🐋",name:"Leyenda del Leviatán",stat:"leviathanAppearances",desc:"Consigue que aparezca el Gran Pez de Leviatán.",phases:[{target:1,label:"Primera aparición",reward:0},{target:5,label:"5 apariciones",reward:0}]},
  {id:"all_achievements",icon:"👑",name:"Lo has conseguido todo",stat:"allAchievements",final:true,desc:"Completa todos los demás logros y vuelve dorado tu nombre.",phases:[{target:1,label:"Todos los logros",reward:0}]}
];
let achievementState={stats:{},levels:{},rewarded:{},fusionCreatedPairs:[],fusionMaxedPairs:[],legacyFusionCreated:0,legacyFusionMaxed:0};
let achievementSaveTimer=null,achievementUiDirty=false;
let currentWaveHadDamage=false,currentNoDamageStreak=0,achievementToastTimer=null;
function loadAchievements(){
  const saved=savedObject(safeJsonParse(gameStorage.getItem(ACHIEVEMENT_KEYS.state)||"{}",{}));
  const stats={};
  Object.entries(savedObject(saved.stats)).forEach(([k,v])=>{if(k!=="__proto__")stats[k]=safeCount(v)});
  const levels={};
  ACHIEVEMENTS.forEach(def=>{levels[def.id]=Math.min(def.phases.length,safeCount(savedObject(saved.levels)[def.id]))});
  const pairs=value=>[...new Set((Array.isArray(value)?value:[]).filter(p=>typeof p==="string"&&/^[a-zA-Z]+\+[a-zA-Z]+$/.test(p)))];
  achievementState={schemaVersion:2,stats,levels,rewarded:savedObject(saved.rewarded),
    fusionCreatedPairs:pairs(saved.fusionCreatedPairs),fusionMaxedPairs:pairs(saved.fusionMaxedPairs),
    legacyFusionCreated:safeCount(saved.schemaVersion===2?saved.legacyFusionCreated:stats.fusionsCreated),
    legacyFusionMaxed:safeCount(saved.schemaVersion===2?saved.legacyFusionMaxed:stats.fusionsMaxed)};
}
function saveAchievements(){
  if(achievementSaveTimer!==null)clearTimeout(achievementSaveTimer);
  achievementSaveTimer=null;
  gameStorage.setItem(ACHIEVEMENT_KEYS.state,JSON.stringify(achievementState));
}
function scheduleAchievementSave(){
  achievementUiDirty=true;
  if(achievementSaveTimer!==null)return;
  achievementSaveTimer=setTimeout(()=>{
    saveAchievements();
    if(achievementsPanel?.open)renderAchievements();
  },500);
}
window.addEventListener("pagehide",saveAchievements);
document.addEventListener("visibilitychange",()=>{if(document.hidden)saveAchievements()});

function achievementValue(stat){return safeCount(achievementState.stats?.[stat])}
function setAchievementStatMax(stat,value,opts={}){const v=Math.max(0,Math.floor(Number(value)||0));if(v>achievementValue(stat)){achievementState.stats[stat]=v;checkAchievements();}}
function addAchievementStat(stat,amount=1,opts={}){const v=Math.max(0,Math.floor(Number(amount)||0));if(v<=0)return;achievementState.stats[stat]=achievementValue(stat)+v;checkAchievements();}
function setAchievementFlag(stat,opts={}){setAchievementStatMax(stat,1,opts)}
function getAchievementUnlockedLevel(def){return Math.max(0,Math.floor(Number(achievementState.levels?.[def.id]||0)))}
function getAchievementTargetLevel(def){
  if(def.final)return achievementValue(def.stat)>=1?1:0;
  const value=achievementValue(def.stat);
  let level=0;
  def.phases.forEach((p,i)=>{if(value>=p.target)level=i+1});
  return level;
}
function awardAchievementReward(def,phaseIndex){
  const key=`${def.id}:${phaseIndex}`;
  if(achievementState.rewarded[key])return;
  achievementState.rewarded[key]=true;
}
function showAchievementToast(def,phaseIndex){
  const label=def.phases?.[phaseIndex]?.label||"Completado";
  let toast=document.getElementById("achievementToast");
  if(!toast){
    toast=document.createElement("div");
    toast.id="achievementToast";
    toast.className="achievementToast";
    document.body.appendChild(toast);
  }
  toast.innerHTML=`🏆 Logro: ${escapeHtml(def.name)} <span style="opacity:.82">· ${escapeHtml(label)}</span>`;
  toast.classList.add("visible");
  clearTimeout(achievementToastTimer);
  achievementToastTimer=setTimeout(()=>toast.classList.remove("visible"),2600);
}
function checkAllAchievementsCompletion(){
  const finalDef=ACHIEVEMENTS.find(a=>a.final);
  if(!finalDef)return;
  const others=ACHIEVEMENTS.filter(a=>!a.final);
  const allDone=others.every(def=>getAchievementUnlockedLevel(def)>=def.phases.length);
  if(allDone&&achievementValue(finalDef.stat)<1){
    achievementState.stats[finalDef.stat]=1;
  }
}
function hasGoldenPlayerName(){
  const finalDef=ACHIEVEMENTS.find(a=>a.final);
  return !!finalDef&&getAchievementUnlockedLevel(finalDef)>=finalDef.phases.length;
}
function applyGoldenPlayerNameUI(){
  const gold=hasGoldenPlayerName();
  playerNameInput?.classList.toggle("goldenPlayerName",gold);
  document.body.classList.toggle("hasGoldenPlayerName",gold);
}
function syncStartDropdowns(){
  const slot=document.getElementById("startDropdownContentSlot");
  const panels=[achievementsPanel,cosmeticPanel,document.getElementById("howToPlay"),document.getElementById("patchNotesPanel")].filter(Boolean);
  const items=panels.map(panel=>{
    const content=panel.id==="achievementsPanel"?panel.querySelector(".achievementsBox"):panel.id==="cosmeticsPanel"?panel.querySelector(".cosmeticsBox"):panel.id==="patchNotesPanel"?panel.querySelector(".patchNotesBox"):panel.querySelector(".controls");
    return{panel,content,parent:content?.parentNode||panel};
  }).filter(item=>item.content);
  function restoreClosedContent(openPanel=null){
    items.forEach(item=>{
      if(item.panel!==openPanel&&item.content.parentNode!==item.parent)item.parent.appendChild(item.content);
    });
  }
  function syncSlot(){
    if(!slot)return;
    const openItem=items.find(item=>item.panel.open);
    if(!openItem){
      restoreClosedContent(null);
      slot.classList.remove("visible");
      return;
    }
    restoreClosedContent(openItem.panel);
    if(openItem.content.parentNode!==slot)slot.appendChild(openItem.content);
    slot.classList.add("visible");
  }
  panels.forEach(panel=>panel.addEventListener("toggle",()=>{
    if(panel.open)panels.forEach(other=>{if(other!==panel)other.open=false;});
    requestAnimationFrame(syncSlot);
  }));
  window.addEventListener("resize",()=>requestAnimationFrame(syncSlot));
  requestAnimationFrame(syncSlot);
}

function checkAchievements(){
  let changed=false;
  ACHIEVEMENTS.filter(a=>!a.final).forEach(def=>{
    const target=getAchievementTargetLevel(def);
    const current=getAchievementUnlockedLevel(def);
    if(target>current){
      for(let i=current;i<target;i++){awardAchievementReward(def,i);showAchievementToast(def,i);}
      achievementState.levels[def.id]=target;
      changed=true;
    }
  });
  checkAllAchievementsCompletion();
  const finalDef=ACHIEVEMENTS.find(a=>a.final);
  if(finalDef){
    const target=getAchievementTargetLevel(finalDef);
    const current=getAchievementUnlockedLevel(finalDef);
    if(target>current){
      awardAchievementReward(finalDef,0);
      showAchievementToast(finalDef,0);
      achievementState.levels[finalDef.id]=target;
      changed=true;
    }
  }
  scheduleAchievementSave();
  if(changed){
    saveAchievements();
    if(achievementsPanel?.open)renderAchievements();
    applyGoldenPlayerNameUI();
    renderAllRankingLists([startRankingList,victoryRankingList,gameOverRankingList].filter(Boolean));
  }
  return changed;
}
function getAchievementProgress(def){
  const level=getAchievementUnlockedLevel(def);
  const value=achievementValue(def.stat);
  const total=def.phases.length;
  const completed=level>=total;
  const phase=def.phases[Math.min(level,total-1)]||def.phases[0];
  const prevTarget=level>0?(def.phases[level-1]?.target||0):0;
  const target=phase?.target||1;
  const progress=completed?1:Math.max(0,Math.min(1,(value-prevTarget)/Math.max(1,target-prevTarget)));
  return{level,value,total,completed,phase,target,progress};
}
function formatAchievementValue(n){return Math.floor(Number(n)||0).toLocaleString()}
function renderAchievements(){
  achievementUiDirty=false;
  if(!achievementProgressText&&!achievementsContentEl)return;
  const completed=ACHIEVEMENTS.filter(def=>getAchievementUnlockedLevel(def)>=def.phases.length).length;
  if(achievementProgressText)achievementProgressText.textContent=`${completed}/${ACHIEVEMENTS.length}`;
  if(!achievementsContentEl)return;
  achievementsContentEl.innerHTML=ACHIEVEMENTS.map(def=>{
    const p=getAchievementProgress(def);
    const phaseText=p.completed?`Completado ${p.total}/${p.total}`:`Fase ${p.level+1}/${p.total}`;
    const currentLabel=p.completed?def.phases[p.total-1].label:p.phase.label;
    const valueText=p.completed?currentLabel:`${formatAchievementValue(p.value)} / ${formatAchievementValue(p.target)}`;
    const reward=p.completed?`<span class="achievementDoneBadge">Completado</span>`:`<span class="achievementReward">En progreso</span>`;
    return `<div class="achievementCard ${p.completed?"completed":""} ${def.final?"finalAchievement":""}">
      <div class="achievementTop">
        <div class="achievementIcon">${escapeHtml(def.icon)}</div>
        <div class="achievementInfo">
          <div class="achievementName">${escapeHtml(def.name)}</div>
          <div class="achievementPhase">${escapeHtml(phaseText)} · ${escapeHtml(currentLabel)}</div>
          <div class="achievementDesc">${escapeHtml(def.desc)}</div>
          <div class="achievementBar"><div class="achievementFill" style="width:${Math.round(p.progress*100)}%"></div></div>
          <div class="achievementMeta"><span>${escapeHtml(valueText)}</span>${reward}</div>
        </div>
      </div>
    </div>`;
  }).join("");
}
function registerFinalScoreAchievement(finalScore){setAchievementStatMax("maxScore",Number(finalScore?.total)||0,{run:true});setAchievementStatMax("maxWave",wave,{run:true});if(defeatedBossTypes?.size>=BOSS_TYPES.length)setAchievementStatMax("bossesInRun",BOSS_TYPES.length,{run:true});}
function registerScalesSpent(amount){addAchievementStat("scalesSpent",amount,{})}
function registerShopCoinsSpent(amount){addAchievementStat("shopCoinsSpent",amount,{run:true})}
function registerFusionAchievements(){
  const created=new Set(achievementState.fusionCreatedPairs||[]);
  const maxed=new Set(achievementState.fusionMaxedPairs||[]);
  Object.keys(doneFusionPairs||{}).forEach(pair=>{
    created.add(pair);
    if(Object.prototype.hasOwnProperty.call(fusionProgressLevels,pair)&&getFusionProgress(pair)>=5)maxed.add(pair);
  });
  achievementState.fusionCreatedPairs=[...created];
  achievementState.fusionMaxedPairs=[...maxed];
  setAchievementStatMax("fusionsCreated",safeCount(achievementState.legacyFusionCreated)+created.size,{run:true});
  setAchievementStatMax("fusionsMaxed",safeCount(achievementState.legacyFusionMaxed)+maxed.size,{run:true});
  scheduleAchievementSave();
}

function recordNoDamageRoundIfClean(){
  if(!currentWaveHadDamage)currentNoDamageStreak++;
  else currentNoDamageStreak=0;
  setAchievementStatMax("noDamageStreak",currentNoDamageStreak,{run:true});
  currentWaveHadDamage=false;
}
loadAchievements();
achievementsRefreshBtn?.addEventListener("click",()=>{checkAchievements();renderAchievements()});
achievementsPanel?.addEventListener("toggle",()=>{if(achievementsPanel.open){checkAchievements();renderAchievements()}});
renderPatchNotes();
syncStartDropdowns();
renderAchievements();
applyGoldenPlayerNameUI();

const keys={},mouse={x:canvas.width/2,y:canvas.height/2};
const player={x:canvas.width/2,y:canvas.height/2,r:24,speed:270,angle:0,shootAnim:0,hurtAnim:0};
const dogCompanion={x:canvas.width/2-50,y:canvas.height/2+45,r:15,shootCooldown:0,wag:0};
const lovePhrases=["Muy bien miamor, lo estás haciendo muy bien 💖","Lo has hecho muy bien pequeña 🌸","Mi niña es muy valiente 🐾","Eres la mejor gorda 💕","Estoy muy orgulloso de ti miamor ✨","Sigue así, preciosa 💗"];

function releaseGamePointer(){
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  canvas.style.cursor="crosshair";
  document.body.style.cursor="auto";
}
function requestGamePointerLock(){
  releaseGamePointer();
}
function syncGamePointerLock(){
  releaseGamePointer();
  syncMusic();
}
document.addEventListener("pointerlockchange",()=>{
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  canvas.style.cursor="crosshair";
  document.body.style.cursor="auto";
});

let score,shots,lastShot,lastFrame,gameOver,wave,spawnCooldown,life,level,xp,xpNeed,choosingUpgrade,gameStarted=false,paused=false,waveTime,waveDuration,waveUpgradePending=false,boss=null,shieldAngle=0,lastShieldHit=0,lastOmniBurst=0,rainbowChanceLevel=1,rainbowSelectedThisWave=false,rainbowSpawnedThisWave=false,rainbowPendingUntilKilled=false,coins=0,shopAvailable=false,firstShopReached=false,shopBossPending=false,fusionAvailable=false,lastBossType="",shopUpgradePurchases=0,shopFusionPurchases=0,dogKidnapped=false,avalancheActive=false,avalancheTime=0,avalancheDelay=999,avalancheThisWave=false,avalancheSpawnTimer=0,starChanceLevel=1,starActive=false,starTime=0,starWarningPlayed=false,forceDemonNextBoss=false,sevenLivesTime=0,sevenLivesCooldown=0,sevenLivesUsedThisWave=false,musicianSpawnedThisWave=false,musicianNoteTimer=0,musicianMelodyIdx=0;
let perfFps=60,lowPerfMode=false,lowPerfTimer=0;
let lastOrbitalGuard=-Infinity;
const RAM_FISH_BASE_COOLDOWN=30000;
function getRamFishCooldownMs(playerLevel=level){
  const lvl=Math.max(1,Number(playerLevel)||1);
  return Math.max(18000,RAM_FISH_BASE_COOLDOWN-(lvl-1)*420);
}
function getRamFishKnockback(playerLevel=level){
  const lvl=Math.max(1,Number(playerLevel)||1);
  return Math.min(1100,280+(lvl-1)*24);
}
function getRamFishScale(playerLevel=level){
  const lvl=Math.max(1,Number(playerLevel)||1);
  return 2.25*(1+(lvl-1)*0.018)*Math.max(1,upgrades.fishSize);
}
let lastRamFishAt=-RAM_FISH_BASE_COOLDOWN;
let lastManualShotAt=-Infinity;
let manualShotsSinceBloquito=0;
let lastDemonOrbDamageAt=-Infinity;
const MANUAL_SHOT_INTERVAL_MS=100;
const MAX_MANUAL_SHOTS_PER_BLOQUITO=100;
let starSpawnTimer=12;
let starSpawnedThisWave=false;
let backgroundFishSeed=Math.floor(Math.random()*1000000);
let pendingUpgradeQueue=[];
let runStats;
let defeatedBossTypes=new Set();
let bossEncounterCounts={giantCat:0,duck:0,seal:0,demon:0,octopus:0};
let selectedTarget=null;
let fusionMoveXpTimer=0;
let lastFusionShieldGuard=0,zoomiesEscapeHits=0,forcedZoomiesUntil=0,safeTeleportInvulnUntil=0;
let screenShake=0,screenShakeX=0,screenShakeY=0,lastStarTrail=0;
const ramFishTrails=[];
const fishes=[],cats=[],hearts=[],smokes=[],floatingTexts=[],pawPrints=[],quacks=[],coinsDrops=[],dogBones=[],demonOrbs=[],yarnBalls=[],powerStars=[],shockwaves=[],sparkles=[],tunaDrops=[];
let lastImportantText="",lastImportantTextAt=-Infinity,lastMoralTextAt=-Infinity;
function showFloatingText(entry){
  if(!entry.important&&!entry.moral)return;
  const now=gameNow();
  if(entry.moral){
    if(now>=lastMoralTextAt&&now-lastMoralTextAt<3500)return;
    if(floatingTexts.length>=2&&floatingTexts.every(t=>t.important))return;
    lastMoralTextAt=now;
  }else{
    if(entry.text===lastImportantText&&now>=lastImportantTextAt&&now-lastImportantTextAt<1800)return;
    lastImportantText=entry.text;lastImportantTextAt=now;
  }
  if(floatingTexts.length>=2){
    const moralIndex=floatingTexts.findIndex(t=>t.moral);
    floatingTexts.splice(moralIndex>=0?moralIndex:0,1);
  }
  floatingTexts.push(entry);
}

let audioCtx=null;
function getAudioCtx(){
  if(!audioCtx||audioCtx.state==="closed"){
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)throw new Error("Este navegador no admite Web Audio");
    audioCtx=new AudioContextClass();
  }
  if(audioCtx.state==="suspended"){
    const resumePromise=audioCtx.resume();
    if(resumePromise&&typeof resumePromise.catch==="function")resumePromise.catch(()=>{});
  }
  return audioCtx;
}
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
let bossVictoryScoreSaved="";
let bossVictoryPending=false;
let dogRelaxTime=0;
let enemyIntroSeen={};
let finalChoiceLocked=false;
let finalCompletionContinue=false;
let finalCompletionStartWave=0;
let demonSpawnPressure=0;
let roundVariant="normal";
let bossRewardUntil=0,bossRewardType="";
let lastCriticalRippleAt=-Infinity;
let lastSaltSpreadAt=-Infinity;
const BOSS_REWARD_DURATION=20000;
function bossRewardActive(type){return bossRewardType===type&&gameNow()<bossRewardUntil;}
function giveBossReward(type,x,y){
  bossRewardType=type;
  bossRewardUntil=gameNow()+BOSS_REWARD_DURATION;
  const rewards={
    giantCat:{name:"🐱 Cofre ratonero: cadencia +12 %",coins:2,color:"#ffd166"},
    duck:{name:"🦆 Cofre del pato: más monedas",coins:7,color:"#ffe066"},
    seal:{name:"🦭 Cofre de la foca: velocidad +14 %",coins:3,color:"#80ed99"},
    octopus:{name:"🐙 Cofre del pulpo: daño recibido -12 %",coins:3,color:"#b197fc"},
    demon:{name:"😈 Cofre del demonio: daño +12 %",coins:4,color:"#ff6b9c"}
  };
  const reward=rewards[type];
  if(!reward)return;
  coins+=reward.coins;
  if(runStats){runStats.coinsGenerated+=reward.coins;runStats.coinsCollected+=reward.coins;}
  if(floatingTexts.length<150)showFloatingText({x,y:y-105,text:reward.name+" · +"+reward.coins+" 🪙",life:2.4,maxLife:2.4,big:true,important:true});
  if(shockwaves.length<36)shockwaves.push({x,y,r:12,maxR:125,life:.6,maxLife:.6,color:reward.color,line:5});
}
function getRoundVariant(){
  if(!finalCompletionContinue||wave%5===0||wave%5===1)return "normal";
  if(wave%9===2)return "invasion";
  if(wave%9===4)return "sprinters";
  if(wave%9===7)return "specials";
  return "normal";
}

let thiefCoinsStolenThisWave=0;
perfFps=60;lowPerfMode=false;lowPerfTimer=0;

const upgrades={damageReduction:0,luck:0,fireRate:1,fishSpeed:1,damage:1,moveSpeed:1,maxLife:100,bigFishChance:0,doubleFishChance:0,pierceChance:0,fishSize:1,catSlow:0,healOnWave:8,lifeSteal:0,xpBoost:1,boomerangChance:0,shield:false,shieldLevel:0,critChance:0,zoomies:false,zoomiesHyper:false,zoomiesCannon:false,zoomiesCrit:false,aimAssist:false,moralSupport:false,darkPact:false,catInstinct:false,boyfriendDog:false,boyfriendDogSpirit:false,boyfriendDogReturned:false,bigCursor:false,coinMagnetRange:0,perfectAim:false,braveHeart:false,reflexBurst:false,valorCasa:false,cursedInstinct:false,zoomiesEscape:false,fusionBonusPower:0,sevenLives:false};
const upgradeLevels={damageReduction:0,luck:0,moveSpeed:0,fireRate:0,fishSpeed:0,bigFish:0,doubleFish:0,pierce:0,damage:0,catSlow:0,healOnWave:0,fishSize:0,maxLife:0,lifeSteal:0,xpBoost:0,boomerang:0,shield:0,coinMagnet:0,omniBurst:0,yarnBounce:0,saltScales:0,critChance:0};
const upgradeMaxLevels={damageReduction:5,luck:5,moveSpeed:5,fireRate:5,fishSpeed:5,bigFish:5,doubleFish:5,pierce:5,damage:5,catSlow:5,healOnWave:5,fishSize:5,maxLife:5,lifeSteal:5,xpBoost:5,boomerang:5,shield:5,coinMagnet:5,omniBurst:5,yarnBounce:5,saltScales:5,critChance:5};
const fusedBaseLevels={};

const UPGRADE_META={
damageReduction:{icon:"🔰",name:"Pelaje protector",desc:l=>"Reduce el daño que recibes."},
luck:{icon:"🍀",name:"Trébol gatuno",desc:l=>"Aumenta los eventos raros y la posibilidad de duplicar monedas."},
maxLife:{icon:"❤️",name:"Corazón de atún",desc:l=>"Aumenta tu vida máxima y te cura al adquirirla."},
moveSpeed:{icon:"👟",name:"Zapatillas blanditas",desc:l=>"Aumenta tu velocidad de movimiento."},
fireRate:{icon:"🐾",name:"Patita nerviosa",desc:l=>"Disparas un 19 % más rápido por nivel. En los niveles 3 y 5 añades peces laterales más débiles."},
fishSpeed:{icon:"🐟",name:"Pez cohete",desc:l=>"Aumenta la velocidad de tus peces."},
bigFish:{icon:"💙",name:"Pez grandote",desc:l=>"Aumenta la probabilidad de lanzar peces gigantes."},
doubleFish:{icon:"🐠",name:"Banco de peces",desc:l=>"Puedes disparar dos peces laterales extra con un 60 % de daño."},
pierce:{icon:"✨",name:"Pez brillante",desc:l=>"Aumenta la probabilidad de que tus peces atraviesen enemigos."},
damage:{icon:"💪",name:"Mimos potentes",desc:l=>"Aumenta el daño de tus peces."},
catSlow:{icon:"🧊",name:"Arena fresquita",desc:l=>"Reduce la velocidad de los enemigos."},
healOnWave:{icon:"🍣",name:"Sushi de descanso",desc:l=>"Recuperas vida al superar cada ronda."},
fishSize:{icon:"🫧",name:"Peces esponjosos",desc:l=>"Aumenta el tamaño y el área de impacto de los peces."},
lifeSteal:{icon:"🩸",name:"Besito vampiro",desc:l=>"Recuperas una parte del daño que infliges."},
xpBoost:{icon:"📚",name:"Aprendizaje gatuno",desc:l=>"Aumenta la experiencia que consigues."},
boomerang:{icon:"🪃",name:"Pez boomerang",desc:l=>"Aumenta la probabilidad de que los peces regresen."},
coinMagnet:{icon:"🧲",name:"Imán de monedas",desc:l=>"Atraes monedas desde una distancia mayor."},
shield:{icon:"🛡️",name:"Escudo de pececitos",desc:l=>"Añade peces guardianes que giran a tu alrededor y golpean enemigos."},
omniBurst:{icon:"💥",name:"Metralladora gatuna",desc:l=>"Disparas ráfagas circulares de peces periódicamente."},
yarnBounce:{icon:"🧶",name:"Ovillo táctico",desc:l=>"Aumenta la probabilidad de que un pez rebote hacia otro enemigo."},
saltScales:{icon:"🧂",name:"Escamas saladas",desc:l=>"Los impactos aplican daño salino durante 2,4 s. Otro golpe renueva el efecto sin acumularlo."},
critChance:{icon:"⚡",name:"Mimos críticos",desc:l=>"Aumenta la probabilidad de infligir daño crítico."}
};

const RECOMMEND_DIMENSIONS=["damage","defense","healing","mobility","economy","control","consistency","automation","area","scaling"];
const UPGRADE_RECOMMENDATION_PROFILE={
 damageReduction:{defense:1,consistency:.4},luck:{economy:.8,scaling:.6},
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
  saltScales:{damage:.55,control:.30,consistency:.35,scaling:.50},
  critChance:{damage:.9,scaling:.35},
  aimAssist:{consistency:1,control:.35,automation:.25},
  bigCursor:{consistency:.75,control:.2},
  moralSupport:{healing:.3,defense:.25,consistency:.45},
  darkPact:{scaling:.95,damage:.25,automation:.2},
  catInstinct:{defense:1,healing:.35,consistency:.55},
  zoomies:{mobility:.9,damage:.65,control:.25}
};
const FUSION_RECOMMENDATION_PROFILE={
  "damage+saltScales":{damage:.9,scaling:.55,consistency:.35},
  "fireRate+saltScales":{damage:.75,consistency:.65,scaling:.45},
  "boomerang+saltScales":{damage:.65,control:.55,consistency:.65},
  "catSlow+saltScales":{control:.9,damage:.45,defense:.3},
  "lifeSteal+saltScales":{healing:.65,damage:.65,scaling:.35},
  "omniBurst+saltScales":{area:.85,damage:.65,control:.45},
  "aimAssist+bigCursor":{consistency:1,control:.35},
  "darkPact+moralSupport":{defense:.65,healing:.35,automation:.55,consistency:.75},
  "catInstinct+darkPact":{defense:1,healing:.45,scaling:.35},
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
  "fishSize+bigFish":{area:.85,damage:.75,control:.35}
};
Object.keys(FUSION_RECOMMENDATION_PROFILE).forEach(pair=>{
  const parts=pair.split("+");
  if(parts.length!==2)return;
  const normalized=parts.sort().join("+");
  if(!FUSION_RECOMMENDATION_PROFILE[normalized])FUSION_RECOMMENDATION_PROFILE[normalized]=FUSION_RECOMMENDATION_PROFILE[pair];
});
function freshRunStats(){return{damageTaken:0,damageEvents:0,lowHpTime:0,enemiesNearTime:0,kills:0,shotsFired:0,fishHits:0,fishHitProjectiles:0,fishMisses:0,bossDamage:0,coinsGenerated:0,coinsCollected:0,coinsMissed:0,elapsed:0,lastShopAt:0};}
function clamp01(v){return Math.max(0,Math.min(1,Number.isFinite(v)?v:0))}
function emptyProfile(){return Object.fromEntries(RECOMMEND_DIMENSIONS.map(k=>[k,0]))}
function mergeProfiles(a,b,wa=1,wb=1){const p=emptyProfile();RECOMMEND_DIMENSIONS.forEach(k=>{p[k]=clamp01((a?.[k]||0)*wa+(b?.[k]||0)*wb)});return p}
function getRecommendationNeeds(context="generic"){
  const st=runStats||freshRunStats();
  const minutes=Math.max(.4,(st.elapsed||0)/60);
  const hp=clamp01(life/Math.max(1,upgrades.maxLife||100));
  const shots=(st.fishHitProjectiles||0)+(st.fishMisses||0);
  const shotsConfidence=clamp01(shots/28);
  const hitRate=shots?((st.fishHitProjectiles||0)+6)/(shots+10):.72;
  const badAim=Math.max(0,.72-hitRate)*shotsConfidence;
  const coinsObserved=(st.coinsCollected||0)+(st.coinsMissed||0);
  const coinConfidence=clamp01(coinsObserved/14);
  const coinRate=((st.coinsCollected||0)+6)/(coinsObserved+8);
  const badCollection=Math.max(0,.83-coinRate)*coinConfidence;
  const damageRate=clamp01(((st.damageTaken||0)/minutes)/55);
  const crowdHistory=clamp01((st.enemiesNearTime||0)/Math.max(12,st.elapsed||0));
  const crowdNow=clamp01((cats.length-5)/18);
  const projectiles=clamp01((quacks.length+yarnBalls.length+demonOrbs.length)/8);
  const danger=clamp01(crowdHistory*.48+crowdNow*.40+projectiles*.36+(boss?0.14:0));
  const stage=clamp01(Math.max(1,wave)/26);
  const killsPerMin=(st.kills||0)/minutes;
  const damageShortfall=st.elapsed>28?clamp01((20-killsPerMin)/22):0;
  const lowHpHistory=clamp01((st.lowHpTime||0)/Math.max(15,st.elapsed||0));
  const emergency=clamp01((.73-hp)/.58);
  const shop=context==="shop",waveMenu=context==="wave",rainbow=context==="rainbow";
  return {
    damage:clamp01(.40+damageShortfall*.32+stage*.12+(boss?.18:0)),
    defense:clamp01(.16+emergency*.58+damageRate*.26+danger*.19),
    healing:clamp01(.10+emergency*.61+lowHpHistory*.29+damageRate*.14),
    mobility:clamp01(.14+danger*.48+projectiles*.24+damageRate*.15),
    economy:clamp01(.14+badCollection*.92+(shop&&coins<getShopUpgradePrice()?0.12:0)+((stage<.42&&hp>.65)?.07:0)),
    control:clamp01(.18+danger*.53+crowdNow*.23),
    consistency:clamp01(.16+badAim*1.15+danger*.13),
    automation:clamp01(.11+badAim*.67+danger*.19),
    area:clamp01(.13+danger*.43+crowdNow*.30),
    scaling:clamp01((.65-stage*.29)+(hp>.7&&damageRate<.12?.06:0)-(emergency*.30))
  };
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
  if(!key||getFusedPairForKey(key)||fusedUpgradeNames[key])return 0;
  const route=Math.max(0,autoFusionRouteValue(key)||0);
  const future=Math.max(0,autoFusionFutureValue(key)||0);
  return clamp01(clamp01(route/2000)*.7+clamp01(future/1800)*.3);
}
function recommendationContextFit(key,context,needs){
  if(!key)return 0;
  const hp=life/Math.max(1,upgrades.maxLife||100);
  const pressure=cats.length+(boss?8:0)+quacks.length+yarnBalls.length+demonOrbs.length;
  let bonus=0;
  if(hp<.48&&["damageReduction","maxLife","lifeSteal","shield","catSlow","moveSpeed","catInstinct"].includes(key))bonus+=.17;
  if(pressure>15&&["pierce","yarnBounce","omniBurst","doubleFish","catSlow","shield","damage","fireRate"].includes(key))bonus+=.10;
  if(boss&&["damage","fireRate","critChance","lifeSteal","shield","saltScales"].includes(key))bonus+=.10;
  if(context==="shop"&&wave<12&&hp>.58&&["luck","coinMagnet","xpBoost"].includes(key))bonus+=.05;
  if(context==="wave"&&["healOnWave","damageReduction","catSlow","shield"].includes(key))bonus+=.065;
  if((needs?.consistency||0)>.40&&["aimAssist","fishSpeed","saltScales"].includes(key))bonus+=.075;
  return clamp01(bonus);
}
function recommendationPairEvaluation(a,b,needs){
  const pair=sortedPair(a,b),parts=[a,b],hp=life/Math.max(1,upgrades.maxLife);
  const prof=FUSION_RECOMMENDATION_PROFILE[pair]||mergeProfiles(profileForKey(a),profileForKey(b),.55,.55);
  let score=recommendationProfileFit(prof,needs)*.82+.085;
  let reason=recommendationReasonForProfile(prof,needs);
  const bonusKeys=getFusionBonusKeys(pair);
  const marginal=bonusKeys.map(k=>Math.max(0,coreUpgradeStat(k,fusionPostLevel(k)+1)-coreUpgradeStat(k))/Math.max(1,Math.abs(coreUpgradeStat(k))));
  score+=Math.min(.14,marginal.reduce((sum,n)=>sum+n,0)*.48);
  if(FUSION_RECOMMENDATION_PROFILE[pair])score+=.035;
  if(hp<.49&&parts.includes('maxLife')){score+=.29;reason='La fusión aumenta la vida máxima y te cura al crearla.';}
  else if(hp<.57&&parts.includes('lifeSteal')){score+=.15;reason='Mejora la recuperación golpeando enemigos.';}
  else if(hp<.57&&parts.includes('shield')){score+=.14;reason='Añade protección para aguantar la siguiente oleada.';}
  if(pair==='darkPact+moralSupport'){score+=hp<.55?.23:.12;reason='Desbloquea al perrito, que ataca y puede salvarte una vez.';}
  if(boss&&parts.some(k=>['damage','critChance','fireRate'].includes(k))){score+=.14;if(hp>=.49)reason='Refuerza los ataques contra el jefe actual.';}
  if(cats.length>=12&&parts.some(k=>['pierce','yarnBounce','omniBurst','catSlow'].includes(k))){score+=.11;if(hp>=.49)reason='Facilita el control de grupos numerosos.';}
  if(hp<.40&&parts.includes('xpBoost')&&!parts.some(k=>['shield','maxLife','lifeSteal'].includes(k)))score-=.16;
  if(parts.includes('coinMagnet')&&!(runStats?.coinsMissed>2))score-=.065;
  return {pair,score:Math.max(0,score),reason};
}
function recommendationPairFit(a,b,needs){return recommendationPairEvaluation(a,b,needs).score;}
function availableRecommendationPairs(needs,key=null){
const ready=getMaxedFusionKeys().filter(k=>!fusedUpgradeNames[k]),result=[];
ready.forEach((a,i)=>ready.slice(i+1).forEach(b=>{if((!key||a===key||b===key)&&isFusionChoiceCompletionSafe(a,b))result.push(recommendationPairEvaluation(a,b,needs));}));
return result.sort((a,b)=>b.score-a.score);
}
function fusionRecommendationReason(choice,needs){
const result=choice.first?recommendationPairEvaluation(choice.first,choice.key,needs):availableRecommendationPairs(needs,choice.key)[0];
if(!result)return 'Combina mejoras compatibles disponibles.';
if(choice.first)return result.reason;
const [a,b]=result.pair.split('+'),partner=a===choice.key?b:a;
return `${choice.key?'Con '+getOriginalUpgradeName(partner):getFusionNameFromPair(a,b)}: ${result.reason}`;
}

function scoreRecommendationChoice(choice,needs,context="generic"){
  if(!choice||choice.locked||choice.skipShop||choice.randomShopUpgrade)return -999;
  if(context==="shop"&&Number.isFinite(choice.price)&&choice.price>coins)return -999;
  const key=choice.key;
  if(choice.openFusionShop||context==="fusionFirst"){
    const pairs=availableRecommendationPairs(needs,key||null);
    return choice.openFusionShop&&!canFuse(getEffectiveShopFusionPrice())?-999:(pairs[0]?.score??-999)+(choice.openFusionShop?.035:0);
  }
  if(choice.first&&key)return recommendationPairFit(choice.first,key,needs);
  if(!key)return -999;
  const pair=getFusedPairForKey(key);
  if(pair?getFusionProgress(pair)>=5:isUniqueKey(key)?hasUniqueUpgrade(key):isMax(key))return -999;
  const prof=profileForChoice(choice),hp=life/Math.max(1,upgrades.maxLife);
  const parts=pair?pair.split("+"):[key];
  let score=recommendationProfileFit(prof,needs)*.83+recommendationContextFit(key,context,needs)*.57;
  const steps=Math.max(1,Math.floor(Number(choice.previewSteps)||1));
  const gains=parts.filter(k=>k in upgradeLevels).map(k=>{
    const cur=fusionPostLevel(k),next=Math.min(5,cur+steps);
    const before=coreUpgradeStat(k,cur),after=coreUpgradeStat(k,next);
    return Math.max(0,(after-before)/Math.max(1,Math.abs(before)));
  });
  if(gains.length)score+=Math.min(.145,Math.max(...gains)*.75);
  if(pair){score+=.065+Math.min(.055,getFusionProgress(pair)*.011);}
  else{
    const remaining=isUniqueKey(key)?0:Math.max(0,(upgradeMaxLevels[key]||5)-(upgradeLevels[key]||0)-steps);
    if(remaining<=1){
      const ready=getMaxedFusionKeys().filter(other=>other!==key&&!fusedUpgradeNames[other]&&areFusionCompatible(key,other)&&!hasFusionBeenDone(key,other));
      if(ready.length)score+=remaining===0?.19:.10;
    }
    const routeValue=recommendationStrategicFitForKey(key);
    if(routeValue>.20)score+=Math.min(.10,routeValue*.13);
  }
  if(hp<.44){
    if(parts.includes("maxLife"))score+=.32;
    else if(parts.includes("catInstinct")||parts.includes("shield")||parts.includes("lifeSteal"))score+=.11;
  }
  if(parts.includes("healOnWave")&&boss)score-=.10;
  if(parts.includes("coinMagnet")&&!(runStats?.coinsMissed>2))score-=.11;
  if(parts.includes("xpBoost")&&hp<.47)score-=.18;
  if(parts.includes("bigCursor")&&!pair)score-=.16;
  if(parts.includes("critChance")&&getCurrentCritChance()>=.94)score-=.13;
  if(parts.includes("boomerang")&&upgrades.boomerangChance>=.94)score-=.10;
  if(context==="rainbow"&&hp>.48&&wave<12&&parts.includes("xpBoost"))score+=.06;
  if(context==="shop"&&Number.isFinite(choice.price)){
    score-=Math.min(.07,(choice.price/Math.max(1,coins+choice.price))*.12);
  }
  return Math.max(0,score);
}
function recommendationReasonForProfile(prof,needs){
  const labels={damage:"Refuerza el daño para eliminar enemigos.",defense:"Te vendrá bien aguantar más presión.",healing:"Mejora tu capacidad de recuperar vida.",mobility:"Te ayudará a reposicionarte mejor.",economy:"Te ayudará a aprovechar mejor las monedas.",control:"Ayuda a controlar a los enemigos cercanos.",consistency:"Hará tus ataques más constantes.",automation:"Te dará más comodidad al atacar.",area:"Te ayudará contra grupos grandes.",scaling:"Escala bien para rondas largas."};
  let best="damage",bestScore=-1;
  RECOMMEND_DIMENSIONS.forEach(k=>{const v=(prof[k]||0)*(needs[k]||0);if(v>bestScore){bestScore=v;best=k;}});
  return labels[best]||"Encaja mejor con tu partida actual.";
}
function recommendationReasonForChoice(choice,needs,context){
  if(choice.openFusionShop||context.startsWith("fusion"))return fusionRecommendationReason(choice,needs);
  const key=choice.key,pair=key?getFusedPairForKey(key):null;
  const parts=pair?pair.split('+'):[key];
  const hp=life/Math.max(1,upgrades.maxLife||100);
  if(hp<.48&&parts.includes('maxLife'))return 'Vida baja: aumenta tu vida máxima y te cura al elegirla.';
  if(hp<.48&&parts.includes('shield'))return 'Vida baja: refuerza tu protección para aguantar.';
  if(hp<.48&&parts.includes('lifeSteal'))return 'Vida baja: recuperarás más vida al golpear.';
  if(parts.includes('coinMagnet')&&(runStats?.coinsMissed||0)>3)return 'Se escapan monedas: amplía tu radio de recogida.';
  if(parts.includes('aimAssist')&&needs.consistency>.39)return 'Has fallado bastantes peces: mejora el guiado.';
  if(context==='wave'&&parts.includes('healOnWave'))return 'Al empezar nuevas rondas recuperarás más vida.';
  if(!pair&&!isUniqueKey(key)){
    const ready=getMaxedFusionKeys().find(other=>other!==key&&areFusionCompatible(key,other)&&!hasFusionBeenDone(key,other)&&!fusedUpgradeNames[other]);
    const remaining=Math.max(0,(upgradeMaxLevels[key]||5)-(upgradeLevels[key]||0)-Math.max(1,Number(choice.previewSteps)||1));
    if(ready&&remaining===0)return `Con esta elección podrás preparar una fusión con ${getAnyName(ready)}.`;
  }
  return recommendationReasonForProfile(profileForChoice(choice),needs);
}
function applyRecommendationsToChoices(choices,context="generic"){
  const list=choices||[];
  list.forEach(c=>{if(c){delete c.recommended;delete c.recommendScore;}});
  if(context==='internal')return choices;
  const needs=getRecommendationNeeds(context);
  const contextMin={shop:.50,level:.48,wave:.48,rainbow:.49,fusionFirst:.52,fusionPartner:.52};
  const contextGap={shop:.065,level:.065,wave:.065,rainbow:.06,fusionFirst:.070,fusionPartner:.075};
  const minScore=contextMin[context]??.49,minGap=contextGap[context]??.065;
  if(context==='fusionFirst'){
    const offered=new Set(list.filter(c=>!c.locked).map(c=>c.key));
    const pairs=availableRecommendationPairs(needs).filter(r=>r.pair.split('+').every(k=>offered.has(k)));
    if(!pairs.length)return choices;
    const best=pairs[0],parts=best.pair.split('+');
    list.forEach(c=>{if(parts.includes(c.key)&&!c.locked){c.recommended=true;c.recommendScore=best.score;}});
    return choices;
  }
  const valid=list.filter(c=>!c.locked&&!c.skipShop&&!c.randomShopUpgrade&&(c.key||c.openFusionShop))
    .map(choice=>({choice,score:scoreRecommendationChoice(choice,needs,context)}))
    .filter(entry=>Number.isFinite(entry.score)&&entry.score>=0)
    .sort((a,b)=>b.score-a.score);
  if(valid.length>=2){
    const [best,next]=valid;
    const urgent=(life/Math.max(1,upgrades.maxLife)<.35)&&best.choice.key==='maxLife';
    if(best.score>=minScore&&(best.score-next.score>=minGap||urgent&&best.score>=.65)){
      best.choice.recommended=true;
      best.choice.recommendScore=best.score;
    }else if(best.score>=Math.max(.54,minScore)&&next.score>=Math.max(.54,minScore)
       && best.choice.key!==next.choice.key){
      for(const entry of [best,next]){
        entry.choice.recommended=true;
        entry.choice.recommendScore=entry.score;
      }
    }
  }
  if((context==='shop'||context==='fusionPartner')&&valid.length&&!list.some(c=>c?.recommended)){
    const best=valid[0];
    best.choice.recommended=true;
    best.choice.recommendScore=best.score;
  }
  return choices;
}
function playCuteMeow(){try{const ac=getAudioCtx(),g=ac.createGain();g.gain.setValueAtTime(.045,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.34);g.connect(ac.destination);const o1=ac.createOscillator();o1.type="sine";o1.frequency.setValueAtTime(760+Math.random()*60,ac.currentTime);o1.frequency.exponentialRampToValueAtTime(520+Math.random()*40,ac.currentTime+.14);o1.connect(g);o1.start();o1.stop(ac.currentTime+.16);const o2=ac.createOscillator();o2.type="triangle";o2.frequency.setValueAtTime(470+Math.random()*40,ac.currentTime+.13);o2.frequency.exponentialRampToValueAtTime(330+Math.random()*30,ac.currentTime+.34);o2.connect(g);o2.start(ac.currentTime+.12);o2.stop(ac.currentTime+.36)}catch(e){}}
function playFishSound(type="bloop"){try{const ac=getAudioCtx(),o=ac.createOscillator(),g=ac.createGain();if(type==="fiu"){o.type="sine";o.frequency.setValueAtTime(900,ac.currentTime);o.frequency.exponentialRampToValueAtTime(360,ac.currentTime+.18);g.gain.setValueAtTime(.023,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.2)}else{o.type="sine";o.frequency.setValueAtTime(260+Math.random()*80,ac.currentTime);o.frequency.exponentialRampToValueAtTime(190+Math.random()*60,ac.currentTime+.11);g.gain.setValueAtTime(.021,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.13)}o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.22)}catch(e){}}
function startGame(){
  if(!window.coopTest?.hostActive)window.coopTest?.resetSolo();
  autoMode=false;
  gameStarted=true;
  startPanel.style.display="none";
  restart();
  adminUnlocked=normalizeAdminName(currentPlayerName)==='eperiopatataquesopure';
  updateAdminVisibility();
  requestGamePointerLock();
  syncMusic();
}

function playSoftPop(){try{const ac=getAudioCtx(),o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.setValueAtTime(210,ac.currentTime);o.frequency.exponentialRampToValueAtTime(95,ac.currentTime+.16);g.gain.setValueAtTime(.03,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.2)}catch(e){}}
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
function playCatInstinctSound(){try{
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.055,ac.currentTime);
g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.55);
g.connect(ac.destination);
const low=ac.createOscillator();low.type="sine";low.frequency.setValueAtTime(150,ac.currentTime);low.frequency.exponentialRampToValueAtTime(58,ac.currentTime+.45);low.connect(g);low.start();low.stop(ac.currentTime+.5);
const high=ac.createOscillator();high.type="triangle";high.frequency.setValueAtTime(620,ac.currentTime+.03);high.frequency.exponentialRampToValueAtTime(980,ac.currentTime+.22);high.connect(g);high.start(ac.currentTime+.03);high.stop(ac.currentTime+.28);
}catch(e){}}
function playMagicChime(){try{
const ac=getAudioCtx(),g=ac.createGain();g.gain.setValueAtTime(.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.7);g.connect(ac.destination);
[660,880,1320].forEach((f,i)=>{const o=ac.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,ac.currentTime+i*.055);o.connect(g);o.start(ac.currentTime+i*.055);o.stop(ac.currentTime+.45+i*.03)});
}catch(e){}}

function playShopBuySound(){try{
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.028,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.22);
g.connect(ac.destination);
[523,659].forEach((f,i)=>{const o=ac.createOscillator();o.type="triangle";o.frequency.setValueAtTime(f,ac.currentTime+i*.07);o.connect(g);o.start(ac.currentTime+i*.07);o.stop(ac.currentTime+.22+i*.04)});
}catch(e){}}
function playFusionCompleteSound(){try{
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.038,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.9);
g.connect(ac.destination);
[440,550,660,880].forEach((f,i)=>{const o=ac.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,ac.currentTime+i*.09);o.frequency.linearRampToValueAtTime(f*1.04,ac.currentTime+i*.09+.18);o.connect(g);o.start(ac.currentTime+i*.09);o.stop(ac.currentTime+.55+i*.07)});
}catch(e){}}
function playVictoryJingle(){try{
const ac=getAudioCtx(),g=ac.createGain();
g.gain.setValueAtTime(.042,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.4);
g.connect(ac.destination);
[523,659,784,1047,1319].forEach((f,i)=>{const o=ac.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,ac.currentTime+i*.12);o.connect(g);o.start(ac.currentTime+i*.12);o.stop(ac.currentTime+.55+i*.12)});
}catch(e){}}

function clearMovementKeys(){
  keys.w=false;keys.a=false;keys.s=false;keys.d=false;keys.arrowup=keys.arrowdown=keys.arrowleft=keys.arrowright=false;
}
function clearAllInputKeys(){
  Object.keys(keys).forEach(k=>keys[k]=false);
}
function isTypingTarget(target){
  const tag=(target?.tagName||"").toLowerCase();
  return tag==="input"||tag==="textarea"||tag==="select"||target?.isContentEditable;
}
function keyName(e){
  return String(e?.key||"").toLowerCase();
}
window.addEventListener("keydown",e=>{
const k=keyName(e);
if(isTypingTarget(e.target)){
  if(k===" "||k==="spacebar")return;
  if(k!=="r")return;
}
if(["arrowup","arrowdown","arrowleft","arrowright"].includes(k)&&gameStarted){e.preventDefault();}
if(["w","a","s","d"].includes(k))keys[k]=true;
else keys[k]=true;
if(k===" "||k==="spacebar"){e.preventDefault();if(e.repeat)return;if(gameStarted&&!gameOver&&!choosingUpgrade)togglePause()}
if(k==="r"&&gameStarted&&gameOver&&startPanel.style.display==="none"){restart()}
});
window.addEventListener("keyup",e=>{
  const k=keyName(e);
  keys[k]=false;
  if(["w","a","s","d"].includes(k))keys[k]=false;
});
window.addEventListener("blur",()=>{
  clearAllInputKeys();
  if(gameStarted&&!gameOver&&!choosingUpgrade&&!paused)openPause();
});
window.addEventListener("pagehide",clearAllInputKeys);
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){clearAllInputKeys();if(gameStarted&&!gameOver&&!choosingUpgrade&&!paused)openPause();}
});
window.addEventListener("focus",clearMovementKeys);
document.addEventListener("mouseleave",clearMovementKeys);
canvas.addEventListener("mousemove",e=>{
  if(document.pointerLockElement===canvas){
    mouse.x=Math.max(0,Math.min(canvas.width,mouse.x+(e.movementX||0)));
    mouse.y=Math.max(0,Math.min(canvas.height,mouse.y+(e.movementY||0)));
  }else{
    const p=pointerToGame(e);mouse.x=p.x;mouse.y=p.y;
  }
});
canvas.addEventListener("mousedown",e=>{
if(e.button===0&&!gameOver&&gameStarted&&!paused&&!choosingUpgrade){const p=pointerToGame(e);mouse.x=p.x;mouse.y=p.y;launchRamFish();}
if(e.button===2&&!gameOver&&gameStarted&&!paused&&!choosingUpgrade){
  e.preventDefault();
  const p=pointerToGame(e);
  selectTargetAt(p.x,p.y);
}
});
resumeButton.addEventListener("click",closePause);
document.getElementById("finishRunButton").addEventListener("click",finishRunHere);
function finishRunHere(){
  if(!gameStarted||gameOver||!paused)return;
  if(!window.confirm("¿Acabar aquí y guardar tu puntuación?"))return;
  gameOver=true;
  paused=false;
  choosingUpgrade=false;
  clearAllInputKeys();
  stopPowerStarLoop();
  stopAllMusic();
  pendingUpgradeQueue.length=0;
  pausePanel.style.display="none";
  levelUpPanel.style.display="none";
  showGameOverScreen(true);
}

victoryFinishBtn.addEventListener("click",()=>{
  finalChoiceLocked=true;
  victoryPanel.style.display="none";
  gameOver=true;
  choosingUpgrade=false;
  levelUpPanel.style.display="none";
  messageEl.classList.remove("dogSave");
  const r=computeFinalScore();
  messageEl.innerHTML=`🌸 ¡Gracias por jugar!<br><small>Lo has hecho genial 💖 · ${r.total.toLocaleString()} puntos</small><br><button class="victoryBtn finish" onclick="returnToMainMenuWithConfirm()" style="margin-top:18px;font-size:16px;padding:10px 22px">Volver al menú 🏠</button>`;
  messageEl.style.display="block";
});
function confirmGameRestart(){
  return window.confirm("¿Seguro que quieres reiniciar la partida? Perderás el progreso de la partida actual.");
}
function confirmGoToMenu(){
  return window.confirm("¿Seguro que quieres volver al menú? Perderás el progreso de la partida actual.");
}
function restartFromGameOverWithConfirm(){
  if(!confirmGameRestart())return;
  gameOverPanel.style.display="none";
  startGame();
}
function restartCurrentGameWithConfirm(){
  if(!confirmGameRestart())return;
  closePause();
  gameStarted=true;
  startPanel.style.display="none";
  restart();
}
function returnToMainMenuWithConfirm(){
  if(!confirmGoToMenu())return;
  returnToMainMenu();
}
gameOverRestartBtn.addEventListener("click",restartFromGameOverWithConfirm);
victoryContinueBtn.addEventListener("click",()=>{
  const wasFinalCompletion=isGameCompleted();
  victoryPanel.style.display="none";
  gameOver=false;
  choosingUpgrade=false;
  levelUpPanel.style.display="none";
  if(wasFinalCompletion){
    finalCompletionContinue=true;
    syncXpRequirementPhase();
    finalCompletionStartWave=wave+1;
    bossVictoryAlreadyShown=true;
    shopBossPending=false;
    shopAvailable=false;
    fusionAvailable=false;
    wave++;
    showFloatingText({x:canvas.width/2,y:130,text:"🐾 Modo infinito activado",life:2.5,maxLife:2.5,big:true,important:true});
    startWave();
    updateHud();
    syncMusic();
    return;
  }
  if(!bossVictoryAlreadyShown){
    bossVictoryAlreadyShown=true;
    showFloatingText({x:canvas.width/2,y:130,text:"💪 ¡Sigue mejorando!",life:2.5,maxLife:2.5,big:true});
  }
  if(shopAvailable)openCoinShop();
  else maybeOpenShopOrFusion();
});
restartButton.addEventListener("click",restartCurrentGameWithConfirm);
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
  closeAdmin();autoMode=false;adminUnlocked=false;updateAdminVisibility();
  clearAllInputKeys();
  stopAllMusic();
  releaseGamePointer();
  paused=false;
  choosingUpgrade=false;
  gameOver=false;
  finalChoiceLocked=false;
  finalCompletionContinue=false;
  finalCompletionStartWave=0;
  pausePanel.style.display="none";
  levelUpPanel.style.display="none";
  victoryPanel.style.display="none";
  gameOverPanel.style.display="none";
  messageEl.classList.remove("dogSave");
  messageEl.style.display="none";
  gameStarted=false;runCosmeticSelections=null;
  restart();
  paused=false;
  choosingUpgrade=false;
  startPanel.style.display="flex";
  loadOnlineRanking([startRankingList]);
}
menuButton.addEventListener("click",returnToMainMenuWithConfirm);
if(gameOverMenuBtn)gameOverMenuBtn.addEventListener("click",returnToMainMenuWithConfirm);

function resetUpgrades(){
xpFraction=0;
Object.assign(upgrades,{damageReduction:0,luck:0,fireRate:1,fishSpeed:1,damage:1,moveSpeed:1,maxLife:100,bigFishChance:0,doubleFishChance:0,pierceChance:0,fishSize:1,catSlow:0,healOnWave:8,lifeSteal:0,xpBoost:1,boomerangChance:0,shield:false,shieldLevel:0,critChance:0,zoomies:false,zoomiesHyper:false,zoomiesCannon:false,zoomiesCrit:false,aimAssist:false,moralSupport:false,darkPact:false,catInstinct:false,boyfriendDog:false,boyfriendDogSpirit:false,boyfriendDogReturned:false,bigCursor:false,coinMagnetRange:0,perfectAim:false,braveHeart:false,reflexBurst:false,valorCasa:false,cursedInstinct:false,zoomiesEscape:false,fusionBonusPower:0,sevenLives:false});
Object.keys(upgradeLevels).forEach(k=>upgradeLevels[k]=0);Object.keys(upgradeMaxLevels).forEach(k=>upgradeMaxLevels[k]=5);Object.keys(fusedBaseLevels).forEach(k=>delete fusedBaseLevels[k]);fusedUpgradeNames={};doneFusionPairs={};fusionProgressLevels={};
}

const XP_PHASE_RATES={main:1.35,postBoss:1.33,endless:1.30};
const XP_PHASE_ENTRY_DISCOUNT={postBoss:.90,endless:.92};
let xpRequirementPhase="main";
function nextXpRequirement(current,phase=xpRequirementPhase){
  return Math.ceil(current*(XP_PHASE_RATES[phase]||XP_PHASE_RATES.main)+2);
}
function getXpProgressionPhase(){
  if(!defeatedBossTypes||defeatedBossTypes.size<BOSS_TYPES.length)return "main";
  if(finalCompletionContinue)return "endless";
  const pairs=Object.keys(doneFusionPairs||{});
  const expected=getAllFusionKeys().length/2;
  if(expected>0&&pairs.length===expected&&pairs.every(pair=>getFusionProgress(pair)>=5))return "endless";
  return "postBoss";
}
function syncXpRequirementPhase(){
  const phase=getXpProgressionPhase();
  if(phase===xpRequirementPhase)return false;
  xpNeed=Math.max(5,Math.ceil(xpNeed*(XP_PHASE_ENTRY_DISCOUNT[phase]||1)));
  xpRequirementPhase=phase;
  return true;
}
function getXpNeedForLevel(targetLevel){
  let need=5;
  const lvl=Math.max(1,Math.floor(targetLevel||1));
  for(let i=1;i<lvl;i++)need=nextXpRequirement(need,"main");
  return need;
}

function restart(){
if(gameStarted)rollRandomSkins();else runCosmeticSelections=null;
saveAchievements();
clearAllInputKeys();
simulationMs=0;roundVariant="normal";bossRewardUntil=0;bossRewardType="";lastCriticalRippleAt=-Infinity;lastSaltSpreadAt=-Infinity;lastRamFishAt=-RAM_FISH_BASE_COOLDOWN;lastManualShotAt=-Infinity;manualShotsSinceBloquito=0;frameAccumulator=0;
xpRequirementPhase="main";autoRamNextEvaluationAt=0;autoLastResidualShotAt=-Infinity;autoResidualNextDecisionAt=0;autoDecisionCooldown=0;autoProjectileDirection=null;autoProjectileDirectionUntil=0;autoLastStuckCheckAt=0;
selectedTarget=null;lastStarTrail=0;screenShake=0;screenShakeX=0;screenShakeY=0;
if(autoChoiceTimer)clearTimeout(autoChoiceTimer);
autoChoiceToken++;autoChoiceMenu=null;
pausePanel.style.display="none";
stopPowerStarLoop();
lastOrbitalGuard=-Infinity;zoomiesEscapeHits=0;forcedZoomiesUntil=0;safeTeleportInvulnUntil=0;lastDemonOrbDamageAt=-Infinity;
backgroundFishSeed=Math.floor(Math.random()*1000000);
autoRunChoices=[];autoRunStartTime=performance.now();autoLastPlayerX=player.x;autoLastPlayerY=player.y;autoStuckTimer=0;autoEmergencyEscapeUntil=0;
resetUpgrades();
runStartWave=1;
autoModeUsedThisRun=!!autoMode;
rankingEligibleThisRun=!autoModeUsedThisRun&&!window.coopTest?.inRun;
rankingDisabledReason=window.coopTest?.inRun?"Partida cooperativa de prueba: ranking desactivado.":(rankingEligibleThisRun?"":"Ranking desactivado: la partida empezó con IA activada.");
cosmeticAwardedThisRun=false;cosmeticScalesAwardedThisRun=0;
currentWaveHadDamage=false;currentNoDamageStreak=0;
score=0;shots=0;runStats=freshRunStats();lastScoreUploadKey="";runScoreBackups=new Map();lastShot=-Infinity;lastFrame=performance.now();gameOver=false;choosingUpgrade=false;paused=false;waveUpgradePending=false;pendingUpgradeQueue=[];wave=1;thiefCoinsStolenThisWave=0;spawnCooldown=0;life=upgrades.maxLife;level=1;xp=0;xpNeed=getXpNeedForLevel(level);boss=null;shieldAngle=0;lastShieldHit=0;lastOmniBurst=0;rainbowChanceLevel=1;rainbowSelectedThisWave=false;rainbowSpawnedThisWave=false;catInstinctUsedThisWave=false;catInstinctUsesThisWave=0;dogSacrificeUsed=false;rainbowPendingUntilKilled=false;coins=0;musicianSpawnedThisWave=false;shopAvailable=false;firstShopReached=false;shopBossPending=false;fusionAvailable=false;lastBossType="";shopUpgradePurchases=0;shopFusionPurchases=0;dogKidnapped=false;avalancheActive=false;avalancheTime=0;avalancheDelay=999;avalancheThisWave=false;avalancheSpawnTimer=0;starSpawnTimer=12;starChanceLevel=1;starActive=false;starTime=0;starWarningPlayed=false;forceDemonNextBoss=false;sevenLivesTime=0;sevenLivesCooldown=0;sevenLivesUsedThisWave=false;defeatedBossTypes=new Set();bossEncounterCounts={giantCat:0,duck:0,seal:0,demon:0,octopus:0};bossVictoryAlreadyShown=false;bossVictoryScoreSaved="";bossVictoryPending=false;dogRelaxTime=0;fusionMoveXpTimer=0;lastFusionShieldGuard=0;enemyIntroSeen={};finalChoiceLocked=false;finalCompletionContinue=false;finalCompletionStartWave=0;demonSpawnPressure=0;perfFps=60;lowPerfMode=false;lowPerfTimer=0;
powerStars.length=0;tunaDrops.length=0;
player.x=canvas.width/2;player.y=canvas.height/2;player.angle=0;player.shootAnim=0;player.hurtAnim=0;if(window.coopTest?.hostActive)window.coopTest.resetPlayer();dogCompanion.x=player.x-50;dogCompanion.y=player.y+45;dogCompanion.shootCooldown=0;
fishes.length=0;ramFishTrails.length=0;cats.length=0;hearts.length=0;smokes.length=0;floatingTexts.length=0;pawPrints.length=0;quacks.length=0;coinsDrops.length=0;dogBones.length=0;demonOrbs.length=0;yarnBalls.length=0;shockwaves.length=0;sparkles.length=0;
canvas.style.cursor="crosshair";
messageEl.classList.remove("dogSave");messageEl.style.display="none";levelUpPanel.style.display="none";gameOverPanel.style.display="none";victoryPanel.style.display="none";startWave();updateHud();syncMusic()
}

function queueUpgradeMenus(reason,count){
  count=Math.max(0,Math.floor(count||0));
  for(let i=0;i<count;i++)pendingUpgradeQueue.push(reason||"level");
  processPendingUpgradeQueue();
}
function processPendingUpgradeQueue(){
  if(updatingWorld||choosingUpgrade||gameOver||paused||!gameStarted)return;
  if(!pendingUpgradeQueue.length){
    if(bossVictoryPending){showBossVictoryPanel();return;}
    maybeOpenShopOrFusion();
    return;
  }
  const next=pendingUpgradeQueue.shift();
  if(next==="rainbow")openRainbowLowestMenu();
  else openUpgradeMenu(next,{fromQueue:true});
}
function cleanupRoundScreen(opts={}){
  const keepFloating=!!opts.keepFloating;
  const keepSoftEffects=!!opts.keepSoftEffects;
  for(const cat of cats)refundRemovedThief(cat);
  for(const coin of coinsDrops)if(coin?.recovered)collectCoinDrop(coin);
  if(cats.some(cat=>cat?.rainbow&&!cat.dead))rainbowSpawnedThisWave=false;
  selectedTarget=null;
  cats.length=0;
  let keptFish=0;
  for(const fish of fishes)if(fish.giantEaster&&fish.life>0)fishes[keptFish++]=fish;
  fishes.length=keptFish;
  ramFishTrails.length=0;
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
    collectCoinDrop(coin);
    collectedCoins+=amount;
  }

  let collectedTuna=0;
  let healed=0;
  for(let i=0;i<tunaDrops.length;i++){
    const stacks=Math.max(1,safeCount(tunaDrops[i]?.stacks,1));
    healed+=Math.round(15+Math.random()*10)*stacks;
    collectedTuna+=stacks;
  }
  if(healed>0)life=Math.min(upgrades.maxLife,life+healed);

  coinsDrops.length=0;
  tunaDrops.length=0;

  if(collectedCoins>0||collectedTuna>0){
    const parts=[];
    if(collectedCoins>0)parts.push(`+${collectedCoins} 🪙`);
    if(collectedTuna>0)parts.push(`+${collectedTuna} 🐟`);
    showFloatingText({x:canvas.width/2,y:150,text:`Recogido: ${parts.join(" · ")}`,life:1.7,maxLife:1.7,big:true});
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
const rainbowChance=Math.min(.78,rainbowChanceLevel*.013*(1+upgrades.luck));
rainbowSelectedThisWave=Math.random()<rainbowChance;
if(rainbowSelectedThisWave)rainbowPendingUntilKilled=true;
else rainbowChanceLevel++;
}
avalancheActive=false;
avalancheTime=0;
avalancheSpawnTimer=0;
roundVariant=getRoundVariant();
const avalancheCfg=getAvalancheConfig();
const forcedPostBossAvalanche=wave>=6&&wave%5===1;
const randomAvalanche=wave>=14&&wave%5!==0&&Math.random()<avalancheCfg.chance;
avalancheThisWave=forcedPostBossAvalanche||randomAvalanche;
if(avalancheThisWave)roundVariant="normal";
avalancheDelay=avalancheThisWave?Math.max(2.8,waveDuration*(.58-avalancheCfg.intensity*.14)):999;
starSpawnTimer=3+Math.random()*Math.min(10,waveDuration*.5);
starSpawnedThisWave=false;
if(wave%5===0)spawnBoss();
const variantNames={invasion:"🐱 Invasión felina",sprinters:"⚡ Gatos veloces",specials:"✨ Ronda de especiales"};
if(roundVariant!=="normal"||wave%5===0)showFloatingText({x:canvas.width/2,y:115,text:variantNames[roundVariant]||(wave%5===0?`Jefe ronda ${wave}`:`Ronda ${wave}`),life:1.8,maxLife:1.8,big:true,important:true})
}

function getAvalancheConfig(){
const phase=getGamePhase();
let intensity=Math.max(0,Math.min(1,(wave-6)/34));
if(phase==="main")intensity*=.55;
else if(phase==="postBoss")intensity=Math.min(.82,intensity*.72+.12);
else intensity=Math.min(1,.55+getEndlessPressure()*.018);
return {
  intensity,
  chance:phase==="main"?Math.min(.22,.030+Math.max(0,wave-14)*.006):phase==="postBoss"?Math.min(.34,.045+Math.max(0,wave-20)*.008):Math.min(.55,.18+getEndlessPressure()*.010),
  duration:phase==="main"?2.2+intensity*3.8:phase==="postBoss"?2.6+intensity*5.0:3.0+intensity*7.5,
  amount:phase==="main"?1+Math.floor(intensity*2):phase==="postBoss"?1+Math.floor(intensity*3):2+Math.floor(intensity*5),
  interval:phase==="main"?Math.max(.60,1.25-intensity*.38):phase==="postBoss"?Math.max(.42,1.12-intensity*.50):Math.max(.30,.95-intensity*.55),
  smallChance:Math.max(.34,1-intensity*.58)
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
showFloatingText({x:canvas.width/2,y:145,text:label,life:2,maxLife:2,big:true,important:true});
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
avalancheThisWave=false;
showFloatingText({x:canvas.width/2,y:145,text:"La avalancha terminó 🐾",life:1.5,maxLife:1.5,big:false});
}
}

function trySpawnPowerStar(){
if(starSpawnedThisWave||starActive||powerStars.length>0)return;
const chance=Math.min(.28,(.018+starChanceLevel*.012)*(1+upgrades.luck));
if(Math.random()<chance){
const margin=90;
powerStars.push({x:margin+Math.random()*(canvas.width-margin*2),y:margin+Math.random()*(canvas.height-margin*2),r:18,life:14,maxLife:14,wobble:Math.random()*Math.PI*2,auraPhase:Math.random()*Math.PI*2});
starSpawnedThisWave=true;
starChanceLevel=1;
showFloatingText({x:canvas.width/2,y:175,text:"⭐ ¡Ha aparecido una estrella!",life:2,maxLife:2,big:true,important:true});
}else starChanceLevel++;
}

function playStarPickupSound(){
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
showFloatingText({x:player.x,y:player.y-80,text:"⭐ ¡Invencible!",life:1.8,maxLife:1.8,big:true,important:true});
}

function isPowerStarActive(){return starActive&&starTime>0}
function getStarSpeedMultiplier(){return isPowerStarActive()?1.55:1}
function isSevenLivesActive(){return upgrades.sevenLives&&sevenLivesTime>0}
function isSafeTeleportInvulnerable(){return gameNow()<safeTeleportInvulnUntil}
function isPlayerProtected(){return isPowerStarActive()||isSevenLivesActive()||isSafeTeleportInvulnerable()}
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
  showFloatingText({x:player.x,y:player.y-92,text:"🐱 ¡Siete vidas!",life:1.8,maxLife:1.8,big:true,important:true});
  return true;
}
function getDangerAtPoint(x,y){
let danger=getOctopusAreaDanger(x,y,player.r+25)*2500;
const margin=72;
const edge=Math.min(x,y,canvas.width-x,canvas.height-y);
if(edge<margin)danger+=(margin-edge)*8;

cats.forEach(cat=>{
  if(!isCombatTargetAvailable(cat))return;
  const d=Math.max(1,Math.hypot(cat.x-x,cat.y-y)-(cat.r||18));
  danger+=Math.max(0,540-d)*((cat.small?.72:1)+(cat.type==="yarn"?.35:0)+(cat.type==="glutton"?.25:0));
  if(d<90)danger+=900;
});

if(isCombatTargetAvailable(boss)){
  const d=Math.max(1,Math.hypot(boss.x-x,boss.y-y)-(boss.r||55));
  danger+=Math.max(0,780-d)*2.25;
  if(d<150)danger+=1900;
}

quacks.forEach(q=>{if(!isFinitePos(q))return;const d=Math.max(1,Math.hypot(q.x-x,q.y-y)-(q.r||20));danger+=Math.max(0,360-d)*1.8;if(d<90)danger+=700;});
demonOrbs.forEach(o=>{if(!isFinitePos(o))return;const d=Math.max(1,Math.hypot(o.x-x,o.y-y)-(o.r||12));danger+=Math.max(0,350-d)*1.7;if(d<80)danger+=650;});
yarnBalls.forEach(o=>{if(!isFinitePos(o))return;const d=Math.max(1,Math.hypot(o.x-x,o.y-y)-(o.r||12));danger+=Math.max(0,330-d)*1.45;if(d<75)danger+=520;});

return danger;
}

function findSafestTeleportSpot(){
const margin=90;
let best={x:player.x,y:player.y,score:getDangerAtPoint(player.x,player.y)};
const samples=[];
const cols=5,rows=4;
for(let iy=0;iy<rows;iy++){
  for(let ix=0;ix<cols;ix++){
    samples.push({x:margin+(canvas.width-margin*2)*(ix+.5)/cols,y:margin+(canvas.height-margin*2)*(iy+.5)/rows});
  }
}
for(let i=0;i<18;i++)samples.push({x:margin+Math.random()*(canvas.width-margin*2),y:margin+Math.random()*(canvas.height-margin*2)});
samples.forEach(p=>{
  const moveCost=Math.hypot(p.x-player.x,p.y-player.y)*.06;
  const centerBias=Math.hypot(p.x-canvas.width/2,p.y-canvas.height/2)*.018;
  const score=getDangerAtPoint(p.x,p.y)+moveCost+centerBias;
  if(score<best.score)best={x:p.x,y:p.y,score};
});
return best;
}

function activateZoomiesEscape(){
if(!upgrades.zoomiesEscape&&!hasDoneFusionPair("catInstinct+zoomies"))return false;
const spot=findSafestTeleportSpot();
if(!spot||!Number.isFinite(spot.x)||!Number.isFinite(spot.y))return false;

const oldX=player.x,oldY=player.y;
makeSmoke(oldX,oldY);
shockwaves.push({x:oldX,y:oldY,r:8,maxR:120,life:.42,maxLife:.42,color:"#4cc9f0",line:5});

player.x=Math.max(player.r+16,Math.min(canvas.width-player.r-16,spot.x));
player.y=Math.max(player.r+16,Math.min(canvas.height-player.r-16,spot.y));
mouse.x=player.x+Math.cos(player.angle)*95;
mouse.y=player.y+Math.sin(player.angle)*95;

forcedZoomiesUntil=Math.max(forcedZoomiesUntil,gameNow()+2600);
safeTeleportInvulnUntil=Math.max(safeTeleportInvulnUntil,gameNow()+1000);
player.hurtAnim=Math.max(player.hurtAnim,.35);

makeSmoke(player.x,player.y);
makeHearts(player.x,player.y);
shockwaves.push({x:player.x,y:player.y,r:10,maxR:170,life:.58,maxLife:.58,color:"#9b5de5",line:6});
showFloatingText({x:player.x,y:player.y-94,text:"💨 Huida felina",life:1.35,maxLife:1.35,big:false,important:true});
showFloatingText({x:player.x,y:player.y-68,text:"1s invulnerable",life:.95,maxLife:.95,big:false});

triggerCatInstinct(true);
return true;
}

function registerZoomiesEscapeHit(){
if(!upgrades.zoomiesEscape&&!hasDoneFusionPair("catInstinct+zoomies"))return false;
zoomiesEscapeHits=Math.min(5,zoomiesEscapeHits+1);
const remaining=5-zoomiesEscapeHits;
if(remaining>0){
  showFloatingText({x:player.x,y:player.y-74,text:`💨 Huida felina ${zoomiesEscapeHits}/5`,life:.75,maxLife:.75,big:false});
  return false;
}
zoomiesEscapeHits=0;
return activateZoomiesEscape();
}

function getPlayerBodyDamagePerSecond(){
return Math.min(4,Math.max(.55,(upgrades.damage||1)*.55));
}

function applyFreshDemonOrbBodyHit(orb){
if(!orb||!boss||boss.type!=="demon")return false;
const insideDemon=Math.hypot(player.x-boss.x,player.y-boss.y)<Math.max(8,boss.r-player.r*.15);
if(!insideDemon)return false;
orb.hitsLeft=Math.max(0,(orb.hitsLeft||1)-1);
makeSmoke(orb.x,orb.y);
if(orb.hitsLeft<=0)return true;
orb.bodySafeUntil=gameNow()+320;
return false;
}

function takePlayerDamage(amount,deathText,hurt=.2){
if(gameOver||!gameStarted||paused||choosingUpgrade)return false;
amount=Number.isFinite(amount)?Math.max(0,amount):0;
if(amount<=0)return false;
if(isPlayerProtected()){
player.hurtAnim=.08;
if(Math.random()<.22)showFloatingText({x:player.x,y:player.y-56,text:isSevenLivesActive()?"🐱 protegido":"⭐ invulnerable",life:.65,maxLife:.65,big:false});
return false;
}
if(hasDoneFusionPair("catInstinct+shield")&&upgrades.shield&&gameNow()-lastFusionShieldGuard>10000){
lastFusionShieldGuard=gameNow();
amount*=0.35;
shockwaves.push({x:player.x,y:player.y,r:8,maxR:150,life:.55,maxLife:.55,color:"#90e0ef",line:6});
cats.forEach(cat=>{if(!isCombatTargetAvailable(cat))return;const dx=cat.x-player.x,dy=cat.y-player.y,d=Math.hypot(dx,dy)||1;if(d<330){cat.knockVx=(cat.knockVx||0)+(dx/d)*420;cat.knockVy=(cat.knockVy||0)+(dy/d)*420;cat.hitAnim=.18;}});
showFloatingText({x:player.x,y:player.y-86,text:"🛡️ Guardia felina",life:1.1,maxLife:1.1,big:false});
}
amount*=1-Math.min(.45,Math.max(0,upgrades.damageReduction||0));
if(bossRewardActive("octopus"))amount*=.88;
if(hasDoneFusionPair("damageReduction+shield")&&gameNow()-lastOrbitalGuard>=(8-3*fusionStrength("damageReduction+shield"))*1000){
 lastOrbitalGuard=gameNow();const force=160+140*fusionStrength("damageReduction+shield");
 cats.forEach(c=>{const dx=c.x-player.x,dy=c.y-player.y,d=Math.hypot(dx,dy);if(d>0&&d<190){c.knockVx=(c.knockVx||0)+dx/d*force;c.knockVy=(c.knockVy||0)+dy/d*force;}});
 shockwaves.push({x:player.x,y:player.y,r:12,maxR:190,life:.45,maxLife:.45,color:'#94d9ff',line:4});
}
const predictedLife=life-amount;
if(upgrades.sevenLives&&predictedLife<7&&activateSevenLives())return false;
if(runStats){runStats.damageTaken+=Math.min(Math.max(0,life),amount);runStats.damageEvents++;}
life=predictedLife;
currentWaveHadDamage=true;
const lowLifeAchievementThreshold=Math.max(1,Math.ceil(upgrades.maxLife*.10));
if(life>0&&life<=lowLifeAchievementThreshold&&!upgrades.sevenLives&&!isSevenLivesActive())setAchievementFlag("oneHpLuck",{run:true});
player.hurtAnim=hurt;
if(life>0)registerZoomiesEscapeHit();
if(life<=0)endGame(deathText);
return true;
}

const BOSS_DISPLAY_NAMES={giantCat:"Gato gigante",duck:"Pato",seal:"Foca",demon:"Demonio",octopus:"Pulpo"};
function getBossRepeatLevel(type){
  return Math.max(0,(bossEncounterCounts&&bossEncounterCounts[type]?bossEncounterCounts[type]:0)-1);
}

function showBossVictoryPanel(){
  releaseGamePointer();
  pauseAllMusic();
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
  return BOSS_TYPES.filter(t=>!defeatedBossTypes.has(t));
}
function isBossTypeAllowedNow(type){
  if(type==="octopus")return wave>=10;
  if(type!=="demon")return true;

  if(wave<=5)return false;

  const hasDogFusion=upgrades.boyfriendDog&&!dogKidnapped&&!dogSacrificeUsed;

  if(hasDogFusion)return wave>=10;
  if(forceDemonNextBoss)return wave>=10;

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
function chooseNextBossType(types=BOSS_TYPES){
  const pending=getPendingBossTypes();
  const available=types.filter(t=>BOSS_TYPES.includes(t)&&isBossTypeAllowedNow(t));
  let pool=pending.length?available.filter(t=>pending.includes(t)):available.filter(t=>t!==lastBossType);
  if(!pool.length)pool=pending.length?pending.filter(isBossTypeAllowedNow):BOSS_TYPES.filter(t=>t!==lastBossType&&isBossTypeAllowedNow(t));
  if(!pool.length)pool=pending.length?pending:BOSS_TYPES.filter(t=>t!==lastBossType);
  const hasDogFusion=upgrades.boyfriendDog&&!dogKidnapped&&!dogSacrificeUsed;
  const weighted=pool.map(type=>({type,weight:type==="demon"&&(hasDogFusion||forceDemonNextBoss)
    ?1+(hasDogFusion?8:5)+demonSpawnPressure*(hasDogFusion?7:4):1}));
  return weightedRandomBoss(weighted);
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
let objectivePanelSignature="";
function updateObjectivePanel(){
  if(!objectiveMainEl||!objectiveFusionEl)return;
  const fusionSig=Object.keys(doneFusionPairs||{}).sort().map(pair=>`${pair}:${getFusionProgress(pair)}`).join(",");
  const signature=[gameStarted?1:0,wave||0,boss?.type||"",[...defeatedBossTypes].sort().join(","),Object.values(upgradeLevels).join(","),fusionSig].join("|");
  if(signature===objectivePanelSignature)return;
  objectivePanelSignature=signature;
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
  [quacks,yarnBalls,demonOrbs].forEach(list=>list.forEach(o=>{const dx=o.x-player.x,dy=o.y-player.y,d=Math.hypot(dx,dy)||1;const speed=Math.max(260,Math.hypot(o.vx||0,o.vy||0));o.vx=(dx/d)*speed;o.vy=(dy/d)*speed;}));
  if(boss){const dx=boss.x-player.x,dy=boss.y-player.y,d=Math.hypot(dx,dy)||1;boss.knockVx=(boss.knockVx||0)+(dx/d)*260;boss.knockVy=(boss.knockVy||0)+(dy/d)*260;boss.relaxTimer=Math.max(boss.relaxTimer||0,2.0);}
  showFloatingText({x:player.x,y:player.y-120,text:"🐶 Relax, yo te cubro",life:2,maxLife:2,big:true,important:true});
}

function getSealJumpCount(round=wave,repeats=0){return Math.min(12,6+Math.floor(Math.max(0,round-10)/10)+Math.min(2,repeats));}
function getDemonOrbResistanceChance(round=wave){return Math.min(.12,Math.max(0,round-10)*.003);}
function spawnBoss(){
syncMusic();
let types=["giantCat","duck","seal"];
if(isBossTypeAllowedNow("octopus"))types.push("octopus");

if(isBossTypeAllowedNow("demon")){
  types.push("demon");
}

let type=chooseNextBossType(types);
const hasDogFusion=upgrades.boyfriendDog&&!dogKidnapped&&!dogSacrificeUsed;

if(type==="demon"){
  demonSpawnPressure=0;
  forceDemonNextBoss=false;
}else if(hasDogFusion&&wave>5){
  demonSpawnPressure++;
}

lastBossType=type;
const previousBossEncounters=bossEncounterCounts[type]||0;
bossEncounterCounts[type]=previousBossEncounters+1;
const bossRepeatLevel=previousBossEncounters;
const firstBossIntro=bossRepeatLevel===0;
const phase=getGamePhase();
const endlessBossMul=getEndlessBossMultiplier();
const baseWaveBossScale=phase==="main"?(1+wave*.055+bossRepeatLevel*.10):phase==="postBoss"?(1+wave*.070+bossRepeatLevel*.14):(1+wave*.085+bossRepeatLevel*.18);
const hpScale=(firstBossIntro?.68:baseWaveBossScale)*endlessBossMul;
const speedScale=(firstBossIntro?.78:1)*(phase==="main"?1:phase==="postBoss"?(1+getPostBossPressure()*.010):(1+getEndlessPressure()*.028));
const damageScale=(firstBossIntro?.70:1)*(phase==="main"?1:phase==="postBoss"?(1+getPostBossPressure()*.012):(1+getEndlessPressure()*.038));
if(bossRepeatLevel>0){
  showFloatingText({x:canvas.width/2,y:205,text:"👑 Jefe reforzado",life:1.6,maxLife:1.6,big:false,important:true});
}

if(type==="demon"){
const hasDog=upgrades.boyfriendDog&&!dogSacrificeUsed;
if(hasDog){dogKidnapped=true;dogBones.length=0;}
demonOrbs.length=0;
const hp=Math.round((140+wave*22)*hpScale);
const baseShoot=Math.max(firstBossIntro?.62:.38,(1.15-wave*.025-bossRepeatLevel*.08)/(1+getEndlessPressure()*.025));
boss={
type,
x:canvas.width/2,
y:canvas.height*.22,
r:66+Math.min(26,wave*.75),
hp,
maxHp:hp,
speed:(95+wave*2.2)*speedScale,
shoot:firstBossIntro?1.25:.9,
baseShoot,
circleCount:firstBossIntro?Math.min(8,5+Math.floor(wave/10)):(phase==="main"?Math.min(12,7+Math.floor(wave/10)+bossRepeatLevel):phase==="postBoss"?Math.min(16,9+Math.floor(wave/8)+bossRepeatLevel*2):12+Math.min(10,Math.floor(wave/5))+Math.min(8,bossRepeatLevel*2)+Math.min(10,Math.floor(getEndlessPressure()/3))),
orbSpeed:(165+wave*5)*(firstBossIntro?.82:1)*(1+getEndlessPressure()*.05),
hitAnim:0,
wobble:0,
contactDamage:(20+wave*.45)*damageScale
};
boss.repeatLevel=bossRepeatLevel;
constrainBossToArena(boss);
const demonMsg=hasDog?"😈 El demonio ha robado a tu perro":"😈 ¡El demonio ha llegado!";
showFloatingText({x:canvas.width/2,y:170,text:demonMsg,life:2.6,maxLife:2.6,big:true,important:true});
return;
}

if(type==="octopus"){
const hp=Math.round((115+wave*19)*hpScale);
boss={type,x:canvas.width/2,y:canvas.height/2,r:62+Math.min(20,wave*.6),hp,maxHp:hp,
  state:"surface",dives:0,attackTimer:1.5,attacks:[],hitAnim:0,wobble:0,
  tentacleDamage:(12+wave*.32)*damageScale,strikeRadius:68*getOctopusGrowth().size,tentacleScale:getOctopusGrowth().size,salvoCount:getOctopusGrowth().salvo,extraTentacles:getOctopusGrowth().extra,repeatLevel:bossRepeatLevel};
showFloatingText({x:boss.x,y:boss.y-boss.r-45,text:"🐙 ¡El pulpo emerge!",life:2,maxLife:2,big:true,important:true});
syncMusic();return;
}
if(type==="giantCat"){
const hp=Math.round((80+wave*16)*hpScale);
const summonBase=Math.max(phase==="main"?1.25:phase==="postBoss"?1.05:.85,2.15-wave*.04-bossRepeatLevel*.06-getEndlessPressure()*.01);
boss={type,x:canvas.width/2,y:-90,r:62+Math.min(28,wave*1.2),hp,maxHp:hp,speed:(42+wave*3.4)*speedScale,summon:summonBase,baseSummon:summonBase,summonCount:firstBossIntro?Math.min(3,1+Math.floor(wave/12)):Math.min(phase==="main"?4:phase==="postBoss"?5:6,2+Math.floor(wave/15)+Math.floor((bossRepeatLevel+1)/2)+Math.floor(getEndlessPressure()/8)),hitAnim:0,wobble:0,contactDamage:(16+wave*.7)*damageScale}
}else if(type==="duck"){
const hp=Math.round((90+wave*18)*hpScale);
const duckShoot=Math.max(firstBossIntro?.72:.24,1.25-wave*.045-bossRepeatLevel*.10-getEndlessPressure()*.018);
boss={type,x:canvas.width/2,y:canvas.height*.25,r:58+Math.min(20,wave*.9),hp,maxHp:hp,shoot:duckShoot,baseShoot:duckShoot,burst:firstBossIntro?1:(phase==="main"?Math.min(2,1+Math.floor(wave/25)):phase==="postBoss"?Math.min(3,1+Math.floor(wave/18)):Math.min(5,1+Math.floor(wave/15)+Math.floor(getEndlessPressure()/9))),quackSpeed:(190+wave*12)*(firstBossIntro?.82:1)*(1+getEndlessPressure()*.045),hitAnim:0,wobble:0}
}else{
const tx=Math.random()*(canvas.width-180)+90,ty=Math.random()*(canvas.height-180)+90;
const hp=Math.round((95+wave*19)*hpScale);
const jumpBase=Math.max(firstBossIntro?.92:.45,1.12-wave*.025-getEndlessPressure()*.012);
boss={type,x:canvas.width/2,y:canvas.height*.35,r:55+Math.min(22,wave*.85),hp,maxHp:hp,hitAnim:0,wobble:0,state:"jumping",baseJumpDuration:jumpBase,jumpTimer:jumpBase,jumpDuration:jumpBase,startX:canvas.width/2,startY:canvas.height*.35,targetX:tx,targetY:ty,shadowX:tx,shadowY:ty,jumps:0,jumpsBeforeRest:getSealJumpCount(wave,bossRepeatLevel),stunTimer:0,stunDuration:Math.max(firstBossIntro?1.55:.70,2.5-wave*.035-bossRepeatLevel*.16-getEndlessPressure()*.018),slamDamage:(13+wave*.65)*damageScale}
}
if(boss){boss.repeatLevel=bossRepeatLevel;if(boss.type==="giantCat")boss.summonCount=Math.min(12,boss.summonCount+1);constrainBossToArena(boss);}
syncMusic();
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
function effectLevel(key){
const value=(fusedBaseLevels[key]||0)+fusionPostLevel(key);
return key==="shield"?Math.min(10,value):value;
}
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
if(isPercentLimitedKey(key)&&nextLevel(key)>=upgradeMaxLevels[key])return `${displayName} DEFINITIVA`;
if(n===5)return `${displayName} DEFINITIVA`;
return `${displayName} Nv.${n}`
}
function upgradeDesc(key){return getUpgradeDisplayDesc(key,nextLevel(key))}
function pct(n){return Math.min(100,Math.round(n*13))}

function fusionStatScale(key,preRate,postRate,cap=5*(preRate+postRate),post=fusionPostLevel(key)){
const base=fusedBaseLevels[key]||0;
if(!hasFusionComponent(key))return Math.min(cap,(base+post)*preRate);
const initial=Math.min(cap,base*preRate);
return initial+(cap-initial)*[0,.14,.31,.51,.74,1][Math.min(5,Math.max(0,Math.floor(post)))];
}
function coreUpgradeStat(key,post=fusionPostLevel(key)){
if((key==="boomerang"||key==="critChance")&&hasDoneFusionPair("boomerang+critChance")){
  return .65+.02*Math.min(5,Math.max(0,Math.floor(post)));
}
const effectivePost=hasFusionComponent(key)?5*[0,.14,.31,.51,.74,1][Math.min(5,Math.max(0,Math.floor(post)))]:post;
const lv=(fusedBaseLevels[key]||0)+effectivePost;
if(key==="damageReduction")return fusionStatScale(key,.05,.04,.45,post);
if(key==="luck")return fusionStatScale(key,.05,.05,.50,post);
const scalarCurves={moveSpeed:[.08,.70],fireRate:[.19,1.45],fishSpeed:[.15,1.25],damage:[.16,1.50],xpBoost:[.10,.85]};
if(scalarCurves[key]){const [rate,cap]=scalarCurves[key];return 1+fusionStatScale(key,rate,0,cap,post);}
if(["bigFish","doubleFish","pierce","boomerang","critChance"].includes(key))return fusionStatScale(key,.13,.07,.95,post);
if(key==="catSlow")return fusionStatScale(key,.13,.07,.85,post);
if(key==="saltScales")return .45+Math.min(2.30,fusionStatScale(key,.23,.23,2.30,post));
if(key==="lifeSteal")return fusionStatScale(key,.013,.013,.13,post);
if(key==="yarnBounce")return fusionStatScale(key,.13,.07,1,post);
if(key==="maxLife")return 100+lv*20+Math.min(5,lv)*16;
if(key==="healOnWave")return 8+lv*5+Math.min(5,lv)*4;
if(key==="coinMagnet")return lv>0?90+lv*45+Math.min(5,lv)*20:0;
if(key==="fishSize"){const initial=Math.min(1.45,((fusedBaseLevels[key]||0)+getFishSizeFusionBonus())*.12);const bonus=hasFusionComponent(key)?initial+(1.45-initial)*[0,.12,.27,.46,.70,1][Math.min(5,Math.max(0,Math.floor(post)))]:Math.min(1.45,(lv+getFishSizeFusionBonus())*.12);return (1+bonus)*(hasDoneFusionPair("bigFish+fishSize")?1.18:1);}
const level=(fusedBaseLevels[key]||0)+post;
return key==="shield"?Math.min(10,level):level;
}
function nextPercentValue(key){
const value=coreUpgradeStat(key,Math.min(5,fusionPostLevel(key)+1));
return Math.round((value-(["moveSpeed","fireRate","fishSpeed","damage","fishSize","xpBoost"].includes(key)?1:0))*1000)/10;
}
function percentValue(key){return getPauseActualPercent(key)}

function applyUpgradeStatsFromLevels(){
const oldSlow=Math.max(.15,1-upgrades.catSlow);
for(const key of ["maxLife","healOnWave","moveSpeed","fireRate","fishSpeed","damage","fishSize","xpBoost","catSlow","lifeSteal","luck","damageReduction"])upgrades[key]=coreUpgradeStat(key);
for(const key of ["bigFish","doubleFish","pierce","boomerang","critChance"])upgrades[key==="critChance"?key:key+"Chance"]=coreUpgradeStat(key);
upgrades.shieldLevel=effectLevel("shield");upgrades.shield=upgrades.shieldLevel>0;
upgrades.coinMagnetRange=coreUpgradeStat("coinMagnet");life=Math.min(life,upgrades.maxLife);
const slowRatio=Math.max(.15,1-upgrades.catSlow)/oldSlow;
if(slowRatio!==1)cats.forEach(cat=>{cat.speed*=slowRatio;if(Number.isFinite(cat.baseSpeed))cat.baseSpeed*=slowRatio;});
}

function isPercentLimitedKey(key){return ["luck","damageReduction","moveSpeed","fireRate","fishSpeed","bigFish","doubleFish","pierce","damage","catSlow","fishSize","xpBoost","boomerang","omniBurst","yarnBounce","saltScales","critChance"].includes(key)}
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
  const parts=pair.split("+");
  const hasScalablePart=parts.some(k=>Object.prototype.hasOwnProperty.call(upgradeLevels,k));
  const lvl=hasScalablePart?Math.max(0,Math.min(5,Math.floor(Number(value)||0))):5;
  fusionProgressLevels[pair]=lvl;
  if(Object.prototype.hasOwnProperty.call(upgradeLevels,rep)){
    upgradeLevels[rep]=lvl;
    upgradeMaxLevels[rep]=5;
  }
  parts.forEach(k=>{
    if(k!==rep&&Object.prototype.hasOwnProperty.call(upgradeLevels,k)){
      upgradeLevels[k]=0;
      upgradeMaxLevels[k]=5;
    }
  });
  registerFusionAchievements();
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
    previewLevel:true,
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
      if(pair.split("+").includes("maxLife"))life=Math.min(upgrades.maxLife,life+34);
    }
  }
}
const meta=UPGRADE_META[key];
return {previewLevel:true,icon:meta.icon,key,title:makeUpgradeTitle(key),levelTag:(isPercentLimitedKey(key)&&nextLevel(key)>=upgradeMaxLevels[key])?"DEF":`${upgradeLevels[key]+1}/${upgradeMaxLevels[key]}`,desc:upgradeDesc(key),apply:()=>{if(isUpgradeFinal(key)||upgradeLevels[key]>=upgradeMaxLevels[key])return;upgradeLevels[key]++;applyUpgradeStatsFromLevels();if(key==="maxLife")life=Math.min(upgrades.maxLife,life+34)}}
}

function getUpgradePool(){
const arr=getLevelUpgradeKeys().map(k=>makeLevelUpgrade(k));
if(!upgrades.aimAssist)arr.push({key:"aimAssist",icon:"🎯",title:"Peces listillos",levelTag:"1/1",desc:getUpgradeDisplayDesc("aimAssist",1),apply:()=>{upgrades.aimAssist=true}});
if(!upgrades.bigCursor)arr.push({key:"bigCursor",icon:"🌈",title:"Mirilla brillante",levelTag:"1/1",desc:getUpgradeDisplayDesc("bigCursor",1),apply:()=>{upgrades.bigCursor=true}});
if(!upgrades.moralSupport)arr.push({key:"moralSupport",icon:"💛",title:"Apoyo Moral",levelTag:"1/1",desc:getUpgradeDisplayDesc("moralSupport",1),special:true,apply:()=>{upgrades.moralSupport=true}});
if(!upgrades.darkPact)arr.push({key:"darkPact",icon:"🖤",title:"Voluntad Oscura",levelTag:"1/1",desc:getUpgradeDisplayDesc("darkPact",1),dark:true,apply:()=>{upgrades.darkPact=true}});
if(!upgrades.catInstinct)arr.push({key:"catInstinct",icon:"🥷",title:"Instinto gatuno",levelTag:"1/1",desc:getUpgradeDisplayDesc("catInstinct",1),special:true,apply:()=>{upgrades.catInstinct=true}});
if(!upgrades.zoomies)arr.push({key:"zoomies",icon:"💨",title:"Zoomies",levelTag:"1/1",desc:getUpgradeDisplayDesc("zoomies",1),special:true,apply:()=>{upgrades.zoomies=true}});
return arr
}
function getRandomUpgradeChoices(amount){
const pool=getUpgradePool();
const choices=[];
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

function escapeHtml(str){
return String(str??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]||ch));
}
function renderPatchNotes(){
  const content=document.getElementById("patchNotesContent");
  const count=document.getElementById("patchNotesCount");
  const notes=Array.isArray(window.PATCH_NOTES)?window.PATCH_NOTES:[];
  if(count)count.textContent=`${notes.length} hitos`;
  if(!content)return;
  if(!notes.length){
    content.innerHTML='<div class="patchNoteEntry"><div class="patchNoteTitle">No hay notas todavía.</div></div>';
    return;
  }
  const renderEntry=(note,index)=>{
    const changes=Array.isArray(note.changes)?note.changes:[];
    const list=changes.map(change=>`<li>${escapeHtml(change)}</li>`).join("");
    const versions=Array.isArray(note.includedVersions)?note.includedVersions:[];
    const sources=versions.length>1?`<details class="patchNoteSources"><summary>Actualizaciones agrupadas (${versions.length})</summary><div>${escapeHtml(versions.map(v=>v.replace(/^v\./,"v")).join(" · "))}</div></details>`:"";
    const label=String(note.version||"v???").replace(/^v\./,"v");
    const date=index<7?`<div class="patchNoteDate">${escapeHtml(note.date||"")}</div>`:"";
    return `<article class="patchNoteEntry ${index===0?"latest":""}">
      <div class="patchNoteTop"><div class="patchNoteVersion">${escapeHtml(label)}</div>${date}</div>
      <div class="patchNoteTitle">${escapeHtml(note.title||"Actualización")}</div>
      <ul>${list}</ul>
      ${sources}
    </article>`;
  };
  const recent=notes.slice(0,7).map(renderEntry).join("");
  const older=notes.slice(7);
  const archive=older.length?`<details class="patchNotesOlder"><summary>Historial anterior · ${older.length} hitos</summary><div class="patchNotesOlderEntries">${older.map((note,i)=>renderEntry(note,i+7)).join("")}</div></details>`:"";
  content.innerHTML=`<div class="patchNotesSectionTitle">Actualizaciones recientes</div>${recent}${archive}`;
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
function formatPreviewStat(key,post=fusionPostLevel(key)){
  const v=coreUpgradeStat(key,post);
  const n=x=>Number(x.toFixed(2)).toLocaleString("es-ES");
  if(["moveSpeed","fireRate","fishSpeed","damage","fishSize","xpBoost"].includes(key))return `×${n(v)}`;
  if(["bigFish","doubleFish","pierce","boomerang","critChance","catSlow","lifeSteal","yarnBounce","luck","damageReduction"].includes(key))return `${n(v*100)} %`;
  if(key==="coinMagnet")return `${n(v)} px`;
  if(key==="saltScales")return `${n(v)} daño/s · ${hasDoneFusionPair("fireRate+saltScales")?"2,8":"2,4"} s`;
  if(key==="omniBurst"){
    if(v<=0)return "Inactiva";
    const pair=getFusedPairForKey("omniBurst");
    const progress=pair==="fireRate+omniBurst"?Math.max(0,v-(fusedBaseLevels.omniBurst||0)):null;
    const power=getOmniBurstPowerMultiplier(v);
    return `${10+Math.min(14,v*2)} peces${power>1?` · ×${n(power)} potencia`:""} / ${n(getOmniBurstCooldownMs(v,progress)/1000)} s`;
  }
  if(key==="shield")return v>0?`Nivel ${n(v)}`:"Inactivo";
  return n(v);
}
function getUpgradePreviewRows(upgrade){
  if(!upgrade.previewLevel||upgrade.randomShopUpgrade||upgrade.locked)return [];
  const pair=getFusedPairForKey(upgrade.key);
  const keys=(pair?pair.split("+"):[upgrade.key]).filter(k=>Object.prototype.hasOwnProperty.call(upgradeLevels,k));
  const labels={saltScales:"Daño salino",moveSpeed:"Velocidad base",fireRate:"Cadencia base",fishSpeed:"Velocidad del pez",damage:"Daño base",fishSize:"Tamaño del pez",xpBoost:"Experiencia",bigFish:"Pez grande",doubleFish:"Pez extra",pierce:"Perforación",boomerang:"Boomerang",critChance:"Crítico",catSlow:"Ralentización",lifeSteal:"Robo de vida",yarnBounce:"Rebote",maxLife:"Vida máxima",healOnWave:"Curación por ronda",coinMagnet:"Radio del imán",omniBurst:"Ráfaga",shield:"Escudo"};
  const requestedSteps=Math.max(1,Math.floor(Number(upgrade.previewSteps)||1));
  const rows=keys.map(key=>{
    const current=fusionPostLevel(key);
    const maxStep=Math.max(0,5-current);
    const steps=Math.min(requestedSteps,maxStep);
    return {label:labels[key]||getOriginalUpgradeName(key),before:formatPreviewStat(key),after:formatPreviewStat(key,Math.min(5,current+steps))};
  });
  if(keys.includes("maxLife")){
    const current=fusionPostLevel("maxLife");
    const steps=Math.min(requestedSteps,Math.max(0,5-current));
    const next=Math.min(5,current+steps);
    const healed=Math.min(coreUpgradeStat("maxLife",next),life+34*steps);
    rows.push({label:"Tu vida al elegirla",before:String(Math.round(life)),after:String(Math.round(healed))});
  }
  return rows;
}
function buildChoicePreviewHTML(upgrade){
  if(upgrade.first){
    return "";
  }
  const rows=getUpgradePreviewRows(upgrade);
  if(!rows.length)return "";
  return `<div class="choicePreview"><span class="previewHeading">Ahora → Al elegir</span>${rows.map(r=>`<span class="previewRow"><span>${escapeHtml(r.label)}</span><strong>${escapeHtml(r.before)} → ${escapeHtml(r.after)}</strong></span>`).join("")}</div>`;
}
function getUpgradeVisualGroup(upgrade){
  if(upgrade?.fusion)return "fusion";
  if(upgrade?.skipShop||upgrade?.randomShopUpgrade||upgrade?.openFusionShop)return "utility";
  const key=String(upgrade?.key||"");
  const groups={
    attack:new Set(["damage","critChance","fireRate","saltScales","omniBurst","doubleFish"]),
    arsenal:new Set(["fishSpeed","bigFish","pierce","fishSize","boomerang","yarnBounce","aimAssist"]),
    survival:new Set(["damageReduction","maxLife","catSlow","healOnWave","lifeSteal","shield","catInstinct"]),
    utility:new Set(["moveSpeed","luck","coinMagnet","xpBoost","bigCursor","moralSupport","darkPact","zoomies"])
  };
  for(const [name,set] of Object.entries(groups))if(set.has(key))return name;
  return "utility";
}
function getUpgradeVisualGroupLabel(group){
  return group==="attack"?"⚔️ ATAQUE":group==="arsenal"?"🐟 ARSENAL":group==="survival"?"🛡️ SUPERVIVENCIA":group==="fusion"?"🔮 FUSIÓN":"✨ UTILIDAD";
}
function buildVisualLevelDots(upgrade){
  const raw=String(upgrade?.levelTag||"").trim();
  const m=raw.match(/(\d+)\s*\/\s*(\d+)/);
  if(!m)return "";
  const current=Math.max(0,Number(m[1])||0),max=Math.max(1,Math.min(10,Number(m[2])||5));
  if(max>5)return "";
  return `<div class="visualLevelDots" aria-label="Nivel ${current} de ${max}">${Array.from({length:max},(_,i)=>`<span class="${i<current?"filled":""}"></span>`).join("")}</div>`;
}
function getVisualActionLabel(upgrade,context){
  if(upgrade?.locked)return "BLOQUEADO";
  if(upgrade?.skipShop)return "SALIR";
  if(upgrade?.openFusionShop)return "ABRIR FUSIONES";
  if(context==="shop")return "COMPRAR";
  if(context==="fusionFirst"||context==="fusionPartner"||upgrade?.fusion)return "ELEGIR";
  return "ELEGIR";
}
function buildUpgradeCardHTML(upgrade,context="generic"){
const visualGroup=getUpgradeVisualGroup(upgrade);
let desc=String(upgrade.desc||"");
let bonus="";
const m=desc.match(/^(.*?)(?:\s*Bonus de fusión:\s*)(.*)$/i);
if(m){desc=m[1].trim();bonus="Bonus de fusión: "+m[2].trim();}
const iconText=String(upgrade.icon||"✨").trim();
const iconParts=iconText.split(/\s+/).filter(Boolean);
const isComboIcon=iconParts.length>1;
const iconHTML=isComboIcon?iconParts.slice(0,2).map(i=>`<span class="miniIcon">${escapeHtml(i)}</span>`).join(""):escapeHtml(iconText);
const showTypeTag=!(upgrade?.randomShopUpgrade||upgrade?.skipShop);
const priceExtra=upgrade?.priceMeta?`<small class="upgradePriceMeta">${escapeHtml(upgrade.priceMeta)}</small>`:"";
const recommendationMark=upgrade.recommended?`<span class="recommendThumb" aria-hidden="true">👍</span>`:"";
return `${showTypeTag?`<div class="visualTypeTag visualType-${visualGroup}">${getUpgradeVisualGroupLabel(visualGroup)}</div>`:""}<div class="upgradeCardTop"><div class="upgradeIconBubble${isComboIcon?" comboIconBubble":""}">${iconHTML}</div><div class="upgradeBadges">${Number.isFinite(upgrade.price)?`<span class="upgradePrice" aria-label="${upgrade.price} monedas">🪙 ${upgrade.price}${priceExtra}</span>`:""}</div></div><div class="upgradeTitle">${escapeHtml(upgrade.title)}</div>${buildVisualLevelDots(upgrade)}<div class="upgradeDesc">${desc?`<span class="upgradeDescMain">${formatCardText(desc)}</span>`:""}${bonus?`<span class="upgradeFusionBonus">${formatCardText(bonus)}</span>`:""}${upgrade.lockReason?`<span class="upgradeLockedReason">🔒 ${formatCardText(upgrade.lockReason)}</span>`:""}</div>${buildChoicePreviewHTML(upgrade)}<span class="visualChooseButton">${getVisualActionLabel(upgrade,context)}${recommendationMark}</span>`;
}
function showCards(title,phrase,subtitle,choices,onPick,onBack,context="generic"){
choices=applyRecommendationsToChoices(choices,context);
if(context==="fusionFirst"||context==="fusionPartner"){
  choices=[...choices].sort((a,b)=>Number(!!b.recommended)-Number(!!a.recommended)||
    (a.recommended&&b.recommended?(Number(b.recommendScore)||0)-(Number(a.recommendScore)||0):0));
}
const pick=onPick;
let resolved=false;
onPick=upgrade=>{
  if(resolved||!choosingUpgrade||gameOver||upgrade?.locked)return;
  resolved=true;
  pick(upgrade);
  processPendingUpgradeQueue();
  checkGameCompletion();
  syncMusic();
};
choosingUpgrade=true;
clearAllInputKeys();
syncMusic();
releaseGamePointer();
canvas.style.cursor="crosshair";
document.body.style.cursor="auto";
levelUpPanel.style.display="flex";upgradeCards.innerHTML="";
const oldCoinBadge=levelUpBox.querySelector(".shopCoinBadge");
if(oldCoinBadge)oldCoinBadge.remove();
levelUpBox.classList.toggle("shopMode",context==="shop");
levelUpBox.classList.toggle("fusionMode",context==="fusionFirst"||context==="fusionPartner");
upgradeTitle.textContent=title;levelUpPhrase.textContent=phrase;levelUpPhrase.hidden=!phrase;upgradeSubtitle.textContent=subtitle;upgradeSubtitle.hidden=!subtitle;
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
const fusionTopControls=document.getElementById("fusionTopControls");
const fusionTopPages=document.getElementById("fusionTopPages");
const isFusionChoice=context==="fusionFirst"||context==="fusionPartner";
fusionTopControls.hidden=!isFusionChoice;
fusionTopPages.replaceChildren();
const unlockAt=performance.now()+800;
const pageSize=9;
const shouldPaginate=isFusionChoice&&choices.length>pageSize;
let currentPage=0;
const totalPages=Math.max(1,Math.ceil(choices.length/pageSize));
function renderCardList(){
  levelUpBox.scrollTop=0;
  upgradeCards.innerHTML="";
  fusionTopPages.replaceChildren();
  const isShopLayout=context==="shop";
  upgradeCards.classList.toggle("shopSplitRows",isShopLayout);
  const shopUpgradeRow=isShopLayout?document.createElement("div"):null;
  const shopActionRow=isShopLayout?document.createElement("div"):null;
  if(isShopLayout){
    shopUpgradeRow.className="shopUpgradeRow";
    shopUpgradeRow.setAttribute("role","group");
    shopUpgradeRow.setAttribute("aria-label","Mejoras de la tienda");
    shopActionRow.className="shopActionRow";
    shopActionRow.setAttribute("role","group");
    shopActionRow.setAttribute("aria-label","Acciones de la tienda");
  }
  const visible=shouldPaginate?choices.slice(currentPage*pageSize,currentPage*pageSize+pageSize):choices;
  visible.forEach(upgrade=>{
    const card=document.createElement("button");
    let visualClass=getOfferTierClass(upgrade);
    const _uniqueClassMap={aimAssist:" aimAssistUpgrade",bigCursor:" bigCursorUpgrade",catInstinct:" catInstinctUpgrade",zoomies:" zoomiesUpgrade",moralSupport:" apoyoMoralUpgrade",darkPact:" voluntadOscuraUpgrade"};
    const _uniqueClass=upgrade.key&&!upgrade.fusion?(_uniqueClassMap[upgrade.key]||""):"";
    card.className="upgradeCard "+visualClass+(upgrade.fusion?" fusionCard":"")+(_uniqueClass||((upgrade.special&&!upgrade.fusion?" specialUpgrade":"")+(upgrade.dark?" darkUpgrade":"")))+(upgrade.easter?" easterUpgrade":"")+(upgrade.locked?" locked":"");
    card.dataset.visualGroup=getUpgradeVisualGroup(upgrade);
    card.innerHTML=buildUpgradeCardHTML(upgrade,context);
    if(upgrade.locked)card.disabled=true;
    else card.addEventListener("click",()=>{
      if(performance.now()<unlockAt)return;
      onPick(upgrade);checkGameCompletion();
    });
    if(isShopLayout){
      if(upgrade.openFusionShop||upgrade.randomShopUpgrade||upgrade.skipShop){
        card.dataset.shopRole=upgrade.openFusionShop?"fusion":upgrade.randomShopUpgrade?"surprise":"exit";
        shopActionRow.appendChild(card);
      }else{
        shopUpgradeRow.appendChild(card);
      }
    }else upgradeCards.appendChild(card);
  });
  if(isShopLayout){
    if(shopUpgradeRow.childElementCount)upgradeCards.appendChild(shopUpgradeRow);
    upgradeCards.appendChild(shopActionRow);
  }
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
    fusionTopPages.appendChild(nav);
  }
}
renderCardList();
autoRegisterChoiceMenu(choices,onPick,context);
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
showFloatingText({x:player.x,y:player.y-70,text:`+${amount} monedas ${reason}`,life:1.4,maxLife:1.4,big:false});
updateHud();
maybeOpenShopOrFusion();
}

function openUpgradeMenu(reason="level",opts={}){
releaseGamePointer();
const darkWave=reason==="wave"&&upgrades.darkPact;
const choices=darkWave?getRandomScalableUpgradeChoices(1):getRandomUpgradeChoices(3);
if(darkWave){
  choices.forEach(upgrade=>{
    if(!upgrade.key)return;
    const pair=getFusedPairForKey(upgrade.key);
    if(pair){
      const current=getFusionProgress(pair);
      const target=Math.min(5,current+2);
      upgrade.previewSteps=target-current;
      const [a,b]=pair.split("+");
      upgrade.title=`${getFusionNameFromPair(a,b)} Nv.${target}`;
      upgrade.levelTag=`${target}/5`;
      return;
    }
    if(Object.prototype.hasOwnProperty.call(upgradeLevels,upgrade.key)){
      const max=upgradeMaxLevels[upgrade.key]||5;
      const current=upgradeLevels[upgrade.key]||0;
      const target=Math.min(max,current+2);
      upgrade.previewSteps=target-current;
      upgrade.title=`${getUpgradeDisplayName(upgrade.key)} ${target>=max?"DEFINITIVA":`Nv.${target}`}`;
      upgrade.levelTag=`${target}/${max}`;
    }
  });
}
if(choices.length===0||allDirectUpgradesMaxed()){
if(reason==="wave"&&waveUpgradePending){waveUpgradePending=false;recordNoDamageRoundIfClean();wave++;
thiefCoinsStolenThisWave=0;life=Math.min(upgrades.maxLife,life+upgrades.healOnWave);startWave()}
giveLevelCoins("por tener mejoras al máximo");
if(pendingUpgradeQueue.length)processPendingUpgradeQueue();
return
}
showCards(reason==="wave"?"🌊 ¡Ronda superada!":"⭐ ¡Subiste de nivel!",darkWave?"🖤 La Voluntad Oscura elige por ti":lovePhrases[Math.floor(Math.random()*lovePhrases.length)],darkWave?"":"Elige una mejora gatuna",choices,upgrade=>{
upgrade.apply();
if(darkWave){let bonusCoins=1+Math.floor(Math.random()*5);if(hasDoneFusionPair("coinMagnet+darkPact")){const fp=getFusionProgress("coinMagnet+darkPact");bonusCoins+=2+Math.floor(Math.random()*(3+fp));}coins+=bonusCoins;showFloatingText({x:player.x,y:player.y-105,text:`🖤 +${bonusCoins} monedas`,life:1.3,maxLife:1.3,big:false})}
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
  if(doubled)showFloatingText({x:player.x,y:player.y-85,text:upgrade.fusion?"🖤 +2 niveles de fusión":"🖤 +2 niveles",life:1.4,maxLife:1.4,big:false})
}
choosingUpgrade=false;levelUpPanel.style.display="none";canvas.style.cursor=upgrades.bigCursor?"none":"crosshair";
syncGamePointerLock();
showFloatingText({x:player.x,y:player.y-55,text:upgrade.title,life:1.5,maxLife:1.5,big:false});

if(reason==="wave"&&waveUpgradePending){waveUpgradePending=false;recordNoDamageRoundIfClean();wave++;life=Math.min(upgrades.maxLife,life+upgrades.healOnWave);startWave()}
updateHud();
if(pendingUpgradeQueue.length)processPendingUpgradeQueue();else maybeOpenShopOrFusion()
},null,reason==="wave"?"wave":"level")
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
const shopNeeds=getRecommendationNeeds("shop");

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

  if(lvl>=max-1&&hasUsefulFusionPath(key))score+=1000;

  if(hasCompatibleAlmostReady(key))score+=420;

  if(fusedUpgradeNames[key])score+=360-lvl*20;

  if(lvl===0)score+=260;
  score+=(max-lvl)*35;

  const suitability=scoreRecommendationChoice({key},shopNeeds,"shop");
  if(suitability>=0)score+=Math.min(380,suitability*460);
  score+=Math.random()*26;
  return score;
}

const bestByGroup=new Map();
keys.forEach(k=>{
  const g=groupKey(k);
  const entry={key:k,score:scoreKey(k)};
  if(!bestByGroup.has(g)||entry.score>bestByGroup.get(g).score)bestByGroup.set(g,entry);
});

const ranked=[...bestByGroup.values()].sort((a,b)=>b.score-a.score);
if(life<upgrades.maxLife*.42){
  const rescueKeys=["maxLife","damageReduction","shield","lifeSteal","catSlow"];
  const alreadyVisible=ranked.slice(0,Math.min(3,amount)).some(entry=>rescueKeys.includes(entry.key));
  if(!alreadyVisible){
    const rescue=ranked.filter(entry=>rescueKeys.includes(entry.key))
      .sort((a,b)=>rescueKeys.indexOf(a.key)-rescueKeys.indexOf(b.key))[0];
    if(rescue){ranked.splice(ranked.indexOf(rescue),1);ranked.unshift(rescue);}
  }
}
return ranked.slice(0,amount).map(entry=>makeLevelUpgrade(entry.key,true));
}

function maybeOpenShopOrFusion(){
if(updatingWorld||pendingUpgradeQueue.length||bossVictoryPending||choosingUpgrade||gameOver||!gameStarted||paused)return;
if(finalCompletionContinue||isGameCompleted()){shopBossPending=false;shopAvailable=false;fusionAvailable=false;return;}
if(canFuse()&&!fusionAvailable){fusionAvailable=true;showFloatingText({x:player.x,y:player.y-70,text:"🔮 Fusión disponible",life:1.4,maxLife:1.4,big:false,important:true})}
if(shopBossPending&&!shopAvailable){shopBossPending=false;startShopSession()}
}

function getShopUpgradePrice(){return 1+shopUpgradePurchases}
function getShopFusionPrice(){return 5+shopFusionPurchases*3}
function hasPendingShopFusionPair(){
  const keys=getMaxedFusionKeys();
  return keys.some((a,i)=>keys.slice(i+1).some(b=>isFusionChoiceCompletionSafe(a,b)));
}
function isFusionOnlyShopDiscountActive(){
  return getShopEligibleUpgradeKeys().length===0&&hasPendingShopFusionPair();
}
function getEffectiveShopFusionPrice(){
  const normal=getShopFusionPrice();
  return isFusionOnlyShopDiscountActive()?Math.max(1,Math.ceil(normal/2)):normal;
}
function startShopSession(){shopAvailable=true;openCoinShop()}
function closeShopSession(){shopAvailable=false;choosingUpgrade=false;levelUpPanel.style.display="none";syncGamePointerLock();updateHud()}

function getFusionLockReason(cost=getEffectiveShopFusionPrice()){
const keys=getMaxedFusionKeys();
const hasPair=keys.some((a,i)=>keys.slice(i+1).some(b=>isFusionChoiceCompletionSafe(a,b)));
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
priceMeta:"+1/compra",
locked:coins<upgradePrice,
originalDesc:u.desc,
levelTag:u.levelTag||"",
 desc:u.desc
}));
const fusionChoice={price:fusionPrice,priceMeta:"+3/fusión",icon:"🔮",title:"Fusión de mejoras",levelTag:"",desc:canFuse(fusionPrice)?`Disponible: fusiona 2 mejoras compatibles.`:getFusionLockReason(fusionPrice),special:true,fusion:true,openFusionShop:true,locked:!canFuse(fusionPrice)};
const randomUpgrade=getRandomShopUpgradeChoice(upgradeChoices);
const randomPrice=Math.max(1,Math.ceil(upgradePrice/2));
const randomChoice=randomUpgrade?{
  icon:"🎲",
  title:"Mejora aleatoria",
  price:randomPrice,
  levelTag:"",
  desc:"Sorpresa",
  special:true,
  randomShopUpgrade:true,
  hiddenUpgrade:randomUpgrade,
  locked:coins<randomPrice
}:null;
const choices=[...upgradeChoices,fusionChoice];
if(randomChoice)choices.push(randomChoice);
choices.push({icon:"🚪",title:"Salir de la tienda",levelTag:"",desc:"Cierra la tienda y conserva las monedas que te queden.",special:true,skipShop:true});
showCards("🪙 Tienda de gatitos","","",choices,upgrade=>{
if(upgrade.skipShop){closeShopSession();return}
if(upgrade.openFusionShop){openFusionChoice(fusionPrice);return}
if(upgrade.randomShopUpgrade){
  if(coins<randomPrice){openCoinShop();return}
  const hidden=upgrade.hiddenUpgrade;
  if(!hidden||typeof hidden.apply!=="function"){openCoinShop();return}
  coins-=randomPrice;registerShopCoinsSpent(randomPrice);shopUpgradePurchases++;
  hidden.apply();playShopBuySound();
  showFloatingText({x:player.x,y:player.y-65,text:`🎲 Sorpresa: ${hidden.title}`,life:1.3,maxLife:1.3,big:false});
  updateHud();checkGameCompletion();
  if(isGameCompleted())return;
  openCoinShop();
  levelUpPhrase.textContent=`🎲 Has recibido: ${hidden.title}`;levelUpPhrase.hidden=false;
  return;
}
if(coins<upgradePrice){openCoinShop();return}
coins-=upgradePrice;registerShopCoinsSpent(upgradePrice);shopUpgradePurchases++;
upgrade.apply();playShopBuySound();
showFloatingText({x:player.x,y:player.y-65,text:`Comprado por ${upgradePrice}🪙: ${upgrade.title}`,life:1.3,maxLife:1.3,big:false});
updateHud();checkGameCompletion();
if(isGameCompleted())return;
openCoinShop();
},null,"shop")
}

const uniqueFusionKeys=["aimAssist","bigCursor","moralSupport","darkPact","catInstinct","zoomies"];
const uniqueFusionMeta={
aimAssist:{icon:"🎯",name:"Peces listillos",desc:"Los peces corrigen su trayectoria hacia enemigos cercanos."},
bigCursor:{icon:"🌈",name:"Mirilla brillante",desc:"Hace la mirilla más visible y facilita marcar objetivos."},
moralSupport:{icon:"💛",name:"Apoyo Moral",desc:"Tu novio te anima de vez en cuando durante la partida."},
darkPact:{icon:"🖤",name:"Voluntad Oscura",desc:"Reduce las opciones de mejora, pero aumenta el poder de tu progreso."},
catInstinct:{icon:"🥷",name:"Instinto gatuno",desc:"Activa una defensa de emergencia cuando tienes poca vida."},
zoomies:{icon:"💨",name:"Zoomies",desc:"Activa períodos de mayor velocidad y un 35 % más de daño."}
};

const fusionPairs={
damageReduction:["maxLife","healOnWave","shield","lifeSteal","luck"],luck:["coinMagnet","xpBoost","damage","critChance","healOnWave"],
aimAssist:["bigCursor", "catInstinct", "damage", "pierce", "fishSpeed", "boomerang", "critChance"],
bigCursor:["aimAssist", "moralSupport", "damage", "pierce", "critChance", "fishSize", "boomerang"],
bigFish:["damage", "doubleFish", "fireRate", "fishSize", "pierce", "yarnBounce"],
boomerang:["critChance", "doubleFish", "fireRate", "fishSpeed", "omniBurst", "pierce", "yarnBounce", "bigCursor", "catInstinct", "saltScales"],
catInstinct:["aimAssist", "darkPact", "moralSupport", "zoomies", "shield", "maxLife", "catSlow", "moveSpeed", "healOnWave", "coinMagnet", "boomerang", "omniBurst"],
catSlow:["coinMagnet", "fishSize", "maxLife", "moveSpeed", "shield", "saltScales"],
coinMagnet:["catSlow", "healOnWave", "moveSpeed", "xpBoost", "catInstinct", "darkPact"],
critChance:["damage", "doubleFish", "zoomies"],
damage:["bigFish", "doubleFish", "lifeSteal", "omniBurst", "pierce", "shield", "yarnBounce", "critChance", "saltScales"],
darkPact:["catInstinct", "moralSupport", "damage", "critChance", "lifeSteal", "xpBoost", "omniBurst", "coinMagnet"],
doubleFish:["bigFish", "boomerang", "damage", "fireRate", "omniBurst", "yarnBounce", "critChance"],
fireRate:["bigFish", "boomerang", "doubleFish", "fishSpeed", "omniBurst", "zoomies", "saltScales"],
fishSize:["bigFish", "catSlow", "pierce", "shield", "yarnBounce"],
fishSpeed:["boomerang", "fireRate", "omniBurst", "pierce", "yarnBounce"],
healOnWave:["coinMagnet", "lifeSteal", "maxLife", "xpBoost"],
lifeSteal:["damage", "healOnWave", "maxLife", "shield", "saltScales"],
maxLife:["catSlow", "healOnWave", "lifeSteal", "shield"],
moralSupport:["bigCursor", "catInstinct", "darkPact", "maxLife", "healOnWave", "xpBoost", "moveSpeed"],
moveSpeed:["catSlow", "coinMagnet", "xpBoost", "zoomies"],
omniBurst:["boomerang", "damage", "doubleFish", "fireRate", "fishSpeed", "xpBoost", "yarnBounce", "catInstinct", "saltScales"],
pierce:["bigFish", "boomerang", "damage", "fishSize", "fishSpeed", "yarnBounce"],
shield:["catInstinct", "catSlow", "damage", "fishSize", "lifeSteal", "maxLife"],
xpBoost:["coinMagnet", "healOnWave", "moveSpeed", "omniBurst"],
zoomies:["moveSpeed", "fireRate", "critChance", "fishSpeed", "doubleFish", "boomerang", "catInstinct"],
saltScales:["damage", "fireRate", "boomerang", "catSlow", "lifeSteal", "omniBurst"],
yarnBounce:["bigFish", "boomerang", "damage", "doubleFish", "fishSize", "fishSpeed", "omniBurst", "pierce"]
};

const fusionNameMap={
"damage+saltScales":"Salmuera concentrada",
"fireRate+saltScales":"Lluvia salada",
"boomerang+saltScales":"Escamas de retorno",
"catSlow+saltScales":"Salmuera helada",
"lifeSteal+saltScales":"Sabor a vida",
"omniBurst+saltScales":"Tormenta salina",
"damageReduction+shield":"Coraza orbital",
"damageReduction+lifeSteal":"Ronroneo de hierro",
"damageReduction+luck":"Amuleto protector",
"damage+luck":"Golpe de fortuna",
"critChance+luck":"Siete de la suerte",
"healOnWave+luck":"Sushi de la fortuna",
"damageReduction+maxLife":"Fortaleza de peluche",
"damageReduction+healOnWave":"Descanso blindado",
"coinMagnet+luck":"Tesoro felino",
"luck+xpBoost":"Aprendiz afortunado",
"damage+pierce":"Mimos devastadores",
"bigFish+damage":"Golpe crítico gatuno",
"damage+doubleFish":"Doble destrucción",
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
"moveSpeed+zoomies":"Hiperactividad",
"fireRate+zoomies":"Modo cañón",
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
"catInstinct+zoomies":"Huida felina",
"fishSpeed+zoomies":"Peces hiperactivos",
"doubleFish+zoomies":"Banco hiperactivo",
"boomerang+zoomies":"Boomerang frenético",
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
"damage+saltScales":"La sal causa un 20 % más de daño continuo, sin acumularse con impactos repetidos.",
"fireRate+saltScales":"La cadencia mejora y la sal dura 0,4 segundos más.",
"boomerang+saltScales":"Los boomerangs dejan una sal un 20 % más intensa; el efecto se renueva al volver a impactar.",
"catSlow+saltScales":"Los gatos afectados por la sal se mueven un 8 % más lento, además de la ralentización normal.",
"lifeSteal+saltScales":"El daño salino recupera un 12 % de la vida que quita realmente.",
"omniBurst+saltScales":"Los peces de las ráfagas aplican sal un 15 % más intensa.",
"damage+pierce":"Peces fuertes que atraviesan enemigos.",
"bigFish+damage":"Peces grandes con golpes brutales.",
"damage+doubleFish":"Más peces y más daño por disparo.",
"doubleFish+fireRate":"Más disparos y más peces.",
"fireRate+fishSpeed":"Peces rápidos y mucha cadencia.",
"boomerang+fireRate":"Más boomerangs en pantalla.",
"fishSpeed+pierce":"Peces rápidos que atraviesan.",
"boomerang+fishSpeed":"Boomerangs más veloces.",
"boomerang+pierce":"Aumenta tanto el retorno de peces como su probabilidad de perforar.",
"boomerang+doubleFish":"Más boomerangs a la vez.",
"damage+lifeSteal":"Pegar fuerte también cura.",
"lifeSteal+maxLife":"Más vida y más curación.",
"healOnWave+lifeSteal":"Te curas entre rondas y peleando.",
"healOnWave+maxLife":"Más vida y mejor descanso.",
"catSlow+shield":"Enemigos lentos y escudo útil.",
"fishSize+shield":"Peces mayores y escudo reforzado.",
"damage+shield":"El escudo también pega.",
"coinMagnet+xpBoost":"Recoges y subes más rápido.",
"catInstinct+coinMagnet":"El instinto atrae recursos.",
"bigCursor+boomerang":"Boomerangs más guiados.",
"boomerang+catInstinct":"El instinto redirige boomerangs.",
"catInstinct+omniBurst":"El instinto lanza una ráfaga.",
"coinMagnet+darkPact":"Pacto oscuro más codicioso.",
"healOnWave+xpBoost":"Progresas y te recuperas mejor.",
"coinMagnet+moveSpeed":"Corres y recoges mejor.",
"fireRate+omniBurst":"Más cadencia y ráfagas.",
"damage+omniBurst":"Ráfagas más destructivas.",
"boomerang+omniBurst":"Combina boomerangs recurrentes con ráfagas periódicas.",
"aimAssist+bigCursor":"Puntería mucho más guiada.",
"bigCursor+moralSupport":"Mejor reacción en apuros.",
"darkPact+moralSupport":"Tu perro te acompaña y puede salvarte.",
"boomerang+yarnBounce":"Dos trayectorias posibles: retorno boomerang y rebote de ovillo.",
"pierce+yarnBounce":"Atraviesan y rebotan.",
"fishSpeed+yarnBounce":"Rebotes más rápidos.",
"doubleFish+yarnBounce":"Más peces, más rebotes.",
"bigFish+yarnBounce":"Peces grandes que rebotan.",
"fishSize+yarnBounce":"Peces grandes con rebote.",
"omniBurst+yarnBounce":"Ráfagas con rebotes.",
"damage+yarnBounce":"Rebotes más dolorosos.",
"aimAssist+catInstinct":"Instinto con respuesta guiada.",
"catInstinct+moralSupport":"Tu instinto te cuida más.",
"catInstinct+darkPact":"Instinto oscuro y agresivo.",
"catInstinct+maxLife":"Si quedas casi sin vida, te protege unos segundos.",
"critChance+damage":"Críticos más dolorosos.",
"critChance+doubleFish":"Más peces con críticos.",
"moveSpeed+zoomies":"Zoomies más rápidos.",
"fireRate+zoomies":"Zoomies con mucha cadencia.",
"critChance+zoomies":"Zoomies con más críticos.",
"catInstinct+zoomies":"Zoomies e instintos más agudos. Ojo: te recoloca.",
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
"damage+pierce":"Peces fuertes que atraviesan enemigos.",
"bigFish+damage":"Peces grandes con golpes brutales.",
"damage+doubleFish":"Más peces y más daño por disparo.",
"doubleFish+fireRate":"Más disparos y más peces.",
"fireRate+fishSpeed":"Peces rápidos y mucha cadencia.",
"boomerang+fireRate":"Más boomerangs en pantalla.",
"fishSpeed+pierce":"Peces rápidos que atraviesan.",
"boomerang+fishSpeed":"Boomerangs más veloces.",
"boomerang+pierce":"Boomerangs que atraviesan.",
"boomerang+doubleFish":"Más boomerangs a la vez.",
"damage+lifeSteal":"Pegar fuerte también cura.",
"lifeSteal+maxLife":"Más vida y más curación.",
"healOnWave+lifeSteal":"Te curas entre rondas y peleando.",
"healOnWave+maxLife":"Más vida y mejor descanso.",
"catSlow+shield":"Enemigos lentos y escudo útil.",
"fishSize+shield":"Peces mayores y escudo reforzado.",
"damage+shield":"El escudo también pega.",
"coinMagnet+xpBoost":"Recoges y subes más rápido.",
"catInstinct+coinMagnet":"El instinto atrae recursos.",
"bigCursor+boomerang":"Boomerangs más guiados.",
"boomerang+catInstinct":"El instinto redirige boomerangs.",
"catInstinct+omniBurst":"El instinto lanza una ráfaga.",
"coinMagnet+darkPact":"Pacto oscuro más codicioso.",
"healOnWave+xpBoost":"Progresas y te recuperas mejor.",
"coinMagnet+moveSpeed":"Corres y recoges mejor.",
"fireRate+omniBurst":"Más cadencia y ráfagas.",
"damage+omniBurst":"Ráfagas más destructivas.",
"boomerang+omniBurst":"Presión circular constante.",
"aimAssist+bigCursor":"Puntería mucho más guiada.",
"bigCursor+moralSupport":"Mejor reacción en apuros.",
"darkPact+moralSupport":"Tu perro te acompaña y puede salvarte.",
"boomerang+yarnBounce":"Vuelven y rebotan.",
"pierce+yarnBounce":"Atraviesan y rebotan.",
"fishSpeed+yarnBounce":"Rebotes más rápidos.",
"doubleFish+yarnBounce":"Más peces, más rebotes.",
"bigFish+yarnBounce":"Peces grandes que rebotan.",
"fishSize+yarnBounce":"Peces grandes con rebote.",
"omniBurst+yarnBounce":"Ráfagas con rebotes.",
"damage+yarnBounce":"Rebotes más dolorosos.",
"aimAssist+catInstinct":"Instinto con respuesta guiada.",
"catInstinct+moralSupport":"Tu instinto te cuida más.",
"catInstinct+darkPact":"Instinto oscuro y agresivo.",
"critChance+damage":"Críticos más dolorosos.",
"critChance+doubleFish":"Más peces con críticos.",
"moveSpeed+zoomies":"Zoomies más rápidos.",
"fireRate+zoomies":"Zoomies con mucha cadencia.",
"critChance+zoomies":"Zoomies con más críticos.",
"catInstinct+zoomies":"Zoomies e instintos más agudos. Ojo: te recoloca.",
"aimAssist+damage":"Los disparos guiados pegan más.",
"aimAssist+pierce":"El guiado facilita acertar con peces perforantes.",
"aimAssist+fishSpeed":"Peces rápidos y guiados.",
"aimAssist+boomerang":"Los boomerangs corrigen mejor su ruta.",
"aimAssist+critChance":"El guiado facilita acertar y la probabilidad crítica aumenta.",
"bigCursor+damage":"Marcas mejor al objetivo y pegas más.",
"bigCursor+pierce":"Mirilla ampliada y más posibilidades de atravesar enemigos.",
"bigCursor+critChance":"Mirilla visible y mayor probabilidad de crítico.",
"bigCursor+fishSize":"Mirilla ampliada para apuntar con peces de mayor tamaño.",
"healOnWave+moralSupport":"Te recuperas mejor entre rondas.",
"moralSupport+xpBoost":"Con ánimo se aprende mejor.",
"moralSupport+moveSpeed":"Te mueves con más confianza.",
"damage+darkPact":"Daño fuerte con poder oscuro.",
"critChance+darkPact":"Críticos más peligrosos.",
"darkPact+lifeSteal":"El pacto roba vida.",
"darkPact+xpBoost":"El pacto acelera tu progreso.",
"darkPact+omniBurst":"Voluntad Oscura y ráfagas periódicas en la misma combinación.",
"catInstinct+maxLife":"Si quedas casi sin vida, te protege unos segundos.",
"catInstinct+catSlow":"Tu instinto frena la presión enemiga.",
"catInstinct+moveSpeed":"Reaccionas y huyes mejor.",
"catInstinct+healOnWave":"Instinto defensivo con recuperación.",
"fishSpeed+zoomies":"Los peces también entran en zoomies.",
"doubleFish+zoomies":"Más peces durante el caos.",
"boomerang+zoomies":"Boomerangs más locos y rápidos.",
"bigFish+doubleFish":"A veces dispara dos peces grandes extra.",
"bigFish+fireRate":"Más peces grandes, más presión.",
"bigFish+fishSize":"Peces mucho más grandes. Muy raramente aparece EL GRAN PEZ y causa daño masivo a todos los enemigos.",
"bigFish+pierce":"Combina apariciones de peces gigantes con la probabilidad de perforación.",
"catInstinct+shield":"A veces reduce un golpe y empuja enemigos.",
"catSlow+coinMagnet":"Los enemigos sueltan más monedas.",
"catSlow+fishSize":"Peces de mayor tamaño mientras los gatos se mueven más despacio.",
"catSlow+maxLife":"Ralentizas más y aguantas mejor.",
"catSlow+moveSpeed":"Te mueves rápido mientras ellos van lentos.",
"coinMagnet+healOnWave":"Las monedas también curan un poco.",
"doubleFish+omniBurst":"Más peces y más caos alrededor.",
"fishSize+pierce":"Peces grandes que perforan.",
"fishSpeed+omniBurst":"Ráfagas mucho más rápidas.",
"lifeSteal+shield":"El escudo cura al golpear.",
"maxLife+moralSupport":"Más aguante gracias al apoyo.",
"maxLife+shield":"Vida y defensa muy reforzadas.",
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

Object.assign(fusionEffectDescMap,{
"damageReduction+shield":"Al recibir daño, repele enemigos cercanos. El empuje aumenta de 160 a 300 y el enfriamiento baja de 8 a 5 segundos al mejorar la fusión.",
"damageReduction+lifeSteal":"Con menos de la mitad de vida, refuerza el robo de vida entre un 10 % y un 50 % adicional según el nivel de fusión.",
"damageReduction+luck":"Al terminar la estrella, conserva invulnerabilidad de 0,8 a 2,5 segundos según el nivel de fusión.",
"damage+luck":"Los disparos tienen entre un 8 % y un 20 % de probabilidad de causar un 25 % de daño extra, según el nivel de fusión.",
"critChance+luck":"Aumenta el multiplicador de los críticos normales de ×2,1 a ×2,4 al mejorar la fusión.",
"healOnWave+luck":"Cada moneda recogida cura entre 2 y 6 puntos de vida según el nivel de fusión.",
"damageReduction+maxLife":"Más vida máxima y resistencia al daño.",
"damageReduction+healOnWave":"Protección durante el combate y recuperación al pasar de ronda.",
"coinMagnet+luck":"Atraes monedas a mayor distancia y aprovechas tu suerte.",
"luck+xpBoost":"La suerte acompaña a tu progreso de experiencia."
});
for(const pair of ["damageReduction+shield","damageReduction+lifeSteal","damageReduction+luck","damage+luck","critChance+luck","healOnWave+luck","damageReduction+maxLife","damageReduction+healOnWave","coinMagnet+luck","luck+xpBoost"])fusionShortDescMap[pair]=fusionEffectDescMap[pair];
fusionNameMap["boomerang+critChance"]="Retorno crítico";
fusionShortDescMap["boomerang+critChance"]="Los peces y Bloquito combinan boomerang y crítico (amarillo, hasta el 75 %). Un impacto que tenga ambos atributos genera una onda dorada limitada a 3 gatos cercanos cada 0,55 segundos.";
fusionEffectDescMap["boomerang+critChance"]=fusionShortDescMap["boomerang+critChance"];
fusionEffectDescMap["catSlow+saltScales"]="Salmuera helada: cuando un gato afectado directamente por la sal muere, puede contagiar una sal debilitada a un máximo de 3 gatos cercanos. Los contagios no se propagan de nuevo.";
for(const pair of ["damage+saltScales","fireRate+saltScales","boomerang+saltScales","catSlow+saltScales","lifeSteal+saltScales","omniBurst+saltScales"])fusionShortDescMap[pair]=fusionEffectDescMap[pair];
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
const fusionReadableDescMap={
  "damage+saltScales": "La sal inflige un 20 % más de daño continuo. Los impactos renuevan su duración, sin acumular el daño.",
  "fireRate+saltScales": "Disparas más rápido y la sal dura 2,8 s. Los impactos renuevan el efecto, sin acumularlo.",
  "boomerang+saltScales": "Los boomerangs aplican sal un 20 % más intensa. Al volver a impactar, renuevan su duración.",
  "catSlow+saltScales": "La sal ralentiza otro 8 %. Si un gato muere con sal directa, contagia sal debilitada a un máximo de 3 gatos; no se propaga otra vez.",
  "lifeSteal+saltScales": "El daño continuo de la sal también te cura un 12 % del daño que causa realmente.",
  "omniBurst+saltScales": "Los peces de las ráfagas aplican sal un 15 % más intensa. Los impactos renuevan el efecto.",
  "damageReduction+shield": "El escudo te protege y, al recibir daño, repele a los enemigos cercanos. Al mejorar la fusión, empuja más y se recarga antes.",
  "damageReduction+lifeSteal": "Recibes menos daño y recuperas vida al atacar. Con menos de media vida, el robo de vida aumenta hasta un 50 % adicional.",
  "damageReduction+luck": "Recibes menos daño y tienes más suerte. Tras agotarse la estrella, conservas entre 0,8 y 2,5 s de invulnerabilidad.",
  "damage+luck": "Haces más daño y tienes más suerte. Entre el 8 % y el 20 % de los disparos infligen un 25 % de daño extra.",
  "critChance+luck": "Aumentan tu suerte y los críticos. El multiplicador crítico progresa de ×2,1 a ×2,4.",
  "healOnWave+luck": "Recuperas vida al terminar rondas. Cada moneda recogida también te cura entre 2 y 6 puntos.",
  "damageReduction+maxLife": "Aumentan tu vida máxima y tu resistencia. Al fusionar, también recuperas vida.",
  "damageReduction+healOnWave": "Recibes menos daño y recuperas más vida al superar cada ronda.",
  "coinMagnet+luck": "Atraes monedas desde más lejos y aumentas la suerte y la posibilidad de duplicarlas.",
  "luck+xpBoost": "Ganas más experiencia y tienes más suerte, con mayor frecuencia de eventos raros.",
  "damage+pierce": "Los peces hacen más daño y atraviesan enemigos. Los perforantes obtienen hasta un 25 % de daño adicional.",
  "bigFish+damage": "Lanzas peces gigantes con más daño. Los gigantes infligen entre un 10 % y un 35 % de daño adicional.",
  "damage+doubleFish": "Disparas peces laterales extra con más daño. Su bonificación progresa hasta un 35 %.",
  "doubleFish+fireRate": "Disparas más rápido y tienes más probabilidades de lanzar dos peces laterales extra.",
  "fireRate+fishSpeed": "Disparas con mayor cadencia y los peces vuelan más rápido. La fusión añade hasta un 16 % de velocidad.",
  "boomerang+fireRate": "Disparas más rápido y lanzas más peces que regresan hacia ti.",
  "fishSpeed+pierce": "Los peces vuelan más rápido y atraviesan enemigos. Los perforantes ganan hasta un 28 % de velocidad.",
  "boomerang+fishSpeed": "Los boomerangs regresan y vuelan más rápido, facilitando que vuelvan a impactar.",
  "boomerang+pierce": "Los peces pueden regresar o atravesar enemigos. Ambas probabilidades mejoran al subir la fusión.",
  "boomerang+doubleFish": "Lanzas peces laterales y más boomerangs. Los boomerangs laterales ganan hasta un 20 % de daño.",
  "damage+lifeSteal": "Tus peces hacen más daño y recuperas una parte del daño que infligen.",
  "lifeSteal+maxLife": "Aumenta tu vida máxima y recuperas más vida al golpear enemigos.",
  "healOnWave+lifeSteal": "Recuperas vida al golpear enemigos y al superar cada ronda.",
  "healOnWave+maxLife": "Aumenta tu vida máxima y recuperas más vida al terminar cada ronda.",
  "catSlow+shield": "Los enemigos se acercan más despacio mientras tus peces guardianes giran y los golpean.",
  "fishSize+shield": "Tus peces son más grandes y el escudo gana hasta 9 px de radio de impacto.",
  "damage+shield": "Tus peces infligen más daño y el escudo golpea a los enemigos que se acercan.",
  "coinMagnet+xpBoost": "Atraes monedas desde más lejos y ganas más experiencia. Cada moneda recogida también concede experiencia.",
  "catInstinct+coinMagnet": "Al activarse el instinto, atraes monedas y latas desde una zona ampliada.",
  "bigCursor+boomerang": "La mirilla marca mejor al objetivo y los boomerangs corrigen su regreso hacia él.",
  "boomerang+catInstinct": "Cuando se activa el instinto, redirige los boomerangs activos hacia enemigos cercanos.",
  "catInstinct+omniBurst": "Al activarse el instinto, disparas una ráfaga circular defensiva.",
  "coinMagnet+darkPact": "Atraes monedas desde más lejos. Voluntad Oscura también te concede monedas adicionales.",
  "healOnWave+xpBoost": "Ganas más experiencia y recuperas vida al superar cada ronda.",
  "coinMagnet+moveSpeed": "Te mueves más rápido y atraes monedas desde una distancia mayor.",
  "fireRate+omniBurst": "Disparas más rápido y las ráfagas circulares se recargan hasta un 22 % antes.",
  "damage+omniBurst": "Tus peces hacen más daño. Cada pez de la ráfaga obtiene hasta un 40 % de daño adicional.",
  "boomerang+omniBurst": "Combinas ráfagas circulares periódicas con peces que pueden regresar.",
  "aimAssist+bigCursor": "La mirilla marca objetivos y los peces reciben un guiado más preciso hacia ellos.",
  "bigCursor+moralSupport": "La mirilla es más visible y el apoyo moral aumenta tu daño cuando te queda poca vida.",
  "darkPact+moralSupport": "Invocas al perro protector, que ataca y puede salvarte una vez. El Demonio será el siguiente jefe.",
  "boomerang+yarnBounce": "Los peces pueden regresar como boomerangs o rebotar hacia otro enemigo.",
  "pierce+yarnBounce": "Los peces pueden atravesar enemigos y rebotar hacia otros objetivos.",
  "fishSpeed+yarnBounce": "Los peces vuelan más rápido y pueden rebotar hacia otro enemigo.",
  "doubleFish+yarnBounce": "Puedes disparar dos peces laterales extra; cada uno puede rebotar hacia otro enemigo.",
  "bigFish+yarnBounce": "Los peces gigantes pueden rebotar hacia otro enemigo después de impactar.",
  "fishSize+yarnBounce": "Los peces son más grandes y pueden rebotar hacia otro enemigo.",
  "omniBurst+yarnBounce": "Las ráfagas circulares lanzan peces que también pueden rebotar hacia otros enemigos.",
  "damage+yarnBounce": "Tus peces hacen más daño y pueden rebotar hacia otro enemigo.",
  "aimAssist+catInstinct": "Los peces corrigen su trayectoria. El instinto activa una respuesta defensiva guiada al estar en peligro.",
  "catInstinct+moralSupport": "El apoyo moral acompaña a tu defensa de emergencia. Puedes activar el instinto dos veces por ronda.",
  "catInstinct+darkPact": "El instinto te protege en peligro y aumenta el daño cuando te queda poca vida.",
  "critChance+damage": "Tus peces hacen más daño y los críticos son más potentes. Su multiplicador gana hasta ×0,30.",
  "critChance+doubleFish": "Los peces laterales pueden causar críticos. Sus críticos ganan hasta un 20 % de daño.",
  "moveSpeed+zoomies": "Te mueves más rápido y los períodos de Zoomies aumentan todavía más tu velocidad.",
  "fireRate+zoomies": "Disparas más rápido y Zoomies activa una bonificación especial de cadencia.",
  "critChance+zoomies": "Aumenta tu probabilidad crítica. Durante Zoomies, consigues aún más críticos.",
  "catInstinct+zoomies": "El instinto te protege cuando estás en peligro y permite una recolocación de emergencia durante Zoomies.",
  "aimAssist+damage": "Los peces se guían hacia enemigos cercanos e infligen más daño.",
  "aimAssist+pierce": "Los peces corrigen su trayectoria y tienen más probabilidades de atravesar enemigos.",
  "aimAssist+fishSpeed": "Los peces vuelan más rápido y corrigen su trayectoria hacia enemigos cercanos.",
  "aimAssist+boomerang": "Los boomerangs corrigen su trayectoria hacia enemigos cercanos durante el vuelo y el regreso.",
  "aimAssist+critChance": "Los peces se guían hacia enemigos cercanos y tienen mayor probabilidad de causar críticos.",
  "bigCursor+damage": "La mirilla facilita marcar objetivos y tus peces hacen más daño.",
  "bigCursor+pierce": "La mirilla es más visible y los peces tienen mayor probabilidad de atravesar enemigos.",
  "bigCursor+critChance": "La mirilla facilita apuntar y los peces tienen mayor probabilidad de causar críticos.",
  "bigCursor+fishSize": "La mirilla es más visible y los peces son más grandes, con mayor área de impacto.",
  "healOnWave+moralSupport": "El apoyo moral te acompaña y recuperas más vida al superar rondas.",
  "moralSupport+xpBoost": "El apoyo moral te acompaña y ganas más experiencia.",
  "moralSupport+moveSpeed": "El apoyo moral te acompaña y te mueves más rápido.",
  "damage+darkPact": "Voluntad Oscura reduce las opciones, pero potencia tu progreso. Tus peces infligen más daño.",
  "critChance+darkPact": "Voluntad Oscura reduce las opciones, pero potencia tu progreso y tus golpes críticos.",
  "darkPact+lifeSteal": "Voluntad Oscura potencia tu progreso y recuperas vida al infligir daño.",
  "darkPact+xpBoost": "Voluntad Oscura reduce las opciones, pero potencia tu progreso y la experiencia que ganas.",
  "darkPact+omniBurst": "Voluntad Oscura potencia tu progreso y conservas las ráfagas circulares periódicas.",
  "catInstinct+maxLife": "Tienes más vida máxima. Si te queda muy poca vida, el instinto activa una protección temporal de emergencia.",
  "catInstinct+catSlow": "Los enemigos se mueven más despacio y el instinto te protege cuando estás en peligro.",
  "catInstinct+moveSpeed": "Te mueves más rápido y el instinto activa una defensa cuando te queda poca vida.",
  "catInstinct+healOnWave": "El instinto te protege cuando estás en peligro y recuperas vida al superar rondas.",
  "fishSpeed+zoomies": "Los peces vuelan más rápido y Zoomies aumenta temporalmente tu velocidad y daño.",
  "doubleFish+zoomies": "Puedes lanzar dos peces laterales extra. Zoomies aumenta temporalmente tu velocidad y daño.",
  "boomerang+zoomies": "Los boomerangs regresan y Zoomies aumenta temporalmente tu velocidad y daño.",
  "bigFish+doubleFish": "Puedes disparar dos peces gigantes extra, con una probabilidad limitada.",
  "bigFish+fireRate": "Disparas más rápido y tienes más probabilidades de lanzar peces gigantes.",
  "bigFish+fishSize": "Tus peces crecen y puedes invocar al Leviatán, un pez gigante que atraviesa enemigos y los aparta al aparecer.",
  "bigFish+pierce": "Puedes lanzar peces gigantes y tus disparos tienen más probabilidades de atravesar enemigos.",
  "catInstinct+shield": "Los peces guardianes te protegen. El instinto puede absorber un golpe y empujar enemigos cercanos.",
  "catSlow+coinMagnet": "Los enemigos se mueven más despacio y tienen más probabilidades de soltar monedas, que atraes desde lejos.",
  "catSlow+fishSize": "Tus peces son más grandes y los enemigos se acercan más despacio.",
  "catSlow+maxLife": "Aumenta tu vida máxima y reduce la velocidad de los enemigos.",
  "catSlow+moveSpeed": "Te mueves más rápido mientras los enemigos se desplazan más despacio.",
  "coinMagnet+healOnWave": "Atraes monedas desde más lejos. Recogerlas también te cura un poco y recuperas vida al superar rondas.",
  "doubleFish+omniBurst": "Puedes disparar dos peces laterales extra y lanzar ráfagas circulares periódicas.",
  "fishSize+pierce": "Tus peces son más grandes y tienen más probabilidades de atravesar enemigos.",
  "fishSpeed+omniBurst": "Los peces de las ráfagas circulares viajan un 35 % más rápido.",
  "lifeSteal+shield": "Los peces guardianes golpean enemigos y sus impactos también te recuperan vida.",
  "maxLife+moralSupport": "Aumenta tu vida máxima y conservas el apoyo moral durante la partida.",
  "maxLife+shield": "Aumenta tu vida máxima y el escudo gana hasta un 28 % de daño al golpear enemigos.",
  "moveSpeed+xpBoost": "Te mueves más rápido y ganas experiencia periódicamente al desplazarte.",
  "omniBurst+xpBoost": "Lanzas ráfagas circulares periódicas. Cada ráfaga también te concede experiencia.",
  "boomerang+critChance": "Los peces y Bloquito pueden ser boomerangs y críticos a la vez (máx. 75 %). Los impactos dobles crean una onda que alcanza hasta 3 gatos cada 0,55 s."
};

function addFusionLevelBonus(key,amount=1){
  if(!Object.prototype.hasOwnProperty.call(upgradeLevels,key))return;
  fusedBaseLevels[key]=(fusedBaseLevels[key]||0)+amount;
}
function getFusionBonusKeys(pair){
  const keys=[];
  if(pair.split("+").includes("damage"))keys.push("damage");
  if(pair.split("+").includes("fireRate"))keys.push("fireRate");
  if(pair.split("+").includes("fishSpeed")||pair.split("+").includes("boomerang"))keys.push("fishSpeed");
  if(pair.split("+").includes("doubleFish"))keys.push("doubleFish");
  if(pair.split("+").includes("pierce"))keys.push("pierce");
  if(pair.split("+").includes("bigFish")||pair.split("+").includes("fishSize"))keys.push("fishSize");
  if(pair.split("+").includes("shield"))keys.push("shield");
  if(pair.split("+").includes("lifeSteal"))keys.push("lifeSteal");
  if(pair.split("+").includes("maxLife"))keys.push("maxLife");
  if(pair.split("+").includes("healOnWave"))keys.push("healOnWave");
  if(pair.split("+").includes("moveSpeed")||pair.split("+").includes("zoomies"))keys.push("moveSpeed");
  if(pair.split("+").includes("xpBoost"))keys.push("xpBoost");
  if(pair.split("+").includes("coinMagnet"))keys.push("coinMagnet");
  if(pair.split("+").includes("catSlow"))keys.push("catSlow");
  if(pair.split("+").includes("omniBurst"))keys.push("omniBurst");
  if(pair.split("+").includes("yarnBounce"))keys.push("yarnBounce");
  if(pair.split("+").includes("critChance"))keys.push("critChance");
  if(pair.split("+").includes("saltScales"))keys.push("saltScales");
  return keys;
}
function applyFusionBonus(pair,a,b){
  upgrades.fusionBonusPower=(upgrades.fusionBonusPower||0)+1;
  getFusionBonusKeys(pair).forEach(k=>addFusionLevelBonus(k,1));
  if(pair.includes("maxLife"))life=Math.min(upgrades.maxLife+40,life+35);
  if(pair.includes("healOnWave"))life=Math.min(upgrades.maxLife,life+25);
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
 if(pair==="darkPact+moralSupport"){
   if(upgrades.boyfriendDogReturned)return "El perro ha vuelto: ataca y puede salvarte otra vez.";
   if(upgrades.boyfriendDogSpirit)return "El perro ya te salvó una vez. Su espíritu sigue contigo.";
 }
 return fusionReadableDescMap[pair]||FUSION_BY_PAIR[pair]?.shortDesc||"Efectos de ambas mejoras combinados.";
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

function getAllFusionKeys(){
  return [...Object.keys(upgradeLevels),...uniqueFusionKeys];
}
function getUnfusedFusionKeys(){
  return getAllFusionKeys().filter(k=>!getFusedPairForKey(k));
}
function canPerfectMatchFusionKeys(keys){
  const start=[...new Set(keys)].filter(Boolean).sort();
  if(start.length%2!==0)return false;
  const memo=new Map();
  function solve(remaining){
    if(remaining.length===0)return true;
    const sig=remaining.join("|");
    if(memo.has(sig))return memo.get(sig);
    let first=null,partners=null;
    for(const k of remaining){
      const ps=remaining.filter(other=>other!==k&&areFusionCompatible(k,other));
      if(partners===null||ps.length<partners.length){first=k;partners=ps;}
    }
    if(partners.length===0){memo.set(sig,false);return false;}
    for(const partner of partners){
      const next=remaining.filter(k=>k!==first&&k!==partner);
      if(solve(next)){memo.set(sig,true);return true;}
    }
    memo.set(sig,false);return false;
  }
  return solve(start);
}
function isFusionChoiceCompletionSafe(a,b){
  if(!a||!b||a===b||!areFusionCompatible(a,b)||hasFusionBeenDone(a,b))return false;
  if(getFusedPairForKey(a)||getFusedPairForKey(b))return false;
  const remaining=getUnfusedFusionKeys().filter(k=>k!==a&&k!==b);
  return canPerfectMatchFusionKeys(remaining);
}
function hasPendingFusionPairs(){
  const keys=[...getFusableScalableKeys(),...getFusableUniqueKeys()];
  return keys.some((a,i)=>keys.slice(i+1).some(b=>isFusionChoiceCompletionSafe(a,b)))
}

const HS_KEY="gatitos_peces_hs";
function getHighScore(){return safeCount(gameStorage.getItem(HS_KEY))}
function saveHighScore(s){gameStorage.setItem(HS_KEY,String(s))}
function checkAndSaveRecord(total){
if(window.coopTest?.inRun)return false;
const prev=getHighScore();
if(total>prev){saveHighScore(total);return true;}
return false;
}

function computeFinalScore(){
const bossBonus=defeatedBossTypes.size*3500;
const completionBonus=defeatedBossTypes.size===BOSS_TYPES.length?25000:0;
const efficiencyBonus=defeatedBossTypes.size===BOSS_TYPES.length?Math.max(0,Math.floor((65-Math.min(wave,65))*120)):0;
const wavePoints=wave*150;
const levelPoints=level*250;
const killPoints=score*50;
const impactCount=runStats?Math.floor(runStats.fishHits||0):0;
const fishBonus=Math.floor(impactCount*0.6);
const total=wavePoints+levelPoints+killPoints+fishBonus+bossBonus+completionBonus+efficiencyBonus;
let rank,rankEmoji,rankMsg;
if(total>=65000&&defeatedBossTypes.size>=BOSS_TYPES.length){rank="S";rankEmoji="🌟";rankMsg="¡Rango S! Eres una leyenda gatuna"}
else if(total>=35000){rank="A";rankEmoji="⭐";rankMsg="¡Rango A! Muy impresionante"}
else if(total>=16000){rank="B";rankEmoji="💫";rankMsg="¡Rango B! Buen trabajo"}
else if(total>=6000){rank="C";rankEmoji="🐾";rankMsg="Rango C — sigue practicando"}
else{rank="D";rankEmoji="🐱";rankMsg="Rango D — ¡inténtalo de nuevo!"}
return{total,rank,rankEmoji,rankMsg,wavePoints,levelPoints,killPoints,fishBonus,impactCount,bossBonus,completionBonus,efficiencyBonus};
}
function buildScoreRowContent(r,totalLabel="PUNTUACIÓN TOTAL"){
return `
${r.completionBonus>0?`<div class="sRow"><span>🏆 Victoria completa</span><span>+${r.completionBonus.toLocaleString()}</span></div>`:""}
${r.efficiencyBonus>0?`<div class="sRow"><span>⚡ Eficiencia (ronda ${wave})</span><span>+${r.efficiencyBonus.toLocaleString()}</span></div>`:""}
<div class="sRow"><span>💀 Jefes derrotados</span><span>${defeatedBossTypes.size}/${BOSS_TYPES.length} jefes: +${r.bossBonus.toLocaleString()}</span></div>
<div class="sRow"><span>🌊 Rondas superadas</span><span>Ronda ${wave}: +${r.wavePoints.toLocaleString()}</span></div>
<div class="sRow"><span>⭐ Nivel alcanzado</span><span>Nivel ${level}: +${r.levelPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🐱 Gatitos mimados</span><span>${score} gatitos: +${r.killPoints.toLocaleString()}</span></div>
<div class="sRow"><span>🎯 Impactos</span><span>${r.impactCount||0} impactos: +${r.fishBonus.toLocaleString()}</span></div>
<div class="sRow"><span>${totalLabel}</span><span>${r.total.toLocaleString()}</span></div>`;
}
function showGameOverScreen(voluntary=false){
document.getElementById("gameOverTitle").textContent=voluntary?"🐾 Partida finalizada":"💔 Fin de la partida";
const r=computeFinalScore();
const scalesGained=earnScalesFromScore(r);
registerFinalScoreAchievement(r);saveAchievements();
const isRecord=checkAndSaveRecord(r.total);
const prevBest=isRecord?r.total:getHighScore();
gameOverRankEmojiEl.textContent=r.rankEmoji;
gameOverRankLabelEl.textContent=`${r.rank} · ${r.rankMsg}`;
gameOverTotalEl.textContent=r.total.toLocaleString();
gameOverBreakdownEl.innerHTML=`${buildScoreRowContent(r)}
${cosmeticRewardRow(scalesGained)}
${isRecord?`<div class="sRow" style="color:#ffd166;font-size:13px">🏆 ¡Nuevo récord personal!</div>`:""}
<div class="sRow" style="color:#888;font-size:12px"><span>Mejor puntuación</span><span>${prevBest.toLocaleString()}</span></div>`;
releaseGamePointer();
gameOverPanel.style.display="flex";
autoLearnFromFinalScore(r,"gameOver");
submitOnlineScore(r,gameOverOnlineStatus,gameOverRankingList);
}
function injectVictoryScore(){
const r=computeFinalScore();
registerFinalScoreAchievement(r);saveAchievements();
const scalesGained=earnScalesFromScore(r);
const isVicRecord=checkAndSaveRecord(r.total);
const prevVicBest=isVicRecord?r.total:getHighScore();
victoryScoreAreaEl.innerHTML=`
${isVicRecord?'<div style="background:linear-gradient(90deg,#ffd166,#ff7aa8);color:#4b2636;font-size:13px;font-weight:900;padding:4px 16px;border-radius:999px;margin-bottom:6px;display:inline-block">🏆 ¡Nuevo récord personal!</div>':''}<div style="font-size:52px;margin:4px 0">${r.rankEmoji}</div>
<div style="font-size:22px;font-weight:900;color:#e67700;margin-bottom:6px">${r.rank} · ${r.rankMsg}</div>
<div style="font-size:34px;font-weight:900;color:#e67700;margin:4px 0">${r.total.toLocaleString()} <span style="font-size:14px;font-weight:400;color:#999">puntos</span></div>
<div class="victoryScore">${buildScoreRowContent(r,"TOTAL")}
${cosmeticRewardRow(scalesGained)}
</div>`;
const victoryUploadKey=getScoreIdentityKey({
  name:getPlayerName()||"Jugador",
  score:r.total,
  wave,
  level,
  bosses:defeatedBossTypes?.size||0,
  impacts:r.impactCount||0
});
if(bossVictoryScoreSaved!==victoryUploadKey){
bossVictoryScoreSaved=victoryUploadKey;
setOnlineStatus(victoryOnlineStatus,"Guardando victoria en el ranking online...","info");
autoLearnFromFinalScore(r,"victory");
submitOnlineScore(r,victoryOnlineStatus,victoryRankingList);
}else{
setOnlineStatus(victoryOnlineStatus,"Victoria registrada; comprueba si sigue pendiente de subir.","info");
retryPendingScores();
}
}

function isGameCompleted(){
const allKeys=getAllFusionKeys();
const expectedFusionCount=allKeys.length/2;
const allPaired=allKeys.length%2===0&&allKeys.every(k=>!!getFusedPairForKey(k));
const pairs=Object.keys(doneFusionPairs||{});
const allFusionMaxed=pairs.length===expectedFusionCount&&pairs.every(pair=>getFusionProgress(pair)>=5);
const allUniqueOwned=uniqueFusionKeys.every(k=>hasUniqueUpgrade(k));
const noUpgradeableLevels=getLevelUpgradeKeys().length===0;
return allPaired&&allFusionMaxed&&allUniqueOwned&&noUpgradeableLevels;
}

function getGamePhase(){
  if(finalCompletionContinue)return "endless";
  if(defeatedBossTypes&&defeatedBossTypes.size>=BOSS_TYPES.length)return "postBoss";
  return "main";
}
function getPostBossPressure(){
  if(getGamePhase()!=="postBoss")return 0;
  return Math.max(0,wave-BOSS_TYPES.length*5);
}
function getEndlessPressure(){
  if(getGamePhase()!=="endless")return 0;
  const start=Math.max(1,Math.floor(Number(finalCompletionStartWave)||wave||1));
  return Math.max(0,Math.floor(wave-start));
}
function getEndlessSpawnMultiplier(){
  const phase=getGamePhase();
  if(phase==="main")return 1;
  if(phase==="postBoss"){
    const p=getPostBossPressure();
    return Math.min(1.45,1+p*.018);
  }
  const p=getEndlessPressure();
  return Math.min(3.1,1+p*.055+Math.pow(p,1.10)*.006);
}
function getEndlessEnemyHpMultiplier(){
  const phase=getGamePhase();
  if(phase==="main")return 1;
  if(phase==="postBoss"){
    const p=getPostBossPressure();
    return Math.min(1.95,1+p*.040);
  }
  const p=getEndlessPressure();
  return Math.min(8.5,1+p*.16+Math.pow(p,1.20)*.020);
}
function getEndlessEnemySpeedMultiplier(){
  const phase=getGamePhase();
  if(phase==="main")return 1;
  if(phase==="postBoss"){
    const p=getPostBossPressure();
    return Math.min(1.28,1+p*.012);
  }
  const p=getEndlessPressure();
  return Math.min(2.35,1+p*.035+Math.pow(p,1.12)*.004);
}
function getEndlessBossMultiplier(){
  const phase=getGamePhase();
  if(phase==="main")return 1;
  if(phase==="postBoss"){
    const p=getPostBossPressure();
    return Math.min(2.15,1+p*.050);
  }
  const p=getEndlessPressure();
  return Math.min(10,1+p*.18+Math.pow(p,1.23)*.025);
}
function getProjectileCap(kind){
  if(kind==="quack")return 70;
  if(kind==="orb"||kind==="yarn")return 110;
  return Infinity;
}

function finishGame(){
releaseGamePointer();
pauseAllMusic();
choosingUpgrade=false;levelUpPanel.style.display="none";
setAchievementFlag("completeGame",{run:true});
stopPowerStarLoop();
gameOver=true;
bossVictoryAlreadyShown=true;
injectVictoryScore();
victoryPanel.style.display="flex";
playVictoryJingle();
document.querySelector("#victoryBox h1").textContent="🌟 ¡Juego completado!";
document.querySelector("#victoryBox .victoryMsg").innerHTML=`<span class="vLine vMain">Has fusionado las 28 mejoras y llevado las 14 fusiones al máximo.</span><span class="vLine vSub">Has alcanzado el poder absoluto gatuno. ✨🏆</span>`;
showFloatingText({x:canvas.width/2,y:canvas.height/2-110,text:"¡FINAL COMPLETADO!",life:4,maxLife:4,big:true,important:true})
}
function checkGameCompletion(){if(!updatingWorld&&!pendingUpgradeQueue.length&&(!choosingUpgrade||shopAvailable)&&!gameOver&&!finalCompletionContinue&&isGameCompleted())finishGame()}

function canFuse(cost=5){
const maxed=getMaxedFusionKeys();
return coins>=cost&&maxed.some((a,i)=>maxed.slice(i+1).some(b=>isFusionChoiceCompletionSafe(a,b)))
}
function openFusionChoice(cost=5){
releaseGamePointer();
if(!canFuse(cost)){openCoinShop();return}
const maxed=getMaxedFusionKeys();
const firstChoices=maxed.filter(k=>maxed.some(other=>other!==k&&isFusionChoiceCompletionSafe(k,other))).map(k=>{
const lvl=Object.prototype.hasOwnProperty.call(upgradeLevels,k)?(upgradeLevels[k]||0):1;
const normalDesc=isUniqueKey(k)?(uniqueFusionMeta[k]?.desc||"Mejora única."):getUpgradeDisplayDesc(k,Math.max(1,lvl));
return{
icon:getAnyIcon(k),
key:k,
title:getAnyName(k),
levelTag:isUniqueKey(k)?"1/1":`${upgradeLevels[k]}/${upgradeMaxLevels[k]}`,
desc:normalDesc,
special:true,
fusion:true
};
});
const backToShop=()=>{choosingUpgrade=false;levelUpPanel.style.display="none";fusionBackBtn.style.display="none";if(shopAvailable)openCoinShop()};
showCards("🔮 Fusión de mejoras","Elige la primera mejora","",firstChoices,first=>{
const allCompatibleKeys=new Set();
(fusionPairs[first.key]||[]).forEach(k=>allCompatibleKeys.add(k));
Object.keys(fusionPairs).forEach(k=>{if((fusionPairs[k]||[]).includes(first.key))allCompatibleKeys.add(k)});
uniqueFusionKeys.forEach(k=>{if(areFusionCompatible(first.key,k))allCompatibleKeys.add(k)});
allCompatibleKeys.delete(first.key);
const availableKeys=new Set(getMaxedFusionKeys());
const allPartners=[...allCompatibleKeys]
  .filter(k=>availableKeys.has(k)&&isFusionChoiceCompletionSafe(first.key,k))
  .map(k=>({
    icon:getAnyIcon(k),key:k,title:getAnyName(k),
    levelTag:isUniqueKey(k)?"1/1":`${upgradeLevels[k]||0}/${upgradeMaxLevels[k]||5}`,
    desc:`Bonus de fusión: ${getFusionDesc(first.key,k)}`,special:true,locked:false,fusion:true,
    easter:sortedPair(first.key,k)==="darkPact+moralSupport",
    first:first.key,fusionCost:cost
  }));
showCards("🔮 Fusión compatible",`Fusiones posibles con ${getAnyName(first.key)}`,"Elige una fusión.",allPartners,second=>{
if(second.locked)return;
const wasShopOpen=shopAvailable;
coins-=cost;
registerShopCoinsSpent(cost);
if(shopAvailable)shopFusionPurchases++;
const pair=sortedPair(first.key,second.key);
doneFusionPairs[pair]=true;
registerFusionAchievements();
const fusionName=getFusionNameFromPair(first.key,second.key);
if(pair==="aimAssist+bigCursor"){upgrades.perfectAim=true;showFloatingText({x:player.x,y:player.y-95,text:"🎯 Puntería perfecta",life:1.8,maxLife:1.8,big:false})}
if(pair==="bigCursor+moralSupport"){upgrades.braveHeart=true;showFloatingText({x:player.x,y:player.y-95,text:"💗 Corazón valiente",life:1.8,maxLife:1.8,big:false})}
if(pair==="aimAssist+catInstinct"){upgrades.reflexBurst=true;showFloatingText({x:player.x,y:player.y-95,text:"🐱‍👤 Reflejos perfectos",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+moralSupport"){upgrades.valorCasa=true;showFloatingText({x:player.x,y:player.y-95,text:"🏠 Valor de casa",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+darkPact"){upgrades.cursedInstinct=true;showFloatingText({x:player.x,y:player.y-95,text:"🖤 Instinto maldito",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+zoomies"){upgrades.zoomiesEscape=true;zoomiesEscapeHits=0;showFloatingText({x:player.x,y:player.y-95,text:"💨 Huida felina",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+maxLife"){upgrades.sevenLives=true;showFloatingText({x:player.x,y:player.y-95,text:"🐱 Siete vidas de gato",life:2,maxLife:2,big:false})}
if(pair==="catInstinct+coinMagnet"){showFloatingText({x:player.x,y:player.y-95,text:"🧲 Instinto recolector",life:1.8,maxLife:1.8,big:false})}
if(pair==="bigCursor+boomerang"){showFloatingText({x:player.x,y:player.y-95,text:"🪃 Retorno marcado",life:1.8,maxLife:1.8,big:false})}
if(pair==="boomerang+catInstinct"){showFloatingText({x:player.x,y:player.y-95,text:"🥷 Reflejo circular",life:1.8,maxLife:1.8,big:false})}
if(pair==="catInstinct+omniBurst"){showFloatingText({x:player.x,y:player.y-95,text:"💥 Ráfaga felina",life:1.8,maxLife:1.8,big:false})}
if(pair==="coinMagnet+darkPact"){showFloatingText({x:player.x,y:player.y-95,text:"🖤 Codicia oscura",life:1.8,maxLife:1.8,big:false})}
if(pair==="darkPact+moralSupport"){upgrades.boyfriendDog=true;upgrades.boyfriendDogSpirit=false;dogSacrificeUsed=false;forceDemonNextBoss=true;showFloatingText({x:player.x,y:player.y-95,text:"🐶 Tu novio ha hecho este juego",life:2.3,maxLife:2.3,big:false});showFloatingText({x:player.x,y:player.y-125,text:"😈 El demonio te está buscando...",life:2,maxLife:2,big:false})}
if(pair==="moveSpeed+zoomies"){upgrades.zoomiesHyper=true;showFloatingText({x:player.x,y:player.y-95,text:"🐱💨 Hiperactividad",life:1.8,maxLife:1.8,big:false})}
if(pair==="fireRate+zoomies"){upgrades.zoomiesCannon=true;showFloatingText({x:player.x,y:player.y-95,text:"🐱💨 Modo cañón",life:1.8,maxLife:1.8,big:false})}
if(pair==="critChance+zoomies"){upgrades.zoomiesCrit=true;showFloatingText({x:player.x,y:player.y-95,text:"💥 Subidón crítico",life:1.8,maxLife:1.8,big:false})}
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
showFloatingText({x:player.x,y:player.y-75,text:`🔮 ${fusionName}`,life:1.8,maxLife:1.8,big:false});
updateHud();checkGameCompletion();
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

if(!upgrades.aimAssist)pool.push({key:"aimAssist",level:0,upgrade:{key:"aimAssist",icon:"🎯",title:"Peces listillos",levelTag:"1/1",desc:getUpgradeDisplayDesc("aimAssist",1),apply:()=>{upgrades.aimAssist=true}}});
if(!upgrades.bigCursor)pool.push({key:"bigCursor",level:0,upgrade:{key:"bigCursor",icon:"🌈",title:"Mirilla brillante",levelTag:"1/1",desc:getUpgradeDisplayDesc("bigCursor",1),apply:()=>{upgrades.bigCursor=true}}});
if(!upgrades.moralSupport)pool.push({key:"moralSupport",level:0,upgrade:{key:"moralSupport",icon:"💛",title:"Apoyo Moral",levelTag:"1/1",desc:getUpgradeDisplayDesc("moralSupport",1),special:true,apply:()=>{upgrades.moralSupport=true}}});
if(!upgrades.darkPact)pool.push({key:"darkPact",level:0,upgrade:{key:"darkPact",icon:"🖤",title:"Voluntad Oscura",levelTag:"1/1",desc:getUpgradeDisplayDesc("darkPact",1),dark:true,apply:()=>{upgrades.darkPact=true}}});
if(!upgrades.catInstinct)pool.push({key:"catInstinct",level:0,upgrade:{key:"catInstinct",icon:"🥷",title:"Instinto gatuno",levelTag:"1/1",desc:getUpgradeDisplayDesc("catInstinct",1),special:true,apply:()=>{upgrades.catInstinct=true}}});
if(!upgrades.zoomies)pool.push({key:"zoomies",level:0,upgrade:{key:"zoomies",icon:"💨",title:"Zoomies",levelTag:"1/1",desc:getUpgradeDisplayDesc("zoomies",1),special:true,apply:()=>{upgrades.zoomies=true}}});

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
showFloatingText({x:player.x,y:player.y-82,text:`🌈 +${amount} monedas`,life:1.8,maxLife:1.8,big:true});
showFloatingText({x:player.x,y:player.y-48,text:"Todo está al máximo",life:1.4,maxLife:1.4,big:false});
choosingUpgrade=false;
levelUpPanel.style.display="none";
canvas.style.cursor=upgrades.bigCursor?"none":"crosshair";
syncGamePointerLock();
updateHud();

checkGameCompletion();
}

function openRainbowLowestMenu(){
const choices=getRainbowLowestChoices(3);
if(choices.length===0){
giveRainbowMaxedReward();
return;
}
showCards("🌈 ¡Gatito arcoíris!","Elige una mejora de las más bajas 💖","",choices,upgrade=>{
upgrade.apply();
choosingUpgrade=false;
levelUpPanel.style.display="none";
canvas.style.cursor=upgrades.bigCursor?"none":"crosshair";
syncGamePointerLock();
showFloatingText({x:player.x,y:player.y-65,text:"🌈 "+upgrade.title,life:1.3,maxLife:1.3,big:false});
updateHud();checkGameCompletion();
},null,"rainbow");
}

function grantFullLevel(){
syncXpRequirementPhase();
level++;
xpNeed=nextXpRequirement(xpNeed);
queueUpgradeMenus("level",1);
updateHud();
}

let xpFraction=0;
function gainXP(amount){
syncXpRequirementPhase();
if(!Number.isFinite(amount)||amount<=0)return;
const earned=amount*upgrades.xpBoost+xpFraction;
const real=Math.floor(earned+1e-9);
xpFraction=Math.max(0,earned-real);
xp+=real;
let gainedLevels=0;
while(xp>=xpNeed){xp-=xpNeed;level++;xpNeed=nextXpRequirement(xpNeed);gainedLevels++;}
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
  if(!stolen)return 0;
  cat.stolenCoins=0;
  const roll=Math.random();
  const recovered=roll<.20?stolen:roll<.70?Math.max(1,Math.floor(stolen/2)):0;
  if(!recovered)return 0;
  const bundles=Math.min(5,recovered);
  const perBundle=Math.floor(recovered/bundles);
  const remainder=recovered%bundles;
  const phase=Math.random()*Math.PI*2;
  for(let i=0;i<bundles;i++){
    const angle=phase+i*Math.PI*2/bundles;
    const radius=20+Math.random()*12;
    coinsDrops.push({x:cat.x+Math.cos(angle)*radius,y:cat.y+Math.sin(angle)*radius,
      r:11,amount:perBundle+(i<remainder?1:0),life:18,recovered:true});
  }
  return recovered;
}

function hasActiveMusicianCat(){
return cats.some(c=>c&&c.type==="musician"&&!c.dead&&isFinitePos(c));
}
function normalizeSpecialCatSpawnType(catType){
if(catType==="musician"&&(hasActiveMusicianCat()||musicianSpawnedThisWave))return "normal";
return catType;
}

function getActiveCatCap(){
  if(boss)return getGamePhase()==="endless"?70:getGamePhase()==="postBoss"?55:40;
  return avalancheActive?150:105;
}
function getBossReinforcementInterval(){
  return Math.max(getGamePhase()==="endless"?.65:.85,
    Math.max(1,1.85-wave*.025)/getEndlessSpawnMultiplier());
}
function spawnCat(x=null,y=null,small=false){
const rainbowDue=rainbowSelectedThisWave&&!rainbowSpawnedThisWave;
const spawnCap=getActiveCatCap()-(rainbowDue&&small?1:0);
if(cats.length>=spawnCap)return false;
if(x===null){
const side=Math.floor(Math.random()*4);
if(side===0){x=-50;y=Math.random()*canvas.height}else if(side===1){x=canvas.width+50;y=Math.random()*canvas.height}else if(side===2){x=Math.random()*canvas.width;y=-50}else{x=Math.random()*canvas.width;y=canvas.height+50}
}
const endlessPressure=getEndlessPressure();
const endlessHpMul=getEndlessEnemyHpMultiplier();
const endlessSpeedMul=getEndlessEnemySpeedMultiplier();
const maxHp=small?Math.max(1,Math.ceil(endlessPressure*.18)):Math.ceil((1+Math.floor(wave/3))*endlessHpMul);
const rainbow=!small&&rainbowSelectedThisWave&&!rainbowSpawnedThisWave;
if(rainbow)rainbowSpawnedThisWave=true;
let catType="normal";
if(!small&&!rainbow){
  const phase=getGamePhase();
  const specialMul=phase==="main"?.72:phase==="postBoss"?1.0:1.18;
  const visualMul=phase==="main"?.58:phase==="postBoss"?.88:1.08;
  const thiefChance=wave>=14?Math.min(phase==="main"?.10:.16,(.04+(wave-14)*.006)*specialMul):0;
  const yarnChance=wave>=10?Math.min(phase==="main"?.10:phase==="postBoss"?.15:.18,(.045+(wave-10)*.007)*visualMul):0;
  const sleepyChance=wave>=5?Math.min(phase==="main"?.10:.14,(.035+(wave-5)*.008)*specialMul):0;
  const glutChance=wave>=9?Math.min(phase==="main"?.08:.11,(.025+(wave-9)*.006)*specialMul):0;
  const musicChance=wave>=12?Math.min(phase==="main"?.055:.09,(.018+(wave-12)*.005)*visualMul):0;
  const miniChance=wave>=7?Math.min(phase==="main"?.09:.13,(.035+(wave-7)*.007)*specialMul):0;
  let acc=0,roll=Math.random();
  if(roundVariant==="invasion")roll=1;
  if(roundVariant==="specials")roll*=.75;
  if(roll<(acc+=thiefChance))catType="thief";
  else if(roll<(acc+=yarnChance))catType="yarn";
  else if(roll<(acc+=sleepyChance))catType="sleepy";
  else if(roll<(acc+=glutChance))catType="glutton";
  else if(roll<(acc+=musicChance))catType="musician";
  else if(roll<(acc+=miniChance))catType="mini";
}
catType=normalizeSpecialCatSpawnType(catType);
let color=rainbow?"rainbow":small?"#ffd6a5":["#f7b7c9","#f4c28b","#d7c1ff","#bde0fe","#caffbf"][Math.floor(Math.random()*5)];
let r=rainbow?28:(small?17:24);
let speed=(rainbow?70:(small?85:48+wave*7+Math.random()*18))*Math.max(.15,1-upgrades.catSlow)*endlessSpeedMul;
let hp=rainbow?Math.max(2,maxHp):maxHp;
if(catType==="yarn"){
  color="#b197fc";
  r=29;
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
if(roundVariant==="sprinters"&&!rainbow&&!small&&catType==="normal"){speed*=1.28;hp=Math.max(1,Math.ceil(hp*.82));}
const musicianImmune=catType==="musician"?1:0;
cats.push({x,y,r,speed,hp,maxHp:hp,damageCooldown:0,hitAnim:0,wobble:Math.random()*Math.PI*2,color,rainbow,small,type:catType,yarnCooldown:1.2+Math.random()*1.1,stealCooldown:0,fleeTimer:0,spawnAnim:.32,maxSpawnAnim:.32,sleepState:catType==="sleepy"?"sleeping":null,wakeTimer:0,rushTimer:0,sleepAwakeDuration:0,baseSpeed:speed,zigzagPhase:Math.random()*Math.PI*2,musicImmuneTimer:musicianImmune,stolenCoins:0,freezeTimer:0})
if(catType==="musician")musicianSpawnedThisWave=true;
showEnemyIntro(catType);
if(catType==="mini"){
  for(let pk=0;pk<3&&cats.length<getActiveCatCap();pk++){
    const px=x+Math.cos(Math.random()*Math.PI*2)*65;const py=y+Math.sin(Math.random()*Math.PI*2)*65;
    cats.push({x:px,y:py,r:12,speed,hp:1,maxHp:1,damageCooldown:0,hitAnim:0,wobble:Math.random()*Math.PI*2,color:"#ffb347",rainbow:false,small:false,type:"mini",yarnCooldown:999,stealCooldown:0,fleeTimer:0,spawnAnim:.32,maxSpawnAnim:.32,sleepState:null,wakeTimer:0,rushTimer:0,sleepAwakeDuration:0,baseSpeed:speed,zigzagPhase:Math.random()*Math.PI*2,musicImmuneTimer:0,stolenCoins:0,freezeTimer:0});
    makeSpawnPuff(px,py,"#ffb347");
  }
}
const spawnColor=catType==="thief"?"#ffd166":catType==="yarn"?"#b197fc":catType==="mini"?"#ffb347":catType==="sleepy"?"#c8b6e2":catType==="glutton"?"#e8956d":catType==="musician"?"#d084c8":"#ffc2d1";
makeSpawnPuff(x,y,spawnColor)
}

function collectCoinDrop(coin){
  const amount=safeCount(coin?.amount);
  if(!amount)return;
  coins+=amount;
  if(runStats)runStats.coinsCollected+=amount;
  if(hasDoneFusionPair("coinMagnet+xpBoost"))gainXP(amount*(.25+.45*fusionStrength("coinMagnet+xpBoost")));
  if(hasDoneFusionPair("healOnWave+luck"))life=Math.min(upgrades.maxLife,life+amount*(2+4*fusionStrength("healOnWave+luck")));
  if(hasDoneFusionPair("coinMagnet+healOnWave"))life=Math.min(upgrades.maxLife,life+Math.max(1,Math.round(upgrades.healOnWave*.10))*Math.max(1,safeCount(coin.pickups,1)));
}
function refundRemovedThief(cat){
  if(!cat||cat.type!=="thief")return;
  const amount=safeCount(cat.stolenCoins);
  cat.stolenCoins=0;
  coins+=amount;
}
function dropCoins(x,y,chance=.013){
chance*=1+(upgrades.luck||0);
if(bossRewardActive("duck"))chance*=1.35;
if(hasDoneFusionPair("catSlow+coinMagnet"))chance*=1.75;
if(Math.random()>chance)return;
const amount=Math.random()<(upgrades.luck||0)*.5?2:1;
if(runStats)runStats.coinsGenerated+=amount;
coinsDrops.push({x,y,r:10,amount,life:18})
}

function getSaltDamagePerSecond(fish=null){
let dps=coreUpgradeStat("saltScales");
if(hasDoneFusionPair("damage+saltScales"))dps*=1.20;
if(fish?.boomerang&&hasDoneFusionPair("boomerang+saltScales"))dps*=1.20;
if(fish?.omniBurstShot&&hasDoneFusionPair("omniBurst+saltScales"))dps*=1.15;
return Math.min(3.6,dps);
}
function applySaltEffect(target,fish){
if(!target||!isCombatTargetAvailable(target)||effectLevel("saltScales")<=0||!(fish?.damage>0))return;
const duration=2.4+(hasDoneFusionPair("fireRate+saltScales")?.4:0);
target.saltTime=Math.max(target.saltTime||0,duration);
target.saltDps=Math.max(target.saltDps||0,getSaltDamagePerSecond(fish));
target.saltInherited=false;
}
function spreadSaltOnDefeat(cat){
  if(!cat||!(cat.saltTime>0)||cat.saltInherited||!hasDoneFusionPair("catSlow+saltScales"))return;
  if(gameNow()-lastSaltSpreadAt<160)return;
  lastSaltSpreadAt=gameNow();
  const radius=88+22*fusionStrength("catSlow+saltScales");
  let affected=0;
  for(const other of cats){
    if(other===cat||!isCombatTargetAvailable(other)||other.rainbow)continue;
    const d=Math.hypot(other.x-cat.x,other.y-cat.y);
    if(d>radius)continue;
    other.saltTime=Math.max(other.saltTime||0,1.1+.45*fusionStrength("catSlow+saltScales"));
    other.saltDps=Math.max(other.saltDps||0,Math.min(1.65,(cat.saltDps||0)*.42));
    other.saltInherited=true;
    affected++;
    if(affected>=3)break;
  }
  if(affected&&!lowPerfMode&&shockwaves.length<36)shockwaves.push({x:cat.x,y:cat.y,r:8,maxR:radius,life:.32,maxLife:.32,color:"#80ed99",line:3});
}
function criticalReturnRipple(fish,x,y,primary){
  if(!fish||!fish.crit||!fish.boomerang||!hasDoneFusionPair("boomerang+critChance"))return;
  if(gameNow()-lastCriticalRippleAt<550)return;
  lastCriticalRippleAt=gameNow();
  const radius=70+30*fusionStrength("boomerang+critChance");
  const damage=Math.min(3,Math.max(.3,(fish.damage||1)*(.13+.08*fusionStrength("boomerang+critChance"))));
  let affected=0;
  for(let i=cats.length-1;i>=0;i--){
    const other=cats[i];
    if(other===primary||!isCombatTargetAvailable(other)||Math.hypot(other.x-x,other.y-y)>radius)continue;
    other.hp-=damage;
    other.hitAnim=Math.max(other.hitAnim||0,.12);
    if(other.hp<=0)killCat(i,other);
    affected++;
    if(affected>=3)break;
  }
  if(affected&&!lowPerfMode&&shockwaves.length<36)shockwaves.push({x,y,r:7,maxR:radius,life:.27,maxLife:.27,color:"#ffe066",line:3});
}
function tickSaltEffect(target,dt){
if(!target||!(target.saltTime>0)||!isCombatTargetAvailable(target))return false;
const elapsed=Math.min(Math.max(0,dt),target.saltTime);
target.saltTime=Math.max(0,target.saltTime-elapsed);
const dealt=Math.min(Math.max(0,target.hp),Math.max(0,target.saltDps||0)*elapsed);
if(dealt>0){
  let actual=dealt;
  if(target===boss){const oldHp=target.hp;damageBoss(dealt,false,true);actual=Math.max(0,oldHp-target.hp);}
  else{target.hp-=dealt;target.hitAnim=Math.max(target.hitAnim||0,.055);}
  if(hasDoneFusionPair("lifeSteal+saltScales"))life=Math.min(upgrades.maxLife,life+actual*.12);
}
if(target.saltTime<=0)target.saltDps=0;
if(target!==boss&&target.hp<=0){target.saltKill=true;const i=cats.indexOf(target);if(i>=0)killCat(i,target);return true;}
return false;
}
function damageBoss(amount,leviathanKill=false,silent=false){
if(!boss||(boss.type==="octopus"&&boss.state!=="surface"))return;
let real=boss.type==="seal"&&boss.state!=="stunned"?amount*.35:amount;
const diveThreshold=boss.type==="octopus"&&boss.dives<2?boss.maxHp*(boss.dives===0?.70:.35):0;
if(diveThreshold)real=Math.min(real,Math.max(0,boss.hp-diveThreshold));
const healthLost=Math.min(Math.max(0,boss.hp),Math.max(0,real));
if(runStats)runStats.bossDamage+=healthLost;
boss.hp-=real;boss.hitAnim=.15;
if(!silent){makeImpact(boss.x,boss.y,boss.type==="demon"?"#ff4d8d":"#ffd166",1.35);addScreenShake(boss.type==="demon"?5:3);playImpactSound();}
if(upgrades.lifeSteal>0)life=Math.min(upgrades.maxLife,life+healthLost*getCurrentLifeSteal());
if(diveThreshold&&boss.hp<=diveThreshold+1e-7){beginOctopusDive(boss);return;}
if(boss.hp<=0){
const defeatedType=boss.type;
makeSmoke(boss.x,boss.y);
playSoftPop();
dropCoins(boss.x,boss.y,1);
if(leviathanKill)guaranteedLeviathanLoot(boss.x,boss.y);

if(defeatedType==="demon"){
demonOrbs.length=0;
if(dogKidnapped){
dogKidnapped=false;
showFloatingText({x:boss.x,y:boss.y-80,text:"🐶 ¡Has recuperado a tu perro!",life:2,maxLife:2,big:true,important:true});
}else if(dogSacrificeUsed){
upgrades.boyfriendDog=true;
upgrades.boyfriendDogSpirit=false;
upgrades.boyfriendDogReturned=true;
dogSacrificeUsed=false;
showFloatingText({x:boss.x,y:boss.y-100,text:"🐶 Te dije que seguiría contigo...",life:2.6,maxLife:2.6,big:true,important:true});
showFloatingText({x:boss.x,y:boss.y-58,text:"💖 ¡El perro ha vuelto!",life:2,maxLife:2,big:false});
}else{
showFloatingText({x:boss.x,y:boss.y-80,text:"😈 ¡Has derrotado al demonio!",life:2,maxLife:2,big:true,important:true});
}
}else{
showFloatingText({x:boss.x,y:boss.y-70,text:"¡Jefe mimado!",life:1.3,maxLife:1.3,big:true});
}

score+=5;
if(!currentWaveHadDamage)addAchievementStat("flawlessBosses",1,{run:true});
giveBossReward(defeatedType,boss.x,boss.y);
defeatedBossTypes.add(defeatedType);
syncXpRequirementPhase();
if(finalCompletionContinue||isGameCompleted()){
  level++;
  xpNeed=nextXpRequirement(xpNeed);
  shopBossPending=false;
  shopAvailable=false;
  fusionAvailable=false;
  updateHud();
}else{
  grantFullLevel();
  shopBossPending=true;
}
addAchievementStat("bossesTotal",1,{run:true});
if(defeatedBossTypes.size>=BOSS_TYPES.length)setAchievementStatMax("bossesInRun",BOSS_TYPES.length,{run:true});
boss=null;
syncMusic();
collectAllMapLootAfterBoss();
cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});
const allBossTypes=BOSS_TYPES;
if(allBossTypes.every(t=>defeatedBossTypes.has(t))&&victoryPanel&&!gameOver&&!bossVictoryAlreadyShown){
  shopBossPending=false;
  shopAvailable=true;
  bossVictoryPending=true;
  processPendingUpgradeQueue();
}else{
  processPendingUpgradeQueue();
}
}
}

function isZoomiesActive(){
if(!upgrades.zoomies)return false;
if(gameNow()<forcedZoomiesUntil)return true;
const now=gameNow()/1000;
const period=upgrades.zoomiesHyper?5.2:7.2;
const active=upgrades.zoomiesHyper?2.35:1.65;
return (now%period)<active;
}
function getZoomiesDamageMultiplier(){return isZoomiesActive()?1.35:1}
function getZoomiesMoveMultiplier(){return isZoomiesActive()?(upgrades.zoomiesHyper?1.85:1.45):1}
function getZoomiesFireMultiplier(){return isZoomiesActive()?(upgrades.zoomiesCannon?2.05:1.45):1}
function getCurrentCritChance(){return Math.min(hasDoneFusionPair("boomerang+critChance")?.75:.95,upgrades.critChance+((isZoomiesActive()&&upgrades.zoomiesCrit)?0.22:0))}
function getPiercingDamageRetention(){return .72}

function hasFishSizeFusionForGiantFish(){
return !!doneFusionPairs[sortedPair("bigFish","fishSize")];
}

function resolveFishTraits(boomerang,crit){
  if(boomerang&&crit&&!hasDoneFusionPair("boomerang+critChance")){
    if(Math.random()<.5)crit=false;else boomerang=false;
  }
  return {boomerang,crit};
}
function getRamFishDamage(playerLevel=level,criticalHit=Math.random()<getCurrentCritChance()){
  const growth=Math.max(0,playerLevel-1);
  const lowLifeBonus=life<upgrades.maxLife*.35
    ?(upgrades.braveHeart ? .35 : 0)+(upgrades.cursedInstinct ? .45 : 0)
    :0;
  const critical=criticalHit?getCriticalDamageMultiplier():1;
  return upgrades.damage*getLuckyShotMultiplier()*getZoomiesDamageMultiplier()
    *(1+lowLifeBonus)*(2.8+growth*.085)*critical;
}

function launchRamFish(target=null){
  if(!gameStarted||gameOver||paused||choosingUpgrade)return false;
  const now=gameNow();
  if(now-lastManualShotAt+1e-7<MANUAL_SHOT_INTERVAL_MS)return false;
  const remaining=Math.max(0,(getRamFishCooldownMs()-(now-lastRamFishAt))/1000);
  const fullyCharged=remaining<=0;
  if(!fullyCharged&&manualShotsSinceBloquito>=MAX_MANUAL_SHOTS_PER_BLOQUITO)return false;
  const damageFraction=1/Math.max(1,remaining);
  const aim=target||mouse;
  const angle=Math.atan2(aim.y-player.y,aim.x-player.x);
  const scale=getRamFishScale()*damageFraction;
  const traits=resolveFishTraits(
    Math.random()<Math.min(.95,upgrades.boomerangChance+(hasDoneFusionPair("boomerang+doubleFish")?.04+.08*fusionStrength("boomerang+doubleFish"):0)),
    Math.random()<getCurrentCritChance());
  const {boomerang,crit}=traits;
  const boomerangLvl=effectLevel("boomerang");
  const damage=getRamFishDamage(level,crit)*damageFraction;
  const speed=710*upgrades.fishSpeed;
  fishes.push({x:player.x+Math.cos(angle)*58,y:player.y+Math.sin(angle)*58,
    vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle,damage,
    life:boomerang?3.35+boomerangLvl*.18:Math.max(2.6,Math.hypot(canvas.width,canvas.height)/speed+0.4),
    scale,pierce:true,boomerang,crit,turnTime:boomerang?.95+boomerangLvl*.06:0,
    ramFish:true,ramFullyCharged:fullyCharged,ramDamageFraction:damageFraction,ramKnockback:getRamFishKnockback()*damageFraction,
    returning:false,age:0,hitIds:new Set()});
  lastManualShotAt=now;
  if(fullyCharged){lastRamFishAt=now;manualShotsSinceBloquito=0;}
  else manualShotsSinceBloquito++;
  shots++;if(runStats)runStats.shotsFired++;addAchievementStat("shots",1,{run:true});
  player.shootAnim=.12;
  if(fullyCharged){
  makeImpact(player.x+Math.cos(angle)*55,player.y+Math.sin(angle)*55,"#80eaff",1.6);
  showFloatingText({x:player.x,y:player.y-75,text:"🐟 ¡BLOQUITO!",life:1,maxLife:1,big:true});
  }
  return true;
}
function ramFishInterceptsProjectile(projectile, projectilePrevX, projectilePrevY, ramShots){
  if(!isFinitePos(projectile)||!ramShots.length)return false;
  const p0x=Number.isFinite(projectilePrevX)?projectilePrevX:projectile.x;
  const p0y=Number.isFinite(projectilePrevY)?projectilePrevY:projectile.y;
  for(const fish of ramShots){
    if(!isFinitePos(fish)||!fish.ramFish||fish.ramFullyCharged!==true)continue;
    const f0x=Number.isFinite(fish.prevX)?fish.prevX:fish.x;
    const f0y=Number.isFinite(fish.prevY)?fish.prevY:fish.y;
    const radius=(projectile.r||12)+14*(fish.scale||1);
    const rx=f0x-p0x, ry=f0y-p0y;
    const dx=(fish.x-f0x)-(projectile.x-p0x);
    const dy=(fish.y-f0y)-(projectile.y-p0y);
    const len2=dx*dx+dy*dy;
    const t=len2>1e-8?Math.max(0,Math.min(1,-(rx*dx+ry*dy)/len2)):0;
    const closestX=rx+dx*t,closestY=ry+dy*t;
    if(closestX*closestX+closestY*closestY<=radius*radius)return true;
  }
  return false;
}
function breakProjectileWithRamFish(projectile,previousX,previousY,ramShots,color){
  if(!ramFishInterceptsProjectile(projectile,previousX,previousY,ramShots))return false;
  makeSmoke(projectile.x,projectile.y);
  if(!lowPerfMode||Math.random()<.25)makeImpact(projectile.x,projectile.y,color,.5);
  return true;
}

function guaranteedLeviathanLoot(x,y){
  const amount=Math.random()<(upgrades.luck||0)*.5?2:1;
  if(runStats)runStats.coinsGenerated+=amount;
  coinsDrops.push({x,y,r:10,amount,life:18});
  tunaDrops.push({x:x+Math.random()*18-9,y:y+Math.random()*18-9,r:16,life:16,wobble:0});
}
const LEVIATHAN_VISIBLE_SECONDS=5;
const LEVIATHAN_CENTER_TRAVEL_SECONDS=3.5;
function getLeviathanTravelSpeed(angle){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const tx=Math.abs(dx)>1e-8?(dx>0?canvas.width-player.x:player.x)/Math.abs(dx):Infinity;
  const ty=Math.abs(dy)>1e-8?(dy>0?canvas.height-player.y:player.y)/Math.abs(dy):Infinity;
  return Math.max(0,Math.min(tx,ty))/LEVIATHAN_CENTER_TRAVEL_SECONDS;
}
const LEVIATHAN_GIANT_FISH_CHANCE=0.00001;
function triggerLeviathanMassiveDamage(){
addAchievementStat("leviathanAppearances",1,{run:true});
  const leviathanPower=1+Math.max(0,level-1)*.035+Math.max(0,upgrades.damage-1)*.22;
  const baseDamage=Math.max(1,upgrades.damage*getZoomiesDamageMultiplier());
  for(let i=cats.length-1;i>=0;i--){
    const cat=cats[i];
    if(!isCombatTargetAvailable(cat))continue;
    const dealt=Math.max(cat.maxHp*(1.15+Math.min(1.2,(leviathanPower-1)*.25)),baseDamage*38*leviathanPower);
    cat.hp-=dealt;
    cat.hitAnim=.35;
    if(!lowPerfMode&&i<18)makeImpact(cat.x,cat.y,"#b197fc",.85);
    if(cat.hp<=0){cat.leviathanLoot=true;killCat(i,cat);}
  }
  if(boss&&Number.isFinite(boss.hp)&&boss.hp>0){
    const desired=Math.max(boss.maxHp*Math.min(.80,.35+Math.max(0,level-1)*.006+Math.max(0,upgrades.damage-1)*.018),baseDamage*55*leviathanPower);
    const input=boss.type==="seal"&&boss.state!=="stunned"?desired/.35:desired;
    damageBoss(input,true);
  }
  for(let i=quacks.length-1;i>=0;i--){
    const q=quacks[i];
    if(!q||!Number.isFinite(q.hp))continue;
    q.hp-=Math.max((q.maxHp||q.hp)*.90,baseDamage*20);
    if(q.hp<=0){guaranteedLeviathanLoot(q.x,q.y);try{makeSmoke(q.x,q.y)}catch(e){} quacks.splice(i,1);}
  }
  if(shockwaves.length<36)shockwaves.push({x:player.x,y:player.y,r:18,maxR:Math.max(canvas.width,canvas.height)*1.15,life:.9,maxLife:.9,color:"#b197fc",line:12});
  addScreenShake(18);
  showFloatingText({x:player.x,y:player.y-120,text:"🌊 ¡LEVIATÁN! DAÑO MASIVO",life:2.2,maxLife:2.2,big:true,important:true});
}

function getLeviathanGiantFishChance(){
  return LEVIATHAN_GIANT_FISH_CHANCE*(1+Math.max(0,Math.min(.5,upgrades.luck||0)));
}

function hasCardumenGiganteFusion(){
return !!doneFusionPairs[sortedPair("bigFish","doubleFish")];
}

function shootFish(){
const now=gameNow();
if(!gameStarted||gameOver||paused||choosingUpgrade)return;
const delay=getShotInterval();
if(now-lastShot<delay)return;
lastShot=now;shots++;if(runStats)runStats.shotsFired++;addAchievementStat("shots",1,{run:true});player.shootAnim=.12;
const rawAngle=Math.atan2(mouse.y-player.y,mouse.x-player.x),angle=rawAngle,giantFishEasterEgg=hasFishSizeFusionForGiantFish()&&Math.random()<getLeviathanGiantFishChance(),isBigFish=giantFishEasterEgg||Math.random()<upgrades.bigFishChance,fishScale=upgrades.fishSize*(giantFishEasterEgg?40.5:(isBigFish?1.65:1)),lowLifeBonus=(life<upgrades.maxLife*.35?(upgrades.braveHeart?0.35:0)+(upgrades.cursedInstinct?0.45:0):0),fishDamage=upgrades.damage*getLuckyShotMultiplier()*getZoomiesDamageMultiplier()*(1+lowLifeBonus)*(giantFishEasterEgg?60:(isBigFish?2.1*(hasDoneFusionPair("bigFish+damage")?1.10+.25*fusionStrength("bigFish+damage"):1):1)),canPierce=giantFishEasterEgg||Math.random()<upgrades.pierceChance,rolledBoomerang=!giantFishEasterEgg&&Math.random()<Math.min(.95,upgrades.boomerangChance+(hasDoneFusionPair("boomerang+doubleFish")?.04+.08*fusionStrength("boomerang+doubleFish"):0));
function addFish(offsetAngle=0,damageMultiplier=1){
const finalAngle=angle+offsetAngle;
const boomerangLvl=effectLevel("boomerang");
const traits=resolveFishTraits(rolledBoomerang,Math.random()<Math.min(.95,getCurrentCritChance()+(offsetAngle!==0&&hasDoneFusionPair("critChance+doubleFish")?.04+.10*fusionStrength("critChance+doubleFish"):0)));
const boomerang=traits.boomerang,critRoll=traits.crit;
const boomerangRangeBonus=boomerang?1+boomerangLvl*.08:1;
const piercingStrike=canPierce&&hasDoneFusionPair("damage+pierce")?1.08+.17*fusionStrength("damage+pierce"):1;
const extraFishStrike=offsetAngle!==0&&hasDoneFusionPair("damage+doubleFish")?1.10+.25*fusionStrength("damage+doubleFish"):1;
const lateralBoomerangStrike=offsetAngle!==0&&boomerang&&hasDoneFusionPair("boomerang+doubleFish")?1.08+.12*fusionStrength("boomerang+doubleFish"):1;
const lateralCritStrike=offsetAngle!==0&&critRoll&&hasDoneFusionPair("critChance+doubleFish")?1.06+.14*fusionStrength("critChance+doubleFish"):1;
const piercingVelocity=canPierce&&hasDoneFusionPair("fishSpeed+pierce")?1.08+.20*fusionStrength("fishSpeed+pierce"):1;
const burstVelocity=hasDoneFusionPair("fireRate+fishSpeed")?1.04+.12*fusionStrength("fireRate+fishSpeed"):1;
const spawnOffset=giantFishEasterEgg?0:62;
const speed=giantFishEasterEgg?getLeviathanTravelSpeed(finalAngle):610*upgrades.fishSpeed*boomerangRangeBonus*piercingVelocity*burstVelocity;
fishes.push({x:player.x+Math.cos(finalAngle)*spawnOffset,y:player.y+Math.sin(finalAngle)*spawnOffset,vx:Math.cos(finalAngle)*speed,vy:Math.sin(finalAngle)*speed,angle:finalAngle,damage:fishDamage*damageMultiplier*piercingStrike*extraFishStrike*lateralBoomerangStrike*lateralCritStrike*(bossRewardActive("demon")?1.12:1)*(critRoll?getCriticalDamageMultiplier():1),life:giantFishEasterEgg?LEVIATHAN_VISIBLE_SECONDS:(boomerang?3.35+boomerangLvl*.18:1.45),scale:fishScale,pierce:canPierce,boomerang,crit:critRoll,giantEaster:giantFishEasterEgg,returning:false,age:0,turnTime:boomerang?0.95+boomerangLvl*.06:0,hitIds:new Set()})
}
function addCardumenGiganteFish(offsetAngle){
const finalAngle=angle+offsetAngle;
const critRoll=Math.random()<getCurrentCritChance();
fishes.push({x:player.x+Math.cos(finalAngle)*66,y:player.y+Math.sin(finalAngle)*66,vx:Math.cos(finalAngle)*585*upgrades.fishSpeed,vy:Math.sin(finalAngle)*585*upgrades.fishSpeed,angle:finalAngle,damage:upgrades.damage*getZoomiesDamageMultiplier()*2.4*(critRoll?1.7+(getCriticalDamageMultiplier()-2):1),life:1.55,scale:Math.max(upgrades.fishSize*2.15,2.05),pierce:Math.random()<Math.max(.15,upgrades.pierceChance*.55),boomerang:false,crit:critRoll,cardumenGigante:true,returning:false,age:0,turnTime:0,hitIds:new Set()})
}
addFish();
if(!giantFishEasterEgg){
  const cadenceLevel=effectLevel("fireRate");
  if(cadenceLevel>=5){addFish(-.12,.26);addFish(.12,.26);}
  else if(cadenceLevel>=3){addFish(.10,.32);}
}
if(giantFishEasterEgg){
  showFloatingText({x:player.x,y:player.y-92,text:"🐟 EL GRAN PEZ",life:1.8,maxLife:1.8,big:true});
  triggerLeviathanMassiveDamage();
}
if(!giantFishEasterEgg&&Math.random()<upgrades.doubleFishChance){addFish(.14,.6);addFish(-.14,.6)}
if(!giantFishEasterEgg&&hasCardumenGiganteFusion()&&Math.random()<Math.min(.34,.16+effectLevel("bigFish")*.018+effectLevel("doubleFish")*.018)){
  addCardumenGiganteFish(.32);
  addCardumenGiganteFish(-.32);
  showFloatingText({x:player.x,y:player.y-82,text:"🐟🐟 Cardumen Gigante",life:1.05,maxLife:1.05,big:false});
  if(!lowPerfMode)shockwaves.push({x:player.x,y:player.y,r:8,maxR:95,life:.35,maxLife:.35,color:"#4cc9f0",line:4});
}
if(!lowPerfMode||Math.random()<.35)pawPrints.push({x:player.x+Math.cos(angle)*38,y:player.y+Math.sin(angle)*38,angle,life:.22,maxLife:.22});
if(Math.random()<(lowPerfMode?.08:.18)){const phrases=["glugluglu","fiuuu","ñomñom","pez vaaa","blu blu","mimitos!"],phrase=phrases[Math.floor(Math.random()*phrases.length)];playFishSound(phrase.includes("fiu")?"fiu":"bloop");showFloatingText({x:player.x+Math.cos(angle)*58,y:player.y+Math.sin(angle)*58-14,text:phrase,life:.85,maxLife:.85,big:false})}
if(upgrades.moralSupport&&Math.random()<.16)showFloatingText({x:player.x+Math.cos(angle)*75,y:player.y+Math.sin(angle)*75-38,text:lovePhrases[Math.floor(Math.random()*lovePhrases.length)],life:1.45,maxLife:1.45,big:false,moral:true})
}

function getAutomaticFireMultiplier(){
return upgrades.braveHeart&&life<upgrades.maxLife*.35?1.08:1;
}
function getShotInterval(){
const rate=Math.max(1,upgrades.fireRate)*(bossRewardActive("giantCat")?1.12:1)*getAutomaticFireMultiplier()*getZoomiesFireMultiplier();
return Math.max(110,600/rate);
}
function shootAutoFish(){shootFish();}
function shieldAttack(){
if(effectLevel("shield")<5)return;
if(Math.random()>.012)return;
let target=null,dist=Infinity;
cats.forEach(cat=>{if(!isCombatTargetAvailable(cat))return;const d=Math.hypot(cat.x-player.x,cat.y-player.y);if(d<dist){dist=d;target=cat}});
if(isCombatTargetAvailable(boss)){const d=Math.hypot(boss.x-player.x,boss.y-player.y);if(d<dist){dist=d;target=boss}}
if(!target)return;
const a=Math.atan2(target.y-player.y,target.x-player.x);
fishes.push({x:player.x+Math.cos(a)*56,y:player.y+Math.sin(a)*56,vx:Math.cos(a)*530,vy:Math.sin(a)*530,angle:a,damage:upgrades.damage*getZoomiesDamageMultiplier()*.75,life:1.2,scale:.85,pierce:false,boomerang:false,returning:false,age:0,hitIds:new Set(),shieldShot:true})
}

function applyAimAssist(fish){
if(!isFinitePos(fish))return;
const fixed=getSelectedTarget();
if((!upgrades.aimAssist&&!fish.shieldShot&&!upgrades.perfectAim&&!fixed)||cats.length===0&&!boss)return;
let nearest=null,nearestDist2=Infinity;
if(fixed&&isFinitePos(fish)){
const dx=fixed.x-fish.x,dy=fixed.y-fish.y,d2=dx*dx+dy*dy;
if(d2<1200*1200){nearest=fixed;nearestDist2=d2}
}
if(!nearest){
for(const cat of cats){
  if(!isCombatTargetAvailable(cat))continue;
  const dx=cat.x-fish.x,dy=cat.y-fish.y,d2=dx*dx+dy*dy;
  if(d2<nearestDist2){nearestDist2=d2;nearest=cat;}
}
if(isCombatTargetAvailable(boss)){const dx=boss.x-fish.x,dy=boss.y-fish.y,d2=dx*dx+dy*dy;if(d2<nearestDist2){nearestDist2=d2;nearest=boss}}
}
const assistRange=fixed?1200:(upgrades.perfectAim?720:(380));
if(nearest&&nearestDist2<assistRange*assistRange){
const desiredAngle=Math.atan2(nearest.y-fish.y,nearest.x-fish.x),currentAngle=Math.atan2(fish.vy,fish.vx);
let diff=desiredAngle-currentAngle;
while(diff>Math.PI)diff-=Math.PI*2;
while(diff<-Math.PI)diff+=Math.PI*2;
const speed=Math.hypot(fish.vx,fish.vy);
const baseTurnStrength=fixed?.14:(upgrades.perfectAim?.145:(fish.shieldShot?.075:.05));
const turnStrength=Math.min(.38,baseTurnStrength*Math.max(1,speed/610));
const newAngle=currentAngle+diff*turnStrength;
fish.vx=Math.cos(newAngle)*speed;fish.vy=Math.sin(newAngle)*speed;fish.angle=newAngle
}
}

function limitArray(array,maxItems){if(array.length>maxItems)array.splice(0,array.length-maxItems)}
function limitActiveCats(maxItems){
  if(cats.length<=maxItems)return;
  let excess=cats.length-maxItems;
  const candidates=[];
  for(let i=0;i<cats.length;i++){
    const c=cats[i];
    if(isOctopusTentacle(c)||c?.rainbow||(c?.type==="thief"&&(c.stolenCoins||0)>0))continue;
    const dx=(c?.x||0)-player.x,dy=(c?.y||0)-player.y;
    const dist2=dx*dx+dy*dy;
    candidates.push({i,priority:isCatOnScreen(c)?0:1,dist2});
  }
  candidates.sort((a,b)=>b.priority-a.priority||b.dist2-a.dist2);
  const remove=new Set(candidates.slice(0,excess).map(x=>x.i));
  let kept=0;
  for(let i=0;i<cats.length;i++)if(!remove.has(i))cats[kept++]=cats[i];
  cats.length=kept;
}

function compactLootDrops(array,maxItems,kind){
  if(array.length<=maxItems)return;
  const excess=array.length-maxItems;
  const kept=array.slice(excess);
  for(let i=0;i<excess;i++){
    const drop=array[i];
    if(!drop||!Number.isFinite(drop.x)||!Number.isFinite(drop.y))continue;
    let best=null,bestDist=Infinity;
    for(const candidate of kept){
      const dx=candidate.x-drop.x,dy=candidate.y-drop.y;
      const classPenalty=kind==="coin"&&!!candidate.recovered!==!!drop.recovered?1000000:0;
      const d=dx*dx+dy*dy+classPenalty;
      if(d<bestDist){bestDist=d;best=candidate;}
    }
    if(!best)continue;
    best.life=Math.max(best.life||0,drop.life||0);
    if(kind==="coin"){
      best.amount=(best.amount||1)+(drop.amount||1);
      best.pickups=(best.pickups||1)+(drop.pickups||1);
      best.recovered=!!(best.recovered||drop.recovered);
    }else best.stacks=(best.stacks||1)+(drop.stacks||1);
  }
  array.splice(0,array.length,...kept);
}

function limitActiveFishProjectiles(maxNormal=140){
  if(fishes.length<=maxNormal)return;
  const special=fishes.filter(f=>(f.ramFish&&f.ramFullyCharged!==false)||f.giantEaster).length;
  let excess=Math.max(0,fishes.length-maxNormal-special);
  if(!excess)return;
  const removable=[];
  for(let i=0;i<fishes.length;i++){
    const f=fishes[i];if((f.ramFish&&f.ramFullyCharged!==false)||f.giantEaster)continue;
    const priority=f.yarnBounceShot||f.shieldShot?0:f.boomerang||f.pierce?2:1;
    removable.push({index:i,priority,remaining:Math.max(0,Number(f.life)||0)});
  }
  removable.sort((a,b)=>a.priority-b.priority||a.remaining-b.remaining||a.index-b.index);
  const drop=new Set(removable.slice(0,excess).map(r=>r.index));
  for(let i=fishes.length-1;i>=0;i--)if(drop.has(i))fishes.splice(i,1);
}
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
if(!gameStarted||paused||gameOver||choosingUpgrade||!boss||boss.type!=="duck")return;
if(quacks.length>=getProjectileCap("quack"))return;
const angle=Math.atan2(player.y-boss.y,player.x-boss.x),speed=boss.quackSpeed||190+wave*8,word=Math.random()<.5?"QUACK!":"QUACK?";
quacks.push({x:boss.x+Math.cos(angle)*65,y:boss.y+Math.sin(angle)*65,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:24,life:4,text:word,hp:1+Math.max(0,boss.repeatLevel||0)})
}

function startSealJump(){
if(!boss||boss.type!=="seal")return;
const bounds=getBossArenaBounds(boss);
const tx=Math.max(bounds.minX,Math.min(bounds.maxX,player.x));
const ty=Math.max(bounds.minY,Math.min(bounds.maxY,player.y));
boss.state="jumping";
boss.jumpDuration=Math.max(1.05,(boss.baseJumpDuration||1.05)+.55+Math.random()*.22);
boss.jumpTimer=boss.jumpDuration;boss.startX=boss.x;boss.startY=boss.y;boss.targetX=tx;boss.targetY=ty;boss.shadowX=tx;boss.shadowY=ty
}

function getBossArenaBounds(entity){
  const r=Math.max(0,Number(entity?.r)||60);
  const marginX=Math.max(82,r+18), marginTop=r+44, marginBottom=r+20;
  const canFitX=canvas.width>=2*marginX;
  const canFitY=canvas.height>=marginTop+marginBottom;
  return {
    minX:canFitX?marginX:canvas.width/2,
    maxX:canFitX?canvas.width-marginX:canvas.width/2,
    minY:canFitY?marginTop:canvas.height/2,
    maxY:canFitY?canvas.height-marginBottom:canvas.height/2
  };
}
function constrainBossToArena(entity){
  if(!entity||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))return;
  const limits=getBossArenaBounds(entity);
  entity.x=Math.max(limits.minX,Math.min(limits.maxX,entity.x));
  entity.y=Math.max(limits.minY,Math.min(limits.maxY,entity.y));
  if((entity.x<=limits.minX&&(entity.knockVx||0)<0)||(entity.x>=limits.maxX&&(entity.knockVx||0)>0))entity.knockVx=0;
  if((entity.y<=limits.minY&&(entity.knockVy||0)<0)||(entity.y>=limits.maxY&&(entity.knockVy||0)>0))entity.knockVy=0;
}
window.addEventListener("resize",()=>{if(boss)constrainBossToArena(boss);});

function getOctopusGrowth(round=wave){
  const tier=Math.floor(Math.max(0,round-10)/10);
  return {size:1+Math.min(.6,tier*.08),salvo:Math.min(4,1+tier),extra:Math.min(4,tier)};
}
function isOctopusTentacle(target){return target?.type==="octopusTentacle";}
function isCombatTargetAvailable(target){
  return !!target&&!target.dead&&isFinitePos(target)&&target.hp>0&&
    !(target.type==="octopus"&&target.state!=="surface")&&
    !(isOctopusTentacle(target)&&target.emergeTimer>0);
}
function octopusArenaPoint(x,y,margin=55){
  return {x:Math.max(Math.min(margin,canvas.width/2),Math.min(canvas.width-margin,x)),
    y:Math.max(Math.min(margin,canvas.height/2),Math.min(canvas.height-margin,y))};
}
function getOctopusTentacles(owner=boss){return cats.filter(c=>isOctopusTentacle(c)&&c.owner===owner&&!c.dead);}
function createOctopusStrike(owner,x,y,radius,warning=1.05,source=null){
  if(!owner||owner!==boss||owner.attacks.length>=8)return;
  const p=octopusArenaPoint(x,y,35);
  owner.attacks.push({x:p.x,y:p.y,r:radius,timer:warning,warning,hit:false,life:.30,source});
}
function beginOctopusDive(owner){
  if(owner!==boss||owner.state!=="surface")return;
  owner.state="submerged";owner.dives++;owner.attacks.length=0;
  selectedTarget=selectedTarget===owner?null:selectedTarget;
  const count=Math.min(8,2+owner.dives+(owner.extraTentacles||0)+Math.floor(owner.repeatLevel/2));
  const spots=[];
  for(let i=0;i<count;i++){
    let p=octopusArenaPoint(player.x,player.y);
    if(i>0){
      let best=null,bestDistance=-1;
      for(let trial=0;trial<12;trial++){
        const candidate=octopusArenaPoint(55+Math.random()*Math.max(1,canvas.width-110),55+Math.random()*Math.max(1,canvas.height-110));
        const distance=Math.min(...spots.map(s=>Math.hypot(s.x-candidate.x,s.y-candidate.y)));
        if(distance>bestDistance){best=candidate;bestDistance=distance;}
      }
      p=best;
    }
    spots.push(p);
    const hp=Math.max(4,Math.round(owner.maxHp*.045));
    cats.push({type:"octopusTentacle",owner,x:p.x,y:p.y,r:27*(owner.tentacleScale||1),hp,maxHp:hp,speed:0,baseSpeed:0,
      emergeTimer:1.25+Math.floor(i/(owner.salvoCount||1))*.18,emergeDuration:1.25+Math.floor(i/(owner.salvoCount||1))*.18,attackTimer:1.2,
      hitAnim:0,wobble:i,damageCooldown:0,freezeTimer:0,knockVx:0,knockVy:0});
  }
  if(owner.dives===1)showFloatingText({x:owner.x,y:owner.y-owner.r-45,text:"🐙 ¡Destruye los tentáculos!",life:1.8,maxLife:1.8,big:true,important:true});
}
function killOctopusTentacle(index,tentacle){
  if(tentacle.dead)return;
  tentacle.dead=true;
  if(tentacle.owner?.attacks)tentacle.owner.attacks=tentacle.owner.attacks.filter(a=>a.source!==tentacle);
  if(tentacle.leviathanLoot)guaranteedLeviathanLoot(tentacle.x,tentacle.y);
  else dropCoins(tentacle.x,tentacle.y,.35);
  makeSmoke(tentacle.x,tentacle.y);playSoftPop();gainXP(2);
  const actual=cats[index]===tentacle?index:cats.indexOf(tentacle);
  if(actual>=0)cats.splice(actual,1);
}
function resolveOctopusStrike(owner,attack){
  if(Math.hypot(player.x-attack.x,player.y-attack.y)<attack.r+player.r)
    takePlayerDamage(owner.tentacleDamage,"Te ha golpeado un tentáculo 🐙",.35);
  for(let i=cats.length-1;i>=0;i--){
    const cat=cats[i];
    if(isOctopusTentacle(cat)||!isFinitePos(cat)||cat.dead)continue;
    if(Math.hypot(cat.x-attack.x,cat.y-attack.y)>=attack.r+cat.r)continue;
    cat.hp-=owner.tentacleDamage;cat.hitAnim=.2;
    if(cat.hp<=0)killCat(i,cat);
  }
  makeImpact(attack.x,attack.y,"#b88ae8",1);addScreenShake(3);
}
function updateOctopusBoss(owner,dt){
  owner.x=canvas.width/2;owner.y=canvas.height/2;owner.knockVx=owner.knockVy=0;
  owner.wobble+=dt*3;
  for(let i=owner.attacks.length-1;i>=0;i--){
    const a=owner.attacks[i];
    if(a.source?.dead){owner.attacks.splice(i,1);continue;}
    a.timer-=dt;
    if(a.timer<=0&&!a.hit){a.hit=true;resolveOctopusStrike(owner,a);}
    if(a.hit){a.life-=dt;if(a.life<=0)owner.attacks.splice(i,1);}
  }
  if(owner.state==="resurfacing"){
    owner.surfaceTimer-=dt;
    if(owner.surfaceTimer<=0){owner.state="surface";owner.attackTimer=1.2;}
    return;
  }
  if(owner.state==="submerged"){
    const tentacles=getOctopusTentacles(owner);
    if(!tentacles.length){owner.state="resurfacing";owner.surfaceTimer=.8;owner.attacks.length=0;return;}
    for(const t of tentacles){
      const p=octopusArenaPoint(t.x,t.y);t.x=p.x;t.y=p.y;
      t.wobble+=dt*3;t.hitAnim=Math.max(0,t.hitAnim-dt);
      t.freezeTimer=Math.max(0,(t.freezeTimer||0)-dt);
      if(t.emergeTimer>0){
        t.emergeTimer=Math.max(0,t.emergeTimer-dt);
        if(t.emergeTimer===0)createOctopusStrike(owner,t.x,t.y,owner.strikeRadius,.5,t);
        continue;
      }
      if(t.freezeTimer>0)continue;
      t.attackTimer-=dt;
      if(t.attackTimer<=0){
        const dx=player.x-t.x,dy=player.y-t.y,d=Math.hypot(dx,dy)||1;
        const reach=Math.min(40,d);
        createOctopusStrike(owner,t.x+dx/d*reach,t.y+dy/d*reach,owner.strikeRadius,1.05,t);
        t.attackTimer=3.0;
      }
    }
    return;
  }
  owner.attackTimer-=dt;
  if(owner.attackTimer<=0){
    const dx=player.x-owner.x,dy=player.y-owner.y,d=Math.hypot(dx,dy)||1;
    const reach=Math.min(d,Math.min(330,Math.max(140,Math.min(canvas.width,canvas.height)*.43)));
    const angle=Math.atan2(dy,dx),count=owner.salvoCount||1;
    for(let i=0;i<count;i++){
      const offset=i===0?0:(i%2?1:-1)*Math.ceil(i/2)*.72;
      const a=angle+offset;
      createOctopusStrike(owner,owner.x+Math.cos(a)*reach,owner.y+Math.sin(a)*reach,owner.strikeRadius,1.1);
    }
    owner.attackTimer=Math.max(1.7,2.7-owner.repeatLevel*.12);
  }
}

function updateBoss(dt){
if(!boss)return;
constrainBossToArena(boss);
boss.hitAnim=Math.max(0,boss.hitAnim-dt);
boss.relaxTimer=Math.max(0,(boss.relaxTimer||0)-dt);
if(boss.relaxTimer>0){boss.hitAnim=Math.max(boss.hitAnim,.12);return;}
if(boss.type==="octopus"){updateOctopusBoss(boss,dt);return;}
boss.wobble+=dt*4;
const trailSlow=getRamTrailSlow(boss);
if(boss.knockVx||boss.knockVy){boss.x+=(boss.knockVx||0)*dt;boss.y+=(boss.knockVy||0)*dt;boss.knockVx=(boss.knockVx||0)*Math.pow(.12,dt);boss.knockVy=(boss.knockVy||0)*Math.pow(.12,dt);if(Math.abs(boss.knockVx)<8)boss.knockVx=0;if(Math.abs(boss.knockVy)<8)boss.knockVy=0;}
constrainBossToArena(boss);
if(boss.type==="giantCat"){
const dx=player.x-boss.x,dy=player.y-boss.y,dist=Math.hypot(dx,dy)||1;
boss.x+=(dx/dist)*boss.speed*trailSlow*dt;boss.y+=(dy/dist)*boss.speed*trailSlow*dt;boss.summon-=dt;
if(boss.summon<=0&&isCatOnScreen(boss)){boss.summon=boss.baseSummon||Math.max(.55,2.15-wave*.07);for(let i=0;i<(boss.summonCount||2);i++){
if(i%2===1){
  const edge=(boss.sideSummons||0)%4,pos=.12+Math.random()*.76;
  boss.sideSummons=(boss.sideSummons||0)+1;
  spawnCat(edge===0?-20:edge===1?canvas.width+20:canvas.width*pos,
    edge===2?-20:edge===3?canvas.height+20:canvas.height*pos,true);
}
else spawnCat(boss.x+(Math.random()*110-55),boss.y+(Math.random()*110-55),true);
}}else if(boss.summon<=0){boss.summon=Math.max(.32,boss.baseSummon||Math.max(.55,2.15-wave*.07));}
if(dist<player.r+boss.r-8){takePlayerDamage((boss.contactDamage||18)*dt,"El jefe te ha llenado de mimos 🐱",.1)}
}else if(boss.type==="duck"){
if(wave>=15){const speed=Math.min(100,25+(wave-15)*1.5),margin=boss.r+18;boss.x=Math.max(margin,Math.min(canvas.width-margin,boss.x+Math.cos(boss.wobble*.6)*speed*trailSlow*dt));}
boss.shoot-=dt;
if(boss.shoot<=0){
boss.shoot=boss.baseShoot||Math.max(.42,1.25-wave*.045);
boss.pendingQuacks=Array.from({length:boss.burst||1},(_,i)=>gameNow()+i*130);
showFloatingText({x:boss.x,y:boss.y-70,text:Math.random()<.5?"QUACK!":"QUACK?",life:.7,maxLife:.7,big:false})
}
if(boss.pendingQuacks){
while(boss.pendingQuacks.length&&boss.pendingQuacks[0]<=gameNow()){boss.pendingQuacks.shift();makeQuack();}
}
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
boss.state="stunned";boss.stunTimer=boss.stunDuration||2.4;boss.jumps=0;boss.jumpsBeforeRest=getSealJumpCount(wave,boss.repeatLevel||0);boss.hp-=Math.max(4,boss.maxHp*.055);if(boss.hp<=0){damageBoss(0);return;}showFloatingText({x:boss.x,y:boss.y-boss.r-25,text:"La foca se ha mareado",life:1.4,maxLife:1.4,big:false})
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

boss.x+=(dx/d)*boss.speed*trailSlow*dt;
boss.y+=(dy/d)*boss.speed*trailSlow*dt;
boss.x=Math.max(90,Math.min(canvas.width-90,boss.x));
boss.y=Math.max(90,Math.min(canvas.height-90,boss.y));

boss.shoot-=dt;
if(boss.shoot<=0){
boss.shoot=boss.baseShoot;
const count=boss.circleCount||12;
const offset=Math.random()*Math.PI*2;
for(let i=0;i<count;i++){
if(demonOrbs.length>=getProjectileCap("orb"))break;
const a=offset+i*Math.PI*2/count;
const reinforced=Math.random()<getDemonOrbResistanceChance();
const orb={
x:boss.x,
y:boss.y,
vx:Math.cos(a)*boss.orbSpeed,
vy:Math.sin(a)*boss.orbSpeed,
r:13,
life:5,
reinforced,hitsLeft:reinforced?2:1,
damage:16+wave*.45
};
if(!applyFreshDemonOrbBodyHit(orb))demonOrbs.push(orb);
}
showFloatingText({x:boss.x,y:boss.y-boss.r-32,text:"círculo oscuro",life:.8,maxLife:.8,big:false});
shockwaves.push({x:boss.x,y:boss.y,r:8,maxR:boss.r+90,life:.45,maxLife:.45,color:"#ff4d8d",line:6});
makeImpact(boss.x,boss.y,"#9b5de5",1.2);
addScreenShake(6);
playDemonShotSound();
}

if(Math.hypot(player.x-boss.x,player.y-boss.y)<player.r+boss.r-8){
takePlayerDamage(boss.contactDamage*dt,"El demonio oscuro te ha atrapado 😈",.15);
}
}
if(boss)constrainBossToArena(boss);
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
const runToken=autoChoiceToken;
setTimeout(()=>{if(runToken===autoChoiceToken&&!gameOver){messageEl.style.display="none";messageEl.classList.remove("dogSave")}},2100);
return true;
}

function endGame(text){
if(gameOver)return;
if(triggerDogSacrifice())return;
stopPowerStarLoop();
stopAllMusic();
life=0;gameOver=true;choosingUpgrade=false;
updateHud();
levelUpPanel.style.display="none";pendingUpgradeQueue=[];
clearAllInputKeys();
showGameOverScreen();
if(updatingWorld)throw END_GAME_FRAME;
}

function updateShield(dt){
if(!upgrades.shield)return;
const shieldLvl=effectLevel("shield");
shieldAngle+=dt*(2.2+shieldLvl*.18);
shieldAttack();
const now=gameNow();
if(now-lastShieldHit<160)return;
const shieldR=52+shieldLvl*4,orbs=2+Math.min(4,shieldLvl),orbSize=12+Math.min(12,shieldLvl*1.7)+(hasDoneFusionPair("fishSize+shield")?3+6*fusionStrength("fishSize+shield"):0);
for(let i=0;i<orbs;i++){
const a=shieldAngle+i*Math.PI*2/orbs,ox=player.x+Math.cos(a)*shieldR,oy=player.y+Math.sin(a)*shieldR;
for(let c=cats.length-1;c>=0;c--){
const cat=cats[c];if(!isCombatTargetAvailable(cat))continue;const d=Math.hypot(cat.x-ox,cat.y-oy);
if(d<cat.r+orbSize){
const shieldDamage=(1+shieldLvl*.95)*(hasDoneFusionPair("maxLife+shield")?1.08+.20*fusionStrength("maxLife+shield"):1),healthLost=Math.min(Math.max(0,cat.hp),shieldDamage);
cat.hp-=shieldDamage;cat.hitAnim=.15;makeHearts(cat.x,cat.y);if(hasDoneFusionPair("lifeSteal+shield"))life=Math.min(upgrades.maxLife,life+healthLost*getCurrentLifeSteal());lastShieldHit=now;
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
}

function explodeYarnCat(cat){
if(!cat||!isFinitePos(cat))return;
const count=10+Math.min(10,Math.floor(wave/6));
const speed=155+wave*4;
for(let i=0;i<count;i++){
  if(yarnBalls.length>=getProjectileCap("yarn"))break;
  const a=(Math.PI*2/count)*i+Math.random()*.12;
  yarnBalls.push({x:cat.x+Math.cos(a)*cat.r,y:cat.y+Math.sin(a)*cat.r,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:12,life:3.4,damage:6+wave*.2,spin:0,deathBurst:true});
}
shockwaves.push({x:cat.x,y:cat.y,r:8,maxR:90,life:.42,maxLife:.42,color:"#b197fc",line:5});
makeImpact(cat.x,cat.y,"#b197fc",1.1);
showFloatingText({x:cat.x,y:cat.y-52,text:"¡explosión de lana!",life:1,maxLife:1,big:false});
}

function killCat(index,cat=null){
if(!cat)cat=cats[index];
if(!cat||cat.dead)return;
const realIndex=cats.indexOf(cat);
if(realIndex!==-1)index=realIndex;
if(index<0||index>=cats.length||cats[index]!==cat)return;
if(isOctopusTentacle(cat)){killOctopusTentacle(index,cat);return;}
cat.dead=true;
if(cat.saltKill)addAchievementStat("saltKills",1,{run:true});
spreadSaltOnDefeat(cat);
dropRecoveredStolenCoins(cat);
if(cat.type==="yarn")explodeYarnCat(cat);
if(cat.type==="glutton"){const tunaCount=2+Math.floor(Math.random()*2);for(let t=0;t<tunaCount;t++){tunaDrops.push({x:cat.x+(Math.random()*44-22),y:cat.y+(Math.random()*44-22),r:16,life:16,wobble:0});showFloatingText({x:cat.x,y:cat.y-38-t*18,text:"🐟 ¡Lata!",life:1.0,maxLife:1.0,big:false});}}
if(cat.leviathanLoot)guaranteedLeviathanLoot(cat.x,cat.y);
if(cat.type==="mini")gainXP(2+Math.floor(wave/3));
score++;if(runStats)runStats.kills++;addAchievementStat("cats",1,{run:true});gainXP(1+Math.floor(wave/4));makeSmoke(cat.x,cat.y);playSoftPop();dropCoins(cat.x,cat.y,cat.rainbow?.25:.013);if(!cat.rainbow&&Math.random()<.10){tunaDrops.push({x:cat.x,y:cat.y+(Math.random()*20-10),r:16,life:16,wobble:0});showFloatingText({x:cat.x,y:cat.y-38,text:"🐟 ¡Lata!",life:1.0,maxLife:1.0,big:false});}
if(cat.rainbow){rainbowChanceLevel=1;rainbowPendingUntilKilled=false;rainbowSelectedThisWave=false;queueUpgradeMenus("rainbow",1)}
else if(cat.type!=="thief")showFloatingText({x:cat.x,y:cat.y-30,text:"miau~",life:.8,maxLife:.8,big:false});
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
const chance=coreUpgradeStat("yarnBounce");
if(chance<=0||Math.random()>chance)return false;

const visited=new Set(Array.isArray(visitedIds)?visitedIds:[]);
if(currentTargetId!==null&&currentTargetId!==undefined)visited.add(currentTargetId);

let target=null,best=430;

cats.forEach(c=>{
if(!isCombatTargetAvailable(c))return;
const id=getYarnTargetId(c);
if(visited.has(id))return;
const d=Math.hypot(c.x-sourceX,c.y-sourceY);
if(d<best){best=d;target=c}
});

if(isCombatTargetAvailable(boss)){
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
damage:Math.max(.5,upgrades.damage*getZoomiesDamageMultiplier()*.65),
life:1.05,
scale:Math.max(.75,upgrades.fishSize*.78),
pierce:false,
boomerang:false,
yarnBounceShot:true,
yarnVisitedIds:newVisited
});
showFloatingText({x:sourceX,y:sourceY-24,text:"rebote 🧶",life:.55,maxLife:.55,big:false});
return true;
}

function getOmniBurstPowerMultiplier(lvl=effectLevel("omniBurst")){
  return 1+Math.min(.20,Math.max(0,lvl-7)*.04);
}
function getOmniBurstCooldownMs(lvl=effectLevel("omniBurst"),fusionProgress=null){
  const pair="fireRate+omniBurst";
  const hasSpecial=hasDoneFusionPair(pair);
  const strength=hasSpecial?(fusionProgress===null?fusionStrength(pair):[0,.14,.31,.51,.74,1][Math.min(5,Math.max(0,Math.floor(fusionProgress)))]):0;
  return Math.max(hasSpecial?2800:3200,9000/(1+lvl*.13)*(hasSpecial?.93-.15*strength:1));
}

function shootOmniBurst(){
const lvl=effectLevel("omniBurst");
if(lvl<=0)return;
const count=10+Math.min(14,lvl*2);
const baseDamage=upgrades.damage*getZoomiesDamageMultiplier()*.72*getOmniBurstPowerMultiplier(lvl)*(hasDoneFusionPair("damage+omniBurst")?1.12+.28*fusionStrength("damage+omniBurst"):1);
const fishScale=upgrades.fishSize*.82;
const burstSpeed=520*upgrades.fishSpeed*(hasDoneFusionPair("fishSpeed+omniBurst")?1.35:1);
for(let i=0;i<count;i++){
const a=(Math.PI*2/count)*i+Math.random()*.08;
fishes.push({omniBurstShot:true,
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
showFloatingText({x:player.x,y:player.y-70,text:"💥 ¡Ráfaga gatuna!",life:1.05,maxLife:1.05,big:false});
}

function updateOmniBurst(){
const lvl=effectLevel("omniBurst");
if(lvl<=0)return;
const now=gameNow();
const cooldown=getOmniBurstCooldownMs(lvl);
if(now-lastOmniBurst>=cooldown){
lastOmniBurst=now;
shootOmniBurst();
}
}

function isTargetAlive(target){
if(!target)return false;
if(target===boss)return isCombatTargetAvailable(boss);
return cats.includes(target)&&isCombatTargetAvailable(target);
}

function getSelectedTarget(){
if(isTargetAlive(selectedTarget))return selectedTarget;
selectedTarget=null;
return null;
}

function selectTargetAt(x,y){
let target=null;
let best=Infinity;
if(isCombatTargetAvailable(boss)){
const d=Math.hypot(x-boss.x,y-boss.y);
if(d<boss.r+26){target=boss;best=d}
}
cats.forEach(cat=>{
if(!isCombatTargetAvailable(cat))return;
const d=Math.hypot(x-cat.x,y-cat.y);
if(d<cat.r+22&&d<best){target=cat;best=d}
});
selectedTarget=target;
showFloatingText({x:x,y:y-28,text:target?"🎯 Objetivo fijado":"Objetivo quitado",life:1,maxLife:1,big:false});
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
if(!isCombatTargetAvailable(c))return;
const d=Math.hypot(c.x-x,c.y-y);
if(d<bestD){best=c;bestD=d}
});
if(isCombatTargetAvailable(boss)){
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
dogBones.push({x:dogCompanion.x+Math.cos(a)*18,y:dogCompanion.y+Math.sin(a)*18,vx:Math.cos(a)*460,vy:Math.sin(a)*460,angle:a,life:1.4,damage:Math.max(.8,upgrades.damage*getZoomiesDamageMultiplier()*.55)});
dogCompanion.shootCooldown=.75;
showFloatingText({x:dogCompanion.x,y:dogCompanion.y-28,text:"guau!",life:.55,maxLife:.55,big:false})
}
for(let i=dogBones.length-1;i>=0;i--){
const b=dogBones[i];
if(!isFinitePos(b)){dogBones.splice(i,1);continue}
b.x+=(Number.isFinite(b.vx)?b.vx:0)*dt;b.y+=(Number.isFinite(b.vy)?b.vy:0)*dt;b.life-=dt;
let hit=false;
for(let j=cats.length-1;j>=0;j--){
const c=cats[j];
if(!isCombatTargetAvailable(c)||!isFinitePos(b)||!isCatOnScreen(c))continue;
if(Math.hypot(c.x-b.x,c.y-b.y)<c.r+8){
c.hp-=b.damage;c.hitAnim=.12;makeHearts(c.x,c.y);hit=true;
if(c.hp<=0)killCat(j,c);
break
}
}
if(!hit&&isCombatTargetAvailable(boss)&&Math.hypot(boss.x-b.x,boss.y-b.y)<boss.r+8){
damageBoss(b.damage);hit=true
}
if(hit||b.life<=0||b.x<-80||b.x>canvas.width+80||b.y<-80||b.y>canvas.height+80)dogBones.splice(i,1)
}
}

function drawDog(){
if(!upgrades.boyfriendDog||dogKidnapped)return;
ctx.save();ctx.translate(dogCompanion.x,dogCompanion.y);ctx.scale(.68,.68);
const bob=Math.sin(dogCompanion.wag)*1.5;
ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=1.8;
const oval=(x,y,rx,ry,color,angle=0)=>{ctx.fillStyle=color;ctx.strokeStyle='#785244';ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();ctx.stroke();};
ctx.fillStyle='rgba(15,8,24,.20)';ctx.beginPath();ctx.ellipse(0,18,22,6,0,0,Math.PI*2);ctx.fill();
ctx.save();ctx.translate(-16,5+bob);ctx.rotate(Math.sin(dogCompanion.wag)*.35);
ctx.strokeStyle='#785244';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-17,-3,-13,-17);ctx.stroke();
ctx.strokeStyle='#e5b17c';ctx.lineWidth=5;ctx.stroke();ctx.restore();
oval(0,7+bob,18,13,'#e8b987');
oval(-11,16+bob,6,5,'#fff0d5');oval(11,16+bob,6,5,'#fff0d5');
oval(0,-5+bob,18,17,'#f4d1a1');
oval(-17,-5+bob,7,14,'#ad7657',-.25);oval(17,-5+bob,7,14,'#ad7657',.25);
ctx.fillStyle='#fff0d5';ctx.beginPath();ctx.ellipse(-3,-11+bob,7,9,-.25,0,Math.PI*2);ctx.fill();
oval(0,2+bob,11,8,'#fff0d5');
for(const x of [-7,7]){ctx.fillStyle='#352832';ctx.beginPath();ctx.ellipse(x,-6+bob,2.5,3.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff9ef';ctx.beginPath();ctx.arc(x-.7,-7+bob,.9,0,Math.PI*2);ctx.fill();}
ctx.fillStyle='#51343b';ctx.beginPath();ctx.moveTo(-4,-1+bob);ctx.quadraticCurveTo(0,-4+bob,4,-1+bob);ctx.quadraticCurveTo(0,5+bob,-4,-1+bob);ctx.fill();
ctx.strokeStyle='#785244';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,2+bob);ctx.quadraticCurveTo(-1,7+bob,-5,5+bob);ctx.moveTo(0,2+bob);ctx.quadraticCurveTo(1,7+bob,5,5+bob);ctx.stroke();
ctx.fillStyle='#ee98ad';ctx.beginPath();ctx.ellipse(0,7+bob,2.4,3,0,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='#ed8eae';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-11,12+bob);ctx.quadraticCurveTo(0,17+bob,11,12+bob);ctx.stroke();
ctx.fillStyle='#ffe09a';ctx.strokeStyle='#b77e54';ctx.lineWidth=1;
ctx.beginPath();ctx.moveTo(0,21+bob);ctx.bezierCurveTo(-10,15+bob,-3,10+bob,0,15+bob);ctx.bezierCurveTo(3,10+bob,10,15+bob,0,21+bob);ctx.fill();ctx.stroke();
ctx.restore();
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
    showFloatingText({x:player.x,y:player.y-126,text:`🧲 Instinto recolector`,life:1.15,maxLife:1.15,big:false});
    shockwaves.push({x:player.x,y:player.y,r:6,maxR:Math.min(range*.55,420),life:.65,maxLife:.65,color:"#4cc9f0",line:3});
  }
}

function getNearestCombatTargetFrom(x,y,maxDist=900){
  let target=null,best=maxDist;
  cats.forEach(cat=>{if(!isCombatTargetAvailable(cat))return;const d=Math.hypot(cat.x-x,cat.y-y);if(d<best){best=d;target=cat;}});
  if(isCombatTargetAvailable(boss)){const d=Math.hypot(boss.x-x,boss.y-y);if(d<best){best=d;target=boss;}}
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
  if(count>0)showFloatingText({x:player.x,y:player.y-140,text:"🪃 Reflejo circular",life:1.05,maxLife:1.05,big:false});
}
function shootCatInstinctBurst(){
  const pair="catInstinct+omniBurst";
  if(!hasDoneFusionPair(pair))return;
  const lvl=getFusionProgress(pair);
  const count=8+lvl*3;
  const speed=500*upgrades.fishSpeed*(1+lvl*.035);
  for(let i=0;i<count;i++){
    const a=(Math.PI*2/count)*i+Math.random()*.05;
    fishes.push({x:player.x+Math.cos(a)*50,y:player.y+Math.sin(a)*50,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,angle:a,damage:Math.max(.75,upgrades.damage*getZoomiesDamageMultiplier()*(.62+lvl*.06)),life:1.05+lvl*.05,scale:Math.max(.72,upgrades.fishSize*.75),pierce:Math.random()<Math.min(.65,upgrades.pierceChance*.35+lvl*.04),boomerang:false,returning:false,age:0,hitIds:new Set(),shieldShot:true});
  }
  showFloatingText({x:player.x,y:player.y-154,text:"💥 Ráfaga felina",life:1.15,maxLife:1.15,big:false});
}

function triggerCatInstinct(forcedInstinct=false){
if(!upgrades.catInstinct)return false;
if(!forcedInstinct&&life>upgrades.maxLife*.3)return false;
const maxUses=upgrades.valorCasa?2:1;
if(!forcedInstinct){
if(catInstinctUsesThisWave>=maxUses)return false;
catInstinctUsesThisWave++;
catInstinctUsedThisWave=catInstinctUsesThisWave>=maxUses;
}

playCatInstinctSound();
const pushForce=420+upgrades.maxLife*2.2+(upgrades.cursedInstinct?180:0);
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
  showFloatingText({x:player.x,y:player.y-108,text:"🖤 Modo instinto maldito",life:1.4,maxLife:1.4,big:false});
}
showFloatingText({x:player.x,y:player.y-82,text:upgrades.valorCasa?"🏠 ¡Valor de casa!":"🥷 ¡Instinto gatuno!",life:1.35,maxLife:1.35,big:false});
pullResourcesWithCatInstinct();
redirectBoomerangsWithCatInstinct();
shootCatInstinctBurst();

cats.forEach(cat=>{
  if(!isFinitePos(cat))return;
  const dx=cat.x-player.x,dy=cat.y-player.y,d=Math.hypot(dx,dy)||1;
  const falloff=Math.max(.28,1-Math.min(d/radius,.78));
  const push=(pushForce*falloff)+(cat.small?110:0);
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
  boss.knockVx=(boss.knockVx||0)+(dx/d)*(pushForce*.34);
  boss.knockVy=(boss.knockVy||0)+(dy/d)*(pushForce*.34);
  boss.hitAnim=.28;
}
if(upgrades.reflexBurst){
  const targets=[...cats];if(boss)targets.push(boss);
  targets.slice(0,16).forEach(target=>{
    const a=Math.atan2(target.y-player.y,target.x-player.x);
    fishes.push({x:player.x+Math.cos(a)*54,y:player.y+Math.sin(a)*54,vx:Math.cos(a)*620*upgrades.fishSpeed,vy:Math.sin(a)*620*upgrades.fishSpeed,angle:a,damage:Math.max(1,upgrades.damage*getZoomiesDamageMultiplier()*.9),life:1.25,scale:upgrades.fishSize*.85,pierce:true,boomerang:false,returning:false,age:0,hitIds:new Set(),shieldShot:true});
  });
}
return true;
}

function getOriginalUpgradeName(key){
return (UPGRADE_META[key]&&UPGRADE_META[key].name)||(uniqueFusionMeta[key]&&uniqueFusionMeta[key].name)||key;
}

function getOriginalUpgradeIcon(key){
return (UPGRADE_META[key]&&UPGRADE_META[key].icon)||(uniqueFusionMeta[key]&&uniqueFusionMeta[key].icon)||"✨";
}

function getPauseActualLevel(key){
  const fusedPair=getFusedPairForKey(key);
  if(fusedPair)return getFusionProgress(fusedPair);
  return Math.max(0,Number(upgradeLevels[key]||0));
}
function getPauseActualPercent(key){
const value=coreUpgradeStat(key);
return Math.round((value-(["moveSpeed","fireRate","fishSpeed","damage","fishSize","xpBoost"].includes(key)?1:0))*1000)/10;
}
function getScalableDetail(key){
  const lvl=Math.max(0,Number(upgradeLevels[key]||0));
  const max=Math.max(1,Number(upgradeMaxLevels[key]||5));
  const fusedPair=getFusedPairForKey(key);
  const fusionLevel=fusedPair?getFusionProgress(fusedPair):0;
  const shownLevel=fusedPair?fusionLevel:lvl;
  const shownMax=fusedPair?5:max;
  const p=getPauseActualPercent(key);
  const lines=[];

  const detail={
    luck:`Probabilidades de eventos ×${(1+upgrades.luck).toFixed(2)}; ${(upgrades.luck*50).toFixed(1)} % de duplicar monedas.`,
    damageReduction:`Recibes un ${p} % menos de daño.`,
    moveSpeed:`Te mueves un ${p}% más rápido.`,
    fireRate:`Disparas aproximadamente un ${p}% más rápido.`,
    fishSpeed:`Los peces vuelan un ${p}% más rápido.`,
    damage:`Tus peces hacen un ${p}% más de daño.`,
    bigFish:`Tienes un ${p}% de probabilidad de lanzar peces grandes.`,
    doubleFish:`Tienes un ${p}% de probabilidad de lanzar peces extra.`,
    pierce:`Tienes un ${p}% de probabilidad de atravesar enemigos.`,
    catSlow:`Los enemigos se ralentizan aproximadamente un ${p}%.`,
    healOnWave:`Recuperas ${upgrades.healOnWave} de vida al superar ronda.`,
    fishSize:`Los peces son un ${p}% más grandes.`,
    maxLife:`Vida máxima: ${upgrades.maxLife}.`,
    lifeSteal:`Recuperas un ${getPauseActualPercent("lifeSteal")}% del daño como vida.`,
    xpBoost:`Ganas aproximadamente un ${p}% más de experiencia.`,
    boomerang:`Tienes un ${p}% de probabilidad de lanzar peces boomerang.`,
    shield:`Nivel efectivo del escudo: ${upgrades.shieldLevel}.`,
    coinMagnet:`Radio base del imán: ${Math.round(upgrades.coinMagnetRange)} píxeles.`,
    omniBurst:`${10+Math.min(14,effectLevel("omniBurst")*2)} peces por ráfaga, potencia ×${getOmniBurstPowerMultiplier().toFixed(2)}, cada ${(getOmniBurstCooldownMs()/1000).toFixed(2)} s.`,
    yarnBounce:`Probabilidad de rebote: ${getPauseActualPercent("yarnBounce")}%.`,
    saltScales:`Daño salino actual: ${coreUpgradeStat("saltScales").toFixed(2)} daño/s durante ${hasDoneFusionPair("fireRate+saltScales")?"2,8":"2,4"} s.`,
    critChance:`Tienes un ${p}% de probabilidad de crítico.`
  };
  lines.push(detail[key]||`Potencia actual: ${shownLevel}/${shownMax}.`);
  return lines.join(" ");
}
function getUniqueDetail(key){
 return getUpgradeDisplayDesc(key,1);
}

function getFusionDetail(pair){
 pair=sortedPair(...String(pair||"").split("+"));
 const [a,b]=pair.split("+");
 const lines=[getFusionEffectDesc(a,b)];
 for(const key of [a,b]){
   if(Object.prototype.hasOwnProperty.call(upgradeLevels,key))lines.push(getScalableDetail(key));
 }
 return lines.join("\n");
}

function makePauseRowId(r,idx){
  return escapeHtml(String(r.pair||r.key||r.name||idx).replace(/"/g,""));
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
key:pairKey,
pair:pairKey,
icon,
name:(pairKey==="darkPact+moralSupport"&&upgrades.boyfriendDogReturned?"Te dije que seguiría contigo 🐶":(pairKey==="darkPact+moralSupport"&&upgrades.boyfriendDogSpirit?"Tu novio ha hecho este juego 🕯️":fusionName)),
level,
max,
components:componentNames,
desc:`${getFusionEffectDesc(a,b)}`,
detail:getFusionDetail(pairKey),
locked:false,
maxed:level>=max,
fusion:true
});
});

Object.keys(upgradeLevels).forEach(key=>{
if(fusedKeys.has(key))return;
const lvl=upgradeLevels[key],max=(upgradeMaxLevels[key]||5),meta=UPGRADE_META[key];
rows.push({key,icon:meta.icon,name:getUpgradeDisplayName(key),level:lvl,max,desc:getUpgradeDisplayDesc(key,Math.max(1,lvl)),detail:getScalableDetail(key),locked:lvl===0,maxed:lvl>=max||isUpgradeFinal(key),fusion:false});
});

uniqueFusionKeys.forEach(key=>{
if(fusedKeys.has(key))return;
const meta=uniqueFusionMeta[key];
rows.push({key,icon:meta.icon,name:getAnyName(key),level:hasUniqueUpgrade(key)?1:0,max:1,desc:meta.desc,detail:getUniqueDetail(key),locked:!hasUniqueUpgrade(key),maxed:hasUniqueUpgrade(key),fusion:false});
});
return rows;
}

function renderPauseMenu(){
const hs=getHighScore();
const bossCount=defeatedBossTypes.size;
pauseStats.innerHTML=`
<div class="pauseLiveScore">🏆 Puntuación actual: <strong id="pauseCurrentScore">${computeFinalScore().total.toLocaleString()}</strong></div>
<div class="pStat"><div class="pStatVal">⚡ ${wave}</div><div class="pStatLbl">Ronda</div></div>
<div class="pStat"><div class="pStatVal">⭐ ${level}</div><div class="pStatLbl">Nivel</div></div>
<div class="pStat"><div class="pStatVal">🪙 ${coins}</div><div class="pStatLbl">Monedas</div></div>
<div class="pStat"><div class="pStatVal">🐱 ${score}</div><div class="pStatLbl">Gatitos mimados</div></div>
<div class="pStat"><div class="pStatVal">🐟 ${runStats?Math.floor(runStats.fishHits||0):0}</div><div class="pStatLbl">Impactos</div></div>
<div class="pStat"><div class="pStatVal">💀 ${bossCount}/${BOSS_TYPES.length}</div><div class="pStatLbl">Jefes</div></div>
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
})().map((r,idx)=>{
const rowId=makePauseRowId(r,idx);
return `
<div role="button" tabindex="0" aria-label="${escapeHtml(r.name)}: mostrar detalles" class="pauseUpgrade ${getOwnedVisualTierClass(r)} ${r.maxed?'maxed':''} ${r.locked?'locked':''} ${r.fusion?'fusion':''}" data-pause-row="${rowId}" title="Click izquierdo o derecho para girar la tarjeta">
  <div class="pauseUpgradeInner">
    <div class="pauseUpgradeFace pauseUpgradeFront">
      <div class="pauseUpgradeName">${r.icon} ${r.name}</div>
      <div class="pauseUpgradeLevel">${r.level}/${r.max}${r.maxed?' ⭐':''}</div>
      ${r.components?`<div class="pauseUpgradeComponents">Incluye: ${r.components}</div>`:""}
      <div class="pauseUpgradeDesc">${r.desc}</div>
      <div class="pauseFlipHint">Click: detalles</div>
    </div>
    <div class="pauseUpgradeFace pauseUpgradeBack">
      <div class="pauseUpgradeName">📖 ${r.name}</div>
      <div class="pauseUpgradeLevel">Detalle</div>
      <div class="pauseUpgradeDesc">${escapeHtml(r.detail||r.desc)}</div>
      <div class="pauseFlipHint">Click: volver</div>
    </div>
  </div>
</div>`;
}).join("");
}

function togglePauseUpgradeCard(e){
  const card=e.target.closest(".pauseUpgrade");
  if(!card||!pauseUpgradesList.contains(card))return;
  e.preventDefault();
  card.classList.toggle("flipped");
}
pauseUpgradesList?.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")togglePauseUpgradeCard(e)});
pauseUpgradesList?.addEventListener("click",togglePauseUpgradeCard);
pauseUpgradesList?.addEventListener("contextmenu",togglePauseUpgradeCard);

const pauseMoreOptions=document.getElementById("pauseMoreOptions");
document.addEventListener("pointerdown",e=>{
  if(pauseMoreOptions?.open&&!pauseMoreOptions.contains(e.target))pauseMoreOptions.open=false;
});
function openPause(){
if(pauseMoreOptions)pauseMoreOptions.open=false;
clearAllInputKeys();
paused=true;
releaseGamePointer();
renderPauseMenu();
pausePanel.style.display="flex";
pauseAllMusic();
}

function closePause(){
if(pauseMoreOptions)pauseMoreOptions.open=false;
clearAllInputKeys();
paused=false;
pausePanel.style.display="none";
requestGamePointerLock();
processPendingUpgradeQueue();
syncMusic();
}

function togglePause(){
if(paused)closePause();else openPause();
}

function isFinitePos(o){return o&&Number.isFinite(o.x)&&Number.isFinite(o.y)}
function isCatOnScreen(o){if(!o)return false;const m=(o.r||20)+8;return o.x>-m&&o.x<canvas.width+m&&o.y>-m&&o.y<canvas.height+m;}
let lastSoftErrorAt=0;
let lastSoftErrorSignature="";
function clampNumber(value,min,max,fallback){
  if(!Number.isFinite(value))return fallback;
  return Math.max(min,Math.min(max,value));
}
function cleanBrokenEntities(){
  for(const arr of [cats,fishes,hearts,smokes,floatingTexts,pawPrints,quacks,coinsDrops,dogBones,demonOrbs,yarnBalls,powerStars,shockwaves,sparkles,tunaDrops]){
    let kept=0;
    for(let i=0;i<arr.length;i++){
      const e=arr[i];
      if(e&&!e.dead&&Number.isFinite(e.x)&&Number.isFinite(e.y))arr[kept++]=e;
      else if(arr===cats&&e){
        refundRemovedThief(e);
        if(e.rainbow&&!e.dead)rainbowSpawnedThisWave=false;
      }else if(arr===coinsDrops&&e)collectCoinDrop(e);
      else if(arr===tunaDrops&&e)life=Math.min(upgrades.maxLife,life+20*Math.max(1,safeCount(e.stacks,1)));
    }
    arr.length=kept;
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
  const signature=String(err?.message||err).slice(0,160);
  if(signature!==lastSoftErrorSignature||now-lastSoftErrorAt>30000){
    lastSoftErrorAt=now;
    lastSoftErrorSignature=signature;
    if(gameStarted&&!gameOver)showFloatingText({x:canvas.width/2,y:110,text:"⚠️ Error recuperado",life:.9,maxLife:.9,big:false});
  }
}
window.addEventListener('error',e=>{showSoftError(e.error||e.message)});
window.addEventListener('unhandledrejection',e=>{
  console.error('Promesa rechazada',e.reason||e);
  window.__lastAsyncError=String(e.reason?.stack||e.reason||e);
});

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
  }
}
function getEffectQuality(){
  return lowPerfMode?.34:1;
}
function getEntityLimit(normal,low){
  return lowPerfMode?low:normal;
}

function update(dt){
if(!gameStarted||gameOver||choosingUpgrade||paused)return;
updatingWorld=true;
simulationMs+=dt*1000;
try{updateWorld(dt)}catch(err){if(err!==END_GAME_FRAME)throw err}
finally{updatingWorld=false;}
processPendingUpgradeQueue();
checkGameCompletion();
}
function updateRamFishTrails(dt){
  let count=0;
  for(const trail of ramFishTrails){trail.life-=dt;if(trail.life>0)ramFishTrails[count++]=trail;}
  ramFishTrails.length=count;
}
function addRamFishTrail(fish,dt){
  if(!fish.ramFish||fish.ramFullyCharged!==true||fish.life<=0)return;
  if(!Number.isFinite(fish.trailX)){fish.trailX=fish.prevX;fish.trailY=fish.prevY;}
  fish.trailTimer=(fish.trailTimer||0)+dt;
  if(fish.trailTimer<.04)return;
  fish.trailTimer=0;
  ramFishTrails.push({x:fish.trailX,y:fish.trailY,x2:fish.x,y2:fish.y,r:Math.min(48,8*(fish.scale||1)),life:1.6});
  fish.trailX=fish.x;fish.trailY=fish.y;
  if(ramFishTrails.length>100)ramFishTrails.splice(0,ramFishTrails.length-100);
}
function getRamTrailSlow(enemy){
  for(const t of ramFishTrails){
    const dx=t.x2-t.x,dy=t.y2-t.y,d2=dx*dx+dy*dy;
    const u=d2?Math.max(0,Math.min(1,((enemy.x-t.x)*dx+(enemy.y-t.y)*dy)/d2)):0;
    const ex=enemy.x-t.x-dx*u,ey=enemy.y-t.y-dy*u,r=(enemy.r||20)+t.r;
    if(ex*ex+ey*ey<r*r)return .85;
  }
  return 1;
}
function drawRamTrailFish(x,y,angle,size,alpha){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.scale(size,size);
  ctx.globalAlpha=alpha;
  ctx.lineJoin="round";
  ctx.lineWidth=1.35;
  ctx.strokeStyle="rgba(37,103,130,.72)";
  ctx.fillStyle="rgba(78,194,215,.76)";
  ctx.beginPath();
  ctx.moveTo(-10,0);
  ctx.quadraticCurveTo(-16,-4,-20,-7);
  ctx.quadraticCurveTo(-22,-7,-20,-1.5);
  ctx.lineTo(-18,0);
  ctx.lineTo(-20,2.5);
  ctx.quadraticCurveTo(-22,7,-19,7);
  ctx.lineTo(-10,2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle="rgba(126,245,255,.82)";
  ctx.beginPath();
  ctx.ellipse(0,0,12,6.5,0,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.30)";
  ctx.beginPath();
  ctx.ellipse(-1.5,-2.7,5.5,1.35,-.12,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle="rgba(35,52,72,.82)";
  ctx.beginPath();
  ctx.arc(6,-.8,1.45,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function drawRamFishTrails(){
  if(!ramFishTrails.length)return;
  ctx.save();
  for(const t of ramFishTrails){
    const dx=t.x2-t.x,dy=t.y2-t.y;
    const dist=Math.hypot(dx,dy);
    if(dist<.5)continue;
    const angle=Math.atan2(dy,dx);
    const fade=Math.max(0,Math.min(1,t.life/1.6));
    const spacing=Math.max(42,Math.min(58,t.r*3.4));
    const count=Math.max(1,Math.ceil(dist/spacing));
    for(let i=0;i<count;i++){
      const u=(i+.5)/count;
      const x=t.x+dx*u,y=t.y+dy*u;
      const size=Math.max(.42,Math.min(.82,t.r/13));
      drawRamTrailFish(x,y,angle,size,.12+.36*fade);
    }
  }
  ctx.restore();
}
function updateWorld(dt){
updateRamFishTrails(dt);
starSpawnTimer-=dt;if(starSpawnTimer<=0){trySpawnPowerStar();starSpawnTimer=12+Math.random()*8;}
if(autoMode)updateAutoPlayer(dt);
if(window.coopTest?.hostActive)window.coopTest.update(dt);
if(runStats){runStats.elapsed+=dt;if(life<upgrades.maxLife*.35)runStats.lowHpTime+=dt;}
triggerCatInstinct();if(dogRelaxTime>0)dogRelaxTime=Math.max(0,dogRelaxTime-dt);updateAvalanche(dt);
if(starActive){
starTime-=dt;
updatePowerStarLoop();
starTwinkleTimer-=dt;
if(starTime>0&&starTwinkleTimer<=0){const sr=Math.max(0,Math.min(1,starTime/10));playStarTwinkle(sr);starTwinkleTimer=.18+(1-sr)*.30;}
if(starTime>0&&starTime<=3&&!starWarningPlayed){
  starWarningPlayed=true;
  showFloatingText({x:player.x,y:player.y-88,text:"⭐ ¡Se acaba!",life:1.2,maxLife:1.2,big:false});
  makeSmoke(player.x,player.y);
  playStarTwinkle(.28);
}
if(starTime<=0){
  if(hasDoneFusionPair("damageReduction+luck")){safeTeleportInvulnUntil=Math.max(safeTeleportInvulnUntil,gameNow()+(800+1700*fusionStrength("damageReduction+luck")));showFloatingText({x:player.x,y:player.y-90,text:"🔰 Amuleto protector",life:1.2,maxLife:1.2,big:false});}
  stopPowerStarLoop();
  starActive=false;
  starTime=0;
  starWarningPlayed=false;
  showFloatingText({x:player.x,y:player.y-65,text:"⭐ La estrella se apagó",life:1.1,maxLife:1.1,big:false});
}
}

if(sevenLivesCooldown>0)sevenLivesCooldown=Math.max(0,sevenLivesCooldown-dt);
if(sevenLivesTime>0){
  sevenLivesTime=Math.max(0,sevenLivesTime-dt);
  if(sevenLivesTime>0&&sevenLivesTime<=2.2&&Math.random()<.13){
    showFloatingText({x:player.x,y:player.y-68,text:"🐱 protección acabando",life:.45,maxLife:.45,big:false});
  }
  if(sevenLivesTime<=0){
    showFloatingText({x:player.x,y:player.y-62,text:"🐱 Siete vidas se apagó",life:1,maxLife:1,big:false,important:true});
  }
}

if(isSevenLivesActive()&&gameNow()-lastStarTrail>55){
  lastStarTrail=gameNow();
  for(let i=0;i<3;i++){const a=Math.random()*Math.PI*2; sparkles.push({x:player.x+Math.cos(a)*16,y:player.y+Math.sin(a)*16,vx:Math.cos(a)*(20+Math.random()*55),vy:Math.sin(a)*(20+Math.random()*55),size:3+Math.random()*4,life:.42,maxLife:.42,color:i%2?"#80ed99":"#ffd166"});}
}

if(isPowerStarActive()&&gameNow()-lastStarTrail>45){
  lastStarTrail=gameNow();
  for(let i=0;i<5;i++){const a=Math.random()*Math.PI*2; sparkles.push({x:player.x-Math.cos(player.angle)*18+Math.cos(a)*18,y:player.y-Math.sin(player.angle)*18+Math.sin(a)*18,vx:Math.cos(a)*(25+Math.random()*65),vy:Math.sin(a)*(25+Math.random()*65),size:3+Math.random()*4,life:.45,maxLife:.45,color:`hsl(${(gameNow()/5+i*45)%360},100%,70%)`});}
}
waveTime-=dt;
if(waveTime<=0&&!boss){
  waveTime=0;
  if(finalCompletionContinue){
    cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});
    wave++;
    thiefCoinsStolenThisWave=0;
    recordNoDamageRoundIfClean();
    life=Math.min(upgrades.maxLife,life+Math.max(1,upgrades.healOnWave*.35));
    startWave();
    updateHud();
    return;
  }
  if(bossVictoryPending){cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});showBossVictoryPanel();return}
  if(shopBossPending){cleanupRoundScreen({keepFloating:true,keepSoftEffects:true});maybeOpenShopOrFusion();return}
  if(!waveUpgradePending){waveUpgradePending=true;cleanupRoundScreen();queueUpgradeMenus("wave",1);}
  return
}
if(waveTime<=0&&boss)waveTime=0;

spawnCooldown-=dt;
if(spawnCooldown<=0&&!boss){
  spawnCat();
  if(roundVariant==="invasion"&&cats.length<getActiveCatCap()&&Math.random()<.65)spawnCat();
  const interval=Math.max(getGamePhase()==="endless"?.075:.20,Math.max(.28,1.10-wave*.033)/getEndlessSpawnMultiplier());
  spawnCooldown=roundVariant==="invasion"?Math.max(.075,interval*.83):interval;
}
if(spawnCooldown<=0&&boss&&boss.type!=="giantCat"){spawnCat();spawnCooldown=getBossReinforcementInterval()}

let mx=0,my=0;
if(keys.w||keys.arrowup)my--;if(keys.s||keys.arrowdown)my++;if(keys.a||keys.arrowleft)mx--;if(keys.d||keys.arrowright)mx++;
const movementLen=Math.hypot(mx,my);
const moveStartX=player.x,moveStartY=player.y;
if(movementLen>0){mx/=movementLen;my/=movementLen;player.x+=mx*player.speed*upgrades.moveSpeed*(bossRewardActive("seal")?1.14:1)*getZoomiesMoveMultiplier()*getStarSpeedMultiplier()*dt;player.y+=my*player.speed*upgrades.moveSpeed*(bossRewardActive("seal")?1.14:1)*getZoomiesMoveMultiplier()*getStarSpeedMultiplier()*dt;
}

player.x=Math.max(player.r,Math.min(canvas.width-player.r,player.x));
player.y=Math.max(player.r,Math.min(canvas.height-player.r,player.y));
if(movementLen>0&&(Math.abs(player.x-moveStartX)>1e-7||Math.abs(player.y-moveStartY)>1e-7)&&hasDoneFusionPair("moveSpeed+xpBoost")){
  fusionMoveXpTimer+=dt;
  const ticks=Math.floor((fusionMoveXpTimer+1e-9)/2.8);
  if(ticks>0){fusionMoveXpTimer=Math.max(0,fusionMoveXpTimer-ticks*2.8);gainXP(ticks);}
}
player.angle=Math.atan2(mouse.y-player.y,mouse.x-player.x);
player.shootAnim=Math.max(0,player.shootAnim-dt);
player.hurtAnim=Math.max(0,player.hurtAnim-dt);

if(upgrades.braveHeart&&life<upgrades.maxLife*.35&&Math.random()<.025){showFloatingText({x:player.x,y:player.y-60,text:"💗 Corazón valiente",life:.75,maxLife:.75,big:false})}
if(isZoomiesActive()&&Math.random()<.018){showFloatingText({x:player.x,y:player.y-72,text:"💨 ZOOMIES",life:.65,maxLife:.65,big:false})}
shootAutoFish();
updateOmniBurst();
updateDog(dt);
updateShield(dt);
updateBoss(dt);
if(isCombatTargetAvailable(boss))tickSaltEffect(boss,dt);
if(isCombatTargetAvailable(boss)&&Math.hypot(player.x-boss.x,player.y-boss.y)<player.r+boss.r-8)damageBoss(getPlayerBodyDamagePerSecond()*dt);
if(runStats){const nearbyCats=cats.some(c=>isFinitePos(c)&&Math.hypot(player.x-c.x,player.y-c.y)<190);const nearbyBoss=boss&&Math.hypot(player.x-boss.x,player.y-boss.y)<boss.r+210;if(nearbyCats||nearbyBoss)runStats.enemiesNearTime+=dt;}
if(isPowerStarActive()&&boss&&Math.hypot(player.x-boss.x,player.y-boss.y)<player.r+boss.r+18){damageBoss(Math.max(1.5,upgrades.damage*getZoomiesDamageMultiplier()*18*dt));}

fishes.forEach(fish=>{
if(fish.ramFish){fish.prevX=fish.x;fish.prevY=fish.y;}
fish.age=(fish.age||0)+dt;
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
}else if(!fish.ramFish&&!fish.giantEaster)applyAimAssist(fish);
fish.x+=fish.vx*dt;fish.y+=fish.vy*dt;fish.life-=dt;
addRamFishTrail(fish,dt);
if(fish.ramFish&&fish.boomerang&&!fish.returning&&(fish.x<20||fish.x>canvas.width-20||fish.y<20||fish.y>canvas.height-20)){
  fish.returning=true;
  fish.x=Math.max(20,Math.min(canvas.width-20,fish.x));
  fish.y=Math.max(20,Math.min(canvas.height-20,fish.y));
}
});
for(let i=fishes.length-1;i>=0;i--){const fish=fishes[i];if(fish.life<=0||(!fish.giantEaster&&(fish.x<-120||fish.x>canvas.width+120||fish.y<-120||fish.y>canvas.height+120))){if(runStats&&(!fish.hitIds||fish.hitIds.size===0))runStats.fishMisses++;fishes.splice(i,1)}}

const activeRamFishShots=fishes.filter(f=>f.ramFish&&f.ramFullyCharged===true&&isFinitePos(f));
for(let q=quacks.length-1;q>=0;q--){
const quack=quacks[q],prevX=quack.x,prevY=quack.y;
quack.x+=quack.vx*dt;quack.y+=quack.vy*dt;quack.life-=dt;
if(breakProjectileWithRamFish(quack,prevX,prevY,activeRamFishShots,"#ffd166")){
  dropCoins(quack.x,quack.y,.3);quacks.splice(q,1);continue;
}
if(Math.hypot(player.x-quack.x,player.y-quack.y)<player.r+quack.r){takePlayerDamage(14,"Te ha dado un QUACK 🦆",.2);makeSmoke(quack.x,quack.y);quacks.splice(q,1);continue}
if(quack.life<=0||quack.x<-100||quack.x>canvas.width+100||quack.y<-100||quack.y>canvas.height+100)quacks.splice(q,1)
}

for(let i=demonOrbs.length-1;i>=0;i--){
const orb=demonOrbs[i],prevX=orb.x,prevY=orb.y;
orb.x+=orb.vx*dt;orb.y+=orb.vy*dt;orb.life-=dt;
if(breakProjectileWithRamFish(orb,prevX,prevY,activeRamFishShots,"#b197fc")){
  demonOrbs.splice(i,1);continue;
}
if(Math.hypot(player.x-orb.x,player.y-orb.y)<player.r+orb.r){
if((orb.bodySafeUntil||0)>gameNow())continue;
const canDamage=gameNow()-lastDemonOrbDamageAt>=180;
if(canDamage){
  lastDemonOrbDamageAt=gameNow();
  takePlayerDamage(orb.damage,"El demonio oscuro te ha destruido 😈",.25);
}
makeSmoke(orb.x,orb.y);demonOrbs.splice(i,1);continue
}
for(let j=fishes.length-1;j>=0;j--){
const fish=fishes[j];if(!isFinitePos(fish)||(fish.ramFish&&fish.ramFullyCharged!==true&&(orb.reinforced||orb.hitsLeft>1)))continue;
if(Math.hypot(fish.x-orb.x,fish.y-orb.y)<orb.r+12*(fish.scale||1)){
if(!fish.orbsHit)fish.orbsHit=new WeakSet();
if(fish.orbsHit.has(orb))continue;
fish.orbsHit.add(orb);
orb.hitsLeft=(orb.hitsLeft||1)-1;
makeSmoke(orb.x,orb.y);
if(orb.hitsLeft<=0)demonOrbs.splice(i,1);
if(!fish.pierce)fishes.splice(j,1);
break;
}
}
if(demonOrbs[i]===orb&&(orb.life<=0||orb.x<-120||orb.x>canvas.width+120||orb.y<-120||orb.y>canvas.height+120))demonOrbs.splice(i,1)
}

for(let i=yarnBalls.length-1;i>=0;i--){
const y=yarnBalls[i],prevX=y.x,prevY=y.y;
y.x+=y.vx*dt;y.y+=y.vy*dt;y.life-=dt;y.spin=(y.spin||0)+dt*8;
if(breakProjectileWithRamFish(y,prevX,prevY,activeRamFishShots,"#b197fc")){
  yarnBalls.splice(i,1);continue;
}
if(Math.hypot(player.x-y.x,player.y-y.y)<player.r+y.r){
takePlayerDamage(y.damage,"Los ovillos te han atrapado 🧶",.2);makeSmoke(y.x,y.y);yarnBalls.splice(i,1);
showFloatingText({x:player.x,y:player.y-42,text:"¡ovillo!",life:.8,maxLife:.8,big:false});continue
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
collectCoinDrop(coin);coinsDrops.splice(cd,1);
if(!coin.recovered)showFloatingText({x:player.x,y:player.y-55,text:`+${coin.amount} moneda`,life:.9,maxLife:.9,big:false});
updateHud();checkGameCompletion();maybeOpenShopOrFusion()
}else if(coin.life<=0){if(runStats)runStats.coinsMissed+=coin.amount||1;coinsDrops.splice(cd,1)}
}

for(let td=tunaDrops.length-1;td>=0;td--){
const tuna=tunaDrops[td];tuna.life-=dt;tuna.wobble+=dt*3;
let dx=player.x-tuna.x,dy=player.y-tuna.y,d=Math.hypot(dx,dy);
if(upgrades.coinMagnetRange>0&&fusedUpgradeNames["coinMagnet"]&&d<upgrades.coinMagnetRange&&d>1){const pull=220;tuna.x+=(dx/d)*pull*dt;tuna.y+=(dy/d)*pull*dt;dx=player.x-tuna.x;dy=player.y-tuna.y;d=Math.hypot(dx,dy)}
if(d<player.r+tuna.r+14){
const heal=Math.round(15+Math.random()*10)*Math.max(1,Math.floor(tuna.stacks||1));
life=Math.min(upgrades.maxLife,life+heal);
tunaDrops.splice(td,1);
showFloatingText({x:player.x,y:player.y-62,text:`🐟 +${heal} vida`,life:1.1,maxLife:1.1,big:false});
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
showFloatingText({x:star.x,y:star.y-28,text:"⭐",life:.7,maxLife:.7,big:false});
}
}

const musicianPositions=cats.filter(c=>c.type==="musician"&&!c.dead&&isFinitePos(c)).map(c=>({x:c.x,y:c.y}));
if(musicianPositions.length>0&&!paused&&!gameOver){musicianNoteTimer-=dt;if(musicianNoteTimer<=0){playMusicianNote();musicianNoteTimer=.36;}}else if(musicianPositions.length===0){musicianNoteTimer=0;}
cats.slice().forEach(cat=>{
if(!isFinitePos(cat)||cat.dead)return;
if(tickSaltEffect(cat,dt))return;
if(isOctopusTentacle(cat)){
  if(isCombatTargetAvailable(cat)&&isPowerStarActive()&&Math.hypot(player.x-cat.x,player.y-cat.y)<player.r+cat.r+10)killCat(cats.indexOf(cat),cat);
  return;
}
if(cat.spawnAnim>0)cat.spawnAnim=Math.max(0,cat.spawnAnim-dt);
let dx=player.x-cat.x,dy=player.y-cat.y,dist=Math.hypot(dx,dy)||1;
cat.wobble+=dt*7;cat.damageCooldown=Math.max(0,cat.damageCooldown-dt);cat.hitAnim=Math.max(0,cat.hitAnim-dt);cat.stealCooldown=Math.max(0,(cat.stealCooldown||0)-dt);cat.fleeTimer=Math.max(0,(cat.fleeTimer||0)-dt);cat.freezeTimer=Math.max(0,(cat.freezeTimer||0)-dt);cat.musicImmuneTimer=Math.max(0,(cat.musicImmuneTimer||0)-dt);
if(cat.freezeTimer>0){cat.hitAnim=Math.max(cat.hitAnim,.12);return;}
if(isPowerStarActive()&&dist<player.r+cat.r+10){killCat(cats.indexOf(cat),cat);return;}
if(dist<player.r+cat.r-4){
  cat.hp-=getPlayerBodyDamagePerSecond()*dt;
  cat.hitAnim=Math.max(cat.hitAnim,.08);
  if(cat.hp<=0){killCat(cats.indexOf(cat),cat);return;}
}
const walkX=cat.x,walkY=cat.y,trailSlow=getRamTrailSlow(cat)*(cat.saltTime>0&&hasDoneFusionPair("catSlow+saltScales")?.92:1);
if(cat.type==="yarn"){
  cat.yarnCooldown-=dt;
  if(cat.yarnCooldown<=0&&isCatOnScreen(cat)){
    const hpRatio=Math.max(0,Math.min(1,cat.hp/cat.maxHp));
    const rage=1+(1-hpRatio)*1.65;
    cat.yarnCooldown=Math.max(.42,(2.25-wave*.032)/rage);
    const a=Math.atan2(player.y-cat.y,player.x-cat.x),spd=190+wave*7+(1-hpRatio)*70;
    const burst=hpRatio<.35?2:1;
    for(let by=0;by<burst;by++){
      if(yarnBalls.length>=getProjectileCap("yarn"))break;
      const aa=a+(by===0?0:(Math.random()<.5?-.18:.18));
      yarnBalls.push({x:cat.x+Math.cos(aa)*cat.r,y:cat.y+Math.sin(aa)*cat.r,vx:Math.cos(aa)*spd,vy:Math.sin(aa)*spd,r:13,life:4.2,damage:8+wave*.28,spin:0});
    }
    showFloatingText({x:cat.x,y:cat.y-38,text:hpRatio<.35?"🧶🧶":"🧶",life:.55,maxLife:.55,big:false});
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
      thiefCoinsStolenThisWave+=stolen;addAchievementStat("coinsStolen",stolen,{run:true});
      cat.stolenCoins=(cat.stolenCoins||0)+stolen;
      cat.stealCooldown=1.8;
      cat.fleeTimer=2.8;
      player.hurtAnim=.12;
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
  if(cat.rushTimer<=0){cat.sleepState="sleeping";showFloatingText({x:cat.x,y:cat.y-38,text:"💤 vuelve a dormir",life:.7,maxLife:.7,big:false});}
  }
}else if(cat.type==="mini"){
  const perp=-Math.atan2(dx,dy);const zz=Math.sin((cat.zigzagPhase||0)+gameNow()*.005)*34;
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(perp)*zz*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(perp)*zz*dt;
}else if(cat.type==="glutton"){
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(cat.wobble)*4*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(cat.wobble)*4*dt;
}else if(cat.type==="musician"){
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(cat.wobble)*8*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(cat.wobble)*8*dt;
}else{
  cat.x+=(dx/dist)*cat.speed*dt+Math.cos(cat.wobble)*9*dt;cat.y+=(dy/dist)*cat.speed*dt+Math.sin(cat.wobble)*9*dt;
}
if(musicianPositions.length>0&&cat.type!=="musician"){
  const nearM=musicianPositions.some(m=>Math.hypot(m.x-cat.x,m.y-cat.y)<240);
  if(nearM){
    cat.x+=(dx/dist)*cat.speed*.52*dt;
    cat.y+=(dy/dist)*cat.speed*.52*dt;
    cat.damageCooldown=Math.max(0,cat.damageCooldown-dt*.35);
    if(Math.random()<.006)showFloatingText({x:cat.x,y:cat.y-cat.r-12,text:"♪ rápido",life:.45,maxLife:.45,big:false});
  }
}
cat.x=walkX+(cat.x-walkX)*trailSlow;cat.y=walkY+(cat.y-walkY)*trailSlow;
if(cat.knockVx||cat.knockVy){cat.x+=(cat.knockVx||0)*dt;cat.y+=(cat.knockVy||0)*dt;cat.knockVx=(cat.knockVx||0)*Math.pow(.08,dt);cat.knockVy=(cat.knockVy||0)*Math.pow(.08,dt);if(Math.abs(cat.knockVx)<8)cat.knockVx=0;if(Math.abs(cat.knockVy)<8)cat.knockVy=0;}
cat.x=Math.max(-240,Math.min(canvas.width+240,cat.x));cat.y=Math.max(-240,Math.min(canvas.height+240,cat.y));
if(Math.hypot(player.x-cat.x,player.y-cat.y)<player.r+cat.r-4&&cat.damageCooldown<=0&&isCatOnScreen(cat)){
  const dmg=cat.type==="thief"?6:cat.type==="yarn"?8:cat.type==="glutton"?14:cat.type==="musician"?9:cat.type==="sleepy"&&cat.sleepState==="awake"?16:7;
  const hitTxt=cat.type==="yarn"?"¡lana!":cat.type==="glutton"?"¡ñam ñam! 🍽️":cat.type==="musician"?"¡mi música! 🎵":cat.type==="mini"?"¡ayy! 🐱":cat.type==="sleepy"&&cat.sleepState==="awake"?"¡rabia somnolienta! 😤":"auch, miau!";
  takePlayerDamage(dmg,"Te han invadido los gatitos 🐱",.18);cat.damageCooldown=.75;makeHearts(player.x,player.y);
  if(cat.type!=="thief")showFloatingText({x:player.x,y:player.y-38,text:hitTxt,life:.9,maxLife:.9,big:false})
}
});

for(let i=cats.length-1;i>=0;i--){
const cat=cats[i];
if(!isCombatTargetAvailable(cat))continue;
if(!isCatOnScreen(cat))continue;
for(let j=fishes.length-1;j>=0;j--){
const fish=fishes[j];
if(!isFinitePos(fish))continue;
const dx=cat.x-fish.x,dy=cat.y-fish.y,hitRadius=cat.r+14*(fish.scale||1);
if(Math.abs(dx)>=hitRadius||Math.abs(dy)>=hitRadius)continue;
const d=Math.hypot(dx,dy);
if(d<hitRadius){
const hitTargetId=getYarnTargetId(cat);
if(!fish.hitIds)fish.hitIds=new Set();
if(fish.hitIds.has(hitTargetId))continue;
if(fish.hitIds.size===0&&runStats)runStats.fishHitProjectiles++;
fish.hitIds.add(hitTargetId);
const hitX=cat.x, hitY=cat.y;
const dealt=Number.isFinite(fish.damage)?fish.damage:1;
if(cat.type==="musician"&&(cat.musicImmuneTimer||0)>0){
  if(runStats)runStats.fishHits++;
  cat.hitAnim=.12;
  makeImpact(hitX,hitY,"#d084c8",.45);
  showFloatingText({x:hitX,y:hitY-32,text:"♪ protegido",life:.45,maxLife:.45,big:false});
  if(!fish.pierce)fishes.splice(j,1);else if(!fish.ramFish&&!fish.giantEaster)fish.damage*=getPiercingDamageRetention();
  continue;
}
const healthLost=Math.min(Math.max(0,cat.hp),Math.max(0,dealt));
cat.hp-=dealt;
if(cat.hp>0)applySaltEffect(cat,fish);
criticalReturnRipple(fish,hitX,hitY,cat);
if(runStats)runStats.fishHits++;
cat.hitAnim=.15;
if(cat.type==="musician"&&cat.hp>0)cat.musicImmuneTimer=1;

if(!fish.pierce)fishes.splice(j,1);else if(!fish.ramFish&&!fish.giantEaster)fish.damage*=getPiercingDamageRetention();

try{makeImpact(hitX,hitY,cat.type==="yarn"?"#b197fc":cat.type==="thief"?"#ffd166":cat.type==="sleepy"?"#c8b6e2":cat.type==="mini"?"#ffb347":cat.type==="glutton"?"#e8956d":cat.type==="musician"?"#d084c8":"#ffc2d1",.65)}catch(e){console.warn(e)}
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
showFloatingText({x:cat.x,y:cat.y-48,text:"😤 ¡DESPERTÓ!",life:1.15,maxLife:1.15,big:false});
}
if(upgrades.lifeSteal>0)life=Math.min(upgrades.maxLife,life+healthLost*getCurrentLifeSteal());
if(cat.type!=="thief")showFloatingText({x:hitX,y:hitY-34,text:cat.rainbow?"🌈 miua!":Math.random()<.5?"miua!":"miau!",life:.65,maxLife:.65,big:false});
if(fish.ramFish&&cat.hp>0){
  const direction=Math.atan2(fish.vy,fish.vx);
  const force=fish.ramKnockback||getRamFishKnockback();
  cat.knockVx=(cat.knockVx||0)+Math.cos(direction)*force;
  cat.knockVy=(cat.knockVy||0)+Math.sin(direction)*force;
}
if(cat.hp<=0){if(fish.giantEaster)cat.leviathanLoot=true;killCat(i,cat);}
break
}
}
}

if(isCombatTargetAvailable(boss)){
for(let j=fishes.length-1;j>=0;j--){
if(!isCombatTargetAvailable(boss))break;
const fish=fishes[j],d=Math.hypot(boss.x-fish.x,boss.y-fish.y);
if(d<boss.r+16*(fish.scale||1)){
const bossYarnId=getYarnTargetId(boss);
if(!fish.hitIds)fish.hitIds=new Set();
if(fish.hitIds.has(bossYarnId))continue;
if(fish.hitIds.size===0&&runStats)runStats.fishHitProjectiles++;
fish.hitIds.add(bossYarnId);
const hitX=fish.x, hitY=fish.y;
const dealt=Number.isFinite(fish.damage)?fish.damage:1;
if(runStats)runStats.fishHits++;
const hitBoss=boss;
damageBoss(dealt,!!fish.giantEaster);
criticalReturnRipple(fish,hitX,hitY,hitBoss);
if(boss===hitBoss&&isCombatTargetAvailable(boss))applySaltEffect(boss,fish);
if(!fish.pierce){if(fishes[j]===fish)fishes.splice(j,1);}
else if(!fish.ramFish&&!fish.giantEaster)fish.damage*=getPiercingDamageRetention();
try{spawnYarnBounce(hitX,hitY,bossYarnId,fish.yarnVisitedIds||[])}catch(e){console.warn(e)}
}
}
}

for(let q=quacks.length-1;q>=0;q--){
for(let j=fishes.length-1;j>=0;j--){
const fish=fishes[j],quack=quacks[q];if(!quack)break;
const d=Math.hypot(quack.x-fish.x,quack.y-fish.y);
if(d<quack.r+14*(fish.scale||1)){if(!fish.hitIds)fish.hitIds=new Set();const qid=getYarnTargetId(quack);if(fish.hitIds.has(qid))continue;fish.hitIds.add(qid);quack.hp-=fish.damage;makeImpact(quack.x,quack.y,"#ffd166",.7);if(!fish.pierce)fishes.splice(j,1);if(quack.hp<=0){makeSmoke(quack.x,quack.y);if(fish.giantEaster)guaranteedLeviathanLoot(quack.x,quack.y);else dropCoins(quack.x,quack.y,.3);quacks.splice(q,1)}break}
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

limitArray(hearts,getEntityLimit(120,42));
limitArray(smokes,getEntityLimit(160,52));
limitArray(shockwaves,getEntityLimit(20,8));
limitArray(sparkles,getEntityLimit(180,50));
limitArray(floatingTexts,getEntityLimit(42,16));
limitArray(pawPrints,getEntityLimit(28,8));

limitActiveFishProjectiles(140);
limitActiveCats(getActiveCatCap());
limitArray(quacks,getProjectileCap("quack"));
compactLootDrops(coinsDrops,90,"coin");
limitArray(dogBones,80);
limitArray(demonOrbs,getProjectileCap("orb"));
limitArray(yarnBalls,getProjectileCap("yarn"));
compactLootDrops(tunaDrops,70,"tuna");
limitArray(powerStars,2);
updateHud()
}

function setHudText(element,value){
if(element){const text=String(value);if(element.textContent!==text)element.textContent=text;}
}
function setHudWidth(element,value){
if(element.style.width!==value)element.style.width=value;
}
const ramFishCooldownEl=document.getElementById("ramFishCooldown");
function updateHud(){
if(ramFishCooldownEl){
  const remaining=Math.max(0,(getRamFishCooldownMs()-(gameNow()-lastRamFishAt))/1000);
  setHudText(ramFishCooldownEl,remaining>0?`${remaining.toFixed(1)} s`:"¡LISTO!");
  const isReady=remaining<=0;
  if(ramFishCooldownEl.classList.contains("ready")!==isReady)ramFishCooldownEl.classList.toggle("ready",isReady);
}
setHudText(scoreEl,score);
setHudText(shotsEl,runStats?Math.floor(runStats.fishHits||0):0);
setHudText(lifeEl,Math.ceil(life));setHudText(levelEl,level);setHudText(xpEl,xp);setHudText(xpNeedEl,xpNeed);setHudText(waveEl,wave);setHudText(coinsEl,coins);setHudText(timeLeftEl,boss&&waveTime<=0?"Jefe":Math.ceil(waveTime));
setHudWidth(lifeBar,`${Math.max(0,(life/upgrades.maxLife)*100)}%`);setHudWidth(xpBar,`${Math.min(100,(xp/xpNeed)*100)}%`);setHudWidth(timeBar,`${Math.max(0,(waveTime/waveDuration)*100)}%`);
if(helpEl){const hidden=gameStarted&&wave>=3;if(helpEl.classList.contains("hiddenAfterIntro")!==hidden)helpEl.classList.toggle("hiddenAfterIntro",hidden);}
updateObjectivePanel();
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

let ambientRandSeed=null,ambientRandCache=[],ambientCycles=[],ambientEnabled=[];
function ambientFishRand(i,offset=0){
if(ambientRandSeed!==backgroundFishSeed){ambientRandSeed=backgroundFishSeed;ambientRandCache=[];ambientCycles=[];ambientEnabled=[];}
const row=ambientRandCache[i]||(ambientRandCache[i]=[]);
if(row[offset]!==undefined)return row[offset];
const x=Math.sin((backgroundFishSeed+1)*12.9898+(i+1)*78.233+offset*37.719)*43758.5453;
return row[offset]=x-Math.floor(x);
}

function drawAmbientBackgroundFish(now){
const count=10;
const specialPalette=["#89baca","#a5c9d5","#82adb9","#b4d3d9"];
for(let i=0;i<count;i++){
  const dir=ambientFishRand(i,1)<.5?1:-1;
  const speed=15+ambientFishRand(i,2)*24;
  const lane=(i+ambientFishRand(i,3))/(count+1);
  const bandY=canvas.height*(.10+lane*.76);
  const bob=8+ambientFishRand(i,4)*22;
  const y=bandY+Math.sin(now*(.00016+ambientFishRand(i,5)*.00018)+ambientFishRand(i,6)*Math.PI*2)*bob;
  const phaseOffset=ambientFishRand(i,7)*(canvas.width+300);
  const totalTravel=now*.001*speed+phaseOffset;
  const cycle=Math.floor(totalTravel/(canvas.width+300));
  if(ambientCycles[i]!==cycle){ambientCycles[i]=cycle;ambientEnabled[i]=!lowPerfMode||i<5;}
  if(!ambientEnabled[i])continue;
  const travel=totalTravel%(canvas.width+300);
  const x=dir>0?travel-150:canvas.width-travel+150;
  const isLarge=ambientFishRand(i,8)>.72;
  const scale=.43+ambientFishRand(i,9)*.34+(isLarge?.20:0);
  const alpha=.075+ambientFishRand(i,10)*.035;
  const tint=specialPalette[Math.floor(ambientFishRand(i,11)*specialPalette.length)%specialPalette.length];
  drawOneAmbientFish(x,y,dir,scale,alpha,tint,now*(.00032+ambientFishRand(i,12)*.00035)+ambientFishRand(i,13)*6,false);
}

{
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

const heartCount=0;
for(let h=0;h<heartCount;h++){
  const cycle=23000+ambientFishRand(120+h,1)*16000;
  const phase=((now+ambientFishRand(120+h,2)*cycle)%cycle)/cycle;
  const x=canvas.width*(phase*1.22-.11);
  const y=canvas.height*(.16+ambientFishRand(120+h,3)*.62)+Math.sin(now*(.00022+ambientFishRand(120+h,4)*.00022)+h)*18;
  const alpha=.025+Math.sin(phase*Math.PI)*(.035+ambientFishRand(120+h,5)*.035);
  drawAmbientBackgroundHeart(x,y,.28+ambientFishRand(120+h,6)*.22,alpha,Math.sin(now*.00025+h)*.18,ambientFishRand(120+h,7)<.5?"rgba(255,174,204,1)":"rgba(255,122,168,1)");
}
}

const ambientFishArtCache=new Map();
function drawOneAmbientFish(x,y,dir,scale,alpha,tint,wave,giant){
let art=ambientFishArtCache.get(tint);
if(!art){
 art=document.createElement('canvas');art.width=160;art.height=96;const c=art.getContext('2d');c.scale(2,2);c.translate(48,24);
 c.fillStyle=tint;c.beginPath();c.moveTo(26,0);c.bezierCurveTo(20,-10,9,-13,-1,-12);c.quadraticCurveTo(-7,-22,-14,-17);c.lineTo(-11,-9);c.quadraticCurveTo(-19,-7,-23,-3);c.quadraticCurveTo(-32,-10,-39,-11);c.quadraticCurveTo(-35,0,-39,11);c.quadraticCurveTo(-29,9,-23,3);c.quadraticCurveTo(-18,9,-7,11);c.quadraticCurveTo(-8,17,1,12);c.bezierCurveTo(14,13,23,7,26,0);c.closePath();c.fill();
 c.fillStyle='#d2eaf1';c.beginPath();c.ellipse(0,5,14,3,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#648e9e';c.lineWidth=1;c.beginPath();c.moveTo(10,-6);c.quadraticCurveTo(6,0,10,6);c.moveTo(-5,0);c.quadraticCurveTo(-11,6,-12,3);c.stroke();
 c.fillStyle='#264d60';c.beginPath();c.arc(18,-2,1.9,0,Math.PI*2);c.fill();c.fillStyle='#eafaff';c.beginPath();c.arc(18.4,-2.5,.6,0,Math.PI*2);c.fill();
 ambientFishArtCache.set(tint,art);
}
ctx.save();ctx.translate(x,y);ctx.scale(dir<0?-scale:scale,scale);ctx.rotate(Math.sin(wave||0)*(giant?.035:.055));ctx.globalAlpha=alpha;ctx.shadowBlur=0;ctx.drawImage(art,-48,-24,80,48);ctx.restore();
}

let backdropCache=null;
function getBackdrop(){
if(backdropCache&&backdropCache.width===canvas.width&&backdropCache.height===canvas.height)return backdropCache;
const layer=document.createElement("canvas");layer.width=canvas.width;layer.height=canvas.height;
const ctx=layer.getContext("2d");
const gradient=ctx.createLinearGradient(0,0,0,canvas.height);
gradient.addColorStop(0,"#123a52");gradient.addColorStop(.55,"#102f47");gradient.addColorStop(1,"#0a2036");
ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);

const glow1=ctx.createRadialGradient(canvas.width*.22,canvas.height*.2,0,canvas.width*.22,canvas.height*.2,canvas.width*.55);
glow1.addColorStop(0,"rgba(124,212,235,.14)");glow1.addColorStop(.48,"rgba(124,212,235,.045)");glow1.addColorStop(1,"rgba(124,212,235,0)");
ctx.fillStyle=glow1;ctx.fillRect(0,0,canvas.width,canvas.height);
const glow2=ctx.createRadialGradient(canvas.width*.82,canvas.height*.82,0,canvas.width*.82,canvas.height*.82,canvas.width*.52);
glow2.addColorStop(0,"rgba(76,201,240,.16)");glow2.addColorStop(.5,"rgba(76,201,240,.05)");glow2.addColorStop(1,"rgba(76,201,240,0)");
ctx.fillStyle=glow2;ctx.fillRect(0,0,canvas.width,canvas.height);

const vignette=ctx.createRadialGradient(canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.18,canvas.width/2,canvas.height/2,Math.max(canvas.width,canvas.height)*.72);
vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(5,3,12,.34)");
ctx.fillStyle=vignette;ctx.fillRect(0,0,canvas.width,canvas.height);
backdropCache=layer;return layer;
}
function drawBackground(){
ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.globalCompositeOperation="source-over";
ctx.drawImage(getBackdrop(),0,0);
const now=performance.now();
drawAmbientBackgroundFish(now);

{
for(let i=0;i<24;i++){
  const x=(i*173+now*.012*(1+i%3))%canvas.width;
  const y=(i*97+Math.sin(now*.0007+i)*10)%canvas.height;
  const r=1.2+(i%5)*.55;
  ctx.globalAlpha=.07+(i%4)*.014;
  ctx.fillStyle="#b6dbe8";
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
ctx.globalAlpha=1;
}

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

function softCatHead(r,color){
ctx.fillStyle=color;ctx.strokeStyle="#443454";ctx.lineWidth=2.2;ctx.lineJoin="round";
ctx.beginPath();ctx.moveTo(-r*.83,-r*.34);ctx.lineTo(-r*.86,-r*1.24);ctx.quadraticCurveTo(-r*.72,-r*1.32,-r*.36,-r*.87);ctx.quadraticCurveTo(0,-r*1.04,r*.36,-r*.87);ctx.quadraticCurveTo(r*.72,-r*1.32,r*.86,-r*1.24);ctx.lineTo(r*.83,-r*.34);ctx.bezierCurveTo(r*1.22,r*.28,r*.72,r*.96,0,r*.96);ctx.bezierCurveTo(-r*.72,r*.96,-r*1.22,r*.28,-r*.83,-r*.34);ctx.closePath();ctx.fill();ctx.stroke();
ctx.fillStyle="#f3a5bf";
for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.69,-r*.97);ctx.lineTo(side*r*.65,-r*.48);ctx.lineTo(side*r*.39,-r*.72);ctx.closePath();ctx.fill();}
ctx.fillStyle="rgba(255,255,255,.19)";ctx.beginPath();ctx.ellipse(-r*.22,-r*.60,r*.34,r*.13,-.12,0,Math.PI*2);ctx.fill();
ctx.fillStyle="rgba(255,157,190,.48)";for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*r*.62,r*.20,r*.19,r*.11,0,0,Math.PI*2);ctx.fill();}
}
function softCatFace(r){
ctx.fillStyle="#392747";for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*r*.30,-r*.08,r*.095,r*.13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(side*r*.30-r*.02,-r*.12,r*.028,0,Math.PI*2);ctx.fill();ctx.fillStyle="#392747";}
ctx.fillStyle="#c56d95";ctx.beginPath();ctx.moveTo(-r*.09,r*.13);ctx.lineTo(r*.09,r*.13);ctx.lineTo(0,r*.23);ctx.closePath();ctx.fill();
ctx.strokeStyle="#49304f";ctx.lineWidth=1.5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,r*.23);ctx.quadraticCurveTo(-r*.13,r*.43,-r*.23,r*.28);ctx.moveTo(0,r*.23);ctx.quadraticCurveTo(r*.13,r*.43,r*.23,r*.28);ctx.stroke();
for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.56,r*.12);ctx.lineTo(side*r*.96,r*.05);ctx.moveTo(side*r*.57,r*.30);ctx.lineTo(side*r*.96,r*.36);ctx.stroke();}
}
function softFishBody(color,tail){
ctx.lineJoin="round";ctx.lineWidth=1.6;ctx.strokeStyle="#285874";
ctx.fillStyle=tail;ctx.beginPath();ctx.moveTo(-12,0);ctx.quadraticCurveTo(-20,-5,-25,-9);ctx.quadraticCurveTo(-28,-9,-26,-2);ctx.lineTo(-24,0);ctx.lineTo(-26,4);ctx.quadraticCurveTo(-28,10,-24,9);ctx.lineTo(-12,2);ctx.closePath();ctx.fill();ctx.stroke();
ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,16,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.fillStyle="rgba(255,255,255,.32)";ctx.beginPath();ctx.ellipse(-2,-4,8,2,-.12,0,Math.PI*2);ctx.fill();
ctx.strokeStyle="rgba(33,81,110,.45)";ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(-9,4,-4,5);ctx.stroke();
ctx.fillStyle="#233448";ctx.beginPath();ctx.arc(8,-1,2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(8.5,-1.8,.7,0,Math.PI*2);ctx.fill();
}

function drawPlayer(){
const category="player";
if(selectedCosmetic(category)!==category+"_grayscale")return drawPlayerArt();
ctx.save();try{ctx.filter="grayscale(1)";return drawPlayerArt();}finally{ctx.restore();}
}
function drawPlayerArt(){
if(selectedCosmetic("player")==="player_low_poly"){drawLowPolyPlayer();return;}
drawEntityShadow(player.x,player.y,player.r*1.05,player.r*.34,.20);
ctx.save();
ctx.translate(player.x,player.y);
ctx.rotate(player.angle);

const starOn=isPowerStarActive();
const sevenOn=isSevenLivesActive();
const starEnding=starOn&&starTime<=3;
const blinkInvisible=starEnding&&Math.sin(performance.now()*0.035)>0;
const hurtBlink=player.hurtAnim>0;
const hurtBlinkLow=hurtBlink&&Math.sin(performance.now()*0.07)>0;
const hurtScale=hurtBlink?1.08:1;
const starPulse=starOn?1+Math.sin(performance.now()*0.018)*.08:(sevenOn?1+Math.sin(performance.now()*0.025)*.05:1);
ctx.scale(hurtScale*starPulse,hurtScale*starPulse);
if(hurtBlink&&!starOn&&!sevenOn)ctx.globalAlpha=hurtBlinkLow?.42:.96;

if(starOn){
  ctx.shadowColor=starEnding?"#ff4d8d":"#ffd166";
  ctx.shadowBlur=starEnding?34:22;
  if(starEnding&&blinkInvisible)ctx.globalAlpha=.42;
}else if(sevenOn){
  ctx.shadowColor=sevenLivesTime<=2.2?"#ffd166":"#80ed99";
  ctx.shadowBlur=sevenLivesTime<=2.2?30:22;
  if(sevenLivesTime<=2.2&&Math.sin(performance.now()*0.04)>0)ctx.globalAlpha=.62;
}

const bodyColor=starOn?`hsl(${(performance.now()/6)%360},100%,70%)`:(sevenOn?"#80ed99":(player.hurtAnim>0?"#ff6b9a":getPlayerSkinColor("#b79ae8")));
ctx.save();ctx.rotate(-player.angle);softCatHead(player.r,bodyColor);softCatFace(player.r);drawPlayerSkinDetails();ctx.restore();

if(hurtBlink&&!starOn&&!sevenOn){
  ctx.save();
  ctx.globalAlpha=.45+.25*Math.abs(Math.sin(performance.now()*0.09));
  ctx.strokeStyle="#fff5f7";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.arc(0,0,player.r+6,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

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
ctx.beginPath();
ctx.ellipse(6,0,12,10,0,0,Math.PI*2);
ctx.fill();
ctx.stroke();
const toes=[{x:24,y:-13,r:4.4},{x:32,y:-5,r:5.1},{x:32,y:5,r:5.1},{x:24,y:13,r:4.4}];
toes.forEach(t=>{ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.stroke()});
ctx.fillStyle="#f17da9";ctx.beginPath();ctx.ellipse(6,0,6,5,0,0,Math.PI*2);ctx.fill();
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
const category="fish";
if(selectedCosmetic(category)!==category+"_grayscale")return drawShieldArt();
ctx.save();try{ctx.filter="grayscale(1)";return drawShieldArt();}finally{ctx.restore();}
}
function drawShieldArt(){
if(!upgrades.shield)return;
const shieldLvl=effectLevel("shield");
const shieldR=52+shieldLvl*4,orbs=2+Math.min(4,shieldLvl),orbSize=12+Math.min(12,shieldLvl*1.7);
for(let i=0;i<orbs;i++){
const a=shieldAngle+i*Math.PI*2/orbs,x=player.x+Math.cos(a)*shieldR,y=player.y+Math.sin(a)*shieldR;
if(selectedCosmetic("fish")==="fish_low_poly"){
  drawLowPolyFish({x,y,angle:a+Math.PI/2,scale:Math.max(.70,orbSize/16),shieldShot:true});
  continue;
}
if(selectedCosmetic("fish")==="fish_realistic"){
  drawRealisticSardineWorld({shieldShot:true},x,y,a+Math.PI/2,orbSize/16);
  continue;
}
ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
ctx.scale(orbSize/16,orbSize/16);
softFishBody(shieldLvl>=5?"#ffd166":"#90e0ef",shieldLvl>=5?"#ffb703":"#48cae4");
drawFishSkinDetails({shieldShot:true});ctx.restore()

}
}

function drawLeviathanFish(f){
  const scale=Math.min(f.scale||1,Math.max(1,Math.min(canvas.width*.66/47,canvas.height*.70/40)));
  ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle||0);ctx.scale(scale,scale);
  ctx.lineJoin="round";ctx.lineCap="round";
  const shape=(points,fill,stroke="#3a184d",width=.85)=>{
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  };
  const line=(points,color,width)=>{
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  };
  shape([[-13,-2],[-23,-13],[-21,-3],[-25,0],[-21,3],[-23,13],[-13,4]],"#8050b0");
  line([[-20,-9],[-14,0],[-20,9]],"#d3a3f3",.7);
  shape([[-12,-8],[-13,-16],[-8,-11],[-6,-20],[-2,-11],[2,-19],[5,-10],[10,-14],[10,-6]],"#6e329d");
  shape([[-11,8],[-11,16],[-6,11],[-3,19],[1,11],[6,16],[8,7]],"#7735a2");
  for(let i=0;i<4;i++){
    const x=-11+i*5;
    shape([[x-2,-9],[x,-(16+(i%2)*3)],[x+3,-10]],"#dfb6fa","#5a247e",.65);
    shape([[x-2,9],[x,15+(i%2)*3],[x+3,10]],"#c796ef","#5a247e",.65);
  }
  const bodyGradient=ctx.createLinearGradient(-6,-12,6,12);
  bodyGradient.addColorStop(0,"#dfb3ff");
  bodyGradient.addColorStop(.35,"#ad69da");
  bodyGradient.addColorStop(.76,"#8a42bb");
  bodyGradient.addColorStop(1,"#67318e");
  ctx.beginPath();ctx.ellipse(-2,0,16,11,0,0,Math.PI*2);
  ctx.fillStyle=bodyGradient;ctx.fill();ctx.strokeStyle="#402055";ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.ellipse(-5,5,9,4.2,-.12,0,Math.PI*2);
  ctx.fillStyle="rgba(237,205,255,.65)";ctx.fill();
  shape([[-9,0],[-14,11],[-3,7],[-2,2]],"#8d48b8");
  line([[-10,3],[-5,5],[-4,7]],"#e5b9fa",.6);
  ctx.beginPath();ctx.moveTo(2,-9);ctx.quadraticCurveTo(15,-13,20,-6);
  ctx.quadraticCurveTo(22,-4,20,-1);ctx.lineTo(10,1);
  ctx.quadraticCurveTo(6,-2,2,-9);ctx.closePath();
  ctx.fillStyle="#a761d2";ctx.fill();ctx.strokeStyle="#4a225e";ctx.lineWidth=.9;ctx.stroke();
  ctx.beginPath();ctx.moveTo(8,-1);ctx.quadraticCurveTo(15,-4,22,-2);
  ctx.lineTo(21,10);ctx.quadraticCurveTo(14,14,8,6);
  ctx.quadraticCurveTo(7,3,8,-1);ctx.closePath();
  ctx.fillStyle="#290f39";ctx.fill();ctx.strokeStyle="#4b1b55";ctx.lineWidth=1.1;ctx.stroke();
  ctx.beginPath();ctx.moveTo(11,5);ctx.quadraticCurveTo(17,8,21,8);
  ctx.lineTo(20,10);ctx.quadraticCurveTo(15,11,11,7);ctx.closePath();
  ctx.fillStyle="#a73378";ctx.fill();
  for(let i=0;i<5;i++){
    const x=10+i*2.5;
    shape([[x,-1.7],[x+1.7,-1.7],[x+.8,2.3+(i%2)*.7]],"#fff9e9","#a18cba",.23);
    shape([[x,7.5+(i%2)*.3],[x+1.8,7.8],[x+.9,3.4-(i%2)*.6]],"#fff9e9","#a18cba",.23);
  }
  ctx.beginPath();ctx.moveTo(8,6);ctx.quadraticCurveTo(15,13,21,10);
  ctx.lineTo(19,12);ctx.quadraticCurveTo(13,16,7,8);ctx.closePath();
  ctx.fillStyle="#b879d9";ctx.fill();ctx.strokeStyle="#4a225e";ctx.lineWidth=.9;ctx.stroke();
  ctx.beginPath();ctx.ellipse(9,-6,2.7,2.4,-.25,0,Math.PI*2);
  ctx.fillStyle="#ffe5a0";ctx.fill();ctx.strokeStyle="#4b225e";ctx.lineWidth=.55;ctx.stroke();
  ctx.beginPath();ctx.ellipse(10,-5.8,1.05,1.55,-.3,0,Math.PI*2);
  ctx.fillStyle="#25102e";ctx.fill();
  ctx.beginPath();ctx.moveTo(4,-10);ctx.lineTo(14,-7.3);
  ctx.strokeStyle="#341241";ctx.lineWidth=2.5;ctx.stroke();
  line([[5,-8],[7,-7.7]],"#e5b5ff",.6);
  ctx.beginPath();ctx.moveTo(3,-5);ctx.quadraticCurveTo(0,-2,3,1);
  ctx.strokeStyle="#6c318a";ctx.lineWidth=.8;ctx.stroke();
  ctx.beginPath();ctx.ellipse(18,-4.5,.7,.45,0,0,Math.PI*2);
  ctx.fillStyle="#502060";ctx.fill();
  ctx.restore();
}
function drawFish(f){
if(f.giantEaster)return drawLeviathanFish(f);
const category="fish";
if(selectedCosmetic(category)!==category+"_grayscale")return drawFishArt(f);
ctx.save();try{ctx.filter="grayscale(1)";return drawFishArt(f);}finally{ctx.restore();}
}
function drawFishArt(f){
if(selectedCosmetic("fish")==="fish_low_poly"){drawLowPolyFish(f);return;}
if(selectedCosmetic("fish")==="fish_realistic"){drawRealisticSardineWorld(f);return;}

drawEntityShadow(f.x,f.y,18*(f.scale||1),5*(f.scale||1),.10);
ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.scale(f.scale||1,f.scale||1);
const skinPalette={fish_pirate:["#e9b87e","#a05e51"],fish_biolum:["#4fbbbc","#216a88"],fish_celestial:["#b6a8e9","#6c68b2"],fish_elegant:["#fff0c7","#c99b45"],fish_heart:["#ff9bbd","#cf4a86"]}[selectedCosmetic("fish")];
const body=f.boomerang&&f.crit&&hasDoneFusionPair("boomerang+critChance")?"#ffe066":f.giantEaster?"#ffd166":f.ramFish?(f.boomerang?"#80ed99":f.crit?"#ff6b6b":"#7ef5ff"):f.cardumenGigante?"#80d8ff":f.boomerang?"#80ed99":f.crit?"#ff6b6b":f.shieldShot?"#6ed7ed":(skinPalette?.[0]||"#6ed7ed");
const tail=f.boomerang&&f.crit&&hasDoneFusionPair("boomerang+critChance")?"#e0a800":f.giantEaster?"#fb8500":f.ramFish?(f.boomerang?"#57cc99":f.crit?"#e03131":"#169fcb"):f.cardumenGigante?"#00b4d8":f.boomerang?"#57cc99":f.crit?"#e03131":f.shieldShot?"#45aecd":(skinPalette?.[1]||"#45aecd");
ctx.shadowColor=body;ctx.shadowBlur=lowPerfMode?0:(f.giantEaster?12:f.crit?7:0);
softFishBody(body,tail);drawFishSkinDetails(f);ctx.restore()

}

function drawCat(cat){
if(isOctopusTentacle(cat)){drawOctopusTentacle(cat);return;}

  const category="enemy";
  if(selectedCosmetic(category)!==category+"_grayscale")drawCatArt(cat);
  else{
    ctx.save();
    try{ctx.filter="grayscale(1)";drawCatArt(cat);}
    finally{ctx.restore();}
  }
}
function drawEnemyIdentity(cat){
ctx.save();ctx.scale(cat.r/24,cat.r/24);ctx.lineJoin="round";ctx.lineCap="round";
const oval=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
const line=(x,y,xx,yy,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();};
if(cat.rainbow){
ctx.strokeStyle='#ffe8a3';ctx.lineWidth=1.5;
for(let i=0;i<3;i++){const angle=performance.now()*.0005+i*Math.PI*2/3,x=Math.cos(angle)*32,y=Math.sin(angle)*29;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();}
ctx.fillStyle='#ffe09a';ctx.strokeStyle='#997645';ctx.beginPath();ctx.moveTo(-13,-23);ctx.lineTo(-15,-34);ctx.lineTo(-6,-29);ctx.lineTo(0,-37);ctx.lineTo(6,-29);ctx.lineTo(15,-34);ctx.lineTo(13,-23);ctx.closePath();ctx.fill();ctx.stroke();
for(const x of [-8,0,8])oval(x,-26,1.8,1.8,x===0?'#f587b6':'#74d5df');
}else if(cat.small){
oval(-15,-22,9,9,'#b38b73');oval(15,-22,9,9,'#b38b73');oval(-15,-22,5,5,'#f8d8ce');oval(15,-22,5,5,'#f8d8ce');
}else if(cat.type==='thief'){
ctx.fillStyle='#36333e';ctx.beginPath();ctx.roundRect(-20,-11,40,13,6);ctx.fill();
oval(-8,-5,4,2.5,'#fff4db');oval(8,-5,4,2.5,'#fff4db');
line(-21,-5,-29,-12,'#36333e',4);line(-21,-5,-31,-3,'#36333e',4);
oval(20,17,9,11,'#bd9973');line(14,9,25,9,'#785d49',3);drawPawCoin(20,17,5);
}else if(cat.type==='yarn'){
oval(16,16,12,12,'#dbc4ee');ctx.strokeStyle='#805caa';ctx.lineWidth=1.6;
for(let i=-1;i<=1;i++){ctx.beginPath();ctx.ellipse(16,16,5+i,10,i*.7,0,Math.PI*2);ctx.stroke();}
ctx.beginPath();ctx.moveTo(5,20);ctx.bezierCurveTo(-6,29,-14,13,-22,20);ctx.stroke();line(10,8,24,21,'#fff1df');
}else if(cat.type==='sleepy'){
ctx.fillStyle=cat.sleepState==='awake'?'#df91ad':'#8875b0';ctx.strokeStyle='#5c4e77';ctx.lineWidth=1.5;
ctx.beginPath();ctx.moveTo(-20,-18);ctx.quadraticCurveTo(-6,-45,17,-29);ctx.lineTo(26,-14);ctx.quadraticCurveTo(7,-22,-20,-18);ctx.fill();ctx.stroke();oval(26,-14,5,5,'#fff1df');line(-18,-18,12,-23,'#fff1df',4);
if(cat.sleepState==='awake'){line(-13,-11,-6,-8,'#784452');line(13,-11,6,-8,'#784452');}else{ctx.fillStyle='#e7d6fa';ctx.font="bold 12px 'Gatitos UI'";ctx.fillText('z',29,-25);}
}else if(cat.type==='mini'){
line(-7,-20,-11,-29,'#9e6749',3);line(0,-22,0,-32,'#9e6749',3);line(7,-20,11,-29,'#9e6749',3);oval(-13,19,7,4,'#fff0d5');oval(13,19,7,4,'#fff0d5');
}else if(cat.type==='glutton'){
ctx.fillStyle='#f8efe0';ctx.strokeStyle='#a77255';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-15,10);ctx.quadraticCurveTo(0,17,15,10);ctx.lineTo(11,29);ctx.quadraticCurveTo(0,34,-11,29);ctx.closePath();ctx.fill();ctx.stroke();oval(0,22,6,3,'#ddac78');ctx.fillStyle='#ddac78';ctx.beginPath();ctx.moveTo(-5,22);ctx.lineTo(-10,18);ctx.lineTo(-10,26);ctx.fill();
}else if(cat.type==='musician'){
ctx.strokeStyle='#59486d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-4,22,Math.PI,Math.PI*2);ctx.stroke();
for(const x of [-22,22]){oval(x,0,6,10,'#a97ec3');oval(x,0,3,7,'#ead5f3');}
line(23,7,12,13,'#59486d');oval(10,13,3,2,'#59486d');
ctx.fillStyle='#f4d393';ctx.font="bold 17px 'Gatitos UI'";ctx.fillText('♪',28,-15);
}else{
for(const x of [-7,0,7])line(x,-19,x*.8,-13,'rgba(105,72,73,.5)',2.5);
}
ctx.restore();
}
function drawCatArt(cat){
if(selectedCosmetic('enemy')==='enemy_low_poly'){drawLowPolyCat(cat);return;}
drawEntityShadow(cat.x,cat.y,cat.r*.9,cat.r*.26,.17);
ctx.save();ctx.translate(cat.x,cat.y);
const spawnScale=cat.maxSpawnAnim?Math.max(.05,1-(cat.spawnAnim||0)/cat.maxSpawnAnim):1;
ctx.scale(spawnScale,spawnScale);const squeeze=cat.hitAnim>0?1.12:1;ctx.scale(squeeze,1/squeeze);
if(cat.type==='musician'||cat.rainbow||Math.hypot(cat.knockVx||0,cat.knockVy||0)>60){
ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle=cat.rainbow?'#fff3c0':(cat.musicImmuneTimer||0)>0?'#ffd166':'#c398df';ctx.lineWidth=(cat.musicImmuneTimer||0)>0?4:1.5;ctx.beginPath();ctx.arc(0,0,cat.r+8,0,Math.PI*2);ctx.stroke();ctx.restore();
}
let color=getEnemySkinBaseColor(cat);
if(cat.rainbow){color=ctx.createLinearGradient(-cat.r,-cat.r,cat.r,cat.r);['#f899bc','#ffe39a','#bfe5aa','#9edfeb','#cbb7ed'].forEach((c,i)=>color.addColorStop(i/4,c));}
softCatHead(cat.r,color);
ctx.save();ctx.scale(cat.r/24,cat.r/24);
ctx.fillStyle='rgba(255,246,231,.65)';ctx.beginPath();ctx.ellipse(0,6,13,9,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#47313e';ctx.strokeStyle='#47313e';ctx.lineWidth=1.7;
if(cat.type==='sleepy'&&cat.sleepState!=='awake'){
for(const x of [-9,9]){ctx.beginPath();ctx.moveTo(x-4,-4);ctx.quadraticCurveTo(x,-1,x+4,-4);ctx.stroke();}
}else{
for(const x of [-9,9]){ctx.fillStyle='#47313e';ctx.beginPath();ctx.ellipse(x,-5,2.7,3.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8f0';ctx.beginPath();ctx.arc(x-.7,-6,.8,0,Math.PI*2);ctx.fill();}
}
ctx.fillStyle='#b36c83';ctx.beginPath();ctx.moveTo(-3,3);ctx.lineTo(3,3);ctx.lineTo(0,6);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(0,6);ctx.quadraticCurveTo(-2,12,-6,8);ctx.moveTo(0,6);ctx.quadraticCurveTo(2,12,6,8);ctx.stroke();
ctx.strokeStyle='#8c6670';ctx.lineWidth=1.3;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*16,3);ctx.lineTo(side*28,0);ctx.moveTo(side*16,8);ctx.lineTo(side*28,10);ctx.stroke();}
ctx.restore();drawEnemyIdentity(cat);drawEnemySkinDetails(cat);
if(cat.saltTime>0){ctx.fillStyle="#fff0b8";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText("✦",0,-cat.r-30);}
if(cat.maxHp>1){ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(-18,-cat.r-26,36,4);ctx.fillStyle=cat.rainbow?'#ffd166':'#ef94b4';ctx.fillRect(-18,-cat.r-26,36*Math.max(0,Math.min(1,cat.hp/cat.maxHp)),4);}
ctx.restore();
}

function getOctopusPalette(){
 const id=selectedCosmetic("boss_octopus");
 if(id==="boss_octopus_elegant")return {top:"#fff4d8",bottom:"#c6ad7b",arm:"#6286aa",outline:"#304a65",sucker:"#ffdf99",elegant:true};
 if(id==="boss_octopus_low_poly")return {top:"#8ceadd",bottom:"#277e99",arm:"#42b8b8",outline:"#18475f",sucker:"#c7fff2",poly:true};
 if(id==="boss_octopus_biolum")return {top:"#3c8f9e",bottom:"#174c69",arm:"#296d8c",outline:"#193950",sucker:"#85f8df"};
 if(id==="boss_octopus_pirate")return {top:"#a65e88",bottom:"#6d416e",arm:"#845478",outline:"#4c3159",sucker:"#edc9af"};
 if(id==="boss_octopus_celestial")return {top:"#b0a4ed",bottom:"#5b4b9e",arm:"#8674c2",outline:"#473e83",sucker:"#f5d58b"};
 if(id==="boss_octopus_grayscale")return {top:"#e5e5e5",bottom:"#818181",arm:"#ababab",outline:"#414141",sucker:"#eeeeee",gray:true};
 return {top:"#f1b1d8",bottom:"#b863ac",arm:"#d889c0",outline:"#713a83",sucker:"#f5cbdf"};
}
function drawOctopusPool(x,y,r,alpha=.7){
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
  const water=ctx.createRadialGradient(0,0,r*.12,0,0,r);
  water.addColorStop(0,"#102431");water.addColorStop(.7,"#244d63");water.addColorStop(1,"rgba(35,84,110,0)");
  ctx.fillStyle=water;ctx.beginPath();ctx.ellipse(0,0,r,r*.72,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#73b9ce";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,r*.78,r*.48,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawOctopusWarning(x,y,r,progress){
  ctx.save();ctx.globalAlpha=.24+.35*Math.min(1,progress);ctx.fillStyle="#091321";
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.85;ctx.strokeStyle="#c5a0ee";ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle="#edc1f6";ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r*Math.max(.08,1-progress),0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawOctopusZones(){
  const palette=getOctopusPalette();
  if(boss?.type!=="octopus")return;
  for(const t of getOctopusTentacles())if(t.emergeTimer>0)
    drawOctopusWarning(t.x,t.y,boss.strikeRadius,1-t.emergeTimer/t.emergeDuration);
  for(const a of boss.attacks){
    if(!a.hit){drawOctopusWarning(a.x,a.y,a.r,1-a.timer/a.warning);continue;}
    ctx.save();ctx.globalAlpha=Math.max(.15,a.life/.3);
    ctx.fillStyle="rgba(157,83,191,.35)";ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();
    const from=a.source||boss;
    ctx.lineCap="round";ctx.strokeStyle=palette.outline;ctx.lineWidth=28*(boss.tentacleScale||1);
    ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+a.x)/2,(from.y+a.y)/2-65,a.x,a.y);ctx.stroke();
    ctx.strokeStyle=palette.arm;ctx.lineWidth=18*(boss.tentacleScale||1);ctx.stroke();
    ctx.fillStyle=palette.sucker;ctx.beginPath();ctx.ellipse(a.x,a.y,24*(boss.tentacleScale||1),13*(boss.tentacleScale||1),0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
function drawOctopusTentacle(t){
 ctx.save();try{if(selectedCosmetic("boss_octopus")==="boss_octopus_grayscale")ctx.filter="grayscale(1)";drawOctopusTentacleArt(t);}finally{ctx.restore();}
}
function drawOctopusTentacleArt(t){
  const palette=getOctopusPalette();
  if(t.emergeTimer>0)return;
  drawOctopusPool(t.x,t.y,t.r*1.5,.7);
  ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.r/27,t.r/27);
  const sway=Math.sin(t.wobble)*5;
  ctx.lineCap="round";ctx.strokeStyle=palette.outline;ctx.lineWidth=23;
  ctx.beginPath();ctx.moveTo(-5,9);if(palette.poly){ctx.lineTo(-14,-12);ctx.lineTo(14+sway,-28);ctx.lineTo(10+sway,-48);}else ctx.bezierCurveTo(-25,-14,19+sway,-22,10+sway,-48);ctx.stroke();
  ctx.strokeStyle=t.hitAnim>0?"#fff0fa":palette.arm;ctx.lineWidth=17;ctx.stroke();
  ctx.fillStyle=palette.sucker;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(2+Math.sin(i*.9)*6+sway*.4,4-i*10,3.5,2.6,-.3,0,Math.PI*2);ctx.fill();}
  if(getThemeSkin("boss_octopus")==="biolum"){ctx.fillStyle="#c0fff2";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(7+Math.sin(i*.9)*4+sway*.4,-6-i*10,2,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
  ctx.fillStyle="#291d35";ctx.fillRect(t.x-24,t.y+22,48,5);
  ctx.fillStyle=palette.arm;ctx.fillRect(t.x-24,t.y+22,48*Math.max(0,t.hp/t.maxHp),5);
}
function drawOctopusBossArt(owner){
  const palette=getOctopusPalette();
  drawOctopusPool(owner.x,owner.y,owner.r*1.55,.8);
  if(owner.state==="submerged")return;
  ctx.save();ctx.translate(owner.x,owner.y);
  const rise=owner.state==="resurfacing"?Math.max(.12,1-owner.surfaceTimer/.8):1;
  ctx.globalAlpha=rise;ctx.scale(owner.r*rise,owner.r*rise);
  ctx.lineCap="round";ctx.lineJoin="round";
  for(let i=0;i<8;i++){
    const a=Math.PI*2*i/8,wiggle=Math.sin(owner.wobble+i)*.10;
    const ex=Math.cos(a)*1.3,ey=.25+Math.sin(a)*.68;
    ctx.strokeStyle=palette.outline;ctx.lineWidth=.25;ctx.beginPath();ctx.moveTo(Math.cos(a)*.35,.25);
    if(palette.poly){ctx.lineTo(Math.cos(a)*.8,.65+Math.sin(a)*.25);ctx.lineTo(ex+wiggle,ey+.3);ctx.lineTo(ex,ey);}else ctx.bezierCurveTo(Math.cos(a)*.8,.8+Math.sin(a)*.25,ex+wiggle,ey+.4,ex,ey);ctx.stroke();
    ctx.strokeStyle=palette.arm;ctx.lineWidth=.18;ctx.stroke();
    ctx.fillStyle=palette.sucker;ctx.beginPath();ctx.ellipse(ex*.88,ey+.13,.06,.04,a,0,Math.PI*2);ctx.fill();
  }
  const skin=ctx.createLinearGradient(0,-1,0,.6);skin.addColorStop(0,palette.top);skin.addColorStop(1,palette.bottom);
  ctx.fillStyle=owner.hitAnim>0?"#ffe8f8":skin;ctx.strokeStyle=palette.outline;ctx.lineWidth=.035;
  ctx.beginPath();
  if(palette.poly){for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/8;const x=Math.cos(a)*.81,y=-.2+Math.sin(a)*.85;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();}
  else ctx.ellipse(0,-.2,.77,.81,0,0,Math.PI*2);
  ctx.fill();ctx.stroke();
  if(palette.poly){ctx.fillStyle="rgba(255,255,255,.18)";ctx.beginPath();ctx.moveTo(-.75,-.52);ctx.lineTo(.3,-.98);ctx.lineTo(0,.05);ctx.closePath();ctx.fill();}
  ctx.fillStyle=palette.sucker;ctx.beginPath();ctx.ellipse(-.3,-.6,.18,.25,.5,0,Math.PI*2);ctx.fill();
  for(const side of [-1,1]){
    ctx.fillStyle="#fff7ed";ctx.beginPath();ctx.ellipse(side*.29,-.14,.18,.22,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#38203f";ctx.beginPath();ctx.ellipse(side*.26,-.12,.07,.12,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=palette.outline;ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(side*.47,-.4);ctx.lineTo(side*.13,-.28);ctx.stroke();
  }
  ctx.fillStyle=palette.outline;ctx.beginPath();ctx.ellipse(0,.26,.12,.15,0,0,Math.PI*2);ctx.fill();
  if(palette.elegant){
    ctx.fillStyle="#233d59";ctx.beginPath();ctx.ellipse(0,-.92,.66,.12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff7df";ctx.strokeStyle=palette.outline;ctx.lineWidth=.035;
    ctx.beginPath();ctx.moveTo(-.48,-.95);ctx.lineTo(-.55,-1.23);ctx.quadraticCurveTo(0,-1.50,.55,-1.23);ctx.lineTo(.48,-.95);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#d4ac48";ctx.fillRect(-.48,-1.02,.96,.075);
    ctx.beginPath();ctx.arc(0,-1.20,.075,0,Math.PI*2);ctx.fill();
    drawBowTieShape(0,.58,.23,"#d4ac48","#ffe6a4",palette.outline);
  }
  drawThemeSkinDetails("boss_octopus",1);
  ctx.restore();
}
function getOctopusAreaDanger(x,y,padding=0){
  if(boss?.type!=="octopus")return 0;
  let danger=0;
  const add=(tx,ty,r)=>{const d=Math.hypot(x-tx,y-ty),reach=r+padding;if(d<reach)danger+=1+(reach-d)/Math.max(1,reach);};
  for(const a of boss.attacks)add(a.x,a.y,a.r);
  for(const t of getOctopusTentacles())if(t.emergeTimer>0)add(t.x,t.y,boss.strikeRadius);
  return danger;
}
function autoAvoidOctopus(v){
  const current=getOctopusAreaDanger(player.x,player.y,player.r+38);
  if(current<=0)return 0;
  let best=null,bestScore=Infinity;
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,dx=Math.cos(a),dy=Math.sin(a);
    const p=octopusArenaPoint(player.x+dx*150,player.y+dy*150,player.r+12);
    const moved=Math.hypot(p.x-player.x,p.y-player.y);
    const score=getOctopusAreaDanger(p.x,p.y,player.r+24)*1000+(150-moved)*3+
      cats.reduce((n,c)=>n+(!isOctopusTentacle(c)&&isFinitePos(c)&&Math.hypot(c.x-p.x,c.y-p.y)<c.r+player.r+20?180:0),0);
    if(score<bestScore){bestScore=score;best={dx,dy};}
  }
  if(best)autoSafeAdd(v,best.dx,best.dy,14+current*4);
  return current*3;
}

function drawBossHealthBar(){
if(!boss||!isFinitePos(boss)||!boss.maxHp)return;
ctx.save();
if(boss.type==="octopus"&&boss.state!=="surface"){ctx.fillStyle="rgba(29,22,43,.85)";ctx.fillRect(boss.x-88,boss.y-boss.r-63,176,22);ctx.fillStyle="#f4e8ff";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText(boss.state==="submerged"?`Tentáculos: ${getOctopusTentacles().length}`:"¡El pulpo emerge!",boss.x,boss.y-boss.r-46);}
ctx.shadowColor="rgba(0,0,0,.45)";ctx.shadowBlur=10;
ctx.fillStyle="rgba(20,10,24,.62)";ctx.beginPath();ctx.roundRect(boss.x-76,boss.y-boss.r-38,152,18,9);ctx.fill();
ctx.shadowBlur=0;ctx.fillStyle="rgba(255,255,255,.82)";ctx.beginPath();ctx.roundRect(boss.x-70,boss.y-boss.r-32,140,8,4);ctx.fill();
const hpGrad=ctx.createLinearGradient(boss.x-70,boss.y,boss.x+70,boss.y);hpGrad.addColorStop(0,boss.type==="demon"?"#7209b7":"#ff4d6d");hpGrad.addColorStop(1,boss.type==="demon"?"#ff4d8d":"#ffd166");
ctx.fillStyle=hpGrad;ctx.beginPath();ctx.roundRect(boss.x-70,boss.y-boss.r-32,140*Math.max(0,boss.hp/boss.maxHp),8,4);ctx.fill();
ctx.restore();
}

function drawBoss(){
const category=boss?({giantCat:"boss_giant",duck:"boss_duck",seal:"boss_seal",demon:"boss_demon",octopus:"boss_octopus"}[boss.type]):"";
if(selectedCosmetic(category)!==category+"_grayscale")return drawBossArt();
ctx.save();try{ctx.filter="grayscale(1)";return drawBossArt();}finally{ctx.restore();}
}
function drawBossArt(){
if(!boss||!isFinitePos(boss))return;
if(boss.type==="octopus"){drawOctopusBossArt(boss);drawBossHealthBar();return;}
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
if((boss.type==="giantCat"&&selectedCosmetic("boss_giant")==="boss_giant_low_poly")||(boss.type==="duck"&&selectedCosmetic("boss_duck")==="boss_duck_low_poly")||(boss.type==="seal"&&selectedCosmetic("boss_seal")==="boss_seal_low_poly")||(boss.type==="demon"&&selectedCosmetic("boss_demon")==="boss_demon_low_poly")){drawLowPolyBoss(boss.type,r);ctx.restore();drawBossHealthBar();return;}
drawBossSkinUnderlay(boss.type,r);

bossArt(boss.type,r);
drawBossSkinDetails(boss.type,r);
if(boss.type==="demon"&&dogKidnapped){ctx.fillStyle="#ffd6e7";ctx.font="bold 14px 'Gatitos UI'";ctx.textAlign="center";ctx.fillText("PERRO ROBADO",0,r+30);}
ctx.restore();drawBossHealthBar();
}

function drawQuack(q){
ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));
ctx.fillStyle=q.text==="QUACK!"?"#ffd166":"#f8edeb";ctx.strokeStyle="#fb8500";ctx.lineWidth=3;
ctx.beginPath();ctx.roundRect(-34,-16,68,32,12);ctx.fill();ctx.stroke();
ctx.fillStyle="#3a2f55";ctx.font="bold 14px 'Gatitos UI', Arial, sans-serif, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Emoji'";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(q.text,0,0);ctx.restore()
}

function drawDemonOrb(o){
ctx.save();ctx.translate(o.x,o.y);
if(o.hitsLeft>1){ctx.strokeStyle="#ffd166";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,o.r+5,0,Math.PI*2);ctx.stroke();}
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
ctx.shadowBlur=0;ctx.fillStyle="#86cfbf";ctx.strokeStyle="#386e72";ctx.lineWidth=2;
ctx.beginPath();ctx.roundRect(-16,-10,32,23,5);ctx.fill();ctx.stroke();
ctx.fillStyle="#dce9eb";ctx.beginPath();ctx.ellipse(0,-9,16,5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.strokeStyle="#7b9da4";ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,-9,11,2.5,0,0,Math.PI*2);ctx.stroke();
ctx.fillStyle="#effffc";ctx.beginPath();ctx.ellipse(1,4,6,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-4,4);ctx.lineTo(-9,0);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();

ctx.restore();
}
function drawCoin(c){
  drawPawCoin(c.x,c.y,c.r);
  if(c.amount>1){ctx.save();ctx.font="bold 10px 'Gatitos UI'";ctx.fillStyle="#fff3c7";ctx.textAlign="center";ctx.fillText(c.amount,c.x,c.y+c.r+10);ctx.restore();}
}
function drawHeart(h){ctx.save();ctx.globalAlpha=Math.max(0,h.life/h.maxLife);ctx.translate(h.x,h.y);ctx.scale(h.size/20,h.size/20);ctx.fillStyle="#ff4d8d";ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(-18,-8,-10,-22,0,-10);ctx.bezierCurveTo(10,-22,18,-8,0,6);ctx.fill();ctx.restore()}
function drawSmoke(s){ctx.save();ctx.globalAlpha=Math.max(0,s.life/s.maxLife)*.45;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawPowerStar(s){
ctx.save();
ctx.translate(s.x,s.y);
const pulse=1+Math.sin((s.wobble||0)*2)*.08;
const fading=s.life<5;
const blinkHide=fading&&Math.sin(performance.now()*(s.life<2?.04:.022))>0;
if(blinkHide){ctx.restore();return;}
const lifeRatio=Math.max(0,Math.min(1,(s.life||0)/(s.maxLife||14)));
const auraPulse=1+Math.sin((s.wobble||0)*2.8+(s.auraPhase||0))*.09;
ctx.globalAlpha=(fading?Math.max(.35,s.life/5):1)*.42;
const auraGradient=ctx.createRadialGradient(0,0,s.r*.5,0,0,s.r*3.2*auraPulse);
auraGradient.addColorStop(0,'rgba(255,239,170,0.38)');
auraGradient.addColorStop(0.45,'rgba(255,209,102,0.22)');
auraGradient.addColorStop(1,'rgba(255,209,102,0)');
ctx.fillStyle=auraGradient;
ctx.beginPath();
ctx.arc(0,0,s.r*3.2*auraPulse,0,Math.PI*2);
ctx.fill();
ctx.globalAlpha=(fading?Math.max(.35,s.life/5):1)*(.26+.12*lifeRatio);
ctx.strokeStyle='rgba(255,235,170,0.9)';
ctx.lineWidth=3;
ctx.shadowColor='#ffd166';
ctx.shadowBlur=fading?10:22;
ctx.beginPath();
ctx.arc(0,0,s.r*(1.9+Math.sin((s.wobble||0)*1.8)*.12),0,Math.PI*2);
ctx.stroke();
ctx.rotate((s.wobble||0)*.55);
ctx.scale(pulse,pulse);
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
function drawFloatingText(t){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,t.life/t.maxLife));ctx.fillStyle="#ffd6e7";ctx.font=t.big?"bold 34px 'Gatitos UI', Arial, sans-serif, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Emoji'":"bold 15px 'Gatitos UI', Arial, sans-serif, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Emoji'";ctx.textAlign="center";ctx.fillText(t.text.replaceAll("🪙","🐾").replaceAll("💰","🐾"),t.x,t.y);ctx.restore()}
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
updateRunIndicators();
ctx.setTransform(1,0,0,1,0,0);
ctx.globalAlpha=1;
ctx.shadowBlur=0;
ctx.shadowColor="transparent";
ctx.globalCompositeOperation="source-over";
drawBackground();
if(!gameStarted)return;
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
drawRamFishTrails();
drawOctopusZones();
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
if(window.coopTest?.hostActive)window.coopTest.draw();
drawPlayerLifeBar();
drawStarAura();
drawDog();
ctx.setTransform(1,0,0,1,0,0);
ctx.globalAlpha=1;
ctx.shadowBlur=0;
drawReticle();
}

let audioStateSignature="";
function loop(now){
try{
const safeNow=Number.isFinite(now)?now:performance.now();
const rawDt=Math.max(0,Math.min((safeNow-lastFrame)/1000,.25));
updatePerformanceMode(rawDt);
lastFrame=safeNow;
if(gameStarted&&!gameOver&&!choosingUpgrade&&!paused){
  frameAccumulator+=rawDt;
  let steps=0;
  while(frameAccumulator>=1/60&&steps++<5){
    frameAccumulator-=1/60;
    update(1/60);
    if(gameOver||choosingUpgrade||paused){frameAccumulator=0;break;}
  }
  if(frameAccumulator>=1/60)frameAccumulator%=1/60;
}else frameAccumulator=0;
cleanBrokenEntities();
const audioState=[gameStarted,gameOver,paused,choosingUpgrade,boss?.type||"round",musicEnabled,musicVolume].join("|");
if(audioState!==audioStateSignature){audioStateSignature=audioState;syncMusic();}
render();
if(window.coopTest?.hostActive)window.coopTest.sync();
}catch(err){
showSoftError(err);
try{render()}catch(renderErr){console.error(renderErr)}
}
requestAnimationFrame(loop)
}

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
let autoDecisionCooldown=0;
let autoProjectileDirection=null;
let autoProjectileDirectionUntil=0;
let autoLastStuckCheckAt=0;
let autoRamNextEvaluationAt=0;
let autoLastResidualShotAt=-Infinity;
let autoResidualNextDecisionAt=0;
let autoStableTarget=null;
let autoStableTargetUntil=0;
const AUTO_MEMORY_KEY="gatitos_auto_ai_memory_v2";

function autoLoadMemory(){
  try{
    const raw=gameStorage.getItem(AUTO_MEMORY_KEY);
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
  try{gameStorage.setItem(AUTO_MEMORY_KEY,JSON.stringify(mem))}catch(e){}
}
let autoMemory=autoLoadMemory();

function initAutoMode(){autoMode=false;autoModeUsedThisRun=false;}
function markRankingInvalidByAI(){autoModeUsedThisRun=true;rankingEligibleThisRun=false;rankingDisabledReason="Partida de pruebas: ranking desactivado.";}
function setAutoMode(value){if(!adminUnlocked)return;autoMode=!!value;if(autoMode){markRankingInvalidByAI();autoDecisionCooldown=0;autoRamNextEvaluationAt=0;autoLastResidualShotAt=-Infinity;autoResidualNextDecisionAt=0;autoStableTarget=null;autoStableTargetUntil=0;autoProjectileDirection=null;autoProjectileDirectionUntil=0;autoLastStuckCheckAt=0;if(autoChoiceMenu)autoScheduleChoice(autoChoiceMenu.choices,autoChoiceMenu.onPick,autoChoiceMenu.context);}else{keys.w=keys.a=keys.s=keys.d=false;autoStableTarget=null;autoProjectileDirection=null;autoProjectileDirectionUntil=0;}refreshAutoModeUI();}
function refreshAutoModeUI(){
  if(autoBadge)autoBadge.classList.remove("visible");
}
function autoRegisterChoiceMenu(choices,onPick,context){
  autoChoiceMenu={choices,onPick,context,createdAt:performance.now(),picked:false};
  if(autoMode)autoScheduleChoice(choices,onPick,context);
}
function autoTryPickChoice(force=false){
  if(!autoMode||!autoChoiceMenu||autoChoiceMenu.picked||!choosingUpgrade||paused||gameOver)return;
  const wait=autoChoiceMenu.context==="shop"?3400:3300;
  if(!force&&performance.now()-autoChoiceMenu.createdAt<wait)return;
  const choice=autoPickChoice(autoChoiceMenu.choices,autoChoiceMenu.context);
  if(!choice)return;
  autoChoiceMenu.picked=true;
  autoRememberChoice(choice,autoChoiceMenu.context);
  showFloatingText({x:canvas.width/2,y:115,text:`🤖 elige: ${choice.title||"opción"}`,life:1.0,maxLife:1.0,big:false});
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
function autoProjectileRisk(obj,horizon=1.25,padding=34){
  if(!isFinitePos(obj)||!Number.isFinite(obj.vx)||!Number.isFinite(obj.vy))return null;
  const vx=obj.vx,vy=obj.vy,speed2=vx*vx+vy*vy;
  if(speed2<25)return null;
  const rx=player.x-obj.x,ry=player.y-obj.y;
  const t=Math.max(0,Math.min(horizon,(rx*vx+ry*vy)/speed2));
  const hitX=obj.x+vx*t,hitY=obj.y+vy*t;
  const missX=player.x-hitX,missY=player.y-hitY;
  const miss=Math.hypot(missX,missY);
  const hitRadius=(player.r||18)+(obj.r||14)+padding;
  const nowDist=Math.hypot(rx,ry);
  const approaching=(rx*vx+ry*vy)>0;
  if(!approaching&&nowDist>hitRadius*1.45)return null;
  const pathRisk=Math.max(0,1-miss/hitRadius);
  const timeRisk=t<=horizon?Math.max(0,1-t/horizon):0;
  const nearRisk=Math.max(0,1-nowDist/Math.max(120,hitRadius*2.2));
  const risk=Math.max(nearRisk,pathRisk*(.65+timeRisk*1.35));
  return {risk,t,miss,hitRadius,hitX,hitY,nowDist,vx,vy};
}
function autoProjectileThreat(obj,radius,weight=1){
  if(!isFinitePos(obj))return 0;
  const d=Math.hypot(player.x-obj.x,player.y-obj.y)||1;
  const proximity=d<radius?(radius-d)/radius:0;
  const predicted=autoProjectileRisk(obj,Math.max(.75,Math.min(1.65,radius/260)),38);
  return Math.max(0,(proximity*.42+(predicted?.risk||0)*1.65)*weight);
}
function autoDodgeProjectile(v,obj,radius,weight=1){
  if(!isFinitePos(obj))return 0;
  const info=autoProjectileRisk(obj,Math.max(.85,Math.min(1.75,radius/245)),42);
  const dx=player.x-obj.x,dy=player.y-obj.y,d=Math.hypot(dx,dy)||1;
  let threat=autoProjectileThreat(obj,radius,weight);
  if(!info||info.risk<=.02){
    if(d<radius*.48)autoSafeAdd(v,dx/d,dy/d,threat*.7);
    return threat;
  }
  const sp=Math.hypot(info.vx,info.vy)||1;
  const ux=info.vx/sp,uy=info.vy/sp;
  const px=-uy,py=ux;
  const look=150;
  const ax=player.x+px*look,ay=player.y+py*look;
  const bx=player.x-px*look,by=player.y-py*look;
  const room=(x,y)=>Math.min(x,y,canvas.width-x,canvas.height-y);
  const centerX=canvas.width/2,centerY=canvas.height/2;
  const centerBiasA=((centerX-player.x)*px+(centerY-player.y)*py)*.06;
  const centerBiasB=-centerBiasA;
  const chooseA=room(ax,ay)+centerBiasA>=room(bx,by)+centerBiasB;
  const side=chooseA?1:-1;
  const urgency=Math.min(2.4,.65+info.risk*1.45+(info.t<.42?.75:0));
  autoSafeAdd(v,px*side,py*side,weight*urgency);
  if(d<Math.max(115,radius*.42))autoSafeAdd(v,dx/d,dy/d,weight*(1-d/Math.max(116,radius*.42))*1.5);
  return threat+info.risk*weight;
}
function autoHasImminentProjectileThreat(){
  if(getOctopusAreaDanger(player.x,player.y,player.r+35)>0)return true;
  const sets=[quacks,yarnBalls,demonOrbs];
  for(const arr of sets){
    const nearby=[];
    for(const o of arr){
      if(!isFinitePos(o))continue;
      const dx=o.x-player.x,dy=o.y-player.y,d2=dx*dx+dy*dy;
      if(nearby.length===8&&d2>=nearby[7].d2)continue;
      let pos=nearby.length;
      while(pos>0&&d2<nearby[pos-1].d2)pos--;
      nearby.splice(pos,0,{o,d2});
      if(nearby.length>8)nearby.pop();
    }
    for(const {o} of nearby){
      const r=autoProjectileRisk(o,.72,46);
      if(r&&r.risk>.34&&r.t<.72)return true;
    }
  }
  if(boss&&boss.type==="seal"&&boss.state==="jumping"&&Number.isFinite(boss.targetX)&&Number.isFinite(boss.targetY)){
    const d=Math.hypot(player.x-boss.targetX,player.y-boss.targetY);
    if(d<(boss.r||60)+(player.r||18)+105&&boss.jumpTimer<.9)return true;
  }
  return false;
}
function autoTargetStillValid(t){
  if(!isCombatTargetAvailable(t))return false;
  if(t===boss)return true;
  return !t.dead&&cats.includes(t)&&isCatOnScreen(t);
}
function autoFindBestTarget(){
  const now=performance.now();
  if(autoTargetStillValid(autoStableTarget)&&now<autoStableTargetUntil)return autoStableTarget;

  let best=null,bestScore=-999;
  const candidates=[];
  cats.forEach(c=>{
    if(!isCombatTargetAvailable(c)||!isCatOnScreen(c))return;
    const d=Math.hypot(c.x-player.x,c.y-player.y);
    if(c.rainbow)candidates.push({c,d,priority:1});
    else candidates.push({c,d,priority:0});
  });
  candidates.sort((a,b)=>b.priority-a.priority||a.d-b.d);

  for(const {c,d} of candidates.slice(0,24)){
    let s;
    if(c.rainbow)s=1800-d*.10;
    else{
      s=360-d*.18;
      if(isOctopusTentacle(c))s+=1600;
      if(c.type==="yarn")s+=230;
      if(c.type==="thief")s+=190;
      if(c.type==="musician")s+=260;
      if(c.type==="sleepy"&&c.sleepState==="awake")s+=320+Math.min(180,wave*6);
      if(c.type==="glutton")s+=125;
      if(d<260)s+=170;
      if(d<120)s+=2000*(1-d/120);
    }
    if(s>bestScore){best=c;bestScore=s;}
  }

  if(isCombatTargetAvailable(boss)){
    const d=Math.hypot(boss.x-player.x,boss.y-player.y);
    let s=1120-d*.07;
    if(boss.type==="demon")s+=160;
    if(boss.hp&&boss.maxHp&&boss.hp<boss.maxHp*.35)s+=120;
    if(s>bestScore){best=boss;bestScore=s;}
  }

  autoStableTarget=best;
  autoStableTargetUntil=now+(best&&best.rainbow?900:650);
  return best;
}
function autoMoveKeysFromVector(v){
  const mag=Math.hypot(v.x,v.y);
  if(mag<.08){keys.w=keys.a=keys.s=keys.d=false;return;}
  const x=v.x/mag,y=v.y/mag;
  keys.a=x<-.24;keys.d=x>.24;keys.w=y<-.24;keys.s=y>.24;
}
const AUTO_RESIDUAL_HARD_INTERVAL_MS=500;
function autoResidualThreatSnapshot(target){
  const px=player.x,py=player.y;
  const dist=target&&isFinitePos(target)?Math.hypot(target.x-px,target.y-py):Infinity;
  let nearby=0,veryClose=0,specialPressure=0;
  for(const c of cats){
    if(!isCombatTargetAvailable(c)||!isCatOnScreen(c))continue;
    const d=Math.hypot(c.x-px,c.y-py);
    if(d<360)nearby++;
    if(d<190)veryClose++;
    if(d<420&&(c.type==="yarn"||c.type==="musician"||c.type==="thief"||c.type==="glutton"||isOctopusTentacle(c)))specialPressure++;
  }
  let projectileRisk=0;
  for(const group of [quacks,yarnBalls,demonOrbs]){
    for(const p of group){
      if(!isFinitePos(p))continue;
      const d=Math.hypot(p.x-px,p.y-py);
      if(d>520)continue;
      const risk=autoProjectileRisk(p,1.0,46);
      if(risk)projectileRisk=Math.max(projectileRisk,risk.risk*(risk.t<.55?1.25:1));
    }
  }
  return {dist,nearby,veryClose,specialPressure,projectileRisk};
}
function autoShouldUseResidualShot(target){
  if(!isCombatTargetAvailable(target)||choosingUpgrade||paused||gameOver)return false;
  const now=gameNow();
  const cooldown=getRamFishCooldownMs();
  const elapsed=now-lastRamFishAt;
  if(elapsed>=cooldown)return false;
  if(now<autoResidualNextDecisionAt)return false;

  const s=autoResidualThreatSnapshot(target);
  const targetIsBoss=target===boss;
  const tentacle=isOctopusTentacle(target);
  const hpRatio=targetIsBoss&&boss.maxHp>0?boss.hp/boss.maxHp:1;
  const lowLife=life<upgrades.maxLife*.38;
  const bossFinisher=targetIsBoss&&hpRatio<.16;
  const crowded=s.nearby>=5||s.veryClose>=2;
  const dangerousSpecial=s.specialPressure>=1&&(s.dist<430||s.veryClose>0);
  const urgentProjectile=s.projectileRisk>1.0;
  const immediateTarget=s.dist<205;

  let score=0;
  if(tentacle)score+=4.2;
  if(crowded)score+=2.4;
  if(dangerousSpecial)score+=2.1;
  if(urgentProjectile)score+=2.7;
  if(immediateTarget)score+=1.8;
  if(lowLife&&(crowded||urgentProjectile||immediateTarget))score+=1.6;
  if(bossFinisher)score+=1.7;
  if(targetIsBoss&&!tentacle&&!crowded&&!urgentProjectile&&!immediateTarget&&!bossFinisher)score-=6;

  if(!targetIsBoss&&!tentacle){
    if(target.rainbow)score+=2.5;
    if(target.type==="yarn"||target.type==="musician")score+=1.7;
    if(s.dist>520&&!crowded)score-=2.5;
  }

  if(score<2.6){
    autoResidualNextDecisionAt=now+180;
    return false;
  }

  let interval=1150;
  if(score>=6.0)interval=500;
  else if(score>=4.6)interval=700;
  else if(score>=3.5)interval=900;
  if(targetIsBoss&&!tentacle)interval=Math.max(interval,900);
  if(!lowLife&&!urgentProjectile&&s.veryClose===0)interval=Math.max(interval,800);

  if(now-autoLastResidualShotAt<Math.max(AUTO_RESIDUAL_HARD_INTERVAL_MS,interval)){
    autoResidualNextDecisionAt=Math.min(now+150,autoLastResidualShotAt+interval);
    return false;
  }
  autoResidualNextDecisionAt=now+Math.min(240,interval*.35);
  return true;
}
function autoTrySmartResidualShot(target){
  if(!autoShouldUseResidualShot(target))return false;
  const fired=launchRamFish({x:mouse.x,y:mouse.y});
  if(fired)autoLastResidualShotAt=gameNow();
  return fired;
}
function autoUpdateAimAndShoot(target){
  if(target&&isFinitePos(target)){
    const lead=Math.min(.6,Math.hypot(target.x-player.x,target.y-player.y)/(585*Math.max(1,upgrades.fishSpeed)));
    mouse.x=target.x+(target.vx||0)*lead;
    mouse.y=target.y+(target.vy||0)*lead;
  }else{
    mouse.x=canvas.width/2;
    mouse.y=canvas.height/2;
  }
  if(isCombatTargetAvailable(target)&&!choosingUpgrade&&!paused&&!gameOver){
    shootFish();
    autoTrySmartResidualShot(target);
  }
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
  const now=performance.now();
  const elapsed=autoLastStuckCheckAt?Math.min(.25,Math.max(dt,(now-autoLastStuckCheckAt)/1000)):dt;
  autoLastStuckCheckAt=now;
  const moved=Math.hypot(player.x-autoLastPlayerX,player.y-autoLastPlayerY);
  autoLastPlayerX=player.x;
  autoLastPlayerY=player.y;
  const wall=autoDistanceToWall();
  const bossNear=boss&&isFinitePos(boss)&&Math.hypot(player.x-boss.x,player.y-boss.y)<(boss.type==="demon"?520:320);
  const pressure=danger>.8||bossNear||wall<95;
  if(gameStarted&&!gameOver&&autoMode&&moved<Math.max(2,player.speed*upgrades.moveSpeed*elapsed*.12)&&pressure)autoStuckTimer+=elapsed;
  else autoStuckTimer=Math.max(0,autoStuckTimer-elapsed*1.8);
  if(autoStuckTimer>.65||((autoIsInCorner()||wall<70)&&(danger>1.05||bossNear))){
    autoEmergencyEscapeUntil=now+1300;
    autoEmergencyEscapeAngle=Math.atan2(canvas.height/2-player.y,canvas.width/2-player.x)+(Math.random()*.5-.25);
    autoStuckTimer=0;
  }
}
function autoProjectileSafeMovement(preferred){
  const duck=boss&&boss.type==="duck"&&isFinitePos(boss);
  if(!duck&&!yarnBalls.length&&!demonOrbs.length&&!quacks.length)return preferred;
  const px=player.x,py=player.y;
  const realSpeed=Math.max(70,player.speed*upgrades.moveSpeed*getZoomiesMoveMultiplier()*getStarSpeedMultiplier());
  const now=gameNow(), horizon=.85;
  const bullets=[];
  for(const group of [quacks,yarnBalls,demonOrbs]){
    for(const p of group){
      if(!isFinitePos(p)||!Number.isFinite(p.vx)||!Number.isFinite(p.vy))continue;
      const dx=p.x-px,dy=p.y-py;
      if(dx*dx+dy*dy<900*900)bullets.push({p,d2:dx*dx+dy*dy});
    }
  }
  bullets.sort((a,b)=>a.d2-b.d2);
  bullets.length=Math.min(bullets.length,32);
  const enemies=[];
  for(const c of cats){
    if(!isFinitePos(c)||c.dead)continue;
    const dx=c.x-px,dy=c.y-py;
    if(dx*dx+dy*dy<470*470)enemies.push({c,d2:dx*dx+dy*dy});
  }
  enemies.sort((a,b)=>a.d2-b.d2);
  enemies.length=Math.min(enemies.length,14);
  const bossDx=px-(boss?.x??canvas.width/2),bossDy=py-(boss?.y??canvas.height/2),bd=Math.hypot(bossDx,bossDy)||1;
  const tangent={x:-bossDy/bd,y:bossDx/bd};
  const charging=duck&&((boss.pendingQuacks&&boss.pendingQuacks.length>0)||(boss.shoot||0)<.8);
  const candidates=[];
  function addDir(x,y){
    const m=Math.hypot(x,y);
    if(m<.10)return;
    const kx=Math.abs(x/m)>.24?Math.sign(x):0,ky=Math.abs(y/m)>.24?Math.sign(y):0;
    const km=Math.hypot(kx,ky)||1,dir={x:kx/km,y:ky/km};
    if(!candidates.some(c=>c.x*dir.x+c.y*dir.y>.993))candidates.push(dir);
  }
  addDir(preferred.x,preferred.y);
  if(autoProjectileDirection)addDir(autoProjectileDirection.x,autoProjectileDirection.y);
  addDir(tangent.x,tangent.y);addDir(-tangent.x,-tangent.y);
  for(let i=0;i<8;i++){const a=Math.PI*i/4;addDir(Math.cos(a),Math.sin(a));}
  function score(dir){
    const vx=dir.x*realSpeed,vy=dir.y*realSpeed;
    const futureX=px+vx*horizon,futureY=py+vy*horizon;
    const edge=Math.min(futureX-player.r,futureY-player.r,canvas.width-player.r-futureX,canvas.height-player.r-futureY);
    let cost=edge<0?140+Math.abs(edge)*.9:edge<115?(115-edge)*.42:0;
    for(const {p} of bullets){
      const rx=p.x-px,ry=p.y-py,rvx=p.vx-vx,rvy=p.vy-vy;
      const v2=rvx*rvx+rvy*rvy;
      const t=v2>1?Math.max(0,Math.min(horizon,-(rx*rvx+ry*rvy)/v2)):0;
      const miss=Math.hypot(rx+rvx*t,ry+rvy*t);
      const hit=(player.r||24)+(p.r||14)+12;
      if(miss<hit+90){
        const urgency=1.7-t/horizon;
        cost+=miss<hit?(28+(hit-miss)*1.1)*urgency:(hit+90-miss)/90*12*urgency;
      }
      const nearT=Math.min(.2,horizon);
      const shortDist=Math.hypot(rx+rvx*nearT,ry+rvy*nearT);
      if(shortDist<hit+12)cost+=(hit+12-shortDist)*.6;
    }
    for(const {c} of enemies){
      const dx=px-c.x,dy=py-c.y,d=Math.hypot(dx,dy)||1;
      const chase=Math.min(d,Math.max(0,c.speed||80)*.7);
      const cx=c.x+dx/d*chase,cy=c.y+dy/d*chase;
      const dist=Math.hypot(px+vx*.7-cx,py+vy*.7-cy);
      const safe=(player.r||24)+(c.r||20)+90;
      if(dist<safe)cost+=(safe-dist)/safe*38;
    }
    if(isCombatTargetAvailable(boss)){
      const distToBoss=Math.hypot(futureX-boss.x,futureY-boss.y);
      const avoidBoss=(boss.r||60)+(player.r||24)+160;
      if(distToBoss<avoidBoss)cost+=(avoidBoss-distToBoss)*.16;
    }
    cost+=getOctopusAreaDanger(futureX,futureY)*80;
    if(charging)cost-=Math.abs(dir.x*tangent.x+dir.y*tangent.y)*3;
    const prefMag=Math.hypot(preferred.x,preferred.y);
    if(prefMag>.15)cost-=(dir.x*preferred.x+dir.y*preferred.y)/prefMag*1.5;
    if(autoProjectileDirection){
      const same=dir.x*autoProjectileDirection.x+dir.y*autoProjectileDirection.y;
      cost-=Math.max(0,same)*((now<autoProjectileDirectionUntil)?7:2.0);
    }
    return cost;
  }
  let best=null,bestCost=Infinity;
  for(const dir of candidates){const c=score(dir);if(c<bestCost){best=dir;bestCost=c;}}
  if(autoProjectileDirection&&now<autoProjectileDirectionUntil&&score(autoProjectileDirection)<bestCost+8){
    best=autoProjectileDirection;
  }else if(best){
    autoProjectileDirection={x:best.x,y:best.y};
    autoProjectileDirectionUntil=now+240;
  }
  return best?{x:best.x*8,y:best.y*8}:preferred;
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

function autoPlanRamFish(){
  const x=player.x,y=player.y;
  const fishSpeed=Math.max(300,710*upgrades.fishSpeed);
  const fishRadius=14*getRamFishScale();
  const maxReach=Math.hypot(canvas.width,canvas.height)+80;
  const room=autoDistanceToWall();
  const closeCats=[];
  let nearPressure=0;
  for(const c of cats){
    if(!isFinitePos(c)||c.dead||!isCatOnScreen(c))continue;
    const d=Math.hypot(c.x-x,c.y-y);
    if(d<325)nearPressure++;
    if(d<Math.min(850,maxReach))closeCats.push({entity:c,d});
  }
  closeCats.sort((a,b)=>a.d-b.d);
  closeCats.length=Math.min(closeCats.length,22);
  const closeBoss=boss&&isFinitePos(boss)&&Math.hypot(boss.x-x,boss.y-y)<650?boss:null;
  const threats=[];
  for(const group of [quacks,yarnBalls,demonOrbs]){
    for(const p of group){
      if(!isFinitePos(p)||Math.hypot(p.x-x,p.y-y)>600)continue;
      const info=autoProjectileRisk(p,1.1,48);
      if(info&&info.risk>.46)threats.push({entity:p,info});
    }
  }
  threats.sort((a,b)=>b.info.risk-a.info.risk);
  threats.length=Math.min(threats.length,10);
  const urgent=threats.some(t=>t.info.risk>1.06&&t.info.t<.50);
  const emergency=urgent&&(life<upgrades.maxLife*.42||room<115||nearPressure>=4);
  if(nearPressure<3&&!closeBoss&&threats.length<2&&!emergency)return null;
  const directions=[];
  function addDirection(tx,ty){
    const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy);
    if(d<35||!Number.isFinite(d))return;
    const ux=dx/d,uy=dy/d;
    if(directions.some(v=>ux*v.x+uy*v.y>.996))return;
    directions.push({x:ux,y:uy});
  }
  for(const {entity:c} of closeCats.slice(0,13))addDirection(c.x,c.y);
  if(closeCats.length>=2){
    const local=closeCats.filter(t=>t.d<430).slice(0,7);
    if(local.length>=2){
      const sx=local.reduce((v,t)=>v+t.entity.x,0)/local.length;
      const sy=local.reduce((v,t)=>v+t.entity.y,0)/local.length;
      addDirection(sx,sy);
    }
  }
  if(closeBoss)addDirection(closeBoss.x,closeBoss.y);
  for(const {entity:p} of threats){
    const d=Math.hypot(p.x-x,p.y-y);
    const eta=Math.min(.7,Math.max(.025,(d-58)/(fishSpeed+Math.hypot(p.vx||0,p.vy||0)*.30)));
    addDirection(p.x+(p.vx||0)*eta,p.y+(p.vy||0)*eta);
  }
  let best=null,bestScore=-Infinity;
  for(const dir of directions){
    let catHits=0,nearHits=0,bulletHits=0,bulletRisk=0,bossHit=false;
    for(const {entity:c,d} of closeCats){
      const dx=c.x-x,dy=c.y-y,along=dx*dir.x+dy*dir.y;
      if(along<25||along>maxReach)continue;
      const lateral=Math.abs(dx*dir.y-dy*dir.x);
      if(lateral>fishRadius+(c.r||20))continue;
      catHits++;
      if(d<390)nearHits++;
    }
    if(closeBoss){
      const dx=closeBoss.x-x,dy=closeBoss.y-y;
      const along=dx*dir.x+dy*dir.y;
      bossHit=along>25&&along<maxReach&&Math.abs(dx*dir.y-dy*dir.x)<fishRadius+(closeBoss.r||65);
    }
    for(const {entity:p,info} of threats){
      let along=(p.x-x)*dir.x+(p.y-y)*dir.y;
      if(along<25||along>maxReach)continue;
      let eta=Math.min(.9,Math.max(0,(along-58)/fishSpeed));
      const px=p.x+(p.vx||0)*eta,py=p.y+(p.vy||0)*eta;
      along=(px-x)*dir.x+(py-y)*dir.y;
      eta=Math.min(.9,Math.max(0,(along-58)/fishSpeed));
      const qx=p.x+(p.vx||0)*eta,qy=p.y+(p.vy||0)*eta;
      along=(qx-x)*dir.x+(qy-y)*dir.y;
      if(along<25||along>maxReach||eta>info.t+.08)continue;
      const lateral=Math.abs((qx-x)*dir.y-(qy-y)*dir.x);
      if(lateral>fishRadius+(p.r||12))continue;
      bulletHits++;
      bulletRisk+=info.risk*(info.t<.50?1.45:1);
    }
    const crowdRelease=catHits>=3&&nearHits>=2&&(nearPressure>=3||room<140);
    const trappedRelease=catHits>=2&&nearHits>=2&&(nearPressure>=4||room<105);
    const bossPressure=bossHit&&catHits>=2&&nearPressure>=2;
    const defensiveVolley=bulletHits>=2&&bulletRisk>1.65;
    const duckDefense=boss&&boss.type==="duck"&&urgent&&bulletHits>=1&&bulletRisk>.8&&(nearPressure>=2||room<150||life<upgrades.maxLife*.73);
    const lifeSavingShot=(emergency&&bulletHits>=1&&bulletRisk>1.0)||duckDefense;
    if(!(crowdRelease||trappedRelease||bossPressure||defensiveVolley||lifeSavingShot))continue;
    const score=catHits*1.8+nearHits*1.1+(bossHit?2.2:0)
      +bulletRisk*(emergency?5.3:3.0)+(trappedRelease?3.2:0);
    if(score>bestScore){bestScore=score;best={x:x+dir.x*600,y:y+dir.y*600};}
  }
  return best;
}
function autoTryTacticalRamFish(){
  const now=gameNow();
  if(now<autoRamNextEvaluationAt||now-lastRamFishAt<getRamFishCooldownMs())return;
  autoRamNextEvaluationAt=now+(lowPerfMode?370:230);
  const aim=autoPlanRamFish();
  if(aim)launchRamFish(aim);
}
function updateAutoPlayer(dt){
  if(gameStarted&&!gameOver)markRankingInvalidByAI();
  autoTryTacticalRamFish();
  refreshAutoModeUI();
  if(!autoRunStartTime)autoRunStartTime=performance.now();

  autoDecisionCooldown-=dt;
  const imminentProjectile=autoHasImminentProjectileThreat();
  if(autoDecisionCooldown>0&&!imminentProjectile){
    if(!autoTargetStillValid(autoStableTarget)){autoStableTarget=null;autoStableTargetUntil=0;}
    autoUpdateAimAndShoot(autoStableTarget);
    return;
  }
  autoDecisionCooldown=imminentProjectile?.045:(lowPerfMode?.16:.10);
  const target=autoFindBestTarget();
  autoUpdateAimAndShoot(target);

  const v={x:0,y:0};
  let danger=autoAvoidOctopus(v);
  const nearbyCats=cats.filter(c=>isFinitePos(c)&&!c.dead)
    .map(c=>({c,d:Math.hypot(c.x-player.x,c.y-player.y)}))
    .sort((a,b)=>a.d-b.d).slice(0,18);
  for(const {c} of nearbyCats){
    const radius=c.type==="mini"?190:c.type==="glutton"?380:c.type==="yarn"?350:285;
    const weight=c.type==="glutton"?4.6:c.type==="mini"?2.9:c.type==="yarn"?4.1:c.type==="thief"?3.5:3.25;
    danger+=autoRepelFrom(v,c,radius,weight);
  }
  if(isCombatTargetAvailable(boss))danger+=autoRepelFrom(v,boss,(boss.r||60)+280,boss.type==="demon"?5.9:4.5);

  let projectileDanger=0;
  const projectileSets=[[quacks,430,5.8],[yarnBalls,420,6.4],[demonOrbs,470,7.4]];
  for(const [arr,radius,weight] of projectileSets){
    const nearby=arr.filter(isFinitePos).map(o=>({o,d:Math.hypot(o.x-player.x,o.y-player.y)})).sort((a,b)=>a.d-b.d).slice(0,14);
    for(const {o} of nearby){
      const t=autoDodgeProjectile(v,o,radius,weight);
      projectileDanger+=t;
      danger+=t;
    }
  }
  if(boss&&boss.type==="seal"&&boss.state==="jumping"&&Number.isFinite(boss.targetX)&&Number.isFinite(boss.targetY)){
    const dx=player.x-boss.targetX,dy=player.y-boss.targetY,d=Math.hypot(dx,dy)||1;
    const safeRadius=(boss.r||60)+(player.r||18)+145;
    if(d<safeRadius){
      const urgency=Math.max(.25,1-(boss.jumpTimer||0)/Math.max(.01,boss.jumpDuration||1));
      const force=(1-d/safeRadius)*(5.5+urgency*8.5);
      autoSafeAdd(v,dx/d,dy/d,force);
      danger+=force*.38;projectileDanger+=force*.45;
    }
  }

  autoUpdateStuckState(dt,danger);
  const emergencyEscaping=autoApplyEmergencyEscape(v,danger);

  const margin=boss&&boss.type==="demon"?180:125;
  if(player.x<margin)v.x+=(margin-player.x)/margin*(boss&&boss.type==="demon"?6.6:4.4);
  if(player.x>canvas.width-margin)v.x-=(player.x-(canvas.width-margin))/margin*(boss&&boss.type==="demon"?6.6:4.4);
  if(player.y<margin)v.y+=(margin-player.y)/margin*(boss&&boss.type==="demon"?6.6:4.4);
  if(player.y>canvas.height-margin)v.y-=(player.y-(canvas.height-margin))/margin*(boss&&boss.type==="demon"?6.6:4.4);

  const hpRatio=life/Math.max(1,upgrades.maxLife||100);
  const safeToLoot=!emergencyEscaping&&projectileDanger<.72&&danger<.82&&hpRatio>.58;
  const verySafeToLoot=!emergencyEscaping&&projectileDanger<.28&&danger<.46&&hpRatio>.72;

  let nearestStar=null,nearestStarD=Infinity;
  powerStars.forEach(s=>{
    if(!isFinitePos(s))return;
    const d=Math.hypot(s.x-player.x,s.y-player.y);
    if(d<nearestStarD){nearestStar=s;nearestStarD=d;}
  });
  if(nearestStar){
    const starWeight=projectileDanger>1.25?.35:(danger>1.35?2.2:9.5);
    autoAttractTo(v,nearestStar,1200,starWeight);
  }

  if(hpRatio<.82){
    const cans=tunaDrops.filter(isFinitePos).map(t=>({t,d:Math.hypot(t.x-player.x,t.y-player.y)})).sort((a,b)=>a.d-b.d).slice(0,3);
    for(const {t} of cans)autoAttractTo(v,t,hpRatio<.42?1050:760,hpRatio<.42?9.0:5.0);
  }

  if(safeToLoot){
    const coinRange=verySafeToLoot?760:520;
    const collectWeight=verySafeToLoot?3.3:1.55;
    const nearbyCoins=coinsDrops.filter(isFinitePos).map(c=>({c,d:Math.hypot(c.x-player.x,c.y-player.y)})).sort((a,b)=>a.d-b.d).slice(0,5);
    for(const {c} of nearbyCoins)autoAttractTo(v,c,coinRange,collectWeight);
  }

  if(target&&isFinitePos(target)){
    const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy)||1;
    let desired=boss?(boss.type==="demon"?560:430):335;
    if(target.rainbow)desired=260;
    if(!emergencyEscaping&&target.rainbow&&danger<1.05){
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

  autoMoveKeysFromVector(autoProjectileSafeMovement(v));
}

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
    "darkPact+moralSupport":1180,
    "catInstinct+maxLife":1100,
    "damage+critChance":1080,
    "damage+pierce":1000,
    "damage+lifeSteal":980,
    "lifeSteal+shield":960,
    "doubleFish+omniBurst":940,
    "pierce+yarnBounce":930,
    "bigFish+fishSize":920,
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

  if(parts.includes("damageReduction"))v+=life<upgrades.maxLife*.6?420:190;
  if(parts.includes("luck"))v+=wave<20?230:140;
  if(parts.includes("damage"))v+=260;
  if(parts.includes("fireRate"))v+=210;
  if(parts.includes("doubleFish"))v+=190;
  if(parts.includes("critChance"))v+=190;
  if(parts.includes("pierce"))v+=180;
  if(parts.includes("omniBurst"))v+=180;
  if(parts.includes("lifeSteal"))v+=170;
  if(parts.includes("shield"))v+=160;
  if(parts.includes("saltScales"))v+=130;
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
    if(fusedUpgradeNames[key]||fusedUpgradeNames[other]||!isFusionChoiceCompletionSafe(key,other))return;
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
    if(other===key||hasFusionBeenDone(key,other)||fusedUpgradeNames[other]||!isFusionChoiceCompletionSafe(key,other))return;
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
    saltScales:495,aimAssist:570,bigCursor:180,moveSpeed:460,
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
    const defensiveKeys=["damageReduction","maxLife","healOnWave","lifeSteal","shield","catSlow","moveSpeed","catInstinct"];
    if((hpRatioNow<.55||pressureNow>15||(runStats.damageTaken||0)>upgrades.maxLife*.65)&&defensiveKeys.includes(key))score+=220;
    if((runStats.fishHits||0)<Math.max(4,(runStats.shotsFired||0)*.35)&&["aimAssist","fishSpeed","fishSize","bigCursor"].includes(key))score+=150;
  }

  if(key==="bigCursor"||key==="moralSupport"||key==="darkPact"){
    const future=autoFusionFutureValue(key);
    if(future<420)score-=320;
    else score+=future*.45;
  }
  if(cats.some(c=>c.type==="yarn"||c.type==="thief"||c.type==="musician")){
    if(["fishSpeed","aimAssist","saltScales","pierce","damage","catSlow"].includes(key))score+=140;
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

initAutoMode();

restart();gameStarted=false;startPanel.style.display="flex";requestAnimationFrame(loop);

if(gameStorage.unavailable){
  const note=document.createElement("p");
  note.className="storageNotice";
  note.textContent="El navegador no permite guardar el progreso. Esta sesión funciona, pero los nuevos logros y cosméticos se perderán al cerrar.";
  document.getElementById("startBox").appendChild(note);
}
async function loadRankingDependencies(){
  if(window.firebase?.firestore){initRanking();retryPendingScores();return;}
  async function script(src){
    return new Promise((resolve,reject)=>{
      const el=document.createElement("script");
      const timer=setTimeout(()=>{el.remove();reject(new Error("Tiempo de carga agotado"))},12000);
      el.src=src;el.async=true;
      el.onload=()=>{clearTimeout(timer);resolve()};
      el.onerror=()=>{clearTimeout(timer);el.remove();reject(new Error("Ranking sin conexión"))};
      document.head.appendChild(el);
    });
  }
  try{
    if(!window.firebase)await script("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
    if(!window.firebase?.firestore)await script("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore-compat.js");
    initRanking();
    await loadOnlineRanking([startRankingList]);
    await retryPendingScores();
  }catch(e){firebaseReady=false;renderAllRankingLists();}
}
loadRankingDependencies();

const cosmeticPreviewCache=new Map();
function paintCosmeticPreviews(generation){
 if(!cosmeticsContentEl||generation!==cosmeticPreviewGeneration)return;
 const elements=Array.from(cosmeticsContentEl.querySelectorAll("[data-skin]"));
 let cursor=0;
 function paintBatch(){
 if(generation!==cosmeticPreviewGeneration)return;
 let budget=6;
 while(cursor<elements.length&&budget-->0){
 const el=elements[cursor++];if(!el.isConnected)continue;
  const category=el.dataset.category,id=el.dataset.skin,key=category+":"+id;
  if(id==="fish_realistic"){
   const img=document.createElement("img");
   img.src=REALISTIC_SARDINE_SOURCE;
   img.alt=el.getAttribute("aria-label")||"Sardina realista";
   img.width=88;img.height=52;
   img.style.width="88px";
   img.style.height="52px";
   img.style.maxWidth="46%";
   img.style.objectFit="contain";
   img.style.display="block";
   img.style.margin="auto";
   el.replaceChildren(img);
   continue;
  }
  if(!cosmeticPreviewCache.has(key)){
   const thumbnail=document.createElement("canvas");thumbnail.width=256;thumbnail.height=176;
   const saved={runCosmeticSelections,ctx,player:{...player},boss,selected:selectedCosmetics,starActive,starTime,sevenLivesTime,lowPerfMode,dogKidnapped};
   try{
    runCosmeticSelections=null;ctx=thumbnail.getContext("2d");ctx.scale(2,2);ctx.translate(category==="player"?51:64,49);
    selectedCosmetics={...selectedCosmetics,[category]:id};starActive=false;starTime=0;sevenLivesTime=0;lowPerfMode=true;dogKidnapped=false;
    if(category==="player"){Object.assign(player,{x:0,y:0,angle:0,r:24,hurtAnim:0,shootAnim:0});drawPlayer();}
    else if(category==="fish"){ctx.scale(1.65,1.65);drawFish({x:0,y:0,angle:0,scale:1});}
    else if(category==="enemy"){drawCat({x:0,y:0,r:24,color:"#f7b7c9",type:"normal",hp:1,maxHp:1,hitAnim:0});}
    else {const type={boss_giant:"giantCat",boss_duck:"duck",boss_seal:"seal",boss_demon:"demon",boss_octopus:"octopus"}[category];boss={type,x:0,y:0,r:27,hitAnim:0,wobble:0,state:"idle",shadowX:0,shadowY:0};drawBoss();}
    cosmeticPreviewCache.set(key,thumbnail.toDataURL());
   }finally{runCosmeticSelections=saved.runCosmeticSelections;ctx=saved.ctx;Object.assign(player,saved.player);boss=saved.boss;selectedCosmetics=saved.selected;starActive=saved.starActive;starTime=saved.starTime;sevenLivesTime=saved.sevenLivesTime;lowPerfMode=saved.lowPerfMode;dogKidnapped=saved.dogKidnapped;}
  }
  const img=document.createElement("img");img.src=cosmeticPreviewCache.get(key);img.alt=el.getAttribute("aria-label")||"Vista de skin";img.width=128;img.height=88;el.replaceChildren(img);
 }
 if(cursor<elements.length)requestAnimationFrame(paintBatch);
 }
 paintBatch();
}
function bossArt(type,r,poly=false){
ctx.save();ctx.scale(r,r);ctx.shadowBlur=0;ctx.lineWidth=.035;ctx.lineJoin='round';ctx.lineCap='round';
const ink=type==='demon'?'#54284f':type==='duck'?'#b27b36':'#65546c';ctx.strokeStyle=ink;
const path=(d,fill,stroke=true)=>{let p=bossPathCache.get(d);if(!p){p=new Path2D(d);bossPathCache.set(d,p);}ctx.fillStyle=fill;ctx.fill(p);if(stroke)ctx.stroke(p);};
const oval=(x,y,w,h,fill,stroke=false)=>{ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke)ctx.stroke();};
const shade=(top,bottom)=>{const g=ctx.createLinearGradient(-.4,-.9,.4,.9);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;};
const eye=(x,y,size=.09)=>{oval(x,y,size,size*1.24,'#382e48');oval(x-size*.30,y-size*.40,size*.32,size*.32,'#fff');oval(x+size*.28,y+size*.34,size*.15,size*.15,'#cdb9dc');};
if(poly){
 if(type==='giantCat'){
  path('M-.8-.48 -.92-1.1 -.34-.77 .34-.77 .92-1.1 .8-.48 .86.58 .42.87 -.42.87 -.86.58Z','#ddd0f6');
  path('M-.8-.48 -.92-1.1 -.34-.77 -.24-.43Z','#b69ad8',false);path('M.8-.48 .92-1.1 .34-.77 .24-.43Z','#b69ad8',false);
  path('M-.8-.48 -.5.52 .42.87 -.42.87 -.86.58Z','#c1a9df',false);path('M-.68-.75 -.74-.96 -.48-.78Z','#f4b4d0',false);path('M.68-.75 .74-.96 .48-.78Z','#f4b4d0',false);
  ctx.fillStyle='#483557';ctx.fillRect(-.43,-.2,.14,.17);ctx.fillRect(.29,-.2,.14,.17);path('M-.11.09 .11.09 0 .21Z','#b87f9f',false);
  path('M-.2.33 0 .39 .2.33', 'transparent');
  ctx.beginPath();for(const side of [-1,1]){ctx.moveTo(side*.51,.13);ctx.lineTo(side*.98,.05);ctx.moveTo(side*.53,.3);ctx.lineTo(side*.94,.38);}ctx.stroke();
 }else if(type==='duck'){
  path('M-.62-.36 -.68-.88 -.4-1.05 .07-.98 .26-.64 .24-.18 .62-.08 1.02-.35 .92.40 .61.78 -.46.83 -.93.49 -.98.02Z','#f6d46f');
  path('M-.98.02 -.46.55 .61.55 .92.4 .61.78 -.46.83 -.93.49Z','#eeb647',false);
  path('M-.62-.36 -1.08-.42 -1.22-.19 -.63-.07Z','#eb9250');
  path('M-.12.10 .48.02 .64.27 .22.47 -.2.30Z','#ffe7a0');ctx.fillStyle='#453646';ctx.fillRect(-.38,-.68,.12,.15);oval(-.32,-.64,.035,.035,'#fff');path('M.30-.05 .58.05 .38.30 .12.20Z','#f8df86');path('M.72.02 1.12-.18 .98.18 1.12.42 .68.34Z','#e8b044');
 }else if(type==='seal'){
  path('M-.92.22 -.65-.58 -.28-.87 .42-.78 .83-.38 1 .36 .57.72 -.5.75Z','#d0e6e8');
  path('M-.92.22 -1.23.49 -.65.65 -.5.75 .57.72 .94.57 1.2.73 1.19.35 1 .36Z','#87b6c3');
  path('M-.4-.2 .4-.2 .65.53 -.49.55Z','#eff6f2',false);ctx.fillStyle='#355367';ctx.fillRect(-.35,-.21,.12,.14);ctx.fillRect(.3,-.21,.12,.14);path('M-.1.02 .1.02 0 .14Z','#486170');ctx.beginPath();for(const side of [-1,1]){ctx.moveTo(side*.08,.16);ctx.lineTo(side*.58,.08);ctx.moveTo(side*.08,.22);ctx.lineTo(side*.62,.30);}ctx.stroke();path('M-.72.42 -1.18.62 -.70.68Z','#87b6c3');path('M.72.42 1.18.62 .70.68Z','#87b6c3');
 }else{
  path('M-.63-.49 -.94-.73 -.93-1.16 -.47-.91Z','#b396d4');path('M.63-.49 .94-.73 .93-1.16 .47-.91Z','#b396d4');
  path('M-.8-.14 -1.27-.43 -1.16.44 -.61.54Z','#6b477b');path('M.8-.14 1.27-.43 1.16.44 .61.54Z','#6b477b');
  path('M-.67-.69 .58-.69 .83-.42 .8.6 .46.85 -.48.85 -.8.5 -.83-.4Z','#a85c98');path('M-.83-.4 -.48.55 .46.85 -.48.85 -.8.5Z','#7e3e78',false);
  path('M-.5-.19 -.15-.08 -.2.08 -.48.02Z','#ffe2a2',false);path('M.5-.19 .15-.08 .2.08 .48.02Z','#ffe2a2',false);path('M-.3.32 .3.32 .2.59 -.2.59Z','#462743');path('M-.24.32 -.10.32 -.17.5Z','#fff5e6',false);path('M.24.32 .10.32 .17.5Z','#fff5e6',false);path('M-.56-.72 -.82-1.18 -.35-.88Z','#d5b7ed');path('M.56-.72 .82-1.18 .35-.88Z','#d5b7ed');
 }
}else if(type==='giantCat'){
 path('M-.79-.33 Q-.96-.81 -.81-1.08 Q-.62-1.08 -.31-.76 Q0-.90 .31-.76 Q.62-1.08 .81-1.08 Q.96-.81 .79-.33 C1.09.36 .70.85 0 .87 C-.70.85 -1.09.36 -.79-.33Z',shade('#fff5e1','#e9cfae'));
 path('M-.73-.84 -.67-.42 -.42-.66Z','#e9aabb',false);path('M.73-.84 .67-.42 .42-.66Z','#e9aabb',false);
 path('M-.23-.79 Q-.15-.41 -.08-.40 L-.06-.82 M.23-.79 Q.15-.41 .08-.40 L.06-.82','#d3b4a2',false);
 oval(0,.32,.5,.33,'#fff6e8');eye(-.33,-.12,.115);eye(.33,-.12,.115);oval(-.59,.17,.16,.09,'#efb9bd');oval(.59,.17,.16,.09,'#efb9bd');
 path('M-.09.12 Q0 .08 .09.12 Q.08.20 0 .24 Q-.08.2 -.09.12Z','#ae7c8e',false);
 ctx.beginPath();ctx.moveTo(0,.24);ctx.bezierCurveTo(-.03,.4,-.19,.42,-.24,.31);ctx.moveTo(0,.24);ctx.bezierCurveTo(.03,.4,.19,.42,.24,.31);for(const side of [-1,1]){ctx.moveTo(side*.55,.1);ctx.lineTo(side*.95,.03);ctx.moveTo(side*.57,.27);ctx.lineTo(side*.94,.34);}ctx.stroke();
 oval(-.38,.74,.21,.14,'#fff4df',true);oval(.38,.74,.21,.14,'#fff4df',true);
}else if(type==='duck'){
 path('M-.55-.13 C-.78-.26 -.91-.59 -.77-.87 C-.62-1.18 -.14-1.12 .05-.84 C.21-.65 .16-.41 .04-.22 Q.46-.36 .68-.02 Q.85-.04 1.01-.25 Q1.12.14 .86.48 C.58.91 -.41.94 -.83.52 Q-1.10.14 -.55-.13Z',(selectedCosmetic('boss_duck')==='boss_duck_monocle'?shade('#fff9e4','#c6d2d8'):shade('#fff0a2','#efbd55')));
 path('M-.46.08 C-.06-.12 .50-.05 .57.2 Q.42.51 -.07.52 Q-.4.45 -.46.08Z',(selectedCosmetic('boss_duck')==='boss_duck_monocle'?shade('#455e78','#23344f'):shade('#ffeaba','#efc164')));
 ctx.strokeStyle='#d49c4c';ctx.lineWidth=.023;ctx.beginPath();ctx.moveTo(-.26,.21);ctx.quadraticCurveTo(.03,.38,.32,.24);ctx.stroke();ctx.strokeStyle=ink;ctx.lineWidth=.035;
 path('M-.67-.59 Q-.98-.67 -1.1-.43 Q-.91-.28 -.60-.34Z',shade('#ffc28c','#ee9a55'));
 ctx.beginPath();ctx.moveTo(-1.02,-.43);ctx.lineTo(-.68,-.44);ctx.stroke();eye(-.28,-.68,.08);oval(-.46,-.40,.105,.065,'#edb48a');oval(-.23,-.92,.19,.055,'#fff3bc');
}else if(type==='seal'){
 path('M-.71.35 Q-1.04-.08 -.64-.62 C-.37-1.06 .36-1.01 .69-.61 Q1.02-.19 .89.4 Q.80.86 .09.87 Q-.43.87 -.71.35Z',(selectedCosmetic('boss_seal')==='boss_seal_tie'?shade('#eddbf4','#ac86b9'):shade('#d7e8eb','#8db6c5')));
 path('M-.65.30 Q-1.19.15 -1.15.50 Q-1.02.72 -.54.58Z','#94bfcd');path('M.71.44 Q1.08.27 1.19.58 Q1.05.77 .65.66Z','#88b4c3');
 oval(.02,.37,.57,.41,'#e9f1ef');oval(-.37,.11,.15,.085,'#e4b4c7');oval(.45,.11,.15,.085,'#e4b4c7');
 if(boss?.state==='stunned'){ctx.beginPath();ctx.moveTo(-.36,-.18);ctx.lineTo(-.20,-.18);ctx.moveTo(.24,-.18);ctx.lineTo(.40,-.18);ctx.stroke();}else{eye(-.28,-.21);eye(.32,-.21);}
 oval(.02,.05,.09,.06,'#4e667d');ctx.beginPath();ctx.moveTo(.02,.1);ctx.quadraticCurveTo(-.08,.3,-.23,.19);ctx.moveTo(.02,.1);ctx.quadraticCurveTo(.12,.3,.27,.19);for(const side of [-1,1]){ctx.moveTo(side*.31,.14);ctx.lineTo(side*.67,.1);ctx.moveTo(side*.32,.26);ctx.lineTo(side*.67,.34);}ctx.stroke();
 for(const [x,y,w] of [[-.39,-.57,.065],[-.15,-.73,.09],[.14,-.68,.06]])oval(x,y,w,w*.55,'#aac8cf');
}else{
 path('M-.62-.28 Q-1.10-.74 -1.20-.13 L-1.10.37 Q-.87.10 -.62.60Z','#784b8b');path('M.62-.28 Q1.10-.74 1.20-.13 L1.10.37 Q.87.10 .62.60Z','#784b8b');
 path('M-.42-.60 Q-.97-.67 -.87-1.19 Q-.67-.95 -.31-.89Z',(selectedCosmetic('boss_demon')==='boss_demon_cape'?shade('#ffe4a1','#ca9849'):shade('#e2c9ed','#ab82c3')));path('M.42-.60 Q.97-.67 .87-1.19 Q.67-.95 .31-.89Z',(selectedCosmetic('boss_demon')==='boss_demon_cape'?shade('#ffe4a1','#ca9849'):shade('#e2c9ed','#ab82c3')));
 path('M-.73-.48 C-.37-.96 .49-.92 .76-.4 C1.06.22 .68.89 0 .87 C-.76.88 -1.02.17 -.73-.48Z',(selectedCosmetic('boss_demon')==='boss_demon_cape'?shade('#bd5c60','#74273e'):shade('#d692be','#a15b9a')));
 path('M-.49-.19 Q-.30-.37 -.13-.14 Q-.26.12 -.48.02Z','#ffe5aa');path('M.49-.19 Q.30-.37 .13-.14 Q.26.12 .48.02Z','#ffe5aa');oval(-.3,-.1,.042,.082,'#573654');oval(.3,-.1,.042,.082,'#573654');
 oval(-.57,.24,.14,.075,'#de9eb9');oval(.57,.24,.14,.075,'#de9eb9');
 path('M-.36.29 Q0 .46 .36.29 Q.34.72 0 .72 Q-.34.72 -.36.29Z','#56304f');path('M-.26.34 -.12.38 -.20.54Z','#fff3df',false);path('M.26.34 .12.38 .20.54Z','#fff3df',false);oval(0,.64,.13,.05,'#d28ca9');
}
ctx.restore();
}
function drawPawCoin(x,y,r){
ctx.save();ctx.translate(x,y);ctx.scale(r,r);ctx.shadowBlur=0;
const g=ctx.createLinearGradient(-1,-1,1,1);g.addColorStop(0,'#fff0ad');g.addColorStop(.5,'#f7cf6e');g.addColorStop(1,'#dca144');
ctx.fillStyle=g;ctx.strokeStyle='#b88135';ctx.lineWidth=.12;ctx.beginPath();ctx.arc(0,0,.94,0,Math.PI*2);ctx.fill();ctx.stroke();
ctx.strokeStyle='#fff0b5';ctx.lineWidth=.055;ctx.beginPath();ctx.arc(0,0,.75,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#aa7332';
ctx.beginPath();ctx.ellipse(0,.25,.32,.25,0,0,Math.PI*2);ctx.fill();
for(const [x,y,a] of [[-.42,-.1,-.4],[-.16,-.37,-.15],[.16,-.37,.15],[.42,-.1,.4]]){ctx.beginPath();ctx.ellipse(x,y,.12,.17,a,0,Math.PI*2);ctx.fill();}ctx.restore();
}

function decorateCoinText(root){
if(!root||!root.isConnected)return;
const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
while(walk.nextNode()){const n=walk.currentNode;if(/[🪙💰]/u.test(n.data)&&!['SCRIPT','STYLE'].includes(n.parentElement?.tagName))nodes.push(n);}
for(const n of nodes){const parts=n.data.split(/(🪙|💰)/u);const fragment=document.createDocumentFragment();for(const part of parts){if(part==='🪙'||part==='💰'){const icon=document.createElement('span');icon.className='pawCoinIcon';icon.setAttribute('role','img');icon.setAttribute('aria-label','moneda con patita');fragment.appendChild(icon);}else fragment.appendChild(document.createTextNode(part));}n.replaceWith(fragment);}
}
if(typeof MutationObserver!=='undefined'){
decorateCoinText(document.body);
new MutationObserver(records=>{for(const record of records){if(record.type==='characterData'&&/[🪙💰]/u.test(record.target.data))decorateCoinText(record.target.parentNode);for(const n of record.addedNodes){if(n.nodeType===1)decorateCoinText(n);else if(n.nodeType===3&&/[🪙💰]/u.test(n.data))decorateCoinText(n.parentNode);}}}).observe(document.body,{subtree:true,childList:true,characterData:true});
}

function updateRandomSkinsButton(){
const btn=document.getElementById("randomSkinsButton");if(!btn)return;
btn.textContent=randomSkinsEnabled?"🎲 Random: activado":"🎲 Random: desactivado";btn.setAttribute("aria-pressed",String(randomSkinsEnabled));
}
function rollRandomSkins(){
runCosmeticSelections=null;if(!randomSkinsEnabled)return;
runCosmeticSelections={};for(const cat of Object.keys(COSMETIC_CATEGORIES)){
const pool=COSMETICS.filter(c=>c.category===cat&&ownedCosmetics.has(c.id));
runCosmeticSelections[cat]=pool.length?pool[Math.floor(Math.random()*pool.length)].id:"default";
}
}
document.getElementById("randomSkinsButton")?.addEventListener("click",()=>{randomSkinsEnabled=!randomSkinsEnabled;gameStorage.setItem("gatitos_random_skins",String(randomSkinsEnabled));updateRandomSkinsButton();});
updateRandomSkinsButton();

function formatRunTime(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;}
const runClockEl=document.getElementById('runClock');
const runTimeEl=document.getElementById('runTime');
const starCountdownEl=document.getElementById('starCountdown');
function getStarCountdownText(){return (Math.ceil(Math.max(0,starTime)*10-1e-9)/10).toFixed(1);}
function updateRunIndicators(){
 updateAdminVisibility();
 if(runClockEl){
   const hidden=!gameStarted||gameOver;
   if(runClockEl.hidden!==hidden)runClockEl.hidden=hidden;
   setHudText(runTimeEl,formatRunTime(runStats?.elapsed));
 }
 if(starCountdownEl){
   const hidden=!gameStarted||gameOver||!isPowerStarActive();
   if(starCountdownEl.hidden!==hidden)starCountdownEl.hidden=hidden;
   const ending=starTime<=3;
   if(starCountdownEl.classList.contains('ending')!==ending)starCountdownEl.classList.toggle('ending',ending);
   if(!hidden)setHudText(starCountdownEl,ending?`⭐ ¡Se acaba! ${getStarCountdownText()} s`:`⭐ Invulnerable · ${getStarCountdownText()} s`);
 }
}

let adminUnlocked=false,adminPreviousPause=false,adminExpanded=false,adminActiveTab="game";
function normalizeAdminName(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function updateAdminVisibility(){
 const panel=document.getElementById('adminPanel');if(!panel)return;
 const allowed=adminUnlocked&&gameStarted&&!gameOver;
 if(!allowed&&panel.open)closeAdmin();
 panel.hidden=!allowed;
}
function openAdmin(){
 const panel=document.getElementById('adminPanel');
 if(!adminUnlocked||!gameStarted||gameOver||choosingUpgrade||!panel)return;
 if(!adminExpanded){adminPreviousPause=paused;adminExpanded=true;}
 paused=true;clearAllInputKeys();releaseGamePointer();panel.open=true;renderAdmin();
}
function closeAdmin(){
 const panel=document.getElementById('adminPanel');if(panel)panel.open=false;
 if(adminExpanded){adminExpanded=false;paused=adminPreviousPause;syncGamePointerLock();}
}
function adminSetTab(tab){
 adminActiveTab=['game','upgrades','wave'].includes(tab)?tab:'game';
 document.querySelectorAll('#adminPanel [data-admin-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.adminTab===adminActiveTab));
 document.querySelectorAll('#adminPanel .adminTabPage').forEach(page=>page.hidden=page.dataset.adminPage!==adminActiveTab);
}
function renderAdminSelection(){
 const select=document.getElementById('adminUpgrade'),name=document.getElementById('adminSelectionName'),info=document.getElementById('adminSelectionInfo');
 if(!select||!name||!info)return;
 const key=select.value;if(!Object.hasOwn(upgradeLevels,key))return;
 const pair=getFusedPairForKey(key),level=getPauseActualLevel(key),max=upgradeMaxLevels[key]||5;
 name.textContent=getUpgradeDisplayName(key);
 if(pair){
  const parts=pair.split('+');
  info.textContent=`Fusionada · ${getFusionNameFromPair(parts[0],parts[1])} · Nivel de fusión ${getFusionProgress(pair)}/5`;
 }else info.textContent=`Nivel ${level}/${max}`;
}
function renderAdmin(){
 const controls=document.getElementById('adminControls');if(!controls)return;
 controls.hidden=!adminUnlocked;if(!adminUnlocked)return;
 const select=document.getElementById('adminUpgrade'),previous=select.value;
 select.innerHTML=Object.keys(upgradeLevels).map(k=>`<option value="${k}">${escapeHtml(getUpgradeDisplayName(k))} (${getPauseActualLevel(k)}/${upgradeMaxLevels[k]||5})</option>`).join('');
 if(Object.hasOwn(upgradeLevels,previous))select.value=previous;
 document.getElementById('adminAI').innerHTML=autoMode?'<span>🤖</span><b>Desactivar IA</b>':'<span>🤖</span><b>Activar IA</b>';
 document.getElementById('adminStats').innerHTML=`<span>🌊 Ronda <b>${wave||1}</b></span><span>⏱ <b>${formatRunTime(runStats?.elapsed)}</b></span><span>🔮 <b>${Object.keys(doneFusionPairs).length}/14</b> fusiones</span>`;
 const waveInput=document.getElementById('adminWave');if(waveInput&&document.activeElement!==waveInput)waveInput.value=wave||1;
 adminSetTab(adminActiveTab);renderAdminSelection();
}
function adminAction(action){
 if(!adminUnlocked)return false;
 if(!gameStarted||gameOver){const stats=document.getElementById('adminStats');if(stats)stats.textContent='Inicia una partida para usar las herramientas.';return false;}
 markRankingInvalidByAI();
 if(action==='coins')coins+=100;
 else if(action==='heal')life=upgrades.maxLife;
 else if(action==='upgrade'){
  const key=document.getElementById('adminUpgrade').value;if(!Object.hasOwn(upgradeLevels,key))return false;
  const pair=getFusedPairForKey(key);if(pair)setFusionProgress(pair,5);else upgradeLevels[key]=upgradeMaxLevels[key]||5;applyUpgradeStatsFromLevels();
 }else if(action==='all'){
  Object.keys(upgradeLevels).forEach(k=>{if(!isHiddenFusedComponent(k))upgradeLevels[k]=upgradeMaxLevels[k]||5;});
  Object.keys(doneFusionPairs).forEach(pair=>setFusionProgress(pair,5));uniqueFusionKeys.forEach(k=>upgrades[k]=true);applyUpgradeStatsFromLevels();life=upgrades.maxLife;
 }else if(action==='star')activatePowerStar();
 else if(action==='ai')setAutoMode(!autoMode);
 else if(action==='shop'){closeAdmin();openCoinShop();return true;}
 else if(action==='fusion'){coins=Math.max(coins,getEffectiveShopFusionPrice());closeAdmin();openFusionChoice(getEffectiveShopFusionPrice());return true;}
 else if(action==='wave'){
  const next=Number(document.getElementById('adminWave').value);if(!Number.isFinite(next))return false;wave=Math.max(1,Math.min(200,Math.floor(next)));startWave();
 }else if(action==='wavePrev'){wave=Math.max(1,(wave||1)-1);startWave();}
 else if(action==='waveNext'){wave=Math.min(200,(wave||1)+1);startWave();}
 else return false;
 updateHud();renderAdmin();return true;
}
function initAdminPanel(){
 const panel=document.createElement('details');panel.id='adminPanel';panel.hidden=true;
 panel.innerHTML=`<summary>🧪 Admin</summary><section class="adminBox" aria-labelledby="adminTitle">
 <div class="adminHeading"><div><span class="adminEyebrow">MODO DESARROLLO</span><h2 id="adminTitle">🧪 Laboratorio gatuno</h2></div><button id="adminClose" class="adminClose" aria-label="Cerrar">✕</button></div>
 <div id="adminControls" hidden>
  <div class="adminNotice">⚠️ Usar herramientas o IA desactiva el ranking de esta partida.</div>
  <div id="adminStats" class="adminStats"></div>
  <nav class="adminTabs" aria-label="Secciones del laboratorio"><button type="button" data-admin-tab="game" class="active">⚡ Partida</button><button type="button" data-admin-tab="upgrades">✨ Mejoras</button><button type="button" data-admin-tab="wave">🌊 Rondas</button></nav>
  <div class="adminTabPage" data-admin-page="game">
   <div class="adminSectionTitle"><span>⚡</span><div><b>Herramientas rápidas</b><small>Prepara situaciones de prueba sin salir de la partida.</small></div></div>
   <div class="adminQuickGrid"><button data-action="coins"><span>🪙</span><b>+100 monedas</b></button><button data-action="heal"><span>❤️</span><b>Curar</b></button><button data-action="star"><span>⭐</span><b>Activar estrella</b></button><button data-action="ai" id="adminAI"><span>🤖</span><b>Activar IA</b></button></div>
   <div class="adminLaunchGrid"><button data-action="shop">🛒 Abrir tienda</button><button data-action="fusion">🔮 Abrir fusiones</button></div>
  </div>
  <div class="adminTabPage" data-admin-page="upgrades" hidden>
   <div class="adminSectionTitle"><span>✨</span><div><b>Control de evolución</b><small>Modifica rápidamente una mejora o una fusión ya creada.</small></div></div>
   <label class="adminFieldLabel" for="adminUpgrade">Mejora</label><select id="adminUpgrade"></select>
   <div class="adminSelection"><div><b id="adminSelectionName">Mejora seleccionada</b><small id="adminSelectionInfo"></small></div><button data-action="upgrade">Maximizar</button></div>
   <button class="adminWideDanger" data-action="all">✨ Maximizar todo lo adquirido</button>
  </div>
  <div class="adminTabPage" data-admin-page="wave" hidden>
   <div class="adminSectionTitle"><span>🌊</span><div><b>Control de rondas</b><small>Salta directamente a la situación que quieras probar.</small></div></div>
   <div class="adminWaveStepper"><button data-action="wavePrev" aria-label="Ronda anterior">−</button><input id="adminWave" type="number" min="1" max="200" value="1" aria-label="Ronda"><button data-action="waveNext" aria-label="Ronda siguiente">+</button></div>
   <button class="adminPrimary" data-action="wave">Ir a la ronda indicada</button>
  </div>
 </div></section>`;
 document.body.appendChild(panel);
 panel.querySelector('summary').addEventListener('click',e=>{e.preventDefault();if(panel.open)closeAdmin();else openAdmin();});
 document.getElementById('adminClose').addEventListener('click',closeAdmin);
 panel.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>adminAction(b.dataset.action)));
 panel.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>adminSetTab(b.dataset.adminTab)));
 document.getElementById('adminUpgrade').addEventListener('change',renderAdminSelection);
 document.addEventListener('keydown',e=>{if(!panel.open)return;if(e.key==='Escape'){e.preventDefault();closeAdmin();}e.stopImmediatePropagation();},true);
}
initAdminPanel();

function fusionStrength(pair){return hasDoneFusionPair(pair)?[0,.14,.31,.51,.74,1][getFusionProgress(pair)]:0;}
function getLuckyShotMultiplier(){return hasDoneFusionPair("damage+luck")&&Math.random()<.08+.12*fusionStrength("damage+luck")?1.25:1;}
function getCriticalDamageMultiplier(){return 2+(hasDoneFusionPair("critChance+luck")?.1+.3*fusionStrength("critChance+luck"):0)+(hasDoneFusionPair("critChance+damage")?.08+.22*fusionStrength("critChance+damage"):0);}
function getCurrentLifeSteal(){return upgrades.lifeSteal*(hasDoneFusionPair("damageReduction+lifeSteal")&&life<upgrades.maxLife*.5?1.1+.4*fusionStrength("damageReduction+lifeSteal"):1);}
