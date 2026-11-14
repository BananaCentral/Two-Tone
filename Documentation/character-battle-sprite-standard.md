# Character Battle Sprite Standard

## Scope

This standard applies to full-body character art rendered in battle-stage and ally-target-selection views. It does not define the small portraits used in turn-order cards or party setup.

## Sprite Rendering

- Register a battle-facing image for each playable character. Select the image that faces the direction required by that stage view; do not substitute the party-card portrait by default.
- Keep the source image transparent. Ignore pixels with alpha at or below 16 when finding the visible artwork bounds.
- Crop rendering to those visible alpha bounds so transparent canvas padding does not change a character's apparent size or placement.
- Preserve the visible artwork's aspect ratio. Do not stretch width and height independently.
- Render the visible artwork at 112% of the battle-stage slot height. Center it horizontally in the slot and align its visible bottom edge to the slot's baseline.
- Apply the same scale and alignment rules to every playable character, including idle and active battle poses. Ability-specific animated poses may define their own frames but must preserve the same apparent character height.
- Ally-target selection uses each character's full-body front-facing artwork, scaled to the same party-stage slot. Do not crop this view to a head-and-shoulders portrait.
- Character portraits in HUD cards use the character's front-facing portrait asset and the Battle Character Card Standard. Their crop and dimensions are independent of the battle-stage sprite.

## Current Character Assets

| Character | Battle-stage view | Ally-target full-body view | HUD portrait |
|---|---|---|---|
| Soul | `assets/soul-battle.png` | `assets/soul-portrait.png` | `assets/soul-portrait.png` |
| Lily | `assets/lily-back.png` (northeast-facing) | `assets/lily-front.png` | `assets/lily-front.png` |
| Dawn | `assets/dawn-battle.png` (side-facing) | `assets/dawn-front.png` | `assets/dawn-front.png` |
| Logan | `assets/logan.png` (rear-facing) | `assets/logan-front.png` (front-facing) | `assets/logan-front.png` (head-and-shoulders crop) |

