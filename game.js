(() => {
"use strict";
const $=s=>document.querySelector(s);
const screens={title:$("#title"),select:$("#select"),battle:$("#battle"),result:$("#result")};
const chars=[
{id:"ren",name:"REN CROSS",jp:"レン・クロス",type:"BALANCE",typejp:"バランス型",age:17,height:172,weapon:"BLADE",attack:30,c:"#1684ff",soft:"#1684ff33",quote:"守るために、強くなる。それだけだ。",unique:{id:"overblade",name:"オーバーブレード",short:"O",kind:"overblade",cd:5000,c:"#27e8ff",desc:"次の攻撃を+50。"},art:"ren-idle.png",selectArt:"ren-select.png",portrait:"ren-portrait.png",motion:"ren-attack-preview.jpg",motionTitle:"REN / OVER BLADE MOTION"},
{id:"kai",name:"KAI VERDE",jp:"カイ・ヴェルド",type:"SPEED",typejp:"スピード型",age:16,height:170,weapon:"KNIFE",attack:20,c:"#9cff24",soft:"#9cff2433",quote:"俺は止まらない。一歩先、そこにだけ勝ちがある。",unique:{id:"accelstep",name:"アクセルステップ",short:"A",kind:"accel",cd:2200,c:"#9cff24",desc:"2マス移動。次の攻撃+10。"},art:"kai-idle.png",selectArt:"kai-select.png",portrait:"kai-portrait.png",motion:"kai-attack-preview.jpg",motionTitle:"KAI / KNIFE ATTACK MOTION"}
];
const common=[
{id:"sword",name:"ソード",short:"S",kind:"attack",damage:40,range:3,cd:900,c:"#ff9f24",desc:"前後左右3マス以内に40ダメージ。",art:"chip-sword.png"},
{id:"shot",name:"ショット",short:"S",kind:"attack",damage:20,range:3,cd:800,c:"#28a8ff",desc:"前後左右3マス以内に20ダメージ。",art:"chip-shot.png"},
{id:"shield",name:"シールド",short:"G",kind:"shield",cd:1400,c:"#6dff8e",desc:"次のダメージを50%軽減。",art:"chip-shield.png"},
{id:"dash",name:"ダッシュ",short:"D",kind:"dash",distance:2,cd:1200,c:"#ff9d20",desc:"前方2マス移動。",art:"chip-dash.png"},
{id:"recover",name:"リカバー",short:"R",kind:"heal",heal:30,cd:1800,c:"#42ff9b",desc:"HPを30回復。",art:"chip-recover.png"}
];
let state={char:null,b:null,selected:null,timer:null,ai:null,animTimer:null};
const show=n=>Object.keys(screens).forEach(k=>screens[k].hidden=k!==n);
const distance=(a,b)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c);
const inBounds=(r,c)=>r>=0&&r<5&&c>=0&&c<5;
const direction=(dr,dc)=>dr===-1?"up":dr===1?"down":dc===-1?"left":dc===1?"right":null;
// 攻撃は「前方」ではなく、上下左右の直線3マス。斜めは不可。
const inLineRange=(a,b,range=3)=>{
 const dr=b.r-a.r,dc=b.c-a.c;
 if(dr!==0&&dc!==0)return false;
 const d=Math.max(Math.abs(dr),Math.abs(dc));
 return d>=1&&d<=range;
};
const stepPos=(p,f,n)=>{const d={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]}[f]||[0,0];return{r:p.r+d[0]*n,c:p.c+d[1]*n}};
const all=()=>[state.char.unique,...common];
function log(t,k=""){const e=document.createElement("div");e.className="entry "+k;e.textContent=t;$("#log").prepend(e)}
function msg(t){$("#msg").textContent=t}
function time(ms){const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function renderChars(){
 const box=$("#chars");if(!box)return;box.innerHTML="";
 chars.forEach(c=>{
  const a=document.createElement("article");a.className="char panel";a.style.setProperty("--accent",c.c);a.style.setProperty("--soft",c.soft);
  a.innerHTML=`<div class="char-visual"><div class="art-glow"></div><img src="${c.selectArt}" alt="${c.name}"><div class="char-tag">${c.type} / ${c.weapon}</div></div>
  <div class="char-info"><div class="eyebrow">${c.type} / ${c.weapon}</div><h2>${c.name}</h2><small>${c.jp} — ${c.typejp}</small><p class="quote">「${c.quote}」</p>
  <div class="stats"><div>AGE<b>${c.age}</b></div><div>HEIGHT<b>${c.height}cm</b></div><div>NORMAL ATK<b>${c.attack} / RANGE 3</b></div><div>ABILITY<b>${c.id==="ren"?"OVERDRIVE":"STEP"}</b></div></div>
  <div class="unique-preview"><img src="${c.unique.id==="overblade"?"chip-overblade.png":"chip-accelstep.png"}"><div><span>UNIQUE</span><b>${c.unique.name}</b><small>${c.unique.desc}</small></div></div>
  <footer><span>SELECT CHARACTER</span><button class="cyber" type="button">SELECT</button></footer></div>`;
  a.querySelector("button").onclick=e=>{e.stopPropagation();start(c)};a.onclick=()=>start(c);box.appendChild(a);
 });
}
function start(c){
 stop();state.char=c;state.selected=null;
 state.b={status:"playing",started:performance.now(),elapsed:0,turn:1,p:{r:4,c:2,hp:100,f:"up",shield:false,bonus:0,next:0,step:false,cd:{}},e:{r:0,c:2,hp:100,f:"down",cd:0}};
 $("#log").innerHTML="";show("battle");
 $("#battle-character-portrait").src=c.portrait;$("#battle-motion").src=c.motion;$("#motion-title").textContent=c.motionTitle;
 log("BATTLE START");msg("隣接するマスをタップして移動。敵が前後左右3マスの直線上に入ったら攻撃できます。");
 renderAll();state.timer=requestAnimationFrame(tick);state.ai=setInterval(ai,900)
}
function stop(){if(state.timer)cancelAnimationFrame(state.timer);if(state.ai)clearInterval(state.ai);if(state.animTimer)clearTimeout(state.animTimer);state.timer=null;state.ai=null;state.animTimer=null}
function tick(){const b=state.b;if(!b||b.status!=="playing")return;b.elapsed=performance.now()-b.started;const nt=Math.floor(b.elapsed/5000)+1;if(nt!==b.turn){b.turn=nt;if(state.char.id==="kai"){b.p.step=false;b.p.bonus=0;log("KAI STEP RESET")}}renderAll();state.timer=requestAnimationFrame(tick)}
function renderAll(){
 const b=state.b;if(!b)return;$("#pn").textContent=state.char.name.split(" ")[0];$("#pt").textContent=state.char.type;$("#pht").textContent=`${b.p.hp} / 100`;$("#eht").textContent=`${b.e.hp} / 100`;$("#phb").style.width=b.p.hp+"%";$("#ehb").style.width=b.e.hp+"%";$("#turn").textContent="TURN "+String(b.turn).padStart(2,"0");$("#time").textContent=time(b.elapsed);
 $("#pst").textContent=state.char.id==="ren"&&b.p.hp<=30?"OVERDRIVE ACTIVE":b.p.shield?"SHIELD ACTIVE":state.char.id==="kai"&&b.p.step?"STEP READY":"READY";$("#est").textContent=b.e.hp<=0?"DESTROYED":"SEARCHING";$("#dist").textContent=distance(b.p,b.e);const ch=all().find(q=>q.id===state.selected);$("#next").textContent=ch?ch.name.toUpperCase():"MOVE";renderGrid();renderChips();
}
function renderGrid(){
 const g=$("#grid"),b=state.b;g.innerHTML="";for(let r=0;r<5;r++)for(let c=0;c<5;c++){
  const x=document.createElement("button");x.type="button";x.className="cell "+(r>=3?"playerzone":"enemyzone")+(r===2?" boundary":"");x.dataset.r=r;x.dataset.c=c;const d=distance(b.p,{r,c}),ep=r===b.e.r&&c===b.e.c,pp=r===b.p.r&&c===b.p.c;
  if(!pp&&!ep&&d===1)x.classList.add("move");const ch=all().find(q=>q.id===state.selected);if(ch?.kind==="attack"&&inLineRange(b.p,{r,c},ch.range))x.classList.add("range");
  x.innerHTML=`<span class="coord">${r+1}-${c+1}</span>`;if(pp)x.innerHTML+=`<span class="ring"></span><span class="actor"><img src="${state.char.art}" alt="${state.char.name}"></span>`;if(ep)x.innerHTML+=`<span class="ring enemy-ring"></span><span class="actor enemyactor"><img src="cpu.svg" alt="CPU"></span>`;x.onclick=cellClick;g.appendChild(x)
 }
}
function renderChips(){
 const box=$("#chiplist");box.innerHTML="";all().forEach(ch=>{const rem=Math.max(0,(state.b.p.cd[ch.id]||0)-performance.now());const x=document.createElement("button");x.type="button";x.className="chip "+(state.selected===ch.id?"sel ":"")+(rem?"off":"");x.style.setProperty("--c",ch.c);
 x.innerHTML=`<div class="chip-art"><img src="${ch.art|| (ch.id==="overblade"?"chip-overblade.png":"chip-accelstep.png")}" alt="${ch.name}"></div><div class="chip-body"><span class="meta">${rem?(rem/1000).toFixed(1)+"s":"READY"}</span><div class="chip-top"><span class="icon">${ch.short}</span><span class="chipname">${ch.name}</span></div><div class="desc">${ch.desc}</div></div>`;
 x.onclick=()=>{if(rem)return;if(ch.kind==="shield"||ch.kind==="heal"){useChip(ch);return}state.selected=state.selected===ch.id?null:ch.id;renderAll();$("#chipmode").textContent=state.selected?ch.name+" SELECTED — TARGET":"Choose an action"};box.appendChild(x)})
}
function flashActor(){const cells=document.querySelectorAll(".cell .actor");cells.forEach(a=>{if(a.closest(".cell")?.querySelector("img")?.alt===state.char.name){a.classList.add("attack-flash");state.animTimer=setTimeout(()=>a.classList.remove("attack-flash"),280)}})}
function damage(side,n,src){const t=state.b[side];let v=n;if(side==="p"&&t.shield){v=Math.ceil(v*.5);t.shield=false;log("SHIELD REDUCED DAMAGE","good")}t.hp=Math.max(0,t.hp-v);log(src+" → "+v+" DAMAGE","damage");if(side==="e")flashActor();win()}
function normalAttack(){const b=state.b;if(!inLineRange(b.p,b.e,3)){msg("射程外。前後左右の直線3マス以内に敵が必要です。");log("NORMAL ATTACK — OUT OF RANGE","warn");return}const bonus=state.char.id==="ren"&&b.p.hp<=30?10:0;const n=state.char.attack+bonus+b.p.bonus+b.p.next;b.p.bonus=0;b.p.next=0;damage("e",n,"NORMAL ATTACK");if(state.char.id==="kai"){b.p.step=true;msg("KAI STEP READY — 攻撃後に1マス移動可能。");log("KAI STEP AVAILABLE","good")}}
function moveTo(r,c){const b=state.b;if(distance(b.p,{r,c})!==1){msg("移動距離が長すぎます。1マスずつ移動してください。");log("MOVE BLOCKED — TOO FAR","warn");return}if(r===b.e.r&&c===b.e.c){msg("敵のマスには移動できません。相手を射程に入れてください。");return}const dr=r-b.p.r,dc=c-b.p.c;b.p.f=direction(dr,dc)||b.p.f;b.p.r=r;b.p.c=c;log(state.char.id.toUpperCase()+" MOVED");msg("移動完了。前後左右3マスが攻撃ラインです。")}
function useChip(ch){const b=state.b;if((b.p.cd[ch.id]||0)>performance.now()){msg("クールダウン中です。");return}if(ch.kind==="attack"){if(!inLineRange(b.p,b.e,ch.range)){msg("射程外。前後左右の直線3マス以内を狙ってください。");log(ch.name+" — OUT OF RANGE","warn");return}const n=ch.damage+b.p.bonus+b.p.next;b.p.bonus=0;b.p.next=0;damage("e",n,ch.name.toUpperCase())}else if(ch.kind==="shield"){b.p.shield=true;log("SHIELD ACTIVE","good");msg("次のダメージを50%軽減。")}else if(ch.kind==="heal"){const old=b.p.hp;b.p.hp=Math.min(100,b.p.hp+30);log("RECOVER +"+(b.p.hp-old)+" HP","good")}else if(ch.kind==="dash"||ch.kind==="accel"){const p=stepPos(b.p,b.p.f,2);if(!inBounds(p.r,p.c)||p.r===b.e.r&&p.c===b.e.c){msg("その方向には移動できません。");return}b.p.r=p.r;b.p.c=p.c;if(ch.kind==="accel")b.p.bonus=10;log(ch.name.toUpperCase()+" — 2 SQUARES","good");msg(ch.kind==="accel"?"2マス移動。次の攻撃+10。":"2マスダッシュ。")}else if(ch.kind==="overblade"){b.p.next+=50;log("OVER BLADE — NEXT ATTACK +50","good");msg("次の攻撃が+50。")}b.p.cd[ch.id]=performance.now()+ch.cd;state.selected=null;renderAll();win()}
function cellClick(e){const b=state.b,r=+e.currentTarget.dataset.r,c=+e.currentTarget.dataset.c,ep=r===b.e.r&&c===b.e.c,ch=all().find(q=>q.id===state.selected);$("#dist").textContent=distance(b.p,{r,c});if(ch){if(ch.kind==="attack"&&ep)useChip(ch);else if(ch.kind==="dash"||ch.kind==="accel"||ch.kind==="overblade")useChip(ch);else msg("このチップは対象指定不要です。");return}if(ep){normalAttack();return}if(state.char.id==="kai"&&b.p.step&&distance(b.p,{r,c})===1){const dr=r-b.p.r,dc=c-b.p.c;b.p.f=direction(dr,dc)||b.p.f;b.p.r=r;b.p.c=c;b.p.step=false;log("KAI STEP — 1 SQUARE","good");msg("ステップ移動。");renderAll();return}moveTo(r,c);renderAll()}
function ai(){const b=state.b;if(!b||b.status!=="playing")return;const d=distance(b.e,b.p);if(inLineRange(b.e,b.p,3)){damage("p",15,"CPU ATTACK");return}if(d<=1)return;const options=[{r:b.e.r+Math.sign(b.p.r-b.e.r),c:b.e.c},{r:b.e.r,c:b.e.c+Math.sign(b.p.c-b.e.c)}].filter(p=>inBounds(p.r,p.c)&&!(p.r===b.p.r&&p.c===b.p.c));const q=options.find(p=>distance(p,b.p)<d);if(q){b.e.f=direction(b.p.r-b.e.r,b.p.c-b.e.c)||b.e.f;b.e.r=q.r;b.e.c=q.c;log("CPU MOVED");renderAll()}}
function win(){const b=state.b;if(b.e.hp<=0)end("victory");else if(b.p.hp<=0)end("defeat")}
function end(r){state.b.status=r;stop();$("#resultlabel").textContent=r==="victory"?"VICTORY":"DEFEAT";$("#resultlabel").className="resultlabel "+r;$("#summary").textContent=r==="victory"?"ENEMY UNIT DESTROYED.":"SWEEPER UNIT DOWN.";$("#rc").textContent=state.char.name.split(" ")[0];$("#rt").textContent=time(state.b.elapsed);$("#rh").textContent=state.b.p.hp;show("result")}
$("#new").onclick=()=>show("select");$("#clear").onclick=()=>{state.selected=null;renderAll()};$("#rematch").onclick=()=>start(state.char);$("#titlebtn").onclick=()=>{stop();show("title")};renderChars();show("title");
window.addEventListener("error",e=>console.error("[SWEEPER]",e.error||e.message));window.addEventListener("unhandledrejection",e=>console.error("[SWEEPER]",e.reason));
})();
