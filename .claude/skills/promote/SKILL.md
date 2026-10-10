---
name: promote
description: Release main to the stable channel for friends. Use only when Lauren says "promote" or "push to stable".
---

# Promote to stable

Only on "promote" / "push to stable". Never push to `stable` otherwise, never force.

1. Make sure `main` is what she wants stable: `git fetch origin main stable`, show `git log origin/stable..origin/main --format=%s` (count and highlights).
2. `npm test` must pass.
3. `git push origin main:stable`.
4. Check the workflows ran: `pages.yml` (deploys `/stable/`) and `desktop-stable.yml` (installer `1.0.N`, a `stable` pre-release). Never mark the `stable` release as latest; dev installs follow the latest release.

## Reply format
- Stable installer version `1.0.N` (expected until the run finishes) and whether `desktop/` changed since the last stable (needs the new installer) or page only.
- What friends get that they did not have before, in simple words.
- Workflow status, or what is still running.
