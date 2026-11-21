# Artwork Loading Standard

## Load artwork when the player needs it

- Register image paths without starting downloads. Request the artwork a screen draws when that screen opens. The title screen requests only its own art.
- Keep one image instance per asset path for the session. Reuse it across story, battle, and menus.
- Give the current story beat’s background and portrait high fetch priority. After that beat’s art settles, request the next beat’s art and the opening wave’s battle art at low priority. Later waves load their artwork as their enemies appear.
- Store, Loadout, and other menus request their artwork as they draw it. Keep navigation usable while art loads and use the existing visual fallback when an image is unavailable.

## Preserve full resolution

- Serve artwork at its original pixel dimensions. Keep original source files.
- Use full-resolution lossless WebP for a PNG when the WebP is smaller and decoded pixels and transparency match. Record the verification with a pixel comparison. Leave existing compressed images in place when conversion offers no worthwhile saving.
- Scale artwork to the viewport at render time. Keep existing framing and aspect-ratio rules.

## Verify startup performance

- Start with a fresh browser context. Record image request counts and encoded image bytes at the title screen, the first Prologue 1A beat, and the first battle. Use the same cache conditions, timings, and viewport for comparisons.
- Check the opening and battle handoff on a throttled mobile connection. Check a later campaign entry and at least one menu to confirm their artwork loads when needed.
- Report startup transfer separately from the size of the game directory. The directory also contains art that a player may never request.
