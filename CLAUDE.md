# Pet Shopper (pet name: Nibble)

A grocery list with a tamagotchi-like pet that "eats" items as you check them off and gets happy. Owner: Lauren (GitHub laurmoe7), based in Europe. Private project. See `README.md` for the feature list and `docs/` for research and the pet/core-loop design.

## How to work with Lauren

- She wants honest, unflattering feedback. Don't flatter; say when something looks bad or is a weak idea.
- Priority is cute and appealing. Style is kawaii, inspired by Chiikawa but original (don't copy characters). Keep all pet species.
- She tests on her phone and reports by build number (shown in Options, `BUILD` in `app.js`). Always bump the build when you change app files.
- Changes go live by pushing to `main` (no pull request). When she says "big push" (she used to say "ship it"), run `npm test`, then push to `main`; the Pages workflow tests and deploys. Do this only when she asks, and check the preview with her first.
- Add to `CHANGELOG.md` for each build you ship, kept simple: a heading per build and one short line per change (a few words, no explanations or technical detail).
- She wants people to use the list legitimately, not game it for unlocks (hence the fair-play rules).

- Nothing requires an unlock for now: `FreeUnlocks.all` in `achievements.js` opens every species, skin, hat and personality. New things should not need unlocks either; goals still count progress and set `all` to false to bring unlocking back (the unlock rules and tests are kept). Skin parts that are shared between skins use `data-sk="skin1 skin2"` (matched with `~=`).
- Keep files focused. Put new code in the `app-*.js` file for its topic, and start a new file when a topic needs one. Only split an existing file when I would have to read through unrelated code to change one thing, as with the old single `app.js`. Size alone is not a reason: a plain list like `wardrobe.js`, or a file with clear sections like `logic.js`, is fine long because it can be searched and read in parts. A split must not change behavior: run `npm test`, bump the build and check the preview.

## Product decisions

- Free, usable, no ads. Monetization later via paid pet customization. The dressing room is currently a test of that idea; no payments yet.
- Deals/price data are dropped for now (store data is US-centric and not useful in Europe). Research is parked in `docs/research/competitors-and-deal-data.md`.
- A shared household pet is planned later, so all pet data stays in one object (`state.pet`, via `PetLogic.petProfile`). Keep it that way.
- No known app combines a list with a pet. Real rivals are shared-list apps (AnyList, Bring!, OurGroceries, Listonic); Finch, Otto and Habbie are pet habit apps.

## How the code is organised

Plain web app, no build step, no dependencies. `npm test` runs Node's built-in test runner on `tests/`, which load the same scripts the browser uses.

- `index.html`, `styles.css`: UI. The look is cardboard (kraft board, taped paper labels, sticker buttons), with light and dark modes; its rules are at the end of `styles.css` under `html:root` (the old pink look was removed in build 103). Nibble is an inline SVG animated with CSS. The main pet buttons live in the `.dock` bottom bar (ids `dressBtn`, `roomBtn`, `treatBtn`, `favBtn`, `goalsBtn`, `editPetBtn`).
- `app*.js`: the UI code, split by topic. They are plain scripts sharing one scope (no modules), loaded in the order in `index.html`. Read only the file you need:
  - `app.js` (comes first): `BUILD`, saved state, helpers, page elements, list rendering.
  - `app-pet.js`: Nibble's faces, speech, flying food, crumbs.
  - `app-actions.js`: sound and haptics, the eating queue, list actions, emoji picker.
  - `app-petsheet.js`: edit pet. `app-dress.js`: dressing room. `app-room.js`: room furniture. `app-goals.js`: goals and unlocks.
  - `app-events.js`: adding items, taps and long-presses. `app-personality.js`: personalities and suggestions.
  - `app-favourites.js`: the Top 10 sheet (medals, #1 pedestal). `app-petting.js`: stroking Nibble for a purr and hearts. `app-treats.js`: the Treats sheet (pick 3 free snacks a day; they count for goals and tastes but never the Top 10).
  - `app-options.js`: Options and Developer tools. `app-idle.js`: daydreams, idle moves, eye following. `app-start.js`: startup, loads last.
  - A new `app-*.js` file must be added to `index.html`, `SHELL` in `sw.js` and `SCRIPTS` in `tools/build-preview.js`. Top-level code runs as the file loads, so it can only use things from files loaded before it.
- `logic.js` (`PetLogic`): rules with no page code (item order, mood, saved state, achievement counting, unlocks, favourites tally (`pet.favourites`, same fair-play rules as goals), voice lines, `OUTFIT_SLOTS`, `BIRDS`, dev helpers like `unlockAll`/`skipDays`). Keep logic here so it is testable.
- `wardrobe.js`: dressing-room items drawn as SVG. Outfit slots are `hat`, `body` (clothes such as hoodies; a hood and a hat take each other off), `face`, `mouth`, `neck`, `feet` (`PetLogic.OUTFIT_SLOTS`); each has its own layer (`.outfit-neck` under face, `.outfit-mouth` in front of the face, `.outfit-feet` in front of body). Renamed or removed items are mapped in `parseOutfit` in `logic.js`. Each item has hover `lines`; a `snug` flag hides the hair twist/tuft (bandana, headphones, helmet). Add cosmetics here.
- `achievements.js`: goals, daily caps per calendar day, what each unlocks. Add goals here.
- `personalities.js`: personalities, tastes, `voice`. Foodie is free; the others are earned via `pet.tastes`.
- `decor.js`: room furniture (draggable, stored in `pet.room`). The rug is drawn first.
- `foods.js`: keyword to emoji dictionary. After adding emoji, regenerate with `node tools/copy-emoji.js <openmoji package>/color/svg` (openmoji@17).
- `sounds.js`: Web Audio sounds with random pitch and variants.
- Birds (the birdie, `PetLogic.BIRDS`) get `.beaked` and no mouth; treat future birds the same. Ears live in `.ear-l`/`.ear-r` groups.
- Species: mochi, pig, cat, dog, bunny, birdie, cow, hamster, frog, hedgehog, axolotl (list in `app-petsheet.js`, parts drawn in `index.html` with `data-sp`). All eye states live in `.eye-set`, so a species can move the eyes as one. Don't put `transform` on the eye groups themselves: the blink animation overrides it.
- Species and skins: a species is a body (`pet.species`); a skin (`pet.skin`, list in `skins.js`) changes colours and parts on that body. The axolotl's gills are `.ear-g` groups (a test counts `.gill-fill` as its ears). Sheets have no Done button: a `.sheet-grab` bar (added in `app.js`) closes them. Skins so far: birdie (original, penguin, parrot, kiwi), mochi (strawberry, chocolate, taro), cat (tabby, black cat, calico), dog (chihuahua, Pomeranian, golden retriever), frog (poison dart frog, toad), cow (chocolate milk, Highland cattle), pig (dirty piggy, boar), bunny (floppy ears, Dutch), hamster (white, long-haired black). A skin is drawn with `data-skin` rules and `data-sk` parts in `styles.css`/`index.html`; a species' own parts use `data-sp`. Old saves load with chick -> birdie and penguin -> birdie + penguin skin. Prefer a skin over a new species when the new look is mostly colour on an existing body.
- Each foot is its own group (`.foot-l`/`.foot-r` in `index.html`; shoes are split into `.shoe-l`/`.shoe-r` by `splitShoes` in `wardrobe.js`), animated in the feet section of `styles.css`.
- Food reactions: `REACTIONS` in `app-pet.js` by category, plus special ones picked by `REACTION_RULES`/`reactionOf` (no chocolate for any species but the mochi, sour, crunchy, cold, coffee, grown-up drinks and pet food; chocolate, grown-up drinks and pet food go in the bag via `isBagged`).
- Animal faces (bunny, cat, dog, hamster, hedgehog): a nose (`.nose-round`, `.nose-cat`, `.nose-dark`), a :3 smile (`.smile-lip`, or `.smile-bunny` with buck teeth) and eyes a little wider and lower (eye parts carry `.eye-l`/`.eye-r`, moved with the CSS `translate` property so blinks and sparkles still work). Set per species in styles.css.
- Paws, hooves and bird toes are `.paw-part`, `.hoof-part` and `.bird-part` in `index.html`; which species shows which is set in `styles.css` (not `data-sp`). The frog keeps its own webs.
- The pet's resting mood is `PetLogic.restingMood` (list mood plus time of day: asleep 10 pm to 7 am when nothing is left to buy). Use `L.mood` for list-only checks such as "all done".
- Options (gear) are saved in `state.settings`, separate from the pet. Developer tools sheet lives in Options.

### Service worker and builds

`sw.js` caches the app shell. Whenever you change any cached file: bump `CACHE` in `sw.js` (`nibble-vNN`) and `BUILD` in `app.js` to the same number (a test checks they match), and add any new script to `SHELL`.

### Phone preview

Lauren previews on her phone via a single-file build (styles and scripts inlined, emoji published alongside) published as a claude.ai artifact, and the repo is also served by GitHub Pages under `/pet-shopper/`. `npm run preview` builds `preview/index.html` (styles and scripts inlined) plus `preview/emoji/`; `npm run preview:bump` raises `BUILD` and `CACHE` by one first. Publish `preview/index.html` to the existing artifact URL; emoji only need uploading on the first publish, later publishes keep them.

## Lessons learned

- Squash and stretch is drawn by `svgSquish` in `app-pet.js` (steps in `SQUISH`, played by `pulse` for chomp, spit, stretch, pat, hop, hopsmall, hophop, plus `softSettle` in `app-idle.js`; `settle` in `app-pet.js` is a different thing, it resets the face): it sets an SVG `transform` on `.pet-body` each frame, so the phone redraws the shapes. Never scale or rotate the pet with CSS: a CSS scale on `.squash` left a hairline across the face on her phone (found in build 72, fixed this way in builds 81-84). `.squash` and `.pet-svg` moves only translate (a test checks `.squash`). Keep squashes at about 15% or less: the 30-40% squashes of build 81 still showed a seam. The boogie dance and the rock/roly/wiggle tilts still use CSS scale or rotate on `.pet-svg`; move them to `svgSquish` if a seam shows there. The seam is a Firefox (Gecko) drawing bug: in build 84 it still showed in Firefox on her Pixel but not in Chrome. A Play Store or App Store app would use the Chrome or Safari engine, so judge animations in Chrome (she tests a Chrome-installed copy) and Safari; a Firefox-only seam is acceptable.
- Keep shoes about the size of the original boots; the first oversized shoes looked awkward to her.
- The mochi hair twist: fill covers the outline and the line ends on it, with the skin path starting at the bottom, so there is no seam.
- Test on a phone-sized viewport; she reports visual glitches that desktop hides.

## Docs and assets

- `docs/research/`: competitor and deal-data research (includes a Netherlands addendum).
- `docs/design/`: pet and core-loop design.
- `assets/stickers/`: comic-style sticker PNGs (`decorations/` has star sprinkles), kept for possible use as reaction art.
