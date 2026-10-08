# Fumufumu (Pet Shopper)

A grocery list with a little pet, Fumu, who eats each item as you check it off.

This is the first playable prototype. It answers one question: do people smile when Fumu eats, and do they still smile on the fifth trip?

## Try it

It is a plain web app with no build step. Serve the folder over HTTP and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

On a phone on the same Wi-Fi, open `http://<your computer's IP>:8000`. Offline mode and "Add to Home Screen" need HTTPS, for example GitHub Pages.

## Tests

The rules behind the app (emoji matching, sounds, list order, the pet's mood, saving the pet, achievement limits) are tested with Node's built-in test runner. There is nothing to install. With Node 18 or newer:

```sh
npm test
```

The tests live in `tests/` and load the same scripts the browser uses.

## What's in it

- **Shopping list.** Add items by typing or voice, tick them off, swipe to delete. Items get a food emoji and are grouped by shop aisle. Paste a recipe link or ingredients to add them in one go, in metric or US units.
- **To-do list.** Tap the title to swap lists. Tasks have dates and repeats, and there is a calendar and a stamp book.
- **Fumu.** A pet that eats what you tick off and reacts to it. Pick a species, skin and personality, name it, dress it up, decorate its room, pet it, and take photos of it.
- **Goals and Top 10.** Goals and your most-bought items, with fair-play rules so they follow real shopping.
- **Look and feel.** Cardboard and sticker style, light and dark, no ads. Works offline and installs to the home screen.

Not in it yet: accounts, shared lists, payments. See `CHANGELOG.md` for what changed and when.

## Files

- `index.html`, `styles.css`, `app*.js`: the app. Fumu is an inline SVG animated with CSS. The code is split by topic (`app-dress.js` is the dressing room, `app-goals.js` is goals, and so on); the list is in `CLAUDE.md`.
- `foods.js`: the keyword dictionary and matching. `tasks.js` is the same for the to-do list.
- `logic.js`: the app's rules with no page code (item order, mood, emoji picks, sound choice, saved state, achievement counting and unlocks), so they can be tested.
- `achievements.js`: the goals, what counts for each, the daily limit and what they unlock.
- `skins.js`: skins that change how a species looks.
- `personalities.js`: personalities, what they like and suggest, how they talk (`voice`), and how to earn them.
- `decor.js`: furniture and decor for the room behind the pet.
- `wardrobe.js`: the dressing-room items (hats), drawn as SVG on the pet's head.
- `sounds.js`: the eating and menu sounds, made with the Web Audio API. Each play is pitch-shifted a little, and menu sounds have several variants that take turns, so they rarely sound the same twice.
- `emoji/`: the OpenMoji SVGs the app uses. Regenerate with `node tools/copy-emoji.js <openmoji package>/color/svg` after adding emojis to `foods.js`.
- `sw.js`, `manifest.webmanifest`, `icon*`: offline support and home-screen install.

## Credits

Emoji artwork by [OpenMoji](https://openmoji.org/) (outlines recoloured to brown to match the app), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (see `emoji/OPENMOJI-LICENSE.txt`).
