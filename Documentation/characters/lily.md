# Lily Character Sheet

Lily's artwork is `assets/lily-artwork.png`. Her standard weapon is **Petal**, and her premium signature weapon is **Everblossom**. Battle-stage artwork follows the equipped weapon: `assets/lily-petal-battle.png` with Petal and `assets/lily-everblossom-battle.png` with Everblossom. Their matching weapon artwork is `assets/lily-petal.png` and `assets/lily-everblossom.png`.

## Identity and base stats

Character ID: `lily`. Lily starts at Level 1. Her base stats are HP 100, Attack 20, Physical Defense 4, Magical Defense 4, and Speed 20. Stats use the shared character-level and loadout formulas.

## Passive: Exposed

When Lily damages an enemy with an ability, that enemy receives Exposed. Exposed lowers both Physical and Magical Defense by 20% per stack for two enemy turns. Character Duplicate 1 allows two stacks and extends the duration to three enemy turns; the reductions add together, for up to 40%. Summon attacks apply Exposed as well.

## Basic Attack

Deal Magical damage at a 1.0× multiplier, restore 10 Energy, and restore 1 party Skill Point under the shared Basic Attack default.

## Skill: Ricochet

Costs 1 party Skill Point, restores 20 Energy, and deals AoE Magical damage at a 0.75× multiplier. Enemies hit receive a Ricochet mark for two enemy turns. When any ally or summon damages an enemy with Ricochet, every living Ricochet-marked enemy takes additional True damage equal to 10% of the triggering hit's damage. Each action instance can trigger a given mark once. Character Duplicate 4 triggers twice per unique source attack; the second hit is half strength. Mark trigger history expires with the mark.

## Ultimate: Haunting

Costs 100 Energy and deals AoE Magical damage at a 0.75× multiplier. It summons an independent Hauntling immediately after the attack. The Hauntling deals AoE True damage at 0.75× on its immediate first turn and its next two scheduled turns, then expires. Its damage applies Exposed and can trigger Ricochet. Character Duplicate 2 doubles both the Ultimate's initial damage and the Hauntling's damage, and grants the Hauntling one additional scheduled turn. Character Duplicate 3 advances all teammates by 20% and restores 20 Energy to each teammate, including Lily.

## Character duplicates

1. Exposed can stack twice and lasts three turns.
2. Haunting's initial damage and Hauntling damage are doubled; Hauntling lasts one additional scheduled turn.
3. Haunting advances all teammates by 20% and restores 20 Energy to each teammate, including Lily.
4. Ricochet triggers twice per unique allied action; the second trigger deals 50% damage.

## Premium signature weapon

When a teammate or summon damages an Exposed enemy, Lily restores 5 Energy. Using Haunting restores 1 Skill Point.

1. Enemies hit by Haunting's initial attack or Hauntling damage deal 20% less damage for one turn.
2. Enemies entering the field receive Soul Mark and Ricochet for two turns.
3. Each Exposed stack increases damage dealt to barriers by 10%.
4. Each Exposed stack adds 5 percentage points to barrier-shatter damage.

Premium duplicate effects map to Potential 2–5 and are active only while the owned Premium weapon is equipped. Soul Mark is a marker only; no additional Soul Mark effect is defined yet.
