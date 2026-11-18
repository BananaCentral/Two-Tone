import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateBatch} from './combat-simulator-value-study.mjs';
const baseDir=path.dirname(fileURLToPath(import.meta.url));
const source=JSON.parse(fs.readFileSync(path.join(baseDir,'../../combat-simulator/example-logan-party-vs-bear-boss.json'),'utf8'));
const zeroExample=JSON.parse(fs.readFileSync(path.join(baseDir,'../../combat-simulator/example-zero-vs-slime.json'),'utf8'));source.archetypes={...source.archetypes,...zeroExample.archetypes};
const runes=['radiant-moon','eternal-sun','celestial-star','dark-matter','clear-skies','infinite-space','recycle','amplify','united'];
const statKeys=['hp','attack','physicalDefense','magicalDefense'];
const parties={balanced:['soul-1','lily-1','dawn-1','logan-1'],withZero:['soul-1','zero-1','dawn-1','logan-1']};
const partyLabels={balanced:'Soul · Lily · Dawn · Logan',withZero:'Soul · Zero · Dawn · Logan'};
const lengths=[{id:'short',label:'Short'},{id:'medium',label:'Medium'},{id:'long',label:'Long'}];
const hpByCategory={Common:{short:.65,medium:3,long:8},Elite:{short:.65,medium:3,long:8},Boss:{short:.65,medium:5,long:8}};
const difficulties=[{id:'easy',label:'Easy',defense:.85},{id:'medium',label:'Medium',defense:1},{id:'hard',label:'Hard',defense:1.2}];
const attackByCategory={Common:{easy:5,medium:10,hard:20},Elite:{easy:1,medium:1.5,hard:2.5},Boss:{easy:.2,medium:.3,hard:.46}};
const enemyProfiles=[
 {id:'common-slime',category:'Common',targetCount:'Single',enemies:[['slime','slime',1]]},
 {id:'common-wolf',category:'Common',targetCount:'Single',enemies:[['wolf','wolf',1]]},
 {id:'common-hawk',category:'Common',targetCount:'Single',enemies:[['hawk','hawk',1]]},
 {id:'common-pack',category:'Common',targetCount:'Multiple',enemies:[['slime','slime',1],['wolf','wolf',0],['hawk','hawk',2]]},
 {id:'elite-goblin',category:'Elite',targetCount:'Single',enemies:[['goblin','goblin',1]]},
 {id:'elite-geode',category:'Elite',targetCount:'Single',enemies:[['geode','geode',1]]},
 {id:'elite-pack',category:'Elite',targetCount:'Multiple',enemies:[['geode','geode',0],['goblin-a','goblin',1],['goblin-b','goblin',2]]},
 {id:'boss-bear',category:'Boss',targetCount:'Single',enemies:[['bear','bear',1]]},
 {id:'boss-with-adds',category:'Boss',targetCount:'Multiple',enemies:[['bear','bear',1],['goblin-a','goblin',0],['goblin-b','goblin',2]]}
];
const eligibility={
 'radiant-moon':{soul:false,lily:true,dawn:false,logan:false,zero:true,reason:'Echoes 50% of eligible damaging Skill damage; cooldown for the next two wearer turns.'},
 'eternal-sun':{soul:true,lily:true,dawn:false,logan:true,zero:true,reason:'The Ultimate is guaranteed to crit with +50 percentage points of Critical Damage and restores 20 Energy; then cools down for one wearer turn. Dawn’s current Ultimate deals no damage.'},
 'celestial-star':{soul:true,lily:true,dawn:true,logan:true,zero:true,reason:'Ultimate use advances wearer 100% and restores up to 30 Energy; cooldown two wearer turns.'},
 'dark-matter':{soul:true,lily:true,dawn:true,logan:true,zero:true,reason:'First eligible damaging Basic, Skill, or Ultimate each cooldown cycle ignores 25% physical and magical defense and amplifies physical, magical, and true damage by 25%; cooldown one wearer turn.'},
 'clear-skies':{soul:true,lily:true,dawn:true,logan:true,zero:true,reason:'After a Skill, grants a 10%-max-HP shield for two wearer turns; cooldown two wearer turns. While shielded, reflect increases by 10 percentage points.'},
 'infinite-space':{soul:true,lily:true,dawn:true,logan:true,zero:true,reason:'Ultimate delays every enemy by 100%; each enemy is immune for its next two turns.'},
 recycle:{soul:true,lily:true,dawn:true,logan:true,zero:true,reason:'Skill grants one team skill point and up to 10 wearer Energy; cooldown two wearer turns.'},
 amplify:{soul:true,lily:true,dawn:true,logan:true,zero:true,reason:'Basic attack damage +50%; cooldown two wearer turns.'},
 united:{soul:false,lily:false,dawn:true,logan:true,zero:false,reason:'Skill targeting an ally advances wearer by 50% and restores up to 20 Energy; cooldown two wearer turns. Soul’s self-only Enhance does not qualify.'}
};
const names={soul:'Soul',lily:'Lily',dawn:'Dawn',logan:'Logan',zero:'Zero'};
const clone=x=>JSON.parse(JSON.stringify(x));
function runeLoadout(setId=null){return statKeys.map(main=>({level:1,main,subs:statKeys.filter(x=>x!==main),...(setId?{setId}:{})}));}
function configFor(partyId,profile,length,difficulty,subject=null,setId=null){
 const c=clone(source);c.name=`${partyId} / ${profile.id} / ${length.id} / ${difficulty.id}`;
 const ids=parties[partyId],wanted=new Set(ids);c.teams.allies=c.teams.allies.filter(u=>wanted.has(u.id));for(const id of ids)if(!c.teams.allies.some(u=>u.id===id)){const archetype=id.replace(/-\d+$/,'');c.teams.allies.push({id,archetype});}
 c.teams.enemies=profile.enemies.map(([id,archetype,slot])=>({id,archetype,slot}));
 const archetypes=new Set(c.teams.enemies.map(e=>e.archetype));
 for(const id of archetypes){const a=c.archetypes[id];a.stats.hp*=hpByCategory[profile.category][length.id];for(const k of ['attack'])if(Number.isFinite(a.stats[k]))a.stats[k]*=attackByCategory[profile.category][difficulty.id];for(const k of ['physicalDefense','magicalDefense'])if(Number.isFinite(a.stats[k]))a.stats[k]*=difficulty.defense;}
 for(const ally of c.teams.allies)ally.runes=runeLoadout(ally.id===subject?setId:null);
 return c;
}
const reps=150,seedBase=612947,rows=[];let caseCount=0;
for(const [partyId,ids] of Object.entries(parties)){
 for(const profile of enemyProfiles)for(const length of lengths)for(const difficulty of difficulties){
  const seed=seedBase+caseCount++*reps;
  const baseline=simulateBatch(configFor(partyId,profile,length,difficulty),reps,seed);
  const baseMetrics={wins:baseline.wins.allies,n:reps,rate:baseline.winRate.allies,low:baseline.winRate95CI.allies.lower,high:baseline.winRate95CI.allies.upper,allyTurns:baseline.averageAllyTurns,enemyTurns:baseline.averageEnemyTurns,ultimates:baseline.averageUltimates,enemyDamage:baseline.averageDamageDealt.enemies,elapsed:baseline.averageElapsedTime};
  for(const subjectId of ids){
   const character=subjectId.split('-')[0];
   for(const rune of runes){
    const after=simulateBatch(configFor(partyId,profile,length,difficulty,subjectId,rune),reps,seed);
    const actor=after.averageUnitDetails[subjectId]||{};
    const beforeCharacter=baseline.averageUnitStats[character]||{};
    const afterCharacter=after.averageUnitStats[character]||{};
    const beforeSubject=baseline.averageUnitStats[character]||{};
    const afterSubject=after.averageUnitStats[character]||{};
    rows.push({party:partyId,partyLabel:partyLabels[partyId],character,characterLabel:names[character],rune,profile:profile.id,category:profile.category,targetCount:profile.targetCount,length:length.id,difficulty:difficulty.id,n:reps,beforeWins:baseMetrics.wins,afterWins:after.wins.allies,beforeRate:baseMetrics.rate,afterRate:after.winRate.allies,delta:after.winRate.allies-baseMetrics.rate,hpMultiplier:hpByCategory[profile.category][length.id],attackMultiplier:attackByCategory[profile.category][difficulty.id],defenseMultiplier:difficulty.defense,beforeCI:[baseMetrics.low,baseMetrics.high],afterCI:[after.winRate95CI.allies.lower,after.winRate95CI.allies.upper],activations:actor.runeActivations||0,
      beforeCharacterDamage:beforeCharacter.damage||0,afterCharacterDamage:afterCharacter.damage||0,characterDamageDelta:(afterCharacter.damage||0)-(beforeCharacter.damage||0),beforeCharacterDamageBreakdown:beforeCharacter.damageBreakdown||{},afterCharacterDamageBreakdown:afterCharacter.damageBreakdown||{},
      beforeWearerDamage:beforeSubject.damage||0,afterWearerDamage:afterSubject.damage||0,wearerDamageDelta:(afterSubject.damage||0)-(beforeSubject.damage||0),beforeWearerDamageBreakdown:beforeSubject.damageBreakdown||{},afterWearerDamageBreakdown:afterSubject.damageBreakdown||{},
      beforeCharacterDps:beforeCharacter.dps||0,afterCharacterDps:afterCharacter.dps||0,characterDpsDelta:(afterCharacter.dps||0)-(beforeCharacter.dps||0),
      beforeTeamDamage:baseline.averageDamageDealt.allies,afterTeamDamage:after.averageDamageDealt.allies,teamDamageDelta:after.averageDamageDealt.allies-baseline.averageDamageDealt.allies,
      beforeIncomingDamage:baseline.averageDamageDealt.enemies,afterIncomingDamage:after.averageDamageDealt.enemies,incomingDamagePrevented:baseline.averageDamageDealt.enemies-after.averageDamageDealt.enemies,
      runeEnergyRestored:actor.runeEnergyRestored||0,skillPointsGranted:actor.skillPointsGranted||0,shieldGranted:actor.shieldGranted||0,shieldAbsorbed:actor.shieldAbsorbed||0,damageTaken:actor.damageTaken||0,turnsAdvanced:actor.turnsAdvanced||0,
      allyTurns:baseMetrics.allyTurns,afterAllyTurns:after.averageAllyTurns,enemyTurns:baseMetrics.enemyTurns,afterEnemyTurns:after.averageEnemyTurns,ultimates:baseMetrics.ultimates,afterUltimates:after.averageUltimates,enemyDamage:baseMetrics.enemyDamage,afterEnemyDamage:after.averageDamageDealt.enemies,eligible:eligibility[rune][character],});
   }
  }
 }
 console.error(`Finished party ${partyId}`);
}
fs.writeFileSync(path.join(baseDir,'../raw-run.json'),JSON.stringify({reps,seedBase,partyLabels,parties,lengths,difficulties,hpByCategory,attackByCategory,enemyProfiles:enemyProfiles.map(({id,category,targetCount})=>({id,category,targetCount})),runes,eligibility,rows}));
console.log(`${rows.length} isolated character-rune conditions; ${rows.length*reps} rune battles plus ${caseCount*reps} baselines.`);
