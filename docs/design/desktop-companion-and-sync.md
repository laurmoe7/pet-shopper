# Desktop companion and sync (planned, nothing built yet)

Decisions from the design talk. Do not start building until Lauren says so.

## Decisions

- **No AI chat, ever.** Nibble's lines are hand-written (the `voice` system). No per-message cost.
- **Desktop awareness stops at level 2.** He may know: idle or busy, time of day, work length without a break, a full-screen app running, and *which program* is in front (process name, from a curated list of games and common apps). He never reads window titles, tab names, page text or the screen. Never level 3, not even as an option.
- **Everything he notices is worked out on the PC** and never leaves it (not sent to the server or the phone).
- **Sync comes first and must work right away.** Accounts, backup and phone-to-PC sync come before the desktop pet shell.
- **Each person has their own pet.** Only lists are shared (no shared household pet). `state.pet` stays one object per person.
- **Windows first** (Tauri or Electron shell around the same app files; transparent, always-on-top window; tray icon; easy hide).
- **Quiet by default:** no sound until asked, never talks during full screen, calls or screen sharing, at most one remark every 20 to 30 minutes, and a "be quiet" option.

## Sync

- Account by email magic link (no passwords); add Apple/Google sign-in later if the stores need it.
- Backend on Cloudflare (Worker + D1), EU region. The local save (`nibble.v1`) stays the main copy; the server mirrors it, so the app works offline.
- Merge per item, not whole lists: each item has an id and a "changed at" time; the latest change per item wins; deletions are kept as markers for a while.
- Pet state: latest device wins per field. Counters (stamps, goal progress, unlock progress) merge by taking the larger value, so no progress is lost.
- The merge rules are pure functions in `logic.js` with many tests (offline edits, same item changed twice, delete vs. edit).
- Needs: privacy policy, account export and delete, EU hosting. Backup ("your Nibble is safe if you lose your phone") is a feature.
- A synced web page on the PC can prove sync before the desktop app exists.

## Shared lists (open, see below)

Each person owns a pet; lists can be shared. Avoid a pile of separate lists. Proposed shape (not decided):

- The two existing modes already split the need: the **shopping list** is the one that can be shared with a household, the **to-do list** stays personal. No extra list screens at first.
- Personal items on a shared shopping list are a per-item "just me" flag (hidden from the others), not a second list.
- Whoever ticks an item feeds *their own* pet; goals, tastes and the Top 10 count for the person who ticked. Partners see who ticked.
- Shared plans in the Calendar (a birthday, a dinner) are a possible later step.
- Only add real extra lists (several named lists) if people ask for them.
- Open: how a household is joined (invite code), what happens when someone leaves, and how fair-play rules treat items ticked by someone else.

## Desktop features (wish list)

- Drop a link or text on Nibble: he eats it and it shows on the phone; "Send to PC" from the phone and the Share menu.
- Recipe parser on the PC (same `recipe.js` and Worker), ingredients with checkboxes, "Send to phone".
- Images from phone to PC (small, deleted after about a day).
- Reminders from tasks (`due`/`time`), kind work-break nudges (stretch, water, eyes), a focus mode (quiet pet, nap or snack at the end).
- Today's tasks on his clipboard; ticking on the PC ticks on the phone.
- Same outfit, furniture and mood on both devices.
- New idle animations for the desktop: walking along the taskbar and window edges, peeking from a corner, sitting on a window, napping. Each goes in the animation player.
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
- Check that "Nibble" is free as an app name and trademark before a store release.
- Other desktop pets exist (Shimeji, Desktop Goose); the new part is list + pet + phone-to-PC.
