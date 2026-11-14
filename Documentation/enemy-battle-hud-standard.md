# Enemy Battle HUD and Sprite Standard

Enemy Critical Rate and Critical Damage are hidden combat values governed by the [Critical Hit Standard](critical-hit-standard.md); do not add them to visible enemy stat cards.

## Battle Sprite Shape and Grounding

- Each enemy archetype defines `battleAspectRatio` as `width:height`, for example `1:1` or `1:2`. Width and height are positive whole numbers.
- The battle sprite asset should match its declared aspect ratio. If no ratio is defined, the renderer uses the asset's native pixel dimensions.
- Ignore fully transparent pixels when positioning and targeting the sprite. Crop to the visible alpha bounds for rendering so transparent canvas padding cannot lift the visible artwork off the ground.
- Preserve the declared canvas aspect ratio without stretching. Center the visible sprite horizontally and align its visible bottom edge to the formation slot's ground baseline. Formation slot dimensions control available space; they do not change the sprite's aspect ratio.
- Target circles are centered on the visible rendered bounds, not on transparent padding or unused formation-slot space.

## Enemy Bars

- For Common and Elite enemies, show the Barrier bar above the HP bar.
- The Barrier bar is grey; the HP bar is red, with the selected target's HP fill highlighted gold.
- Both bars use the same width and have rounded ends. The current canvas sizes are 8 px for Barrier and 11 px for HP.
- Barrier amount and recovery follow the Enemy Barrier and Broken State rules in the Turn Order Standard.

## Boss Health Bars

- A Boss uses a dedicated screen-space health display at the top of the screen while it is on the field. Do not show a duplicate HP bar above its battlefield sprite; its Barrier bar remains above the sprite.
- Each Boss has one health bar by default and may define up to three with the `healthBars` field. Non-Boss enemies use one health bar.
- Stack the Boss's health bars in rows. Put one dot immediately to the left of each row; the total dot count shows the Boss's total number of health bars. Dim a dot after its corresponding bar is depleted.
- Divide the Boss's existing Max HP evenly across its bars. Damage drains the bars in order and carries across boundaries. The bars do not multiply Max HP or restore HP when a segment is depleted; the Boss is defeated when total HP reaches zero.

## Target Circles

- Show a blue outlined circle around every enemy that the currently previewed ability will hit. Center the circle on the visible sprite and make its radius large enough to surround the sprite. Preview the resolved target mode of the selected ability, including character-specific rules such as Soul’s 3-stack Basic becoming Blast or AoE.
- Single targets show one circle around the selected primary target.
- Blast targets show circles around the primary target and enemies in adjacent formation slots, up to three enemies total. A primary target at the edge of a formation may therefore have only two targets.
- AoE targets show a circle around every living enemy.
- Do not draw a selection box or center dot around enemies to communicate ability targets. The circle is the target indicator.

## Ability Targeting Flow

- The player selects Basic, Skill, or an available Ultimate before selecting an enemy. Selecting an ability enters target mode; the circles show every enemy the selected ability will hit. Tapping a circled enemy confirms the action. Pressing the same ability again confirms an attack against the currently selected enemy. Selecting a different ability switches the pending action. Escape or the explicit Cancel Target control cancels target mode.
- A target-requiring Ultimate selected from a character's portrait keeps that character as the acting character. Show the Ultimate user while selecting a target and in the Ultimate camera cut-in. An AoE Ultimate that hits every enemy activates immediately because it has no primary target to choose.
- Self-targeted skills do not require enemy selection. Soul's Enhance remains immediate because it adds a stack to Soul rather than attacking an enemy.
