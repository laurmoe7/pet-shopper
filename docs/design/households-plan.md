# Households and list syncing (plan, being built)

Agreed with Lauren on 20 October 2026, after build 733. Read this together with `docs/design/desktop-companion-and-sync.md`
(sections Sync, Built: sync server, Shared lists) and `docs/design/sync-send-and-desktop-notes.md` before touching
`sync.js`, `worker/sync/server.js`, `app-account.js` or `app-send.js`. Ask her the open questions at the end before building.

## Why

Today one Backup & sync code is the whole account: the pet, the player and the **shopping list** sync between the devices
that know the code, and the **to-do list never leaves the device** (`LISTS = ['shop']` in `sync.js`). It was kept private
because the plan was for a household to share one code to share the shopping list, and then everyone would see your
to-dos and calendar plans. Lauren wants her to-dos on her phone and PC, and households are needed for the store release
anyway, so the account is split in two:

- **Your code (personal account)**: only your own devices. Syncs everything that is yours: pet, player, **to-do list**
  (with the Calendar's plans, which live in it), and your shopping list while you are not in a household.
- **A household (shared shopping list)**: a second, separate document on the server holding only the shared shopping
  list, joined with its own invite code. Each person in it keeps their own pet, to-dos and code.

## How it fits the code today

- Server (`worker/sync/server.js`, Cloudflare Worker + D1): table `docs` (`id` = SHA-256 of the code, `body` = the merged
  document, `rev` for compare-and-swap writes). Endpoints: `POST /v1/account` (new code), `GET /v1/doc`, `POST /v1/sync`
  (the server merges what the device sends with the stored copy using `Sync.merge` and returns the result),
  `DELETE /v1/account`, `/v1/inbox` and `/v1/inbox/ack` (Send to another device). Limits: `MAX_BODY` 1 MB, `MAX_ITEMS`
  5000 records, `MAX_TEXT` 200 characters, 120 requests a minute per connection (`LIMIT` binding), 10 sign-ups an hour,
  nightly `purge` of backups not changed for a year (`RETENTION_MS`, promised in `privacy.html`).
- Deploying: `npm run build:worker` rebuilds `dist/worker.js` (a test checks it is current); pushing to `main` (a big
  push) deploys it through `.github/workflows/worker.yml`, which also creates missing tables from `schema.sql`.
- Document: `{ v, items: { id: {at, by, list, item | del} }, fields: { name: {at, by, value} }, counters: {...} }`.
  Items merge whole, latest change wins, removed markers kept `TOMBSTONE_DAYS` (30); counters take the larger value;
  take-backs (`back.<device>`) as described at the top of `sync.js`. `LISTS` decides which lists are stamped, sent and
  applied; `listArray` finds a list in `state.items` or `state.stash` (whichever holds it, `state.mode`).
- App: `app-account.js` (Backup & sync sheet, `syncNow` 4 s after a saved change, on opening, on coming online and every
  2 minutes), opened from App settings > Devices (`#devicesSheet`, build 733), which also holds Send, Receive and
  Claude's alerts (`app-send.js`). Item ids end in `-<device>` (`Sync.newId`).

## The plan

### 1. Server: a household document

- A household is one more document, stored like an account but in its own space so codes can never collide or be mixed
  up: either a `households` table with the same columns as `docs`, or `docs` rows whose id is the hash of `'h:' + code`.
  Pick the one that keeps `purge`, the size limits and compare-and-swap shared.
- Endpoints (all tested in `tests/syncserver.test.js`):
  - `POST /v1/household`: create one, answer its code (same format and rate limit as sign-up).
  - `GET /v1/household/doc`, `POST /v1/household/sync`: the same as `/v1/doc` and `/v1/sync`, authorised with the
    household code (`Authorization: Bearer <household code>`), merged with `Sync.merge`.
  - Later, if wanted: `DELETE /v1/household` (only removes it for everyone when the last member leaves; see open questions).
- The household document holds only shopping-list item records plus a small `members` field (below). No pet, no counters,
  no to-dos, no emoji overrides (those stay personal).
- The inbox (Send to another device) stays personal.

### 2. Sync rules (`sync.js`, tested in `tests/sync.test.js`)

- The personal document gains the **to-do list**: `todo` joins `LISTS` for the personal account (behind the switch in
  section 4). The shopping list stays in the personal document only while the person is not in a household.
- A second snapshot/apply pair for the household document: only `shop` items. Keep one merge function; split by which
  lists a document carries (for example pass the lists to `snapshot`/`apply` instead of the fixed `LISTS`).
- Joining a household: the person's own shopping list is merged into the household's once (asked first, see open
  questions), then the shopping list syncs only through the household. Leaving: the person keeps a copy of the shared list
  as their own list again (proposal).
- Ticks: whoever ticks an item feeds their own pet; goals, tastes, the Top 10 and trip stamps count only for the person
  who ticked on their own device. Items that arrive already ticked from someone else must never feed this pet or count for
  anything (check `apply`, `toggle`, `L.recordTripStamp` and the fair-play rules). Add `doneBy` (the member's display name)
  to an item when it is ticked, so the list can show "ticked by Sam".
- Synced to-dos with a time alert on every device of that person: the phone (`app-phone.js`, rescheduled after each save)
  and Mini Fumu's reminder card on the PC (`deskRemind` in `app-desktop.js`). A tick on one device clears the others at
  the next sync (up to about 2 minutes). Make sure `apply` is followed by a save, so the phone alerts are rescheduled.

### 3. Members

- The household document's `members` field: per person (not per device) a display name and when they last synced, so the
  sheet can show who is in it and the list can say who ticked or added something. The display name comes from Profile
  (`state.player.name`) with a fallback. Only names, nothing else about the person.
- A per-item "just me" flag (an item on the shared list that only its owner sees) was proposed earlier; leave it for later.

### 4. App (`app-account.js`, the Devices sheet)

- Devices sheet: two clear blocks.
  - **Backup & sync** (your code): "only for your own devices, don't share it". A switch **Sync my to-dos**.
  - **Household**: Create household, Join with a code or a `#household=CODE` link (like `#join=`), the members list,
    Copy invite link, Leave.
- Keep option descriptions short (CLAUDE.md). Add the new strings to `app-dutch.js`.
- Existing accounts: people may already share their personal code with a partner to share the shopping list. Turning
  to-do sync on by itself would show them each other's to-dos. So **Sync my to-dos** must start **off** for existing
  accounts (and the Devices sheet should suggest moving to a household); whether it starts on for new accounts is an
  open question.

### 5. Privacy and docs

- `privacy.html`: to-dos are on the server when Sync my to-dos is on; household members see the shared list and each
  other's display names; a household's data is deleted with the same nightly purge.
- Update `CLAUDE.md` (the "only the shopping list syncs, to-dos stay private" lines in Product decisions, the Sync bullet
  and `sync.js`'s header comment), `docs/design/desktop-companion-and-sync.md` and the sync notes.

## Order of work

1. Server household document and endpoints, with tests; `npm run build:worker`. **Done (build 734).**
2. `sync.js`: lists per document, the household snapshot/apply, to-dos in the personal document; tests for merging to-dos,
   joining and leaving, ticks from others not counting. **Done (build 735):** `LISTS` (`shop`, `todo`) and `HOUSE_LISTS`
   (`shared`), `{house: true}` for `snapshot`/`apply`/`sync`; `state.shopList` + `state.otherShop` hold the second
   shopping list (`showShop`, `leaveHouse`); shared items travel without `MARKS` (`counted`, `countedDay`, `tasted`,
   `fav`), which the ticker's own copy keeps while it stays ticked; old to-do ids without a device name get one
   (`ownIds`). Still for step 3: set `doneBy`/`doneWho` in `toggle`, and count a trip on the Shared list only from the
   items this person ticked.
3. App: household create/join/leave and members in the Devices sheet; the shopping list syncing through the household.
   **Done (build 736):** `app-household.js`, the Shared tab (only in a household), "ticked by" tags and "Added by" in the
   item sheet, trips on the shared list count only your own ticks. Household size changed to **6** (Lauren).
4. Sync my to-dos switch and the migration rule for existing accounts.
5. Privacy page, docs, CHANGELOG; bump the build for every app change (`node tools/bump.js`).

The server only changes when `main` is pushed (big push), so the app must keep working against the old server until then
(for example: hide the Household block when `/v1/household` answers 404).

## Decided with Lauren (20 October 2026), replacing parts of the plan above

These answers change sections 1 to 4; where they disagree with the text above, this section wins.

1. **Two shopping lists in a household.** Joining does not merge or replace anything: a household adds a third list,
   **Shared** (list name `shared`), next to your own shopping list. The list swap goes Shopping, Shared, To-do. Fumu eats
   from both shopping lists the same way. Your own shopping list stays in your personal document.
2. **Leaving** keeps your own shopping list (it never left); the Shared list just goes away on your devices.
3. **The owner manages the members.** Whoever creates the household owns it (payment, when it exists, attaches to the
   owner): makes a new invite code, removes members, hands ownership to someone else. So the household is **not**
   opened with a shared household code. Each member syncs it with **their own personal code**; the server keeps who is a
   member (`members` table), and the invite code is only for joining (the owner can replace it, the old one stops
   working). Removing a member takes effect at once, without anyone getting a new code. One household per account.
   If the owner leaves, the member who joined first becomes the owner; when the last member leaves the household is
   deleted.
4. **To-dos sync only to your own devices**, always (no switch, no migration: Lauren is the only tester), and never go
   into a household. Nothing about to-dos is shared with anyone, now or later.
5. Household size: 6 people (Lauren, after step 2).
6. **Names**: a small tag on a ticked row in Bought says who ticked it ("Sam"); who added it is only in the item sheet.

### Server addresses (built, step 1)

All with `Authorization: Bearer <personal code>`; the household document is `{v, items}` with only `shared` items.

- `GET /v1/household`: `{household: null}`, or `{doc, rev, members: [{id, name, owner, me, joined, seen}], owner, invite}`
  (`invite` only for the owner).
- `POST /v1/household` `{name}`: create (you are the owner), 201 with the same answer. 409 when already in one.
- `POST /v1/household/join` `{invite, name}`: join. 404 for an unknown invite, 409 when already in one, 403 when full.
- `POST /v1/household/sync` `{doc, name?}`: merge, like `/v1/sync`; also notes your name and when you last synced.
- `POST /v1/household/leave`, `POST /v1/household/remove` `{member}` (owner), `POST /v1/household/owner` `{member}`
  (owner), `POST /v1/household/invite` (owner, a new invite code).
- Deleting the personal account leaves its household. The nightly purge deletes households not changed for a year.
