const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
(async()=>{
fs.mkdirSync(path.join(__dirname,'capturas'),{recursive:true});
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');const f=path.join(__dirname,'..',u.pathname==='/'?'index.html':u.pathname);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.mp3':'audio/mpeg'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(8766,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8766/')?r.continue():r.abort());
await p.goto('http://127.0.0.1:8766/');await p.waitForTimeout(300);
const cdp=await p.context().newCDPSession(p);const shot=async(name)=>{await p.evaluate(()=>document.fonts.ready);console.log('CAPTURE',name);const r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(__dirname,'capturas',name+'.png'),Buffer.from(r.data,'base64'));};
await shot('menu');await p.click('#cosmeticsPanel summary');await p.waitForTimeout(400);await p.locator('.cosmeticGrid').first().scrollIntoViewIfNeeded();await shot('skins');
console.log('THUMBNAILS',await p.locator('[data-skin] img').count());assert.equal(await p.locator('[data-skin] img').count(),25);
const art=await p.locator('[data-skin] img').evaluateAll(nodes=>nodes.map(n=>({src:n.src,name:n.alt})));
const gallery=await browser.newPage({viewport:{width:1100,height:950}});
await gallery.setContent('<html><body style="margin:0;background:#eee8f4;color:#382640;font:14px sans-serif"><h2 style="padding:0 20px">Vistas reales · 18 skins y 7 aspectos normales</h2><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:20px">'+art.map(a=>'<div style="background:white;border-radius:12px;padding:8px;text-align:center"><img width="128" height="88" src="'+a.src+'"><div>'+a.name+'</div></div>').join('')+'</div></body></html>');
await gallery.screenshot({path:path.join(__dirname,'capturas/catalogo.png')});await gallery.close();

await p.click('#cosmeticsPanel summary');await p.fill('#playerNameInput','Prueba visual');await p.click('#startButton');
await p.evaluate(()=>{restart();wave=4;life=72;spawnCooldown=999;waveTime=999;cats.length=0;for(const [i,t] of ['normal','sleepy','musician','student','thief','yarn'].entries()){spawnCat(350+(i%3)*330,230+Math.floor(i/3)*300);Object.assign(cats[cats.length-1],{type:t,speed:0,sleepState:'sleeping',studyLevel:2,spawnAnim:0,maxSpawnAnim:0});}player.x=680;player.y=370;mouse.x=1000;mouse.y=370;coins=24;shootFish();upgrades.shield=true;upgradeLevels.shield=2;safeTeleportInvulnUntil=gameNow()+100000;});
await p.waitForTimeout(250);await p.evaluate(()=>{floatingTexts.length=0;powerStars.length=0;cats.forEach(c=>{c.spawnAnim=0;c.maxSpawnAnim=0});render();});await shot('partida');
const checks=await p.evaluate(()=>{const out=[];paused=true;cats.length=0;for(const c of COSMETICS){selectedCosmetics[c.category]=c.id;for(const type of ['giantCat','duck','seal','demon']){boss={type,x:900,y:400,r:65,hp:80,maxHp:100,hitAnim:0,wobble:0,state:'idle',shadowX:900,shadowY:430};render();}out.push(c.id);}resetCosmeticSelections();boss=null;return out;});
assert.equal(checks.length,18);
const isolation=await p.evaluate(()=>{const state=()=>JSON.stringify({player,boss,selectedCosmetics,starActive,starTime,sevenLivesTime,lowPerfMode,dogKidnapped,life,coins});const before=state();cosmeticPreviewCache.clear();paintCosmeticPreviews();return before===state();});assert.equal(isolation,true);
await p.evaluate(()=>{for(const mode of [false,true]){lowPerfMode=mode;for(const state of ['normal','hurt','star','seven']){starActive=state==='star';starTime=starActive?2:0;upgrades.sevenLives=state==='seven';sevenLivesTime=upgrades.sevenLives?1:0;player.hurtAnim=state==='hurt'?.2:0;render();}}starActive=false;starTime=0;sevenLivesTime=0;player.hurtAnim=0;lowPerfMode=false;});
await p.waitForTimeout(200);
await p.evaluate(()=>{paused=false;coins=120;upgradeLevels.damage=2;upgradeLevels.fishSpeed=4;upgradeLevels.shield=5;applyUpgradeStatsFromLevels();openCoinShop();});await shot('tienda');
await p.evaluate(()=>{document.body.classList.add('panel-theme-dark')});await shot('tienda-oscura');
await p.evaluate(()=>{levelUpPanel.style.display='none';choosingUpgrade=false;paused=false;restart();const choose=chooseNextBossType;chooseNextBossType=()=> 'duck';spawnBoss();chooseNextBossType=choose;selectedCosmetics.boss_duck='boss_duck_monocle';boss.x=900;boss.y=390;boss.r=75;boss.speed=0;safeTeleportInvulnUntil=gameNow()+100000;spawnCooldown=999;});await p.waitForTimeout(100);await shot('jefe');
// Render workload, not a hardware-independent FPS guarantee.
const perf=await p.evaluate(()=>{paused=true;boss=null;cats.length=0;for(let i=0;i<100;i++){spawnCat(80+(i%15)*80,120+Math.floor(i/15)*75);}fishes.length=0;for(let i=0;i<180;i++)fishes.push({x:100+(i%20)*55,y:180+Math.floor(i/20)*45,angle:.2,scale:1});const t=performance.now();for(let i=0;i<120;i++)render();return {frames:120,cats:cats.length,fish:fishes.length,ms:performance.now()-t,error:window.__lastGameError};});await shot('carga');
assert.equal(perf.error,undefined);assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(__dirname,'visual-results.json'),JSON.stringify({skins:checks,thumbnailCount:25,thumbnailStateIsolation:isolation,combatStates:true,errors,perf},null,2));console.log(JSON.stringify({skins:checks.length,errors,perf}));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
