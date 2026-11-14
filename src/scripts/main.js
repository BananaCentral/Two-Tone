'use strict';
const sources={arena:'/assets/embedded-image-01.png',zero:'/assets/soul-battle.png',lily:'/assets/lily-front.png',lilyFront:'/assets/lily-front.png',lilyBack:'/assets/lily-back.png',dawnBattle:'/assets/dawn-battle.png',dawnFront:'/assets/dawn-front.png',enemy:'/assets/embedded-image-03.png',slimeBattle:'/assets/slime.png',wolfBattle:'/assets/wolf.png',wolfArtwork:'/assets/wolf-artwork.png',slimeArtwork:'/assets/slime-artwork.jpg',portrait:'/assets/embedded-image-04.png',zeroFront:'/assets/soul-portrait.png',architectureLayer:'/assets/embedded-image-06.png',floorLayer:'/assets/embedded-image-07.png',treeLayer:'/assets/embedded-image-08.png'};

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
   const ordered=Array.from(this.states.values()).map(s=>({s,time:Math.max(this.clock,first.has(s.id)?this.clock:this.nominalAt(s,indexes.get(s.id)-s.credit))}))
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
const visibleSpriteBounds=new WeakMap();
function spriteAlphaBounds(img){
 if(visibleSpriteBounds.has(img))return visibleSpriteBounds.get(img);
 const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
 const c=canvas.getContext('2d',{willReadFrequently:true});let bounds={x:0,y:0,w:img.naturalWidth,h:img.naturalHeight};
 try{c.drawImage(img,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>16){if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y}
  if(right>=left&&bottom>=top)bounds={x:left,y:top,w:right-left+1,h:bottom-top+1};
 }catch(e){}
 visibleSpriteBounds.set(img,bounds);return bounds;
}
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d',{alpha:false});
const W=1600,H=900, TEAM_KEY='two-tone-demo-team-fundamental-1-v1';
const PROGRESSION_KEY='two-tone-character-progress-v1',VITALS_KEY='two-tone-character-vitals-v1',LOADOUT_KEY='two-tone-character-loadouts-v1';
const CHARACTER_MAX_LEVEL=50,ASCENSION_GATES=[10,20,30,40],MAX_PARTY_SIZE=4;
// Rank progression is not implemented yet; this value is the account Rank hook.
let playerRank=1;
// Numerical Base HP values are inherited/development-only combat fixtures, NOT
// approved per-character stats. The unnamed units remain developer test slots.
const ROSTER=[
 {id:'zero',name:'SOUL',label:'Character',hp:100,basePhysicalAttack:20,baseMagicalAttack:20,basePhysicalDefense:4,baseMagicalDefense:4,speed:20,art:'zero',test:false},
 {id:'lily',name:'LILY',label:'Character',hp:100,basePhysicalAttack:0,baseMagicalAttack:30,basePhysicalDefense:4,baseMagicalDefense:4,speed:30,art:'lily',test:false},
 {id:'dawn',name:'DAWN',label:'Character',hp:50,basePhysicalAttack:0,baseMagicalAttack:40,basePhysicalDefense:2,baseMagicalDefense:6,speed:30,art:'dawn',test:false},
];
const ROSTER_IDS=new Set(ROSTER.map(u=>u.id));
function roundHp(value){return Math.floor(value+0.5)}
function calculateLevelScaledStat(base,level,flat={},percent={},equipmentFlat={}){
 if(!Number.isFinite(base)||base<0||!Number.isInteger(level)||level<1||level>CHARACTER_MAX_LEVEL)return null;
 const flats=Object.values(flat),percents=Object.values(percent),equipment=Object.values(equipmentFlat);
 if([...flats,...percents,...equipment].some(v=>!Number.isFinite(v)))return null;
 const raw=((base+flats.reduce((a,b)=>a+b,0))*level+equipment.reduce((a,b)=>a+b,0))*(1+percents.reduce((a,b)=>a+b,0));
 return raw>=0&&Number.isFinite(raw)?roundHp(raw):null;
}
function calculatePhysicalAttack(unit){
 if(!unit||!Number.isFinite(unit.basePhysicalAttack))return null;
 return calculateLevelScaledStat(unit.basePhysicalAttack,unit.level,unit.physicalAttackFlatModifiers||{},{...(unit.physicalAttackPercentModifiers||{}),dawnTune:unit.tune?.attackBonus||0},unit.physicalAttackEquipmentFlatModifiers||{});
}
function calculateMagicalAttack(unit){
 if(!unit||!Number.isFinite(unit.baseMagicalAttack))return null;
 return calculateLevelScaledStat(unit.baseMagicalAttack,unit.level,unit.magicalAttackFlatModifiers||{},{...(unit.magicalAttackPercentModifiers||{}),dawnTune:unit.tune?.attackBonus||0},unit.magicalAttackEquipmentFlatModifiers||{});
}
function calculatePhysicalDefense(unit){
 if(!unit||!Number.isFinite(unit.basePhysicalDefense))return null;
 return calculateLevelScaledStat(unit.basePhysicalDefense,unit.level,unit.physicalDefenseFlatModifiers||{},unit.physicalDefensePercentModifiers||{},unit.physicalDefenseEquipmentFlatModifiers||{});
}
function calculateMagicalDefense(unit){
 if(!unit||!Number.isFinite(unit.baseMagicalDefense))return null;
 return calculateLevelScaledStat(unit.baseMagicalDefense,unit.level,unit.magicalDefenseFlatModifiers||{},unit.magicalDefensePercentModifiers||{},unit.magicalDefenseEquipmentFlatModifiers||{});
}
function calculateTrueAttack(unit){
 const physical=calculatePhysicalAttack(unit),magical=calculateMagicalAttack(unit);
 return physical===null||magical===null?null:(physical+magical)*.5;
}
function calculateTrueDefense(unit){
 const physical=calculatePhysicalDefense(unit),magical=calculateMagicalDefense(unit);
 return physical===null||magical===null?null:(physical+magical)*.5;
}
function calculateTrueDamageReduction(attacker,target){
 const physicalAttack=calculatePhysicalAttack(attacker),magicalAttack=calculateMagicalAttack(attacker);
 const defenseIgnore=Math.min(1,Math.max(0,Number.isFinite(attacker?.tune?.defenseIgnore)?attacker.tune.defenseIgnore:0));
 const physicalDefense=calculatePhysicalDefense(target)*(1-defenseIgnore),magicalDefense=calculateMagicalDefense(target)*(1-defenseIgnore);
 if(!Number.isFinite(physicalAttack)||physicalAttack<0||!Number.isFinite(magicalAttack)||magicalAttack<0||!Number.isFinite(physicalDefense)||physicalDefense<0||!Number.isFinite(magicalDefense)||magicalDefense<0)return null;
 const physicalContribution=physicalAttack>0 ? 0.5*Math.min(physicalDefense/physicalAttack,1) : 0;
 const magicalContribution=magicalAttack>0 ? 0.5*Math.min(magicalDefense/magicalAttack,1) : 0;
 return physicalContribution+magicalContribution;
}
function calculateDamageAfterDefense(damageBeforeDefense,attack,defense){
 if(!Number.isFinite(damageBeforeDefense)||damageBeforeDefense<0||!Number.isFinite(attack)||attack<=0||!Number.isFinite(defense)||defense<0)return null;
 const reduction=Math.min(defense/attack,1);
 return roundHp(damageBeforeDefense*(1-reduction));
}
function calculatePhysicalDamageAfterDefense(damageBeforeDefense,attacker,target){
 return calculateDamageAfterDefense(damageBeforeDefense,calculatePhysicalAttack(attacker),calculatePhysicalDefense(target));
}
function calculateMagicalDamageAfterDefense(damageBeforeDefense,attacker,target){
 return calculateDamageAfterDefense(damageBeforeDefense,calculateMagicalAttack(attacker),calculateMagicalDefense(target));
}
function calculateTrueDamageAfterDefense(damageBeforeDefense,attacker,target){
 const attack=calculateTrueAttack(attacker),reduction=calculateTrueDamageReduction(attacker,target);
 if(!Number.isFinite(damageBeforeDefense)||damageBeforeDefense<0||!Number.isFinite(attack)||attack<=0||!Number.isFinite(reduction))return null;
 return roundHp(damageBeforeDefense*(1-reduction));
}
function calculateTypedActionDamage(type,attackRate,attacker,target){
 if(!['physical','magical','true'].includes(type)||!Number.isFinite(attackRate)||attackRate<0)return null;
 const attack=type==='physical'?calculatePhysicalAttack(attacker):type==='magical'?calculateMagicalAttack(attacker):calculateTrueAttack(attacker);
 const defense=type==='physical'?calculatePhysicalDefense(target):type==='magical'?calculateMagicalDefense(target):calculateTrueDefense(target);
 const defenseIgnore=Math.min(1,Math.max(0,Number.isFinite(attacker?.tune?.defenseIgnore)?attacker.tune.defenseIgnore:0));
 let reduction=type==='true'?calculateTrueDamageReduction(attacker,target):(Number.isFinite(attack)&&attack>0&&Number.isFinite(defense)&&defense>=0?Math.min(defense*(1-defenseIgnore)/attack,1):null);
 if(target?.marks?.some(m=>m.id==='exposed'))reduction=Math.max(0,reduction*Math.pow(.9,target.marks.filter(m=>m.id==='exposed').length));
 if(!Number.isFinite(attack)||attack<=0||!Number.isFinite(defense)||defense<0||!Number.isFinite(reduction))return null;
 const damageBeforeDefense=attack*attackRate;
 return {type,attackBasis:attack,defenseBasis:defense*(1-defenseIgnore),attackRate,damageBeforeDefense,reduction,damageTaken:roundHp(damageBeforeDefense*(1-reduction))};
}
function criticalRateOf(unit){return Math.min(1,Math.max(0,(Number.isFinite(unit?.criticalRate)?unit.criticalRate:.1)+(Number.isFinite(unit?.criticalRateBonus)?unit.criticalRateBonus:0)+(unit?.tune?.criticalRateBonus||0)+Object.values(unit?.criticalRateModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0)))}
function criticalDamageOf(unit){return Math.max(0,(Number.isFinite(unit?.criticalDamage)?unit.criticalDamage:.5)+(Number.isFinite(unit?.criticalDamageBonus)?unit.criticalDamageBonus:0)+(unit?.tune?.criticalDamageBonus||0)+Object.values(unit?.criticalDamageModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0))}
function characterLevelCap(rank=playerRank){return Number.isInteger(rank)&&rank>=1&&rank<=50?Math.ceil(rank/10)*10:0}
function requiredExp(level){return Number.isInteger(level)&&level>=1&&level<CHARACTER_MAX_LEVEL?level*(10*(1+Math.floor(level/5))):0}
function defaultProgress(){return {level:1,exp:0,ascended:[]}}
function validateProgress(value,cap=characterLevelCap()){
 if(!value||!Number.isInteger(value.level)||value.level<1||value.level>cap||
    !Number.isInteger(value.exp)||value.exp<0||!Array.isArray(value.ascended))return false;
 const completed=value.ascended;
 if(completed.some(g=>!ASCENSION_GATES.includes(g))||new Set(completed).size!==completed.length)return false;
 for(const g of ASCENSION_GATES)if(value.level>g&&!completed.includes(g))return false;
 if(value.level===cap||ASCENSION_GATES.includes(value.level)&&!completed.includes(value.level))return true;
 return value.exp<requiredExp(value.level);
}
function legacyRequiredExp(level){return Number.isInteger(level)&&level>=1&&level<CHARACTER_MAX_LEVEL?100*(1+Math.floor((level-1)/5)):0}
function validateLegacyProgress(value){
 if(!value||!Number.isInteger(value.level)||value.level<1||value.level>CHARACTER_MAX_LEVEL||
    !Number.isInteger(value.exp)||value.exp<0||!Array.isArray(value.ascended))return false;
 const completed=value.ascended;
 if(completed.some(g=>!ASCENSION_GATES.includes(g)||g>value.level)||new Set(completed).size!==completed.length)return false;
 for(const g of ASCENSION_GATES)if(value.level>g&&!completed.includes(g))return false;
 if(value.level===CHARACTER_MAX_LEVEL)return value.exp===0;
 if(ASCENSION_GATES.includes(value.level)&&!completed.includes(value.level))return value.exp===0;
 return value.exp<legacyRequiredExp(value.level);
}
function settleCharacterProgress(progress,cap=characterLevelCap()){
 let levelsGained=0;
 while(progress.level<cap){
  if(ASCENSION_GATES.includes(progress.level)&&!progress.ascended.includes(progress.level))break;
  const needed=requiredExp(progress.level);if(progress.exp<needed)break;
  progress.exp-=needed;progress.level++;levelsGained++;
 }
 return levelsGained;
}
function loadProgress(){
 let stored={};try{stored=JSON.parse(localStorage.getItem(PROGRESSION_KEY)||'{}')||{}}catch(e){}
 const data={},cap=characterLevelCap();for(const r of ROSTER){const p=stored[r.id];
  if(validateProgress(p,cap))data[r.id]={level:p.level,exp:p.exp,ascended:[...p.ascended]};
  else if(validateLegacyProgress(p)){
   const level=Math.min(p.level,cap),ascended=[...p.ascended];let exp=0;
   if(p.level<=cap){const oldNeed=legacyRequiredExp(p.level),newNeed=requiredExp(p.level);exp=oldNeed?Math.floor(p.exp*newNeed/oldNeed):0;}
   else{
    for(let l=cap;l<p.level;l++)exp+=requiredExp(l);
    const oldNeed=legacyRequiredExp(p.level),newNeed=requiredExp(p.level);if(oldNeed)exp+=Math.floor(p.exp*newNeed/oldNeed);
   }
   data[r.id]={level,exp,ascended};
  }else data[r.id]=defaultProgress();
  settleCharacterProgress(data[r.id],cap);
 }return data;
}
let characterProgress=loadProgress();
function progressFor(id){return characterProgress[id]||null}
function saveProgress(){try{localStorage.setItem(PROGRESSION_KEY,JSON.stringify(characterProgress))}catch(e){}}
// Resource items/quantities are not approved yet. This debug injection never
// models inventory consumption. Production Character XP sources are not defined.
function grantCharacterXp(id,amount){
 const current=progressFor(id),cap=characterLevelCap();if(!current||!Number.isSafeInteger(amount)||amount<=0||current.level>=cap)return false;
 const temp={level:current.level,exp:current.exp,ascended:[...current.ascended]};
 if(!Number.isSafeInteger(temp.exp+amount))return false;temp.exp+=amount;settleCharacterProgress(temp,cap);
 if(!validateProgress(temp,cap))return false;
 const before=current.level;characterProgress[id]=temp;saveProgress();
 const actor=party.find(p=>p.id===id);
 if(actor){actor.level=temp.level;if(before!==temp.level)recomputeUnitMaxHp(actor);}
 return {level:temp.level,exp:temp.exp,levelsGained:temp.level-before,nextExp:requiredExp(temp.level)};
}
function testGrantExp(id,amount){return grantCharacterXp(id,amount)}
function testAscend(id){
 const p=progressFor(id);if(!p||!ASCENSION_GATES.includes(p.level)||p.ascended.includes(p.level))return false;
 p.ascended.push(p.level);settleCharacterProgress(p);saveProgress();
 const actor=party.find(x=>x.id===id);if(actor){actor.level=p.level;recomputeUnitMaxHp(actor)}
 return true;
}
function setPlayerRankForTest(rank){
 if(!Number.isInteger(rank)||rank<playerRank||rank>50)return false;
 playerRank=rank;const cap=characterLevelCap();
 for(const [id,p] of Object.entries(characterProgress)){
  const before=p.level;settleCharacterProgress(p,cap);
  const actor=party.find(x=>x.id===id);if(actor){actor.level=p.level;if(before!==p.level)recomputeUnitMaxHp(actor)}
 }
 saveProgress();return true;
}
function hpModifiers(unit){return {flat:unit.hpFlatModifiers||{},percent:unit.hpPercentModifiers||{}}}
function calculateMaxHp(baseHp,level,flat={},percent={},equipmentFlat={}){
 if(!Number.isFinite(baseHp)||baseHp<=0)return null;
 const max=calculateLevelScaledStat(baseHp,level,flat,percent,equipmentFlat);
 return max!==null&&max>=1?max:null;
}
function recomputeUnitMaxHp(unit){
 const max=calculateMaxHp(unit.baseHp,unit.level,unit.hpFlatModifiers,unit.hpPercentModifiers,unit.hpEquipmentFlatModifiers);
 if(max===null)return false;
 const oldMax=unit.maxHp||max, oldHp=unit.hp;
 // Preserve the current HP ratio, including values above the old Max HP.
 unit.maxHp=max;unit.hp=oldHp<=0?0:Math.max(0,roundHp(max*(oldHp/oldMax)));
 saveVitals();return true;
}
function healCharacterHp(unit,amount,{allowOverMax=false}={}){
 if(!unit||unit.hp<=0||!Number.isFinite(amount)||amount<=0)return false;
 if(!allowOverMax&&unit.hp>unit.maxHp)return false;
 unit.hp=allowOverMax?unit.hp+amount:Math.min(unit.maxHp,unit.hp+amount);
 saveVitals();return true;
}
function setHpBonusForTest(id,source,kind,value){
 const p=party.find(u=>u.id===id);if(!p||!source||!Number.isFinite(value)||!['flat','percent'].includes(kind))return false;
 const key=kind==='flat'?'hpFlatModifiers':'hpPercentModifiers',next={...p[key],[source]:value};
 const max=calculateMaxHp(p.baseHp,p.level,kind==='flat'?next:p.hpFlatModifiers,kind==='percent'?next:p.hpPercentModifiers,p.hpEquipmentFlatModifiers);
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
 const modifiers=loadoutStatModifiers(id,progress.level);
 const maxHp=calculateMaxHp(model.hp,progress.level,modifiers.hpFlatModifiers,modifiers.hpPercentModifiers,modifiers.hpEquipmentFlatModifiers);if(maxHp===null)return null;
 const saved=savedVitals[id];const restore=trainingRecoveryMode==='restore'||!saved;
 const savedMax=Number.isFinite(saved?.maxHp)&&saved.maxHp>0?saved.maxHp:maxHp;
 const savedHp=Number.isFinite(saved?.hp)?saved.hp:maxHp;
 const hp=restore?maxHp:savedHp<=0?0:Math.max(0,roundHp(maxHp*(savedHp/savedMax)));
 return {...model,baseHp:model.hp,level:progress.level,hp,maxHp,...modifiers,energy:20,energyReserved:0};
}

const turnTimeline=new TwoToneTurnTimeline();
let speedModifiers=Object.create(null),summons=[],summonSerial=0,summonHistory=[];
function calculateSpeed(unit){
 if(!unit)return null;
 const base=Number.isFinite(unit.baseSpeed)?unit.baseSpeed:unit.speed;
 if(!Number.isFinite(base))return null;
 const effectMultiplier=speedModifiers[unit.id]||1;
 return calculateLevelScaledStat(base,Number.isInteger(unit.level)?unit.level:1,
  {...(unit.speedFlatModifiers||{})},
  {...(unit.speedPercentModifiers||{}),temporarySpeedEffect:effectMultiplier-1},unit.speedEquipmentFlatModifiers||{});
}
function speedOf(unit){return Math.max(1,calculateSpeed(unit)||1)}
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
 const enemy=enemies.find(e=>e.id===id);if(enemy&&enemy.brokenTurns>0)return false;
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
 const source={serial:++attackSerial,actor:'lily',action:'summon',hits:[]};
 for(const enemy of liveEnemies().slice()){
  const lily=party.find(p=>p.id==='lily'),raw=calculateTypedActionDamage('true',1,lily,enemy),dealt=applyEnemyDamage(enemy,raw?.damageTaken||0,lily);
  source.hits.push({target:enemy.id,damage:dealt.damage,summon:true});if(enemy.hp<=0)resolveEnemyDefeat(enemy);
  else{enemy.marks=enemy.marks||[];const dup=characterDuplicateRank('lily'),existing=enemy.marks.filter(m=>m.id==='exposed').length;enemy.marks=enemy.marks.filter(m=>m.id!=='exposed');for(let i=0;i<(dup>=2?Math.min(2,existing+1):1);i++)enemy.marks.push({id:'exposed',turns:dup>=2?3:2});applyLilyUltimateDebuff(enemy);triggerRicochet(source,enemy,dealt.damage);if(lily&&loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned)lily.energy=Math.min(120,lily.energy+5)}
 }
 log=`${s.name} haunts all enemies with True damage.`;
 schedule(()=>{if(s.remaining<=0){summons=summons.filter(x=>x.id!==s.id);turnTimeline.states.delete(s.id);summonHistory.push({event:'expired',id:s.id})}
  drainUltimateQueueBefore(()=>nextTurn());},550);
}

const color={ink:'#0a101f',panel:'rgba(13,17,35,.94)',gold:'#eacb87',white:'#f7f3f8',sub:'#bfc8d9',blue:'#85d9ff',red:'#f47679',green:'#5bebac'};
let phase='menu',paused=false,turn=0,enemyHp=0,maxEnemyHp=0,sp=3,
    gauges={},party=[],activeId=null,fx=null,log='',hint='',hintAt=0,
    choiceRects=[],battleToken=0,enemyCount=0,forceSelect=false;
// Four authored party formation positions. Enemy identities and wave queues are independent of these slots.
// Encounter presets and enemy stats below are DEMO DATA; Approved Fundamental 2 defines the rules.
const ENEMY_CATEGORIES=Object.freeze(['common','elite','boss']);
function validateEnemyCategory(category){
 if(!ENEMY_CATEGORIES.includes(category))throw Error(`Enemy category must be one of: ${ENEMY_CATEGORIES.join(', ')}`);
 return category;
}
const ENEMY_FORMATIONS=[
 {id:'slot1',x:646,y:359,w:151,h:198},
 {id:'slot2',x:822,y:314,w:156,h:205},
 {id:'slot3',x:1010,y:274,w:167,h:220},
 {id:'slot4',x:1201,y:312,w:156,h:205},
 {id:'slot5',x:1389,y:355,w:151,h:198},
];
const ENEMY_ARCHETYPES={
 slime:{id:'slime',category:'common',name:'SLIME',level:1,hp:100,basePhysicalAttack:0,baseMagicalAttack:20,basePhysicalDefense:4,baseMagicalDefense:8,speed:20,battleSprite:'slimeBattle',battleAspectRatio:'1:1',artwork:'slimeArtwork',passive:{id:'slimy',every:3,damageBonus:.25},basicAttack:{damageType:'magical',multiplier:1.0}},
 wolf:{id:'wolf',category:'common',name:'WOLF',level:1,hp:100,basePhysicalAttack:40,baseMagicalAttack:0,basePhysicalDefense:2,baseMagicalDefense:2,speed:40,battleSprite:'wolfBattle',battleAspectRatio:'1:1',artwork:'wolfArtwork',passive:{id:'rampage',damageBonus:.25,maxStacks:4},basicAttack:{damageType:'physical',multiplier:1.0}}
};
// Any encounter may supply its own finite number of waves, each with 1–15 enemies.
// Presets are only review scenarios; they are NOT a global wave-count limit.
const WAVE_PRESETS={stress:[15,12,6],quick:[1,5,6],sizes:[1,5,6,12,15]};
let wavePreset='stress',waveOverride=null,enemyRosterMode='mixed',wavePlan=[],waveIndex=-1,waveQueue=[],waveKills=0,
    totalEnemyDefeats=0,encounterCleared=false,spawnHistory=[],enemies=[],selectedEnemyId=null,actingEnemyId=null;
// Fundamental 3 target rules and Fundamental 2 v1.1 post-attack reinforcement boundary.
// Soul Enhanced Basic uses Blast unless Premium Weapon Duplicate 3 changes it to AoE; Ultimate is AoE. The pattern toolbar,
// 5-hit and support actions remain development-only controls. Damage/cost values are provisional.
let targetingMode='single',pendingTargetAction=null,supportDemo=null,zeroSkillArmed=false,attackInProgress=false,attackSerial=0,
     pendingVacancies=[],lastAttack=null,supportTestHistory=[],soulEnhanceStacks=0,soulFollowUpProcs=5,soulFollowUpSources=new Set(),soulEnhanceSpendingRemainder=0,soulFollowUpActivationCount=0;
// Fundamental 4. Numerical energy costs and debug bonuses are inherited/provisional,
// not character-balancing approvals. No gameplay source grants an SP-cap bonus by default.
const ULTIMATE_ENERGY_COST=100,BASE_SP_MAX=5;
const SP_CAP_SOURCES=new Set(['passive','skill','ultimate','character-potential','signature-premium-weapon-effect','premium-weapon-potential','other-combat-effect']);
let spCapModifiers=Object.create(null),ultimateQueue=[],ultimateSequence=0,ultimateHistory=[],
    ultimateResume=null,ultimateExecuting=false;
function effectiveSpMax(){return Math.max(0,BASE_SP_MAX+Object.values(spCapModifiers).reduce((a,b)=>a+b,0))}
// Modifier IDs are unique per effect so separate increases stack, even when
// they share a category. Updating or removing a modifier never clamps current SP.
function setSpCapModifier(sourceId,amount){
 if(typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>128||!Number.isSafeInteger(amount))return false;
 if(amount)spCapModifiers[sourceId]=amount;else delete spCapModifiers[sourceId];
 return true;
}
function gainSp(amount,{allowOvercap=false}={}){
 if(!Number.isSafeInteger(amount)||amount<0)return false;
 if(allowOvercap){sp+=amount;return true}
 const cap=effectiveSpMax();
 // Ordinary gains cannot add above cap, but preserve SP already above a lowered cap.
 if(sp>=cap)return true;
 sp=Math.min(cap,sp+amount);return true;
}
function availableEnergy(p){return p?Math.max(0,p.energy-(p.energyReserved||0)):0}
function isUltPending(id){return ultimateQueue.some(q=>q.actorId===id)||(ultimateExecuting&&lastAttack?.action==='ultimate'&&lastAttack.actor===id)}
function canQueueUltimate(p){return !!p&&p.hp>0&&!paused&&['player','enemy','resolve'].includes(phase)
  &&availableEnergy(p)>=ULTIMATE_ENERGY_COST&&!isUltPending(p.id)}
function resetActionResources(){const resourceful=party.some(p=>p.id==='dawn');sp=resourceful?5:3;soulEnhanceStacks=0;soulFollowUpProcs=soulFollowUpLimit();soulFollowUpSources=new Set();soulEnhanceSpendingRemainder=0;soulFollowUpActivationCount=0;spCapModifiers=Object.create(null);if(resourceful)setSpCapModifier('dawn-resourceful',2);ultimateQueue=[];ultimateSequence=0;ultimateHistory=[];ultimateResume=null;ultimateExecuting=false;
  for(const p of party)p.energyReserved=0;}
function setSpCapTestSource(source,bonus){
 if(!SP_CAP_SOURCES.has(source)||!Number.isInteger(bonus)||bonus<0||bonus>20)return false;
 if(!setSpCapModifier(source,bonus))return false;
 // This preview exposes only nonnegative TEST boosts. General gameplay effects
 // use setSpCapModifier with a unique source ID and may raise or lower the cap.
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
function queueUltimate(id,allyTargetId=null){
 const p=party.find(p=>p.id===id);
 if(!canQueueUltimate(p)){say(!p?'Unknown ally.':p.hp<=0?'Defeated ally cannot Ult.':isUltPending(id)?'Ultimate already queued.':'Ultimate needs '+ULTIMATE_ENERGY_COST+' available energy.');return false}
 const q={actorId:id,cost:ULTIMATE_ENERGY_COST,seq:++ultimateSequence,requestedTurn:turn,allyTargetId};
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
  if(p.id==='dawn'&&!party.some(ally=>ally.id===q.allyTargetId&&ally.hp>0)){p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);ultimateHistory.push({event:'canceled-ally-target-ko',actor:q.actorId,target:q.allyTargetId,seq:q.seq});log='Dawn’s Ultimate canceled because its target was defeated; Energy released.';return runNextUltimate()}
  p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);p.energy=Math.max(0,p.energy-q.cost);
  ultimateHistory.push({event:'started',actor:q.actorId,seq:q.seq,energy:p.energy,turn});
  ultimateExecuting=true;
  // Same provisional Ultimate attack effect from v0.8. This is a testing
  // placeholder, not a canonical Ultimate definition or approved balance.
  if(!executeCombatAction(p,'ultimate',q.seq,q.allyTargetId)){
   ultimateExecuting=false;ultimateHistory.push({event:'canceled-no-target',actor:q.actorId,seq:q.seq});return runNextUltimate();
  }
  return;
 }
 ultimateExecuting=false;
 const resume=ultimateResume;ultimateResume=null;
 if(resume)resume();
}

function eligibleAllyTarget(p,kind){return !!p&&(kind==='revive'?p.hp<=0:kind==='heal'?p.hp>0&&p.hp<=p.maxHp:p.hp>0)}
function chooseAttackTargets(mode=targetingMode,primary=chosenEnemy()){
 const live=liveEnemies();if(mode==='aoe')return live.slice();if(!primary)return [];
 if(mode==='blast')return live.filter(e=>Math.abs(e.slot-primary.slot)<=1);
 return [primary];
}
function closestSurvivingEnemy(slot){return liveEnemies().slice().sort((a,b)=>Math.abs(a.slot-slot)-Math.abs(b.slot-slot)||a.slot-b.slot)[0]||null}
// Soul's Basic becomes Blast at three Enhance stacks; the Ultimate is AoE.
function actionTargetMode(actor,action){if((actor?.id==='zero'&&action==='ultimate')||(actor?.id==='lily'&&(action==='skill'||action==='ultimate')))return 'aoe';if(actor?.id==='zero'&&action==='basic')return soulEnhancedBasicTargetMode(soulEnhanceStacks);return actor?.id==='zero'&&action==='skill'?'blast':targetingMode}
function previewTargetMode(){if(pendingTargetAction){const actor=party.find(p=>p.id===pendingTargetAction.actorId);return actionTargetMode(actor,pendingTargetAction.action)}return targetingMode}
function beginDawnAllyTargetSelection(action,actorId){
 const actor=party.find(p=>p.id===actorId);if(!actor||actor.id!=='dawn')return false;
 if(action==='ultimate'&&!canQueueUltimate(actor)){say(actor.hp<=0?'Defeated ally cannot use an Ultimate.':'Ultimate needs '+ULTIMATE_ENERGY_COST+' available Energy.');return false}
 if(action==='skill'&&sp<1){say('Tune needs 1 Skill Point.');return false}
 pendingTargetAction={action,actorId,targetSide:'ally'};cameraPreview='party';supportDemo=null;selectedAllyId=party.find(p=>p.hp>0&&p.id!==actorId)?.id||actorId;
 say(`Select a living ally for Dawn's ${action==='skill'?'Tune':'Ultimate'}.`);return true;
}
function beginTargetSelection(action,actorId=activeId){
 const actor=party.find(p=>p.id===actorId);if(!actor||actor.hp<=0)return false;
 if(actor.id==='dawn'&&(action==='skill'||action==='ultimate'))return beginDawnAllyTargetSelection(action,actorId);
 if(action==='ultimate'&&!canQueueUltimate(actor)){say(actor.hp<=0?'Defeated ally cannot use an Ultimate.':'Ultimate needs '+ULTIMATE_ENERGY_COST+' available Energy.');return false}
 if(pendingTargetAction?.action===action&&pendingTargetAction.actorId===actorId){pendingTargetAction=null;cameraPreview=null;if(action==='ultimate')return queueUltimate(actorId);return executeCombatAction(actor,action)}
 if(action==='ultimate'&&actionTargetMode(actor,action)==='aoe'){pendingTargetAction=null;cameraPreview=null;return queueUltimate(actorId)}
 pendingTargetAction={action,actorId};cameraPreview='target';supportDemo=null;selectedAllyId=null;
 say(`Select an enemy for ${actor.name}'s ${action.toUpperCase()}. Press the ability again to use the selected target, or choose another action to switch.`);return true;
}
function cancelTargetSelection(){if(!pendingTargetAction)return false;pendingTargetAction=null;cameraPreview=null;say('Target selection canceled.');return true}
function setTargetingMode(mode){if(!['single','blast','aoe','five-hit'].includes(mode)||phase!=='player'||paused)return false;targetingMode=mode;zeroSkillArmed=false;supportDemo=null;cameraPreview='target';return true}
function zeroSkillControl(){return activateSoulEnhance();}
function activateSoulEnhance(){
 const a=active();if(phase!=='player'||paused||!a||a.id!=='zero'){say('Enhance is available on Soul’s turn.');return false}
 if(sp<1){say('Soul Enhance needs 1 Skill Point.');return false}
 sp--;soulEnhanceStacks++;let refunded=false;
 if(loadoutFor('zero').weapon.selected==='premium'&&loadoutFor('zero').weapon.premiumOwned){soulEnhanceSpendingRemainder++;if(soulEnhanceSpendingRemainder>=3){soulEnhanceSpendingRemainder-=3;gainSp(1);refunded=true}}
 zeroSkillArmed=false;pendingTargetAction=null;cameraPreview=null;
 log='SOUL ENHANCE: '+soulEnhanceStacks+' Skill Point(s) banked for the next Basic Attack.'+(refunded?' Standard signature weapon restored 1 Skill Point.':'');return true;
}
function startSupportDemo(kind){
 if(phase!=='player'||paused||!['heal','revive'].includes(kind))return false;
 const eligible=party.filter(p=>eligibleAllyTarget(p,kind));
 if(!eligible.length){say(kind==='revive'?'No defeated ally to revive.':'No eligible ally to heal.');return false}
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
 if(kind==='heal')healCharacterHp(p,160);
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
  const isWolf=enemyRosterMode==='wolf'||(enemyRosterMode==='mixed'&&(wi+i)%2===0);const model=ENEMY_ARCHETYPES[isWolf?'wolf':'slime'];return {id:`wave${wi+1}-enemy${i+1}`,archetypeId:model.id,name:model.name,
   wave:wi+1,order:i+1,category:validateEnemyCategory(model.category),level:model.level,maxHp:model.hp,speed:model.speed,
   basePhysicalAttack:model.basePhysicalAttack,baseMagicalAttack:model.baseMagicalAttack,
   basePhysicalDefense:model.basePhysicalDefense,baseMagicalDefense:model.baseMagicalDefense,
   battleSprite:model.battleSprite,battleAspectRatio:model.battleAspectRatio,artwork:model.artwork,barrierPercent:model.barrierPercent??.2,passive:{...model.passive},basicAttack:{...model.basicAttack},basicAttackCount:0,rampageStacks:0};
 }));
}
function initialSlots(count){return ({1:[2],2:[1,3],3:[1,2,3],4:[0,1,3,4],5:[0,1,2,3,4]})[count].slice()}
function enterEnemy(slot){
 if(!waveQueue.length||enemies.some(e=>e.slot===slot)||enemies.length>=5)return null;
 const incoming=waveQueue.shift(),formation=ENEMY_FORMATIONS[slot];
 const barrier=roundHp(incoming.maxHp*incoming.barrierPercent);
 const e={...incoming,slot,x:formation.x,y:formation.y,w:formation.w,h:formation.h,hp:incoming.maxHp,maxBarrier:barrier,barrier,brokenTurns:0,debuffs:[],marks:[]};
 if(premiumWeaponDuplicateRank('lily')>=1&&party.some(p=>p.id==='lily'))e.marks.push({id:'soul-mark',turns:2},{id:'ricochet',turns:2,sources:[]});
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
 const source=party.find(p=>p.id===lastAttack.actor)||summons.find(s=>s.id===lastAttack.actor)||null;
 const dealt=applyEnemyDamage(enemy,damage,source);
 if((lastAttack.actor!=='lily'||lastAttack.action==='summon')&&enemy.marks?.some(m=>m.id==='exposed')&&premiumWeaponDuplicateRank('lily')>=0){const lily=party.find(p=>p.id==='lily');if(lily&&loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned)lily.energy=Math.min(120,lily.energy+5)}
 lastAttack.hits.push({index:hitNumber,target:enemy.id,slot:enemy.slot,damage:dealt.damage+dealt.breakDamage,hpAfter:enemy.hp,barrierDamage:dealt.barrierDamage,breakDamage:dealt.breakDamage,barrierAfter:enemy.barrier,broken:dealt.broken,critical:dealt.critical,criticalMultiplier:dealt.criticalMultiplier});
 if(lastAttack.actor==='lily'&&(lastAttack.action==='skill'||lastAttack.action==='ultimate')){
  enemy.marks=enemy.marks||[];const dup=characterDuplicateRank('lily');
  if(dup>=2){const stacks=Math.min(2,(enemy.marks.filter(m=>m.id==='exposed').length||0)+1);enemy.marks=enemy.marks.filter(m=>m.id!=='exposed');for(let i=0;i<stacks;i++)enemy.marks.push({id:'exposed',turns:3})}
  else{enemy.marks=enemy.marks.filter(m=>m.id!=='exposed');enemy.marks.push({id:'exposed',turns:2})}
 }
 triggerRicochet(lastAttack,enemy,dealt.damage);
 if(lastAttack.actor==='lily'&&lastAttack.action==='ultimate')applyLilyUltimateDebuff(enemy);
 if(lastAttack.actor==='lily'&&lastAttack.action==='skill'){enemy.marks=enemy.marks||[];enemy.marks=enemy.marks.filter(m=>m.id!=='ricochet');enemy.marks.push({id:'ricochet',turns:2,sources:[]})}
 if(enemy.hp<=0)resolveEnemyDefeat(enemy);else syncEnemyHp();
 return true;
}
function applyLilyUltimateDebuff(enemy){if(characterDuplicateRank('lily')<1||!enemy)return;enemy.debuffs=enemy.debuffs||[];enemy.debuffs=enemy.debuffs.filter(d=>d.id!=='lily-weakened');enemy.debuffs.push({id:'lily-weakened',turns:2,damageMultiplier:.9})}
function triggerRicochet(sourceAttack,hitEnemy,sourceDamage){
 if(!sourceAttack||sourceAttack.ricochetFollowUp||sourceDamage<=0)return;
 const marked=liveEnemies().filter(e=>e.marks?.some(m=>m.id==='ricochet'));
 const triggered=marked.filter(e=>{const m=e.marks.find(x=>x.id==='ricochet');return !(m.sources||[]).includes(sourceAttack.serial)});
 if(!triggered.length)return;
 const lily=party.find(p=>p.id==='lily');if(!lily)return;
 sourceAttack.ricochetFollowUp=true;const repetitions=characterDuplicateRank('lily')>=4?2:1;
 for(const enemy of triggered){const mark=enemy.marks.find(m=>m.id==='ricochet');mark.sources=[...(mark.sources||[]),sourceAttack.serial];
  for(let n=0;n<repetitions&&enemy.hp>0;n++){const reduction=calculateTrueDamageReduction(lily,enemy),amount=roundHp(sourceDamage*.1*(n===1?.5:1)*(1-(Number.isFinite(reduction)?reduction:0))),dealt=applyEnemyDamage(enemy,amount,lily);sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,damage:dealt.damage,barrierDamage:dealt.barrierDamage,ricochet:true,ricochetSource:sourceAttack.serial,critical:dealt.critical});if(enemy.hp<=0)resolveEnemyDefeat(enemy)}
 }
 sourceAttack.ricochetFollowUp=false;syncEnemyHp();
}
function cleanseEnemy(enemy,full=true){if(full){enemy.debuffs=[];enemy.marks=[];return}enemy.debuffs.shift();enemy.marks.shift()}
function teamBaseTurns(faction){
 const allyAverage=TwoToneTurnTimeline.mean(party.map(p=>speedOf(p)));
 const enemyMembers=timelineEnemyMembers(),enemyAverage=TwoToneTurnTimeline.mean(enemyMembers.map(e=>speedOf(e)));
 const slower=Math.min(allyAverage,enemyAverage),teamAverage=faction==='enemy'?enemyAverage:allyAverage;
 return Math.max(1,teamAverage/slower);
}
function brokenDuration(speed,baseTurns){
 return Math.max(1,roundHp(baseTurns*Math.max(.5,Math.min(1.5,2-speed/100))));
}
function applyEnemyDamage(enemy,rawDamage,attacker=null){
 const critical=!!attacker&&rawDamage>0&&Math.random()<criticalRateOf(attacker),criticalMultiplier=critical?1+criticalDamageOf(attacker):1,damageReduction=Math.min(1,Math.max(0,enemy.tune?.damageReduction||0));
 const damage=roundHp(rawDamage*(1-damageReduction)*criticalMultiplier*(enemy.brokenTurns>0?1.5:1));
 enemy.hp=Math.max(0,enemy.hp-damage);
 let barrierDamage=0,breakDamage=0,broken=false;
 if(enemy.barrier>0){
  const exposed=enemy.marks?.filter(m=>m.id==='exposed').length||0;
  // Tune's barrier bonus belongs to the Tune target, so only that ally's hits receive it.
  barrierDamage=damage*.25*(1+(premiumWeaponDuplicateRank('lily')>=2?exposed*.1:0)+(attacker?.tune?.barrierDamageBonus||0));enemy.barrier=Math.max(0,enemy.barrier-barrierDamage);
  if(enemy.barrier===0){enemy.brokenTurns=brokenDuration(speedOf(enemy),teamBaseTurns('enemy'));breakDamage=roundHp(enemy.maxHp*(.1+(premiumWeaponDuplicateRank('lily')>=3?exposed*.05:0)));enemy.hp=Math.max(0,enemy.hp-breakDamage);broken=true;}
 }
 syncEnemyHp();return {damage,barrierDamage,breakDamage,broken,critical,criticalMultiplier};
}
function resolveSoulFollowUp(sourceAttack){
 const soul=party.find(p=>p.id==='zero'&&p.hp>0);if(!soul||soulFollowUpProcs<=0||soulFollowUpSources.has(sourceAttack.serial))return false;
 const affected=[...new Set(sourceAttack.hits.filter(h=>h.damage>0).map(h=>h.target))].map(id=>enemies.find(e=>e.id===id)).filter(e=>e&&e.hp>0);
 if(!affected.length)return false;soulFollowUpSources.add(sourceAttack.serial);soulFollowUpProcs--;
 const attack=calculateTrueAttack(soul),dupeBonus=characterDuplicateRank(soul.id)>=2?2:1,rawTotal=Number.isFinite(attack)?roundHp(attack*.5*dupeBonus*celestialMultiplier(soul.id,'passive')):0,base=Math.floor(rawTotal/affected.length),remainder=rawTotal%affected.length;let total=0;
 for(let i=0;i<affected.length;i++){const share=base+(i<remainder?1:0),rate=attack>0?share/attack:0,amount=soulDamageForTarget(soul,affected[i],rate);if(amount<=0)continue;const enemy=affected[i],dealt=applyEnemyDamage(enemy,amount,soul);total+=dealt.damage;sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,slot:enemy.slot,damage:dealt.damage,hpAfter:enemy.hp,barrierDamage:dealt.barrierDamage,barrierAfter:enemy.barrier,broken:dealt.broken,followUp:true,critical:dealt.critical});if(enemy.hp<=0)resolveEnemyDefeat(enemy)}
 soulFollowUpActivationCount++;
  if(premiumWeaponDuplicateRank(soul.id)>=4&&soulFollowUpActivationCount%2===0)soulFollowUpProcs=Math.min(soulFollowUpLimit(),soulFollowUpProcs+1);
  sourceAttack.followUp={sourceSerial:sourceAttack.serial,damage:total,targets:affected.map(e=>e.id),procsRemaining:soulFollowUpProcs};syncEnemyHp();return total>0;
}
function finishTrainingAttack(serial){
 if(!attackInProgress||!lastAttack||lastAttack.serial!==serial)return;
 attackInProgress=false;lastAttack.finished=true;lastAttack.finishedAt=performance.now();
 if(lastAttack.actor==='lily'&&lastAttack.action==='ultimate'&&!encounterCleared){
  if(loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned)gainSp(1);
  if(premiumWeaponDuplicateRank('lily')>=4){for(const ally of party)ally.energy=Math.min(120,ally.energy+20);for(const ally of party)addActionAdvance(ally.id,20)}
  const existing=summons.find(s=>s.ownerId==='lily');if(existing){summons=summons.filter(s=>s.id!==existing.id);turnTimeline.states.delete(existing.id)}
  const duration=characterDuplicateRank('lily')>=3?4:3,s={id:'lily-hauntling-'+(++summonSerial),name:'HAUNTLING',ownerId:'lily',speed:30,mode:'independent',remaining:duration,pendingCreation:false,test:false};summons.push(s);syncTurnTimeline();turnTimeline.immediateFirst(s.id);
 }
 if(lastAttack.actor&&lastAttack.actor!=='zero'&&party.some(p=>p.id===lastAttack.actor))resolveSoulFollowUp(lastAttack);
 if(lastAttack.actor==='zero'&&lastAttack.action==='ultimate'){soulFollowUpProcs=soulFollowUpLimit();soulFollowUpSources.clear();lastAttack.followUpRefill=soulFollowUpProcs}
 const actingAlly=party.find(p=>p.id===lastAttack.actor);if(actingAlly&&lastAttack.action!=='ultimate')ageDawnTune(actingAlly);
 settleAfterAttack();
 if(!encounterCleared&&lastAttack?.action!=='ultimate')finishSummonCreationForTest(lastAttack?.actor);
 if(phase!=='resolve')return;
 if(encounterCleared){cancelAllQueuedUltimates('victory');phase='victory';log='All enemies in every wave defeated.';return}
 if(lastAttack?.action==='ultimate'){ultimateHistory.push({event:'finished',actor:lastAttack.actor,seq:lastAttack.ultimateSeq,turn});ultimateExecuting=false;runNextUltimate()}
 else drainUltimateQueueBefore(()=>nextTurn());
}
function setEnemyTarget(id){if(phase!=='player'||paused)return false;const e=enemies.find(e=>e.id===id&&e.hp>0);if(!e)return false;selectedEnemyId=id;selectedAllyId=null;if(pendingTargetAction){const pending=pendingTargetAction;pendingTargetAction=null;cameraPreview=null;const actor=party.find(p=>p.id===pending.actorId);if(pending.action==='ultimate')return queueUltimate(pending.actorId);return executeCombatAction(actor,pending.action)}cameraPreview='target';log=`Target selected: ${e.name} (wave ${e.wave}, slot ${e.slot+1}).`;return true;}
function setWavePlanForTest(sizes){if(phase!=='setup')return false;try{buildWavePlan(sizes)}catch(e){return false}waveOverride=[...sizes];return true;}
function toggleWavePreset(){if(phase!=='setup')return;waveOverride=null;const choices=['stress','quick','sizes'];wavePreset=choices[(choices.indexOf(wavePreset)+1)%choices.length]}
function setEnemyRoster(mode){if(phase!=='setup'||!['slime','wolf','mixed'].includes(mode))return false;enemyRosterMode=mode;return true;}

const savedTeam=loadTeam();
let draft=[...savedTeam];
function validTeam(ids){return Array.isArray(ids)&&ids.length>=1&&ids.length<=MAX_PARTY_SIZE&&ids.every(id=>ROSTER_IDS.has(id))&&new Set(ids).size===ids.length}
function loadTeam(){try{const a=JSON.parse(localStorage.getItem(TEAM_KEY)||'null');if(Array.isArray(a)&&a.every(id=>ROSTER_IDS.has(id))&&new Set(a).size===a.length){const saved=a.slice(0,MAX_PARTY_SIZE);if(saved.length===2&&saved[0]==='zero'&&saved[1]==='lily')return [...saved,'dawn'];return saved}}catch(e){}return ['zero','lily','dawn']}
function saveTeam(){try{localStorage.setItem(TEAM_KEY,JSON.stringify(draft))}catch(e){}}
function roster(id){return ROSTER.find(x=>x.id===id)}
function alive(){return party.filter(x=>x.hp>0)}
function active(){return party.find(x=>x.id===activeId)}
function say(message){hint=message;hintAt=performance.now()}
function schedule(fn,ms){const token=battleToken;setTimeout(()=>{if(token===battleToken)fn()},ms)}
function enterSelection(mandatory=false){saveVitals();cameraPreview=null;selectedAllyId=null;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;pendingVacancies=[];cancelAllQueuedUltimates('reset');battleToken++;summons=[];turnTimeline.reset();phase='setup';paused=false;forceSelect=mandatory;draft=[...loadTeam()];activeId=null;log='';say(mandatory?'This encounter requires team confirmation.':'Review the saved party and battle test options.');}
function enterPartySetup(){
 saveVitals();battleToken++;cancelAllQueuedUltimates('party-setup');turnTimeline.reset();
 phase='partySetup';paused=false;forceSelect=false;draft=[...loadTeam()];activeId=null;actingEnemyId=null;
 cameraPreview=null;selectedAllyId=null;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;fx=null;hint='';
}
function saveParty(){if(phase!=='partySetup'||!validTeam(draft))return false;saveTeam();phase='menu';hint='';return true}
function enterMainMenu(){
 saveVitals();
 battleToken++;cancelAllQueuedUltimates('main-menu');turnTimeline.reset();
 phase='menu';paused=false;activeId=null;actingEnemyId=null;cameraPreview=null;
 selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;fx=null;hint='';
}
function addUnit(id){if(phase!=='partySetup')return;if(draft.includes(id)){say('Already in the party.');return}if(draft.length>=MAX_PARTY_SIZE){say('A party can contain no more than four characters.');return}draft.push(id);}
function removeUnit(index){if(phase!=='partySetup')return;if(draft.length<=1){say('A party must contain at least one character.');return}draft.splice(index,1);}
function startBattle(){
 if(phase!=='setup'||!validTeam(draft)){say('Set a party of 1–4 unique characters in Party first.');return}
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 party=draft.map(id=>spawnProgressedUnit(id));
 turnTimeline.reset();pendingTargetAction=null;speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;zeroSkillArmed=false;fx=null;paused=false;phase='intro';forceSelect=false;saveVitals();
 log=`Wave 1/${wavePlan.length}: ${wavePlan[0].length} training enemies (${enemies.length} on field).`;
 schedule(()=>{if(phase==='intro')nextTurn()},380);
}
function replay(){if(phase==='setup')return;draft=party.map(p=>p.id);startFromBattle();}
function startFromBattle(){
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 saveVitals();party=party.map(p=>spawnProgressedUnit(p.id));
 turnTimeline.reset();pendingTargetAction=null;speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;zeroSkillArmed=false;fx=null;paused=false;phase='intro';saveVitals();
 log=`Wave test restarted: ${wavePlan.length} waves, ${wavePlan.reduce((n,w)=>n+w.length,0)} total enemies.`;
 schedule(()=>{if(phase==='intro')nextTurn()},380);
}
function resolveEnemyBasicAttack(attacker,candidates){
 const basic=attacker.basicAttack||{},passive=attacker.passive?.id==='slimy'?attacker.passive:null,rampage=attacker.passive?.id==='rampage';
 if(passive)attacker.basicAttackCount=(attacker.basicAttackCount||0)+1;
 const enhanced=!!passive&&attacker.basicAttackCount%passive.every===0;
 const targets=enhanced?[...candidates]:[candidates[Math.floor(Math.random()*candidates.length)]];
 const multiplier=(basic.multiplier??1)*(enhanced?1+(passive?.damageBonus||0):1)*(rampage?1+(attacker.passive.damageBonus??.25)*(attacker.rampageStacks||0):1)*(attacker.debuffs||[]).reduce((v,d)=>v*(d.damageMultiplier??1),1);
 const hits=targets.map(target=>{
  const calculated=basic.damageType?calculateTypedActionDamage(basic.damageType,multiplier,attacker,target):null;
  const damage=calculated?.damageTaken??(basic.damageType?0:92+((turn*37)%51));
  const dealt=applyEnemyDamage(target,damage,attacker);target.energy=Math.min(120,target.energy+10);
  return {target:target.id,damage:dealt.damage+dealt.breakDamage,barrierDamage:dealt.barrierDamage,breakDamage:dealt.breakDamage,barrierAfter:target.barrier,broken:dealt.broken,critical:dealt.critical};
 });
 if(rampage&&hits.some(hit=>hit.damage>0))attacker.rampageStacks=Math.min(attacker.passive.maxStacks??4,(attacker.rampageStacks||0)+1);
 return {hits,enhanced};
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
 if(attacking&&attacking.brokenTurns>0){attacking.brokenTurns--;if(attacking.brokenTurns===0){attacking.barrier=attacking.maxBarrier;cleanseEnemy(attacking);addActionAdvance(attacking.id,100);}schedule(()=>nextTurn(),0);return;}
 if(attacking?.marks)attacking.marks=attacking.marks.map(m=>({...m,turns:m.turns-1})).filter(m=>m.turns>0);
 if(attacking?.debuffs)attacking.debuffs=attacking.debuffs.map(d=>({...d,turns:d.turns-1})).filter(d=>d.turns>0);
 if(attacking){activeId=null;zeroSkillArmed=false;pendingTargetAction=null;actingEnemyId=next;cameraPreview=null;phase='enemy';log=`${attacking.name} prepares an attack.`;
  schedule(()=>{if(phase!=='enemy'||paused)return;if(attacking.hp<=0){nextTurn();return}const candidates=alive();if(!candidates.length){cancelAllQueuedUltimates('defeat');phase='defeat';return}enemyCount++;const attack=resolveEnemyBasicAttack(attacking,candidates),firstHit=attack.hits[0];saveVitals();cancelQueuedUltimatesOfDefeated();fx={kind:'enemy',at:performance.now(),damage:firstHit.damage,target:firstHit.target,hits:attack.hits,actorEnemyId:attacking.id};log=attack.enhanced?`${attacking.name} uses Slimy against all allied characters.`:`${attacking.name} hits ${party.find(p=>p.id===firstHit.target)?.name||'an ally'} for ${firstHit.damage}.`;phase='resolve';schedule(()=>drainUltimateQueueBefore(()=>{if(!alive().length){phase='defeat';log='All allied characters were defeated.'}else nextTurn()}),1000)},780);
 }else{actingEnemyId=null;activeId=next;zeroSkillArmed=false;pendingTargetAction=null;cameraPreview=null;turnCamera={fromId:previousActor,toId:next,start:performance.now(),duration:560};phase='player';log=`${active().name}'s turn — select an ability, then choose an enemy.`;}
}
// Normal turns can use Basic or Skill. Ultimate is off-turn and never spends a turn.
function play(action){
 if(phase!=='player'||paused||!['basic','skill','ultimate'].includes(action))return false;
 const a=active();if(!a||a.hp<=0)return false;
 if(action==='skill'&&a.id==='zero'){pendingTargetAction=null;cameraPreview=null;return activateSoulEnhance()}
 if(action==='skill'&&a.id==='dawn')return beginDawnAllyTargetSelection('skill',a.id);
 if(action==='skill'&&sp<1){say('Not enough shared SP. Basic restores 1 SP.');return false;}
 return beginTargetSelection(action,a.id);
}
function soulDamageForTarget(actor,target,rate){return calculateTypedActionDamage('true',rate,actor,target)?.damageTaken??0}
function applyDawnTune(ally){
 if(!ally||ally.hp<=0)return false;
 const duplicates=characterDuplicateRank('dawn'),weapon=loadoutFor('dawn').weapon,premium=weapon.selected==='premium'&&weapon.premiumOwned,weaponDuplicates=premium?premiumWeaponDuplicateRank('dawn'):0;
 ally.tune={turns:duplicates>=3?2:1,skipFirstTick:ally.id==='dawn',basicEnhanced:true,damageBonus:.4+(duplicates>=4 ? .4 : 0),attackBonus:duplicates>=3 ? .2 : 0,defenseIgnore:.2,damageReduction:weaponDuplicates>=1 ? .2 : 0,barrierDamageBonus:weaponDuplicates>=2 ? .2 : 0,criticalRateBonus:weaponDuplicates>=4 ? .2 : 0,criticalDamageBonus:weaponDuplicates>=4 ? .5 : 0};
 syncTurnTimeline();if(premium&&weaponDuplicates>=3)addActionAdvance(ally.id,20);return true;
}
function clearDawnTune(ally){if(!ally?.tune)return false;ally.tune=null;syncTurnTimeline();return true}
function ageDawnTune(ally){if(!ally?.tune)return false;if(ally.tune.skipFirstTick){ally.tune.skipFirstTick=false;return true}ally.tune.turns--;if(ally.tune.turns<=0)return clearDawnTune(ally);return true}
function executeCombatAction(a,action,ultimateSeq=null,allyTargetId=null){
 if(!a||a.hp<=0||!['basic','skill','ultimate'].includes(action))return false;
 const dawnSupport=a.id==='dawn'&&(action==='skill'||action==='ultimate'),allyTarget=dawnSupport?party.find(p=>p.id===allyTargetId&&p.hp>0):null;
 if(dawnSupport&&!allyTarget){say('Dawn’s ability needs a living ally target.');return false}
 const victim=dawnSupport?null:chosenEnemy();if(!victim){say('No available enemy target.');return false;}
 const targetGeometry=victim?{x:victim.x,y:victim.y,w:victim.w,h:victim.h,slot:victim.slot}:null;
 const mode=dawnSupport?'ally':actionTargetMode(a,action),targets=dawnSupport?[]:chooseAttackTargets(mode,victim);
 const controlledSummon=action==='skill'&&a.test?summons.find(s=>s.mode==='controlled'&&!s.pendingCreation&&s.ownerId===a.id):null;
 const energyBefore=a.energy,spBefore=sp,spMaxBefore=effectiveSpMax();
 let damage=0,enhanceSpent=0,soulRate=null,tuneBasicUsed=action==='basic'&&!!a.tune?.basicEnhanced;
 if(a.id==='zero'&&action==='basic'){
  enhanceSpent=soulEnhanceStacks;soulEnhanceStacks=0;const basicDupe=premiumWeaponDuplicateRank(a.id)>=1?2:1,skillPerPoint=characterDuplicateRank(a.id)>=4?2:1;soulRate=(basicDupe*celestialMultiplier(a.id,'basic')+enhanceSpent*skillPerPoint*celestialMultiplier(a.id,'skill'))*(tuneBasicUsed?1+a.tune.damageBonus:1);
  damage=soulDamageForTarget(a,targets[0],soulRate);a.energy=Math.min(120,a.energy+10+10*enhanceSpent);gainSp(1);
 }else if(a.id==='zero'&&action==='ultimate'){const ultimateDupe=characterDuplicateRank(a.id)>=3?2:1;soulRate=2*ultimateDupe*celestialMultiplier(a.id,'ultimate');damage=soulDamageForTarget(a,targets[0],soulRate)}
 else if(a.id==='lily'&&action==='basic'){damage=calculateTypedActionDamage('magical',celestialMultiplier(a.id,'basic')*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+10)}
 else if(a.id==='lily'&&action==='skill'){damage=calculateTypedActionDamage('magical',celestialMultiplier(a.id,'skill'),a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+20);sp=Math.max(0,sp-1)}
 else if(a.id==='lily'&&action==='ultimate'){const rate=celestialMultiplier(a.id,'ultimate')*(characterDuplicateRank(a.id)>=3?2:1);damage=calculateTypedActionDamage('magical',rate,a,targets[0])?.damageTaken??0}
 else if(a.id==='dawn'&&action==='basic'){damage=calculateTypedActionDamage('magical',2*celestialMultiplier(a.id,'basic')*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+10);gainSp(1)}
 else if(a.id==='dawn'&&action==='skill'){sp=Math.max(0,sp-1);a.energy=Math.min(120,a.energy+20);applyDawnTune(allyTarget)}
 else if(a.id==='dawn'&&action==='ultimate'){allyTarget.energy=Math.min(120,allyTarget.energy+120*(characterDuplicateRank(a.id)>=1?1:.5));addActionAdvance(allyTarget.id,100);gainSp(characterDuplicateRank(a.id)>=2?3:1)}
 else if(action==='basic'){damage=280;a.energy=Math.min(120,a.energy+25);gainSp(1)}
 else if(action==='skill'){damage=460;a.energy=Math.min(120,a.energy+35);sp--;addActionAdvance(a.id,25)}
 else damage=980;
 if(tuneBasicUsed)gainSp(1);
 const serial=++attackSerial;
 attackInProgress=true;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;cameraPreview=null;selectedAllyId=null;
 lastAttack={serial,actor:a.id,action,mode,ultimateSeq,allyTargetId:allyTarget?.id||null,tuneBasicUsed,controlledSummonId:controlledSummon?.id||null,initialTarget:victim?.id||allyTarget?.id||null,initialTargets:targets.map(e=>e.id),
  hits:[],defeats:[],finished:false,startedAt:performance.now(),finishedAt:null,energyBefore,energyAfter:a.energy,spBefore,spAfter:sp,spMaxBefore,spMaxAfter:effectiveSpMax(),enhanceSpent,soulRate};
 phase='resolve';fx=dawnSupport?null:{kind:action,at:performance.now(),damage,actor:a.id,targetEnemyId:victim.id,targetGeometry};
 log=a.id==='zero'?(action==='ultimate'?'SOUL ULTIMATE • TRUE AOE':action==='basic'?'SOUL BASIC • TRUE DAMAGE':'SOUL '+action.toUpperCase()):a.id==='dawn'?(action==='skill'?'DAWN TUNE • '+allyTarget.name:action==='ultimate'?'DAWN ULTIMATE • '+allyTarget.name:'DAWN BASIC • MAGICAL'):a.id==='lily'?'LILY '+action.toUpperCase():'TEST '+mode.toUpperCase()+': '+a.name+' uses '+action+' • '+targets.length+' initial target(s).';
 if(controlledSummon)summonHistory.push({event:'controlled-activation',id:controlledSummon.id,ownerId:a.id,clock:turnTimeline.clock});
 if(mode==='five-hit'){
  let focused=victim,lastSlot=victim.slot;
  for(let n=0;n<5;n++)schedule(()=>{if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;if(!focused||focused.hp<=0)focused=closestSurvivingEnemy(lastSlot);if(!focused)return;lastSlot=focused.slot;const part=Math.floor(damage/5)+(n<damage%5?1:0);applyTrainingHit(focused,part,n+1)},160+n*135);
 }else schedule(()=>{
  if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;
  for(let n=0;n<targets.length;n++)if(targets[n].hp>0){let hitDamage=damage;if(a.id==='zero'&&(action==='basic'||action==='ultimate'))hitDamage=soulDamageForTarget(a,targets[n],soulRate);else if(a.id==='lily')hitDamage=calculateTypedActionDamage('magical',celestialMultiplier(a.id,action)*(action==='ultimate'&&characterDuplicateRank(a.id)>=3?2:1)*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[n])?.damageTaken??0;else if(a.id==='dawn'&&action==='basic')hitDamage=calculateTypedActionDamage('magical',2*celestialMultiplier(a.id,'basic')*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[n])?.damageTaken??0;applyTrainingHit(targets[n],hitDamage,n+1)}
 },a.id==='zero'&&action==='basic'?645:340);
 schedule(()=>finishTrainingAttack(serial),a.id==='zero'&&action==='basic'?SOUL_BASIC_MS:dawnSupport?420:990);
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

const RUNE_STATS=['hp','physicalAttack','magicalAttack','physicalDefense','magicalDefense','speed'];
const RUNE_STAT_INFO={
 hp:{label:'HP',main:100},physicalAttack:{label:'Physical Attack',main:20},
 magicalAttack:{label:'Magical Attack',main:20},physicalDefense:{label:'Physical Defense',main:4},
 magicalDefense:{label:'Magical Defense',main:4},speed:{label:'Speed',main:20}
};
const CELESTIALS=[['passive','PASSIVE'],['basic','BASIC'],['skill','SKILL'],['ultimate','ULTIMATE']];
function defaultLoadout(){return {characterDuplicates:0,weapon:{selected:'standard',standardPotential:1,premiumPotential:1,premiumOwned:false},runes:[null,null,null,null],celestials:{passive:1,basic:1,skill:1,ultimate:1}}}
function normalizeRune(value){
 if(!value||typeof value!=='object'||!RUNE_STATS.includes(value.main)||!Array.isArray(value.subs))return null;
 const subs=value.subs.filter((x,i,a)=>RUNE_STATS.includes(x)&&x!==value.main&&a.indexOf(x)===i).slice(0,3);
 return subs.length===3?{level:Number.isInteger(value.level)?Math.max(1,Math.min(5,value.level)):1,main:value.main,subs,setId:typeof value.setId==='string'?value.setId:null,criticalRateBonus:Number.isFinite(value.criticalRateBonus)?Math.max(0,value.criticalRateBonus):0,criticalDamageBonus:Number.isFinite(value.criticalDamageBonus)?Math.max(0,value.criticalDamageBonus):0}:null
}
function normalizeLoadout(value){
 const base=defaultLoadout();if(!value||typeof value!=='object')return base;
 base.characterDuplicates=Number.isInteger(value.characterDuplicates)?Math.max(0,Math.min(4,value.characterDuplicates)):0;
 const weapon=value.weapon&&typeof value.weapon==='object'?value.weapon:{};
 base.weapon.standardPotential=Number.isInteger(weapon.standardPotential)?Math.max(1,Math.min(5,weapon.standardPotential)):1;
 base.weapon.premiumPotential=Number.isInteger(weapon.premiumPotential)?Math.max(1,Math.min(5,weapon.premiumPotential)):1;
 base.weapon.premiumOwned=weapon.premiumOwned===true;
 base.weapon.selected=weapon.selected==='premium'&&base.weapon.premiumOwned?'premium':'standard';
 if(Array.isArray(value.runes))base.runes=Array.from({length:4},(_,i)=>normalizeRune(value.runes[i]));
 if(value.celestials&&typeof value.celestials==='object')for(const [key] of CELESTIALS){const n=value.celestials[key];base.celestials[key]=Number.isInteger(n)?Math.max(1,Math.min(10,n)):1}
 return base
}
function loadCharacterLoadouts(){let stored={};try{stored=JSON.parse(localStorage.getItem(LOADOUT_KEY)||'{}')||{}}catch(e){}return Object.fromEntries(ROSTER.map(model=>[model.id,normalizeLoadout(stored[model.id])]))}
let characterLoadouts=loadCharacterLoadouts(),loadoutCharacterId='zero',selectedLoadoutRune=0,loadoutPage='characters',runeStatPicker=null;
function loadoutFor(id=loadoutCharacterId){return characterLoadouts[id]||(characterLoadouts[id]=defaultLoadout())}
function saveLoadouts(){try{localStorage.setItem(LOADOUT_KEY,JSON.stringify(characterLoadouts))}catch(e){}}
function weaponBonus(record){const w=record.weapon;return w.selected==='premium'&&w.premiumOwned?1+(w.premiumPotential-1)*.25:.8+(w.standardPotential-1)*.05}
function loadoutStatModifiers(id,characterLevel=1){
 const record=loadoutFor(id),bonus=weaponBonus(record),totals=Object.fromEntries(RUNE_STATS.map(k=>[k,0]));
 for(const rune of record.runes){if(!rune)continue;totals[rune.main]+=RUNE_STAT_INFO[rune.main].main*rune.level;for(const sub of rune.subs)totals[sub]+=RUNE_STAT_INFO[sub].main*.25*rune.level}
 const pct={signatureWeapon:bonus},criticalRateFromRunes=record.runes.reduce((sum,rune)=>sum+(rune?.criticalRateBonus||0),0),criticalDamageFromRunes=record.runes.reduce((sum,rune)=>sum+(rune?.criticalDamageBonus||0),0);
 return {hpFlatModifiers:{},hpPercentModifiers:pct,hpEquipmentFlatModifiers:{runes:totals.hp},
 physicalAttackFlatModifiers:{},physicalAttackPercentModifiers:pct,physicalAttackEquipmentFlatModifiers:{runes:totals.physicalAttack},
 magicalAttackFlatModifiers:{},magicalAttackPercentModifiers:pct,magicalAttackEquipmentFlatModifiers:{runes:totals.magicalAttack},
 physicalDefenseFlatModifiers:{},physicalDefensePercentModifiers:pct,physicalDefenseEquipmentFlatModifiers:{runes:totals.physicalDefense},
 magicalDefenseFlatModifiers:{},magicalDefensePercentModifiers:pct,magicalDefenseEquipmentFlatModifiers:{runes:totals.magicalDefense},
 speedFlatModifiers:{},speedPercentModifiers:pct,speedEquipmentFlatModifiers:{runes:totals.speed},criticalRateModifiers:{runes:criticalRateFromRunes,premiumWeaponDuplicate2:id==='zero'&&premiumWeaponDuplicateRank(id)>=2 ? .1 : 0},criticalDamageModifiers:{runes:criticalDamageFromRunes,premiumWeaponDuplicate2:id==='zero'&&premiumWeaponDuplicateRank(id)>=2 ? .25 : 0}}
}
function celestialMultiplier(id,key){return 1+.10*(loadoutFor(id).celestials[key]||1)}
function characterDuplicateRank(id='zero'){return loadoutFor(id).characterDuplicates||0}
function premiumWeaponDuplicateRank(id='zero'){const w=loadoutFor(id).weapon;return w.selected==='premium'&&w.premiumOwned?Math.max(0,w.premiumPotential-1):0}
function soulFollowUpLimit(){return characterDuplicateRank('zero')>=1?7:5}
function soulEnhancedBasicTargetMode(stacks){if(stacks<3)return 'single';return premiumWeaponDuplicateRank()>=3?'aoe':'blast'}

function loadoutStats(id){
 const model=ROSTER.find(x=>x.id===id),level=progressFor(id)?.level||1;if(!model)return null;
 const unit={...model,level,...loadoutStatModifiers(id,level)};
 return {HP:calculateMaxHp(model.hp,level,unit.hpFlatModifiers,unit.hpPercentModifiers,unit.hpEquipmentFlatModifiers),
 'Physical Attack':calculatePhysicalAttack(unit),'Magical Attack':calculateMagicalAttack(unit),
 'Physical Defense':calculatePhysicalDefense(unit),'Magical Defense':calculateMagicalDefense(unit),Speed:calculateSpeed(unit)}
}
function enterLoadout(){loadoutCharacterId='zero';selectedLoadoutRune=0;loadoutPage='characters';runeStatPicker=null;phase='loadout';hint=''}
function handleLoadoutAction(action){
 const [kind,arg]=action.split(':'),record=loadoutFor(),weapon=record.weapon,rune=record.runes[selectedLoadoutRune];
 if(kind==='back'){if(runeStatPicker){runeStatPicker=null;return}if(loadoutPage==='characters')phase='menu';else if(loadoutPage==='menu')loadoutPage='characters';else loadoutPage='menu';return}
 if(kind==='character'){if(ROSTER_IDS.has(arg)&&!roster(arg)?.test){loadoutCharacterId=arg;loadoutPage='menu'}return}
 if(kind==='page'){if(['weapons','runes','celestials','levels'].includes(arg))loadoutPage=arg;return}
 if(kind==='character-duplicate')record.characterDuplicates=Math.max(0,Math.min(4,record.characterDuplicates+Number(arg)));
 else if(kind==='weapon-standard')weapon.selected='standard';
 else if(kind==='weapon-premium'){if(weapon.premiumOwned)weapon.selected='premium'}
 else if(kind==='potential'){const [type,delta]=arg.split(','),key=type==='premium'?'premiumPotential':'standardPotential';weapon[key]=Math.max(1,Math.min(5,weapon[key]+Number(delta)))}
 else if(kind==='rune-select')selectedLoadoutRune=Math.max(0,Math.min(3,Number(arg)||0));
 else if(kind==='rune-equip'){const index=Math.max(0,Math.min(3,Number(arg)||0));record.runes[index]={level:1,main:'hp',subs:['physicalAttack','magicalAttack','physicalDefense'],setId:null};selectedLoadoutRune=index}
 else if(kind==='rune-remove')record.runes[selectedLoadoutRune]=null;
 else if(kind==='rune-level'&&rune)rune.level=Math.max(1,Math.min(5,rune.level+Number(arg)));
 else if(kind==='rune-main'&&rune){runeStatPicker={slot:'main',subIndex:-1};return}
 else if(kind==='rune-sub'&&rune){const index=Number(arg);if(Number.isInteger(index)&&index>=0&&index<3){runeStatPicker={slot:'sub',subIndex:index};return}}
 else if(kind==='rune-picker-close'){runeStatPicker=null;return}
 else if(kind==='rune-stat-choice'&&rune&&runeStatPicker){
  const [slot,key]=arg.split(',');
  if(slot===runeStatPicker.slot&&RUNE_STATS.includes(key)){
   if(slot==='main'&&key!==rune.main){rune.main=key;rune.subs=RUNE_STATS.filter(x=>x!==key).slice(0,3)}
   else{const index=runeStatPicker.subIndex,available=key!==rune.main&&!rune.subs.some((v,i)=>i!==index&&v===key);if(available)rune.subs[index]=key}
  }
  runeStatPicker=null;
 }
 else if(kind==='celestial'){const [key,delta]=arg.split(',');if(Object.hasOwn(record.celestials,key))record.celestials[key]=Math.max(1,Math.min(10,record.celestials[key]+Number(delta)))}
 saveLoadouts()
}
function loadoutPanel(title,subtitle,backLabel='BACK'){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.76)');rect(74,40,1452,820,'rgba(13,20,39,.98)','#ccb88e',20);
 text(title,120,100,40,'#ffedd1','850');text(subtitle,120,139,17,'#c4d6e5','550');
 addButton(1300,66,180,54,'loadout:back',backLabel);
}
function loadoutCharacter(){return roster(loadoutCharacterId)}
function drawLoadoutCharacters(){
 loadoutPanel('LOADOUT','Choose a character to open their equipment and progression menus.','MAIN MENU');
 for(let i=0;i<ROSTER.length;i++){
  const p=ROSTER[i],y=190+i*145,active=loadoutCharacterId===p.id;
  rect(150,y,1300,118,'rgba(25,37,58,.94)',active?'#edcf98':'#718ba4',14);
  addButton(174,y+20,1252,78,'loadout:character:'+p.id,p.name,p.test?'PLACEHOLDER • NO LOADOUT':'LEVEL '+(progressFor(p.id)?.level||1),!p.test);
 }
}
function drawLoadoutMenu(){
 const model=loadoutCharacter(),record=loadoutFor(loadoutCharacterId),progress=progressFor(loadoutCharacterId);
 loadoutPanel(model.name+' • LOADOUT','Choose what you want to configure. Current character level: '+(progress?.level||1)+'.');
 const cards=[
  ['weapons','WEAPONS','Standard and premium signature weapon'],
  ['runes','RUNES','Four rune slots and stat customization'],
  ['celestials','CELESTIALS','Ability multipliers • four upgrades'],
  ['levels','LEVELS','Character progression and combat stats']
 ];
 for(let i=0;i<cards.length;i++){
  const [key,label,sub]=cards[i],x=190+(i%2)*620,y=210+Math.floor(i/2)*275;
  rect(x,y,570,230,'rgba(25,37,58,.94)','#718ba4',14);
  addButton(x+28,y+28,514,174,'loadout:page:'+key,label,sub);
 }
 text('WEAPON • '+record.weapon.selected.toUpperCase()+'     RUNES • '+record.runes.filter(Boolean).length+'/4     CELESTIALS • '+Object.values(record.celestials).map(v=>v+'/10').join('  '),800,790,14,'#c4d6e5','650','center');
}
function drawLoadoutWeapons(){
 const model=loadoutCharacter(),record=loadoutFor(loadoutCharacterId),w=record.weapon;
 loadoutPanel(model.name+' • WEAPONS','Each character can use only their own Standard or Premium signature weapon.');
 const standardBonus=Math.round((.8+(w.standardPotential-1)*.05)*100),premiumBonus=Math.round((1+(w.premiumPotential-1)*.25)*100);
 const cards=[{x:145,label:'STANDARD SIGNATURE',selected:w.selected==='standard',bonus:standardBonus,potential:w.standardPotential,type:'standard'},
              {x:825,label:'PREMIUM SIGNATURE',selected:w.selected==='premium',bonus:premiumBonus,potential:w.premiumPotential,type:'premium'}];
 for(const c of cards){
  rect(c.x,205,630,470,'rgba(25,37,58,.94)',c.selected?'#edcf98':'#718ba4',14);
  text(c.label,c.x+30,245,22,'#f3dfb9','850');
  text(c.type==='standard'?'Included with '+model.name:'Acquired in the Store',c.x+30,278,15,'#c4d6e5','550');
  text('+'+c.bonus+'% to all six stats',c.x+30,350,28,'#f4d99c','800');
  text('POTENTIAL '+c.potential+' / 5',c.x+30,405,18,'#d6e2ef','750');
  const usable=c.type==='standard'||w.premiumOwned;
  addButton(c.x+30,438,570,64,c.type==='standard'?'loadout:weapon-standard':'loadout:weapon-premium',
    usable?(c.selected?'EQUIPPED':'EQUIP'): 'PREMIUM • STORE LOCKED',
    usable?'Signature weapon • character locked':'Premium weapon is not owned',usable);
  if(c.type==='standard'||w.premiumOwned){
   addButton(c.x+180,528,90,54,'loadout:potential:'+c.type+',-1','−','',c.potential>1);
   addButton(c.x+360,528,90,54,'loadout:potential:'+c.type+',1','+','',c.potential<5);
   text('Each potential changes the stat bonus.',c.x+315,613,14,'#aebfd0','550','center');
  }
 }
 rect(145,705,1310,95,'rgba(25,37,58,.94)','#536983',12);
 text('PREMIUM EFFECT • Spend 3 Enhance points to restore 1 Skill Point. Costs and acquisition are not configured.',175,755,16,'#d6e2ef','650');
}
function drawRuneStatPicker(rune){
 if(!runeStatPicker)return;
 rect(0,0,W,H,'rgba(4,8,18,.80)');
 choiceRects.push({x:0,y:0,w:W,h:H,action:'loadout:rune-picker-close',enabled:true});
 rect(135,170,1330,590,'rgba(13,20,39,.99)','#ccb88e',18);
 const isMain=runeStatPicker.slot==='main',heading=isMain?'CHOOSE MAIN STAT':'CHOOSE SUBSTAT '+(runeStatPicker.subIndex+1);
 text(heading,185,220,30,'#ffedd1','850');
 text(isMain?'All six stats are available. Changing the main stat refreshes the three unique substats.':'All six stats are shown. Options already used by another slot are disabled.',185,254,16,'#c4d6e5','550');
 addButton(1285,190,140,52,'loadout:rune-picker-close','CLOSE');
 for(let i=0;i<RUNE_STATS.length;i++){
  const key=RUNE_STATS[i],info=RUNE_STAT_INFO[key],col=i%3,row=Math.floor(i/3),x=190+col*410,y=280+row*190;
  const subIndex=runeStatPicker.subIndex,usedAsMain=key===rune.main,usedByOtherSub=!isMain&&rune.subs.some((v,j)=>j!==subIndex&&v===key);
  const enabled=isMain||(!usedAsMain&&!usedByOtherSub),selected=isMain?usedAsMain:rune.subs[subIndex]===key;
  const value=info.main*rune.level*(isMain?1:.25),note=selected?(isMain?'CURRENT MAIN':'CURRENT SUBSTAT'):usedAsMain?'USED BY MAIN STAT':usedByOtherSub?'USED BY ANOTHER SUBSTAT':(isMain?'MAIN STAT':'SUBSTAT')+' • LEVEL '+rune.level;
  addButton(x,y,390,155,'loadout:rune-stat-choice:'+runeStatPicker.slot+','+key,info.label,note+'  •  +'+value,enabled);
  if(selected)rect(x-3,y-3,396,161,'rgba(0,0,0,0)','#edcf98',12);
 }
}
function drawLoadoutRunes(){
 const model=loadoutCharacter(),record=loadoutFor(loadoutCharacterId);
 loadoutPanel(model.name+' • RUNES','Equip up to four runes. Main and substats are flat bonuses; each rune is level 1–5.');
 for(let i=0;i<4;i++){
  const x=125+(i%2)*690,y=190+Math.floor(i/2)*300,rune=record.runes[i],selected=i===selectedLoadoutRune;
  rect(x,y,650,276,'rgba(25,37,58,.94)',selected?'#edcf98':'#718ba4',13);
  text('RUNE SLOT '+(i+1),x+24,y+32,18,'#d6e2ef','850');
  addButton(x+450,y+12,82,42,'loadout:rune-select:'+i,'SELECT','',selected);
  if(!rune){
   text('Empty slot',x+30,y+104,18,'#aebfd0','550');
   addButton(x+30,y+150,590,64,'loadout:rune-equip:'+i,'ADD RUNE • PREVIEW','Rune inventory and set bonuses are not configured');
   continue;
  }
  text('LEVEL '+rune.level+' / 5',x+250,y+32,15,'#f1dfbf','750','center');
  addButton(x+306,y+12,44,42,'loadout:rune-level:-1','−','',rune.level>1);
  addButton(x+356,y+12,44,42,'loadout:rune-level:1','+','',rune.level<5);
  addButton(x+540,y+12,92,42,'loadout:rune-remove','UNEQUIP');
  const main=RUNE_STAT_INFO[rune.main];
  addButton(x+24,y+58,602,64,'loadout:rune-main','MAIN STAT • '+main.label,'+'+(main.main*rune.level)+' • SELECT TO CHANGE');
  for(let j=0;j<3;j++){
   const sub=rune.subs[j],sx=x+24+j*204,info=RUNE_STAT_INFO[sub];
   addButton(sx,y+140,194,92,'loadout:rune-sub:'+j,info.label,'+'+(info.main*.25*rune.level));
  }
 }
 const rune=record.runes[selectedLoadoutRune];if(rune)drawRuneStatPicker(rune);
}
function drawLoadoutCelestials(){
 const model=loadoutCharacter(),record=loadoutFor(loadoutCharacterId);
 loadoutPanel(model.name+' • CELESTIALS','Four ability-specific upgrades. Each level adds 10% to that ability’s base multiplier.');
 for(let i=0;i<CELESTIALS.length;i++){
  const [key,label]=CELESTIALS[i],x=165+(i%2)*650,y=195+Math.floor(i/2)*292,level=record.celestials[key];
  rect(x,y,600,258,'rgba(25,37,58,.94)','#718ba4',14);
  text(label.toUpperCase(),x+30,y+48,22,'#f3dfb9','850');
  text('LEVEL '+level+' / 10',x+30,y+100,20,'#d6e2ef','700');
  text('+'+(level*10)+'% base multiplier',x+30,y+145,17,'#f4d99c','750');
  addButton(x+330,y+75,92,70,'loadout:celestial:'+key+',-1','−','',level>1);
  addButton(x+445,y+75,92,70,'loadout:celestial:'+key+',1','+','',level<10);
 }
}
function drawLoadoutLevels(){
 const model=loadoutCharacter(),progress=progressFor(loadoutCharacterId),record=loadoutFor(loadoutCharacterId),cap=characterLevelCap(),stats=loadoutStats(loadoutCharacterId);
 loadoutPanel(model.name+' • LEVELS','Review character level, level cap, and current combat stats.');
 rect(130,190,610,650,'rgba(25,37,58,.94)','#718ba4',14);
 text('CHARACTER LEVEL',165,235,20,'#f3dfb9','850');
 text('LEVEL '+progress.level+' / '+cap,165,290,30,'#fff1d5','850');
 const expNeeded=requiredExp(progress.level),atGate=ASCENSION_GATES.includes(progress.level)&&!progress.ascended.includes(progress.level);
 text(progress.level>=cap?'Current level cap reached':atGate?'Ascension required at this level':'EXP  '+progress.exp+' / '+expNeeded,165,345,18,'#d6e2ef','700');
 text('Account rank '+playerRank+' sets the current level cap.',165,398,15,'#aebfd0','550');
 text('Ascensions completed: '+(progress.ascended.length?progress.ascended.join(', '):'none'),165,434,14,'#aebfd0','550');
 text('Level scaling multiplies base stats by character level.',165,490,14,'#c4d6e5','550');
 text('EXP sources and ascension materials are not configured.',165,520,14,'#c4d6e5','550');
 text('CURRENT COMBAT STATS',165,580,17,'#f3dfb9','800');
 const statList=Object.entries(stats||{});
 for(let i=0;i<statList.length;i++){
  const [name,value]=statList[i],x=165+(i%2)*275,y=610+Math.floor(i/2)*28;
  text(name+'  '+(value===null?'—':Math.round(value)),x,y,14,'#d6dceb','650');
 }
 rect(790,190,680,450,'rgba(25,37,58,.94)','#718ba4',14);
 text('CHARACTER DUPLICATES',830,240,21,'#f3dfb9','850');
 text('Duplicate preview: '+record.characterDuplicates+' / 4',830,295,19,'#d6e2ef','700');
 addButton(830,335,95,58,'loadout:character-duplicate:-1','−','',record.characterDuplicates>0);
 addButton(940,335,95,58,'loadout:character-duplicate:1','+','',record.characterDuplicates<4);
 text('Duplicate effects currently preview without resource costs.',830,430,14,'#aebfd0','550');
 text('Levels affect all six base combat stats.',830,490,16,'#d6e2ef','650');
 text('Current loadout bonuses are included in the stat values.',830,525,14,'#aebfd0','550');
}
function drawLoadout(){
 if(loadoutPage==='characters')return drawLoadoutCharacters();
 if(loadoutPage==='menu')return drawLoadoutMenu();
 if(loadoutPage==='weapons')return drawLoadoutWeapons();
 if(loadoutPage==='runes')return drawLoadoutRunes();
 if(loadoutPage==='celestials')return drawLoadoutCelestials();
 return drawLoadoutLevels();
}
function drawMainMenu(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.68)');
 text('TWO-TONE',800,112,58,'#f8f4ea','900','center');
 text('MAIN MENU',800,170,20,'#eacb87','800','center');
 rect(1293,63,190,66,'rgba(13,17,35,.94)','#eacb87',12);
 text('RANK',1388,82,13,'#bfc8d9','800','center');text(playerRank,1388,107,25,'#f7f3f8','850','center');
 const items=[
  {label:'STORY',x:220,y:256,active:true,action:'open-story',detail:'BATTLE PROTOTYPE'},
  {label:'EVENTS',x:640,y:256},
  {label:'GAME MODE',x:1060,y:256},
  {label:'STORE',x:220,y:472},
  {label:'LOADOUT',x:640,y:472,active:true,action:'open-loadout',detail:'WEAPONS • RUNES • CELESTIALS'},
  {label:'PARTY',x:1060,y:472,active:true,action:'open-party',detail:'MANAGE CURRENT PARTY'},
 ];
 for(const item of items){
  if(item.active){
   addButton(item.x,item.y,320,166,item.action,item.label,item.detail);
  }else{
   rect(item.x,item.y,320,166,'rgba(20,29,47,.82)','rgba(129,164,191,.5)',13);
   text(item.label,item.x+160,item.y+65,25,'#c2c9d3','800','center');
   text('COMING SOON',item.x+160,item.y+112,14,'#9ca9b9','650','center');
  }
 }
 text('Select a section to continue',800,704,17,'#d6dceb','550','center');
}
function drawPartySetup(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.72)');
 rect(145,58,1310,780,'rgba(13,20,39,.98)','#ccb88e',20);
 text('PARTY',205,111,43,'#ffedd1','850');
 addButton(1226,82,190,54,'main-menu','MAIN MENU','');
 text(`CURRENT PARTY  •  ${draft.length}/${MAX_PARTY_SIZE}`,208,177,21,'#bad4e9','800');
 text('Choose 1–4 unique characters. Party order has no special meaning.',208,207,16,'#c4d6e5','550');
 for(let i=0;i<MAX_PARTY_SIZE;i++){
  const x=212+i*295,y=238,w=275,h=215,id=draft[i],p=id?roster(id):null;
  rect(x,y,w,h,p?'rgba(38,54,79,.94)':'rgba(21,33,56,.88)',p?'#9eb8d3':'#4c607a',13);
  if(p){
   text(p.name,x+w/2,y+55,23,'#f6eefa','800','center');
   text(p.test?'TEST PLACEHOLDER':'CHARACTER',x+w/2,y+91,14,p.test?'#e5ca99':'#bdccdd','650','center');
   text(`LEVEL ${progressFor(p.id).level}`,x+w/2,y+121,15,'#c4d6e5','600','center');
   addButton(x+28,y+154,w-56,43,`remove:${i}`,'REMOVE','',draft.length>1);
  }else{
   text('EMPTY',x+w/2,y+91,20,'#8494a9','750','center');
  }
 }
 text('AVAILABLE CHARACTERS',208,493,20,'#bad4e9','800');
 for(let i=0;i<ROSTER.length;i++){
   const p=ROSTER[i],x=172+i*247,y=520,w=230,h=132,selected=draft.includes(p.id);
  rect(x,y,w,h,selected?'rgba(35,59,76,.92)':'rgba(29,41,67,.94)',selected?'#8fbcad':'#7e97b0',11);
  text(p.name,x+18,y+33,23,'#f5e9dc','800');
  text(p.test?'TEST PLACEHOLDER • NO CHARACTER ASSET':'CHARACTER',x+18,y+65,14,'#bdccdd','600');
  addButton(x+w-140,y+83,122,34,`add:${p.id}`,selected?'IN PARTY':'ADD','',!selected&&draft.length<MAX_PARTY_SIZE);
 }
 addButton(212,711,250,62,'main-menu','CANCEL','Discard changes');
 addButton(1126,711,250,62,'save-party','SAVE PARTY','',validTeam(draft));
}
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
const SOUL_BASIC_MS=1250;
function zeroBasicStage(t){
 if(phase!=='resolve'||fx?.kind!=='basic'||fx.actor!=='zero')return null;
 const dt=Math.max(0,t-fx.at);return dt<=SOUL_BASIC_MS?dt:null;
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
 if(cameraPreview==='party'&&pendingTargetAction?.targetSide==='ally'&&!paused)return 'party';
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
 3:[{x:418,baseY:671,w:174,h:348},{x:716,baseY:613,w:166,h:332},{x:1046,baseY:672,w:174,h:348}],
 4:[{x:280,baseY:674,w:170,h:340},{x:600,baseY:620,w:166,h:332},{x:930,baseY:620,w:166,h:332},{x:1230,baseY:674,w:170,h:340}]
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
 const select=view==='party'&&selectedAllyId===p.id;const allyTargeting=view==='party'&&pendingTargetAction?.targetSide==='ally',eligible=view==='party'&&supportDemo?eligibleAllyTarget(p,supportDemo):allyTargeting?p.hp>0:true;
 ctx.save();ctx.translate(camera.currentX*(view==='party'?.32:.52),bob);
 ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.44,16,0,0,Math.PI*2);ctx.fillStyle='rgba(12,12,40,.45)';ctx.fill();
 if(acting||select){ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.51,22,0,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle=select?'#eaca94':'#8be3fb';ctx.stroke()}
 if(p.hp<=0)ctx.globalAlpha=.37;
 const art=p.id==='zero'?(view==='party'?'zeroFront':'zero'):p.id==='lily'?(view==='party'?'lilyFront':'lilyBack'):p.id==='dawn'?(view==='party'?'dawnFront':'dawnBattle'):null;
 const zb=view==='command'&&p.id==='zero'?zeroBasicStage(t):null;
  if(zb!==null)zeroBasicPaint(x,baseY,w,h,zb);
  else if(art&&images[art]?.complete&&images[art].naturalWidth){
  const img=images[art];ctx.imageSmoothingEnabled=art==='zeroFront'||art==='dawnFront';
  if(art==='zeroFront'||art==='dawnFront'){
   // Party portraits use a centered upper-body crop; the full-body art remains available as the source asset.
   const cropH=img.naturalHeight*.6,cropW=cropH*.5,sx=(img.naturalWidth-cropW)/2;
   ctx.drawImage(img,sx,0,cropW,cropH,x,top,w,h);
  }else if(art==='zero'||art==='lilyBack'){
   // Fit the visible cutout to the same enlarged battle-stage height across
   // playable characters, removing transparent source-image margins.
   const b=spriteAlphaBounds(img),scale=(h*1.12)/b.h,drawW=b.w*scale,drawH=b.h*scale;
   ctx.drawImage(img,b.x,b.y,b.w,b.h,x+(w-drawW)/2,baseY-drawH,drawW,drawH);
 }else if(art==='dawnBattle'){
   const b=spriteAlphaBounds(img),scale=(h*1.12)/b.h,drawW=b.w*scale,drawH=b.h*scale;
   ctx.drawImage(img,b.x,b.y,b.w,b.h,x+(w-drawW)/2,baseY-drawH,drawW,drawH);
  }else ctx.drawImage(img,x,top,w,h);
 }else silhouette(x,top,w,h,p.name);
 ctx.restore();
 const xx=x+camera.currentX*(view==='party'?.32:.52);
 if(view==='party'){
  rect(xx-16,top-60,w+32,40,select?'#3f3845ef':!eligible?'#24212fe7':'#1e2945df',select?'#ffe2a8':eligible?'#869ab0':'#655d6a',8);
  text(p.name,xx+w/2,top-41,p.test?16:19,p.hp<=0?'#c6acb0':'#f4edf8','800','center');
  if(p.hp<=0)text('K.O. • SLOT RETAINED',xx+w/2,top-77,14,'#ffbaba','800','center');
  line(xx-2,top-13,w+4,p.hp/p.maxHp,p.hp<=0?'#74525f':'#72e4b1','#454457',8);
  // Target test hit boxes do not affect actual healing or combat targeting logic.
  if((phase==='player'||allyTargeting)&&cameraPreview==='party')choiceRects.push({x:xx-19,y:top-82,w:w+38,h:h+114,action:'camera-select:'+p.id,enabled:eligible});
 }

}
function drawEnemy(t,shot){const all=combatEnemies();if(phase==='player'&&pendingTargetAction&&cameraPreview!=='party'&&previewTargetMode()==='aoe'&&all.length){ctx.save();ctx.strokeStyle='rgba(102,243,211,.82)';ctx.lineWidth=5;ctx.setLineDash([22,12]);ctx.beginPath();ctx.ellipse(1093+camera.currentX*.43,558,453,67,0,0,Math.PI*2);ctx.stroke();ctx.restore()}for(const e of all){
 const isFocus=phase==='player'&&chosenEnemy()?.id===e.id;
 const patternHit=phase==='player'&&!!pendingTargetAction&&cameraPreview!=='party'&&chooseAttackTargets(previewTargetMode()).some(x=>x.id===e.id);
 const isActor=(shot==='enemy-windup'&&actingEnemyId===e.id)||(fx?.kind==='enemy'&&fx?.actorEnemyId===e.id&&shot==='enemy-impact');
 const sh=isActor?1.09:shot==='attack-impact'&&fx?.targetEnemyId===e.id?1.045:1;
 const ww=e.w*sh,hh=e.h*sh,xx=e.x+camera.currentX*.43-(ww-e.w)/2,yy=e.y+(e.h-hh);
 const shimmer=isFocus?Math.sin(t*.004)*2:0;
 const zbHit=fx?.kind==='basic'&&fx?.actor==='zero'&&fx.targetEnemyId===e.id?t-fx.at:null;
  const hitKick=zbHit!==null&&zbHit>=645&&zbHit<745?Math.sin((zbHit-645)*.18)*(1-(zbHit-645)/100)*4:0;
 let spriteCenterY=yy+hh/2,spriteVisibleW=ww,spriteVisibleH=hh;const spriteOffsetX=shimmer+hitKick,spriteOffsetY=Math.sin(t*.0026+e.x)*2.2;
 ctx.save();ctx.globalAlpha=e.hp>0?1:Math.max(.02,.8-(t-fx.at)/1050);ctx.translate(spriteOffsetX,spriteOffsetY);
 ctx.beginPath();ctx.ellipse(xx+ww/2,yy+hh-4,ww*.48,13,0,0,Math.PI*2);ctx.fillStyle='#1b213c70';ctx.fill();
 if(images[e.battleSprite]?.complete&&images[e.battleSprite].naturalWidth){const img=images[e.battleSprite];ctx.imageSmoothingEnabled=e.battleSprite==='slimeBattle';const ratioParts=String(e.battleAspectRatio||'').split(':').map(Number),aspect=ratioParts.length===2&&ratioParts.every(Number.isFinite)&&ratioParts[0]>0&&ratioParts[1]>0?ratioParts[0]/ratioParts[1]:img.naturalWidth/img.naturalHeight,canvasW=Math.min(ww,hh*aspect),canvasH=canvasW/aspect,scaleX=canvasW/img.naturalWidth,scaleY=canvasH/img.naturalHeight,bounds=spriteAlphaBounds(img),drawW=bounds.w*scaleX,drawH=bounds.h*scaleY,drawX=xx+(ww-drawW)/2,drawY=yy+hh-drawH;spriteVisibleW=drawW;spriteVisibleH=drawH;spriteCenterY=drawY+drawH/2;ctx.drawImage(img,bounds.x,bounds.y,bounds.w,bounds.h,drawX,drawY,drawW,drawH)}
 ctx.restore();
 if(e.hp<=0)continue;
 if(isActor){ctx.strokeStyle='#b7e6ff';ctx.lineWidth=4;ctx.strokeRect(xx-8,yy-6,ww+16,hh+13)}
 if(patternHit){const ringRadius=Math.max(spriteVisibleW,spriteVisibleH)/2+8;ctx.beginPath();ctx.arc(xx+ww/2+spriteOffsetX,spriteCenterY+spriteOffsetY,ringRadius,0,Math.PI*2);ctx.strokeStyle='#55aaff';ctx.lineWidth=4;ctx.stroke()}
 rect(xx-3,yy-58,ww+6,30,'#1c2843e8','#8d96a9',6);
 text(e.name,xx+ww/2,yy-43,14,'#fff4e8','800','center');
 line(xx+2,yy-25,ww-4,e.maxBarrier?e.barrier/e.maxBarrier:0,'#c4c9d2','#626a75',8);
 line(xx+2,yy-13,ww-4,e.hp/e.maxHp,isFocus?'#ffd88e':'#ff8276','#4b2637',11);
 if(e.brokenTurns>0)text('BROKEN '+e.brokenTurns,xx+ww/2,yy+9,12,'#9cecff','800','center');
 if(phase==='player'&&!paused&&cameraPreview!=='party')choiceRects.push({x:xx-13,y:yy-64,w:ww+26,h:hh+74,action:'enemy-target:'+e.id,enabled:true});
 }}
function drawActorsForShot(t,shot){
 const view=shotWorld(shot)==='reverse'?'party':'command';
 if(view==='party'){
  const ordered=party.map(p=>({p,pos:cameraAllyPosition(p.id,'party')})).sort((a,b)=>a.pos.baseY-b.pos.baseY);
  for(const {p,pos} of ordered)drawUnit(p,pos,'party',t,p.id===selectedAllyId);
  return;
 }
 const ultimateActor=(pendingTargetAction?.action==='ultimate'&&party.find(p=>p.id===pendingTargetAction.actorId))||(ultimateExecuting&&lastAttack?.action==='ultimate'&&party.find(p=>p.id===lastAttack.actor));
 const chosen=ultimateActor|| (shot==='enemy-impact'?(party.find(p=>p.id===fx?.target)||active()||alive()[0]):active()||alive()[0]);
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
  text('SOUL  /  ULTIMATE',784,623,29,'#fff1cc','850','center');ctx.restore();
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
 if(!fx)return;const dt=t-fx.at;const fxDuration=fx.kind==='basic'&&fx.actor==='zero'?SOUL_BASIC_MS:950;if(dt>fxDuration){fx=null;return}
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
  const hits=fx.hits?.length?fx.hits:[{target:fx.target}];
  for(const hit of hits){const pos=cameraAllyPosition(hit.target,"command");if(!pos)continue;const xx=pos.x+pos.w/2,yy=pos.baseY-pos.h*.58;
   ctx.strokeStyle=`rgba(255,98,121,${1-q})`;ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(xx-65,yy-85);ctx.lineTo(xx+65,yy+70);ctx.stroke();}
 }
 ctx.restore();
 if(dt>100&&!(fx.kind==='basic'&&fx.actor==='zero')){if(fx.kind==='enemy'){
  const hits=fx.hits?.length?fx.hits:[{target:fx.target,damage:fx.damage}];for(const hit of hits){const pos=cameraAllyPosition(hit.target,"command");if(pos){text('-'+hit.damage,pos.x+pos.w/2,pos.baseY-pos.h*.73-70*q,42,hit.critical?'#ffd66e':'#ff9d9e','900','center');if(hit.critical)text('CRITICAL',pos.x+pos.w/2,pos.baseY-pos.h*.73-106*q,15,'#ffe9a9','900','center')}}
 }else{const foe=enemies.find(e=>e.id===fx.targetEnemyId)||fx.targetGeometry;const x=foe?foe.x+foe.w/2+camera.currentX*.43:1142,y=foe?foe.y+foe.h*.12:355;text('-'+fx.damage,x,y-70*q,42,'#fff0ba','900','center');for(const hit of lastAttack?.hits||[]){if(!hit.critical)continue;const target=enemies.find(e=>e.id===hit.target);if(target)text('CRITICAL',target.x+target.w/2+camera.currentX*.43,target.y+target.h*.05,15,'#ffe9a9','900','center')}}}
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
function hudStatusList(p){return [...(Array.isArray(p.hudStatuses)?p.hudStatuses:[]),...(p.tune?[{kind:'buff',icon:'♫',turns:p.tune.turns}]:[])]}
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
 const radius=sz*.29;
 const cx=x+sz-radius-4,cy=y+sz-radius-4;
 const queued=isUltPending(p.id),ready=canQueueUltimate(p),ko=p.hp<=0,selected=pendingTargetAction?.action==='ultimate'&&pendingTargetAction.actorId===p.id;
 // Keep a 44+-CSS-pixel-equivalent hit area in the portrait itself at phone scale.
 const hit=Math.min(106,sz-4);
 choiceRects.push({x:x+sz-hit-1,y:y+sz-hit-1,w:hit,h:hit,action:'queue-ult:'+p.id,enabled:ready});
 ctx.save();ctx.beginPath();ctx.rect(x,y,sz,sz);ctx.clip();
 if(ready){ctx.shadowColor='#ffdd93';ctx.shadowBlur=18;}
 hudCircle(cx,cy,radius,'#11233b',selected?'#55aaff':ready?'#ffdfa0':queued?'#e9b77d':'#90a6bc',selected?4:ready?4:2.5);
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
 // Wide lower-screen cards emphasize the portrait and ultimate while keeping HP and passive indicators legible.
 const cardW=248,cardH=194,gap=12,top=678,total=party.length*cardW+Math.max(0,party.length-1)*gap;
 let x=Math.max(16,Math.round((1060-total)/2));
 for(const p of party){
  const activeAlly=phase==='player'&&activeId===p.id&&p.hp>0,ko=p.hp<=0;
  const portraitX=x+12,portraitY=top+10,portraitSize=112;
  ctx.save();ctx.globalAlpha=ko?.57:activeAlly?1:.84;
  rect(x,top,cardW,cardH,'rgba(14,23,42,.96)',activeAlly?'#f3d79e':'rgba(129,164,191,.82)',12);
  hudPortrait(p.id==='zero'?images.zeroFront:p.id==='lily'?images.lilyFront:p.id==='dawn'?images.dawnFront:null,portraitX,portraitY,portraitSize,portraitSize,true);
  if(ko)rect(portraitX,portraitY,portraitSize,portraitSize,'rgba(30,17,23,.62)',null,10);
  drawAllyUltimate(p,x+95,top-11,136);
  drawAllyStatuses(p,portraitX,portraitY,portraitSize);
  text(ko?'0 / '+p.maxHp:`${p.hp} / ${p.maxHp}`,x+cardW-12,top+136,14,ko?'#f0afb7':'#e4f3ef','750','right');
  line(x+12,top+146,cardW-24,ko?0:p.hp/p.maxHp,ko?'#b16b76':'#67e3b4','#23374d',14);
  if(p.id==='zero'){
   const maximum=soulFollowUpLimit(),current=Math.max(0,Math.min(maximum,soulFollowUpProcs));
   const dotSize=12,pitch=22,rowWidth=(maximum-1)*pitch+dotSize,startX=x+(cardW-rowWidth)/2;
   for(let i=0;i<maximum;i++)hudCircle(startX+i*pitch+dotSize/2,top+174,dotSize/2,i<current?'#72d8f5':'rgba(65,84,108,.9)',i<current?'#d7f6ff':'#8295a9',1.8);
  }
  ctx.restore();
  x+=cardW+gap;
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
 const modes=[['single','SINGLE'],['blast','BLAST'],['aoe','AOE'],['five-hit','5-HIT']];
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
 for(let i=0;i<party.length;i++)hudButton(x+23+i*146,y+345,139,45,'charge-ult:'+party[i].id,'+ ENERGY '+(i+1),party[i].hp>0&&!paused&&!['intro','victory','defeat'].includes(phase));
 text('FUNDAMENTAL 05 — TURN TIMING TESTS',x+23,y+412,14,'#b9c8d8','800');
 hudButton(x+23,y+429,183,40,'f05-advance','ADVANCE +25%',phase==='player'&&!paused);
 hudButton(x+222,y+429,183,40,'f05-delay','DELAY 25%',phase==='player'&&!paused);
 hudButton(x+421,y+429,187,40,'f05-speed','SPEED x1.3',phase==='player'&&!paused);
 hudButton(x+23,y+476,282,40,'f05-summon-independent','INDEPENDENT SUMMON',phase==='player'&&!paused);
 hudButton(x+321,y+476,287,40,'f05-summon-controlled','CONTROLLED SUMMON',phase==='player'&&!paused);
 const actor=active(),prog=actor?progressFor(actor.id):null;
 text(`LEVEL / HP TEST • ${actor?actor.name+' LV '+prog?.level:'NO ACTIVE ALLY'} • MATERIALS & EQUIPMENT NOT DEFINED`,x+23,y+535,13,'#b9c8d8','750');
 const canAct=phase==='player'&&!paused&&!!actor;
 hudButton(x+23,y+548,141,40,'progress-test-level','LEVEL +1',canAct&&actor.level<characterLevelCap()&&(!ASCENSION_GATES.includes(actor.level)||prog.ascended.includes(actor.level)));
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
  else if(id==='lily')hudPortrait(images.lilyFront,xx+7,yy+5,49,44);
  else if(id==='dawn')hudPortrait(images.dawnFront,xx+7,yy+5,49,44);
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
  const p=active();text(p?.name||'ALLY',1070,620,17,'#fae3b9','800');
  const mode=previewTargetMode(),hits=pendingTargetAction?chooseAttackTargets(mode):[];
  text(pendingTargetAction?(pendingTargetAction.targetSide==='ally'?`SELECT ALLY FOR DAWN ${pendingTargetAction.action.toUpperCase()}`:`SELECT TARGET FOR ${pendingTargetAction.action.toUpperCase()} • ${hits.length} TARGETS`):'SELECT BASIC, SKILL OR ULTIMATE',1190,620,15,'#d4e9f4','700');
  if(pendingTargetAction)addButton(1102,642,180,30,'cancel-target','CANCEL TARGET');
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
  {key:'skill',cx:1508,cy:800,r:64,enabled:playerReady&&sp>0,icon:'✦',label:activeId==='zero'?'ENHANCE '+soulEnhanceStacks:activeId==='dawn'?'TUNE':'SKILL'},
 ];
 for(const a of actions){
  const enabled=a.enabled,selected=pendingTargetAction?.action===a.key&&pendingTargetAction.actorId===activeId;
  choiceRects.push({x:a.cx-a.r-5,y:a.cy-a.r-5,w:(a.r+5)*2,h:(a.r+5)*2,action:a.key,enabled});
  hudCircle(a.cx,a.cy,a.r,selected?'rgba(44,77,110,.98)':enabled?'rgba(29,48,70,.97)':'rgba(19,32,49,.87)',selected?'#55aaff':enabled?'#fff0c3':'#738092',4);
  hudCircle(a.cx,a.cy,a.r-9,'rgba(13,25,45,.58)',selected?'rgba(134,204,255,.88)':enabled?'rgba(130,193,220,.54)':'rgba(82,100,121,.30)',2);
  text(a.icon,a.cx,a.cy-12,a.key==='skill'?43:41,enabled?'#f5f7ff':'#8897a9','850','center');
  text(a.label,a.cx,a.cy+31,a.key==='skill'?18:16,enabled?'#fff5dc':'#a0aebc','850','center');
 }
 ctx.restore();
 if(ultimateQueue.length){const names=ultimateQueue.map(q=>party.find(p=>p.id===q.actorId)?.name||q.actorId).join(' → ');rect(965,769,287,38,'rgba(28,35,49,.82)','rgba(219,195,130,.53)',10);text(`ULT QUEUE ${names.slice(0,23)}`,978,788,14,'#f3e3bc','750')}
 if(phase==='player'&&log){text(log.length>84?log.slice(0,83)+'…':log,730,742,14,'#d7e1ed','550')}
 if(devPanelOpen&&!['victory','defeat'].includes(phase))drawDeveloperPanel();
 if(paused)drawPause();if(phase==='victory'||phase==='defeat')drawResult();
}
function drawPause(){rect(0,0,W,H,'rgba(2,5,15,.68)');rect(366,220,868,443,'#101729f4','#e4cda4',18);text('PAUSED • PARTY LOCKED',800,293,39,'#fff3e9','800','center');text('Testing controls below are NOT approved gameplay mechanics.',800,351,22,'#d6dceb','600','center');addButton(465,420,230,90,'test-ko','DEBUG: K.O.','Knock out non-active ally');addButton(714,420,230,90,'test-revive','DEBUG: REVIVE','Restore same party slot');addButton(964,420,180,90,'unpause','RESUME','');addButton(630,559,220,66,'restart','RESTART BATTLE','');addButton(868,559,210,66,'main-menu','MAIN MENU','')}
function drawResult(){
 rect(0,0,W,H,'rgba(3,7,15,.72)');
 rect(310,215,980,460,'rgba(13,21,38,.98)',color.gold,20);
 text(phase==='victory'?'VICTORY':'DEFEAT',800,317,58,phase==='victory'?'#f7dd9f':'#f29ba4','900','center');
 text(phase==='victory'?'All '+totalEnemyDefeats+' enemies defeated across '+wavePlan.length+' waves.':'All allies have fallen in training.',800,397,27,'#edf2f7','600','center');
 text('Turns processed: '+turn+'    Party: '+party.length+'/'+MAX_PARTY_SIZE,800,447,20,'#a9bcce','500','center');
 addButton(430,532,220,90,'restart','REPLAY','Same party');
 addButton(690,532,220,90,'change-team','PARTY','Manage members');
 addButton(950,532,220,90,'main-menu','MAIN MENU','');
}
function drawSetup(){
 rect(0,0,W,H,'rgba(4,8,20,.77)');
 rect(180,74,1240,760,'rgba(13,20,39,.98)','#ccb88e',20);
 text('STORY BATTLE SETUP',228,133,39,'#ffedd1','850');
 addButton(1234,96,160,52,'main-menu','MAIN MENU','');
 text('Party membership is managed from Party on the main menu.',231,180,18,'#c4d6e5','550');
 text('CURRENT PARTY  '+draft.length+'/'+MAX_PARTY_SIZE,240,231,20,'#bad4e9','800');
 for(let i=0;i<MAX_PARTY_SIZE;i++){
  const x=218+i*285,y=256,w=260,h=142,p=roster(draft[i]);
  rect(x,y,w,h,p?'rgba(38,54,79,.94)':'rgba(21,33,56,.88)',p?'#9eb8d3':'#4c607a',12);
  text(p?p.name:'EMPTY',x+w/2,y+58,20,p?'#f6eefa':'#8494a9','800','center');
  if(p)text(p.test?'TEST PLACEHOLDER':'LEVEL '+progressFor(p.id).level,x+w/2,y+96,14,p.test?'#e5ca99':'#c4d6e5','600','center');
 }
 text('BATTLE TEST OPTIONS',240,467,19,'#bad4e9','800');
 text('TEST WAVES: '+(waveOverride||WAVE_PRESETS[wavePreset]).join(' + ')+'  UP TO 5 ACTIVE',240,510,17,'#d2ddec','650');
 addButton(240,542,250,58,'toggle-waves','CHANGE WAVES','');
 text('ENEMY ROSTER — CHOOSE ONE',240,626,17,'#d2ddec','650');
 for(const [i,mode] of ['slime','wolf','mixed'].entries())addButton(240+i*166,655,154,52,'roster-'+mode,mode.toUpperCase(),enemyRosterMode===mode?'SELECTED':'');
 text('TRAINING RECOVERY: '+(trainingRecoveryMode==='restore'?'RESTORE FULL HP':'PRESERVE HP')+'  TEST ONLY',538,510,16,'#d2ddec','650');
 addButton(538,542,470,58,'toggle-recovery','TOGGLE HP RECOVERY MODE',trainingRecoveryMode==='restore'?'CURRENT: RESTORE':'CURRENT: PRESERVE');
 addButton(1039,733,313,79,'start','START BATTLE','Current party',validTeam(draft));
}
function drawHint(t){if(hint&&t-hintAt<2300){rect(474,393,652,76,'rgba(15,21,39,.98)','#e6b98a',12);text(hint,800,431,20,'#fff4e8','700','center')}}
function loop(t){choiceRects=[];ctx.clearRect(0,0,W,H);if(phase==='menu'){drawMainMenu()}else if(phase==='partySetup'){drawPartySetup()}else if(phase==='loadout'){drawLoadout()}else if(phase!=='setup'){
  const hit=zeroBasicStage(t);ctx.save();if(hit!==null&&hit>=645&&hit<=760){const q=1-(hit-645)/115;ctx.translate(Math.sin(hit*.42)*q*4,Math.cos(hit*.33)*q*2.5)}
  drawCameraStage(t);drawFx(t);ctx.restore();drawHud(t)
 }else{drawCameraStage(t);drawSetup()}drawHint(t);requestAnimationFrame(loop)}
function choose(x,y){for(let i=choiceRects.length-1;i>=0;i--){const b=choiceRects[i];if(x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)continue;if(!b.enabled){say('Action not currently available.');return}const cmd=b.action;if(cmd.startsWith('roster-')){setEnemyRoster(cmd.slice(7));return}if(cmd.startsWith('loadout:')){handleLoadoutAction(cmd.slice(8));return}if(cmd.startsWith('add:')){addUnit(cmd.slice(4));return}if(cmd.startsWith('remove:')){removeUnit(Number(cmd.slice(7)));return}if(cmd==='dev-panel-toggle'){devPanelOpen=!devPanelOpen;return}if(cmd==='cancel-target'){cancelTargetSelection();return}if(cmd.startsWith('enemy-target:')){setEnemyTarget(cmd.slice(13));return}if(cmd.startsWith('camera-select:')){if(cameraPreview==='party'&&(phase==='player'||pendingTargetAction?.targetSide==='ally')){const id=cmd.slice(14),p=party.find(p=>p.id===id);if(pendingTargetAction?.targetSide==='ally'){if(!p||p.hp<=0){say('Tune and Dawn’s Ultimate need a living ally.');return}const pending=pendingTargetAction,actor=party.find(x=>x.id===pending.actorId);pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;if(pending.action==='ultimate')return queueUltimate(pending.actorId,id);return executeCombatAction(actor,pending.action,null,id)}if(supportDemo&&!eligibleAllyTarget(p,supportDemo)){say('Not eligible for this support test.');return}selectedAllyId=id;say((supportDemo?'TARGET TEST: ':'CAMERA TEST: ')+(p?.name||id)+' selected.')}return}if(cmd.startsWith('mode:')){setTargetingMode(cmd.slice(5));return}if(cmd.startsWith('queue-ult:')){beginTargetSelection('ultimate',cmd.slice(10));return}if(cmd.startsWith('charge-ult:')){chargeUltimateForTest(cmd.slice(11));return}
 switch(cmd){case 'open-story':enterSelection();break;case 'open-party':enterPartySetup();break;case 'open-loadout':enterLoadout();break;case 'save-party':saveParty();break;case 'main-menu':enterMainMenu();break;case 'support-heal':startSupportDemo('heal');break;case 'support-revive':startSupportDemo('revive');break;case 'confirm-support':confirmSupportDemo();break;case 'cancel-support':cancelSupportDemo();break;case 'camera-party':if(phase==='player'&&!paused){cameraPreview=cameraPreview==='party'?null:'party';supportDemo=null;selectedAllyId=activeId}break;case 'camera-target':if(phase==='player'&&!paused){cameraPreview=cameraPreview==='target'?null:'target';selectedAllyId=null;if(cameraPreview==='target')say('Tap an automaton to set the target.')}break;case 'reset-draft':draft=loadTeam();break;case 'toggle-waves':toggleWavePreset();break;case 'toggle-recovery':setTrainingRecoveryMode(trainingRecoveryMode==='restore'?'preserve':'restore');break;case 'start':startBattle();break;case 'restart':replay();break;case 'change-team':enterPartySetup();break;case 'forced-select':enterPartySetup();break;case 'pause':if(phase!=='player'&&!paused){say('Pause is available on your turn.');return}paused=!paused;break;case 'unpause':paused=false;break;case 'test-ko':testKO();break;case 'test-revive':testRevive();break;case 'skill':play('skill');break;case 'cap-test':cycleSpCapTest();break;case 'hud-status-test':toggleHudStatusDemo();break;case 'f05-advance':addActionAdvance(activeId,25);break;case 'f05-delay':addActionDelay(activeId,25);break;case 'f05-speed':setSpeedMultiplierForTest(activeId,(speedModifiers[activeId]||1)>=1.3?1:1.3);break;case 'f05-summon-independent':queueSummonForTest('independent');break;case 'f05-summon-controlled':queueSummonForTest('controlled');break;
 case 'progress-test-level':{const a=active(),p=a&&progressFor(a.id);if(a&&p){const cost=Math.max(1,requiredExp(a.level)-p.exp),result=testGrantExp(a.id,cost);say(result?`TEST ONLY: level ${result.level}, ${cost} EXP injected.`:'Ascension required or level cap reached.');}break}
 case 'progress-test-ascend':{const a=active();if(a)say(testAscend(a.id)?`TEST ONLY: level ${a.level} ascension unlocked (no materials).`:'Not at a locked ascension gate.');break}
 case 'hp-test-flat':{const a=active();if(a)setHpBonusForTest(a.id,'debug-flat','flat',(a.hpFlatModifiers['debug-flat']||0)+20);break}
 case 'hp-test-percent':{const a=active();if(a)setHpBonusForTest(a.id,'debug-percent','percent',(a.hpPercentModifiers['debug-percent']||0)+.2);break}default:zeroSkillArmed=false;play(cmd)}return}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();choose((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingTargetAction)cancelTargetSelection();if(e.key==='1')play('basic');if(e.key==='2')play('skill');if(e.key==='3')play('ultimate');if(e.key.toLowerCase()==='m'&&phase==='player')cycleSpCapTest();if(['q','w','e','f'].includes(e.key.toLowerCase())&&phase==='player')setTargetingMode(({q:'single',w:'blast',e:'aoe',f:'five-hit'})[e.key.toLowerCase()]);if(e.key.toLowerCase()==='v'&&phase==='player'){cameraPreview=cameraPreview==='party'?null:'party';selectedAllyId=activeId}if(e.key.toLowerCase()==='t'&&phase==='player')cameraPreview=cameraPreview==='target'?null:'target';if(e.key.toLowerCase()==='r'&&phase!=='setup')replay()});window.addEventListener('contextmenu',e=>e.preventDefault());
// Read-only instrumentation and explicitly labeled testing helpers for verification.
window.twoToneStatus=()=>({phase,paused,turn,enemyRosterMode,plannedEnemyArchetypes:wavePlan.map(wave=>wave.map(enemy=>enemy.archetypeId)),devPanelOpen,targetingMode,pendingTargetAction,zeroSkillArmed,previewTargetMode:previewTargetMode(),supportDemo,attackInProgress,pendingVacancies:[...pendingVacancies],lastAttack:lastAttack?JSON.parse(JSON.stringify(lastAttack)):null,supportTestHistory:supportTestHistory.slice(),previewTargetIds:chooseAttackTargets(previewTargetMode()).map(e=>e.id),enemyCountTotal:wavePlan.reduce((n,w)=>n+w.length,0),selectedEnemyId,actingEnemyId,enemies:enemies.map(e=>({id:e.id,hp:e.hp,maxHp:e.maxHp,barrier:e.barrier,maxBarrier:e.maxBarrier,brokenTurns:e.brokenTurns,x:e.x,y:e.y,slot:e.slot,wave:e.wave,order:e.order,alive:e.hp>0})),wave:{number:waveIndex+1,total:wavePlan.length,sizes:wavePlan.map(w=>w.length),active:enemies.length,reserve:waveQueue.length,defeated:waveKills,totalDefeated:totalEnemyDefeats,cleared:encounterCleared,spawnHistory:spawnHistory.slice()},gauges:{...gauges},party:party.map(p=>({id:p.id,hp:p.hp,maxHp:p.maxHp,energy:p.energy,energyReserved:p.energyReserved||0,availableEnergy:availableEnergy(p),slot:party.indexOf(p)+1,test:p.test})),draft:[...draft],activeId,enemyHp,sp,spMax:effectiveSpMax(),spCapModifiers:{...spCapModifiers},ultimateQueue:ultimateQueue.map(q=>({...q})),ultimateExecuting,ultimateResumePending:!!ultimateResume,ultimateHistory:ultimateHistory.slice(),order:getOrder(5),summonSlotsUsed:summons.filter(s=>!s.pendingCreation).length,summons:summons.map(s=>({...s})),summonHistory:summonHistory.slice(),turnTimeline:turnTimeline.snapshot(),speedModifiers:{...speedModifiers},visibleAllyIds:cameraShot()==='party'?party.map(p=>p.id):[cameraShot()==='enemy-impact'?fx?.target:(activeId||alive()[0]?.id)].filter(Boolean),visibleEnemyIds:cameraShot()==='party'?[]:combatEnemies().map(e=>e.id),camera:{shot:cameraShot(),world:shotWorld(cameraShot()),panX:camera.currentX??0,transition:camera.progress,preview:cameraPreview,selectedAllyId,parallaxRates:[.04,.13,.32,.72,1.18],hudDrawnAfterScene:true},stagePositions:party.map(p=>({id:p.id,position:cameraAllyPosition(p.id,cameraShot()==='party'?'party':'command')}))});
window.twoToneUi=()=>({hudPortraits:party.map(p=>({id:p.id,scale:(phase==='player'&&activeId===p.id&&p.hp>0)?1:.9,energyFill:isUltPending(p.id)?0:Math.max(0,Math.min(1,availableEnergy(p)/ULTIMATE_ENERGY_COST)),statusCount:hudStatusList(p).length})),version:'v0.0.17',debugOpen:devPanelOpen,buttons:choiceRects.map(b=>({...b}))});
window.twoToneProgress=()=>({playerRank,rankProgressionImplemented:false,maxLevel:characterLevelCap(),absoluteMaxLevel:CHARACTER_MAX_LEVEL,ascensionGates:[...ASCENSION_GATES],recoveryMode:trainingRecoveryMode,
 characters:ROSTER.map(r=>({id:r.id,level:progressFor(r.id).level,levelCap:characterLevelCap(),exp:progressFor(r.id).exp,ascended:[...progressFor(r.id).ascended],requiredExp:progressFor(r.id).level<characterLevelCap()?requiredExp(progressFor(r.id).level):0,baseHpTestOnly:r.hp})),
 unitHP:party.map(p=>({id:p.id,level:p.level,baseHpTestOnly:p.baseHp,maxHp:p.maxHp,currentHp:p.hp,flat:{...p.hpFlatModifiers},percent:{...p.hpPercentModifiers}})),
 unitPhysicalAttack:party.map(p=>({id:p.id,level:p.level,basePhysicalAttack:p.basePhysicalAttack,physicalAttack:calculatePhysicalAttack(p),flat:{...p.physicalAttackFlatModifiers},percent:{...p.physicalAttackPercentModifiers}})),
 unitMagicalAttack:party.map(p=>({id:p.id,level:p.level,baseMagicalAttack:p.baseMagicalAttack,magicalAttack:calculateMagicalAttack(p),flat:{...p.magicalAttackFlatModifiers},percent:{...p.magicalAttackPercentModifiers}})),
 unitPhysicalDefense:party.map(p=>({id:p.id,level:p.level,basePhysicalDefense:p.basePhysicalDefense,physicalDefense:calculatePhysicalDefense(p),flat:{...p.physicalDefenseFlatModifiers},percent:{...p.physicalDefensePercentModifiers}})),
 unitMagicalDefense:party.map(p=>({id:p.id,level:p.level,baseMagicalDefense:p.baseMagicalDefense,magicalDefense:calculateMagicalDefense(p),flat:{...p.magicalDefenseFlatModifiers},percent:{...p.magicalDefensePercentModifiers}})),
 unitTrueDamageBasis:party.map(p=>({id:p.id,trueAttack:calculateTrueAttack(p),trueDefense:calculateTrueDefense(p),selfTrueDamageReduction:calculateTrueDamageReduction(p,p)}))});
window.twoToneTest={testGrantExp,testAscend,setPlayerRankForTest,setHpBonusForTest,calculateMaxHp,calculateLevelScaledStat,calculatePhysicalAttack,calculateMagicalAttack,calculatePhysicalDefense,calculateMagicalDefense,calculateTrueAttack,calculateTrueDefense,calculateTrueDamageReduction,calculateDamageAfterDefense,calculatePhysicalDamageAfterDefense,calculateMagicalDamageAfterDefense,calculateTrueDamageAfterDefense,calculateTypedActionDamage,requiredExp,setTrainingRecoveryMode,roundHp,addActionAdvance,addActionDelay,setSpeedMultiplierForTest,queueSummonForTest,turnTimelineSnapshot:()=>turnTimeline.snapshot(),queueUltimate,chargeUltimateForTest,toggleHudStatusDemo,setHudStatusesForTest:(id,items)=>{const p=party.find(p=>p.id===id);if(!p||!Array.isArray(items)||items.length>80)return false;p.hudStatuses=items.map(e=>({kind:e.kind==='debuff'?'debuff':'buff',icon:String(e.icon||'✦').slice(0,2),turns:e.turns===null?null:(Number.isInteger(e.turns)&&e.turns>=0?e.turns:null)}));return true;},setSpCapTestSource,cycleSpCapTest,canQueueUltimate,debugKOForTest:(id)=>{if(['setup','intro','victory','defeat'].includes(phase))return false;const p=party.find(p=>p.id===id);if(!p||p.hp<=0)return false;p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();return true},startBattle,addUnit,removeUnit,enterSelection,enterPartySetup,saveParty,testKO,testRevive,play,replay,zeroSkillControl,setTargetingMode,startSupportDemo,confirmSupportDemo,cancelSupportDemo,eligibleAllyTarget:(id,kind)=>eligibleAllyTarget(party.find(p=>p.id===id),kind),setEnemyHpForTest:(id,hp)=>{if(phase!=='player'||attackInProgress)return false;const e=liveEnemies().find(e=>e.id===id);if(!e||!Number.isFinite(hp)||hp<1||hp>e.maxHp)return false;e.hp=hp;syncEnemyHp();return true},setEnemyTarget,setWavePlanForTest,toggleWavePreset,setEnemyRoster,debugDefeatEnemy:(id)=>{const e=liveEnemies().find(e=>e.id===id);if(!e||phase==='setup'||phase==='victory'||phase==='defeat')return false;e.hp=0;resolveEnemyDefeat(e);return true;},selectEnemy:(id)=>setEnemyTarget(id),setCameraPreview:(view)=>{if(phase==='player'){cameraPreview=view;selectedAllyId=activeId}},cameraStatus:()=>cameraShot()};
window.zeroBasicAnimationDebug=()=>({durationMs:SOUL_BASIC_MS,elapsed:fx?.kind==='basic'&&fx.actor==='zero'?Math.max(0,performance.now()-fx.at):null,active:zeroBasicStage(performance.now())!==null,assets:['zero','zeroBasicWindup','zeroBasicSlash'].map(id=>({id,loaded:!!images[id]?.complete&&!!images[id]?.naturalWidth}))});
requestAnimationFrame(loop);
