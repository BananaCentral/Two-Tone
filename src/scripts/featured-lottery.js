'use strict';

// Client cache and presentation for the featured Store lotteries.
(function attachFeaturedLottery(global) {
 const STORAGE_KEY='two-tone-featured-lottery-v1';
 const RULES=Object.freeze({ticketCost:100,rotationTimeZone:'America/New_York'});
 const newTrack=()=>({sinceMythic:0,sinceRare:0,heightened:false,target:null});
 function freshState(){return {version:1,character:newTrack(),weapon:newTrack(),rotationStart:null,rotationIndex:0,seenCharacters:[],currentFeatured:[]}}
 function validTrack(value){return value&&Number.isInteger(value.sinceMythic)&&value.sinceMythic>=0&&Number.isInteger(value.sinceRare)&&value.sinceRare>=0&&typeof value.heightened==='boolean'&&(value.target===null||typeof value.target==='string')}
 function load(){try{const value=JSON.parse(global.localStorage.getItem(STORAGE_KEY)||'null');if(value?.version===1&&validTrack(value.character)&&validTrack(value.weapon)&&Array.isArray(value.seenCharacters))return value}catch(error){}return freshState()}
 let state=load();
 function save(){try{global.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch(error){return false}}
 function hydrate(value){if(value?.version!==1||!validTrack(value.character)||!validTrack(value.weapon)||!Array.isArray(value.seenCharacters))return false;state=structuredClone(value);save();return true}
 function rotate(featuredCharacterIds,now=new Date()){
  if(!Array.isArray(featuredCharacterIds)||!featuredCharacterIds.length)return null;
  // Rotation is weekly from Monday 00:00 America/New_York; Intl handles DST.
  const localParts=new Intl.DateTimeFormat('en-US',{timeZone:RULES.rotationTimeZone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=key=>localParts.find(item=>item.type===key)?.value;
  const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday'));
  const localDate=new Date(Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day'))));
  localDate.setUTCDate(localDate.getUTCDate()-((day+6)%7));
  const weekKey=localDate.toISOString().slice(0,10);
  if(!Array.isArray(state.currentFeatured))state.currentFeatured=[];
  const bannerCount=Math.min(3,featuredCharacterIds.length);let changed=false;
  if(state.rotationStart!==weekKey){
   changed=true;
   state.rotationStart=weekKey;state.character.target=null;state.weapon.target=null;
   state.seenCharacters=state.seenCharacters.filter(id=>featuredCharacterIds.includes(id));
   state.currentFeatured=featuredCharacterIds.filter(id=>!state.seenCharacters.includes(id)).slice(0,bannerCount);
   for(const id of state.currentFeatured)if(!state.seenCharacters.includes(id))state.seenCharacters.push(id);
   if(state.seenCharacters.length>=featuredCharacterIds.length){
    state.seenCharacters=[];state.rotationIndex++;
   }
  }
  state.seenCharacters=state.seenCharacters.filter((id,index,all)=>featuredCharacterIds.includes(id)&&all.indexOf(id)===index);
  state.currentFeatured=state.currentFeatured.filter((id,index,all)=>featuredCharacterIds.includes(id)&&all.indexOf(id)===index);
  if(!changed)for(const id of state.currentFeatured)if(!state.seenCharacters.includes(id)){state.seenCharacters.push(id);changed=true}
  if(state.currentFeatured.length<bannerCount){
   if(state.seenCharacters.length>=featuredCharacterIds.length)state.seenCharacters=[];
   while(state.currentFeatured.length<bannerCount){
    const next=featuredCharacterIds.find(id=>!state.currentFeatured.includes(id)&&!state.seenCharacters.includes(id));
    if(!next){if(state.seenCharacters.length>=featuredCharacterIds.length){state.seenCharacters=[];continue}break}
    state.currentFeatured.push(next);state.seenCharacters.push(next);changed=true;
   }
  }
  if(changed)save();
  const featured=state.currentFeatured.filter(id=>featuredCharacterIds.includes(id));
  return {featuredCharacters:featured,featuredWeapons:featured.map(id=>`premium-${id}`),targetRequired:!state.character.target||!featured.includes(state.character.target)||!state.weapon.target||!featured.map(id=>`premium-${id}`).includes(state.weapon.target)}
 }
 const api={RULES,rotate,hydrate,getState:()=>structuredClone(state)};
 global.FeaturedLottery=Object.freeze(api);
})(globalThis);
