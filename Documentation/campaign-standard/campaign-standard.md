# Campaign Standard

Follow the [Campaign Writing Standard](campaign-writing-standard.md) for narration, tone, and paragraph breaks.

## Campaign entries

Author entries in [campaign.mjs](../../src/scripts/campaign.mjs). The title screen opens the entry named by `FIRST_CAMPAIGN_ENTRY_ID` for accounts that have yet to clear it. The saved first clear unlocks the main menu. After the main menu unlocks, its Campaign tile opens the campaign selector.

| Field | Meaning |
|---|---|
| `id` | Stable entry ID used for saved progress. Keep it stable after release. |
| `title` | Display title. |
| `prerequisiteEntryId` | Earlier entry that must have a saved clear. Omit for the opening entry. |
| `story.perspective` and `story.viewpointCharacterId` | Narrative perspective and viewpoint character. The main story follows Soul in third-person limited. |
| `story.background` | Public image path. The scene uses it by default and crops it to fill the canvas. A beat may specify a `background` to show a change in setting or time. |
| `story.beats` | Ordered story beats. Each beat has one or more paragraphs of `text` and may include a `portrait` reference. |
| `encounter.areaId` and `encounter.party` | Registered battle area and fixed party for the encounter. |
| `encounter.waves` | Ordered waves, each containing enemy groups with an archetype ID, a positive quantity, and an optional level. Specify the level for authored encounters. When omitted, use the archetype’s default. Existing encounter limits apply. |
| `firstClearCoins` | Coins the account earns on its first victory. |
| `nextEntryId` | Entry opened by Continue after the victory is saved. Use `null` for the last available entry. |

## Campaign selector

- Organize the selector as **Arc → Chapter → Part**. An arc contains an ordered list of chapters. A chapter contains an ordered list of lettered parts. Each part references a playable entry by its existing entry ID.
- Define this hierarchy in `CAMPAIGN_ARCS`. Give arcs and chapters stable IDs and display titles. List part letters and entry IDs in the order players should see them.
- Arc One contains the **Prologue** chapter. Part A opens `prologue_1a`, Part B opens `prologue_1b`, and Part C opens `prologue_1c`.
- Every time players open Campaign from the main menu, show **Select Arc**. Selecting an arc opens **Select Chapter**, then selecting a chapter opens **Select Part**. Back returns to the previous level. The arc screen links back to the main menu. Lists with more than five choices use additional pages.
- Mark a part **Available** when its prerequisite is satisfied and **Cleared** after its first saved victory. A part with an unmet prerequisite is visible and marked **Locked**. Both available and cleared parts open at the first story beat. Replays do not award first-clear coins again.
- Selector order controls browsing. `nextEntryId` controls **Continue** from a saved victory, and `prerequisiteEntryId` controls unlocks.

## Play and save flow

Continue advances one beat at a time. Begin Battle appears on the final beat and hands control to the existing combat engine. Campaign units begin each attempt at full health. They use their profile progression and equipment, and encounter damage stays within the attempt.

## Story backgrounds

Set a default `story.background` for the entry. Set `background` on individual beats when a change in time, location, or viewpoint needs different art. The image changes when the player advances to that beat. Each override applies to its own beat. Repeat the path on consecutive beats that share an image, and omit the override to return to the default.

When a battle starts in the same location and at the same time as the preceding scene, use the same background asset for the story and its registered battle area. If the transition changes location or time, assign the battle area that matches the encounter. See the [Battle Area Background Standard](../battle-area-background-standard.md) for battle camera behavior.

## Encounter results

Defeat offers Retry, which starts the same encounter from wave one. Victory submits the entry ID to the authenticated player action route. The server checks the prerequisite before recording a clear. Continue opens the linked entry after the victory is saved. The server looks up the reward and saves the clear and balance together under the profile lock. Older profiles start with an empty list of clears. A replay can be completed again with zero additional coins. A failed save can be retried with the same request ID.

Combat currently resolves in the browser. The server accepts the authenticated client's victory report and enforces the one-time payout. Independent server verification of the combat outcome is pending.

## Reaction portraits

- Add transparent, square portraits to the shared `STORY_PORTRAITS` registry in `campaign.mjs`. Match head and shoulder framing across a character’s expressions.
- Reference a portrait by `characterId` and `reactionId` on each beat that needs it. Repeat the reference to hold an expression across beats. Omit the reference for narration alone.
- The portrait appears on the right as its paragraph is shown and stays there until the player advances. Reserve space for the complete paragraph and its buttons. Keep the background visible around the panel.
- A failed portrait load leaves the paragraph and controls usable. **Begin Battle** clears the story portrait at the combat handoff.

| Soul reaction | Use |
|---|---|
| `eyes-closed` | Asleep, stirring, or resting with eyes closed. |
| `focused` | Listening, assessing a threat, or preparing to act. |
| `composed` | Calm again after the immediate threat has passed. |
| `relaxed` | A quiet moment after washing at the river. |
| `hopeful` | A quiet smile at a promising sight. |
| `startled` | Reacting to a sudden sound or movement. |

## Prologue 1A

`prologue_1a` is the first campaign entry. The story beats use the moonlit campsite photo (`assets/prologue-1a-campsite.jpg`) and end as the gelatinous creature springs at Soul. Begin Battle keeps the campsite as the battlefield background and reveals one level 1 Slime in one wave against Soul. The first victory grants 100 coins and unlocks Prologue 1B.

Soul’s portraits appear in this order: eyes closed as he stirs, focused as he listens, startled at the branch crack, focused as he grabs his sword, and startled as the creature lunges.

## Prologue 1B

`prologue_1b` opens after the saved clear of Prologue 1A. Soul cleans his sword, packs his tent, and spots a distant village before three wolves approach the campsite. The first two beats use the moonlit campsite and Soul’s composed portrait. When he packs up, the art changes to the sunrise campsite and the portrait is omitted. Soul looks hopeful at the village and startled as the wolves approach. The sunrise beats and the wolf battle share `assets/prologue-1b-campsite-sunrise.webp`. The battle consists of one wave of three level 1 Wolves. The first victory grants 100 coins. The saved victory unlocks Prologue 1C.

## Prologue 1C

`prologue_1c` opens after the saved clear of Prologue 1B. Soul leaves the sunrise campsite and reaches the riverbank in full morning. The riverbank background stays through the story and battle. Use Soul’s relaxed portrait while he dries and his startled portrait as the hawks circle and dive. The encounter is one wave of five level 1 Hawks against Soul. The first victory grants 100 coins. The next entry is unset.
