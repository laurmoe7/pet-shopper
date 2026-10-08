# Fumu on your desktop (Windows first)

A small transparent window that stays on top of your other windows and shows Fumu. It is the real app, loaded from
the web (https://laurmoe7.github.io/pet-shopper/), so every big push updates it. Your list is one click away.

## How to get it (no installs needed)

1. On GitHub open the repo's **Releases** (right side of the main page) and download the newest `Fumufumu Setup ….exe`.
   (Or **Actions** → **Build the desktop app (Windows)** → a finished run → **Artifacts**.)
2. Double-click the `.exe`. Windows will say "Windows protected your PC" because the app isn't signed yet: click
   **More info** → **Run anyway**. It installs for you only (no admin needed) and starts Fumu.
4. In Fumu: right-click him → **Open my list** → Options → **Backup & sync** → join with your code. Your list and
   pet appear here too.

## Updates

- **The app itself** (the pet, the list, everything you see) is loaded from the web: a big push updates it. Restart Fumu
  or right-click → **Reload (get the latest)**.
- **The shell** (this `desktop/` folder: the window, tray, menu) updates itself. Whenever `desktop/` changes on `main`,
  GitHub builds a new release by itself; installed copies check every few hours, download quietly and install when you
  next close Fumu. The tray menu then shows **Restart to update Fumu**, and **Check for app updates** looks right away.
  You only run an installer by hand the first time (and when moving to a new PC).

## Things sent from your phone

Phone: Options → **Send to my PC** → paste a link or type a note → Send (once Fumufumu is installed on the phone, the browser's Share menu
also offers it). Both devices need the same Backup & sync code. On the PC, Fumu eats it and a little card shows what it is with
**Open** (links), **Copy** and ✕. The next one waits until you are done with this one. Needs the server's inbox table (worker/sync/README.md).

## Using it

- **Move him:** press and hold on Fumu until he says "wheee", then drag. Stroking him (moving while pressing) pets him.
- **Right-click** him (or the tray icon): Open my list, Hide, Always on top, **Stay above full-screen apps** (not games in exclusive full-screen), **Size** (small, normal, large; he is zoomed, the window grows with him), **Move Fumu** (nudge 20 px, or to a corner), **Fumu wanders and naps on his own**, **Remind me of tasks**, Start with Windows, Reload, Quit.
- **Task reminders:** when a task's time comes, Fumu pops up (even if hidden) with a card: **Done ✓** (when the to-do list is showing), **In 10 min** or ✕. The page asks `window.deskRemind` from `timeCheck`.
- **On his own:** every 4 to 9 minutes (the first after 1.5 to 4) he may stroll along where he sits (the shell glides the window, `walk`), peek round the nearest screen side that has no other monitor beside it (`peek`, back with `unpeek` or a tap) or take a nap (`napNow` in `app-idle.js`, ends with a stretch; a tap wakes him). Not while a sheet, card or bubble is up, at bedtime or asleep. Switch it off in the menu.
- **Tray icon** (by the clock): click to hide or show him.
- Clicks pass through the empty part of his window to whatever is underneath; only Fumu himself catches them. The shell also watches the pointer itself (about 25 times a second) because Windows can stop forwarding it to the page after the window changes size.
- Quiet by default: sounds start switched off (Options → Quiet mode).
- Tapping a gift or opening any sheet switches to the bigger window; **Back to Fumu** returns.

## For development

`cd desktop && npm install && npm start` (needs Node). `NIBBLE_URL=http://localhost:8765/` loads another address,
`NIBBLE_LOG=1` prints what the shell does, `NIBBLE_NO_THROUGH=1` turns click-through off (it only works on Windows and
macOS, where Electron can forward the pointer to the page). `npm run dist` makes the Windows installer (run it on
Windows, or let the workflow do it).

## Notes

- The page only gets a small bridge (`preload.js`): move/hide/mode and pointer hints. No files, no commands.
- The window position is remembered; if its screen is gone it comes back to the bottom right.
- Not done yet: sending links, text and images from the phone, recipes on the PC, pausing when a game or full-screen app
  is open, comments about what you're doing (level 1 and 2 only, never window titles), a size option, an app icon
  made for the desktop, code signing, automatic updates of the shell itself (the page updates itself).
