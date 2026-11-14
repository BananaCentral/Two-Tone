# Two-Tone HP Standard

## Purpose

This standard defines Base HP, Max HP, current HP, and the default rules for HP changes.

## Max HP

- Each character has a Base HP value.
- Max HP is calculated as:

  `Max HP = round(((Base HP + total non-equipment flat HP modifiers) × Level + total equipment flat HP modifiers) × (1 + total percentage modifiers))`

- Non-equipment flat modifiers add to Base HP before Level is applied.
- Equipment flat modifiers, including Runes, are added after Level scaling.
- Percentage modifiers add together and apply after Level scaling and equipment flats.
- Max HP rounds to the nearest whole number.
- Each character's Base HP value is set individually.

## Current HP

- Current HP normally ranges from 0 to Max HP. A specific ability or method may allow it to exceed Max HP.
- When Max HP changes, current HP preserves the same percentage of the new Max HP, including when that percentage is above 100%.
- Ordinary damage cannot reduce HP below 0. Reaching 0 HP knocks the character out.
- Ordinary healing does not affect knocked-out characters; they require a Revive.
- Ordinary healing cannot raise HP above Max HP. It has no effect on a character already above Max HP unless its source specifies otherwise.
- Healing and Revive amounts are determined by their source.

Shields are separate from HP and absorb final incoming damage before HP is reduced. See the [Shield Standard](../shield-standard.md).

## Between Battles

- HP recovery is determined by the game mode.
