export function roundCombatHp(value) {
  return Math.floor(value + 0.5);
}

export function roundCombatStatQuarter(value) {
  return Math.floor(value * 4 + 0.5) / 4;
}

// Shared direct-hit calculation. Callers supply already-derived stats and
// effect factors; hit application (shield, barriers, reflect, Echo, etc.) stays
// in the combat engine.
export function calculateCombatHit({
  type, attack,
  physicalDefense, magicalDefense, multiplier,
  physicalDefenseIgnore = 0, magicalDefenseIgnore = 0,
  damageMultiplier = 1, defenseMultiplier = 1, exposedStacks = 0
}) {
  if (!['physical', 'magical', 'true'].includes(type) || !Number.isFinite(attack) || attack <= 0 ||
      !Number.isFinite(multiplier) || multiplier < 0 || !Number.isFinite(damageMultiplier) || damageMultiplier < 0 ||
      !Number.isFinite(defenseMultiplier) || defenseMultiplier < 0 ||
      !Number.isFinite(physicalDefense) || physicalDefense < 0 ||
      !Number.isFinite(magicalDefense) || magicalDefense < 0) return null;

  const exposedMultiplier = Math.pow(0.9, Math.max(0, exposedStacks));
  const physicalEffectiveDefense = physicalDefense * defenseMultiplier * (1 - Math.min(1, Math.max(0, physicalDefenseIgnore))) * exposedMultiplier;
  const magicalEffectiveDefense = magicalDefense * defenseMultiplier * (1 - Math.min(1, Math.max(0, magicalDefenseIgnore))) * exposedMultiplier;
  let reduction;
  if (type === 'true') {
    const physicalReduction = 0.5 * Math.min(physicalEffectiveDefense / attack, 1);
    const magicalReduction = 0.5 * Math.min(magicalEffectiveDefense / attack, 1);
    reduction = physicalReduction + magicalReduction;
  } else {
    const typedDefense = type === 'physical' ? physicalEffectiveDefense : magicalEffectiveDefense;
    reduction = Math.min(typedDefense / attack, 1);
  }
  const damageBeforeDefense = attack * multiplier * damageMultiplier;
  return { damageBeforeDefense, reduction, damage: roundCombatHp(damageBeforeDefense * (1 - reduction)) };
}
