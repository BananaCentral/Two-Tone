# Enemy Battle HUD and Sprite Standard

## Battle Sprite Shape and Grounding

- Each enemy archetype defines `battleAspectRatio` as `width:height`, for example `1:1` or `1:2`. Width and height are positive whole numbers.
- The battle sprite asset should match its declared aspect ratio. If no ratio is defined, the renderer uses the asset's native pixel dimensions.
- Fit the sprite inside its formation slot without stretching or cropping. Center it horizontally and align its bottom edge to the slot's ground baseline. Formation slot dimensions control placement and available space; they do not change the sprite's aspect ratio.
- Target dots are centered on the sprite's rendered bounds, not on unused formation-slot space.

## Enemy Bars

- Show the Barrier bar above the HP bar.
- The Barrier bar is blue; the HP bar is red, with the selected target's HP fill highlighted gold.
- Both bars use the same width and have rounded ends. The current canvas sizes are 8 px for Barrier and 11 px for HP.
- Barrier amount and recovery follow the Enemy Barrier and Broken State rules in the Turn Order Standard.

## Target Dots

- Show a filled blue dot with a light outline at the center of every enemy that the currently previewed ability will hit.
- Single targets show one dot on the selected primary target.
- Blast targets show dots on the primary target and enemies in adjacent formation slots, up to three enemies total. A primary target at the edge of a formation may therefore have only two targets.
- AoE targets show a dot on every living enemy.
- Do not draw a selection box around enemies to communicate ability targets. The dot is the target indicator.
