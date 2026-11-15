'use strict';
const sources={arena:'/assets/embedded-image-01.png',area1Background:'/assets/area-1-meadow.jpg',soul:'/assets/soul-battle-standard.png',soulBattleStandard:'/assets/soul-battle-standard.png',soulBattlePremium:'/assets/soul-battle-premium.png',lily:'/assets/lily-front.png',lilyFront:'/assets/lily-front.png',lilyBack:'/assets/lily-back.png',dawnBattle:'/assets/dawn-battle.png',dawnFront:'/assets/dawn-front.png',loganBattle:'/assets/logan.png',loganFront:'/assets/logan-front.png',loganPortrait:'/assets/logan-front.png',enemy:'/assets/embedded-image-03.png',slimeBattle:'/assets/slime.png',slimeLeaderBattle:'/assets/slime-leader.png',slimeLeaderArtwork:'/assets/slime-leader.png',slimeMonsterBattle:'/assets/slime-monster.png',slimeMonsterArtwork:'/assets/slime-monster.png',wolfBattle:'/assets/wolf.png',wolfArtwork:'/assets/wolf-artwork.png',slimeArtwork:'/assets/slime-artwork.jpg',portrait:'/assets/embedded-image-04.png',soulFront:'/assets/soul-portrait.png',soulWeaponStandard:'/assets/soul-weapon-standard.png',soulWeaponPremium:'/assets/soul-weapon-premium.png',zeroFront:'/assets/zero.png',zeroBattle:'/assets/zero-battle.png',architectureLayer:'/assets/embedded-image-06.png',floorLayer:'/assets/embedded-image-07.png',treeLayer:'/assets/embedded-image-08.png',enchantedBottleSmall:'/assets/enchanted-bottle-small.png',enchantedBottleMedium:'/assets/enchanted-bottle-medium.png',enchantedBottleLarge:'/assets/enchanted-bottle-large.png',enchantedBookSmall:'/assets/enchanted-book-small.png',enchantedBookMedium:'/assets/enchanted-book-medium.png',enchantedBookLarge:'/assets/enchanted-book-large.png',core:'/assets/core.png',gem:'/assets/gem.png',coin:'/assets/coins.png'};
const BATTLE_AREAS=Object.freeze({
 'area-1':Object.freeze({name:'Area 1',background:'area1Background'})
});
const DEFAULT_BATTLE_AREA_ID='area-1';
const ANIMATION_STEP_MS=250;
const CAMERA_TRANSITION_SAME_VIEW_MS=ANIMATION_STEP_MS;
const CAMERA_TRANSITION_BETWEEN_SIDES_MS=ANIMATION_STEP_MS*2;
const ENEMY_WINDUP_MS=ANIMATION_STEP_MS*3;
const COMBAT_ACTION_EFFECT_MS=ANIMATION_STEP_MS*4;
const ENEMY_ATTACK_EFFECT_MS=ANIMATION_STEP_MS*4;
const COMBAT_ACTION_PHASE_GAP_MS=ANIMATION_STEP_MS*2;
const ULTIMATE_PRESENTATION_MS=ANIMATION_STEP_MS*6;
const ENEMY_DEATH_BEAT_MS=ANIMATION_STEP_MS*2;
const ENEMY_REINFORCEMENT_ENTRY_MS=ANIMATION_STEP_MS*2;
const ULTIMATE_CAMERA_INTRO_MS=ANIMATION_STEP_MS*2;
const ACTION_VISUALS=Object.freeze({
 soul:Object.freeze({basic:'soul-sword',skill:'soul-enhance',ultimate:'soul-storm'}),
 zero:Object.freeze({basic:'zero-cut',skill:'zero-first-strike',ultimate:'zero-execution'}),
 lily:Object.freeze({basic:'lily-petal',skill:'lily-ricochet',ultimate:'lily-haunting'}),
 dawn:Object.freeze({basic:'dawn-star',skill:'dawn-tune',ultimate:'dawn-advance'}),
 logan:Object.freeze({basic:'logan-blood-slash',skill:'logan-blood-shield',ultimate:'logan-red-tide'})
});
const ALLY_ACTION_TARGET_MODES=Object.freeze({logan:Object.freeze({skill:'allAllies'})});
const ENEMY_ACTION_VISUALS=Object.freeze({
 slime:Object.freeze({basic:'enemy-slime-acid'}),wolf:Object.freeze({basic:'enemy-wolf-claw'}),
 'slime-leader':Object.freeze({basic:'slime-leader-blast'}),'slime-monster':Object.freeze({basic:'slime-monster-wave'})
});

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

sources.soulBasicWindup='/assets/embedded-image-09.png';
sources.soulBasicSlash='/assets/embedded-image-10.png';
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
const DEV_MODE=new URLSearchParams(location.search).get('dev')==='1';
function toggleGameMode(){const url=new URL(location.href);if(DEV_MODE)url.searchParams.delete('dev');else url.searchParams.set('dev','1');location.assign(url.toString())}
const W=1600,H=900;
const TEAM_KEY=DEV_MODE?'two-tone-dev-team-fundamental-1-v1':'two-tone-demo-team-fundamental-1-v1';
const PROGRESSION_KEY=DEV_MODE?'two-tone-dev-character-progress-v1':'two-tone-character-progress-v1',VITALS_KEY=DEV_MODE?'two-tone-dev-character-vitals-v1':'two-tone-character-vitals-v1',LOADOUT_KEY=DEV_MODE?'two-tone-dev-character-loadouts-v1':'two-tone-character-loadouts-v1',ITEM_INVENTORY_KEY=DEV_MODE?'two-tone-dev-item-inventory-v1':'two-tone-item-inventory-v1',STORE_COINS_KEY=DEV_MODE?'two-tone-dev-store-coins-v1':'two-tone-store-coins-v1',PLAYER_RANK_KEY=DEV_MODE?'two-tone-dev-player-rank-v1':'two-tone-player-rank-v1',CHARACTER_ID_SCHEMA_KEY=DEV_MODE?'two-tone-dev-character-id-schema-v2':'two-tone-character-id-schema-v2';
const STARTING_STATE_MIGRATION_KEY='two-tone-regular-starting-state-v1';
function moveLegacyCharacterRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 if(value.soul===undefined&&value.zero!==undefined)value.soul=value.zero;
 delete value.zero;return value;
}
function migrateLegacyCharacterIds(){
 try{
  if(localStorage.getItem(CHARACTER_ID_SCHEMA_KEY)==='soul-zero-v2')return;
  const team=JSON.parse(localStorage.getItem(TEAM_KEY)||'null');
  if(Array.isArray(team)){const migrated=team.map(id=>id==='zero'?'soul':id);localStorage.setItem(TEAM_KEY,JSON.stringify(migrated))}
  for(const key of [PROGRESSION_KEY,VITALS_KEY,LOADOUT_KEY]){
   const raw=localStorage.getItem(key);if(raw===null)continue;
   const data=moveLegacyCharacterRecord(JSON.parse(raw));localStorage.setItem(key,JSON.stringify(data));
  }
  localStorage.setItem(CHARACTER_ID_SCHEMA_KEY,'soul-zero-v2');
 }catch(e){}
}
migrateLegacyCharacterIds();
function migrateRegularStartingState(){
 if(DEV_MODE)return;
 try{
  if(localStorage.getItem(STARTING_STATE_MIGRATION_KEY)==='v1')return;
  // Remove prototype test grants/previews from the old shared Regular profile.
  localStorage.setItem(STORE_COINS_KEY,'0');
  const saved=JSON.parse(localStorage.getItem(TEAM_KEY)||'null');
  if(Array.isArray(saved)&&JSON.stringify(saved)===JSON.stringify(['soul','lily','dawn']))localStorage.setItem(TEAM_KEY,JSON.stringify(['soul']));
  const loadouts=JSON.parse(localStorage.getItem(LOADOUT_KEY)||'null');
  if(loadouts&&typeof loadouts==='object'&&!Array.isArray(loadouts)){
   for(const record of Object.values(loadouts))if(record&&typeof record==='object'){
    record.characterDuplicates=0;
    if(record.weapon&&typeof record.weapon==='object'){record.weapon.standardPotential=1;record.weapon.premiumPotential=1}
    if(Array.isArray(record.runes))record.runes=[null,null,null,null];
   }
   localStorage.setItem(LOADOUT_KEY,JSON.stringify(loadouts));
  }
  localStorage.setItem(STARTING_STATE_MIGRATION_KEY,'v1');
 }catch(e){}
}
migrateRegularStartingState();
const CHARACTER_MAX_LEVEL=50,ASCENSION_GATES=[10,20,30,40],MAX_PARTY_SIZE=4;
// Rank progression is not implemented yet; this value is the account Rank hook.
function loadPlayerRank(){try{const n=Number(localStorage.getItem(PLAYER_RANK_KEY));return Number.isInteger(n)&&n>=1&&n<=50?n:1}catch(e){return 1}}
function savePlayerRank(){try{localStorage.setItem(PLAYER_RANK_KEY,String(playerRank))}catch(e){}}
let playerRank=loadPlayerRank();
// Numerical Base HP values are inherited/development-only combat fixtures, NOT
// approved per-character stats. The unnamed units remain developer test slots.
const ROSTER=[
 {id:'soul',name:'SOUL',label:'Character',hp:100,basePhysicalAttack:20,baseMagicalAttack:20,basePhysicalDefense:4,baseMagicalDefense:4,speed:20,lifesteal:0,art:'soul',test:false},
 {id:'zero',name:'ZERO',label:'Character',hp:50,basePhysicalAttack:40,baseMagicalAttack:0,basePhysicalDefense:2,baseMagicalDefense:2,speed:40,lifesteal:0,art:'zeroBattle',test:false,passive:{id:'cutthroat',criticalRateBonus:.1,criticalDamageBonus:.25}},
 {id:'lily',name:'LILY',label:'Character',hp:100,basePhysicalAttack:0,baseMagicalAttack:30,basePhysicalDefense:4,baseMagicalDefense:4,speed:30,lifesteal:0,art:'lily',test:false},
 {id:'dawn',name:'DAWN',label:'Character',hp:50,basePhysicalAttack:0,baseMagicalAttack:40,basePhysicalDefense:2,baseMagicalDefense:6,speed:30,lifesteal:0,art:'dawn',test:false},
 {id:'logan',name:'LOGAN',label:'Character',hp:200,basePhysicalAttack:10,baseMagicalAttack:0,basePhysicalDefense:6,baseMagicalDefense:6,speed:10,lifesteal:0,art:'logan',test:false},
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
 return calculateLevelScaledStat(unit.basePhysicalAttack,unit.level,unit.physicalAttackFlatModifiers||{},{...(unit.physicalAttackPercentModifiers||{}),dawnTune:unit.tune?.attackBonus||0,bloodShield:loganShieldAttackBonus(unit)},unit.physicalAttackEquipmentFlatModifiers||{});
}
function calculateMagicalAttack(unit){
 if(!unit||!Number.isFinite(unit.baseMagicalAttack))return null;
 return calculateLevelScaledStat(unit.baseMagicalAttack,unit.level,unit.magicalAttackFlatModifiers||{},{...(unit.magicalAttackPercentModifiers||{}),dawnTune:unit.tune?.attackBonus||0,bloodShield:loganShieldAttackBonus(unit)},unit.magicalAttackEquipmentFlatModifiers||{});
}
function loganShieldAttackBonus(unit){return unit?.shield>0&&premiumWeaponDuplicateRank('logan')>=4&&party.some(member=>member.id==='logan')?.2:0}
const RESIDUE_RULES=Object.freeze({maxStacks:5,damageReductionPerStack:.05,resistanceReductionPerStack:.05,durationTurns:2});
function residueStacksOf(unit){return Math.max(0,Math.min(unit?.residueMaxStacks||RESIDUE_RULES.maxStacks,Number.isInteger(unit?.residueStacks)?unit.residueStacks:0))}
function residueReduction(unit){return residueStacksOf(unit)*(unit?.residueResistanceReductionPerStack??RESIDUE_RULES.resistanceReductionPerStack)}
function damageDealtMultiplier(unit){return 1-residueStacksOf(unit)*(unit?.residueDamageReductionPerStack??RESIDUE_RULES.damageReductionPerStack)}
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
function defenseIgnoreOf(attacker){return Math.min(1,Math.max(0,(Number.isFinite(attacker?.tune?.defenseIgnore)?attacker.tune.defenseIgnore:0)+(Number.isFinite(attacker?.passive?.defenseIgnore)?attacker.passive.defenseIgnore:0)))}
function calculateTrueDamageReduction(attacker,target){
 const physicalAttack=calculatePhysicalAttack(attacker),magicalAttack=calculateMagicalAttack(attacker);
 const defenseIgnore=defenseIgnoreOf(attacker);
 const residueFactor=1-residueReduction(target),physicalDefense=calculatePhysicalDefense(target)*residueFactor*(1-defenseIgnore),magicalDefense=calculateMagicalDefense(target)*residueFactor*(1-defenseIgnore);
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
 const defenseIgnore=defenseIgnoreOf(attacker),effectiveDefense=defense*(1-residueReduction(target));
 let reduction=type==='true'?calculateTrueDamageReduction(attacker,target):(Number.isFinite(attack)&&attack>0&&Number.isFinite(effectiveDefense)&&effectiveDefense>=0?Math.min(effectiveDefense*(1-defenseIgnore)/attack,1):null);
 if(target?.marks?.some(m=>m.id==='exposed'))reduction=Math.max(0,reduction*Math.pow(.9,target.marks.filter(m=>m.id==='exposed').length));
 if(!Number.isFinite(attack)||attack<=0||!Number.isFinite(defense)||defense<0||!Number.isFinite(reduction))return null;
 const damageBeforeDefense=attack*attackRate*damageDealtMultiplier(attacker);
 return {type,attackBasis:attack,defenseBasis:effectiveDefense*(1-defenseIgnore),attackRate,damageBeforeDefense,reduction,damageTaken:roundHp(damageBeforeDefense*(1-reduction))};
}
function criticalRateOf(unit){return Math.min(1,Math.max(0,(Number.isFinite(unit?.criticalRate)?unit.criticalRate:.1)+(Number.isFinite(unit?.criticalRateBonus)?unit.criticalRateBonus:0)+(unit?.passive?.criticalRateBonus||0)+(unit?.tune?.criticalRateBonus||0)+Object.values(unit?.criticalRateModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0)))}
function criticalDamageOf(unit){return Math.max(0,(Number.isFinite(unit?.criticalDamage)?unit.criticalDamage:.5)+(Number.isFinite(unit?.criticalDamageBonus)?unit.criticalDamageBonus:0)+(unit?.passive?.criticalDamageBonus||0)+(unit?.tune?.criticalDamageBonus||0)+Object.values(unit?.criticalDamageModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0))}
function lifestealRateOf(unit){const base=(Number.isFinite(unit?.lifesteal)?unit.lifesteal:0)+(Number.isFinite(unit?.lifestealBonus)?unit.lifestealBonus:0)+Object.values(unit?.lifestealModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0),tasteForBlood=party.includes(unit)&&party.some(member=>member.id==='logan'&&member.hp>0)?(characterDuplicateRank('logan')>=4?.2:.1):0;return Math.max(0,base+tasteForBlood)}
function shieldOf(unit){return Math.max(0,Number.isFinite(unit?.shield)?unit.shield:0)}
function absorbShield(unit,damage){const absorbed=Math.min(shieldOf(unit),Math.max(0,damage));if(absorbed>0){unit.shield=Math.max(0,shieldOf(unit)-absorbed);emitCombatVisual('shield-absorbed',[unit.id],COMBAT_ACTION_EFFECT_MS,{damage:absorbed,remaining:unit.shield})}return absorbed}
function addShield(unit,amount){if(!unit||!Number.isFinite(amount)||amount<=0)return 0;unit.shield=shieldOf(unit)+roundHp(amount);return unit.shield}
function applyLifesteal(attacker,healthDamage){
 const rate=lifestealRateOf(attacker);if(healthDamage<=0||rate<=0||!attacker||attacker.hp<=0||!Number.isFinite(attacker.maxHp))return 0;
 const hpBefore=attacker.hp;healCharacterHp(attacker,roundHp(healthDamage*rate));const healing=Math.max(0,attacker.hp-hpBefore);
 if(healing>0){emitCombatVisual('lifesteal-heal',[attacker.id],COMBAT_ACTION_EFFECT_MS,{healing});const logan=party.find(unit=>unit.id==='logan'),weapon=logan&&loadoutFor('logan').weapon,signatureEquipped=weapon?.selected==='premium'&&weapon?.premiumOwned;if(attacker.id!=='logan'&&logan&&party.includes(attacker)&&signatureEquipped){const before=logan.hp;healCharacterHp(logan,healing);const copied=Math.max(0,logan.hp-before);if(copied>0)emitCombatVisual('logan-signature-heal',[logan.id],COMBAT_ACTION_EFFECT_MS,{healing:copied})}}
 return healing;
}
function tauntRateOf(attacker,target=null){return Math.min(1,Math.max(0,...(attacker?.tauntEffects||[]).filter(effect=>Number.isInteger(effect.turns)&&effect.turns>0&&(!target||effect.targetId===target.id)).map(effect=>effect.rate)))}
function applyTaunt(attacker,taunter,rate,turns){
 if(!attacker||!taunter||!Number.isFinite(rate)||rate<0||rate>1||!Number.isInteger(turns)||turns<1)return false;
 attacker.tauntEffects=Array.isArray(attacker.tauntEffects)?attacker.tauntEffects:[];attacker.tauntEffects=attacker.tauntEffects.filter(effect=>effect.targetId!==taunter.id||effect.sourceId!==taunter.id);attacker.tauntEffects.push({sourceId:taunter.id,targetId:taunter.id,rate,turns});
 emitCombatVisual('taunt-applied',[attacker.id],COMBAT_ACTION_EFFECT_MS,{rate,turns,taunterId:taunter.id});return true;
}
function resolveTauntTarget(attacker,candidates,originalTarget,random=Math.random){
 const contenders=[...new Set(candidates)].map(unit=>({unit,rate:tauntRateOf(attacker,unit)})).filter(entry=>entry.rate>0).sort((a,b)=>b.rate-a.rate||String(a.unit.id).localeCompare(String(b.unit.id)));
 for(const {unit,rate} of contenders)if(random()<rate)return {target:unit,taunted:true};
 return {target:originalTarget,taunted:false};
}
function ageTaunt(unit){if(!unit?.tauntEffects)return false;unit.tauntEffects=unit.tauntEffects.map(effect=>({...effect,turns:effect.turns-1})).filter(effect=>effect.turns>0);return true}
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
 saveProgress();savePlayerRank();return true;
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
 const passive={...(model.passive||{})};
 if(id==='zero'){
  const premiumDuplicates=premiumWeaponDuplicateRank('zero');
  passive.criticalRateBonus=.1+(premiumDuplicates>=4?.1:0);
  passive.criticalDamageBonus=.25+(premiumDuplicates>=4?.25:0);
  passive.defenseIgnore=premiumDuplicates>=3?.2:0;
 }
 return {...model,passive,baseHp:model.hp,level:progress.level,hp,maxHp,...modifiers,shield:0,tauntEffects:[],energy:20,energyReserved:0};
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
function prepareBattleIntro(){
 syncTurnTimeline();const first=turnTimeline.preview(1)[0]?.id;
 activeId=party.some(p=>p.id===first)?first:null;
 actingEnemyId=liveEnemies().some(e=>e.id===first)?first:null;
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
 s.remaining--;attackInProgress=true;summonHistory.push({event:'acted',id:s.id,clock:turnTimeline.clock,remaining:s.remaining});
 activeId=null;actingEnemyId=null;phase='resolve';
 const owner=party.find(p=>p.id===s.ownerId);
 const foe=chosenEnemy();
 fx={kind:'basic',visual:'lily-hauntling',at:performance.now(),actor:owner?.id||s.ownerId,targetEnemyId:foe?.id,targetEnemyIds:liveEnemies().map(e=>e.id),targetGeometry:foe?{x:foe.x,y:foe.y,w:foe.w,h:foe.h}:null};
 const source={serial:++attackSerial,actor:'lily',action:'summon',hits:[],ricochetEligibleEnemyIds:liveEnemies().filter(enemy=>enemy.marks?.some(mark=>mark.id==='ricochet')).map(enemy=>enemy.id)};
 for(const enemy of liveEnemies().slice()){
  const lily=party.find(p=>p.id==='lily'),raw=calculateTypedActionDamage('true',1,lily,enemy),dealt=applyEnemyDamage(enemy,raw?.damageTaken||0,lily);
  source.hits.push({target:enemy.id,damage:dealt.damage,summon:true});if(enemy.hp<=0)resolveEnemyDefeat(enemy);
  else{
   enemy.marks=enemy.marks||[];emitCombatVisual('lily-exposed',[enemy.id],COMBAT_ACTION_EFFECT_MS);const dup=characterDuplicateRank('lily'),existing=enemy.marks.filter(m=>m.id==='exposed').length;enemy.marks=enemy.marks.filter(m=>m.id!=='exposed');for(let i=0;i<(dup>=2?Math.min(2,existing+1):1);i++)enemy.marks.push({id:'exposed',turns:dup>=2?3:2});emitCombatVisual('lily-ricochet-mark',[enemy.id],COMBAT_ACTION_EFFECT_MS);applyLilyUltimateDebuff(enemy);if(!source.pendingRicochet&&dealt.damage>0)source.pendingRicochet={enemyId:enemy.id,damage:dealt.damage};if(lily&&loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned)lily.energy=Math.min(120,lily.energy+5);
  }
 }
 log=`${s.name} • INITIAL AOE • TRUE DAMAGE`;
 const finishTurn=()=>{attackInProgress=false;settleAfterAttack();if(s.remaining<=0){summons=summons.filter(x=>x.id!==s.id);turnTimeline.states.delete(s.id);summonHistory.push({event:'expired',id:s.id})}drainUltimateQueueBefore(()=>nextTurn())};
 schedule(()=>{const pending=source.pendingRicochet,ricochetCount=pending?triggerRicochet(source,enemies.find(e=>e.id===pending.enemyId),pending.damage):0;if(ricochetCount)log=`Hauntling triggers Lily's Ricochet • ${ricochetCount} marked ${ricochetCount===1?'enemy':'enemies'}.`;schedule(finishTurn,COMBAT_ACTION_PHASE_GAP_MS)},COMBAT_ACTION_EFFECT_MS);
}

const color={ink:'#0a101f',panel:'rgba(13,17,35,.94)',gold:'#eacb87',white:'#f7f3f8',sub:'#bfc8d9',blue:'#85d9ff',red:'#f47679',green:'#5bebac'};
let phase='startup',paused=false,turn=0,enemyHp=0,maxEnemyHp=0,sp=3,
    gauges={},party=[],activeId=null,fx=null,combatVisualEvents=[],log='',hint='',hintAt=0,
    choiceRects=[],battleToken=0,enemyCount=0,forceSelect=false;
// Four authored party formation positions. Enemy identities and wave queues are independent of these slots.
// Encounter presets and enemy stats below are DEMO DATA; Approved Fundamental 2 defines the rules.
const ENEMY_CATEGORIES=Object.freeze(['common','elite','boss']);
const ENCOUNTER_LIMITS=Object.freeze({enemiesOnField:5,bossesPerWave:1,elitesPerWave:5,elitesOnField:3,elitesOnFieldInBossWave:2});
function validateEnemyCategory(category){
 if(!ENEMY_CATEGORIES.includes(category))throw Error(`Enemy category must be one of: ${ENEMY_CATEGORIES.join(', ')}`);
 return category;
}
function validateEnemyHealthBars(category,bars=1){
 if(!Number.isInteger(bars)||bars<1||bars>3)throw Error('Enemy health bars must be an integer from 1 to 3.');
 if(category!=='boss'&&bars!==1)throw Error('Only Boss enemies can have multiple health bars.');
 return bars;
}
const ENEMY_FORMATIONS=[
 {id:'slot1',x:646,y:359,w:151,h:198},
 {id:'slot2',x:822,y:314,w:156,h:205},
 {id:'slot3',x:1010,y:274,w:167,h:220},
 {id:'slot4',x:1201,y:312,w:156,h:205},
 {id:'slot5',x:1389,y:355,w:151,h:198},
];
const ENEMY_ARCHETYPES={
 slime:{id:'slime',category:'common',name:'SLIME',level:1,hp:100,basePhysicalAttack:0,baseMagicalAttack:20,basePhysicalDefense:4,baseMagicalDefense:8,speed:20,lifesteal:0,battleSprite:'slimeBattle',battleAspectRatio:'1:1',artwork:'slimeArtwork',passive:{id:'slimy',every:3,damageBonus:.25},basicAttack:{targetMode:'single',damageType:'magical',multiplier:1.0}},
 wolf:{id:'wolf',category:'common',name:'WOLF',level:1,hp:100,basePhysicalAttack:40,baseMagicalAttack:0,basePhysicalDefense:2,baseMagicalDefense:2,speed:40,lifesteal:0,battleSprite:'wolfBattle',battleAspectRatio:'1:1',artwork:'wolfArtwork',passive:{id:'rampage',damageBonus:.25,maxStacks:4},basicAttack:{targetMode:'single',damageType:'physical',multiplier:1.0}},
 slimeLeader:{id:'slime-leader',category:'elite',name:'SLIME LEADER',level:1,hp:200,basePhysicalAttack:0,baseMagicalAttack:40,basePhysicalDefense:8,baseMagicalDefense:16,speed:40,lifesteal:0,battleSprite:'slimeLeaderBattle',battleAspectRatio:'1:2',artwork:'slimeLeaderArtwork',passive:{id:'residue',resistanceReductionPerStack:.05,damageReductionPerStack:.05,maxStacks:5},basicAttack:{targetMode:'blast',damageType:'magical',multiplier:1.0}},
 slimeMonster:{id:'slime-monster',category:'boss',name:'SLIME MONSTER',level:1,hp:300,basePhysicalAttack:0,baseMagicalAttack:60,basePhysicalDefense:12,baseMagicalDefense:24,speed:60,lifesteal:0,battleSprite:'slimeMonsterBattle',battleAspectRatio:'1:1',artwork:'slimeMonsterArtwork',healthBars:1,passive:{id:'lethal-impact',defenseIgnore:.25},basicAttack:{targetMode:'aoe',damageType:'magical',multiplier:1.0}}
};
// Any encounter may supply its own finite number of waves, each with 1–15 enemies.
// Presets are only review scenarios; they are NOT a global wave-count limit.
const WAVE_PRESETS={stress:[15,12,6],quick:[1,5,6],sizes:[1,5,6,12,15]};
let currentBattleAreaId=DEFAULT_BATTLE_AREA_ID,wavePreset=DEV_MODE?'stress':'quick',waveOverride=null,enemyRosterMode=DEV_MODE?'mixed':'slime',wavePlan=[],waveIndex=-1,waveQueue=[],waveKills=0,
    totalEnemyDefeats=0,encounterCleared=false,spawnHistory=[],enemies=[],selectedEnemyId=null,actingEnemyId=null;
// Fundamental 3 target rules and Fundamental 2 v1.1 post-attack reinforcement boundary.
// Soul Enhanced Basic uses Blast unless Premium Weapon Duplicate 3 changes it to AoE; Ultimate is AoE. The pattern toolbar,
// 5-hit and support actions remain development-only controls. Damage/cost values are provisional.
let targetingMode='single',pendingTargetAction=null,supportDemo=null,zeroSkillArmed=false,attackInProgress=false,attackSerial=0,
     pendingVacancies=[],lastAttack=null,supportTestHistory=[],soulEnhanceStacks=0,soulFollowUpProcs=5,soulFollowUpSources=new Set(),soulEnhanceSpendingRemainder=0,soulFollowUpActivationCount=0,zeroHitEnemyIds=new Set();
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
function ultimateEnergyCost(p){return p?.id==='zero'&&premiumWeaponDuplicateRank('zero')>=2?80:ULTIMATE_ENERGY_COST}
function canQueueUltimate(p){return !!p&&p.hp>0&&!paused&&['player','enemy','resolve'].includes(phase)
  &&availableEnergy(p)>=ultimateEnergyCost(p)&&!isUltPending(p.id)}
function emitCombatVisual(type,targetIds=[],duration=COMBAT_ACTION_EFFECT_MS,details={}){combatVisualEvents.push({type,targetIds:[...targetIds],at:performance.now(),duration,...details})}
function resetActionResources(){const resourceful=party.some(p=>p.id==='dawn');combatVisualEvents=[];sp=resourceful?5:3;soulEnhanceStacks=0;soulFollowUpProcs=soulFollowUpLimit();soulFollowUpSources=new Set();soulEnhanceSpendingRemainder=0;soulFollowUpActivationCount=0;zeroHitEnemyIds=new Set();spCapModifiers=Object.create(null);if(resourceful){setSpCapModifier('dawn-resourceful',2);emitCombatVisual('dawn-resourceful',party.map(p=>p.id),1250)}ultimateQueue=[];ultimateSequence=0;ultimateHistory=[];ultimateResume=null;ultimateExecuting=false;
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
 if(!canQueueUltimate(p)){say(!p?'Unknown ally.':p.hp<=0?'Defeated ally cannot Ult.':isUltPending(id)?'Ultimate already queued.':'Ultimate needs '+ultimateEnergyCost(p)+' available energy.');return false}
 const q={actorId:id,cost:ultimateEnergyCost(p),seq:++ultimateSequence,requestedTurn:turn,allyTargetId};
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
function actionTargetMode(actor,action){const allyMode=ALLY_ACTION_TARGET_MODES[actor?.id]?.[action];if(allyMode)return allyMode;if((actor?.id==='soul'&&action==='ultimate')||(actor?.id==='zero'&&action==='ultimate')||(actor?.id==='lily'&&(action==='skill'||action==='ultimate'))||(actor?.id==='logan'&&action==='ultimate'))return 'aoe';if(actor?.id==='soul'&&action==='basic')return soulEnhancedBasicTargetMode(soulEnhanceStacks);if(actor?.id==='zero'&&action==='basic')return 'blast';if(actor?.id==='zero'&&action==='skill')return 'single';if(actor?.id==='logan'&&action==='basic')return 'single';return actor?.id==='soul'&&action==='skill'?'blast':targetingMode}
function previewTargetMode(){if(pendingTargetAction){const actor=party.find(p=>p.id===pendingTargetAction.actorId);return actionTargetMode(actor,pendingTargetAction.action)}return targetingMode}
function beginDawnAllyTargetSelection(action,actorId){
 const actor=party.find(p=>p.id===actorId);if(!actor||actor.id!=='dawn')return false;
 if(action==='ultimate'&&!canQueueUltimate(actor)){say(actor.hp<=0?'Defeated ally cannot use an Ultimate.':'Ultimate needs '+ultimateEnergyCost(actor)+' available Energy.');return false}
 if(action==='skill'&&sp<1){say('Tune needs 1 Skill Point.');return false}
 if(pendingTargetAction?.targetSide==='ally'&&pendingTargetAction.action===action&&pendingTargetAction.actorId===actorId){
  const target=party.find(p=>p.id===selectedAllyId&&p.hp>0);
  if(!target){say('Select a living ally before confirming this action.');return false}
  pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;
  return action==='ultimate'?queueUltimate(actorId,target.id):executeCombatAction(actor,action,null,target.id);
 }
 pendingTargetAction={action,actorId,targetSide:'ally'};cameraPreview='party';supportDemo=null;selectedAllyId=party.find(p=>p.hp>0&&p.id!==actorId)?.id||actorId;
 say(`Select a living ally for Dawn's ${action==='skill'?'Tune':'Ultimate'} on the field or in their portrait card.`);return true;
}
function beginTargetSelection(action,actorId=activeId){
 const actor=party.find(p=>p.id===actorId);if(!actor||actor.hp<=0)return false;
 if(actor.id==='dawn'&&(action==='skill'||action==='ultimate'))return beginDawnAllyTargetSelection(action,actorId);
 if(action==='skill'&&actor.id!=='soul'&&sp<1){say('Not enough shared SP. Basic restores 1 SP.');return false}
 if(action==='ultimate'&&!canQueueUltimate(actor)){say(actor.hp<=0?'Defeated ally cannot use an Ultimate.':'Ultimate needs '+ultimateEnergyCost(actor)+' available Energy.');return false}
 if(actionTargetMode(actor,action)==='allAllies'){
  if(pendingTargetAction?.actorId===actorId&&pendingTargetAction.action===action&&pendingTargetAction.targetScope==='all'){
   pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;return executeCombatAction(actor,action)
  }
  pendingTargetAction={action,actorId,targetSide:'ally',targetScope:'all'};cameraPreview='party';supportDemo=null;selectedAllyId=null;
  say(`All living allies are selected for ${actor.name}'s ${action.toUpperCase()}. Tap a party member or press ${action.toUpperCase()} again to confirm.`);return true;
 }
 if(pendingTargetAction?.action===action&&pendingTargetAction.actorId===actorId){pendingTargetAction=null;cameraPreview=null;if(action==='ultimate')return queueUltimate(actorId);return executeCombatAction(actor,action)}
 if(action==='ultimate'&&actionTargetMode(actor,action)==='aoe'){pendingTargetAction=null;cameraPreview=null;return queueUltimate(actorId)}
 pendingTargetAction={action,actorId};cameraPreview='target';supportDemo=null;selectedAllyId=null;
 say(`Select an enemy for ${actor.name}'s ${action.toUpperCase()}. Press the ability again to use the selected target, or choose another action to switch.`);return true;
}
function cancelTargetSelection(){if(!pendingTargetAction)return false;pendingTargetAction=null;cameraPreview=null;say('Target selection canceled.');return true}
function setTargetingMode(mode){if(!['single','blast','aoe','five-hit'].includes(mode)||phase!=='player'||paused)return false;targetingMode=mode;zeroSkillArmed=false;supportDemo=null;cameraPreview='target';return true}
function zeroSkillControl(){return activateSoulEnhance();}
function activateSoulEnhance(){
 const a=active();if(phase!=='player'||paused||!a||a.id!=='soul'){say('Enhance is available on Soul’s turn.');return false}
 if(sp<1){say('Soul Enhance needs 1 Skill Point.');return false}
 sp--;soulEnhanceStacks++;let refunded=false;
 if(loadoutFor('soul').weapon.selected==='premium'&&loadoutFor('soul').weapon.premiumOwned){soulEnhanceSpendingRemainder++;if(soulEnhanceSpendingRemainder>=3){soulEnhanceSpendingRemainder-=3;gainSp(1);refunded=true}}
 zeroSkillArmed=false;pendingTargetAction=null;cameraPreview=null;fx={kind:'self',visual:'soul-enhance',at:performance.now(),actor:a.id};
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
function enemyBattleSprite(enemy){return enemy?.archetypeId==='slime-leader'?'slimeLeaderBattle':enemy?.archetypeId==='slime-monster'?'slimeMonsterBattle':enemy?.battleSprite}
function buildWavePlan(sizes){
 if(!Array.isArray(sizes)||!sizes.length||!sizes.every(n=>Number.isInteger(n)&&n>=1&&n<=15))throw Error('Wave sizes must each be 1–15');
 return sizes.map((size,wi)=>validateWaveComposition(Array.from({length:size},(_,i)=>{
  const isWolf=enemyRosterMode==='wolf'||(enemyRosterMode==='mixed'&&(wi+i)%2===0);
  const finalMixedWave=enemyRosterMode==='mixed'&&wi===sizes.length-1,firstMixedWave=enemyRosterMode==='mixed'&&sizes.length>1&&wi===0;
  const mixedBoss=finalMixedWave&&i===0,mixedBossElite=finalMixedWave&&(i===1||i===2),mixedLeader=firstMixedWave&&i===0;
  const model=enemyRosterMode==='slime-leader'?(i<ENCOUNTER_LIMITS.elitesPerWave?ENEMY_ARCHETYPES.slimeLeader:ENEMY_ARCHETYPES.slime):enemyRosterMode==='slime-monster'?(i===0?ENEMY_ARCHETYPES.slimeMonster:ENEMY_ARCHETYPES.slime):mixedBoss?ENEMY_ARCHETYPES.slimeMonster:(mixedBossElite||mixedLeader)?ENEMY_ARCHETYPES.slimeLeader:ENEMY_ARCHETYPES[isWolf?'wolf':'slime'];
  const category=validateEnemyCategory(model.category);return {id:`wave${wi+1}-enemy${i+1}`,archetypeId:model.id,name:model.name,
   wave:wi+1,order:i+1,category,healthBars:validateEnemyHealthBars(category,model.healthBars??1),level:model.level,maxHp:model.hp,speed:model.speed,
   basePhysicalAttack:model.basePhysicalAttack,baseMagicalAttack:model.baseMagicalAttack,
   basePhysicalDefense:model.basePhysicalDefense,baseMagicalDefense:model.baseMagicalDefense,lifesteal:model.lifesteal??0,lifestealModifiers:{...(model.lifestealModifiers||{})},bleedStacks:[],bleedMaxStacks:model.bleedMaxStacks??5,
   battleSprite:model.battleSprite,battleAspectRatio:model.battleAspectRatio,art:model.artwork,artwork:model.artwork,barrierPercent:model.barrierPercent??.2,passive:{...model.passive},basicAttack:{...model.basicAttack},basicAttackCount:0,rampageStacks:0};
 })));
}
function validateWaveComposition(wave){
 const bosses=wave.filter(e=>validateEnemyCategory(e.category)==='boss').length,elites=wave.filter(e=>e.category==='elite').length;
 if(bosses>ENCOUNTER_LIMITS.bossesPerWave)throw Error(`A wave can contain at most ${ENCOUNTER_LIMITS.bossesPerWave} Boss.`);
 if(elites>ENCOUNTER_LIMITS.elitesPerWave)throw Error(`A wave can contain at most ${ENCOUNTER_LIMITS.elitesPerWave} Elite enemies.`);
 return wave;
}
function initialSlots(count,bossWave=false,queuedEnemies=[]){
 if(!bossWave&&!queuedEnemies.some(enemy=>enemy.category==='elite'))return ({1:[2],2:[1,3],3:[1,2,3],4:[0,1,3,4],5:[0,1,2,3,4]})[count].slice();
 const middle=[2],sides=[1,3],eliteCenter=[2,1,3],outer=[0,4],fallback=[0,4,1,3],used=new Set();
 return queuedEnemies.slice(0,count).map(enemy=>{
  const preferred=enemy.category==='boss'?middle:enemy.category==='elite'?(bossWave?sides:eliteCenter):outer;
  const slot=preferred.shift()??fallback.find(candidate=>!used.has(candidate));used.add(slot);
  return slot;
 });
}
function canDeployEnemy(enemy){
 if(!enemy||enemies.length>=ENCOUNTER_LIMITS.enemiesOnField)return false;
 const eliteCount=enemies.filter(e=>e.category==='elite'&&e.hp>0).length,bossOnField=enemies.some(e=>e.category==='boss'&&e.hp>0);
 if(enemy.category==='boss'&&eliteCount>ENCOUNTER_LIMITS.elitesOnFieldInBossWave)return false;
 if(enemy.category==='elite'&&eliteCount>=(bossOnField?ENCOUNTER_LIMITS.elitesOnFieldInBossWave:ENCOUNTER_LIMITS.elitesOnField))return false;
 return true;
}
function enterEnemy(slot){
 if(!waveQueue.length||enemies.some(e=>e.slot===slot))return null;
 const queueIndex=waveQueue.findIndex(canDeployEnemy);if(queueIndex<0)return null;
 const [incoming]=waveQueue.splice(queueIndex,1),formation=ENEMY_FORMATIONS[slot];
 const barrier=roundHp(incoming.maxHp*incoming.barrierPercent);
 const e={...incoming,slot,x:formation.x,y:formation.y,w:formation.w,h:formation.h,hp:incoming.maxHp,shield:incoming.shield||0,maxBarrier:barrier,barrier,brokenTurns:0,debuffs:[],marks:[],tauntEffects:[],reinforcement:waveKills>0,entryPending:waveKills>0,enteredAt:waveKills>0?performance.now():null};
 if(premiumWeaponDuplicateRank('lily')>=1&&party.some(p=>p.id==='lily'))e.marks.push({id:'soul-mark',turns:2},{id:'ricochet',turns:2,sources:[]});
 enemies.push(e);enemies.sort((a,b)=>a.slot-b.slot);gauges[e.id]=0;
 spawnHistory.push({wave:e.wave,id:e.id,slot,initial:waveKills===0,duringAttack:attackInProgress});
 syncEnemyHp();return e;
}
function beginWave(index){saveVitals();
 if(index>=wavePlan.length){encounterCleared=true;enemies=[];selectedEnemyId=null;syncEnemyHp();return;}
 const categoryOrder={boss:0,elite:1,common:2};waveIndex=index;waveQueue=[...wavePlan[index]].sort((a,b)=>categoryOrder[a.category]-categoryOrder[b.category]||a.order-b.order);waveKills=0;enemies=[];actingEnemyId=null;pendingVacancies=[];
 const initialCount=Math.min(ENCOUNTER_LIMITS.enemiesOnField,waveQueue.length);
 const bossWave=wavePlan[index].some(enemy=>enemy.category==='boss');for(const slot of initialSlots(initialCount,bossWave,waveQueue))enterEnemy(slot);
 const count=enemies.length;
 selectedEnemyId=enemies[Math.floor(enemies.length/2)]?.id||null;
 syncEnemyHp();
 log=`Wave ${index+1}/${wavePlan.length}: ${wavePlan[index].length} enemies • ${count} deployed.`;
}
function resetEnemies(){
 wavePlan=buildWavePlan(waveOverride||WAVE_PRESETS[wavePreset]);waveIndex=-1;waveQueue=[];waveKills=0;
 for(const ally of party){ally.residueStacks=0;ally.residueTurns=0;ally.residueMaxStacks=null;ally.residueDamageReductionPerStack=null;ally.residueResistanceReductionPerStack=null}
 totalEnemyDefeats=0;encounterCleared=false;spawnHistory=[];enemies=[];selectedEnemyId=null;actingEnemyId=null;pendingVacancies=[];attackInProgress=false;lastAttack=null;supportDemo=null;supportTestHistory=[];
 beginWave(0);
}
function resolveEnemyDefeat(victim){
 if(!victim||victim.hp>0||victim.deathAt||!enemies.some(e=>e.id===victim.id))return null;
 // Keep the defeated unit on stage for a visible fade-out. Its zero HP keeps it
 // out of targeting and turn order while its slot remains unavailable.
 victim.deathAt=performance.now();delete gauges[victim.id];
 pendingVacancies.push(victim.slot);waveKills++;totalEnemyDefeats++;
 if(lastAttack&&attackInProgress&&!lastAttack.finished)lastAttack.defeats.push({id:victim.id,slot:victim.slot});
 syncEnemyHp();
 if(!attackInProgress)schedule(()=>{if(!attackInProgress)settleAfterAttack()},ENEMY_DEATH_BEAT_MS);
 return victim;
}
function settleAfterAttack(){
 if(attackInProgress)return false;
 // Remove stage corpses only when their presentation beat is complete.
 enemies=enemies.filter(e=>e.hp>0);
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
function applyTrainingHit(enemy,damage,hitNumber,deferRicochet=false){
 if(!enemy||enemy.hp<=0||!attackInProgress)return false;
 const source=party.find(p=>p.id===lastAttack.actor)||summons.find(s=>s.id===lastAttack.actor)||null;
 const dealt=applyEnemyDamage(enemy,damage,source);
 if(source?.id==='zero'&&dealt.damage>0)zeroHitEnemyIds.add(enemy.id);
 if((lastAttack.actor!=='lily'||lastAttack.action==='summon')&&enemy.marks?.some(m=>m.id==='exposed')){const lily=party.find(p=>p.id==='lily');if(lily&&loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned)lily.energy=Math.min(120,lily.energy+5)}
 lastAttack.hits.push({index:hitNumber,target:enemy.id,slot:enemy.slot,damage:dealt.damage+dealt.breakDamage,healthDamage:dealt.healthDamage,shieldDamage:dealt.shieldDamage,hpAfter:enemy.hp,barrierDamage:dealt.barrierDamage,breakDamage:dealt.breakDamage,barrierAfter:enemy.barrier,broken:dealt.broken,critical:dealt.critical,criticalMultiplier:dealt.criticalMultiplier,phase:'initial'});
 if(lastAttack.actor==='lily'&&(lastAttack.action==='skill'||lastAttack.action==='ultimate')){
  emitCombatVisual('lily-exposed',[enemy.id],COMBAT_ACTION_EFFECT_MS);
  enemy.marks=enemy.marks||[];const dup=characterDuplicateRank('lily');
  if(dup>=2){const stacks=Math.min(2,(enemy.marks.filter(m=>m.id==='exposed').length||0)+1);enemy.marks=enemy.marks.filter(m=>m.id!=='exposed');for(let i=0;i<stacks;i++)enemy.marks.push({id:'exposed',turns:3})}
  else{enemy.marks=enemy.marks.filter(m=>m.id!=='exposed');enemy.marks.push({id:'exposed',turns:2})}
 }
 if(lastAttack.actor==='logan'&&(lastAttack.action==='basic'||lastAttack.action==='ultimate')){const logan=party.find(p=>p.id==='logan'),stacks=lastAttack.action==='basic'?(characterDuplicateRank('logan')>=1?2:1):(characterDuplicateRank('logan')>=3?2:1);applyBleed(enemy,logan,stacks)}
 if(lastAttack.actor==='zero'&&lastAttack.action==='basic'&&premiumWeaponDuplicateRank('zero')>=1){const zero=party.find(p=>p.id==='zero');applyBleed(enemy,zero,1)}
 if(deferRicochet){if(!lastAttack.pendingRicochet)lastAttack.pendingRicochet={enemyId:enemy.id,damage:dealt.damage}}
 else triggerRicochet(lastAttack,enemy,dealt.damage);
 if(lastAttack.actor==='lily'&&lastAttack.action==='ultimate')applyLilyUltimateDebuff(enemy);
 if(lastAttack.actor==='lily'&&lastAttack.action==='skill'){enemy.marks=enemy.marks||[];enemy.marks=enemy.marks.filter(m=>m.id!=='ricochet');enemy.marks.push({id:'ricochet',turns:2,sources:[]});emitCombatVisual('lily-ricochet-mark',[enemy.id],1000)}
 if(enemy.hp<=0)resolveEnemyDefeat(enemy);else syncEnemyHp();
 return true;
}
function applyLilyUltimateDebuff(enemy){if(characterDuplicateRank('lily')<1||!enemy)return;enemy.debuffs=enemy.debuffs||[];enemy.debuffs=enemy.debuffs.filter(d=>d.id!=='lily-weakened');enemy.debuffs.push({id:'lily-weakened',turns:2,damageMultiplier:.9})}
function triggerRicochet(sourceAttack,hitEnemy,sourceDamage){
 if(!sourceAttack||sourceAttack.ricochetFollowUp||sourceDamage<=0)return;
 const eligibleIds=sourceAttack.ricochetEligibleEnemyIds;
 const marked=liveEnemies().filter(e=>(!eligibleIds||eligibleIds.includes(e.id))&&e.marks?.some(m=>m.id==='ricochet'));
 const triggered=marked.filter(e=>{const m=e.marks.find(x=>x.id==='ricochet');return !(m.sources||[]).includes(sourceAttack.serial)});
 if(!triggered.length)return;
 const lily=party.find(p=>p.id==='lily');if(!lily)return;
 sourceAttack.ricochetFollowUp=true;const repetitions=characterDuplicateRank('lily')>=4?2:1,damageByTarget={};
 for(const enemy of triggered){const mark=enemy.marks.find(m=>m.id==='ricochet');mark.sources=[...(mark.sources||[]),sourceAttack.serial];
  for(let n=0;n<repetitions&&enemy.hp>0;n++){const reduction=calculateTrueDamageReduction(lily,enemy),amount=roundHp(sourceDamage*.1*(n===1?.5:1)*(1-(Number.isFinite(reduction)?reduction:0))),dealt=applyEnemyDamage(enemy,amount,lily);damageByTarget[enemy.id]=(damageByTarget[enemy.id]||0)+dealt.damage;sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,damage:dealt.damage,barrierDamage:dealt.barrierDamage,ricochet:true,ricochetSource:sourceAttack.serial,critical:dealt.critical,phase:'ricochet'});if(enemy.hp<=0)resolveEnemyDefeat(enemy)}
 }
 emitCombatVisual('lily-ricochet-trigger',triggered.map(e=>e.id),COMBAT_ACTION_EFFECT_MS,{damageByTarget});sourceAttack.ricochetFollowUp=false;syncEnemyHp();return triggered.length;
}
function cleanseEnemy(enemy,full=true){if(full){enemy.debuffs=[];enemy.marks=[];enemy.bleedStacks=[];enemy.tauntEffects=[];return}enemy.debuffs.shift();enemy.marks.shift()}
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
 const targetHpBefore=enemy.hp;
 const damage=roundHp(rawDamage*(1-damageReduction)*criticalMultiplier*(enemy.brokenTurns>0?1.5:1)),shieldDamage=absorbShield(enemy,damage);
 enemy.hp=Math.max(0,enemy.hp-(damage-shieldDamage));
 let barrierDamage=0,breakDamage=0,breakShieldDamage=0,broken=false;
 if(enemy.barrier>0){
  const exposed=enemy.marks?.filter(m=>m.id==='exposed').length||0;
  // Tune's barrier bonus belongs to the Tune target, so only that ally's hits receive it.
  barrierDamage=damage*.25*(1+(premiumWeaponDuplicateRank('lily')>=2?exposed*.1:0)+(attacker?.tune?.barrierDamageBonus||0));enemy.barrier=Math.max(0,enemy.barrier-barrierDamage);
  if(enemy.barrier===0){enemy.brokenTurns=brokenDuration(speedOf(enemy),teamBaseTurns('enemy'));breakDamage=roundHp(enemy.maxHp*(.1+(premiumWeaponDuplicateRank('lily')>=3?exposed*.05:0)));breakShieldDamage=absorbShield(enemy,breakDamage);enemy.hp=Math.max(0,enemy.hp-(breakDamage-breakShieldDamage));broken=true;}
 }
 const healthDamage=Math.max(0,targetHpBefore-enemy.hp),lifestealHealing=applyLifesteal(attacker,healthDamage);
 syncEnemyHp();return {damage,healthDamage,shieldDamage:shieldDamage+breakShieldDamage,breakShieldDamage,barrierDamage,breakDamage,broken,critical,criticalMultiplier,lifestealHealing};
}
function applyBleed(target,source,stacks=1,maxStacks=target?.bleedMaxStacks??5){
 if(!target||target.hp<=0||!source||!Number.isInteger(stacks)||stacks<1||!Number.isInteger(maxStacks)||maxStacks<1)return false;
 target.bleedStacks=Array.isArray(target.bleedStacks)?target.bleedStacks:[];target.bleedMaxStacks=maxStacks;
 const added=Math.min(stacks,Math.max(0,maxStacks-target.bleedStacks.length));if(!added)return false;
 for(let i=0;i<added;i++)target.bleedStacks.push({sourceId:source.id});emitCombatVisual('bleed-applied',[target.id],COMBAT_ACTION_EFFECT_MS,{stacks:target.bleedStacks.length});return added;
}
function resolveBleedTick(target){
 if(!target||target.hp<=0||!target.bleedStacks?.length)return 0;
 const perStack=roundHp(target.maxHp*.02),sourceGroups=new Map();
 for(const stack of target.bleedStacks){const source=party.find(unit=>unit.id===stack.sourceId)||enemies.find(unit=>unit.id===stack.sourceId);if(source)sourceGroups.set(source,(sourceGroups.get(source)||0)+perStack)}
 let total=0;
 for(const [source,rawDamage] of sourceGroups){const damage=roundHp(rawDamage*Math.max(0,1-(target.tune?.damageReduction||0))*(target.brokenTurns>0?1.5:1)),absorbed=absorbShield(target,damage),actual=Math.min(target.hp,damage-absorbed);target.hp=Math.max(0,target.hp-(damage-absorbed));target.damageTaken=(target.damageTaken||0)+actual;source.damageDealt=(source.damageDealt||0)+actual;applyLifesteal(source,actual);total+=actual;if(target.hp<=0)break}
 target.bleedStacks.shift();emitCombatVisual('bleed-tick',[target.id],1000,{damage:total,stacks:target.bleedStacks.length});syncEnemyHp();return total;
}
function resolveSoulFollowUp(sourceAttack){
 const soul=party.find(p=>p.id==='soul'&&p.hp>0);if(!soul||soulFollowUpProcs<=0||soulFollowUpSources.has(sourceAttack.serial))return false;
 const affected=[...new Set(sourceAttack.hits.filter(h=>h.damage>0).map(h=>h.target))].map(id=>enemies.find(e=>e.id===id)).filter(e=>e&&e.hp>0);
 if(!affected.length)return false;soulFollowUpSources.add(sourceAttack.serial);soulFollowUpProcs--;
 const attack=calculateTrueAttack(soul),dupeBonus=characterDuplicateRank(soul.id)>=2?2:1,rawTotal=Number.isFinite(attack)?roundHp(attack*.5*dupeBonus*celestialMultiplier(soul.id,'passive')):0,base=Math.floor(rawTotal/affected.length),remainder=rawTotal%affected.length;let total=0;
 for(let i=0;i<affected.length;i++){const share=base+(i<remainder?1:0),rate=attack>0?share/attack:0,amount=soulDamageForTarget(soul,affected[i],rate);if(amount<=0)continue;const enemy=affected[i],dealt=applyEnemyDamage(enemy,amount,soul);total+=dealt.damage;sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,slot:enemy.slot,damage:dealt.damage,hpAfter:enemy.hp,barrierDamage:dealt.barrierDamage,barrierAfter:enemy.barrier,broken:dealt.broken,followUp:true,critical:dealt.critical,phase:'follow-up'});if(enemy.hp<=0)resolveEnemyDefeat(enemy)}
 soulFollowUpActivationCount++;
  if(premiumWeaponDuplicateRank(soul.id)>=4&&soulFollowUpActivationCount%2===0)soulFollowUpProcs=Math.min(soulFollowUpLimit(),soulFollowUpProcs+1);
 sourceAttack.followUp={sourceSerial:sourceAttack.serial,damage:total,targets:affected.map(e=>e.id),procsRemaining:soulFollowUpProcs};emitCombatVisual('soul-follow-up',affected.map(e=>e.id),ANIMATION_STEP_MS*5,{damageByTarget:Object.fromEntries(sourceAttack.hits.filter(hit=>hit.followUp).map(hit=>[hit.target,hit.damage])),targetGeometry:Object.fromEntries(affected.map(e=>[e.id,{x:e.x,y:e.y,w:e.w,h:e.h}]))});syncEnemyHp();return total>0;
}
function finishTrainingAttack(serial){
 if(!attackInProgress||!lastAttack||lastAttack.serial!==serial)return;
 if(!lastAttack.resolutionPhase){
  lastAttack.resolutionPhase='follow-up';const pending=lastAttack.pendingRicochet;
  const ricochetCount=pending?triggerRicochet(lastAttack,enemies.find(e=>e.id===pending.enemyId),pending.damage):0;
  if(ricochetCount){const source=party.find(p=>p.id===lastAttack.actor);log=`${source?.name||'Ally'} triggers Lily's Ricochet • ${ricochetCount} marked ${ricochetCount===1?'enemy':'enemies'}.`;schedule(()=>finishTrainingAttack(serial),COMBAT_ACTION_PHASE_GAP_MS);return}
 }
 if(lastAttack.resolutionPhase==='follow-up'){
  lastAttack.resolutionPhase='complete';
  const soulFollowUpTriggered=lastAttack.actor&&lastAttack.actor!=='soul'&&party.some(p=>p.id===lastAttack.actor)?resolveSoulFollowUp(lastAttack):false;
  if(soulFollowUpTriggered||lastAttack.followUp){
   const followUp=lastAttack.followUp;log=`Soul Follow-up • ${followUp.targets.length} ${followUp.targets.length===1?'enemy':'enemies'} take ${followUp.damage} True damage.`;
   schedule(()=>finishTrainingAttack(serial),COMBAT_ACTION_PHASE_GAP_MS);return;
  }
 }
 attackInProgress=false;lastAttack.finished=true;lastAttack.finishedAt=performance.now();
 if(lastAttack.actor==='lily'&&lastAttack.action==='ultimate'&&!encounterCleared){
  if(loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned)gainSp(1);
  if(premiumWeaponDuplicateRank('lily')>=4){for(const ally of party)ally.energy=Math.min(120,ally.energy+20);for(const ally of party)addActionAdvance(ally.id,20)}
  const existing=summons.find(s=>s.ownerId==='lily');if(existing){summons=summons.filter(s=>s.id!==existing.id);turnTimeline.states.delete(existing.id)}
  const duration=characterDuplicateRank('lily')>=3?4:3,s={id:'lily-hauntling-'+(++summonSerial),name:'HAUNTLING',ownerId:'lily',speed:30,mode:'independent',remaining:duration,pendingCreation:false,test:false};summons.push(s);syncTurnTimeline();turnTimeline.immediateFirst(s.id);
 }
 if(lastAttack.actor==='soul'&&lastAttack.action==='ultimate'){soulFollowUpProcs=soulFollowUpLimit();soulFollowUpSources.clear();lastAttack.followUpRefill=soulFollowUpProcs}
 if(lastAttack.actor==='zero'&&lastAttack.action==='ultimate'){
  addActionAdvance('zero',100);
  if(characterDuplicateRank('zero')>=1){for(const enemy of liveEnemies())addActionDelay(enemy.id,20);emitCombatVisual('zero-delay',liveEnemies().map(enemy=>enemy.id),COMBAT_ACTION_EFFECT_MS)}
  if(loadoutFor('zero').weapon.selected==='premium'&&loadoutFor('zero').weapon.premiumOwned)gainSp(1);
 }
 if(lastAttack.actor==='logan'&&lastAttack.action==='ultimate'&&characterDuplicateRank('logan')>=3)gainSp(1);
 const actingAlly=party.find(p=>p.id===lastAttack.actor);if(actingAlly){ageTaunt(actingAlly);if(lastAttack.action!=='ultimate')ageDawnTune(actingAlly);if(lastAttack.action!=='ultimate')ageResidue(actingAlly)}
 if(pendingVacancies.length){schedule(()=>completeTrainingAttack(serial),ENEMY_DEATH_BEAT_MS);return}
 completeTrainingAttack(serial);
}
function completeTrainingAttack(serial,entryFinished=false){
 if(!lastAttack||lastAttack.serial!==serial||phase!=='resolve')return;
 settleAfterAttack();
 if(!entryFinished&&enemies.some(e=>e.entryPending)){schedule(()=>{for(const enemy of enemies)if(enemy.entryPending)enemy.entryPending=false;completeTrainingAttack(serial,true)},ENEMY_REINFORCEMENT_ENTRY_MS);return}
 if(!encounterCleared&&lastAttack?.action!=='ultimate')finishSummonCreationForTest(lastAttack?.actor);
 if(phase!=='resolve')return;
 if(encounterCleared){cancelAllQueuedUltimates('victory');phase='victory';log='All enemies in every wave defeated.';return}
 if(lastAttack?.action==='ultimate'){ultimateHistory.push({event:'finished',actor:lastAttack.actor,seq:lastAttack.ultimateSeq,turn});ultimateExecuting=false;runNextUltimate()}
 else drainUltimateQueueBefore(()=>nextTurn());
}
function setEnemyTarget(id){if(phase!=='player'||paused)return false;const e=enemies.find(e=>e.id===id&&e.hp>0);if(!e)return false;selectedEnemyId=id;selectedAllyId=null;if(pendingTargetAction){const pending=pendingTargetAction;pendingTargetAction=null;cameraPreview=null;const actor=party.find(p=>p.id===pending.actorId);if(pending.action==='ultimate')return queueUltimate(pending.actorId);return executeCombatAction(actor,pending.action)}cameraPreview='target';log=`Target selected: ${e.name} (wave ${e.wave}, slot ${e.slot+1}).`;return true;}
function setWavePlanForTest(sizes){if(phase!=='setup')return false;try{buildWavePlan(sizes)}catch(e){return false}waveOverride=[...sizes];return true;}
function toggleWavePreset(){if(phase!=='setup')return;waveOverride=null;const choices=['stress','quick','sizes'];wavePreset=choices[(choices.indexOf(wavePreset)+1)%choices.length]}
function setEnemyRoster(mode){if(phase!=='setup'||!['slime','wolf','mixed','slime-leader','slime-monster'].includes(mode))return false;enemyRosterMode=mode;return true;}

const savedTeam=loadTeam();
let draft=[...savedTeam];
function validTeam(ids){return Array.isArray(ids)&&ids.length>=1&&ids.length<=MAX_PARTY_SIZE&&ids.every(id=>ROSTER_IDS.has(id))&&new Set(ids).size===ids.length}
function loadTeam(){try{const a=JSON.parse(localStorage.getItem(TEAM_KEY)||'null');if(Array.isArray(a)&&a.every(id=>ROSTER_IDS.has(id))&&new Set(a).size===a.length){const saved=a.slice(0,MAX_PARTY_SIZE);if(saved.length===2&&saved[0]==='soul'&&saved[1]==='lily')return [...saved,'dawn'];return saved}}catch(e){}return ['soul']}
function saveTeam(){try{localStorage.setItem(TEAM_KEY,JSON.stringify(draft))}catch(e){}}
function roster(id){return ROSTER.find(x=>x.id===id)}
function alive(){return party.filter(x=>x.hp>0)}
function active(){return party.find(x=>x.id===activeId)}
function say(message){hint=message;hintAt=performance.now()}
function schedule(fn,ms){const token=battleToken;setTimeout(()=>{if(token===battleToken)fn()},ms)}
function enterSelection(mandatory=false){saveVitals();cameraPreview=null;selectedAllyId=null;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;pendingVacancies=[];cancelAllQueuedUltimates('reset');battleToken++;summons=[];turnTimeline.reset();phase='setup';paused=false;forceSelect=mandatory;draft=[...loadTeam()];activeId=null;log='';say(mandatory?'This encounter requires team confirmation.':DEV_MODE?'Review the party and battle test options.':'Review your party before battle.');}
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
function startBattle(areaId=DEFAULT_BATTLE_AREA_ID){
 if(!BATTLE_AREAS[areaId]){say('Unknown battle area.');return false}
 if(phase!=='setup'||!validTeam(draft)){say('Set a party of 1–4 unique characters in Party first.');return}
 currentBattleAreaId=areaId;
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 party=draft.map(id=>spawnProgressedUnit(id));
 turnTimeline.reset();pendingTargetAction=null;speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;actingEnemyId=null;prepareBattleIntro();zeroSkillArmed=false;fx=null;paused=false;phase='intro';forceSelect=false;saveVitals();
 log=`Wave 1/${wavePlan.length}: ${wavePlan[0].length} training enemies (${enemies.length} on field).`;
 schedule(()=>{if(phase==='intro')nextTurn()},CAMERA_TRANSITION_BETWEEN_SIDES_MS);
}
function replay(){if(phase==='setup')return;draft=party.map(p=>p.id);startFromBattle();}
function startFromBattle(){
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 saveVitals();party=party.map(p=>spawnProgressedUnit(p.id));
 turnTimeline.reset();pendingTargetAction=null;speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;actingEnemyId=null;prepareBattleIntro();zeroSkillArmed=false;fx=null;paused=false;phase='intro';saveVitals();
 log=`Wave test restarted: ${wavePlan.length} waves, ${wavePlan.reduce((n,w)=>n+w.length,0)} total enemies.`;
 schedule(()=>{if(phase==='intro')nextTurn()},CAMERA_TRANSITION_BETWEEN_SIDES_MS);
}
function applyResidue(target,passive={}){if(!target||target.hp<=0)return false;target.residueMaxStacks=passive.maxStacks??RESIDUE_RULES.maxStacks;target.residueDamageReductionPerStack=passive.damageReductionPerStack??RESIDUE_RULES.damageReductionPerStack;target.residueResistanceReductionPerStack=passive.resistanceReductionPerStack??RESIDUE_RULES.resistanceReductionPerStack;target.residueStacks=Math.min(target.residueMaxStacks,(target.residueStacks||0)+1);target.residueTurns=RESIDUE_RULES.durationTurns;emitCombatVisual('slime-residue',[target.id],1000);return true}
function resolveEnemyBasicAttack(attacker,candidates){
 const basic=attacker.basicAttack||{},passive=attacker.passive?.id==='slimy'?attacker.passive:null,rampage=attacker.passive?.id==='rampage';
 if(passive)attacker.basicAttackCount=(attacker.basicAttackCount||0)+1;
 const enhanced=!!passive&&attacker.basicAttackCount%passive.every===0,mode=enhanced?'aoe':basic.targetMode||'single';
 const originalPrimary=candidates[Math.floor(Math.random()*candidates.length)],tauntSelection=mode==='aoe'?{target:originalPrimary,taunted:false}:resolveTauntTarget(attacker,candidates,originalPrimary),primary=tauntSelection.target||originalPrimary;
 if(tauntSelection.taunted)emitCombatVisual('taunt-redirect',[attacker.id],COMBAT_ACTION_EFFECT_MS,{rate:tauntRateOf(attacker,primary),taunterId:primary.id});
 const targets=mode==='aoe'?[...candidates]:mode==='blast'?candidates.filter(target=>Math.abs(party.indexOf(target)-party.indexOf(primary))<=1):[primary];
 const multiplier=(basic.multiplier??1)*(enhanced?1+(passive?.damageBonus||0):1)*(rampage?1+(attacker.passive.damageBonus??.25)*(attacker.rampageStacks||0):1)*(attacker.debuffs||[]).reduce((v,d)=>v*(d.damageMultiplier??1),1);
 const hits=targets.map(target=>{
  const calculated=basic.damageType?calculateTypedActionDamage(basic.damageType,multiplier,attacker,target):null;
  const damage=calculated?.damageTaken??(basic.damageType?0:92+((turn*37)%51));
  const dealt=applyEnemyDamage(target,damage,attacker);target.energy=Math.min(120,target.energy+10);if(attacker.passive?.id==='residue'&&dealt.damage>0)applyResidue(target,attacker.passive);
  return {target:target.id,damage:dealt.damage+dealt.breakDamage,healthDamage:dealt.healthDamage,shieldDamage:dealt.shieldDamage,barrierDamage:dealt.barrierDamage,breakDamage:dealt.breakDamage,barrierAfter:target.barrier,broken:dealt.broken,critical:dealt.critical};
 });
 if(rampage&&hits.some(hit=>hit.damage>0))attacker.rampageStacks=Math.min(attacker.passive.maxStacks??4,(attacker.rampageStacks||0)+1);
 return {hits,enhanced,mode};
}
function nextTurn(){
 if(paused||['setup','victory','defeat'].includes(phase))return;
 if(liveEnemies().length===0){if(encounterCleared){phase='victory';return}say('Wave state has no active enemies.');return}
 if(!alive().length){phase='defeat';return}
 syncTurnTimeline();const nextEvent=turnTimeline.take();if(!nextEvent)return;
 syncLegacyGauges();const next=nextEvent.id;
 turn++;
 const actingSummon=summons.find(s=>s.id===next&&s.mode==='independent');
 if(actingSummon){executeIndependentSummonTurn(actingSummon);return;}
 const attacking=enemies.find(e=>e.id===next&&e.hp>0);
 if(attacking&&attacking.bleedStacks?.length){resolveBleedTick(attacking);if(attacking.hp<=0){resolveEnemyDefeat(attacking);schedule(()=>nextTurn(),ENEMY_DEATH_BEAT_MS);return}}
 if(attacking&&attacking.brokenTurns>0){attacking.brokenTurns--;if(attacking.brokenTurns===0){attacking.barrier=attacking.maxBarrier;cleanseEnemy(attacking);addActionAdvance(attacking.id,100);}schedule(()=>nextTurn(),0);return;}
 if(attacking?.marks)attacking.marks=attacking.marks.map(m=>({...m,turns:m.turns-1})).filter(m=>m.turns>0);
 if(attacking?.debuffs)attacking.debuffs=attacking.debuffs.map(d=>({...d,turns:d.turns-1})).filter(d=>d.turns>0);
 if(attacking){activeId=null;zeroSkillArmed=false;pendingTargetAction=null;actingEnemyId=next;cameraPreview=null;phase='enemy';log=`${attacking.name} prepares an attack.`;
  schedule(()=>{if(phase!=='enemy'||paused)return;if(attacking.hp<=0){nextTurn();return}const candidates=alive();if(!candidates.length){cancelAllQueuedUltimates('defeat');phase='defeat';return}enemyCount++;const attack=resolveEnemyBasicAttack(attacking,candidates),firstHit=attack.hits[0];ageTaunt(attacking);saveVitals();cancelQueuedUltimatesOfDefeated();const visual=ENEMY_ACTION_VISUALS[attacking.archetypeId]?.basic||ENEMY_ACTION_VISUALS.slime.basic;fx={kind:'enemy',visual,at:performance.now(),damage:firstHit.damage,target:firstHit.target,hits:attack.hits,actorEnemyId:attacking.id};log=attack.enhanced?`${attacking.name} uses Slimy against all allied characters.`:attack.mode==='aoe'?`${attacking.name} attacks all allied characters for ${firstHit.damage} damage each.`:attack.mode==='blast'?`${attacking.name} blasts ${attack.hits.length} allied characters.`:`${attacking.name} hits ${party.find(p=>p.id===firstHit.target)?.name||'an ally'} for ${firstHit.damage}.`;phase='resolve';schedule(()=>drainUltimateQueueBefore(()=>{if(!alive().length){phase='defeat';log='All allied characters were defeated.'}else nextTurn()}),ENEMY_ATTACK_EFFECT_MS)},ENEMY_WINDUP_MS);
 }else{actingEnemyId=null;activeId=next;zeroSkillArmed=false;pendingTargetAction=null;cameraPreview=null;phase='player';log=`${active().name}'s turn — select an ability, then choose an enemy.`;}
}
// Normal turns can use Basic or Skill. Ultimate is off-turn and never spends a turn.
function play(action){
 if(phase!=='player'||paused||!['basic','skill','ultimate'].includes(action))return false;
 const a=active();if(!a||a.hp<=0)return false;
 if(action==='skill'&&a.id==='soul'){pendingTargetAction=null;cameraPreview=null;return activateSoulEnhance()}
 if(action==='skill'&&a.id==='dawn')return beginDawnAllyTargetSelection('skill',a.id);
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
function ageResidue(ally){if(!ally||!ally.residueStacks)return false;ally.residueTurns=Math.max(0,(ally.residueTurns||RESIDUE_RULES.durationTurns)-1);if(ally.residueTurns===0){ally.residueStacks=0;ally.residueMaxStacks=null;ally.residueDamageReductionPerStack=null;ally.residueResistanceReductionPerStack=null}return true}
function applyLoganBloodShield(logan){
 if(!logan||logan.hp<=0)return false;
 const healthCost=Math.min(Math.max(0,logan.hp-1),Math.max(1,roundHp(logan.hp*.25))),shieldPerAlly=healthCost*(characterDuplicateRank('logan')>=2?2:1),recipients=party.filter(ally=>ally.hp>0);
 logan.hp=Math.max(1,logan.hp-healthCost);saveVitals();
 for(const ally of recipients){if(shieldPerAlly>0){addShield(ally,shieldPerAlly);emitCombatVisual('shield-applied',[ally.id],1000,{shield:shieldPerAlly,totalShield:ally.shield})}}
 const weaponDuplicates=premiumWeaponDuplicateRank('logan'),tauntRate=weaponDuplicates>=2?.5:.25,tauntTurns=weaponDuplicates>=2?3:2;
 for(const enemy of liveEnemies())applyTaunt(enemy,logan,tauntRate,tauntTurns);
 emitCombatVisual('logan-blood-shield',recipients.map(ally=>ally.id),COMBAT_ACTION_EFFECT_MS,{healthCost,shieldPerAlly});return {healthCost,shieldPerAlly,tauntRate,tauntTurns};
}
function executeCombatAction(a,action,ultimateSeq=null,allyTargetId=null){
 if(!a||a.hp<=0||!['basic','skill','ultimate'].includes(action))return false;
 const dawnSupport=a.id==='dawn'&&(action==='skill'||action==='ultimate'),teamWideSupport=actionTargetMode(a,action)==='allAllies',supportAction=dawnSupport||teamWideSupport,allyTarget=dawnSupport?party.find(p=>p.id===allyTargetId&&p.hp>0):null;
 if(dawnSupport&&!allyTarget){say('Dawn’s ability needs a living ally target.');return false}
 const victim=supportAction?null:chosenEnemy();if(!supportAction&&!victim){say('No available enemy target.');return false;}
 const targetGeometry=victim?{x:victim.x,y:victim.y,w:victim.w,h:victim.h,slot:victim.slot}:null;
 const mode=supportAction?'ally':actionTargetMode(a,action),targets=supportAction?[]:chooseAttackTargets(mode,victim);
 const controlledSummon=action==='skill'&&a.test?summons.find(s=>s.mode==='controlled'&&!s.pendingCreation&&s.ownerId===a.id):null;
 const energyBefore=a.energy,spBefore=sp,spMaxBefore=effectiveSpMax();
 let damage=0,enhanceSpent=0,soulRate=null,zeroRate=null,tuneBasicUsed=action==='basic'&&!!a.tune?.basicEnhanced;
 if(a.id==='soul'&&action==='basic'){
  enhanceSpent=soulEnhanceStacks;soulEnhanceStacks=0;const basicDupe=premiumWeaponDuplicateRank(a.id)>=1?2:1,skillPerPoint=characterDuplicateRank(a.id)>=4?2:1;soulRate=(basicDupe*celestialMultiplier(a.id,'basic')+enhanceSpent*skillPerPoint*celestialMultiplier(a.id,'skill'))*(tuneBasicUsed?1+a.tune.damageBonus:1);
  damage=soulDamageForTarget(a,targets[0],soulRate);a.energy=Math.min(120,a.energy+10+10*enhanceSpent);
 }else if(a.id==='soul'&&action==='ultimate'){const ultimateDupe=characterDuplicateRank(a.id)>=3?2:1;soulRate=2*ultimateDupe*celestialMultiplier(a.id,'ultimate');damage=soulDamageForTarget(a,targets[0],soulRate)}
 else if(a.id==='zero'&&action==='basic'){
  zeroRate=0.5*celestialMultiplier(a.id,'basic')*(characterDuplicateRank(a.id)>=2?2:1);damage=calculateTypedActionDamage('physical',zeroRate,a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+20);
 }else if(a.id==='zero'&&action==='skill'){
  if(sp<1){say('First Strike needs 1 Skill Point.');return false}
  const firstStrike=!zeroHitEnemyIds.has(targets[0]?.id),base=firstStrike?1.5:1.0;
  zeroRate=base*(characterDuplicateRank(a.id)>=4?2:1)*celestialMultiplier(a.id,'skill');damage=calculateTypedActionDamage('physical',zeroRate,a,targets[0])?.damageTaken??0;sp--;a.energy=Math.min(120,a.energy+20);
 }else if(a.id==='zero'&&action==='ultimate'){
  zeroRate=1.0*(characterDuplicateRank(a.id)>=3?2:1)*celestialMultiplier(a.id,'ultimate');damage=calculateTypedActionDamage('physical',zeroRate,a,targets[0])?.damageTaken??0;
 }
 else if(a.id==='lily'&&action==='basic'){damage=calculateTypedActionDamage('magical',celestialMultiplier(a.id,'basic')*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+10)}
 else if(a.id==='lily'&&action==='skill'){damage=calculateTypedActionDamage('magical',0.5*celestialMultiplier(a.id,'skill'),a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+20);sp=Math.max(0,sp-1)}
 else if(a.id==='lily'&&action==='ultimate'){const rate=celestialMultiplier(a.id,'ultimate')*(characterDuplicateRank(a.id)>=3?2:1);damage=calculateTypedActionDamage('magical',rate,a,targets[0])?.damageTaken??0}
 else if(a.id==='dawn'&&action==='basic'){damage=calculateTypedActionDamage('magical',2*celestialMultiplier(a.id,'basic')*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+10)}
 else if(a.id==='dawn'&&action==='skill'){sp=Math.max(0,sp-1);a.energy=Math.min(120,a.energy+20);applyDawnTune(allyTarget)}
 else if(a.id==='dawn'&&action==='ultimate'){allyTarget.energy=Math.min(120,allyTarget.energy+120*(characterDuplicateRank(a.id)>=1?1:.5));addActionAdvance(allyTarget.id,100);gainSp(characterDuplicateRank(a.id)>=2?3:1)}
 else if(a.id==='logan'&&action==='basic'){const multiplier=celestialMultiplier(a.id,'basic')*(premiumWeaponDuplicateRank(a.id)>=1?2:1);damage=calculateTypedActionDamage('physical',multiplier,a,targets[0])?.damageTaken??0;a.energy=Math.min(120,a.energy+10)}
 else if(a.id==='logan'&&action==='skill'){sp=Math.max(0,sp-1);a.energy=Math.min(120,a.energy+20);applyLoganBloodShield(a)}
 else if(a.id==='logan'&&action==='ultimate'){const multiplier=celestialMultiplier(a.id,'ultimate')*(premiumWeaponDuplicateRank(a.id)>=3?2:1);damage=calculateTypedActionDamage('magical',multiplier,a,targets[0])?.damageTaken??0}
 else if(action==='basic'){damage=280;a.energy=Math.min(120,a.energy+25)}
 else if(action==='skill'){damage=460;a.energy=Math.min(120,a.energy+35);sp--;addActionAdvance(a.id,25)}
 else damage=980;
 if(action==='basic')gainSp(1);
 if(tuneBasicUsed)gainSp(1);
 const serial=++attackSerial,ricochetEligibleEnemyIds=liveEnemies().filter(enemy=>enemy.marks?.some(mark=>mark.id==='ricochet')).map(enemy=>enemy.id);
 attackInProgress=true;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;cameraPreview=null;selectedAllyId=null;
 lastAttack={serial,actor:a.id,action,mode,ultimateSeq,allyTargetId:allyTarget?.id||null,tuneBasicUsed,controlledSummonId:controlledSummon?.id||null,initialTarget:victim?.id||allyTarget?.id||null,initialTargets:targets.map(e=>e.id),
  ricochetEligibleEnemyIds,hits:[],defeats:[],finished:false,startedAt:performance.now(),finishedAt:null,energyBefore,energyAfter:a.energy,spBefore,spAfter:sp,spMaxBefore,spMaxAfter:effectiveSpMax(),enhanceSpent,soulRate,zeroRate};
 phase='resolve';if(dawnSupport)selectedAllyId=allyTarget.id;const actionVisual=ACTION_VISUALS[a.id]?.[action]||`${a.id}-${action}`;fx=supportAction?{kind:'support',visual:actionVisual,at:performance.now(),damage:0,actor:a.id,targetAllyId:allyTarget?.id||null,targetAllyIds:teamWideSupport?party.filter(ally=>ally.hp>0).map(ally=>ally.id):null,action}:{kind:action,visual:actionVisual,at:performance.now(),damage,actor:a.id,targetEnemyId:victim?.id||null,targetEnemyIds:targets.map(e=>e.id),targetGeometry};
 log=a.id==='soul'?(action==='ultimate'?'SOUL ULTIMATE • INITIAL TRUE AOE':action==='basic'?'SOUL BASIC • INITIAL TRUE HIT':'SOUL '+action.toUpperCase()):a.id==='zero'?'ZERO '+(action==='skill'?'FIRST STRIKE':action==='ultimate'?'EXECUTION':'BASIC ATTACK')+' • PHYSICAL HIT':a.id==='dawn'?(action==='skill'?'DAWN TUNE • '+allyTarget.name:action==='ultimate'?'DAWN ULTIMATE • '+allyTarget.name:'DAWN BASIC • INITIAL MAGICAL HIT'):a.id==='lily'?'LILY '+action.toUpperCase()+' • INITIAL HIT':a.id==='logan'?(action==='skill'?'LOGAN BLOOD SHIELD • TEAM GUARD':action==='ultimate'?'LOGAN ULTIMATE • RED TIDE AOE':'LOGAN BASIC • BLEEDING STRIKE'):'TEST '+mode.toUpperCase()+': '+a.name+' uses '+action+' • '+targets.length+' initial target(s).';
 if(controlledSummon)summonHistory.push({event:'controlled-activation',id:controlledSummon.id,ownerId:a.id,clock:turnTimeline.clock});
 if(mode==='five-hit'){
  let focused=victim,lastSlot=victim.slot;
  for(let n=0;n<5;n++)schedule(()=>{if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;if(!focused||focused.hp<=0)focused=closestSurvivingEnemy(lastSlot);if(!focused)return;lastSlot=focused.slot;const part=Math.floor(damage/5)+(n<damage%5?1:0);applyTrainingHit(focused,part,n+1,true)},ANIMATION_STEP_MS*(n+1));
 }else schedule(()=>{
  if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;
  for(let n=0;n<targets.length;n++)if(targets[n].hp>0){let hitDamage=damage;if(a.id==='soul'&&(action==='basic'||action==='ultimate'))hitDamage=soulDamageForTarget(a,targets[n],soulRate);else if(a.id==='zero')hitDamage=calculateTypedActionDamage('physical',zeroRate,a,targets[n])?.damageTaken??0;else if(a.id==='lily')hitDamage=calculateTypedActionDamage('magical',(action==='skill' ? 0.5 : 1)*celestialMultiplier(a.id,action)*(action==='ultimate'&&characterDuplicateRank(a.id)>=3?2:1)*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[n])?.damageTaken??0;else if(a.id==='dawn'&&action==='basic')hitDamage=calculateTypedActionDamage('magical',2*celestialMultiplier(a.id,'basic')*(tuneBasicUsed?1+a.tune.damageBonus:1),a,targets[n])?.damageTaken??0;applyTrainingHit(targets[n],hitDamage,n+1,true)}
 },a.id==='soul'&&action==='basic'?ANIMATION_STEP_MS*3:ANIMATION_STEP_MS);
 schedule(()=>finishTrainingAttack(serial),mode==='five-hit'?ULTIMATE_PRESENTATION_MS:a.id==='soul'&&action==='basic'?SOUL_BASIC_MS:action==='ultimate'?ULTIMATE_PRESENTATION_MS:COMBAT_ACTION_EFFECT_MS);
 return true;
}
// Developer-only test helpers. They do not define the game's revival resource, cost, or eligibility rules.
function testKO(){if(!paused||phase!=='player')return;const others=alive().filter(p=>p.id!==activeId);if(!others.length){say('Debug KO requires another living ally; no final-ally KO.');return}const p=others[0];p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();log=`DEBUG ONLY: ${p.name} knocked out; party slot retained.`}
function testRevive(){if(!paused||phase!=='player')return;const p=party.find(p=>p.hp<=0);if(!p){say('No knocked-out member to test revival.');return}p.hp=Math.max(1,roundHp(p.maxHp*.35));gauges[p.id]=0;saveVitals();log=`DEBUG ONLY: ${p.name} restored in the same party slot.`}
function rect(x,y,w,h,fill,stroke=null,r=0){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function text(s,x,y,size=24,fill=color.white,weight='600',align='left'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.font=`${weight} ${size}px system-ui,-apple-system,Segoe UI,sans-serif`;ctx.fillText(String(s),x,y)}
function line(x,y,w,f=1,c='#72e3ae',bg='#303649',h=13){rect(x,y,w,h,bg,null,6);rect(x,y,Math.max(0,w*Math.min(1,Math.max(0,f))),h,c,null,6)}
function segmentedHealthBar(x,y,w,h,hp,maxHp,bars=1,fill='#ff8276',background='#4b2637'){
 const count=Math.max(1,Math.min(3,Number.isInteger(bars)?bars:1)),gap=count>1?3:0,segmentWidth=(w-gap*(count-1))/count,segmentMax=maxHp/count;
 for(let i=0;i<count;i++){const amount=Math.max(0,Math.min(segmentMax,hp-i*segmentMax));line(x+i*(segmentWidth+gap),y,segmentWidth,segmentMax?amount/segmentMax:0,fill,background,h)}
}
function shieldedHealthBar(x,y,w,h,hp,maxHp,shield,fill='#72e3ae',background='#303649'){
 line(x,y,w,maxHp?hp/maxHp:0,fill,background,h);
 if(!(shield>0)||!(maxHp>0))return;
 const extra=Math.min(w*.12,Math.max(3,w*shield/maxHp)),covered=Math.min(w*1.12,w*Math.max(0,hp/maxHp)+extra);
 ctx.save();ctx.fillStyle='rgba(178,187,196,.48)';ctx.beginPath();ctx.roundRect(x,y-4,covered,h+8,Math.min(7,(h+8)/2));ctx.fill();ctx.restore();
}
function addButton(x,y,w,h,action,label,sub='',enabled=true,labelSize=19){choiceRects.push({x,y,w,h,action,enabled});rect(x,y,w,h,enabled?'#263754':'#1d2538',enabled?'#a5c9dc':'#526176',11);text(label,x+w/2,y+h/2-(sub?10:0),labelSize,enabled?'#fff4e6':'#9eafc1','750','center');if(sub)text(sub,x+w/2,y+h/2+16,13,'#bacadb','500','center')}
function drawBackground(){ctx.imageSmoothingEnabled=false;if(images.arena.complete&&images.arena.naturalWidth)ctx.drawImage(images.arena,0,0,W,H);else{rect(0,0,W,H,'#596f83');rect(0,480,W,420,'#a38f9e')}rect(0,0,W,165,'rgba(8,10,22,.24)');const shade=ctx.createLinearGradient(0,580,0,900);shade.addColorStop(0,'#17122500');shade.addColorStop(1,'#090d23dc');rect(0,560,W,340,shade)}

const RUNE_STATS=['hp','physicalAttack','magicalAttack','physicalDefense','magicalDefense','speed'];
const RUNE_STAT_INFO={
 hp:{label:'HP',main:100},physicalAttack:{label:'Physical Attack',main:20},
 magicalAttack:{label:'Magical Attack',main:20},physicalDefense:{label:'Physical Defense',main:4},
 magicalDefense:{label:'Magical Defense',main:4},speed:{label:'Speed',main:20}
};
const CELESTIALS=[['passive','PASSIVE'],['basic','BASIC'],['skill','SKILL'],['ultimate','ULTIMATE']];
function defaultLoadout(){return {characterDuplicates:0,weapon:{selected:'standard',standardPotential:1,premiumPotential:1,premiumOwned:false,standardLevel:1,standardExp:0,standardAscended:[],premiumLevel:1,premiumExp:0,premiumAscended:[]},runes:[null,null,null,null],celestials:{passive:1,basic:1,skill:1,ultimate:1}}}
function normalizeRune(value){
 if(!value||typeof value!=='object'||!RUNE_STATS.includes(value.main)||!Array.isArray(value.subs))return null;
 const subs=value.subs.filter((x,i,a)=>RUNE_STATS.includes(x)&&x!==value.main&&a.indexOf(x)===i).slice(0,3);
 return subs.length===3?{level:Number.isInteger(value.level)?Math.max(1,Math.min(5,value.level)):1,main:value.main,subs,setId:typeof value.setId==='string'?value.setId:null,criticalRateBonus:Number.isFinite(value.criticalRateBonus)?Math.max(0,value.criticalRateBonus):0,criticalDamageBonus:Number.isFinite(value.criticalDamageBonus)?Math.max(0,value.criticalDamageBonus):0}:null
}
function normalizeLoadout(value,cap=characterLevelCap()){
 const base=defaultLoadout();if(!value||typeof value!=='object')return base;
 base.characterDuplicates=Number.isInteger(value.characterDuplicates)?Math.max(0,Math.min(4,value.characterDuplicates)):0;
 const weapon=value.weapon&&typeof value.weapon==='object'?value.weapon:{};
 base.weapon.standardPotential=Number.isInteger(weapon.standardPotential)?Math.max(1,Math.min(5,weapon.standardPotential)):1;
 base.weapon.premiumPotential=Number.isInteger(weapon.premiumPotential)?Math.max(1,Math.min(5,weapon.premiumPotential)):1;
 base.weapon.premiumOwned=weapon.premiumOwned===true;
 for(const type of ['standard','premium']){
  const levelKey=type+'Level',expKey=type+'Exp',level=weapon[levelKey],exp=weapon[expKey];
  const ascended=weapon[type+'Ascended'];base.weapon[type+'Ascended']=Array.isArray(ascended)?ASCENSION_GATES.filter(gate=>ascended.includes(gate)&&gate<=(Number.isInteger(level)?level:1)):[];
  base.weapon[levelKey]=Number.isInteger(level)?Math.max(1,Math.min(cap,level)):1;
  base.weapon[expKey]=Number.isSafeInteger(exp)&&exp>=0&&base.weapon[levelKey]<cap?exp:0;
  while(base.weapon[levelKey]<cap&&(!ASCENSION_GATES.includes(base.weapon[levelKey])||base.weapon[type+'Ascended'].includes(base.weapon[levelKey]))&&base.weapon[expKey]>=requiredExp(base.weapon[levelKey])){
   base.weapon[expKey]-=requiredExp(base.weapon[levelKey]);base.weapon[levelKey]++;
  }
  if(base.weapon[levelKey]>=cap)base.weapon[expKey]=0;
 }
 base.weapon.selected=weapon.selected==='premium'&&base.weapon.premiumOwned?'premium':'standard';
 if(Array.isArray(value.runes))base.runes=Array.from({length:4},(_,i)=>normalizeRune(value.runes[i]));
 if(value.celestials&&typeof value.celestials==='object')for(const [key] of CELESTIALS){const n=value.celestials[key];base.celestials[key]=Number.isInteger(n)?Math.max(1,Math.min(10,n)):1}
 return base
}
function loadCharacterLoadouts(){let stored={};try{stored=JSON.parse(localStorage.getItem(LOADOUT_KEY)||'{}')||{}}catch(e){}return Object.fromEntries(ROSTER.map(model=>[model.id,normalizeLoadout(stored[model.id])]))}
let characterLoadouts=loadCharacterLoadouts(),loadoutCharacterId='soul',selectedLoadoutRune=0,loadoutPage='characters',runeStatPicker=null,weaponBookSelection={small:0,medium:0,large:0};
function loadoutFor(id=loadoutCharacterId){return characterLoadouts[id]||(characterLoadouts[id]=defaultLoadout())}
function saveLoadouts(){try{localStorage.setItem(LOADOUT_KEY,JSON.stringify(characterLoadouts))}catch(e){}}
function defaultItemInventory(){return {bottles:{small:0,medium:0,large:0},books:{small:0,medium:0,large:0},cores:0,gems:0}}
function normalizeItemInventory(value){
 const base=defaultItemInventory();if(!value||typeof value!=='object'||Array.isArray(value))return base;
 for(const [group] of [['bottles'],['books']])for(const size of ['small','medium','large']){
  const count=value[group]?.[size];base[group][size]=Number.isSafeInteger(count)&&count>=0?count:0;
 }
 for(const id of ['cores','gems']){const count=value[id];base[id]=Number.isSafeInteger(count)&&count>=0?count:0}
 return base;
}
function validItemInventory(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 for(const key of ['cores','gems'])if(value[key]!==undefined&&(!Number.isSafeInteger(value[key])||value[key]<0))return false;
 for(const group of ['bottles','books'])if(value[group]!==undefined){
  if(!value[group]||typeof value[group]!=='object'||Array.isArray(value[group]))return false;
  for(const size of ['small','medium','large'])if(value[group][size]!==undefined&&(!Number.isSafeInteger(value[group][size])||value[group][size]<0))return false;
 }
 return true;
}
function loadItemInventory(){try{return normalizeItemInventory(JSON.parse(localStorage.getItem(ITEM_INVENTORY_KEY)||'null'))}catch(e){return defaultItemInventory()}}
let itemInventory=loadItemInventory();
function saveItemInventory(){try{localStorage.setItem(ITEM_INVENTORY_KEY,JSON.stringify(itemInventory));return true}catch(e){return false}}
function loadStoreCoins(){try{const raw=localStorage.getItem(STORE_COINS_KEY);if(raw!==null){const n=Number(raw);return Number.isSafeInteger(n)&&n>=0?n:0}localStorage.setItem(STORE_COINS_KEY,'0');return 0}catch(e){return 0}}
let storeCoins=loadStoreCoins();
function saveStoreCoins(){try{localStorage.setItem(STORE_COINS_KEY,String(storeCoins));return true}catch(e){return false}}
function grantStoreCoins(amount){if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(storeCoins+amount))return false;storeCoins+=amount;saveStoreCoins();return true}
function grantItem(itemId,amount=1){
 if(!Number.isSafeInteger(amount)||amount<1)return false;
 const match=/^(bottle|book):(small|medium|large)$/.exec(itemId||'');
 if(match){const group=match[1]==='bottle'?'bottles':'books',next=itemInventory[group][match[2]]+amount;if(!Number.isSafeInteger(next))return false;itemInventory[group][match[2]]=next}
 else if(['core','gem'].includes(itemId)){const key=itemId==='core'?'cores':'gems',next=itemInventory[key]+amount;if(!Number.isSafeInteger(next))return false;itemInventory[key]=next}
 else return false;
 saveItemInventory();return true;
}
function consumeItem(itemId,amount=1){
 if(!Number.isSafeInteger(amount)||amount<1)return false;
 const match=/^(bottle|book):(small|medium|large)$/.exec(itemId||'');
 if(match){const group=match[1]==='bottle'?'bottles':'books';if(itemInventory[group][match[2]]<amount)return false;itemInventory[group][match[2]]-=amount}
 else if(['core','gem'].includes(itemId)){const key=itemId==='core'?'cores':'gems';if(itemInventory[key]<amount)return false;itemInventory[key]-=amount}
 else return false;
 saveItemInventory();return true;
}
if(DEV_MODE)globalThis.TwoToneItems=Object.freeze({grant:grantItem,getInventory:()=>JSON.parse(JSON.stringify(itemInventory)),grantCoins:grantStoreCoins,getCoins:()=>storeCoins});
FeaturedLottery.setRewardGrant(grantItem);
const SAVE_FILE_FORMAT='two-tone-save',SAVE_FILE_VERSION=4;
function saveProgressFile(){
 try{
  saveProgress();saveVitals();saveLoadouts();saveItemInventory();saveStoreCoins();savePlayerRank();if(validTeam(draft))saveTeam();
  const documentData={format:SAVE_FILE_FORMAT,version:SAVE_FILE_VERSION,savedAt:new Date().toISOString(),data:{playerRank,team:validTeam(draft)?[...draft]:loadTeam(),characterProgress,vitals:savedVitals,loadouts:characterLoadouts,itemInventory,storeCoins}};
  const blob=new Blob([JSON.stringify(documentData,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`two-tone-save-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  say('Save file downloaded. Keep it in Files to load on this or another device.');return true;
 }catch(error){say('The save file could not be created. Check available storage and try again.');return false}
}
function normalizeSaveFile(value){
 if(!value||typeof value!=='object'||value.format!==SAVE_FILE_FORMAT||![1,2,3,SAVE_FILE_VERSION].includes(value.version)||!value.data||typeof value.data!=='object')return null;
 const data={...value.data};
 if(value.version===1){data.team=Array.isArray(data.team)?data.team.map(id=>id==='zero'?'soul':id):data.team;data.characterProgress=moveLegacyCharacterRecord({...data.characterProgress});data.vitals=moveLegacyCharacterRecord({...data.vitals});data.loadouts=moveLegacyCharacterRecord({...data.loadouts})}
 const rank=data.playerRank,cap=characterLevelCap(rank);
 if(!cap||!validTeam(data.team)||!data.characterProgress||typeof data.characterProgress!=='object')return null;
 const progress={};for(const model of ROSTER){const entry=data.characterProgress[model.id]??defaultProgress();if(!validateProgress(entry,cap))return null;progress[model.id]={level:entry.level,exp:entry.exp,ascended:[...entry.ascended]}}
 if(data.vitals!==undefined&&(!data.vitals||typeof data.vitals!=='object'||Array.isArray(data.vitals)))return null;
 const vitals={};for(const model of ROSTER){const entry=data.vitals?.[model.id];if(entry===undefined)continue;if(!entry||typeof entry!=='object'||!Number.isFinite(entry.hp)||entry.hp<0||!Number.isFinite(entry.maxHp)||entry.maxHp<=0)return null;vitals[model.id]={hp:entry.hp,maxHp:entry.maxHp}}
 if(data.loadouts!==undefined&&(!data.loadouts||typeof data.loadouts!=='object'||Array.isArray(data.loadouts)))return null;
 const loadouts={};for(const model of ROSTER){const entry=data.loadouts?.[model.id];if(entry===undefined){loadouts[model.id]=defaultLoadout();continue}if(!entry||typeof entry!=='object'||!Number.isInteger(entry.characterDuplicates)||entry.characterDuplicates<0||entry.characterDuplicates>4)return null;
  if(entry.weapon!==undefined&&(!entry.weapon||typeof entry.weapon!=='object'||!['standard','premium'].includes(entry.weapon.selected)||![entry.weapon.standardPotential,entry.weapon.premiumPotential].every(n=>Number.isInteger(n)&&n>=1&&n<=5)||typeof entry.weapon.premiumOwned!=='boolean'||['standard','premium'].some(type=>(entry.weapon[type+'Level']!==undefined&&(!Number.isInteger(entry.weapon[type+'Level'])||entry.weapon[type+'Level']<1||entry.weapon[type+'Level']>cap))||(entry.weapon[type+'Exp']!==undefined&&(!Number.isSafeInteger(entry.weapon[type+'Exp'])||entry.weapon[type+'Exp']<0))||(entry.weapon[type+'Ascended']!==undefined&&(!Array.isArray(entry.weapon[type+'Ascended'])||entry.weapon[type+'Ascended'].some(gate=>!ASCENSION_GATES.includes(gate)))))))return null;
  if(entry.runes!==undefined&&(!Array.isArray(entry.runes)||entry.runes.length>4||entry.runes.some(rune=>rune!==null&&!normalizeRune(rune))))return null;
  if(entry.celestials!==undefined&&(!entry.celestials||typeof entry.celestials!=='object'||CELESTIALS.some(([key])=>!Number.isInteger(entry.celestials[key])||entry.celestials[key]<1||entry.celestials[key]>10)))return null;
  loadouts[model.id]=normalizeLoadout(entry,cap);
 }
 const inventory=data.itemInventory===undefined?defaultItemInventory():normalizeItemInventory(data.itemInventory);
 if(data.itemInventory!==undefined&&!validItemInventory(data.itemInventory))return null;
 const coins=data.storeCoins===undefined?0:data.storeCoins;
 if(!Number.isSafeInteger(coins)||coins<0)return null;
 return {playerRank:rank,team:[...data.team],characterProgress:progress,vitals,loadouts,itemInventory:inventory,storeCoins:coins};
}
function importSaveFile(value){
 const save=normalizeSaveFile(value);if(!save){say('This save file is invalid or from an unsupported version.');return false}
 let hasLocalProgress=false;try{hasLocalProgress=[TEAM_KEY,PROGRESSION_KEY,VITALS_KEY,LOADOUT_KEY,ITEM_INVENTORY_KEY,STORE_COINS_KEY].some(key=>localStorage.getItem(key)!==null)}catch(e){}
 if(hasLocalProgress&&!window.confirm('Loading this file replaces the progress saved in this browser. Continue?'))return false;
 const entries=[[TEAM_KEY,JSON.stringify(save.team)],[PROGRESSION_KEY,JSON.stringify(save.characterProgress)],[VITALS_KEY,JSON.stringify(save.vitals)],[LOADOUT_KEY,JSON.stringify(save.loadouts)],[ITEM_INVENTORY_KEY,JSON.stringify(save.itemInventory)],[STORE_COINS_KEY,String(save.storeCoins)],[PLAYER_RANK_KEY,String(save.playerRank)]];
 const previous=entries.map(([key])=>{try{return localStorage.getItem(key)}catch(e){return null}});
 try{for(const [key,value] of entries)localStorage.setItem(key,value)}catch(error){entries.forEach(([key],index)=>{try{if(previous[index]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[index])}catch(e){}});say('Progress could not be restored because browser storage is unavailable.');return false}
 playerRank=save.playerRank;characterProgress=save.characterProgress;savedVitals=save.vitals;characterLoadouts=save.loadouts;itemInventory=save.itemInventory;storeCoins=save.storeCoins;draft=[...save.team];party=[];phase='menu';paused=false;activeId=null;actingEnemyId=null;fx=null;combatVisualEvents=[];enemies=[];gauges={};summons=[];ultimateQueue=[];ultimateExecuting=false;ultimateResume=null;turnTimeline.reset();battleToken++;cameraPreview=null;selectedAllyId=null;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;pendingVacancies=[];hint='';say('Progress loaded from save file.');return true;
}
function requestSaveFileLoad(){const input=document.getElementById('save-file-picker');input.value='';input.click()}
function weaponLevelCap(rank=playerRank){return characterLevelCap(rank)}
function weaponPotentialMultiplier(type,potential,level){
 if(!['standard','premium'].includes(type)||!Number.isInteger(potential)||potential<1||potential>5||!Number.isInteger(level)||level<1)return 0;
 const levelOnePercent=type==='premium'?51+(potential-1)*25:31+(potential-1)*5;
 return (levelOnePercent+level-1)/100;
}
function weaponProgress(record,type){const w=record.weapon;return {level:w[type+'Level'],exp:w[type+'Exp']}}
function weaponBonus(record,id=loadoutCharacterId){
 const w=record.weapon,type=w.selected==='premium'&&w.premiumOwned?'premium':'standard';
 return weaponPotentialMultiplier(type,type==='premium'?w.premiumPotential:w.standardPotential,w[type+'Level']);
}
function equippedSoulBattleSprite(){const weapon=loadoutFor('soul').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'soulBattlePremium':'soulBattleStandard'}
function settleWeaponProgress(weapon,type,cap=weaponLevelCap()){
 const levelKey=type+'Level',expKey=type+'Exp',ascendedKey=type+'Ascended';let levelsGained=0;
 while(weapon[levelKey]<cap){
  if(ASCENSION_GATES.includes(weapon[levelKey])&&!weapon[ascendedKey].includes(weapon[levelKey]))break;
  const needed=requiredExp(weapon[levelKey]);if(weapon[expKey]<needed)break;
  weapon[expKey]-=needed;weapon[levelKey]++;levelsGained++;
 }
 if(weapon[levelKey]>=cap)weapon[expKey]=0;
 return levelsGained;
}
function grantWeaponXp(id,type,amount){
 if(!ROSTER_IDS.has(id)||!['standard','premium'].includes(type)||!Number.isSafeInteger(amount)||amount<=0)return false;
 const record=loadoutFor(id),weapon=record.weapon,levelKey=type+'Level',expKey=type+'Exp',cap=weaponLevelCap();
 if(type==='premium'&&!weapon.premiumOwned)return false;
 if(weapon[levelKey]>=cap)return false;
 const oldLevel=weapon[levelKey],exp=weapon[expKey]+amount;if(!Number.isSafeInteger(exp))return false;
 weapon[expKey]=exp;const levelsGained=settleWeaponProgress(weapon,type,cap);saveLoadouts();
 return {level:weapon[levelKey],exp:weapon[expKey],levelsGained,nextExp:requiredExp(weapon[levelKey])};
}
const ITEM_XP=Object.freeze({small:10,medium:100,large:1000});
function useCharacterBottle(id,size){
 const amount=ITEM_XP[size];if(!amount||!consumeItem('bottle:'+size))return false;
 const result=grantCharacterXp(id,amount);if(!result){grantItem('bottle:'+size);return false}
 return result;
}
function useWeaponBook(id,type,size){
 const amount=ITEM_XP[size];if(!amount||!consumeItem('book:'+size))return false;
 const result=grantWeaponXp(id,type,amount);if(!result){grantItem('book:'+size);return false}
 return result;
}
function upgradeRuneWithCore(id,index){
 const rune=loadoutFor(id).runes[index];if(!rune||rune.level>=5||!consumeItem('core'))return false;
 rune.level++;saveLoadouts();return rune.level;
}
function upgradeCelestialWithCore(id,key){
 const record=loadoutFor(id),level=record.celestials[key];if(!Number.isInteger(level)||level>=10||!consumeItem('core'))return false;
 record.celestials[key]++;saveLoadouts();return record.celestials[key];
}
function ascendCharacterWithGem(id){
 const progress=progressFor(id);if(!progress||!ASCENSION_GATES.includes(progress.level)||progress.ascended.includes(progress.level)||!consumeItem('gem'))return false;
 if(testAscend(id))return true;grantItem('gem');return false;
}
function ascendWeaponWithGem(id,type){
 if(!ROSTER_IDS.has(id)||!['standard','premium'].includes(type))return false;
 const weapon=loadoutFor(id).weapon,level=weapon[type+'Level'],ascended=weapon[type+'Ascended'];
 if(type==='premium'&&!weapon.premiumOwned||!ASCENSION_GATES.includes(level)||ascended.includes(level)||!consumeItem('gem'))return false;
 ascended.push(level);settleWeaponProgress(weapon,type);saveLoadouts();return true;
}
function loadoutStatModifiers(id,characterLevel=1){
 const record=loadoutFor(id),bonus=weaponBonus(record,id),totals=Object.fromEntries(RUNE_STATS.map(k=>[k,0]));
 for(const rune of record.runes){if(!rune)continue;totals[rune.main]+=RUNE_STAT_INFO[rune.main].main*rune.level;for(const sub of rune.subs)totals[sub]+=RUNE_STAT_INFO[sub].main*.25*rune.level}
 const pct={signatureWeapon:bonus},criticalRateFromRunes=record.runes.reduce((sum,rune)=>sum+(rune?.criticalRateBonus||0),0),criticalDamageFromRunes=record.runes.reduce((sum,rune)=>sum+(rune?.criticalDamageBonus||0),0);
 return {hpFlatModifiers:{},hpPercentModifiers:pct,hpEquipmentFlatModifiers:{runes:totals.hp},
 physicalAttackFlatModifiers:{},physicalAttackPercentModifiers:pct,physicalAttackEquipmentFlatModifiers:{runes:totals.physicalAttack},
 magicalAttackFlatModifiers:{},magicalAttackPercentModifiers:pct,magicalAttackEquipmentFlatModifiers:{runes:totals.magicalAttack},
 physicalDefenseFlatModifiers:{},physicalDefensePercentModifiers:pct,physicalDefenseEquipmentFlatModifiers:{runes:totals.physicalDefense},
 magicalDefenseFlatModifiers:{},magicalDefensePercentModifiers:pct,magicalDefenseEquipmentFlatModifiers:{runes:totals.magicalDefense},
 speedFlatModifiers:{},speedPercentModifiers:pct,speedEquipmentFlatModifiers:{runes:totals.speed},criticalRateModifiers:{runes:criticalRateFromRunes,premiumWeaponDuplicate2:id==='soul'&&premiumWeaponDuplicateRank(id)>=2 ? .1 : 0},criticalDamageModifiers:{runes:criticalDamageFromRunes,premiumWeaponDuplicate2:id==='soul'&&premiumWeaponDuplicateRank(id)>=2 ? .25 : 0}}
}
function celestialMultiplier(id,key){return 1+.10*(loadoutFor(id).celestials[key]||1)}
function characterDuplicateRank(id='soul'){return loadoutFor(id).characterDuplicates||0}
function premiumWeaponDuplicateRank(id='soul'){const w=loadoutFor(id).weapon;return w.selected==='premium'&&w.premiumOwned?Math.max(0,w.premiumPotential-1):0}
function soulFollowUpLimit(){return characterDuplicateRank('soul')>=1?7:5}
function soulEnhancedBasicTargetMode(stacks){if(stacks<3)return 'single';return premiumWeaponDuplicateRank()>=3?'aoe':'blast'}

function loadoutStats(id){
 const model=ROSTER.find(x=>x.id===id),level=progressFor(id)?.level||1;if(!model)return null;
 const unit={...model,level,...loadoutStatModifiers(id,level)};
 return {HP:calculateMaxHp(model.hp,level,unit.hpFlatModifiers,unit.hpPercentModifiers,unit.hpEquipmentFlatModifiers),
 'Physical Attack':calculatePhysicalAttack(unit),'Magical Attack':calculateMagicalAttack(unit),
 'Physical Defense':calculatePhysicalDefense(unit),'Magical Defense':calculateMagicalDefense(unit),Speed:calculateSpeed(unit)}
}
function enterLoadout(){loadoutCharacterId='soul';selectedLoadoutRune=0;loadoutPage='details';runeStatPicker=null;weaponBookSelection={small:0,medium:0,large:0};phase='loadout';hint=''}
function handleLoadoutAction(action){
 const [kind,arg]=action.split(':'),record=loadoutFor(),weapon=record.weapon,rune=record.runes[selectedLoadoutRune];
 if(kind==='back'){if(runeStatPicker){runeStatPicker=null;return}phase='menu';return}
 if(kind==='character'){if(ROSTER_IDS.has(arg)&&!roster(arg)?.test){loadoutCharacterId=arg;weaponBookSelection={small:0,medium:0,large:0}}return}
 if(kind==='page'){if(['details','weapons','runes','celestials'].includes(arg)){loadoutPage=arg;weaponBookSelection={small:0,medium:0,large:0}}return}
 if(kind==='upgrade'&&arg==='weapon'){
  const type=weapon.selected,level=weapon[type+'Level'],gate=ASCENSION_GATES.includes(level)&&!weapon[type+'Ascended'].includes(level);
  if(gate){say(ascendWeaponWithGem(loadoutCharacterId,type)?'Weapon Ascension completed. One Gem was consumed.':'One Gem is required to Ascend this weapon.')}
  else if(level<weaponLevelCap()){
   let used=0;const remaining={...weaponBookSelection};
   for(const size of ['small','medium','large'])for(let i=0;i<weaponBookSelection[size];i++){
    const result=useWeaponBook(loadoutCharacterId,type,size);if(!result)break;remaining[size]--;used++;
   }
   weaponBookSelection=remaining;if(used)say(`${used} Enchanted Book${used===1?'':'s'} used.`);
  }
  return;
 }
 if(kind==='book-select'){
  const [size,delta]=arg.split(',');if(['small','medium','large'].includes(size)){weaponBookSelection[size]=Math.max(0,Math.min(itemInventory.books[size],weaponBookSelection[size]+Number(delta)||0))}return;
 }
 if(kind==='weapon-switch'){if(weapon.premiumOwned){weapon.selected=weapon.selected==='premium'?'standard':'premium';weaponBookSelection={small:0,medium:0,large:0};saveLoadouts()}return}
 if(kind==='character-duplicate'&&DEV_MODE)record.characterDuplicates=Math.max(0,Math.min(4,record.characterDuplicates+Number(arg)));
 else if(kind==='weapon-standard'){weapon.selected='standard';weaponBookSelection={small:0,medium:0,large:0}}
 else if(kind==='weapon-premium'){if(weapon.premiumOwned){weapon.selected='premium';weaponBookSelection={small:0,medium:0,large:0}}}
 else if(kind==='potential'&&DEV_MODE){const [type,delta]=arg.split(','),key=type==='premium'?'premiumPotential':'standardPotential';weapon[key]=Math.max(1,Math.min(5,weapon[key]+Number(delta)))}
 else if(kind==='rune-select')selectedLoadoutRune=Math.max(0,Math.min(3,Number(arg)||0));
 else if(kind==='rune-equip'&&DEV_MODE){const index=Math.max(0,Math.min(3,Number(arg)||0));record.runes[index]={level:1,main:'hp',subs:['physicalAttack','magicalAttack','physicalDefense'],setId:null};selectedLoadoutRune=index}
 else if(kind==='rune-remove')record.runes[selectedLoadoutRune]=null;
 else if(kind==='rune-level'&&rune&&Number(arg)===1){const level=upgradeRuneWithCore(loadoutCharacterId,selectedLoadoutRune);say(level?`Rune upgraded to Level ${level}.`:'A Core is required and the Rune must be below Level 5.')}
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
 else if(kind==='celestial'){const [key,delta]=arg.split(',');if(Number(delta)===1){const level=upgradeCelestialWithCore(loadoutCharacterId,key);say(level?`${key} Celestial upgraded to Level ${level}.`:'A Core is required and the Celestial must be below Level 10.')}}
 else if(kind==='bottle'){const result=useCharacterBottle(loadoutCharacterId,arg);say(result?`${arg} Enchanted Bottle used. ${result.levelsGained?`Character reached Level ${result.level}.`:`${result.exp} XP remains toward the next level.`}`:'Bottle unavailable or character is at their level cap.')}
 else if(kind==='book'){const [type,size]=arg.split(',');const result=useWeaponBook(loadoutCharacterId,type,size);say(result?`${size[0].toUpperCase()+size.slice(1)} Enchanted Book used. ${result.levelsGained?`Weapon reached Level ${result.level}.`:`${result.exp} XP is stored at this level.`}`:'Book unavailable, weapon locked, or weapon is at its level cap.')}
 else if(kind==='ascend-character'){say(ascendCharacterWithGem(loadoutCharacterId)?'Ascension completed. One Gem was consumed.':'One Gem is required at a valid Ascension gate.')}
 else if(kind==='ascend-weapon'){say(ascendWeaponWithGem(loadoutCharacterId,arg)?'Weapon Ascension completed. One Gem was consumed.':'One Gem is required at a valid weapon Ascension gate.')}
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
  const p=ROSTER[i],y=190+i*125,active=loadoutCharacterId===p.id;
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
 loadoutPanel(model.name+' • WEAPONS',`Each weapon levels independently. Enchanted Books: S ${itemInventory.books.small} • M ${itemInventory.books.medium} • L ${itemInventory.books.large}.`);
 const cap=weaponLevelCap();
 const cards=[{x:145,label:'STANDARD SIGNATURE',selected:w.selected==='standard',potential:w.standardPotential,type:'standard'},
              {x:825,label:'PREMIUM SIGNATURE',selected:w.selected==='premium',potential:w.premiumPotential,type:'premium'}];
 for(const c of cards){
  const level=w[c.type+'Level'],exp=w[c.type+'Exp'],needed=requiredExp(level),bonus=weaponPotentialMultiplier(c.type,c.potential,level)*100,atGate=ASCENSION_GATES.includes(level)&&!w[c.type+'Ascended'].includes(level);
  rect(c.x,205,630,470,'rgba(25,37,58,.94)',c.selected?'#edcf98':'#718ba4',14);
  const soulWeaponName=model.id==='soul'?(c.type==='standard'?'ASHBLADE':'SOULBOUND'):null;
  text(soulWeaponName?soulWeaponName+' • '+c.type.toUpperCase():c.label,c.x+30,245,22,'#f3dfb9','850');
  text(c.type==='standard'?'Included with '+model.name:'Acquired in the Store',c.x+30,278,15,'#c4d6e5','550');
  const weaponArt=model.id==='soul'?images[c.type==='premium'?'soulWeaponPremium':'soulWeaponStandard']:null;
  if(weaponArt?.complete&&weaponArt.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(weaponArt,c.x+386,215,220,220);ctx.restore()}
  text('+'+bonus.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'% to all six stats',c.x+30,340,26,'#f4d99c','800');
  text('POTENTIAL '+c.potential+' / 5   •   LEVEL '+level+' / '+cap,c.x+30,382,17,'#d6e2ef','750');
  text(atGate?'ASCENSION REQUIRED':level>=cap?'WEAPON LEVEL CAP REACHED':`XP  ${exp} / ${needed}  •  ${needed-exp} XP TO NEXT LEVEL`,c.x+30,414,15,'#c4d6e5','600');
  const usable=c.type==='standard'||w.premiumOwned;
  addButton(c.x+30,442,570,58,c.type==='standard'?'loadout:weapon-standard':'loadout:weapon-premium',
    usable?(c.selected?'EQUIPPED':'EQUIP'): 'PREMIUM • STORE LOCKED',
    usable?'Signature weapon • character locked':'Premium weapon is not owned',usable);
  if(c.type==='standard'||w.premiumOwned){
   if(DEV_MODE){addButton(c.x+180,515,90,50,'loadout:potential:'+c.type+',-1','−','',c.potential>1);addButton(c.x+360,515,90,50,'loadout:potential:'+c.type+',1','+','',c.potential<5)}
  }
  if(atGate)addButton(c.x+145,570,340,34,'loadout:ascend-weapon:'+c.type,'ASCEND • 1 GEM','GEMS ×'+itemInventory.gems,itemInventory.gems>0&&(c.type==='standard'||w.premiumOwned));
  addButton(c.x+26,610,178,48,'loadout:book:'+c.type+',small','SMALL ENCHANTED BOOK','×'+itemInventory.books.small,itemInventory.books.small>0&&usable&&level<cap,14);
  addButton(c.x+216,610,178,48,'loadout:book:'+c.type+',medium','MEDIUM ENCHANTED BOOK','×'+itemInventory.books.medium,itemInventory.books.medium>0&&usable&&level<cap,14);
  addButton(c.x+406,610,178,48,'loadout:book:'+c.type+',large','LARGE ENCHANTED BOOK','×'+itemInventory.books.large,itemInventory.books.large>0&&usable&&level<cap,14);
 }
 rect(145,705,1310,95,'rgba(25,37,58,.94)','#536983',12);
 const zeroPremiumEffect=['Ultimate restores 1 Skill Point.','Duplicate 1: Basic applies 1 Bleed stack.','Duplicate 2: Ultimate costs 80 Energy.','Duplicate 3: Ignore 20% of enemy Physical Defense.','Duplicate 4: Double Cutthroat’s bonus stats.'];
 const premiumEffect=model.id==='soul'?'Restores 1 Skill Point after every 3 Enhance points.':model.id==='zero'?zeroPremiumEffect[Math.min(4,premiumWeaponDuplicateRank('zero'))]:'Character-specific Premium effects are listed in the character sheet.';
 text('PREMIUM EFFECT • '+premiumEffect,175,755,16,'#d6e2ef','650');
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
   text(DEV_MODE?'Empty slot':'No rune equipped',x+30,y+104,18,'#aebfd0','550');
   if(DEV_MODE)addButton(x+30,y+150,590,64,'loadout:rune-equip:'+i,'ADD RUNE • PREVIEW','Rune inventory and set bonuses are not configured');
   continue;
  }
  text('LEVEL '+rune.level+' / 5',x+250,y+32,15,'#f1dfbf','750','center');
  addButton(x+315,y+12,125,42,'loadout:rune-level:1','UPGRADE','CORE ×'+itemInventory.cores,rune.level<5&&itemInventory.cores>0);
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
 loadoutPanel(model.name+' • CELESTIALS',`Four ability upgrades. Each level adds 10% to its base multiplier. Cores: ${itemInventory.cores}.`);
 for(let i=0;i<CELESTIALS.length;i++){
  const [key,label]=CELESTIALS[i],x=165+(i%2)*650,y=195+Math.floor(i/2)*292,level=record.celestials[key];
  rect(x,y,600,258,'rgba(25,37,58,.94)','#718ba4',14);
  text(label.toUpperCase(),x+30,y+48,22,'#f3dfb9','850');
  text('LEVEL '+level+' / 10',x+30,y+100,20,'#d6e2ef','700');
  text('+'+(level*10)+'% base multiplier',x+30,y+145,17,'#f4d99c','750');
  addButton(x+390,y+75,150,70,'loadout:celestial:'+key+',1','UPGRADE','',level<10&&itemInventory.cores>0);
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
 if(atGate)addButton(165,448,250,42,'loadout:ascend-character','ASCEND • 1 GEM','GEMS ×'+itemInventory.gems,itemInventory.gems>0);
 text('Level scaling multiplies base stats by character level.',165,490,14,'#c4d6e5','550');
 text('ENCHANTED BOTTLES  •  S '+itemInventory.bottles.small+'   M '+itemInventory.bottles.medium+'   L '+itemInventory.bottles.large,165,520,14,'#c4d6e5','650');
 const canUseBottle=progress.level<cap;
 addButton(165,536,165,38,'loadout:bottle:small','SMALL BOTTLE','10 XP • ×'+itemInventory.bottles.small,itemInventory.bottles.small>0&&canUseBottle);
 addButton(340,536,165,38,'loadout:bottle:medium','MEDIUM BOTTLE','100 XP • ×'+itemInventory.bottles.medium,itemInventory.bottles.medium>0&&canUseBottle);
 addButton(515,536,165,38,'loadout:bottle:large','LARGE BOTTLE','1,000 XP • ×'+itemInventory.bottles.large,itemInventory.bottles.large>0&&canUseBottle);
 text('CURRENT COMBAT STATS',165,580,17,'#f3dfb9','800');
 const statList=Object.entries(stats||{});
 for(let i=0;i<statList.length;i++){
  const [name,value]=statList[i],x=165+(i%2)*275,y=610+Math.floor(i/2)*28;
  text(name+'  '+(value===null?'—':Math.round(value)),x,y,14,'#d6dceb','650');
 }
 rect(790,190,680,450,'rgba(25,37,58,.94)','#718ba4',14);
 text(DEV_MODE?'CHARACTER DUPLICATES • TEST':'CHARACTER DUPLICATES',830,240,21,'#f3dfb9','850');
 text(`${DEV_MODE?'PREVIEW':'OWNED'}  ${record.characterDuplicates} / 4`,830,295,19,'#d6e2ef','700');
 if(DEV_MODE){addButton(830,335,95,58,'loadout:character-duplicate:-1','−','',record.characterDuplicates>0);addButton(940,335,95,58,'loadout:character-duplicate:1','+','',record.characterDuplicates<4)}
 const zeroDuplicates=['Ultimate delays all enemies by 20%.','Basic multiplier +100%.','Ultimate multiplier +100%.','First Strike multipliers +100%, including its first-hit bonus.'];
 const soulDuplicates=['Follow Up capacity increases by 2.','Follow Up multiplier doubles.','Ultimate multiplier doubles.','Each Enhance stack adds +200% Basic damage.'];
 const duplicateSet=model.id==='zero'?zeroDuplicates:model.id==='soul'?soulDuplicates:null;
 text(record.characterDuplicates&&duplicateSet?`DUPLICATE ${record.characterDuplicates} • ${duplicateSet[record.characterDuplicates-1]}`:DEV_MODE?'Duplicate effects preview without resource costs.':'No duplicate effects unlocked.',830,430,14,'#aebfd0','550');
 text('Levels affect all six base combat stats.',830,490,16,'#d6e2ef','650');
 text('Current loadout bonuses are included in the stat values.',830,525,14,'#aebfd0','550');
}
function drawLoadout(){
 const model=loadoutCharacter(),record=loadoutFor(loadoutCharacterId),progress=progressFor(loadoutCharacterId),cap=characterLevelCap();
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.52)');
 // Star-field details frame the character art without competing with the controls.
 for(let i=0;i<70;i++){const x=(i*193+61)%W,y=(i*317+37)%H,r=i%7===0?2:1;rect(x,y,r,r,'rgba(220,232,255,'+(i%3===0?'.52':'.25')+')')}
 text('CHARACTER DETAILS',42,42,14,'#d7c69f','800');text(model.name,42,72,25,'#fff1d5','850');
 // Character selector stays available across every loadout tab.
 for(let i=0;i<ROSTER.length;i++){
  const p=ROSTER[i],x=300+i*76,y=16,active=p.id===loadoutCharacterId,img=images[({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront'})[p.id]];
  choiceRects.push({x,y,w:68,h:68,action:'loadout:character:'+p.id,enabled:!p.test});
  ctx.save();ctx.beginPath();ctx.arc(x+34,y+34,31,0,Math.PI*2);ctx.clip();rect(x+3,y+3,62,62,'#18243a');if(img?.complete&&img.naturalWidth)drawCharacterPortrait(img,p.id,x+3,y+3,62);ctx.restore();
  ctx.beginPath();ctx.arc(x+34,y+34,active?34:32,0,Math.PI*2);ctx.strokeStyle=active?'#f5d897':'rgba(189,207,230,.62)';ctx.lineWidth=active?3:1.5;ctx.stroke();
 }
 addButton(1517,24,52,52,'loadout:back','×','',true,28);
 const tabs=[['details','DETAILS'],['weapons','WEAPONS'],['runes','RUNES'],['celestials','CELESTIALS']];
 for(let i=0;i<tabs.length;i++){
  const [key,label]=tabs[i],y=145+i*76,active=loadoutPage===key;
  if(active)rect(22,y-24,232,58,'rgba(228,195,130,.14)','#d2b77e',12);
  drawMainMenuIcon(({details:'party',weapons:'loadout',runes:'items',celestials:'settings'})[key],74,y+4,active?'#f2d28e':'#d7e2ef');
  choiceRects.push({x:22,y:y-24,w:232,h:58,action:'loadout:page:'+key,enabled:true});
  text(label,118,y+9,17,active?'#f4d99c':'#dce6f1',active?'800':'650');
 }
 // Small grounding glow under the character echoes the reference's luminous stage.
 const glow=ctx.createRadialGradient(680,846,8,680,846,370);glow.addColorStop(0,'rgba(163,191,255,.35)');glow.addColorStop(1,'rgba(82,114,190,0)');rect(280,720,760,180,glow);
 const artKey=({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront'})[model.id];
 const art=images[artKey];if(art?.complete&&art.naturalWidth)drawStoreBannerImage(art,265,138,800,748);
 // Right-side content panel, consistent across all tabs.
 rect(1058,112,512,744,'rgba(10,16,31,.76)','rgba(190,207,230,.42)',18);
 if(loadoutPage==='weapons')text('WEAPONS',1314,96,18,'#d9c797','850','center');
 else text(loadoutPage==='details'?'STATS & PROGRESSION':loadoutPage.toUpperCase(),1090,151,14,'#d9c797','850');
 if(loadoutPage==='details')drawLoadoutDetailsPanel(model,record,progress,cap);
 else if(loadoutPage==='weapons')drawLoadoutWeaponsPanel(model,record);
 else if(loadoutPage==='runes')drawLoadoutRunesPanel(record);
 else drawLoadoutCelestialsPanel(record);
 if(loadoutPage==='runes'){const rune=record.runes[selectedLoadoutRune];if(rune)drawRuneStatPicker(rune)}
}
function drawLoadoutDetailsPanel(model,record,progress,cap){
 const stats=loadoutStats(loadoutCharacterId),needed=requiredExp(progress.level),gate=ASCENSION_GATES.includes(progress.level)&&!progress.ascended.includes(progress.level);
 text('LEVEL '+progress.level+' / '+cap,1090,234,18,'#edf3fa','750');
 text(progress.level>=cap?'LEVEL CAP REACHED':gate?'ASCENSION REQUIRED':'EXP  '+progress.exp+' / '+needed,1090,260,14,'#c6d2df','600');
 line(1090,273,445,progress.level>=cap?1:progress.exp/Math.max(1,needed),'#d9b96e','rgba(218,228,240,.18)',8);
 if(gate)addButton(1090,292,445,42,'loadout:ascend-character','ASCEND CHARACTER • 1 GEM','GEMS ×'+itemInventory.gems,itemInventory.gems>0,15);
 text('COMBAT STATS',1090,gate?370:329,13,'#d9c797','800');
 const rows=Object.entries(stats||{});for(let i=0;i<rows.length;i++){
  const [name,value]=rows[i],col=i%2,row=Math.floor(i/2),x=1090+col*224,y=(gate?399:358)+row*48;
  text(name.toUpperCase(),x,y,11,'#aebed0','650');text(String(value===null?'—':value),x,y+22,17,'#f0f3f7','750');
 }
 const y=gate?548:506;text('ENCHANTED BOTTLES',1090,y,13,'#d9c797','800');
 const items=[['small','SMALL','10 XP'],['medium','MEDIUM','100 XP'],['large','LARGE','1,000 XP']];
 for(let i=0;i<items.length;i++){const [size,label,xp]=items[i],x=1090+i*150;addButton(x,y+15,139,57,'loadout:bottle:'+size,label,xp+' • ×'+itemInventory.bottles[size],itemInventory.bottles[size]>0&&progress.level<cap,12)}
 rect(1090,gate?665:623,445,1,'rgba(185,201,222,.25)');
 text('ASCENSIONS COMPLETED',1090,gate?697:655,12,'#aebed0','700');text(progress.ascended.length?progress.ascended.join('   •   '):'NONE',1090,720,14,'#e5eaf1','650');
 if(DEV_MODE){text('DUPLICATES  '+record.characterDuplicates+' / 4',1090,770,13,'#d9c797','800');addButton(1313,740,74,42,'loadout:character-duplicate:-1','−','',record.characterDuplicates>0);addButton(1400,740,74,42,'loadout:character-duplicate:1','+','',record.characterDuplicates<4)}
}
function drawLoadoutWeaponsPanel(model,record){
 const w=record.weapon,type=w.selected,level=w[type+'Level'],cap=weaponLevelCap(),exp=w[type+'Exp'],needed=requiredExp(level),potential=w[type+'Potential'],bonus=weaponPotentialMultiplier(type,potential,level)*100,owned=type==='standard'||w.premiumOwned,gate=ASCENSION_GATES.includes(level)&&!w[type+'Ascended'].includes(level);
 const weaponName=model.id==='soul'?(type==='premium'?'SOULBOUND':'ASHBLADE'):(type==='premium'?'PREMIUM SIGNATURE':'STANDARD SIGNATURE');
 text(weaponName,1090,151,17,'#e8d6af','850');
 const weaponArt=model.id==='soul'?images[type==='premium'?'soulWeaponPremium':'soulWeaponStandard']:null;if(weaponArt?.complete&&weaponArt.naturalWidth)drawStoreBannerImage(weaponArt,1090,171,445,300);
 text('POTENTIAL '+potential+' / 5     •     LEVEL '+level+' / '+cap,1090,490,14,'#e1e8f0','750');
 text(gate?'ASCENSION REQUIRED':level>=cap?'WEAPON LEVEL CAP REACHED':'XP  '+exp+' / '+needed,1090,516,13,'#b9c8d7','600');
 line(1090,529,445,exp/Math.max(1,needed),'#d9b96e','rgba(218,228,240,.18)',7);
 if(DEV_MODE&&owned){addButton(1400,542,56,36,'loadout:potential:'+type+',-1','−','',potential>1);addButton(1464,542,56,36,'loadout:potential:'+type+',1','+','',potential<5)}
 const upgradeLabel=gate?'ASCEND':level>=cap?'MAX LEVEL':'UPGRADE',bookSelectionCount=weaponBookSelection.small+weaponBookSelection.medium+weaponBookSelection.large;
 text(owned?'+'+bonus.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'% ALL STATS':'PREMIUM WEAPON NOT OWNED',1090,580,16,owned?'#f4d99c':'#aebed0','800');
 addButton(1090,600,214,48,'loadout:upgrade:weapon',upgradeLabel,'',owned&&(gate?itemInventory.gems>0:level<cap&&bookSelectionCount>0),14);
 addButton(1320,600,214,48,'loadout:weapon-switch','SWITCH','',w.premiumOwned,14);
 if(gate){
  text('GEMS',1090,675,12,'#d9c797','750');drawLoadoutMaterialCard(1090,684,139,151,'gem','GEM',itemInventory.gems);
 }else{
  text('ENCHANTED BOOKS',1090,675,12,'#d9c797','750');
  for(let i=0;i<3;i++)drawLoadoutBookCard(1090+i*150,684,139,151,type,['small','medium','large'][i],owned&&level<cap);
 }
}
function drawLoadoutMaterialCard(x,y,w,h,item,label,qty){
 rect(x,y,w,h,'rgba(24,32,49,.78)','rgba(121,143,168,.45)',10);
 const icon=images[item];if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+43,y+6,w-86,69);
 text(label,x+w/2,y+96,11,'#f3e5c9','800','center');
 text('×'+qty,x+w/2,y+130,13,'#f0f3f7','750','center');
}
function drawLoadoutBookCard(x,y,w,h,type,size,enabled){
 const upper=size[0].toUpperCase()+size.slice(1),qty=itemInventory.books[size],selected=weaponBookSelection[size],xp=ITEM_XP[size],buttonY=y+103;
 rect(x,y,w,h,'rgba(24,32,49,.78)',enabled?'rgba(121,143,168,.65)':'rgba(121,143,168,.45)',10);
 const icon=images['enchantedBook'+upper];if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+48,y+4,w-96,54);
 text(upper.toUpperCase(),x+w/2,y+67,11,'#f3e5c9','800','center');
 text(xp+' XP',x+w/2,y+84,10,'#c4d0dd','600','center');
 addButton(x+12,buttonY,34,30,'loadout:book-select:'+size+',-1','−','',enabled&&selected>0,14);
 text(selected+' / '+qty,x+w/2,buttonY+15,11,'#f0f3f7','750','center');
 addButton(x+w-46,buttonY,34,30,'loadout:book-select:'+size+',1','+','',enabled&&selected<qty,14);
}
function drawLoadoutRunesPanel(record){
 text('CORES ×'+itemInventory.cores,1090,191,12,'#b9c8d7','650');
 for(let i=0;i<4;i++){
  const y=218+i*151,rune=record.runes[i],active=i===selectedLoadoutRune;rect(1083,y,462,138,'rgba(27,39,59,.78)',active?'#d5ba7c':'rgba(148,169,194,.35)',12);
  addButton(1094,y+9,95,37,'loadout:rune-select:'+i,'SLOT '+(i+1),rune?'LEVEL '+rune.level+'/5':'EMPTY',true,12);
  if(!rune){if(DEV_MODE)addButton(1200,y+9,330,37,'loadout:rune-equip:'+i,'ADD RUNE • PREVIEW','',true,11);else text('No rune equipped',1210,y+33,13,'#aebed0','550');continue}
  const main=RUNE_STAT_INFO[rune.main];addButton(1197,y+9,220,37,'loadout:rune-main',main.label.toUpperCase(),'+'+(main.main*rune.level)+' • MAIN STAT',true,11);
  addButton(1425,y+9,105,37,'loadout:rune-level:1','UPGRADE','CORE ×'+itemInventory.cores,rune.level<5&&itemInventory.cores>0,10);
  for(let j=0;j<3;j++){const info=RUNE_STAT_INFO[rune.subs[j]];addButton(1094+j*137,y+59,128,54,'loadout:rune-sub:'+j,info.label,'+'+(info.main*.25*rune.level),true,10)}
  choiceRects.push({x:1504,y:y+59,w:32,h:54,action:'loadout:rune-remove',enabled:true});rect(1504,y+59,32,54,'#263754','#a5c9dc',8);text('×',1520,y+93,17,'#fff4e6','750','center');
 }
}
function drawLoadoutCelestialsPanel(record){
 text('CORES ×'+itemInventory.cores,1090,191,12,'#b9c8d7','650');
 for(let i=0;i<CELESTIALS.length;i++){
  const [key,label]=CELESTIALS[i],y=224+i*145,level=record.celestials[key];rect(1083,y,462,129,'rgba(27,39,59,.78)','#71869e',12);
  text(label.toUpperCase(),1104,y+34,16,'#f3dfb9','800');text('LEVEL '+level+' / 10',1104,y+63,13,'#d6e2ef','650');
  line(1104,y+79,260,level/10,'#d9b96e','rgba(218,228,240,.18)',7);text('+'+(level*10)+'% MULTIPLIER',1104,y+111,11,'#b9c8d7','650');
  addButton(1390,y+35,133,56,'loadout:celestial:'+key+',1','UPGRADE','',level<10&&itemInventory.cores>0,12);
 }
}
function drawStartupMenu(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.72)');
 text('TWO-TONE',800,208,64,'#f8f4ea','900','center');
 text('YOUR ADVENTURE, YOUR PROGRESS',800,272,19,'#eacb87','800','center');
 addButton(620,365,360,112,'startup-start','START','');
 addButton(620,507,360,112,'startup-load','LOAD','');
}
function drawMainMenuIcon(kind,cx,cy,color){
 ctx.save();ctx.translate(cx,cy);ctx.strokeStyle=color;ctx.fillStyle='rgba(0,0,0,0)';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';
 const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 if(kind==='story'){
  ctx.beginPath();ctx.moveTo(-25,-19);ctx.quadraticCurveTo(-9,-25,0,-14);ctx.quadraticCurveTo(9,-25,25,-19);ctx.lineTo(25,21);ctx.quadraticCurveTo(9,15,0,25);ctx.quadraticCurveTo(-9,15,-25,21);ctx.closePath();ctx.stroke();line(0,-14,0,25);line(-19,-11,-7,-9);line(7,-9,19,-11);
 }else if(kind==='events'){
  ctx.beginPath();ctx.roundRect(-23,-19,46,40,5);ctx.stroke();line(-23,-8,23,-8);line(-13,-25,-13,-14);line(13,-25,13,-14);ctx.beginPath();ctx.arc(-10,3,2,0,Math.PI*2);ctx.arc(2,3,2,0,Math.PI*2);ctx.arc(14,3,2,0,Math.PI*2);ctx.stroke();
 }else if(kind==='mode'){
  ctx.beginPath();ctx.roundRect(-27,-15,54,30,15);ctx.stroke();ctx.beginPath();ctx.arc(-11,0,10,0,Math.PI*2);ctx.stroke();line(9,-7,19,7);line(19,-7,9,7);
 }else if(kind==='store'){
  ctx.beginPath();ctx.moveTo(-25,-11);ctx.lineTo(-20,-23);ctx.lineTo(20,-23);ctx.lineTo(25,-11);ctx.lineTo(25,-7);ctx.quadraticCurveTo(17,0,10,-7);ctx.quadraticCurveTo(2,0,-5,-7);ctx.quadraticCurveTo(-13,0,-20,-7);ctx.quadraticCurveTo(-25,-8,-25,-11);ctx.stroke();ctx.beginPath();ctx.roundRect(-20,-5,40,28,3);ctx.stroke();ctx.beginPath();ctx.roundRect(-5,6,11,17,2);ctx.stroke();line(-14,3,-14,18);
 }else if(kind==='loadout'){
  line(-19,18,14,-19);ctx.beginPath();ctx.moveTo(14,-19);ctx.lineTo(25,-24);ctx.lineTo(20,-12);ctx.lineTo(-13,22);ctx.stroke();line(-23,13,-10,25);line(-17,7,-7,17);line(-7,22,-2,27);
 }else if(kind==='party'){
  for(const [x,y,r] of [[0,-12,9],[-19,-5,7],[19,-5,7]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke()}
  ctx.beginPath();ctx.arc(0,23,18,Math.PI,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(-21,22,12,Math.PI,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(21,22,12,Math.PI,Math.PI*2);ctx.stroke();
 }else if(kind==='items'){
  ctx.beginPath();ctx.moveTo(-18,-14);ctx.lineTo(18,-14);ctx.lineTo(23,22);ctx.quadraticCurveTo(0,29,-23,22);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(0,-14,10,Math.PI,0);ctx.stroke();line(-9,1,9,1);line(-9,9,9,9);
 }else if(kind==='challenges'){
  ctx.beginPath();ctx.moveTo(-23,-20);ctx.lineTo(-14,-20);ctx.lineTo(-10,-2);ctx.quadraticCurveTo(0,9,10,-2);ctx.lineTo(14,-20);ctx.lineTo(23,-20);ctx.lineTo(17,2);ctx.quadraticCurveTo(0,22,-17,2);ctx.closePath();ctx.stroke();line(0,13,0,23);line(-12,24,12,24);ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(3,-10);ctx.lineTo(11,-9);ctx.lineTo(5,-4);ctx.lineTo(7,4);ctx.lineTo(0,0);ctx.lineTo(-7,4);ctx.lineTo(-5,-4);ctx.lineTo(-11,-9);ctx.lineTo(-3,-10);ctx.closePath();ctx.stroke();
 }else if(kind==='save'){
  ctx.beginPath();ctx.moveTo(-18,-25);ctx.lineTo(10,-25);ctx.lineTo(20,-15);ctx.lineTo(20,23);ctx.lineTo(-18,23);ctx.closePath();ctx.stroke();line(10,-24,10,-14);line(-8,-12,9,-12);line(-8,-4,9,-4);line(0,2,0,16);line(-7,10,0,17);line(7,10,0,17);
 }else if(kind==='settings'){
  ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?18:25,x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
function drawMainMenuTile(item,x,y,w,h){
 const active=item.active!==false;
 choiceRects.push({x,y,w,h,action:item.action,enabled:active});
 const fill=ctx.createLinearGradient(x,y,x+w,y+h);fill.addColorStop(0,active?'rgba(30,39,55,.84)':'rgba(22,28,40,.74)');fill.addColorStop(1,active?'rgba(10,17,28,.92)':'rgba(11,15,23,.86)');
 rect(x,y,w,h,fill,active?'rgba(216,219,224,.35)':'rgba(152,160,173,.22)',15);
 if(active){ctx.save();ctx.strokeStyle='rgba(247,225,183,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+18,y+1);ctx.lineTo(x+w-18,y+1);ctx.stroke();ctx.restore()}
 drawMainMenuIcon(item.icon,x+w/2,y+72,active?'#e6dcc5':'#8993a2');
 text(item.label,x+w/2,y+154,20,active?'#f2eee7':'#bac0ca','800','center');
 if(item.detail)text(item.detail,x+w/2,y+180,12,active?'#aeb8c7':'#8993a2','650','center');
 if(!active){rect(x+w/2-56,y+h-30,112,18,'rgba(8,12,19,.78)','rgba(139,149,163,.3)',9);text('COMING SOON',x+w/2,y+h-21,9,'#9099a7','750','center')}
}
function drawMainMenu(){
 drawBackground();rect(0,0,W,H,'rgba(4,7,13,.72)');
 rect(78,52,1444,796,'rgba(7,11,19,.62)','rgba(224,225,225,.22)',22);
 const items=[
  {label:'STORY',icon:'story',action:'open-story'},
  {label:'EVENTS',icon:'events',active:false},
  {label:'GAME MODE',icon:'mode',action:'toggle-game-mode',detail:DEV_MODE?'DEV MODE':'REGULAR'},
  {label:'STORE',icon:'store',action:'open-store'},
  {label:'LOADOUT',icon:'loadout',action:'open-loadout'},
  {label:'PARTY',icon:'party',action:'open-party'},
  {label:'ITEMS',icon:'items',action:'open-inventory'},
  {label:'CHALLENGES',icon:'challenges',action:'open-challenges'},
  {label:'SAVE',icon:'save',action:'save-progress'},
  {label:'SETTINGS',icon:'settings',action:'open-settings'}
 ];
 const x0=124,y0=91,cardW=318,cardH=226,gapX=20,gapY=16,positions=[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[1,2],[2,2]];
 items.forEach((item,index)=>{const [column,row]=positions[index];drawMainMenuTile(item,x0+column*(cardW+gapX),y0+row*(cardH+gapY),cardW,cardH)});
}
function drawSettings(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.76)');rect(250,130,1100,640,'rgba(13,20,39,.98)','#ccb88e',20);
 text('SETTINGS',800,244,30,'#ffedd1','850','center');addButton(1130,168,170,54,'main-menu','MAIN MENU','');
 rect(330,300,940,300,'rgba(25,37,58,.94)','#718ba4',16);
 text('DISPLAY',800,280,18,'#f3dfb9','850','center');
 const standalone=isStandaloneApp();
 text('FULLSCREEN',375,382,18,'#edf3fa','700');
 if(standalone)text('Unavailable in the installed app',375,411,14,'#aebed0','550');
 addButton(905,365,320,64,'toggle-fullscreen',isFullscreen()?'EXIT FULLSCREEN':'ENTER FULLSCREEN','',!standalone);
}
let lastStoreNotice='',storeReveal=null,activeStoreBanner=null;
const STORE_ITEM_SPRITES=Object.freeze({core:'core',gem:'gem','bottle:small':'enchantedBottleSmall','bottle:medium':'enchantedBottleMedium','bottle:large':'enchantedBottleLarge','book:small':'enchantedBookSmall','book:medium':'enchantedBookMedium','book:large':'enchantedBookLarge'});
const STORE_REWARD_SPRITES=Object.freeze({'premium-soul':'soulWeaponPremium'});
const STORE_REVEAL_TIMING=Object.freeze({cardEnterMs:1000,cardFlipMs:500});
function getStoreRotation(){
 const ids=ROSTER.filter(model=>!model.test).map(model=>model.id);
 return FeaturedLottery.rotate(ids,new Date());
}
function storeRewardPools(type,rotation){
 const models=ROSTER.filter(model=>!model.test),featuredIds=type==='character'?rotation.featuredCharacters:rotation.featuredWeapons;
 const idFor=model=>type==='character'?model.id:'premium-'+model.id;
 const make=model=>({id:idFor(model),name:type==='character'?model.name:model.id==='soul'?'Soulbound':model.name+' Premium Weapon'});
 return {featured:models.filter(model=>featuredIds.includes(idFor(model))).map(make),offFeature:models.filter(model=>!featuredIds.includes(idFor(model))).map(make)};
}
function awardStoreReward(type,reward){
 if(type==='character'){
  const record=loadoutFor(reward.id);record.characterDuplicates=Math.min(4,record.characterDuplicates+1);saveLoadouts();return reward.name+' character reward.';
 }
 const id=reward.id.replace(/^premium-/,'');if(!ROSTER_IDS.has(id))return reward.name+' weapon reward.';
 const weapon=loadoutFor(id).weapon;if(weapon.premiumOwned)weapon.premiumPotential=Math.min(5,weapon.premiumPotential+1);else weapon.premiumOwned=true;
 saveLoadouts();return reward.name+(weapon.premiumPotential>1?' • Premium Potential '+weapon.premiumPotential:' • Premium acquired');
}
function drawStoreLottery(type,count=1){
 if(!['character','weapon'].includes(type)||![1,10].includes(count)){lastStoreNotice='That lottery draw is unavailable.';return false}
 const cost=FeaturedLottery.RULES.ticketCost*count;
 if(storeCoins<cost){lastStoreNotice=`You need ${cost.toLocaleString()} coins for ${count} draw${count===1?'':'s'}.`;return false}
 const rotation=getStoreRotation(),pools=storeRewardPools(type,rotation),track=FeaturedLottery.getState()[type];
 if(!track.target){lastStoreNotice='This banner has no available target.';return false}
 const rewards=[];
 for(let i=0;i<count;i++){
  const outcome=FeaturedLottery.draw({type,wallet:storeCoins-i*FeaturedLottery.RULES.ticketCost,pools});
  if(!outcome.ok){if(!rewards.length){lastStoreNotice=outcome.reason==='target-required'?'This banner has no available target.':'Lottery draw could not be completed.';return false}break}
  const result=outcome.reward.inventoryItem?`${outcome.reward.quantity||1} ${outcome.reward.name}`:awardStoreReward(type,outcome.reward);
  rewards.push({tier:outcome.tier,reward:outcome.reward,featured:outcome.featured,result});
 }
 storeCoins-=rewards.length*FeaturedLottery.RULES.ticketCost;saveStoreCoins();
 lastStoreNotice='Your ticket is being revealed…';
 const startedAt=performance.now();storeReveal={type,rewards,index:0,phase:'enter',phaseStartedAt:startedAt,startedAt};
 return true;
}
function finishStoreReveal(){
 if(!storeReveal)return;
 const rewards=storeReveal.rewards;
 if(rewards.length===1){const item=rewards[0];lastStoreNotice=`${item.tier.toUpperCase()} • ${item.result}${item.featured?' • Featured target!':''}`}
 else{const counts=rewards.reduce((all,item)=>(all[item.tier]=(all[item.tier]||0)+1,all),{});lastStoreNotice=`${rewards.length} draws: ${['mythic','rare','common'].filter(tier=>counts[tier]).map(tier=>`${counts[tier]} ${tier}`).join(', ')}.`}
 storeReveal=null;
}
function handleStoreAction(action){
 if(storeReveal){
  if(action==='store:reveal:flip'&&storeReveal.phase==='ready'){storeReveal.phase='flip';storeReveal.phaseStartedAt=performance.now()}
  else if(action==='store:reveal:next'&&storeReveal.phase==='shown'&&storeReveal.rewards.length>1){if(storeReveal.index+1<storeReveal.rewards.length){storeReveal.index++;storeReveal.phase='enter'}else storeReveal.phase='summary';storeReveal.phaseStartedAt=performance.now()}
  else if(action==='store:reveal:close'&&(storeReveal.phase==='summary'||(storeReveal.phase==='shown'&&storeReveal.rewards.length===1)))finishStoreReveal();
  return;
 }
 const [,kind,type,value]=action.split(':');
 if(kind==='grant'&&DEV_MODE){const amount=Number(type);if(grantStoreCoins(amount))lastStoreNotice=`Dev mode: added ${amount.toLocaleString()} coins.`;else lastStoreNotice='Could not add coins.';
 }else if(kind==='target'){
  const rotation=getStoreRotation(),ids=type==='character'?rotation.featuredCharacters:rotation.featuredWeapons;
  if(FeaturedLottery.setTarget(type,value,ids)){activeStoreBanner={type,id:value};lastStoreNotice=''}
 }else if(kind==='draw')drawStoreLottery(type,Number(value)||1);
}
const STORE_BANNER_PORTRAITS=Object.freeze({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront'});
function storeBannerImage(type,model){
 if(type==='weapon'&&model?.id==='soul')return images.soulWeaponPremium;
 return images[STORE_BANNER_PORTRAITS[model?.id]];
}
function drawStoreBannerImage(img,x,y,w,h){
 if(!img?.complete||!img.naturalWidth)return;
 const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(img,x+(w-dw)/2,y+h-dh,dw,dh);ctx.restore();
}
function drawCharacterPortrait(img,id,x,y,size){
 if(!img?.complete||!img.naturalWidth)return;
 const crops={soul:[50,0,400],zero:[223,0,440],lily:[32,0,192],dawn:[23,0,210],logan:[220,0,447]},[sx,sy,side]=crops[id]||[0,0,Math.min(img.naturalWidth,img.naturalHeight)];
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(img,sx,sy,Math.min(side,img.naturalWidth-sx),Math.min(side,img.naturalHeight-sy),x,y,size,size);ctx.restore();
}
function storeBannerButton(x,y,w,h,action,label,sub,enabled,primary=false){
 choiceRects.push({x,y,w,h,action,enabled});
 const gradient=ctx.createLinearGradient(x,y,x,y+h);
 if(!enabled){gradient.addColorStop(0,'#303849');gradient.addColorStop(1,'#202a3a')}
 else if(primary){gradient.addColorStop(0,'#f3dfb2');gradient.addColorStop(1,'#bc8f50')}
 else{gradient.addColorStop(0,'#354a64');gradient.addColorStop(1,'#22334a')}
 rect(x,y,w,h,gradient,enabled?(primary?'#ffe5ad':'#b8c6d5'):'#556174',12);
 text(label,x+w/2,y+25,18,enabled&&primary?'#352817':enabled?'#fff3dc':'#9ba9b9','850','center');
 text(sub,x+w/2,y+49,12,enabled&&primary?'#5b4729':'#c3d0dc','650','center');
}
function storeBannerEntries(rotation){
 const entries=[];
 for(const id of rotation.featuredCharacters){const model=ROSTER.find(item=>item.id===id);if(model)entries.push({type:'character',id,name:model.name,model})}
 for(const id of rotation.featuredWeapons){const model=ROSTER.find(item=>item.id===id.replace(/^premium-/,''));if(model)entries.push({type:'weapon',id,name:model.id==='soul'?'Soulbound':model.name+' Premium',model})}
 return entries;
}
function drawStoreBannerSidebar(entries,state){
 const x=28,y=116,w=338,h=714;
 rect(x,y,w,h,'rgba(12,20,36,.97)','#7588a0',18);
 text('BANNERS',x+22,y+32,18,'#f4dfb7','850');
 text(`${entries.length} AVAILABLE`,x+w-20,y+32,11,'#9fb1c4','700','right');
 entries.forEach((entry,index)=>{
  const bx=x+14,by=y+54+index*105,bw=w-28,bh=95;
  const active=activeStoreBanner?.type===entry.type&&activeStoreBanner?.id===entry.id;
  const savedTarget=state[entry.type].target===entry.id;
  const fill=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
  fill.addColorStop(0,active?'rgba(105,83,48,.86)':savedTarget?'rgba(44,58,77,.96)':'rgba(23,34,52,.92)');
  fill.addColorStop(1,active?'rgba(50,45,42,.98)':'rgba(15,25,41,.98)');
  rect(bx,by,bw,bh,fill,active?'#f0ce8b':savedTarget?'#8299b1':'rgba(126,148,171,.36)',12);
  const art=storeBannerImage(entry.type,entry.model);if(art){ctx.save();ctx.beginPath();ctx.roundRect(bx+9,by+8,62,79,8);ctx.clip();drawStoreBannerImage(art,bx+9,by+8,62,79);ctx.restore()}
  text(entry.type==='character'?'CHARACTER':'PREMIUM WEAPON',bx+84,by+31,10,active?'#f4d99c':'#9fb1c4','800');
  text(entry.name,bx+84,by+59,16,'#f4f0e8','800');
  if(savedTarget)text('✓',bx+bw-18,by+30,15,'#f2d391','900','center');
  choiceRects.push({x:bx,y:by,w:bw,h:bh,action:`store:target:${entry.type}:${entry.id}`,enabled:!storeReveal});
 });
}
function drawStoreBannerDetail(entry,state){
 const x=386,y=116,w=1186,h=714;
 rect(x,y,w,h,'rgba(12,20,36,.98)','#7588a0',18);
 if(!entry){
  const wash=ctx.createLinearGradient(x,y,x+w,y+h);wash.addColorStop(0,'rgba(27,56,83,.94)');wash.addColorStop(.55,'rgba(30,34,58,.96)');wash.addColorStop(1,'rgba(52,36,57,.96)');
  rect(x+8,y+8,w-16,h-16,wash,null,14);
  const glow=ctx.createRadialGradient(x+795,y+310,12,x+795,y+310,360);glow.addColorStop(0,'rgba(238,203,137,.22)');glow.addColorStop(1,'rgba(238,203,137,0)');rect(x+10,y+10,w-20,h-20,glow);
  text('SELECT A BANNER',x+52,y+315,29,'#fff0cf','850');
  text('Choose one of the featured options on the left.',x+54,y+353,16,'#c6d2df','550');
  return;
 }
 const character=entry.type==='character',track=state[entry.type],pity=entry.type==='character'?(track.heightened?50:100):(track.heightened?25:50);
 const untilMythic=Math.max(0,pity-track.sinceMythic),untilRare=Math.max(0,10-track.sinceRare),hero=storeBannerImage(entry.type,entry.model);
 const colors=character?['#102f51','#22677d','#bd9070']:['#30233f','#5b3e64','#b98b53'];
 const banner=ctx.createLinearGradient(x+10,y+12,x+w,y+470);banner.addColorStop(0,colors[0]);banner.addColorStop(.58,colors[1]);banner.addColorStop(1,colors[2]);
 ctx.save();ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,466,14);ctx.clip();rect(x+8,y+8,w-16,466,banner);
 const halo=ctx.createRadialGradient(x+890,y+245,4,x+890,y+245,420);halo.addColorStop(0,character?'rgba(164,237,255,.33)':'rgba(255,224,160,.34)');halo.addColorStop(1,'rgba(255,255,255,0)');rect(x+390,y+8,w-398,466,halo);
 ctx.strokeStyle=character?'rgba(210,245,255,.13)':'rgba(255,232,190,.14)';ctx.lineWidth=1;
 for(let i=0;i<9;i++){ctx.beginPath();ctx.arc(x+900,y+244,74+i*38,0,Math.PI*2);ctx.stroke()}
 for(let i=0;i<34;i++){const sx=x+405+(i*103%750),sy=y+18+(i*67%440),size=i%6===0?2.7:1.25;ctx.fillStyle=`rgba(255,255,255,${i%4===0?.58:.25})`;ctx.beginPath();ctx.arc(sx,sy,size,0,Math.PI*2);ctx.fill()}
 if(hero)drawStoreBannerImage(hero,x+770,y+16,390,444);
 ctx.restore();
 rect(x+36,y+38,character?142:188,30,character?'rgba(7,32,53,.72)':'rgba(34,22,42,.72)',character?'rgba(192,239,255,.45)':'rgba(255,231,188,.45)',14);
 text(character?'CHARACTER':'PREMIUM WEAPON',x+(character?107:130),y+53,12,'#fff1d8','850','center');
 text(entry.name,x+40,y+176,entry.name.length>20?31:42,'#fff4de','900');
 text(character?'FEATURED CHARACTER':'SIGNATURE WEAPON',x+42,y+211,13,character?'#c2f3ff':'#ffe4b2','800');
 const pityY=y+500;
 rect(x+36,pityY,244,78,'rgba(17,30,48,.93)','rgba(169,191,212,.48)',11);
 text('MYTHIC GUARANTEE',x+52,pityY+24,11,'#c5d5e5','750');
 text(`${untilMythic}`,x+260,pityY+38,25,track.heightened?'#f0d291':'#edf3fa','900','right');
 text(`${track.heightened?'HEIGHTENED':'STANDARD'} • ${pity} DRAW PITY`,x+52,pityY+59,10,'#aebfd0','650');
 rect(x+294,pityY,224,78,'rgba(17,30,48,.93)','rgba(169,191,212,.48)',11);
 text('RARE GUARANTEE',x+310,pityY+24,11,'#c5d5e5','750');
 text(`${untilRare}`,x+498,pityY+38,25,'#edf3fa','900','right');
 text('10 DRAW PITY',x+310,pityY+59,10,'#aebfd0','650');
 text(`MYTHIC ${track.heightened?'2%':'1%'} • RARE 10% • FEATURED MYTHIC 75%`,x+38,y+608,12,'#d4e0ed','650');
 if(track.heightened)text('HEIGHTENED • OFF-FEATURE MYTHIC RECEIVED',x+38,y+629,11,'#f0d291','750');
 const canDraw=state[entry.type].target===entry.id&&!storeReveal;
 storeBannerButton(x+38,y+645,242,58,`store:draw:${entry.type}:1`,'DRAW ×1','100 COINS',canDraw&&storeCoins>=100,true);
 storeBannerButton(x+296,y+645,242,58,`store:draw:${entry.type}:10`,'DRAW ×10','1,000 COINS',canDraw&&storeCoins>=1000,false);
}
function drawStoreReveal(now){
 if(!storeReveal)return;
 const reveal=storeReveal,rewards=reveal.rewards,elapsed=(now-reveal.startedAt)/1000,batch=rewards.length>1;
 let phaseElapsed=now-reveal.phaseStartedAt;
 if(reveal.phase==='enter'&&phaseElapsed>=STORE_REVEAL_TIMING.cardEnterMs){reveal.phase='ready';reveal.phaseStartedAt=now;phaseElapsed=0}
 else if(reveal.phase==='flip'&&phaseElapsed>=STORE_REVEAL_TIMING.cardFlipMs){reveal.phase='shown';reveal.phaseStartedAt=now;phaseElapsed=0}
 const summary=reveal.phase==='summary',current=rewards[reveal.index],color=current.tier==='mythic'?'#ffd778':current.tier==='rare'?'#d8a4ff':'#83dcff';
 const fade=Math.min(1,(now-reveal.startedAt)/.28),pulse=.5+.5*Math.sin(now*.007),spin=(now-reveal.startedAt)/1000*1.8;
 rect(0,0,W,H,`rgba(3,6,18,${.84*fade})`);
 const glow=ctx.createRadialGradient(800,455,28,800,455,470);glow.addColorStop(0,`rgba(104,163,222,${.20+pulse*.13})`);glow.addColorStop(1,'rgba(12,20,42,0)');rect(170,80,1260,760,glow);
 ctx.save();ctx.translate(800,450);ctx.rotate(spin*.22);ctx.strokeStyle=`rgba(191,225,255,${.16+pulse*.12})`;ctx.lineWidth=2;
 for(let i=0;i<30;i++){const a=i*Math.PI*2/30;ctx.beginPath();ctx.moveTo(Math.cos(a)*210,Math.sin(a)*210);ctx.lineTo(Math.cos(a)*410,Math.sin(a)*410);ctx.stroke()}
 ctx.restore();
 for(let i=0;i<24;i++){const a=i*Math.PI*2/24+spin*.7,r=145+((elapsed*95+i*37)%250),x=800+Math.cos(a)*r,y=450+Math.sin(a)*r,alpha=Math.max(0,1-Math.abs(r-260)/150)*fade;
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=i%3===0?color:'#dff6ff';ctx.translate(x,y);ctx.rotate(a+spin);ctx.fillRect(-3,-9,6,18);ctx.restore();
 }
 rect(448,192,704,525,'rgba(12,20,38,.96)',color,22);
 text(summary?'TEN DRAW RESULTS':batch?`DRAW ${reveal.index+1} OF ${rewards.length}`:'FEATURED LOTTERY',800,summary?238:216,15,'#b9cbe0','800','center');
 if(summary){
  text(`${rewards.length} REWARDS • ${rewards.length*FeaturedLottery.RULES.ticketCost} COINS`,800,262,12,'#e6d2aa','750','center');
  rewards.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=468+col*334,y=278+row*76,tierColor=item.tier==='mythic'?'#ffd778':item.tier==='rare'?'#d8a4ff':'#83dcff';rect(x,y,326,66,'rgba(35,48,69,.96)',tierColor,9);text(item.tier.toUpperCase(),x+12,y+24,12,tierColor,'850');text(item.reward.name||item.reward.id,x+105,y+23,15,'#fff3de','750');text(item.result+(item.featured?' • FEATURED':''),x+105,y+45,11,'#c2d0dd','550')});
  addButton(648,668,304,38,'store:reveal:close','DONE','RETURN TO BANNER');
  return;
 }
 const entryProgress=reveal.phase==='enter'?Math.max(0,Math.min(1,phaseElapsed/STORE_REVEAL_TIMING.cardEnterMs)):1,entryEase=1-Math.pow(1-entryProgress,3),cardY=H+210+(445-(H+210))*entryEase;
 const flipProgress=reveal.phase==='flip'?Math.max(0,Math.min(1,phaseElapsed/STORE_REVEAL_TIMING.cardFlipMs)):0,flip=reveal.phase==='flip'?Math.max(.08,Math.abs(Math.cos(flipProgress*Math.PI))):1,faceShown=reveal.phase==='shown';
 ctx.save();ctx.translate(800,cardY);ctx.rotate((1-entryEase)*-.12);ctx.scale(flip,1);ctx.globalAlpha*=Math.min(1,entryProgress*2.2);
 const ticket=ctx.createLinearGradient(-148,-200,148,200);
 if(faceShown){ticket.addColorStop(0,'#fff8e7');ticket.addColorStop(.52,'#f2e5cc');ticket.addColorStop(1,'#d7c4a3')}
 else{ticket.addColorStop(0,'#294a70');ticket.addColorStop(.52,'#172b4c');ticket.addColorStop(1,'#0e1c36')}
 rect(-148,-200,296,400,ticket,faceShown?color:'#e5c782',24);
 rect(-135,-187,270,374,'rgba(0,0,0,0)',faceShown?'rgba(126,91,44,.72)':'rgba(232,201,135,.88)',18);
 rect(-126,-178,252,356,'rgba(0,0,0,0)',faceShown?'rgba(153,122,75,.48)':'rgba(114,165,208,.48)',14);
 const diamond=(x,y,r,fill)=>{ctx.save();ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();ctx.restore()};
 for(const x of [-111,111])for(const y of [-162,162])diamond(x,y,6,faceShown?color:'#f0d58e');
 if(faceShown){
  text('✦  '+current.tier.toUpperCase()+'  ✦',0,-147,22,current.tier==='common'?'#45627c':current.tier==='rare'?'#79509a':'#9a6913','950','center');
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-24,73,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-24,64,0,Math.PI*2);ctx.stroke();ctx.restore();
  const rewardSprite=images[STORE_ITEM_SPRITES[current.reward.inventoryItem]||STORE_REWARD_SPRITES[current.reward.id]];if(rewardSprite?.complete&&rewardSprite.naturalWidth)ctx.drawImage(rewardSprite,-58,-82,116,116);else text(current.tier==='mythic'?'✦':'✧',0,-24,70,current.tier==='common'?'#45627c':current.tier==='rare'?'#79509a':'#9a6913','900','center');
  const rewardName=current.reward.name||current.reward.id;text(rewardName,0,78,17,'#1b3047','850','center');
  text(current.result,0,108,11,'#344b61','650','center');
  ctx.save();ctx.strokeStyle='rgba(129,96,49,.62)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-74,137);ctx.lineTo(74,137);ctx.stroke();ctx.restore();
  text('TWO-TONE • SUMMON',0,158,11,'#6d5734','800','center');
 }else{
  ctx.save();ctx.strokeStyle='rgba(232,201,135,.86)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-15,69,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(127,171,210,.68)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-15,57,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-82,-15);ctx.lineTo(82,-15);ctx.moveTo(0,-97);ctx.lineTo(0,67);ctx.stroke();ctx.restore();
  text('✦',0,-15,58,'#f0d58e','900','center');
  text('TWO-TONE',0,93,19,'#fff1d1','900','center');
  text('FEATURED SUMMON',0,119,12,'#bed4e7','750','center');
  text('TAP OR CLICK TO TURN',0,150,11,'#e5ca91','700','center');
 }
 ctx.restore();
 const prompt=reveal.phase==='ready'?'TAP OR CLICK TO FLIP':reveal.phase==='flip'?'FLIPPING…':faceShown?(batch?'TAP OR CLICK FOR NEXT CARD':'TAP OR CLICK TO RETURN'):'DRAWING YOUR REWARD';
 text(prompt,800,665,16,'#fff0c9','850','center');
 if(reveal.phase==='ready'||faceShown)choiceRects.push({x:652,y:245,w:296,h:400,action:reveal.phase==='ready'?'store:reveal:flip':batch?'store:reveal:next':'store:reveal:close',enabled:true});
 if(faceShown&&batch)text('TAP OR CLICK THE CARD WHEN READY',800,692,13,'#c4d6e5','600','center');
}
function drawStore(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.84)');
 text('FEATURED SUMMONS',800,72,35,'#ffedd1','900','center');
 if(DEV_MODE){rect(24,49,118,49,'rgba(83,52,35,.96)','#e2a86f',10);text('DEV MODE',83,80,14,'#ffdfa8','850','center');[100,500,1000,5000].forEach((amount,index)=>addButton(152+index*101,49,93,49,`store:grant:${amount}`,'+'+amount.toLocaleString(),'COINS',!storeReveal))}
 rect(1190,49,116,49,'rgba(25,37,58,.96)','#cfae6e',12);if(images.coin?.complete&&images.coin.naturalWidth)ctx.drawImage(images.coin,1194,51,44,44);text(storeCoins.toLocaleString(),1240,80,16,'#f4d99c','850','left');addButton(1320,48,170,52,'main-menu','BACK','');
 const rotation=getStoreRotation(),state=FeaturedLottery.getState(),entries=storeBannerEntries(rotation);
 const current=activeStoreBanner&&entries.find(entry=>entry.type===activeStoreBanner.type&&entry.id===activeStoreBanner.id&&state[entry.type].target===entry.id);
 const saved=entries.find(entry=>state[entry.type].target===entry.id);
 activeStoreBanner=current?{type:current.type,id:current.id}:saved?{type:saved.type,id:saved.id}:null;
 const active=activeStoreBanner&&entries.find(entry=>entry.type===activeStoreBanner.type&&entry.id===activeStoreBanner.id);
 drawStoreBannerSidebar(entries,state);drawStoreBannerDetail(active,state);
 text('Banners rotate weekly at 12:00 AM Eastern.',800,856,14,'#c4d6e5','550','center');
 if(storeReveal)drawStoreReveal(performance.now());
 else if(lastStoreNotice){rect(390,837,820,36,'rgba(12,19,34,.94)','#687c93',10);text(lastStoreNotice,800,859,14,'#fff4e8','650','center')}
}
function drawItemInventory(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.74)');rect(105,55,1390,790,'rgba(13,20,39,.98)','#ccb88e',20);
 text('ITEM INVENTORY',800,103,32,'#ffedd1','850','center');addButton(1280,78,165,52,'main-menu','MAIN MENU','');
 const sections=[
  {x:155,y:157,title:'ENCHANTED BOTTLES',group:'bottles',items:[['SMALL',itemInventory.bottles.small,'10 XP'],['MEDIUM',itemInventory.bottles.medium,'100 XP'],['LARGE',itemInventory.bottles.large,'1,000 XP']]},
  {x:825,y:157,title:'ENCHANTED BOOKS',group:'books',items:[['SMALL',itemInventory.books.small,'10 XP'],['MEDIUM',itemInventory.books.medium,'100 XP'],['LARGE',itemInventory.books.large,'1,000 XP']]},
  {x:155,y:475,title:'CORES',group:'core',items:[['CORE',itemInventory.cores,'']]},
  {x:825,y:475,title:'GEMS',group:'gem',items:[['GEM',itemInventory.gems,'']]},
 ];
 for(const section of sections){
  text(section.title,section.x+310,section.y+19,17,'#f3dfb9','850','center');
  rect(section.x,section.y+34,620,230,'rgba(25,37,58,.94)','#718ba4',14);
  const cardW=section.items.length===1?170:180,gap=section.items.length===1?0:20,startX=section.x+20;
  section.items.forEach((item,index)=>{
   const x=startX+index*(cardW+gap),y=section.y+55,iconKey=section.group==='bottles'?'enchantedBottle'+['Small','Medium','Large'][index]:section.group==='books'?'enchantedBook'+['Small','Medium','Large'][index]:section.group,icon=images[iconKey];
   rect(x,y,cardW,184,'rgba(18,27,44,.76)','rgba(121,143,168,.45)',10);
   if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+48,y+8,cardW-96,82);
   text(item[0],x+cardW/2,y+113,14,'#f3e5c9','800','center');
   if(item[2])text(item[2],x+cardW/2,y+136,13,'#c4d0dd','600','center');
   text('×'+item[1],x+cardW/2,y+163,14,'#f0f3f7','750','center');
  });
 }
}
function drawChallenges(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.74)');rect(180,100,1240,700,'rgba(13,20,39,.98)','#ccb88e',20);
 text('CHALLENGES',800,196,32,'#ffedd1','850','center');addButton(1200,125,165,52,'main-menu','MAIN MENU','');
 rect(345,245,910,385,'rgba(25,37,58,.94)','#718ba4',16);
 text('NO CHALLENGES AVAILABLE',800,438,22,'#d6e2ef','700','center');
}
function drawPartySetup(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.72)');
 rect(145,58,1310,780,'rgba(13,20,39,.98)','#ccb88e',20);
 text('PARTY',800,105,34,'#ffedd1','850','center');
 addButton(1226,82,190,54,'main-menu','MAIN MENU','');
 text(`CURRENT PARTY  •  ${draft.length}/${MAX_PARTY_SIZE}`,208,177,21,'#bad4e9','800');
 for(let i=0;i<MAX_PARTY_SIZE;i++){
  const x=212+i*295,y=238,w=275,h=215,id=draft[i],p=id?roster(id):null;
  rect(x,y,w,h,p?'rgba(38,54,79,.94)':'rgba(21,33,56,.88)',p?'#9eb8d3':'#4c607a',13);
  if(p){
   const portrait=images[({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront'})[p.id]];
   if(portrait?.complete&&portrait.naturalWidth)drawCharacterPortrait(portrait,p.id,x+w/2-42,y+8,84);
   text(p.name,x+w/2,y+112,21,'#f6eefa','800','center');
   if(p.test)text('TEST PLACEHOLDER',x+w/2,y+136,12,'#e5ca99','650','center');
   else text(`LEVEL ${progressFor(p.id).level}`,x+w/2,y+136,13,'#c4d6e5','600','center');
   addButton(x+28,y+158,w-56,42,`remove:${i}`,'REMOVE','',draft.length>1);
  }else{
   text('EMPTY',x+w/2,y+91,20,'#8494a9','750','center');
  }
 }
 text('AVAILABLE CHARACTERS',208,493,20,'#bad4e9','800');
 for(let i=0;i<ROSTER.length;i++){
   const p=ROSTER[i],x=172+i*247,y=520,w=230,h=132,selected=draft.includes(p.id);
  rect(x,y,w,h,selected?'rgba(35,59,76,.92)':'rgba(29,41,67,.94)',selected?'#8fbcad':'#7e97b0',11);
  const portrait=images[({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront'})[p.id]];
  if(portrait?.complete&&portrait.naturalWidth)drawCharacterPortrait(portrait,p.id,x+12,y+24,66);
  text(p.name,x+90,y+40,19,'#f5e9dc','800');
  if(p.test)text('TEST PLACEHOLDER',x+90,y+63,11,'#e5ca99','600');
  addButton(x+w-140,y+83,122,34,`add:${p.id}`,selected?'IN PARTY':'ADD','',!selected&&draft.length<MAX_PARTY_SIZE);
 }
 addButton(212,711,250,62,'main-menu','CANCEL','');
 addButton(1126,711,250,62,'save-party','SAVE PARTY','',validTeam(draft));
}
function silhouette(x,y,w,h,name,testOnly=false){ctx.save();ctx.translate(x,y);const c='#7789a3';ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(w*.5,h*.16,w*.17,h*.14,0,0,Math.PI*2);ctx.fill();rect(w*.32,h*.30,w*.36,h*.38,c,null,13);rect(w*.15,h*.35,w*.15,h*.37,c,null,10);rect(w*.70,h*.35,w*.15,h*.37,c,null,10);rect(w*.34,h*.65,w*.13,h*.35,c,null,7);rect(w*.53,h*.65,w*.13,h*.35,c,null,7);ctx.restore();text(testOnly?'TEST ONLY':name.toUpperCase(),x+w/2,y+h*.55,14,'#131e33','800','center')}
function combatEnemies(){return liveEnemies()}
// BATTLE SCENE DEVELOPMENT STANDARD v1.0 — provisional rendering implementation.
// Layered 2D views, nonuniform parallax, stateful cinematic camera; HUD remains screen-space.
// New reverse-view arena geometry and test-slot silhouettes are development placeholders.
let cameraPreview=null,selectedAllyId=null,devPanelOpen=false;
// Review-only HUD arrangement. Developer controls are hidden until explicitly opened.
const camera={shot:'command',from:'command',start:performance.now(),duration:CAMERA_TRANSITION_SAME_VIEW_MS,lastX:0,mode:'command',parallax:{},focus:null};
function smooth01(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function clamp01(x){return Math.min(1,Math.max(0,x))}
// Zero's user-approved basic-attack assembly: 256×512 neutral + wind-up + slash.
// The motion is presentation-only; all damage, targeting and turn logic stays in combat actions.
// 1250 ms: approach 0–250, hold 250–750, strike 750–1000, return 1000–1250.
const SOUL_BASIC_MS=ANIMATION_STEP_MS*5;
function soulBasicStage(t){
 if(phase!=='resolve'||fx?.kind!=='basic'||fx.actor!=='soul')return null;
 const dt=Math.max(0,t-fx.at);return dt<=SOUL_BASIC_MS?dt:null;
}
function easeOutCubic(x){x=clamp01(x);return 1-(1-x)*(1-x)*(1-x)}
function lerp(a,b,x){return a+(b-a)*x}
function soulBasicTravel(t,pos){
 const dt=soulBasicStage(t),target=fx?.targetGeometry;
 if(dt===null||!target)return pos;
 // Parallax-safe destination: camera remains independent from the actor's world motion.
 let approach=dt<ANIMATION_STEP_MS?easeOutCubic(dt/ANIMATION_STEP_MS):dt<ANIMATION_STEP_MS*3?1:1-smooth01((dt-ANIMATION_STEP_MS*3)/(ANIMATION_STEP_MS*2));
 const scale=lerp(1,.50,approach);
 const targetWidth=pos.w*.50;
 const targetLeft=target.x-targetWidth*.80 + camera.currentX*(.43-.52);
 const targetFeet=target.y+target.h+12;
 return {...pos,x:lerp(pos.x,targetLeft,approach),baseY:lerp(pos.baseY,targetFeet,approach),w:pos.w*scale,h:pos.h*scale};
}
function soulBasicPaint(x,baseY,w,h,dt,baseSprite='soul'){
 // Anchor images using their real painted-foot margins; never crop or rewrite Approved PNGs.
 const draw=(key,opacity=1)=>{const img=images[key];if(!img?.complete||!img.naturalWidth)return;
  const m=key==='soulBasicSlash'?{foot:485,scale:1.08,dx:-.04}:key==='soulBasicWindup'?{foot:500,scale:1,dx:0}:{foot:512,scale:1,dx:0};
  const sh=h*m.scale,sw=w*m.scale;
  ctx.save();ctx.globalAlpha*=opacity;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(img,x+(w-sw)/2+dxFor(m.dx,w),baseY-sh*m.foot/512,sw,sh);ctx.restore();
 };
 const mix=(before,after,a)=>{draw(before,1-a);draw(after,a)};
 if(dt<ANIMATION_STEP_MS)draw(baseSprite);
 else if(dt<ANIMATION_STEP_MS*2)mix(baseSprite,'soulBasicWindup',(dt-ANIMATION_STEP_MS)/ANIMATION_STEP_MS);
 else if(dt<ANIMATION_STEP_MS*3)draw('soulBasicWindup');
 else if(dt<ANIMATION_STEP_MS*4)draw('soulBasicSlash');
 else if(dt<ANIMATION_STEP_MS*5)mix('soulBasicSlash',baseSprite,(dt-ANIMATION_STEP_MS*4)/ANIMATION_STEP_MS);
 else draw(baseSprite);
}
function dxFor(relative,width){return relative*width}
function cameraShot(t=performance.now()){
 if(phase==='setup'||phase==='victory'||phase==='defeat')return 'command';
 if(phase==='intro')return actingEnemyId?'enemy-windup':'command';
 if(cameraPreview==='party'&&pendingTargetAction?.targetSide==='ally'&&!paused)return 'party';
 if(phase==='player')return cameraPreview==='party'?'party':cameraPreview==='target'?'target':'command';
 if(phase==='enemy')return 'enemy-windup';
 if(phase==='resolve'&&fx){const dt=t-fx.at;
  if(fx.kind==='support')return fx.targetAllyId?(fx.action==='ultimate'?'party':'ally-impact'):'command';
  if(fx.kind==='enemy')return dt<COMBAT_ACTION_PHASE_GAP_MS?'enemy-windup':'enemy-impact';
  if(fx.kind==='ultimate')return dt<ULTIMATE_CAMERA_INTRO_MS?'ultimate-intro':'attack-impact';
 return dt<(fx.kind==='basic'&&fx.actor==='soul'?ANIMATION_STEP_MS*2:ANIMATION_STEP_MS)?'attack-track':'attack-impact';
 }
 // Animation lifetimes can end a frame before their resolution timers. Keep
 // the impact framing, but do not retain a stale party-selection shot after
 // the support effect itself has ended.
 if(phase==='resolve'&&!fx)return camera.shot==='party'?'command':camera.shot==='command'?'attack-impact':camera.shot;
 return 'command';
}
function shotPan(s){
 const tgt=(s==='attack-track'||s==='attack-impact')&&fx?.targetEnemyId?(enemies.find(e=>e.id===fx.targetEnemyId)||fx?.targetGeometry||chosenEnemy()):chosenEnemy(),att=enemies.find(e=>e.id===actingEnemyId);
 if(s==='target')return Math.max(-88,Math.min(23,-35-(tgt?(tgt.x-1040)*.115:0)));
 if(s==='enemy-windup')return Math.max(-104,Math.min(30,-47-(att?(att.x-1040)*.14:0)));
 if(s==='attack-impact'||s==='attack-track')return Math.max(-110,Math.min(26,-30-(tgt?(tgt.x-1040)*.09:0)));
 return ({command:0,party:34,'enemy-impact':28,'ultimate-intro':-86})[s]||0
}
function shotWorld(s){return s==='party'?'reverse':'forward'}
function prepareCamera(t){const s=cameraShot(t);const focus=phase==='resolve'&&!fx?camera.focus:s==='target'?chosenEnemy()?.id:s==='enemy-windup'?actingEnemyId:s==='attack-impact'||s==='attack-track'?fx?.targetEnemyId:null;if(s!==camera.shot||focus!==camera.focus){camera.from=camera.shot;camera.shot=s;camera.focus=focus;camera.start=t;camera.duration=shotWorld(s)!==shotWorld(camera.from)?CAMERA_TRANSITION_BETWEEN_SIDES_MS:CAMERA_TRANSITION_SAME_VIEW_MS;camera.lastX=camera.currentX??shotPan(camera.from)}
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
 if(view==='ally-impact')return {x:211,baseY:908,w:288,h:576};
 // Foreground cinematic framing: the ally stands close to camera, not inside a reserved
 // 'safe' slot above the party HUD. The HUD pass paints OVER the actor's lower body.
 // This is a presentation-only change. No world-space targeting mechanics depend on it.
 return {x:211,baseY:908,w:288,h:576};
}
function allyHudFxPosition(id){
 const index=party.findIndex(p=>p.id===id);if(index<0)return null;
 const cardW=248,gap=12,total=party.length*cardW+Math.max(0,party.length-1)*gap;
 const x=Math.max(16,Math.round((1060-total)/2))+index*(cardW+gap);
 return {x:x+cardW/2,y:688};
}
function drawUnit(p,pos,view,t,acting=false){
 if(!p||!pos)return;const {x,baseY,w,h}=pos,top=baseY-h;
 const bob=Math.sin(t*.0012+(p.id==='soul'?0:1))*(p.hp>0?1.25:0);
 const select=view==='party'&&selectedAllyId===p.id;const allyTargeting=view==='party'&&pendingTargetAction?.targetSide==='ally',allTeamTargeting=allyTargeting&&pendingTargetAction?.targetScope==='all',supportAnimating=view==='ally-impact'&&phase==='resolve'&&fx?.kind==='support'&&fx.targetAllyId===p.id,eligible=view==='party'&&supportDemo?eligibleAllyTarget(p,supportDemo):allyTargeting?p.hp>0:true;
 ctx.save();ctx.translate(camera.currentX*(view==='party'?.32:.52),bob);
 ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.44,16,0,0,Math.PI*2);ctx.fillStyle='rgba(12,12,40,.45)';ctx.fill();
 if(acting||select){ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.51,22,0,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle=select?(allyTargeting||supportAnimating?'#55aaff':'#eaca94'):'#8be3fb';ctx.stroke()}
 if(p.hp<=0)ctx.globalAlpha=.37;
 const art=p.id==='soul'?(view==='party'||view==='ally-impact'?'soulFront':equippedSoulBattleSprite()):p.id==='zero'?(view==='party'||view==='ally-impact'?'zeroFront':'zeroBattle'):p.id==='lily'?(view==='party'||view==='ally-impact'?'lilyFront':'lilyBack'):p.id==='dawn'?(view==='party'||view==='ally-impact'?'dawnFront':'dawnBattle'):p.id==='logan'?(view==='party'||view==='ally-impact'?'loganFront':'loganBattle'):null;
 const zb=view==='command'&&p.id==='soul'?soulBasicStage(t):null;
  if(zb!==null)soulBasicPaint(x,baseY,w,h,zb,art);
  else if(art&&images[art]?.complete&&images[art].naturalWidth){
  const img=images[art],fullArtwork=art==='soulFront'||art==='zeroFront'||art==='lilyFront'||art==='dawnFront'||art==='loganFront';ctx.imageSmoothingEnabled=fullArtwork;
  if(fullArtwork){
   // Ally targeting uses the same full-body front artwork across the entire party.
   ctx.drawImage(img,x,top,w,h);
  }else if(art==='soul'||art==='soulBattleStandard'||art==='soulBattlePremium'||art==='zeroBattle'||art==='lilyBack'||art==='loganBattle'){
   // Fit the visible cutout to the same enlarged battle-stage height across
   // playable characters, removing transparent source-image margins.
   const b=spriteAlphaBounds(img),scale=(h*1.12)/b.h,drawW=b.w*scale,drawH=b.h*scale;
   ctx.drawImage(img,b.x,b.y,b.w,b.h,x+(w-drawW)/2,baseY-drawH,drawW,drawH);
 }else if(art==='dawnBattle'){
   const b=spriteAlphaBounds(img),scale=(h*1.12)/b.h,drawW=b.w*scale,drawH=b.h*scale;
   ctx.drawImage(img,b.x,b.y,b.w,b.h,x+(w-drawW)/2,baseY-drawH,drawW,drawH);
  }else ctx.drawImage(img,x,top,w,h);
 }else silhouette(x,top,w,h,p.name,p.test);
 ctx.restore();
 const xx=x+camera.currentX*(view==='party'?.32:.52);
 if((allyTargeting||supportAnimating)&&eligible&&(allTeamTargeting||selectedAllyId===p.id)){ctx.save();ctx.beginPath();ctx.arc(xx+w/2,top+h/2,Math.max(w,h)/2+8,0,Math.PI*2);ctx.strokeStyle='#55aaff';ctx.lineWidth=4;ctx.stroke();ctx.restore()}
 if(view==='party'){
  rect(xx-16,top-60,w+32,40,select?'#3f3845ef':!eligible?'#24212fe7':'#1e2945df',select?'#ffe2a8':eligible?'#869ab0':'#655d6a',8);
  text(p.name,xx+w/2,top-41,p.test?16:19,p.hp<=0?'#c6acb0':'#f4edf8','800','center');
  if(p.hp<=0)text('K.O. • SLOT RETAINED',xx+w/2,top-77,14,'#ffbaba','800','center');
  line(xx-2,top-13,w+4,p.hp/p.maxHp,p.hp<=0?'#74525f':'#72e4b1','#454457',8);
  // Target test hit boxes do not affect actual healing or combat targeting logic.
  if((phase==='player'||allyTargeting)&&cameraPreview==='party')choiceRects.push({x:xx-19,y:top-82,w:w+38,h:h+114,action:'camera-select:'+p.id,enabled:eligible});
 }

}
function drawEnemy(t,shot){const all=enemies;if(phase==='player'&&pendingTargetAction&&cameraPreview!=='party'&&previewTargetMode()==='aoe'&&combatEnemies().length){ctx.save();ctx.strokeStyle='rgba(102,243,211,.82)';ctx.lineWidth=5;ctx.setLineDash([22,12]);ctx.beginPath();ctx.ellipse(1093+camera.currentX*.43,558,453,67,0,0,Math.PI*2);ctx.stroke();ctx.restore()}for(const e of all){
 const defeated=e.hp<=0,deathElapsed=defeated?Math.max(0,t-(e.deathAt||t)):0,deathProgress=Math.min(1,deathElapsed/ENEMY_DEATH_BEAT_MS),entering=!defeated&&e.reinforcement&&e.enteredAt&&t-e.enteredAt<ENEMY_REINFORCEMENT_ENTRY_MS,entryProgress=entering?Math.max(0,Math.min(1,(t-e.enteredAt)/ENEMY_REINFORCEMENT_ENTRY_MS)):1,opacity=defeated?Math.max(0,1-deathProgress):entryProgress;
 ctx.save();ctx.globalAlpha=opacity;
 const isFocus=phase==='player'&&chosenEnemy()?.id===e.id;
 const patternHit=phase==='player'&&!!pendingTargetAction&&cameraPreview!=='party'&&chooseAttackTargets(previewTargetMode()).some(x=>x.id===e.id);
 const isActor=(shot==='enemy-windup'&&actingEnemyId===e.id)||(fx?.kind==='enemy'&&fx?.actorEnemyId===e.id&&shot==='enemy-impact');
 const sh=(isActor?1.09:shot==='attack-impact'&&fx?.targetEnemyId===e.id?1.045:1)*(e.category==='boss'?1.55:1)*((e.reinforcement&&e.enteredAt)?0.92+entryProgress*.08:1);
 const ww=e.w*sh,hh=e.h*sh,xx=e.x+camera.currentX*.43-(ww-e.w)/2,yy=e.y+(e.h-hh)+(entering?(1-entryProgress)*27:0)+(defeated?Math.pow(deathProgress,1.4)*26:0);
 const zbHit=fx?.kind==='basic'&&fx?.actor==='soul'&&fx.targetEnemyId===e.id?t-fx.at:null;
 const hitKick=zbHit!==null&&zbHit>=ANIMATION_STEP_MS*3&&zbHit<ANIMATION_STEP_MS*4?Math.sin((zbHit-ANIMATION_STEP_MS*3)*.025)*(1-(zbHit-ANIMATION_STEP_MS*3)/ANIMATION_STEP_MS)*2:0;
 let spriteCenterY=yy+hh/2,spriteVisibleW=ww,spriteVisibleH=hh;const spriteOffsetX=defeated?0:hitKick,spriteOffsetY=defeated||entering?0:Math.sin(t*.0026+e.x)*2.2;
 ctx.save();ctx.globalAlpha=opacity;if(defeated)ctx.filter='grayscale(1)';ctx.translate(spriteOffsetX,spriteOffsetY);
 ctx.beginPath();ctx.ellipse(xx+ww/2,yy+hh-4,ww*.48,13,0,0,Math.PI*2);ctx.fillStyle='#1b213c70';ctx.fill();
 const spriteId=enemyBattleSprite(e);if(images[spriteId]?.complete&&images[spriteId].naturalWidth){const img=images[spriteId];ctx.imageSmoothingEnabled=spriteId==='slimeBattle';const ratioParts=String(e.battleAspectRatio||'').split(':').map(Number),aspect=ratioParts.length===2&&ratioParts.every(Number.isFinite)&&ratioParts[0]>0&&ratioParts[1]>0?ratioParts[0]/ratioParts[1]:img.naturalWidth/img.naturalHeight,canvasW=Math.min(ww,hh*aspect),canvasH=canvasW/aspect,scaleX=canvasW/img.naturalWidth,scaleY=canvasH/img.naturalHeight,bounds=spriteAlphaBounds(img),drawW=bounds.w*scaleX,drawH=bounds.h*scaleY,drawX=xx+(ww-drawW)/2,drawY=yy+hh-drawH;spriteVisibleW=drawW;spriteVisibleH=drawH;spriteCenterY=drawY+drawH/2;ctx.drawImage(img,bounds.x,bounds.y,bounds.w,bounds.h,drawX,drawY,drawW,drawH)}
 ctx.restore();
 if(defeated){ctx.restore();continue}
 if(isActor){ctx.strokeStyle='#b7e6ff';ctx.lineWidth=4;ctx.strokeRect(xx-8,yy-6,ww+16,hh+13)}
 if(patternHit){const ringRadius=Math.max(spriteVisibleW,spriteVisibleH)/2+8;ctx.beginPath();ctx.arc(xx+ww/2+spriteOffsetX,spriteCenterY+spriteOffsetY,ringRadius,0,Math.PI*2);ctx.strokeStyle='#55aaff';ctx.lineWidth=4;ctx.stroke()}
 if(e.category!=='boss'){
  rect(xx-3,yy-68,ww+6,27,'#1c2843e8','#8d96a9',6);
  text(e.name,xx+ww/2,yy-55,13,'#fff4e8','800','center');
  line(xx+2,yy-29,ww-4,e.maxBarrier?e.barrier/e.maxBarrier:0,'#c4c9d2','#626a75',6);
  shieldedHealthBar(xx+2,yy-19,ww-14,10,e.hp,e.maxHp,e.shield,isFocus?'#ffd88e':'#ff8276','#4b2637');
 }
 if(e.brokenTurns>0)text('BROKEN '+e.brokenTurns,xx+ww/2,yy+9,12,'#9cecff','800','center');
 if(!entering&&phase==='player'&&!paused&&cameraPreview!=='party')choiceRects.push({x:xx-13,y:yy-64,w:ww+26,h:hh+74,action:'enemy-target:'+e.id,enabled:true});
 ctx.restore();
}}
function drawActorsForShot(t,shot){
 const view=shotWorld(shot)==='reverse'?'party':'command';
 if(view==='party'){
  const ordered=party.map(p=>({p,pos:cameraAllyPosition(p.id,'party')})).sort((a,b)=>a.pos.baseY-b.pos.baseY);
  for(const {p,pos} of ordered)drawUnit(p,pos,'party',t,p.id===selectedAllyId);
  return;
 }
 if(shot==='ally-impact'){
  const target=party.find(p=>p.id===fx?.targetAllyId&&p.hp>0);
  if(target)drawUnit(target,cameraAllyPosition(target.id,'ally-impact'),'ally-impact',t,true);
  return;
 }
 const ultimateActor=(pendingTargetAction?.action==='ultimate'&&party.find(p=>p.id===pendingTargetAction.actorId))||(ultimateExecuting&&lastAttack?.action==='ultimate'&&party.find(p=>p.id===lastAttack.actor));
 const chosen=ultimateActor|| (shot==='enemy-impact'?(party.find(p=>p.id===fx?.target)||active()||alive()[0]):phase==='intro'?active():active()||alive()[0]);
 const pos=cameraAllyPosition(chosen?.id,'command');
 if(chosen&&pos){
  // True tracked character travel is independent of the background-layer camera offsets.
  const dt=fx?.actor===chosen.id?t-fx.at:9999;
  const basicLunge=fx?.kind==='basic'&&fx.actor===chosen.id?74*smooth01(dt/ANIMATION_STEP_MS)*(1-smooth01((dt-ANIMATION_STEP_MS)/(ANIMATION_STEP_MS*2))):0;
  // Enemies are in the midground; render them first, then the close foreground ally.
  drawEnemy(t,shot);
  drawUnit(chosen,(chosen.id==='soul'&&soulBasicStage(t)!==null)?soulBasicTravel(t,pos):{...pos,x:pos.x+basicLunge},'command',t,phase==='player'&&cameraPreview!=='target');
 }else{
  drawEnemy(t,shot);
 }
 if(shot==='ultimate-intro'&&chosen?.id==='soul'){
  // Zero-specific development camera cut-in. A full bespoke ultimate animation remains an art dependency.
  ctx.save();ctx.globalAlpha=.92;
  rect(550,130,470,505,'rgba(17,27,51,.76)','#e6c892',22);
  if(images.soulFront?.complete&&images.soulFront.naturalWidth){ctx.drawImage(images.soulFront,644,150,279,475)}
  text('SOUL  /  ULTIMATE',784,623,29,'#fff1cc','850','center');ctx.restore();
 }
}
function drawBattleAreaBackground(areaId,reverse=false){
 const area=BATTLE_AREAS[areaId]||BATTLE_AREAS[DEFAULT_BATTLE_AREA_ID];
 const hasReverse=reverse&&!!area.reverseBackground,key=hasReverse?area.reverseBackground:area.background,img=images[key];
 if(!img?.complete||!img.naturalWidth||!img.naturalHeight)return false;
 const scale=Math.max(W/img.naturalWidth,H/img.naturalHeight),sw=W/scale,sh=H/scale,sx=(img.naturalWidth-sw)/2,sy=(img.naturalHeight-sh)/2;
 ctx.save();ctx.imageSmoothingEnabled=true;
 if(reverse&&!hasReverse){ctx.translate(W,0);ctx.scale(-1,1)}
 ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);ctx.restore();return true;
}
function drawBattleShot(t,shot){const reverse=shotWorld(shot)==='reverse',area=BATTLE_AREAS[currentBattleAreaId]||BATTLE_AREAS[DEFAULT_BATTLE_AREA_ID];
 const areaBackground=drawBattleAreaBackground(currentBattleAreaId,reverse);
 if(!areaBackground){if(reverse)reverseScene(t);else forwardScene(t)}
 drawActorsForShot(t,shot);drawCombatVisualEvents(t,shot);if(!areaBackground||area.foregroundEffect==='petals')petals(t);
 const shade=ctx.createLinearGradient(0,565,0,900);shade.addColorStop(0,'rgba(12,12,26,0)');shade.addColorStop(1,'rgba(5,10,25,.52)');rect(0,555,W,345,shade);
}
function drawCameraStage(t){prepareCamera(t);
 // Render the destination scene continuously. Ease its pan into place without
 // flashing the previous view or laying a dark veil over party selection.
 drawBattleShot(t,camera.shot);
 // Camera test labels are shown in the HUD; no obscured scene banners.
}

function drawCombatSigil(x,y,r,colorName,alpha,style='ring'){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.strokeStyle=colorName;ctx.fillStyle=colorName;ctx.lineWidth=4;
 if(style==='star'){
  ctx.beginPath();for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,rr=i%2?r*.48:r;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath();ctx.fill();
 }else if(style==='note'){
  ctx.beginPath();ctx.arc(-r*.25,-r*.15,r*.19,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-r*.08,-r*.15);ctx.lineTo(-r*.08,-r*.85);ctx.lineTo(r*.55,-r*.68);ctx.lineTo(r*.55,-r*.05);ctx.stroke();ctx.beginPath();ctx.arc(r*.39,-r*.07,r*.17,0,Math.PI*2);ctx.fill();
 }else{
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.68,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.78,Math.sin(a)*r*.78);ctx.lineTo(Math.cos(a)*r*1.12,Math.sin(a)*r*1.12);ctx.stroke()}
 }
 ctx.restore();
}
function enemyVisualPosition(id,geometry=null){const e=enemies.find(x=>x.id===id)||geometry;return e?{x:e.x+e.w/2+camera.currentX*.43,y:e.y+e.h*.55}:null}
function drawFx(t){
 if(!fx)return;const dt=t-fx.at,duration=fx.kind==='basic'&&fx.actor==='soul'?SOUL_BASIC_MS:fx.action==='ultimate'?ULTIMATE_PRESENTATION_MS:fx.kind==='enemy'?ENEMY_ATTACK_EFFECT_MS:lastAttack?.mode==='five-hit'?ULTIMATE_PRESENTATION_MS:COMBAT_ACTION_EFFECT_MS;if(dt>duration){fx=null;return}
 const q=clamp01(dt/duration),fade=1-q,visual=fx.visual||`${fx.actor}-${fx.kind}`;
 if(fx.kind==='self'){const pos=cameraAllyPosition(fx.actor,'command');if(pos){const x=pos.x+pos.w/2+camera.currentX*.52,y=pos.baseY-pos.h*.58;drawCombatSigil(x,y,35+q*80,'#75cfff',fade,'ring');drawCombatSigil(x,y,22+q*45,'#e2f7ff',fade*.8,'star')}return}
 if(fx.kind==='support'){
  if(visual==='logan-blood-shield'){
   const pos=cameraAllyPosition(fx.actor,'command');if(pos){const x=pos.x+pos.w/2+camera.currentX*.52,y=pos.baseY-pos.h*.58;drawCombatSigil(x,y,32+q*66,'#83dcff',fade,'ring');drawCombatSigil(x,y,18+q*42,'#ffe0ed',fade*.75,'star')}
   text('BLOOD SHIELD',1050,432,20,`rgba(215,244,255,${fade})`,'900','center');return;
  }
  const p=party.find(x=>x.id===fx.targetAllyId),view=fx.action==='ultimate'?'party':'ally-impact',pos=p&&cameraAllyPosition(p.id,view);if(!pos)return;
  const x=pos.x+pos.w/2+camera.currentX*(view==='party'?.32:.52),y=pos.baseY-pos.h*.58,progress=q;
  if(visual==='dawn-tune'){
   drawCombatSigil(x,y,45+progress*85,'#6dfff1',fade,'ring');drawCombatSigil(x-36,y-85-progress*22,25,'#e9ffe9',fade,'note');drawCombatSigil(x+43,y-40-progress*12,19,'#a1d8ff',fade*.9,'note');
   text('TUNE',x,y-145,20,`rgba(226,255,250,${fade})`,'900','center');
  }else{
   drawCombatSigil(x,y,55+progress*80,'#ffd989',fade,'ring');drawCombatSigil(x,y,25+progress*44,'#fff4c1',fade*.8,'star');
   ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#ffe9ad';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-100,y+80);ctx.quadraticCurveTo(x,y-120,x+100,y-190);ctx.stroke();ctx.restore();text('ADVANCE',x,y-155,18,`rgba(255,239,194,${fade})`,'900','center');
  }
  return;
 }
 if(fx.kind==='enemy'){
  const view=camera.shot==='party'?'party':'command',pan=view==='party'?.32:.52,hits=fx.hits?.length?fx.hits:[{target:fx.target}];
  for(const hit of hits){const hudHit=hits.length>1&&view!=='party',pos=hudHit?allyHudFxPosition(hit.target):cameraAllyPosition(hit.target,view);if(!pos)continue;const x=hudHit?pos.x:pos.x+pos.w/2+camera.currentX*pan,y=hudHit?pos.y:pos.baseY-pos.h*.58;ctx.save();ctx.globalAlpha=fade;
   if(fx.visual==='enemy-slime-acid'){ctx.fillStyle='#a8ff9d';ctx.strokeStyle='#ecffbc';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x-30+i*20,y-5-Math.sin(i+q*6)*18,10+i%2*3,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.stroke()}}
   else if(fx.visual==='slime-leader-blast'){drawCombatSigil(x,y,33+q*48,'#a9ff54',fade,'ring');for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#caff78':'#82e62d';const a=i*Math.PI*2/5+q*2;ctx.beginPath();ctx.arc(x+Math.cos(a)*(35+q*15),y+Math.sin(a)*(34+q*14),8,0,Math.PI*2);ctx.fill()}}
   else if(fx.visual==='slime-monster-wave'){drawCombatSigil(x,y,65+q*100,'#8fe328',fade,'ring');ctx.fillStyle='#b7ff4c';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x-26+i*26,y-34-Math.sin(i+q*5)*18,10,0,Math.PI*2);ctx.fill()}}
   else{ctx.strokeStyle='#ff8997';ctx.lineWidth=11;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-54+i*15,y-66);ctx.lineTo(x+45+i*15,y+55);ctx.stroke()}}
   ctx.restore();if(dt>ANIMATION_STEP_MS){const labelY=hudHit?y+34:y-65,damage=hit.healthDamage??hit.damage??fx.damage;if(damage>0)text('-'+damage,x,labelY,26,hit.critical?'#ffd66e':'#ff9d9e','900','center');else if(hit.shieldDamage>0)text('BLOCKED',x,labelY,17,'#b6efff','900','center');if(hit.critical)text('CRITICAL',x,hudHit?y+12:y-96,12,'#ffe9a9','900','center')}}return;
 }
 const targetIds=fx.targetEnemyIds?.length?fx.targetEnemyIds:[fx.targetEnemyId],targets=targetIds.map(id=>enemyVisualPosition(id,fx.targetGeometry)).filter(Boolean);
 if(!targets.length){const p=enemyVisualPosition(fx.targetEnemyId,fx.targetGeometry);if(p)targets.push(p)}
 for(let i=0;i<targets.length;i++){
  const {x,y}=targets[i],offset=i*85;
  if(visual==='zero-cut'){
   ctx.save();ctx.translate(x,y);ctx.globalAlpha=fade;ctx.lineCap='round';ctx.strokeStyle='#e64559';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(-90,72);ctx.lineTo(86,-78);ctx.stroke();ctx.strokeStyle='#fff1dc';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-94,67);ctx.lineTo(82,-82);ctx.stroke();ctx.restore();
  }else if(visual==='zero-first-strike'){
   ctx.save();ctx.translate(x,y);ctx.globalAlpha=fade;ctx.lineCap='round';ctx.strokeStyle='#f35667';ctx.lineWidth=11;for(let k=0;k<3;k++){const a=q*2+k*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*-68,Math.sin(a)*-54);ctx.lineTo(Math.cos(a)*68,Math.sin(a)*54);ctx.stroke()}ctx.strokeStyle='#fff3dc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-72,65);ctx.lineTo(74,-66);ctx.stroke();ctx.restore();
  }else if(visual==='zero-execution'){
   drawCombatSigil(x,y,42+q*112,'#ee5868',fade,'ring');drawCombatSigil(x,y,20+q*72,'#fff0d5',fade*.9,'star');ctx.save();ctx.translate(x,y);ctx.globalAlpha=fade;ctx.strokeStyle='#ff7e89';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-80,-45);ctx.lineTo(80,45);ctx.moveTo(80,-45);ctx.lineTo(-80,45);ctx.stroke();ctx.restore();
  }else if(visual==='soul-sword'){
   const a=fade*(dt>ANIMATION_STEP_MS*3?clamp01((duration-dt)/ANIMATION_STEP_MS):1);ctx.save();ctx.translate(x,y);ctx.rotate(-.4);ctx.globalAlpha=a;ctx.lineCap='round';ctx.strokeStyle='#eff8ff';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-108,-90);ctx.quadraticCurveTo(80,-40,100,92);ctx.stroke();ctx.strokeStyle='#80dcff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-118,-104);ctx.quadraticCurveTo(70,-55,116,85);ctx.stroke();ctx.restore();
  }else if(visual==='soul-enhance'){
   drawCombatSigil(x,y,44+q*70,'#75cfff',fade,'ring');drawCombatSigil(x,y,25+q*36,'#e2f7ff',fade*.8,'star');
  }else if(visual==='soul-storm'){
   drawCombatSigil(x,y,56+q*120,'#9bd8ff',fade,'ring');drawCombatSigil(x,y,31+q*69,'#ffe3a5',fade*.85,'star');
  }else if(visual==='lily-petal'){
   ctx.save();ctx.globalAlpha=fade;ctx.translate(x,y);for(let k=0;k<6;k++){const a=k*Math.PI/3+q*3;ctx.save();ctx.rotate(a);ctx.fillStyle=k%2?'#ffb5d4':'#fff0f6';ctx.beginPath();ctx.ellipse(0,-35-q*35,12,29,0,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.restore();
  }else if(visual==='lily-ricochet'||visual==='lily-ricochet-mark'||visual==='lily-ricochet-trigger'){
   drawCombatSigil(x,y,36+q*95,'#cf91ff',fade,'ring');if(visual!=='lily-ricochet')drawCombatSigil(x,y,26+q*45,'#ffb6eb',fade*.9,'star');
   if(visual==='lily-ricochet-trigger'){ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#f0bcff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-50,y-45);ctx.lineTo(x+50,y+45);ctx.moveTo(x+50,y-45);ctx.lineTo(x-50,y+45);ctx.stroke();ctx.restore()}
  }else if(visual==='lily-haunting'||visual==='lily-hauntling'){
   drawCombatSigil(x,y,45+q*105,'#9d6bdf',fade,'ring');drawCombatSigil(x-35,y-26,17+q*12,'#d9b6ff',fade*.85,'star');drawCombatSigil(x+38,y+24,12+q*14,'#c78cff',fade*.75,'star');
 }else if(visual==='dawn-star'){
   drawCombatSigil(x,y,34+q*78,'#7cf8ed',fade,'star');drawCombatSigil(x,y,22+q*42,'#fff1bd',fade*.85,'ring');
  }else if(visual==='logan-blood-slash'){
   ctx.save();ctx.translate(x,y);ctx.rotate(-.45);ctx.globalAlpha=fade;ctx.strokeStyle='#a90039';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-78,-78);ctx.quadraticCurveTo(55,-22,78,82);ctx.stroke();ctx.strokeStyle='#ffd0db';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-80,-84);ctx.quadraticCurveTo(49,-18,82,77);ctx.stroke();ctx.restore();
  }else if(visual==='logan-red-tide'){
   drawCombatSigil(x,y,46+q*112,'#c2174b',fade,'ring');drawCombatSigil(x,y,22+q*68,'#ffe0e8',fade*.8,'star');
  }else{
   ctx.save();ctx.translate(x,y);ctx.rotate(-.35);ctx.strokeStyle=`rgba(255,247,238,${fade})`;ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(0,0,90+80*q,32+80*q,0,0,Math.PI*1.65);ctx.stroke();ctx.restore();
  }
 }
 if(dt>ANIMATION_STEP_MS){const hits=(lastAttack?.hits||[]).filter(h=>h.phase==='initial'),ids=[...new Set(hits.filter(h=>h.damage>0).map(h=>h.target))];for(const id of ids){const p=enemyVisualPosition(id);if(!p)continue;const amount=hits.filter(h=>h.target===id).reduce((sum,h)=>sum+(h.healthDamage??h.damage??0),0),shielded=hits.some(h=>h.target===id&&(h.shieldDamage||0)>0);if(amount>0)text('-'+amount,p.x,p.y-50,33,'#fff0ba','900','center');else if(shielded)text('BLOCKED',p.x,p.y-50,17,'#b6efff','900','center');if(hits.some(h=>h.target===id&&h.critical))text('CRITICAL',p.x,p.y-80,14,'#ffe9a9','900','center')}}
}
function drawCombatVisualEvents(t,shot){
 combatVisualEvents=combatVisualEvents.filter(e=>t-e.at<e.duration);
 for(const event of combatVisualEvents){const q=clamp01((t-event.at)/event.duration),fade=1-q;
  if(event.type==='zero-delay'){
   for(const id of event.targetIds){const pos=enemyVisualPosition(id);if(!pos)continue;drawCombatSigil(pos.x,pos.y,28+q*44,'#f57482',fade,'ring');text('DELAYED 20%',pos.x,pos.y-58,13,`rgba(255,220,223,${fade})`,'900','center')}continue;
  }
  if(event.type==='dawn-resourceful'){
   const x=W/2,y=435;drawCombatSigil(x,y,58+q*100,'#80f2ed',fade,'ring');text('RESOURCEFUL  •  +2 SP',x,y-125,24,`rgba(224,255,247,${fade})`,'900','center');continue;
  }
  if(event.type==='lifesteal-heal'){
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52;
   for(const id of event.targetIds){const ally=party.find(unit=>unit.id===id),allyPosition=ally&&cameraAllyPosition(id,view),enemyPosition=!ally&&enemyVisualPosition(id);const x=allyPosition?allyPosition.x+allyPosition.w/2+camera.currentX*pan:enemyPosition?.x,y=allyPosition?allyPosition.baseY-allyPosition.h*.62:enemyPosition?.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;drawCombatSigil(x,y,27+q*20,'#6ef0a5',fade,'ring');text(`LIFESTEAL +${event.healing}`,x,y-54,15,`rgba(193,255,216,${fade})`,'900','center')}
   continue;
  }
  if(event.type==='bleed-applied'||event.type==='bleed-tick'){
   for(const id of event.targetIds){const pos=enemyVisualPosition(id);if(!pos)continue;drawCombatSigil(pos.x,pos.y,32+q*24,'#e85b77',fade,'ring');const label=event.type==='bleed-tick'?`BLEED -${event.damage??0} • ${event.stacks??0} LEFT`:`BLEED ${event.stacks??0}/${enemies.find(enemy=>enemy.id===id)?.bleedMaxStacks||5}`;text(label,pos.x,pos.y-64,14,`rgba(255,197,208,${fade})`,'900','center')}
   continue;
  }
  if(event.type==='taunt-applied'||event.type==='taunt-redirect'){
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52;
   for(const id of event.targetIds){const ally=party.find(unit=>unit.id===id),allyPosition=ally&&cameraAllyPosition(id,view),enemyPosition=!ally&&enemyVisualPosition(id);const x=allyPosition?allyPosition.x+allyPosition.w/2+camera.currentX*pan:enemyPosition?.x,y=allyPosition?allyPosition.baseY-allyPosition.h*.62:enemyPosition?.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;drawCombatSigil(x,y,34+q*23,'#83dcff',fade,'ring');const rate=Math.round((event.rate??tauntRateOf(ally||enemies.find(unit=>unit.id===id)))*100);text(event.type==='taunt-redirect'?`TAUNT REDIRECT • ${rate}%`:`TAUNT ${rate}% • ${event.turns} TURN${event.turns===1?'':'S'}`,x,y-62,14,`rgba(203,243,255,${fade})`,'900','center')}
   continue;
  }
  if(event.type==='shield-applied'||event.type==='shield-absorbed'||event.type==='logan-signature-heal'){
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52;
   for(const id of event.targetIds){const ally=party.find(unit=>unit.id===id),allyPosition=ally&&cameraAllyPosition(id,view),enemyPosition=!ally&&enemyVisualPosition(id);const x=allyPosition?allyPosition.x+allyPosition.w/2+camera.currentX*pan:enemyPosition?.x,y=allyPosition?allyPosition.baseY-allyPosition.h*.62:enemyPosition?.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;const isShield=event.type!=='logan-signature-heal';drawCombatSigil(x,y,28+q*20,isShield?'#aeb5bd':'#6ef0a5',fade,'ring');const label=event.type==='shield-applied'?'SHIELD APPLIED':event.type==='shield-absorbed'?'SHIELD ABSORBED':`TASTE FOR BLOOD +${event.healing||0}`;text(label,x,y-54,14,isShield?`rgba(218,223,229,${fade})`:`rgba(193,255,216,${fade})`,'900','center')}
   continue;
  }
  if(event.type==='slime-residue'){
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52;
   for(const id of event.targetIds){const ally=party.find(p=>p.id===id),pos=ally&&cameraAllyPosition(id,view);if(!pos)continue;const x=pos.x+pos.w/2+camera.currentX*pan,y=pos.baseY-pos.h*.58;drawCombatSigil(x,y,32+q*22,'#a5ed43',fade,'ring');text(`RESIDUE ${ally.residueStacks}/${RESIDUE_RULES.maxStacks}`,x,y-62,14,`rgba(222,255,173,${fade})`,'900','center')}
   continue;
  }
  for(const id of event.targetIds){const p=enemyVisualPosition(id,event.targetGeometry?.[id]);if(!p)continue;
   if(event.type==='lily-exposed'){drawCombatSigil(p.x,p.y,36+q*12,'#a978e8',fade,'ring');text('EXPOSED',p.x,p.y-64,14,`rgba(226,207,255,${fade})`,'900','center')}
   else if(event.type==='lily-ricochet-mark'){drawCombatSigil(p.x,p.y,28+q*8,'#d18cff',fade,'star')}
   else if(event.type==='lily-ricochet-trigger'){drawCombatSigil(p.x,p.y,38+q*45,'#f0b2ff',fade,'ring');text('RICOCHET',p.x,p.y-78,14,`rgba(250,224,255,${fade})`,'950','center');const damage=event.damageByTarget?.[id];if(Number.isFinite(damage))text(`-${damage} TRUE`,p.x,p.y-55,20,`rgba(250,238,255,${fade})`,'950','center')}
   else if(event.type==='soul-follow-up'){drawCombatSigil(p.x,p.y,34+q*46,'#64d9ff',fade,'ring');drawCombatSigil(p.x,p.y,18+q*26,'#effcff',fade,'star');ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#e6f9ff';ctx.shadowColor='#62d5ff';ctx.shadowBlur=18;ctx.lineWidth=9*(1-q*.35);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-43,p.y-42);ctx.lineTo(p.x+43,p.y+42);ctx.moveTo(p.x+43,p.y-42);ctx.lineTo(p.x-43,p.y+42);ctx.stroke();ctx.restore();text('FOLLOW-UP',p.x,p.y-75,15,`rgba(212,247,255,${fade})`,'950','center');const damage=event.damageByTarget?.[id];if(Number.isFinite(damage))text(`-${damage}`,p.x,p.y-52,22,`rgba(238,251,255,${fade})`,'950','center')}
  }
 }
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
   // Portraits use their own front-facing artwork; they never borrow battle sprites.
   const cropH=Math.min(ih,Math.round(ih*(headShoulders?.31:.49))),cropW=Math.min(iw,Math.round(cropH*w/h));
   ctx.drawImage(img,(iw-cropW)/2,0,cropW,cropH,x,y,w,h);
 }else{hudCircle(x+w/2,y+h*.39,w*.18,'#899bb1');rect(x+w*.16,y+h*.57,w*.68,h*.48,'#526e8b',null,9)}
 ctx.restore();
}
// Render active combat statuses beside each ally portrait.
function hudStatusList(p){return [...(Array.isArray(p.hudStatuses)?p.hudStatuses:[]),...(p.tune?[{kind:'buff',icon:'♫',turns:p.tune.turns}]:[]),...(p.residueStacks?[{kind:'debuff',icon:'R',stacks:p.residueStacks,turns:p.residueTurns}]:[])]}
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
  if(Number.isInteger(ef.stacks)&&ef.stacks>0){
   const count=String(ef.stacks);rect(bx+iconSize-13,by+iconSize-13,12,12,'rgba(6,15,26,.98)',null,2);text(count,bx+iconSize-7,by+iconSize-4,9,'#fffafa','900','center');
   if(Number.isInteger(ef.turns)&&ef.turns>=0){rect(bx+1,by+1,13,10,'rgba(6,15,26,.98)',null,2);text(`${ef.turns}T`,bx+7,by+6,7,'#fffafa','900','center')}
  }else if(Number.isInteger(ef.turns)&&ef.turns>=0){
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
 const availableFrac=queued?0:Math.max(0,Math.min(1,availableEnergy(p)/ultimateEnergyCost(p)));
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
 const cardW=248,cardH=210,gap=12,top=678,total=party.length*cardW+Math.max(0,party.length-1)*gap;
 let x=Math.max(16,Math.round((1060-total)/2));
 for(const p of party){
  const activeAlly=phase==='player'&&activeId===p.id&&p.hp>0,ko=p.hp<=0;
  const selectingAlly=pendingTargetAction?.targetSide==='ally'&&phase==='player',targetSelected=selectingAlly&&(pendingTargetAction?.targetScope==='all'?p.hp>0:selectedAllyId===p.id);
  const portraitX=x+12,portraitY=top+10,portraitSize=112;
  ctx.save();ctx.globalAlpha=ko?.57:activeAlly?1:.84;
  rect(x,top,cardW,cardH,'rgba(14,23,42,.96)',targetSelected?'#eaca94':activeAlly?'#f3d79e':'rgba(129,164,191,.82)',12);
  hudPortrait(p.id==='soul'?images.soulFront:p.id==='zero'?images.zeroFront:p.id==='lily'?images.lilyFront:p.id==='dawn'?images.dawnFront:p.id==='logan'?images.loganPortrait:null,portraitX,portraitY,portraitSize,portraitSize,true);
  if(ko)rect(portraitX,portraitY,portraitSize,portraitSize,'rgba(30,17,23,.62)',null,10);
  drawAllyUltimate(p,x+95,top-15,136);
  drawAllyStatuses(p,portraitX,portraitY,portraitSize);
  text(String(ko?0:p.hp),x+cardW-12,top+132,14,ko?'#f0afb7':'#e4f3ef','750','right');
  shieldedHealthBar(x+12,top+149,cardW-48,14,ko?0:p.hp,p.maxHp,p.shield,ko?'#b16b76':'#67e3b4','#23374d');
  if(p.id==='soul'){
   const maximum=soulFollowUpLimit(),current=Math.max(0,Math.min(maximum,soulFollowUpProcs));
   const dotSize=12,pitch=22,rowWidth=(maximum-1)*pitch+dotSize,startX=x+(cardW-rowWidth)/2;
   for(let i=0;i<maximum;i++)hudCircle(startX+i*pitch+dotSize/2,top+184,dotSize/2,i<current?'#72d8f5':'rgba(65,84,108,.9)',i<current?'#d7f6ff':'#8295a9',1.8);
  }
  ctx.restore();
  if(selectingAlly)choiceRects.push({x,y:top,w:cardW,h:cardH,action:'camera-select:'+p.id,enabled:p.hp>0});
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
  else if(id==='soul')hudPortrait(images.soulFront,xx+7,yy+5,49,44);
  else if(id==='zero')hudPortrait(images.zeroFront,xx+7,yy+5,49,44);
  else if(id==='lily')hudPortrait(images.lilyFront,xx+7,yy+5,49,44);
  else if(id==='dawn')hudPortrait(images.dawnFront,xx+7,yy+5,49,44);
  else if(id==='logan')hudPortrait(images.loganPortrait,xx+7,yy+5,49,44);
  else{hudCircle(xx+31,yy+21,13,'#6e8eac');rect(xx+19,yy+33,24,16,'#6784a1',null,7)}
  text(now?'NOW':String(i+1),xx+54,yy+48,10,now?'#fff2cb':'#bacbdf','850','right');
 }
 ctx.restore();
 // Boss barrier and HP are screen-space displays. The barrier sits above the
 // health rows; each dot sits immediately left of its corresponding HP bar.
 const bossOnField=liveEnemies().find(e=>e.category==='boss');
 if(bossOnField){
 const bx=250,by=12,bw=1070,bars=bossOnField.healthBars||1,barH=13,barX=bx+34,barW=bw-54,bh=68+bars*20,segmentMax=bossOnField.maxHp/bars;
  rect(bx,by,bw,bh,'rgba(10,16,31,.88)','rgba(244,202,139,.68)',12);
  text(`BOSS  •  ${bossOnField.name}`,bx+18,by+13,15,'#fff0d4','850');
  hudCircle(bx+bw-218,by+13,5,'#c4c9d2','#eff2f5',1);text('BARRIER',bx+bw-207,by+13,10,'#d5e0ec','800');
  hudCircle(bx+bw-116,by+13,5,'#ee7882','#ffd3d7',1);text('HEALTH',bx+bw-105,by+13,10,'#f0e7eb','800');
  line(barX,by+31,barW,bossOnField.maxBarrier?bossOnField.barrier/bossOnField.maxBarrier:0,'#c4c9d2','#3e485a',barH);
  const activeHealthBar=Math.min(bars-1,Math.floor((bossOnField.maxHp-bossOnField.hp)/Math.max(1,segmentMax)));
  for(let i=0;i<bars;i++){
   const segmentHp=Math.max(0,Math.min(segmentMax,bossOnField.hp-i*segmentMax)),ratio=segmentMax?segmentHp/segmentMax:0,rowY=by+51+i*20;
   const remaining=segmentHp>0;hudCircle(bx+19,rowY+barH/2,5,remaining?'#f3c778':'#43485a',remaining?'#fff0c5':'#72798a',2);
   line(barX,rowY,barW,ratio,i===activeHealthBar?'#ffd57c':'#ee7882','#3e2938',barH);
  }
 }
 // Compact expanded selected enemy information.
 const focus=chosenEnemy();
 if(phase==='player'&&cameraPreview!=='party'&&focus&&focus.category!=='boss'){
  rect(938,22,399,72,'rgba(10,16,31,.78)','rgba(210,213,220,.40)',14);
  text(focus.name,961,44,19,'#fff3db','750');
  text(`HP ${focus.hp} / ${focus.maxHp}`,1315,44,15,'#f0e7eb','700','right');
  shieldedHealthBar(961,65,310,9,focus.hp,focus.maxHp,focus.shield,'#f38382','#343d51');
 }else if(cameraPreview==='party'&&!bossOnField){
  rect(1010,24,386,62,'rgba(10,16,31,.76)','rgba(200,207,225,.38)',14);
  text('SELECT AN ALLY',1035,55,20,'#f7e7ca','800');
 }
 // Separate compact upper-right utility controls.
 if(DEV_MODE)hudButton(1366,25,74,55,'dev-panel-toggle','DEV',true,devPanelOpen);
 hudButton(1481,25,74,55,'pause',paused?'PLAY':'PAUSE',phase==='player'||paused);
 // Invisible 104x104 touch hit regions respect iPhone's minimum target dimension.
 if(DEV_MODE)choiceRects.push({x:1348,y:7,w:106,h:100,action:'dev-panel-toggle',enabled:true});
 choiceRects.push({x:1463,y:7,w:106,h:100,action:'pause',enabled:phase==='player'||paused});
 // Show a cue only while target selection is pending. The active card and
 // action buttons already identify whose turn it is and which actions exist.
 if(phase==='player'&&pendingTargetAction){
  const mode=previewTargetMode(),hits=pendingTargetAction?chooseAttackTargets(mode):[];
  text(pendingTargetAction.targetSide==='ally'?(pendingTargetAction.targetScope==='all'?`SELECT ANY ALLY OR PRESS ${pendingTargetAction.action.toUpperCase()} AGAIN`:`SELECT ALLY FOR ${pendingTargetAction.action.toUpperCase()}`):`SELECT TARGET FOR ${pendingTargetAction.action.toUpperCase()} • ${hits.length} TARGETS`,1190,620,15,'#d4e9f4','700');
  addButton(1102,642,180,30,'cancel-target','CANCEL TARGET');
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
  {key:'basic',cx:1353,cy:816,r:51,enabled:playerReady,icon:'⚔',label:'ATTACK'},
  {key:'skill',cx:1508,cy:800,r:64,enabled:playerReady&&sp>0,icon:'✦',label:'SKILL'},
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
 if(phase==='resolve'&&log){rect(420,615,760,44,'rgba(9,17,31,.92)','rgba(177,203,226,.62)',11);text(log.length>76?log.slice(0,75)+'…':log,800,637,17,'#eff6ff','750','center')}
 if(DEV_MODE&&devPanelOpen&&!['victory','defeat'].includes(phase))drawDeveloperPanel();
 if(paused)drawPause();if(phase==='victory'||phase==='defeat')drawResult();
}
function drawPause(){
 rect(0,0,W,H,'rgba(2,5,15,.68)');text('PAUSED',800,208,34,'#fff3e9','850','center');
 rect(366,230,868,433,'#101729f4','#e4cda4',18);
 if(DEV_MODE){
  addButton(444,365,214,82,'test-ko','K.O. ALLY','');
  addButton(693,365,214,82,'test-revive','REVIVE ALLY','');
  addButton(942,365,214,82,'unpause','RESUME','');
 }else addButton(685,365,230,82,'unpause','RESUME','');
 addButton(570,548,220,66,'restart','RESTART BATTLE','');
 addButton(810,548,220,66,'main-menu','MAIN MENU','');
}
function drawResult(){
 rect(0,0,W,H,'rgba(3,7,15,.72)');
 text(phase==='victory'?'VICTORY':'DEFEAT',800,196,42,phase==='victory'?'#f7dd9f':'#f29ba4','900','center');
 rect(310,220,980,455,'rgba(13,21,38,.98)','#d8c38f',20);
 text(phase==='victory'?'ENEMIES DEFEATED  •  '+totalEnemyDefeats+' / '+wavePlan.length+' WAVES':'ALLIES DEFEATED',370,310,23,'#edf2f7','750');
 text('TURNS  '+turn,370,356,18,'#a9bcce','600');
 text('PARTY  '+party.length+' / '+MAX_PARTY_SIZE,370,390,18,'#a9bcce','600');
 addButton(430,532,220,90,'restart','REPLAY','');
 addButton(690,532,220,90,'change-team','PARTY','');
 addButton(950,532,220,90,'main-menu','MAIN MENU','');
}
function drawSetup(){
 rect(0,0,W,H,'rgba(4,8,20,.77)');
 rect(180,74,1240,760,'rgba(13,20,39,.98)','#ccb88e',20);
 text('STORY BATTLE SETUP',800,54,34,'#ffedd1','850','center');
 addButton(1234,96,160,52,'main-menu','MAIN MENU','');
 text('CURRENT PARTY  '+draft.length+'/'+MAX_PARTY_SIZE,240,197,20,'#bad4e9','800');
 for(let i=0;i<MAX_PARTY_SIZE;i++){
  const x=218+i*285,y=220,w=260,h=142,p=roster(draft[i]);
  rect(x,y,w,h,p?'rgba(38,54,79,.94)':'rgba(21,33,56,.88)',p?'#9eb8d3':'#4c607a',12);
  if(p){
   const portrait=images[({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront'})[p.id]];
   if(portrait?.complete&&portrait.naturalWidth)drawCharacterPortrait(portrait,p.id,x+12,y+24,68);
   text(p.name,x+92,y+63,18,'#f6eefa','800');
   text(p.test?'TEST PLACEHOLDER':'LEVEL '+progressFor(p.id).level,x+92,y+94,13,p.test?'#e5ca99':'#c4d6e5','600');
  }else text('EMPTY',x+w/2,y+78,18,'#8494a9','750','center');
 }
 if(DEV_MODE){
  text('BATTLE TEST OPTIONS',240,430,19,'#bad4e9','800');
  text('WAVES  '+(waveOverride||WAVE_PRESETS[wavePreset]).join(' + '),240,468,16,'#d2ddec','650');
  addButton(240,487,250,54,'toggle-waves','CHANGE WAVES','');
  text('ENEMY ROSTER',240,582,16,'#d2ddec','700');
  for(const [i,mode,label] of [['slime','SLIME'],['wolf','WOLF'],['mixed','MIXED'],['slime-leader','SLIME LEADER'],['slime-monster','SLIME MONSTER']].entries())addButton(240+i*160,600,154,48,'roster-'+mode,label,enemyRosterMode===mode?'SELECTED':'');
  text('HP RECOVERY  •  '+(trainingRecoveryMode==='restore'?'RESTORE':'PRESERVE'),538,468,16,'#d2ddec','650');
  addButton(538,487,470,54,'toggle-recovery','CHANGE HP RECOVERY','');
 }
 addButton(1039,733,313,79,'start','START BATTLE','',validTeam(draft));
}
// Transient hint popovers belong to menus and setup screens. Combat has
// dedicated turn, targeting, and action-resolution cues; overlaying another
// message on the battlefield obscures character cards and action effects.
function drawHint(t){if(hint&&t-hintAt<2300&&['startup','menu','partySetup','loadout','inventory','challenges','settings','store','setup'].includes(phase)){rect(474,393,652,76,'rgba(15,21,39,.98)','#e6b98a',12);text(hint,800,431,20,'#fff4e8','700','center')}}
function loop(t){choiceRects=[];ctx.clearRect(0,0,W,H);if(phase==='startup'){drawStartupMenu()}else if(phase==='menu'){drawMainMenu()}else if(phase==='partySetup'){drawPartySetup()}else if(phase==='loadout'){drawLoadout()}else if(phase==='inventory'){drawItemInventory()}else if(phase==='challenges'){drawChallenges()}else if(phase==='settings'){drawSettings()}else if(phase==='store'){drawStore()}else if(phase!=='setup'){
  drawCameraStage(t);drawFx(t);drawHud(t)
 }else{drawCameraStage(t);drawSetup()}drawHint(t);requestAnimationFrame(loop)}
function choose(x,y){for(let i=choiceRects.length-1;i>=0;i--){const b=choiceRects[i];if(x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)continue;if(!b.enabled){say('Action not currently available.');return}const cmd=b.action;if(cmd.startsWith('roster-')){if(DEV_MODE)setEnemyRoster(cmd.slice(7));return}if(cmd.startsWith('loadout:')){handleLoadoutAction(cmd.slice(8));return}if(cmd.startsWith('store:')){handleStoreAction(cmd);return}if(cmd.startsWith('add:')){addUnit(cmd.slice(4));return}if(cmd.startsWith('remove:')){removeUnit(Number(cmd.slice(7)));return}if(cmd==='dev-panel-toggle'&&DEV_MODE){devPanelOpen=!devPanelOpen;return}if(cmd==='cancel-target'){cancelTargetSelection();return}if(cmd.startsWith('enemy-target:')){setEnemyTarget(cmd.slice(13));return}if(cmd.startsWith('camera-select:')){if(cameraPreview==='party'&&(phase==='player'||pendingTargetAction?.targetSide==='ally')){const id=cmd.slice(14),p=party.find(p=>p.id===id);if(pendingTargetAction?.targetSide==='ally'&&pendingTargetAction.targetScope==='all'){if(!p||p.hp<=0){say('Choose a living party member to confirm the team skill.');return}const pending=pendingTargetAction,actor=party.find(x=>x.id===pending.actorId);pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;return executeCombatAction(actor,pending.action)}if(pendingTargetAction?.targetSide==='ally'){if(!p||p.hp<=0){say('Tune and Dawn’s Ultimate need a living ally.');return}const pending=pendingTargetAction,actor=party.find(x=>x.id===pending.actorId);pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;if(pending.action==='ultimate')return queueUltimate(pending.actorId,id);return executeCombatAction(actor,pending.action,null,id)}if(supportDemo&&!eligibleAllyTarget(p,supportDemo)){say('Not eligible for this support test.');return}selectedAllyId=id;say((supportDemo?'TARGET TEST: ':'CAMERA TEST: ')+(p?.name||id)+' selected.')}return}if(cmd.startsWith('mode:')){if(DEV_MODE)setTargetingMode(cmd.slice(5));return}if(cmd.startsWith('queue-ult:')){beginTargetSelection('ultimate',cmd.slice(10));return}if(cmd.startsWith('charge-ult:')){if(DEV_MODE)chargeUltimateForTest(cmd.slice(11));return}
 switch(cmd){case 'startup-start':phase='menu';hint='';break;case 'startup-load':requestSaveFileLoad();break;case 'toggle-game-mode':toggleGameMode();break;case 'open-inventory':phase='inventory';hint='';break;case 'open-challenges':phase='challenges';hint='';break;case 'open-settings':phase='settings';hint='';break;case 'open-store':phase='store';lastStoreNotice='';break;case 'save-progress':saveProgressFile();break;case 'open-story':enterSelection();break;case 'open-party':enterPartySetup();break;case 'open-loadout':enterLoadout();break;case 'save-party':saveParty();break;case 'main-menu':enterMainMenu();break;case 'toggle-fullscreen':toggleFullscreen();break;case 'support-heal':if(DEV_MODE)startSupportDemo('heal');break;case 'support-revive':if(DEV_MODE)startSupportDemo('revive');break;case 'confirm-support':if(DEV_MODE)confirmSupportDemo();break;case 'cancel-support':if(DEV_MODE)cancelSupportDemo();break;case 'camera-party':if(DEV_MODE&&phase==='player'&&!paused){cameraPreview=cameraPreview==='party'?null:'party';supportDemo=null;selectedAllyId=activeId}break;case 'camera-target':if(DEV_MODE&&phase==='player'&&!paused){cameraPreview=cameraPreview==='target'?null:'target';selectedAllyId=null;if(cameraPreview==='target')say('Tap an automaton to set the target.')}break;case 'reset-draft':draft=loadTeam();break;case 'toggle-waves':if(DEV_MODE)toggleWavePreset();break;case 'toggle-recovery':if(DEV_MODE)setTrainingRecoveryMode(trainingRecoveryMode==='restore'?'preserve':'restore');break;case 'start':startBattle();break;case 'restart':replay();break;case 'change-team':enterPartySetup();break;case 'forced-select':enterPartySetup();break;case 'pause':if(phase!=='player'&&!paused){say('Pause is available on your turn.');return}paused=!paused;break;case 'unpause':paused=false;break;case 'test-ko':if(DEV_MODE)testKO();break;case 'test-revive':if(DEV_MODE)testRevive();break;case 'skill':play('skill');break;case 'cap-test':if(DEV_MODE)cycleSpCapTest();break;case 'hud-status-test':if(DEV_MODE)toggleHudStatusDemo();break;case 'f05-advance':if(DEV_MODE)addActionAdvance(activeId,25);break;case 'f05-delay':if(DEV_MODE)addActionDelay(activeId,25);break;case 'f05-speed':if(DEV_MODE)setSpeedMultiplierForTest(activeId,(speedModifiers[activeId]||1)>=1.3?1:1.3);break;case 'f05-summon-independent':if(DEV_MODE)queueSummonForTest('independent');break;case 'f05-summon-controlled':if(DEV_MODE)queueSummonForTest('controlled');break;
 case 'progress-test-level':{if(DEV_MODE){const a=active(),p=a&&progressFor(a.id);if(a&&p){const cost=Math.max(1,requiredExp(a.level)-p.exp),result=testGrantExp(a.id,cost);say(result?`TEST ONLY: level ${result.level}, ${cost} EXP injected.`:'Ascension required or level cap reached.');}}break}
 case 'progress-test-ascend':{if(DEV_MODE){const a=active();if(a)say(testAscend(a.id)?`TEST ONLY: level ${a.level} ascension unlocked (no materials).`:'Not at a locked ascension gate.');}break}
 case 'hp-test-flat':{if(DEV_MODE){const a=active();if(a)setHpBonusForTest(a.id,'debug-flat','flat',(a.hpFlatModifiers['debug-flat']||0)+20);}break}
 case 'hp-test-percent':{if(DEV_MODE){const a=active();if(a)setHpBonusForTest(a.id,'debug-percent','percent',(a.hpPercentModifiers['debug-percent']||0)+.2);}break}default:zeroSkillArmed=false;play(cmd)}return}}
const screenElement=document.getElementById('screen');
function isFullscreen(){return document.fullscreenElement===screenElement||document.webkitFullscreenElement===screenElement}
function isStandaloneApp(){return navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches||window.matchMedia?.('(display-mode: fullscreen)').matches}
function isIPhoneBrowser(){return /iPhone|iPod/i.test(navigator.userAgent)&&!isStandaloneApp()}
async function toggleFullscreen(){
 try{
  if(isStandaloneApp()){say('Two-Tone is already open as a Home Screen app.');return}
  if(isFullscreen()){if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();return}
  if(screenElement.requestFullscreen)await screenElement.requestFullscreen({navigationUI:'hide'});
  else if(screenElement.webkitRequestFullscreen)screenElement.webkitRequestFullscreen();
  else if(isIPhoneBrowser())say('On iPhone: Share → Add to Home Screen, then open Two-Tone from its icon.');
  else say('This browser blocks page fullscreen. Try opening Two-Tone as a Home Screen app.');
 }catch(error){if(isIPhoneBrowser())say('On iPhone: Share → Add to Home Screen, then open Two-Tone from its icon.');else say('Fullscreen was blocked by the browser. Try opening Two-Tone as a Home Screen app.')}
}
const saveFileInput=document.getElementById('save-file-picker');saveFileInput.addEventListener('change',async()=>{const file=saveFileInput.files?.[0];if(!file)return;if(file.size>2_000_000){say('This save file is too large to load.');saveFileInput.value='';return}try{importSaveFile(JSON.parse(await file.text()))}catch(error){say('This file could not be read as a Two-Tone save.')}finally{saveFileInput.value=''}});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();choose((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingTargetAction)cancelTargetSelection();if(e.key==='1')play('basic');if(e.key==='2')play('skill');if(e.key==='3')play('ultimate');if(DEV_MODE&&e.key.toLowerCase()==='m'&&phase==='player')cycleSpCapTest();if(DEV_MODE&&['q','w','e','f'].includes(e.key.toLowerCase())&&phase==='player')setTargetingMode(({q:'single',w:'blast',e:'aoe',f:'five-hit'})[e.key.toLowerCase()]);if(DEV_MODE&&e.key.toLowerCase()==='v'&&phase==='player'){cameraPreview=cameraPreview==='party'?null:'party';selectedAllyId=activeId}if(DEV_MODE&&e.key.toLowerCase()==='t'&&phase==='player')cameraPreview=cameraPreview==='target'?null:'target';if(DEV_MODE&&e.key.toLowerCase()==='r'&&phase!=='setup')replay()});window.addEventListener('contextmenu',e=>e.preventDefault());
// Read-only instrumentation and explicitly labeled testing helpers for verification.
if(DEV_MODE){
window.twoToneStatus=()=>({phase,paused,turn,battleAreaId:currentBattleAreaId,enemyRosterMode,plannedEnemyArchetypes:wavePlan.map(wave=>wave.map(enemy=>enemy.archetypeId)),devPanelOpen,targetingMode,pendingTargetAction,zeroSkillArmed,previewTargetMode:previewTargetMode(),supportDemo,attackInProgress,pendingVacancies:[...pendingVacancies],lastAttack:lastAttack?JSON.parse(JSON.stringify(lastAttack)):null,supportTestHistory:supportTestHistory.slice(),previewTargetIds:chooseAttackTargets(previewTargetMode()).map(e=>e.id),enemyCountTotal:wavePlan.reduce((n,w)=>n+w.length,0),selectedEnemyId,actingEnemyId,enemies:enemies.map(e=>({id:e.id,category:e.category,healthBars:e.healthBars,hp:e.hp,maxHp:e.maxHp,barrier:e.barrier,maxBarrier:e.maxBarrier,brokenTurns:e.brokenTurns,bleedStacks:e.bleedStacks?.length||0,bleedMaxStacks:e.bleedMaxStacks||5,x:e.x,y:e.y,slot:e.slot,wave:e.wave,order:e.order,alive:e.hp>0})),wave:{number:waveIndex+1,total:wavePlan.length,sizes:wavePlan.map(w=>w.length),active:enemies.length,reserve:waveQueue.length,defeated:waveKills,totalDefeated:totalEnemyDefeats,cleared:encounterCleared,spawnHistory:spawnHistory.slice()},gauges:{...gauges},party:party.map(p=>({id:p.id,hp:p.hp,maxHp:p.maxHp,energy:p.energy,energyReserved:p.energyReserved||0,availableEnergy:availableEnergy(p),slot:party.indexOf(p)+1,test:p.test})),draft:[...draft],activeId,enemyHp,sp,spMax:effectiveSpMax(),spCapModifiers:{...spCapModifiers},ultimateQueue:ultimateQueue.map(q=>({...q})),ultimateExecuting,ultimateResumePending:!!ultimateResume,ultimateHistory:ultimateHistory.slice(),order:getOrder(5),summonSlotsUsed:summons.filter(s=>!s.pendingCreation).length,summons:summons.map(s=>({...s})),summonHistory:summonHistory.slice(),turnTimeline:turnTimeline.snapshot(),speedModifiers:{...speedModifiers},visibleAllyIds:cameraShot()==='party'?party.map(p=>p.id):[cameraShot()==='enemy-impact'?fx?.target:(activeId||alive()[0]?.id)].filter(Boolean),visibleEnemyIds:cameraShot()==='party'?[]:combatEnemies().map(e=>e.id),camera:{shot:cameraShot(),world:shotWorld(cameraShot()),panX:camera.currentX??0,transition:camera.progress,preview:cameraPreview,selectedAllyId,parallaxRates:[.04,.13,.32,.72,1.18],hudDrawnAfterScene:true},stagePositions:party.map(p=>({id:p.id,position:cameraAllyPosition(p.id,cameraShot()==='party'?'party':'command')}))});
window.twoToneUi=()=>({hudPortraits:party.map(p=>({id:p.id,scale:(phase==='player'&&activeId===p.id&&p.hp>0)?1:.9,energyFill:isUltPending(p.id)?0:Math.max(0,Math.min(1,availableEnergy(p)/ultimateEnergyCost(p))),statusCount:hudStatusList(p).length})),version:'v0.0.43',debugOpen:devPanelOpen,buttons:choiceRects.map(b=>({...b}))});
window.twoToneProgress=()=>({playerRank,rankProgressionImplemented:false,maxLevel:characterLevelCap(),absoluteMaxLevel:CHARACTER_MAX_LEVEL,ascensionGates:[...ASCENSION_GATES],recoveryMode:trainingRecoveryMode,
 characters:ROSTER.map(r=>({id:r.id,level:progressFor(r.id).level,levelCap:characterLevelCap(),exp:progressFor(r.id).exp,ascended:[...progressFor(r.id).ascended],requiredExp:progressFor(r.id).level<characterLevelCap()?requiredExp(progressFor(r.id).level):0,baseHpTestOnly:r.hp})),
 unitHP:party.map(p=>({id:p.id,level:p.level,baseHpTestOnly:p.baseHp,maxHp:p.maxHp,currentHp:p.hp,flat:{...p.hpFlatModifiers},percent:{...p.hpPercentModifiers}})),
 unitPhysicalAttack:party.map(p=>({id:p.id,level:p.level,basePhysicalAttack:p.basePhysicalAttack,physicalAttack:calculatePhysicalAttack(p),flat:{...p.physicalAttackFlatModifiers},percent:{...p.physicalAttackPercentModifiers}})),
 unitMagicalAttack:party.map(p=>({id:p.id,level:p.level,baseMagicalAttack:p.baseMagicalAttack,magicalAttack:calculateMagicalAttack(p),flat:{...p.magicalAttackFlatModifiers},percent:{...p.magicalAttackPercentModifiers}})),
 unitPhysicalDefense:party.map(p=>({id:p.id,level:p.level,basePhysicalDefense:p.basePhysicalDefense,physicalDefense:calculatePhysicalDefense(p),flat:{...p.physicalDefenseFlatModifiers},percent:{...p.physicalDefensePercentModifiers}})),
 unitMagicalDefense:party.map(p=>({id:p.id,level:p.level,baseMagicalDefense:p.baseMagicalDefense,magicalDefense:calculateMagicalDefense(p),flat:{...p.magicalDefenseFlatModifiers},percent:{...p.magicalDefensePercentModifiers}})),
 unitTrueDamageBasis:party.map(p=>({id:p.id,trueAttack:calculateTrueAttack(p),trueDefense:calculateTrueDefense(p),selfTrueDamageReduction:calculateTrueDamageReduction(p,p)}))});
window.twoToneTest={testGrantExp,testAscend,setPlayerRankForTest,setHpBonusForTest,calculateMaxHp,calculateLevelScaledStat,calculatePhysicalAttack,calculateMagicalAttack,calculatePhysicalDefense,calculateMagicalDefense,calculateTrueAttack,calculateTrueDefense,calculateTrueDamageReduction,calculateDamageAfterDefense,calculatePhysicalDamageAfterDefense,calculateMagicalDamageAfterDefense,calculateTrueDamageAfterDefense,calculateTypedActionDamage,requiredExp,setTrainingRecoveryMode,roundHp,addActionAdvance,addActionDelay,setSpeedMultiplierForTest,queueSummonForTest,turnTimelineSnapshot:()=>turnTimeline.snapshot(),queueUltimate,chargeUltimateForTest,toggleHudStatusDemo,setHudStatusesForTest:(id,items)=>{const p=party.find(p=>p.id===id);if(!p||!Array.isArray(items)||items.length>80)return false;p.hudStatuses=items.map(e=>({kind:e.kind==='debuff'?'debuff':'buff',icon:String(e.icon||'✦').slice(0,2),turns:e.turns===null?null:(Number.isInteger(e.turns)&&e.turns>=0?e.turns:null)}));return true;},setSpCapTestSource,cycleSpCapTest,canQueueUltimate,debugKOForTest:(id)=>{if(['setup','intro','victory','defeat'].includes(phase))return false;const p=party.find(p=>p.id===id);if(!p||p.hp<=0)return false;p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();return true},startBattle,addUnit,removeUnit,enterSelection,enterPartySetup,saveParty,testKO,testRevive,play,replay,zeroSkillControl,setTargetingMode,startSupportDemo,confirmSupportDemo,cancelSupportDemo,eligibleAllyTarget:(id,kind)=>eligibleAllyTarget(party.find(p=>p.id===id),kind),setEnemyHpForTest:(id,hp)=>{if(phase!=='player'||attackInProgress)return false;const e=liveEnemies().find(e=>e.id===id);if(!e||!Number.isFinite(hp)||hp<1||hp>e.maxHp)return false;e.hp=hp;syncEnemyHp();return true},applyBleedForTest:(enemyId,sourceId,stacks=1,maxStacks=5)=>{const enemy=liveEnemies().find(unit=>unit.id===enemyId),source=party.find(unit=>unit.id===sourceId);return enemy&&source?applyBleed(enemy,source,stacks,maxStacks):false},setEnemyTarget,setWavePlanForTest,toggleWavePreset,setEnemyRoster,debugDefeatEnemy:(id)=>{const e=liveEnemies().find(e=>e.id===id);if(!e||phase==='setup'||phase==='victory'||phase==='defeat')return false;e.hp=0;resolveEnemyDefeat(e);return true;},selectEnemy:(id)=>setEnemyTarget(id),setCameraPreview:(view)=>{if(phase==='player'){cameraPreview=view;selectedAllyId=activeId}},cameraStatus:()=>cameraShot()};
window.twoToneTest.grantWeaponXp=grantWeaponXp;window.twoToneTest.weaponLevelCap=weaponLevelCap;window.twoToneTest.weaponPotentialMultiplier=weaponPotentialMultiplier;
window.zeroBasicAnimationDebug=()=>({durationMs:SOUL_BASIC_MS,elapsed:fx?.kind==='basic'&&fx.actor==='soul'?Math.max(0,performance.now()-fx.at):null,active:soulBasicStage(performance.now())!==null,assets:['soul','soulBasicWindup','soulBasicSlash'].map(id=>({id,loaded:!!images[id]?.complete&&!!images[id]?.naturalWidth}))});
window.twoToneTest.applyTauntForTest=(targetId,sourceId,rate,turns)=>{const target=party.find(unit=>unit.id===targetId)||enemies.find(unit=>unit.id===targetId),source=party.find(unit=>unit.id===sourceId)||enemies.find(unit=>unit.id===sourceId);return target&&source?applyTaunt(target,source,rate,turns):false};
window.twoToneTauntStatus=()=>[...party,...enemies].map(unit=>({id:unit.id,activeRate:tauntRateOf(unit),effects:(unit.tauntEffects||[]).map(effect=>({...effect}))}));
}
requestAnimationFrame(loop);
