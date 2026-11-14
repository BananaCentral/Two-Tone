#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { simulateBatch } from './combat-simulator.mjs';

const DEFAULT_CONFIG=fileURLToPath(new URL('../Documentation/combat-simulator/example-logan-party-vs-slime-boss.json',import.meta.url));
function clone(value){return JSON.parse(JSON.stringify(value))}
function buildSuite(source){
 const suite=[];
 const boss=source.archetypes.slimeMonster;
 if(boss){
  const base=clone(source);base.teams.enemies=[{id:'benchmark-boss',archetype:'slimeMonster',slot:2}];
  suite.push({name:'Boss • 1 health bar',config:base});
  for(const bars of [2,3]){const config=clone(base);config.name=`${bars}-bar Slime Monster`;config.archetypes.slimeMonster.stats.hp=boss.stats.hp*bars;suite.push({name:`Boss • ${bars} health bars`,config})}
  if(source.archetypes.slimeLeader){const config=clone(base);config.teams.enemies=[{id:'benchmark-boss',archetype:'slimeMonster',slot:2},{id:'leader-1',archetype:'slimeLeader',slot:1},{id:'leader-2',archetype:'slimeLeader',slot:3}];suite.push({name:'Boss with two Elite adds',config})}
 }
 if(source.archetypes.slime){const config=clone(source);config.teams.enemies=Array.from({length:5},(_,slot)=>({id:`slime-${slot+1}`,archetype:'slime',slot}));suite.push({name:'Wave • five Slimes',config})}
 if(source.archetypes.slimeLeader){const config=clone(source);config.teams.enemies=Array.from({length:3},(_,slot)=>({id:`leader-${slot+1}`,archetype:'slimeLeader',slot}));suite.push({name:'Wave • three Slime Leaders',config})}
 if(!suite.length)throw new Error('The benchmark config needs slimeMonster, slime, or slimeLeader archetypes.');
 return suite;
}
function parseArgs(args){const options={config:DEFAULT_CONFIG,runs:1000,seed:1,json:false};for(let i=0;i<args.length;i++){if(args[i]==='--config')options.config=path.resolve(args[++i]);else if(args[i]==='--runs')options.runs=Number(args[++i]);else if(args[i]==='--seed')options.seed=Number(args[++i]);else if(args[i]==='--json')options.json=true;else if(args[i]==='--help'||args[i]==='-h')options.help=true;else throw new Error(`Unknown option: ${args[i]}`)}return options}
function main(){
 const options=parseArgs(process.argv.slice(2));if(options.help){console.log('Usage: node tools/combat-simulator-benchmark.mjs [--config <full-party.json>] [--runs 1000] [--seed 1] [--json]');return}
 if(!Number.isInteger(options.runs)||options.runs<1)throw new Error('--runs must be a positive integer.');
 const source=JSON.parse(fs.readFileSync(options.config,'utf8'));
 const results=buildSuite(source).map(scenario=>({name:scenario.name,...simulateBatch(scenario.config,options.runs,options.seed)}));
 if(options.json){console.log(JSON.stringify({runs:options.runs,seed:options.seed,party:source.teams.allies.map(unit=>({id:unit.id,archetype:unit.archetype,role:unit.role??source.archetypes[unit.archetype]?.role??null})),results},null,2));return}
 console.log(`Character balance suite • ${options.runs} runs • seed ${options.seed}`);
 console.log('Scenario | Party wins (95% CI) | Avg allied damage | Incoming damage | Team Shield absorbed | Avg allies standing');
 for(const result of results){const ci=result.winRate95CI.allies;console.log(`${result.name} | ${(result.winRate.allies*100).toFixed(1)}% (${(ci.lower*100).toFixed(1)}–${(ci.upper*100).toFixed(1)}%) | ${result.averageDamageDealt.allies.toFixed(1)} | ${result.averageDamageDealt.enemies.toFixed(1)} | ${result.averageAlliedShield.absorbed.toFixed(1)} | ${result.averageSurvivors.allies.toFixed(2)}`);for(const [unit,stats] of Object.entries(result.averageUnitStats))console.log(`  ${stats.role||unit}: damage ${stats.damage.toFixed(1)} (direct ${stats.damageBreakdown.direct.toFixed(1)}, Bleed ${stats.damageBreakdown.bleed.toFixed(1)}, Follow-up ${stats.damageBreakdown.followUp.toFixed(1)}, Ricochet ${stats.damageBreakdown.ricochet.toFixed(1)}, summon ${stats.damageBreakdown.summon.toFixed(1)}); support damage added ${stats.supportDamageAmplified.toFixed(1)}, SP granted ${stats.skillPointsGranted.toFixed(1)}, shield supplied ${stats.shieldGranted.toFixed(1)}, own shield absorbed ${stats.shieldAbsorbed.toFixed(1)}, healing ${stats.lifestealHealing.toFixed(1)}, survival ${(stats.survivalRate*100).toFixed(1)}%`)}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{main()}catch(error){console.error(error.message);process.exitCode=1}}
export { buildSuite };
