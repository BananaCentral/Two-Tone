# Battle Character Card Standard

Battle-stage character art follows the [Character Battle Sprite Standard](character-battle-sprite-standard.md). Card portraits are front-facing portrait assets and are sized independently from full-body battle sprites.

## Card Layout

Each allied character card presents combat information in this order:

- Character portrait at the upper left.
- Ultimate control in the upper-right area, above the HP value.
- Current and maximum HP aligned on the right above the health bar.
- Health bar beneath the portrait and HP value, spanning the card.
- Passive indicator below the health bar.

Portrait and Ultimate controls should remain visually prominent, with enough spacing for the HP bar and passive indicator.

## Shield Layer

- When a unit has Shield, draw a translucent gray layer over the green HP bar. Keep the green fill visible beneath it.
- Extend the gray layer beyond the current HP fill to show the additional Shield buffer, with a small reserved extension past the normal HP scale.
- Do not show a numeric Shield total on ally cards. Use the same visual treatment on enemy and boss HP bars; Shield text feedback may say `BLOCKED` without a numeric Shield value.
- Increase card height as needed to keep the layered bar and passive indicators clear. Current cards use 210 px height.

## Soul Follow Up Indicator

- Do not display the passive name or a numeric current/maximum label on Soul's battle card.
- Show one dot per Follow Up charge in the current capacity: five by default, or seven with Character Duplicate 1.
- Lit dots represent remaining charges; dim dots represent spent charges.
- Ultimate refills the dots to the current capacity after its damage resolves, following Soul's character sheet.

## Interaction

- The Ultimate icon remains a usable control for queuing or activating that character's Ultimate under the combat UI rules.
- Battle card presentation does not change combat stats, targeting, turn order, damage, or passive behavior.
