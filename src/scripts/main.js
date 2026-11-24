import { hasClaimedSoulGift, SOUL_GIFT } from './permanent-event.mjs?v=0.1.31';
import { formatLoginEventCountdown, getLoginEventState, LOGIN_EVENT_REWARDS } from './login-event.mjs';
import { CAMPAIGN_ARCS, FIRST_CAMPAIGN_ENTRY_ID, PROLOGUE_CAMPSITE_BACKGROUND, PROLOGUE_SUNRISE_BACKGROUND, PROLOGUE_RIVERBANK_BACKGROUND, PROLOGUE_VILLAGE_BACKGROUND, STORY_PORTRAITS, getCampaignEntry, isCampaignEntryUnlocked } from './campaign.mjs?v=0.1.36';
import { CHARACTER_COMBAT_DATA, CHARACTER_ROSTER, COMBAT_RESOURCE_STANDARD, ENEMY_ARCHETYPES, ENEMY_COMBAT_DATA, RUNE_COMBAT_RULES, enemyStatsAtLevel, getActiveCharacterUpgradeEffect } from './combat-definitions.mjs';
import { TwoToneBattleEngine, TwoToneTurnTimeline } from './combat-engine-api.mjs';
'use strict';
const sources={prologueVillage:PROLOGUE_VILLAGE_BACKGROUND,prologueRiverbank:PROLOGUE_RIVERBANK_BACKGROUND,prologueSunrise:PROLOGUE_SUNRISE_BACKGROUND,prologueCampsite:PROLOGUE_CAMPSITE_BACKGROUND,arena:'/assets/embedded-image-01.png',area1Background:'/assets/area-1-meadow.png',soul:'/assets/soul-ashblade-battle.webp',soulBattleStandard:'/assets/soul-ashblade-battle.webp',soulBattlePremium:'/assets/soulbound-battle.png',lily:'/assets/lily-artwork.png',lilyFront:'/assets/lily-artwork.png',lilyStandardBattle:'/assets/lily-petal-battle.png',lilySignatureBattle:'/assets/lily-everblossom-battle.png',lilyWeaponStandard:'/assets/lily-petal.png',lilyWeaponSignature:'/assets/lily-everblossom.png',dawnBattle:'/assets/dawn-radiant-pearl-battle.png',dawnPremiumBattle:'/assets/dawn-radiant-diamond-battle.png',dawnFront:'/assets/dawn-artwork.png',dawnWeaponStandard:'/assets/dawn-radiant-pearl.png',dawnWeaponPremium:'/assets/dawn-radiant-diamond.png',loganBattle:'/assets/logan.png',loganBattlePremium:'/assets/logan-bloodmoon-battle.png',loganFront:'/assets/logan-front.png',loganPortrait:'/assets/logan-front.png',loganWeaponStandard:'/assets/logan-crimson-edge.png',loganWeaponPremium:'/assets/logan-bloodmoon.png',cloudFront:'/assets/cloud-artwork.png',cloudWindcallBattle:'/assets/cloud-windcall-battle.png',cloudWindcall:'/assets/cloud-windcall.png',cloudNineBattle:'/assets/cloud-nine-battle.png',cloudNine:'/assets/cloud-nine.png',enemy:'/assets/embedded-image-03.png',slimeBattle:'/assets/slime.webp',goblinBattle:'/assets/goblin.png',bearBattle:'/assets/bear.png',hawkBattle:'/assets/hawk.png',geodeBattle:'/assets/geode.png',wolfBattle:'/assets/wolf.png',wolfArtwork:'/assets/wolf-artwork.png',slimeArtwork:'/assets/slime-artwork.jpg',portrait:'/assets/embedded-image-04.png',soulFront:'/assets/soul-artwork.webp',soulWeaponStandard:'/assets/soul-ashblade.png',soulWeaponPremium:'/assets/soulbound.png',zeroFront:'/assets/zero.png',zeroBattle:'/assets/zero-battle.png',zeroBattlePremium:'/assets/zero-nightshade-battle.png',zeroWeaponStandard:'/assets/zero-silent-edge.png',zeroWeaponPremium:'/assets/zero-nightshade.png',architectureLayer:'/assets/embedded-image-06.png',floorLayer:'/assets/embedded-image-07.png',treeLayer:'/assets/embedded-image-08.png',enchantedBottleSmall:'/assets/enchanted-bottle-small.png',enchantedBottleMedium:'/assets/enchanted-bottle-medium.png',enchantedBottleLarge:'/assets/enchanted-bottle-large.png',enchantedBookSmall:'/assets/enchanted-book-small.png',enchantedBookMedium:'/assets/enchanted-book-medium.png',enchantedBookLarge:'/assets/enchanted-book-large.png',core:'/assets/core.png',gem:'/assets/gem.png',coin:'/assets/coins.png',runeRadiantMoon:'/assets/rune-radiant-moon.png',runeEternalSun:'/assets/rune-eternal-sun.png',runeCelestialStar:'/assets/rune-celestial-star.png',runeDarkMatter:'/assets/rune-dark-matter.png',runeClearSkies:'/assets/rune-clear-skies.png',runeInfiniteSpace:'/assets/rune-infinite-space.png',runeRecycle:'/assets/rune-recycle.png',runeAmplify:'/assets/rune-amplify.png',runeUnited:'/assets/rune-united.png'};
const BATTLE_AREAS=Object.freeze({
 'area-1':Object.freeze({name:'Area 1',background:'area1Background'}),
 'prologue-campsite':Object.freeze({name:'Prologue Campsite',background:'prologueCampsite'}),
 'prologue-campsite-sunrise':Object.freeze({name:'Prologue Campsite at Sunrise',background:'prologueSunrise'}),
 'prologue-riverbank':Object.freeze({name:'Prologue Riverbank',background:'prologueRiverbank'}),
 'prologue-village':Object.freeze({name:'Prologue Village',background:'prologueVillage'})
});
const DEFAULT_BATTLE_AREA_ID='area-1';
let campaignEntry = null;
let storyBeatIndex = 0;
let storyBeatArt;
let prefetchedStoryBeatIndex = -1;
let campaignReward = null;
const RUNE_SET_DEFINITIONS=Object.freeze({
 'radiant-moon':Object.freeze({name:'Radiant Moon',image:'runeRadiantMoon',lines:['DAMAGING SKILL','50% Echo','2-turn cooldown']}),
 'eternal-sun':Object.freeze({name:'Eternal Sun',image:'runeEternalSun',lines:['ULTIMATE COST −20 ENERGY','NEXT ACTION: +20 ENERGY','1-turn cooldown after next action']}),
 'celestial-star':Object.freeze({name:'Celestial Star',image:'runeCelestialStar',lines:['GUARANTEED CRITICAL STRIKE','CRITICAL DAMAGE +25%','2-turn cooldown after critical hit']}),
 'dark-matter':Object.freeze({name:'Dark Matter',image:'runeDarkMatter',lines:['NEXT DAMAGING ATTACK','Ignore both defenses 40%','1-turn cooldown']}),
 'clear-skies':Object.freeze({name:'Clear Skies',image:'runeClearSkies',lines:['AFTER SKILL','Shield: 20% Max HP / 2 turns','Reflect +10% while shielded','1-turn cooldown']}),
 'infinite-space':Object.freeze({name:'Infinite Space',image:'runeInfiniteSpace',lines:['ULTIMATE','Delay all enemies 100%','Enemy immunity: 2 turns']}),
 recycle:Object.freeze({name:'Recycle',image:'runeRecycle',lines:['SKILL','Restore 1 Skill Point','Advance self 80%','2-turn cooldown']}),
 amplify:Object.freeze({name:'Amplify',image:'runeAmplify',lines:['BASIC ATTACK','+50% damage','2-turn cooldown']}),
 united:Object.freeze({name:'United',image:'runeUnited',lines:['SINGLE-ALLY SKILL','Next ally action triggers a 50% Basic Attack','Then cooldown for 2 turns']})
});
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
 cloud:Object.freeze({basic:'cloud-basic',skill:'cloud-restoration',ultimate:'cloud-ultimate'}),
 logan:Object.freeze({basic:'logan-blood-slash',skill:'logan-blood-shield',ultimate:'logan-red-tide'})
});
const ENEMY_ACTION_VISUALS=Object.freeze({
 slime:Object.freeze({basic:'enemy-slime-acid'}),wolf:Object.freeze({basic:'enemy-wolf-claw'}),hawk:Object.freeze({basic:'hawk-talon'}),
 goblin:Object.freeze({basic:'goblin-pursuit'}),geode:Object.freeze({basic:'geode-impact'}),bear:Object.freeze({basic:'bear-claws'})
});

/* Two-Tone Fundamental 05 preview scheduling engine.
   Baseline event allocation follows approved deterministic fractional cycles and
   proportional midpoint slots; Action Advance/Delay shifts existing event indices.
   No generic extra-turn event is created. */


sources.soulBasicWindup='/assets/embedded-image-09.png';
sources.soulBasicSlash='/assets/embedded-image-10.png';
const imageCache = new Map();
function requestImage(path, priority='auto'){
 if(!path)return undefined;
 let image=imageCache.get(path);
 if(!image){
  image=new Image();
  image.fetchPriority=priority;
  image.src=path;
  imageCache.set(path,image);
 }else if(priority==='high'){
  image.fetchPriority='high';
 }
 return image;
}
const images = Object.defineProperties({},Object.fromEntries(
 Object.entries(sources).map(([key,path])=>[key,{get:()=>requestImage(path)}])
));

function requestStoryBeat(story,beat,priority){
 const portrait=beat.portrait;
 return {
  background:requestImage(beat.background??story.background,priority),
  portrait:requestImage(portrait&&STORY_PORTRAITS[portrait.characterId]?.[portrait.reactionId],priority),
 };
}

function prefetchCampaignBattle({areaId,party,waves}){
 const area=BATTLE_AREAS[areaId];
 const keys=[area.background,area.reverseBackground];
 for(const id of party){
  keys.push(allyBattleArt(id,'command'),allyBattleArt(id,'party'));
  if(id==='soul')keys.push('soulBasicWindup','soulBasicSlash');
 }
 for(const {enemyId} of waves[0]){
  const enemy=ENEMY_ARCHETYPES[enemyId];
  keys.push(enemy.battleSprite,enemy.artwork);
 }
 for(const key of keys)requestImage(sources[key],'low');
}

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
// Dev Mode is disabled in the public client. It must be enabled by an
// authenticated server-side developer role, never by a URL parameter.
const DEV_MODE=false;
const W=1600,H=900;
const TEAM_KEY=DEV_MODE?'two-tone-dev-team-fundamental-1-v1':'two-tone-demo-team-fundamental-1-v1';
const PROGRESSION_KEY=DEV_MODE?'two-tone-dev-character-progress-v1':'two-tone-character-progress-v1',VITALS_KEY=DEV_MODE?'two-tone-dev-character-vitals-v1':'two-tone-character-vitals-v1',LOADOUT_KEY=DEV_MODE?'two-tone-dev-character-loadouts-v1':'two-tone-character-loadouts-v1',ITEM_INVENTORY_KEY=DEV_MODE?'two-tone-dev-item-inventory-v1':'two-tone-item-inventory-v1',STORE_COINS_KEY=DEV_MODE?'two-tone-dev-store-coins-v1':'two-tone-store-coins-v1',DAILY_REWARD_KEY=DEV_MODE?'two-tone-dev-daily-reward-period-v1':'two-tone-daily-reward-period-v1',PLAYER_RANK_KEY=DEV_MODE?'two-tone-dev-player-rank-v1':'two-tone-player-rank-v1',OWNED_CHARACTERS_KEY=DEV_MODE?'two-tone-dev-owned-characters-v1':'two-tone-owned-characters-v1';
const CHARACTER_MAX_LEVEL=50,ASCENSION_GATES=[10,20,30,40],MAX_PARTY_SIZE=4;
// Rank progression is not implemented yet; this value is the account Rank hook.
function loadPlayerRank(){try{const n=Number(localStorage.getItem(PLAYER_RANK_KEY));return Number.isInteger(n)&&n>=1&&n<=50?n:1}catch(e){return 1}}
function savePlayerRank(){try{localStorage.setItem(PLAYER_RANK_KEY,String(playerRank))}catch(e){}}
let playerRank=loadPlayerRank();
// Numerical Base HP values are inherited/development-only combat fixtures, NOT
// approved per-character stats. The unnamed units remain developer test slots.
const ROSTER=CHARACTER_ROSTER;
function combatKit(id){return ROSTER.find(unit=>unit.id===id)?.combat||null}
const ROSTER_IDS=new Set(ROSTER.map(u=>u.id));
function characterPortraitArt(id){return ({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront',cloud:'cloudFront'})[id]||'portrait'}
function normalizeOwnedCharacterIds(value){if(!Array.isArray(value)||value.some(id=>!ROSTER_IDS.has(id))||new Set(value).size!==value.length)return null;const ids=new Set(value);ids.add('soul');return [...ROSTER_IDS].filter(id=>ids.has(id))}
function initializeOwnedCharacters(){if(DEV_MODE)return new Set(ROSTER.map(model=>model.id));try{const raw=localStorage.getItem(OWNED_CHARACTERS_KEY);if(raw!==null){const parsed=normalizeOwnedCharacterIds(JSON.parse(raw));if(parsed)return new Set(parsed)}}catch(e){}return new Set(['soul'])}
let ownedCharacterIds=initializeOwnedCharacters();
function isCharacterOwned(id){return DEV_MODE||ownedCharacterIds.has(id)}
function saveOwnedCharacters(){if(!DEV_MODE)try{localStorage.setItem(OWNED_CHARACTERS_KEY,JSON.stringify([...ownedCharacterIds]))}catch(e){}}
function availableCharacters(){return ROSTER.filter(model=>isCharacterOwned(model.id))}
const combatEngine=new TwoToneBattleEngine();
function roundHp(value){return combatEngine.roundHp(value)}
function roundStatQuarter(value){return combatEngine.roundStatQuarter(value)}
function calculateLevelScaledStat(base,level,flat={},percent={},equipmentFlat={}){
 if(!Number.isFinite(base)||base<0||!Number.isInteger(level)||level<1||level>CHARACTER_MAX_LEVEL)return null;
 const flats=Object.values(flat),percents=Object.values(percent),equipment=Object.values(equipmentFlat);
 if([...flats,...percents,...equipment].some(v=>!Number.isFinite(v)))return null;
 const raw=((base+flats.reduce((a,b)=>a+b,0))*level+equipment.reduce((a,b)=>a+b,0))*(1+percents.reduce((a,b)=>a+b,0));
 return raw>=0&&Number.isFinite(raw)?roundStatQuarter(raw):null;
}
function calculateAttack(unit){
 if(!unit||!Number.isFinite(unit.baseAttack))return null;
 return calculateLevelScaledStat(unit.baseAttack,Number.isInteger(unit.level)?unit.level:1,unit.attackFlatModifiers||{},{...(unit.attackPercentModifiers||{}),dawnTune:unit.tune?.attackBonus||0},unit.attackEquipmentFlatModifiers||{});
}
const RESIDUE_RULES=Object.freeze({maxStacks:5,damageReductionPerStack:.05,resistanceReductionPerStack:.05,durationTurns:2});
function residueStacksOf(unit){return Math.max(0,Math.min(unit?.residueMaxStacks||RESIDUE_RULES.maxStacks,Number.isInteger(unit?.residueStacks)?unit.residueStacks:0))}
function residueReduction(unit){return residueStacksOf(unit)*(unit?.residueResistanceReductionPerStack??RESIDUE_RULES.resistanceReductionPerStack)}
function activeRuneEffect(id,setId,trigger,options={}){return id&&hasRuneSet(id,setId)?combatEngine.resolveRuneEffect({setId,trigger,...options}):null}
function damageDealtMultiplier(unit){const rune=activeRuneDamageEffects[unit?.id]?.darkMatter,logan=party.find(member=>member.id==='logan'),shieldedBonus=unit?.shield>0&&party.includes(unit)&&logan?upgradeValueFor('logan.premium-duplicate.4.shielded-damage','shieldedDamageBonus','logan'):0;return (1-residueStacksOf(unit)*(unit?.residueDamageReductionPerStack??RESIDUE_RULES.damageReductionPerStack))*(rune?.damageMultiplier??1)*(1+shieldedBonus)}
function calculatePhysicalDefense(unit){
 if(!unit||!Number.isFinite(unit.basePhysicalDefense))return null;
 return calculateLevelScaledStat(unit.basePhysicalDefense,unit.level,unit.physicalDefenseFlatModifiers||{},unit.physicalDefensePercentModifiers||{},unit.physicalDefenseEquipmentFlatModifiers||{});
}
function calculateMagicalDefense(unit){
 if(!unit||!Number.isFinite(unit.baseMagicalDefense))return null;
 return calculateLevelScaledStat(unit.baseMagicalDefense,unit.level,unit.magicalDefenseFlatModifiers||{},unit.magicalDefensePercentModifiers||{},unit.magicalDefenseEquipmentFlatModifiers||{});
}
function calculateTrueDefense(unit){
 const physical=calculatePhysicalDefense(unit),magical=calculateMagicalDefense(unit);
 return physical===null||magical===null?null:(physical+magical)*.5;
}
function baseDefenseIgnoreOf(attacker){const passiveIgnore=Number.isFinite(attacker?.passive?.defenseIgnore)?attacker.passive.defenseIgnore:attacker?.passive?.id==='sharp-claws' ? .25 : 0;return Math.min(1,Math.max(0,(Number.isFinite(attacker?.tune?.defenseIgnore)?attacker.tune.defenseIgnore:0)+passiveIgnore))}
function defenseIgnoreOf(attacker,type=null){const rune=activeRuneDamageEffects[attacker?.id]?.darkMatter,runeBonus=rune&&['physical','magical'].includes(type)?rune.defenseIgnore:0;return Math.min(1,baseDefenseIgnoreOf(attacker)+runeBonus)}
function calculateTrueDamageReduction(attacker,target){
 const attack=calculateAttack(attacker),exposedFactor=Math.pow(.9,target?.marks?.filter(m=>m.id==='exposed').length||0),residueFactor=1-residueReduction(target),physicalDefense=calculatePhysicalDefense(target)*residueFactor*(1-defenseIgnoreOf(attacker,'physical'))*exposedFactor,magicalDefense=calculateMagicalDefense(target)*residueFactor*(1-defenseIgnoreOf(attacker,'magical'))*exposedFactor;
 if(!Number.isFinite(attack)||attack<=0||!Number.isFinite(physicalDefense)||physicalDefense<0||!Number.isFinite(magicalDefense)||magicalDefense<0)return null;
 return .5*Math.min(physicalDefense/attack,1)+.5*Math.min(magicalDefense/attack,1);
}
function calculateDamageAfterDefense(damageBeforeDefense,attack,defense){
 if(!Number.isFinite(damageBeforeDefense)||damageBeforeDefense<0||!Number.isFinite(attack)||attack<=0||!Number.isFinite(defense)||defense<0)return null;
 const reduction=Math.min(defense/attack,1);
 return roundHp(damageBeforeDefense*(1-reduction));
}
function calculatePhysicalDamageAfterDefense(damageBeforeDefense,attacker,target){
 return calculateDamageAfterDefense(damageBeforeDefense,calculateAttack(attacker),calculatePhysicalDefense(target));
}
function calculateMagicalDamageAfterDefense(damageBeforeDefense,attacker,target){
 return calculateDamageAfterDefense(damageBeforeDefense,calculateAttack(attacker),calculateMagicalDefense(target));
}
function calculateTrueDamageAfterDefense(damageBeforeDefense,attacker,target){
 const attack=calculateAttack(attacker),reduction=calculateTrueDamageReduction(attacker,target);
 if(!Number.isFinite(damageBeforeDefense)||damageBeforeDefense<0||!Number.isFinite(attack)||attack<=0||!Number.isFinite(reduction))return null;
 return roundHp(damageBeforeDefense*(1-reduction));
}
function calculateTypedActionDamage(type,attackRate,attacker,target){
 if(!['physical','magical','true'].includes(type)||!Number.isFinite(attackRate)||attackRate<0)return null;
 const attack=calculateAttack(attacker);
 const defenseMultiplier=1-residueReduction(target),physicalDefenseReduction=target?.debuffs?.find(effect=>effect.id==='tsunade-physical-defense-down')?.physicalDefenseReduction||0,physicalDefense=calculatePhysicalDefense(target)*(1-physicalDefenseReduction),magicalDefense=calculateMagicalDefense(target),defense=type==='physical'?physicalDefense:type==='magical'?magicalDefense:(physicalDefense+magicalDefense)/2,physicalIgnore=defenseIgnoreOf(attacker,'physical'),magicalIgnore=defenseIgnoreOf(attacker,'magical');
 const trueDefenseBasis=(physicalDefense*defenseMultiplier*(1-physicalIgnore)+magicalDefense*defenseMultiplier*(1-magicalIgnore))/2;
 const exposedStacks=target?.marks?.filter(m=>m.id==='exposed').length||0,exposedDefenseReduction=CHARACTER_COMBAT_DATA.lily.passives.find(passive=>passive.type==='exposed')?.defenseReduction??.2;
 const result=combatEngine.resolveTypedHit({type,attack,physicalDefense,magicalDefense,multiplier:attackRate,physicalDefenseIgnore:physicalIgnore,magicalDefenseIgnore:magicalIgnore,damageMultiplier:damageDealtMultiplier(attacker),defenseMultiplier,exposedStacks,exposedDefenseReduction});
 if(!result||!Number.isFinite(defense)||defense<0)return null;
 return {type,attackBasis:attack,defenseBasis:type==='true'?trueDefenseBasis:defense*defenseMultiplier*(1-(type==='physical'?physicalIgnore:magicalIgnore)),attackRate,damageBeforeDefense:result.damageBeforeDefense,reduction:result.reduction,damageTaken:result.damage};
}
function criticalRateOf(unit){return Math.min(1,Math.max(0,(Number.isFinite(unit?.criticalRate)?unit.criticalRate:.1)+(Number.isFinite(unit?.criticalRateBonus)?unit.criticalRateBonus:0)+(unit?.passive?.criticalRateBonus||0)+(unit?.tune?.criticalRateBonus||0)+Object.values(unit?.criticalRateModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0)))}
function criticalDamageOf(unit){return Math.max(0,(Number.isFinite(unit?.criticalDamage)?unit.criticalDamage:.5)+(Number.isFinite(unit?.criticalDamageBonus)?unit.criticalDamageBonus:0)+(unit?.passive?.criticalDamageBonus||0)+(unit?.tune?.criticalDamageBonus||0)+Object.values(unit?.criticalDamageModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0))}
function lifestealRateOf(unit){const base=(Number.isFinite(unit?.lifesteal)?unit.lifesteal:0)+(Number.isFinite(unit?.lifestealBonus)?unit.lifestealBonus:0)+Object.values(unit?.lifestealModifiers||{}).reduce((sum,value)=>sum+(Number.isFinite(value)?value:0),0),logan=party.find(member=>member.id==='logan'&&member.hp>0),tasteForBlood=party.includes(unit)&&logan?upgradeValueFor('logan.duplicate.2.lifesteal','lifestealRate','logan',.1):0;return Math.max(0,base+tasteForBlood)}
function shieldOf(unit){return Math.max(0,Number.isFinite(unit?.shield)?unit.shield:0)}
function addShield(unit,amount){return combatEngine.applyShield({target:unit,amount})?.total||0}
function applyLifesteal(attacker,healthDamage,eventType='direct_hit'){
 const rate=lifestealRateOf(attacker),logan=party.find(unit=>unit.id==='logan'&&unit.hp>0);if(healthDamage<=0||rate<=0||!attacker||attacker.hp<=0||!Number.isFinite(attacker.maxHp))return 0;
 const passiveRate=party.includes(attacker)&&logan?upgradeValueFor('logan.duplicate.2.lifesteal','lifestealRate','logan',.1):0;
 const mechanicSource=passiveRate>0?{componentId:'passive:logan/tasteForBlood',mechanicTags:['recovery.lifesteal'],trigger:'on_ally_damage'}:null;
 const healed=combatEngine.resolveLifesteal({attacker,damage:healthDamage,rate,eventType,mechanicSource,sourceActorId:logan?.id}),healing=healed?.applied||0;if(healing>0){if(passiveRate>.1)combatEngine.recordUpgradeEffect('logan.duplicate.2.lifesteal',{actorId:logan.id,targetIds:[attacker.id],trigger:'on_ally_damage_dealt',values:{healing,lifestealRate:passiveRate}});saveVitals()}
 if(healing>0){emitCombatVisual('lifesteal-heal',[attacker.id],COMBAT_ACTION_EFFECT_MS,{healing});const weapon=logan&&loadoutFor('logan').weapon,signatureEquipped=weapon?.selected==='premium'&&weapon?.premiumOwned;if(attacker.id!=='logan'&&logan&&party.includes(attacker)&&signatureEquipped){const before=logan.hp;healCharacterHp(logan,healing);const copied=Math.max(0,logan.hp-before);if(copied>0){combatEngine.recordUpgradeEffect('logan.signature.lifesteal-share',{actorId:logan.id,targetIds:[logan.id],trigger:'on_ally_lifesteal',values:{healing:copied}});emitCombatVisual('logan-signature-heal',[logan.id],COMBAT_ACTION_EFFECT_MS,{healing:copied})}}}
 return healing;
}
function tauntRateOf(attacker,target=null){return Math.min(1,Math.max(0,...(attacker?.tauntEffects||[]).filter(effect=>Number.isInteger(effect.turns)&&effect.turns>0&&(!target||effect.targetId===target.id)).map(effect=>effect.rate)))}
function applyTaunt(attacker,taunter,rate,turns){
 if(!attacker||!taunter||!Number.isFinite(rate)||rate<0||rate>1||!Number.isInteger(turns)||turns<1)return false;
 if(!combatEngine.applyTaunt({target:attacker,sourceId:taunter.id,targetId:taunter.id,rate,turns}))return false;
 emitCombatVisual('taunt-applied',[attacker.id],COMBAT_ACTION_EFFECT_MS,{rate,turns,taunterId:taunter.id});return true;
}
function resolveTauntTarget(attacker,candidates,originalTarget,random=Math.random){
 const contenders=[...new Set(candidates)].map(unit=>({unit,rate:tauntRateOf(attacker,unit)})).filter(entry=>entry.rate>0).sort((a,b)=>b.rate-a.rate||String(a.unit.id).localeCompare(String(b.unit.id)));
 for(const {unit,rate} of contenders)if(random()<rate)return {target:unit,taunted:true};
 return {target:originalTarget,taunted:false};
}
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
function setEchoPercentForTest(id,percent){
 if(!DEV_MODE||phase!=='player'||attackInProgress||!Number.isFinite(percent)||percent<0||percent>1)return false;
 const unit=party.find(candidate=>candidate.id===id)||liveEnemies().find(candidate=>candidate.id===id);if(!unit)return false;
 unit.echoPercent=percent;say(`TEST ONLY: ${unit.name} Echo ${roundHp(percent*100)}%.`);return true;
}
function setReflectPercentForTest(id,percent){
 if(!DEV_MODE||phase!=='player'||attackInProgress||!Number.isFinite(percent)||percent<0||percent>1)return false;
 const unit=party.find(candidate=>candidate.id===id)||liveEnemies().find(candidate=>candidate.id===id);if(!unit)return false;
 unit.reflectPercent=percent;say(`TEST ONLY: ${unit.name} Reflect ${roundHp(percent*100)}%.`);return true;
}
function loadVitals(){try{const x=JSON.parse(localStorage.getItem(VITALS_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(e){return {}}}
let savedVitals=loadVitals();
let vitalsSyncTimer=null;
function saveVitals(){
 if(campaignEntry)return;
 for(const p of party){if(!p||!ROSTER_IDS.has(p.id))continue;savedVitals[p.id]={hp:p.hp,maxHp:p.maxHp}}
 try{localStorage.setItem(VITALS_KEY,JSON.stringify(savedVitals))}catch(e){}
 clearTimeout(vitalsSyncTimer);vitalsSyncTimer=setTimeout(()=>window.TwoToneAccount?.action('set-vitals',{vitals:savedVitals}).catch(()=>{}),500);
}
// Training mode assignments exercise both approved game-mode recovery policies;
// actual named game modes have not been designed or assigned a policy.
let trainingRecoveryMode='restore';
function setTrainingRecoveryMode(mode){if(phase!=='setup'||!['restore','preserve'].includes(mode))return false;trainingRecoveryMode=mode;return true}
function spawnProgressedUnit(id,fullHealth=false){
 const model=ROSTER.find(x=>x.id===id),progress=progressFor(id);if(!model||!progress)return null;
 const modifiers=loadoutStatModifiers(id,progress.level);
 const maxHp=calculateMaxHp(model.hp,progress.level,modifiers.hpFlatModifiers,modifiers.hpPercentModifiers,modifiers.hpEquipmentFlatModifiers);if(maxHp===null)return null;
 const saved=savedVitals[id];const restore=fullHealth||trainingRecoveryMode==='restore'||!saved;
 const savedMax=Number.isFinite(saved?.maxHp)&&saved.maxHp>0?saved.maxHp:maxHp;
 const savedHp=Number.isFinite(saved?.hp)?saved.hp:maxHp;
 const hp=restore?maxHp:savedHp<=0?0:Math.max(0,roundHp(maxHp*(savedHp/savedMax)));
 const passive={...(model.passive||{})};
 if(id==='zero'){
  passive.criticalRateBonus=.2*upgradeValueFor('zero.duplicate.1.critical-stats','criticalRateMultiplier','zero',1);
  passive.criticalDamageBonus=.5*upgradeValueFor('zero.duplicate.1.critical-stats','criticalDamageMultiplier','zero',1);
  passive.defenseIgnore=upgradeValueFor('zero.premium-duplicate.4.defense-ignore','defenseIgnore','zero');
 }
 return {...model,passive,baseHp:model.hp,level:progress.level,hp,maxHp,...modifiers,shield:0,tauntEffects:[],energy:COMBAT_RESOURCE_STANDARD.startingEnergy,energyReserved:0};
}

const turnTimeline=combatEngine.timeline;
let speedModifiers=Object.create(null),summons=[],summonSerial=0,summonHistory=[],runeCombatState=Object.create(null),activeRuneDamageEffects=Object.create(null);
const unitedFollowUpParents=new Map();
function runeSetState(id){return runeCombatState[id]||(runeCombatState[id]={cooldowns:{'radiant-moon':0,'eternal-sun':0,'dark-matter':0,'clear-skies':0,recycle:0,amplify:0,'celestial-star':0,united:0},cooldownStartedTurn:{},eternalSunNextActionPending:false,shieldRemaining:0,shieldTurns:0,shieldStartedTurn:0,unitedLink:null})}
function runeSetPieceCount(id,key){return typeof id==='string'&&ROSTER_IDS.has(id)&&key?loadoutFor(id).runes.filter(rune=>rune?.setId===key).length:0}
function ownedRuneCount(setId){return (itemInventory?.runes?.[setId]?.length||0)+Object.values(characterLoadouts||{}).reduce((count,record)=>count+record.runes.filter(rune=>rune?.setId===setId).length,0)}
function hasRuneSet(id,key){return runeSetPieceCount(id,key)===4}
function runeEffectReady(id,effect){return combatEngine.isRuneReady(runeSetState(id),effect)}
function restoreRuneEnergy(actor,amount){if(!actor||!Number.isFinite(amount)||amount<=0)return 0;const before=actor.energy;actor.energy=Math.min(120,actor.energy+amount);return actor.energy-before}
function resolveEternalSunAction(attack){if(!attack||!hasRuneSet(attack.actor,'eternal-sun'))return false;const actor=party.find(member=>member.id===attack.actor),state=runeSetState(attack.actor);if(!actor)return false;if(state.eternalSunNextActionPending){const effect=combatEngine.resolveRuneTrigger({setId:'eternal-sun',trigger:'nextAction',state,effectId:'eternal-sun',turn,actorId:actor.id,targetIds:[actor.id]});state.eternalSunNextActionPending=false;if(!effect)return false;const energyGained=restoreRuneEnergy(actor,effect.energyRestore);actor.runeActivations=(actor.runeActivations||0)+1;combatEngine.recordMechanicEvent({componentId:'rune:eternal-sun',mechanicTags:RUNE_COMBAT_RULES['eternal-sun'].mechanicTags,trigger:'after_next_action',status:'applied',actorId:actor.id,targetIds:[actor.id],values:{energyGained,cooldownTurns:effect.cooldownTurns}});emitCombatVisual('rune-eternal-sun',[actor.id],COMBAT_ACTION_EFFECT_MS,{energyGained});return true}if(attack.action==='ultimate'&&runeEffectReady(actor.id,'eternal-sun')){const effect=combatEngine.resolveRuneTrigger({setId:'eternal-sun',trigger:'ultimate',state,actorId:actor.id,targetIds:[actor.id]});if(effect){state.eternalSunNextActionPending=true;actor.runeActivations=(actor.runeActivations||0)+1;return true}}return false}
function prepareRuneDamageEffects(actor,action,plan,targets){
 const effects={};activeRuneDamageEffects[actor.id]=effects;if(!plan||!targets?.length)return effects;
 const targetIds=targets.map(target=>target.id),state=runeSetState(actor.id);
 if(plan.damageType&&hasRuneSet(actor.id,'dark-matter'))effects.darkMatter=combatEngine.resolveRuneTrigger({setId:'dark-matter',trigger:'abilityDamage',state,effectId:'dark-matter',turn,actorId:actor.id,targetIds:[actor.id]});
 if(plan.damageType&&action==='skill'&&hasRuneSet(actor.id,'radiant-moon'))effects.radiantMoon=combatEngine.resolveRuneTrigger({setId:'radiant-moon',trigger:'damagingSkill',state,effectId:'radiant-moon',turn,actorId:actor.id,targetIds});
 return effects;
}
function applyRuneSkillEffects(actor){
 if(!actor)return false;let applied=false;const state=runeSetState(actor.id);
 const shield=combatEngine.resolveRuneTrigger({setId:hasRuneSet(actor.id,'clear-skies')?'clear-skies':null,trigger:'skill',state,effectId:'clear-skies',turn,actorId:actor.id,targetIds:[actor.id]});
 if(shield){const amount=roundHp(actor.maxHp*shield.shieldMaxHp),before=shieldOf(actor);addShield(actor,amount);state.shieldRemaining+=Math.max(0,shieldOf(actor)-before);state.shieldTurns=shield.shieldDurationTurns;state.shieldStartedTurn=turn;combatEngine.recordMechanicEvent({componentId:'rune:clear-skies',mechanicTags:RUNE_COMBAT_RULES['clear-skies'].mechanicTags,trigger:'on_skill',status:'applied',actorId:actor.id,targetIds:[actor.id],values:{shieldGranted:Math.max(0,shieldOf(actor)-before),shieldMaxHp:shield.shieldMaxHp,durationTurns:shield.shieldDurationTurns,reflectWhileShielded:RUNE_COMBAT_RULES['clear-skies'].reflect}});emitCombatVisual('rune-clear-skies',[actor.id],COMBAT_ACTION_EFFECT_MS,{shield:Math.max(0,shieldOf(actor)-before)});applied=true}
 const recycle=combatEngine.resolveRuneTrigger({setId:hasRuneSet(actor.id,'recycle')?'recycle':null,trigger:'skill',state,effectId:'recycle',turn,actorId:actor.id,targetIds:[actor.id]});
 if(recycle){const before=sp;gainSp(recycle.skillPoints);addActionAdvance(actor.id,recycle.actionAdvance);combatEngine.recordMechanicEvent({componentId:'rune:recycle',mechanicTags:RUNE_COMBAT_RULES.recycle.mechanicTags,trigger:'on_skill',status:'applied',actorId:actor.id,targetIds:[actor.id],values:{skillPointsGained:sp-before,skillPointsBefore:before,skillPointsAfter:sp,actionAdvance:recycle.actionAdvance}});emitCombatVisual('rune-recycle',[actor.id],COMBAT_ACTION_EFFECT_MS,{skillPoints:recycle.skillPoints,advancePercent:recycle.actionAdvance});applied=true}
 return applied;
}
function applyUnitedRune(id,targetId){const actor=party.find(member=>member.id===id),target=party.find(member=>member.id===targetId),state=runeSetState(id);if(!actor||!target||target.hp<=0||target.id===id||state.unitedLink)return false;const effect=combatEngine.resolveRuneTrigger({setId:hasRuneSet(id,'united')?'united':null,trigger:'allySkill',state,effectId:'united',turn,actorId:id,targetIds:[targetId]});if(!effect)return false;state.unitedLink={targetId,actionsRemaining:effect.linkActions,cooldownAfterLinkTurns:effect.cooldownAfterLinkTurns};combatEngine.recordMechanicEvent({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'on_ally_skill',status:'linked',actorId:id,targetIds:[id,targetId],values:{linkedActions:effect.linkActions,cooldownAfterLinkTurns:effect.cooldownAfterLinkTurns}});emitCombatVisual('rune-united',[id,targetId],COMBAT_ACTION_EFFECT_MS,{linkedActions:effect.linkActions});return true}
function expireUnitedLink(ownerId,targetId){const state=runeSetState(ownerId),link=state.unitedLink;if(!link||link.targetId!==targetId)return false;state.unitedLink=null;combatEngine.startRuneCooldown(state,'united',turn,link.cooldownAfterLinkTurns);combatEngine.recordMechanicEvent({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'after_link_expired',status:'expired',actorId:ownerId,targetIds:[ownerId,targetId],values:{cooldownTurns:link.cooldownAfterLinkTurns,linkedActions:link.actionsRemaining}});return true}
function ageUnitedLinkTurn(targetId){for(const owner of party)expireUnitedLink(owner.id,targetId)}
function ageRuneTurn(id){const state=runeSetState(id);combatEngine.ageRuneCooldowns(state,turn,['radiant-moon','eternal-sun','dark-matter','clear-skies','recycle','amplify','celestial-star','united']);if(state.shieldTurns>0&&state.shieldStartedTurn<turn){state.shieldTurns--;if(!state.shieldTurns&&state.shieldRemaining>0){const unit=party.find(member=>member.id===id);if(unit)unit.shield=Math.max(0,shieldOf(unit)-state.shieldRemaining);state.shieldRemaining=0}}}
function ageRuneDelayImmunity(unit){for(const owner of Object.keys(unit?.runeDelayImmunityByOwner||{})){unit.runeDelayImmunityByOwner[owner]=Math.max(0,unit.runeDelayImmunityByOwner[owner]-1);if(!unit.runeDelayImmunityByOwner[owner])delete unit.runeDelayImmunityByOwner[owner]}}
function calculateSpeed(unit){
 if(!unit)return null;
 const base=Number.isFinite(unit.baseSpeed)?unit.baseSpeed:unit.speed;
 if(!Number.isFinite(base))return null;
 const effectMultiplier=speedModifiers[unit.id]||1;
 const tempoStacks=unit.marks?.filter(mark=>['cloud-tempo','tsunade-slow-start'].includes(mark.id)).reduce((sum,mark)=>sum+(mark.speedBonus||(mark.id==='tsunade-slow-start'?0.5:0.2)),0)||0;
 const slowStacks=unit.marks?.filter(mark=>mark.id==='cloud-slow')||[],slow=slowStacks.reduce((value,mark)=>value+(mark.slowPercent||.2),0);
 return calculateLevelScaledStat(base,Number.isInteger(unit.level)?unit.level:1,
  {...(unit.speedFlatModifiers||{})},
  {...(unit.speedPercentModifiers||{}),temporarySpeedEffect:effectMultiplier-1+tempoStacks-slow},unit.speedEquipmentFlatModifiers||{});
}
function speedOf(unit){return Math.max(1,calculateSpeed(unit)||1)}
function timelineEnemyMembers(){
 // In this training encounter, a wave's predefined enemy roster is its speed-averaging team.
 // Defeated and waiting enemy instances remain in the cohort; the rule for non-wave boss
 // reinforcements must be specified separately before adding them as production abilities.
 return wavePlan[waveIndex]?wavePlan[waveIndex].map(e=>({id:e.id,speed:speedOf(e)})):liveEnemies().map(e=>({id:e.id,speed:speedOf(e)}));
}
function turnTimelineInputs(){
 const units=[...alive().map(p=>({id:p.id,speed:speedOf(p),faction:'ally'})),
  ...liveEnemies().map(e=>({id:e.id,speed:speedOf(e),faction:'enemy'})),
  ...summons.filter(x=>x.mode==='independent'&&x.remaining>0).map(x=>({id:x.id,speed:speedOf(x),faction:'ally',summon:true}))];
 const allyMembers=party.map(p=>({id:p.id,speed:speedOf(p)}));
 const enemyMembers=timelineEnemyMembers();
 return {units,alliedMembers:allyMembers,enemyMembers};
}
function syncTurnTimeline(){
 const inputs=turnTimelineInputs();
 if(inputs.alliedMembers.length&&inputs.enemyMembers.length)combatEngine.syncTurnOrder(inputs.units,inputs.alliedMembers,inputs.enemyMembers);
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
 const summonTurn=combatEngine.advanceSummonTurn(s);if(!summonTurn)return nextTurn();attackInProgress=true;summonHistory.push({event:'acted',id:s.id,clock:turnTimeline.clock,remaining:summonTurn.remainingTurns});
 activeId=null;actingEnemyId=null;phase='resolve';
 const owner=party.find(p=>p.id===s.ownerId);
 const foe=chosenEnemy();
 fx={kind:'basic',visual:'lily-hauntling',at:performance.now(),actor:owner?.id||s.ownerId,targetEnemyId:foe?.id,targetEnemyIds:liveEnemies().map(e=>e.id),targetGeometry:foe?{x:foe.x,y:foe.y,w:foe.w,h:foe.h}:null};
 const source={serial:++attackSerial,actor:'lily',action:'summon',hits:[],ricochetEligibleEnemyIds:liveEnemies().filter(enemy=>enemy.marks?.some(mark=>mark.id==='ricochet')).map(enemy=>enemy.id)};
 for(const enemy of liveEnemies().slice()){
  const lily=party.find(p=>p.id==='lily'),raw=calculateTypedActionDamage('true',s.multiplier??.75,lily,enemy),dealt=applyEnemyDamage(enemy,raw?.damageTaken||0,lily,{damageType:'true',eventType:'summon_hit',actionId:source.serial});
  source.hits.push({target:enemy.id,damage:dealt.damage,summon:true,eventType:dealt.eventType,sourceId:dealt.sourceId,actionId:dealt.actionId,reflect:dealt.reflect||null,echo:dealt.echo||null});if(dealt.reflect)source.hits.push({index:source.hits.length+1,target:lily?.id||null,damage:dealt.reflect.damage,healthDamage:dealt.reflect.healthDamage,damageType:'true',reflect:true,eventType:dealt.reflect.eventType,sourceId:dealt.reflect.sourceId,actionId:dealt.reflect.actionId,phase:'reflect'});if(dealt.echoReflect)source.hits.push({index:source.hits.length+1,target:lily?.id||null,damage:dealt.echoReflect.damage,healthDamage:dealt.echoReflect.healthDamage,damageType:'true',reflect:true,eventType:dealt.echoReflect.eventType,sourceId:dealt.echoReflect.sourceId,actionId:dealt.echoReflect.actionId,phase:'echo-reflect'});if(enemy.hp<=0)resolveEnemyDefeat(enemy);
  else{
   const effects=combatEngine.resolveHitEffects({actor:lily,target:enemy,hit:{dodged:!!dealt.dodged,damage:dealt.damage},action:'summon',eventType:dealt.eventType,passives:combatKit('lily')?.passives||[],characterDuplicates:characterDuplicateRank('lily'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('lily'),hasPremiumWeapon:loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned,allies:party,isEnemyTarget:true});
   if(effects.some(effect=>effect.type==='exposed'))emitCombatVisual('lily-exposed',[enemy.id],COMBAT_ACTION_EFFECT_MS);
   if(effects.some(effect=>effect.type==='ricochet-mark'))emitCombatVisual('lily-ricochet-mark',[enemy.id],COMBAT_ACTION_EFFECT_MS);
   if(!source.pendingRicochet&&dealt.damage>0)source.pendingRicochet={enemyId:enemy.id,damage:dealt.damage};
  }
 }
 log=`${s.name} • INITIAL AOE • TRUE DAMAGE`;
 const finishTurn=()=>{attackInProgress=false;settleAfterAttack();if(s.expired){summons=summons.filter(x=>x.id!==s.id);turnTimeline.states.delete(s.id);summonHistory.push({event:'expired',id:s.id})}drainUltimateQueueBefore(()=>nextTurn())};
 const finishSummonTriggers=()=>{const pending=source.pendingRicochet,ricochetCount=pending?triggerRicochet(source,enemies.find(e=>e.id===pending.enemyId),pending.damage):0;if(ricochetCount){log=`Hauntling triggers Lily's Ricochet • ${ricochetCount} marked ${ricochetCount===1?'enemy':'enemies'}.`;schedule(finishSummonTriggers,COMBAT_ACTION_PHASE_GAP_MS);return}if(resolveSoulFollowUp(source)){const followUp=source.followUp;log=`Soul Follow-up • ${followUp.targets.length} ${followUp.targets.length===1?'enemy':'enemies'} take ${followUp.damage} True damage.`;schedule(finishTurn,COMBAT_ACTION_PHASE_GAP_MS);return}finishTurn()};
 schedule(finishSummonTriggers,COMBAT_ACTION_EFFECT_MS+(source.hits.some(hit=>hit.echo)?COMBAT_ACTION_PHASE_GAP_MS:0));
}

const color={ink:'#0a101f',panel:'rgba(13,17,35,.94)',gold:'#eacb87',white:'#f7f3f8',sub:'#bfc8d9',blue:'#85d9ff',red:'#f47679',green:'#5bebac'};
let phase='startup',paused=false,turn=0,enemyHp=0,maxEnemyHp=0,sp=3,
    gauges={},party=[],activeId=null,fx=null,combatVisualEvents=[],log='',hint='',hintAt=0,
    choiceRects=[],battleToken=0,enemyCount=0,forceSelect=false;
// Four authored party formation positions. Enemy identities and wave queues are independent of these slots.
// Encounter presets and enemy stats below are DEMO DATA; Approved Fundamental 2 defines the rules.
const ENEMY_CATEGORIES=Object.freeze(['common','elite','boss']);
const ENEMY_TRAIT_TAGS=Object.freeze(['Magical Attacker','Magical Resistant','Defensive','Physically Fragile','Slow','Fast','Physical Attacker','Strong','Magically Fragile','Fragile','Weak','Physically Resistant','Physically Defensive']);
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
function validateEnemyTags(tags,category){
 if(!tags||typeof tags.area!=='string'||!tags.area.trim()||tags.type!==category||!Array.isArray(tags.strengths)||!Array.isArray(tags.weaknesses))throw Error(`Enemy ${category} needs area, matching type, strengths, and weaknesses tags.`);
 for(const trait of [...tags.strengths,...tags.weaknesses])if(!ENEMY_TRAIT_TAGS.includes(trait))throw Error(`Unknown enemy trait tag: ${trait}`);
 if(new Set(tags.strengths).size!==tags.strengths.length||new Set(tags.weaknesses).size!==tags.weaknesses.length)throw Error('Enemy trait tags cannot be duplicated within strengths or weaknesses.');
 return {area:tags.area,type:tags.type,strengths:[...tags.strengths],weaknesses:[...tags.weaknesses]};
}
const ENEMY_FORMATIONS=[
 {id:'slot1',x:646,y:359,w:151,h:198},
 {id:'slot2',x:822,y:314,w:156,h:205},
 {id:'slot3',x:1010,y:274,w:167,h:220},
 {id:'slot4',x:1201,y:312,w:156,h:205},
 {id:'slot5',x:1389,y:355,w:151,h:198},
];
// Any encounter may supply its own finite number of waves, each with 1–15 enemies.
// Presets are only review scenarios; they are NOT a global wave-count limit.
const WAVE_PRESETS={stress:[15,12,6],quick:[1,5,6],sizes:[1,5,6,12,15]};
let currentBattleAreaId=DEFAULT_BATTLE_AREA_ID,wavePreset=DEV_MODE?'stress':'quick',waveOverride=null,enemyRosterMode=DEV_MODE?'mixed':'slime',wavePlan=[],waveIndex=-1,waveQueue=[],waveKills=0,
    totalEnemyDefeats=0,encounterCleared=false,spawnHistory=[],enemies=[],selectedEnemyId=null,actingEnemyId=null;
// Fundamental 3 target rules and Fundamental 2 v1.1 post-attack reinforcement boundary.
// Soul Enhanced Basic uses Blast unless Premium Weapon Duplicate 3 changes it to AoE; Ultimate is AoE. The pattern toolbar,
// 5-hit and support actions remain development-only controls. Damage/cost values are provisional.
let targetingMode='single',pendingTargetAction=null,supportDemo=null,zeroSkillArmed=false,attackInProgress=false,attackSerial=0,
     pendingVacancies=[],lastAttack=null,supportTestHistory=[],soulEnhanceStacks=0,soulFollowUpState={type:'followUp',charges:5,remaining:5,seenSources:new Set(),activations:0},soulEnhanceSpendingRemainder=0,zeroHitEnemyIds=new Set();
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
function ultimateEnergyCost(p){const kit=combatKit(p?.id),base=p?.id==='zero'?upgradeValueFor('zero.premium-duplicate.3.ultimate-energy-cost','ultimateEnergyCost','zero',kit?.ultimate?.energyCost??ULTIMATE_ENERGY_COST):p?.id==='cloud'?upgradeValueFor('cloud.duplicate.4.ultimate-control','ultimateEnergyCost','cloud',kit?.ultimate?.energyCost??ULTIMATE_ENERGY_COST):(kit?.ultimate?.energyCost??ULTIMATE_ENERGY_COST);return Math.max(0,base-(p&&hasRuneSet(p.id,'eternal-sun')&&runeEffectReady(p.id,'eternal-sun')?RUNE_COMBAT_RULES['eternal-sun'].ultimateEnergyReduction:0))}
function canQueueUltimate(p){return !!p&&p.hp>0&&!p.debuffs?.some(effect=>effect.id==='stun')&&!paused&&['player','enemy','resolve'].includes(phase)
  &&availableEnergy(p)>=ultimateEnergyCost(p)&&!isUltPending(p.id)}
function emitCombatVisual(type,targetIds=[],duration=COMBAT_ACTION_EFFECT_MS,details={}){const {delayMs=0,...payload}=details;combatVisualEvents.push({type,targetIds:[...targetIds],at:performance.now()+delayMs,duration,...payload})}
function resetActionResources(){const resourceful=party.some(p=>p.id==='dawn');combatVisualEvents=[];runeCombatState=Object.create(null);activeRuneDamageEffects=Object.create(null);unitedFollowUpParents.clear();sp=resourceful?5:3;soulEnhanceStacks=0;resetSoulFollowUp();soulEnhanceSpendingRemainder=0;zeroHitEnemyIds=new Set();spCapModifiers=Object.create(null);if(resourceful){setSpCapModifier('dawn-resourceful',2);combatEngine.recordAuthoredEffect({ownerId:'dawn',slot:'passive',effectId:'resourceful',trigger:'battle_start',actorId:'dawn',targetIds:party.map(p=>p.id),values:{skillPointCapacityBonus:2,startingSkillPointsBonus:2,skillPointCap:effectiveSpMax(),startingSkillPoints:sp}});emitCombatVisual('dawn-resourceful',party.map(p=>p.id),1250)}combatEngine.recordBattleStartEffects([...party,...enemies],unit=>Object.keys(RUNE_SET_DEFINITIONS).find(setId=>hasRuneSet(unit.id,setId)));ultimateQueue=[];ultimateSequence=0;ultimateHistory=[];ultimateResume=null;ultimateExecuting=false;
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
  if(p.debuffs?.some(effect=>effect.id==='stun')){p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);ultimateHistory.push({event:'canceled-stun',actor:q.actorId,seq:q.seq});log=`${p.name}'s queued Ultimate was canceled by Stun; energy released.`;return runNextUltimate()}
  if(p.id==='dawn'&&!party.some(ally=>ally.id===q.allyTargetId&&ally.hp>0)){p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);ultimateHistory.push({event:'canceled-ally-target-ko',actor:q.actorId,target:q.allyTargetId,seq:q.seq});log='Dawn’s Ultimate canceled because its target was defeated; Energy released.';return runNextUltimate()}
  p.energyReserved=Math.max(0,(p.energyReserved||0)-q.cost);
  ultimateHistory.push({event:'started',actor:q.actorId,seq:q.seq,energy:p.energy,turn});
  ultimateExecuting=true;
  // Same provisional Ultimate attack effect from v0.8. This is a testing
  // placeholder, not a canonical Ultimate definition or approved balance.
  if(!executeCombatAction(p,'ultimate',q.seq,q.allyTargetId,{kind:'eternal-sun-cost',energyCost:q.cost})){
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
 return combatEngine.resolveTargets({candidates:liveEnemies(),mode,primary});
}
function closestSurvivingEnemy(slot){return liveEnemies().slice().sort((a,b)=>Math.abs(a.slot-slot)-Math.abs(b.slot-slot)||a.slot-b.slot)[0]||null}
// Soul's Basic becomes Blast at three Enhance stacks; the Ultimate is AoE.
function actionTargetMode(actor,action){if(actor?.id==='soul'&&action==='basic')return soulEnhancedBasicTargetMode(soulEnhanceStacks);return combatKit(actor?.id)?.[action]?.target||targetingMode}
function previewTargetMode(){if(pendingTargetAction){const actor=party.find(p=>p.id===pendingTargetAction.actorId);return actionTargetMode(actor,pendingTargetAction.action)}return targetingMode}
function beginDawnAllyTargetSelection(action,actorId){
 const actor=party.find(p=>p.id===actorId);if(!actor||!['dawn','cloud'].includes(actor.id))return false;
 if(action==='ultimate'&&!canQueueUltimate(actor)){say(actor.hp<=0?'Defeated ally cannot use an Ultimate.':'Ultimate needs '+ultimateEnergyCost(actor)+' available Energy.');return false}
 if(action==='skill'&&sp<1){say('This skill needs 1 Skill Point.');return false}
 if(pendingTargetAction?.targetSide==='ally'&&pendingTargetAction.action===action&&pendingTargetAction.actorId===actorId){
  const target=party.find(p=>p.id===selectedAllyId&&p.hp>0);
  if(!target){say('Select a living ally before confirming this action.');return false}
  pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;
  return action==='ultimate'?queueUltimate(actorId,target.id):executeCombatAction(actor,action,null,target.id);
 }
 pendingTargetAction={action,actorId,targetSide:'ally'};cameraPreview='party';supportDemo=null;selectedAllyId=party.find(p=>p.hp>0&&p.id!==actorId)?.id||actorId;
 const actionName=actor.id==='cloud'?'Restoration':action==='skill'?'Tune':'Ultimate';say(`Select a living ally for ${actor.name}'s ${actionName} on the field or in their portrait card.`);return true;
}
function beginTargetSelection(action,actorId=activeId){
 const actor=party.find(p=>p.id===actorId);if(!actor||actor.hp<=0)return false;
 if((actor.id==='dawn'&&(action==='skill'||action==='ultimate'))||(actor.id==='cloud'&&action==='skill'))return beginDawnAllyTargetSelection(action,actorId);
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
 const resources={skillPoints:sp,skillPointCap:effectiveSpMax()},plan=combatEngine.resolveActionPlan({kit:combatKit('soul'),action:'skill',characterId:'soul'}),weapon=loadoutFor('soul').weapon,result=combatEngine.resolveEnhanceAction({actor:a,battle:resources,plan,currentStacks:soulEnhanceStacks,maxStacks:Infinity,premiumWeapon:weapon.selected==='premium'&&weapon.premiumOwned,spendingRemainder:soulEnhanceSpendingRemainder});if(!result){say('Enhance needs 1 Skill Point.');return false}sp=resources.skillPoints;soulEnhanceStacks=result.enhanceStacks;soulEnhanceSpendingRemainder=result.spendingRemainder;let refunded=result.refundedSkillPoints>0,recycled=false;
 const beforeSkillRuneSp=sp;applyRuneSkillEffects(a);recycled=sp>beforeSkillRuneSp;
 zeroSkillArmed=false;pendingTargetAction=null;cameraPreview=null;fx={kind:'self',visual:'soul-enhance',at:performance.now(),actor:a.id};
 log='SOUL ENHANCE: '+soulEnhanceStacks+' Skill Point(s) banked for the next Basic Attack.'+(recycled?' Recycle restored 1 Skill Point.':'')+(refunded?' Standard signature weapon restored 1 Skill Point.':'');return true;
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
function liveBattleOutcome(){return combatEngine.resolveBattleOutcome({allies:party,enemies:enemies.filter(e=>e.hp>0),encounterComplete:encounterCleared,noEnemyMeansVictory:false})}
function totalEnemyHp(){return liveEnemies().reduce((n,e)=>n+e.hp,0)}
function syncEnemyHp(){enemyHp=totalEnemyHp();maxEnemyHp=liveEnemies().reduce((n,e)=>n+e.maxHp,0)}
function chosenEnemy(){return liveEnemies().find(e=>e.id===selectedEnemyId)||liveEnemies()[0]||null}
function enemyBattleSprite(enemy){return enemy?.battleSprite}
function buildWavePlan(sizes,authoredWaves=null){
 if(!Array.isArray(sizes)||!sizes.length||!sizes.every(n=>Number.isInteger(n)&&n>=1&&n<=15))throw Error('Wave sizes must each be 1–15');
 return sizes.map((size,wi)=>validateWaveComposition(Array.from({length:size},(_,i)=>{
  const mixedCommon=['slime','wolf','hawk'][(wi+i)%3],commonId=enemyRosterMode==='mixed'?mixedCommon:enemyRosterMode==='wolf'?'wolf':enemyRosterMode==='hawk'?'hawk':'slime';
  const finalMixedWave=enemyRosterMode==='mixed'&&wi===sizes.length-1,firstMixedWave=enemyRosterMode==='mixed'&&sizes.length>1&&wi===0;
  const mixedBoss=finalMixedWave&&i===0,mixedBossElite=finalMixedWave&&(i===1||i===2),mixedLeader=firstMixedWave&&i===0;
  const authoredEnemy=authoredWaves?.[wi][i];
  const model=authoredEnemy?ENEMY_ARCHETYPES[authoredEnemy.enemyId]:enemyRosterMode==='goblin'?(i<ENCOUNTER_LIMITS.elitesPerWave?ENEMY_ARCHETYPES.goblin:ENEMY_ARCHETYPES.slime):enemyRosterMode==='geode'?(i<ENCOUNTER_LIMITS.elitesPerWave?ENEMY_ARCHETYPES.geode:ENEMY_ARCHETYPES.slime):enemyRosterMode==='bear'?(i===0?ENEMY_ARCHETYPES.bear:ENEMY_ARCHETYPES.slime):enemyRosterMode==='hawk'?ENEMY_ARCHETYPES.hawk:mixedBoss?ENEMY_ARCHETYPES.bear:finalMixedWave&&i===2?ENEMY_ARCHETYPES.geode:(mixedBossElite||mixedLeader)?ENEMY_ARCHETYPES.goblin:ENEMY_ARCHETYPES[commonId];
  const category=validateEnemyCategory(model.category),tags=validateEnemyTags(model.tags,category),level=authoredEnemy?.level??model.level??1;
  const stats=enemyStatsAtLevel({hp:model.hp,attack:model.baseAttack,physicalDefense:model.basePhysicalDefense,magicalDefense:model.baseMagicalDefense,speed:model.speed},level);
  return {id:`wave${wi+1}-enemy${i+1}`,archetypeId:model.id,name:model.name,tags,
   wave:wi+1,order:i+1,category,healthBars:validateEnemyHealthBars(category,model.healthBars??1),level,maxHp:stats.hp,speed:model.speed,baseSpeed:model.speed,
   baseAttack:model.baseAttack,
   basePhysicalDefense:model.basePhysicalDefense,baseMagicalDefense:model.baseMagicalDefense,lifesteal:model.lifesteal??0,lifestealModifiers:{...(model.lifestealModifiers||{})},bleedStacks:[],bleedMaxStacks:model.bleedMaxStacks??5,
   battleSprite:model.battleSprite,battleAspectRatio:model.battleAspectRatio,art:model.artwork,artwork:model.artwork,barrierPercent:model.barrierPercent??.2,passive:{...model.passive},basicAttack:{...model.basicAttack},basicAttackCount:0,rampageStacks:0,momentumStacks:0};
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
 const e={...incoming,echoPercent:incoming.echoPercent??0,slot,x:formation.x,y:formation.y,w:formation.w,h:formation.h,hp:incoming.maxHp,shield:incoming.shield||0,maxBarrier:barrier,barrier,brokenTurns:0,debuffs:[],marks:[],tauntEffects:[],reinforcement:waveKills>0,entryPending:waveKills>0,enteredAt:waveKills>0?performance.now():null};
 const lily=party.find(p=>p.id==='lily'),soulMarkTurns=lily?upgradeValueFor('lily.premium-duplicate.2.entry-marks','entrySoulMarkTurns','lily'):0,ricochetTurns=lily?upgradeValueFor('lily.premium-duplicate.2.entry-marks','entryRicochetTurns','lily'):0;
 if(soulMarkTurns>0||ricochetTurns>0){if(soulMarkTurns>0)combatEngine.setTimedMark({target:e,mark:{id:'soul-mark',turns:soulMarkTurns}});if(ricochetTurns>0)combatEngine.setTimedMark({target:e,mark:{id:'ricochet',turns:ricochetTurns,sources:[]}});combatEngine.recordUpgradeEffect('lily.premium-duplicate.2.entry-marks',{actorId:lily.id,targetIds:[e.id],trigger:'on_enemy_enter',values:{soulMarkTurns,ricochetTurns}})}
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
 const authoredWaves=campaignEntry?.encounter.waves.map(wave=>wave.flatMap(group=>Array(group.quantity).fill(group)));
 wavePlan=authoredWaves?buildWavePlan(authoredWaves.map(wave=>wave.length),authoredWaves):buildWavePlan(waveOverride||WAVE_PRESETS[wavePreset]);waveIndex=-1;waveQueue=[];waveKills=0;
 for(const ally of party){ally.residueStacks=0;ally.residueTurns=0;ally.residueMaxStacks=null;ally.residueDamageReductionPerStack=null;ally.residueResistanceReductionPerStack=null}
 totalEnemyDefeats=0;encounterCleared=false;spawnHistory=[];enemies=[];selectedEnemyId=null;actingEnemyId=null;pendingVacancies=[];attackInProgress=false;lastAttack=null;supportDemo=null;supportTestHistory=[];
 beginWave(0);
}
function resolveEnemyDefeat(victim,{deferSettlement=false}={}){
 if(!victim||victim.hp>0||victim.deathAt||!enemies.some(e=>e.id===victim.id))return null;
 combatEngine.clearUnitEffects(victim,{reason:'defeat',taunts:true});
 // Keep the defeated unit on stage for a visible fade-out. Its zero HP keeps it
 // out of targeting and turn order while its slot remains unavailable.
 victim.deathAt=performance.now();delete gauges[victim.id];
 pendingVacancies.push(victim.slot);waveKills++;totalEnemyDefeats++;
 if(lastAttack&&attackInProgress&&!lastAttack.finished)lastAttack.defeats.push({id:victim.id,slot:victim.slot});
 syncEnemyHp();
 if(!attackInProgress&&!deferSettlement)schedule(()=>{if(!attackInProgress)settleAfterAttack()},ENEMY_DEATH_BEAT_MS);
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
 const amplifyEffect=lastAttack.runeAmplifyActive?activeRuneEffect(lastAttack.actor,'amplify','basic'):null,actionDamage=amplifyEffect?roundHp(damage*(1+amplifyEffect.damageBonus)):damage;
 const dealt=applyEnemyDamage(enemy,actionDamage,source,{damageType:lastAttack.damageType,eventType:'direct_hit',actionId:lastAttack.serial});
 if(source?.id==='zero'&&dealt.damage>0)zeroHitEnemyIds.add(enemy.id);
 lastAttack.hits.push({index:hitNumber,target:enemy.id,slot:enemy.slot,damage:dealt.damage+dealt.breakDamage,healthDamage:dealt.healthDamage,shieldDamage:dealt.shieldDamage,hpAfter:enemy.hp,barrierDamage:dealt.barrierDamage,breakDamage:dealt.breakDamage,barrierAfter:enemy.barrier,broken:dealt.broken,critical:dealt.critical,criticalMultiplier:dealt.criticalMultiplier,dodged:!!dealt.dodged,eventType:dealt.eventType,sourceId:dealt.sourceId,actionId:dealt.actionId,phase:'initial'});
 if(dealt.reflect)lastAttack.hits.push({index:lastAttack.hits.length+1,target:source?.id||null,damage:dealt.reflect.damage,healthDamage:dealt.reflect.healthDamage,shieldDamage:dealt.reflect.shieldDamage,damageType:'true',reflect:true,eventType:dealt.reflect.eventType,sourceId:dealt.reflect.sourceId,actionId:dealt.reflect.actionId,phase:'reflect'});
 if(dealt.echo)lastAttack.hits.push({index:lastAttack.hits.length+1,target:enemy.id,slot:enemy.slot,damage:dealt.echo.damage,healthDamage:dealt.echo.healthDamage,damageType:dealt.echo.damageType,echo:true,eventType:dealt.echo.eventType,sourceId:dealt.echo.sourceId,actionId:dealt.echo.actionId,phase:'echo'});
 if(dealt.echoReflect)lastAttack.hits.push({index:lastAttack.hits.length+1,target:source?.id||null,damage:dealt.echoReflect.damage,healthDamage:dealt.echoReflect.healthDamage,shieldDamage:dealt.echoReflect.shieldDamage,damageType:'true',reflect:true,eventType:dealt.echoReflect.eventType,sourceId:dealt.echoReflect.sourceId,actionId:dealt.echoReflect.actionId,phase:'echo-reflect'});
 const slowStartBefore=source?.id==='tsunade'?(source.marks||[]).filter(mark=>mark.id==='tsunade-slow-start').length:0;
 const hitEffects=source?combatEngine.resolveHitEffects({actor:source,target:enemy,hit:{dodged:!!dealt.dodged,damage:dealt.damage,actionId:dealt.actionId},action:lastAttack.action,eventType:dealt.eventType,passives:combatKit(source.id)?.passives||[],ability:combatKit(source.id)?.[lastAttack.action],characterDuplicates:characterDuplicateRank(source.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(source.id),hasPremiumWeapon:loadoutFor(source.id).weapon.selected==='premium'&&loadoutFor(source.id).weapon.premiumOwned,allies:party,isEnemyTarget:true}):[];
 if(source)combatEngine.resolveTsunadeAbilityEffect({actor:source,target:enemy,ability:combatKit(source.id)?.[lastAttack.action],action:lastAttack.action,hit:{dodged:!!dealt.dodged,damage:dealt.damage,actionId:dealt.actionId,eventType:dealt.eventType}});
 if(slowStartBefore!==(source?.marks||[]).filter(mark=>mark.id==='tsunade-slow-start').length)syncTurnTimeline();
 if(hitEffects.some(effect=>effect.type==='exposed'))emitCombatVisual('lily-exposed',[enemy.id],COMBAT_ACTION_EFFECT_MS);
 if(deferRicochet){if(!lastAttack.pendingRicochet)lastAttack.pendingRicochet={enemyId:enemy.id,damage:dealt.damage}}
 else triggerRicochet(lastAttack,enemy,dealt.damage);
 if(hitEffects.some(effect=>effect.type==='ricochet-mark'))emitCombatVisual('lily-ricochet-mark',[enemy.id],1000);
 if(enemy.hp<=0)resolveEnemyDefeat(enemy);else syncEnemyHp();
 return true;
}
function triggerRicochet(sourceAttack,hitEnemy,sourceDamage){
 if(!sourceAttack||sourceAttack.ricochetFollowUp||sourceDamage<=0)return;
 const eligibleIds=sourceAttack.ricochetEligibleEnemyIds;
 const marked=liveEnemies().filter(e=>(!eligibleIds||eligibleIds.includes(e.id))&&e.marks?.some(m=>m.id==='ricochet'));
 const lily=party.find(p=>p.id==='lily');if(!lily)return;
 const allocations=combatEngine.resolveRicochetPlan({targets:marked,sourceId:sourceAttack.serial,sourceDamage,eventType:sourceAttack.action==='summon'?'summon_hit':'direct_hit',repeats:upgradeValueFor('lily.duplicate.4.ricochet-repeat','ricochetRepeats','lily',1),secondHitMultiplier:upgradeValueFor('lily.duplicate.4.ricochet-repeat','ricochetSecondHitMultiplier','lily',.5)}),triggered=[...new Set(allocations.map(entry=>entry.target))];
 if(!triggered.length)return;
 sourceAttack.ricochetFollowUp=true;const damageByTarget={};
 const dodgedTargets=[];for(const entry of allocations){const enemy=entry.target;if(enemy.hp<=0)continue;const reduction=calculateTrueDamageReduction(lily,enemy),amount=roundHp(entry.damage*(1-(Number.isFinite(reduction)?reduction:0))),dealt=applyEnemyDamage(enemy,amount,lily,{damageType:'true',eventType:'ricochet_hit',actionId:sourceAttack.serial});damageByTarget[enemy.id]=(damageByTarget[enemy.id]||0)+dealt.damage;if(dealt.dodged)dodgedTargets.push(enemy.id);sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,damage:dealt.damage,barrierDamage:dealt.barrierDamage,ricochet:true,ricochetSource:sourceAttack.serial,critical:dealt.critical,dodged:!!dealt.dodged,eventType:dealt.eventType,sourceId:dealt.sourceId,actionId:dealt.actionId,phase:'ricochet'});if(dealt.reflect)sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:lily.id,damage:dealt.reflect.damage,healthDamage:dealt.reflect.healthDamage,damageType:'true',reflect:true,eventType:dealt.reflect.eventType,sourceId:dealt.reflect.sourceId,actionId:dealt.reflect.actionId,phase:'reflect'});if(dealt.echo)sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,damage:dealt.echo.damage,damageType:dealt.echo.damageType,echo:true,eventType:dealt.echo.eventType,sourceId:dealt.echo.sourceId,actionId:dealt.echo.actionId,phase:'echo'});if(dealt.echoReflect)sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:lily.id,damage:dealt.echoReflect.damage,healthDamage:dealt.echoReflect.healthDamage,damageType:'true',reflect:true,eventType:dealt.echoReflect.eventType,sourceId:dealt.echoReflect.sourceId,actionId:dealt.echoReflect.actionId,phase:'echo-reflect'});const hitEffects=combatEngine.resolveHitEffects({actor:lily,target:enemy,hit:{dodged:!!dealt.dodged,damage:dealt.damage},action:'ricochet',eventType:dealt.eventType,passives:combatKit('lily')?.passives||[],characterDuplicates:characterDuplicateRank('lily'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('lily'),hasPremiumWeapon:loadoutFor('lily').weapon.selected==='premium'&&loadoutFor('lily').weapon.premiumOwned,allies:party,isEnemyTarget:true});if(hitEffects.some(effect=>effect.type==='exposed'))emitCombatVisual('lily-exposed',[enemy.id],COMBAT_ACTION_EFFECT_MS);if(enemy.hp<=0)resolveEnemyDefeat(enemy)
 }
 emitCombatVisual('lily-ricochet-trigger',triggered.map(e=>e.id),COMBAT_ACTION_EFFECT_MS,{damageByTarget,dodgedTargets});sourceAttack.ricochetFollowUp=false;syncEnemyHp();return triggered.length;
}
function cleanseEnemy(enemy,full=true){return combatEngine.clearUnitEffects(enemy,{full,taunts:full,bleed:full})}
function teamBaseTurns(faction){
 const allyAverage=TwoToneTurnTimeline.mean(party.map(p=>speedOf(p)));
 const enemyMembers=timelineEnemyMembers(),enemyAverage=TwoToneTurnTimeline.mean(enemyMembers.map(e=>speedOf(e)));
 const slower=Math.min(allyAverage,enemyAverage),teamAverage=faction==='enemy'?enemyAverage:allyAverage;
 return Math.max(1,teamAverage/slower);
}
function brokenDuration(speed,baseTurns){
 return Math.max(1,roundHp(baseTurns*Math.max(.5,Math.min(1.5,2-speed/100))));
}
function stealthChanceOf(unit){const base=Number.isFinite(unit?.stealth)?unit.stealth:0;return Math.min(1,Math.max(0,base))}
function echoPercentOf(source){const base=Number.isFinite(source?.echoPercent)?source.echoPercent:0,rune=lastAttack?.actor===source?.id?activeRuneDamageEffects[source.id]?.radiantMoon:null;return Math.max(0,Math.min(1,base+(rune?.echo??0)))}
function reflectPercentOf(source){const base=Number.isFinite(source?.reflectPercent)?source.reflectPercent:0,rune=activeRuneEffect(source?.id,'clear-skies','reflect',{shielded:shieldOf(source)>0});return Math.max(0,Math.min(1,base+(rune?.reflect??0)))}
function mechanicSourceForHit(attacker,eventType){
 if(!attacker)return null;const ownerId=attacker.archetypeId||attacker.id,kit=CHARACTER_COMBAT_DATA[ownerId]||ENEMY_COMBAT_DATA[ownerId];let slot=lastAttack?.actor===attacker.id?lastAttack.action:'basic',effect;
 if(eventType==='follow_up_hit'){slot='passive';effect=CHARACTER_COMBAT_DATA.soul?.passives.find(value=>value.type==='followUp')}
 else if(eventType==='ricochet_hit'){slot='skill';effect=CHARACTER_COMBAT_DATA.lily?.skill}
 else if(eventType==='summon_hit'){slot='ultimate';effect=CHARACTER_COMBAT_DATA.lily?.ultimate}
 else effect=kit?.[slot];
 const tags=(effect?.mechanicTags||[]).filter(tag=>['damage.direct','damage.physical','damage.magical','damage.true','damage.critical','damage.conditional_multiplier'].includes(tag)||tag.startsWith('trigger.')||tag.startsWith('limit.'));if(!tags.length)return null;
 return{componentId:slot==='passive'?`passive:${ownerId}/${effect.id||effect.type}`:`action:${ownerId}/${slot}`,mechanicTags:tags,trigger:effect.mechanicTriggers?.['damage.direct']||`on_${slot}`};
}
function applyEnemyDamage(enemy,rawDamage,attacker=null,{damageType=null,eventType='direct_hit',actionId=lastAttack?.serial??null}={}){
 const runeEffects=attacker?.id&&lastAttack?.actor===attacker.id?lastAttack.runeDamageEffects||{}:{},celestialRune=attacker&&party.includes(attacker)?combatEngine.resolveRuneEffect({setId:hasRuneSet(attacker.id,'celestial-star')?'celestial-star':null,trigger:'criticalStrike',ready:runeEffectReady(attacker.id,'celestial-star')}):null,exposed=enemy.marks?.filter(mark=>mark.id==='exposed').length||0,barrierDamageMultiplier=1+exposed*upgradeValueFor('lily.premium-duplicate.3.exposed-barrier-damage','exposedBarrierDamagePerStack','lily')+(attacker?.tune?.barrierDamageBonus||0),breakDamagePercent=.1+exposed*upgradeValueFor('lily.premium-duplicate.4.exposed-break-damage','exposedBreakDamagePerStack','lily'),primary={stealthChance:stealthChanceOf(enemy),criticalRate:attacker?(celestialRune?.forceCritical?1:criticalRateOf(attacker)):0,criticalDamage:attacker?criticalDamageOf(attacker)+(celestialRune?.criticalDamageBonus||0):0,damageReduction:Math.min(1,Math.max(0,enemy.tune?.damageReduction||0)),vulnerabilityMultiplier:enemy.brokenTurns>0?1.5:1,random:Math.random,barrierDamageMultiplier,breakDamagePercent,brokenDuration:brokenDuration(speedOf(enemy),teamBaseTurns('enemy')),reflectPercent:attacker?.hp>0?reflectPercentOf(enemy):0,echoPercent:attacker&&['physical','magical','true'].includes(damageType)?echoPercentOf(attacker):0};
 const reflectedTarget=attacker,reflectExposed=reflectedTarget?.marks?.filter(mark=>mark.id==='exposed').length||0;
 const mechanicSource=mechanicSourceForHit(attacker,eventType),additionalMechanicSources=[];
 if(runeEffects.darkMatter)additionalMechanicSources.push({componentId:'rune:dark-matter',mechanicTags:RUNE_COMBAT_RULES['dark-matter'].mechanicTags,trigger:'on_ability_damage'});
 if(attacker?.id&&hasRuneSet(attacker.id,'amplify')&&lastAttack?.actor===attacker.id&&lastAttack.runeAmplifyActive)additionalMechanicSources.push({componentId:'rune:amplify',mechanicTags:RUNE_COMBAT_RULES.amplify.mechanicTags,trigger:'on_basic'});
 if(attacker?.id&&lastAttack?.actor===attacker.id&&lastAttack.runeFollowUp)additionalMechanicSources.push({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'on_linked_ally_action'});
 const reflectMechanicSource=enemy?.id&&hasRuneSet(enemy.id,'clear-skies')&&shieldOf(enemy)>0?{componentId:'rune:clear-skies',mechanicTags:RUNE_COMBAT_RULES['clear-skies'].mechanicTags,trigger:'while_shielded'}:null,echoMechanicSource=runeEffects.radiantMoon?{componentId:'rune:radiant-moon',mechanicTags:RUNE_COMBAT_RULES['radiant-moon'].mechanicTags,trigger:'on_damaging_skill'}:null,defenseMechanicSource=stealthChanceOf(enemy)>0?{componentId:`trait:${enemy.archetypeId||enemy.id}/stealth`,mechanicTags:['defense.stealth'],trigger:'on_incoming_attack'}:null;
 const outcome=combatEngine.resolveDamageSequence({target:enemy,attacker,rawDamage,damageType,eventType,sourceId:attacker?.id||null,actionId,primary,mechanicSource,additionalMechanicSources,reflectMechanicSource,echoMechanicSource,defenseMechanicSource,
  calculateReflectDamage:(amount,reflector,target)=>{const attack=calculateAttack(reflector);if(!Number.isFinite(attack)||attack<=0)return null;return calculateTypedActionDamage('true',amount/attack,reflector,target)?.damageTaken??0},
  reflect:{stealthChance:stealthChanceOf(reflectedTarget),criticalRate:enemy?criticalRateOf(enemy):0,criticalDamage:enemy?criticalDamageOf(enemy):0,damageReduction:Math.min(1,Math.max(0,reflectedTarget?.tune?.damageReduction||0)),vulnerabilityMultiplier:reflectedTarget&&enemies.includes(reflectedTarget)&&reflectedTarget.brokenTurns>0?1.5:1,random:Math.random,barrierDamageMultiplier:1+reflectExposed*upgradeValueFor('lily.premium-duplicate.3.exposed-barrier-damage','exposedBarrierDamagePerStack','lily')+(enemy?.tune?.barrierDamageBonus||0),breakDamagePercent:.1+reflectExposed*upgradeValueFor('lily.premium-duplicate.4.exposed-break-damage','exposedBreakDamagePerStack','lily'),brokenDuration:reflectedTarget?brokenDuration(speedOf(reflectedTarget),teamBaseTurns('enemy')):0},
  echo:{random:Math.random,reflectPercent:reflectPercentOf(enemy),barrierDamageMultiplier:1,breakDamagePercent:.1+exposed*upgradeValueFor('lily.premium-duplicate.4.exposed-break-damage','exposedBreakDamagePerStack','lily'),brokenDuration:brokenDuration(speedOf(enemy),teamBaseTurns('enemy'))}});
 if(!outcome)return {damage:0,healthDamage:0,directHealthDamage:0,shieldDamage:0,breakShieldDamage:0,barrierDamage:0,breakDamage:0,broken:false,critical:false,criticalMultiplier:1,lifestealHealing:0,dodged:true,eventType,sourceId:attacker?.id||null,actionId};
 const {damage,critical,criticalMultiplier,directHealthDamage,healthDamage,barrierDamage,breakDamage,breakShieldDamage,broken}=outcome,shieldDamage=outcome.shieldDamage+breakShieldDamage;
 if(critical&&celestialRune&&combatEngine.startRuneCooldown(runeSetState(attacker.id),'celestial-star',turn,celestialRune.cooldownTurns)){attacker.runeActivations=(attacker.runeActivations||0)+1;combatEngine.recordMechanicEvent({componentId:'rune:celestial-star',mechanicTags:RUNE_COMBAT_RULES['celestial-star'].mechanicTags,trigger:'on_critical_strike',status:'applied',actorId:attacker.id,targetIds:[enemy.id],values:{forceCritical:celestialRune.forceCritical,criticalDamageBonus:celestialRune.criticalDamageBonus,cooldownTurns:celestialRune.cooldownTurns}})}
 if(shieldDamage>0&&runeCombatState[enemy.id]?.shieldRemaining>0)runeCombatState[enemy.id].shieldRemaining=Math.min(runeCombatState[enemy.id].shieldRemaining,shieldOf(enemy));
 if(shieldDamage>0)emitCombatVisual('shield-absorbed',[enemy.id],COMBAT_ACTION_EFFECT_MS,{damage:shieldDamage,remaining:shieldOf(enemy)});
 const lifestealHealing=applyLifesteal(attacker,healthDamage,eventType);
 const reflect=outcome.reflect?{damage:outcome.reflect.damage,healthDamage:outcome.reflect.healthDamage,shieldDamage:outcome.reflect.shieldDamage+outcome.reflect.breakShieldDamage,damageType:'true',dodged:!!outcome.reflect.dodged,eventType:outcome.reflect.eventType,sourceId:outcome.reflect.sourceId,actionId:outcome.reflect.actionId}:null;
 if(reflect){applyLifesteal(enemy,outcome.reflect.healthDamage,'reflect_hit');emitCombatVisual('reflect-damage',[attacker.id],COMBAT_ACTION_EFFECT_MS,{damage:reflect.healthDamage,shieldDamage:reflect.shieldDamage,dodged:reflect.dodged,sourceId:enemy.id,delayMs:COMBAT_ACTION_PHASE_GAP_MS});if(enemies.includes(attacker)&&attacker.hp<=0)resolveEnemyDefeat(attacker,{deferSettlement:phase==='enemy'})}
 let echo=null;
 if(outcome.echo&&attacker&&enemy.hp>0){
  const echoed=outcome.echo;if(echoed.shieldDamage+echoed.breakShieldDamage>0&&runeCombatState[enemy.id]?.shieldRemaining>0)runeCombatState[enemy.id].shieldRemaining=Math.min(runeCombatState[enemy.id].shieldRemaining,shieldOf(enemy));applyLifesteal(attacker,echoed.healthDamage,'echo_hit');echo={damage:echoed.damage,damageType,healthDamage:echoed.healthDamage,directHealthDamage:echoed.directHealthDamage,eventType:echoed.eventType,sourceId:echoed.sourceId,actionId:echoed.actionId};
  const now=performance.now(),stackIndex=combatVisualEvents.filter(event=>event.type==='echo-damage'&&event.targetIds.includes(enemy.id)&&event.at<=now+COMBAT_ACTION_EFFECT_MS&&event.at>=now-COMBAT_ACTION_EFFECT_MS).length;
  emitCombatVisual('echo-damage',[enemy.id],COMBAT_ACTION_EFFECT_MS,{damage:echoed.damage,healthDamage:echoed.healthDamage,shieldDamage:echoed.shieldDamage+echoed.breakShieldDamage,damageType,sourceId:attacker.id,stackIndex,delayMs:COMBAT_ACTION_PHASE_GAP_MS*(reflect?2:1)});
  if(echoed.reflect){const reflectedEcho={damage:echoed.reflect.damage,healthDamage:echoed.reflect.healthDamage,shieldDamage:echoed.reflect.shieldDamage+echoed.reflect.breakShieldDamage,damageType:'true',dodged:!!echoed.reflect.dodged,eventType:echoed.reflect.eventType,sourceId:echoed.reflect.sourceId,actionId:echoed.reflect.actionId};echo.reflect=reflectedEcho;applyLifesteal(enemy,echoed.reflect.healthDamage,'reflect_hit');emitCombatVisual('reflect-damage',[attacker.id],COMBAT_ACTION_EFFECT_MS,{damage:reflectedEcho.healthDamage,shieldDamage:reflectedEcho.shieldDamage,dodged:reflectedEcho.dodged,sourceId:enemy.id,delayMs:COMBAT_ACTION_PHASE_GAP_MS*2});if(enemies.includes(attacker)&&attacker.hp<=0)resolveEnemyDefeat(attacker,{deferSettlement:phase==='enemy'})}
  }
 syncEnemyHp();return {damage,healthDamage,directHealthDamage,shieldDamage,breakShieldDamage,barrierDamage,breakDamage,broken,critical,criticalMultiplier,lifestealHealing,reflect,echo,echoReflect:echo?.reflect||null,eventType,sourceId:attacker?.id||null,actionId};
}
function applyBleed(target,source,stacks=1,maxStacks=target?.bleedMaxStacks??5){
 if(!target||target.hp<=0||!source||!Number.isInteger(stacks)||stacks<1||!Number.isInteger(maxStacks)||maxStacks<1)return false;
 const ownerId=source.archetypeId||source.id,action=lastAttack?.actor===source.id?lastAttack.action:null,kit=CHARACTER_COMBAT_DATA[ownerId]||ENEMY_COMBAT_DATA[ownerId];
 const passive=kit?.passives?.find(effect=>effect.type==='bleed'||effect.id==='bleed');
 const actionEffect=['basic','skill','ultimate'].includes(action)?kit?.[action]:null;
 const effect=actionEffect?.mechanicTags?.includes('status.bleed')?actionEffect:passive;
 const componentId=effect?`${effect===passive?'passive':'action'}:${ownerId}/${effect.id||effect.type||action}`:null;
 const added=combatEngine.applyBleed({target,sourceId:source.id,stacks,maxStacks,sourceComponentId:componentId,
  mechanicTags:effect?.mechanicTags||['status.bleed','damage.over_time','trigger.per_hit','limit.stacks']});if(!added)return false;emitCombatVisual('bleed-applied',[target.id],COMBAT_ACTION_EFFECT_MS,{stacks:target.bleedStacks.length});return added;
}
function resolveBleedTick(target){
 if(!target||target.hp<=0||!target.bleedStacks?.length)return 0;
 const events=combatEngine.resolveBleedTick({target,units:[...party,...enemies]}),total=events.reduce((sum,event)=>sum+event.healthDamage,0);
 for(const event of events)applyLifesteal(event.source,event.healthDamage,'damage_over_time');
 emitCombatVisual('bleed-tick',[target.id],1000,{damage:total,stacks:target.bleedStacks.length});syncEnemyHp();return total;
}
function resolveSoulFollowUp(sourceAttack){
 const soul=party.find(p=>p.id==='soul'&&p.hp>0);if(!soul)return false;
 const attack=calculateAttack(soul),dupeBonus=upgradeValueFor('soul.duplicate.1.follow-up-damage','followUpDamageMultiplier','soul',1),rawTotal=Number.isFinite(attack)?roundHp(attack*.5*dupeBonus*celestialMultiplier(soul.id,'passive')):0;let total=0;
 const allocation=combatEngine.resolveFollowUpEvent({passive:soulFollowUpState,ownerId:soul.id,sourceActorId:sourceAttack.actor,sourceId:sourceAttack.serial,hits:sourceAttack.hits,enemies,action:sourceAttack.action,enhancedStacks:sourceAttack.enhanceSpent||0,totalDamage:rawTotal,maxCharges:soulFollowUpLimit(),refundEvery:upgradeValueFor('soul.premium-duplicate.4.follow-up-refund','followUpRefundEvery','soul'),characterDuplicates:characterDuplicateRank('soul'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('soul'),weaponType:loadoutFor('soul').weapon.selected,disabledUpgradeEffectIds:null});if(!allocation)return false;
 const affected=allocation.affectedTargets;
 for(const entry of allocation.targets){const enemy=entry.target,rate=attack>0?entry.damage/attack:0,amount=soulDamageForTarget(soul,enemy,rate);if(amount<=0)continue;const dealt=applyEnemyDamage(enemy,amount,soul,{damageType:'true',eventType:'follow_up_hit',actionId:sourceAttack.serial});total+=dealt.damage;sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,slot:enemy.slot,damage:dealt.damage,hpAfter:enemy.hp,barrierDamage:dealt.barrierDamage,barrierAfter:enemy.barrier,broken:dealt.broken,followUp:true,critical:dealt.critical,dodged:!!dealt.dodged,eventType:dealt.eventType,sourceId:dealt.sourceId,actionId:dealt.actionId,phase:'follow-up'});if(dealt.reflect)sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:soul.id,damage:dealt.reflect.damage,healthDamage:dealt.reflect.healthDamage,damageType:'true',reflect:true,eventType:dealt.reflect.eventType,sourceId:dealt.reflect.sourceId,actionId:dealt.reflect.actionId,phase:'reflect'});if(dealt.echo)sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:enemy.id,damage:dealt.echo.damage,damageType:dealt.echo.damageType,echo:true,eventType:dealt.echo.eventType,sourceId:dealt.echo.sourceId,actionId:dealt.echo.actionId,phase:'echo'});if(dealt.echoReflect)sourceAttack.hits.push({index:sourceAttack.hits.length+1,target:soul.id,damage:dealt.echoReflect.damage,healthDamage:dealt.echoReflect.healthDamage,damageType:'true',reflect:true,eventType:dealt.echoReflect.eventType,sourceId:dealt.echoReflect.sourceId,actionId:dealt.echoReflect.actionId,phase:'echo-reflect'});const hitEffects=combatEngine.resolveHitEffects({actor:soul,target:enemy,hit:{dodged:!!dealt.dodged,damage:dealt.damage},action:'follow-up',eventType:dealt.eventType,passives:combatKit('soul')?.passives||[],characterDuplicates:characterDuplicateRank('soul'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('soul'),hasPremiumWeapon:loadoutFor('soul').weapon.selected==='premium'&&loadoutFor('soul').weapon.premiumOwned,allies:party,isEnemyTarget:true});if(hitEffects.some(effect=>effect.type==='exposed'))emitCombatVisual('lily-exposed',[enemy.id],COMBAT_ACTION_EFFECT_MS);if(enemy.hp<=0)resolveEnemyDefeat(enemy)}
 const dodgedTargets=sourceAttack.hits.filter(hit=>hit.followUp&&hit.dodged).map(hit=>hit.target);sourceAttack.followUp={sourceSerial:sourceAttack.serial,damage:total,targets:affected.map(e=>e.id),procsRemaining:soulFollowUpState.remaining};emitCombatVisual('soul-follow-up',affected.map(e=>e.id),ANIMATION_STEP_MS*5,{damageByTarget:Object.fromEntries(sourceAttack.hits.filter(hit=>hit.followUp).map(hit=>[hit.target,hit.damage])),dodgedTargets,targetGeometry:Object.fromEntries(affected.map(e=>[e.id,{x:e.x,y:e.y,w:e.w,h:e.h}]))});syncEnemyHp();return total>0;
}
function resolveRuneUltimateEffects(attack){
 if(!attack||attack.action!=='ultimate'||attack.runeSetEffectsApplied)return false;
 attack.runeSetEffectsApplied=true;
 const infiniteEffect=activeRuneEffect(attack.actor,'infinite-space','ultimate');if(infiniteEffect){
 const enemyIds=[...new Set(enemies.filter(enemy=>enemy.hp>0&&(enemy.runeDelayImmunityByOwner?.[attack.actor]||0)<=0).map(enemy=>enemy.id))];
  const delayPercent=infiniteEffect.actionDelay;for(const id of enemyIds){const enemy=enemies.find(entry=>entry.id===id);addActionDelay(id,delayPercent);enemy.runeDelayImmunityByOwner=enemy.runeDelayImmunityByOwner||{};enemy.runeDelayImmunityByOwner[attack.actor]=RUNE_COMBAT_RULES['infinite-space'].immunityTurns}
  if(enemyIds.length)combatEngine.recordMechanicEvent({componentId:'rune:infinite-space',mechanicTags:RUNE_COMBAT_RULES['infinite-space'].mechanicTags,trigger:'on_ultimate',status:'applied',actorId:attack.actor,targetIds:enemyIds,values:{actionDelay:delayPercent,targetsAffected:enemyIds.length,immunityTurns:RUNE_COMBAT_RULES['infinite-space'].immunityTurns}});
  if(enemyIds.length)emitCombatVisual('rune-infinite-space',enemyIds,COMBAT_ACTION_EFFECT_MS,{delayPercent});
 }
 return true;
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
  const soulSelfFollowUp=lastAttack.actor==='soul'&&lastAttack.action==='basic'&&(lastAttack.enhanceSpent||0)>=3;
  const soulFollowUpTriggered=lastAttack.actor&&party.some(p=>p.id===lastAttack.actor)&&(lastAttack.actor!=='soul'||soulSelfFollowUp)?resolveSoulFollowUp(lastAttack):false;
  if(soulFollowUpTriggered||lastAttack.followUp){
   const followUp=lastAttack.followUp;log=`Soul Follow-up • ${followUp.targets.length} ${followUp.targets.length===1?'enemy':'enemies'} take ${followUp.damage} True damage.`;
   schedule(()=>finishTrainingAttack(serial),COMBAT_ACTION_PHASE_GAP_MS);return;
  }
 }
 resolveRuneUltimateEffects(lastAttack);
 attackInProgress=false;lastAttack.finished=true;lastAttack.finishedAt=performance.now();
 if(lastAttack.actor==='lily'&&lastAttack.action==='ultimate'){
  const battleResources={skillPoints:sp,skillPointCap:effectiveSpMax()},weapon=loadoutFor('lily').weapon,result=combatEngine.resolveLilyPremiumUltimateEffects({actor:party.find(member=>member.id==='lily'),allies:party,battle:battleResources,characterDuplicates:characterDuplicateRank('lily'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('lily'),hasPremiumWeapon:weapon.selected==='premium'&&weapon.premiumOwned});sp=battleResources.skillPoints;
  if(!encounterCleared){const existing=summons.find(s=>s.ownerId==='lily');if(existing){summons=summons.filter(s=>s.id!==existing.id);turnTimeline.states.delete(existing.id)}
   const summonPlan=combatEngine.resolveSummonPlan({owner:party.find(member=>member.id==='lily'),characterDuplicates:characterDuplicateRank('lily'),sourceId:++summonSerial}),s={id:'lily-'+summonPlan.id,name:summonPlan.name.toUpperCase(),ownerId:summonPlan.ownerId,speed:summonPlan.speed,multiplier:summonPlan.multiplier,mode:'independent',remaining:summonPlan.durationTurns,pendingCreation:false,test:false};summons.push(s);syncTurnTimeline();turnTimeline.immediateFirst(s.id)}
 }
 if(lastAttack.actor==='soul'&&lastAttack.action==='ultimate'){combatEngine.refillFollowUps({passive:soulFollowUpState,maxCharges:soulFollowUpLimit()});lastAttack.followUpRefill=soulFollowUpState.remaining}
 if(lastAttack.actor==='zero'&&lastAttack.action==='ultimate'){
  const battleResources={skillPoints:sp,skillPointCap:effectiveSpMax()},result=combatEngine.resolveZeroUltimateEffects({actor:party.find(member=>member.id==='zero'),enemies:liveEnemies(),battle:battleResources,characterDuplicates:characterDuplicateRank('zero'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('zero'),hasPremiumWeapon:loadoutFor('zero').weapon.selected==='premium'&&loadoutFor('zero').weapon.premiumOwned});sp=battleResources.skillPoints;if(result?.delayed.length)emitCombatVisual('zero-delay',result.delayed,COMBAT_ACTION_EFFECT_MS);
 }
 if(lastAttack.actor==='logan'&&lastAttack.action==='ultimate'){const battleResources={skillPoints:sp,skillPointCap:effectiveSpMax()},weapon=loadoutFor('logan').weapon;combatEngine.resolveLoganUltimateEffects({actor:party.find(member=>member.id==='logan'),battle:battleResources,premiumWeaponDuplicates:premiumWeaponDuplicateRank('logan'),hasPremiumWeapon:weapon.selected==='premium'&&weapon.premiumOwned});sp=battleResources.skillPoints}
 const actingAlly=party.find(p=>p.id===lastAttack.actor);if(actingAlly&&lastAttack.action!=='ultimate'&&!lastAttack.runeFollowUp){const expired=combatEngine.ageUnitEffects(actingAlly,{event:'affected_turn_end'});if(expired.tuneExpired)syncTurnTimeline();ageRuneTurn(actingAlly.id)}
 if(pendingVacancies.length){schedule(()=>completeTrainingAttack(serial),ENEMY_DEATH_BEAT_MS);return}
 completeTrainingAttack(serial);
}
function nextUnitedLinkOwner(targetId,alreadyTriggered=[]){return party.find(owner=>owner.id!==targetId&&owner.hp>0&&hasRuneSet(owner.id,'united')&&!alreadyTriggered.includes(owner.id)&&runeSetState(owner.id).unitedLink?.targetId===targetId&&runeSetState(owner.id).unitedLink.actionsRemaining>0)||null}
function queueUnitedFollowUp(parent,linkedAllyId=parent.actor){
 const triggered=parent.unitedOwnersTriggered||(parent.unitedOwnersTriggered=[]),owner=nextUnitedLinkOwner(linkedAllyId,triggered);if(!owner)return false;const link=runeSetState(owner.id).unitedLink;
 triggered.push(owner.id);const targets=liveEnemies();if(!targets.length)return false;const target=targets[Math.floor(Math.random()*targets.length)];
 if(!executeCombatAction(owner,'basic',null,null,{kind:'united',targetId:target.id,linkedAllyId,damageMultiplier:RUNE_COMBAT_RULES.united.basicDamageMultiplier})){return queueUnitedFollowUp(parent,linkedAllyId)}
 lastAttack.unitedLinkActions=link?.actionsRemaining||1;expireUnitedLink(owner.id,linkedAllyId);
 unitedFollowUpParents.set(lastAttack.serial,parent);return true;
}
function completeTrainingAttack(serial,entryFinished=false){
 if(!lastAttack||lastAttack.serial!==serial||phase!=='resolve')return;
 const completed=lastAttack;if(!entryFinished)settleAfterAttack();
 if(!entryFinished&&enemies.some(e=>e.entryPending)){schedule(()=>{for(const enemy of enemies)if(enemy.entryPending)enemy.entryPending=false;completeTrainingAttack(serial,true)},ENEMY_REINFORCEMENT_ENTRY_MS);return}
 if(completed.runeFollowUp){
  const parent=unitedFollowUpParents.get(serial);unitedFollowUpParents.delete(serial);
  const owner=party.find(member=>member.id===completed.actor);
  if(owner&&completed.unitedLinkedAllyId)combatEngine.recordMechanicEvent({componentId:'rune:united',mechanicTags:RUNE_COMBAT_RULES.united.mechanicTags,trigger:'on_linked_ally_action',status:'applied',actorId:owner.id,targetIds:[completed.unitedLinkedAllyId,completed.initialTarget].filter(Boolean),actionId:serial,values:{basicAttack:true,damage:completed.hits.reduce((sum,hit)=>sum+(hit.damage||0)+(hit.shieldDamage||0)+(hit.barrierDamage||0),0),damageMultiplier:RUNE_COMBAT_RULES.united.basicDamageMultiplier,linkedAlly:completed.unitedLinkedAllyId,linkedActions:completed.unitedLinkActions||1}});
  if(parent&&queueUnitedFollowUp(parent,completed.actor))return;
  if(parent){lastAttack=parent;return completeTrainingAttack(parent.serial,true)}
 }
 if(!encounterCleared&&completed.action!=='ultimate'&&!completed.runeFollowUp)finishSummonCreationForTest(completed.actor);
 if(phase!=='resolve')return;
 resolveEternalSunAction(completed);
 if(liveBattleOutcome()==='victory'){cancelAllQueuedUltimates('victory');finishVictory();log='All enemies in every wave defeated.';return}
 if(!completed.runeFollowUp&&queueUnitedFollowUp(completed))return;
 if(!completed.runeFollowUp&&!completed.unitedLinkTurnAged&&completed.action!=='ultimate'){
  ageUnitedLinkTurn(completed.actor);completed.unitedLinkTurnAged=true;
 }
 if(completed.action==='ultimate'){ultimateHistory.push({event:'finished',actor:completed.actor,seq:completed.ultimateSeq,turn});ultimateExecuting=false;runNextUltimate()}
 else if(!completed.runeFollowUp)drainUltimateQueueBefore(()=>nextTurn());
}
function setEnemyTarget(id){if(phase!=='player'||paused)return false;const e=enemies.find(e=>e.id===id&&e.hp>0);if(!e)return false;selectedEnemyId=id;selectedAllyId=null;if(pendingTargetAction){const pending=pendingTargetAction;pendingTargetAction=null;cameraPreview=null;const actor=party.find(p=>p.id===pending.actorId);if(pending.action==='ultimate')return queueUltimate(pending.actorId);return executeCombatAction(actor,pending.action)}cameraPreview='target';log=`Target selected: ${e.name} (wave ${e.wave}, slot ${e.slot+1}).`;return true;}
function setWavePlanForTest(sizes){if(phase!=='setup')return false;try{buildWavePlan(sizes)}catch(e){return false}waveOverride=[...sizes];return true;}
function toggleWavePreset(){if(phase!=='setup')return;waveOverride=null;const choices=['stress','quick','sizes'];wavePreset=choices[(choices.indexOf(wavePreset)+1)%choices.length]}
function setEnemyRoster(mode){if(phase!=='setup'||!['slime','wolf','hawk','mixed','goblin','geode','bear'].includes(mode))return false;enemyRosterMode=mode;return true;}

const savedTeam=loadTeam();
let draft=[...savedTeam];
function validTeam(ids,ownedIds=ownedCharacterIds){return Array.isArray(ids)&&ids.length>=1&&ids.length<=MAX_PARTY_SIZE&&ids.every(id=>ROSTER_IDS.has(id)&&ownedIds.has(id))&&new Set(ids).size===ids.length}
function loadTeam(){try{const a=JSON.parse(localStorage.getItem(TEAM_KEY)||'null');if(validTeam(a))return a.slice(0,MAX_PARTY_SIZE)}catch(e){}return ['soul']}
function roster(id){return ROSTER.find(x=>x.id===id)}
function alive(){return party.filter(x=>x.hp>0)}
function active(){return party.find(x=>x.id===activeId)}
function say(message){hint=message;hintAt=performance.now()}
function schedule(fn,ms){const token=battleToken;setTimeout(()=>{if(token===battleToken)fn()},ms)}
function enterSelection(mandatory=false){saveVitals();campaignEntry=null;cameraPreview=null;selectedAllyId=null;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;pendingVacancies=[];cancelAllQueuedUltimates('reset');battleToken++;summons=[];combatEngine.resetBattle();phase='setup';paused=false;forceSelect=mandatory;draft=[...loadTeam()];activeId=null;log='';say(mandatory?'This encounter requires team confirmation.':DEV_MODE?'Review the party and battle test options.':'Review your party before battle.');}
function enterPartySetup(){
 saveVitals();battleToken++;cancelAllQueuedUltimates('party-setup');combatEngine.resetBattle();
 phase='partySetup';paused=false;forceSelect=false;draft=[...loadTeam()];activeId=null;actingEnemyId=null;
 cameraPreview=null;selectedAllyId=null;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;fx=null;hint='';
}
async function saveParty(){
 if(phase!=='partySetup'||!validTeam(draft))return false;
 try{await window.TwoToneAccount.action('set-team',{team:[...draft]});phase='menu';hint='';return true}
 catch(error){say('Party changes could not be saved.');return false}
}
function canAccessMainMenu(){
 return window.TwoToneAccount?.profile?.clearedCampaignEntries?.includes(FIRST_CAMPAIGN_ENTRY_ID)===true;
}
function startFromTitle(){
 if(phase!=='startup')return;
 if(canAccessMainMenu())enterMainMenu();
 else openCampaignEntry();
}
function enterMainMenu(){
 if(!canAccessMainMenu())return;
 saveVitals();
 if(campaignEntry)party=[];
 battleToken++;cancelAllQueuedUltimates('main-menu');combatEngine.resetBattle();
 campaignEntry=null;campaignReward=null;phase='menu';paused=false;activeId=null;actingEnemyId=null;cameraPreview=null;
 selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;attackInProgress=false;fx=null;hint='';
}
function addUnit(id){if(phase!=='partySetup')return;if(!isCharacterOwned(id)){say('This character is not owned.');return}if(draft.includes(id)){say('Already in the party.');return}if(draft.length>=MAX_PARTY_SIZE){say('A party can contain no more than four characters.');return}draft.push(id);}
function removeUnit(index){if(phase!=='partySetup')return;if(draft.length<=1){say('A party must contain at least one character.');return}draft.splice(index,1);}
const CAMPAIGN_CHOICES_PER_PAGE=8;
let expandedCampaignArc=null,expandedCampaignChapter=null,previewedCampaignEntry=null,campaignPage=0;

function campaignSelectorRows(){
 const rows=[];
 for(const arc of CAMPAIGN_ARCS){
  rows.push({title:arc.title,depth:0,arc,expanded:arc===expandedCampaignArc});
  if(arc!==expandedCampaignArc)continue;
  for(const chapter of arc.chapters){
   rows.push({title:chapter.title,depth:1,chapter,expanded:chapter===expandedCampaignChapter});
   if(chapter!==expandedCampaignChapter)continue;
   for(const part of chapter.parts){
    rows.push({title:'Part '+part.label,depth:2,entry:getCampaignEntry(part.entryId)});
   }
  }
 }
 return rows;
}

function openCampaignSelector(){
 if(phase!=='menu'||!canAccessMainMenu())return;
 expandedCampaignArc=CAMPAIGN_ARCS[0]??null;
 expandedCampaignChapter=expandedCampaignArc?.chapters[0]??null;
 const entries=(expandedCampaignChapter?.parts??[]).map(part=>getCampaignEntry(part.entryId)).filter(Boolean);
 const cleared=window.TwoToneAccount.profile.clearedCampaignEntries??[];
 previewedCampaignEntry=entries.find(entry=>!cleared.includes(entry.id)&&isCampaignEntryUnlocked(entry,cleared))??entries[0]??null;
 campaignPage=0;
 choiceRects=[];
 phase='campaign';
 hint='';
}

function chooseCampaignOption(index){
 if(phase!=='campaign')return;
 const row=campaignSelectorRows()[index];
 if(!row)return;
 choiceRects=[];
 if(row.entry){
  previewedCampaignEntry=row.entry;
  return;
 }
 if(row.arc){
  expandedCampaignArc=row.expanded?null:row.arc;
  expandedCampaignChapter=null;
 }else if(row.chapter){
  expandedCampaignChapter=row.expanded?null:row.chapter;
 }
 const lastPage=Math.max(0,Math.ceil(campaignSelectorRows().length/CAMPAIGN_CHOICES_PER_PAGE)-1);
 campaignPage=Math.min(campaignPage,lastPage);
}

function startPreviewedCampaignPart(){
 if(phase!=='campaign'||!previewedCampaignEntry)return;
 choiceRects=[];
 openCampaignEntry(previewedCampaignEntry.id);
}

function openCampaignEntry(entryId=FIRST_CAMPAIGN_ENTRY_ID){
 const entry=getCampaignEntry(entryId);
 if(!entry||!isCampaignEntryUnlocked(entry,window.TwoToneAccount?.profile?.clearedCampaignEntries))return;
 campaignEntry=entry;
 campaignReward=null;
 storyBeatIndex=0;
 prefetchedStoryBeatIndex=-1;
 storyBeatArt=requestStoryBeat(entry.story,entry.story.beats[0],'high');
 phase='story';
 hint='';
}
function advanceCampaignStory(){
 if(phase!=='story'||!campaignEntry)return;
 if(storyBeatIndex<campaignEntry.story.beats.length-1){
  storyBeatIndex++;
  storyBeatArt=requestStoryBeat(campaignEntry.story,campaignEntry.story.beats[storyBeatIndex],'high');
  return;
 }
 startCampaignBattle();
}
function startCampaignBattle(){
 draft=[...campaignEntry.encounter.party];
 campaignReward={status:'ready',coins:0,requestId:window.TwoToneAccount.createRequestId()};
 startBattle(campaignEntry.encounter.areaId);
}
function finishVictory(){
 phase='victory';
 if(campaignEntry&&!DEV_MODE)saveCampaignVictory();
}
async function saveCampaignVictory(){
 if(phase!=='victory'||!campaignEntry||!['ready','error'].includes(campaignReward?.status))return;
 const reward=campaignReward;
 reward.status='pending';
 try{
  const result=await window.TwoToneAccount.action('complete-campaign-entry',{entryId:campaignEntry.id},reward.requestId);
  reward.coins=result.rewards[0]?.coins??0;
  reward.rankXp=result.rewards[0]?.rankXp??0;
  reward.status='saved';
 }catch{
  reward.status='error';
 }
}
function startBattle(areaId=DEFAULT_BATTLE_AREA_ID){
 if(!BATTLE_AREAS[areaId]){say('Unknown battle area.');return false}
 if((!campaignEntry&&phase!=='setup')||!validTeam(draft)){say('Set a party of 1–4 unique characters in Party first.');return}
 currentBattleAreaId=areaId;
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 party=draft.map(id=>spawnProgressedUnit(id,Boolean(campaignEntry)));
 combatEngine.resetBattle();pendingTargetAction=null;speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;actingEnemyId=null;prepareBattleIntro();zeroSkillArmed=false;fx=null;paused=false;phase='intro';forceSelect=false;saveVitals();
 log=`Wave 1/${wavePlan.length}: ${wavePlan[0].length} enemies (${enemies.length} on field).`;
 schedule(()=>{if(phase==='intro')nextTurn()},CAMERA_TRANSITION_BETWEEN_SIDES_MS);
}
function replay(){if(phase==='setup'||phase==='story')return;if(campaignEntry){if(!['pending','error'].includes(campaignReward?.status))startCampaignBattle();return}draft=party.map(p=>p.id);startFromBattle();}
function startFromBattle(){
 cameraPreview=null;selectedAllyId=null;supportDemo=null;zeroSkillArmed=false;targetingMode='single';battleToken++;
 saveVitals();party=party.map(p=>spawnProgressedUnit(p.id));
 combatEngine.resetBattle();pendingTargetAction=null;speedModifiers=Object.create(null);summons=[];summonSerial=0;summonHistory=[];gauges={};for(const p of party)gauges[p.id]=0;
 resetEnemies();resetActionResources();enemyCount=0;turn=0;activeId=null;actingEnemyId=null;prepareBattleIntro();zeroSkillArmed=false;fx=null;paused=false;phase='intro';saveVitals();
 log=`Wave test restarted: ${wavePlan.length} waves, ${wavePlan.reduce((n,w)=>n+w.length,0)} total enemies.`;
 schedule(()=>{if(phase==='intro')nextTurn()},CAMERA_TRANSITION_BETWEEN_SIDES_MS);
}
function applyResidue(target,passive={}){if(!combatEngine.applyResidue({target,maxStacks:passive.maxStacks??RESIDUE_RULES.maxStacks,damageReductionPerStack:passive.damageReductionPerStack??RESIDUE_RULES.damageReductionPerStack,resistanceReductionPerStack:passive.resistanceReductionPerStack??RESIDUE_RULES.resistanceReductionPerStack,durationTurns:RESIDUE_RULES.durationTurns}))return false;emitCombatVisual('slime-residue',[target.id],1000);return true}
function resolveEnemyBasicAttack(attacker,candidates){
 const basic=attacker.basicAttack||{},passive=attacker.passive||null,rampage=passive?.id==='rampage',momentum=passive?.id==='momentum';
 const passivePlan=combatEngine.resolveEnemyBasicPlan({ownerId:attacker.archetypeId||attacker.id,actorId:attacker.id,basic,passive,attackCount:attacker.basicAttackCount||0,rampageStacks:attacker.rampageStacks||0,momentumStacks:attacker.momentumStacks||0,debuffMultiplier:(attacker.debuffs||[]).reduce((value,debuff)=>value*(debuff.damageMultiplier??1),1)});
 if(!passivePlan)return {hits:[],enhanced:false,mode:'single',pursuitAdvance:0};
 attacker.basicAttackCount=passivePlan.nextAttackCount;
 const enhanced=passivePlan.enhanced,mode=passivePlan.target;
 const originalPrimary=candidates[Math.floor(Math.random()*candidates.length)],tauntSelection=mode==='aoe'?{target:originalPrimary,taunted:false}:resolveTauntTarget(attacker,candidates,originalPrimary),primary=tauntSelection.target||originalPrimary;
 if(tauntSelection.taunted)emitCombatVisual('taunt-redirect',[attacker.id],COMBAT_ACTION_EFFECT_MS,{rate:tauntRateOf(attacker,primary),taunterId:primary.id});
 const candidateSlots=candidates.map(target=>({...target,slot:party.indexOf(target)})),primarySlot=candidateSlots.find(target=>target.id===primary.id),targets=combatEngine.resolveTargets({candidates:candidateSlots,mode,primary:primarySlot}).map(target=>candidates.find(candidate=>candidate.id===target.id)).filter(Boolean);
 const multiplier=passivePlan.multiplier,actionId=++attackSerial;
 const hits=targets.map(target=>{
  const calculated=basic.damageType?calculateTypedActionDamage(basic.damageType,multiplier,attacker,target):null;
  const damage=calculated?.damageTaken??(basic.damageType?0:92+((turn*37)%51));
  const dealt=applyEnemyDamage(target,damage,attacker,{damageType:basic.damageType,eventType:'direct_hit',actionId});if(!dealt.dodged)target.energy=Math.min(120,target.energy+10);if(passivePlan.bleedPerHit&&!dealt.dodged)applyBleed(target,attacker,passivePlan.bleedPerHit,passivePlan.bleedCap);if(attacker.passive?.id==='residue'&&dealt.damage>0)applyResidue(target,attacker.passive);
  combatEngine.resolveHitEffects({actor:attacker,target,hit:{dodged:!!dealt.dodged,damage:dealt.damage,actionId},action:'basic',eventType:dealt.eventType,passives:[],ability:combatKit(attacker.archetypeId)?.basic,isEnemyTarget:false});
  return {target:target.id,damage:dealt.damage+dealt.breakDamage,healthDamage:dealt.healthDamage,shieldDamage:dealt.shieldDamage,barrierDamage:dealt.barrierDamage,breakDamage:dealt.breakDamage,barrierAfter:target.barrier,broken:dealt.broken,critical:dealt.critical,dodged:!!dealt.dodged,reflect:dealt.reflect||null,echo:dealt.echo||null,echoReflect:dealt.echoReflect||null};
 });
 if(rampage&&hits.some(hit=>hit.damage>0))attacker.rampageStacks=passivePlan.nextRampageStacks;
 if(momentum)attacker.momentumStacks=passivePlan.nextMomentumStacks;
 return {hits,enhanced,mode,pursuitAdvance:passivePlan.pursuitAdvance};
}
function nextTurn(){
 if(paused||['setup','victory','defeat'].includes(phase))return;
 const outcome=liveBattleOutcome();if(outcome==='victory'){finishVictory();return}if(outcome==='defeat'){phase='defeat';return}
 if(liveEnemies().length===0){say('Wave state has no active enemies.');return}
 const inputs=turnTimelineInputs(),nextEvent=combatEngine.scheduleTurn(inputs);if(!nextEvent)return;
 syncLegacyGauges();const next=nextEvent.id;
 turn++;
 const actingSummon=summons.find(s=>s.id===next&&s.mode==='independent');
 if(actingSummon){executeIndependentSummonTurn(actingSummon);return;}
 const bleedTarget=[...party,...enemies].find(unit=>unit.id===next&&unit.hp>0),attacking=enemies.find(e=>e.id===next&&e.hp>0);
 if(bleedTarget?.bleedStacks?.length){resolveBleedTick(bleedTarget);if(!enemies.includes(bleedTarget))saveVitals();if(bleedTarget.hp<=0){if(enemies.includes(bleedTarget))resolveEnemyDefeat(bleedTarget);schedule(()=>nextTurn(),ENEMY_DEATH_BEAT_MS);return}}
 if(attacking&&attacking.brokenTurns>0){attacking.brokenTurns--;if(attacking.brokenTurns===0){attacking.barrier=attacking.maxBarrier;cleanseEnemy(attacking);addActionAdvance(attacking.id,100);}combatEngine.ageUnitEffects(attacking,{event:'affected_turn_end'});schedule(()=>nextTurn(),0);return;}
 if(attacking&&(attacking.debuffs||[]).some(effect=>effect.id==='stun')){combatEngine.ageUnitEffects(attacking,{event:'affected_turn_end'});log=`${attacking.name} is stunned and loses this turn.`;schedule(()=>nextTurn(),0);return;}
 const scheduledAlly=party.find(p=>p.id===next&&p.hp>0);
 if(scheduledAlly?.debuffs?.some(effect=>effect.id==='stun')){activeId=null;combatEngine.ageUnitEffects(scheduledAlly,{event:'affected_turn_end'});log=`${scheduledAlly.name} is stunned and loses this turn.`;schedule(()=>nextTurn(),0);return;}
 if(attacking){activeId=null;zeroSkillArmed=false;pendingTargetAction=null;actingEnemyId=next;cameraPreview=null;phase='enemy';log=`${attacking.name} prepares an attack.`;
  schedule(()=>{if(phase!=='enemy'||paused)return;if(attacking.hp<=0){nextTurn();return}const candidates=alive();if(liveBattleOutcome()==='defeat'||!candidates.length){cancelAllQueuedUltimates('defeat');phase='defeat';return}enemyCount++;const attack=resolveEnemyBasicAttack(attacking,candidates),firstHit=attack.hits[0];if(attack.pursuitAdvance)addActionAdvance(attacking.id,attack.pursuitAdvance);combatEngine.ageUnitEffects(attacking,{event:'affected_turn_end'});ageRuneDelayImmunity(attacking);saveVitals();cancelQueuedUltimatesOfDefeated();const visual=ENEMY_ACTION_VISUALS[attacking.archetypeId]?.basic||ENEMY_ACTION_VISUALS.slime.basic;fx={kind:'enemy',visual,at:performance.now(),damage:firstHit.damage,target:firstHit.target,hits:attack.hits,actorEnemyId:attacking.id};log=attack.hits.length&&attack.hits.every(hit=>hit.dodged)?`${attacking.name}'s attack was dodged.`:attack.enhanced?`${attacking.name} uses Slimy against all allied characters.`:attack.mode==='aoe'?`${attacking.name} attacks all allied characters.`:attack.mode==='blast'?`${attacking.name} blasts ${attack.hits.length} allied characters.`:firstHit.dodged?`${party.find(p=>p.id===firstHit.target)?.name||'An ally'} dodges ${attacking.name}'s attack.`:`${attacking.name} hits ${party.find(p=>p.id===firstHit.target)?.name||'an ally'} for ${firstHit.damage}.`;const reflectDamage=attack.hits.reduce((sum,hit)=>sum+((hit.reflect?.healthDamage||0)+(hit.reflect?.shieldDamage||0)+(hit.echoReflect?.healthDamage||0)+(hit.echoReflect?.shieldDamage||0)),0),echoDamage=attack.hits.reduce((sum,hit)=>sum+(hit.echo?.damage||0),0),echoHit=attack.hits.find(hit=>hit.echo)?.echo,hasReflect=attack.hits.some(hit=>hit.reflect||hit.echoReflect),hasEcho=attack.hits.some(hit=>hit.echo);if(reflectDamage)log+=` Reflect deals ${reflectDamage} True damage.`;if(echoDamage)log+=` Echo deals ${echoDamage} ${echoHit?.damageType?.toUpperCase()||'typed'} damage.`;if(attacking.passive?.id==='momentum')log+=` Momentum ${attacking.momentumStacks}/${attacking.passive.maxStacks??10}.`;phase='resolve';schedule(()=>{settleAfterAttack();drainUltimateQueueBefore(()=>{if(liveBattleOutcome()==='defeat'){phase='defeat';log='All allied characters were defeated.'}else nextTurn()})},ENEMY_ATTACK_EFFECT_MS+COMBAT_ACTION_PHASE_GAP_MS*((hasReflect?1:0)+(hasEcho?(hasReflect?2:1):0)))},ENEMY_WINDUP_MS);
 }else{actingEnemyId=null;activeId=next;zeroSkillArmed=false;pendingTargetAction=null;cameraPreview=null;phase='player';log=`${active().name}'s turn — select an ability, then choose an enemy.`;}
}
// Normal turns can use Basic or Skill. Ultimate is off-turn and never spends a turn.
function play(action){
 if(phase!=='player'||paused||!['basic','skill','ultimate'].includes(action))return false;
 const a=active();if(!a||a.hp<=0)return false;
 if(action==='skill'&&a.id==='soul'){pendingTargetAction=null;cameraPreview=null;return activateSoulEnhance()}
 if(action==='skill'&&(a.id==='dawn'||a.id==='cloud'))return beginDawnAllyTargetSelection('skill',a.id);
 return beginTargetSelection(action,a.id);
}
function soulDamageForTarget(actor,target,rate){return calculateTypedActionDamage('true',rate,actor,target)?.damageTaken??0}
function applyDawnTune(ally,plan=combatEngine.resolveActionPlan({kit:combatKit('dawn'),action:'skill',characterId:'dawn',characterDuplicates:characterDuplicateRank('dawn')})){
 if(!ally||ally.hp<=0)return false;
 const duplicates=characterDuplicateRank('dawn'),weapon=loadoutFor('dawn').weapon,premium=weapon.selected==='premium'&&weapon.premiumOwned,weaponDuplicates=premium?premiumWeaponDuplicateRank('dawn'):0;
 const result=combatEngine.resolveDawnTune({actor:party.find(member=>member.id==='dawn'),target:ally,plan,characterDuplicates:duplicates,premiumWeaponDuplicates:weaponDuplicates,weaponType:weapon.selected});
 if(!result)return false;syncTurnTimeline();return true;
}
function applyLoganBloodShield(logan,plan=combatEngine.resolveActionPlan({kit:combatKit('logan'),action:'skill',characterId:'logan',characterDuplicates:characterDuplicateRank('logan')})){
 if(!logan||logan.hp<=0)return false;
 const weapon=loadoutFor('logan').weapon,recipients=party.filter(ally=>ally.hp>0),result=combatEngine.resolveLoganBloodShield({actor:logan,allies:recipients,enemies:liveEnemies(),plan,characterDuplicates:characterDuplicateRank('logan'),premiumWeaponDuplicates:premiumWeaponDuplicateRank('logan'),weaponType:weapon.selected});
 if(!result)return false;saveVitals();for(const entry of result.shields)if(entry.amount>0)emitCombatVisual('shield-applied',[entry.target.id],1000,{shield:entry.amount,totalShield:entry.target.shield});
 if(result.tauntsApplied)for(const enemy of liveEnemies())emitCombatVisual('taunt-applied',[enemy.id],COMBAT_ACTION_EFFECT_MS,{rate:result.tauntRate,turns:result.tauntTurns,taunterId:logan.id});
 emitCombatVisual('logan-blood-shield',recipients.map(ally=>ally.id),COMBAT_ACTION_EFFECT_MS,{healthCost:result.healthCost,shieldPerAlly:result.shieldPerAlly});return result;
}
function executeCombatAction(a,action,ultimateSeq=null,allyTargetId=null,runeAction=null){
 if(!a||a.hp<=0||!['basic','skill','ultimate'].includes(action))return false;
 const authoredType=combatKit(a.id)?.[action]?.type,allySingleSupport=['tune','dawnSupport','cloudRestoration'].includes(authoredType),dawnSupport=authoredType==='tune'||authoredType==='dawnSupport',teamWideSupport=actionTargetMode(a,action)==='allAllies',supportAction=allySingleSupport||teamWideSupport,allyTarget=allySingleSupport?party.find(p=>p.id===allyTargetId&&p.hp>0):null;
 if(allySingleSupport&&!allyTarget){say(`${a.name}'s ability needs a living ally target.`);return false}
 const victim=supportAction?null:(runeAction?.targetId?enemies.find(enemy=>enemy.id===runeAction.targetId&&enemy.hp>0):chosenEnemy());if(!supportAction&&!victim){say('No available enemy target.');return false;}
 const targetGeometry=victim?{x:victim.x,y:victim.y,w:victim.w,h:victim.h,slot:victim.slot}:null;
 const mode=supportAction?'ally':runeAction?combatKit(a.id)?.[action]?.target||'single':actionTargetMode(a,action),targets=supportAction?[]:chooseAttackTargets(mode,victim);
 const controlledSummon=action==='skill'&&a.test?summons.find(s=>s.mode==='controlled'&&!s.pendingCreation&&s.ownerId===a.id):null;
 let runeAmplifyActive=false;const runeAmplifyReady=action==='basic'&&hasRuneSet(a.id,'amplify')&&runeEffectReady(a.id,'amplify'),runeRecycleActive=action==='skill'&&hasRuneSet(a.id,'recycle')&&runeEffectReady(a.id,'recycle'),runeUnitedActive=action==='skill'&&allySingleSupport&&!!allyTarget&&hasRuneSet(a.id,'united')&&!runeSetState(a.id).unitedLink&&runeEffectReady(a.id,'united');
 const energyBefore=a.energy,spBefore=sp,spMaxBefore=effectiveSpMax();
 let damage=0,enhanceSpent=0,soulRate=null,zeroRate=null,loganUltimateRate=null,tuneBasicUsed=action==='basic'&&!!a.tune?.basicEnhanced;
 const actionResources={skillPoints:sp,skillPointCap:effectiveSpMax()},planOptions={kit:combatKit(a.id),action,characterId:a.id,characterDuplicates:characterDuplicateRank(a.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(a.id),weaponType:loadoutFor(a.id).weapon.selected,enhanceStacks:a.id==='soul'&&!runeAction?soulEnhanceStacks:0,targetAlreadyHit:zeroHitEnemyIds.has(targets[0]?.id),tuneMultiplier:tuneBasicUsed?1+a.tune.damageBonus:1,celestialMultipliers:Object.fromEntries(['basic','skill','ultimate'].map(kind=>[kind,celestialMultiplier(a.id,kind)])),enhancedStacks:a.id==='soul'&&action==='basic'&&!runeAction?soulEnhanceStacks:0};let actionPlanOverride=runeAction?.kind==='eternal-sun-cost'?combatEngine.resolveActionPlan(planOptions):null;if(actionPlanOverride)actionPlanOverride={...actionPlanOverride,energyCost:runeAction.energyCost};const actionIntent=combatEngine.resolveActionIntent({actor:a,battle:actionResources,...planOptions,plan:actionPlanOverride,payEnergyCost:action==='ultimate'});let actionPlan=actionIntent?.plan;const resourceResult=actionIntent?.resources||null;
 if(!actionIntent){say(action==='skill'?'Not enough Skill Points.':'Action resources could not be resolved.');return false}
 if(resourceResult)sp=actionResources.skillPoints;
 if(a.id==='tsunade'){combatEngine.applyTsunadeSlowStart({actor:a});syncTurnTimeline()}
 if(runeAmplifyReady)runeAmplifyActive=!!combatEngine.resolveRuneTrigger({setId:'amplify',trigger:'basic',state:runeSetState(a.id),effectId:'amplify',turn,actorId:a.id,targetIds:targets.map(target=>target.id)});
 if(runeAction?.damageMultiplier&&actionPlan?.damageType)actionPlan={...actionPlan,multiplier:actionPlan.multiplier*runeAction.damageMultiplier};const runeDamageEffects=prepareRuneDamageEffects(a,action,actionPlan,targets);
 if(a.id==='soul'&&action==='basic'&&!runeAction){enhanceSpent=soulEnhanceStacks;soulEnhanceStacks=0;soulRate=actionPlan.multiplier}
 if(a.id==='soul'&&action==='ultimate')soulRate=actionPlan.multiplier;
 if(actionPlan.type==='tune'){applyDawnTune(allyTarget,actionPlan)}
 else if(actionPlan.type==='dawnSupport'){const battleResources={skillPoints:sp,skillPointCap:effectiveSpMax()},weapon=loadoutFor(a.id).weapon,supportResult=combatEngine.resolveDawnUltimate({actor:a,target:allyTarget,battle:battleResources,plan:actionPlan,characterDuplicates:characterDuplicateRank(a.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(a.id),weaponType:weapon.selected==='premium'&&weapon.premiumOwned?'premium':'standard'});if(!supportResult)return false;sp=battleResources.skillPoints}
 else if(actionPlan.type==='cloudRestoration'){const weapon=loadoutFor(a.id).weapon,result=combatEngine.resolveCloudRestoration({actor:a,target:allyTarget,allies:party,plan:actionPlan,speed:speedOf(a),characterDuplicates:characterDuplicateRank(a.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(a.id),weaponType:weapon.selected==='premium'&&weapon.premiumOwned?'premium':'standard'});if(!result)return false;saveVitals();syncTurnTimeline()}
 else if(actionPlan.type==='bloodShield'){applyLoganBloodShield(a,actionPlan)}
 else if(actionPlan.damageType){damage=calculateTypedActionDamage(actionPlan.damageType,actionPlan.multiplier,a,targets[0])?.damageTaken??0;if(a.id==='zero')zeroRate=actionPlan.multiplier;if(a.id==='logan'&&action==='ultimate')loganUltimateRate=actionPlan.multiplier}
 else if(action==='basic'){damage=280;a.energy=Math.min(120,a.energy+25)}
 else if(action==='skill'){damage=460;a.energy=Math.min(120,a.energy+35);sp--;addActionAdvance(a.id,25)}
 else damage=980;
 if(!actionPlan&&action==='basic')gainSp(1);
 if(tuneBasicUsed){const before=sp;gainSp(1);const gained=sp-before,source=party.find(member=>member.id===a.tune?.sourceId);if(gained>0&&source)combatEngine.recordMechanicEvent({componentId:'action:dawn/skill',mechanicTags:['resource.skill_point'],trigger:'on_tuned_basic_used',status:'applied',actorId:source.id,targetIds:[a.id],actionId:attackSerial+1,values:{skillPointsGained:gained,skillPointsBefore:before,skillPointsAfter:sp}})}
 if(action==='skill')applyRuneSkillEffects(a);
 const cloudWeapon=loadoutFor(a.id).weapon,cloudWeaponType=cloudWeapon.selected==='premium'&&cloudWeapon.premiumOwned?'premium':'standard';
 if(a.id==='cloud'){
  if(action==='basic'){combatEngine.applyCloudBasicTempo({actor:a,allies:party,plan:actionPlan,characterDuplicates:characterDuplicateRank(a.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(a.id),weaponType:cloudWeaponType});syncTurnTimeline()}
  if(action==='ultimate'&&victim){combatEngine.resolveCloudUltimateEffects({actor:a,target:victim,enemies:liveEnemies(),plan:actionPlan,characterDuplicates:characterDuplicateRank(a.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(a.id),weaponType:cloudWeaponType});syncTurnTimeline()}
  combatEngine.resolveCloudActionPassive({actor:a,characterDuplicates:characterDuplicateRank(a.id),premiumWeaponDuplicates:premiumWeaponDuplicateRank(a.id),weaponType:cloudWeaponType});syncLegacyGauges();
 }
 if(runeUnitedActive)applyUnitedRune(a.id,allyTarget.id);
 const serial=++attackSerial,ricochetEligibleEnemyIds=liveEnemies().filter(enemy=>enemy.marks?.some(mark=>mark.id==='ricochet')).map(enemy=>enemy.id);
 attackInProgress=true;pendingTargetAction=null;supportDemo=null;zeroSkillArmed=false;cameraPreview=null;selectedAllyId=null;
 const damageType=actionPlan.damageType||null;
 lastAttack={serial,actor:a.id,action,mode,damageType,ultimateSeq,allyTargetId:allyTarget?.id||null,tuneBasicUsed,runeAmplifyActive,runeDamageEffects,controlledSummonId:controlledSummon?.id||null,initialTarget:victim?.id||allyTarget?.id||null,initialTargets:targets.map(e=>e.id),runeFollowUp:runeAction?.kind==='united',unitedLinkedAllyId:runeAction?.linkedAllyId||null,
  ricochetEligibleEnemyIds,hits:[],defeats:[],finished:false,startedAt:performance.now(),finishedAt:null,energyBefore,energyAfter:a.energy,spBefore,spAfter:sp,spMaxBefore,spMaxAfter:effectiveSpMax(),enhanceSpent,soulRate,zeroRate,loganUltimateRate};
 if(runeAmplifyActive)emitCombatVisual('rune-amplify',targets.map(enemy=>enemy.id),COMBAT_ACTION_EFFECT_MS,{damageBonus:.5});
 phase='resolve';if(allySingleSupport)selectedAllyId=allyTarget.id;const actionVisual=ACTION_VISUALS[a.id]?.[action]||`${a.id}-${action}`;fx=supportAction?{kind:'support',visual:actionVisual,at:performance.now(),damage:0,actor:a.id,targetAllyId:allyTarget?.id||null,targetAllyIds:teamWideSupport?party.filter(ally=>ally.hp>0).map(ally=>ally.id):null,action}:{kind:action,visual:actionVisual,at:performance.now(),damage,actor:a.id,targetEnemyId:victim?.id||null,targetEnemyIds:targets.map(e=>e.id),targetGeometry};
 log=a.id==='soul'?(action==='ultimate'?'SOUL ULTIMATE • INITIAL TRUE AOE':action==='basic'?'SOUL BASIC • INITIAL TRUE HIT':'SOUL '+action.toUpperCase()):a.id==='zero'?'ZERO '+(action==='skill'?'FIRST STRIKE':action==='ultimate'?'EXECUTION':'BASIC ATTACK')+' • PHYSICAL HIT':a.id==='dawn'?(action==='skill'?'DAWN TUNE • '+allyTarget.name:action==='ultimate'?'DAWN ULTIMATE • '+allyTarget.name:'DAWN BASIC • INITIAL MAGICAL HIT'):a.id==='cloud'?(action==='skill'?'CLOUD RESTORATION • '+allyTarget.name:'CLOUD '+action.toUpperCase()):a.id==='lily'?'LILY '+action.toUpperCase()+' • INITIAL HIT':a.id==='logan'?(action==='skill'?'LOGAN BLOOD SHIELD • TEAM GUARD':action==='ultimate'?'LOGAN ULTIMATE • RED TIDE AOE':'LOGAN BASIC • BLEEDING STRIKE'):a.id==='tsunade'?'TSUNADE • '+(combatKit(a.id)?.[action]?.name||action.toUpperCase()).toUpperCase():'TEST '+mode.toUpperCase()+': '+a.name+' uses '+action+' • '+targets.length+' initial target(s).';
 if(controlledSummon)summonHistory.push({event:'controlled-activation',id:controlledSummon.id,ownerId:a.id,clock:turnTimeline.clock});
 if(mode==='five-hit'){
  let focused=victim,lastSlot=victim.slot;
  for(let n=0;n<5;n++)schedule(()=>{if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;if(!focused||focused.hp<=0)focused=closestSurvivingEnemy(lastSlot);if(!focused)return;lastSlot=focused.slot;const part=Math.floor(damage/5)+(n<damage%5?1:0);applyTrainingHit(focused,part,n+1,true)},ANIMATION_STEP_MS*(n+1));
 }else schedule(()=>{
  if(phase!=='resolve'||!attackInProgress||lastAttack?.serial!==serial)return;
  for(let n=0;n<targets.length;n++)if(targets[n].hp>0){let hitDamage=damage;if(actionPlan.damageType)hitDamage=calculateTypedActionDamage(actionPlan.damageType,actionPlan.multiplier,a,targets[n])?.damageTaken??0;applyTrainingHit(targets[n],hitDamage,n+1,true)}
 },a.id==='soul'&&action==='basic'?ANIMATION_STEP_MS*3:ANIMATION_STEP_MS);
 const hitResolveAt=mode==='five-hit'?ANIMATION_STEP_MS*5:a.id==='soul'&&action==='basic'?ANIMATION_STEP_MS*3:ANIMATION_STEP_MS,normalFinishAt=mode==='five-hit'?ULTIMATE_PRESENTATION_MS:a.id==='soul'&&action==='basic'?SOUL_BASIC_MS:action==='ultimate'?ULTIMATE_PRESENTATION_MS:COMBAT_ACTION_EFFECT_MS,hasReflect=targets.some(target=>reflectPercentOf(target)>0),hasEcho=echoPercentOf(a)>0,reactionDelay=hasEcho?COMBAT_ACTION_PHASE_GAP_MS*(hasReflect?2:1):hasReflect?COMBAT_ACTION_PHASE_GAP_MS:0,reactionFinishPadding=(hasReflect||hasEcho)?Math.max(0,hitResolveAt+reactionDelay+COMBAT_ACTION_EFFECT_MS-normalFinishAt):0;
 schedule(()=>finishTrainingAttack(serial),normalFinishAt+reactionFinishPadding);
 return true;
}
// Developer-only test helpers. They do not define the game's revival resource, cost, or eligibility rules.
function testKO(){if(!paused||phase!=='player')return;const others=alive().filter(p=>p.id!==activeId);if(!others.length){say('Debug KO requires another living ally; no final-ally KO.');return}const p=others[0];p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();log=`DEBUG ONLY: ${p.name} knocked out; party slot retained.`}
function testRevive(){if(!paused||phase!=='player')return;const p=party.find(p=>p.hp<=0);if(!p){say('No knocked-out member to test revival.');return}p.hp=Math.max(1,roundHp(p.maxHp*.35));gauges[p.id]=0;saveVitals();log=`DEBUG ONLY: ${p.name} restored in the same party slot.`}
function rect(x,y,w,h,fill,stroke=null,r=0){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function text(s,x,y,size=24,fill=color.white,weight='600',align='left'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=fill;ctx.font=`${weight} ${size}px system-ui,-apple-system,Segoe UI,sans-serif`;ctx.fillText(String(s),x,y)}
function line(x,y,w,f=1,c='#72e3ae',bg='#303649',h=13){rect(x,y,w,h,bg,null,6);rect(x,y,Math.max(0,w*Math.min(1,Math.max(0,f))),h,c,null,6)}
function shieldedHealthBar(x,y,w,h,hp,maxHp,shield,fill='#72e3ae',background='#303649'){
 line(x,y,w,maxHp?hp/maxHp:0,fill,background,h);
 if(!(shield>0)||!(maxHp>0))return;
 const extra=Math.min(w*.12,Math.max(3,w*shield/maxHp)),covered=Math.min(w*1.12,w*Math.max(0,hp/maxHp)+extra);
 ctx.save();ctx.fillStyle='rgba(178,187,196,.48)';ctx.beginPath();ctx.roundRect(x,y-4,covered,h+8,Math.min(7,(h+8)/2));ctx.fill();ctx.restore();
}
function addButton(x,y,w,h,action,label,sub='',enabled=true,labelSize=19){choiceRects.push({x,y,w,h,action,enabled});rect(x,y,w,h,enabled?'#263754':'#1d2538',enabled?'#a5c9dc':'#526176',11);text(label,x+w/2,y+h/2-(sub?10:0),labelSize,enabled?'#fff4e6':'#9eafc1','750','center');if(sub)text(sub,x+w/2,y+h/2+16,13,'#bacadb','500','center')}
function drawBackground(){ctx.imageSmoothingEnabled=false;if(images.arena.complete&&images.arena.naturalWidth)ctx.drawImage(images.arena,0,0,W,H);else{rect(0,0,W,H,'#596f83');rect(0,480,W,420,'#a38f9e')}rect(0,0,W,165,'rgba(8,10,22,.24)');const shade=ctx.createLinearGradient(0,580,0,900);shade.addColorStop(0,'#17122500');shade.addColorStop(1,'#090d23dc');rect(0,560,W,340,shade)}

const RUNE_STATS=['hp','attack','physicalDefense','magicalDefense','speed'];
const RUNE_STAT_INFO={
 hp:{label:'HP',main:100},attack:{label:'Attack',main:20},
 physicalDefense:{label:'Physical Defense',main:4},
 magicalDefense:{label:'Magical Defense',main:4},speed:{label:'Speed',main:20}
};
const CELESTIALS=[['passive','PASSIVE'],['basic','BASIC'],['skill','SKILL'],['ultimate','ULTIMATE']];
function defaultLoadout(){return {characterDuplicates:0,weapon:{selected:'standard',standardPotential:1,premiumPotential:1,premiumOwned:false,standardLevel:1,standardExp:0,standardAscended:[],premiumLevel:1,premiumExp:0,premiumAscended:[]},runes:[null,null,null,null],celestials:{passive:1,basic:1,skill:1,ultimate:1}}}
function normalizeRune(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.subs))return null;
 // Map historical typed Attack Rune names to the unified Attack stat during save migration.
 const convert=x=>x==='physicalAttack'||x==='magicalAttack'?'attack':x,main=convert(value.main);if(!RUNE_STATS.includes(main))return null;
 const rawSubs=value.subs.map(convert),legacyAttackBonus=Math.max(0,rawSubs.filter(x=>x==='attack').length-(main==='attack'?0:1)),subs=rawSubs.filter((x,i,a)=>RUNE_STATS.includes(x)&&x!==main&&a.indexOf(x)===i).slice(0,3);
 for(const stat of RUNE_STATS)if(subs.length<3&&stat!==main&&!subs.includes(stat))subs.push(stat);
 const setId=typeof value.setId==='string'&&Object.hasOwn(RUNE_SET_DEFINITIONS,value.setId)?value.setId:null;
 return subs.length===3?{level:Number.isInteger(value.level)?Math.max(1,Math.min(5,value.level)):1,main,subs,setId,legacyAttackBonus,criticalRateBonus:Number.isFinite(value.criticalRateBonus)?Math.max(0,value.criticalRateBonus):0,criticalDamageBonus:Number.isFinite(value.criticalDamageBonus)?Math.max(0,value.criticalDamageBonus):0}:null
}
function createRune(setId){return {level:1,main:'hp',subs:['attack','physicalDefense','magicalDefense'],setId,criticalRateBonus:0,criticalDamageBonus:0}}
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
let characterLoadouts=loadCharacterLoadouts(),loadoutCharacterId='soul',selectedLoadoutRune=0,loadoutPage='characters',runePanelMode='slots',runeStatPicker=null,weaponBookSelection={small:0,medium:0,large:0};
let loadoutActionPending=false;
function loadoutFor(id=loadoutCharacterId){return characterLoadouts[id]||(characterLoadouts[id]=defaultLoadout())}
function saveLoadouts(){try{localStorage.setItem(LOADOUT_KEY,JSON.stringify(characterLoadouts))}catch(e){}}
function defaultItemInventory(){return {bottles:{small:0,medium:0,large:0},books:{small:0,medium:0,large:0},cores:0,gems:0,runes:Object.fromEntries(Object.keys(RUNE_SET_DEFINITIONS).map(id=>[id,[]]))}}
function normalizeItemInventory(value){
 const base=defaultItemInventory();if(!value||typeof value!=='object'||Array.isArray(value))return base;
 for(const [group] of [['bottles'],['books']])for(const size of ['small','medium','large']){
  const count=value[group]?.[size];base[group][size]=Number.isSafeInteger(count)&&count>=0?count:0;
 }
 for(const id of ['cores','gems']){const count=value[id];base[id]=Number.isSafeInteger(count)&&count>=0?count:0}
 for(const setId of Object.keys(RUNE_SET_DEFINITIONS))if(Array.isArray(value.runes?.[setId]))base.runes[setId]=value.runes[setId].map(normalizeRune).filter(rune=>rune?.setId===setId);
 return base;
}
function validItemInventory(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 for(const key of ['cores','gems'])if(value[key]!==undefined&&(!Number.isSafeInteger(value[key])||value[key]<0))return false;
 for(const group of ['bottles','books'])if(value[group]!==undefined){
  if(!value[group]||typeof value[group]!=='object'||Array.isArray(value[group]))return false;
  for(const size of ['small','medium','large'])if(value[group][size]!==undefined&&(!Number.isSafeInteger(value[group][size])||value[group][size]<0))return false;
 }
 if(value.runes!==undefined){if(!value.runes||typeof value.runes!=='object'||Array.isArray(value.runes)||Object.keys(value.runes).some(setId=>!Object.hasOwn(RUNE_SET_DEFINITIONS,setId)))return false;for(const [setId,runes] of Object.entries(value.runes))if(!Array.isArray(runes)||runes.some(rune=>!normalizeRune(rune)||rune.setId!==setId))return false}
 return true;
}
function loadItemInventory(){try{return normalizeItemInventory(JSON.parse(localStorage.getItem(ITEM_INVENTORY_KEY)||'null'))}catch(e){return defaultItemInventory()}}
let itemInventory=loadItemInventory();
function saveItemInventory(){try{localStorage.setItem(ITEM_INVENTORY_KEY,JSON.stringify(itemInventory));return true}catch(e){return false}}
function loadStoreCoins(){try{const raw=localStorage.getItem(STORE_COINS_KEY);if(raw!==null){const n=Number(raw);return Number.isSafeInteger(n)&&n>=0?n:0}localStorage.setItem(STORE_COINS_KEY,'0');return 0}catch(e){return 0}}
let storeCoins=loadStoreCoins();
function saveStoreCoins(){try{localStorage.setItem(STORE_COINS_KEY,String(storeCoins));return true}catch(e){return false}}
function grantStoreCoins(amount){if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(storeCoins+amount))return false;storeCoins+=amount;saveStoreCoins();return true}
function dailyRewardPeriodKey(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),part=key=>parts.find(value=>value.type===key)?.value;
 return `${part('year')}-${part('month')}-${part('day')}`
}
function validDailyRewardPeriod(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)}
function loadDailyRewardPeriod(){try{const value=localStorage.getItem(DAILY_REWARD_KEY);return validDailyRewardPeriod(value)?value:null}catch(e){return null}}
let dailyRewardClaimedPeriod=loadDailyRewardPeriod();
function saveDailyRewardPeriod(){try{if(dailyRewardClaimedPeriod)localStorage.setItem(DAILY_REWARD_KEY,dailyRewardClaimedPeriod);else localStorage.removeItem(DAILY_REWARD_KEY);return true}catch(e){return false}}
function canClaimDailyReward(now=new Date()){return dailyRewardClaimedPeriod!==dailyRewardPeriodKey(now)}
async function claimDailyReward(){
 try{await window.TwoToneAccount.action('claim-daily');say('Daily reward claimed: 100 coins.');return true}
 catch(error){say(error.message==='already_claimed'?'Daily coins are already claimed. The next claim is at 12 AM Eastern.':'The daily reward could not be claimed.');return false}
}
function grantItem(itemId,amount=1){
 if(!Number.isSafeInteger(amount)||amount<1)return false;
 const match=/^(bottle|book):(small|medium|large)$/.exec(itemId||'');
 if(match){const group=match[1]==='bottle'?'bottles':'books',next=itemInventory[group][match[2]]+amount;if(!Number.isSafeInteger(next))return false;itemInventory[group][match[2]]=next}
 else if(['core','gem'].includes(itemId)){const key=itemId==='core'?'cores':'gems',next=itemInventory[key]+amount;if(!Number.isSafeInteger(next))return false;itemInventory[key]=next}
 else if(typeof itemId==='string'&&itemId.startsWith('rune:')){const setId=itemId.slice(5),runes=itemInventory.runes[setId];if(!runes||runes.length+amount>10000)return false;for(let i=0;i<amount;i++)runes.push(createRune(setId))}
 else return false;
 saveItemInventory();return true;
}
if(DEV_MODE)globalThis.TwoToneItems=Object.freeze({grant:grantItem,getInventory:()=>JSON.parse(JSON.stringify(itemInventory)),grantCoins:grantStoreCoins,getCoins:()=>storeCoins});
window.twoToneApplyProfile=profile=>{
 if(!profile||!Number.isSafeInteger(profile.coins)||profile.coins<0)return false;
 storeCoins=profile.coins;saveStoreCoins();
 dailyRewardClaimedPeriod=profile.dailyRewardClaimedPeriod||null;saveDailyRewardPeriod();
 if(Number.isInteger(profile.playerRank)&&profile.playerRank>=1&&profile.playerRank<=50){playerRank=profile.playerRank;savePlayerRank()}
 if(profile.characterProgress&&typeof profile.characterProgress==='object'){characterProgress=profile.characterProgress;saveProgress()}
 if(profile.vitals&&typeof profile.vitals==='object'){savedVitals=profile.vitals;try{localStorage.setItem(VITALS_KEY,JSON.stringify(savedVitals))}catch(e){}}
 if(Array.isArray(profile.team)&&validTeam(profile.team,new Set(profile.ownedCharacters||['soul']))){try{localStorage.setItem(TEAM_KEY,JSON.stringify(profile.team))}catch(e){}if(phase!=='partySetup')draft=[...profile.team]}
 if(Array.isArray(profile.ownedCharacters)){ownedCharacterIds=new Set(normalizeOwnedCharacterIds(profile.ownedCharacters)||['soul']);saveOwnedCharacters()}
 if(profile.itemInventory&&validItemInventory(profile.itemInventory)){itemInventory=normalizeItemInventory(profile.itemInventory);saveItemInventory()}
 if(profile.loadouts&&typeof profile.loadouts==='object'){characterLoadouts=Object.fromEntries(ROSTER.map(model=>[model.id,normalizeLoadout(profile.loadouts[model.id]) ]));saveLoadouts()}
 if(profile.lottery)FeaturedLottery.hydrate(profile.lottery);
 return true;
};
function weaponLevelCap(rank=playerRank){return characterLevelCap(rank)}
function weaponPotentialMultiplier(type,potential,level){
 if(!['standard','premium'].includes(type)||!Number.isInteger(potential)||potential<1||potential>5||!Number.isInteger(level)||level<1)return 0;
 const levelOnePercent=type==='premium'?51+(potential-1)*25:31+(potential-1)*5;
 return (levelOnePercent+level-1)/100;
}
function weaponBonus(record,id=loadoutCharacterId){
 const w=record.weapon,type=w.selected==='premium'&&w.premiumOwned?'premium':'standard';
 return weaponPotentialMultiplier(type,type==='premium'?w.premiumPotential:w.standardPotential,w[type+'Level']);
}
function equippedZeroBattleSprite(){const weapon=loadoutFor('zero').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'zeroBattlePremium':'zeroBattle'}
function equippedSoulBattleSprite(){const weapon=loadoutFor('soul').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'soulBattlePremium':'soulBattleStandard'}
function equippedLoganBattleSprite(){const weapon=loadoutFor('logan').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'loganBattlePremium':'loganBattle'}
function equippedCloudBattleSprite(){const weapon=loadoutFor('cloud').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'cloudNineBattle':'cloudWindcallBattle'}
function equippedDawnBattleSprite(){const weapon=loadoutFor('dawn').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'dawnPremiumBattle':'dawnBattle'}
function equippedLilyBattleSprite(){const weapon=loadoutFor('lily').weapon;return weapon.selected==='premium'&&weapon.premiumOwned?'lilySignatureBattle':'lilyStandardBattle'}
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
function loadoutStatModifiers(id,characterLevel=1){
 const record=loadoutFor(id),bonus=weaponBonus(record,id),totals=Object.fromEntries(RUNE_STATS.map(k=>[k,0]));
 for(const rune of record.runes){if(!rune)continue;totals[rune.main]+=RUNE_STAT_INFO[rune.main].main*rune.level;for(const sub of rune.subs)totals[sub]+=RUNE_STAT_INFO[sub].main*.25*rune.level;if(rune.legacyAttackBonus)totals.attack+=20*.25*rune.level*rune.legacyAttackBonus}
 const pct={signatureWeapon:bonus},criticalRateFromRunes=record.runes.reduce((sum,rune)=>sum+(rune?.criticalRateBonus||0),0),criticalDamageFromRunes=record.runes.reduce((sum,rune)=>sum+(rune?.criticalDamageBonus||0),0);
 return {hpFlatModifiers:{},hpPercentModifiers:pct,hpEquipmentFlatModifiers:{runes:totals.hp},
 attackFlatModifiers:{},attackPercentModifiers:pct,attackEquipmentFlatModifiers:{runes:totals.attack},
 physicalDefenseFlatModifiers:{},physicalDefensePercentModifiers:pct,physicalDefenseEquipmentFlatModifiers:{runes:totals.physicalDefense},
 magicalDefenseFlatModifiers:{},magicalDefensePercentModifiers:pct,magicalDefenseEquipmentFlatModifiers:{runes:totals.magicalDefense},
 speedFlatModifiers:{},speedPercentModifiers:pct,speedEquipmentFlatModifiers:{runes:totals.speed},criticalRateModifiers:{runes:criticalRateFromRunes,premiumWeaponDuplicate2:upgradeValueFor('soul.premium-duplicate.2.critical-stats','criticalRateBonus','soul')},criticalDamageModifiers:{runes:criticalDamageFromRunes,premiumWeaponDuplicate2:upgradeValueFor('soul.premium-duplicate.2.critical-stats','criticalDamageBonus','soul')}}
}
function celestialMultiplier(id,key){return 1+.10*(loadoutFor(id).celestials[key]||1)}
function characterDuplicateRank(id='soul'){return loadoutFor(id).characterDuplicates||0}
function premiumWeaponDuplicateRank(id='soul'){const w=loadoutFor(id).weapon;return w.selected==='premium'&&w.premiumOwned?Math.max(0,w.premiumPotential-1):0}
function upgradeValueFor(effectId,key,characterId,fallback=0){const weapon=loadoutFor(characterId).weapon,effect=getActiveCharacterUpgradeEffect(effectId,{characterDuplicates:characterDuplicateRank(characterId),premiumWeaponDuplicates:premiumWeaponDuplicateRank(characterId),weaponType:weapon.selected==='premium'&&weapon.premiumOwned?'premium':'standard'});return effect?.values?.[key]??fallback}
function soulFollowUpLimit(){return upgradeValueFor('soul.premium-duplicate.1.follow-up-charges','followUpCharges','soul',5)}
function resetSoulFollowUp(){const charges=soulFollowUpLimit();soulFollowUpState={type:'followUp',charges,remaining:charges,seenSources:new Set(),activations:0}}
function soulEnhancedBasicTargetMode(stacks){if(stacks<(combatKit('soul')?.skill?.blastAtStacks??Infinity))return 'single';return upgradeValueFor('soul.premium-duplicate.3.enhanced-aoe','enhancedBasicCoverage','soul','blast')}

function loadoutStats(id){
 const model=ROSTER.find(x=>x.id===id),level=progressFor(id)?.level||1;if(!model)return null;
 const unit={...model,level,...loadoutStatModifiers(id,level)};
 const stats={HP:calculateMaxHp(model.hp,level,unit.hpFlatModifiers,unit.hpPercentModifiers,unit.hpEquipmentFlatModifiers)};
 stats.Attack=calculateAttack(unit)
 return {...stats,
 'Physical Defense':calculatePhysicalDefense(unit),'Magical Defense':calculateMagicalDefense(unit),Speed:calculateSpeed(unit)}
}
function enterLoadout(){loadoutCharacterId='soul';selectedLoadoutRune=0;loadoutPage='details';runePanelMode='slots';runeStatPicker=null;weaponBookSelection={small:0,medium:0,large:0};phase='loadout';hint=''}
async function handleLoadoutAction(action){
 const [kind,arg]=action.split(':'),record=loadoutFor(),weapon=record.weapon,rune=record.runes[selectedLoadoutRune];
 if(kind==='back'){if(runeStatPicker){runeStatPicker=null;return}phase='menu';return}
 if(kind==='character'){if(ROSTER_IDS.has(arg)&&isCharacterOwned(arg)&&!roster(arg)?.test){loadoutCharacterId=arg;weaponBookSelection={small:0,medium:0,large:0}}return}
 if(kind==='page'){if(['details','weapons','runes','celestials'].includes(arg)){loadoutPage=arg;if(arg==='runes')runePanelMode='slots';runeStatPicker=null;weaponBookSelection={small:0,medium:0,large:0}}return}
 if(kind==='rune-view'&&['slots','inventory','detail'].includes(arg)){runePanelMode=arg;runeStatPicker=null;return}
 if(kind==='upgrade'&&arg==='weapon'){
  const type=weapon.selected,level=weapon[type+'Level'],gate=ASCENSION_GATES.includes(level)&&!weapon[type+'Ascended'].includes(level);
  if(gate){
   if(loadoutActionPending)return;loadoutActionPending=true;
   try{await window.TwoToneAccount.action('ascend',{kind:'weapon',id:loadoutCharacterId,weaponType:type});say('Weapon Ascension completed.')}
   catch(error){say(error.message==='gem_required'?'One Gem is required to Ascend this weapon.':'Weapon Ascension could not be completed.')}
   finally{loadoutActionPending=false}return
  }
  else if(level<weaponLevelCap()){
   let used=0;const remaining={...weaponBookSelection};
   for(const size of ['small','medium','large'])for(let i=0;i<weaponBookSelection[size];i++){
    if(loadoutActionPending)return;loadoutActionPending=true;
    try{await window.TwoToneAccount.action('use-xp-item',{itemType:'book',id:loadoutCharacterId,weaponType:type,size});remaining[size]--;used++}
    catch(error){loadoutActionPending=false;break}
    finally{loadoutActionPending=false}
   }
   weaponBookSelection=remaining;if(used)say(`${used} Enchanted Book${used===1?'':'s'} used.`);
  }
  return;
 }
 if(kind==='book-select'){
  if(loadoutActionPending)return;
  if(['small','medium','large'].includes(arg)&&weaponBookSelection[arg]<itemInventory.books[arg])weaponBookSelection[arg]++;
  return;
 }
 if(kind==='book-clear'){
  if(!loadoutActionPending)weaponBookSelection={small:0,medium:0,large:0};
  return;
 }
 if(kind==='weapon-switch'){
  if(weapon.premiumOwned&&!loadoutActionPending){loadoutActionPending=true;try{await window.TwoToneAccount.action('set-weapon',{id:loadoutCharacterId,type:weapon.selected==='premium'?'standard':'premium'});weaponBookSelection={small:0,medium:0,large:0}}catch(e){say('Weapon selection could not be saved.')}finally{loadoutActionPending=false}}return
 }
 if(kind==='character-duplicate'&&DEV_MODE)record.characterDuplicates=Math.max(0,Math.min(4,record.characterDuplicates+Number(arg)));
 else if(kind==='potential'&&DEV_MODE){const [type,delta]=arg.split(','),key=type==='premium'?'premiumPotential':'standardPotential';weapon[key]=Math.max(1,Math.min(5,weapon[key]+Number(delta)))}
 else if(kind==='rune-select'){selectedLoadoutRune=Math.max(0,Math.min(3,Number(arg)||0));runePanelMode=record.runes[selectedLoadoutRune]?'detail':'inventory';runeStatPicker=null}
 else if(kind==='rune-equip'){
  const [slot,setId]=arg.split(','),index=Math.max(0,Math.min(3,Number(slot)||0));if(loadoutActionPending)return;loadoutActionPending=true;
  try{await window.TwoToneAccount.action('equip-rune',{id:loadoutCharacterId,setId,slot:index});selectedLoadoutRune=index;runePanelMode='slots'}catch(e){say('No Rune from that set is available.')}finally{loadoutActionPending=false}return
 }
 else if(kind==='rune-remove'&&record.runes[selectedLoadoutRune]){
  if(loadoutActionPending)return;loadoutActionPending=true;try{await window.TwoToneAccount.action('remove-rune',{id:loadoutCharacterId,slot:selectedLoadoutRune});runePanelMode='slots'}catch(e){say('Rune could not be removed.')}finally{loadoutActionPending=false}return
 }
 else if(kind==='rune-switch'&&record.runes[selectedLoadoutRune])runePanelMode='inventory';
 else if(kind==='rune-level'&&rune&&Number(arg)===1){if(loadoutActionPending)return;loadoutActionPending=true;try{await window.TwoToneAccount.action('upgrade-core',{kind:'rune',id:loadoutCharacterId,index:selectedLoadoutRune});say('Rune upgraded.')}catch(e){say('A Core is required and the Rune must be below Level 5.')}finally{loadoutActionPending=false}return}
 else if(kind==='rune-main'&&rune){runeStatPicker={slot:'main',subIndex:-1};return}
 else if(kind==='rune-sub'&&rune){const index=Number(arg);if(Number.isInteger(index)&&index>=0&&index<3){runeStatPicker={slot:'sub',subIndex:index};return}}
 else if(kind==='rune-picker-close'){runeStatPicker=null;return}
 else if(kind==='rune-stat-choice'&&rune&&runeStatPicker){
  const [slot,key]=arg.split(',');
  if(slot===runeStatPicker.slot&&RUNE_STATS.includes(key)&&!loadoutActionPending){loadoutActionPending=true;try{await window.TwoToneAccount.action('set-rune-stat',{id:loadoutCharacterId,slot:selectedLoadoutRune,kind:slot,subIndex:runeStatPicker.subIndex,stat:key});runeStatPicker=null}catch(e){say('Rune stat could not be changed.')}finally{loadoutActionPending=false}}return
 }
 else if(kind==='celestial'){const [key,delta]=arg.split(',');if(Number(delta)===1&&!loadoutActionPending){loadoutActionPending=true;try{await window.TwoToneAccount.action('upgrade-core',{kind:'celestial',id:loadoutCharacterId,key});say(`${key} Celestial upgraded.`)}catch(e){say('A Core is required and the Celestial must be below Level 10.')}finally{loadoutActionPending=false}}return}
 else if(kind==='bottle'){if(loadoutActionPending)return;loadoutActionPending=true;try{await window.TwoToneAccount.action('use-xp-item',{itemType:'bottle',id:loadoutCharacterId,size:arg});say(`${arg[0].toUpperCase()+arg.slice(1)} Enchanted Bottle used.`)}catch(e){say('Bottle unavailable or character is at their level cap.')}finally{loadoutActionPending=false}return}
 else if(kind==='ascend-character'){if(loadoutActionPending)return;loadoutActionPending=true;try{await window.TwoToneAccount.action('ascend',{kind:'character',id:loadoutCharacterId});say('Ascension completed.')}catch(e){say('One Gem is required at a valid Ascension gate.')}finally{loadoutActionPending=false}return}
 saveLoadouts()
}
function loadoutCharacter(){return roster(loadoutCharacterId)}
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
function drawLoadout(){
 const model=loadoutCharacter(),record=loadoutFor(loadoutCharacterId),progress=progressFor(loadoutCharacterId),cap=characterLevelCap();
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.52)');
 // Star-field details frame the character art without competing with the controls.
 for(let i=0;i<70;i++){const x=(i*193+61)%W,y=(i*317+37)%H,r=i%7===0?2:1;rect(x,y,r,r,'rgba(220,232,255,'+(i%3===0?'.52':'.25')+')')}
 text('CHARACTER DETAILS',42,42,14,'#d7c69f','800');text(model.name,42,72,25,'#fff1d5','850');
 // Character selector stays available across every loadout tab.
 const characters=availableCharacters();for(let i=0;i<characters.length;i++){
  const p=characters[i],x=300+i*76,y=16,active=p.id===loadoutCharacterId,img=images[characterPortraitArt(p.id)];
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
 const artKey=characterPortraitArt(model.id);
 const art=images[artKey];if(art?.complete&&art.naturalWidth)drawStoreBannerImage(art,265,138,800,748);
 // Right-side content panel, consistent across all tabs.
 rect(1058,112,512,744,'rgba(10,16,31,.76)','rgba(190,207,230,.42)',18);
 if(loadoutPage==='weapons')text('WEAPONS',1314,96,18,'#d9c797','850','center');
 else if(loadoutPage==='runes')text('RUNES',1314,96,18,'#d9c797','850','center');
 else text(loadoutPage==='details'?'STATS & PROGRESSION':loadoutPage.toUpperCase(),1090,151,14,'#d9c797','850');
 if(loadoutPage==='details')drawLoadoutDetailsPanel(model,record,progress,cap);
 else if(loadoutPage==='weapons')drawLoadoutWeaponsPanel(model,record);
 else if(loadoutPage==='runes')drawLoadoutRunesPanel(record);
 else drawLoadoutCelestialsPanel(record);
 if(loadoutPage==='runes'&&runeStatPicker){const rune=record.runes[selectedLoadoutRune];if(rune)drawRuneStatPicker(rune)}
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
 const weaponName=model.id==='soul'?(type==='premium'?'SOULBOUND':'ASHBLADE'):model.id==='cloud'?(type==='premium'?'CLOUD-NINE':'WINDCALL'):model.id==='lily'?(type==='premium'?'EVERBLOSSOM':'PETAL'):model.id==='dawn'?(type==='premium'?'RADIANT DIAMOND':'RADIANT PEARL'):model.id==='zero'?(type==='premium'?'NIGHTSHADE':'SILENT EDGE'):model.id==='logan'?(type==='premium'?'BLOODMOON':'CRIMSON EDGE'):(type==='premium'?'PREMIUM SIGNATURE':'STANDARD SIGNATURE');
 text(weaponName,1090,151,17,'#e8d6af','850');
 const weaponArt=model.id==='soul'?images[type==='premium'?'soulWeaponPremium':'soulWeaponStandard']:model.id==='cloud'?images[type==='premium'?'cloudNine':'cloudWindcall']:model.id==='lily'?images[type==='premium'?'lilyWeaponSignature':'lilyWeaponStandard']:model.id==='dawn'?images[type==='premium'?'dawnWeaponPremium':'dawnWeaponStandard']:model.id==='zero'?images[type==='premium'?'zeroWeaponPremium':'zeroWeaponStandard']:model.id==='logan'?images[type==='premium'?'loganWeaponPremium':'loganWeaponStandard']:null;if(weaponArt?.complete&&weaponArt.naturalWidth)drawStoreBannerImage(weaponArt,1090,171,445,300);
 text('POTENTIAL '+potential+' / 5     •     LEVEL '+level+' / '+cap,1090,490,14,'#e1e8f0','750');
 text(gate?'ASCENSION REQUIRED':level>=cap?'WEAPON LEVEL CAP REACHED':'XP  '+exp+' / '+needed,1090,516,13,'#b9c8d7','600');
 line(1090,529,445,exp/Math.max(1,needed),'#d9b96e','rgba(218,228,240,.18)',7);
 if(DEV_MODE&&owned){addButton(1400,542,56,36,'loadout:potential:'+type+',-1','−','',potential>1);addButton(1464,542,56,36,'loadout:potential:'+type+',1','+','',potential<5)}
 const upgradeLabel=gate?'ASCEND':level>=cap?'MAX LEVEL':'UPGRADE',bookSelectionCount=weaponBookSelection.small+weaponBookSelection.medium+weaponBookSelection.large;
 text(owned?'+'+bonus.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'% ALL STATS':'PREMIUM WEAPON NOT OWNED',1090,580,16,owned?'#f4d99c':'#aebed0','800');
 addButton(1090,600,214,48,'loadout:upgrade:weapon',upgradeLabel,'',owned&&!loadoutActionPending&&(gate?itemInventory.gems>0:level<cap&&bookSelectionCount>0),14);
 addButton(1320,600,214,48,'loadout:weapon-switch','SWITCH','',w.premiumOwned,14);
 if(gate){
  text('GEMS',1090,675,12,'#d9c797','750');drawLoadoutMaterialCard(1090,684,139,151,'gem','GEM',itemInventory.gems);
 }else{
  text('ENCHANTED BOOKS',1090,675,12,'#d9c797','750');
  if(bookSelectionCount>0)addButton(1430,653,104,26,'loadout:book-clear','CLEAR','',!loadoutActionPending,12);
  for(let i=0;i<3;i++)drawLoadoutBookCard(1090+i*150,684,139,151,['small','medium','large'][i],owned&&level<cap&&!loadoutActionPending);
 }
}
function drawLoadoutMaterialCard(x,y,w,h,item,label,qty){
 rect(x,y,w,h,'rgba(24,32,49,.78)','rgba(121,143,168,.45)',10);
 const icon=images[item];if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+43,y+6,w-86,69);
 text(label,x+w/2,y+96,11,'#f3e5c9','800','center');
 text('×'+qty,x+w/2,y+130,13,'#f0f3f7','750','center');
}
function drawLoadoutBookCard(x,y,w,h,size,enabled){
 const upper=size[0].toUpperCase()+size.slice(1),qty=itemInventory.books[size],selected=weaponBookSelection[size];
 const canAdd=enabled&&selected<qty;
 rect(x,y,w,h,selected?'#29384e':'rgba(24,32,49,.78)',selected?'#d2b77e':canAdd?'#a5c9dc':'rgba(121,143,168,.45)',10);
 choiceRects.push({x,y,w,h,action:'loadout:book-select:'+size,enabled:canAdd});

 drawStoreBannerImage(images['enchantedBook'+upper],x+48,y+4,w-96,54);
 text(upper.toUpperCase(),x+w/2,y+67,11,'#f3e5c9','800','center');
 text(ITEM_XP[size]+' XP',x+w/2,y+84,10,'#c4d0dd','600','center');
 text(selected+' / '+qty+' selected',x+w/2,y+118,11,'#f0f3f7','750','center');
}
function drawLoadoutRunesPanel(record){
 if(runePanelMode==='inventory'){drawRuneInventoryPicker(record);return}
 if(runePanelMode==='detail'&&record.runes[selectedLoadoutRune]){drawRuneDetail(record.runes[selectedLoadoutRune]);return}
 text('EQUIPPED RUNES',1090,151,15,'#d9c797','850');text('CORES ×'+itemInventory.cores,1538,151,12,'#b9c8d7','650','right');
 for(let i=0;i<4;i++){
  const col=i%2,row=Math.floor(i/2),x=1083+col*236,y=174+row*126,rune=record.runes[i],set=rune&&RUNE_SET_DEFINITIONS[rune.setId],active=i===selectedLoadoutRune;
  choiceRects.push({x,y,w:224,h:114,action:'loadout:rune-select:'+i,enabled:true});rect(x,y,224,114,'rgba(27,39,59,.82)',active?'#d5ba7c':'rgba(148,169,194,.45)',12);
  if(rune){const icon=images[set?.image];if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+10,y+10,50,48);text(set?.name||'RUNE',x+70,y+24,12,'#f3dfb9','800');text('LEVEL '+rune.level+' / 5',x+204,y+24,10,'#c4d0dd','650','right');const main=RUNE_STAT_INFO[rune.main];text(main.label+'  +'+main.main*rune.level,x+70,y+49,10,'#e3ebf4','650');text(rune.subs.map(key=>RUNE_STAT_INFO[key].label).join(' • '),x+12,y+83,9,'#b9c8d7','600');text('VIEW',x+204,y+101,9,'#d9c797','750','right')}
  else{text('＋',x+112,y+37,26,'#d9c797','700','center');text('SLOT '+(i+1),x+112,y+78,12,'#c4d0dd','700','center')}
 }
 text('SET EFFECTS',1314,442,14,'#d9c797','850','center');
 const activeSets=Object.keys(RUNE_SET_DEFINITIONS).map(key=>({key,set:RUNE_SET_DEFINITIONS[key],count:runeSetPieceCount(loadoutCharacterId,key)})).filter(entry=>entry.count>0);
 if(!activeSets.length){text('NO SET BONUS',1090,485,12,'#aebed0','650');return}
 activeSets.forEach((entry,index)=>{
  const y=461+index*87,isActive=entry.count===4;rect(1083,y,462,78,isActive?'rgba(75,68,48,.62)':'rgba(27,39,59,.64)',isActive?'#d5ba7c':'rgba(148,169,194,.32)',10);
  const icon=images[entry.set.image];if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,1091,y+11,45,49);
  text(entry.set.name.toUpperCase(),1145,y+19,11,isActive?'#f3dfb9':'#dce6f1','800');text(entry.set.lines.join(' • '),1145,y+43,9,'#b9c8d7','550');text(isActive?'ACTIVE':entry.count+'/4',1532,y+20,10,isActive?'#f3dfb9':'#c4d0dd','800','right');
 });
}
function drawRuneInventoryPicker(record){
 text('CHOOSE A RUNE • SLOT '+(selectedLoadoutRune+1),1090,183,13,'#d9c797','800');addButton(1411,165,124,34,'loadout:rune-view:slots','BACK','',true,11);
 const available=Object.keys(RUNE_SET_DEFINITIONS).filter(key=>(itemInventory.runes[key]?.length||0)>0);
 if(!available.length){text('NO RUNES AVAILABLE',1314,462,16,'#c4d0dd','650','center');return}
 available.forEach((key,index)=>{
  const set=RUNE_SET_DEFINITIONS[key],col=index%3,row=Math.floor(index/3),x=1083+col*156,y=211+row*196,qty=itemInventory.runes[key].length;
  choiceRects.push({x,y,w:146,h:178,action:'loadout:rune-equip:'+selectedLoadoutRune+','+key,enabled:true});rect(x,y,146,178,'rgba(27,39,59,.82)','rgba(148,169,194,.45)',11);
  const icon=images[set.image];if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+45,y+35,56,54);
  text(set.name,x+73,y+20,11,'#f3dfb9','800','center');text(set.lines.slice(1).join(' • '),x+73,y+116,8,'#c4d2df','600','center');text('×'+qty,x+73,y+151,11,'#f0f3f7','750','center');
 });
}
function drawRuneDetail(rune){
 const set=RUNE_SET_DEFINITIONS[rune.setId],icon=images[set?.image];text('RUNE • SLOT '+(selectedLoadoutRune+1),1090,183,13,'#d9c797','800');addButton(1411,165,124,34,'loadout:rune-view:slots','BACK','',true,11);
 if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,1270,204,76,68);text(set?.name||'RUNE',1310,283,14,'#f3dfb9','850','center');
 const main=RUNE_STAT_INFO[rune.main];addButton(1090,310,445,54,'loadout:rune-main',main.label.toUpperCase(),'+'+(main.main*rune.level)+' • MAIN',true,12);
 text('SUBSTATS',1090,387,11,'#d9c797','800');
 for(let j=0;j<3;j++){const x=1090+j*151,info=RUNE_STAT_INFO[rune.subs[j]];addButton(x,402,143,61,'loadout:rune-sub:'+j,info.label,'+'+(info.main*.25*rune.level),true,10)}
 text('LEVEL '+rune.level+' / 5',1090,493,12,'#c4d0dd','700');addButton(1274,474,261,48,'loadout:rune-level:1','UPGRADE','CORE ×'+itemInventory.cores,rune.level<5&&itemInventory.cores>0,13);
 addButton(1090,547,214,48,'loadout:rune-switch','SWITCH','',true,12);addButton(1320,547,214,48,'loadout:rune-remove','REMOVE','',true,12);
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
 addButton(620,420,360,112,'startup-start','START','');
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
 }else if(kind==='daily'){
  ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.stroke();text('¢',0,1,25,color.white,'800','center');
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
 rect(124,91,145,49,'rgba(13,20,39,.96)','#718ba4',11);
 text('RANK '+playerRank,196.5,115.5,20,'#ffedd1','850','center');
 const items=[
  {label:'CAMPAIGN',icon:'story',action:'open-campaign'},
  {label:'EVENTS',icon:'events',action:'open-events'},
  {label:'STORE',icon:'store',action:'open-store'},
  {label:'LOADOUT',icon:'loadout',action:'open-loadout'},
  {label:'PARTY',icon:'party',action:'open-party'},
  {label:'INVENTORY',icon:'items',action:'open-inventory'},
  {label:'CHALLENGES',icon:'challenges',action:'open-challenges'},
  {label:'DAILY REWARD',icon:'daily',action:'claim-daily-reward',detail:canClaimDailyReward()?'CLAIM 100 COINS':'CLAIMED • RESET AT 12 AM ET'},
  {label:'SETTINGS',icon:'settings',action:'open-settings'}
 ];
 const x0=124,y0=91,cardW=318,cardH=226,gapX=20,gapY=16,positions=[[.5,0],[1.5,0],[2.5,0],[.5,1],[1.5,1],[2.5,1],[.5,2],[1.5,2],[2.5,2]];
 items.forEach((item,index)=>{const [column,row]=positions[index];drawMainMenuTile(item,x0+column*(cardW+gapX),y0+row*(cardH+gapY),cardW,cardH)});
}
function drawSettings(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.76)');rect(250,130,1100,640,'rgba(13,20,39,.98)','#ccb88e',20);
 text('SETTINGS',800,244,30,'#ffedd1','850','center');addButton(1130,168,170,54,'main-menu','MAIN MENU','');
 rect(330,300,940,360,'rgba(25,37,58,.94)','#718ba4',16);
 text('DISPLAY',800,280,18,'#f3dfb9','850','center');
 const standalone=isStandaloneApp();
 text('FULLSCREEN',375,382,18,'#edf3fa','700');
 if(standalone)text('Unavailable in the installed app',375,411,14,'#aebed0','550');
 addButton(905,365,320,64,'toggle-fullscreen',isFullscreen()?'EXIT FULLSCREEN':'ENTER FULLSCREEN','',!standalone);
 text('ACCOUNT',375,506,18,'#edf3fa','700');
 addButton(905,475,150,64,'account-sign-out','SIGN OUT','');
 addButton(1075,475,150,64,'account-delete','DELETE ACCOUNT','');
}
let lastStoreNotice='',storeReveal=null,activeStoreBanner=null,storeActionPending=false;
const STORE_ITEM_SPRITES=Object.freeze({core:'core',gem:'gem','bottle:small':'enchantedBottleSmall','bottle:medium':'enchantedBottleMedium','bottle:large':'enchantedBottleLarge','book:small':'enchantedBookSmall','book:medium':'enchantedBookMedium','book:large':'enchantedBookLarge'});
const STORE_REWARD_SPRITES=Object.freeze({'premium-soul':'soulWeaponPremium','premium-cloud':'cloudNine'});
const STORE_REVEAL_TIMING=Object.freeze({cardEnterMs:1000,cardFlipMs:500});
function getStoreRotation(){
 const ids=ROSTER.filter(model=>!model.test).map(model=>model.id);
 return FeaturedLottery.rotate(ids,new Date());
}
async function drawStoreLottery(type,count=1){
 if(storeActionPending)return false;
 if(!['character','weapon'].includes(type)||![1,10].includes(count)){lastStoreNotice='That lottery draw is unavailable.';return false}
 let result;
 storeActionPending=true;
 try{result=await window.TwoToneAccount.action('draw',{type,count})}
 catch(error){lastStoreNotice=error.message==='insufficient_coins'?`You need ${(100*count).toLocaleString()} coins for ${count} draw${count===1?'':'s'}.`:error.message==='target_required'?'Choose a banner target first.':'Lottery draw could not be completed.';return false}
 finally{storeActionPending=false}
 const rewards=result.rewards;
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
  if(ids.includes(value))window.TwoToneAccount.action('set-target',{type,target:value}).then(()=>{activeStoreBanner={type,id:value};lastStoreNotice=''}).catch(error=>{lastStoreNotice=error.message==='target_unavailable'?'The banner has changed. Choose a current target.':'Target could not be selected.'});
 }else if(kind==='draw')drawStoreLottery(type,Number(value)||1);
}
const STORE_BANNER_PORTRAITS=Object.freeze({soul:'soulFront',zero:'zeroFront',lily:'lilyFront',dawn:'dawnFront',logan:'loganFront',cloud:'cloudFront',tsunade:'portrait'});
function storeBannerImage(type,model){
 if(type==='weapon'&&model?.id==='soul')return images.soulWeaponPremium;
 if(type==='weapon'&&model?.id==='cloud')return images.cloudNine;
 if(type==='weapon'&&model?.id==='lily')return images.lilyWeaponSignature;
 if(type==='weapon'&&model?.id==='dawn')return images.dawnWeaponPremium;
 if(type==='weapon'&&model?.id==='zero')return images.zeroWeaponPremium;
 if(type==='weapon'&&model?.id==='logan')return images.loganWeaponPremium;
 return images[STORE_BANNER_PORTRAITS[model?.id]];
}
function drawStoreBannerImage(img,x,y,w,h){
 if(!img?.complete||!img.naturalWidth)return;
 const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(img,x+(w-dw)/2,y+h-dh,dw,dh);ctx.restore();
}
function drawCharacterPortrait(img,id,x,y,size){
 if(!img?.complete||!img.naturalWidth)return;
 // Portrait sources are full-body character art, so crop the centered head-and-shoulders
 // region proportionally instead of relying on offsets from the retired sprite sheets.
 const side=Math.min(img.naturalWidth,Math.round(img.naturalHeight*.34));
 const sx=Math.round((img.naturalWidth-side)/2),sy=0;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(img,sx,sy,side,side,x,y,size,size);ctx.restore();
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
 for(const id of rotation.featuredWeapons){const model=ROSTER.find(item=>item.id===id.replace(/^premium-/,''));if(model)entries.push({type:'weapon',id,name:model.id==='soul'?'Soulbound':model.id==='cloud'?'Cloud-nine':model.id==='lily'?'Everblossom':model.id==='dawn'?'Radiant Diamond':model.id==='zero'?'Nightshade':model.name+' Premium',model})}
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
 storeBannerButton(x+38,y+645,242,58,`store:draw:${entry.type}:1`,'DRAW ×1','100 COINS',!storeActionPending&&canDraw&&storeCoins>=100,true);
 storeBannerButton(x+296,y+645,242,58,`store:draw:${entry.type}:10`,'DRAW ×10','1,000 COINS',!storeActionPending&&canDraw&&storeCoins>=1000,false);
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
 if(summary||batch)text(summary?'TEN DRAW RESULTS':`DRAW ${reveal.index+1} OF ${rewards.length}`,800,summary?238:216,15,'#b9cbe0','800','center');
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
  text(current.tier.toUpperCase(),0,-145,22,current.tier==='common'?'#45627c':current.tier==='rare'?'#79509a':'#9a6913','950','center');
  ctx.save();
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(0,-32,84,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
  const rewardSprite=images[STORE_ITEM_SPRITES[current.reward.inventoryItem]||STORE_REWARD_SPRITES[current.reward.id]];
  if(rewardSprite?.complete&&rewardSprite.naturalWidth)drawStoreBannerImage(rewardSprite,-72,-104,144,144);
  else text(current.tier==='mythic'?'✦':'✧',0,-32,70,'#45627c','900','center');
  const rewardName=current.reward.name||current.reward.id;
  text(rewardName,0,82,18,'#1b3047','850','center');
  if(current.reward.inventoryItem){
   text('×'+(current.reward.quantity??1).toLocaleString('en-US'),0,137,40,'#1b3047','900','center');
  }else if(current.result&&current.result!==rewardName){
   text(current.result,0,126,15,'#344b61','750','center');
  }
 }else{
  ctx.save();ctx.strokeStyle='rgba(232,201,135,.86)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-15,69,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(127,171,210,.68)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-15,57,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-82,-15);ctx.lineTo(82,-15);ctx.moveTo(0,-97);ctx.lineTo(0,67);ctx.stroke();ctx.restore();
  text('✦',0,-15,58,'#f0d58e','900','center');
 }
 ctx.restore();
 const prompt=reveal.phase==='ready'?'TAP OR CLICK TO FLIP':reveal.phase==='flip'?'FLIPPING…':faceShown?(batch?'TAP OR CLICK FOR NEXT CARD':'TAP OR CLICK TO RETURN'):'DRAWING YOUR REWARD';
 text(prompt,800,665,16,'#fff0c9','850','center');
 if(reveal.phase==='ready'||faceShown)choiceRects.push({x:652,y:245,w:296,h:400,action:reveal.phase==='ready'?'store:reveal:flip':batch?'store:reveal:next':'store:reveal:close',enabled:true});
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
let loginEventPending=false,loginEventNotice='';

async function collectLoginEvent(){
 if(phase!=='events'||loginEventPending||getLoginEventState(window.TwoToneAccount.profile.loginEvent).status!=='available')return;
 loginEventPending=true;
 loginEventNotice='';
 try{
  await window.TwoToneAccount.action('claim-login-event');
 }catch{
  loginEventNotice='Claim could not be completed.';
 }finally{
  loginEventPending=false;
 }
}

let soulGiftPending=false,soulGiftNotice='';

async function collectSoulGift(){
 if(phase!=='events'||soulGiftPending||hasClaimedSoulGift(window.TwoToneAccount.profile))return;
 soulGiftPending=true;
 soulGiftNotice='';
 try{
  await window.TwoToneAccount.action('claim-soul-gift');
 }catch{
  soulGiftNotice='Claim could not be completed.';
 }finally{
  soulGiftPending=false;
 }
}

const EVENT_TABS=[
 {id:'login',label:'LOGIN EVENT',type:'LIMITED',draw:drawLoginEvent},
 {id:SOUL_GIFT.id,label:SOUL_GIFT.title.toUpperCase(),type:'PERMANENT',draw:drawSoulGift},
];
let activeEventTab=EVENT_TABS[0];

function openEvents(){
 activeEventTab=EVENT_TABS[0];
 loginEventNotice='';
 soulGiftNotice='';
 phase='events';
}

function drawEvents(){
 drawBackground();
 rect(0,0,W,H,'rgba(5,9,22,.84)');
 text('EVENTS',64,62,34,'#ffedd1','850');
 addButton(1260,35,192,52,'main-menu','MAIN MENU','');
 rect(64,110,268,720,'rgba(13,20,39,.96)','#718ba4',18);
 EVENT_TABS.forEach((tab,index)=>{
  const x=80,y=128+70*index,w=236,h=56,selected=tab===activeEventTab;
  rect(x,y,w,h,selected?'rgba(228,195,130,.14)':'rgba(25,37,58,.76)',selected?'#d2b77e':null,12);
  text(tab.label,x+18,y+20,21,selected?'#f4d99c':'#dce6f1',selected?'800':'650');
  text(tab.type,x+18,y+40,11,'#c4d3e4','750');
  choiceRects.push({x,y,w,h,action:'event-tab:'+tab.id,enabled:true});
 });
 activeEventTab.draw();
}

function drawLoginEvent(){
 text('LOGIN EVENT',906,62,36,'#ffedd1','850','center');
 const now=new Date();
 const event=getLoginEventState(window.TwoToneAccount.profile.loginEvent,now);
 const featured=getStoreRotation().featuredCharacters;
 const bannerX=360,bannerY=110,bannerW=1092,bannerH=458;
 const backdrop=ctx.createLinearGradient(bannerX,bannerY,bannerX+bannerW,bannerY+bannerH);
 backdrop.addColorStop(0,'#172747');
 backdrop.addColorStop(.48,'#352f60');
 backdrop.addColorStop(1,'#79565e');
 rect(bannerX,bannerY,bannerW,bannerH,backdrop,'#c6a873',18);
 ctx.save();
 ctx.beginPath();
 ctx.roundRect(bannerX+1,bannerY+1,bannerW-2,bannerH-2,17);
 ctx.clip();
 const glow=ctx.createRadialGradient(1040,340,20,1040,340,420);
 glow.addColorStop(0,'rgba(255,221,155,.62)');
 glow.addColorStop(1,'rgba(255,205,135,0)');
 ctx.fillStyle=glow;
 ctx.fillRect(bannerX,bannerY,bannerW,bannerH);
 ctx.strokeStyle='rgba(247,221,168,.28)';
 ctx.lineWidth=2;
 for(const radius of [180,210,245]){
  ctx.beginPath();ctx.arc(1040,339,radius,0,Math.PI*2);ctx.stroke();
 }
 for(let i=0;i<26;i++){
  const x=605+(i*97)%819,y=134+(i*139)%405;
  ctx.fillStyle=i%3===0?'#f7db9e':'rgba(255,235,190,.43)';
  ctx.fillRect(x,y,i%3===0?3:2,i%3===0?3:2);
 }
 const poses=[
  {x:835,y:124,w:450,h:444},
  {x:752,y:133,w:390,h:391},
  {x:978,y:123,w:390,h:410},
 ];
 if(featured.length===1)poses[0]={x:808,y:123,w:470,h:445};
 if(featured.length===2){poses[0].x=901;poses[1].x=773}
 const lineup=featured.map((id,index)=>({id,pose:poses[index]}));
 for(const {id,pose} of [...lineup.slice(1),...lineup.slice(0,1)]){
  drawStoreBannerImage(images[STORE_BANNER_PORTRAITS[id]],pose.x,pose.y,pose.w,pose.h);
 }
 ctx.restore();
 rect(388,128,152,52,'rgba(13,21,38,.92)','#c6a873',12);
 text(formatLoginEventCountdown(event.resetDate,now),464,154,24,'#fff4e1','850','center');
 text('Claim up to 1,000 coins',408,329,35,'#fff4e1','850');

 const coin=images.coin;
 LOGIN_EVENT_REWARDS.forEach((coins,index)=>{
  const x=360+158*index,y=596,claimed=index<event.claims,next=index===event.claims&&event.status==='available';
  rect(x,y,144,131,claimed?'#25394a':'#17243c',next?'#f6cf84':'#687e9a',12);
  text('CLAIM '+(index+1),x+72,y+24,14,'#c4d3e4','750','center');
  if(coin?.complete&&coin.naturalWidth)ctx.drawImage(coin,x+54,y+42,36,36);
  text(claimed?'✓ '+coins+' coins':coins+' coins',x+72,y+104,19,claimed?'#bde4cd':'#f6d9a6','800','center');
 });
 const labels={available:'CLAIM',upcoming:'UPCOMING','claimed-today':'CLAIMED TODAY',complete:'CYCLE COMPLETE'};
 if(event.status==='available')text(event.nextCoins+' coins',1212,752,17,'#f4d99c','750');
 addButton(1212,769,240,60,'claim-login-event',loginEventPending?'CLAIMING…':labels[event.status],'',!loginEventPending&&event.status==='available');
 if(loginEventNotice)text(loginEventNotice,360,800,20,'#ffccbf','650');
}

function drawSoulGift(){
 text(SOUL_GIFT.title.toUpperCase(),906,62,36,'#ffedd1','850','center');
 const x=360,y=110,w=1092,h=458;
 const backdrop=ctx.createLinearGradient(x,y,x+w,y+h);
 backdrop.addColorStop(0,'#10172a');
 backdrop.addColorStop(.52,'#20283e');
 backdrop.addColorStop(1,'#34314b');
 rect(x,y,w,h,backdrop,'#c6a873',18);

 ctx.save();
 ctx.beginPath();
 ctx.roundRect(x+1,y+1,w-2,h-2,17);
 ctx.clip();

 const light=ctx.createRadialGradient(1090,282,20,1090,282,400);
 light.addColorStop(0,'rgba(193,165,133,.46)');
 light.addColorStop(.56,'rgba(115,128,170,.17)');
 light.addColorStop(1,'rgba(115,128,170,0)');
 ctx.fillStyle=light;
 ctx.fillRect(x,y,w,h);

 // Frame the weapon separately so its silhouette stays clear of Soul.
 ctx.save();
 ctx.translate(1125,495);
 ctx.rotate(-Math.PI/4);
 ctx.fillStyle='rgba(185,180,218,.09)';
 ctx.fillRect(0,-42,440,84);
 ctx.fillStyle='rgba(223,212,241,.18)';
 ctx.fillRect(0,-43,440,1);
 ctx.fillRect(0,42,440,1);
 ctx.restore();

 drawStoreBannerImage(images.soulWeaponPremium,1120,163,324,324);
 // Extend the full-resolution character art below the clip for a closer crop.
 drawStoreBannerImage(images.soulFront,811,136,330,660);

 const fade=ctx.createLinearGradient(0,416,0,y+h);
 fade.addColorStop(0,'rgba(16,23,42,0)');
 fade.addColorStop(1,'rgba(16,23,42,.86)');
 ctx.fillStyle=fade;
 ctx.fillRect(x,416,w,y+h-416);
 ctx.restore();

 text('A gift from Soul',420,295,43,'#fff4e1','850');
 text('Claim once per account',421,345,22,'#f0d8b3','650');

 const claimed=hasClaimedSoulGift(window.TwoToneAccount.profile);
 const rewards=[{name:'Coins',image:'coin',quantity:SOUL_GIFT.coins},...SOUL_GIFT.items];
 rewards.forEach(({name,image,quantity},index)=>{
  const cardX=x+222*index,cardY=596,cardW=204,center=cardX+cardW/2;
  rect(cardX,cardY,cardW,131,claimed?'#25394a':'#17243c','#687e9a',12);
  drawStoreBannerImage(images[image],center-30,cardY+12,60,54);
  text(quantity.toLocaleString('en-US'),center,cardY+85,22,'#f6d9a6','800','center');
  text(name,center,cardY+110,14,'#dce6f1','650','center');
 });
 const label=claimed?'CLAIMED':soulGiftPending?'CLAIMING…':'CLAIM';
 addButton(1212,769,240,60,'claim-soul-gift',label,'',!claimed&&!soulGiftPending);
 if(soulGiftNotice&&!claimed)text(soulGiftNotice,360,800,20,'#ffccbf','650');
}

function drawItemInventory(){
 drawBackground();rect(0,0,W,H,'rgba(5,9,22,.74)');rect(105,55,1390,790,'rgba(13,20,39,.98)','#ccb88e',20);
 text('INVENTORY',800,103,32,'#ffedd1','850','center');addButton(1280,78,165,52,'main-menu','MAIN MENU','');
 const entries=[
  ...[['Small Enchanted Bottle','10 Character XP',itemInventory.bottles.small,'enchantedBottleSmall'],['Medium Enchanted Bottle','100 Character XP',itemInventory.bottles.medium,'enchantedBottleMedium'],['Large Enchanted Bottle','1,000 Character XP',itemInventory.bottles.large,'enchantedBottleLarge'],['Small Enchanted Book','10 Weapon XP',itemInventory.books.small,'enchantedBookSmall'],['Medium Enchanted Book','100 Weapon XP',itemInventory.books.medium,'enchantedBookMedium'],['Large Enchanted Book','1,000 Weapon XP',itemInventory.books.large,'enchantedBookLarge'],['Core','Rune / Celestial upgrade',itemInventory.cores,'core'],['Gem','Character / weapon Ascension',itemInventory.gems,'gem']].map(([name,detail,count,image])=>({name,detail,count,image})),
  ...Object.entries(RUNE_SET_DEFINITIONS).map(([id,set])=>({name:set.name,detail:'Rune Set piece',count:ownedRuneCount(id),image:set.image}))
 ];
 const ownedEntries=entries.filter(item=>item.count>0);
 const columns=5,cardW=244,cardH=155,gapX=18,gapY=13,x0=154,y0=151;
 ownedEntries.forEach((item,index)=>{
  const row=Math.floor(index/columns),column=index%columns;
  const x=x0+column*(cardW+gapX),y=y0+row*(cardH+gapY),icon=images[item.image];
  rect(x,y,cardW,cardH,'rgba(25,37,58,.94)','#718ba4',12);
  if(icon?.complete&&icon.naturalWidth)drawStoreBannerImage(icon,x+84,y+8,76,64);
  text(item.name,x+cardW/2,y+91,14,'#f3e5c9','800','center');
  text(item.detail,x+cardW/2,y+113,12,'#c4d0dd','600','center');
  text('×'+item.count,x+cardW/2,y+138,14,'#f0f3f7','750','center');
 });
 if(!ownedEntries.length)text('INVENTORY EMPTY',800,475,20,'#c4d0dd','700','center');
}
function drawCampaignSelector(){
 drawBackground();
 rect(0,0,W,H,'rgba(5,9,22,.74)');
 text('CAMPAIGN',64,83,34,'#ffedd1','850');
 addButton(1316,53,220,58,'main-menu','MAIN MENU','');
 rect(64,148,454,660,'rgba(13,20,39,.96)','#718ba4',18);
 rect(550,148,986,660,'rgba(13,20,39,.96)','#718ba4',18);

 const rows=campaignSelectorRows();
 const cleared=window.TwoToneAccount.profile.clearedCampaignEntries??[];
 const offset=campaignPage*CAMPAIGN_CHOICES_PER_PAGE;
 rows.slice(offset,offset+CAMPAIGN_CHOICES_PER_PAGE).forEach((row,index)=>{
  const y=165+70*index,x=80+28*row.depth,w=422-28*row.depth;
  const selected=row.entry&&row.entry===previewedCampaignEntry;
  const locked=row.entry&&!isCampaignEntryUnlocked(row.entry,cleared);
  const status=row.entry?(cleared.includes(row.entry.id)?'CLEARED':locked?'LOCKED':'AVAILABLE'):'';
  if(selected)rect(x,y,w,56,'rgba(228,195,130,.14)','#d2b77e',12);
  else rect(x,y,w,56,'rgba(25,37,58,.76)',null,12);
  const label=row.entry?row.title:(row.expanded?'▾  ':'▸  ')+row.title;
  text(label,x+18,y+28,23,selected?'#f4d99c':'#dce6f1',selected?'800':'650');
  if(status)text(status,x+w-16,y+28,13,locked?'#aab7c9':'#dfc894','750','right');
  choiceRects.push({x,y,w,h:56,action:'campaign-option:'+String(offset+index),enabled:true});
 });
 if(campaignPage>0)addButton(80,744,152,48,'campaign-previous','PREVIOUS','');
 if(offset+CAMPAIGN_CHOICES_PER_PAGE<rows.length)addButton(350,744,152,48,'campaign-next','NEXT','');

 const entry=previewedCampaignEntry;
 if(!entry){text('Select a part',604,220,36,'#ffedd1','800');return}
 text(entry.title,604,223,44,'#ffedd1','850');
 const unlocked=isCampaignEntryUnlocked(entry,cleared);
 if(!unlocked){
  const prerequisite=getCampaignEntry(entry.prerequisiteEntryId);
  text('Clear '+prerequisite.title+' to unlock.',604,321,29,'#d6e2ef','650');
  return;
 }
 let line='',y=318;
 ctx.font='600 30px system-ui,-apple-system,Segoe UI,sans-serif';
 for(const word of entry.summary.split(' ')){
  const next=line?line+' '+word:word;
  if(line&&ctx.measureText(next).width>850){
   text(line,604,y,30,'#d6e2ef');
   line=word;
   y+=42;
  }else line=next;
 }
 if(line)text(line,604,y,30,'#d6e2ef');
 addButton(1218,707,262,62,'campaign-start',cleared.includes(entry.id)?'REPLAY PART':'START PART','');
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
   const portrait=images[characterPortraitArt(p.id)];
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
 const characters=availableCharacters();for(let i=0;i<characters.length;i++){
   const p=characters[i],x=172+(i%4)*344,y=520+Math.floor(i/4)*84,w=320,h=74,selected=draft.includes(p.id);
  rect(x,y,w,h,selected?'rgba(35,59,76,.92)':'rgba(29,41,67,.94)',selected?'#8fbcad':'#7e97b0',11);
  const portrait=images[characterPortraitArt(p.id)];
  if(portrait?.complete&&portrait.naturalWidth)drawCharacterPortrait(portrait,p.id,x+8,y+6,58);
  text(p.name,x+77,y+29,18,'#f5e9dc','800');
  if(p.test)text('TEST PLACEHOLDER',x+77,y+49,10,'#e5ca99','600');
  addButton(x+w-105,y+20,91,34,`add:${p.id}`,selected?'IN PARTY':'ADD','',!selected&&draft.length<MAX_PARTY_SIZE);
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
function allyBattleArt(id,view){
 return id==='soul'?(view==='party'||view==='ally-impact'?'soulFront':equippedSoulBattleSprite()):id==='zero'?(view==='party'||view==='ally-impact'?'zeroFront':equippedZeroBattleSprite()):id==='lily'?(view==='party'||view==='ally-impact'?'lilyFront':equippedLilyBattleSprite()):id==='dawn'?(view==='party'||view==='ally-impact'?'dawnFront':equippedDawnBattleSprite()):id==='logan'?(view==='party'||view==='ally-impact'?'loganFront':equippedLoganBattleSprite()):id==='cloud'?(view==='party'||view==='ally-impact'?'cloudFront':equippedCloudBattleSprite()):'portrait';
}
function drawUnit(p,pos,view,t,acting=false){
 if(!p||!pos)return;const {x,baseY,w,h}=pos,top=baseY-h;
 const bob=Math.sin(t*.0012+(p.id==='soul'?0:1))*(p.hp>0?1.25:0);
 const select=view==='party'&&selectedAllyId===p.id;const allyTargeting=view==='party'&&pendingTargetAction?.targetSide==='ally',allTeamTargeting=allyTargeting&&pendingTargetAction?.targetScope==='all',supportAnimating=view==='ally-impact'&&phase==='resolve'&&fx?.kind==='support'&&fx.targetAllyId===p.id,eligible=view==='party'&&supportDemo?eligibleAllyTarget(p,supportDemo):allyTargeting?p.hp>0:true;
 ctx.save();ctx.translate(camera.currentX*(view==='party'?.32:.52),bob);
 ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.44,16,0,0,Math.PI*2);ctx.fillStyle='rgba(12,12,40,.45)';ctx.fill();
 if(acting||select){ctx.beginPath();ctx.ellipse(x+w/2,baseY+1,w*.51,22,0,0,Math.PI*2);ctx.lineWidth=4;ctx.strokeStyle=select?(allyTargeting||supportAnimating?'#55aaff':'#eaca94'):'#8be3fb';ctx.stroke()}
 if(p.hp<=0)ctx.globalAlpha=.37;
 const art=allyBattleArt(p.id,view);
 const zb=view==='command'&&p.id==='soul'?soulBasicStage(t):null;
  if(zb!==null)soulBasicPaint(x,baseY,w,h,zb,art);
  else if(art&&images[art]?.complete&&images[art].naturalWidth){
  const img=images[art],fullArtwork=art==='soulFront'||art==='zeroFront'||art==='lilyFront'||art==='dawnFront'||art==='loganFront'||art==='cloudFront';ctx.imageSmoothingEnabled=fullArtwork||art==='zeroBattle'||art==='zeroBattlePremium'||art==='dawnBattle'||art==='dawnPremiumBattle';
  if(fullArtwork){
   // Ally targeting uses the same full-body front artwork across the entire party.
   ctx.drawImage(img,x,top,w,h);
  }else if(art==='soul'||art==='soulBattleStandard'||art==='soulBattlePremium'||art==='zeroBattle'||art==='zeroBattlePremium'||art==='lilyStandardBattle'||art==='lilySignatureBattle'||art==='loganBattle'||art==='loganBattlePremium'||art==='cloudWindcallBattle'||art==='cloudNineBattle'){
   // Fit the visible cutout to the same enlarged battle-stage height across
   // playable characters, removing transparent source-image margins.
   const b=spriteAlphaBounds(img),scale=(h*1.12)/b.h,drawW=b.w*scale,drawH=b.h*scale;
   ctx.drawImage(img,b.x,b.y,b.w,b.h,x+(w-drawW)/2,baseY-drawH,drawW,drawH);
  }else if(art==='dawnBattle'||art==='dawnPremiumBattle'){
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
const ENEMY_SPRITE_SCALE={common:1,elite:1.25,boss:1.5};
function drawEnemy(t,shot){const all=enemies;if(phase==='player'&&pendingTargetAction&&cameraPreview!=='party'&&previewTargetMode()==='aoe'&&combatEnemies().length){ctx.save();ctx.strokeStyle='rgba(102,243,211,.82)';ctx.lineWidth=5;ctx.setLineDash([22,12]);ctx.beginPath();ctx.ellipse(1093+camera.currentX*.43,558,453,67,0,0,Math.PI*2);ctx.stroke();ctx.restore()}for(const e of all){
 const defeated=e.hp<=0,deathElapsed=defeated?Math.max(0,t-(e.deathAt||t)):0,deathProgress=Math.min(1,deathElapsed/ENEMY_DEATH_BEAT_MS),entering=!defeated&&e.reinforcement&&e.enteredAt&&t-e.enteredAt<ENEMY_REINFORCEMENT_ENTRY_MS,entryProgress=entering?Math.max(0,Math.min(1,(t-e.enteredAt)/ENEMY_REINFORCEMENT_ENTRY_MS)):1,opacity=defeated?Math.max(0,1-deathProgress):entryProgress;
 ctx.save();ctx.globalAlpha=opacity;
 const isFocus=phase==='player'&&chosenEnemy()?.id===e.id;
 const patternHit=phase==='player'&&!!pendingTargetAction&&cameraPreview!=='party'&&chooseAttackTargets(previewTargetMode()).some(x=>x.id===e.id);
 const isActor=(shot==='enemy-windup'&&actingEnemyId===e.id)||(fx?.kind==='enemy'&&fx?.actorEnemyId===e.id&&shot==='enemy-impact');
 const sh=(isActor?1.09:shot==='attack-impact'&&fx?.targetEnemyId===e.id?1.045:1)*(ENEMY_SPRITE_SCALE[e.category]??1)*((e.reinforcement&&e.enteredAt)?0.92+entryProgress*.08:1);
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
  const statusLabels=[...(e.debuffs?.some(effect=>effect.id==='stun')?['STUN']:[]),...(e.debuffs?.some(effect=>effect.id==='tsunade-physical-defense-down')?['DEF ↓']:[]),...(e.debuffs?.some(effect=>effect.id==='tsunade-attack-down')?['ATK ↓']:[])];
  if(statusLabels.length)text(statusLabels.join(' • '),xx+ww/2,yy-72,10,'#ffd5eb','900','center');
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
function drawCoverImage(img,mirror=false){
 if(!img?.complete||!img.naturalWidth||!img.naturalHeight)return false;
 const scale=Math.max(W/img.naturalWidth,H/img.naturalHeight),sw=W/scale,sh=H/scale,sx=(img.naturalWidth-sw)/2,sy=(img.naturalHeight-sh)/2;
 ctx.save();ctx.imageSmoothingEnabled=true;
 if(mirror){ctx.translate(W,0);ctx.scale(-1,1)}
 ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);ctx.restore();return true;
}
function drawBattleAreaBackground(areaId,reverse=false){
 const area=BATTLE_AREAS[areaId]||BATTLE_AREAS[DEFAULT_BATTLE_AREA_ID];
 const hasReverse=reverse&&!!area.reverseBackground;
 return drawCoverImage(images[hasReverse?area.reverseBackground:area.background],reverse&&!hasReverse);
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
   else if(fx.visual==='goblin-pursuit'){ctx.strokeStyle='#f4d280';ctx.lineWidth=8;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-70+q*35+i*14,y-24+i*18);ctx.lineTo(x-15+q*55+i*14,y-24+i*18);ctx.stroke()}drawCombatSigil(x+35,y,26+q*24,'#ffdf92',fade,'ring')}
   else if(fx.visual==='hawk-talon'){ctx.strokeStyle='#e8c78e';ctx.lineWidth=8;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-48+i*22,y-50);ctx.quadraticCurveTo(x-12+i*18,y+8,x+40+i*12,y+50);ctx.stroke()}drawCombatSigil(x,y,24+q*20,'#f6ddb0',fade,'ring')}
   else if(fx.visual==='geode-impact'){ctx.strokeStyle='#b8c5d4';ctx.fillStyle='rgba(157,178,199,.3)';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x-55,y-48);ctx.lineTo(x-24,y-65);ctx.lineTo(x+10,y-42);ctx.lineTo(x+56,y-52);ctx.lineTo(x+49,y+18);ctx.lineTo(x+12,y+61);ctx.lineTo(x-42,y+48);ctx.lineTo(x-60,y+5);ctx.closePath();ctx.fill();ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-25+i*24,y-34);ctx.lineTo(x-12+i*18,y+34);ctx.stroke()}drawCombatSigil(x,y,28+q*34,'#d7e5f4',fade,'ring')}
   else if(fx.visual==='bear-claws'){ctx.strokeStyle='#dbdad5';ctx.lineWidth=12;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-42+i*24,y-58);ctx.lineTo(x+42+i*24,y+55);ctx.stroke()}drawCombatSigil(x,y,32+q*35,'#e4e0d8',fade,'ring')}
   else{ctx.strokeStyle='#ff8997';ctx.lineWidth=11;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-54+i*15,y-66);ctx.lineTo(x+45+i*15,y+55);ctx.stroke()}}
   ctx.restore();if(hit.dodged)drawCombatSigil(x,y,28+q*22,'#a8e8ff',fade,'ring');if(dt>ANIMATION_STEP_MS){const labelY=hudHit?y+34:y-65,damage=hit.healthDamage??hit.damage??fx.damage;if(hit.dodged)text('DODGE',x,labelY,22,'#a8e8ff','900','center');else if(damage>0)text('-'+damage,x,labelY,26,hit.critical?'#ffd66e':'#ff9d9e','900','center');else if(hit.shieldDamage>0)text('BLOCKED',x,labelY,17,'#b6efff','900','center');if(hit.critical)text('CRITICAL',x,hudHit?y+12:y-96,12,'#ffe9a9','900','center')}}return;
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
 for(const event of combatVisualEvents){if(t<event.at)continue;const q=clamp01((t-event.at)/event.duration),fade=1-q;
  if(event.type==='zero-delay'){
   for(const id of event.targetIds){const pos=enemyVisualPosition(id);if(!pos)continue;drawCombatSigil(pos.x,pos.y,28+q*44,'#f57482',fade,'ring');text('DELAYED 20%',pos.x,pos.y-58,13,`rgba(255,220,223,${fade})`,'900','center')}continue;
  }
  if(event.type==='reflect-damage'){
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52;
   for(const id of event.targetIds){const ally=party.find(unit=>unit.id===id),allyPosition=ally&&cameraAllyPosition(id,view),enemyPosition=!ally&&enemyVisualPosition(id),x=allyPosition?allyPosition.x+allyPosition.w/2+camera.currentX*pan:enemyPosition?.x,y=allyPosition?allyPosition.baseY-allyPosition.h*.58:enemyPosition?.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;drawCombatSigil(x,y,30+q*24,'#ff8c86',fade,'ring');const label=event.dodged?'REFLECT DODGED':event.damage+event.shieldDamage>0?`REFLECT -${event.damage+event.shieldDamage} TRUE`:'REFLECT';text(label,x,y+34,13,`rgba(255,230,224,${fade})`,'900','center')}
   continue;
  }
  if(event.type==='echo-damage'){
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52,color=event.damageType==='physical'?'#f2b36f':event.damageType==='magical'?'#c595ff':'#79e3ff';
   for(const id of event.targetIds){const ally=party.find(unit=>unit.id===id),allyPosition=ally&&cameraAllyPosition(id,view),enemyPosition=!ally&&enemyVisualPosition(id),x=allyPosition?allyPosition.x+allyPosition.w/2+camera.currentX*pan:enemyPosition?.x,y=allyPosition?allyPosition.baseY-allyPosition.h*.58:enemyPosition?.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;drawCombatSigil(x,y,27+q*26,color,fade,'ring');const label=event.healthDamage>0?`ECHO -${event.healthDamage} ${event.damageType.toUpperCase()}`:event.shieldDamage>0?'ECHO BLOCKED':'ECHO';text(label,x,y+34+(event.stackIndex%3)*16,13,`rgba(239,247,255,${fade})`,'900','center')}
   continue;
  }
  if(event.type.startsWith('rune-')){
   const runeKey=event.type.slice(5),set=RUNE_SET_DEFINITIONS[runeKey],labels={recycle:'+1 SKILL POINT • ADVANCE 80%',amplify:'BASIC ATTACK +50%',united:'ALLY LINKED • BASIC ATTACK AT 50%', 'eternal-sun':'ULTIMATE COST −20 • NEXT ACTION +20 ENERGY', 'celestial-star':'GUARANTEED CRITICAL • CRIT DAMAGE +25%', 'dark-matter':'IGNORE DEFENSES 40%', 'infinite-space':'DELAY ALL 100%'};
   const view=shotWorld(shot)==='reverse'?'party':'command',pan=view==='party'?.32:.52;
   for(const id of event.targetIds){const ally=party.find(unit=>unit.id===id),allyPosition=ally&&cameraAllyPosition(id,view),enemyPosition=!ally&&enemyVisualPosition(id);const x=allyPosition?allyPosition.x+allyPosition.w/2+camera.currentX*pan:enemyPosition?.x,y=allyPosition?allyPosition.baseY-allyPosition.h*.62:enemyPosition?.y;if(!Number.isFinite(x)||!Number.isFinite(y))continue;drawCombatSigil(x,y,30+q*24,set?.name==='Recycle'?'#80ecbb':'#f1d28b',fade,'ring');const icon=images[set?.image];if(icon?.complete&&icon.naturalWidth){ctx.save();ctx.globalAlpha=fade;ctx.imageSmoothingEnabled=true;ctx.drawImage(icon,x-16,y-58,32,32);ctx.restore()}text(labels[runeKey]||set?.name||'RUNE',x,y-72,13,`rgba(255,244,220,${fade})`,'900','center')}
   continue;
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
   else if(event.type==='lily-ricochet-trigger'){drawCombatSigil(p.x,p.y,38+q*45,'#f0b2ff',fade,'ring');text('RICOCHET',p.x,p.y-78,14,`rgba(250,224,255,${fade})`,'950','center');const damage=event.damageByTarget?.[id];if(event.dodgedTargets?.includes(id)){drawCombatSigil(p.x,p.y,29+q*17,'#a8e8ff',fade,'ring');text('DODGE',p.x,p.y-55,20,`rgba(168,232,255,${fade})`,'950','center')}else if(Number.isFinite(damage))text(`-${damage} TRUE`,p.x,p.y-55,20,`rgba(250,238,255,${fade})`,'950','center')}
   else if(event.type==='soul-follow-up'){drawCombatSigil(p.x,p.y,34+q*46,'#64d9ff',fade,'ring');drawCombatSigil(p.x,p.y,18+q*26,'#effcff',fade,'star');ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#e6f9ff';ctx.shadowColor='#62d5ff';ctx.shadowBlur=18;ctx.lineWidth=9*(1-q*.35);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-43,p.y-42);ctx.lineTo(p.x+43,p.y+42);ctx.moveTo(p.x+43,p.y-42);ctx.lineTo(p.x-43,p.y+42);ctx.stroke();ctx.restore();text('FOLLOW-UP',p.x,p.y-75,15,`rgba(212,247,255,${fade})`,'950','center');const damage=event.damageByTarget?.[id];if(event.dodgedTargets?.includes(id)){drawCombatSigil(p.x,p.y,29+q*17,'#a8e8ff',fade,'ring');text('DODGE',p.x,p.y-52,22,`rgba(168,232,255,${fade})`,'950','center')}else if(Number.isFinite(damage))text(`-${damage}`,p.x,p.y-52,22,`rgba(238,251,255,${fade})`,'950','center')}
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
function hudStatusList(p){const runeState=runeCombatState[p.id],runeStatuses=[];for(const effect of ['recycle','amplify','celestial-star','united'])if(hasRuneSet(p.id,effect)&&runeState?.cooldowns[effect]>0)runeStatuses.push({kind:'debuff',image:RUNE_SET_DEFINITIONS[effect].image,turns:runeState.cooldowns[effect]});const stun=p.debuffs?.find(effect=>effect.id==='stun'),slowStart=p.marks?.filter(mark=>mark.id==='tsunade-slow-start')||[],debuffStatuses=(p.debuffs||[]).filter(effect=>['tsunade-physical-defense-down','tsunade-attack-down'].includes(effect.id)).map(effect=>({kind:'debuff',icon:effect.id==='tsunade-physical-defense-down'?'D':'A',turns:effect.turns}));return [...(Array.isArray(p.hudStatuses)?p.hudStatuses:[]),...runeStatuses,...(stun?[{kind:'debuff',icon:'✹',turns:stun.turns}]:[]),...debuffStatuses,...(slowStart.length?[{kind:'buff',icon:'S',stacks:slowStart.length,turns:slowStart[0].turns}]:[]),...(p.tune?[{kind:'buff',icon:'♫',turns:p.tune.turns}]:[]),...(p.residueStacks?[{kind:'debuff',icon:'R',stacks:p.residueStacks,turns:p.residueTurns}]:[])]}
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
  const statusImage=ef.image&&images[ef.image];if(statusImage?.complete&&statusImage.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(statusImage,bx+2,by+2,iconSize-4,iconSize-4);ctx.restore()}else text(String(ef.icon||'✦').slice(0,2),bx+iconSize/2,by+15,15,'#f7f5ff','750','center');
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
  hudPortrait(images[characterPortraitArt(p.id)],portraitX,portraitY,portraitSize,portraitSize,true);
  if(ko)rect(portraitX,portraitY,portraitSize,portraitSize,'rgba(30,17,23,.62)',null,10);
  drawAllyUltimate(p,x+95,top-15,136);
  drawAllyStatuses(p,portraitX,portraitY,portraitSize);
  text(String(ko?0:p.hp),x+cardW-12,top+132,14,ko?'#f0afb7':'#e4f3ef','750','right');
  shieldedHealthBar(x+12,top+149,cardW-48,14,ko?0:p.hp,p.maxHp,p.shield,ko?'#b16b76':'#67e3b4','#23374d');
  if(p.id==='soul'){
   const maximum=soulFollowUpLimit(),current=Math.max(0,Math.min(maximum,soulFollowUpState.remaining));
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
 else if(id==='cloud')hudPortrait(images.cloudFront,xx+7,yy+5,49,44);
 else if(ally)hudPortrait(images.portrait,xx+7,yy+5,49,44);
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
  text(`${focus.name}  LV. ${focus.level}`,961,44,19,'#fff3db','750');
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
 if(canAccessMainMenu())addButton(810,548,220,66,'main-menu','MAIN MENU','');
}
function drawStory(){
 const {title,story}=campaignEntry;
 const beat=story.beats[storyBeatIndex];
 rect(0,0,W,H,'#101829');
 const art=storyBeatArt;
 drawCoverImage(art.background);
 rect(0,0,W,H,'rgba(3,7,15,.28)');
 rect(180,490,1240,354,'rgba(13,21,38,.94)','#d8c38f',20);
 const textX=beat.portrait?540:238;
 text(title,textX,541,34,'#fff0d4','850');
 if(art.portrait?.complete&&art.portrait.naturalWidth)ctx.drawImage(art.portrait,238,460,262,262);
 if(prefetchedStoryBeatIndex!==storyBeatIndex&&art.background?.complete&&(!art.portrait||art.portrait.complete)){
  const nextBeat=story.beats[storyBeatIndex+1];
  if(nextBeat)requestStoryBeat(story,nextBeat,'low');
  if(prefetchedStoryBeatIndex===-1)prefetchCampaignBattle(campaignEntry.encounter);
  prefetchedStoryBeatIndex=storyBeatIndex;
 }
 const textWidth=beat.portrait?822:1110;
 let narrationY=585;
 let line='';
 ctx.font='600 28px system-ui,-apple-system,Segoe UI,sans-serif';
 for(const word of beat.text.split(' ')){
  const next=line?line+' '+word:word;
  if(line&&ctx.measureText(next).width>textWidth){
   text(line,textX,narrationY,28,'#eff6ff');
   narrationY+=31;
   line=word;
  }else line=next;
 }
 if(line)text(line,textX,narrationY,28,'#eff6ff');
 if(canAccessMainMenu())addButton(238,755,210,62,'main-menu','MAIN MENU','');
 const finalBeat=storyBeatIndex===story.beats.length-1;
 addButton(1120,755,242,62,'advance-story',finalBeat?'BEGIN BATTLE':'CONTINUE','');
}
function drawResult(){
 rect(0,0,W,H,'rgba(3,7,15,.72)');
 text(phase==='victory'?'VICTORY':'DEFEAT',800,196,42,phase==='victory'?'#f7dd9f':'#f29ba4','900','center');
 rect(310,220,980,455,'rgba(13,21,38,.98)','#d8c38f',20);
 text(phase==='victory'?'ENEMIES DEFEATED  •  '+totalEnemyDefeats+'    WAVES CLEARED  •  '+wavePlan.length:'ALLIES DEFEATED',370,310,23,'#edf2f7','750');
 text('TURNS  '+turn,370,356,18,'#a9bcce','600');
 text('PARTY  '+party.length+' / '+MAX_PARTY_SIZE,370,390,18,'#a9bcce','600');
 if(campaignEntry){
  const status=campaignReward?.status;
  if(phase==='victory'){
   const label=DEV_MODE?'Developer battle':status==='saved'?(campaignReward.coins||campaignReward.rankXp?[campaignReward.coins&&`+${campaignReward.coins} coins`,campaignReward.rankXp&&`+${campaignReward.rankXp} Rank XP`].filter(Boolean).join(' • '):'First-clear reward already received'):status==='error'?'Progress could not be saved.':'Saving progress…';
   text(label,370,438,23,'#f7dd9f','750');
  }
  const canLeave=status!=='pending'&&status!=='error';
  addButton(430,532,220,90,status==='error'?'retry-campaign-save':'restart',status==='error'?'RETRY SAVE':phase==='defeat'?'RETRY':'REPLAY','',status!=='pending');
  if(campaignEntry.nextEntryId&&phase==='victory'&&status==='saved')addButton(690,532,220,90,'next-campaign-entry','CONTINUE','');
  if(canAccessMainMenu())addButton(950,532,220,90,'main-menu','MAIN MENU','',canLeave);
  return;
 }
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
   const portrait=images[characterPortraitArt(p.id)];
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
  for(const [i,mode,label] of [['slime','SLIME'],['wolf','WOLF'],['hawk','HAWK'],['mixed','MIXED'],['goblin','GOBLIN'],['geode','GEODE'],['bear','BEAR']].entries())addButton(160+i*178,600,164,48,'roster-'+mode,label,enemyRosterMode===mode?'SELECTED':'');
  text('HP RECOVERY  •  '+(trainingRecoveryMode==='restore'?'RESTORE':'PRESERVE'),538,468,16,'#d2ddec','650');
  addButton(538,487,470,54,'toggle-recovery','CHANGE HP RECOVERY','');
 }
 addButton(1039,733,313,79,'start','START BATTLE','',validTeam(draft));
}
// Transient hint popovers belong to menus and setup screens. Combat has
// dedicated turn, targeting, and action-resolution cues; overlaying another
// message on the battlefield obscures character cards and action effects.
function drawHint(t){if(hint&&t-hintAt<2300&&['startup','menu','partySetup','loadout','inventory','challenges','settings','store','setup'].includes(phase)){rect(474,393,652,76,'rgba(15,21,39,.98)','#e6b98a',12);text(hint,800,431,20,'#fff4e8','700','center')}}
function loop(t){choiceRects=[];ctx.clearRect(0,0,W,H);if(phase==='startup'){drawStartupMenu()}else if(phase==='menu'){drawMainMenu()}else if(phase==='partySetup'){drawPartySetup()}else if(phase==='loadout'){drawLoadout()}else if(phase==='inventory'){drawItemInventory()}else if(phase==='challenges'){drawChallenges()}else if(phase==='settings'){drawSettings()}else if(phase==='store'){drawStore()}else if(phase==='events'){drawEvents()}else if(phase==='campaign'){drawCampaignSelector()}else if(phase==='story'){drawStory()}else if(phase!=='setup'){
  drawCameraStage(t);drawFx(t);drawHud(t)
 }else{drawCameraStage(t);drawSetup()}drawHint(t);requestAnimationFrame(loop)}
function choose(x,y){for(let i=choiceRects.length-1;i>=0;i--){const b=choiceRects[i];if(x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)continue;if(!b.enabled){say('Action not currently available.');return}const cmd=b.action;if(cmd.startsWith('event-tab:')){
 const tab=EVENT_TABS.find(event=>event.id===cmd.slice(10));
 if(phase==='events'&&tab)activeEventTab=tab;
 return
 }if(cmd.startsWith('campaign-option:')){chooseCampaignOption(Number(cmd.slice(16)));return}if(cmd.startsWith('roster-')){if(DEV_MODE)setEnemyRoster(cmd.slice(7));return}if(cmd.startsWith('loadout:')){handleLoadoutAction(cmd.slice(8));return}if(cmd.startsWith('store:')){handleStoreAction(cmd);return}if(cmd.startsWith('add:')){addUnit(cmd.slice(4));return}if(cmd.startsWith('remove:')){removeUnit(Number(cmd.slice(7)));return}if(cmd==='dev-panel-toggle'&&DEV_MODE){devPanelOpen=!devPanelOpen;return}if(cmd==='cancel-target'){cancelTargetSelection();return}if(cmd.startsWith('enemy-target:')){setEnemyTarget(cmd.slice(13));return}if(cmd.startsWith('camera-select:')){if(cameraPreview==='party'&&(phase==='player'||pendingTargetAction?.targetSide==='ally')){const id=cmd.slice(14),p=party.find(p=>p.id===id);if(pendingTargetAction?.targetSide==='ally'&&pendingTargetAction.targetScope==='all'){if(!p||p.hp<=0){say('Choose a living party member to confirm the team skill.');return}const pending=pendingTargetAction,actor=party.find(x=>x.id===pending.actorId);pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;return executeCombatAction(actor,pending.action)}if(pendingTargetAction?.targetSide==='ally'){if(!p||p.hp<=0){say('Tune and Dawn’s Ultimate need a living ally.');return}const pending=pendingTargetAction,actor=party.find(x=>x.id===pending.actorId);pendingTargetAction=null;cameraPreview=null;selectedAllyId=null;if(pending.action==='ultimate')return queueUltimate(pending.actorId,id);return executeCombatAction(actor,pending.action,null,id)}if(supportDemo&&!eligibleAllyTarget(p,supportDemo)){say('Not eligible for this support test.');return}selectedAllyId=id;say((supportDemo?'TARGET TEST: ':'CAMERA TEST: ')+(p?.name||id)+' selected.')}return}if(cmd.startsWith('mode:')){if(DEV_MODE)setTargetingMode(cmd.slice(5));return}if(cmd.startsWith('queue-ult:')){beginTargetSelection('ultimate',cmd.slice(10));return}if(cmd.startsWith('charge-ult:')){if(DEV_MODE)chargeUltimateForTest(cmd.slice(11));return}
 switch(cmd){case 'startup-start':startFromTitle();break;case 'claim-daily-reward':claimDailyReward();break;case 'open-inventory':phase='inventory';hint='';break;case 'open-challenges':phase='challenges';hint='';break;case 'open-settings':phase='settings';hint='';break;case 'account-sign-out':window.TwoToneAccount?.signOut?.();break;case 'account-delete':window.TwoToneAccount?.deleteAccount?.();break;case 'open-events':openEvents();break;case 'claim-login-event':collectLoginEvent();break;case 'claim-soul-gift':collectSoulGift();break;case 'open-store':phase='store';lastStoreNotice='';break;case 'open-campaign':openCampaignSelector();break;case 'campaign-start':startPreviewedCampaignPart();break;case 'campaign-previous':campaignPage--;choiceRects=[];break;case 'campaign-next':campaignPage++;choiceRects=[];break;case 'advance-story':advanceCampaignStory();break;case 'retry-campaign-save':saveCampaignVictory();break;case 'next-campaign-entry':openCampaignEntry(campaignEntry?.nextEntryId);break;case 'open-party':enterPartySetup();break;case 'open-loadout':enterLoadout();break;case 'save-party':saveParty();break;case 'main-menu':enterMainMenu();break;case 'toggle-fullscreen':toggleFullscreen();break;case 'support-heal':if(DEV_MODE)startSupportDemo('heal');break;case 'support-revive':if(DEV_MODE)startSupportDemo('revive');break;case 'confirm-support':if(DEV_MODE)confirmSupportDemo();break;case 'cancel-support':if(DEV_MODE)cancelSupportDemo();break;case 'camera-party':if(DEV_MODE&&phase==='player'&&!paused){cameraPreview=cameraPreview==='party'?null:'party';supportDemo=null;selectedAllyId=activeId}break;case 'camera-target':if(DEV_MODE&&phase==='player'&&!paused){cameraPreview=cameraPreview==='target'?null:'target';selectedAllyId=null;if(cameraPreview==='target')say('Tap an automaton to set the target.')}break;case 'reset-draft':draft=loadTeam();break;case 'toggle-waves':if(DEV_MODE)toggleWavePreset();break;case 'toggle-recovery':if(DEV_MODE)setTrainingRecoveryMode(trainingRecoveryMode==='restore'?'preserve':'restore');break;case 'start':startBattle();break;case 'restart':replay();break;case 'change-team':enterPartySetup();break;case 'forced-select':enterPartySetup();break;case 'pause':if(phase!=='player'&&!paused){say('Pause is available on your turn.');return}paused=!paused;break;case 'unpause':paused=false;break;case 'test-ko':if(DEV_MODE)testKO();break;case 'test-revive':if(DEV_MODE)testRevive();break;case 'skill':play('skill');break;case 'cap-test':if(DEV_MODE)cycleSpCapTest();break;case 'hud-status-test':if(DEV_MODE)toggleHudStatusDemo();break;case 'f05-advance':if(DEV_MODE)addActionAdvance(activeId,25);break;case 'f05-delay':if(DEV_MODE)addActionDelay(activeId,25);break;case 'f05-speed':if(DEV_MODE)setSpeedMultiplierForTest(activeId,(speedModifiers[activeId]||1)>=1.3?1:1.3);break;case 'f05-summon-independent':if(DEV_MODE)queueSummonForTest('independent');break;case 'f05-summon-controlled':if(DEV_MODE)queueSummonForTest('controlled');break;
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
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();choose((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)},{passive:false});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingTargetAction)cancelTargetSelection();if(e.key==='1')play('basic');if(e.key==='2')play('skill');if(e.key==='3')play('ultimate');if(DEV_MODE&&e.key.toLowerCase()==='m'&&phase==='player')cycleSpCapTest();if(DEV_MODE&&['q','w','e','f'].includes(e.key.toLowerCase())&&phase==='player')setTargetingMode(({q:'single',w:'blast',e:'aoe',f:'five-hit'})[e.key.toLowerCase()]);if(DEV_MODE&&e.key.toLowerCase()==='v'&&phase==='player'){cameraPreview=cameraPreview==='party'?null:'party';selectedAllyId=activeId}if(DEV_MODE&&e.key.toLowerCase()==='t'&&phase==='player')cameraPreview=cameraPreview==='target'?null:'target';if(DEV_MODE&&e.key.toLowerCase()==='r'&&phase!=='setup')replay()});window.addEventListener('contextmenu',e=>e.preventDefault());
// Read-only instrumentation and explicitly labeled testing helpers for verification.
if(DEV_MODE){
window.twoToneStatus=()=>({phase,paused,turn,battleAreaId:currentBattleAreaId,enemyRosterMode,plannedEnemyArchetypes:wavePlan.map(wave=>wave.map(enemy=>enemy.archetypeId)),devPanelOpen,targetingMode,pendingTargetAction,zeroSkillArmed,previewTargetMode:previewTargetMode(),supportDemo,attackInProgress,pendingVacancies:[...pendingVacancies],lastAttack:lastAttack?JSON.parse(JSON.stringify(lastAttack)):null,supportTestHistory:supportTestHistory.slice(),previewTargetIds:chooseAttackTargets(previewTargetMode()).map(e=>e.id),enemyCountTotal:wavePlan.reduce((n,w)=>n+w.length,0),selectedEnemyId,actingEnemyId,enemies:enemies.map(e=>({id:e.id,archetypeId:e.archetypeId,level:e.level,category:e.category,healthBars:e.healthBars,hp:e.hp,maxHp:e.maxHp,speed:speedOf(e),barrier:e.barrier,maxBarrier:e.maxBarrier,brokenTurns:e.brokenTurns,bleedStacks:e.bleedStacks?.length||0,bleedMaxStacks:e.bleedMaxStacks||5,momentumStacks:e.momentumStacks||0,x:e.x,y:e.y,slot:e.slot,wave:e.wave,order:e.order,alive:e.hp>0})),wave:{number:waveIndex+1,total:wavePlan.length,sizes:wavePlan.map(w=>w.length),active:enemies.length,reserve:waveQueue.length,defeated:waveKills,totalDefeated:totalEnemyDefeats,cleared:encounterCleared,spawnHistory:spawnHistory.slice()},gauges:{...gauges},party:party.map(p=>({id:p.id,hp:p.hp,maxHp:p.maxHp,energy:p.energy,energyReserved:p.energyReserved||0,availableEnergy:availableEnergy(p),slot:party.indexOf(p)+1,test:p.test})),draft:[...draft],activeId,enemyHp,sp,spMax:effectiveSpMax(),spCapModifiers:{...spCapModifiers},ultimateQueue:ultimateQueue.map(q=>({...q})),ultimateExecuting,ultimateResumePending:!!ultimateResume,ultimateHistory:ultimateHistory.slice(),order:getOrder(5),summonSlotsUsed:summons.filter(s=>!s.pendingCreation).length,summons:summons.map(s=>({...s})),summonHistory:summonHistory.slice(),turnTimeline:turnTimeline.snapshot(),speedModifiers:{...speedModifiers},visibleAllyIds:cameraShot()==='party'?party.map(p=>p.id):[cameraShot()==='enemy-impact'?fx?.target:(activeId||alive()[0]?.id)].filter(Boolean),visibleEnemyIds:cameraShot()==='party'?[]:combatEnemies().map(e=>e.id),camera:{shot:cameraShot(),world:shotWorld(cameraShot()),panX:camera.currentX??0,transition:camera.progress,preview:cameraPreview,selectedAllyId,parallaxRates:[.04,.13,.32,.72,1.18],hudDrawnAfterScene:true},stagePositions:party.map(p=>({id:p.id,position:cameraAllyPosition(p.id,cameraShot()==='party'?'party':'command')}))});
window.twoToneUi=()=>({hudPortraits:party.map(p=>({id:p.id,scale:(phase==='player'&&activeId===p.id&&p.hp>0)?1:.9,energyFill:isUltPending(p.id)?0:Math.max(0,Math.min(1,availableEnergy(p)/ultimateEnergyCost(p))),statusCount:hudStatusList(p).length})),version:'v0.1.36',debugOpen:devPanelOpen,buttons:choiceRects.map(b=>({...b}))});
window.twoToneEchoStatus=()=>[...party,...enemies].map(unit=>({id:unit.id,echoPercent:echoPercentOf(unit)}));
window.twoToneReflectStatus=()=>[...party,...enemies].map(unit=>({id:unit.id,reflectPercent:reflectPercentOf(unit)}));
window.twoToneProgress=()=>({playerRank,rankProgressionImplemented:true,maxLevel:characterLevelCap(),absoluteMaxLevel:CHARACTER_MAX_LEVEL,ascensionGates:[...ASCENSION_GATES],recoveryMode:trainingRecoveryMode,
 characters:ROSTER.map(r=>({id:r.id,level:progressFor(r.id).level,levelCap:characterLevelCap(),exp:progressFor(r.id).exp,ascended:[...progressFor(r.id).ascended],requiredExp:progressFor(r.id).level<characterLevelCap()?requiredExp(progressFor(r.id).level):0,baseHpTestOnly:r.hp})),
 unitHP:party.map(p=>({id:p.id,level:p.level,baseHpTestOnly:p.baseHp,maxHp:p.maxHp,currentHp:p.hp,flat:{...p.hpFlatModifiers},percent:{...p.hpPercentModifiers}})),
 unitAttack:party.map(p=>({id:p.id,level:p.level,baseAttack:p.baseAttack,attack:calculateAttack(p),flat:{...p.attackFlatModifiers},percent:{...p.attackPercentModifiers}})),
 unitPhysicalDefense:party.map(p=>({id:p.id,level:p.level,basePhysicalDefense:p.basePhysicalDefense,physicalDefense:calculatePhysicalDefense(p),flat:{...p.physicalDefenseFlatModifiers},percent:{...p.physicalDefensePercentModifiers}})),
 unitMagicalDefense:party.map(p=>({id:p.id,level:p.level,baseMagicalDefense:p.baseMagicalDefense,magicalDefense:calculateMagicalDefense(p),flat:{...p.magicalDefenseFlatModifiers},percent:{...p.magicalDefensePercentModifiers}})),
 unitTrueDamageBasis:party.map(p=>({id:p.id,attack:calculateAttack(p),trueDefense:calculateTrueDefense(p),selfTrueDamageReduction:calculateTrueDamageReduction(p,p)}))});
window.twoToneTest={testGrantExp,testAscend,setPlayerRankForTest,setHpBonusForTest,setEchoPercentForTest,setReflectPercentForTest,calculateMaxHp,calculateLevelScaledStat,calculateAttack,calculatePhysicalDefense,calculateMagicalDefense,calculateTrueDefense,calculateTrueDamageReduction,calculateDamageAfterDefense,calculatePhysicalDamageAfterDefense,calculateMagicalDamageAfterDefense,calculateTrueDamageAfterDefense,calculateTypedActionDamage,requiredExp,setTrainingRecoveryMode,roundHp,addActionAdvance,addActionDelay,setSpeedMultiplierForTest,queueSummonForTest,turnTimelineSnapshot:()=>turnTimeline.snapshot(),queueUltimate,chargeUltimateForTest,toggleHudStatusDemo,setHudStatusesForTest:(id,items)=>{const p=party.find(p=>p.id===id);if(!p||!Array.isArray(items)||items.length>80)return false;p.hudStatuses=items.map(e=>({kind:e.kind==='debuff'?'debuff':'buff',icon:String(e.icon||'✦').slice(0,2),turns:e.turns===null?null:(Number.isInteger(e.turns)&&e.turns>=0?e.turns:null)}));return true;},setSpCapTestSource,cycleSpCapTest,canQueueUltimate,debugKOForTest:(id)=>{if(['setup','intro','victory','defeat'].includes(phase))return false;const p=party.find(p=>p.id===id);if(!p||p.hp<=0)return false;p.hp=0;gauges[p.id]=0;saveVitals();cancelQueuedUltimatesOfDefeated();return true},startBattle,addUnit,removeUnit,enterSelection,enterPartySetup,saveParty,testKO,testRevive,play,replay,zeroSkillControl,setTargetingMode,startSupportDemo,confirmSupportDemo,cancelSupportDemo,eligibleAllyTarget:(id,kind)=>eligibleAllyTarget(party.find(p=>p.id===id),kind),setEnemyHpForTest:(id,hp)=>{if(phase!=='player'||attackInProgress)return false;const e=liveEnemies().find(e=>e.id===id);if(!e||!Number.isFinite(hp)||hp<1||hp>e.maxHp)return false;e.hp=hp;syncEnemyHp();return true},applyBleedForTest:(enemyId,sourceId,stacks=1,maxStacks=5)=>{const enemy=liveEnemies().find(unit=>unit.id===enemyId),source=party.find(unit=>unit.id===sourceId);return enemy&&source?applyBleed(enemy,source,stacks,maxStacks):false},setEnemyTarget,setWavePlanForTest,toggleWavePreset,setEnemyRoster,debugDefeatEnemy:(id)=>{const e=liveEnemies().find(e=>e.id===id);if(!e||phase==='setup'||phase==='victory'||phase==='defeat')return false;e.hp=0;resolveEnemyDefeat(e);return true;},selectEnemy:(id)=>setEnemyTarget(id),setCameraPreview:(view)=>{if(phase==='player'){cameraPreview=view;selectedAllyId=activeId}},cameraStatus:()=>cameraShot()};
window.twoToneTest.grantWeaponXp=grantWeaponXp;window.twoToneTest.weaponLevelCap=weaponLevelCap;window.twoToneTest.weaponPotentialMultiplier=weaponPotentialMultiplier;
window.zeroBasicAnimationDebug=()=>({durationMs:SOUL_BASIC_MS,elapsed:fx?.kind==='basic'&&fx.actor==='soul'?Math.max(0,performance.now()-fx.at):null,active:soulBasicStage(performance.now())!==null,assets:['soul','soulBasicWindup','soulBasicSlash'].map(id=>({id,loaded:!!images[id]?.complete&&!!images[id]?.naturalWidth}))});
window.twoToneTest.applyTauntForTest=(targetId,sourceId,rate,turns)=>{const target=party.find(unit=>unit.id===targetId)||enemies.find(unit=>unit.id===targetId),source=party.find(unit=>unit.id===sourceId)||enemies.find(unit=>unit.id===sourceId);return target&&source?applyTaunt(target,source,rate,turns):false};
window.twoToneTauntStatus=()=>[...party,...enemies].map(unit=>({id:unit.id,activeRate:tauntRateOf(unit),effects:(unit.tauntEffects||[]).map(effect=>({...effect}))}));
}
requestAnimationFrame(loop);
