---
name: sketch-import
description: Turn Lauren's Sketchpad upload into game art. Use when she says she uploaded a drawing (hat, clothes, face thing, neckwear, shoes, furniture, toy, background, pet).
---

# Sketch import

Read `docs/design/sketchpad-notes.md` for the details.

1. `get_file_contents` on `drawings/` at ref `drawings`; take the newest `<kind>-<mode>-<time>.svg` (plus `.strokes.json`, `.item.js`) unless she names one.
2. Redraw it cleanly as game-style SVG (never paste raw strokes). Pet coordinates are 160 x 150, same as `wardrobe.js` and `index.html`. Compare it over the pet (`tools/shot.js`).
3. By kind:
   - **Wardrobe item:** check the `.item.js` entry, write real hover `lines`, paste into `wardrobe.js` (slot, `snug` flag; no 'behind the pet' layer for hats). Icons come via `tools/copy-emoji.js` only if emoji are involved.
   - **Furniture:** a `decor.js` entry (x, y = centre / 400 and / 160, w, h, own view box).
   - **Background:** `backdrops.js` (400 x 160, day and night versions). **Toy / pet / scene:** as the notes say.
4. Check it on every species it can reach and the sizes (`--pet-size`), then `/build`.

## Reply format
What you made (name, slot), what you changed from her drawing and why, and honest feedback if the result looks weak next to the pet. Name any new animations.
