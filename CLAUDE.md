# Pet Shopper (pet name: Nibble)

A grocery list with a tamagotchi-like pet that "eats" items as you check them off and gets happy. Owner: Lauren (GitHub laurmoe7), based in Europe. Private project. See `README.md` for the feature list and `docs/` for research and the pet/core-loop design.

## How to work with Lauren

- She wants honest, unflattering feedback. Don't flatter; say when something looks bad or is a weak idea.
- Priority is cute and appealing. Style is kawaii, inspired by Chiikawa but original (don't copy characters). Keep all pet species.
- She tests on her phone and reports by build number (shown in Options, `BUILD` in `app.js`). Always bump the build when you change app files.
- Changes go live by pushing to `main` (no pull request). When she says "ship it", run `npm test`, then push to `main`; the Pages workflow tests and deploys. Do this only when she asks, and check the preview with her first.
- Add a short line to `CHANGELOG.md` for each build you ship.
- She wants people to use the list legitimately, not game it for unlocks (hence the fair-play rules).

- Keep files focused. Put new code in the `app-*.js` file for its topic, and start a new file when a topic needs one. Only split an existing file when I would have to read through unrelated code to change one thing, as with the old single `app.js`. Size alone is not a reason: a plain list like `wardrobe.js`, or a file with clear sections like `logic.js`, is fine long because it can be searched and read in parts. A split must not change behavior: run `npm test`, bump the build and check the preview.

## Product decisions

- Free, usable, no ads. Monetization later via paid pet customization. The dressing room is currently a test of that idea; no payments yet.
- Deals/price data are dropped for now (store data is US-centric and not useful in Europe). Research is parked in `docs/research/competitors-and-deal-data.md`.
- A shared household pet is planned later, so all pet data stays in one object (`state.pet`, via `PetLogic.petProfile`). Keep it that way.
- No known app combines a list with a pet. Real rivals are shared-list apps (AnyList, Bring!, OurGroceries, Listonic); Finch, Otto and Habbie are pet habit apps.

## How the code is organised

Plain web app, no build step, no dependencies. `npm test` runs Node's built-in test runner on `tests/`, which load the same scripts the browser uses.

- `index.html`, `styles.css`: UI. Nibble is an inline SVG animated with CSS.
- `app*.js`: the UI code, split by topic. They are plain scripts sharing one scope (no modules), loaded in the order in `index.html`. Read only the file you need:
  - `app.js` (comes first): `BUILD`, saved state, helpers, page elements, list rendering.
  - `app-pet.js`: Nibble's faces, speech, flying food, crumbs.
  - `app-actions.js`: sound and haptics, the eating queue, list actions, emoji picker.
  - `app-petsheet.js`: edit pet. `app-dress.js`: dressing room. `app-room.js`: room furniture. `app-goals.js`: goals and unlocks.
  - `app-events.js`: adding items, taps and long-presses. `app-personality.js`: personalities and suggestions.
  - `app-favourites.js`: the Top 10 sheet. `app-petting.js`: stroking Nibble for a purr and hearts.
  - `app-options.js`: Options and Developer tools. `app-idle.js`: daydreams, idle moves, eye following. `app-start.js`: startup, loads last.
  - A new `app-*.js` file must be added to `index.html`, `SHELL` in `sw.js` and `SCRIPTS` in `tools/build-preview.js`. Top-level code runs as the file loads, so it can only use things from files loaded before it.
- `logic.js` (`PetLogic`): rules with no page code (item order, mood, saved state, achievement counting, unlocks, favourites tally (`pet.favourites`, same fair-play rules as goals), voice lines, `OUTFIT_SLOTS`, `BIRDS`, dev helpers like `unlockAll`/`skipDays`). Keep logic here so it is testable.
- `wardrobe.js`: dressing-room items drawn as SVG. Outfit slots are `hat`, `face`, `neck`, `feet` (`PetLogic.OUTFIT_SLOTS`); each has its own layer (`.outfit-neck` under face, `.outfit-feet` in front of body). Each item has hover `lines`; a `snug` flag hides the hair twist/tuft (bandana, headphones, helmet). Add cosmetics here.
- `achievements.js`: goals, daily caps per calendar day, what each unlocks. Add goals here.
- `personalities.js`: personalities, tastes, `voice`. Foodie is free; the others are earned via `pet.tastes`.
- `decor.js`: room furniture (draggable, stored in `pet.room`). The rug is drawn first.
- `foods.js`: keyword to emoji dictionary. After adding emoji, regenerate with `node tools/copy-emoji.js <openmoji package>/color/svg` (openmoji@17).
- `sounds.js`: Web Audio sounds with random pitch and variants.
- Birds (chick, penguin) get `.beaked` and no mouth; treat future birds the same. Ears live in `.ear-l`/`.ear-r` groups.
- Options (gear) are saved in `state.settings`, separate from the pet. Developer tools sheet lives in Options.

### Service worker and builds

`sw.js` caches the app shell. Whenever you change any cached file: bump `CACHE` in `sw.js` (`nibble-vNN`) and `BUILD` in `app.js` to the same number (a test checks they match), and add any new script to `SHELL`.

### Phone preview

Lauren previews on her phone via a single-file build (styles and scripts inlined, emoji published alongside) published as a claude.ai artifact, and the repo is also served by GitHub Pages under `/pet-shopper/`. `npm run preview` builds `preview/index.html` (styles and scripts inlined) plus `preview/emoji/`; `npm run preview:bump` raises `BUILD` and `CACHE` by one first. Publish `preview/index.html` to the existing artifact URL; emoji only need uploading on the first publish, later publishes keep them.

## Lessons learned

- Avoid scaling or rotating curved SVG shapes in animations; it caused visible seams and trails on her phone. Animate with translation or opacity, or redraw the shape.
- Keep shoes about the size of the original boots; the first oversized shoes looked awkward to her.
- The mochi hair twist: fill covers the outline and the line ends on it, with the skin path starting at the bottom, so there is no seam.
- Test on a phone-sized viewport; she reports visual glitches that desktop hides.

## Docs and assets

- `docs/research/`: competitor and deal-data research (includes a Netherlands addendum).
- `docs/design/`: pet and core-loop design.
- `assets/stickers/`: comic-style sticker PNGs (`decorations/` has star sprinkles), kept for possible use as reaction art.
