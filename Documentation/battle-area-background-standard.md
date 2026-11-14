# Battle Area Background Standard

## Area assignment

- Every battle uses a stable area ID from the `BATTLE_AREAS` registry in `src/scripts/main.js`.
- An area entry contains a display name and a registered background image key. Encounters pass the area ID when starting a battle; the current default is `area-1`.
- Area 1 uses `assets/area-1-meadow.jpg`.
- An area may define `reverseBackground` when it has a separate image for the opposite camera view. If omitted, reuse the main background mirrored horizontally.

## Rendering

- Draw the area's background before battlefield characters and effects. Keep the HUD in screen space above the scene.
- Cover the full 16:9 battle canvas while preserving the source image's aspect ratio; crop excess width or height from the center instead of stretching the image.
- Keep area-specific foreground effects in the area's configuration. Do not show effects from one area's environment over another area's background.
- Retain the procedural scene as a fallback while an area image is unavailable.

## Current area

| Area ID | Display name | Main background | Reverse background |
|---|---|---|---|
| `area-1` | Area 1 | `assets/area-1-meadow.jpg` | Mirrored main background |
