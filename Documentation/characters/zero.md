# Zero Character Sheet

Zero is a playable Physical damage dealer. The front-facing full-body artwork in `assets/zero.png` is used for his HUD portrait and ally-target view. His northeast-facing battle sprite is `assets/zero-battle.png`.

## Identity and base stats

Character ID: `zero`. Zero starts at Level 1. His base stats are HP 50, Physical Attack 40, Magical Attack 0, Physical Defense 2, Magical Defense 2, and Speed 30. Stats use the shared character-level and loadout formulas.

## Passive: Cutthroat

Zero gains 10 percentage points of Critical Rate and 25 percentage points of Critical Damage. These bonuses are added to the shared hidden Critical Rate and Critical Damage stats. Premium Weapon Duplicate 4 doubles these passive bonuses, for +20 percentage points Critical Rate and +50 percentage points Critical Damage from Cutthroat.

## Basic Attack

Deals Physical Blast damage at a 0.5× multiplier and restores 20 Energy. It restores 1 party Skill Point under the shared Basic Attack default. Premium Weapon Duplicate 1 applies one Bleed stack to each enemy damaged.

## Skill: First Strike

Costs 1 party Skill Point, deals Physical damage to one selected enemy, and restores 20 Energy. The multiplier is 1.5× if this is the first time Zero has damaged that enemy in the current battle; otherwise it is 1.0×. The first-hit record is tracked separately for each enemy, lasts until the battle ends, and is set by any damaging action from Zero. Character Duplicate 4 doubles either multiplier, to 3.0× or 2.0×.

## Ultimate

Costs 100 Energy and deals Physical AoE damage at a 1.0× multiplier. It advances Zero's next turn by 100% after the Ultimate resolves. The advance makes him ready for his next turn at the current action boundary. Character Duplicate 1 delays every surviving enemy's next turn by 20%. Character Duplicate 3 doubles the Ultimate multiplier to 2.0×.

## Character duplicates

1. Ultimate delays every surviving enemy's next turn by 20%.
2. Basic Attack's multiplier increases by 100%, from 0.5× to 1.0×.
3. Ultimate's multiplier increases by 100%, from 1.0× to 2.0×.
4. First Strike's normal and first-hit multipliers increase by 100%, from 1.0×/1.5× to 2.0×/3.0×.

## Premium signature weapon

The Premium weapon's Potential 1 effect restores 1 party Skill Point when Zero uses his Ultimate. Premium Potential 2–5 correspond to weapon Duplicates 1–4:

1. Basic Attack applies 1 Bleed stack to each enemy damaged.
2. Ultimate Energy cost is reduced from 100 to 80.
3. Zero ignores 20% of the target's applicable defenses when calculating damage.
4. Cutthroat's Critical Rate and Critical Damage bonuses double. This is additive with the shared base Critical stats; the passive bonuses become +20 percentage points Critical Rate and +50 percentage points Critical Damage.

Premium weapon effects require the weapon to be owned and equipped. The game's current equipment data model stores Potential; simulator scenarios use Premium Potential 1–5 to select the corresponding effects.

## Damage and targeting rules

- Physical damage uses the Physical Attack stat and target Physical Defense. Premium weapon Duplicate 3 ignores 20% of the target Physical Defense for Zero's attacks.
- Blast hits the selected enemy and up to two adjacent enemies in formation, with full damage to each. AoE hits every living enemy.
- Critical strikes follow the shared Critical Hit Standard. Zero's Cutthroat bonuses are percentage-point additions, so the default 10% Critical Rate and 50% Critical Damage become 20% and 75% before Premium Weapon Duplicate 4.
- First Strike's per-enemy first-hit record resets when a new battle starts.
