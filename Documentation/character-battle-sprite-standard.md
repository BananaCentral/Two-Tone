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

## Served Character Assets

| Character | Battle-stage view | Ally-target full-body view | HUD portrait |
|---|---|---|---|
| Soul | `assets/soul-ashblade-battle.webp` with Ashblade; `assets/soulbound-battle.png` with Soulbound | `assets/soul-artwork.webp` | `assets/soul-artwork.webp` |
| Lily | `assets/lily-petal-battle.png` with Petal; `assets/lily-everblossom-battle.png` with Everblossom | `assets/lily-artwork.png` | `assets/lily-artwork.png` |
| Dawn | `assets/dawn-radiant-pearl-battle.png` with Radiant Pearl; `assets/dawn-radiant-diamond-battle.png` with Radiant Diamond | `assets/dawn-artwork.png` | `assets/dawn-artwork.png` |
| Cloud | `assets/cloud-windcall-battle.png` with Windcall; `assets/cloud-nine-battle.png` with Cloud-nine | `assets/cloud-artwork.png` | `assets/cloud-artwork.png` |
| Logan | `assets/logan.png` with Crimson Edge; `assets/logan-bloodmoon-battle.png` with Bloodmoon | `assets/logan-front.png` (front-facing) | `assets/logan-front.png` (head-and-shoulders crop) |
| Zero | `assets/zero-battle.png` with Silent Edge; `assets/zero-nightshade-battle.png` with Nightshade | `assets/zero.png` (front-facing full-body artwork) | `assets/zero.png` |

