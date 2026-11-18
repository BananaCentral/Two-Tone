import test from 'node:test';
import assert from 'node:assert/strict';
import { impactDeltas } from '../tools/combat-performance.mjs';

test('paired impact metrics expose support, damage, protection, resource, and turn deltas', () => {
  const control = {
    finalHp: { allies: 60, enemies: 80 },
    damageDealt: { allies: 120 },
    lifestealHealing: { allies: 5 },
    alliedShieldAbsorbed: 10,
    skillPointsRemaining: 1,
    allyTurns: 4,
    enemyTurns: 5,
    survivors: { allies: [{ shield: 0 }] },
    unitStats: { dawn: { damageTaken: 30, supportDamageAmplified: 0, shieldGranted: 0, energyGranted: 0, energyGained: 10, energySpent: 100, energyRemaining: 20, skillPointsGenerated: 0, skillPointsGranted: 0, skillPointsSpent: 2, turnsAdvanced: 0, skills: 1, ultimates: 0, damageBreakdown: { direct: 120, bleed: 0, followUp: 0, ricochet: 0, summon: 0, echo: 0, reflect: 0 } } }
  };
  const treatment = {
    ...control,
    finalHp: { allies: 90, enemies: 20 },
    damageDealt: { allies: 180 },
    lifestealHealing: { allies: 15 },
    alliedShieldAbsorbed: 25,
    skillPointsRemaining: 2,
    allyTurns: 5,
    enemyTurns: 4,
    survivors: { allies: [{ shield: 12 }] },
    unitStats: { dawn: { damageTaken: 20, supportDamageAmplified: 45, shieldGranted: 20, energyGranted: 10, energyGained: 50, energySpent: 100, energyRemaining: 40, skillPointsGenerated: 1, skillPointsGranted: 1, skillPointsSpent: 2, turnsAdvanced: 1, skills: 1, ultimates: 0, damageBreakdown: { direct: 150, bleed: 10, followUp: 15, ricochet: 5, summon: 0, echo: 0, reflect: 0 } } }
  };

  assert.deepEqual(impactDeltas(control, treatment), {
    enemyHpRemoved: 60,
    allyHpRetained: 30,
    damageDealt: 60,
    damageTaken: -10,
    supportDamageAmplified: 45,
    healing: 10,
    shieldsGranted: 20,
    shieldsAbsorbed: 15,
    shieldRemaining: 12,
    energyGranted: 10,
    skillPointsGenerated: 1,
    skillPointsGranted: 1,
    skillPointsSpent: 0,
    allyTurns: 1,
    enemyTurns: -1,
    turnsAdvanced: 1,
    skills: 0,
    ultimates: 0,
    energyGranted: 10,
    energyGained: 40,
    energySpent: 0,
    energyRemaining: 20,
    damage_direct: 30,
    damage_bleed: 10,
    damage_followUp: 15,
    damage_ricochet: 5,
    damage_summon: 0,
    damage_echo: 0,
    damage_reflect: 0,
    skillPointsRemaining: 1
  });
});
