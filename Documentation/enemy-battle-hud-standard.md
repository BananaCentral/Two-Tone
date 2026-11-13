# Enemy Battle HUD and Sprite Standard

## Battle Sprite Shape and Grounding

- Each enemy archetype defines `battleAspectRatio` as `width:height`, for example `1:1` or `1:2`. Width and height are positive whole numbers.
- The battle sprite asset should match its declared aspect ratio. If no ratio is defined, the renderer uses the asset's native pixel dimensions.
- Ignore fully transparent pixels when positioning and targeting the sprite. Crop to the visible alpha bounds for rendering so transparent canvas padding cannot lift the visible artwork off the ground.
- Preserve the declared canvas aspect ratio without stretching. Center the visible sprite horizontally and align its visible bottom edge to the formation slot's ground baseline. Formation slot dimensions control available space; they do not change the sprite's aspect ratio.
- Target circles are centered on the visible rendered bounds, not on transparent padding or unused formation-slot space.

## Enemy Bars

- Show the Barrier bar above the HP bar.
- The Barrier bar is grey; the HP bar is red, with the selected target's HP fill highlighted gold.
- Both bars use the same width and have rounded ends. The current canvas sizes are 8 px for Barrier and 11 px for HP.
- Barrier amount and recovery follow the Enemy Barrier and Broken State rules in the Turn Order Standard.

## Target Dots

- Show a blue outlined circle around every enemy that the currently previewed ability will hit. Center the circle on the visible sprite and make its radius large enough to surround the sprite.
- Single targets show one dot on the selected primary target.
- Blast targets show dots on the primary target and enemies in adjacent formation slots, up to three enemies total. A primary target at the edge of a formation may therefore have only two targets.
- AoE targets show a dot on every living enemy.
- Do not draw a selection box or center dot around enemies to communicate ability targets. The circle is the target indicator.
