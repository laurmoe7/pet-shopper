# Competitors and deal data: research notes (2 Oct 2026)

## 1. Does a grocery list + virtual pet app already exist?

**I found none.** Searches of the web, App Store, Google Play and pet-habit roundups turned up no app where a
pet eats the items you check off a shopping list. Caveat: app store search is weak, so a small indie app may
exist that I didn't find. "Nobody has built this" usually also means "nobody has proven people want it."

The closest things, split across two categories:

| Category | Apps (verified to exist) | What they show |
|---|---|---|
| Pet-motivated habit / to-do apps | Finch, Habitica, Otto, Habbie, Habit-chi, HabitYou | A pet tied to completing tasks works, and the space is crowded. Generic ones like Otto already let you add any to-do, so they could add "groceries" easily. None of them focus on shopping. |
| Shopping list apps | AnyList, Bring!, OurGroceries, Listonic, plus many small ones (Mr. Grocery, Grolister, Checkity Check...) | Mature, free or cheap, with shared lists, recipe import and aisle sorting. Bring! is the most playful (item icons) but has no pet. |
| Deal / circular apps | Flipp, Ibotta | They own weekly ads and cashback. Hard to compete with head-on. |

Honest read: the opening is real but narrow. Your real competition is the free list app people already use with
their partner or family. Switching costs are social (shared lists), so the pet has to be good enough that a
household switches together.

## 2. Where can deal and price data come from?

| Source | What you get | Access / cost | Verdict |
|---|---|---|---|
| **Kroger Developer API** (Kroger, Ralphs, Fred Meyer, King Soopers, etc.) | Product search with regular and promo price for a chosen store, store locator by ZIP, cart | Free sign-up, OAuth. About 10,000 calls/day on the public tier (per a third-party CLI's docs; not confirmed on Kroger's site) | **Best pilot option.** Official, free, store-level sale prices. Only Kroger-family stores. |
| **Walmart affiliate API** (walmart.io) | Item lookup and search with prices | Need approval as a Walmart affiliate (Impact) and signed keys | Workable. Online prices may not match the store shelf. |
| **Flipp** | Weekly ad items for most chains by ZIP | Official access ("FlyerKit") is through a Flipp partnership contact, not self-serve. An undocumented consumer endpoint exists, but Flipp's terms may forbid automated use | Broadest coverage but you would need a business deal. Scraping it is a legal and reliability risk. |
| **Instacart Developer Platform** | 1.4B items, 85k stores, affiliate commissions | Its page says it is **not accepting new applications and has no waitlist** | Closed for now. |
| **Ibotta Performance Network** | Item-level rebates you can show in your app | Enterprise integration: partnership team, about 3 months | Not realistic for an early app. |
| Scrapers for hire (Apify, etc.) | Kroger, Flipp, Walmart data | Pay per run | Breaks often and violates most retailers' terms. Avoid for anything public. |
| Target, Aldi, Safeway/Albertsons, Publix | No public price API found | n/a | Only via Flipp or scraping. |

Bottom line on deals: "deals at nearby stores" in general is not available to a small developer. "Sale prices at
your nearest Kroger-family store" is, for free, today. That is a reasonable step 4 pilot if Lauren lives near a
Kroger banner. If not, Walmart is next, and anything broader needs a Flipp partnership.

## 3. What this means for the plan

- The pet + list prototype (step 3) needs no deal data and can be tested on its own. Do that first.
- Pick the deals pilot store based on where test users actually shop. Kroger is the easiest technically.
- The thing to test is whether the pet makes people use a list more, or switch from their current list app.

## Sources
- Pet habit apps compared: https://www.manifestlings.com/habit-tracking-apps-with-a-virtual-pet
- Otto: https://apps.apple.com/us/app/otto-daily-tasks-virtual-pet/id6677016305
- Habbie: https://apps.apple.com/us/app/habbie-habit-tracker-pet/id6468639991
- Habit-chi: https://play.google.com/store/apps/details?id=com.nondev777.habitchi
- Habitica: https://apps.apple.com/us/app/habitica-gamified-taskmanager/id994882113
- Mr. Grocery (list app, no pet): https://apps.apple.com/br/app/id6754098030
- List app roundup (AnyList, Bring!, OurGroceries, Listonic): https://listonic.com/best-shopping-list-apps , https://getbring.com/en/home
- Kroger Developer portal: https://developer.kroger.com/
- Kroger CLI docs (rate limit, promo prices): https://cdn.jsdelivr.net/gh/cschneid/kroger-cli@main/README.md
- Instacart Developer Platform: https://company.instacart.com/business/developers
- Ibotta Performance Network integration: https://ipn.ibotta.com/integrating-with-the-IPN
- Flipp official vs unofficial access: https://github.com/bbernhardt15/grocery-price-optimizer/pull/7
- Walmart affiliate API: https://forum.bubble.io/t/help-with-walmart-affiliate-api-setup/250200 , https://developer.walmartlabs.com/API_Terms_of_Use

---

# Addendum (3 Oct 2026): would the Netherlands work better?

**Short answer: for pricing data, yes in practice; for the product itself, no.**

## Data
- I found **no official public API** from Albert Heijn, Jumbo, Picnic or the other big Dutch chains. This is a gap
  compared with Kroger in the US.
- What exists is community-built and unofficial:
  - **Checkjebon** (github.com/supermarkt/checkjebon, MIT): open JSON of product prices from 13 chains (AH, Aldi, Coop,
    DekaMarkt, Dirk, Hoogvliet, Jan Linders, Jumbo, Picnic, Plus, SPAR, Vomar). Free to reuse and updated often,
    but it comes from the chains' online assortments, the update schedule isn't stated, and it has no store-level
    sale data that I could confirm. Lidl and some others are missing.
  - **SupermarktConnector** (github.com/bartmachielsen/SupermarktConnector, MIT): uses AH and Jumbo's unofficial mobile
    APIs. Could break or be blocked at any time, and the chains' terms probably don't allow it.
  - Paid scrapers (Apify, ShoppingScraper) for AH bonus and prices: same terms risk.
- Dutch prices are mostly **national, not per store**, which makes the data problem simpler than in the US.
  The bonus (sale) offers are national weekly offers, which is a good fit for a pet app.
- Not verified: whether AH Bonus personal offers (tied to the Bonuskaart) are accessible; whether any chain has a
  partner program for small apps. Worth asking them directly.

## Competition
- AH and Jumbo apps already have shopping lists and offers; Lidl and Plus do too. Folder/deal apps: AlleFolders,
  Reclamefolder, Folders.nl, Scoupy. Bring! is popular in the Dutch/German market.
- None of the Dutch apps I checked have gamification or a pet. Same finding as the US: the gap is open, but I can
  only say I didn't find one.
- Downside: the chains' own apps are strong and free, and they are where the Bonus offers live. Market size is
  roughly 18M people versus the US.

## Net
Netherlands: easier data shape (national prices, few big chains), but only unofficial sources, so a deals feature
would rest on scraping. US/Kroger: official, free, store-level sale prices, but only one chain family.
For a prototype that doesn't depend on deals, location doesn't matter yet.

Sources: https://github.com/supermarkt/checkjebon , https://github.com/bartmachielsen/SupermarktConnector ,
https://www.iculture.nl/gids/supermarkt-apps-iphone-ipad/ , https://apify.com/studio-amba/albert-heijn-scraper
