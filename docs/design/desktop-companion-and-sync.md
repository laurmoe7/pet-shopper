# Desktop companion and sync (planned, nothing built yet)

Decisions from the design talk. Do not start building until Lauren says so.

## Decisions

- **No AI chat, ever.** Fumu's lines are hand-written (the `voice` system). No per-message cost.
- **Desktop awareness stops at level 2.** He may know: idle or busy, time of day, work length without a break, a full-screen app running, and *which program* is in front (process name, from a curated list of games and common apps). He never reads window titles, tab names, page text or the screen. Never level 3, not even as an option.
  - **Level 1 ("More privacy")**: idle or busy, time of day, work length without a break. No program, no window information, far fewer comments.
  - **Level 2 ("Normal", the default)**: level 1 plus the outline of the desktop (where windows are, for sitting on them), which program is in front by name, full-screen apps.
  - The player chooses in the desktop settings window (Privacy); anything new that notices something must check `deskAware(2)` (page) or `privacy.allows(level, thing)` (shell) first. Built so far: idle (level 1); window positions for sitting on windows, the front program's name from the curated list in `desktop/programs.js` (file name only, matched in the shell; the page hears only the kind and a listed name), games (listed, taught by the player, or recognised as "something full-screen") with a cheer, good game and quiet time, and rare remarks about other kinds (level 2). Not built: focus mode, comments about how long you have worked.
- **Everything he notices is worked out on the PC** and never leaves it (not sent to the server or the phone).
- **Sync comes first and must work right away.** Accounts, backup and phone-to-PC sync come before the desktop pet shell.
- **Each person has their own pet.** Only lists are shared (no shared household pet). `state.pet` stays one object per person.
- **Windows first** (Tauri or Electron shell around the same app files; transparent, always-on-top window; tray icon; easy hide).
- **Quiet by default:** no sound until asked, never talks during full screen, calls or screen sharing, at most one remark every 20 to 30 minutes, and a "be quiet" option.

## Sync

- **Only the shopping list syncs. To-do lists are private to each person** (Lauren's decision): never stamped, sent or changed by syncing. The Calendar's plans live in the to-do list, so they stay private too.
- Sign-in: **recovery code first** (a long random code, shown as text and a QR to scan with the other device; no email service, no personal data on the server, works at once). Email magic link comes later as a way to get the account back; add Apple/Google sign-in if the stores need it.
- Backend on Cloudflare (Worker + D1), EU region (Lauren has a Cloudflare account, the one the recipe helper uses). The local save (`nibble.v1`) stays the main copy; the server mirrors it, so the app works offline.
- Merge per item, not whole lists: each item has an id and a "changed at" time; the latest change per item wins; deletions are kept as markers for a while.
- Pet state: latest device wins per field. Counters (stamps, goal progress, unlock progress) merge by taking the larger value, so no progress is lost.
- The merge rules are pure functions in `logic.js` with many tests (offline edits, same item changed twice, delete vs. edit).
- Needs: privacy policy, account export and delete, EU hosting. Backup ("your Fumu is safe if you lose your phone") is a feature.
- A synced web page on the PC can prove sync before the desktop app exists.

## Built so far (build 232)

- Step 1 and 2 of the order of work, local part only: `sync.js` (merge rules, tested) and the saved format (`state.sync`, device name, ids ending in `-<device>`), plus the Developer tools sync log. No server, no account, nothing is sent anywhere.
- Known limits: items merge whole (two devices changing different parts of one item at once keep only the later change); counters never go down through syncing and two devices counting different things at once keep the larger count, not the sum (so un-ticking a task on one device doesn't lower the stamps on another); a device off for more than 30 days may bring back an item deleted meanwhile; a device with a clock far in the future makes the others' changes sort after it.
- To decide in step 4: a brand new device joining an account must adopt the account's data and drop its own sample list (those records have time 0, so they are easy to spot).

## Built: sync server and Backup & sync (online, build 247, tested by Lauren on phone and PC)

- `worker/sync/` (server.js, schema.sql, wrangler.toml, README.md with the Cloudflare steps) and `dist/worker.js` (made by `npm run build:worker` from `sync.js` + `server.js`, so it can be pasted in the dashboard). Tested in `tests/syncserver.test.js` (memory store plus real SQL on Node 22).
- Account = recovery code (25 symbols, ~124 bits); the server stores only its hash. One document per account; the server joins what a device sends with the stored copy using `Sync.merge`, with compare-and-swap writes. The pet syncs between the person's own devices; the shopping list is the only list that does.
- App part (`app-account.js`): Options > Backup & sync: start a backup (code), join with a code or a `#join=` link, sync status, automatic syncing, sign out, delete. A joining device drops its sample list. No QR code (the link does the job).
- Still to do: rate limit on `POST /v1/account` before other people use it; privacy policy; an export button; a way to get back in if the code is lost (email link, later); shared shopping list between people (needs a separate shared document); the desktop shell.

## Built: desktop shell v0 (build 248, Electron)

- `desktop/` (main.js, preload.js, place.js, README.md) and the page side `app-desktop.js`. One transparent frameless always-on-top window (320 x 250) shows the real app, loaded from the Pages address, in "pet" mode (`html.desktop-pet`: only Fumu, bubble above him); "list" mode (`html.desktop-list`) makes the same window bigger and opaque with a small bar. One window on purpose: two windows would both write `nibble.v1` and overwrite each other.
- Hold still on him to pick him up and drag the window; right-click or the tray icon for the menu; click-through on empty parts (Windows/macOS only; hit-tested in the page); quiet by default; opening any sheet switches to list mode.
- Tested on Linux (Xvfb) with real pointer events: mode switching, carrying, strokes not carrying, back to the same place. Not yet run on Windows. Installer by `.github/workflows/desktop.yml` (windows-latest, electron-builder, unsigned: SmartScreen warns).
- Next: send to PC / send to phone, recipes on the PC, awareness level 1-2 and pausing for full-screen apps, size option, signing and updates.

## Mascot and name (decided for now, build 252)

- App name **Fumufumu**, mascot **Fumu**, a pigeon (the head bob is the "fumu fumu" nod; pigeons eat anything). Renamed in build 253 (Nibble became Fumu on screen); saved-data keys (`nibble.v1`...) and the installer id (`com.laurmoe.nibble`) must not change.
- The pigeon skin (`pigeon`) is the new design (lilac-grey, orange eyes with two glints, bigger wings with a pale bar, faint pink chest, shiny neck band to the outline, white bump over the beak); the earlier one is the skin `oldpigeon` ("Pigeon (old)").
- Icon: Fumu on a pink-lavender-mint sunburst, transparent corners (`icon-*.png`, `icon-maskable-512.png`, `desktop/build/icon.ico`). Trademark checks are not done (Lauren decided not to worry yet; Japan has many "ふむふむ" marks, see the earlier notes).
- Ideas not done: a head-bob nod when an item is added ("fumu fumu~"), a tail, food falling around the icon (Lauren will add her own).

## Built: Send to another device (build 256, both ways and faster in 258)

- `worker/sync/server.js` inbox (`/v1/inbox`, `/v1/inbox/ack`; table `inbox`; deleted when read, after 24 h or past 50), `send.js` (what is a link or a note, tested), `app-send.js` (the phone's sheet and the PC's card), a `share_target` in the manifest (the Share menu, once installed), `desk:open`/`desk:copy` in the shell. Build 258: it goes both ways (no destination any more: a device asks for `?device=<id>` and gets whatever another device left), devices poll every 10 s while the window shows and again on focus, the sheet closes at once after sending, the card shows as soon as Fumu swallows it, the server only reads when polling (the day-old clean-up moved to when a message is left) and leaves a message with one database round trip. Acknowledging removes a message for everyone, which suits two devices; with three, whichever device marks it done first removes it for the others.
- Next: images (small, deleted after a day), PC to phone (recipe ingredients), reminders, awareness level 1-2.
- Release fix: electron-builder's own upload raced two release creations and failed after publishing the installer, with no `latest.yml`, so installed copies could not update. The workflow now builds, then `gh release create`s everything in one step.

## Shared lists (open, see below)

Each person owns a pet; lists can be shared. Avoid a pile of separate lists. Proposed shape (not decided):

- The two existing modes already split the need: the **shopping list** is the one that can be shared with a household, the **to-do list** stays personal. No extra list screens at first.
- Personal items on a shared shopping list are a per-item "just me" flag (hidden from the others), not a second list.
- Whoever ticks an item feeds *their own* pet; goals, tastes and the Top 10 count for the person who ticked. Partners see who ticked.
- Shared plans in the Calendar (a birthday, a dinner) are a possible later step.
- Only add real extra lists (several named lists) if people ask for them.
- Open: how a household is joined (invite code), what happens when someone leaves, and how fair-play rules treat items ticked by someone else.

## Desktop features (wish list)

- Drop a link or text on Fumu: he eats it and it shows on the phone; "Send to PC" from the phone and the Share menu.
- Recipe parser on the PC (same `recipe.js` and Worker), ingredients with checkboxes, "Send to phone".
- Images from phone to PC (small, deleted after about a day).
- Reminders from tasks: done in build 257 (card with Done / In 10 min, pops up from hiding). Still to do: kind work-break nudges (stretch, water, eyes), a focus mode (quiet pet, nap or snack at the end).
- Today's tasks on his clipboard; ticking on the PC ticks on the phone.
- Same outfit, furniture and mood on both devices.
- New idle animations for the desktop: walking along the screen, peeking round a side edge and napping are done (build 257; wander and peek in the animation player's Desktop group, nap under Specials). Still to do: walking along window edges, sitting on a window.
- Right-click or drag to an edge to hide him.

## Order of work

1. Account and backup.
2. Sync of list and pet (web page on the PC works).
3. Desktop pet shell (transparent, Windows).
4. Send to phone, send to PC, recipes.
5. Comments (level 1 and 2 only) and focus mode.
6. Images.

## Cautions

- This is a second product (installer, updates, code signing, support). Windows only at first.
- Check that "Fumufumu" is free as an app name and trademark before a store release.
- Other desktop pets exist (Shimeji, Desktop Goose); the new part is list + pet + phone-to-PC.

## Names (decided: Fumufumu for the app, Fumu for the mascot; shortlist kept for history)

- Pet name: **Fumufumu** (ふむふむ, Japanese "hmm, uh-huh"). Searches found no exact match, but the tool was weak: still check the App Store, Google Play, EUIPO TMview and J-PlatPat. Close neighbours: Fuwamuu (a pet-care game) and FumiFumi (a photo app).
- App name idea: **FumuList**.
- Other ideas: Nomlet, Snaffle, Munchlet, Gulpie.
- Decided: app **Fumufumu**, mascot **Fumu**. Nibble was the working name; internal keys keep `nibble` on purpose.

## Built: shortcuts and the lamp (build 260)

- `globalShortcut` in the shell: Ctrl/Cmd+Alt+F toggles pet/list mode (showing him first if hidden), Ctrl/Cmd+Alt+T sends `desk:swapList` (the page calls `switchList`). Ctrl+Alt can be AltGr on some European keyboards; F and T give no characters on common layouts, but the tray menu has a switch (`hotkeys`) and says when a key is taken. Tested with real key events on Linux (Xvfb).
- The small window hides the lamp, so at bedtime the light counts as off there and he asks to be tucked in instead of asking for the lamp.

## Built: desktop size, floating, reminders and roaming (build 257)

- Tray menu: Size (a page zoom of 0.8, 1 or 1.3; the window is scaled with it and the shell divides the pointer position by the zoom, carrying follows the real pointer), Stay above full-screen apps (`setAlwaysOnTop(true, 'screen-saver')`; exclusive full-screen games still cover him), Move Fumu (nudges and corners, `place.js`), roam and remind switches. Choices are kept in `window.json`; the page reads them with `getPrefs`/`onPrefs`.
- The shell glides the window (`glide`, `place.tweenAt`) for walking and peeking; picking him up, a size change or switching to the list stops it. `peekSpot` only uses a side with no other monitor beside it.
- Tested on Linux (Xvfb): glides, clamping at the screen edge, the interrupted walk, the three sizes, the reminder card inside the pet window. Not run on Windows yet: check that the card can be clicked, that Stay above full-screen works over a full-screen video, and the look of a half-hidden Fumu.
