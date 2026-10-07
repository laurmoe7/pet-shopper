# Nibble on your desktop (Windows first)

A small transparent window that stays on top of your other windows and shows Nibble. It is the real app, loaded from
the web (https://laurmoe7.github.io/pet-shopper/), so every big push updates it. Your list is one click away.

## How to get it (no installs needed)

1. On GitHub: **Actions** → **Build the desktop app (Windows)** → **Run workflow** (branch `main`).
2. After about 5 minutes open the finished run → **Artifacts** → download `Nibble-Windows-installer` and unzip it.
3. Double-click the `.exe`. Windows will say "Windows protected your PC" because the app isn't signed yet: click
   **More info** → **Run anyway**. It installs for you only (no admin needed) and starts Nibble.
4. In Nibble: right-click him → **Open my list** → Options → **Backup & sync** → join with your code. Your list and
   pet appear here too.

## Using it

- **Move him:** press and hold on Nibble until he says "wheee", then drag. Stroking him (moving while pressing) pets him.
- **Right-click** him (or the tray icon): Open my list, Hide, Always on top, Start with Windows, Reload, Quit.
- **Tray icon** (by the clock): click to hide or show him.
- Clicks pass through the empty part of his window to whatever is underneath; only Nibble himself catches them.
- Quiet by default: sounds start switched off (Options → Quiet mode).
- Tapping a gift or opening any sheet switches to the bigger window; **Back to Nibble** returns.

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
