import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simulateBatch } from '../tools/combat-simulator.mjs';
import { buildSuite } from '../tools/combat-simulator-benchmark.mjs';

const examplePath=fileURLToPath(new URL('../Documentation/combat-simulator/example-logan-party-vs-slime-boss.json',import.meta.url));
function example(){return JSON.parse(fs.readFileSync(examplePath,'utf8'))}

test('batches are reproducible with the same config and seed',()=>{
 const config=example();
 assert.deepEqual(simulateBatch(config,30,404),simulateBatch(config,30,404));
});

test('Logan Basic Bleed is credited separately from his direct damage',()=>{
 const result=simulateBatch(example(),200,404),logan=result.averageUnitStats.logan;
 assert.ok(logan.damageBreakdown.bleed>0);
 assert.ok(logan.damage>logan.damageBreakdown.bleed);
});

test('Blood Shield reports per-ally value, HP cost, and actual absorption',()=>{
 const result=simulateBatch(example(),200,404),logan=result.averageUnitStats.logan;
 assert.ok(logan.shieldGranted/logan.hpSpent>3.8&&logan.shieldGranted/logan.hpSpent<4.1);
 assert.ok(logan.shieldAbsorbed>0);
 assert.ok(result.averageUnitDetails['soul-1'].shieldReceived>0);
});

test('damage channels sum to each role total and support is reported separately',()=>{
 const result=simulateBatch(example(),100,404);
 for(const stats of Object.values(result.averageUnitStats)){
  const channelTotal=Object.values(stats.damageBreakdown).reduce((sum,value)=>sum+value,0);
  assert.ok(Math.abs(channelTotal-stats.damage)<1e-6);
  assert.ok(Number.isFinite(stats.survivalRate));
 }
 assert.equal(result.averageUnitStats.dawn.role,'support');
 assert.ok(result.averageUnitStats.dawn.tuneUses>0);
 assert.ok(result.averageUnitStats.dawn.supportDamageAmplified>0);
 assert.ok(result.averageUnitStats.dawn.skillPointsGranted>0);
});

test('win-rate confidence interval contains the measured win rate',()=>{
 const result=simulateBatch(example(),100,404),interval=result.winRate95CI.allies;
 assert.ok(interval.lower<=result.winRate.allies&&result.winRate.allies<=interval.upper);
});

test('simulator respects the four-ally party limit',()=>{
 const config=example();
 config.teams.allies.push({...config.teams.allies[0],id:'extra-ally'});
 assert.throws(()=>simulateBatch(config,1,1),/at most four allies/);
});

test('benchmark suite covers boss, mixed, and multi-target scenarios',()=>{
 const suite=buildSuite(example());
 assert.deepEqual(suite.map(scenario=>scenario.name),[
  'Boss • 1 health bar','Boss • 2 health bars','Boss • 3 health bars',
  'Boss with two Elite adds','Wave • five Slimes','Wave • three Slime Leaders'
 ]);
 assert.ok(suite.every(scenario=>scenario.config.teams.allies.length===4));
 assert.equal(suite.find(scenario=>scenario.name==='Boss with two Elite adds').config.teams.enemies.filter(unit=>unit.archetype==='slimeLeader').length,2);
});
