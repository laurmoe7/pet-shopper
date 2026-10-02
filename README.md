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

- One list: add, check off, put back, delete.
- Each item becomes an emoji from an English keyword list (`foods.js`, about 130 rows, plurals handled, longest match wins, quantities like `2x` or `500g` ignored). Unknown items become a mystery gift box.
- Tap an item's emoji, or long-press the item, to pick a different one. The choice is remembered for that word.
- Nibble has five states: sleepy, curious, happy, stuffed, plus eating. The emoji hops into its mouth when you check it off, with a reaction per food type (fruit, veg, sweets, spicy, drinks, bread, non-food, mystery). Unchecking makes Nibble spit it back. Finishing the list gets a little celebration and a nap.
- Tap "Edit pet" to rename your pet and pick a species: mochi, pig, cat, dog, bunny, chick, cow, hamster or penguin. Its little arms join in on every reaction, and its eyes follow your finger or cursor.
- Tap "Dress up" to open the dressing room and try on a hat: top hat, maid's hairband or sun hat. Point at a hat and your pet says something about it; try one on and it squeaks with excitement. Hats are a list in `wardrobe.js` (with the pet's lines for each), so more items can be added there. This is a test of the cosmetics idea; nothing is paid yet.
- Tap "Goals" to see achievements. Mochi, Pig, Cat, Dog and the top hat are free; Bunny, Chick, Cow, Hamster, Penguin, the maid's hairband and the sun hat unlock by feeding your pet (for example, 20 fish for the Penguin). Only a few count each calendar day (2 fish a day for the Penguin), so nothing unlocks in one day. Putting an item back the same day takes its count back. Goals are a list in `achievements.js`.
- Quiet mode turns off the chomp sound and speech bubbles.
- Everything is saved on the device (`localStorage`). A service worker caches the app for offline use.

Not in it yet: accounts, shared lists, payments, multiple lists.

## Files

- `index.html`, `styles.css`, `app.js`: the app. Nibble is an inline SVG animated with CSS.
- `foods.js`: the keyword dictionary and matching.
- `logic.js`: the app's rules with no page code (item order, mood, emoji picks, sound choice, saved state, achievement counting and unlocks), so they can be tested.
- `achievements.js`: the goals, what counts for each, the daily limit and what they unlock.
- `wardrobe.js`: the dressing-room items (hats), drawn as SVG on the pet's head.
- `sounds.js`: the eating sounds, made with the Web Audio API.
- `emoji/`: the OpenMoji SVGs the app uses. Regenerate with `node tools/copy-emoji.js <openmoji package>/color/svg` after adding emojis to `foods.js`.
- `sw.js`, `manifest.webmanifest`, `icon*`: offline support and home-screen install.

## Credits

Emoji artwork by [OpenMoji](https://openmoji.org/) (outlines recoloured to brown to match the app), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (see `emoji/OPENMOJI-LICENSE.txt`).
