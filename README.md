# Pet Shopper

A grocery list with a little pet, Nibble, who eats each item as you check it off.

This is the first playable prototype. It answers one question: do people smile when Nibble eats, and do they still smile on the fifth trip?

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

- **The list.** Add items, tick them off, put them back, delete them. Each item gets a food emoji, and you can pick a different one.
- **Nibble.** Eats each item you tick off, reacts to the type of food, and celebrates when the list is done. Pick a species and a personality, and rename it with a double-tap.
- **Dress up.** Hats, glasses, scarves and shoes. Each has its own line when you point at it.
- **Top 10.** Counts what you buy most (once per item per day, same fair-play rules as goals) and ranks it in the Pet menu. Tap + to put a favourite back on the list.
- **Petting.** Stroke Nibble with a finger for a purr and hearts.
- **Room.** Place furniture behind Nibble and drag it around.
- **Goals.** Feeding Nibble unlocks new species, personalities and hats. Fair-play rules keep it about real shopping:
  - Items count after 15 minutes on the list, and once a day each.
  - Only a few count per day, so nothing unlocks in one day.
  - Putting an item back the same day takes its count back.
- **Little extras.** A shopping cart, daydreams, suggestions and idle moves.
- **Options.** Sounds, vibration, quiet mode and more. Developer tools sit at the bottom for testing.
- **Saved on the device.** Works offline once loaded.

Not in it yet: accounts, shared lists, payments, multiple lists. See `CHANGELOG.md` for what changed and when.

## Files

- `index.html`, `styles.css`, `app*.js`: the app. Nibble is an inline SVG animated with CSS. The code is split by topic (`app-dress.js` is the dressing room, `app-goals.js` is goals, and so on); the list is in `CLAUDE.md`.
- `foods.js`: the keyword dictionary and matching.
- `logic.js`: the app's rules with no page code (item order, mood, emoji picks, sound choice, saved state, achievement counting and unlocks), so they can be tested.
- `achievements.js`: the goals, what counts for each, the daily limit and what they unlock.
- `personalities.js`: personalities, what they like and suggest, how they talk (`voice`), and how to earn them.
- `decor.js`: furniture and decor for the room behind the pet.
- `wardrobe.js`: the dressing-room items (hats), drawn as SVG on the pet's head.
- `sounds.js`: the eating and menu sounds, made with the Web Audio API. Each play is pitch-shifted a little, and menu sounds have several variants that take turns, so they rarely sound the same twice.
- `emoji/`: the OpenMoji SVGs the app uses. Regenerate with `node tools/copy-emoji.js <openmoji package>/color/svg` after adding emojis to `foods.js`.
- `sw.js`, `manifest.webmanifest`, `icon*`: offline support and home-screen install.

## Credits

Emoji artwork by [OpenMoji](https://openmoji.org/) (outlines recoloured to brown to match the app), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (see `emoji/OPENMOJI-LICENSE.txt`).
