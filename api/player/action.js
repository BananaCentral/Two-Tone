import { claimSoulGift } from "../../src/scripts/permanent-event.mjs";
import { commonStoreReward } from "../../lib/store-rewards.js";
import { claimLoginEvent, easternDayKey } from "../../src/scripts/login-event.mjs";
import { awardCampaignClear, getCampaignEntry, isCampaignEntryUnlocked } from "../../src/scripts/campaign.mjs";
import { randomInt } from "node:crypto";
import { auth } from "../../lib/auth.js";
import { CHARACTER_IDS_PUBLIC, withLockedProfile } from "../../lib/player-profile.js";

const RULES={ticketCost:100,mythic:.01,heightenedMythic:.02,rare:.10,featured:.75,characterPity:100,heightenedCharacterPity:50,weaponPity:50,heightenedWeaponPity:25,rarePity:10};
const ASCENSION_GATES=[10,20,30,40],RUNE_SETS=["radiant-moon","eternal-sun","celestial-star","dark-matter","clear-skies","infinite-space","recycle","amplify","united"],RUNE_STATS=["hp","attack","physicalDefense","magicalDefense","speed"];
const itemReward=(id,name,quantity)=>({id,name,inventoryItem:id,quantity});
function lotteryIds(type,state){return type==="character"?state.lottery.currentFeatured:state.lottery.currentFeatured.map(id=>`premium-${id}`)}
function trackFor(state,type){return type==="character"?state.lottery.character:state.lottery.weapon}
function roll(){return randomInt(1_000_000)/1_000_000}
function pick(items){return items[randomInt(items.length)]}
function buildPools(type,state){
 const ids=CHARACTER_IDS_PUBLIC;
 const target=trackFor(state,type).target;
 const map=id=>type==="character"?{id,name:id.toUpperCase()}:{id:`premium-${id}`,name:id==="soul"?"Soulbound":id==="zero"?"Nightshade":`${id.toUpperCase()} Premium Weapon`};
 return {
  featured:ids.filter(id=>map(id).id===target).map(map),
  offFeature:ids.filter(id=>map(id).id!==target).map(map),
  rare:[itemReward("core","Core",1),itemReward("gem","Gem",1)],
 };
}
function addInventory(state,itemId,quantity){
 const match=/^(bottle|book):(small|medium|large)$/.exec(itemId);
 if(match){state.itemInventory[match[1]==="bottle"?"bottles":"books"][match[2]]+=quantity;return}
 if(itemId==="core"){state.itemInventory.cores+=quantity;return}
 if(itemId==="gem")state.itemInventory.gems+=quantity;
}
function levelCap(state){return Math.ceil(state.playerRank/10)*10}
function nextExp(level){return level>=50?0:level*(10*(1+Math.floor(level/5)))}
function settleProgress(record,cap,levelKey="level",expKey="exp",ascendedKey="ascended"){
 while(record[levelKey]<cap){
  if(ASCENSION_GATES.includes(record[levelKey])&&!record[ascendedKey].includes(record[levelKey]))break;
  const needed=nextExp(record[levelKey]);if(record[expKey]<needed)break;
  record[expKey]-=needed;record[levelKey]++;
 }
 if(record[levelKey]>=cap)record[expKey]=0;
}
function useXpItem(state,body){
 const {itemType,id,size,weaponType}=body;
 if(!["bottle","book"].includes(itemType)||!CHARACTER_IDS_PUBLIC.includes(id)||!["small","medium","large"].includes(size))return "invalid_xp_item";
 if(!state.ownedCharacters.includes(id))return "character_not_owned";
 const group=itemType==="bottle"?"bottles":"books",inventory=state.itemInventory[group];
 if(inventory[size]<1)return "item_unavailable";
 const amount={small:10,medium:100,large:1000}[size],cap=levelCap(state),loadout=state.loadouts[id];
 if(itemType==="bottle"){
  const progress=state.characterProgress[id];if(progress.level>=cap)return "level_cap";
  inventory[size]--;progress.exp+=amount;settleProgress(progress,cap);
 }else{
  if(!["standard","premium"].includes(weaponType))return "invalid_weapon";
  const weapon=loadout.weapon;if(weaponType==="premium"&&!weapon.premiumOwned)return "weapon_not_owned";
  const levelKey=weaponType+"Level",expKey=weaponType+"Exp",ascendedKey=weaponType+"Ascended";
  if(weapon[levelKey]>=cap)return "level_cap";
  inventory[size]--;weapon[expKey]+=amount;settleProgress(weapon,cap,levelKey,expKey,ascendedKey);
 }
 return null;
}
function ascend(state,body){
 const {kind,id,weaponType}=body;
 if(!CHARACTER_IDS_PUBLIC.includes(id)||!state.ownedCharacters.includes(id))return "character_not_owned";
 if(state.itemInventory.gems<1)return "gem_required";
 if(kind==="character"){
  const progress=state.characterProgress[id];
  if(!ASCENSION_GATES.includes(progress.level)||progress.ascended.includes(progress.level))return "ascension_unavailable";
  progress.ascended.push(progress.level);settleProgress(progress,levelCap(state));
 }else if(kind==="weapon"&&["standard","premium"].includes(weaponType)){
  const weapon=state.loadouts[id].weapon;
  if(weaponType==="premium"&&!weapon.premiumOwned)return "weapon_not_owned";
  const levelKey=weaponType+"Level",ascendedKey=weaponType+"Ascended";
  if(!ASCENSION_GATES.includes(weapon[levelKey])||weapon[ascendedKey].includes(weapon[levelKey]))return "ascension_unavailable";
  weapon[ascendedKey].push(weapon[levelKey]);settleProgress(weapon,levelCap(state),levelKey,weaponType+"Exp",ascendedKey);
 }else return "invalid_ascension";
 state.itemInventory.gems--;return null;
}
function upgradeCore(state,body){
 const {kind,id,key,index}=body;
 if(!CHARACTER_IDS_PUBLIC.includes(id)||!state.ownedCharacters.includes(id))return "character_not_owned";
 if(state.itemInventory.cores<1)return "core_required";
 const record=state.loadouts[id];
 if(kind==="celestial"&&["passive","basic","skill","ultimate"].includes(key)){
  if(record.celestials[key]>=10)return "level_cap";record.celestials[key]++;
 }else if(kind==="rune"&&Number.isInteger(index)&&index>=0&&index<4){
  const rune=record.runes[index];if(!rune||rune.level>=5)return "upgrade_unavailable";rune.level++;
 }else return "invalid_upgrade";
 state.itemInventory.cores--;return null;
}
function awardMythic(state,type,reward){
 if(type==="character"){
  const id=reward.id;
  if(!state.ownedCharacters.includes(id))state.ownedCharacters.push(id);
  else state.loadouts[id].characterDuplicates=Math.min(4,state.loadouts[id].characterDuplicates+1);
  return state.ownedCharacters.includes(id)&&state.loadouts[id].characterDuplicates?`${reward.name} duplicate`:`${reward.name} acquired`;
 }
 const id=reward.id.replace(/^premium-/,""),weapon=state.loadouts[id].weapon;
 if(weapon.premiumOwned)weapon.premiumPotential=Math.min(5,weapon.premiumPotential+1);
 else weapon.premiumOwned=true;
 return `${reward.name}${weapon.premiumPotential>1?` • Premium Potential ${weapon.premiumPotential}`:" • Premium acquired"}`;
}
function drawOne(state,type){
 const track=trackFor(state,type),pools=buildPools(type,state);
 const limit=type==="character"?(track.heightened?RULES.heightenedCharacterPity:RULES.characterPity):(track.heightened?RULES.heightenedWeaponPity:RULES.weaponPity);
 const mythicDue=track.sinceMythic+1>=limit,rareDue=track.sinceRare+1>=RULES.rarePity;
 track.sinceMythic++;track.sinceRare++;
 const mythicChance=track.heightened?RULES.heightenedMythic:RULES.mythic;
 const tierRoll=roll();
 const tier=mythicDue?"mythic":rareDue?"rare":tierRoll<mythicChance?"mythic":tierRoll<mythicChance+RULES.rare?"rare":"common";
 let reward,featured=false,result;
 if(tier==="mythic"){
  track.sinceMythic=0;
  featured=roll()<RULES.featured;
  reward=featured?pools.featured[0]:pick(pools.offFeature);
  if(!reward)throw new Error("empty_mythic_pool");
  track.heightened=!featured;
  result=awardMythic(state,type,reward);
 }else if(tier==="rare"){
  track.sinceRare=0;reward=pick(pools.rare);addInventory(state,reward.inventoryItem,reward.quantity);result=`${reward.quantity} ${reward.name}`;
 }else{
  reward=commonStoreReward(type,roll());addInventory(state,reward.inventoryItem,reward.quantity);result=`${reward.quantity} ${reward.name}`;
 }
 return {tier,reward,featured,result};
}
function parseBody(req){
 if(req.body&&typeof req.body==="object")return req.body;
 try{return JSON.parse(req.body||"{}")}catch{return null}
}

export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"method_not_allowed"})}
 try{
  const origin=req.headers.origin;
  const trusted=new Set([process.env.BETTER_AUTH_URL,...(process.env.BETTER_AUTH_TRUSTED_ORIGINS||"").split(",")].map(value=>value?.trim()).filter(Boolean).map(value=>new URL(value).origin));
  if(!origin||!trusted.has(new URL(origin).origin))return res.status(403).json({error:"untrusted_origin"});
  const session=await auth.api.getSession({headers:req.headers});
  if(!session?.user?.id)return res.status(401).json({error:"authentication_required"});
  const body=parseBody(req);
  if(!body||typeof body.action!=="string")return res.status(400).json({error:"invalid_request"});
  if(typeof body.requestId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))return res.status(400).json({error:"invalid_request_id"});
  const result=await withLockedProfile(session.user.id,async (state,client)=>{
   const prior=await client.query("SELECT action_name,result FROM two_tone_player_action_receipts WHERE user_id=$1 AND request_id=$2",[session.user.id,body.requestId]);
   if(prior.rows[0]){
    if(prior.rows[0].action_name!==body.action)return {ok:false,status:409,error:"idempotency_conflict"};
    return {ok:true,rewards:prior.rows[0].result.rewards||[],duplicate:true};
   }
   const receipt=(rewards=[])=>({requestId:body.requestId,action:body.action,result:{rewards}});
   if(body.action==="complete-campaign-entry"){
    if(typeof body.entryId!=="string")return {ok:false,status:400,error:"invalid_campaign_entry"};
    const entry=getCampaignEntry(body.entryId);
    if(!entry)return {ok:false,status:400,error:"invalid_campaign_entry"};
    const previousClears=state.clearedCampaignEntries;
    if(!isCampaignEntryUnlocked(entry,previousClears))return {ok:false,status:409,error:"campaign_entry_locked"};
    const coins=awardCampaignClear(state,body.entryId);
    const rewards=coins>0?[{coins}]:[];
    return {ok:true,save:state.clearedCampaignEntries!==previousClears?state:null,rewards,receipt:receipt(rewards)};
   }
   if(body.action==="claim-soul-gift"){
    const rewards=claimSoulGift(state,addInventory);
    if(!rewards)return {ok:false,status:409,error:"already_claimed"};
    return {ok:true,save:state,rewards,receipt:receipt(rewards)};
   }
   if(body.action==="claim-login-event"){
    const reward=claimLoginEvent(state);
    if(reward.status!=="claimed")return {ok:false,status:409,error:reward.status};
    const rewards=[{coins:reward.coins}];
    return {ok:true,save:state,rewards,receipt:receipt(rewards)};
   }
   if(body.action==="claim-daily"){
    const period=easternDayKey();
    if(state.dailyRewardClaimedPeriod===period)return {ok:false,status:409,error:"already_claimed"};
    state.dailyRewardClaimedPeriod=period;state.coins+=100;
    return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="set-target"){
    const {type,target}=body;
    if(!["character","weapon"].includes(type)||!lotteryIds(type,state).includes(target))return {ok:false,status:409,error:"target_unavailable"};
    trackFor(state,type).target=target;
    return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="draw"){
    const {type,count}=body;
    if(!["character","weapon"].includes(type)||![1,10].includes(count))return {ok:false,status:400,error:"invalid_draw"};
    const track=trackFor(state,type);
    if(!lotteryIds(type,state).includes(track.target))return {ok:false,status:409,error:"target_required"};
    const cost=RULES.ticketCost*count;
    if(!Number.isSafeInteger(state.coins)||state.coins<cost)return {ok:false,status:409,error:"insufficient_coins"};
    const rewards=[];
    for(let i=0;i<count;i++)rewards.push(drawOne(state,type));
    state.coins-=cost;
    return {ok:true,rewards,save:state,receipt:receipt(rewards)};
   }
   if(body.action==="use-xp-item"){
    const error=useXpItem(state,body);if(error)return {ok:false,status:409,error};
    return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="ascend"){
    const error=ascend(state,body);if(error)return {ok:false,status:409,error};
    return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="upgrade-core"){
    const error=upgradeCore(state,body);if(error)return {ok:false,status:409,error};
    return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="set-team"){
    const team=body.team;
    if(!Array.isArray(team)||team.length<1||team.length>4||team.some(id=>!state.ownedCharacters.includes(id))||new Set(team).size!==team.length)return {ok:false,status:409,error:"invalid_team"};
    state.team=team;return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="set-weapon"){
    const {id,type}=body;
    if(!CHARACTER_IDS_PUBLIC.includes(id)||!state.ownedCharacters.includes(id)||!["standard","premium"].includes(type))return {ok:false,status:409,error:"invalid_weapon"};
    if(type==="premium"&&!state.loadouts[id].weapon.premiumOwned)return {ok:false,status:409,error:"weapon_not_owned"};
    state.loadouts[id].weapon.selected=type;return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="equip-rune"){
    const {id,setId,slot}=body;
    if(!CHARACTER_IDS_PUBLIC.includes(id)||!state.ownedCharacters.includes(id)||!RUNE_SETS.includes(setId)||!Number.isInteger(slot)||slot<0||slot>3)return {ok:false,status:409,error:"invalid_rune"};
    const items=state.itemInventory.runes[setId];if(!items?.length)return {ok:false,status:409,error:"rune_unavailable"};
    const record=state.loadouts[id];if(record.runes[slot])state.itemInventory.runes[record.runes[slot].setId].push(record.runes[slot]);
    record.runes[slot]=items.pop();return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="remove-rune"){
    const {id,slot}=body;
    if(!CHARACTER_IDS_PUBLIC.includes(id)||!state.ownedCharacters.includes(id)||!Number.isInteger(slot)||slot<0||slot>3)return {ok:false,status:409,error:"invalid_rune"};
    const record=state.loadouts[id],rune=record.runes[slot];if(!rune)return {ok:false,status:409,error:"rune_unavailable"};
    state.itemInventory.runes[rune.setId].push(rune);record.runes[slot]=null;return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="set-rune-stat"){
    const {id,slot,kind,subIndex,stat}=body;
    if(!CHARACTER_IDS_PUBLIC.includes(id)||!state.ownedCharacters.includes(id)||!Number.isInteger(slot)||slot<0||slot>3||!RUNE_STATS.includes(stat)||!(["main","sub"].includes(kind)))return {ok:false,status:400,error:"invalid_rune_stat"};
    const rune=state.loadouts[id].runes[slot];if(!rune)return {ok:false,status:409,error:"rune_unavailable"};
    rune.legacyAttackBonus=0;
    if(kind==="main"){
     if(stat===rune.main)return {ok:false,status:409,error:"stat_unchanged"};
     const oldMain=rune.main;rune.main=stat;rune.subs=[oldMain,...rune.subs.filter(value=>value!==stat)].slice(0,3);
    }else{
     if(!Number.isInteger(subIndex)||subIndex<0||subIndex>2||stat===rune.main||rune.subs.some((value,index)=>index!==subIndex&&value===stat))return {ok:false,status:409,error:"invalid_rune_stat"};
     rune.subs[subIndex]=stat;
    }
    return {ok:true,save:state,receipt:receipt()};
   }
   if(body.action==="set-vitals"){
    const vitals=body.vitals;
    if(!vitals||typeof vitals!=="object"||Array.isArray(vitals))return {ok:false,status:400,error:"invalid_vitals"};
    const clean={};
    for(const [id,value] of Object.entries(vitals)){
     if(!state.ownedCharacters.includes(id)||!value||!Number.isFinite(value.hp)||!Number.isFinite(value.maxHp)||value.hp<0||value.hp>value.maxHp||value.maxHp<1||value.maxHp>100000)return {ok:false,status:400,error:"invalid_vitals"};
     clean[id]={hp:value.hp,maxHp:value.maxHp};
    }
    state.vitals={...state.vitals,...clean};return {ok:true,save:state,receipt:receipt()};
   }
   return {ok:false,status:400,error:"unknown_action"};
  });
  const status=result.ok?200:result.status||400;
  return res.status(status).json({ok:result.ok,error:result.error,rewards:result.rewards,profile:result.state,revision:result.revision});
 }catch(error){
  console.error("Player action failed",error);
  return res.status(503).json({error:"action_unavailable"});
 }
}
