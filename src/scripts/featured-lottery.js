'use strict';

// Stateful rules engine for featured Store lotteries. Reward pools and the
// wallet are supplied by the game so this module does not invent game content.
(function attachFeaturedLottery(global) {
 const STORAGE_KEY='two-tone-featured-lottery-v1';
 const RULES=Object.freeze({
  ticketCost:100,baseMythicChance:.01,heightenedMythicChance:.02,rareChance:.10,
  featuredMythicChance:.75,characterPity:100,characterHeightenedPity:50,
  weaponPity:50,weaponHeightenedPity:25,rarePity:10,
  rotationTimeZone:'America/New_York',
 });
 const newTrack=()=>({sinceMythic:0,sinceRare:0,heightened:false,target:null});
 function freshState(){return {version:1,character:newTrack(),weapon:newTrack(),rotationStart:null,rotationIndex:0,seenCharacters:[],currentFeatured:[]}}
 function validTrack(value){return value&&Number.isInteger(value.sinceMythic)&&value.sinceMythic>=0&&Number.isInteger(value.sinceRare)&&value.sinceRare>=0&&typeof value.heightened==='boolean'&&(value.target===null||typeof value.target==='string')}
 function load(){try{const value=JSON.parse(global.localStorage.getItem(STORAGE_KEY)||'null');if(value?.version===1&&validTrack(value.character)&&validTrack(value.weapon)&&Array.isArray(value.seenCharacters))return value}catch(error){}return freshState()}
 let state=load();
 function save(){try{global.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch(error){return false}}
 function trackFor(type){if(type==='character')return state.character;if(type==='weapon')return state.weapon;throw new TypeError('Lottery type must be character or weapon.')}
 function setTarget(type,targetId,featuredIds){if(typeof targetId!=='string'||!featuredIds?.includes(targetId))return false;trackFor(type).target=targetId;save();return true}
 function rotate(featuredCharacterIds,now=new Date()){
  if(!Array.isArray(featuredCharacterIds)||!featuredCharacterIds.length)return null;
  const start=new Date(now);start.setUTCHours(0,0,0,0);
  // Rotation is weekly from Monday 00:00 America/New_York; Intl handles DST.
  const localParts=new Intl.DateTimeFormat('en-US',{timeZone:RULES.rotationTimeZone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=key=>localParts.find(item=>item.type===key)?.value;
  const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday'));
  const localDate=new Date(Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day'))));
  localDate.setUTCDate(localDate.getUTCDate()-((day+6)%7));
  const weekKey=localDate.toISOString().slice(0,10);
  if(state.rotationStart!==weekKey){
   state.rotationStart=weekKey;state.character.target=null;state.weapon.target=null;
   if(state.seenCharacters.length>=featuredCharacterIds.length)state.seenCharacters=[];
   state.currentFeatured=featuredCharacterIds.filter(id=>!state.seenCharacters.includes(id)).slice(0,3);
   // Keep the final rotation group short rather than repeating anyone early.
   for(const id of state.currentFeatured)if(!state.seenCharacters.includes(id))state.seenCharacters.push(id);
   if(state.seenCharacters.length>=featuredCharacterIds.length)state.rotationIndex++;
  }
  const featured=state.currentFeatured.filter(id=>featuredCharacterIds.includes(id));
  return {featuredCharacters:featured,featuredWeapons:featured.map(id=>`premium-${id}`),targetRequired:!state.character.target||!featured.includes(state.character.target)||!state.weapon.target||!featured.map(id=>`premium-${id}`).includes(state.weapon.target)}
 }
 function choose(pool){if(!Array.isArray(pool)||!pool.length)throw new Error('The selected reward pool is empty.');return pool[Math.floor(Math.random()*pool.length)]}
 function draw({type,wallet,pools}){
  const track=trackFor(type),featuredPool=pools?.featured||[],offFeaturePool=pools?.offFeature||[];
  const rarePool=pools?.rare||[{id:'core',name:'Core',inventoryItem:'core',quantity:1},{id:'gem',name:'Gem',inventoryItem:'gem',quantity:1}];
  const commonPool=pools?.common||[type==='character'?{id:'large-enchanted-bottles',name:'Large Enchanted Bottles',inventoryItem:'bottle:large',quantity:5}:{id:'large-experience-books',name:'Large Experience Books',inventoryItem:'book:large',quantity:5}];
  if(!Number.isFinite(wallet)||wallet<RULES.ticketCost)return {ok:false,reason:'insufficient-coins'};
  if(!track.target||!featuredPool.some(item=>item.id===track.target))return {ok:false,reason:'target-required'};
  if(!offFeaturePool.length||!rarePool.length||!commonPool.length)return {ok:false,reason:'reward-pool-empty'};
  const limit=type==='character'?(track.heightened?RULES.characterHeightenedPity:RULES.characterPity):(track.heightened?RULES.weaponHeightenedPity:RULES.weaponPity);
  const mythicDue=track.sinceMythic+1>=limit,rareDue=track.sinceRare+1>=RULES.rarePity;
  track.sinceMythic++;track.sinceRare++;
  let tier;
  if(mythicDue)tier='mythic';else if(rareDue)tier='rare';else{const roll=Math.random();tier=roll<(track.heightened?RULES.heightenedMythicChance:RULES.baseMythicChance)?'mythic':roll<(track.heightened?RULES.heightenedMythicChance:RULES.baseMythicChance)+RULES.rareChance?'rare':'common'}
  let reward,featured=false;
  if(tier==='mythic'){
   track.sinceMythic=0;featured=Math.random()<RULES.featuredMythicChance;
   reward=featured?featuredPool.find(item=>item.id===track.target):choose(offFeaturePool);
   if(!reward)return {ok:false,reason:'reward-pool-empty'};
   if(featured)track.heightened=false;else track.heightened=true;
  }else if(tier==='rare'){
   track.sinceRare=0;reward=choose(rarePool);
  }else reward=choose(commonPool);
  if(!reward)return {ok:false,reason:'reward-pool-empty'};
  if(reward.inventoryItem&&global.TwoToneItems&&!global.TwoToneItems.grant(reward.inventoryItem,reward.quantity||1))return {ok:false,reason:'inventory-grant-failed'};
  save();return {ok:true,type,tier,reward,featured,coinsSpent:RULES.ticketCost,state:structuredClone(state)};
 }
 global.FeaturedLottery=Object.freeze({RULES,draw,setTarget,rotate,getState:()=>structuredClone(state),resetForImport(){state=freshState();save()}});
})(globalThis);
