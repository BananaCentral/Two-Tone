# Campaign Standard

## Campaign entries

Author entries in [campaign.mjs](../../src/scripts/campaign.mjs). The Campaign tile opens the entry named by `FIRST_CAMPAIGN_ENTRY_ID`. The title screen also opens this entry for accounts that have yet to clear it. The saved first clear unlocks the main menu.

| Field | Meaning |
|---|---|
| `id` | Stable entry ID used for saved progress. Keep it stable after release. |
| `title` | Display title. |
| `story.perspective` and `story.viewpointCharacterId` | Narrative perspective and viewpoint character. The main story follows Soul in third-person limited. |
| `story.background` | Public image path. The scene displays it throughout the opening and crops it to fill the canvas. |
| `story.beats` | Ordered story beats. Each beat has one paragraph of `text` and may include a `portrait` reference. |
| `encounter.areaId` and `encounter.party` | Registered battle area and fixed party for the encounter. |
| `encounter.waves` | Ordered waves, each containing enemy archetype IDs and positive quantities. Existing encounter limits apply. |
| `firstClearCoins` | Coins the account earns on its first victory. |
| `nextEntryId` | Entry opened by Continue after the victory is saved. Use `null` for the last available entry. |

## Play and save flow

Continue advances the opening one paragraph at a time. Begin Battle appears on the final paragraph and hands control to the existing combat engine. Campaign units begin each attempt at full health. They use their profile progression and equipment, and encounter damage stays within the attempt.

When a battle starts in the same location and at the same time as the preceding scene, use the same background asset for the story and its registered battle area. If the transition changes location or time, assign the battle area that matches the encounter. See the [Battle Area Background Standard](../battle-area-background-standard.md) for battle camera behavior.

Defeat offers Retry, which starts the same encounter from wave one. Victory submits the entry ID to the authenticated player action route. The server looks up the reward and saves the clear and balance together under the profile lock. Older profiles start with an empty list of clears. A replay can be completed again with zero additional coins. A failed save can be retried with the same request ID.

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
| `startled` | Reacting to a sudden sound or movement. |

## Prologue 1A

`prologue_1a` is the first campaign entry. The five paragraphs use the moonlit campsite photo (`assets/prologue-1a-campsite.jpg`) and end as the gelatinous creature springs at Soul. Begin Battle keeps the campsite as the battlefield background and reveals one Slime in one wave against Soul. The first victory grants 100 coins. The next entry is unset.

Soul’s portraits appear in this order: eyes closed as he stirs, focused as he listens, startled at the branch crack, focused as he grabs his sword, and startled as the creature lunges.
