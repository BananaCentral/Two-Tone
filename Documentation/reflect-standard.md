# Reflect Standard

## Purpose

Reflect is a defensive effect that returns damage to the unit that hit its source. Allies and enemies may have Reflect.

## Source Value

- A combat unit's optional `reflectPercent` is a decimal from `0` to `1`; for example, `0.25` means 25% Reflect.
- Missing `reflectPercent` defaults to `0`.

## Trigger and Amount

- Reflect triggers on a direct, Follow-Up, Ricochet, summon, or Echo hit that causes HP loss or Shield loss to the defender. The [Combat Trigger Eligibility Standard](combat-trigger-eligibility-standard.md) defines the canonical event list.
- Calculate the returned amount from the defender's actual HP loss plus shield damage caused by that hit, after normal hit resolution. This includes a barrier-break bonus that damages HP or shields.
- Damage dealt to an enemy Barrier does not count toward Reflect. Barrier depletion by itself never triggers Reflect.
- Damage-over-time and automatic Barrier-break damage do not trigger Reflect. Each eligible hit in a multi-hit attack checks Reflect separately.
- Calculate the returned amount as `round((HP damage + shield damage) × reflectPercent)`.
- A hit that causes no HP or shield damage produces no Reflect.

## Reflected Damage

- Reflected damage targets the original attacker and is always True damage.
- Resolve it as a normal True-damage hit, including Stealth, Critical, the target's True-damage defense, and shield absorption. If the attacker is an enemy, the reflected hit also interacts with its Barrier as a normal hit; Barrier damage does not trigger another Reflect.
- Echo cannot trigger another Echo. Reflected damage cannot trigger Reflect or Echo. An Echo hit may trigger one Reflect; that returned Reflect cannot chain further.
- Reflect does not reapply attack-triggered effects such as Bleed, Follow-up, or Ricochet.

## Resolution Order

Resolve the original hit and its HP, Shield, and Barrier effects first. Then resolve Reflect from HP and Shield damage, followed by the attacker's Echo, if any. If Echo causes HP or Shield damage, resolve one Reflect from it afterward. Barrier damage is excluded from Reflect's amount. See the [Combat Action Resolution Standard](combat-action-resolution-standard.md) for the presentation order.
