'use strict';
const sources={arena:'/assets/embedded-image-01.png',zero:'/assets/embedded-image-02.png',enemy:'/assets/embedded-image-03.png',portrait:'/assets/embedded-image-04.png',zeroFront:'/assets/embedded-image-05.png',architectureLayer:'/assets/embedded-image-06.png',floorLayer:'/assets/embedded-image-07.png',treeLayer:'/assets/embedded-image-08.png'};

/* Two-Tone Fundamental 05 preview scheduling engine.
   Baseline event allocation follows approved deterministic fractional cycles and
   proportional midpoint slots; Action Advance/Delay shifts existing event indices.
   No generic extra-turn event is created. */
class TwoToneTurnTimeline {
 constructor(){this.clock=0;this.states=new Map();this.sequence=0;this.history=[];this.averages={ally:0,enemy:0};}
 reset(){this.clock=0;this.states.clear();this.sequence=0;this.history=[];this.averages={ally:0,enemy:0};}
 static mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:1}
 static positive(v){return Number.isFinite(v)&&v>0?v:1}
 static rate(speed,teamAverage,slower){return Math.max(1,(speed+teamAverage)/(2*slower))}
 // Supply all associated characters in averages, including defeated members.
 // `units` are the actual living scheduled participants (plus independent summons).
 sync(units,alliedMembers,enemyMembers){
  const ally=TwoToneTurnTimeline.mean(alliedMembers.map(x=>TwoToneTurnTimeline.positive(x.speed)));
  const enemy=TwoToneTurnTimeline.mean(enemyMembers.map(x=>TwoToneTurnTimeline.positive(x.speed)));
  this.averages={ally,enemy};const slower=Math.min(ally,enemy),valid=new Set();
  for(const u of units){valid.add(u.id);
   const speed=TwoToneTurnTimeline.positive(u.speed),teamAverage=u.faction==='enemy'?enemy:ally;
   const rate=TwoToneTurnTimeline.rate(speed,teamAverage,slower);
   let state=this.states.get(u.id);
   if(!state){state={id:u.id,faction:u.faction,summon:!!u.summon,speed,rate,credit:0,index:0,nominal:[],cycle:0,carry:0,anchor:this.clock,mode:'cycle',immediate:false};this.states.set(u.id,state);}
   else if(Math.abs(state.rate-rate)>1e-9){this.changeRate(state,rate);}
   state.speed=speed;state.rate=rate;state.faction=u.faction;state.summon=!!u.summon;
  }
  for(const id of Array.from(this.states.keys()))if(!valid.has(id))this.states.delete(id);
 }
 fill(state,wanted){
  if(state.mode==='resync'){
   while(state.nominal.length<=wanted){
    if(state.resyncNext<state.anchor-1e-9){
     state.nominal.push(state.resyncNext);state.resyncNext+=1/state.rate;continue;
    }
    const total=state.carry+state.rate,count=Math.max(1,Math.floor(total+1e-10));
    state.carry=Math.max(0,total-count);
    for(let j=0;j<count;j++)state.nominal.push(state.anchor+state.cycle+(j+.5)/count);
    state.cycle++;
   }
   return;
  }
  while(state.nominal.length<=wanted){
   const total=state.carry+state.rate, count=Math.max(1,Math.floor(total+1e-10));
   state.carry=Math.max(0,total-count);
   for(let j=0;j<count;j++)state.nominal.push(state.anchor+state.cycle+(j+.5)/count);
   state.cycle++;
  }
 }
 nominalAt(state,x){
  const upper=Math.max(3,Math.ceil(x)+2);this.fill(state,upper);
  if(x<0){const gap=state.nominal[1]-state.nominal[0];return state.nominal[0]+x*gap;}
  const k=Math.floor(x),f=x-k;
  return state.nominal[k]*(1-f)+state.nominal[k+1]*f;
 }
 due(state){return state.immediate?this.clock:this.nominalAt(state,state.index-state.credit)}
 changeRate(state,newRate){
  const old=state.rate,nextBase=this.nominalAt(state,state.index);
  const first=this.clock+(nextBase-this.clock)*(old/newRate);
  // Keep earned/spent credit exactly; only the future Speed-derived spacing changes.
  state.nominal=[first];state.index=0;state.rate=newRate;state.mode='resync';
  state.anchor=Math.floor(first)+1;state.resyncNext=first+1/newRate;
  state.carry=(Math.floor(state.anchor)*newRate)%1;state.cycle=0;
 }
 modify(id,percent){
  const s=this.states.get(id);if(!s||!Number.isFinite(percent)||Math.abs(percent)>1000)return false;
  s.credit+=percent/100;
  this.history.push({kind:percent>=0?'advance':'delay',id,percent,credit:s.credit,clock:this.clock});return true;
 }
 immediateFirst(id){const s=this.states.get(id);if(!s||!s.summon)return false;s.immediate=true;this.history.push({kind:'summon-first-ready',id,clock:this.clock});return true;}
 // Immutable preview simulation: prediction does not mutate actual turn indices or clock.
 preview(count=6){
  const indexes=new Map(Array.from(this.states.entries()).map(([id,s])=>[id,s.index]));
  const first=new Set(Array.from(this.states.values()).filter(s=>s.immediate).map(s=>s.id));
  const result=[],eps=1e-9;
  for(let i=0;i<count;i++){
   const ordered=Array.from(this.states.values()).map(s=>({s,time:first.has(s.id)?this.clock:this.nominalAt(s,indexes.get(s.id)-s.credit)}))
     .sort((a,b)=>a.time-b.time || Number(first.has(b.s.id))-Number(first.has(a.s.id)) || b.s.speed-a.s.speed || (a.s.faction==='ally'?-1:1)-(b.s.faction==='ally'?-1:1) || a.s.id.localeCompare(b.s.id));
   if(!ordered.length)break;const {s,time}=ordered[0];result.push({id:s.id,at:Math.max(this.clock,time),summon:s.summon});indexes.set(s.id,indexes.get(s.id)+1);first.delete(s.id);
  }return result;
 }
 take(){
  const next=this.preview(1)[0];if(!next)return null;
  this.clock=Math.max(this.clock,next.at);const s=this.states.get(next.id);
  const immediate=s.immediate;s.immediate=false;s.index++;
  const result={...next,clock:this.clock,immediate,rate:s.rate,credit:s.credit};
  this.history.push({kind:'turn',id:result.id,clock:this.clock,immediate});return result;
 }
 snapshot(){return {clock:this.clock,averages:{...this.averages},states:Array.from(this.states.values()).map(s=>({id:s.id,speed:s.speed,rate:s.rate,credit:s.credit,index:s.index,immediate:s.immediate,nextAt:Math.max(this.clock,this.due(s)),summon:s.summon})),history:this.history.slice(-40),order:this.preview(8)};}
}
if(typeof module!=='undefined'&&module.exports)module.exports={TwoToneTurnTimeline};

sources.zeroBasicWindup='/assets/embedded-image-09.png';
sources.zeroBasicSlash='/assets/embedded-image-10.png';
const images={};for(const [k,src] of Object.entries(sources)){const img=new Image();img.src=src;images[k]=img;}
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d',{alpha:false});
const W=1600,H=900, TEAM_KEY='two-tone-demo-team-fundamental-1-v1';
const PROGRESSION_KEY='two-tone-character-progress-v1',VITALS_KEY='two-tone-character-vitals-v1';
const CHARACTER_MAX_LEVEL=50,ASCENSION_GATES=[10,20,30,40];
// Numerical Base HP values are inherited/development-only combat fixtures, NOT
// approved per-character stats. The unnamed units remain developer test slots.
const ROSTER=[
 {id:'zero',name:'ZERO',label:'Character',hp:2480,speed:115,art:'zero',test:false},
 {id:'test2',name:'TEST SLOT 2',label:'Placeholder • no approved identity',hp:2300,speed:115,art:null,test:true},
 {id:'test3',name:'TEST SLOT 3',label:'Placeholder • no approved identity',hp:2600,speed:115,art:null,test:true},
];
const ROSTER_IDS=new Set(ROSTER.map(u=>u.id));
function roundHp(value){return Math.floor(value+0.5)}
function requiredExp(level){return Number.isInteger(level)&&level>=1&&level<CHARACTER_MAX_LEVEL?100*(1+Math.floor((level-1)/5)):0}
function defaultProgress(){return {level:1,exp:0,ascended:[]}}
function validateProgress(value){
 if(!value||!Number.isInteger(value.level)||value.level<1||value.level>CHARACTER_MAX_LEVEL||
    !Number.isInteger(value.exp)||value.exp<0||!Array.isArray(value.ascended))return false;
 const completed=value.ascended;
 if(completed.some(g=>!ASCENSION_GATES.includes(g)||g>value.level)||new Set(completed).size!==completed.length)return false;
 for(const g of ASCENSION_GATES)if(value.level>g&&!completed.includes(g))return false;
 if(value.level===CHARACTER_MAX_LEVEL)return value.exp===0;
 if(ASCENSION_GATES.includes(value.level)&&!completed.includes(value.level))return value.exp===0;
 return value.exp<requiredExp(value.level);
}
function loadProgress(){
 let stored={};try{stored=JSON.parse(localStorage.getItem(PROGRESSION_KEY)||'{}')||{}}catch(e){}
 const data={};for(const r of ROSTER){const p=stored[r.id];data[r.id]=validateProgress(p)?{level:p.level,exp:p.exp,ascended:[...p.ascended]}:defaultProgress()}return data;
}
let characterProgress=loadProgress();
function progressFor(id){return characterProgress[id]||null}
function saveProgress(){try{localStorage.setItem(PROGRESSION_KEY,JSON.stringify(characterProgress))}catch(e){}}
// Resource items/quantities are not approved yet. This debug injection never
// models inventory consumption. A grant crossing a locked ascension gate/cap
// is rejected in full rather than inventing an excess-EXP policy.
function testGrantExp(id,amount){
 const current=progressFor(id);if(!current||!Number.isInteger(amount)||amount<=0||current.level>=CHARACTER_MAX_LEVEL)return false;
 const temp={level:current.level,exp:current.exp,ascended:[...current.ascended]};
 let remaining=amount;
 while(remaining>0){
  if(temp.level>=CHARACTER_MAX_LEVEL||ASCENSION_GATES.includes(temp.level)&&!temp.ascended.includes(temp.level))return false;
  const needed=requiredExp(temp.level)-temp.exp,take=Math.min(needed,remaining);
  temp.exp+=take;remaining-=take;
  if(temp.exp===requiredExp(temp.level)){temp.level++;temp.exp=0;}
 }
 if(!validateProgress(temp))return false;
 const before=current.level;characterProgress[id]=temp;saveProgress();
 const actor=party.find(p=>p.id===id);
 if(actor){actor.level=temp.level;if(before!==temp.level)recomputeUnitMaxHp(actor);}
 return {level:temp.level,exp:temp.exp,levelsGained:temp.level-before,nextExp:requiredExp(temp.level)};
}
function testAscend(id){
 const p=progressFor(id);if(!p||!ASCENSION_GATES.includes(p.level)||p.ascended.includes(p.level))return false;
 p.ascended.push(p.level);saveProgress();return true;
}
function hpModifiers(unit){return {flat:unit.hpFlatModifiers||{},percent:unit.hpPercentModifiers||{}}}
function calculateMaxHp(baseHp,level,flat={},percent={}){
 if(!Number.isFinite(baseHp)||baseHp<=0||!Number.isInteger(level)||level<1||level>CHARACTER_MAX_LEVEL)return null;
 const flats=Object.values(flat),percents=Object.values(percent);
 if([...flats,...percents].some(v=>!Number.isFinite(v)))return null;
 const raw=(baseHp+flats.reduce((a,b)=>a+b,0))*level*(1+percents.reduce((a,b)=>a+b,0));
 return raw>=1&&Number.isFinite(raw)?roundHp(raw):null;
}
function recomputeUnitMaxHp(unit){
 const max=calculateMaxHp(unit.baseHp,unit.level,unit.hpFlatModifiers,unit.hpPercentModifiers);
 if(max===null)return false;
 const oldMax=unit.maxHp||max, oldHp=unit.hp;
 // Preserve current HP proportion during battle, including for max-HP reductions.
 unit.maxHp=max;unit.hp=oldHp<=0?0:Math.max(0,Math.min(max,roundHp(max*(oldHp/oldMax))));
 saveVitals();return true;
}
function setHpBonusForTest(id,source,kind,value){
 const p=party.find(u=>u.id===id);if(!p||!source||!Number.isFinite(value)||!['flat','percent'].includes(kind))return false;
 const key=kind==='flat'?'hpFlatModifiers':'hpPercentModifiers',next={...p[key],[source]:value};
 const max=calculateMaxHp(p.baseHp,p.level,kind==='flat'?next:p.hpFlatModifiers,kind==='percent'?next:p.hpPercentModifiers);
 if(max===null)return false;p[key]=next;recomputeUnitMaxHp(p);return true;
}
function loadVitals(){try{const x=JSON.parse(localStorage.getItem(VITALS_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(e){return {}}}
let savedVitals=loadVitals();
function saveVitals(){
 for(const p of party){if(!p||!ROSTER_IDS.has(p.id))continue;savedVitals[p.id]={hp:p.hp,maxHp:p.maxHp}}
 try{localStorage.setItem(VITALS_KEY,JSON.stringify(savedVitals))}catch(e){}
}
// Training mode assignments exercise both approved game-mode recovery policies;
// actual named game modes have not been designed or assigned a policy.
let trainingRecoveryMode='restore';
function setTrainingRecoveryMode(mode){if(phase!=='setup'||!['restore','preserve'].includes(mode))return false;trainingRecoveryMode=mode;return true}
function spawnProgressedUnit(id){
 const model=ROSTER.find(x=>x.id===id),progress=progressFor(id);if(!model||!progress)return null;
 const maxHp=calculateMaxHp(model.hp,progress.level);if(maxHp===null)return null;
 const saved=savedVitals[id];const restore=trainingRecoveryMode==='restore'||!saved;
 const hp=restore?maxHp:Math.max(0,Math.min(maxHp,Number.isFinite(saved.hp)?roundHp(saved.hp):maxHp));
 return {...model,baseHp:model.hp,level:progress.level,hp,maxHp,hpFlatModifiers:{},hpPercentModifiers:{},energy:20,energyReserved:0};
}

const turnTimeline=new TwoToneTurnTimeline();
let speedModifiers=Object.create(null),summons=[],summonSerial=0,summonHistory=[];
function speedOf(unit){return Math.max(1,unit.speed*(speedModifiers[unit.id]||1))}
function timelineEnemyMembers(){
 // In this training encounter, a wave's predefined enemy roster is its speed-averaging team.
 // Defeated and waiting enemy instances remain in the cohort; the rule for non-wave boss
 // reinforcements must be specified separately before adding them as production abilities.
 return wavePlan[waveIndex]?wavePlan[waveIndex].map(e=>({id:e.id,speed:speedOf(e)})):liveEnemies().map(e=>({id:e.id,speed:speedOf(e)}));
}
function syncTurnTimeline(){
 const units=[...alive().map(p=>({id:p.id,speed:speedOf(p),faction:'ally'})),
  ...liveEnemies().map(e=>({id:e.id,speed:speedOf(e),faction:'enemy'})),
  ...summons.filter(x=>x.mode==='independent'&&x.remaining>0).map(x=>({id:x.id,speed:speedOf(x),faction:'ally',summon:true}))];
 const allyMembers=party.map(p=>({id:p.id,speed:speedOf(p)}));
 const enemyMembers=timelineEnemyMembers();
 if(allyMembers.length&&enemyMembers.length)turnTimeline.sync(units,allyMembers,enemyMembers);
 syncLegacyGauges();
}
function syncLegacyGauges(){
 const snap=turnTimeline.snapshot();
 for(const state of snap.states){
  const approx=100*(1-Math.max(0,state.nextAt-snap.clock)*state.rate);
  gauges[state.id]=Math.max(0,Math.min(100,approx));
 }
}
function addActionAdvance(id,percent){
 if(!Number.isFinite(percent)||percent<0)return false;
 syncTurnTimeline();const ok=turnTimeline.modify(id,percent);syncLegacyGauges();return ok;
}
function addActionDelay(id,percent){
 if(!Number.isFinite(percent)||percent<0)return false;
 syncTurnTimeline();const ok=turnTimeline.modify(id,-percent);syncLegacyGauges();return ok;
}
function setSpeedMultiplierForTest(id,multiplier){
 const u=party.find(p=>p.id===id)||enemies.find(e=>e.id===id)||summons.find(x=>x.id===id);
 if(!u||!Number.isFinite(multiplier)||multiplier<=0||multiplier>5)return false;
 speedModifiers[id]=multiplier;syncTurnTimeline();return true;
}
function queueSummonForTest(mode='independent',creatorId=activeId){
 if(phase!=='player'||paused||!['independent','controlled'].includes(mode))return false;
 const owner=party.find(p=>p.id===creatorId&&p.hp>0);if(!owner||owner.id!==activeId)return false;
 // TEST ONLY: No published character currently has a summon creation ability.
 // Simulate a completed creation action at the next normal action boundary, without
 // inventing a creator follow-up ordering when both immediate entitlements collide.
 const current=summons.find(x=>x.ownerId===owner.id);
 if(current){turnTimeline.states.delete(current.id);summons=summons.filter(x=>x.id!==current.id)}
 const s={id:'test-summon-'+(++summonSerial),name:'TEST SUMMON',ownerId:owner.id,speed:95,mode,remaining:3,pendingCreation:true,test:true};
 summons.push(s);summonHistory.push({event:'creation-queued',id:s.id,ownerId:owner.id,mode});
 log=`TEST ONLY: ${mode} summon will appear after ${owner.name}'s next action.`;
 return s.id;
}
function finishSummonCreationForTest(ownerId){
 const ready=summons.filter(s=>s.ownerId===ownerId&&s.pendingCreation);
 if(!ready.length)return;
 for(const s of ready){s.pendingCreation=false;summonHistory.push({event:'created',id:s.id,mode:s.mode,clock:turnTimeline.clock});}
 syncTurnTimeline();
 for(const s of ready){
  if(s.mode==='independent')turnTimeline.immediateFirst(s.id);
  // Creator-controlled creation explicitly returns the creator to their own
  // next ordinary turn by Action Advance, not a separate cloned 'extra turn'.
  else if(s.mode==='controlled')addActionAdvance(s.ownerId,100);
 }
 syncLegacyGauges();
}
function executeIndependentSummonTurn(s){
 if(!s||s.mode!=='independent')return nextTurn();
 s.remaining--;summonHistory.push({event:'acted',id:s.id,clock:turnTimeline.clock,remaining:s.remaining});
 activeId=null;actingEnemyId=null;phase='resolve';
 const owner=party.find(p=>p.id===s.ownerId);
 const foe=chosenEnemy();
 fx={kind:'basic',at:performance.now(),actor:owner?.id||s.ownerId,targetEnemyId:foe?.id,targetGeometry:foe?{x:foe.x,y:foe.y,w:foe.w,h:foe.h}:null};
 log=`TEST ONLY: ${s.name} independently acts; no character-specific damage is assigned.`;
 schedule(()=>{if(s.remaining<=0){summons=summons.filter(x=>x.id!==s.id);turnTimeline.states.delete(s.id);summonHistory.push({event:'expired',id:s.id})}
  drainUltimateQueueBefore(()=>nextTurn());},550);
}

const color={ink:'#0a101f',panel:'rgba(13,17,35,.94)',gold:'#eacb87',white:'#f7f3f8',sub:'#bfc8d9',blue:'#85d9ff',red:'#f47679',green:'#5bebac'};
let phase='setup',paused=false,turn=0,enemyHp=0,maxEnemyHp=0,sp=3,
    gauges={},party=[],activeId=null,fx=null,log='',hint='',hintAt=0,
    choiceRects=[],battleToken=0,enemyCount=0,forceSelect=false;
// Five authored formation positions. Enemy identities and wave queues are independent of these slots.
// Encounter presets and enemy stats below are DEMO DATA; Approved Fundamental 2 defines the rules.
const ENEMY_DESIGNS=[
 {id:'enemy1',name:'AUTOMATON 1',x:646,y:359,w:151,h:198,maxHp:1050,speed:66},
 {id:'enemy2',name:'AUTOMATON 2',x:822,y:314,w:156,h:205,maxHp:1050,speed:69},
 {id:'enemy3',name:'AUTOMATON 3',x:1010,y:274,w:167,h:220,maxHp:1350,speed:65},
 {id:'enemy4',name:'AUTOMATON 4',x:1201,y:312,w:156,h:205,maxHp:1050,speed:68},
 {id:'enemy5',name:'AUTOMATON 5',x:1389,y:355,w:151,h:198,maxHp:1050,speed:67},
];
// Any encounter may supply its own finite number of waves, each with 1–15 enemies.
// Presets are only review scenarios; they are NOT a global wave-count limit.
const WAVE_PRESETS={stress:[15,12,6],quick:[1,5,6],sizes:[1,5,6,12,15]};
let wavePreset='stress',waveOverride=null,wavePlan=[],waveIndex=-1,waveQueue=[],waveKills=0,
    totalEnemyDefeats=0,encounterCleared=false,spawnHistory=[],enemies=[],selectedEnemyId=null,actingEnemyId=null;
// Fundamental 3 target rules and Fundamental 2 v1.1 post-attack reinforcement boundary.
// Zero's Skill target pattern is now an AOE character decision; the pattern toolbar,
// 5-hit and support actions remain development-only controls. Damage/cost values are provisional.
let targetingMode='single',supportDemo=null,zeroSkillArmed=false,attackInProgress=false,attackSerial=0,
     pendingVacancies=[],lastAttack=null,supportTestHistory=[];
// Fundamental 4. Numerical energy costs and debug bonuses are inherited/provisional,
// not character-balancing approvals. No gameplay source grants an SP-cap bonus by default.
const ULTIMATE_ENERGY_COST=120,BASE_SP_MAX=5;
const SP_CAP_SOURCES=new Set(['passive','skill','ultimate','character-potential','signature-premium-weapon-effect','premium-weapon-potential','other-combat-effect']);
let spCapModifiers=Object.create(null),ultimateQueue=[],ultimateSequence=0,ultimateHistory=[],
    ultimateResume=null,ultimateExecuting=false;
function effectiveSpMax(){return Math.max(0,BASE_SP_MAX+Object.values(spCapModifiers).reduce((a,b)=>a+b,0))}
function availableEnergy(p){return p?Math.max(0,p.energy-(p.energyReserved||0)):0}
function isUltPending(id){return ultimateQueue.some(q=>q.actorId===id)||(ultimateExecuting&&lastAttack?.action==='ultimate'&&lastAttack.actor===id)}
function canQueueUltimate(p){return !!p&&p.hp>0&&!paused&&!['setup','intro','victory','defeat'].includes(phase)
  &&availableEnergy(p)>=ULTIMATE_ENERGY_COST&&!isUltPending(p.id)}
function resetActionResources(){sp=3;spCapModifiers=Object.create(null);ultimateQueue=[];ultimateSequence=0;ultimateHistory=[];ultimateResume=null;ultimateExecuting=false;
  for(const p of party)p.energyReserved=0;}
function setSpCapTestSource(source,bonus){
 if(!SP_CAP_SOURCES.has(source)||!Number.isInteger(bonus)||bonus<0||bonus>20)return false;
 if(bonus)spCapModifiers[source]=bonus;else delete spCapModifiers[source];
 // Decrease-under-balance semantics remain outside the approved standard. This
 // preview exposes only nonnegative TEST boosts and never alters current SP.
 log=`TEST ONLY: ${source} SP limit modifier ${bonus>=0?'+':''}${bonus}. Maximum ${effectiveSpMax()}.`;
 return true;
}
function cycleSpCapTest(){const n=spCapModifiers.passive||0;return setSpCapTestSource('passive',n>=3?0:n+1)}
function chargeUltimateForTest(id){const p=party.find(p=>p.id===id);if(!p||p.hp<=0||paused||['setup','intro','victory','defeat'].includes(phase))return false;
 p.energy=120;ultimateHistory.push({event:'debug-charge',actor:id,energy:p.energy});say('TEST ONLY: '+p.name+' energy charged to 120.');return true}
function cancelQueuedUltimatesOfDefeated(){
 for(let i=ultimateQueue.length-1;i>=0;i--){const q=ultimateQueue[i],p=party.find(x=>x.id===q.actorId);
  if(!p||p.hp<=0){if(p)p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);
   ultimateQueue.splice(i,1);ultimateHistory.push({event:'canceled-ko',actor:q.actorId,seq:q.seq,energy:p?.energy??null});
   log=`${p?.name||q.actorId}'s queued Ultimate canceled on K.O.; energy released.`;}}
}
function cancelAllQueuedUltimates(reason){for(const q of ultimateQueue){const p=party.find(x=>x.id===q.actorId);
 if(p)p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);
 ultimateHistory.push({event:'canceled-'+reason,actor:q.actorId,seq:q.seq});}
 ultimateQueue=[];ultimateResume=null;ultimateExecuting=false;}
// An Ultimate can be requested at any moment in an allied or enemy turn. Active
// actions and enemy windups are never interrupted; the queue drains at boundaries.
function queueUltimate(id){
 const p=party.find(p=>p.id===id);
 if(!canQueueUltimate(p)){say(!p?'Unknown ally.':p.hp<=0?'Defeated ally cannot Ult.':isUltPending(id)?'Ultimate already queued.':'Ultimate needs '+ULTIMATE_ENERGY_COST+' available energy.');return false}
 const q={actorId:id,cost:ULTIMATE_ENERGY_COST,seq:++ultimateSequence,requestedTurn:turn};
 p.energyReserved=(p.energyReserved||0)+q.cost;ultimateQueue.push(q);
 ultimateHistory.push({event:'queued',actor:id,seq:q.seq,energy:p.energy,reserved:p.energyReserved,phase});
 log=`${p.name} Ultimate queued (${ultimateQueue.length} waiting). Energy reserved, not spent.`;
 if(phase==='player'&&!attackInProgress&&!ultimateExecuting&&!ultimateResume){
  // The player retains the same normal turn after the Ultimate finishes.
  ultimateResume=()=>{phase='player';cameraPreview=null;log=`${p.name}'s Ultimate finished. Normal turn retained.`};
  runNextUltimate();
 }
 return true;
}
function drainUltimateQueueBefore(continuation){
 cancelQueuedUltimatesOfDefeated();
 if(!alive().length){cancelAllQueuedUltimates('defeat');continuation();return}
 if(encounterCleared){cancelAllQueuedUltimates('victory');continuation();return}
 if(!ultimateQueue.length){continuation();return}
 ultimateResume=continuation;runNextUltimate();
}
function runNextUltimate(){
 cancelQueuedUltimatesOfDefeated();
 if(!alive().length||encounterCleared){cancelAllQueuedUltimates(!alive().length?'defeat':'victory')}
 if(ultimateQueue.length){
  const q=ultimateQueue.shift(),p=party.find(x=>x.id===q.actorId);
  if(!p||p.hp<=0){if(p)p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);ultimateHistory.push({event:'canceled-ko',actor:q.actorId,seq:q.seq});return runNextUltimate()}
  p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);p.energy=Math.max(0,p.energy-q.cost);
  ultimateHistory.push({event:'started',actor:q.actorId,seq:q.seq,energy:p.energy,turn});
  ultimateExecuting=true;
  // Same provisional Ultimate attack effect from v0.8. This is a testing
  // placeholder, not a canonical Ultimate definition or approved balance.
  if(!executeCombatAction(p,'ultimate',q.seq)){
   ultimateExecuting=false;ultimateHistory.push({event:'canceled-no-target',actor:q.actorId,seq:q.seq});return runNextUltimate();
  }
  return;
 }
 ultimateExecuting=false;
 const resume=ultimateResume;ultimateResume=null;
 if(resume)resume();
}

function eligibleAllyTarget(p,kind){return !!p&&(kind==='revive'?p.hp<=0:p.hp>0)}
function chooseAttackTargets(mode=targetingMode,primary=chosenEnemy()){
 const live=liveEnemies();if(mode==='multi')return live.slice();if(!primary)return [];
 if(mode==='aoe')return live.filter(e=>Math.abs(e.slot-primary.slot)<=1);
 return [primary];
}
function closestSurvivingEnemy(slot){return liveEnemies().slice().sort((a,b)=>Math.abs(a.slot-slot)-Math.abs(b.slot-slot)||a.slot-b.slot)[0]||null}
// Zero's Skill is an actual AOE action; no toolbar mode can override its target shape.
function actionTargetMode(actor,action){return actor?.id==='zero'&&action==='skill'?'aoe':targetingMode}
function previewTargetMode(){return phase==='player'&&activeId==='zero'&&zeroSkillArmed?'aoe':targetingMode}
function setTargetingMode(mode){if(!['single','aoe','multi','five-hit'].includes(mode)||phase!=='player'||paused)return false;targetingMode=mode;zeroSkillArmed=false;supportDemo=null;cameraPreview='target';return true}
function zeroSkillControl(){
 if(phase!=='player'||paused||activeId!=='zero')return play('skill');
 if(sp<1){say('Not enough skill points. Use Basic to restore one.');return false}
 if(!zeroSkillArmed){zeroSkillArmed=true;supportDemo=null;cameraPreview='target';selectedAllyId=null;log='ZERO SKILL: AOE preview. Select an enemy, then tap CONFIRM.';return true}
 return play('skill');
}
function startSupportDemo(kind){
 if(phase!=='player'||paused||!['heal','revive'].includes(kind))return false;
 const eligible=party.filter(p=>eligibleAllyTarget(p,kind));
 if(!eligible.length){say(kind==='revive'?'No defeated ally to revive.':'No living allies.');return false}
 supportDemo=kind;zeroSkillArmed=false;selectedAllyId=eligible.find(p=>p.id===activeId)?.id||eligible[0].id;cameraPreview='party';
 log=`TEST ONLY: choose ${kind==='revive'?'a defeated':'a living'} ally, then confirm.`;return true;
}
function cancelSupportDemo(){supportDemo=null;selectedAllyId=null;cameraPreview=null}
function confirmSupportDemo(){
 if(phase!=='player'||paused||!supportDemo)return false;
 const p=party.find(p=>p.id===selectedAllyId);
 if(!eligibleAllyTarget(p,supportDemo)){say('This ally is not eligible for that action.');return false}
 const kind=supportDemo,before=p.hp;
 // Sandbox test only: no real skill, turn, energy, or SP are consumed; costs remain undecided.
 if(kind==='heal')p.hp=Math.min(p.maxHp,p.hp+160);
 else{p.hp=Math.max(1,roundHp(p.maxHp*.35));gauges[p.id]=0}saveVitals();
 supportTestHistory.push({kind,target:p.id,before,after:p.hp,actor:activeId});
 log=`TEST ONLY: ${kind==='heal'?'healing':'revival'} targeted ${p.name} (${before} → ${p.hp} HP).`;
 cancelSupportDemo();return true;
}

function liveEnemies(){return enemies.filter(e=>e.hp>0)}
function totalEnemyHp(){return liveEnemies().reduce((n,e)=>n+e.hp,0)}
function syncEnemyHp(){enemyHp=totalEnemyHp();maxEnemyHp=liveEnemies().reduce((n,e)=>n+e.maxHp,0)}
function chosenEnemy(){return liveEnemies().find(e=>e.id===selectedEnemyId)||liveEnemies()[0]||null}
function buildWavePlan(sizes){
 if(!Array.isArray(sizes)||!sizes.length||!sizes.every(n=>Number.isInteger(n)&&n>=1&&n<=15))throw Error('Wave sizes must each be 1–15');
 return sizes.map((size,wi)=>Array.from({length:size},(_,i)=>{
  const model=ENEMY_DESIGNS[i%5];return {id:`wave${wi+1}-enemy${i+1}`,name:`AUTOMATON ${i+1}`,
   wave:wi+1,order:i+1,maxHp:model.maxHp,speed:model.speed,art:'enemy',test:true};
 }));
}
function initialSlots(count){return ({1:[2],2:[1,3],3:[1,2,3],4:[0,1,3,4],5:[0,1,2,3,4]})[count].slice()}
function enterEnemy(slot){
 if(!waveQueue.length||enemies.some(e=>e.slot===slot)||enemies.length>=5)return null;
 const incoming=waveQueue.shift(),formation=ENEMY_DESIGNS[slot];
 const e={...incoming,slot,x:formation.x,y:formation.y,w:formation.w,h:formation.h,hp:incoming.maxHp};
 enemies.push(e);enemies.sort((a,b)=>a.slot-b.slot);gauges[e.id]=0;
 spawnHistory.push({wave:e.wave,id:e.id,slot,initial:waveKills===0,duringAttack:attackInProgress});
 syncEnemyHp();return e;
}
function beginWave(index){saveVitals();
 if(index>=wavePlan.length){encounterCleared=true;enemies=[];selectedEnemyId=null;syncEnemyHp();return;}
 waveIndex=index;waveQueue=[...wavePlan[index]];waveKills=0;enemies=[];actingEnemyId=null;pendingVacancies=[];
 const count=Math.min(5,waveQueue.length);
 for(const slot of initialSlots(count))enterEnemy(slot);
 selectedEnemyId=enemies[Math.floor(enemies.length/2)]?.id||null;
 syncEnemyHp();
 log=`Wave ${index+1}/${wavePlan.length}: ${wavePlan[index].length} enemies • ${count} deployed.`;
}
function resetEnemies(){
 wavePlan=buildWavePlan(waveOverride||WAVE_PRESETS[wavePreset]);waveIndex=-1;waveQueue=[];waveKills=0;
 totalEnemyDefeats=0;encounterCleared=false;spawnHistory=[];enemies=[];selectedEnemyId=null;actingEnemyId=null;pendingVacancies=[];attackInProgress=false;lastAttack=null;supportDemo=null;supportTestHistory=[];
 beginWave(0);
}
function resolveEnemyDefeat(victim){
 if(!victim||victim.hp>0||!enemies.some(e=>e.id===victim.id))return null;
 // Register the defeat NOW. Replacements and wave transitions wait for attack completion.
 enemies=enemies.filter(e=>e.id!==victim.id);delete gauges[victim.id];
 pendingVacancies.push(victim.slot);waveKills++;totalEnemyDefeats++;
 if(lastAttack&&attackInProgress)lastAttack.defeats.push({id:victim.id,slot:victim.slot});
 syncEnemyHp();
 if(!attackInProgress)settleAfterAttack(); // debug/non-attack deletion has no running attack to await
 return victim;
}
function settleAfterAttack(){
 if(attackInProgress)return false;
 // Temporary implementation detail, not a finalized multi-KO gameplay rule:
 // vacated slots are filled in ascending slot order for deterministic test reproducibility.
 const vacancies=pendingVacancies.splice(0).sort((a,b)=>a-b);
 for(const slot of vacancies){if(waveQueue.length)enterEnemy(slot)}
 if(enemies.length===0&&waveQueue.length===0){
  if(waveIndex+1<wavePlan.length)beginWave(waveIndex+1);
  else {encounterCleared=true;selectedEnemyId=null;}
 }
 if(!enemies.some(e=>e.id===selectedEnemyId))selectedEnemyId=chosenEnemy()?.id||null;
 syncEnemyHp();return true;
}
function applyTrainingHit(enemy,damage,hitNumber){
 if(!enemy||enemy.hp<=0||!attackInProgress)return false;
 enemy.hp=Math.max(0,enemy.hp-damage);
 lastAttack.hits.push({index:hitNumber,target:enemy.id,slot:enemy.slot,damage,hpAfter:enemy.hp});
 if(enemy.hp<=0)resolveEnemyDefeat(enemy);else syncEnemyHp();
 return true;
}
function finishTrainingAttack(serial){
 if(!attackInProgress||!lastAttack||lastAttack.serial!==serial)return;
 attackInProgress=false;lastAttack.finished=true;lastAttack.finishedAt=performance.now();
 settleAfterAttack();
 if(!encounterCleared&&lastAttack?.action!=='ultimate')finishSummonCreationForTest(lastAttack?.actor);
 if(phase!=='resolve')return;
 if(encounterCleared){cancelAllQueuedUltimates('victory');phase='victory';log='All enemies in every wave defeated.';return;}
  if(lastAttack?.action==='ultimate'){
   ultimateHistory.push({event:'finished',actor:lastAttack.actor,seq:lastAttack.ultimateSeq,turn});
   ultimateExecuting=false;runNextUltimate();
  }else drainUltimateQueueBefore(()=>nextTurn());
}
function setEnemyTarget(id){if(phase!=='player'||paused)return false;const e=enemies.find(e=>e.id===id&&e.hp>0);if(!e)return false;selectedEnemyId=id;cameraPreview='target';selectedAllyId=null;log=`Camera test: targeting ${e.name} (wave ${e.wave}, slot ${e.slot+1}).`;return true;}
function setWavePlanForTest(sizes){if(phase!=='setup')return false;try{buildWavePlan(sizes)}catch(e){return false}waveOverride=[...sizes];return true;}
function toggleWavePreset(){if(phase!=='setup')return;waveOverride=null;const choices=['stress','quick','sizes'];wavePreset=choices[(choices.indexOf(wavePreset)+1)%choices.length];}

const savedTeam=loadTeam();
let draft=[...savedTeam];
function validTeam(ids){return Array.isArray(ids)&&ids.length>=1&&ids.length<=3&&ids.every(id=>ROSTER_IDS.has(id))&&new Set(ids).size===ids.length}
function loadTeam(){try{const a=JSON.parse(localStorage.getItem(TEAM_KEY)||'null');if(validTeam(a))return a}catch(e){}return ['zero','test2','test3']}
function saveTeam(){try{localStorage.setItem(TEAM_KEY,JSON.stringify(draft))}catch(e){}}
function roster(id){return ROSTER.find(x=>x.id===id)}
function alive(){return party.filter(x=>x.hp>0)}
function active(){return party.find(x=>x.id===activeId)}
function say(message){hint=message;hintAt=performance.now()}
function schedule(fn,ms){const token=battleToken;setTimeout(()=>{if(token===battleToken)fn()},ms)}
function enterSelection(mandatory=false){saveVitals();cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;pendingVacancies=[];cancelAllQueuedUltimates('reset');battleToken++;summons=[];turnTimeline.reset();phase='setup';paused=false;forceSelect=mandatory;draft=[...loadTeam()];activeId=null;log='';say(mandatory?'This encounter requires team confirmation.':'Select 1–3 unique owned units.');}
function addUnit(id){if(phase!=='setup')return;if(draft.includes(id)){say('Already assigned: duplicates are not allowed.');return}if(draft.length>=3){say('Only three playable-character slots are permitted.');return}draft.push(id);}
function removeUnit(index){if(phase!=='setup')return;if(draft.length<=1){say('At least one playable character is required.');return}draft.splice(index,1);}
function reorderUnit(index,dir){if(phase!=='setup')return;const j=index+dir;if(j<0||j>=draft.length)return;[draft[index],draft[j]]=[draft[j],draft[index]];}
function startBattle(){
 if(phase!=='setup'||!validTeam(draft)){say('Choose 1–3 unique owned units.');return}
 saveTeam();cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 party=draft.map(id=>spawnProgressedUnit(id));
 turnTimeline.reset();speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;zeroSkillArmed=false;fx=null;paused=false;phase='intro';forceSelect=false;saveVitals();
 log=`Wave 1/${wavePlan.length}: ${wavePlan[0].length} training enemies (${enemies.length} on field).`;
 schedule(()=>{if(phase==='intro')nextTurn()},380);
}
function replay(){if(phase==='setup')return;draft=party.map(p=>p.id);startFromBattle();}
function startFromBattle(){
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 saveVitals();party=party.map(p=>spawnProgressedUnit(p.id));
 turnTimeline.reset();speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;zeroSkillArmed=false;fx=null;paused=false;phase='intro';saveVitals();
 log=`Wave test restarted: ${wavePlan.length} waves, ${wavePlan.reduce((n,w)=>n+w.length,0)} total enemies.`;
 schedule(()=>{if(phase==='intro')nextTurn()},380);
}
function nextTurn(){
 if(paused||['setup','victory','defeat'].includes(phase))return;
 if(liveEnemies().length===0){if(encounterCleared){phase='victory';return}say('Wave state has no active enemies.');return}
 if(!alive().length){phase='defeat';return}
 syncTurnTimeline();const nextEvent=turnTimeline.take();if(!nextEvent)return;
 syncLegacyGauges();const next=nextEvent.id;
 const previousActor=activeId||actingEnemyId||enemies[Math.floor(enemies.length/2)]?.id||null;
 turn++;
 const actingSummon=summons.find(s=>s.id===next&&s.mode==='independent');
 if(actingSummon){executeIndependentSummonTurn(actingSummon);return;}
 const attacking=enemies.find(e=>e.id===next&&e.hp>0);
 if(attacking){activeId=null;zeroSkillArmed=false;actingEnemyId=next;cameraPreview=null;phase='enemy';log=`${attacking.name} prepares an attack.`;
  schedule(()=>{if(phase!=='enemy'||paused)return;if(attacking.hp<=0){nextTurn();return}const candidates=alive();if(!candidates.length){cancelAllQueuedUltimates('defeat');phase='defeat';return}const target=candidates[Math.floor(Math.random()*candidates.length)];enemyCount++;const damage=92+((turn*37)%51);target.hp=Math.max(0,target.hp-damage);target.energy=Math.min(120,target.energy+10);saveVitals();cancelQueuedUltimatesOfDefeated();fx={kind:'enemy',at:performance.now(),damage,target:target.id,actorEnemyId:attacking.id};log=`${attacking.name} hits ${target.name} for ${damage}.`;phase='resolve';schedule(()=>drainUltimateQueueBefore(()=>{if(!alive().length){phase='defeat';log='All allied characters were defeated.'}else nextTurn()}),1000)},780);
 }else{actingEnemyId=null;activeId=next;zeroSkillArmed=false;cameraPreview=null;turnCamera={fromId:previousActor,toId:next,start:performance.now(),duration:560};phase='player';log=`${active().name}'s turn — tap an enemy to select its target.`;}
}
// Normal turns can use Basic or Skill. Ultimate is off-turn and never spends a turn.
function play(action){
 if(action==='ultimate')return queueUltimate(activeId);
 if(phase!=='player'||paused||!['basic','skill'].includes(action))return false;
 const a=active();if(!a||a.hp<=0)return false;
 if(action==='skill'&&sp<1){say('Not enough shared SP. Basic restores 1 SP.');return false;}
 return executeCombatAction(a,action,null);
}
function executeCombatAction(a,action,ultimateSeq=null){
 if(!a||a.hp<=0||!['basic','skill','ultimate'].includes(action))return false;
 const victim=chosenEnemy();if(!victim){say('No available enemy target.');return false;}
 const targetGeometry={x:victim.x,y:victim.y,w:victim.w,h:victim.h,slot:victim.slot};
 const mode=actionTargetMode(a,action),targets=chooseAttackTargets(mode,victim);
 const controlledSummon=action==='skill'&&a.test?summons.find(s=>s.mode==='controlled'&&!s.pendingCreation&&s.ownerId===a.id):null;
 const energyBefore=a.energy,spBefore=sp,spMaxBefore=effectiveSpMax();
 let damage=0;
 if(action==='basic'){damage=280;a.energy=Math.min(120,a.energy+25);sp=Math.min(effectiveSpMax(),sp+1)}
 else if(action==='skill'){damage=460;a.energy=Math.min(120,a.energy+35);sp--;addActionAdvance(a.id,25)}
 else damage=980; // energy is deducted when a queued Ultimate BEGINS, never here
 // Damage and energy gains remain existing sandbox values; target modes except
 // Zero Skill AOE remain TEST patterns, not newly defined character abilities.
 const serial=++attackSerial;
 attackInProgress=true;supportDemo=null;zeroSkillArmed=false;cameraPreview=null;selectedAllyId=null;
 lastAttack={serial,actor:a.id,action,mode,ultimateSeq,controlledSummonId:controlledSummon?.id||null,initialTarget:victim.id,initialTargets:targets.map(e=>e.id),
  hits:[],defeats:[],finished:false,startedAt:performance.now(),finishedAt:null,
  energyBefore,energyAfter:a.energy,spBefore,spAfter:sp,spMaxBefore,spMaxAfter:effectiveSpMax()};
 phase='resolve';fx={kind:action,at:performance.now(),damage,actor:a.id,targetEnemyId:victim.id,targetGeometry};
 log=`${controlledSummon?'TEST CONTROLLED SUMMON':action==='ultimate'?'ULT QUEUE':a.id==='zero'&&action==='skill'?'ZERO SKILL • AOE':'TEST '+mode.toUpperCase()}: ${a.name} uses ${action} • ${targets.length} initial target(s).`;
 if(controlledSummon)summonHistory.push({event:'controlled-activation',id:controlledSummon.id,ownerId:a.id,clock:turnTimeline.clock});
 if(mode==='five-hit'){
  let focused=victim,lastSlot=victim.slot;
  for(let n=0;n<5;n++)schedule(()=>{
   if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;
   if(!focused||focused.hp<=0)focused=closestSurvivingEnemy(lastSlot);
   if(!focused)return;lastSlot=focused.slot;
   const part=Math.floor(damage/5)+(n<damage%5?1:0);
   applyTrainingHit(focused,part,n+1);
  },160+n*135);
 }else{
  schedule(()=>{
   if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;
   for(let n=0;n<targets.length;n++)if(targets[n].hp>0)applyTrainingHit(targets[n],damage,n+1);
   },a.id==='zero'&&action==='basic'?645:340);
 }
 schedule(()=>finishTrainingAttack(serial),a.id==='zero'&&action==='basic'?ZERO_BASIC_MS:990);
 return true;
}
// Developer-only test helpers. They do not define the game's revival resource, cost, or eligibility rules.
function testKO(){if(!paused||phase!=='player')return;const others=alive().filter(p=>p.id!==activeId);if(!others.length){say('Debug KO requires another living ally; no final-ally KO.');return}const p=others[0];p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();log=`DEBUG ONLY: ${p.name} knocked out; party slot retained.`}
function testRevive(){if(!paused||phase!=='player')return;const p=party.find(p=>p.hp<=0);if(!p){say('No knocked-out member to test revival.');return}p.hp=Math.max(1,roundHp(p.maxHp*.35));gauges[p.id]=0;saveVitals();log=`DEBUG ONLY: ${p.name} restored in the same party slot.`}
function rect(x,y,w,h,fill,stroke=null,r=0){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function text(s,x,y,size=24,fill=color.white,weight='600',align='left'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.font=`${weight} ${size}px system-ui,-apple-system,Segoe UI,sans-serif`;ctx.fillText(String(s),x,y)}
function line(x,y,w,f=1,c='#72e3ae',bg='#303649',h=13){rect(x,y,w,h,bg,null,6);rect(x,y,Math.max(0,w*Math.min(1,Math.max(0,f))),h,c,null,6)}
function addButton(x,y,w,h,action,label,sub='',enabled=true){choiceRects.push({x,y,w,h,action,enabled});rect(x,y,w,h,enabled?'#263754':'#1d2538',enabled?'#a5c9dc':'#526176',11);text(label,x+w/2,y+h/2-(sub?10:0),19,enabled?'#fff4e6':'#9eafc1','750','center');if(sub)text(sub,x+w/2,y+h/2+16,13,'#bacadb','500','center')}
function drawBackground(){ctx.imageSmoothingEnabled=false;if(images.arena.complete&&images.arena.naturalWidth)ctx.drawImage(images.arena,0,0,W,H);else{rect(0,0,W,H,'#596f83');rect(0,480,W,420,'#a38f9e')}rect(0,0,W,165,'rgba(8,10,22,.24)');const shade=ctx.createLinearGradient(0,580,0,900);shade.addColorStop(0,'#17122500');shade.addColorStop(1,'#090d23dc');rect(0,560,W,340,shade)}
function silhouette(x,y,w,h,name){ctx.save();ctx.translate(x,y);const c='#7789a3';ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(w*.5,h*.16,w*.17,h*.14,0,0,Math.PI*2);ctx.fill();rect(w*.32,h*.30,w*.36,h*.38,c,null,13);rect(w*.15,h*.35,w*.15,h*.37,c,null,10);rect(w*.70,h*.35,w*.15,h*.37,c,null,10);rect(w*.34,h*.65,w*.13,h*.35,c,null,7);rect(w*.53,h*.65,w*.13,h*.35,c,null,7);ctx.restore();text('TEST ONLY',x+w/2,y+h*.55,14,'#131e33','800','center')}
function combatEnemies(){return liveEnemies()}
// BATTLE SCENE DEVELOPMENT STANDARD v1.0 — provisional rendering implementation.
// Layered 2D views, nonuniform parallax, stateful cinematic camera; HUD remains screen-space.
// New reverse-view arena geometry and test-slot silhouettes are development placeholders.
let cameraPreview=null,selectedAllyId=null,devPanelOpen=false;
// Review-only HUD arrangement. Developer controls are hidden until explicitly opened.
let turnCamera={fromId:null,toId:null,start:-1e6,duration:560};
const camera={shot:'command',from:'command',start:performance.now(),duration:470,lastX:0,mode:'command',parallax:{},focus:null};
function smooth01(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function clamp01(x){return Math.min(1,Math.max(0,x))}
// Zero's user-approved basic-attack assembly: 256×512 neutral + wind-up + slash.
// The motion is presentation-only; all damage, targeting and turn logic stays in combat actions.
// 1250 ms: dash 0–260, wind-up 260–460, strike 460–650, impact 650–760, return 760–1250.
const ZERO_BASIC_MS=1250;
function zeroBasicStage(t){
 if(phase!=='resolve'||fx?.kind!=='basic'||fx.actor!=='zero')return null;
 const dt=Math.max(0,t-fx.at);return dt<=ZERO_BASIC_MS?dt:null;
}
function easeOutCubic(x){x=clamp01(x);return 1-(1-x)*(1-x)*(1-x)}
function lerp(a,b,x){return a+(b-a)*x}
function zeroBasicTravel(t,pos){
 const dt=zeroBasicStage(t),target=fx?.targetGeometry;
 if(dt===null||!target)return pos;
 // Parallax-safe destination: camera remains independent from the actor's world motion.
 let approach=dt<260?easeOutCubic(dt/260):dt<760?1:1-smooth01((dt-760)/490);
 const scale=lerp(1,.50,approach);
 const targetWidth=pos.w*.50;
 const targetLeft=target.x-targetWidth*.80 + camera.currentX*(.43-.52);
 const targetFeet=target.y+target.h+12;
 return {...pos,x:lerp(pos.x,targetLeft,approach),baseY:lerp(pos.baseY,targetFeet,approach),w:pos.w*scale,h:pos.h*scale};
}
function zeroBasicPaint(x,baseY,w,h,dt){
 // Anchor images using their real painted-foot margins; never crop or rewrite Approved PNGs.
 const draw=(key,opacity=1)=>{const img=images[key];if(!img?.complete||!img.naturalWidth)return;
  const m=key==='zeroBasicSlash'?{foot:485,scale:1.08,dx:-.04}:key==='zeroBasicWindup'?{foot:500,scale:1,dx:0}:{foot:512,scale:1,dx:0};
  const sh=h*m.scale,sw=w*m.scale;
  ctx.save();ctx.globalAlpha*=opacity;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(img,x+(w-sw)/2+dxFor(m.dx,w),baseY-sh*m.foot/512,sw,sh);ctx.restore();
 };
 const mix=(before,after,a)=>{draw(before,1-a);draw(after,a)};
 if(dt<220)draw('zero');
 else if(dt<300)mix('zero','zeroBasicWindup',smooth01((dt-220)/80));
 else if(dt<450)draw('zeroBasicWindup');
 else if(dt<520)mix('zeroBasicWindup','zeroBasicSlash',smooth01((dt-450)/70));
 else if(dt<810)draw('zeroBasicSlash');
 else if(dt<930)mix('zeroBasicSlash','zero',smooth01((dt-810)/120));
 else draw('zero');
}
function dxFor(relative,width){return relative*width}
function cameraShot(t=performance.now()){
 if(phase==='setup'||phase==='intro'||phase==='victory'||phase==='defeat')return 'command';
 if(phase==='player')return cameraPreview==='party'?'party':cameraPreview==='target'?'target':(t-turnCamera.start<turnCamera.duration?'turn-transition':'command');
 if(phase==='enemy')return 'enemy-windup';
 if(phase==='resolve'&&fx){const dt=t-fx.at;
  if(fx.kind==='enemy')return dt<420?'enemy-windup':'enemy-impact';
  if(fx.kind==='ultimate')return dt<350?'ultimate-intro':dt<610?'attack-track':'attack-impact';
  return dt<(fx.kind==='basic'&&fx.actor==='zero'?460:350)?'attack-track':'attack-impact';
 }
 return 'command';
}
function shotPan(s){
 const tgt=(s==='attack-track'||s==='attack-impact')&&fx?.targetEnemyId?(enemies.find(e=>e.id===fx.targetEnemyId)||fx?.targetGeometry||chosenEnemy()):chosenEnemy(),att=enemies.find(e=>e.id===actingEnemyId);
 if(s==='target')return Math.max(-88,Math.min(23,-35-(tgt?(tgt.x-1040)*.115:0)));
 if(s==='enemy-windup')return Math.max(-104,Math.min(30,-47-(att?(att.x-1040)*.14:0)));
 if(s==='attack-impact'||s==='attack-track')return Math.max(-110,Math.min(26,-30-(tgt?(tgt.x-1040)*.09:0)));
 return ({command:0,'turn-transition':-36,party:34,'enemy-impact':28,'ultimate-intro':-86})[s]||0
}
function shotWorld(s){return s==='party'?'reverse':'forward'}
function prepareCamera(t){const s=cameraShot(t);const focus=s==='target'?chosenEnemy()?.id:s==='enemy-windup'?actingEnemyId:s==='attack-impact'||s==='attack-track'?fx?.targetEnemyId:null;if(s!==camera.shot||focus!==camera.focus){camera.from=camera.shot;camera.shot=s;camera.focus=focus;camera.start=t;camera.duration=(shotWorld(s)!==shotWorld(camera.from)?480:350);camera.lastX=camera.currentX??shotPan(camera.from)}
 camera.mode=shotWorld(camera.shot);
 camera.progress=smooth01((t-camera.start)/camera.duration);
 camera.currentX=camera.lastX+(shotPan(camera.shot)-camera.lastX)*camera.progress;
}
function withLayer(pan,rate,fn){ctx.save();ctx.translate(pan*rate,Math.sin(performance.now()*.00055)*1.6*rate);fn();ctx.restore()}
function layerImage(key,pan,rate){const im=images[key];if(!im||!im.complete||!im.naturalWidth)return;ctx.imageSmoothingEnabled=false;
 // Overscan prevents blank edges. Every layer moves by a distinct amount.
 ctx.drawImage(im,-55+pan*rate,-18,1710,963);
}
function mountains(pan,reverse=false){
 withLayer(pan,.13,()=>{
  ctx.fillStyle=reverse?'#92a4b9':'#8b9fbd';ctx.beginPath();ctx.moveTo(-100,432);
  const ps=reverse?[[100,318],[257,405],[420,255],[670,432],[910,295],[1120,438],[1350,260],[1700,420]]:[[80,325],[315,252],[490,412],[680,286],[950,410],[1150,268],[1430,375],[1700,286]];
  for(const [x,y] of ps)ctx.lineTo(x,y);ctx.lineTo(1710,525);ctx.lineTo(-100,525);ctx.fill();
  ctx.fillStyle=reverse?'#658698':'#668b98';ctx.beginPath();ctx.moveTo(-100,436);
  for(let i=0;i<=18;i++)ctx.lineTo(i*105-100,352+(i*7%5)*18);
  ctx.lineTo(1750,510);ctx.lineTo(-100,510);ctx.fill();
 });
}
function sky(t,reverse=false){
 const grd=ctx.createLinearGradient(0,0,0,540);grd.addColorStop(0,reverse?'#668aa8':'#78aac8');grd.addColorStop(1,reverse?'#c0c8d4':'#afbed2');rect(0,0,W,900,grd);
 withLayer(camera.currentX,.04,()=>{
  const x=((t*.007)%1750)-120;
  ctx.fillStyle='#eee3e4af';for(const [cx,cy] of [[230,118],[910,77],[1360,179]]){
   rect(cx-x*.07,cy,108,27,'#ede3e2ad');rect(cx+25-x*.07,cy-20,66,20,'#ede3e2ad');
  }
 });
 mountains(camera.currentX,reverse);
}
function forwardScene(t){
 sky(t,false);
 // From back to front: distant skyline, buildings, ground, tree/canopy, drifting petals.
 layerImage('architectureLayer',camera.currentX,.32);
 layerImage('floorLayer',camera.currentX,.72);
 layerImage('treeLayer',camera.currentX,1.18);
}
function reverseWalls(pan){
 withLayer(pan,.34,()=>{
  rect(-80,380,1760,80,'#656478');rect(-80,387,1760,16,'#9c9aa6');
  for(let x=-30;x<1660;x+=116){rect(x,350,26,108,'#55576b');rect(x-6,342,38,20,'#92919a')}
  // The reverse angle faces the opposite courtyard wall, not a mirrored castle image.
  rect(500,270,600,202,'#797783');rect(539,285,522,176,'#96929a');
  rect(615,325,370,146,'#53596d');rect(645,352,315,120,'#292f4b');
  for(const [x,y] of [[390,294],[1186,289]]){rect(x, y,54,168,'#736e79');rect(x-13,y-18,80,25,'#ada29b');rect(x+20,y+29,15,65,'#dec28e')}
  for(let x=525;x<=1090;x+=88)rect(x,283,22,34,'#b4a7a8');
 });
}
function reverseFloor(pan){
 withLayer(pan,.79,()=>{
  rect(-120,463,1840,500,'#aa929d');rect(-120,463,1840,30,'#b89daa');
  ctx.strokeStyle='#746f89';ctx.lineWidth=4;
  for(const x of [-820,-550,-320,-140,10,140,260,390,510,630,740,850,970,1120,1270,1440,1640,1850,2110]){
   ctx.beginPath();ctx.moveTo(800+(x-800)*.22,465);ctx.lineTo(x,945);ctx.stroke()
  }
  for(let yy=485;yy<980;yy+=52+(yy-460)*.055){ctx.beginPath();ctx.moveTo(-100,yy);ctx.lineTo(1700,yy);ctx.stroke()}
  // Center circular tile marker is part of the same training courtyard.
  ctx.strokeStyle='#d6b5ab';ctx.lineWidth=14;ctx.beginPath();ctx.ellipse(800,635,145,32,0,0,Math.PI*2);ctx.stroke();
 });
}
function reverseForeground(pan,t){
 withLayer(pan,1.19,()=>{
  // New view-specific cherry arch silhouettes. Provisional environment art.
  ctx.strokeStyle='#514450';ctx.lineWidth=35;ctx.beginPath();ctx.moveTo(1600,-30);ctx.lineTo(1454,145);ctx.lineTo(1390,340);ctx.stroke();
  ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(1454,145);ctx.lineTo(1280,34);ctx.moveTo(1454,145);ctx.lineTo(1590,77);ctx.stroke();
  const leaf='#cd9db2';ctx.fillStyle=leaf;
  for(let i=0;i<92;i++){let x=1260+(i*37%330),y=13+(i*43%138);if((x-1420)*(x-1420)*.2+(y-70)*(y-70)*3<9500)rect(x,y,11,9,(i%4===0)?'#d3b0bd':leaf)}
 });
}
function reverseScene(t){sky(t,true);reverseWalls(camera.currentX);reverseFloor(camera.currentX);reverseForeground(camera.currentX,t)}
function petals(t){ctx.save();ctx.fillStyle='rgba(248,181,200,.72)';for(let i=0;i<10;i++){
 const x=(i*197+(t*.018)*(1+i%3))%1710-45;const y=185+(i*71+(t*.011)*(1+i%2))%500;
 ctx.fillRect(x+camera.currentX*.12,y,(i%2?5:8),3);
}ctx.restore()}
const PARTY_STAGE={
 1:[{x:719,baseY:676,w:192,h:384}],
 2:[{x:572,baseY:674,w:182,h:364},{x:876,baseY:626,w:165,h:330}],
 3:[{x:418,baseY:671,w:174,h:348},{x:716,baseY:613,w:166,h:332},{x:1046,baseY:672,w:174,h:348}]
};
function cameraAllyPosition(id,view){
 if(view==='party'){const i=party.findIndex(p=>p.id===id);return PARTY_STAGE[party.length]?.[i]||null}
 // Foreground cinematic framing: the ally stands close to camera, not inside a reserved
 // 'safe' slot above the party HUD. The HUD pass paints OVER the actor's lower body.
 // This is a presentation-only change. No world-space targeting mechanics depend on it.
 return {x:211,baseY:908,w:288,h:576};
}
function drawUnit(p,pos,view,t,acting=false){
 if(!p||!pos)return;const {x,baseY,w,h}=pos,top=baseY-h;
 const bob=Math.sin(t*.0024+(p.id==='zero'?0:1))*(p.hp>0?3:0);
 const select=view==='party'&&selectedAllyId===p.id;const eligible=view==='party'&&supportDemo?eligibleAllyTarget(p,supportDemo):true;
 ctx.save();ctx.translate(camera.currentX*(view==='party'?.32:.52),bob);
 ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.44,16,0,0,Math.PI*2);ctx.fillStyle='rgba(12,12,40,.45)';ctx.fill();
 if(acting||select){ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.51,22,0,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle=select?'#eaca94':'#8be3fb';ctx.stroke()}
 if(p.hp<=0)ctx.globalAlpha=.37;
 const art=p.id==='zero'?(view==='party'?'zeroFront':'zero'):null;
 const zb=view==='command'&&p.id==='zero'?zeroBasicStage(t):null;
  if(zb!==null)zeroBasicPaint(x,baseY,w,h,zb);
  else if(art&&images[art]?.complete&&images[art].naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(images[art],x,top,w,h)}else silhouette(x,top,w,h,p.name);
 ctx.restore();
 const xx=x+camera.currentX*(view==='party'?.32:.52);
 if(view==='party'){
  rect(xx-16,top-60,w+32,40,select?'#3f3845ef':!eligible?'#24212fe7':'#1e2945df',select?'#ffe2a8':eligible?'#869ab0':'#655d6a',8);
  text(p.name,xx+w/2,top-41,p.test?16:19,p.hp<=0?'#c6acb0':'#f4edf8','800','center');
  if(p.hp<=0)text('K.O. • SLOT RETAINED',xx+w/2,top-77,14,'#ffbaba','800','center');
  line(xx-2,top-13,w+4,p.hp/p.maxHp,p.hp<=0?'#74525f':'#72e4b1','#454457',8);
  // Target test hit boxes do not affect actual healing or combat targeting logic.
  if(phase==='player'&&cameraPreview==='party')choiceRects.push({x:xx-19,y:top-82,w:w+38,h:h+114,action:'camera-select:'+p.id,enabled:eligible});
 }

}
function drawEnemy(t,shot){const all=combatEnemies();if(phase==='player'&&cameraPreview!=='party'&&previewTargetMode()==='multi'&&all.length){ctx.save();ctx.strokeStyle='rgba(102,243,211,.82)';ctx.lineWidth=5;ctx.setLineDash([22,12]);ctx.beginPath();ctx.ellipse(1093+camera.currentX*.43,558,453,67,0,0,Math.PI*2);ctx.stroke();ctx.restore()}for(const e of all){
 const isFocus=phase==='player'&&chosenEnemy()?.id===e.id;
 const patternHit=phase==='player'&&cameraPreview!=='party'&&chooseAttackTargets(previewTargetMode()).some(x=>x.id===e.id);
 const isActor=(shot==='enemy-windup'&&actingEnemyId===e.id)||(fx?.kind==='enemy'&&fx?.actorEnemyId===e.id&&shot==='enemy-impact');
 const sh=isActor?1.09:shot==='attack-impact'&&fx?.targetEnemyId===e.id?1.045:1;
 const ww=e.w*sh,hh=e.h*sh,xx=e.x+camera.currentX*.43-(ww-e.w)/2,yy=e.y+(e.h-hh);
 const shimmer=isFocus?Math.sin(t*.004)*2:0;
 const zbHit=fx?.kind==='basic'&&fx?.actor==='zero'&&fx.targetEnemyId===e.id?t-fx.at:null;
  const hitKick=zbHit!==null&&zbHit>=645&&zbHit<745?Math.sin((zbHit-645)*.18)*(1-(zbHit-645)/100)*4:0;
  ctx.save();ctx.globalAlpha=e.hp>0?1:Math.max(.02,.8-(t-fx.at)/1050);ctx.translate(shimmer+hitKick,Math.sin(t*.0026+e.x)*2.2);
 ctx.beginPath();ctx.ellipse(xx+ww/2,yy+hh-4,ww*.48,13,0,0,Math.PI*2);ctx.fillStyle='#1b213c70';ctx.fill();
 if(images[e.art]?.complete&&images[e.art].naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(images[e.art],xx,yy,ww,hh)}
 ctx.restore();
 if(e.hp<=0)continue;
 if(isFocus||isActor||patternHit){ctx.strokeStyle=isFocus?'#ffe2a0':patternHit?'#69e8d4':'#b7e6ff';ctx.lineWidth=isFocus?5:4;ctx.strokeRect(xx-8,yy-6,ww+16,hh+13);if(patternHit){rect(xx+ww-29,yy-23,32,22,'#124d53ee','#a0f7e6',5);text('✓',xx+ww-13,yy-12,17,'#d7fff4','800','center')}}
 rect(xx-3,yy-50,ww+6,30,isFocus?'#54464ff0':'#1c2843e8',isFocus?'#f6dfa7':'#8d96a9',6);
 text(e.name,xx+ww/2,yy-35,14,'#fff4e8','800','center');
 line(xx+2,yy-16,ww-4,e.hp/e.maxHp,isFocus?'#ffd88e':'#ff8276','#4b2637',8);
 if(phase==='player'&&!paused&&cameraPreview!=='party')choiceRects.push({x:xx-13,y:yy-55,w:ww+26,h:hh+65,action:'enemy-target:'+e.id,enabled:true});
 }}
function drawActorsForShot(t,shot){
 const view=shotWorld(shot)==='reverse'?'party':'command';
 if(view==='party'){
  const ordered=party.map(p=>({p,pos:cameraAllyPosition(p.id,'party')})).sort((a,b)=>a.pos.baseY-b.pos.baseY);
  for(const {p,pos} of ordered)drawUnit(p,pos,'party',t,p.id===selectedAllyId);
  return;
 }
 const chosen=shot==='enemy-impact'?(party.find(p=>p.id===fx?.target)||active()||alive()[0]):active()||alive()[0];
 if(shot==='turn-transition'){
  const q=smooth01((t-turnCamera.start)/turnCamera.duration),old=party.find(p=>p.id===turnCamera.fromId);
  drawEnemy(t,shot);
  if(old&&old.id!==chosen?.id){ctx.save();ctx.globalAlpha=1-q;drawUnit(old,{...cameraAllyPosition(old.id,'command'),x:cameraAllyPosition(old.id,'command').x-110*q},'command',t,false);ctx.restore()}
  if(chosen){ctx.save();ctx.globalAlpha=q;drawUnit(chosen,{...cameraAllyPosition(chosen.id,'command'),x:cameraAllyPosition(chosen.id,'command').x+110*(1-q)},'command',t,true);ctx.restore()}
  return;
 }
 const pos=cameraAllyPosition(chosen?.id,'command');
 if(chosen&&pos){
  // True tracked character travel is independent of the background-layer camera offsets.
  const dt=fx?.kind!=='enemy'&&fx?.actor===chosen.id?t-fx.at:9999;
  const travel=(shot==='attack-track'||shot==='attack-impact')?Math.sin(Math.PI*clamp01(dt/1120))*180:0;
  // Enemies are in the midground; render them first, then the close foreground ally.
  drawEnemy(t,shot);
  drawUnit(chosen,(chosen.id==='zero'&&zeroBasicStage(t)!==null)?zeroBasicTravel(t,pos):{...pos,x:pos.x+travel,baseY:pos.baseY-travel*.18},'command',t,phase==='player'&&cameraPreview!=='target');
 }else{
  drawEnemy(t,shot);
 }
 if(shot==='ultimate-intro'&&chosen?.id==='zero'){
  // Zero-specific development camera cut-in. A full bespoke ultimate animation remains an art dependency.
  ctx.save();ctx.globalAlpha=.92;
  rect(550,130,470,505,'rgba(17,27,51,.76)','#e6c892',22);
  if(images.zeroFront?.complete&&images.zeroFront.naturalWidth){ctx.drawImage(images.zeroFront,644,150,279,475)}
  text('ZERO  /  ULTIMATE',784,623,29,'#fff1cc','850','center');ctx.restore();
 }
}
function drawBattleShot(t,shot){const reverse=shotWorld(shot)==='reverse';
 if(reverse)reverseScene(t);else forwardScene(t);
 drawActorsForShot(t,shot);petals(t);
 const shade=ctx.createLinearGradient(0,565,0,900);shade.addColorStop(0,'rgba(12,12,26,0)');shade.addColorStop(1,'rgba(5,10,25,.52)');rect(0,555,W,345,shade);
}
function drawCameraStage(t){prepareCamera(t);
 // View changes are cuts with a short masked dissolve. Within the same view, cameraX is eased.
 const p=camera.progress;
 if(shotWorld(camera.from)!==shotWorld(camera.shot)&&p<.82){
  drawBattleShot(t,camera.from);ctx.save();ctx.globalAlpha=smooth01(p/.82);drawBattleShot(t,camera.shot);ctx.restore();
 }else drawBattleShot(t,camera.shot);
 // Camera test labels are shown in the HUD; no obscured scene banners.
}

function drawFx(t){
 if(!fx)return;const dt=t-fx.at;const fxDuration=fx.kind==='basic'&&fx.actor==='zero'?ZERO_BASIC_MS:950;if(dt>fxDuration){fx=null;return}
 const q=dt/fxDuration;
 ctx.save();
 if(fx.kind==='basic'&&fx.actor==='zero'){
  const foe=enemies.find(e=>e.id===fx.targetEnemyId)||fx.targetGeometry;
  if(foe){const x=foe.x+foe.w*.48+camera.currentX*.43,y=foe.y+foe.h*.52;
   if(dt>=450&&dt<=720){const a=clamp01((dt-450)/80)*(1-clamp01((dt-650)/70));
    ctx.save();ctx.translate(x,y);ctx.rotate(-.34);ctx.lineWidth=6;ctx.lineCap='round';ctx.strokeStyle=`rgba(232,242,253,${.82*a})`;
    ctx.beginPath();ctx.moveTo(-92,-117);ctx.quadraticCurveTo(130,-76,124,107);ctx.stroke();
    ctx.lineWidth=2;ctx.strokeStyle=`rgba(255,255,255,${.65*a})`;ctx.beginPath();ctx.moveTo(-83,-132);ctx.quadraticCurveTo(151,-66,133,106);ctx.stroke();ctx.restore();
   }
   if(dt>=645&&dt<=760){const a=1-clamp01((dt-645)/115);ctx.save();ctx.translate(x,y);ctx.globalAlpha=a;
    ctx.strokeStyle='#fff8eb';ctx.lineWidth=3;for(let i=0;i<8;i++){const angle=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(angle)*13,Math.sin(angle)*13);ctx.lineTo(Math.cos(angle)*(33+(i%2)*9),Math.sin(angle)*(33+(i%2)*9));ctx.stroke();}
    ctx.fillStyle='#eef7ff';ctx.beginPath();ctx.arc(0,0,11*a+2,0,Math.PI*2);ctx.fill();ctx.restore();
   }
   if(dt>=645){ctx.save();ctx.globalAlpha=1-clamp01((dt-645)/605);text('-'+fx.damage,x,y-52-(dt-645)*.08,38,'#fff4dc','900','center');ctx.restore();}
  }
 }else if(fx.kind!=='enemy'){
  const impact=enemies.find(e=>e.id===fx.targetEnemyId)||fx.targetGeometry;ctx.translate(impact?impact.x+impact.w/2+camera.currentX*.43:1126,impact?impact.y+impact.h*.58:438);ctx.rotate(-.4);
  ctx.strokeStyle=fx.kind==='ultimate'?`rgba(255,220,132,${1-q})`:fx.kind==='skill'?`rgba(145,225,255,${1-q})`:`rgba(255,247,238,${1-q})`;
  ctx.lineWidth=fx.kind==='ultimate'?28:14;ctx.beginPath();ctx.ellipse(0,0,120+80*q,30+150*q,0,0,Math.PI*1.5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-140,-50);ctx.lineTo(140,75);ctx.stroke();
 }else{
  const pos=cameraAllyPosition(fx.target,"command");const xx=pos?pos.x+pos.w/2:440,yy=pos?pos.baseY-pos.h*.58:500;
  ctx.strokeStyle=`rgba(255,98,121,${1-q})`;ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(xx-65,yy-85);ctx.lineTo(xx+65,yy+70);ctx.stroke();
 }
 ctx.restore();
 if(dt>100&&!(fx.kind==='basic'&&fx.actor==='zero')){const pos=fx.kind==='enemy'?cameraAllyPosition(fx.target,"command"):null;
  const foe=fx.kind!=='enemy'?(enemies.find(e=>e.id===fx.targetEnemyId)||fx.targetGeometry):null;const x=foe?foe.x+foe.w/2+camera.currentX*.43:pos?pos.x+pos.w/2:1142,y=foe?foe.y+foe.h*.12:pos?pos.baseY-pos.h*.73:355;
  text('-'+fx.damage,x,y-70*q,42,fx.kind==='enemy'?'#ff9d9e':'#fff0ba','900','center')}
}
function getOrder(n){
 const predicted=turnTimeline.preview(n).map(x=>x.id);
 const current=phase==='player'?activeId:phase==='enemy'?actingEnemyId:null;
 return current?[current,...predicted.slice(0,n-1)]:predicted;
}
function hudCircle(cx,cy,r,fill,stroke,lw=3){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}}
function hudButton(x,y,w,h,action,label,enabled=true,active=false){
 choiceRects.push({x,y,w,h,action,enabled});rect(x,y,w,h,active?'rgba(89,120,150,.92)':enabled?'rgba(23,34,54,.88)':'rgba(18,26,42,.68)',active?'#c6eaff':enabled?'#68819b':'#435267',12);
 text(label,x+w/2,y+h/2,18,enabled?'#f2f6ff':'#7789a4','750','center');
}
function hudPortrait(img,x,y,w,h,headShoulders=false){
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.clip();rect(x,y,w,h,'rgba(65,93,116,.42)');
 if(img?.complete&&img.naturalWidth){ctx.imageSmoothingEnabled=true;
   const iw=img.naturalWidth,ih=img.naturalHeight;
   // Use an existing approved Zero front image as a cropped UI portrait, not the retired old portrait.
   const cropH=Math.min(ih,Math.round(ih*(headShoulders?.31:.49))),cropW=Math.min(iw,Math.round(cropH*w/h));
   ctx.drawImage(img,(iw-cropW)/2,0,cropW,cropH,x,y,w,h);
 }else{hudCircle(x+w/2,y+h*.39,w*.18,'#899bb1');rect(x+w*.16,y+h*.57,w*.68,h*.48,'#526e8b',null,9)}
 ctx.restore();
}
// HUD-only visualization of existing status arrays, if a combat system supplies them.
// The current prototype has no status-effect mechanics. Test data is visual-only.
function hudStatusList(p){return Array.isArray(p.hudStatuses)?p.hudStatuses:[]}
function drawAllyStatuses(p,x,portraitY,sz){
 const effects=hudStatusList(p);if(!effects.length)return;
 const iconSize=23,pitch=26,perRow=Math.max(1,Math.floor((sz+3)/pitch));
 const rows=Math.ceil(effects.length/perRow),areaHeight=rows*iconSize+(rows-1)*3;
 const y0=portraitY-11-areaHeight;
 for(let i=0;i<effects.length;i++){
  const ef=effects[i],row=Math.floor(i/perRow),col=i%perRow;
  const bx=x+col*pitch,by=y0+row*pitch;
  const favorable=ef.kind!=='debuff';
  rect(bx,by,iconSize,iconSize,favorable?'rgba(23,77,104,.98)':'rgba(105,45,65,.98)',favorable?'#8bd1ef':'#ec9da9',4);
  ctx.save();ctx.beginPath();ctx.rect(bx+1,by+1,iconSize-2,iconSize-2);ctx.clip();
  text(String(ef.icon||'✦').slice(0,2),bx+iconSize/2,by+15,15,'#f7f5ff','750','center');
  if(Number.isInteger(ef.turns)&&ef.turns>=0){
   const duration=String(ef.turns),font=duration.length>2?8:10;
   rect(bx+iconSize-13,by+iconSize-13,12,12,'rgba(6,15,26,.98)',null,2);
   text(duration,bx+iconSize-7,by+iconSize-4,font,'#fffafa','900','center');
  }
  ctx.restore();
 }
}
function drawAllyUltimate(p,x,y,sz){
 const radius=sz*.20;
 const cx=x+sz-radius-4,cy=y+sz-radius-4;
 const queued=isUltPending(p.id),ready=canQueueUltimate(p),ko=p.hp<=0;
 // Keep a 44+-CSS-pixel-equivalent hit area in the portrait itself at phone scale.
 const hit=Math.min(106,sz-4);
 choiceRects.push({x:x+sz-hit-1,y:y+sz-hit-1,w:hit,h:hit,action:'queue-ult:'+p.id,enabled:ready});
 ctx.save();ctx.beginPath();ctx.rect(x,y,sz,sz);ctx.clip();
 if(ready){ctx.shadowColor='#ffdd93';ctx.shadowBlur=18;}
 hudCircle(cx,cy,radius,'#11233b',ready?'#ffdfa0':queued?'#e9b77d':'#90a6bc',ready?4:2.5);
 ctx.shadowBlur=0;
 // Interior fill is the sole energy meter: bottom-to-top and no numeric or ring indicator.
 const availableFrac=queued?0:Math.max(0,Math.min(1,availableEnergy(p)/ULTIMATE_ENERGY_COST));
 const inner=radius-3.3;
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,inner,0,Math.PI*2);ctx.clip();
 const tint=ctx.createLinearGradient(cx,cy+inner,cx,cy-inner);
 tint.addColorStop(0,ready?'#4bcce9':'#3188c4');tint.addColorStop(1,ready?'#fff0a7':'#7bddfc');
 rect(cx-inner,cy+inner-(2*inner*availableFrac),2*inner,2*inner*availableFrac,tint);
 if(queued)rect(cx-inner,cy-inner,2*inner,2*inner,'rgba(102,69,40,.74)');
 ctx.restore();
 text(queued?'◈':'✦',cx,cy+radius*.29,radius*.95,ready?'#fff9df':ko?'#8996a4':'#ecf5ff','900','center');
 if(queued){ctx.beginPath();ctx.arc(cx,cy,radius-2,0,Math.PI*2);ctx.strokeStyle='#efc37e';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([])}
 ctx.restore();
}
function drawAllyPortraitHud(){
 // Portrait cards retain a shared baseline. Only the active ally is full scale.
 // No names, no standalone EP bars, and no extra stat/name panel.
 const bottom=883,reference=136,spacing=22;
 let x=165;
 for(const p of party){
  const activeAlly=phase==='player'&&activeId===p.id&&p.hp>0;
  const ko=p.hp<=0,scale=activeAlly?1:.9,sz=reference*scale;
  const numberY=bottom-1,barY=bottom-28,barH=9,gap=7,portraitY=barY-gap-sz;
  ctx.save();ctx.globalAlpha=ko?.57:activeAlly?1:.84;
  // Premium but compact framing: full color for active/inactive distinctions,
  // only the border brightens for the active ally (no lift or card glow).
  rect(x-3,portraitY-3,sz+6,sz+6,'rgba(14,23,42,.96)',activeAlly?'#f3d79e':'rgba(129,164,191,.82)',12);
  hudPortrait(p.id==='zero'?images.zeroFront:null,x,portraitY,sz,sz,true);
  if(ko)rect(x,portraitY,sz,sz,'rgba(30,17,23,.62)',null,10);
  drawAllyUltimate(p,x,portraitY,sz);
  // All effects are shown in application order. Additional rows grow upward.
  drawAllyStatuses(p,x,portraitY,sz);
  // Small visible gap, full-width health bar, then centered numeric health.
  line(x,barY,sz,ko?0:p.hp/p.maxHp,ko?'#b16b76':'#67e3b4','#23374d',barH);
  text(ko?'0 / '+p.maxHp:`${p.hp} / ${p.maxHp}`,x+sz/2,numberY,14*scale,ko?'#f0afb7':'#e4f3ef','750','center');
  ctx.restore();
  x+=sz+spacing;
 }
}
function toggleHudStatusDemo(){
 if(['setup','intro','victory','defeat'].includes(phase))return false;
 const enabled=party.some(p=>hudStatusList(p).length);
 for(let i=0;i<party.length;i++)party[i].hudStatuses=enabled?[]:(i===0?[
  {kind:'buff',icon:'⬡',turns:3},{kind:'debuff',icon:'✹',turns:2},
  {kind:'buff',icon:'✦',turns:4},{kind:'buff',icon:'♥',turns:null},
  {kind:'debuff',icon:'❄',turns:1},{kind:'buff',icon:'◆',turns:2},
  {kind:'debuff',icon:'◈',turns:5}
 ]:i===1?[{kind:'buff',icon:'⬡',turns:2},{kind:'debuff',icon:'✹',turns:1}]:[{kind:'buff',icon:'✦',turns:null}]);
 say(enabled?'STATUS HUD TEST OFF':'STATUS HUD TEST ON — visual only; no gameplay effects');return true;
}
function drawDeveloperPanel(){
 const x=938,y=92,w=633,h=591;
 rect(x,y,w,h,'rgba(12,19,32,.97)','#aab9ce',16);
 text('COMBAT TEST CONTROLS',x+24,y+31,23,'#f2dfbd','800');text('Preview tools only — not canonical abilities',x+24,y+61,15,'#a9bfd2','600');
 const modes=[['single','SINGLE'],['aoe','AOE'],['multi','MULTI'],['five-hit','5-HIT']];
 for(let i=0;i<modes.length;i++){const [mode,label]=modes[i];hudButton(x+23+i*150,y+82,139,49,'mode:'+mode, label,phase==='player'&&!paused,targetingMode===mode)}
 text('TARGET / CAMERA',x+23,y+153,14,'#b9c8d8','800');
 hudButton(x+23,y+174,184,49,'camera-party','ALLY VIEW',phase==='player'&&!paused,cameraPreview==='party');
 hudButton(x+219,y+174,184,49,'camera-target','ENEMY VIEW',phase==='player'&&!paused,cameraPreview==='target');
 hudButton(x+416,y+174,191,49,'cap-test','SP MAX +1',phase==='player'&&!paused);
 hudButton(x+23,y+243,184,49,'support-heal','HEAL TEST',phase==='player'&&!paused);
 hudButton(x+219,y+243,184,49,'support-revive','REVIVE TEST',phase==='player'&&!paused);
 if(!supportDemo)hudButton(x+416,y+243,191,49,'hud-status-test','STATUS ICONS',phase==='player'&&!paused,party.some(p=>hudStatusList(p).length));
 if(supportDemo){hudButton(x+416,y+243,191,49,'confirm-support','CONFIRM',!!party.find(p=>p.id===selectedAllyId&&eligibleAllyTarget(p,supportDemo)));hudButton(x+416,y+299,191,38,'cancel-support','CANCEL');}
 text('CHARGE ULTIMATE ENERGY — TEST ONLY',x+23,y+323,14,'#b9c8d8','800');
 for(let i=0;i<party.length;i++)hudButton(x+23+i*198,y+345,187,45,'charge-ult:'+party[i].id,'+ ENERGY '+(i+1),party[i].hp>0&&!paused&&!['intro','victory','defeat'].includes(phase));
 text('FUNDAMENTAL 05 — TURN TIMING TESTS',x+23,y+412,14,'#b9c8d8','800');
 hudButton(x+23,y+429,183,40,'f05-advance','ADVANCE +25%',phase==='player'&&!paused);
 hudButton(x+222,y+429,183,40,'f05-delay','DELAY 25%',phase==='player'&&!paused);
 hudButton(x+421,y+429,187,40,'f05-speed','SPEED x1.3',phase==='player'&&!paused);
 hudButton(x+23,y+476,282,40,'f05-summon-independent','INDEPENDENT SUMMON',phase==='player'&&!paused);
 hudButton(x+321,y+476,287,40,'f05-summon-controlled','CONTROLLED SUMMON',phase==='player'&&!paused);
 const actor=active(),prog=actor?progressFor(actor.id):null;
 text(`LEVEL / HP TEST • ${actor?actor.name+' LV '+prog?.level:'NO ACTIVE ALLY'} • MATERIALS & EQUIPMENT NOT DEFINED`,x+23,y+535,13,'#b9c8d8','750');
 const canAct=phase==='player'&&!paused&&!!actor;
 hudButton(x+23,y+548,141,40,'progress-test-level','LEVEL +1',canAct&&actor.level<50&&(!ASCENSION_GATES.includes(actor.level)||prog.ascended.includes(actor.level)));
 hudButton(x+174,y+548,139,40,'progress-test-ascend','ASCEND',canAct&&ASCENSION_GATES.includes(actor.level)&&!prog.ascended.includes(actor.level));
 hudButton(x+324,y+548,137,40,'hp-test-flat','FLAT +20',canAct);
 hudButton(x+471,y+548,136,40,'hp-test-percent','HP +20%',canAct);
}
function drawHud(t){
 const cinematic=phase==='resolve'||phase==='enemy';
 // HUD is screen-space and visually distinct from the layered battlefield.
 const shadow=ctx.createLinearGradient(0,675,0,H);shadow.addColorStop(0,'rgba(6,10,20,0)');shadow.addColorStop(.32,'rgba(7,12,24,.42)');shadow.addColorStop(1,'rgba(4,8,19,.94)');rect(0,675,W,225,shadow);
 // Small title and current wave: do not block battlefield framing.
 text('TWO-TONE',116,33,28,'#f8f4ea','850');
 text(`WAVE ${Math.max(1,waveIndex+1)} / ${wavePlan.length||1}`,120,64,16,'#e4cda2','750');
 // Vertical timeline - compact actual turn order, not additional faux turns.
 ctx.save();ctx.globalAlpha=cinematic?.48:1;
 rect(24,106,78,404,'rgba(10,18,34,.49)','rgba(179,202,223,.34)',18);
 const order=getOrder(6);for(let i=0;i<order.length;i++){
  const id=order[i],foe=enemies.find(e=>e.id===id),ally=party.find(p=>p.id===id),summon=summons.find(s=>s.id===id),now=i===0;
  const xx=31,yy=119+i*64;
  rect(xx,yy,64,58,now?'rgba(38,66,90,.95)':'rgba(17,28,47,.87)',now?'#f9dea5':foe?'#a77c89':'#759bbb',12);
  if(foe)hudPortrait(images[foe.art],xx+7,yy+5,49,44);
  else if(summon){hudCircle(xx+31,yy+25,19,'#508c8f','#d4f5ed',2);text('✧',xx+31,yy+25,22,'#ffffff','800','center');}
  else if(id==='zero')hudPortrait(images.zeroFront,xx+7,yy+5,49,44);
  else{hudCircle(xx+31,yy+21,13,'#6e8eac');rect(xx+19,yy+33,24,16,'#6784a1',null,7)}
  text(now?'NOW':String(i+1),xx+54,yy+48,10,now?'#fff2cb':'#bacbdf','850','right');
 }
 ctx.restore();
 // Compact expanded selected enemy information.
 const focus=chosenEnemy();
 if(phase==='player'&&cameraPreview!=='party'&&focus){
  rect(938,22,399,72,'rgba(10,16,31,.78)','rgba(210,213,220,.40)',14);
  text(focus.name,961,44,19,'#fff3db','750');
  text(`HP ${focus.hp} / ${focus.maxHp}`,1315,44,15,'#f0e7eb','700','right');
  line(961,65,348,focus.hp/focus.maxHp,'#f38382','#343d51',9);
 }else if(cameraPreview==='party'){
  rect(1010,24,386,62,'rgba(10,16,31,.76)','rgba(200,207,225,.38)',14);
  text('SELECT AN ALLY',1035,55,20,'#f7e7ca','800');
 }
 // Separate compact upper-right utility controls.
 hudButton(1366,25,74,55,'dev-panel-toggle','DEV',true,devPanelOpen);
 hudButton(1481,25,74,55,'pause',paused?'PLAY':'PAUSE',phase==='player'||paused);
 // Invisible 104x104 touch hit regions respect iPhone's minimum target dimension.
 choiceRects.push({x:1348,y:7,w:106,h:100,action:'dev-panel-toggle',enabled:true});
 choiceRects.push({x:1463,y:7,w:106,h:100,action:'pause',enabled:phase==='player'||paused});
 // Contextual action cue; the main stage stays unobstructed.
 if(phase==='player'){
  const p=active();text(p?.name||'ALLY',730,712,17,'#fae3b9','800');
  const mode=previewTargetMode(),hits=chooseAttackTargets(mode);
  text(zeroSkillArmed&&p?.id==='zero'?`ZERO SKILL • AOE • ${hits.length} TARGETS`:mode==='aoe'?`AOE • ${hits.length} TARGETS`:mode==='multi'?`ALL ENEMIES • ${hits.length} TARGETS`:'SELECT AN ENEMY',842,712,15,'#d4e9f4','700');
 }
 // Portrait-focused Ally HUD review layout, without altering combat resource logic.
 ctx.save();ctx.globalAlpha=cinematic?.88:1;
 drawAllyPortraitHud();
 ctx.restore();
 // Shared SP glyphs above actions, wrap automatically for increased effective capacity.
 ctx.save();ctx.globalAlpha=cinematic?.3:1;
 const maximum=effectiveSpMax(),visibleCount=Math.max(0,maximum),perRow=10,pipPitch=29;
 const rowCount=Math.ceil(visibleCount/perRow),baseX=1268,baseY=696;
 text('SKILL POINTS',1270,baseY-21,15,'#e9dcbe','850');
 for(let i=0;i<visibleCount;i++){
   const row=Math.floor(i/perRow),col=i%perRow,cx=baseX+col*pipPitch,cy=baseY-row*29;
   ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.PI/4);
   rect(-8,-8,16,16,i<sp?'#c7f1ff':'rgba(52,77,97,.90)',i<sp?'#ecfbff':'#8094a5',3);ctx.restore();
 }
 // Battle commands: only Basic and Skill. Ultimate is inside portrait HUDs.
 const playerReady=phase==='player'&&!paused;
 const actions=[
  {key:'basic',cx:1353,cy:816,r:51,enabled:playerReady,icon:'⚔',label:'BASIC'},
  {key:'skill',cx:1508,cy:800,r:64,enabled:playerReady&&sp>0,icon:'✦',label:zeroSkillArmed&&activeId==='zero'?'CONFIRM':'SKILL'},
 ];
 for(const a of actions){
  const enabled=a.enabled;
  choiceRects.push({x:a.cx-a.r-5,y:a.cy-a.r-5,w:(a.r+5)*2,h:(a.r+5)*2,action:a.key,enabled});
  hudCircle(a.cx,a.cy,a.r,enabled?'rgba(29,48,70,.97)':'rgba(19,32,49,.87)',enabled?'#fff0c3':'#738092',4);
  hudCircle(a.cx,a.cy,a.r-9,'rgba(13,25,45,.58)',enabled?'rgba(130,193,220,.54)':'rgba(82,100,121,.30)',2);
  text(a.icon,a.cx,a.cy-12,a.key==='skill'?43:41,enabled?'#f5f7ff':'#8897a9','850','center');
  text(a.label,a.cx,a.cy+31,a.key==='skill'?18:16,enabled?'#fff5dc':'#a0aebc','850','center');
 }
 ctx.restore();
 if(ultimateQueue.length){const names=ultimateQueue.map(q=>party.find(p=>p.id===q.actorId)?.name||q.actorId).join(' → ');rect(965,769,287,38,'rgba(28,35,49,.82)','rgba(219,195,130,.53)',10);text(`ULT QUEUE ${names.slice(0,23)}`,978,788,14,'#f3e3bc','750')}
 if(phase==='player'&&log){text(log.length>84?log.slice(0,83)+'…':log,730,742,14,'#d7e1ed','550')}
 if(devPanelOpen&&!['victory','defeat'].includes(phase))drawDeveloperPanel();
 if(paused)drawPause();if(phase==='victory'||phase==='defeat')drawResult();
}
function drawPause(){rect(0,0,W,H,'rgba(2,5,15,.68)');rect(366,220,868,443,'#101729f4','#e4cda4',18);text('PAUSED • PARTY LOCKED',800,293,39,'#fff3e9','800','center');text('Testing controls below are NOT approved gameplay mechanics.',800,351,22,'#d6dceb','600','center');addButton(465,420,230,90,'test-ko','DEBUG: K.O.','Knock out non-active ally');addButton(714,420,230,90,'test-revive','DEBUG: REVIVE','Restore same party slot');addButton(964,420,180,90,'unpause','RESUME','');addButton(650,559,300,66,'restart','RESTART BATTLE','')}
function drawResult(){rect(0,0,W,H,'rgba(3,7,15,.72)');rect(310,215,980,460,'rgba(13,21,38,.98)',color.gold,20);text(phase==='victory'?'VICTORY':'DEFEAT',800,317,58,phase==='victory'?'#f7dd9f':'#f29ba4','900','center');text(phase==='victory'?`All ${totalEnemyDefeats} enemies defeated across ${wavePlan.length} waves.`:'All allies have fallen in training.',800,397,27,'#edf2f7','600','center');text(`Turns processed: ${turn}    •    Team: ${party.length}/3`,800,447,20,'#a9bcce','500','center');addButton(389,532,271,90,'restart','REPLAY','Same party');addButton(678,532,271,90,'change-team','TEAM SELECT','Manual formation');addButton(967,532,275,90,'forced-select','SPECIAL TEST','Force team selection')}
function drawSetup(){rect(0,0,W,H,'rgba(4,8,20,.77)');rect(180,74,1240,760,'rgba(13,20,39,.98)','#ccb88e',20);text('TEAM FORMATION',228,133,43,'#ffedd1','850');text(`${draft.length}/3 selected • owned roster • unique members`,231,180,22,'#cfdbeb','550');text(forceSelect?'SPECIAL ENCOUNTER: TEAM SELECTION REQUIRED':'STANDARD ENCOUNTER: LAST TEAM RETAINED',1332,173,17,'#e5ca99','700','right');
 text('BATTLE SLOTS — MOVE TO CHANGE DISPLAY ORDER',240,218,19,'#bad4e9','800');
 for(let i=0;i<3;i++){const x=241+i*377,y=242,w=358,h=249,p=roster(draft[i]);rect(x,y,w,h,p?'#26364feb':'#152138eb',p?'#9eb8d3':'#4c607a',13);text(`SLOT ${i+1}`,x+18,y+26,19,'#e8ca92','800');if(p){text(p.name,x+18,y+69,27,'#f6eefa','800');text(`Lv. ${progressFor(p.id).level} / 50 • HP ${calculateMaxHp(p.hp,progressFor(p.id).level).toLocaleString()} • test base`,x+18,y+103,16,'#c4d6e5','650');text('Position: visual only',x+18,y+135,17,'#d7dce7','500');addButton(x+14,y+180,89,53,`left:${i}`,'←','',i>0);addButton(x+113,y+180,89,53,`right:${i}`,'→','',i<draft.length-1);addButton(x+212,y+180,128,53,`remove:${i}`,'REMOVE','',draft.length>1)}else{text('EMPTY',x+w/2,y+106,34,'#697f95','800','center');text('Add from roster below',x+w/2,y+159,17,'#9ca9b9','550','center')}}
 text('AVAILABLE OWNED ROSTER',240,533,19,'#bad4e9','800');for(let i=0;i<ROSTER.length;i++){const p=ROSTER[i],x=241+i*377,y=554,selected=draft.includes(p.id);rect(x,y,358,116,selected?'#233b4ce9':'#1d2943',selected?'#8fbcad':'#7e97b0',11);text(p.name,x+16,y+30,24,'#f5e9dc','800');text(p.test?'TEST DATA ONLY • NO CHARACTER ASSET':'OWNED • CHARACTER',x+16,y+61,15,'#bdccdd','600');addButton(x+217,y+75,124,33,`add:${p.id}`,selected?'IN TEAM':'ADD','',!selected&&draft.length<3)}
 text(`TEST WAVES: ${(waveOverride||WAVE_PRESETS[wavePreset]).join(' + ')}  •  UP TO 5 ACTIVE`,240,694,18,'#d2ddec','650');text(`TRAINING RECOVERY: ${trainingRecoveryMode==='restore'?'RESTORE FULL HP':'PRESERVE HP'} • GAME MODE TEST`,240,720,14,'#d2ddec','650');addButton(240,742,250,62,'toggle-waves','CHANGE WAVES','');addButton(518,742,494,62,'toggle-recovery','TOGGLE HP RECOVERY MODE',trainingRecoveryMode==='restore'?'CURRENT: RESTORE':'CURRENT: PRESERVE');addButton(1039,733,313,79,'start','START BATTLE','Lock selected party',validTeam(draft))}
function drawHint(t){if(hint&&t-hintAt<2300){rect(474,393,652,76,'rgba(15,21,39,.98)','#e6b98a',12);text(hint,800,431,20,'#fff4e8','700','center')}}
function loop(t){choiceRects=[];ctx.clearRect(0,0,W,H);if(phase!=='setup'){
  const hit=zeroBasicStage(t);ctx.save();if(hit!==null&&hit>=645&&hit<=760){const q=1-(hit-645)/115;ctx.translate(Math.sin(hit*.42)*q*4,Math.cos(hit*.33)*q*2.5)}
  drawCameraStage(t);drawFx(t);ctx.restore();drawHud(t)
 }else{drawCameraStage(t);drawSetup()}drawHint(t);requestAnimationFrame(loop)}
function choose(x,y){for(let i=choiceRects.length-1;i>=0;i--){const b=choiceRects[i];if(x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)continue;if(!b.enabled){say('Action not currently available.');return}const cmd=b.action;if(cmd.startsWith('add:')){addUnit(cmd.slice(4));return}if(cmd.startsWith('left:')){reorderUnit(Number(cmd.slice(5)),-1);return}if(cmd.startsWith('right:')){reorderUnit(Number(cmd.slice(6)),1);return}if(cmd.startsWith('remove:')){removeUnit(Number(cmd.slice(7)));return}if(cmd==='dev-panel-toggle'){devPanelOpen=!devPanelOpen;return}if(cmd.startsWith('enemy-target:')){setEnemyTarget(cmd.slice(13));return}if(cmd.startsWith('camera-select:')){if(phase==='player'&&cameraPreview==='party'){const id=cmd.slice(14),p=party.find(p=>p.id===id);if(supportDemo&&!eligibleAllyTarget(p,supportDemo)){say('Not eligible for this support test.');return}selectedAllyId=id;say((supportDemo?'TARGET TEST: ':'CAMERA TEST: ')+(p?.name||id)+' selected.')}return}if(cmd.startsWith('mode:')){setTargetingMode(cmd.slice(5));return}if(cmd.startsWith('queue-ult:')){queueUltimate(cmd.slice(10));return}if(cmd.startsWith('charge-ult:')){chargeUltimateForTest(cmd.slice(11));return}
 switch(cmd){case 'support-heal':startSupportDemo('heal');break;case 'support-revive':startSupportDemo('revive');break;case 'confirm-support':confirmSupportDemo();break;case 'cancel-support':cancelSupportDemo();break;case 'camera-party':if(phase==='player'&&!paused){cameraPreview=cameraPreview==='party'?null:'party';supportDemo=null;selectedAllyId=activeId}break;case 'camera-target':if(phase==='player'&&!paused){cameraPreview=cameraPreview==='target'?null:'target';selectedAllyId=null;if(cameraPreview==='target')say('Tap an automaton to set the target.')}break;case 'reset-draft':draft=loadTeam();break;case 'toggle-waves':toggleWavePreset();break;case 'toggle-recovery':setTrainingRecoveryMode(trainingRecoveryMode==='restore'?'preserve':'restore');break;case 'start':startBattle();break;case 'restart':replay();break;case 'change-team':enterSelection();break;case 'forced-select':enterSelection(true);break;case 'pause':if(phase!=='player'&&!paused){say('Pause is available on your turn.');return}paused=!paused;break;case 'unpause':paused=false;break;case 'test-ko':testKO();break;case 'test-revive':testRevive();break;case 'skill':zeroSkillControl();break;case 'cap-test':cycleSpCapTest();break;case 'hud-status-test':toggleHudStatusDemo();break;case 'f05-advance':addActionAdvance(activeId,25);break;case 'f05-delay':addActionDelay(activeId,25);break;case 'f05-speed':setSpeedMultiplierForTest(activeId,(speedModifiers[activeId]||1)>=1.3?1:1.3);break;case 'f05-summon-independent':queueSummonForTest('independent');break;case 'f05-summon-controlled':queueSummonForTest('controlled');break;
 case 'progress-test-level':{const a=active();if(a){const cost=requiredExp(a.level),result=testGrantExp(a.id,cost);say(result?`TEST ONLY: level ${result.level}, ${cost} EXP injected.`:'Ascension required or level cap reached.');}break}
 case 'progress-test-ascend':{const a=active();if(a)say(testAscend(a.id)?`TEST ONLY: level ${a.level} ascension unlocked (no materials).`:'Not at a locked ascension gate.');break}
 case 'hp-test-flat':{const a=active();if(a)setHpBonusForTest(a.id,'debug-flat','flat',(a.hpFlatModifiers['debug-flat']||0)+20);break}
 case 'hp-test-percent':{const a=active();if(a)setHpBonusForTest(a.id,'debug-percent','percent',(a.hpPercentModifiers['debug-percent']||0)+.2);break}default:zeroSkillArmed=false;play(cmd)}return}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();choose((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='1')play('basic');if(e.key==='2')zeroSkillControl();if(e.key==='3')play('ultimate');if(e.key.toLowerCase()==='m'&&phase==='player')cycleSpCapTest();if(['q','w','e','f'].includes(e.key.toLowerCase())&&phase==='player')setTargetingMode(({q:'single',w:'aoe',e:'multi',f:'five-hit'})[e.key.toLowerCase()]);if(e.key.toLowerCase()==='v'&&phase==='player'){cameraPreview=cameraPreview==='party'?null:'party';selectedAllyId=activeId}if(e.key.toLowerCase()==='t'&&phase==='player')cameraPreview=cameraPreview==='target'?null:'target';if(e.key.toLowerCase()==='r'&&phase!=='setup')replay()});window.addEventListener('contextmenu',e=>e.preventDefault());
// Read-only instrumentation and explicitly labeled testing helpers for verification.
window.twoToneStatus=()=>({phase,paused,turn,devPanelOpen,targetingMode,zeroSkillArmed,previewTargetMode:previewTargetMode(),supportDemo,attackInProgress,pendingVacancies:[...pendingVacancies],lastAttack:lastAttack?JSON.parse(JSON.stringify(lastAttack)):null,supportTestHistory:supportTestHistory.slice(),previewTargetIds:chooseAttackTargets(previewTargetMode()).map(e=>e.id),enemyCountTotal:wavePlan.reduce((n,w)=>n+w.length,0),selectedEnemyId,actingEnemyId,enemies:enemies.map(e=>({id:e.id,hp:e.hp,maxHp:e.maxHp,x:e.x,y:e.y,slot:e.slot,wave:e.wave,order:e.order,alive:e.hp>0})),wave:{number:waveIndex+1,total:wavePlan.length,sizes:wavePlan.map(w=>w.length),active:enemies.length,reserve:waveQueue.length,defeated:waveKills,totalDefeated:totalEnemyDefeats,cleared:encounterCleared,spawnHistory:spawnHistory.slice()},gauges:{...gauges},party:party.map(p=>({id:p.id,hp:p.hp,maxHp:p.maxHp,energy:p.energy,energyReserved:p.energyReserved||0,availableEnergy:availableEnergy(p),slot:party.indexOf(p)+1,test:p.test})),draft:[...draft],activeId,enemyHp,sp,spMax:effectiveSpMax(),spCapModifiers:{...spCapModifiers},ultimateQueue:ultimateQueue.map(q=>({...q})),ultimateExecuting,ultimateResumePending:!!ultimateResume,ultimateHistory:ultimateHistory.slice(),order:getOrder(5),summonSlotsUsed:summons.filter(s=>!s.pendingCreation).length,summons:summons.map(s=>({...s})),summonHistory:summonHistory.slice(),turnTimeline:turnTimeline.snapshot(),speedModifiers:{...speedModifiers},visibleAllyIds:cameraShot()==='party'?party.map(p=>p.id):[cameraShot()==='enemy-impact'?fx?.target:(activeId||alive()[0]?.id)].filter(Boolean),visibleEnemyIds:cameraShot()==='party'?[]:combatEnemies().map(e=>e.id),camera:{shot:cameraShot(),world:shotWorld(cameraShot()),panX:camera.currentX??0,transition:camera.progress,preview:cameraPreview,selectedAllyId,parallaxRates:[.04,.13,.32,.72,1.18],hudDrawnAfterScene:true},stagePositions:party.map(p=>({id:p.id,position:cameraAllyPosition(p.id,cameraShot()==='party'?'party':'command')}))});
window.twoToneUi=()=>({hudPortraits:party.map(p=>({id:p.id,scale:(phase==='player'&&activeId===p.id&&p.hp>0)?1:.9,energyFill:isUltPending(p.id)?0:Math.max(0,Math.min(1,availableEnergy(p)/ULTIMATE_ENERGY_COST)),statusCount:hudStatusList(p).length})),version:'v0.0.17',debugOpen:devPanelOpen,buttons:choiceRects.map(b=>({...b}))});
window.twoToneProgress=()=>({maxLevel:CHARACTER_MAX_LEVEL,ascensionGates:[...ASCENSION_GATES],recoveryMode:trainingRecoveryMode,
 characters:ROSTER.map(r=>({id:r.id,level:progressFor(r.id).level,exp:progressFor(r.id).exp,ascended:[...progressFor(r.id).ascended],requiredExp:requiredExp(progressFor(r.id).level),baseHpTestOnly:r.hp})),
 unitHP:party.map(p=>({id:p.id,level:p.level,baseHpTestOnly:p.baseHp,maxHp:p.maxHp,currentHp:p.hp,flat:{...p.hpFlatModifiers},percent:{...p.hpPercentModifiers}}))});
window.twoToneTest={testGrantExp,testAscend,setHpBonusForTest,calculateMaxHp,requiredExp,setTrainingRecoveryMode,roundHp,addActionAdvance,addActionDelay,setSpeedMultiplierForTest,queueSummonForTest,turnTimelineSnapshot:()=>turnTimeline.snapshot(),queueUltimate,chargeUltimateForTest,toggleHudStatusDemo,setHudStatusesForTest:(id,items)=>{const p=party.find(p=>p.id===id);if(!p||!Array.isArray(items)||items.length>80)return false;p.hudStatuses=items.map(e=>({kind:e.kind==='debuff'?'debuff':'buff',icon:String(e.icon||'✦').slice(0,2),turns:e.turns===null?null:(Number.isInteger(e.turns)&&e.turns>=0?e.turns:null)}));return true;},setSpCapTestSource,cycleSpCapTest,canQueueUltimate,debugKOForTest:(id)=>{if(['setup','intro','victory','defeat'].includes(phase))return false;const p=party.find(p=>p.id===id);if(!p||p.hp<=0)return false;p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();return true},startBattle,addUnit,removeUnit,reorderUnit,enterSelection,testKO,testRevive,play,replay,zeroSkillControl,setTargetingMode,startSupportDemo,confirmSupportDemo,cancelSupportDemo,eligibleAllyTarget:(id,kind)=>eligibleAllyTarget(party.find(p=>p.id===id),kind),setEnemyHpForTest:(id,hp)=>{if(phase!=='player'||attackInProgress)return false;const e=liveEnemies().find(e=>e.id===id);if(!e||!Number.isFinite(hp)||hp<1||hp>e.maxHp)return false;e.hp=hp;syncEnemyHp();return true},setEnemyTarget,setWavePlanForTest,toggleWavePreset,debugDefeatEnemy:(id)=>{const e=liveEnemies().find(e=>e.id===id);if(!e||phase==='setup'||phase==='victory'||phase==='defeat')return false;e.hp=0;resolveEnemyDefeat(e);return true;},selectEnemy:(id)=>setEnemyTarget(id),setCameraPreview:(view)=>{if(phase==='player'){cameraPreview=view;selectedAllyId=activeId}},cameraStatus:()=>cameraShot()};
window.zeroBasicAnimationDebug=()=>({durationMs:ZERO_BASIC_MS,elapsed:fx?.kind==='basic'&&fx.actor==='zero'?Math.max(0,performance.now()-fx.at):null,active:zeroBasicStage(performance.now())!==null,assets:['zero','zeroBasicWindup','zeroBasicSlash'].map(id=>({id,loaded:!!images[id]?.complete&&!!images[id]?.naturalWidth}))});
requestAnimationFrame(loop);
