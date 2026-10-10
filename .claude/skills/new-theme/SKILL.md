---
name: new-theme
description: Add or change an Appearance theme (App settings) or an alert style (Mini Fumu settings). Use for "new theme", "new look", "new alert style", or restyling Quest, Quest2, Old School, Scribbling, Cool.
---

# New theme

Read the matching `CLAUDE.md` entry (Quest2, Old School, Scribbling) first. Say whether you changed App settings (Appearance), Mini Fumu settings (alert style), or both.

## Do
- All rules in one block at the end of `styles.css`; selectors start with the theme's `html:root[...]`. Use `--hl`, `--hl-soft`, `--hl-glow`, `--badge`, add overrides in its own block for the rest. Pink and pastel bits are hard-coded in many places.
- App: `THEMES`. Mini Fumu: `alertStyle` lists in `main.js` and `panel-ui.js`, `applyLook`, class `al-*`; settings window look `html[data-look]` in `desktop/panel.html`. Keep pointer bubbles and arrow bubbles separate.
- Short option labels. Bump the build (`/build`), add a `desktop/` note if shell files changed.

## Check before saying done (look for leftover pink, white borders, pastel tape)
Shopping list, to-do list, Pet menu (every tab), Room, Calendar, Profile and its sheets, Options, the dock and its badges, the add bar; for alert styles also the card, speech bubble, ring menu, settings window. Use `node tools/shot.js` on a phone-sized viewport and a 320 x 250 small window.

## Reply format
Build number, which settings it lives in, what you checked and what you could not, and one honest line on whether it looks good.
