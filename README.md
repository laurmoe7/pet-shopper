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

## What's in it

- One list: add, check off, put back, delete.
- Each item becomes an emoji from an English keyword list (`foods.js`, about 130 rows, plurals handled, longest match wins, quantities like `2x` or `500g` ignored). Unknown items become a mystery gift box.
- Tap an item's emoji, or long-press the item, to pick a different one. The choice is remembered for that word.
- Nibble has five states: sleepy, curious, happy, stuffed, plus eating. The emoji hops into its mouth when you check it off, with a reaction per food type (fruit, veg, sweets, spicy, drinks, bread, non-food, mystery). Unchecking makes Nibble spit it back. Finishing the list gets a little celebration and a nap.
- Tap "Edit pet" to rename your pet and pick a species: mochi, pig, cat, dog, bunny or chick. Its little arms join in on every reaction.
- Quiet mode turns off the chomp sound and speech bubbles.
- Everything is saved on the device (`localStorage`). A service worker caches the app for offline use.

Not in it yet: accounts, shared lists, payments, multiple lists.

## Files

- `index.html`, `styles.css`, `app.js`: the app. Nibble is an inline SVG animated with CSS.
- `foods.js`: the keyword dictionary and matching.
- `emoji/`: the OpenMoji SVGs the app uses. Regenerate with `node tools/copy-emoji.js <openmoji package>/color/svg` after adding emojis to `foods.js`.
- `sw.js`, `manifest.webmanifest`, `icon*`: offline support and home-screen install.

## Credits

Emoji artwork by [OpenMoji](https://openmoji.org/) (outlines recoloured to brown to match the app), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (see `emoji/OPENMOJI-LICENSE.txt`).
