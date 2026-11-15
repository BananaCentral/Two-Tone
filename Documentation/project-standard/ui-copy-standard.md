# Two-Tone UI Copy Standard

## Principle

Use interface text to name actions and show useful state. Do not add explanatory text just to fill space or repeat what the control, heading, icon, or displayed value already makes clear.

Use the [UI Layout Standard](ui-layout-standard.md) for panel hierarchy, alignment, and spacing.

## Controls and panels

- Give each control a short, direct label. Use the action name alone when its purpose is clear, such as **Upgrade** or **Switch**.
- Do not add a subtitle below a button when the button label and surrounding panel already explain its purpose.
- Do not repeat the same instruction or status in multiple places in one panel.
- Prefer concise values and status labels over sentences. Keep necessary values close to the action they affect.
- Show a reason for a disabled control only when the reason is not already obvious from visible state. Keep that reason brief.
- Do not put generic explanatory sentences beneath action rows or item choices. Put detailed mechanics in a dedicated details view or the system documentation.
- Keep the UI understandable without relying on an icon alone; important actions and destinations need text labels.

## Useful exceptions

Use a short explanation when a player needs it to make a meaningful choice, understand an unusual outcome, or avoid an irreversible action. Prefer one brief sentence, placed beside the relevant decision. Error and success feedback should state what happened and any required next step.

## Loadout examples

- Show the active weapon bonus, such as **+31% ALL STATS**, left-aligned just above its **Upgrade**/**Ascend** control.
- Label those buttons **Upgrade** and **Switch** without repeating their purpose below them.
- Show only the selected weapon's name in its detail panel; **Switch** is the control for changing weapons.
- Place the selected weapon name at the panel's left edge directly above its artwork. Center the larger section heading above the panel card.
- Use cropped face portraits in character selectors instead of scaling full-body artwork into small circles.
- Enchanted Book selectors show book size, XP amount, owned quantity, and selected quantity. **Upgrade** confirms the selection. At Ascension gates, replace book selectors with the required material and owned quantity.
