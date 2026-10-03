# Pet and core loop design (draft, 2 Oct 2026)

Grocery list app where each item turns into a food emoji and a small pet eats it when you check it off.
Free, no ads, English first, revenue from paid pet customization. Deals are parked.

## 1. The pet

**Working name: Nibble.** A round, soft blob creature (think mochi or a gumdrop with tiny feet). A blob is cheap to
animate, reads well at small sizes, and takes hats, colors and patterns easily, which matters for paid cosmetics.

**Personality:** cheerful glutton, a bit dramatic about food, never mean. It has opinions (loves fruit, side-eyes
broccoli, then eats it anyway) but it never scolds you. Short text bubbles, 2 to 5 words: "ooh, crunchy", "MORE?",
"tiny snack!".

**No guilt, ever.** The pet cannot starve, get sick, die or run away. If you don't shop for a week, it sleeps. The
worst state is "dozing", and opening the app wakes it with a stretch. This is the main difference from classic
tamagotchis and from apps like Habitica that punish you.

### States

| State | When | Look |
|---|---|---|
| Sleepy | List empty, or app not opened for a while | Eyes closed, little "z", slow breathing |
| Curious | Items on the list, none checked yet | Awake, looks at the list, small bounce when you add items |
| Eating | Just checked an item | Catch-and-chomp animation (below) |
| Happy | Some items eaten this trip | Pinker cheeks, more bouncing |
| Stuffed / delighted | Whole list checked off | Belly-pat, sparkle, then a contented nap |

Happiness is **per shopping trip** and resets quietly. There is no long-term meter that can go down.

## 2. The eating moment (the core loop)

1. You add "bananas". It appears as 🍌 next to the text.
2. In the store you tap the checkbox.
3. The 🍌 hops off the row in a little arc into the pet's mouth (about 0.6 s). Chomp, tiny crumbs, one bubble line.
4. The row fades and slides to the bottom. Haptic tap on phones.
5. On the last item: a short "all done" celebration (confetti crumbs, pet does a belly-pat), then it naps.

Rules that keep it usable in a store:
- The animation never blocks the next tap. You can check 5 items fast and the pet eats them in a queue.
- Undo (uncheck) makes the pet "spit it back" with a sheepish look. Funny, and it makes mistakes painless.
- A quiet mode turns off sounds and bubbles but keeps the emoji hop.

**Reactions by food category** (cheap variety, one line plus one face each):
fruit = delighted, veg = brave face then fine, sweets = sparkly eyes, spicy = red face and steam,
drinks = slurp, bread/baked = happy chew, non-food (soap, batteries) = confused look, "that's not food", tucks it away.

## 3. Item to emoji mapping

Three layers, in order:

1. **Keyword list.** A hand-made dictionary of about 300 common grocery words and plurals mapped to an emoji and a
   category, e.g. `banana, bananas -> 🍌 fruit`, `milk, oat milk -> 🥛 drink`, `pasta, spaghetti -> 🍝 pantry`.
   Match on the longest keyword in the item text, so "oat milk" beats "milk" and "chocolate milk" can be 🍫🥛 later.
   Case-insensitive, ignores quantities ("2x", "500g").
2. **Fallback.** No match gives a neutral category emoji: 🛒 for unknown, or a cute "mystery snack" box 🎁 that the
   pet treats as a surprise. The mystery box is better: an unknown item becomes a small joke instead of a failure.
3. **Manual pick.** Long-press any item to choose its emoji from a short grid (food emojis first). The choice is
   remembered for that word on this device, so the app learns your vocabulary ("Oma's cake" -> 🎂).

Honest limits: Unicode has no emoji for many groceries (flour, yogurt, lentils, toilet paper, spices). Expect about
70 to 80 percent of a typical list to match well. Custom drawn food icons fix this later and could themselves be part
of the look of the app. European items (quark, rye bread, specific cheeses) need their own keyword entries.

## 4. Paid customization

Base app is complete and free. Paid items are cosmetic only and never affect how lists work.

| Pack idea | Examples | Note |
|---|---|---|
| Colors and patterns | pastel, galaxy, strawberry spots | Cheapest to make, good first item |
| Hats and accessories | chef hat, beret, frog hood, tiny scarf | Visible all the time, high appeal |
| Seasonal sets | pumpkin outfit, winter scarf, spring flowers | Recurring reason to buy, time-limited |
| Pet home / background | kitchen, picnic blanket, market stall | The scene the pet sits in |
| New species | cat-blob, dragon-blob, ghost | Bigger price; reuses the same animation rig |
| Eating effects | sparkle chomp, heart crumbs | Small, cheap, fun |

Suggested model: one-time purchases, small packs in the 1 to 3 euro range, plus an optional "supporter" bundle.
Avoid loot boxes and timed energy. A few free cosmetics earned by using the app (e.g. a hat after your 10th finished
list) show people the system exists without making it a grind.

Honest risk: cosmetic-only revenue usually converts a low percentage of users. It works when people show the pet to
others. That points to shared lists (your partner sees your pet) and a cute shareable "trip done" image.

## 5. Smallest first version (prototype)

In:
- One list, add / check / uncheck / delete items.
- Keyword dictionary (start with about 150 words), mystery-box fallback, long-press emoji pick.
- One pet, one color, five states above, the hop-and-chomp animation, about 6 category reactions, all-done celebration.
- Undo spit-back. Quiet mode toggle.
- Saved on the device. Works offline. Mobile web app (PWA) so it can be tried on any phone without app stores.

Out for now: accounts, shared lists, payments, multiple lists, aisle sorting, recipes, sounds beyond one chomp.

What the prototype should answer: do people smile at the eating moment, and do they still smile on the 5th trip?
If the novelty fades by trip 3, the pet needs more variety before anything else.

Next after the prototype: shared lists (the research says households switch apps together, so this is the real
gate to wider use), then the first paid cosmetic pack.
