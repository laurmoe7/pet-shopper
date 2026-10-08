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

## Things sent between your devices

Options → **Send to another device** → paste a link or type a note → Send (once Fumufumu is installed on the phone, the browser's Share menu
also offers it). It works both ways, phone to PC and PC to phone, and only the other device shows it. Both devices need the same Backup & sync code. On the receiving device, Fumu eats it and a little card shows what it is with
**Open** (links), **Copy** and ✕. The next one waits until you are done with this one. Needs the server's inbox table (worker/sync/README.md).

## Using it

- **Move him:** press and hold on Fumu until he says "wheee", then drag. Stroking him (moving while pressing) pets him.
- **Right-click** him (or the tray icon): the everyday things only: Open my list, Add an item, Shopping/to-do list, Hide, Always on top, Size, wanders and naps, Remind me of tasks, Start with Windows, **Reload (get the latest)**, **Check for app updates**, **More Fumu settings…** (which also has an Updates section), Quit. The rest is in the settings window.
- **Fumu settings** (the bigger menu): hold the pointer over Fumu and press **Ctrl+Alt+O** (only held while the pointer is over him, so it never takes the keys from other programs), or right-click > **More Fumu settings…**. It has his look (size, **hide his toy**, **hide the cushion under him**), what he does on his own, his window (always on top, above full-screen, start with Windows, move him), every shortcut (**Change** records a new key combination, **Off** switches it off) and developer tools (make him wander, peek, nap, hop on a window or test a reminder now; reload, DevTools, update check, open the settings folder, copy diagnostics, reset). It is a page of its own in `desktop/` (`panel.html`), so changing it needs a new installer (the shell updates itself).
- **Quick switching** (also written in Options on the PC): **Ctrl+Alt+F** swaps the small Fumu and the whole app from any program, **Ctrl+Alt+T** swaps the shopping list and the to-do list (both are also in the right-click menu, and can be switched off there if another program already uses the keys). A **middle click** on Fumu opens the whole app; **double-click the bar** (or Back to Fumu) returns.
- **Add from anywhere:** **Ctrl+Alt+A** opens a small box by Fumu (the app can stay closed): type, Enter adds it to the list that is showing, Esc closes. On the to-do list the 📅 button opens the same choices as the task sheet (day, time, repeat, which weekdays, for how long). In the whole app it just puts the cursor in the usual box.
- **Away:** after about 4 minutes without keyboard or mouse, or when the screen is locked or the computer sleeps, he curls up for a nap (the page's `napNow`); when you are back he wakes with a stretch and says hello. It uses only the system's idle time. Switch it off in the menu.
- **Sitting on windows** (menu switch, off by default; Windows only): now and then he hops onto the top edge of another window (`desktop/windows.js` lists the visible windows' frames through the Windows API with `koffi`: never titles, contents or program names), walks along it and rides along when you move that window; when it closes, is covered or minimized he drops to the floor, and at bedtime he comes down first. Let go of him close above a window's edge and he sits on it. He already stands on the taskbar's top edge (the work area ends there) and wanders along it. Not tested on every setup yet: with several screens and different zoom levels, tell us if he floats or sinks.
- **Screens:** if the screen he sits on is unplugged he goes to the main screen and remembers his own spot; when that screen comes back so does he. A changed resolution pulls him back in.
- **Night:** the small window has no lamp, so the light counts as off there: when he is sleepy he asks to be tucked in, and a tap does it. The whole app still shows the lamp (already off).
- **Task reminders:** when a task's time comes, Fumu pops up (even if hidden) with a card: **Done ✓** (when the to-do list is showing), **In 10 min** or ✕. The page asks `window.deskRemind` from `timeCheck`.
- **On his own:** every 4 to 9 minutes (the first after 1.5 to 4) he may stroll along where he sits (the shell glides the window, `walk`), peek round the nearest screen side that has no other monitor beside it (`peek`, back with `unpeek` or a tap) or take a nap (`napNow` in `app-idle.js`, ends with a stretch; a tap wakes him). Not while a sheet, card or bubble is up, at bedtime or asleep. Switch it off in the menu.
- **Tray icon** (by the clock): click to hide or show him.
- Clicks pass through the empty part of his window to whatever is underneath; only Fumu himself catches them. The page tells the shell where the solid parts are (his body, the cushion, the toy, bubbles and cards: about 30 times a second, only when they move) and the shell checks the pointer against them itself about 120 times a second, with a few pixels of slack, so the window is already catching clicks when the pointer arrives (no round trip to the page); a button held down on him or the toy keeps it solid until released. An older page that sends no rectangles is asked as before.
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
