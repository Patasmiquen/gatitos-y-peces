const vm=require('vm'),fs=require('fs');
const src=fs.readFileSync(process.env.GAME_SOURCE||require('path').join(__dirname,'../game.js'),'utf8');
function setup(saved={}){
 let now=10000;const elements=new Map(),events={},writes={};
 function node(id='') {const listeners={};return {id,style:{},dataset:{},children:[],value:'',textContent:'',innerHTML:'',classList:{toggle(){},add(){},remove(){}},addEventListener(k,f){(listeners[k]??=[]).push(f)},dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},querySelector(){return null},querySelectorAll(){return []},closest(){return null},appendChild(n){this.children.push(n);n.parentNode=this},append(...n){n.forEach(x=>this.appendChild(x))},insertBefore(n){this.appendChild(n)},remove(){},focus(){},getBoundingClientRect(){return {left:0,top:0,width:1366,height:768}},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}})})}}};
 const get=id=>{if(!elements.has(id))elements.set(id,node(id));return elements.get(id)};
 const audioNode=()=>new Proxy({gain:new Proxy({},{get:()=>()=>{}}),frequency:new Proxy({},{get:()=>()=>{}})},{get:(t,k)=>k in t?t[k]:()=>{}});
 const context={console,Math,Date,Set,Map,Number,String,Array,Object,JSON,Infinity,performance:{now:()=>now},requestAnimationFrame:()=>0,cancelAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},localStorage:{getItem:k=>{if(saved.__block)throw new Error("blocked");return saved[k]??null},setItem(k,v){if(saved.__block)throw new Error("blocked");saved[k]=String(v);writes[k]=(writes[k]||0)+1}},Audio:class{constructor(){this.paused=true;this.volume=0}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}},innerWidth:1366,innerHeight:768,screen:{availWidth:1366,availHeight:768},getComputedStyle:n=>({display:n.style.display||'block'}),addEventListener(k,f){(events[k]??=[]).push(f)},confirm:()=>true,AudioContext:class{constructor(){this.currentTime=0;this.state='running'}createGain(){return audioNode()}createOscillator(){return audioNode()}resume(){return Promise.resolve()}}};
 context.window=context;context.document={body:get('body'),getElementById:get,querySelector:get,querySelectorAll:()=>[],addEventListener:context.addEventListener,createElement:node};
 vm.createContext(context);vm.runInContext(src,context);
 return {run:s=>vm.runInContext(s,context),saved,writes,advance:n=>now+=n,events};
}

module.exports={setup};
