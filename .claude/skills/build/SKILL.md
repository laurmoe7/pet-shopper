---
name: build
description: Ship a new numbered build to Lauren's phone preview. Use when she asks for a change to app files and you are done editing, or says "build", "new build", "update the preview".
---

# Build and preview

Run after every change to app files. Nothing goes live; only the preview artifact updates.

1. `node tools/bump.js "short line" "short line"` — raises `BUILD` (`app.js`) and `CACHE` (`sw.js`) together and adds the `CHANGELOG.md` heading. One line per change, a few words, no technical detail.
2. New `app-*.js` file? It must be in `index.html` and `SHELL` in `sw.js`.
3. New animation? Add it to `animCatalogue` in `app-anims.js`.
4. `npm test`. Fix failures; do not skip tests.
5. `npm run preview`, then publish `preview/index.html` to the existing artifact URL (`https://claude.ai/artifact/92QLSvAePSNYqG2sP6qn6z`; read it first). Upload `preview/emoji/` (`files`, `root: preview`) only if emoji changed.
6. Commit and push to the session branch (never `main`, no PR).

## Reply format
- `Build NNN` on the first line, then the changes in simple words.
- Name any new animations (so she can try them in the animation player). If none, say nothing about animations.
- If a change could mean Mini Fumu settings or App settings, say which one.
- Honest feedback: if something looks weak or ugly, say so.
